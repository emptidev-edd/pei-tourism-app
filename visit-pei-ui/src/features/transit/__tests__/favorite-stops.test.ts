import { favoriteToTransitStop, toFavoriteStop } from '../favorite-stops';

describe('toFavoriteStop', () => {
  it('normalizes a stop-shaped object into a FavoriteStop, defaulting missing fields to null', () => {
    expect(
      toFavoriteStop({
        feedId: 'f1',
        stopId: 's1',
        name: 'Confederation Court Mall',
        code: '101',
        lat: 46.23,
        lon: -63.13,
      }),
    ).toEqual({
      feedId: 'f1',
      stopId: 's1',
      name: 'Confederation Court Mall',
      code: '101',
      lat: 46.23,
      lon: -63.13,
    });

    expect(toFavoriteStop({ feedId: 'f1', stopId: 's1' })).toEqual({
      feedId: 'f1',
      stopId: 's1',
      name: null,
      code: null,
      lat: null,
      lon: null,
    });
  });
});

describe('favoriteToTransitStop', () => {
  it('rebuilds a TransitStop with a feed-qualified id', () => {
    const favorite = toFavoriteStop({
      feedId: 'f1',
      stopId: 's1',
      name: 'Confederation Court Mall',
      code: '101',
      lat: 46.23,
      lon: -63.13,
    });

    expect(favoriteToTransitStop(favorite)).toEqual({
      id: 'f1:s1',
      feedId: 'f1',
      stopId: 's1',
      code: '101',
      name: 'Confederation Court Mall',
      lat: 46.23,
      lon: -63.13,
    });
  });
});

describe('round trip', () => {
  it('toFavoriteStop -> favoriteToTransitStop preserves the fields a stop shares with FavoriteStop', () => {
    const original = {
      feedId: 'transitland:f-coachatlantic~pe~ca',
      stopId: 'stop-42',
      name: 'Main St',
      code: '42',
      lat: 46.1,
      lon: -63.2,
    };

    const roundTripped = favoriteToTransitStop(toFavoriteStop(original));

    expect(roundTripped).toMatchObject(original);
    expect(roundTripped.id).toBe(`${original.feedId}:${original.stopId}`);
  });
});
