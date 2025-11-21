import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNodeEmbedding } from '@/lib/embeddings';
import { getAutoLinkNodes, createAutoEdges } from '@/lib/autoLink';
import type { Node } from '@/types/Node';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nodeId, title, content, tags, x, y } = body;

    if (!nodeId) {
      return NextResponse.json(
        { error: 'Missing node ID' },
        { status: 400 }
      );
    }

    // Get existing node
    const { data: existingNode } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', nodeId)
      .single();

    if (!existingNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Update fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    if (x !== undefined) updateData.x = x;
    if (y !== undefined) updateData.y = y;

    // Regenerate embedding if title or content changed
    if (title !== undefined || content !== undefined) {
      const embedding = await getNodeEmbedding({
        title: title || existingNode.title,
        content: content !== undefined ? content : existingNode.content,
      });
      updateData.embedding = embedding;

      // Re-check auto-linking
      const { data: allNodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('workspace_id', existingNode.workspace_id)
        .neq('id', nodeId);

      if (allNodes && allNodes.length > 0) {
        const similarNodes = getAutoLinkNodes(
          embedding,
          allNodes as Node[],
          nodeId
        );

        // Get existing edges for this node
        const { data: existingEdges } = await supabase
          .from('edges')
          .select('*')
          .or(`source.eq.${nodeId},target.eq.${nodeId}`)
          .eq('workspace_id', existingNode.workspace_id);

        const existingTargets = new Set(
          existingEdges
            ?.filter((e) => e.source === nodeId)
            .map((e) => e.target) || []
        );

        // Create new auto-edges
        const newAutoEdges = similarNodes.filter(
          (node) => !existingTargets.has(node.id)
        );

        if (newAutoEdges.length > 0) {
          const autoEdges = createAutoEdges(
            nodeId,
            newAutoEdges,
            existingNode.workspace_id
          );

          await supabase.from('edges').insert(
            autoEdges.map((edge) => ({
              workspace_id: edge.workspaceId,
              source: edge.source,
              target: edge.target,
              similarity: 1,
            }))
          );
        }
      }
    }

    // Update node
    const { data: updatedNode, error: updateError } = await supabase
      .from('nodes')
      .update(updateData)
      .eq('id', nodeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating node:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ node: updatedNode }, { status: 200 });
  } catch (error: any) {
    console.error('Error in update node API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
