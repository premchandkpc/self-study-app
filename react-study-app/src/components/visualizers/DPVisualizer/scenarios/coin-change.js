import { snap, INF } from './shared';

function buildCoinChangeSteps() {
  const steps = [];
  const coins = [1, 3, 4];
  const target = 7;

  const s = {
    kind: '1d',
    dp: [INF].fill(INF, 0, target + 1).map((_, i) => (i === 0 ? 0 : INF)),
    labels: Array.from({ length: target + 1 }, (_, i) => i),
    active: null,
    deps: [],
    coins,
    target,
    metrics: { solved: 0, minCoins: 0 },
    vars: { coins: coins.join(','), target, amount: null, coin: null, 'dp[amount]': null },
  };
  s.dp = Array.from({ length: target + 1 }, (_, i) => (i === 0 ? 0 : INF));

  snap(steps, s, `Coin Change: find minimum coins to make amount ${target}. Coins: [${coins}]. dp[0]=0, rest=∞.`, 1, 'O(n·k)', 'O(n)');

  for (let amount = 1; amount <= target; amount++) {
    s.active = amount;
    s.deps = [];
    s.vars = { coins: coins.join(','), target, amount, coin: null, 'dp[amount]': s.dp[amount] === INF ? '∞' : s.dp[amount] };
    snap(steps, s, `Computing dp[${amount}]: try each coin to find minimum.`, 4, 'O(n·k)', 'O(n)');

    for (const coin of coins) {
      if (coin <= amount) {
        const prev = amount - coin;
        s.deps = [prev];
        s.vars = { coins: coins.join(','), target, amount, coin, 'dp[amount-coin]': s.dp[prev] === INF ? '∞' : s.dp[prev], 'dp[amount]': s.dp[amount] === INF ? '∞' : s.dp[amount] };
        snap(steps, s, `Coin ${coin}: dp[${amount - coin}] + 1 = ${s.dp[prev] === INF ? '∞' : s.dp[prev] + 1}. Current best = ${s.dp[amount] === INF ? '∞' : s.dp[amount]}.`, 6, 'O(n·k)', 'O(n)');

        if (s.dp[prev] !== INF && s.dp[prev] + 1 < s.dp[amount]) {
          s.dp[amount] = s.dp[prev] + 1;
          s.vars = { coins: coins.join(','), target, amount, coin, 'dp[amount]': s.dp[amount] };
          snap(steps, s, `Update! dp[${amount}] = ${s.dp[amount]} (use coin ${coin} + dp[${prev}]=${s.dp[prev]}).`, 7, 'O(n·k)', 'O(n)');
        }
      }
    }

    if (s.dp[amount] !== INF) s.metrics.solved = amount;
    s.metrics.minCoins = s.dp[target] === INF ? 0 : s.dp[target];
    s.deps = [];
    snap(steps, s, `dp[${amount}] = ${s.dp[amount] === INF ? '∞ (unreachable)' : s.dp[amount] + ' coins'}.`, 9, 'O(n·k)', 'O(n)');
  }

  s.active = null;
  const ans = s.dp[target];
  snap(steps, s, `Done! Minimum coins for ${target}: ${ans === INF ? 'impossible' : ans}. dp[${target}] = ${ans === INF ? '∞' : ans}.`, 11, 'O(n·k)', 'O(n)');

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
  code: COIN_CODE,
  language: 'Java',
  metrics: [
    { key: 'solved',   label: 'Amounts Solved', max: 7, color: 'var(--pod-running)' },
    { key: 'minCoins', label: 'Min Coins',       max: 7, color: 'var(--node-active)' },
  ],
};
