export default {
    topic: 'Graph/DFS',
    title: 'Number of Islands',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { grid } = input;
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  const dfs = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') return;
    grid[r][c] = '0';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  };

  tracer.step('Start', 'Count islands', { matrix: grid });

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === '1') {
        dfs(i, j);
        count++;
        tracer.step('Island', \`Found island \${count}\`, { matrix: grid });
      }
    }
  }

  return count;
};`,
    explanation: 'Count number of islands using DFS. Time: O(m*n), Space: O(m*n).',
    defaultInput: { grid: [['1', '1', '0'], ['1', '0', '1'], ['1', '1', '1']] },
    testCases: [{ input: { grid: [['1', '0', '1']] }, expected: 2 }],
}
