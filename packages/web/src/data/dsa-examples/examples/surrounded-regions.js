export default {
    topic: 'Graph/DFS',
    title: 'Surrounded Regions',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { board } = input;
  const rows = board.length, cols = board[0].length;

  const dfs = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== 'O') return;
    board[r][c] = 'T';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  };

  tracer.step('Start', 'Find surrounded Os', { matrix: board });

  for (let r = 0; r < rows; r++) {
    dfs(r, 0);
    dfs(r, cols - 1);
  }

  for (let c = 0; c < cols; c++) {
    dfs(0, c);
    dfs(rows - 1, c);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] === 'T') {
        board[r][c] = 'O';
      } else {
        board[r][c] = 'X';
      }
    }
  }

  return board;
};`,
    explanation: 'Replace surrounded Os with Xs. Time: O(m*n), Space: O(m*n).',
    defaultInput: { board: [['X', 'X', 'X'], ['X', 'O', 'X'], ['X', 'X', 'X']] },
    testCases: [{ input: { board: [['X', 'O', 'X']] }, expected: [['X', 'O', 'X']] }],
}
