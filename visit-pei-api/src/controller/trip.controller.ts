import { Request, Response } from 'express';
import { z } from 'zod';
import { PlaceCategory } from '@prisma/client';
import { prisma } from '../config/prisma.js';

const DayPlanQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(1000).max(200_000).default(50_000),
  interests: z.string().optional(),
});

type Slot = {
  time: string;
  type: string;
  categories: PlaceCategory[];
  orderBy: 'meters' | 'popularity';
};

const SLOTS: Slot[] = [
  { time: '09:00', type: 'Morning Activity',    categories: [PlaceCategory.TRAIL, PlaceCategory.PARK, PlaceCategory.BEACH],                              orderBy: 'meters' },
  { time: '12:30', type: 'Lunch',               categories: [PlaceCategory.FOOD_DRINK],                                                                   orderBy: 'meters' },
  { time: '14:30', type: 'Afternoon Explore',   categories: [PlaceCategory.ATTRACTION, PlaceCategory.MUSEUM, PlaceCategory.HISTORIC, PlaceCategory.LIGHTHOUSE], orderBy: 'popularity' },
  { time: '17:30', type: 'Evening',             categories: [PlaceCategory.BEACH, PlaceCategory.PARK, PlaceCategory.ATTRACTION],                          orderBy: 'popularity' },
];

const INTEREST_MAP: Record<string, PlaceCategory[]> = {
  nature:   [PlaceCategory.TRAIL, PlaceCategory.PARK, PlaceCategory.BEACH],
  food:     [PlaceCategory.FOOD_DRINK],
  history:  [PlaceCategory.HISTORIC, PlaceCategory.MUSEUM, PlaceCategory.LIGHTHOUSE],
  culture:  [PlaceCategory.MUSEUM, PlaceCategory.ATTRACTION, PlaceCategory.HISTORIC],
  outdoor:  [PlaceCategory.TRAIL, PlaceCategory.PARK, PlaceCategory.BEACH, PlaceCategory.LIGHTHOUSE],
};

function resolveCategories(slot: Slot, interestCats: PlaceCategory[] | null): PlaceCategory[] {
  if (!interestCats || interestCats.length === 0) return slot.categories;
  const intersection = slot.categories.filter(c => interestCats.includes(c));
  return intersection.length > 0 ? intersection : slot.categories;
}

async function pickPlace(
  lng: number,
  lat: number,
  radius: number,
  categories: PlaceCategory[],
  excludeIds: string[],
  orderBy: 'meters' | 'popularity',
): Promise<any | null> {
  // categories come from validated enum values — safe to interpolate
  const catList = categories.map(c => `'${c}'`).join(', ');
  const excludeList = excludeIds.length > 0
    ? `AND id NOT IN (${excludeIds.map(id => `'${id}'`).join(', ')})`
    : '';

  const orderClause = orderBy === 'popularity'
    ? 'popularity DESC NULLS LAST, meters ASC'
    : 'meters ASC';

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, name, category, description, address, community, tags,
           rating, popularity, "isFeatured", lat, lng,
           ROUND(ST_Distance(geo::geography,
             ST_SetSRID(ST_MakePoint($1,$2),4326)::geography)::numeric, 1)::float8 AS meters
    FROM "Place"
    WHERE geo IS NOT NULL
      AND ST_DWithin(geo::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)
      AND category IN (${catList})
      ${excludeList}
    ORDER BY ${orderClause}
    LIMIT 1
  `, lng, lat, radius);

  return rows[0] ?? null;
}

export const getDayPlan = async (req: Request, res: Response) => {
  const parsed = DayPlanQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, message: parsed.error.flatten() });
  }

  const { lat, lng, radius, interests } = parsed.data;

  const interestCats: PlaceCategory[] | null = interests
    ? interests.split(',')
        .map(s => s.trim().toLowerCase())
        .flatMap(key => INTEREST_MAP[key] ?? [])
        .filter((v, i, arr) => arr.indexOf(v) === i)
    : null;

  const usedIds: string[] = [];
  const plan: { time: string; type: string; categories: PlaceCategory[]; place: any | null }[] = [];

  for (const slot of SLOTS) {
    const cats = resolveCategories(slot, interestCats);
    const place = await pickPlace(lng, lat, radius, cats, usedIds, slot.orderBy);
    if (place) usedIds.push(place.id);
    plan.push({ time: slot.time, type: slot.type, categories: cats, place });
  }

  res.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    center: { lat, lng },
    radius,
    plan,
  });
};
