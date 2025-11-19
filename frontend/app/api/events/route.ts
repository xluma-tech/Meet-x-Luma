import { NextRequest, NextResponse } from 'next/server';

// Get backend URL - must be set in Vercel environment variables
const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL is not set! Requests will fail.');
}

console.log('✅ Events API Route - Backend URL:', BACKEND_URL);

export async function GET() {
  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }

    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_URL) {
      throw new Error('BACKEND_URL environment variable is not configured');
    }

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
