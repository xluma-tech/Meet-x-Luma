import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl() {
  const url = process.env.BACKEND_URL;
  if (!url) {
    throw new Error('BACKEND_URL environment variable is not set');
  }
  console.log('Rooms API Route - Backend URL:', url);
  return url;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/rooms/${roomId}`, {
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
