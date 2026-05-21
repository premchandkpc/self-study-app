// Clean service API for topics system
// Decouples components from internal map structure

import {
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
import { slugify } from './topicUtils.js';

export function getTopicById(id) {
  return TOPICS.find(t => t.id === id);
}

export function getTopicByAbbr(abbr) {
  return ABBR_MAP[abbr];
}

export function getSubtopicBySlug(abbr, slug) {
  return SLUG_MAP[`${abbr}:${slug}`];
}

export function getAllTopics() {
  return TOPICS;
}

export function getTopicMeta(id) {
  return TOPIC_META[id];
}

export function getTopicExplanations(id) {
  return TOPIC_EXPLANATIONS[id];
}

export function getVisualizerFor(abbr, slug) {
  const key = `${abbr}:${slug}`;
  if (!SLUG_MAP[key]) return null;
  return SLUG_MAP[key].visualizer;
}

export function getSimulateRoute(vizType) {
  // Get topic id from visualizer type, then get topic's abbr
  const topicId = VIZ_TYPE_TO_TOPIC[vizType];
  if (!topicId) return null;
  const topic = getTopicById(topicId);
  if (!topic) return null;
  return `/${topic.abbr}`;
}

export function buildTopicRoute(abbr) {
  return `/${abbr}`;
}

export function buildSubtopicRoute(abbr, slug) {
  return `/${abbr}/${slug}`;
}

export function buildSubtopicLearnRoute(abbr, slug) {
  return `/${abbr}/${slug}#learn`;
}

export function getSubtopicRoute(topicId, subtopicName) {
  const key = `${topicId}:${subtopicName}`;
  return SUBTOPIC_ROUTES[key];
}

export function getSubtopicScenarioId(topicId, subtopicName) {
  const key = `${topicId}:${subtopicName}`;
  return SUBTOPIC_SCENARIO_ID[key];
}

// Helper: get full subtopic definition
export function getSubtopicDef(topicId, subtopicName) {
  const topic = TOPIC_DEFS.find(t => t.id === topicId);
  if (!topic) return null;
  return topic.subtopics?.find(s => s.name === subtopicName);
}
