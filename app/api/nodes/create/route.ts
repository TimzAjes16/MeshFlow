import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNodeEmbedding } from '@/lib/embeddings';
import { getAutoLinkNodes, createAutoEdges } from '@/lib/autoLink';
import type { Node } from '@/types/Node';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, title, content, tags, x, y } = body;

    if (!workspaceId || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate embedding
    const embedding = await getNodeEmbedding({ title, content });

    // Create node
    const { data: newNode, error: nodeError } = await supabase
      .from('nodes')
      .insert({
        workspace_id: workspaceId,
        title,
        content: content || {},
        tags: tags || [],
        embedding,
        x: x || 0,
        y: y || 0,
      })
      .select()
      .single();

    if (nodeError) {
      console.error('Error creating node:', nodeError);
      return NextResponse.json({ error: nodeError.message }, { status: 500 });
    }

    // Auto-link: Get similar nodes
    const { data: allNodes } = await supabase
      .from('nodes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('id', newNode.id);

    if (allNodes && allNodes.length > 0) {
      const similarNodes = getAutoLinkNodes(
        embedding,
        allNodes as Node[],
        newNode.id
      );

      if (similarNodes.length > 0) {
        // Create auto-edges
        const autoEdges = createAutoEdges(newNode.id, similarNodes, workspaceId);

        // Insert edges
        await supabase.from('edges').insert(
          autoEdges.map((edge) => ({
            workspace_id: edge.workspaceId,
            source: edge.source,
            target: edge.target,
            similarity: 1, // Will be calculated properly
          }))
        );
      }
    }

    return NextResponse.json({ node: newNode }, { status: 201 });
  } catch (error: any) {
    console.error('Error in create node API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
