/**
 * API helper functions for authentication and authorization
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { prisma } from './db';

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      plan: true,
    },
  });

  return user;
}

/**
 * Check if user has access to workspace
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<{ hasAccess: boolean; role?: 'owner' | 'editor' | 'viewer' }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  if (!workspace) {
    return { hasAccess: false };
  }

  if (workspace.ownerId === userId) {
    return { hasAccess: true, role: 'owner' };
  }

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    select: { role: true },
  });

  if (member) {
    return { hasAccess: true, role: member.role };
  }

  return { hasAccess: false };
}

/**
 * Check if user can edit workspace
 */
export async function canEditWorkspace(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { hasAccess, role } = await hasWorkspaceAccess(userId, workspaceId);
  
  if (!hasAccess) {
    return false;
  }

  return role === 'owner' || role === 'editor';
}

/**
 * Require authentication helper
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Require workspace access helper
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  requireEdit: boolean = false
) {
  const user = await requireAuth();
  
  const { hasAccess, role } = await hasWorkspaceAccess(user.id, workspaceId);

  if (!hasAccess) {
    throw new Error('Forbidden: No access to workspace');
  }

  if (requireEdit && role !== 'owner' && role !== 'editor') {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return { user, role: role! };
}
