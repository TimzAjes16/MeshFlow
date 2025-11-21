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
  const { setWorkspace, setNodes, setEdges } = useWorkspaceStore();
  const [isLoading, setIsLoading] = useState(true);

  // Load workspace data - single effect with polling (fixed reload loop)
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout | null = null;

    async function loadWorkspace(setLoading: boolean = true) {
      if (!isMounted) return;
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/data`);

        if (!response.ok) {
          console.error('Failed to load workspace');
          if (isMounted && setLoading) setIsLoading(false);
          return;
        }

        const data = await response.json();
        
        if (!isMounted) return;

        if (data.workspace) {
          setWorkspace(data.workspace as Workspace);
        }

        if (data.nodes) {
          setNodes(data.nodes as Node[]);
        }

        if (data.edges) {
          setEdges(data.edges as Edge[]);
        }
        
        if (setLoading && isMounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading workspace:', error);
        if (isMounted && setLoading) setIsLoading(false);
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

    // Listen for refresh events (e.g., after node creation)
    const handleRefresh = () => {
      console.log('[WorkspaceProvider] Refresh event received, will reload workspace data');
      // Add a delay to ensure immediate store updates happen first and API has the new node
      setTimeout(() => {
        loadWorkspace(false);
      }, 200);
    };
    window.addEventListener('refreshWorkspace', handleRefresh);

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      clearTimeout(timeoutId);
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