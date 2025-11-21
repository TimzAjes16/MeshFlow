import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

// API route to fetch workspace data (workspace, nodes, edges)
// Used by WorkspaceProvider instead of direct Supabase queries
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;
    const { user, role } = await requireWorkspaceAccess(workspaceId, false);

    // Fetch workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Fetch nodes
    const nodes = await prisma.node.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch edges
    const edges = await prisma.edge.findMany({
      where: { workspaceId },
    });

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        owner: workspace.owner,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
      nodes: nodes.map((node) => ({
        id: node.id,
        workspaceId: node.workspaceId,
        title: node.title,
        content: node.content,
        tags: node.tags,
        x: node.x,
        y: node.y,
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString(),
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        workspaceId: edge.workspaceId,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        similarity: edge.similarity,
        createdAt: edge.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching workspace data:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspace data' },
      { status: 500 }
    );
  }
}
