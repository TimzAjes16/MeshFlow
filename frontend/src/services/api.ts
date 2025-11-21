import axios from 'axios';
import type { Node, Edge } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ConnectionSuggestion {
  nodeId: string;
  reason: string;
  confidence: number;
}

export const aiService = {
  suggestConnections: async (content: string, existingNodes: Node[]): Promise<ConnectionSuggestion[]> => {
    const response = await api.post<{ suggestions: ConnectionSuggestion[] }>('/ai/suggest-connections', {
      content,
      existingNodes,
    });
    return response.data.suggestions;
  },

  generateEmbedding: async (text: string): Promise<number[]> => {
    const response = await api.post<{ embedding: number[] }>('/ai/embedding', { text });
    return response.data.embedding;
  },
};

export const graphService = {
  clusterNodes: async (nodes: Node[]) => {
    const response = await api.post('/graph/cluster', { nodes });
    return response.data.clusters;
  },

  calculateImportance: async (nodes: Node[], edges: Edge[]) => {
    const response = await api.post<{ importanceScores: Record<string, number> }>('/graph/importance', {
      nodes,
      edges,
    });
    return response.data.importanceScores;
  },
};

