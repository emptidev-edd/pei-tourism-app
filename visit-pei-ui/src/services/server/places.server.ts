import { apiRequest } from '../http/apiClient';
import type { FeaturedPlacesResponse, Place } from '../../types/api';

export const getFeaturedPlaces = async (limit = 4) =>
  apiRequest<FeaturedPlacesResponse>('/places/featured', {
    params: { limit },
  });

export const getPlace = async (id: string) =>
  apiRequest<Place>(`/places/${id}`);

export type GetPlacesOptions = {
  category?: string;
  near?: string;
  radiusKm?: number;
};

export const getPlaces = async (opts: GetPlacesOptions = {}) =>
  apiRequest<Place[]>('/places', {
    params: {
      category: opts.category ?? undefined,
      near: opts.near ?? undefined,
      radiusKm: opts.radiusKm ?? undefined,
    },
  });
