/**
 * Card Node Component
 * Renders a card with title and description
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface CardNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface CardContent {
  type: 'card';
  title: string;
  description: string;
}

function CardNode({ data, selected, id }: CardNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const cardContent: CardContent = typeof node.content === 'object' && node.content?.type === 'card'
    ? node.content
    : { 
        type: 'card', 
        title: 'Card',
        description: '',
      };

  const [title, setTitle] = useState(cardContent.title || 'Card');
  const [description, setDescription] = useState(cardContent.description || '');

  useEffect(() => {
    const updateCard = () => {
      updateNode(id, {
        content: {
          type: 'card',
          title,
          description,
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
              type: 'card',
              title,
              description,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateCard, 500);
    return () => clearTimeout(timer);
  }, [id, title, description, updateNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id}>
      <div
        className="bg-white border-2 border-gray-200 rounded-lg p-4 w-full h-full flex flex-col gap-2 shadow-sm"
        style={{
          minWidth: node.width || 250,
          minHeight: node.height || 150,
        }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Card title..."
            className="flex-1 px-2 py-1 bg-transparent border-none text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-300 rounded"
            disabled={!selected}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add description..."
          className="flex-1 px-2 py-1 bg-transparent border-none text-sm text-gray-700 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 rounded"
          disabled={!selected}
        />
      </div>
    </BaseNode>
  );
}

export default memo(CardNode);

