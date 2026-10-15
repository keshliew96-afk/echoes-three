# Hazards and shrines

Content plan 4, slice 9. Two pieces: a new Hollow Heart hazard, the crystal
spurs, and a trade shrine in every act.

## Crystal spurs (Act IV)

`src/sim/hazards.js` type `spur`, placed in the Heart layouts 16-20, 27 and 28
from room 2 on (`{ type: 'spur', minRoom: 2 }`).

- Every 6 ticks the hazard samples each living hero's position into a short
  trail (12 samples).
- On its hashed schedule (first after 210 ticks, then every 300-420) it picks
  a hero and marks the spot that hero stood on 36 ticks ago: their last spot,
  so a hero who keeps moving is safe and one who stands still is not.
- The mark is a 0.75 u ring, a player-targeted telegraph of 54 ticks (0.9 s).
  It counts on the cadence governor but does not wait on it.
- The burst deals 12 to anyone in the ring and leaves a crystal pillar
  (rubble with `skin: 'spur'`, collider 0.4 u) for 7 s. At most three spur
  pillars stand; the oldest shatters first. The rockfall cap ignores spur
  pillars.
- Schedules and picks hash the seed, room and layout, never the run stream,
  so the goldens cannot move.

Render: `buildSpur` (Ember ring, violet cracks, crystal tips rising in the
last third) and `buildSpurPillar` in `src/render/hazards/index.js`; burst and
shatter in `src/render/vfx/shrinefx.js`; cues `hz_spur_in`, `hz_spur`,
`hz_spur_go` in `src/audio/shrinecues.js`.

## Shrines

`src/sim/shrines.js` (data and rules), `src/sim/run.js` (placement, trade).

One shrine a level. It aims at a hashed room in 4-6 and stands in the first
combat room from there on, never the boss room, the vault, the shop or a "?"
room. A human seat presses E to use it once; the AI seats never press E. It
answers only while the room is live (the clear puts it to sleep). A price the
party cannot pay is refused and the shrine stays. A new blessing replaces the
old one; each blessing lasts 60 s and lies on every hero.

| Land | Shrine | Price | Gift |
| --- | --- | --- | --- |
| Wood | Antler Shrine | 15% max HP from every living hero (never below 1) | Swiftness: +30% move speed |
| Mill | Tithe Shrine | 25 Glint (the seat's own purse in co-op) | Ward: 25% less damage taken |
| Barrow | Grave Shrine | a curse on the next combat room | Fury: +30% damage dealt |
| Heart | Geode Shrine | the party's vault key | a rare or legendary relic pick at the clear |
| Spire | Wind Shrine | the offering hero's tonic or bomb | Tailwind: +20% move speed, +15% damage |

- Blessings live on `e.blessing` (not a status), read by `speedMul`,
  `damageDealtMul` and `damageTakenMul` in `src/sim/status.js`.
- The Grave Shrine's curse binds the next combat room before its waves roll
  (unless a door's curse already did); that room still pays its cursed-room
  relic pick.
- The Geode Shrine's key counts as surrendered (`key_surrender`), not as a
  vault opened. If the room already owes a pick, the shrine grants a rare or
  legendary relic outright instead.
- Campaign runs only (Endless and the Daily included); never Boss Rush, the
  tutorial or the legacy single-level run, so the nine goldens never see one.

Probe and lab: `node tools/hazards-shrines-probe.mjs`; `?vfxlab=1` has a
"Crystal spurs" row and a "Shrines" row (one button per land plus Offer).
Commands: `shrineState`, `shrineHere [biome, x, z]`, `shrineRoom n`,
`shrineUse seat`.
