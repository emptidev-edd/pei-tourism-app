import { useQuery } from '@tanstack/react-query';

import {
  getTransitRouteShape,
  type GetTransitRouteShapeOptions,
} from '../../server/transit.server';
import { queryKeys } from '../queryKeys';

/**
 * Road-following geometry for a route's map polyline.
 *
 * Shapes change only when the weekly GTFS ingest runs, so this is cached
 * far longer than the schedule queries.
 */
export const useTransitRouteShapeQuery = (
  params: GetTransitRouteShapeOptions,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.transit.routeShape(params),
    queryFn: () => getTransitRouteShape(params),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
