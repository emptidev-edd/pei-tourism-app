import {
  formatClockTime,
  formatNextTimesLine,
  getCountdownParts,
} from '../transit-time';
import type { TransitArrival } from '../../../types/api';

/** Wed 2026-10-07 12:00 local — arbitrary, fixed anchor for every test below. */
const NOW = new Date(2026, 9, 7, 12, 0, 0).getTime();

const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

const MIN = 60 * 1000;

const arrival = (partial: Partial<TransitArrival>): TransitArrival =>
  ({
    feedId: 'f1',
    routeId: 'r1',
    tripId: 't1',
    departureAtIso: iso(5 * MIN),
    ...partial,
  }) as TransitArrival;

describe('getCountdownParts', () => {
  it('reports "Now" within one minute either side of departure', () => {
    expect(getCountdownParts(iso(0), NOW)).toEqual({ value: 'Now', unit: null });
    expect(getCountdownParts(iso(MIN), NOW)).toEqual({ value: 'Now', unit: null });
    expect(getCountdownParts(iso(-MIN), NOW)).toEqual({ value: 'Now', unit: null });
  });

  it('reports "Passed" once departure is more than a minute behind now', () => {
    expect(getCountdownParts(iso(-MIN - 1), NOW)).toEqual({
      value: 'Passed',
      unit: null,
    });
    expect(getCountdownParts(iso(-30 * MIN), NOW)).toEqual({
      value: 'Passed',
      unit: null,
    });
  });

  it('counts plain minutes under the two-hour mark', () => {
    expect(getCountdownParts(iso(2 * MIN), NOW)).toEqual({ value: '2', unit: 'min' });
    expect(getCountdownParts(iso(45 * MIN), NOW)).toEqual({ value: '45', unit: 'min' });
    expect(getCountdownParts(iso(119 * MIN), NOW)).toEqual({ value: '119', unit: 'min' });
  });

  it('switches to "H hr M min" at exactly 120 minutes', () => {
    expect(getCountdownParts(iso(120 * MIN), NOW)).toEqual({ value: '2', unit: 'hr' });
  });

  it('shows the leftover minutes alongside the hour count', () => {
    expect(getCountdownParts(iso(125 * MIN), NOW)).toEqual({
      value: '2 hr 5',
      unit: 'min',
    });
    expect(getCountdownParts(iso(3 * 60 * MIN + 30 * MIN), NOW)).toEqual({
      value: '3 hr 30',
      unit: 'min',
    });
  });

  it('drops the minutes when the countdown lands on an exact hour', () => {
    expect(getCountdownParts(iso(180 * MIN), NOW)).toEqual({ value: '3', unit: 'hr' });
  });
});

describe('formatClockTime', () => {
  it('formats en-CA 24h time with no AM/PM', () => {
    expect(formatClockTime(new Date(2026, 9, 7, 9, 5).toISOString())).toBe('09:05');
    expect(formatClockTime(new Date(2026, 9, 7, 23, 45).toISOString())).toBe('23:45');
    expect(formatClockTime(new Date(2026, 9, 7, 0, 0).toISOString())).toBe('00:00');
  });
});

describe('formatNextTimesLine', () => {
  it('returns null when there is no second arrival', () => {
    expect(formatNextTimesLine([arrival({ departureAtIso: iso(5 * MIN) })], NOW)).toBeNull();
  });

  it('joins the next two arrivals as relative minutes when both are under 2h', () => {
    const items = [
      arrival({ departureAtIso: iso(5 * MIN) }),
      arrival({ departureAtIso: iso(25 * MIN) }),
      arrival({ departureAtIso: iso(40 * MIN) }),
    ];
    expect(formatNextTimesLine(items, NOW)).toBe('25, 40 min');
  });

  it('falls back to clock times once either of the next two is 2h+ out', () => {
    const items = [
      arrival({ departureAtIso: iso(5 * MIN) }),
      arrival({ departureAtIso: iso(10 * MIN) }),
      arrival({ departureAtIso: iso(150 * MIN) }),
    ];
    const expected = [
      formatClockTime(items[1].departureAtIso),
      formatClockTime(items[2].departureAtIso),
    ].join(', ');
    expect(formatNextTimesLine(items, NOW)).toBe(expected);
  });
});
