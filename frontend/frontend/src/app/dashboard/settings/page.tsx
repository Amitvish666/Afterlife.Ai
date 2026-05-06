'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Save,
  Loader2,
  LogOut,
  Sparkles,
  Users,
  MessageCircle,
  Settings as SettingsIcon,
  ChevronRight,
  FileText,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore, usePersonaStore } from '@/store';
import { cn } from '@/lib/utils';

function SettingsContent() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { personas } = usePersonaStore();
  
  // Use local state for active tab
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    notifications: true,
    darkMode: true,
    language: 'en'
  });

  const handleLogout = () => {
    logout();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/');
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully');
    setIsSaving(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to continue</h1>
          <button onClick={() => router.push('/login')} className="btn-primary">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-900/50 backdrop-blur-xl border-r border-surface-800/50 p-4">
        <div className="flex items-center space-x-2 mb-8 px-2">
          <button onClick={() => router.push('/dashboard')} className="flex items-center space-x-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/favicon.svg" alt="Afterlife AI Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-xl font-bold gradient-text">Afterlife AI</span>
          </button>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <Users className="w-5 h-5" />
            <span>Personas</span>
          </button>
          <button 
            onClick={() => router.push('/dashboard/chats')}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Chats</span>
          </button>
          <button 
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl bg-beyond-purple/20 text-white"
          >
            <SettingsIcon className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-surface-800/50 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
              <span className="text-white font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-surface-400 text-sm truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-surface-400 hover:text-white hover:bg-surface-800/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

          <div className="flex gap-8">
            {/* Tabs */}
            <div className="w-48 flex-shrink-0">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors',
                      activeTab === tab.id
                        ? 'bg-beyond-purple/20 text-white'
                        : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
                    )}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card-hover p-6"
              >
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
                    
                    <div className="flex items-center space-x-6 mb-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-beyond-purple to-beyond-pink flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{user?.name || 'User'}</h3>
                        <p className="text-surface-400">{user?.email}</p>
                        <button className="mt-2 text-beyond-purple text-sm hover:underline">
                          Change avatar
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <Bell className="w-5 h-5 text-beyond-purple" />
                          <div>
                            <p className="text-white font-medium">Push Notifications</p>
                            <p className="text-surface-400 text-sm">Receive notifications on your device</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setFormData({ ...formData, notifications: !formData.notifications })}
                          className={cn(
                            'w-12 h-6 rounded-full transition-colors relative',
                            formData.notifications ? 'bg-beyond-purple' : 'bg-surface-600'
                          )}
                        >
                          <div className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                            formData.notifications ? 'left-7' : 'left-1'
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-beyond-purple" />
                          <div>
                            <p className="text-white font-medium">Email Notifications</p>
                            <p className="text-surface-400 text-sm">Receive updates via email</p>
                          </div>
                        </div>
                        <button className="w-12 h-6 rounded-full bg-beyond-purple transition-colors relative">
                          <div className="absolute top-1 left-7 w-4 h-4 rounded-full bg-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">Appearance</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <Palette className="w-5 h-5 text-beyond-purple" />
                          <div>
                            <p className="text-white font-medium">Dark Mode</p>
                            <p className="text-surface-400 text-sm">Use dark theme</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setFormData({ ...formData, darkMode: !formData.darkMode })}
                          className={cn(
                            'w-12 h-6 rounded-full transition-colors relative',
                            formData.darkMode ? 'bg-beyond-purple' : 'bg-surface-600'
                          )}
                        >
                          <div className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                            formData.darkMode ? 'left-7' : 'left-1'
                          )} />
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-surface-300 mb-2">
                          Language
                        </label>
                        <select
                          value={formData.language}
                          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                          className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-beyond-purple"
                        >
                          <option value="en">English</option>
                          <option value="es">Español</option>
                          <option value="fr">Français</option>
                          <option value="de">Deutsch</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">Privacy & Security</h2>
                    
                    <div className="space-y-4">
                      <div 
                        className="p-4 bg-surface-800/50 rounded-xl cursor-pointer hover:bg-surface-800 transition-colors"
                        onClick={() => {
                          toast.success('Two-Factor Authentication feature coming soon!');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Shield className="w-5 h-5 text-beyond-purple" />
                            <div>
                              <p className="text-white font-medium">Two-Factor Authentication</p>
                              <p className="text-surface-400 text-sm">Add an extra layer of security</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-surface-400" />
                        </div>
                      </div>

                      <div 
                        className="p-4 bg-surface-800/50 rounded-xl cursor-pointer hover:bg-surface-800 transition-colors"
                        onClick={() => {
                          toast.success('Data export request submitted. You will receive an email within 48 hours.');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Globe className="w-5 h-5 text-beyond-purple" />
                            <div>
                              <p className="text-white font-medium">Data & Privacy</p>
                              <p className="text-surface-400 text-sm">Manage your data and privacy settings</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-surface-400" />
                        </div>
                      </div>

                      <div 
                        className="p-4 bg-surface-800/50 rounded-xl cursor-pointer hover:bg-surface-800 transition-colors"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                            toast.success('Account deletion request submitted. You will receive a confirmation email.');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Shield className="w-5 h-5 text-red-500" />
                            <div>
                              <p className="text-white font-medium">Delete Account</p>
                              <p className="text-surface-400 text-sm">Permanently delete your account and all data</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-surface-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'terms' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">Terms of Service</h2>
                    
                    <div className="prose prose-invert max-w-none">
                      <div className="space-y-4 text-surface-300">
                        <p className="text-sm">
                          Welcome to Afterlife AI. By accessing or using our services, you agree to be bound by these Terms of Service.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">1. Acceptance of Terms</h3>
                        <p className="text-sm">
                          By creating an account or using Afterlife AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">2. Use of Service</h3>
                        <p className="text-sm">
                          Afterlife AI provides an AI-powered platform for creating and interacting with digital personas. You agree to use the service only for lawful purposes and in accordance with these Terms.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">3. User Accounts</h3>
                        <p className="text-sm">
                          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">4. Privacy & Data Protection</h3>
                        <p className="text-sm">
                          Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">5. Intellectual Property</h3>
                        <p className="text-sm">
                          All content, features, and functionality of Afterlife AI are owned by us and are protected by international copyright, trademark, and other intellectual property laws.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">6. Limitation of Liability</h3>
                        <p className="text-sm">
                          Afterlife AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">7. Changes to Terms</h3>
                        <p className="text-sm">
                          We reserve the right to modify or replace these Terms at any time. Your continued use of the service after any changes constitutes acceptance of the new Terms.
                        </p>
                        
                        <h3 className="text-lg font-semibold text-white mt-6">8. Contact Information</h3>
                        <p className="text-sm">
                          If you have any questions about these Terms, please contact us at support@afterlife.ai.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'contact' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">Contact Us</h2>
                    
                    <div className="space-y-6">
                      {/* Contact Info */}
                      <div className="p-6 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 rounded-xl border border-beyond-purple/30">
                        <h3 className="text-lg font-semibold text-white mb-4">Get in Touch</h3>
                        <p className="text-surface-300 text-sm mb-6">
                          Have questions or need support? We're here to help. Choose your preferred way to reach us.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <a 
                            href="mailto:support@afterlife.ai" 
                            className="flex items-center space-x-3 p-4 bg-surface-800/50 rounded-xl hover:bg-surface-800 transition-colors"
                          >
                            <Mail className="w-5 h-5 text-beyond-purple" />
                            <div>
                              <p className="text-white font-medium">Email Support</p>
                              <p className="text-surface-400 text-sm">support@afterlife.ai</p>
                            </div>
                          </a>
                          
                          <a 
                            href="mailto:contact@afterlife.ai" 
                            className="flex items-center space-x-3 p-4 bg-surface-800/50 rounded-xl hover:bg-surface-800 transition-colors"
                          >
                            <MessageCircle className="w-5 h-5 text-beyond-purple" />
                            <div>
                              <p className="text-white font-medium">General Inquiries</p>
                              <p className="text-surface-400 text-sm">contact@afterlife.ai</p>
                            </div>
                          </a>
                        </div>
                      </div>

                      {/* Contact Form */}
                      <div className="p-6 bg-surface-800/50 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-4">Send us a Message</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Subject</label>
                            <select className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-beyond-purple">
                              <option value="">Select a subject</option>
                              <option value="support">Technical Support</option>
                              <option value="billing">Billing Question</option>
                              <option value="feature">Feature Request</option>
                              <option value="feedback">Feedback</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Message</label>
                            <textarea 
                              rows={5}
                              placeholder="Describe your question or issue..."
                              className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-xl text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-beyond-purple resize-none"
                            />
                          </div>
                          
                          <button 
                            onClick={() => toast.success('Message sent! We will get back to you soon.')}
                            className="btn-primary w-full"
                          >
                            Send Message
                          </button>
                        </div>
                      </div>

                      {/* Social Links */}
                      <div className="p-6 bg-surface-800/50 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-4">Follow Us</h3>
                        <div className="flex flex-wrap gap-4">
                          <a 
                            href="https://twitter.com" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-4 py-2 bg-surface-700/50 hover:bg-surface-700 rounded-lg text-white text-sm transition-colors"
                          >
                            <span>Twitter</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <a 
                            href="https://facebook.com" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-4 py-2 bg-surface-700/50 hover:bg-surface-700 rounded-lg text-white text-sm transition-colors"
                          >
                            <span>Facebook</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <a 
                            href="https://instagram.com" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-4 py-2 bg-surface-700/50 hover:bg-surface-700 rounded-lg text-white text-sm transition-colors"
                          >
                            <span>Instagram</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <a 
                            href="https://linkedin.com" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-4 py-2 bg-surface-700/50 hover:bg-surface-700 rounded-lg text-white text-sm transition-colors"
                          >
                            <span>LinkedIn</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>

                      {/* Company Info */}
                      <div className="p-6 bg-surface-800/50 rounded-xl">
                        <h3 className="text-lg font-semibold text-white mb-4">Company Information</h3>
                        <div className="space-y-2 text-surface-400 text-sm">
                          <p><span className="text-white">Company:</span> Afterlife AI</p>
                          <p><span className="text-white">Headquarters:</span> San Francisco, CA, USA</p>
                          <p><span className="text-white">Founded:</span> 2024</p>
                          <p><span className="text-white">Website:</span> www.afterlife.ai</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'help' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-white">Help & Support</h2>
                    
                    <div className="space-y-6">
                      {/* FAQ Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Frequently Asked Questions</h3>
                        
                        <div className="space-y-3">
                          <div className="p-4 bg-surface-800/50 rounded-xl">
                            <p className="text-white font-medium mb-2">How do I create a new persona?</p>
                            <p className="text-surface-400 text-sm">
                              Navigate to the Personas dashboard and click the "+" button. Fill in the required information to create your first persona.
                            </p>
                          </div>
                          
                          <div className="p-4 bg-surface-800/50 rounded-xl">
                            <p className="text-white font-medium mb-2">Can I delete my account?</p>
                            <p className="text-surface-400 text-sm">
                              Yes, you can request account deletion through the Privacy settings. Please note this action is irreversible.
                            </p>
                          </div>
                          
                          <div className="p-4 bg-surface-800/50 rounded-xl">
                            <p className="text-white font-medium mb-2">How do I export my data?</p>
                            <p className="text-surface-400 text-sm">
                              Go to Privacy settings and select "Data & Privacy" to request a data export. You'll receive your data within 48 hours.
                            </p>
                          </div>
                          
                          <div className="p-4 bg-surface-800/50 rounded-xl">
                            <p className="text-white font-medium mb-2">Is my data secure?</p>
                            <p className="text-surface-400 text-sm">
                              Yes, we use industry-standard encryption and security measures to protect your data. All data is encrypted both in transit and at rest.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact Support */}
                      <div className="p-6 bg-gradient-to-br from-beyond-purple/20 to-beyond-pink/20 rounded-xl border border-beyond-purple/30">
                        <h3 className="text-lg font-semibold text-white mb-2">Need More Help?</h3>
                        <p className="text-surface-300 text-sm mb-4">
                          Our support team is available 24/7 to assist you with any questions or issues.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <a 
                            href="mailto:support@afterlife.ai" 
                            className="flex items-center space-x-2 px-4 py-2 bg-beyond-purple/30 hover:bg-beyond-purple/40 rounded-lg text-white text-sm transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email Support</span>
                          </a>
                          <button 
                            className="flex items-center space-x-2 px-4 py-2 bg-surface-700/50 hover:bg-surface-700 rounded-lg text-white text-sm transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Live Chat</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Additional Resources */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a 
                          href="https://docs.afterlife.ai" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 bg-surface-800/50 rounded-xl hover:bg-surface-800 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-beyond-purple" />
                              <span className="text-white font-medium">Documentation</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-surface-400 group-hover:text-white transition-colors" />
                          </div>
                        </a>
                        
                        <a 
                          href="https://youtube.com" 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 bg-surface-800/50 rounded-xl hover:bg-surface-800 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <HelpCircle className="w-5 h-5 text-beyond-purple" />
                              <span className="text-white font-medium">Video Tutorials</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-surface-400 group-hover:text-white transition-colors" />
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-surface-800">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary flex items-center space-x-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SettingsContent;
