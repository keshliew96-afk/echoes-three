# Model standard (pilot v0.5.332; Level I bosses v0.5.336; heroes v0.5.337, Archer v0.5.339)

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

The heroes slice (v0.5.337, Kesh's pick of 2026-10-26) rolls the standard out to the heroes,
the Healer and the Swordsman first, and re-measures the pilot Tank against the [M] rules of
the VFX/hit rules doc (`/mnt/project-files/plan/VFX_HIT_RULES.md` §6.1). Everything a hero
rig shares now lives in one hero core, so each later hero is its body, its poses and its
abilities, and the same probe holds every one of them to the same rules. The Archer
followed in v0.5.339 ("The Archer" below).

## The kit (`src/render/facet/`)

| File | What it gives |
|---|---|
| `material.js` | `facetize(geo, {jitter, seed})`: non-indexed geometry with flat normals and a per-plane value step in a `color` attribute (hashed from the face normal, so a plane keeps its tone as the model moves). `facetMaterial(color)`: the house toon material with vertex colours. Every faceted part keeps the 3-step toon ramp, so the light still bands like the rest of the game, and the facet step rides on top. |
| `kit.js` | The parts kit on `InstancedMesh`, so hundreds of plates cost two draw calls (the part and its ink hull): `createSpine(n)` (a Catmull-Rom spine with a stable frame), `createPlateTube` (ridged scales laid in a brick pattern round a moving spine, sized by the local arc length so a bend never opens a gap, with metal bands every few rings), `createSpineRow` (wedge spikes along the spine, with tinted tips), `placeRow` (any fixed row: teeth, rivets, crest fans, mail), `mottle` (per-instance tone), `wedgeGeometry`, `plateGeometry`. Part ink is `PART_INK_PX` (1.35 px), thinner than the silhouette's `INK_PX`. |
| `timeline.js` | `createTimeline(id, label, phases, {cues})`: pure in t (`sample(t)`, `startOf(phase)`, `readout(t)` for "1.2s · Ash Breath: strike"). `createPlayhead`: rate 1 plays, 0 holds, -1 rewinds; cues fire only on a forward crossing, so a rewind and replay re-fires each once. `ease`. |
| `flags.js` | `MODEL_STANDARD = {wyrm, tank, healer, swordsman, archer, stag, thornmother, gloamwolf, the eight Level I foes}` and `facetOn(kind)`. A harness build reads `?facet=0` (every model classic) or `?facet=wyrm,stag` (only those); a player build never sees the param. |
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
  `critters/common.js` gives a baked detail row the thinner part ink.
- The classic rigs (`boss/wyrm.js`, `boss/stag.js`, `boss/slice2.js`, `boss/third.js`,
  `critters/tank.js`, `healer.js`, `swordsman.js`, `archer.js`, `enemies/boar.js`, `enemies/mantis.js`,
  `enemies/archetypes.js`, `enemies/woodmill.js`) are untouched and stay beside them.
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
every model, the Wyrm too, a Spawn in tab). The Trample, the Briar Charge and the Pounce
travel as they do in the game, so the gallop and the bound can be judged on locked feet.
Still from a playing ability freezes that moment with the feet where the motion left them;
a scrub re-plants them on the scrubbed pose's stance. An ability id the model does not have
falls back to its first ability. `fixedDt` (s) makes every drawn frame advance
the lab by that step, so a probe on a slow software-GL machine sees 60 Hz motion
(`tools/model-standard-level1-shots.mjs` uses 1/60).

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
   swing; a legless body keeps its base planted). Meet the §6.1 [M] rules.
4. A hero: build it on the hero core, export its SPEC and list it in `heroes.js`; that
   gives it the lab tab and the heroes probe. Add it to `MODEL_STANDARD`.
5. A boss or a foe: play the [M] beats (`beats.js`): wind-ups on the telegraphs, 2.5-frame
   strikes into a held contact, a kick, a settle with one overshoot, the spawn-in, named
   points, and a `react` tuning for the shared hit envelope; keep floor pieces off the
   root's first child. Legged models stand on `createLegs` (locked feet); give each leg a
   pole that bends the way the animal's joint does. Add it to `MODEL_STANDARD`, a lab entry
   (`scenes/modellab-bosses.js` for a boss), and checks in a probe
   (`tools/model-standard-level1-probe.mjs` shows the pattern).
6. Shoot it in the lab and at play zoom in a busy fight beside its classic twin
   (`tools/model-standard-heroes-shots.mjs` shoots the heroes' fight faceted and with `?facet=0`).

## Probes

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
