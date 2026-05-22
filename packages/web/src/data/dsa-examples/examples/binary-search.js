export default {
    topic: 'Arrays',
    title: 'Binary Search',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array, target } = input;
  let left = 0, right = array.length - 1;

  tracer.step('Start', \`Search for \${target}\`, { array, target, left, right });

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    tracer.step('Check', \`arr[\${mid}] = \${array[mid]}\`,
      { array, target, left, mid, right });

    if (array[mid] === target) {
      tracer.found(mid, { state: { array, target, found: mid } });
      return mid;
    }

    array[mid] < target ? left = mid + 1 : right = mid - 1;
  }

  tracer.found(-1, { state: { array, target, found: -1 } });
  return -1;
};`,
    explanation: 'Binary search on a sorted array. Time: O(log n), Space: O(1).',
    defaultInput: { array: [1, 3, 5, 7, 9, 11, 13], target: 7 },
    testCases: [
      { input: { array: [1, 3, 5, 7], target: 5 }, expected: 2 },
      { input: { array: [1, 3, 5, 7], target: 6 }, expected: -1 },
    ],
}
