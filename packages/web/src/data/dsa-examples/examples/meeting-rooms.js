export default {
    topic: 'Arrays',
    title: 'Meeting Rooms',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  intervals.sort((a, b) => a[0] - b[0]);

  tracer.step('Sort', 'Meetings sorted by start time', { array: intervals.flat ? intervals.flat() : intervals });

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) {
      tracer.step('Conflict', 'Meetings overlap', { array: intervals.flat ? intervals.flat() : intervals });
      return false;
    }
    tracer.step('Check', 'No overlap', { array: intervals.flat ? intervals.flat() : intervals });
  }

  return true;
};`,
    explanation: 'Determine if a person can attend all meetings. Time: O(n log n), Space: O(1).',
    defaultInput: { intervals: [[0, 30], [5, 10], [15, 20]] },
    testCases: [{ input: { intervals: [[7, 10], [2, 4]] }, expected: true }],
}
