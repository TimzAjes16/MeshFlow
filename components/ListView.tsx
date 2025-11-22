'use client';

import { useState, useMemo } from 'react';
import { Search, Plus, FileText, Tag, Calendar, ArrowUpDown, Trash2, AlertTriangle } from 'lucide-react';
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
  const { deleteNode } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

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

  const handleDeleteNode = async (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (confirm(`Are you sure you want to delete "${node.title || 'this node'}"?`)) {
      try {
        const response = await fetch(`/api/nodes/${nodeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          deleteNode(nodeId);
        } else {
          alert('Failed to delete node');
        }
      } catch (error) {
        console.error('Error deleting node:', error);
        alert('Failed to delete node');
      }
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${filteredAndSortedNodes.length} nodes? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete all filtered nodes
      const deletePromises = filteredAndSortedNodes.map(node =>
        fetch(`/api/nodes/${node.id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const allSucceeded = results.every(r => r.ok);

      if (allSucceeded) {
        // Remove all from store
        filteredAndSortedNodes.forEach(node => deleteNode(node.id));
        setShowDeleteAllConfirm(false);
      } else {
        alert('Some nodes failed to delete. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting all nodes:', error);
      alert('Failed to delete nodes');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-black dark:text-white">Nodes</h2>
            <p className="text-sm text-black dark:text-gray-400 mt-1">
              {filteredAndSortedNodes.length} of {nodes.length} nodes
            </p>
          </div>
          <div className="flex items-center gap-2">
            {filteredAndSortedNodes.length > 0 && (
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            )}
            <button
              onClick={() => router.push(`/workspace/${workspaceId}/canvas`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Node
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black dark:text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search nodes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          
          {allTags.length > 0 && (
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-black dark:text-white"
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
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-black dark:text-white uppercase tracking-wider">
          <div className="col-span-5 flex items-center gap-2 cursor-pointer hover:text-black" onClick={() => handleSort('title')}>
            Title
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="col-span-2">Tags</div>
          <div className="col-span-1 text-center cursor-pointer hover:text-black" onClick={() => handleSort('updatedAt')}>
            Connections
          </div>
          <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-black" onClick={() => handleSort('createdAt')}>
            Created
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="col-span-1 flex items-center gap-2 cursor-pointer hover:text-black" onClick={() => handleSort('updatedAt')}>
            Updated
            <ArrowUpDown className="w-3 h-3" />
          </div>
          <div className="col-span-1 text-center">Actions</div>
        </div>
      </div>

      {/* Nodes List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-black dark:text-white">
            <FileText className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
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
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredAndSortedNodes.map((node) => (
              <div
                key={node.id}
                onClick={() => handleNodeClick(node.id)}
                className="w-full px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left cursor-pointer"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-5">
                    <h3 className="font-medium text-black dark:text-white mb-1">{node.title || 'Untitled'}</h3>
                    <p className="text-sm text-black dark:text-gray-300 line-clamp-2">
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
                        <span className="px-2 py-0.5 text-xs text-black dark:text-gray-400">
                          +{(node.tags || []).length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-1 text-center text-sm text-black dark:text-gray-300">
                    {getConnectionCount(node.id)}
                  </div>
                  <div className="col-span-2 text-sm text-black dark:text-gray-300">
                    {new Date(node.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 text-sm text-black dark:text-gray-300">
                    {new Date(node.updatedAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={(e) => handleDeleteNode(node.id, e)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700"
                      title="Delete node"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Delete All Nodes?</h3>
                <p className="text-sm text-black dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-black dark:text-gray-300 mb-6">
              Are you sure you want to delete all <strong>{filteredAndSortedNodes.length}</strong> nodes? This will permanently remove all selected nodes from your workspace.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-black dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

