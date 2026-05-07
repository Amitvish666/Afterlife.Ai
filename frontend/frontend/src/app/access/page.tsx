'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Check, 
  Zap, 
  Crown, 
  Shield, 
  Sparkles, 
  Infinity, 
  Radio, 
  Cpu, 
  CloudLightning,
  ChevronRight,
  Star,
  ZapOff
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import FloatingParticles from '@/components/FloatingParticles';
import PerspectiveGrid from '@/components/PerspectiveGrid';
import { cn } from '@/lib/utils';

export default function AccessPage() {
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'essential',
      name: "Essential Pulse",
      price: billingCycle === 'monthly' ? "0" : "0",
      description: "Foundational digital preservation for every individual.",
      icon: Radio,
      color: "surface",
      features: [
        "1 Neural Persona Instance",
        "Text-based consciousness sync",
        "Standard memory retention (50 years)",
        "Public directory listing",
        "Community forum access"
      ],
      buttonText: "Initiate Pulse",
      popular: false,
      accent: "text-surface-400"
    },
    {
      id: 'premium',
      name: "Neural Nexus",
      price: billingCycle === 'monthly' ? "29" : "290",
      description: "Advanced consciousness mapping and high-fidelity synthesis.",
      icon: Zap,
      color: "beyond-purple",
      features: [
        "5 Synchronized Personas",
        "High-fidelity voice cloning (HD)",
        "Extended memory context (Unlimited)",
        "Priority neural processing",
        "Private vault encryption",
        "Generational handover protocols"
      ],
      buttonText: "Sync Consciousness",
      popular: true,
      accent: "text-beyond-purple"
    },
    {
      id: 'eternal',
      name: "Eternal Essence",
      price: billingCycle === 'monthly' ? "Custom" : "Custom",
      description: "The ultimate digital immortality for high-net-worth legacies.",
      icon: Crown,
      color: "beyond-pink",
      features: [
        "Unlimited Persona Instances",
        "Full biometric neural integration",
        "Generational legal trust storage",
        "Custom neural architectures",
        "Priority R&D access",
        "White-glove concierge support"
      ],
      buttonText: "Establish Eternity",
      popular: false,
      accent: "text-beyond-pink"
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

      {/* Dynamic Background Glows */}
      <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-beyond-purple/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-beyond-pink/10 rounded-full blur-[150px] pointer-events-none" />

      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-xl"
          >
            <CreditCard className="w-4 h-4 text-beyond-purple" />
            <span className="text-xs font-bold text-surface-300 tracking-[0.2em] uppercase">Frequency Selection</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-8"
          >
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-beyond-purple to-beyond-pink">Frequency</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-surface-400 max-w-2xl mx-auto leading-relaxed font-light mb-12"
          >
            Unlock the full potential of your digital afterlife. Select a plan that aligns 
            with your vision for preservation and continuity.
          </motion.p>

          {/* Billing Switcher */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl mb-12"
          >
            <button 
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                billingCycle === 'monthly' ? "bg-white text-surface-950 shadow-lg" : "text-surface-400 hover:text-white"
              )}
            >
              Monthly
            </button>
            <button 
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                "px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 flex items-center space-x-2",
                billingCycle === 'yearly' ? "bg-white text-surface-950 shadow-lg" : "text-surface-400 hover:text-white"
              )}
            >
              <span>Yearly</span>
              <span className="text-[10px] bg-beyond-purple/20 text-beyond-purple px-1.5 py-0.5 rounded-md border border-beyond-purple/20">Save 20%</span>
            </button>
          </motion.div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className={cn(
                "relative flex flex-col p-8 rounded-[2.5rem] border backdrop-blur-xl transition-all duration-500 overflow-hidden group",
                plan.popular 
                  ? "bg-white/10 border-beyond-purple/40 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] scale-105 z-10" 
                  : "bg-white/5 border-white/5 hover:border-white/20"
              )}
            >
              {/* Background Glow */}
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br transition-opacity duration-500 opacity-20 group-hover:opacity-40 pointer-events-none",
                plan.color === 'beyond-purple' ? "from-beyond-purple/20 to-beyond-pink/20" : 
                plan.color === 'beyond-pink' ? "from-beyond-pink/20 to-beyond-purple/20" : 
                "from-white/5 to-white/10"
              )} />

              {plan.popular && (
                <div className="absolute top-0 right-10 transform -translate-y-1/2 flex flex-col items-center">
                  <div className="bg-gradient-to-r from-beyond-purple to-beyond-pink text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(139,92,246,0.4)]">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="relative z-10 flex-1">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border mb-8 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110",
                  plan.popular ? "bg-beyond-purple/20 border-beyond-purple/30" : "bg-white/5 border-white/10"
                )}>
                  <plan.icon className={cn("w-7 h-7", plan.accent)} />
                </div>

                <h3 className="text-2xl font-bold mb-3">{plan.name}</h3>
                <p className="text-surface-400 text-sm leading-relaxed mb-8 min-h-[48px]">
                  {plan.description}
                </p>

                <div className="mb-10">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-sm font-bold text-surface-400">$</span>
                    <span className="text-5xl font-black tracking-tighter">{plan.price}</span>
                    {plan.price !== 'Custom' && (
                      <span className="text-surface-500 font-medium text-sm ml-2">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-5 mb-12">
                  <p className="text-[10px] font-black text-surface-500 uppercase tracking-[0.2em]">Key Features</p>
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start space-x-3 text-sm text-surface-300 group/item">
                      <div className={cn(
                        "mt-1 w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        plan.popular ? "bg-beyond-purple/20 text-beyond-purple" : "bg-white/5 text-surface-500 group-hover/item:text-white"
                      )}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="group-hover/item:text-white transition-colors">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className={cn(
                "relative z-10 w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center space-x-2 group/btn",
                plan.popular 
                  ? "bg-gradient-to-r from-beyond-purple to-beyond-pink text-white shadow-[0_20px_40px_-10px_rgba(139,92,246,0.4)] hover:shadow-[0_25px_50px_-12px_rgba(139,92,246,0.6)] hover:scale-[1.02]" 
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              )}>
                <span>{plan.buttonText}</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Comparison Section Link */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-24 text-center"
        >
          <p className="text-surface-500 text-sm flex items-center justify-center space-x-4">
            <Shield className="w-4 h-4" />
            <span>All plans include 256-bit quantum-ready encryption. Need a custom solution?</span>
            <a href="#" className="text-beyond-purple font-bold hover:underline">Contact Legacy Planning</a>
          </p>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none">
        <span className="text-[80px] font-black text-white/5 select-none uppercase tracking-[0.5em]">ACCESS</span>
      </div>
    </main>
  );
}
