'use client';

import { Search, Layout, Plus, Settings } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { useState, useCallback, useRef } from 'react';
import { searchNodes } from '@/lib/search';

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

  const handleSearch = (query: string) => {
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

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      const results = searchNodes(query, nodes);
      setSearchResults(results);
      setShowResults(results.length > 0);
    }, 300);
  };

  const handleSelectResult = useCallback((nodeId: string) => {
    selectNode(nodeId);
    setShowResults(false);
    setSearchQuery('');
    
    // Zoom to node will be handled by Canvas component
    // when selectedNodeId changes
  }, [selectNode]);

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left: Workspace name and search */}
      <div className="flex items-center gap-4 flex-1">
        <h1 className="text-lg font-semibold text-gray-900">
          {currentWorkspace?.name || 'Workspace'}
        </h1>
        
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Layout selector */}
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value as any)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="force-directed">Force Directed</option>
          <option value="radial">Radial</option>
          <option value="hierarchical">Hierarchical</option>
          <option value="semantic">Semantic</option>
        </select>

        <button
          onClick={onCreateNode}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Node
        </button>

        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
