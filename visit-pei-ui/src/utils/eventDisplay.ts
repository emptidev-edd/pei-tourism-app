import type { TickitUpEvent } from '../types/api';

export const getEventImageUrl = (event: TickitUpEvent) =>
  event.bannerImageUrl?.trim() || null;

export const getEventCity = (event: TickitUpEvent) =>
  event.city?.name?.trim() || null;

export const getEventLocation = (event: TickitUpEvent) =>
  event.venueName?.trim() ||
  event.city?.name?.trim() ||
  event.venueAddress?.trim() ||
  'Prince Edward Island';

export const formatEventPrice = (event: TickitUpEvent) => {
  if (event.isSoldOut) return 'Sold out';
  if (event.lowestPrice == null) return null;
  if (event.lowestPrice === 0) return 'Free';
  return `From $${event.lowestPrice.toFixed(2)}`;
};
