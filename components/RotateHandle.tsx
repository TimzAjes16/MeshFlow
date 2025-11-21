'use client';

import { useCallback, useRef } from 'react';
import { RotateCw } from 'lucide-react';

interface RotateHandleProps {
  nodeId: string;
  rotation: number;
  onRotate: (nodeId: string, rotation: number) => void;
}

export default function RotateHandle({ nodeId, rotation, onRotate }: RotateHandleProps) {
  const startPosRef = useRef<{ x: number; y: number; startAngle: number; startRotation: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (!containerRef.current) return;

      const container = containerRef.current.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        startAngle,
        startRotation: rotation,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!startPosRef.current || !container) return;

        const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        const angleDelta = currentAngle - startPosRef.current.startAngle;
        const rotationDegrees = (angleDelta * 180) / Math.PI;
        const newRotation = (startPosRef.current.startRotation + rotationDegrees + 360) % 360;

        onRotate(nodeId, newRotation);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        startPosRef.current = null;
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [nodeId, rotation, onRotate]
  );

  // Position the rotate handle above the node
  const handleOffset = 40;
  
  return (
    <div
      ref={containerRef}
      className="absolute left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing z-50"
      style={{
        top: `-${handleOffset}px`,
        transform: `translateX(-50%)`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="w-8 h-8 bg-blue-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
        <RotateCw className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

