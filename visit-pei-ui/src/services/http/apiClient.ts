import { buildApiUrl, type QueryParams } from './buildUrl';

type ApiErrorCode = 'CONFIG_ERROR' | 'HTTP_ERROR' | 'NETWORK_ERROR';

type ApiRequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: QueryParams;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;

export class ApiClientError extends Error {
  code: ApiErrorCode;
  details?: unknown;
  status?: number;

  constructor(
    message: string,
    code: ApiErrorCode,
    status?: number,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error;
  }

  return fallback;
};

export const apiRequest = async <T>(
  path: string,
  { body, headers, method = 'GET', params, timeoutMs = DEFAULT_TIMEOUT_MS }: ApiRequestOptions = {},
) => {
  let url: string;

  try {
    url = buildApiUrl(path, params);
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : 'Invalid API configuration.',
      'CONFIG_ERROR',
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
      },
      body,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new ApiClientError(
        getErrorMessage(
          payload,
          `Request failed with status ${response.status}.`,
        ),
        'HTTP_ERROR',
        response.status,
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        'The request took too long. Please try again.',
        'NETWORK_ERROR',
      );
    }

    throw new ApiClientError(
      error instanceof Error ? error.message : 'Network request failed.',
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timeoutId);
  }
};
