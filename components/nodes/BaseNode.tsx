/**
 * Base Node Component
 * Following Notion/Miro pattern: all nodes share common base functionality
 * but have type-specific rendering
 */

import { memo, ReactNode } from 'react';
import { Handle, Position } from 'reactflow';
import type { Node as NodeType } from '@/types/Node';

export interface BaseNodeProps {
  node: NodeType;
  selected?: boolean;
  children: ReactNode;
  showHandles?: boolean;
}

/**
 * Base wrapper for all node types
 * Provides common functionality like handles, selection states, etc.
 */
function BaseNode({ node, selected = false, children, showHandles = true }: BaseNodeProps) {
  return (
    <div
      className={`
        relative
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        width: node.width || 'auto',
        height: node.height || 'auto',
        minWidth: node.width ? undefined : '200px',
        minHeight: node.height ? undefined : '60px',
      }}
    >
      {showHandles && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
          <Handle
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
          <Handle
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-blue-500 border-2 border-white"
          />
        </>
      )}
      {children}
    </div>
  );
}

export default memo(BaseNode);

