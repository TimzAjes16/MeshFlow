import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { getNodeEmbedding } from '@/lib/embeddings';
import { arrayToVector, findSimilarNodes } from '@/lib/db';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodeId, title, content, tags, x, y } = body;

    if (!nodeId) {
      return NextResponse.json(
        { error: 'Missing node ID' },
        { status: 400 }
      );
    }

    // Get existing node
    const existingNode = await prisma.node.findUnique({
      where: { id: nodeId },
      include: { workspace: true },
    });

    if (!existingNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Check permissions
    const { user, role } = await requireWorkspaceAccess(existingNode.workspaceId, true);

    // Update fields
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (x !== undefined) updateData.x = x;
    if (y !== undefined) updateData.y = y;

    // Regenerate embedding if title or content changed
    let newEmbedding: number[] | null = null;
    if (title !== undefined || content !== undefined) {
      newEmbedding = await getNodeEmbedding({
        title: title || existingNode.title,
        content: content !== undefined ? content : existingNode.content,
      });

      // Update embedding using raw SQL
      const embeddingVector = arrayToVector(newEmbedding);
      await prisma.$executeRaw`
        UPDATE nodes
        SET embedding = ${embeddingVector}::vector
        WHERE id = ${nodeId}::uuid
      `;

      // Re-check auto-linking
      const similarNodes = await findSimilarNodes(
        newEmbedding,
        existingNode.workspaceId,
        nodeId,
        0.82, // auto-link threshold
        10 // limit
      );

      if (similarNodes.length > 0) {
        // Get existing edges from this node
        const existingEdges = await prisma.edge.findMany({
          where: {
            workspaceId: existingNode.workspaceId,
            source: nodeId,
          },
          select: { target: true },
        });

        const existingTargets = new Set(existingEdges.map((e) => e.target));

        // Create new auto-edges for nodes that don't already have edges
        const newTargets = similarNodes.filter(
          (node) => !existingTargets.has(node.id)
        );

        if (newTargets.length > 0) {
          await prisma.edge.createMany({
            data: newTargets.map((targetNode) => ({
              workspaceId: existingNode.workspaceId,
              source: nodeId,
              target: targetNode.id,
              similarity: targetNode.similarity || 1,
            })),
            skipDuplicates: true,
          });

          // Log activity
          await prisma.activityLog.create({
            data: {
              workspaceId: existingNode.workspaceId,
              userId: user.id,
              action: 'auto_link',
              entityType: 'edge',
              details: {
                sourceNodeId: nodeId,
                targetNodesCount: newTargets.length,
              },
            },
          });
        }
      }
    }

    // Update node
    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: updateData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId: existingNode.workspaceId,
        userId: user.id,
        action: 'update',
        entityType: 'node',
        entityId: nodeId,
        details: { title: updatedNode.title },
      },
    });

    return NextResponse.json({
      node: {
        ...updatedNode,
        createdAt: updatedNode.createdAt.toISOString(),
        updatedAt: updatedNode.updatedAt.toISOString(),
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error in update node API:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}