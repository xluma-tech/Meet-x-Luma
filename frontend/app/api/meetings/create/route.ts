import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';

export async function POST(req: NextRequest) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, scheduledTime } = body;

    // Call backend API to create meeting
    const response = await fetch(`${BACKEND_API_URL}/api/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth0Id: session.user.sub,
        title,
        description,
        scheduledTime,
      }),
    });

    if (!response.ok) {
      throw new Error('Backend request failed');
    }

    const data = await response.json();
    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
