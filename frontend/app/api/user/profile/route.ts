import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';

export async function GET() {
  try {
    const session = await auth0.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Call backend API to get user profile
    const response = await fetch(`${BACKEND_API_URL}/api/auth/user/${session.user.sub}`);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw new Error('Backend request failed');
    }

    const data = await response.json();
    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
