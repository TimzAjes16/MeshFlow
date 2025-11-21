import { redirect } from 'next/navigation';

// Redirect /workspace/[id] to /workspace/[id]/canvas by default
export default async function WorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/workspace/${params.id}/canvas`);
}

