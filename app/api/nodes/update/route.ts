import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { getNodeEmbedding } from '@/lib/embeddings';
import { findSimilarNodes } from '@/lib/db-server';

export async function PUT(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      console.error('[API] Failed to parse request body:', parseError?.message);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

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

    // Regenerate embedding if title or content changed (optional - don't fail if this errors)
    if (title !== undefined || content !== undefined) {
      try {
        const newEmbedding = await getNodeEmbedding({
          title: title || existingNode.title,
          content: content !== undefined ? content : existingNode.content,
        });

        // Update embedding using raw SQL (optional - don't fail if pgvector isn't set up)
        if (newEmbedding && newEmbedding.length > 0 && process.env.OPENAI_API_KEY) {
          try {
            // Only try to update embedding if OPENAI_API_KEY is set
            // Skip the column check to avoid error logs
            const vectorText = `[${newEmbedding.join(',')}]`;
            await prisma.$executeRaw`
              UPDATE nodes
              SET embedding = ${vectorText}::vector
              WHERE id = ${nodeId}::uuid
            `.catch(() => {
              // Silently fail if embedding column doesn't exist
            });
            
            // Re-check auto-linking (optional - don't fail if this errors)
            try {
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

                  // Log activity (optional - don't fail if this errors)
                  try {
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
                  } catch (logError: any) {
                    console.warn('[API] Failed to log auto-link activity (continuing):', logError?.message);
                  }
                }
              }
            } catch (autoLinkError: any) {
              console.warn('[API] Failed to auto-link nodes (continuing):', autoLinkError?.message);
              // Continue without auto-linking - node update will still succeed
            }
          } catch (embeddingError: any) {
            // Silently skip embedding update if it fails (column doesn't exist or other error)
            // Node update will still succeed without embedding
          }
        }
      } catch (embeddingGenError: any) {
        console.warn('[API] Failed to generate embedding (continuing without embedding):', embeddingGenError?.message);
        // Continue without embedding - node update will still succeed
      }
    }

    // Update node
    const updatedNode = await prisma.node.update({
      where: { id: nodeId },
      data: updateData,
    });

    // Log activity (optional - don't fail if this errors)
    try {
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
    } catch (logError: any) {
      console.warn('[API] Failed to log activity (continuing):', logError?.message);
      // Continue without logging - node update will still succeed
    }

    return NextResponse.json({
      node: {
        ...updatedNode,
        createdAt: updatedNode.createdAt.toISOString(),
        updatedAt: updatedNode.updatedAt.toISOString(),
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('[API] Error in update node API:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      meta: error?.meta,
      nodeId: error?.nodeId || 'unknown',
    });
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}