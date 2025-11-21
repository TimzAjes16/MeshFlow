import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3-force';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

interface LayoutNode extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
}

interface UseAutoOrganizeOptions {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  enabled: boolean;
  onPositionUpdate: (nodeId: string, position: { x: number; y: number }) => void;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Hook for smooth auto-organizing animation using force-directed layout
 */
export function useAutoOrganize({
  nodes,
  edges,
  enabled,
  onPositionUpdate,
  width = 2000,
  height = 2000,
  duration = 2000,
}: UseAutoOrganizeOptions) {
  const simulationRef = useRef<d3.Simulation<LayoutNode> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const targetPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const startTimeRef = useRef<number | null>(null);

  // Initialize or update simulation
  const initializeSimulation = useCallback(() => {
    if (nodes.length === 0) return;

    const nodeMap = new Map<string, LayoutNode>();

    // Initialize nodes with current positions
    nodes.forEach((node) => {
      const x = node.position?.x ?? width / 2 + (Math.random() - 0.5) * 400;
      const y = node.position?.y ?? height / 2 + (Math.random() - 0.5) * 400;

      nodeMap.set(node.id, {
        id: node.id,
        x,
        y,
        vx: 0,
        vy: 0,
      });

      // Store start position
      startPositionsRef.current.set(node.id, { x, y });
    });

    // Create D3 force simulation
    const simulation = d3
      .forceSimulation(Array.from(nodeMap.values()))
      .force(
        'link',
        d3
          .forceLink(edges.map((e) => ({ source: e.source, target: e.target })))
          .id((d: any) => d.id)
          .distance(150)
          .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(60))
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    // Store target positions as simulation runs
    simulation.on('tick', () => {
      nodeMap.forEach((node) => {
        if (node.x !== undefined && node.y !== undefined) {
          targetPositionsRef.current.set(node.id, {
            x: node.x,
            y: node.y,
          });
        }
      });
    });

    simulationRef.current = simulation;

    // Run simulation for initial layout calculation
    simulation.stop();
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    // Extract final target positions
    nodeMap.forEach((node) => {
      if (node.x !== undefined && node.y !== undefined) {
        targetPositionsRef.current.set(node.id, {
          x: node.x,
          y: node.y,
        });
      }
    });
  }, [nodes, edges, width, height]);

  // Smooth interpolation animation
  const animatePositions = useCallback(
    (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      // Interpolate each node's position
      targetPositionsRef.current.forEach((targetPos, nodeId) => {
        const startPos = startPositionsRef.current.get(nodeId);
        if (!startPos) return;

        const currentX = startPos.x + (targetPos.x - startPos.x) * easeOutCubic;
        const currentY = startPos.y + (targetPos.y - startPos.y) * easeOutCubic;

        onPositionUpdate(nodeId, { x: currentX, y: currentY });
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animatePositions);
      } else {
        startTimeRef.current = null;
        animationFrameRef.current = null;
      }
    },
    [duration, onPositionUpdate]
  );

  // Trigger auto-organize when enabled
  useEffect(() => {
    if (!enabled || nodes.length === 0) {
      // Clean up
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Store current positions as start positions
    nodes.forEach((node) => {
      startPositionsRef.current.set(node.id, {
        x: node.position?.x ?? width / 2,
        y: node.position?.y ?? height / 2,
      });
    });

    // Initialize simulation to calculate target positions
    initializeSimulation();

    // Start smooth animation
    startTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animatePositions);

    // Cleanup
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, nodes.length, edges.length, initializeSimulation, animatePositions, width, height]);

  return {
    isAnimating: animationFrameRef.current !== null,
  };
}

