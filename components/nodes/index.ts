/**
 * Node Type Registry
 * Following Notion/Miro pattern: each node type has its own renderer
 */

import TextNode from './TextNode';
import NoteNode from './NoteNode';
import StickyNoteNode from './StickyNoteNode';
import ImageNode from './ImageNode';
import ShapeNode from './ShapeNode';
import ChartNode from './ChartNode';
import LiveCaptureNode from './LiveCaptureNode';
import ArrowNode from './ArrowNode';
import TimerNode from './TimerNode';
import VotingNode from './VotingNode';
import FrameNode from './FrameNode';
import CardNode from './CardNode';
import CodeBlockNode from './CodeBlockNode';
import StickerNode from './StickerNode';
import VisualNoteNode from './VisualNoteNode';
import MindMapNode from './MindMapNode';
import OrgChartNode from './OrgChartNode';
import TimelineNode from './TimelineNode';
import WireframeNode from './WireframeNode';
// Import widget components
import { IframeWidget, WebViewWidget, LiveCaptureWidget, NativeWindowWidget } from '../widgets';
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
  'arrow': ArrowNode,
  'live-capture': LiveCaptureNode,
  // Widget types for modular workspace
  'iframe-widget': IframeWidget,
  'webview-widget': WebViewWidget,
  'live-capture-widget': LiveCaptureWidget,
  'native-window-widget': NativeWindowWidget,
  // Tool types
  'timer': TimerNode,
  'voting': VotingNode,
  'frame': FrameNode,
  'card': CardNode,
  'code-block': CodeBlockNode,
  'sticker': StickerNode,
  'visual-note': VisualNoteNode,
  'mind-map': MindMapNode,
  'org-chart': OrgChartNode,
  'timeline': TimelineNode,
  'wireframe': WireframeNode,
};

// Extended registry for tool types that map to node types
export const TOOL_NODE_RENDERERS: Record<string, ComponentType<NodeRendererProps>> = {
  ...NODE_RENDERERS,
  'sticky-note': StickyNoteNode, // Sticky notes use special renderer
};

// Export individual components
export { default as TextNode } from './TextNode';
export { default as NoteNode } from './NoteNode';
export { default as ImageNode } from './ImageNode';
export { default as ShapeNode } from './ShapeNode';
export { default as ChartNode } from './ChartNode';
export { default as LiveCaptureNode } from './LiveCaptureNode';
export { default as ArrowNode } from './ArrowNode';
export { default as TimerNode } from './TimerNode';
export { default as VotingNode } from './VotingNode';
export { default as FrameNode } from './FrameNode';
export { default as CardNode } from './CardNode';
export { default as CodeBlockNode } from './CodeBlockNode';
export { default as StickerNode } from './StickerNode';
export { default as VisualNoteNode } from './VisualNoteNode';
export { default as MindMapNode } from './MindMapNode';
export { default as OrgChartNode } from './OrgChartNode';
export { default as TimelineNode } from './TimelineNode';
export { default as WireframeNode } from './WireframeNode';
export { default as BaseNode } from './BaseNode';

