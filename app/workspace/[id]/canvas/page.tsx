import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CanvasContainer from '@/components/CanvasContainer';
import NodeEditorPanel from '@/components/NodeEditorPanel';
import TopBar from '@/components/TopBar';
import WorkspaceProvider from '@/components/WorkspaceProvider';
import CanvasPageClient from '@/components/CanvasPageClient';

interface CanvasPageProps {
  params: {
    id: string;
  };
}

export default async function CanvasPage({ params }: CanvasPageProps) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get workspace
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !workspace) {
    redirect('/dashboard');
  }

  // Check if user has access
  const { data: member } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (workspace.owner_id !== user.id && !member) {
    redirect('/dashboard');
  }

  return (
    <WorkspaceProvider workspaceId={params.id}>
      <CanvasPageClient workspaceId={params.id} />
    </WorkspaceProvider>
  );
}