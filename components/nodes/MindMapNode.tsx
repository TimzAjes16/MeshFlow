/**
 * Mind Map Node Component
 * Renders an interactive mind map
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Network, Plus, X } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface MindMapNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface MindMapContent {
  type: 'mind-map';
  rootNode: { id: string; text: string };
  nodes: Array<{ id: string; text: string; parentId: string }>;
}

function MindMapNode({ data, selected, id }: MindMapNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const mindMapContent: MindMapContent = typeof node.content === 'object' && node.content?.type === 'mind-map'
    ? node.content
    : { 
        type: 'mind-map', 
        rootNode: { id: 'root', text: 'Central Idea' },
        nodes: [],
      };

  const [rootText, setRootText] = useState(mindMapContent.rootNode?.text || 'Central Idea');
  const [nodes, setNodes] = useState(mindMapContent.nodes || []);

  useEffect(() => {
    const updateMindMap = () => {
      updateNode(id, {
        content: {
          type: 'mind-map',
          rootNode: { id: 'root', text: rootText },
          nodes,
        },
      });

      const workspaceId = useWorkspaceStore.getState().currentWorkspace?.id;
      if (workspaceId) {
        fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: id,
            content: {
              type: 'mind-map',
              rootNode: { id: 'root', text: rootText },
              nodes,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateMindMap, 500);
    return () => clearTimeout(timer);
  }, [id, rootText, nodes, updateNode]);

  const handleAddNode = useCallback(() => {
    const newNode = {
      id: `node-${Date.now()}`,
      text: 'New Idea',
      parentId: 'root',
    };
    setNodes((prev) => [...prev, newNode]);
  }, []);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, text: string) => {
    if (nodeId === 'root') {
      setRootText(text);
    } else {
      setNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, text } : n)));
    }
  }, []);

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div
        className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 w-full h-full flex flex-col gap-3"
        style={{
          minWidth: node.width || 400,
          minHeight: node.height || 300,
        }}
      >
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-700" />
          <span className="font-semibold text-sm text-purple-800">Mind Map</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rootText}
                onChange={(e) => handleUpdateNode('root', e.target.value)}
                className="px-3 py-2 bg-purple-100 border border-purple-300 rounded text-sm font-semibold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                disabled={!selected}
              />
            </div>
            {nodes.map((childNode) => (
              <div key={childNode.id} className="flex items-center gap-2 ml-6">
                <div className="w-2 h-2 bg-purple-400 rounded-full" />
                <input
                  type="text"
                  value={childNode.text}
                  onChange={(e) => handleUpdateNode(childNode.id, e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-purple-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  disabled={!selected}
                />
                {selected && (
                  <button
                    onClick={() => handleRemoveNode(childNode.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {selected && (
          <button
            onClick={handleAddNode}
            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(MindMapNode);

