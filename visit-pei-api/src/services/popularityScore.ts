import { PlaceCategory } from '@prisma/client';

const TOURIST_HEAVY = new Set<PlaceCategory>([
  PlaceCategory.BEACH,
  PlaceCategory.ATTRACTION,
  PlaceCategory.LIGHTHOUSE,
  PlaceCategory.MUSEUM,
  PlaceCategory.HISTORIC,
  PlaceCategory.PARK,
]);

export function computePopularity(place: {
  rating?: number | null;
  category: PlaceCategory;
  name: string;
  isFeatured: boolean;
}): number {
  let score = 50;
  if (place.rating != null && Number.isFinite(place.rating)) score += Math.round(place.rating * 10);
  if (TOURIST_HEAVY.has(place.category)) score += 20;
  if (/national|provincial/i.test(place.name)) score += 10;
  if (place.isFeatured) score += 15;
  return Math.min(100, Math.max(0, score));
}
