'use client';

import { useCallback, useRef } from 'react';

interface ResizeHandleProps {
  nodeId: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right';
  currentWidth: number;
  currentHeight: number;
  onResize: (nodeId: string, width: number, height: number) => void;
}

export default function ResizeHandle({ nodeId, position, currentWidth, currentHeight, onResize }: ResizeHandleProps) {
  const startPosRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: currentWidth,
        height: currentHeight,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startPosRef.current) return;

        const deltaX = moveEvent.clientX - startPosRef.current.x;
        const deltaY = moveEvent.clientY - startPosRef.current.y;

        let newWidth = startPosRef.current.width;
        let newHeight = startPosRef.current.height;

        // Calculate new dimensions based on handle position
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

        onResize(nodeId, newWidth, newHeight);
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
      style={{
        transform: position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 
                   position === 'left' || position === 'right' ? 'translateY(-50%)' : '',
      }}
    />
  );
}

