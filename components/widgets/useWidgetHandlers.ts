/**
 * Shared hook for widget close and resize handlers
 * Provides consistent behavior across all widget types
 */

import { useCallback } from 'react';
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

  const handleResize = useCallback((width: number, height: number) => {
    if (!nodeId) return;
    
    // Get current node from React Flow
    const currentNode = getNode(nodeId);
    if (!currentNode) return;
    
    // Update React Flow node dimensions
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              width,
              height,
              style: {
                ...node.style,
                width,
                height,
              },
            }
          : node
      )
    );
    
    // Update workspace store
    updateWorkspaceNode(nodeId, {
      width,
      height,
    });
    
    // Persist to API
    if (workspaceId) {
      fetch(`/api/nodes/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          width,
          height,
        }),
      }).catch((error) => {
        console.error('Error updating node size:', error);
      });
    }
  }, [nodeId, workspaceId, getNode, setNodes, updateWorkspaceNode]);

  return {
    handleClose,
    handleResize,
  };
}

