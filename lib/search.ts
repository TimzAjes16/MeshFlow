import Fuse from 'fuse.js';
import type { Node } from '@/types/Node';

export interface SearchResult {
  node: Node;
  score?: number;
}

/**
 * Search nodes using Fuse.js fuzzy search
 */
export function searchNodes(
  query: string,
  nodes: Node[],
  options?: {
    threshold?: number;
    limit?: number;
  }
): SearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const fuse = new Fuse(nodes, {
    keys: ['title', 'content', 'tags'],
    threshold: options?.threshold || 0.3,
    includeScore: true,
  });

  const results = fuse.search(query);
  
  const limit = options?.limit || 10;
  const limitedResults = results.slice(0, limit);

  return limitedResults.map((result) => ({
    node: result.item,
    score: result.score,
  }));
}

/**
 * Highlight search query in text
 */
export function highlightSearch(text: string, query: string): string {
  if (!query.trim()) {
    return text;
  }

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}
