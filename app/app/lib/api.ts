/**
 * API utility for making authenticated requests to the backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

/**
 * Get the default headers for API requests
 */
export function getApiHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  if (additionalHeaders) {
    const additional = additionalHeaders instanceof Headers
      ? Object.fromEntries(additionalHeaders.entries())
      : additionalHeaders;
    Object.assign(headers, additional);
  }

  return headers;
}

/**
 * Make an authenticated API request
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const headers = getApiHeaders(options.headers);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * GET request
 */
export async function apiGet(endpoint: string): Promise<Response> {
  return apiFetch(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost(endpoint: string, body?: unknown): Promise<Response> {
  return apiFetch(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function apiPut(endpoint: string, body?: unknown): Promise<Response> {
  return apiFetch(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  return apiFetch(endpoint, { method: 'DELETE' });
}

export { API_URL, API_KEY };
