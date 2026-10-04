export const queryKeys = {
  home: {
    featuredPlaces: (limit: number) =>
      ['home', 'featuredPlaces', limit] as const,
    upcomingEvents: (dateFrom: string, limit: number) =>
      ['home', 'upcomingEvents', dateFrom, limit] as const,
  },
  events: {
    list: (params: {
      categorySlug?: string;
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      page?: number;
      search?: string;
    }) => ['events', 'list', params] as const,
    detail: (slug: string) => ['events', 'detail', slug] as const,
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
    list: (params: { category?: string; near?: string; radiusKm?: number }) =>
      ['places', 'list', params] as const,
  },
  visitorCentres: {
    list: () => ['visitorCentres', 'list'] as const,
    detail: (id: string) => ['visitorCentres', 'detail', id] as const,
  },
  weather: {
    forecast: (params: { lat?: number; lng?: number }) =>
      ['weather', 'forecast', params] as const,
  },
  trip: {
    dayPlan: (params: {
      lat: number;
      lng: number;
      radius?: number;
      interests?: string[];
      shuffle?: boolean;
      shuffleSeed?: number;
    }) => ['trip', 'dayPlan', params] as const,
  },
};
