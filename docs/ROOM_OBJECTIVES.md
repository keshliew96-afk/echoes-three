# Room objectives: the Hunt, the Purge, the Escort and the Hold

Content plan 2, slice 2 (v0.5.234) added the Hunt and the Purge; content plan
3, slice 7 (v0.5.267) added the Escort and the Hold. Four combat objectives
beside kill_all and defend, each with its own door glyph, HUD banner,
first-time tip, sounds and visuals.

## Where they appear

- Campaign runs only (Endless Descent included). Never the tutorial and never
  the legacy single-level run, so the nine goldens never meet one.
- Rooms 4 to 6 only: a kill_all room there becomes an objective room.
- The first level of a campaign gets one; every later level (and every Endless
  depth past the first) gets two of different kinds.
- Which rooms and which kinds come from a hash of the level's frame seed and
  index (`assignObjectives` in `src/sim/objectives.js`), not from the run's
  random stream, so every other roll of a campaign is unchanged. Each of the
  four kinds is equally likely, and the second room of a level never repeats
  the first's kind.
- Doors: ➶ for a hunt, ✹ for a purge, ⚑ for an escort, ◎ for a hold, with the
  legend line under the doors.
- Every objective won pays a 10 Glint bounty on top of the usual stipend,
  spoils and draft; a soft-fail forfeits the reward like a lost Waystone.

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

## The Escort

- A **lost pilgrim** (the Lost Pilgrim event's lantern-bearer, now walking)
  stands beside the party when the room opens: 170 HP times the room's HP
  multiplier, 0.4 u, a party-side body, so the waves go for it the way they
  go for the Waystone. It sets off 1.5 s in.
- Its road runs from beside the party to a far corner, along the far side and
  down to the opposite edge (mirrored left/right and near/far by the room's
  roll), about 30 u. Each leg is searched on a 0.5 u grid around the room's
  blockers and pulled straight where the way is clear. The far end is a
  waypost of light.
- It walks at 1.0 u/s while a standing party member is within 4.5 u. Left
  alone for half a second it **waits** and calls; it walks on when someone
  returns. A blow stops it for a beat.
- The AI seats leash to it (as they leash to the Waystone), so with AI allies
  it rarely waits; the autopilot stays within 2.6 u of it and shoots what is
  closest to it.
- The room's waves are a kill_all's count at 75% of the budget.
- It reaches the waypost: the room is won and the waves still standing
  retreat. It falls: the room soft-fails and the rest of the waves must be
  cleared.
- HUD: the pilgrim's HP and how far along the road it is ("· WAITING" while
  it waits).

## The Hold

- A **sigil ring** (2.6 u) burns on the floor at the room's middle, or the
  nearest spot clear of the blockers. It is lit while a standing party member
  is inside it. Empty, it fades; after 4 s empty it **goes out**. Standing in
  it wins the fade back twice as fast.
- One opening wave (80% budget), then three **rifts** at spread points of the
  room's spawn ring send one enemy each 2.5 s in, 1.5 s apart, then every
  9 s (6 s in the **surge**, the last 20 s), each waiting while two of its
  own spawns live (the purge's spawn timer). Spawn lists are pre-rolled.
- 75 s hold clock; sixty notches round the ring fill as it runs, and the HUD
  bar shows the ring's light.
- The AI seats leash to the ring's centre; the autopilot stands in its inner
  half and shoots what comes closest to it.
- Held to the end: the ring is **sealed**, the room is won and the leftover
  enemies retreat. Out: the room soft-fails, the rifts close, and what is
  left must still be cleared.

## Code map

- `src/sim/objectives.js`: rules (`OBJECTIVE_RULES`), assignment, the quarry's
  flight (`quarryFlee`), nest placement (`nestSpots`), the pilgrim's road
  (`escortRoute`) and walk (`pilgrimWalk`), the ring's spot (`holdSpot`).
- `src/sim/waves.js`: planning, the quarry spawn, `beginPurge` / `stepNests`,
  `beginEscort` / `stepEscort`, `beginHold` / `stepHold`, escape, rooting,
  the pilgrim's fall and the ring going out, the win predicates, `roomState`
  fields, save and load, the `debugObjective` probe hook.
- `src/sim/run.js`: assignment per level, door glyphs, the bounty, the
  `objectiveRoom` and `objectiveDebug` probe commands. `src/sim/enemies.js`:
  the quarry flees and never strikes; nests and the pilgrim are solids.
  `src/sim/autopilot.js`: chasing, guarding the pilgrim, standing in the
  ring. `src/sim/allies.js`: the leash anchor (pilgrim, ring).
- `src/render/enemies/objectives.js`: quarry reticle, pillar, gem marker,
  spoor, winded breath, bursts; nest body, glow, roots, motes, spawn swell,
  hit flash, wounded heartbeat, rooting surge, death burst and scorch.
  `src/render/enemies/escorthold.js`: the walking pilgrim (the event room's
  figure), its lantern pool, reach ring, head marker, the road's motes and
  the waypost, waiting calls, arrival and fall; the sigil ring (bands, rune
  arcs, star, clock notches, column, motes), its fading, surge, going out and
  sealing; the rifts.
- `src/ui/hud/banner.js` and `style.js`: the banners. `src/ui/run/path.js`:
  door legend. `src/ui/tutorial/index.js`: the hunt and purge tips.
  `src/audio/encountercues.js`: the `ob_*` sounds (procedural).
  `src/ui/run/index.js`: the room stays in view 1.5 s after an arrival or a
  sealed ring before the draft opens.
- Events: `quarry_spawn`, `quarry_winded`, `quarry_escape`, `nest_spawn`,
  `nest_pulse`, `nest_brood`, `purge_start`, `purge_rooted`,
  `pilgrim_spawn`, `pilgrim_wait`, `pilgrim_walk`, `pilgrim_arrive`,
  `pilgrim_lost`, `hold_start`, `sigil_fading`, `sigil_relit`, `sigil_out`,
  `hold_surge`, `sigil_sealed`, `rift_pulse`, `rift_brood`,
  `room_soft_fail`; `room_cleared` carries `objective` and `won`.

## Probes

- `node tools/objectives-probe.mjs` (headless, 56 checks): assignment rules
  over 40 seeds (all four kinds and all six pairs), hunt won / escaped, purge
  won / rooted, the pilgrim's road on every layout met, escort walk / wait /
  arrive / fall, hold lit / relit / sealed / out, child caps, bounties,
  same-seed replays, mid-purge, mid-escort and mid-hold save and load.
- `node tools/objectives-browser.mjs [--lang de] [--legs all|eh]` against
  `npm run dev`: the real pages, door glyphs, the tips, the banners, the
  winded beat, nests spawning and dying, the pilgrim walking, waiting and
  arriving, the ring lit, empty, surging and sealed; screenshots in
  `captures/objective-*.png`.
- `node tools/gntM2-goldens.mjs`: the nine goldens stay identical.

## Known limits

- Nests are not colliders for walking (enemies separate from them softly).
- No row in the `?vfxlab=1` panel yet.
- Numbers were tuned with autopilot campaigns, not human play.
- The pilgrim is not healed by the Healer's heals (it is not a party seat).
