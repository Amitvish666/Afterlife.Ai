'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Send, 
  ArrowLeft, 
  Loader2,
  User,
  Settings,
  LogOut,
  Sparkles,
  Users,
  MessageCircle,
  Settings as SettingsIcon,
  Trash2,
  Clock,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
  Play,
  User as UserIcon,
  HelpCircle,
  Shield,
  File,
  Bell,
  Menu,
  Volume2,
  VolumeX,
  Mic,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ThreeDMemorySphere from '@/components/ThreeDMemorySphere';
import { useAuthStore, usePersonaStore } from '@/store';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  persona_id: string;
  type: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { personas, setPersonas, tasks, currentPersona, setCurrentPersona } = usePersonaStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(searchParams.get('persona_id') || searchParams.get('persona'));
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState(true);
  const [showJobs, setShowJobs] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [speechPitch, setSpeechPitch] = useState(1.1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [showVoiceTab, setShowVoiceTab] = useState(false);
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize from localStorage - zustand persist handles this automatically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInitialized(true);
    }
  }, []);

  // Load personas on mount only if not already loaded
  useEffect(() => {
    if (isAuthenticated && initialized) {
      // Check if we already have personas in store (from persist)
      const storedData = localStorage.getItem('persona-storage');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (parsed.state && parsed.state.personas && parsed.state.personas.length > 0) {
            // We have persisted personas, no need to reload from API
            console.log('Using persisted personas:', parsed.state.personas.length);
            return;
          }
        } catch (e) {
          console.error('Failed to check persisted data:', e);
        }
      }
      // Only load from API if no persisted data
      loadPersonas();
    }
  }, [isAuthenticated, initialized]);

  // Auto-select first persona if none selected
  useEffect(() => {
    if (personas.length > 0 && !selectedPersonaId) {
      const firstPersona = personas[0];
      setSelectedPersonaId(firstPersona.id);
      setCurrentPersona(firstPersona);
    }
  }, [personas, selectedPersonaId, setCurrentPersona]);
  // Load sessions and memories when persona changes
  useEffect(() => {
    if (selectedPersonaId) {
      loadSessions(selectedPersonaId);
      loadMemories(selectedPersonaId);
    }
  }, [selectedPersonaId]);

  // Ensure voice settings panel is closed by default on landing or when persona changes
  useEffect(() => {
    setShowVoiceTab(false);
  }, [selectedPersonaId]);

  const loadMemories = async (personaId: string) => {
    try {
      const response = await apiClient.listMemories(personaId);
      if (response.data.data) {
        setMemories(response.data.data as any[]);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
      setMemories([]);
    }
  };

  // Reset voice and clear chat when language changes
  useEffect(() => {
    // Clear chat history when language changes to avoid mixing languages
    if (messages.length > 0) {
      setMessages([]);
    }
    
    if (availableVoices.length > 0) {
      if (language === 'hi') {
        const hindiVoice = availableVoices.find(v => 
          v.lang.startsWith('hi') || 
          v.lang.includes('Hindi')
        );
        setSelectedVoice(hindiVoice?.name || '');
      } else if (language === 'mr') {
        // Try Marathi first, then fallback to Hindi
        const marathiVoice = availableVoices.find(v => 
          v.lang.startsWith('mr') || 
          v.lang.includes('Marathi')
        );
        if (marathiVoice) {
          setSelectedVoice(marathiVoice.name);
        } else {
          // Fallback to Hindi if no Marathi voice available
          const hindiVoice = availableVoices.find(v => 
            v.lang.startsWith('hi') || 
            v.lang.includes('Hindi')
          );
          setSelectedVoice(hindiVoice?.name || '');
        }
      } else {
        // Default English voice selection - use Samantha (female voice)
        const englishVoice = availableVoices.find(v => 
          v.name.includes('Samantha')
        );
        if (englishVoice) {
          setSelectedVoice(englishVoice.name);
        } else {
          // Fallback to any English voice or first available
          const anyEnglishVoice = availableVoices.find(v => v.lang.startsWith('en'));
          setSelectedVoice(anyEnglishVoice?.name || (availableVoices.length > 0 ? availableVoices[0].name : ''));
        }
      }
    }
  }, [language, availableVoices]);

  // Load available voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoice) {
          // Auto-select voice based on language
          if (language === 'hi') {
            // Try to find a Hindi voice first
            const hindiVoice = voices.find(v => 
              v.lang.startsWith('hi') || 
              v.lang.includes('Hindi')
            );
            setSelectedVoice(hindiVoice?.name || '');
          } else if (language === 'mr') {
            // Try to find a Marathi voice
            const marathiVoice = voices.find(v => 
              v.lang.startsWith('mr') || 
              v.lang.includes('Marathi')
            );
            setSelectedVoice(marathiVoice?.name || '');
          } else {
            // Default English voice selection - use Samantha (female voice)
            const naturalVoice = voices.find(v => 
              v.name.includes('Samantha')
            );
            // Fallback to first available English voice or any voice
            if (naturalVoice) {
              setSelectedVoice(naturalVoice.name);
            } else {
              const englishVoice = voices.find(v => v.lang.startsWith('en'));
              setSelectedVoice(englishVoice?.name || (voices.length > 0 ? voices[0].name : ''));
            }
          }
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice, language]);

  // Speaking function using browser's Web Speech API
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Speech synthesis not supported in this browser');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Add natural pauses for more human-like speech
    const formattedText = text
      .replace(/\. /g, '.\n\n')
      .replace(/\? /g, '?\n\n')
      .replace(/! /g, '!\n\n');
    
    const utterance = new SpeechSynthesisUtterance(formattedText);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 0.9;
    
    // Get available voices
    let voices = window.speechSynthesis.getVoices();
    
    // If no voices loaded yet, wait and reload
    if (voices.length === 0) {
      console.log('No voices loaded, waiting...');
      toast.error('Loading voices, please try again in a moment');
      return;
    }
    
    // Try to find a voice for the selected language
    let selectedVoiceObj = null;
    
    // First, try exact language match
    if (language === 'mr') {
      // Try Marathi first
      selectedVoiceObj = voices.find(v => 
        v.lang.startsWith('mr') || 
        v.lang.includes('Marathi') ||
        v.name.toLowerCase().includes('marathi')
      );
      // Fallback to Hindi if no Marathi voice available
      if (!selectedVoiceObj) {
        console.log('No Marathi voice found, trying Hindi as fallback');
        selectedVoiceObj = voices.find(v => 
          v.lang.startsWith('hi') || 
          v.lang.includes('Hindi') ||
          v.name.toLowerCase().includes('hindi')
        );
        if (selectedVoiceObj) {
          utterance.lang = 'hi-IN'; // Use Hindi lang code since we're using Hindi voice
          toast('Using Hindi voice for Marathi (no Marathi voice available)', { icon: 'ℹ️' });
        }
      }
    } else if (language === 'hi') {
      selectedVoiceObj = voices.find(v => 
        v.lang.startsWith('hi') || 
        v.lang.includes('Hindi') ||
        v.name.toLowerCase().includes('hindi')
      );
      if (selectedVoiceObj) {
        utterance.lang = 'hi-IN';
      }
    } else {
      // Try to find Samantha or any English voice
      selectedVoiceObj = voices.find(v => 
        v.name.includes('Samantha')
      );
      if (!selectedVoiceObj) {
        // Fallback to any English voice
        selectedVoiceObj = voices.find(v => v.lang.startsWith('en'));
      }
      if (selectedVoiceObj) {
        utterance.lang = 'en-US';
      }
    }
    
    // Use selected voice if found
    if (selectedVoiceObj) {
      utterance.voice = selectedVoiceObj;
      console.log('Using voice:', selectedVoiceObj.name, 'for language:', language);
    } else {
      // Last resort: use any available voice with correct lang
      const fallbackVoice = voices.find(v => v.lang.startsWith(language === 'mr' ? 'hi' : language));
      if (fallbackVoice) {
        utterance.voice = fallbackVoice;
        console.log('Using fallback voice:', fallbackVoice.name);
      }
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Speech started');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('Speech ended');
    };
    utterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      setIsSpeaking(false);
      if (event.error !== 'canceled') {
        toast.error('Could not play voice. Please check your system voice settings.');
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const loadPersonas = async () => {
    try {
      const response = await apiClient.listPersonas();
      if (response.data.data) {
        const personasData = response.data.data as any[];
        setPersonas(personasData);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    }
  };

  const loadSessions = async (personaId: string) => {
    try {
      const response = await apiClient.listSessions(personaId);
      if (response.data.data) {
        setSessions(response.data.data as ChatSession[]);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    }
  };

  const handleDeletePersona = async (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // Try to delete from API, but continue even if it fails (for offline mode)
      try {
        await apiClient.deletePersona(personaId);
        console.log('API delete successful');
      } catch (apiError) {
        console.log('API delete failed, continuing with local deletion only');
      }
      
      setPersonas(personas.filter(p => p.id !== personaId));
      if (selectedPersonaId === personaId) {
        setSelectedPersonaId(null);
        setSelectedSessionId(null);
        setMessages([]);
      }
      toast.success('Persona deleted successfully');
    } catch (error) {
      console.error('Failed to delete persona:', error);
      toast.error('Failed to delete persona');
    }
  };

  const handleSelectPersona = (personaId: string) => {
    setSelectedPersonaId(personaId);
    setSelectedSessionId(null);
    setMessages([]);
    const persona = personas.find(p => p.id === personaId);
    if (persona) {
      setCurrentPersona(persona);
    }
  };

  const loadMessages = async (personaId: string, sessionId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.listMessages(personaId, sessionId);
      const data = response.data as any;
      if (data.success && data.messages) {
        const mappedMessages: Message[] = data.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    if (selectedPersonaId) {
      loadMessages(selectedPersonaId, sessionId);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedPersonaId) return;
    
    try {
      const response = await apiClient.createSession(selectedPersonaId);
      const newSession = response.data.data as ChatSession;
      setSessions([newSession, ...sessions]);
      setSelectedSessionId(newSession.id);
      setMessages([]);
      toast.success('New chat started');
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat session?')) {
      return;
    }
    
    if (!selectedPersonaId) return;
    
    try {
      await apiClient.deleteSession(selectedPersonaId, sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setMessages([]);
      }
      toast.success('Chat session deleted');
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedPersonaId || isLoading) return;

    const selectedPersona = personas.find(p => p.id === selectedPersonaId);

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    // Include previous messages in history
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    inputRef.current?.focus();
    setIsLoading(true);

    try {
      const response = await apiClient.sendMessage(selectedPersonaId, selectedSessionId || 'new', {
        message: input.trim(),
        conversation_history: messages,
        language,
        persona: selectedPersona,
        memories: memories
      });
      
      const data = response.data as any;
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || data.content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Auto-speak the response
      setTimeout(() => speakText(data.response || data.content), 500);
      
      // Update session ID if a new session was created
      if (data.conversation_id && !selectedSessionId) {
        setSelectedSessionId(data.conversation_id);
        loadSessions(selectedPersonaId);
      }
    } catch (error: any) {
      console.error('Failed to send message:', error);
      let errorMsg = 'AI service unavailable. Please check your connection.';
      if (error.response?.status === 503) {
        errorMsg = 'AI service (Ollama) is currently unavailable or starting up. Please ensure Ollama is running and the model is pulled.';
      } else if (error.response?.data?.error?.message) {
        errorMsg = error.response.data.error.message;
      }
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);
  const personaTasks = tasks.filter(t => t.persona_id === selectedPersonaId);

  // Mobile menu toggle
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to continue</h1>
          <button onClick={() => router.push('/login')} className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const renderSecondarySidebar = (isMobile = false) => (
    <div className={cn(
      "flex flex-col h-full",
      isMobile ? "p-6" : ""
    )}>
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-black text-surface-500 uppercase tracking-[0.3em] px-2">
            Neural Sessions
          </h2>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-surface-400 hover:text-white bg-surface-800 rounded-full">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => {
            handleCreateSession();
            if (isMobile) setMobileMenuOpen(false);
          }}
          disabled={!selectedPersonaId}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-beyond-purple/90 to-beyond-pink/90 text-white font-black text-[10px] tracking-widest hover:from-beyond-purple hover:to-beyond-pink shadow-[0_4px_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group border border-white/10"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>NEW SESSION</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        {/* Personas Quick Select */}
        <div>
          <p className="text-[10px] font-black text-surface-600 uppercase tracking-widest mb-3 px-2">Personas</p>
          <div className="space-y-1.5">
            {personas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => {
                  handleSelectPersona(persona.id);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-2xl transition-all group border",
                  selectedPersonaId === persona.id 
                    ? "bg-white/10 border-white/10 text-white shadow-lg backdrop-blur-md" 
                    : "border-transparent text-surface-500 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="w-9 h-9 rounded-xl bg-surface-900 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 relative group-hover:border-beyond-purple/50 transition-colors">
                  {persona.avatar_url ? (
                    <img src={persona.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                  {selectedPersonaId === persona.id && (
                    <div className="absolute inset-0 bg-beyond-purple/20 mix-blend-overlay"></div>
                  )}
                </div>
                <span className="truncate text-sm font-semibold tracking-wide text-left flex-1">{persona.title}</span>
                {selectedPersonaId === persona.id && (
                  <div className="w-2 h-2 rounded-full bg-beyond-purple shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Sessions */}
        {selectedPersonaId && (
          <div>
            <p className="text-[10px] font-black text-surface-600 uppercase tracking-widest mb-3 px-2">Memory Fragments</p>
            <div className="space-y-1.5">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    handleSelectSession(session.id);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-3 rounded-2xl transition-all group relative overflow-hidden border",
                    selectedSessionId === session.id 
                      ? "bg-beyond-purple/10 text-white border-beyond-purple/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]" 
                      : "border-transparent text-surface-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  <MessageCircle className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors",
                    selectedSessionId === session.id ? "text-beyond-purple" : "group-hover:text-surface-300"
                  )} />
                  <span className="truncate text-xs font-semibold tracking-wide text-left flex-1">{session.title}</span>
                  <Trash2 
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-surface-500"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                  />
                </button>
              ))}
              {sessions.length === 0 && (
                <div className="px-4 py-8 text-center bg-surface-900/30 rounded-2xl border border-white/5 border-dashed">
                  <p className="text-xs font-semibold text-surface-500 tracking-wide">No Active Sessions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Tasks */}
        {selectedPersonaId && personaTasks.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-surface-600 uppercase tracking-widest mb-4 px-2">Processing</p>
            <div className="space-y-3 px-2">
              {personaTasks.map((task) => (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-surface-500 uppercase tracking-tighter">{task.type}</span>
                    <span className="text-[9px] font-black text-beyond-purple">{task.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-surface-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      className="h-full bg-beyond-purple"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Persona Meta */}
      {selectedPersona && (
        <div className="p-6 mt-auto bg-surface-900/20 border-t border-white/5">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-beyond-purple/10 border border-beyond-purple/20 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <Sparkles className="w-5 h-5 text-beyond-purple animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Neural Link</p>
              <p className="text-[9px] text-emerald-400 font-bold uppercase flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Stable Connection
              </p>
            </div>
          </div>
          <p className="text-[10px] text-surface-400 font-medium leading-relaxed italic border-l-2 border-beyond-purple/30 pl-2">
            {selectedPersona.description?.slice(0, 80)}...
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 pt-24 h-full overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 flex overflow-hidden lg:pl-24">
          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <motion.aside
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed left-0 top-0 bottom-0 w-80 bg-surface-950 z-[70] border-r border-white/10 lg:hidden flex flex-col"
                >
                  {renderSecondarySidebar(true)}
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Desktop Secondary Sidebar */}
          <aside className="hidden lg:flex w-[320px] flex-col border-r border-white/5 bg-surface-950/40 backdrop-blur-2xl overflow-hidden relative z-20">
            {renderSecondarySidebar()}
          </aside>

          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-surface-950 relative overflow-hidden">
            {/* Ambient Background Glows & 3D Sphere */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute inset-0 z-0 opacity-40">
                <ThreeDMemorySphere isSpeaking={isSpeaking} />
              </div>
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-beyond-purple/5 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-beyond-pink/5 blur-[120px] rounded-full" />
            </div>

            {selectedPersona ? (
              <>
                {/* Header */}
                <header className="h-[76px] border-b border-white/5 flex items-center px-4 lg:px-8 bg-surface-950/60 backdrop-blur-2xl flex-shrink-0 relative z-10">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-3 border border-transparent hover:border-white/5"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center flex-1 min-w-0">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="hidden lg:flex p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-5 border border-transparent hover:border-white/5"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center space-x-4 truncate">
                      <div className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-surface-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden group">
                        {selectedPersona.avatar_url ? (
                          <img src={selectedPersona.avatar_url} alt="" className="w-full h-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                          <UserIcon className="w-5 h-5 lg:w-6 lg:h-6 text-beyond-purple" />
                        )}
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                      </div>
                      <div className="truncate">
                        <h1 className="text-base lg:text-lg font-bold text-white truncate tracking-tight">{selectedPersona.title}</h1>
                        <p className="text-surface-400 text-xs lg:text-sm truncate font-medium flex items-center gap-2 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {selectedPersona.description || 'Neural Assistant'}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center space-x-3">
                      <button
                        onClick={() => router.push('/avatar?persona=' + selectedPersona.id)}
                        className="flex items-center space-x-2 px-4 py-2.5 lg:px-5 lg:py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-white border border-white/10 hover:border-white/20 transition-all shadow-lg group"
                      >
                        <Video className="w-4 h-4 lg:w-5 lg:h-5 text-beyond-purple group-hover:text-beyond-pink transition-colors" />
                        <span className="hidden sm:inline text-xs lg:text-sm font-bold tracking-wide">AI Avatar</span>
                      </button>
                    </div>
                  </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 relative z-10 scroll-smooth">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-md"
                      >
                        <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-surface-900 border border-white/5 flex items-center justify-center relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
                          <MessageCircle className="w-10 h-10 text-beyond-purple relative z-10" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Begin Session</h2>
                        <p className="text-surface-400 text-lg leading-relaxed">
                          Establish a neural link with <span className="text-white font-semibold">{selectedPersona.title}</span>.
                        </p>
                      </motion.div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className={cn(
                            'flex items-end space-x-3 max-w-[85%] lg:max-w-[75%]',
                            message.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : 'mr-auto'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg border',
                            message.role === 'assistant' 
                              ? 'bg-surface-900 border-white/10' 
                              : 'bg-beyond-purple border-beyond-purple/50 hidden md:flex'
                          )}>
                            {message.role === 'assistant' ? (
                              <Sparkles className="w-4 h-4 text-beyond-purple" />
                            ) : (
                              <User className="w-4 h-4 text-white" />
                            )}
                          </div>
                          
                          <div className={cn(
                            'px-5 py-4 relative group shadow-xl backdrop-blur-md',
                            message.role === 'assistant'
                              ? 'bg-surface-800/80 text-surface-50 border border-white/5 rounded-2xl rounded-bl-sm'
                              : 'bg-gradient-to-br from-beyond-purple to-beyond-purple/90 text-white rounded-2xl rounded-br-sm border border-beyond-purple/50'
                          )}>
                            <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
                            
                            {message.role === 'assistant' && (
                              <div className="absolute -bottom-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                  onClick={() => speakText(message.content)}
                                  className="w-8 h-8 bg-surface-700 border border-white/10 rounded-full flex items-center justify-center shadow-lg hover:bg-surface-600 hover:scale-110 transition-all text-surface-300 hover:text-white"
                                  title="Speak message"
                                >
                                  {isSpeaking ? (
                                    <Volume2 className="w-4 h-4 text-beyond-purple animate-pulse" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )}
                            
                            <p className={cn(
                              "text-[10px] mt-2.5 font-bold tracking-wider uppercase",
                              message.role === 'assistant' ? "text-surface-500" : "text-beyond-purple-200/80"
                            )}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-end space-x-3 max-w-[85%] mr-auto"
                        >
                          <div className="w-8 h-8 rounded-xl bg-surface-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Sparkles className="w-4 h-4 text-beyond-purple animate-pulse" />
                          </div>
                          <div className="bg-surface-800/50 backdrop-blur-md border border-white/5 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center space-x-3 shadow-xl">
                            <div className="flex space-x-1.5">
                              <div className="w-1.5 h-1.5 bg-beyond-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-beyond-pink rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-beyond-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-surface-400 text-[10px] font-bold tracking-widest uppercase ml-2">Synthesizing</span>
                          </div>
                        </motion.div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 lg:p-6 bg-transparent relative z-20">
                  <div className="max-w-4xl mx-auto relative">
                    <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-xl rounded-[2rem] -z-10 border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]" />
                    
                    <div className="flex flex-col p-2.5 gap-2">
                      {/* Top Control Bar (Voice & Settings) */}
                      <div className="flex items-center justify-between px-3 pt-1.5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setShowVoiceTab(!showVoiceTab)}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              showVoiceTab 
                                ? "bg-beyond-purple/20 text-beyond-purple ring-1 ring-beyond-purple/30" 
                                : "bg-surface-800 text-surface-400 hover:text-white hover:bg-surface-700"
                            )}
                            title="Voice Settings"
                          >
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                          
                          {/* Language quick indicator */}
                          <div className="px-3 py-1.5 rounded-full bg-surface-800/80 border border-white/5 flex items-center space-x-2">
                            <Volume2 className="w-3.5 h-3.5 text-surface-400" />
                            <span className="text-[10px] font-black text-surface-300 uppercase tracking-[0.2em]">{language === 'en' ? 'ENGLISH' : language === 'hi' ? 'HINDI' : 'MARATHI'}</span>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showVoiceTab && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 py-4 mt-2 bg-surface-950/50 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 mx-2 mb-2">
                              <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Speed: <span className="text-white">{speechRate.toFixed(2)}x</span></label>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="2"
                                  step="0.1"
                                  value={speechRate}
                                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                  className="w-full accent-beyond-purple h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Pitch: <span className="text-white">{speechPitch.toFixed(2)}</span></label>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="2"
                                  step="0.1"
                                  value={speechPitch}
                                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                                  className="w-full accent-beyond-purple h-1.5 bg-surface-800 rounded-lg appearance-none cursor-pointer"
                                />
                              </div>
                              
                              {/* Language Selector */}
                              <div>
                                <label className="text-[10px] font-bold text-surface-400 uppercase tracking-widest block mb-2">Language</label>
                                <div className="relative">
                                  <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'mr')}
                                    className="w-full bg-surface-800 text-white text-sm font-medium rounded-xl px-4 py-2 border border-white/10 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-beyond-purple/50"
                                  >
                                    <option value="en">English</option>
                                    <option value="hi">हिन्दी (Hindi)</option>
                                    <option value="mr">मराठी (Marathi)</option>
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Main Input Row */}
                      <div className="flex items-end gap-3 px-2 pb-2 mt-1">
                        <button
                          onClick={() => {
                            // Optionally trigger voice recording
                          }}
                          className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center bg-surface-800/80 hover:bg-surface-700 text-surface-300 hover:text-white transition-all flex-shrink-0 border border-white/5 group"
                          title="Voice Input"
                        >
                          <Mic className="w-5 h-5 lg:w-6 lg:h-6 group-hover:text-beyond-pink transition-colors" />
                        </button>
                        
                        <div className="flex-1 relative">
                          <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                              }
                            }}
                            placeholder={`Message ${selectedPersona.title}...`}
                            disabled={isLoading}
                            rows={1}
                            className="w-full bg-surface-950/50 hover:bg-surface-950/80 focus:bg-surface-950 text-white placeholder-surface-500 text-sm lg:text-base rounded-2xl py-3.5 lg:py-4 pl-5 pr-12 focus:outline-none focus:ring-1 focus:ring-beyond-purple/50 border border-white/5 transition-all resize-none overflow-hidden min-h-[48px] lg:min-h-[56px] leading-relaxed"
                            style={{ 
                              height: 'auto',
                              minHeight: '48px',
                            }}
                          />
                        </div>
                        
                        <button
                          onClick={handleSend}
                          disabled={!input.trim() || isLoading}
                          className={cn(
                            'w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 shadow-lg border',
                            input.trim() && !isLoading
                              ? 'bg-gradient-to-r from-beyond-purple to-beyond-pink text-white hover:opacity-90 border-transparent shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02]'
                              : 'bg-surface-800 text-surface-500 cursor-not-allowed border-white/5'
                          )}
                        >
                          <Send className={cn("w-5 h-5 lg:w-6 lg:h-6 ml-0.5", input.trim() && !isLoading && "text-white")} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-surface-500 text-[10px] mt-4 font-bold tracking-[0.2em] uppercase">
                    Neural connections are secured via quantum encryption
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Mobile Header for no persona */}
                <header className="lg:hidden h-16 border-b border-white/5 flex items-center px-4 bg-surface-950/60 backdrop-blur-2xl relative z-10">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-4 border border-transparent hover:border-white/5"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-bold text-white tracking-tight">Neural Chats</span>
                </header>
                
                <div className="h-full flex items-center justify-center p-6 relative z-10">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md"
                  >
                    <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-surface-900 border border-white/5 flex items-center justify-center relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-50" />
                      <Users className="w-10 h-10 text-beyond-purple relative z-10" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">No Persona Selected</h2>
                    <p className="text-surface-400 mb-8 text-lg leading-relaxed">Select a persona from the sidebar or initialize a new neural template to begin.</p>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-beyond-purple to-beyond-pink text-white font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:scale-105"
                    >
                      Open Personas Directory
                    </button>
                  </motion.div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
