export const queryKeys = {
  home: {
    featuredPlaces: (limit: number) =>
      ['home', 'featuredPlaces', limit] as const,
    upcomingEvents: (from: string, limit: number) =>
      ['home', 'upcomingEvents', from, limit] as const,
  },
  events: {
    list: (params: {
      community?: string;
      from?: string;
      limit?: number;
      page?: number;
      q?: string;
      to?: string;
    }) => ['events', 'list', params] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
  },
  transit: {
    nearbyStops: (params: {
      lat: number;
      lng: number;
      limit?: number;
      radius?: number;
    }) => ['transit', 'nearbyStops', params] as const,
    stopArrivals: (params: {
      at?: string;
      feedId?: string;
      limit?: number;
      stopId: string;
    }) => ['transit', 'stopArrivals', params] as const,
    routeStops: (params: { feedId?: string; routeId: string; tripId?: string; directionId?: number }) =>
      ['transit', 'routeStops', params] as const,
    routes: (params: { feedId?: string }) => ['transit', 'routes', params] as const,
    stopSchedule: (params: { feedId?: string; stopId: string; date?: string }) =>
      ['transit', 'stopSchedule', params] as const,
  },
  places: {
    detail: (id: string) => ['places', 'detail', id] as const,
  },
};
