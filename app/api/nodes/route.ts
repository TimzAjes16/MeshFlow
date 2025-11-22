import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { generateEmbedding } from '@/lib/ai';
import { requireWorkspaceAccess } from '@/lib/api-helpers';

// Legacy route - redirects to /api/nodes/create
// Kept for backward compatibility with old Canvas.tsx component
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, title, content, x, y, tags } = body;

    if (!workspaceId || !title) {
      return NextResponse.json(
        { error: 'Workspace ID and title are required' },
        { status: 400 }
      );
    }

    // Check authentication and workspace access
    await requireWorkspaceAccess(workspaceId, true);

    // Generate embedding (optional - node creation will succeed even if this fails)
    let embedding: number[] = [];
    try {
      const text = `${title} ${content || ''}`.trim();
      embedding = await generateEmbedding(text);
    } catch (embeddingError: any) {
      console.warn('[API] Embedding generation failed (continuing without embedding):', embeddingError?.message);
    }

    // Create node using Prisma
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

    // Update embedding using raw SQL (pgvector) - OPTIONAL, skip silently if column doesn't exist
    if (embedding && embedding.length > 0 && process.env.OPENAI_API_KEY) {
      try {
        // Only try to update embedding if OPENAI_API_KEY is set
        const vectorText = `[${embedding.join(',')}]`;
        await prisma.$executeRaw`
          UPDATE nodes
          SET embedding = ${vectorText}::vector
          WHERE id = ${newNode.id}::uuid
        `.catch(() => {
          // Silently fail if embedding column doesn't exist
        });
      } catch (embeddingError: any) {
        // Silently skip embedding update if it fails
      }
    }

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
        embedding: embedding.length > 0 ? embedding : undefined,
      },
    });
  } catch (error: any) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create node' },
      { status: error?.status || 500 }
    );
  }
}

