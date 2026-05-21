// Barrel re-export: topics.js now imports from ../topics/
// This maintains backward compatibility while allowing the split structure to exist
// All existing imports "from './topics'" continue to work without changes

export {
  // Maps
  TOPICS,
  TOPIC_DEFS,
  TOPIC_META,
  VISUALIZER_MAP,
  VIZ_TYPE_TO_TOPIC,
  SUBTOPIC_ROUTES,
  SUBTOPIC_SCENARIO_ID,
  ABBR_MAP,
  SLUG_MAP,
  TOPIC_EXPLANATIONS,

  // Service API
  getTopicById,
  getTopicByAbbr,
  getSubtopicBySlug,
  getAllTopics,
  getTopicMeta,
  getTopicExplanations,
  getVisualizerFor,
  getSimulateRoute,
  buildTopicRoute,
  buildSubtopicRoute,
  buildSubtopicLearnRoute,
  getSubtopicRoute,
  getSubtopicScenarioId,
  getSubtopicDef,

  // Utils
  slugify,
} from '../topics/index.js';
