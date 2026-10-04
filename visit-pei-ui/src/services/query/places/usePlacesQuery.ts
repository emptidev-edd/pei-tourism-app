import { useQuery } from '@tanstack/react-query';

import { getPlaces, type GetPlacesOptions } from '../../server/places.server';
import { queryKeys } from '../queryKeys';

export const usePlacesQuery = (params: GetPlacesOptions = {}) =>
  useQuery({
    queryKey: queryKeys.places.list(params),
    queryFn: () => getPlaces(params),
    staleTime: 10 * 60 * 1000,
  });
