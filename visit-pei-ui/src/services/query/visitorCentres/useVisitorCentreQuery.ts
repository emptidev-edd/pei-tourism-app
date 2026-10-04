import { useQuery } from '@tanstack/react-query';

import { getVisitorCentre } from '../../server/visitorCentres.server';
import { queryKeys } from '../queryKeys';

export const useVisitorCentreQuery = (id: string | undefined) =>
  useQuery({
    enabled: Boolean(id),
    queryKey: queryKeys.visitorCentres.detail(id ?? ''),
    queryFn: () => getVisitorCentre(id as string),
    staleTime: 30 * 60 * 1000,
  });
