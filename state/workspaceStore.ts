import { create } from 'zustand';
import type { Workspace } from '@/types/Workspace';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';

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

  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node],
  })),

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map((node) =>
      node.id === id ? { ...node, ...updates } : node
    ),
  })),

  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter((node) => node.id !== id),
    edges: state.edges.filter(
      (edge) => edge.source !== id && edge.target !== id
    ),
  })),

  addEdge: (edge) => set((state) => {
    const exists = state.edges.some(
      (e) => e.source === edge.source && e.target === edge.target
    );
    if (exists) return state;
    return { edges: [...state.edges, edge] };
  }),

  deleteEdge: (id) => set((state) => ({
    edges: state.edges.filter((edge) => edge.id !== id),
  })),

  setLayout: (layout) => set({ layout }),
}));
