import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import DashboardTopNav from '@/components/DashboardTopNav';
import DashboardContent from '@/components/DashboardContent';

export default async function DashboardPage() {
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
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav - consistent with workspace */}
      <DashboardTopNav />
      
      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 pb-12 pt-8">
        <DashboardContent 
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
      </main>
    </div>
  );
}