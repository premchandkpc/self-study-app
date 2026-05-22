import { AlgorithmCompiler } from '../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

// KMP Pattern Matching
const kmpAlgorithm = (input, tracer) => {
  const { text, pattern } = input;
  const n = text.length, m = pattern.length;

  tracer.step('Initialize', `Find pattern "${pattern}" in "${text}"`, input);

  let matches = [];
  for (let i = 0; i <= n - m; i++) {
    let match = true;
    for (let j = 0; j < m; j++) {
      if (text[i + j] !== pattern[j]) {
        match = false;
        tracer.step('Mismatch', `At position ${i+j}: '${text[i+j]}' ≠ '${pattern[j]}'`,
          { text, pattern, textPos: i + j, patternPos: j });
        break;
      }
    }
    if (match) {
      matches.push(i);
      tracer.found(i, { state: { text, pattern, position: i } });
      tracer.step('Match Found', `Pattern matches at position ${i}`,
        { text, pattern, position: i, matches: [...matches] });
    }
  }

  return matches;
};

// Sliding Window Anagram
const anagramAlgorithm = (input, tracer) => {
  const { text, pattern } = input;
  if (pattern.length > text.length) return [];

  tracer.step('Initialize', `Find anagrams of "${pattern}" in "${text}"`, input);

  const needed = {};
  for (let c of pattern) needed[c] = (needed[c] || 0) + 1;

  const window = {};
  let matches = [];
  let formed = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    window[ch] = (window[ch] || 0) + 1;
    if (ch in needed && window[ch] === needed[ch]) formed++;

    if (i >= pattern.length - 1) {
      if (formed === Object.keys(needed).length) {
        matches.push(i - pattern.length + 1);
        tracer.found(i - pattern.length + 1, { state: { text, pattern, position: i - pattern.length + 1 } });
      }

      const leftChar = text[i - pattern.length + 1];
      window[leftChar]--;
      if (leftChar in needed && window[leftChar] < needed[leftChar]) formed--;
    }

    tracer.step('Slide', `Window at [${Math.max(0, i - pattern.length + 1)}..${i}]`,
      { text, pattern, windowStart: Math.max(0, i - pattern.length + 1), windowEnd: i });
  }

  return matches;
};

// Palindrome Check (Expand Around Center)
const palindromeAlgorithm = (input, tracer) => {
  const { string } = input;
  let longest = '';
  let maxLen = 0;

  tracer.step('Start', `Find longest palindrome in "${string}"`, input);

  function expand(left, right) {
    while (left >= 0 && right < string.length && string[left] === string[right]) {
      const substr = string.slice(left, right + 1);
      if (substr.length > maxLen) {
        maxLen = substr.length;
        longest = substr;
        tracer.step('Found Palindrome', `"${substr}" (length ${maxLen})`,
          { string, palindrome: substr, length: maxLen });
      }
      left--;
      right++;
    }
  }

  for (let c = 0; c < string.length; c++) {
    expand(c, c);      // odd length
    expand(c, c + 1);  // even length
  }

  tracer.found(longest, { state: { string, palindrome: longest, length: maxLen } });
  return longest;
};

export const SCENARIOS = [
  {
    id: 'kmp',
    label: 'Pattern Matching (KMP)',
    icon: '🔎',
    code: `const algorithm = (input, tracer) => {
  const { text, pattern } = input;
  let matches = [];
  for (let i = 0; i <= text.length - pattern.length; i++) {
    let match = true;
    for (let j = 0; j < pattern.length; j++) {
      if (text[i + j] !== pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) matches.push(i);
  }
  return matches;
};`,
    language: 'javascript',
    inputs: [
      { key: 'text', label: 'Text', type: 'text', default: 'ABABDABACDABABCABAB' },
      { key: 'pattern', label: 'Pattern', type: 'text', default: 'ABABCABAB' },
    ],
    build(params = {}) {
      const text = String(params.text || 'ABABDABACDABABCABAB');
      const pattern = String(params.pattern || 'ABABCABAB');
      return compiler.compile(kmpAlgorithm, { text, pattern });
    },
  },
  {
    id: 'sliding-window',
    label: 'Sliding Window Anagram',
    icon: '🪟',
    code: `const algorithm = (input, tracer) => {
  const { text, pattern } = input;
  if (pattern.length > text.length) return [];
  const needed = {};
  for (let c of pattern) needed[c] = (needed[c] || 0) + 1;
  // Find all anagram positions...
  return [];
};`,
    language: 'javascript',
    inputs: [
      { key: 'text', label: 'Text', type: 'text', default: 'cbaebabacd' },
      { key: 'pattern', label: 'Pattern', type: 'text', default: 'abc' },
    ],
    build(params = {}) {
      const text = String(params.text || 'cbaebabacd');
      const pattern = String(params.pattern || 'abc');
      return compiler.compile(anagramAlgorithm, { text, pattern });
    },
  },
  {
    id: 'palindrome',
    label: 'Longest Palindrome',
    icon: '🔄',
    code: `const algorithm = (input, tracer) => {
  const { string } = input;
  let longest = '';
  function expand(left, right) {
    while (left >= 0 && right < string.length && string[left] === string[right]) {
      if (string.slice(left, right + 1).length > longest.length) {
        longest = string.slice(left, right + 1);
      }
      left--; right++;
    }
  }
  for (let c = 0; c < string.length; c++) {
    expand(c, c); expand(c, c + 1);
  }
  return longest;
};`,
    language: 'javascript',
    inputs: [
      { key: 'string', label: 'String', type: 'text', default: 'babad' },
    ],
    build(params = {}) {
      const string = String(params.string || 'babad').slice(0, 16);
      return compiler.compile(palindromeAlgorithm, { string });
    },
  },
];
