export default {
    topic: 'Arrays',
    title: 'Best Time to Buy and Sell Stock',
    language: 'javascript',
    code: `const algorithm = (input, tracer) => {
  const { prices } = input;
  let minPrice = prices[0], maxProfit = 0;

  tracer.step('Start', \`Min price: \${minPrice}\`, { prices, minPrice, maxProfit, i: 0 });

  for (let i = 1; i < prices.length; i++) {
    const profit = prices[i] - minPrice;
    maxProfit = Math.max(maxProfit, profit);
    minPrice = Math.min(minPrice, prices[i]);
    tracer.step('Check', \`Price \${prices[i]}, Profit \${profit}\`, { prices, minPrice, maxProfit, i });
  }

  return maxProfit;
};`,
    explanation: 'Find max profit from buying and selling once. Time: O(n), Space: O(1).',
    defaultInput: { prices: [7, 1, 5, 3, 6, 4] },
    testCases: [{ input: { prices: [7, 6, 4, 3, 1] }, expected: 0 }],
}
