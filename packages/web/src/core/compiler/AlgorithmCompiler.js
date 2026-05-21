// Practical algorithm compiler
// Users write code with tracer.step() calls to mark important operations
// Compiler executes and generates visualization automatically

export class AlgorithmCompiler {
  compile(algorithmFn, inputData, config = {}) {
    const steps = [];
    let lastTime = performance.now();
    const tracer = new Tracer(steps, config, (title, desc, state, meta) => {
      const now = performance.now();
      const duration = Math.round(now - lastTime);
      lastTime = now;
      return this._buildStep(title, desc, state, { ...meta, duration });
    });

    try {
      // Initial state
      lastTime = performance.now();
      steps.push(this._buildStep(
        'Initialize',
        'Set up input data',
        inputData,
        { opsLog: [{ msg: 'Algorithm initialized', type: 'init' }], duration: 0 }
      ));

      // Execute algorithm
      const result = algorithmFn(inputData, tracer);

      // Final step with result
      if (result !== undefined) {
        const now = performance.now();
        const duration = Math.round(now - lastTime);
        steps.push(this._buildStep(
          'Complete',
          `Result: ${this._formatValue(result)}`,
          inputData,
          { opsLog: [{ msg: `Result: ${this._formatValue(result)}`, type: 'success' }], result, duration }
        ));
      }

      return steps;
    } catch (e) {
      console.error('Compilation error:', e);
      return steps;
    }
  }

  _buildStep(title, description, state, metadata = {}) {
    const stateClone = this._cloneState(state);
    const variables = this._extractVariables(stateClone);

    return {
      title,
      description,
      state: stateClone,
      variables, // All variables from state
      ...this._generateVizStructure(stateClone),
      opsLog: metadata.opsLog || [{ msg: description, type: 'info' }],
      ...metadata,
    };
  }

  _extractVariables(state) {
    const vars = {};
    for (const [key, value] of Object.entries(state)) {
      if (!key.startsWith('_')) {
        vars[key] = {
          name: key,
          value,
          type: this._detectType(value),
        };
      }
    }
    return vars;
  }

  _detectType(value) {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    return 'unknown';
  }

  _generateVizStructure(state) {
    const viz = {};

    // Prefix array (prefix sum)
    if (state.prefix) {
      viz.cells = state.prefix.map((val, i) => ({
        value: val,
        val,
        state: state.index === i ? 'highlight' : 'idle',
      }));
      return viz;
    }

    // Array with pointers (two pointers, binary search, etc)
    if (state.array) {
      viz.cells = state.array.map((val, i) => ({
        value: val,
        val,
        state: state.index === i ? 'highlight' : state.left !== undefined && i >= state.left && i <= state.right ? 'active' : 'idle',
      }));

      if (state.left !== undefined || state.right !== undefined || state.mid !== undefined) {
        viz.pointers = {};
        if (state.left !== undefined) viz.pointers.left = state.left;
        if (state.right !== undefined) viz.pointers.right = state.right;
        if (state.mid !== undefined) viz.pointers.mid = state.mid;
      }

      if (state.window !== undefined) {
        viz.window = state.window;
      } else if (state.left !== undefined && state.right !== undefined && state.right - state.left >= 0) {
        viz.window = { left: state.left, right: state.right };
      }
      return viz;
    }

    // String visualization
    if (state.text !== undefined) {
      viz.chars = state.text.split('').map((ch, i) => ({
        char: ch,
        state: state.textPos === i ? 'highlight' : state.windowStart !== undefined && i >= state.windowStart && i <= state.windowEnd ? 'active' : 'idle',
      }));
      if (state.patternPos !== undefined) viz.patternPos = state.patternPos;
      if (state.windowStart !== undefined) viz.windowStart = state.windowStart;
      if (state.windowEnd !== undefined) viz.windowEnd = state.windowEnd;
      return viz;
    }

    if (state.string !== undefined) {
      viz.chars = state.string.split('').map((ch, i) => ({
        char: ch,
        state: state.palindrome && state.palindrome.includes(ch) ? 'highlight' : 'idle',
      }));
      return viz;
    }

    // Linked list visualization
    if (state.list1 !== undefined || state.nodes) {
      const list = state.list1 || state.nodes || [];
      viz.nodes = Array.isArray(list) ? list.map((val, i) => ({
        value: val,
        state: state.slow === i || state.fast === i ? 'highlight' : 'idle',
      })) : list;
      if (state.slow !== undefined) viz.slow = state.slow;
      if (state.fast !== undefined) viz.fast = state.fast;
      return viz;
    }

    // Hash map visualization
    if (state.buckets) {
      viz.buckets = state.buckets;
      return viz;
    }

    // DP table visualization
    if (state.dp || state.table) {
      viz.dp = state.dp || state.table;
      return viz;
    }

    // Matrix visualization
    if (state.matrix) {
      viz.matrix = state.matrix;
      return viz;
    }

    // Tree visualization
    if (state.tree) {
      viz.tree = state.tree;
      return viz;
    }

    // Graph visualization
    if (state.nodeStates) {
      viz.nodeStates = state.nodeStates;
      return viz;
    }

    // Set visualization
    if (state.setA || state.arr1 || state.nums) {
      viz.setA = state.setA;
      if (state.arr1) viz.arr1 = state.arr1;
      if (state.arr2) viz.arr2 = state.arr2;
      if (state.nums) viz.nums = state.nums;
      if (state.k) viz.k = state.k;
      return viz;
    }

    return viz;
  }

  _cloneState(data) {
    const cloned = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        cloned[key] = value.map(v => Array.isArray(v) ? [...v] : v);
      } else if (value !== null && typeof value === 'object') {
        try {
          cloned[key] = JSON.parse(JSON.stringify(value));
        } catch {
          cloned[key] = value;
        }
      } else {
        cloned[key] = value;
      }
    }
    return cloned;
  }

  _formatValue(val) {
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }
}

// Tracer object passed to algorithm
export class Tracer {
  constructor(steps, config, buildStep) {
    this.steps = steps;
    this.config = config;
    this.highlights = {};
    this.buildStep = buildStep || ((title, desc, state, meta) => ({
      title, description: desc, state, opsLog: [{ msg: desc, type: 'info' }], ...meta,
    }));
  }

  // Record a step with state
  step(title, description, state, metadata = {}) {
    const opsLog = metadata.opsLog || [{ msg: description, type: metadata.type || 'info' }];

    this.steps.push(this.buildStep(title, description, state, { opsLog, ...metadata }));
  }

  // Mark comparison operation
  compare(leftVal, op, rightVal, result, context = {}) {
    const description = `${leftVal} ${op} ${rightVal} = ${result}`;
    this.step(
      'Compare',
      description,
      context.state || {},
      {
        opsLog: [{ msg: description, type: 'compare' }],
      }
    );
  }

  // Mark pointer movement
  move(pointerName, newIndex, context = {}) {
    const description = `${pointerName} → ${newIndex}`;
    this.step(
      `Move ${pointerName}`,
      description,
      context.state || {},
      {
        opsLog: [{ msg: description, type: 'move' }],
        highlight: { [pointerName]: newIndex },
      }
    );
  }

  // Mark successful match/result
  found(resultValue, context = {}) {
    this.step(
      'Found',
      `Solution found: ${JSON.stringify(resultValue)}`,
      context.state || {},
      {
        opsLog: [{ msg: `Found: ${JSON.stringify(resultValue)}`, type: 'success' }],
        result: resultValue,
      }
    );
  }
}

// Example: How to use the compiler
export function exampleTwoSum() {
  const compiler = new AlgorithmCompiler();

  // Define algorithm with tracer calls
  const twoSum = (input, tracer) => {
    const { array, target } = input;
    let left = 0;
    let right = array.length - 1;

    tracer.step('Setup', 'Initialize pointers', input, {
      opsLog: [
        { msg: `left = 0, right = ${array.length - 1}`, type: 'init' },
        { msg: `target = ${target}`, type: 'init' },
      ],
    });

    while (left < right) {
      const sum = array[left] + array[right];

      tracer.step(
        'Calculate',
        `arr[${left}] + arr[${right}] = ${sum}`,
        { array, target, left, right },
        {
          opsLog: [{ msg: `sum = ${array[left]} + ${array[right]} = ${sum}`, type: 'compare' }],
        }
      );

      if (sum === target) {
        tracer.found([left, right], {
          state: { array, target, left, right },
        });
        return [left, right];
      }

      if (sum < target) {
        left++;
        tracer.move('left', left, { state: { array, target, left, right } });
      } else {
        right--;
        tracer.move('right', right, { state: { array, target, left, right } });
      }
    }

    return [];
  };

  // Compile
  const testInput = { array: [1, 2, 3, 5, 7, 11], target: 9 };
  return compiler.compile(twoSum, testInput);
}

// Example: Valid palindrome
export function examplePalindrome() {
  const compiler = new AlgorithmCompiler();

  const isPalindrome = (input, tracer) => {
    const { string } = input;
    let left = 0;
    let right = string.length - 1;

    tracer.step('Setup', 'Check both ends', input, {
      opsLog: [
        { msg: `left = 0, right = ${string.length - 1}`, type: 'init' },
      ],
    });

    while (left < right) {
      tracer.step(
        `Compare ${left + 1}`,
        `s[${left}]='${string[left]}' vs s[${right}]='${string[right]}'`,
        { string, left, right },
        {
          opsLog: [
            {
              msg: `'${string[left]}' === '${string[right]}' = ${string[left] === string[right]}`,
              type: 'compare',
            },
          ],
        }
      );

      if (string[left] !== string[right]) {
        return false;
      }

      left++;
      right--;
    }

    tracer.found(true, { state: { string, left, right } });
    return true;
  };

  const testInput = { string: 'racecar' };
  return compiler.compile(isPalindrome, testInput);
}
