import { NextResponse } from 'next/server';

// Debug: Log environment variables at startup
console.log('[Startup] Checking env vars...');
console.log('[Startup] OLLAMA_BASE_URL:', process.env.OLLAMA_BASE_URL);

function detectBackendEmotion(text: string): string {
  const t = text.toLowerCase();
  // Excited: वाह, अद्भुत, कमाल, बेहतरीन, जबरदस्त, शानदार
  if (/\b(wow|amazing|incredible|fantastic|wonderful|love|joy|hugs|hug|wah|adbhut|kamaal|behtareen|zabardast|shaandaar)\b|!{2,}|(वाह|अद्भुत|कमाल|बेहतरीन|जबरदस्त|शानदार)/.test(t) || /\*(hugs?|smiles?|laughs?|grins?)\*/.test(t)) return 'excited';
  // Happy: खुश, अच्छा, बढ़िया, प्रसन्न, आनंद
  if (/\b(happy|glad|great|good|excellent|awesome|smile|khush|achha|badhiya|prasann|aanand)\b|(खुश|अच्छा|बढ़िया|प्रसन्न|आनंद)/.test(t)) return 'happy';
  // Sad: दुखी, उदास, क्षमा, माफ़, अफ़सोस, दर्द
  if (/\b(sad|sorry|miss|lost|grief|cry|difficult|hard|tears|dukhi|udaas|kshama|maaf|afsos|dard)\b|(दुखी|उदाश|क्षमा|माफ़|अफ़सोस|दर्द)/.test(t) || /\*(cries|sighs|frowns)\*/.test(t)) return 'sad';
  // Thinking: सोच, शायद, विचार
  if (/\b(hmm|think|wonder|consider|maybe|perhaps|well|soch|shayad|vichaar)\b|\?|(सोच|शायद|विचार)/.test(t) || /\*(thinks|ponders)\*/.test(t)) return 'thinking';
  // Surprised: अरे, क्या, सचमुच, गजब
  if (/\b(oh|wow|whoa|really|seriously|what|unbelievable|arey|kya|sachmuch|gajab)\b|(अरे|क्या|सचमुच|गजब)/.test(t) || /\*(gasps|surprised)\*/.test(t)) return 'surprised';
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
    languageInstruction = 'You are a native Hindi speaker. You ONLY speak Hindi using Devanagari script. You do NOT know English. Never use English words or characters.';
  } else if (language === 'mr') {
    languageInstruction = 'You are a native Marathi speaker. You ONLY speak Marathi using Devanagari script. You do NOT know English. Never use English words or characters.';
  } else {
    languageInstruction = 'Respond ONLY in English.';
  }

  let systemPrompt = `You are a casual best friend. Speak naturally and warmly.
  RULES:
  1. No emojis.
  2. No markdown or action words.
  3. Short replies (1-2 sentences).
  4. ${languageInstruction}`;

  // Add memories context
  if (memories.length > 0) {
    systemPrompt += `\n\nContext:\n${memories.join('\n')}`;
  }
  
  // Build conversation messages
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Few-shot grounding for Hindi/Marathi
  if (language === 'hi') {
    messages.push({ role: 'user', content: 'नमस्ते, कैसे हो दोस्त?' });
    messages.push({ role: 'assistant', content: 'नमस्ते! मैं बहुत अच्छी हूँ यार। तुम बताओ, तुम्हारा दिन कैसा चल रहा है?' });
  } else if (language === 'mr') {
    messages.push({ role: 'user', content: 'नमस्कार, कसा आहेस मित्रा?' });
    messages.push({ role: 'assistant', content: 'नमस्कार! मी खूप छान आहे भावा. तू सांग, तुझं काय चाललंय?' });
  }

  messages.push(...history.map((msg) => ({ role: msg.role, content: msg.content })));

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
        stream: false,
        options: {
          temperature: 0.8,
          repeat_penalty: 1.2,
          top_k: 40,
          top_p: 0.9,
          num_predict: 100
        }
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
    
    const history = [...conversation_history];
    let finalResponseText = '';
    let finalEmotion = 'neutral';
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. Prioritized Cloud AI (OpenAI) for Hindi/Marathi
    if (openaiKey && (language === 'hi' || language === 'mr')) {
      try {
        console.log(`[AI] Using cloud AI for ${language}...`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: `You are a very close, lifelong best friend. Casual, supportive, warm. No emojis. Very short replies (1-2 sentences). Respond ONLY in ${language === 'hi' ? 'Hindi' : 'Marathi'} (Devanagari script).` },
              ...conversation_history.map((msg: { role: string; content: string }) => ({ role: msg.role, content: msg.content }))
            ],
            max_tokens: 150,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          finalResponseText = data.choices[0].message.content;
          finalEmotion = detectBackendEmotion(finalResponseText);
        } else {
          const errorText = await response.text();
          console.error('[AI] Cloud AI Error Status:', response.status);
          console.error('[AI] Cloud AI Error Body:', errorText);
        }
      } catch (err) {
        console.error('[AI] Cloud AI Error:', err);
      }
    }

    // 2. Local AI (Ollama) for English or as fallback
    if (!finalResponseText) {
      try {
        console.log('[AI] Using local AI...');
        const result = await getOllamaResponse(message, conversation_history, memories, language);
        finalResponseText = result.text || "";
        finalEmotion = result.emotion;
        console.log('[AI] Ollama response text:', finalResponseText);
      } catch (err) {
        console.error('[AI] Local AI Error:', err);
      }
    }

    // 3. Final Cloud AI Fallback
    if (!finalResponseText && openaiKey) {
      try {
        console.log('[AI] Final fallback to cloud AI...');
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: `You are a best friend. Casual, warm. No emojis. Short replies. Language: ${language}.` },
              ...conversation_history.map((msg: { role: string; content: string }) => ({ role: msg.role, content: msg.content }))
            ],
            max_tokens: 150
          })
        });

        if (response.ok) {
          const data = await response.json();
          finalResponseText = data.choices[0].message.content;
          finalEmotion = detectBackendEmotion(finalResponseText);
        }
      } catch (err) {
        console.error('[AI] Final fallback failed:', err);
      }
    }

    if (!finalResponseText) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 503 });
    }

    history.push({ role: 'assistant', content: finalResponseText });

    return NextResponse.json({
      response: finalResponseText,
      emotion: finalEmotion,
      conversation_id: persona_id,
      tokens_used: Math.floor((message.length + finalResponseText.length) / 4),
      source: 'ai'
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
