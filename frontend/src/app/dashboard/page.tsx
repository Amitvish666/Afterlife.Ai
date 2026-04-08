'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Plus, 
  Upload, 
  Users, 
  MessageCircle, 
  Settings, 
  LogOut,
  ChevronRight,
  Loader2,
  FileText,
  Trash2,
  Clock,
  Check,
  Play,
  Mic,
  MicOff,
  Image,
  User as UserIcon,
  HelpCircle,
  Shield,
  File,
  Bell,
  ChevronDown,
  Mail,
  X,
  Video,
  Music,
  Heart,
  Brain,
  FileImage,
  FileVideo,
  FileAudio
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { useAuthStore, usePersonaStore, type Persona, type Task } from '@/store';
import { cn } from '@/lib/utils';

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { 
    personas, setPersonas, 
    tasks, addTask, 
    removePersona, 
    currentPersona, setCurrentPersona 
  } = usePersonaStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    relation: '',
    purpose: 'memorial' as const,
  });
  
  // Tab state for create persona modal
  const [activeFormTab, setActiveFormTab] = useState('basic');
  
  // Media files state
  const [mediaFiles, setMediaFiles] = useState({
    photos: [] as File[],
    videos: [] as File[],
    audio: [] as File[],
  });
  
  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{
    photos: { [key: string]: number };
    videos: { [key: string]: number };
    audio: { [key: string]: number };
  }>({
    photos: {},
    videos: {},
    audio: {},
  });
  
  // Media previews
  const [mediaPreviews, setMediaPreviews] = useState({
    photos: [] as string[],
    videos: [] as string[],
    audio: [] as string[],
  });

  // Initialize personas from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Tasks are already managed by zustand persist - no manual loading needed
      setInitialized(true);
    }
  }, [setPersonas]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  // Load personas from API on mount only if not already loaded
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

  const loadPersonas = async () => {
    try {
      const response = await apiClient.listPersonas();
      if (response.data.data) {
        const personasData = response.data.data as any[];
        // Preserve existing tasks by merging - only update personas, don't touch tasks
        setPersonas(personasData);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    }
  };

  const handleCreatePersona = async (e?: React.FormEvent) => {
    // If e is provided (form submit), prevent default
    if (e) {
      e.preventDefault();
      if (!formData.title || !formData.relation) {
        toast.error('Please fill in all required fields');
        return;
      }
    }
    
    setIsLoading(true);
    
    try {
      // Use form data if provided, otherwise create a default persona
      const personaData = e ? formData : { 
        title: 'My Persona', 
        description: '', 
        relation: 'Family', 
        purpose: 'memorial' 
      };
      
      const response = await apiClient.createPersona(personaData);
      const newPersona = response.data.data as Persona;
      
      // Add to local store
      setPersonas([...personas, newPersona]);
      setCurrentPersona(newPersona);
      
      // Create sample tasks for the persona
      const sampleTasks: Task[] = [
        {
          id: `task-${Date.now()}-1`,
          persona_id: newPersona.id,
          type: 'Upload Memories',
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: `task-${Date.now()}-2`,
          persona_id: newPersona.id,
          type: 'Voice Recording',
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: `task-${Date.now()}-3`,
          persona_id: newPersona.id,
          type: 'Avatar Generation',
          status: 'pending',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      
      sampleTasks.forEach(task => addTask(task));
      
      setShowCreateModal(false);
      setFormData({ title: '', description: '', relation: '', purpose: 'memorial' });
      
      toast.success('Persona created!');
      
      // Redirect to chats page instead of persona detail
      router.push(`/dashboard/chats?persona=${newPersona.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'Failed to create persona');
    } finally {
      setIsLoading(false);
    }
  };

  // Speech recognition for voice input
  const startListening = () => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error('Speech recognition requires Chrome or Edge browser. Firefox/Safari not supported.');
      return;
    }
    
    // Set listening state immediately so button turns green
    setIsListening(true);
    
    // Try to start speech recognition directly
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        toast.success('Listening... speak now!');
      };
      
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        if (transcript.trim()) {
          if (personas.length > 0) {
            router.push(`/dashboard/chats?persona_id=${personas[0].id}&message=${encodeURIComponent(transcript)}`);
          } else {
            router.push(`/dashboard/chats?message=${encodeURIComponent(transcript)}`);
          }
          toast.success('Voice captured!');
        }
      };
      
      recognition.onerror = (event: any) => {
        console.log('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Don't show error for 'no-speech' - it just means user didn't say anything
        if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again and speak clearly.');
        } else if (event.error === 'network') {
          toast.error('Network error. Check your internet connection.');
        }
        // Don't show error for 'not-allowed' - it works anyway in most cases
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
      recognition.start();
      
    } catch (error: any) {
      console.error('Error starting recognition:', error);
      // Don't show error toast - just log it
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log('Error stopping recognition:', error);
      }
    }
    setIsListening(false);
    toast.success('Voice input stopped');
  };

  const handleDeletePersona = async (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      console.log('Deleting persona:', personaId);
      // Try to delete from API, but continue even if it fails (for offline mode)
      try {
        await apiClient.deletePersona(personaId);
        console.log('API delete successful');
      } catch (apiError) {
        console.log('API delete failed, continuing with local deletion only');
      }
      
      // Remove from store and localStorage regardless of API result
      console.log('Removing from store...');
      removePersona(personaId);
      console.log('Persona removed from store');
      
      // Force refresh from localStorage to ensure consistency
      const storedData = localStorage.getItem('persona-storage');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.state) {
          // Filter out the deleted persona and its tasks
          parsed.state.personas = parsed.state.personas.filter((p: any) => p.id !== personaId);
          parsed.state.tasks = parsed.state.tasks.filter((t: any) => t.persona_id !== personaId);
          localStorage.setItem('persona-storage', JSON.stringify(parsed));
          console.log('localStorage updated:', parsed.state.tasks.length, 'tasks remaining');
        }
      }
      
      toast.success('Persona deleted successfully');
    } catch (error) {
      console.error('Failed to delete persona:', error);
      toast.error('Failed to delete persona');
    }
  };

  const getTasksForPersona = (personaId: string): Task[] => {
    return tasks.filter(t => t.persona_id === personaId);
  };

  const getTaskIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'upload memories':
      case 'upload':
        return Upload;
      case 'voice recording':
      case 'voice':
        return Mic;
      case 'avatar generation':
      case 'avatar':
        return Image;
      default:
        return FileText;
    }
  };
  
  // Handle media file selection
  const handleMediaFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photos' | 'videos' | 'audio') => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Initialize progress for each file
      const initialProgress: { [key: string]: number } = {};
      files.forEach(file => {
        initialProgress[file.name] = 0;
      });
      setUploadProgress(prev => ({
        ...prev,
        [type]: { ...prev[type], ...initialProgress }
      }));
      
      setMediaFiles(prev => ({
        ...prev,
        [type]: [...prev[type], ...files]
      }));
      
      // Simulate progress for each file
      for (const file of files) {
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 50));
          setUploadProgress(prev => ({
            ...prev,
            [type]: {
              ...prev[type],
              [file.name]: progress
            }
          }));
        }
      }
      
      // Create previews for images/videos/audio
      if (type === 'photos') {
        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            setMediaPreviews(prev => ({
              ...prev,
              photos: [...prev.photos, e.target?.result as string]
            }));
          };
          reader.readAsDataURL(file);
        });
      } else if (type === 'videos') {
        files.forEach(file => {
          const url = URL.createObjectURL(file);
          setMediaPreviews(prev => ({
            ...prev,
            videos: [...prev.videos, url]
          }));
        });
      } else if (type === 'audio') {
        files.forEach(file => {
          const url = URL.createObjectURL(file);
          setMediaPreviews(prev => ({
            ...prev,
            audio: [...prev.audio, url]
          }));
        });
      }
      
      toast.success(`${files.length} ${type.slice(0, -1)}(s) selected`);
    }
  };
  
  // Remove media file
  const removeMediaFile = (type: 'photos' | 'videos' | 'audio', index: number) => {
    setMediaFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
    setMediaPreviews(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };
  
  // Reset form and media files
  const resetCreateForm = () => {
    setFormData({ title: '', description: '', relation: '', purpose: 'memorial' });
    setActiveFormTab('basic');
    setMediaFiles({ photos: [], videos: [], audio: [] });
    setMediaPreviews({ photos: [], videos: [], audio: [] });
  };
  
  // Close modal and reset
  const closeCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to continue</h1>
          <Link href="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-900/50 backdrop-blur-xl border-r border-surface-800/50 p-4">
        <div className="flex items-center space-x-2 mb-8 px-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Beyond Life AI</span>
          </Link>
        </div>

        <nav className="space-y-2">
          <Link 
            href="/dashboard"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-beyond-purple/20 text-white"
          >
            <Users className="w-5 h-5" />
            <span>Personas</span>
          </Link>
          <Link 
            href="/dashboard/chats"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chats</span>
          </Link>
          <Link 
            href="/dashboard/avatar"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <Video className="w-5 h-5" />
            <span>Avatar & Voice</span>
          </Link>
          <Link 
            href="/dashboard/settings"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>

        {/* User Tab - Collapsible */}
        <div className="mt-auto pt-4 border-t border-surface-800/50">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <UserIcon className="w-5 h-5" />
            <span>User</span>
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
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
                <Link 
                  href="/dashboard/settings?tab=privacy"
                  className="flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Privacy Policy</span>
                </Link>
                <Link 
                  href="/dashboard/settings?tab=terms"
                  className="flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <File className="w-4 h-4" />
                  <span>Terms of Service</span>
                </Link>
                <Link 
                  href="/dashboard/settings?tab=contact"
                  className="flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact</span>
                </Link>
                <Link 
                  href="/dashboard/settings?tab=help"
                  className="flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help & Support</span>
                </Link>
                <Link 
                  href="/dashboard/settings?tab=notifications"
                  className="flex items-center space-x-3 px-4 py-2 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/30 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </Link>
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

        {/* Personas in Sidebar */}
        {personas.length > 0 && (
          <div className="mt-6 pt-6 border-t border-surface-800/50">
            <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 px-4">
              Your Personas
            </h3>
            <div className="space-y-2">
              {personas.slice(0, 5).map((persona) => (
                <Link
                  key={persona.id}
                  href={`/dashboard/chats?persona=${persona.id}`}
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center flex-shrink-0">
                    {persona.avatar_url ? (
                      <img src={persona.avatar_url} alt={persona.title} className="w-7 h-7 rounded-lg object-cover" />
                    ) : (
                      <Users className="w-4 h-4 text-beyond-purple" />
                    )}
                  </div>
                  <span className="truncate text-sm">{persona.title}</span>
                </Link>
              ))}
              {personas.length > 5 && (
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-3 px-4 py-2 text-surface-500 hover:text-white transition-colors"
                >
                  <span className="text-sm">+ {personas.length - 5} more</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Your Personas</h1>
              <p className="text-surface-400 mt-1">Create and manage your digital personas</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-xl flex items-center space-x-2 transition-all ${isListening ? 'bg-green-500 animate-pulse' : 'bg-red-500 hover:bg-red-600'}`}
                title={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                <span className="text-white text-sm font-medium">{isListening ? 'Listening...' : 'Voice'}</span>
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Persona</span>
              </button>
            </div>
          </div>

          {/* Personas List */}
          {personas.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-hover p-8 text-center"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center">
                <Users className="w-10 h-10 text-beyond-purple" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Create Your First Persona</h2>
              <p className="text-surface-400 mb-8 max-w-md mx-auto">
                Start by creating a persona for your loved one. Upload memories, photos, and voice messages to build their digital representation.
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-lg px-8 py-4"
              >
                <Upload className="w-5 h-5 mr-2" />
                Create Your Persona
              </button>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {personas.map((persona) => {
                const personaTasks = getTasksForPersona(persona.id);
                const completedTasks = personaTasks.filter(t => t.status === 'completed').length;
                const progress = personaTasks.length > 0 ? Math.round((completedTasks / personaTasks.length) * 100) : 0;
                
                return (
                  <motion.div
                    key={persona.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-hover p-6"
                  >
                    {/* Persona Header */}
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-6 cursor-pointer flex-1"
                        onClick={() => router.push(`/dashboard/chats?persona=${persona.id}`)}
                      >
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center flex-shrink-0">
                          {persona.avatar_url ? (
                            <img src={persona.avatar_url} alt={persona.title} className="w-14 h-14 rounded-xl object-cover" />
                          ) : (
                            <Users className="w-8 h-8 text-beyond-purple" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-white truncate">{persona.title}</h3>
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              (persona.status === 'ready' || !persona.status) ? 'bg-emerald-500/20 text-emerald-400' :
                              persona.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-red-500/20 text-red-400'
                            )}>
                              {persona.status || 'ready'}
                            </span>
                          </div>
                          <p className="text-surface-400 text-sm truncate mt-1">
                            {persona.description || 'No description'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* Progress - hidden */}
                        <div className="text-right w-24">
                          <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-beyond-purple rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => router.push(`/dashboard/chats?persona=${persona.id}`)}
                            className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
                            title="Open persona"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => router.push(`/dashboard/chats?persona_id=${persona.id}`)}
                            className="p-2 rounded-lg hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
                            title="Chat"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePersona(persona.id, e)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-surface-400 hover:text-red-400 transition-colors"
                            title="Delete persona"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Tasks Section - Hidden */}
                    {personaTasks.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-surface-800">
                        <h4 className="text-sm font-medium text-surface-400 mb-3 flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Tasks
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {personaTasks.map((task) => {
                            const TaskIcon = getTaskIcon(task.type);
                            return (
                              <div 
                                key={task.id}
                                className={cn(
                                  'p-3 rounded-xl border transition-colors',
                                  task.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                  task.status === 'processing' ? 'bg-blue-500/10 border-blue-500/30' :
                                  'bg-surface-800/50 border-surface-700'
                                )}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <TaskIcon className="w-4 h-4 text-beyond-purple" />
                                    <span className="text-sm text-white">{task.type}</span>
                                  </div>
                                  {task.status === 'completed' ? (
                                    <Check className="w-4 h-4 text-emerald-400" />
                                  ) : task.status === 'processing' ? (
                                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-surface-400" />
                                  )}
                                </div>
                                <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      'h-full transition-all duration-300',
                                      task.status === 'completed' ? 'bg-emerald-500' :
                                      task.status === 'processing' ? 'bg-blue-500' :
                                      'bg-surface-600'
                                    )}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Create Persona Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-900 rounded-2xl border border-surface-800 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Persona</h2>
              <button 
                onClick={closeCreateModal}
                className="text-surface-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
              {[
                { id: 'basic', label: 'Basic Info', icon: UserIcon },
                { id: 'media', label: 'Media Files', icon: FileImage },
                { id: 'personality', label: 'Personality', icon: Heart },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${
                    activeFormTab === tab.id
                      ? 'bg-beyond-purple/20 text-white'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Basic Info Tab */}
            {activeFormTab === 'basic' && (
              <form onSubmit={(e) => { e.preventDefault(); setActiveFormTab('media'); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Persona Name *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple"
                    placeholder="e.g., Grandma Sarah"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Your Relation *
                  </label>
                  <input
                    type="text"
                    value={formData.relation}
                    onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple"
                    placeholder="e.g., Granddaughter, Son, Friend"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple resize-none"
                    rows={3}
                    placeholder="Tell us about this person..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Purpose
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'memorial', label: 'Memorial', icon: Users },
                      { value: 'therapeutic', label: 'Therapeutic', icon: Heart },
                      { value: 'educational', label: 'Educational', icon: Brain },
                      { value: 'entertainment', label: 'Entertainment', icon: Sparkles },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, purpose: option.value as typeof formData.purpose })}
                        className={`p-4 rounded-xl border transition-colors flex items-center space-x-2 ${
                          formData.purpose === option.value
                            ? 'border-beyond-purple bg-beyond-purple/20 text-white'
                            : 'border-surface-700 text-surface-400 hover:border-surface-600'
                        }`}
                      >
                        <option.icon className="w-5 h-5" />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="btn-primary px-6 py-3 flex items-center space-x-2"
                  >
                    <span>Next: Media Files</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Media Files Tab */}
            {activeFormTab === 'media' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Sections */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Photo Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 text-white font-medium">
                        <FileImage className="w-5 h-5 text-pink-500" />
                        <span>Photo</span>
                      </label>
                      <span className="text-surface-400 text-sm">{mediaFiles.photos.length} selected</span>
                    </div>
                    
                    <div className="border-2 border-dashed border-surface-700 rounded-2xl p-6 text-center hover:border-beyond-purple/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleMediaFileSelect(e, 'photos')}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label htmlFor="photo-upload" className="cursor-pointer">
                        <Image className="w-12 h-12 mx-auto mb-3 text-surface-500" />
                        <p className="text-white mb-1">Drop image or click to upload</p>
                        <p className="text-surface-400 text-sm">Supports JPG, PNG, GIF, WebP</p>
                      </label>
                    </div>
                    
                    {/* Photo Previews */}
                    {mediaPreviews.photos.length > 0 && (
                      <div className="space-y-2">
                        {mediaPreviews.photos.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img src={preview} alt={`Photo ${index + 1}`} className="w-full h-20 object-cover rounded-lg" />
                            <button
                              onClick={() => removeMediaFile('photos', index)}
                              className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {/* Progress bar */}
                            {uploadProgress.photos[mediaFiles.photos[index]?.name] !== undefined && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                <div 
                                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-200"
                                  style={{ width: `${uploadProgress.photos[mediaFiles.photos[index]?.name] || 0}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 text-white font-medium">
                        <FileVideo className="w-5 h-5 text-emerald-500" />
                        <span>Video</span>
                      </label>
                      <span className="text-surface-400 text-sm">{mediaFiles.videos.length} selected</span>
                    </div>
                    
                    <div className="border-2 border-dashed border-surface-700 rounded-2xl p-6 text-center hover:border-beyond-purple/50 transition-colors">
                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        onChange={(e) => handleMediaFileSelect(e, 'videos')}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <Video className="w-12 h-12 mx-auto mb-3 text-surface-500" />
                        <p className="text-white mb-1">Drop video or click to upload</p>
                        <p className="text-surface-400 text-sm">Supports MP4, MOV, AVI, WebM</p>
                      </label>
                    </div>
                    
                    {/* Video Previews */}
                    {mediaPreviews.videos.length > 0 && (
                      <div className="space-y-2">
                        {mediaPreviews.videos.map((preview, index) => (
                          <div key={index} className="relative group">
                            <video src={preview} className="w-full h-32 object-cover rounded-lg" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-8 h-8 text-white" />
                            </div>
                            <button
                              onClick={() => removeMediaFile('videos', index)}
                              className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {/* Progress bar */}
                            {uploadProgress.videos[mediaFiles.videos[index]?.name] !== undefined && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-200"
                                  style={{ width: `${uploadProgress.videos[mediaFiles.videos[index]?.name] || 0}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Audio Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 text-white font-medium">
                        <FileAudio className="w-5 h-5 text-cyan-500" />
                        <span>Audio</span>
                      </label>
                      <span className="text-surface-400 text-sm">{mediaFiles.audio.length} selected</span>
                    </div>
                    
                    <div className="border-2 border-dashed border-surface-700 rounded-2xl p-6 text-center hover:border-beyond-purple/50 transition-colors">
                      <input
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={(e) => handleMediaFileSelect(e, 'audio')}
                        className="hidden"
                        id="audio-upload"
                      />
                      <label htmlFor="audio-upload" className="cursor-pointer">
                        <Music className="w-12 h-12 mx-auto mb-3 text-surface-500" />
                        <p className="text-white mb-1">Drop audio or click to upload</p>
                        <p className="text-surface-400 text-sm">Supports MP3, WAV, OGG, M4A</p>
                      </label>
                    </div>
                    
                    {/* Audio Previews */}
                    {mediaPreviews.audio.length > 0 && (
                      <div className="space-y-2">
                        {mediaPreviews.audio.map((preview, index) => (
                          <div key={index} className="flex items-center space-x-3 bg-surface-800 rounded-lg p-3">
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                              <Music className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm">{mediaFiles.audio[index]?.name}</p>
                              <p className="text-surface-400 text-xs">{formatFileSize(mediaFiles.audio[index]?.size || 0)}</p>
                              {/* Progress bar */}
                              {uploadProgress.audio[mediaFiles.audio[index]?.name] !== undefined && (
                                <div className="h-1 bg-surface-700 rounded-full mt-1">
                                  <div 
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-200"
                                    style={{ width: `${uploadProgress.audio[mediaFiles.audio[index]?.name] || 0}%` }}
                                  />
                                </div>
                              )}
                            </div>
                            <audio controls className="h-8">
                              <source src={preview} />
                            </audio>
                            <button
                              onClick={() => removeMediaFile('audio', index)}
                              className="text-surface-400 hover:text-red-400 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Status Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-surface-800/50 rounded-2xl p-6 border border-surface-700 sticky top-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Upload className="w-5 h-5 mr-2 text-beyond-purple" />
                      Upload Status
                    </h3>
                    
                    {/* Overall Progress */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-surface-400 text-sm">Overall Progress</span>
                        <span className="text-white font-semibold">
                          {Math.round(
                            ((mediaFiles.photos.length > 0 ? 1 : 0) + 
                            (mediaFiles.videos.length > 0 ? 1 : 0) + 
                            (mediaFiles.audio.length > 0 ? 1 : 0)) / 3 * 100
                          )}%
                        </span>
                      </div>
                      <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-beyond-purple to-beyond-pink transition-all duration-500"
                          style={{ width: `${((mediaFiles.photos.length > 0 ? 1 : 0) + (mediaFiles.videos.length > 0 ? 1 : 0) + (mediaFiles.audio.length > 0 ? 1 : 0)) / 3 * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Individual Status */}
                    <div className="space-y-4">
                      {/* Photos Status */}
                      <div className="flex items-center justify-between p-3 bg-surface-900/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mediaFiles.photos.length > 0 ? 'bg-pink-500/20' : 'bg-surface-700'}`}>
                            <FileImage className={`w-4 h-4 ${mediaFiles.photos.length > 0 ? 'text-pink-500' : 'text-surface-500'}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">Photos</p>
                            <p className="text-surface-500 text-xs">{mediaFiles.photos.length} uploaded</p>
                          </div>
                        </div>
                        {mediaFiles.photos.length > 0 ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-surface-500" />
                        )}
                      </div>

                      {/* Videos Status */}
                      <div className="flex items-center justify-between p-3 bg-surface-900/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mediaFiles.videos.length > 0 ? 'bg-emerald-500/20' : 'bg-surface-700'}`}>
                            <FileVideo className={`w-4 h-4 ${mediaFiles.videos.length > 0 ? 'text-emerald-500' : 'text-surface-500'}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">Videos</p>
                            <p className="text-surface-500 text-xs">{mediaFiles.videos.length} uploaded</p>
                          </div>
                        </div>
                        {mediaFiles.videos.length > 0 ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-surface-500" />
                        )}
                      </div>

                      {/* Audio Status */}
                      <div className="flex items-center justify-between p-3 bg-surface-900/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mediaFiles.audio.length > 0 ? 'bg-cyan-500/20' : 'bg-surface-700'}`}>
                            <FileAudio className={`w-4 h-4 ${mediaFiles.audio.length > 0 ? 'text-cyan-500' : 'text-surface-500'}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">Audio</p>
                            <p className="text-surface-500 text-xs">{mediaFiles.audio.length} uploaded</p>
                          </div>
                        </div>
                        {mediaFiles.audio.length > 0 ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-surface-500" />
                        )}
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="mt-6 p-4 bg-surface-900/30 rounded-xl">
                      <p className="text-surface-400 text-xs">
                        <span className="text-white font-medium">Tip:</span> Upload at least one file from each category for best avatar generation results.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons - Full width in grid */}
                <div className="col-span-1 lg:col-span-3 flex justify-between pt-6 mt-6 border-t border-surface-700">
                  <button
                    onClick={() => setActiveFormTab('basic')}
                    className="px-6 py-3 rounded-xl border border-surface-700 text-white hover:bg-surface-800 transition-colors flex items-center space-x-2"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={() => setActiveFormTab('personality')}
                    className="btn-primary px-6 py-3 flex items-center space-x-2"
                  >
                    <span>Next: Personality</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Personality Tab */}
            {activeFormTab === 'personality' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-4">
                    Select Traits
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      'Kind', 'Wise', 'Loving', 'Humorous', 'Patient', 'Strong',
                      'Creative', 'Adventurous', 'Compassionate', 'Generous', 'Optimistic', 'Gentle'
                    ].map((trait) => (
                      <button
                        key={trait}
                        className="p-3 rounded-xl border border-surface-700 text-surface-300 hover:border-beyond-purple hover:text-white transition-colors"
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-300 mb-2">
                    Voice Style
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'calm', label: 'Calm', icon: Heart },
                      { value: 'energetic', label: 'Energetic', icon: Sparkles },
                      { value: 'formal', label: 'Formal', icon: FileText },
                    ].map((style) => (
                      <button
                        key={style.value}
                        className="p-4 rounded-xl border border-surface-700 text-surface-400 hover:border-beyond-purple hover:text-white transition-colors flex flex-col items-center space-y-2"
                      >
                        <style.icon className="w-6 h-6" />
                        <span>{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setActiveFormTab('media')}
                    className="px-6 py-3 rounded-xl border border-surface-700 text-white hover:bg-surface-800 transition-colors flex items-center space-x-2"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleCreatePersona}
                    disabled={isLoading}
                    className="btn-primary px-6 py-3 flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Create Persona</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
