import { PlaceCategory } from '@prisma/client';

const RULES: [string[], PlaceCategory][] = [
  [['visitor centre', 'visitor center', 'information centre', 'welcome centre'], PlaceCategory.VISITOR_CENTRE],
  [['beach', 'strand', 'dune', 'sandbar'],                                        PlaceCategory.BEACH],
  [['trail', 'hiking', 'hike', 'walkway', 'greenway'],                            PlaceCategory.TRAIL],
  [['park', 'conservation', 'wildlife', 'nature reserve'],                         PlaceCategory.PARK],
  [['museum', 'gallery', 'exhibit', 'archive'],                                    PlaceCategory.MUSEUM],
  [['historic', 'heritage', 'fort', 'battlefield', 'colonial', 'settlement'],      PlaceCategory.HISTORIC],
  [['lighthouse', 'light station'],                                                 PlaceCategory.LIGHTHOUSE],
  [['restaurant', 'cafe', 'coffee', 'bistro', 'brewery', 'winery', 'food', 'dining', 'bakery', 'pub', 'bar'], PlaceCategory.FOOD_DRINK],
  [['ferry', 'bus', 'transit', 'transport', 'airport', 'taxi', 'shuttle'],         PlaceCategory.TRANSPORT],
  [['attraction', 'theme park', 'amusement', 'entertainment', 'zoo', 'aquarium'],  PlaceCategory.ATTRACTION],
];

export function autoTagPlace(name: string, description?: string | null): PlaceCategory {
  const haystack = `${name} ${description ?? ''}`.toLowerCase();
  for (const [keywords, category] of RULES) {
    if (keywords.some(kw => haystack.includes(kw))) return category;
  }
  return PlaceCategory.OTHER;
}
