export interface Node {
  id: string;
  workspaceId: string;
  title: string;
  content: any; // JSONB for rich text content or type-specific properties
  tags: string[]; // Deprecated: use content.type instead, kept for backwards compatibility
  type?: string; // Explicit node type (like Notion block type or Miro widget type)
  embedding?: number[]; // Vector embedding
  x: number;
  y: number;
  width?: number; // Optional width for resizable nodes
  height?: number; // Optional height for resizable nodes
  rotation?: number; // Optional rotation in degrees
  createdAt: string;
  updatedAt: string;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}
