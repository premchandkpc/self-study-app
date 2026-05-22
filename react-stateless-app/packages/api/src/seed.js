import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../..', 'data');

function loadJson(filename) {
  return JSON.parse(readFileSync(resolve(DATA_DIR, filename), 'utf-8'));
}

const topicsRaw = loadJson('topics.json');
const templatesRaw = loadJson('templates.json');
const subtopicsRaw = loadJson('subtopics.json');

// Build lookup maps
const tMap = {};
topicsRaw.forEach((t, i) => { tMap[t.slug] = i + 1; });
const tmMap = {};
templatesRaw.forEach((t, i) => { tmMap[t.slug] = i + 1; });

const topics = topicsRaw.map((t, i) => ({
  id: i + 1, slug: t.slug, title: t.title, description: t.description,
  icon: t.icon, config: t.config || {},
}));

const templates = templatesRaw.map((t, i) => ({
  id: i + 1, slug: t.slug, name: t.name, description: t.description,
  config: t.config || {},
}));

const subtopics = subtopicsRaw.map((s, i) => ({
  id: i + 1,
  slug: s.slug,
  topic_id: tMap[s.topic_slug],
  template_id: tmMap[s.template_slug],
  title: s.title,
  description: s.description,
  tags: s.tags || [],
  data: s.data || {},
  metadata: s.metadata || {},
  sort_order: s.sort_order || 0,
}));

const store = { topics, templates, subtopics };
writeFileSync(resolve(DATA_DIR, 'store.json'), JSON.stringify(store, null, 2));
console.log(`Seeded: ${topics.length} topics, ${templates.length} templates, ${subtopics.length} subtopics`);
