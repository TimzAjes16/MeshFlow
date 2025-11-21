'use client';

import { useRouter } from 'next/navigation';
import { Network, List, Layers, Settings, ArrowLeft } from 'lucide-react';

type View = 'map' | 'list' | 'clusters';

interface WorkspaceSidebarProps {
  workspaceId: string;
  userRole: 'owner' | 'editor' | 'viewer';
  view: View;
  setView: (view: View) => void;
}

export default function WorkspaceSidebar({ workspaceId, userRole, view, setView }: WorkspaceSidebarProps) {
  const router = useRouter();

  const views = [
    { id: 'map' as View, label: 'Map', icon: Network },
    { id: 'list' as View, label: 'List', icon: List },
    { id: 'clusters' as View, label: 'Clusters', icon: Layers },
  ];

  const itemBase = 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full';

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Back to Dashboard */}
      <div className="p-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Views */}
      <div className="flex-1 px-3 py-4 space-y-1">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
          Views
        </div>
        {views.map((viewItem) => {
          const Icon = viewItem.icon;
          const isActive = view === viewItem.id;
          
          return (
            <button
              key={viewItem.id}
              type="button"
              onClick={() => setView(viewItem.id)}
              className={`${itemBase} ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{viewItem.label}</span>
            </button>
          );
        })}
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}

