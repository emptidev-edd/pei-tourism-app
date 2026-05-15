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

  // MVP near-me filter using bounding box on lat/lng fields
  let minLat: number | null = null;
  let maxLat: number | null = null;
  let minLng: number | null = null;
  let maxLng: number | null = null;

  if (near) {
    const [latStr, lngStr] = near.split(',');
    const lat = Number(latStr);
    const lng = Number(lngStr);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const dLat = radiusKm / 111;
      const dLng = radiusKm / 111;

      minLat = lat - dLat;
      maxLat = lat + dLat;
      minLng = lng - dLng;
      maxLng = lng + dLng;
    }
  }

  const items = await prisma.$queryRawUnsafe<any[]>(
    `
      SELECT id, name, category, description, "imageUrl", address, phone, website,
             "hoursJson", region, community, tags, rating, popularity, "isFeatured",
             lat, lng, source, "sourceUrl", "updatedAt", "createdAt"
      FROM "Place"
      WHERE ($1::text IS NULL OR category::text = $1::text)
        AND ($2::double precision IS NULL OR lat BETWEEN $2 AND $3)
        AND ($4::double precision IS NULL OR lng BETWEEN $4 AND $5)
      ORDER BY "updatedAt" DESC
      LIMIT 500
    `,
    category ?? null,
    minLat,
    maxLat,
    minLng,
    maxLng,
  );

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
  const items = await prisma.$queryRawUnsafe<any[]>(
    `
      SELECT id, name, category, description, "imageUrl", address, phone, website,
             "hoursJson", region, community, tags, rating, popularity, "isFeatured",
             lat, lng, source, "sourceUrl", "updatedAt", "createdAt"
      FROM "Place"
      WHERE ("isFeatured" = true OR popularity >= 70)
        AND ($1::text IS NULL OR category::text = $1::text)
      ORDER BY "isFeatured" DESC, popularity DESC NULLS LAST
      LIMIT $2
    `,
    category ?? null,
    limit,
  );
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
    SELECT id, name, category, description, "imageUrl", address, community, tags,
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

const SetPlaceFeaturedParams = z.object({
  id: z.string().min(1),
});

const SetPlaceFeaturedBody = z.object({
  isFeatured: z.boolean().default(true),
});

const SetPlaceImageParams = z.object({
  id: z.string().min(1),
});

const SetPlaceImageBody = z.object({
  imageUrl: z.string().url().nullable(),
});

/**
 * POST /admin/places/:id/feature
 */
export const setPlaceFeatured = async (req: Request, res: Response) => {
  const params = SetPlaceFeaturedParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ ok: false, message: params.error.flatten() });
  }

  const body = SetPlaceFeaturedBody.safeParse(req.body ?? {});
  if (!body.success) {
    return res.status(400).json({ ok: false, message: body.error.flatten() });
  }

  const existingPlace = await prisma.place.findUnique({
    where: { id: params.data.id },
    select: { id: true, isFeatured: true },
  });

  if (!existingPlace) {
    return res.status(404).json({ ok: false, message: 'Place not found' });
  }

  const updatedPlace = await prisma.place.update({
    where: { id: params.data.id },
    data: { isFeatured: body.data.isFeatured },
  });

  return res.json({
    ok: true,
    item: updatedPlace,
  });
};

/**
 * POST /admin/places/:id/image
 */
export const setPlaceImage = async (req: Request, res: Response) => {
  const params = SetPlaceImageParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ ok: false, message: params.error.flatten() });
  }

  const body = SetPlaceImageBody.safeParse(req.body ?? {});
  if (!body.success) {
    return res.status(400).json({ ok: false, message: body.error.flatten() });
  }

  const existingPlace = await prisma.$queryRawUnsafe<any[]>(
    `
      SELECT id, "imageUrl"
      FROM "Place"
      WHERE id = $1
      LIMIT 1
    `,
    params.data.id,
  );

  if (existingPlace.length === 0) {
    return res.status(404).json({ ok: false, message: 'Place not found' });
  }

  const updatedRows = await prisma.$queryRawUnsafe<any[]>(
    `
      UPDATE "Place"
      SET "imageUrl" = $2
      WHERE id = $1
      RETURNING id, name, category, description, "imageUrl", address, phone, website,
                "hoursJson", region, community, tags, rating, popularity, "isFeatured",
                lat, lng, source, "sourceUrl", "updatedAt", "createdAt"
    `,
    params.data.id,
    body.data.imageUrl,
  );

  return res.json({
    ok: true,
    item: updatedRows[0],
  });
};

/**
 * GET /v1/places/:id
 */

export const getPlace = async (req: Request, res: Response) => {
  const id = req.params.id?.toString();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
      SELECT id, name, category, description, "imageUrl", address, phone, website,
             "hoursJson", region, community, tags, rating, popularity, "isFeatured",
             lat, lng, source, "sourceUrl", "updatedAt", "createdAt"
      FROM "Place"
      WHERE id = $1
      LIMIT 1
    `,
    id,
  );
  const item = rows[0];
  if (!item) return res.status(404).json({ error: 'Place not found' });
  res.json(item);
};
