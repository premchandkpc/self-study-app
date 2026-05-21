// After migration to PostgreSQL backend + React Query context,
// all topic data operations go through useTopicMapsContext() hook
// This file is kept for backwards compatibility but all functions are deprecated

import { slugify } from './topicUtils.js';

export { slugify };

// Deprecated: Use useTopicMapsContext() instead in React components
