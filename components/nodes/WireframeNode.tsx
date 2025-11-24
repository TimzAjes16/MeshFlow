/**
 * Wireframe Node Component
 * Renders a wireframe library/container
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Frame } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface WireframeNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface WireframeContent {
  type: 'wireframe';
  elements: Array<{ id: string; type: string; label: string }>;
}

function WireframeNode({ data, selected, id }: WireframeNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const wireframeContent: WireframeContent = typeof node.content === 'object' && node.content?.type === 'wireframe'
    ? node.content
    : { 
        type: 'wireframe', 
        elements: [],
      };

  const [elements, setElements] = useState(wireframeContent.elements || []);

  useEffect(() => {
    const updateWireframe = () => {
      updateNode(id, {
        content: {
          type: 'wireframe',
          elements,
        },
      });

      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            content: {
              type: 'wireframe',
              elements,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateWireframe, 500);
    return () => clearTimeout(timer);
  }, [id, elements, updateNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4 w-full h-full flex flex-col"
        style={{
          minWidth: node.width || 600,
          minHeight: node.height || 400,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Frame className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-sm text-gray-700">Wireframe</span>
        </div>
        <div className="flex-1 bg-white border border-gray-300 rounded p-4 overflow-auto">
          <div className="text-sm text-gray-500 text-center py-8">
            Wireframe canvas - drag UI elements here
          </div>
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(WireframeNode);

