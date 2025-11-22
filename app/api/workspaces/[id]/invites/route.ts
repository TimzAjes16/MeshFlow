import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const { role } = await requireWorkspaceAccess(workspaceId, true);
    
    // Only owner can create invites
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Only owner can create invites' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role: inviteRole = 'editor', expiresInDays = 7 } = body;

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    // Generate invite token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Get current user
    const user = await requireAuth();

    // Create invite
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        inviterId: user.id,
        email,
        token,
        role: inviteRole as 'owner' | 'editor' | 'viewer',
        expiresAt,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: user.id,
        action: 'create_invite',
        entityType: 'workspace_invite',
        entityId: invite.id,
        details: { email, role: inviteRole },
      },
    });

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating invite:', error);
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    await requireWorkspaceAccess(workspaceId, false);

    // Get all invites for workspace
    const invites = await prisma.workspaceInvite.findMany({
      where: { 
        workspaceId,
        acceptedAt: null, // Only pending invites
      },
      include: {
        inviter: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ invites }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    
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
