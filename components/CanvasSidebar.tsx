'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, List, History } from 'lucide-react';
import NodesListView from './NodesListView';
import HistoryBarContent from './HistoryBarContent';

interface CanvasSidebarProps {
  workspaceId: string;
}

export default function CanvasSidebar({ workspaceId }: CanvasSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'nodes' | 'history'>('nodes');
  const [isHistoryAttached, setIsHistoryAttached] = useState(false);

  // Listen for history bar attachment events
  useEffect(() => {
    const handleHistoryBarAttached = (event: CustomEvent) => {
      const attached = event.detail?.attached === true;
      setIsHistoryAttached(attached);
      if (attached) {
        setActiveTab('history');
      }
    };
    
    window.addEventListener('history-bar-attached', handleHistoryBarAttached as EventListener);
    
    // Also check localStorage on mount
    const attached = localStorage.getItem('historyBarAttached') === 'true';
    setIsHistoryAttached(attached);
    if (attached) {
      setActiveTab('history');
    }
    
    return () => {
      window.removeEventListener('history-bar-attached', handleHistoryBarAttached as EventListener);
    };
  }, []);

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
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-slate-50">
            <button
              onClick={() => setActiveTab('nodes')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'nodes'
                  ? 'text-slate-900 bg-white border-b-2 border-blue-500'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-gray-50'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Nodes</span>
            </button>
            {isHistoryAttached && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'history'
                    ? 'text-slate-900 bg-white border-b-2 border-blue-500'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-gray-50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'nodes' ? (
              <NodesListView workspaceId={workspaceId} />
            ) : (
              <HistoryBarContent />
            )}
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


