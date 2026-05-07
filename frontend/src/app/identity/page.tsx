'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Brain, 
  Lock, 
  Fingerprint, 
  Activity, 
  Eye, 
  UserCheck, 
  Key,
  Cpu,
  Globe,
  Database,
  Search,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import FloatingParticles from '@/components/FloatingParticles';
import PerspectiveGrid from '@/components/PerspectiveGrid';
import { cn } from '@/lib/utils';

export default function IdentityPage() {
  const [activeTab, setActiveTab] = useState('protection');

  const securityFeatures = [
    {
      id: 'protection',
      title: 'Neural Protection',
      description: 'Quantum-resistant encryption for your digital consciousness.',
      icon: Shield,
      color: 'beyond-purple',
      details: [
        'End-to-end memory encryption using Lattic-based cryptography',
        'Decentralized consciousness storage across multiple secure nodes',
        'Biometric-neural verification for all access requests',
        'Automatic neural pruning of sensitive temporary data'
      ]
    },
    {
      id: 'sovereignty',
      title: 'Digital Sovereignty',
      description: 'You own your data, your memories, and your digital twin.',
      icon: Fingerprint,
      color: 'beyond-pink',
      details: [
        'Zero-knowledge proof validation of persona ownership',
        'Cross-platform digital identity portability',
        'Granular permission management for memory sharing',
        'Irrevocable right-to-be-forgotten neural wipe protocols'
      ]
    },
    {
      id: 'integrity',
      title: 'Memory Integrity',
      description: 'Ensuring the historical accuracy of your synthesized self.',
      icon: Activity,
      color: 'beyond-cyan',
      details: [
        'Blockchain-verified memory timestamps',
        'AI-driven hallucination detection and correction',
        'Multi-source verification of persona experiences',
        'Historical fidelity checks for generational continuity'
      ]
    }
  ];

  return (
    <main className="min-h-screen bg-surface-950 text-white selection:bg-beyond-purple/30 overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <PerspectiveGrid />
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950/0 via-surface-950/80 to-surface-950" />
      </div>
      <FloatingParticles />
      
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-beyond-purple/20 rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[5%] left-[-5%] w-[500px] h-[500px] bg-beyond-pink/10 rounded-full blur-[120px] pointer-events-none" />

      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-xl"
          >
            <Shield className="w-4 h-4 text-beyond-purple" />
            <span className="text-xs font-bold text-surface-300 tracking-[0.2em] uppercase">Core Protocols</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-8"
          >
            Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-beyond-purple via-beyond-pink to-beyond-purple animate-gradient-x">Sovereignty</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-surface-400 max-w-3xl mx-auto leading-relaxed font-light"
          >
            Our neural-encryption protocols ensure that your digital legacy remains private, 
            secure, and entirely under your control for generations to come.
          </motion.p>
        </div>

        {/* Interactive Identity Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-4 space-y-4">
            {securityFeatures.map((feature, index) => (
              <motion.button
                key={feature.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                onClick={() => setActiveTab(feature.id)}
                className={cn(
                  "w-full text-left p-6 rounded-3xl transition-all duration-500 border group relative overflow-hidden",
                  activeTab === feature.id 
                    ? "bg-white/10 border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] scale-[1.02]" 
                    : "bg-white/5 border-white/5 hover:border-white/10 opacity-60 hover:opacity-100"
                )}
              >
                {activeTab === feature.id && (
                  <motion.div 
                    layoutId="active-identity-bg"
                    className="absolute inset-0 bg-gradient-to-br from-beyond-purple/10 to-beyond-pink/10"
                  />
                )}
                
                <div className="flex items-center space-x-4 relative z-10">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                    activeTab === feature.id 
                      ? "bg-beyond-purple/20 border-beyond-purple/40 scale-110" 
                      : "bg-white/5 border-white/10 group-hover:scale-110"
                  )}>
                    <feature.icon className={cn(
                      "w-6 h-6 transition-colors duration-500",
                      activeTab === feature.id ? "text-beyond-purple" : "text-surface-400"
                    )} />
                  </div>
                  <div>
                    <h3 className={cn(
                      "font-bold transition-colors duration-500",
                      activeTab === feature.id ? "text-white" : "text-surface-400"
                    )}>{feature.title}</h3>
                    <p className="text-xs text-surface-500 mt-1 line-clamp-1">{feature.description}</p>
                  </div>
                </div>
              </motion.button>
            ))}

            {/* Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6 rounded-3xl bg-surface-900/50 border border-white/5 mt-8 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-surface-500 uppercase tracking-widest">Network Status</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-surface-400">Encryption Layer</span>
                  <span className="text-beyond-purple font-mono">Q-READY v4.2</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-surface-400">Memory Nodes</span>
                  <span className="text-white font-mono">1,402 Active</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "94%" }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="h-full bg-gradient-to-r from-beyond-purple to-beyond-pink"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature Display Area */}
          <div className="lg:col-span-8 h-full">
            <AnimatePresence mode="wait">
              {securityFeatures.map((feature) => (
                activeTab === feature.id && (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, x: 20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="bg-surface-900/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-10 lg:p-14 relative overflow-hidden h-full min-h-[500px]"
                  >
                    <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-beyond-purple/5 rounded-full blur-[100px] pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center space-x-4 mb-8">
                        <div className="w-16 h-16 rounded-3xl bg-beyond-purple/20 flex items-center justify-center border border-beyond-purple/30">
                          <feature.icon className="w-8 h-8 text-beyond-purple" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold">{feature.title}</h2>
                          <p className="text-beyond-pink font-mono text-sm tracking-widest mt-1 uppercase">PROTOCOL_0x{feature.id.toUpperCase()}</p>
                        </div>
                      </div>

                      <p className="text-xl text-surface-300 leading-relaxed font-light mb-12">
                        {feature.description} We utilize the most advanced neural mapping technologies 
                        to ensure that your digital presence is not just a copy, but a true extension of your biological identity.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {feature.details.map((detail, i) => (
                          <motion.div 
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + (i * 0.1) }}
                            className="flex items-start space-x-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group"
                          >
                            <div className="w-6 h-6 rounded-lg bg-beyond-purple/10 flex items-center justify-center mt-0.5 group-hover:bg-beyond-purple/20 transition-colors">
                              <ChevronRight className="w-4 h-4 text-beyond-purple" />
                            </div>
                            <span className="text-sm text-surface-400 leading-snug group-hover:text-white transition-colors">
                              {detail}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      <div className="mt-12 flex flex-wrap gap-4">
                        <button className="px-8 py-4 rounded-2xl bg-beyond-purple text-white font-bold text-sm hover:scale-105 transition-transform shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                          Configure Protocols
                        </button>
                        <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors backdrop-blur-xl">
                          Security Audit
                        </button>
                      </div>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute bottom-10 right-10 opacity-10">
                      <feature.icon className="w-64 h-64" />
                    </div>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Security Seals */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-32 pt-12 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          <div className="space-y-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
            <Lock className="w-8 h-8 mx-auto text-beyond-purple" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-500">Quantum Proof</p>
          </div>
          <div className="space-y-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
            <Eye className="w-8 h-8 mx-auto text-beyond-pink" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-500">Zero Trust Access</p>
          </div>
          <div className="space-y-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
            <Database className="w-8 h-8 mx-auto text-beyond-cyan" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-500">Immutable Storage</p>
          </div>
          <div className="space-y-3 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
            <Globe className="w-8 h-8 mx-auto text-beyond-purple" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-surface-500">Decentralized Mesh</p>
          </div>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
        <span className="text-[80px] font-black text-white/5 select-none uppercase tracking-[0.5em]">IDENTITY</span>
      </div>
    </main>
  );
}
