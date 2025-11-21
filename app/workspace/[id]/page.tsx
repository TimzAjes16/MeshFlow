import Canvas from '@/components/Canvas';
import { notFound } from 'next/navigation';
import db from '@/lib/db';

export default async function WorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const workspace = db
    .prepare('SELECT * FROM workspaces WHERE id = ?')
    .get(params.id) as any;

  if (!workspace) {
    notFound();
  }

  return <Canvas workspaceId={params.id} />;
}

