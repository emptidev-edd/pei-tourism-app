import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { TransitStop } from '../types/api';

const STORAGE_KEY = 'visit-pei:favorite-stops';

export type FavoriteStop = {
  feedId: string;
  stopId: string;
  name: string | null;
  code: string | null;
  lat: number | null;
  lon: number | null;
};

export const toFavoriteStop = (stop: {
  feedId: string;
  stopId: string;
  name?: string | null;
  code?: string | null;
  lat?: number | null;
  lon?: number | null;
}): FavoriteStop => ({
  feedId: stop.feedId,
  stopId: stop.stopId,
  name: stop.name ?? null,
  code: stop.code ?? null,
  lat: stop.lat ?? null,
  lon: stop.lon ?? null,
});

export const favoriteToTransitStop = (favorite: FavoriteStop): TransitStop => ({
  id: `${favorite.feedId}:${favorite.stopId}`,
  feedId: favorite.feedId,
  stopId: favorite.stopId,
  code: favorite.code,
  name: favorite.name,
  lat: favorite.lat,
  lon: favorite.lon,
});

const readFavorites = async (): Promise<FavoriteStop[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Locally persisted favorite transit stops. Reloads on screen focus so
 * toggles made on one screen show up when navigating back to another.
 */
export const useFavoriteStops = () => {
  const [favorites, setFavorites] = useState<FavoriteStop[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      readFavorites().then((stored) => {
        if (active) {
          setFavorites(stored);
        }
      });

      return () => {
        active = false;
      };
    }, []),
  );

  const toggleFavorite = useCallback((stop: FavoriteStop) => {
    setFavorites((current) => {
      const next = current.some((item) => item.stopId === stop.stopId)
        ? current.filter((item) => item.stopId !== stop.stopId)
        : [...current, stop];

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (stopId?: string | null) =>
      stopId != null && favorites.some((item) => item.stopId === stopId),
    [favorites],
  );

  return { favorites, isFavorite, toggleFavorite };
};
