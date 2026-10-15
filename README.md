# Deometry Gash

A tiny Geometry Dash–style game in a single HTML file. No install, no build.

## Play

1. Download this repo (green **Code** button → **Download ZIP**, or `git clone`).
2. Open `index.html` in any modern browser (double-click it).

## Controls

- **Space**, **↑**, **W**, or **click / tap** to jump. Hold to keep jumping as soon as you land.
- In the **ship**, hold to fly up and let go to fall.
- As the **ball**, press while rolling to flip gravity between the floor and the ceiling.
- As the **wave**, hold to zigzag up and let go to zigzag down.
- **Esc** (or the pause button in the corner) pauses a level: resume, restart, go back to the levels, or change settings. In menus, Esc goes back.
- On the title screen, **Enter** plays, **S** opens the shop and **O** opens the settings.

## What's in it

- **8 levels**: First Steps (Easy), Orb Garden (Normal), Sky Rush (Hard), Gash Gauntlet (Insane), Rolling Thunder (Normal), Wave Rider (Hard), Mode Mayhem (Insane) and Demon Gash (Demon).
- **Jump pads** (yellow pads) launch you high. **Jump orbs** (yellow rings) let you jump again mid-air if you press while touching one.
- **Portals** change how you move: **ship** (pink), **ball** (orange), **wave** (blue), and **cube** (green) to turn back.
- **Secret coins**: 2 or 3 hidden in every level. They count once you finish the level with them.
- **Shop** with 19 cubes, 12 ships, 10 balls, 10 waves, 10 trails and 12 death effects. Browse the pages with the arrow keys. New shape skins animate while keeping the same gameplay hitbox. Each item unlocks by:
  - beating a certain level,
  - spending ★ stars (earned by beating levels) or ◉ coins,
  - or finding one of 6 secrets. No spoilers.

- **Music and sound effects**: every level has its own song, all synthesized in code. Sound starts after your first key press or tap (browsers require that).
- **Settings**: music and sound volume, progress bar, screen shake and full screen.

Progress and settings are saved in your browser.

Everything is drawn in code on a canvas (glowing blocks, animated portals, every skin, parallax backgrounds) and stays sharp on high-DPI screens. Online it uses the free [Lilita One](https://fonts.google.com/specimen/Lilita+One) font; offline it falls back to a system font.

## Make your own level

Levels are in `LEVELS` near the top of the script in `index.html`, built from `seg(...)` rows (top to bottom, the last row sits on the ground):
`#` block, `^` spike, `v` hanging spike, `p` jump pad, `o` jump orb, `c` coin, `S` ship portal, `B` ball portal, `W` wave portal, `C` cube portal, `.` empty.
Stack a portal letter in a column (3 or 4 tall) where the player passes; the portal works at any height, but that is where it is drawn.
Each level's song is in `SONGS`, in the same order; a new level without one reuses a song from the start of the list.

To check every level (and every coin) is still reachable, that motion stays smooth, and that the shop adds up (needs Node and Playwright, `npm i -D playwright`):

```
node test/beatable.mjs
node test/shop.mjs
```
