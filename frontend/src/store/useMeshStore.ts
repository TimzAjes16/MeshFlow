import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge, LayoutMode, FilterOptions } from '../types';

interface MeshState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  layoutMode: LayoutMode;
  filterOptions: FilterOptions;
  searchQuery: string;
  explodedNodeId: string | null;
  viewCenter: { x: number; y: number };
  zoom: number;

  // Actions
  addNode: (node: Node) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
  setSelectedNode: (id: string | null) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  setSearchQuery: (query: string) => void;
  setExplodedNode: (id: string | null) => void;
  setViewCenter: (center: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  reset: () => void;
}

const defaultFilterOptions: FilterOptions = {
  hideOld: false,
  hideUnrelated: false,
  hideLowImportance: false,
  minImportance: 0.1,
  daysOld: 30,
};

const initialState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  layoutMode: 'force-directed' as LayoutMode,
  filterOptions: defaultFilterOptions,
  searchQuery: '',
  explodedNodeId: null,
  viewCenter: { x: 0, y: 0 },
  zoom: 1,
};

export const useMeshStore = create<MeshState>()(
  persist(
    (set) => ({
      ...initialState,

      addNode: (node) =>
        set((state) => ({
          nodes: [...state.nodes, node],
        })),

      updateNode: (id, updates) =>
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, ...updates, updatedAt: new Date().toISOString() } : node
          ),
        })),

      deleteNode: (id) =>
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter((edge) => {
            const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
            const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
            return sourceId !== id && targetId !== id;
          }),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        })),

      addEdge: (edge) =>
        set((state) => ({
          edges: [...state.edges, edge],
        })),

      deleteEdge: (id) =>
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
        })),

      setSelectedNode: (id) =>
        set({ selectedNodeId: id }),

      setLayoutMode: (mode) =>
        set({ layoutMode: mode }),

      setFilterOptions: (options) =>
        set((state) => ({
          filterOptions: { ...state.filterOptions, ...options },
        })),

      setSearchQuery: (query) =>
        set({ searchQuery: query }),

      setExplodedNode: (id) =>
        set({ explodedNodeId: id }),

      setViewCenter: (center) =>
        set({ viewCenter: center }),

      setZoom: (zoom) =>
        set({ zoom }),

      reset: () => set(initialState),
    }),
    {
      name: 'meshflow-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        layoutMode: state.layoutMode,
        filterOptions: state.filterOptions,
      }),
    }
  )
);

