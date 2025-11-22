import WorkspaceProvider from '@/components/WorkspaceProvider';
import CanvasPageClient from '@/components/CanvasPageClient';

interface CanvasPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Layout handles auth and access checks
export default async function CanvasPage({ params }: CanvasPageProps) {
  const { id: workspaceId } = await params;
  return (
    <WorkspaceProvider workspaceId={workspaceId}>
      <CanvasPageClient workspaceId={workspaceId} />
    </WorkspaceProvider>
  );
}