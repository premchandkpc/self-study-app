import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/subtopics/:slug', (req, res) => {
  const store = getDb();
  const subtopic = store.subtopics.find(s => s.slug === req.params.slug);
  if (!subtopic) return res.status(404).json({ error: 'Subtopic not found' });

  const topic = store.topics.find(t => t.id === subtopic.topic_id);
  const template = store.templates.find(t => t.id === subtopic.template_id);

  // Related: same topic or shared tags
  const related = store.subtopics
    .filter(s => s.id !== subtopic.id && (
      s.topic_id === subtopic.topic_id ||
      s.tags.some(t => subtopic.tags.includes(t))
    ))
    .slice(0, 5)
    .map(s => ({
      slug: s.slug, title: s.title, description: s.description,
      topic_slug: store.topics.find(x => x.id === s.topic_id)?.slug,
      template_slug: s.template_slug || store.templates.find(x => x.id === s.template_id)?.slug,
    }));

  res.json({
    subtopic: {
      id: subtopic.id, slug: subtopic.slug, title: subtopic.title, description: subtopic.description,
      tags: subtopic.tags, data: subtopic.data, metadata: subtopic.metadata,
      topic_id: subtopic.topic_id, topic_slug: topic?.slug, topic_title: topic?.title,
      template_id: subtopic.template_id, template_slug: subtopic.template_slug || template?.slug, template_name: template?.name,
    },
    related,
  });
});

export default router;
