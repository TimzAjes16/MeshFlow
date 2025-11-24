/**
 * Frame Node Component
 * Renders a container/frame for grouping elements
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Frame } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface FrameNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface FrameContent {
  type: 'frame';
  title: string;
  width: number;
  height: number;
}

function FrameNode({ data, selected, id }: FrameNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const frameContent: FrameContent = typeof node.content === 'object' && node.content?.type === 'frame'
    ? node.content
    : { 
        type: 'frame', 
        title: 'Frame',
        width: 800,
        height: 600,
      };

  const [title, setTitle] = useState(frameContent.title || 'Frame');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    const updateFrame = () => {
      updateNode(id, {
        content: {
          type: 'frame',
          title,
          width: node.width || 800,
          height: node.height || 600,
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
              type: 'frame',
              title,
              width: node.width || 800,
              height: node.height || 600,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateFrame, 500);
    return () => clearTimeout(timer);
  }, [id, title, node.width, node.height, updateNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id}>
      <div
        className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 w-full h-full flex flex-col"
        style={{
          minWidth: node.width || 800,
          minHeight: node.height || 600,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Frame className="w-4 h-4 text-gray-600" />
          {isEditingTitle && selected ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingTitle(false);
                }
              }}
              className="flex-1 px-2 py-1 bg-white border border-gray-300 rounded text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
              autoFocus
            />
          ) : (
            <h3
              className="text-sm font-semibold text-gray-700 cursor-pointer"
              onClick={() => selected && setIsEditingTitle(true)}
            >
              {title}
            </h3>
          )}
        </div>
        <div className="flex-1 text-gray-500 text-xs text-center flex items-center justify-center">
          Frame container - drag elements here
        </div>
      </div>
    </BaseNode>
  );
}

export default memo(FrameNode);

