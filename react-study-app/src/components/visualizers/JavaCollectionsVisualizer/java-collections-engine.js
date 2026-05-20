import { ARRAYLIST_SCENARIOS }  from './scenarios/arraylist';
import { LINKEDLIST_SCENARIOS } from './scenarios/linkedlist';
import { HASHMAP_SCENARIOS }    from './scenarios/hashmap';
import { HASHSET_SCENARIOS }    from './scenarios/hashset';
import { TREEMAP_SCENARIOS }    from './scenarios/treemap';
import { QUEUE_SCENARIOS }      from './scenarios/queue';
import { CONCURRENT_SCENARIOS } from './scenarios/concurrent';

export const JC_SCENARIOS = [
  ...ARRAYLIST_SCENARIOS,
  ...LINKEDLIST_SCENARIOS,
  ...HASHMAP_SCENARIOS,
  ...HASHSET_SCENARIOS,
  ...TREEMAP_SCENARIOS,
  ...QUEUE_SCENARIOS,
  ...CONCURRENT_SCENARIOS,
];

export const JC_COLLECTION_TYPES = [
  { key: 'arraylist',       label: 'ArrayList',       icon: '📋' },
  { key: 'linkedlist',      label: 'LinkedList',      icon: '🔗' },
  { key: 'hashmap',         label: 'HashMap',         icon: '🗺️' },
  { key: 'hashset',         label: 'HashSet',         icon: '🔵' },
  { key: 'treemap',         label: 'TreeMap',         icon: '🌲' },
  { key: 'priorityqueue',   label: 'PriorityQueue',   icon: '⛰️' },
  { key: 'arraydeque',      label: 'ArrayDeque',      icon: '🔄' },
  { key: 'concurrent',      label: 'Concurrent',      icon: '🔐' },
];

export const JC_CATEGORIES = [
  { key: 'flow',        label: 'Core Flows',   icon: '🔀' },
  { key: 'edge',        label: 'Edge Cases',   icon: '⚠️' },
  { key: 'concurrency', label: 'Concurrency',  icon: '🧵' },
  { key: 'exception',   label: 'Exceptions',   icon: '💥' },
];
