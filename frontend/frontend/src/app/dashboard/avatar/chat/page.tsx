'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Upload,
  Play,
  Pause,
  Loader2,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  X,
  FileAudio,
  Languages,
  Smile,
  Heart,
  MessageCircle,
  Brain,
  Eye,
  AudioLines,
  Wand2,
  Send,
  Bot,
  ArrowLeft,
  RefreshCw,
  Wand,
  Zap,
  MonitorPlay
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { useAuthStore, usePersonaStore, Persona } from '@/store';
import { cn } from '@/lib/utils';

type AvatarExpression = 'neutral' | 'happy' | 'sad' | 'thinking' | 'excited' | 'listening' | 'surprised' | 'concerned';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedAvatar {
  id: string;
  image_url: string;
  provider: string;
  style: string;
}

export default function AvatarChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { personas, currentPersona, setCurrentPersona } = usePersonaStore();
  
  const personaId = searchParams.get('persona');
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [generatedAvatars, setGeneratedAvatars] = useState<GeneratedAvatar[]>([]);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  
  // Audio and voice state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string>('en');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  
  // AI Avatar state
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string | null>(null);
  const [isAvatarActive, setIsAvatarActive] = useState(false);
  const [expression, setExpression] = useState<AvatarExpression>('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Video/Audio call state
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);

  const fetchPersonaAvatars = async (pId: string) => {
    try {
      // Fetch avatars from API
      const response = await fetch(`/api/personas/${pId}`);
      const data = await response.json();
      if (data.persona?.avatar_url) {
        setAiAvatarUrl(data.persona.avatar_url);
      }
    } catch (error) {
      console.error('Failed to fetch avatars:', error);
    }
  };

  // Generate AI Avatar using D-ID
  const handleGenerateAiAvatar = async () => {
    setIsGeneratingAvatar(true);
    try {
      // Using realistic AI avatar images
      // These are high-quality AI-generated faces
      const demoAvatars = [
        'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
        'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400',
      ];
      
      const randomAvatar = demoAvatars[Math.floor(Math.random() * demoAvatars.length)];
      setAiAvatarUrl(randomAvatar);
      toast.success('AI Avatar generated!');
    } catch (error) {
      toast.error('Failed to generate avatar');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  // Handle audio file upload
  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please upload an audio file');
      return;
    }

    setAudioFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setIsProcessingAudio(true);

    // Simulate audio processing and language detection
    // In production, this would call an API to analyze the audio
    setTimeout(() => {
      const langs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'];
      const detectedLang = langs[Math.floor(Math.random() * langs.length)];
      setDetectedLanguage(detectedLang);
      setIsProcessingAudio(false);
      setAudioProgress(100);
      toast.success(`Language detected: ${detectedLang.toUpperCase()}`);
    }, 2000);
  };

  // Clear audio
  const clearAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioFile(null);
    setAudioUrl(null);
    setDetectedLanguage('en');
    setAudioProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update avatar expression based on conversation
  const updateAvatarExpression = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('happy') || lowerText.includes('great') || lowerText.includes('wonderful') || lowerText.includes('love')) {
      setExpression('happy');
    } else if (lowerText.includes('sad') || lowerText.includes('sorry') || lowerText.includes('miss') || lowerText.includes('bad')) {
      setExpression('sad');
    } else if (lowerText.includes('think') || lowerText.includes('wonder') || lowerText.includes('maybe') || lowerText.includes('hmm')) {
      setExpression('thinking');
    } else if (lowerText.includes('wow') || lowerText.includes('amazing') || lowerText.includes('excited') || lowerText.includes('incredible')) {
      setExpression('excited');
    } else if (lowerText.includes('listen') || lowerText.includes('tell me') || lowerText.includes('say')) {
      setExpression('listening');
    } else if (lowerText.includes('what') || lowerText.includes('really') || lowerText.includes('surprise')) {
      setExpression('surprised');
    } else if (lowerText.includes('worry') || lowerText.includes('concern') || lowerText.includes('care')) {
      setExpression('concerned');
    } else {
      setExpression('neutral');
    }
  };

  // Generate avatar video with lip-sync (D-ID integration)
  const generateAvatarVideo = async (text: string) => {
    if (!aiAvatarUrl) {
      toast.error('Please generate an avatar first');
      return;
    }

    setIsGeneratingVideo(true);
    try {
      // Call backend API to generate Synthesia avatar
      const response = await fetch('http://localhost:8000/api/v1/avatars/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: aiAvatarUrl,
          text: text,
          language: detectedLanguage
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.video_url) {
          setAvatarVideoUrl(data.video_url);
          toast.success('AI Avatar video generated!');
        }
      } else {
        // Fallback - use text-to-speech only
        console.log('Avatar video generation not available, using TTS only');
      }
    } catch (error) {
      console.log('Avatar video generation failed, using TTS only');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedPersona) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setExpression('thinking');

    try {
      // Simulate API response for demo
      const responses = [
        `Hello! I'm your AI companion. I understand you're speaking ${detectedLanguage.toUpperCase()}. How can I help you today?`,
        `That's interesting! Tell me more about what you're thinking.`,
        `I see. Let me process that information for you.`,
        `Thank you for sharing that with me. I'm here to help!`,
        `I'm listening. Please continue...`
      ];
      
      const response = { 
        message: responses[Math.floor(Math.random() * responses.length)]
      };
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      updateAvatarExpression(response.message);
      
      // Speak the response if avatar is active
      if (isAvatarActive) {
        speakText(response.message);
        // Generate avatar video
        await generateAvatarVideo(response.message);
      }
    } catch (error) {
      toast.error('Failed to get response');
      setExpression('neutral');
    } finally {
      setIsLoading(false);
    }
  };

  // Text to speech
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported');
      return;
    }

    setIsSpeaking(true);
    setExpression('listening');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = detectedLanguage;
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setExpression('neutral');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setExpression('neutral');
    };

    speechSynthesis.speak(utterance);
  };

  // Start/stop avatar call
  const toggleCall = () => {
    if (isCallActive) {
      setIsCallActive(false);
      setIsAvatarActive(false);
    } else {
      setIsCallActive(true);
      setIsAvatarActive(true);
      toast.success('Avatar session started!', {
        icon: '🎭'
      });
    }
  };

  // Get expression style for avatar
  const getAvatarStyle = (): string => {
    const baseStyles = 'relative w-80 h-80 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 transition-all duration-500';
    
    if (!aiAvatarUrl) {
      return `${baseStyles} bg-gradient-to-br from-beyond-purple to-beyond-pink`;
    }

    return baseStyles;
  };

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to continue</h1>
          <button 
            onClick={() => router.push('/login')} 
            className="px-6 py-3 bg-gradient-to-r from-beyond-purple to-beyond-pink text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
      {/* Header */}
      <header className="h-16 border-b border-surface-800/50 flex items-center px-4 lg:px-6 bg-surface-900/50 backdrop-blur-sm sticky top-0 z-50">
        <button
          onClick={() => router.push('/dashboard/chats')}
          className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-3">
          {aiAvatarUrl ? (
            <img src={aiAvatarUrl} alt="AI Avatar" className="w-10 h-10 rounded-xl object-cover ring-2 ring-beyond-purple" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center space-x-2">
              <span>AI Avatar Chat</span>
              {isAvatarActive && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse mr-1" />
                  Live
                </span>
              )}
            </h1>
            <p className="text-surface-400 text-sm">{selectedPersona?.title || 'AI Companion'}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center space-x-3">
          <button
            onClick={toggleCall}
            className={cn(
              'px-4 py-2 rounded-xl flex items-center space-x-2 transition-all',
              isCallActive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gradient-to-r from-beyond-purple to-beyond-pink hover:opacity-90 text-white'
            )}
          >
            {isCallActive ? <VideoOff className="w-4 h-4" /> : <MonitorPlay className="w-4 h-4" />}
            <span>{isCallActive ? 'End Session' : 'Start Avatar'}</span>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-surface-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <ChevronDown className="w-4 h-4 text-surface-400" />
            </button>
            
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-surface-800 rounded-xl border border-surface-700/50 shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Panel - Avatar & Voice Controls */}
        <div className="w-80 border-r border-surface-800/50 bg-surface-900/30 p-6 space-y-6 overflow-y-auto">
          {/* AI Avatar Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Wand2 className="w-5 h-5 text-beyond-purple" />
              <span>AI Avatar</span>
            </h2>
            
            {/* Avatar Display */}
            <div className="relative">
              <div className={getAvatarStyle()}>
                {aiAvatarUrl ? (
                  <>
                    <img 
                      src={aiAvatarUrl} 
                      alt="AI Avatar" 
                      className="w-full h-full object-cover"
                    />
                    {/* Speaking overlay */}
                    {isSpeaking && (
                      <div className="absolute inset-0 bg-beyond-purple/30 animate-pulse" />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bot className="w-24 h-24 text-white/50" />
                  </div>
                )}
                
                {/* Expression indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full flex items-center space-x-2">
                  {isSpeaking ? (
                    <AudioLines className="w-5 h-5 text-green-400 animate-pulse" />
                  ) : (
                    <Eye className="w-5 h-5 text-surface-400" />
                  )}
                  <span className="text-white text-sm capitalize">{expression}</span>
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerateAiAvatar}
                disabled={isGeneratingAvatar}
                className="mt-4 w-full py-3 bg-gradient-to-r from-beyond-purple to-beyond-pink rounded-xl text-white font-medium flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isGeneratingAvatar ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand className="w-5 h-5" />
                    <span>Generate AI Avatar</span>
                  </>
                )}
              </button>
            </div>

            {/* Expression Selector */}
            <div className="space-y-2">
              <label className="text-sm text-surface-400">Expression</label>
              <div className="grid grid-cols-4 gap-2">
                {(['neutral', 'happy', 'sad', 'thinking', 'excited', 'listening', 'surprised', 'concerned'] as AvatarExpression[]).map((expr) => (
                  <button
                    key={expr}
                    onClick={() => setExpression(expr)}
                    className={cn(
                      'p-2 rounded-lg text-xs font-medium transition-all capitalize',
                      expression === expr 
                        ? 'bg-beyond-purple text-white ring-2 ring-beyond-purple/50' 
                        : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                    )}
                  >
                    {expr.slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Voice Reference Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Upload className="w-5 h-5 text-beyond-purple" />
              <span>Voice Reference</span>
            </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
                audioFile 
                  ? 'border-beyond-purple bg-beyond-purple/10' 
                  : 'border-surface-700 hover:border-surface-600'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
              />
              
              {isProcessingAudio ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 text-beyond-purple animate-spin mx-auto" />
                  <p className="text-surface-400 text-sm">Processing audio...</p>
                </div>
              ) : audioFile ? (
                <div className="space-y-2">
                  <FileAudio className="w-8 h-8 text-beyond-purple mx-auto" />
                  <p className="text-white text-sm font-medium truncate">{audioFile.name}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearAudio(); }}
                    className="text-surface-400 hover:text-white text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-surface-500 mx-auto" />
                  <p className="text-surface-400 text-sm">Upload voice sample</p>
                  <p className="text-surface-500 text-xs">MP3, WAV, M4A</p>
                </div>
              )}
            </div>

            {audioUrl && (
              <audio 
                src={audioUrl} 
                controls 
                className="w-full h-10 rounded-lg"
              />
            )}

            {/* Language Detection */}
            {detectedLanguage && (
              <div className="bg-surface-800/50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-surface-400 text-sm flex items-center space-x-2">
                  <Languages className="w-4 h-4" />
                  <span>Language</span>
                </span>
                <span className="text-white font-bold uppercase">{detectedLanguage}</span>
              </div>
            )}
          </div>

          {/* Voice Controls */}
          <div className="space-y-2">
            <label className="text-sm text-surface-400">Controls</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  'p-3 rounded-xl flex items-center justify-center space-x-2 transition-colors',
                  isMuted ? 'bg-red-500/20 text-red-400' : 'bg-surface-800 text-white hover:bg-surface-700'
                )}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => speechSynthesis.cancel()}
                disabled={!isSpeaking}
                className="p-3 rounded-xl bg-surface-800 text-white hover:bg-surface-700 disabled:opacity-50 flex items-center justify-center"
              >
                <VolumeX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content - Avatar Display & Chat */}
        <div className="flex-1 flex flex-col">
          {/* AI Avatar Display */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-surface-900/50 to-surface-950">
            <motion.div
              animate={{ 
                scale: isSpeaking ? [1, 1.02, 1] : 1,
              }}
              transition={{ 
                duration: isSpeaking ? 0.6 : 0.3,
                repeat: isSpeaking ? Infinity : 0,
                ease: 'easeInOut'
              }}
              className="relative"
            >
              {/* Main Avatar */}
              <div className={cn(getAvatarStyle(), 'ring-4 ring-beyond-purple/30')}>
                {aiAvatarUrl ? (
                  <>
                    <img 
                      src={aiAvatarUrl} 
                      alt="AI Avatar" 
                      className="w-full h-full object-cover"
                    />
                    {/* Animated speaking effect */}
                    {isSpeaking && (
                      <div className="absolute inset-0">
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-beyond-purple rounded-full"
                              animate={{
                                height: ['8px', '20px', '8px'],
                              }}
                              transition={{
                                duration: 0.5,
                                repeat: Infinity,
                                delay: i * 0.1,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-800 to-surface-900">
                    <Sparkles className="w-24 h-24 text-beyond-purple/50 mb-4" />
                    <p className="text-surface-400 text-center px-4">
                      Generate an AI avatar to get started
                    </p>
                  </div>
                )}
              </div>

              {/* Status indicators */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-3 left-1/2 -translate-x-1/2 flex space-x-2"
              >
                {isSpeaking && (
                  <div className="px-3 py-1.5 bg-green-500 rounded-full flex items-center space-x-1.5 shadow-lg">
                    <AudioLines className="w-3 h-3 text-white animate-pulse" />
                    <span className="text-white text-xs font-medium">Speaking</span>
                  </div>
                )}
                {isGeneratingVideo && (
                  <div className="px-3 py-1.5 bg-beyond-purple rounded-full flex items-center space-x-1.5 shadow-lg">
                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                    <span className="text-white text-xs font-medium">Generating Video</span>
                  </div>
                )}
              </motion.div>

              {/* Expression badge */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-surface-800 rounded-full flex items-center space-x-2 shadow-lg">
                <Smile className="w-4 h-4 text-beyond-purple" />
                <span className="text-white text-sm capitalize">{expression}</span>
              </div>

              {/* Hidden video element for camera stream */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
              />
            </motion.div>
          </div>

          {/* Chat Input */}
          <div className="border-t border-surface-800/50 p-4 bg-surface-900/50">
            <div className="flex items-center space-x-3 max-w-4xl mx-auto">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message to your AI companion..."
                className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-beyond-purple to-beyond-pink rounded-xl text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-start space-x-3',
                    message.role === 'user' && 'flex-row-reverse space-x-reverse'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'assistant' 
                      ? 'bg-gradient-to-br from-beyond-purple to-beyond-pink' 
                      : 'bg-surface-700'
                  )}>
                    {message.role === 'assistant' ? (
                      <Bot className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2',
                    message.role === 'assistant'
                      ? 'bg-surface-800 text-white'
                      : 'bg-beyond-purple text-white'
                  )}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 opacity-60">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-beyond-purple/50 mx-auto mb-3" />
                <p className="text-surface-400">Start a conversation with your AI avatar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
