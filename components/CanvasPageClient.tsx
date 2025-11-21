'use client';

import { useCallback, useState, useEffect } from 'react';
import CanvasContainer from './CanvasContainer';
import NodeEditorPanel from './NodeEditorPanel';
import FloatingToolbar from './FloatingToolbar';
import KeyboardShortcuts from './KeyboardShortcuts';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';

interface CanvasPageClientProps {
  workspaceId: string;
}

export default function CanvasPageClient({ workspaceId }: CanvasPageClientProps) {
  const { nodes, addNode } = useWorkspaceStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const [isCreating, setIsCreating] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);

  const handleCreateNode = useCallback(
    async (type: string = 'note', screenPosition: { x: number; y: number }) => {
      if (isCreating) return;
      
      setIsCreating(true);
      setToolbarPosition(null); // Hide toolbar

      try {
        const titles: Record<string, string> = {
          text: 'Text Block',
          note: 'New Note',
          link: 'New Link',
          image: 'New Image',
          box: 'New Box',
          circle: 'New Circle',
        };

        // Get flow position from CanvasContainer (stored globally)
        const storedFlowPos = (window as any).lastFlowPosition || { x: 500, y: 400 };

        // Create node in database
        const response = await fetch('/api/nodes/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workspaceId,
            title: titles[type] || 'New Node',
            content: type === 'text' ? { type: 'doc', content: [{ type: 'paragraph' }] } : {},
            tags: [type],
            x: storedFlowPos.x,
            y: storedFlowPos.y,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Error creating node:', data.error);
          return;
        }

        if (data.node) {
          // Add node to store
          addNode(data.node);
          // Select the new node and focus title field
          selectNode(data.node.id);
          
          // Trigger empty state dismissal if needed
          const dismissEvent = new CustomEvent('dismiss-empty-state');
          window.dispatchEvent(dismissEvent);
          
          // Small delay to ensure NodeEditorPanel is rendered
          setTimeout(() => {
            const titleInput = document.querySelector('input[placeholder="Node title..."]') as HTMLInputElement;
            if (titleInput) {
              titleInput.focus();
              titleInput.select();
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error creating node:', error);
      } finally {
        setIsCreating(false);
      }
    },
    [workspaceId, isCreating, addNode, selectNode]
  );

  const handleShowToolbar = useCallback((position: { x: number; y: number }) => {
    setToolbarPosition(position);
  }, []);

  const handleHideToolbar = useCallback(() => {
    setToolbarPosition(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape to work even when typing
        if (e.key === 'Escape') {
          target.blur();
          selectNode(null);
          setToolbarPosition(null);
        }
        // Allow Ctrl/Cmd+N when typing
        if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
          e.preventDefault();
          // Create node at center of viewport
          const viewportCenter = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          };
          handleShowToolbar(viewportCenter);
          // Store center position as flow position
          (window as any).lastFlowPosition = { x: 500, y: 400 };
        }
        return;
      }

      // Ctrl/Cmd + N: Create new node
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        // Create node at center of viewport
        const viewportCenter = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        handleShowToolbar(viewportCenter);
        // Store center position as flow position
        (window as any).lastFlowPosition = { x: 500, y: 400 };
      }

      // Delete/Backspace: Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        // Dispatch delete event
        window.dispatchEvent(new CustomEvent('deleteSelectedNode', { detail: { nodeId: selectedNodeId } }));
      }

      // Escape: Deselect node and close toolbar
      if (e.key === 'Escape') {
        selectNode(null);
        setToolbarPosition(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectNode, selectedNodeId, handleShowToolbar]);

  // Listen for delete node event
  useEffect(() => {
    const handleDeleteNode = async (event: CustomEvent) => {
      const { nodeId } = event.detail;
      if (!nodeId) return;

      try {
        const response = await fetch(`/api/nodes/${nodeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          // Remove from store
          useWorkspaceStore.getState().deleteNode(nodeId);
          selectNode(null);
        }
      } catch (error) {
        console.error('Error deleting node:', error);
      }
    };

    window.addEventListener('deleteSelectedNode', handleDeleteNode as EventListener);
    return () => window.removeEventListener('deleteSelectedNode', handleDeleteNode as EventListener);
  }, [selectNode]);

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* Main Canvas Area - must fill available space */}
      <div className="flex-1 min-w-0 min-h-0 relative">
        <CanvasContainer 
          workspaceId={workspaceId} 
          onCreateNode={(pos) => handleShowToolbar(pos)}
        />
        {toolbarPosition && (
          <FloatingToolbar
            position={toolbarPosition}
            onClose={handleHideToolbar}
            onCreateNode={handleCreateNode}
          />
        )}
      </div>
      
      {/* Right Panel - Node Editor - fixed width */}
      <aside className="w-80 shrink-0 border-l border-gray-200 bg-white">
        <NodeEditorPanel />
      </aside>
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}
