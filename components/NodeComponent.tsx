/**
 * Node Component - Main entry point for all node types
 * Following Notion/Miro pattern: routes to type-specific renderer based on node type
 */

'use client';

import { memo } from 'react';
import { NodeProps } from 'reactflow';
import type { Node as NodeType } from '@/types/Node';
import { getNodeType } from '@/lib/nodeTypes';
import { NODE_RENDERERS } from './nodes';

interface NodeData {
  node: NodeType;
}

interface CustomNodeProps extends NodeProps {
  data: NodeData;
}

/**
 * Main Node Component
 * Routes to appropriate renderer based on node type (like Notion block router)
 */
function NodeComponent(props: CustomNodeProps) {
  const { data } = props;
  const { node } = data;
  
  // Get node type (supports both explicit type and tag-based for backwards compatibility)
  const nodeType = getNodeType(node);
  
  // Get appropriate renderer from registry
  const Renderer = NODE_RENDERERS[nodeType];
  
  if (!Renderer) {
    // Fallback to NoteNode if renderer not found
    console.warn(`No renderer found for node type: ${nodeType}, falling back to note`);
    const NoteRenderer = NODE_RENDERERS['note'];
    return <NoteRenderer {...props} />;
  }

  // Render with appropriate component
  return <Renderer {...props} />;
}

export default memo(NodeComponent);
