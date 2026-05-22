import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/maps', (req, res) => {
  const store = getDb();

  const slugMap = {};
  for (const s of store.subtopics) {
    const t = store.topics.find(x => x.id === s.topic_id);
    slugMap[`${t?.slug}:${s.slug}`] = {
      template: s.template_slug || (store.templates.find(x => x.id === s.template_id)?.slug),
      title: s.title,
    };
  }

  const templateMap = {};
  for (const t of store.templates) {
    templateMap[t.slug] = true;
  }

  res.json({
    topics: store.topics.map(t => ({ slug: t.slug, title: t.title, description: t.description, icon: t.icon, config: t.config })),
    templates: store.templates.map(t => ({ slug: t.slug, name: t.name, description: t.description, config: t.config })),
    subtopics: store.subtopics.map(s => ({
      slug: s.slug, title: s.title, description: s.description, tags: s.tags, sort_order: s.sort_order,
      topic_slug: store.topics.find(x => x.id === s.topic_id)?.slug,
      template_slug: s.template_slug || store.templates.find(x => x.id === s.template_id)?.slug,
    })),
    slugMap,
    templateMap,
  });
});

export default router;
