/**
 * API utility for making authenticated requests to the backend
 * Supports both JWT tokens (preferred) and API key authentication
 * Includes automatic token refresh when tokens expire
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

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
    // Add 60 second buffer to refresh before actual expiry
    return Date.now() >= (exp * 1000) - 60000;
  } catch {
    return true;
  }
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.log('Token refresh failed, clearing auth');
        clearAuthData();
        return false;
      }

      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }
        console.log('Token refreshed successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
 * Ensure we have a valid access token, refreshing if needed
 */
async function ensureValidToken(): Promise<string | null> {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return null;
  }

  if (isTokenExpired(accessToken)) {
    console.log('Token expired, attempting refresh...');
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return getAccessToken();
    }
    return null;
  }

  return accessToken;
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
 * Get headers with token refresh if needed (async version)
 */
export async function getApiHeadersAsync(additionalHeaders?: HeadersInit): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Ensure we have a valid token, refreshing if needed
  const accessToken = await ensureValidToken();
  if (accessToken) {
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
 * Handle 401 responses - try to refresh token first
 */
async function handleUnauthorized(response: Response, url: string, options: RequestInit): Promise<Response> {
  if (response.status === 401) {
    // Try to refresh the token
    console.log('Got 401, attempting token refresh...');
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      // Retry the request with new token
      console.log('Token refreshed, retrying request...');
      const newHeaders = await getApiHeadersAsync(options.headers);
      const retryResponse = await fetch(url, {
        ...options,
        headers: newHeaders,
      });
      return retryResponse;
    } else {
      // Refresh failed, clear auth data and redirect
      clearAuthData();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        window.location.href = '/';
      }
    }
  }
  return response;
}

/**
 * Make an authenticated API request with automatic token refresh
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  // Use async version to refresh token if needed before request
  const headers = await getApiHeadersAsync(options.headers);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return handleUnauthorized(response, url, options);
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
