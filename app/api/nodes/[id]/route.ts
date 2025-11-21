import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateEmbedding } from '@/lib/ai';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const nodeId = params.id;
    const body = await request.json();
    const { title, content, x, y } = body;

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId) as any;

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }

    if (x !== undefined) {
      updates.push('x = ?');
      values.push(x);
    }

    if (y !== undefined) {
      updates.push('y = ?');
      values.push(y);
    }

    // Regenerate embedding if title or content changed
    if (title !== undefined || content !== undefined) {
      const newTitle = title !== undefined ? title : node.title;
      const newContent = content !== undefined ? content : node.content;
      const text = `${newTitle} ${newContent || ''}`.trim();
      const embedding = await generateEmbedding(text);
      updates.push('embedding = ?');
      values.push(JSON.stringify(embedding));
    }

    if (updates.length > 0) {
      updates.push('updated_at = ?');
      values.push(Date.now());
      values.push(nodeId);

      db.prepare(
        `UPDATE nodes SET ${updates.join(', ')} WHERE id = ?`
      ).run(...values);
    }

    const updatedNode = db
      .prepare('SELECT * FROM nodes WHERE id = ?')
      .get(nodeId);

    return NextResponse.json({
      node: {
        ...updatedNode,
        embedding: (updatedNode as any).embedding
          ? JSON.parse((updatedNode as any).embedding)
          : null,
      },
    });
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const nodeId = params.id;

    db.prepare('DELETE FROM nodes WHERE id = ?').run(nodeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}

