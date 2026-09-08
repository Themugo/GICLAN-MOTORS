import { api } from './httpClient';

export class HttpRequestError extends Error {
  status?: number;
  responseData?: unknown;
  constructor(message: string, status?: number, responseData?: unknown) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = status;
    this.responseData = responseData;
  }
}

export interface HttpRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

/** Fetch-shaped adapter over KAYAD's single Axios transport. Service modules
 * use this only to preserve their existing request/response contracts while
 * inheriting the canonical credentials, timeout, CSRF and auth-expiry rules. */
export async function request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers, params } = options;
  const configuredApiUrl = String(import.meta.env.VITE_API_URL || '');
  const requestPath = !configuredApiUrl && /^\/api(?:\/|$)/.test(path)
    ? path.slice(4) || '/'
    : path;

  try {
    const response = await api.request<T>({
      url: requestPath,
      method,
      data: body,
      headers,
      params,
    });
    return response.data;
  } catch (error) {
    if (error instanceof HttpRequestError) throw error;
    const axiosError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
      isAxiosError?: boolean;
    };
    if (axiosError?.isAxiosError || axiosError?.response) {
      const data = axiosError.response?.data;
      const responseMessage = (data as { message?: unknown } | undefined)?.message;
      const message = typeof responseMessage === 'string'
        ? responseMessage
        : axiosError.message || 'Request failed.';
      throw new HttpRequestError(message, axiosError.response?.status, data);
    }
    throw new HttpRequestError('Unable to reach KAYAD servers. Please check your connection and try again.');
  }
}

/** Backwards-compatible name retained for older service modules. */
export const httpRequest = request;
