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
  const key = (p, f) => [f, p.mode, p.grav, p.y.toFixed(1), p.vy.toFixed(0), p.coyote.toFixed(2), p.jumpBuffer.toFixed(2), p.used.join(','), p.coins.join(',')].join('|');
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
  return { standard: launch('o'), boost: launch('b'), pink: launch('q'), pinkValue: PINK_ORB_JUMP, standardValue: JUMP, boostValue: BOOST_ORB_JUMP, redPad: RED_PAD, yellowPad: PAD };
});
const poleBeat = await page.evaluate(() => {
  const beat = 60 / SONGS[selected % SONGS.length].bpm;
  return { downbeat: beatPulse(0), midpoint: beatPulse(beat / 2) };
});
const obstacleChecks = await page.evaluate(() => {
  const collide = (type, x, y, tileX = 5, tileY = 0) => {
    const p = newPlayer(); p.x = x; p.y = y; p.grounded = false; p.vy = 0;
    return step(p, false, { tiles: [{ id: 999, x: tileX, y: tileY, type }], len: 40 }, false);
  };
  const traps = { x: 5, y: 8 };
  return {
    levels: Object.fromEntries(LEVELS.map(l => [l.name, l.tiles.reduce((a, t) => (a[t.type] = (a[t.type] || 0) + 1, a), {})])),
    ceilingBarHit: collide('h', 5, 2.2, 5, 3), ceilingBarClear: collide('h', 5, 0, 5, 3),
    giantSpikeHit: collide('G', 5, 0), sawHit: collide('s', 5, 0),
    fallingSpikeHit: collide('F', 4.65, 0, traps.x, traps.y), fallingSpikeClear: collide('F', 0, 0, traps.x, traps.y),
    fallingSpikePositions: [fallingSpikeY(traps, 1), fallingSpikeY(traps, 3), fallingSpikeY(traps, 5)],
    poleClear: collide('i', 5, 0),
    risingSpikeHit: collide('R', 5, 0), movingSawHit: collide('m', 5, sawBobY({ x: 5, y: 2 }, 5) - 0.2, 5, 2), movingSawClear: collide('m', 5, 0, 5, 6),
  };
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
console.table(results);
console.log('frames that clear a triple spike:', tripleSpikeFrames);
console.log('orb launch velocities:', orbLaunches);
console.log('pole beat pulse:', poleBeat);
console.log('new obstacle checks:', obstacleChecks);
console.log('red-pad lane results:', redPadRunways.map(r => ({ level: r.level, spikes: r.count,
  minTiles: r.count ? +Math.min(...r.phases.map(p => p.margin ?? -Infinity)).toFixed(2) : 'n/a',
  phases: r.phases.filter(p => p.result !== 'clear' || !p.launched).length })));
if (tripleSpikeFrames < 5) throw new Error('a triple spike should leave at least 5 frames to jump');
if (orbLaunches.standard.first !== orbLaunches.standardValue || orbLaunches.boost.first !== orbLaunches.boostValue || orbLaunches.boost.second >= orbLaunches.boost.first || orbLaunches.boost.used !== 1) throw new Error('cyan boost orbs should give one controlled stronger launch');
if (orbLaunches.pink.first !== orbLaunches.pinkValue || orbLaunches.pinkValue >= orbLaunches.standardValue || orbLaunches.pink.used !== 1) throw new Error('pink orbs should give one short hop');
if (obstacleChecks.risingSpikeHit !== 'dead' || obstacleChecks.movingSawHit !== 'dead' || obstacleChecks.movingSawClear === 'dead') throw new Error('rising spike or moving saw collision is off');
for (const [name, counts] of Object.entries(obstacleChecks.levels)) if (!counts.m && !counts.R && !counts.q) throw new Error(`${name}: use at least one of the newest obstacles (moving saw, rising spike, pink orb)`);
if (glide > 0.001) throw new Error(`the cube moves unevenly between frames (spread ${glide} tiles)`);
if (errors.length) throw new Error('page errors: ' + errors.join('; '));
if (obstacleChecks.ceilingBarHit !== 'dead' || obstacleChecks.ceilingBarClear === 'dead' || obstacleChecks.giantSpikeHit !== 'dead' || obstacleChecks.sawHit !== 'dead' || obstacleChecks.fallingSpikeHit !== 'dead' || obstacleChecks.fallingSpikeClear === 'dead' || obstacleChecks.poleClear === 'dead') throw new Error('new obstacle or pole collision behavior is inconsistent');
if (poleBeat.downbeat !== 1 || poleBeat.midpoint !== 0) throw new Error('pole lights should pop on the beat and relax between beats');
if (obstacleChecks.fallingSpikePositions.some((y, i) => Math.abs(y - [8, 4, 0][i]) > 0.001)) throw new Error('falling spikes should trigger, fall at a fixed rate, and settle on the floor');
for (const name of ['Orb Garden', 'Rolling Thunder', 'Prism Path', 'Tidal Flow']) if ((obstacleChecks.levels[name]?.h || 0) < 4 || !obstacleChecks.levels[name]?.i) throw new Error(`${name}: add hanging hazards and beat-pulsing poles to Normal routes`);
for (const name of ['Sunrise Run', 'Neon Circuit', 'Circuit Breaker']) if (!obstacleChecks.levels[name]?.h || !obstacleChecks.levels[name]?.i) throw new Error(`${name}: aerial hazards and beat-pulsing poles should appear across difficulties`);
for (const [name, counts] of Object.entries(obstacleChecks.levels)) if (!counts.i) throw new Error(`${name}: add a beat-pulsing pole light`);
for (const name of ['First Steps', 'Orb Garden', 'Sky Rush', 'Rolling Thunder', 'Wave Rider', 'Mode Mayhem', 'Demon Gash', 'Prism Path', 'Neon Circuit', 'Sunrise Run', 'Tidal Flow', 'Circuit Breaker', 'Abyssal Run', 'Flutterclunk']) {
  const counts = obstacleChecks.levels[name];
  if (!counts?.G || !counts?.['^']) throw new Error(`${name}: expected added large and small spike hazards`);
}
if (!obstacleChecks.levels['Flutterclunk'] || (obstacleChecks.levels['Flutterclunk'].G || 0) < 3 || (obstacleChecks.levels['Flutterclunk']['^'] || 0) < 12) {
  throw new Error('Flutterclunk: expected a dense Demon layout with large and small spikes');
}
if (!obstacleChecks.levels['Orb Garden']?.s || !obstacleChecks.levels['Prism Path']?.G || !obstacleChecks.levels['Tidal Flow']?.F) throw new Error('the new hazards need representative level placements');
for (const type of ['F', 'h', 'G', 's']) if (!obstacleChecks.levels['Abyssal Run']?.[type]) throw new Error(`Abyssal Run: missing Demon hazard ${type}`);
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
// Editor-saved levels give coins ids past the end of the tile list; collecting one used to crash the game loop.
const lateCoinEffect = await page.evaluate(() => {
  startLevel(0); level = { ...level, tiles: [...level.tiles, { id: 9999, x: 3, y: 0, type: 'c' }] };
  const prev = { grounded: player.grounded, vy: player.vy, mode: player.mode, grav: player.grav, used: 0, coins: 0 };
  player.coins = [9999];
  try { playEffects(prev); return 'ok'; } catch (e) { return e.message; } finally { state = 'menu'; }
});
if (lateCoinEffect !== 'ok') throw new Error('collecting a coin in an editor-saved level crashes: ' + lateCoinEffect);
const devToolsChecks = await page.evaluate(async () => {
  const name = LEVELS[0].name, base = DEV_BASE_ROWS.get(name).slice();
  const editedRows = base.slice();
  const firstTile = editedRows[ROWS - 1][0] === '^' ? '.' : '^';
  editedRows[ROWS - 1] = firstTile + editedRows[ROWS - 1].slice(1);
  applyLevelOverrides({ [name]: editedRows });
  const edited = levelToRows(LEVELS.find(lvl => lvl.name === name));
  const index = LEVELS.findIndex(lvl => lvl.name === name), lvl = LEVELS[index];
  LEVELS[index] = buildLevel(lvl.name, lvl.difficulty, lvl.stars, lvl.hue, [base]);
  const zip = devMakeZip({ 'index.html': 'portable test', 'level-overrides.json': '{}' });
  const bytes = new Uint8Array(await zip.arrayBuffer()), view = new DataView(bytes.buffer);
  return {
    panel: !!document.getElementById('devPanel'),
    panelHidden: document.getElementById('devPanel').hidden,
    levelCount: LEVELS.length,
    baseCount: DEV_BASE_ROWS.size,
    editRoundTrip: edited[ROWS - 1] === editedRows[ROWS - 1],
    zipStart: view.getUint32(0, true),
    zipEnd: view.getUint32(bytes.length - 22, true),
  };
});
if (!devToolsChecks.panel || !devToolsChecks.panelHidden || devToolsChecks.levelCount !== devToolsChecks.baseCount || !devToolsChecks.editRoundTrip || devToolsChecks.zipStart !== 0x04034b50 || devToolsChecks.zipEnd !== 0x06054b50) {
  throw new Error('developer editor, level persistence, or ZIP export self-check failed: ' + JSON.stringify(devToolsChecks));
}
await browser.close();
console.log('OK');
