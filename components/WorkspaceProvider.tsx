'use client';

import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import type { Workspace } from '@/types/Workspace';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';

interface WorkspaceProviderProps {
  workspaceId: string;
  children: React.ReactNode;
}

export default function WorkspaceProvider({ workspaceId, children }: WorkspaceProviderProps) {
  // Only get setters from store - don't subscribe to nodes/edges to avoid unnecessary re-renders
  const { setWorkspace, setNodes, setEdges } = useWorkspaceStore();
  const [isLoading, setIsLoading] = useState(true);

  // Load workspace data - single effect with polling (fixed reload loop)
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;
    let isLoadingRef = false; // Prevent multiple simultaneous loads

    // Helper to create a stable hash of nodes/edges for comparison
    function createNodesHash(nodes: Node[]): string {
      return JSON.stringify(
        nodes
          .map((n: Node) => {
            const contentStr = n.content ? JSON.stringify(n.content) : '';
            return {
              id: n.id,
              x: n.x,
              y: n.y,
              title: n.title,
              contentLength: contentStr.length,
              contentStart: contentStr.substring(0, 100), // First 100 chars for change detection
              tags: n.tags?.slice().sort().join(',') || '',
            };
          })
          .sort((a, b) => a.id.localeCompare(b.id)) // Sort by ID for consistent comparison
      );
    }

    function createEdgesHash(edges: Edge[]): string {
      return JSON.stringify(
        edges
          .map((e: Edge) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label || '',
          }))
          .sort((a, b) => a.id.localeCompare(b.id)) // Sort by ID for consistent comparison
      );
    }

    async function loadWorkspace(setLoading: boolean = true) {
      if (!isMounted || isLoadingRef) return; // Prevent concurrent loads
      isLoadingRef = true;

      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/data`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to load workspace:', {
            status: response.status,
            statusText: response.statusText,
            workspaceId,
            error: errorData.error || 'Unknown error',
            details: errorData.details,
          });
          if (isMounted && setLoading) setIsLoading(false);
          isLoadingRef = false;
          return;
        }

        const data = await response.json();

        if (!isMounted) {
          isLoadingRef = false;
          return;
        }

        // Compare new data with current store state - only update if actually changed
        // Get current store state (use getState to avoid closure issues)
        const currentStoreState = useWorkspaceStore.getState();

        // Only update workspace if it actually changed
        if (data.workspace) {
          const newWorkspaceHash = JSON.stringify(data.workspace);
          const currentWorkspaceHash = currentStoreState.currentWorkspace
            ? JSON.stringify(currentStoreState.currentWorkspace)
            : '';
          if (newWorkspaceHash !== currentWorkspaceHash) {
            console.log('[WorkspaceProvider] Workspace changed, updating store');
            setWorkspace(data.workspace as Workspace);
          }
        }

        // Only update nodes if they actually changed (by value, not reference)
        if (data.nodes) {
          const newNodesHash = createNodesHash(data.nodes);
          const currentNodesHash = createNodesHash(currentStoreState.nodes || []);
          if (newNodesHash !== currentNodesHash) {
            console.log('[WorkspaceProvider] Nodes changed, updating store', {
              newCount: data.nodes.length,
              currentCount: currentStoreState.nodes?.length || 0,
            });
            setNodes(data.nodes as Node[]);
          } else {
            console.log('[WorkspaceProvider] Nodes unchanged, skipping store update');
          }
        }

        // Only update edges if they actually changed (by value, not reference)
        if (data.edges) {
          const newEdgesHash = createEdgesHash(data.edges);
          const currentEdgesHash = createEdgesHash(currentStoreState.edges || []);
          if (newEdgesHash !== currentEdgesHash) {
            console.log('[WorkspaceProvider] Edges changed, updating store', {
              newCount: data.edges.length,
              currentCount: currentStoreState.edges?.length || 0,
            });
            setEdges(data.edges as Edge[]);
          } else {
            console.log('[WorkspaceProvider] Edges unchanged, skipping store update');
          }
        }

        if (setLoading && isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading workspace:', error);
        if (isMounted && setLoading) setIsLoading(false);
      } finally {
        isLoadingRef = false;
      }
    }

    // Initial load
    loadWorkspace(true);

    // Set up polling after initial load (only refresh data, don't change loading state)
    const timeoutId = setTimeout(() => {
      if (pollInterval) clearInterval(pollInterval);
      
      pollInterval = setInterval(() => {
        loadWorkspace(false); // Don't set loading state during polling
      }, 5000);
    }, 1000); // Wait 1 second after initial load before starting polling

    // Listen for refresh events (e.g., after node creation/deletion - major operations only)
    // HEAVILY debounced to prevent blocking during editing
    let refreshTimeout: NodeJS.Timeout | null = null;
    let lastRefreshTime = 0;
    const MIN_REFRESH_INTERVAL = 10000; // Minimum 10 seconds between refreshes
    
    const handleRefresh = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // Ignore refresh events if we've refreshed recently (within 10 seconds)
      if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
        console.log('[WorkspaceProvider] Refresh event ignored - too soon since last refresh');
        return;
      }
      
      console.log('[WorkspaceProvider] Refresh event received, will reload workspace data');
      // Clear any pending refresh timeout
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
      // Add a significant delay to batch multiple refresh events
      refreshTimeout = setTimeout(() => {
        lastRefreshTime = Date.now();
        loadWorkspace(false);
        refreshTimeout = null;
      }, 5000); // 5 second debounce
    };
    window.addEventListener('refreshWorkspace', handleRefresh);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      clearTimeout(timeoutId);
      if (refreshTimeout) clearTimeout(refreshTimeout);
      window.removeEventListener('refreshWorkspace', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]); // Only depend on workspaceId - no reload loop

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-yellow-400">Loading workspace...</div>
      </div>
    );
  }

  return <>{children}</>;
}