// Backend configuration
// Handles both client-side and server-side API calls

/**
 * Get the backend API URL
 * - Client-side: uses NEXT_PUBLIC_API_URL
 * - Server-side: uses API_URL (if set) or NEXT_PUBLIC_API_URL
 */
export const getBackendUrl = (): string => {
  const isServer = typeof window === 'undefined';
  
  if (isServer) {
    // Server-side (API routes): prefer API_URL, fallback to NEXT_PUBLIC_API_URL
    const url =  process.env.NEXT_PUBLIC_API_URL || 'https://meet-x-luma.onrender.com';
    console.log('[Backend Config - Server]', {
      API_URL: process.env.API_URL || 'not set',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
      using: url
    });
    return url;
  } else {
    // Client-side (browser): use NEXT_PUBLIC_API_URL
    const url = process.env.NEXT_PUBLIC_API_URL || 'https://meet-x-luma.onrender.com';
    console.log('[Backend Config - Client]', {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
      using: url
    });
    return url;
  }
};

export const config = {
  backendUrl: getBackendUrl(),
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'https://meet-x-luma.onrender.com',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://meet.xluma.in',
};
