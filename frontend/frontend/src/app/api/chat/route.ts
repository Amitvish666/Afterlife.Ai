import { NextRequest, NextResponse } from 'next/server';
import { getPersonaById, getMemoriesForPersona } from '../auth/db';
import { getAIResponse } from '../utils/ai';
import { detectEmotion, cleanText } from '../utils/text';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { persona_id, message, conversation_history = [], language = 'en' } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Get persona info from Supabase
    let persona: any = { title: 'Friend', relation: 'best friend', description: 'A close, supportive friend.' };
    if (persona_id) {
      const found = await getPersonaById(persona_id);
      if (found) persona = found;
    }

    // Get memories from Supabase
    const memories = persona_id ? await getMemoriesForPersona(persona_id) : [];

    // Get AI response (Ollama only)
    const aiResult = await getAIResponse(message, conversation_history, persona, memories, language);

    if (!aiResult) {
      return NextResponse.json(
        { 
          error: 'AI service unavailable',
          message: 'The AI is currently unavailable. Please ensure Ollama is running and accessible.'
        }, 
        { status: 503 }
      );
    }

    const cleanedResponse = cleanText(aiResult.content);
    const emotion = detectEmotion(aiResult.content);

    return NextResponse.json({
      response: cleanedResponse,
      emotion: emotion,
      conversation_id: persona_id,
      tokens_used: Math.floor((message.length + cleanedResponse.length) / 4),
      source: aiResult.provider
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const persona_id = searchParams.get('persona_id');
  
  if (!persona_id) {
    return NextResponse.json({ error: 'Persona ID required' }, { status: 400 });
  }
  
  return NextResponse.json({ conversation: [] });
}
