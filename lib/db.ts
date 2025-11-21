import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Helper function to convert embedding array to PostgreSQL vector format
// pgvector stores as: dimensions (uint32), unused (uint16), unused (uint16), data (float32[])
export function arrayToVector(embedding: number[]): Buffer {
  // pgvector binary format
  const dimensions = embedding.length;
  const buffer = Buffer.allocUnsafe(4 + 2 + 2 + dimensions * 4);
  
  buffer.writeUInt32LE(dimensions, 0);
  buffer.writeUInt16LE(0, 4); // unused
  buffer.writeUInt16LE(0, 6); // unused
  
  for (let i = 0; i < dimensions; i++) {
    buffer.writeFloatLE(embedding[i], 8 + i * 4);
  }
  
  return buffer;
}

// Helper function to convert PostgreSQL vector to array
export function vectorToArray(vector: Buffer | null): number[] | null {
  if (!vector || vector.length === 0) return null;
  
  const dimensions = vector.readUInt32LE(0);
  const array: number[] = [];
  
  for (let i = 0; i < dimensions; i++) {
    array.push(vector.readFloatLE(8 + i * 4));
  }
  
  return array;
}

// Raw SQL helper for vector similarity search using pgvector
export async function findSimilarNodes(
  embedding: number[],
  workspaceId: string,
  excludeNodeId?: string,
  threshold: number = 0.65,
  limit: number = 10
): Promise<Array<{ id: string; similarity: number }>> {
  const vectorBuffer = arrayToVector(embedding);
  
  // Use Prisma raw query with pgvector cosine distance
  let query = `
    SELECT 
      id,
      1 - (embedding <=> $1::vector) as similarity
    FROM nodes
    WHERE workspace_id = $2::uuid
      AND embedding IS NOT NULL
  `;
  
  const params: any[] = [
    Buffer.from(`\\x${vectorBuffer.toString('hex')}`),
    workspaceId,
  ];
  
  if (excludeNodeId) {
    query += ` AND id != $${params.length + 1}::uuid`;
    params.push(excludeNodeId);
  }
  
  query += `
    AND 1 - (embedding <=> $1::vector) >= $${params.length + 1}
    ORDER BY embedding <=> $1::vector
    LIMIT $${params.length + 2}
  `;
  
  params.push(threshold, limit);
  
  // Use Prisma's raw query with proper parameter binding
  const results = await prisma.$queryRawUnsafe<any[]>(query, ...params);
  
  return results.map((row: any) => ({
    id: row.id,
    similarity: parseFloat(row.similarity?.toString() || '0'),
  }));
}

// Type exports
export type PrismaClientType = PrismaClient;