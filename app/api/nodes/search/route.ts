import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchNodes } from '@/lib/search';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Build query
    let nodesQuery = supabase
      .from('nodes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .limit(limit);

    // Apply filters
    if (tags && tags.length > 0) {
      nodesQuery = nodesQuery.contains('tags', tags);
    }

    if (dateFrom) {
      nodesQuery = nodesQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      nodesQuery = nodesQuery.lte('created_at', dateTo);
    }

    const { data: nodes, error } = await nodesQuery;

    if (error) {
      console.error('Error searching nodes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ results: [], total: 0 }, { status: 200 });
    }

    // Apply text search if query provided
    let results = nodes;
    if (query) {
      const searchResults = searchNodes(query, nodes as any[], { limit });
      results = searchResults.map((r) => r.node);
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
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
