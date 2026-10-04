import { useQuery } from '@tanstack/react-query';

import { getVisitorCentres } from '../../server/visitorCentres.server';
import { queryKeys } from '../queryKeys';

export const useVisitorCentresQuery = () =>
  useQuery({
    queryKey: queryKeys.visitorCentres.list(),
    queryFn: getVisitorCentres,
    staleTime: 30 * 60 * 1000,
  });