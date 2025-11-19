import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/config/backend';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const backendUrl = getBackendUrl();
    const { roomId } = await params;
    
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
