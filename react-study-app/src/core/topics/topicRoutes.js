// Route helpers - centralized navigation logic
// Fixes: TopicsList route format, SubtopicCard scenarioId, VIZ_TYPE_TO_TOPIC inline logic

import { ABBR_MAP, VIZ_TYPE_TO_TOPIC, TOPIC_DEFS } from './topicMaps.js';
import { slugify } from './topicUtils.js';

export { slugify };

export function buildTopicRoute(abbr) {
  return `/${abbr}`;
}

export function buildSubtopicRoute(abbr, slug) {
  return `/${abbr}/${slug}`;
}

export function buildSubtopicLearnRoute(abbr, slug) {
  return `/${abbr}/${slug}#learn`;
}

export function getSimulateRouteForVizType(vizType) {
  if (!vizType) return null;
  const topicId = VIZ_TYPE_TO_TOPIC[vizType];
  if (!topicId) return null;
  const topic = TOPIC_DEFS.find(t => t.id === topicId);
  if (!topic) return null;
  return buildTopicRoute(topic.abbr);
}

export function buildCollectionSimulateRoute(vizType) {
  return getSimulateRouteForVizType(vizType);
}
