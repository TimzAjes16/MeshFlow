import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const { user, role } = await requireWorkspaceAccess(workspaceId, false);

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
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        ownerId: workspace.ownerId,
        owner: workspace.owner,
        members: workspace.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: m.user,
          createdAt: m.createdAt.toISOString(),
        })),
        nodeCount: workspace._count.nodes,
        edgeCount: workspace._count.edges,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching workspace:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const { user, role } = await requireWorkspaceAccess(workspaceId, true);

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
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

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: user.id,
        action: 'update',
        entityType: 'workspace',
        entityId: workspaceId,
        details: { name },
      },
    });

    return NextResponse.json({
      workspace: {
        ...workspace,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating workspace:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const { user, role } = await requireWorkspaceAccess(workspaceId, true);

    // Only owner can delete
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only owner can delete workspace' }, { status: 403 });
    }

    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting workspace:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}
