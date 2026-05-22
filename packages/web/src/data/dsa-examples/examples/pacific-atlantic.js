export default {
    topic: 'Graph/DFS',
    title: 'Pacific Atlantic Water Flow',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { heights } = input;
  const rows = heights.length, cols = heights[0].length;
  const pacific = Array.from({ length: rows }, () => Array(cols).fill(false));
  const atlantic = Array.from({ length: rows }, () => Array(cols).fill(false));

  const dfs = (r, c, visited, prevHeight) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || visited[r][c] || heights[r][c] < prevHeight) return;
    visited[r][c] = true;
    tracer.step('Visit', \`Height \${heights[r][c]}\`, { matrix: heights });
    dfs(r + 1, c, visited, heights[r][c]);
    dfs(r - 1, c, visited, heights[r][c]);
    dfs(r, c + 1, visited, heights[r][c]);
    dfs(r, c - 1, visited, heights[r][c]);
  };

  tracer.step('Start', 'Find water flow', { matrix: heights });

  for (let r = 0; r < rows; r++) {
    dfs(r, 0, pacific, 0);
    dfs(r, cols - 1, atlantic, 0);
  }

  for (let c = 0; c < cols; c++) {
    dfs(0, c, pacific, 0);
    dfs(rows - 1, c, atlantic, 0);
  }

  const result = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pacific[r][c] && atlantic[r][c]) result.push([r, c]);
    }
  }

  return result;
};`,
    explanation: 'Find cells from which water flows to both oceans. Time: O(m*n), Space: O(m*n).',
    defaultInput: { heights: [[4, 2, 7], [7, 4, 8], [8, 5, 2]] },
    testCases: [{ input: { heights: [[1]] }, expected: [[0, 0]] }],
}
