'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Tag, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { getNodeColor } from '@/lib/nodeColors';

interface ClustersViewProps {
  workspaceId: string;
}

export default function ClustersView({ workspaceId }: ClustersViewProps) {
  const router = useRouter();
  const { nodes, edges, deleteNode } = useWorkspaceStore();
  const { selectNode } = useCanvasStore();
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Group nodes by tags
  const clusters = useMemo(() => {
    const clustersMap = new Map<string, typeof nodes>();

    // Create clusters based on tags
    nodes.forEach(node => {
      if (node.tags && node.tags.length > 0) {
        node.tags.forEach(tag => {
          if (!clustersMap.has(tag)) {
            clustersMap.set(tag, []);
          }
          clustersMap.get(tag)!.push(node);
        });
      } else {
        // Untagged nodes go into a special cluster
        if (!clustersMap.has('_untagged')) {
          clustersMap.set('_untagged', []);
        }
        clustersMap.get('_untagged')!.push(node);
      }
    });

    // Convert to array and sort by size
    return Array.from(clustersMap.entries())
      .map(([tag, clusterNodes]) => {
        const nodeColor = tag === '_untagged' ? '#9CA3AF' : getNodeColor(clusterNodes[0]);
        // getNodeColor can return a string or an object with primary/secondary/name
        // Extract the color string if it's an object
        const colorString = typeof nodeColor === 'string' 
          ? nodeColor 
          : nodeColor?.primary || nodeColor?.secondary || '#9CA3AF';
        
        return {
          tag: tag === '_untagged' ? 'Untagged' : tag,
          nodes: clusterNodes,
          color: colorString,
        };
      })
      .sort((a, b) => b.nodes.length - a.nodes.length);
  }, [nodes]);

  // Get connection count within cluster
  const getClusterConnectionCount = (clusterNodes: typeof nodes) => {
    const nodeIds = new Set(clusterNodes.map(n => n.id));
    return edges.filter(
      edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    ).length;
  };

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId);
    router.push(`/workspace/${workspaceId}/canvas`);
  };

  const handleClusterClick = (tag: string) => {
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
    if (!confirm(`Are you sure you want to delete ALL ${nodes.length} nodes? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete all nodes
      const deletePromises = nodes.map(node =>
        fetch(`/api/nodes/${node.id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const allSucceeded = results.every(r => r.ok);

      if (allSucceeded) {
        // Remove all from store
        nodes.forEach(node => deleteNode(node.id));
        setShowDeleteAllConfirm(false);
      } else {
        alert('Some nodes failed to delete. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting all nodes:', error);
      alert('Failed to delete nodes');
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-black dark:text-white">
        <Layers className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-lg font-medium mb-2">No clusters yet</p>
        <p className="text-sm">Create nodes with tags to see clusters</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 overflow-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Clusters</h2>
          <p className="text-sm text-black dark:text-gray-400">
            Nodes grouped by tags • {clusters.length} clusters
          </p>
        </div>
        {nodes.length > 0 && (
          <button
            onClick={() => setShowDeleteAllConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete All
          </button>
        )}
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusters.map((cluster) => (
          <div
            key={cluster.tag}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            {/* Cluster Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${cluster.color}20` }}
                >
                  <Tag
                    className="w-6 h-6"
                    style={{ color: cluster.color as string }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-black dark:text-white">{cluster.tag}</h3>
                  <p className="text-sm text-black dark:text-gray-400">
                    {cluster.nodes.length} {cluster.nodes.length === 1 ? 'node' : 'nodes'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleClusterClick(cluster.tag)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-black dark:text-white" />
              </button>
            </div>

            {/* Cluster Stats */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-black dark:text-gray-300">Connections</span>
                <span className="font-medium text-black dark:text-white">
                  {getClusterConnectionCount(cluster.nodes)}
                </span>
              </div>
            </div>

            {/* Nodes Preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-black dark:text-white uppercase tracking-wider mb-2">
                Nodes
              </p>
              {cluster.nodes.slice(0, 5).map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 group"
                >
                  <button
                    onClick={() => handleNodeClick(node.id)}
                    className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <p className="text-sm font-medium text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {node.title || 'Untitled'}
                    </p>
                    {typeof node.content === 'string' && node.content && (
                      <p className="text-xs text-black dark:text-gray-400 mt-1 line-clamp-1">
                        {node.content.substring(0, 60)}
                      </p>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDeleteNode(node.id, e)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 opacity-0 group-hover:opacity-100"
                    title="Delete node"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {cluster.nodes.length > 5 && (
                <p className="text-xs text-black dark:text-gray-400 px-3 py-2">
                  +{cluster.nodes.length - 5} more nodes
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State for Untagged Clusters */}
      {clusters.filter(c => c.tag === 'Untagged').length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            💡 <strong>Tip:</strong> Add tags to your nodes to organize them into clusters
          </p>
        </div>
      )}

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
              Are you sure you want to delete all <strong>{nodes.length}</strong> nodes? This will permanently remove all nodes from your workspace.
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

