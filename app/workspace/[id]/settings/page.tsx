import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import WorkspaceShell from '@/components/WorkspaceShell';
import WorkspaceSettingsPageClient from '@/components/WorkspaceSettingsPageClient';

interface WorkspaceSettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkspaceSettingsPage({ params }: WorkspaceSettingsPageProps) {
  const { id: workspaceId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userId = user.id;

  // Get workspace using Prisma
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          nodes: true,
          edges: true,
        },
      },
    },
  });

  if (!workspace) {
    redirect('/dashboard');
  }

  // Check if user has access
  const isOwner = workspace.ownerId === userId;
  
  let userRole: 'owner' | 'editor' | 'viewer' = 'viewer';
  if (isOwner) {
    userRole = 'owner';
  } else {
    const member = workspace.members.find(m => m.userId === userId);
    if (!member) {
      redirect('/dashboard');
    }
    userRole = member.role as 'owner' | 'editor' | 'viewer';
  }

  // Only owner can access settings
  if (!isOwner && userRole !== 'owner') {
    redirect(`/workspace/${workspaceId}/canvas`);
  }

  return (
    <WorkspaceShell 
      workspaceId={workspaceId} 
      workspace={workspace} 
      userRole={userRole}
    >
      <WorkspaceSettingsPageClient workspace={workspace} userRole={userRole} />
    </WorkspaceShell>
  );
}

