import { Router } from 'express';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../data');

function loadProblems() {
  return JSON.parse(readFileSync(resolve(DATA_DIR, 'playground.json'), 'utf-8'));
}

const router = Router();

router.get('/playground', (req, res) => {
  const problems = loadProblems();
  res.json(problems.map(p => ({
    slug: p.slug, title: p.title, description: p.description,
    tags: p.tags, difficulty: p.difficulty, topic: p.topic,
    testCount: p.testCases?.length || 0,
  })));
});

router.get('/playground/:slug', (req, res) => {
  const problems = loadProblems();
  const p = problems.find(x => x.slug === req.params.slug);
  if (!p) return res.status(404).json({ error: 'Problem not found' });
  res.json(p);
});

router.post('/playground/execute', (req, res) => {
  const { code, input } = req.body;
  try {
    const fn = new Function('input', code);
    const result = fn(input);
    res.json({ result, error: null });
  } catch (e) {
    res.json({ result: null, error: e.message });
  }
});

export default router;
