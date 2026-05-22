import { snap } from '@/core/utils/scenarioShared';

// ── PriorityQueue (min-heap) ──────────────────────────────────────────────────
function makeHeap() {
  return {
    collectionType: 'priorityqueue',
    heap: [null], // 1-indexed; heap[0] unused
    size: 0,
    swapI: -1, swapJ: -1, cmpI: -1, cmpJ: -1,
    ops: [], exception: null,
  };
}

function heapOffer(s, val) {
  s.heap = [...s.heap, { val, state: 'new' }];
  s.size++;
  // sift up
  let i = s.size;
  while (i > 1 && s.heap[Math.floor(i / 2)].val > s.heap[i].val) {
    const parent = Math.floor(i / 2);
    const tmp = s.heap[parent]; s.heap[parent] = s.heap[i]; s.heap[i] = tmp;
    i = parent;
  }
  s.ops = [...s.ops, { msg: `offer(${val}) → heap[${s.size}], sift-up`, type: 'ok' }].slice(-5);
}

function heapPoll(s) {
  if (s.size === 0) return null;
  const min = s.heap[1].val;
  s.heap[1] = { ...s.heap[s.size], state: 'active' };
  s.heap = s.heap.slice(0, s.size);
  s.size--;
  // sift down
  let i = 1;
  while (true) {
    let smallest = i;
    if (2 * i <= s.size && s.heap[2 * i].val < s.heap[smallest].val) smallest = 2 * i;
    if (2 * i + 1 <= s.size && s.heap[2 * i + 1].val < s.heap[smallest].val) smallest = 2 * i + 1;
    if (smallest === i) break;
    const tmp = s.heap[i]; s.heap[i] = s.heap[smallest]; s.heap[smallest] = tmp;
    i = smallest;
  }
  s.ops = [...s.ops, { msg: `poll() → ${min} (min)`, type: 'ok' }].slice(-5);
  return min;
}

function resetHeap(s) { s.heap = s.heap.map((x, i) => i === 0 ? x : { ...x, state: 'idle' }); s.swapI = -1; s.swapJ = -1; s.cmpI = -1; s.cmpJ = -1; }

// ── ArrayDeque (circular buffer) ──────────────────────────────────────────────
function makeDeque(cap = 8) {
  return {
    collectionType: 'arraydeque',
    slots: Array.from({ length: cap }, () => ({ val: null, state: 'empty' })),
    head: 0, tail: 0, size: 0, capacity: cap,
    ops: [], exception: null,
  };
}

function dequeAddLast(s, val) {
  s.slots[s.tail] = { val, state: 'new' };
  s.tail = (s.tail + 1) % s.capacity;
  s.size++;
  s.ops = [...s.ops, { msg: `addLast(${val}) → slot[${(s.tail - 1 + s.capacity) % s.capacity}]`, type: 'ok' }].slice(-5);
}

function dequeAddFirst(s, val) {
  s.head = (s.head - 1 + s.capacity) % s.capacity;
  s.slots[s.head] = { val, state: 'new' };
  s.size++;
  s.ops = [...s.ops, { msg: `addFirst(${val}) → slot[${s.head}]`, type: 'ok' }].slice(-5);
}

function dequePollFirst(s) {
  if (s.size === 0) return null;
  const val = s.slots[s.head].val;
  s.slots[s.head] = { val: null, state: 'empty' };
  s.head = (s.head + 1) % s.capacity;
  s.size--;
  s.ops = [...s.ops, { msg: `pollFirst() → ${val}`, type: 'ok' }].slice(-5);
  return val;
}

function resetDeque(s) { s.slots = s.slots.map(x => ({ ...x, state: x.val !== null ? 'idle' : 'empty' })); }

// ── Flow: PriorityQueue min-heap offer/poll ───────────────────────────────────
function buildPQFlow() {
  const steps = [];
  const s = makeHeap();
  snap(steps, s, 'PriorityQueue: min-heap by default (natural ordering). offer() = O(log n), poll() = O(log n). peek() = O(1).', 0);

  const vals = [15, 3, 8, 1, 12, 5];
  for (const v of vals) {
    heapOffer(s, v);
    s.heap = s.heap.map((x, i) => i === 0 ? x : { ...x, state: i === s.size ? 'new' : 'idle' });
    snap(steps, s, `offer(${v}). Added at end, sift-up until heap property restored. Heap: min=${s.heap[1]?.val}.`, 1);
    resetHeap(s);
  }

  snap(steps, s, `peek() → ${s.heap[1]?.val}. Root is minimum. O(1). Does not remove.`, 2);

  for (let i = 0; i < 3; i++) {
    const rootVal = s.heap[1]?.val;
    s.heap[1] = { ...s.heap[1], state: 'removed' };
    snap(steps, s, `poll() → ${rootVal} (minimum). Root removed. Last element moves to root, sift-down begins.`, 3);
    heapPoll(s);
    resetHeap(s);
    snap(steps, s, `After sift-down. New min = ${s.heap[1]?.val}. Heap property restored.`, 3);
  }

  s.ops.push({ msg: 'offer O(log n) | poll O(log n) | peek O(1)', type: 'ok' });
  snap(steps, s, 'PriorityQueue summary: Natural min-heap. For max-heap: new PriorityQueue<>(Comparator.reverseOrder()). Does NOT maintain sorted order for iteration!', 4);
  return steps;
}

// ── Flow: ArrayDeque as stack and queue ───────────────────────────────────────
function buildDequeFlow() {
  const steps = [];
  const s = makeDeque(8);
  snap(steps, s, 'ArrayDeque: circular buffer. Preferred over Stack (for LIFO) and LinkedList (for queue). O(1) add/remove at both ends.', 0);

  // use as queue (FIFO)
  for (const v of [10, 20, 30]) {
    dequeAddLast(s, v);
    resetDeque(s);
    snap(steps, s, `Queue (FIFO): addLast(${v}). head=${s.head}, tail=${s.tail}, size=${s.size}. Circular buffer.`, 1);
  }

  snap(steps, s, `pollFirst() → dequeue. head moves right. Circular: head wraps around at end. O(1).`, 2);
  const q1 = dequePollFirst(s); resetDeque(s);
  snap(steps, s, `Queue: pollFirst() → ${q1}. head=${s.head}. Buffer still at same physical slots.`, 2);

  // use as stack (LIFO)
  for (const v of [100, 200]) {
    dequeAddFirst(s, v);
    resetDeque(s);
    snap(steps, s, `Stack (LIFO): addFirst(${v}) → slot[${(s.head + s.capacity) % s.capacity}]. Head moves left. O(1).`, 3);
  }
  snap(steps, s, 'pollFirst() from stack = pop(). Fastest Stack alternative. ArrayDeque has no capacity limit (resizes) and no legacy overhead.', 4);

  s.ops.push({ msg: 'Prefer ArrayDeque over Stack class', type: 'ok' });
  snap(steps, s, 'Stack class extends Vector (synchronized, slow). ArrayDeque: no sync overhead, better cache locality than LinkedList. Use ArrayDeque as both Stack and Queue.', 5);
  return steps;
}

// ── Edge: PQ null + ordering, Deque capacity wrap ────────────────────────────
function buildEdgeCases() {
  const steps = [];
  const s = makeHeap();

  snap(steps, s, 'Edge cases: PriorityQueue null elements, custom Comparator ordering, iteration ≠ sorted order.', 0);

  for (const v of [5, 2, 8]) { heapOffer(s, v); resetHeap(s); }
  snap(steps, s, 'Iterate PriorityQueue: for(int x : pq). NOT in sorted order! Heap array order, not min-first. Only poll() gives sorted order.', 1);

  const iterOrder = s.heap.slice(1).map(x => x.val);
  s.ops.push({ msg: `iterator order: ${iterOrder.join(', ')} ≠ sorted`, type: 'warn' });
  snap(steps, s, `Iteration visits: ${iterOrder.join(' → ')}. Heap array is partially ordered, not sorted. Common mistake: expecting sorted iteration.`, 2);

  // null element
  snap(steps, s, 'offer(null) → NullPointerException! PriorityQueue cannot hold null (compareTo(null) throws NPE).', 3);
  s.exception = { type: 'NullPointerException', msg: 'PriorityQueue.offer(null)' };
  snap(steps, s, '💥 NullPointerException: PriorityQueue never accepts null. ArrayDeque also rejects null (addFirst(null) → NPE). LinkedList allows null in queue.', 4);

  s.exception = null;
  s.ops = [
    { msg: 'PQ iteration ≠ sorted order!', type: 'warn' },
    { msg: 'PQ: offer(null) → NPE!', type: 'warn' },
    { msg: 'Deque: addFirst(null) → NPE!', type: 'warn' },
  ];
  snap(steps, s, 'Summary: Always use poll() to extract sorted. PQ/ArrayDeque reject null. Custom order: new PriorityQueue<>((a,b) -> b.value - a.value).', 5);
  return steps;
}

// ── Exception: NoSuchElement, PQ ClassCast, Deque full ────────────────────────
function buildExceptions() {
  const steps = [];
  const s = makeHeap();

  snap(steps, s, 'Queue exception scenarios: empty-collection errors, type violations, blocking queue timeouts.', 0);

  snap(steps, s, 'Queue.remove() on empty → NoSuchElementException. Queue.poll() → null. Queue.element() → NoSuchElement. Queue.peek() → null. "p" family safe.', 1);
  s.exception = { type: 'NoSuchElementException', msg: 'PriorityQueue.remove() on empty queue' };
  snap(steps, s, '💥 NoSuchElementException: remove/element/getFirst/getLast/dequeue on empty collection. Always check isEmpty() or use poll/peek variants.', 2);

  s.exception = null;
  snap(steps, s, 'new PriorityQueue<String>() then offer(42) → ClassCastException on second element. Type erasure: first add succeeds, second fails compareTo.', 3);
  s.exception = { type: 'ClassCastException', msg: 'Integer cannot be cast to String (compareTo)' };
  snap(steps, s, '💥 ClassCastException: PriorityQueue uses Comparable.compareTo(). Incompatible types discovered at second element. Use explicit Comparator to catch earlier.', 4);

  s.exception = null;
  s.ops = [
    { msg: 'BlockingQueue.put() blocks if full', type: 'ok' },
    { msg: 'BlockingQueue.poll(timeout) → null on timeout', type: 'ok' },
    { msg: 'ArrayBlockingQueue: fixed-capacity blocking', type: 'ok' },
  ];
  snap(steps, s, 'Blocking queues (producer-consumer): LinkedBlockingQueue, ArrayBlockingQueue. put() blocks on full. take() blocks on empty. poll(timeout, unit) → null on timeout. InterruptedException on thread interrupt.', 5);
  return steps;
}

export const QUEUE_SCENARIOS = [
  { id: 'pq-flow', label: 'PriorityQueue min-heap', icon: '⛰️', collectionType: 'priorityqueue', category: 'flow', build: buildPQFlow, code: ['PriorityQueue<Integer> pq = new PriorityQueue<>();', 'pq.offer(15);  // O(log n) sift-up', 'pq.peek();     // O(1) — min at root', 'pq.poll();     // O(log n) sift-down'], language: 'Java' },
  { id: 'deque-flow', label: 'ArrayDeque Stack+Queue', icon: '🔄', collectionType: 'arraydeque', category: 'flow', build: buildDequeFlow, code: ['Deque<T> deque = new ArrayDeque<>();', 'deque.addLast(x);   // Queue: enqueue', 'deque.pollFirst();  // Queue: dequeue', 'deque.addFirst(x);  // Stack: push'], language: 'Java' },
  { id: 'queue-edge', label: 'null + iteration order pitfalls', icon: '⚠️', collectionType: 'priorityqueue', category: 'edge', build: buildEdgeCases, code: ['// PQ iteration ≠ sorted order!', '// offer(null) → 💥 NPE', '// Only poll() gives sorted', 'new PriorityQueue<>(Comparator.reverseOrder())'], language: 'Java' },
  { id: 'queue-exception', label: 'NoSuchElement + BlockingQueue', icon: '💥', collectionType: 'arraydeque', category: 'exception', build: buildExceptions, code: ['queue.remove(); // 💥 NoSuchElement if empty', 'queue.poll();   // null if empty (safe)', 'blockingQ.put(x);       // blocks if full', 'blockingQ.poll(1, SECONDS); // timeout'], language: 'Java' },
];
