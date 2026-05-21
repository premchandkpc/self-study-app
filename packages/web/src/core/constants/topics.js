// Backward compatibility barrel: re-exports from ../topics/index.js
// After migration to PostgreSQL backend, use useTopicMapsContext() hook for maps data

export {
  slugify,
  buildTopicRoute,
  buildSubtopicRoute,
  buildSubtopicLearnRoute,
} from '../topics/index.js';
