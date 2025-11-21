import { Router } from 'express';
import { clusterNodes, calculateNodeImportance } from '../services/graphService.js';

export const graphRouter = Router();

// Cluster nodes by similarity
graphRouter.post('/cluster', async (req, res) => {
  try {
    const { nodes } = req.body;
    
    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: 'Nodes array is required' });
    }

    const clusters = await clusterNodes(nodes);
    res.json({ clusters });
  } catch (error) {
    console.error('Error clustering nodes:', error);
    res.status(500).json({ error: 'Failed to cluster nodes' });
  }
});

// Calculate importance scores for nodes
graphRouter.post('/importance', async (req, res) => {
  try {
    const { nodes, edges } = req.body;
    
    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: 'Nodes array is required' });
    }

    const importanceScores = calculateNodeImportance(nodes, edges || []);
    res.json({ importanceScores });
  } catch (error) {
    console.error('Error calculating importance:', error);
    res.status(500).json({ error: 'Failed to calculate importance' });
  }
});

