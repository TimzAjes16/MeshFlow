'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid, Plus, Search } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt: string;
}

interface WorkspaceSwitcherProps {
  isVisible: boolean;
  currentWorkspaceId: string;
  onClose: () => void;
}

export default function WorkspaceSwitcher({ 
  isVisible, 
  currentWorkspaceId,
  onClose 
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch workspaces when switcher becomes visible
  useEffect(() => {
    if (isVisible && workspaces.length === 0) {
      fetchWorkspaces();
    }
  }, [isVisible]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isVisible) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onClose]);

  const fetchWorkspaces = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with workspaces property
        const workspacesList = Array.isArray(data) ? data : (data.workspaces || []);
        setWorkspaces(workspacesList.map((ws: any) => ({
          id: ws.id,
          name: ws.name,
          nodeCount: ws.nodeCount || ws._count?.nodes || 0,
          edgeCount: ws.edgeCount || ws._count?.edges || 0,
          updatedAt: ws.updatedAt || new Date().toISOString(),
        })));
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleWorkspaceClick = (workspaceId: string) => {
    if (workspaceId !== currentWorkspaceId) {
      router.push(`/workspace/${workspaceId}/canvas`);
    }
    onClose();
  };

  const handleCreateNew = () => {
    router.push('/dashboard');
    onClose();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl mx-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Switch Workspace
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-400">ESC</span>
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Workspace Grid */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Create New Workspace */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateNew}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all group"
                >
                  <Plus className="w-8 h-8 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    New Workspace
                  </span>
                </motion.button>

                {/* Workspace Cards */}
                {filteredWorkspaces.map((workspace) => (
                  <motion.button
                    key={workspace.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleWorkspaceClick(workspace.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      workspace.id === currentWorkspaceId
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Grid className="w-5 h-5 text-gray-400 mb-1" />
                      {workspace.id === currentWorkspaceId && (
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {workspace.name}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>{workspace.nodeCount} nodes</span>
                      <span>{workspace.edgeCount} links</span>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {new Date(workspace.updatedAt).toLocaleDateString()}
                    </div>
                  </motion.button>
                ))}

                {filteredWorkspaces.length === 0 && !isLoading && (
                  <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

