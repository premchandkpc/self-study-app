// After migration to PostgreSQL + API backend, all maps come from /api/maps
// This module now just re-exports utilities and hooks

export { useTopicMaps } from '../hooks/useTopicMaps.js';
export { slugify } from './topicUtils.js';

// Note: ABBR_MAP, SLUG_MAP, VISUALIZER_MAP, etc. are now fetched via useTopicMapsContext()
// from packages/api/src/db/queries/maps.js at runtime
