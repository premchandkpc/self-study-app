import { pool } from '../pool.js';

export async function getSubtopicBySlug(abbr, slug) {
  const { rows: [row] } = await pool.query(`
    SELECT
      s.id, s.name, s.slug, s.scenario_id, s.visualizer,
      s.explanation, s.use_cases, s.real_world, s.complexity,
      t.id AS topic_id, t.abbr AS topic_abbr
    FROM subtopics s
    JOIN topics t ON t.id = s.topic_id
    WHERE t.abbr = $1 AND s.slug = $2
  `, [abbr, slug]);

  if (!row) return null;

  const { rows: tabs } = await pool.query(
    `SELECT name, explanation, use_cases, real_world, complexity
     FROM tabs WHERE subtopic_id = $1 ORDER BY sort_order`,
    [row.id]
  );

  return {
    name: row.name,
    slug: row.slug,
    scenarioId: row.scenario_id,
    visualizer: row.visualizer,
    topicId: row.topic_id,
    topicAbbr: row.topic_abbr,
    explanation: row.explanation,
    useCases: row.use_cases,
    realWorld: row.real_world,
    complexity: row.complexity,
    tabs: tabs.length ? tabs.map(t => ({
      name: t.name,
      explanation: t.explanation,
      useCases: t.use_cases,
      realWorld: t.real_world,
      complexity: t.complexity,
    })) : undefined,
  };
}

export async function getSubtopicsForTopic(topicId) {
  const { rows } = await pool.query(
    `SELECT id, name, slug, scenario_id, visualizer, explanation, use_cases, real_world, complexity
     FROM subtopics WHERE topic_id = $1 ORDER BY sort_order`,
    [topicId]
  );

  return rows.map(s => ({
    name: s.name,
    slug: s.slug,
    scenarioId: s.scenario_id,
    visualizer: s.visualizer,
    explanation: s.explanation,
    useCases: s.use_cases,
    realWorld: s.real_world,
    complexity: s.complexity,
  }));
}
