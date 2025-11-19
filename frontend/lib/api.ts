// API configuration utility
// Handles both client-side and server-side API calls

/**
 * Get the backend API URL
 * - Client-side: uses NEXT_PUBLIC_API_URL
 * - Server-side: uses API_URL (if set) or NEXT_PUBLIC_API_URL
 */
export function getApiUrl(): string {
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    // Server-side: prefer API_URL, fallback to NEXT_PUBLIC_API_URL
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://meet-x-luma.onrender.com';
  } else {
    // Client-side: use NEXT_PUBLIC_API_URL
    return process.env.NEXT_PUBLIC_API_URL || 'https://meet-x-luma.onrender.com';
  }
}

/**
 * Create a fetch wrapper with the correct base URL
 */
export async function apiFetch(endpoint: string, options?: RequestInit) {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint}`;
  
  console.log(`[API] ${options?.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`[API Error] ${response.status}:`, error);
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}
