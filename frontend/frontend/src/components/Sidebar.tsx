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
  ChevronRight,
  Shield,
  HelpCircle,
  Plus,
  LayoutDashboard,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { useAuthStore, usePersonaStore } from '@/store';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { personas } = usePersonaStore();
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Vault', icon: LayoutDashboard, href: '/dashboard' },
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
        stiffness: 400, 
        damping: 30,
        mass: 0.8
      }}
      className="fixed left-6 top-24 bottom-8 z-40 hidden lg:flex flex-col group/sidebar"
    >
      <div className="flex-1 bg-surface-950/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-3 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative">
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-beyond-purple/5 to-transparent pointer-events-none" />
        
        {/* Premium Border Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Create Button Section */}
        <div className="mb-8 relative z-10">
          <Link href="/dashboard/create">
            <motion.div
              className={cn(
                "flex items-center rounded-[1.5rem] bg-beyond-purple text-white shadow-lg shadow-beyond-purple/20 overflow-hidden relative group/create",
                isHovered ? "px-5 py-4 space-x-3" : "w-14 h-14 mx-auto flex items-center justify-center"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => !isHovered && setHoveredItem('initialize')}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover/create:translate-x-full transition-transform duration-1000" />
              <Plus className="w-6 h-6 flex-shrink-0 relative z-10" />
              <AnimatePresence>
                {isHovered && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-black text-sm whitespace-nowrap tracking-wide relative z-10"
                  >
                    INITIALIZE AI
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          </Link>

          {/* Tooltip for Collapsed State */}
          <AnimatePresence>
            {!isHovered && hoveredItem === 'initialize' && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 20 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-beyond-purple text-white text-[10px] font-black rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none"
              >
                INITIALIZE AI
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-beyond-purple" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 space-y-2 relative z-10">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <div key={item.id} className="relative">
                <Link href={item.href}>
                  <motion.div 
                    onMouseEnter={() => !isHovered && setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      "flex items-center rounded-2xl transition-all duration-500 relative group/item overflow-hidden",
                      isHovered ? "px-4 py-3.5 space-x-4" : "w-14 h-14 mx-auto justify-center",
                      isActive 
                        ? "bg-white/10 text-white" 
                        : "text-surface-400 hover:text-white hover:bg-white/5"
                    )}
                    whileHover={{ x: isHovered ? 4 : 0 }}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 bg-gradient-to-r from-beyond-purple/20 to-transparent border-l-2 border-beyond-purple"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <item.icon className={cn(
                      "w-5 h-5 transition-all duration-300 flex-shrink-0 relative z-10",
                      isActive ? "text-beyond-purple scale-110" : "group-hover/item:text-beyond-purple group-hover/item:scale-110"
                    )} />
                    
                    <AnimatePresence mode="wait">
                      {isHovered && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="font-bold whitespace-nowrap text-xs tracking-[0.1em] uppercase relative z-10"
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
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 20 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-surface-900 border border-white/10 text-white text-[10px] font-black rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none uppercase tracking-widest"
                    >
                      {item.label}
                      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-surface-900" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Personas Section */}
          <AnimatePresence>
            {isHovered && personas.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="pt-6 mt-6 border-t border-white/5"
              >
                <p className="text-[9px] font-black text-surface-500 uppercase tracking-[0.3em] mb-4 px-4">
                  Neural Links
                </p>
                <div className="space-y-1">
                  {personas.slice(0, 4).map((persona) => (
                    <Link
                      key={persona.id}
                      href={`/dashboard/chats?persona=${persona.id}`}
                      className="flex items-center space-x-3 px-4 py-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/5 transition-all group/persona"
                    >
                      <div className="w-8 h-8 rounded-lg bg-surface-900 border border-white/5 flex items-center justify-center flex-shrink-0 group-hover/persona:border-beyond-purple/30 transition-all overflow-hidden relative shadow-inner">
                         {persona.avatar_url ? (
                          <img src={persona.avatar_url} alt={persona.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-beyond-purple/10 to-beyond-pink/10" />
                        )}
                        {!persona.avatar_url && <Activity className="w-3.5 h-3.5 text-surface-600 group-hover/persona:text-beyond-purple transition-colors" />}
                      </div>
                      <span className="truncate text-[11px] font-bold tracking-wide">{persona.title}</span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* System Status & Bottom Actions */}
        <div className="mt-auto pt-4 border-t border-white/5 space-y-1 relative z-10">
          {/* System Status Indicator */}
          <div className={cn(
            "flex items-center rounded-2xl mb-4 transition-all duration-300",
            isHovered ? "px-4 py-3 bg-white/5 border border-white/5" : "w-14 h-14 mx-auto justify-center"
          )}>
            <div className="relative">
              <Zap className={cn("w-5 h-5", isHovered ? "text-beyond-purple" : "text-beyond-purple/50")} />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
            {isHovered && (
              <div className="ml-4 flex-1">
                <p className="text-[9px] font-black text-white tracking-widest uppercase">Vault Online</p>
                <p className="text-[8px] text-surface-500 font-bold uppercase mt-0.5">Sync: 98.4%</p>
              </div>
            )}
          </div>

          <Link href="/dashboard/settings?tab=privacy">
             <motion.div 
                className={cn(
                  "flex items-center rounded-2xl text-surface-400 hover:text-white hover:bg-white/5 transition-all group/bottom",
                  isHovered ? "px-4 py-3 space-x-4" : "w-14 h-14 mx-auto justify-center"
                )}
                onMouseEnter={() => !isHovered && setHoveredItem('privacy')}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <Shield className="w-5 h-5 flex-shrink-0 group-hover/bottom:text-beyond-purple transition-colors" />
                {isHovered && <span className="text-xs font-bold uppercase tracking-widest">Privacy</span>}
                
                {/* Tooltip */}
                {!isHovered && hoveredItem === 'privacy' && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-surface-900 border border-white/10 text-white text-[10px] font-black rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none uppercase tracking-widest">
                    Privacy
                    <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-surface-900" />
                  </div>
                )}
              </motion.div>
          </Link>

          <button 
            onClick={handleLogout}
            onMouseEnter={() => !isHovered && setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className={cn(
              "flex items-center rounded-2xl text-red-400/50 hover:text-red-400 hover:bg-red-500/5 transition-all w-full relative",
              isHovered ? "px-4 py-3 space-x-4" : "w-14 h-14 mx-auto justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isHovered && <span className="text-xs font-bold uppercase tracking-widest">Disconnect</span>}
            
            {/* Tooltip */}
            {!isHovered && hoveredItem === 'logout' && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-red-500/20 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg whitespace-nowrap shadow-2xl z-50 pointer-events-none uppercase tracking-widest">
                Disconnect
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-4 border-transparent border-r-red-500/20" />
              </div>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
    );
}


