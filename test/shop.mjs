// Self-check for unlocks: stars and coins from every level buy exactly everything, and secrets unlock.
// Run: node test/shop.mjs   (needs playwright: npm i -D playwright)
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import assert from 'assert/strict';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto('file://' + fileURLToPath(new URL('../index.html', import.meta.url)));
await page.evaluate(() => localStorage.clear());
await page.reload();

const before = await page.evaluate(() => KINDS.map(k => ITEMS[k].filter((_, i) => unlocked(k, i)).length));
assert.deepEqual(before, [2, 1, 1, 1, 1, 1], 'only the free items (two of them cubes: Classic and Custom) start unlocked');
const order = await page.evaluate(() => ({
  names: LEVELS.map(l => l.name),
  songs: SONGS.length,
  badUnlocks: KINDS.flatMap(k => ITEMS[k].filter(it => it.level !== undefined && (!Number.isInteger(it.level) || !LEVELS[it.level])).map(it => `${k}:${it.name}`)),
  unlockTargets: ['Gold', 'Prism', 'Skull'].map(name => {
    const item = ITEMS.cube.find(it => it.name === name);
    return [name, LEVELS[item.level].name];
  }),
}));
assert.deepEqual(order.names, ['First Steps', 'Sunrise Run', 'Orb Garden', 'Rolling Thunder', 'Prism Path', 'Tidal Flow', 'Sky Rush', 'Neon Circuit', 'Wave Rider', 'Circuit Breaker', 'Gash Gauntlet', 'Mode Mayhem', 'Demon Gash', 'Flutterclunk', 'Abyssal Run'], 'levels are ordered by difficulty, then stars');
assert.equal(order.songs, order.names.length, 'every reordered and added level has its own song');
assert.deepEqual(order.badUnlocks, [], 'all level rewards point to an existing level');
assert.deepEqual(order.unlockTargets, [['Gold', 'Gash Gauntlet'], ['Prism', 'Sky Rush'], ['Skull', 'Demon Gash']], 'level unlocks stay attached to their original level');
const shapedCubes = await page.evaluate(() => ITEMS.cube.filter(it => ['prism', 'jelly', 'orbit', 'aegis', 'bloom', 'nova', 'helix', 'shard'].includes(it.look)).map(it => it.look));
assert.deepEqual(shapedCubes, ['prism', 'jelly', 'orbit', 'aegis', 'bloom', 'nova', 'helix', 'shard'], 'all custom silhouettes are listed in the cube shop');
const exhaustAnchors = await page.evaluate(() => Object.keys(SHIPS).every(look => Array.isArray(EXHAUST[look]) && EXHAUST[look].length === 2));
assert.equal(exhaustAnchors, true, 'every ship skin has a tailored exhaust anchor');
const renderers = await page.evaluate(() => ({
  cube: ITEMS.cube.every(it => typeof LOOKS[it.look] === 'function' || KIT[it.look]),
  kit: Object.keys(KIT).length === 59 && Object.keys(KIT).every(look => ITEMS.cube.some(it => it.look === look && it.base)),
  ship: ITEMS.ship.every(it => typeof SHIPS[it.look] === 'function' && EXHAUST[it.look]),
  ball: ITEMS.ball.every(it => typeof BALLS[it.look] === 'function'),
  wave: ITEMS.wave.every(it => typeof WAVES[it.look] === 'function'),
  added: ['Helix', 'Shard', 'Stinger', 'Lancer', 'Comet', 'Quasar', 'Ion', 'Aurora', 'Prism', 'Rift', 'Meteor', 'Grin', 'Pumpkin', 'Wedge', 'Shuttle', 'Eight Ball', 'Crater', 'Twin Dart', 'Bee', 'Smoke', 'Starfall'].every(name => KINDS.some(k => ITEMS[k].some(it => it.name === name))),
}));
assert.deepEqual(renderers, { cube: true, kit: true, ship: true, ball: true, wave: true, added: true }, 'every new shop item has a registered visual and stays available to equip, and every traced icon is a paintable cube');
const extraIcons = await page.evaluate(() => {
  drawTrailIcon('Aurora', 40, 40); drawTrailIcon('Prism', 80, 40);
  drawDeathIcon('Rift', 120, 40); drawDeathIcon('Meteor', 160, 40);
  for (const n of ['Smoke', 'Confetti', 'Snow', 'Toxic']) { drawTrailIcon(n, 40, 40); emitTrail([], 0, 0, n, '#ffffff'); }
  for (const n of ['Splash', 'Implode', 'Glitch', 'Starfall']) { drawDeathIcon(n, 40, 40); const l = []; deathEffect(l, 0, 0, n, '#ffffff'); if (!l.length) return n; }
  // ships, balls and waves can be painted too; their picks are kept apart from a cube with the same name
  const ship = ITEMS.ship.find(it => it.name === 'Whale'); openEditor(ship); setColor('body', '#123456');
  const painted = ship.body === '#123456' && !!save.paint['ship:Whale'] && ITEMS.ship.find(it => it.name === 'Ghost').base === undefined;
  delete save.paint['ship:Whale']; state = 'menu'; // back to the title screen for the secrets below
  return painted;
});
assert.equal(extraIcons, true, 'new trail and death icons render without errors');

// Type the secret word (the 's' opens the shop, which still listens), enter the ancient code there, go back, then click the title 7 times.
await page.keyboard.type('gash');
for (const k of await page.evaluate(() => KONAMI)) await page.keyboard.press(k); // the game uses a shortened code
await page.keyboard.press('Escape');
const v = await page.evaluate(() => VIEW); // layout point (480, 80) is the title
for (let i = 0; i < 7; i++) await page.mouse.click((480 + v.x) * v.s, (80 + v.y) * v.s);
// The 1000th jump uses the same physics step as play, without depending on a live display refresh.
await page.evaluate(() => {
  startLevel(0); save.jumps = 999;
  const prev = { grounded: player.grounded, vy: player.vy, mode: player.mode, grav: player.grav, used: player.used.length, coins: player.coins.length };
  step(player, true, level, true); playEffects(prev);
});
await page.keyboard.press('Escape');

const after = await page.evaluate(() => {
  // Pretend every level was beaten with every coin, then buy everything that costs something.
  LEVELS.forEach((l, i) => { save.best[i] = 100; save.coins[i] = l.tiles.filter(t => t.type === 'c').map(t => t.id); });
  for (let i = 0; i < 50; i++) die();
  startLevel(0); player.x = level.len * 0.95; die(); // so close
  // Achievements: the counters, then a practice clear and a first-try clear.
  save.attempts = 1000; save.jumps = 5000; save.deaths = 500; save.checkpoints = 100; checkAchievements();
  startLevel(0, true); finishLevel(); startLevel(0); finishLevel();
  KINDS.forEach(k => ITEMS[k].forEach((_, i) => buyOrEquip(k, i)));
  return {
    locked: KINDS.flatMap(k => ITEMS[k].filter((_, i) => !unlocked(k, i)).map(it => it.name)),
    stars: starBalance(), coins: coinBalance(), secrets: save.secrets.sort(), ach: save.ach.length === ACHIEVEMENTS.length,
    saved: JSON.parse(localStorage.getItem(SAVE_KEY)).owned.length,
  };
});

// Practice mode respawns at the last checkpoint and saves no progress, coins or close-call secret.
await page.evaluate(() => localStorage.clear());
await page.reload();
const practiced = await page.evaluate(() => {
  startLevel(3, true); player.x = 20; placeCheckpoint(); player.x = level.len * 0.95; player.coins = [level.coinTiles[0].id];
  die(); respawn(); const at = player.x; finishLevel();
  return { at, best: save.best[3], coins: save.coins[3], secrets: save.secrets, ach: save.ach, checkpoints: save.checkpoints };
});
assert.deepEqual(practiced, { at: 20, best: undefined, coins: undefined, secrets: [], ach: ['practice'], checkpoints: 1 }, 'practice respawns at the checkpoint and saves nothing but the achievement');

// A version 1 save (from before the portals moved) still has the same coins collected.
await page.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ best: { 0: 100, 2: 75 }, coins: { 2: [34, 72], 3: [32] } })));
await page.reload();
const kept = await page.evaluate(() => ({
  version: save.v,
  firstStepsBest: save.best[LEVELS.findIndex(l => l.name === 'First Steps')],
  skyRushBest: save.best[LEVELS.findIndex(l => l.name === 'Sky Rush')],
  sky: save.coins[LEVELS.findIndex(l => l.name === 'Sky Rush')],
  gash: save.coins[LEVELS.findIndex(l => l.name === 'Gash Gauntlet')],
  skyIds: LEVELS.find(l => l.name === 'Sky Rush').coinTiles.map(t => t.id),
  gashId: LEVELS.find(l => l.name === 'Gash Gauntlet').coinTiles[1].id,
}));
await page.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, best: { 0: 100, 2: 75 }, coins: { 2: [29], 3: [28] } })));
await page.reload();
const keptV2 = await page.evaluate(() => ({
  version: save.v,
  firstStepsBest: save.best[LEVELS.findIndex(l => l.name === 'First Steps')],
  skyRushBest: save.best[LEVELS.findIndex(l => l.name === 'Sky Rush')],
  skyCoins: save.coins[LEVELS.findIndex(l => l.name === 'Sky Rush')],
  gauntletCoins: save.coins[LEVELS.findIndex(l => l.name === 'Gash Gauntlet')],
}));
await page.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 3, best: { 0: 100, 4: 75, 9: 100 }, coins: { 4: [29], 7: [28] } })));
await page.reload();
const keptV3 = await page.evaluate(() => ({
  version: save.v,
  skyRushBest: save.best[LEVELS.findIndex(l => l.name === 'Sky Rush')],
  demonBest: save.best[LEVELS.findIndex(l => l.name === 'Demon Gash')],
  skyCoins: save.coins[LEVELS.findIndex(l => l.name === 'Sky Rush')],
  gauntletCoins: save.coins[LEVELS.findIndex(l => l.name === 'Gash Gauntlet')],
}));
// A version 4 save stored coins by tile id; coins are now numbered among themselves so level edits can't move them.
await page.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 4, best: {}, coins: { 3: [10, 199], 13: [195, 237] } })));
await page.reload();
const keptV4 = await page.evaluate(() => ({ version: save.v, rolling: save.coins[3], flutter: save.coins[13], names: [LEVELS[3].name, LEVELS[13].name] }));
// The Custom cube: using it opens its editor, and a clicked face and swatch and a typed hex code survive a reload.
await page.evaluate(() => localStorage.clear());
await page.reload();
const customOpened = await page.evaluate(() => { const i = ITEMS.cube.findIndex(it => it.look === 'custom'); openShop(); shopSelect(0, i); buyOrEquip('cube', i); return state; });
const clickBox = async b => { const v = await page.evaluate(() => VIEW); await page.mouse.click((b.x + b.w / 2 + v.x) * v.s, (b.y + b.h / 2 + v.y) * v.s); };
await clickBox(await page.evaluate(() => facePos(FACE_IDS.indexOf('kitty'))));
await clickBox(await page.evaluate(() => swatchPos(PALETTE.indexOf('#2b5bff')))); // the block color tab starts picked
await clickBox(await page.evaluate(() => colorTabPos(1)));
await page.fill('#customHex', '#F80');
await page.reload();
const customKept = await page.evaluate(() => { const s = skin('cube'); return { look: s.look, face: s.face, body: s.body, inner: s.inner }; });
// A saved face or color the game can't draw falls back to the default instead of stopping the game (the page errors below would catch that).
await page.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 5, equipped: { cube: ITEMS.cube.findIndex(it => it.look === 'custom') }, custom: { face: '__proto__', body: 'red', inner: null } })));
await page.reload();
await page.waitForTimeout(100); // the title screen draws the equipped cube
const customFixed = await page.evaluate(() => ({ fixed: save.custom, defaults: CUSTOM }));
// A paintable cube: using it again opens the editor, where a preset and a typed hex code survive a reload.
await page.evaluate(() => localStorage.clear());
await page.reload();
const paintOpened = await page.evaluate(() => {
  const i = ITEMS.cube.findIndex(it => it.name === 'Squid'); save.owned.push(`cube:${i}`); openShop(); shopSelect(0, i);
  buyOrEquip('cube', i); const first = state; buyOrEquip('cube', i); return [first, state, editing.name];
});
await clickBox(await page.evaluate(() => facePos(PRESETS.findIndex(p => p?.[0] === '#ffd400'))));
await clickBox(await page.evaluate(() => colorTabPos(1)));
await page.fill('#customHex', '#F80');
await page.reload();
const paintKept = await page.evaluate(() => { const s = skin('cube'); return { name: s.name, body: s.body, inner: s.inner, base: s.base }; });
// A saved color the game can't draw falls back to the cube's own, and a cube with no detail parts only offers its main color.
await page.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 5, equipped: { cube: ITEMS.cube.findIndex(it => it.name === 'Squid') }, paint: { Squid: { body: 'red', inner: '#00ff00' } } })));
await page.reload();
await page.waitForTimeout(100);
const paintFixed = await page.evaluate(() => { const s = skin('cube'); openEditor(ITEMS.cube.find(it => it.name === 'Spooked')); return { body: s.body, inner: s.inner, spookedTabs: colorTabs() }; });
await browser.close();
assert.deepEqual(errors, []);
assert.equal(customOpened, 'custom', 'using the Custom cube opens its editor');
assert.deepEqual(customKept, { look: 'custom', face: 'kitty', body: '#2b5bff', inner: '#ff8800' }, 'the Custom cube keeps the face and colors picked for it');
assert.deepEqual(customFixed.fixed, customFixed.defaults, 'a Custom cube the game cannot draw falls back to the default look');
assert.deepEqual(paintOpened, ['shop', 'custom', 'Squid'], 'buying a paintable cube equips it, and using it again opens its colors');
assert.deepEqual(paintKept, { name: 'Squid', body: '#ffd400', inner: '#ff8800', base: { body: '#ff4fa8', inner: '#ffffff' } }, 'a paintable cube keeps the preset and hex code picked for it');
assert.deepEqual(paintFixed, { body: '#ff4fa8', inner: '#00ff00', spookedTabs: ['body'] }, 'a bad saved color falls back to the cube\'s own, and Spooked only has a main color');
assert.deepEqual(keptV4, { version: 5, rolling: [0, 2], flutter: [0, 2], names: ['Rolling Thunder', 'Flutterclunk'] }, 'version 4 coins map to their place among the level coins');
assert.deepEqual(after.secrets, ['close', 'code', 'deaths', 'jumps', 'konami', 'title']);
assert.deepEqual(after.locked, [], 'everything is unlockable');
assert.equal(after.ach, true, 'every achievement can be earned');
assert.equal(after.stars, 0, 'the icon-kit cubes cost exactly the stars the levels give beyond the other items');
assert.equal(after.coins, 0, 'and exactly the leftover coins');
assert.equal(after.saved, 57, 'purchases persist');
assert.equal(kept.version, 5, 'old saves migrate to the reordered level list');
assert.deepEqual([kept.firstStepsBest, kept.skyRushBest], [100, 75], 'legacy completion percentages stay with their levels');
assert.deepEqual(kept.sky, kept.skyIds, 'old saves keep their Sky Rush coins');
assert.deepEqual(kept.gash, [kept.gashId], 'old saves keep their Gash Gauntlet coin');
assert.deepEqual(keptV2, { version: 5, firstStepsBest: 100, skyRushBest: 75, skyCoins: [0], gauntletCoins: [1] }, 'version 2 progress migrates to the new order');
assert.deepEqual(keptV3, { version: 5, skyRushBest: 75, demonBest: 100, skyCoins: [0], gauntletCoins: [1] }, 'version 3 progress migrates to the added levels');
console.log('OK');
