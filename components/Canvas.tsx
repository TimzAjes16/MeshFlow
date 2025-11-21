'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateId } from '@/lib/utils';
import NodeEditor from './NodeEditor';
import SearchBar from './SearchBar';
import Toolbar from './Toolbar';
import CustomNode from './CustomNode';
import { ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactFlowNode, ReactFlowEdge } from '@/lib/types';

const nodeTypes = {
  custom: CustomNode,
};

interface CanvasProps {
  workspaceId: string;
}

export default function Canvas({ workspaceId }: CanvasProps) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const loadWorkspace = async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/graph`);
      const data = await response.json();

      const flowNodes: Node[] = data.nodes.map((n: any) => ({
        id: n.id,
        type: 'custom',
        position: { x: n.x, y: n.y },
        data: {
          label: n.title,
          content: n.content,
          highlighted: highlightedNodeIds.has(n.id),
        },
      }));

      const flowEdges: Edge[] = data.edges.map((e: any) => ({
        id: e.id,
        source: e.sourceId,
        target: e.targetId,
        type: 'smoothstep',
        animated: false,
        style: { strokeWidth: 2 },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Error loading workspace:', error);
    }
  };

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target) return;

      try {
        const response = await fetch('/api/edges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            sourceId: params.source,
            targetId: params.target,
          }),
        });

        if (response.ok) {
          const newEdge = {
            id: generateId(),
            source: params.source,
            target: params.target,
            type: 'smoothstep',
            animated: false,
            style: { strokeWidth: 2 },
          };
          setEdges((eds) => addEdge(newEdge, eds));
        }
      } catch (error) {
        console.error('Error creating edge:', error);
      }
    },
    [workspaceId, setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsEditorOpen(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setIsEditorOpen(false);
  }, []);

  const autoLinkNode = useCallback(
    async (nodeId: string) => {
      try {
        const response = await fetch(`/api/nodes/${nodeId}/auto-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.edges && data.edges.length > 0) {
            // Add new edges to the graph
            const newEdges: Edge[] = data.edges.map((e: any) => ({
              id: e.id,
              source: e.sourceId,
              target: e.targetId,
              type: 'smoothstep',
              animated: false,
              style: { strokeWidth: 2 },
            }));
            setEdges((eds) => [...eds, ...newEdges]);
          }
        }
      } catch (error) {
        console.error('Error auto-linking node:', error);
      }
    },
    [workspaceId, setEdges]
  );

  const handleCreateNode = useCallback(
    async (event: React.MouseEvent) => {
      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const title = prompt('Node title:');
      if (!title) return;

      try {
        const response = await fetch('/api/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            title,
            content: '',
            x: position.x,
            y: position.y,
          }),
        });

        const data = await response.json();
        if (data.node) {
          const newNode: Node = {
            id: data.node.id,
            type: 'custom',
            position: { x: position.x, y: position.y },
            data: {
              label: data.node.title,
              content: data.node.content,
            },
          };
          setNodes((nds) => [...nds, newNode]);

          // Auto-link if enabled
          if (isAutoLinking) {
            await autoLinkNode(data.node.id);
          }
        }
      } catch (error) {
        console.error('Error creating node:', error);
      }
    },
    [workspaceId, reactFlowInstance, setNodes, isAutoLinking, autoLinkNode]
  );

  const handleSearch = useCallback((nodeIds: string[]) => {
    setHighlightedNodeIds(new Set(nodeIds));
    // Update node data for highlighting
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          highlighted: nodeIds.includes(node.id),
        },
      }))
    );
  }, [setNodes]);

  const handleUpdateNode = useCallback(
    async (nodeId: string, title: string, content: string) => {
      try {
        const response = await fetch(`/api/nodes/${nodeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content }),
        });

        if (response.ok) {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    data: { ...node.data, label: title, content },
                  }
                : node
            )
          );

          // Re-run auto-linking if enabled
          if (isAutoLinking) {
            await autoLinkNode(nodeId);
          }
        }
      } catch (error) {
        console.error('Error updating node:', error);
      }
    },
    [setNodes, isAutoLinking, autoLinkNode]
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      try {
        const response = await fetch(`/api/nodes/${nodeId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setNodes((nds) => nds.filter((node) => node.id !== nodeId));
          setEdges((eds) =>
            eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
          );
          setIsEditorOpen(false);
          setSelectedNode(null);
        }
      } catch (error) {
        console.error('Error deleting node:', error);
      }
    },
    [setNodes, setEdges]
  );

  const handleNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      try {
        await fetch(`/api/nodes/${node.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            x: node.position.x,
            y: node.position.y,
          }),
        });
      } catch (error) {
        console.error('Error updating node position:', error);
      }
    },
    []
  );

  const handleRunLayout = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/layout`, {
        method: 'POST',
      });

      if (response.ok) {
        loadWorkspace();
      }
    } catch (error) {
      console.error('Error running layout:', error);
    }
  }, [workspaceId]);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Workspace
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <SearchBar workspaceId={workspaceId} onSearch={handleSearch} />
          <Toolbar
            onRunLayout={handleRunLayout}
            isAutoLinking={isAutoLinking}
            onToggleAutoLinking={() => setIsAutoLinking(!isAutoLinking)}
          />
        </div>
      </div>

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeDragStop={handleNodeDragStop}
          onInit={setReactFlowInstance}
          onPaneContextMenu={handleCreateNode}
          fitView
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {isEditorOpen && selectedNode && (
          <NodeEditor
            node={selectedNode}
            onClose={() => {
              setIsEditorOpen(false);
              setSelectedNode(null);
            }}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
          />
        )}
      </div>
    </div>
  );
}

