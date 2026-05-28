import { apiRequest } from '../http/apiClient';
import type {
  NearbyTransitStopsResponse,
  TransitRouteStopsResponse,
  TransitStopArrivalsResponse,
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
}: GetTransitRouteStopsOptions) =>
  apiRequest<TransitRouteStopsResponse>(`/transit/routes/${routeId}/stops`, {
    params: {
      feedId,
      tripId,
    },
  });
