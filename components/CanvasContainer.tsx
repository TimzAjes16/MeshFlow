'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  EdgeTypes,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  ReactFlowProvider,
  ReactFlowInstance,
  BackgroundVariant,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import NodeComponent from './NodeComponent';
import EdgeComponent from './EdgeComponent';
import { useAutoOrganize } from '@/lib/useAutoOrganize';
import { getNodeColor } from '@/lib/nodeColors';

const nodeTypes: NodeTypes = {
  custom: NodeComponent,
};

const edgeTypes: EdgeTypes = {
  custom: EdgeComponent,
};

interface CanvasContainerProps {
  workspaceId: string;
  onCreateNode?: (position: { x: number; y: number }) => void;
}

function CanvasInner({ workspaceId, onCreateNode }: CanvasContainerProps) {
  const reactFlowInstance = useReactFlow();
  const { 
    nodes: canvasNodes, 
    edges: canvasEdges,
    setNodes: setCanvasNodes,
    setEdges: setCanvasEdges,
    selectedNodeId,
    selectNode,
    setViewport,
  } = useCanvasStore();

  const {
    nodes: workspaceNodes,
    edges: workspaceEdges,
    layout,
  } = useWorkspaceStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(canvasNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(canvasEdges);
  
  // Auto-organize state
  const [autoOrganize, setAutoOrganize] = useState(false);

  // Handle position updates from auto-organize animation
  const handlePositionUpdate = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, position }
            : node
        )
      );
    },
    [setNodes]
  );

  // Use auto-organize hook
  const { isAnimating } = useAutoOrganize({
    nodes,
    edges,
    enabled: autoOrganize,
    onPositionUpdate: handlePositionUpdate,
    width: 2000,
    height: 2000,
    duration: 2000,
  });

  // Track if we've done initial organization for current workspace
  const [hasOrganized, setHasOrganized] = useState(false);

  // Reset organization state when workspace nodes change (new workspace loaded)
  useEffect(() => {
    if (workspaceNodes.length > 0) {
      setHasOrganized(false);
    }
  }, [workspaceId, workspaceNodes.length]);

  // Auto-organize when nodes are first loaded
  useEffect(() => {
    // Only auto-organize once when nodes are first loaded
    if (nodes.length > 0 && edges.length >= 0 && !hasOrganized && !autoOrganize && !isAnimating) {
      // Small delay to allow initial render
      const timer = setTimeout(() => {
        setAutoOrganize(true);
        setHasOrganized(true);
        // Auto-disable after animation completes
        setTimeout(() => setAutoOrganize(false), 2500);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, edges.length, hasOrganized, autoOrganize, isAnimating, workspaceId]);

  // Manual trigger for auto-organize (can be called from a button)
  const triggerAutoOrganize = useCallback(() => {
    setAutoOrganize(true);
    setTimeout(() => setAutoOrganize(false), 2500);
  }, []);

  // Sync workspace nodes/edges to canvas state
  useEffect(() => {
    if (workspaceNodes.length === 0) return;

    const reactFlowNodes: Node[] = workspaceNodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        label: node.title,
        node,
      },
    }));

    const reactFlowEdges: Edge[] = workspaceEdges.map((edge) => {
      const sourceNode = workspaceNodes.find(n => n.id === edge.source);
      const targetNode = workspaceNodes.find(n => n.id === edge.target);
      const sourceColor = sourceNode ? getNodeColor(sourceNode) : null;
      const targetColor = targetNode ? getNodeColor(targetNode) : null;
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'custom',
        label: edge.label,
        data: { 
          edge,
          sourceColor,
          targetColor,
        },
      };
    });

    setCanvasNodes(reactFlowNodes);
    setCanvasEdges(reactFlowEdges);
    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [workspaceNodes, workspaceEdges, setCanvasNodes, setCanvasEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      setCanvasEdges(newEdges);
    },
    [edges, setEdges, setCanvasEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle double-click to create node
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!onCreateNode) return;
      
      const reactFlowBounds = reactFlowInstance.getViewport();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      onCreateNode(position);
    },
    [onCreateNode, reactFlowInstance]
  );

  // Zoom to selected node
  useEffect(() => {
    if (selectedNodeId && nodes.length > 0) {
      const selectedNode = nodes.find((n) => n.id === selectedNodeId);
      if (selectedNode && selectedNode.position) {
        // Zoom to node using React Flow instance
        setTimeout(() => {
          reactFlowInstance.fitView({
            nodes: [{ id: selectedNodeId }],
            padding: 0.2,
            duration: 500,
          });
        }, 100);
      }
    }
  }, [selectedNodeId, nodes, reactFlowInstance]);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const onInit = useCallback(
    (instance: ReactFlowInstance) => {
      // Zoom out for global map view - show entire graph
      setTimeout(() => {
        instance.fitView({ 
          padding: 0.1, 
          duration: 500,
          minZoom: 0.1,
          maxZoom: 1,
        });
      }, 100);
    },
    []
  );

  const onMoveEnd = useCallback(
    (_event: any, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Sync local state to canvas store when nodes/edges change
  useEffect(() => {
    setCanvasNodes(nodes);
  }, [nodes, setCanvasNodes]);

  useEffect(() => {
    setCanvasEdges(edges);
  }, [edges, setCanvasEdges]);

  // Expose trigger function to parent or make it available globally
  useEffect(() => {
    // Store trigger function for external access if needed
    (window as any).triggerAutoOrganize = triggerAutoOrganize;
  }, [triggerAutoOrganize]);

  return (
    <div className="relative w-full h-full">
      {/* Auto-organize button - minimalistic, top-right, very subtle */}
      <button
        onClick={triggerAutoOrganize}
        disabled={isAnimating}
        className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-black/40 backdrop-blur-md text-xs text-slate-400 rounded border border-slate-700/50 hover:bg-black/60 hover:border-slate-600/50 hover:text-slate-300 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          fontSize: '11px',
          letterSpacing: '0.5px',
        }}
      >
        {isAnimating ? 'Organizing...' : 'Auto-Organize'}
      </button>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onPaneDoubleClick={onPaneDoubleClick}
        onInit={onInit}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-left"
        className="bg-[#0a0a0a]"
        minZoom={0.05}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.25 }}
        proOptions={{ hideAttribution: true }}
      >
        {/* Infinite dark canvas - minimalistic dots for global view */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={50}
          size={0.8}
          color="rgba(250, 204, 21, 0.08)"
          style={{ opacity: 0.5 }}
        />
        
        {/* Custom dark controls - minimalistic */}
        <Controls
          className="[&_button]:bg-black/40 [&_button]:border-slate-700/50 [&_button]:text-slate-400 [&_button:hover]:bg-black/60 [&_button:hover]:border-slate-600/50 [&_button:hover]:text-slate-300"
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          style={{
            opacity: 0.8,
          }}
        />
        
        {/* Dark minimap - minimalistic, smaller */}
        <MiniMap
          nodeColor="rgba(148, 163, 184, 0.4)"
          maskColor="rgba(0, 0, 0, 0.5)"
          className="bg-black/30 backdrop-blur-sm rounded border border-slate-700/30"
          style={{
            width: '120px',
            height: '120px',
            opacity: 0.6,
          }}
          pannable={true}
          zoomable={true}
        />
      </ReactFlow>
    </div>
  );
}

export default function CanvasContainer({ workspaceId, onCreateNode }: CanvasContainerProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner workspaceId={workspaceId} onCreateNode={onCreateNode} />
    </ReactFlowProvider>
  );
}