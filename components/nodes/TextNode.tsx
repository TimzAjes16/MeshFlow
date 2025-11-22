/**
 * Text Node Component
 * Renders rich text content with inline editing (like whiteboard app)
 * Auto-resizes to fit content
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface TextNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

function TextNode({ data, selected, id }: TextNodeProps) {
  const { node } = data;
  const contentRef = useRef<HTMLDivElement>(null);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const [isEditing, setIsEditing] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize TipTap editor for inline editing
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
    ],
    content: typeof node.content === 'string' 
      ? node.content 
      : (node.content && typeof node.content === 'object' && node.content.type === 'doc'
          ? node.content
          : { type: 'doc', content: [{ type: 'paragraph' }] }),
    editable: selected && isEditing,
    onUpdate: ({ editor }) => {
      // Debounce updates
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      
      updateTimerRef.current = setTimeout(() => {
        const content = editor.getJSON();
        updateNode(id, {
          content,
        });
        
        // Update dimensions
        if (contentRef.current) {
          const rect = contentRef.current.getBoundingClientRect();
          const newWidth = Math.max(200, Math.min(400, rect.width + 32));
          const newHeight = Math.max(60, rect.height + 32);
          
          if (Math.abs((node.width || 200) - newWidth) > 5 || Math.abs((node.height || 60) - newHeight) > 5) {
            updateNode(id, {
              width: newWidth,
              height: newHeight,
            });
          }
        }
      }, 300);
    },
  });

  // Enable editing when node is selected
  useEffect(() => {
    if (selected && !isEditing) {
      setIsEditing(true);
      // Focus editor after a brief delay to ensure it's mounted
      setTimeout(() => {
        editor?.commands.focus();
      }, 100);
    } else if (!selected && isEditing) {
      setIsEditing(false);
    }
  }, [selected, isEditing, editor]);

  // Sync editor content when node content changes (from external updates)
  useEffect(() => {
    if (editor && !isEditing) {
      const currentContent = editor.getJSON();
      const nodeContent = typeof node.content === 'string' 
        ? node.content 
        : (node.content && typeof node.content === 'object' && node.content.type === 'doc'
            ? node.content
            : { type: 'doc', content: [{ type: 'paragraph' }] });
      
      if (JSON.stringify(currentContent) !== JSON.stringify(nodeContent)) {
        editor.commands.setContent(nodeContent);
      }
    }
  }, [node.content, editor, isEditing]);

  // Measure content and update node dimensions
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          const newWidth = Math.max(200, Math.min(400, width + 32));
          const newHeight = Math.max(60, height + 32);
          
          if (Math.abs((node.width || 200) - newWidth) > 5 || Math.abs((node.height || 60) - newHeight) > 5) {
            updateNode(id, {
              width: newWidth,
              height: newHeight,
            });
          }
        }
      });

      resizeObserver.observe(contentRef.current);

      return () => {
        resizeObserver.disconnect();
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
        }
      };
    }
  }, [id, node.width, node.height, updateNode]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent React Flow from handling the click
    if (selected && !isEditing) {
      setIsEditing(true);
      setTimeout(() => {
        editor?.commands.focus();
      }, 100);
    }
  }, [selected, isEditing, editor]);

  return (
    <BaseNode node={node} selected={selected}>
      <div 
        ref={contentRef}
        onClick={handleClick}
        className="p-4 min-w-[200px] max-w-[400px] bg-white rounded-lg shadow-sm border border-gray-200 cursor-text"
        style={{ width: 'fit-content', maxWidth: '400px' }}
      >
        {editor && (
          <EditorContent 
            editor={editor} 
            className="prose prose-sm max-w-none focus:outline-none"
          />
        )}
      </div>
    </BaseNode>
  );
}

export default memo(TextNode);

