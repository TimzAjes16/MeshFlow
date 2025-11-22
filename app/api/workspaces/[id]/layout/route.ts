import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { runForceLayout } from '@/lib/layout';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;

    // Check workspace access
    await requireWorkspaceAccess(workspaceId, true);

    // Get nodes
    const nodes = await prisma.node.findMany({
      where: { workspaceId },
      select: {
        id: true,
        workspaceId: true,
        title: true,
        content: true,
        tags: true,
        x: true,
        y: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get edges
    const edges = await prisma.edge.findMany({
      where: { workspaceId },
      select: {
        id: true,
        workspaceId: true,
        source: true,
        target: true,
        label: true,
        similarity: true,
        createdAt: true,
      },
    });

    if (nodes.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Convert to format expected by runForceLayout
    const layoutNodes = nodes.map(n => ({
      id: n.id,
      workspaceId: n.workspaceId,
      title: n.title,
      content: typeof n.content === 'string' ? n.content : JSON.stringify(n.content),
      x: n.x,
      y: n.y,
      createdAt: new Date(n.createdAt).getTime(),
      updatedAt: new Date(n.updatedAt).getTime(),
    }));
    const layoutEdges = edges.map(e => ({
      id: e.id,
      workspaceId: e.workspaceId,
      sourceId: e.source,
      targetId: e.target,
      weight: e.similarity || 1,
      createdAt: new Date(e.createdAt).getTime(),
    }));

    const positions = runForceLayout(layoutNodes, layoutEdges);

    // Update node positions
    await Promise.all(
      Array.from(positions.entries()).map(([nodeId, pos]) =>
        prisma.node.update({
          where: { id: nodeId },
          data: { x: pos.x, y: pos.y },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error running layout:', error);
    return NextResponse.json(
      { error: 'Failed to run layout' },
      { status: 500 }
    );
  }
}

