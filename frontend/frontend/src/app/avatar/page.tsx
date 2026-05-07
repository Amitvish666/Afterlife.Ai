'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Mic, 
  Play, 
  Pause, 
  Loader2, 
  ArrowLeft,
  Settings,
  Volume2,
  MessageCircle,
  Send,
  X,
  Globe,
  Sparkles,
  Brain,
  Heart,
  Zap,
  Coffee,
  ChevronDown,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import nextDynamic from 'next/dynamic';
import type { Emotion } from '@/components/AvatarCanvas';

// Dynamic import for AvatarCanvas (SSR disabled - uses browser APIs)
const AvatarCanvas = nextDynamic(() => import('@/components/AvatarCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-surface-900/50 rounded-2xl">
      <Loader2 className="w-8 h-8 animate-spin text-beyond-purple" />
    </div>
  ),
});

// ─── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',    flag: '🇮🇳' },
  { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     flag: '🇫🇷' },
  { code: 'de', name: 'German',     flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     flag: '🇰🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic',     flag: '🇸🇦' },
];

const EMOTION_BUTTONS: { emotion: Emotion; label: string; icon: React.ReactNode; color: string }[] = [
  { emotion: 'neutral',   label: 'Neutral',   icon: <Coffee className="w-4 h-4" />,   color: 'rgba(100,120,140,0.3)' },
  { emotion: 'happy',     label: 'Happy',     icon: <Heart className="w-4 h-4" />,    color: 'rgba(240,120,100,0.3)' },
  { emotion: 'excited',   label: 'Excited',   icon: <Zap className="w-4 h-4" />,      color: 'rgba(200,160,50,0.3)'  },
  { emotion: 'thinking',  label: 'Thinking',  icon: <Brain className="w-4 h-4" />,    color: 'rgba(100,80,200,0.3)'  },
  { emotion: 'sad',       label: 'Sad',       icon: <Sparkles className="w-4 h-4" />, color: 'rgba(80,120,200,0.3)'  },
  { emotion: 'surprised', label: 'Surprised', icon: <Sparkles className="w-4 h-4" />, color: 'rgba(60,180,120,0.3)'  },
  { emotion: 'listening', label: 'Listening', icon: <Mic className="w-4 h-4" />,      color: 'rgba(160,80,200,0.3)'  },
];

// ─── Detect emotion from text ─────────────────────────────────────────────────
function detectEmotionFromText(text: string): Emotion {
  const t = text.toLowerCase();
  // Excited: वाह, अद्भुत, कमाल, बेहतरीन, जबरदस्त, शानदार
  if (/\b(wow|amazing|incredible|fantastic|wonderful|love|joy|wah|adbhut|kamaal|behtareen|zabardast|shaandaar)\b|!{2,}|(वाह|अद्भुत|कमाल|बेहतरीन|जबरदस्त|शानदार)/.test(t)) return 'excited';
  // Happy: खुश, अच्छा, बढ़िया, प्रसन्न, आनंद
  if (/\b(happy|glad|great|good|excellent|awesome|smile|khush|achha|badhiya|prasann|aanand)\b|(खुश|अच्छा|बढ़िया|प्रसन्न|आनंद)/.test(t))              return 'happy';
  // Sad: दुखी, उदास, क्षमा, माफ़, अफ़सोस, दर्द
  if (/\b(sad|sorry|miss|lost|grief|cry|difficult|hard|dukhi|udaas|kshama|maaf|afsos|dard)\b|(दुखी|उदाश|क्षमा|माफ़|अफ़सोस|दर्द)/.test(t))               return 'sad';
  // Thinking: सोच, शायद, विचार
  if (/\b(hmm|think|wonder|consider|maybe|perhaps|well|soch|shayad|vichaar)\b|\?|(सोच|शायद|विचार)/.test(t))            return 'thinking';
  // Surprised: अरे, क्या, सचमुच, गजब
  if (/\b(oh|wow|whoa|really|seriously|what|unbelievable|arey|kya|sachmuch|gajab)\b|(अरे|क्या|सचमुच|गजब)/.test(t))             return 'surprised';
  return 'neutral';
}

// ─── Main page ────────────────────────────────────────────────────────────────
function AvatarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const personaId = searchParams.get('persona');

  // State
  const [text, setText] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant'; content: string}[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const [manualEmotion, setManualEmotion] = useState<Emotion | null>(null);

  // Settings
  const [language, setLanguage] = useState('en');
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'realtime' | 'hybrid'>('realtime');
  const [showChat, setShowChat] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [wordTrigger, setWordTrigger] = useState(0);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Init speech synthesis ref
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Emotion auto-detection
  const displayEmotion = manualEmotion ?? currentEmotion;

  // ─── Speech synthesis ───────────────────────────────────────────────────────
  const speakText = (textToSpeak: string) => {
    if (!textToSpeak.trim()) {
      setError('Please enter some text to speak');
      return;
    }
    const synth = synthRef.current;
    if (!synth) { setError('Speech synthesis not supported'); return; }

    synth.cancel();
    setError(null);
    // setIsTalking(true); // Removed to prevent premature mouth movement before onstart
    setManualEmotion(null);
    setCurrentEmotion(detectEmotionFromText(textToSpeak));

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN',
      'zh': 'zh-CN',
      'pt': 'pt-BR',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA'
    };
    utterance.lang = langMap[language] || language;
    utterance.rate = 1.0;
    utterance.pitch = 1.05; 

    // Prefer female voice for this avatar
    const voices = synth.getVoices();
    const femaleKeywords = ['female', 'woman', 'girl', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'susan', 'alice', 'ava', 'allison'];
    const langCode = language === 'zh' ? 'zh' : language === 'pt' ? 'pt' : language;

    // First: female voice in the right language
    let selectedVoice = voices.find(v =>
      v.lang.startsWith(langCode) && femaleKeywords.some(k => v.name.toLowerCase().includes(k))
    );
    // Second: any voice in right language
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith(langCode));
    // Third: any female voice
    if (!selectedVoice) selectedVoice = voices.find(v => femaleKeywords.some(k => v.name.toLowerCase().includes(k)));

    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => setIsTalking(true);
    utterance.onend   = () => { setIsTalking(false); setCurrentEmotion('neutral'); setWordTrigger(0); };
    utterance.onerror = () => { setIsTalking(false); };
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setWordTrigger(prev => prev + 1);
      }
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  };

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsTalking(false);
  };

  const startListening = async () => {
    // Stop any ongoing speech
    stopSpeaking();

    // 1. Check for API support
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { 
      setError('Your browser does not support voice input. Please use Google Chrome or Microsoft Edge.'); 
      return; 
    }

    // 2. Connectivity check
    if (!navigator.onLine) {
      setError('Voice recognition requires an internet connection.');
      return;
    }

    // 3. Hardware Probe (Lightweight)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Just checking if we can get a stream to "prime" the hardware
        const probeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        probeStream.getTracks().forEach(track => track.stop());
      }
    } catch (hardwareErr: any) {
      console.warn('Hardware probe warning:', hardwareErr);
      if (hardwareErr.name === 'NotAllowedError' || hardwareErr.name === 'PermissionDeniedError') {
        setError('Microphone access was denied. Please click the lock icon in the URL bar, select "Reset permission", and REFRESH the page.');
        return;
      }
    }

    const recognition = new SR();
    
    // Config
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'mr': 'mr-IN'
    };
    recognition.lang = langMap[language] || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setChatInput(transcript);
      setIsListening(false);
      if (transcript.trim()) sendMessage(transcript);
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error details:', e);
      const err = e.error;
      
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setError('Microphone access is blocked or the Speech Service is restricted. Try: 1. Reset permissions via Lock Icon. 2. Refresh page. 3. Check Windows Privacy Settings for Microphone.');
      } else if (err === 'audio-capture') {
        setError('No microphone found. Please connect a mic and refresh.');
      } else if (err === 'aborted') {
        // Recognition was stopped by code, ignore
      } else if (err === 'network') {
        setError('Network error: Voice recognition needs an internet connection.');
      } else if (err === 'no-speech') {
        // Silently stop if no speech detected
      } else {
        setError(`Microphone error (${err}). Please check if another app is using the mic.`);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err: any) {
      console.error('Recognition start crash:', err);
      // If it's already started, ignore
      if (!err.message?.includes('already started')) {
        setError('Could not start voice engine. Please refresh the page.');
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ─── Send message to AI ─────────────────────────────────────────────────────
  const sendMessage = async (messageText?: string) => {
    const msg = messageText || chatInput;
    if (!msg.trim()) return;

    const newHistory = [...chatHistory, { role: 'user' as const, content: msg }];
    setChatHistory(newHistory);
    setChatInput('');
    setIsAIThinking(true);
    setCurrentEmotion('thinking');
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          conversation_history: newHistory,
          memories: [],
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to get AI response');

      const aiReply = data.response;
      const aiEmotion = detectEmotionFromText(aiReply);
      setChatHistory([...newHistory, { role: 'assistant', content: aiReply }]);
      setCurrentEmotion(aiEmotion);
      speakText(aiReply);
    } catch (err: any) {
      setError(err.message);
      setCurrentEmotion('neutral');
    } finally {
      setIsAIThinking(false);
    }
  };

  // Handle Speak button press
  const handleSpeak = () => {
    if (isTalking || isAIThinking) {
      stopSpeaking();
    } else if (text.trim()) {
      speakText(text);
    }
  };

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #070d16 0%, #0d1524 50%, #060c14 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(6,12,20,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>AI Avatar</div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>Human-like • Real-time</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px', padding: '3px',
          }}>
            {(['realtime', 'hybrid'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                padding: '5px 14px', borderRadius: '16px', cursor: 'pointer',
                border: 'none', fontSize: '12px', fontWeight: 600,
                transition: 'all 0.2s',
                background: mode === m ? 'linear-gradient(135deg, #7c3aed, #db2777)' : 'transparent',
                color: mode === m ? 'white' : '#94a3b8',
              }}>
                {m === 'realtime' ? 'Real-time' : 'Realistic'}
              </button>
            ))}
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: showSettings ? 'rgba(124, 58, 237, 0.3)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showSettings ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '10px', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: showSettings ? '#a78bfa' : '#94a3b8',
              transition: 'all 0.2s',
            }}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', padding: '16px 20px', gap: '20px', overflow: 'hidden', minHeight: 0 }}>
        
        {/* Left: Avatar */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>

          {/* Settings panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: 'rgba(10,18,30,0.8)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '20px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ color: 'white', fontWeight: 600, fontSize: '15px', margin: 0 }}>Settings</h3>
                  <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Language */}
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                      <Globe size={12} style={{ display: 'inline', marginRight: '4px' }} /> Language
                    </label>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        style={{
                          width: '100%', padding: '10px 14px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', color: 'white', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          fontSize: '14px',
                        }}
                      >
                        <span>{LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.name}</span>
                        <ChevronDown size={14} color="#64748b" />
                      </button>
                      {showLanguageDropdown && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                          background: '#0f1a2a', border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '10px', zIndex: 100, maxHeight: '200px', overflowY: 'auto',
                        }}>
                          {LANGUAGES.map(lang => (
                            <button key={lang.code} onClick={() => { setLanguage(lang.code); setShowLanguageDropdown(false); }}
                              style={{
                                width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                                color: language === lang.code ? '#a78bfa' : 'white', cursor: 'pointer',
                                textAlign: 'left', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
                              }}
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                              {language === lang.code && <CheckCircle size={14} style={{ marginLeft: 'auto' }} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar canvas */}
          <div style={{
            flex: '1 1 auto',
            background: 'rgba(10,18,30,0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative',
            minHeight: 0,
          }}>
            <AvatarCanvas isTalking={isTalking} text={text || chatInput} showControls={false} emotion={displayEmotion} wordTrigger={wordTrigger} />

            {/* Status overlay */}
            {(isAIThinking) && (
              <div style={{
                position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(10,15,25,0.7)', backdropFilter: 'blur(8px)',
                borderRadius: '20px', padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: '8px',
                border: '1px solid rgba(124,58,237,0.3)',
              }}>
                <Loader2 size={14} color="#a78bfa" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 500 }}>Thinking...</span>
              </div>
            )}
          </div>

          {/* Emotion picker — compact bar */}
          <div style={{
            background: 'rgba(10,18,30,0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', padding: '10px 14px',
            flexShrink: 0,
          }}>
            <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 500, marginBottom: '8px' }}>Expressions</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {EMOTION_BUTTONS.map(eb => (
                <button key={eb.emotion} onClick={() => setManualEmotion(displayEmotion === eb.emotion ? null : eb.emotion)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 11px', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${displayEmotion === eb.emotion ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    background: displayEmotion === eb.emotion ? eb.color : 'rgba(255,255,255,0.02)',
                    color: displayEmotion === eb.emotion ? 'white' : '#64748b',
                    fontSize: '11px', fontWeight: 500, transition: 'all 0.2s',
                  }}
                >
                  {eb.icon}
                  {eb.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div style={{ width: '380px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Text-to-speech input */}
          <div style={{
            background: 'rgba(10,18,30,0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px', padding: '20px',
          }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={16} color="#a78bfa" />
              Make Avatar Speak
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, 2000))}
              placeholder="Type text for avatar to speak aloud..."
              style={{
                width: '100%', minHeight: '110px', resize: 'vertical',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '12px', color: 'white', padding: '14px',
                fontSize: '14px', lineHeight: '1.5',
                outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ color: '#475569', fontSize: '11px' }}>{text.length} / 2000</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isTalking ? (
                  <button onClick={stopSpeaking}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '9px 18px', borderRadius: '12px', cursor: 'pointer',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444', fontSize: '14px', fontWeight: 600,
                    }}
                  >
                    <Pause size={16} /> Stop
                  </button>
                ) : (
                  <button onClick={handleSpeak} disabled={!text.trim()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '9px 18px', borderRadius: '12px', cursor: text.trim() ? 'pointer' : 'not-allowed',
                      border: 'none', background: text.trim()
                        ? 'linear-gradient(135deg, #7c3aed, #db2777)'
                        : 'rgba(255,255,255,0.04)',
                      color: text.trim() ? 'white' : '#475569', fontSize: '14px', fontWeight: 600,
                      opacity: text.trim() ? 1 : 0.6,
                    }}
                  >
                    <Play size={16} /> Speak
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Chat */}
          <div style={{
            flex: '1 1 auto',
            background: 'rgba(10,18,30,0.6)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', minHeight: '300px',
          }}>
            {/* Chat header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <MessageCircle size={16} color="#a78bfa" />
              <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Chat with AI</span>
              {isAIThinking && (
                <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '12px' }}>Thinking...</span>
              )}
              <button
                onClick={() => setChatHistory([])}
                style={{
                  marginLeft: 'auto',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  color: '#94a3b8',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <X size={12} /> Clear Chat
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {chatHistory.length === 0 && (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: '#334155', textAlign: 'center', gap: '8px',
                }}>
                  <MessageCircle size={32} />
                  <div style={{ fontSize: '13px' }}>Send a message to chat<br />with your AI avatar</div>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px', borderRadius: '16px',
                    fontSize: '13px', lineHeight: '1.5',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #7c3aed, #5b21b6)'
                      : 'rgba(255,255,255,0.06)',
                    color: msg.role === 'user' ? 'white' : '#cbd5e1',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                    borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isAIThinking && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    padding: '10px 16px', borderRadius: '16px', borderBottomLeftRadius: '4px',
                    background: 'rgba(255,255,255,0.06)', display: 'flex', gap: '4px', alignItems: 'center',
                  }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        background: '#7c3aed', animation: 'bounce 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', gap: '8px',
            }}>
              <button
                onClick={isListening ? stopListening : startListening}
                style={{
                  width: '38px', height: '38px', borderRadius: '10px', border: 'none', flexShrink: 0,
                  background: isListening ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
                  color: isListening ? '#ef4444' : '#64748b', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: isListening ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Mic size={16} />
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask the avatar anything..."
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'white', fontSize: '13px', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!chatInput.trim() || isAIThinking}
                style={{
                  width: '38px', height: '38px', borderRadius: '10px', border: 'none', flexShrink: 0,
                  background: chatInput.trim() && !isAIThinking
                    ? 'linear-gradient(135deg, #7c3aed, #db2777)'
                    : 'rgba(255,255,255,0.04)',
                  color: chatInput.trim() && !isAIThinking ? 'white' : '#475569',
                  cursor: chatInput.trim() && !isAIThinking ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: '12px', padding: '12px 16px',
                  color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                <span style={{ flex: 1 }}>{error}</span>
                <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}>
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode info */}
          <div style={{
            background: 'rgba(10,18,30,0.4)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '12px', padding: '12px 16px',
          }}>
            <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 500, marginBottom: '4px' }}>
              {mode === 'realtime' ? '⚡ Real-time Mode' : '🎬 Realistic Mode'}
            </div>
            <div style={{ color: '#334155', fontSize: '11px', lineHeight: '1.5' }}>
              {mode === 'realtime'
                ? 'Instant browser speech synthesis with live facial animations—emotions, lip sync & blinking.'
                : 'AI-generated photorealistic video. Requires API keys and takes time to process.'
              }
            </div>
          </div>
        </div>
      </main>

      {/* Global animation styles */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

export default function AvatarPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060c14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite', color: '#7c3aed' }} />
      </div>
    }>
      <AvatarContent />
    </Suspense>
  );
}
