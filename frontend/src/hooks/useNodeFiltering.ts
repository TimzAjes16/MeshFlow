import { useMemo } from 'react';
import { useMeshStore } from '../store/useMeshStore';
import { graphService } from '../services/api';
import { useEffect, useState } from 'react';

export function useNodeFiltering() {
  const { nodes, edges, filterOptions, searchQuery, explodedNodeId } = useMeshStore();
  const [importanceScores, setImportanceScores] = useState<Record<string, number>>({});

  // Calculate importance scores
  useEffect(() => {
    if (nodes.length > 0) {
      graphService
        .calculateImportance(nodes, edges)
        .then((scores) => {
          setImportanceScores(scores);
          // Update nodes with importance scores
          nodes.forEach((node) => {
            if (scores[node.id] !== undefined) {
              useMeshStore.getState().updateNode(node.id, { importance: scores[node.id] });
            }
          });
        })
        .catch(console.error);
    }
  }, [nodes.length, edges.length]);

  const filteredNodes = useMemo(() => {
    let filtered = [...nodes];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (node) =>
          node.title?.toLowerCase().includes(query) ||
          node.content?.toLowerCase().includes(query)
      );
    }

    // Filter by age
    if (filterOptions.hideOld) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filterOptions.daysOld);
      filtered = filtered.filter((node) => new Date(node.updatedAt) >= cutoffDate);
    }

    // Filter by importance
    if (filterOptions.hideLowImportance) {
      filtered = filtered.filter(
        (node) => (node.importance || importanceScores[node.id] || 0.5) >= filterOptions.minImportance
      );
    }

    // Explode mode: show only exploded node and its connections
    if (explodedNodeId) {
      const explodedNode = nodes.find((n) => n.id === explodedNodeId);
      if (explodedNode) {
        const connectedIds = new Set([explodedNodeId]);
        edges.forEach((edge) => {
          const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
          const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
          if (sourceId === explodedNodeId) connectedIds.add(targetId);
          if (targetId === explodedNodeId) connectedIds.add(sourceId);
        });
        filtered = filtered.filter((node) => connectedIds.has(node.id));
      }
    }

    return filtered;
  }, [nodes, edges, filterOptions, searchQuery, explodedNodeId, importanceScores]);

  return filteredNodes;
}

