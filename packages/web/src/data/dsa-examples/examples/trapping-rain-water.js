export default {
    topic: 'Arrays/DP',
    title: 'Trapping Rain Water',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { heights } = input;
  if (heights.length < 3) return 0;

  const left = Array(heights.length), right = Array(heights.length);
  left[0] = heights[0];
  right[heights.length - 1] = heights[heights.length - 1];

  for (let i = 1; i < heights.length; i++) {
    left[i] = Math.max(left[i - 1], heights[i]);
  }
  for (let i = heights.length - 2; i >= 0; i--) {
    right[i] = Math.max(right[i + 1], heights[i]);
  }

  let water = 0;
  for (let i = 0; i < heights.length; i++) {
    water += Math.min(left[i], right[i]) - heights[i];
    tracer.step('Calculate', \`Water at \${i}: \${Math.min(left[i], right[i]) - heights[i]}\`, { array: heights });
  }

  return water;
};`,
    explanation: 'Calculate trapped rain water. Time: O(n), Space: O(n).',
    defaultInput: { heights: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
    testCases: [{ input: { heights: [4, 2, 0, 3, 2, 5] }, expected: 9 }],
}
