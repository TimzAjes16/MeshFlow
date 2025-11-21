import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateId } from '@/lib/utils';
import { generateEmbedding } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, title, content, x, y } = body;

    if (!workspaceId || !title) {
      return NextResponse.json(
        { error: 'Workspace ID and title are required' },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = Date.now();
    const text = `${title} ${content || ''}`.trim();
    const embedding = await generateEmbedding(text);

    db.prepare(
      'INSERT INTO nodes (id, workspace_id, title, content, x, y, embedding, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      id,
      workspaceId,
      title,
      content || '',
      x || 0,
      y || 0,
      JSON.stringify(embedding),
      now,
      now
    );

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);

    return NextResponse.json({
      node: {
        ...node,
        embedding: (node as any).embedding ? JSON.parse((node as any).embedding) : null,
      },
    });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    );
  }
}

