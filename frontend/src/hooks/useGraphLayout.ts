import { useCallback } from 'react';
import { useMeshStore } from '../store/useMeshStore';
import type { Node, Edge, LayoutMode } from '../types';

export function useGraphLayout() {
  const { updateNode } = useMeshStore();

  const applyLayout = useCallback(
    (nodes: Node[], edges: Edge[], mode: LayoutMode) => {
      if (nodes.length === 0) return;

      switch (mode) {
        case 'radial':
          applyRadialLayout(nodes, updateNode);
          break;
        case 'hierarchical':
          applyHierarchicalLayout(nodes, edges, updateNode);
          break;
        case 'linear':
          applyLinearLayout(nodes, updateNode);
          break;
        case 'mind-map':
          applyMindMapLayout(nodes, edges, updateNode);
          break;
        case 'force-directed':
        default:
          // Force-directed is handled by react-force-graph
          break;
      }
    },
    [updateNode]
  );

  return { applyLayout };
}

function applyRadialLayout(nodes: Node[], updateNode: (id: string, updates: Partial<Node>) => void) {
  const centerX = 0;
  const centerY = 0;
  const radius = Math.max(200, Math.sqrt(nodes.length) * 30);
  const angleStep = (2 * Math.PI) / nodes.length;

  nodes.forEach((node, index) => {
    const angle = index * angleStep;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    updateNode(node.id, {
      fx: x,
      fy: y,
    });
  });
}

function applyHierarchicalLayout(
  nodes: Node[],
  edges: Edge[],
  updateNode: (id: string, updates: Partial<Node>) => void
) {
  // Simple hierarchical: find root nodes (no incoming edges) and arrange in levels
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const incomingCount = new Map(nodes.map((n) => [n.id, 0]));

  edges.forEach((edge) => {
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    incomingCount.set(targetId, (incomingCount.get(targetId) || 0) + 1);
  });

  const levels: string[][] = [];
  const processed = new Set<string>();

  // Find root nodes
  const rootNodes = nodes.filter((n) => (incomingCount.get(n.id) || 0) === 0);
  if (rootNodes.length > 0) {
    levels.push(rootNodes.map((n) => n.id));
    rootNodes.forEach((n) => processed.add(n.id));
  }

  // Build levels
  while (processed.size < nodes.length) {
    const currentLevel: string[] = [];
    nodes.forEach((node) => {
      if (processed.has(node.id)) return;

      const sourceIds = edges
        .filter((e) => {
          const targetId = typeof e.target === 'string' ? e.target : e.target.id;
          return targetId === node.id;
        })
        .map((e) => {
          const sourceId = typeof e.source === 'string' ? e.source : e.source.id;
          return sourceId;
        });

      if (sourceIds.every((id) => processed.has(id))) {
        currentLevel.push(node.id);
        processed.add(node.id);
      }
    });

    if (currentLevel.length === 0) break;
    levels.push(currentLevel);
  }

  // Position nodes
  const levelHeight = 150;
  const startY = -(levels.length * levelHeight) / 2;

  levels.forEach((level, levelIndex) => {
    const y = startY + levelIndex * levelHeight;
    const nodeWidth = 200;
    const totalWidth = level.length * nodeWidth;
    const startX = -totalWidth / 2;

    level.forEach((nodeId, nodeIndex) => {
      const x = startX + nodeIndex * nodeWidth + nodeWidth / 2;
      updateNode(nodeId, { fx: x, fy: y });
    });
  });
}

function applyLinearLayout(nodes: Node[], updateNode: (id: string, updates: Partial<Node>) => void) {
  const spacing = 250;
  const startX = -(nodes.length * spacing) / 2;

  nodes.forEach((node, index) => {
    updateNode(node.id, {
      fx: startX + index * spacing,
      fy: 0,
    });
  });
}

function applyMindMapLayout(
  nodes: Node[],
  edges: Edge[],
  updateNode: (id: string, updates: Partial<Node>) => void
) {
  // Find central node (most connected)
  const connectionCount = new Map(nodes.map((n) => [n.id, 0]));
  edges.forEach((edge) => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    connectionCount.set(sourceId, (connectionCount.get(sourceId) || 0) + 1);
    connectionCount.set(targetId, (connectionCount.get(targetId) || 0) + 1);
  });

  const centerNode = nodes.reduce((max, node) =>
    (connectionCount.get(node.id) || 0) > (connectionCount.get(max.id) || 0) ? node : max
  );

  // Position center node
  updateNode(centerNode.id, { fx: 0, fy: 0 });

  // Position other nodes around center
  const connectedNodes = new Set([centerNode.id]);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  edges.forEach((edge) => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;

    if (sourceId === centerNode.id && !connectedNodes.has(targetId)) {
      connectedNodes.add(targetId);
    } else if (targetId === centerNode.id && !connectedNodes.has(sourceId)) {
      connectedNodes.add(sourceId);
    }
  });

  const radius = 300;
  const connectedArray = Array.from(connectedNodes).filter((id) => id !== centerNode.id);
  const angleStep = (2 * Math.PI) / Math.max(connectedArray.length, 1);

  connectedArray.forEach((nodeId, index) => {
    const angle = index * angleStep;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    updateNode(nodeId, { fx: x, fy: y });
  });

  // Position remaining nodes
  const remainingNodes = nodes.filter((n) => !connectedNodes.has(n.id));
  const outerRadius = radius * 1.8;
  const outerAngleStep = (2 * Math.PI) / Math.max(remainingNodes.length, 1);

  remainingNodes.forEach((node, index) => {
    const angle = index * outerAngleStep;
    const x = outerRadius * Math.cos(angle);
    const y = outerRadius * Math.sin(angle);
    updateNode(node.id, { fx: x, fy: y });
  });
}


