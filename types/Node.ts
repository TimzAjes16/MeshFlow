export interface Node {
  id: string;
  workspaceId: string;
  title: string;
  content: any; // JSONB for rich text content
  tags: string[];
  embedding?: number[]; // Vector embedding
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}
