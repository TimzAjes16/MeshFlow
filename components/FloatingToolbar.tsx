'use client';

import { useState, useEffect } from 'react';
import { Plus, Type, FileText, Image, Link2, Square, Circle } from 'lucide-react';

interface FloatingToolbarProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  onCreateNode: (type: string, position: { x: number; y: number }) => void;
}

const nodeTypes = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'note', label: 'Note', icon: FileText },
  { id: 'link', label: 'Link', icon: Link2 },
  { id: 'image', label: 'Image', icon: Image },
  { id: 'box', label: 'Box', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
];

export default function FloatingToolbar({ position, onClose, onCreateNode }: FloatingToolbarProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (position) {
          const selected = nodeTypes[selectedIndex];
          onCreateNode(selected.id, position);
          onClose();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % nodeTypes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + nodeTypes.length) % nodeTypes.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, selectedIndex, onCreateNode, onClose]);

  if (!position) return null;

  return (
    <div
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div className="text-xs text-gray-500 px-2 py-1 mb-1">Add to canvas</div>
      {nodeTypes.map((type, index) => {
        const Icon = type.icon;
        return (
          <button
            key={type.id}
            onClick={() => {
              onCreateNode(type.id, position);
              onClose();
            }}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
              selectedIndex === index
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}

