import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireWorkspaceAccess } from '@/lib/api-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;

    // Check workspace access
    await requireWorkspaceAccess(workspaceId, false);

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

    return NextResponse.json({
      nodes: nodes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      edges: edges.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph' },
      { status: 500 }
    );
  }
}

