'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Menu, 
  X, 
  User, 
  Bell, 
  Search,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
  HelpCircle,
  LayoutDashboard,
  Compass,
  Info,
  CreditCard
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 pointer-events-none">
      <div className={cn(
        "max-w-7xl mx-auto rounded-[1.5rem] transition-all duration-700 border pointer-events-auto",
        isScrolled 
          ? "bg-surface-950/60 backdrop-blur-3xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 px-6" 
          : "bg-surface-950/20 backdrop-blur-md border-white/5 py-3 px-6"
      )}>
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-9 h-9 flex items-center justify-center"
            >
              <img src="/favicon.svg" alt="Afterlife AI Logo" className="w-9 h-9 object-contain" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-none">Afterlife AI</span>
              <span className="text-[9px] font-bold text-beyond-purple uppercase tracking-[0.2em] leading-none mt-1 opacity-80">Intelligence</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center bg-white/5 backdrop-blur-xl rounded-full p-1 border border-white/5">
            <NavLink href="/dashboard" active={pathname === '/dashboard'} icon={LayoutDashboard}>Vault</NavLink>
            <NavLink href="/explore" active={pathname === '/explore'} icon={Compass}>Explore</NavLink>
            <NavLink href="/about" active={pathname === '/about'} icon={Info}>Identity</NavLink>
            <NavLink href="/pricing" active={pathname === '/pricing'} icon={CreditCard}>Access</NavLink>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-surface-400 hover:text-white transition-colors hover:bg-white/5 rounded-xl"
            >
              <Search className="w-5 h-5" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-surface-400 hover:text-white transition-colors relative hover:bg-white/5 rounded-xl"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-beyond-pink rounded-full border border-surface-950 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
            </motion.button>
            
            <div className="w-px h-5 bg-white/10 mx-2" />

            {/* User Profile */}
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={cn(
                  "flex items-center space-x-2 pl-1 pr-2 py-1 rounded-full transition-all duration-300 border",
                  showUserMenu 
                    ? "bg-beyond-purple/20 border-beyond-purple/40 shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                    : "bg-white/5 border-white/5 hover:border-white/10"
                )}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center text-white text-[10px] font-bold shadow-lg">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-surface-400 transition-transform duration-300", showUserMenu && "rotate-180")} />
              </motion.button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setShowUserMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      className="absolute right-0 mt-3 w-64 bg-surface-950/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] p-2 overflow-hidden"
                    >
                      <div className="p-3 bg-white/5 rounded-xl mb-1 border border-white/5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center text-white text-base font-bold">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-bold truncate">{user?.name || 'User'}</p>
                            <p className="text-surface-500 text-[10px] truncate">{user?.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-0.5">
                        <UserMenuItem icon={User} label="Profile" href="/dashboard/settings?tab=profile" />
                        <UserMenuItem icon={Settings} label="System" href="/dashboard/settings" />
                        <UserMenuItem icon={Shield} label="Privacy" href="/dashboard/settings?tab=privacy" />
                        <UserMenuItem icon={HelpCircle} label="Support" href="/dashboard/settings?tab=help" />
                      </div>
                      
                      <div className="mt-1 pt-1 border-t border-white/5">
                        <button 
                          onClick={() => logout()}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300 text-left group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                            <LogOut className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold">Disconnect</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, active = false, icon: Icon }: { href: string, children: React.ReactNode, active?: boolean, icon: any }) {
  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 relative group",
        active 
          ? "text-white" 
          : "text-surface-400 hover:text-white"
      )}
    >
      {active && (
        <motion.div 
          layoutId="navbar-active"
          className="absolute inset-0 bg-white/10 border border-white/10 rounded-full"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <Icon className={cn("w-3.5 h-3.5 transition-colors", active ? "text-beyond-purple" : "group-hover:text-beyond-purple")} />
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function UserMenuItem({ icon: Icon, label, href }: { icon: any, label: string, href: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center space-x-3 px-3 py-2 rounded-xl text-surface-400 hover:text-white hover:bg-white/5 transition-all duration-300 group text-left"
    >
      <div className="w-7 h-7 rounded-lg bg-surface-800/50 flex items-center justify-center group-hover:bg-beyond-purple/20 group-hover:text-beyond-purple transition-all duration-300">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-bold">{label}</span>
    </Link>
  );
}
