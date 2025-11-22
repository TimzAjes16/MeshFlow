'use client';

import { useCallback, useRef, memo } from 'react';

interface ResizeHandleProps {
  nodeId: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
  currentWidth: number;
  currentHeight: number;
  onResize: (nodeId: string, width: number, height: number) => void;
}

function ResizeHandle({ nodeId, position, currentWidth, currentHeight, onResize }: ResizeHandleProps) {
  const startPosRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      
      // Get the node element to calculate scale correctly
      const nodeElement = (e.target as HTMLElement).closest('[data-id]') as HTMLElement;
      if (!nodeElement) return;
      
      const nodeRect = nodeElement.getBoundingClientRect();
      const aspectRatio = currentWidth / currentHeight;
      
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: currentWidth,
        height: currentHeight,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startPosRef.current) return;
        
        // Prevent default to stop any drag behavior
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const deltaX = moveEvent.clientX - startPosRef.current.x;
        const deltaY = moveEvent.clientY - startPosRef.current.y;

        let newWidth = startPosRef.current.width;
        let newHeight = startPosRef.current.height;

        // Corner handles: scale linearly (maintain aspect ratio)
        if (position === 'top-left' || position === 'top-right' || 
            position === 'bottom-left' || position === 'bottom-right') {
          // Calculate scale based on diagonal movement from corner
          // Use the average of both deltas to scale proportionally
          const scaleX = Math.abs(deltaX) / startPosRef.current.width;
          const scaleY = Math.abs(deltaY) / startPosRef.current.height;
          // Use the larger scale factor to maintain aspect ratio
          const scaleFactor = Math.max(scaleX, scaleY);
          
          const signX = position.includes('right') ? 1 : -1;
          const signY = position.includes('bottom') ? 1 : -1;
          
          // Apply scale factor to maintain aspect ratio
          newWidth = Math.max(50, startPosRef.current.width * (1 + signX * scaleFactor));
          newHeight = Math.max(50, startPosRef.current.height * (1 + signY * scaleFactor));
          
          // Ensure aspect ratio is maintained exactly
          const newAspectRatio = newWidth / newHeight;
          if (Math.abs(newAspectRatio - aspectRatio) > 0.01) {
            // Recalculate to maintain exact aspect ratio
            if (scaleX > scaleY) {
              newHeight = newWidth / aspectRatio;
            } else {
              newWidth = newHeight * aspectRatio;
            }
          }
        } else {
          // Edge handles: resize only in that dimension
          if (position.includes('right')) {
            newWidth = Math.max(50, startPosRef.current.width + deltaX);
          } else if (position.includes('left')) {
            newWidth = Math.max(50, startPosRef.current.width - deltaX);
          }

          if (position.includes('bottom')) {
            newHeight = Math.max(50, startPosRef.current.height + deltaY);
          } else if (position.includes('top')) {
            newHeight = Math.max(50, startPosRef.current.height - deltaY);
          }
        }

        onResize(nodeId, Math.round(newWidth), Math.round(newHeight));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        startPosRef.current = null;
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [nodeId, position, currentWidth, currentHeight, onResize]
  );

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-0 left-0 cursor-nw-resize';
      case 'top-right':
        return 'top-0 right-0 cursor-ne-resize';
      case 'bottom-left':
        return 'bottom-0 left-0 cursor-sw-resize';
      case 'bottom-right':
        return 'bottom-0 right-0 cursor-se-resize';
      case 'top':
        return 'top-0 left-1/2 -translate-x-1/2 cursor-n-resize';
      case 'bottom':
        return 'bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize';
      case 'left':
        return 'left-0 top-1/2 -translate-y-1/2 cursor-w-resize';
      case 'right':
        return 'right-0 top-1/2 -translate-y-1/2 cursor-e-resize';
      default:
        return '';
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-lg z-50 ${getPositionClasses()}`}
      onMouseDown={handleMouseDown}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }}
      draggable={false}
      style={{
        transform: position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 
                   position === 'left' || position === 'right' ? 'translateY(-50%)' : '',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    />
  );
}

const MemoizedResizeHandle = memo(ResizeHandle);
export default MemoizedResizeHandle;

