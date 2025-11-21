'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, FileText, Tag, Calendar, ArrowUpDown } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { useRouter } from 'next/navigation';

interface ListViewProps {
  workspaceId: string;
}

type SortField = 'title' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

export default function ListView({ workspaceId }: ListViewProps) {
  const router = useRouter();
  const { nodes, edges } = useWorkspaceStore();
  const { selectNode } = useCanvasStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    nodes.forEach(node => {
      (node.tags || []).forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [nodes]);

  // Filter and sort nodes
  const filteredAndSortedNodes = useMemo(() => {
    let filtered = nodes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.title.toLowerCase().includes(query) ||
        JSON.stringify(node.content).toLowerCase().includes(query) ||
        (node.tags || []).some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by tag
    if (selectedTag) {
      filtered = filtered.filter(node =>
        (node.tags || []).includes(selectedTag)
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return sorted;
  }, [nodes, searchQuery, selectedTag, sortField, sortOrder]);

  // Get connection count for a node
  const getConnectionCount = (nodeId: string) => {
    return edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId
    ).length;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId);
    router.push(`/workspace/${workspaceId}/canvas`);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nodes</h2>
            <p className="text-sm text-gray-500 mt-1">
              {filteredAndSortedNodes.length} of {nodes.length} nodes
            </p>
          </div>
          <button
            onClick={() => router.push(`/workspace/${workspaceId}/canvas`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Node
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {allTags.length > 0 && (
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table Header */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
          <div className="col-span-5 flex items-center gap-2 cursor-pointer hover:text-gray-900" onClick={() => handleSort('title')}>
            Title
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="col-span-2">Tags</div>
          <div className="col-span-1 text-center cursor-pointer hover:text-gray-900" onClick={() => handleSort('updatedAt')}>
            Connections
          </div>
          <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-gray-900" onClick={() => handleSort('createdAt')}>
            Created
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-gray-900" onClick={() => handleSort('updatedAt')}>
            Updated
            <ArrowUpDown className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Nodes List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">
              {nodes.length === 0 ? 'No nodes yet' : 'No nodes found'}
            </p>
            <p className="text-sm">
              {nodes.length === 0
                ? 'Create your first node to get started'
                : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5">
                    <h3 className="font-medium text-gray-900 mb-1">{node.title || 'Untitled'}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {typeof node.content === 'string'
                        ? node.content
                        : JSON.stringify(node.content).replace(/[{}"]/g, '').substring(0, 100)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <div className="flex flex-wrap gap-1">
                      {(node.tags || []).slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {(node.tags || []).length > 2 && (
                        <span className="px-2 py-0.5 text-xs text-gray-500">
                          +{(node.tags || []).length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 text-center text-sm text-gray-600">
                    {getConnectionCount(node.id)}
                  </div>
                  <div className="col-span-2 text-sm text-gray-500">
                    {new Date(node.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-2 text-sm text-gray-500">
                    {new Date(node.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

