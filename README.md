# Geometry Dash Ripoff

A tiny Geometry Dash–style game in a single HTML file. No install, no build.

## Play

1. Download this repo (green **Code** button → **Download ZIP**, or `git clone`).
2. Open `index.html` in any modern browser (double-click it).

## Controls

- **Space**, **↑**, **W**, or **click / tap** to jump. Hold to keep jumping as soon as you land.
- Spikes and the sides of blocks kill you. You can land on top of blocks.
- You restart automatically after dying. Reach 100% to win.

## Make your own level

Edit `SEGMENTS` near the top of the script in `index.html`. Each segment is 5 rows, top to bottom:
`#` = block, `^` = spike, `.` = empty. All rows in a segment must be the same length.

To check the level is still beatable (needs Node and Playwright, `npm i -D playwright`):

```
node test/beatable.mjs
```
