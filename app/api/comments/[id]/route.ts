import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: commentId } = await params;

    // Get comment to check ownership and workspace access
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        node: {
          select: { workspaceId: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Only comment author can delete
    if (comment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id: commentId },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: comment.node.workspaceId,
        userId: user.id,
        action: 'delete_comment',
        entityType: 'comment',
        entityId: commentId,
        details: { nodeId: comment.nodeId },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in delete comment API:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
