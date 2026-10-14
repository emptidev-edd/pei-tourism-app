import { useQuery } from '@tanstack/react-query';

import { getJourneyPlan, type GetJourneyPlanOptions } from '../../server/journey.server';
import { queryKeys } from '../queryKeys';
import { ApiClientError } from '../../http/apiClient';
import type { JourneyDegradedEstimate } from '../../../types/api';

/**
 * A 503 (GRAPH_BUILDING / ENGINE_DOWN) still carries a usable
 * `degradedEstimate` in its error body — read it out so the results screen
 * can show "47 min drive" instead of a bare error, matching the backend's
 * "never render empty" contract.
 */
export const degradedEstimateFromError = (
  error: unknown,
): JourneyDegradedEstimate | null => {
  if (!(error instanceof ApiClientError)) return null;
  const details = error.details as { degradedEstimate?: JourneyDegradedEstimate } | undefined;
  return details?.degradedEstimate ?? null;
};

export const useJourneyPlanQuery = (
  opts: GetJourneyPlanOptions | null,
) =>
  useQuery({
    enabled: opts !== null,
    queryKey: queryKeys.journey.plan({
      from: opts?.from ?? '',
      to: opts?.to ?? '',
      departAt: opts?.departAt,
      arriveBy: opts?.arriveBy,
      modes: opts?.modes,
    }),
    queryFn: () => getJourneyPlan(opts as GetJourneyPlanOptions),
    // A 503 is the backend's own "try again shortly" signal (graph
    // rebuilding / OTP down) — one retry is worth it, more isn't.
    retry: (failureCount, error) =>
      failureCount < 1 && error instanceof ApiClientError && error.status === 503,
    staleTime: 60 * 1000,
  });
