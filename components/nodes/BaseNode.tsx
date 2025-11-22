/**
 * Base Node Component
 * Following Notion/Miro pattern: all nodes share common base functionality
 * but have type-specific rendering
 */

import { memo, ReactNode, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import type { Node as NodeType } from '@/types/Node';
import { getNodeTypeDefinition } from '@/lib/nodeTypes';
import ResizeHandle from '@/components/ResizeHandle';
import RotateHandle from '@/components/RotateHandle';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';

export interface BaseNodeProps {
  node: NodeType;
  selected?: boolean;
  children: ReactNode;
  showHandles?: boolean;
  nodeId: string; // Add nodeId prop for resize/rotate handlers
}

/**
 * Base wrapper for all node types
 * Provides common functionality like handles, selection states, resize, and rotation
 */
function BaseNode({ node, selected = false, children, showHandles = true, nodeId }: BaseNodeProps) {
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const { selectNode } = useCanvasStore();
  const nodeDefinition = getNodeTypeDefinition(node);
  const isResizable = nodeDefinition.isResizable ?? true; // Default to true
  const isRotatable = nodeDefinition.isRotatable ?? false; // Default to false
  
  const currentWidth = node.width || 200;
  const currentHeight = node.height || 100;
  const currentRotation = node.rotation || 0;

  // Handle clicks on the node wrapper to ensure selection
  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    // Only handle if clicking directly on the wrapper (not on children that stop propagation)
    if (e.target === e.currentTarget && !selected) {
      selectNode(nodeId);
      // Dispatch scroll event for sidebar
      window.dispatchEvent(new CustomEvent('scrollToNode', { detail: { nodeId } }));
    }
  }, [selected, nodeId, selectNode]);

  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      updateNode(id, { width, height });
      
      // Also update via API
      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            width,
            height,
          }),
        }).catch(console.error);
      }
    },
    [updateNode]
  );

  const handleRotate = useCallback(
    (id: string, rotation: number) => {
      updateNode(id, { rotation });
      
      // Also update via API
      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            rotation,
          }),
        }).catch(console.error);
      }
    },
    [updateNode]
  );

  return (
    <div
      className={`
        relative
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        width: node.width || 'auto',
        height: node.height || 'auto',
        minWidth: node.width ? undefined : '200px',
        minHeight: node.height ? undefined : '60px',
        transform: currentRotation !== 0 ? `rotate(${currentRotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
      onClick={handleNodeClick}
    >
      {showHandles && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
          <Handle
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
          <Handle
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
        </>
      )}
      
      {/* Resize Handles - show when selected and resizable */}
      {selected && isResizable && (
        <>
          {/* Corner handles */}
          <ResizeHandle
            nodeId={nodeId}
            position="top-left"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
          <ResizeHandle
            nodeId={nodeId}
            position="top-right"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
          <ResizeHandle
            nodeId={nodeId}
            position="bottom-left"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
          <ResizeHandle
            nodeId={nodeId}
            position="bottom-right"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
          {/* Edge handles */}
          <ResizeHandle
            nodeId={nodeId}
            position="top"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
          <ResizeHandle
            nodeId={nodeId}
            position="bottom"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
          <ResizeHandle
            nodeId={nodeId}
            position="left"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
          <ResizeHandle
            nodeId={nodeId}
            position="right"
            currentWidth={currentWidth}
            currentHeight={currentHeight}
            onResize={handleResize}
          />
        </>
      )}
      
      {/* Rotate Handle - show when selected and rotatable */}
      {selected && isRotatable && (
        <RotateHandle
          nodeId={nodeId}
          rotation={currentRotation}
          onRotate={handleRotate}
        />
      )}
      
      {children}
    </div>
  );
}

export default memo(BaseNode);

