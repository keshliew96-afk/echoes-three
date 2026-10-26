# Model standard (pilot v0.5.332; heroes from v0.5.335)

Kesh's sample video (a Claude Design "Leviathan" page, studied in
`/mnt/project-files/plan/MODEL_STANDARD.md`) builds its creature in code: faceted low-poly
planes, detail by repeating small parts, and abilities as named, rewindable timelines. He
picked option (d): build that technique into the game's own renderer. This pilot does it for
two models, the **Barrow Wyrm** and the **Tank**, so he can judge the look before any
roster slice. Visual only: no sim, timing, damage or golden changes.

His ruling for the pilot: the detail goes **on top of** the chibi ink-outline style
(BUILD_BRIEF §19.2), it does not replace it, and the facets must read clearly.

The heroes slice (v0.5.335, Kesh's pick of 2026-10-26) rolls the standard out to the heroes,
the Healer and the Swordsman first, and re-measures the pilot Tank against the [M] rules of
the VFX/hit rules doc (`/mnt/project-files/plan/VFX_HIT_RULES.md` §6.1). Everything a hero
rig shares now lives in one hero core, so each later hero is its body, its poses and its
abilities, and the same probe holds every one of them to the same rules.

## The kit (`src/render/facet/`)

| File | What it gives |
|---|---|
| `material.js` | `facetize(geo, {jitter, seed})`: non-indexed geometry with flat normals and a per-plane value step in a `color` attribute (hashed from the face normal, so a plane keeps its tone as the model moves). `facetMaterial(color)`: the house toon material with vertex colours. Every faceted part keeps the 3-step toon ramp, so the light still bands like the rest of the game, and the facet step rides on top. |
| `kit.js` | The parts kit on `InstancedMesh`, so hundreds of plates cost two draw calls (the part and its ink hull): `createSpine(n)` (a Catmull-Rom spine with a stable frame), `createPlateTube` (ridged scales laid in a brick pattern round a moving spine, sized by the local arc length so a bend never opens a gap, with metal bands every few rings), `createSpineRow` (wedge spikes along the spine, with tinted tips), `placeRow` (any fixed row: teeth, rivets, crest fans, mail), `mottle` (per-instance tone), `wedgeGeometry`, `plateGeometry`. Part ink is `PART_INK_PX` (1.35 px), thinner than the silhouette's `INK_PX`. |
| `timeline.js` | `createTimeline(id, label, phases, {cues})`: pure in t (`sample(t)`, `startOf(phase)`, `readout(t)` for "1.2s · Ash Breath: strike"). `createPlayhead`: rate 1 plays, 0 holds, -1 rewinds; cues fire only on a forward crossing, so a rewind and replay re-fires each once. `ease`. |
| `flags.js` | `MODEL_STANDARD = {wyrm, tank, healer, swordsman}` and `facetOn(kind)`. A harness build reads `?facet=0` (every model classic) or `?facet=wyrm,tank` (only those); a player build never sees the param. |
| `hero.js` | The hero core (below). |
| `heroes.js` | `FACET_HEROES`: the registry of model-standard heroes. The critter factory, the model lab and the heroes probe read it, so a hero listed here is built, shown and checked. |

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

## The hero core (`src/render/facet/hero.js`)

What every model-standard hero shares, lifted out of the pilot Tank:

- **Poses** are flat vectors of numbers: the body fields every hero shares (`yaw`, `pitch`,
  `roll` of the torso; `rx`, `ry`, `rz` of the root's weight shift; `sw`, `sh` squash;
  `hop`; `step`, the lunge foot's reach; `air`) plus the rig's own weapon fields.
- **Moves** (`createMove`): a keyed timeline whose phases each ease to a key pose. A move
  names its `contact` (the blow) and `entry` (where a game cast enters, just ahead of the
  release). Every move settles into the stance with one small overshoot (about 4.5%, B5).
- **The combo** (`createCombo`): three hits; each hit's settle eases into the next hit's
  wind-up and holds it for the combo window, then recovers with the overshoot. A chained
  hit strikes from wherever the last one held it. The strike runs at full speed from the
  press frame (B4) and stops dead on the contact.
- **The attack clock** (`createAttackClock`), one per rig, on the render clock:
  - `cue('basic', ev)` plays the next hit (once per event); a skill, a hit taken or the
    window lapsing starts over; `comboHitOf(ev)` tells the VFX layer which hit (1 to 3)
    an event plays, safe in any handler order.
  - `cue('skill', ev)` plays the ability `skillAbility(ev)` names.
  - `cue('connect', ev)` is a sim `hit` this rig struck: it arms the recoil (B3).
  - `cue('hitstop', ev)`: the sim froze the world for `ev.ticks`. Every rig holds its whole
    update for that long (clip, attack and feet), except the attacker of that tick, whose
    strike has not reached its contact yet (the sim hits on the press): it plays on to the
    contact pose and holds there instead (B2). A shooter never waits (its bolt lands later).
  - `cue('spawn')`: the grow-in from the floor on a room entry (B7: 7 frames, 10% overshoot).
  - The shooter's squash (B3 for shots): 20%, 29%, then 38% wider and up to 10% shorter over
    steady fire, back in about 3 frames with a 4% stretch, a rig-only shove eased back over
    0.45 s.
- **The lab combo** (`createComboLab`): the three swings at the class's real cadence, each
  contact held as the hitstop holds it (2 ticks; the finisher 3, as a kill), the recoil or
  the squash after it; pure in t, so it rewinds.
- **Locked feet** (`createFootLock`): each foot pinned to the floor in world space while it
  carries weight, stepping one at a time toward where the body is going, the lunge foot
  stepping into a lunge. On a hop, a dash or any travel too fast to walk both feet leave the
  floor and plant where they land; a teleport, a new room or a move with no time passing
  stands the feet afresh. `walkBody` gives the walk's bob, roll, hip twist and travel lean
  from the steps.
- **Named points** (`namedPoint`): `hand` and `tip` on every hero (B8), read through
  `critter.pointWorld(name)`.
- `LUNGE_PITCH_MAX` (0.44 rad, 25°): an attack's lean at contact may pass the critter
  factory's 12° walk and idle ceiling (B9 asks 20 to 25°); the head counter-rotates so the
  face stays up.

A hero module exports a SPEC (`id`, `label`, `build`, `hits`, `moves`, `skillAbility`,
`swingSec`, `comboLab`, `ranged`, `walkSpeed`, `weaponField`, `lab: { abilities, frame, cues }`);
its build returns the critter contract plus `cue`, `hold`, `comboHitOf`, `points` and `lab`.

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

### The Tank re-measured against §6.1 (v0.5.335)

| # | Rule | The pilot (v0.5.332) | Now |
|---|---|---|---|
| 1 | B1 anticipation | Passed: the wind-up lives in the last settle, 1.5 frames from rest | Kept |
| 2 | B2 fast strike, held contact | Strike 2.5 frames passed; the contact did not hold (the rig never heard the hitstop, which the sim raises on the press, before the rig's contact) | The attacker holds its contact pose for the hitstop's ticks; every other rig holds at once |
| 2 | B9 lunge into the contact | No pull back, the lean capped at 12°, no contact squash | Pull back 0.05 to 0.06 u in each wind-up, lunge 0.08 to 0.14 u past rest, lean 21 to 24°, a +19% / -9 to -12% squash at contact back within 3 frames; the travel stays a lunge step (the lead foot steps in about 0.10 u) |
| 3 | B3 recoil | None | A rig-only shove of 0.1 u and a lean back in 2 frames after the held contact, gone in 8; a whiff does not recoil |
| 4 | B4 kick on the press | The strike eased in from rest (4% of its travel on the first frame) | The strike runs at full speed from the press (20% on the first frame at 60 fps) |
| 5 | B5 follow-through | The settle into the next wind-up passed; the recover and the abilities' settle were plain blends | Every move recovers with one small overshoot |
| 6 | B6 third hit biggest | The slam with its lunge step is the biggest pose; the lab played the same beat for all three | Kept; the lab plays the finisher bigger, and `comboHitOf` lets the VFX layer do the same in game |
| 7 | B7 spawn-in | None | Grows from the floor on every room entry |
| 8 | B8 named points | None | `hand` (the grip paw) and `tip` (the slab's striking edge) |
| 9 | R2 to R5 hit reaction | Foes only | Not a hero rule |
| 10 | K2 to K4 death motion | Foes only | Not a hero rule |
| 11 | Colour | Passed | Kept (no Ember, Violet, Bright Heal or amber on the rig) |

Heavy Slam and Brace now lean into their blow too (the brace sinks forward over the shield).

<!-- HEROES -->

## Integration

- `render/boss/index.js` and `ui/story/viewerrigs.js` build `buildWyrmFacet` when
  `facetOn('wyrm')`; it keeps the classic rig's interface (`group`, `mats`, `setYaw`,
  `setFlash`, `pose`).
- `critters/index.js` builds each registered hero's faceted twin when `facetOn(id)`. The
  rig's `apply` receives the driver's clip name; a rig with `hold` holds its whole update
  through a hitstop. The critter API gains `cue(kind, ev)`, `comboHitOf(ev)`,
  `pointWorld(name)`, `lab` and `modelStandard`; the classic rigs ignore them (the classic
  Healer's staff gem still answers `pointWorld('tip')`).
- The cues come from the game's own events: `render/allies/index.js` forwards `ally_basic`
  and `ally_cast` to the seat's rig, each `hit` to the rig that struck it (`connect`), each
  `hitstop` to every model-standard rig and `room_enter` as `spawn`; `scenes/arena.js` does
  the same for the player's Healer (`basic_fire`, `skill_cast`, her hits, `hitstop`,
  `room_enter`); the camp forwards the seat casts.
- The classic rigs (`boss/wyrm.js`, `critters/tank.js`, `healer.js`, `swordsman.js`) are
  untouched and stay beside them.

## The model lab (`?modellab=1`, harness only)

`scenes/modellab.js` and `ui/modellab.js`: the video's toolbar. Model tabs (Barrow Wyrm,
one per registered hero, Effect kit), Idle / Move / Ability / Still, the ability buttons
(a hero's basic combo, each of its abilities and its Spawn; the Wyrm's Ash Breath, Burrow
Strike), Rewind, Showcase or Play zoom (the game camera's 45° field at 12 u and 52°),
Turntable, Classic beside, a scrub bar that holds Still, and the live readout. The combo
holds each contact for the hitstop and plays the recoil or the shooter's squash after it.
Each cue beat plays its game sound and a VFX burst at the weapon's tip; the finisher's is
the biggest.
URL: `?modellab=1&model=tank&mode=ability&ability=combo&view=play&classic=1`. Probes drive
it with `__echoes.cmd('lab', {model, mode, ability, t, rate, view, turntable, classic})`;
its debug state carries the shown hero's `feet`.

## Adding a model to the standard

1. Build it with the kit: faceted parts (`facetize` + `facetMaterial`), repeated detail on
   `InstancedMesh` with `addInstancedInk`, the same rig interface as its classic twin.
2. Give each ability a timeline with named phases; drive it from the sim's telegraphs and
   modes in game, from the playhead in the lab.
3. Heroes and biped foes get the 3-hit combo template; run the self-check (root motion
   matches the legs, planted feet locked until the weight shifts, hips and legs drive each
   swing; a legless body keeps its base planted). Meet the §6.1 [M] rules.
4. A hero: build it on the hero core, export its SPEC and list it in `heroes.js`; that
   gives it the lab tab and the heroes probe. Add it to `MODEL_STANDARD`. A boss or a foe:
   a lab tab and a check in `tools/model-standard-probe.mjs`.
5. Shoot it in the lab and at play zoom in a busy fight beside its classic twin
   (`tools/model-standard-heroes-shots.mjs` shoots the fight faceted and with `?facet=0`).

## Probes

`node tools/model-standard-heroes-probe.mjs [--only id]` (in `npm test`) runs every hero in
`FACET_HEROES` through the same checks: the cadence and walk speed match the sim; every
class skill plays an ability and every ability is played; each hit settles into the next
hit's wind-up with no pop anywhere; the lab's cues sit on each contact; `comboHitOf` counts
1-2-3 once per event; the melee wind-ups pull back, contacts lean 20 to 25° and squash
+19% / -9%, back within 3 frames, inside a lunge step (B9); the weapon kicks on the press
(B4); every move settles with one small overshoot (B5); the third hit is the biggest (B6);
the contact holds through the hitstop the rig struck, and any hitstop holds the whole rig
(B2); a connect recoils 0.08 to 0.12 u after the hold and a whiff does not, or a shooter
squashes 20/29/38% (B3); the spawn grows in (B7); hand and tip are named and the tip
travels (B8); the hips lead the weapon; planted feet never slide, step one at a time and
along the travel in eight directions; the walk leans into the travel; a dash lifts both
feet and they plant where they land; the finisher's hop or lunge moves the feet; downed
runs; every instanced part inked; no Ember, Violet, amber or stray Bright Heal; the flag and
the classic twin.

`node tools/model-standard-probe.mjs` (in `npm test`): timelines pure and rewindable;
flat facets; every instanced part inked; the Wyrm's no-slip coil, planted base, breath and
burrow driving, turntable and death freeze; the Tank's chain continuity, cadence, skill
coverage, hips before slab, locked feet in eight directions, steps along the travel, the
lean, the lunge; the flag; no reserved or amber colours; Bone brightest on the Tank.
