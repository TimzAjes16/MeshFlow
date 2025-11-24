/**
 * Arrow Node Component
 * Renders an arrow shape with configurable direction and color
 */

import { memo } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { ArrowRight, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';

interface ArrowNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface ArrowContent {
  type: 'arrow';
  direction?: 'up' | 'right' | 'down' | 'left';
  color?: string;
}

function ArrowNode({ data, selected }: ArrowNodeProps) {
  const { node } = data;
  
  // Extract arrow config from content
  const arrowContent: ArrowContent = typeof node.content === 'object' && node.content?.type === 'arrow'
    ? node.content
    : { type: 'arrow', direction: 'right', color: '#000000' };

  const { 
    direction = 'right', 
    color = '#000000' 
  } = arrowContent;

  const width = node.width || 100;
  const height = node.height || 100;

  // Get the appropriate arrow icon based on direction
  const getArrowIcon = () => {
    const iconProps = {
      className: 'w-full h-full',
      style: { color },
    };

    switch (direction) {
      case 'up':
        return <ArrowUp {...iconProps} />;
      case 'down':
        return <ArrowDown {...iconProps} />;
      case 'left':
        return <ArrowLeft {...iconProps} />;
      case 'right':
      default:
        return <ArrowRight {...iconProps} />;
    }
  };

  return (
    <BaseNode node={node} selected={selected}  nodeId={node.id}>
      <div 
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        className="shadow-sm"
      >
        {getArrowIcon()}
      </div>
    </BaseNode>
  );
}

export default memo(ArrowNode);



