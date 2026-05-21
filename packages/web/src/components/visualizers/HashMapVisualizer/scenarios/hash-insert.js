import { snap } from '@/core/utils/scenarioShared';

const ENTRIES = [
  { key: 'apple', value: 1 },
  { key: 'banana', value: 2 },
  { key: 'cat', value: 3 },
  { key: 'dog', value: 4 },
  { key: 'ant', value: 5 },
];
const SIZE = 7;

function hashFn(key, size) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % size;
  return h;
}

function buildHashInsertSteps() {
  const steps = [];
  const buckets = Array.from({ length: SIZE }, () => []);

  const state = {
    buckets: buckets.map((b) => [...b]),
    activeBucket: -1,
    vars: { key: '', hash: -1, bucket: -1, size: SIZE, loadFactor: '0.00' },
    metrics: { inserted: 0, collisions: 0, loadFactor: 0 },
  };

  snap(steps, state, `HashMap with ${SIZE} buckets. Hash fn: sum(charCodes * 31) % ${SIZE}.`, 1);

  for (const { key, value } of ENTRIES) {
    const h = hashFn(key, SIZE);
    state.activeBucket = h;
    state.vars = { key, value, hash: h, bucket: h, size: SIZE, collision: false, loadFactor: (state.metrics.inserted / SIZE).toFixed(2) };
    snap(steps, state, `hash("${key}") = ${h}. Check bucket ${h}.`, 3);

    const collision = buckets[h].length > 0;
    if (collision) {
      state.metrics.collisions++;
      state.vars = { key, value, hash: h, bucket: h, size: SIZE, collision: true, chainLength: buckets[h].length, loadFactor: (state.metrics.inserted / SIZE).toFixed(2) };
      snap(steps, state, `Bucket ${h} already has ${buckets[h].length} entry. Collision! Chain it.`, 5);
    }

    buckets[h].push({ key, value });
    state.buckets = buckets.map((b) => [...b]);
    state.metrics.inserted++;
    state.vars = { key, value, hash: h, bucket: h, size: SIZE, collision, loadFactor: (state.metrics.inserted / SIZE).toFixed(2) };
    snap(steps, state, `Inserted "${key}:${value}" at bucket ${h}${collision ? ' (chained)' : ''}.`, 6);
  }

  state.activeBucket = -1;
  state.vars = { key: 'done', hash: -1, bucket: -1, size: SIZE, loadFactor: (ENTRIES.length / SIZE).toFixed(2) };
  snap(steps, state, `All keys inserted. Load factor = ${(ENTRIES.length / SIZE).toFixed(2)}. ${state.metrics.collisions} collision(s).`, 8);

  return steps;
}

const HASH_CODE = [
  'class HashMap {',
  '  constructor(size = 7) {',
  '    this.buckets = Array(size).fill(null).map(() => []);',
  '  }',
  '  hash(key) { return sumCharCodes(key) % this.size; }',
  '  put(key, value) {',
  '    const b = this.hash(key);',
  '    const chain = this.buckets[b];',
  '    chain.push({ key, value }); // chaining',
  '  }',
  '  get(key) {',
  '    return this.buckets[this.hash(key)]',
  '      .find(e => e.key === key)?.value;',
  '  }',
  '}',
];

export default {
  id: 'hash-insert',
  label: 'HashMap Put/Get',
  icon: '🗂️',
  build: buildHashInsertSteps,
  code: HASH_CODE,
  language: 'JavaScript',
  metrics: [
    { key: 'inserted',   label: 'Inserted',    max: 7,   color: 'var(--node-visited)' },
    { key: 'collisions', label: 'Collisions',  max: 5,   color: 'var(--pod-crash)', warn: 2 },
    { key: 'loadFactor', label: 'Load Factor', max: 1,   color: 'var(--node-comparing)', warn: 0.7, critical: 0.9 },
  ],
};
