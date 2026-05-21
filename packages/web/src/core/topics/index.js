// After migration to PostgreSQL + React Query, topics data comes from useTopicMapsContext()
// This barrel maintains some backwards-compatible exports for utilities only

export { slugify } from './topicUtils.js';

export {
  buildTopicRoute,
  buildSubtopicRoute,
  buildSubtopicLearnRoute,
} from './topicRoutes.js';

export { useTopicMaps } from '../hooks/useTopicMaps.js';
export { useSubtopic } from '../hooks/useSubtopic.js';

// Deprecated: Maps like TOPICS, ABBR_MAP, SLUG_MAP, etc. now come from useTopicMapsContext()
// All other functions from topicService.js are deprecated - use context hooks instead
