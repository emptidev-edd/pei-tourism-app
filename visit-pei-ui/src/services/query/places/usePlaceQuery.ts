import { useQuery } from '@tanstack/react-query';

import { getPlace } from '../../server/places.server';
import { queryKeys } from '../queryKeys';

export const usePlaceQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.places.detail(id),
    queryFn: () => getPlace(id),
    enabled: Boolean(id),
    staleTime: 15 * 60 * 1000,
  });
