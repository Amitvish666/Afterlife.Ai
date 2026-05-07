'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Trash2, 
  ChevronRight, 
  Shield, 
  Mic, 
  Image as ImageIcon, 
  FileText,
  Activity,
  Sparkles,
  Layers,
  Cpu,
  Plus
} from 'lucide-react';
import { Persona, Task } from '@/store';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PersonaCardProps {
  persona: Persona;
  tasks: Task[];
  onDelete: (id: string, e: React.MouseEvent) => void;
  index: number;
}

export default function PersonaCard({ persona, tasks, onDelete, index }: PersonaCardProps) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 3D Tilt Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const getTaskIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('memory') || t.includes('upload')) return Layers;
    if (t.includes('voice')) return Mic;
    if (t.includes('avatar') || t.includes('neural')) return Cpu;
    if (t.includes('identity')) return Shield;
    return FileText;
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { 
          type: 'spring', 
          damping: 20, 
          stiffness: 100,
          delay: index * 0.1 
        }
      }}
      whileHover={{ scale: 1.02 }}
      className="relative group cursor-pointer"
      onClick={() => router.push(`/dashboard/chats?persona=${persona.id}`)}
    >
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 bg-beyond-purple/20 rounded-[2.5rem] blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Main Card Container */}
      <div 
        className="relative h-full bg-surface-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col shadow-2xl overflow-hidden"
        style={{ transform: "translateZ(50px)" }}
      >
        {/* Animated Border Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-beyond-purple/20 to-transparent animate-scan" />
        </div>

        {/* Glossy Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="flex items-center space-x-6">
            <div className="relative group/avatar">
              <motion.div 
                className="w-20 h-20 rounded-3xl bg-surface-800/80 flex items-center justify-center border border-white/10 overflow-hidden relative shadow-inner"
                whileHover={{ scale: 1.1, rotate: 2 }}
              >
                {persona.avatar_url ? (
                  <img src={persona.avatar_url} alt={persona.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 flex items-center justify-center">
                    <Users className="w-10 h-10 text-beyond-purple/60" />
                  </div>
                )}
                {/* Avatar Shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/avatar:translate-x-full transition-transform duration-1000" />
              </motion.div>
              
              {/* Online Indicator */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-surface-950 z-20 shadow-[0_0_15px_#10b981]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-black text-white group-hover:text-beyond-purple transition-colors tracking-tight truncate">
                {persona.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-surface-400">
                  {persona.relation || 'Legacy Entity'}
                </span>
                <span className="text-surface-600 text-[10px] font-black">/</span>
                <span className="text-surface-500 text-[10px] font-bold uppercase tracking-widest opacity-60">
                  REF: {persona.id.slice(0, 8)}
                </span>
              </div>
            </div>
          </div>

          <motion.button
            onClick={(e) => onDelete(persona.id, e)}
            className="p-3 rounded-2xl bg-white/5 text-surface-600 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all shrink-0"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Description / Status Message */}
        <div className="relative z-10 mb-8 flex-1">
          <p className="text-surface-400 text-lg leading-relaxed italic opacity-70 group-hover:opacity-100 transition-opacity line-clamp-3">
            {persona.description || 'Integrating consciousness fragments through neural synchronization protocols...'}
          </p>
        </div>

        {/* Progress System */}
        <div className="relative z-10 mt-auto">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-surface-500 mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-3 h-3 text-beyond-purple animate-pulse" />
              <span>Neural Sync Status</span>
            </div>
            <span className="text-beyond-purple font-black">{progress}% Archival</span>
          </div>
          
          <div className="h-3 w-full bg-surface-950/50 rounded-full overflow-hidden border border-white/5 p-0.5 relative group/progress">
            <motion.div 
              className="h-full bg-gradient-to-r from-beyond-purple via-beyond-pink to-beyond-purple bg-[length:200%_auto] rounded-full relative"
              initial={{ width: 0 }}
              animate={{ 
                width: `${progress}%`,
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ 
                width: { duration: 1.5, delay: index * 0.1 },
                backgroundPosition: { duration: 5, repeat: Infinity, ease: 'linear' }
              }}
            >
              {/* Progress Glow */}
              <div className="absolute inset-0 shadow-[0_0_20px_rgba(139,92,246,0.6)] rounded-full" />
            </motion.div>
          </div>

          {/* Neural Nodes (Tasks) */}
          <div className="mt-8 grid grid-cols-4 gap-3">
            {tasks.slice(0, 4).map((task, i) => {
              const TaskIcon = getTaskIcon(task.type);
              return (
                <div 
                  key={task.id}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-[1.25rem] border transition-all duration-700",
                    task.status === 'completed' 
                      ? "bg-beyond-purple/10 border-beyond-purple/20 text-beyond-purple shadow-[0_0_25px_rgba(139,92,246,0.15)]" 
                      : "bg-surface-900/50 border-white/5 text-surface-600 group-hover:border-white/10"
                  )}
                  style={{ transform: `translateZ(${20 + i * 5}px)` }}
                >
                  <TaskIcon className={cn(
                    "w-5 h-5 mb-2",
                    task.status === 'completed' ? "animate-pulse" : ""
                  )} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-center truncate w-full">
                    {task.type.split(' ')[0]}
                  </span>
                </div>
              );
            })}
            
            {/* Fill remaining slots */}
            {Array.from({ length: Math.max(0, 4 - tasks.length) }).map((_, i) => (
              <div 
                key={`empty-${i}`}
                className="flex flex-col items-center justify-center p-4 rounded-[1.25rem] border border-dashed border-white/5 text-surface-800"
                style={{ transform: `translateZ(${20 + (tasks.length + i) * 5}px)` }}
              >
                <Sparkles className="w-4 h-4 mb-2 opacity-20" />
                <span className="text-[8px] font-black uppercase tracking-widest">Awaiting</span>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between relative">
             <div className="flex -space-x-2">
               {[1, 2, 3].map(i => (
                 <motion.div 
                    key={i} 
                    className="w-9 h-9 rounded-full border-2 border-surface-900 bg-surface-800 flex items-center justify-center shadow-2xl overflow-hidden relative"
                    whileHover={{ scale: 1.2, zIndex: 10, y: -5 }}
                  >
                    <img 
                      src={`https://i.pravatar.cc/100?u=${persona.id}-${i}`} 
                      alt="" 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                    />
                    <div className="absolute inset-0 bg-beyond-purple/10 mix-blend-overlay" />
                 </motion.div>
               ))}
               <div className="w-9 h-9 rounded-full border-2 border-surface-900 bg-surface-950 flex items-center justify-center text-[10px] font-black text-beyond-purple shadow-2xl backdrop-blur-xl">
                 <Plus className="w-3 h-3" />
               </div>
             </div>
             
             <motion.button
              className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white text-white hover:text-black font-black text-xs transition-all flex items-center space-x-2 group/btn border border-white/10"
              whileHover={{ scale: 1.05, x: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>ACCESS VAULT</span>
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
