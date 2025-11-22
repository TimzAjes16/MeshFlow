'use client';

import { Search, Layout, Plus, Settings, Link2 } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { useState, useCallback, useRef } from 'react';

interface TopBarProps {
  workspaceId: string;
  onCreateNode: () => void;
}

export default function TopBar({ workspaceId, onCreateNode }: TopBarProps) {
  const { currentWorkspace, layout, setLayout, nodes } = useWorkspaceStore();
  const { selectNode } = useCanvasStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
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
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left: Workspace name and search */}
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-lg font-semibold text-black">
          {currentWorkspace?.name || 'Workspace'}
        </h1>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black" />
          <input
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
                  <div className="font-medium text-sm text-black">
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

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Layout selector */}
        <select
          value={layout}
          onChange={(e) => {
            const newLayout = e.target.value;
            setLayout(newLayout as any);
            // Trigger layout change - this should trigger re-layout in CanvasContainer
            const event = new CustomEvent('layout-change', { detail: { layout: newLayout } });
            window.dispatchEvent(event);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-50 transition-colors"
        >
          <option value="force-directed">Force Directed</option>
          <option value="radial">Radial</option>
          <option value="hierarchical">Hierarchical</option>
          <option value="semantic">Semantic</option>
        </select>

        {/* Auto-Link Toggle */}
        <button
          onClick={() => {
            const event = new CustomEvent('toggle-auto-link');
            window.dispatchEvent(event);
          }}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Auto-Link</span>
        </button>

        {/* New Node Button */}
        <button
          onClick={onCreateNode}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Node
        </button>

        {/* Settings Button */}
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-black" />
        </button>
      </div>
    </div>
  );
}
