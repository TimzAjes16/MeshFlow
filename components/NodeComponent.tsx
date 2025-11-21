'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import type { Node as NodeType } from '@/types/Node';
import { getNodeColor } from '@/lib/nodeColors';
import { BarChartNode, LineChartNode, PieChartNode, AreaChartNode } from './charts';
import { useCanvasStore } from '@/state/canvasStore';
import { Image as ImageIcon } from 'lucide-react';

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

export default memo(function NodeComponent({ data, selected }: NodeProps<NodeData>) {
  const { label, node } = data;
  const showTags = useCanvasStore((state) => state.showTags);
  const color = getNodeColor(node);
  const chartType = getChartType(node);
  const isChart = isChartNode(node);
  
  // Use node.title directly for real-time updates (fallback to label if title not available)
  const displayLabel = node.title || label || 'Untitled';
  
  // Get chart config from node content
  const chartConfig = node.content && typeof node.content === 'object' && 'chart' in node.content
    ? (node.content as any).chart
    : null;

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
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className={`relative bg-white border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 ${
            selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
          style={{
            width: '400px',
            height: '300px',
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
      </motion.div>
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
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative"
    >
      <motion.div
          className={`relative bg-white border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 p-4 ${
            selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
          style={{
            minWidth: '200px',
            minHeight: '150px',
          }}
        >
          {imageUrl ? (
            <div
              className={`${sizeClasses[imageSize]} ${alignmentClasses[alignment]}`}
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
      </motion.div>
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
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className={`relative shadow-lg cursor-pointer transition-all duration-300 p-4 ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '250px',
            minHeight: '150px',
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
      </motion.div>
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
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className={`relative shadow-lg cursor-pointer transition-all duration-300 p-6 flex flex-col items-center justify-center ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            width: '200px',
            height: '200px',
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
      </motion.div>
    );
  }

  // Render note node - sticky note shape with folded corner
  if (isNoteNode(node)) {
    const textContent = extractTextFromContent(node.content);
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className={`relative bg-yellow-50 border-2 shadow-lg cursor-pointer transition-all duration-300 p-4 ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
            minWidth: '220px',
            minHeight: '180px',
            maxWidth: '280px',
            transform: 'rotate(-1deg)',
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
      </motion.div>
    );
  }

  // Render link node - bookmark/link shape
  if (isLinkNode(node)) {
    const textContent = extractTextFromContent(node.content);
    const linkUrl = typeof node.content === 'string' ? node.content : textContent;
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className={`relative bg-blue-50 border-2 border-blue-300 shadow-lg cursor-pointer transition-all duration-300 p-3 ${
            selected ? 'ring-2 ring-blue-200' : ''
          }`}
          style={{
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
      </motion.div>
    );
  }

  // Render text node - markdown-style text display
  if (isTextNode(node)) {
    const textContent = extractTextFromContent(node.content);
    const textSettings = node.content && typeof node.content === 'object' && 'textSettings' in node.content
      ? (node.content as any).textSettings
      : null;

    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      xlarge: '20px',
    };

    const fontFamilyMap = {
      sans: 'Inter, system-ui, sans-serif',
      serif: 'Georgia, serif',
      mono: 'Monaco, monospace',
    };

    const fontSize = textSettings?.fontSize || 'medium';
    const fontFamily = textSettings?.fontFamily || 'sans';
    const textAlign = textSettings?.alignment || 'left';
    const lineHeight = textSettings?.lineHeight || 1.6;
    const letterSpacing = textSettings?.letterSpacing || 0;

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
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className={`relative bg-white border border-gray-300 shadow-md cursor-pointer transition-all duration-300 p-4 ${
            selected ? 'border-blue-500 ring-2 ring-blue-200' : ''
          }`}
          style={{
            minWidth: '300px',
            maxWidth: '500px',
            minHeight: '100px',
          }}
        >
          {/* Markdown-style text content */}
          <div
            className="prose prose-sm max-w-none text-gray-800"
            style={{
              fontSize: fontSizeMap[fontSize],
              fontFamily: fontFamilyMap[fontFamily],
              textAlign: textAlign,
              lineHeight: lineHeight,
              letterSpacing: `${letterSpacing}px`,
            }}
          >
            {textContent ? renderMarkdownText(textContent) : (
              <span className="text-gray-400 italic">Start typing markdown...</span>
            )}
          </div>

          <Handle type="target" position={Position.Top} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Connect to this node" />
          <Handle type="source" position={Position.Bottom} className="w-4 h-4 bg-white border-2 border-blue-500 rounded-full opacity-60 hover:opacity-100 hover:scale-125 transition-all cursor-crosshair" style={{ boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)' }} title="Drag to connect to another node" />
        </motion.div>
      </motion.div>
    );
  }

  // Default: Render as regular text/note node
  const textContent = extractTextFromContent(node.content);
  const textSettings = node.content && typeof node.content === 'object' && 'textSettings' in node.content
    ? (node.content as any).textSettings
    : null;

  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
    xlarge: '20px',
  };

  const fontFamilyMap = {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Monaco, monospace',
  };

  const fontSize = textSettings?.fontSize || 'medium';
  const fontFamily = textSettings?.fontFamily || 'sans';
  const textAlign = textSettings?.alignment || 'left';
  const lineHeight = textSettings?.lineHeight || 1.6;
  const letterSpacing = textSettings?.letterSpacing || 0;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative"
    >
      <motion.div
        className={`relative bg-white border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 p-4 ${
          selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
        }`}
        style={{
          minWidth: '200px',
          maxWidth: '400px',
          minHeight: '100px',
        }}
      >
        {/* Title */}
        {displayLabel && (
          <div className="text-lg font-semibold text-gray-900 mb-2 pb-2 border-b border-gray-200">
            {displayLabel}
          </div>
        )}

        {/* Text Content */}
        <div
          className="text-gray-700 whitespace-pre-wrap break-words"
          style={{
            fontSize: fontSizeMap[fontSize],
            fontFamily: fontFamilyMap[fontFamily],
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
    </motion.div>
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
