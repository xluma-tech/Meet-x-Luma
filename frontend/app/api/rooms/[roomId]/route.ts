import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL is not set! Requests will fail.');
}

console.log('✅ Rooms API Route - Backend URL:', BACKEND_URL);

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }

    const { roomId } = params;
    const response = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Room not found' },
          { status: 404 }
        );
      }
      throw new Error('Failed to fetch room');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    );
  }
}
