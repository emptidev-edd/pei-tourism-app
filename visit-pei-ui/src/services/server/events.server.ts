import { apiRequest } from '../http/apiClient';
import type { EventsListResponse } from '../../types/api';

type GetUpcomingEventsOptions = {
  from: string;
  limit?: number;
};

export const getUpcomingEvents = async ({
  from,
  limit = 3,
}: GetUpcomingEventsOptions) =>
  apiRequest<EventsListResponse>('/events', {
    params: { from, limit },
  });
