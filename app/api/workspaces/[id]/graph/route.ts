import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;

    const nodes = db
      .prepare('SELECT * FROM nodes WHERE workspace_id = ?')
      .all(workspaceId);

    const edges = db
      .prepare('SELECT * FROM edges WHERE workspace_id = ?')
      .all(workspaceId);

    return NextResponse.json({
      nodes: nodes.map((n: any) => ({
        ...n,
        embedding: n.embedding ? JSON.parse(n.embedding) : null,
      })),
      edges,
    });
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph' },
      { status: 500 }
    );
  }
}

