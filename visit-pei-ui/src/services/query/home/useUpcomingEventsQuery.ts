import { useQuery } from '@tanstack/react-query';

import { getUpcomingEvents } from '../../server/events.server';
import { queryKeys } from '../queryKeys';

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useUpcomingEventsQuery = (limit = 3) => {
  const dateFrom = formatLocalDate(new Date());

  return useQuery({
    queryKey: queryKeys.home.upcomingEvents(dateFrom, limit),
    queryFn: () => getUpcomingEvents({ dateFrom, limit }),
    staleTime: 5 * 60 * 1000,
  });
};
