import { PrismaClient, Prisma } from '@prisma/client';

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
  try {
    const vectorBuffer = arrayToVector(embedding);
    
    // Convert buffer to hex string for PostgreSQL
    const vectorHex = vectorBuffer.toString('hex');
    
    // Build query with proper parameter substitution
    let query = `
      SELECT 
        id,
        1 - (embedding <=> $1::vector) as similarity
      FROM nodes
      WHERE workspace_id = $2::uuid
        AND embedding IS NOT NULL
    `;
    
    // Use text format for vector instead of binary hex to avoid pattern matching issues
    const vectorText = `[${embedding.join(',')}]`;
    
    // Validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(workspaceId)) {
      console.error('[findSimilarNodes] Invalid workspaceId UUID format:', workspaceId);
      return [];
    }
    if (excludeNodeId && !uuidPattern.test(excludeNodeId)) {
      console.error('[findSimilarNodes] Invalid excludeNodeId UUID format:', excludeNodeId);
      return [];
    }
    
    const params: any[] = [
      vectorText, // PostgreSQL text format for vector: [0.1, 0.2, 0.3, ...]
      workspaceId,
    ];
    
    let paramIndex = 3;
    if (excludeNodeId) {
      query += ` AND id != $${paramIndex}::uuid`;
      params.push(excludeNodeId);
      paramIndex++;
    }
    
    query += `
      AND 1 - (embedding <=> $1::vector) >= $${paramIndex}
      ORDER BY embedding <=> $1::vector
      LIMIT $${paramIndex + 1}
    `;
    
    params.push(threshold, limit);
    
    // Use Prisma.sql for safe parameter binding
    // Build the query using Prisma.sql template tag
    let sqlQuery: Prisma.Sql;
    
    if (excludeNodeId) {
      sqlQuery = Prisma.sql`
        SELECT 
          id,
          1 - (embedding <=> ${vectorText}::vector) as similarity
        FROM nodes
        WHERE workspace_id = ${workspaceId}::uuid
          AND embedding IS NOT NULL
          AND id != ${excludeNodeId}::uuid
          AND 1 - (embedding <=> ${vectorText}::vector) >= ${threshold}
        ORDER BY embedding <=> ${vectorText}::vector
        LIMIT ${limit}
      `;
    } else {
      sqlQuery = Prisma.sql`
        SELECT 
          id,
          1 - (embedding <=> ${vectorText}::vector) as similarity
        FROM nodes
        WHERE workspace_id = ${workspaceId}::uuid
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${vectorText}::vector) >= ${threshold}
        ORDER BY embedding <=> ${vectorText}::vector
        LIMIT ${limit}
      `;
    }
    
    const results = await prisma.$queryRaw<any[]>(sqlQuery);
    
    return (results || []).map((row: any) => ({
      id: row.id,
      similarity: parseFloat(row.similarity?.toString() || '0'),
    }));
  } catch (error: any) {
    console.error('Error in findSimilarNodes:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      workspaceId,
      embeddingLength: embedding?.length,
      excludeNodeId,
      threshold,
      limit,
    });
    // Return empty array on error instead of throwing
    // This allows node creation to continue even if similarity search fails
    return [];
  }
}

// Type exports
export type PrismaClientType = PrismaClient;