'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Search, Settings, User, ArrowLeft } from 'lucide-react';
import { useCanvasStore } from '@/state/canvasStore';

interface WorkspaceTopNavProps {
  workspaceId: string;
  workspaceName: string;
}

export default function WorkspaceTopNav({ workspaceId, workspaceName }: WorkspaceTopNavProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }, []);
  const router = useRouter();
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

  return (
    <div className="w-full h-full flex items-center justify-between px-4">
      {/* Left: Workspace name and search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => router.push('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors -ml-2"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">
          {workspaceName}
        </h1>
        
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
        {/* Settings Button */}
        <button 
          type="button"
          onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors pointer-events-auto"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>

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
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]">
              <button
                type="button"
                onClick={() => {
                  router.push('/dashboard');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push('/settings');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                type="button"
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

