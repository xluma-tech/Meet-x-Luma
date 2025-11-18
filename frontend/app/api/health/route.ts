import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function GET() {
  try {
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
