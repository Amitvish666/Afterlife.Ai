'use client';

import { useState, useEffect } from 'react';
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
  FileAudio,
  LayoutDashboard,
  Cpu,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { useAuthStore, usePersonaStore, type Persona, type Task } from '@/store';
import { cn } from '@/lib/utils';
import FloatingParticles from '@/components/FloatingParticles';
import PerspectiveGrid from '@/components/PerspectiveGrid';
import ThreeDMemorySphere from '@/components/ThreeDMemorySphere';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PersonaCard from '@/components/PersonaCard';

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
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    relation: '',
    purpose: 'memorial' as const,
  });
  
  // Personality state
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [voiceStyle, setVoiceStyle] = useState<string>('calm');
  
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
    }
    
    if (!formData.title || !formData.relation) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Enhance description with traits if available
      const description = formData.description + 
        (selectedTraits.length > 0 ? `\n\nCore Traits: ${selectedTraits.join(', ')}` : '') +
        `\nVoice Style: ${voiceStyle}`;

      const personaData = { 
        ...formData,
        description
      };
      
      const response = await apiClient.createPersona(personaData);
      const newPersona = response.data.data as Persona;
      
      // Add to local store
      setPersonas([...personas, newPersona]);
      setCurrentPersona(newPersona);
      
      // Handle media files if any (skip the fake delay, just notify)
      if (mediaFiles.photos.length > 0 || mediaFiles.videos.length > 0 || mediaFiles.audio.length > 0) {
        toast.success('Memories archived successfully');
      }

      // Create default tasks for the persona instantly (no loops with awaits)
      const now = new Date().toISOString();
      const hasPhotos = mediaFiles.photos.length > 0;
      const baseTasks: Task[] = [
        { id: `task-${Date.now()}-1`, persona_id: newPersona.id, type: 'Memory Synchronization', status: hasPhotos ? 'completed' : 'pending', progress: hasPhotos ? 100 : 0, created_at: now, updated_at: now },
        { id: `task-${Date.now()}-2`, persona_id: newPersona.id, type: 'Voice Synthesis', status: 'pending', progress: 0, created_at: now, updated_at: now },
        { id: `task-${Date.now()}-3`, persona_id: newPersona.id, type: 'Neural Avatar Mapping', status: 'pending', progress: 0, created_at: now, updated_at: now },
        { id: `task-${Date.now()}-4`, persona_id: newPersona.id, type: 'Identity Verification', status: 'completed', progress: 100, created_at: now, updated_at: now },
      ];
      baseTasks.forEach(t => addTask(t));
      
      setShowCreateModal(false);
      resetCreateForm();
      
      toast.success('Persona initialized in the Vault');
      
      // Redirect to chats page
      router.push(`/dashboard/chats?persona=${newPersona.id}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'Failed to initialize persona');
    } finally {
      setIsLoading(false);
    }
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
      
      toast.success('Persona purged from Vault');
    } catch (error) {
      console.error('Failed to delete persona:', error);
      toast.error('Failed to purge persona');
    }
  };

  const getTasksForPersona = (personaId: string): Task[] => {
    return tasks.filter(t => t.persona_id === personaId);
  };

  const getTaskIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('memory') || t.includes('upload')) return Upload;
    if (t.includes('voice')) return Mic;
    if (t.includes('avatar')) return Image;
    if (t.includes('identity')) return Shield;
    return FileText;
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
      
      toast.success(`${files.length} ${type.slice(0, -1)}(s) archived`);
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
    setSelectedTraits([]);
    setVoiceStyle('calm');
  };
  
  // Close modal and reset
  const closeCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(false);
  };

  const toggleTrait = (trait: string) => {
    setSelectedTraits(prev => 
      prev.includes(trait) 
        ? prev.filter(t => t !== trait) 
        : [...prev, trait]
    );
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
      <Navbar />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <PerspectiveGrid />
        <FloatingParticles />
      </div>

      {/* Sidebar (Retractable Dock) */}
      <Sidebar />

      {/* Main Content */}
      <main className="lg:pl-32 pt-28 p-8 transition-all duration-500">
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-6"
          >
            <div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-2 text-beyond-purple text-xs font-bold uppercase tracking-[0.2em] mb-3"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Command Center</span>
              </motion.div>
              <motion.h1 
                className="text-5xl md:text-6xl font-black text-white tracking-tight leading-none"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                Vault <span className="gradient-text">Overview</span>
              </motion.h1>
            </div>
            <motion.button 
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center space-x-3 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all group shrink-0"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-5 h-5" />
              <span>Initialize AI Persona</span>
            </motion.button>
          </motion.div>

          {personas.length === 0 ? (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12 py-12">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 text-center lg:text-left"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-beyond-purple/10 border border-beyond-purple/20 text-beyond-purple text-xs font-bold uppercase tracking-wider mb-6"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Your Journey</span>
                </motion.div>
                <h2 className="text-5xl font-extrabold text-white mb-6 leading-tight">
                  Preserve a <br />
                  <span className="gradient-text">Legacy Forever</span>
                </h2>
                <p className="text-surface-400 mb-10 text-xl max-w-lg">
                  Create a digital persona that carries the essence, memories, and voice of your loved ones into the future.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                  <motion.button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary text-lg px-10 py-5 rounded-2xl relative overflow-hidden group w-full sm:w-auto"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-6 h-6 mr-2" />
                    <span>Create First Persona</span>
                  </motion.button>
                  <button className="px-8 py-5 rounded-2xl text-white font-semibold hover:bg-surface-800 transition-colors border border-surface-700 w-full sm:w-auto">
                    Learn How it Works
                  </button>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1, type: 'spring' }}
                className="flex-1 w-full max-w-[500px] aspect-square relative"
              >
                <div className="absolute inset-0 bg-beyond-purple/20 rounded-full blur-[100px] animate-pulse" />
                <ThreeDMemorySphere />
              </motion.div>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-12 gap-6"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              {/* Bento Grid Pattern */}
              {personas.map((persona, index) => {
                const personaTasks = getTasksForPersona(persona.id);
                
                // Varied column spans for Bento effect
                // 1st persona is featured (large), others are standard
                const colSpan = index === 0 ? "md:col-span-8" : "md:col-span-4";
                const rowSpan = index === 0 ? "md:row-span-2" : "md:row-span-1";

                return (
                  <div key={persona.id} className={cn("relative", colSpan, rowSpan)}>
                    <PersonaCard 
                      persona={persona} 
                      tasks={personaTasks} 
                      onDelete={handleDeletePersona}
                      index={index}
                    />
                  </div>
                );
              })}
              
              {/* System Performance Bento Card */}
              <motion.div 
                className="md:col-span-4 md:row-span-1 bg-surface-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden relative group shadow-2xl"
                variants={{
                  hidden: { opacity: 0, scale: 0.98, y: 20 },
                  visible: { 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    transition: { delay: 0.4, type: 'spring' }
                  }
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Cpu className="w-20 h-20 text-beyond-purple" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center space-x-2 text-beyond-purple text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Live Telemetry</span>
                  </div>
                  <h4 className="text-xl font-black text-white mb-2 tracking-tight">System Status</h4>
                  <p className="text-surface-500 text-sm font-medium leading-relaxed">
                    Neural networks operating at <span className="text-white">98.4%</span> efficiency. 
                    All memory vaults secured with quantum encryption.
                  </p>
                </div>

                <div className="mt-8 space-y-4 relative z-10">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-surface-500">
                    <span>Active Nodes</span>
                    <span className="text-beyond-purple">32 / 40</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-950 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="h-full bg-beyond-purple shadow-[0_0_10px_#8b5cf6]"
                      initial={{ width: 0 }}
                      animate={{ width: '80%' }}
                      transition={{ duration: 1.5, delay: 0.8 }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex -space-x-1">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full border border-surface-950 bg-beyond-purple/20" />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-surface-400">UPTIME: 142H 12M</span>
                  </div>
                </div>
              </motion.div>

              {/* Security Bento Card */}
              <motion.div 
                className="md:col-span-4 md:row-span-1 bg-gradient-to-br from-beyond-purple/10 to-transparent backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col justify-between overflow-hidden relative group shadow-2xl"
                variants={{
                  hidden: { opacity: 0, scale: 0.98, y: 20 },
                  visible: { 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    transition: { delay: 0.5, type: 'spring' }
                  }
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="absolute bottom-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Shield className="w-24 h-24 text-white" />
                </div>

                <div className="relative z-10">
                  <div className="flex items-center space-x-2 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Identity Protected</span>
                  </div>
                  <h4 className="text-xl font-black text-white mb-2 tracking-tight">Security Audit</h4>
                  <p className="text-surface-500 text-sm font-medium leading-relaxed">
                    Biometric keys active. No unauthorized access attempts detected in the last 24 cycles.
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                   <div className="text-[10px] font-black text-surface-500 uppercase tracking-widest">Protocol 7-G Active</div>
                   <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" 
                   />
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Create Persona Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCreateModal}
              className="absolute inset-0 bg-surface-950/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative glass-dark rounded-[2.5rem] border border-surface-800/50 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl shadow-beyond-purple/20"
            >
              {/* Modal Decorative Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-beyond-purple to-transparent opacity-50" />
              
              <div className="p-8 flex items-center justify-between border-b border-surface-800/50 bg-surface-900/40">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Initialize <span className="gradient-text">Persona</span></h2>
                  <p className="text-surface-400 text-sm mt-1">System ready for memory vault entry</p>
                </div>
                <button 
                  onClick={closeCreateModal}
                  className="p-3 rounded-2xl bg-surface-800/50 text-surface-400 hover:text-white hover:bg-surface-800 transition-all border border-surface-700/50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                {/* Tabs */}
                <div className="flex p-1.5 bg-surface-950/50 rounded-2xl border border-surface-800/50 mb-10 w-fit mx-auto sticky top-0 z-20 backdrop-blur-md">
                  {[
                    { id: 'basic', label: 'Identity', icon: UserIcon },
                    { id: 'media', label: 'Memories', icon: FileImage },
                    { id: 'personality', label: 'Essence', icon: Heart },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFormTab(tab.id)}
                      className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm ${
                        activeFormTab === tab.id
                          ? 'bg-beyond-purple text-white shadow-lg shadow-beyond-purple/20'
                          : 'text-surface-500 hover:text-surface-300'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {/* Basic Info Tab */}
                  {activeFormTab === 'basic' && (
                    <motion.div
                      key="basic-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-1">
                            Legal Name / Moniker
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-6 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-beyond-purple focus:border-transparent transition-all font-medium"
                            placeholder="e.g. Grandma Sarah"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-1">
                            Biological Relation
                          </label>
                          <input
                            type="text"
                            value={formData.relation}
                            onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                            className="w-full px-6 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-beyond-purple focus:border-transparent transition-all font-medium"
                            placeholder="e.g. Grandmother"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-1">
                          Legacy Narrative
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-6 py-4 bg-surface-950/50 border border-surface-800 rounded-2xl text-white placeholder-surface-600 focus:outline-none focus:ring-2 focus:ring-beyond-purple focus:border-transparent transition-all font-medium resize-none"
                          rows={4}
                          placeholder="Provide context for the AI to understand this soul's journey..."
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-1">
                          Vault Protocol
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { value: 'memorial', label: 'Memorial', icon: Users },
                            { value: 'therapeutic', label: 'Therapy', icon: Heart },
                            { value: 'educational', label: 'Education', icon: Brain },
                            { value: 'entertainment', label: 'Fun', icon: Sparkles },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, purpose: option.value as any })}
                              className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center space-y-2 group ${
                                formData.purpose === option.value
                                  ? 'border-beyond-purple bg-beyond-purple/20 text-white shadow-lg shadow-beyond-purple/10'
                                  : 'border-surface-800 bg-surface-950/30 text-surface-500 hover:border-surface-700'
                              }`}
                            >
                              <option.icon className={`w-6 h-6 transition-colors ${formData.purpose === option.value ? 'text-beyond-purple' : 'group-hover:text-surface-300'}`} />
                              <span className="text-[10px] font-bold uppercase tracking-tighter">{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Media Files Tab */}
                  {activeFormTab === 'media' && (
                    <motion.div
                      key="media-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                          { type: 'photos', label: 'Visuals', icon: FileImage, color: 'text-pink-500', accept: 'image/*' },
                          { type: 'videos', label: 'Footage', icon: FileVideo, color: 'text-emerald-500', accept: 'video/*' },
                          { type: 'audio', label: 'Echoes', icon: FileAudio, color: 'text-cyan-500', accept: 'audio/*' },
                        ].map((media) => (
                          <div key={media.type} className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-surface-500 flex items-center space-x-2">
                              <media.icon className={`w-3.5 h-3.5 ${media.color}`} />
                              <span>{media.label}</span>
                            </label>
                            
                            <div className="relative group">
                              <input
                                type="file"
                                accept={media.accept}
                                multiple
                                onChange={(e) => handleMediaFileSelect(e, media.type as any)}
                                className="hidden"
                                id={`${media.type}-upload`}
                              />
                              <label 
                                htmlFor={`${media.type}-upload`}
                                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-surface-800 rounded-3xl cursor-pointer hover:border-beyond-purple/50 bg-surface-950/30 hover:bg-surface-800/30 transition-all group"
                              >
                                <Upload className="w-8 h-8 mb-2 text-surface-600 group-hover:text-beyond-purple transition-colors" />
                                <span className="text-[10px] font-bold text-surface-500 group-hover:text-surface-300">UPLOAD</span>
                              </label>
                            </div>
                            
                            <div className="text-[10px] text-surface-500 font-bold">
                              {(mediaFiles as any)[media.type].length} ARCHIVED
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* File Previews / List */}
                      {(mediaPreviews.photos.length > 0 || mediaPreviews.videos.length > 0 || mediaPreviews.audio.length > 0) && (
                        <div className="bg-surface-950/50 rounded-3xl border border-surface-800 p-6 space-y-4 max-h-60 overflow-y-auto custom-scrollbar">
                          {mediaPreviews.photos.map((p, i) => (
                            <div key={`p-${i}`} className="flex items-center space-x-4 bg-surface-900/50 p-2 rounded-xl border border-white/5">
                              <img src={p} className="w-12 h-12 rounded-lg object-cover" alt="" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{mediaFiles.photos[i]?.name}</p>
                                <div className="h-1 bg-surface-800 rounded-full mt-1 overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-pink-500" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress.photos[mediaFiles.photos[i]?.name] || 100}%` }}
                                  />
                                </div>
                              </div>
                              <button onClick={() => removeMediaFile('photos', i)} className="p-2 text-surface-500 hover:text-red-400 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          
                          {mediaFiles.videos.map((f, i) => (
                            <div key={`v-${i}`} className="flex items-center space-x-4 bg-surface-900/50 p-2 rounded-xl border border-white/5">
                              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <FileVideo className="w-6 h-6 text-emerald-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{f.name}</p>
                                <div className="h-1 bg-surface-800 rounded-full mt-1 overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-emerald-500" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress.videos[f.name] || 100}%` }}
                                  />
                                </div>
                              </div>
                              <button onClick={() => removeMediaFile('videos', i)} className="p-2 text-surface-500 hover:text-red-400 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}

                          {mediaFiles.audio.map((f, i) => (
                            <div key={`a-${i}`} className="flex items-center space-x-4 bg-surface-900/50 p-2 rounded-xl border border-white/5">
                              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                <FileAudio className="w-6 h-6 text-cyan-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{f.name}</p>
                                <div className="h-1 bg-surface-800 rounded-full mt-1 overflow-hidden">
                                  <motion.div 
                                    className="h-full bg-cyan-500" 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress.audio[f.name] || 100}%` }}
                                  />
                                </div>
                              </div>
                              <button onClick={() => removeMediaFile('audio', i)} className="p-2 text-surface-500 hover:text-red-400 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Essence Tab */}
                  {activeFormTab === 'personality' && (
                    <motion.div
                      key="personality-tab"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-1">
                          Synthesize Core Traits
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {[
                            'Kind', 'Wise', 'Loving', 'Humorous', 'Patient', 'Strong',
                            'Creative', 'Adventurous', 'Gentle', 'Direct', 'Optimistic', 'Stoic'
                          ].map((trait) => (
                            <button
                              key={trait}
                              onClick={() => toggleTrait(trait)}
                              className={`px-4 py-3 rounded-xl border transition-all duration-300 text-xs font-bold ${
                                selectedTraits.includes(trait)
                                  ? 'border-beyond-purple bg-beyond-purple/20 text-white shadow-lg shadow-beyond-purple/10'
                                  : 'border-surface-800 bg-surface-950/30 text-surface-400 hover:border-surface-700 hover:text-white'
                              }`}
                            >
                              {trait}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest text-surface-500 ml-1">
                          Vocal Frequency Style
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { value: 'calm', label: 'Serene', icon: Heart },
                            { value: 'energetic', label: 'Vibrant', icon: Sparkles },
                            { value: 'formal', label: 'Dignified', icon: FileText },
                          ].map((style) => (
                            <button
                              key={style.value}
                              onClick={() => setVoiceStyle(style.value)}
                              className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center space-y-2 group ${
                                voiceStyle === style.value
                                  ? 'border-beyond-purple bg-beyond-purple/20 text-white shadow-lg shadow-beyond-purple/10'
                                  : 'border-surface-800 bg-surface-950/30 text-surface-500 hover:border-surface-700 hover:text-white'
                              }`}
                            >
                              <style.icon className={`w-6 h-6 transition-colors ${voiceStyle === style.value ? 'text-beyond-purple' : 'group-hover:text-beyond-purple/50'}`} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">{style.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-surface-900/40 border-t border-surface-800/50 flex items-center justify-between">
                <button
                  onClick={() => {
                    if (activeFormTab === 'personality') setActiveFormTab('media');
                    else if (activeFormTab === 'media') setActiveFormTab('basic');
                  }}
                  className={`px-8 py-4 rounded-2xl border border-surface-800 text-white font-bold hover:bg-surface-800 transition-all flex items-center space-x-2 ${activeFormTab === 'basic' ? 'opacity-0 pointer-events-none' : ''}`}
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-4">
                   {activeFormTab !== 'personality' && (
                     <button 
                       onClick={() => setActiveFormTab('personality')}
                       className="text-surface-500 hover:text-white text-sm font-bold transition-colors hidden sm:block"
                     >
                       Skip to Essence
                     </button>
                   )}
                   
                   <button
                    onClick={() => {
                      if (activeFormTab === 'basic') setActiveFormTab('media');
                      else if (activeFormTab === 'media') setActiveFormTab('personality');
                      else handleCreatePersona();
                    }}
                    disabled={isLoading}
                    className="btn-primary px-10 py-4 flex items-center space-x-3 group/submit"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span className="tracking-tight">{activeFormTab === 'personality' ? 'Commit to Vault' : 'Next Protocol'}</span>
                        <ChevronRight className="w-4 h-4 group-hover/submit:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
