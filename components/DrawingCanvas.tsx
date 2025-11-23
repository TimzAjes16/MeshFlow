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
  const [eraserMode, setEraserMode] = useState(false);
  const [eraserType, setEraserType] = useState<'partial' | 'full'>('partial');
  const [eraserSize, setEraserSize] = useState(10);
  const [isErasing, setIsErasing] = useState(false);
  const [currentEraseArea, setCurrentEraseArea] = useState<{ x: number; y: number; radius: number } | null>(null);
  const { viewport } = useCanvasStore();
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Listen for drawing mode toggle
  useEffect(() => {
    handleToggleDrawingRef.current = (event: CustomEvent) => {
      setDrawingMode(event.detail.enabled);
      if (!event.detail.enabled) {
        setIsDrawing(false);
        setCurrentPath([]);
      }
    };

    const handleToggleDrawingWrapper = (event: Event) => {
      if (handleToggleDrawingRef.current) {
        handleToggleDrawingRef.current(event as CustomEvent);
      }
    };

    window.addEventListener('toggle-drawing-mode', handleToggleDrawingWrapper);
    return () => {
      window.removeEventListener('toggle-drawing-mode', handleToggleDrawingWrapper);
    };
  }, []);

  // Listen for eraser mode toggle
  useEffect(() => {
    handleToggleEraserRef.current = (event: CustomEvent) => {
      setEraserMode(event.detail.enabled);
      if (!event.detail.enabled) {
        setIsErasing(false);
        setCurrentEraseArea(null);
      }
    };

    const handleToggleEraserWrapper = (event: Event) => {
      if (handleToggleEraserRef.current) {
        handleToggleEraserRef.current(event as CustomEvent);
      }
    };

    window.addEventListener('toggle-eraser-mode', handleToggleEraserWrapper);
    return () => {
      window.removeEventListener('toggle-eraser-mode', handleToggleEraserWrapper);
    };
  }, []);

  // Listen for eraser settings updates
  useEffect(() => {
    handleUpdateEraserSettingsRef.current = (event: CustomEvent) => {
      if (event.detail.eraserType) setEraserType(event.detail.eraserType);
      if (event.detail.eraserSize) setEraserSize(event.detail.eraserSize);
    };

    const handleUpdateEraserSettingsWrapper = (event: Event) => {
      if (handleUpdateEraserSettingsRef.current) {
        handleUpdateEraserSettingsRef.current(event as CustomEvent);
      }
    };

    window.addEventListener('update-eraser-settings', handleUpdateEraserSettingsWrapper);
    return () => {
      window.removeEventListener('update-eraser-settings', handleUpdateEraserSettingsWrapper);
    };
  }, []);

  // Listen for drawing settings updates
  useEffect(() => {
    handleUpdateSettingsRef.current = (event: CustomEvent) => {
      if (event.detail.color) setColor(event.detail.color);
      if (event.detail.strokeWidth) setStrokeWidth(event.detail.strokeWidth);
    };

    const handleUpdateSettingsWrapper = (event: Event) => {
      if (handleUpdateSettingsRef.current) {
        handleUpdateSettingsRef.current(event as CustomEvent);
      }
    };

    window.addEventListener('update-drawing-settings', handleUpdateSettingsWrapper);
    return () => {
      window.removeEventListener('update-drawing-settings', handleUpdateSettingsWrapper);
    };
  }, []);

  // Use refs to store event handlers to avoid Turbopack evaluation issues
  const handleToggleDrawingRef = useRef<((event: CustomEvent) => void) | null>(null);
  const handleToggleEraserRef = useRef<((event: CustomEvent) => void) | null>(null);
  const handleUpdateEraserSettingsRef = useRef<((event: CustomEvent) => void) | null>(null);
  const handleUpdateSettingsRef = useRef<((event: CustomEvent) => void) | null>(null);
  const handleUndoRef = useRef<(() => void) | null>(null);
  const handleRedoRef = useRef<(() => void) | null>(null);

  // Listen for undo/redo events
  useEffect(() => {
    handleUndoRef.current = () => {
      setHistoryIndex((currentIndex) => {
        setHistory((currentHistory) => {
          if (currentIndex > 0 && currentHistory.length > 0) {
            const newIndex = currentIndex - 1;
            setPaths([...currentHistory[newIndex]]);
            return currentHistory;
          }
          return currentHistory;
        });
        return currentIndex;
      });
    };

    handleRedoRef.current = () => {
      setHistoryIndex((currentIndex) => {
        setHistory((currentHistory) => {
          if (currentIndex < currentHistory.length - 1 && currentHistory.length > 0) {
            const newIndex = currentIndex + 1;
            setPaths([...currentHistory[newIndex]]);
            return currentHistory;
          }
          return currentHistory;
        });
        return currentIndex;
      });
    };

    const handleUndoWrapper = () => {
      if (handleUndoRef.current) {
        handleUndoRef.current();
      }
    };

    const handleRedoWrapper = () => {
      if (handleRedoRef.current) {
        handleRedoRef.current();
      }
    };

    window.addEventListener('drawing-undo', handleUndoWrapper);
    window.addEventListener('drawing-redo', handleRedoWrapper);
    return () => {
      window.removeEventListener('drawing-undo', handleUndoWrapper);
      window.removeEventListener('drawing-redo', handleRedoWrapper);
    };
  }, []); // Empty deps - handlers use functional setState

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

      // Draw eraser area indicator when erasing
      if (currentEraseArea && isErasing && eraserMode) {
        const currentViewport = reactFlowInstance.getViewport();
        const screenX = (currentEraseArea.x * currentViewport.zoom) + currentViewport.x;
        const screenY = (currentEraseArea.y * currentViewport.zoom) + currentViewport.y;
        const canvasRect = canvas.getBoundingClientRect();
        const relX = screenX - canvasRect.left;
        const relY = screenY - canvasRect.top;
        const radius = currentEraseArea.radius * currentViewport.zoom;

        ctx.beginPath();
        ctx.arc(relX, relY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fill();
      }
    }, [paths, currentPath, isDrawing, color, strokeWidth, viewport, reactFlowInstance, currentEraseArea, isErasing, eraserMode]);

  // Redraw when paths or viewport changes
  useEffect(() => {
    drawPaths();
  }, [drawPaths]);

  // Helper function to check if a point is within eraser radius
  const isPointInEraserRange = useCallback((point: { x: number; y: number }, eraseCenter: { x: number; y: number }, radius: number): boolean => {
    const dx = point.x - eraseCenter.x;
    const dy = point.y - eraseCenter.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (eraserMode) {
      // Eraser mode
      e.preventDefault();
      e.stopPropagation();
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasPoint = screenToCanvas(e.clientX, e.clientY);
      setIsErasing(true);
      
      if (eraserType === 'full') {
        // Find and remove paths that intersect with eraser
        const updatedPaths = paths.filter((path) => {
          // Check if any point in the path is within eraser radius
          return !path.points.some(point => isPointInEraserRange(point, canvasPoint, eraserSize));
        });
        
        if (updatedPaths.length !== paths.length) {
          // Paths were removed, update history
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(updatedPaths);
          
          if (newHistory.length > 50) {
            const limited = newHistory.slice(-50);
            setHistoryIndex(limited.length - 1);
            setHistory(limited);
          } else {
            setHistoryIndex(newHistory.length - 1);
            setHistory(newHistory);
          }
          
          setPaths(updatedPaths);
        }
      } else {
        // Partial erase mode - will handle during mouse move
        setCurrentEraseArea({ x: canvasPoint.x, y: canvasPoint.y, radius: eraserSize });
      }
    } else if (drawingMode) {
      // Drawing mode
      e.preventDefault();
      e.stopPropagation();
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasPoint = screenToCanvas(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentPath([canvasPoint]);
    }
  }, [drawingMode, eraserMode, eraserType, eraserSize, paths, history, historyIndex, screenToCanvas, isPointInEraserRange]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isErasing && eraserMode) {
      // Eraser mode
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasPoint = screenToCanvas(e.clientX, e.clientY);
      
      if (eraserType === 'partial') {
        // Partial erase: remove points within eraser radius from all paths
        setCurrentEraseArea({ x: canvasPoint.x, y: canvasPoint.y, radius: eraserSize });
        
        const updatedPaths = paths.map((path) => {
          // Filter out points that are within eraser radius
          const filteredPoints = path.points.filter(
            point => !isPointInEraserRange(point, canvasPoint, eraserSize)
          );
          
          // Only keep path if it has at least 2 points
          if (filteredPoints.length >= 2) {
            return { ...path, points: filteredPoints };
          }
          return null;
        }).filter((path): path is DrawingPath => path !== null);
        
        // Update if paths changed
        if (updatedPaths.length !== paths.length || updatedPaths.some((path, idx) => path.points.length !== paths[idx]?.points.length)) {
          setPaths(updatedPaths);
        }
      } else {
        // Full erase: remove entire paths that intersect with eraser
        const updatedPaths = paths.filter((path) => {
          return !path.points.some(point => isPointInEraserRange(point, canvasPoint, eraserSize));
        });
        
        if (updatedPaths.length !== paths.length) {
          setPaths(updatedPaths);
        }
      }
    } else if (isDrawing && drawingMode) {
      // Drawing mode
      const canvas = canvasRef.current;
      if (!canvas) return;

      const canvasPoint = screenToCanvas(e.clientX, e.clientY);
      setCurrentPath((prev) => [...prev, canvasPoint]);
    }
  }, [isDrawing, drawingMode, isErasing, eraserMode, eraserType, eraserSize, paths, screenToCanvas, isPointInEraserRange]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isErasing && eraserMode) {
      // Eraser mode - save state to history
      if (paths.length > 0) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push([...paths]);
        
        if (newHistory.length > 50) {
          const limited = newHistory.slice(-50);
          setHistoryIndex(limited.length - 1);
          setHistory(limited);
        } else {
          setHistoryIndex(newHistory.length - 1);
          setHistory(newHistory);
        }
      }
      
      setIsErasing(false);
      setCurrentEraseArea(null);
    } else if (isDrawing && drawingMode) {
      // Drawing mode
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
    }
  }, [isDrawing, drawingMode, isErasing, eraserMode, currentPath, color, strokeWidth, paths, history, historyIndex]);

  // Set up mouse event listeners
  useEffect(() => {
    if ((isDrawing && drawingMode) || (isErasing && eraserMode)) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDrawing, drawingMode, isErasing, eraserMode, handleMouseMove, handleMouseUp]);

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

  // Always render canvas to show persisted drawings, but only enable interaction when drawing or eraser mode is active
  return (
    <canvas
      ref={canvasRef}
      onMouseDown={(drawingMode || eraserMode) ? handleMouseDown : undefined}
      className="absolute inset-0 w-full h-full z-10"
      style={{
        pointerEvents: (drawingMode || eraserMode) ? 'auto' : 'none',
        cursor: drawingMode 
          ? (isDrawing ? 'crosshair' : 'crosshair') 
          : eraserMode 
          ? (isErasing ? 'grab' : 'grab')
          : 'default',
        touchAction: 'none',
      }}
    />
  );
};

export default DrawingCanvas;
