/**
 * Org Chart Node Component
 * Renders an organizational chart
 */

import { memo, useState, useCallback, useEffect } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Building2, Plus, X } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface OrgChartNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface OrgChartContent {
  type: 'org-chart';
  rootNode: { id: string; name: string; role: string };
  nodes: Array<{ id: string; name: string; role: string; parentId: string }>;
}

function OrgChartNode({ data, selected, id }: OrgChartNodeProps) {
  const { node } = data;
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  
  const orgContent: OrgChartContent = typeof node.content === 'object' && node.content?.type === 'org-chart'
    ? node.content
    : { 
        type: 'org-chart', 
        rootNode: { id: 'root', name: 'CEO', role: '' },
        nodes: [],
      };

  const [rootName, setRootName] = useState(orgContent.rootNode?.name || 'CEO');
  const [rootRole, setRootRole] = useState(orgContent.rootNode?.role || '');
  const [nodes, setNodes] = useState(orgContent.nodes || []);

  useEffect(() => {
    const updateOrgChart = () => {
      updateNode(id, {
        content: {
          type: 'org-chart',
          rootNode: { id: 'root', name: rootName, role: rootRole },
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
              type: 'org-chart',
              rootNode: { id: 'root', name: rootName, role: rootRole },
              nodes,
            },
          }),
        }).catch(console.error);
      }
    };

    const timer = setTimeout(updateOrgChart, 500);
    return () => clearTimeout(timer);
  }, [id, rootName, rootRole, nodes, updateNode]);

  const handleAddNode = useCallback(() => {
    const newNode = {
      id: `node-${Date.now()}`,
      name: 'Team Member',
      role: '',
      parentId: 'root',
    };
    setNodes((prev) => [...prev, newNode]);
  }, []);

  const handleRemoveNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
  }, []);

  return (
    <BaseNode node={node} selected={selected} nodeId={id}>
      <div
        className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4 w-full h-full flex flex-col gap-3"
        style={{
          minWidth: node.width || 400,
          minHeight: node.height || 300,
        }}
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-indigo-700" />
          <span className="font-semibold text-sm text-indigo-800">Org Chart</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3">
            <div className="bg-indigo-100 border border-indigo-300 rounded p-3">
              <input
                type="text"
                value={rootName}
                onChange={(e) => setRootName(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-indigo-300 rounded text-sm font-semibold text-indigo-900 mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Name"
                disabled={!selected}
              />
              <input
                type="text"
                value={rootRole}
                onChange={(e) => setRootRole(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-indigo-300 rounded text-xs text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Role"
                disabled={!selected}
              />
            </div>
            {nodes.map((childNode) => (
              <div key={childNode.id} className="flex items-center gap-2 ml-6">
                <div className="flex-1 bg-white border border-indigo-300 rounded p-2">
                  <input
                    type="text"
                    value={childNode.name}
                    onChange={(e) => {
                      setNodes((prev) =>
                        prev.map((n) => (n.id === childNode.id ? { ...n, name: e.target.value } : n))
                      );
                    }}
                    className="w-full px-2 py-1 border border-indigo-200 rounded text-sm font-medium text-gray-900 mb-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Name"
                    disabled={!selected}
                  />
                  <input
                    type="text"
                    value={childNode.role}
                    onChange={(e) => {
                      setNodes((prev) =>
                        prev.map((n) => (n.id === childNode.id ? { ...n, role: e.target.value } : n))
                      );
                    }}
                    className="w-full px-2 py-1 border border-indigo-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Role"
                    disabled={!selected}
                  />
                </div>
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
            className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-sm font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(OrgChartNode);

