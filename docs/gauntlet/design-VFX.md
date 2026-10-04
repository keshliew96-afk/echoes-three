# VFX redesign — class signatures, enemy and boss effects

Owner: VFX (the user's 2026-10-02 request). This document replaces the
queued "upgrade the skill VFX" design (PROGRESS G41, `design-VFX.md` was its
planned file) and is the binding source for every combat effect.

The user's words: *"design high-quality VFX (VFX Style, Energy & Shapes,
Light & Glow, Debris & Pacing, Camera & View; all of it need to match the
class of the character) and replace current VFX of all character and enemies
and boss"*.

## 1. What was wrong

Before this change every party member shared one damage grammar: a
Parchment-white core with a Hearth Amber glow (BUILD_BRIEF §19.4, "player
damage bolts"). The Tank's Heavy Slam, the Swordsman's Flurry and the Archer's
Volley all drew the same amber wedge or the same amber ring, so a fight read
as "a lot of orange flashes" and nobody could tell who did what. Enemies were
better separated (Ember telegraphs), but their hits all threw the same spark
and puff, and the Stag's quake was an Ember ring plus a shake.

## 2. Rules that do not change

These stay binding, because gameplay readability depends on them:

- **Ember Danger** (`#FF5A36`) is enemy threat only: telegraphs, enemy shots,
  enemy hits on the party. No party effect uses it.
- **Bright Heal** (`#5FE873`) is heal output only. No damage effect is green.
- **God-stuff Violet** (`#B79CF0`) is the Stag and corruption only.
- **Signal Blue** stays the mark reticle glyph.
- Telegraph *shapes* (lanes, rings, cones, chevrons) and their timing are sim
  truth and are not redrawn here; only what plays around them changes.
- Nothing is communicated by colour alone. Each class and each enemy is told
  apart by **shape** first, colour second.
- Effects never hide a character: ground layers stay under the bodies,
  airborne layers fade out above head height (~1.6 u).
- Render-only. No sim number, event or RNG draw changes, so the goldens and
  eventsHash traces are untouched. All randomness uses the cosmetic stream.

## 3. What changes in the colour law

§19.4's "player damage = parchment core + amber glow" becomes **per class**.
Every class keeps a Parchment-white hot core (so damage still reads as
"ours"), and gets its own glow hue, debris material and shape language. The
hues are picked to stay clear of the reserved ones above:

| Class | Signature glow | Second tone | Debris | Hue gap to the nearest reserved hue |
|---|---|---|---|---|
| Healer (mouse) | Lantern Gold `#E8A23D` (Hearth Amber) | Bright Heal on heals | soft petals and motes | Ember 25°, Heal 92° |
| Tank (badger) | Forge Steel `#9DB8CF` | Earth Ochre `#8F6B45` | rock chunks and dust | Signal Blue 6°, but desaturated (s 0.24 vs 0.62) and never a glyph |
| Swordsman (fox) | Fox Crimson `#E8577A` | Moon Silver `#E7E3F0` | thin blade glints | Ember 32°, Violet 82° |
| Archer (hare) | Wind Jade `#5ED3C0` | Feather Bone `#C9C2B3` | feathers and wind streaks | Heal 42°, Signal Blue 34° |

The hexes live in `src/data/palette.js` (`VFX_SIGNATURE`), the only place
render code may take a colour from.

## 4. The five pillars, per class

Each class row answers the five things the user asked for.

### Healer — "lantern in the dark"

| Pillar | Design |
|---|---|
| Style | Soft, round, warm. Storybook lantern light and petals. |
| Energy & shapes | Circles, blooms, rising spirals. Bolts are round lantern orbs with a short soft tail; heals are petal rings that open outward and motes that rise. Nothing has a hard corner. |
| Light & glow | The strongest *glow* of the party, but low *contrast*: a wide warm pool of light on the ground under every cast and impact (fake light, no extra scene lights). Heals keep the Bright Heal core and the "+HP" glyph. |
| Debris & pacing | Almost no debris: petals and motes drift up and linger (0.8–1.2 s). Pacing is a swell: 0.12 s gather, a soft bloom, a long fade. |
| Camera & view | No kick on casts. Big heals (Nova Bloom, Hearthsong, Mending Tide) add a small inward "breath" (dolly 0.04 u) so a party-wide heal feels like a held breath. |

### Tank — "the mountain hits back"

| Pillar | Design |
|---|---|
| Style | Heavy, blunt, physical. Iron and earth. |
| Energy & shapes | Thick short arcs, squares, jagged rings, ground cracks. Swings draw a wide blunt crescent with a hard leading edge; slams draw a jagged shockwave plus radial crack lines; Iron Stance and Shield Wall use a square/hex plate motif. |
| Light & glow | Little glow, cold steel sparks on the hard edge only. The light pool is small and brief: the Tank's light is the flash of metal, not a lantern. |
| Debris & pacing | The most debris of any class: rock chunks that arc and land, dust clouds that roll outward and settle, a crack decal that stays ~1.5 s. Pacing is anticipation then weight: a 0.08 s squash, an impact frame held ~5 frames, debris for 0.6–0.9 s. |
| Camera & view | A directional kick (0.05 u) along the swing on every connecting skill, the strongest party kick. Ground Crack and Taunting Roar add a short dolly punch toward the impact. |

### Swordsman — "a red line, then the cut"

| Pillar | Design |
|---|---|
| Style | Fast, sharp, elegant. Crimson ink strokes with silver edges. |
| Energy & shapes | Thin long crescents, X-crosses, straight dash lines, orbiting blade glints. Flurry draws three thin offset slashes in quick succession; Crescent Finisher draws a wide double crescent; Blade Storm draws a full spinning ring of slashes; Fox Step and Lunge draw a straight silver line along the path. |
| Light & glow | Bright thin edges, narrow glow. Crimson light pool is narrow and short. A white glint pops at the tip of each slash. |
| Debris & pacing | Light debris: a few silver blade glints and sparks flung along the cut, no dust. Pacing is snap: no wind-up, the slash sweeps in 0.06–0.1 s and is gone by 0.25 s; afterimage lines hold 0.2 s. |
| Camera & view | A short sharp kick along the cut (0.03 u, 70 ms). No dolly — speed, not weight. |

### Archer — "wind and precision"

| Pillar | Design |
|---|---|
| Style | Precise, airy, long. Jade wind lines and feathers. |
| Energy & shapes | Straight lines and points. Arrows are long thin darts with a jade wind trail; Piercing Shot leaves a straight streak through everything it passed; Volley fans three streaks; Rain of Arrows drops vertical streaks into a ring; Detonating Charge plants a pulsing point that bursts into a star of short lines; Kestrel Watch circles a feather. |
| Light & glow | Thin bright cores, long faint trails. A small sharp light pool where an arrow lands; a release flash at the bow. |
| Debris & pacing | Feathers drift down slowly (0.9 s), wind streak motes travel along the shot. Pacing is release: an instant flash at the bow, a long clean trail (0.35 s), a crisp pin-point impact. |
| Camera & view | No kick on release. Detonating Charge and Sundering Nova get a small burst kick (0.03 u) away from the blast. |

## 5. Enemies — one threat colour, seven shapes

Every enemy keeps Ember as its threat colour and the indigo corruption tell.
What tells them apart is the shape of what they throw and what their hits
leave behind. These are drawn by the shared enemy style table, so a new enemy
type gets a sensible default (§7) and can opt into its own row.

| Enemy | Attack effect | Impact on the party | Death |
|---|---|---|---|
| Thorn Boar | dust kicked up behind the charge, gouge streaks | dirt clods + Ember sparks | dirt burst |
| Spitting Mantis | thin Ember sickle-shaped spit with a wet trail | short needle spray | chitin shards |
| Quillback | quills trail off the roll; a radial quill burst at the lane's end | quill shards | quill burst |
| Mire Toad | a dark glossy glob with drip trail; splash ring on landing | droplets | wet splash ring |
| Gloam Moth | scale-dust trail on the swoop | pale dust puff | dust cloud that settles |
| Barrow Ram | stone sparks and a forward shock cone on the slam | stone chips | stone chunks |
| Grave Mole | an earth eruption with rock chunks when it surfaces | rock chips | earth burst |

Pillars for all enemies: **style** cold and wrong, never round and warm;
**shapes** angular (spikes, sickles, cones); **light** Ember only on the
attack itself, indigo glints on the body; **debris** matches the body
material (dirt, chitin, quills, slime, dust, stone, earth); **camera** only
the sim's own shake on heavy hits, no added kick (the party should feel the
weight, not the enemy).

### 5b. Content slice 1 enemies (Sunken Mill, Ashen Barrow)

Same pillars as above. Their signature beats are recipes keyed by their own
sim events (`rotcap_burst`, `snail_mend`, `crow_volley`, `brood_split`); their
hits and deaths read the `ENEMY_VFX` row's matter.

| Enemy | Attack / signature effect | Impact on the party | Death |
|---|---|---|---|
| Rotcap | the kill pops the cap: pale spore puff and cap fragments; when the burst lands, a thin Ember edge under a soft spore wave rolling out to the ring, then spore motes that hang over the slick | spore dust | spore puff (the burst is the real death beat) |
| Lantern Snail | the mend is neither an attack nor party healing, so it is neither Ember nor Bright Heal: an indigo flash off the shell-lantern, a thin indigo ring out to the mend radius, an indigo tether to each body it mended, indigo motes rising off them | shell chips | the lantern pops and goes out (indigo flash, light), slate shell shards, a wet ring |
| Barrow Crow | the caw: an Ember beak flash, a short caw arc across the fan, three muzzle lines on the three headings, black feathers shaken loose; its shots trail as thin bone-cored darts | feather shards | a burst of black feathers drifting down, a bone beak chip |
| Brood Spider | the split: a wet ichor ring, ichor drops, pale web strands thrown to each Broodling | ichor drops | chitin leg needles (Broodlings: fewer needles and a small ichor ring) |

Matters added to `VFX_MATTER`: spore, shell, feather, ichor (and water, silt,
cinder for the bosses below). The snail's indigo is the existing rank-and-file
corruption tell (`TELL_INDIGO`), so no new hue enters the frame.

### 5c. Content slice 2 enemies (all three acts)

Built to the §10 AAA structure from the start (anticipation, a white-hot
landing frame, a shockwave, a ground mark that cools). Their beats are
recipes keyed by their own sim events; the slice-2 placeholder puffs in
`render/enemies/extras.js` are gone.

| Enemy | Attack / signature effect | Impact on the party | Death |
|---|---|---|---|
| Briar Wasp (Act I) | the dart: a small Ember gather, then a thin Ember needle running the short lane at the dart's own 9 u/s with an ochre buzz of wing dust behind it; a tiny burst where it pulls up. A swarm reads as three quick stitches, not the moth's long smear | needle shards | wing glints fluttering down, ochre dust |
| Thornling (Act I) | the planting: brambles gather in, then thorns punch up out of the floor inside a thin Ember hazard edge, a jagged bramble shockwave and a dark stain; on every prick each of its live patches bristles with thorns and Ember glints | needle shards | a last few thorns, needles and leaves |
| Weir Crab (Act II) | the snap: two short claw arcs scissor shut across the cone with a white-hot star where they meet, a carapace shockwave and weir water thrown forward | water drops | carapace chunks, water |
| Bog Lamprey (Act II) | it breaks the surface in a foam ring and ripples; the lunge is a water wake ripping down the lane at 10 u/s with an Ember head, wet stains left behind; the beaching is a slap of silt and spray; the dive back is a small splash | water drops | ripples and a spray of water |
| Grave Wisp (Act III) | the ward is indigo (the rank-and-file corruption tell): the tether takes with an indigo flare, a thread to the ward and a ring closing on it; while it holds, motes run down the thread and the ward shimmers; a hit the ward eats glints indigo; the snap scatters the thread | (no attack) | the ward light gutters out: an indigo pop, a ring, the grave mist sinking |
| Bone Knight (Act III) | the overhead slam: the blade falls as an Ember line onto a white-hot star, an Ember ring the size of the telegraph and a wider bone shockwave behind it, cracks, a crater and bone chips | bone and earth chunks | the armour falls apart: bone plates, the shield's iron, the crown's last flash |

Matters added: bramble, wasp, carapace, eel, wisp, boneplate, iron, oak.


| Pillar | Design |
|---|---|
| Style | Corrupted grandeur: violet veins under Ember threat. |
| Energy & shapes | Antler forks and fracturing rings. Antler Quake: an Ember warning ring (unchanged), then on landing a violet fracture ring, radial ground cracks, a pillar of violet light and a dust wall rolling outward. Trample: hoof-strike crack plus a violet shock arc. Add waves: a violet flare from the antlers. |
| Light & glow | The Stag is the brightest emitter in the room (unchanged); its quake throws the largest light pool of the game, violet fading to Ember. |
| Debris & pacing | Heaviest debris in the game: rock chunks, a rolling dust wall, violet embers that hang for 1.5 s. Pacing: the sim's telegraph is the anticipation, the landing holds ~6 frames, then the long linger. |
| Camera & view | The sim's stomp shake (unchanged) plus a dolly punch toward the landing (0.08 u, the largest in the game) and a 2-frame vignette pulse via the light pool. |

## 6b. The Drowned Heron and the Barrow Wyrm

Both keep God-stuff Violet as their corruption (it is the boss colour, §11)
and Ember for the threat; their matter and shapes tell them apart from the
Stag and each other. Every effect plays at the telegraph's resolve or after
it, never over the warning: the Heron's lane and ring and the Wyrm's cone and
ring stay exactly the sim's shapes.

| Pillar | Drowned Heron (Act II, the mill) | Barrow Wyrm (Act III, the barrow) |
|---|---|---|
| Style | Drowned and cold: foam and silt over violet rot. | A furnace under the grave: ash and cinders over violet cracks. |
| Energy & shapes | Long straight wakes. Bill Spear: a foam wake laid down the lane at the drive's own speed (11 u/s) with a violet-edged spearhead running along it, spray thrown off both legs while it drives, a splash ring where it stops. Wingbeat: radial gust lines and feathers out to the ring, spray off the edge. Submerge: splash, three ripple rings, a silt cloud. Surfacing: a foam geyser with a violet core. | Fans and eruptions. Ash Breath: a violet throat flare, an Ember front sweeping to the cone's rim, cinder streaks filling the cone, ash rolling down it. Burrow: a mound bursts. While underground: a trail of turned earth and ash so the party can read where it is tunnelling. Emergence: cracks, a jagged earth ring, a violet pillar, earth thrown high. Enrage: a violet flare and cracks. |
| Light & glow | Violet on the bill, the geyser core and the wingbeat; never warm. | Ember down the breath (it is the attack), violet from the cracks and the eruption. |
| Debris & pacing | Water drops (fast, heavy fall), feathers (slow flutter), silt clouds that linger ~1.5 s. | Earth chunks thrown high, ash smoke that rolls and rises, cinders that hang ~1.5 s. |
| Camera & view | A kick along the spear when it connects; a dolly on the surfacing and the death. | A short kick down the breath; a dolly on the emergence and the death. |
| Death | Falls into the millrace: the act's largest splash, feathers left on the water, violet draining up. | Crumbles to ash: cinders and violet embers rise, the cracks go cold. |

The boss rows live in `BOSS_VFX` (`heron`, `wyrm`); `vfxBossStyle(kind)`
keeps falling back to the Stag for any future boss without a row.

## 6c. The Thornmother, the Millwheel and the Lich Ram

Each act's second boss (content slice 2). Violet stays the corruption and
Ember the threat; the lanes, cones and rings stay exactly the sim's.

| Pillar | Thornmother (Act I) | Millwheel (Act II) | Lich Ram (Act III) |
|---|---|---|---|
| Style | She fights the floor: bramble and torn earth over violet rot. | The mill's own wheel turned: oak, iron and millrace water over a violet hub. | Bone and grave earth over violet; the graves open under the party. |
| Energy & shapes | Seed Volley: a violet flare off her back, seeds and husks thrown up. Each pod that lands roots in a ring of thorn spikes punching up, a jagged bramble shockwave and a violet-seamed crater. Briar Charge: violet gather on the wind-up, a torn-earth wake laid down the lane at 10 u/s with a violet spearhead, dirt thrown off her flanks while she runs; every patch she tears up bursts in a ring of flying needles and thorns. The stop is a crater, cracks and a dirt wall, bigger against a wall. | Spokes: Ember gather and a held flash at the hub. Cog Shards: five Ember muzzle lines down the fan with a needle flare on each, an iron shockwave, a spray of hot sparks and oak splinters; its shards fly as short hot iron splinters. Crosscut: a water wake and four iron gouges laid down the lane at 9 u/s, sparks thrown off the tyre while it rolls, props ground to splinters. The wall slam is the biggest beat: a violet burst, a jagged iron shockwave, cracks and a crater; then it wobbles, dizzy, under a ring of bone-white stars. On the rim: drips and the odd spark. | Rush: violet gather and two horn flares on the wind-up, a grave-dust wake down the lane at 11 u/s with a violet spearhead. Horns stuck: a violet star where they bury, a jagged bone shockwave, cracks, earth thrown back. Grave Call: violet gather, a violet sigil under it and threads to each grave. Each grave cracks open: Ember hazard edge, cracks, a crater, earth and bone thrown high; where the dead climb out, a violet pillar. Enrage: a violet pillar, a ring and a sigil, then violet motes smouldering off it for the rest of the fight. |
| Light & glow | Violet at her and in every rooting; Ember only on the threat edges. | Ember in the spokes and the shards (the attack), violet at the hub. | Violet throughout; Ember only on the graves' edges. |
| Debris & pacing | Needles (fast, heavy), dirt clods, leaves that flutter. | Oak splinters, hot sparks (short-lived), water drops. | Earth, bone chips, motes that hang ~1.5 s. |
| Camera & view | A kick down the charge; a dolly on the wall stop and the death. | A kick along the fan and the crosscut; a dolly on the wall slam and the death. | A kick down the rush; a dolly on the horns stuck, the enrage and the death. |
| Death | The thicket dies with her: a last ring of thorns, needles and leaves, violet draining out of the torn earth. | The wheel comes apart: planks flying outward, iron, the millrace it carried pouring out. | The bones come apart and the graves close: bone burst, the lich-light going up. |

The rows live in `BOSS_VFX` (`thornmother`, `millwheel`, `lichram`).

## 7. Architecture

```
src/data/palette.js      VFX_SIGNATURE hexes (the only colour source)
src/data/vfx.js          VFX style table: classes, enemies, boss, defaults;
                         vfxClassStyle(id) / vfxEnemyStyle(kind) never throw
src/render/vfx/kit.js    pooled primitives: slash, shockwave, light pool,
                         flash, streak, cracks, pillar (one shared program
                         each, fixed pools, no per-cast allocations)
src/render/vfx/camerafx.js  render-only kick + dolly punch (scaled by the
                         Screen shake setting; Reduced effects turns it off)
src/render/vfx/signature.js the director: listens to cast / hit / death /
                         enemy / boss events and plays each style's recipe
```

- **New enemies pick it up for free.** `vfxEnemyStyle(kind)` falls back to a
  default row built from the enemy's family (`charger`, `shooter`, `lobber`,
  `flyer`, `burrower`, `brute`), and to a generic Ember row when nothing is
  known. A new enemy type adds one row to `ENEMY_VFX` in `src/data/vfx.js` to
  get its own debris and shapes; no render file needs editing.
- **Replacing the old layers.** The generic amber wedge/ring the ally layer
  drew for every class, the amber skill-bolt rig used for Archer arrows, the
  amber class-skill accents and the one-size spark on every hit are replaced
  by the class recipes. Heal grammar (Bright Heal, "+HP"), status glyphs, the
  mark reticle, revive rings and all enemy telegraph shapes stay as they are.
- **Budget.** Every primitive is a fixed pool (slashes 24, rings 24, light
  pools 16, streaks 48, cracks 12, pillars 8) plus the existing three particle
  clouds (caps raised to 160 / 120 / 56). A full four-class fight with seven
  enemies stays within ~12 extra draw calls.

## 8. Settings

Settings ▸ Gameplay gains **Effects: Full / Reduced** (`gameplay.effects`).
Reduced halves particle counts, turns off the camera kick and dolly, removes
the light-pool flash and keeps every gameplay-relevant shape (telegraphs,
heal glyphs, status rings). The existing Screen shake setting also scales
the kick and dolly (Off turns them off).

## 9. Verification

- `node tools/vfx-gallery.mjs <prefix>` stages a live room with all seven
  enemy types, fires all 24 Tank/Swordsman/Archer skills and the Healer's
  skills, then the Stag's room, and screenshots each beat.
- `__echoes.content.vfx()` reports the director's live counts per primitive,
  the camera offset and `recipes` (how often each creature recipe has played).
- `node tools/vfx-roster2.mjs` (content slice 1) stages each new enemy's
  signature beat and runs the three boss rooms with the autopilot, failing
  if any Heron / Wyrm / slice-1 enemy recipe never played.
- `node tools/vfx-roster3.mjs` (content slice 2) does the same for the six
  slice-2 enemies and the Thornmother, Millwheel and Lich Ram fights.
- Smoke, the core loop and the 9 goldens must stay green (render-only change).

## 10. AAA pass (2026-10-04)

The user's review of §4-§6b: *"VFX quality is not high enough, upgrade again
using AAA gaming standard"*. The target is what a player accepts in a
top-down action game at the Diablo IV / Hades bar. Every beat now plays in
three movements, built from shared helpers in the director, so each class,
enemy and boss gets the same structure in its own colours and shapes:

| Movement | What plays | Where |
|---|---|---|
| Anticipation | An imploding ring and lines rushing into the source for ~4 frames before a big cast lands (novas, ground skills); Ember lines rushing into an enemy as its telegraph starts. The telegraph shapes themselves are unchanged. | `anticipate()`, `telegraph_start` |
| Impact | A two-layer flare (`kit.star`: a coloured spiked flare under a white-hot core) that pops in over two frames on every hit, crit, muzzle, landing and boss beat; plus the existing flash, light pool and a shockwave ring; crits add embers and a small camera punch. Spike shape follows the class: needle stars for the Swordsman and Archer, round bursts for the Tank and Healer. | `flare()`, `shock()`, `classImpact()` |
| Dissipation | Ground marks that linger 2-6 s (`kit.mark`): a dark stain in the matter's colour under an additive seam that cools: the Tank's crater, the Swordsman's cut, the Archer's and Healer's sigils, enemy stains on death, Ember-cooling scorches down the Wyrm's breath, wet stains down the Heron's lane, violet-seamed craters under every boss beat. Embers drift up after big casts. | `classMark()`, `kit.mark` |

Also in this pass:

- **Projectile heads.** Every bolt, arrow and enemy shot carries a pulsing
  orb (`kit.glow`) in its trail's colour at its head.
- **Enemy deaths** break with a bone-white burst, a ring of the body's matter
  and the corruption leaving as indigo motes, and leave a stain.
- **Biome tint.** Smoke and dust lean toward the act's air (`VFX_BIOME`):
  moss in Act I, cold slate in Act II, ash in Act III.
- **Budget.** Three new fixed pools (stars 48, marks 24, glows 32), each one
  shared material type warmed in camp, so no shader compiles mid-fight
  (`tools/vfx-budget.mjs`: GL programs 101 at the start and the end of a busy
  room). The director costs ~0.6 ms of CPU a frame in a busy room; live VFX
  objects there roughly double (p50 26 -> 56), a few dozen extra draw calls.
- **Reduced effects** still halves particles and drops the camera punch; the
  marks' seams dim with the light setting.

Review tools:

- `?vfxlab=1` on any build opens a panel that triggers every class reel,
  every enemy type and every boss room in the live game (`src/ui/vfxlab.js`).
- `node tools/vfx-clips.mjs` records real-speed 30 fps clips of each class,
  the enemies and each boss fight on a machine with no GPU, by running the
  page on a virtual clock (one 1/30 s step per captured frame).
