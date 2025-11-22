import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

// API route to fetch workspace data (workspace, nodes, edges)
// Used by WorkspaceProvider instead of direct Supabase queries
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
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

    // Helper function to safely serialize JSON content
    const serializeContent = (content: any): any => {
      if (content === null || content === undefined) {
        return {};
      }
      // If it's already a plain object/array, return as-is (NextResponse.json will handle serialization)
      // If it's a Prisma JsonValue type, it should already be serializable
      try {
        // Ensure it's a plain serializable object by parsing and stringifying
        // This handles any edge cases with Prisma's JsonValue type
        return JSON.parse(JSON.stringify(content));
      } catch (error) {
        console.warn('[API] Failed to serialize node content, using empty object:', error);
        return {};
      }
    };

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
        title: node.title || '',
        content: serializeContent(node.content),
        tags: node.tags || [],
        x: node.x ?? 0,
        y: node.y ?? 0,
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString(),
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        workspaceId: edge.workspaceId,
        source: edge.source,
        target: edge.target,
        label: edge.label || null,
        similarity: edge.similarity ?? null,
        createdAt: edge.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[API] Error fetching workspace data:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      meta: error?.meta,
    });
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch workspace data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
