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
  places: {
    detail: (id: string) => ['places', 'detail', id] as const,
  },
};
