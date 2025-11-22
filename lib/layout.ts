import * as d3 from 'd3';
import type { Node, Edge } from './types';

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export interface LayoutEdge {
  source: string | LayoutNode;
  target: string | LayoutNode;
}

export function runForceLayout(
  nodes: Node[],
  edges: Edge[],
  width: number = 1200,
  height: number = 800,
  iterations: number = 300
): Map<string, { x: number; y: number }> {
  const layoutNodes: LayoutNode[] = nodes.map(node => ({
    id: node.id,
    x: node.x || Math.random() * width,
    y: node.y || Math.random() * height,
  }));

  const layoutEdges: LayoutEdge[] = edges.map(edge => ({
    source: edge.sourceId,
    target: edge.targetId,
  }));

  const simulation = d3
    .forceSimulation(layoutNodes as any)
    .force(
      'link',
      d3
        .forceLink(layoutEdges)
        .id((d: any) => d.id)
        .distance(150)
        .strength(0.5)
    )
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))
    .stop();

  // Run simulation
  for (let i = 0; i < iterations; i++) {
    simulation.tick();
  }

  const positions = new Map<string, { x: number; y: number }>();
  layoutNodes.forEach(node => {
    positions.set(node.id, { x: node.x, y: node.y });
  });

  return positions;
}


