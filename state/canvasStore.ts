'use client';

import { create } from 'zustand';
import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';
import { Connection, Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

interface CanvasStore {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  selectedNodeId: string | null;
  viewport: { x: number; y: number; zoom: number };
  showTags: boolean; // Toggle for tag visibility on canvas
  
  // Actions
  setNodes: (nodes: ReactFlowNode[]) => void;
  setEdges: (edges: ReactFlowEdge[]) => void;
  addNode: (node: ReactFlowNode) => void;
  updateNode: (id: string, updates: Partial<ReactFlowNode>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: ReactFlowEdge | Connection) => void;
  deleteEdge: (id: string) => void;
  selectNode: (nodeId: string | null) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  toggleTags: () => void;
  clearCanvas: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  viewport: { x: 0, y: 0, zoom: 1 },
  showTags: true, // Tags visible by default

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => set((state) => ({ 
    nodes: [...state.nodes, node] 
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
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
  })),

  addEdge: (edge) => set((state) => {
    const edgeId = 'id' in edge ? edge.id : `${edge.source}-${edge.target}`;
    const newEdge: ReactFlowEdge = {
      id: edgeId,
      source: edge.source,
      target: edge.target,
      ...edge,
    };

    // Check if edge already exists
    const exists = state.edges.some(
      (e) => e.source === newEdge.source && e.target === newEdge.target
    );

    if (exists) return state;

    return { edges: [...state.edges, newEdge] };
  }),

  deleteEdge: (id) => set((state) => ({
    edges: state.edges.filter((edge) => edge.id !== id),
  })),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  setViewport: (viewport) => set({ viewport }),

  toggleTags: () => set((state) => ({ showTags: !state.showTags })),

  clearCanvas: () => set({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    viewport: { x: 0, y: 0, zoom: 1 },
    showTags: true,
  }),
}));
