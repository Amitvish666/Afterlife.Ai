'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Heart, 
  Brain, 
  Mic, 
  Image as ImageIcon, 
  MessageCircle,
  ArrowRight,
  Play,
  Upload,
  Users,
  Shield,
  Clock,
  Globe,
  LogOut,
  X,
  Star,
  Activity,
  Workflow,
  Lock,
  Compass
} from 'lucide-react';
import { useAuthStore } from '@/store';
import ThreeDMemorySphere from '@/components/ThreeDMemorySphere';
import FloatingParticles from '@/components/FloatingParticles';
import PerspectiveGrid from '@/components/PerspectiveGrid';

const features = [
  {
    icon: Brain,
    title: 'Smart Memory Extraction',
    description: 'Our AI deeply analyzes textual archives, digital chats, and personal documents to map unique personality traits, cherished memories, and distinct speech cadences.',
    color: 'from-purple-500 to-indigo-500',
    shadowColor: 'rgba(139, 92, 246, 0.25)',
  },
  {
    icon: Mic,
    title: 'Holographic Voice Cloning',
    description: 'Synthesize highly realistic, warm vocal replicas from sample recordings that capture personal inflection, subtle tone shifts, and emotional resonance.',
    color: 'from-pink-500 to-rose-500',
    shadowColor: 'rgba(236, 72, 153, 0.25)',
  },
  {
    icon: ImageIcon,
    title: 'Interactive Lifelike Avatars',
    description: 'Animate photorealistic or high-fidelity stylized digital avatars driven by real-time neural lip-sync technology that replicates natural expressions.',
    color: 'from-cyan-500 to-blue-500',
    shadowColor: 'rgba(6, 182, 212, 0.25)',
  },
  {
    icon: MessageCircle,
    title: 'Conversational Memory RAG',
    description: 'Engage in natural, fluid dialogues powered by advanced retrieval-augmented generation that actively recalls shared experiences and inside jokes.',
    color: 'from-emerald-500 to-teal-500',
    shadowColor: 'rgba(16, 185, 129, 0.25)',
  },
];

const stats = [
  { value: '50K+', label: 'Digital Personas', color: 'text-beyond-purple' },
  { value: '2M+', label: 'Conversations Held', color: 'text-beyond-pink' },
  { value: '99.9%', label: 'Active Uptime', color: 'text-beyond-cyan' },
  { value: '128K', label: 'Linguistic Accents', color: 'text-beyond-emerald' },
];

const testimonials = [
  {
    quote: "Engaging in conversations with my grandmother's digital persona feels like sitting with her on a sunny afternoon. The laughter, the voice, the wisdom... it is a beautiful bridge across time.",
    author: "Sarah M.",
    role: "Cherished Granddaughter",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120"
  },
  {
    quote: "Creating this memorial space for my father has been incredibly healing. It allows the grandchildren who never met him to ask him questions and hear his stories in his actual voice.",
    author: "Michael R.",
    role: "Devoted Son",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
  },
  {
    quote: "I am profoundly impressed by the core ethical standards and strict security guardrails. Our family memories and private archives feel incredibly safe, respected, and protected.",
    author: "Emma L.",
    role: "Family Archivist",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120"
  },
];

const steps = [
  {
    step: '01',
    title: 'Archive Private Memories',
    description: 'Securely upload private text logs, audio diary samples, letters, photos, or video snippets. Our processing handles files with multi-tier encryption.',
    icon: Upload,
  },
  {
    step: '02',
    title: 'Neural Model Assembly',
    description: 'Our proprietary deep-learning pipelines analyze raw media to reconstruct speech inflections, structural memories, and behavior profiles.',
    icon: Brain,
  },
  {
    step: '03',
    title: 'Begin Infinite Connection',
    description: 'Step into an immersive, private lounge to communicate, converse, and reminisce with the constructed digital persona anytime, anywhere.',
    icon: Heart,
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showDemo, setShowDemo] = useState(false);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 25, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="min-h-screen bg-surface-950 text-white relative font-sans overflow-x-hidden selection:bg-beyond-purple/30 selection:text-white">
      {/* Dynamic Background Overlays */}
      <FloatingParticles />
      <PerspectiveGrid />

      {/* Atmospheric Ambient Nebulae */}
      <div className="absolute top-0 left-0 w-full h-[100vh] bg-gradient-to-b from-beyond-purple/10 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute top-[25vh] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-beyond-pink/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-[20vh] left-[-10vw] w-[45vw] h-[45vw] rounded-full bg-beyond-blue/5 blur-[120px] pointer-events-none -z-10" />

      {/* Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-950/45 backdrop-blur-xl border-b border-surface-900/65">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-11 h-11 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src="/favicon.svg" alt="Beyond Life AI Logo" className="w-11 h-11 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-wider gradient-text font-display uppercase">Beyond Life AI</span>
                <span className="text-[10px] tracking-[0.25em] text-surface-400 font-mono font-medium -mt-1 group-hover:text-beyond-pink transition-colors">AI MEMORIALS</span>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center space-x-10">
              <Link href="#features" className="text-sm font-semibold tracking-wide text-surface-300 hover:text-beyond-purple transition-colors duration-200">
                Capabilities
              </Link>
              <Link href="#how-it-works" className="text-sm font-semibold tracking-wide text-surface-300 hover:text-beyond-pink transition-colors duration-200">
                The Process
              </Link>
              <Link href="#pricing" className="text-sm font-semibold tracking-wide text-surface-300 hover:text-beyond-cyan transition-colors duration-200">
                Ethical Safeguards
              </Link>
              
              {isAuthenticated ? (
                <div className="flex items-center space-x-5 pl-4 border-l border-surface-800">
                  <Link 
                    href="/dashboard" 
                    className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-surface-900/60 border border-surface-800/80 hover:border-beyond-purple/40 transition-all duration-300 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center p-0.5">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-white text-xs font-bold">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">{user?.name || 'Dashboard'}</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="p-2 rounded-xl text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-6 pl-4 border-l border-surface-800">
                  <Link href="/login" className="text-sm font-semibold tracking-wide text-surface-300 hover:text-white transition-colors duration-200">
                    Sign In
                  </Link>
                  <button 
                    onClick={() => router.push('/login')}
                    className="btn-primary px-5 py-2.5 text-xs tracking-wider uppercase sweep-glow"
                  >
                    Get Started Free
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 md:pt-48 pb-24 overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 text-left space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-beyond-purple/10 border border-beyond-purple/20 text-beyond-purple text-xs font-semibold tracking-widest uppercase font-mono shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                  <Activity className="w-3.5 h-3.5 text-beyond-purple animate-pulse" />
                  HOLOGRAPHIC AI SYNTHESIS
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-[5.4rem] leading-[1.05] font-extrabold tracking-tight"
              >
                <span className="text-white drop-shadow-sm">Preserve Memories,</span>
                <br />
                <span className="gradient-text text-glow font-display">Connect Forever.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-xl text-lg md:text-xl text-surface-300 leading-relaxed font-light"
              >
                Create deeply personal, secure digital personas built from uploaded memoirs, text chats, and vocal archives. Secure a beautiful legacy that transcends boundaries.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4"
              >
                <button 
                  onClick={() => router.push(isAuthenticated ? '/dashboard' : '/login')}
                  className="btn-primary text-sm px-8 py-4 tracking-wider uppercase font-semibold sweep-glow flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Assemble New Persona
                </button>
                <button 
                  onClick={() => setShowDemo(true)}
                  className="btn-secondary text-sm px-8 py-4 tracking-wider uppercase font-semibold flex items-center justify-center gap-2 border border-surface-700/60 hover:bg-surface-800/40 hover:border-surface-600 transition-all duration-300"
                >
                  <Play className="w-5 h-5 text-beyond-pink fill-beyond-pink/10" />
                  View Video Demo
                </button>
              </motion.div>
            </div>

            {/* Right Interactive 3D Sphere Column */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 60, damping: 15, delay: 0.2 }}
                className="w-full max-w-[480px] aspect-square relative flex items-center justify-center"
              >
                {/* Embedded custom 3D neural mesh sphere */}
                <ThreeDMemorySphere />
                
                {/* Floating dynamic status indicators around sphere */}
                <div className="absolute top-[12%] right-[5%] px-3 py-1.5 rounded-lg bg-surface-950/80 backdrop-blur-md border border-beyond-cyan/30 flex items-center space-x-2 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-[bounceSoft_4s_infinite_alternate]">
                  <span className="w-2 h-2 rounded-full bg-beyond-cyan animate-ping" />
                  <span className="text-[10px] font-mono tracking-widest text-beyond-cyan font-bold uppercase">Synthesizing Core</span>
                </div>
                <div className="absolute bottom-[10%] left-[2%] px-3 py-1.5 rounded-lg bg-surface-950/80 backdrop-blur-md border border-beyond-pink/30 flex items-center space-x-2 shadow-[0_0_15px_rgba(236,72,153,0.15)] animate-[bounceSoft_5s_infinite_alternate] animation-delay-1000">
                  <span className="w-2 h-2 rounded-full bg-beyond-pink" />
                  <span className="text-[10px] font-mono tracking-widest text-beyond-pink font-bold uppercase">Memory Matrix Active</span>
                </div>
              </motion.div>
            </div>

          </div>

          {/* Glowing Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-28 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="p-6 rounded-2xl bg-surface-900/40 backdrop-blur-md border border-surface-800/60 hover:border-surface-700 hover:shadow-[0_0_20px_rgba(139,92,246,0.06)] hover:scale-[1.03] transition-all duration-300 text-center"
              >
                <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${stat.color} font-mono`}>{stat.value}</div>
                <div className="text-xs sm:text-sm tracking-widest uppercase text-surface-400 mt-2 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Capabilities Features Section */}
      <section id="features" className="py-28 relative border-t border-surface-900/60 bg-surface-950/40 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              State-of-the-Art <span className="gradient-text font-display">Neural Capabilities</span>
            </h2>
            <p className="text-lg text-surface-400 max-w-2xl mx-auto font-light">
              We merge advanced audio-visual synthesis with deep language models to build highly accurate and comforting digital representations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="neon-border-glow p-7 flex flex-col items-start text-left group"
              >
                {/* Icon wrapper with glow shadow matching feature color */}
                <div 
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shadow-lg`}
                  style={{ boxShadow: `0 8px 24px -4px ${feature.shadowColor}` }}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3 tracking-wide">{feature.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed font-light">{feature.description}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Interactive Process Timeline Section */}
      <section id="how-it-works" className="py-28 relative border-t border-surface-900/60 bg-surface-950/20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-24 space-y-4">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              An Elegant, <span className="gradient-text font-display">Secure Assembly</span>
            </h2>
            <p className="text-lg text-surface-400 max-w-2xl mx-auto font-light">
              How we construct the memorial experience from initial archival logs to infinite connection.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-12 relative">
            
            {/* Timeline connectors */}
            <div className="hidden lg:block absolute top-[28%] left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-beyond-purple/20 via-beyond-pink/20 to-beyond-blue/20 -z-10" />

            {steps.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="flex flex-col items-center text-center relative px-4"
              >
                {/* Circular pulsing step node */}
                <div className="w-24 h-24 rounded-full bg-surface-900 border border-surface-800 flex items-center justify-center mb-8 relative shadow-xl hover:scale-105 transition-transform duration-300">
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-beyond-purple/10 to-beyond-pink/10 animate-pulse" />
                  <item.icon className="w-9 h-9 text-beyond-purple relative z-10" />
                  
                  {/* Floating badge for step index */}
                  <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-md bg-gradient-to-r from-beyond-purple to-beyond-pink text-[10px] font-mono font-bold tracking-widest text-white shadow-md">
                    {item.step}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{item.title}</h3>
                <p className="text-sm text-surface-400 leading-relaxed font-light max-w-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Testimonials Review Slider */}
      <section className="py-28 relative border-t border-surface-900/60 bg-surface-950/50 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Healing Through <span className="gradient-text font-display">Preservation</span>
            </h2>
            <p className="text-lg text-surface-400 max-w-xl mx-auto font-light">
              Voices of our community processing grief, fostering continuity, and sharing real comfort.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                className="glow-card p-8 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  {/* Glowing starts */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-4.5 h-4.5 text-amber-400 fill-amber-400/40" />
                    ))}
                  </div>
                  <p className="text-sm text-surface-300 leading-relaxed italic font-light">&ldquo;{testimonial.quote}&rdquo;</p>
                </div>
                
                {/* Author footer */}
                <div className="flex items-center space-x-4 pt-8 border-t border-surface-900/80 mt-6">
                  <div className="w-10 h-10 rounded-full bg-surface-800 p-0.5 border border-surface-700/65">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.author} 
                      className="w-full h-full rounded-full object-cover grayscale opacity-90 hover:grayscale-0 transition-all duration-300"
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">{testimonial.author}</div>
                    <div className="text-[11px] font-mono tracking-widest text-beyond-pink uppercase font-medium">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* Cyberpunk Premium CTA Section */}
      <section className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl border border-surface-800 overflow-hidden shadow-[0_0_60px_rgba(139,92,246,0.15)] bg-surface-900/35 backdrop-blur-2xl"
          >
            {/* Dynamic visual overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-beyond-purple/20 via-beyond-pink/15 to-beyond-blue/20 mix-blend-screen opacity-90" />
            <div className="absolute top-[-30%] right-[-30%] w-[60%] h-[60%] rounded-full bg-beyond-purple/20 blur-3xl pointer-events-none" />
            
            <div className="relative p-12 md:p-20 text-center space-y-8 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Begin Building Their <br />
                <span className="gradient-text font-display">Infinite Legacy</span>
              </h2>
              
              <p className="text-base md:text-lg text-surface-300 leading-relaxed font-light">
                Provide comfort for the present, security for the archives, and digital continuity for generations to come. Assemble your first private persona at no cost.
              </p>

              <div className="pt-4">
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center px-8 py-4.5 bg-gradient-to-r from-beyond-purple to-beyond-pink hover:scale-105 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] text-white font-bold rounded-xl transition-all duration-300 tracking-wider uppercase text-xs sweep-glow"
                >
                  Create Persona Free
                  <ArrowRight className="w-4 h-4 ml-2 animate-[slideRight_1.5s_infinite]" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Safeguards Badges */}
      <section id="pricing" className="py-16 border-t border-surface-900/60 bg-surface-950/25 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
            {[
              { icon: Shield, label: 'End-to-End Encryption', desc: 'Secure AES-256 Storage' },
              { icon: Lock, label: 'Verified Consent Gate', desc: 'Strict family authorization' },
              { icon: Users, label: '50K+ Active Archives', desc: 'Highly trusted memorials' },
              { icon: Compass, label: 'Ethical Directives', desc: 'Compliant legacy code' },
            ].map((badge, index) => (
              <div key={index} className="flex flex-col items-center space-y-3 text-center group">
                <div className="w-11 h-11 rounded-xl bg-surface-900 border border-surface-800 flex items-center justify-center text-surface-400 group-hover:text-beyond-cyan group-hover:border-beyond-cyan/40 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all duration-300">
                  <badge.icon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white tracking-wide uppercase">{badge.label}</div>
                  <div className="text-[10px] font-mono text-surface-500 tracking-wide">{badge.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Area */}
      <footer className="py-16 border-t border-surface-900/60 bg-surface-950/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3 group">
              <div className="w-9 h-9 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img src="/favicon.svg" alt="Beyond Life AI Logo" className="w-9 h-9 object-contain" />
              </div>
              <div className="text-left">
                <span className="font-extrabold text-sm tracking-widest text-white block uppercase">Beyond Life AI</span>
                <span className="text-[9px] font-mono tracking-widest text-surface-500 font-medium -mt-1 block uppercase">Developed by Codexion</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-8 text-xs font-mono tracking-widest text-surface-400">
              <Link href="/privacy" className="hover:text-beyond-purple transition-colors duration-200">PRIVACY</Link>
              <Link href="/terms" className="hover:text-beyond-pink transition-colors duration-200">TERMS</Link>
              <Link href="/contact" className="hover:text-beyond-cyan transition-colors duration-200">CONTACT</Link>
            </div>
          </div>
          
          <div className="mt-12 text-center text-[10px] font-mono tracking-widest text-surface-600">
            © 2024 CODEXION. ALL RIGHTS RESERVED. SECURED LEGACY DEPLOYMENT MODEL v1.8.2.
          </div>
        </div>
      </footer>

      {/* Cinematic Demo Video Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 100, damping: 18 }}
            className="bg-surface-950 rounded-2xl border border-surface-800 w-full max-w-4xl overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.3)]"
          >
            <div className="flex items-center justify-between p-5 border-b border-surface-900 bg-surface-950">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-beyond-pink animate-ping" />
                <h2 className="text-base font-bold tracking-wider uppercase text-white font-mono">Secured Sandbox Demo Video</h2>
              </div>
              <button 
                onClick={() => setShowDemo(false)}
                className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-900 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black relative">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                title="Afterlife AI Demo"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
