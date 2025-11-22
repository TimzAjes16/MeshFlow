export interface Node {
  id: string;
  title: string;
  content: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  color?: string;
  size?: number;
  importance?: number;
  createdAt: string;
  updatedAt: string;
  embedding?: number[];
  clusterId?: string;
}

export interface Edge {
  id: string;
  source: string | Node;
  target: string | Node;
  strength?: number;
  color?: string;
  label?: string;
}

export interface Cluster {
  id: string;
  nodes: string[];
  centroid: number[];
  label: string;
}

export type LayoutMode = 'force-directed' | 'radial' | 'hierarchical' | 'linear' | 'mind-map';

export interface FilterOptions {
  hideOld: boolean;
  hideUnrelated: boolean;
  hideLowImportance: boolean;
  minImportance: number;
  daysOld: number;
}

export interface SearchResult {
  nodeId: string;
  path?: string[];
}


