import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import WorkspaceShell from '@/components/WorkspaceShell';
import WorkspaceSettingsPageClient from '@/components/WorkspaceSettingsPageClient';

interface WorkspaceSettingsPageProps {
  params: {
    id: string;
  };
}

export default async function WorkspaceSettingsPage({ params }: WorkspaceSettingsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  const userId = session.user.id;

  // Get workspace using Prisma
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.id },
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
    redirect(`/workspace/${params.id}/canvas`);
  }

  return (
    <WorkspaceShell 
      workspaceId={params.id} 
      workspace={workspace} 
      userRole={userRole}
    >
      <WorkspaceSettingsPageClient workspace={workspace} userRole={userRole} />
    </WorkspaceShell>
  );
}

