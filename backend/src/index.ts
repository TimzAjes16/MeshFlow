import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { aiRouter } from './routes/ai.js';
import { graphRouter } from './routes/graph.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRouter);
app.use('/api/graph', graphRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MeshFlow API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 MeshFlow backend running on http://localhost:${PORT}`);
});


