import { useQuery } from '@tanstack/react-query';

import { getDayPlan, type GetDayPlanOptions } from '../../server/trip.server';
import { queryKeys } from '../queryKeys';

export const useDayPlanQuery = (opts: GetDayPlanOptions | null) =>
  useQuery({
    enabled: opts !== null,
    queryKey: queryKeys.trip.dayPlan({
      lat: opts?.lat ?? 0,
      lng: opts?.lng ?? 0,
      radius: opts?.radius,
      interests: opts?.interests,
      shuffle: opts?.shuffle,
      shuffleSeed: opts?.shuffleSeed,
    }),
    queryFn: () => getDayPlan(opts as GetDayPlanOptions),
    staleTime: 5 * 60 * 1000,
  });