import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Sidebar from '@/components/Sidebar';
import WorkspaceList from '@/components/WorkspaceList';

export default async function WorkspacesPage() {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id;
  if (!userId) {
    redirect('/auth/login');
  }

  // Fetch user's workspaces
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: userId },
        {
          members: {
            some: {
              userId: userId,
            },
          },
        },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          nodes: true,
          edges: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Workspaces</h1>
          </div>
          <WorkspaceList 
            workspaces={workspaces.map((w: any) => ({
              id: w.id,
              name: w.name,
              ownerId: w.ownerId,
              owner: w.owner,
              nodeCount: w._count.nodes,
              edgeCount: w._count.edges,
              createdAt: w.createdAt.toISOString(),
              updatedAt: w.updatedAt.toISOString(),
            }))} 
          />
        </div>
      </main>
    </div>
  );
}
