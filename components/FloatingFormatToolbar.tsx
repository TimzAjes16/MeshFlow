'use client';

import { useEditor } from '@tiptap/react';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, CheckSquare, Quote, Code, Sparkles } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface FloatingFormatToolbarProps {
  editor: ReturnType<typeof useEditor> | null;
}

export default function FloatingFormatToolbar({ editor }: FloatingFormatToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateToolbar = () => {
      const { from, to } = editor.state.selection;
      
      // Only show if there's a selection and it's not empty
      if (from !== to && from < to) {
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        
        // Position toolbar above selection using viewport coordinates
        // This works better than relative positioning
        const top = start.top - 10;
        const left = (start.left + end.left) / 2;
        
        // Ensure toolbar stays within viewport bounds
        const toolbarHeight = 40;
        const finalTop = Math.max(toolbarHeight + 10, top);
        const finalLeft = Math.max(100, Math.min(left, window.innerWidth - 100));
        
        setPosition({ top: finalTop, left: finalLeft });
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('update', updateToolbar);

    // Hide on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      editor.off('selectionUpdate', updateToolbar);
      editor.off('update', updateToolbar);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editor]);

  if (!editor || !isVisible) return null;

  const toolbarStyle: React.CSSProperties = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translate(-50%, -100%)',
    zIndex: 9999,
    pointerEvents: 'auto',
  };

  return (
    <div
      ref={toolbarRef}
      style={toolbarStyle}
      className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('bold') ? 'bg-gray-100' : ''
        }`}
        title="Bold (Cmd+B)"
      >
        <Bold className="w-4 h-4 text-gray-700" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('italic') ? 'bg-gray-100' : ''
        }`}
        title="Italic (Cmd+I)"
      >
        <Italic className="w-4 h-4 text-gray-700" />
      </button>
      
      <div className="w-px h-6 bg-gray-200 mx-0.5" />
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('heading', { level: 1 }) ? 'bg-gray-100' : ''
        }`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4 text-gray-700" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('heading', { level: 2 }) ? 'bg-gray-100' : ''
        }`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4 text-gray-700" />
      </button>
      
      <div className="w-px h-6 bg-gray-200 mx-0.5" />
      
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('bulletList') ? 'bg-gray-100' : ''
        }`}
        title="Bullet List"
      >
        <List className="w-4 h-4 text-gray-700" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('orderedList') ? 'bg-gray-100' : ''
        }`}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4 text-gray-700" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('blockquote') ? 'bg-gray-100' : ''
        }`}
        title="Quote"
      >
        <Quote className="w-4 h-4 text-gray-700" />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
          editor.isActive('codeBlock') ? 'bg-gray-100' : ''
        }`}
        title="Code Block"
      >
        <Code className="w-4 h-4 text-gray-700" />
      </button>
      
      <div className="w-px h-6 bg-gray-200 mx-0.5" />
      
      <button
        onClick={() => {
          // TODO: Open AI actions menu
          console.log('AI actions');
        }}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        title="AI Actions"
      >
        <Sparkles className="w-4 h-4 text-purple-600" />
      </button>
    </div>
  );
}

