import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL is not set! Requests will fail.');
}

console.log('✅ Health API Route - Backend URL:', BACKEND_URL);

export async function GET() {
  try {
    if (!BACKEND_URL) {
      return NextResponse.json(
        {
          frontend: {
            status: 'ok',
            timestamp: new Date().toISOString(),
          },
          backend: {
            status: 'error',
            message: 'BACKEND_URL not configured',
          },
        },
        { status: 503 }
      );
    }

    // Check backend health
    const backendResponse = await fetch(`${BACKEND_URL}/health`, {
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
