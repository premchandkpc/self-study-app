import { CREATION_SCENARIOS } from './scenarios/creation';
import { PIPELINE_SCENARIOS } from './scenarios/pipeline';
import { FLATMAP_SCENARIOS } from './scenarios/flatmap';
import { LAZY_SCENARIOS } from './scenarios/lazy';
import { PARALLEL_SCENARIOS } from './scenarios/parallel';
import { COLLECTORS_SCENARIOS } from './scenarios/collectors';
import { REDUCE_SCENARIOS } from './scenarios/reduce';
import { EDGE_CASES_SCENARIOS } from './scenarios/edge-cases';

export const STREAM_SCENARIOS = [
  ...CREATION_SCENARIOS,
  ...PIPELINE_SCENARIOS,
  ...FLATMAP_SCENARIOS,
  ...LAZY_SCENARIOS,
  ...PARALLEL_SCENARIOS,
  ...COLLECTORS_SCENARIOS,
  ...REDUCE_SCENARIOS,
  ...EDGE_CASES_SCENARIOS,
];

export const STREAM_CATEGORIES = [
  { key: 'creation', label: 'Creation', icon: '🌱' },
  { key: 'pipeline', label: 'Pipeline', icon: '🔀' },
  { key: 'flatmap', label: 'FlatMap', icon: '📦' },
  { key: 'lazy', label: 'Lazy Eval', icon: '⏳' },
  { key: 'parallel', label: 'Parallel', icon: '⚡' },
  { key: 'collectors', label: 'Collectors', icon: '📥' },
  { key: 'reduce', label: 'Reduce', icon: '⚖️' },
  { key: 'edge', label: 'Edge Cases', icon: '⚠️' },
];
