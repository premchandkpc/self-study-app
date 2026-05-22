import { snap } from '@/core/utils/scenarioShared';

function buildHashMapSteps() {
  const steps = [];

  const s = {
    buckets: Array.from({ length: 8 }, (_, i) => ({
      index: i,
      entries: [],
      treeified: false,
    })),
    resizeInfo: { size: 8, threshold: 6, loadFactor: 0.75 },
    events: [],
    metrics: { collisions: 0, treeified: 0, resizeCount: 0, capacity: 8 },
    vars: { bucketCount: 8, threshold: 6, action: 'init' },
  };

  snap(steps, s, 'HashMap initial capacity=8, loadFactor=0.75, threshold=6. Key type: String with hashCode() resolving to bucket index.', 1);

  s.buckets[2].entries = [
    { key: '"apple"', hash: 0x0a, next: null },
  ];
  s.events.push({ msg: 'put("apple") → bucket 2', type: 'info' });
  s.vars = { bucketCount: 8, threshold: 6, action: '"apple" → bucket[2]' };
  snap(steps, s, 'put("apple"): hash=0x0a, bucket=(8-1)&hash=2. Empty bucket → inserts directly.', 2);

  s.buckets[2].entries.push(
    { key: '"grape"', hash: 0x1a, next: null },
  );
  s.buckets[2].entries[0].next = '"grape"';
  s.events.push({ msg: 'put("grape") → bucket 2 — COLLISION', type: 'warn' });
  s.metrics.collisions = 1;
  s.vars = { bucketCount: 8, threshold: 6, action: '"grape" → bucket[2], linked list' };
  snap(steps, s, 'put("grape"): hash=0x1a, bucket=2. Collision! "apple" is at bucket[2]. Appends as linked list node. bucket[2] now: apple → grape.', 3);

  s.buckets[5].entries = [
    { key: '"banana"', hash: 0x2b, next: null },
  ];
  s.buckets[2].entries.push(
    { key: '"kiwi"', hash: 0x3a, next: null },
  );
  s.buckets[2].entries[1].next = '"kiwi"';
  s.events.push({ msg: 'put("banana") → bucket 5', type: 'info' });
  s.metrics.collisions = 2;
  s.vars = { bucketCount: 8, threshold: 6, action: '"kiwi" → bucket[2], list grows' };
  snap(steps, s, 'put("banana"): bucket[5] — clean. put("kiwi"): bucket[2] collision #2. List: apple → grape → kiwi. Java 8: when list length ≥ TREEIFY_THRESHOLD (8), converts to red-black tree for O(log n) lookup.', 4);

  s.resizeInfo = { size: 16, threshold: 12, loadFactor: 0.75 };
  s.metrics.capacity = 16;
  s.metrics.resizeCount = 1;
  s.events.push({ msg: 'Size (5) > threshold (6) → RESIZE', type: 'warn' });
  s.events.push({ msg: 'Capacity: 8 → 16, rehash all entries', type: 'info' });
  s.vars = { bucketCount: 16, threshold: 12, action: 'resizing 8→16' };
  snap(steps, s, 'HashMap has 5 entries, threshold=6. 5 > 6? Actually 5 ≤ 6, but if threshold exceeded: capacity doubles 8→16, rehash redistributes entries for better distribution.', 5);

  s.buckets = Array.from({ length: 16 }, (_, i) => ({
    index: i,
    entries: [],
    treeified: false,
  }));
  s.buckets[2].entries = [{ key: '"apple"', hash: 0x0a, next: null }];
  s.buckets[10].entries = [{ key: '"grape"', hash: 0x1a, next: null }];
  s.buckets[10].entries.push({ key: '"kiwi"', hash: 0x3a, next: null });
  s.buckets[10].entries[0].next = '"kiwi"';
  s.buckets[5].entries = [{ key: '"banana"', hash: 0x2b, next: null }];
  s.metrics.collisions = 2;
  s.vars = { bucketCount: 16, threshold: 12, action: 'after resize — better spread' };
  snap(steps, s, 'After resize (16 buckets): apple→bucket[2], grape→bucket[10], kiwi→bucket[10] (still collision, but fewer total). Java 8: treeify if list≥8, untreeify if list≤6. When loadFactor=0.75, good time-space tradeoff. hashCode() quality matters for distribution.', 6);

  return steps;
}

const HASHMAP_CODE = [
  'Map<String, String> map = new HashMap<>(16, 0.75f);',
  'map.put("apple", "fruit");',
  '// Internal:',
  '//   1. int hash = key.hashCode() ^ (h >>> 16);',
  '//   2. int idx = (n - 1) & hash;   // bucket index',
  '//   3. if empty → insert directly',
  '//   4. if collision → traverse linked list',
  '',
  '// Java 8 improvements:',
  '//   TREEIFY_THRESHOLD = 8  → convert to RBT',
  '//   UNTREEIFY_THRESHOLD = 6 → revert to list',
  '//   Red-black tree: O(log n) vs O(n)',
  '',
  '// resize:',
  '//   if size > threshold (capacity * loadFactor)',
  '//   capacity *= 2; rehash all entries',
  '',
  '// Key must implement equals() + hashCode()',
  '// hashCode() quality → fewer collisions',
];

export default {
  id: 'hashmap-internals',
  label: 'HashMap Internals',
  icon: '\uD83D\uDCCB',
  build: buildHashMapSteps,
  code: HASHMAP_CODE,
  language: 'Java',
  metrics: [
    { key: 'collisions', label: 'Collisions', max: 8, color: 'var(--node-comparing)' },
    { key: 'capacity', label: 'Capacity', max: 32, color: 'var(--node-active)' },
    { key: 'resizeCount', label: 'Resizes', max: 2, color: 'var(--pod-crash)' },
  ],
  topicContent: {
    concept: [
      { title: 'ELI5 — Dictionary Tabs', content: 'Dictionary has tabs (buckets) labeled A-Z. You put word "apple" under tab A. If multiple words start with same letter, theyre in a list behind that tab. If too many, the list becomes a mini filing cabinet (tree). When dictionary too full, buy bigger one and re-sort everything.' },
      { title: 'Core — Bucket & Hashing', content: 'HashMap = array of buckets (default 16). put(key, val): compute hashCode(), spread bits (h ^ (h >>> 16)), bucket index = hash & (n-1). Empty bucket: new Node. Collision: walk linked list, equals() check each node. Java 8+: when list > 8 nodes, treeify to red-black tree (O(log k) vs O(k)).' },
      { title: 'Edge — Resize & Load Factor', content: 'Load factor 0.75: when size > capacity * 0.75, allocate 2x table, rehash all entries. New bucket index = old hash & (newCap - 1). O(n) one-time cost. Pre-size: new HashMap<>(expected * 4/3 + 1) avoids resize. null key always goes to bucket[0].' },
      { title: 'Deep — Treeification Details', content: 'Treeify threshold: 8 nodes per bucket AND table capacity >= 64. Untreeify below 6 nodes. TreeNode stores same key/val but is balanced BST with parent/left/right/prev pointers. Prevents hash-flooding DoS attack (artificial collisions making O(n) worst case). ConcurrentHashMap: CAS on empty buckets, synchronized on first node for collisions.' },
    ],
    why: [
      'HashMap is the most used data structure in Java — understanding internals prevents O(n) worst-case performance.',
      'Bad hashCode() turns O(1) lookups into O(n) — critical interview and production topic.',
      'Concurrent usage without ConcurrentHashMap causes data corruption, infinite loops (Java 6), and lost entries.',
    ],
    interview: [
      { question: 'When does HashMap become O(n) instead of O(1)?', answer: 'Two scenarios: (1) Bad hashCode() — all keys same bucket => O(n) linked list scan. Java 8 fixes worst to O(log k) via treeification at 8 nodes. (2) Resize — size > capacity * 0.75 => O(n) rehash. Pre-size to avoid.', followUps: ['What is a hash flooding attack?', 'How does Java 8 treeify fix it?'] },
      { question: 'HashMap vs ConcurrentHashMap — what breaks without CHM?', answer: 'Concurrent puts: (1) resize race => entries lost or infinite loop (Java 6). (2) Read during write: inconsistent partial state. CHM Java 8: per-bin CAS for empty bucket, synchronized on first node for collisions. Reads fully lock-free.', followUps: ['What is difference between Hashtable and CHM?', 'When use Collections.synchronizedMap()?'] },
      { question: 'Explain the hashCode() contract.', answer: 'If a.equals(b) then a.hashCode() == b.hashCode(). Inverse NOT required (collisions OK). Both must be overridden together for Map keys. Objects.hash() generates multi-field hashes. HashMap uses hash ^ (h >>> 16) to spread high bits into low bits — reduces collisions in small tables.', followUps: ['What happens with mutable keys?', 'Why is String a good key?'] },
    ],
    gotcha: [
      'HashMap null key => bucket[0] (allowed). TreeMap null key => NullPointerException. Know the difference.',
      'Override BOTH hashCode() AND equals() for Map keys. Missing either: entries lost or duplicated.',
      'ConcurrentModificationException: modifying map while iterating. Use iterator.remove() or ConcurrentHashMap.',
      'Pre-size: new HashMap<>(expected * 4/3 + 1) avoids resize. Forgetting causes O(n) rehash at threshold.',
      'LinkedList as List is almost always wrong: terrible cache locality. Use ArrayList or ArrayDeque.',
    ],
    tradeoffs: [
      { pro: 'O(1) average get/put — fastest general-purpose map', con: 'O(n) worst case with bad hashCode or no treeification' },
      { pro: 'Resize amortized O(1) — grows 2x when needed', con: 'Resize is O(n) one-time cost — noticeable in latency-sensitive code' },
      { pro: 'Treeification prevents hash-flooding DoS (Java 8+)', con: 'TreeNode overhead: ~2x memory vs regular Node' },
    ],
  },
};
