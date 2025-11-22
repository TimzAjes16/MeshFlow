'use client';

import { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, History, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useHistoryStore } from '@/state/historyStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import { useCanvasStore } from '@/state/canvasStore';
import type { HistoryEntry, HistoryAction } from '@/state/historyStore';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';

export default function HistoryBar() {
  const { past, future, undo, redo, canUndo, canRedo, getHistory } = useHistoryStore();
  const { nodes, edges, setNodes, setEdges, updateNode, addNode, deleteNode, addEdge, deleteEdge } = useWorkspaceStore();
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id);
  const { selectNode } = useCanvasStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 100 });
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('historyBarPosition');
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition);
        setPosition({ x, y });
      } catch (e) {
        console.error('Failed to load history bar position:', e);
      }
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('historyBarPosition', JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleUndo = async () => {
    const entry = undo();
    if (!entry) return;

    await applyHistoryAction(entry.action, true);
  };

  const handleRedo = async () => {
    const entry = redo();
    if (!entry) return;

    await applyHistoryAction(entry.action, false);
  };

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleUndoEvent = async (event: CustomEvent) => {
      const entry = event.detail?.entry;
      if (entry) {
        await applyHistoryAction(entry.action, true);
      }
    };

    const handleRedoEvent = async (event: CustomEvent) => {
      const entry = event.detail?.entry;
      if (entry) {
        await applyHistoryAction(entry.action, false);
      }
    };

    window.addEventListener('history-undo', handleUndoEvent as unknown as EventListener);
    window.addEventListener('history-redo', handleRedoEvent as unknown as EventListener);

    return () => {
      window.removeEventListener('history-undo', handleUndoEvent as unknown as EventListener);
      window.removeEventListener('history-redo', handleRedoEvent as unknown as EventListener);
    };
  }, []);

  const applyHistoryAction = async (action: HistoryAction, isUndo: boolean) => {
    const historyStore = useHistoryStore.getState();
    historyStore.setRecording(false); // Temporarily disable recording to avoid double-recording

    try {
      switch (action.type) {
        case 'create_node':
          if (isUndo) {
            // Delete the node
            const nodeToDelete = action.node;
            deleteNode(nodeToDelete.id);
            if (workspaceId) {
              await fetch(`/api/nodes/${nodeToDelete.id}`, {
                method: 'DELETE',
              });
              // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
              // Undo/redo operations are already reflected in local store
            }
          } else {
            // Re-create the node
            addNode(action.node);
            if (workspaceId) {
              await fetch('/api/nodes/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  workspaceId,
                  title: action.node.title,
                  content: action.node.content,
                  tags: action.node.tags,
                  x: action.node.x,
                  y: action.node.y,
                }),
              });
              // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
              // Undo/redo operations are already reflected in local store
            }
          }
          break;

        case 'delete_node':
          if (isUndo) {
            // Restore the node
            addNode(action.node);
            if (workspaceId) {
              await fetch('/api/nodes/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  workspaceId,
                  title: action.node.title,
                  content: action.node.content,
                  tags: action.node.tags,
                  x: action.node.x,
                  y: action.node.y,
                }),
              });
              // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
              // Undo/redo operations are already reflected in local store
            }
          } else {
            // Delete again
            deleteNode(action.node.id);
            if (workspaceId) {
              await fetch(`/api/nodes/${action.node.id}`, {
                method: 'DELETE',
              });
              // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
              // Undo/redo operations are already reflected in local store
            }
          }
          break;

        case 'update_node':
          if (isUndo) {
            // Restore previous state
            updateNode(action.nodeId, action.before);
          } else {
            // Apply new state
            updateNode(action.nodeId, action.after);
          }
          
          if (workspaceId) {
            const updates = isUndo ? action.before : action.after;
            await fetch('/api/nodes/update', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nodeId: action.nodeId,
                ...updates,
              }),
            });
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          }
          break;

        case 'create_edge':
          if (isUndo) {
            deleteEdge(action.edge.id);
          } else {
            addEdge(action.edge);
          }
          
          if (workspaceId) {
            if (isUndo) {
              await fetch('/api/edges', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ edgeId: action.edge.id }),
              });
            } else {
              await fetch('/api/edges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  workspaceId,
                  source: action.edge.source,
                  target: action.edge.target,
                }),
              });
            }
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          }
          break;

        case 'delete_edge':
          if (isUndo) {
            addEdge(action.edge);
          } else {
            deleteEdge(action.edge.id);
          }
          
          if (workspaceId) {
            if (isUndo) {
              await fetch('/api/edges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  workspaceId,
                  source: action.edge.source,
                  target: action.edge.target,
                }),
              });
            } else {
              await fetch('/api/edges', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ edgeId: action.edge.id }),
              });
            }
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          }
          break;

        case 'update_nodes':
          if (isUndo) {
            // This is complex - we'd need to store the before state
            // For now, just refresh
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          } else {
            setNodes(action.nodes);
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          }
          break;

        case 'update_edges':
          if (isUndo) {
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          } else {
            setEdges(action.edges);
            window.dispatchEvent(new CustomEvent('refreshWorkspace'));
          }
          break;
      }
    } finally {
      historyStore.setRecording(true); // Re-enable recording
    }
  };

  const history = getHistory();
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Get the total history count (past + future)
  const totalHistoryCount = past.length + future.length;

  return (
    <div
      ref={barRef}
      className={`fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 ${
        isDragging ? 'cursor-move' : ''
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle */}
        <div
          className="w-6 h-6 flex items-center justify-center cursor-move hover:bg-gray-100 rounded"
          onMouseDown={handleMouseDown}
          title="Drag to move"
        >
          <div className="flex flex-col gap-0.5">
            <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
            <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
            <div className="w-3 h-0.5 bg-gray-400 rounded"></div>
          </div>
        </div>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={!canUndo()}
          className={`p-1.5 rounded transition-colors ${
            canUndo()
              ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo button */}
        <button
          onClick={handleRedo}
          disabled={!canRedo()}
          className={`p-1.5 rounded transition-colors ${
            canRedo()
              ? 'text-gray-700 hover:bg-gray-100 cursor-pointer'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* History toggle */}
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors text-sm text-gray-700"
          title="History log"
        >
          <History className="w-4 h-4" />
          <span className="text-xs font-medium">{totalHistoryCount}</span>
          {isHistoryOpen ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* History log dropdown */}
      {isHistoryOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 mb-2">
              History ({totalHistoryCount})
            </div>
            {history.length === 0 ? (
              <div className="px-2 py-4 text-sm text-gray-400 text-center">No history yet</div>
            ) : (
              <div className="space-y-1">
                {history.map((entry) => {
                  const isInFuture = future.some(f => f.id === entry.id);
                  return (
                    <div
                      key={entry.id}
                      className={`px-2 py-1.5 rounded text-sm transition-colors ${
                        isInFuture
                          ? 'text-gray-400 bg-gray-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1 truncate">{entry.description}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

