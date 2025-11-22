'use client';

import { useCallback, useRef, useEffect, useState, memo } from 'react';
import { RotateCw, RotateCcw } from 'lucide-react';

interface RotateHandleProps {
  nodeId: string;
  rotation: number;
  onRotate: (nodeId: string, rotation: number) => void;
}

function RotateHandle({ nodeId, rotation, onRotate }: RotateHandleProps) {
  const startPosRef = useRef<{ x: number; y: number; startAngle: number; startRotation: number; centerX: number; centerY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Keyboard shortcut: R to reset rotation to 0, Ctrl+0 to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // R key to reset rotation (when node is selected)
      if (e.key === 'r' || e.key === 'R') {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          onRotate(nodeId, 0);
        }
      }
      
      // Ctrl+0 or Cmd+0 to reset rotation
      if ((e.ctrlKey || e.metaKey) && e.key === '0' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onRotate(nodeId, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodeId, onRotate]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      setIsDragging(true);

      if (!containerRef.current) return;

      // Find the actual node element - it's the parent motion.div that has the transform
      // Then find the inner div that contains the actual node content
      const container = containerRef.current.parentElement;
      if (!container) return;

      // Get the inner div that has the actual node dimensions
      const nodeElement = container.querySelector('div[style*="width"]') as HTMLElement;
      const targetElement = nodeElement || container;
      
      const rect = targetElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        startAngle,
        startRotation: rotation,
        centerX,
        centerY,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startPosRef.current) return;
        
        // Prevent default to stop any drag behavior
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        // Use the stored center coordinates to calculate rotation around the center point
        const currentAngle = Math.atan2(
          moveEvent.clientY - startPosRef.current.centerY,
          moveEvent.clientX - startPosRef.current.centerX
        );
        const angleDelta = currentAngle - startPosRef.current.startAngle;
        const rotationDegrees = (angleDelta * 180) / Math.PI;
        const newRotation = (startPosRef.current.startRotation + rotationDegrees + 360) % 360;

        onRotate(nodeId, newRotation);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        startPosRef.current = null;
        setIsDragging(false);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [nodeId, rotation, onRotate]
  );

  const handleResetClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onRotate(nodeId, 0);
    },
    [nodeId, onRotate]
  );

  // Position the rotate handle above the node
  const handleOffset = 40;
  
  // Normalize rotation to 0-360 range
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  
  return (
    <div
      ref={containerRef}
      className="absolute z-50 flex flex-col items-center gap-1"
      style={{
        top: `-${handleOffset}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
        width: 'auto',
        height: 'auto',
        position: 'absolute',
      }}
    >
      {/* Reset button - only show if rotation is not 0 */}
      {normalizedRotation !== 0 && (
        <button
          onClick={handleResetClick}
          className="w-6 h-6 bg-gray-700 hover:bg-gray-800 border border-white rounded-full shadow-lg flex items-center justify-center transition-colors opacity-80 hover:opacity-100 cursor-pointer"
          title="Reset rotation to 0° (R key)"
        >
          <RotateCcw className="w-3 h-3 text-white" />
        </button>
      )}
      
      {/* Rotate handle with degree display */}
      <div
        onMouseDown={handleMouseDown}
        onDragStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }}
        draggable={false}
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <div className={`w-8 h-8 bg-blue-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors ${isDragging ? 'ring-2 ring-blue-300' : ''}`}>
          <RotateCw className="w-4 h-4 text-white" />
        </div>
        
        {/* Degree display */}
        {(isDragging || normalizedRotation !== 0) && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10">
            {Math.round(normalizedRotation)}°
          </div>
        )}
      </div>
    </div>
  );
}

const MemoizedRotateHandle = memo(RotateHandle);
export default MemoizedRotateHandle;

