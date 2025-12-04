/**
 * API utility for making authenticated requests to the backend
 * Supports both JWT tokens (preferred) and API key authentication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

/**
 * Get access token from localStorage
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('access_token');
}

/**
 * Get refresh token from localStorage
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('refresh_token');
}

/**
 * Check if a JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return false;
    // Add 30 second buffer
    return Date.now() >= (exp * 1000) - 30000;
  } catch {
    return true;
  }
}

/**
 * Clear auth data from localStorage
 */
export function clearAuthData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
}

/**
 * Get the default headers for API requests
 * Prefers JWT token over API key if available
 */
export function getApiHeaders(additionalHeaders?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Try to use JWT token first (preferred for browser requests)
  const accessToken = getAccessToken();
  if (accessToken && !isTokenExpired(accessToken)) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else if (API_KEY) {
    // Fall back to API key if no valid token
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
 * Handle 401 responses by clearing auth data
 */
async function handleUnauthorized(response: Response): Promise<Response> {
  if (response.status === 401) {
    // Token is invalid or expired, clear auth data
    clearAuthData();
    // Optionally redirect to login
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
      window.location.href = '/';
    }
  }
  return response;
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

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return handleUnauthorized(response);
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
