'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Users,
  MessageCircle,
  Settings,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Image,
  Loader2,
  Trash2,
  Download,
  Check,
  Mail,
  HelpCircle,
  File,
  Bell,
  Shield,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
  Smile,
  Frown,
  Meh,
  Laugh,
  Brain,
  MessageCircleHeart,
  Ear
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { useAuthStore, usePersonaStore, Persona } from '@/store';

interface GeneratedAvatar {
  id: string;
  image_url: string;
  provider: string;
  style: string;
  is_active: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type AvatarExpression = 'neutral' | 'happy' | 'sad' | 'thinking' | 'excited' | 'listening';

export default function AvatarPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { personas, currentPersona, setCurrentPersona } = usePersonaStore();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [generatedAvatars, setGeneratedAvatars] = useState<GeneratedAvatar[]>([]);
  
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [expression, setExpression] = useState<AvatarExpression>('neutral');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState<string>('21m00Tcm4TlvDq8ikWAM'); // Default Rachel voice
  const [availableVoices, setAvailableVoices] = useState<{voice_id: string; name: string}[]>([]);
  const [useElevenLabs, setUseElevenLabs] = useState(true);
  const [avatarPosition, setAvatarPosition] = useState({ x: 50, y: 50 }); // percentage positions
  const [isDragging, setIsDragging] = useState(false);
  const [avatarSize, setAvatarSize] = useState(200); // pixels
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Fetch available ElevenLabs voices
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/voices/voices', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` }
        });
        const data = await response.json();
        if (data.voices && data.voices.length > 0) {
          setAvailableVoices(data.voices);
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
      }
    };
    if (useElevenLabs) {
      fetchVoices();
    }
  }, [useElevenLabs]);

  // React to audio levels when listening - change expression based on volume
  useEffect(() => {
    if (isListening && audioLevel > 10) {
      // Change expression based on audio intensity
      if (audioLevel > 60) {
        setExpression('excited'); // Loud speech
      } else if (audioLevel > 30) {
        setExpression('listening'); // Normal speech
      }
    }
  }, [audioLevel, isListening]);

  useEffect(() => {
    if (currentPersona) {
      loadAvatars();
    }
  }, [currentPersona]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        // Create a new instance each time
        console.log('Creating SpeechRecognition instance');
        const recognition = new SpeechRecognition();
        
        // Use simple settings first
        recognition.continuous = false; // Changed to false for simpler testing
        recognition.interimResults = false; // Changed to false
        recognition.lang = 'en-US';
        
        // Remove onresult handler for now - just test if it starts
        recognition.onresult = (event: any) => {
          console.log('Speech result event:', event);
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          console.log('Transcript:', transcript);
          
          if (transcript.trim()) {
            setInputMessage(transcript);
          }
        };
        
        recognition.onerror = (event: any) => {
          console.log('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
        };
        
        recognition.onstart = () => {
          console.log('Speech recognition started');
        };
        
        // Store in ref
        recognitionRef.current = recognition;
        
        console.log('SpeechRecognition configured');
      } else {
        console.log('SpeechRecognition not supported in this browser');
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        try { 
          recognitionRef.current.stop(); 
        } catch {}
      }
      if (synthRef.current) window.speechSynthesis.cancel();
    };
  }, []);

  const loadAvatars = async () => {
    if (!currentPersona) return;
    setIsLoadingAvatars(true);
    try {
      const response = await apiClient.listAvatars(currentPersona.id);
      if (response.data.data) {
        setGeneratedAvatars(response.data.data as GeneratedAvatar[]);
      }
    } catch (error) {
      console.error('Failed to load avatars:', error);
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  const handleDeleteAvatar = async (avatarId: string) => {
    if (!currentPersona) return;
    try {
      await apiClient.deleteAvatar(currentPersona.id, avatarId);
      setGeneratedAvatars(generatedAvatars.filter(a => a.id !== avatarId));
      toast.success('Avatar deleted');
    } catch (error) {
      toast.error('Failed to delete avatar');
    }
  };

  const handleSetActiveAvatar = async (avatar: GeneratedAvatar) => {
    if (!currentPersona) return;
    try {
      await apiClient.createAvatar(currentPersona.id, { image_url: avatar.image_url, style: avatar.style });
      toast.success('Avatar set as active!');
    } catch (error) {
      toast.error('Failed to set active avatar');
    }
  };

  const startMedia = async () => {
    try {
      if (!navigator.mediaDevices) {
        setInCall(true);
        if (currentPersona) {
          const welcomeMsg: ChatMessage = {
            id: '1', role: 'assistant',
            content: `Hello! I'm ${currentPersona.title}. Let's chat!`,
            timestamp: new Date()
          };
          setMessages([welcomeMsg]);
          speak(welcomeMsg.content);
        }
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch { stream = null; }
      }

      if (stream && stream.getTracks().length > 0) {
        mediaStreamRef.current = stream;
        if (videoRef.current && stream.getVideoTracks().length > 0) {
          videoRef.current.srcObject = stream;
          setIsCameraOn(true);
        }
        setIsMuted(stream.getAudioTracks().length === 0);
      }
      
      setInCall(true);
      if (currentPersona) {
        const welcomeMsg: ChatMessage = {
          id: '1', role: 'assistant',
          content: `Hello! I'm ${currentPersona.title}. I'm so happy to see you! How are you doing today?`,
          timestamp: new Date()
        };
        setMessages([welcomeMsg]);
        speak(welcomeMsg.content);
      }
      toast.success('Video call started');
    } catch (error) {
      setInCall(true);
      if (currentPersona) {
        const welcomeMsg: ChatMessage = {
          id: '1', role: 'assistant',
          content: `Hello! I'm ${currentPersona.title}. Welcome! Let's chat!`,
          timestamp: new Date()
        };
        setMessages([welcomeMsg]);
        speak(welcomeMsg.content);
      }
    }
  };

  const stopMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (synthRef.current) window.speechSynthesis.cancel();
    setInCall(false);
    setIsCameraOn(false);
    setIsMuted(false);
  };

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getAudioTracks()[0];
      if (track) { track.enabled = isMuted; setIsMuted(!isMuted); }
    }
  };

  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      if (track) { track.enabled = !isCameraOn; setIsCameraOn(!isCameraOn); }
    }
  };

  // Drag handlers for avatar positioning
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const container = e.currentTarget.closest('.avatar-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        // Clamp values between 0 and 100
        setAvatarPosition({ 
          x: Math.max(0, Math.min(100, x)), 
          y: Math.max(0, Math.min(100, y)) 
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle scroll wheel for resizing
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -20 : 20;
    setAvatarSize(prev => Math.max(100, Math.min(500, prev + delta)));
  };

  const speak = async (text: string) => {
    if (useElevenLabs) {
      // Use ElevenLabs TTS
      try {
        setIsSpeaking(true);
        setExpression('excited');
        
        const response = await fetch('/api/voices/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
          },
          body: JSON.stringify({
            text: text,
            voice_id: selectedVoice,
            stability: 0.5,
            similarity_boost: 0.75
          })
        });
        
        const data = await response.json();
        
        if (data.audio) {
          const audio = new Audio(data.audio);
          audio.onended = () => {
            setIsSpeaking(false);
            setExpression('neutral');
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            setExpression('neutral');
          };
          await audio.play();
        } else {
          setIsSpeaking(false);
          setExpression('neutral');
        }
      } catch (error) {
        console.error('ElevenLabs TTS error:', error);
        setIsSpeaking(false);
        setExpression('neutral');
        // Fallback to browser TTS
        speakWithBrowser(text);
      }
    } else {
      speakWithBrowser(text);
    }
  };
  
  const speakWithBrowser = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.onstart = () => { setIsSpeaking(true); setExpression('excited'); };
      utterance.onend = () => { setIsSpeaking(false); setExpression('neutral'); };
      utterance.onerror = () => { setIsSpeaking(false); setExpression('neutral'); };
      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    console.log('Start listening clicked, current state:', isListening);
    
    // Set listening state immediately so button turns green
    setIsListening(true);
    setExpression('listening');
    toast.success('Voice input started - speak now!');
    
    // Try both SpeechRecognition APIs
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || (window as any).mozSpeechRecognition || (window as any).msSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported');
      setIsListening(false);
      toast.error('Speech recognition requires Chrome or Edge browser. Firefox/Safari not supported.');
      return;
    }
    
    console.log('Creating fresh SpeechRecognition instance');
    const recognition = new SpeechRecognition();
    
    // Try different settings
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    // Add all event handlers BEFORE starting
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
    };
    
    recognition.onresult = (event: any) => {
      console.log('Speech result event:', event);
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      console.log('Transcript:', transcript);
      
      if (transcript.trim()) {
        setInputMessage(transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.log('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };
    
    // Store in ref
    recognitionRef.current = recognition;
    
    // Start immediately after setting all handlers
    try {
      console.log('Starting recognition...');
      recognition.start();
    } catch (error: any) {
      console.error('Voice error:', error);
      setIsListening(false);
      console.log('Could not start voice input:', error.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        // Check if recognition is running before stopping
        if (recognitionRef.current.state === 'running') {
          recognitionRef.current.stop();
        }
      } catch (error) {
        console.log('Error stopping recognition:', error);
        // Ignore errors when stopping - it might already be stopped
      }
    }
    setIsListening(false);
    setExpression('neutral');
    toast.success('Voice input stopped');
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentPersona) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: inputMessage, timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoadingResponse(true);
    setExpression('thinking');
    
    try {
      const response = await fetch(`/api/personas/${currentPersona.id}/sessions/new/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}` },
        body: JSON.stringify({ message: inputMessage.trim(), conversation_history: messages, persona: currentPersona })
      });
      
      if (response.ok) {
        const data = await response.json();
        const aiMessage: ChatMessage = {
          id: Date.now() + '_ai', role: 'assistant',
          content: data.response || data.content || 'I understand.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        
        const content = aiMessage.content.toLowerCase();
        if (content.includes('happy') || content.includes('wonderful')) setExpression('happy');
        else if (content.includes('sorry') || content.includes('sad')) setExpression('sad');
        else if (content.includes('!')) setExpression('excited');
        else setExpression('neutral');
        
        speak(aiMessage.content);
      }
    } catch (error) {
      console.error('Failed to send:', error);
      toast.error('Failed to get response');
      setExpression('neutral');
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const activeAvatar = generatedAvatars.find(a => a.is_active) || generatedAvatars[0];

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-surface-950">
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-900/50 backdrop-blur-xl border-r border-surface-800/50 p-4 z-40">
        <div className="flex items-center space-x-2 mb-8 px-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/favicon.svg" alt="Afterlife AI Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-xl font-bold gradient-text">Afterlife AI</span>
          </Link>
        </div>

        <nav className="space-y-2">
          <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50">
            <Users className="w-5 h-5" /><span>Personas</span>
          </Link>
          <Link href="/dashboard/chats" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50">
            <MessageCircle className="w-5 h-5" /><span>Chats</span>
          </Link>
          <Link href="/dashboard/avatar" className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-beyond-purple/20 text-white">
            <Image className="w-5 h-5" /><span>Avatar</span>
          </Link>
          <Link href="/dashboard/settings" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50">
            <Settings className="w-5 h-5" /><span>Settings</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t border-surface-800/50">
          <button onClick={() => setShowUserMenu(!showUserMenu)} className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50">
            <UserIcon className="w-5 h-5" /><span>User</span>
            <ChevronDown className={`w-4 h-4 ml-auto ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
          {showUserMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 mt-2 overflow-hidden">
              <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-surface-800/50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                  <span className="text-white font-semibold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
                <div><p className="text-white font-medium">{user?.name}</p><p className="text-surface-400 text-sm">{user?.email}</p></div>
              </div>
              <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-red-400">
                <LogOut className="w-4 h-4" /><span>Log Out</span>
              </button>
            </motion.div>
          )}
        </div>
      </aside>

      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Avatar Video Call</h1>
              <p className="text-surface-400">Have a face-to-face conversation with your AI persona</p>
            </div>
            {!inCall && (
              <button onClick={startMedia} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-beyond-purple to-beyond-pink rounded-xl text-white font-semibold">
                <Phone className="w-5 h-5" /><span>Start Video Call</span>
              </button>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-surface-400 mb-2">Select Persona</label>
            <select value={currentPersona?.id || ''} onChange={(e) => { const p = personas.find((p: Persona) => p.id === e.target.value); if (p) setCurrentPersona(p); }}
              className="w-full max-w-md px-4 py-3 bg-surface-900 border border-surface-800 rounded-xl text-white" disabled={inCall}>
              <option value="">Select a persona...</option>
              {personas.map((p: Persona) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-surface-400 mb-2">AI Voice (ElevenLabs)</label>
            <div className="flex items-center space-x-4">
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}
                className="flex-1 px-4 py-3 bg-surface-900 border border-surface-800 rounded-xl text-white" disabled={inCall}>
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel (Female)</option>
                <option value="AZnzlk1XvdvUeBnXmlld">Domi (Female)</option>
                <option value="EXAVITQu4vr4xnSDxMaL">Bella (Female)</option>
                <option value="ErXwobaYiN019PkySvjV">Antoni (Male)</option>
                <option value="MF3mGyEYi5IxKVg6KSZA">Josh (Male)</option>
                <option value="nPczCjz82KWdKScP46A1">Arnold (Male)</option>
                {availableVoices.map(v => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                ))}
              </select>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={useElevenLabs} onChange={(e) => setUseElevenLabs(e.target.checked)}
                  className="w-5 h-5 rounded bg-surface-800 border-surface-700 text-beyond-purple" />
                <span className="text-sm text-surface-400">Use ElevenLabs</span>
              </label>
            </div>
          </div>

          {/* Avatar Position & Size Controls */}
          {inCall && (
            <div className="mb-6 p-4 bg-surface-800 rounded-xl border border-surface-700">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-white font-medium">Avatar Controls</h4>
                <button 
                  onClick={() => setAvatarPosition({ x: 50, y: 50 })}
                  className="text-sm text-beyond-purple hover:text-purple-400"
                >
                  Reset Position
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-surface-400 mb-1">Size: {avatarSize}px</label>
                  <input 
                    type="range" 
                    min="100" 
                    max="500" 
                    value={avatarSize} 
                    onChange={(e) => setAvatarSize(Number(e.target.value))}
                    className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">X Position: {Math.round(avatarPosition.x)}%</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={avatarPosition.x} 
                      onChange={(e) => setAvatarPosition({ ...avatarPosition, x: Number(e.target.value) })}
                      className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Y Position: {Math.round(avatarPosition.y)}%</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={avatarPosition.y} 
                      onChange={(e) => setAvatarPosition({ ...avatarPosition, y: Number(e.target.value) })}
                      className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-xs text-surface-500">Or drag the avatar directly on the screen</p>
              </div>
            </div>
          )}

          {inCall ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div 
                  className="relative bg-surface-900 rounded-3xl overflow-hidden aspect-video border border-surface-800 avatar-container"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900">
                    {/* Draggable Avatar */}
                    {activeAvatar?.image_url ? (
                      <div 
                        className={`absolute cursor-move select-none ${isDragging ? 'opacity-80' : ''}`}
                        style={{ 
                          left: `${avatarPosition.x}%`, 
                          top: `${avatarPosition.y}%`,
                          transform: 'translate(-50%, -50%)',
                          width: avatarSize,
                          height: avatarSize,
                          maxWidth: '80%',
                          maxHeight: '80%'
                        }}
                        onMouseDown={handleMouseDown}
                        onWheel={handleWheel}
                      >
                        <motion.div 
                          animate={{ scale: isSpeaking ? [1, 1.02, 1] : 1, x: isListening ? [-2, 2, -2] : 0 }} 
                          transition={{ repeat: isSpeaking || isListening ? Infinity : 0, duration: isListening ? 0.3 : 0.5 }}
                          className="w-full h-full"
                        >
                          <img 
                            src={activeAvatar.image_url} 
                            alt="AI Avatar" 
                            className={`w-full h-full object-cover rounded-full ${expression === 'listening' ? 'brightness-110 saturate-90 hue-rotate-15' : expression === 'happy' ? 'brightness-110 saturate-110' : expression === 'sad' ? 'brightness-90' : 'brightness-100'}`} 
                            draggable={false}
                          />
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full whitespace-nowrap">
                            {expression === 'listening' && <><Ear className="w-4 h-4 text-blue-400" /><span className="text-white text-xs">Listening...</span></>}
                            {expression === 'happy' && <><Laugh className="w-4 h-4 text-yellow-400" /><span className="text-white text-xs">Happy</span></>}
                            {expression === 'sad' && <><Frown className="w-4 h-4 text-blue-400" /><span className="text-white text-xs">Sad</span></>}
                            {expression === 'thinking' && <><Brain className="w-4 h-4 text-purple-400" /><span className="text-white text-xs">Thinking</span></>}
                            {expression === 'excited' && <><Smile className="w-4 h-4 text-green-400" /><span className="text-white text-xs">Excited</span></>}
                            {expression === 'neutral' && <><Meh className="w-4 h-4 text-surface-400" /><span className="text-white text-xs">Neutral</span></>}
                          </motion.div>
                          {/* Size indicator */}
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-surface-500">
                            {avatarSize}px • Drag to move • Scroll to resize
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center"><UserIcon className="w-32 h-32 text-surface-600 mx-auto mb-4" /><p className="text-surface-400">No avatar selected</p></div>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 w-48 h-36 bg-surface-800 rounded-xl overflow-hidden border-2 border-surface-700">
                    <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!isCameraOn ? 'hidden' : ''}`} />
                    {!isCameraOn && <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-12 h-12 text-surface-500" /></div>}
                  </div>
                  {isSpeaking && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-4 left-4 flex items-center space-x-2 bg-green-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Volume2 className="w-4 h-4 text-green-400" /><span className="text-green-400 text-sm">Speaking</span>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-4 py-4">
                  <button onClick={toggleMute} className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-surface-700'}`}>
                    {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                  </button>
                  <button onClick={toggleCamera} className={`p-4 rounded-full ${!isCameraOn ? 'bg-red-500' : 'bg-surface-700'}`}>
                    {isCameraOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
                  </button>
                  <button onClick={isSpeaking ? () => { window.speechSynthesis.cancel(); setIsSpeaking(false); } : () => {}} className={`p-4 rounded-full ${isSpeaking ? 'bg-beyond-purple' : 'bg-surface-700'}`}>
                    {isSpeaking ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
                  </button>
                  <button onClick={stopMedia} className="p-4 bg-red-500 rounded-full"><PhoneOff className="w-6 h-6 text-white" /></button>
                </div>
              </div>

              <div className="bg-surface-900 rounded-3xl border border-surface-800 flex flex-col h-[600px]">
                <div className="p-4 border-b border-surface-800 flex items-center space-x-3">
                  <MessageCircleHeart className="w-5 h-5 text-beyond-purple" />
                  <h3 className="text-white font-semibold">Chat</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-beyond-purple text-white rounded-br-md' : 'bg-surface-800 text-white rounded-bl-md'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-60 mt-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isLoadingResponse && (
                    <div className="flex justify-start">
                      <div className="bg-surface-800 px-4 py-2 rounded-2xl rounded-bl-md">
                        <div className="flex space-x-1">
                          {[0, 1, 2].map(i => <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} className="w-2 h-2 bg-surface-400 rounded-full" />)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-surface-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <button onClick={isListening ? stopListening : startListening} className={`p-2 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}>
                      {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
                    </button>
                    <span className="text-xs text-surface-500">{isListening ? 'Say something...' : 'Click to speak'}</span>
                    {isListening && (
                      <div className="flex-1 mx-4 h-6 flex items-center space-x-0.5">
                        {[...Array(20)].map((_, i) => (
                          <motion.div key={i} className="w-1 bg-gradient-to-t from-green-400 to-blue-500 rounded-full" animate={{ height: audioLevel > (i + 1) * 5 ? Math.max(4, audioLevel / 3) : 4 }} transition={{ duration: 0.1 }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} onKeyPress={handleKeyPress}
                      placeholder="Type a message..." className="flex-1 px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple" disabled={isLoadingResponse} />
                    <button id="send-message-btn" onClick={sendMessage} disabled={!inputMessage.trim() || isLoadingResponse}
                      className="p-3 bg-beyond-purple rounded-xl text-white disabled:opacity-50"><Send className="w-5 h-5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Your Avatars</h2>
              {isLoadingAvatars ? (
                <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-beyond-purple" /></div>
              ) : generatedAvatars.length === 0 ? (
                <div className="bg-surface-900/30 border border-surface-800/50 rounded-2xl p-12 text-center">
                  <Image className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                  <p className="text-surface-400">No avatars available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedAvatars.map(avatar => (
                    <motion.div key={avatar.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-surface-900/50 border border-surface-800/50 rounded-2xl overflow-hidden">
                      <div className="aspect-square bg-surface-800 flex items-center justify-center relative">
                        {avatar.image_url ? <img src={avatar.image_url} alt="Avatar" className="w-full h-full object-cover" /> : <Image className="w-24 h-24 text-surface-600" />}
                        {avatar.is_active && <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center"><Check className="w-3 h-3" /><span>Active</span></div>}
                        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                          <button onClick={() => handleSetActiveAvatar(avatar)} className="p-3 bg-beyond-purple rounded-full"><Check className="w-5 h-5 text-white" /></button>
                          <button className="p-3 bg-surface-700 rounded-full"><Download className="w-5 h-5 text-white" /></button>
                          <button onClick={() => handleDeleteAvatar(avatar.id)} className="p-3 bg-red-500/20 rounded-full"><Trash2 className="w-5 h-5 text-red-400" /></button>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div><h3 className="text-white font-medium capitalize">{avatar.style} Avatar</h3><p className="text-surface-400 text-sm">{new Date(avatar.created_at).toLocaleDateString()}</p></div>
                          <span className="text-surface-500 text-xs uppercase">{avatar.provider}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
