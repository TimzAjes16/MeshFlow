/**
 * Floating Crop Area Component
 * Creates a draggable/resizable crop area overlay that can be positioned anywhere on screen
 * Works outside the app window bounds
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Check } from 'lucide-react';

interface FloatingCropAreaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (area: { x: number; y: number; width: number; height: number }) => void;
  defaultWidth?: number;
  defaultHeight?: number;
}

export default function FloatingCropArea({ 
  isOpen, 
  onClose, 
  onConfirm,
  defaultWidth = 779,
  defaultHeight = 513 
}: FloatingCropAreaProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { 
        x: window.innerWidth / 2 - defaultWidth / 2, 
        y: window.innerHeight / 2 - defaultHeight / 2 
      };
    }
    return { x: 0, y: 0 };
  });
  const [size, setSize] = useState<{ width: number; height: number }>({ 
    width: defaultWidth, 
    height: defaultHeight 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize position to center of screen (using screen coordinates)
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      // Center on the viewport (visible area), accounting for window position
      const centerX = window.screenX + (window.innerWidth / 2);
      const centerY = window.screenY + (window.innerHeight / 2);
      setPosition({
        x: centerX - (defaultWidth / 2),
        y: centerY - (defaultHeight / 2),
      });
      setSize({ width: defaultWidth, height: defaultHeight });
    }
  }, [isOpen, defaultWidth, defaultHeight]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.resize-handle')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    // Use screen coordinates for consistent dragging
    // Calculate offset from the current position
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      // Store the offset between mouse position and the crop area's top-left corner
      // Using screen coordinates for consistency
      setDragOffset({
        x: e.screenX - position.x,
        y: e.screenY - position.y,
      });
    }
  }, [position]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    // Store the mouse position in screen coordinates relative to the handle position
    const handleX = handle.includes('w') ? position.x : handle.includes('e') ? position.x + size.width : position.x + size.width / 2;
    const handleY = handle.includes('n') ? position.y : handle.includes('s') ? position.y + size.height : position.y + size.height / 2;
    setDragOffset({
      x: e.screenX - handleX,
      y: e.screenY - handleY,
    });
  }, [position, size]);

  // Handle mouse move for dragging and resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      // Use screen coordinates for consistent dragging
      // Calculate new position based on mouse position minus the stored offset
      const newX = e.screenX - dragOffset.x;
      const newY = e.screenY - dragOffset.y;
      
      // Allow positioning anywhere on screen
      setPosition({ 
        x: newX, 
        y: newY
      });
    } else if (isResizing && resizeHandle && containerRef.current) {
      // For resizing, calculate new size based on mouse movement
      // dragOffset contains the offset from handle to mouse at start of resize
      // So the handle position in screen coords is: e.screenX - dragOffset.x (and same for Y)
      let newSize = { ...size };
      let newPosition = { ...position };

      // Calculate handle position in screen coordinates
      let handleScreenX: number;
      let handleScreenY: number;
      
      if (resizeHandle.includes('w')) {
        handleScreenX = position.x;
      } else if (resizeHandle.includes('e')) {
        handleScreenX = position.x + size.width;
      } else {
        handleScreenX = position.x + size.width / 2;
      }
      
      if (resizeHandle.includes('n')) {
        handleScreenY = position.y;
      } else if (resizeHandle.includes('s')) {
        handleScreenY = position.y + size.height;
      } else {
        handleScreenY = position.y + size.height / 2;
      }

      // Current handle position (where mouse is)
      const currentHandleX = e.screenX - dragOffset.x;
      const currentHandleY = e.screenY - dragOffset.y;
      
      // Calculate deltas
      const deltaX = currentHandleX - handleScreenX;
      const deltaY = currentHandleY - handleScreenY;

      // Handle different resize handles
      if (resizeHandle.includes('n')) {
        const heightChange = -deltaY;
        newSize.height = Math.max(100, size.height + heightChange);
        newPosition.y = position.y - (newSize.height - size.height);
      }
      if (resizeHandle.includes('s')) {
        newSize.height = Math.max(100, size.height + deltaY);
      }
      if (resizeHandle.includes('w')) {
        const widthChange = -deltaX;
        newSize.width = Math.max(100, size.width + widthChange);
        newPosition.x = position.x - (newSize.width - size.width);
      }
      if (resizeHandle.includes('e')) {
        newSize.width = Math.max(100, size.width + deltaX);
      }

      setSize(newSize);
      setPosition(newPosition);
    }
  }, [isDragging, isResizing, resizeHandle, dragOffset, size, position]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      // Convert screen coordinates to relative coordinates
      // For now, we'll use screen coordinates directly
      onConfirm({
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      });
    }
  }, [position, size, onConfirm]);

  // Handle ESC key to cancel
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Listen for confirm event from outside (e.g., from HorizontalEditorBar button)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleConfirmEvent = () => {
      handleConfirm();
    };
    
    window.addEventListener('confirm-crop-area', handleConfirmEvent);
    return () => {
      window.removeEventListener('confirm-crop-area', handleConfirmEvent);
    };
  }, [isOpen, handleConfirm]);

  if (!isOpen) return null;

  // Convert screen coordinates to window-relative coordinates for positioning
  const getWindowRelativePosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return {
      x: position.x - window.screenX,
      y: position.y - window.screenY,
    };
  };

  const windowPos = getWindowRelativePosition();

  return (
    <div
      ref={containerRef}
      className="fixed z-[99999]"
      style={{
        left: `${windowPos.x}px`,
        top: `${windowPos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        pointerEvents: 'auto',
        // Ensure it can be positioned outside window bounds
        position: 'fixed',
      }}
    >
      {/* Crop area border - make entire area draggable */}
      <div
        className="absolute inset-0 border-2 border-blue-500 bg-blue-500/10 backdrop-blur-sm rounded-lg shadow-2xl"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onMouseDown={handleDragStart}
      >
        {/* Header with controls */}
        <div className="absolute -top-10 left-0 right-0 flex items-center justify-between px-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg shadow-lg text-xs font-medium">
            {Math.round(size.width)} × {Math.round(size.height)}px
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleConfirm}
              className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-colors"
              title="Confirm selection"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resize handles */}
        {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((handle) => (
          <div
            key={handle}
            className={`resize-handle absolute bg-blue-500 border-2 border-white rounded-full shadow-lg ${
              handle === 'nw' || handle === 'se' ? 'cursor-nwse-resize' :
              handle === 'ne' || handle === 'sw' ? 'cursor-nesw-resize' :
              handle === 'n' || handle === 's' ? 'cursor-ns-resize' :
              'cursor-ew-resize'
            }`}
            style={{
              width: '12px',
              height: '12px',
              left: handle.includes('w') ? '-6px' : handle.includes('e') ? '100%' : '50%',
              top: handle.includes('n') ? '-6px' : handle.includes('s') ? '100%' : '50%',
              transform: 'translate(-50%, -50%)',
            }}
            onMouseDown={(e) => handleResizeStart(e, handle as any)}
          />
        ))}

        {/* Corner indicators */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500" />
      </div>
    </div>
  );
}

