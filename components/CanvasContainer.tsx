'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
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
import WorkspaceSwitcher from './WorkspaceSwitcher';
import 'reactflow/dist/style.css';
import { useCanvasStore } from '@/state/canvasStore';
import { useWorkspaceStore } from '@/state/workspaceStore';
import NodeComponent from './NodeComponent';
import EdgeComponent from './EdgeComponent';
import DrawingCanvas from './DrawingCanvas';
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
    viewport,
  } = useCanvasStore();

  const {
    nodes: workspaceNodes,
    edges: workspaceEdges,
    layout,
    addEdge: addWorkspaceEdge,
  } = useWorkspaceStore();

  // Initialize React Flow state with empty arrays - we'll sync from workspace store
  // Don't initialize from canvasNodes to avoid circular dependencies
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Sync canvas store from React Flow state changes (user interactions only)
  // This syncs the canvas store when React Flow state changes, but we prevent loops
  // by only syncing when nodes/edges actually change
  const lastSyncedCanvasNodesRef = useRef<string>('');
  const lastSyncedCanvasEdgesRef = useRef<string>('');
  const isSyncingFromWorkspaceRef = useRef(false); // Flag to prevent circular updates
  
  useEffect(() => {
    // Skip sync if we're currently syncing from workspace store to prevent loops
    if (isSyncingFromWorkspaceRef.current) {
      return;
    }
    
    const nodesHash = JSON.stringify(nodes.map(n => ({ id: n.id, position: n.position })));
    const edgesHash = JSON.stringify(edges.map(e => ({ id: e.id, source: e.source, target: e.target })));
    
    // Only update canvas store if React Flow nodes actually changed
    if (nodesHash !== lastSyncedCanvasNodesRef.current || edgesHash !== lastSyncedCanvasEdgesRef.current) {
      lastSyncedCanvasNodesRef.current = nodesHash;
      lastSyncedCanvasEdgesRef.current = edgesHash;
      // Batch updates to prevent multiple re-renders
      requestAnimationFrame(() => {
        setCanvasNodes(nodes);
        setCanvasEdges(edges);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]); // Removed setCanvasNodes and setCanvasEdges from dependencies - they're stable Zustand setters
  
  // Auto-organize state
  const [autoOrganize, setAutoOrganize] = useState(false);
  
  // Workspace switcher visibility state
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  
  
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
  
  // Track last synced workspace nodes/edges to prevent unnecessary updates
  const lastSyncedNodesRef = useRef<string>('');
  const lastSyncedEdgesRef = useRef<string>('');
  
  // Keep refs in sync with current state
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Sync workspace nodes/edges to canvas state
  useEffect(() => {
    // Create a stable hash of the workspace nodes/edges to detect actual changes
    // Include content in hash to detect textSettings and other content changes
    // Sort nodes/edges by ID for consistent hashing
    const sortedNodes = [...workspaceNodes].sort((a, b) => a.id.localeCompare(b.id));
    const sortedEdges = [...workspaceEdges].sort((a, b) => a.id.localeCompare(b.id));
    
    // Only hash properties that affect React Flow rendering
    // Exclude content from hash to prevent re-renders on content-only changes
    // Wrap in try-catch to handle cases where content might be extremely large
    let nodesHash: string;
    let edgesHash: string;
    
    try {
      nodesHash = JSON.stringify(sortedNodes.map(n => {
        try {
          // Safely extract content type without accessing large content objects
          let contentType: string | null = null;
          if (n.content && typeof n.content === 'object') {
            try {
              contentType = 'type' in n.content && typeof (n.content as any).type === 'string' 
                ? (n.content as any).type 
                : null;
            } catch {
              // If accessing type fails, just skip it
              contentType = null;
            }
          }
          
          return {
            id: n.id || '',
            x: n.x || 0,
            y: n.y || 0,
            title: n.title || '',
            width: n.width || undefined,
            height: n.height || undefined,
            tags: n.tags && Array.isArray(n.tags) ? [...n.tags].sort() : [],
            contentType,
          };
        } catch (error) {
          // If node processing fails, return minimal data
          console.warn('[CanvasContainer] Error processing node for hash:', n.id, error);
          return {
            id: n.id || '',
            x: n.x || 0,
            y: n.y || 0,
            title: '',
            tags: [],
            contentType: null,
          };
        }
      }));
    } catch (error) {
      console.error('[CanvasContainer] Error creating nodes hash:', error);
      // Fallback to simple hash based on IDs and positions only
      nodesHash = JSON.stringify(sortedNodes.map(n => ({ 
        id: n.id || '', 
        x: n.x || 0, 
        y: n.y || 0,
      })));
    }
    
    try {
      edgesHash = JSON.stringify(sortedEdges.map(e => ({ 
        id: e.id || '', 
        source: e.source || '', 
        target: e.target || '' 
      })));
    } catch (error) {
      console.error('[CanvasContainer] Error creating edges hash:', error);
      edgesHash = JSON.stringify(sortedEdges.map(e => ({ id: e.id || '' })));
    }
    
    // Only sync if nodes or edges actually changed (by value, not reference)
    if (nodesHash === lastSyncedNodesRef.current && edgesHash === lastSyncedEdgesRef.current) {
      return; // No actual changes, skip sync
    }
    
    // Update tracking refs
    lastSyncedNodesRef.current = nodesHash;
    lastSyncedEdgesRef.current = edgesHash;

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
      
      // Get zIndex from nodeMetadata
      const nodeMetadata = node.content && typeof node.content === 'object' && 'nodeMetadata' in node.content
        ? (node.content as any).nodeMetadata
        : {};
      const zIndex = nodeMetadata.zIndex || 0;

      return {
        id: node.id,
        type: 'custom',
        position,
        data: {
          label: node.title || 'Untitled',
          node,
        },
        // Use node dimensions from store if available, otherwise use defaults
        ...(node.width && { width: node.width }),
        ...(node.height && { height: node.height }),
        // Set default dimensions for chart nodes if not set
        ...(isChart && !node.width && !node.height && {
          width: 400,
          height: 300,
        }),
        // Apply zIndex for layering
        zIndex,
        // Sync selected state with canvas store
        selected: selectedNodeId === node.id,
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

    // Compare React Flow nodes by value to prevent unnecessary updates
    // Compare essential properties: id, position, label, selected state, zIndex, width, height
    // Exclude data.node.content from comparison to avoid re-renders on content changes that don't affect React Flow
    const currentNodesHash = JSON.stringify(nodes.map(n => ({ 
      id: n.id, 
      position: n.position, 
      label: n.data?.label,
      selected: n.selected,
      zIndex: n.zIndex,
      width: n.width,
      height: n.height,
    })));
    const newNodesHash = JSON.stringify(reactFlowNodes.map(n => ({ 
      id: n.id, 
      position: n.position, 
      label: n.data?.label,
      selected: n.selected,
      zIndex: n.zIndex,
      width: n.width,
      height: n.height,
    })));
    const currentEdgesHash = JSON.stringify(edges.map(e => ({ 
      id: e.id, 
      source: e.source, 
      target: e.target 
    })));
    const newEdgesHash = JSON.stringify(reactFlowEdges.map(e => ({ 
      id: e.id, 
      source: e.source, 
      target: e.target 
    })));
    
    // Only update React Flow state if nodes/edges actually changed
    // This prevents unnecessary setState calls that trigger infinite loops
    if (currentNodesHash !== newNodesHash || currentEdgesHash !== newEdgesHash) {
      // Removed verbose logging to prevent console spam
      
      // Set flag to prevent circular updates
      isSyncingFromWorkspaceRef.current = true;
      
      // Update React Flow state only if actually changed
      if (currentNodesHash !== newNodesHash) {
        setNodes(reactFlowNodes);
      }
      if (currentEdgesHash !== newEdgesHash) {
        setEdges(reactFlowEdges);
      }
      
      // Reset flag after React Flow state updates
      requestAnimationFrame(() => {
        isSyncingFromWorkspaceRef.current = false;
      });
      
      // Note: Don't update canvas store here - the effect that syncs canvas store 
      // from React Flow state will handle it automatically
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceNodes, workspaceEdges, selectedNodeId]); // Include selectedNodeId to update selection state

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
          const savedEdge = await response.json();
          
          // Validate that savedEdge has required properties
          if (!savedEdge || !savedEdge.id) {
            console.error('[CanvasContainer] Invalid edge response:', savedEdge);
            // Remove failed edge
            const failedEdges = edges.filter((e) => e.id !== tempEdge.id);
            setEdges(failedEdges);
            setCanvasEdges(failedEdges);
            return;
          }
          
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
          
          // DO NOT dispatch refreshWorkspace - it causes blocking data fetches
          // Edge creation is already reflected in local store
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

  // Listen for zIndex updates from layer controls
  useEffect(() => {
    const handleZIndexUpdate = (event: CustomEvent) => {
      const { nodeId, zIndex } = event.detail;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, zIndex }
            : node
        )
      );
    };

    window.addEventListener('update-node-zindex', handleZIndexUpdate as EventListener);
    return () => window.removeEventListener('update-node-zindex', handleZIndexUpdate as EventListener);
  }, [setNodes]);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // MIRO-LIKE: Always select node on single click
      // This ensures node selection works immediately
      // Inline editing will handle text input separately
      selectNode(node.id);
      
      // Scroll to node in sidebar and highlight it
      // Dispatch event to scroll sidebar to this node
      window.dispatchEvent(new CustomEvent('scrollToNode', { detail: { nodeId: node.id } }));
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
        if (!n || n.id === node.id) return false;
        
        const otherPosition = n.position;
        if (!otherPosition) return false;
        
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

      // Persist node position to database
      try {
        const positionX = node.position?.x !== undefined ? Math.round(node.position.x * 100) / 100 : 0;
        const positionY = node.position?.y !== undefined ? Math.round(node.position.y * 100) / 100 : 0;
        
        // Validate position values
        if (isNaN(positionX) || isNaN(positionY) || !isFinite(positionX) || !isFinite(positionY)) {
          console.warn('[CanvasContainer] Invalid position values, skipping update:', { x: positionX, y: positionY });
          return;
        }

        const response = await fetch('/api/nodes/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: node.id,
            x: positionX,
            y: positionY,
          }),
        });

        if (response.ok) {
          // Update workspace store with new position
          const { updateNode } = useWorkspaceStore.getState();
          updateNode(node.id, {
            x: positionX,
            y: positionY,
          });
        } else {
          const errorText = await response.text().catch(() => response.statusText);
          console.error('[CanvasContainer] Failed to update node position:', response.status, errorText);
        }
      } catch (error) {
        console.error('[CanvasContainer] Error updating node position:', error);
      }

      // Reset drag state
      setDraggedNodeId(null);
      dragStartPosition.current = null;
    },
    [draggedNodeId, nodes, edges, onConnect, reactFlowInstance, workspaceNodes]
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
        
        console.log('[CanvasContainer] Double-click detected at screen position:', {
          x: event.clientX,
          y: event.clientY,
        });
        
        // Note: Node creation is now handled by VerticalToolbar
        // Double-click can be used for other purposes in the future
        
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
        const currentZoom = viewport?.zoom || 1;
        reactFlowInstance.setCenter(node.position.x, node.position.y, { 
          zoom: Math.min(currentZoom, 1.5), // Don't force zoom, use current or max 1.5x
          duration: 300 
        });
        // Update viewport after navigation
        setTimeout(() => {
          if (reactFlowInstance) {
            const newViewport = reactFlowInstance.getViewport();
            // Validate viewport before setting
            if (
              typeof newViewport.x === 'number' && !isNaN(newViewport.x) &&
              typeof newViewport.y === 'number' && !isNaN(newViewport.y) &&
              typeof newViewport.zoom === 'number' && !isNaN(newViewport.zoom)
            ) {
              setViewport(newViewport);
            }
          }
        }, 350);
      }
    };

    window.addEventListener('scrollToNode', handleScrollToNode as EventListener);
    return () => window.removeEventListener('scrollToNode', handleScrollToNode as EventListener);
  }, [nodes, reactFlowInstance]);

  // Zoom to selected node - only when explicitly selecting, not on every change
  const lastSelectedNodeId = useRef<string | null>(null);
  
  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== lastSelectedNodeId.current && nodes.length > 0) {
      const selectedNode = nodes.find((n) => n.id === selectedNodeId);
      if (selectedNode && selectedNode.position && reactFlowInstance) {
        lastSelectedNodeId.current = selectedNodeId;
        // Zoom to node using React Flow instance
        setTimeout(() => {
          if (reactFlowInstance) {
            reactFlowInstance.fitView({
              nodes: [{ id: selectedNodeId }],
              padding: 0.3,
              duration: 400,
              maxZoom: 1.5, // Don't zoom in too much
            });
          }
        }, 150);
      }
    } else if (!selectedNodeId) {
      lastSelectedNodeId.current = null;
    }
  }, [selectedNodeId, nodes, reactFlowInstance]);

  // Listen for zoom-to-node events from search
  useEffect(() => {
    const handleZoomToNode = (event: CustomEvent) => {
      const { nodeId } = event.detail;
      if (nodeId && nodes.length > 0 && reactFlowInstance) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node && node.position) {
          selectNode(nodeId);
          setTimeout(() => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({
                nodes: [{ id: nodeId }],
                padding: 0.3,
                duration: 400,
                maxZoom: 1.5, // Don't zoom in too much
              });
            }
          }, 150);
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

  const hasFittedView = useRef(false);
  
  const onInit = useCallback(
    (instance: ReactFlowInstance) => {
      // Only fit view once on initial load when there are nodes
      // Don't force zoom if user has already interacted with canvas
      if (!hasFittedView.current && workspaceNodes.length > 0) {
        hasFittedView.current = true;
        setTimeout(() => {
          if (instance) {
            instance.fitView({ 
              padding: 0.1, 
              duration: 400,
              maxZoom: 1, // Don't zoom in too much initially
            });
            // Update viewport after fitView
            setTimeout(() => {
              if (instance) {
                const currentViewport = instance.getViewport();
                // Validate viewport before setting
                if (
                  typeof currentViewport.x === 'number' && !isNaN(currentViewport.x) &&
                  typeof currentViewport.y === 'number' && !isNaN(currentViewport.y) &&
                  typeof currentViewport.zoom === 'number' && !isNaN(currentViewport.zoom)
                ) {
                  setViewport(currentViewport);
                }
              }
            }, 450);
          }
        }, 200);
      } else if (
        viewport && 
        hasFittedView.current &&
        typeof viewport.x === 'number' && !isNaN(viewport.x) &&
        typeof viewport.y === 'number' && !isNaN(viewport.y) &&
        typeof viewport.zoom === 'number' && !isNaN(viewport.zoom)
      ) {
        // Restore previous viewport if available (on workspace switch)
        instance.setViewport(viewport, { duration: 0 });
      }
    },
    [setViewport, workspaceNodes.length, viewport]
  );
  
  // Reset fit view flag when workspace changes
  useEffect(() => {
    hasFittedView.current = false;
  }, [workspaceId]);

  // Handle Control + Mouse Wheel for zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Check if Control key is pressed
      if (!e.ctrlKey && !e.metaKey) return;
      
      // Only handle if we're over the canvas area
      const target = e.target as HTMLElement;
      const reactFlowPane = target.closest('.react-flow__pane');
      if (!reactFlowPane) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const currentViewport = reactFlowInstance.getViewport();
      const zoomFactor = 0.1; // Zoom step size
      const newZoom = e.deltaY > 0 
        ? Math.max(0.1, currentViewport.zoom - zoomFactor) // Zoom out
        : Math.min(2, currentViewport.zoom + zoomFactor);  // Zoom in
      
      // Update zoom while maintaining current pan position
      reactFlowInstance.setViewport(
        {
          x: currentViewport.x,
          y: currentViewport.y,
          zoom: newZoom,
        },
        { duration: 0 }
      );
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [reactFlowInstance]);

  // Throttle viewport updates during movement to prevent excessive re-renders
  const viewportUpdateTimer = useRef<NodeJS.Timeout | null>(null);
  const lastViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  
  const onMove = useCallback(
    (_event: any, newViewport: { x: number; y: number; zoom: number }) => {
      // Validate viewport values before using them
      if (
        typeof newViewport.x !== 'number' || isNaN(newViewport.x) ||
        typeof newViewport.y !== 'number' || isNaN(newViewport.y) ||
        typeof newViewport.zoom !== 'number' || isNaN(newViewport.zoom)
      ) {
        return;
      }
      
      // Show workspace switcher when zoomed out beyond threshold (pinch-to-zoom out)
      // Threshold: zoom < 0.3 indicates user has zoomed out significantly
      if (newViewport.zoom < 0.3 && !showWorkspaceSwitcher) {
        setShowWorkspaceSwitcher(true);
      } else if (newViewport.zoom >= 0.3 && showWorkspaceSwitcher) {
        setShowWorkspaceSwitcher(false);
      }
      
      // Skip if viewport hasn't changed significantly
      if (lastViewportRef.current) {
        const dx = Math.abs(newViewport.x - lastViewportRef.current.x);
        const dy = Math.abs(newViewport.y - lastViewportRef.current.y);
        const dz = Math.abs(newViewport.zoom - lastViewportRef.current.zoom);
        
        // Only update if moved more than threshold
        if (dx < 1 && dy < 1 && dz < 0.01) {
          return;
        }
      }
      
      lastViewportRef.current = newViewport;
      
      // Throttle updates to prevent excessive re-renders during pan/zoom
      if (viewportUpdateTimer.current) {
        clearTimeout(viewportUpdateTimer.current);
      }
      
      viewportUpdateTimer.current = setTimeout(() => {
        setViewport(newViewport);
      }, 50); // Update every 50ms max during move for smooth minimap sync
    },
    [setViewport, showWorkspaceSwitcher, setShowWorkspaceSwitcher]
  );

  const onMoveEnd = useCallback(
    (_event: any, newViewport: { x: number; y: number; zoom: number }) => {
      // Validate viewport values before using them
      if (
        typeof newViewport.x !== 'number' || isNaN(newViewport.x) ||
        typeof newViewport.y !== 'number' || isNaN(newViewport.y) ||
        typeof newViewport.zoom !== 'number' || isNaN(newViewport.zoom)
      ) {
        return;
      }
      
      // Clear any pending throttled update
      if (viewportUpdateTimer.current) {
        clearTimeout(viewportUpdateTimer.current);
        viewportUpdateTimer.current = null;
      }
      // Immediately update on move end for accurate final position
      lastViewportRef.current = newViewport;
      setViewport(newViewport);
    },
    [setViewport]
  );
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (viewportUpdateTimer.current) {
        clearTimeout(viewportUpdateTimer.current);
      }
    };
  }, []);

  // Viewport sync is handled efficiently by onMove and onMoveEnd callbacks
  // No need for polling interval which can cause performance issues and zoom conflicts

  // Note: Removed sync from React Flow nodes back to canvas store
  // This was causing a circular update loop. The sync effect above (line 118) 
  // handles syncing from workspaceStore to React Flow, which is the correct direction.

  // Expose trigger function to parent or make it available globally
  useEffect(() => {
    // Store trigger function for external access if needed
    (window as any).triggerAutoOrganize = triggerAutoOrganize;
  }, [triggerAutoOrganize]);


      return (
        <div 
          className="relative w-full h-full min-h-0 bg-white dark:bg-gray-900 overflow-hidden"
          onClick={(e) => {
            // Handle single click on canvas wrapper
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
            
            // Process click on canvas background - store position for node creation
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
        fitView={false}
        attributionPosition="bottom-left"
        className="bg-white dark:bg-gray-900"
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={
          viewport && 
          typeof viewport.x === 'number' && !isNaN(viewport.x) &&
          typeof viewport.y === 'number' && !isNaN(viewport.y) &&
          typeof viewport.zoom === 'number' && !isNaN(viewport.zoom)
            ? viewport
            : undefined
        }
        proOptions={{ hideAttribution: true }}
      >
            {/* Infinite canvas - premium subtle grid */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              style={{ 
                backgroundColor: 'transparent',
              }}
              className="[&_svg]:opacity-30 dark:[&_svg]:opacity-10"
            />
        
            {/* Controls - premium rounded with shadow */}
            <Controls
              className="[&_button]:bg-white/95 dark:[&_button]:bg-gray-800/95 [&_button]:border-gray-200 dark:[&_button]:border-gray-700 [&_button]:text-black dark:[&_button]:text-white [&_button:hover]:bg-gray-50 dark:[&_button:hover]:bg-gray-700 [&_button:hover]:border-gray-300 dark:[&_button:hover]:border-gray-600 [&_button:hover]:text-black dark:[&_button:hover]:text-white [&_button]:rounded-lg [&_button]:shadow-sm [&_button]:backdrop-blur-sm"
              showZoom={true}
              showFitView={true}
              showInteractive={false}
              style={{
                opacity: 0.95,
              }}
            />
            
            {/* Drawing Canvas - Overlay for brush tool */}
            <DrawingCanvas workspaceId={workspaceId} />
          </ReactFlow>

          {/* Auto-organize button - minimalistic, top-right, very subtle */}
          {nodes.length > 0 && (
            <button
              onClick={triggerAutoOrganize}
              disabled={isAnimating}
              className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-white/90 backdrop-blur-md text-xs text-black rounded-lg border border-gray-300 shadow-sm hover:bg-gray-100 hover:border-gray-400 hover:text-black transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                fontSize: '11px',
                letterSpacing: '0.5px',
              }}
            >
              {isAnimating ? 'Organizing...' : 'Auto-Organize'}
            </button>
          )}
          
          {/* Workspace Switcher - appears when zoomed out (pinch-to-zoom) */}
          <WorkspaceSwitcher
            isVisible={showWorkspaceSwitcher}
            currentWorkspaceId={workspaceId}
            onClose={() => {
              setShowWorkspaceSwitcher(false);
              // Zoom back in slightly when closing switcher
              if (reactFlowInstance) {
                reactFlowInstance.zoomTo(0.5, { duration: 300 });
              }
            }}
          />
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