/**
 * Visual Note Node Component
 * Renders a visual note with rich content
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface VisualNoteNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface VisualNoteContent {
  type: 'visual-note';
  content: string;
}

function VisualNoteNode({ data, selected, id }: VisualNoteNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const noteContent: VisualNoteContent = typeof node.content === 'object' && node.content?.type === 'visual-note'
    ? node.content
    : { 
        type: 'visual-note', 
        content: '',
      };

  const [content, setContent] = useState(noteContent.content || '');

  useEffect(() => {
    const updateNote = () => {
      updateNode(id, {
        content: {
          type: 'visual-note',
          content,
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
              type: 'visual-note',
              content,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateNote, 500);
    return () => clearTimeout(timer);
  }, [id, content, updateNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 w-full h-full flex flex-col"
        style={{
          minWidth: node.width || 300,
          minHeight: node.height || 200,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-yellow-700" />
          <span className="text-sm font-semibold text-yellow-800">Visual Note</span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your visual note here..."
          className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
          disabled={!selected}
        />
      </div>
    </BaseNode>
  );
}

export default memo(VisualNoteNode);

