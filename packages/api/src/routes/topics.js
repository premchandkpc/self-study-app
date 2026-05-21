import { Router } from 'express';
import { getTopicList, getTopicByAbbr } from '../db/queries/topics.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const topics = await getTopicList();
    res.json(topics);
  } catch (err) {
    next(err);
  }
});

router.get('/:abbr', async (req, res, next) => {
  try {
    const topic = await getTopicByAbbr(req.params.abbr);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json(topic);
  } catch (err) {
    next(err);
  }
});

export default router;
