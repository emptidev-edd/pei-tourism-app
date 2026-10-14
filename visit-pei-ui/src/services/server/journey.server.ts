import { apiRequest } from '../http/apiClient';
import type { JourneyMode, JourneyPlanResponse } from '../../types/api';

export type GetJourneyPlanOptions = {
  /** `"lat,lng"` or `stop:<GtfsStop.id>` — the same ref vocabulary the backend's geo-search will eventually share. */
  from: string;
  to: string;
  departAt?: string;
  arriveBy?: boolean;
  modes?: JourneyMode[];
  wheelchair?: boolean;
  maxWalkMeters?: number;
  numItineraries?: number;
};

export const getJourneyPlan = async (opts: GetJourneyPlanOptions) =>
  apiRequest<JourneyPlanResponse>('/journey/plan', {
    params: {
      from: opts.from,
      to: opts.to,
      departAt: opts.departAt ?? undefined,
      arriveBy: opts.arriveBy ? 'true' : undefined,
      modes: opts.modes && opts.modes.length > 0 ? opts.modes.join(',') : undefined,
      wheelchair: opts.wheelchair ? 'true' : undefined,
      maxWalkMeters: opts.maxWalkMeters ?? undefined,
      numItineraries: opts.numItineraries ?? undefined,
    },
  });
