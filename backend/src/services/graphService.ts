interface Node {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  strength?: number;
}

interface Cluster {
  id: string;
  nodes: string[];
  centroid: number[];
  label: string;
}

// Cluster nodes using K-means-like algorithm on embeddings
export function clusterNodes(nodes: Node[]): Cluster[] {
  if (nodes.length === 0) return [];

  // If nodes don't have embeddings, use simple text-based clustering
  const nodesWithEmbeddings = nodes.filter((n) => n.embedding);
  if (nodesWithEmbeddings.length < 2) {
    return [{ id: 'cluster-1', nodes: nodes.map((n) => n.id), centroid: [], label: 'All Nodes' }];
  }

  // Simple K-means clustering (K = sqrt(n/2))
  const k = Math.max(2, Math.floor(Math.sqrt(nodesWithEmbeddings.length / 2)));
  const clusters: Cluster[] = [];

  // Initialize centroids randomly
  const centroids: number[][] = [];
  for (let i = 0; i < k; i++) {
    const randomNode = nodesWithEmbeddings[Math.floor(Math.random() * nodesWithEmbeddings.length)];
    centroids.push([...randomNode.embedding!]);
  }

  // Iterate to find clusters
  for (let iter = 0; iter < 10; iter++) {
    const assignments: string[][] = new Array(k).fill(null).map(() => []);

    // Assign nodes to nearest centroid
    for (const node of nodesWithEmbeddings) {
      let minDist = Infinity;
      let nearestCluster = 0;

      for (let i = 0; i < k; i++) {
        const dist = cosineDistance(node.embedding!, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          nearestCluster = i;
        }
      }

      assignments[nearestCluster].push(node.id);
    }

    // Update centroids
    for (let i = 0; i < k; i++) {
      if (assignments[i].length > 0) {
        const clusterNodes = nodesWithEmbeddings.filter((n) => assignments[i].includes(n.id));
        const dim = clusterNodes[0].embedding!.length;
        centroids[i] = new Array(dim).fill(0);

        for (const node of clusterNodes) {
          for (let j = 0; j < dim; j++) {
            centroids[i][j] += node.embedding![j];
          }
        }

        for (let j = 0; j < dim; j++) {
          centroids[i][j] /= clusterNodes.length;
        }
      }
    }

    // Create cluster objects
    clusters.length = 0;
    for (let i = 0; i < k; i++) {
      if (assignments[i].length > 0) {
        const clusterNodes = nodesWithEmbeddings.filter((n) => assignments[i].includes(n.id));
        const label = clusterNodes[0]?.title || `Cluster ${i + 1}`;
        clusters.push({
          id: `cluster-${i}`,
          nodes: assignments[i],
          centroid: centroids[i],
          label,
        });
      }
    }
  }

  // Add nodes without embeddings to the largest cluster
  const nodesWithoutEmbeddings = nodes.filter((n) => !n.embedding);
  if (nodesWithoutEmbeddings.length > 0 && clusters.length > 0) {
    clusters[0].nodes.push(...nodesWithoutEmbeddings.map((n) => n.id));
  }

  return clusters;
}

// Calculate node importance based on connectivity and recency
export function calculateNodeImportance(nodes: Node[], edges: Edge[]): Record<string, number> {
  const importance: Record<string, number> = {};

  // Count connections per node
  const connectionCount: Record<string, number> = {};
  for (const node of nodes) {
    connectionCount[node.id] = 0;
  }

  for (const edge of edges) {
    connectionCount[edge.source] = (connectionCount[edge.source] || 0) + 1;
    connectionCount[edge.target] = (connectionCount[edge.target] || 0) + 1;
  }

  // Calculate importance: connectivity (70%) + recency (30%)
  const now = Date.now();
  const maxConnections = Math.max(...Object.values(connectionCount), 1);
  const maxAge = Math.max(
    ...nodes.map((n) => now - new Date(n.updatedAt).getTime()),
    1
  );

  for (const node of nodes) {
    const connectivity = connectionCount[node.id] / maxConnections;
    const age = now - new Date(node.updatedAt).getTime();
    const recency = 1 - age / maxAge;

    importance[node.id] = connectivity * 0.7 + recency * 0.3;
  }

  return importance;
}

// Cosine distance between two vectors
function cosineDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 1;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1 - similarity; // Convert similarity to distance
}

