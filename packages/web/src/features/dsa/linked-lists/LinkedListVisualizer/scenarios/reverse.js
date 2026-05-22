import { snap, makeList } from '@/core/utils/scenarioShared';

const DEFAULT_VALUES = [1, 2, 3, 4, 5];

const CODE = [
  'function reverseList(head) {',
  '  let prev = null, curr = head;',
  '  while (curr !== null) {',
  '    const next = curr.next;',
  '    curr.next = prev;',
  '    prev = curr;',
  '    curr = next;',
  '  }',
  '  return prev; // new head',
  '}',
];

function build({ list = DEFAULT_VALUES } = {}) {
  const VALUES = Array.isArray(list)
    ? list.filter((v) => Number.isFinite(v)).slice(0, 8)
    : DEFAULT_VALUES;
  const vals = VALUES.length >= 2 ? VALUES : DEFAULT_VALUES;

  const steps = [];

  function mkNodes(prevIdx, currIdx, nextIdx, doneSet = new Set()) {
    return makeList(vals).map((n, i) => ({
      ...n,
      state:
        i === prevIdx ? 'prev' :
        i === currIdx ? 'curr' :
        i === nextIdx ? 'next' :
        doneSet.has(i) ? 'visited' : 'idle',
    }));
  }

  const reversed = new Array(vals.length).fill(-1);
  const origNext = vals.map((_, i) => (i < vals.length - 1 ? i + 1 : -1));

  let prev = -1, curr = 0;

  const s = {
    nodes: mkNodes(-1, curr, curr < vals.length - 1 ? curr + 1 : -1),
    reversed,
    origNext: [...origNext],
    pointers: { prev: null, curr: vals[curr], next: vals[curr + 1] ?? null },
    vars: { prev: null, curr: vals[curr], next: vals[curr + 1] ?? null },
    complexity: { ops: 0, label: 'O(n)', space: 'O(1)' },
  };

  snap(steps, s, `Start: prev=null, curr=${vals[curr]}. Reverse singly linked list iteratively.`, 1);

  const doneSet = new Set();
  let ops = 0;

  while (curr !== -1) {
    const next = origNext[curr];
    ops++;

    reversed[curr] = prev;

    const nextVal = next !== -1 ? vals[next] : null;
    const prevVal = prev !== -1 ? vals[prev] : null;

    s.nodes = mkNodes(prev, curr, next, doneSet);
    s.reversed = [...reversed];
    s.pointers = { prev: prevVal, curr: vals[curr], next: nextVal };
    s.vars = { prev: prevVal, curr: vals[curr], next: nextVal };
    s.complexity = { ops, label: 'O(n)', space: 'O(1)' };
    snap(steps, s, `curr=${vals[curr]}: save next=${nextVal ?? 'null'}, point curr→prev=${prevVal ?? 'null'}`, 3);

    doneSet.add(curr);
    prev = curr;
    curr = next;
  }

  const finalNodes = makeList([...vals].reverse()).map((n) => ({ ...n, state: 'done' }));
  s.nodes = finalNodes;
  s.reversed = reversed;
  s.vars = { prev: vals[prev], curr: null, next: null };
  s.complexity = { ops, label: 'O(n)', space: 'O(1)' };
  snap(steps, s, `Done! List reversed: [${[...vals].reverse().join(' → ')}]. New head=${vals[prev]}.`, 8);

  return steps;
}

export default {
  id: 'reverse',
  label: 'Reverse List',
  icon: '↩️',
  build,
  inputs: [
    { key: 'list', label: 'List values (comma-sep)', type: 'array-num', default: DEFAULT_VALUES },
  ],
  code: CODE,
  language: 'javascript',
  metrics: [],
};
