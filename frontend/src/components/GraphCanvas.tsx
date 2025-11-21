import { useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useMeshStore } from '../store/useMeshStore';
import { useGraphLayout } from '../hooks/useGraphLayout';
import { useNodeFiltering } from '../hooks/useNodeFiltering';

const GraphCanvas = () => {
  const fgRef = useRef<any>();
  const {
    nodes,
    edges,
    selectedNodeId,
    layoutMode,
    searchQuery,
    explodedNodeId,
    setSelectedNode,
    setExplodedNode,
    setViewCenter,
    setZoom,
  } = useMeshStore();

  const filteredNodes = useNodeFiltering();
  const { applyLayout } = useGraphLayout();

  // Apply layout when mode changes
  useEffect(() => {
    if (filteredNodes.length > 0) {
      applyLayout(filteredNodes, edges, layoutMode);
    }
  }, [layoutMode, filteredNodes.length, edges.length]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  const handleNodeDoubleClick = useCallback((node: any) => {
    if (explodedNodeId === node.id) {
      setExplodedNode(null);
    } else {
      setExplodedNode(node.id);
    }
  }, [explodedNodeId, setExplodedNode]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleNodeDrag = useCallback((node: any) => {
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  const handleNodeDragEnd = useCallback((node: any) => {
    node.fx = node.x;
    node.fy = node.y;
  }, []);

  // Color nodes based on selection and importance
  const getNodeColor = useCallback((node: any) => {
    if (node.id === selectedNodeId) return '#0ea5e9';
    if (node.id === explodedNodeId) return '#8b5cf6';
    if (searchQuery && (node.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        node.content?.toLowerCase().includes(searchQuery.toLowerCase()))) {
      return '#f59e0b';
    }
    return node.color || '#6366f1';
  }, [selectedNodeId, explodedNodeId, searchQuery]);

  // Size nodes based on importance
  const getNodeSize = useCallback((node: any) => {
    const baseSize = 8;
    const importance = node.importance || 0.5;
    return baseSize + importance * 12;
  }, []);

  return (
    <div className="w-full h-full bg-gray-50">
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes: filteredNodes, links: edges }}
        nodeLabel={(node: any) => `${node.title || 'Untitled'}\n${node.content?.substring(0, 100) || ''}`}
        nodeColor={getNodeColor}
        nodeVal={getNodeSize}
        linkColor={() => 'rgba(99, 102, 241, 0.3)'}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onBackgroundClick={handleBackgroundClick}
        onNodeDrag={handleNodeDrag}
        onNodeDragEnd={handleNodeDragEnd}
        cooldownTicks={100}
        onEngineStop={() => {
          if (fgRef.current) {
            fgRef.current.zoomToFit(400, 20);
          }
        }}
        nodeCanvasObjectMode={() => 'after'}
        nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
          const label = node.title || 'Untitled';
          const fontSize = 12;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#374151';
          ctx.fillText(label, node.x, node.y + (node.size || 10) + 15);
        }}
      />
    </div>
  );
};

export default GraphCanvas;

