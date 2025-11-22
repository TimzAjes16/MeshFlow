'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Type, FileText, Image, Link2, Square, Circle, ArrowRight,
  BarChart3, LineChart, PieChart, TrendingUp, 
  Edit, Trash2, Copy, X, Smile, Home, GripVertical, Camera
} from 'lucide-react';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface FloatingHorizontalBarProps {
  onCreateNode: (type: string, position: { x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
}

const nodeTypes = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'note', label: 'Note', icon: FileText },
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'live-capture', label: 'Live Capture', icon: Camera, category: 'media' },
  { id: 'emoji', label: 'Emoji', icon: Smile },
  { id: 'box', label: 'Box', icon: Square, category: 'shapes' },
  { id: 'circle', label: 'Circle', icon: Circle, category: 'shapes' },
  { id: 'arrow', label: 'Arrow', icon: ArrowRight, category: 'shapes' },
  { id: 'bar-chart', label: 'Bar Chart', icon: BarChart3 },
  { id: 'line-chart', label: 'Line Chart', icon: LineChart },
  { id: 'pie-chart', label: 'Pie Chart', icon: PieChart },
  { id: 'area-chart', label: 'Area Chart', icon: TrendingUp },
];

// Original position (centered at bottom)
const getOriginalPosition = () => ({
  x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
  y: typeof window !== 'undefined' ? window.innerHeight - 24 : 0,
});

export default function FloatingHorizontalBar({ 
  onCreateNode, 
  onDeleteNode,
  onDuplicateNode 
}: FloatingHorizontalBarProps) {
  const { selectedNodeId, selectNode } = useCanvasStore();
  const { nodes } = useWorkspaceStore();
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>(getOriginalPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Memoize selectedNode to prevent unnecessary re-renders when nodes array reference changes
  // Only recompute when selectedNodeId or the actual node data changes
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  // Listen for canvas clicks to show creation toolbar
  useEffect(() => {
    const handleCanvasClick = (event: CustomEvent) => {
      if (!selectedNodeId) {
        // Only show creation toolbar if no node is selected
        setClickPosition({ x: event.detail.x, y: event.detail.y });
      }
    };

    window.addEventListener('show-create-toolbar', handleCanvasClick as EventListener);
    return () => window.removeEventListener('show-create-toolbar', handleCanvasClick as EventListener);
  }, [selectedNodeId]);

  // Listen for node click events to show edit bar
  useEffect(() => {
    const handleNodeClick = () => {
      // When a node is clicked, the bar should switch to edit mode
      // This is handled by the selectedNodeId check below
    };

    if (selectedNodeId) {
      // Reset position when node is selected to show edit bar at bottom
      setPosition(getOriginalPosition());
      setClickPosition(null);
    }
  }, [selectedNodeId]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only allow dragging from the grip handle or empty space, not from buttons
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const rect = barRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartPos.current = { x: e.clientX, y: e.clientY };
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
    
    // Constrain to viewport
    const rect = barRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width / 2;
    const minX = rect.width / 2;
    const maxY = window.innerHeight - rect.height / 2;
    const minY = rect.height / 2;

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach drag listeners
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

  // Snap back to original position
  const handleSnapBack = useCallback(() => {
    setPosition(getOriginalPosition());
  }, []);

  // Check if toolbar is at original position
  const isAtOriginalPosition = () => {
    const original = getOriginalPosition();
    const threshold = 10; // pixels
    return (
      Math.abs(position.x - original.x) < threshold &&
      Math.abs(position.y - original.y) < threshold
    );
  };

  const handleCreateNode = async (type: string) => {
    const position = clickPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Use stored flow position from canvas click, or default to center
    // CanvasContainer stores this when canvas is clicked
    const storedFlowPos = (window as any).lastFlowPosition;
    if (storedFlowPos) {
      // Flow position is already stored by CanvasContainer
      // Just ensure it exists for CanvasPageClient to use
    } else {
      // Fallback: store default position if not set
      (window as any).lastFlowPosition = { x: 500, y: 400 };
    }
    
    await onCreateNode(type, position);
    setClickPosition(null);
  };

  const handleDelete = () => {
    if (selectedNodeId && onDeleteNode) {
      onDeleteNode(selectedNodeId);
      selectNode(null);
    }
  };

  const handleDuplicate = () => {
    if (selectedNodeId && onDuplicateNode) {
      onDuplicateNode(selectedNodeId);
    }
  };

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      const original = getOriginalPosition();
      const threshold = 10;
      if (
        Math.abs(position.x - original.x) < threshold &&
        Math.abs(position.y - original.y) < threshold
      ) {
        setPosition(getOriginalPosition());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Node Edit Mode - show when node is selected (even if node not loaded yet)
  if (selectedNodeId) {
    const nodeTitle = selectedNode?.title || 'Untitled';
    const titleLength = nodeTitle.length;
    // Content-aware width: adjust based on title length
    const contentWidth = Math.min(
      Math.max(200, titleLength * 8 + 200), // Dynamic width based on title
      600 // Max width
    );

    return (
      <div 
        ref={barRef}
        className="fixed z-50 floating-horizontal-bar"
        style={{ 
          left: `${position.x}px`,
          bottom: `${typeof window !== 'undefined' ? window.innerHeight - position.y : 24}px`,
          transform: 'translate(-50%, 0)',
          width: `${contentWidth}px`,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        <div 
          className="relative bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2"
          onMouseDown={handleDragStart}
        >
          {/* Drag handle */}
          <div className="flex items-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
            <GripVertical className="w-4 h-4" />
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg flex-1 min-w-0">
            <Edit className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">{nodeTitle}</span>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <button
            onClick={handleDuplicate}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            title="Duplicate node"
          >
            <Copy className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
          
          <button
            onClick={() => {
              selectNode(null);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>

          {/* Snap back button - only show if not at original position */}
          {!isAtOriginalPosition() && (
            <>
              <div className="h-6 w-px bg-gray-300" />
              <button
                onClick={handleSnapBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                title="Return to original position"
              >
                <Home className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Node Creation Mode - show when no node is selected
  // Content-aware: calculate width based on number of items (icons only)
  const buttonCount = nodeTypes.length;
  const buttonWidth = 44; // Width per button (icons only)
  const padding = 16; // Horizontal padding
  const gap = 8; // Gap between buttons
  const controlsWidth = 60; // Width for snap-back button
  const contentWidth = typeof window !== 'undefined' ? Math.min(
    buttonCount * buttonWidth + (buttonCount - 1) * gap + padding * 2 + controlsWidth,
    window.innerWidth - 48 // Max width with margins
  ) : 600;

  return (
    <div 
      ref={barRef}
      className="fixed z-50 floating-horizontal-bar"
      style={{ 
        left: `${position.x}px`,
        bottom: `${typeof window !== 'undefined' ? window.innerHeight - position.y : 24}px`,
        transform: 'translate(-50%, 0)',
        width: `${contentWidth}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div 
        className="relative bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-2 flex items-center gap-1"
        onMouseDown={handleDragStart}
      >
        {/* Drag handle */}
        <div className="flex items-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>
        
        {/* Node type buttons */}
        <div className="flex items-center gap-1 flex-1 justify-center overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {nodeTypes.map((type) => {
            const Icon = type.icon;
            const isShape = type.category === 'shapes';
            return (
              <button
                key={type.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateNode(type.id);
                }}
                className={`flex items-center justify-center px-2 py-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0 ${
                  isShape ? 'border-l-2 border-purple-300 pl-2' : ''
                }`}
                title={type.label}
              >
                <Icon className="w-4 h-4 text-gray-700 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Snap back button - only show if not at original position */}
        {!isAtOriginalPosition() && (
          <>
            <div className="h-6 w-px bg-gray-300 mx-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSnapBack();
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              title="Return to original position"
            >
              <Home className="w-4 h-4 text-gray-600" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

