'use client';

import { useRouter } from 'next/navigation';
import { Clock, Folder, Users, FileText, Link as LinkIcon } from 'lucide-react';

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
}

export default function WorkspaceList({ workspaces, searchQuery = '' }: WorkspaceListProps) {
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

  if (filteredWorkspaces.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500">
        <Folder className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <p className="text-sm font-medium">
          {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
        </p>
        {!searchQuery && (
          <p className="text-xs mt-1 text-slate-400">
            Click "New Workspace" to get started
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredWorkspaces.map((workspace) => (
        <button
          key={workspace.id}
          onClick={() => router.push(`/workspace/${workspace.id}/canvas`)}
          className="w-full text-left p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Workspace Icon */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <Folder className="w-5 h-5 text-white" />
              </div>

              {/* Workspace Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {workspace.name}
                </h3>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{workspace.nodeCount} nodes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{workspace.edgeCount} connections</span>
                  </div>
                  {workspace.owner && (
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{workspace.owner.name || workspace.owner.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Updated time */}
            <div className="flex items-center gap-2 text-xs text-slate-400 ml-4 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(workspace.updatedAt)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
