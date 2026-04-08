'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Video, 
  Mic, 
  Upload, 
  Play, 
  Pause, 
  Loader2, 
  ArrowLeft,
  Settings,
  Sparkles,
  Globe,
  User,
  Volume2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Bot,
  Wand2,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

// Dynamic import for AvatarCanvas (SSR disabled)
const AvatarCanvas = dynamic(() => import('@/components/AvatarCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-surface-900/50 rounded-2xl">
      <Loader2 className="w-8 h-8 animate-spin text-beyond-purple" />
    </div>
  ),
});

// Language options
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
];

// Voice options for browser SpeechSynthesis
const BROWSER_VOICES = [
  { id: 'default', name: 'Default Voice', lang: 'en-US' },
  { id: 'male', name: 'Male Voice', lang: 'en-US' },
  { id: 'female', name: 'Female Voice', lang: 'en-US' },
];

// Avatar options
const AVATARS = [
  { 
    id: 'professional', 
    name: 'Professional', 
    gender: 'neutral',
    description: 'Clean and professional look'
  },
  { 
    id: 'friendly', 
    name: 'Friendly', 
    gender: 'female',
    description: 'Warm and approachable'
  },
  { 
    id: 'casual', 
    name: 'Casual', 
    gender: 'male',
    description: 'Relaxed and natural'
  },
];

function AvatarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const personaId = searchParams.get('persona');

  const [text, setText] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  
  // Settings
  const [language, setLanguage] = useState('en');
  const [selectedVoice, setSelectedVoice] = useState('default');
  const [mode, setMode] = useState<'realtime' | 'hybrid'>('realtime');
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

  const synthRef = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Get available browser voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (synthRef) {
      const loadVoices = () => {
        const voices = synthRef.getVoices();
        setAvailableVoices(voices);
      };
      
      loadVoices();
      synthRef.onvoiceschanged = loadVoices;
    }
  }, [synthRef]);

  // Speak text using browser SpeechSynthesis
  const speakText = (textToSpeak: string) => {
    if (!textToSpeak.trim()) {
      setError('Please enter some text to speak');
      return;
    }

    if (!synthRef) {
      setError('Speech synthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    synthRef.cancel();

    setError(null);
    setIsTalking(true);

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Set language
    const langCode = LANGUAGES.find(l => l.code === language)?.code || 'en-US';
    utterance.lang = langCode;
    
    // Find appropriate voice
    const voices = synthRef.getVoices();
    if (selectedVoice !== 'default' && voices.length > 0) {
      const selectedVoiceLang = selectedVoice === 'male' ? 'male' : 'female';
      const matchingVoice = voices.find(v => 
        v.lang.startsWith(language) && 
        (selectedVoiceLang === 'male' ? v.name.toLowerCase().includes('male') : v.name.toLowerCase().includes('female'))
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }

    // Speech rate and pitch
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsTalking(true);
    };

    utterance.onend = () => {
      setIsTalking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsTalking(false);
      if (event.error !== 'canceled') {
        setError('Speech synthesis failed');
      }
    };

    utteranceRef.current = utterance;
    synthRef.speak(utterance);
  };

  // Send message to AI and get response
  const sendMessage = async () => {
    if (!text.trim()) {
      setError('Please enter a message');
      return;
    }

    const userMessage = text;
    setText(''); // Clear input
    setIsAIThinking(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: chatHistory,
          memories: [],
          language: language
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get AI response');
      }

      const aiResponse = data.response;
      
      // Add to chat history
      setChatHistory([...chatHistory, 
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      ]);

      // Make avatar speak the AI response
      speakText(aiResponse);
      setSuccess('AI replied!');
    } catch (err: any) {
      setError(err.message || 'Failed to get AI response');
      console.error('Chat error:', err);
    } finally {
      setIsAIThinking(false);
    }
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthRef) {
      synthRef.cancel();
      setIsTalking(false);
    }
  };

  // Generate hybrid avatar video (API-based)
  const generateHybridAvatar = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('text', text);
      formData.append('language', language);
      formData.append('voice_id', selectedVoice);
      formData.append('avatar_id', 'professional_female');

      const response = await fetch('/api/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate avatar');
      }

      if (data.video_url) {
        setVideoUrl(data.video_url);
        setSuccess('Avatar generated successfully!');
      } else if (data.demo) {
        setSuccess(data.message || 'Demo mode active');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">AI Avatar</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings 
                  ? 'bg-beyond-purple text-white' 
                  : 'hover:bg-surface-800 text-surface-400 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-surface-900/50 backdrop-blur-xl rounded-full p-1 flex border border-surface-800/50">
              <button
                onClick={() => setMode('realtime')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                  mode === 'realtime' 
                    ? 'bg-beyond-purple text-white' 
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                <Bot className="w-4 h-4" />
                <span>Real-time</span>
              </button>
              <button
                onClick={() => setMode('hybrid')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${
                  mode === 'hybrid' 
                    ? 'bg-beyond-purple text-white' 
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                <span>Realistic</span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Panel - 3D Avatar */}
            <div className="space-y-6">
              {/* 3D Avatar Display */}
              <div className="bg-surface-900/50 backdrop-blur-xl rounded-2xl border border-surface-800/50 p-4 min-h-[500px] relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-beyond-purple/5 to-transparent pointer-events-none" />
                
                {mode === 'realtime' ? (
                  <div className="relative z-10 h-[450px]">
                    <AvatarCanvas 
                      isTalking={isTalking} 
                      text={text}
                      showControls={true}
                    />
                    
                    {/* Emotion indicator */}
                    {isTalking && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-800/80 backdrop-blur px-4 py-2 rounded-full flex items-center space-x-2"
                      >
                        <Volume2 className="w-4 h-4 text-beyond-purple animate-pulse" />
                        <span className="text-white text-sm">Speaking...</span>
                      </motion.div>
                    )}
                  </div>
                ) : videoUrl ? (
                  <div className="relative z-10">
                    <video
                      src={videoUrl}
                      controls
                      autoPlay
                      className="w-full rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="relative z-10 h-[450px] flex items-center justify-center">
                    <div className="text-center">
                      <Bot className="w-16 h-16 text-surface-700 mx-auto mb-4" />
                      <p className="text-surface-400">Switch to Realistic mode and generate an avatar to see the video</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls for Real-time Mode */}
              {mode === 'realtime' && (
                <div className="flex justify-center space-x-4">
                  {isTalking || isAIThinking ? (
                    <button
                      onClick={stopSpeaking}
                      className="flex items-center space-x-2 px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      <Pause className="w-5 h-5" />
                      <span>Stop</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => speakText(text)}
                        disabled={!text.trim()}
                        className="flex items-center space-x-2 px-6 py-3 bg-surface-700 rounded-xl text-white font-medium hover:bg-surface-600 transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        <span>Speak</span>
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={!text.trim()}
                        className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-beyond-purple to-beyond-pink rounded-xl text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span>Send to AI</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Generate Button for Hybrid Mode */}
              {mode === 'hybrid' && (
                <button
                  onClick={generateHybridAvatar}
                  disabled={isLoading || !text.trim()}
                  className="w-full py-4 bg-gradient-to-r from-beyond-purple to-beyond-pink rounded-xl text-white font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>Generate Avatar</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Right Panel - Controls */}
            <div className="space-y-6">
              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-surface-900/50 backdrop-blur-xl rounded-2xl border border-surface-800/50 p-6 space-y-4"
                  >
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-beyond-purple" />
                      Settings
                    </h3>
                    
                    {/* Language Selection */}
                    <div>
                      <label className="block text-sm font-medium text-surface-400 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Language
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-surface-800/50 rounded-xl border border-surface-700"
                        >
                          <span className="text-white">
                            {LANGUAGES.find(l => l.code === language)?.flag} {LANGUAGES.find(l => l.code === language)?.name}
                          </span>
                          <ChevronDown className="w-4 h-4 text-surface-400" />
                        </button>
                        
                        {showLanguageDropdown && (
                          <div className="absolute z-10 w-full mt-2 bg-surface-800 rounded-xl border border-surface-700 shadow-xl max-h-60 overflow-y-auto">
                            {LANGUAGES.map((lang) => (
                              <button
                                key={lang.code}
                                onClick={() => {
                                  setLanguage(lang.code);
                                  setShowLanguageDropdown(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 hover:bg-surface-700 ${
                                  language === lang.code ? 'text-beyond-purple' : 'text-white'
                                }`}
                              >
                                <span className="mr-2">{lang.flag}</span>
                                {lang.name}
                                {language === lang.code && <CheckCircle className="w-4 h-4 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Voice Selection */}
                    <div>
                      <label className="block text-sm font-medium text-surface-400 mb-2">
                        <Volume2 className="w-4 h-4 inline mr-1" />
                        Voice
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-surface-800/50 rounded-xl border border-surface-700"
                        >
                          <span className="text-white">{BROWSER_VOICES.find(v => v.id === selectedVoice)?.name}</span>
                          <ChevronDown className="w-4 h-4 text-surface-400" />
                        </button>
                        
                        {showVoiceDropdown && (
                          <div className="absolute z-10 w-full mt-2 bg-surface-800 rounded-xl border border-surface-700 shadow-xl">
                            {BROWSER_VOICES.map((voice) => (
                              <button
                                key={voice.id}
                                onClick={() => {
                                  setSelectedVoice(voice.id);
                                  setShowVoiceDropdown(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 hover:bg-surface-700 ${
                                  selectedVoice === voice.id ? 'text-beyond-purple' : 'text-white'
                                }`}
                              >
                                <User className="w-4 h-4 mr-2" />
                                {voice.name}
                                {selectedVoice === voice.id && <CheckCircle className="w-4 h-4 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Text Input */}
              <div className="bg-surface-900/50 backdrop-blur-xl rounded-2xl border border-surface-800/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Enter Your Message
                </h3>
                
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type the text you want the avatar to speak..."
                  className="w-full h-40 bg-surface-800/50 rounded-xl border border-surface-700 p-4 text-white placeholder-surface-500 focus:outline-none focus:border-beyond-purple/50 resize-none"
                />
                
                <div className="mt-4 text-right">
                  <span className="text-surface-500 text-sm">
                    {text.length} / 2000 characters
                  </span>
                </div>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center text-red-400"
                >
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {error}
                </motion.div>
              )}
              
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 flex items-center text-green-400"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {success}
                </motion.div>
              )}

              {/* Info Card */}
              <div className="bg-surface-900/30 rounded-xl p-4 border border-surface-800/30">
                <h4 className="text-sm font-medium text-surface-400 mb-2">
                  {mode === 'realtime' ? '💡 Real-time Mode' : '🎬 Realistic Mode'}
                </h4>
                <p className="text-sm text-surface-500">
                  {mode === 'realtime' 
                    ? 'Uses browser speech synthesis for instant response with animated 3D avatar. Works offline!'
                    : 'Generates ultra-realistic avatar video using AI. Requires API keys and takes longer to process.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ChevronDown component
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

export default function AvatarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-beyond-purple" />
      </div>
    }>
      <AvatarContent />
    </Suspense>
  );
}
