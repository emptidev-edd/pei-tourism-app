import { useQuery } from '@tanstack/react-query';

import { getEventCategories } from '../../server/events.server';
import { queryKeys } from '../queryKeys';

export const useEventCategoriesQuery = () =>
  useQuery({
    queryKey: queryKeys.events.categories,
    queryFn: getEventCategories,
    staleTime: 10 * 60 * 1000,
  });
