import { redirect } from 'next/navigation';

// Redirect /workspace/[id] to /workspace/[id]/canvas by default

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: workspaceId } = await params;
  redirect(`/workspace/${workspaceId}/canvas`);
}

