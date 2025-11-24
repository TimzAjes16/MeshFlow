/**
 * Base Node Component
 * Minimalistic base wrapper for all node types
 * Provides selection state, click handling, and drag-to-resize
 */

import { memo, ReactNode, useCallback, useRef, useState, useEffect } from 'react';
import type { Node as NodeType } from '@/types/Node';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';

export interface BaseNodeProps {
  node: NodeType;
  selected?: boolean;
  children: ReactNode;
  nodeId: string;
}

/**
 * Minimalistic base wrapper for all node types
 * Provides selection state and drag-to-resize on edges
 */
function BaseNode({ node, selected = false, children, nodeId }: BaseNodeProps) {
  const { selectNode } = useCanvasStore();
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number; edge: string } | null>(null);

  // Handle clicks on the node wrapper to ensure selection
  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    // Only handle if clicking directly on the wrapper (not on children that stop propagation)
    if (e.target === e.currentTarget && !selected) {
      selectNode(nodeId);
      // Dispatch scroll event for sidebar
      window.dispatchEvent(new CustomEvent('scrollToNode', { detail: { nodeId } }));
    }
  }, [selected, nodeId, selectNode]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, edge: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const currentWidth = node.width || rect.width;
    const currentHeight = node.height || rect.height;
    
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: currentWidth,
      height: currentHeight,
      edge,
    };
    setIsResizing(true);
  }, [node.width, node.height]);

  // Handle resize move
  useEffect(() => {
    if (!isResizing || !resizeStartRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current || !containerRef.current) return;

      const { x: startX, y: startY, width: startWidth, height: startHeight, edge } = resizeStartRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // Calculate new dimensions based on which edge is being dragged
      // For simplicity, only support right, bottom, and bottom-right resizing
      // (left/top edges would require position updates which is more complex)
      switch (edge) {
        case 'right':
          newWidth = Math.max(100, startWidth + deltaX);
          break;
        case 'bottom':
          newHeight = Math.max(50, startHeight + deltaY);
          break;
        case 'bottom-right':
          newWidth = Math.max(100, startWidth + deltaX);
          newHeight = Math.max(50, startHeight + deltaY);
          break;
        default:
          // For other edges, don't resize (would need position updates)
          return;
      }

      // Update node dimensions in real-time
      updateNode(nodeId, {
        width: newWidth,
        height: newHeight,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
      
      // Persist to API
      if (containerRef.current) {
        const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
        if (workspaceId) {
          const width = node.width || containerRef.current.offsetWidth;
          const height = node.height || containerRef.current.offsetHeight;
          fetch('/api/nodes/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId,
              width,
              height,
            }),
          }).catch(console.error);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, nodeId, updateNode, node.width, node.height]);

  const currentWidth = node.width || 'auto';
  const currentHeight = node.height || 'auto';

  return (
    <div
      ref={containerRef}
      className={`
        relative
        ${selected ? 'ring-2 ring-blue-500/60 ring-offset-0' : ''}
        transition-all duration-150
        ${isResizing ? 'select-none' : ''}
      `}
      style={{
        width: currentWidth,
        height: currentHeight,
      }}
      onClick={handleNodeClick}
    >
      {children}
      
      {/* Minimal resize handles - only show on right and bottom edges when selected */}
      {selected && (
        <>
          {/* Bottom edge handle */}
          <div
            className="absolute -bottom-1 left-2 right-2 h-2 cursor-ns-resize hover:bg-blue-400/40 z-10 transition-colors rounded-full"
            onMouseDown={(e) => handleResizeStart(e, 'bottom')}
          />
          {/* Right edge handle */}
          <div
            className="absolute top-2 bottom-2 -right-1 w-2 cursor-ew-resize hover:bg-blue-400/40 z-10 transition-colors rounded-full"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
          />
          {/* Bottom-right corner handle */}
          <div
            className="absolute -bottom-1 -right-1 w-3 h-3 cursor-nwse-resize hover:bg-blue-400/60 z-10 transition-colors rounded-tl-sm"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
          />
        </>
      )}
    </div>
  );
}

export default memo(BaseNode);

