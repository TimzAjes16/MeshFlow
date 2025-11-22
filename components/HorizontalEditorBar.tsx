'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Undo2, Redo2, Palette, Minus, Plus } from 'lucide-react';

interface HorizontalEditorBarProps {
  selectedNodeId?: string | null;
  // Editing options will be added later
}

const MARGIN_BOTTOM = 48; // Margin from bottom edge

const HorizontalEditorBar = ({ selectedNodeId }: HorizontalEditorBarProps) => {
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth / 2, y: window.innerHeight - MARGIN_BOTTOM };
    }
    return { x: 0, y: MARGIN_BOTTOM };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // Calculate initial position - bottom center, with offset from edges
  const getOriginalPosition = useCallback((): { x: number; y: number } => {
    if (typeof window === 'undefined') {
      return { x: 0, y: MARGIN_BOTTOM };
    }
    
    // Position centered horizontally on window, with margin from bottom
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight - MARGIN_BOTTOM,
    };
  }, []);

  // Initialize position
  useEffect(() => {
    const timer = setTimeout(() => {
      setPosition(getOriginalPosition());
    }, 100);
    return () => clearTimeout(timer);
  }, [getOriginalPosition]);

  // Reset position when selection changes
  useEffect(() => {
    if (selectedNodeId) {
      const original = getOriginalPosition();
      const threshold = 50;
      if (
        Math.abs(position.x - original.x) < threshold &&
        Math.abs(position.y - original.y) < threshold
      ) {
        setPosition(getOriginalPosition());
      }
    }
  }, [selectedNodeId, position, getOriginalPosition]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
      });
    }
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !barRef.current) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    const rect = barRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width / 2 - 24;
    const minX = rect.width / 2 + 24;
    const maxY = window.innerHeight - rect.height / 2 - MARGIN_BOTTOM;
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

  // Listen for brush tool activation
  useEffect(() => {
    const handleToggleDrawing = (event: CustomEvent) => {
      setIsBrushActive(event.detail.enabled);
    };

    window.addEventListener('toggle-drawing-mode', handleToggleDrawing as EventListener);
    return () => {
      window.removeEventListener('toggle-drawing-mode', handleToggleDrawing as EventListener);
    };
  }, []);

  // Listen for drawing settings changes
  useEffect(() => {
    if (isBrushActive) {
      window.dispatchEvent(new CustomEvent('update-drawing-settings', {
        detail: { color: brushColor, strokeWidth: brushSize }
      }));
    }
  }, [brushColor, brushSize, isBrushActive]);

  // Handle undo
  const handleUndo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('drawing-undo'));
  }, []);

  // Handle redo
  const handleRedo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('drawing-redo'));
  }, []);

  // Handle color change
  const handleColorChange = useCallback((color: string) => {
    setBrushColor(color);
    setShowColorPicker(false);
  }, []);

  // Handle brush size change
  const handleSizeChange = useCallback((delta: number) => {
    setBrushSize((prev) => Math.max(1, Math.min(20, prev + delta)));
  }, []);

  // Predefined colors
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ];

  // Only show when a node is selected OR brush tool is active
  if (!selectedNodeId && !isBrushActive) {
    return null;
  }

  return (
    <div
      ref={barRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        bottom: `${typeof window !== 'undefined' ? window.innerHeight - position.y : MARGIN_BOTTOM}px`,
        transform: 'translate(-50%, 0)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Glassmorphic horizontal editor bar */}
      <div
        className="group relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/20 px-4 py-3 flex items-center gap-3 transition-all duration-200 hover:shadow-3xl hover:shadow-black/15"
        onMouseDown={handleDragStart}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {/* Drag handle - subtle dots */}
        <div className="flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors opacity-40 group-hover:opacity-100">
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
            <div className="w-1 h-1 rounded-full bg-current" />
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

        {/* Editing options will go here */}
        <div className="flex items-center gap-2 min-h-[32px] min-w-[200px] justify-center">
          {/* Brush Tool Controls - Only show when brush is active */}
          {isBrushActive && (
            <>
              {/* Undo/Redo */}
              <button
                onClick={handleUndo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/undo"
                title="Undo"
              >
                <Undo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/undo:text-gray-800 dark:group-hover/undo:text-gray-200 transition-colors" />
              </button>
              <button
                onClick={handleRedo}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/redo"
                title="Redo"
              >
                <Redo2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/redo:text-gray-800 dark:group-hover/redo:text-gray-200 transition-colors" />
              </button>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Color Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/color"
                  title="Color"
                >
                  <Palette className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/color:text-gray-800 dark:group-hover/color:text-gray-200 transition-colors" />
                </button>
                
                {/* Color Picker Popup */}
                {showColorPicker && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50">
                    <div className="grid grid-cols-5 gap-2 w-[200px]">
                      {colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleColorChange(color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            brushColor === color
                              ? 'border-gray-800 dark:border-gray-200 ring-2 ring-blue-500/50'
                              : 'border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    {/* Custom Color Input */}
                    <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                      <input
                        type="color"
                        value={brushColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="w-full h-8 rounded cursor-pointer"
                        title="Custom color"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Current Color Display */}
              <div
                className="w-6 h-6 rounded border border-gray-300/50 dark:border-gray-600/50"
                style={{ backgroundColor: brushColor }}
                title={`Color: ${brushColor}`}
              />

              {/* Brush Size Control */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <button
                  onClick={() => handleSizeChange(-1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Decrease size"
                >
                  <Minus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[20px] text-center">
                  {brushSize}px
                </span>
                <button
                  onClick={() => handleSizeChange(1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Increase size"
                >
                  <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </>
          )}

          {/* Node Editing Options - Only show when node is selected and brush is not active */}
          {selectedNodeId && !isBrushActive && (
            <div className="w-2 h-2 rounded-full bg-gray-300/50 dark:bg-gray-600/50" />
          )}
        </div>

        {/* Subtle glow effect */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-blue-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"
          style={{ transform: 'scale(1.1)' }}
        />
      </div>
    </div>
  );
};

export default HorizontalEditorBar;
