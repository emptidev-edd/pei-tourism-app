import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getEvents, type GetEventsOptions } from '../../server/events.server';
import { queryKeys } from '../queryKeys';

export const useEventsQuery = (params: GetEventsOptions) =>
  useQuery({
    queryKey: queryKeys.events.list(params),
    queryFn: () => getEvents(params),
    // Category taps and search keystrokes change the key; without this the
    // whole feed drops to a skeleton on every one.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
