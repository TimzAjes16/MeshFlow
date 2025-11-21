'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Users, Settings, Download, Upload, Copy, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { shortcutManager, defaultShortcuts } from '@/lib/keyboardShortcuts';

interface Command {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId?: string;
  nodeId?: string;
}

export default function CommandPalette({
  isOpen,
  onClose,
  workspaceId,
  nodeId,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'new-node',
        label: 'Create New Node',
        icon: <FileText className="w-4 h-4" />,
        category: 'Nodes',
        action: () => {
          window.dispatchEvent(new CustomEvent('createNode'));
          onClose();
        },
        shortcut: 'Ctrl+N',
      },
      {
        id: 'duplicate-node',
        label: 'Duplicate Node',
        icon: <Copy className="w-4 h-4" />,
        category: 'Nodes',
        action: () => {
          if (nodeId) {
            window.dispatchEvent(new CustomEvent('duplicateNode', { detail: { nodeId } }));
            onClose();
          }
        },
      },
      {
        id: 'node-history',
        label: 'View Node History',
        icon: <History className="w-4 h-4" />,
        category: 'Nodes',
        action: () => {
          if (nodeId) {
            window.dispatchEvent(new CustomEvent('showNodeHistory', { detail: { nodeId } }));
            onClose();
          }
        },
      },
      {
        id: 'share-workspace',
        label: 'Share Workspace',
        icon: <Users className="w-4 h-4" />,
        category: 'Workspace',
        action: () => {
          window.dispatchEvent(new CustomEvent('openSharingPanel'));
          onClose();
        },
      },
      {
        id: 'export-workspace',
        label: 'Export Workspace',
        icon: <Download className="w-4 h-4" />,
        category: 'Workspace',
        action: () => {
          if (workspaceId) {
            window.dispatchEvent(new CustomEvent('exportWorkspace', { detail: { workspaceId } }));
            onClose();
          }
        },
      },
      {
        id: 'import-workspace',
        label: 'Import Workspace',
        icon: <Upload className="w-4 h-4" />,
        category: 'Workspace',
        action: () => {
          if (workspaceId) {
            window.dispatchEvent(new CustomEvent('importWorkspace', { detail: { workspaceId } }));
            onClose();
          }
        },
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="w-4 h-4" />,
        category: 'General',
        action: () => {
          window.dispatchEvent(new CustomEvent('openSettings'));
          onClose();
        },
      },
    ],
    [workspaceId, nodeId, onClose]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-32"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl mx-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands..."
              autoFocus
              className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <kbd className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-400">
              ESC
            </kbd>
          </div>

          {/* Commands List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">
                No commands found
              </div>
            ) : (
              <div className="py-2">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    onClick={command.action}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors ${
                      index === selectedIndex ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className="text-slate-400">{command.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-200">
                        {command.label}
                      </div>
                      <div className="text-xs text-slate-500">{command.category}</div>
                    </div>
                    {command.shortcut && (
                      <kbd className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-slate-400">
                        {command.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>
              {filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'}
            </span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded">
                  ↓
                </kbd>
                {' to navigate'}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded">
                  Enter
                </kbd>
                {' to select'}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
