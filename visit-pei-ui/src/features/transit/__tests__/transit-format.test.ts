import type { TransitArrival } from '../../../types/api';
import {
  formatServiceDays,
  formatWalkTime,
  getArrivalRouteNumber,
  getRouteNumber,
  getRouteTitle,
} from '../transit-format';

describe('formatWalkTime', () => {
  it('falls back to "Near you" when no distance is known', () => {
    expect(formatWalkTime(undefined)).toBe('Near you');
  });

  it('rounds to the nearest minute at 80m/min', () => {
    expect(formatWalkTime(160)).toBe('2 min walk');
    expect(formatWalkTime(200)).toBe('3 min walk'); // 2.5 -> rounds up
  });

  it('floors at 1 minute for very short distances', () => {
    expect(formatWalkTime(10)).toBe('1 min walk');
    expect(formatWalkTime(0)).toBe('1 min walk');
  });
});

describe('getRouteNumber', () => {
  it('prefers a trimmed short name', () => {
    expect(getRouteNumber('transitland:r-abc~1', '  12  ')).toBe('12');
  });

  it('falls back to the last colon-separated segment of the routeId', () => {
    expect(getRouteNumber('transitland:12', undefined)).toBe('12');
    expect(getRouteNumber('transitland:12', '   ')).toBe('12');
  });

  it('falls back to the full routeId when it has no colon separator', () => {
    expect(getRouteNumber('12', null)).toBe('12');
  });
});

describe('getArrivalRouteNumber', () => {
  it('delegates to getRouteNumber using the arrival routeId/shortName', () => {
    const arrival = {
      routeId: 'transitland:r-abc~5',
      routeShortName: '5',
    } as TransitArrival;
    expect(getArrivalRouteNumber(arrival)).toBe('5');
  });
});

describe('getRouteTitle', () => {
  it('prefers the long name', () => {
    const arrival = {
      routeLongName: '  Downtown Loop  ',
      headsign: 'Other',
    } as TransitArrival;
    expect(getRouteTitle(arrival)).toBe('Downtown Loop');
  });

  it('falls back to the headsign, then a generic label', () => {
    expect(getRouteTitle({ headsign: 'Riverside' } as TransitArrival)).toBe('Riverside');
    expect(getRouteTitle({} as TransitArrival)).toBe('Transit line');
  });
});

describe('formatServiceDays', () => {
  const ALL = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  it('reports Daily for all seven days', () => {
    expect(formatServiceDays(ALL)).toBe('Daily');
  });

  it('reports Mon–Fri for weekdays only', () => {
    expect(formatServiceDays(WEEKDAYS)).toBe('Mon–Fri');
  });

  it('reports Mon–Sat when Saturday is included but not Sunday', () => {
    expect(formatServiceDays([...WEEKDAYS, 'saturday'])).toBe('Mon–Sat');
  });

  it('reports Weekends for Saturday + Sunday only', () => {
    expect(formatServiceDays(['saturday', 'sunday'])).toBe('Weekends');
  });

  it('abbreviates an irregular set of days', () => {
    expect(formatServiceDays(['monday', 'wednesday'])).toBe('Mon, Wed');
  });

  it('falls back to "See schedule" for an empty list', () => {
    expect(formatServiceDays([])).toBe('See schedule');
  });
});
