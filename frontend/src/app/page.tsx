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
  Image, 
  MessageCircle,
  ArrowRight,
  Play,
  Upload,
  Users,
  Shield,
  Clock,
  Globe,
  LogOut,
  X
} from 'lucide-react';
import { useAuthStore } from '@/store';

const features = [
  {
    icon: Brain,
    title: 'Smart Memory Extraction',
    description: 'Our AI analyzes texts, chats, and documents to extract personality traits, memories, and speech patterns.',
    color: 'from-purple-500 to-indigo-500',
  },
  {
    icon: Mic,
    title: 'Voice Cloning',
    description: 'Create realistic voice replicas from audio samples that capture tone, cadence, and emotional expressions.',
    color: 'from-pink-500 to-rose-500',
  },
  {
    icon: Image,
    title: 'Avatar Generation',
    description: 'Generate photorealistic or stylized avatars that bring your persona to life with lip-sync technology.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: MessageCircle,
    title: 'Natural Conversations',
    description: 'Engage in meaningful dialogues powered by RAG technology that recalls personal memories.',
    color: 'from-emerald-500 to-teal-500',
  },
];

const stats = [
  { value: '50K+', label: 'Personas Created' },
  { value: '2M+', label: 'Conversations' },
  { value: '99.9%', label: 'Uptime' },
  { value: '128K', label: 'Languages' },
];

const testimonials = [
  {
    quote: "Talking to my grandmother's AI persona feels like she's still here. The voice, the stories, everything...",
    author: "Sarah M.",
    role: "Daughter",
  },
  {
    quote: "We created a memorial persona for my father. It's helped our family process grief in a beautiful way.",
    author: "Michael R.",
    role: "Son",
  },
  {
    quote: "The attention to privacy and consent is outstanding. I felt safe uploading our family memories.",
    author: "Emma L.",
    role: "Granddaughter",
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

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Beyond Life AI</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-surface-300 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-surface-300 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="#pricing" className="text-surface-300 hover:text-white transition-colors">
                Pricing
              </Link>
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link 
                    href="/dashboard" 
                    className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-surface-800/50 hover:bg-surface-800 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-white text-sm font-semibold">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <span className="text-white font-medium">{user?.name || 'User'}</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="text-surface-400 hover:text-white transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Link href="/login" className="text-surface-300 hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <button 
                    onClick={() => {
                      if (isAuthenticated) {
                        router.push('/dashboard');
                      } else {
                        router.push('/login');
                      }
                    }}
                    className="btn-primary"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-conic from-beyond-purple/20 via-transparent to-transparent animate-spin-slow" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-conic from-beyond-pink/20 via-transparent to-transparent animate-spin-slow" />
          {/* Floating Orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-beyond-purple/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-beyond-pink/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-beyond-purple/10 border border-beyond-purple/20 text-beyond-purple text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4 mr-2" />
                Powered by Advanced AI Technology
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="text-white">Preserve Memories,</span>
              <br />
              <span className="gradient-text">Connect Forever</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-2xl mx-auto text-xl text-surface-300 mb-10"
            >
              Create AI-powered digital personas from your loved ones' memories, 
              conversations, and media. Experience meaningful connections that 
              transcend time.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/dashboard" className="btn-primary text-lg px-8 py-4">
                <Upload className="w-5 h-5 mr-2" />
                Create Your Persona
              </Link>
              <button 
                onClick={() => setShowDemo(true)}
                className="btn-secondary text-lg px-8 py-4 group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-surface-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Powerful Features for
              <span className="gradient-text"> Meaningful Connections</span>
            </h2>
            <p className="text-xl text-surface-400 max-w-2xl mx-auto">
              Everything you need to create, preserve, and interact with digital personas
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-hover p-6 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-surface-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-xl text-surface-400 max-w-2xl mx-auto">
              Create your digital persona in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Upload Memories',
                description: 'Share texts, photos, voice messages, videos, and documents from your loved one.',
                icon: Upload,
              },
              {
                step: '02',
                title: 'AI Processing',
                description: 'Our advanced AI analyzes and learns from the uploaded content to build the persona.',
                icon: Brain,
              },
              {
                step: '03',
                title: 'Start Connecting',
                description: 'Engage in natural conversations with the AI persona whenever you want.',
                icon: Heart,
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {index < 2 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-beyond-purple/50 to-transparent" />
                )}
                <div className="relative text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-surface-800 border border-surface-700 mb-6 relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 animate-pulse" />
                    <item.icon className="w-10 h-10 text-beyond-purple relative z-10" />
                  </div>
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-6xl font-bold text-surface-800">
                    {item.step}
                  </span>
                  <h3 className="text-xl font-semibold text-white mt-4 mb-2">{item.title}</h3>
                  <p className="text-surface-400">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Loved by <span className="gradient-text">Thousands</span>
            </h2>
            <p className="text-xl text-surface-400">See what our community says</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card p-6"
              >
                <div className="flex items-center mb-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className="w-5 h-5 text-amber-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 00-.364 1 0 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <p className="text-surface-300 mb-4 italic">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-surface-500">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-beyond-purple via-beyond-pink to-beyond-blue opacity-90" />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="relative p-12 md:p-16 text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Ready to Preserve Memories?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Start creating meaningful connections that last forever. Your first persona is free.
              </p>
              <Link href="/dashboard" className="inline-flex items-center px-8 py-4 bg-white text-beyond-purple font-semibold rounded-xl hover:bg-surface-100 transition-colors">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-t border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield, label: 'End-to-End Encryption' },
              { icon: Clock, label: '24/7 Support' },
              { icon: Users, label: '50K+ Users' },
              { icon: Globe, label: '128 Languages' },
            ].map((badge, index) => (
              <div key={index} className="flex items-center space-x-2 text-surface-400">
                <badge.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Beyond Life AI</span>
              <span className="text-surface-500">by CODEXION</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-surface-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-surface-500">
            © 2024 CODEXION. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Demo Video Modal */}
      {showDemo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-900 rounded-2xl border border-surface-800 w-full max-w-4xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-surface-800">
              <h2 className="text-xl font-bold text-white">How Beyond Life AI Works</h2>
              <button 
                onClick={() => setShowDemo(false)}
                className="text-surface-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="aspect-video w-full">
              <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1" 
                title="Beyond Life AI Demo"
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
