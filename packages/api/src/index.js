import 'dotenv/config';
import express from 'express';
import corsMiddleware from './middleware/cors.js';
import errorHandler from './middleware/errorHandler.js';
import healthRoutes from './routes/health.js';
import topicsRoutes from './routes/topics.js';
import subtopicsRoutes from './routes/subtopics.js';
import mapsRoutes from './routes/maps.js';
import { seedIfEmpty } from './db/seed.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/topics', subtopicsRoutes);
app.use('/api/maps', mapsRoutes);

// Error handling
app.use(errorHandler);

// Start server
async function start() {
  try {
    // Run seed if needed
    await seedIfEmpty();

    app.listen(PORT, () => {
      console.log(`✓ API server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
