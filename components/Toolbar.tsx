'use client';

import { Network, Link as LinkIcon } from 'lucide-react';

interface ToolbarProps {
  onRunLayout: () => void;
  isAutoLinking: boolean;
  onToggleAutoLinking: () => void;
}

export default function Toolbar({
  onRunLayout,
  isAutoLinking,
  onToggleAutoLinking,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRunLayout}
        className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        title="Run force-directed layout"
      >
        <Network size={18} />
        Layout
      </button>
      <button
        onClick={onToggleAutoLinking}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isAutoLinking
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        title="Toggle auto-linking via embeddings"
      >
        <LinkIcon size={18} />
        Auto-Link
      </button>
    </div>
  );
}

