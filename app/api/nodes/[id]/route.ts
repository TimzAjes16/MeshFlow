import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: nodeId } = await params;

    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: { workspace: true },
    });

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Check access
    await requireWorkspaceAccess(node.workspaceId, false);

    return NextResponse.json({
      node: {
        ...node,
        createdAt: node.createdAt.toISOString(),
        updatedAt: node.updatedAt.toISOString(),
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in get node API:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: nodeId } = await params;

    // Get node to check permissions
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: { workspace: true },
    });

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Check permissions
    const { user, role } = await requireWorkspaceAccess(node.workspaceId, true);

    // Delete node (cascade will delete edges and related data)
    await prisma.node.delete({
      where: { id: nodeId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: node.workspaceId,
        userId: user.id,
        action: 'delete',
        entityType: 'node',
        entityId: nodeId,
        details: { nodeId },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in delete node API:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}