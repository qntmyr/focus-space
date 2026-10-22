// Smoke test: the production build boots, the editor takes input and the
// page logs no errors. Run with `npm test` (needs `npm run build` first).
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { port: 4173, strictPort: true } });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));

try {
  await page.goto('http://localhost:4173/app/');
  await page.waitForSelector('.ProseMirror', { timeout: 10000 });
  await page.click('.ProseMirror');
  await page.keyboard.type('Smoke test');
  const text = await page.textContent('.ProseMirror');
  if (!text.includes('Smoke test')) throw new Error(`editor text mismatch: ${text}`);
  if (errors.length) throw new Error(`console errors:\n${errors.join('\n')}`);
  console.log('smoke test passed');
} finally {
  await browser.close();
  await server.close();
}
