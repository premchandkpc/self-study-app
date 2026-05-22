const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../../../react-stateless-app/data/subtopics.json');
const raw = JSON.parse(fs.readFileSync(src, 'utf-8'));

const problems = raw.map(p => ({
  slug: p.slug,
  title: p.title,
  description: p.data?.left?.data?.content || p.description,
  tags: p.tags || [],
  difficulty: p.tags?.includes('hard') ? 'hard' : p.tags?.includes('medium') ? 'medium' : 'easy',
  topic: p.topic_slug,
  starterCode: p.data?.right?.data?.starterCode || '',
  testCases: (p.data?.right?.data?.tests || []).map(t => ({
    input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input),
    expected: typeof t.expected === 'string' ? t.expected : JSON.stringify(t.expected),
  })),
}));

const out = path.resolve(__dirname, 'playground.json');
fs.writeFileSync(out, JSON.stringify(problems, null, 2));
console.log('Converted ' + problems.length + ' problems');
