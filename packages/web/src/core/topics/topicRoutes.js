// Route helpers - centralized navigation logic

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

// Note: getSimulateRouteForVizType moved to components that have context access
// Example: CollectionDetail.jsx uses VIZ_TYPE_TO_TOPIC + ABBR_MAP from useTopicMapsContext()
