import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { runForceLayout } from '@/lib/layout';
import type { Node, Edge } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspaceId = params.id;

    const nodes = db
      .prepare('SELECT * FROM nodes WHERE workspace_id = ?')
      .all(workspaceId) as Node[];

    const edges = db
      .prepare('SELECT * FROM edges WHERE workspace_id = ?')
      .all(workspaceId) as Edge[];

    if (nodes.length === 0) {
      return NextResponse.json({ success: true });
    }

    const positions = runForceLayout(nodes, edges);

    const updateStmt = db.prepare(
      'UPDATE nodes SET x = ?, y = ? WHERE id = ?'
    );
    const updateMany = db.transaction((positions: Map<string, { x: number; y: number }>) => {
      for (const [nodeId, pos] of positions) {
        updateStmt.run(pos.x, pos.y, nodeId);
      }
    });

    updateMany(positions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error running layout:', error);
    return NextResponse.json(
      { error: 'Failed to run layout' },
      { status: 500 }
    );
  }
}

