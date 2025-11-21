import OpenAI from 'openai';
import type { Node } from '@/types/Node';

// Initialize OpenAI lazily to avoid errors when API key is missing
function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

/**
 * Generate embedding for text using OpenAI
 * Returns empty array if API key is not set (node creation will still succeed)
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    console.warn('[embeddings] OPENAI_API_KEY is not set, returning empty embedding');
    // Return empty array instead of throwing - allows node creation without embedding
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSION,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    console.error('[embeddings] Error generating embedding:', error?.message);
    // Return empty array on error instead of throwing
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }
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
