import { apiRequest } from '../http/apiClient';
import type {
  NearbyTransitStopsResponse,
  TransitRoutesResponse,
  TransitRouteStopsResponse,
  TransitStopArrivalsResponse,
  TransitStopScheduleResponse,
} from '../../types/api';

export type GetNearbyTransitStopsOptions = {
  lat: number;
  lng: number;
  limit?: number;
  radius?: number;
};

export type GetTransitStopArrivalsOptions = {
  at?: string;
  feedId?: string;
  limit?: number;
  stopId: string;
};

export type GetTransitRouteStopsOptions = {
  feedId?: string;
  routeId: string;
  tripId?: string;
  directionId?: number;
};

export type GetTransitRoutesOptions = {
  feedId?: string;
};

export type GetTransitStopScheduleOptions = {
  feedId?: string;
  stopId: string;
  date?: string;
};

export const getNearbyTransitStops = async ({
  lat,
  lng,
  limit = 12,
  radius = 1200,
}: GetNearbyTransitStopsOptions) =>
  apiRequest<NearbyTransitStopsResponse>('/transit/stops', {
    params: {
      near: `${lat},${lng}`,
      radius,
      limit,
    },
  });

export const getTransitStopArrivals = async ({
  at,
  feedId,
  limit = 8,
  stopId,
}: GetTransitStopArrivalsOptions) =>
  apiRequest<TransitStopArrivalsResponse>(`/transit/stops/${stopId}/next`, {
    params: {
      at,
      feedId,
      limit,
    },
  });

export const getTransitRouteStops = async ({
  feedId,
  routeId,
  tripId,
  directionId,
}: GetTransitRouteStopsOptions) =>
  apiRequest<TransitRouteStopsResponse>(`/transit/routes/${routeId}/stops`, {
    params: {
      feedId,
      tripId,
      directionId,
    },
  });

export const getTransitRoutes = async ({ feedId }: GetTransitRoutesOptions) =>
  apiRequest<TransitRoutesResponse>('/transit/routes', { params: { feedId } });

export const getTransitStopSchedule = async ({ feedId, stopId, date }: GetTransitStopScheduleOptions) =>
  apiRequest<TransitStopScheduleResponse>(`/transit/stops/${stopId}/schedule`, { params: { feedId, date } });
