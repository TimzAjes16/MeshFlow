'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { X, Tag, Sparkles, ArrowRight } from 'lucide-react';
import type { Node } from '@/types/Node';

export default function NodeEditorPanel() {
  const { selectedNodeId } = useCanvasStore();
  const { nodes, updateNode } = useWorkspaceStore();
  
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing your thoughts...',
      }),
    ],
    content: selectedNode?.content || '',
    onUpdate: ({ editor }) => {
      if (selectedNode) {
        updateNode(selectedNode.id, {
          content: editor.getJSON(),
        });
      }
    },
  });

  useEffect(() => {
    if (selectedNode) {
      setTitle(selectedNode.title);
      setTags(selectedNode.tags || []);
      
      if (editor) {
        editor.commands.setContent(selectedNode.content || '');
      }
    } else {
      setTitle('');
      setTags([]);
      if (editor) {
        editor.commands.clearContent();
      }
    }
  }, [selectedNode, editor]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (selectedNode) {
      updateNode(selectedNode.id, { title: value });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const newTags = [...tags, newTag.trim()];
      setTags(newTags);
      setNewTag('');
      if (selectedNode) {
        updateNode(selectedNode.id, { tags: newTags });
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    if (selectedNode) {
      updateNode(selectedNode.id, { tags: newTags });
    }
  };

  const handleSummarize = async () => {
    // TODO: Implement AI summarization
    console.log('Summarize clicked');
  };

  const handleExpandIdea = async () => {
    // TODO: Implement AI expansion
    console.log('Expand idea clicked');
  };

  if (!selectedNode) {
    return (
      <div className="w-80 h-full bg-white border-l border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm">Select a node to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Edit Node</h2>
        <button
          onClick={() => useCanvasStore.getState().selectNode(null)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Node title..."
            className="w-full px-3 py-2 text-lg font-semibold border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Rich Text Editor */}
        <div className="border border-gray-200 rounded-lg min-h-[200px]">
          <EditorContent editor={editor} className="prose prose-sm max-w-none p-3" />
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Tags</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>

        {/* AI Actions */}
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <button
            onClick={handleSummarize}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4 text-gray-600" />
            <span>Summarize with AI</span>
          </button>
          <button
            onClick={handleExpandIdea}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-gray-600" />
            <span>Expand idea</span>
          </button>
        </div>

        {/* Linked Nodes */}
        <div className="pt-4 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Linked Nodes</span>
          <div className="mt-2 text-sm text-gray-500">
            {/* TODO: Show linked nodes */}
            No linked nodes yet
          </div>
        </div>
      </div>
    </div>
  );
}
