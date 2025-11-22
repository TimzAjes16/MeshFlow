'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Search, Settings, User } from 'lucide-react';
import Link from 'next/link';
import MeshFlowLogo from '@/components/MeshFlowLogo';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardTopNav() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4" style={{ 
      minHeight: '56px',
      paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
      height: 'calc(56px + max(env(safe-area-inset-top, 0px), 8px))'
    }}>
      {/* Left: Logo */}
      <MeshFlowLogo variant="dark" size="sm" href="/dashboard" />

      {/* Right: Profile Menu */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* Settings Button */}
        <Link
          href="/settings"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-black dark:text-white" />
        </Link>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <User className="w-5 h-5 text-black dark:text-white" />
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-black dark:text-white">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-black dark:text-gray-400">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Settings
              </button>
              <button
                onClick={async () => {
                  setShowProfileMenu(false);
                  await signOut({ callbackUrl: '/auth/login' });
                }}
                className="w-full px-4 py-2 text-left text-sm text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg border-t border-gray-200 dark:border-gray-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

