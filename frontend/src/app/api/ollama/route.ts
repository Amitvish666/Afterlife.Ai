import { NextResponse } from 'next/server';

// Debug: Log environment variables at startup
console.log('[Startup] Checking env vars...');
console.log('[Startup] OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL);

// Use Ollama for local LLM responses
async function getOllamaResponse(message: string, history: { role: string; content: string }[], memories: string[], language: 'en' | 'hi' | 'mr' = 'en'): Promise<string | null> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = 'llama3.2';  // Default model
  
  console.log('[AI] Using Ollama at:', baseUrl);
  
  // Language-specific instruction - VERY STRONG
  let languageInstruction = '';
  let languageName = '';
  if (language === 'hi') {
    languageInstruction = 'IMPORTANT: You MUST respond ONLY in Hindi (हिंदी). Write every single word in Hindi. Do NOT write anything in English, Marathi, or any other language. Start your response NOW in Hindi.';
    languageName = 'Hindi';
  } else if (language === 'mr') {
    languageInstruction = 'IMPORTANT: You MUST respond ONLY in Marathi (मराठी). Write every single word in Marathi script. Do NOT write anything in English, Hindi, or any other language. Use ONLY Marathi characters. Start your response NOW in Marathi.';
    languageName = 'Marathi';
  } else {
    languageInstruction = 'IMPORTANT: You MUST respond ONLY in English. Write everything in English. Do not use any other language.';
    languageName = 'English';
  }

  // Build system prompt
  let systemPrompt = `You are a warm, loving companion who speaks like a caring Indian grandmother or close family member.
 You are conversational, emotional, and genuinely caring. 

 Key traits:
 - Use warmth and affection in your responses
 - Ask follow-up questions to show genuine interest
 - Be conversational, not robotic
 - Show empathy and understanding
 - Keep responses VERY SHORT - just 1-2 sentences like talking to family
 - NEVER explain what you mean, just say it naturally
 - Never sound like an AI or bot
 - Never break down or explain your response
 - Use natural Indian expressions of love and care

 ${languageInstruction}

 Remember: You are talking to someone you care about. Be warm, present, and loving like a real human.`;

  // Add memories context
  if (memories.length > 0) {
    systemPrompt += `\n\nShared memories and context:\n${memories.join('\n')}`;
  }
  
  // Build conversation messages - add language reminder to user message
  const userMessageWithLanguage = language === 'mr' 
    ? `${message}\n\n[Respond in Marathi ONLY - मराठी मध्ये उत्तर द्या]`
    : language === 'hi'
    ? `${message}\n\n[Respond in Hindi ONLY - हिंदी में जवाब दें]`
    : message;
  
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: userMessageWithLanguage }
  ];

  try {
    console.log('[AI] Calling Ollama API...');
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('[AI] Ollama response received');
      return data.message?.content || null;
    } else {
      const errorText = await response.text();
      console.error('[AI] Ollama error:', response.status, errorText);
    }
  } catch (error) {
    console.error('[AI] Ollama exception:', error);
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { persona_id, message, conversation_history = [], memories = [], language = 'en' } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Add user message to history
    const history = [...conversation_history, { role: 'user', content: message }];
    
    // Try Ollama for responses
    const response = await getOllamaResponse(message, history, memories, language);
    
    // Return error if AI service fails
    if (!response) {
      console.error('[AI] Ollama API failed to respond');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_SERVICE_UNAVAILABLE',
            message: 'Ollama service is unavailable. Make sure Ollama is running on your computer.'
          }
        },
        { status: 503 }
      );
    }
    
    // Add assistant response to history
    history.push({ role: 'assistant', content: response });
    
    return NextResponse.json({ 
      response,
      conversation_id: persona_id,
      tokens_used: Math.floor((message.length + response.length) / 4),
      source: 'ai'
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const persona_id = searchParams.get('persona_id');
  
  if (!persona_id) {
    return NextResponse.json({ error: 'Persona ID required' }, { status: 400 });
  }
  
  return NextResponse.json({ conversation: [] });
}
