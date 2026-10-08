# Overhead health bars (v0.5.252)

A small health bar floats over the head of each of the four party heroes:
the player's own and the three allies, human or AI. In co-op every player sees
all four. Enemies and bosses are unchanged (their own rings and the boss plate).

## Player view

- **Settings ▸ Gameplay ▸ Health bars over heroes**, on by default. The switch
  applies at once, with no restart, and is saved with the other settings
  (`gameplay.hpBars`, a local setting: nothing crosses the wire in co-op).
- The camp, the tutorial, a campaign run, Endless and the Daily all follow it.
  The title and the farewell screen never show bars.
- The portraits on the command bar keep their own HP bar either way.

## How a bar reads

- A charcoal plate with quarter ticks; the fill is the hero's identity-ring
  colour (the class accent's own hue, lifted in value like the ring band), so
  bar and ring read as one hero.
- A hit flashes the fill and pops the bar a touch; the lost chunk stays as a
  Parchment segment for 0.42 s, then drains down to the new value.
- A heal fills at once and glints the rim Bright Heal.
- Under 25% the rim pulses Void Charcoal to Bone, like the portrait frame.
- A downed hero's bar fades out (the revive ring owns that body) and comes back
  on the revive.

## Code

- `src/render/hpbars.js`: the layer. One pooled DOM bar per seat, projected
  world to screen every frame in `main.js` after the camera settles (next to
  the damage numerals). Head heights per class in `HEAD_Y`; size `BAR_W` x
  `BAR_H` at 1920x1080, scaled with the window (0.8x to 1.6x).
- `src/ui/run/hpbars.js`: the setting and its Gameplay row (order 7, after
  Effects and Hit feedback), through `registerSettingsRow`.
- Render-only: the sim is never read for anything but `hp`, `maxHp` and the
  position, never written, so the nine goldens stay byte-identical. It adds no
  geometry, texture or shader.
- Debug: `window.__echoes.hpBars()` lists each seat's bar (shown, opacity,
  fill, lag, flash, rect).

## Probe

`node tools/hpbars-browser.mjs [--lang <code>] [--shots dir]` (dev server on
5199): four full bars in camp, the bars in a room follow each hero's HP, a hit
flashes and leaves a lag chunk that drains, a heal snaps, a downed hero has no
bar and gets it back on the revive, the Gameplay row turns the bars off and on
at once and survives a reload, the row is in the language, no page error.
