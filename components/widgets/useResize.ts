/**
 * Widget Resize Hook - Rebuilt from scratch
 * Works like OBS/ShareScreen - direct manipulation of React Flow node dimensions
 * Properly handles zoom level for accurate resizing
 */

import { useCallback, useRef, useState, useEffect, RefObject } from 'react';
import { useReactFlow } from 'reactflow';

export interface UseResizeOptions {
  nodeId: string;
  minWidth?: number;
  minHeight?: number;
  enabled?: boolean;
}

export interface UseResizeReturn {
  isResizing: boolean;
  handleResizeStart: (e: React.MouseEvent) => void;
  resizeHandleRef: RefObject<HTMLDivElement>;
}

// Global set to track resizing nodes
const resizingNodes = new Set<string>();
if (typeof window !== 'undefined') {
  (window as any).__resizingNodes = resizingNodes;
}

export function isNodeResizing(nodeId: string): boolean {
  return resizingNodes.has(nodeId);
}

/**
 * Helper to find React Flow node element in DOM
 * React Flow uses data-id attribute on the node wrapper
 */
function findNodeElement(nodeId: string): HTMLElement | null {
  // Try multiple selectors to be robust
  let element = document.querySelector(`.react-flow__node[data-id="${nodeId}"]`) as HTMLElement;
  if (element) return element;
  
  // Fallback: find by ID in any react-flow node
  element = document.querySelector(`[data-id="${nodeId}"].react-flow__node`) as HTMLElement;
  if (element) return element;
  
  // Fallback: find any element with data-id matching nodeId
  element = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
  return element;
}

export function useResize({
  nodeId,
  minWidth = 200,
  minHeight = 150,
  enabled = true,
}: UseResizeOptions): UseResizeReturn {
  const { setNodes, getNode, getViewport } = useReactFlow();
  const [isResizing, setIsResizing] = useState(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  const startStateRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!enabled) return;

    // Stop all propagation immediately
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }

    // Get current node from React Flow
    const node = getNode(nodeId);
    if (!node) {
      console.error('[useResize] Node not found:', nodeId);
      return;
    }

    // Get current dimensions - prioritize node.width/height, fallback to DOM measurement
    const nodeElement = findNodeElement(nodeId);
    let currentWidth = (node.width as number) || 0;
    let currentHeight = (node.height as number) || 0;
    
    // If node doesn't have dimensions, get from DOM and convert to flow coordinates
    if (!currentWidth || !currentHeight) {
      if (nodeElement) {
        const rect = nodeElement.getBoundingClientRect();
        const viewport = getViewport();
        const zoom = viewport.zoom || 1;
        // Convert screen pixels to flow coordinates
        currentWidth = rect.width / zoom;
        currentHeight = rect.height / zoom;
      }
      
      // Final fallback to defaults
      if (!currentWidth || !currentHeight) {
        currentWidth = 400;
        currentHeight = 300;
      }
    }

    console.log('[useResize] Starting resize:', {
      nodeId,
      currentWidth,
      currentHeight,
      nodeWidth: node.width,
      nodeHeight: node.height,
      mouseX: e.clientX,
      mouseY: e.clientY,
    });

    // Store initial state
    startStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
    };

    // Mark as resizing
    setIsResizing(true);
    resizingNodes.add(nodeId);

    // Disable React Flow dragging on this node
    if (nodeElement) {
      nodeElement.setAttribute('data-resizing', 'true');
      nodeElement.style.pointerEvents = 'none';
    }

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  }, [enabled, nodeId, getNode, getViewport]);

  useEffect(() => {
    if (!isResizing || !startStateRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!startStateRef.current) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const { startX, startY, startWidth, startHeight } = startStateRef.current;
      
      // Get current viewport to account for zoom
      const viewport = getViewport();
      const zoom = viewport.zoom || 1;
      
      // Calculate delta in screen pixels
      const deltaXScreen = e.clientX - startX;
      const deltaYScreen = e.clientY - startY;
      
      // CRITICAL: Convert screen pixel delta to flow coordinate delta
      // When zoomed out (zoom < 1), same screen movement = larger flow movement
      // When zoomed in (zoom > 1), same screen movement = smaller flow movement
      const deltaXFlow = deltaXScreen / zoom;
      const deltaYFlow = deltaYScreen / zoom;

      // Calculate new dimensions in flow coordinates
      const newWidth = Math.max(minWidth, startWidth + deltaXFlow);
      const newHeight = Math.max(minHeight, startHeight + deltaYFlow);

      const roundedWidth = Math.round(newWidth);
      const roundedHeight = Math.round(newHeight);

      console.log('[useResize] Resizing:', {
        zoom,
        deltaXScreen,
        deltaYScreen,
        deltaXFlow,
        deltaYFlow,
        newWidth: roundedWidth,
        newHeight: roundedHeight,
      });

      // Update React Flow node directly
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              width: roundedWidth,
              height: roundedHeight,
              style: {
                ...node.style,
                width: roundedWidth,
                height: roundedHeight,
              },
            };
          }
          return node;
        })
      );
    };

    const handleMouseUp = () => {
      const nodeElement = findNodeElement(nodeId);
      if (nodeElement) {
        nodeElement.removeAttribute('data-resizing');
        nodeElement.style.pointerEvents = '';
      }

      resizingNodes.delete(nodeId);
      setIsResizing(false);
      startStateRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';

      console.log('[useResize] Resize ended, dispatching event for node:', nodeId);

      // Trigger resize callback by dispatching a custom event
      // The widget handler will listen for this
      window.dispatchEvent(new CustomEvent('widget-resize-end', { detail: { nodeId } }));
    };

    const options = { capture: true, passive: false };
    document.addEventListener('mousemove', handleMouseMove, options);
    document.addEventListener('mouseup', handleMouseUp, options);
    window.addEventListener('mouseup', handleMouseUp, options);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, options);
      document.removeEventListener('mouseup', handleMouseUp, options);
      window.removeEventListener('mouseup', handleMouseUp, options);
      
      // Cleanup
      const nodeElement = findNodeElement(nodeId);
      if (nodeElement) {
        nodeElement.removeAttribute('data-resizing');
        nodeElement.style.pointerEvents = '';
      }
      resizingNodes.delete(nodeId);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, nodeId, minWidth, minHeight, setNodes, getViewport]);

  return {
    isResizing,
    handleResizeStart,
    resizeHandleRef,
  };
}
