import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { PlaceCategory } from '../types/api';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type PlaceVisualTheme = {
  accentColor: string;
  icon: IconName;
  imageUrl: string;
  label: string;
  softColor: string;
};

export const PLACE_VISUALS: Record<PlaceCategory, PlaceVisualTheme> = {
  VISITOR_CENTRE: {
    label: 'Visitor Info',
    icon: 'information-outline',
    accentColor: '#0f8a73',
    softColor: '#daf4ee',
    imageUrl:
      'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=1200&q=80',
  },
  ATTRACTION: {
    label: 'Attraction',
    icon: 'compass-outline',
    accentColor: '#3267b8',
    softColor: '#e8f0ff',
    imageUrl:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  },
  BEACH: {
    label: 'Beach',
    icon: 'wave',
    accentColor: '#1982b8',
    softColor: '#dff3ff',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  },
  PARK: {
    label: 'Park',
    icon: 'tree-outline',
    accentColor: '#4c8f2f',
    softColor: '#e3f5d6',
    imageUrl:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
  },
  TRAIL: {
    label: 'Trail',
    icon: 'map-marker-path',
    accentColor: '#007960',
    softColor: '#e6f2ef',
    imageUrl:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  },
  LIGHTHOUSE: {
    label: 'Lighthouse',
    icon: 'lighthouse',
    accentColor: '#d98500',
    softColor: '#fff3cf',
    imageUrl:
      'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
  },
  MUSEUM: {
    label: 'Museum',
    icon: 'bank-outline',
    accentColor: '#6f47c8',
    softColor: '#efe8ff',
    imageUrl:
      'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1200&q=80',
  },
  HISTORIC: {
    label: 'Historic',
    icon: 'castle',
    accentColor: '#9d5b2a',
    softColor: '#f7e9dc',
    imageUrl:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1200&q=80',
  },
  FOOD_DRINK: {
    label: 'Food & Drink',
    icon: 'silverware-fork-knife',
    accentColor: '#c75d1d',
    softColor: '#ffe7d9',
    imageUrl:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80',
  },
  ACCOMMODATION: {
    label: 'Stays',
    icon: 'bed-queen-outline',
    accentColor: '#1a6bb5',
    softColor: '#ddeeff',
    imageUrl:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  },
  FAMILY_FUN: {
    label: 'Family Fun',
    icon: 'ferris-wheel',
    accentColor: '#b53d9a',
    softColor: '#ffe4f7',
    imageUrl:
      'https://images.unsplash.com/photo-1596003906949-67221c37965c?auto=format&fit=crop&w=1200&q=80',
  },
  TRANSPORT: {
    label: 'Transport',
    icon: 'bus',
    accentColor: '#486a9f',
    softColor: '#e8eef8',
    imageUrl:
      'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80',
  },
  OTHER: {
    label: 'Explore',
    icon: 'map-search-outline',
    accentColor: '#5f738c',
    softColor: '#edf1f6',
    imageUrl:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  },
};

export const getPlaceTheme = (category: PlaceCategory): PlaceVisualTheme =>
  PLACE_VISUALS[category] ?? PLACE_VISUALS.OTHER;

export const NOISY_TAGS = new Set([
  'open-data',
  'open data',
  'pei',
  'prince edward island',
]);

export const formatTagLabel = (value: string) =>
  value
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
