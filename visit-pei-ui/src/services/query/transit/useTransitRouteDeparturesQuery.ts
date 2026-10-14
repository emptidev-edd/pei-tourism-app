import { useQuery } from '@tanstack/react-query';

import {
  getTransitRouteDepartures,
  type GetTransitRouteDeparturesOptions,
} from '../../server/transit.server';
import { queryKeys } from '../queryKeys';

export const useTransitRouteDeparturesQuery = (
  params: GetTransitRouteDeparturesOptions,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.transit.routeDepartures(params),
    queryFn: () => getTransitRouteDepartures(params),
    enabled,
    staleTime: 60 * 1000,
  });
