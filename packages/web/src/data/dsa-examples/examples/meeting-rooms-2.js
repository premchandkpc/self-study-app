export default {
    topic: 'Heap/Sort',
    title: 'Meeting Rooms II',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { intervals } = input;
  if (intervals.length === 0) return 0;

  const events = [];
  for (const [start, end] of intervals) {
    events.push([start, 1]);
    events.push([end, -1]);
  }

  events.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  tracer.step('Sort', 'Events sorted', { array: intervals.flat ? intervals.flat() : intervals });

  let maxRooms = 0, currentRooms = 0;
  for (const [time, type] of events) {
    currentRooms += type;
    maxRooms = Math.max(maxRooms, currentRooms);
    tracer.step('Update', \`Rooms needed: \${maxRooms}\`, { array: intervals.flat ? intervals.flat() : intervals });
  }

  return maxRooms;
};`,
    explanation: 'Minimum conference rooms needed. Time: O(n log n), Space: O(n).',
    defaultInput: { intervals: [[0, 30], [5, 10], [15, 20]] },
    testCases: [{ input: { intervals: [[9, 10], [4, 9], [4, 17]] }, expected: 2 }],
}
