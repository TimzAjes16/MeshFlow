'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Search, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function DashboardTopNav() {
  const router = useRouter();
  const { data: session } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-bold text-gray-900">MeshFlow</span>
      </Link>

      {/* Right: Profile Menu */}
      <div className="flex items-center gap-2">
        {/* Settings Button */}
        <Link
          href="/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </Link>

        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <User className="w-5 h-5 text-gray-600" />
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                onClick={async () => {
                  setShowProfileMenu(false);
                  await signOut({ callbackUrl: '/auth/login' });
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-200"
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

