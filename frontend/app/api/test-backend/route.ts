import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/config/backend';

export async function GET() {
  const backendUrl = getBackendUrl();
  
  const results = {
    backendUrl,
    timestamp: new Date().toISOString(),
    tests: {} as Record<string, any>
  };

  // Test 1: Check if backend URL is set
  results.tests.backendUrlSet = {
    status: backendUrl ? 'PASS' : 'FAIL',
    value: backendUrl
  };

  // Test 2: Try to reach backend health endpoint
  try {
    const healthResponse = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    results.tests.backendHealthCheck = {
      status: healthResponse.ok ? 'PASS' : 'FAIL',
      statusCode: healthResponse.status,
      data: healthResponse.ok ? await healthResponse.json() : await healthResponse.text()
    };
  } catch (error) {
    results.tests.backendHealthCheck = {
      status: 'FAIL',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 3: Try to reach backend events endpoint
  try {
    const eventsResponse = await fetch(`${backendUrl}/api/events`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    results.tests.backendEventsCheck = {
      status: eventsResponse.ok ? 'PASS' : 'FAIL',
      statusCode: eventsResponse.status,
      data: eventsResponse.ok ? await eventsResponse.json() : await eventsResponse.text()
    };
  } catch (error) {
    results.tests.backendEventsCheck = {
      status: 'FAIL',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return NextResponse.json(results, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
