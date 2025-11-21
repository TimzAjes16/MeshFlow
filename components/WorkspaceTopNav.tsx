'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { Search, User, Edit2, Check, X, CreditCard, LogOut, Tag } from 'lucide-react';
import { useCanvasStore } from '@/state/canvasStore';
import MeshFlowLogo from '@/components/MeshFlowLogo';
import Link from 'next/link';

interface WorkspaceTopNavProps {
  workspaceId: string;
  workspaceName: string;
}

export default function WorkspaceTopNav({ workspaceId, workspaceName }: WorkspaceTopNavProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const showTags = useCanvasStore((state) => state.showTags);
  const toggleTags = useCanvasStore((state) => state.toggleTags);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workspaceName);
  const [isSaving, setIsSaving] = useState(false);

  // Update edited name when workspaceName prop changes
  useEffect(() => {
    setEditedName(workspaceName);
  }, [workspaceName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to cancel editing
        if (e.key === 'Escape' && isEditingName) {
          setIsEditingName(false);
          setEditedName(workspaceName);
        }
        // Allow Enter to save when editing name
        if (e.key === 'Enter' && isEditingName && !e.shiftKey) {
          e.preventDefault();
          handleSaveName();
        }
        return;
      }

      // Ctrl/Cmd + F: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingName, workspaceName]);
  const { selectNode } = useCanvasStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Debounce search and use API
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/nodes/search?q=${encodeURIComponent(query)}&workspaceId=${workspaceId}`
        );
        
        if (!response.ok) {
          console.error('Search failed:', response.statusText);
          setSearchResults([]);
          setShowResults(false);
          return;
        }

        const data = await response.json();
        const results = data.results || [];
        
        // Format results for display
        const formattedResults = results.map((node: any) => ({
          node: {
            id: node.id,
            title: node.title,
            tags: node.tags || [],
          },
        }));
        
        setSearchResults(formattedResults);
        setShowResults(formattedResults.length > 0);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);
  };

  const handleSelectResult = useCallback((nodeId: string) => {
    selectNode(nodeId);
    setShowResults(false);
    setSearchQuery('');
    
    // Trigger zoom to node event
    const event = new CustomEvent('zoom-to-node', { detail: { nodeId } });
    window.dispatchEvent(event);
  }, [selectNode]);

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim() === workspaceName) {
      setIsEditingName(false);
      setEditedName(workspaceName);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update workspace name');
      }

      // Refresh the page to update workspace data
      router.refresh();
      
      // Trigger a custom event to notify dashboard to refresh
      window.dispatchEvent(new CustomEvent('workspace-updated', { 
        detail: { workspaceId, name: editedName.trim() } 
      }));

      setIsEditingName(false);
    } catch (error: any) {
      console.error('Error updating workspace name:', error);
      alert(error.message || 'Failed to update workspace name');
      setEditedName(workspaceName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(workspaceName);
  };

  return (
    <div className="w-full h-full flex items-center justify-between px-4">
      {/* Left: Logo, workspace name and search */}
      <div className="flex items-center gap-4 flex-1">
        <Link href="/dashboard" className="hidden sm:block">
          <MeshFlowLogo variant="dark" size="sm" />
        </Link>
        
        {/* Editable workspace name */}
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={(e) => {
                // Don't blur if clicking on save/cancel buttons
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (relatedTarget?.closest('.name-edit-buttons')) {
                  return;
                }
                handleSaveName();
              }}
              disabled={isSaving}
              className="text-lg font-semibold text-gray-900 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
            />
            <div className="name-edit-buttons flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleSaveName();
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                disabled={isSaving}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-green-600 disabled:opacity-50"
                title="Save (Enter)"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleCancelEdit();
                }}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                disabled={isSaving}
                className="p-1 hover:bg-gray-100 rounded transition-colors text-red-600 disabled:opacity-50"
                title="Cancel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            title="Click to rename workspace"
          >
            <h1 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {workspaceName}
            </h1>
            <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            placeholder="Search nodes..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.node.id}
                  onClick={() => handleSelectResult(result.node.id)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">
                    {result.node.title}
                  </div>
                  {result.node.tags && result.node.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {result.node.tags.slice(0, 2).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions and profile */}
      <div className="flex items-center gap-2">
        {/* Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors pointer-events-auto"
          >
            <User className="w-5 h-5 text-gray-600" />
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  Hi, {session?.user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Manage your account</p>
              </div>
              <button
                type="button"
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
                type="button"
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
                  type="button"
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
  );
}

