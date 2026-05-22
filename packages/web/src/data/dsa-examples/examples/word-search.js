export default {
    topic: 'Backtracking',
    title: 'Word Search',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { board, word } = input;
  const rows = board.length, cols = board[0].length;

  const dfs = (r, c, index) => {
    if (index === word.length) return true;
    if (r < 0 || r >= rows || c < 0 || c >= cols || board[r][c] !== word[index]) return false;

    const temp = board[r][c];
    board[r][c] = '*';
    tracer.step('Visit', \`Found \${word[index]} at (\${r},\${c})\`, { matrix: board });

    const found = dfs(r + 1, c, index + 1) || dfs(r - 1, c, index + 1) ||
                  dfs(r, c + 1, index + 1) || dfs(r, c - 1, index + 1);

    board[r][c] = temp;
    return found;
  };

  tracer.step('Start', \`Search for word: \${word}\`, { matrix: board });

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (dfs(i, j, 0)) return true;
    }
  }

  return false;
};`,
    explanation: 'Search for word in 2D grid. Time: O(n*m*4^l), Space: O(l).',
    defaultInput: { board: [['a', 'b'], ['c', 'd']], word: 'ab' },
    testCases: [{ input: { board: [['a']], word: 'a' }, expected: true }],
}
