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

- **14 levels**, ordered from easiest to hardest: First Steps and Sunrise Run (Easy); Orb Garden, Rolling Thunder, Prism Path and Tidal Flow (Normal); Sky Rush, Neon Circuit, Wave Rider and Circuit Breaker (Hard); Gash Gauntlet and Mode Mayhem (Insane); then Demon Gash and Abyssal Run (Demon).
- **Jump pads**: yellow pads give a standard launch; red pads give a controlled stronger launch for longer obstacle runs. **Jump orbs** let you jump again mid-air if you press while touching one; cyan boost orbs add a little extra lift for planned routes.
- **Portals** change how you move: **ship** (pink), **ball** (orange), **wave** (blue), and **cube** (green) to turn back.
- **Secret coins**: 2 or 3 hidden in every level. They count once you finish the level with them.
- **Shop** with 22 cubes, 12 ships, 10 balls, 10 waves, 10 trails and 12 death effects. Use the page arrows below the preview or the arrow keys to browse. New shape skins animate while keeping the same gameplay hitbox; custom silhouettes no longer draw the square cube bevel. Ship exhaust now follows each hull's tail or nozzle. New Aegis, Bloom and Nova cube silhouettes join Prism, Jelly and Orbit. Each item unlocks by:
  - beating a certain level,
  - spending ★ stars (earned by beating levels) or ◉ coins,
  - or finding one of 6 secrets. No spoilers.

- **Music and sound effects**: every level has its own song, all synthesized in code. Sound starts after your first key press or tap (browsers require that).
- **Settings**: music and sound volume, progress bar, screen shake and full screen.

Progress and settings are saved in your browser.

Everything is drawn in code on a canvas (glowing blocks, animated portals, every skin, parallax backgrounds) and stays sharp on high-DPI screens. Online it uses the free [Lilita One](https://fonts.google.com/specimen/Lilita+One) font; offline it falls back to a system font.

## Make your own level

Levels are in `LEVELS` near the top of the script in `index.html`, built from `seg(...)` rows (top to bottom, the last row sits on the ground):
`#` block, `^` spike, `v` hanging spike, `p` yellow jump pad, `r` red jump pad, `o` jump orb, `b` cyan boost orb, `c` coin, `S` ship portal, `B` ball portal, `W` wave portal, `C` cube portal, `.` empty.
Stack a portal letter in a column (3 or 4 tall) where the player passes; the portal works at any height, but that is where it is drawn.
Each level's song is in `SONGS`, mapped to the level by name so changing the displayed difficulty order does not change its music.

To check every level (and every coin) is still reachable, that motion stays smooth, and that the shop adds up (needs Node and Playwright, `npm i -D playwright`):

```
node test/beatable.mjs
node test/shop.mjs
```
