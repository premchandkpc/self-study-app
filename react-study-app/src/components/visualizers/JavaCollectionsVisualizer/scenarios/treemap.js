import { snap } from '@/core/utils/scenarioShared';

let _nid = 0;
function makeNode(key, val) { return { id: _nid++, key, val, left: null, right: null, state: 'idle', height: 0 }; }
function makeTM() {
  _nid = 0;
  return { collectionType: 'treemap', nodes: [], root: null, size: 0, comparePath: [], ops: [], exception: null };
}

function tmInsert(s, key, val) {
  const newNode = makeNode(key, val);
  if (s.root === null) {
    s.root = newNode.id; s.nodes = [newNode]; s.size++;
    s.ops = [...s.ops, { msg: `put(${key},${val}) → root`, type: 'ok' }].slice(-5);
    return newNode.id;
  }
  // BST insert (simplified, not full RB)
  const path = [];
  const findInsert = (nodeId, key) => {
    const node = s.nodes.find(n => n.id === nodeId);
    if (!node) return null;
    path.push(nodeId);
    if (key < node.key) {
      if (node.left === null) { node.left = newNode.id; return newNode.id; }
      return findInsert(node.left, key);
    } else if (key > node.key) {
      if (node.right === null) { node.right = newNode.id; return newNode.id; }
      return findInsert(node.right, key);
    } else { node.val = val; return node.id; } // update
  };
  const inserted = findInsert(s.root, key);
  if (!s.nodes.find(n => n.id === newNode.id)) s.nodes = [...s.nodes, newNode];
  s.comparePath = [...path];
  s.size++;
  s.ops = [...s.ops, { msg: `put(${key},${val}) → depth ${path.length}`, type: 'ok' }].slice(-5);
  return inserted;
}

function resetTM(s) { s.nodes = s.nodes.map(n => ({ ...n, state: 'idle' })); s.comparePath = []; }

// ── Flow: insert BST, traversal, floor/ceiling ────────────────────────────────
function buildFlowBasic() {
  _nid = 0;
  const steps = [];
  const s = makeTM();
  snap(steps, s, 'TreeMap created. Red-Black Tree internally. Sorted by natural key order (or Comparator). O(log n) put/get.', 0);

  const inserts = [[50, 'fifty'], [30, 'thirty'], [70, 'seventy'], [20, 'twenty'], [40, 'forty'], [60, 'sixty'], [80, 'eighty']];
  for (const [k, v] of inserts) {
    tmInsert(s, k, v);
    s.nodes = s.nodes.map(n => ({
      ...n, state: s.comparePath.includes(n.id) ? 'comparing' : (n.key === k ? 'new' : 'idle')
    }));
    snap(steps, s, `put(${k}, "${v}"). BST path depth=${s.comparePath.length}. Red-Black rotations maintain balance.`, 1);
    resetTM(s);
  }

  // get
  const getKey = 40;
  const getPath = [];
  let cur = s.root;
  while (cur !== null) {
    const node = s.nodes.find(n => n.id === cur);
    if (!node) break;
    getPath.push(cur);
    if (getKey === node.key) break;
    cur = getKey < node.key ? node.left : node.right;
  }
  s.nodes = s.nodes.map(n => ({ ...n, state: getPath.includes(n.id) ? 'comparing' : 'idle' }));
  snap(steps, s, `get(${getKey}). BST search: comparisons = ${getPath.length}. O(log n). Root → compare → left/right.`, 2);
  resetTM(s);

  // floorKey / ceilingKey
  s.nodes = s.nodes.map(n => ({ ...n, state: n.key <= 45 && n.key >= 35 ? 'active' : 'idle' }));
  snap(steps, s, 'floorKey(45) → 40 (largest key ≤ 45). ceilingKey(45) → 50. headMap(50) → [20,30,40]. tailMap(50) → [50,60,70,80]. All O(log n).', 3);
  resetTM(s);

  // sorted iteration
  const sorted = s.nodes.slice().sort((a, b) => a.key - b.key);
  for (const n of sorted) {
    s.nodes = s.nodes.map(x => ({ ...x, state: x.id === n.id ? 'active' : x.key < n.key ? 'visited' : 'idle' }));
    snap(steps, s, `In-order traversal: visit key=${n.key}. TreeMap iterates in sorted order. O(n) total.`, 4);
  }
  resetTM(s);
  snap(steps, s, 'TreeMap: sorted iteration, floor/ceiling, range views. Tradeoff vs HashMap: O(log n) vs O(1), but sorted.', 5);
  return steps;
}

// ── Edge: null key, large n, custom comparator ────────────────────────────────
function buildEdgeCases() {
  _nid = 0;
  const steps = [];
  const s = makeTM();

  for (const k of [5, 3, 7, 1, 4]) { tmInsert(s, k, k * 10); resetTM(s); }
  snap(steps, s, 'TreeMap edge cases: null key behavior, reverse order, custom Comparator.', 0);

  // null key attempt
  snap(steps, s, 'Attempt: treeMap.put(null, "val"). TreeMap uses compareTo() to find position. null.compareTo(key) → NPE!', 1);
  s.exception = { type: 'NullPointerException', msg: 'key cannot be null when using natural ordering' };
  snap(steps, s, '💥 NullPointerException: TreeMap with natural ordering CANNOT have null keys. HashMap allows null key. LinkedHashMap allows null. TreeMap: NEVER null key.', 2);

  s.exception = null;
  s.ops = [
    { msg: 'Comparator.reverseOrder() → descending', type: 'ok' },
    { msg: 'Custom: TreeMap<>(Comparator.comparing(...))', type: 'ok' },
  ];
  snap(steps, s, 'Custom ordering: new TreeMap<>(Comparator.reverseOrder()) for descending. new TreeMap<>((a,b) -> b.length()-a.length()) for string-length ordering.', 3);

  // subMap / headMap views
  s.nodes = s.nodes.map(n => ({ ...n, state: n.key >= 3 && n.key <= 5 ? 'window' : 'idle' }));
  snap(steps, s, 'subMap(3,true,5,true) = {3,4,5} — range view. Backed by original: mutations in subMap reflect in TreeMap.', 4);

  resetTM(s);
  s.ops.push({ msg: 'firstKey()/lastKey() O(log n)', type: 'ok' });
  snap(steps, s, 'firstKey()=1, lastKey()=7. pollFirstEntry() / pollLastEntry() removes and returns. NavigableMap interface: lower/floor/ceiling/higher(key).', 5);
  return steps;
}

// ── Concurrency: structural modification during iteration ─────────────────────
function buildConcurrencyIssues() {
  _nid = 0;
  const steps = [];
  const s = makeTM();
  for (const k of [10, 20, 30, 40]) { tmInsert(s, k, k); resetTM(s); }
  s.ops = [];

  s.threads = [
    { id: 'T1', name: 'Thread-1', state: 'running', action: 'iterating keySet()' },
    { id: 'T2', name: 'Thread-2', state: 'waiting', action: 'idle' },
  ];
  snap(steps, s, 'TreeMap: NOT thread-safe. T1 iterating, T2 will modify. Even reads can be inconsistent under concurrent modification.', 0);

  s.threads[0].action = 'iterator.next() → 10';
  s.nodes = s.nodes.map(n => ({ ...n, state: n.key === 10 ? 'active' : 'idle' }));
  snap(steps, s, 'T1: iterator.next() → 10. Iterator captured modCount=0. Cursor positioned in tree.', 1);

  s.threads[1].state = 'running'; s.threads[1].action = 'put(25, v)';
  tmInsert(s, 25, 250);
  s.ops = [{ msg: 'T2: put(25) → tree rotation, modCount++', type: 'warn' }];
  snap(steps, s, 'T2: put(25, 250). Red-Black rebalancing may trigger rotations. Tree structure changed. Iterator state invalidated.', 2);

  s.threads[0].action = 'next() → CME!'; s.threads[1].state = 'idle';
  s.exception = { type: 'ConcurrentModificationException', msg: 'Structural modification (incl. RB rotation) during iteration' };
  s.nodes = s.nodes.map(n => ({ ...n, state: 'error' }));
  snap(steps, s, '💥 CME! TreeMap iterator fail-fast. Rotations count as structural modifications. Iterator cursor may point to wrong node after rebalancing.', 3);

  s.exception = null; resetTM(s);
  s.ops = [
    { msg: 'Fix: ConcurrentSkipListMap (sorted, thread-safe)', type: 'ok' },
    { msg: 'Fix: Collections.synchronizedSortedMap()', type: 'ok' },
  ];
  snap(steps, s, 'Thread-safe sorted maps: ConcurrentSkipListMap (lock-free, sorted, O(log n)). Collections.synchronizedSortedMap() for coarse sync. ConcurrentHashMap for unsorted concurrent map.', 4);
  return steps;
}

// ── Exception: ClassCastException, compareTo contract ─────────────────────────
function buildExceptions() {
  _nid = 0;
  const steps = [];
  const s = makeTM();

  snap(steps, s, 'TreeMap exception scenarios: ClassCastException, Comparable contract violation, compareTo inconsistency.', 0);

  for (const k of [1, 2, 3]) { tmInsert(s, k, k); resetTM(s); }
  snap(steps, s, 'TreeMap<Integer, String> with Integer keys. Adding String key → compareTo(Integer, String) fails.', 1);
  s.exception = { type: 'ClassCastException', msg: 'class String cannot be cast to class Integer' };
  snap(steps, s, '💥 ClassCastException: TreeMap<Integer,V>.put("hello", v). compareTo(Integer, String) → ClassCastException. All keys must be same comparable type.', 2);

  s.exception = null; resetTM(s);
  s.ops = [
    { msg: 'compareTo violation: inconsistent with equals', type: 'warn' },
  ];
  snap(steps, s, 'compareTo contract violation: if a.compareTo(b)==0, should have a.equals(b)==true. BigDecimal violates this: 1.0.compareTo(1.00)==0 but 1.0.equals(1.00)==false. TreeMap treats 1.0 and 1.00 as same key, HashMap treats as different.', 3);

  s.nodes = s.nodes.map(n => ({ ...n, state: 'idle' }));
  s.ops = [
    { msg: 'Tip: check if Comparable matches equals()', type: 'ok' },
    { msg: 'provide consistent Comparator explicitly', type: 'ok' },
  ];
  snap(steps, s, 'Best practice: compareTo==0 ↔ equals()==true. If using BigDecimal as TreeMap key, pass explicit Comparator. If using String, case sensitivity matters in compareTo.', 4);
  return steps;
}

export const TREEMAP_SCENARIOS = [
  { id: 'tm-flow', label: 'BST Insert + floor/ceiling', icon: '🌲', collectionType: 'treemap', category: 'flow', build: buildFlowBasic, code: ['TreeMap<K,V> map = new TreeMap<>();', 'map.put(key, val);      // O(log n) BST insert', 'map.floorKey(45);       // largest key ≤ 45', 'map.subMap(lo,hi);      // range view'], language: 'Java' },
  { id: 'tm-edge', label: 'Null Key + Custom Comparator', icon: '⚠️', collectionType: 'treemap', category: 'edge', build: buildEdgeCases, code: ['map.put(null, v);  // 💥 NPE! No null keys', 'new TreeMap<>(Comparator.reverseOrder())', 'map.subMap(lo, hi); // backed range view', 'map.pollFirstEntry(); // remove+return min'], language: 'Java' },
  { id: 'tm-concurrency', label: 'CME + RB Rotation Race', icon: '🧵', collectionType: 'treemap', category: 'concurrency', build: buildConcurrencyIssues, code: ['// NOT thread-safe — rotations = structural mod', 'SortedMap<K,V> safe = Collections.synchronizedSortedMap(map)', '// Or: ConcurrentSkipListMap<K,V>', '// Lock-free, sorted, O(log n)'], language: 'Java' },
  { id: 'tm-exception', label: 'ClassCastException + compareTo', icon: '💥', collectionType: 'treemap', category: 'exception', build: buildExceptions, code: ['// Mixed key types → 💥 ClassCastException', '// compareTo==0 should ↔ equals()==true', '// BigDecimal: compareTo!=equals (violation)', 'new TreeMap<>(Comparator.naturalOrder())'], language: 'Java' },
];
