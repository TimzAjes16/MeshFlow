import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, sourceId, targetId, weight } = body;

    if (!workspaceId || !sourceId || !targetId) {
      return NextResponse.json(
        { error: 'Workspace ID, source ID, and target ID are required' },
        { status: 400 }
      );
    }

    // Check if edge already exists
    const existing = db
      .prepare(
        'SELECT id FROM edges WHERE workspace_id = ? AND ((source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?))'
      )
      .get(workspaceId, sourceId, targetId, targetId, sourceId);

    if (existing) {
      return NextResponse.json({ edge: existing });
    }

    const id = generateId();
    const now = Date.now();

    db.prepare(
      'INSERT INTO edges (id, workspace_id, source_id, target_id, weight, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, workspaceId, sourceId, targetId, weight || 1.0, now);

    const edge = db.prepare('SELECT * FROM edges WHERE id = ?').get(id);

    return NextResponse.json({ edge });
  } catch (error) {
    console.error('Error creating edge:', error);
    return NextResponse.json(
      { error: 'Failed to create edge' },
      { status: 500 }
    );
  }
}

