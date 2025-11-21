import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNodeEmbedding } from '@/lib/embeddings';
import { getAutoLinkNodes, createAutoEdges } from '@/lib/autoLink';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = params.id;
    const body = await request.json();
    const { nodes, edges, format = 'json' } = body;

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'Invalid nodes data' }, { status: 400 });
    }

    // Check permissions
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    const canImport =
      workspace?.owner_id === user.id ||
      member?.role === 'owner' ||
      member?.role === 'editor';

    if (!canImport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Import nodes
    const importedNodes: any[] = [];
    const nodeIdMap = new Map<string, string>();

    for (const node of nodes) {
      // Generate embedding
      const embedding = await getNodeEmbedding({
        title: node.title,
        content: node.content || {},
      });

      // Create node
      const { data: newNode, error: nodeError } = await supabase
        .from('nodes')
        .insert({
          workspace_id: workspaceId,
          title: node.title,
          content: node.content || {},
          tags: node.tags || [],
          embedding,
          x: node.x || Math.random() * 1000,
          y: node.y || Math.random() * 1000,
        })
        .select()
        .single();

      if (nodeError) {
        console.error('Error importing node:', nodeError);
        continue;
      }

      importedNodes.push(newNode);
      nodeIdMap.set(node.id, newNode.id);
    }

    // Import edges
    if (edges && Array.isArray(edges)) {
      const importedEdges: any[] = [];

      for (const edge of edges) {
        const newSourceId = nodeIdMap.get(edge.source);
        const newTargetId = nodeIdMap.get(edge.target);

        if (!newSourceId || !newTargetId) {
          continue; // Skip edges with missing nodes
        }

        const { data: newEdge, error: edgeError } = await supabase
          .from('edges')
          .insert({
            workspace_id: workspaceId,
            source: newSourceId,
            target: newTargetId,
            label: edge.label,
            similarity: edge.similarity,
          })
          .select()
          .single();

        if (!edgeError && newEdge) {
          importedEdges.push(newEdge);
        }
      }

      // Log activity
      await supabase.rpc('log_activity', {
        p_workspace_id: workspaceId,
        p_user_id: user.id,
        p_action: 'import',
        p_entity_type: 'workspace',
        p_entity_id: workspaceId,
        p_details: {
          nodes_count: importedNodes.length,
          edges_count: importedEdges.length,
          format,
        },
      });

      return NextResponse.json(
        {
          success: true,
          imported: {
            nodes: importedNodes.length,
            edges: importedEdges.length,
          },
          nodes: importedNodes,
          edges: importedEdges,
        },
        { status: 201 }
      );
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_workspace_id: workspaceId,
      p_user_id: user.id,
      p_action: 'import',
      p_entity_type: 'workspace',
      p_entity_id: workspaceId,
      p_details: {
        nodes_count: importedNodes.length,
        edges_count: 0,
        format,
      },
    });

    return NextResponse.json(
      {
        success: true,
        imported: {
          nodes: importedNodes.length,
          edges: 0,
        },
        nodes: importedNodes,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in import workspace API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
