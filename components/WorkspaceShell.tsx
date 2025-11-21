'use client';

import { ReactNode, useState } from 'react';
import WorkspaceTopNav from './WorkspaceTopNav';
import WorkspaceSidebar from './WorkspaceSidebar';
import ListView from './ListView';
import ClustersView from './ClustersView';

type View = 'map' | 'list' | 'clusters';

interface WorkspaceShellProps {
  workspaceId: string;
  workspace: {
    id: string;
    name: string;
    owner: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  userRole: 'owner' | 'editor' | 'viewer';
  children: ReactNode;
}

export default function WorkspaceShell({
  workspaceId,
  workspace,
  userRole,
  children,
}: WorkspaceShellProps) {
  const [view, setView] = useState<View>('map');

  return (
    <div className="flex h-screen flex-col bg-white overflow-hidden">
      {/* TopNav - always on top with high z-index */}
      <header className="relative z-20 flex h-14 items-center justify-between border-b border-gray-200 bg-white">
        <WorkspaceTopNav workspaceId={workspaceId} workspaceName={workspace.name} />
      </header>
      
      {/* Main content: sidebar + canvas + editor - must have min-h-0 to prevent overflow */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-0">
        {/* Left Sidebar */}
        <aside className="shrink-0 border-r border-gray-200 bg-white relative z-10">
          <WorkspaceSidebar workspaceId={workspaceId} userRole={userRole} view={view} setView={setView} />
        </aside>
        
        {/* Main Content - canvas area */}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden relative z-0">
          {view === 'map' && children}
          {view === 'list' && <ListView workspaceId={workspaceId} />}
          {view === 'clusters' && <ClustersView workspaceId={workspaceId} />}
        </main>
      </div>
    </div>
  );
}

