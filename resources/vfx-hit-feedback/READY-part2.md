# VFX and hit feedback, Part 2: READY (draft PR #121, v0.5.339)

PR: https://github.com/keshliew96-afk/echoes-three/pull/121
Built on gauntlet f162124 (v0.5.338, with the heroes and foes PRs in). Render and audio only.

## Checks

- Goldens: 9/9 identical.
- `npm test`: all 37 probes pass, including the new `tools/vfx-hit-feedback2-probe.mjs`.
- `npx vite build`: clean.
- i18n check: clean. There is no new player text.
- CI: green.
- The new cues are calibrated (impact families and chest layers).

## What was built (§6.2 f to o)

**f. Shots**
- The head swells at the hand and stretches in flight.
- Each shot gets its own size, brightness and height.
- A floor light follows the shot.
- The trail drains into the hit, and sparks mark the spot.
- A near-side light falls on the target about 1.5 body widths out (R6).

**n. Ranged hold**
- A 3-frame hold on shot and spell hits.

**g. Sound**
- Hits: a boom for spells, a thunk for arrows, a cut for blades.
- A whoosh on casts.
- A whiz on your own shots, and on foe shots that pass near you (my limit).
- A ping when a shot hits a wall.
- About ±6% pitch on each.

**h. Weapon kick**
- The weapon snaps on the press frame.

**j. Slash ribbons**
- A concave fade-in ramp.
- Streak lines.
- A tip glint and shards.
- The trail is thickest at the blade (L3).

**k. Anime frame**
- A local paper-and-ink disc on the floor, on finishers and on elite, champion and boss kills.

**o. Camera punch**
- 6% on big kills.
- 2% on a chest snap.
- A small kick on your own shots, not on the Archer's or the Healer's.

**m. Aftermath**
- A gold rim on blade hits.
- The two real burns taper at the end.
- Spatter in the body's own matter colour.
- Archer arrows stay stuck in the floor for 3 s.
- Frost air after the Frost Bomb and the Frozen elite: about 100 twinkles and a mist for 1 to 2 s.

**l. Crit flipbook**
- A pale gold book of 5 drawings, swapped every 2 ticks.

**i. Chests**
- The vault chest, the reliquary and the cache:
  - they wobble faster as a hero nears;
  - E squashes them, and they snap open at 0.5 s, inside the reveal;
  - a hop with a 4-frame hold at its top;
  - the lid is flung open, and the padlock flies off and stays on the floor;
  - a rim line and a light sheet;
  - rays, then 8 stars that pop one at a time;
  - a sound per layer.
- The champion chest snaps on the clear, then the room stays in view 1.5 s before the draft.
- The Trapped Chest keeps its twitch, and its lid opens in 3 frames on Ember sparks, with no light and no stars.

## Shots (`/mnt/project-files/vfx-hit-feedback/part2/`)

Every look here was seen only on software GL in the cloud, about 1 fps.

**The vault chest**
- Stills: `chest-1` to `chest-8` (wobble, press, snap hold, rays, stars, pop, padlock).
- Zooms: `chest-zoom-press.png`, `chest-zoom-hold-rays-stars-pop.png`, `chest-zoom-padlock-floor.png`.
- Clips: `vault.mp4` and `vault-quarter-speed.mp4`.

**A Level I room-3 fight**
- Stills: `fight-1` to `fight-6` (shots, the frost burst and its air, arrows).
- Clips: `fight.mp4` and `fight-quarter-speed.mp4`.

## Caveats

- **The vault burst.** It used to fire on E. It now fires after the snap's hold, and it is softer: a 1.4 u flash instead of a 2.6 u held white-out. Without this change, the snap was invisible.
- **The vault after the snap.** Its gold geyser, pillars and light still wash out the stars after the snap on this renderer.
- **Stuck arrows and frost twinkles are small at play zoom.** They are in the game, and the probe counts them (9 arrows stuck in the fight), but they are hard to see in the stills.
- **The slash glint** sits at the arc's start. It is not traced from the weapon tip (T1).
- **The rim** is on foes and champions. Bosses keep their own hit looks.
- **The cast whoosh** plays on magic casts only.
- **The Trapped Chest** has no reward beat when it pays after the fight.

## Open choices

These are my versions, not built unless you pick them:

- Soften the vault's own geyser and pillars after the snap, so the stars read.
- Make the stuck arrows and the frost twinkles bigger.
