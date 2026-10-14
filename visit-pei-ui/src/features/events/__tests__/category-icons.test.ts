import { categoryIcon, sortCategories } from '../category-icons';

/** The 19 active slugs GET /api/categories returns today. */
const LIVE_SLUGS = [
  'music',
  'concerts',
  'festivals',
  'food-and-drinks',
  'arts-and-culture',
  'comedy',
  'theatre-and-performing-arts',
  'sports',
  'adventures-and-outdoor',
  'nightlife',
  'family-and-kids',
  'corporate-and-networking',
  'education-and-workshops',
  'charity-and-fundraising',
  'exhibitions',
  'other',
  'community',
  'faith-and-church',
  'markets-and-expos',
];

const FALLBACK_SF = 'square.grid.2x2';

describe('sortCategories', () => {
  it('restores the order the API curates through sortOrder', () => {
    const shuffled = [...LIVE_SLUGS]
      .map((slug, index) => ({ slug, name: slug, sortOrder: index + 1 }))
      .sort(() => Math.random() - 0.5);

    expect(sortCategories(shuffled).map((c) => c.sortOrder)).toEqual(
      LIVE_SLUGS.map((_, index) => index + 1),
    );
  });

  it('falls back to the name when two rows share a position', () => {
    const sorted = sortCategories([
      { name: 'Zebra', sortOrder: 1 },
      { name: 'Apple', sortOrder: 1 },
    ]);
    expect(sorted.map((c) => c.name)).toEqual(['Apple', 'Zebra']);
  });

  it('does not mutate its input', () => {
    const input = [
      { name: 'B', sortOrder: 2 },
      { name: 'A', sortOrder: 1 },
    ];
    sortCategories(input);
    expect(input.map((c) => c.name)).toEqual(['B', 'A']);
  });
});

describe('categoryIcon', () => {
  it.each(LIVE_SLUGS)('resolves a real icon for %s', (slug) => {
    const icon = categoryIcon(slug);
    expect(icon.sf).not.toBe(FALLBACK_SF);
    expect(icon.android).toBeTruthy();
  });

  it('falls back for an unknown or missing slug', () => {
    expect(categoryIcon('not-a-category').sf).toBe(FALLBACK_SF);
    expect(categoryIcon(null).sf).toBe(FALLBACK_SF);
    expect(categoryIcon(undefined).sf).toBe(FALLBACK_SF);
  });
});
