import { useQuery } from '@tanstack/react-query';

import {
  getTransitRouteStops,
  type GetTransitRouteStopsOptions,
} from '../../server/transit.server';
import { queryKeys } from '../queryKeys';

export const useTransitRouteStopsQuery = (
  params: GetTransitRouteStopsOptions,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.transit.routeStops(params),
    queryFn: () => getTransitRouteStops(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
