const BASE = '/api';

export async function fetchMaps() {
  const res = await fetch(`${BASE}/maps`);
  return res.json();
}

export async function fetchTopic(slug) {
  const res = await fetch(`${BASE}/topics/${slug}`);
  if (!res.ok) throw new Error(`Topic ${slug} not found`);
  return res.json();
}

export async function fetchSubtopic(slug) {
  const res = await fetch(`${BASE}/subtopics/${slug}`);
  if (!res.ok) throw new Error(`Subtopic ${slug} not found`);
  return res.json();
}

export async function executeCode(code, input) {
  const res = await fetch(`${BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, input }),
  });
  return res.json();
}
