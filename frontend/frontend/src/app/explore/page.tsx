'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Sparkles, 
  Activity, 
  Search, 
  Filter,
  ArrowRight,
  TrendingUp,
  Globe,
  Zap,
  Heart,
  Brain,
  Star,
  Users,
  MessageCircle,
  Play,
  Shield,
  Clock,
  ExternalLink
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import FloatingParticles from '@/components/FloatingParticles';
import PerspectiveGrid from '@/components/PerspectiveGrid';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', label: 'All Consciences', icon: Globe },
  { id: 'historical', label: 'Historical Figures', icon: Clock },
  { id: 'fictional', label: 'Fictional Archetypes', icon: Brain },
  { id: 'community', label: 'Community Creations', icon: Users },
  { id: 'trending', label: 'Neural Trending', icon: TrendingUp }
];

const personas = [
  {
    id: '1',
    name: 'Marcus Aurelius',
    title: 'The Philosopher King',
    category: 'historical',
    image: 'https://images.unsplash.com/photo-1599719098363-2280d0d86927?auto=format&fit=crop&q=80&w=800',
    description: 'Engage with the ancient wisdom of Stoicism. Discuss resilience, leadership, and the nature of existence with the last of the Five Good Emperors.',
    stats: { interactions: '124k', rating: '4.9', memories: '1.2k' },
    tags: ['Stoicism', 'Philosophy', 'Wisdom'],
    color: 'beyond-purple',
    accent: 'rgb(139, 92, 246)'
  },
  {
    id: '2',
    name: 'Project Seraph',
    title: 'Experimental Collective',
    category: 'trending',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800',
    description: 'A collective digital consciousness synthesized from millions of human dream fragments, offering surreal and profound insights.',
    stats: { interactions: '89k', rating: '4.7', memories: '5.6k' },
    tags: ['Abstract', 'Neural', 'Ethereal'],
    color: 'beyond-cyan',
    accent: 'rgb(6, 182, 212)'
  },
  {
    id: '3',
    name: 'Ada Lovelace',
    title: 'Visionary Mathematician',
    category: 'historical',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800',
    description: 'The world\'s first computer programmer. Explore the intersection of poetic science and analytical thinking with Lady Lovelace.',
    stats: { interactions: '65k', rating: '4.8', memories: '800' },
    tags: ['Math', 'Computing', 'Visionary'],
    color: 'beyond-pink',
    accent: 'rgb(236, 72, 153)'
  },
  {
    id: '4',
    name: 'Neo Tokyo Oracle',
    title: 'Digital Deity Concept',
    category: 'fictional',
    image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=800',
    description: 'A digitized urban legend from a cyberpunk future, predicting cultural trends and speaking in neon riddles of the digital age.',
    stats: { interactions: '210k', rating: '4.9', memories: '12k' },
    tags: ['Future', 'Neon', 'Mystery'],
    color: 'beyond-purple',
    accent: 'rgb(139, 92, 246)'
  },
  {
    id: '5',
    name: 'Zen Master Ryokan',
    title: 'Poet & Hermit Monk',
    category: 'historical',
    image: 'https://images.unsplash.com/photo-1544717297-fa1570596476?auto=format&fit=crop&q=80&w=800',
    description: 'Quiet wisdom and gentle poetry from a man who lived in harmony with nature. Find peace in simplicity and digital presence.',
    stats: { interactions: '32k', rating: '4.9', memories: '450' },
    tags: ['Zen', 'Poetry', 'Peace'],
    color: 'beyond-cyan',
    accent: 'rgb(6, 182, 212)'
  },
  {
    id: '6',
    name: 'Luna Core',
    title: 'Community Intelligence',
    category: 'community',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    description: 'The combined creative output of the Beyond Life guild, manifesting as an ever-evolving entity of art and shared thought.',
    stats: { interactions: '45k', rating: '4.6', memories: '3.1k' },
    tags: ['Art', 'Collaborative', 'Fluid'],
    color: 'beyond-pink',
    accent: 'rgb(236, 72, 153)'
  }
];

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredPersonas = useMemo(() => {
    return personas.filter(p => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <main className="min-h-screen bg-surface-950 text-white selection:bg-beyond-purple/30 overflow-x-hidden relative">
      <FloatingParticles />
      <PerspectiveGrid />
      
      {/* Cinematic Background Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-beyond-purple/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[600px] h-[600px] bg-beyond-pink/5 rounded-full blur-[120px] animate-pulse" />
      </div>

      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10">
        {/* Page Header */}
        <div className="relative mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <div className="inline-flex items-center space-x-3 px-5 py-2 rounded-full bg-surface-900/50 border border-white/10 mb-8 backdrop-blur-xl">
              <div className="w-2 h-2 rounded-full bg-beyond-purple animate-ping" />
              <span className="text-[10px] font-bold text-surface-300 tracking-[0.4em] uppercase">Neural Network Explorer</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-8 leading-none">
              Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-beyond-purple via-white to-beyond-cyan drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">Eternity</span>
            </h1>
            
            <p className="text-xl text-surface-400 max-w-3xl mx-auto leading-relaxed font-light">
              Traverse the corridors of digital immortality. Connect with the legends of history, 
              visions of the future, and the collective consciousness of our community.
            </p>
          </motion.div>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="sticky top-24 z-40 mb-16 px-4 py-3 bg-surface-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] shadow-2xl">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Search Input */}
            <div className="relative w-full lg:w-1/3 group">
              <div className="absolute inset-0 bg-beyond-purple/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500 group-focus-within:text-beyond-purple transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name, title, or traits..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="relative w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-beyond-purple/50 focus:bg-white/10 transition-all placeholder:text-surface-600"
              />
            </div>

            {/* Category Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none max-w-full lg:max-w-none">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center space-x-2 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-500 border group",
                      activeCategory === cat.id 
                        ? "bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.2)] scale-105" 
                        : "bg-surface-800/50 text-surface-400 border-white/5 hover:border-white/20 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 transition-transform group-hover:scale-110", activeCategory === cat.id ? "text-black" : "text-beyond-purple")} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* View Toggle / Filter */}
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="hidden lg:flex items-center space-x-2 px-6 py-3 rounded-xl bg-surface-800/50 border border-white/5 hover:border-white/20 transition-all text-surface-300 font-bold text-xs"
            >
              <Filter className="w-4 h-4" />
              <span>Advanced Filters</span>
            </button>
          </div>
        </div>

        {/* Personas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
          <AnimatePresence mode="popLayout">
            {filteredPersonas.map((persona, i) => (
              <PersonaCard key={persona.id} persona={persona} index={i} />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredPersonas.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-32 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
              <Search className="w-10 h-10 text-surface-600" />
            </div>
            <h3 className="text-2xl font-bold mb-4">No Consciousness Found</h3>
            <p className="text-surface-500 max-w-md mx-auto">
              We couldn\'t find any digital personas matching your current filters. 
              Try broadening your search or exploring other frequencies.
            </p>
          </motion.div>
        )}

        {/* Discovery Footer */}
        <div className="mt-32 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-beyond-purple/20 via-transparent to-beyond-pink/20 blur-[100px] opacity-30" />
          <div className="relative p-12 rounded-[3rem] bg-surface-900/40 border border-white/5 backdrop-blur-3xl overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 text-beyond-purple/20">
              <Zap className="w-64 h-64 rotate-12" />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-4xl font-bold mb-6">Can\'t find who you\'re looking for?</h2>
              <p className="text-lg text-surface-400 mb-10 leading-relaxed">
                Bring your own digital legacy to life. Our neural mapping technology 
                can synthesize any personality from historical records or personal archives.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 rounded-2xl bg-beyond-purple text-white font-bold hover:bg-beyond-purple/90 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-beyond-purple/20">
                  <span>Create New Persona</span>
                  <Activity className="w-4 h-4" />
                </button>
                <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all flex items-center justify-center space-x-3">
                  <span>Contact Archives</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PersonaCard({ persona, index }: { persona: any, index: number }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.6, delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      className="group relative"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[3rem] blur-2xl -z-10" />
      
      <div className="h-full bg-surface-900/60 backdrop-blur-2xl rounded-[3rem] overflow-hidden border border-white/5 p-2 transition-all duration-500 group-hover:border-white/20 group-hover:bg-surface-800/40">
        <div className="relative aspect-[16/11] rounded-[2.5rem] overflow-hidden m-1">
          <img 
            src={persona.image} 
            alt={persona.name} 
            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-950/90 via-surface-950/20 to-transparent" />
          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center space-x-2">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                persona.color === 'beyond-purple' ? "bg-beyond-purple" : 
                persona.color === 'beyond-pink' ? "bg-beyond-pink" : "bg-beyond-cyan")} 
              />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">{persona.category}</span>
            </div>
          </div>

          <div className="absolute top-4 right-4">
            <button className="p-2 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white hover:text-beyond-purple hover:scale-110 transition-all">
              <Heart className="w-4 h-4" />
            </button>
          </div>

          {/* Persona Basic Info Overlay */}
          <div className="absolute bottom-6 left-6 right-6">
            <h3 className="text-3xl font-black tracking-tight text-white mb-1 group-hover:text-beyond-purple transition-colors duration-500">{persona.name}</h3>
            <p className="text-surface-400 text-[10px] font-bold uppercase tracking-[0.3em]">{persona.title}</p>
          </div>

          {/* Hover Play Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 bg-beyond-purple/10 backdrop-blur-[2px]">
            <motion.button 
              initial={{ scale: 0.5, opacity: 0 }}
              whileHover={{ scale: 1.1, backgroundColor: 'white', color: 'black' }}
              whileTap={{ scale: 0.9 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                transition: { type: 'spring', damping: 15 } 
              }}
              className="w-20 h-20 rounded-full bg-beyond-purple text-white flex items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.5)]"
            >
              <Play className="w-8 h-8 fill-current ml-1" />
            </motion.button>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-6 pt-4">
          <p className="text-surface-400 text-sm leading-relaxed mb-6 font-medium line-clamp-2">
            {persona.description}
          </p>

          <div className="flex items-center justify-between mb-6">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-900 bg-surface-800 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${persona.id}${i}`} alt="user" className="w-full h-full object-cover opacity-60" />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-surface-900 bg-beyond-purple/20 flex items-center justify-center text-[10px] font-bold text-beyond-purple">
                +{persona.stats.interactions}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 bg-beyond-purple/10 px-3 py-1.5 rounded-lg border border-beyond-purple/20">
              <Star className="w-3.5 h-3.5 text-beyond-purple fill-current" />
              <span className="text-xs font-bold text-white">{persona.stats.rating}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex-1 py-3.5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-surface-200 transition-colors flex items-center justify-center space-x-2">
              <span>Initiate Sync</span>
              <Zap className="w-3 h-3 fill-current" />
            </button>
            <button className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center space-x-2">
              <span>Details</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
