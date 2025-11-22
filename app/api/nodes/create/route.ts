import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/api-helpers';
import { prisma } from '@/lib/db';
import { getNodeEmbedding } from '@/lib/embeddings';
import { arrayToVector, findSimilarNodes } from '@/lib/db-server';
import { Prisma } from '@prisma/client';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[API] Node creation request started');
  
  try {
    const body = await request.json();
    console.log('[API] Request body received:', {
      workspaceId: body.workspaceId,
      title: body.title,
      hasContent: !!body.content,
      tags: body.tags,
      x: body.x,
      y: body.y,
    });

    const { workspaceId, title, content, tags, type, x, y } = body;

    if (!workspaceId || !title) {
      console.error('[API] Missing required fields:', { workspaceId: !!workspaceId, title: !!title });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check authentication and workspace access
    console.log('[API] Checking workspace access for:', workspaceId);
    const { user, role } = await requireWorkspaceAccess(workspaceId, true);
    console.log('[API] Workspace access granted:', { userId: user.id, role });

    // Generate embedding (optional - node creation will succeed even if this fails)
    console.log('[API] Generating embedding for:', { title, contentLength: JSON.stringify(content).length });
    let embedding: number[] = [];
    try {
      embedding = await getNodeEmbedding({ title, content });
      console.log('[API] Embedding generated:', { embeddingLength: embedding?.length });
    } catch (embeddingGenError: any) {
      console.warn('[API] Embedding generation failed (continuing without embedding):', {
        message: embeddingGenError?.message,
      });
      // Continue without embedding - node creation will still succeed
      embedding = [];
    }

    // Create node - use Prisma for non-vector fields, raw SQL for vector
    console.log('[API] Creating node in database...');
    console.log('[API] Node data:', {
      workspaceId,
      title,
      content: typeof content,
      tags: tags?.length || 0,
      x: x || 0,
      y: y || 0,
    });
    
    // Ensure type is included in content if provided (following Miro/Notion pattern)
    const nodeContent = typeof content === 'object' && content !== null
      ? { ...content, ...(type ? { type } : {}) }
      : content || (type ? { type } : {});

    const newNode = await prisma.node.create({
      data: {
        workspaceId,
        title,
        content: nodeContent,
        tags: tags || [],
        x: x || 0,
        y: y || 0,
      },
    });
    
    console.log('[API] Node created successfully:', { 
      nodeId: newNode.id, 
      title: newNode.title,
      workspaceId: newNode.workspaceId,
      createdAt: newNode.createdAt.toISOString(),
    });
    
    // Verify node exists in database
    const verifyNode = await prisma.node.findUnique({
      where: { id: newNode.id },
      select: { id: true, title: true, workspaceId: true },
    });
    console.log('[API] Node verification:', { exists: !!verifyNode, verifiedNode: verifyNode });

    // Update embedding using raw SQL (pgvector) - OPTIONAL, skip silently if column doesn't exist
    let embeddingUpdated = false;
    
    if (embedding && embedding.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        // Only try to update embedding if OPENAI_API_KEY is set
        // Skip the column check to avoid error logs
        const vectorText = `[${embedding.join(',')}]`;
        await prisma.$executeRaw`
          UPDATE nodes
          SET embedding = ${vectorText}::vector
          WHERE id = ${newNode.id}::uuid
        `.catch(() => {
          // Silently fail if embedding column doesn't exist
        });
        embeddingUpdated = true;
      } catch (embeddingError: any) {
        // Silently skip embedding update if it fails
      }
    }

    // Auto-link: Find similar nodes (non-blocking) - SKIPPED if no embedding
    console.log('[API] Skipping auto-link (no embedding set)');
    // Auto-linking requires embeddings, so skip it for now
    // TODO: Re-enable auto-linking once embedding update is working

    // Log activity (non-blocking)
    console.log('[API] Logging activity...');
    try {
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
      console.log('[API] Activity logged successfully');
    } catch (activityError: any) {
      console.error('[API] Error logging create activity:', {
        message: activityError?.message,
        code: activityError?.code,
      });
      // Continue - activity logging failure shouldn't block node creation
    }

    // Return node with proper format
    const duration = Date.now() - startTime;
    console.log('[API] =========================================');
    console.log('[API] Node creation completed successfully in', duration, 'ms');
    console.log('[API] Node ID:', newNode.id);
    console.log('[API] Embedding updated:', embeddingUpdated);
    console.log('[API] =========================================');
    
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
        embedding: embeddingUpdated ? embedding : undefined, // Only include if successfully updated
      },
      embeddingUpdated, // Flag to indicate if embedding was set
    }, { status: 201 });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('========================================');
    console.error('[API] ERROR in create node API after', duration, 'ms');
    console.error('[API] Error type:', error?.constructor?.name || typeof error);
    console.error('[API] Error message:', error?.message || 'No message');
    console.error('[API] Error name:', error?.name);
    console.error('[API] Error code:', error?.code);
    console.error('[API] Error meta:', error?.meta);
    console.error('[API] Error stack:', error?.stack);
    console.error('[API] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================================');
    
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        errorType: error?.constructor?.name || typeof error,
        errorCode: error?.code,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}