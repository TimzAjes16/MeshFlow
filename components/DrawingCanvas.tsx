'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useReactFlow } from 'reactflow';

interface DrawingCanvasProps {
  workspaceId: string;
}

interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
}

const DrawingCanvas = ({ workspaceId }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reactFlowInstance = useReactFlow();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [history, setHistory] = useState<DrawingPath[][]>([]); // History for undo
  const [historyIndex, setHistoryIndex] = useState(-1); // Current position in history
  const [drawingMode, setDrawingMode] = useState(false);
  const { viewport } = useCanvasStore();
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Listen for drawing mode toggle
  useEffect(() => {
    const handleToggleDrawing = (event: CustomEvent) => {
      setDrawingMode(event.detail.enabled);
      if (!event.detail.enabled) {
        setIsDrawing(false);
        setCurrentPath([]);
      }
    };

    window.addEventListener('toggle-drawing-mode', handleToggleDrawing as EventListener);
    return () => {
      window.removeEventListener('toggle-drawing-mode', handleToggleDrawing as EventListener);
    };
  }, []);

  // Listen for drawing settings updates
  useEffect(() => {
    const handleUpdateSettings = (event: CustomEvent) => {
      if (event.detail.color) setColor(event.detail.color);
      if (event.detail.strokeWidth) setStrokeWidth(event.detail.strokeWidth);
    };

    window.addEventListener('update-drawing-settings', handleUpdateSettings as EventListener);
    return () => {
      window.removeEventListener('update-drawing-settings', handleUpdateSettings as EventListener);
    };
  }, []);

  // Listen for undo/redo events
  useEffect(() => {
    const handleUndo = () => {
      if (historyIndex > 0 && history.length > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setPaths([...history[newIndex]]);
      }
    };

    const handleRedo = () => {
      if (historyIndex < history.length - 1 && history.length > 0) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setPaths([...history[newIndex]]);
      }
    };

    window.addEventListener('drawing-undo', handleUndo);
    window.addEventListener('drawing-redo', handleRedo);
    return () => {
      window.removeEventListener('drawing-undo', handleUndo);
      window.removeEventListener('drawing-redo', handleRedo);
    };
  }, [history, historyIndex]);

  // Listen for undo/redo events
  useEffect(() => {
    const handleUndo = () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setPaths([...history[newIndex]]);
      }
    };

    const handleRedo = () => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setPaths([...history[newIndex]]);
      }
    };

    window.addEventListener('drawing-undo', handleUndo);
    window.addEventListener('drawing-redo', handleRedo);
    return () => {
      window.removeEventListener('drawing-undo', handleUndo);
      window.removeEventListener('drawing-redo', handleRedo);
    };
  }, [history, historyIndex]);

  // Get canvas coordinates from screen coordinates using React Flow's transform
  const screenToCanvas = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    if (!reactFlowInstance) return { x: 0, y: 0 };
    
    // Get the React Flow pane element to calculate relative position
    const reactFlowPane = document.querySelector('.react-flow__pane') as HTMLElement;
    if (!reactFlowPane) return { x: 0, y: 0 };
    
    const rect = reactFlowPane.getBoundingClientRect();
    // Use React Flow's screenToFlowPosition method to convert screen coordinates to flow coordinates
    const flowPoint = reactFlowInstance.screenToFlowPosition({
      x: screenX - rect.left,
      y: screenY - rect.top,
    });
    return { x: flowPoint.x, y: flowPoint.y };
  }, [reactFlowInstance]);

  // Draw all paths on canvas
  const drawPaths = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set canvas size to match container
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      if (!reactFlowInstance) return;

      // Redraw all paths using React Flow's viewport transform
      paths.forEach((path) => {
        if (path.points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.strokeWidth * (viewport.zoom || 1); // Scale stroke width with zoom
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        path.points.forEach((point, index) => {
          // Convert flow coordinates to screen coordinates using viewport transform
          const currentViewport = reactFlowInstance.getViewport();
          // Calculate screen position: (flowX * zoom) + viewport.x + paneOffset
          const screenX = (point.x * currentViewport.zoom) + currentViewport.x;
          const screenY = (point.y * currentViewport.zoom) + currentViewport.y;
          const canvasRect = canvas.getBoundingClientRect();
          const relX = screenX - canvasRect.left;
          const relY = screenY - canvasRect.top;

          if (index === 0) {
            ctx.moveTo(relX, relY);
          } else {
            ctx.lineTo(relX, relY);
          }
        });

        ctx.stroke();
      });

      // Draw current path being drawn
      if (currentPath.length > 1 && isDrawing) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth * (viewport.zoom || 1); // Scale stroke width with zoom
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        currentPath.forEach((point, index) => {
          // Convert flow coordinates to screen coordinates using viewport transform
          const currentViewport = reactFlowInstance.getViewport();
          // Calculate screen position: (flowX * zoom) + viewport.x
          const screenX = (point.x * currentViewport.zoom) + currentViewport.x;
          const screenY = (point.y * currentViewport.zoom) + currentViewport.y;
          const canvasRect = canvas.getBoundingClientRect();
          const relX = screenX - canvasRect.left;
          const relY = screenY - canvasRect.top;

          if (index === 0) {
            ctx.moveTo(relX, relY);
          } else {
            ctx.lineTo(relX, relY);
          }
        });

        ctx.stroke();
      }
    }, [paths, currentPath, isDrawing, color, strokeWidth, viewport, reactFlowInstance]);

  // Redraw when paths or viewport changes
  useEffect(() => {
    drawPaths();
  }, [drawPaths]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!drawingMode) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasPoint = screenToCanvas(e.clientX, e.clientY);
    setIsDrawing(true);
    setCurrentPath([canvasPoint]);
  }, [drawingMode, screenToCanvas]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDrawing || !drawingMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasPoint = screenToCanvas(e.clientX, e.clientY);
    setCurrentPath((prev) => [...prev, canvasPoint]);
  }, [isDrawing, drawingMode, screenToCanvas]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    if (currentPath.length > 1) {
      const newPath: DrawingPath = {
        id: `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        points: [...currentPath],
        color,
        strokeWidth,
      };
      
      // Add to paths
      const newPaths = [...paths, newPath];
      setPaths(newPaths);
      
      // Update history - remove any "future" history when new action is performed
      setHistory((prevHistory) => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(newPaths);
        
        // Limit history to 50 actions
        if (newHistory.length > 50) {
          const limited = newHistory.slice(-50);
          setHistoryIndex(limited.length - 1);
          return limited;
        } else {
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        }
      });
    }

    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, currentPath, color, strokeWidth, paths, history, historyIndex]);

  // Set up mouse event listeners
  useEffect(() => {
    if (isDrawing && drawingMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDrawing, drawingMode, handleMouseMove, handleMouseUp]);

  // Track previous viewport to detect changes
  const previousViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);

  // Update canvas size on window resize and viewport changes
  useEffect(() => {
    const handleResize = () => {
      drawPaths();
    };

    window.addEventListener('resize', handleResize);
    
    // Monitor viewport changes to redraw drawings when zooming/panning
    // This ensures drawings stay correctly positioned even when drawing mode is off
    const checkViewportChanges = () => {
      if (!reactFlowInstance || paths.length === 0) return;
      
      try {
        const currentViewport = reactFlowInstance.getViewport();
        const previous = previousViewportRef.current;
        
        // Check if viewport actually changed
        if (
          !previous ||
          previous.x !== currentViewport.x ||
          previous.y !== currentViewport.y ||
          previous.zoom !== currentViewport.zoom
        ) {
          previousViewportRef.current = currentViewport;
          drawPaths();
        }
      } catch (error) {
        // Silently handle errors (e.g., if React Flow isn't ready)
      }
    };
    
    // Check for viewport changes periodically
    const interval = setInterval(checkViewportChanges, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [drawPaths, paths.length, reactFlowInstance]);

  // Always render canvas to show persisted drawings, but only enable interaction when drawing mode is active
  return (
    <canvas
      ref={canvasRef}
      onMouseDown={drawingMode ? handleMouseDown : undefined}
      className="absolute inset-0 w-full h-full z-10"
      style={{
        pointerEvents: drawingMode ? 'auto' : 'none',
        cursor: drawingMode ? (isDrawing ? 'crosshair' : 'crosshair') : 'default',
        touchAction: 'none',
      }}
    />
  );
};

export default DrawingCanvas;
