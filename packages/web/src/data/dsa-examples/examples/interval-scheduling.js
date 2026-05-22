export default {
    topic: 'Greedy',
    title: 'Interval Scheduling Maximization',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  intervals.sort((a, b) => a[1] - b[1]);

  const result = [intervals[0]];
  tracer.step('Start', 'Sort by end time', { array: intervals.flat ? intervals.flat() : intervals });

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] >= result[result.length - 1][1]) {
      result.push(intervals[i]);
      tracer.step('Add', 'Non-overlapping interval added', { array: result.flat ? result.flat() : result });
    }
  }

  return result;
};`,
    explanation: 'Select maximum non-overlapping intervals. Time: O(n log n), Space: O(n).',
    defaultInput: { intervals: [[1, 2], [2, 3], [3, 4], [4, 5]] },
    testCases: [{ input: { intervals: [[1, 2], [1, 2], [1, 2]] }, expected: [[1, 2]] }],
}
