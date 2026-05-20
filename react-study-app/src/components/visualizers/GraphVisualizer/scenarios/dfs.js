import { snap, node, packet, createNodeFactory } from '@/core/utils/scenarioShared';
import { GRAPH_CONCEPTS, BFS_DFS_CONCEPTS } from './shared';

const _mk = createNodeFactory({ default: '●' });
const graphNode = _mk('default');

function buildDFSSteps() {
  const steps = [];
  const s = {
    nodes: [
      graphNode('n0', 'A', 200, 100, { visited: false }),
      graphNode('n1', 'B', 350, 50,  { visited: false }),
      graphNode('n2', 'C', 350, 150, { visited: false }),
      graphNode('n3', 'D', 500, 100, { visited: false }),
      graphNode('n4', 'E', 200, 250, { visited: false }),
    ],
    edges: [
      { from: 'n0', to: 'n1', protocol: '1' }, { from: 'n0', to: 'n2', protocol: '1' },
      { from: 'n1', to: 'n3', protocol: '1' }, { from: 'n2', to: 'n3', protocol: '1' },
      { from: 'n0', to: 'n4', protocol: '1' },
    ],
    packets: [],
    events: [],
    metrics: { visited: 0, stack: 0, dfs_order: [] },
  };

  snap(steps, s, 'DFS explores depth-first via recursion. Start A. Stack: [A]. Order will be depth-first (one branch fully).', 1);

  s.nodes[0].visited = true;
  s.nodes[0].state = 'active';
  s.metrics.visited = 1;
  s.metrics.stack = 1;
  s.events.push({ type: 'info', msg: 'Visit A. Explore first neighbor B (depth-first).' });
  snap(steps, s, 'Visit A. Push first neighbor B to stack. Recursively explore B.', 2);

  s.nodes[1].visited = true;
  s.nodes[1].state = 'active';
  s.metrics.visited = 2;
  s.packets = [packet('n0', 'n1', 'recurse')];
  s.events.push({ type: 'info', msg: 'Visit B. Explore neighbor D (only unvisited).' });
  snap(steps, s, 'Visit B. Explore B\'s neighbor D. Stack: [A, B, D].', 3);

  s.nodes[3].visited = true;
  s.nodes[3].state = 'active';
  s.metrics.visited = 3;
  s.packets = [packet('n1', 'n3', 'recurse')];
  s.events.push({ type: 'ok', msg: 'Visit D. No unvisited neighbors. Backtrack to B.' });
  snap(steps, s, 'Visit D. No unvisited neighbors from D. Backtrack (D complete).', 4);

  s.nodes[1].state = 'idle';
  s.packets = [];
  s.metrics.stack = 1;
  s.events.push({ type: 'info', msg: 'B complete (all neighbors visited). Backtrack to A.' });
  snap(steps, s, 'B fully explored. Return from B() to A(). A has more neighbors: C, E.', 5);

  s.nodes[2].visited = true;
  s.nodes[2].state = 'active';
  s.nodes[0].state = 'active';
  s.metrics.visited = 4;
  s.packets = [packet('n0', 'n2', 'recurse')];
  s.events.push({ type: 'info', msg: 'Visit C. Explore neighbor D, but D already visited. Backtrack.' });
  snap(steps, s, 'Visit C. D already visited, so no recursion. Backtrack to A.', 6);

  s.nodes[4].visited = true;
  s.nodes[4].state = 'active';
  s.nodes[2].state = 'idle';
  s.metrics.visited = 5;
  s.packets = [packet('n0', 'n4', 'recurse')];
  s.events.push({ type: 'ok', msg: 'Visit E. No neighbors. Backtrack. All nodes visited. Order: A→B→D→C→E.' });
  snap(steps, s, 'Visit E. No unvisited neighbors. DFS complete. Visited order: A, B, D, C, E.', 7);

  return steps;
}

const CODE = [
  'function dfs(graph, node, visited = new Set()) {',
  '  visited.add(node);',
  '  console.log(node);',
  '',
  '  for (let neighbor of graph[node]) {',
  '    if (!visited.has(neighbor)) {',
  '      dfs(graph, neighbor, visited);',
  '    }',
  '  }',
  '}',
  '',
  '// Iterative with explicit stack',
  'function dfsIterative(graph, start) {',
  '  const visited = new Set();',
  '  const stack = [start];',
  '  while (stack.length) {',
  '    const node = stack.pop();',
  '    if (visited.has(node)) continue;',
  '    visited.add(node);',
  '    for (let neighbor of graph[node]) {',
  '      if (!visited.has(neighbor)) {',
  '        stack.push(neighbor);',
  '      }',
  '    }',
  '  }',
  '}',
];

export default {
  id: 'dfs',
  label: 'Depth-First Search (DFS)',
  icon: '🔍',
  build: buildDFSSteps,
  code: CODE,
  language: 'JavaScript',
  concepts: GRAPH_CONCEPTS,
  codeNotes: [
    { title: 'Recursion Stack', content: 'Recursive DFS uses call stack (O(h) space, h=height or O(V) worst case). Iterative DFS uses explicit stack, same complexity but more control.' },
    { title: 'Backtracking', content: 'When no unvisited neighbors, return from current recursion. Explores one branch completely before trying alternatives.' },
    { title: 'Order Dependency', content: 'Visits neighbors in order they appear. Different adjacency list orders = different traversal order. BFS always same (breadth-first guaranteed).' },
    { title: 'Cycle Detection', content: 'DFS naturally detects cycles: back edge = already visited node. In directed graphs, need to distinguish back vs cross edges.' },
  ],
  tradeoffs: [
    { pro: 'Memory efficient: O(log V) to O(V) stack vs O(V) queue', con: 'Stack overflow risk on very deep graphs (e.g., 1M nodes chain).' },
    { pro: 'Good for cycle detection, topological sort, SCCs', con: 'Doesn\'t find shortest path; path found depends on order.' },
    { pro: 'Simple recursive implementation', con: 'Harder to parallelize than BFS (sequential recursion).' },
    { pro: 'Explores one complete branch before backtracking', con: 'Slow on wide, shallow graphs (explores narrow branches first).' },
  ],
  bestPractices: [
    'Use recursion for clarity if depth <1000 nodes (call stack limit). Switch to iterative for deeper graphs.',
    'For cycle detection, mark nodes as visiting (gray) vs visited (black). Back edge to gray = cycle.',
    'In topological sort, finish time order gives correct topological order (reverse postorder of DFS).',
    'For bipartite graph check, use DFS with 2-coloring. Assign colors alternately; if conflict = not bipartite.',
    'Memory profile: DFS stack uses O(h) where h=depth. On tree, O(log n) balanced vs O(n) skewed. Check recursion depth limits in production.',
  ],
  metrics: [
    { key: 'visited', label: 'Visited', max: 5, color: 'var(--pod-running)' },
    { key: 'stack', label: 'Stack Depth', max: 5, color: 'var(--node-default)' },
  ],
};
