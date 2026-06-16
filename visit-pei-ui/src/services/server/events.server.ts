import { apiRequest } from '../http/apiClient';
import type { EventDetailResponse, EventsListResponse } from '../../types/api';

type GetUpcomingEventsOptions = {
  from: string;
  limit?: number;
};

export type GetEventsOptions = {
  from?: string;
  to?: string;
  q?: string;
  community?: string;
  sources?: string[];
  limit?: number;
  page?: number;
};

export const getUpcomingEvents = async ({
  from,
  limit = 3,
}: GetUpcomingEventsOptions) =>
  apiRequest<EventsListResponse>('/events', {
    params: { from, limit },
  });

export const getEvents = async ({
  community,
  from,
  limit = 20,
  page = 1,
  q,
  sources,
  to,
}: GetEventsOptions) =>
  apiRequest<EventsListResponse>('/events', {
    params: {
      community,
      from,
      limit,
      page,
      q,
      sources: sources && sources.length > 0 ? sources.join(',') : undefined,
      to,
    },
  });

export const getEvent = async (id: string) =>
  apiRequest<EventDetailResponse>(`/events/${id}`);
