'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Undo2, Redo2, Palette, Minus, Plus, Eraser, CircleDot, Trash2, Video, RefreshCw, Crop, MousePointerClick, MousePointer2, X } from 'lucide-react';
import FloatingCropArea from './FloatingCropArea';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import type { Node } from '@/types/Node';

interface HorizontalEditorBarProps {
  selectedNodeId?: string | null;
  // Editing options will be added later
}

const MARGIN_BOTTOM = 48; // Margin from bottom edge

const HorizontalEditorBar = ({ selectedNodeId }: HorizontalEditorBarProps) => {
  const [isBrushActive, setIsBrushActive] = useState(false);
  const [isEraserActive, setIsEraserActive] = useState(false);
  const [isLiveCaptureActive, setIsLiveCaptureActive] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [eraserType, setEraserType] = useState<'partial' | 'full'>('partial');
  const [eraserSize, setEraserSize] = useState(10);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEraserTypeMenu, setShowEraserTypeMenu] = useState(false);
  const [showFloatingCropArea, setShowFloatingCropArea] = useState(false);
  
  const { nodes, updateNode: updateWorkspaceNode } = useWorkspaceStore();
  const { selectNode } = useCanvasStore();
  
  // Get selected node if available
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  
  // Check if selected node is a live capture node
  const isLiveCaptureNode = selectedNode && (
    (typeof selectedNode.content === 'object' && selectedNode.content?.type === 'live-capture') ||
    selectedNode.tags?.includes('live-capture')
  );
  
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

  // Reset position when selection changes - only run when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      const original = getOriginalPosition();
      setPosition((currentPosition) => {
        const threshold = 50;
        // Only reset if close to original position
        if (
          Math.abs(currentPosition.x - original.x) < threshold &&
          Math.abs(currentPosition.y - original.y) < threshold
        ) {
          return original;
        }
        return currentPosition;
      });
    }
  }, [selectedNodeId, getOriginalPosition]);

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
      setPosition((currentPosition) => {
        const threshold = 50;
        // Only reset if close to original position
        if (
          Math.abs(currentPosition.x - original.x) < threshold &&
          Math.abs(currentPosition.y - original.y) < threshold
        ) {
          return original;
        }
        return currentPosition;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getOriginalPosition]);

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

  // Listen for eraser tool activation
  useEffect(() => {
    const handleToggleEraser = (event: CustomEvent) => {
      setIsEraserActive(event.detail.enabled);
    };

    window.addEventListener('toggle-eraser-mode', handleToggleEraser as EventListener);
    return () => {
      window.removeEventListener('toggle-eraser-mode', handleToggleEraser as EventListener);
    };
  }, []);

  // Listen for live capture tool activation (kept for potential future use, but Capture button doesn't depend on it)
  useEffect(() => {
    const handleToggleLiveCapture = (event: CustomEvent) => {
      setIsLiveCaptureActive(event.detail.enabled);
    };

    window.addEventListener('toggle-live-capture-mode', handleToggleLiveCapture as EventListener);
    return () => {
      window.removeEventListener('toggle-live-capture-mode', handleToggleLiveCapture as EventListener);
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

  // Listen for eraser settings changes
  useEffect(() => {
    if (isEraserActive) {
      window.dispatchEvent(new CustomEvent('update-eraser-settings', {
        detail: { eraserType, eraserSize }
      }));
    }
  }, [eraserType, eraserSize, isEraserActive]);

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

  // Handle eraser size change
  const handleEraserSizeChange = useCallback((delta: number) => {
    setEraserSize((prev) => Math.max(1, Math.min(50, prev + delta)));
  }, []);

  // Handle eraser type change
  const handleEraserTypeChange = useCallback((type: 'partial' | 'full') => {
    setEraserType(type);
    setShowEraserTypeMenu(false);
  }, []);

  // Predefined colors
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ];

  // Handle Update Source - re-open capture modal for existing node
  const handleUpdateSource = useCallback(() => {
    if (!selectedNodeId || !isLiveCaptureNode) return;
    window.dispatchEvent(new CustomEvent('open-live-capture-modal', {
      detail: { nodeId: selectedNodeId }
    }));
  }, [selectedNodeId, isLiveCaptureNode]);

  // Handle Recrop/Edit Viewport - open crop editor
  const handleRecrop = useCallback(() => {
    if (!selectedNodeId || !isLiveCaptureNode) return;
    window.dispatchEvent(new CustomEvent('recrop-live-capture', {
      detail: { nodeId: selectedNodeId }
    }));
  }, [selectedNodeId, isLiveCaptureNode]);

  // Handle Interaction Toggle - enable/disable interaction with captured content
  const handleToggleInteraction = useCallback(async () => {
    if (!selectedNodeId || !isLiveCaptureNode || !selectedNode) return;
    
    const currentContent = typeof selectedNode.content === 'object' && selectedNode.content?.type === 'live-capture'
      ? selectedNode.content
      : { type: 'live-capture', imageUrl: '', cropArea: { x: 0, y: 0, width: 0, height: 0 }, captureHistory: [] };
    
    const newInteractive = !(currentContent.interactive ?? false);
    
    const updatedContent = {
      ...currentContent,
      type: 'live-capture',
      interactive: newInteractive,
    };
    
    // Update node content
    updateWorkspaceNode(selectedNodeId, {
      content: updatedContent,
    });
    
    // Persist to API
    try {
      const response = await fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: selectedNodeId,
          content: updatedContent,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.node) {
          updateWorkspaceNode(selectedNodeId, data.node);
        }
      }
    } catch (error) {
      console.error('Error toggling interaction:', error);
    }
  }, [selectedNodeId, isLiveCaptureNode, selectedNode, updateWorkspaceNode]);

  // Get interaction state
  const isInteractive = selectedNode && isLiveCaptureNode && 
    typeof selectedNode.content === 'object' && 
    selectedNode.content?.type === 'live-capture' &&
    (selectedNode.content.interactive ?? false);

  // Show widget when any tool is active (brush, eraser, or live capture)
  // Also show when a node is selected (for node editing options)
  const shouldShow = isBrushActive || isEraserActive || isLiveCaptureActive || selectedNodeId;
  
  if (!shouldShow) {
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
          {/* Eraser Tool Controls - Only show when eraser is active */}
          {isEraserActive && (
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

              {/* Erase Type Selector */}
              <div className="relative eraser-type-menu">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEraserTypeMenu(!showEraserTypeMenu);
                  }}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/type flex items-center gap-1"
                  title={`Erase type: ${eraserType === 'partial' ? 'Partial' : 'Full'}`}
                >
                  {eraserType === 'partial' ? (
                    <CircleDot className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/type:text-gray-800 dark:group-hover/type:text-gray-200 transition-colors" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/type:text-gray-800 dark:group-hover/type:text-gray-200 transition-colors" />
                  )}
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {eraserType === 'partial' ? 'Partial' : 'Full'}
                  </span>
                </button>
                
                {/* Erase Type Menu */}
                {showEraserTypeMenu && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 backdrop-blur-xl bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-xl z-50 min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEraserTypeChange('partial');
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        eraserType === 'partial'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <CircleDot className="w-4 h-4" />
                      <span className="text-sm">Partial</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEraserTypeChange('full');
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all mt-1 ${
                        eraserType === 'full'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Full</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />

              {/* Eraser Size Control */}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg">
                <button
                  onClick={() => handleEraserSizeChange(-1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Decrease eraser size"
                >
                  <Minus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[24px] text-center">
                  {eraserSize}px
                </span>
                <button
                  onClick={() => handleEraserSizeChange(1)}
                  className="p-0.5 hover:bg-gray-200/60 dark:hover:bg-gray-600/60 rounded transition-all"
                  title="Increase eraser size"
                >
                  <Plus className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </>
          )}

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

          {/* Live Capture Controls - Show when live capture node is selected */}
          {isLiveCaptureNode && (
            <>
              {/* Divider if there are other controls before */}
              {(isBrushActive || isEraserActive) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}

              {/* Update Source Button */}
              <button
                onClick={handleUpdateSource}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/update flex items-center gap-1.5"
                title="Update Source - Change the captured source"
              >
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/update:text-purple-600 dark:group-hover/update:text-purple-400 transition-colors" />
                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover/update:text-purple-600 dark:group-hover/update:text-purple-400 transition-colors">
                  Update Source
                </span>
              </button>

              {/* Recrop/Edit Viewport Button */}
              <button
                onClick={handleRecrop}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/recrop flex items-center gap-1.5"
                title="Recrop - Edit the viewport/crop area"
              >
                <Crop className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/recrop:text-purple-600 dark:group-hover/recrop:text-purple-400 transition-colors" />
                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover/recrop:text-purple-600 dark:group-hover/recrop:text-purple-400 transition-colors">
                  Recrop
                </span>
              </button>

              {/* Interaction Toggle Button */}
              <button
                onClick={handleToggleInteraction}
                className={`p-1.5 rounded-lg transition-all duration-150 group/interact flex items-center gap-1.5 ${
                  isInteractive
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60'
                }`}
                title={isInteractive ? 'Disable Interaction - Make captured content non-interactive' : 'Enable Interaction - Allow interaction with captured content'}
              >
                {isInteractive ? (
                  <MousePointerClick className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                ) : (
                  <MousePointer2 className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/interact:text-purple-600 dark:group-hover/interact:text-purple-400 transition-colors" />
                )}
                <span className={`text-xs transition-colors ${
                  isInteractive
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 group-hover/interact:text-purple-600 dark:group-hover/interact:text-purple-400'
                }`}>
                  {isInteractive ? 'Interactive' : 'Non-Interactive'}
                </span>
              </button>
            </>
          )}

          {/* Live Capture Tool Controls - Show when live capture tool is active */}
          {isLiveCaptureActive && !isLiveCaptureNode && (
            <>
              {/* Divider if there are other controls before */}
              {(isBrushActive || isEraserActive) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              
              {/* Area Highlight Button - Shows floating crop area overlay or confirms selection */}
              <button
                onClick={() => {
                  if (showFloatingCropArea) {
                    // If crop area is already visible, confirm the selection
                    // This is handled by triggering the confirm handler
                    const event = new CustomEvent('confirm-crop-area');
                    window.dispatchEvent(event);
                  } else {
                    // Otherwise, show the crop area
                    setShowFloatingCropArea(true);
                  }
                }}
                className={`p-1.5 rounded-lg transition-all duration-150 group/area flex items-center gap-1.5 ${
                  showFloatingCropArea
                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                    : 'hover:bg-gray-100/60 dark:hover:bg-gray-700/60 text-gray-600 dark:text-gray-400'
                }`}
                title={showFloatingCropArea ? 'Confirm selection (or click checkmark on crop area)' : 'Area Highlight - Select an area to capture'}
              >
                <Crop className="w-4 h-4 group-hover/area:text-purple-600 dark:group-hover/area:text-purple-400 transition-colors" />
                <span className={`text-xs transition-colors ${
                  showFloatingCropArea
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-600 dark:text-gray-400 group-hover/area:text-purple-600 dark:group-hover/area:text-purple-400'
                }`}>
                  {showFloatingCropArea ? 'Confirm Area' : 'Area Highlight'}
                </span>
              </button>
              
              {/* Cancel button - Show when crop area is visible - also deselects live capture tool */}
              {showFloatingCropArea && (
                <button
                  onClick={() => {
                    setShowFloatingCropArea(false);
                    // Deactivate live capture tool
                    setIsLiveCaptureActive(false);
                    window.dispatchEvent(new CustomEvent('toggle-live-capture-mode', { 
                      detail: { enabled: false } 
                    }));
                  }}
                  className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/cancel flex items-center gap-1.5"
                  title="Cancel area selection and deselect live capture tool (or press ESC)"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/cancel:text-red-600 dark:group-hover/cancel:text-red-400 transition-colors" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 group-hover/cancel:text-red-600 dark:group-hover/cancel:text-red-400 transition-colors">
                    Cancel
                  </span>
                </button>
              )}
            </>
          )}

          {/* Capture Button - Show when no tools active and no live capture node selected */}
          {(!isBrushActive && !isEraserActive && !isLiveCaptureActive && !isLiveCaptureNode) && (
            <>
              {(selectedNodeId && !isBrushActive && !isLiveCaptureNode) && (
                <div className="h-6 w-px bg-gradient-to-b from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent" />
              )}
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-live-capture-modal', {
                    detail: { nodeId: null }
                  }));
                }}
                className="p-1.5 hover:bg-gray-100/60 dark:hover:bg-gray-700/60 rounded-lg transition-all duration-150 group/capture flex items-center gap-1.5"
                title="Capture - Create a new live capture"
              >
                <Video className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/capture:text-purple-600 dark:group-hover/capture:text-purple-400 transition-colors" />
                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover/capture:text-purple-600 dark:group-hover/capture:text-purple-400 transition-colors">
                  Capture
                </span>
              </button>
            </>
          )}

          {/* Node Editing Options - Only show when node is selected and no other tools/controls are active */}
          {selectedNodeId && !isBrushActive && !isEraserActive && !isLiveCaptureNode && (
            <div className="w-2 h-2 rounded-full bg-gray-300/50 dark:bg-gray-600/50" />
          )}
        </div>

        {/* Subtle glow effect */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-blue-500/0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none -z-10 blur-xl"
          style={{ transform: 'scale(1.1)' }}
        />
      </div>

      {/* Floating Crop Area Overlay - Can be positioned outside app bounds */}
      <FloatingCropArea
        isOpen={showFloatingCropArea}
        onClose={() => setShowFloatingCropArea(false)}
        onConfirm={async (area) => {
          setShowFloatingCropArea(false);
          
          // Start screen capture for the entire screen (we'll crop to area in the node)
          try {
            const { getScreenCaptureStream, requestScreenRecordingPermission, checkScreenRecordingPermission } = await import('@/lib/electronUtils');
            console.log('[HorizontalEditorBar] Starting screen capture for area:', area);
            
            // Check and request permissions before attempting capture
            const permissionStatus = await checkScreenRecordingPermission();
            if (permissionStatus.granted === false || permissionStatus.granted === null) {
              console.log('[HorizontalEditorBar] Requesting screen recording permission...');
              const permissionResult = await requestScreenRecordingPermission();
              
              if (!permissionResult.granted) {
                const errorMessage = permissionResult.message || 'Screen recording permission is required to capture the screen.';
                alert(errorMessage);
                return;
              }
              
              console.log('[HorizontalEditorBar] Screen recording permission granted:', permissionResult.message);
            }
            
            // Get screen capture stream (permissions are also checked inside this function)
            const stream = await getScreenCaptureStream({ requestPermissions: true, includeAudio: false });
            
            // Verify stream has video tracks
            const tracks = stream.getVideoTracks();
            if (tracks.length === 0) {
              throw new Error('Screen capture stream has no video tracks');
            }
            
            console.log('[HorizontalEditorBar] Screen capture stream obtained:', {
              streamId: stream.id,
              trackCount: tracks.length,
              readyStates: tracks.map(t => t.readyState)
            });
            
            // Store stream globally for immediate access
            (window as any).currentScreenStream = stream;
            
            // Dispatch event to create live capture node with the area and stream
            // The area coordinates are in screen space (absolute screen coordinates)
            window.dispatchEvent(new CustomEvent('create-live-capture-from-area', {
              detail: { 
                area: {
                  x: area.x,
                  y: area.y,
                  width: area.width,
                  height: area.height,
                },
                stream 
              }
            }));
          } catch (error: any) {
            console.error('[HorizontalEditorBar] Error starting screen capture:', error);
            alert(`Failed to start screen capture: ${error.message || 'Unknown error'}. Please try again.`);
          }
        }}
        defaultWidth={779}
        defaultHeight={513}
      />
    </div>
  );
};

export default HorizontalEditorBar;
