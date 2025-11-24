'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Paintbrush, Eraser, Type } from 'lucide-react';

interface VerticalToolbarProps {
  // Tools will be added later
}

const MARGIN_LEFT = 80; // Margin from left edge - increased to prevent touching canvas

const VerticalToolbar = ({}: VerticalToolbarProps) => {
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);
  const [isTextToolActive, setIsTextToolActive] = useState(false);
  
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
    const target = e.target as HTMLElement;
    const interactiveSelector = 'button,select,input,textarea,option,[role="menu"],[role="listbox"]';
    if (target.closest(interactiveSelector)) return;
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

    if (newState) {
      setIsEraserActive(false);
      if (isTextToolActive) {
        setIsTextToolActive(false);
        window.dispatchEvent(new CustomEvent('toggle-text-tool', { detail: { enabled: false } }));
      }
      window.dispatchEvent(new CustomEvent('toggle-eraser-mode', { 
        detail: { enabled: false } 
      }));
    }

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

  // Handle eraser toggle
  const handleEraserToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isEraserActive;
    setIsEraserActive(newState);
    
    if (newState) {
      setIsBrushActive(false);
      if (isTextToolActive) {
        setIsTextToolActive(false);
        window.dispatchEvent(new CustomEvent('toggle-text-tool', { detail: { enabled: false } }));
      }
      window.dispatchEvent(new CustomEvent('toggle-drawing-mode', { 
        detail: { enabled: false } 
      }));
    }
    
    // Dispatch event to enable/disable eraser mode
    window.dispatchEvent(new CustomEvent('toggle-eraser-mode', { 
      detail: { enabled: newState } 
    }));
    
    // Update cursor
    if (newState) {
      document.body.style.cursor = 'grab';
    } else {
      document.body.style.cursor = '';
    }
  }, [isEraserActive]);

  const handleTextToolToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isTextToolActive;
    setIsTextToolActive(newState);
    
    window.dispatchEvent(new CustomEvent('toggle-text-tool', { 
      detail: { enabled: newState } 
    }));
    
    if (newState) {
      // Create a new text node via global event (handled elsewhere)
      window.dispatchEvent(new CustomEvent('create-tool-element', { 
        detail: { type: 'text' } 
      }));
      
      // Deactivate other tools
      if (isBrushActive) {
        setIsBrushActive(false);
        window.dispatchEvent(new CustomEvent('toggle-drawing-mode', { detail: { enabled: false } }));
      }
      if (isEraserActive) {
        setIsEraserActive(false);
        window.dispatchEvent(new CustomEvent('toggle-eraser-mode', { detail: { enabled: false } }));
      }
    }
  }, [isTextToolActive, isBrushActive, isEraserActive]);

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
        className="group relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/20 px-2 py-2 flex flex-col items-center gap-1.5 transition-all duration-200 hover:shadow-3xl hover:shadow-black/15 max-h-[85vh] overflow-y-auto overflow-x-hidden pb-4"
        onMouseDown={handleDragStart}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          minWidth: '44px',
          maxWidth: '44px',
        }}
      >
        {/* Drag handle - subtle dots - smaller */}
        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors opacity-40 group-hover:opacity-100 pb-1">
          <div className="flex flex-col gap-0.5">
            <div className="w-0.5 h-0.5 rounded-full bg-current" />
            <div className="w-0.5 h-0.5 rounded-full bg-current" />
            <div className="w-0.5 h-0.5 rounded-full bg-current" />
          </div>
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

        <div className="flex flex-col gap-1.5 w-full">
          {/* Brush Tool */}
          <button
            onClick={handleBrushToggle}
            className={`p-1.5 rounded-xl transition-all duration-150 ${
              isBrushActive
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
            }`}
            title={isBrushActive ? 'Disable brush tool' : 'Enable brush tool'}
          >
            <Paintbrush className="w-4 h-4" />
          </button>

          {/* Eraser Tool */}
          <button
            onClick={handleEraserToggle}
            className={`p-1.5 rounded-xl transition-all duration-150 ${
              isEraserActive
                ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
            }`}
            title={isEraserActive ? 'Disable eraser tool' : 'Enable eraser tool'}
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Text Tool */}
          <button
            onClick={handleTextToolToggle}
            className={`p-1.5 rounded-xl transition-all duration-150 ${
              isTextToolActive
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
            }`}
            title={isTextToolActive ? 'Disable text tool' : 'Enable text tool'}
          >
            <Type className="w-4 h-4" />
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
