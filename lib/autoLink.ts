import type { Node } from '@/types/Node';
import type { Edge } from '@/types/Edge';
import { cosineSimilarity, SIMILARITY_THRESHOLDS } from './similarity';

interface SimilarityResult {
  node: Node;
  similarity: number;
}

/**
 * Find nodes similar to the given embedding
 */
export function getSimilarNodes(
  embedding: number[],
  allNodes: Node[],
  excludeNodeId?: string
): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const node of allNodes) {
    if (excludeNodeId && node.id === excludeNodeId) continue;
    if (!node.embedding || node.embedding.length === 0) continue;

    const similarity = cosineSimilarity(embedding, node.embedding);
    
    if (similarity >= SIMILARITY_THRESHOLDS.SUGGEST_LINK) {
      results.push({ node, similarity });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results;
}

/**
 * Get nodes that should be auto-linked (above threshold)
 */
export function getAutoLinkNodes(
  embedding: number[],
  allNodes: Node[],
  excludeNodeId?: string
): Node[] {
  const similar = getSimilarNodes(embedding, allNodes, excludeNodeId);
  
  return similar
    .filter(result => result.similarity >= SIMILARITY_THRESHOLDS.AUTO_LINK)
    .map(result => result.node);
}

/**
 * Get suggested links (above suggest threshold but below auto-link)
 */
export function getSuggestedLinks(
  embedding: number[],
  allNodes: Node[],
  excludeNodeId?: string
): SimilarityResult[] {
  const similar = getSimilarNodes(embedding, allNodes, excludeNodeId);
  
  return similar.filter(
    result => 
      result.similarity >= SIMILARITY_THRESHOLDS.SUGGEST_LINK &&
      result.similarity < SIMILARITY_THRESHOLDS.AUTO_LINK
  );
}

/**
 * Create edges for auto-linking
 */
export function createAutoEdges(
  sourceNodeId: string,
  targetNodes: Node[],
  workspaceId: string
): Omit<Edge, 'id' | 'createdAt'>[] {
  return targetNodes.map(targetNode => ({
    workspaceId,
    source: sourceNodeId,
    target: targetNode.id,
    similarity: 1, // Will be calculated separately
  }));
}
