import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/topics', (req, res) => {
  const store = getDb();
  res.json(store.topics.map(t => ({
    slug: t.slug, title: t.title, description: t.description, icon: t.icon, config: t.config,
  })));
});

router.get('/topics/:slug', (req, res) => {
  const store = getDb();
  const topic = store.topics.find(t => t.slug === req.params.slug);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  const subtopics = store.subtopics
    .filter(s => s.topic_id === topic.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(s => ({
      slug: s.slug, title: s.title, description: s.description, tags: s.tags, sort_order: s.sort_order,
      topic_slug: topic.slug,
      template_slug: s.template_slug || store.templates.find(x => x.id === s.template_id)?.slug,
      template_name: store.templates.find(x => x.id === s.template_id)?.name,
    }));

  res.json({ topic: { slug: topic.slug, title: topic.title, description: topic.description, icon: topic.icon, config: topic.config }, subtopics });
});

export default router;
