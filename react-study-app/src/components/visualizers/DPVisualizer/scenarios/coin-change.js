import { snap, INF } from './shared';

function buildCoinChangeSteps({ coins = [1, 3, 4], target = 7 } = {}) {
  coins = coins.filter((c) => Number.isInteger(c) && c > 0).slice(0, 6);
  target = Math.max(1, Math.min(target, 20));
  if (!coins.length) coins = [1];

  const steps = [];
  const dp = Array.from({ length: target + 1 }, (_, i) => (i === 0 ? 0 : INF));

  const s = {
    kind: '1d',
    dp: dp.slice(),
    base: [0],
    labels: Array.from({ length: target + 1 }, (_, i) => `amt ${i}`),
    active: null, deps: [], coins, target,
    metrics: { solved: 0, minCoins: 0 },
    vars: { coins: coins.join(','), target, amount: null, coin: null, best: null },
  };

  snap(steps, s, `Coin Change: min coins for amount ${target}. Coins=[${coins}]. dp[0]=0, rest=∞.`, 1, 'O(n·k)', 'O(n)');

  for (let amount = 1; amount <= target; amount++) {
    s.active = amount; s.deps = []; s.dp = dp.slice();
    s.vars = { coins: coins.join(','), target, amount, coin: '-', best: dp[amount] === INF ? '∞' : dp[amount] };
    snap(steps, s, `amount=${amount}: try each coin to find minimum.`, 4, 'O(n·k)', 'O(n)');

    for (const coin of coins) {
      if (coin <= amount) {
        const prev = amount - coin;
        s.deps = [prev]; s.dp = dp.slice();
        s.vars = {
          coins: coins.join(','), target, amount, coin,
          'dp[amount-coin]': dp[prev] === INF ? '∞' : dp[prev],
          'candidate': dp[prev] === INF ? '∞' : dp[prev] + 1,
          best: dp[amount] === INF ? '∞' : dp[amount],
        };
        snap(steps, s, `Coin ${coin}: dp[${amount}-${coin}]+1 = ${dp[prev] === INF ? '∞' : dp[prev] + 1}. Current best=${dp[amount] === INF ? '∞' : dp[amount]}.`, 6, 'O(n·k)', 'O(n)');

        if (dp[prev] !== INF && dp[prev] + 1 < dp[amount]) {
          dp[amount] = dp[prev] + 1;
          s.dp = dp.slice();
          s.vars.best = dp[amount];
          snap(steps, s, `Improved! dp[${amount}] = ${dp[amount]} (use coin ${coin}).`, 7, 'O(n·k)', 'O(n)');
        }
      }
    }

    s.deps = []; s.dp = dp.slice();
    if (dp[amount] !== INF) s.metrics.solved = amount;
    s.metrics.minCoins = dp[target] === INF ? 0 : dp[target];
    s.vars = { coins: coins.join(','), target, amount, coin: '-', best: dp[amount] === INF ? '∞' : dp[amount] };
    snap(steps, s, `dp[${amount}] = ${dp[amount] === INF ? '∞ (unreachable)' : dp[amount] + ' coin(s)'}.`, 9, 'O(n·k)', 'O(n)');
  }

  s.active = null;
  snap(steps, s, `Done! Min coins for amount ${target} = ${dp[target] === INF ? 'impossible' : dp[target]}.`, 11, 'O(n·k)', 'O(n)');
  return steps;
}

export const COIN_CODE = [
  'int coinChange(int[] coins, int amount) {',
  '  int[] dp = new int[amount + 1];',
  '  Arrays.fill(dp, Integer.MAX_VALUE);',
  '  dp[0] = 0;',
  '  for (int a = 1; a <= amount; a++) {',
  '    for (int coin : coins) {',
  '      if (coin <= a && dp[a-coin] != MAX)',
  '        dp[a] = Math.min(dp[a], dp[a-coin] + 1);',
  '    }',
  '  }',
  '  return dp[amount] == MAX ? -1 : dp[amount];',
  '}',
];

export default {
  id: 'coin-change',
  label: 'Coin Change',
  icon: '🪙',
  build: buildCoinChangeSteps,
  inputs: [
    { key: 'coins',  label: 'Coins (comma-sep)', type: 'array-num', default: [1, 3, 4] },
    { key: 'target', label: 'Target amount',     type: 'number',    default: 7, min: 1, max: 20 },
  ],
  code: COIN_CODE,
  language: 'Java',
  metrics: [
    { key: 'solved',   label: 'Amounts solved', max: 20, color: 'var(--pod-running)' },
    { key: 'minCoins', label: 'Min coins',       max: 10, color: 'var(--node-active)' },
  ],
};
