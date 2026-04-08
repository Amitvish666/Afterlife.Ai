'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Sparkles, ArrowRight, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store';
import { type User } from '@/types';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordStrength = () => {
    const password = formData.password;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await apiClient.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      const data = response.data.data as { user: User; tokens: { access_token: string; refresh_token: string } };
      const { user, tokens } = data;
      
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      
      // Convert to full user with default values for missing fields
      const fullUser: User = {
        ...user,
        avatar: user.avatar || undefined,
        consent_given: false,
        retention_period: 365,
      };
      setUser(fullUser);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const strength = passwordStrength();
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center space-x-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Beyond Life AI</span>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-surface-400 mb-8">Start preserving memories of your loved ones</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-surface-300 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= strength ? strengthColors[strength - 1] : 'bg-surface-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs ${formData.password.length >= 8 ? 'text-green-400' : 'text-surface-500'}`}>
                      ✓ 8+ characters
                    </span>
                    <span className={`text-xs ${/[A-Z]/.test(formData.password) ? 'text-green-400' : 'text-surface-500'}`}>
                      ✓ Uppercase
                    </span>
                    <span className={`text-xs ${/[0-9]/.test(formData.password) ? 'text-green-400' : 'text-surface-500'}`}>
                      ✓ Number
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple focus:border-transparent"
                placeholder="••••••••"
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-start">
              <input 
                type="checkbox" 
                id="terms"
                className="w-4 h-4 mt-1 rounded bg-surface-800 border-surface-700 text-beyond-purple focus:ring-beyond-purple" 
              />
              <label htmlFor="terms" className="ml-2 text-sm text-surface-400">
                I agree to the{' '}
                <Link href="/terms" className="text-beyond-purple hover:text-beyond-pink">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-beyond-purple hover:text-beyond-pink">
                  Privacy Policy
                </Link>
              </label>
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
                  Create Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-surface-400">
            Already have an account?{' '}
            <Link href="/login" className="text-beyond-purple hover:text-beyond-pink">
              Sign in
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
            Join thousands of families who have created meaningful digital personas to keep their loved ones close, forever.
          </p>
          
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">50K+</div>
              <div className="text-surface-400 text-sm">Personas Created</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">2M+</div>
              <div className="text-surface-400 text-sm">Conversations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">99.9%</div>
              <div className="text-surface-400 text-sm">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
