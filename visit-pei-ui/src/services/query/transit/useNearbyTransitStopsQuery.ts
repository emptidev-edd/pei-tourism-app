import { useQuery } from '@tanstack/react-query';

import {
  getNearbyTransitStops,
  type GetNearbyTransitStopsOptions,
} from '../../server/transit.server';
import { queryKeys } from '../queryKeys';

export const useNearbyTransitStopsQuery = (
  params: GetNearbyTransitStopsOptions,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.transit.nearbyStops(params),
    queryFn: () => getNearbyTransitStops(params),
    enabled,
    staleTime: 60 * 1000,
  });
