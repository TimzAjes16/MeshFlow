'use client';

import { ReactNode } from 'react';
import WorkspaceTopNav from './WorkspaceTopNav';

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
  return (
    <div className="flex h-screen flex-col bg-white overflow-hidden">
      {/* TopNav - always on top with high z-index */}
      <header className="relative z-20 flex items-center justify-between bg-white" style={{ 
        minHeight: '40px',
        height: '40px'
      }}>
        <WorkspaceTopNav workspaceId={workspaceId} workspaceName={workspace.name} />
      </header>
      
      {/* Main Content - full screen canvas */}
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden relative z-0">
        {children}
      </main>
    </div>
  );
}

