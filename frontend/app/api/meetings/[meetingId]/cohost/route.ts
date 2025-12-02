import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { participantAuth0Id } = body;

    // Await params in Next.js 15+
    const { meetingId } = await params;

    // Call backend API to assign cohost
    const response = await fetch(`${BACKEND_API_URL}/api/meetings/${meetingId}/cohost`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostAuth0Id: session.user.sub,
        participantAuth0Id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Error assigning cohost:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
