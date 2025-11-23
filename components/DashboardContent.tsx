'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Search, Filter, ArrowUpDown, LayoutGrid, List, 
  ChevronDown, Settings, Zap, X
} from 'lucide-react';
import WorkspaceList from './WorkspaceList';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import DashboardNodesList from './DashboardNodesList';

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

type SortField = 'name' | 'updatedAt' | 'createdAt' | 'nodeCount';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

export default function DashboardContent({ workspaces }: DashboardContentProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showSearch, setShowSearch] = useState(false);

  // Listen for workspace updates and refresh
  useEffect(() => {
    const handleWorkspaceUpdate = () => {
      router.refresh();
    };

    window.addEventListener('workspace-updated', handleWorkspaceUpdate);
    return () => {
      window.removeEventListener('workspace-updated', handleWorkspaceUpdate);
    };
  }, [router]);

  const handleCreateWorkspace = async (name: string, description?: string) => {
    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const data = await response.json();
      if (response.ok && data.workspace) {
        // Navigate to the new workspace canvas
        router.push(`/workspace/${data.workspace.id}/canvas`);
        // Refresh to update workspace list
        router.refresh();
      } else {
        console.error('Error creating workspace:', data.error || 'Unknown error');
        alert(data.error || 'Failed to create workspace');
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace. Please try again.');
    }
  };

  // Sort workspaces
  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'nodeCount':
        comparison = a.nodeCount - b.nodeCount;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Header with Title and Actions */}
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Your Workspaces</h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Manage your knowledge maps
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors border-l border-slate-200 ${
                      viewMode === 'grid'
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Action Icons */}
                <div className="flex items-center gap-1 border border-slate-200 rounded-md">
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-2 text-slate-500 hover:bg-slate-50 transition-colors"
                    title="Search"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleSort('updatedAt')}
                    className={`p-2 transition-colors border-l border-slate-200 ${
                      sortField === 'updatedAt' ? 'text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                    title="Sort"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-slate-500 hover:bg-slate-50 transition-colors border-l border-slate-200"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {/* New Workspace Button */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>New</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search Bar - appears when search icon clicked */}
            {showSearch && (
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Type a name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearch(false);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Workspace List */}
          <WorkspaceList 
            workspaces={sortedWorkspaces} 
            searchQuery={searchQuery}
            viewMode={viewMode}
            onCreateNew={() => setIsModalOpen(true)}
            onWorkspaceDeleted={() => router.refresh()}
          />
        </section>

        {/* Nodes List Section - only show if there are nodes */}
        {workspaces.some(w => w.nodeCount > 0) && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden" style={{ height: '400px' }}>
            <DashboardNodesList workspaces={workspaces} />
          </section>
        )}
      </div>

      <CreateWorkspaceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </>
  );
}

