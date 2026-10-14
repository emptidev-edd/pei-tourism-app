import type { TickitUpEvent } from '../../../types/api';
import {
  eventMatchesWhen,
  eventPlace,
  eventPriceLabel,
  formatExploreWhen,
  getEventBadgeState,
  organiserHandle,
  pickFeaturedEvents,
  pickTrendingEvents,
} from '../event-timing';

/** Wed 2026-10-07 12:00 local. A midweek anchor keeps the weekend maths honest. */
const NOW = new Date(2026, 9, 7, 12, 0, 0).getTime();

const at = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
) => new Date(year, month, day, hour, minute, 0).toISOString();

const event = (partial: Partial<TickitUpEvent>) =>
  ({
    id: 'e1',
    slug: 'e1',
    title: 'Event',
    description: '',
    status: 'PUBLISHED',
    isFeatured: false,
    isOnline: false,
    startDate: at(2026, 9, 8),
    endDate: at(2026, 9, 8, 15),
    organiserId: 'o1',
    createdAt: at(2026, 9, 1),
    updatedAt: at(2026, 9, 1),
    ...partial,
  }) as TickitUpEvent;

describe('getEventBadgeState', () => {
  it('reports ended once now passes endDate', () => {
    const state = getEventBadgeState(at(2026, 9, 6), at(2026, 9, 6, 15), NOW);
    expect(state.kind).toBe('ended');
  });

  it('reports happening only while the event is actually running', () => {
    expect(
      getEventBadgeState(at(2026, 9, 7, 11), at(2026, 9, 7, 14), NOW).kind,
    ).toBe('happening');
  });

  it('still counts down for an event starting later today', () => {
    // Guards the regression where a 20:00 event claimed to be "Happening now"
    // from midnight, 20 hours early.
    expect(
      getEventBadgeState(at(2026, 9, 7, 20), at(2026, 9, 7, 23), NOW).kind,
    ).toBe('countdown');
  });

  it('reports countdown from 1 up to 6 calendar days out', () => {
    expect(
      getEventBadgeState(at(2026, 9, 8), at(2026, 9, 8, 15), NOW).kind,
    ).toBe('countdown');
    expect(
      getEventBadgeState(at(2026, 9, 13), at(2026, 9, 13, 15), NOW).kind,
    ).toBe('countdown');
  });

  it('reports none beyond the 6 day countdown window', () => {
    expect(
      getEventBadgeState(at(2026, 9, 14), at(2026, 9, 14, 15), NOW).kind,
    ).toBe('none');
  });
});

describe('eventMatchesWhen', () => {
  const today = { startDate: at(2026, 9, 7, 20), endDate: at(2026, 9, 7, 23) };
  const tomorrow = { startDate: at(2026, 9, 8, 20), endDate: at(2026, 9, 8, 23) };
  const saturday = { startDate: at(2026, 9, 10, 20), endDate: at(2026, 9, 10, 23) };
  const live = { startDate: at(2026, 9, 7, 11), endDate: at(2026, 9, 7, 14) };

  it('matches today only for events starting today', () => {
    expect(eventMatchesWhen(today, 'today', NOW)).toBe(true);
    expect(eventMatchesWhen(tomorrow, 'today', NOW)).toBe(false);
  });

  it('matches tomorrow only for events starting tomorrow', () => {
    expect(eventMatchesWhen(tomorrow, 'tomorrow', NOW)).toBe(true);
    expect(eventMatchesWhen(today, 'tomorrow', NOW)).toBe(false);
  });

  it('matches happening only for events in progress', () => {
    expect(eventMatchesWhen(live, 'happening', NOW)).toBe(true);
    expect(eventMatchesWhen(tomorrow, 'happening', NOW)).toBe(false);
    // The case that separates "in progress" from "the start day has begun".
    expect(eventMatchesWhen(today, 'happening', NOW)).toBe(false);
  });

  it('matches the upcoming Fri-Sun window from a midweek now', () => {
    const friday = { startDate: at(2026, 9, 9, 18), endDate: at(2026, 9, 9, 23) };
    const sunday = { startDate: at(2026, 9, 11, 18), endDate: at(2026, 9, 11, 23) };
    const monday = { startDate: at(2026, 9, 12, 18), endDate: at(2026, 9, 12, 23) };
    expect(eventMatchesWhen(friday, 'weekend', NOW)).toBe(true);
    expect(eventMatchesWhen(saturday, 'weekend', NOW)).toBe(true);
    expect(eventMatchesWhen(sunday, 'weekend', NOW)).toBe(true);
    expect(eventMatchesWhen(monday, 'weekend', NOW)).toBe(false);
  });

  it('treats the current weekend as the window when now is Saturday', () => {
    const saturdayNow = new Date(2026, 9, 10, 12).getTime();
    expect(eventMatchesWhen(saturday, 'weekend', saturdayNow)).toBe(true);
  });

  it('treats the current weekend as the window when now is Sunday', () => {
    const sundayNow = new Date(2026, 9, 11, 12).getTime();
    const friday = { startDate: at(2026, 9, 9, 18), endDate: at(2026, 9, 9, 23) };
    expect(eventMatchesWhen(friday, 'weekend', sundayNow)).toBe(true);
  });

  it('matches everything when no filter is set', () => {
    expect(eventMatchesWhen(tomorrow, '', NOW)).toBe(true);
  });
});

describe('pickFeaturedEvents', () => {
  it('orders upcoming events by start date', () => {
    const picked = pickFeaturedEvents(
      [
        { id: 'b', startDate: at(2026, 9, 9), endDate: at(2026, 9, 9, 15) },
        { id: 'a', startDate: at(2026, 9, 8), endDate: at(2026, 9, 8, 15) },
      ],
      NOW,
    );
    expect(picked.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('never surfaces an ended event, however recently it finished', () => {
    const picked = pickFeaturedEvents(
      [
        { id: 'ended-1', startDate: at(2026, 9, 6), endDate: at(2026, 9, 6, 15) },
        { id: 'ended-2', startDate: at(2026, 9, 6, 8), endDate: at(2026, 9, 6, 11) },
        { id: 'soon', startDate: at(2026, 9, 8), endDate: at(2026, 9, 8, 15) },
      ],
      NOW,
    );
    expect(picked.map((e) => e.id)).toEqual(['soon']);
  });

  it('drops ended events from the coming-this-month fallback too', () => {
    // No happening/countdown events, so the fallback branch runs. An event
    // that started and finished earlier this month must not reappear there.
    const picked = pickFeaturedEvents(
      [
        { id: 'ended-this-month', startDate: at(2026, 9, 2), endDate: at(2026, 9, 2, 15) },
        { id: 'later-this-month', startDate: at(2026, 9, 28), endDate: at(2026, 9, 28, 15) },
      ],
      NOW,
    );
    expect(picked.map((e) => e.id)).toEqual(['later-this-month']);
  });

  it('returns nothing rather than an ended event when that is all there is', () => {
    const picked = pickFeaturedEvents(
      [{ id: 'ended-only', startDate: at(2026, 9, 6), endDate: at(2026, 9, 6, 15) }],
      NOW,
    );
    expect(picked).toEqual([]);
  });
});

describe('pickTrendingEvents', () => {
  const ended = { id: 'ended', isFeatured: true, startDate: at(2026, 9, 5), endDate: at(2026, 9, 5, 15) };
  const featuredLater = { id: 'featured', isFeatured: true, startDate: at(2026, 9, 20), endDate: at(2026, 9, 20, 15) };
  const plainSooner = { id: 'plain', isFeatured: false, startDate: at(2026, 9, 8), endDate: at(2026, 9, 8, 15) };
  const plainLater = { id: 'plain-later', isFeatured: false, startDate: at(2026, 9, 9), endDate: at(2026, 9, 9, 15) };

  it('drops events that have already ended', () => {
    const picked = pickTrendingEvents([ended, plainSooner], NOW);
    expect(picked.map((e) => e.id)).toEqual(['plain']);
  });

  it('puts featured events first, then the soonest', () => {
    const picked = pickTrendingEvents([plainLater, plainSooner, featuredLater], NOW);
    expect(picked.map((e) => e.id)).toEqual(['featured', 'plain', 'plain-later']);
  });

  it('respects the limit', () => {
    const picked = pickTrendingEvents([plainLater, plainSooner, featuredLater], NOW, 2);
    expect(picked).toHaveLength(2);
  });
});

describe('formatExploreWhen', () => {
  const now = new Date(NOW);

  it('prefixes same-day events with Today', () => {
    expect(formatExploreWhen(at(2026, 9, 7, 19), now)).toMatch(/^Today, /);
  });

  it('prefixes next-day events with Tomorrow', () => {
    expect(formatExploreWhen(at(2026, 9, 8, 19), now)).toMatch(/^Tomorrow, /);
  });

  it('uses a weekday form further out', () => {
    const label = formatExploreWhen(at(2026, 9, 12, 19), now);
    expect(label).not.toMatch(/^Today, /);
    expect(label).not.toMatch(/^Tomorrow, /);
    expect(label).toMatch(/Oct/);
  });
});

describe('eventPriceLabel', () => {
  it('reports sold out ahead of any price', () => {
    expect(eventPriceLabel(event({ isSoldOut: true, lowestPrice: 25 }))).toBe('Sold out');
  });

  it('reports free entry for a zero price', () => {
    expect(eventPriceLabel(event({ lowestPrice: 0 }))).toBe('Free entry');
  });

  it('formats a paid price as CAD currency', () => {
    expect(eventPriceLabel(event({ lowestPrice: 25 }))).toBe('From $25.00');
  });

  it('returns null when there is no price at all', () => {
    expect(eventPriceLabel(event({ lowestPrice: null }))).toBeNull();
  });
});

describe('eventPlace', () => {
  it('reports Online for online events, ignoring any venue', () => {
    expect(eventPlace(event({ isOnline: true, venueName: 'The Guild' }))).toBe('Online');
  });

  it('prefers the venue name', () => {
    expect(eventPlace(event({ venueName: 'The Guild' }))).toBe('The Guild');
  });

  it('falls back to the city, then the province', () => {
    expect(
      eventPlace(event({ venueName: null, city: { id: 'c', name: 'Charlottetown' } as never })),
    ).toBe('Charlottetown');
    expect(eventPlace(event({ venueName: null, city: null }))).toBe('Prince Edward Island');
  });
});

describe('organiserHandle', () => {
  it('slugifies the organisation name', () => {
    expect(organiserHandle('Island Sound Collective')).toBe('@islandsoundcollective');
  });

  it('falls back when the name is missing', () => {
    expect(organiserHandle(null)).toBe('@organiser');
    expect(organiserHandle('   ')).toBe('@organiser');
  });
});
