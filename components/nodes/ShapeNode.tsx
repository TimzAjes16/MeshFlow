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
  const shapeConfig = typeof node.content === 'object' && node.content?.type === nodeType
    ? node.content
    : { fill: true, fillColor: '#ffffff', borderColor: '#000000', borderWidth: 1 };

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
    borderRadius: isCircle ? '50%' : '4px',
  };

  return (
    <BaseNode node={node} selected={selected} showHandles={false} nodeId={data.node.id}>
      <div 
        style={shapeStyle}
        className="shadow-sm"
      />
    </BaseNode>
  );
}

export default memo(ShapeNode);

