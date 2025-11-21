import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
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

    const nodeId = params.id;

    // Get node to check permissions
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('workspace_id')
      .eq('id', nodeId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Check workspace permissions
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', node.workspace_id)
      .single();

    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', node.workspace_id)
      .eq('user_id', user.id)
      .single();

    const canDelete =
      workspace?.owner_id === user.id ||
      member?.role === 'owner' ||
      member?.role === 'editor';

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete node (cascade will delete edges and related data)
    const { error: deleteError } = await supabase
      .from('nodes')
      .delete()
      .eq('id', nodeId);

    if (deleteError) {
      console.error('Error deleting node:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity
    await supabase.rpc('log_activity', {
      p_workspace_id: node.workspace_id,
      p_user_id: user.id,
      p_action: 'delete',
      p_entity_type: 'node',
      p_entity_id: nodeId,
      p_details: { node_id: nodeId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in delete node API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const nodeId = params.id;

    const { data: node, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('id', nodeId)
      .single();

    if (error || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    return NextResponse.json({ node }, { status: 200 });
  } catch (error: any) {
    console.error('Error in get node API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}