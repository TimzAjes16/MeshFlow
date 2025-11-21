'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { createClient } from '@/lib/supabase/client';
import type { Workspace } from '@/types/Workspace';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';

interface WorkspaceProviderProps {
  workspaceId: string;
  children: React.ReactNode;
}

export default function WorkspaceProvider({ workspaceId, children }: WorkspaceProviderProps) {
  const { setWorkspace, setNodes, setEdges } = useWorkspaceStore();
  const supabase = createClient();

  useEffect(() => {
    async function loadWorkspace() {
      // Load workspace
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (workspace) {
        setWorkspace(workspace as Workspace);
      }

      // Load nodes
      const { data: nodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (nodes) {
        setNodes(nodes as Node[]);
      }

      // Load edges
      const { data: edges } = await supabase
        .from('edges')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (edges) {
        setEdges(edges as Edge[]);
      }

      // Subscribe to realtime updates
      const nodesChannel = supabase
        .channel(`nodes:${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nodes',
            filter: `workspace_id=eq.${workspaceId}`,
          },
          async () => {
            const { data: updatedNodes } = await supabase
              .from('nodes')
              .select('*')
              .eq('workspace_id', workspaceId)
              .order('created_at', { ascending: false });

            if (updatedNodes) {
              setNodes(updatedNodes as Node[]);
            }
          }
        )
        .subscribe();

      const edgesChannel = supabase
        .channel(`edges:${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'edges',
            filter: `workspace_id=eq.${workspaceId}`,
          },
          async () => {
            const { data: updatedEdges } = await supabase
              .from('edges')
              .select('*')
              .eq('workspace_id', workspaceId);

            if (updatedEdges) {
              setEdges(updatedEdges as Edge[]);
            }
          }
        )
        .subscribe();

      return () => {
        nodesChannel.unsubscribe();
        edgesChannel.unsubscribe();
      };
    }

    loadWorkspace();
  }, [workspaceId, supabase, setWorkspace, setNodes, setEdges]);

  return <>{children}</>;
}
