import { Router } from 'express';
import { getSubtopicBySlug } from '../db/queries/subtopics.js';

const router = Router();

// GET /api/topics/:abbr/:slug
router.get('/:abbr/:slug', async (req, res, next) => {
  try {
    const subtopic = await getSubtopicBySlug(req.params.abbr, req.params.slug);
    if (!subtopic) {
      return res.status(404).json({ error: 'Subtopic not found' });
    }
    res.json(subtopic);
  } catch (err) {
    next(err);
  }
});

export default router;
