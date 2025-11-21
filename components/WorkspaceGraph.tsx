'use client';

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useRouter } from 'next/navigation';

const COLORS = [
  '#4f46e5', // indigo
  '#0ea5e9', // sky
  '#22c55e', // green
  '#eab308', // yellow
  '#ec4899', // pink
  '#8b5cf6', // violet
];

type Workspace = {
  id: string;
  name: string;
  nodeCount?: number;
  edgeCount?: number;
};

type Props = {
  workspaces: Workspace[];
  searchQuery?: string;
};

function WorkspaceNode({ data }: { data: { label: string; color: string; nodeCount?: number } }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full shadow-md hover:shadow-lg transition-shadow cursor-pointer"
        style={{ 
          background: data.color,
          boxShadow: `0 0 20px ${data.color}40, 0 4px 12px rgba(0,0,0,0.15)`,
        }}
      >
        <span className="text-sm font-semibold text-white">
          {data.label.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <span className="mt-2 max-w-[100px] truncate text-xs font-medium text-slate-700 text-center">
        {data.label}
      </span>
      {data.nodeCount !== undefined && (
        <span className="text-[10px] text-slate-500 mt-0.5">
          {data.nodeCount} nodes
        </span>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workspaceNode: WorkspaceNode,
};

export default function WorkspaceGraph({ workspaces, searchQuery = '' }: Props) {
  const router = useRouter();

  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery) return workspaces;
    return workspaces.filter((ws) =>
      ws.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [workspaces, searchQuery]);

  const nodes: Node[] = useMemo(() => {
    if (filteredWorkspaces.length === 0) return [];

    // Arrange nodes in a circle
    return filteredWorkspaces.map((ws, index) => {
      const angle = (index / filteredWorkspaces.length) * Math.PI * 2;
      const radius = filteredWorkspaces.length > 1 ? 150 : 0;
      
      return {
        id: ws.id,
        position: {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        },
        data: {
          label: ws.name,
          color: COLORS[index % COLORS.length],
          nodeCount: ws.nodeCount,
        },
        type: 'workspaceNode',
      };
    });
  }, [filteredWorkspaces]);

  const edges: Edge[] = useMemo(() => {
    // Add edges between adjacent workspaces for visual interest
    if (filteredWorkspaces.length < 2) return [];
    
    const edgeList: Edge[] = [];
    for (let i = 0; i < filteredWorkspaces.length; i++) {
      const nextIndex = (i + 1) % filteredWorkspaces.length;
      edgeList.push({
        id: `edge-${filteredWorkspaces[i].id}-${filteredWorkspaces[nextIndex].id}`,
        source: filteredWorkspaces[i].id,
        target: filteredWorkspaces[nextIndex].id,
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
        animated: false,
      });
    }
    return edgeList;
  }, [filteredWorkspaces]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      router.push(`/workspace/${node.id}`);
    },
    [router]
  );

  if (filteredWorkspaces.length === 0) {
    return (
      <div className="mt-6 h-72 w-full flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
        <p className="text-slate-500 text-sm font-medium">
          {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
        </p>
        {!searchQuery && (
          <p className="text-slate-400 text-xs mt-1">
            Click "New Workspace" to get started
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
        onNodeClick={onNodeClick}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background gap={16} size={0.7} color="#e2e8f0" />
        <MiniMap 
          zoomable 
          pannable 
          nodeColor={(node) => {
            const color = (node.data as any)?.color || '#6366f1';
            return color;
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

