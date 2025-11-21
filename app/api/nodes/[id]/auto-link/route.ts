import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { cosineSimilarity } from '@/lib/ai';
import { generateId } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const nodeId = params.id;
    const body = await request.json();
    const { workspaceId } = body;

    const node = db
      .prepare('SELECT * FROM nodes WHERE id = ?')
      .get(nodeId) as any;

    if (!node || !node.embedding) {
      return NextResponse.json({ edges: [] });
    }

    const nodeEmbedding = JSON.parse(node.embedding);

    // Get all other nodes in the workspace
    const otherNodes = db
      .prepare(
        'SELECT * FROM nodes WHERE workspace_id = ? AND id != ? AND embedding IS NOT NULL'
      )
      .all(workspaceId, nodeId);

    // Calculate similarities
    const similarities = otherNodes
      .map((otherNode: any) => {
        const otherEmbedding = JSON.parse(otherNode.embedding);
        const similarity = cosineSimilarity(nodeEmbedding, otherEmbedding);
        return {
          nodeId: otherNode.id,
          similarity,
        };
      })
      .filter((s: any) => s.similarity > 0.7) // Threshold for auto-linking
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 most similar nodes

    // Create edges
    const createdEdges = [];
    const now = Date.now();

    for (const { nodeId: targetId } of similarities) {
      // Check if edge already exists
      const existing = db
        .prepare(
          'SELECT id FROM edges WHERE workspace_id = ? AND ((source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?))'
        )
        .get(workspaceId, nodeId, targetId, targetId, nodeId);

      if (!existing) {
        const edgeId = generateId();
        db.prepare(
          'INSERT INTO edges (id, workspace_id, source_id, target_id, weight, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(edgeId, workspaceId, nodeId, targetId, 1.0, now);
        createdEdges.push({ id: edgeId, sourceId: nodeId, targetId });
      }
    }

    return NextResponse.json({ edges: createdEdges });
  } catch (error) {
    console.error('Error auto-linking node:', error);
    return NextResponse.json(
      { error: 'Failed to auto-link node' },
      { status: 500 }
    );
  }
}

