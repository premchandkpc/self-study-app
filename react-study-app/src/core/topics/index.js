// Barrel file: re-exports all public APIs from topics system
// Drop-in replacement for ../constants/topics.js

export {
  // Maps and utilities
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
} from './topicMaps.js';

export {
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
} from './topicService.js';

export { slugify } from './topicUtils.js';
