export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
}
