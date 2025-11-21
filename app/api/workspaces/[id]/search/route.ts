import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ nodeIds: [] });
    }

    const nodes = db
      .prepare(
        'SELECT id FROM nodes WHERE workspace_id = ? AND (title LIKE ? OR content LIKE ?)'
      )
      .all(workspaceId, `%${query}%`, `%${query}%`);

    const nodeIds = nodes.map((n: any) => n.id);

    return NextResponse.json({ nodeIds });
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}

