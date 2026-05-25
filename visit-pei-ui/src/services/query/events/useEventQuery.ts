import { useQuery } from '@tanstack/react-query';

import { getEvent } from '../../server/events.server';
import { queryKeys } from '../queryKeys';

export const useEventQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => getEvent(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
