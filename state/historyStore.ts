'use client';

import { create } from 'zustand';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';

export type HistoryAction = 
  | { type: 'create_node'; node: Node }
  | { type: 'delete_node'; node: Node }
  | { type: 'update_node'; nodeId: string; before: Partial<Node>; after: Partial<Node> }
  | { type: 'create_edge'; edge: Edge }
  | { type: 'delete_edge'; edge: Edge }
  | { type: 'update_nodes'; nodes: Node[] }
  | { type: 'update_edges'; edges: Edge[] };

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  timestamp: Date;
  description: string;
}

interface HistoryStore {
  past: HistoryEntry[];
  future: HistoryEntry[];
  isRecording: boolean;
  
  // Actions
  recordAction: (action: HistoryAction, description: string) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  setRecording: (recording: boolean) => void;
  getHistory: () => HistoryEntry[];
}

function generateHistoryId(): string {
  return `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getActionDescription(action: HistoryAction): string {
  switch (action.type) {
    case 'create_node':
      return `Created node "${action.node.title}"`;
    case 'delete_node':
      return `Deleted node "${action.node.title}"`;
    case 'update_node':
      if (action.after.title && action.before.title && action.after.title !== action.before.title) {
        return `Renamed node from "${action.before.title}" to "${action.after.title}"`;
      }
      if (action.after.content && action.before.content) {
        return `Updated node "${action.after.title || action.nodeId}"`;
      }
      if (action.after.x !== undefined || action.after.y !== undefined) {
        return `Moved node "${action.after.title || action.nodeId}"`;
      }
      return `Updated node "${action.after.title || action.nodeId}"`;
    case 'create_edge':
      return `Created connection`;
    case 'delete_edge':
      return `Deleted connection`;
    case 'update_nodes':
      return `Updated ${action.nodes.length} node(s)`;
    case 'update_edges':
      return `Updated ${action.edges.length} connection(s)`;
    default:
      return 'Unknown action';
  }
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  future: [],
  isRecording: true,
  
  recordAction: (action, description) => {
    const state = get();
    if (!state.isRecording) return;
    
    const entry: HistoryEntry = {
      id: generateHistoryId(),
      action,
      timestamp: new Date(),
      description: description || getActionDescription(action),
    };
    
    set((state) => ({
      past: [...state.past, entry].slice(-50), // Keep last 50 actions
      future: [], // Clear future when new action is recorded
    }));
  },
  
  undo: () => {
    const state = get();
    if (state.past.length === 0) return null;
    
    const lastEntry = state.past[state.past.length - 1];
    
    set((state) => ({
      past: state.past.slice(0, -1),
      future: [lastEntry, ...state.future],
    }));
    
    return lastEntry;
  },
  
  redo: () => {
    const state = get();
    if (state.future.length === 0) return null;
    
    const firstEntry = state.future[0];
    
    set((state) => ({
      past: [...state.past, firstEntry],
      future: state.future.slice(1),
    }));
    
    return firstEntry;
  },
  
  canUndo: () => {
    return get().past.length > 0;
  },
  
  canRedo: () => {
    return get().future.length > 0;
  },
  
  clearHistory: () => {
    set({ past: [], future: [] });
  },
  
  setRecording: (recording) => {
    set({ isRecording: recording });
  },
  
  getHistory: () => {
    const state = get();
    return [...state.past].reverse(); // Most recent first
  },
}));

