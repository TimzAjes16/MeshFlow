'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import WorkspaceGraph from './WorkspaceGraph';
import CreateWorkspaceModal from './CreateWorkspaceModal';

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  owner: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DashboardContentProps {
  workspaces: Workspace[];
}

export default function DashboardContent({ workspaces }: DashboardContentProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateWorkspace = async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();
      if (data.workspace) {
        router.push(`/workspace/${data.workspace.id}`);
        router.refresh();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white px-8 py-7 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Workspaces</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your knowledge maps
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Workspace
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Workspace Graph */}
        <WorkspaceGraph workspaces={workspaces} searchQuery={searchQuery} />
      </section>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </>
  );
}

