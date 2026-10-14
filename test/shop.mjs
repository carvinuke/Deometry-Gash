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

// Type the secret word (the 's' opens the shop, which still listens), enter the ancient code there, go back, then click the title 7 times.
await page.keyboard.type('gash');
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA']) await page.keyboard.press(k);
await page.keyboard.press('Escape');
const box = await page.locator('canvas').boundingBox();
for (let i = 0; i < 7; i++) await page.mouse.click(box.x + box.width / 2, box.y + 80 * box.height / 480);
// The 1000th jump is a real one.
await page.evaluate(() => { startLevel(0); save.jumps = 999; });
await page.keyboard.down('Space'); await page.waitForTimeout(200); await page.keyboard.up('Space');
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
await page.evaluate(() => localStorage.setItem(SAVE_KEY, JSON.stringify({ coins: { 2: [34, 72], 3: [32] } })));
await page.reload();
const kept = await page.evaluate(() => ({ sky: save.coins[2], gash: save.coins[3], skyIds: LEVELS[2].coinTiles.map(t => t.id), gashId: LEVELS[3].coinTiles[1].id }));
await browser.close();
assert.deepEqual(errors, []);
assert.deepEqual(after.secrets, ['close', 'code', 'deaths', 'jumps', 'konami', 'title']);
assert.deepEqual(after.locked, [], 'everything is unlockable');
assert.equal(after.stars, 0, 'stars cover the star items exactly');
assert.equal(after.coins, 0, 'coins cover the coin items exactly');
assert.equal(after.saved, 36, 'purchases persist');
assert.deepEqual(kept.sky, kept.skyIds, 'old saves keep their Sky Rush coins');
assert.deepEqual(kept.gash, [kept.gashId], 'old saves keep their Gash Gauntlet coin');
console.log('OK');
