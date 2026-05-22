export default {
    topic: 'Arrays',
    title: 'Merge Intervals',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  if (intervals.length === 0) return [];

  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];

  tracer.step('Sort', 'Intervals sorted', { array: intervals.flat ? intervals.flat() : intervals });

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] <= result[result.length - 1][1]) {
      result[result.length - 1][1] = Math.max(result[result.length - 1][1], intervals[i][1]);
      tracer.step('Merge', \`Merged intervals\`, { array: result.flat ? result.flat() : result });
    } else {
      result.push(intervals[i]);
      tracer.step('Add', \`Added new interval\`, { array: result.flat ? result.flat() : result });
    }
  }

  return result;
};`,
    explanation: 'Merge overlapping intervals. Time: O(n log n), Space: O(n).',
    defaultInput: { intervals: [[1, 3], [2, 6], [8, 10], [15, 18]] },
    testCases: [{ input: { intervals: [[1, 4], [4, 5]] }, expected: [[1, 5]] }],
}
