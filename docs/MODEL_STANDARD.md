# Model standard (pilot v0.5.332; Level I bosses v0.5.336; heroes v0.5.337, Archer v0.5.339, Tidecaller v0.5.342, Bellwright v0.5.343, Duskwing v0.5.345; Level I foes v0.5.338; Level I champions v0.5.340; Level II bosses v0.5.344; Level II foes v0.5.346; Level III bosses v0.5.348; Level III foes v0.5.349; Level IV foes v0.5.350; Level III champions v0.5.351; Level IV bosses v0.5.353; Level IV champions v0.5.354)

Kesh's sample video (a Claude Design "Leviathan" page, studied in
`/mnt/project-files/plan/MODEL_STANDARD.md`) builds its creature in code: faceted low-poly
planes, detail by repeating small parts, and abilities as named, rewindable timelines. He
picked option (d): build that technique into the game's own renderer. This pilot does it for
two models, the **Barrow Wyrm** and the **Tank**, so he can judge the look before any
roster slice. Visual only: no sim, timing, damage or golden changes. The Level I slice
(v0.5.336) then rebuilt the **Hollow Stag**, the **Thornmother** and the **Gloam Wolf** and
measured the pilot's Wyrm against the [M] checklist of `/mnt/project-files/plan/VFX_HIT_RULES.md`
§6.1 (see "The [M] beats" and "The Level I bosses" below); its second part (v0.5.339) rebuilt
the Hollow Wood's two champions, the **Briar Knight** and the **Moss Hart** ("The Level I
champions"). The Level II slice (v0.5.344) rebuilt the Sunken Mill's three bosses, the
**Drowned Heron**, the **Millwheel** and the **Mire King** ("The Level II bosses"), and its
second part (v0.5.347) the Mill's two champions, the **Sluice Warden** and the
**Lockkeeper** ("The Level II champions"). The Level III slice (v0.5.348) rebuilt the Ashen
Barrow's two bosses, the **Lich Ram** and the **Ash Raven** ("The Level III bosses"), and its
second part (v0.5.351) the Barrow's two champions, the **Bone Reeve** and the **Gravebell
Ringer** ("The Level III champions").

His ruling for the pilot: the detail goes **on top of** the chibi ink-outline style
(BUILD_BRIEF §19.2), it does not replace it, and the facets must read clearly.

The heroes slice (v0.5.337, Kesh's pick of 2026-10-26) rolls the standard out to the heroes,
the Healer and the Swordsman first, and re-measures the pilot Tank against the [M] rules of
the VFX/hit rules doc (`/mnt/project-files/plan/VFX_HIT_RULES.md` §6.1). Everything a hero
rig shares now lives in one hero core, so each later hero is its body, its poses and its
abilities, and the same probe holds every one of them to the same rules. The Archer
followed in v0.5.339, the Tidecaller in v0.5.342, the Bellwright in v0.5.343 and the
Duskwing in v0.5.345 (their sections below): all seven heroes now play the standard.

## The kit (`src/render/facet/`)

| File | What it gives |
|---|---|
| `material.js` | `facetize(geo, {jitter, seed})`: non-indexed geometry with flat normals and a per-plane value step in a `color` attribute (hashed from the face normal, so a plane keeps its tone as the model moves). `facetMaterial(color)`: the house toon material with vertex colours. Every faceted part keeps the 3-step toon ramp, so the light still bands like the rest of the game, and the facet step rides on top. |
| `kit.js` | The parts kit on `InstancedMesh`, so hundreds of plates cost two draw calls (the part and its ink hull): `createSpine(n)` (a Catmull-Rom spine with a stable frame), `createPlateTube` (ridged scales laid in a brick pattern round a moving spine, sized by the local arc length so a bend never opens a gap, with metal bands every few rings), `createSpineRow` (wedge spikes along the spine, with tinted tips), `placeRow` (any fixed row: teeth, rivets, crest fans, mail), `mottle` (per-instance tone), `wedgeGeometry`, `plateGeometry`. Part ink is `PART_INK_PX` (1.35 px), thinner than the silhouette's `INK_PX`. |
| `timeline.js` | `createTimeline(id, label, phases, {cues})`: pure in t (`sample(t)`, `startOf(phase)`, `readout(t)` for "1.2s · Ash Breath: strike"). `createPlayhead`: rate 1 plays, 0 holds, -1 rewinds; cues fire only on a forward crossing, so a rewind and replay re-fires each once. `ease`. |
| `flags.js` | `MODEL_STANDARD = {wyrm, tank, healer, swordsman, archer, tidecaller, bellwright, stag, thornmother, gloamwolf, heron, millwheel, mireking, lichram, ashraven, cantor, colossus, veinweaver, the Level I, II, III and IV foes, the Level I to IV champions}` and `facetOn(kind)`. A harness build reads `?facet=0` (every model classic) or `?facet=wyrm,stag` (only those); a player build never sees the param. |
| `hero.js` | The hero core (below). |
| `heroes.js` | `FACET_HEROES`: the registry of model-standard heroes. The critter factory, the model lab and the heroes probe read it, so a hero listed here is built, shown and checked. |
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
    contact pose and holds the pose there instead (B2), while the world and its own travel
    move on. The first stop of a tick decides which; a connect that names the attacker
    after the stop moves the hold to the contact. A shooter never waits (its bolt lands
    later).
  - A connect up to 0.25 s after the contact (a guest's late event) still recoils at once.
  - Every move hands back to the body's live base pose (the walk's lean and twist, or
    the stance), never to a fixed rest: at its natural end the move lets go over 4
    frames, eased in and out (v0.5.339; it used to start at full speed, which a big
    hip turn read as a kick), into whatever the legs are doing, so a swing on the walk takes over from the
    walk and gives it back without a cut.
  - A hit taken (the `hurt` or `downed` clip) lets the move go the same way, from where
    each channel of the body stood (hips, torso and the lagged weapon each from its own
    pose), so nothing pops; the combo starts over.
  - A skill enters its timeline just ahead of its release, mid-phase. It cross-fades in
    over 3 frames from the pose the rig had, and the weapon's lag ramps in with it, so a
    cast pressed mid-swing never whips the weapon (`atk.entered(shift)` gives a rig the
    fade for its own aim).
  - The contact hold waits for the weapon: a melee strike holds where the weapon lands,
    one weapon lag (2 frames) after the hips, so the held frame shows the blow, not the
    weapon two frames short of it.
  - `cue('spawn')`: the grow-in from the floor (B7: 7 frames, 10% overshoot) on the run's
    first room only (Kesh's pick of 2026-10-26); later room entries play nothing until
    `cue('reset')` starts a new run.
  - `cue('reset')` forgets every move, hold and envelope. The camp calls it on the rigs of
    the mode coming in (a rig hears every cue on the bus, even while hidden and not updated),
    the run's before its first `room_enter`, so the spawn still plays.
  - The shooter's squash (B3 for shots; no hero uses it since the Healer's basic plays as
    melee, kept for the Archer and other shooters): 20%, 29%, then 38% wider and up to 10% shorter over
    steady fire, back in about 3 frames with a 4% stretch, a rig-only shove eased back over
    0.45 s. A shooter's finisher is a spell throw: it keeps its own hop and stretch, so the
    third shot does not squash and the 38% lands on the fourth.
- **The lab combo** (`createComboLab`): the three swings at the class's real cadence, each
  contact held as the hitstop holds it (2 ticks; the finisher 3, as a kill), the recoil or
  the squash after it; pure in t, so it rewinds.
- **Locked feet** (`createFootLock`): each foot pinned to the floor in world space while it
  carries weight, stepping one at a time toward where the body is going, the lunge foot
  stepping into a lunge. A step that would pass through the body (a turn on the spot)
  swings round it. On a hop, a dash or any travel too fast to walk (that frame's own speed
  too, so a dash lifts on its first frame) both feet lift from where they stand, ease to
  ride the body over 3 frames and plant where they come down; the landing eases only their
  height, so a foot lands where it is drawn. A lunge that rises (the finisher's step) moves
  the lead foot at once, over 3 frames, so it plants with the blow instead of a step later. A held frame (a hitstop)
  leaves planted feet where they are; a teleport or a new room stands them afresh; only
  the lab's Still stands them on the pose's homes. `place()` sets the feet again after the
  walk's bob moves the rig. `walkBody` gives the walk's bob, roll, hip twist and travel
  lean from the steps.
- **The weapon clears the head**: above the brow it never enters the skull, below it never
  more than half way in (a chibi shoulder tucks under the jaw at rest). The heroes probe
  measures every hit and ability frame by frame.
- **Named points** (`namedPoint`): `hand` and `tip` on every hero (B8), read through
  `critter.pointWorld(name)`.
- `LUNGE_PITCH_MAX` (0.21 rad, 12°): Kesh capped the attack lean at the critter factory's
  12° walk and idle ceiling (his pick of 2026-10-26; B9 asks 20 to 25°). The keys stay
  authored on the B9 scale and `leanOf(pitch, restLean)` draws them through a soft knee
  that eases toward 12° and never passes it; the head counter-rotates so the
  face stays up.

A hero module exports a SPEC (`id`, `label`, `build`, `hits`, `moves`, `skillAbility`,
`swingSec`, `comboLab`, `ranged`, `walkSpeed`, `weaponField`, `lab: { abilities, frame, cues }`);
its build returns the critter contract plus `cue`, `hold`, `comboHitOf`, `atContact`,
`points` and `lab`.

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
  3. *Crushing slam*: overhead on the toes, both paws on the slab out on its own side, down
     into the ground ahead with a lunge step. The off arm bends at the elbow round the back
     of the head to reach it (Kesh's pick of 2026-10-26), never through the skull.

  The slab goes up and comes down round the head on its own side (the wind-up, the strike,
  the settle into the overhead and the recover swing out by up to 0.2 u), never through it.

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

### The Tank re-measured against §6.1 (v0.5.337)

| # | Rule | The pilot (v0.5.332) | Now |
|---|---|---|---|
| 1 | B1 anticipation | Passed: the wind-up lives in the last settle, 1.5 frames from rest | Kept |
| 2 | B2 fast strike, held contact | Strike 2.5 frames passed; the contact did not hold (the rig never heard the hitstop, which the sim raises on the press, before the rig's contact) | The attacker holds its contact pose for the hitstop's ticks; every other rig holds at once |
| 2 | B9 lunge into the contact | No pull back, the lean capped at 12°, no contact squash | Pull back 0.05 to 0.06 u in each wind-up, lunge 0.08 to 0.14 u past rest, lean drawn at 11 to 12° (Kesh's cap; keyed 21 to 24°), a +19% / -9 to -12% squash at contact back within 3 frames; the travel stays a lunge step (the lead foot steps in about 0.10 u) |
| 3 | B3 recoil | None | A rig-only shove of 0.1 u and a lean back in 2 frames after the held contact, gone in 8; a whiff does not recoil |
| 4 | B4 kick on the press | The strike eased in from rest (4% of its travel on the first frame) | The strike runs at full speed from the press (20% on the first frame at 60 fps) |
| 5 | B5 follow-through | The settle into the next wind-up passed; the recover and the abilities' settle were plain blends | Every move recovers with one small overshoot |
| 6 | B6 third hit biggest | The slam with its lunge step is the biggest pose; the lab played the same beat for all three | Kept; the lab plays the finisher bigger, and `comboHitOf` lets the VFX layer do the same in game |
| 7 | B7 spawn-in | None | Grows from the floor on the run's first room (Kesh's pick) |
| 8 | B8 named points | None | `hand` (the grip paw) and `tip` (the slab's striking edge) |
| 9 | R2 to R5 hit reaction | Foes only | Not a hero rule |
| 10 | K2 to K4 death motion | Foes only | Not a hero rule |
| 11 | Colour | Passed | Kept (no Ember, Violet, Bright Heal or amber on the rig) |

Heavy Slam and Brace now lean into their blow too (the brace sinks forward over the shield).

The review after the re-measure found the slab inside the top of the head in the rising
bash's high finish, the slam's overhead wind-up and Heavy Slam's gather (one corner of the
shoulder block came within a fifth of the skull's radius of its centre). The overhead keys moved out to the slab side and back
(0.37 u out, 0.2 u behind), the high finish 0.1 u further out, and the paths between them
arc round the head; the probe now holds every hero to it. A second review found the off
paw's arm crossing the head on those overhead keys. Kesh chose to keep both paws on the slab,
so the off arm is two bones: where the straight reach would cross the skull, the paw keeps
out of it and the elbow swings out behind the head (each bone at least 0.33 u from the
skull's centre); the lead foot of the slam's lunge now lands
with the blow (0.42 s against the contact's 0.41 s), not 0.18 s late.

## The Healer (`src/render/critters/healerfacet.js`)

The player's hero. The classic contract stays: the wide closed bell in Sage (12-sided, 2%
wider so its flats keep the classic's width), the round ears with their blush, the short
snout, the head proportions and painted face, the staff held out to the side and forward,
and the classic gem with its exact colour, glow and flare (Bright Heal on the gem only; it
stays `tip`, so the player's bolts still leave the gem: at birth a bolt reads
`releaseWorld`, where the gem will be at the shot's release, since the bolt is born on the
press a few frames before the staff gets there).

- **Detail.** A capelet of 21 folded leaves in two brick-laid rows round the shoulders,
  open over the bone bib; a scalloped hem of 18 leaves; a sash of 12 folded plates (the
  classic's sash sat hidden inside the bell); 7 criss-cross bindings on the shaft; 6 pewter
  beads; a pewter claw setting of 8 blades round the gem. The leaves are Sage lightened at
  its own hue; the wood is the classic's weathered toward Warm Grey (the classic's own wood
  sits in the amber family); no gold. Two small faceted feet peek out under the front hem.
- **3-hit combo, as melee** (Kesh's pick of 2026-10-26: her basic is a bolt every 0.5 s in
  the sim, but the rig plays it as melee blows: each contact holds, pulls back, lunges in,
  squashes +19% and recoils off a connect like the Tank and the Swordsman): wind 1 frame,
  strike 1.5 frames, overshoot 2, settle 5, recover 0.35 s; the staff gripped low.
  1. *Diagonal forehand*: the hips unwind and the staff chops down across the front, the
     gem levelled ahead.
  2. *Rising backhand*: the hips snap back and the staff rises out past the staff side, the
     gem high.
  3. *Overhead cast*: up on her toes, leaning back with the staff over the top, then a hop
     (0.12 u) as it arcs forward and down, coming down squashed into a lunge step at the
     release.

  The free paw counterbalances every throw. She casts on the move: the feet keep stepping and the walk's bob, roll and twist
  stay under the attack.
- **Abilities** (by the skill's shape): *Lantern Point* (projectile and direct: the staff
  levelled at the hip, then thrust out like a lance), *Bloom* (nova and aura: up on her toes
  with the staff upright at her side, then a squash as the gem flares), *Staff Plant*
  (ground skills: the butt driven into the floor beside her with a lunge step), *Wide Sweep*
  (melee arcs: the staff wound far back and swept round the front).
- A small local solver keeps the staff's shaft out of the bell and the head through every
  pose.

## The Swordsman (`src/render/critters/swordsmanfacet.js`)

The classic contract stays: the narrow forward-leaning wedge (the rest lean), the long
snout, big pointed ears (now dark-tipped), the white-tipped brush sweeping back and up, the
sword as a clean diagonal line, the plum-wine tunic authored toward plum, the face and
cheek markings, and the classic metrics.

- **Detail.** Two rows of lamellar trim (24 plates), a baldric of 6 leather plates with 4
  pewter buckles, a 3-plate pauldron on the sword shoulder, a dark plum scarf of 4 notched
  wedges at the nape, a cream cheek ruff (6), 9 tufts layered along the brush, pewter
  quillons on a blade of hexagonal section with two fullers.
- **3-hit combo** at the sim's 0.35 s cadence (the fastest hero), combo window 0.7 s: wind
  1.5 frames, strike 2 (the finisher 3), overshoot 2, settle 4.
  1. *Forehand slash*: the torso turned away, blade cocked back, then across to the far side.
  2. *Rising backhand*: low across, cut up to high; the overshoot carries the blade high.
  3. *Leaping cut*: the blade over the top, a 0.15 u hop and stretch through the strike,
     landing squashed at a 25° lean with the lead foot lunging in and both paws on the grip.

  The swing smear follows the blade's real sweep, in Parchment (never Ember), laid over
  the body instead of added onto it so it cannot white out the face.
- **Abilities** (by skill, with a fallback by shape): *Lunge Strike* (Lunge Strike, Fox
  Step, Moonfang: a 2-frame thrust), *Flurry* (six fast cuts and a finishing stroke),
  *Crescent Cut* (Crescent Finisher, Riposte: a guard and a wide cut), *Blade Storm* (Blade
  Storm, Blade Dance: a small leap and a full spin), *Caltrops* (a reach and a flick), *Edge
  Draw* (Razor Wake, Crimson Edge: the blade presented, the off paw along the edge, a salute).
- The drawn blade arrives on the contact frame (a per-hit whip makes up the core's
  one-frame weapon lag on a 2-frame strike); the blade's flat turns toward the camera.
- The crescent's follow-through finishes high in front of the face on the far side (the
  guard used to pass through the jaw); a hit taken mid Blade Storm, or the storm's end,
  lets the spin go over the 4-frame let-go the short way round instead of snapping back,
  and the smear trails it.

## The Archer (`src/render/critters/archerfacet.js`, v0.5.339)

The classic contract stays: the tallest, thinnest column, the very long upright ears (the
party's only vertical double-spike, swaying as one pair so they never cross), the olive
tunic with its Bone bib, the blaze and painted face, the puff tail, the quiver raked back
clear of the skull, and the bow as an open C off to the side, opening outboard, with no
string at rest. The classic metrics are unchanged.

- **Detail.** A feathered mantle of 12 notched plates round the shoulders (open over the
  bib), 6 leather ties down the bib, 5 arrows in the quiver with 10 fletching vanes, 4
  wrapped bindings on the grip, horn nocks on the limb tips, a belt pouch. The bow's wood is
  weathered umber toward warm grey (the classic's sat in the amber family; amber stays the
  damage numbers'), the arrowhead pewter.
- **The string and the arrow** show only while she draws: the string runs from each nock to
  the draw paw, an arrow lies on the bow, and both go on the release (the sim's arrow takes
  over). At rest the C keeps its negative space.
- **3-shot combo** at the sim's 0.4 s cadence, combo window 1.0 s, as a ranged hero (the
  shot squash 20/29/38%, the finisher keeping its stretch): wind 1 frame, strike 1.5,
  overshoot 2, settle 5.
  1. *Quick loose*: side-on, full draw under the chin; the back shoulder pulls through and
     the draw paw flies back past the ear.
  2. *Canted shot*: down in a crouch with the bow laid over flat, the legs driving up
     through the loose; the hips turn on hardest of the three.
  3. *Leaping power shot*: up on the toes at the deepest draw, a 0.13 u hop with a 1.12
     stretch at the release, landing squashed two frames later.

  The hips turn on through each loose (their yaw grows from draw to release) and the bow
  holds the aim a frame behind them. The turn is kept small (0.12 to 0.3 rad) so a hit
  taken mid-shot lets go inside the no-cut bar; the side-on read comes from the arms.
- **Abilities** for all eleven skills (by skill, with a fallback by shape): *Power Shot*
  (Piercing Shot, Pinning Arrow, Hunter's Mark: a long full draw, leaning back, then the
  body driving through), *Fan* (Volley, Feather Fan: three looses with the bow swept across
  the front), *Vault Shot* (a crouch, a hop back and the loose in the air, then a landing),
  *Sky Shot* (Rain of Arrows, Sundering Nova: the bow tipped to the sky), *Set Trap*
  (Detonating Charge, Barbed Trap: the bow lowered to point at the floor, a lunge and the
  paw setting the trap) and *Kestrel Watch* (the paw shading the eyes, a slow look out).
- The draw-side foot lunges; downed, the bow lies flat beside her in front.

## The Tidecaller (`src/render/critters/tidecallerfacet.js`, v0.5.342)

The classic contract stays: the long low body stretched front to back, the thick tapering
tail trailing along the ground (the only mass in the party that runs backwards), the tall
reed staff topped with a shell standing taller than her head, the cream throat and muzzle,
small low ears, whiskers, the river-blue sash, the dripping satchel and the conch on its
cord. The classic metrics are unchanged.

- **Detail.** A ruff of 10 fur tufts at the throat, 8 small shells strung along the sash,
  5 kelp streamers under the staff's shell, 4 cord bindings on the grip, the satchel's
  3-plate flap, and 9 fur ridges down the three tail segments. The reed is weathered umber
  toward warm grey (the classic's leaned to Pale Gold, in the amber family).
- **3-cast combo** at the sim's 0.35 s cadence, combo window 0.9 s, as a shooter (the shot
  squash 20/29/38%, the finisher keeping its stretch): wind 1 frame, strike 1.5, overshoot
  2, settle 4.
  1. *Staff fling*: the shell cocked back over the shoulder, then the staff swung
     forward and out to the staff side (Kesh's pick: clear of the face, a sideways swing
     instead of a forward tip), the free paw pushing after the water.
  2. *Side sweep*: the staff laid out wide, then swept up and forward past the shoulder;
     the tail swings against the hips.
  3. *Overhead slam*: the staff raised back over the head, then a 0.13 u hop and the staff
     brought down forward and out on the staff side with a 1.12 stretch, landing
     squashed.

  The hips turn the staff shoulder forward through each cast (small, 0.08 to 0.26 rad,
  like the Archer's) and the staff follows a frame behind; the staff's top always leans
  outboard of the face.
- **Abilities** for all eleven skills (by skill, with a fallback by shape): *Bolt*
  (Riverbolt), *Jet* (Torrent: braced, the staff levelled and shuddering through the jet),
  *Swirl* (Undertow, Whirlpool: the staff dipped and stirred, then planted), *Squall* (Rain
  Squall: the staff raised high beside her), *Breaker* (Breaker, Crashing Wave, Maelstrom:
  a crouch and a sweep up and over), *Tidepool* (the staff planted, the paw spread over the
  water), *Ripple Step* (a hop off the water) and *Bubble Ward* (the staff upright, the paw
  lifting the bubble).
- Downed, the staff falls with her and lies beside her.
- `tools/model-standard-heroes-shots.mjs --lineup healer,tank,swordsman,tidecaller` shoots
  a hero outside the default four (a Level I campaign run with that party).

## The Bellwright (`src/render/critters/bellwrightfacet.js`, v0.5.343)

The classic contract stays: the round domed shell split down the back, the two long curling
antennae with their beads, the little belfry on her back with its bell hanging over her
head (the only prop in the party that rides above the head), the pale belly plate, the
tuning fork at her belt and the short bell mallet in her right hand. The classic metrics
are unchanged.

- **Detail.** 8 ridge plates down the wing-case seam, 10 chitin studs on the cases, 3 dark
  seams across the belly plate, a gable roof of 6 shingles over the belfry, 3 cord bindings
  on the mallet's grip. The classic's brass and bronze sat bright in the amber family: the
  cases keep her bell bronze, dark; the bell and the mallet head are that bronze lit toward
  Pale Gold and aged toward the warm grey (an old bell); the belly takes a step toward the
  bronze so it does not glare.
- **3-strike combo** at the sim's 0.4 s cadence, combo window 1.0 s, as a thrower (the
  shot squash 20/29/38%, the finisher keeping its stretch): wind 1 frame, strike 1.5,
  overshoot 2, settle 5.
  1. *Downward tap*: the mallet raised up and back, then brought down in front.
  2. *Backhand ring*: the mallet laid out wide to the side, then swung in and down.
  3. *Overhead strike*: the mallet high over the shoulder in both paws, then a 0.13 u hop
     and a hard strike down in front with a 1.12 stretch, landing squashed.

  The hips turn the mallet shoulder forward through each strike (small, as for the Archer
  and the Tidecaller) and the mallet's head stays outboard of the face. The belfry bell is
  a damped pendulum each downswing kicks, so it rocks with every strike and rings down.
- **Abilities** for all eleven skills (by skill, with a fallback by shape): *Hang Bell*
  (Hang Bell, Great Bell: the paw reaching up to hang it, then the strike), *Peal* (Peal,
  Carillon: the mallet swung up into her own bell), *Clapper* (Clapper, Knell: a throw),
  *Hum* (the paw at the chest feeling the note), *Bell Swing* (a wide swing through the
  front), *Wing Hop* (the wing cases snap open for the hop) and *Chime* (Vesper Chime,
  Tuning Fork: the fork tapped on the mallet and held up).

## The Duskwing (`src/render/critters/duskwingfacet.js`, v0.5.345)

The classic contract stays: the plump pear body with its pale chest ruff, the two big leaf
ears splayed wide and lined in rose, the pug nose and two small fangs, and the leather wings
folded at his sides like a cloak (the party's only wings, and the only outline that changes
width when he strikes). The classic metrics are unchanged.

- **Detail.** A fringe of 9 ruff tufts along the bib's lower edge, a crest of 4 tufts on the
  crown, a mane of 6 down the back between the wings, and 4 knuckle claws on each wing (the
  wrist and the three finger tips). The wing membranes are faceted leather with the finger
  bones a four-sided section over them.
- **3-hit combo** at the sim's 0.3 s cadence (the fastest in the party), combo window
  0.6 s, as a melee hero (the B9 contact squash, the recoil off a connect): wind 1 frame,
  strike 1.5 (2.5 for the finisher), overshoot 2, settle 4. The right wing is his weapon
  (`weaponField` `rws`, its sweep), its claws whipping ahead of the body's ease.
  1. *Forehand wing rake*: the right wing cocked open and back, swept forward round the
     front, right to left.
  2. *Rising backhand rake*: the wing gathered low across the chest, raked back out and up
     to the side, left to right.
  3. *Diving bite*: a crouch with both wings raised, a 0.16 u leap, both wings beating down
     and forward and the head darting in for the bite, landing in the deepest lunge.
- **Abilities** for all eleven skills (by skill, with a fallback by shape): *Dusk Dive*
  (wings wrapped for the drop, snapped wide on the landing), *Bloodbite* (wings cupped
  round the prey, the bite held while he drinks), *Nightfall* (Nightfall, Blood Moon: both
  wings raised high, one deep downbeat), *Echo Screech* (the head drawn back, then thrust
  out on the shriek), *Talon Rake* (both wings raked round the front), *Bat Swarm* (wings
  gathered low, flung open), *Shadow Veil* (wings wrapped shut, snapped open), *Flit* (a
  flick and a hop away) and *Night Wings* (Night Wings, Blood Scent: the wings half open,
  the nose up, one slow beat).

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

## The Level I champions (v0.5.340)

The Hollow Wood's two champions, rebuilt the way the bosses were: each keeps its classic
rig's silhouette, colours (the classic's own constants) and its ONE indigo tell, adds the
standard's detail on top, and walks on **locked feet**; the classic rigs stay beside them
(`?facet=0`). Both keep the champion table's soft hit flash (`CHAMPION_FLASH`) and the
presence layer's crown, sigil and chest, which ride on the rig's group as before.

| Champion | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Briar Knight | `render/enemies/champfacet/briarknight.js` | 95 (52) | 93 |
| Moss Hart | `render/enemies/champfacet/mosshart.js` | 74 (113) | 113 |

- **Briar Knight.** The knight grown out of the Wood: a dark hip drum under a bark chest
  with two rings of ridged bark plates laid brick-wise (the upper ring lit), a belt of root
  knots and a skirt of bark tassets, thorn pauldrons, a faceted helm with a brim, a fan of
  thorn crest blades and the indigo visor slit, a moss collar and a cape of five moss
  strips that sway on their own, a barbed briar lance with a leaf-blade tip and a vamplate,
  a seven-sided buckler with a thorn boss and a ring of thorns. It is a **biped**: two root
  feet on `createLegs` (three splayed toes each, a knot at the knee), and both arms reach
  their hands by the same two-bone IK, so the hands stay on the lance's grip and the
  buckler in every pose. *Bramble Charge*: couch (the 60-tick lane warning less one
  strike: the lance comes level under the arm, the body cocks back on a long lead step,
  the buckler up), drive (2.5 frames, landing as the sim starts to charge: thrown forward
  into the run), run (held while the sim charges at 9 u/s: the cape streams back), stop (a
  braced skid on the sim's charge end, a wall or the lane spent, with the B3 recoil),
  settle. *Thorn Ring*: raise (the 72-tick ring warning less one strike: the lance lifted
  high, point down, the stance wide, the buckler out), plant (2.5 frames, on the ring's
  tick: the lance driven into the floor, the knees deep), held, recoil, settle.
- **Moss Hart.** The great hart of bark and moss: a faceted barrel, chest and haunches,
  ridged bark plates down each flank, the moss mantle as faceted lumps with blade strands
  hanging off its edge and lichen motes glowing in it, a ruff of moss blades round the
  throat, a boxed skull and muzzle, the indigo crack down the brow, and a rack of two
  segmented beams with eight tines a side, a lichen bud on every tine and beam tip and
  moss drapes off the beams. *Antler Toss*: lower (the 56-tick cone warning less one
  strike: the head dropped, the rack levelled, the haunches set), fling (2.5 frames, on
  the toss's tick: the rack flung up and back, the forehooves a step ahead), held, recoil,
  settle. *Hart's Leap* follows the sim's own clock: gather (its crouch, the first 45 % of
  the 74-tick warning: the haunches load), bound (the sim's flight to 95 %: the height is
  the classic's `hartLift`, the crown's own, every hoof off the floor, the forelegs
  reaching then all four tucked), land (2.5 frames, on the forehooves), the landing held
  from the sim's landing tick (the resolve), settle.

A warning is known by its move and start tick, never by object identity. A new champion
(a new entity id, or a clock that went back) spawns in; a jump in place re-plants the feet.
A dying champion is never posed again (the enemy layer's kill takes the rig).
## The Level II bosses (v0.5.344)

The Sunken Mill's three bosses, on the same terms as Level I: each keeps its classic rig's
silhouette and colours (the classic's own constants and value steps of them), adds the
standard's detail on top, and keeps the classic beside it (`?facet=0`). The Heron and the
Mire King walk on **locked feet**; the Millwheel has no feet, so it **rolls on its paddles**:
a planted paddle tip never slides along the roll.

| Boss | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Drowned Heron | `render/boss/heronfacet.js` | 64 (34) | 155 |
| Millwheel | `render/boss/millwheelfacet.js` | 30 (23) | 116 |
| Mire King | `render/boss/mirekingfacet.js` | 77 (60) | 149 |

- **Drowned Heron.** The only vertical boss, the gaunt slate wader: a mantle of feather
  plates in a brick pattern over the back, a fan of tail feathers, breast plumes off the
  neck's root, a neck of feather rings laid over an S (an analytic three-segment neck posed
  by angles, so the plates follow it as it coils), a boxed skull, a two-part bill with the
  classic's violet vein (the lower half gapes), a crest of three plumes; wings as nested
  groups (lift, swing, roll) with a flat blade, eight secondaries, five primaries and a
  covert row, violet weed trailing off them; two stilt legs on locked feet, each joint
  bending back the way a heron's does, three toes forward and one back; the classic's violet
  pool and a ripple ring on the floor. *Bill Spear*: coil (the 48-tick lane warning less one
  strike: the S draws tight over the back, the weight on the back foot, the bill gapes,
  turned square to the lane), thrust (2.5 frames on the resolve: the B9 lunge, the neck
  straight down the lane), dash (held while the sim drives it down the lane at 11 u/s: a
  skim on spread wings, the legs trailed back, no foot on the floor), land (2.5 frames as
  the dash ends: both feet down, the lead foot ahead, the wings braking), held with a
  recoil, settle. *Wingbeat*: raise (the 42-tick ring warning less one strike: up on its
  toes, the wings up and open over the back), beat (2.5 frames on the hit: the wings slam
  down and forward, the body drops), held with a recoil, settle. *Submerge* (an add phase,
  no warning): gather (1.5 frames), plunge (2.5 frames: nose down into the water), held,
  under (it sinks below the floor and stays hidden while the sim glides it; only the ripple
  shows). *Surface*: rise (the 48-tick ring warning less one strike: the bill breaks the
  water first, then the head and the neck), burst (2.5 frames on the hit: up out of the
  water, the wings flung wide), held with a recoil, settle.
- **Millwheel.** The torn mill wheel: a faceted oak tyre bound in iron band plates, twelve
  radial paddles with rivets, six spokes with iron straps, a hub with sixteen bolts and
  violet hub lights, the torn axle's collars with the snapped bracket arms hanging off them
  and swinging as damped pendulums; a ring of iron cog teeth that the Cog Shards bare. It
  rolls as a twelve-sided polygon: the planted paddle tip holds its spot while the hub
  pivots over it (the hub rises and falls a little over each paddle) and the next paddle
  takes the weight; a jump of over 2.5 u (a new room) re-plants the roll only.
  *Cog Shards*: wind (the 48-tick cone warning less one strike: the teeth slide out, the
  wheel sits back, the hub lights), loose (2.5 frames on the hit: the teeth fire off, the
  wheel squashes), held with a recoil, settle while the teeth grow back. *Crosscut*: rock
  (the 66-tick lane warning less one strike: it rocks back on its paddles, turned square to
  the lane), burst (2.5 frames), cut (the sim's 9 u/s cut, rolled on its paddles at speed),
  slam (2.5 frames at the cut's end), held, dizzy (the sim's 75-tick stand: it wobbles on
  its rim, tilting side to side), settle.
- **Mire King.** The vast squat toad, mottled teal-slate over a pale belly: a saddle of warty
  hide plates over the back (the flanks stay smooth), a light scatter of faceted warts down the
  flanks, two glands behind the eyes, brow ridges, a lip of small plates along the mouth,
  weed off the back; the crown as a faceted band with seven rusted mill-grate bars, rivets
  and violet gems; a violet throat sac and maw; a tongue of ten faceted segments that truly
  reaches the lane's far end; four legs on locked feet: splayed fore-limbs on four-fingered
  hands, great folded hind legs on long webbed feet. *Tongue Lash*: draw (the 48-tick lane
  warning less one strike: the head up, the mouth open, the sac filling, the body pulled
  back), lash (2.5 frames on the hit: the B9 lunge, the tongue shot the lane's length), held
  with a recoil, reel (the sim's 12-tick yank: the tongue drawn back in), settle.
  *Belly Flop*: heave (the ring warning less the sim's 20-tick leap: it rears on its hind
  legs, the fore-feet lifted off the floor toward the chest), leap (the sim's flight to the
  ring: a 1.4 u arc, the legs spread wide), land (2.5 frames ending on the hit: belly down,
  every foot planted wide, squashed), held with a recoil, settle. *Swallow*: gape (the
  78-tick ring warning less one strike: the jaw falls wide, the head tips back, the sac and
  body swell, the maw burns), snap (2.5 frames on the hit: the jaw slams shut), held with a
  recoil, settle. *Enraged* (under 40 % HP): the sac beats faster, the eyes and the crown's
  gems burn.

Every warning is known by its attack and start tick (a co-op guest's fresh copies never
restart a wind-up), every wind-up is stretched to the sim's ticks so its strike lands on the
resolve, the facing eases to the lane while the Heron, the Millwheel and the Mire King wind
up on one, and a boss killed in its wind-up collapses in it. On a slow frame (a 1 fps
machine) a strike may land ahead of the resolve, but its contact holds until the warning is
gone; a live surface warning is never "under". The Level I bosses (the Stag's slam, the
Gloam Wolf's rend and howl) hold the same way since v0.5.344; the Thornmother's paw already
held just short of its burst.

## The Level II champions (v0.5.347)

The Sunken Mill's two champions, on the Level I champions' terms: each keeps its classic
rig's silhouette, colours (the classic's own constants and value steps of them) and its ONE
indigo tell, adds the standard's detail on top, walks on **locked feet**, and keeps the
classic beside it (`?facet=0`), the champion table's soft flash and the presence layer's
crown, sigil and chest. Draw calls count every mesh, ink hull and sprite; instances are
the parts in the instanced rows.

| Champion | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Sluice Warden | `render/enemies/champfacet/sluicewarden.js` | 77 (37) | 195 |
| Lockkeeper | `render/enemies/champfacet/lockkeeper.js` | 108 (72) | 150 |

- **Sluice Warden.** The hulking weir-keeper: a dark hip drum under a faceted gut with a
  faint lit crown of four plates, the hump over it, the weir's two iron bands laid as riveted plates
  brick-wise round the gut, iron shoulder caps, a small boxed skull under an iron brow
  plate and a grating of five bars with the indigo eye slit behind it; the sluice gate on
  the left arm, four faceted planks in a riveted iron frame with weed hanging off its sill
  and water beads that run down the planks and fall; the millstone maul in the right hand,
  a ferruled haft and a ten-sided stone with chisel marks round its rim. It is a **biped**
  on two boots with iron toe caps (`createLegs`, an iron cap at each knee), and both arms
  reach their hands by two-bone IK, so the hands stay on the gate's grip and the haft in
  every pose. *Floodgate*: heave (the 66-tick cone warning less one strike: the gate
  hauled up and back over the shoulder, the body cocked back on the right foot), slam (2.5
  frames, on the cone's tick: the gate thrust forward and down, its sill into the floor
  ahead on a long lead step), held, recoil, settle. *Undertow*: raise (the 78-tick ring
  warning less one strike: the maul swung up overhead, the stance wide, the body back),
  smash (2.5 frames, on the ring's tick: the stone brought down before him, the knees
  deep), held, recoil, settle.
- **Lockkeeper.** The gaunt keeper: the long coat to the floor (the classic's skirt) with
  eight faceted panels hung from the belt over it that swing with the stride and stream
  back off a throw, torn tails off every hem, the chest
  and riveted collar with lit shoulders, two strapped bands and a row of lock-buttons; a
  long boxed face with hollow cheeks, the beard, the indigo eye (and the keyhole buckle in
  the hat band, for the view from above), a hat of a faceted crown and a sagging brim with
  its edge torn; the riveted lock-box lantern at the left hip with its pale flame; the great
  key, a faceted bow round the indigo hole, a collared shaft and three bits, and a chain of
  fourteen links laid link by link from the left hand to the live key's bow. It is a biped on
  `createLegs` under the coat: the **locked boots** walk unseen beneath the hem (a crouch
  shortens the coat so it stays off the floor), both arms on the same IK, the hands on the
  key and the chain in every pose. *Chain Hook*: whirl (the 58-tick lane
  warning less one strike: the key swung up behind the shoulder, swinging round on its
  chain, the body turned away on the right foot), throw (2.5 frames, on the lane's tick:
  the arm whips forward on a long lead step and the key leaves the hand), fly (the contact
  held: the key's copy out at the lane's end, `telegraph.length`, bit first, the chain
  taut), reel (the key hauled back to the hand, the body rocking back, with the B3
  recoil), settle. *Lock Turn*: lift (the 70-tick ring warning less one strike: the key
  raised overhead in both hands, the stance wide), drive (2.5 frames, on the ring's tick:
  the key driven into the floor before him, the knees deep), turn (held, the key turned a
  quarter), recoil, settle.

Both wind up the way the Level II bosses do: a warning is known by its move and start
tick, the wind-up is stretched to the sim's ticks so the strike lands on the resolve, and
on a slow frame the strike runs no further than its contact while the warning is live. A
new champion spawns in; a jump in place re-plants the feet; a dying champion is never posed
again.

## The Level III champions (v0.5.351)

The Ashen Barrow's two champions, on the Level II champions' terms: each keeps its classic
rig's silhouette, colours (the classic's own constants and value steps of them) and its ONE
indigo tell, adds the standard's detail on top, walks on **locked feet** under its robe (the
classic Reeve glided on a cone; the Ringer shuffled), and keeps the classic beside it
(`?facet=0`), the champion table's soft flash and the presence layer's crown, sigil and
chest. Draw calls count every mesh, ink hull and sprite; instances are the parts in the
instanced rows.

| Champion | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Bone Reeve | `render/enemies/champfacet/bonereeve.js` | 100 (33) | 210 |
| Gravebell Ringer | `render/enemies/champfacet/gravebellringer.js` | 106 (50) | 202 |

- **Bone Reeve.** The barrow's bailiff: a faceted robe to the floor with nine torn rags
  round the hem swinging with the stride and seven fold wedges up the cloth, the belt and
  a pelvis over it; a spine of seven vertebrae with neural blades, five ribs a side in
  three faceted segments curving round to a lit sternum, a clavicle bar and two scapulae,
  lit cowl over the shoulders; a boxed skull with a lit crown, a hinged jaw and a row of
  six teeth under a faceted hood, the two indigo slit eyes and their glow; the bone lantern
  at the belt, a faceted cage of four bars round an indigo flame that gutters; the grave
  scythe, a ferruled pole with five bone knuckles up its length and a blade of eight
  faceted segments curving out to the tip with a lit edge, carried diagonally in both
  hands. It is a biped on `createLegs` under the robe (two bone feet show at the hem) and
  both arms reach their grips on the pole by two-bone IK, so both fists sit on the pole in
  every pose. *Reaping Sweep*: draw (the 54-tick cone warning less one strike: the scythe
  drawn back across the body to the right, the body twisted into it, the weight on the back
  foot), swing (2.5 frames, on the cone's tick: the blade carried flat across the front on
  a lead step, the body twisted the other way), held, recoil, settle. *Grave Lance*: raise
  (the 66-tick lane warning less one strike: the scythe raised high overhead, the body
  back), drive (2.5 frames, on the lane's tick: the blade driven down into the floor ahead
  on a long lead step, the knees deep), held, recoil, settle.
- **Gravebell Ringer.** The barrow's bell-ringer: a faceted shroud to the floor with nine
  rags and seven folds, the belt and a pelvis; the chest hunched forward from the hips
  (the classic's bow) carrying a spine of six vertebrae, four ribs a side in three
  segments, a faceted mantle with eight lit plates over the shoulders, a boxed skull with
  dark sockets under a faceted hood; the yoke on its back, a beam with four pegs, two
  posts each banded three times in iron, two braces, a crossbeam and a gable of two
  faceted slopes; the bell hung from the crossbeam on a pivot kept plumb against the
  hunch, a faceted bronze cup with a lit crown, a lip of ten plates, a crack of ink and six
  indigo runes, the indigo tongue (the tell) with its glow; the rope laid from the left
  fist up to the crossbeam's hitch each frame, the bone mallet in the right hand with a
  ferruled haft and a lit head that burns ember through the call. It is a biped on
  `createLegs` under the shroud, both arms on the same IK. The bell is a **damped
  pendulum** driven by the pose: the knell's heave rocks the body and swings it wide, the
  toll kicks it over, the walk sways it, and it stills again. *Death Knell*: heave (the
  78-tick ring warning less one strike: it hauls on the rope, the body rocking with the
  bell, the weight back), toll (2.5 frames, on the ring's tick: the rope yanked down, the
  bell crashed over, the body thrown forward), held, recoil, settle. *Grave Call*: lift
  (the 64-tick ring warning less one strike: the mallet raised high behind, the body
  back), slam (2.5 frames, on the ring's tick: the mallet struck into the floor ahead on a
  long lead step, its head at the floor), held, recoil, settle.

Both wind up the way the Level II champions do: a warning is known by its move and start
tick, the wind-up is stretched to the sim's ticks so the strike lands on the resolve, and
on a slow frame the strike runs no further than its contact while the warning is live. A
new champion spawns in; a jump in place re-plants the feet; a dying champion is never posed
again.

## The Level III bosses (v0.5.348)

The Ashen Barrow's two bosses, on the same terms as Levels I and II: each keeps its classic
rig's silhouette and colours (the classic's own constants and value steps of them), adds the
standard's detail on top, and keeps the classic beside it (`?facet=0`). The Barrow Wyrm,
the land's third boss, is the pilot's. The Lich Ram trots on four **locked hooves** in
diagonal pairs; the Ash Raven **hops**, both talons leaving and landing together, and only
leaves the floor for its dive.

| Boss | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Lich Ram | `render/boss/lichramfacet.js` | 69 (26) | 276 |
| Ash Raven | `render/boss/ashravenfacet.js` | 72 (68) | 252 |

- **Lich Ram.** The bone ram, a skeleton in the classic's old-bone and horn tones: a spine
  of ten vertebrae with neural blades laid along a curve, six ribs a side in three
  faceted segments each curving round to a sternum, a pelvis with iliac blades and a knob of tail bones, scapulae
  over the fore-legs, three neck bones laid each frame so the skull follows the pose, a
  boxed skull with a muzzle, a hinged jaw and two rows of teeth, hollow sockets with coals
  and the classic's violet eye glow, two spiral horns of fourteen bone segments a side with
  ridges and violet runes that burn while the guard holds and go dark when it is stuck;
  a violet heart in the ribs with its glow, knobs at every joint; four legs of two bones on
  locked hooves; the classic's shadow and a violet grave mist on the floor. *Bone Rush*:
  wind (the 54-tick lane warning less one strike: the head goes down, the horns level, the
  weight back, the left fore-hoof paws the floor twice), burst (2.5 frames on the resolve:
  the B9 lunge, the shove through the hips), run (held while the sim drives it down the
  lane at 11 u/s: a gallop on locked hooves, the stride long), slam (2.5 frames as the sim
  sticks it: the horns into the floor, squashed), held, stuck (the sim's 75-tick stand, the
  guard down: it sags on its horns, the runes dark), free (2.5
  frames as the stuck ends: it wrenches back out), settle. *Grave Call* (the sim gives no
  warning): gather (the last 30 ticks before the sim's next call, read ahead from its
  cooldown: the right fore-hoof lifts, the head goes up; a call the sim holds back waits at
  the top of the gather), stamp (2.5 frames on the call's tick: the hoof down, the jaw
  wide, the body squashed), held with a recoil, settle. *Enraged* (under 40 % HP): the heart
  beats faster, the eyes and the runes burn.
- **Ash Raven.** The great carrion bird in the classic's slate blue: a breast and a back of
  faceted icosahedra under a mantle of feather plates on a five-point spine, hackles of
  plumes and ash on the nape, breast plumes, a fan of tail quills with ash tips; wings as
  nested groups (fold, lift, roll) with a flat blade, eight secondaries, three quill and
  three ash primaries, a covert row and tips that trail ash; a neck of rings, a boxed skull
  with a bone mask, a two-part beak (the lower half gapes), cracks across the mask, hollow
  sockets with coals, the eye glow and a throat glow in the classic's violet; thighs,
  black shanks and four talons a foot; knots at the joints; the classic's shadow. *Carrion
  Dive*: rise (the 50-tick lane warning less the sim's 14-tick dive and one strike: it
  beats up into the air and hangs at 1.5 u, wings wide, the talons tucked), stoop (2.5
  frames as the sim's dive begins: it tips over, the wings swept), dive (held while the sim
  drives it down the lane: a skim at 0.45 u on swept wings), strike (2.5 frames on the
  resolve: it lands, both talons down, squashed), held with a recoil, preen (the sim's
  40-tick stand: it preens a wing), settle. *Wing Gust*: mantle (the 40-tick cone warning
  less one strike: it crouches, the hackles up, the wings raised wide), beat (2.5 frames on
  the hit: the wings thrown forward, the body dropping), held with a recoil, settle.
  *Omen*: call (the 84-tick ring warning less one strike: the wings go up and the head
  back, the beak opening wide), caw (2.5 frames on the hit: the head thrown up, the beak wide, the
  body squashed), held with a recoil, settle. *Enraged* (under 40 % HP): the hackles stay
  up, the eyes and throat burn.

Every warning is known by its attack and start tick (a co-op guest's fresh copies never
restart a wind-up), every wind-up is stretched to the sim's ticks so its strike lands on the
resolve, the facing eases to the lane while the Ram and the Raven wind up on one, and a
boss killed in its wind-up collapses in it. On a slow frame a strike may land ahead of the
resolve, but its contact holds until the warning is gone. The Grave Call is the first move
whose wind-up is read from a cooldown rather than a warning: the boss layer passes the sim
tick into `pose`, and the rig gathers over the 30 ticks before `nextGraveTick` and stamps
when that tick moves on (render only; the call fires when the sim says).

## The Level IV bosses (v0.5.353)

The Heart's three bosses, on the same terms as Level II: each keeps its classic rig's
silhouette and colours (the classic's own constants and value steps of them), adds the
standard's detail on top, and keeps the classic beside it (`?facet=0`). The Colossus
walks on four **locked feet** (its two fists and its two stubby legs) and the Vein Weaver
on eight; the Hollow Cantor has no feet, so it **floats**: its hem holds a hover of 0.32 u
over the floor, never touches it and never drags, and its lean comes from its own velocity.
The two unwarned throws (Geode Rain, Brood Sacs) have no telegraph, so the rig reads the
sim's next throw tick ahead (`e.nextRainTick`, `e.nextBroodTick`, with the `tick` the boss
layer now passes): it loads over the last 30 ticks before the throw and fires when the next
tick jumps past it, a 1.5-frame heave into a 2.5-frame strike.

| Boss | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Hollow Cantor | `render/boss/cantorfacet.js` | 54 (56) | 163 |
| Geode Colossus | `render/boss/colossusfacet.js` | 55 (60) | 95 |
| Vein Weaver | `render/boss/veinweaverfacet.js` | 75 (61) | 62 |

- **Hollow Cantor.** The hooded floater, deep plum over violet: a robe of nine pleat rings
  (ten plates each, bands every third ring), a row of torn tatters that moves with the
  sway, cowl plates over the shoulders, eight ribs in two rows and a sternum over a violet
  heart gem, hood plates, a mask with a mouth that opens to sing and lit eyes, a halo ring
  with seven floating notes (recoloured per verse) and seven runes, sleeves with cuff
  plates and three crystal fingers each, six motes drifting about it; the classic's violet
  pool on the floor. *Hollow Note*: draw (the 48-tick ring warning less one strike: the
  chest fills, the hands spread, the halo brightens), sing (2.5 frames on the hit: the
  mouth wide, the halo flung out, the robe squashed), held with a recoil, settle.
  *Sung Lance*: gather (the 54-tick lane warning less one strike: both hands crossed at
  the chest, the body turned square to the lane, leaned back), lance (2.5 frames on the
  resolve: the B9 lunge, both hands shoved down the lane), held with a recoil, settle.
  *Heart Pulse* (Third Verse): swell (the 60-tick ring warning less one strike: the chest
  and the halo swell, the sleeves lift), pulse (2.5 frames on the hit: the robe flares,
  the motes fly out), held, settle. *Echo Step* (an unwarned mode, no damage): fold (the
  sim's 18-tick fade: the robe folds in on itself and the hood drops into it), gone (the
  rig stays hidden while the sim moves it), rise (the spawn-in's seven frames at the far
  side: it grows back out of the floor), stand. *Verse* (each add phase): a flare of the
  halo and the heart with the notes recoloured for the verse, played over whatever the
  rig is doing unless a wind-up is live, in which case it waits for the settle.
- **Geode Colossus.** The hunched crystal brute, slate stone over a violet geode: a faceted
  torso under a saddle of plate rings, seven glass spires and twelve crust crystals on the
  back (the classic's glass, emissive), seven cracks of violet light that widen with the
  rage, a geode cavity in the chest with nine lining wedges round a heart and its glow, a
  tapered head with brows and lit eyes, two fists with three studs and four knuckle plates
  each, pads on the stubby hind legs. It walks on its fists like a gorilla: the fists hang
  from the shoulders in body space, the legs from the hips, all four on locked feet, so a
  heave or a rear leaves the planted ones where they are until the weight shifts.
  *Fissure*: raise (the 54-tick lane warning less one strike: the right fist lifts high
  and forward, the body rears, turned square to the lane), slam (2.5 frames on the
  resolve: the fist drives into the floor at the lane's mouth, the body crouches, the
  cracks flare), held with a recoil, settle (the fist steps home one foot at a time).
  *Geode Rain* (unwarned): load (the last 30 ticks before the throw: both fists come up to
  the chest and the geode glows), heave (1.5 frames), hurl (2.5 frames on the throw: both
  fists flung up and out, the body up on its legs), held, settle. *Geode Burst*: swell (the
  60-tick ring warning less one strike: the body crouches wide, the geode and every spire
  swell), burst (2.5 frames on the hit: the chest thrown open, the body flung up), held,
  spent (the sim's 80-tick stand: it slumps on its fists, the geode dark, the head down),
  recover. *Enraged* (under 40 % HP): the cracks widen and burn, the eyes and the geode
  flare.
- **Vein Weaver.** The crystal-backed spider, dark plum legs under a violet crystal
  abdomen: a faceted thorax of plates, a crystal abdomen with a crown of spires grown out
  of its back and three spinnerets at its tip, six faceted gem eyes under a brow plate, two
  hooked fangs on dark bases; eight legs in
  four pairs on locked feet, each with a crystal cap on the knee and a crystal tip on the
  foot, the poles set out and up so each knee bends the way a spider's does; a thread of
  fourteen strands on a bezier from the spinneret over the head down the lane, with the
  anchor gem at its end. *Bind*: spin (the 44-tick lane warning less one strike: the
  abdomen lifts and swells, the front legs raise, turned square to the lane), cast (2.5
  frames on the resolve: the thread shot to the lane's length, the body lunged), held with
  a recoil, draw (while a hero is bound: the thread stays taut and the rig braces back on
  its hind legs), settle. *Heartbeat Slam*: rear (the 60-tick ring warning less one
  strike: it rears on its hind pairs, the front legs high and wide, the fangs bared), slam
  (2.5 frames on the hit: every leg driven flat, the body squashed to the floor), held
  with a recoil, settle. *Brood Sacs* (unwarned): load (the last 30 ticks before the
  throw: the abdomen swells and lifts), heave (1.5 frames), lob (2.5 frames on the throw:
  the abdomen flicks up, the sacs flung), held, settle. *Enraged* (under 40 % HP): the
  eyes and the abdomen's crystal burn, the fangs stay bared.

Every warning is known by its attack and start tick (a co-op guest's fresh copies never
restart a wind-up), every wind-up is stretched to the sim's ticks so its strike lands on the
resolve, the facing eases to the lane while the Cantor, the Colossus and the Weaver wind up
on one, and a boss killed in its wind-up collapses in it. On a slow frame a strike may land
ahead of the resolve, but its contact holds until the warning is gone. The Cantor's Echo
Step moves it across the room: that jump is a step, not a new boss, so it rises where it
lands instead of spawning in. The Level V bosses (the Hush, the Skyhorn, the Hourwarden)
stay classic.

## The Level IV champions (v0.5.354)

The Hollow Heart's two champions, on the same terms as the Level II pair: each keeps its
classic rig's silhouette and colours (the classic's own constants and value steps of them),
adds the standard's detail on top, and keeps the classic beside it (`?facet=0`). Neither
has feet. The Hollow Choir **floats** (the Hollow Cantor's rule): its hems hold a hover of
0.55 u over the floor with a slow breath, never touch it and never drag, a strike is a lean
and a reach off the hover, and the lean comes from its own velocity. The Vein Matron
**glides on her roots** (the legless rule: the base stays planted): the root tips rest on
the floor and ripple with the travel, the skirt never lifts off it except the pulse's
heave, and she leans into her travel from her own velocity.

| Champion | File | Draw calls (classic) | Instances |
|---|---|---|---|
| Hollow Choir | `render/enemies/champfacet/hollowchoir.js` | 87 (38) | 103 |
| Vein Matron | `render/enemies/champfacet/veinmatron.js` | 80 (86) | 109 |

- **Hollow Choir.** Three choristers in bone-violet gowns back to back round the heart: a
  faceted gown of six pleat plates and six shaded folds on each, four torn tatters off its
  hem swinging with the hover, a cowl of four hood plates over a boxed skull, a lit mouth,
  slit eyes, two arms of faceted segments ending in three crystal fingers each; the heart a
  faceted violet gem in a cage of six bone ribs, the indigo tell behind it; the halo as
  seven faceted crystals between seven runes on a thin ring; five motes drifting round the
  whole. At rest the three turn slowly about the heart. *Shard Hymn*: gather (the 60-tick
  cone warning less one strike: the three turn to face the lane together, the lead centred
  and the two fanned beside it, the mouths open, the arms up, the heart swelling), sing
  (2.5 frames on the resolve: the heads thrust forward, the mouths wide, the halo flung
  up), held with a recoil, settle. *Discord*: swell (the 72-tick ring warning less one
  strike: the three drift out from the heart, which swells, the halo widening), burst (2.5
  frames on the resolve: the three flung out wide and tipped down, the heart flaring),
  held with a recoil, settle (they drift back in). *Raged* (under half HP): the heart
  beats faster, the tell burns.
- **Vein Matron.** The tall crystal matriarch on her skirt of nine faceted vein-roots,
  each with a lit vein row down its back and a crystal knuckle at its bend; a ring of hip
  plates; a faceted waist with lit plates over its crown and a collar of six bone plates;
  three crystal breast plates over a lining of lit wedges, the heart lit through the
  split; a faceted skull under a veil of plates, the third eye's indigo tell, two lit
  eyes, the crown's seven faceted spines with six small crystals between; two whips of ten
  faceted tapering segments off the shoulders, laid link by link along a chain that coils
  as it hangs, five lit vein beads along each and a gem at each tip. *Vein Lash*: draw
  (the 58-tick lane warning less one strike: the right whip drawn back over the shoulder,
  the torso twisted away, the hips sunk into the roots), crack (2.5 frames on the resolve:
  the whip shot straight down the lane to the warning's length, the torso twisted into
  it), held, drink (the heart flares and the beads and root veins run with light as she
  drinks), settle. *Heart Pulse*: swell (the 70-tick ring warning less one strike: she
  rears back, the roots tip up off the floor, the heart and the crown swell, both whips
  raised), beat (2.5 frames on the resolve: the body drops, the roots slam flat, the heart
  flares, the whips flung out wide), held with a recoil, settle. *Raged*: the heart races,
  the tell burns.

Both wind up the way the Level II champions do: a warning is known by its move and start
tick (a fresh copy every tick, a co-op guest's snapshot, never restarts it), stretched over
the sim's ticks so the strike lands on the resolve, and on a slow frame the strike holds at
its contact while the warning is live. The Level III and Level V champions stay classic.

## The Level I foes (`src/render/enemies/facet/`, v0.5.338)

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

The foe kit (`render/facet/foe.js`, `render/facet/foelegs.js`, beside the bosses' `legs.js`):

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

## The Level II foes (`src/render/enemies/facet/`, v0.5.346)

Every creature Level II rolls that Level I had not built (its roster's toad, moth, snail,
crab and lamprey, its campaign roster's leech and miller) plays the standard, on the same
foe kit and rules as the Level I foes: baked detail for the crowd, world-locked feet, the
sim's clock as the anticipation, the classic rig kept behind `?facet=0`, visual only. One
kit piece is new:

| Piece | What it gives |
|---|---|
| `createStrikeClip`, `strikeTimeline`, `strikePoseAt`, `strikeAbility` (`render/facet/foestrike.js`) | The wasp's telegraphed dart made generic, for any foe whose attack is one telegraphed blow. A rig hands it each frame's watch beat and the sim's own word that the strike is under way (`holding`: a dive or lunge mode; `fired`: a new strike tick) plus `{ coil, strike, over }` poses per blow. The coil samples on the shown tick, the strike takes the last 2.5 frames and lands its contact on the release frame (B1, B2), the contact holds while the sim keeps the mode and 3 frames at least, then the snap back and the settle with one overshoot (B5). A cancel takes back a strike already begun; a strike begun with no wind-up seen snaps in within a frame (an unwarned throw). `strikeAbility` builds the lab's pure timelines (one blow, or an n-blow string cycling the variants) and the classic twin's inputs. |

The probe adds a crown check: every ability pose of every foe stays under its elite crown
(`CROWN_Y`), measured on the drawn vertices.

### The seven foes

| Foe | Attack (lab tab) | In game | Calls (faceted / classic) |
|---|---|---|---|
| Mire Toad | Lob; Lob string | The sim's lob is unwarned (`throwTick`, cooldown 204), so the gather is read ahead from `nextAttackTick`: over the last 30 ticks the toad crouches, tucks its chin and fills its sac, and stays loaded until the sim throws; on the throw tick it snaps in within a frame (reared, the head thrown up, the jaw wide, the sac emptied), the shooter squash held 3 frames with a recoil shove (B3). Four webbed feet locked to the floor in diagonal pairs (folded hind legs, short fore legs). Lobs cycle flung from its left, from its right, the heave (B6). | 14 / 27 |
| Gloam Moth | Swoop; Swoop string | A flier: the 45-tick lane is the coil (risen, nose up, wings high, beating hard); the strike's contact lands on the release frame (dropped, nose down, wings swept flat, the abdomen curled) and holds while the sim's mode is `'swoop'`; then the pull-up. The wasp's flyer's lean from the real travel (rule 1). Solid faceted wing plates (fore and hind coupled) with the eyespot on both faces; the wings' V stays under the crown (1.75) in every phase. Swoops cycle banked from its left, from its right, the plunge. | 9 / 25 |
| Lantern Snail | Mend; Mend string | The 30-tick mend wind-up (`mendStartTick` to `mendTick`) is the coil: the lantern swells and brightens, the stalk cranes; the pulse lands on the mend tick with the floor ring sweeping out. A creep: a muscle wave down the foot from the real travel, the shell rocking against it. Variants swing the lantern to its left, to its right, then rear up. | 11 / 13 |
| Weir Crab | Snap; Snap string | The 42-tick cone is the coil; the contact lands on the resolve tick (`snapTick`), the dactyls slammed shut on the first frame (B4), a recoil shove after the hold (B3). Six jointed legs in two tripods on locked feet, stepping sideways along the real scuttle; the two claws as IK arms (merus, carpus, palm, hinged dactyl), the big claw half again the small one. The guard down (`e.guard.active` false for 45 ticks after a snap) lowers both claws: the archers' window reads from the model. Snaps cycle the big claw hooking in, the small claw's jab, the scissor slam off a hop (B6). | 13 / 17 |
| Bog Lamprey | Lunge; Lunge string; Beached | Lurking (`burrowed`) it is sunk under the floor with only the ripple (a floor piece); it surfaces as the sim breaks it out (`rise`). The 48-tick lane is the coil (the body bunched into an S, the head reared and cocked, the disc gaping); the contact lands on the release frame and holds while the mode is `'lunge'` (thrown out straight, stretched, a fast tail beat). Beached: rolled onto its side, thrashing, gasping, until it slides back under. Six rings on one instanced row swimming an S-wave at the real travel; the oral disc (lip ring, raked teeth, dark throat) baked. Lunges cycle coiled to its left, to its right, the strike from on high. | 7 / 18 |
| Mire Leech | Leap; Leap string; Latched (drains); Flopped | The 42-tick lane is the coil (the front three rings reared, the body bunched, the sucker gaping); the contact lands on the release frame and holds while the mode is `'leap'`. Latched: stood up against the host with the sucker pressed in, and a gulp swells down the body on every drain (the sim's `nextDrainTick` moving on). Flopped: rolled on its side, writhing. A creep: a hump runs tail to head at the real travel. Leaps cycle reared to its left, to its right, the high leap. | 7 / 39 |
| Drowned Miller | Flail sweep; Sweep string; Sack toss; Toss string | The 60-tick ring (`whirl`) is the coil: feet planted, the stone spun up round the raised hand through two whole turns, accelerating, the body wound against it; the sweep lands on the resolve tick (`sweepTick`) and holds 3 frames; then the stone swings on round and comes to hang. Kesh's 3-hit flow: the flat whirl swept to his right, the reverse low to his left, then the overhead slam into the floor in front (hips sunk, body thrown into it). The sack toss is unwarned (`tossTick`): one frame into the throw, held, the follow-through; overarm, side-arm, the heave. Two long legs on locked feet (a heavy plod), both arms by IK from the shoulders (rule 3), the chain of seven links taut from the hand to the stone (`STONE_R` 0.22 u, a size over the classic's), rolling as it flies. | 16 / 42 |

Three attacks had no sound of their own in the game (the crab's snap, the lamprey's
lunge, the snail's mend played only their hit or VFX). Kesh's fix-first pick gave each a
cue in `audio/woodmillcues.js` on the sim's own event, listen-only like the rest of the
file: `wm_snap` on `crab_snap` (a hard shell click and a clack), `wm_lunge` on
`lamprey_lunge` (a wet surge out of the bog and a hiss), `wm_mend` on `snail_mend` (a soft
rising lantern chime), measured with `tools/smallfixes2-cuecal.mjs`; the lab's tabs play
them. His other pick: the miller's millstone a size larger than the classic's (rim radius
`STONE_R` 0.22 u against 0.17; the chain's end and the floor clamp follow it), since it
read small at play zoom.

## The Level III foes (`src/render/enemies/facet/`, v0.5.349)

Every creature Level III (the Ashen Barrow) rolls that Levels I and II had not built (its
roster's ram, mole, crow, brood spider, grave wisp, bone knight, keener and sexton, and
the brood's broodling, which the room rolls with its mother) plays the standard, on the
same foe kit and rules as the earlier levels: baked detail for the crowd, world-locked
feet, the sim's clock as the anticipation, the classic rig (`enemies/archetypes.js`,
`enemies/slice2.js`, `enemies/barrowheart.js`) kept behind `?facet=0`, visual only. No
kit piece is new: the ram, the crow, the knight and the keener are on the strike clip,
the brood and broodling on the bite chain (the boar's), the mole, the wisp and the sexton
on pure timelines, and the fliers (the wisp, the gliding keener) take the moth's lean
from the real travel.

### The nine foes

| Foe | Attack (lab tab) | In game | Calls (faceted / classic) |
|---|---|---|---|
| Barrow Ram | Horn slam; Slam string | The 60-tick cone is the coil; the contact lands on the resolve tick (`enemy_slam`) and holds 3 frames with a recoil shove. Four hooves on locked feet in diagonal pairs; the front pair steps in for the strike by its contact and back out as it settles. The horns curl from a riveted ten-sided disc that is its guard, with the indigo rim unlit; the guard's glow flares on every blocked shot (`lastBlockedTick`). Slams cycle the hook from its right, the reverse hook, the heave (a low gather and an upward throw, so the horns stay under the crown). | 14 / 29 |
| Grave Mole | Emergence; Emergence string; Dig in | Burrowed, it is sunk under the floor with only its mound (a floor piece that churns with the tunnelling); the 60-tick ring is the coil (the mound heaves and quakes, the mole under); the burst lands on the resolve tick (up out of the earth, claws spread), holds 3 frames and lands on its feet. The dig back in plays when the sim takes it under (nose down, the claws rake in turn, the body sinks). Four legs on locked feet (big fore paws with baked claws, hind feet). Bursts cycle one claw raking up, the other, both claws off a leap. | 19 / 28 |
| Barrow Crow | Caw; Caw string | The 45-tick cone is the coil (the head drawn back, the beak wide, the wings raised); the volley lands on the resolve tick (`fireTick`) with the shooter squash held. A hop on both feet (one gait group) along the real travel; instanced wing plates composed on the body; charcoal bones and feet. Caws cycle fanned to its left, to its right, the full fan. | 17 / 17 |
| Brood Spider | Bite chain | The bite is unwarned (contact, a per-target cooldown of 60 ticks): on the kit's 3-hit chain a predicted bite's contact lands on the sim's bite tick, an unwarned one strikes quick; the front legs step in by the contact. Eight legs on locked tips by two-bone IK with the knee arched high, stepping in two alternating tetrapods along the real skitter. The abdomen with its bristle and pale underside, the slit eyes, the fanged chelicerae; the hourglass unlit on its own row. Bites cycle the right fang, the left fang, the pounce (reared on its back legs with the front pair raised, down on the target off a hop). | 12 / 25 |
| Broodling | Bite chain | The brood's rig at half its size with the dot tell and the sim's 45-tick cooldown; a bigger knock. | 12 / 24 |
| Grave Wisp | Ward; Tether snaps | A flier with no attack: the hover rides the spawn node (the moth's), the tail streams back along the real travel and two hem ribbons sway behind it. The ward is unwarned (`wisp_tether`): the hood draws in and the core gathers over a frame, then the hood flares, the sleeves fling wide and the body lurches at its ward with the core burst; while the tether holds the core stays swollen; when it ends (`wisp_tether_end`) the hood snaps shut and the wisp recoils. The slit eyes are baked into the hood's row at a black tone, the sleeves an unlit dark row, so the calls match the classic's seven. | 7 / 7 |
| Bone Knight | Overhead slam; Slam string | The 66-tick ring is the coil (the guard down: the shield swings out to its left and the body turns open, from the sim's `e.guard.active`); the blow lands on the resolve tick (`slamTick`) and holds 3 frames; the guard stays down through the settle and the sim's 50 ticks. Two bone legs on locked feet in a heavy march; both arms by IK from the shoulders, the tower shield and the sword hung off real elbows. The helm rides the torso's row (the classic's never turned), the visor slit unlit with its glow. Slams cycle the cleave (the blade laid back over its right shoulder, brought down before it), the cross cut (wound low to its left, swept across), the two-handed drive (the shield flung wide, the point driven into the floor with the whole body falling on it). Always Elite; every pose under the crown. | 13 / 14 |
| Ash Keener | Wail; Wail string | The 54-tick cone is the coil (the keen); the wail lands on the resolve tick (`wailTick`) and holds with a shudder. It glides (no feet): the robe takes the moth's lean, the hem trails the glide. The head on its own row so the hood throws back; the mouth an unlit indigo hollow that swells through the keen and peaks on the wail. Wails cycle the keen (hood back, head up, arms spread; thrown forward), the lament from its left (turned, one arm high; whipped round), the dirge (sunk low, arms crossed over the mask; hurled forward with the robe flaring widest). | 9 / 18 |
| Barrow Sexton | Dig a snare; Dig string | The sim's 36-tick dig (mode `'dig'`) is a pure timeline: down on a knee, the spade off the shoulder, chop 1 from its right, chop 2 from its left, chop 3 the two-handed stamp, then the bury: the spade's flat pats the earth on the dig tick (`digTick`, the contact) and holds; then up with the spade shouldered. A dig spoiled by a stun rises at once, nothing patted. Two bowed legs on locked feet in a short shuffle; the spade and the lantern off IK arms; the lantern hangs plumb and swings with the walk, its flame flaring through the dig. | 15 / 27 |

Three Barrow beats had no sound of their own (the knight's slam, the wisp's tether and
the brood's split played only their VFX). Each has a cue in `audio/barrowheartcues.js` on
the sim's own event, listen-only like the rest of the file: `bh_slam` on `knight_slam`
(iron on grave earth), `bh_ward` on `wisp_tether` (a thin rising hum and a chime, at the
wisp), `bh_split` on `brood_split` (a wet pop and a chitter), measured with
`tools/smallfixes2-cuecal.mjs --only barrowheartcues` (the older entries restored by hand:
a `--write` re-measures the whole file); the lab's tabs play them.

## The Level IV foes (`src/render/enemies/facet/`, v0.5.350)

Every creature the Hollow Heart rolls that no earlier level built (its roster's husk,
lancer, geode and censer, its campaign roster's bloom and siphon; the crow, the brood, the
gravewisp and the knight belong to the Level III slice, the moth to Level II) plays the
standard, on the same foe kit and rules as the Level I and Level II foes: baked detail for
the crowd, world-locked feet, the sim's clock as the anticipation, the classic rig kept
behind `?facet=0`, visual only. One kit piece is new:

| Piece | What it gives |
|---|---|
| `heartfoe.js` (`render/enemies/facet/`) | The Heart's shared look: the vein material and `veinColor(k)` (dim, vein, hot across the heartbeat's `heartbeatK`), `heartGlow` sprites, `crystalMaterial` (the Heart's crystal with an emissive the rig drives), the `TINT` table over the `HEART` palette (ash, flesh, bone, cloth, stone, crystal, cavity), and the small matrix helpers (`M`, `qa`, `qTo`, `rodM`). Every one of the six keeps Violet for corruption and never touches Ember or Bright Heal. |

Two of the six have no feet: the Bone Censer hangs from a chain and the Vein Siphon
floats, so both lean from the real travel (rule 1) like the moth and the wasp, and the
censer's chain hangs above the elite crown as the classic's does (the crown check leaves
the chain out). The Vein Bloom's roots are its feet: seven locked feet it drags on the creep
and sinks on the root.

### The six foes

| Foe | Attack (lab tab) | In game | Calls (faceted / classic) |
|---|---|---|---|
| Hollow Husk | Bite chain; Heartbeat | A skeleton hunched over an open ribcage with the Heart's own heart throbbing inside it, veins down the bones in the heartbeat's colour. The contact bite is unwarned (`biteTick`, a cooldown per target), so the chain predicts it from `cdByTarget` and lands each bite inside the B1 budget; Kesh's 3-hit flow: the claw swipe, the backhand claw, the double rake (both claws driven down, the biggest shove, B6). The heartbeat's surge (mode `'surge'`) drops the hunch deeper and lengthens the stride. Two legs and two arms on IK from the hips and shoulders, feet locked. | 16 / 18 |
| Bone Lancer | Lance; Lance string | The 54-tick lane (mode `'aim'`) is the coil: the spear drawn back over the shoulder, the body wound, the off hand sighting along the lane; the throw lands on the resolve tick (`lanceTick`), the spear gone from the hand within 0.12 s and grown back by 0.62 s (`spearReform`), its tip glowing as it fills. Throws cycle over the shoulder, side-arm, the plunge (both hands high). Two long legs on locked feet. | 15 / 23 |
| Vein Geode | Slam; Slam string | A four-legged crystal brute: the 60-tick ring (mode `'slam'`) is the coil with one fist raised high off the floor (that foot reports unplanted while it is up), the back spires flaring; the slam lands on the resolve tick (`slamTick`), the fist driven into the floor ahead, and the hand is released back to its home when the lift ends. Slams cycle the left fist, the right fist, both fists off a reared pitch (B6). Hind feet and fore fists on `createLegs` in diagonal pairs. | 15 / 19 |
| Bone Censer | Gather; Spill | A hanging censer on a chain (`CHAIN_TOP` 2.35 u, the chain baked with the part ink): the pendulum trails the real travel. The 48-tick gather (mode `'gather'`, `gatherUntil`) is the coil: the coals flare, the rose halo spins up and widens; the mend lands on `mendTick` with the halo burst and a blink after. A stun inside the gather spills: the coals dim, the pot drops and swings wide, the mend never fires (`censerSpillPose`). | 8 / 9 |
| Vein Bloom | Pulse; Pulse string; Root | A corruption flower on seven root-feet. The 54-tick ring (mode `'rooted'`) is the coil: the roots sink and spread, the petals open from their hinges in the Heart's crystal; the pulse lands on `pulseTick` with the petals snapped shut and the knot jolted. Pulses cycle splayed to its left, to its right, the full bloom (B6). The root (`rootTick`) drives the knot down and the roots out; the creep drags the roots as locked feet. The base never leaves the floor. | 10 / 19 |
| Vein Siphon | Lash; Lash string; Drink | A floating sac (`SAC_Y` 1.15 u) netted in veins, four hanging tendrils laid as instanced segments. The 54-tick lane (mode `'cast'`) is the coil: the tendrils drawn back and the mouth gaping; the lash lands on `castTick` with the tendrils whipped forward. Lashes cycle from its left, from its right, the plunge (B6). Drinking (mode `'drink'`) reaches the tendrils onto the host and gulps on every drain (`nextDrainTick` moving on). | 8 / 19 |

Every attack already had a cue in the game (`audio/heartcues.js`: `hx_surge`, `hx_lance`,
`hx_slam`, `hx_gather`, `hx_mend`, `hx_spill`; `audio/barrowheartcues.js`: `bh_open`,
`bh_pulse`, `bh_lash`, `bh_drink`); the lab's tabs play them on the same cue names.

## Integration

- `render/boss/index.js` and `ui/story/viewerrigs.js` build `buildWyrmFacet`,
  `buildStagFacet`, `buildThornmotherFacet`, `buildGloamWolfFacet`, `buildHeronFacet`,
  `buildMillwheelFacet`, `buildMireKingFacet`, `buildLichramFacet`, `buildAshRavenFacet`,
  `buildCantorFacet`, `buildColossusFacet` and `buildVeinWeaverFacet` when their flag is on;
  the boss layer passes each rig the sim's `tick` too, which the Ram reads for its Grave
  Call and the Level IV rigs for their unwarned throws;
  each keeps the classic rig's interface (`group`, `mats`, `setYaw`, `setFlash`, `pose`)
  and adds `lab`, `points` and `react`. The boss rigs are pooled: a rig posed for a new
  boss (a new entity id, or a clock that went back) resets its timelines and spawns in; a
  jump in place (a new room, a hitch mid-charge) only re-plants the feet. A dying rig (posed
  with no entity) collapses in the pose it died in: no wind-up runs on into its strike.
- `render/enemies/champions.js` builds `buildBriarKnightFacet`, `buildMossHartFacet`,
  `buildSluiceWardenFacet`, `buildLockkeeperFacet`, `buildBoneReeveFacet`, `buildGravebellRingerFacet`, `buildHollowChoirFacet` and `buildVeinMatronFacet` in the champion table when their flag is on, so the enemy layer, the prewarm and the Journal
  viewer all take them; the enemy layer wraps the rig's first child in its hit-react node
  and lifts the hit flash on its `mats` as for any champion.
- The boss prewarm (`render/warmup.js`) parks each rig unculled for a few frames, then gives
  every part its own culling flag back, so the moving instanced parts stay unculled.
- The Journal viewer frames a model by its instanced parts' real instances (`ui/story/viewer.js`).
- `critters/index.js` builds each registered hero's faceted twin when `facetOn(id)`. The
  rig's `apply` receives the driver's clip name; a rig with `hold` holds its whole update
  through a hitstop. The critter API gains `cue(kind, ev)`, `comboHitOf(ev)`,
  `pointWorld(name)`, `releaseWorld(out)`, `lab` and `modelStandard`; the classic rigs
  ignore them (the classic Healer's staff gem still answers `pointWorld('tip')` and
  `releaseWorld` as drawn).
- The dash afterimages ghost a rig's instanced parts as instanced clones of the part's
  instances at each spawn.
- The cues come from the game's own events: `render/allies/index.js` forwards `ally_basic`
  and `ally_cast` to the seat's rig, each `hit` to the rig that struck it (`connect`), each
  `hitstop` to every model-standard rig and `room_enter` as `spawn`; `scenes/arena.js` does
  the same for the player's Healer (`basic_fire`, `skill_cast`, her hits, `hitstop`,
  `room_enter`); the camp forwards the seat casts.
- The Level I foes: `render/enemies/index.js` and `ui/story/viewerrigs.js` (the Journal)
  lay `facetFoeBuilders()` (`render/enemies/facet/index.js`) over their classic builders, one
  kind per `MODEL_STANDARD` flag; the layer feeds each rig what it feeds a classic one. A
  baked crowd geometry is marked shared, so `releaseTree` keeps it, and an instanced row now
  disposes its own instance buffers there (`render/geocache.js`). `addPartInk` in
  `critters/common.js` gives a baked detail row the thinner part ink. The Level II and
  Level IV foes join the same table: a floating rig (the censer, the siphon) carries its
  hover height on its spawn node, since the hit-react node measures the body on the rig's
  first, still-collapsed frame.
- The classic rigs (`boss/wyrm.js`, `boss/stag.js`, `boss/slice2.js`, `boss/third.js`,
  `critters/tank.js`, `healer.js`, `swordsman.js`, `archer.js`, `tidecaller.js`, `bellwright.js`, `enemies/boar.js`, `enemies/mantis.js`,
  `enemies/archetypes.js`, `enemies/woodmill.js`, `enemies/slice2.js`, `enemies/barrowheart.js`) are untouched and stay beside them.
- The hit reaction and the render hold (v0.5.333, `docs/HIT_FEEDBACK.md` "The hit and the
  kill") need nothing from a rig: the foe and boss layers wrap its `body` (else
  `group.children[0]`) in a `hit-react` node and squash that, and every layer poses a rig
  with the held clock (`renderHold.time(t)`, `renderHold.rigDt(dt)`), so a rig's own clip
  freezes on the hit frame. A rig whose body must not bend gets a rope or coil entry in
  `src/render/react.js`. The model-standard heroes are the exception: they take the raw
  frame dt (`arena.js`, `allies/index.js`) because they hold themselves on the `hitstop`
  cue, the attacker at its own contact (B2); the render hold on top would freeze the
  attacker at the press and hold twice.

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

The Level I bosses are lab entries (`scenes/modellab-bosses.js`): each builds its model and
its classic twin on first view and drives both (the Stag: Antler Quake, Trample; the
Thornmother: Seed Volley, Briar Charge; the Gloam Wolf: Pounce, Rend, Moon Howl, Enraged;
every model, the Wyrm too, a Spawn in tab). The Level II bosses follow (the Drowned Heron:
Bill Spear, Wingbeat, Submerge, Surface; the Millwheel: Cog Shards, Crosscut; the Mire
King: Tongue Lash, Belly Flop, Swallow, Enraged); the Bill Spear dashes across the frame at
11 u/s, the Crosscut rolls across it at 9 u/s and the Belly Flop leaps across it, and
`tools/model-standard-level2-shots.mjs` shoots them in the lab and in the game. The Level III
bosses follow (the Lich Ram: Bone Rush, Grave Call, Enraged; the Ash Raven: Carrion Dive,
Wing Gust, Omen, Enraged); the Bone Rush gallops across the frame at 11 u/s and the Carrion
Dive skims across it, and `tools/model-standard-level3-shots.mjs` shoots them. The Level IV
bosses follow (`scenes/modellab-level4.js`: the Hollow Cantor: Hollow Note, Sung Lance,
Heart Pulse, Echo Step, which folds away and rises 4 u across the frame, Verse; the Geode
Colossus: Fissure, Geode Rain, Geode Burst, Enraged; the Vein Weaver: Bind, Heartbeat Slam,
Brood Sacs, Enraged); `tools/model-standard-level4-shots.mjs` shoots them in the lab and in
their Heart rooms. The Trample, the Briar Charge and the Pounce
travel as they do in the game, so the gallop and the bound can be judged on locked feet.
Still from a playing ability freezes that moment with the feet where the motion left them;
a scrub re-plants them on the scrubbed pose's stance. An ability id the model does not have
falls back to its first ability. `fixedDt` (s) makes every drawn frame advance
the lab by that step, so a probe on a slow software-GL machine sees 60 Hz motion
(`tools/model-standard-level1-shots.mjs` uses 1/60).

The Level I champions are lab entries too (`scenes/modellab-champions.js`, the same shape):
the Briar Knight (Bramble Charge, which crosses the frame at the sim's 9 u/s, Thorn Ring)
and the Moss Hart (Antler Toss, Hart's Leap, which bounds across the frame), each with a
Spawn in tab and its classic twin beside. The Level II champions follow in the same file:
the Sluice Warden (Floodgate, Undertow) and the Lockkeeper (Chain Hook, whose key flies
down a lab lane of `LAB_HOOK` 5 u and reels back, Lock Turn), then the Level III champions:
the Bone Reeve (Reaping Sweep, Grave Lance) and the Gravebell Ringer (Death Knell, Grave
Call), shot by `tools/model-standard-level3-champions-shots.mjs` in the lab and in their
Barrow crown rooms. The Level IV champions have
their own file (`scenes/modellab-champions-level4.js`): the Hollow Choir (Shard Hymn,
Discord) and the Vein Matron (Vein Lash, whose whip cracks down a lab lane of `LAB_LASH`
5 u, Heart Pulse); `tools/model-standard-level4-champions-shots.mjs` shoots both in the lab
and in their Heart crown rooms, faceted and with `?facet=0`.
The Level I foes bring their own tabs (`scenes/modellab-foes.js`, entries the lab sets
before the Effect kit): each foe's framing, its game speed on the Move loop (forward for
half a lap, then a sidestep and a backpedal facing the middle), its abilities on their
timelines with the game's own sound per cue, and Classic beside with the classic rig fed
stand-in inputs at the same moment. Each replay hands the classic's one-shot clip fields
(`biteTick`, `shriekTick`, `lashTick`) fresh ticks, so the classic plays its clip every lap.
URL: `?modellab=1&model=boar&mode=ability&ability=gore&view=play&classic=1`. The Level II
and Level IV foes add their tabs to the same file (the Level IV six: Hollow Husk, Bone
Lancer, Vein Geode, Bone Censer, Vein Bloom, Vein Siphon), each with the game's own Heart
cues on its beats.

## Adding a model to the standard

1. Build it with the kit: faceted parts (`facetize` + `facetMaterial`), repeated detail on
   `InstancedMesh` with `addInstancedInk`, the same rig interface as its classic twin.
2. Give each ability a timeline with named phases; drive it from the sim's telegraphs and
   modes in game, from the playhead in the lab.
3. Heroes and biped foes get the 3-hit combo template; run the self-check (root motion
   matches the legs, planted feet locked until the weight shifts, hips and legs drive each
   swing; a legless body keeps its base planted). Meet the §6.1 [M] rules.
4. A hero: build it on the hero core, export its SPEC and list it in `heroes.js`; that
   gives it the lab tab and the heroes probe. Add it to `MODEL_STANDARD`.
5. A boss or a foe: play the [M] beats (`beats.js`): wind-ups on the telegraphs, 2.5-frame
   strikes into a held contact, a kick, a settle with one overshoot, the spawn-in, named
   points, and a `react` tuning for the shared hit envelope; keep floor pieces off the
   root's first child. Legged models stand on `createLegs` (locked feet); give each leg a
   pole that bends the way the animal's joint does. Add it to `MODEL_STANDARD`, a lab entry
   (`scenes/modellab-bosses.js` for a boss, `scenes/modellab-champions.js` for a champion),
   and checks in a probe
   (`tools/model-standard-level1-probe.mjs` shows the pattern).
6. Shoot it in the lab and at play zoom in a busy fight beside its classic twin
   (`tools/model-standard-heroes-shots.mjs` shoots the heroes' fight faceted and with `?facet=0`).

## Probes

`node tools/model-standard-level3-probe.mjs` (in `npm test`) holds the Level III bosses to
the same rules (the flags, the Level IV bosses still classic; the rig, the colours with the
amber family banned, the beats, the rush's pull-back and drive; the Ram's four locked
hooves through a trot with a turn, a rest and a spin, stepping in diagonal pairs; the
Raven's hop with both talons leaving and landing together), and to their own moves driven
by a sim entity: the rush's lane wind-up with the pawing hoof, the 11 u/s gallop, the slam,
the stuck with the guard down and the wrench free; the call's gather read ahead from
`nextGraveTick`, nothing earlier, the stamp on the call's tick, a held-back call waiting at
the top; the dive's rise, the stoop as the sim dives, the skim, the landing on the resolve
and the preen; the gust's mantle and beat; the omen's call and caw; the rage; the strikes
on the sim's hit, a co-op guest's fresh copies, a boss killed in its wind-up, a hitch; the
spawn-in, the pooled rig, the turntable; the lab entries.

`node tools/model-standard-level2-probe.mjs` (in `npm test`) holds the Level II bosses to
the rules: the flags (the Level IV bosses still classic) and the classic rigs; the classic
interface plus `lab`, `points` and `react`, floor pieces beside the body, every part inked
and faceted, named points, no reserved colour; strikes of 2.5 frames into a held contact,
off on the first frame, one overshoot in each settle, a recoil on every hit, the lash's
lunge; the Heron's and the Mire King's locked feet through a walk with a turn, a rest and a
spin in place; the Millwheel's roll at 2.4 u/s with the planted tip held (and held along
the roll through a turn, where it only pivots), stepping from paddle to paddle with the hub
rising and falling; each move driven by a sim entity (the spear's lane, its 11 u/s dash in
the air and its landing; the wingbeat; the dive under and the surfacing; the shards; the
crosscut cut at 9 u/s on its paddles, its slam and its dizzy; the lash's tongue at the
lane's length, reeled in; the flop's heave with the fore-feet up, its leap and its landing
on the hit; the swallow's gape and snap; the rage), the strikes on the sim's hit, a co-op
guest's fresh copies, a boss killed in its wind-up, a hitch; the spawn-in, the pooled rig,
the turntable; the lab entries.

`node tools/model-standard-level3-champions-probe.mjs` (in `npm test`) holds the Level III
champions to the same rules (the flags, the Level IV champions still classic; the rig, the
colours with the amber family banned, the beats, the locked feet under the robes, the
spawn-in, the rage, the lab), and to their own moves: the Reaping Sweep's draw through its
warning and its swing across the front on the resolve; the Grave Lance's raise overhead and
its drive into the floor; the Death Knell's heave with the bell swinging wide, its toll on
the resolve with the bell crashed over and the bell stilling again; the Grave Call's lift
and its slam with the mallet's head at the floor; a fresh copy of a warning every tick never
restarting a wind-up; a slow frame holding the swing and the slam at their contacts; both
fists on the scythe's pole, the rope from the left fist to the yoke's hitch, in every pose.

`node tools/model-standard-level4-probe.mjs` (in `npm test`) holds the Level IV bosses to
the same rules (the flags, the Level V bosses still classic; the rig, every part inked and
faceted, named points, no reserved colour; the beats; the Colossus's four and the Weaver's
eight locked feet through a walk with a turn, a rest and a spin in place, the feet
alternating by group; the Cantor's hem held in its hover band, never on the floor; each move
driven by a sim entity: the note's draw and its sing on the hit with the halo flung; the
lance's gather and its lunge on the resolve; the pulse; the Echo Step's fold, its hidden
stretch and its rise where it lands; the verse flare; the fissure's raise and its slam at
the lane's mouth; the rain and the brood loaded ahead of the sim's next throw tick and
thrown within 1.5 frames of it; the burst and its spent slump held while the sim holds it;
the bind's spin and cast to the lane's length, the thread taut while a hero is bound; the
slam flat on the hit; the rage), the strikes on the sim's hit, a co-op guest's fresh copies,
a boss killed in its wind-up, a hitch, the spawn-in, the pooled rig, the turntable, the lab
entries.

`node tools/model-standard-level2-champions-probe.mjs` (in `npm test`) holds the Level II
champions to the same rules as the Level I pair below (the flags, the Level IV champions
still classic; the rig, the beats, the locked feet, the spawn-in, the rage, the lab), and
to their own moves: the Floodgate's heave through its warning and its slam on the resolve;
the Undertow's raise and smash; the Chain Hook's whirl, its throw on the resolve with the
key's copy flying to the lane's length and reeling back to the hand; the Lock Turn's lift,
its drive on the resolve and the turn while held; a fresh copy of a warning every tick never
restarting a wind-up; a slow frame (a whole warning in 66 one-second frames) holding the
slam at its contact; the hands on the gate, the maul and the key in every pose; the chain
running from the left hand to the live key's bow at rest, whirling, flying and driven.
`tools/model-standard-level2-champions-shots.mjs` shoots both in the lab and in their Mill
crown rooms, faceted and with `?facet=0`, with the sim frozen between beats.

`node tools/model-standard-level4-champions-probe.mjs` (in `npm test`) holds the Level IV
champions to the same rules (the flags, the Level V champions still classic; the rig, the
beats, the spawn-in, the rage on the tell, the lab), with the feet rules replaced by their
own: the Choir has no feet and its hems hold their hover band through a walk with a turn,
a rest, a spin and every ability; the Matron has no feet and her lowest root tip stays on
the floor through the same, never under it, lifted only by the pulse's heave and slammed
flat by its beat; both lean into their travel. Its own moves: the hymn's turn to the lane
through its warning and its sing on the resolve; the discord's swell and burst; the lash's
draw, its crack to the warning's length with the whip's tip at the lane's end, and the
drink after; the pulse's rear with the roots lifted and its beat; every whip segment on
its chain's point in every pose, the hanging whips' tips below the shoulders.

`node tools/model-standard-champions-probe.mjs` (in `npm test`) holds the two champions to
the rules: the flags and the champion table's soft flash; the classic interface plus `lab`,
`points` and `react`, the body under the root's first child and the shadow a floor piece,
every part inked and faceted, the hit flash's white emissive on every body material, named
points, no reserved colour; strikes of 2.5 frames into a held contact, off on the first
frame, one overshoot in the settle, the lab's cue on the contact; locked feet through a
walk with a turn, a rest with no step loop and a spin in place; each move driven by a sim
entity (the couch through its warning, the drive on the resolve, the run while the sim
charges, the braced stop; the ring's plant on its tick; the toss's fling on its tick; the
leap's gather, its bound at `hartLift`'s height with every hoof off the floor, the landing
held on the resolve), a fresh copy of a warning every tick never restarting it; the
knight's hands on the lance and the buckler in every pose; the spawn-in on a new champion
only; the rage flaring the tell; the lab entries. `tools/model-standard-champions-shots.mjs`
shoots both in the lab and in their crown rooms, faceted and with `?facet=0`.

`node tools/model-standard-heroes-probe.mjs [--only id]` (in `npm test`) runs every hero in
`FACET_HEROES` through the same checks: the cadence and walk speed match the sim; every
class skill plays an ability and every ability is played; each hit settles into the next
hit's wind-up with no pop anywhere; the lab's cues sit on each contact; `comboHitOf` counts
1-2-3 once per event; the melee wind-ups pull back, contacts lean into the target inside the 12° cap and squash
+19% / -9%, back within 3 frames, inside a lunge step (B9); the weapon kicks on the press
(B4); every move settles with one small overshoot (B5); the third hit is the biggest (B6);
the contact holds through the hitstop the rig struck, and any hitstop holds the whole rig
(B2); a connect recoils 0.08 to 0.12 u after the hold and a whiff does not, or a shooter
squashes 20/29/38% (B3); the spawn grows in (B7); hand and tip are named and the tip
travels (B8); the hips lead the weapon; a hit taken mid-swing and a swing on the walk hand
back with no cut (per-frame spike under 0.08); a skill pressed mid-swing grows the tip's
speed by under 0.08 u a frame (no whip); the held contact shows the weapon on its strike
key; the recoil shove of a lone shot stays bounded; the weapon never cuts into the head; planted feet
never slide, stay on the floor through the walk's bob, hold through a hitstop, step one at
a time and along the travel in eight directions; the walk leans into the travel; a dash
lifts both feet and they plant where they land; the finisher's hop or lunge moves the feet; downed
runs; every instanced part inked; no Ember, Violet, amber or stray Bright Heal; the flag and
the classic twin.

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

`node tools/model-standard-foes-probe.mjs` (in `npm test`): the kit (the clock holds through
a hitstop and restarts on a rewind, the pull-back never pops, a held resolve is a cancel, a
blink re-stands the feet, the reach clamp); then per foe: flagged, a lab tab per ability, the
classic kept, `?facet=<kind>` alone, no more draw calls than its classic, one shared buffer
per baked kind, every lit instanced row inked, flat facets, no broken matrix through a move
loop and live attacks, the group never written, planted feet never slide, the lean follows
the travel, each ability pure in t and moving the rig, live contacts on the sim's tick (a
telegraph's resolve, a predicted bite's tick, an unwarned bite inside the B1 budget), the B7
grow, the Journal turntable, the B8 points, the hit and death envelopes, no reserved colours.

`node tools/model-standard-level2-foes-probe.mjs [kind,kind]` (in `npm test`): the strike
clip (the contact on the release frame, a cancel inside the strike frames taken back, the
snap-in within a frame, the hold while the sim's mode lasts and 3 frames at least, one
overshoot); the Level II roster derived from `data/levels.js`; then per foe the Level I
checks (flags, lab tabs, the classic kept, draw calls, shared buffers, ink, facets, live
play, purity, the live contact on the sim's tick or inside the B1 budget, cancel, stun on
the resolve, B7, the turntable, B8, the envelopes, reserved colours) plus every ability
pose under the elite crown and each foe's own beats (the snail's swell and ring, the toad's
read-ahead gather held loaded and emptied, the lamprey's sink, surface and beach, the
leech's stand-up, gulps and flop, the moth's swoop drop, the miller's toss budget and the
stone's turns and return). `tools/model-standard-level2-foes-shots.mjs` shoots each in the
lab and a Level II fight with all seven spawned, faceted and with `?facet=0`.

`node tools/model-standard-level3-foes-probe.mjs [kind,kind]` (in `npm test`): the same
checks for the nine Level III foes (the roster derived from `data/levels.js`, the broodling
added), with their live attacks (the ram's, crow's, knight's and keener's telegraphs, the
mole's emergence, the brood's and broodling's bites on the sim's bite tick, the wisp's
tether inside the B1 budget, the sexton's bury on the dig tick, a spoiled dig patting
nothing) and each foe's own beats (the ram's guard flare, the mole under its mound and the
mound's quake, the wisp's core, the knight's shield, the keener's mouth, the sexton's knee
and spade), plus the three Barrow cues registered, measured and mapped, and the lab playing
each foe's cue. `tools/model-standard-level3-foes-shots.mjs` shoots each in the lab and a
Level III fight with all nine spawned, faceted and with `?facet=0`.

`node tools/model-standard-level4-foes-probe.mjs [kind,kind]` (in `npm test`): the Level IV
roster derived from `data/levels.js` (the six kinds no earlier level built), then per foe the
same checks as Level II (flags, lab tabs, the classic kept, draw calls, shared buffers, ink,
facets, live play, purity, the live contact on the sim's tick or inside the B1 budget,
cancel, stun on the resolve, B7, the turntable, B8, the envelopes, reserved colours, every
pose under the elite crown with the censer's chain left out) plus each foe's own beats (the
husk's vein colour and throb on the heartbeat, its deeper hunch in the surge and its third
bite the biggest; the lancer's aim and the spear gone then reformed; the geode's fist high
and unplanted then driven into the floor and the spires' flare; the censer's halo and coals
on the gather, the burst, the blink and the spill never striking; the bloom's knot jolt,
root sink, petals open then shut and the base on the floor; the siphon's tendrils drawn
back then whipped forward and the gulps on the drink).
`tools/model-standard-level4-foes-shots.mjs` shoots each in the lab and a Level IV fight
with all six spawned, faceted and with `?facet=0`.
