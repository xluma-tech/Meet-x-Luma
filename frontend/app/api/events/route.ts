import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/config/backend';

export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    console.log('📡 Fetching events from:', `${backendUrl}/api/events`);
    
    const response = await fetch(`${backendUrl}/api/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched events:', data.length || 0, 'events');
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch events',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const body = await request.json();
    console.log('📡 Creating event at:', `${backendUrl}/api/events`);

    const response = await fetch(`${backendUrl}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Successfully created event:', data.id);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating event:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create event',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
