# The Bellwright (Tolly)

v0.5.278. Content plan 4, slice 4 (`/mnt/project-files/plan/CONTENT_PLAN_4.md`,
"Bellwright playable"). Tolly is a beetle bell-ringer from the Barrow and a
**zone caster**: she hangs bells that toll on a beat, then rings them all at
once. This slice makes her playable with a base kit of four skills. Slice 5
fills the kit to eleven skills and eight class nodes with her full VFX and
sound set; slice 6 puts her in the world (the unlock at the first Level III
clear, camp talk, story, kit and tints, deeds, class relics, the Journal).

All numbers are first guesses, in the units of the skill table
(docs/CLASS_SKILLS.md: u = world units, cd in seconds).

## Who she is

- **Tolly**, a round bell beetle with bronze wing cases, two curling antennae
  and a little belfry on her back with a bell hanging over her head. She
  carries a short bell mallet and a tuning fork at her belt. The bell is the story's own symbol (the Healer is the
  bell-carrier), and no other class plays like a zone caster.
- Silhouette: the only hero whose prop rides **above** her head, and the only
  one with feelers (rig `src/render/critters/bellwright.js`).
- Colours: class accent Bell Bronze `#7A5530` (rings, HP bars, trim); VFX
  signature Bell Brass `#F5D06B` glow, Verdigris `#86D3B4` second, Old Bronze
  `#8A6A3E` debris. Clear of the reserved hues (Ember, Bright Heal, Violet);
  her glow is paler and yellower than the Healer's Lantern Gold, and the
  Verdigris edge sets her apart from it.
- Body: 95 HP (sturdier than the other casters, the shell), speed 2.35 (the
  slowest after the Tank), the shared dodge.

## Who gets her

- **Free from the start** in this slice (`BELLWRIGHT_FREE` in
  `src/data/lineup.js`). Slice 6 replaces that one flag with the first
  Level III clear.
- Campaigns only (Endless, Daily and Boss Rush included). The tutorial, the
  legacy single-level run and `?room=` stay the default four.
- Four seats, now up to six classes (docs/LINEUP.md). The picker chooses who
  **joins** the team, never who stays at camp: the Healer always does, the
  class you play always does, and the rest is your pick, today's party by
  default. Picking her on the class picker puts her in the Archer's place and
  opens "Who joins the team?".
- Co-op: each human picks their own character in the lobby first, then the
  host fills the empty seats with AI. She is on the lobby roster for everyone.
- At camp she stands on the west side of the fire, between the Tank and the
  Archer, when she does not join.

## Kit

| | what | numbers |
|---|---|---|
| Ding (basic) | a thrown chime | 7 damage, 0.4 s, range 4.2, speed 5.4 |
| Hang Bell | ground placement: a **bell** | 7 per toll, one toll a second for 8 s, cd 5, range 4.0, ring 1.3; each toll slows 20% for 0.6 s; **three bells at most**, a fourth replaces her oldest |
| Peal | rings every bell she has hung at once | 16 to up to 6 enemies within 1.5 u of each bell, cd 9, a 0.4 s daze (not the bosses); each enemy is struck once (by its nearest bell); with no bell hung it rings round her |
| Clapper | projectile | 12, cd 2.5, range 4.8, speed 6.5; **+50%** on an enemy inside one of her bells' rings |
| Hum | passive aura | every second, 4 to the 3 nearest enemies within 2.2 u |

How it plays: hang bells where the fight will be (by the Tank, on a defend
point, across a doorway), let them toll while the pack walks in, throw the
Clapper at whoever stands in a ring, and Peal when the rings are full.

Engineering (`src/sim/`):
- `bell: true` on a skill makes its ground placement one of her bells: an
  ally zone flagged `bell` (saved with the run like any zone) that tolls on
  the normal 1 s zone beat. `CLASS_TECH.bellCap` (3) retires her oldest bells
  (`azone_expire` with `replaced: true`).
- `peal: true` on a nova rings every bell of hers (`allycast.js`): the cast
  event carries `bells` (each `{ id, x, z }`, `id: null` when it rang round
  her) and `targets`.
- `ringBonus: true` on a projectile: a hit inside one of her rings deals
  `CLASS_TECH.ringMul` (x1.5) and emits `bell_ring_hit`.
- Hum is an ordinary hostile-field aura (like Kestrel Watch and Tidepool).
- All four skills are campaign-only (`CAMPAIGN_ONLY_SKILLS`), so the nine
  goldens draw from the old pools.
- Shared nodes she can draw (12): sharpen, quicken, multiply, ascend, widen,
  reach, linger, bounce, snare, echo, resonance, siphon. Her eight class nodes
  come in slice 5.

## How the AI plays her

When an AI holds her seat (solo, or an empty co-op seat) she keeps the ranged
stand-off, the kite away from a hostile inside 1.6 u and the glob evasion
every ranged seat has, plus (`src/sim/partyai.js`):
- **Hang Bell** goes to the densest pack in reach that none of her bells
  already covers, a pack by the Tank or the Waystone first.
- **Peal** waits for its payoff: two enemies inside her bells' rings, or one
  elite, champion or boss. With no bell hung it rings round her when two are
  in the burst or one is on top of her. Past the idle fallback it casts
  anyway, like every overdue active.
- **Clapper** prefers an enemy standing in one of her rings, else her target.
- Equip priority (`AI_PRIORITY.bellwright`): Hang Bell, Peal, Clapper, Hum.

## Look and sound (first pass)

- Every Hang Bell drops a real bell onto a little timber A-frame in the room
  (`src/render/vfx/bellfx.js`): it lands with a thunk, a dust puff and a
  sigil ring on the floor, swings as a damped pendulum, and every toll throws
  a ring of sound (brass with a verdigris echo) across its ring with a flash
  at the bell's mouth and a brass shiver on each enemy it shook. When it ends
  it chimes once and shrinks away; a replaced bell just shrinks away.
- The Peal rocks every bell at once: a double shock ring, a column of struck
  light and a spray of brass and verdigris sparks at each, a star over every
  enemy struck, and a camera kick that grows with the number of bells.
- The Clapper's hit inside a ring flashes a brass star and a verdigris ring.
- Sounds (`src/audio/bellcues.js`, procedural FM bells): `bw_ding`,
  `bw_hang` (thunk and chime), `bw_toll` (alternate tolls a step apart so
  three bells read as a peal), `bw_peal` (a struck cluster over a low hum),
  `bw_clap`, `bw_ring`. Levels are offline estimates; re-measure with
  `tools/smallfixes2-cuecal.mjs --only bellcues --write`.
- `?vfxlab=1` has a "Bellwright A" reel: three bells hung, the Clapper into a
  ring, the Peal, then the Hum.
- Slice 5 brings the rest: her own cast beats for every skill, the other
  seven skills' effects and sounds, more reels.

## Checks

- `node tools/bellwright-probe.mjs` (headless, 45 checks): data and gate,
  who joins, the six-card picker and the lobby roster, the AI playing her in
  a long fight (bells hung, at most three, a toll a second, the Peal ringing
  them with each enemy struck once and dazed, the Clapper's +50% in a ring,
  Hum, Ding), the cap replacing the oldest bell, a human press hanging a bell
  at the aim, her shop shelf, and a mid-fight save with bells hung continuing
  bit-identically.
- `node tools/bellwright-browser.mjs` (needs Vite on 5199) takes the
  screenshots under `/mnt/project-files/bellwright-playable/`.
- `node tools/gntM2-goldens.mjs` stays 9/9.
