import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface Node {
  id: string;
  title: string;
  content: string;
}

interface ConnectionSuggestion {
  nodeId: string;
  reason: string;
  confidence: number;
}

// Suggest connections for a new node based on existing nodes
export async function suggestConnections(
  content: string,
  existingNodes: Node[]
): Promise<ConnectionSuggestion[]> {
  // If no OpenAI API key, return simple keyword-based suggestions
  if (!process.env.OPENAI_API_KEY) {
    return suggestConnectionsSimple(content, existingNodes);
  }

  try {
    const nodeSummaries = existingNodes
      .slice(0, 50) // Limit to prevent token overflow
      .map((node) => `ID: ${node.id}\nTitle: ${node.title}\nContent: ${node.content.substring(0, 200)}`)
      .join('\n\n---\n\n');

    const prompt = `Given a new note with the following content:

"${content.substring(0, 1000)}"

And these existing notes:
${nodeSummaries}

Identify up to 5 existing notes that are most related to this new note. For each, provide:
1. The node ID
2. A brief reason for the connection
3. A confidence score from 0 to 1

Return as JSON array: [{"nodeId": "...", "reason": "...", "confidence": 0.8}]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a knowledge graph assistant that identifies connections between ideas. Always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '[]';
    const suggestions = JSON.parse(response) as ConnectionSuggestion[];
    return suggestions.filter((s) => s.confidence > 0.3);
  } catch (error) {
    console.error('OpenAI API error, falling back to simple suggestions:', error);
    return suggestConnectionsSimple(content, existingNodes);
  }
}

// Simple keyword-based connection suggestion (fallback)
function suggestConnectionsSimple(
  content: string,
  existingNodes: Node[]
): ConnectionSuggestion[] {
  const contentLower = content.toLowerCase();
  const words = contentLower.split(/\s+/).filter((w) => w.length > 3);

  const suggestions: ConnectionSuggestion[] = [];

  for (const node of existingNodes) {
    const nodeText = `${node.title} ${node.content}`.toLowerCase();
    let matches = 0;

    for (const word of words) {
      if (nodeText.includes(word)) {
        matches++;
      }
    }

    if (matches > 0) {
      const confidence = Math.min(matches / words.length, 0.9);
      suggestions.push({
        nodeId: node.id,
        reason: `Shared keywords (${matches} matches)`,
        confidence,
      });
    }
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

// Generate embedding for semantic similarity
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    // Return a simple hash-based "embedding" for development
    return simpleHashEmbedding(text);
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit input length
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error, using fallback:', error);
    return simpleHashEmbedding(text);
  }
}

// Simple hash-based embedding (fallback)
function simpleHashEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const embedding = new Array(1536).fill(0);

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
    }
    const index = Math.abs(hash) % embedding.length;
    embedding[index] += 1;
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => (magnitude > 0 ? val / magnitude : 0));
}


