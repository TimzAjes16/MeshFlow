'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
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
import EmptyState from './EmptyState';

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
    viewport,
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
  
  // Empty state - track if user has manually dismissed it
  const [hasDismissedEmptyState, setHasDismissedEmptyState] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(nodes.length === 0 && !hasDismissedEmptyState);
  
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

  // Reset organization state and empty state dismissal when workspace nodes change (new workspace loaded)
  useEffect(() => {
    if (workspaceNodes.length > 0) {
      setHasOrganized(false);
    }
    // Reset empty state dismissal when switching workspaces
    setHasDismissedEmptyState(false);
  }, [workspaceId, workspaceNodes.length]);

  // Disable auto-organize by default - only run when explicitly triggered
  // Removed automatic auto-organize on load to prevent continuous spinning

  // Manual trigger for auto-organize (can be called from a button)
  const triggerAutoOrganize = useCallback(() => {
    setAutoOrganize(true);
    setTimeout(() => setAutoOrganize(false), 2500);
  }, []);

  // Sync workspace nodes/edges to canvas state
  useEffect(() => {
    // Don't return early - allow empty arrays to clear the canvas
    console.log('[CanvasContainer] Syncing workspace nodes to canvas:', {
      workspaceNodesCount: workspaceNodes.length,
      workspaceEdgesCount: workspaceEdges.length,
      existingNodesCount: nodes.length,
      existingEdgesCount: edges.length,
    });

    const reactFlowNodes: Node[] = workspaceNodes.map((node) => {
      const isChart = node.tags?.some(tag => ['bar-chart', 'line-chart', 'pie-chart', 'area-chart'].includes(tag));
      // Check if this node already exists in React Flow state
      const existingNode = nodes.find(n => n.id === node.id);
      
      return {
        id: node.id,
        type: 'custom',
        // Preserve existing position if node is being dragged, otherwise use stored position
        position: existingNode?.position?.x !== undefined && existingNode?.position?.y !== undefined
          ? existingNode.position
          : { x: node.x, y: node.y },
        data: {
          label: node.title,
          node,
        },
        // Set dimensions for chart nodes
        ...(isChart && {
          width: 400,
          height: 300,
        }),
      };
    });

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

    console.log('[CanvasContainer] Setting React Flow nodes:', {
      nodeCount: reactFlowNodes.length,
      edgeCount: reactFlowEdges.length,
      firstNodeId: reactFlowNodes[0]?.id,
    });

    // Update both canvas store and React Flow state
    setCanvasNodes(reactFlowNodes);
    setCanvasEdges(reactFlowEdges);
    // Update both canvas store and React Flow state
    // Note: We use direct assignment, not functional update, to avoid stale closure issues
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
  const handlePaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      console.log('[CanvasContainer] handlePaneDoubleClick called');
      if (!onCreateNode) {
        console.error('[CanvasContainer] onCreateNode callback is not provided');
        return;
      }
      
      // Convert screen coordinates to flow position for node creation
      try {
        const flowPos = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        
        console.log('[CanvasContainer] Converted flow position:', flowPos);
        
        // Store flow position for CanvasPageClient to access when creating node
        (window as any).lastFlowPosition = flowPos;
        
        // Use screen coordinates for toolbar placement (relative to viewport)
        const screenPos = {
          x: event.clientX,
          y: event.clientY,
        };
        
        console.log('[CanvasContainer] Calling onCreateNode with screen position:', screenPos);
        
        // Show toolbar to select node type
        onCreateNode(screenPos);
        
        // Trigger empty state dismissal if it's showing
        const dismissEvent = new CustomEvent('dismiss-empty-state');
        window.dispatchEvent(dismissEvent);
      } catch (error) {
        console.error('[CanvasContainer] Error in handlePaneDoubleClick:', error);
      }
    },
    [onCreateNode, reactFlowInstance]
  );

  // Handle scroll to node event (from NodesListView)
  useEffect(() => {
    const handleScrollToNode = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      if (!nodeId || !reactFlowInstance) return;
      
      const node = nodes.find((n) => n.id === nodeId);
      if (node && node.position) {
        reactFlowInstance.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 400 });
      }
    };

    window.addEventListener('scrollToNode', handleScrollToNode as EventListener);
    return () => window.removeEventListener('scrollToNode', handleScrollToNode as EventListener);
  }, [nodes, reactFlowInstance]);

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

  // Listen for zoom-to-node events from search
  useEffect(() => {
    const handleZoomToNode = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      if (nodeId && nodes.length > 0) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) {
          selectNode(nodeId);
          setTimeout(() => {
            reactFlowInstance.fitView({
              nodes: [{ id: nodeId }],
              padding: 0.2,
              duration: 500,
            });
          }, 100);
        }
      }
    };

    const handleLayoutChange = (event: CustomEvent) => {
      const { layout: newLayout } = event.detail;
      // Trigger auto-organize when layout changes
      if (newLayout) {
        triggerAutoOrganize();
      }
    };

    window.addEventListener('zoom-to-node', handleZoomToNode as EventListener);
    window.addEventListener('layout-change', handleLayoutChange as EventListener);
    
    return () => {
      window.removeEventListener('zoom-to-node', handleZoomToNode as EventListener);
      window.removeEventListener('layout-change', handleLayoutChange as EventListener);
    };
  }, [nodes, reactFlowInstance, selectNode, triggerAutoOrganize]);

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

  const onMove = useCallback(
    (_event: any, viewport: { x: number; y: number; zoom: number }) => {
      // Update viewport state in real-time for minimap sync
      setViewport(viewport);
    },
    [setViewport]
  );

  const onMoveEnd = useCallback(
    (_event: any, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Note: Removed sync from React Flow nodes back to canvas store
  // This was causing a circular update loop. The sync effect above (line 118) 
  // handles syncing from workspaceStore to React Flow, which is the correct direction.

  // Expose trigger function to parent or make it available globally
  useEffect(() => {
    // Store trigger function for external access if needed
    (window as any).triggerAutoOrganize = triggerAutoOrganize;
  }, [triggerAutoOrganize]);

  // Dismiss empty state when nodes are added
  useEffect(() => {
    const handleDismiss = () => {
      setShowEmptyState(false);
      setHasDismissedEmptyState(true);
    };
    
    window.addEventListener('dismiss-empty-state', handleDismiss);
    
    // Hide empty state when nodes are added
    if (nodes.length > 0 && showEmptyState) {
      setShowEmptyState(false);
    }
    
    // Show empty state when all nodes are removed (only if not manually dismissed)
    if (nodes.length === 0 && !showEmptyState && !hasDismissedEmptyState) {
      setShowEmptyState(true);
    }
    
    return () => {
      window.removeEventListener('dismiss-empty-state', handleDismiss);
    };
  }, [nodes.length, showEmptyState, hasDismissedEmptyState]);

      return (
        <div 
          className="relative w-full h-full min-h-0 bg-white overflow-hidden"
          onDoubleClick={(e) => {
            // Handle double-click on canvas wrapper
            // Only process if clicking on the canvas background, not on React Flow UI elements
            const target = e.target as HTMLElement;
            
            // Ignore if clicking on React Flow UI elements (nodes, edges, controls, etc.)
            if (
              target.closest('.react-flow__node') || 
              target.closest('.react-flow__edge') ||
              target.closest('.react-flow__controls') ||
              target.closest('.react-flow__minimap') ||
              target.closest('.react-flow__attribution') ||
              target.closest('.react-flow__handle') ||
              target.closest('button') ||
              target.closest('[role="button"]')
            ) {
              return;
            }
            
            // Process double-click on canvas background
            e.preventDefault();
            e.stopPropagation();
            
            console.log('[CanvasContainer] Double-click detected on canvas background');
            handlePaneDoubleClick(e);
          }}
        >
          {/* Canvas - always visible and rendered, empty state is just an overlay */}
          <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={onInit}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        fitView
        attributionPosition="bottom-left"
        className="bg-white"
        minZoom={0.05}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.25 }}
        proOptions={{ hideAttribution: true }}
      >
            {/* Infinite canvas - premium subtle grid */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={40}
              size={0.6}
              color="rgba(156, 163, 175, 0.15)"
              style={{ opacity: 0.4 }}
            />
        
            {/* Controls - premium rounded with shadow */}
            <Controls
              className="[&_button]:bg-white/95 [&_button]:border-gray-200 [&_button]:text-gray-700 [&_button:hover]:bg-gray-50 [&_button:hover]:border-gray-300 [&_button:hover]:text-gray-900 [&_button]:rounded-lg [&_button]:shadow-sm [&_button]:backdrop-blur-sm"
              showZoom={true}
              showFitView={true}
              showInteractive={false}
              style={{
                opacity: 0.95,
              }}
            />
        
            {/* Minimap - premium styling with accurate positioning */}
            <MiniMap
              key={`minimap-${Math.round((viewport?.zoom || 1) * 100)}-${Math.round((viewport?.x || 0) / 100)}-${Math.round((viewport?.y || 0) / 100)}`}
              nodeColor={(node) => {
                const nodeData = node.data as any;
                if (nodeData?.node) {
                  const color = getNodeColor(nodeData.node);
                  return color.primary;
                }
                return 'rgba(59, 130, 246, 0.5)';
              }}
              nodeStrokeWidth={2}
              nodeBorderRadius={10}
              maskColor="rgba(0, 0, 0, 0.1)"
              maskStrokeColor="rgba(0, 0, 0, 0.2)"
              maskStrokeWidth={1}
              className="bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg"
              style={{
                width: '140px',
                height: '140px',
                opacity: 0.9,
              }}
              pannable={true}
              zoomable={true}
              ariaLabel="Minimap"
              position="bottom-right"
              offsetScale={5}
            />
          </ReactFlow>

          {/* Empty State Overlay - shows on top when no nodes (first time only) */}
          {!hasDismissedEmptyState && showEmptyState && nodes.length === 0 && (
            <div 
              className="absolute inset-0" 
              style={{ zIndex: 100, pointerEvents: 'auto' }}
              onClick={(e) => {
                // Allow clicking backdrop to dismiss
                if (e.target === e.currentTarget) {
                  console.log('Empty state backdrop clicked - dismissing');
                  setShowEmptyState(false);
                  setHasDismissedEmptyState(true);
                }
              }}
            >
              <EmptyState 
                visible={true}
                onDismiss={() => {
                  console.log('Empty state onDismiss called - canvas should now be interactive');
                  setShowEmptyState(false);
                  setHasDismissedEmptyState(true);
                }} 
              />
            </div>
          )}

          {/* Minimal inline hint removed - no longer showing hint on empty canvas */}

          {/* Auto-organize button - minimalistic, top-right, very subtle */}
          {nodes.length > 0 && (
            <button
              onClick={triggerAutoOrganize}
              disabled={isAnimating}
              className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-white/90 backdrop-blur-md text-xs text-gray-700 rounded-lg border border-gray-300 shadow-sm hover:bg-gray-100 hover:border-gray-400 hover:text-gray-900 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                fontSize: '11px',
                letterSpacing: '0.5px',
              }}
            >
              {isAnimating ? 'Organizing...' : 'Auto-Organize'}
            </button>
          )}
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