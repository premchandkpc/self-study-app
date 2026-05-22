import express from 'express';
import cors from 'cors';
import mapsRouter from './routes/maps.js';
import topicsRouter from './routes/topics.js';
import subtopicsRouter from './routes/subtopics.js';
import { getDb, saveDb } from './db.js';

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Init store
getDb();

app.use('/api', mapsRouter);
app.use('/api', topicsRouter);
app.use('/api', subtopicsRouter);

app.post('/api/execute', (req, res) => {
  const { code, input } = req.body;
  try {
    const fn = new Function('input', code);
    const result = fn(input);
    res.json({ result, error: null });
  } catch (e) {
    res.json({ result: null, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Stateless API running on http://localhost:${PORT}`);
});
