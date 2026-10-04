import { apiRequest } from '../http/apiClient';
import type {
  VisitorCentreDetailResponse,
  VisitorCentresListResponse,
} from '../../types/api';

export const getVisitorCentres = async () =>
  apiRequest<VisitorCentresListResponse>('/visitor-centres');

export const getVisitorCentre = async (id: string) =>
  apiRequest<VisitorCentreDetailResponse>(`/visitor-centres/${id}`);