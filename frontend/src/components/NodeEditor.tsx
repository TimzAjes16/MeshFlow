import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Download, Maximize2, Minimize2, Hash, CheckCircle2, Info, Camera } from 'lucide-react';
import { useMeshStore } from '../store/useMeshStore';
import { aiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface NodeEditorProps {
  nodeId: string;
  onClose: () => void;
}

interface Tag {
  id: string;
  label: string;
  color: 'purple' | 'blue' | 'beige' | 'gray';
}

const tagColors = {
  purple: 'bg-purple-100 text-purple-700',
  blue: 'bg-blue-100 text-blue-700',
  beige: 'bg-amber-100 text-amber-700',
  gray: 'bg-gray-100 text-gray-700',
};

const NodeEditor = ({ nodeId, onClose }: NodeEditorProps) => {
  const { nodes, edges, updateNode, addEdge } = useMeshStore();
  const node = nodes.find((n) => n.id === nodeId);
  
  const [title, setTitle] = useState(node?.title || 'Untitled Document');
  const [content, setContent] = useState(node?.content || '');
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isContentFocused, setIsContentFocused] = useState(false);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (node) {
      setTitle(node.title || 'Untitled Document');
      setContent(node.content || '');
      // Initialize with some default tags for demo
      if (tags.length === 0) {
        setTags([
          { id: '1', label: 'Productivity', color: 'purple' },
          { id: '2', label: 'Project Alpha', color: 'blue' },
          { id: '3', label: 'Meeting Notes', color: 'beige' },
        ]);
      }
    }
  }, [node]);

  useEffect(() => {
    // Auto-save on change
    if (node) {
      const timeoutId = setTimeout(() => {
        updateNode(nodeId, { title, content });
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [title, content, nodeId, node, updateNode]);

  const handleAddTag = () => {
    if (newTagLabel.trim()) {
      const colors: Tag['color'][] = ['purple', 'blue', 'beige', 'gray'];
      const randomColor = colors[tags.length % colors.length];
      const newTag: Tag = {
        id: Date.now().toString(),
        label: newTagLabel.trim(),
        color: randomColor,
      };
      setTags([...tags, newTag]);
      setNewTagLabel('');
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(t => t.id !== tagId));
  };

  const handleAISuggestion = async () => {
    if (!content.trim()) return;
    
    setLoadingSuggestions(true);
    try {
      const existingNodes = nodes.filter((n) => n.id !== nodeId);
      const result = await aiService.suggestConnections(content, existingNodes);
      setSuggestions(result);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleConnect = (targetNodeId: string) => {
    const edgeId = `edge-${nodeId}-${targetNodeId}`;
    const exists = edges.some((e) => e.id === edgeId);
    
    if (!exists) {
      addEdge({
        id: edgeId,
        source: nodeId,
        target: targetNodeId,
        strength: 0.5,
      });
    }
    
    setSuggestions([]);
  };

  if (!node) return null;

  const connectedNodes = edges
    .filter((e) => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
      const targetId = typeof e.target === 'string' ? e.target : e.target.id;
      return sourceId === nodeId || targetId === nodeId;
    })
    .map((e) => {
      const otherId = typeof e.source === 'string' ? e.source : e.source.id === nodeId 
        ? (typeof e.target === 'string' ? e.target : e.target.id)
        : (typeof e.source === 'string' ? e.source : e.source.id);
      return nodes.find((n) => n.id === otherId);
    })
    .filter(Boolean);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className={`fixed right-0 top-0 bottom-0 ${
        isMaximized ? 'w-full' : 'w-[420px]'
      } bg-white rounded-l-2xl shadow-2xl border-l border-gray-200/50 flex flex-col z-50 transition-all duration-300`}
      style={{
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.08), -1px 0 4px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-5 bg-gray-50/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Hash className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-500">Rich Text</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {}}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
        {/* Title Field */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Document"
            className="w-full text-2xl font-semibold text-gray-900 placeholder:text-gray-400 border-none outline-none focus:ring-0 bg-transparent"
          />
        </div>

        {/* Rich Text Editor */}
        <div className="px-6 py-6">
          <div className="relative">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setIsContentFocused(true)}
              onBlur={() => setIsContentFocused(false)}
              placeholder="Start writing..."
              className="w-full min-h-[400px] text-gray-700 leading-relaxed resize-none border-none outline-none focus:ring-0 placeholder:text-gray-400 text-[15px] font-normal"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
            />
            
            {/* Placeholder content example - only show when empty and not focused */}
            {!content && !isContentFocused && (
              <div className="absolute top-0 left-0 pointer-events-none text-gray-400 text-[15px] leading-relaxed opacity-50">
                <ul className="space-y-1 list-disc list-inside ml-0">
                  <li>Example</li>
                  <li className="text-green-600 font-semibold">Bold</li>
                  <li>Mast</li>
                  <li className="text-green-600 font-semibold">Bold</li>
                  <li className="italic">Italics</li>
                  <li className="italic">Italics</li>
                  <li>Now Uter</li>
                  <li>Hornum</li>
                  <li>Hastties</li>
                  <li>Upoinge Sder</li>
                  <li>Houmous</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {tags.map((tag) => (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tagColors[tag.color]}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      tag.color === 'purple' ? 'bg-purple-500' :
                      tag.color === 'blue' ? 'bg-blue-500' :
                      tag.color === 'beige' ? 'bg-amber-500' :
                      'bg-gray-500'
                    }`} />
                    <span>{tag.label}</span>
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 hover:opacity-70 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagLabel}
              onChange={(e) => setNewTagLabel(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 bg-white"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* AI Suggestion Button */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleAISuggestion}
            disabled={loadingSuggestions || !content.trim()}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 border-2 border-red-500/30 hover:border-red-500/50"
            style={{
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Sparkles className={`w-4 h-4 ${loadingSuggestions ? 'animate-pulse' : ''}`} />
            <span>{loadingSuggestions ? 'Finding suggestions...' : 'AI Suggestion'}</span>
          </button>

          {/* Suggestions List */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-2"
              >
                {suggestions.map((suggestion) => {
                  const targetNode = nodes.find((n) => n.id === suggestion.nodeId);
                  if (!targetNode) return null;
                  
                  return (
                    <motion.div
                      key={suggestion.nodeId}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                      onClick={() => handleConnect(suggestion.nodeId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{targetNode.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                          <p className="text-xs text-purple-600 mt-1 font-medium">
                            {(suggestion.confidence * 100).toFixed(0)}% match
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Connected Nodes */}
        {connectedNodes.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Connected</h3>
            <div className="space-y-2">
              {connectedNodes.map((connectedNode) => (
                <div
                  key={connectedNode!.id}
                  className="p-2 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer text-sm text-gray-700"
                  onClick={() => {
                    useMeshStore.getState().setSelectedNode(connectedNode!.id);
                  }}
                >
                  {connectedNode!.title}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default NodeEditor;
