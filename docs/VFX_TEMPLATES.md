# VFX templates: Kesh's three templates (2026-10-19)

The standing direction for every VFX build. Moved here from `docs/gauntlet/design-VFX.md` section 11 (v0.5.360),
so the current rule no longer lives in a historical folder; the reserved gameplay colours are in
`.claude/rules/visuals.md`. Sections 1 to 10 of design-VFX.md stay there as history.


**This section is the standing direction for every VFX build thread.** Kesh's
words (2026-10-19): *"the vfx of all character and enemy need rework, current
one too simple, use below template when doing vfx"*, and *"often use below
prompt for vfx build thread"*. Where it clashes with design-VFX.md §3-§10 (one hue per
class, the soft Healer lantern, the Archer's thin jade lines), this section
wins; the reserved gameplay colours (design-VFX.md §2, `.claude/rules/visuals.md`) still hold.

## The templates (his words, the target look)

| Template | His prompt | Plays for |
|---|---|---|
| **Magic** | Magical spell VFX, celestial energy burst, glowing runes and arcane circles, vibrant purple and gold particles, floating stardust, ethereal light beams, highly detailed, fantasy game concept art. | spells and magical attacks |
| **Knife and sword** (`blade`) | Epic sword slash VFX, blazing fiery trail, golden light energy waves, sharp particle effects, motion blur, impactful explosion, stylized action game style, cinematic lighting. | blades, claws, bites and other melee; the closest fit for physical shots (arrows) and blows (a swung bell) |
| **Sci-fi** | Sci-fi laser beam VFX, holographic matrix particles, neon cyan and magenta energy, digital glitch effects, futuristic weapon fire, high-tech glow, sharp lines, clean vector rendering. | technological weapons |

## The enhancer words (use them in every VFX build thread)

- **Enhancers** (增加华丽度的修饰词): highly detailed, cinematic lighting, masterpiece, epic.
- **Glow and particles** (发光与粒子): glowing effects, floating particles, stardust, ethereal light.
- **Dynamics** (动态与冲击感): energy burst, impactful explosion, dynamic motion.
- **Rendering** (渲染引擎暗示): Unreal Engine 5 render, Octane render, volumetric lighting.

The game draws everything in code in its own real-time Three.js renderer
(no model, texture or video files), so the rendering words are the finish to
reach, not tools: every beat has a hot white core over its colour, real
bloom, a light pool on the floor (cinematic lighting), shafts of light
(volumetric lighting) and particles that hang after the hit.

## How a beat is built

Each template is a recipe set in `src/render/vfx/templates.js` over the
template kit `src/render/vfx/tplkit.js`. The class layers (design-VFX.md §4, the
Tidecaller's, Bellwright's and Duskwing's own files) still play underneath,
so a hero keeps its own shapes; the template is the finish on top.

| Primitive | What it draws | Templates |
|---|---|---|
| `circle` | an arcane circle on the floor or standing at the hand: a rune ring and an inner sigil spinning against each other; faces `arcane` (runes and a hexagram), `sun` (flame rays), `hex` (a targeting hexagon) | magic, blade (sun), sci-fi (hex) |
| `beam` | an ethereal light beam: a tall camera-facing shaft, hot core, soft volumetric halo, light rising up it | magic, sci-fi |
| `blaze` | a burning ribbon on the blade's path (`fire`: flame licks eat it from the tail) or a clean golden energy wave that keeps travelling (`wave`); arcs or full rings | blade, magic waves |
| `blast` | an animated burst: `fire` (a turbulent fireball that erodes away), `celestial` (a starburst of rays and a ring), `holo` (a square glitching shell with scanlines) | all three |
| `dust` | twinkling particles that float and swirl: `star` stardust, `square` holographic matrix bits | magic, sci-fi |
| `sparks` | sharp particles drawn as short lines along their own speed (the motion blur) | blade, sci-fi |

| Beat | Magic | Blade |
|---|---|---|
| Swing / melee skill | a crescent of light rolling out, a circle at the caster, stardust on the front | a fire ribbon along the cut, two motion-blur afterimages, sharp sparks off the edge; a skill adds a golden energy wave that travels past the reach and an explosion at the tip |
| Shot leaves the hand | a small circle stands up at the hand, a celestial burst, stardust down the aim | a fire muzzle flash, a small golden wave thrown forward, sparks and speed lines down the line |
| In flight | the shot sheds stardust | the shot sheds fire sparks |
| Nova | circle, gather, celestial burst, a beam, rising stardust, beams round the edge | a sun circle, a fire ring, a golden wave ring, the explosion, sparks all round |
| Placed skill | a beam strikes down out of the sky onto a circle there, a burst, a stardust fountain | a sun circle, the explosion, a fire ring; a rain skill drops flaming shafts that each burst |
| Ward / call | a circle under each body and light pouring onto it | golden waves out of the caster and a ring on each body |
| Dash | stardust down the path, a circle where it lands | a fire wake, afterimage lines, sparks off the heels, a burst on arrival |
| Hit | a celestial star and a stardust puff; a crit adds runes and a short beam | sparks through the target and a small fireball; a crit adds a golden wave ring |
| Kill | light going up out of it | a last fireball |
| Zone pulse | the circle breathes, stardust lifts | embers and a flicker of flame |

## Colours

`VFX_TEMPLATE` in `src/data/palette.js`; the template rows in
`src/data/vfx.js` (`VFX_TEMPLATES`, `CLASS_TEMPLATE`, `SKILL_TEMPLATE`).

- Magic: Arcane Purple `#A24BFF`, Celestial Gold `#FFC94A`, Star White `#FFF4D6`.
  A magic heal swaps the purple for Bright Heal and keeps the gold.
- Blade: Blaze Core `#FFF3C4`, Blaze Gold `#FFB43C`, Flame `#F5952E`, Wave Gold `#FFD866`.
- Sci-fi: Neon Cyan `#3DF2FF`, Neon Magenta `#FF3DD8`.
- Kept clear of the gameplay signals: the blade's fire leans gold (Ember is
  about 25° redder and stays enemy-only); Arcane Purple is deep and saturated
  where corruption Violet is pale, but their hues sit about 10° apart, so the
  lab's **Purple** button switches the magic to a magenta (`#D84CF0`, 32°
  away) to compare (an open choice); the blade's sun circle is drawn in
  gold, never orange, so it cannot pass for an enemy telegraph; Hearth Amber own damage numbers are drawn on top
  with their outline.

## Which heroes take which (2026-10-19)

| Hero | Basic | Skills |
|---|---|---|
| Healer | magic | magic (heals in green and gold) |
| Tank | blade | blade (Shield Wall and Rallying Cry as golden waves) |
| Swordsman | blade | blade |
| Archer | blade (arrows: the closest fit) | blade |
| Tidecaller | magic | magic |
| Bellwright | magic | magic, except Bell Swing (blade) |
| Duskwing | blade (the bite) | blade for the bite, rake, dive and scent; magic for Nightfall, Echo Screech, Bat Swarm, Shadow Veil, Flit, Blood Moon and Night Wings |

No hero carries a technological weapon; sci-fi is the machines' template
on the foe side (below).

## The traced slash (v0.5.348)

A blade swing of a model-standard rig is traced from the rig's own weapon
tip (VFX_HIT_RULES T1): the ribbon's outer edge is the tip's path, pushed
out to the sim's reach where the weapon is short, the glint fires at the
tip on the first strike frame, and the template's fire arc plays softer
underneath. docs/HIT_FEEDBACK.md "The extras" has the rules and numbers;
`tk.trace` in `src/render/vfx/tplkit.js` is the primitive.

## Review

- `?vfxlab=1` ▸ **VFX templates**: Magic / Blade / Sci-fi play every beat of
  one template in front of the party; **Purple** switches the magic purple.
- `node tools/vfx-rework.mjs` checks every hero skill maps to a template and
  plays it, and with `--shots <dir>` records each hero's reel and a busy
  four-hero fight as stills and real-speed clips (virtual clock, no GPU).
  It runs both teams in a campaign (campaign-only skills), clears each room
  to its reward to rebuild the bars, and gives the probe's seats Glint for
  the swaps; `--only data|<hero>|fightA|fightB` and `--purple safe` narrow it.
- Budget: the template kit adds 4 pooled mesh kinds (circles 28, beams 18,
  blazes 48, blasts 40 since the foe pass), two particle clouds (420
  stardust, 160 bits) and one instanced spark draw (400); Reduced effects
  halves the particles and dims the beams with the light setting. A piece
  that lands within 2 u of many live pieces comes in fainter (down to 40%),
  so a stacked fight does not wash out to white.

## The foes (VFX rework PR 2, 2026-10-20)

`src/render/vfx/foefx.js` plays the same templates on every enemy,
champion and boss, on top of their own matter beats in `signature.js`:

| Moment | Event | What plays |
|---|---|---|
| Wind-up | `telegraph_start` | the template gathers on the body (sparks, stardust or matrix squares drawn in; a champion or boss also opens a circle). The Ember floor shape stays the enemy layer's |
| Strike | `telegraph_resolve` | the captured telegraph's shape fills: a **ring** bursts (fire ring and fireball / arcane circle and celestial burst / hex circle and holo burst), a **cone** slashes (fire crescent / spell wave / three lasers), a **lane** streaks (fire wake / light pillars / one laser). A shooter's aim has no shape: its shot is its strike |
| Shot | `enemy_fire`, `enemy_lob` | a muzzle flash in the template, and the shot sheds it as it flies |
| Hit | `hit` on a hero by a foe | a small template impact |
| Fall | `champion_fall`, a boss's `death` | the template's biggest burst |

Which template (data/vfx.js `FOE_TEMPLATE`): claws, bites, slams, stings,
spears, darts and thrown things are knife-and-sword; spells, songs, spores,
spirit light and wards are magic; machines are sci-fi (the Spire's Vane and
Chime, the Kiln's Bellows, the Lockkeeper and the Glassblower, the
Millwheel, the Hourwarden and the Founder). Size by weight: a champion
plays half again as big, a boss twice.

Colours (palette.js `VFX_FOE`): Ember belongs to the floor's telegraph
shapes alone (Kesh's pick on PR #103). An enemy's fire and spell light burn
a darker **Foe Crimson** `#B8141F` (hue 356; CIEDE2000 about 22 from Ember
and 23 from the Swordsman's lighter, pinker Fox Crimson `#E8577A`), over a
pale rose core and a deep blood flame; heroes' fire is gold, so the two
sides never read alike. A magic caster of the Hollow Heart and every boss's
magic cast in **Violet** with a crimson edge (corruption); machines keep the
neon, magenta first. No foe tone is green or Ember; no hero tone is Ember or
Violet.

Review: `?vfxlab=1` ▸ **Foe templates** plays a ring, a cone, a lane, a shot
and a fall for a boar, a keener, a lancer, a vane, the Briar Knight and the
Stag. `node tools/vfx-foes.mjs` checks every enemy, champion and boss maps
to a template, that each kind plays its strike, shot or hit when spawned
alone, and that each boss plays its strikes and its fall in its own boss
room; `--shots <dir>` films the lab strikes, a busy fight and three bosses
(`--only data|enemies|bosses|shots`, `--kinds a,b`). The per-kind tally is
`__echoes.content.vfx().foe`.

## Projectiles (VFX rework PR 3, 2026-10-20)

Kesh's ask: "For all characters and enemy and boss projectiles need the same
rework." Every shot in flight now wears its template as its body
(`src/render/vfx/boltfx.js`, drawn with the template kit's `head`):

| Template | The head in flight | The trail | Where it stops |
|---|---|---|---|
| blade | a blazing comet: a white-hot head and a flame tail that narrows and breaks into fire | fire sparks streaming back (motion blur) and embers that hang | a small fireball and sparks thrown back |
| magic | a star orb: a hot core, four turning rays, a ring of runes, an ethereal ribbon behind | stardust that twinkles and hangs | a celestial burst and stardust |
| sci-fi | a neon laser bolt: a white core in clean neon edges, scanlines, rows tearing sideways | holographic squares | a holo burst and squares |

The tail stretches with the shot's speed. A shot that runs out of range
fizzles instead of bursting; a shot cleared with its room or charmed away by
a tonic plays nothing here (those have their own beats). A target hit keeps
the hit layer's impact (templates.js for the party, foefx.js for the foes).

Who plays what: a party shot plays its skill's template (`toneFor`, so a heal
bolt is green and gold and the Healer's plain bolt her basic's); an enemy
shot or lobbed glob plays its shooter's tone and weight (`vfxFoeTone`,
`vfxFoeWeight`: Foe Crimson fire and spells, Violet for corrupted casters and
boss magic, neon magenta first for machines; champions half again as big,
bosses twice). A lobbed glob's head rides the same arc as its body, and its
landing is now its thrower's ring strike (foefx.js reads the thrower from the
glob at `telegraph_start`).

The shooters, every one in the data: the Healer's bolt and the Archer,
Tidecaller and Bellwright basics; 14 projectile skills (Archer piercing_shot,
volley, vault_shot, pinning_arrow, hunters_mark, feather_fan; Tidecaller
riverbolt, torrent; Bellwright clapper, knell; Healer mending_bolt,
spirit_bolt, lantern_flurry, pale_lance); the Tank, Swordsman and Duskwing
fire none. Foes: Mantis, Crow, Vane, the Hollow Choir and the Vein Matron
shoot; Toad, Rotcap, Miller and Geode lob; the Millwheel, Skyhorn, Colossus,
Cantor, Lich Ram, Veinweaver, Cinderback and Thornmother fire or lob. The
Hourwarden's weight drops rather than flies (its template beats are below),
and elite-affix globs are pools, not shots.

**The Hourwarden's weights (Polish, v0.5.327).** Toll of the Hours hangs a
bronze clock weight over each hour mark and lets it fall, so it gets no muzzle
and no flying head. In the Hourwarden's sci-fi tone (neon magenta first,
foefx.js `weightHang` and `weightDrop`): each weight blinks in over its mark
as a holo burst with matrix squares, a thin thread of neon light hangs from
it to the floor while it waits, and when it lets go (its last 18 ticks) it
drops trailing a laser streak and squares falling with it. Its landing is the
template's ring strike (hex circle, holo burst, squares) like any lobbed glob,
and the landing flare and shock in `signature.js` now burn the Hourwarden's
shot colour instead of Ember. The Ember ring on the floor before it lands is
the warning and stays. Tally: `content.vfx().foe.hourwarden.weight` and
`.drop`; check: `tools/polish-probe.mjs`, stills: `tools/polish-browser.mjs
--only weights`.

The class and enemy layers underneath keep their own bodies (the Healer's
parchment bolt, the arrow, the enemy shot's core and its streak), so a shot
is still told apart by shape. **Crimson cores** (Kesh's pick on the PR 3
card): an enemy shot wears no Ember anywhere. Its glow, trail, streak, muzzle
flash and stop spit (render/enemies/index.js, signature.js) take its
shooter's hue (`vfxFoeShotColor` = the foe tone's `a`: Foe Crimson, Violet or
neon magenta), and a shot whose shooter went unseen plays Foe Crimson. Ember
stays on the floor warnings. Budget: 64 heads, and at most 70 trail
particles a frame across every shot.

Review: `?vfxlab=1` ▸ **Projectile templates** flies the heroes' three
templates and a heal bolt, foe shots of each tone (Mantis, Keener, Lancer,
Vane), and champion and boss shots (Briar Knight, Hollow Choir, Millwheel,
Cantor). `node tools/vfx-bolts.mjs` checks every shooter above resolves to a
template and that no enemy shot wears Ember, casts every projectile skill at dummies, runs a fight per team,
spawns every shooting enemy and champion alone and meets every shooting boss
in its boss room, and each must draw its head; `--shots <dir>` films the lab
and the fights (`--only data|heroes|fights|foes|bosses|shots`, `--kinds a,b`).
The per-source tally is `__echoes.content.vfx().bolt`.

## The hit and the kill (VFX and hit feedback Part 1, 2026-10-26)

Kesh's hit rules (`docs/VFX_HIT_RULES.md`, [V] rules)
join the templates: every hit and kill now lands on a held frame. The full
list is `docs/HIT_FEEDBACK.md` "The hit and the kill"; for a VFX build:

- **Hold the hit, not the world's particles.** A `hitstop` holds the rig
  clips, the slash sweep and the flares for its ticks (`renderHold` in
  `src/render/hold.js`: `time(t)` to pose a rig, `rigDt(dt)` for a layer's
  clock). A kit slot spawned with a `hold` pays the freeze after its pop;
  particles keep flying.
- **A contact is a white bloom first.** Every party hit draws a near-white
  Parchment bloom about 2 body widths across, held 100 ms, under the class
  flare (held 100 ms too). The magic template's hit leaves through the far
  side (`MAGIC_EXIT` in `templates.js`). A spell hit holds the body's white
  flash 5 ticks, then fades it (`SPELL_FLASH` in `src/data/vfx.js`).
- **A kill holds, swells, then pops.** The bone flare holds 117 ms over a
  bloom twice a hit's area, the matter ring is gone by 0.22 s and draws under the
  Ember floor warnings (`KILL_FX` in `signature.js`), and the debris waits
  0.1 s of held time and leans along the killing hit.
- Gameplay signals stay as they were: Ember telegraphs, Bright Heal heals,
  Hearth Amber for your own numbers once they settle.

## The cast, the shot, the reward and the aftermath (Part 2, 2026-10-27)

The full list is `docs/HIT_FEEDBACK.md` "The cast, the shot, the reward and
the aftermath"; for a VFX build:

- **A shot grows toward its target.** Big and round at the hand, stretched in
  flight, its own size, brightness and height; it lights the target's near
  side about 1.5 body widths out (`NEAR_LIGHT`), drains into the contact,
  holds there 3 frames, and leaves sparks. A light follows it on the floor.
- **A stroke tapers.** A sword swipe is thickest at the blade and thins to a
  point toward its start (`uSwipe` in `BLAZE_VERT`), fades in on a concave
  ramp and flashes a 4-point tip glint on its first frame.
- **Animate with drawings.** `createFlipbook` swaps code-drawn frames every
  2 ticks and ends on a hard cut; the crit book is the first. A new book is
  a new `drawFrame` set: thick and bright first, then thinner, broken,
  fragments.
- **The aftermath holds the place.** Spatter in the body's matter colour,
  arrows stuck in the floor, a gold rim of 0.8 s or less on blade hits, and
  an element's air (`ELEMENT_AIR`: about 100 twinkles and a faint mist for
  1 to 2 s).
- **A reward is a beat, not a burst.** `attachChestBeat` gives any chest the
  wobble, the press, the snap with its hold at the top of the hop, the
  padlock, the light from inside and the stars; the burst goes off on the
  snap. A trap's lid opens on Ember from the lock, no light, no stars.
- Colours: the crit book is pale gold, the chest light warm cream and gold,
  the frost air the Frost Bomb's own cyan; nothing new is Ember (but the
  Trapped Chest's threat), Bright Heal or Violet.
