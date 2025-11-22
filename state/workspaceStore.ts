'use client';

import { create } from 'zustand';
import type { Workspace } from '@/types/Workspace';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';
import { useHistoryStore, type HistoryAction } from './historyStore';

interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  nodes: Node[];
  edges: Edge[];
  layout: 'force-directed' | 'radial' | 'hierarchical' | 'semantic';
  
  // Actions
  setWorkspace: (workspace: Workspace | null) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  setLayout: (layout: 'force-directed' | 'radial' | 'hierarchical' | 'semantic') => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  currentWorkspace: null,
  nodes: [],
  edges: [],
  layout: 'force-directed',

  setWorkspace: (workspace) => set({ currentWorkspace: workspace }),

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    console.log('[WorkspaceStore] Adding node:', node);
    // Record history action
    const historyStore = useHistoryStore.getState();
    historyStore.recordAction(
      { type: 'create_node', node },
      `Created node "${node.title}"`
    );
    
    return set((state) => {
      // Check if node already exists to avoid duplicates
      if (state.nodes.some(n => n.id === node.id)) {
        console.log('[WorkspaceStore] Node already exists, updating instead:', node.id);
        return {
          nodes: state.nodes.map(n => n.id === node.id ? node : n),
        };
      }
      console.log('[WorkspaceStore] Adding new node, total nodes:', state.nodes.length + 1);
      return {
        nodes: [...state.nodes, node],
      };
    });
  },

  updateNode: (id, updates) => {
    console.log('[WorkspaceStore] Updating node:', id, updates);
    
    // Record history action - get the before state
    return set((state) => {
      const beforeNode = state.nodes.find((node) => node.id === id);
      if (beforeNode && useHistoryStore.getState().isRecording) {
        const historyStore = useHistoryStore.getState();
        const before: Partial<Node> = {
          title: beforeNode.title,
          content: beforeNode.content,
          tags: beforeNode.tags,
          x: beforeNode.x,
          y: beforeNode.y,
        };
        historyStore.recordAction(
          { type: 'update_node', nodeId: id, before, after: updates },
          `Updated node "${beforeNode.title}"`
        );
      }
      
      const updatedNodes = state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      );
      console.log('[WorkspaceStore] Node updated, new nodes count:', updatedNodes.length);
      return { nodes: updatedNodes };
    });
  },

  deleteNode: (id) => {
    // Record history action - get the node before deletion
    return set((state) => {
      const nodeToDelete = state.nodes.find((node) => node.id === id);
      if (nodeToDelete && useHistoryStore.getState().isRecording) {
        const historyStore = useHistoryStore.getState();
        historyStore.recordAction(
          { type: 'delete_node', node: nodeToDelete },
          `Deleted node "${nodeToDelete.title}"`
        );
      }
      
      return {
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter(
          (edge) => edge.source !== id && edge.target !== id
        ),
      };
    });
  },

  addEdge: (edge) => {
    // Record history action
    return set((state) => {
      const exists = state.edges.some(
        (e) => e.source === edge.source && e.target === edge.target
      );
      if (exists) return state;
      
      if (useHistoryStore.getState().isRecording) {
        const historyStore = useHistoryStore.getState();
        historyStore.recordAction(
          { type: 'create_edge', edge },
          'Created connection'
        );
      }
      
      return { edges: [...state.edges, edge] };
    });
  },

  deleteEdge: (id) => {
    // Record history action - get the edge before deletion
    return set((state) => {
      const edgeToDelete = state.edges.find((edge) => edge.id === id);
      if (edgeToDelete && useHistoryStore.getState().isRecording) {
        const historyStore = useHistoryStore.getState();
        historyStore.recordAction(
          { type: 'delete_edge', edge: edgeToDelete },
          'Deleted connection'
        );
      }
      
      return {
        edges: state.edges.filter((edge) => edge.id !== id),
      };
    });
  },

  setLayout: (layout) => set({ layout }),
}));
