import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user account (cascade will handle related data)
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

