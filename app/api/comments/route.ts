import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');

    if (!nodeId) {
      return NextResponse.json({ error: 'Missing nodeId' }, { status: 400 });
    }

    // Get node to check workspace access
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { workspaceId: true },
    });

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Check workspace access
    await requireWorkspaceAccess(node.workspaceId, false);

    // Get comments with user info
    const comments = await prisma.comment.findMany({
      where: { nodeId },
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
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: any) {
    console.error('Error in get comments API:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { nodeId, content } = body;

    if (!nodeId || !content) {
      return NextResponse.json(
        { error: 'Missing nodeId or content' },
        { status: 400 }
      );
    }

    // Get node to check workspace access and log activity
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      select: { workspaceId: true },
    });

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Check workspace access (need edit permission to comment)
    await requireWorkspaceAccess(node.workspaceId, true);

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        nodeId,
        userId: user.id,
        content: content.trim(),
      },
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
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: node.workspaceId,
        userId: user.id,
        action: 'comment',
        entityType: 'comment',
        entityId: comment.id,
        details: { nodeId },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error('Error in create comment API:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
