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
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(searchParams.get('persona_id'));
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
  const [showVoiceTab, setShowVoiceTab] = useState(true);
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-surface-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <button
          onClick={() => {
            handleCreateSession();
            if (isMobile) setMobileMenuOpen(false);
          }}
          disabled={!selectedPersonaId}
          className="w-full flex items-center justify-center space-x-2 px-4 py-4 rounded-2xl bg-beyond-purple text-white font-black text-xs tracking-widest hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
          <span>INITIALIZE CHAT</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide">
        {/* Personas Quick Select */}
        <div>
          <p className="text-[10px] font-black text-surface-600 uppercase tracking-widest mb-4 px-2">Personas</p>
          <div className="space-y-1">
            {personas.map((persona) => (
              <button
                key={persona.id}
                onClick={() => {
                  handleSelectPersona(persona.id);
                  if (isMobile) setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group",
                  selectedPersonaId === persona.id 
                    ? "bg-white/10 text-white" 
                    : "text-surface-500 hover:text-white hover:bg-white/5"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-surface-900 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {persona.avatar_url ? (
                    <img src={persona.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4" />
                  )}
                </div>
                <span className="truncate text-xs font-bold tracking-wide text-left flex-1">{persona.title}</span>
                {selectedPersonaId === persona.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-beyond-purple shadow-[0_0_8px_#8b5cf6]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Sessions */}
        {selectedPersonaId && (
          <div>
            <p className="text-[10px] font-black text-surface-600 uppercase tracking-widest mb-4 px-2">Memory Fragments</p>
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    handleSelectSession(session.id);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all group relative overflow-hidden",
                    selectedSessionId === session.id 
                      ? "bg-beyond-purple/10 text-beyond-purple border border-beyond-purple/20" 
                      : "text-surface-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Folder className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate text-xs font-bold tracking-wide text-left flex-1">{session.title}</span>
                  <Trash2 
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                  />
                </button>
              ))}
              {sessions.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[10px] font-bold text-surface-700 uppercase tracking-widest">No Active Sessions</p>
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
            <div className="w-10 h-10 rounded-xl bg-beyond-purple/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-beyond-purple animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Neural Link</p>
              <p className="text-[9px] text-emerald-500 font-bold uppercase">Stable Connection</p>
            </div>
          </div>
          <p className="text-[10px] text-surface-500 font-medium leading-relaxed italic">
            {selectedPersona.description?.slice(0, 80)}...
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 pt-16 h-full overflow-hidden">
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
          <aside className="hidden lg:flex w-80 flex-col border-r border-white/5 bg-surface-950/30 backdrop-blur-xl overflow-hidden">
            {renderSecondarySidebar()}
          </aside>

          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-surface-950/50 relative overflow-hidden">
            {selectedPersona ? (
              <>
                {/* Header */}
                <header className="h-16 border-b border-surface-800/50 flex items-center px-4 lg:px-6 bg-surface-900/30 flex-shrink-0">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="lg:hidden p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-2"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  
                  <div className="flex items-center flex-1 min-w-0">
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="hidden lg:flex p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-4"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center flex-shrink-0">
                        {selectedPersona.avatar_url ? (
                          <img src={selectedPersona.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 text-beyond-purple" />
                        )}
                      </div>
                      <div className="truncate">
                        <h1 className="text-sm lg:text-lg font-semibold text-white truncate">{selectedPersona.title}</h1>
                        <p className="text-surface-400 text-[10px] lg:text-sm truncate">
                          {selectedPersona.description || 'Neural Assistant'}
                        </p>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center space-x-2">
                      <button
                        onClick={() => router.push('/avatar?persona=' + selectedPersona.id)}
                        className="flex items-center space-x-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg bg-gradient-to-r from-beyond-purple to-beyond-pink text-white hover:opacity-90 transition-opacity"
                      >
                        <Video className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="hidden sm:inline text-xs lg:text-sm font-bold">AI Avatar</span>
                      </button>
                    </div>
                  </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center max-w-md"
                      >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center">
                          <MessageCircle className="w-10 h-10 text-beyond-purple" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Start a Conversation</h2>
                        <p className="text-surface-400">
                          Say hello to {selectedPersona.title} and start sharing your thoughts and feelings.
                        </p>
                      </motion.div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
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
                              <Sparkles className="w-4 h-4 text-white" />
                            ) : (
                              <User className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className={cn(
                            'max-w-[70%] rounded-2xl px-4 py-3 relative group',
                            message.role === 'assistant'
                              ? 'bg-surface-800 text-white'
                              : 'bg-beyond-purple text-white'
                          )}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.role === 'assistant' && (
                              <button
                                onClick={() => speakText(message.content)}
                                className="absolute -bottom-2 -right-2 w-8 h-8 bg-beyond-purple rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="Speak message"
                              >
                                {isSpeaking ? (
                                  <Volume2 className="w-4 h-4 text-white" />
                                ) : (
                                  <Volume2 className="w-4 h-4 text-white" />
                                )}
                              </button>
                            )}
                            <p className="text-xs mt-1 opacity-60">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                      
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center space-x-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                          </div>
                          <div className="bg-surface-800 rounded-2xl px-4 py-3 flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 text-beyond-purple animate-spin" />
                            <span className="text-surface-400 text-sm">Typing...</span>
                          </div>
                        </motion.div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-surface-800/50 bg-surface-900/30">
                  <div className="max-w-4xl mx-auto">
                    {/* Bottom Area with Voice Tab and Input */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3">
                      {/* Voice Tab on Left */}
                      <div className="flex">
                        <button
                          onClick={() => setShowVoiceTab(!showVoiceTab)}
                          className="w-10 h-auto lg:h-[42px] px-2 bg-gradient-to-br from-beyond-purple to-beyond-pink rounded-l-xl flex items-center justify-center text-white transition-all hover:from-beyond-purple/80 hover:to-beyond-pink/80"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                        {showVoiceTab && (
                          <div className="hidden lg:block w-40 p-2 bg-gradient-to-br from-surface-800/80 to-surface-900/80 rounded-r-xl border border-white/10 border-l-0 -ml-[1px]">
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] text-surface-400 block mb-0.5">Speed: {speechRate.toFixed(2)}</label>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="2"
                                  step="0.1"
                                  value={speechRate}
                                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                                  className="w-full accent-beyond-purple h-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-surface-400 block mb-0.5">Pitch: {speechPitch.toFixed(2)}</label>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="2"
                                  step="0.1"
                                  value={speechPitch}
                                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                                  className="w-full accent-beyond-purple h-1"
                                />
                              </div>
                              
                              {/* Language Selector */}
                              <div>
                                <label className="text-[10px] text-surface-400 block mb-0.5">Language</label>
                                <select
                                  value={language}
                                  onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'mr')}
                                  className="w-full bg-surface-700/50 text-white text-[10px] rounded px-1.5 py-1 border border-white/10"
                                >
                                  <option value="en">English</option>
                                  <option value="hi">हिन्दी (Hindi)</option>
                                  <option value="mr">मराठी (Marathi)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Input Area */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 lg:space-x-3 bg-surface-800/50 rounded-2xl px-3 lg:px-4 py-2 lg:py-3 border border-surface-700/50 focus-within:border-beyond-purple/50 transition-colors">
                          <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            placeholder={'Message ' + selectedPersona.title + '...'}
                            disabled={isLoading}
                            className="flex-1 bg-transparent text-white placeholder-surface-400 focus:outline-none"
                          />
                          <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={cn(
                              'p-2 rounded-xl transition-colors',
                              input.trim() && !isLoading
                                ? 'bg-beyond-purple text-white hover:bg-beyond-purple/80'
                                : 'bg-surface-700 text-surface-400 cursor-not-allowed'
                            )}
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-surface-500 text-xs mt-2">
                      Your conversations are private and stored securely
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Mobile Header for no persona */}
                <header className="lg:hidden h-16 border-b border-surface-800/50 flex items-center px-4 bg-surface-900/30">
                  <button
                    onClick={() => setMobileMenuOpen(true)}
                    className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-4"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <span className="text-lg font-semibold text-white">Chats</span>
                </header>
                
                <div className="h-full flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center">
                      <Users className="w-10 h-10 text-beyond-purple" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">No Persona Selected</h2>
                    <p className="text-surface-400 mb-6">Select a persona from the sidebar or create a new one</p>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="btn-primary"
                    >
                      Go to Personas
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
