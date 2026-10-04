import { useQuery } from '@tanstack/react-query';

import { getEvent } from '../../server/events.server';
import { queryKeys } from '../queryKeys';

export const useEventQuery = (slug: string) =>
  useQuery({
    queryKey: queryKeys.events.detail(slug),
    queryFn: () => getEvent(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });
