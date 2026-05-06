'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store';
import { type User } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Default to true for persistence
  const processedOAuth = useRef(false);

  // Handle URL errors
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get('error');
    if (error) {
      toast.error(`Authentication error: ${error.replace(/_/g, ' ')}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check for existing session on mount and auto-login
  useEffect(() => {
    const checkExistingSession = async () => {
      // Check for tokens in storage
      const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      
      if (accessToken) {
        // Restore tokens to the appropriate storage based on rememberMe
        const storedRememberMe = localStorage.getItem('remember_me') === 'true';
        
        if (storedRememberMe) {
          // Move tokens to localStorage if rememberMe was true
          if (!localStorage.getItem('access_token')) {
            const refreshToken = sessionStorage.getItem('refresh_token');
            if (refreshToken) {
              localStorage.setItem('access_token', accessToken);
              localStorage.setItem('refresh_token', refreshToken);
              sessionStorage.removeItem('access_token');
              sessionStorage.removeItem('refresh_token');
            }
          }
        }
        
        // Get stored user from auth store
        const user = useAuthStore.getState().user;
        if (user) {
          setLoading(false);
          router.replace('/dashboard');
          return;
        }
        
        // If no user in store but token exists, try to fetch user profile
        try {
          const response = await apiClient.getProfile();
          const userData = response.data.data as User;
          const fullUser: User = {
            ...userData,
            avatar: userData.avatar || undefined,
            consent_given: false,
            retention_period: 365,
          };
          setUser(fullUser);
          router.replace('/dashboard');
        } catch {
          // Token invalid, clear storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    checkExistingSession();
  }, [setUser, setLoading, router]);

  // Check for OAuth success on mount
  useEffect(() => {
    const checkOAuthStatus = async () => {
      // If we already processed this or are already logged in, skip
      if (processedOAuth.current || isAuthenticated) return;

      const searchParams = new URLSearchParams(window.location.search);
      const isOAuthSuccess = searchParams.get('oauth_success') === 'true';
      
      if (!isOAuthSuccess && !document.cookie.includes('access_token')) return;

      // Check for OAuth cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
      
      const token = cookies['access_token'];
      const userId = cookies['oauth_user_id'];
      const userName = cookies['oauth_user_name'];
      const userEmail = cookies['oauth_user_email'];
      const refreshToken = cookies['refresh_token'];
      
      if (token && userEmail) {
        processedOAuth.current = true;
        console.log('OAuth tokens found in cookies. Capturing...');
        
        // Get rememberMe preference from localStorage (default to true for OAuth)
        const storedRememberMe = localStorage.getItem('remember_me');
        const shouldPersist = storedRememberMe === null ? true : storedRememberMe === 'true';
        
        // Store tokens in appropriate storage based on rememberMe
        if (shouldPersist) {
          localStorage.setItem('access_token', token);
          if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
          localStorage.setItem('remember_me', 'true');
        } else {
          sessionStorage.setItem('access_token', token);
          if (refreshToken) sessionStorage.setItem('refresh_token', refreshToken);
        }
        
        // Create user from OAuth data
        const fullUser = {
          id: userId,
          name: decodeURIComponent(userName || userEmail?.split('@')[0] || 'User'),
          email: decodeURIComponent(userEmail),
          created_at: new Date().toISOString(),
          consent_given: false,
          retention_period: 365,
        };
        
        console.log('Setting user and clearing cookies:', fullUser);
        
        // Clear OAuth cookies with path=/
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
        document.cookie = 'oauth_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
        document.cookie = 'oauth_user_name=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
        document.cookie = 'oauth_user_email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/;';
        
        setUser(fullUser);
        toast.success('Welcome! Signed in with Google');
        
        // Force a small delay to ensure store update before redirect
        setTimeout(() => {
          console.log('Redirecting to dashboard...');
          router.replace('/dashboard');
        }, 100);
      } else if (isOAuthSuccess && !processedOAuth.current) {
        // Only show error if we haven't already successfully processed it in this lifecycle
        console.warn('OAuth success param present but cookies missing or incomplete:', {
          hasToken: !!token,
          hasEmail: !!userEmail,
          cookiesFound: Object.keys(cookies)
        });
        
        // Double check if we already have a token in local storage (maybe first useEffect already got it)
        if (localStorage.getItem('access_token') || sessionStorage.getItem('access_token')) {
          console.log('Token already in storage, likely handled by existing session check.');
          // Do not redirect here; let checkExistingSession handle fetching profile and redirecting.
          return;
        }

        toast.error('Authentication successful, but session could not be established. Please try again.');
      }
    };
    
    checkOAuthStatus();
  }, [router, setUser, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiClient.login(email, password);
      const data = response.data.data as { user: User; tokens: { access_token: string; refresh_token: string } };
      const { user, tokens } = data;
      
      localStorage.setItem('remember_me', rememberMe.toString());
      
      // Store tokens in appropriate storage based on rememberMe
      if (rememberMe) {
        localStorage.setItem('access_token', tokens.access_token);
        localStorage.setItem('refresh_token', tokens.refresh_token);
      } else {
        sessionStorage.setItem('access_token', tokens.access_token);
        sessionStorage.setItem('refresh_token', tokens.refresh_token);
      }
      
      // Convert to full user with default values for missing fields
      const fullUser: User = {
        ...user,
        avatar: user.avatar || undefined,
        consent_given: false,
        retention_period: 365,
      };
      setUser(fullUser);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle social login (Google, GitHub, Apple)
  const handleSocialLogin = async (provider: string) => {
    // Redirect to OAuth authorize endpoint
    window.location.href = `/api/auth/oauth/authorize?provider=${provider}`;
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/favicon.svg" alt="Afterlife AI Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-xl font-bold gradient-text">Afterlife AI</span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-surface-400 mb-8">Sign in to continue creating personas</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple focus:border-transparent pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-surface-800 border-surface-700 text-beyond-purple focus:ring-beyond-purple" 
                />
                <span className="ml-2 text-sm text-surface-400">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-beyond-purple hover:text-beyond-pink">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface-900 text-surface-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center py-3 px-4 bg-surface-800 border border-surface-700 rounded-xl text-white hover:bg-surface-700 hover:border-surface-600 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </button>

              {/* GitHub */}
              <button
                type="button"
                onClick={() => handleSocialLogin('github')}
                className="flex items-center justify-center py-3 px-4 bg-surface-800 border border-surface-700 rounded-xl text-white hover:bg-surface-700 hover:border-surface-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/>
                </svg>
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                className="flex items-center justify-center py-3 px-4 bg-surface-800 border border-surface-700 rounded-xl text-white hover:bg-surface-700 hover:border-surface-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-surface-400">
            Don't have an account?{' '}
            <Link href="/register" className="text-beyond-purple hover:text-beyond-pink">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <div className="w-64 h-64 mx-auto mb-8 rounded-full bg-gradient-to-br from-beyond-purple/30 to-beyond-pink/30 flex items-center justify-center">
            <Sparkles className="w-32 h-32 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Preserve Memories, Connect Forever</h2>
          <p className="text-surface-300">
            Create AI-powered digital personas from your loved ones' memories and experience meaningful connections that transcend time.
          </p>
        </div>
      </div>
    </div>
  );
}
