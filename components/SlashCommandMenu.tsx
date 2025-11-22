'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import {
  FileText,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Sparkles,
  Link2,
  Plus,
  Layers,
  Minus,
  MessageSquare,
} from 'lucide-react';

interface SlashCommand {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'format' | 'ai' | 'node' | 'visual';
  action: (editor: ReturnType<typeof useEditor>) => void;
  keywords?: string[];
}

interface SlashCommandMenuProps {
  editor: ReturnType<typeof useEditor> | null;
}

const slashCommands: SlashCommand[] = [
  // Formatting
  {
    id: 'text',
    title: 'Text',
    icon: FileText,
    category: 'format',
    keywords: ['text', 'paragraph'],
    action: (editor) => editor?.chain().focus().setParagraph().run(),
  },
  {
    id: 'h1',
    title: 'Heading 1',
    icon: Heading1,
    category: 'format',
    keywords: ['h1', 'heading', 'title'],
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    title: 'Heading 2',
    icon: Heading2,
    category: 'format',
    keywords: ['h2', 'heading', 'subtitle'],
    action: (editor) => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'bullet',
    title: 'Bullet List',
    icon: List,
    category: 'format',
    keywords: ['bullet', 'list', 'ul'],
    action: (editor) => editor?.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numbered',
    title: 'Numbered List',
    icon: ListOrdered,
    category: 'format',
    keywords: ['numbered', 'ordered', 'list', 'ol'],
    action: (editor) => editor?.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'todo',
    title: 'To-do List',
    icon: CheckSquare,
    category: 'format',
    keywords: ['todo', 'task', 'checkbox', 'check'],
    action: (editor) => {
      // TODO: Implement task list
      console.log('Todo list');
    },
  },
  {
    id: 'quote',
    title: 'Quote',
    icon: Quote,
    category: 'format',
    keywords: ['quote', 'blockquote'],
    action: (editor) => editor?.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'code',
    title: 'Code Block',
    icon: Code,
    category: 'format',
    keywords: ['code', 'codeblock'],
    action: (editor) => editor?.chain().focus().toggleCodeBlock().run(),
  },
  // AI Actions
  {
    id: 'ai-summarize',
    title: 'Summarize',
    icon: Sparkles,
    category: 'ai',
    keywords: ['summarize', 'summary', 'shorter'],
    action: (editor) => {
      // TODO: Implement AI summarize
      console.log('Summarize');
    },
  },
  {
    id: 'ai-expand',
    title: 'Expand',
    icon: Plus,
    category: 'ai',
    keywords: ['expand', 'more', 'detailed'],
    action: (editor) => {
      // TODO: Implement AI expand
      console.log('Expand');
    },
  },
  {
    id: 'ai-rewrite',
    title: 'Rewrite',
    icon: MessageSquare,
    category: 'ai',
    keywords: ['rewrite', 'rephrase', 'improve'],
    action: (editor) => {
      // TODO: Implement AI rewrite
      console.log('Rewrite');
    },
  },
  {
    id: 'ai-brainstorm',
    title: 'Brainstorm',
    icon: Layers,
    category: 'ai',
    keywords: ['brainstorm', 'ideas', 'variants'],
    action: (editor) => {
      // TODO: Implement AI brainstorm
      console.log('Brainstorm');
    },
  },
  // Node Actions
  {
    id: 'link-node',
    title: 'Link another node',
    icon: Link2,
    category: 'node',
    keywords: ['link', 'connect', 'node'],
    action: (editor) => {
      // TODO: Implement link node
      console.log('Link node');
    },
  },
  {
    id: 'sub-node',
    title: 'Create sub-node',
    icon: Plus,
    category: 'node',
    keywords: ['sub', 'child', 'create'],
    action: (editor) => {
      // TODO: Implement create sub-node
      console.log('Create sub-node');
    },
  },
  // Visual Blocks
  {
    id: 'divider',
    title: 'Divider',
    icon: Minus,
    category: 'visual',
    keywords: ['divider', 'separator', 'hr'],
    action: (editor) => {
      editor?.chain().focus().setHorizontalRule().run();
    },
  },
];

export default function SlashCommandMenu({ editor }: SlashCommandMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useCallback(() => {
    if (!query) return slashCommands;

    const lowerQuery = query.toLowerCase();
    return slashCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))
    );
  }, [query]);

  const commands = filteredCommands();
  const categories = {
    format: commands.filter((c) => c.category === 'format'),
    ai: commands.filter((c) => c.category === 'ai'),
    node: commands.filter((c) => c.category === 'node'),
    visual: commands.filter((c) => c.category === 'visual'),
  };

  useEffect(() => {
    if (!editor) return;

    const checkSlash = () => {
      const { selection, doc } = editor.state;
      const { $from } = selection;
      const textBefore = $from.nodeBefore?.textContent || '';
      const textAfter = doc.textBetween(Math.max(0, $from.pos - 20), $from.pos, ' ');
      
      // Check if user just typed "/" at the start of a line or after space
      const lastChar = textAfter.trim().slice(-1);
      const secondLastChar = textAfter.trim().slice(-2, -1);
      
      if (lastChar === '/' && (!secondLastChar || secondLastChar === ' ' || secondLastChar === '\n')) {
        const { view } = editor;
        try {
          const coords = view.coordsAtPos($from.pos);
          const editorElement = view.dom.closest('.ProseMirror') as HTMLElement;
          
          if (editorElement) {
            const editorRect = editorElement.getBoundingClientRect();
            setPosition({
              top: coords.bottom - editorRect.top + 5,
              left: coords.left - editorRect.left,
            });
          } else {
            setPosition({
              top: coords.bottom + 5,
              left: coords.left,
            });
          }
          
          setQuery('');
          setSelectedIndex(0);
          setIsOpen(true);
        } catch (e) {
          console.error('Error positioning slash menu:', e);
        }
      } else if (isOpen && textAfter.trim().endsWith('/')) {
        // Keep menu open and update query
        const queryMatch = textAfter.match(/\/([^/\s]*)$/);
        if (queryMatch) {
          setQuery(queryMatch[1] || '');
        }
      } else if (isOpen && !textAfter.includes('/')) {
        // Close menu if "/" is removed
        setIsOpen(false);
        setQuery('');
      }
    };

    editor.on('update', checkSlash);

    return () => {
      editor.off('update', checkSlash);
    };
  }, [editor, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % commands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (commands[selectedIndex]) {
          commands[selectedIndex].action(editor);
          setIsOpen(false);
          setQuery('');
          editor?.commands.focus();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        editor?.commands.focus();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        // Update query as user types
        setQuery((prev) => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commands, selectedIndex, editor]);

  if (!editor || !isOpen) return null;

  const handleSelect = (command: SlashCommand) => {
    command.action(editor);
    setIsOpen(false);
    setQuery('');
    editor.commands.focus();
  };

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      className="w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-gray-200">
        <div className="text-xs font-semibold text-black uppercase tracking-wider">
          / Commands
        </div>
        {query && (
          <div className="text-xs text-black mt-1">Search: {query}</div>
        )}
      </div>

      <div className="p-1">
        {categories.format.length > 0 && (
          <>
            <div className="px-2 py-1 text-xs font-semibold text-black uppercase tracking-wider">
              Format
            </div>
            {categories.format.map((cmd, idx) => {
              const globalIndex = commands.indexOf(cmd);
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedIndex === globalIndex
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cmd.title}</span>
                </button>
              );
            })}
          </>
        )}

        {categories.ai.length > 0 && (
          <>
            <div className="px-2 py-1 mt-2 text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              AI Assist
            </div>
            {categories.ai.map((cmd, idx) => {
              const globalIndex = commands.indexOf(cmd);
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedIndex === globalIndex
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cmd.title}</span>
                </button>
              );
            })}
          </>
        )}

        {categories.node.length > 0 && (
          <>
            <div className="px-2 py-1 mt-2 text-xs font-semibold text-black uppercase tracking-wider flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              Node Actions
            </div>
            {categories.node.map((cmd, idx) => {
              const globalIndex = commands.indexOf(cmd);
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedIndex === globalIndex
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cmd.title}</span>
                </button>
              );
            })}
          </>
        )}

        {categories.visual.length > 0 && (
          <>
            <div className="px-2 py-1 mt-2 text-xs font-semibold text-black uppercase tracking-wider">
              Visual Blocks
            </div>
            {categories.visual.map((cmd, idx) => {
              const globalIndex = commands.indexOf(cmd);
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    selectedIndex === globalIndex
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-black hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{cmd.title}</span>
                </button>
              );
            })}
          </>
        )}

        {commands.length === 0 && (
          <div className="px-2 py-4 text-sm text-black text-center">
            No commands found
          </div>
        )}
      </div>
    </div>
  );
}

