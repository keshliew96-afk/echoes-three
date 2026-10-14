# The Bellwright (Tolly)

v0.5.278, her whole kit v0.5.279. Content plan 4, slices 4 and 5
(`/mnt/project-files/plan/CONTENT_PLAN_4.md`, "Bellwright playable" and
"Bellwright kit, VFX and sounds"). Tolly is a beetle bell-ringer from the
Barrow and a **zone caster**: she hangs bells that toll on a beat, then rings
them all at once. Slice 4 made her playable with a base kit of four skills;
slice 5 fills it to eleven skills and eight class nodes with her full VFX and
sound set (see "Her whole kit" below). Slice 6 puts her in the world (the
unlock at the first Level III clear, camp talk, story, kit and tints, deeds,
class relics, the Journal).

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
  reach, linger, bounce, snare, echo, resonance, siphon, plus her eight class
  nodes (below).

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
- Slice 5 brought the rest (below).

## Her whole kit (slice 5)

Seven more skills, all campaign-only like the first four, so her pool is
eleven. The rhythm stays hang, then ring: two more ways to hang a bell, a
bolt that reads the rings, a swing for when they close in, two wards for the
party and a capstone that rings everything.

| | what | numbers |
|---|---|---|
| Great Bell (GR) | a bigger bell: one of her bells, so it counts against the three | 12 per toll for 6 s, cd 14, range 4.0, ring 1.9; each toll slows 35% for 0.8 s |
| Knell (KN) | a struck note through a line, reading the rings | 15 to every enemy along 5.5 u (speed 7), cd 7; **+50%** on each one inside one of her rings |
| Bell Swing (SG) | she swings her belfry bell | 18 to up to 5 in a 120° arc 1.9 u out, cd 8, knocked back 1 u |
| Wing Hop (WH) | her wing cases flick her clear | a 2.4 u hop away from the aim (untouchable, 14 ticks), cd 8; a handbell is left where she stood: 5 per toll for 4 s, ring 1.0, each toll slows 20%; one of her bells |
| Vesper Chime (VC) | a ward for the hunted | a 12 shield for 4 s on the two members enemies are after (the Tank last), cd 11, range 4.0 |
| Tuning Fork (TF) | the party in tune | every member within 3 u, her too: a 6 shield and 25% haste for 3 s, cd 12 |
| Carillon (CA) | the capstone: the Peal at full weight | rings every bell at once: 24 to up to 8 round each, a 0.6 s daze (not the bosses), cd 18, area 1.8; **every bell it rings starts its time over** |

Engineering: everything above reuses the plain-data keys the Tidecaller
brought (`pierce`, `vault` + `atOrigin`, `pick: 'threat'`, `push`, `grant`)
and the bell keys from slice 4 (`bell`, `peal`, `ringBonus`). Two are new:
`bellSize` (how big the renderer draws a hung bell; the sim reads only its
`area`) and `rehang` (the Carillon: each bell's `totalTicks` becomes its
tolls done plus its full length, kept on the bell as `fullTicks`). Every bell
also carries `fullTicks` and, when it is not 1, `bellSize` on its
`azone_spawn` event. A ring bonus now works on a swing and on the Hum too
(Tuned), not only on a bolt.

### Class nodes (six common, two rare)

| node | rarity | works on | effect |
|---|---|---|---|
| Bronze | common, 2 copies | her bells (Hang Bell, Great Bell, Wing Hop) | the bell tolls 2 s longer, per copy |
| Clangour | common | her bells | each toll slows 15% more |
| Resound | common | the ring-bonus skills (Clapper, Knell) | the ring bonus grows from +50% to +90% |
| Aftertone | common | the Peal and the Carillon | every bell it rings tolls two more times |
| Tuned | common | Bell Swing and the Hum | the skill gets the ring bonus (+50% inside one of her rings) |
| Cloister | common | her wards (Vesper Chime, Tuning Fork) | the shield is 50% stronger on a member inside one of her rings |
| Belfry | rare | her bells | while she hangs with this skill, four bells can hang at once |
| Sympathy | rare | the ring-bonus skills | a ring hit makes that bell toll at once, an extra toll (at most once a second per bell) |

All eight are campaign-only (`CAMPAIGN_ONLY_NODES`). Their logic is
`bellDef()` in `src/sim/allycast.js` (a skill with none of them comes back as
the very same def, so no other class's cast changes), `tunedPulse()` for the
Hum (`src/sim/party.js`), and `classVerdict()` in `src/sim/nodes.js`. The
numbers are in `CLASS_TECH` (`bronzeSec`, `clangourMag`, `resoundMul`,
`aftertoneTolls`, `cloisterMul`, `belfryCap`, `sympathyGapTicks`). New events:
`bell_sympathy` (`{ id, x, z }`) and `bell_rehang` (`{ id, left, x, z }`).

The node ids avoid every skill id: a node named after the Healer's
Sanctuary skill would have dropped Sanctuary from the old pools (the gate
reads both lists), so her shield node is Cloister.

### How the AI plays the rest

- **Great Bell** follows Hang Bell's rule (the densest pack in reach no bell
  already covers, by the Tank or the Waystone first).
- **Knell** aims where the line holds two enemies, each one in a ring of hers
  counting twice.
- **Bell Swing** swings at two in reach, or one on top of her.
- **Wing Hop** is her panic button (an enemy on top of her), like Ripple Step.
- **Vesper Chime** goes up when a member in reach is hunted or below 70%.
- **Tuning Fork** waits for two more members in reach and an enemy within
  3 u of one of them.
- **Carillon** waits for two bells and three enemies in their rings (or a
  big one); with no bell hung, three round her.
- Equip priority (`AI_PRIORITY.bellwright`): Hang Bell, Great Bell, Peal,
  Carillon, Knell, Clapper, Vesper Chime, Bell Swing, Tuning Fork, Wing Hop,
  Hum.

### Look and sound

`src/render/vfx/bellfx.js`:
- The **Great Bell** is drawn 1.4 times the size and lands like a weight: a
  bronze crack under it, a second slower shock ring, grit thrown up and a
  heavier camera kick; its tolls throw a doubled ring. **Wing Hop's**
  handbell is drawn at 0.7 and drops faster.
- Every bell's floor ring now lasts exactly as long as the bell tolls.
- The **Knell** leaves her mallet as a hard brass ring and rolls down its
  line as six arcs bowed forward, each arriving with the bolt, over a faint
  verdigris wake.
- **Bell Swing** swings the belfry bell itself through the arc on a brass
  slash, with a clang, sparks and a kick where it bottoms out.
- **Wing Hop** flicks two bronze wing-case arcs open where she stood and
  draws a verdigris line to where she lands.
- **Vesper Chime** hangs a little chime bell over each ward that sways in and
  is struck once, closing a verdigris shell round the ally.
- **Tuning Fork** strikes a standing wave of thin rings out to its 3 u reach
  and runs brass haste lines up every ally it reaches.
- The **Carillon** is the Peal at full weight (taller columns, a third shock
  ring, more sparks, a bigger kick) with every bell joined to the next by a
  chord of struck light; then each bell's ring is drawn again as its time
  starts over, with a verdigris glint climbing it. **Sympathy's** answering
  toll rocks the bell and lifts a thin verdigris column.

`src/audio/bellcues.js` adds `bw_great`, `bw_knell`, `bw_swing`, `bw_hop`,
`bw_vesper`, `bw_fork`, `bw_carillon`, `bw_answer` (Sympathy) and `bw_after`
(a bell's time starting over). A great bell tolls a fourth lower, a handbell
an octave higher. `tools/smallfixes2-cuecal.mjs --only bellcues` now measures
her cues.

`?vfxlab=1` has three Bellwright reels: A (Hang Bell x3, Clapper, Peal, Hum),
B (Great Bell, Knell, Carillon, Bell Swing) and C (Hang Bell x3, Vesper
Chime, Tuning Fork, Wing Hop).

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
- `node tools/bellwright-kit-probe.mjs` (headless, 59 checks): her eleven
  skills and eight nodes as data (campaign-only, the AI order, her node pool,
  card text, icons and the nine languages), which skills each node works on,
  the seven new skills on training dummies, the eight nodes each on a skill
  it works on, the AI casting all ten actives in real fights, and a
  mid-fight save with bells hung and nodes socketed continuing
  bit-identically.
- `node tools/gntM2-goldens.mjs` stays 9/9.
