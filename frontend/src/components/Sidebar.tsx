'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageCircle, 
  Settings, 
  LogOut,
  Shield,
  Plus,
  Zap,
  Activity
} from 'lucide-react';
import { useAuthStore, usePersonaStore } from '@/store';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const { personas } = usePersonaStore();
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const menuItems = [
    { id: 'personas', label: 'Personas', icon: Users, href: '/dashboard' },
    { id: 'chats', label: 'Conversations', icon: MessageCircle, href: '/dashboard/chats' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ];

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  return (
    <motion.aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredItem(null);
      }}
      initial={false}
      animate={{ 
        width: isHovered ? 260 : 80,
        x: 0,
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 380, 
        damping: 35,
        mass: 0.8
      }}
      className="fixed left-6 top-24 bottom-8 z-40 hidden lg:flex flex-col group/sidebar"
    >
      <div className="flex-1 bg-slate-950/45 backdrop-blur-3xl border border-white/[0.08] rounded-[2.5rem] p-3 flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden relative transition-all duration-300">
        {/* Animated Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-beyond-purple/10 blur-[50px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-beyond-pink/5 blur-[50px] rounded-full pointer-events-none" />
        
        {/* Premium Top Border Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

        {/* Create Button Section */}
        <div className="mb-8 relative z-10">
          <Link href="/dashboard/create">
            <motion.div
              className={cn(
                "flex items-center rounded-2xl bg-gradient-to-r from-beyond-purple via-violet-600 to-beyond-pink text-white shadow-[0_8px_30px_rgb(139,92,246,0.3)] overflow-hidden relative group/create cursor-pointer",
                isHovered ? "px-5 py-4 space-x-3" : "w-14 h-14 mx-auto flex items-center justify-center"
              )}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => !isHovered && setHoveredItem('initialize')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Outer Pulsing Ring for Collapsed State */}
              {!isHovered && (
                <div className="absolute inset-0 rounded-2xl border border-beyond-purple/40 animate-ping opacity-25 pointer-events-none" />
              )}
              
              {/* Sweep Light Reflection */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/create:translate-x-full transition-transform duration-1000 ease-out" />
              
              <Plus className="w-5 h-5 flex-shrink-0 relative z-10 transition-transform duration-300 group-hover/create:rotate-90" />
              
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="font-black text-xs whitespace-nowrap tracking-widest relative z-10 uppercase"
                  >
                    Initialize AI
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>

          {/* Tooltip for Collapsed State */}
          <AnimatePresence>
            {!isHovered && hoveredItem === 'initialize' && (
              <motion.div
                initial={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 20, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3.5 py-2 bg-gradient-to-r from-beyond-purple to-beyond-pink text-white text-[10px] font-black rounded-xl whitespace-nowrap shadow-2xl z-50 pointer-events-none tracking-widest uppercase"
              >
                Initialize AI
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-[6px] border-transparent border-r-beyond-purple" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-2.5 relative z-10">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <div key={item.id} className="relative">
                <Link href={item.href}>
                  <motion.div 
                    onMouseEnter={() => !isHovered && setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      "flex items-center rounded-2xl transition-all duration-300 relative group/item overflow-hidden cursor-pointer",
                      isHovered ? "px-4 py-3.5 space-x-4" : "w-14 h-14 mx-auto justify-center",
                      isActive 
                        ? "text-white bg-white/[0.06] border border-white/[0.04] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                        : "text-surface-400 hover:text-white hover:bg-white/[0.03]"
                    )}
                    whileHover={{ x: isHovered ? 4 : 0 }}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 bg-gradient-to-r from-beyond-purple/15 to-transparent border-l-[3px] border-beyond-purple rounded-2xl"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    
                    <item.icon className={cn(
                      "w-5 h-5 transition-all duration-300 flex-shrink-0 relative z-10",
                      isActive 
                        ? "text-beyond-purple drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] scale-110" 
                        : "group-hover/item:text-beyond-purple group-hover/item:scale-110"
                    )} />
                    
                    <AnimatePresence mode="wait">
                      {isHovered && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          className="font-bold whitespace-nowrap text-[11px] tracking-widest uppercase relative z-10"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>

                {/* Tooltip for Collapsed State */}
                <AnimatePresence>
                  {!isHovered && hoveredItem === item.id && (
                    <motion.div
                      initial={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, x: 20, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, x: 10, filter: 'blur(4px)' }}
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-900 border border-white/[0.08] text-white text-[10px] font-black rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none uppercase tracking-widest"
                    >
                      {item.label}
                      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Neural Links Section */}
          <AnimatePresence>
            {isHovered && personas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="pt-6 mt-6 border-t border-white/[0.05]"
              >
                <div className="flex items-center justify-between mb-4 px-4">
                  <span className="text-[9px] font-black text-surface-500 uppercase tracking-[0.25em]">
                    Neural Links
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
                </div>
                <div className="space-y-1.5">
                  {personas.slice(0, 4).map((persona) => (
                    <Link
                      key={persona.id}
                      href={`/dashboard/chats?persona=${persona.id}`}
                      className="flex items-center space-x-3 px-4 py-2 rounded-2xl text-surface-400 hover:text-white hover:bg-white/[0.04] transition-all duration-300 group/persona relative"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover/persona:border-beyond-purple/40 transition-all duration-300 overflow-hidden relative shadow-inner">
                        {persona.avatar_url ? (
                          <img src={persona.avatar_url} alt={persona.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/10 to-beyond-pink/10" />
                        )}
                        {!persona.avatar_url && <Activity className="w-3.5 h-3.5 text-surface-500 group-hover/persona:text-beyond-purple transition-colors" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="truncate text-[11px] font-bold tracking-wide">{persona.title}</span>
                        <span className="text-[8px] text-emerald-400/80 font-black tracking-wide uppercase mt-0.5 group-hover/persona:text-emerald-400 transition-colors">Sync Active</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* System Status & Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-white/[0.05] space-y-1.5 relative z-10">
          {/* System Status Indicator */}
          <div className={cn(
            "flex items-center rounded-2xl mb-4 transition-all duration-300 border",
            isHovered 
              ? "px-4 py-3 bg-white/[0.02] border-white/[0.05] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]" 
              : "w-14 h-14 mx-auto justify-center border-transparent"
          )}>
            <div className="relative">
              <Zap className={cn("w-5 h-5 transition-colors", isHovered ? "text-beyond-purple" : "text-beyond-purple/60")} />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-40" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            </div>
            {isHovered && (
              <div className="ml-4 flex-1">
                <p className="text-[10px] font-black text-white tracking-widest uppercase">System Core</p>
                <p className="text-[8px] text-emerald-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                  Active <span className="text-surface-600">•</span> Sync 99.8%
                </p>
              </div>
            )}
          </div>

          {/* Privacy Link */}
          <Link href="/dashboard/settings?tab=privacy">
            <motion.div 
              className={cn(
                "flex items-center rounded-2xl text-surface-400 hover:text-white hover:bg-white/[0.03] transition-all duration-300 group/bottom cursor-pointer relative",
                isHovered ? "px-4 py-3.5 space-x-4" : "w-14 h-14 mx-auto justify-center"
              )}
              onMouseEnter={() => !isHovered && setHoveredItem('privacy')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Shield className="w-5 h-5 flex-shrink-0 group-hover/bottom:text-beyond-purple group-hover/bottom:drop-shadow-[0_0_6px_rgba(139,92,246,0.4)] transition-colors" />
              {isHovered && <span className="text-[11px] font-bold uppercase tracking-widest">Privacy</span>}
              
              {/* Tooltip */}
              {!isHovered && hoveredItem === 'privacy' && (
                <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 border border-white/[0.08] text-white text-[10px] font-black rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none uppercase tracking-widest">
                  Privacy
                  <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-slate-900" />
                </div>
              )}
            </motion.div>
          </Link>

          {/* Disconnect Action */}
          <button 
            onClick={handleLogout}
            onMouseEnter={() => !isHovered && setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className={cn(
              "flex items-center rounded-2xl text-red-400/50 hover:text-red-400 hover:bg-red-500/[0.04] transition-all duration-300 w-full relative",
              isHovered ? "px-4 py-3.5 space-x-4" : "w-14 h-14 mx-auto justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0 transition-transform group-hover/bottom:-translate-x-0.5" />
            {isHovered && <span className="text-[11px] font-bold uppercase tracking-widest text-left">Disconnect</span>}
            
            {/* Tooltip */}
            {!isHovered && hoveredItem === 'logout' && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-red-950/80 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none uppercase tracking-widest">
                Disconnect
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-red-950" />
              </div>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
