'use client';

import { useRouter } from 'next/navigation';
import { Clock, Folder, FileText, Link as LinkIcon, Plus, CheckCircle2 } from 'lucide-react';

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

interface WorkspaceListProps {
  workspaces: Workspace[];
  searchQuery?: string;
  viewMode?: 'list' | 'grid';
  onCreateNew?: () => void;
}

export default function WorkspaceList({ 
  workspaces, 
  searchQuery = '',
  viewMode = 'list',
  onCreateNew
}: WorkspaceListProps) {
  const router = useRouter();

  // Filter workspaces based on search
  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getWorkspaceIcon = (name: string) => {
    // Simple hash-based color assignment for consistency
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
    ];
    return colors[hash % colors.length];
  };

  if (filteredWorkspaces.length === 0 && !searchQuery) {
    return (
      <div className="p-12">
        {workspaces.length === 0 ? (
          <div className="text-center text-slate-500">
            <Folder className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-sm font-medium">
              No workspaces yet
            </p>
            {onCreateNew && (
              <button
                onClick={onCreateNew}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first workspace
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500">
            <p className="text-sm font-medium">No workspaces found</p>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => router.push(`/workspace/${workspace.id}/canvas`)}
              className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
            >
              <div className={`w-10 h-10 rounded-lg ${getWorkspaceIcon(workspace.name)} flex items-center justify-center mb-3`}>
                <Folder className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-medium text-slate-900 mb-2 truncate">{workspace.name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {workspace.nodeCount}
                </span>
                <span className="flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" />
                  {workspace.edgeCount}
                </span>
              </div>
            </button>
          ))}
        </div>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5 px-2 py-1.5"
          >
            <Plus className="w-4 h-4" />
            New workspace
          </button>
        )}
      </div>
    );
  }

  // List view - Notion-inspired minimal design
  return (
    <div>
      <div className="divide-y divide-slate-100">
        {filteredWorkspaces.map((workspace) => (
          <button
            key={workspace.id}
            onClick={() => router.push(`/workspace/${workspace.id}/canvas`)}
            className="w-full text-left px-6 py-3 hover:bg-slate-50 transition-colors group flex items-center gap-3"
          >
            {/* Workspace Icon - Minimal */}
            <div className={`w-5 h-5 rounded ${getWorkspaceIcon(workspace.name)} flex items-center justify-center flex-shrink-0`}>
              <Folder className="w-3 h-3 text-white" />
            </div>

            {/* Workspace Name */}
            <span className="flex-1 text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
              {workspace.name}
            </span>

            {/* Metadata Icons - Minimal */}
            <div className="flex items-center gap-4 text-xs text-slate-400 flex-shrink-0">
              {workspace.nodeCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {workspace.nodeCount}
                </span>
              )}
              {workspace.edgeCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" />
                  {workspace.edgeCount}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(workspace.updatedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* New Workspace Link at Bottom - Notion style */}
      {onCreateNew && (
        <button
          onClick={onCreateNew}
          className="w-full text-left px-6 py-3 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 border-t border-slate-100"
        >
          <Plus className="w-4 h-4" />
          New workspace
        </button>
      )}

      {filteredWorkspaces.length === 0 && searchQuery && (
        <div className="p-12 text-center text-slate-500">
          <p className="text-sm">No workspaces found matching &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
}
