'use client';

import { memo, useEffect, useCallback, useState, useRef, type ReactNode } from 'react';
import { useHistoryStore } from '@/state/historyStore';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { motion } from 'framer-motion';
import type { Node as NodeType } from '@/types/Node';
import { getNodeColor } from '@/lib/nodeColors';
import { BarChartNode, LineChartNode, PieChartNode, AreaChartNode } from './charts';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { Image as ImageIcon } from 'lucide-react';
import ResizeHandle from './ResizeHandle';
import RotateHandle from './RotateHandle';

// Load Google Fonts dynamically
const loadGoogleFont = (fontName: string) => {
  if (typeof window === 'undefined') return;
  
  // Check if font is already loaded
  const linkId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;
  
  // Create link element
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

interface NodeData {
  label: string;
  node: NodeType;
}

function isChartNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  const chartTypes = ['bar-chart', 'line-chart', 'pie-chart', 'area-chart'];
  return chartTypes.some(type => node.tags?.includes(type));
}

function getChartType(node: NodeType): string | null {
  if (!node.tags || node.tags.length === 0) return null;
  const chartTypes = ['bar-chart', 'line-chart', 'pie-chart', 'area-chart'];
  return chartTypes.find(type => node.tags?.includes(type)) || null;
}

function isImageNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('image');
}

function isBoxNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('box');
}

function isCircleNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('circle');
}

function isNoteNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('note');
}

function isLinkNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('link');
}

function isTextNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('text');
}

function isEmojiNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('emoji');
}

function isArrowNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  return node.tags.includes('arrow');
}

// Extract text from TipTap JSON content
function extractTextFromContent(content: any): string {
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && content !== null) {
    if (content.type === 'doc' && content.content) {
      return extractTextFromTipTap(content);
    }
  }
  return '';
}

function extractTextFromTipTap(node: any): string {
  if (node.type === 'text' && node.text) {
    return node.text;
  }
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child: any) => extractTextFromTipTap(child)).join(' ');
  }
  return '';
}

export default memo(function NodeComponent({ data, selected, id }: NodeProps<NodeData>) {
  const { label, node } = data;
  const showTags = useCanvasStore((state) => state.showTags);
  const { updateNode } = useWorkspaceStore();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  const color = getNodeColor(node);
  const chartType = getChartType(node);
  const isChart = isChartNode(node);
  
  // Inline editing state for text nodes
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editingStartContentRef = useRef<string>(''); // Store original content when editing starts
  const historyStoreRef = useRef<ReturnType<typeof import('@/state/historyStore').useHistoryStore.getState> | null>(null);
  
  // Use node.title directly for real-time updates (fallback to label if title not available)
  const displayLabel = node.title || label || 'Untitled';
  
  // Get node dimensions and rotation from content metadata
  const nodeMetadata = node.content && typeof node.content === 'object' && 'nodeMetadata' in node.content
    ? (node.content as any).nodeMetadata
    : {};
  const nodeWidth = nodeMetadata.width || 200;
  const nodeHeight = nodeMetadata.height || 100;
  const nodeRotation = nodeMetadata.rotation || 0;

  // Extract text settings early (before any conditional returns) for Google Font loading
  const textSettings = node.content && typeof node.content === 'object' && 'textSettings' in node.content
    ? (node.content as any).textSettings
    : null;
  const googleFont = textSettings?.googleFont || '';

  // Load Google Font when component mounts if needed (must be called unconditionally)
  useEffect(() => {
    if (googleFont) {
      loadGoogleFont(googleFont);
    }
  }, [googleFont]);

  // Handle resize
  const handleResize = useCallback(async (nodeId: string, width: number, height: number) => {
    const currentContent = node.content || {};
    const newContent = {
      ...currentContent,
      nodeMetadata: {
        ...nodeMetadata,
        width: Math.round(width),
        height: Math.round(height),
      },
    };
    
    updateNode(nodeId, { content: newContent });
    
    // Persist to database (async, non-blocking)
    if (workspaceId) {
      // Don't await - make it fire-and-forget to prevent UI blocking
      fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          content: newContent,
        }),
      }).catch((error) => {
        console.error('Error updating node dimensions:', error);
      });
      // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
    }
  }, [node, nodeMetadata, updateNode, workspaceId]);

  // Handle rotate
  const handleRotate = useCallback(async (nodeId: string, rotation: number) => {
    const currentContent = node.content || {};
    const newContent = {
      ...currentContent,
      nodeMetadata: {
        ...nodeMetadata,
        rotation: Math.round(rotation),
      },
    };
    
    updateNode(nodeId, { content: newContent });
    
    // Persist to database (async, non-blocking)
    if (workspaceId) {
      // Don't await - make it fire-and-forget to prevent UI blocking
      fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          content: newContent,
        }),
      }).catch((error) => {
        console.error('Error updating node rotation:', error);
      });
      // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
    }
  }, [node, nodeMetadata, updateNode, workspaceId]);

  // Get chart config from node content
  const chartConfig = node.content && typeof node.content === 'object' && 'chart' in node.content
    ? (node.content as any).chart
    : null;

  // Handle inline editing for text nodes
  const handleStartEditing = useCallback(() => {
    if (isTextNode(node)) {
      const textContent = extractTextFromContent(node.content);
      setEditingContent(textContent);
      // Store the original content when editing starts
      editingStartContentRef.current = textContent;
      // Store reference to history store and disable recording during editing
      const historyStore = useHistoryStore.getState();
      historyStoreRef.current = historyStore;
      historyStore.setRecording(false); // Disable history recording during typing
      setIsEditing(true);
      // Focus textarea after state update
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 0);
    }
  }, [node]);

  const handleStopEditing = useCallback(async () => {
    setIsEditing(false);
    
    // Clear any pending debounced updates and immediately save on blur
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    
    // Re-enable history recording now that editing is complete
    const historyStore = historyStoreRef.current || useHistoryStore.getState();
    historyStore.setRecording(true);
    
    // Check if content actually changed before recording history and saving
    const originalContent = editingStartContentRef.current;
    const finalContent = editingContent;
    
    // Save immediately when user stops editing (blur event)
    const currentContent = node.content || {};
    const newContent = {
      ...currentContent,
      text: editingContent, // Use the current editing content
    };
    
    // Only record history if content actually changed
    if (originalContent !== finalContent) {
      // Record a single history entry for the entire editing session
      const beforeContent = {
        ...currentContent,
        text: originalContent,
      };
      historyStore.recordAction(
        {
          type: 'update_node',
          nodeId: node.id,
          before: { content: beforeContent },
          after: { content: newContent },
        },
        `Updated node "${node.title}"`
      );
    }
    
    // Ensure local store is updated
    updateNode(node.id, { content: newContent });
    
    // Save to API immediately on blur (async, non-blocking)
    if (workspaceId) {
      // Don't await - make it fire-and-forget to prevent UI blocking
      fetch('/api/nodes/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: node.id,
          content: newContent,
        }),
      }).catch((error) => {
        console.error('Error updating node content on blur:', error);
      });
      // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
      // The local store update is sufficient for UI, and polling will sync any server-side changes
    }
    
    // Clear the refs
    editingStartContentRef.current = '';
    historyStoreRef.current = null;
  }, [node, updateNode, workspaceId, editingContent]);

  const handleContentChange = useCallback((value: string) => {
    // CRITICAL: Only update local state during typing - DO NOT update workspace store
    // This prevents blocking re-renders that freeze the UI
    setEditingContent(value);
    
    // Do NOT call updateNode here - it causes synchronous store updates that block the UI
    // The workspace store will be updated only when editing stops (on blur)
    // The textarea uses editingContent (local state) which updates instantly and non-blocking
  }, []);

  // Cleanup timer and re-enable history recording on unmount or when component unmounts during editing
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      // Re-enable history recording if component unmounts while editing
      if (isEditing && historyStoreRef.current) {
        historyStoreRef.current.setRecording(true);
      }
    };
  }, [isEditing]);

  // Helper component to wrap nodes with resize/rotate handles
  const NodeWrapper = ({ children, defaultWidth = 200, defaultHeight = 100, style = {} }: { 
    children: ReactNode;
    defaultWidth?: number;
    defaultHeight?: number;
    style?: React.CSSProperties;
  }) => {
    const width = nodeWidth || defaultWidth;
    const height = nodeHeight || defaultHeight;
    const rotation = nodeRotation || 0;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          width: `${width}px`,
          height: `${height}px`,
          overflow: 'visible', // Ensure handles are visible outside bounds
          boxSizing: 'border-box',
          minWidth: `${width}px`,
          minHeight: `${height}px`,
        }}
      >
        {selected && (
          <>
            <RotateHandle nodeId={id} rotation={rotation} onRotate={handleRotate} />
            <ResizeHandle nodeId={id} position="top-left" currentWidth={width} currentHeight={height} onResize={handleResize} />
            <ResizeHandle nodeId={id} position="top-right" currentWidth={width} currentHeight={height} onResize={handleResize} />
            <ResizeHandle nodeId={id} position="bottom-left" currentWidth={width} currentHeight={height} onResize={handleResize} />
            <ResizeHandle nodeId={id} position="bottom-right" currentWidth={width} currentHeight={height} onResize={handleResize} />
            <ResizeHandle nodeId={id} position="top" currentWidth={width} currentHeight={height} onResize={handleResize} />
            <ResizeHandle nodeId={id} position="bottom" currentWidth={width} currentHeight={height} onResize={handleResize} />
            <ResizeHandle nodeId={id} position="left" currentWidth={width} currentHeight={height} onResize={handleResize} />
            <ResizeHandle nodeId={id} position="right" currentWidth={width} currentHeight={height} onResize={handleResize} />
          </>
        )}
        <div 
          style={{ 
            width: '100%', 
            height: '100%',
            position: 'relative',
            pointerEvents: 'auto',
            overflow: 'visible', // Allow content and borders to show fully
            boxSizing: 'border-box',
            minWidth: '100%',
            minHeight: '100%',
            ...style 
          }}
        >
          {children}
        </div>
      </motion.div>
    );
  };

  // Render chart node
  if (isChart && chartType) {
    const chartData = chartConfig?.data || [];
    const chartProps = {
      data: chartData,
      xKey: chartConfig?.xKey || 'name',
      yKey: chartConfig?.yKey || 'value',
      color: chartConfig?.color || color.primary,
      showGrid: chartConfig?.showGrid !== false,
      showLegend: chartConfig?.showLegend || false,
    };

    return (
      <NodeWrapper defaultWidth={400} defaultHeight={300}>
        <motion.div
          className={`relative bg-white border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 ${
            selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {/* Chart Title */}
          <div className="absolute top-2 left-3 right-3 z-10">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {displayLabel || 'Untitled Chart'}
            </div>
          </div>

          {/* Chart Content */}
          <div className="absolute inset-0 pt-8 pb-2 px-2">
            {chartType === 'bar-chart' && <BarChartNode {...chartProps} />}
            {chartType === 'line-chart' && <LineChartNode {...chartProps} />}
            {chartType === 'pie-chart' && <PieChartNode data={chartData} showLegend={chartProps.showLegend} />}
            {chartType === 'area-chart' && <AreaChartNode {...chartProps} />}
          </div>

          {/* Connection handles */}
          <Handle
            type="target"
            position={Position.Top}
            className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair !z-[1000]"
            style={{
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
              zIndex: 1000,
            }}
            title="Connect to this node"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair !z-[1000]"
            style={{
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
              zIndex: 1000,
            }}
            title="Drag to connect to another node"
          />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Render image node - show actual image
  if (isImageNode(node)) {
    const imageData = node.content && typeof node.content === 'object' && 'image' in node.content
      ? (node.content as any).image
      : null;
    
    const imageUrl = imageData?.url || '';
    const imageSize = imageData?.size || 'medium';
    const alignment = imageData?.alignment || 'center';
    const borderRadius = imageData?.borderRadius || 8;

    const sizeClasses = {
      small: 'max-w-[200px]',
      medium: 'max-w-[400px]',
      large: 'max-w-[600px]',
      full: 'w-full',
    };

    const alignmentClasses = {
      left: 'mr-auto',
      center: 'mx-auto',
      right: 'ml-auto',
    };

  return (
    <NodeWrapper defaultWidth={250} defaultHeight={200}>
      <motion.div
          className={`relative bg-white border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 p-4 ${
            selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {imageUrl ? (
            <div
              className={`${sizeClasses[imageSize as keyof typeof sizeClasses]} ${alignmentClasses[alignment as keyof typeof alignmentClasses]}`}
              style={{ borderRadius: `${borderRadius}px`, overflow: 'hidden' }}
            >
              <img
                src={imageUrl}
                alt={displayLabel}
                className="w-full h-auto"
                style={{ borderRadius: `${borderRadius}px` }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[150px] text-gray-400">
              <ImageIcon className="w-12 h-12 mb-2" />
              <p className="text-sm">Click to add image</p>
            </div>
          )}

          {/* Title */}
          {displayLabel && (
            <div className="mt-2 text-sm font-semibold text-gray-900 text-center">
              {displayLabel}
            </div>
          )}

          {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
            className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair"
            style={{
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
            }}
            title="Connect to this node"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair"
        style={{
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
            }}
            title="Drag to connect to another node"
          />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Render box node - actual rectangle shape
  if (isBoxNode(node)) {
    const textContent = extractTextFromContent(node.content);
    const shapeSettings = node.content && typeof node.content === 'object' && 'shapeSettings' in node.content
      ? (node.content as any).shapeSettings
      : { fill: true, fillColor: '#ffffff', borderColor: '#1f2937', borderWidth: 4 };
    
    const fill = shapeSettings.fill !== false;
    const fillColor = shapeSettings.fillColor || '#ffffff';
    const borderColor = shapeSettings.borderColor || '#1f2937';
    const borderWidth = shapeSettings.borderWidth || 4;
    
    return (
      <NodeWrapper defaultWidth={250} defaultHeight={150}>
        <motion.div
          className={`relative shadow-lg cursor-pointer transition-all duration-300 p-4 ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '0', // Sharp corners for rectangle
            backgroundColor: fill ? fillColor : 'transparent',
            border: `${borderWidth}px solid ${borderColor}`,
          }}
        >
          {displayLabel && (
            <div className="text-base font-bold mb-2" style={{ color: borderColor }}>
              {displayLabel}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words text-sm" style={{ color: fill ? '#374151' : borderColor }}>
            {textContent || <span className="opacity-60 italic">Add content...</span>}
          </div>
          <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
          <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Render circle node - actual circle shape
  if (isCircleNode(node)) {
    const textContent = extractTextFromContent(node.content);
    const shapeSettings = node.content && typeof node.content === 'object' && 'shapeSettings' in node.content
      ? (node.content as any).shapeSettings
      : { fill: true, fillColor: '#ffffff', borderColor: '#1f2937', borderWidth: 4 };
    
    const fill = shapeSettings.fill !== false;
    const fillColor = shapeSettings.fillColor || '#ffffff';
    const borderColor = shapeSettings.borderColor || '#1f2937';
    const borderWidth = shapeSettings.borderWidth || 4;
    
    return (
      <NodeWrapper defaultWidth={200} defaultHeight={200}>
        <motion.div
          className={`relative shadow-lg cursor-pointer transition-all duration-300 p-6 flex flex-col items-center justify-center ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%', // Perfect circle
            backgroundColor: fill ? fillColor : 'transparent',
            border: `${borderWidth}px solid ${borderColor}`,
          }}
        >
          {displayLabel && (
            <div className="text-sm font-bold mb-1 text-center" style={{ color: borderColor }}>
              {displayLabel}
            </div>
          )}
          <div className="whitespace-pre-wrap break-words text-xs text-center" style={{ color: fill ? '#374151' : borderColor }}>
            {textContent || <span className="opacity-60 italic">Add content...</span>}
          </div>
          <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
          <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Render note node - sticky note shape with folded corner
  if (isNoteNode(node)) {
    const textContent = extractTextFromContent(node.content);
    // For note nodes, we combine the default -1deg rotation with the user's rotation
    // Store the base rotation (-1deg) in metadata, user rotation is additive
    const baseRotation = -1;
    const userRotation = nodeRotation || 0;
    const combinedRotation = baseRotation + userRotation;
    
    // Use NodeWrapper but apply base rotation offset
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
        style={{
          transform: `rotate(${baseRotation}deg)`,
          transformOrigin: 'center center',
        }}
      >
        <NodeWrapper defaultWidth={250} defaultHeight={180}>
          <motion.div
            className={`relative bg-yellow-50 border-2 shadow-lg cursor-pointer transition-all duration-300 p-4 ${
              selected ? 'ring-2 ring-blue-200' : ''
            }`}
            style={{
              width: '100%',
              height: '100%',
              minWidth: '220px',
              minHeight: '180px',
              maxWidth: '280px',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.15), -2px -2px 8px rgba(0,0,0,0.05)',
            }}
          >
            {/* Folded corner effect */}
            <div
              className="absolute top-0 right-0 w-0 h-0"
              style={{
                borderLeft: '20px solid transparent',
                borderTop: '20px solid #fbbf24',
                borderTopRightRadius: '4px',
              }}
            />
            <div
              className="absolute top-0 right-0 w-0 h-0"
              style={{
                borderLeft: '18px solid transparent',
                borderTop: '18px solid #fef3c7',
              }}
            />
            
            {displayLabel && (
              <div className="text-base font-semibold text-gray-900 mb-2 pr-4">
                {displayLabel}
              </div>
            )}
            <div className="text-gray-800 whitespace-pre-wrap break-words text-sm">
              {textContent || <span className="text-gray-500 italic">Write a note...</span>}
            </div>
            <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
            <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
          </motion.div>
        </NodeWrapper>
      </motion.div>
    );
  }

  // Render link node - bookmark/link shape
  if (isLinkNode(node)) {
    const textContent = extractTextFromContent(node.content);
    const linkUrl = typeof node.content === 'string' ? node.content : textContent;
    return (
      <NodeWrapper defaultWidth={250} defaultHeight={100}>
        <motion.div
          className={`relative bg-blue-50 border-2 border-blue-300 shadow-lg cursor-pointer transition-all duration-300 p-3 ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '100%',
            height: '100%',
            minWidth: '200px',
            minHeight: '80px',
            maxWidth: '300px',
            clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)', // Bookmark shape
          }}
        >
          {/* Bookmark corner */}
          <div
            className="absolute top-0 right-0 w-0 h-0"
            style={{
              borderLeft: '20px solid transparent',
              borderTop: '20px solid #93c5fd',
            }}
          />
          
          {displayLabel && (
            <div className="text-sm font-semibold text-blue-900 mb-1 pr-4">
              {displayLabel}
            </div>
          )}
          <div className="text-blue-800 whitespace-pre-wrap break-words text-xs underline">
            {linkUrl || <span className="text-blue-500 italic">Add link...</span>}
          </div>
          <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
          <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Render emoji node - large emoji display
  if (isEmojiNode(node)) {
    // Get emojis from content (array) or fallback to title
    let emojis: string[] = [];
    if (node.content && typeof node.content === 'object' && 'emoji' in node.content) {
      const emojiData = (node.content as any).emoji;
      if (Array.isArray(emojiData)) {
        emojis = emojiData;
      } else if (typeof emojiData === 'string') {
        emojis = [emojiData];
      }
    }
    if (emojis.length === 0 && node.title) {
      // Parse title into emojis (handle both single and multiple)
      emojis = Array.from(node.title).filter((char) => {
        // Check if character is an emoji (rough check)
        const codePoint = char.codePointAt(0);
        return codePoint && (
          (codePoint >= 0x1F300 && codePoint <= 0x1F9FF) || // Misc Symbols and Pictographs
          (codePoint >= 0x1F600 && codePoint <= 0x1F64F) || // Emoticons
          (codePoint >= 0x1F680 && codePoint <= 0x1F6FF) || // Transport and Map
          (codePoint >= 0x2600 && codePoint <= 0x26FF) ||   // Misc symbols
          (codePoint >= 0x2700 && codePoint <= 0x27BF)      // Dingbats
        );
      });
      if (emojis.length === 0) {
        emojis = ['😀'];
      }
    }
    if (emojis.length === 0) {
      emojis = ['😀'];
    }
    
    // Get emoji settings (fill, fillColor, borderColor, borderWidth)
    const emojiSettings = node.content && typeof node.content === 'object' && 'emojiSettings' in node.content
      ? (node.content as any).emojiSettings
      : { fill: true, fillColor: '#ffffff', borderColor: '#d1d5db', borderWidth: 2 };
    
    const fill = emojiSettings.fill !== false;
    const fillColor = emojiSettings.fillColor || '#ffffff';
    const borderColor = emojiSettings.borderColor || '#d1d5db';
    const borderWidth = emojiSettings.borderWidth || 2;
    
    // Calculate size based on number of emojis
    const emojiCount = emojis.length;
    const baseSize = 150;
    const minSize = 120;
    const maxSize = 300;
    const defaultSize = Math.min(maxSize, Math.max(minSize, baseSize + (emojiCount - 1) * 30));
    const size = nodeWidth || defaultSize;
    const fontSize = emojiCount === 1 ? 'text-6xl' : emojiCount === 2 ? 'text-5xl' : emojiCount === 3 ? 'text-4xl' : 'text-3xl';
    
    return (
      <NodeWrapper defaultWidth={size} defaultHeight={size}>
        <motion.div
          className={`relative shadow-lg cursor-pointer transition-all duration-300 p-6 flex items-center justify-center ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '16px',
            minWidth: `${minSize}px`,
            minHeight: `${minSize}px`,
            backgroundColor: fill ? fillColor : 'transparent',
            border: `${borderWidth}px solid ${borderColor}`,
            boxSizing: 'border-box',
            overflow: 'visible',
            position: 'relative',
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            // Dispatch event to open emoji picker on double-click
            window.dispatchEvent(new CustomEvent('openEmojiPicker', {
              detail: { nodeId: node.id, position: { x: e.clientX, y: e.clientY } }
            }));
          }}
        >
          <div className={`${fontSize} select-none flex items-center justify-center gap-1 flex-wrap`}>
            {emojis.map((emoji, idx) => (
              <span key={idx}>{emoji}</span>
            ))}
          </div>
          <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
          <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Render arrow node - arrow shape with hand-drawn aesthetic
  if (isArrowNode(node)) {
    const arrowSettings = node.content && typeof node.content === 'object' && 'arrow' in node.content
      ? (node.content as any).arrow
      : { direction: 'right', color: '#1f2937', thickness: 4 };
    
    const direction = arrowSettings.direction || 'right';
    const color = arrowSettings.color || '#1f2937';
    const thickness = arrowSettings.thickness || 4;
    
    // Arrow directions mapping - basic directions use '-->' style (line with arrowhead)
    const arrowPaths: Record<string, { path: string; isLine?: boolean }> = {
      // Basic directions: '-->' style (line with arrowhead)
      right: { 
        path: 'M 10 40 L 60 40 M 50 30 L 60 40 L 50 50',
        isLine: true 
      },
      left: { 
        path: 'M 70 40 L 20 40 M 30 30 L 20 40 L 30 50',
        isLine: true 
      },
      up: { 
        path: 'M 40 70 L 40 20 M 30 30 L 40 20 L 50 30',
        isLine: true 
      },
      down: { 
        path: 'M 40 10 L 40 60 M 30 50 L 40 60 L 50 50',
        isLine: true 
      },
      // Diagonal arrows: '-->' style (line with arrowhead)
      'up-right': { 
        path: 'M 15 65 L 55 25 M 45 20 L 55 25 L 50 15',
        isLine: true 
      },
      'down-right': { 
        path: 'M 15 15 L 55 55 M 45 60 L 55 55 L 50 65',
        isLine: true 
      },
      'down-left': { 
        path: 'M 65 15 L 25 55 M 35 60 L 25 55 L 30 65',
        isLine: true 
      },
      'up-left': { 
        path: 'M 65 65 L 25 25 M 35 20 L 25 25 L 30 15',
        isLine: true 
      },
      // Double arrows: filled style
      'double-horizontal': { 
        path: 'M 10 40 L 20 20 L 20 30 L 60 30 L 60 20 L 70 40 L 60 60 L 60 50 L 20 50 L 20 60 Z'
      },
      'double-vertical': { 
        path: 'M 40 10 L 20 20 L 30 20 L 30 60 L 20 60 L 40 70 L 60 60 L 50 60 L 50 20 L 60 20 Z'
      },
      // Curved arrows: line style with proper curves (curving from bottom-left to top-right, and vice versa)
      'curved-right': { 
        path: 'M 20 60 Q 25 45, 35 35 Q 45 25, 55 20 M 50 18 L 55 20 L 52 12',
        isLine: true 
      },
      'curved-left': { 
        path: 'M 60 20 Q 55 35, 45 45 Q 35 55, 25 60 M 30 62 L 25 60 L 28 68',
        isLine: true 
      },
    };
    
    return (
      <NodeWrapper defaultWidth={120} defaultHeight={120}>
        <motion.div
          className={`relative shadow-lg cursor-pointer transition-all duration-300 flex items-center justify-center ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 80 80"
            className="transform"
            preserveAspectRatio="xMidYMid meet"
            style={{
              transform: 
                direction === 'up' ? 'rotate(0deg)' :
                direction === 'down' ? 'rotate(180deg)' :
                direction === 'left' ? 'rotate(90deg)' :
                direction === 'right' ? 'rotate(-90deg)' :
                direction === 'up-right' ? 'rotate(0deg)' :
                direction === 'down-right' ? 'rotate(0deg)' :
                direction === 'down-left' ? 'rotate(0deg)' :
                direction === 'up-left' ? 'rotate(0deg)' :
                direction === 'double-horizontal' ? 'rotate(0deg)' :
                direction === 'double-vertical' ? 'rotate(0deg)' :
                direction === 'curved-right' ? 'rotate(0deg)' :
                direction === 'curved-left' ? 'rotate(0deg)' :
                'rotate(0deg)',
            }}
          >
            {(() => {
              const arrowDef = arrowPaths[direction] || arrowPaths.right;
              const isLine = arrowDef.isLine || false;
              
              // Hand-drawn effect using filter
              const handDrawnFilter = `url(#hand-drawn-${node.id})`;
              
              if (isLine) {
                // Line style arrows (--> style) with hand-drawn aesthetic
                return (
                  <>
                    <defs>
                      <filter id={`hand-drawn-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feTurbulence baseFrequency="0.04" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale={thickness * 0.3} />
                      </filter>
                    </defs>
                    <path
                      d={arrowDef.path}
                      fill="none"
                      stroke={color}
                      strokeWidth={thickness}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={handDrawnFilter}
                      style={{
                        filter: `url(#hand-drawn-${node.id})`,
                        strokeDasharray: 'none',
                      }}
                    />
                  </>
                );
              } else {
                // Filled style arrows with hand-drawn aesthetic
                return (
                  <>
                    <defs>
                      <filter id={`hand-drawn-${node.id}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feTurbulence baseFrequency="0.03" numOctaves="2" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale={thickness * 0.2} />
                      </filter>
                    </defs>
                    <path
                      d={arrowDef.path}
                      fill={color}
                      stroke={color}
                      strokeWidth={Math.max(1, thickness * 0.1)}
                      filter={handDrawnFilter}
                      style={{
                        filter: `url(#hand-drawn-${node.id})`,
                      }}
                    />
                  </>
                );
              }
            })()}
          </svg>
          <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
          <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Render text node - markdown-style text display
  if (isTextNode(node)) {
    const textContent = extractTextFromContent(node.content);
    // textSettings is already extracted above for Google Font loading

    const fontSizeMap = {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
      '4xl': '36px',
      '5xl': '48px',
      '6xl': '60px',
    };

    const fontStyleMap = {
      normal: 'normal',
      italic: 'italic',
      oblique: 'oblique',
    };

    const fontFamilyMap: Record<string, string> = {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Georgia, serif',
      mono: 'Monaco, monospace',
      roboto: '"Roboto", sans-serif',
      'open-sans': '"Open Sans", sans-serif',
      lato: '"Lato", sans-serif',
      montserrat: '"Montserrat", sans-serif',
      raleway: '"Raleway", sans-serif',
      poppins: '"Poppins", sans-serif',
      'source-sans': '"Source Sans Pro", sans-serif',
      nunito: '"Nunito", sans-serif',
      ubuntu: '"Ubuntu", sans-serif',
      'playfair-display': '"Playfair Display", serif',
      merriweather: '"Merriweather", serif',
      lora: '"Lora", serif',
      'crimson-text': '"Crimson Text", serif',
      'libre-baskerville': '"Libre Baskerville", serif',
      'pt-serif': '"PT Serif", serif',
      cormorant: '"Cormorant", serif',
      'roboto-mono': '"Roboto Mono", monospace',
      'source-code-pro': '"Source Code Pro", monospace',
      'fira-code': '"Fira Code", monospace',
      'jetbrains-mono': '"JetBrains Mono", monospace',
      inconsolata: '"Inconsolata", monospace',
      oswald: '"Oswald", sans-serif',
      'bebas-neue': '"Bebas Neue", sans-serif',
      'dancing-script': '"Dancing Script", cursive',
    };

    const fontSize = textSettings?.fontSize || 'base';
    const fontFamilySetting = textSettings?.fontFamily || 'sans';
    // googleFont is already extracted above for useEffect
    const fontStyle = textSettings?.fontStyle || 'normal';
    const textAlign = textSettings?.alignment || 'left';
    const lineHeight = textSettings?.lineHeight || 1.6;
    const letterSpacing = textSettings?.letterSpacing || 0;

    // Get the actual font family string - prefer Google Font if set
    const getFontFamily = () => {
      if (googleFont) {
        // Return Google Font format (font is already loaded by useEffect above)
        return `'${googleFont}', ${fontFamilySetting === 'serif' ? 'serif' : 'sans-serif'}`;
      }
      return fontFamilyMap[fontFamilySetting as keyof typeof fontFamilyMap] || fontFamilyMap.sans;
    };

    // Parse markdown-like formatting
    const renderMarkdownText = (text: string) => {
      if (!text) return null;
      
      // Split by lines and process markdown-like syntax
      const lines = text.split('\n');
      return lines.map((line, idx) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-2xl font-bold mb-2 mt-3 first:mt-0">{line.substring(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-xl font-bold mb-2 mt-3 first:mt-0">{line.substring(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-lg font-bold mb-1 mt-2 first:mt-0">{line.substring(4)}</h3>;
        }
        // Bold
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={idx} className="font-bold mb-2">{line.slice(2, -2)}</p>;
        }
        // Italic
        if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
          return <p key={idx} className="italic mb-2">{line.slice(1, -1)}</p>;
        }
        // Code block
        if (line.startsWith('`') && line.endsWith('`')) {
          return <code key={idx} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono block mb-2">{line.slice(1, -1)}</code>;
        }
        // Regular paragraph
        if (line.trim()) {
          return <p key={idx} className="mb-2">{line}</p>;
        }
        return <br key={idx} />;
      });
    };

    return (
      <NodeWrapper defaultWidth={400} defaultHeight={150}>
        <motion.div
          className={`relative bg-white border border-gray-300 shadow-md cursor-pointer transition-all duration-300 ${
            selected ? 'border-blue-500 ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '100%',
            height: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'visible',
          }}
        >
          {/* Inline editable text content */}
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editingContent}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleStopEditing}
              onKeyDown={(e) => {
                // Escape to cancel, Ctrl+Enter or Cmd+Enter to save and exit
                if (e.key === 'Escape') {
                  handleStopEditing();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  handleStopEditing();
                }
                // Prevent node dragging while editing
                e.stopPropagation();
              }}
              className="w-full h-full p-4 border-none outline-none resize-none bg-transparent text-gray-800"
              style={{
                fontSize: fontSizeMap[fontSize as keyof typeof fontSizeMap] || fontSizeMap.base,
                fontFamily: getFontFamily(),
                fontStyle: fontStyleMap[fontStyle as keyof typeof fontStyleMap] || 'normal',
                textAlign: textAlign,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
                boxSizing: 'border-box',
              }}
              placeholder="Start typing markdown..."
            />
          ) : (
            <div
              className="prose prose-sm max-w-none text-gray-800 flex-1 overflow-auto p-4 cursor-text"
              style={{
                fontSize: fontSizeMap[fontSize as keyof typeof fontSizeMap] || fontSizeMap.base,
                fontFamily: getFontFamily(),
                fontStyle: fontStyleMap[fontStyle as keyof typeof fontStyleMap] || 'normal',
                textAlign: textAlign,
                lineHeight: lineHeight,
                letterSpacing: `${letterSpacing}px`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
              }}
              onClick={(e) => {
                // Start editing on click (but not on handles)
                if (!(e.target as HTMLElement).closest('button, [data-handle]')) {
                  handleStartEditing();
                }
              }}
              onDoubleClick={(e) => {
                // Also support double-click
                e.stopPropagation();
                handleStartEditing();
              }}
            >
              {textContent ? renderMarkdownText(textContent) : (
                <span className="text-gray-400 italic">Start typing markdown...</span>
              )}
            </div>
          )}

          <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
          <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
        </motion.div>
      </NodeWrapper>
    );
  }

  // Default: Render as regular text/note node
  const textContent = extractTextFromContent(node.content);
  // textSettings is already extracted above for Google Font loading

  const fontSizeMap = {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
  };

  const fontFamilyMap: Record<string, string> = {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Monaco, monospace',
    roboto: '"Roboto", sans-serif',
    'open-sans': '"Open Sans", sans-serif',
    lato: '"Lato", sans-serif',
    montserrat: '"Montserrat", sans-serif',
    raleway: '"Raleway", sans-serif',
    poppins: '"Poppins", sans-serif',
    'source-sans': '"Source Sans Pro", sans-serif',
    nunito: '"Nunito", sans-serif',
    ubuntu: '"Ubuntu", sans-serif',
    'playfair-display': '"Playfair Display", serif',
    merriweather: '"Merriweather", serif',
    lora: '"Lora", serif',
    'crimson-text': '"Crimson Text", serif',
    'libre-baskerville': '"Libre Baskerville", serif',
    'pt-serif': '"PT Serif", serif',
    cormorant: '"Cormorant", serif',
    'roboto-mono': '"Roboto Mono", monospace',
    'source-code-pro': '"Source Code Pro", monospace',
    'fira-code': '"Fira Code", monospace',
    'jetbrains-mono': '"JetBrains Mono", monospace',
    inconsolata: '"Inconsolata", monospace',
    oswald: '"Oswald", sans-serif',
    'bebas-neue': '"Bebas Neue", sans-serif',
    'dancing-script': '"Dancing Script", cursive',
  };

  const fontStyleMap = {
    normal: 'normal',
    italic: 'italic',
    oblique: 'oblique',
  };

  const fontSize = textSettings?.fontSize || 'base';
  const fontFamilySetting = textSettings?.fontFamily || 'sans';
  // googleFont is already extracted above for useEffect
  const fontStyle = textSettings?.fontStyle || 'normal';
  const textAlign = textSettings?.alignment || 'left';
  const lineHeight = textSettings?.lineHeight || 1.6;
  const letterSpacing = textSettings?.letterSpacing || 0;

  // Get the actual font family string - prefer Google Font if set
  const getFontFamily = () => {
    if (googleFont) {
      // Return Google Font format (font is already loaded by useEffect above)
      return `'${googleFont}', ${fontFamilySetting === 'serif' ? 'serif' : 'sans-serif'}`;
    }
    return fontFamilyMap[fontFamilySetting as keyof typeof fontFamilyMap] || fontFamilyMap.sans;
  };

  return (
    <NodeWrapper defaultWidth={300} defaultHeight={150}>
      <motion.div
        className={`relative bg-white border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 p-4 ${
          selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
        }`}
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Title */}
        {displayLabel && (
          <div className="text-lg font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200 shrink-0">
            {displayLabel}
          </div>
        )}

        {/* Text Content */}
        <div
          className="text-gray-700 whitespace-pre-wrap break-words flex-1 overflow-auto"
          style={{
            fontSize: fontSizeMap[fontSize as keyof typeof fontSizeMap] || fontSizeMap.base,
            fontFamily: getFontFamily(),
            fontStyle: fontStyleMap[fontStyle as keyof typeof fontStyleMap] || 'normal',
            textAlign: textAlign,
            lineHeight: lineHeight,
            letterSpacing: `${letterSpacing}px`,
          }}
        >
          {textContent || (
            <span className="text-gray-400 italic">Start typing...</span>
          )}
      </div>
      
        {/* Tags - shown if showTags is true */}
        {showTags && node.tags && node.tags.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
            {node.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
                className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
            >
              {tag}
            </span>
          ))}
            {node.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                +{node.tags.length - 3}
              </span>
            )}
        </div>
      )}

        {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
          className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair"
        style={{
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
        }}
          title="Connect to this node"
      />
      <Handle
        type="source"
        position={Position.Bottom}
          className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair"
        style={{
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
        }}
          title="Drag to connect to another node"
      />
    </motion.div>
    </NodeWrapper>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: re-render if node title, tags, content, or selection changes
  return (
    prevProps.data.node.id === nextProps.data.node.id &&
    prevProps.data.node.title === nextProps.data.node.title &&
    JSON.stringify(prevProps.data.node.tags) === JSON.stringify(nextProps.data.node.tags) &&
    JSON.stringify(prevProps.data.node.content) === JSON.stringify(nextProps.data.node.content) &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.selected === nextProps.selected
  );
});
