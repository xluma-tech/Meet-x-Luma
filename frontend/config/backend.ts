// Backend configuration
// Uses NEXT_PUBLIC_API_URL from Vercel environment variables

export const getBackendUrl = (): string => {
  // Priority order:
  // 1. NEXT_PUBLIC_API_URL (set in Vercel)
  // 2. Hardcoded production URL (fallback)
  
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const fallbackUrl = 'https://meet-x-luma.onrender.com';
  
  const url = envUrl || fallbackUrl;
  
  console.log('Backend URL Config:', {
    fromEnv: envUrl || 'not set',
    fallback: fallbackUrl,
    using: url
  });
  
  return url;
};

export const config = {
  backendUrl: getBackendUrl(),
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'https://meet-x-luma.onrender.com',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://meet.xluma.in',
};
