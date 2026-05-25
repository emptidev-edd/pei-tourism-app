import { useQuery } from '@tanstack/react-query';

import { getEvents, type GetEventsOptions } from '../../server/events.server';
import { queryKeys } from '../queryKeys';

export const useEventsQuery = (params: GetEventsOptions) =>
  useQuery({
    queryKey: queryKeys.events.list(params),
    queryFn: () => getEvents(params),
    staleTime: 5 * 60 * 1000,
  });
