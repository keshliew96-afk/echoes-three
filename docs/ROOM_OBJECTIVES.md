# Room objectives: the Hunt and the Purge

Content plan 2, slice 2 (v0.5.234). Two combat objectives beside kill_all and
defend, each with its own door glyph, HUD banner, first-time tip, sounds and
visuals.

## Where they appear

- Campaign runs only (Endless Descent included). Never the tutorial and never
  the legacy single-level run, so the nine goldens never meet one.
- Rooms 4 to 6 only: a kill_all room there becomes an objective room.
- The first level of a campaign gets one; every later level (and every Endless
  depth past the first) gets two, one hunt and one purge.
- Which rooms, and which kind comes first, come from a hash of the level's
  frame seed and index (`assignObjectives` in `src/sim/objectives.js`), not
  from the run's random stream, so every other roll of a campaign is
  unchanged.
- Doors: ➶ for a hunt, ✹ for a purge, with the legend line under the doors.

## The Hunt

- A marked **quarry** breaks cover with the first wave: one of the act's own
  enemies made elite (Act I boar, Act II crab, Act III ram) with 240 HP times
  the room's HP multiplier.
- It never attacks. It runs between twelve waypoints, away from the party and
  around it, and is pushed straight off by anyone within 2.2 u. It runs for
  5 s, then stands **winded** for 1.4 s (the window for a melee hero).
- It escapes 40 s after breaking cover. The HUD bar shows its HP and the
  escape clock, which warns for the last 10 s.
- The room's waves are 70% of a kill_all budget.
- Killed in time: the room is won, the waves still standing retreat (as in a
  defend clear), and the party gets a 10 Glint bounty on top of the usual
  stipend, spoils and draft.
- Escaped: the room soft-fails like a lost Waystone. The reward is forfeited
  and the remaining waves must still be cleared.
- AI allies mark the quarry when it appears. The autopilot chases it (and the
  nearest nest in a purge) when nothing hostile is close.

## The Purge

- Three corruption **nests** (150 HP each times the HP multiplier, 0.62 u)
  stand at spread points of the room's spawn ring, pulled in clear of props.
  One opening wave (80% budget) guards them.
- Each nest spawns one enemy of the act's roster (elites included) 2.5 s into
  the room, 1.5 s apart, then every 6.5 s (4.5 s once below half HP), and
  waits while two of its own spawns live. Spawn lists are pre-rolled.
- 75 s purge timer; the HUD shows one pip per nest and the clock, warning for
  the last 15 s.
- All three destroyed in time: won, 10 Glint bounty, and leftover enemies
  retreat.
- Timer out: the corruption **takes root** (soft-fail, reward forfeited). The
  nests keep spawning and must still be destroyed, along with what they
  spawned, to leave.

## Code map

- `src/sim/objectives.js`: rules (`OBJECTIVE_RULES`), assignment, the quarry's
  flight (`quarryFlee`), nest placement (`nestSpots`).
- `src/sim/waves.js`: planning, the quarry spawn, `beginPurge` / `stepNests`,
  escape and rooting, the win predicates, `roomState` fields, save and load.
- `src/sim/run.js`: assignment per level, door glyphs, the bounty, the
  `objectiveRoom` probe command. `src/sim/enemies.js`: the quarry flees and
  never strikes; nests are solids. `src/sim/autopilot.js`: chasing.
- `src/render/enemies/objectives.js`: quarry reticle, pillar, gem marker,
  spoor, winded breath, bursts; nest body, glow, roots, motes, spawn swell,
  hit flash, wounded heartbeat, rooting surge, death burst and scorch.
- `src/ui/hud/banner.js` and `style.js`: the banners. `src/ui/run/path.js`:
  door legend. `src/ui/tutorial/index.js`: the hunt and purge tips.
  `src/audio/cues.js`: sounds (existing procedural cues).
- Events: `quarry_spawn`, `quarry_winded`, `quarry_escape`, `nest_spawn`,
  `nest_pulse`, `nest_brood`, `purge_start`, `purge_rooted`,
  `room_soft_fail`; `room_cleared` carries `objective` and `won`.

## Probes

- `node tools/objectives-probe.mjs` (headless, 27 checks): assignment rules
  over 40 seeds, hunt won / escaped, purge won / rooted, child cap, bounty,
  same-seed replay, mid-purge save and load.
- `node tools/objectives-browser.mjs [--lang de]` against `npm run dev`: the
  real pages, door glyph, both tips, the hunt and purge banners, the winded
  beat, nests spawning and dying; screenshots in `captures/objective-*.png`.
- `node tools/gntM2-goldens.mjs`: the nine goldens stay identical.

## Known limits

- Nests are not colliders for walking (enemies separate from them softly).
- No new sound assets; the cues reuse existing procedural sounds.
- No row in the `?vfxlab=1` panel yet.
- Numbers were tuned with autopilot campaigns, not human play.
