# Model standard (pilot, v0.5.332)

Kesh's sample video (a Claude Design "Leviathan" page, studied in
`/mnt/project-files/plan/MODEL_STANDARD.md`) builds its creature in code: faceted low-poly
planes, detail by repeating small parts, and abilities as named, rewindable timelines. He
picked option (d): build that technique into the game's own renderer. This pilot does it for
two models, the **Barrow Wyrm** and the **Tank**, so he can judge the look before any
roster slice. Visual only: no sim, timing, damage or golden changes.

His ruling for the pilot: the detail goes **on top of** the chibi ink-outline style
(BUILD_BRIEF §19.2), it does not replace it, and the facets must read clearly.

## The kit (`src/render/facet/`)

| File | What it gives |
|---|---|
| `material.js` | `facetize(geo, {jitter, seed})`: non-indexed geometry with flat normals and a per-plane value step in a `color` attribute (hashed from the face normal, so a plane keeps its tone as the model moves). `facetMaterial(color)`: the house toon material with vertex colours. Every faceted part keeps the 3-step toon ramp, so the light still bands like the rest of the game, and the facet step rides on top. |
| `kit.js` | The parts kit on `InstancedMesh`, so hundreds of plates cost two draw calls (the part and its ink hull): `createSpine(n)` (a Catmull-Rom spine with a stable frame), `createPlateTube` (ridged scales laid in a brick pattern round a moving spine, sized by the local arc length so a bend never opens a gap, with metal bands every few rings), `createSpineRow` (wedge spikes along the spine, with tinted tips), `placeRow` (any fixed row: teeth, rivets, crest fans, mail), `mottle` (per-instance tone), `wedgeGeometry`, `plateGeometry`. Part ink is `PART_INK_PX` (1.35 px), thinner than the silhouette's `INK_PX`. |
| `timeline.js` | `createTimeline(id, label, phases, {cues})`: pure in t (`sample(t)`, `startOf(phase)`, `readout(t)` for "1.2s · Ash Breath: strike"). `createPlayhead`: rate 1 plays, 0 holds, -1 rewinds; cues fire only on a forward crossing, so a rewind and replay re-fires each once. `ease`. |
| `flags.js` | `MODEL_STANDARD = {wyrm: true, tank: true}` and `facetOn(kind)`. A harness build reads `?facet=0` (every model classic) or `?facet=wyrm,tank` (only those); a player build never sees the param. |

`critters/common.js` gained `addInstancedInk(mesh, px)`: the same constant-pixel inverted
hull, drawn per instance from the part's own `instanceMatrix` buffer.

## The Barrow Wyrm (`src/render/boss/wyrmfacet.js`)

- **Body.** A 10-point spine through the head, the neck root and the coil. 34 rings of
  ridged slate scales (8 round the back, brick-laid) over a faceted core, a pewter band every
  7th ring, 15 dorsal spikes with pewter tips, 14 violet crack shards along the back. 388
  instances in all; 39 draw calls against the classic rig's 45.
- **Head.** A faceted skull and pale snout, horns and brow ridges, a 9-wedge crest fan,
  12 upper and 10 lower teeth on a hinged jaw, violet eyes and throat glow.
- **The coil follows its own path.** The neck root leaves a trail on the floor; every body
  point sits on that trail, so a turning Wyrm bends through its turn. The serpentine wave
  is fixed to the trail's arc length (a no-slip wave): a moving Wyrm slides through its
  curves instead of sliding over the ground. At rest the coil breathes a small sway.
  A turntable (the Journal viewer passes `turntable: true`) turns the coil rigidly with
  the head; the death collapse freezes the coil where it lay.
- **Abilities** (`WYRM_ABILITIES`), driven by the sim in game:
  - *Ash Breath*: draw back 0.9 s, strike 0.18 s, pour 0.5 s, settle 0.6 s. The draw is
    stretched to the sim's telegraph span; the strike lands when the telegraph resolves.
  - *Burrow Strike*: dive 0.5 s, tunnel 1.2 s, rise 0.9 s, burst 0.25 s, exposed 1.5 s,
    settle 0.6 s. Tunnel, rise and exposed hold for as long as the sim's mode does.
  The legless rule: the coil's base stays planted while the head and neck drive (only the
  first points lift; the probe checks the base moves no more than its rest sway).
- **Colour.** Slate scales from the enemy hide family (cool, as foes read), a low-saturation
  pewter for the bands and tips (the video's gold would sit in the reserved amber family),
  God-stuff Violet glow as the classic rig. No Ember, no Bright Heal.

## The Tank (`src/render/critters/tankfacet.js`)

- **Body.** The classic Tank's chibi masses, faceted: a 10-sided coat bell, a tabard with
  4 rows of scale mail, a plated belt with brass rivets, the collar, a faceted head with the
  unchanged painted face, faceted ears, snout and arms. The shield is a shoulder block with
  three ridged lames, a crest of three steel spikes and a slab with a boss and six studs.
  Brass is the classic buckle tongue's dull Bone-into-Umber (no Earth Ochre or gold on the
  body; Bone stays the brightest value, round-3 F9). 47 draw calls against 39.
- **3-hit combo** (Kesh's template), at the sim's real 0.65 s swing cadence:
  1. *Backhand bash*: horizontal, slab side across to the far side.
  2. *Rising bash*: low on the far side, up across to high on the slab side, clear of the face.
  3. *Crushing slam*: overhead on the toes, both paws on the slab, down into the ground
     ahead with a lunge step.

  Each hit has key poses (wind-up, strike, overshoot) and frame timing: 1.5 frames of
  wind-up (only from rest), 2.5 strike, 2 overshoot, 5 to settle **into the next hit's
  wind-up**, held for the combo window (1.0 s), then a recover. A chained hit starts from
  wherever the last one is, so the chain never pops. The rig counts its own swings from the
  `ally_basic` cue; a skill or a hit taken starts the chain over.
- **Weight.** The hips lead the swing by 1 frame and the slab trails by 2, so the body
  throws the slab; the off paw joins it for the heavy blows; the root shifts its weight over
  the planted feet, crouches into each wind-up and drives up or down through the strike.
- **Abilities.** *Heavy Slam* (every melee arc and ground skill: Heavy Slam, Brutal Cleave,
  Ground Crack, Shoulder Charge, Earthshatter) and *Brace* (every nova, direct and aura
  skill: Whirling Guard, Taunting Roar, Shield Wall, Iron Stance, Rallying Cry, Earthen
  Grasp). In game a skill enters its timeline 0.08 s before the strike, so the blow lands
  with the sim's hit.
- **Locked feet.** Each foot is pinned to the floor in world space while it carries
  weight and steps on its own when the stance's home drifts 0.085 u away, one foot at a
  time, landing ahead along the travel at the home it lifted off for (so the slam's lunge
  lands). The walk's bob, roll and hip twist come from the steps, and the lean follows the
  travel in the Tank's own frame: a backpedal leans back, a sidestep leans aside, whatever
  the aim. A collapse unlocks the feet.

## The Level I foes (`src/render/enemies/facet/`, v0.5.337)

Every creature Level I rolls (its roster's boar, mantis, quillback, rotcap, wasp and
thornling, its campaign roster's owl and lasher) plays the standard. Same rules as the pilot:
detail on top of the chibi ink outline, the classic rig kept beside it, visual only. Two
things change for foes:

- **A crowd budget.** A Level I room holds a dozen foes at once, so a foe's fixed detail
  (bristles, plates, quills, gills, feathers, thorns) is BAKED: merged once per kind into one
  faceted geometry the whole crowd shares (`bakeParts`), one draw call per material and no
  buffer per foe. Only parts that move on their own every frame (legs, wings, a vine) are
  per-rig instanced rows. Each rig draws no more calls than its classic rig; the probe holds it.
- **The sim's clock is the anticipation.** A telegraphed attack samples its wind-up by the
  telegraph's progress on the interpolated tick, so its contact lands on the tick the sim
  resolves it. An unwarned contact bite strikes on the layer's lunge pulse (contact 3.5
  frames later, one frame of wind-back inside the strike, B1); once the per-target cooldown
  says when the next bite comes, the chained strike starts early and its contact lands on
  that tick.

The foe kit (`render/facet/foe.js`, `render/facet/legs.js`):

| Piece | What it gives |
|---|---|
| `bakeParts(key, build)` | A shared, faceted, merged geometry per kind (cached in `geocache`, never disposed). |
| `foePart`, `foeMaterial` | A mesh with its ink (`'full'` silhouette, `'part'` detail rows); a flashable faceted material. |
| `createFoeFrame` | group (the enemy layer's: position, elite scale, kill pop, hit envelope) > yaw > spawn (the B7 grow) > body (the rig's motion). A rig never writes the group. |
| `createFoeClock` | The rig's clock, on the sim's interpolated tick (`P.tick`): it holds through a hitstop (the tick freezes while frames go on), so a clip pauses and a contact holds (B2). A jump back of more than 2 ticks (a lab rewind) restarts it. Without a tick (the Journal's turntable) it runs on `P.t`. `clock.tick` is the held tick (`simT * TICK_HZ`): strikes sample on it, never on the raw `P.tick`, so a hitstop never flicks a pose back to the state's start. |
| `heldBy(e, tick)` | True while the sim holds the foe from attacking: a live stun or blind, a state other than `'active'` (a room clear's retreat), hp at 0. No predicted strike starts while it holds. |
| `createAttackWatch`, `telegraphProgress` | The beats a pose can see: a telegraph's wind, release or cancel, the lunge pulse (`enemy_bite`), the fire pulse (`enemy_fire`). A telegraph that ends while `heldBy` (a stun or blind landing on its resolve tick, a room clear) is a cancel, never a release. |
| `hitTimelines`, `createChain` | Kesh's 3-hit template on a repeating attack: each hit's overshoot settles into the next hit's wind-up, held for the chain window, pulled back 4 frames before a predicted strike; the third hit is the biggest (B6). `contactAt` says when the playing hit lands. `abort(now)` folds a predicted strike that a stun or blind cut before its contact: it eases from the current pose to rest over 4 frames, so no strike plays through a stun. `freshLead` (default 3.5 frames) sets how soon an unpredicted fresh hit's contact lands; `freshWarp` squeezes its wind-back and strike into it. |
| `spawnScale`, `settle`, `lungePose`, `shotSquash` | §6.1 B7, B5, B9 and B3 as pure curves. |
| `createLegs`, `solveKnee`, `liftToReach` | World-locked feet for any leg count: each foot pinned to the floor while it carries weight, stepping in gait groups along the real travel (a backpedal steps back, a sidestep sideways); two-bone IK; a foot the body rears out of reach of lifts straight up, never slides. A blink or knockback over two reaches in a frame re-stands the feet; a hitstop drift (no time passing) never does. While walking, the gait picks the group that trails the travel most (the part of a foot's error ahead of its home along the travel is dropped), so the feet never drag at odd frame rates. |
| `gait.release(i, dur)`, `clampReach` | A foot steps at once, whatever else is in the air, optionally as a quick step timed to land by a contact (a lunge step; a foot already mid-step is re-aimed smoothly). `clampReach` draws a foot a fast turn left past the leg's reach at the reach, and the rig releases it, so no bone ever stretches. |
| `hornGeometry`, `scaleGeometry` | A curved tapering horn (tusks, claws, stingers, thorns); a low six-sided scale to sink into a hide. |

Each rig returns the classic interface (`group`, `mats`, `setYaw`, `pose`) plus
`modelStandard`, `points` (B8: the weapon tip, the hand, the mouth), `react` and `death`
(the shared hit and death envelopes' tuning, §6.1 items 9 and 10, built by the VFX slice)
and `lab` (`abilities`, `override`, `feet()`, `lastStrike`).

**The shown tick.** The enemy layer poses each foe at `P.tick = stateTick - 1 + alpha`
(`render/enemies/index.js`), while `e.telegraph` and the other fields are the state's own.
A release is therefore seen when `P.tick` is about R-1. Telegraph-driven wind-ups and
strikes sample on `P.tick + 1` (clamped to the span), so a 2 to 3 frame strike shows every
frame and its contact lands on the release frame, never collapsing into a 1 frame pop.
`lab.lastStrike.tick` stays the sim's resolve tick.

### The eight foes

| Foe | Attack (lab tab) | In game | Calls (faceted / classic) |
|---|---|---|---|
| Thorn Boar | Gore combo: hook, backhand, scoop and toss | Repeating contact bite. A predicted bite's contact lands on the bite tick (the per-target cooldown says when); an unwarned one strikes quick (`freshLead` 2.5 frames: the tusk lands about 1.5 ticks after the damage). The front hooves take a lunge step timed to land on each contact and step back out after the snap. | 18 / 23 |
| Spitting Mantis | Spit, three variants (left blade leads, right blade leads, both blades) | The 42-tick telegraph (36 under Short Fuse) is the wind-up; the contact lands on the resolve tick, the frame the shot leaves. Only the fire pulse plays the contact, so a stun, blind or retreat folds it back. Repeat spits cycle the three variants; the head looks round in mantis snaps and locks on at the wind-up. | 31 / 39 |
| Quillback | Charge roll; Charge into a wall | The 48-tick lane is the coil; the launch lands on the resolve; the ball spins at the real travel, squashes on each ram (`chargeHits` by length), and ends spent (rolls on into upright) or on a wall (always unrolls back off the wall, the daze held until upright). Launches only on the sim's charge mode. Height matches the classic's. | 15 / 15 |
| Rotcap | Cap combo: hook, reverse swipe, rear-up and slam; Spore burst (death) | Repeating contact bite, as the boar (lead foot steps in by the contact). A 1.5 Hz rolling shamble on two root feet, one bob per roll; the lead foot holds through the chain; spore motes round the cap; an elite crouch; the retreat shiver; the death swell over the burst ring. A strike starts on the lunge pulse or a new `biteTick`, whichever comes first. | 15 / 16 |
| Briar Wasp | Dart dive; Dart string | The 42-tick lane is the coil (nose down, stinger high); the strike's contact lands on the release frame and holds through the dart; the pull-up and settle after. The stab tips steeply nose-down with the stinger out, seen in every facing. A swarm's string varies per dart (hook, corkscrew, plunge), each scaled a little per wasp and dart from a hash of its id. | 10 / 12 |
| Thornling | Plant thicket | The 30-tick root is the gather (crown in bloom by the first frame); the stamp's contact lands on the plant tick. Repeat plants cycle side stamp, other side, finisher (both roots, deeper); the lead root drives the stamp. A plant sound (`thorn_plant`). | 10 / 20 |
| Shriek Owl | Shriek | The 54-tick cone is the rise and gather; the strike takes its last 3 frames and lands on the resolve, confirmed by `shriekTick`. A flier: rule 1 is the bank into its measured travel. The head looks into turns and drifts; the shadow follows the body's height. | 27 / 37 |
| Vine Lasher | Lash chain: sweep, backhand, overhead slam | The 48-tick lane is the coil (the front roots brace); the throw lands on the release frame, the vine straight down the live lane, and only on `lashTick`; the reel at the sim's drag. Seven roots, as the classic, in two step sets; the lash cycle starts per rig (a hash of its id); the hook reels from the catch (`P.catchDist`, else 3.4 u). | 20 / 46 |

Draw calls are one rig at rest in the probe's count; the baked detail adds no buffer per copy.
The heroes' 3-hit template runs on every repeating melee attack (the boar's, the Rotcap's,
the Lasher's); the telegraphed one-shot attacks (spit, charge, dart, plant, shriek) get their
own timelines with key poses instead, as the template's ranged clause reads.

## Integration

- `render/boss/index.js` and `ui/story/viewerrigs.js` build `buildWyrmFacet` when
  `facetOn('wyrm')`; it keeps the classic rig's interface (`group`, `mats`, `setYaw`,
  `setFlash`, `pose`).
- `critters/index.js` builds `buildTankFacet` when `facetOn('tank')`. The rig's `apply`
  receives the driver's clip name; the critter API gains `cue(kind, ev)` (forwarded from
  `render/allies/index.js` on `ally_basic` / `ally_cast`, and from the camp's seat casts),
  `lab` and `modelStandard`. The classic rigs ignore all three.
- The Level I foes: `render/enemies/index.js` and `ui/story/viewerrigs.js` (the Journal)
  lay `facetFoeBuilders()` (`render/enemies/facet/index.js`) over their classic builders, one
  kind per `MODEL_STANDARD` flag; the layer feeds each rig what it feeds a classic one. A
  baked crowd geometry is marked shared, so `releaseTree` keeps it, and an instanced row now
  disposes its own instance buffers there (`render/geocache.js`). `addPartInk` in
  `critters/common.js` gives a baked detail row the thinner part ink.
- The classic rigs (`boss/wyrm.js`, `critters/tank.js`, `enemies/boar.js`, `enemies/mantis.js`,
  `enemies/archetypes.js`, `enemies/woodmill.js`) are untouched and stay beside them.
- The hit reaction and the render hold (v0.5.333, `docs/HIT_FEEDBACK.md` "The hit and the
  kill") need nothing from a rig: the foe and boss layers wrap its `body` (else
  `group.children[0]`) in a `hit-react` node and squash that, and every layer poses a rig
  with the held clock (`renderHold.time(t)`, `renderHold.rigDt(dt)`), so a rig's own clip
  freezes on the hit frame. A rig whose body must not bend gets a rope or coil entry in
  `src/render/react.js`.

## The model lab (`?modellab=1`, harness only)

`scenes/modellab.js` and `ui/modellab.js`: the video's toolbar. Model tabs (Barrow Wyrm,
Tank, Effect kit), Idle / Move / Ability / Still, the ability buttons (the Tank's basic
combo, Heavy Slam, Brace; the Wyrm's Ash Breath, Burrow Strike), Rewind, Showcase or Play
zoom (the game camera's 45° field at 12 u and 52°), Turntable, Classic beside, a scrub bar
that holds Still, and the live readout. Each cue beat plays its game sound and a VFX burst.
URL: `?modellab=1&model=tank&mode=ability&ability=combo&view=play&classic=1`. Probes drive
it with `__echoes.cmd('lab', {model, mode, ability, t, rate, view, turntable, classic})`.

The Level I foes bring their own tabs (`scenes/modellab-foes.js`, entries the lab sets
before the Effect kit): each foe's framing, its game speed on the Move loop (forward for
half a lap, then a sidestep and a backpedal facing the middle), its abilities on their
timelines with the game's own sound per cue, and Classic beside with the classic rig fed
stand-in inputs at the same moment. Each replay hands the classic's one-shot clip fields
(`biteTick`, `shriekTick`, `lashTick`) fresh ticks, so the classic plays its clip every lap.
URL: `?modellab=1&model=boar&mode=ability&ability=gore&view=play&classic=1`.

## Adding a model to the standard

1. Build it with the kit: faceted parts (`facetize` + `facetMaterial`), repeated detail on
   `InstancedMesh` with `addInstancedInk`, the same rig interface as its classic twin.
2. Give each ability a timeline with named phases; drive it from the sim's telegraphs and
   modes in game, from the playhead in the lab.
3. Heroes and biped foes get the 3-hit combo template; run the self-check (root motion
   matches the legs, planted feet locked until the weight shifts, hips and legs drive each
   swing; a legless body keeps its base planted).
4. Add it to `MODEL_STANDARD`, a lab tab, and a check in `tools/model-standard-probe.mjs`.
5. Shoot it in the lab and at play zoom in a busy fight beside its classic twin.

## Probe

`node tools/model-standard-probe.mjs` (in `npm test`): timelines pure and rewindable;
flat facets; every instanced part inked; the Wyrm's no-slip coil, planted base, breath and
burrow driving, turntable and death freeze; the Tank's chain continuity, cadence, skill
coverage, hips before slab, locked feet in eight directions, steps along the travel, the
lean, the lunge; the flag; no reserved or amber colours; Bone brightest on the Tank.

`node tools/model-standard-foes-probe.mjs` (in `npm test`): the kit (the clock holds through
a hitstop and restarts on a rewind, the pull-back never pops, a held resolve is a cancel, a
blink re-stands the feet, the reach clamp); then per foe: flagged, a lab tab per ability, the
classic kept, `?facet=<kind>` alone, no more draw calls than its classic, one shared buffer
per baked kind, every lit instanced row inked, flat facets, no broken matrix through a move
loop and live attacks, the group never written, planted feet never slide, the lean follows
the travel, each ability pure in t and moving the rig, live contacts on the sim's tick (a
telegraph's resolve, a predicted bite's tick, an unwarned bite inside the B1 budget), the B7
grow, the Journal turntable, the B8 points, the hit and death envelopes, no reserved colours.
