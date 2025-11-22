import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, source, target, label, similarity } = body;

    if (!workspaceId || !source || !target) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check access
    const { user, role } = await requireWorkspaceAccess(workspaceId, true);

    // Verify nodes exist and belong to workspace
    const nodes = await prisma.node.findMany({
      where: {
        id: { in: [source, target] },
        workspaceId,
      },
    });

    if (nodes.length !== 2) {
      return NextResponse.json({ error: 'Invalid source or target node' }, { status: 400 });
    }

    // Create edge
    const edge = await prisma.edge.create({
      data: {
        workspaceId,
        source,
        target,
        label: label || null,
        similarity: similarity || null,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: user.id,
        action: 'create',
        entityType: 'edge',
        entityId: edge.id,
        details: { source, target },
      },
    });

    return NextResponse.json({
      id: edge.id,
      workspaceId: edge.workspaceId,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      similarity: edge.similarity,
      createdAt: edge.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating edge:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Edge already exists' }, { status: 409 });
    }
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const edgeId = searchParams.get('edgeId');
    const workspaceId = searchParams.get('workspaceId');

    if (!edgeId || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing edgeId or workspaceId' },
        { status: 400 }
      );
    }

    // Check access
    const { user, role } = await requireWorkspaceAccess(workspaceId, true);

    // Get edge to verify it exists
    const edge = await prisma.edge.findUnique({
      where: { id: edgeId },
    });

    if (!edge || edge.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Edge not found' }, { status: 404 });
    }

    // Delete edge
    await prisma.edge.delete({
      where: { id: edgeId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: user.id,
        action: 'delete',
        entityType: 'edge',
        entityId: edgeId,
        details: { source: edge.source, target: edge.target },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting edge:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}