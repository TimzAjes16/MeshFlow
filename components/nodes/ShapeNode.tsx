/**
 * Shape Node Component (Box & Circle)
 * Renders geometric shapes (like Miro shapes)
 */

import { memo } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { getNodeType } from '@/lib/nodeTypes';

interface ShapeNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

function ShapeNode({ data, selected }: ShapeNodeProps) {
  const { node } = data;
  const nodeType = getNodeType(node);
  const isCircle = nodeType === 'circle';
  
  // Extract shape config from content
  // Handle both new format (type: 'box'/'circle') and old format (type: 'shape' with shapeType)
  let shapeConfig: any = {};
  if (typeof node.content === 'object' && node.content) {
    if (node.content.type === nodeType) {
      // New format: content.type matches node type
      shapeConfig = node.content;
    } else if (node.content.type === 'shape' && (node.content as any).shapeType) {
      // Old format: type is 'shape' with shapeType property
      shapeConfig = {
        fill: true,
        fillColor: (node.content as any).fillColor || '#ffffff',
        borderColor: (node.content as any).strokeColor || '#000000',
        borderWidth: 1,
      };
    } else {
      // Fallback
      shapeConfig = { fill: true, fillColor: '#ffffff', borderColor: '#000000', borderWidth: 1 };
    }
  } else {
    shapeConfig = { fill: true, fillColor: '#ffffff', borderColor: '#000000', borderWidth: 1 };
  }

  const { 
    fill = true, 
    fillColor = '#ffffff', 
    borderColor = '#000000', 
    borderWidth = 1 
  } = shapeConfig;

  const width = node.width || 150;
  const height = node.height || (isCircle ? width : 100);

  const shapeStyle = {
    width: isCircle ? `${width}px` : `${width}px`,
    height: isCircle ? `${width}px` : `${height}px`,
    backgroundColor: fill ? fillColor : 'transparent',
    borderColor,
    borderWidth: `${borderWidth}px`,
    borderStyle: 'solid',
    borderRadius: isCircle ? '50%' : '6px',
  };

  return (
    <BaseNode node={node} selected={selected} nodeId={data.node.id}>
      <div 
        style={shapeStyle}
        className="transition-all duration-150 shadow-sm"
      />
    </BaseNode>
  );
}

export default memo(ShapeNode);

