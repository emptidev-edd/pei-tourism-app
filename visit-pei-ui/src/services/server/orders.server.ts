import { apiRequest } from '../http/apiClient';
import type { CreateOrderRequest, CreateOrderResponse } from '../../types/api';

/** Requires a customer JWT. Will 401 until mobile auth is wired. */
export const checkoutOrder = async (data: CreateOrderRequest) =>
  apiRequest<CreateOrderResponse>('/orders/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const getOrder = async (id: string) =>
  apiRequest<unknown>(`/orders/${id}`);

export const getMyOrders = async () => apiRequest<unknown[]>('/me/orders');
