/**
 * Custom hook for widget resize functionality
 * Provides stable resize handlers that don't cause dependency array issues
 */

import React, { useCallback, useRef, useEffect, RefObject, useState } from 'react';

export interface ResizeState {
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

export interface UseResizeOptions {
  minWidth?: number;
  minHeight?: number;
  onResize?: (width: number, height: number) => void;
  enabled?: boolean;
}

export interface UseResizeReturn {
  isResizing: boolean;
  handleResizeStart: (e: React.MouseEvent) => void;
  resizeHandleRef: RefObject<HTMLDivElement>;
}

/**
 * Custom hook for handling resize functionality
 * Uses refs for all mutable values to ensure stable dependencies
 */
export function useResize({
  minWidth = 200,
  minHeight = 150,
  onResize,
  enabled = true,
}: UseResizeOptions): UseResizeReturn {
  const isResizingRef = useRef(false);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const onResizeRef = useRef(onResize);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const nodeElementRef = useRef<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Update refs when values change (doesn't affect dependency arrays)
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  // Global mouse move handler - defined once and stable
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current || !resizeStateRef.current) {
      return;
    }

    // Prevent default and stop propagation
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const state = resizeStateRef.current;

    // Calculate mouse movement delta
    const deltaX = e.clientX - state.startX;
    const deltaY = e.clientY - state.startY;

    // Calculate new dimensions (bottom-right corner resize)
    const newWidth = Math.max(minWidth, state.startWidth + deltaX);
    const newHeight = Math.max(minHeight, state.startHeight + deltaY);

    // Round to avoid fractional pixels
    const roundedWidth = Math.round(newWidth);
    const roundedHeight = Math.round(newHeight);

    // Call resize handler
    onResizeRef.current?.(roundedWidth, roundedHeight);
  }, [minWidth, minHeight]);

  // Global mouse up handler - defined once and stable
  const handleMouseUp = useCallback((e?: MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    if (!isResizingRef.current) {
      return;
    }

    // Clean up
    if (nodeElementRef.current) {
      nodeElementRef.current.removeAttribute('data-resizing');
      nodeElementRef.current.style.pointerEvents = '';
    }

    // Reset state
    resizeStateRef.current = null;
    isResizingRef.current = false;
    setIsResizing(false);

    // Reset body styles
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  // Set up global event listeners when resizing
  useEffect(() => {
    if (!isResizing) {
      return;
    }

    // Use capture phase to intercept events before React Flow
    const options = { capture: true, passive: false };

    // Add listeners
    document.addEventListener('mousemove', handleMouseMove, options);
    document.addEventListener('mouseup', handleMouseUp, options);
    document.addEventListener('mouseleave', handleMouseUp, options);

    // Prevent React Flow from handling these events
    const preventReactFlowDrag = (e: Event) => {
      if (isResizingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('mousemove', preventReactFlowDrag, { capture: true, passive: false });
    window.addEventListener('mouseup', preventReactFlowDrag, { capture: true, passive: false });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, options);
      document.removeEventListener('mouseup', handleMouseUp, options);
      document.removeEventListener('mouseleave', handleMouseUp, options);
      window.removeEventListener('mousemove', preventReactFlowDrag, { capture: true });
      window.removeEventListener('mouseup', preventReactFlowDrag, { capture: true });

      // Final cleanup
      if (nodeElementRef.current) {
        nodeElementRef.current.removeAttribute('data-resizing');
        nodeElementRef.current.style.pointerEvents = '';
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!enabled || !resizeHandleRef.current) {
      return;
    }

    // Stop all event propagation immediately
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    // Find the React Flow node wrapper
    const nodeWrapper = resizeHandleRef.current.closest('.react-flow__node') as HTMLElement;
    if (!nodeWrapper) {
      console.warn('[useResize] Could not find React Flow node wrapper');
      return;
    }

    nodeElementRef.current = nodeWrapper;

    // Get current dimensions from the node wrapper
    const rect = nodeWrapper.getBoundingClientRect();

    // Store resize state
    resizeStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };

    // Mark as resizing
    isResizingRef.current = true;
    setIsResizing(true);

    // Disable React Flow dragging on this specific node
    nodeWrapper.setAttribute('data-resizing', 'true');
    nodeWrapper.style.pointerEvents = 'none';

    // Re-enable pointer events only on the resize handle
    if (resizeHandleRef.current) {
      resizeHandleRef.current.style.pointerEvents = 'auto';
    }

    // Prevent default browser behaviors
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'nwse-resize';
  }, [enabled]);

  return {
    isResizing,
    handleResizeStart,
    resizeHandleRef,
  };
}


