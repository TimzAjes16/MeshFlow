import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { findSimilarNodes, vectorToArray } from '@/lib/db-server';
import { Prisma } from '@prisma/client';
import { generateId } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: nodeId } = await params;
    const body = await request.json();
    const { workspaceId } = body;

    // Get the node with its embedding using raw SQL (since embedding column is not in Prisma schema)
    let nodeEmbedding: number[] | null = null;
    
    // Only try to fetch embedding if OPENAI_API_KEY is set
    if (process.env.OPENAI_API_KEY) {
      try {
        // Get the embedding using raw SQL (skip column check to avoid error logs)
        const result = await prisma.$queryRaw<Array<{ embedding: Buffer | null }>>`
          SELECT embedding FROM nodes WHERE id = ${nodeId}::uuid
        `.catch(() => {
          // Return empty result if column doesn't exist
          return [] as Array<{ embedding: Buffer | null }>;
        });
        
        if (result && result[0] && result[0].embedding) {
          nodeEmbedding = vectorToArray(result[0].embedding);
        }
      } catch (error: any) {
        // Silently return empty edges if embedding fetch fails
        return NextResponse.json({ edges: [] });
      }
    }

    if (!nodeEmbedding || nodeEmbedding.length === 0) {
      return NextResponse.json({ edges: [] });
    }

    // Use the existing findSimilarNodes function to get similar nodes
    const similarities = await findSimilarNodes(
      nodeEmbedding,
      workspaceId,
      nodeId,
      0.7, // Threshold for auto-linking
      5    // Top 5 most similar nodes
    );

    // Create edges
    const createdEdges = [];

    for (const { id: targetId, similarity } of similarities) {
      // Check if edge already exists (bidirectional check)
      const existing = await prisma.edge.findFirst({
        where: {
          workspaceId,
          OR: [
            { source: nodeId, target: targetId },
            { source: targetId, target: nodeId },
          ],
        },
      });

      if (!existing) {
        const edgeId = generateId();
        await prisma.edge.create({
          data: {
            id: edgeId,
            workspaceId,
            source: nodeId,
            target: targetId,
            similarity,
          },
        });
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

