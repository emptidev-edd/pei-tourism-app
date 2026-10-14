import type { TickitUpEvent } from '../../../types/api';

/** Wed 2026-10-07 12:00 local — the shared anchor for every card test. */
export const NOW = new Date(2026, 9, 7, 12, 0, 0).getTime();

export const iso = (
  year: number,
  month: number,
  day: number,
  hour = 12,
  minute = 0,
) => new Date(year, month, day, hour, minute, 0).toISOString();

export const makeEvent = (partial: Partial<TickitUpEvent> = {}) =>
  ({
    id: 'evt-1',
    slug: 'harbourfront-live',
    title: 'Harbourfront Live',
    description: '',
    status: 'PUBLISHED',
    isFeatured: false,
    isOnline: false,
    venueName: 'The Guild',
    startDate: iso(2026, 9, 9, 19),
    endDate: iso(2026, 9, 9, 23),
    bannerImageUrl: 'https://cdn.example.com/flyer.jpg',
    organiserId: 'org-1',
    organiser: {
      id: 'org-1',
      organisationName: 'Island Sound Collective',
      organisationLogoUrl: null,
    },
    category: { id: 'cat-1', name: 'Music', slug: 'music' },
    lowestPrice: 25,
    isSoldOut: false,
    createdAt: iso(2026, 9, 1),
    updatedAt: iso(2026, 9, 1),
    ...partial,
  }) as TickitUpEvent;
