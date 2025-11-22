import { X, Sparkles, Settings, FileText, Trash2 } from 'lucide-react';
import { useMeshStore } from '../store/useMeshStore';
import { format } from 'date-fns';

interface SidebarProps {
  onClose: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
  const { nodes, edges, selectedNodeId, setSelectedNode, deleteNode } = useMeshStore();

  const sortedNodes = [...nodes].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4">
        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>{nodes.length} nodes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>{edges.length} connections</span>
          </div>
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {sortedNodes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs mt-1">Click "New Note" to get started</p>
          </div>
        ) : (
          <div className="p-2">
            {sortedNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const connectionCount = edges.filter(
                (e) => {
                  const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
                  const targetId = typeof e.target === 'string' ? e.target : e.target.id;
                  return sourceId === node.id || targetId === node.id;
                }
              ).length;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node.id)}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {node.title || 'Untitled'}
                      </h3>
                      {node.content && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {node.content}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{format(new Date(node.updatedAt), 'MMM d, yyyy')}</span>
                        {connectionCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {connectionCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this note?')) {
                          deleteNode(node.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <button className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );
};

export default Sidebar;


