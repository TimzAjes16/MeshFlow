/**
 * Node Type Registry
 * Following Notion/Miro pattern: each node type has its own renderer
 */

import TextNode from './TextNode';
import NoteNode from './NoteNode';
import ImageNode from './ImageNode';
import ShapeNode from './ShapeNode';
import ChartNode from './ChartNode';
import LiveCaptureNode from './LiveCaptureNode';
import type { ComponentType } from 'react';
import type { NodeProps } from 'reactflow';
import type { NodeTypeId } from '@/lib/nodeTypes';

export interface NodeRendererProps extends NodeProps {
  data: {
    node: any;
  };
}

// Node renderer registry (like Notion's block renderer registry)
export const NODE_RENDERERS: Record<NodeTypeId, ComponentType<NodeRendererProps>> = {
  'text': TextNode,
  'note': NoteNode,
  'link': NoteNode, // Links use note renderer for now
  'image': ImageNode,
  'box': ShapeNode,
  'circle': ShapeNode,
  'bar-chart': ChartNode,
  'line-chart': ChartNode,
  'pie-chart': ChartNode,
  'area-chart': ChartNode,
  'emoji': NoteNode, // Emoji uses note renderer for now
  'arrow': NoteNode, // Arrow uses note renderer for now
  'live-capture': LiveCaptureNode,
};

// Export individual components
export { default as TextNode } from './TextNode';
export { default as NoteNode } from './NoteNode';
export { default as ImageNode } from './ImageNode';
export { default as ShapeNode } from './ShapeNode';
export { default as ChartNode } from './ChartNode';
export { default as LiveCaptureNode } from './LiveCaptureNode';
export { default as BaseNode } from './BaseNode';

