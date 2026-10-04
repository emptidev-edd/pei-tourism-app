import { apiRequest } from '../http/apiClient';
import type { WeatherResponse } from '../../types/api';

export type GetWeatherOptions = {
  lat?: number;
  lng?: number;
};

// Defaults to Charlottetown server-side when no coordinates are passed.
export const getWeather = async (opts: GetWeatherOptions = {}) =>
  apiRequest<WeatherResponse>('/weather', {
    params: {
      lat: opts.lat,
      lng: opts.lng,
    },
  });
