import { apiRequest } from '../http/apiClient';
import type {
  EventCategory,
  EventsListResponse,
  TickitUpEvent,
  ValidatePromoResponse,
} from '../../types/api';

export type GetEventsOptions = {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  categorySlug?: string;
  limit?: number;
  page?: number;
};

export const getEvents = async ({
  categorySlug,
  dateFrom,
  dateTo,
  limit = 20,
  page = 1,
  search,
}: GetEventsOptions = {}) =>
  apiRequest<EventsListResponse>('/events', {
    params: {
      categorySlug,
      dateFrom,
      dateTo,
      limit,
      page,
      search,
    },
  });

export const getUpcomingEvents = async ({
  dateFrom,
  limit = 3,
}: {
  dateFrom: string;
  limit?: number;
}) =>
  getEvents({
    dateFrom,
    limit,
    page: 1,
  });

export const getEvent = async (slug: string) =>
  apiRequest<TickitUpEvent>(`/events/${slug}`);

export const getEventCategories = async () =>
  apiRequest<EventCategory[]>('/categories');

export const validatePromoCode = async (eventId: string, code: string) =>
  apiRequest<ValidatePromoResponse>(`/events/${eventId}/promo-codes/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
