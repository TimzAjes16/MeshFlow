import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    await requireWorkspaceAccess(workspaceId, false);

    // Get workspace members with user info
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
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

    return NextResponse.json({ 
      members: members.map(m => ({
        userId: m.userId,
        role: m.role,
        user: m.user,
        createdAt: m.createdAt.toISOString(),
      }))
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching members:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const { role } = await requireWorkspaceAccess(workspaceId, true); // Need edit permission
    
    const body = await request.json();
    const { email, memberRole = 'editor' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // Get user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User already a member' }, { status: 400 });
    }

    // Create member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: memberRole as 'owner' | 'editor' | 'viewer',
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

    // Get current user for activity log
    const currentUser = await requireAuth();
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: currentUser.id,
        action: 'add_member',
        entityType: 'workspace_member',
        entityId: member.userId,
        details: { email, role: memberRole },
      },
    });

    return NextResponse.json({ 
      member: {
        userId: member.userId,
        role: member.role,
        user: member.user,
        createdAt: member.createdAt.toISOString(),
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding member:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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
    const { role } = await requireWorkspaceAccess(workspaceId, true);
    
    const body = await request.json();
    const { userId: targetUserId, role: newRole } = body;

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 });
    }

    // Only owner can change roles
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Only owner can change roles' }, { status: 403 });
    }

    // Update member role
    const member = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
      data: {
        role: newRole as 'owner' | 'editor' | 'viewer',
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

    // Get current user for activity log
    const currentUser = await requireAuth();
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: currentUser.id,
        action: 'update_member_role',
        entityType: 'workspace_member',
        entityId: targetUserId,
        details: { newRole },
      },
    });

    return NextResponse.json({ 
      member: {
        userId: member.userId,
        role: member.role,
        user: member.user,
        createdAt: member.createdAt.toISOString(),
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating member:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    if (error.message.includes('Forbidden')) {
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
    const { id: workspaceId } = await params;
    const { role } = await requireWorkspaceAccess(workspaceId, true);
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Only owner can remove members
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Only owner can remove members' }, { status: 403 });
    }

    // Cannot remove owner
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner' }, { status: 400 });
    }

    // Delete member
    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    // Get current user for activity log
    const currentUser = await requireAuth();
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: currentUser.id,
        action: 'remove_member',
        entityType: 'workspace_member',
        entityId: userId,
        details: {},
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting member:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
