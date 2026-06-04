import { useQuery } from '@tanstack/react-query';

import {
  getTransitRoutes,
  type GetTransitRoutesOptions,
} from '../../server/transit.server';
import { queryKeys } from '../queryKeys';

export const useTransitRoutesQuery = (params: GetTransitRoutesOptions, enabled = true) =>
  useQuery({
    queryKey: queryKeys.transit.routes(params),
    queryFn: () => getTransitRoutes(params),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
