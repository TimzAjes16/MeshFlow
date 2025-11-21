'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Type, FileText, Image, Link2, Square, Circle, 
  BarChart3, LineChart, PieChart, TrendingUp, 
  Edit, Trash2, Copy, X, ChevronDown
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
  { id: 'box', label: 'Box', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'bar-chart', label: 'Bar Chart', icon: BarChart3 },
  { id: 'line-chart', label: 'Line Chart', icon: LineChart },
  { id: 'pie-chart', label: 'Pie Chart', icon: PieChart },
  { id: 'area-chart', label: 'Area Chart', icon: TrendingUp },
];

export default function FloatingHorizontalBar({ 
  onCreateNode, 
  onDeleteNode,
  onDuplicateNode 
}: FloatingHorizontalBarProps) {
  const { selectedNodeId, selectNode } = useCanvasStore();
  const { nodes } = useWorkspaceStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  // Listen for canvas clicks to show creation toolbar
  useEffect(() => {
    const handleCanvasClick = (event: CustomEvent) => {
      if (!selectedNodeId) {
        // Only show creation toolbar if no node is selected
        setClickPosition({ x: event.detail.x, y: event.detail.y });
        setIsExpanded(true);
      }
    };

    window.addEventListener('show-create-toolbar', handleCanvasClick as EventListener);
    return () => window.removeEventListener('show-create-toolbar', handleCanvasClick as EventListener);
  }, [selectedNodeId]);

  // Auto-expand when node is selected (for edit mode)
  useEffect(() => {
    if (selectedNodeId) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [selectedNodeId]);

  const handleCreateNode = async (type: string) => {
    const position = clickPosition || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Store flow position for node creation
    (window as any).lastFlowPosition = { x: 500, y: 400 };
    
    await onCreateNode(type, position);
    setIsExpanded(false);
    setClickPosition(null);
  };

  const handleDelete = () => {
    if (selectedNodeId && onDeleteNode) {
      onDeleteNode(selectedNodeId);
      selectNode(null);
      setIsExpanded(false);
    }
  };

  const handleDuplicate = () => {
    if (selectedNodeId && onDuplicateNode) {
      onDuplicateNode(selectedNodeId);
    }
  };

  // Node Edit Mode - show when node is selected
  if (selectedNodeId && selectedNode) {
    return (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 floating-horizontal-bar">
        <div className="bg-white border border-gray-200 rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
            <Edit className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">{selectedNode.title || 'Untitled'}</span>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <button
            onClick={handleDuplicate}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Duplicate node"
          >
            <Copy className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-50 rounded-full transition-colors"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
          
          <button
            onClick={() => {
              selectNode(null);
              setIsExpanded(false);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    );
  }

  // Node Creation Mode - show when no node is selected
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 floating-horizontal-bar">
      <div className="bg-white border border-gray-200 rounded-full shadow-lg overflow-hidden">
        {isExpanded ? (
          <div className="flex items-center gap-1 px-2 py-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Collapse"
            >
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
            
            <div className="h-8 w-px bg-gray-300" />
            
            <div className="flex items-center gap-1 overflow-x-auto max-w-[calc(100vw-200px)]">
              {nodeTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleCreateNode(type.id)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-full transition-colors whitespace-nowrap"
                    title={type.label}
                  >
                    <Icon className="w-4 h-4 text-gray-700" />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-3 hover:bg-gray-100 transition-colors"
            title="Add node"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>
    </div>
  );
}

