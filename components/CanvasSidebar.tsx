'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import NodesListView from './NodesListView';

interface CanvasSidebarProps {
  workspaceId: string;
}

export default function CanvasSidebar({ workspaceId }: CanvasSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`relative bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-80'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 z-10 w-6 h-6 bg-white border border-gray-300 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {!isCollapsed && (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-slate-50 flex items-center gap-2">
            <List className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">Nodes</h2>
          </div>

          {/* Nodes List */}
          <div className="flex-1 overflow-hidden">
            <NodesListView workspaceId={workspaceId} />
          </div>
        </>
      )}

      {/* Collapsed State - Show Icon Only */}
      {isCollapsed && (
        <div className="flex flex-col items-center pt-4">
          <List className="w-5 h-5 text-slate-600" />
        </div>
      )}
    </div>
  );
}


