import type { Place } from '../../types/api';
import { excludeRedundantUmbrellaPlaces, getDisplayPlaceName } from '../placeVisuals';

describe('getDisplayPlaceName', () => {
  it('strips the shared prefix up to an em dash', () => {
    expect(getDisplayPlaceName('Prince Edward Island National Park — Stanhope')).toBe('Stanhope');
    expect(getDisplayPlaceName('Prince Edward Island National Park — Brackley')).toBe('Brackley');
  });

  it('leaves names without an em dash unchanged', () => {
    expect(getDisplayPlaceName('Prince Edward Island National Park of Canada')).toBe(
      'Prince Edward Island National Park of Canada',
    );
    expect(getDisplayPlaceName('Victoria Provincial Park')).toBe('Victoria Provincial Park');
  });

  it('trims whitespace around the dash', () => {
    expect(getDisplayPlaceName('Prefix —   Cavendish')).toBe('Cavendish');
  });
});

describe('excludeRedundantUmbrellaPlaces', () => {
  const makePlace = (name: string): Place => ({
    id: name,
    name,
    nameFr: null,
    category: 'PARK',
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
  });

  it('drops the generic umbrella record alongside its specific areas', () => {
    const places = [
      makePlace('Prince Edward Island National Park of Canada'),
      makePlace('Prince Edward Island National Park — Stanhope'),
      makePlace('Prince Edward Island National Park — Brackley'),
      makePlace('Victoria Provincial Park'),
    ];
    const result = excludeRedundantUmbrellaPlaces(places);
    expect(result.map((p) => p.name)).toEqual([
      'Prince Edward Island National Park — Stanhope',
      'Prince Edward Island National Park — Brackley',
      'Victoria Provincial Park',
    ]);
  });

  it('drops the no-suffix umbrella variant seen under TRAIL', () => {
    const places = [makePlace('Prince Edward Island National Park'), makePlace('Confederation Trail')];
    expect(excludeRedundantUmbrellaPlaces(places).map((p) => p.name)).toEqual(['Confederation Trail']);
  });

  it('leaves unrelated places untouched', () => {
    const places = [makePlace('Victoria Provincial Park'), makePlace('Cedar Dunes Provincial Park')];
    expect(excludeRedundantUmbrellaPlaces(places)).toHaveLength(2);
  });
});
