/**
 * Node Type Registry
 * Following Miro/Notion patterns: each node type has a unique identifier
 * and specific properties/configuration
 */

import type { Node as NodeType } from '@/types/Node';
import type { ComponentType } from 'react';

// Node type identifiers (similar to Notion block types or Miro widget types)
export type NodeTypeId = 
  | 'text'
  | 'note'
  | 'link'
  | 'image'
  | 'box'
  | 'circle'
  | 'bar-chart'
  | 'line-chart'
  | 'pie-chart'
  | 'area-chart'
  | 'emoji'
  | 'arrow'
  | 'live-capture'
  // Widget types for modular workspace
  | 'iframe-widget'
  | 'webview-widget'
  | 'live-capture-widget'
  | 'native-window-widget'
  // Tool types
  | 'timer'
  | 'voting'
  | 'frame'
  | 'card'
  | 'code-block'
  | 'sticker'
  | 'visual-note'
  | 'mind-map'
  | 'org-chart'
  | 'timeline'
  | 'wireframe';

// Node type definition (inspired by Notion's block structure)
export interface NodeTypeDefinition {
  id: NodeTypeId;
  label: string;
  icon?: ComponentType<any>;
  category: 'content' | 'shape' | 'chart' | 'media' | 'special';
  defaultProperties?: Record<string, any>;
  // Whether this node type has editable text content
  hasEditableText?: boolean;
  // Whether this node type is resizable
  isResizable?: boolean;
  // Whether this node type is rotatable
  isRotatable?: boolean;
}

// Node type registry (similar to Notion's block registry)
export const NODE_TYPE_REGISTRY: Record<NodeTypeId, NodeTypeDefinition> = {
  'text': {
    id: 'text',
    label: 'Text',
    category: 'content',
    hasEditableText: true,
    isResizable: true,
    defaultProperties: {},
  },
  'note': {
    id: 'note',
    label: 'Note',
    category: 'content',
    hasEditableText: true,
    isResizable: true,
    defaultProperties: {},
  },
  'link': {
    id: 'link',
    label: 'Link',
    category: 'content',
    hasEditableText: false,
    isResizable: true,
    defaultProperties: {},
  },
  'image': {
    id: 'image',
    label: 'Image',
    category: 'media',
    hasEditableText: false,
    isResizable: true,
    isRotatable: true,
    defaultProperties: {
      size: 'medium',
      alignment: 'center',
    },
  },
  'box': {
    id: 'box',
    label: 'Box',
    category: 'shape',
    hasEditableText: false,
    isResizable: true,
    isRotatable: true,
    defaultProperties: {
      fill: true,
      fillColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 1,
    },
  },
  'circle': {
    id: 'circle',
    label: 'Circle',
    category: 'shape',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      fill: true,
      fillColor: '#ffffff',
      borderColor: '#000000',
      borderWidth: 1,
    },
  },
  'bar-chart': {
    id: 'bar-chart',
    label: 'Bar Chart',
    category: 'chart',
    hasEditableText: false,
    isResizable: true,
    defaultProperties: {
      data: [],
      xKey: 'name',
      yKey: 'value',
      color: '#3b82f6',
      showGrid: true,
      showLegend: false,
    },
  },
  'line-chart': {
    id: 'line-chart',
    label: 'Line Chart',
    category: 'chart',
    hasEditableText: false,
    isResizable: true,
    defaultProperties: {
      data: [],
      xKey: 'name',
      yKey: 'value',
      color: '#3b82f6',
      showGrid: true,
      showLegend: false,
    },
  },
  'pie-chart': {
    id: 'pie-chart',
    label: 'Pie Chart',
    category: 'chart',
    hasEditableText: false,
    isResizable: true,
    defaultProperties: {
      data: [],
      color: '#3b82f6',
      showLegend: true,
    },
  },
  'area-chart': {
    id: 'area-chart',
    label: 'Area Chart',
    category: 'chart',
    hasEditableText: false,
    isResizable: true,
    defaultProperties: {
      data: [],
      xKey: 'name',
      yKey: 'value',
      color: '#3b82f6',
      showGrid: true,
      showLegend: false,
    },
  },
  'emoji': {
    id: 'emoji',
    label: 'Emoji',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    defaultProperties: {
      emoji: '😀',
    },
  },
  'arrow': {
    id: 'arrow',
    label: 'Arrow',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: true,
    defaultProperties: {
      direction: 'right',
      color: '#000000',
    },
  },
  'live-capture': {
    id: 'live-capture',
    label: 'Live Capture',
    category: 'media',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      imageUrl: '',
      cropArea: { x: 0, y: 0, width: 0, height: 0 },
      sourceUrl: '',
      captureHistory: [],
    },
  },
  // Widget types for modular workspace
  'iframe-widget': {
    id: 'iframe-widget',
    label: 'Web App (iframe)',
    category: 'media',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      url: '',
      allowFullScreen: true,
      sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
    },
  },
  'webview-widget': {
    id: 'webview-widget',
    label: 'Web App (webview)',
    category: 'media',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      url: '',
      allowFullScreen: true,
    },
  },
  'live-capture-widget': {
    id: 'live-capture-widget',
    label: 'Live Capture Widget',
    category: 'media',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      imageUrl: '',
      cropArea: { x: 0, y: 0, width: 0, height: 0 },
      sourceUrl: '',
      captureHistory: [],
      isLiveStream: true,
      interactive: false,
    },
  },
  'native-window-widget': {
    id: 'native-window-widget',
    label: 'Native App Widget',
    category: 'media',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      processName: '',
      windowTitle: '',
      windowHandle: undefined,
    },
  },
  // Tool types
  'timer': {
    id: 'timer',
    label: 'Timer',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      duration: 300,
      isRunning: false,
      timeRemaining: 300,
    },
  },
  'voting': {
    id: 'voting',
    label: 'Voting',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      question: '',
      options: [],
      votes: {},
    },
  },
  'frame': {
    id: 'frame',
    label: 'Frame',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      title: 'Frame',
      width: 800,
      height: 600,
    },
  },
  'card': {
    id: 'card',
    label: 'Card',
    category: 'content',
    hasEditableText: true,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      title: 'Card',
      description: '',
    },
  },
  'code-block': {
    id: 'code-block',
    label: 'Code Block',
    category: 'content',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      language: 'javascript',
      code: '',
    },
  },
  'sticker': {
    id: 'sticker',
    label: 'Sticker',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      emoji: '😀',
    },
  },
  'visual-note': {
    id: 'visual-note',
    label: 'Visual Note',
    category: 'content',
    hasEditableText: true,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      content: '',
    },
  },
  'mind-map': {
    id: 'mind-map',
    label: 'Mind Map',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      rootNode: { id: 'root', text: 'Central Idea' },
      nodes: [],
    },
  },
  'org-chart': {
    id: 'org-chart',
    label: 'Org Chart',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      rootNode: { id: 'root', name: 'CEO', role: '' },
      nodes: [],
    },
  },
  'timeline': {
    id: 'timeline',
    label: 'Timeline',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      events: [],
    },
  },
  'wireframe': {
    id: 'wireframe',
    label: 'Wireframe',
    category: 'special',
    hasEditableText: false,
    isResizable: true,
    isRotatable: false,
    defaultProperties: {
      elements: [],
    },
  },
};

/**
 * Get node type from node (backwards compatible with tag-based system)
 * Following Miro/Notion pattern: type should be explicit, but we support tags for migration
 */
export function getNodeType(node: NodeType): NodeTypeId {
  // First, check if node has explicit type in content
  if (node.content?.type && typeof node.content.type === 'string') {
    const type = node.content.type as NodeTypeId;
    if (type in NODE_TYPE_REGISTRY) {
      return type;
    }
  }

  // Fallback to tag-based detection (backwards compatibility)
  if (node.tags && node.tags.length > 0) {
    for (const tag of node.tags) {
      if (tag in NODE_TYPE_REGISTRY) {
        return tag as NodeTypeId;
      }
    }
  }

  // Default to 'note' if no type found
  return 'note';
}

/**
 * Get node type definition
 */
export function getNodeTypeDefinition(node: NodeType): NodeTypeDefinition {
  const type = getNodeType(node);
  return NODE_TYPE_REGISTRY[type];
}

/**
 * Check if node has editable text content
 */
export function hasEditableText(node: NodeType): boolean {
  const definition = getNodeTypeDefinition(node);
  return definition.hasEditableText ?? false;
}

/**
 * Get all node types by category
 */
export function getNodeTypesByCategory(category: NodeTypeDefinition['category']): NodeTypeId[] {
  return Object.values(NODE_TYPE_REGISTRY)
    .filter(def => def.category === category)
    .map(def => def.id);
}

/**
 * Check if node type is a chart
 */
export function isChartNode(node: NodeType): boolean {
  const type = getNodeType(node);
  return type === 'bar-chart' || type === 'line-chart' || type === 'pie-chart' || type === 'area-chart';
}

/**
 * Check if node type is a shape
 */
export function isShapeNode(node: NodeType): boolean {
  const type = getNodeType(node);
  return type === 'box' || type === 'circle';
}

/**
 * Check if node type is media
 */
export function isMediaNode(node: NodeType): boolean {
  const type = getNodeType(node);
  return type === 'image';
}

