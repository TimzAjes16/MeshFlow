'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Network, List, Layers, Settings, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type View = 'map' | 'list' | 'clusters';

interface WorkspaceSidebarProps {
  workspaceId: string;
  userRole: 'owner' | 'editor' | 'viewer';
  view: View;
  setView: (view: View) => void;
}

export default function WorkspaceSidebar({ workspaceId, userRole, view, setView }: WorkspaceSidebarProps) {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('workspace-sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('workspace-sidebar-collapsed', String(newState));
  };

  const views = [
    { id: 'map' as View, label: 'Map', icon: Network },
    { id: 'list' as View, label: 'List', icon: List },
    { id: 'clusters' as View, label: 'Clusters', icon: Layers },
  ];

  const itemBase = 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer w-full';

  return (
    <motion.div
      initial={false}
      animate={{
        width: isCollapsed ? 64 : 256,
      }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex h-full flex-col bg-white relative group"
    >
      {/* Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-4 z-10 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-black" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-black" />
        )}
      </button>

      {/* Back to Dashboard */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className={`flex items-center gap-2 text-sm text-black hover:text-black transition-colors w-full relative group/item ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Back to Dashboard' : undefined}
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Back to Dashboard
              </motion.span>
            )}
          </AnimatePresence>
          
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Back to Dashboard
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
            </div>
          )}
        </button>
      </div>

      {/* Views */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-semibold text-black uppercase tracking-wider mb-3 px-3"
            >
              Views
            </motion.div>
          )}
        </AnimatePresence>
        
        {views.map((viewItem) => {
          const Icon = viewItem.icon;
          const isActive = view === viewItem.id;
          
          return (
            <button
              key={viewItem.id}
              type="button"
              onClick={() => setView(viewItem.id)}
              className={`${itemBase} ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-black hover:bg-gray-100'
              } ${isCollapsed ? 'justify-center' : ''} relative group/item`}
              title={isCollapsed ? viewItem.label : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {viewItem.label}
                  </motion.span>
                )}
              </AnimatePresence>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {viewItem.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Settings */}
      <div className="p-4 border-t border-gray-200 shrink-0">
        <button
          type="button"
          onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-colors w-full ${
            isCollapsed ? 'justify-center' : ''
          } relative group/item`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
          
          {/* Tooltip for collapsed state */}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/item:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Settings
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}
