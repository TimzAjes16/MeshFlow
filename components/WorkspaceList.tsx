'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Folder, FileText, Link as LinkIcon, Plus, CheckCircle2, Trash2, CheckSquare, Square } from 'lucide-react';

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
  onWorkspaceDeleted?: () => void; // Callback to refresh workspace list
}

export default function WorkspaceList({ 
  workspaces, 
  searchQuery = '',
  viewMode = 'list',
  onCreateNew,
  onWorkspaceDeleted
}: WorkspaceListProps) {
  const router = useRouter();
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter workspaces based on search
  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Select/Deselect all
  const allSelected = filteredWorkspaces.length > 0 && filteredWorkspaces.every(ws => selectedWorkspaces.has(ws.id));
  const someSelected = filteredWorkspaces.some(ws => selectedWorkspaces.has(ws.id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      // Deselect all filtered workspaces
      setSelectedWorkspaces(prev => {
        const newSet = new Set(prev);
        filteredWorkspaces.forEach(ws => newSet.delete(ws.id));
        return newSet;
      });
    } else {
      // Select all filtered workspaces
      setSelectedWorkspaces(prev => {
        const newSet = new Set(prev);
        filteredWorkspaces.forEach(ws => newSet.add(ws.id));
        return newSet;
      });
    }
  }, [allSelected, filteredWorkspaces]);

  const handleToggleWorkspace = useCallback((workspaceId: string) => {
    setSelectedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  }, []);

  // Delete selected workspaces
  const handleDeleteSelected = useCallback(async () => {
    if (selectedWorkspaces.size === 0) return;
    
    const count = selectedWorkspaces.size;
    const confirmMessage = count === 1
      ? `Are you sure you want to delete this workspace? This action cannot be undone.`
      : `Are you sure you want to delete ${count} workspaces? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedWorkspaces).map(async (workspaceId) => {
        const response = await fetch(`/api/workspaces/${workspaceId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete workspace');
        }
        return workspaceId;
      });

      await Promise.all(deletePromises);
      
      // Clear selection
      setSelectedWorkspaces(new Set());
      
      // Refresh workspace list
      if (onWorkspaceDeleted) {
        onWorkspaceDeleted();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error deleting workspaces:', error);
      alert(error.message || 'Failed to delete workspaces. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedWorkspaces, onWorkspaceDeleted, router]);

  // Delete all workspaces
  const handleDeleteAll = useCallback(async () => {
    if (filteredWorkspaces.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ALL ${filteredWorkspaces.length} workspaces? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const deletePromises = filteredWorkspaces.map(async (workspace) => {
        const response = await fetch(`/api/workspaces/${workspace.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete workspace');
        }
        return workspace.id;
      });

      await Promise.all(deletePromises);
      
      // Clear selection
      setSelectedWorkspaces(new Set());
      
      // Refresh workspace list
      if (onWorkspaceDeleted) {
        onWorkspaceDeleted();
      } else {
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error deleting all workspaces:', error);
      alert(error.message || 'Failed to delete workspaces. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [filteredWorkspaces, onWorkspaceDeleted, router]);

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
        {/* Selection Controls */}
        {(selectedWorkspaces.size > 0 || filteredWorkspaces.length > 0) && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : someSelected ? (
                  <Square className="w-4 h-4 text-blue-600 border-2 border-blue-600 rounded" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{selectedWorkspaces.size} selected</span>
              </button>
              {selectedWorkspaces.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              )}
            </div>
            {filteredWorkspaces.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete All
              </button>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkspaces.map((workspace) => {
            const isSelected = selectedWorkspaces.has(workspace.id);
            return (
              <div
                key={workspace.id}
                className={`relative p-4 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleWorkspace(workspace.id);
                  }}
                  className="absolute top-3 left-3 z-10 p-1 hover:bg-white/80 rounded transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                
                <button
                  onClick={() => router.push(`/workspace/${workspace.id}/canvas`)}
                  className="w-full text-left"
                >
                  <div className={`w-10 h-10 rounded-lg ${getWorkspaceIcon(workspace.name)} flex items-center justify-center mb-3`}>
                    <Folder className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-2 truncate pr-8">{workspace.name}</h3>
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
              </div>
            );
          })}
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
      {/* Selection Controls */}
      {(selectedWorkspaces.size > 0 || filteredWorkspaces.length > 0) && (
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title={allSelected ? 'Deselect all' : 'Select all'}
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : someSelected ? (
                <Square className="w-4 h-4 text-blue-600 border-2 border-blue-600 rounded" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span className="text-xs">{selectedWorkspaces.size} selected</span>
            </button>
            {selectedWorkspaces.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            )}
          </div>
          {filteredWorkspaces.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete All
            </button>
          )}
        </div>
      )}
      
      <div className="divide-y divide-slate-100">
        {filteredWorkspaces.map((workspace) => {
          const isSelected = selectedWorkspaces.has(workspace.id);
          return (
            <div
              key={workspace.id}
              className={`w-full px-6 py-3 transition-colors group flex items-center gap-3 ${
                isSelected
                  ? 'bg-blue-50 hover:bg-blue-100'
                  : 'hover:bg-slate-50'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleWorkspace(workspace.id);
                }}
                className="flex-shrink-0 p-0.5 hover:bg-white/80 rounded transition-colors"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Workspace Icon - Minimal */}
              <div className={`w-5 h-5 rounded ${getWorkspaceIcon(workspace.name)} flex items-center justify-center flex-shrink-0`}>
                <Folder className="w-3 h-3 text-white" />
              </div>

              {/* Workspace Name - Clickable */}
              <button
                onClick={() => router.push(`/workspace/${workspace.id}/canvas`)}
                className="flex-1 text-left"
              >
                <span className="text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {workspace.name}
                </span>
              </button>

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
            </div>
          );
        })}
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
