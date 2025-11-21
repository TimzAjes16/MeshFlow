export interface Edge {
  id: string;
  workspaceId: string;
  source: string;
  target: string;
  label?: string;
  similarity?: number; // For auto-linked edges
  createdAt?: string;
}
