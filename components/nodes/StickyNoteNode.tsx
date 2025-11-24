/**
 * Sticky Note Node Component
 * Renders sticky notes with editable text (like Miro sticky notes)
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface StickyNoteNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface StickyNoteContent {
  type: 'note' | 'sticky-note';
  color?: string;
  text?: string;
  title?: string;
  body?: any;
}

function StickyNoteNode({ data, selected, id }: StickyNoteNodeProps) {
  const { node } = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const { selectedNodeId } = useCanvasStore();
  const isSelected = selectedNodeId === id;
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Extract sticky note content
  const stickyContent: StickyNoteContent = typeof node.content === 'object' && node.content
    ? (node.content as any)
    : { type: 'note', color: '#FFEB3B', text: '' };

  const stickyColor = stickyContent.color || '#FFEB3B';
  const noteText = stickyContent.text || stickyContent.title || '';
  
  // Initialize TipTap editor for editable text
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write something...',
      }),
    ],
    content: stickyContent.body && typeof stickyContent.body === 'object' && stickyContent.body.type === 'doc'
      ? stickyContent.body
      : noteText
      ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: noteText }] }] }
      : { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: isSelected,
    onUpdate: ({ editor }) => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      
      updateTimerRef.current = setTimeout(() => {
        const body = editor.getJSON();
        const text = editor.getText();
        const newContent: StickyNoteContent = {
          type: 'note',
          color: stickyColor,
          text,
          body,
        };
        updateNode(id, {
          content: newContent,
        });
        
        // Auto-resize based on content
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const newWidth = Math.max(200, Math.min(300, rect.width));
          const newHeight = Math.max(150, rect.height + 20);
          
          if (Math.abs((node.width || 250) - newWidth) > 5 || Math.abs((node.height || 200) - newHeight) > 5) {
            updateNode(id, {
              width: newWidth,
              height: newHeight,
            });
          }
        }
      }, 300);
    },
  });

  // Enable editing when selected
  useEffect(() => {
    if (isSelected && editor) {
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.setEditable(true);
          editor.commands.focus();
        }
      }, 100);
    } else if (!isSelected && editor) {
      editor.setEditable(false);
      if (editor.isFocused) {
        editor.commands.blur();
      }
    }
  }, [isSelected, editor]);

  // Sync editor content when node content changes externally
  useEffect(() => {
    if (editor && !isSelected) {
      const currentContent = editor.getJSON();
      const nodeBody = stickyContent.body;
      const nodeText = stickyContent.text || '';
      
      if (nodeBody && typeof nodeBody === 'object' && nodeBody.type === 'doc') {
        const nodeContentStr = JSON.stringify(nodeBody);
        const currentContentStr = JSON.stringify(currentContent);
        if (nodeContentStr !== currentContentStr) {
          editor.commands.setContent(nodeBody);
        }
      } else if (nodeText && editor.getText() !== nodeText) {
        editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: nodeText }] }] });
      }
    }
  }, [stickyContent.body, stickyContent.text, editor, isSelected]);

  const width = node.width || 250;
  const height = node.height || 200;

  return (
    <BaseNode node={node} selected={selected} showHandles={false} nodeId={id}>
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          minHeight: `${height}px`,
          backgroundColor: stickyColor,
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transform: 'rotate(-1deg)',
          transition: 'transform 0.1s ease',
        }}
        className="hover:rotate-0"
      >
        <EditorContent 
          editor={editor}
          className="prose prose-sm max-w-none focus:outline-none"
          style={{
            color: '#333',
            fontSize: '14px',
            lineHeight: '1.5',
            minHeight: '50px',
          }}
        />
      </div>
    </BaseNode>
  );
}

export default memo(StickyNoteNode);

