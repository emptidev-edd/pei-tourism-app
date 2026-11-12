import type { Place } from '../../types/api';
import {
  getSubcategoryForPlace,
  groupPlacesBySubcategory,
} from '../placeSubcategories';

const makePlace = (partial: Partial<Place> = {}): Place => ({
  id: 'place-1',
  name: 'Test Place',
  nameFr: null,
  category: 'TRAIL',
  description: null,
  descriptionFr: null,
  imageUrl: null,
  address: null,
  phone: null,
  website: null,
  region: null,
  community: null,
  tags: [],
  rating: null,
  popularity: null,
  isFeatured: false,
  lat: null,
  lng: null,
  source: 'test',
  sourceUrl: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...partial,
});

describe('getSubcategoryForPlace', () => {
  it.each([
    ['TRAIL', ['Walking'], 'TRAIL_WALKING'],
    ['TRAIL', ['hiking'], 'TRAIL_NON_BIKING'],
    ['TRAIL', ['backcountry'], 'TRAIL_NON_BIKING'],
    ['TRAIL', ['biking'], 'TRAIL_BIKING'],
    ['TRAIL', ['Cycling'], 'TRAIL_BIKING'],
    ['BEACH', ['National'], 'BEACH_NATIONAL'],
    ['BEACH', ['provincial-park'], 'BEACH_PROVINCIAL'],
    ['PARK', ['NATIONAL'], 'PARK_NATIONAL'],
    ['PARK', ['provincial'], 'PARK_PROVINCIAL'],
    ['ATTRACTION', ['museum'], 'ATTRACTION_CULTURE'],
    ['ATTRACTION', ['kids'], 'ATTRACTION_FAMILY'],
    ['ATTRACTION', ['winery'], 'ATTRACTION_TOURS'],
  ] as const)('matches %s tag %j to %s', (category, tags, expectedId) => {
    const place = makePlace({ category, tags: [...tags] });
    expect(getSubcategoryForPlace(place).id).toBe(expectedId);
  });

  it('is case-insensitive', () => {
    const place = makePlace({ category: 'TRAIL', tags: ['WALKING TRAIL'] });
    expect(getSubcategoryForPlace(place).id).toBe('TRAIL_WALKING');
  });

  it('falls back to the catch-all when no tag matches', () => {
    const place = makePlace({ category: 'TRAIL', tags: ['scenic', 'photogenic'] });
    expect(getSubcategoryForPlace(place)).toMatchObject({
      id: 'TRAIL_NON_BIKING',
      isCatchAll: true,
    });
  });

  it('falls back to the catch-all when tags is empty', () => {
    const place = makePlace({ category: 'BEACH', tags: [] });
    expect(getSubcategoryForPlace(place)).toMatchObject({
      id: 'BEACH_OTHER',
      isCatchAll: true,
    });
  });

  it('falls back to a generic catch-all for categories with no defined rules', () => {
    const place = makePlace({ category: 'MUSEUM', tags: ['history'] });
    const result = getSubcategoryForPlace(place);
    expect(result.isCatchAll).toBe(true);
    expect(result.category).toBe('MUSEUM');
  });

  describe('name-based matching (the real trail source tags every record identically)', () => {
    it('matches "AT" in a trail name to Biking', () => {
      const place = makePlace({ category: 'TRAIL', name: 'Wilfred St AT', tags: ['trail', 'open-data'] });
      expect(getSubcategoryForPlace(place).id).toBe('TRAIL_BIKING');
    });

    it('matches "Boardwalk" in a trail name to Walking', () => {
      const place = makePlace({ category: 'TRAIL', name: 'Cavendish Boardwalk', tags: ['trail', 'open-data'] });
      expect(getSubcategoryForPlace(place).id).toBe('TRAIL_WALKING');
    });

    it('does not match the ordinary English word "at" (only the standalone uppercase token)', () => {
      const place = makePlace({ category: 'TRAIL', name: 'Roma at Three Rivers', tags: ['trail', 'open-data'] });
      expect(getSubcategoryForPlace(place).id).toBe('TRAIL_NON_BIKING');
    });

    it('does not false-positive on "National"/"Natural" containing the letters "at"', () => {
      const place = makePlace({ category: 'TRAIL', name: 'National Natural Area Trail', tags: ['trail', 'open-data'] });
      expect(getSubcategoryForPlace(place).id).toBe('TRAIL_NON_BIKING');
    });
  });
});

describe('groupPlacesBySubcategory', () => {
  it('buckets every place exactly once', () => {
    const places = [
      makePlace({ id: 'p1', category: 'TRAIL', tags: ['walking'] }),
      makePlace({ id: 'p2', category: 'TRAIL', tags: ['biking'] }),
      makePlace({ id: 'p3', category: 'TRAIL', tags: ['walking'] }),
      makePlace({ id: 'p4', category: 'TRAIL', tags: [] }),
    ];
    const groups = groupPlacesBySubcategory(places);
    const allPlaceIds = groups.flatMap((g) => g.places.map((p) => p.id));
    expect(allPlaceIds.sort()).toEqual(['p1', 'p2', 'p3', 'p4'].sort());
  });

  it('drops empty buckets', () => {
    const places = [makePlace({ category: 'TRAIL', tags: ['walking'] })];
    const groups = groupPlacesBySubcategory(places);
    expect(groups).toHaveLength(1);
    expect(groups[0].subcategory.id).toBe('TRAIL_WALKING');
  });

  it('always orders the catch-all bucket last', () => {
    const places = [
      makePlace({ id: 'p1', category: 'TRAIL', tags: [] }), // catch-all
      makePlace({ id: 'p2', category: 'TRAIL', tags: ['biking'] }),
      makePlace({ id: 'p3', category: 'TRAIL', tags: ['walking'] }),
    ];
    const groups = groupPlacesBySubcategory(places);
    expect(groups[groups.length - 1].subcategory.isCatchAll).toBe(true);
    expect(groups.slice(0, -1).every((g) => !g.subcategory.isCatchAll)).toBe(true);
  });

  it('orders buckets by the authored rule order, not input order', () => {
    // Biking appears first in the input, but Walking is authored first for
    // TRAIL — the tab order must follow the authored list, not insertion.
    const places = [
      makePlace({ id: 'p1', category: 'TRAIL', tags: ['biking'] }),
      makePlace({ id: 'p2', category: 'TRAIL', tags: ['walking'] }),
      makePlace({ id: 'p3', category: 'TRAIL', tags: [] }),
    ];
    const groups = groupPlacesBySubcategory(places);
    expect(groups.map((g) => g.subcategory.id)).toEqual([
      'TRAIL_WALKING',
      'TRAIL_BIKING',
      'TRAIL_NON_BIKING',
    ]);
  });

  it('returns an empty array for no places', () => {
    expect(groupPlacesBySubcategory([])).toEqual([]);
  });
});
