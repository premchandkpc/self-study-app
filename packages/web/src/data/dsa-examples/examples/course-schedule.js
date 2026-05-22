export default {
    topic: 'Graph/Topological Sort',
    title: 'Course Schedule',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { n, prerequisites } = input;
  const adjList = Array.from({ length: n }, () => []);
  const inDegree = new Array(n).fill(0);

  tracer.step('Build graph', 'Create adjacency list', { i: 0 });

  for (const [course, prereq] of prerequisites) {
    adjList[prereq].push(course);
    inDegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < n; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  let count = 0;
  while (queue.length > 0) {
    const course = queue.shift();
    count++;
    tracer.step('Process', \`Course \${course}\`, { i: count });

    for (const neighbor of adjList[course]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return count === n;
};`,
    explanation: 'Determine if all courses can be completed. Time: O(V+E), Space: O(V+E).',
    defaultInput: { n: 2, prerequisites: [[1, 0]] },
    testCases: [{ input: { n: 2, prerequisites: [[1, 0], [0, 1]] }, expected: false }],
}
