import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { searchNodes } from '@/lib/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const workspaceId = searchParams.get('workspaceId');
    const tags = searchParams.get('tags')?.split(',');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!query && !tags && !dateFrom && !dateTo) {
      return NextResponse.json({ error: 'Missing search parameters' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 });
    }

    // Check access
    await requireWorkspaceAccess(workspaceId, false);

    // Build Prisma query
    const where: any = {
      workspaceId,
    };

    // Apply filters
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    // Fetch nodes
    const nodes = await prisma.node.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ results: [], total: 0 }, { status: 200 });
    }

    // Apply text search if query provided
    let results = nodes;
    if (query) {
      const searchResults = searchNodes(
        query,
        nodes.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          tags: n.tags,
          x: n.x,
          y: n.y,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        })),
        { limit }
      );
      results = searchResults.map((r) => r.node);
    } else {
      results = nodes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        tags: n.tags,
        x: n.x,
        y: n.y,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      }));
    }

    return NextResponse.json(
      {
        results,
        total: results.length,
        query: query || undefined,
        filters: {
          tags: tags || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in search nodes API:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}