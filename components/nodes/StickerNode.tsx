/**
 * Sticker Node Component
 * Renders an emoji/sticker display
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Smile } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface StickerNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface StickerContent {
  type: 'sticker';
  emoji: string;
}

function StickerNode({ data, selected, id }: StickerNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const stickerContent: StickerContent = typeof node.content === 'object' && node.content?.type === 'sticker'
    ? node.content
    : { 
        type: 'sticker', 
        emoji: '😀',
      };

  const [emoji, setEmoji] = useState(stickerContent.emoji || '😀');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const updateSticker = () => {
      updateNode(id, {
        content: {
          type: 'sticker',
          emoji,
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
              type: 'sticker',
              emoji,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateSticker, 500);
    return () => clearTimeout(timer);
  }, [id, emoji, updateNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-white border-2 border-gray-200 rounded-lg w-full h-full flex items-center justify-center"
        style={{
          minWidth: node.width || 100,
          minHeight: node.height || 100,
        }}
        onClick={() => selected && setIsEditing(true)}
      >
        {isEditing && selected ? (
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditing(false);
              }
            }}
            className="text-6xl text-center bg-transparent border-none focus:outline-none w-full"
            maxLength={2}
            autoFocus
          />
        ) : (
          <span className="text-6xl">{emoji}</span>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(StickerNode);

