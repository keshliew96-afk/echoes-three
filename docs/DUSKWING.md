# The Duskwing (Sable)

v0.5.293 (slice 4), v0.5.294 (slice 5), in the world v0.5.295 (slice 6).
Content plan 5, slices 4, 5 and 6
(`/mnt/project-files/plan/CONTENT_PLAN_5.md`, "Duskwing playable"). Sable is
a fruit bat from the dark under the roads and a **melee diver**: he drops
onto a pack from out of reach, bites the life out of it and puts its lights
out. Slice 4 makes him playable with a base kit of four skills and a first
pass of his VFX and sounds. Slice 5 fills the kit to eleven skills and eight
class nodes with his full VFX and sound set and polishes how the AI plays
him; slice 6 puts him in the world (the unlock on the first Level IV clear,
camp talk, deeds and tints).

All numbers are first guesses, in the units of the skill table
(docs/CLASS_SKILLS.md: u = world units, cd in seconds).

## Who he is

- **Sable**, a chibi fruit bat: a plum-brown furry pear of a body with a pale
  chest ruff, two big leaf ears splayed wide with rose linings, a pug nose,
  two small fangs and a tuft on the crown. His leather wings hang folded at
  his sides like a cloak, half open and beating as he hops along, and flare
  wide with one hard beat on every cast.
- Silhouette: the only hero with wings, and the only one whose outline
  changes width when he strikes (rig `src/render/critters/duskwing.js`).
- Colours: class accent Dusk Plum `#55304F` (rings, HP bars, trim); VFX
  signature Dusk Rose `#E0509E` glow, Pale Moon `#F2D9E6` second, Wing
  Leather `#7A4E66` debris, with a dark ink smoke for the night itself. Clear
  of the reserved hues (Ember, Bright Heal, Violet): the rose is pinker and
  warmer than the Violet, and his heals never use the Bright Heal green.
- Body: 80 HP (light, like the Archer), speed 2.9 (the fastest of the seven),
  the shared dodge.

## Who gets him

- **Freed with the Verse of Heart** since slice 6: the first Level IV clear
  on this player's profile, or any Level IV boss felled (see "Unlock"
  below). Slices 4 and 5 had him free from the start.
- Campaigns only (Endless, Daily and Boss Rush included). The tutorial, the
  legacy single-level run and `?room=` stay the default four.
- Four seats, now up to seven classes (docs/LINEUP.md). The picker chooses
  who **joins** the team, never who stays at camp: the Healer always does,
  the class you play always does, and the rest is your pick, today's party by
  default. Picking him on the class picker puts him in the Archer's place and
  opens "Who joins the team?".
- Co-op: each human picks their own character in the lobby first, then the
  host fills the empty seats with AI. He is on the lobby roster for everyone.
- At camp he perches on the east side of the fire when he
  does not join.

## Kit

| | what | numbers |
|---|---|---|
| Nip (basic) | a quick bite | 7 damage, every 0.3 s, reach 0.8, a 90° arc |
| Dusk Dive (DV) | a dive onto the aim, then a burst where he lands | dashes up to 3.6 u (speed 13, untouchable on the way), then 16 to up to 5 enemies within 1.2 u, cd 6 |
| Bloodbite (BI) | a deep bite | 20 to up to 2 in an 80° arc 0.95 u out, cd 4; **half of what it deals comes back to him as health** (on top of Night Hunger) |
| Nightfall (NF) | darkness round him | 6 to up to 8 enemies within 2.0 u, cd 11, and each is **blinded** for 2 s (not the bosses) |
| Night Wings (NW) | passive aura | every second, 3 to the 3 nearest enemies within 1.3 u, never pushed |

**Night Hunger** is his innate trait: every blow he lands (Nip, his skills,
Night Wings) feeds him 8% of the damage it dealt; Bloodbite's drain adds its
50% on top (58% in all). Nothing is fed while he is at full health, and only
his own blows feed him.

**Blind**, a new status: a blinded enemy starts no attack (no wind-up, no
bite, no shot; one already winding up is cancelled) and gropes about at half
speed. It lasts 2 s at most, a fresh Nightfall refreshes it, and the bosses
and the party can never be blinded. There is no grace window after it ends
in this slice.

How it plays: wait at the edge of the fight, Dive into the thickest pack,
Nightfall at once so it cannot answer, then Bloodbite and Nip through it
while Night Hunger keeps him standing. Light on health, so keep moving.

Engineering (`src/sim/`):
- Dusk Dive is a nova with a `dash` key (`allycast.js`, the same path as the
  Tidecaller's Ripple Step): he moves first (`ally_dash` with `x0, z0, x1,
  z1, ticks`, untouchable while it runs) and the burst is delivered where he
  lands (`ally_cast`).
- Blind is the tenth status kind (`src/sim/status.js`: `isBlinded(e, tick)`,
  `STATUS_RULES.blindMaxTicks` 120, `blindSlow` 0.5, hostile only, bosses
  refused with `boss_immune`). `resolveEnemies` in `src/sim/enemies.js`
  skips a blinded enemy's attack logic and cancels its telegraph.
- Night Hunger (`src/sim/duskwing.js`, `installNightHunger`, wired in
  `world.js` on the `hit` bus): each blow banks `CLASS_TECH.duskDrain`
  (0.08) of its damage, plus a skill row's `drain`, in `drainBank` on his
  body (plain data, so saves carry it); once the bank reaches
  `CLASS_TECH.drainSip` (1.5 HP) it pays out as one `heal` event with
  `source: 'night_hunger'`. No randomness, so the goldens cannot move.
- Night Wings is an ordinary hostile-field aura (like the Hum).
- All four skills are campaign-only (`CAMPAIGN_ONLY_SKILLS`), so the nine
  goldens draw from the old pools.
- Shared nodes he can draw (12): sharpen, quicken, multiply, ascend, widen,
  reach, keen, siphon, echo, snare, galvanize, resonance. His class nodes
  come in slice 5.

## How the AI plays him

When an AI holds his seat (solo, or an empty co-op seat) he fights as a melee
seat (`MELEE_CLASSES`, like the Tank and the Swordsman), plus
(`src/sim/partyai.js`):
- **Dusk Dive** goes for the densest pack (two or more) within reach of the
  dive and its burst, else a lone enemy between 1 u and that reach.
- **Bloodbite** bites whatever is in reach, and at once when he is below
  70% health.
- **Nightfall** waits for three enemies round him, or one elite or champion
  (never a boss, which it cannot blind).
- Equip priority (`AI_PRIORITY.duskwing`): Dusk Dive, Bloodbite, Nightfall,
  Night Wings.

## Look and sound (first pass)

`src/render/vfx/duskfx.js`:
- **Dusk Dive** leaves a trail of rose wing streaks and dark ink smoke along
  the dive, then lands with a rose star, a double shock ring, a flash of
  light, a gouge mark on the floor, a spray of sparks and a camera kick.
- **Bloodbite** crosses two fang slashes over the target and draws a thread
  of rose light from each enemy bitten back to him.
- **Nightfall** throws up a dome of ink smoke round him with a sigil on the
  floor and a dark shock ring.
- **Night Hunger** heals rise as rose motes.
- A **blinded** enemy carries a dark puff with two small rose eye-sparks
  over its head for as long as the blind holds.
- Sounds (`src/audio/duskcues.js`, procedural): `dk_nip` (a leathery flick
  and a squeak), `dk_dive` (wings folding, a falling whoosh), `dk_land` (a
  thump, a shriek and a wing snap), `dk_bite` (a wet snap of teeth over a
  hiss), `dk_sip` (a soft rising breath), `dk_night` (a deep wing-beat, a
  downward sweep and three echo-location chirps). Levels measured with
  `tools/smallfixes2-cuecal.mjs --only duskcues --write`.
- `?vfxlab=1` has a "Duskwing A" reel: the dive, Bloodbite, Nightfall and
  Night Wings.

## His whole kit (slice 5)

Seven more skills join the four, all campaign-only and in his draft pool
only:

| | what | numbers |
|---|---|---|
| Echo Screech (EC) | a screech down a cone | 10 to up to 6 in a 70° cone 2.6 u out, cd 9; each is **exposed** 25% for 3 s |
| Talon Rake (TK) | a wide rake of the wing claws | 15 to up to 5 in a 150° arc 1.2 u out, knocked back 0.6 u, cd 6 |
| Bat Swarm (BR) | a cloud of small bats at the target | 5 a second for 4 s in 1.3 u (range 4.5), slows 20%, cd 10; **drain 25%** |
| Shadow Veil (SV) | the dark folds round him | an 18 shield on him for 3 s, and 8 to up to 4 within 1.2 u, cd 12 |
| Flit (FT) | his way out | flits 2.8 u away from the aim (untouchable), leaving a puff of night where he was for 2 s: 4 a second and a 1 s **blind**, cd 7 |
| Blood Scent (SE) | passive | every second, 2 to the 2 nearest within 2.6 u, each exposed 15% |
| Blood Moon (BM) | his capstone | 30 to up to 10 within 2.4 u, a 1.5 s blind (not the bosses), cd 18; **drain 35%** |

`drain` is the same key Bloodbite carries; it now feeds him from a zone's
ticks (Bat Swarm) and a burst (Blood Moon) too, on top of Night Hunger's 8%.
His AI order: Dusk Dive, Bloodbite, Nightfall, Blood Moon, Talon Rake, Echo
Screech, Bat Swarm, Flit, Shadow Veil, Blood Scent, Night Wings.

### His eight class nodes

Six common, two rare (`CLASS_NODES.duskwing`, numbers in `CLASS_TECH`). His
node pool is 20: the 12 shared and these eight.

| node | what | works on |
|---|---|---|
| Deep Dive (×2) | a dive or a flit goes 0.8 u farther, per copy | Dusk Dive, Flit |
| Thirst (×2) | the skill's blows feed him 15% more, per copy | all eleven |
| Gloom | what the skill hits is blinded 1 s (not the bosses) | strikes and zones that do not blind already |
| Ambush | +40% on a blinded enemy | his nine actives |
| Echolocate | what the skill hits takes +15% for 2 s | actives that do not mark already |
| Frenzy | reaching 3 or more enemies makes him 25% faster for 2 s | swings and bursts |
| Vampire (rare) | Night Hunger on the skill's blows doubled; at full health it gathers as a shield, up to 15 | all eleven |
| Eclipse (rare) | an enemy the skill fells bursts into darkness: a 1 s blind within 1.4 u | swings and bursts |

Engineering: `duskDef` in `src/sim/allycast.js` (like `bellDef`) resolves
Gloom, Echolocate (`extraStatus`, riding a zone as `extras`), Ambush, Frenzy
and Eclipse; Deep Dive rides `seatDisplacement` / `aiDisplacement` (so a
guest predicts it); Thirst and Vampire ride Night Hunger in
`src/sim/duskwing.js` through `techsOf(seat, skill)`. New events:
`dusk_frenzy`, `dusk_eclipse`, `dusk_vampire`, `dusk_pull_out`,
`dusk_back_in`. A run without him draws nothing new, so the nine goldens hold.

### When the AI dives and when it pulls out

- `AI_DUSK` in `src/data/classes.js`: below 35% health he **pulls out**
  (`dusk_pull_out`): no more dives, and he steps back to 2.4 u off the
  nearest enemy inside his ring, still facing it, until Night Hunger and the
  Healer bring him over 60% (`dusk_back_in`).
- Dusk Dive never picks a landing a telegraph covers, and never fires while
  he is pulled out or below 35%.
- Flit is his way out: low (or pulled out) with an enemy within 1.4 u, or a
  telegraph over him; it runs from the nearest.
- Shadow Veil: an enemy on top of him and after him, a telegraph over him,
  or below 60% with an enemy within 2 u.
- Echo Screech: the cone that holds two or more, else a big enemy in reach.
  Talon Rake: two in reach, or one on top of him. Bat Swarm: the densest
  pack of two or more, else a big enemy. Blood Moon: four round him (three
  when he is below half or one is big), at least two not yet blinded.

### Look and sound

`src/render/vfx/duskfx.js` adds a beat for each: Echo Screech rolls three
pale sound fronts down the cone and rings each enemy it finds; Talon Rake
fans three claw cuts over a rose sweep; Bat Swarm pours wing streaks in and
keeps small bats darting round the spot while it holds, a rose nip on each
bite; Shadow Veil wraps two dark wings shut round him and cuts a ring; Flit
leaves wing streaks and a puff of night that hangs where he was; Blood Scent
curls a red wisp off each marked enemy; Blood Moon raises a red moon over
him, drops a sheet of dark with two shock rings and pulls a thread of life
off every enemy. Frenzy, Eclipse and Vampire each have a small beat.
`?vfxlab=1` has "Duskwing A", "B" and "C" reels.

Sounds (`src/audio/duskcues.js`): `dk_screech`, `dk_rake`, `dk_swarm`,
`dk_nibble`, `dk_veil`, `dk_flit`, `dk_moon`, `dk_eclipse`, `dk_frenzy`,
measured with `tools/smallfixes2-cuecal.mjs --only duskcues --write`.

Checks: `node tools/duskwing-kit-probe.mjs` (headless) covers the data and
gate, every node's verdicts, each new skill on training dummies, each node
on a skill it works on, the AI playing all nine actives, pulling out and
going back in, and a mid-fight save that continues bit-identically.

## Unlock (slice 6)

- `DUSKWING_FREE` in `src/data/lineup.js` is now `false`. He is a choice
  once the profile holds the `duskwing` feat (`meta.feats`, FEATS in
  `src/data/unlocks.js`): the first campaign Level IV clear stores it
  mid-run (`save/index.js`, with a toast: "The Duskwing joins the party.
  Sable perches by the hearth."), and `featsOf` also counts a recorded
  Level IV clear or any Level IV boss felled (the Hollow Cantor, the Geode
  Colossus, the Vein Weaver; `HEART_BOSSES`), so a save from before this
  build that has done either frees him on load. `main.js` sets the gate
  from the profile (`setDuskwingUnlocked`); `?sable=1` opens him on a
  harness boot (`forceDuskwing`).
- A profile that picked him while he was free (v0.5.293 and v0.5.294) and
  has not cleared Level IV is locked again, exactly as Tolly was in her
  slice 6: the gate reads only the Verse of Heart. A lineup or team setting
  that already holds him stays valid (`normalizeLineup` never reads the
  gate); the picker and the team view just stop offering him.
- Exactly Rill's and Tolly's rules: the flag gates only CHOOSING him (the
  class picker, the team view, the lobby roster), so the sim never depends
  on a profile. Locked, his card shows LOCKED with "How to free him"; the
  team view and the lobby leave him out; at camp his rig is hidden.
- Co-op: each player frees him on their own profile (a guest hears the
  host's Level IV clear and frees him too).

## Sable in the world (slice 6)

All of it is profile data, presentation, or campaign-only relics, so the
nine goldens are untouched.

- **Camp talk.** Once freed, walk up to him at his perch on the east side of
  the fire (while he does not join the run) and E talks (the hero-talk path
  in `src/scenes/campnpcs.js`, beside Rill and Tolly). His first line is for
  four verses or fewer (he joins with Heart), then one for five verses
  (`SABLE_LINES` in `src/data/story.js`), with a tip line on further talks.
  Wick gains a line about him.
- **Story.** The Hollow Voice speaks to him the first time he stands in a
  Heart boss room (after its boss line; seen key `voice_sable`); the
  Level IV clear card adds his line (freed, or flying along when he is in
  the party); he joins the People list on the Journal's Story page once
  freed. His relics and deeds fill the Journal's Relics and Deeds pages
  like everyone's.
- **Kit.** Night Roost, 80 Embers once he is freed: Echo Screech, Talon
  Rake, Bat Swarm and Flit.
- **Tints.** Gloaming (30 Embers once freed: the blue of the last light)
  and Heartblood (free for felling the Hollow Cantor with him in the party:
  the Heart's own red). Feat `sable_cantor`.
- **Deeds.** Sable's Night (25): clear a level with the Duskwing in the
  party. Lights Out (30): blind 6 enemies with one cast (`blindBest`,
  counted by `src/save/deedrun.js` from `status_apply` blinds that share a
  tick and a caster; blind is his status alone).
- **Class relics** (offered only while he stands in the party, so never to
  the default four; no dice, so holding them never moves the relic stream):
  - Ripe Fig (common): his Dusk Dive heals him 3 HP for every enemy its
    landing strikes.
  - Moonless Fang (rare): every fourth blow he lands on a blinded enemy
    bites again for 8 (`fangHits` saved with the run).
  Both have heirlooms. Effects in `src/render/vfx/signature.js`: Ripe Fig
  bursts rose at his chest and closes one pale ring on him per enemy struck,
  a beat apart, with juice drops falling; Moonless Fang crosses two pale
  crescents over the blinded enemy with a rose flash and a puff of ink.
  Sounds reuse `sparkle` and his own `dk_bite`.
- **Tip.** The first enemy blinded in a fight opens a "Dive, then darken"
  tip.

## Checks

- `node tools/duskwing-probe.mjs` (headless, 51 checks): his data and gate,
  who joins the team, the seven-card picker and the lobby roster, blind's
  rules; a campaign with the AI playing him (the dive and its burst,
  Bloodbite, Night Hunger, Nightfall's blind and no attack started while
  blinded, Night Wings, Nip); Night Hunger by the numbers; his seat played
  by a human (a key press dives at the aim, untouchable, the burst lands
  where it ends); the shop shelf; a mid-fight save that continues
  bit-identically.
- `node tools/duskwing-browser.mjs` (needs `npm run dev`): the seven cards,
  "Who joins the team?", the camp, and a real room where he dives, blinds
  and bites; `--lang <code>` takes only the picker in that language.
- `node tools/duskwing-world-probe.mjs` (headless, 54 checks, slice 6): the
  unlock (locked fresh, the first Level IV clear frees him once, old saves
  and the Level IV bosses free him, Rill's and Tolly's gates untouched), his
  kit and tints, his deeds and the blind tracker, his two relics in a real
  fight (and never offered to the default four) with a mid-fight save
  continuing bit-identically, and the story data.
- `node tools/duskwing-world-browser.mjs` (needs Vite on 5199) takes the
  slice 6 screenshots under `/mnt/project-files/duskwing-world/`.
- The older Duskwing, Bellwright and Tidecaller browser probes boot with
  `?sable=1` since slice 6.
- The nine goldens (`tools/gntM2-goldens.mjs`) stay byte-identical.
