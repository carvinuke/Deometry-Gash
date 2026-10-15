// Self-check: the page loads without errors, and for every level standing still dies
// while some sequence of inputs beats it, both at all and while collecting every coin, and motion is smooth.
// Run: node test/beatable.mjs   (needs playwright: npm i -D playwright)
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// The optional web font may fail to load offline; that is not a game error.
page.on('console', m => (m.type() === 'error' || m.type() === 'assert') && !m.text().startsWith('Failed to load resource') ? errors.push(m.text()) : 0);
await page.goto('file://' + fileURLToPath(new URL('../index.html', import.meta.url)));
await page.waitForTimeout(300);

const results = await page.evaluate(() => LEVELS.flatMap(lvl => [false, true].map(allCoins => {
  const idle = newPlayer(); let idleResult;
  for (let i = 0; i < 100000 && !idleResult; i++) idleResult = step(idle, false, lvl);

  // DFS over hold / release, branching only on frames where the choice changes the outcome.
  // The memo key is coarse, so it can miss a solution but never invents one.
  const seen = new Set(); let furthest = 0;
  const coins = lvl.tiles.filter(t => t.type === 'c').length;
  const won = (r, q) => r === 'win' && (!allCoins || q.coins.length === coins);
  const key = (p, f) => [f, p.mode, p.grav, p.y.toFixed(1), p.vy.toFixed(0), p.used.length, p.coins.length].join('|');
  function go(p, f) {
    for (;;) {
      furthest = Math.max(furthest, p.x);
      const a = { ...p }, ra = step(a, true, lvl);
      const b = { ...p }, rb = step(b, false, lvl);
      if (won(ra, a) || won(rb, b)) return true;
      if (ra === 'win' && rb === 'win') return false;
      f++;
      if (!ra && !rb && a.y === b.y && a.vy === b.vy && a.mode === b.mode && a.grav === b.grav && a.used.length === b.used.length && a.coins.length === b.coins.length) { p = b; continue; }
      const options = [a, b].filter((q, i) => ![ra, rb][i]);
      for (const q of options) {
        const k = key(q, f);
        if (seen.has(k)) continue;
        seen.add(k);
        if (go(q, f)) return true;
      }
      return false;
    }
  }
  return { name: lvl.name, allCoins, idle: idleResult, beatable: go(newPlayer(), 0), furthest: +furthest.toFixed(1), length: lvl.len };
})));
// A triple spike on flat ground needs a jump window a person can hit (it used to be a single frame).
const tripleSpikeFrames = await page.evaluate(() => {
  const lvl = { tiles: [0, 1, 2].map(i => ({ x: 20 + i, y: 0, type: '^', id: i })), len: 30 };
  let n = 0;
  for (let f = 60; f < 130; f++) { const p = newPlayer(); let r = null; for (let i = 0; !r; i++) r = step(p, i === f, lvl); n += r === 'win'; }
  return n;
});
// On a 144 Hz screen the cube should move the same distance every frame (it used to jump in uneven 60 Hz steps).
const glide = await page.evaluate(() => {
  requestAnimationFrame = () => 0; // stop the game's own loop and draw frames by hand
  startLevel(0);
  const xs = [];
  for (let f = 0, now = last; f < 80; f++) { frame(now += 1000 / 144); if (f >= 8) xs.push(was.x + (player.x - was.x) * tween); } // from the first step on
  const d = xs.slice(1).map((x, i) => x - xs[i]);
  return Math.max(...d) - Math.min(...d);
});
await browser.close();
console.table(results);
console.log('frames that clear a triple spike:', tripleSpikeFrames);
if (tripleSpikeFrames < 5) throw new Error('a triple spike should leave at least 5 frames to jump');
if (glide > 0.001) throw new Error(`the cube moves unevenly between frames (spread ${glide} tiles)`);
if (errors.length) throw new Error('page errors: ' + errors.join('; '));
for (const r of results) {
  if (r.idle !== 'dead') throw new Error(`${r.name}: standing still should die`);
  if (!r.beatable) throw new Error(`${r.name}: not beatable${r.allCoins ? ' with all coins' : ''} (got to x=${r.furthest})`);
}
console.log('OK');
