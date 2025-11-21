import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';
import * as d3 from 'd3-force';

interface Position {
  x: number;
  y: number;
}

interface LayoutNode extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
}

/**
 * Force-directed layout using D3
 */
export function forceDirectedLayout(
  nodes: Node[],
  edges: Edge[],
  width: number = 1000,
  height: number = 800,
  iterations: number = 300
): Map<string, Position> {
  const nodeMap = new Map<string, LayoutNode>();

  // Initialize nodes
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      id: node.id,
      x: node.x || width / 2 + (Math.random() - 0.5) * 400,
      y: node.y || height / 2 + (Math.random() - 0.5) * 400,
      vx: 0,
      vy: 0,
    });
  });

  // Create D3 simulation
  const simulation = d3
    .forceSimulation(Array.from(nodeMap.values()))
    .force(
      'link',
      d3
        .forceLink(edges.map(e => ({ source: e.source, target: e.target })))
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

  // Extract positions
  const positions = new Map<string, Position>();
  nodeMap.forEach((node, id) => {
    positions.set(id, {
      x: node.x || width / 2,
      y: node.y || height / 2,
    });
  });

  return positions;
}

/**
 * Radial layout around a center node
 */
export function radialLayout(
  centerNode: Node,
  nodes: Node[],
  radius: number = 300
): Map<string, Position> {
  const positions = new Map<string, Position>();
  
  // Set center
  positions.set(centerNode.id, {
    x: centerNode.x || 500,
    y: centerNode.y || 400,
  });

  // Arrange other nodes in a circle
  const otherNodes = nodes.filter(n => n.id !== centerNode.id);
  const angleStep = (2 * Math.PI) / otherNodes.length;

  otherNodes.forEach((node, index) => {
    const angle = index * angleStep;
    const x = (centerNode.x || 500) + radius * Math.cos(angle);
    const y = (centerNode.y || 400) + radius * Math.sin(angle);

    positions.set(node.id, { x, y });
  });

  return positions;
}

/**
 * Hierarchical layout (tree-like)
 */
export function hierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  rootNodeId: string,
  width: number = 1000,
  height: number = 800
): Map<string, Position> {
  const positions = new Map<string, Position>();
  
  // Build tree structure
  const children = new Map<string, string[]>();
  const nodeSet = new Set(nodes.map(n => n.id));
  
  edges.forEach(edge => {
    if (!children.has(edge.source)) {
      children.set(edge.source, []);
    }
    children.get(edge.source)!.push(edge.target);
  });

  // BFS traversal to assign positions
  const visited = new Set<string>();
  const queue: { nodeId: string; level: number; x: number; y: number }[] = [];
  
  const root = nodes.find(n => n.id === rootNodeId) || nodes[0];
  queue.push({ nodeId: root.id, level: 0, x: width / 2, y: 100 });

  while (queue.length > 0) {
    const { nodeId, level, x, y } = queue.shift()!;
    
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    
    positions.set(nodeId, { x, y });

    const nodeChildren = children.get(nodeId) || [];
    const childCount = nodeChildren.length;
    const levelHeight = 150;
    const spacing = Math.min(200, width / (childCount + 1));

    nodeChildren.forEach((childId, index) => {
      if (!visited.has(childId)) {
        const childX = x - (spacing * (childCount - 1)) / 2 + index * spacing;
        const childY = y + levelHeight;
        queue.push({ nodeId: childId, level: level + 1, x: childX, y: childY });
      }
    });
  }

  // Position unconnected nodes
  nodes.forEach(node => {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: node.x || width / 2,
        y: node.y || height / 2,
      });
    }
  });

  return positions;
}

/**
 * Semantic cluster layout based on embedding similarity
 */
export function semanticClusterLayout(
  nodes: Node[],
  embeddings: Map<string, number[]>,
  width: number = 1000,
  height: number = 800
): Map<string, Position> {
  if (nodes.length === 0) return new Map();

  // Use force-directed but with clusters based on similarity
  // For now, we'll use a simplified version that groups similar nodes
  const positions = new Map<string, Position>();
  
  // Group nodes into clusters based on embedding similarity
  const clusters: Node[][] = [];
  const assigned = new Set<string>();

  nodes.forEach(node => {
    if (assigned.has(node.id)) return;
    
    const cluster = [node];
    assigned.add(node.id);
    const embedding = embeddings.get(node.id);

    if (!embedding) {
      positions.set(node.id, {
        x: node.x || Math.random() * width,
        y: node.y || Math.random() * height,
      });
      return;
    }

    // Find similar nodes for this cluster
    nodes.forEach(otherNode => {
      if (assigned.has(otherNode.id)) return;
      
      const otherEmbedding = embeddings.get(otherNode.id);
      if (!otherEmbedding) return;

      // Simple clustering: if similarity is high, add to cluster
      // We'll use a simple distance metric
      const distance = calculateEmbeddingDistance(embedding, otherEmbedding);
      if (distance < 0.3) { // Threshold for cluster membership
        cluster.push(otherNode);
        assigned.add(otherNode.id);
      }
    });

    clusters.push(cluster);
  });

  // Position clusters
  const clusterRadius = Math.min(width, height) / (Math.sqrt(clusters.length) + 2);
  const clusterPositions: Position[] = [];

  clusters.forEach((cluster, clusterIndex) => {
    const row = Math.floor(clusterIndex / Math.ceil(Math.sqrt(clusters.length)));
    const col = clusterIndex % Math.ceil(Math.sqrt(clusters.length));
    
    const clusterCenterX = (col + 1) * (width / (Math.ceil(Math.sqrt(clusters.length)) + 1));
    const clusterCenterY = (row + 1) * (height / (Math.ceil(Math.sqrt(clusters.length)) + 1));

    // Position nodes within cluster
    cluster.forEach((node, nodeIndex) => {
      const angle = (nodeIndex / cluster.length) * 2 * Math.PI;
      const nodeRadius = clusterRadius * 0.4;
      
      positions.set(node.id, {
        x: clusterCenterX + nodeRadius * Math.cos(angle),
        y: clusterCenterY + nodeRadius * Math.sin(angle),
      });
    });
  });

  return positions;
}

/**
 * Calculate Euclidean distance between embeddings
 */
function calculateEmbeddingDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1;
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  
  return Math.sqrt(sum);
}
