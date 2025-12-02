import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4000';

export async function POST() {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Call backend API to sync user
    const response = await fetch(`${BACKEND_API_URL}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth0Id: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
      }),
    });

    if (!response.ok) {
      throw new Error('Backend sync failed');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
