import { Router } from 'express';
import { suggestConnections, generateEmbedding } from '../services/aiService.js';

export const aiRouter = Router();

// Suggest connections for a new node
aiRouter.post('/suggest-connections', async (req, res) => {
  try {
    const { content, existingNodes } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const suggestions = await suggestConnections(content, existingNodes || []);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error suggesting connections:', error);
    res.status(500).json({ error: 'Failed to suggest connections' });
  }
});

// Generate embedding for semantic similarity
aiRouter.post('/embedding', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const embedding = await generateEmbedding(text);
    res.json({ embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(500).json({ error: 'Failed to generate embedding' });
  }
});

