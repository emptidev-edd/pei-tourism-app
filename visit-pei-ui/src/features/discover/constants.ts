export type FilterTab = 'TRAIL' | 'BEACH' | 'PARK' | 'ATTRACTION';

export const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'TRAIL', label: 'Trails' },
  { id: 'BEACH', label: 'Beaches' },
  { id: 'PARK', label: 'Parks' },
  { id: 'ATTRACTION', label: 'Attractions' },
];

/** Placeholder copy for the landing cards — flag for a content review pass. */
export const CATEGORY_HIGHLIGHT: Record<FilterTab, string> = {
  TRAIL: 'From boardwalks to backcountry',
  BEACH: 'Red sand to white dunes',
  PARK: 'Green space, every corner of the Island',
  ATTRACTION: 'Museums, tours & family fun',
};
