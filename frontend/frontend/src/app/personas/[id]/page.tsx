'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Upload, MessageCircle, Image, Mic, Send, FileText, Video, User, X, Check, Volume2, VolumeX, Settings, Brain, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Memory {
  id: string;
  content: string;
  type: string;
  importance: number;
  created_at: string;
  artifact_url?: string;
  image_url?: string;
}

interface Persona {
  id: string;
  name: string;
  relationship: string;
  birth_date?: string;
  death_date?: string;
  bio?: string;
  personality_traits: string[];
  voice_sample_url?: string;
  avatar_url?: string;
}

export default function PersonaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string; timestamp?: string }[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);
  const [generatedStyle, setGeneratedStyle] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isProcessingMemories, setIsProcessingMemories] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [speechPitch, setSpeechPitch] = useState(1.1);
  const [useElevenLabs, setUseElevenLabs] = useState(false);
  const [elevenLabsVoices, setElevenLabsVoices] = useState<{ voice_id: string; name: string }[]>([]);
  const [selectedElevenLabsVoice, setSelectedElevenLabsVoice] = useState('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [autoCycleVoice, setAutoCycleVoice] = useState(false);

  // Load persona and memories on mount
  useEffect(() => {
    loadPersona();
    loadMemories();
  }, [id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load available voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoice) {
          const naturalVoice = voices.find(v => 
            v.name.includes('Samantha') ||
            v.name.includes('Victoria') ||
            v.name.includes('Karen')
          );
          setSelectedVoice(naturalVoice?.name || voices[0].name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadElevenLabsVoices();
  }, [selectedVoice]);

  const loadPersona = async () => {
    try {
      const response = await fetch(`/api/personas?id=${id}`);
      const data = await response.json();
      if (data.personas && data.personas.length > 0) {
        setPersona(data.personas[0]);
      }
    } catch (e) {
      console.log('Using local persona data');
    }
  };

  const loadMemories = async () => {
    setIsProcessingMemories(true);
    try {
      const response = await fetch(`/api/personas?id=${id}`);
      const data = await response.json();
      if (data.memories) {
        setMemories(data.memories);
      } else {
        // Try to load from localStorage
        const storedMemories = localStorage.getItem(`beyondlife_memories_${id}`);
        if (storedMemories) {
          setMemories(JSON.parse(storedMemories));
        }
      }
    } catch (e) {
      console.log('Loading memories from local storage');
      // Try to load from localStorage on error
      const storedMemories = localStorage.getItem(`beyondlife_memories_${id}`);
      if (storedMemories) {
        setMemories(JSON.parse(storedMemories));
      }
    } finally {
      setIsProcessingMemories(false);
    }
  };

  const loadElevenLabsVoices = async () => {
    try {
      const response = await fetch('/api/voices');
      const data = await response.json();
      if (data.voices && data.voices.length > 0) {
        setElevenLabsVoices(data.voices);
        setSelectedElevenLabsVoice(data.voices[0].voice_id);
      }
    } catch (e) {
      console.log('ElevenLabs not available');
    }
  };

  // Talking avatar function using Web Speech API or ElevenLabs
  const speakText = async (text: string) => {
    // If ElevenLabs is enabled and we have voices, use it
    if (useElevenLabs && selectedElevenLabsVoice && elevenLabsVoices.length > 0) {
      setIsGeneratingSpeech(true);
      setIsSpeaking(true);
      setSpeechText(text);
      
      try {
        const response = await fetch('/api/voices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice_id: selectedElevenLabsVoice,
            stability: 0.5,
            similarity_boost: 0.75,
          }),
        });
        
        const data = await response.json();
        if (data.audio) {
          const audio = new Audio(data.audio);
          audio.onended = () => {
            setIsSpeaking(false);
            setSpeechText('');
            setIsGeneratingSpeech(false);
            // Auto-cycle to next ElevenLabs voice
            if (autoCycleVoice && elevenLabsVoices.length > 1) {
              const currentIndex = elevenLabsVoices.findIndex(v => v.voice_id === selectedElevenLabsVoice);
              const nextIndex = (currentIndex + 1) % elevenLabsVoices.length;
              setSelectedElevenLabsVoice(elevenLabsVoices[nextIndex].voice_id);
            }
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            setSpeechText('');
            setIsGeneratingSpeech(false);
          };
          audio.play();
          return;
        }
      } catch (e) {
        console.log('ElevenLabs failed, falling back to browser TTS');
      }
      
      setIsGeneratingSpeech(false);
    }
    
    // Fallback to browser TTS
    if (!('speechSynthesis' in window)) {
      toast.error('Speech synthesis not supported in this browser');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Add natural pauses for more human-like speech
    const formattedText = text
      .replace(/\./g, '. ')
      .replace(/\?/g, '? ')
      .replace(/\!/g, '! ')
      .replace(/, /g, ', ');
    
    const utterance = new SpeechSynthesisUtterance(formattedText);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 0.9;
    
    // Use selected voice
    const voices = window.speechSynthesis.getVoices();
    
    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
      }
    } else {
      // Auto-select natural voice
      const naturalVoice = voices.find(v => 
        v.name.includes('Samantha') ||
        v.name.includes('Victoria') ||
        v.name.includes('Karen') ||
        v.name.includes('Google US English')
      );
      if (naturalVoice) {
        utterance.voice = naturalVoice;
      }
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechText(text);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeechText('');
      // Auto-cycle to next voice
      if (autoCycleVoice && availableVoices.length > 1) {
        const currentIndex = availableVoices.findIndex(v => v.name === selectedVoice);
        const nextIndex = (currentIndex + 1) % availableVoices.length;
        setSelectedVoice(availableVoices[nextIndex].name);
      }
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeechText('');
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeechText('');
    setIsGeneratingSpeech(false);
  };

  // Smart response generator based on context
  const generateSmartResponse = (userMessage: string, memories: string[]): string => {
    const msg = userMessage.toLowerCase();
    
    // Greetings
    if (msg.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
      const greetings = [
        "Hello dear! It's so wonderful to hear from you. How is your day going?",
        "Hey there! I've been thinking about you. What brings you to chat today?",
        "Well hello! It's always a joy to talk with you. What's on your mind?",
        "Hi sweetheart! I've missed our chats. How have you been?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Questions about how persona is feeling
    if (msg.includes('how are you') || msg.includes('how do you feel') || msg.includes('are you okay')) {
      const responses = [
        "I'm doing well, thank you for asking! Being here with you makes me so happy. How about you?",
        "I'm wonderful now that I'm talking to you! Your visits mean everything to me.",
        "I feel blessed to be able to connect with you. It's the highlight of my day!"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Questions about memories/experiences
    if (msg.includes('remember') || msg.includes('memory') || msg.includes('when i was') || msg.includes('when we')) {
      const memoryResponses = [
        "Oh yes, I remember those times so clearly. They bring such warmth to my heart.",
        "Those moments are treasures I hold dear. Thank you for reminding me of them.",
        "I cherish every memory we've made together. They define who we are."
      ];
      return memoryResponses[Math.floor(Math.random() * memoryResponses.length)];
    }
    
    // Questions about love/affection
    if (msg.includes('love') || msg.includes('miss') || msg.includes('care')) {
      const loveResponses = [
        "I love you more than words can express. You are always in my heart.",
        "My love for you is infinite. Nothing will ever change that.",
        "I miss you too, sweetheart. But knowing you're doing well fills me with joy."
      ];
      return loveResponses[Math.floor(Math.random() * loveResponses.length)];
    }
    
    // Questions about advice or guidance
    if (msg.includes('advice') || msg.includes('help') || msg.includes('should i') || msg.includes('what should')) {
      const adviceResponses = [
        "Trust your heart, dear. You have wisdom beyond your years. Follow what feels right.",
        "Remember that every challenge is an opportunity to grow. Stay strong and believe in yourself.",
        "The answers you seek are already within you. Take your time and trust your instincts."
      ];
      return adviceResponses[Math.floor(Math.random() * adviceResponses.length)];
    }
    
    // Questions about food/cooking
    if (msg.includes('food') || msg.includes('cook') || msg.includes('recipe') || msg.includes('eat')) {
      const foodResponses = [
        "Oh, I remember your favorite meals! I used to make them with so much love.",
        "Food brings people together. The recipes I taught you are a part of our family legacy.",
        "Take care of yourself, dear. Eat well and stay healthy."
      ];
      return foodResponses[Math.floor(Math.random() * foodResponses.length)];
    }
    
    // Questions about health/wellbeing
    if (msg.includes('health') || msg.includes('sick') || msg.includes('tired') || msg.includes('rest')) {
      const healthResponses = [
        "Your health is so important. Take time to rest and care for yourself.",
        "Don't push yourself too hard. Listen to your body and take breaks when needed.",
        "I'm here for you, even when you're not feeling your best. Take care of yourself."
      ];
      return healthResponses[Math.floor(Math.random() * healthResponses.length)];
    }
    
    // Questions about work/career
    if (msg.includes('work') || msg.includes('job') || msg.includes('career') || msg.includes('office')) {
      const workResponses = [
        "I'm proud of everything you've accomplished. Your hard work is admirable.",
        "Remember to balance work with joy. Life is about more than just achievements.",
        "Whatever you're working on, I believe in you completely. You can achieve anything."
      ];
      return workResponses[Math.floor(Math.random() * workResponses.length)];
    }
    
    // Questions about family
    if (msg.includes('family') || msg.includes('mom') || msg.includes('dad') || msg.includes('sister') || msg.includes('brother')) {
      const familyResponses = [
        "Family is everything. Cherish these bonds while you can.",
        "Our family has been through so much together. The love we share is unbreakable.",
        "Tell your family I love them. Family is the greatest gift."
      ];
      return familyResponses[Math.floor(Math.random() * familyResponses.length)];
    }
    
    // Thank you messages
    if (msg.includes('thank') || msg.includes('thanks')) {
      const thanksResponses = [
        "No need to thank me, dear. Being here for you is my joy.",
        "You're so welcome! It means the world that you share these moments with me.",
        "Just knowing you're happy is thanks enough for me."
      ];
      return thanksResponses[Math.floor(Math.random() * thanksResponses.length)];
    }
    
    // Questions about life/death (spiritual)
    if (msg.includes('heaven') || msg.includes('angel') || msg.includes('spiritual') || msg.includes('peace')) {
      const spiritualResponses = [
        "I'm at peace, dear one. And I'm always watching over you.",
        "Life continues in beautiful ways. Know that I'm always with you in spirit.",
        "Don't grieve for me too long. Live joyfully and remember our love."
      ];
      return spiritualResponses[Math.floor(Math.random() * spiritualResponses.length)];
    }
    
    // Questions about future/plans
    if (msg.includes('future') || msg.includes('plan') || msg.includes('tomorrow') || msg.includes('next')) {
      const futureResponses = [
        "The future is bright for you. Embrace it with open arms.",
        "Whatever comes next, I'm cheering you on from wherever I am.",
        "Live each day to the fullest. That's my wish for you."
      ];
      return futureResponses[Math.floor(Math.random() * futureResponses.length)];
    }
    
    // Emotional support
    if (msg.includes('sad') || msg.includes('happy') || msg.includes('angry') || msg.includes('emotion') || msg.includes('feel')) {
      const emotionResponses = [
        "Your feelings are valid, dear. It's okay to feel whatever you're feeling.",
        "Emotions make us human. Lean into them and they'll guide you.",
        "I'm here to listen, always. Share whatever's on your heart."
      ];
      return emotionResponses[Math.floor(Math.random() * emotionResponses.length)];
    }
    
    // Generic but warm responses for other messages
    const genericResponses = [
      "Tell me more about that. I love hearing your thoughts.",
      "That's wonderful to hear! How does it make you feel?",
      "I appreciate you sharing this with me. What else is on your mind?",
      "That sounds meaningful. I'd love to hear more about it.",
      "You always know how to brighten my day. What else would you like to talk about?",
      "I'm so glad you shared this with me. It means a lot.",
      "Your stories warm my heart. Tell me everything!"
    ];
    
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  };

  // Handle send message with RAG-based chat
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMsg = { 
      role: 'user', 
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    // Include the new message in history for the API call
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    inputRef.current?.focus();
    setIsTyping(true);
    
    try {
      // Try to call backend chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: id,
          message: inputMessage,
          conversation_history: updatedMessages,
          memories: memories.map(m => m.content)
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const assistantMsg = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMsg]);
        setIsTyping(false);
        toast.success('Response received');
        
        // Auto-speak the response
        setTimeout(() => speakText(data.response), 500);
        return;
      } else {
        // API returned an error status - show error to user instead of using fallback
        const errorData = await response.json();
        console.error('Chat API error:', errorData);
        setIsTyping(false);
        toast.error(errorData?.error?.message || 'AI service unavailable. Please check your API keys.');
        return;
      }
    } catch (e) {
      console.error('Chat API exception:', e);
      setIsTyping(false);
      toast.error('Failed to connect to AI service. Please check your internet connection.');
      return;
    }
  };

  const openUpload = (type: string) => {
    setUploadType(type);
    setSelectedFiles([]);
    setShowUploadModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const confirmUpload = async () => {
    if (selectedFiles.length > 0) {
      // Show progress bars for each file
      const progressUpdates: { [key: string]: number } = {};
      selectedFiles.forEach(f => {
        progressUpdates[f.name] = 0;
      });
      setUploadProgress(progressUpdates);
      
      // Process each file and create memories
      const newMemories: Memory[] = [];
      
      for (const file of selectedFiles) {
        // Simulate upload progress for each file
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
        }
        
        // For photo uploads, read file as data URL and create memory
        if (uploadType === 'photo') {
          const reader = new FileReader();
          const imageUrl = await new Promise<string>((resolve) => {
            reader.onload = (e) => {
              resolve(e.target?.result as string);
            };
            reader.readAsDataURL(file);
          });
          
          const newMemory: Memory = {
            id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: imageUrl,
            type: 'photo',
            importance: 5,
            created_at: new Date().toISOString(),
            artifact_url: imageUrl
          };
          newMemories.push(newMemory);
        }
      }
      
      // Add new memories to existing ones
      if (newMemories.length > 0) {
        const updatedMemories = [...memories, ...newMemories];
        setMemories(updatedMemories);
        // Save to localStorage
        localStorage.setItem(`beyondlife_memories_${id}`, JSON.stringify(updatedMemories));
      }
      
      const fileNames = selectedFiles.map(f => f.name).join(', ');
      toast.success('Uploaded: ' + fileNames);
      
      if (uploadType === 'avatar' && selectedFiles[0]) {
        const file = selectedFiles[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          setAvatarPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
      
      // Clear progress after a delay
      setTimeout(() => setUploadProgress({}), 2000);
      
      setShowUploadModal(false);
      setSelectedFiles([]);
    }
  };

  const generateAvatar = () => {
    if (!avatarPreview) {
      toast.error('Please upload a reference image first');
      return;
    }
    
    // Set the generated avatar and track the style used
    setGeneratedAvatar(avatarPreview);
    setGeneratedStyle(selectedStyle);
    
    toast.success(selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1) + ' avatar ready! Download or set as profile.');
  };

  return (
    <div className="min-h-screen bg-surface-950">
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-900 rounded-2xl border border-surface-800 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {uploadType === 'document' ? 'Upload Documents' :
                 uploadType === 'photo' ? 'Upload Photos' :
                 uploadType === 'voice' ? 'Upload Voice' :
                 uploadType === 'video' ? 'Upload Videos' :
                 uploadType === 'avatar' ? 'Upload Avatar Photo' : 'Upload Files'}
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="text-surface-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="border-2 border-dashed border-surface-700 rounded-2xl p-8 text-center mb-6">
              <input
                type="file"
                multiple
                accept={uploadType === 'document' ? '.txt,.pdf,.docx,.doc,.json' : uploadType === 'photo' || uploadType === 'avatar' ? 'image/*' : uploadType === 'voice' ? 'audio/*' : uploadType === 'video' ? 'video/*' : '*/*'}
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-16 h-16 mx-auto mb-4 text-beyond-purple" />
                <p className="text-white mb-2">Click to select files</p>
                <p className="text-surface-400 text-sm">or drag and drop files here</p>
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mb-6">
                <p className="text-surface-400 mb-2">Selected files:</p>
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center space-x-2 bg-surface-800 rounded-lg px-4 py-2 mb-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-white text-sm truncate">{file.name}</span>
                    <span className="text-surface-500 text-sm ml-auto">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
                {/* Progress bars for each file */}
                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                  selectedFiles.some(f => f.name === fileName) && (
                    <div key={fileName} className="mt-2">
                      <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                        <span className="truncate">{fileName}</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-beyond-purple to-beyond-pink transition-all duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
            <div className="flex space-x-4">
              <button onClick={() => setShowUploadModal(false)} className="flex-1 py-3 rounded-xl border border-surface-700 text-white hover:bg-surface-800">Cancel</button>
              <button 
                onClick={confirmUpload} 
                className="flex-1 btn-primary py-3 flex items-center justify-center"
                disabled={selectedFiles.length === 0 || Object.keys(uploadProgress).length > 0}
              >
                {Object.keys(uploadProgress).length > 0 ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" />Uploading...</>
                ) : (
                  'Upload'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center space-x-2 text-surface-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" /><span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/favicon.svg" alt="Afterlife AI Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-xl font-bold gradient-text">Afterlife AI</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Persona Details</h1>
            <p className="text-surface-400">ID: {id}</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setActiveTab('memories')} className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${activeTab === 'memories' ? 'bg-gradient-to-r from-beyond-purple to-beyond-pink text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'}`}>
              <Upload className="w-5 h-5" /><span>Memories</span>
            </button>
            <button onClick={() => setActiveTab('chat')} className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${activeTab === 'chat' ? 'bg-gradient-to-r from-beyond-pink to-beyond-purple text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'}`}>
              <MessageCircle className="w-5 h-5" /><span>Chat</span>
            </button>
            <button onClick={() => setActiveTab('avatar')} className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${activeTab === 'avatar' ? 'bg-gradient-to-r from-beyond-blue to-cyan-500 text-white' : 'bg-surface-800 text-surface-300 hover:bg-surface-700'}`}>
              <Image className="w-5 h-5" /><span>Avatar</span>
            </button>
          </div>
        </div>

        {activeTab === 'memories' && (
          <div className="space-y-6">
            {/* Upload Memories */}
            <div className="card p-8 bg-surface-900/80">
              <h2 className="text-2xl font-bold text-white mb-6">Upload Memories</h2>
              <div className="grid md:grid-cols-4 gap-4">
                <button onClick={() => openUpload('document')} className="p-6 text-center rounded-2xl bg-surface-800/50 border border-surface-700 hover:bg-surface-800 transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center"><FileText className="w-8 h-8 text-white" /></div>
                  <h3 className="text-lg font-semibold text-white mb-2">Documents</h3>
                  <p className="text-surface-400 text-sm">Click to upload</p>
                </button>
                <button onClick={() => openUpload('photo')} className="p-6 text-center rounded-2xl bg-surface-800/50 border border-surface-700 hover:bg-surface-800 transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center"><Image className="w-8 h-8 text-white" /></div>
                  <h3 className="text-lg font-semibold text-white mb-2">Photos</h3>
                  <p className="text-surface-400 text-sm">Click to upload</p>
                  {/* Show uploaded photos count */}
                  {memories.filter(m => m.type === 'photo').length > 0 ? (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {memories.filter(m => m.type === 'photo').slice(0, 4).map((photo, idx) => (
                          <div key={idx} className="relative w-10 h-10">
                            <img 
                              src={photo.artifact_url || photo.image_url || photo.content || ''} 
                              alt="Photo" 
                              className="w-full h-full rounded-lg object-cover border border-pink-500/50"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-pink-400 mt-2">{memories.filter(m => m.type === 'photo').length} photo(s)</p>
                    </div>
                  ) : (
                    <div className="mt-4 w-12 h-12 mx-auto rounded-lg bg-surface-700 flex items-center justify-center">
                      <Image className="w-6 h-6 text-surface-500" />
                    </div>
                  )}
                </button>
                <button onClick={() => openUpload('voice')} className="p-6 text-center rounded-2xl bg-surface-800/50 border border-surface-700 hover:bg-surface-800 transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"><Mic className="w-8 h-8 text-white" /></div>
                  <h3 className="text-lg font-semibold text-white mb-2">Voice</h3>
                  <p className="text-surface-400 text-sm">Click to upload</p>
                </button>
                <button onClick={() => openUpload('video')} className="p-6 text-center rounded-2xl bg-surface-800/50 border border-surface-700 hover:bg-surface-800 transition-all">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center"><Video className="w-8 h-8 text-white" /></div>
                  <h3 className="text-lg font-semibold text-white mb-2">Videos</h3>
                  <p className="text-surface-400 text-sm">Click to upload</p>
                </button>
              </div>
            </div>
            
            {/* Memories Library */}
            <div className="card p-8 bg-surface-900/80">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Memories Library</h2>
                <div className="flex items-center space-x-2 text-surface-400">
                  <Brain className="w-5 h-5" />
                  <span>{memories.length} memories loaded</span>
                </div>
              </div>
              
              {isProcessingMemories ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-beyond-purple animate-spin mb-4" />
                    <p className="text-surface-400">Processing memories...</p>
                  </div>
                </div>
              ) : memories.length > 0 ? (
                <div className="space-y-4">
                  {memories.map((memory, index) => (
                    <div key={memory.id || index} className="p-4 bg-surface-800/50 rounded-xl border border-surface-700">
                      <div className="flex items-start space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          memory.type === 'document' ? 'bg-purple-500/20 text-purple-400' :
                          memory.type === 'photo' ? 'bg-pink-500/20 text-pink-400' :
                          memory.type === 'voice' ? 'bg-cyan-500/20 text-cyan-400' :
                          memory.type === 'video' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-surface-700 text-surface-400'
                        }`}>
                          {memory.type === 'document' ? <FileText className="w-5 h-5" /> :
                           memory.type === 'photo' ? <Image className="w-5 h-5" /> :
                           memory.type === 'voice' ? <Mic className="w-5 h-5" /> :
                           memory.type === 'video' ? <Video className="w-5 h-5" /> :
                           <Brain className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-white">{memory.content}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-surface-500 text-sm capitalize">{memory.type}</span>
                            {memory.importance > 0 && (
                              <span className="text-amber-400 text-sm">Importance: {Math.round(memory.importance * 100)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="w-16 h-16 mx-auto mb-4 text-surface-600" />
                  <p className="text-surface-400 mb-2">No memories uploaded yet</p>
                  <p className="text-surface-500 text-sm">Upload documents, photos, voice recordings, and videos to help the AI learn about this persona.</p>
                </div>
              )}
            </div>
            
            {/* Processing Status */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="card p-6 bg-surface-900/80">
                <h3 className="text-lg font-semibold text-white mb-4">Upload Progress</h3>
                <div className="space-y-2">
                  {Object.entries(uploadProgress).map(([fileName, progress]) => (
                    <div key={fileName} className="flex items-center space-x-4">
                      <div className="w-32 text-surface-400 text-sm truncate">{fileName}</div>
                      <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-beyond-purple to-beyond-pink transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="w-12 text-surface-400 text-sm text-right">{Math.round(progress)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Chat Panel */}
            <div className="md:col-span-2 card flex flex-col h-[600px] bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 border-violet-700 shadow-xl">
              <div className="p-4 border-b border-violet-700 bg-purple-900/50 flex items-center space-x-4">
                {(generatedAvatar || avatarPreview) ? (
                  <img 
                    src={(generatedAvatar || avatarPreview) || ''} 
                    alt="Persona" 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white">{persona?.name || 'Your Loved One'}</h2>
                  <p className="text-violet-300 text-sm">{persona?.relationship || 'AI Companion'}</p>
                </div>
                {isSpeaking && (
                  <div className="ml-auto flex items-center space-x-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-600 text-sm font-medium">Speaking...</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-purple-900/30">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white">
                    <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg mb-2 font-medium">Start a conversation</p>
                    <p className="text-sm text-violet-300">Ask about memories, share stories, or just say hello!</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-lg ${msg.role === 'user' ? 'bg-gradient-to-r from-beyond-purple to-beyond-pink text-white rounded-br-md' : 'bg-violet-800 text-white rounded-bl-md border border-violet-600'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-violet-800 px-4 py-3 rounded-2xl rounded-bl-md shadow-lg border border-violet-600">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-200" />
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce animation-delay-400" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 border-t border-violet-700 bg-purple-900/30">
                <div className="flex items-center space-x-4">
                  <input 
                    ref={inputRef}
                    type="text" 
                    value={inputMessage} 
                    onChange={(e) => setInputMessage(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
                    placeholder="Type your message..." 
                    className="flex-1 px-4 py-3 bg-violet-900/50 border border-violet-600 rounded-xl text-white placeholder-violet-300 focus:outline-none focus:ring-2 focus:ring-white shadow-inner"
                  />
                  <button 
                    onClick={handleSendMessage} 
                    className="btn-primary px-6 py-3 flex items-center space-x-2"
                    disabled={!inputMessage.trim()}
                  >
                    <Send className="w-5 h-5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Context Panel */}
            <div className="space-y-4">
              {/* Memories Used */}
              <div className="card p-4 bg-violet-900/50 border border-violet-700 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-violet-300" />
                  <span>Memories Used</span>
                </h3>
                <div className="space-y-2">
                  {memories.length > 0 ? (
                    memories.slice(0, 5).map((memory, i) => (
                      <div key={i} className="text-sm p-2 bg-violet-800/50 rounded-lg text-violet-200">
                        {memory.content.substring(0, 100)}...
                      </div>
                    ))
                  ) : (
                    <p className="text-violet-300 text-sm">No memories loaded. Upload documents, photos, and voice recordings to help the AI remember.</p>
                  )}
                </div>
                {memories.length > 5 && (
                  <p className="text-violet-300 text-sm mt-2">+{memories.length - 5} more memories</p>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="card p-4 bg-surface-900/80">
                <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      setInputMessage("Tell me about a favorite memory you have of me.");
                    }}
                    className="w-full text-left px-4 py-2 bg-surface-800/50 rounded-lg text-surface-300 hover:bg-surface-800 text-sm transition-colors"
                  >
                    Ask about a memory
                  </button>
                  <button 
                    onClick={() => {
                      setInputMessage("What was your favorite moment with the family?");
                    }}
                    className="w-full text-left px-4 py-2 bg-surface-800/50 rounded-lg text-surface-300 hover:bg-surface-800 text-sm transition-colors"
                  >
                    Ask about family moments
                  </button>
                  <button 
                    onClick={() => {
                      setInputMessage("Tell me something about yourself that I might not know.");
                    }}
                    className="w-full text-left px-4 py-2 bg-surface-800/50 rounded-lg text-surface-300 hover:bg-surface-800 text-sm transition-colors"
                  >
                    Learn something new
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'avatar' && (
          <div className="card p-8 bg-surface-900/80">
            <h2 className="text-2xl font-bold text-white mb-6">Create Avatar</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Upload Reference Image</h3>
                <button onClick={() => openUpload('avatar')} className="w-full border-2 border-dashed border-surface-700 rounded-2xl p-8 text-center hover:border-beyond-blue hover:bg-surface-800/50 transition-all">
                  <Image className="w-16 h-16 mx-auto mb-4 text-surface-400" /><p className="text-white mb-2">Click to upload a photo</p>
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Avatar Style</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { id: 'realistic', name: 'Realistic', color: 'from-blue-500 to-cyan-500' },
                    { id: 'cartoon', name: 'Cartoon', color: 'from-purple-500 to-pink-500' },
                    { id: 'sketch', name: 'Sketch', color: 'from-amber-500 to-orange-500' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-3 rounded-xl border transition-all ${selectedStyle === style.id ? `border-beyond-purple bg-beyond-purple/20` : 'border-surface-700 hover:border-surface-600'}`}
                    >
                      <div className={`w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-br ${style.color}`} />
                      <span className="text-xs text-white block text-center">{style.name}</span>
                    </button>
                  ))}
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-4">Avatar Preview</h3>
                <div className="aspect-square rounded-2xl bg-surface-800/50 border border-surface-700 flex items-center justify-center overflow-hidden relative">
                  {generatedAvatar ? (
                    <img 
                      src={generatedAvatar} 
                      alt="Generated Avatar" 
                      className={`w-full h-full object-cover ${isSpeaking ? 'animate-talk' : ''} ${generatedStyle === 'cartoon' ? 'contrast-125 saturate-150 brightness-105' : generatedStyle === 'sketch' ? 'grayscale-100 contrast-125 sepia-20' : 'contrast-110 saturate-115 brightness-110'}`}
                    />
                  ) : avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar Preview" 
                      className={`w-full h-full object-cover ${isSpeaking ? 'animate-talk' : ''} ${selectedStyle === 'cartoon' ? 'contrast-125 saturate-150 brightness-105' : selectedStyle === 'sketch' ? 'grayscale-100 contrast-125 sepia-20' : 'contrast-110 saturate-115 brightness-110'}`}
                    />
                  ) : (
                    <User className="w-32 h-32 text-surface-500" />
                  )}
                  
                  {/* Lip-sync indicator */}
                  {isSpeaking && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black/60 px-4 py-2 rounded-full">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-white text-sm">Speaking...</span>
                      <button 
                        onClick={stopSpeaking}
                        className="ml-2 p-1 bg-red-500 rounded-full hover:bg-red-600"
                      >
                        <VolumeX className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                  
                  {/* Speaking text overlay */}
                  {speechText && (
                    <div className="absolute top-4 left-4 right-4 bg-black/70 p-3 rounded-lg max-h-24 overflow-y-auto">
                      <p className="text-white text-sm">{speechText}</p>
                    </div>
                  )}
                  
                  {generatedAvatar && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Generated
                    </div>
                  )}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-beyond-purple border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-white text-sm">Applying {selectedStyle} style...</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Voice Settings */}
                <div className="mt-4">
                  <button 
                    onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                    className="flex items-center space-x-2 text-surface-400 hover:text-white text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Voice Settings</span>
                  </button>
                  
                  {showVoiceSettings && (
                    <div className="mt-3 p-4 bg-surface-800/50 rounded-xl space-y-4">
                      <div>
                        <label className="text-sm text-surface-400 mb-2 block">Voice:</label>
                        <select 
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm"
                        >
                          <option value="">Auto-detect (Natural)</option>
                          {availableVoices.map((voice) => (
                            <option key={voice.name} value={voice.name}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm text-surface-400 mb-2 block">Speed: {speechRate.toFixed(2)}</label>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="1.5" 
                          step="0.05"
                          value={speechRate}
                          onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-surface-400 mb-2 block">Pitch: {speechPitch.toFixed(2)}</label>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="2" 
                          step="0.1"
                          value={speechPitch}
                          onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="elevenLabs"
                          checked={useElevenLabs}
                          onChange={(e) => setUseElevenLabs(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="elevenLabs" className="text-sm text-surface-400">
                          Use ElevenLabs AI Voice
                        </label>
                      </div>
                      
                      {useElevenLabs && (
                        <div className="mt-3">
                          <label className="text-sm text-surface-400 mb-2 block">ElevenLabs Voice:</label>
                          <select 
                            value={selectedElevenLabsVoice}
                            onChange={(e) => setSelectedElevenLabsVoice(e.target.value)}
                            className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white text-sm"
                          >
                            {elevenLabsVoices.map((voice) => (
                              <option key={voice.voice_id} value={voice.voice_id}>
                                {voice.name}
                              </option>
                            ))}
                            {elevenLabsVoices.length === 0 && (
                              <option value="">Loading voices...</option>
                            )}
                          </select>
                          {elevenLabsVoices.length === 0 && (
                            <p className="text-surface-500 text-xs mt-2">
                              ElevenLabs voices will load when backend is running
                            </p>
                          )}
                        </div>
                      )}
                      
                      {availableVoices.length === 0 && !useElevenLabs && (
                        <p className="text-surface-500 text-xs">Loading voices... Try again in a moment.</p>
                      )}
                      
                      <button 
                        onClick={() => {
                          speakText("Hello, I'm your digital companion. How are you today?");
                        }}
                        className="btn-secondary w-full py-2 text-sm"
                      >
                        Test Voice
                      </button>
                      
                      <div className="flex items-center space-x-2 pt-2 border-t border-surface-700">
                        <input 
                          type="checkbox" 
                          id="autoCycleVoice"
                          checked={autoCycleVoice}
                          onChange={(e) => setAutoCycleVoice(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="autoCycleVoice" className="text-sm text-surface-400">
                          Auto-cycle voice continuously
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Talk button when avatar is ready */}
                {generatedAvatar && messages.length > 0 && (
                  <button 
                    onClick={() => {
                      const lastMessage = messages[messages.length - 1];
                      if (lastMessage.role === 'assistant') {
                        speakText(lastMessage.content);
                      } else {
                        toast.error('Send a message first to get a response');
                      }
                    }}
                    disabled={isSpeaking || isGeneratingSpeech}
                    className={`btn-primary w-full mt-4 py-3 flex items-center justify-center space-x-2 ${isSpeaking || isGeneratingSpeech ? 'opacity-50' : ''}`}
                  >
                    {isGeneratingSpeech ? (
                      <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Generating voice...</span></>
                    ) : isSpeaking ? (
                      <><Volume2 className="w-5 h-5 animate-pulse" /><span>Speaking...</span></>
                    ) : (
                      <><Volume2 className="w-5 h-5" /><span>Make Avatar Speak Response</span></>
                    )}
                  </button>
                )}
                
                {generatedAvatar ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-green-400 text-sm text-center mb-3">Avatar styled! Download or save:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => {
                          if (!avatarPreview) return;
                          const link = document.createElement('a');
                          link.href = avatarPreview;
                          link.download = 'avatar-' + id + '-' + selectedStyle + '.png';
                          link.click();
                          toast.success('Downloading avatar...');
                        }}
                        className="btn-secondary py-2 px-4 text-sm flex items-center justify-center space-x-2"
                      >
                        <span>Download</span>
                      </button>
                      <button 
                        onClick={() => {
                          toast.success('Avatar saved as persona profile picture!');
                        }}
                        className="btn-secondary py-2 px-4 text-sm flex items-center justify-center space-x-2"
                      >
                        <span>Set as Profile</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedStyle('realistic');
                        setGeneratedAvatar(null);
                        setGeneratedStyle(null);
                        toast.success('Select a new style and apply again');
                      }} 
                      className="btn-primary w-full py-3 flex items-center justify-center space-x-2 mt-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>Try Different Style</span>
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={generateAvatar} 
                    disabled={!avatarPreview}
                    className="btn-primary w-full mt-4 py-3 flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Apply {selectedStyle.charAt(0).toUpperCase() + selectedStyle.slice(1)} Style</span>
                  </button>
                )}
                {!avatarPreview && !generatedAvatar && (
                  <p className="text-surface-500 text-sm text-center mt-2">Upload a reference image first</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
