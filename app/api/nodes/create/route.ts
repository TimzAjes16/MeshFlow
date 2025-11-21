import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { getNodeEmbedding } from '@/lib/embeddings';
import { arrayToVector, findSimilarNodes } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, title, content, tags, x, y } = body;

    if (!workspaceId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check authentication and workspace access
    const { user, role } = await requireWorkspaceAccess(workspaceId, true);

    // Generate embedding
    const embedding = await getNodeEmbedding({ title, content });

    // Create node - use Prisma for non-vector fields, raw SQL for vector
    const newNode = await prisma.node.create({
      data: {
        workspaceId,
        title,
        content: content || {},
        tags: tags || [],
        x: x || 0,
        y: y || 0,
      },
    });

    // Update embedding using raw SQL (pgvector)
    const embeddingVector = arrayToVector(embedding);
    await prisma.$executeRaw`
      UPDATE nodes
      SET embedding = ${embeddingVector}::vector
      WHERE id = ${newNode.id}::uuid
    `;

    // Auto-link: Find similar nodes
    const similarNodes = await findSimilarNodes(
      embedding,
      workspaceId,
      newNode.id,
      0.82, // auto-link threshold
      10 // limit
    );

    if (similarNodes.length > 0) {
      // Get full node data for similar nodes
      const targetNodes = await prisma.node.findMany({
        where: {
          id: { in: similarNodes.map((n) => n.id) },
        },
      });

      // Create auto-edges
      await prisma.edge.createMany({
        data: similarNodes.map((targetNode, index) => ({
          workspaceId,
          source: newNode.id,
          target: targetNode.id,
          similarity: targetNode.similarity || similarNodes[index].similarity || 1,
        })),
        skipDuplicates: true,
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          workspaceId,
          userId: user.id,
          action: 'auto_link',
          entityType: 'edge',
          details: {
            sourceNodeId: newNode.id,
            targetNodesCount: similarNodes.length,
          },
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: user.id,
        action: 'create',
        entityType: 'node',
        entityId: newNode.id,
        details: { title },
      },
    });

    // Return node with proper format
    return NextResponse.json({
      node: {
        id: newNode.id,
        workspaceId: newNode.workspaceId,
        title: newNode.title,
        content: newNode.content,
        tags: newNode.tags,
        x: newNode.x,
        y: newNode.y,
        createdAt: newNode.createdAt.toISOString(),
        updatedAt: newNode.updatedAt.toISOString(),
        embedding,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in create node API:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}