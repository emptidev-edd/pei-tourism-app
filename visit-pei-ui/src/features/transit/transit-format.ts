import type { TransitArrival } from '../../types/api';

export const formatWalkTime = (meters?: number) => {
  if (meters == null) {
    return 'Near you';
  }

  const minutes = Math.max(1, Math.round(meters / 80));
  return `${minutes} min walk`;
};

/**
 * Canonical route-number label: shortName when present, otherwise the last
 * segment of the feed-qualified routeId. Takes primitives so it works for an
 * arrival, a route, or a raw routeId string alike — see
 * `getArrivalRouteNumber` for the arrival-shaped convenience wrapper.
 */
export const getRouteNumber = (routeId: string, shortName?: string | null) =>
  shortName?.trim() || routeId.split(':').pop()?.trim() || routeId;

export const getArrivalRouteNumber = (arrival: TransitArrival) =>
  getRouteNumber(arrival.routeId, arrival.routeShortName);

export const getRouteTitle = (arrival: TransitArrival) =>
  arrival.routeLongName?.trim() || arrival.headsign?.trim() || 'Transit line';

const ALL_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const MON_SAT = [...WEEKDAYS, 'saturday'];
const DAY_ABBR: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export const formatServiceDays = (days: string[]): string => {
  const s = new Set(days);
  if (ALL_DAYS.every((d) => s.has(d))) return 'Daily';
  if (WEEKDAYS.every((d) => s.has(d)) && !s.has('saturday') && !s.has('sunday')) {
    return 'Mon–Fri';
  }
  if (MON_SAT.every((d) => s.has(d)) && !s.has('sunday')) return 'Mon–Sat';
  if (s.has('saturday') && s.has('sunday') && !WEEKDAYS.some((d) => s.has(d))) {
    return 'Weekends';
  }
  return days.map((d) => DAY_ABBR[d] ?? d).join(', ') || 'See schedule';
};
