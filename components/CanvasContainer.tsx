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
    addEdge: addWorkspaceEdge,
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

  // Use ref to track current React Flow nodes for position preservation
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  // Keep refs in sync with current state
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Sync workspace nodes/edges to canvas state
  useEffect(() => {
    // Don't return early - allow empty arrays to clear the canvas
    console.log('[CanvasContainer] Syncing workspace nodes to canvas:', {
      workspaceNodesCount: workspaceNodes.length,
      workspaceEdgesCount: workspaceEdges.length,
      existingNodesCount: nodesRef.current.length,
      existingEdgesCount: edgesRef.current.length,
    });

    const reactFlowNodes: Node[] = workspaceNodes.map((node) => {
      const isChart = node.tags?.some(tag => ['bar-chart', 'line-chart', 'pie-chart', 'area-chart'].includes(tag));
      // Check if this node already exists in React Flow state (using ref to avoid dependency)
      const existingNode = nodesRef.current.find(n => n.id === node.id);
      
      // For new nodes or nodes being dragged, preserve React Flow position
      // Otherwise use stored position from database
      let position = { x: node.x || 0, y: node.y || 0 };
      if (existingNode?.position && existingNode.position.x !== undefined && existingNode.position.y !== undefined) {
        // Preserve position if node exists in React Flow (may be dragged)
        position = existingNode.position;
      }
      
      return {
        id: node.id,
        type: 'custom',
        position,
        data: {
          label: node.title || 'Untitled',
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
      firstNodePosition: reactFlowNodes[0]?.position,
    });

    // Update both canvas store and React Flow state
    // Note: We use direct assignment to avoid stale closure issues
    setCanvasNodes(reactFlowNodes);
    setCanvasEdges(reactFlowEdges);
    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [workspaceNodes, workspaceEdges, setCanvasNodes, setCanvasEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target || params.source === params.target) {
        return;
      }

      // Check if edge already exists
      const existingEdge = edges.find(
        (e) => e.source === params.source && e.target === params.target
      );
      if (existingEdge) {
        console.log('[CanvasContainer] Edge already exists, skipping');
        return;
      }

      // Optimistically add edge to UI
      const tempEdge: Edge = {
        id: `temp-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: 'custom',
        data: {},
      };
      const newEdges = addEdge(tempEdge, edges);
      setEdges(newEdges);
      setCanvasEdges(newEdges);

      // Save to API
      try {
        const response = await fetch('/api/edges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            source: params.source,
            target: params.target,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const savedEdge = data.edge;
          
          // Update edge with real ID from API
          const updatedEdges = newEdges.map((e) =>
            e.id === tempEdge.id
              ? {
                  ...e,
                  id: savedEdge.id,
                  data: { edge: savedEdge },
                }
              : e
          );
          
          setEdges(updatedEdges);
          setCanvasEdges(updatedEdges);
          
          // Add to workspace store
          addWorkspaceEdge({
            id: savedEdge.id,
            workspaceId: savedEdge.workspaceId || workspaceId,
            source: savedEdge.source,
            target: savedEdge.target,
            label: savedEdge.label || null,
            similarity: savedEdge.similarity || null,
            createdAt: savedEdge.createdAt,
          });
          
          // Trigger workspace refresh
          window.dispatchEvent(new CustomEvent('refreshWorkspace'));
        } else {
          // Remove failed edge
          const failedEdges = edges.filter((e) => e.id !== tempEdge.id);
          setEdges(failedEdges);
          setCanvasEdges(failedEdges);
          console.error('[CanvasContainer] Failed to create edge:', response.statusText);
        }
      } catch (error) {
        // Remove failed edge
        const failedEdges = edges.filter((e) => e.id !== tempEdge.id);
        setEdges(failedEdges);
        setCanvasEdges(failedEdges);
        console.error('[CanvasContainer] Error creating edge:', error);
      }
    },
    [edges, setEdges, setCanvasEdges, workspaceId, addWorkspaceEdge]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Track dragging state for drag-to-connect
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);

  // Handle node drag start
  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setDraggedNodeId(node.id);
      dragStartPosition.current = node.position;
    },
    []
  );

  // Handle node drag end - check if dropped on another node
  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      if (!draggedNodeId || !reactFlowInstance) {
        setDraggedNodeId(null);
        dragStartPosition.current = null;
        return;
      }

      // Get the dragged node's position in flow coordinates
      const draggedNodePosition = node.position;
      
      // Get node dimensions from the DOM element (works at any zoom level)
      const draggedNodeElement = document.querySelector(`[data-id="${node.id}"]`) as HTMLElement;
      let draggedNodeWidth = 100; // Default size for regular nodes
      let draggedNodeHeight = 100;
      
      if (draggedNodeElement) {
        const rect = draggedNodeElement.getBoundingClientRect();
        // Convert screen dimensions to flow dimensions using zoom level
        const viewport = reactFlowInstance.getViewport();
        draggedNodeWidth = rect.width / viewport.zoom;
        draggedNodeHeight = rect.height / viewport.zoom;
      }

      // Check if this node overlaps with any other node using distance-based detection
      // This works at any zoom level because we're using flow coordinates
      const overlappingNode = nodes.find((n) => {
        if (n.id === node.id) return false;
        
        const otherPosition = n.position;
        
        // Get other node's dimensions from DOM
        const otherNodeElement = document.querySelector(`[data-id="${n.id}"]`) as HTMLElement;
        let otherNodeWidth = 100;
        let otherNodeHeight = 100;
        
        if (otherNodeElement) {
          const rect = otherNodeElement.getBoundingClientRect();
          const viewport = reactFlowInstance.getViewport();
          otherNodeWidth = rect.width / viewport.zoom;
          otherNodeHeight = rect.height / viewport.zoom;
        }
        
        // Calculate centers
        const draggedCenterX = draggedNodePosition.x + draggedNodeWidth / 2;
        const draggedCenterY = draggedNodePosition.y + draggedNodeHeight / 2;
        const otherCenterX = otherPosition.x + otherNodeWidth / 2;
        const otherCenterY = otherPosition.y + otherNodeHeight / 2;
        
        // Calculate distance between centers
        const distanceX = Math.abs(draggedCenterX - otherCenterX);
        const distanceY = Math.abs(draggedCenterY - otherCenterY);
        
        // Check if nodes overlap (centers are within combined half-widths/heights)
        const maxDistanceX = (draggedNodeWidth + otherNodeWidth) / 2;
        const maxDistanceY = (draggedNodeHeight + otherNodeHeight) / 2;
        
        return distanceX < maxDistanceX && distanceY < maxDistanceY;
      });

      // If dropped on another node, create a connection
      if (overlappingNode) {
        const sourceId = draggedNodeId;
        const targetId = overlappingNode.id;

        // Check if edge already exists
        const existingEdge = edges.find(
          (e) => e.source === sourceId && e.target === targetId
        );

        if (!existingEdge && sourceId !== targetId) {
          // Create connection
          await onConnect({
            source: sourceId,
            target: targetId,
            sourceHandle: null,
            targetHandle: null,
          });
        }
      }

      // Reset drag state
      setDraggedNodeId(null);
      dragStartPosition.current = null;
    },
    [draggedNodeId, nodes, edges, onConnect, reactFlowInstance]
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
        // Get the wrapper bounds for proper coordinate conversion
        const wrapper = reactFlowInstance.getViewport();
        const flowPos = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        
        console.log('[CanvasContainer] Converted flow position:', flowPos, 'from screen:', { x: event.clientX, y: event.clientY });
        
        // Store flow position for CanvasPageClient to access when creating node
        // Store both screen and flow positions
        (window as any).lastFlowPosition = flowPos;
        (window as any).lastScreenPosition = {
          x: event.clientX,
          y: event.clientY,
        };
        
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
      // Store instance for Controls to use
      // Zoom out for global map view - show entire graph
      setTimeout(() => {
        instance.fitView({ 
          padding: 0.1, 
          duration: 500,
          minZoom: 0.1,
          maxZoom: 1,
        });
        // Update viewport after fitView
        const viewport = instance.getViewport();
        setViewport(viewport);
      }, 100);
    },
    [setViewport]
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

  // Listen for viewport changes from Controls (zoom in/out/fit view)
  // This ensures minimap updates when Controls buttons are clicked
  useEffect(() => {
    if (!reactFlowInstance) return;

    // Use a more frequent check to catch Controls button clicks
    // Controls buttons might not always trigger onMove immediately
    const interval = setInterval(() => {
      try {
        const currentViewport = reactFlowInstance.getViewport();
        const storedViewport = viewport;
        
        // Check if viewport has changed (with small threshold to avoid unnecessary updates)
        if (
          !storedViewport ||
          Math.abs(currentViewport.x - storedViewport.x) > 0.01 ||
          Math.abs(currentViewport.y - storedViewport.y) > 0.01 ||
          Math.abs(currentViewport.zoom - storedViewport.zoom) > 0.001
        ) {
          setViewport(currentViewport);
        }
      } catch (error) {
        // Ignore errors if instance is not ready
      }
    }, 50); // Check every 50ms for responsive updates

    return () => clearInterval(interval);
  }, [reactFlowInstance, viewport, setViewport]);

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
          onClick={(e) => {
            // Handle single click on canvas wrapper to show horizontal bar
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
              target.closest('[role="button"]') ||
              target.closest('.floating-horizontal-bar')
            ) {
              return;
            }
            
            // Process click on canvas background - show horizontal bar
            if (onCreateNode) {
              const screenPos = {
                x: e.clientX,
                y: e.clientY,
              };
              
              // Convert to flow position
              const flowPos = reactFlowInstance.screenToFlowPosition({
                x: e.clientX,
                y: e.clientY,
              });
              
              // Store flow position for node creation
              (window as any).lastFlowPosition = flowPos;
              
              // Dispatch event to show horizontal bar
              window.dispatchEvent(new CustomEvent('show-create-toolbar', { detail: screenPos }));
            }
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
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        onInit={onInit}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={true}
        panOnDrag={true} // Pan with left mouse button on empty space
        panOnScroll={true} // Also allow panning with scroll + modifier key
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
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
        
            {/* Minimap - premium styling with accurate positioning and real-time updates */}
            <MiniMap
              key={`minimap-${nodes.length}-${edges.length}-${Math.round((viewport?.zoom || 1) * 1000)}`}
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
              nodeStrokeColor="#fff"
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