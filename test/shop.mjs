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
assert.deepEqual(before, [1, 1, 1, 1, 1, 1], 'only the free items start unlocked');
const order = await page.evaluate(() => ({
  names: LEVELS.map(l => l.name),
  songs: SONGS.length,
  badUnlocks: KINDS.flatMap(k => ITEMS[k].filter(it => it.level !== undefined && (!Number.isInteger(it.level) || !LEVELS[it.level])).map(it => `${k}:${it.name}`)),
  unlockTargets: ['Gold', 'Prism', 'Skull'].map(name => {
    const item = ITEMS.cube.find(it => it.name === name);
    return [name, LEVELS[item.level].name];
  }),
}));
assert.deepEqual(order.names, ['First Steps', 'Orb Garden', 'Rolling Thunder', 'Prism Path', 'Sky Rush', 'Neon Circuit', 'Wave Rider', 'Gash Gauntlet', 'Mode Mayhem', 'Demon Gash'], 'levels are ordered by difficulty, then stars');
assert.equal(order.songs, order.names.length, 'every reordered and added level has its own song');
assert.deepEqual(order.badUnlocks, [], 'all level rewards point to an existing level');
assert.deepEqual(order.unlockTargets, [['Gold', 'Gash Gauntlet'], ['Prism', 'Sky Rush'], ['Skull', 'Demon Gash']], 'level unlocks stay attached to their original level');
const shapedCubes = await page.evaluate(() => ITEMS.cube.filter(it => ['prism', 'jelly', 'orbit', 'aegis', 'bloom', 'nova'].includes(it.look)).map(it => it.look));
assert.deepEqual(shapedCubes, ['prism', 'jelly', 'orbit', 'aegis', 'bloom', 'nova'], 'all custom silhouettes are listed in the cube shop');
const exhaustAnchors = await page.evaluate(() => Object.keys(SHIPS).every(look => Array.isArray(EXHAUST[look]) && EXHAUST[look].length === 2));
assert.equal(exhaustAnchors, true, 'every ship skin has a tailored exhaust anchor');

// Type the secret word (the 's' opens the shop, which still listens), enter the ancient code there, go back, then click the title 7 times.
await page.keyboard.type('gash');
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']) await page.keyboard.press(k);
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
  KINDS.forEach(k => ITEMS[k].forEach((_, i) => buyOrEquip(k, i)));
  return {
    locked: KINDS.flatMap(k => ITEMS[k].filter((_, i) => !unlocked(k, i)).map(it => it.name)),
    stars: starBalance(), coins: coinBalance(), secrets: save.secrets.sort(),
    saved: JSON.parse(localStorage.getItem(SAVE_KEY)).owned.length,
  };
});

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
await browser.close();
assert.deepEqual(errors, []);
assert.deepEqual(after.secrets, ['close', 'code', 'deaths', 'jumps', 'konami', 'title']);
assert.deepEqual(after.locked, [], 'everything is unlockable');
assert.equal(after.stars, 9, 'the two new levels add nine spendable stars after shop purchases');
assert.equal(after.coins, 4, 'the two new levels add four spendable coins after shop purchases');
assert.equal(after.saved, 36, 'purchases persist');
assert.equal(kept.version, 3, 'old saves migrate to the reordered level list');
assert.deepEqual([kept.firstStepsBest, kept.skyRushBest], [100, 75], 'legacy completion percentages stay with their levels');
assert.deepEqual(kept.sky, kept.skyIds, 'old saves keep their Sky Rush coins');
assert.deepEqual(kept.gash, [kept.gashId], 'old saves keep their Gash Gauntlet coin');
assert.deepEqual(keptV2, { version: 3, firstStepsBest: 100, skyRushBest: 75, skyCoins: [29], gauntletCoins: [28] }, 'version 2 progress migrates to the new order');
console.log('OK');
