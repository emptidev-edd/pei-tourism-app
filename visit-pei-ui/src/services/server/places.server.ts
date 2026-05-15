import { apiRequest } from '../http/apiClient';
import type { FeaturedPlacesResponse } from '../../types/api';

export const getFeaturedPlaces = async (limit = 4) =>
  apiRequest<FeaturedPlacesResponse>('/places/featured', {
    params: { limit },
  });
