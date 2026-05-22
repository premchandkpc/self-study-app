export default {
    topic: 'Backtracking/DP',
    title: 'Palindrome Partitioning',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  const result = [];
  const isPalin = (s, l, r) => {
    while (l < r) {
      if (s[l] !== s[r]) return false;
      l++;
      r--;
    }
    return true;
  };

  const backtrack = (start, current) => {
    if (start === string.length) {
      result.push([...current]);
      tracer.step('Found', 'Partition complete', { string, text: string });
      return;
    }

    for (let end = start; end < string.length; end++) {
      if (isPalin(string, start, end)) {
        current.push(string.slice(start, end + 1));
        tracer.step('Partition', \`Added \${string.slice(start, end + 1)}\`, { string, text: string });
        backtrack(end + 1, current);
        current.pop();
      }
    }
  };

  tracer.step('Start', 'Find palindrome partitions', { string, text: string });
  backtrack(0, []);
  return result;
};`,
    explanation: 'Partition string into palindromic substrings. Time: O(n*2^n), Space: O(n).',
    defaultInput: { string: 'aab' },
    testCases: [{ input: { string: 'a' }, expected: [['a']] }],
}
