import { redirect } from 'next/navigation';
import WorkspaceList from '@/components/WorkspaceList';

export default function Home() {
  return <WorkspaceList />;
}
