import OpenAI from 'openai';
import type { Node } from '@/types/Node';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

/**
 * Generate embedding for text using OpenAI
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSION,
  });

  return response.data[0].embedding;
}

/**
 * Generate embedding for a node (title + content)
 */
export async function getNodeEmbedding(node: Pick<Node, 'title' | 'content'>): Promise<number[]> {
  // Extract text from rich content if needed
  const contentText = typeof node.content === 'string' 
    ? node.content 
    : extractTextFromJSON(node.content);
  
  const fullText = `${node.title}\n${contentText}`;
  return getEmbedding(fullText);
}

/**
 * Extract plain text from JSONB content
 */
function extractTextFromJSON(content: any): string {
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && content !== null) {
    if (content.type === 'doc' && content.content) {
      // TipTap JSON format
      return extractTextFromTipTap(content);
    }
    // Fallback: stringify
    return JSON.stringify(content);
  }
  return '';
}

/**
 * Extract text from TipTap JSON structure
 */
function extractTextFromTipTap(node: any): string {
  if (node.type === 'text' && node.text) {
    return node.text;
  }
  
  if (node.content && Array.isArray(node.content)) {
    return node.content.map((child: any) => extractTextFromTipTap(child)).join(' ');
  }
  
  return '';
}
