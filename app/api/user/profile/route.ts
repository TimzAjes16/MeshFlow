import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json();
    const { name } = body;

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
      },
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

