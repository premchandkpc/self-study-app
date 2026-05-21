// Utility functions for topics system

export function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function derive(topicDefs, prop) {
  const result = {};
  for (const t of topicDefs) {
    for (const s of (t.subtopics || [])) {
      const key = `${t.id}:${s.name}`;
      if (prop === 'subtopic') {
        result[key] = s;
      } else if (prop === 'visualizer') {
        result[key] = s.visualizer;
      } else if (prop === 'route') {
        const slug = s.scenarioId || slugify(s.name);
        result[key] = t.abbr ? `/${t.abbr}/${slug}` : `/topics/${t.id}`;
      } else if (prop === 'scenarioId') {
        result[key] = s.scenarioId;
      }
    }
  }
  return result;
}
