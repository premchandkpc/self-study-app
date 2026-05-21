import { pool } from '../pool.js';

export async function getTopicList() {
  const { rows } = await pool.query(`
    SELECT t.id, t.abbr, t.label, t.icon,
           COUNT(s.id)::int AS subtopic_count,
           COALESCE(json_agg(s.name ORDER BY s.sort_order), '[]'::json) AS subtopic_names
    FROM topics t
    LEFT JOIN subtopics s ON s.topic_id = t.id
    GROUP BY t.id, t.abbr, t.label, t.icon, t.sort_order
    ORDER BY t.sort_order
  `);
  return rows;
}

export async function getTopicByAbbr(abbr) {
  const { rows: [topic] } = await pool.query(
    `SELECT id, abbr, label, icon, color, description, objectives, key_topics
     FROM topics WHERE abbr = $1`,
    [abbr]
  );
  if (!topic) return null;

  const { rows: subtopics } = await pool.query(
    `SELECT name, slug, scenario_id, visualizer
     FROM subtopics WHERE topic_id = $1 ORDER BY sort_order`,
    [topic.id]
  );

  return {
    id: topic.id,
    abbr: topic.abbr,
    label: topic.label,
    icon: topic.icon,
    meta: {
      color: topic.color,
      desc: topic.description,
      objectives: topic.objectives,
      keyTopics: topic.key_topics,
    },
    subtopics: subtopics.map(s => ({
      name: s.name,
      slug: s.slug,
      scenarioId: s.scenario_id,
      visualizer: s.visualizer,
    })),
  };
}
