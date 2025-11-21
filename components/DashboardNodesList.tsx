'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, FileText, Hash, ExternalLink } from 'lucide-react';
import type { Node } from '@/types/Node';
import type { Workspace } from '@/types/Workspace';

interface DashboardNodesListProps {
  workspaces: Workspace[];
}

interface RecentlyVisitedNode extends Node {
  lastVisited: Date;
  workspaceName: string;
  workspaceId: string;
}

interface WorkspaceNodes {
  workspace: Workspace;
  nodes: Node[];
}

export default function DashboardNodesList({ workspaces }: DashboardNodesListProps) {
  const router = useRouter();
  const [recentlyVisited, setRecentlyVisited] = useState<RecentlyVisitedNode[]>([]);
  const [allWorkspaceNodes, setAllWorkspaceNodes] = useState<WorkspaceNodes[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load nodes from all workspaces
  useEffect(() => {
    async function loadAllNodes() {
      setIsLoading(true);
      const nodesPromises = workspaces.map(async (workspace) => {
        try {
          const response = await fetch(`/api/workspaces/${workspace.id}/data`);
          if (!response.ok) return { workspace, nodes: [] };
          const data = await response.json();
          return {
            workspace,
            nodes: (data.nodes || []) as Node[],
          };
        } catch (error) {
          console.error(`Error loading nodes for workspace ${workspace.id}:`, error);
          return { workspace, nodes: [] };
        }
      });

      const results = await Promise.all(nodesPromises);
      setAllWorkspaceNodes(results);
      setIsLoading(false);
    }

    if (workspaces.length > 0) {
      loadAllNodes();
    } else {
      setIsLoading(false);
    }
  }, [workspaces]);

  // Load recently visited nodes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentlyVisitedNodes');
    if (stored) {
      try {
        const recent = JSON.parse(stored).map((item: any) => ({
          ...item,
          lastVisited: new Date(item.lastVisited),
        }));
        setRecentlyVisited(recent);
      } catch (error) {
        console.error('Error loading recently visited nodes:', error);
      }
    }
  }, []);

  // All nodes across all workspaces
  const allNodes = useMemo(() => {
    return allWorkspaceNodes.flatMap((wn) =>
      wn.nodes.map((node) => ({
        ...node,
        workspaceName: wn.workspace.name,
        workspaceId: wn.workspace.id,
      }))
    );
  }, [allWorkspaceNodes]);

  // Filter out recently visited from all nodes
  const otherNodes = useMemo(() => {
    const recentIds = new Set(recentlyVisited.map((n) => n.id));
    return allNodes.filter((n) => !recentIds.has(n.id));
  }, [allNodes, recentlyVisited]);

  // Group nodes by workspace
  const nodesByWorkspace = useMemo(() => {
    const grouped = new Map<string, typeof otherNodes>();
    
    otherNodes.forEach((node) => {
      const workspaceId = (node as any).workspaceId;
      if (!grouped.has(workspaceId)) {
        grouped.set(workspaceId, []);
      }
      grouped.get(workspaceId)!.push(node);
    });

    return grouped;
  }, [otherNodes]);

  const handleNodeClick = (node: any) => {
    // Update recently visited
    const recentEntry: RecentlyVisitedNode = {
      ...node,
      lastVisited: new Date(),
    };

    setRecentlyVisited((prev) => {
      const filtered = prev.filter((n) => n.id !== node.id);
      const updated = [recentEntry, ...filtered].slice(0, 3);
      
      // Save to localStorage
      localStorage.setItem(
        'recentlyVisitedNodes',
        JSON.stringify(updated.map((n) => ({ ...n, lastVisited: n.lastVisited.toISOString() })))
      );
      
      return updated;
    });

    // Navigate to workspace canvas - node selection will happen via event
    router.push(`/workspace/${node.workspaceId}/canvas`);
    
    // Dispatch event to select node after navigation (handled by CanvasContainer)
    setTimeout(() => {
      const event = new CustomEvent('scrollToNode', { detail: { nodeId: node.id } });
      window.dispatchEvent(event);
    }, 500);
  };

  const formatDate = (date: Date) => {
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

  if (isLoading) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Loading nodes...
      </div>
    );
  }

  const totalNodes = allNodes.length;

  if (totalNodes === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-t border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">
          All Nodes ({totalNodes})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* Recently Visited Section */}
        {recentlyVisited.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Recently Visited
              </h4>
            </div>
            <div className="space-y-1">
              {recentlyVisited.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sm text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium truncate">{node.title || 'Untitled'}</span>
                      <span className="text-xs text-slate-400 truncate">in {node.workspaceName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">
                        {formatDate(node.lastVisited)}
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                  {node.tags && node.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {node.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600"
                        >
                          <Hash className="w-3 h-3 mr-0.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Nodes by Workspace */}
        {nodesByWorkspace.size > 0 && (
          <div className="p-4">
            {Array.from(nodesByWorkspace.entries()).map(([workspaceId, workspaceNodes]) => {
              const workspace = workspaces.find((w) => w.id === workspaceId);
              if (!workspace) return null;

              return (
                <div key={workspaceId} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {workspace.name} ({workspaceNodes.length})
                    </h4>
                  </div>
                  <div className="space-y-1">
                    {workspaceNodes.map((node: any) => (
                      <button
                        key={node.id}
                        onClick={() => handleNodeClick(node)}
                        className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sm text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                      >
                        <div className="font-medium truncate">{node.title || 'Untitled'}</div>
                        {node.tags && node.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {node.tags.slice(0, 3).map((tag: string) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600"
                              >
                                <Hash className="w-3 h-3 mr-0.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {nodesByWorkspace.size === 0 && recentlyVisited.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            No other nodes
          </div>
        )}
      </div>
    </div>
  );
}

