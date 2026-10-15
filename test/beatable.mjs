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
  for (let i = 0; i < 100000 && !idleResult; i++) idleResult = step(idle, false, lvl, false);

  // This reachability search is a coarse screen, not a difficulty or timing proof.
  // Dedicated runway-margin checks below cover the timing gap that this search missed.
  const seen = new Set(); let furthest = 0;
  const coins = lvl.tiles.filter(t => t.type === 'c').length;
  const won = (r, q) => r === 'win' && (!allCoins || q.coins.length === coins);
  const key = (p, f) => [f, p.mode, p.grav, p.y.toFixed(1), p.vy.toFixed(0), p.coyote.toFixed(2), p.jumpBuffer.toFixed(2), p.used.length, p.coins.length].join('|');
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
const orbLaunches = await page.evaluate(() => {
  const launch = type => {
    const lvl = { tiles: [{ id: 0, x: 1, y: 2, type }], len: 10 };
    const p = newPlayer(); p.x = 0.2; p.y = 1.2; p.vy = 5; p.grounded = false; p.coyote = 0;
    step(p, true, lvl, true);
    const first = p.vy;
    step(p, true, lvl, false); // staying inside the orb cannot retrigger it
    return { first, second: p.vy, used: p.used.length };
  };
  return { standard: launch('o'), boost: launch('b'), standardValue: JUMP, boostValue: BOOST_ORB_JUMP, redPad: RED_PAD, yellowPad: PAD };
});
// Red pads must clear their whole grounded spike runway with timing margin at every
// frame phase. This catches levels that are theoretically reachable only on a razor edge.
const redPadRunways = await page.evaluate(() => LEVELS.flatMap(lvl => lvl.tiles.filter(t => t.type === 'r').map(pad => {
  let count = 0;
  while (lvl.tiles.some(t => t.x === pad.x + 1 + count && t.y === 0 && t.type === '^')) count++;
  const probe = { len: 15, tiles: lvl.tiles.filter(t => t.x >= pad.x && t.x < pad.x + 10).map(t => ({ ...t, x: t.x - pad.x + 3 })) };
  const phases = [];
  for (let phase = 0; phase < 1; phase += 1 / 12) {
    const p = newPlayer(); p.x = 2 + phase; let result = null, launched = false, landing = null;
    for (let f = 0; f < 180 && !result && p.x < 13; f++) {
      const previousVy = p.vy;
      result = step(p, false, probe, false);
      if (p.vy === RED_PAD && previousVy !== RED_PAD) launched = true;
      if (launched && p.grounded && landing === null) landing = p.x;
    }
    const margin = count && landing !== null ? landing - (3 + count + 0.65) : null;
    phases.push({ result: result ?? (p.x >= 13 ? 'clear' : 'timeout'), launched, margin });
  }
  return { level: lvl.name, count, phases };
})));
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
console.log('orb launch velocities:', orbLaunches);
console.log('red-pad lane results:', redPadRunways.map(r => ({ level: r.level, spikes: r.count,
  minTiles: r.count ? +Math.min(...r.phases.map(p => p.margin ?? -Infinity)).toFixed(2) : 'n/a',
  phases: r.phases.filter(p => p.result !== 'clear' || !p.launched).length })));
if (tripleSpikeFrames < 5) throw new Error('a triple spike should leave at least 5 frames to jump');
if (orbLaunches.standard.first !== orbLaunches.standardValue || orbLaunches.boost.first !== orbLaunches.boostValue || orbLaunches.boost.second >= orbLaunches.boost.first || orbLaunches.boost.used !== 1) throw new Error('cyan boost orbs should give one controlled stronger launch');
if (glide > 0.001) throw new Error(`the cube moves unevenly between frames (spread ${glide} tiles)`);
if (errors.length) throw new Error('page errors: ' + errors.join('; '));
for (const r of results) {
  if (r.idle !== 'dead') throw new Error(`${r.name}: standing still should die`);
  if (!r.beatable) throw new Error(`${r.name}: not beatable${r.allCoins ? ' with all coins' : ''} (got to x=${r.furthest})`);
}
for (const r of redPadRunways) {
  const minMargin = r.count ? Math.min(...r.phases.map(p => p.margin ?? -Infinity)) : Infinity;
  if (orbLaunches.redPad <= orbLaunches.yellowPad || orbLaunches.redPad > orbLaunches.yellowPad + 2 || r.count > 4 || minMargin < 0.5 || r.phases.some(p => p.result !== 'clear' || !p.launched)) {
    throw new Error(`${r.level}: red pad lane needs a playable clearance margin (spikes=${r.count}, min=${minMargin})`);
  }
}
console.log('OK');
