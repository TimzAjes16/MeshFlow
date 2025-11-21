import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
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
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Get workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get nodes
    const { data: nodes } = await supabase
      .from('nodes')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Get edges
    const { data: edges } = await supabase
      .from('edges')
      .select('*')
      .eq('workspace_id', workspaceId);

    // Get members
    const { data: members } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId);

    const exportData = {
      workspace,
      nodes: nodes || [],
      edges: edges || [],
      members: members || [],
      exported_at: new Date().toISOString(),
      exported_by: user.id,
    };

    if (format === 'json') {
      return NextResponse.json(exportData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="meshflow-${workspaceId}-${Date.now()}.json"`,
        },
      });
    }

    if (format === 'markdown') {
      let markdown = `# ${workspace.name}\n\n`;
      markdown += `Exported: ${exportData.exported_at}\n\n`;
      markdown += `## Nodes (${nodes?.length || 0})\n\n`;

      nodes?.forEach((node: any) => {
        markdown += `### ${node.title}\n\n`;
        if (node.tags && node.tags.length > 0) {
          markdown += `Tags: ${node.tags.join(', ')}\n\n`;
        }
        // Extract text from JSONB content
        const contentText = typeof node.content === 'string' 
          ? node.content 
          : JSON.stringify(node.content);
        markdown += `${contentText}\n\n`;
        markdown += `---\n\n`;
      });

      markdown += `## Connections\n\n`;
      edges?.forEach((edge: any) => {
        const sourceNode = nodes?.find((n: any) => n.id === edge.source);
        const targetNode = nodes?.find((n: any) => n.id === edge.target);
        markdown += `- ${sourceNode?.title || edge.source} → ${targetNode?.title || edge.target}\n`;
      });

      return new NextResponse(markdown, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="meshflow-${workspaceId}-${Date.now()}.md"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in export workspace API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
