// Self-check: the level loads without errors, standing still dies, and some jump timing beats it.
// Run: node test/beatable.mjs   (needs playwright: npm i -D playwright)
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => m.type() === 'error' || m.type() === 'assert' ? errors.push(m.text()) : 0);
await page.goto('file://' + fileURLToPath(new URL('../index.html', import.meta.url)));
await page.waitForTimeout(300);

const result = await page.evaluate(() => {
  const idle = newPlayer(); let r; for (let i = 0; i < 10000 && !r; i++) r = step(idle, false);
  // DFS over "jump or not" on every grounded frame; memo dead states by frame + height.
  const seen = new Set();
  function solve(p, f) {
    for (;;) {
      if (p.grounded) {
        const key = f + ':' + p.y.toFixed(3);
        if (seen.has(key)) return null;
        seen.add(key);
        const q = { ...p }; const r = step(q, true);
        if (r === 'win') return [f];
        if (!r) { const s = solve(q, f + 1); if (s) return [f, ...s]; }
      }
      const r = step(p, false); f++;
      if (r === 'win') return [];
      if (r === 'dead') return null;
    }
  }
  return { idle: r, jumps: solve(newPlayer(), 0) };
});
await browser.close();
console.log(result);
if (errors.length) throw new Error('page errors: ' + errors.join('; '));
if (result.idle !== 'dead') throw new Error('standing still should die');
if (!result.jumps) throw new Error('level is not beatable');
console.log('OK');
