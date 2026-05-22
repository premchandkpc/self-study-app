export default {
    topic: 'Graph',
    title: 'Clone Graph',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { nodes } = input;
  if (!nodes || nodes.length === 0) return null;

  const map = new Map();
  const queue = [nodes[0]];
  const cloneNode = { val: nodes[0].val, neighbors: [] };
  map.set(nodes[0].val, cloneNode);

  tracer.step('Start', 'Clone graph', { nodeStates: nodes });

  while (queue.length > 0) {
    const node = queue.shift();
    tracer.step('Process', \`Node \${node.val}\`, { nodeStates: nodes });

    for (const neighbor of node.neighbors) {
      if (!map.has(neighbor.val)) {
        map.set(neighbor.val, { val: neighbor.val, neighbors: [] });
      }
      map.get(node.val).neighbors.push(map.get(neighbor.val));
      if (!queue.includes(neighbor)) queue.push(neighbor);
    }
  }

  return cloneNode;
};`,
    explanation: 'Clone an undirected graph. Time: O(V+E), Space: O(V).',
    defaultInput: { nodes: [{val: 1, neighbors: []}] },
    testCases: [{ input: { nodes: [] }, expected: null }],
}
