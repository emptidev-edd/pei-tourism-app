import type { TransitArrival } from '../types/api';

const MINUTE_MS = 60 * 1000;

export type CountdownParts = {
  value: string;
  unit: string | null;
};

/**
 * Splits a departure countdown into a big value and a small unit so screens
 * can render Moovit-style pills ("10" + "min"). "Now"/"Passed" have no unit.
 */
export const getCountdownParts = (
  departureAtIso: string,
  now: number,
): CountdownParts => {
  const diffMs = new Date(departureAtIso).getTime() - now;
  if (diffMs <= MINUTE_MS && diffMs >= -MINUTE_MS) {
    return { value: 'Now', unit: null };
  }

  if (diffMs < -MINUTE_MS) {
    return { value: 'Passed', unit: null };
  }

  const totalMinutes = Math.ceil(diffMs / MINUTE_MS);
  if (totalMinutes >= 120) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0
      ? { value: `${hours}`, unit: 'hr' }
      : { value: `${hours} hr ${minutes}`, unit: 'min' };
  }

  return { value: `${totalMinutes}`, unit: 'min' };
};

export const formatCountdownLabel = (
  departureAtIso: string | null | undefined,
  now: number,
): string | null => {
  if (!departureAtIso) {
    return null;
  }

  const { value, unit } = getCountdownParts(departureAtIso, now);
  return unit ? `${value} ${unit}` : value;
};

export const formatClockTime = (departureAtIso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(departureAtIso));

export const getUpcomingArrivals = (items: TransitArrival[], now: number) =>
  items.filter(
    (item) => new Date(item.departureAtIso).getTime() >= now - MINUTE_MS,
  );

/**
 * Secondary line under the countdown pill for the departures after the first
 * one: "25, 40 min" when both are within two hours, clock times otherwise.
 */
export const formatNextTimesLine = (
  items: TransitArrival[],
  now: number,
): string | null => {
  const next = items.slice(1, 3);
  if (next.length === 0) {
    return null;
  }

  const minutes = next.map((item) =>
    Math.ceil((new Date(item.departureAtIso).getTime() - now) / MINUTE_MS),
  );

  if (minutes.every((m) => m > 0 && m < 120)) {
    return `${minutes.join(', ')} min`;
  }

  return next.map((item) => formatClockTime(item.departureAtIso)).join(', ');
};
