import { pool } from '../pool.js';

export async function buildAllMaps() {
  // Single query: topics + subtopics + tabs with aggregation
  const { rows } = await pool.query(`
    SELECT
      t.id, t.abbr, t.label, t.icon,
      t.color, t.description, t.objectives, t.key_topics,
      t.sort_order AS t_sort_order,
      s.id AS s_id, s.name AS s_name, s.slug, s.scenario_id, s.visualizer,
      s.explanation, s.use_cases, s.real_world, s.complexity,
      s.sort_order AS s_sort_order,
      json_agg(
        json_build_object(
          'name', tb.name,
          'explanation', tb.explanation,
          'useCases', tb.use_cases,
          'realWorld', tb.real_world,
          'complexity', tb.complexity
        ) ORDER BY tb.sort_order
      ) FILTER (WHERE tb.id IS NOT NULL) AS tabs
    FROM topics t
    LEFT JOIN subtopics s ON s.topic_id = t.id
    LEFT JOIN tabs tb ON tb.subtopic_id = s.id
    GROUP BY
      t.id, t.abbr, t.label, t.icon, t.color, t.description,
      t.objectives, t.key_topics, t.sort_order,
      s.id, s.name, s.slug, s.scenario_id, s.visualizer,
      s.explanation, s.use_cases, s.real_world, s.complexity, s.sort_order
    ORDER BY t.sort_order, s.sort_order
  `);

  // Build derived maps from flat query result
  const ABBR_MAP = {};
  const SLUG_MAP = {};
  const VISUALIZER_MAP = {};
  const VIZ_TYPE_TO_TOPIC = {};
  const SUBTOPIC_ROUTES = {};
  const SUBTOPIC_SCENARIO_ID = {};
  const TOPICS = [];

  // Group by topic first
  const topicMap = new Map();
  for (const row of rows) {
    if (!topicMap.has(row.id)) {
      topicMap.set(row.id, {
        id: row.id,
        abbr: row.abbr,
        label: row.label,
        icon: row.icon,
        meta: {
          color: row.color,
          desc: row.description,
          objectives: row.objectives,
          keyTopics: row.key_topics,
        },
        subtopics: [],
      });
    }

    if (row.s_id) {
      const subtopic = {
        name: row.s_name,
        slug: row.slug,
        scenarioId: row.scenario_id,
        visualizer: row.visualizer,
        explanation: row.explanation,
        useCases: row.use_cases,
        realWorld: row.real_world,
        complexity: row.complexity,
        topicId: row.id,
        topicAbbr: row.abbr,
        tabs: row.tabs && row.tabs.length > 0 ? row.tabs : undefined,
      };

      topicMap.get(row.id).subtopics.push(subtopic);

      // Build derived maps
      SLUG_MAP[`${row.abbr}:${row.slug}`] = subtopic;
      const key = `${row.id}:${row.s_name}`;
      VISUALIZER_MAP[key] = row.visualizer;
      VIZ_TYPE_TO_TOPIC[row.visualizer] = row.id;
      SUBTOPIC_ROUTES[key] = `/${row.abbr}/${row.slug}`;
      if (row.scenario_id) {
        SUBTOPIC_SCENARIO_ID[key] = row.scenario_id;
      }
    }
  }

  // Build ABBR_MAP and TOPICS
  for (const topic of topicMap.values()) {
    ABBR_MAP[topic.abbr] = topic;
    TOPICS.push(topic);
  }

  return {
    ABBR_MAP,
    SLUG_MAP,
    VISUALIZER_MAP,
    VIZ_TYPE_TO_TOPIC,
    SUBTOPIC_ROUTES,
    SUBTOPIC_SCENARIO_ID,
    TOPICS,
  };
}
