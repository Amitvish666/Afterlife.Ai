// AI utility - Ollama ONLY. No OpenAI fallback.
// For production (Vercel), set OLLAMA_BASE_URL to a publicly accessible Ollama instance
// e.g. via ngrok: OLLAMA_BASE_URL=https://xxxx.ngrok-free.app

function getOllamaConfig(): { baseUrl: string; model: string } {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'tinyllama:latest',
  };
}

export async function getAIResponse(
  message: string,
  history: { role: string; content: string }[],
  persona: any,
  memories: any[],
  language: string = 'en'
): Promise<{ content: string; provider: string } | null> {
  const { baseUrl, model } = getOllamaConfig();

  console.log(`[AI] Using Ollama at ${baseUrl} with model ${model}`);

  // Language-specific instruction
  let languageInstruction = '';
  if (language === 'hi') {
    languageInstruction =
      '\n\nIMPORTANT: You MUST respond ONLY in Hindi (हिंदी). Write every single word in Hindi. Do NOT write anything in English or Marathi.';
  } else if (language === 'mr') {
    languageInstruction =
      '\n\nIMPORTANT: You MUST respond ONLY in Marathi (मराठी). Write every single word in Marathi script. Do NOT write anything in English or Hindi.';
  } else {
    languageInstruction = '\n\nIMPORTANT: You MUST respond ONLY in English.';
  }

  // Build system prompt
  let systemPrompt = `You are ${persona.title}, a ${persona.relation || 'loved one'}.
${persona.description ? `About them: ${persona.description}` : ''}

You are warm, loving, and conversational. Key traits:
- Be yourself, don't sound like an AI
- Show genuine care and affection
- Keep responses VERY SHORT - just 1-2 sentences like talking to family
- NEVER explain what you mean, just say it naturally
- Never say you're an AI or bot${languageInstruction}

Remember: You are talking to someone you care about. Be present and loving.`;

  // Add memories context (limit to last 5)
  if (memories.length > 0) {
    const memoryTexts = memories.slice(-5).map((m) => m.content);
    systemPrompt += `\n\nShared memories:\n${memoryTexts.join('\n')}`;
  }

  // Truncate history to last 10 messages to prevent token overflow
  const truncatedHistory = history.slice(-10);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...truncatedHistory.map((msg) => ({ role: msg.role, content: msg.content })),
  ];

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true', // Bypasses localtunnel warning screen
      'ngrok-skip-browser-warning': 'true', // Bypasses ngrok warning screen
    };

    const apiKey = process.env.OLLAMA_API_KEY;
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log('[AI] Calling Ollama...');
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          num_predict: 250,
          temperature: 0.7,
          num_ctx: 4096,
        },
      }),
      signal: AbortSignal.timeout(45000), // 45s timeout
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.message?.content || '';
      console.log('[AI] Ollama responded successfully');
      return { content, provider: 'ollama' };
    }

    const errorText = await response.text();
    console.error(`[AI] Ollama HTTP ${response.status}:`, errorText);
    return null;
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      console.error('[AI] Ollama timed out after 45s');
    } else {
      console.error('[AI] Ollama error:', error.message);
    }
    return null;
  }
}
