import { apiRequest } from '../http/apiClient';
import type {
  NearbyTransitStopsResponse,
  TransitRouteDeparturesResponse,
  TransitRoutesResponse,
  TransitRouteStopsResponse,
  TransitStopArrivalsResponse,
  TransitStopScheduleResponse,
  TransitRouteShapeResponse,
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

export type GetTransitRouteShapeOptions = {
  feedId?: string;
  routeId: string;
  directionId?: number;
};

export type GetTransitRouteDeparturesOptions = {
  feedId?: string;
  routeId: string;
  directionId?: number;
  stopId?: string;
  days?: number;
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

export const getTransitRouteDepartures = async ({
  feedId,
  routeId,
  directionId,
  stopId,
  days = 7,
}: GetTransitRouteDeparturesOptions) =>
  apiRequest<TransitRouteDeparturesResponse>(
    `/transit/routes/${encodeURIComponent(routeId)}/departures`,
    {
      params: {
        feedId,
        directionId,
        stopId,
        days,
      },
    },
  );

export const getTransitRouteShape = async ({
  feedId,
  routeId,
  directionId,
}: GetTransitRouteShapeOptions) =>
  apiRequest<TransitRouteShapeResponse>(
    `/transit/routes/${encodeURIComponent(routeId)}/shape`,
    { params: { feedId, directionId } },
  );

export const getTransitRoutes = async ({ feedId }: GetTransitRoutesOptions) =>
  apiRequest<TransitRoutesResponse>('/transit/routes', { params: { feedId } });

export const getTransitStopSchedule = async ({ feedId, stopId, date }: GetTransitStopScheduleOptions) =>
  apiRequest<TransitStopScheduleResponse>(`/transit/stops/${stopId}/schedule`, { params: { feedId, date } });
