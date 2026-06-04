import { useQuery } from '@tanstack/react-query';

import {
  getTransitStopSchedule,
  type GetTransitStopScheduleOptions,
} from '../../server/transit.server';
import { queryKeys } from '../queryKeys';

export const useTransitStopScheduleQuery = (params: GetTransitStopScheduleOptions, enabled = true) =>
  useQuery({
    queryKey: queryKeys.transit.stopSchedule(params),
    queryFn: () => getTransitStopSchedule(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
