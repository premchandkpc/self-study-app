export default {
    topic: 'Recursion/DP',
    title: 'Fibonacci Number',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { n } = input;
  if (n <= 1) return n;

  let prev = 0, curr = 1;
  tracer.step('Start', \`Calculate fib(\${n})\`, { n, prev, curr });

  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
    tracer.step('Compute', \`F(\${i}) = \${curr}\`, { n, i, prev, curr });
  }

  return curr;
};`,
    explanation: 'Calculate nth Fibonacci number. Time: O(n), Space: O(1).',
    defaultInput: { n: 6 },
    testCases: [{ input: { n: 4 }, expected: 3 }],
}
