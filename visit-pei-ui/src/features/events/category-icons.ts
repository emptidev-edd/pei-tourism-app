import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type AndroidName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, { sf: string; android: AndroidName }> = {
  music: { sf: 'music.note', android: 'music-note' },
  concerts: { sf: 'ticket', android: 'ticket-confirmation-outline' },
  festivals: { sf: 'sparkles', android: 'party-popper' },
  'food-and-drinks': { sf: 'fork.knife', android: 'silverware-fork-knife' },
  'arts-and-culture': { sf: 'paintpalette', android: 'palette-outline' },
  comedy: { sf: 'mic', android: 'microphone-outline' },
  'theatre-and-performing-arts': { sf: 'theatermasks', android: 'drama-masks' },
  sports: { sf: 'sportscourt', android: 'basketball' },
  'adventures-and-outdoor': { sf: 'figure.hiking', android: 'hiking' },
  nightlife: { sf: 'moon.stars', android: 'weather-night' },
  'family-and-kids': { sf: 'figure.2.and.child.holdinghands', android: 'account-group-outline' },
  'corporate-and-networking': { sf: 'laptopcomputer', android: 'laptop' },
  'education-and-workshops': { sf: 'graduationcap', android: 'school-outline' },
  'charity-and-fundraising': { sf: 'heart', android: 'hand-heart-outline' },
  exhibitions: { sf: 'building.2', android: 'storefront-outline' },
  community: { sf: 'person.3', android: 'account-group-outline' },
  'faith-and-church': { sf: 'book', android: 'hands-pray' },
  'markets-and-expos': { sf: 'storefront', android: 'store-outline' },
  other: { sf: 'ellipsis.circle', android: 'dots-horizontal-circle-outline' },
};

const FALLBACK = { sf: 'square.grid.2x2', android: 'shape-outline' as const };

export function categoryIcon(slug?: string | null) {
  if (!slug) return FALLBACK;
  return ICONS[slug] ?? FALLBACK;
}

/**
 * Keeps the order the API curates through `sortOrder`, falling back to the
 * category name only when two rows share the same position.
 */
export function sortCategories<T extends { name: string; sortOrder: number }>(categories: T[]) {
  return [...categories].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}
