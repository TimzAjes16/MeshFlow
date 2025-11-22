'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Tag, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { getNodeColor } from '@/lib/nodeColors';

interface ClustersViewProps {
  workspaceId: string;
}

export default function ClustersView({ workspaceId }: ClustersViewProps) {
  const router = useRouter();
  const { nodes, edges } = useWorkspaceStore();
  const { selectNode } = useCanvasStore();

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

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Layers className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium mb-2">No clusters yet</p>
        <p className="text-sm">Create nodes with tags to see clusters</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Clusters</h2>
        <p className="text-sm text-gray-500">
          Nodes grouped by tags • {clusters.length} clusters
        </p>
      </div>

      {/* Clusters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusters.map((cluster) => (
          <div
            key={cluster.tag}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
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
                  <h3 className="font-semibold text-gray-900">{cluster.tag}</h3>
                  <p className="text-sm text-gray-500">
                    {cluster.nodes.length} {cluster.nodes.length === 1 ? 'node' : 'nodes'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleClusterClick(cluster.tag)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Cluster Stats */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Connections</span>
                <span className="font-medium text-gray-900">
                  {getClusterConnectionCount(cluster.nodes)}
                </span>
              </div>
            </div>

            {/* Nodes Preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Nodes
              </p>
              {cluster.nodes.slice(0, 5).map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                    {node.title || 'Untitled'}
                  </p>
                  {typeof node.content === 'string' && node.content && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {node.content.substring(0, 60)}
                    </p>
                  )}
                </button>
              ))}
              {cluster.nodes.length > 5 && (
                <p className="text-xs text-gray-500 px-3 py-2">
                  +{cluster.nodes.length - 5} more nodes
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State for Untagged Clusters */}
      {clusters.filter(c => c.tag === 'Untagged').length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>Tip:</strong> Add tags to your nodes to organize them into clusters
          </p>
        </div>
      )}
    </div>
  );
}

