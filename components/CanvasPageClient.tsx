'use client';

import { useCallback, useState } from 'react';
import CanvasContainer from './CanvasContainer';
import NodeEditorPanel from './NodeEditorPanel';
import TopBar from './TopBar';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface CanvasPageClientProps {
  workspaceId: string;
}

export default function CanvasPageClient({ workspaceId }: CanvasPageClientProps) {
  const supabase = createClient();
  const { addNode, nodes } = useWorkspaceStore();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNode = useCallback(
    async (position: { x: number; y: number }) => {
      if (isCreating) return;
      
      setIsCreating(true);

      try {
        // Create node in database
        const { data, error } = await fetch('/api/nodes/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            title: 'New Node',
            content: {},
            tags: [],
            x: position.x,
            y: position.y,
          }),
        }).then((res) => res.json());

        if (error) {
          console.error('Error creating node:', error);
          return;
        }

        // Node will be added via realtime subscription
      } catch (error) {
        console.error('Error creating node:', error);
      } finally {
        setIsCreating(false);
      }
    },
    [workspaceId, isCreating]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <TopBar workspaceId={workspaceId} onCreateNode={() => handleCreateNode({ x: 500, y: 400 })} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <CanvasContainer workspaceId={workspaceId} onCreateNode={handleCreateNode} />
        </div>
        <NodeEditorPanel />
      </div>
    </div>
  );
}
