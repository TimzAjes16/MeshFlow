'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GripVertical, Paintbrush } from 'lucide-react';

interface VerticalToolbarProps {
  // Tools will be added later
}

const MARGIN_LEFT = 48; // Margin from left edge

const VerticalToolbar = ({}: VerticalToolbarProps) => {
  const [isBrushActive, setIsBrushActive] = useState(false);
  
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { x: MARGIN_LEFT, y: window.innerHeight / 2 };
    }
    return { x: MARGIN_LEFT, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Calculate initial position - left side, centered vertically, with offset from edges
  const getOriginalPosition = useCallback((): { x: number; y: number } => {
    if (typeof window === 'undefined') {
      return { x: MARGIN_LEFT, y: 0 };
    }
    
    // Position with margin from left edge of window, centered vertically
    return {
      x: MARGIN_LEFT,
      y: window.innerHeight / 2,
    };
  }, []);

  // Initialize position
  useEffect(() => {
    const timer = setTimeout(() => {
      setPosition(getOriginalPosition());
    }, 100);
    return () => clearTimeout(timer);
  }, [getOriginalPosition]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    }
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !toolbarRef.current) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    const rect = toolbarRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width / 2 - 24;
    const minX = rect.width / 2 + MARGIN_LEFT;
    const maxY = window.innerHeight - rect.height / 2 - 24;
    const minY = rect.height / 2 + 24;
    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Update position on resize
  useEffect(() => {
    const handleResize = () => {
      const original = getOriginalPosition();
      const threshold = 50;
      if (
        Math.abs(position.x - original.x) < threshold &&
        Math.abs(position.y - original.y) < threshold
      ) {
        setPosition(getOriginalPosition());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, getOriginalPosition]);

  // Handle brush toggle
  const handleBrushToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isBrushActive;
    setIsBrushActive(newState);
    
    // Dispatch event to enable/disable drawing mode
    window.dispatchEvent(new CustomEvent('toggle-drawing-mode', { 
      detail: { enabled: newState } 
    }));
    
    // Update cursor
    if (newState) {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = '';
    }
  }, [isBrushActive]);

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Glassmorphic vertical toolbar */}
      <div
        className="group relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/20 px-3 py-4 flex flex-col items-center gap-3 transition-all duration-200 hover:shadow-3xl hover:shadow-black/15"
        onMouseDown={handleDragStart}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {/* Drag handle - subtle dots */}
        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors opacity-40 group-hover:opacity-100 pb-1">
          <div className="flex flex-col gap-1">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

        {/* Tool buttons will go here */}
        <div className="flex flex-col gap-2 min-h-[60px] min-w-[48px] justify-center items-center">
          {/* Brush Tool */}
          <button
            onClick={handleBrushToggle}
            className={`p-2 rounded-lg transition-all duration-150 ${
              isBrushActive
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
            }`}
            title={isBrushActive ? 'Disable brush tool' : 'Enable brush tool'}
          >
            <Paintbrush className="w-5 h-5" />
          </button>
        </div>

        {/* Subtle glow effect */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-500/0 via-purple-500/0 to-blue-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"
          style={{ transform: 'scale(1.1)' }}
        />
      </div>
    </div>
  );
};

export default VerticalToolbar;
