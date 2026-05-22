export default {
    topic: 'Arrays',
    title: 'Merge Sorted Lists',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { array: arr1, arr2 } = input;

  tracer.step('Initialize', \`Merge [\${arr1}] and [\${arr2}]\`, { array: arr1, arr2, result: [], i: 0, j: 0, left: 0, right: 0 });

  let i = 0, j = 0;
  const result = [];

  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i]);
      tracer.step('Add from arr1', \`Added \${arr1[i]}\`,
        { array: [...result], arr2, result, i, j, left: i, right: j });
      i++;
    } else {
      result.push(arr2[j]);
      tracer.step('Add from arr2', \`Added \${arr2[j]}\`,
        { array: [...result], arr2, result, i, j, left: i, right: j });
      j++;
    }
  }

  while (i < arr1.length) result.push(arr1[i++]);
  while (j < arr2.length) result.push(arr2[j++]);

  tracer.found(result, { state: { array: result } });
  return result;
};`,
    explanation: 'Merge two sorted arrays into one sorted array. Time: O(n+m), Space: O(n+m).',
    defaultInput: { array: [1, 3, 5], arr2: [2, 4, 6] },
    testCases: [
      { input: { array: [1, 2, 3], arr2: [1, 2, 3] }, expected: [1, 1, 2, 2, 3, 3] },
    ],
}
