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

    const commentId = params.id;

    // Get comment to check ownership
    const { data: comment, error: getError } = await supabase
      .from('comments')
      .select('user_id, node_id')
      .eq('id', commentId)
      .single();

    if (getError || !comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Get node to log activity
    const { data: node } = await supabase
      .from('nodes')
      .select('workspace_id')
      .eq('id', comment.node_id)
      .single();

    if (node) {
      await supabase.rpc('log_activity', {
        p_workspace_id: node.workspace_id,
        p_user_id: user.id,
        p_action: 'delete_comment',
        p_entity_type: 'comment',
        p_entity_id: commentId,
        p_details: { node_id: comment.node_id },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error in delete comment API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
