import type { TransitRouteDeparture, TransitRouteStop } from '../../types/api';
import { AGENCY_TZ } from './constants';

export const parseGtfsTimeToSeconds = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parts = value.split(':').map(Number);
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const [hour, minute, second = 0] = parts;
  return hour * 3600 + minute * 60 + second;
};

export const getStopTimeSeconds = (item?: TransitRouteStop | null) =>
  item ? parseGtfsTimeToSeconds(item.departureTime || item.arrivalTime) : null;

/**
 * Route-screen specific clock formatter: en-US, numeric hour (no leading
 * zero), and tolerant of a missing value. This is intentionally distinct
 * from `transit-time.ts`'s `formatClockTime` (en-CA, 2-digit hour) used by
 * the nearby/stop screens — they render different UI and must not drift
 * into sharing one implementation.
 */
export const formatRouteClockTime = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: AGENCY_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
};

export const formatGtfsTime = (gtfsTime?: string | null): string | null => {
  if (!gtfsTime) return null;
  const parts = gtfsTime.split(':');
  if (parts.length < 2) return null;
  const hour = parseInt(parts[0], 10) % 24;
  return `${hour}:${parts[1]}`;
};

/**
 * Same calendar day *in the agency's timezone*, not the device's — otherwise
 * a traveller's phone decides what counts as "Today" on a bus timetable.
 */
const AGENCY_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENCY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const isSameLocalDay = (iso: string, now: number) =>
  AGENCY_DAY.format(new Date(iso)) === AGENCY_DAY.format(new Date(now));

export const departureKey = (departure: TransitRouteDeparture) =>
  `${departure.serviceDate}|${departure.tripId}`;
