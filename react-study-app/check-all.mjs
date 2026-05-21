import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', err => errors.push(`PAGE_ERROR: ${err.message}`));
page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE_ERROR: ${msg.text()}`); });

const urls = [
  ['/visualizer/systemdesign', 'SD visualizer no scenarioId'],
  ['/visualizer/systemdesign/lb', 'SD Load Balancer'],
  ['/visualizer/uber/uber', 'Uber visualizer'],
  ['/topics/system-design', 'System Design topic page'],
];

for (const [path, label] of urls) {
  errors.length = 0;
  await page.goto(`http://localhost:5173${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);
  const text = await page.evaluate(() => document.body.innerText);
  const vizRelated = text.includes('Load Balancer') || text.includes('Simulate') || text.includes('▶');
  console.log(`\n=== ${label} (${path}) ===`);
  console.log(`Has viz content: ${vizRelated}`);
  console.log(`Errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  const first500 = text.substring(0, 500).replace(/\n/g, ' | ');
  console.log(`Preview: ${first500}`);
}

await browser.close();
