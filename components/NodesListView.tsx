'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Clock, FileText, Hash } from 'lucide-react';
import type { Node } from '@/types/Node';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface NodesListViewProps {
  workspaceId: string;
}

interface RecentlyVisitedNode extends Node {
  lastVisited: Date;
}

export default function NodesListView({ workspaceId }: NodesListViewProps) {
  const { nodes } = useWorkspaceStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const [recentlyVisited, setRecentlyVisited] = useState<RecentlyVisitedNode[]>([]);

  // Load recently visited nodes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`recentlyVisited_${workspaceId}`);
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
  }, [workspaceId]);

  // Refs for scrolling to selected node
  const recentlyVisitedRef = useRef<HTMLDivElement>(null);
  const allNodesRef = useRef<HTMLDivElement>(null);

  // Update recently visited when a node is selected
  // Use ref to track last selected node ID to prevent infinite loops
  const lastSelectedNodeIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!selectedNodeId) {
      lastSelectedNodeIdRef.current = null;
      return;
    }
    
    // Only update if selectedNodeId actually changed
    if (lastSelectedNodeIdRef.current === selectedNodeId) {
      return;
    }
    
    lastSelectedNodeIdRef.current = selectedNodeId;
    
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;

    setRecentlyVisited((prev) => {
      // Check if this node is already in the list with a recent timestamp
      // If so, don't update (prevents loops)
      const existing = prev.find((n) => n.id === node.id);
      if (existing) {
        const timeSinceLastVisit = Date.now() - existing.lastVisited.getTime();
        // Only update if last visit was more than 1 second ago (prevents rapid updates)
        if (timeSinceLastVisit < 1000) {
          return prev;
        }
      }
      
      // Remove if already exists
      const filtered = prev.filter((n) => n.id !== node.id);
      // Add to beginning
      const updated = [
        { ...node, lastVisited: new Date() },
        ...filtered,
      ].slice(0, 3); // Keep only 3 most recent

      // Save to localStorage
      localStorage.setItem(
        `recentlyVisited_${workspaceId}`,
        JSON.stringify(updated.map((n) => ({ ...n, lastVisited: n.lastVisited.toISOString() })))
      );

      return updated;
    });
  }, [selectedNodeId, workspaceId, nodes]); // Added nodes back to ensure node data is available

  // Listen for scrollToNode event to scroll sidebar to selected node
  useEffect(() => {
    const handleScrollToNode = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      if (!nodeId || nodeId !== selectedNodeId) return;

      // Try to find the node button in the DOM and scroll to it
      requestAnimationFrame(() => {
        const nodeButton = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement;
        if (nodeButton) {
          nodeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    };

    window.addEventListener('scrollToNode', handleScrollToNode as EventListener);
    return () => window.removeEventListener('scrollToNode', handleScrollToNode as EventListener);
  }, [selectedNodeId]);

  // Filter out recently visited from all nodes
  const allOtherNodes = useMemo(() => {
    const recentIds = new Set(recentlyVisited.map((n) => n.id));
    return nodes.filter((n) => !recentIds.has(n.id));
  }, [nodes, recentlyVisited]);

  // Group nodes by tags for better organization
  const nodesByTag = useMemo(() => {
    const grouped = new Map<string, Node[]>();
    
    allOtherNodes.forEach((node) => {
      if (node.tags && node.tags.length > 0) {
        node.tags.forEach((tag) => {
          if (!grouped.has(tag)) {
            grouped.set(tag, []);
          }
          grouped.get(tag)!.push(node);
        });
      } else {
        // Untagged nodes
        if (!grouped.has('_untagged')) {
          grouped.set('_untagged', []);
        }
        grouped.get('_untagged')!.push(node);
      }
    });

    return grouped;
  }, [allOtherNodes]);

  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId);
    // Scroll node into view on canvas (will be handled by CanvasContainer)
    const event = new CustomEvent('scrollToNode', { detail: { nodeId } });
    window.dispatchEvent(event);
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

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-t border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">All Nodes ({nodes.length})</h3>
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
            <div className="space-y-1" ref={recentlyVisitedRef}>
              {recentlyVisited.map((node) => (
                <button
                  key={node.id}
                  data-node-id={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    selectedNodeId === node.id
                      ? 'bg-blue-50 text-blue-900 border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{node.title || 'Untitled'}</span>
                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                      {formatDate(node.lastVisited)}
                    </span>
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

        {/* All Nodes Section */}
        <div className="p-4">
          {nodesByTag.size > 0 ? (
            Array.from(nodesByTag.entries()).map(([tag, tagNodes]) => (
              <div key={tag} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  {tag === '_untagged' ? (
                    <FileText className="w-4 h-4 text-slate-500" />
                  ) : (
                    <Hash className="w-4 h-4 text-slate-500" />
                  )}
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {tag === '_untagged' ? 'Untagged' : tag} ({tagNodes.length})
                  </h4>
                </div>
                <div className="space-y-1" ref={allNodesRef}>
                  {tagNodes.map((node) => (
                    <button
                      key={node.id}
                      data-node-id={node.id}
                      onClick={() => handleNodeClick(node.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                        selectedNodeId === node.id
                          ? 'bg-blue-50 text-blue-900 border border-blue-200'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-medium truncate">{node.title || 'Untitled'}</div>
                      {node.tags && node.tags.length > 1 && tag !== '_untagged' && (
                        <div className="flex items-center gap-1 mt-1">
                          {node.tags
                            .filter((t) => t !== tag)
                            .slice(0, 2)
                            .map((otherTag) => (
                              <span
                                key={otherTag}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600"
                              >
                                <Hash className="w-3 h-3 mr-0.5" />
                                {otherTag}
                              </span>
                            ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 text-sm py-8">
              No other nodes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

