import WorkspaceProvider from '@/components/WorkspaceProvider';
import CanvasPageClient from '@/components/CanvasPageClient';

interface CanvasPageProps {
  params: {
    id: string;
  };
}

// Layout handles auth and access checks
export default function CanvasPage({ params }: CanvasPageProps) {
  return (
    <WorkspaceProvider workspaceId={params.id}>
      <CanvasPageClient workspaceId={params.id} />
    </WorkspaceProvider>
  );
}