/**
 * API utility for handling different environments
 */

export function getApiBaseUrl(): string {
  // In browser, use relative URLs (same origin)
  if (typeof window !== 'undefined') {
    return '';
  }
  
  // Server-side: use environment variable or default
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Fallback for local development
  return 'http://localhost:3000';
}

/**
 * Fetch wrapper that handles API calls correctly for both dev and production
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  return fetch(url, options);
}
