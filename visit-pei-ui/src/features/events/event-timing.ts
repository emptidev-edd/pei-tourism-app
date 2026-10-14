import { useEffect, useState } from 'react';

import type { TickitUpEvent } from '../../types/api';

export type WhenFilter = 'happening' | 'today' | 'tomorrow' | 'weekend';

export type EventBadgeState =
  | { kind: 'ended' }
  | { kind: 'happening' }
  | { kind: 'countdown'; days: number; hours: number; minutes: number }
  | { kind: 'none' };

export const FEATURED_CARD_LIMIT = 6;
export const TRENDING_LIMIT = 12;
const FEATURED_COUNTDOWN_MAX_DAYS = 6;

export function startOfLocalDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfLocalDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function calendarDaysBetween(from: Date, to: Date) {
  const a = startOfLocalDay(from).getTime();
  const b = startOfLocalDay(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

function formatHrsMinCountdown(targetIso: string, now = Date.now()) {
  const ms = new Date(targetIso).getTime() - now;
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const minutes = totalMin % 60;
  return { days, hours, minutes, expired: false };
}

/**
 * True only while the event is genuinely running — the single definition of
 * "happening" across the feature. An event later today is *not* happening; it
 * still has a countdown to run.
 */
export function isEventInProgress(
  startIso: string,
  endIso: string,
  now = Date.now(),
) {
  const at = new Date(now).getTime();
  return at >= new Date(startIso).getTime() && at <= new Date(endIso).getTime();
}

export function getEventBadgeState(
  startIso: string,
  endIso: string,
  now = Date.now(),
): EventBadgeState {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const nowDate = new Date(now);

  if (nowDate.getTime() > end.getTime()) {
    return { kind: 'ended' };
  }

  if (isEventInProgress(startIso, endIso, now)) {
    return { kind: 'happening' };
  }

  // Counts from today (0) so an event starting later today still shows a live
  // countdown rather than claiming to be under way.
  const daysUntil = calendarDaysBetween(nowDate, start);
  if (daysUntil >= 0 && daysUntil <= FEATURED_COUNTDOWN_MAX_DAYS) {
    const countdown = formatHrsMinCountdown(startIso, now);
    return {
      kind: 'countdown',
      days: countdown.days,
      hours: countdown.hours,
      minutes: countdown.minutes,
    };
  }

  return { kind: 'none' };
}

export function isComingThisMonth(startIso: string, now = Date.now()) {
  const start = new Date(startIso);
  const nowDate = new Date(now);
  if (start.getTime() <= nowDate.getTime()) return false;
  return (
    start.getFullYear() === nowDate.getFullYear() &&
    start.getMonth() === nowDate.getMonth()
  );
}

export function featuredRailDateRange(now = new Date()) {
  const from = startOfLocalDay(now);
  from.setDate(from.getDate() - 7);
  const monthEnd = endOfLocalDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const plus6 = endOfLocalDay(new Date(now));
  plus6.setDate(plus6.getDate() + FEATURED_COUNTDOWN_MAX_DAYS);
  const to = monthEnd.getTime() > plus6.getTime() ? monthEnd : plus6;
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

export function pickFeaturedEvents<T extends { startDate: string; endDate: string }>(
  events: T[],
  now = Date.now(),
  limit = FEATURED_CARD_LIMIT,
): T[] {
  const byStart = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  // Ended events never surface here. They remain visible on the organiser's
  // own profile, which is the only place a finished event belongs.
  const upcoming = byStart.filter((event) => {
    const kind = getEventBadgeState(event.startDate, event.endDate, now).kind;
    return kind === 'happening' || kind === 'countdown';
  });

  if (upcoming.length > 0) return upcoming.slice(0, limit);

  return byStart
    .filter(
      (event) =>
        isComingThisMonth(event.startDate, now) &&
        !isEventEnded(event.endDate, now),
    )
    .slice(0, limit);
}

export function isEventEnded(endIso: string, now = Date.now()) {
  return new Date(now).getTime() > new Date(endIso).getTime();
}

export function pickActiveEvents<T extends { startDate: string; endDate: string }>(
  events: T[],
  now = Date.now(),
) {
  return events
    .filter((event) => !isEventEnded(event.endDate, now))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

/**
 * The API exposes no popularity signal — there is no view counter or save
 * counter anywhere in the Prisma schema — so "trending" is a documented proxy:
 * organiser-flagged events first, then the soonest upcoming. Replace this the
 * moment the API grows a real metric.
 */
export function pickTrendingEvents<
  T extends { isFeatured: boolean; startDate: string; endDate: string },
>(events: T[], now = Date.now(), limit = TRENDING_LIMIT): T[] {
  return pickActiveEvents(events, now)
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    })
    .slice(0, limit);
}

function weekendRange(now: number) {
  const date = new Date(now);
  const day = date.getDay();
  const friday = startOfLocalDay(date);
  if (day === 0) friday.setDate(date.getDate() - 2);
  else if (day === 6) friday.setDate(date.getDate() - 1);
  else if (day !== 5) friday.setDate(date.getDate() + (5 - day));
  const sunday = endOfLocalDay(friday);
  sunday.setDate(friday.getDate() + 2);
  return { from: friday, to: sunday };
}

export function eventMatchesWhen(
  event: { startDate: string; endDate: string },
  when: WhenFilter | '',
  now = Date.now(),
) {
  if (!when) return true;
  if (when === 'happening') {
    return isEventInProgress(event.startDate, event.endDate, now);
  }

  const start = new Date(event.startDate);
  if (when === 'today') {
    const day = startOfLocalDay(new Date(now));
    return start >= day && start <= endOfLocalDay(day);
  }
  if (when === 'tomorrow') {
    const day = startOfLocalDay(new Date(now));
    day.setDate(day.getDate() + 1);
    return start >= day && start <= endOfLocalDay(day);
  }

  const range = weekendRange(now);
  return start >= range.from && start <= range.to;
}

function formatEventClock(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatExploreWhen(iso: string, now = new Date()) {
  const d = new Date(iso);
  const startToday = startOfLocalDay(new Date(now));
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const startDayAfter = new Date(startTomorrow);
  startDayAfter.setDate(startDayAfter.getDate() + 1);
  const time = formatEventClock(iso);
  if (d >= startToday && d < startTomorrow) return `Today, ${time}`;
  if (d >= startTomorrow && d < startDayAfter) return `Tomorrow, ${time}`;
  const day = d.toLocaleDateString('en-CA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${day}, ${time}`;
}

export function eventPlace(event: TickitUpEvent) {
  if (event.isOnline) return 'Online';
  return (
    event.venueName?.trim() ||
    event.city?.name?.trim() ||
    'Prince Edward Island'
  );
}

export function eventPriceLabel(event: TickitUpEvent) {
  if (event.isSoldOut) return 'Sold out';
  if (event.lowestPrice == null) return null;
  if (event.lowestPrice === 0) return 'Free entry';
  return `From ${new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(event.lowestPrice)}`;
}

export function organiserHandle(name?: string | null) {
  if (!name?.trim()) return '@organiser';
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 22);
  return `@${slug || 'organiser'}`;
}

export function useNowTick(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
