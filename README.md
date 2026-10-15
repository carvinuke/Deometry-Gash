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
- **New hazards and scenery**: ceiling chains hold spike bars and downward spikes, falling spikes drop into your path, and saws and larger spikes add different jump timings. Beacon poles and floating crystal runes decorate routes across every difficulty. Abyssal Run now ends with a tighter Demon gauntlet. Hazards use collision areas matched to their art while the player keeps the same one-tile gameplay hitbox. The player sprite no longer has a soft outer glow.
- **Shop** with 24 cubes, 14 ships, 12 balls, 11 waves, 12 trails and 14 death effects. Use the page arrows below the preview or the arrow keys to browse. New shape skins animate while keeping the same gameplay hitbox; custom silhouettes no longer draw the square cube bevel. Ship exhaust now follows each hull's tail or nozzle. The cube, ship, ball and wave collections each have new silhouettes, plus Aurora and Prism trails and Rift and Meteor deaths. Each item unlocks by:
  - beating a certain level,
  - spending ★ stars (earned by beating levels) or ◉ coins,
  - or finding one of 6 secrets. No spoilers.

- **Music and sound effects**: every level has its own song, all synthesized in code. Sound starts after your first key press or tap (browsers require that).
- **Settings**: music and sound volume, progress bar, screen shake and full screen.

Progress and settings are saved in your browser.

Everything is drawn in code on a canvas (glowing blocks, animated portals, every skin, parallax backgrounds) and stays sharp on high-DPI screens. Online it uses the free [Lilita One](https://fonts.google.com/specimen/Lilita+One) font; offline it falls back to a system font.

## Make your own level

Levels are in `LEVELS` near the top of the script in `index.html`, built from `seg(...)` rows (top to bottom, the last row sits on the ground):
`#` block, `^` spike, `v` chained hanging spike, `h` chained spike bar, `F` falling spike trap, `s` saw, `G` oversized spike, `d` decorative crystal, `i` non-colliding beacon pole, `p` yellow jump pad, `r` red jump pad, `o` jump orb, `b` cyan boost orb, `c` coin, `S` ship portal, `B` ball portal, `W` wave portal, `C` cube portal, `.` empty. Falling traps are triggered four tiles before the player reaches them; chain bars, hanging spikes, saws, and giant spikes have collision shapes matched to their drawn size.
Stack a portal letter in a column (3 or 4 tall) where the player passes; the portal works at any height, but that is where it is drawn.
Each level's song is in `SONGS`, mapped to the level by name so changing the displayed difficulty order does not change its music.

The browser self-check searches for clear and all-coin routes, then separately checks jump windows, orb launches, smooth motion, and every red-pad lane across 12 horizontal frame phases. It also checks the new obstacle trigger/collision rules. The route search is a screening tool; the red-pad lane checks verify the clearance margins that a route search alone can miss. The shop check covers sorted levels, unlocks, and save migration (needs Node and Playwright, `npm i -D playwright`):

```
node test/beatable.mjs
node test/shop.mjs
```
