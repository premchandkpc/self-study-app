import { AlgorithmCompiler } from '../../../../core/compiler/AlgorithmCompiler';

const compiler = new AlgorithmCompiler();

const fibonacciAlgorithm = (input, tracer) => {
  const { n } = input;
  tracer.step('Initialize', `Compute Fibonacci(${n})`, input);
  
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
    tracer.step('Compute', `dp[${i}] = dp[${i-1}] + dp[${i-2}] = ${dp[i]}`,
      { n, dp: [...dp.slice(0, i + 1)] });
  }
  
  tracer.found(dp[n], { state: { n, dp, result: dp[n] } });
  return dp[n];
};

const coinChangeAlgorithm = (input, tracer) => {
  const { coins, amount } = input;
  tracer.step('Initialize', `Min coins for amount=${amount}`, input);
  
  const dp = Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  
  for (let i = 0; i <= amount; i++) {
    if (dp[i] === Infinity) continue;
    for (let coin of coins) {
      if (i + coin <= amount && dp[i] + 1 < dp[i + coin]) {
        dp[i + coin] = dp[i] + 1;
        tracer.step('Update', `dp[${i + coin}] = ${dp[i + coin]} coins`,
          { coins, amount, dp: [...dp] });
      }
    }
  }
  
  const result = dp[amount] === Infinity ? -1 : dp[amount];
  tracer.found(result, { state: { coins, amount, result } });
  return result;
};

const knapsackAlgorithm = (input, tracer) => {
  const { weights, values, capacity } = input;
  const n = weights.length;
  tracer.step('Initialize', `Knapsack (capacity=${capacity})`, input);
  
  const dp = Array(capacity + 1).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
      tracer.step('Item', `Item ${i}: weight=${weights[i]}, value=${values[i]}`,
        { weights, values, capacity, dp: [...dp] });
    }
  }
  
  tracer.found(dp[capacity], { state: { weights, values, capacity, result: dp[capacity] } });
  return dp[capacity];
};

export const SCENARIOS = [
  {
    id: 'fibonacci',
    label: 'Fibonacci',
    icon: '🔢',
    code: `const algorithm = (input, tracer) => {
  const { n } = input;
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
};`,
    language: 'javascript',
    inputs: [
      { key: 'n', label: 'n', type: 'number', default: 6, min: 0, max: 10 },
    ],
    build(params = {}) {
      const n = Math.max(0, Math.min(10, Math.floor(params.n || 6)));
      return compiler.compile(fibonacciAlgorithm, { n });
    },
  },
  {
    id: 'coin-change',
    label: 'Coin Change',
    icon: '💰',
    code: `const algorithm = (input, tracer) => {
  const { coins, amount } = input;
  const dp = Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 0; i <= amount; i++) {
    if (dp[i] !== Infinity) {
      for (let coin of coins) {
        dp[i + coin] = Math.min(dp[i + coin], dp[i] + 1);
      }
    }
  }
  return dp[amount];
};`,
    language: 'javascript',
    inputs: [
      { key: 'coins', label: 'Coins', type: 'array-num', default: [1, 2, 5] },
      { key: 'amount', label: 'Amount', type: 'number', default: 5 },
    ],
    build(params = {}) {
      const coins = Array.isArray(params.coins) ? params.coins : [1, 2, 5];
      const amount = Math.max(1, Math.floor(params.amount || 5));
      return compiler.compile(coinChangeAlgorithm, { coins, amount });
    },
  },
  {
    id: 'knapsack',
    label: '0/1 Knapsack',
    icon: '🎒',
    code: `const algorithm = (input, tracer) => {
  const { weights, values, capacity } = input;
  const dp = Array(capacity + 1).fill(0);
  for (let i = 0; i < weights.length; i++) {
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  return dp[capacity];
};`,
    language: 'javascript',
    inputs: [
      { key: 'weights', label: 'Weights', type: 'array-num', default: [1, 2, 3] },
      { key: 'values', label: 'Values', type: 'array-num', default: [1, 4, 5] },
      { key: 'capacity', label: 'Capacity', type: 'number', default: 4 },
    ],
    build(params = {}) {
      const weights = Array.isArray(params.weights) ? params.weights : [1, 2, 3];
      const values = Array.isArray(params.values) ? params.values : [1, 4, 5];
      const capacity = Math.max(1, Math.floor(params.capacity || 4));
      return compiler.compile(knapsackAlgorithm, { weights, values, capacity });
    },
  },
];
