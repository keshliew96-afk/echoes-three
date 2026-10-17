# The Duskwing (Sable)

v0.5.293. Content plan 5, slice 4
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

- **Free from the start** in this slice (`DUSKWING_FREE` in
  `src/data/lineup.js`); slice 6 swaps in the real unlock. `?sable=1` opens
  him the way slice 6's unlock will (`forceDuskwing`).
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
- The nine goldens (`tools/gntM2-goldens.mjs`) stay byte-identical.
