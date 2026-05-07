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
import { cn } from '@/lib/utils';

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
  const [mounted, setMounted] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.05);
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
    setMounted(true);
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
    utterance.rate = speechRate;
    utterance.pitch = speechPitch; 

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
    <div className="h-screen max-h-screen overflow-hidden bg-slate-950 flex flex-col font-sans text-slate-200 relative select-none">
      {/* Glowing Tech Background Blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-beyond-purple/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-beyond-pink/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Premium Header ── */}
      <header className="sticky top-0 z-50 bg-slate-950/65 backdrop-blur-3xl border-b border-white/[0.06] px-6 h-16 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl w-9 h-9 flex items-center justify-center cursor-pointer text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-95 transition-all duration-200 shadow-inner"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-beyond-purple via-violet-600 to-beyond-pink flex items-center justify-center shadow-lg shadow-beyond-purple/20">
              <Sparkles size={18} className="text-white animate-pulse" />
            </div>
            <div>
              <div className="text-white font-extrabold text-sm tracking-wide leading-none">AI Avatar Interface</div>
              <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                Human-like <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> <span className="text-emerald-400 font-bold">Real-time Sync</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          {/* Mode toggle */}
          <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-full p-1 shadow-inner relative overflow-hidden">
            {(['realtime', 'hybrid'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-4 py-1.5 rounded-full cursor-pointer border-none text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                  mode === m 
                    ? "bg-gradient-to-r from-beyond-purple to-beyond-pink text-white shadow-md shadow-beyond-purple/20" 
                    : "bg-transparent text-slate-400 hover:text-slate-200"
                )}
              >
                {m === 'realtime' ? 'Real-time' : 'Realistic'}
              </button>
            ))}
          </div>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "border rounded-xl w-9 h-9 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-inner",
              showSettings 
                ? "bg-beyond-purple/20 border-beyond-purple/50 text-beyond-purple drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" 
                : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15]"
            )}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-hidden min-h-0 relative z-10">
        
        {/* Left Panel: Avatar Canvas */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 overflow-hidden relative">

          {/* Settings panel inside */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-4 left-4 right-4 z-40 bg-gradient-to-b from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-3xl border border-white/[0.12] rounded-2xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-visible"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-extrabold text-sm uppercase tracking-wider margin-0 flex items-center gap-2">
                    <Settings size={14} className="text-beyond-purple" />
                    Cognitive Configuration
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="background-none border-none text-slate-500 hover:text-white cursor-pointer p-1"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Language Card Wrapper */}
                  <div className="w-full">
                    <label className="text-slate-400 text-[10px] font-black uppercase tracking-widest block mb-3 flex items-center gap-1.5">
                      <Globe size={11} className="text-beyond-purple animate-pulse" /> Language Pack / Cognitive Core
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 w-full max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                      {LANGUAGES.map(lang => {
                        const isSelected = language === lang.code;
                        return (
                          <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 text-left cursor-pointer",
                              isSelected
                                ? "bg-gradient-to-r from-beyond-purple/20 to-beyond-pink/20 border-beyond-purple/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                                : "bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] hover:border-white/[0.08]"
                            )}
                          >
                            <span className="text-sm bg-white/[0.04] w-6 h-6 rounded-lg flex items-center justify-center border border-white/[0.06] shadow-inner">{lang.flag}</span>
                            <span className="text-xs font-semibold tracking-wide">{lang.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customization Sliders and Status Card */}
                  <div className="flex flex-col md:flex-row gap-5 w-full pt-4 border-t border-white/[0.05]">
                    <div className="flex-1 flex flex-col gap-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Speech Rate</span>
                          <span className="text-xs font-bold text-beyond-purple">{speechRate.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={speechRate}
                          onChange={e => setSpeechRate(parseFloat(e.target.value))}
                          className="w-full accent-beyond-purple bg-white/[0.04] h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vocal Pitch</span>
                          <span className="text-xs font-bold text-beyond-pink">{speechPitch.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={speechPitch}
                          onChange={e => setSpeechPitch(parseFloat(e.target.value))}
                          className="w-full accent-beyond-pink bg-white/[0.04] h-1 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex-1 bg-white/[0.01] border border-white/[0.04] rounded-xl p-3.5 flex flex-col gap-2 justify-center">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-beyond-purple opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-beyond-purple"></span>
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cognitive Status</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal m-0">
                        Selected Language Pack <span className="text-beyond-purple font-bold">({LANGUAGES.find(l => l.code === language)?.name})</span> determines phonetic responses, facial muscle synchronization, and sub-vocal translation matrices.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar canvas Wrapper */}
          <div className="flex-1 bg-slate-900/35 backdrop-blur-3xl border border-white/[0.06] rounded-[2rem] overflow-hidden relative min-h-0 shadow-[0_20px_50px_rgba(0,0,0,0.4)] group/canvas flex items-center justify-center min-h-[400px]">
            {mounted ? (
              <AvatarCanvas isTalking={isTalking} text={text || chatInput} showControls={false} emotion={displayEmotion} wordTrigger={wordTrigger} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-beyond-purple" />
              </div>
            )}

            {/* Status overlay */}
            {isAIThinking && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-xl rounded-full px-4 py-2 flex items-center gap-2.5 border border-beyond-purple/40 shadow-[0_0_15px_rgba(139,92,246,0.25)]">
                <Loader2 size={14} className="animate-spin text-beyond-purple" />
                <span className="text-beyond-purple text-xs font-black uppercase tracking-widest">AI Sync active</span>
              </div>
            )}
          </div>

          {/* Expression Picker */}
          <div className="bg-slate-900/30 backdrop-blur-2xl border border-white/[0.05] rounded-2xl p-4 flex-shrink-0 shadow-lg">
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles size={12} className="text-beyond-pink" /> Expression Matrix
            </div>
            <div className="flex gap-2 flex-wrap">
              {EMOTION_BUTTONS.map(eb => {
                const isActive = displayEmotion === eb.emotion;
                return (
                  <button
                    key={eb.emotion}
                    onClick={() => setManualEmotion(displayEmotion === eb.emotion ? null : eb.emotion)}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-full cursor-pointer text-xs font-bold transition-all duration-300 border active:scale-95",
                      isActive
                        ? "text-white border-white/[0.12] shadow-lg shadow-black/15"
                        : "text-slate-400 bg-white/[0.02] border-white/[0.04] hover:text-slate-200 hover:bg-white/[0.04] hover:border-white/[0.08]"
                    )}
                    style={{
                      background: isActive ? eb.color : undefined,
                      borderColor: isActive ? 'rgba(255,255,255,0.15)' : undefined,
                    }}
                  >
                    <span className={cn("transition-transform duration-300", isActive && "scale-110")}>{eb.icon}</span>
                    <span>{eb.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Controls */}
        <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-5 min-h-0">

          {/* Text-to-speech input Card */}
          <div className="bg-slate-900/35 backdrop-blur-3xl border border-white/[0.06] rounded-[2rem] p-5 shadow-xl relative overflow-hidden group/speak">
            <div className="text-white font-extrabold text-xs uppercase tracking-wider mb-3.5 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-beyond-purple/10 border border-beyond-purple/20 flex items-center justify-center">
                <Volume2 size={13} className="text-beyond-purple" />
              </div>
              Vocal Synthesis
            </div>
            
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, 2000))}
              placeholder="Type text for avatar to speak aloud..."
              className="w-full min-h-[100px] max-h-[200px] resize-y bg-slate-950/40 border border-white/[0.06] hover:border-white/[0.12] focus:border-beyond-purple/40 rounded-xl text-xs text-white p-4 leading-relaxed outline-none font-sans box-border shadow-inner focus:shadow-[0_0_15px_rgba(139,92,246,0.06)] transition-all duration-300 custom-scrollbar placeholder:text-slate-600"
            />
            
            <div className="flex justify-between items-center mt-3">
              <span className="text-slate-600 text-[10px] font-black tracking-wider uppercase">{text.length} / 2000</span>
              <div className="flex gap-2">
                {isTalking ? (
                  <motion.button
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={stopSpeaking}
                    className="relative overflow-hidden flex items-center gap-2 px-6 py-2.5 rounded-xl cursor-pointer bg-gradient-to-r from-rose-500 via-red-500 to-red-600 text-white text-xs font-black uppercase tracking-wider transition-all duration-300 border border-red-400/20 shadow-[0_0_20px_rgba(239,68,68,0.35)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]"
                  >
                    {/* Pulse glow background */}
                    <span className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                    <Pause size={13} className="fill-current animate-pulse relative z-10" /> 
                    <span className="relative z-10 font-bold">Stop Speech</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={text.trim() ? { scale: 1.04, y: -1 } : {}}
                    whileTap={text.trim() ? { scale: 0.96 } : {}}
                    onClick={handleSpeak}
                    disabled={!text.trim()}
                    className={cn(
                      "relative overflow-hidden flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 border",
                      text.trim()
                        ? "bg-gradient-to-r from-beyond-purple via-violet-600 to-beyond-pink border-transparent text-white cursor-pointer shadow-[0_8px_25px_rgba(139,92,246,0.3)] hover:shadow-[0_12px_35px_rgba(139,92,246,0.55)] hover:brightness-110"
                        : "bg-white/[0.02] border-white/[0.04] text-slate-500 cursor-not-allowed shadow-inner"
                    )}
                  >
                    {text.trim() && (
                      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                    )}
                    <Play size={13} className={cn("transition-all duration-300 relative z-10", text.trim() ? "fill-current text-white scale-110" : "text-slate-500")} /> 
                    <span className="relative z-10 font-bold">Speak</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Chat with AI Card */}
          <div className="flex-1 bg-slate-900/35 backdrop-blur-3xl border border-white/[0.06] rounded-[2rem] flex flex-col overflow-hidden min-h-[300px] shadow-xl">
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-beyond-pink/10 border border-beyond-pink/20 flex items-center justify-center">
                  <MessageCircle size={13} className="text-beyond-pink" />
                </div>
                <span className="text-white font-extrabold text-xs uppercase tracking-wider">Cognitive Link</span>
              </div>
              <button
                onClick={() => setChatHistory([])}
                className="bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-lg px-2.5 py-1.5 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-all duration-200"
              >
                <X size={10} /> Clear Logs
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 custom-scrollbar">
              {chatHistory.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-slate-500 animate-pulse">
                    <Brain size={24} />
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Link Idle</div>
                  <div className="text-[10px] text-slate-500/60 leading-relaxed">Send a sub-vocal packet to prime<br />the virtual persona core.</div>
                </div>
              )}
              {chatHistory.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-md",
                      msg.role === 'user'
                        ? "bg-gradient-to-r from-beyond-purple to-violet-600 text-white rounded-br-sm border-t border-white/10"
                        : "bg-slate-950/45 text-slate-200 rounded-bl-sm border border-white/[0.04]"
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {isAIThinking && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-slate-950/45 border border-white/[0.04] flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-beyond-pink/60 animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/[0.06] flex gap-2.5 bg-slate-950/20">
              <button
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  "w-10 h-10 rounded-xl border-none flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-300",
                  isListening
                    ? "bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
                    : "bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                )}
              >
                <Mic size={16} className={cn(isListening && "animate-pulse scale-110")} />
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask the avatar anything..."
                className="flex-1 bg-slate-950/40 hover:bg-slate-950/60 border border-white/[0.06] focus:border-beyond-purple/40 rounded-xl text-xs text-white px-4 outline-none font-sans shadow-inner transition-all duration-300 placeholder:text-slate-600"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!chatInput.trim() || isAIThinking}
                className={cn(
                  "w-10 h-10 rounded-xl border-none flex-shrink-0 flex items-center justify-center transition-all duration-300 active:scale-95",
                  chatInput.trim() && !isAIThinking
                    ? "bg-gradient-to-r from-beyond-purple to-beyond-pink text-white cursor-pointer hover:shadow-lg hover:shadow-beyond-purple/15"
                    : "bg-white/[0.03] text-slate-600 cursor-not-allowed"
                )}
              >
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 text-xs text-red-400 flex items-center gap-2.5 shadow-lg"
              >
                <span className="flex-1 font-bold">{error}</span>
                <button onClick={() => setError(null)} className="bg-transparent border-none text-red-400 hover:text-red-300 cursor-pointer p-0.5">
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode Info Footer */}
          <div className="bg-slate-950/45 border border-white/[0.04] rounded-2xl p-4 flex gap-3 shadow-lg relative overflow-hidden group/info">
            <div className="absolute inset-0 bg-gradient-to-r from-beyond-purple/5 to-transparent pointer-events-none opacity-0 group-hover/info:opacity-100 transition-opacity duration-500" />
            <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
              {mode === 'realtime' ? <Zap size={14} className="text-amber-400 animate-pulse" /> : <Sparkles size={14} className="text-beyond-purple animate-pulse" />}
            </div>
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {mode === 'realtime' ? 'Real-time Core' : 'Realistic Core'}
              </div>
              <div className="text-[9px] text-slate-500 leading-relaxed mt-1">
                {mode === 'realtime'
                  ? 'Low-latency local speech synthesis with instant, micro-expressive 2D physical morphing.'
                  : 'Premium AI video generator. Deep-rendered face tracking. Requires active server sync.'
                }
              </div>
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
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
