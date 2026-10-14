# Deometry Gash

A tiny Geometry Dash–style game in a single HTML file. No install, no build.

## Play

1. Download this repo (green **Code** button → **Download ZIP**, or `git clone`).
2. Open `index.html` in any modern browser (double-click it).

## Controls

- **Space**, **↑**, **W**, or **click / tap** to jump. Hold to keep jumping as soon as you land.
- In the **ship**, hold to fly up and let go to fall.
- **Esc** goes back to the level menu. **S** opens the shop from the menu.

## What's in it

- **4 levels**: First Steps (Easy), Orb Garden (Normal), Sky Rush (Hard), Gash Gauntlet (Insane).
- **Jump pads** (yellow pads) launch you high. **Jump orbs** (yellow rings) let you jump again mid-air if you press while touching one.
- **Ship portals** (pink) turn you into a ship; **cube portals** (green) turn you back.
- **Secret coins**: 2 hidden in every level. They count once you finish the level with them.
- **Shop** with cube skins, ship skins and death effects. Each one unlocks by:
  - beating a certain level,
  - spending ★ stars (earned by beating levels) or ◉ coins,
  - or finding one of 3 secrets. No spoilers.

Progress is saved in your browser.

## Make your own level

Levels are in `LEVELS` near the top of the script in `index.html`, built from `seg(...)` rows (top to bottom, the last row sits on the ground):
`#` block, `^` spike, `v` hanging spike, `p` jump pad, `o` jump orb, `c` coin, `S` ship portal, `C` cube portal, `.` empty.

To check every level (and every coin) is still reachable, and that the shop adds up (needs Node and Playwright, `npm i -D playwright`):

```
node test/beatable.mjs
node test/shop.mjs
```
