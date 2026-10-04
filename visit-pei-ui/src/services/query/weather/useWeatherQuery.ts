import { useQuery } from '@tanstack/react-query';

import { getWeather, type GetWeatherOptions } from '../../server/weather.server';
import { queryKeys } from '../queryKeys';

export const useWeatherQuery = (opts: GetWeatherOptions = {}) =>
  useQuery({
    queryKey: queryKeys.weather.forecast({ lat: opts.lat, lng: opts.lng }),
    queryFn: () => getWeather(opts),
    staleTime: 15 * 60 * 1000,
  });
