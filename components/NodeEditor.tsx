'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Save } from 'lucide-react';
import type { Node } from 'reactflow';

interface NodeEditorProps {
  node: Node;
  onClose: () => void;
  onUpdate: (nodeId: string, title: string, content: string) => void;
  onDelete: (nodeId: string) => void;
}

export default function NodeEditor({
  node,
  onClose,
  onUpdate,
  onDelete,
}: NodeEditorProps) {
  const [title, setTitle] = useState(node.data.label || '');
  const [content, setContent] = useState(node.data.content || '');

  useEffect(() => {
    setTitle(node.data.label || '');
    setContent(node.data.content || '');
  }, [node]);

  const handleSave = () => {
    onUpdate(node.id, title, content);
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this node?')) {
      onDelete(node.id);
    }
  };

  return (
    <div className="absolute top-4 right-4 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-black dark:text-white">
          Edit Node
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Node title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              // Prevent any form submission or page refresh on Enter
              if (e.key === 'Enter' && e.ctrlKey) {
                // Ctrl+Enter to save
                e.preventDefault();
                handleSave();
              }
            }}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Node content..."
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}


