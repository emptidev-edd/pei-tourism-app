export const queryKeys = {
  home: {
    featuredPlaces: (limit: number) =>
      ['home', 'featuredPlaces', limit] as const,
    upcomingEvents: (from: string, limit: number) =>
      ['home', 'upcomingEvents', from, limit] as const,
  },
};
