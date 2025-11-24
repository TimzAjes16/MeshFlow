/**
 * Note Node Component
 * Renders note with editable title and markdown body
 * Auto-resizes to fit content
 */

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { FileText } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface NoteNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface NoteContent {
  type: 'note';
  title?: string;
  body?: any; // TipTap JSON or markdown string
}

function NoteNode({ data, selected, id }: NoteNodeProps) {
  const { node } = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const { selectedNodeId, selectNode } = useCanvasStore();
  const isSelected = selectedNodeId === id;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingBody, setIsEditingBody] = useState(false);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const titleUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Extract note content structure
  const noteContent: NoteContent = typeof node.content === 'object' && node.content?.type === 'note'
    ? node.content
    : { type: 'note', title: node.title || '', body: node.content || { type: 'doc', content: [{ type: 'paragraph' }] } };

  const noteTitle = noteContent.title || node.title || '';
  const noteBody = noteContent.body || { type: 'doc', content: [{ type: 'paragraph' }] };
  
  // Initialize TipTap editor for markdown body
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your note in markdown...',
      }),
    ],
    content: typeof noteBody === 'string' 
      ? noteBody 
      : (noteBody && typeof noteBody === 'object' && noteBody.type === 'doc'
          ? noteBody
          : { type: 'doc', content: [{ type: 'paragraph' }] }),
    editable: isSelected && isEditingBody, // Only editable when body is being edited
    onUpdate: ({ editor }) => {
      // Debounce updates
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      
      updateTimerRef.current = setTimeout(() => {
        const body = editor.getJSON();
        const newContent: NoteContent = {
          type: 'note',
          title: noteTitle,
          body,
        };
        updateNode(id, {
          content: newContent,
        });
        
        // Update dimensions
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const newWidth = Math.max(250, Math.min(400, rect.width + 32));
          const newHeight = Math.max(100, rect.height + 32);
          
          if (Math.abs((node.width || 300) - newWidth) > 5 || Math.abs((node.height || 150) - newHeight) > 5) {
            updateNode(id, {
              width: newWidth,
              height: newHeight,
            });
          }
        }
      }, 300);
    },
  });

  // Handle title updates
  const handleTitleChange = useCallback((newTitle: string) => {
    if (titleUpdateTimerRef.current) {
      clearTimeout(titleUpdateTimerRef.current);
    }
    
    titleUpdateTimerRef.current = setTimeout(() => {
      const newContent: NoteContent = {
        type: 'note',
        title: newTitle,
        body: noteBody,
      };
      updateNode(id, {
        title: newTitle,
        content: newContent,
      });
    }, 300);
  }, [id, noteBody, updateNode]);

  // Focus title when node is first selected (if title is empty)
  useEffect(() => {
    if (isSelected && editor) {
      // If title is empty, focus title first
      if (!noteTitle || noteTitle === 'New Note' || noteTitle === 'Untitled Note') {
        setIsEditingTitle(true);
        setIsEditingBody(false);
        setTimeout(() => {
          titleInputRef.current?.focus();
          titleInputRef.current?.select();
        }, 100);
      } else {
        // Otherwise, allow editing body
        setIsEditingBody(true);
        setIsEditingTitle(false);
        setTimeout(() => {
          if (editor && !editor.isDestroyed) {
            editor.commands.focus();
          }
        }, 100);
      }
    } else if (!isSelected) {
      setIsEditingTitle(false);
      setIsEditingBody(false);
      // Blur editor when deselected
      if (editor && !editor.isDestroyed && editor.isFocused) {
        editor.commands.blur();
      }
    }
  }, [isSelected, noteTitle, editor]);

  // Sync editor content when node content changes
  useEffect(() => {
    if (editor && !isEditingBody) {
      const currentContent = editor.getJSON();
      const nodeBody = typeof noteBody === 'string' 
        ? noteBody 
        : (noteBody && typeof noteBody === 'object' && noteBody.type === 'doc'
            ? noteBody
            : { type: 'doc', content: [{ type: 'paragraph' }] });
      
      if (JSON.stringify(currentContent) !== JSON.stringify(nodeBody)) {
        editor.commands.setContent(nodeBody);
      }
    }
  }, [noteBody, editor, isEditingBody]);

  // Track last dimensions we set to prevent infinite loops
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // Measure content and update node dimensions
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          const newWidth = Math.max(250, Math.min(400, width + 32));
          const newHeight = Math.max(100, height + 32);
          
          // Only update if dimensions changed significantly AND we didn't just set these values
          const lastDims = lastDimensionsRef.current;
          if (
            (!lastDims || Math.abs(lastDims.width - newWidth) > 5 || Math.abs(lastDims.height - newHeight) > 5) &&
            (Math.abs((node.width || 300) - newWidth) > 5 || Math.abs((node.height || 150) - newHeight) > 5)
          ) {
            lastDimensionsRef.current = { width: newWidth, height: newHeight };
            updateNode(id, {
              width: newWidth,
              height: newHeight,
            });
          }
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (updateTimerRef.current) {
          clearTimeout(updateTimerRef.current);
        }
        if (titleUpdateTimerRef.current) {
          clearTimeout(titleUpdateTimerRef.current);
        }
      };
    }
    // Remove node.width and node.height from dependencies to prevent infinite loops
    // Only re-run when the node ID changes or when content changes (handled by containerRef)
  }, [id, updateNode]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      setIsEditingTitle(true);
      setIsEditingBody(false);
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 50);
    }
  }, [isSelected]);

  const handleBodyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected && !isEditingBody) {
      setIsEditingBody(true);
      setIsEditingTitle(false);
      setTimeout(() => {
        editor?.commands.focus();
      }, 50);
    }
  }, [isSelected, isEditingBody, editor]);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingTitle(false);
      setIsEditingBody(true);
      setTimeout(() => {
        editor?.commands.focus();
      }, 50);
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  }, [editor]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // First, ensure node is selected (this will trigger FloatingNodeEditor to appear)
    if (!selected) {
      selectNode(id);
      // Dispatch scroll event for sidebar
      window.dispatchEvent(new CustomEvent('scrollToNode', { detail: { nodeId: id } }));
    }
    // Then stop propagation to prevent React Flow from handling it again
    e.stopPropagation();
  }, [selected, id, selectNode]);

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div 
        ref={containerRef}
        className="p-3 min-w-[250px] max-w-[400px] bg-yellow-50/50 rounded-md border border-yellow-200/50 transition-all duration-150 hover:border-yellow-300/50"
        style={{ 
          width: node.width ? `${node.width}px` : 'fit-content', 
          maxWidth: node.width ? `${node.width}px` : '400px',
          height: node.height ? `${node.height}px` : 'auto',
        }}
        onClick={handleContainerClick}
      >
        {/* Title Section */}
        <div className="flex items-start gap-2 mb-3">
          <FileText className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
          {isEditingTitle && isSelected ? (
            <input
              ref={titleInputRef}
              type="text"
              value={noteTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Note title..."
              className="flex-1 font-semibold text-black text-sm bg-transparent border-b-2 border-yellow-400 focus:outline-none focus:border-yellow-600 pb-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 
              className="font-semibold text-black text-sm break-words cursor-text flex-1"
              onClick={handleTitleClick}
            >
              {noteTitle || 'Untitled Note'}
            </h3>
          )}
        </div>

        {/* Body Section */}
        {editor && (
          <div 
            className="text-sm text-black mt-2 min-h-[60px] cursor-text"
            onClick={handleBodyClick}
          >
            <EditorContent 
              editor={editor} 
              className="prose prose-sm max-w-none focus:outline-none"
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(NoteNode);
