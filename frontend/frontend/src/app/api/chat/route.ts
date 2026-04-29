import { NextResponse } from 'next/server';

// Debug: Log environment variables at startup
console.log('[Startup] Checking env vars...');
console.log('[Startup] OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL);

function detectBackendEmotion(text: string): string {
  const t = text.toLowerCase();
  if (/\b(wow|amazing|incredible|fantastic|wonderful|love|joy|hugs|hug)\b|!{2,}/.test(t) || /\*(hugs?|smiles?|laughs?|grins?)\*/.test(t)) return 'excited';
  if (/\b(happy|glad|great|good|excellent|awesome|smile)\b/.test(t)) return 'happy';
  if (/\b(sad|sorry|miss|lost|grief|cry|difficult|hard|tears)\b/.test(t) || /\*(cries|sighs|frowns)\*/.test(t)) return 'sad';
  if (/\b(hmm|think|wonder|consider|maybe|perhaps|well)\b|\?/.test(t) || /\*(thinks|ponders)\*/.test(t)) return 'thinking';
  if (/\b(oh|wow|whoa|really|seriously|what|unbelievable)\b/.test(t) || /\*(gasps|surprised)\*/.test(t)) return 'surprised';
  return 'neutral';
}

// Use Ollama for local LLM responses
async function getOllamaResponse(message: string, history: { role: string; content: string }[], memories: string[], language: 'en' | 'hi' | 'mr' = 'en'): Promise<{text: string | null, emotion: string}> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = 'llama2';  
  
  console.log('[AI] Using Ollama at:', baseUrl);
  
  // Language-specific instruction - VERY STRONG
  let languageInstruction = '';
  // ... omitting language name since it isn't strictly needed for the prompt
  if (language === 'hi') {
    languageInstruction = 'IMPORTANT: You MUST respond ONLY in Hindi (हिंदी). Do NOT write anything in English. Start now in Hindi.';
  } else if (language === 'mr') {
    languageInstruction = 'IMPORTANT: You MUST respond ONLY in Marathi (मराठी). Do NOT write anything in English. Start now in Marathi.';
  } else {
    languageInstruction = 'IMPORTANT: You MUST respond ONLY in English.';
  }

  let systemPrompt = `You are a very close, lifelong best friend. You are super casual, supportive, and talk with total familiarity, like we've been through everything together.
DO NOT break character. You are NOT an AI or a virtual assistant.

CRITICAL RULES:
1. Speak completely naturally, like we're just hanging out or on a quick call. Use "hey", "listen", "buddy", "mate", or similar friendly terms if it fits.
2. Use casual language and slang if appropriate, but stay respectful and loving.
3. DO NOT use ANY emojis (no 😊, ❤️, etc.).
4. DO NOT use any markdown, asterisks, or action words (no *smiles*, *sighs*, **bold**).
5. DO NOT give generic or typical AI greetings. Talk like you've known me forever.
6. React DIRECTLY to what I say. If I'm happy, celebrate with me. If I'm down, be my rock.
7. Keep responses very short, 1 or 2 sentences max.

${languageInstruction}`;

  // Add memories context
  if (memories.length > 0) {
    systemPrompt += `\n\nContext:\n${memories.join('\n')}`;
  }
  
  // Build conversation messages
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((msg, index) => {
      if (index === history.length - 1 && msg.role === 'user') {
        const langTag = language === 'mr' ? ' [Respond in Marathi ONLY]' : language === 'hi' ? ' [Respond in Hindi ONLY]' : '';
        return { role: msg.role, content: msg.content + langTag };
      }
      return { role: msg.role, content: msg.content };
    })
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
      let text = data.message?.content || '';
      // Extract emotion before stripping
      const emotion = detectBackendEmotion(text);

      // Clean up the text: remove emojis, asterisks, underscores, brackets
      text = text.replace(/\*[^*]+\*/g, ''); // Remove actions like *hugs* or *smiles*
      text = text.replace(/\([^)]+\)/g, ''); // Remove actions like (hugs) or (smiles)
      text = text.replace(/\[[^\]]+\]/g, ''); // Remove [smiles]
      text = text.replace(/[*_~`#^]/g, ''); // Remove any remaining Markdown formatting
      
      // Bypass TS compiler check for 'u' flag by using RegExp constructor
      const emojiRegex = new RegExp('[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]', 'gu');
      text = text.replace(emojiRegex, ''); // Remove emojis
      
      return { text: text.trim() || null, emotion };
    } else {
      const errorText = await response.text();
      console.error('[AI] Ollama error:', response.status, errorText);
    }
  } catch (error) {
    console.error('[AI] Ollama exception:', error);
  }

  return { text: null, emotion: 'neutral' };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { persona_id, message, conversation_history = [], memories = [], language = 'en' } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // User message is already the last item in conversation_history array from the frontend.
    // If not, we would add it, but page.tsx explicitly adds it before sending.
    const history = [...conversation_history];
    
    // Try Ollama for responses first
    let response = await getOllamaResponse(message, history, memories, language);
    let finalResponseText = response.text;
    let finalEmotion = response.emotion;
    
    // If Ollama fails, try OpenAI
    if (!finalResponseText) {
      console.log('[AI] Ollama failed, trying OpenAI...');
      try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You are a very close, lifelong best friend. You are super casual, supportive, and speak with total familiarity and affection. DO NOT use emojis or markdown formatting. Keep responses very short, 1 or 2 sentences max.' },
                ...history.map(msg => ({ role: msg.role, content: msg.content }))
              ],
              max_tokens: 150
            })
          });
          
          if (openaiResponse.ok) {
            const data = await openaiResponse.json();
            let openaiText = data.choices?.[0]?.message?.content || '';
            
            finalEmotion = detectBackendEmotion(openaiText);

            openaiText = openaiText.replace(/\*[^*]+\*/g, ''); 
            openaiText = openaiText.replace(/\([^)]+\)/g, ''); 
            openaiText = openaiText.replace(/\[[^\]]+\]/g, ''); 
            openaiText = openaiText.replace(/[*_~`#^]/g, ''); 
            const emojiRegex = new RegExp('[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]', 'gu');
            openaiText = openaiText.replace(emojiRegex, ''); 
            
            finalResponseText = openaiText.trim() || null;
            console.log('[AI] OpenAI response received');
          }
        }
      } catch (openaiError) {
        console.error('[AI] OpenAI fallback error:', openaiError);
      }
    }
    
    // Return error if both services fail
    if (!finalResponseText) {
      console.error('[AI] Both Ollama and OpenAI failed');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AI_SERVICE_UNAVAILABLE',
            message: 'AI service is unavailable. Please ensure Ollama is running with llama2 model, or check your OpenAI API key.'
          }
        },
        { status: 503 }
      );
    }
    
    // Add assistant response to history
    history.push({ role: 'assistant', content: finalResponseText });
    
    return NextResponse.json({ 
      response: finalResponseText,
      emotion: finalEmotion,
      conversation_id: persona_id,
      tokens_used: Math.floor((message.length + finalResponseText.length) / 4),
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
