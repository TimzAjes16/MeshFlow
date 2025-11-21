'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ArrowLeft, Save, User, Mail, Key, Trash2, LogOut, Sparkles, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface SettingsPageClientProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    plan: string;
    createdAt: Date;
  };
}

export default function SettingsPageClient({ user }: SettingsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription'>('profile');

  // Read tab from URL query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'subscription') {
      setActiveTab('subscription');
    } else {
      setActiveTab('profile');
    }
  }, [searchParams]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }

      setSuccess('Profile updated successfully');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to delete account');
        return;
      }

      await signOut({ callbackUrl: '/auth/login' });
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top Nav */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">MeshFlow</span>
        </Link>

        {/* Right: Profile Menu */}
        <div className="flex items-center gap-2">
          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    Hi, {session?.user?.name || user.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Manage your account</p>
                </div>
                <button
                  onClick={() => {
                    router.push('/settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => {
                    router.push('/settings?tab=subscription');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span>Manage Subscription</span>
                </button>
                <div className="border-t border-gray-200">
                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await signOut({ callbackUrl: '/auth/login' });
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 rounded-b-lg"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">Manage your account and preferences</p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  router.push('/settings');
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('subscription');
                  router.push('/settings?tab=subscription');
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'subscription'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Subscription
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profile Tab Content */}
            {activeTab === 'profile' && (
              <>
                {/* Profile Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 capitalize">{user.plan.toLowerCase()}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </form>
            </div>

            {/* Password Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Key className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Key className="w-4 h-4" />
                  Change Password
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Danger Zone</h2>
                  <p className="text-sm text-gray-500">Irreversible and destructive actions</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">Once you delete your account, there is no going back.</p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            </div>
              </>
            )}

            {/* Subscription Tab Content */}
            {activeTab === 'subscription' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
                    <p className="text-sm text-gray-500">Manage your subscription and billing</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Current Plan */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {user.plan.toLowerCase()} Plan
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {user.plan.toLowerCase() === 'free' 
                            ? 'Basic features for personal use'
                            : user.plan.toLowerCase() === 'pro'
                            ? 'Advanced features for professionals'
                            : 'Enterprise features for teams'}
                        </p>
                      </div>
                      <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium capitalize">
                        {user.plan.toLowerCase()}
                      </div>
                    </div>
                  </div>

                  {/* Subscription Actions */}
                  {user.plan.toLowerCase() === 'free' ? (
                    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Upgrade to Pro</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Unlock advanced features like unlimited workspaces, priority support, and more.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          // TODO: Implement upgrade flow
                          alert('Upgrade functionality coming soon!');
                        }}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Billing</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Manage your billing information and payment methods.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            // TODO: Implement billing portal
                            alert('Billing portal coming soon!');
                          }}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Manage Billing
                        </button>
                      </div>

                      <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Cancel Subscription</h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Cancel your subscription at any time. You'll continue to have access until the end of your billing period.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Are you sure you want to cancel your subscription?')) {
                              // TODO: Implement cancellation
                              alert('Cancellation functionality coming soon!');
                            }
                          }}
                          className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Cancel Subscription
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

