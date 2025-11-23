import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/api-helpers';

/**
 * DELETE /api/nodes/clear-all
 * Deletes all nodes from all workspaces (admin/cleanup route)
 * WARNING: This is destructive and should only be used for development/testing
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get current user for logging
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[API] Clearing all nodes - requested by user: ${user.id}`);

    // Delete all nodes (cascade will handle edges, comments, etc.)
    const result = await prisma.node.deleteMany({});

    console.log(`[API] Deleted ${result.count} nodes`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} nodes`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('[API] Error clearing nodes:', error);
    return NextResponse.json(
      { error: 'Failed to clear nodes', details: error.message },
      { status: 500 }
    );
  }
}



