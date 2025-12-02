import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, meetingId } = body;

    if (!name || !meetingId) {
      return NextResponse.json(
        { error: 'Name and meeting ID are required' },
        { status: 400 }
      );
    }

    // Call backend API to create guest session
    const response = await fetch(`${BACKEND_API_URL}/api/guest/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, meetingId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Error creating guest session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
