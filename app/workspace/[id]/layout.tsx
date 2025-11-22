import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import WorkspaceShell from '@/components/WorkspaceShell';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
  const { id: workspaceId } = await params;

  // Normal server-side logic for web app
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
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: userId,
        },
      },
    });

    if (!member) {
      redirect('/dashboard');
    }
    
    userRole = member.role as 'owner' | 'editor' | 'viewer';
  }

  return (
    <WorkspaceShell workspaceId={workspaceId} workspace={workspace} userRole={userRole}>
      {children}
    </WorkspaceShell>
  );
}
