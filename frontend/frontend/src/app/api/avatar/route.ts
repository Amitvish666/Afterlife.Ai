import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_975d3d709f480e86c9bb331bf41a980a756ce0fc5aeca437';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// D-ID API configuration
const DID_API_KEY = process.env.DID_API_KEY || 'cGF3YXJyYWdoYXY4NjhAZ21haWwuY29t:tgT1-wqU0z5E4qsQxa0tF';
const DID_API_URL = 'https://api.d-id.com';

// Voice ID mapping (using valid ElevenLabs voice IDs)
const VOICE_MAP: Record<string, string> = {
  'Rachel': '21m00Tcm4TlvDq8ikWAM',  // Rachel
  'Josh': '5Q2x7d8c9Y3k4L6m7n8P',    // Sample voice
  'Sam': 'o7MMXoGPdTWHf1k4jW6m',    // Sample voice
  'Anna': 'EXAVITQu4vr4xnSDxMaL',   // Sarah
  'Adam': 'pNInz6obpgDQGcFmaJgB',   // Adam
  'Sarah': 'EXAVITQu4vr4xnSDxMaL',  // Sarah
  'James': 'onwK4e9ZLuTAKqWW03F9',  // Daniel
  'Maria': 'FGY2WhTYpPnrIDTdsKH5',   // Laura
};

// Avatar image URLs for D-ID
const AVATAR_IMAGES: Record<string, string> = {
  'professional_female': 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
  'professional_male': 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
  'casual_female': 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
  'casual_male': 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
};

// Language to voice mapping
const LANGUAGE_VOICE_MAP: Record<string, string> = {
  'en': 'Rachel',
  'hi': 'Maria',
  'es': 'Maria',
  'fr': 'Sarah',
  'de': 'Anna',
  'ja': 'Rachel',
  'ko': 'Rachel',
  'pt': 'Maria',
  'zh': 'Rachel',
  'ar': 'Maria',
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const text = formData.get('text') as string | null;
    const audioFile = formData.get('audio') as File | null;
    const language = (formData.get('language') as string) || 'en';
    const voiceId = (formData.get('voice_id') as string) || 'Rachel';
    const avatarId = (formData.get('avatar_id') as string) || 'professional_female';

    // Validate input
    if (!text && !audioFile) {
      return NextResponse.json(
        { error: 'Please provide either text or an audio file' },
        { status: 400 }
      );
    }

    let audioBuffer: ArrayBuffer | null = null;

    // If audio file is provided, use it directly
    if (audioFile) {
      audioBuffer = await audioFile.arrayBuffer();
    } 
    // Otherwise, convert text to speech using ElevenLabs
    else if (text) {
      // Get the voice ID based on selected voice or language
      const selectedVoice = voiceId || LANGUAGE_VOICE_MAP[language] || 'Rachel';
      const elevenLabsVoiceId = VOICE_MAP[selectedVoice] || VOICE_MAP['Rachel'];

      console.log('Converting text to speech with voice:', elevenLabsVoiceId);

      // Call ElevenLabs API
      const ttsResponse = await fetch(
        `${ELEVENLABS_API_URL}/text-to-speech/${elevenLabsVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_flash_v2_5',
            voice_settings: {
              stability: 0.3,
              similarity_boost: 0.85,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        console.error('ElevenLabs TTS error:', errorText);
        
        // Check for rate limiting or free tier issues
        if (ttsResponse.status === 403 || errorText.includes('Free Tier')) {
          return NextResponse.json(
            { 
              error: 'Text-to-speech service is currently unavailable. The free tier has been disabled. Please try again later or use the demo mode.',
              demo: true,
              message: 'Demo mode: Avatar speaking - ' + text.substring(0, 100)
            },
            { status: 503 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to generate speech. Please try again.' },
          { status: ttsResponse.status }
        );
      }

      audioBuffer = await ttsResponse.arrayBuffer();
    }

    if (!audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to process audio' },
        { status: 500 }
      );
    }

    // Convert audio to base64
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    // Get avatar image URL
    const avatarImageUrl = AVATAR_IMAGES[avatarId] || AVATAR_IMAGES['professional_female'];

    console.log('Generating avatar video with D-ID...');

    // Call D-ID API to generate talking avatar
    const didResponse = await fetch(
      `${DID_API_URL}/talks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(DID_API_KEY).toString('base64')}`,
        },
        body: JSON.stringify({
          source_url: avatarImageUrl,
          audio_url: `data:audio/mpeg;base64,${audioBase64}`,
          driver_url: 'bank://moderation_deliberation',
          language: language,
        }),
      }
    );

    const didData = await didResponse.json();

    if (!didResponse.ok) {
      console.error('D-ID API error:', didData);
      
      // Return demo response if D-ID fails
      return NextResponse.json(
        { 
          error: 'Avatar video generation failed. Please try demo mode.',
          demo: true,
          audio_url: `data:audio/mpeg;base64,${audioBase64.substring(0, 1000)}...`,
          message: 'Audio generated but video creation failed'
        },
        { status: didResponse.status }
      );
    }

    // Return the video URL
    return NextResponse.json({
      success: true,
      video_url: didData.result_url || didData.url,
      audio_url: didData.audio_url,
      status: didData.status,
    });

  } catch (error) {
    console.error('Avatar generation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// Handle GET requests - return API info
export async function GET() {
  return NextResponse.json({
    name: 'AI Avatar API',
    version: '1.0.0',
    endpoints: {
      POST: {
        description: 'Generate AI avatar video',
        parameters: {
          text: 'string (optional) - Text to speak',
          audio: 'file (optional) - Audio file to use',
          language: 'string - Language code (en, hi, es, etc.)',
          voice_id: 'string - Voice identifier',
          avatar_id: 'string - Avatar identifier',
        },
      },
    },
    features: [
      'Text-to-speech conversion',
      'Talking avatar generation',
      'Multiple language support',
      'Voice selection',
      'Avatar selection',
    ],
  });
}
