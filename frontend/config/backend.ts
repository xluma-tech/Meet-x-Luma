// Backend configuration
// This file provides fallback values if environment variables are not set

export const getBackendUrl = (): string => {
  // Priority order:
  // 1. Environment variable (set in Vercel/deployment platform)
  // 2. Hardcoded production URL (fallback)
  
  const envUrl = process.env.BACKEND_URL;
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
