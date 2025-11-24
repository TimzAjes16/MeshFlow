/**
 * Shared hook for widget close and resize handlers
 * Provides consistent behavior across all widget types
 */

import { useCallback, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';

export function useWidgetHandlers(nodeId: string) {
  const { setNodes, getNode, deleteElements } = useReactFlow();
  const { updateNode: updateWorkspaceNode, deleteNode: deleteWorkspaceNode } = useWorkspaceStore();
  const { deleteNode: deleteCanvasNode, selectNode } = useCanvasStore();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);

  const handleClose = useCallback(async () => {
    if (!nodeId || !workspaceId) return;
    
    try {
      // Delete from API
      const response = await fetch(`/api/nodes/${nodeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Delete from React Flow using deleteElements
        deleteElements({ nodes: [{ id: nodeId }] });
        
        // Delete from workspace store
        deleteWorkspaceNode(nodeId);
        
        // Delete from canvas store
        deleteCanvasNode(nodeId);
        
        // Deselect if this node was selected
        selectNode(null);
      } else {
        const errorText = await response.text();
        console.error('Failed to delete node:', errorText);
        alert(`Failed to delete widget: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      alert(`Error deleting widget: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [nodeId, workspaceId, deleteElements, deleteWorkspaceNode, deleteCanvasNode, selectNode]);

  // Listen for React Flow node resize via NodeResizer
  // React Flow automatically updates node.width and node.height when NodeResizer is used
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const checkNodeSize = () => {
      const node = getNode(nodeId);
      if (!node || !workspaceId) return;

      const width = (node.width as number) || 0;
      const height = (node.height as number) || 0;

      // Only persist if dimensions actually changed
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width;
        lastHeight = height;

        // Debounce: wait for resize to finish
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }

        resizeTimeout = setTimeout(async () => {
          if (width > 0 && height > 0) {
            const roundedWidth = Math.round(width);
            const roundedHeight = Math.round(height);

            // Update workspace store
            try {
              updateWorkspaceNode(nodeId, {
                width: roundedWidth,
                height: roundedHeight,
              });
            } catch (error) {
              console.error('[useWidgetHandlers] Error updating workspace store:', error);
            }

            // Persist to API
            try {
              const response = await fetch(`/api/nodes/update`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nodeId,
                  width: roundedWidth,
                  height: roundedHeight,
                }),
              });

              if (!response.ok) {
                console.error(`[useWidgetHandlers] Failed to persist size: ${response.status}`);
              }
            } catch (error) {
              console.error('[useWidgetHandlers] Error persisting size:', error);
            }
          }
        }, 500); // 500ms debounce
      }
    };

    // Check on mount
    checkNodeSize();

    // Poll for changes (NodeResizer updates node dimensions directly)
    const interval = setInterval(checkNodeSize, 200);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      clearInterval(interval);
    };
  }, [nodeId, workspaceId, getNode, updateWorkspaceNode]);

  // This is now a no-op - resize is handled directly by useResize hook
  const handleResize = useCallback(() => {
    // Resize is handled directly by useResize hook via React Flow setNodes
    // This callback is kept for compatibility but does nothing
  }, []);

  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!nodeId || !workspaceId) return;
    
    // Update workspace store
    updateWorkspaceNode(nodeId, {
      title: newTitle,
    });
    
    // Persist to API
    try {
      const response = await fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          title: newTitle,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          updateWorkspaceNode(nodeId, data.node);
        }
      }
    } catch (error) {
      console.error('Error updating widget title:', error);
    }
  }, [nodeId, workspaceId, updateWorkspaceNode]);

  return {
    handleClose,
    handleResize,
    handleTitleChange,
  };
}

