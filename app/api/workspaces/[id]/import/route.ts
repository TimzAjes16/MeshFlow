import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { getNodeEmbedding } from '@/lib/embeddings';
import { getAutoLinkNodes, createAutoEdges } from '@/lib/autoLink';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params;
    const { role } = await requireWorkspaceAccess(workspaceId, true);
    
    const body = await request.json();
    const { nodes, edges, format = 'json' } = body;

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Invalid nodes data' }, { status: 400 });
    }

    // Get current user for activity log
    const { user } = await requireWorkspaceAccess(workspaceId, true);

    const importedNodes = [];
    const importedEdges = [];

    // Import nodes
    for (const nodeData of nodes) {
      // Generate embedding if content exists
      let embedding = null;
      if (nodeData.content && typeof nodeData.content === 'string') {
        try {
          embedding = await getNodeEmbedding(nodeData.content);
        } catch (error) {
          console.error('Error generating embedding:', error);
          // Continue without embedding
        }
      }

      // Create node (embedding stored separately via raw SQL if needed)
      const newNode = await prisma.node.create({
        data: {
          workspaceId,
          title: nodeData.title || 'Untitled',
          content: nodeData.content || {},
          tags: nodeData.tags || [],
          x: nodeData.x || 0,
          y: nodeData.y || 0,
        },
      });

      importedNodes.push(newNode);

      // Store embedding if we have it (using raw SQL for vector type)
      if (embedding) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE nodes SET embedding = $1::vector WHERE id = $2`,
            embedding,
            newNode.id
          );
        } catch (error) {
          console.error('Error storing embedding:', error);
          // Continue without embedding
        }
      }
    }

    // Import edges if provided
    if (edges && Array.isArray(edges)) {
      for (const edgeData of edges) {
        // Find imported nodes by matching title or position
        const sourceNode = importedNodes.find(
          (n) => n.id === edgeData.source || n.title === edgeData.source
        );
        const targetNode = importedNodes.find(
          (n) => n.id === edgeData.target || n.title === edgeData.target
        );

        if (sourceNode && targetNode) {
          const newEdge = await prisma.edge.create({
            data: {
              workspaceId,
              source: sourceNode.id,
              target: targetNode.id,
              label: edgeData.label || null,
              similarity: edgeData.similarity || null,
            },
          });
          importedEdges.push(newEdge);
        }
      }
    } else {
      // Auto-link imported nodes if no edges provided
      for (const node of importedNodes) {
        const content = typeof node.content === 'string' 
          ? node.content 
          : JSON.stringify(node.content);
        
        // Auto-link: Generate embedding and find similar nodes (optional - skip if embedding generation fails)
        try {
          const embedding = await getNodeEmbedding({ title: node.title, content: node.content });
          if (embedding && embedding.length > 0) {
            // Get all nodes in workspace for similarity comparison
            const allNodes = await prisma.node.findMany({
              where: { workspaceId },
              select: {
                id: true,
                workspaceId: true,
                title: true,
                content: true,
                tags: true,
                x: true,
                y: true,
                createdAt: true,
                updatedAt: true,
              },
            });
            // Convert nodes to format expected by getAutoLinkNodes
            const formattedNodes = allNodes.map(n => ({
              ...n,
              createdAt: n.createdAt.toISOString(),
              updatedAt: n.updatedAt.toISOString(),
              embedding: undefined, // Embeddings will be fetched separately if needed
            }));
            const similarNodes = getAutoLinkNodes(embedding, formattedNodes, node.id);
            const newEdges = await createAutoEdges(node.id, similarNodes, workspaceId);
            importedEdges.push(...newEdges);
          }
        } catch (embeddingError: any) {
          console.warn('[Import] Failed to generate embedding or auto-link (continuing):', embeddingError?.message);
        }
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: user.id,
        action: 'import',
        entityType: 'workspace',
        entityId: workspaceId,
        details: {
          nodeCount: importedNodes.length,
          edgeCount: importedEdges.length,
          format,
        },
      },
    });

    // Log activity for import completion
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId: user.id,
        action: 'import_complete',
        entityType: 'workspace',
        entityId: workspaceId,
        details: {
          nodes: importedNodes.length,
          edges: importedEdges.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      nodes: importedNodes.length,
      edges: importedEdges.length,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error importing workspace:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
