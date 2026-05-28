import { useQuery } from '@tanstack/react-query';

import {
  getTransitStopArrivals,
  type GetTransitStopArrivalsOptions,
} from '../../server/transit.server';
import { queryKeys } from '../queryKeys';

export const useTransitStopArrivalsQuery = (
  params: GetTransitStopArrivalsOptions,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.transit.stopArrivals(params),
    queryFn: () => getTransitStopArrivals(params),
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
