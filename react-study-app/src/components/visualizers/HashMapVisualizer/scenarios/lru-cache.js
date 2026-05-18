import { snap } from './shared';

const CAPACITY = 3;
const OPERATIONS = [
  { op: 'put', key: 1, value: 10 },
  { op: 'put', key: 2, value: 20 },
  { op: 'put', key: 3, value: 30 },
  { op: 'get', key: 1 },
  { op: 'put', key: 4, value: 40 },
  { op: 'get', key: 2 },
  { op: 'put', key: 5, value: 50 },
];

function buildLRUSteps() {
  const steps = [];
  // Doubly linked list order: head = MRU, tail = LRU
  let dll = [];  // array of keys ordered MRU to LRU
  const cacheMap = {};
  const buckets = Array.from({ length: 5 }, () => []);

  const state = {
    dll: [],
    cacheMap: {},
    buckets: buckets.map((b) => [...b]),
    activeBucket: -1,
    vars: { capacity: CAPACITY, size: 0, key: -1, evicted: null },
    metrics: { hits: 0, misses: 0, evictions: 0 },
  };

  snap(steps, state, `LRU Cache capacity=${CAPACITY}. Head=MRU (Most Recently Used), Tail=LRU.`, 1);

  for (const { op, key, value } of OPERATIONS) {
    if (op === 'get') {
      state.vars = { capacity: CAPACITY, size: dll.length, key, evicted: null };

      if (cacheMap[key] !== undefined) {
        state.metrics.hits++;
        // Move to front (MRU)
        dll = [key, ...dll.filter((k) => k !== key)];
        state.dll = [...dll];
        state.vars = { capacity: CAPACITY, size: dll.length, key, evicted: null };
        snap(steps, state, `GET ${key}: HIT! value=${cacheMap[key]}. Move key ${key} to MRU (head).`, 4);
      } else {
        state.metrics.misses++;
        snap(steps, state, `GET ${key}: MISS. Key not in cache.`, 5);
      }
    } else {
      // PUT
      state.vars = { capacity: CAPACITY, size: dll.length, key, evicted: null };
      let evicted = null;

      if (cacheMap[key] !== undefined) {
        // Update existing
        cacheMap[key] = value;
        dll = [key, ...dll.filter((k) => k !== key)];
        state.dll = [...dll];
        state.cacheMap = { ...cacheMap };
        snap(steps, state, `PUT ${key}=${value}: already exists. Update & move to MRU.`, 8);
      } else {
        if (dll.length >= CAPACITY) {
          // Evict LRU (tail)
          evicted = dll[dll.length - 1];
          dll.pop();
          const evictBucket = evicted % buckets.length;
          buckets[evictBucket] = buckets[evictBucket].filter((e) => e.key !== String(evicted));
          delete cacheMap[evicted];
          state.vars = { capacity: CAPACITY, size: dll.length, key, evicted };
          state.dll = [...dll];
          state.cacheMap = { ...cacheMap };
          state.buckets = buckets.map((b) => [...b]);
          state.metrics.evictions++;
          snap(steps, state, `Cache full (size=${CAPACITY}). Evict LRU key ${evicted} from tail.`, 10);
        }

        // Insert new
        dll.unshift(key);
        cacheMap[key] = value;
        const bucket = key % buckets.length;
        buckets[bucket].push({ key: String(key), value });
        state.activeBucket = bucket;
        state.dll = [...dll];
        state.cacheMap = { ...cacheMap };
        state.buckets = buckets.map((b) => [...b]);
        state.vars = { capacity: CAPACITY, size: dll.length, key, evicted };
        snap(steps, state, `PUT ${key}=${value}: insert at MRU (head). Cache: [${dll.join(' → ')}].`, 11);
      }
    }
  }

  state.vars = { capacity: CAPACITY, size: dll.length, key: -1, evicted: null };
  snap(steps, state, `LRU done. Cache (MRU→LRU): [${dll.join(' → ')}]. Hits:${state.metrics.hits}, Evictions:${state.metrics.evictions}.`, 14);

  return steps;
}

const LRU_CODE = [
  'class LRUCache {',
  '  constructor(capacity) {',
  '    this.cap = capacity;',
  '    this.map = new Map(); // key → node',
  '    this.dll = new DLL(); // doubly linked list',
  '  }',
  '  get(key) {',
  '    if (!this.map.has(key)) return -1;',
  '    this.dll.moveToFront(this.map.get(key));',
  '    return this.map.get(key).value;',
  '  }',
  '  put(key, value) {',
  '    if (this.map.size >= this.cap)',
  '      this.map.delete(this.dll.removeTail().key); // evict LRU',
  '    const node = this.dll.addToFront(key, value);',
  '    this.map.set(key, node);',
  '  }',
  '}',
];

export default {
  id: 'lru-cache',
  label: 'LRU Cache',
  icon: '📦',
  build: buildLRUSteps,
  code: LRU_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'hits',      label: 'Hits',       max: 10, color: 'var(--node-visited)' },
    { key: 'misses',    label: 'Misses',     max: 5,  color: 'var(--node-active)', warn: 3 },
    { key: 'evictions', label: 'Evictions',  max: 5,  color: 'var(--pod-crash)' },
  ],
};
