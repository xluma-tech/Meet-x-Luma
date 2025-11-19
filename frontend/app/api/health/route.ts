import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/config/backend';

export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    
    // Check backend health
    const backendResponse = await fetch(`${backendUrl}/health`, {
      method: 'GET',
    });

    const backendHealth = backendResponse.ok
      ? await backendResponse.json()
      : { status: 'error', message: 'Backend unreachable' };

    // Return combined health status
    return NextResponse.json({
      frontend: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      backend: backendHealth,
      config: {
        backendUrl
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        frontend: {
          status: 'ok',
          timestamp: new Date().toISOString(),
        },
        backend: {
          status: 'error',
          message: 'Backend unreachable',
        },
      },
      { status: 503 }
    );
  }
}
