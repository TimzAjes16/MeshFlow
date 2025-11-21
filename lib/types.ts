export interface Node {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  x: number;
  y: number;
  embedding?: number[];
  createdAt: number;
  updatedAt: number;
}

export interface Edge {
  id: string;
  workspaceId: string;
  sourceId: string;
  targetId: string;
  weight: number;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  ownerId: string;
}

export interface WorkspaceShare {
  id: string;
  workspaceId: string;
  userId: string;
  permission: 'read' | 'write' | 'admin';
  createdAt: number;
}

export interface ReactFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    label: string;
    content?: string;
    highlighted?: boolean;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: { strokeWidth?: number; stroke?: string };
}

