import { apiRequest } from '../http/apiClient';
import type { DayPlanResponse, TripInterest } from '../../types/api';

export type GetDayPlanOptions = {
  lat: number;
  lng: number;
  radius?: number;
  interests?: TripInterest[];
  shuffle?: boolean;
  shuffleSeed?: number;
};

export const getDayPlan = async (opts: GetDayPlanOptions) =>
  apiRequest<DayPlanResponse>('/trip/day-plan', {
    params: {
      lat: opts.lat,
      lng: opts.lng,
      radius: opts.radius ?? undefined,
      interests: opts.interests && opts.interests.length > 0 ? opts.interests.join(',') : undefined,
      shuffle: opts.shuffle ? 'true' : undefined,
    },
  });