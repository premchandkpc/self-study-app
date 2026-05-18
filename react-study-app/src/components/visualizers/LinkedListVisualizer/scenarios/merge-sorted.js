import { snap } from './shared';

const LIST1 = [1, 3, 5, 7];
const LIST2 = [2, 4, 6];

const CODE = [
  'function mergeTwoLists(l1, l2) {',
  '  const dummy = new ListNode(0);',
  '  let tail = dummy;',
  '  while (l1 && l2) {',
  '    if (l1.val <= l2.val) {',
  '      tail.next = l1; l1 = l1.next;',
  '    } else {',
  '      tail.next = l2; l2 = l2.next;',
  '    }',
  '    tail = tail.next;',
  '  }',
  '  tail.next = l1 || l2;',
  '  return dummy.next;',
  '}',
];

function mkNodes(list, states, label) {
  return list.map((val, i) => ({
    id: `${label}${i}`,
    val,
    state: states[i] || 'idle',
    nextIdx: i < list.length - 1 ? i + 1 : -1,
    label,
  }));
}

function build() {
  const steps = [];
  let p1 = 0, p2 = 0;
  const merged = [];

  function mkState(p1Idx, p2Idx, mergedArr) {
    const l1Nodes = LIST1.map((val, i) => ({
      id: `l1-${i}`,
      val,
      state: i === p1Idx ? 'curr' : i < p1Idx ? 'visited' : 'idle',
      nextIdx: i < LIST1.length - 1 ? i + 1 : -1,
    }));
    const l2Nodes = LIST2.map((val, i) => ({
      id: `l2-${i}`,
      val,
      state: i === p2Idx ? 'curr' : i < p2Idx ? 'visited' : 'idle',
      nextIdx: i < LIST2.length - 1 ? i + 1 : -1,
    }));
    const mergedNodes = mergedArr.map((val, i) => ({
      id: `m-${i}`,
      val,
      state: i === mergedArr.length - 1 ? 'active' : 'done',
      nextIdx: i < mergedArr.length - 1 ? i + 1 : -1,
    }));
    return { list1: l1Nodes, list2: l2Nodes, mergedNodes };
  }

  let s = {
    ...mkState(p1, p2, merged),
    vars: { p1: LIST1[p1], p2: LIST2[p2], merged: [] },
    complexity: { ops: 0, label: 'O(m+n)', space: 'O(1)' },
  };
  snap(steps, s, `Merge two sorted lists. p1=${LIST1[p1]}, p2=${LIST2[p2]}.`, 3);

  let ops = 0;
  while (p1 < LIST1.length && p2 < LIST2.length) {
    ops++;
    if (LIST1[p1] <= LIST2[p2]) {
      merged.push(LIST1[p1]);
      snap(steps, { ...mkState(p1, p2, merged), vars: { p1: LIST1[p1], p2: LIST2[p2], merged: [...merged] }, complexity: { ops, label: 'O(m+n)', space: 'O(1)' } },
        `L1[${p1}]=${LIST1[p1]} ≤ L2[${p2}]=${LIST2[p2]}. Take from L1. merged=[${merged.join(',')}]`, 5);
      p1++;
    } else {
      merged.push(LIST2[p2]);
      snap(steps, { ...mkState(p1, p2, merged), vars: { p1: LIST1[p1], p2: LIST2[p2], merged: [...merged] }, complexity: { ops, label: 'O(m+n)', space: 'O(1)' } },
        `L2[${p2}]=${LIST2[p2]} < L1[${p1}]=${LIST1[p1]}. Take from L2. merged=[${merged.join(',')}]`, 7);
      p2++;
    }
    s = { ...mkState(p1, p2, merged), vars: { p1: LIST1[p1] ?? null, p2: LIST2[p2] ?? null, merged: [...merged] }, complexity: { ops, label: 'O(m+n)', space: 'O(1)' } };
  }

  // Drain remaining
  while (p1 < LIST1.length) { merged.push(LIST1[p1]); p1++; ops++; }
  while (p2 < LIST2.length) { merged.push(LIST2[p2]); p2++; ops++; }

  s = { ...mkState(p1, p2, merged), vars: { p1: null, p2: null, merged }, complexity: { ops, label: 'O(m+n)', space: 'O(1)' } };
  snap(steps, s, `Done! Merged: [${merged.join(' → ')}]. O(m+n) time, O(1) space.`, 11);

  return steps;
}

export default {
  id: 'merge-sorted',
  label: 'Merge Sorted Lists',
  icon: '🔗',
  build,
  code: CODE,
  language: 'javascript',
  metrics: [],
};
