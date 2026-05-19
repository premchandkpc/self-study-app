export function buildAdjacency(nodes, edges) {
  const adj = {};
  nodes.forEach((n) => (adj[n.id] = []));
  edges.forEach(({ from, to }) => {
    adj[from].push(to);
    adj[to].push(from);
  });
  return adj;
}

export function buildBFSSteps(nodes, edges, startId) {
  const adj = buildAdjacency(nodes, edges);
  const steps = [];
  const visited = new Set();
  const queue = [startId];
  visited.add(startId);

  function snapshot(nodeStates, edgeStates, narration, codeLine, vars = {}) {
    steps.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      vars,
      narration,
      codeLine,
      complexity: { ops: steps.length + 1, label: 'O(V+E)', space: 'O(V)' },
    });
  }

  const nodeStates = Object.fromEntries(nodes.map((n) => [n.id, 'default']));
  const edgeStates = Object.fromEntries(
    edges.map((e) => [`${e.from}-${e.to}`, 'default'])
  );

  nodeStates[startId] = 'active';
  snapshot(nodeStates, edgeStates, `BFS starts at node ${startId}. Push to queue.`, 2,
    { curr: null, queue: [...queue], visited: [...visited], neighbor: null });

  while (queue.length) {
    const curr = queue.shift();
    nodeStates[curr] = 'visiting';
    snapshot(nodeStates, edgeStates, `Dequeue ${curr}. Visit neighbors.`, 5,
      { curr, queue: [...queue], visited: [...visited], neighbor: null });

    for (const neighbor of adj[curr]) {
      const edgeKey = `${curr}-${neighbor}`;
      const edgeKeyRev = `${neighbor}-${curr}`;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        edgeStates[edgeKey] = edgeStates[edgeKeyRev] = 'active';
        nodeStates[neighbor] = 'active';
        snapshot(nodeStates, edgeStates, `${curr} → ${neighbor}: unvisited. Enqueue ${neighbor}.`, 7,
          { curr, neighbor, queue: [...queue], visited: [...visited] });
      } else {
        edgeStates[edgeKey] = edgeStates[edgeKeyRev] = 'visited';
        snapshot(nodeStates, edgeStates, `${curr} → ${neighbor}: already visited. Skip.`, 8,
          { curr, neighbor, queue: [...queue], visited: [...visited] });
      }
    }
    nodeStates[curr] = 'visited';
    snapshot(nodeStates, edgeStates, `${curr} fully processed. Mark visited.`, 10,
      { curr, queue: [...queue], visited: [...visited], neighbor: null });
  }

  Object.keys(nodeStates).forEach((id) => {
    if (nodeStates[id] !== 'visited') nodeStates[id] = 'done';
    else nodeStates[id] = 'done';
  });
  snapshot(nodeStates, edgeStates, `BFS complete. All reachable nodes visited.`, 12,
    { curr: null, queue: [], visited: [...visited], neighbor: null });
  return steps;
}

export function buildDFSSteps(nodes, edges, startId) {
  const adj = buildAdjacency(nodes, edges);
  const steps = [];
  const visited = new Set();

  const nodeStates = Object.fromEntries(nodes.map((n) => [n.id, 'default']));
  const edgeStates = Object.fromEntries(
    edges.map((e) => [`${e.from}-${e.to}`, 'default'])
  );

  function snapshot(narration, codeLine, vars = {}) {
    steps.push({
      nodeStates: { ...nodeStates },
      edgeStates: { ...edgeStates },
      vars,
      narration,
      codeLine,
      complexity: { ops: steps.length + 1, label: 'O(V+E)', space: 'O(V)' },
    });
  }

  function dfs(node) {
    visited.add(node);
    nodeStates[node] = 'active';
    snapshot(`DFS enters ${node}. Mark active.`, 3,
      { node, neighbor: null, visited: [...visited], stack: node });

    for (const neighbor of adj[node]) {
      const ek = `${node}-${neighbor}`;
      const ekr = `${neighbor}-${node}`;
      if (!visited.has(neighbor)) {
        edgeStates[ek] = edgeStates[ekr] = 'active';
        snapshot(`${node} → ${neighbor}: recurse deeper.`, 6,
          { node, neighbor, visited: [...visited], action: 'recurse' });
        dfs(neighbor);
        edgeStates[ek] = edgeStates[ekr] = 'visited';
      } else {
        snapshot(`${node} → ${neighbor}: already visited. Back-edge.`, 8,
          { node, neighbor, visited: [...visited], action: 'back-edge' });
      }
    }
    nodeStates[node] = 'visited';
    snapshot(`${node} backtrack. Mark done.`, 10,
      { node, neighbor: null, visited: [...visited], action: 'backtrack' });
  }

  dfs(startId);
  Object.keys(nodeStates).forEach((id) => (nodeStates[id] = 'done'));
  snapshot('DFS complete.', 12,
    { node: null, neighbor: null, visited: [...visited], action: 'done' });
  return steps;
}

const BFS_CODE = [
  'function bfs(graph, start) {',
  '  const visited = new Set([start]);',
  '  const queue = [start];',
  '  while (queue.length) {',
  '    const node = queue.shift();',
  '    visit(node);',
  '    for (const nb of graph[node]) {',
  '      if (!visited.has(nb)) {',
  '        visited.add(nb); queue.push(nb);',
  '      }',
  '    }',
  '  }',
  '}',
];

const DFS_CODE = [
  'function dfs(graph, node, visited = new Set()) {',
  '  visited.add(node);',
  '  visit(node);',
  '  for (const nb of graph[node]) {',
  '    if (!visited.has(nb)) {',
  '      dfs(graph, nb, visited);',
  '    } else {',
  '      // back-edge',
  '    }',
  '  }',
  '  // backtrack',
  '}',
];

export const ALGO_CODE = { bfs: BFS_CODE, dfs: DFS_CODE };

const _NODES = [
  { id: 'A', x: 260, y: 60  }, { id: 'B', x: 120, y: 180 }, { id: 'C', x: 400, y: 180 },
  { id: 'D', x: 60,  y: 300 }, { id: 'E', x: 200, y: 300 }, { id: 'F', x: 340, y: 300 }, { id: 'G', x: 460, y: 300 },
];
const _EDGES = [['A','B'],['A','C'],['B','D'],['B','E'],['C','F'],['C','G']].map(([from, to]) => ({ from, to }));

const _VALID_IDS = new Set(_NODES.map((n) => n.id));
const _ID_LIST = _NODES.map((n) => n.id).join(', ');

export const SCENARIOS = [
  {
    id: 'bfs', label: 'BFS', icon: '🌊',
    build: ({ start = 'A' } = {}) => {
      const s = _VALID_IDS.has(String(start).toUpperCase()) ? String(start).toUpperCase() : 'A';
      return buildBFSSteps(_NODES, _EDGES, s);
    },
    inputs: [{ key: 'start', label: `Start node (${_ID_LIST})`, type: 'string', default: 'A', maxLen: 1 }],
    code: BFS_CODE, language: 'JavaScript', metrics: [],
  },
  {
    id: 'dfs', label: 'DFS', icon: '🌀',
    build: ({ start = 'A' } = {}) => {
      const s = _VALID_IDS.has(String(start).toUpperCase()) ? String(start).toUpperCase() : 'A';
      return buildDFSSteps(_NODES, _EDGES, s);
    },
    inputs: [{ key: 'start', label: `Start node (${_ID_LIST})`, type: 'string', default: 'A', maxLen: 1 }],
    code: DFS_CODE, language: 'JavaScript', metrics: [],
  },
];
