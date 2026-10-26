# Model standard (pilot v0.5.332; Level I bosses v0.5.336)

Kesh's sample video (a Claude Design "Leviathan" page, studied in
`/mnt/project-files/plan/MODEL_STANDARD.md`) builds its creature in code: faceted low-poly
planes, detail by repeating small parts, and abilities as named, rewindable timelines. He
picked option (d): build that technique into the game's own renderer. This pilot does it for
two models, the **Barrow Wyrm** and the **Tank**, so he can judge the look before any
roster slice. Visual only: no sim, timing, damage or golden changes. The Level I slice
(v0.5.336) then rebuilt the **Hollow Stag**, the **Thornmother** and the **Gloam Wolf** and
measured the pilot's Wyrm against the [M] checklist of `/mnt/project-files/plan/VFX_HIT_RULES.md`
§6.1 (see "The [M] beats" and "The Level I bosses" below).

His ruling for the pilot: the detail goes **on top of** the chibi ink-outline style
(BUILD_BRIEF §19.2), it does not replace it, and the facets must read clearly.

## The kit (`src/render/facet/`)

| File | What it gives |
|---|---|
| `material.js` | `facetize(geo, {jitter, seed})`: non-indexed geometry with flat normals and a per-plane value step in a `color` attribute (hashed from the face normal, so a plane keeps its tone as the model moves). `facetMaterial(color)`: the house toon material with vertex colours. Every faceted part keeps the 3-step toon ramp, so the light still bands like the rest of the game, and the facet step rides on top. |
| `kit.js` | The parts kit on `InstancedMesh`, so hundreds of plates cost two draw calls (the part and its ink hull): `createSpine(n)` (a Catmull-Rom spine with a stable frame), `createPlateTube` (ridged scales laid in a brick pattern round a moving spine, sized by the local arc length so a bend never opens a gap, with metal bands every few rings), `createSpineRow` (wedge spikes along the spine, with tinted tips), `placeRow` (any fixed row: teeth, rivets, crest fans, mail), `mottle` (per-instance tone), `wedgeGeometry`, `plateGeometry`. Part ink is `PART_INK_PX` (1.35 px), thinner than the silhouette's `INK_PX`. |
| `timeline.js` | `createTimeline(id, label, phases, {cues})`: pure in t (`sample(t)`, `startOf(phase)`, `readout(t)` for "1.2s · Ash Breath: strike"). `createPlayhead`: rate 1 plays, 0 holds, -1 rewinds; cues fire only on a forward crossing, so a rewind and replay re-fires each once. `ease`. |
| `flags.js` | `MODEL_STANDARD = {wyrm, tank, stag, thornmother, gloamwolf}` and `facetOn(kind)`. A harness build reads `?facet=0` (every model classic) or `?facet=wyrm,stag` (only those); a player build never sees the param. |
| `beats.js` | The [M] beats as small pure curves (below): `STRIKE_SEC` (2.5 frames), `HOLD_SEC` (3), `GATHER_SEC` (1.5), `SPAWN_SEC` (7), `kick`, `settle`, `recoil`, `spawnGrow`, `lunge`, `makePoints`, `createSpawnClock`, `SPAWN_TIMELINE`. A "frame" is a frame of the source videos, 1/30 s. |
| `gait.js` | Locked feet for any number of legs: each foot pinned to the floor in world space while it carries weight; a diagonal pair steps when its homes drift `trigger` away (less once moving), landing ahead along the travel by `lead` of the step (moving, the drift is signed: a foot that landed ahead still carries until it is as far behind, so the stance runs from ahead of the hip to behind it); a turn counts as speed (turn rate times the feet's radius), so a boss spinning to a new target steps round instead of dragging; both pairs may fly at a gallop (`flight`); a foot the leg can no longer reach lifts at once (never slides), the other pair first brought down if it is up; a swinging foot is never drawn past its reach; a pose that moves a foot's home more than `stanceTrigger` (0.08 u) steps it there; `hold` (a held contact on a stopped body) lands live steps within two frames, steps every posed foot at once and starts no drift steps; `raise(i)`/`raiseTo(i)` hold a foot up for a pose (a reared foreleg, a pawing hoof, a raking paw); `air` lets the body leave the floor (a bound), and the first frame back down plants every foot on its home. `solveTwoBone`, `aimSegment`. |
| `legs.js` | `createLegs`: two-bone legs laid onto a gait by IK, each knee bending toward its pole; `tuck(i)` draws the paws up while the body is in the air. |
| `shapes.js` | `taperBox` (the boxy skulls, snouts and jaws), `limbBox` (leg segments), `lay` (a part along a direction). |

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
  - *Ash Breath*: draw back 0.9 s, strike 2.5 frames, contact held 3 frames, pour 0.5 s
    (the head kicks back off the blast), settle 0.6 s (one overshoot). The draw is
    stretched to the sim's telegraph span less one strike, so the strike lands on the
    breath's tick.
  - *Burrow Strike*: dive 0.5 s, tunnel 1.2 s, rise 0.9 s, burst 2.5 frames, contact held
    3 frames, exposed 1.5 s, settle 0.6 s (one overshoot). Tunnel, rise and exposed hold
    for as long as the sim's mode does.
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

## The [M] beats (VFX_HIT_RULES §6.1)

Every Level I boss and the Wyrm plays these on its own clock (pose's `t`), so a held clock
holds them (`src/render/facet/beats.js`). The Tank pilot predates the checklist: it has its
combo's strikes and settles but no spawn-in, points or `react` yet (the heroes' slice
re-measures it).

| Beat | Rule | How |
|---|---|---|
| B1 anticipation | The sim's telegraph is the wind-up; an untelegraphed move winds at most 1.5 frames. | Wind-up phases stretch to the telegraph span less one strike, so the strike lands on the sim's hit; `GATHER_SEC` otherwise. A move the sim starts with no warning and an instant hit (the Seed Volley, the Trample's contact) plays its strike from the hit. Every ability grows out of the pose before it (`from`), never a snap from rest. |
| B2 strike | 2 to 3 frames, then the contact pose held 3 frames. | A `STRIKE_SEC` phase, then a `HOLD_SEC` (or longer) phase, taken on planted feet (`hold`). |
| B3 recoil | A rig-only shove off the hit: 2 frames out, ~8 back. | `recoil(age)` on a `shove` channel, 0.1 u back along the facing: the quake, the Trample's gore, the Seed Volley, the Pounce's landing, the Rend; the Wyrm's breath kicks the head back. The Moon Howl's cry and the Briar Charge's stop are not contacts and play none. |
| B4 kick | The strike leaves on its first frame, no ease-in. | `kick(k)`: past 55 % of the way one frame in. |
| B5 settle | Into idle with one small overshoot, never a plain blend. | `settle(k)`: dips ~8 % past rest once. |
| B7 spawn-in | The body grows from the floor in ~7 frames, ~10 % over. | `createSpawnClock`: restarts when a pooled rig is posed for a new boss; the Journal's turntable skips it. |
| B8 points | Named Object3Ds for effects. | `rig.points`: `mouth`, `chest`, `tip`, each foot (`hoofFL`...`pawHR`); the Wyrm's `mouth`, `throat`, `crown`. |
| B9 lunge | Pull back, lunge past rest, lean in, squash on contact. | `lunge(phase, k)`: the Gloam Wolf's Rend (lean ~22° at contact, the rule's full size). The contact squash of the three bosses is kept to a boss's size, +11 % wide and −5 % tall (Kesh's pick over the rule's +19 % / −9 %). |

The hit reaction (squash, flinch, white flash) is the shared hit envelope's, never the
rig's. `rig.react` is an optional per-body tuning on top of the envelope's own boss amounts
(the envelope already halves a boss's squash and flinch): `squash` and `flinch` are
multipliers (1 keeps the envelope's boss amount, 0 turns it off), `knock` the knockback
multiplier (0 for bosses), `axis` the squash axis (`'y'`, the default, or `'spine'`), `midY`
the pivot height in u. Until the envelope reads `rig.react` (the hit feedback slice's PR does
not yet), its own tables in `src/render/react.js` decide, so these values are advisory. The
envelope wraps the root's first child (the yaw node), so every rig keeps its floor pieces
(shadows, the Stag's warm pool, the Wyrm's coil shadows, mound and seam) as the root's other
children, and never writes the root group's own transform.

### The Barrow Wyrm measured (v0.5.336)

| Item | Pilot | Now |
|---|---|---|
| B1 wind-up | the draw stretched to the telegraph | kept |
| B2 strike and hold | breath strike 0.18 s, burst 0.25 s, no hold | strike and burst 2.5 frames, each followed by a 3-frame held contact |
| B3 recoil | none | the head kicks back off the breath as it pours |
| B4 kick | eased strikes | `kick` on the strike and the burst |
| B5 settle | plain blends | `settle`: one overshoot after the pour and after the exposed sprawl |
| B7 spawn-in | none | the coil grows from the floor (the lab's Spawn in tab) |
| B8 points | none | `mouth`, `throat`, `crown` on the head |
| Hit envelope | no tuning | `react`: item 9 as written (Kesh's pick): the envelope's boss amounts, half the squash and half the flinch, no knockback, the squash on the height axis so the planted tail never slides. The shared overlay (`render/react.js`, v0.5.333) reads `react.flinch`: the coil keeps its widths and shifts away from the hit (`coilFlinch`) |
| Floor pieces | coil shadows inside the yaw node | the five coil shadows are root children, turned and grown into the root's space each frame |
| Pooled rig | spawned in only on a jump in time or place | spawns in for a new entity id or a rewound clock; a jump in place only lays the coil afresh |
| Contact timing | the strike started at the resolve | the draw ends one strike early, so the strike lands on the breath's tick; an emerge that comes mid-dive lets the dive finish |
| Colour | slate, pewter, violet | unchanged |

## The Level I bosses (v0.5.336)

Each keeps its classic rig's silhouette and colours (the classic's own constants, no new
hues) and adds the standard's detail on top; the classic rigs stay beside them (`?facet=0`).
All three walk on **locked feet** (`gait.js` + `legs.js`): a planted hoof or paw never
slides, the feet step in alternating diagonal pairs along the travel, and every foot is
planted again at rest.

| Boss | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Hollow Stag | `render/boss/stagfacet.js` | 98 (97) | 222 |
| Thornmother | `render/boss/thornmotherfacet.js` | 58 (32) | 112 |
| Gloam Wolf | `render/boss/gloamwolffacet.js` | 75 (74) | 196 |

- **Hollow Stag.** A coat of ridged slate plates (Bone-pale over the withers, the classic's
  pale hump), bone ribs over the violet hollow, a violet ridge and tail fan, a boxed skull
  and muzzle under a wide rack: two beams with seven tines a side, violet vein cores, a
  rotating rune ring and a crown star; the warm boss-light pool on the floor as the
  classic. The vein cores are the classic's white veins. *Antler Quake*: rear (the 42-tick
  telegraph less one strike: the forelegs fold up, the haunches load), slam (2.5 frames,
  landing on the quake's tick: the forehooves land a step ahead), held, recoil, settle.
  *Trample*: gather (1.5 frames: the sim gives no warning; head down, haunches set), gore
  (2.5 frames from the lunge's contact, `lungeHit`, or the gather's end on a miss: the rack
  hooks up), held with a recoil, settle. The Stag tramples from its standoff, so the hit
  lands on the lunge's first ticks and the gore plays while the 12-tick lunge still carries
  it: the hooves keep stepping under it until it stops.
- **Thornmother.** The broad slate sow with a saddle of bristled plates over the back (the
  flanks stay smooth), briar blades in three lanes on the hump, barbs on the flanks,
  faceted violet seed pods (unlit, stepped per facet), a boxed head with a bristle crest,
  a snout disc, two tusks a side, flop ears; short legs folding back on hooves.
  *Seed Volley* (read off its volley cooldown; the sim fires only standing, the tick a skid
  ends included): gather (1.5 frames, the lab only: in a fight the sim gives no warning, so
  the heave starts on the fire tick out of the pose before it), heave (2.5 frames: the hump
  bucks up, the pods go), held with a recoil, settle while the pods grow back. *Briar
  Charge*: paw (the 60-tick lane warning: head down, a hind hoof scrapes the floor twice;
  she turns square to the lane, which the sim locks at the warning's start), burst (2.5
  frames), charge (held while the sim charges at 10 u/s along the lane: a galloping
  bounce), stop (2.5 frames: both forehooves step a step ahead in the held contact), held,
  skid (the sim's 40-tick stand, one overshoot).
- **Gloam Wolf.** The grey night wolf: a coat of shaggy fur plates whose top plates step
  dark for the saddle and whose flank plates step pale for the moon streak, a ruff round
  the neck and cheeks, a boxed skull and long snout, upper and lower fangs, tall ears with
  pale inner blades, violet slit eyes and throat; a bramble mane with violet buds that
  rises as hackles; a jointed bushy tail with a pale tip; legs with the elbows folding back
  and the stifles forward, bone claws. *Pounce*: crouch (the ring warning less the bound,
  stretched, turned square to the landing spot, which in the Hunt is not the faced target),
  leap (the sim's 16-tick bound, every tick of it airborne: a 1.1 u arc, the paws tucked,
  the forepaws reaching), land (2.5 frames: every paw down at once, the forepaws a step
  ahead, the body squashes), held with a recoil, settle. *Rend*: wind (the 36-tick cone
  warning less one strike: pulled back, the right forepaw raised high and wide), strike (2.5
  frames, on the hit: the B9 lunge, the rake across and down onto the floor, the jaw
  snaps), held with a recoil, back. *Moon Howl*: rise (the 60-tick ring warning less one
  strike: it sits back on its haunches, the head goes up, the throat fills), cry (2.5
  frames, on the hit), held, settle. A warning is known by its attack and start tick, never
  by object identity: a co-op guest's snapshots hand the rig a fresh copy every few ticks.
  *Enraged* (under 40 % HP): the
  hackles stay up, the eyes and the mane burn, the breathing quickens. A back-to-back
  pounce of the Hunt starts its crouch from the landing, not from rest.

## Integration

- `render/boss/index.js` and `ui/story/viewerrigs.js` build `buildWyrmFacet`,
  `buildStagFacet`, `buildThornmotherFacet` and `buildGloamWolfFacet` when their flag is on;
  each keeps the classic rig's interface (`group`, `mats`, `setYaw`, `setFlash`, `pose`)
  and adds `lab`, `points` and `react`. The boss rigs are pooled: a rig posed for a new
  boss (a new entity id, or a clock that went back) resets its timelines and spawns in; a
  jump in place (a new room, a hitch mid-charge) only re-plants the feet. A dying rig (posed
  with no entity) collapses in the pose it died in: no wind-up runs on into its strike.
- The boss prewarm (`render/warmup.js`) parks each rig unculled for a few frames, then gives
  every part its own culling flag back, so the moving instanced parts stay unculled.
- The Journal viewer frames a model by its instanced parts' real instances (`ui/story/viewer.js`).
- `critters/index.js` builds `buildTankFacet` when `facetOn('tank')`. The rig's `apply`
  receives the driver's clip name; the critter API gains `cue(kind, ev)` (forwarded from
  `render/allies/index.js` on `ally_basic` / `ally_cast`, and from the camp's seat casts),
  `lab` and `modelStandard`. The classic rigs ignore all three.
- The classic rigs (`boss/wyrm.js`, `boss/stag.js`, `boss/slice2.js`, `boss/third.js`,
  `critters/tank.js`) are untouched and stay beside them.
- The classic rigs (`boss/wyrm.js`, `critters/tank.js`) are untouched and stay beside them.
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

The Level I bosses are lab entries (`scenes/modellab-bosses.js`): each builds its model and
its classic twin on first view and drives both (the Stag: Antler Quake, Trample; the
Thornmother: Seed Volley, Briar Charge; the Gloam Wolf: Pounce, Rend, Moon Howl, Enraged;
every model, the Wyrm too, a Spawn in tab). The Trample, the Briar Charge and the Pounce
travel as they do in the game, so the gallop and the bound can be judged on locked feet.
Still from a playing ability freezes that moment with the feet where the motion left them;
a scrub re-plants them on the scrubbed pose's stance. An ability id the model does not have
falls back to its first ability. `fixedDt` (s) makes every drawn frame advance
the lab by that step, so a probe on a slow software-GL machine sees 60 Hz motion
(`tools/model-standard-level1-shots.mjs` uses 1/60).

## Adding a model to the standard

1. Build it with the kit: faceted parts (`facetize` + `facetMaterial`), repeated detail on
   `InstancedMesh` with `addInstancedInk`, the same rig interface as its classic twin.
2. Give each ability a timeline with named phases; drive it from the sim's telegraphs and
   modes in game, from the playhead in the lab.
3. Heroes and biped foes get the 3-hit combo template; run the self-check (root motion
   matches the legs, planted feet locked until the weight shifts, hips and legs drive each
   swing; a legless body keeps its base planted).
4. Play the [M] beats (`beats.js`): wind-ups on the telegraphs, 2.5-frame strikes into a
   held contact, a kick, a settle with one overshoot, the spawn-in, named points, and a
   `react` tuning for the shared hit envelope; keep floor pieces off the root's first child.
5. Legged models stand on `createLegs` (locked feet); give each leg a pole that bends the
   way the animal's joint does.
6. Add it to `MODEL_STANDARD`, a lab entry (`scenes/modellab-bosses.js` for a boss), and
   checks in a probe (`tools/model-standard-level1-probe.mjs` shows the pattern).
7. Shoot it in the lab and at play zoom in a busy fight beside its classic twin.

## Probe

`node tools/model-standard-probe.mjs` (in `npm test`): timelines pure and rewindable;
flat facets; every instanced part inked; the Wyrm's no-slip coil, planted base, breath and
burrow driving, turntable and death freeze; the Tank's chain continuity, cadence, skill
coverage, hips before slab, locked feet in eight directions, steps along the travel, the
lean, the lunge; the flag; no reserved or amber colours; Bone brightest on the Tank.

`node tools/model-standard-level1-probe.mjs` (in `npm test`): the flags and the classic
rigs; each Level I rig's interface, floor pieces off the envelope's node, ink on every
part, faceted geometry under every vertex-coloured material; no reserved or amber colour;
the [M] beats on every ability (B2 strike and hold, B4 kick, B5 overshoot, B7 spawn-in,
B8 points, B9 lunge); locked feet on a turning walk (no slide, steps along the travel in
alternating pairs, planted at rest); the sim's telegraphs, modes, volley cooldown and leap
driving each ability with the feet held; the diagonal pairs stepping together, every drawn
foot on its gait point (no leg past its reach), a spin in place; the strikes landing on the
sim's hit; a recoil on every hit; a volley fired the tick a skid ends; a co-op guest's
telegraph copies; a death in a wind-up; a hitch mid-charge; the Wyrm's re-measure (its
floor pieces, a pooled Wyrm spawning in); a pooled rig spawning in again; every lab entry
playing every ability.
