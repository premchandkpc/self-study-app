import { AlgorithmCompiler } from '../../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const reverseAlgorithm = (input, tracer) => {
  const { array } = input;
  tracer.step('Initialize', `Reverse linked list [${array.join(',')}]`, input);

  let prev = null;
  let result = null;
  const list = [...array];

  for (let i = 0; i < list.length; i++) {
    const current = list[i];
    tracer.step('Process', `Current=${current}, Prev=${prev}`,
      { array: list, index: i, current, prev, reversed: [] });
  }

  const reversed = list.reverse();
  tracer.found(reversed, { state: { array: reversed } });
  return reversed;
};

const cycleDetectionAlgorithm = (input, tracer) => {
  const { array, cycleStart } = input;
  tracer.step('Initialize', `Detect cycle with Floyd's algorithm`, input);

  let slow = 0, fast = 0;
  let steps = 0;
  const len = array.length;
  const hasCycle = cycleStart >= 0;

  while (steps < Math.min(len * 2, 20)) {
    slow = (slow + 1) % len;
    fast = (fast + 2) % len;
    steps++;

    tracer.step('Move', `Step ${steps}: Slow→${slow}, Fast→${fast}`,
      { array, slow, fast, hasCycle, cycleStart });

    if (slow === fast) {
      tracer.found(hasCycle, { state: { array, slow, fast, hasCycle } });
      return hasCycle;
    }
  }

  return false;
};

const mergeAlgorithm = (input, tracer) => {
  const { list1, list2 } = input;
  tracer.step('Initialize', `Merge two sorted lists`, { list1, list2 });

  let i = 0, j = 0;
  const result = [];

  while (i < list1.length && j < list2.length) {
    if (list1[i] <= list2[j]) {
      result.push(list1[i]);
      tracer.step('Add from list1', `Added ${list1[i]}`, { list1, list2, result, i, j });
      i++;
    } else {
      result.push(list2[j]);
      tracer.step('Add from list2', `Added ${list2[j]}`, { list1, list2, result, i, j });
      j++;
    }
  }

  while (i < list1.length) {
    result.push(list1[i++]);
  }
  while (j < list2.length) {
    result.push(list2[j++]);
  }

  tracer.found(result, { state: { list1, list2, result } });
  return result;
};

export const SCENARIOS = [
  {
    id: 'reverse',
    label: 'Reverse Linked List',
    icon: '🔄',
    code: `const algorithm = (input, tracer) => {
  const { array } = input;
  let prev = null, current = array[0];
  while (current) {
    const next = current.next;
    current.next = prev;
    prev = current;
    current = next;
  }
  return array.reverse();
};`,
    language: 'javascript',
    inputs: [
      { key: 'array', label: 'Values', type: 'array-num', default: [1, 2, 3, 4, 5] },
    ],
    build(params = {}) {
      const array = Array.isArray(params.array) ? params.array : [1, 2, 3, 4, 5];
      return compiler.compile(reverseAlgorithm, { array });
    },
  },
  {
    id: 'cycle-detection',
    label: 'Detect Cycle (Floyd)',
    icon: '🔁',
    code: `const algorithm = (input, tracer) => {
  const { array, cycleStart } = input;
  let slow = 0, fast = 0;
  while (slow < array.length && fast < array.length) {
    slow = (slow + 1) % array.length;
    fast = (fast + 2) % array.length;
    if (slow === fast) return true;
  }
  return false;
};`,
    language: 'javascript',
    inputs: [
      { key: 'array', label: 'Values', type: 'array-num', default: [1, 2, 3, 4, 5] },
      { key: 'cycleStart', label: 'Cycle Start', type: 'number', default: -1, min: -1, max: 4 },
    ],
    build(params = {}) {
      const array = Array.isArray(params.array) ? params.array : [1, 2, 3, 4, 5];
      const cycleStart = Number(params.cycleStart) || -1;
      return compiler.compile(cycleDetectionAlgorithm, { array, cycleStart });
    },
  },
  {
    id: 'merge',
    label: 'Merge Sorted Lists',
    icon: '➕',
    code: `const algorithm = (input, tracer) => {
  const { list1, list2 } = input;
  let i = 0, j = 0, result = [];
  while (i < list1.length && j < list2.length) {
    if (list1[i] <= list2[j]) result.push(list1[i++]);
    else result.push(list2[j++]);
  }
  return result.concat(list1.slice(i), list2.slice(j));
};`,
    language: 'javascript',
    inputs: [
      { key: 'list1', label: 'List 1 (sorted)', type: 'array-num', default: [1, 3, 5] },
      { key: 'list2', label: 'List 2 (sorted)', type: 'array-num', default: [2, 4, 6] },
    ],
    build(params = {}) {
      const list1 = Array.isArray(params.list1) ? params.list1 : [1, 3, 5];
      const list2 = Array.isArray(params.list2) ? params.list2 : [2, 4, 6];
      return compiler.compile(mergeAlgorithm, { list1, list2 });
    },
  },
];
