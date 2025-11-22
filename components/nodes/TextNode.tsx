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
import { useCanvasStore } from '@/state/canvasStore';
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
  const { selectNode } = useCanvasStore();
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
    editable: selected, // Make editable immediately when selected
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

  // Enable editing and focus when node is selected
  useEffect(() => {
    if (selected && editor) {
      setIsEditing(true);
      // Focus editor after a brief delay to ensure it's mounted
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.focus();
        }
      }, 100);
    } else if (!selected) {
      setIsEditing(false);
      // Blur editor when deselected
      if (editor && !editor.isDestroyed && editor.isFocused) {
        editor.commands.blur();
      }
    }
  }, [selected, editor]);

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

  // Track last dimensions we set to prevent infinite loops
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // Measure content and update node dimensions
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          const newWidth = Math.max(200, Math.min(400, width + 32));
          const newHeight = Math.max(60, height + 32);
          
          // Only update if dimensions changed significantly AND we didn't just set these values
          const lastDims = lastDimensionsRef.current;
          if (
            (!lastDims || Math.abs(lastDims.width - newWidth) > 5 || Math.abs(lastDims.height - newHeight) > 5) &&
            (Math.abs((node.width || 200) - newWidth) > 5 || Math.abs((node.height || 60) - newHeight) > 5)
          ) {
            lastDimensionsRef.current = { width: newWidth, height: newHeight };
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
    // Remove node.width and node.height from dependencies to prevent infinite loops
    // Only re-run when the node ID changes or when content changes (handled by contentRef)
  }, [id, updateNode]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // First, ensure node is selected (this will trigger FloatingNodeEditor to appear)
    if (!selected) {
      selectNode(id);
      // Dispatch scroll event for sidebar
      window.dispatchEvent(new CustomEvent('scrollToNode', { detail: { nodeId: id } }));
    }
    
    // Then stop propagation to prevent React Flow from handling it again
    e.stopPropagation();
    
    // Focus editor if already selected
    if (selected && editor && !editor.isDestroyed) {
      setIsEditing(true);
      setTimeout(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.focus();
        }
      }, 50);
    }
  }, [selected, editor, id, selectNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id}>
      <div 
        ref={contentRef}
        onClick={handleClick}
        className="p-4 min-w-[200px] max-w-[400px] bg-white rounded-lg shadow-sm border border-gray-200 cursor-text"
        style={{ 
          width: node.width ? `${node.width}px` : 'fit-content', 
          maxWidth: node.width ? `${node.width}px` : '400px',
          height: node.height ? `${node.height}px` : 'auto',
        }}
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

