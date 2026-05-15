import { useQuery } from '@tanstack/react-query';

import { getFeaturedPlaces } from '../../server/places.server';
import { queryKeys } from '../queryKeys';

export const useFeaturedPlacesQuery = (limit = 4) =>
  useQuery({
    queryKey: queryKeys.home.featuredPlaces(limit),
    queryFn: () => getFeaturedPlaces(limit),
    staleTime: 15 * 60 * 1000,
  });
