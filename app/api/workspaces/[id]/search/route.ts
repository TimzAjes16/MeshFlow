import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Check authentication and workspace access
    await requireWorkspaceAccess(workspaceId, false);

    if (!query) {
      return NextResponse.json({ nodeIds: [] });
    }

    // Use Prisma to search nodes - search in title and tags
    const nodes = await prisma.node.findMany({
      where: {
        workspaceId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } },
        ],
      },
      select: {
        id: true,
      },
    });

    const nodeIds = nodes.map((n) => n.id);

    return NextResponse.json({ nodeIds });
  } catch (error: any) {
    console.error('Error searching:', error);
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}
