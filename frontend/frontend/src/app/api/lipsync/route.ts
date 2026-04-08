import { NextResponse } from 'next/server';

/**
 * Lip Sync API Route
 * 
 * Frontend endpoint that:
 * 1. Accepts text and voice_id
 * 2. Calls backend to generate audio and phoneme timeline
 * 3. Returns audio URL and timeline for frontend animation
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, voice_id, language = 'en' } = body;
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    // Call backend API
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/lipsync/lipsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_id,
        language,
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to generate lip sync', details: error },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Lip sync API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Test endpoint
  return NextResponse.json({
    status: 'ok',
    message: 'Lip sync API is working',
  });
}
