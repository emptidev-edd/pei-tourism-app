import { Request, Response } from 'express';
import { z } from 'zod';
import { PlaceCategory } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { autoTagPlace } from '../services/autoTag.js';
import { computePopularity } from '../services/popularityScore.js';

/**
 * GET /v1/places
 * Query:
 *  - category=TRAIL|PARK|BEACH|... (optional)
 *  - near=lat,lng (optional)
 *  - radiusKm=number (optional, default 25)
 */

export const listPlaces = async (req: Request, res: Response) => {
  const category = req.query.category?.toString();
  const near = req.query.near?.toString(); // "lat,lng"
  const radiusKm = Number(req.query.radiusKm ?? 25);

  const where: any = {};
  if (category) where.category = category;

  // MVP near-me filter using bounding box on lat/lng fields
  if (near) {
    const [latStr, lngStr] = near.split(',');
    const lat = Number(latStr);
    const lng = Number(lngStr);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const dLat = radiusKm / 111;
      const dLng = radiusKm / 111;

      where.lat = { gte: lat - dLat, lte: lat + dLat };
      where.lng = { gte: lng - dLng, lte: lng + dLng };
    }
  }

  const items = await prisma.place.findMany({
    where,
    take: 500,
    orderBy: { updatedAt: 'desc' },
  });

  res.json(items);
};

const FeaturedQuery = z.object({
  category: z.nativeEnum(PlaceCategory).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/**
 * GET /places/featured
 */
export const getFeatured = async (req: Request, res: Response) => {
  const parsed = FeaturedQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, message: parsed.error.flatten() });
  const { category, limit } = parsed.data;
  const where: any = { OR: [{ isFeatured: true }, { popularity: { gte: 70 } }] };
  if (category) where.category = category;
  const items = await prisma.place.findMany({
    where,
    orderBy: [{ isFeatured: 'desc' }, { popularity: 'desc' }],
    take: limit,
  });
  res.json({ ok: true, count: items.length, items });
};

const NearQuery = z.object({
  near: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/),
  radius: z.coerce.number().int().min(1).max(200_000).default(5000),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.nativeEnum(PlaceCategory).optional(),
});

/**
 * GET /places/near
 */
export const getPlacesNear = async (req: Request, res: Response) => {
  const parsed = NearQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ ok: false, message: parsed.error.flatten() });
  const { near, radius, limit, category } = parsed.data;
  const [latStr, lngStr] = near.split(',');
  const lat = Number(latStr), lng = Number(lngStr);

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, name, category, description, address, community, tags,
           rating, popularity, "isFeatured", lat, lng,
           ROUND(ST_Distance(geo::geography,
             ST_SetSRID(ST_MakePoint($1,$2),4326)::geography)::numeric, 1)::float8 AS meters
    FROM "Place"
    WHERE geo IS NOT NULL
      AND ST_DWithin(geo::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
      AND ($5::text IS NULL OR category::text = $5::text)
    ORDER BY meters ASC LIMIT $4
  `, lng, lat, radius, limit, category ?? null);

  res.json({ ok: true, near: { lat, lng }, radius, count: rows.length, items: rows });
};

/**
 * POST /admin/places/recompute-scores
 */
export const recomputePlaceScores = async (_req: Request, res: Response) => {
  const places = await prisma.place.findMany({
    select: { id: true, name: true, description: true, category: true, rating: true, isFeatured: true },
  });
  let updated = 0;
  for (const place of places) {
    const newCategory = autoTagPlace(place.name, place.description);
    const newPopularity = computePopularity({
      rating: place.rating,
      category: newCategory,
      name: place.name,
      isFeatured: place.isFeatured,
    });
    await prisma.place.update({ where: { id: place.id }, data: { category: newCategory, popularity: newPopularity } });
    updated++;
  }
  res.json({ ok: true, updated });
};

/**
 * GET /v1/places/:id
 */

export const getPlace = async (req: Request, res: Response) => {
  const id = req.params.id?.toString();
  const item = await prisma.place.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Place not found' });
  res.json(item);
};
