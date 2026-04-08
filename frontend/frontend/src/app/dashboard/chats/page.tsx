'use client';

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

  // Load sessions when persona changes
  useEffect(() => {
    if (selectedPersonaId) {
      loadSessions(selectedPersonaId);
    }
  }, [selectedPersonaId]);

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

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setMessages([]);
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
      // Use frontend API directly since backend requires Python
      const response = await fetch(`/api/personas/${selectedPersonaId}/sessions/new/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({
          message: input.trim(),
          conversation_history: messages,
          language,
          persona: selectedPersona,
          memories: []
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || data.content,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto-speak the response
        setTimeout(() => speakText(data.response || data.content), 500);
      } else {
        // API returned error - show error message to user
        try {
          const errorData = await response.json();
          console.error('Chat API error:', errorData);
          alert(errorData?.error?.message || 'AI service unavailable. Please check your API keys.');
        } catch (e) {
          // If response is not JSON
          console.error('Chat API error: Failed to parse error response');
          alert('AI service unavailable. Please check your API keys.');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
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

  // Responsive sidebar class
  const getSidebarClass = () => {
    if (mobileMenuOpen) {
      return 'fixed left-0 top-0 h-full w-72 bg-surface-900/50 backdrop-blur-xl border-r border-surface-800/50 p-4 flex flex-col z-50';
    }
    return 'fixed left-0 top-0 h-full w-72 bg-surface-900/50 backdrop-blur-xl border-r border-surface-800/50 p-4 flex flex-col z-50 -translate-x-full lg:translate-x-0 transition-transform duration-300';
  };

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

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Sidebar - Hidden on mobile, toggleable */}
      <aside className={getSidebarClass()}>
        <div className="flex items-center justify-between mb-6 px-2">
          <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Beyond Life AI</span>
          </button>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-800 text-surface-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-2 mb-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span>Personas</span>
          </button>
          <button 
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-beyond-purple/20 text-white"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chats</span>
          </button>
          <button 
            onClick={() => router.push('/dashboard/settings')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <SettingsIcon className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </nav>

        {/* User Tab - Collapsible */}
        <div className="mt-auto pt-4 border-t border-surface-800/50">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <UserIcon className="w-5 h-5" />
            <span>User</span>
            <ChevronDown className={'w-4 h-4 ml-auto transition-transform ' + (showUserMenu ? 'rotate-180' : '')} />
          </button>
          
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 mt-2 overflow-hidden"
              >
                {/* User Info */}
                <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-surface-800/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
                    <p className="text-surface-400 text-sm truncate">{user?.email}</p>
                  </div>
                </div>
                
                {/* Menu Options */}
                <button 
                  onClick={() => router.push('/dashboard/settings')}
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Privacy Policy</span>
                </button>
                <button 
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <File className="w-4 h-4" />
                  <span>Terms of Service</span>
                </button>
                <button 
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help & Support</span>
                </button>
                <button 
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Personas Section */}
        <div className="flex-1 overflow-y-auto">
          {personas.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Your Personas</span>
                {showSessions ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {showSessions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 mt-2"
                  >
                    {personas.map((persona) => (
                      <div key={persona.id}>
                        <button
                          onClick={() => handleSelectPersona(persona.id)}
                          className={cn(
                            'w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors group',
                            selectedPersonaId === persona.id
                              ? 'bg-beyond-purple/20 text-white'
                              : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center flex-shrink-0">
                            {persona.avatar_url ? (
                              <img src={persona.avatar_url} alt={persona.title} className="w-7 h-7 rounded-lg object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-beyond-purple" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <span className="truncate block">{persona.title}</span>
                          </div>
                          <span
                            role="button"
                            onClick={(e) => handleDeletePersona(persona.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-all cursor-pointer"
                            title="Delete persona"
                          >
                            <Trash2 className="w-4 h-4" />
                          </span>
                        </button>
                        
                        {/* Sessions for this persona */}
                        {selectedPersonaId === persona.id && (
                          <div className="ml-4 pl-4 border-l border-surface-700/50 mt-1 space-y-1">
                            <button
                              onClick={handleCreateSession}
                              className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-surface-400 hover:text-white hover:bg-surface-800/30 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              <span>New Chat</span>
                            </button>
                            
                            {sessions.map((session) => (
                              <button
                                key={session.id}
                                onClick={() => handleSelectSession(session.id)}
                                className={cn(
                                  'w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-colors group',
                                  selectedSessionId === session.id
                                    ? 'bg-beyond-purple/10 text-white'
                                    : 'text-surface-400 hover:text-white hover:bg-surface-800/30'
                                )}
                              >
                                <Folder className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate flex-1 text-left">{session.title}</span>
                                <span
                                  role="button"
                                  onClick={(e) => handleDeleteSession(session.id, e)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-all cursor-pointer"
                                  title="Delete session"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </span>
                              </button>
                            ))}
                            
                            {sessions.length === 0 && (
                              <p className="px-4 py-2 text-xs text-surface-500">No chat sessions yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tasks Section */}
          {selectedPersonaId && personaTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowJobs(!showJobs)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider hover:text-white transition-colors"
              >
                <span>Tasks</span>
                {showJobs ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              <AnimatePresence>
                {showJobs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 mt-2"
                  >
                    {personaTasks.map((task) => (
                      <div
                        key={task.id}
                        className="px-4 py-2 rounded-lg bg-surface-800/30"
                      >
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-beyond-purple" />
                          <span className="text-sm text-white capitalize">{task.type}</span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2">
                          <div className="flex-1 h-1 bg-surface-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-beyond-purple transition-all duration-300"
                              style={{ width: task.progress + '%' }}
                            />
                          </div>
                          <span className="text-xs text-surface-400">{Math.round(task.progress)}%</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Chat Area */}
      <main className="flex-1 flex flex-col h-screen lg:ml-72">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-surface-800/50 flex items-center px-4 bg-surface-900/30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>
        
        {selectedPersona ? (
          <>
            {/* Desktop Chat Header */}
            <header className="hidden lg:flex h-16 border-b border-surface-800/50 flex items-center px-6 bg-surface-900/30">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors mr-4"
                title="Back to Personas"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center">
                  {selectedPersona.avatar_url ? (
                    <img src={selectedPersona.avatar_url} alt={selectedPersona.title} className="w-9 h-9 rounded-xl object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-beyond-purple" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">{selectedPersona.title}</h1>
                  <p className="text-surface-400 text-sm">{selectedPersona.description || 'Your digital companion'}</p>
                </div>
              </div>
              <div className="ml-auto flex items-center space-x-2">
                <button
                  onClick={() => router.push('/avatar?persona=' + selectedPersona.id)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-beyond-purple to-beyond-pink text-white hover:opacity-90 transition-opacity"
                  title="AI Avatar"
                >
                  <Video className="w-5 h-5" />
                  <span className="hidden md:inline">AI Avatar</span>
                </button>
                <button
                  onClick={() => router.push('/dashboard/chats?persona=' + selectedPersona.id)}
                  className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
                  title="Open persona details"
                >
                  <Play className="w-5 h-5" />
                </button>
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
  );
}
