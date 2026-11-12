import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { COLOR } from '../../styles';
import type { Place, PlaceCategory } from '../types/api';
import { PLACE_VISUALS } from './placeVisuals';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type PlaceSubcategoryId = string;

export type PlaceSubcategory = {
  id: PlaceSubcategoryId;
  category: PlaceCategory;
  label: string;
  icon: IconName;
  /** Lowercase substring match against each of Place.tags. */
  keywords: string[];
  isCatchAll?: boolean;
  accentColor: string;
  softColor: string;
};

/**
 * A fixed-order, CVD-safe categorical palette (validated for adjacent-pair
 * contrast) — reused per-drawer rather than per-app, since each drawer is its
 * own isolated view and never shown alongside another.
 */
const CATEGORICAL = {
  blue: { accent: '#2a78d6', soft: '#e3effc' },
  orange: { accent: '#eb6834', soft: '#fde8e0' },
  aqua: { accent: '#1baf7a', soft: '#dcf5ec' },
  yellow: { accent: '#eda100', soft: '#fdecc9' },
};

/**
 * v1, best-effort: the API has no real subcategory field (no National vs
 * Provincial, no trail-type), only a free-form `tags` array. These keyword
 * rules are a guess at what production tags might contain — unverified
 * against live data. Review/adjust once real tag values are known. Each
 * category's last entry is its catch-all — anything that doesn't match a
 * more specific rule lands there, so no place is ever unreachable.
 */
export const PLACE_SUBCATEGORIES: Partial<Record<PlaceCategory, PlaceSubcategory[]>> = {
  TRAIL: [
    {
      id: 'TRAIL_WALKING', category: 'TRAIL', label: 'Walking Trails', icon: 'walk',
      keywords: ['walking', 'walk', 'boardwalk', 'baywalk', 'promenade'],
      accentColor: CATEGORICAL.blue.accent, softColor: CATEGORICAL.blue.soft,
    },
    {
      id: 'TRAIL_BIKING', category: 'TRAIL', label: 'Biking Trails', icon: 'bike',
      // 'AT' (kept uppercase — matched case-sensitively, see matchesKeyword)
      // matches PEI's "Active Transportation" paved multi-use paths. The
      // real open-data trail source tags every record identically
      // ('trail'/'active-transportation'/'open-data'), so tags alone can't
      // tell walking from biking; "<Street> AT" naming is the only signal
      // available, and those are the paved paths actually suited to biking.
      keywords: ['biking', 'bike', 'cycling', 'cycle', 'AT'],
      accentColor: CATEGORICAL.orange.accent, softColor: CATEGORICAL.orange.soft,
    },
    {
      id: 'TRAIL_NON_BIKING', category: 'TRAIL', label: 'Non-Biking Trails', icon: 'hiking',
      keywords: ['hiking', 'hike', 'backcountry', 'refuge', 'no-bike', 'nature'],
      accentColor: CATEGORICAL.aqua.accent, softColor: CATEGORICAL.aqua.soft,
      isCatchAll: true,
    },
  ],
  BEACH: [
    {
      id: 'BEACH_NATIONAL', category: 'BEACH', label: 'National Park Beaches', icon: 'shield-star-outline',
      keywords: ['national'],
      accentColor: CATEGORICAL.blue.accent, softColor: CATEGORICAL.blue.soft,
    },
    {
      id: 'BEACH_PROVINCIAL', category: 'BEACH', label: 'Provincial Park Beaches', icon: 'flag-variant-outline',
      keywords: ['provincial'],
      accentColor: CATEGORICAL.orange.accent, softColor: CATEGORICAL.orange.soft,
    },
    {
      id: 'BEACH_OTHER', category: 'BEACH', label: 'More Beaches', icon: PLACE_VISUALS.BEACH.icon,
      keywords: [],
      accentColor: CATEGORICAL.aqua.accent, softColor: CATEGORICAL.aqua.soft,
      isCatchAll: true,
    },
  ],
  PARK: [
    {
      id: 'PARK_NATIONAL', category: 'PARK', label: 'National Parks', icon: 'shield-star-outline',
      keywords: ['national'],
      accentColor: CATEGORICAL.blue.accent, softColor: CATEGORICAL.blue.soft,
    },
    {
      id: 'PARK_PROVINCIAL', category: 'PARK', label: 'Provincial Parks', icon: 'flag-variant-outline',
      keywords: ['provincial'],
      accentColor: CATEGORICAL.orange.accent, softColor: CATEGORICAL.orange.soft,
    },
    {
      id: 'PARK_OTHER', category: 'PARK', label: 'More Parks', icon: PLACE_VISUALS.PARK.icon,
      keywords: [],
      accentColor: CATEGORICAL.aqua.accent, softColor: CATEGORICAL.aqua.soft,
      isCatchAll: true,
    },
  ],
  ATTRACTION: [
    {
      id: 'ATTRACTION_CULTURE', category: 'ATTRACTION', label: 'Culture & Heritage', icon: 'bank-outline',
      keywords: ['museum', 'heritage', 'history', 'culture', 'art'],
      accentColor: CATEGORICAL.blue.accent, softColor: CATEGORICAL.blue.soft,
    },
    {
      id: 'ATTRACTION_FAMILY', category: 'ATTRACTION', label: 'Family & Kids', icon: 'ferris-wheel',
      keywords: ['family', 'kids', 'children', 'playground'],
      accentColor: CATEGORICAL.orange.accent, softColor: CATEGORICAL.orange.soft,
    },
    {
      id: 'ATTRACTION_TOURS', category: 'ATTRACTION', label: 'Tours & Experiences', icon: 'golf',
      keywords: ['tour', 'winery', 'brewery', 'distillery', 'golf', 'experience'],
      accentColor: CATEGORICAL.aqua.accent, softColor: CATEGORICAL.aqua.soft,
    },
    {
      id: 'ATTRACTION_OTHER', category: 'ATTRACTION', label: 'More to Discover', icon: PLACE_VISUALS.ATTRACTION.icon,
      keywords: [],
      accentColor: CATEGORICAL.yellow.accent, softColor: CATEGORICAL.yellow.soft,
      isCatchAll: true,
    },
  ],
};

const genericCatchAll = (category: PlaceCategory): PlaceSubcategory => ({
  id: `${category}_OTHER`,
  category,
  label: PLACE_VISUALS[category]?.label ?? 'More to Discover',
  icon: PLACE_VISUALS[category]?.icon ?? 'map-search-outline',
  keywords: [],
  isCatchAll: true,
  accentColor: COLOR.mutedText,
  softColor: COLOR.backgroundSoft,
});

const matchesKeyword = (values: string[], keywords: string[]): boolean => {
  if (keywords.length === 0) return false;
  return keywords.some((keyword) => {
    // Short keywords (e.g. "AT" for PEI's "Active Transportation" paths)
    // are matched case-sensitively with a word boundary — a case-insensitive
    // or substring check would false-positive on "National"/"Natural", and
    // on the ordinary English word "at" (e.g. "Roma at Three Rivers").
    if (keyword.length <= 2) {
      const wordBoundary = new RegExp(`\\b${keyword}\\b`);
      return values.some((value) => wordBoundary.test(value));
    }
    const lowerKeyword = keyword.toLowerCase();
    return values.some((value) => value.toLowerCase().includes(lowerKeyword));
  });
};

export const getSubcategoryForPlace = (place: Place): PlaceSubcategory => {
  const rules = PLACE_SUBCATEGORIES[place.category];
  const catchAll = rules?.find((rule) => rule.isCatchAll) ?? genericCatchAll(place.category);
  if (!rules) return catchAll;

  // The real open-data trail source tags every record identically, so tags
  // alone can't distinguish walking/biking/etc. — fall back to matching
  // against the place name too (e.g. "<Street> AT", "<Area> Boardwalk").
  const haystack = [...place.tags, place.name];
  const match = rules.find(
    (rule) => !rule.isCatchAll && matchesKeyword(haystack, rule.keywords),
  );
  return match ?? catchAll;
};

/** A subcategory's position in its category's authored rule list — keeps tab order predictable (Walking, Biking, Non-Biking, …) regardless of input order. Unlisted/generic subcategories sort last. */
const subcategoryOrderIndex = (subcategory: PlaceSubcategory): number => {
  const rules = PLACE_SUBCATEGORIES[subcategory.category];
  const index = rules?.findIndex((rule) => rule.id === subcategory.id) ?? -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export type GroupedPlaces = { subcategory: PlaceSubcategory; places: Place[] };

export const groupPlacesBySubcategory = (places: Place[]): GroupedPlaces[] => {
  const buckets = new Map<PlaceSubcategoryId, GroupedPlaces>();

  for (const place of places) {
    const subcategory = getSubcategoryForPlace(place);
    const bucket = buckets.get(subcategory.id);
    if (bucket) {
      bucket.places.push(place);
    } else {
      buckets.set(subcategory.id, { subcategory, places: [place] });
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => subcategoryOrderIndex(a.subcategory) - subcategoryOrderIndex(b.subcategory),
  );
};
