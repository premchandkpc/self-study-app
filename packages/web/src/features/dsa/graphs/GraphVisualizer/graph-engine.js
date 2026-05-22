import { AlgorithmCompiler } from '../../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const bfsAlgorithm = (input, tracer) => {
  const { graph, start } = input;
  const visited = new Set();
  const queue = [start];
  const order = [];
  
  tracer.step('Initialize', `BFS from node ${start}`, input);
  
  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node)) continue;
    visited.add(node);
    order.push(node);
    
    tracer.step('Visit', `Node ${node}`,
      { graph, start, visited: Array.from(visited), order });
    
    for (let neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }
  
  tracer.found(order, { state: { graph, order } });
  return order;
};

export const SCENARIOS = [
  {
    id: 'bfs',
    label: 'BFS',
    icon: '🕸️',
    code: `const algorithm = (input, tracer) => {
  const { graph, start } = input;
  const visited = new Set([start]);
  const queue = [start];
  const order = [start];
  while (queue.length) {
    const node = queue.shift();
    for (let neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        order.push(neighbor);
      }
    }
  }
  return order;
};`,
    language: 'javascript',
    inputs: [
      { key: 'graph', label: 'Adjacency List', type: 'text', default: '{"0":[1,2],"1":[0,3],"2":[0],"3":[1]}' },
      { key: 'start', label: 'Start Node', type: 'text', default: '0' },
    ],
    build(params = {}) {
      let graph = {"0":[1,2],"1":[0,3],"2":[0],"3":[1]};
      if (typeof params.graph === 'string') {
        try { graph = JSON.parse(params.graph); } catch { }
      }
      const start = String(params.start || '0');
      return compiler.compile(bfsAlgorithm, { graph, start });
    },
  },
];
