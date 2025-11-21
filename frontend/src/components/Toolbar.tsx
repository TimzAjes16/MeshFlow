import { Layout, Search, Filter, Menu, Plus, Grid, Network, GitBranch, List, X } from 'lucide-react';
import { useMeshStore } from '../store/useMeshStore';
import { useState } from 'react';
import FilterPanel from './FilterPanel';

interface ToolbarProps {
  onToggleSidebar: () => void;
}

const Toolbar = ({ onToggleSidebar }: ToolbarProps) => {
  const { layoutMode, setLayoutMode, searchQuery, setSearchQuery, addNode, explodedNodeId, setExplodedNode } = useMeshStore();
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const layoutModes = [
    { id: 'force-directed' as const, label: 'Force', icon: Network },
    { id: 'radial' as const, label: 'Radial', icon: GitBranch },
    { id: 'hierarchical' as const, label: 'Hierarchy', icon: Layout },
    { id: 'linear' as const, label: 'Linear', icon: List },
    { id: 'mind-map' as const, label: 'Mind Map', icon: Grid },
  ];

  const handleAddNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      title: 'New Note',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#6366f1',
      importance: 0.5,
    };
    addNode(newNode);
    useMeshStore.getState().setSelectedNode(newNode.id);
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="h-6 w-px bg-gray-300 mx-2" />
        
        <h1 className="text-lg font-semibold text-gray-900">MeshFlow</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          {showSearch ? (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => !searchQuery && setShowSearch(false)}
              placeholder="Search nodes..."
              className="px-4 py-1.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Search"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Layout Mode Selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {layoutModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setLayoutMode(mode.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  layoutMode === mode.id
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={mode.label}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        {/* Explode Mode Indicator */}
        {explodedNodeId && (
          <>
            <div className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-2">
              <Grid className="w-4 h-4" />
              <span>Exploded View</span>
              <button
                onClick={() => setExplodedNode(null)}
                className="p-0.5 hover:bg-purple-200 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="h-6 w-px bg-gray-300 mx-2" />
          </>
        )}

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Filter"
          >
            <Filter className="w-5 h-5 text-gray-600" />
          </button>
          {showFilter && <FilterPanel onClose={() => setShowFilter(false)} />}
        </div>

        {/* Add Node */}
        <button
          onClick={handleAddNode}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Note</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;

