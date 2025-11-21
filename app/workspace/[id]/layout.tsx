import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import WorkspaceShell from '@/components/WorkspaceShell';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function WorkspaceLayout({ children, params }: WorkspaceLayoutProps) {
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
          workspaceId: params.id,
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
    <WorkspaceShell workspaceId={params.id} workspace={workspace} userRole={userRole}>
      {children}
    </WorkspaceShell>
  );
}

