# VFX and hit rules (from Kesh's nine videos)

In the repo since v0.5.360 (it lived in the project folder as `plan/VFX_HIT_RULES.md`). The
`/mnt/project-files/` paths below point at the project's shared folder, where the transcripts, contact
sheets and analysis stay; code comments cite this file's rule ids (`VFX_HIT_RULES §6.2 i`, `I1`, `A6`).

Kesh asked (2026-10-25): "follow and learn the rule it mention" for nine @qutsune
"juicy game feel" TikToks. This doc turns them into standing rules for Echoes, measured
frame by frame and checked against the game at **gauntlet e1ba618 (v0.5.332)**.

- Transcripts and the link table: `/mnt/project-files/vfx-rules/TRANSCRIPTS.md`.
- Contact sheets, 1 frame a second: `/mnt/project-files/vfx-rules/v<N>-<slug>-<NN>.jpg`.
- Earlier hand-over notes: `/mnt/project-files/vfx-rules/EXISTING_RULES.md`. Appendix B lists the corrections to them.

## How to read a rule

Every rule has an id, a tag, a layer and a status.

**Tag: who carries it.**
- **[M] Models and animation.** Rig poses, the body's squash and stretch, anticipation,
  recoil, follow-through, death motion, and the named hand and tip points that effects
  anchor to (B8). The effect drawn at such a point is [V]. Every model standard slice
  (hero, boss, champion, foe) carries the [M] rules for the models it builds. The
  checklist is in §6.1.
- **[V] Hit feedback and VFX.** Flashes, particles, trails, bursts, decals, numbers,
  camera, the post stack and sound. A VFX and hit feedback slice builds these once for the
  whole game. Its list is in §6.2.

**Layer: what it touches.**
- **R** render only. The nine goldens stay identical.
- **A** audio only. The goldens skip `sound` events, so they stay identical.
- **S** sim. It moves the goldens. Only Kesh can name it (§6.3).
- **R/S** a render part, plus a sim part that the sim already has or that only Kesh can
  name.
- **R/A** a render part plus an audio part. The goldens stay identical.
- A clash with a written ruling is the ⚠ status, whatever the layer. F2 and F3, for
  example, are R ⚠.

**Status today.** ✓ already does it · ~ partly · ✗ missing · ⚠ conflicts with a ruling.

**Units.**
- The videos are 30 fps captures of a 60 fps game. One video frame is 33 ms, which is
  2 Echoes ticks (the sim runs at 60 Hz).
- **bw** means the target's body width. For a rank-and-file Echoes foe, 1 bw ≈ 0.65 u
  (its footprint radius is 0.3 to 0.35 u).
- Eight videos use a fixed high three-quarter camera over a grid floor, very close to
  Echoes' own. Their targets are capsules (v7's is a chest). Their numbers in bw transfer
  directly.
- v1 is the exception. It is a 2D side-on sketch: a dome-shaped blob 143 px wide and
  105 px tall on a flat floor line. There is no 3D camera, only a tiny screen shake.
- From v1, copy the timings, the flash curve, the shake, the layer and colour ramp, the
  hurt tint and the number motion.
- Do not copy v1's geometry as it stands. Its bolt stands upright in screen space, about
  2 blob widths tall. In Echoes, draw it as a camera-facing sprite or in screen space, or
  the camera foreshortens it. v1's bw is a blob that is wider than it is tall, so treat
  its sizes in bw as rough.

**Terms.**
- **Combo finisher** means the third hit of a rig's 3-hit basic combo (Kesh's template,
  `docs/MODEL_STANDARD.md`). The rig counts it on the render clock.
- It is not the Swordsman's Crescent Finisher and not the sim's combo stacks.
- Only the Tank pilot has the combo today (`src/render/critters/tankfacet.js`). A rig
  without it has no finisher yet.

**Pointers.**
- A bare § number from 8 up is a section of `docs/BUILD_BRIEF.md`. §9 #N is item N of its
  juice contract. A lower bare § number is this doc's own.
- design-VFX is `docs/gauntlet/design-VFX.md`. A § number given with a file's name is that
  file's.
- Ruling A5 (the party is never knocked back) is from BUILD_BRIEF's Appendix A. Rule A5 is
  this doc's sound rule (§2.11).

## 1. The ten laws

These are what all nine videos teach together. Each later rule serves one of them.

1. **One impact frame.** On the hit's own frame these start together: the flash, the
   thump, the freeze, the first shake kick and the number. The push and the attacker's
   recoil start there too, unless a freeze holds them. Then they launch on the first frame
   after the freeze (F1). On a big finish the first shake kick may trail by 1 to 2 frames
   (v9). Particles start on the same frame or one frame later: v2's shards one frame
   later, v3's streaks and v4's blood puff with the flash. Only the attacker's own swing
   layers start earlier: the whoosh with the wind-up and, in v8, the tip glint and the
   trail's build during the strike. After that, each layer decays on its own clock.
2. **The target must react.** "If the target doesn't react, you can't tell you hit it."
   The target flashes white, squashes, is pushed away along the hit and settles. Target
   reaction matters more than attacker flourish.
3. **Every press answers on the same frame.** A flash at the hand or muzzle, a weapon
   kick and a sound, all on the frame of the press.
4. **One direction.** Particles leave the far side of the target, and the target flies the
   same way. A bullet hit also sprays chips and droplets back toward the shooter (v4). On
   a melee hit the first shake kick goes along the hit too (v2). The spell, lightning and
   ice videos kick in a random direction (v1, v3, v9; F3). The attacker recoils the other
   way.
5. **Anticipation, action, follow-through.** Lean back and gather, strike fast, hold the
   contact, then settle with overshoot. Trails lag behind, and bursts fly on.
6. **Build from colour to white.** The shape comes first, in a mid-value colour. Then a
   broad soft glow underneath, a narrower brighter glow, tapered accents, and the white
   core last. Every stroke tapers to a point. A swing trail is thick at the blade and thin
   toward the swing's start (L3, T4).
7. **Strongest first, then decay.** The first drawing of the impact is the biggest and
   brightest. Two things build up to that beat instead. A travelling effect grows toward
   the target: v9's spikes grow about 5 times, and the decay starts at the hit. A swing
   trail grows with the blade over 1 to 2 frames and peaks on contact, never on spawn
   (T5). After that the effect thins, breaks apart and fades. Shocks last about 0.1 to
   0.25 s. The things that tell the story (embers, a burn, marks, numbers) last 0.5 to 2 s.
8. **Nothing flies straight.** Sparks, debris and damage numbers travel on arcs. The shot
   itself keeps its straight line, so the hit stays readable.
9. **The last hit is the biggest.** The kill gets a longer freeze, a bigger flash, a
   throw or a pop, its own sound, and a mark that stays.
10. **Never the same twice.** Vary size, angle, speed and pitch on every shot and sound.
    "Identical bullets look like a laser." "The same sound twice in a row feels fake."

## 2. Rules by theme

Each entry gives the rule, the videos it comes from, what the game does today (with code
references) and the safe route where one exists.

### 2.1 The impact frame

**I1 [V] R/A ~.** Start every layer on the hit's own frame. *(v1, v2, v3, v4)*
- The flash, the impact sound, the freeze, the shake kick and the number start on the hit's
  frame.
- The knockback starts there too when there is no freeze. Under a freeze it waits, then
  launches with the recoil on the first moving frame (F1).
- The first particles start on that frame or the next one. v2's shards come 1 frame late.
  v3's streaks and v4's blood puff land with the flash.
- Heavier debris can trail. In v4 the splash on the wall behind lands 2 frames after the
  hit, and the droplets back toward the shooter 3 frames after.
- Today: every layer listens to the sim's `hit` event, so they all land on one frame. The
  exception is a damage number born within 0.16 s of another one close by on screen. It
  starts 0.05 s later for each such number, up to 0.15 s (`src/render/numbers.js` fan).
- Caveat: once a frame has started 4 cues, a cue below priority 4 waits for a later frame
  when the frame's 0.6 ms audio budget is spent or 12 cues have started. A cue still
  waiting after 100 ms (or 2.5 rendered frames, if longer) is dropped, not played late
  (`src/audio/engine.js` dispatchQueue). A 30 ms same-cue cooldown also merges a cleave's
  hits into one `impact` (`src/audio/cues.js:161`).
- Fix: let the first `impact` of each tick bypass the budget. That is audio only.

**I2 [V] R ✓.** Layer the effects; never replace one with another. *(v2, v3)*
- Each layer is small on its own; the stack is the punch.

**I3 [V] R ~.** Give each layer its own clock. *(v1)*
- v1's lightning: the bolt lasts 0.2 s, the shake 0.13 s, the hurt pose 0.27 s, the sound
  0.5 s and the number 0.57 s.
- Today the clocks are separate, but the hitstop holds only the sim. See F1.

### 2.2 The target reacts

**R1 [V] R ~.** Flash the target near-white with a hard cut. *(v2, v3, v4, v6, v8, v9)*
- No fade-in. v2 and v3 keep a faint trace of the body's hue (#F0EAFF to #F2EEFC). v8's
  sword hits go pure white (#FDFDFD) under a big bloom.
- Length: 2 to 3 frames (67 to 100 ms, 4 to 6 ticks). The freeze pauses the flash timer,
  so the total is the freeze plus 1 to 2 frames (5 to 6 frames in v2, and 4 to 5 in v8 on
  its 3-frame freeze).
- A spell flash fades back over about 12 to 15 more frames, half-way by +6 (v3).
- v6's fireball: near-white through the 3-frame hold, brightest on the 2 to 3 bloom frames
  after it, then mostly faded about 10 frames later. A thin gold rim (3 to 4 px) and a
  lilac tint fade with it.
- So both spell videos fade over 10 to 15 frames (20 to 30 ticks).
- A rapid-fire bullet hit flashes 1 frame, and the kill 2 to 3 (v4). A big finish flashes
  4 (v9).
- Today: emissive white at 1.0 for 3 ticks (50 ms), held through hitstop, so about 83 ms on
  a melee hit (`src/core/constants.js:60-63`, `src/render/enemies/index.js` hit handler).
  Shots and spells get 50 ms with no fade. Champions are scaled to 0.4, the Gale Herald to
  0.25, and bosses peak at only 0.28 (`BOSS_FLASH`).
- Safe route: a 4 to 6 tick hold, then a fade of about 24 to 30 ticks on spell hits,
  half-way back about 10 ticks after the flash starts (+6 in v3). That is render only.

**R2 [M] R ✗.** Squash the target on contact, then stretch it back. *(v1, v3, v4, v6, v9)*
- Frame 0 or 1: 10 to 14% wider and 12 to 13% shorter, with the base anchored.
- Frames 2 to 3: a 6 to 7% stretch.
- Settled by frame 5 to 8 (170 to 270 ms).
- A rapid-fire bullet hit squashes less in height (v4): 12 to 17% wider and 5 to 8% shorter
  on the arrival frame. While hits keep landing it stays squashed, and each new hit does
  not restart the spring. It is back to shape within about 3 frames (100 ms) of the last
  hit.
- A heavy spell hit squashes harder (v6): 1.18 to 1.3 wide by 0.85 to 0.91 tall, the top
  dropping and the base spreading. It holds through the freeze, springs to 1.05 to 1.1 tall
  and about 0.88 wide at +7 to 8 frames, and rests by +10 to 13. Count from the contact,
  with the hold included. That is a damped spring.
- Without a hold (v6 step 2) it springs at +5 to 6 and rests by +7 to 8.
- v8 does the opposite on a sword hit. On the first white frame the target stretches 14 to
  17% taller, with the width and the base unchanged, and holds it through the freeze. It
  squashes only on landing. Five videos squash on contact and v8 stretches, so whether a
  blade hit squashes or stretches on contact stays an open choice.
- The squash is oriented to the hit, and the ticks hold through the freeze like the flash.
- Today: enemy rigs never squash on a hit, only in the death pop (the hit handler in
  `src/render/enemies/index.js`, and `src/render/boss/index.js`).
- This is a per-rig scale envelope that works for all 42 foe kinds from the shared enemy
  layer (the Bestiary shows 41, because the broodling shares the brood's page, but it has
  its own rig).

**R3 [M] R ~.** Flinch away from the hit. *(v3)*
- On frame 2 the middle of the body bulges away from the hit side. The base stays anchored.
  The body does not lean and does not travel.
- Sparks hide the bulge's edge in v3, so its size is not measured. The only measured push
  is the far edge moving about 6% of the body width on frame 1.
- It settles by frame 5, together with R2's squash and stretch. v3's narrated "make it
  flinch" is mostly that squash pulse.
- v2's 7 to 12° lean is its knockback tilt in the air. It belongs to R4. Do not add a
  second lean.
- Today:
  - No foe flinches. `lastHitTick` is set but never read by the render.
  - The escort pilgrim flinches with its own lean: it rocks back about 14° and is upright
    again within 0.22 s (`src/render/enemies/escorthold.js`). Every hero rig flinches too:
    each hit plays the `hurt` clip for 0.62 s. It snaps in about 2 frames, rocks the body
    back about 19°, squashes it 16% wider and 19% shorter, and shoves the rig back 0.11 u
    (`src/render/critters/driver.js`).
    It rocks back from the hero's facing, not away from the hit.

**R4 [M] R/S ~.** Give the knockback a shape. *(v2, v4)*
- A melee hit (v2): launch the target 0.85 bw along the hit (about 0.55 u), with a hop. Its
  feet rise about 0.4 bw on screen, highest at +3 frames. A combo finisher throws 1.3 to
  1.4 bw and rises about 0.55 to 0.6 bw.
- Those rises are screen heights with the depth along the hit taken out. Echoes' 52° camera
  shows a world lift at about 0.6 of its height, so the hop needs about 0.4 u of world lift
  (about 0.6 u on a finisher).
- A shot (v4): push it about 0.5 bw, with a lower hop of about 0.12 of its height. The hop
  peaks 2 to 3 frames after the hit and lands 5 to 6 frames after it (§3.3).
- The timings below are the melee ones. They count from the launch: the impact frame, or
  the first frame after the freeze when there is one (F1). Under v2's 3-frame hold the push
  peaks at +4 to 5 and lands at +9 to 10, counted from the impact.
- The push peaks at +2 frames. The body tilts back 7 to 12°, most at +1 to +2, and is
  upright again by +4 to +5. It tips 3 to 5° forward just before it lands. This tilt is the
  only lean in the hit reaction (R3 adds none).
- In the air the body is about 10% taller and 12% narrower, clearest at +5 to +6. It lands
  at about +7 frames (0.23 s) with a 1-frame squash (+15% wide, −13% tall), recovers in 2
  frames, then settles.
- Today:
  - The sim slide is already the right distance: 0.34 u for a basic and 0.72 u for a skill
    (0.5 to 1.1 bw), over 10 ticks (`src/core/constants.js:51-55`).
  - The hop, tilt, air stretch and landing squash are missing.
- Safe route: draw the hop, tilt and squash on the rig as a render overlay on the sim
  slide. Do not change the sim distances.
  - Scale the hop, the tilt and the air stretch to the distance the sim really moves the
    body: the hit's own `kb` (on the `hit` event) times the body's `kbScale` where it has
    one. A champion takes 0.1 to 0.15, the Barrow Ram and the Slag Golem 0.3, the Geode
    Brute 0.35, the Bone Knight 0.4 and an awake Gargoyle 0.5 (`src/sim/enemies.js`,
    `src/sim/enemies/`). The video's look is for a push of about 0.55 u.
  - No push, no hop. Bosses, a stone Gargoyle, a rooted Heart Bloom, a Bog Lamprey while it
    rises and lunges, and zero-knockback skills get only the squash. A burrowed Grave Mole
    cannot be hit at all. A surfaced mole and a beached lamprey are pushed like any foe.
  - A negative `kb` is a pull, so the body tilts toward the hitter.
- The demo dummy springs back to its spot afterwards. That is a training-dummy habit. In
  Echoes the foe stays where the sim puts it.

**R5 [M][V] R ~.** Bosses and champions react the same way, scaled down. *(my addition)*
- Not in the videos.
- Bosses get half the squash and flinch amplitude, so they still read as heavy. Champions
  are scaled down the same way. Both keep their softer flash (R1).
- Bosses are never knocked back (sim), so they get no knockback overlay.
- Champions are pushed only 10 to 15% as far as an ordinary foe (`kbScale`,
  `src/sim/enemies/champions.js`), so they keep a small hop, tilt and landing squash at
  that size (R4).
- The VFX slice builds the scaled squash and flinch once, in the shared envelope (§6.2 a).
  Each model slice tunes it to its body (§6.1 item 9).

**R6 [V] R ✗.** Light the target with the effect as the effect nears. *(v3, v4, v9)*
- The spell orb's light reaches the target's near side only in the last 1 to 2 frames
  before contact (about 0.5 to 1 bw out), and lights its near half on the contact frame
  (v3).
- v9's approaching ice tints the target about 7 frames before the hit. Then the white
  flash takes over.
- A muzzle flash brightens the target by 17% (v4).
- Today the light pools sit on the floor only.

### 2.3 Freeze and shake

**F1 [V] R/S ~.** Freeze on contact. *(v2, v4, v5, v6, v7, v8)*
- Hold the attacker, the target and the trail for 3 frames (100 ms, 6 ticks), or 4 on some
  hits. Hold 5 frames (167 ms, 10 ticks) on a kill.
- These lengths are measured on v2. v8 also holds 3 frames (once 2). v5's anime hit holds
  much longer, 9 to 10 frames (X1).
- The hold starts on the impact frame. v7's chest is the exception: a reward holds at the
  top of its hop (S+4 to S+7), and its stars and light hold too (O3).
- During the hold:
  - The particles keep moving.
  - The trail holds its sweep, but its texture keeps flickering (v8).
  - The flash timer pauses.
  - The knockback and the recoil wait. They release together on the first moving frame.
- Today:
  - The sim hitstop is 2 ticks (33 ms) on a non-lethal melee arc and 3 ticks (50 ms) on any
    kill, with a budget of 4 ticks per 21-tick window (`src/core/constants.js:32-37`,
    `src/sim/combat.js:53-68`).
  - Shots, novas, zones and bites freeze only when they kill (the 3-tick kill pause).
  - No render layer listens to `hitstop`. Walk cycles, kit VFX, numbers and the kill pop
    keep running through it (`src/render/enemies/index.js:319-321`), so today's freeze
    reads as a position stall, not a held frame.
- Safe route (render only): on each `hitstop` event, hold the rig clips of the attacker and
  the target, the slash ribbons' sweep (their noise keeps running) and the flare time, and
  let the particles run.
- Kesh's call (sim): a longer hitstop (about 6 ticks on a hit and 10 on a kill), or a
  hitstop on shot and spell hits (§6.3 items 1 and 2). Both move the goldens and the §9
  budget.
- v6 freezes the whole game for 3 video frames (about 100 ms, 6 ticks) at 8 of its 9 hits,
  and for 2 at one.
  - Its sketch says "4 FRAMES". At 60 fps that would be only 67 ms, shorter than what it
    shows.
  - The hold is on the pose of greatest deformation: the fireball embedded, the target
    squashed and the number at its biggest.
  - Nothing in v6's hold moves, unlike v2's. The caster, the fireball and its trail, the
    squash and the number all hold. The burst and its streaks wait for the release.
  - In its side-by-side only the juicy game holds, so this is game time, not an edited
    pause.
  - The 2 to 3 frame white bloom is the release.
- Note: the videos disagree on ranged hits. v3's spell, v9's ice attack and v4's shots have
  no freeze at all. v6 freezes its fireball. So a ranged hitstop stays an open choice.
  - v9 gets its weight from the flash, the overshoot, the shake and the jump in size
    instead.
- v4's kill is not a world freeze, though its narration says "freeze for a beat". Only the
  camera and the gun stop, for 1 frame. The hero, the particles and the fading flash keep
  moving. The victim then holds upright and white for 2 to 3 frames before the throw
  (§3.3 step 7).

**F2 [V] R ⚠.** Shake only inside the freeze. *(v2, v8)*
- The world shakes; the HUD never does.
- On the impact frame, the first held frame, kick along the hit: about 6 to 12 px of 576,
  9 on average (about 0.14 bw ≈ 0.09 u, at most 0.19 bw ≈ 0.12 u). That is 1 to 2% of the
  screen width.
- On the next two held frames, smaller random offsets of about 6, then 3 px. Back to rest
  when the hold ends.
- v8 also kicks on every sword hit (C2), but its kick settles 4 to 6 frames after contact,
  past its 3-frame freeze (low confidence: the bloom degrades the fits).
- Today: the sim's `screenshake` never fires on an ordinary hit (§9 #7, "never on ordinary
  hits"). Kills shake 0.06 u for 0.12 s anywhere on the map. Render camfx kicks still play
  on some hits and swings. The Tank kicks the camera on every swing, even a whiff (0.0175 u
  on a basic, 0.05 u on a skill), and a Swordsman arc skill kicks 0.03 u.
  The Archer, the Duskwing, the Tidecaller and the Bellwright kick on some of their own
  skills too, 0.006 to 0.09 u (`signature.js`, `templates.js`, `duskfx.js`, `tidefx.js` and
  `bellfx.js` in `src/render/vfx/`). Only the Healer has no skill that kicks.
  Crits kick 0.025 u for 0.08 s. A heavy hit on your own hero kicks 0.045 u along the blow,
  and the hit that downs you 0.065 u (`src/render/vfx/hitfeedback.js`). The summed offset
  is clamped to 0.09 u (`src/render/vfx/camerafx.js:21`).
- No safe route. *My pick:* a render-only kick along the hit, about 0.03 u, on the local
  player's own melee connects only, under the Screen shake setting. It still goes against
  §9 #7's wording, so it waits for Kesh (§6.3 item 4).

**F3 [V] R ⚠.** Let a big beat shake longer, not harder. *(v1, v3, v9)*
- A lightning hit (v1): the screen jumps 2 to 4 px of 576 on the flash frame (mean 2.1 px,
  about 0.4% of the screen width). Then it jumps about 1.4, 1.1 and 0.7 px and is gone by
  +4. Each frame jumps a new random way, not along the hit.
  - It fires on every hit, and v1 has no freeze.
  - Scale: v1's blob fills a quarter of its frame, and an Echoes foe fills about 4% of the
    view. In bw the jump is about 0.02 bw (about 0.013 u). That is about 1 px on a 1024 px
    view, below today's 0.025 u crit kick. As a share of the screen it is about 0.06 u, the
    size of today's kill shake. Judge which scale to use on the laptop.
- A spell hit (v3): a kick of about 0.065 bw (about 0.04 u; a median 3 px of 576, range 0.6
  to 4.2) in a random direction on the hit frame. Then 1 to 2 px back, about 1 px, and at
  rest on the fourth frame. Translation only, no zoom. A crit adds no extra shake.
- A big finish (v9): about 9 frames (300 ms). The shake starts 1 frame after the flash with
  a 1 to 2 px move. The big kick, about 0.13 bw (≈ 0.085 u) and vertical, lands 2 frames
  after the flash. Then it decays in random directions. Translation only, no zoom.
- A kill (v3): about 1.4 times a median hit (4.3 px against 3.1). That is the top of the
  normal range, not above it.
- Conflict:
  - The lightning and spell hit shakes fire on ordinary, non-lethal hits. That is §9 #7's
    shake on an ordinary hit (see F2), so they wait for Kesh like F2 (§4.1, §6.3 item 4).
  - The big finish (about 9 frames, big kick about 0.085 u) passes §9 #7's ceilings:
    0.06 u and 120 ms, or 180 ms for the two heaviest boss beats. A longer or bigger shake
    than the safe route below is Kesh's call (§6.3 item 14).
  - Kills already shake at both ceilings (0.06 u for 0.12 s). K1 keeps that shake and makes
    the kill bigger in the flash and the pop instead.
- Today: boss beats and hazards shake 0.03 to 0.06 u for 0.12 to 0.18 s.
  Earthshatter's finish kicks 0.08 u for 0.16 s.
- Safe route: on a big skill's finish only, a camfx kick of 0.2 s or less inside the 0.09 u
  clamp, and only for classes that already kick today (F2). Earthshatter's 0.08 u for
  0.16 s is the precedent: the game already passes §9 #7's numbers there. If Kesh reads
  §9 #7 strictly, this route also waits for him (§6.3 item 14).

**F4 [V] R ✓.** Never shake the HUD. *(v2)*
- Today the HUD is DOM and never shakes.

### 2.4 Particles and bursts

**P1 [V] R ~.** Throw the shards out of the far side. *(v2, v3, v4, v6)*
- On the impact frame or the next one, throw 15 to 25 shards in a cone of about 45° along
  the hit. v2 throws them on the next frame.
- Spawn them at the target's far edge (about 0.5 bw past its centre along the hit), 25 to
  35% down the body. Spawn them in world space, never parented to the target, so they stay
  behind when it is knocked back.
- Add 2 to 4 tiny white four-point twinkles that stay at the spawn point.
- Speed 7 to 10 bw/s, life about 0.5 s, light gravity. Shards are 0.1 to 0.23 bw.
- In v2 they cool from pale yellow (#F0DD86) through gold (#E4BF5F) to dark orange
  (#E37C44), with pink specks at the end. For heroes, start white and stop at gold. Never
  reach Ember (§4.3).
- A bullet hit sprays both ways (v4). Chips and blood droplets fly back toward the shooter.
  Only the exit splash lands on the wall behind, 2 frames after the hit (D2).
- Spell bursts (v3): about 6 streaks out of the far side (±20 to 30°) and 3 to 4 back toward
  the caster. Each is 0.45 to 0.65 bw long, lives about 5 frames, then breaks into yellow
  dots.
- v6: needle streaks reach 0.7 to 1 bw past the target's far edge and live 3 frames. Gold
  flecks spread from the impact face and drift down; most are gone in 10 frames and all by
  about 24. Scorch wisps linger 20 to 25 frames, until the next shot.
- Today:
  - Class sparks: 4 to 7 per hit with a direction bias of 0.4 to 0.75
    (`src/render/vfx/signature.js` classImpact). The blade template adds 6 sparks on a basic
    hit and 9 on any other, plus 8 on a crit, with a bias of 0.75 along the hit
    (`src/render/vfx/templates.js` bladeImpact).
  - Spawn point: the hit's `x`, `z` is the target's centre (`src/sim/combat.js` hitEv), so
    the sparks start inside the body, at y 0.45 to 0.5. The pools are already world space.
  - Gaps: the magic template's blast and stardust are radial.
  - The kill burst is radial too, because `death` carries no direction. That is close to
    v2: its balloon pop throws cubes in all directions, even behind the attacker, with only
    a slight lean along the hit. The killing hit's own sparks already leave along the hit.
- Safe route: give the magic impact a direction. Give the kill burst only a slight lean,
  taken from the same tick's `hit`. The kill's strong direction is the body throw (K4).

**P2 [V] R ✓.** Make sparks and debris fly on arcs. *(v6)*
- Hit sparks and debris chunks already fly on arcs. By default they fall at 8.5 u/s²
  (`src/render/vfx/particles.js`), and template sparks fall at 6 (`src/render/vfx/tplkit.js`).
- Not every particle falls, and that is right: smoke, embers and template dust rise or
  float, and petals and feathers drift down slowly.
- The sci-fi impact sparks fly straight (`src/render/vfx/templates.js` scifiImpact). Law 8
  asks for arcs, and Kesh's sci-fi template asks for sharp lines, not straight paths, so a
  light fall on them is an open choice.

**P3 [V] R ~.** A white bloom at the contact. *(v3, v9)*
- v3: about 2 bw wide, peaking on frame 2 and bright for 4 frames.
- A big finish (v9) blooms about 3 bw in radius (about 6 bw across), locally. It starts on
  the hit frame, ramps over 4 frames to a peak at about +4, then fades over about 10 frames
  to a faint glow that stays while the effect stands. The frame corners never brighten, so
  it is never a full-screen flash.
- Today: a 0.55 flare (0.75 for a skill) that pops in over 35 ms and is at full strength
  only until 50 ms (L5), plus a 0.3 to 0.46 u flash. That is smaller and shorter than
  the videos.

**P4 [V] R ~.** Sparks where a shot lands, including walls. *(v4)*
- A star of 5 to 10 short pale yellow-white streaks (#E7D5A3, cores up to #FFFCC6), 0.15 to
  0.6 bw across, over a soft warm glow, with a few loose specks.
- It is still visible about 200 ms (6 frames) after the last impact.
- Today a shot that stops on a wall or a blocker gets the same end burst as a body hit
  (`src/render/vfx/boltfx.js` burst):
  - A template blast and a floor light.
  - Blade shots throw 7 sparks that live 0.16 to 0.3 s. About half fly back toward the
    shooter, and the rest go any way.
  - Magic and sci-fi shots throw 6 to 7 motes, spread evenly with no direction.
  - Only a shot that runs out of range fizzles, with 4 sparks or 5 motes.
- Gap: magic and sci-fi shots throw motes, not streaks.

### 2.5 The attacker's body (models and animation)

**B1 [M] R/S ⚠.** Anticipation: lean back and gather before the throw. *(v2, v3, v6, v9)*
- A punch: about 4 frames of wind-up, then a 2 to 3 frame strike. About 4 frames before
  contact the hero is about 0.3 to 0.4 bw back and about 0.3 bw down the screen. The strike
  ends in a lunge about 0.85 bw past rest on the contact frame. v5 and v8 show the same
  sizes (B9, §2.13, §2.15).
- On the leaping third swing (B6) the hero rises instead: about 0.3 bw up 2 frames before
  contact and about 0.5 bw up on the contact frame. It lands squashed 2 frames later.
- A spell: 10 to 12 frames (0.33 to 0.4 s) of charge in v3 and v6, and 24 to 26 frames
  (0.8 to 0.87 s) in v9. In v6 the body slides back 0.33 to 0.42 bw, tilts back 10 to 15°
  and sinks 10 to 14%, then throws in a 1-frame snap. Wind-up to release is about 10 to 1.
- v9 gathers by sinking, not by leaning back. Over the charge the body drops about 10% and
  widens about 16%. It leans 15 to 17° back, away from the target, only on the release
  frame, and is upright again about 7 frames later.
- Today:
  - Every cast is instant on the press (BUILD_BRIEF §6).
  - The rig's 450 ms wind-up is skipped: casts enter the clip at the release pop. The clip
    (a wind-up over the first 0.3 of a 1.5 s cycle) and `setAnim(name, phase)` are in
    `src/render/critters/driver.js`. CAST_PHASE = 0.45 s is set in each caller:
    `src/render/allies/index.js` (party rigs), `src/scenes/arena.js` (the Healer) and
    `src/scenes/camp.js`.
  - The Tank pilot shows 1.5 frames of wind-up from rest.
- Safe route, as Kesh's 3-hit combo template already says: carry the next hit's
  anticipation in the previous hit's settle. From rest, compress 1 to 2 frames of wind-back
  into the release pop.
- For spells, play the gather after the press and keep it short. A nova or ground spell
  keeps `anticipate()`'s 0.06 s (about 4 ticks, `src/render/vfx/signature.js`) and never
  lengthens it. A shot's head leaves on the sim's tick. Its gather is the core in the hand
  (S1), which plays while the shot flies.
- Kesh's call (sim, §6.3 item 5): a real pre-press charge breaks BUILD_BRIEF §6's instant cast.

**B2 [M] R ~.** Strike fast and hold the contact pose. *(v2, v8)*
- The strike takes 2 to 3 frames, and the pose holds through the freeze.
- Without a freeze (v2 steps 1 to 3): the lunge pose holds and drifts back slowly for about
  5 frames, then is at rest by +12 to +13 frames (0.4 s).
- v8: the body stays at its contact spot 2 frames past the 3-frame freeze while the weapon
  follows through. Then it snaps back to rest in 2 to 3 frames.
- The asymmetry (slow wind-up, fast strike, held contact) is what makes the contact read.

**B3 [M] R/S ⚠.** Recoil off the target. *(v2, v4)*
- A melee connect: snap back about 0.65 bw in 2 frames. This is added on top of the
  normal motion and fades over about 8 frames (0.27 s).
- A shot: squash the shooter and push it back about 0.4 of its width for the burst.
  - The first shot widens it about 20%. Steady fire deepens this to about +38% wide and
    10% short by the third shot, and it holds for the burst.
  - After the last shot the shape comes back in about 100 ms, with a small stretch
    overshoot (about 4% taller, 4 to 5 frames after the last shot). The position comes
    back in about 0.45 s.
- Today: ruling A5 says the party is never knocked back, so the sim never moves the hero
  for a recoil. The `pose.recoil` channel exists (it shoves the rig back 0.11 u), but only
  the hurt clip drives it.
- Safe route: a rig-only lean and shove of 0.08 to 0.12 u, so it never reads as the hero
  being moved. The shooter's squash is a rig scale, not a move, so it plays at full size.
- Kesh's call (§6.3 item 3): the full bounce. This changes ruling A5 and moves the goldens.

**B4 [M] R ~.** Kick the weapon on the shot frame. *(v4, narrated only)*
- The weapon or the hand jumps on the press frame itself and then settles.
- v4's narration says "kick the gun", but its rifle never moves on screen (0 px on every
  frame of a burst). What v4 shows on the shot frame is the shooter's squash and push (B3),
  a camera kick and a punch-in (C1, C2). The kick's size is ours to pick.
- Today: the pose blends at 18/s, so the kick ramps over several frames, and no prop snaps
  back past rest.
- Fix: copy `pose.prop` straight through for the first 1 to 2 frames of a release, the way
  `pose.swing` already is.

**B5 [M] R ~.** Follow-through: settle with overshoot. *(v6)*
- The body settles after the throw with an overshoot. In v6 the caster lunges about 0.27
  to 0.35 bw past rest (up to 0.45), stretches about 7% taller on that frame, and comes most
  of the way back in 4 to 5 frames, at rest after 6 to 13.
- The overshoot comes from v6's cast. v2's melee swing eases home with no overshoot, so v2
  gives no numbers for this rule.
- The trail lags behind, and the burst flies on.
- Today:
  - A cast hold cuts the clip's follow-through (0.63 to 1.17 s of the clip), then the pose
    blends exponentially (18/s) with no overshoot.
  - The party layer holds CAST_HOLD 0.34 s (`src/render/allies/index.js`). The Healer holds
    0.28 s moving and 0.5 s still (`src/scenes/arena.js`). The camp holds 0.4 s
    (`src/scenes/camp.js`).
  - The Tank pilot already overshoots and settles into the next wind-up.
- Every hero should get the Tank pilot's settle.

**B6 [M] R/S ~.** A bigger last hit in the combo. *(v2, v5, never narrated)*
- v2's and v5's third swing is a leaping overhead chop. In v5 it throws the target about
  1.5 bw against about 1.1 bw for the first two hits.
- The hero hops about 0.55 bw. It is still in the air at contact, stretched about 14%
  taller.
- It lands 2 frames after contact, or 2 frames after the freeze ends, squashed 10 to 16%
  shorter and about 12% wider.
- The target is thrown about 40 to 50% further (v5: about 1.5 bw against 1.05 to 1.1; v2:
  about 1.3 against 0.85) and about 40% higher. The higher hop is render only, so it fits
  the safe route.
- Today: Kesh's 3-hit combo template already asks for directional variety. The Tank pilot's
  third hit is the crushing slam.
- Safe route: make the third hit the biggest visually (pose, VFX and sound). A shake on it
  is an ordinary-hit shake (§9 #7), so it waits for Kesh with F2 (§6.3 item 4).
- Kesh's call (sim, §6.3 item 13): a bigger knockback on the third hit. The sim keeps no
  basic-hit count today (its combo stacks count skills, and the rig counts its own swings
  on the render clock), so this needs a new sim counter and moves the goldens.

**B7 [M] R ✗.** Pop new bodies in with overshoot. *(v2, v3, the respawns)*
- A body grows from the floor in about 7 frames, with about 10% overshoot.
- Today: foes appear at full size after the violet spawn shimmer.

**B8 [M] R ✗.** Anchor effects to the rig part that makes them. *(v3, v8)*
- The core grows in the hand. The trail is traced from the blade tip.
- This needs each rig to expose a hand or tip point. The model standard's timelines make
  that natural, so every model slice should export one.

**B9 [M] R ~.** Lunge into the contact (melee). *(v5, v8)*
- The videos pull back about 0.35 to 0.4 bw 3 to 5 frames before contact, lunge about 0.85
  to 0.9 bw past rest, and lean 20 to 25° toward the target.
- Hold a squash at contact (+19% wide, −9% tall), then snap back in 2 to 3 frames. The
  finisher's hop and landing squash are B6.
- In Echoes the sim body never moves on a swing. Keep the lean and the squash at full size.
  Keep the travel to a lunge step that passes the model standard's root-motion check, like
  the Tank pilot's slam (its foot steps in about 0.16 u, `src/render/critters/tankfacet.js`).

### 2.6 Shots and spells in flight

**S1 [V] R ~.** Grow the core in the hand during the charge. *(v3)*
- A spark appears at the start of the charge and swells to about two thirds of the target's
  width in 2 frames.
- It holds there, pulsing between 0.6 and 1 bw, then shrinks a little on the frame before
  release.
- That same core launches as the projectile. In flight it is a white core about 0.33 bw in
  a glow about 1 bw long.
- Today: casts are instant, so the head appears at flight size. The Healer's staff gem
  halo swells on release.
- Safe route: start the head bigger at the hand and settle it to flight size over the first
  0.1 s or 1 u of flight. The Healer basic's 1.1 u muzzle blend is the precedent.

**S2 [V] R ~.** Make the head more than a dot. *(v3)*
- A hot core, a glow, and a trail about 2.2 to 2.5 target widths long.
- Today: every template head has a white-hot centre in a glow (`src/render/vfx/tplkit.js`).
  The tail is speed × 0.1 s, held between 0.45 and 2.0 u, times the square root of the
  shooter's weight (`src/render/vfx/boltfx.js`). Every shot flies at 4 to 9 u/s, so real
  tails run 0.45 to about 0.9 u, short of 2.2 to 2.5 target widths.

**S3 [V] R ~.** Stretch the head in flight. *(v6)*
- v6: the white core stretches to about 2 to 1 along the travel (1.2 to 1.4 bw long,
  0.6 bw across), with a tapered flame tail 1.5 to 2 times the core's length.
- The plain orb flies at the same speed and stays round, so the stretch is the lesson.
- Today the tail length scales with speed, and the blade template's fire comet runs its
  heat back into its flame. But the head keeps a fixed width and a round hot centre, and
  the magic orb's core is a round dot (`src/render/vfx/tplkit.js` `HEAD_FRAG`).

**S4 [V] R/S ~.** Vary every shot. *(v4)*
- Each shot gets its own angle (about ±6°), speed (about ±20%) and size.
- The tail is about half the shot's per-frame travel, so it reads like motion blur.
- Today:
  - Fans use a fixed, deterministic step: 12° for hero fans and for the Millwheel's and the
    Hollow Choir's shards, and 15° for the Barrow Crow's three feathers.
  - A basic stream flies the exact aim.
  - No two shots from the same skill or shooter differ. Head size is set by template, side
    and weight: 0.52 u for a hero and 0.56 u for a foe, times 1.25 for a blade comet, times
    the square root of the weight (2 for a boss, 1.5 for a champion). Every head has the
    same brightness except a hero blade comet, which runs softer. A bolt or shot flies at
    0.55 u; a glob arcs from 0.35 u to about 2 u (`src/render/vfx/boltfx.js`).
- Safe route (render only): per-shot size, brightness and height jitter from the cosmetic
  stream. The jitter multiplies those values; it does not replace them. Globs keep their
  lob arc.
- Kesh's call (sim, §6.3 item 6): a real random spread. It changes hit lines and moves
  the goldens.

**S5 [V] R ✗.** Drain the trail into the hit point. *(v3, v6)*
- On impact, the trail keeps flowing into the hit point for about 5 frames instead of
  vanishing.
- Today the head flares open and the trail dots fade where they lie.

**S6 [V] R ✓.** Keep the shot straight and arc everything that flies off it. *(v6)*
- v6's "nothing flies straight" covers the secondary elements: sparks, embers and numbers.
  Its fireball flies a straight line in every demo.
- So straight bolts stay straight on the ground (BUILD_BRIEF §6), which Echoes already
  does. A thrown lob may arc upward if it keeps its true ground track and its shadow, as
  enemy globs do.
- The arcs belong to P2 (particles, already ballistic) and N2 (numbers, missing).

**S7 [V] R ✗.** Light the floor under the shot as it flies. *(v3)*
- v3's orb warms the floor under it in flight. 1 to 2 frames before contact it also tints
  the target's near side (R6). No patch size was measured.
- v4's light does not travel. It stays at the muzzle and flickers with the flash.
  - On the starburst frame it lights about 2.2 × 1.7 bw round the muzzle. On the flame
    frame it lights about a quarter of that area, and on the third frame nothing.
  - It also warms the shooter (+8 to 11%) and the target (+17 to 20%, R6).
  - No floor light was seen under its tracers.
- Today the light pool appears only at release and at impact, so nothing lights the floor
  while the shot flies.

### 2.7 Layers and lifetime (the lightning lesson, for every effect)

**L1 [V] R ✓.** Build from colour to white. *(v1)*
- The order: the path in a mid-value colour, a broad soft glow under it, a narrower and
  brighter glow, the accents, and the white core last.
- Each outer layer is darker, more saturated, wider and fainter.
- Today: §19.4 and design-VFX §11 already ask for "a hot white core over its colour".

**L2 [V] R ~.** Exaggerate the shape. *(v1)*
- Use straight segments and hard angles.
- Push each corner about 0.04 to 0.08 bw further out along its turn, and add one or two
  kinks.
- Straightening and pushing together make the bolt about 16% wider. The push alone adds
  about 6%.
- Make the bends fat (4 to 5 times the run width) and the runs thin.

**L3 [V] R ~.** Taper every stroke. *(v1, v8)*
- In v1 the width swells fast, peaks at about 20% of the length, then thins in a straight
  line to a point.
- v1 shows the wrong way: its "BAD!" stroke keeps one width (6 to 7 px) and has blunt
  ends. Its "GOOD :)" stroke goes "THICK TO THIN!".
- A swing trail (v8) is thickest at the blade, about 0.65 to 0.95 bw on screen, and thins
  to a point toward the swing's start, where T4 fades it out.

**L4 [V] R ✗.** Animate with drawings, not by moving one drawing. *(v1)*
- Use 3 to 5 distinct drawings, swapped every 2 ticks.
- Drawing 1 is the thickest and brightest and carries the flash. Then the effect thins,
  breaks into 3 pieces, then into fragments, and is gone.
  - Drawing 4 breaks the bolt at two of its bends, with gaps of about 0.17 bw (23 to
    26 px).
  - Drawing 5 keeps one short fragment near the middle of each piece, about 0.1 to 0.3 bw
    (13 to 44 px) long.
  - At real speed drawing 5 ends with a hard cut, not an alpha fade. It is already nearly
    gone (core 4%, glow 5 to 12% of drawing 1). The narration's "fade" is an 8-frame fade
    seen only in the slowed demo.
- The bolt lasts 0.17 to 0.2 s, or 0.25 to 0.33 s with the flash tail.
- The core dies faster than the glow.
- A held effect breathes ±3 to 5% on a 0.2 to 0.5 s cycle.
- Today there is no flipbook primitive. The holo glitch reseeds at 20 Hz, which is the
  closest thing.

**L5 [V] R ~.** Impacts hold 3 to 5 frames at full strength. *(v3)*
- v3's bloom is over 90% of its peak for 3 frames (1 to 3 after contact), still above half
  on frame 4, and gone by frame 7.
- This agrees with §19.4.
- Not lightning. v1's strike peaks on drawing 1 only (1 frame, 2 ticks). The core is at half
  its area on the next drawing, and the screen lift is at 0.66 of peak on +1 (L4, §3.4).
- What holds in v1 is the target's reaction (the 8-frame hurt tint), not the effect.
- Today the impact star is at full strength only until 50 ms, and the default flash until
  66 ms (`src/render/vfx/kit.js` `stepStar`, `FLASH_HOLD`). That is 1.5 to 2 frames (3 to
  4 ticks). Hold them 100 to 167 ms (6 to 10 ticks).

### 2.8 Kills and finishers

**K1 [V] R/S ~.** Make the last hit the biggest. *(v2, v3, v4)*
- A 5-frame freeze instead of 3 (v2).
- A flash about 2 times the area, bright for 5 frames instead of 4 (v3). It stays a local
  bloom around the target.
- A shake at the top of the normal range, not above it: about 1.4 times a median hit (v3,
  4.3 px against 3.1).
- In v2 each kick stays in the normal band (≤ 12 px of 576). The shake runs through the
  whole 5-frame hold, with two big kicks before it decays.
- The kill gets bigger mostly in the flash and the pop, not the shake.
- A callout timed inside the hold (v2 "POP!").
- A camera punch-in of about 7% (v4).
- Today:
  - The sim already goes the right way: 3 ticks of hitstop against 2, and the kill shake.
  - The killing blow's own `hit` plays the same flare and number as any hit. On the same
    tick, `death` adds a bone-white burst flare (size 1.0, against 0.55 for a basic hit), a
    1 u ground ring in the body's matter colour, and the template's kill flourish (a fire
    blast for blade, a 3 u light beam for magic). So the kill already has a bigger flare and
    a ring; the safe route tunes those rather than adding new ones.
  - The kill cue is only 1 dB louder than a hit.
- Safe route: flag the killing `hit` in the render (the target is gone that tick).
  - Hold the death flare bright for 5 frames. A star stays at full strength for only its
    first 50 ms today (`src/render/vfx/kit.js` stepStar, L5). By size the flare already
    covers about 2 times a hit's flash area or more (1.0 against 0.55 on a basic hit and
    0.75 on a skill hit), so the gap is the hold, not the size.
  - Keep the ground ring brief. It expands outward fast and is gone within about 0.25 s
    (0.35 s today, `enemyDeath` in `src/render/vfx/signature.js`), so it never reads as a
    telegraph (§4.3). It keeps the body's matter colour, never Ember. Any Ember ring, such
    as a Molten elite's core, draws over it.
  - Play a heavier sound. Its weight comes after the hit, as a rumble, not as a louder
    first thump (A6).
- Kesh's call (sim): a 5-frame (10-tick) kill freeze, against 3 ticks today (F1, §6.3
  item 1).

**K2 [M] R ~.** Pop it like a balloon. *(v2)*
- Hold the white body still through the kill freeze. The swell starts on the first frame
  after the freeze, as the attacker recoils (+5 after the 5-frame freeze).
- Swell over 2 frames to about 1.3 to 1.45 times wide and 1.3 times tall, so the body turns
  rounder. The base stays on the floor and the body stays white.
- On the next frame (+7, 233 ms), swap the body for a tight clump of cubes in its own
  footprint, with sparks inside.
- Then burst the clump into several dozen cubes in the body's own colours, each about 0.15
  to 0.25 bw, plus extra sparks. All of it is gone in about 0.8 s.
- Today the shape is close, but the order is not. The pop is a stretch for 0.09 s, then a
  flatten and spread, gone at 0.26 s. The burst does not wait for the swell: it fires on the
  `death` event as the stretch starts, with 10 sparks, 8 chunks, 4 smoke puffs, a bone
  flare, a ring of the body's matter and 6 motes. The swell is a tall stretch, not a round
  inflate, and the burst is smaller.

**K3 [M] R ✗.** Burn it to ashes, for fire and blade kills. *(v3)*
- Counted from the contact frame (§3.2): the kill flash on +1 (K1). A ground ring about
  4 bw across on +4 to +9, gone by +10. A scorch decal about 2 bw wide from +6, and it
  stays. Flames on the lower body on +6 to +12.
- From +11 the body is a see-through ember husk. A glowing edge eats it from the top down
  at an even speed, and the body is gone at +32 (1.07 s). The dissolve takes about 0.7 s.
- Ash rises from about +28 until about 1.37 s.
- Today: three foes turn to ash in their own death recipes: the Barrow Wyrm, the Cinder
  Moth and the Ash Wraith. No hero kill turns a body to ash.
- Colours: the video's crimson ash would sit by Ember and Foe Crimson. Hero kills use
  charcoal and gold embers.
- Conflict: fire on a dying body, plus a ring and a scorch, reads like a Molten elite's
  death (a lava-orange #FF8A3D core under an Ember ring, then a 1.3 u burning pool).
- Hero fire here stays Blaze Gold and Blaze Core, not Flame orange. The ring is gold and
  fades with the flash. No flame is left on the floor after the dissolve.
- It never plays on a Molten elite's own death.
- Echoes keeps §9 #6's squash-stretch pop on the kill (K2), so the burn ends in the pop.

**K4 [M] R ✗.** Throw the body. *(v4)*
- On the kill, the body holds upright and white for 2 to 3 frames (4 to 6 ticks).
- Then it topples about 90° in 4 frames (easing in) along the last hit's direction and
  hits the wall.
- It slides back about 0.5 bw, tinted darker, and rests about 0.67 s after it lands
  (0.87 s after the kill frame).
- Today: the pop plays where the body stood, and `death` has no direction.
- Safe route: cache the last hit's direction for each rig, then fly and topple the dying
  rig along it before the pop.
- Echoes keeps no corpses (§9 #6), so the throw ends in the pop.

**K5 [V] R ✓.** Leave a mark that stays. *(v3, v4)*
- Today every kill leaves a charcoal decal for 20 s (a cap of 40) and a 3.5 s stain in the
  body's own colour.

### 2.9 Aftermath and mess

**D1 [V] R/S ✗.** Let a fire hit's burn die down. *(v3)*
- A thin bright rim, about 5% of the body width (2 to 3 px of 576), lights one frame after
  the hit and flares for about 8 frames.
- It holds at a third to a half of its brightness for about 0.8 s, then fades over 0.25 s.
- Each new hit re-lights it. In v3 a target hit once a second never cools, so it reads as a
  lasting burn.
- An inner glow fades more slowly, over 1.3 s or more.
- Today: on the heroes' side, only the Kiln Coal relic sets a foe alight (a bomb burst
  burns it for 4 s). The Fire Bomb leaves a burning patch on the floor for 3 s, not a burn
  on the body. Both flames stop at full rate instead of dying down. On the foes' side, the
  Molten and Cinder elite powers leave burning ground.
- Conflict: a burn drawn on a body with no burn rule shows a status the game does not have,
  and it looks like the Molten and Cinder elite powers.
- Safe route: a gold rim of 0.8 s or less on blade-template hits, plus a taper on the two
  real burns.
- Kesh's call (sim): a real burn status (§6.3 item 9).

**D2 [V] R ~.** Leave a mess on the floor. *(v4)*
- Spatter both ways from each hit, and leave it on the floor.
- In v4 the blood and the shells never fade.
- The order: an entry puff on the hit frame itself, a splash on the surface behind 2 frames
  later, then droplets back toward the shooter from +3.
- 10 to 20 droplets a burst land 1 to 1.5 bw short of the target, on the shooter's side,
  within 10 to 12 frames. The splash behind grows to about 0.75 × 1 bw.
- v4 ejects one casing per shot, and they pile up at the shooter's feet. Nothing in Echoes
  fires a gun, so Echoes draws no casings.
- Today: kills leave 20 s decals. Skills leave class marks for 1.8 to 3.2 s, and other
  floor marks last 0.8 to 8.5 s (Appendix B 6).
- Conflict: red blood collides with Ember, Foe Crimson and the pain crimson. The splat is
  charcoal by ruling.
- Safe route: spatter in the body's own matter colour, and leave arrows stuck in the floor
  for a few seconds.

**D3 [V] R ~.** An element leaves its air behind. *(v9)*
- About 100 tiny twinkles and a faint mist hold the place for 1 to 2 s.
- Today: the Frost Bomb throws 8 mist puffs and leaves a 5 s rime mark. Each foe it hits
  gets a 0.4 s frost star and 3 shards, then only the plain stun glyph for 1 s and the
  Signal Blue slow ring for 4 s. No frost air lingers on the foe. A boss is immune to both
  and shows neither.

### 2.10 Damage numbers

**N1 [V] R ~.** Pop the number, then settle it. *(v3, v6)*
- It appears white at about 1.4 times size and snaps to its resting size in 2 frames.
- v6: it pops big and white and holds through the freeze. Two digits are about 0.73 bw wide
  and 0.5 bw tall, about 1.4 times the plain number. Within 3 frames it shrinks to about two
  thirds of that (0.48 bw wide, 0.33 bw tall) and turns orange. It reads as an event first
  and a value second. In Echoes your own numbers settle to Hearth Amber. Everyone else's
  hits on foes stay Bone. Heals never pop white: they stay Bright Heal from their first
  frame (§4.3).
- Today there is a 120 ms pop-in overshoot (0.5 on your own numbers, 0.8 on crits).

**N2 [V] R ✗.** Drift the number on an arc. *(v3, v6)*
- v3: it drifts sideways about 0.35 to 0.45 bw (16 to 21 px of 576), either way, and up
  about 0.1 to 0.25 bw on a shallow arc that sinks a little at the end. It shrink-fades over
  its last 2 frames and lives 21 to 22 frames (about 0.7 s).
- v6 ("Nothing flies straight. Not the sparks, not the damage numbers."): a steady
  sideways drift (1 to 1.4 bw in all) plus an upward kick that gravity bends. The apex comes
  at +13 to 16 frames, about 0.9 bw up, then it falls a little and fades over its
  last 2 to 4 frames. It lives about 23 frames (0.77 s).
- Alternate the side from hit to hit.
- Today the number rises straight up in world y, with no drift (`src/render/numbers.js`).

**N3 [V] R ~.** Make crits bigger and tag them. *(v3)*
- The digits are about 1.55 to 1.6 times taller, and a "CRIT!" tag pops one frame later.
- The crit spawns white, tilted and blurred, about 1.7 times as tall as a normal spawn, then
  settles.
- In v3 only the number escalates. The crit keeps the normal hit's boom, flash and shake.
- Today: crits are 1.4 times taller, with no tag.
- The video's deeper orange would drift toward Ember. Keep Hearth Amber.
- The tag is new player text, so it needs all ten languages.

**N4 [V] R ⚠.** Keep the numbers small. *(v3)*
- Kesh's look for your own numbers (1.22 times, weight 900) and the §17 floor of 20 px
  stay. "Small" applies only to other players' numbers, which are already 0.7 times.

### 2.11 Sound

**A1 [V] A ~.** Put the thump within ±1 frame of the contact. *(v2, v8)*
- v2's thump: a 52 to 56 Hz body that starts in the first half of the contact frame and
  peaks 17 to 50 ms later.
- It dips 10 to 20 dB at +67 to +100 ms, comes back and holds to about +230 ms, and is
  10 dB down by about +350 ms.
- A softer 80 to 2000 Hz knock follows at about +175 ms. It keeps that offset with or
  without the freeze, so it is part of the sample.
- There is no separate high crack at contact, unlike v3's spell boom (A3). The airy noise
  in v2 is the swing whoosh (A2).
- Today the `impact` cue plays on the hit's own event (see the I1 caveat).

**A2 [V] A ~.** Start a whoosh with the wind-up and the cast. *(v2, v3, v6, v8)*
- v2's swing whoosh is airy noise, 2 to 10 kHz. It starts abruptly with the wind-up, 7 to
  9 frames before the contact. It holds from about −3 to +4 frames, so it carries through
  the contact, and fades by +10 (about 0.6 s in all).
- v8's sword whoosh is broadband air at 5 to 16 kHz, peaking about 2.5 frames before the
  first white frame (timing in §2.15).
- v3's fire whoosh is a breathy broadband noise, strongest at 100 to 600 Hz. It starts on
  the release and tails off by mid-flight (about 350 ms). The 12-frame charge itself is
  silent.
- v6's throw starts on the release, not with the wind-up. The 10 to 11 frame lean and the
  gather are silent. The throw is a low whoomp peaking near 126 to 132 Hz, with a partial
  near 200 Hz, decaying over about 330 ms.
- Today: melee has `swing`, whose noise is centred on only 0.7 to 2.6 kHz
  (`src/audio/cues.js:134`). A damage spell plays `cast_damage`, a 120 ms saw zap. Heals,
  zones, novas, auras and class skills have their own cast cues. The `whoosh` cue plays on
  a hero's dash, vault or lunge, and when an AI ally runs to a revive. No whoosh plays with
  a cast.

**A3 [V] A ~.** A boom on a spell's impact. *(v1, v3, v6)*
- v3: a 43 to 48 Hz body, a 5 to 16 kHz crack for 2 to 3 frames, and a tail of about 0.3 s.
- v1's lightning: an instant-attack boom whose peak falls from about 160 to 40 Hz in the
  first 0.3 to 0.35 s. A crackle above 4 kHz holds under it and carries the tail. The whole
  sound lasts 0.5 s, then cuts hard.
- v6: a 44 to 50 Hz sub with a body at 117 to 122 Hz and crackle up to 8 kHz, about 7 dB
  over the throw. It starts on the contact, the first held frame, and peaks through the
  3-frame hold. It is 20 dB down by about 350 ms. The burst after the hold gets no second
  sound.
- Today: a hit on a foe plays the same short `impact` snap, pitched down on melee arcs
  (0.85) and bosses (0.7). A crit adds a `crit` chime. Only the Tidecaller's Riverbolt and
  Torrent add a body layer, a splash from a `hit` override (`src/audio/tidecues.js`). Real
  booms exist only for blasts.
- Safe route: a `hit` cue module, registered like the Tidecaller's, that maps the source
  skill to an impact family (spell boom, arrow thunk, blade cut). Overrides stack and a
  non-null one replaces the built-in cue, so the module returns null for her bolts.
- A blade cut keeps a low body under it: v8's sword hit is a 48 to 52 Hz boom with energy
  at 1 to 3 kHz, falling 25 dB in about 240 ms.

**A4 [V] A ~.** Four sounds per shot. *(v4)*
- A crack at the muzzle, a whiz in flight, a thud on the body, a ping off the wall.
- Today: the shot and the thud exist. A ping exists only for bounces. There is no in-flight whiz.

**A5 [V] A ~.** Use few samples and nudge the pitch. *(v4, v5, v8)*
- v5's sword ring spreads its pitch over about 2.4 semitones (2.0 to 2.3 kHz).
- Some hits play a second, inharmonic bell instead (partials 1 : 1.08 : 1.34, base 1.5 to
  1.7 kHz). It swells through the freeze.
- It was heard on 4 of the 11 hits that could be read. Pick between the two sounds at
  random. The video cannot show a fixed every-4th swap.
- v8's boom keeps one pitch on all 12 hits (48 to 52 Hz, no audible jitter), so it supports
  few samples, not the pitch nudge. A second sample variant may play on 2 or 3 of the 12
  hits (low confidence).
- Today every play gets ±2.5% pitch jitter (under 1 semitone), and noise recipes bake 2
  variants played in turn.
- Widen the jitter on the impact families to about ±6% (about ±1 semitone). The 2 baked
  variants played in turn already cover a few-sample swap like v8's.

**A6 [V] A ~.** A heavier sound on the kill. *(v4, v3)*
- v4 (low confidence: the narration overlaps): the low end drops out briefly (about 40 to
  60 ms) as the gun stops. Then two thumps land about 0.16 to 0.2 s apart, one on the throw
  and one on the landing. With the thumps, the kill's sound rings about 0.45 s past the
  last shot. A normal burst rings 0.05 to 0.25 s.
- v3: the kill's first thump is 7 to 8 dB softer than a normal boom (30 to 90 Hz). The
  weight comes after it: a low rumble (30 to 150 Hz) with 5 to 16 kHz crackle bursts, from
  about +9 frames for at least 0.5 s, under the burn-to-ash dissolve.
- Today the `kill` cue is only 1 dB over `impact`.

### 2.12 Camera

**C1 [V] R ~.** Kick the camera on the player's own shot. *(v4)*
- Push the camera against the fire direction on every shot. The push is about 4 px of 576
  net per shot (about 0.08 bw) and adds up to about 0.4 bw over a 5 to 6 shot burst. It
  can be a steady push or kicks of 3 to 7 px with small recoveries. The total is what you
  see.
- The push matches the shooter's own push back, so the shooter stays near its screen spot
  while the world slides.
- After the last shot the camera holds about 0.25 s, then eases back over about 0.6 s
  (about 0.9 s in all).
- A zoom punch of about 3%, on the first shot of a burst only, gone in 6 to 7 frames (200
  to 230 ms). Later shots in the burst add no zoom.
- Echoes: 0.4 bw is about 0.26 u, nearly 3 times the 0.09 u camfx clamp (C2).
- Today: only Feather Fan, Torrent and Knell kick back. design-VFX §4's Archer and Healer
  rows ("no kick on release", "no kick on casts") are history (CLAUDE.md), not a ruling,
  but they describe today's look.
- A kick on Archer and Healer shots changes that look, so it waits for Kesh (§6.3 item 7).

**C2 [V] R ~.** Punch the camera in. *(v4, v5, v7, v8)*
- The punch is a zoom pulse, not a slide. Four of the videos use one:
  - v8, every sword contact: about 1 to 1.5%, plus a 3 to 7 px kick that flips once,
    settled in 4 to 6 frames.
  - v7, the chest snap: about 1.8 to 1.9%, easing out over about 20 frames, with a 3 px kick.
  - v4: 3% on the first shot of a burst, gone in 6 to 7 frames. 7.4% in one frame on the
    kill, decaying over 7 to 10 frames.
  - v5's climax: about 10 to 12% on the release (8 to 16% across demos), back to normal in
    3 to 4 frames.
- Today:
  - The FOV is fixed at 45°.
  - The camfx dolly exists, but the total offset is clamped to 0.09 u, under 1% of the
    12 u camera distance.
- Safe route: an FOV channel in camfx with its own clamp, under the same Screen shake and
  Effects gain. 3% is about 1.2° of FOV, and 6% about 2.3°.
  - About 1.5% on your own melee contacts, and up to 3% on heavy hits and on combo
    finishers that do not kill. These are ordinary hits (B6), so they wait for Kesh with
    F2 (§6.3 item 4).
  - Up to about 6% on elite, champion and boss kills. These need no call.
  - About 2% on a chest snap. It starts on the second held frame and is gone by about
    0.67 s. One fixed curve for every open is fine (O3).
  - Off when Effects is Reduced.
- Kesh's call (§6.3 item 12): anything near v5's 10%. A zoom that big could push threats
  out of frame. No ruling covers threats: BUILD_BRIEF §22 only says the player never leaves
  the frame.

**C3 [V] R ✓.** Keep camera motion under the settings. *(house rule)*
- Today camfx is scaled by Screen shake (0, 0.5 or 1) times Effects (Reduced = 0).

### 2.13 The anime frame (v5)

v5's plain hit is already juicy: a white flash for 2 to 3 frames, a hop knockback of about
1 bw, sparks and a ring sound. Its point is that juice alone is not the anime look. The anime
look lives **inside a long freeze**, and stylised full-screen panels replace the frozen
frames. They do not add time.

Every demo cycles the same 3-hit combo: an upswing, an overhead arc, and a leaping overhead
finisher. The finisher throws the target about 1.5 bw, against about 1.1 bw for the other
two, in every step. The hero pulls back about 0.35 bw 3 to 4 frames before contact, lunges
about 0.9 bw past rest, and holds a squashed lean at contact (+19% wide, −9% tall) (B9). On
the finisher it is stretched in the air instead and lands squashed 2 frames after the
release (B6).

**X1 [V] R/S ⚠.** A long freeze for a climax hit. *(v5)*
- 9 to 10 frames (300 to 333 ms) from the contact frame, with no ease in or out.
- The attacker, the target and the trail hold. The sparks keep flying (about 1.75 bw during
  the hold), and the ring sound keeps playing.
- The target stays white for the whole freeze plus 2 frames.
- The damage lands on the contact frame, not on the release. The HP bar drops at once, with
  no drain.
- This is about 3 times v2's freeze. It suits a rare beat (a combo finisher, a crit, a boss
  stagger), not every hit.
- Today: 2 to 3 ticks of sim hitstop. An 18 to 20 tick sim hold is Kesh's call (§6.3
  item 1).
- The render-only route, for rare beats, holds the attacker's pose and the hit VFX only. The
  target's position, pose, wind-ups and telegraphs follow the sim through the hold (§4.3).
  It may stay white.

**X2 [V] R ⚠.** Silhouette panel: ink on paper. *(v5)*
- For the first 3 to 4 frames of the freeze, the whole screen becomes white paper, about
  94% white.
- On it, only black ink line art: the attacker, the weapon, the target and the slash as one
  tapered brush crescent. Each is drawn at its exact screen position and scale.
- The floor, the HP bar, the glows and the sparks are gone. The UI captions stay on top.
- The panels are an ink render of the live scene, plus burst overlays in screen space.
- The panels replace frames inside the freeze. They never set its length.
- After a lone silhouette panel, the colour scene comes back still frozen for the rest of
  the 9 to 10 frames. Motion starts when the freeze ends.
- When the panels fill the freeze (X3 to X5), only 1 held colour frame is left, and motion
  starts on the frame after it.

**X3 [V] R ⚠.** Invert flicker. *(v5)*
- The freeze is filled with 5 panels that alternate black and white every 1 to 2 frames.
  The panels change about 17 times a second, which is about 8 full black-and-white cycles a
  second. Each anime hit makes 5 to 6 full-screen reversals in 0.27 to 0.3 s.
- It opens on a black frame holding only a thin white slash line through the contact point,
  about 3.2 bw long on the finisher and 3.6 to 4 bw on the other two swings, tapered, at
  most 0.3 bw thick. Its slant changes with the swing: `/` on the finisher, `\` on the
  other two.
- The black panels are the exact negative of the white ink panel, never of the colour
  scene. The UI is never inverted.
- Conflict: with hits every 0.9 s that is 3 or more full-screen flashes a second, at or over
  the usual limit (WCAG 2.3.1, photosensitivity). It would also blank every telegraph in a
  co-op fight.

**X4 [V] R ⚠.** Burst lines on the panels, all centred on the contact point. *(v5)*
- About 30 to 50 thin black focus lines coming in from every edge. They leave a clear centre
  round the figures, about 5.7 by 4.8 bw.
- A red jagged splat of 12 to 16 spikes with white droplets, reaching about 3.5 to 4 bw.
- A huge black brush star of 8 to 10 points, with 2 to 4 red rays.
- On the last panel, a thick white ring round a spiky black core. Between its two frames
  the inner edge grows from about 4 to 4.5 bw to about 5.3 to 5.5 bw from the hit, about
  0.9 to 1.4 bw a frame (measured on the finisher).
- Black, white and one red accent only.
- One graphic per panel, after X3's opening cut line:
  - White panel: the ink silhouettes plus the focus lines.
  - Black panel: the red splat and the white droplets.
  - White panel: the black spike star and the red rays. The figures turn white with black
    outlines.
  - Black panel: a spiky black mass inside the expanding white ring. The figures are white
    line.
- Detail grows panel by panel inside the 300 ms.

**X5 [V] R ⚠.** Punch in on the release. *(v5)*
- The first colour frames come back about 1.1 times zoomed, about the screen centre.
- The camera springs back to 1.0 in 3 to 4 frames (100 to 130 ms), while the knockback and
  sparks play.
- "Snap back with colour" is the full-colour scene returning after the black and white
  panels. There is no colour grade.

**X6 [V] R ✗.** Pro tip: hide something. *(v5)*
- This is an easter egg, not hiding part of the fight. In the pro-tip and outro demos only,
  a tiny white figure (a miniature capsule holding a sword, about 0.4 bw) is planted in the
  ring panel for 1 to 2 frames. It can only be seen frame by frame.
- It does not conflict with "effects never hide a character".

**Echoes, two routes for the anime frame.** As written, X2 to X5 need Kesh's call: a long
freeze (§6.3 item 1), full-screen panels that blank the reserved colours, a flicker at or
over 3 flashes a second (both item 8) and X5's punch-in near 10% (item 12). No Echoes rule
caps full-screen flashes yet; §4.3 proposes one. (The only written 3 Hz cap is the telegraph
pulse, BUILD_BRIEF §17.) Both routes below keep to that proposal. Only the first also
stays inside the rulings:
- *Local anime frame:* inside a disc about 3 bw in radius round the contact point (the
  focus lines run in from its rim and leave the figures clear), draw the ink silhouette, the
  focus lines and the spike star for 3 to 4 frames. It plays only on combo finishers and on
  elite, champion and boss kills. The rest of the screen keeps its colours and telegraphs.
  There is no polarity flicker. On an elite, champion or boss kill, an FOV punch of up to
  6% (about 2.3°) plays on the release (C2). A combo finisher's punch of up to 3% (about
  1.2°) waits for Kesh with F2 (§6.3 item 4).
- *Full-screen, once:* only on a boss or champion kill, when no telegraph is live. One
  silhouette panel and one burst panel, with no alternation, so 2 flashes. Off under Effects:
  Reduced. A hidden easter egg in a panel is allowed. Kesh's call (§6.3 item 8).

### 2.14 Opening a chest (v7)

v7 has no sound at all, so it teaches nothing about audio. Echoes' beat rule asks for one
visual and one sound when the opening fires. Today each chest open plays one cue: `vk_open`
for the vault chest, `ch_chest` for the champion chest, and `sr_relic` and `sr_cache` for
the secret reliquary and cache. The Trapped Chest's lid snaps open on `ev_ambush` as its
ambush springs, and its `ev_chest` plays later, when its coins pour out. The vault,
champion and reliquary cues already stack a lid sound under a rising peal. The juice is all
timing and layers on the same chest model: "Same chest, way more juice."

Its canonical timeline, the same in every demo, counts from the release frame S.

**O1 [M] R/S ✗.** Wobble faster and faster. *(v7)*
- Rock the chest onto one bottom edge, then the other, for about 0.7 to 0.9 s (about 3.5
  swings).
- Each swing is a little quicker: the period shrinks from about 280 to 300 ms to about
  230 ms, and to about 200 ms only on the last swing.
- The tilt is small, about 2 to 2.5° on screen. The lifted corner rises 8 to 10 px on a
  202 px base, and the body's centre lifts 3 to 5 px. The swing size stays about the same
  and drops only on the last half-swing.
- It flows straight into the press.

**O2 [M] R/S ✗.** Press and tremble. *(v7)*
- Squash for 14 to 15 frames (about 0.5 s) to 0.92 height and 1.07 width, keeping the volume.
- About 90% of the depth arrives in the first 8 frames, then it creeps.
- Keep it alive with a tremble of 1 px or less: the outline changes every frame.
- O1 and O2 together run 1.2 to 1.4 s, which does not fit before the snap inside the
  1.4 s vault reveal (`VAULT_RULES.revealSec`, a sim number). The safe route below starts
  the wobble before the press instead. A longer reveal is Kesh's call (§6.3 item 11).

**O3 [M] R ✗.** Snap. *(v7)*
- S: un-squash in 1 frame and start to rise. The lid is half open, and the padlock flips up
  off the hasp.
- S+1 to S+3: the lid is fully open, 4 to 5 times faster than a plain open. The chest hops
  about 8% of its width (7% above rest, 9% above the squash), tipping slightly, and narrows
  1 to 2%.
- S+4 to S+7: the frame holds for 4 frames (133 ms; 3 to 4 on the smaller chest) at the top
  of the hop, the padlock hanging in the air. The stars and the light sheet hold too. Note
  the hold sits at the apex, not at the start.
- S+5 to about S+25: a camera punch that starts inside the hold. It is mostly a zoom pulse
  peaking at about 1.8 to 1.9% on S+6 and S+7 and easing to nothing by S+25 (about 0.67 s),
  with a first kick of about 3 px and then ±1.5 to 2 px of jitter, flat by S+10. The text on
  screen does not shake. The camera move outlasts the hold about 5 times.
- S+8 to S+13: the open lid settles and the chest lands on S+11. (Whether the lid swings past
  open could not be measured.)
- The padlock tumbles down the front, hits the floor about S+31, settles by S+35, and stays
  there as evidence.
- Anticipation against release is about 12 to 20 to 1: 1.2 to 1.4 s of build-up against a
  67 to 100 ms pop.
- The copier's chest, the video's "no juice" example, also wobbles, presses and stands still
  (about 0.57 s in all), then pops open in 1 to 2 frames. Its light is a flat burst and a ray
  fan laid on top.
- It has no tremble, no hop, no freeze after the pop, no camera move, no loose part, no inner
  light and no later particle beats.
- Its build-up is a token one: 0.57 s against 1.2 to 1.4 s. Both halves count. The build-up
  must be long and must speed up, and the snap needs its layers.

**O4 [V] R ~.** Light from inside. *(v7)*
- S: for 1 frame, a thin bright cream line traces the rim, as if light escapes the gap. It is
  about 1.0 times the chest's width.
- S+1 to S+5: a flat cream light sheet at rim height expands with an ease-out from about 1.2
  to 1.55 times the chest's width. It is about 35 to 40% opaque with a brighter edge. It
  holds through the freeze, breaks up from its edges over S+8 to S+10, and is gone by S+11
  (about 0.33 s in all).
- The contents become emissive: a blooming yellow-white hot core (about #FFF589, white at its
  peak), where the plain coins are flat unlit yellow.
- From about S+4, 3 to 5 soft tapered shafts fan up from the contents. Each is about 0.45
  chest widths long and 0.05 to 0.07 wide. They change fast for the first second, then turn
  and shimmer slowly for more than 2 s ("slow turning rays"). The count and the speed are
  rough.
- The palette is warm cream and gold with no reds.

**O5 [V] R ~.** Stars that pop and sparks that rise. *(v7)*
- On the release, 8 big five-pointed stars (0.09 to 0.16 of the chest's width) burst up
  about 0.65 chest widths with an ease-out, and hang in an arc.
- From about 0.87 s, they pop one at a time in random order over about 0.7 s. Each swells to
  2 times its size and whitens over 3 to 4 frames, shows a hollow outline for 1 to 2 frames,
  then dims and vanishes, throwing a small scatter of tiny spark dots.
- Tiny sparks (about 0.01 to 0.04 chest widths) twinkle and drift up from the release on.
  There are 7 to 21 on screen before the pops and 9 to 43 during them. Each blinks for 1 to
  3 frames.
- The reward keeps firing after the impact.

**Today in Echoes.**
- The vault chest's lid swings open at once on the press. After a 0.06 s gather, two gold
  pillars, a flash, a light pool, a shock ring and a floor sigil fire, and 40 sparks rise
  with 30 gold chunks. A gold geyser fades over 2.4 s. The two fixed light shafts and the
  floor rune rings brighten (the rings turn all the time).
- The camera already pushes in toward the vault chest and kicks, inside the shared 0.09 u
  camfx clamp, gone within 0.5 s. O3's punch would stack on that.
- There is no wobble, press, snap or hold.
- The champion chest sways slowly (never faster) and opens on a 0.45 s cubic ease.
- The Trapped Chest's lid twitches now and then as a lure.
- The draft arrives 1.4 s after the press (`VAULT_RULES.revealSec`, a sim number).

**Safe route.** v7's build-up (1.2 to 1.4 s) does not fit before the snap inside the 1.4 s
reveal. *My version*, render only:
- Start the wobble when the hero comes near, before the interact reach, so it has run for a
  while by the press. Its swings come faster as the hero closes in (the chest "fights to
  open").
- On the interact press, finish the wobble and the squash in about 0.45 s and snap at about
  0.5 s. This part alone is shorter than the copier's 0.57 s "no juice" build-up, so never
  play it without the wobble before it.
- Only the end of the wobble, the squash, the snap and the hold must fit inside the reveal.
  The star pops (0.87 to 1.5 s after the snap), the rays and glow (over 2 s) and the rising
  sparks run on after the reveal, as today's 2.4 s gold geyser does. They are render only.
- The hold is a render pose hold, since the sim has no hitstop outside a fight.
- Apply the wobble, press and snap to the vault chest (a press, the 1.4 s reveal) and the
  secret reliquary and cache (a press, 1.2 s, `SECRET_RULES.revealSec`).
- The champion chest has no press: it opens by itself at the room clear, and today the draft
  comes up on that tick. It gets the snap, the light and the stars on the open, then a short
  UI-only hold before the draft, like the 1.5 s take hold (`TAKE_HOLD_MS`). It rises from
  the floor at the champion's fall (`champion_fall` in `src/render/enemies/champions.js`),
  so it can wobble from then to the clear.
- The Trapped Chest keeps its lure twitch as its tell, and gets no wobble. Its press springs
  the ambush at once: the lid snaps open on Ember sparks from the lock (a threat). It gets no
  light and no stars on the press. If it gets any, they play when its reward pays, after the
  fight (`event_chest`).
- Kesh's call: a longer reveal instead (§6.3 item 11).

### 2.15 Sword swipes (v8)

v8 builds the trail of a 3-hit combo in five steps. The hit reactions stay the same in every
version, so the comparison isolates the trail.
- A white flash of 4 to 5 frames. The white target is 14 to 17% taller (the top rises, the
  base stays), same width.
- A 3-frame body hold (the impact frame plus 2), while the trail keeps animating.
- A launch of about 0.9 bw back and 0.4 bw of true lift, tilted up to 10° away, 6 frames in
  the air. It lands about half a bw out.
- A 1-frame landing squash (+11 to 13% wide, −9 to −11% tall; once up to +20% wide and −15%
  tall), then a 2-frame stretch (+8% tall, −5% wide). The third hit lands no harder than the
  first two: v8 has no finisher.
- A camera punch: a zoom of about 1 to 1.5% plus a 3 to 7 px kick that flips direction once
  and settles in 4 to 6 frames.
- The hero crouches back about 0.4 bw in the wind-up, lunges about 0.85 bw past rest on
  contact, and leans 20 to 25° toward the target.

The finished swipe has three more beats:
- a tip glint star on the first strike frame, 2 to 3 frames before the first white frame;
- white-blue streak shards (5 to 25 px) round the tip, 6 to 10 on the low sweep and 4 to 7
  on the overhead swings, which may be pieces of the slash texture rather than separate
  particles;
- a whoosh that starts with the wind-up (130 to 400 ms before the first white frame) and
  peaks about 85 ms before it, plus a low boom (48 to 52 Hz, about 240 ms to fall 25 dB) on
  the frame the blade touches the target.
  The boom leads the first white frame by 45 to 60 ms, and the blade already touches the
  target one frame before the white.

**T1 [M][V] R ~.** Trace the tip. *(v8)*
- Record the blade tip's path through the whole swing, from the wind-up to the
  follow-through. Use that exact path as the slash's outer edge.
- The path reaches exactly to the target's near surface.
- Today:
  - Slash ribbons (`kit.slash`, the blade template's `blaze`) are procedural arcs round the
    attacker's centre, sized from the sim's reach and half-angle. They are not traced from
    the rig.
  - The Swordsman's rig smear turns with the blade but is a fixed sector.
- This needs each rig to expose its weapon tip (B8). The model standard's timelines make
  tip sampling natural, so model slices should export the tip and the VFX layer should read it.

**T2 [V] R ~.** Make the band reach nearly to the hilt. *(v8)*
- The inner edge sits at about 0.3 of the tip's radius (one ruler reading), so the band
  covers about 70% of the radius.
- Today: the blade template's basic blaze is 0.52 u wide, its outer edge at 0.95 of the
  reach. At mid-arc it covers 61% (the Tank's 0.9 u reach) to 73% (the Swordsman's 0.75 u)
  of that radius, and it tapers to points at both ends. The class slashes are thin lines
  (0.12 to 0.5 u).

**T3 [V] R ✓.** Build it as a light ribbon mesh. *(v8)*
- About 240 triangles, with U along the swing and V from the hilt to the tip.
- Today: a 48-segment bent plane with UVs.

**T4 [V] R ~.** Fade the start of the swing. *(v8)*
- Alpha 0 at the swing's start, rising fast then easing: about 0.45 at 15% of the arc,
  0.7 at 25%, 0.9 at 35%, and opaque by 40 to 45%.
- Today: the blaze trail fades its tail with `smoothstep` over 80% of the tail
  (`src/render/vfx/tplkit.js`, `BLAZE_FRAG`), and the flame erosion burns the tail off. The
  curve starts slow: about 0.09 at 15% and 0.41 at 35%. It is opaque only at 80%.
- Use a concave ease-out ramp instead, opaque by 40 to 45%, under the same flame erosion.

**T5 [V] R ~.** A travelling window, not a fan. *(v8, "the best part")*
- A tiled streak texture (6 to 8 lines along the arc), multiplied by a gradient mask that
  pans along the swing with the blade. The mask does the travelling; the streaks only boil
  in place.
- Only 40 to 70° of the arc is lit at once: a white-hot head at the blade, a streaky body and
  a fading tail. Showing the whole arc at once reads as a flat fan (v8's steps 3 and 4).
- The brightness peaks on contact, not on spawn. The raw fan adds all its brightness the
  frame it appears, 3 frames before the first white frame. The finished trail ramps up to
  the contact. It is visible 8 to 9 frames (267 to 300 ms): it grows over 1 to 2 frames
  before the first white frame, holds 3 to 4, and dies tail-first over 2 to 3, the last a
  faint remnant. It is gone about 6 frames after the first white frame, well before the next
  swing.
- Today: the head window already sweeps and the tail burns off. Blade fire scrolls fbm noise
  along the ribbon, and no streak pattern is sampled. BUILD_BRIEF §1 bans texture files, so
  the streak texture must be made in code (a CanvasTexture or shader noise).
- In Echoes the sim hit lands on the press. So the head should reach the target's side on
  the hit frame, sweeping the part before contact in 1 to 2 frames.

**T6 [V] R ✗.** A tip glint on the first strike frame. *(v8)*
- A 4-point white star at the blade tip for 1 frame, on the first strike frame, 2 to 3
  frames before the first white frame. Its core is about 0.3 bw, and its long horizontal
  spikes span about 1.5 bw tip to tip.
- Then short white-blue streak shards (0.1 to 0.4 bw long) round the tip: 6 to 10 on the
  low sweep, 4 to 7 on the overhead swings.
- In Echoes the shards are never blue, since the blues are taken (§4.3). They take the
  slash's own colours: the template's gold, or the Swordsman's silver.

**Colour.** The video's ice-blue slash avoids Ember, Bright Heal and Violet, but its hue
sits among the blues Echoes has already taken (§4.3), and Kesh's knife-and-sword template
makes Echoes slashes gold fire. The Swordsman's strokes are Fox
Crimson with silver edges. The white-hot head stays white, never Ember.

## 3. Recipes

Each recipe is one video's build order, frame by frame, with the template colour it takes in
Echoes. Frame numbers count from the contact frame (0), at 30 fps; one frame is 2 ticks.

### 3.1 A juicy melee hit (v2, fits the knife-and-sword template)

| Frame | What happens |
|---|---|
| −9 to −7 | The swing whoosh starts with the wind-up. |
| −8 to −4 | Wind-up, about 4 frames, deepest at −4. On the first two swings the hero leans back about 0.3 to 0.4 bw and down about 0.3 bw. The overhead chop rises into its hop instead. |
| −3 to −1 | The strike, 2 to 3 frames. It reaches a lunge about 0.85 bw past rest on the contact frame. |
| 0 | Contact. The target goes near-white with no ramp, and the thump lands (52 to 56 Hz body). The freeze starts: the attacker, the target and the trail hold. The world kicks about 9 px of 576 (0.14 bw), 12 px (0.19 bw) at most, along the hit and slightly up. The HUD stays still. |
| 1 | 15 to 25 shards leave the far side in a 45° cone. The particles keep moving through the freeze. |
| 1 to 2 | Smaller random shake (about 6, then 3 px of 576). Back to rest when the hold ends. |
| 3 | The freeze ends; 4 frames on some hits. The knockback launch and the attacker's recoil release together. |
| 3 to 5 | The target flies 0.85 bw with a hop, tilted back 7 to 12° and stretched about 10% tall. The attacker snaps back about 0.65 bw. The flash ends 2 frames after the freeze. |
| about 10 | The target lands with a 1-frame squash (+15% wide, −13% tall), recovers in 2 frames, then settles. |
| 3rd hit | A leaping overhead chop: the hero hops, the target is thrown about 50% further. |
| Kill | A 5-frame freeze (0 to 4), with a "POP!" label at +3. On +5 and +6, a round swell to 1.3 to 1.45× wide and 1.3× tall. The base stays on the floor and the body stays white. On +7, the body becomes a tight clump of cubes in its own footprint. Then it bursts into several dozen body-coloured cubes (0.15 to 0.25 bw each) plus extra shards, all gone in about 0.8 s. |

In Echoes: blade-template gold sparks, the class's own flare, and a charcoal decal for the kill.

### 3.2 A juicy fire spell (v3, hero fire is gold; a magic skill keeps purple and gold)

| Frame | What happens |
|---|---|
| −23 to −12 | Charge: a pinwheel of 3 to 4 pale-gold crescent arms spirals in toward a point just in front of the chest, about 1.9 × 1.4 bw, at full brightness by −21. On −12 it collapses into a tight, darker spiral, and on −11 it is gone. Its glow lights the caster's front. The caster leans back about a third of its width and sinks about 10%. *Echoes: after the press only (B1).* |
| −22 to −12 | Core: a white-hot spark appears inside the swirl on −22 and swells to about two thirds of the target's width by −20. It holds there, pulsing between 0.6 and 1 bw, then shrinks a little on −12. |
| −11 (release) | Launch on a forward lunge. The whoosh starts (about 350 ms). |
| −10 to −1 (flight) | 11 frames from the release to the contact, at constant speed. The trail is 2.2 to 2.5 target widths long. The orb lights the floor and the target's near side. |
| 0 (contact) | The orb reaches the target's near side and lights it (R6). Nothing else fires yet. |
| +1 (the hit) | Everything starts on this frame, together with the reaction and the number below. A white bloom about 2 target widths wide peaks on +2 and stays bright for 4 frames. About 6 thin streaks leave the far side (±20 to 30°) and 3 to 4 go back. The boom lands (43 to 48 Hz body, a 2 to 3 frame high crack, a 0.3 s tail). The camera kicks 2 to 4 px in a random direction and settles in 3 frames. No freeze. |
| +1 to +5 | Reaction: white for 2 to 3 frames, then a fade over about 12 to 15 frames. Squash 12% on +1, the middle pushed away from the hit on +2, a 6% stretch on +3, settled by +5. The trail drains into the hit point for 5 frames. |
| +1 to +22 | The number pops white at 1.4×, snaps to a quarter of the target's height in pale orange within 2 frames, and drifts sideways and up. It lives about 0.73 s. A crit is 1.6× taller with a "CRIT!" tag one frame later. |
| +5 to +17 | 10 to 25 small embers fall, gone by about 0.6 s. |
| to about 1.3 s | Aftermath: a thin gold rim flares for 8 frames, holds at a third to a half for about 0.8 s, then fades. The inner glow fades more slowly. |
| Kill | About 2 times the flash area, still local, bright for 5 frames instead of 4. A kick about 1.4 times a normal hit's. A ground ring about 4 bw across on +4 to +9. A scorch decal about 2 bw wide from +6 that stays. Flames on the lower body on +6 to +12. From +11 the body dissolves from the top down into embers and is gone at +32 (1.07 s). Ash rises from about +28 until about 1.37 s. A softer first thump, then a low rumble with crackle from about +9 for at least 0.5 s. |

*Echoes: the gold rim (D1) plays on blade-template hits only, for 0.8 s or less. The burning
kill (K3) plays on blade and fire kills only. The magic bolts of the Healer, the Tidecaller
and the Bellwright leave no burn, and their kills pop like any other (K2).*

In Echoes, this recipe applies to every hero shot and bolt that deals damage: 4 basics and
13 projectile skills.
- Healer: basic bolt, Spirit Bolt, Lantern Flurry, Pale Lance.
- Archer: basic, Piercing Shot, Volley, Vault Shot, Pinning Arrow, Hunter's Mark, Feather Fan.
- Tidecaller: basic spit, Riverbolt, Torrent.
- Bellwright: basic ding, Clapper, Knell.
- Mending Bolt is a heal bolt. It passes foes and lands on an ally. It may take the cast and
  flight rows, but none of the contact, reaction, number, aftermath or kill rows. It keeps
  its green and gold heal beat (design-VFX §11).
- The camera kick on each bolt hit is shake on an ordinary hit, which §9 #7 forbids. It
  waits for Kesh with F2 (§6.3 item 4). Until then, bolt hits do not kick. Kills and the
  skills that kick today keep their kicks.

### 3.3 Juicy shots (v4; for hero bolts, and for the sci-fi machine foes' fire)

1. **The shot.** On the press frame, a full-size, randomly turned white-hot starburst at the
   muzzle (0.6 to 0.75 bw). It lights the shooter, the floor and the target (+17%). On the
   next frame a smaller flame; on the third frame nothing. Continuous fire flickers at the
   fire rate.
2. **Bullets.** Tracers, not dots. A hot head, and a tail about half the per-frame travel.
   Each shot gets its own angle (about ±6°) and speed (about ±20%). Wall hits throw a spark
   star of 5 to 10 streaks that lasts about 200 ms.
   *Echoes: render jitter of size, brightness and height only. The angle and the speed stay
   the sim's (S4).*
3. **The hit.** React on the frame the bullet arrives (2 to 3 frames of flight), never later.
   - Flash the target near-white for 1 frame per bullet. Overlapping hits keep it white.
   - Squash it 12 to 17% wider and 5 to 8% shorter.
   - Push it about 0.5 bw along the shot with a small hop of about 0.12 of its height.
   - The shape recovers within about 100 ms. The push holds about 300 ms, then eases back
     over about 350 ms.
   - "Fast attack, slow release": the flash and squash snap in within 1 frame, while the
     displacement holds and returns slowly.
   - *Echoes: the foe stays where the sim puts it, with no ease back (R4). A hero hit by
     machine fire flashes crimson and is never pushed (ruling A5).*
4. **Recoil.** On each shot:
   - Squash the shooter about +20% wide on the first shot. Steady fire deepens this to about
     +38% wide and −10% tall by the third shot. Push it back about 0.4 of its width.
   - Push the camera a few px against the fire direction, with a 3% zoom punch on the first
     shot of a burst.
   - After the last shot, the shape recovers in about 100 ms with a small stretch overshoot,
     and the position in about 0.45 s. The camera holds 0.25 s, then eases back over about 0.6 s.
   - *Echoes: a rig-only shove of 0.08 to 0.12 u (B3). The camera moves only for your own
     hero's shots. For the Archer and the Healer even that waits for Kesh (C1, §6.3 item 7).
     Foe fire never moves the camera.*
5. **The mess.** Spray both ways from each hit, and leave it on the floor. Eject one casing
   per shot. *Echoes: matter colours only, and no casings (D2).*
6. **Sound.** Each sound fires at its own event:
   - a crack at the muzzle on the shot frame;
   - a whiz while the bullet flies;
   - a thud on the frame the bullet arrives;
   - a ping when it reaches the wall.

   The on-screen words appear at exactly those events. Use few samples and nudge the pitch
   every play. In v4 the gun is silent until this step, and then it is about 30 dB louder in
   the low end. In the file the sound leads the flash in every burst, by 10 to 118 ms
   (median 55 ms, about 1.5 to 2 frames). That looks like an encode offset, so the file
   cannot prove frame-exact sync.
7. **The kill.** The biggest beat:
   - The camera and gun stop for 1 frame. This is not a full world freeze: the hero and the
     victim keep moving.
   - The victim stays upright and white for 2 to 3 frames (an ordinary hit gets 1). Its HP
     bar goes on the kill frame.
   - A 7.4% camera punch-in, about 2.5 times a shot's punch, decaying over 7 to 10 frames.
   - The body topples about 90° in 4 frames (about 130 ms, easing in) along the shot, into
     the wall. It slides back about 0.5 bw off the wall, tinted darker, and rests about
     0.67 s after it lands (0.87 s after the kill frame).
   - A two-beat low thump, one on the throw and one on the landing (low confidence: the
     narration overlaps).
   - *Echoes: the punch-in plays only on elite, champion and boss kills, up to 6% (C2).*

### 3.4 Lightning (v1; no Echoes skill uses it yet)

Build order, from structure to light. Sizes are in bw: the video's target is 143 px wide.
The bolt built here is about 1.3 bw wide and 2.35 bw tall. The hit bolt is smaller (see
"Size on a hit" below).

1. **The path.** A thin, mid-value coloured line, never white.
2. **Exaggerate.** Straight segments and hard angles. Push each of about 9 corners 0.04 to
   0.08 bw further out along its turn, and add 1 or 2 kinks. With the straightening, the
   bolt grows about 16% wider. The push alone adds about 6%.
3. **Shape.** Fat at every bend (about 0.1 bw against 0.02 bw on the runs, about 4.5 times).
   Pinch the runs thin, and make the tips needle-sharp.
4. **Broad glow underneath.** A deep, saturated version of the hue at low opacity. Half
   strength about 0.19 bw out from the body's edge, gone by about 0.4 bw.
5. **Narrow glow.** A brighter, lighter version of the hue. Half strength about 0.06 bw out
   from the body's edge, gone by about 0.1 bw (a quarter of the broad glow's reach).
6. **Accents.** 10 to 12 small arcs and sparks round the bolt. Each stroke swells fast, peaks
   at about 20% of its length, then thins to a point. Only the still, finished drawing has
   them. v1 fades them out before the bolt moves. Every flipbook and hit drawing is body,
   glow and core only.
7. **The zap.** A hard white core, about 0.04 bw wide (0.06 bw at the bends), drawn last.

Size on a hit:
- The hit bolt is a narrower drawing than the one built in steps 1 to 7.
- Its glow runs about 2 bw from the top down to the target's crown (2.4 bw on the tallest
  variant).
- Its white core zigzags 0.7 to 0.85 bw from side to side. That is the core's span, not its
  stroke width.
- Its last segment drops straight down into the centre of the target's crown.
- The video is a side view, so the bolt stands upright on screen. Under Echoes' 52° camera
  (`CAMERA.elevationDeg` in `src/core/constants.js`), a world-vertical bolt shows only about
  0.6 of its height.

Motion: a flipbook of 5 drawings, one every 2 ticks.
- Drawing 1 is thick and bright. Drawing 2 is thinner, drawing 3 thinner again.
- Drawing 4 breaks the bolt at two of its bends into about 3 pieces, with gaps of about
  0.17 bw. Drawing 5 keeps one short fragment near the middle of each piece. It is already
  nearly gone (core 4% of drawing 1), and then the bolt cuts out with no fade.
- That is 167 to 200 ms of bolt, or about 250 to 330 ms with the flash tail.
- The core dies first: by drawing 4 the core is at 14% and the glow still at 40 to 65%.
- Drawing 1 carries a cool whole-screen lift of about +25 to +60 RGB (blue highest), decaying
  to 0.66, 0.47, 0.29, 0.22 and 0.14 of peak and gone by about +8 to +10 frames.
- Drawing 1 also carries a camera jump of 2 to 4 px of the 576 px frame (about 0.02 bw).
  Then it jumps about 1.4, 1.1 and 0.7 px and is gone by +4. Each frame jumps a new random
  way, not along the hit.
- A held bolt breathes ±3 to 5% on a 0.2 to 0.5 s cycle.
- Each strike gets a different drawing. The timing stays the same. v1 rotates about 3 first
  drawings: some sit 0.15 to 0.3 bw to the side, and one is about 20% taller.
- v1's zap is one sample at one pitch, so all of its variety is in the drawings.
- The target squashes 10 to 14% wide on +0 or +1, stretches 7% on +2 to +3, and settles in
  6 to 8 frames. It wears a pale hurt tint for exactly 8 frames, and its cream number rises
  about 0.33 bw and fades by 0.57 s.
- Sound: about 0.5 s in all, starting at full level on the impact frame.
  - A boom whose peak falls from about 160 to 40 Hz over the first 0.3 to 0.35 s.
  - A crackle above 4 kHz holds under it. By 0.4 s it carries most of the energy.
  - The level is down about 10 dB at 0.16 s, holds there to about 0.28 s, and is down 20 dB
    at 0.4 s. Then it cuts hard at about 0.5 s.

In Echoes:
- The whole-screen lift tints every Ember telegraph and Bright Heal, which §4.3 forbids
  while a telegraph shows. Safe route: brighten only a local area round the bolt, as v9 does
  ("the frame corners never brighten").
- A whole-screen lift waits for Kesh's photosensitivity rule (§4.3, §6.3 item 8). It would
  then play on drawing 1 only, only when no telegraph is live, and never under Reduced.
- The per-strike shake meets §9 #7 on a non-lethal hit (§4.1). Keep it for kills and big
  beats until Kesh calls it (§6.3 item 4).
- Colours are open (§4.2, §6.3 item 10): gold-led magic for a hero, magenta or Foe Crimson
  for a foe.
- Draw the bolt camera-facing or in screen space (v1 is a side view, see Units). A
  world-space bolt must stand about 3.2 bw tall to read as 2 bw on screen.
- Give each strike a fresh path from the cosmetic stream. Keep the usual pitch jitter on the
  zap (A5).
- The building blocks are `kit.streak`, the crack canvas, and the holo glitch's 20 Hz reseed.

### 3.5 Ice (v9; no hero ice skill yet; the Frost Bomb and the Frozen elite host it today)

The plain version is a single icicle sliding along the floor, 17 frames from cast to hit.
The juicy version keeps the **same 16 to 17 frames from cast to hit**: all the juice is added
layers, none of it is slower play. v9 has narration only and no sound effects, so it teaches
nothing about audio. Echoes' beat rule still gives the ice its own sounds: a whoosh on the
cast burst (A2), the spike eruption, a boom on the impact (A3) and the shatter.

1. **Charge.** For about 0.8 s, 15 to 20 specks streak in to the hand and a glow gathers.
   In the last 6 frames (0.2 s), a camera-facing ring about 2.2 target widths across collapses
   into the hand, a bright orb holds for 1 frame, and a glow burst of about 50 ms fires on the
   release. The hero leans back 15 to 17° on the cast and recovers over about 7 frames.
   *Echoes: after the press only (B1).*
2. **Spikes.** Instead of one icicle, about 20 spikes erupt one after another along the path
   at the projectile's speed. Each spike is translucent faceted ice that leans toward the
   target. The floor shows through its body, its edges glow, and its tip is white. Each is
   born white-hot for 1 to 2 frames, then cools, popping up over 4 to 5 frames with a 20 to
   30% overshoot in screen area (not height), then settles over 12 to 15 frames. Each lives
   about 1.5 s and leaves in the order it came, sinking from the caster's end.
3. **Grow.** The spikes grow about 5 times taller from the caster to the target, from about
   0.3 to 0.4 bw at the caster's end to about 1.5 to 1.7 bw (settled) at the target. The last
   ones overshoot 1.3 to 1.4 times in height in 3 frames and settle over about 13. Size,
   density, brightness and width all build toward the target: the biggest beat is at the
   impact.
4. **Fan out.** Smaller side rows tilt outward 45 to 60°, so the path opens into a wedge at
   the target.
5. **Crack the floor.** 3 frames after the hit, a cracked decal about 4 bw across (4 to 4.4),
   centred on the target's feet, with glowing lines. Small chunks move for about 5 frames.
   The decal lasts about 2 s, about 0.6 s longer than the spikes, and fades over about 0.6 s.
6. **The big finish.** The strongest tools are saved for this one beat; steps 1 to 5 never
   move the camera.
   - While the spikes travel, a faint 1 to 2 px camera rumble.
   - The target goes white for 4 frames and squashes on the impact frame, then fades over
     about 12 frames to an icy tint while it is encased.
   - A crown of 8 to 10 big spikes rings the target on all sides, including behind it. It
     starts rising 1 frame after the flash and peaks 4 frames after it at 1.3 times its final
     height: about 2.7 bw, 1.8 times the target's height. It settles over 10 to 15 frames to
     about 2.1 bw, 1.4 times the target's height. In Echoes it is capped (see below).
   - A local bloom about 3 bw in radius. The frame corners never brighten.
   - The camera shakes for about 9 frames, starting 1 frame after the flash. The big kick
     lands 2 frames after the flash: about 0.13 bw, vertical. Then kicks of about 0.05 to
     0.1 bw in random directions decay to rest by about +10. Translation only, no zoom.
   - No freeze.
7. **Shatter.** About 1 s later, the spikes shrink from the tips with a white-hot edge, in the
   order they came. They leave 50 to 80 tiny glowing shards on the ground for at least 0.9 s.
   "Never pop an effect out of existence."
8. **Frost.** Tiny twinkling specks start along the path while the spikes travel, thicken
   round the impact, and hold the place with a faint mist for 1 to 2 s.

In Echoes:
- A spike line must match the sim's hit shape (BUILD_BRIEF §6's closed set). It must not
  draw a wider footprint than the hit, and must not look like the foes' thorn bursts or a
  telegraph.
- Keep the crown below head height (about 1.6 u) and fade it where it covers the target, so
  the body, its flash and its frozen tint still read. design-VFX §2's "effects never hide a
  character" asks the same, but it is history, not a ruling. On a rank-and-file foe
  (1 bw ≈ 0.65 u), v9's crown stands about 1.4 u tall on screen when settled and 1.75 u at
  its peak. Echoes' 52° camera shows a world-vertical spike at about 0.6 of its height (R4,
  §3.4), so matching it takes about 2.2 u of world height settled and 2.85 u at the peak.
  The 1.6 u cap trims the settled crown as well as its overshoot.
- The colour needs Kesh's pick (§6.3 item 10). The video's encased tint (#A4B2FD to
  #B6CEFC) is the purple capsule lit blue, and it sits next to Violet. A frozen Echoes foe
  takes Kesh's ice colour too, never Frozen #9FD8F0, which marks the Frozen elite.
- The building blocks are `spikes()`, the Colossus fissure lane, Earthshatter's stepped
  cracks, and `kit.crack` (the Tank's signature, so tint it and use it sparingly).

### 3.6 The cartoon rules (v6; any thrown shot, and the body rules for every model)

v6 adds one rule per step to the same fireball, and every step stacks on the last. The
plain version already has the same speed, white flash, rim, tint, number and boom. The
narration says "It's not the particles. It's not the shaders." Most of the difference is
shape, timing and path, but step 3 also adds layers the plain version lacks: a white bloom,
exit streaks, embers and scorch.

| Frame | What happens |
|---|---|
| about −23 to −12 | **Wind up.** A fire swirl starts at the hand 1 to 2 frames before the body moves and grows to about 1.2 bw (1.1 to 1.4). Over the next 10 to 11 frames the caster slides back 0.33 to 0.42 bw, tilts back 10 to 15° and sinks 10 to 14%. *Echoes: after the press only (B1).* |
| −11 (release) | A 1-frame snap forward. The caster lunges about 0.3 bw past rest (up to 0.45) and stretches about 7% taller. A low whoomp near 130 Hz, about 330 ms long. |
| −10 to −1 (flight) | **Squash and stretch.** About 11 frames (10 to 12) in a straight line. The fireball's white core stretches to about 2 to 1 along its travel (1.2 to 1.4 bw long, 0.6 bw across), with a tapered flame tail 1.5 to 2 times the core's length. 4 to 5 wavy streaks, 1.6 to 2.5 times its length, lag behind it. Meanwhile the caster comes most of the way back in 4 to 5 frames and is at rest 6 to 13 frames after the release, about when the shot lands. |
| 0 (contact) | The target squashes to 1.18 to 1.3 wide by 0.85 to 0.91 tall. The number pops big and white (two digits about 0.73 bw wide, 0.5 bw tall). The boom lands (44 to 50 Hz, about 7 dB over the throw). |
| 0 to 2 | **Timing.** The game holds for 3 frames on that pose: the fireball embedded, the squash at its deepest, the number at its biggest. |
| 3 to 5 | The release: a white bloom for 2 to 3 frames. Needle streaks shoot 0.7 to 1 bw out of the far side and live 3 frames. |
| 3 to 6 | The number shrinks to about 0.48 bw wide (about two thirds) within 3 frames and turns orange. |
| 7 to 13 | The target springs up to 1.05 to 1.1 tall and about 0.88 wide at about +7 to 8, then rests by +10 to 13. Without a hold (step 2) it peaks at +5 to 6 and rests by +7 to 8. |
| 3 to 25 | **Follow-through.** Gold flecks spread from the impact face and drift down, mostly gone in 10 frames. Scorch wisps linger 20 to 25 frames. |
| 3 to 23 | **Arcs.** The number drifts sideways 1 to 1.4 bw in all with an upward kick that gravity bends: apex at +13 to 16 frames, about 0.9 bw up, a small fall, and a fade over its last 2 to 4 frames. It is gone by about +23 (22 to 24). The next hit's number goes the other way. |

The outro adds a 3 to 4 px (about 0.08 bw) game-camera shake, and only there. It is held
through the hold, jumps to a new 3 to 4 px offset in another direction on the burst, and is
back to rest in 2 to 3 frames.

The juice adds about 10 frames between the intent and the contact (23 against 13), most of
it in the wind-up. The 3-frame hold adds 3 more before the burst, so the burst comes about
13 frames (0.43 s) later than in the plain version: 26 frames from the intent, against 13.
The attack rate need not drop. In the outro the next
wind-up starts about 8 frames after the contact, during the last burst. That is the same
overlap as Kesh's 3-hit combo template. The shot then repeats every 31 to 32 frames against
40 for the plain loop. In the split screen the juicy loop is slower (42 to 43 frames against
39 to 40). So the loop length is the creator's timing, not a rule.

In Echoes:
- The wind-up, the overshoot and the settle are [M] rules for every model (B1, B5).
- Three things are missing outright. No foe squashes on a hit today, only when it dies. The
  squash spring belongs in the shared enemy layer (R2). Numbers rise straight up with no
  arc (N2). The trail dots fade where they lie instead of draining into the hit point (S5).
- The whole-frame hold on a spell hit is Kesh's call (F1, §6.3 item 2). Today a spell or
  shot hit gets no hitstop unless it kills.
- The outro's camera shake on each hit is shake on an ordinary hit, which §9 #7 forbids. It
  waits for Kesh with F2 (§6.3 item 4). Until then, shot and spell hits do not shake. Kills
  and the skills that kick today keep their kicks.

## 4. Conflicts

Where a video asks for something a ruling forbids, the rulings win until Kesh names the
change. Each row gives a safe route that keeps both the ruling and the goldens where one
exists.

### 4.1 With the written rulings

| Video asks | Ruling it meets | Safe route without his call | His call |
|---|---|---|---|
| Bounce the player back off the hit (v2), push the shooter back (v4) | Ruling A5 and §9 #3: the party is never knocked back; party bodies are not knockbackable | A rig-only lean and shove of 0.08 to 0.12 u; the body stays where the sim puts it (B3) | A real bounce (sim, goldens) |
| A bigger throw on the combo finisher (v2, v5) | §9 #3 knockback distances: 0.34 u on a basic, 0.72 u on a skill (`KNOCKBACK` in `src/core/constants.js`). The sim keeps no basic-hit count; the 3-hit combo runs on the rig's render clock | A bigger pose, VFX and sound on the third hit (B6) | A sim combo counter (goldens) |
| Tiny screen shake on every hit (v2, v8; v1 and v3 also shake 2 to 4 px on every non-lethal strike) | §9 #7: screenshake "never on ordinary hits" | None (F2) | Let ordinary hits shake. *My pick:* a render kick along the hit on your own melee connects only, under Screen shake (F2, §6.3 item 4) |
| A long shake on a big finish (v9: about 9 frames, big kick about 0.13 bw, about 0.085 u) | §9 #7: no shake on ordinary hits, and at most 0.06 u for 120 ms (180 ms only for the boss stomp and quake landing) | On a big skill's finish only, and only for classes that already kick today, a camfx kick of 0.2 s or less inside the 0.09 u clamp, as Earthshatter's 0.08 u for 0.16 s does today (F3) | A longer or bigger shake; this route too if he reads §9 #7 strictly (§6.3 item 14) |
| Longer freezes, and freezes on spells and shots (v2, v5, v6, v4 kill) | §9 hitstop: 2 ticks on a melee arc, 3 on a kill, a budget of 4 per 21 ticks; sim and goldens | Hold the rigs and VFX in the render on the existing hitstop (F1) | A longer hitstop, or a hitstop on ranged hits |
| Charge before the cast, lean back before the throw (v3, v6, v9) | BUILD_BRIEF §6: every cast is instant on the press; §22 responsiveness | Carry the anticipation in the previous hit's settle; play the gather after the press (B1) | A cast wind-up in the sim |
| Random spread (v4) | BUILD_BRIEF §6: projectiles fly straight along the aim; fans are 12° apart | Per-shot size, brightness and height jitter from the cosmetic stream (S4) | A random spread in the sim |
| A hard zoom punch (v4 kill, v5) | §22: the player never leaves the frame; camfx clamp 0.09 u | An FOV punch of up to about 6% (about 2.3° of the 45° FOV) on elite, champion and boss kills, off under Reduced (C2) | Anything bigger |
| A huge cluster round the body; tall spikes and big blooms (v9) | design-VFX §11's crowd fade "so a stacked fight does not wash out to white" (design-VFX §2's "effects never hide a character" is history, not a ruling) | Keep the crown below head height (about 1.6 u) and fade it where it covers the target, so the body, its flash and its frozen tint still read | None needed |
| Blood on the floor (v4) | §17 makes Ember the only red-orange; the kill splat is charcoal by ruling | Matter-coloured spatter; stuck arrows (D2) | None needed |
| Small damage numbers (v3) | Kesh's 1.22× look for your own numbers (2026-10-19) and the §17 floor of 20 px | Keep his sizes; arc and tag them (N1 to N4) | None needed |
| A 300 ms freeze with full-screen silhouette, invert and burst panels (v5) | §9 hitstop budget; §19.1 reserved colours (the ink panels drop every colour for about 300 ms, so Ember, Bright Heal and every telegraph vanish. v5 inverts only its black and white ink panel, never the colour scene); design-VFX §11 crowd fade; a full-screen black and white flicker at about 8 cycles a second | A local anime frame round the contact point on rare beats (§2.13) | A full-screen frame, plus a photosensitivity rule |
| The chest wobble before the lid (v7) | The vault reveal is a sim number, `VAULT_RULES.revealSec` = 1.4 s | Start the wobble as the hero comes near; finish it, press and snap inside the 1.4 s (§2.14) | A longer reveal |

### 4.2 With Kesh's VFX templates

His three templates (`SKILL_TEMPLATE`, design-VFX §11 and his message) win over §3 to §10 of
design-VFX. The reserved colours still hold.

- **Punch (v2) and sword swipe (v8)** fit the knife-and-sword template in shape: a trail,
  sharp particles and a hit on one frame. Their colours change.
  - v2's spark ramp stops at gold, not at its orange end with pink specks (§4.3, P1). Its
    trail's pink edge goes too.
  - v8's ice-blue slash becomes the template's gold fire, with a white head (§2.15).
  - The template adds what neither video has: golden energy waves and an impactful
    explosion.
  - v8 is how to build that template's trail.
- **Fire spell (v3)**: its charge, core and trail are already pale gold and cream (#F8EA9E,
  #FADE9E, hue 40 to 50°). Its orange parts are the orb's outer halo, the impact flecks, the
  crit number, and the kill's lower flames and ember husk (hue 15 to 27°). Recolour only
  those. That orange sits next to Ember (11°) and the Molten power (24°).
  - Hero fire leans gold: Blaze Gold #FFB43C, Flame #F5952E, Blaze Core #FFF3C4.
  - Foe fire is Foe Crimson #B8141F.
  - A magic-template spell keeps its purple and gold, with gold leading the fire.
- **The Disney fireball (v6)** is already cream, yellow and gold (hue about 43 to 60°), so
  it fits hero gold as it is.
  - Its settled number (#E2AD64) is Hearth Amber's hue.
  - Its red-brown scorch (#885538) leans toward Ember, so Echoes scorch stays charcoal (K5).
- **Lightning (v1)**: no template has lightning.
  - The sci-fi neon template looks closest, but it is for foes only. Its "sharp lines" match
    v1's straight segments and hard angles ("make every turn sharper", L2).
  - A sci-fi bolt still keeps v1's taper: fat bends, thin runs and needle tips (L3). "Clean
    vector rendering" must not become an even-width line, which is v1's "BAD!" stroke.
  - For a hero, lightning is a magic beat in Arcane Purple #A24BFF and Celestial Gold
    #FFC94A over a Star White core. The purple sits near Violet #B79CF0, so gold should lead.
  - For a foe, use Neon Magenta or Foe Crimson under a white core.
  - v1's own blue (#1C3899 to #388BFC) is taken too: its bright end is the Tidecaller's
    Deep Cobalt #3F7FE6 and its dark end the indigo corruption tell (hue 228). Signal Blue
    and the Blinking elite's cobalt #6F86FF sit close by (§4.3).
- **Ice (v9)**: no template has an ice tone, and every free ice blue is already reserved
  (§4.3). An ice skill needs Kesh to pick its colour (§6.3 item 10).
- **Gunfire (v4)**: no hero carries a gun. For the sci-fi machine foes (vane, chime,
  bellows, lockkeeper, glassblower, millwheel, hourwarden, founder), v4's muzzle flash,
  tracers and hit fit the template in neon magenta first. Hero shots stay the blade comet or
  the magic orb.
- **Anime frame (v5)**: the enhancer words (energy burst, impactful explosion, dynamic motion)
  match the burst lines and the punch-in. The ink panels are black, white and one red, with
  no template counterpart, and they erase the template colours while they show. v5's red
  accent (#EC351D to #F33617) is Ember's hue, so an Echoes panel needs another accent: the
  template gold for heroes.
- **Chest (v7)**: the magic template's celestial burst, light beams, stardust and gold fit the
  reveal. The gold sits beside Hearth Amber and Pale Gold, both positive meanings.

### 4.3 With the gameplay signals

- **Reserved colours (§19.1, §23, CLAUDE.md).** Ember #FF5A36 is for enemy threats only.
  Bright Heal #5FE873 is for healing only. Violet #B79CF0 is for corruption only.
  Hearth Amber #E8A23D is not reserved, but it carries positive meanings: §19.1 gives it
  positive UI, Legendary, selection and Victory, and it colours your own damage numbers
  (docs/HIT_FEEDBACK.md) and the Healer's Lantern Gold glow. It never stands in for Ember,
  Bright Heal or Violet.
  - Spark ramps cool from white to gold and stop there. v2's ramp ends at #E37C44 with
    pink specks, which is too close to Ember.
  - Kill debris uses the victim's own colours, never Violet unless the victim is corrupted.
  - v3's lavender flash and pink burn, and v6's lilac and pink hit tint (#C198E1, #DC8ACA),
    sit near Violet. Keep flashes neutral white, and let the tint after the flash fade back
    to the body's own colour.
- **Blues are taken.** Signal Blue #4FA3D9 is the Rare frame, the reticle, the slow ring and
  several relic glows. Frozen #9FD8F0 is the Frozen elite. Neon Cyan #3DF2FF is the
  machines. Gravefrost #7FE0FF is a Swordsman cosmetic. Deep Cobalt #3F7FE6 is the
  Tidecaller's water, and indigo (hue 228) is the corruption tell on every rank-and-file
  foe; those two cover the deep electric blue lightning would use. Ice and blue lightning
  have no free tone.
- **Enemy warnings stay readable.** No full-screen effect may cover or recolour a telegraph
  while it shows. A friendly effect must never look like a telegraph (§19.4).
- **No burn without a burn rule.** A burn left on a foe after a fire hit (v3) shows a
  status the game does not have, and it looks like the Molten and Cinder elite powers. The
  safe route is a gold rim of 0.8 s or less on blade-template hits only (D1). A real burn
  status is Kesh's call (§6.3 item 9).
- **Heals stay green, and only heals.** No hit effect may use Bright Heal's band, and no
  number pop may whiten a heal.
- **Amber numbers stay readable.** Effects stay under the numbers. Your own numbers draw on
  top with their 3 px outline (design-VFX §11). Gold sparks, flecks and rims may play at the
  hit point, but never a flat amber patch behind a number.
- **Photosensitivity.** There is no rule in the repo today. Proposed, as Kesh's call
  (§6.3 item 8):
  - At most 3 full-screen flashes in any second (the WCAG 2.3.1 limit).
  - Nothing full-screen under Effects: Reduced, and nothing that strobes.
  - Flipbook swaps of a local effect (L4) are fine, because they cover a small area.

## 5. What the game lacks most

Echoes already does much of what the videos teach:
- a white flash, a thump on the hit frame, and directional sparks;
- a sim knockback of the right size, and a hitstop on melee hits and kills;
- a kill pop, a burst, and a decal that stays;
- template heads with hot cores and trails, and tapered slash ribbons with a faded tail;
- pitch jitter on every sound.

The gaps, ranked by how much they would change the feel:

1. **The target barely reacts.** Enemies flash, then slide. There is no squash, no flinch,
   no hop or tilt in the push, and no landing squash (R2, R3, R4). This is the videos'
   loudest point ("you can't tell you hit it"), and it is render only.
2. **The freeze holds nothing on screen.** The sim stops for 33 to 50 ms, but the rigs,
   ribbons, numbers and kill pop run straight through it. The freeze is about a third of
   the videos' length. Only a melee arc freezes on a plain hit; a shot, spell, zone or bite
   freezes only when it kills (F1).
3. **The killing blow is too close to any hit.** Its death flare is already about twice a
   basic hit's, and it gets a small ring. But the flare is bright for only about 50 ms,
   against the videos' 5 frames. It has no throw, and its sound is only 1 dB louder (K1,
   K4, A6).
4. **Spells and shots lack their beats.** Nothing swells in the hand. The trail stops dead.
   There is no whoosh on a spell and no boom on its impact. Every shot is identical
   (S1, S5, A2, A3, S4).
5. **Damage numbers rise straight up.** They have no arc, and crits have no tag (N2, N3).
6. **The attacker's body is soft at the key frames.** The weapon kick ramps instead of
   snapping, the follow-through is cut with no overshoot, and there is no recoil off the
   hit (B4, B5, B3). The Tank pilot already fixes the follow-through for the Tank.
7. **Magic hits are radial.** They do not leave through the far side (P1). The kill pop is
   radial, as in v2. It lacks only v2's slight lean along the hit.
8. **The chests just open.** There is no wobble, press or snap before the lid (O1 to O3).
9. **Trails are not traced from the blade.** No slash pattern pans along them (T1, T5).
10. **There is no lightning and no hero ice.** The recipes in §3 are ready for when a skill
    is named.
11. **There is no photosensitivity rule** for any future full-screen effect.

## 6. Next slices

### 6.1 What every model standard slice carries ([M] rules)

Paste this into every hero, boss, champion or foe model brief, beside Kesh's two animation
templates (the 3-hit combo, and the technical self-check). All of it is visual only, so
timing, damage and the goldens do not change.

1. **B1 Anticipation without delaying the press.** The next hit's wind-up lives in the
   last hit's settle. From rest, use at most 1 to 2 frames of wind-back inside the release.
   A spell's gather plays after the press.
2. **B2 Fast strike, held contact.** The strike takes 2 to 3 frames. The contact pose holds
   through the hitstop, and the rig clip pauses on `hitstop`.
   - **B9 Lunge into the contact (melee).** About 3 to 5 frames before contact, pull back
     about 0.35 to 0.4 bw. Lunge about 0.85 to 0.9 bw past rest and lean 20 to 25° toward
     the target. Hold a squash at contact (+19% wide, −9% tall), then snap back in 2 to 3
     frames.
   - Keep the lean and the squash at full size. Keep the travel to a lunge step that passes
     the model standard's root-motion check, like the Tank pilot's slam (its foot steps in
     about 0.16 u). The body never moves.
3. **B3 Recoil off the hit.** A rig-only lean and shove of 0.08 to 0.12 u in 2 frames,
   fading over about 8 frames. The body never moves.
   - A shot (a hero bolt or a machine foe's fire) also squashes the shooter. The first shot
     squashes it about 20% wider. Steady fire deepens this to about 38% wider and 10%
     shorter by the third shot, and the squash holds while the shots keep coming.
   - After the last shot the shape is back in about 100 ms (3 frames), with a small stretch
     overshoot (about 4% taller) 4 to 5 frames after the last shot. The shove eases back
     over about 0.45 s.
   - A spell throw keeps B5's stretch into the lunge, not this squash.
4. **B4 The weapon kicks on the press frame**, then settles. There is no ramp.
5. **B5 Follow-through with overshoot.** It settles into the next wind-up, or into idle with
   one small overshoot, never a plain blend.
6. **B6 The third hit is the biggest.** A hop, stretch or lunge, plus a bigger VFX and
   sound, along Kesh's 3-hit template.
7. **B7 Spawn-in.** The body grows from the floor in about 7 frames with about 10% overshoot.
8. **B8 Expose the hand and the weapon tip** as named points, so the hand swell (S1) and
   the traced trail (T1) can anchor to them.
9. **R2 to R5 Hit reaction (foes, champions, bosses).**
   - The squash is 10 to 14% wide and 12 to 13% short, then a 6 to 7% stretch,
     settled in 5 to 8 frames.
   - A heavy spell hit (v6) squashes 18 to 30% wide and 9 to 15% short, springs to 5 to 10%
     tall and about 0.88 wide, and rests by +10 to 13 frames, with the hold included.
   - The flinch is a mid-body bulge away from the hit on frame 2. The base stays anchored,
     and the body neither leans nor travels (R3).
   - The knockback adds a hop, a 7 to 12° backward tilt in the air, an air stretch and a
     1-frame landing squash (R4).
   - Bosses take half the squash and half the flinch. They get no knockback overlay, since
     the sim never moves them.
   - Champions take the squash and flinch scaled down, like bosses. They keep the knockback
     overlay (hop, tilt, landing squash) at the size of their sim push, 10 to 15% of an
     ordinary foe's.
   - If the VFX slice has built the shared envelope (§6.2 a), the model only tunes it to its
     body. A legless or coiled body squashes along its spine.
10. **K2 to K4 Death motion.** A short round swell before the pop. On a blade or fire kill
    the body burns, and the pop still ends it (K3). The body is thrown along the last hit
    before it pops. A boss model keeps its own death. If the VFX slice has built the shared
    swell and throw (§6.2 c), the model only tunes them to its body.
    - Hero fire here stays Blaze Gold and Blaze Core, not Flame orange. The ring is gold and
      fades with the flash. No flame is left on the floor after the dissolve.
    - The burn never plays on a Molten elite's own death.
11. **Colour check.** Hero fire is gold, foe fire is Foe Crimson, and nothing is Ember, Bright
    Heal or Violet unless the meaning is the same. Shape comes before colour.

The chest rules O1 to O3 are [M] too, but no model standard slice builds a chest. The VFX
slice builds them with the rest of the chest beat (§6.2 i).

### 6.2 A VFX and hit feedback slice ([V] rules)

All of this is render and audio only, so the nine goldens stay identical. It is built once
for every hero, all 42 foe kinds, the 12 champions and the 17 bosses. It is big, so it is
proposed as two PRs in order.

**Part 1: the hit and the kill**
- a. **The enemy hit reaction envelope** (R2, R3, R4 overlay, R5). Built in the shared enemy
  and boss render layers, tick-based so it holds through hitstop like the flash.
- b. **The render hold on hitstop** (F1's safe route, I3). Rig clips, the slash ribbons'
  sweep (their noise keeps running) and flare time pause for the event's ticks. Particles
  keep running.
- c. **The kill.** The death flare holds bright for 5 frames. The ground ring stays brief,
  gone within about 0.25 s, so it never reads as a telegraph (K1). The kill gets a heavier
  sound, with its weight in a rumble after the hit (A6). The body is thrown along the last
  hit (K4). The pop starts with a round swell (K2). The kill burst leans slightly along the
  last hit (P1).
- d. **Numbers.** Your own outgoing numbers get a ballistic arc that alternates sides, a big
  white pop that holds through the freeze and settles to Hearth Amber within 3 frames, crits
  at 1.55 times, and a "CRIT!" tag in all ten languages (N1 to N3).
  - Other players' numbers keep Bone at 0.7 times and 45% (N4). They take the arc with
    their own small pop, never amber.
  - Heals stay Bright Heal with "+" from their first frame, with no white pop.
  - Incoming numbers keep their Bruise Umber drop.
- e. **Contact.** A bigger bloom at the contact (P3), held at full strength for 100 to
  167 ms (L5). Magic hits leave through the far side (P1). The flash fades on spell hits
  (R1). The first impact of a tick bypasses the audio budget (I1, A1).

**Part 2: the cast, the shot, the reward and the aftermath**
- f. **Shots and spells.** The head swells at the hand (S1), stretches along its travel
  (S3) and trails longer behind it (S2). The trail drains into the hit (S5). Each shot gets
  its own size, brightness and height (S4, render only). Sparks show where a shot lands
  (P4). The light follows the flight (S7).
- g. **Sound.** A whoosh on spell casts (A2). Impact families: a boom for spells, a thunk
  for arrows, a cut for blades (A3), each with about ±6% pitch jitter (A5). A whiz while
  each shot flies, from 1 frame after the shot, along its path (A4). A ping off walls (A4).
  *My pick:* play the whiz only on your own seat's shots and on foe shots that pass near
  your hero, so a busy room does not hiss. This is my limit, not v4's.
- h. **The weapon kick on the press frame** for every rig, in the shared driver (B4).
- i. **Chests** (O1 to O5, §2.14's safe route).
  - The vault chest (a press, 1.4 s reveal) and the secret reliquary and cache (a press,
    1.2 s reveal, `SECRET_RULES.revealSec`) get the whole beat. They wobble faster and
    faster from when the hero comes near, press and tremble, then snap open with a hop, a
    4-frame render hold at its top and a zoom punch of about 2% (C2).
  - The lid is flung open, never slammed shut. The padlock flies off and stays on the
    floor. A rim line and a light sheet flash on the snap. Light comes from inside with slow
    turning rays, then stars pop and sparks rise. Each layer gets its own sound.
  - The end of the wobble, the squash, the snap and the hold fit inside the reveal. The
    light and the stars run on after it.
  - The champion chest has no press and no reveal: it opens by itself on the room clear.
    It may wobble from the champion's fall to the clear. It plays the snap, the light and
    the stars there, and needs a short UI-only hold before the draft, like the 1.5 s take
    hold (`TAKE_HOLD_MS`).
  - The Trapped Chest keeps its lure twitch, so it still reads apart from a safe chest. Its
    Take springs the ambush at once, and its lid opens on Ember sparks from the lock, with
    no light and no stars. A reward beat, if it gets one, plays when the chest pays after
    the fight (`event_chest`), inside the 1.5 s take hold.
- j. **Slash ribbons.** Traced from the weapon tip where a rig exposes one, reaching nearly
  to the hilt. A code-made slash texture times a panning mask on the blade template's trail.
  The swing's start fades in on a concave ease-out ramp, opaque by 40 to 45% of the arc.
  A tip glint on the first strike frame: a 4-point white star for 1 frame, its core about
  0.3 bw and its spikes about 1.5 bw tip to tip, then a few short streak shards round the
  tip. The shards take the slash's own colours (template gold, or the Swordsman's silver),
  never blue (§4.3) (T1 to T6).
- k. **Anime accents.** Only the local anime frame of §2.13: the ink silhouette, the focus
  lines and the spike star inside a disc of about 3 bw in radius round the contact point,
  for 3 to 4 frames. The focus lines run in from its rim and leave the figures clear. It
  plays on combo finishers and on elite, champion and boss kills. The full-screen panel
  waits for Kesh (§6.3 item 8).
- l. **Light and line.** The effect lights the target's near side as it nears (R6). Strokes
  are exaggerated and tapered (L2, L3). A flipbook primitive of 3 to 5 drawings, swapped
  every 2 ticks (L4).
- m. **Aftermath.** A gold rim of 0.8 s or less on blade-template hits, and a taper on the
  two real burns (D1). Spatter in the body's matter colour, and arrows stuck in the floor
  for a few seconds (D2). Twinkles and a faint mist that hold the place for 1 to 2 s (D3).
- n. **Ranged hold.** A 3-frame render hold on shot and spell hits (§6.3 item 2). It holds
  the target's squash, flash and number, and keeps the shot's head at the contact point.
  The burst replaces the head when the hold ends.
- o. **Camera punch (C2).** An FOV channel in camfx with its own clamp, scaled by Screen
  shake and Effects. Off under Reduced.
  - Up to about 6% (about 2.3° of the 45° FOV) on elite, champion and boss kills.
  - About 2% on a chest snap (i).
  - The 1.5% on your own melee contacts and the 3% (about 1.2°) on heavy hits and on combo
    finishers that do not kill are ordinary hits, so they wait for Kesh with F2
    (§6.3 item 4).
  - A small kick against the fire direction on your own seat's shots, inside the 0.09 u
    clamp (C1). For the Archer and the Healer it waits for Kesh (§6.3 item 7).
  - A big skill's finish may shake longer, not harder: a camfx kick of 0.2 s or less
    inside the 0.09 u clamp, only for classes that already kick today (F3). If Kesh reads
    §9 #7 strictly, it waits for him (§6.3 item 14).

X1's long sim hold, the full-screen panels of X2 to X4 and X5's 10% punch-in wait for Kesh
(§6.3 items 1, 8 and 12). X1's render-only hold for rare beats is left out until the render
hold on hitstop (b) has been judged on the laptop (§6.3 item 1).
X6 stays out on purpose: it lives only inside a full-screen panel.

Each part comes with a probe, shots at play zoom in a busy fight, German or Russian text
shots for the tag, and docs/HIT_FEEDBACK.md and design-VFX.md updated.

### 6.3 Rule changes only Kesh can name

These touch the sim (the goldens move), a written ruling or a look the game already has.
Each has my recommendation.

1. **A longer hitstop**: about 6 ticks on a melee hit and 10 on a kill, and 18 to 20 on a
   rare climax beat (X1), against 2 and 3 today.
   *My pick:* build the render hold first (§6.2 b) and judge it on the laptop, since the
   cloud runs at about 1 fps. Then decide.
2. **A hitstop on spell and shot hits.** v3 and v9 have none. v4's shots have none either,
   and its kill stops only the camera and the gun for 1 frame. v6 holds 3 frames.
   *My pick:* not in the sim, where it would eat the budget in a ranged fight. A
   render-only hold of 3 frames gives v6's look with no sim pause (§6.2 n). It holds the
   target's squash, flash and number, and keeps the shot's head at the contact point. The
   burst replaces the head when the hold ends.
3. **The hero bounces off the hit** (ruling A5). *My pick:* rig-only recoil (B3).
4. **Shake or a zoom pulse on ordinary hits** (§9 #7). *My pick:* on your own melee
   connects only: a small render kick (F2) and a zoom pulse of about 1.5%, up to 3% on
   heavy hits and combo finishers (C2).
5. **A cast wind-up before the press** (BUILD_BRIEF §6). *My pick:* no; carry it in the
   combo settle.
6. **A random spread on shots** (BUILD_BRIEF §6). *My pick:* no; use render-only variety.
7. **A camera kick on Archer and Healer shots** (a change to today's look). *My pick:* a
   tiny backward kick (0.015 u or less) on your own seat's shots only.
8. **Full-screen silhouette or invert frames, and a photosensitivity rule.** *My pick:* no
   full-screen invert. The local anime frame (§2.13, §6.2 k) needs no call, on combo
   finishers and on elite, champion and boss kills. Allow one full-screen silhouette and
   burst panel on a boss or champion kill when no telegraph is live, and adopt the
   3-flashes-a-second rule (§4.3).
9. **A real burn status** after fire hits. *My pick:* a cosmetic gold rim only (D1).
10. **The colours for ice and lightning**, when a skill is named. *My pick:* decide with the
    skill. Gold-led magic is the only free route today.
11. **A longer vault reveal for the chest wobble.** *My pick:* keep 1.4 s.
12. **A zoom punch near v5's 10%** (§22). *My pick:* no; 6% at most.
13. **A bigger knockback on the third hit** (B6). The sim keeps no basic-hit count today, so
    this needs a new sim counter and moves the goldens. *My pick:* no; make it bigger
    visually.
14. **A longer or bigger shake on a big finish** (§9 #7) than F3's safe route: a camfx kick
    of 0.2 s or less inside the 0.09 u clamp. That route already passes §9 #7's numbers, as
    Earthshatter's kick does, so if he reads §9 #7 strictly, it waits for this call too.
    *My pick:* no; keep the safe route, as Earthshatter does today.

## 7. Sources

**The videos.** All nine are by TikTok creator @qutsune (a "juicy game feel" series),
fetched on 2026-10-25. The full transcripts are in `/mnt/project-files/vfx-rules/TRANSCRIPTS.md`.

| # | Video | Length | Claims checked | Confirmed | Corrected | Unsupported | Added |
|---|---|---|---|---|---|---|---|
| 1 | [Lightning VFX in 7 Steps](https://vt.tiktok.com/ZSgxwehQW/) | 53 s | 38 | 23 | 13 | 0 | 2 |
| 2 | [How to make a punch juicy](https://vt.tiktok.com/ZSgxTcqaX/) | 30 s | 43 | 18 | 18 | 4 | 3 |
| 3 | [How to make a spell juicy](https://vt.tiktok.com/ZSgxwH75E/) | 53 s | 36 | 15 | 16 | 1 | 4 |
| 4 | [How to make shots juicy](https://vt.tiktok.com/ZSgxw2XfD/) | 52 s | 46 | 26 | 19 | 0 | 1 |
| 5 | [How to make an attack like in anime](https://vt.tiktok.com/ZSgxwHd8R/) | 24 s | 46 | 24 | 19 | 1 | 2 |
| 6 | [The Disney Secret to Juicy, Satisfying Animation](https://vt.tiktok.com/ZSgxwBYFs/) | 47 s | 42 | 16 | 23 | 1 | 2 |
| 7 | [Someone copied my format (a chest opening)](https://vt.tiktok.com/ZSgxwhr6o/) | 27 s | 31 | 18 | 10 | 1 | 2 |
| 8 | [How to make sword swipes JUICY](https://vt.tiktok.com/ZSgxw2WfH/) | 30 s | 54 | 24 | 29 | 0 | 1 |
| 9 | [8 steps to a juicy ice attack](https://vt.tiktok.com/ZSgxwy3JH/) | 35 s | 38 | 22 | 11 | 1 | 4 |
| | **All nine** | | **374** | **186** | **158** | **9** | **21** |

The verify pass corrected 158 of the first pass's 353 measured claims and added 21 of its
own, which is why every number in this doc comes from the verified notes.

**How they were measured.**
- The clips were downloaded through TikTok's own page data (yt-dlp could not read these
  links). Every frame was extracted at 30 fps with ffmpeg.
- Each frame was measured by script: the mean colour of fixed patches, white-pixel counts in
  the target, bounding boxes of each body, and block-matching motion for camera shake and
  zoom. Crops were then read by eye, with a 10 px ruler where sizes mattered.
- Sound was read from per-frame spectrograms and loudness. The words come from TikTok's
  captions (8 of 9 videos) merged with an offline SenseVoice speech-to-text pass (all 9).
- **Two passes per video.** A watch pass measured every step. An independent verify pass
  then re-measured each claim from the raw frames and marked it confirmed, corrected,
  unsupported or added. This doc uses the verify pass wherever the two disagreed.
- The full measured notes for each video (every step, measurement, method, colour, the
  sound, and every verdict) are in `/mnt/project-files/vfx-rules/analysis/`.

**How the game was read.**
- Four read-only maps of the code at 7999610: the hit chain (sim to render), the attack
  side (rigs, casts, projectiles), audio, loot and settings, and the written rulings. Then a
  recheck at gauntlet e1ba618, which adds the faceted Wyrm and Tank rigs and the rig cues
  but changes none of the values this doc cites (Appendix B).
- An independent check of every claim this doc makes about today's code. A second check
  then tried to disprove each error the first one found, before the doc was corrected.

**Limits.**
- The clips are 30 fps captures of a 60 fps game, so every timing is ±1 frame (±33 ms).
- Colours come from compressed video and are often blended with bloom. Treat the hex
  values as hues, not exact values.
- Sizes are converted to bw by the target's own width in each clip.
- v1 is a flat side-on sketch, and its blob target is wider than it is tall, so its sizes in
  bw are rough (Units). v7's sizes are in chest widths.
- Sound timing is looser than picture timing. In v1, v3, v4 and v6 the sound leads the
  picture (v1 by 35 to 70 ms, median 55 ms; v3 by 75 to 90 ms; v4 by 10 to 118 ms, median
  55 ms; v6 by 67 to 108 ms). That looks like a capture or encode offset, so those files
  cannot prove frame-exact sync.
- Nothing here was timed inside Echoes itself: the cloud renders at about 1 fps, so the
  feel of every rule must be judged on a real machine.

## Appendix A. Measured notes per video

The full notes for each video are in `/mnt/project-files/vfx-rules/analysis/`, one file per
video. This table holds the numbers most worth remembering and where each video lives in
this doc.

| Video | What it teaches | Numbers to remember | Where |
|---|---|---|---|
| v1 Lightning | Build an effect from structure to light; animate it with a few drawings | Straight segments with the corners pushed out (about 16% wider in all); bends 4 to 5 times the run width; 5 drawings, one every 2 ticks; 167 to 200 ms of bolt; the core dies first; a boom falling 160 to 40 Hz in 0.3 to 0.35 s, cut hard at 0.5 s | I3, L1 to L4, F3, recipe 3.4 |
| v2 Punch | Flash, sound, particles, shake, freeze, knockback, then a kill pop | Flash 2 to 3 frames, hard cut (5 to 6 with the freeze); thump 52 to 56 Hz on the impact frame; freeze 3 frames (5 on the kill); 15 to 25 shards out of the far side; knockback 0.85 bw with a hop of about 0.4 bw; kill swell 1.3 to 1.45 times wide | I1, I2, R1, R4, F1, F2, F4, P1, B1, B2, B6, K1, K2, A1, A2, recipe 3.1 |
| v3 Spell | Charge, launch, travel, impact, reaction, aftermath | 12-frame charge; 11-frame flight; bloom about 2 target widths for 4 frames; boom 43 to 48 Hz; number pops 1.4 times and settles in 2 frames; no freeze; on the kill the body dissolves from +11 and is gone at +32 (1.07 s) | R3, S1, S2, S5, S7, L5, N1 to N4, K3, D1, recipe 3.2 |
| v4 Shots | Muzzle, tracers, variety, hit, recoil, mess, sound, kill | Muzzle starburst 0.6 to 0.75 bw on the press frame; ±6° and ±20% speed per shot; 1-frame flash per bullet; the target pushed 0.5 bw with a low hop, held 300 ms; a 3% zoom on a burst's first shot, gone in 6 to 7 frames; four sounds at four events; a 7.4% punch-in on the kill | R4, P4, B4, S4, K4, D2, A4, C1, recipe 3.3 |
| v5 Anime | A long freeze filled with ink panels, then a punch-in | Freeze 9 to 10 frames; panels of 1 to 2 frames in black, white and one red; about 8 black-and-white cycles a second; punch-in about 1.10 to 1.12 times (1.08 to 1.16 across demos), back in 3 to 4 frames; the third hit throws about 1.5 bw | X1 to X6, B6, B9 |
| v6 Disney | Anticipation, squash and stretch, follow-through, timing, arcs | Wind-up 10 to 11 frames, release 1 frame; the fireball's core stretches about 2 to 1; target squash 1.18 to 1.3 by 0.85 to 0.91, spring to 1.05 to 1.1 tall, at rest by +10 to 13; a 3-frame hold; numbers arc to alternating sides, apex at +13 to 16 frames | B1, B5, R2, F1, P2, S3, S6, N1, N2, A3, recipe 3.6 |
| v7 Chest | Wobble, press, snap, light, sparkles | Wobble 0.7 to 0.9 s, period 280 to 300 ms down to about 230; press to 0.92 by 1.07 for about 0.5 s; lid open in 2 to 3 frames; a 4-frame hold at the top of the hop; a zoom pulse of about 1.9%; 8 stars popping one by one 0.87 to 1.5 s after the snap | O1 to O5, C2 |
| v8 Sword | Trace the tip, widen the band, mesh it, fade the start, pan a mask | Inner edge at 0.3 of the tip radius; about 240 triangles; opaque by 40 to 45% of the arc; 40 to 70° lit at once; trail visible 8 to 9 frames; flash 4 to 5 frames, hold 3 frames, zoom 1 to 1.5% | T1 to T6, R1, F1, F2, B2, B9, C2 |
| v9 Ice | Charge, a line of growing spikes, a cracked floor, a big finish, a slow shatter | A 24 to 26 frame charge, then the same 16 to 17 frames from cast to hit as the plain version; about 20 spikes growing 5 times; a crown overshooting 1.3 times; the camera still until the finish; shards linger at least 0.9 s | B1, R6, F3, P3, D3, recipe 3.5 |

## Appendix B. Corrections to EXISTING_RULES.md

Each entry below was checked in the code at 7999610, then rechecked at gauntlet e1ba618.
e1ba618 changes none of the values below. It does edit some of the files they rest on:
`src/render/boss/index.js` and `src/render/critters/index.js` now build the faceted model
standard rigs for the Barrow Wyrm and the Tank (with the same flash paths),
`src/render/allies/index.js` cues the rig on each basic swing and cast, and
`src/render/critters/common.js` gained `addInstancedInk`.

1. **Hit flash.** 3 ticks at 1.0 holds for rank-and-file foes, dummies, nests, the
   waystone, the Escort's pilgrim and barricades.
   - Champions flash at 0.4 and the Gale Herald at 0.25.
   - Bosses use a separate envelope: 5 ticks, a linear decay from a peak of 0.28, and an
     8-tick refractory.
   - Party members flash crimson #FF4A4A, not white.
   - The kill pop is a separate beat: every non-boss foe's pop starts at 1.0, a champion's
     included.
2. **Hitstop.**
   - `combatAllowed()` is defined in `src/sim/run.js`, not world.js. It is also true before
     any run starts, so harness scenes get hitstop.
   - The budget window covers 21 ticks, inclusive.
   - Only a melee-arc connect that does not kill gets the 2-tick hit pause. Every other
     shape gets none, not only bites: shots, novas, ground zones, direct hits, cones, lanes,
     rings and auras. A kill of any shape still pauses 3 ticks. Breakables are the one
     exception.
3. **Screenshake.**
   - Every kill shakes 0.06 u for 0.12 s wherever it happens, with no distance check.
   - 25 boss beats run 0.18 s, not only the stomp and the quake: the Stag's quake landing
     and trample, plus 23 `ctx.shake` beats across the other 16 bosses (`src/sim/bosses/`).
   - Hazards and kegs shake too.
4. **Anticipation.** ANTICIP is 0.06 s.
   - On the heroes it plays after the sim has already resolved the cast, and it delays only
     the visible landing. It is wired to novas, ground placements, a few big skills, the
     Tidecaller's waves and the Bellwright's hung bells, never to shots or swings.
   - Foes get the same `anticipate()` gather. On boss and champion wind-ups
     (`boss_telegraph_start`, `champion_tell` and the per-boss wind-ups) it plays at the
     tell, before the blow lands. Some foe and boss moves gather and land 0.06 s later like
     the hero casts (the Thornling's plant, the Chime Wraith's toll, the Cindermoth's flare,
     several boss casts and the phase turns). The wasp dart and the kite dive do not wait.
   - It also plays on the key, vault, shrine, secret, tonic and relic beats.
5. **Impact.**
   - The shockwave ring plays on crits only.
   - The light pool plays only for the Archer, Healer, Tidecaller and Bellwright.
   - The Duskwing gets needle stars. The Tidecaller and the Bellwright get round bursts.
6. **Ground marks.** Hero class marks last 1.8 to 3.2 s. Across the VFX files, `kit.mark`
   runs from 0.8 to 8.5 s (the longest is the Hang Bell's floor ring: its 8 tolls plus
   0.5 s).
7. **Randomness.** The sim half of the rule holds. In the render, `decals.js` (the splat
   canvas), `tonicfx.js` (the fire-patch smoke and light flicker) and two rig fallbacks (the
   pose driver in `critters/driver.js` and the fall side in `critters/index.js`) call
   `Math.random` directly. Every caller passes a cosmetic stream today, so the two
   fallbacks never run. The whole audio layer calls `Math.random` too. The cosmetic stream
   is itself unseeded, so all of it is cosmetic and the goldens are safe.
8. **Crowd dimming** applies only to the circle, beam, blaze and blast pools. Stardust,
   bits, sparks and heads are never dimmed.
9. **Effects: Reduced** halves particles, sets camera kicks to 0, and dims light pools to
   0.45 (it does not remove them). It does not dim `kit.flash` sprites.
10. **Screen shake** has three steps (0, 0.5 and 1). It scales the sim shake's render
    amplitude and every camfx kick and dolly.
11. **Damage numbers.**
    - Incoming numbers drop straight down. Their only sideways offset is the fixed fan
      slot set at spawn. The "sideways shake" exists only in two code comments
      (`src/render/numbers.js`, `src/scenes/graybox.js`) and in §17.
    - At the cap of 12, a number is released at once, not faded.
12. **Ember** is not only on floor telegraphs. The foe matter layer still draws Ember sparks
    when an enemy's hit lands on the party, Ember motes on enemy wind-ups, and Ember on
    some landing beats.
13. **Ruling A5.** Only §9 knockback skips the party. The sim still moves heroes in many
    other ways:
    - Bosses: Skyhorn's Horn Rush, Ash Raven's Wing Gust, Hourwarden's Hand Sweep,
      Cinderback's Tail Lash, Mire King's Tongue Lash and Swallow, and Veinweaver's Bind.
    - Champions: Gale Call, Antler Toss, Chain Hook, Rope Swing and Grate Blast.
    - Foes: the Vine Lasher's yank and the Rope Hanger's swing.
    - The Gusting elite, the millrace and gust vent hazards, and authored dashes and vaults.
14. **"Effects never hide a character"** is softened by tall light shafts.
    - design-VFX §11's template beams: magic cast beams are 3.6 u tall, nova edges 2.4 u,
      placed-spell beams 5.5 u, and a champion's fall or a boss's death 5 to 6 u.
    - The kit's own pillars, which predate design-VFX §11, go higher: the vault key
      7 to 8 u, the vault opening 8 to 9 u, and several secret, shrine and relic beats
      6 to 7.5 u.
    - Both fade over their whole height, not above 1.6 u.
15. **Signal Blue** is also the Rare colour, the slow ring and the glow on several relics.
    It also draws the Rootsnare rim and its tick rings, the Snare node's pulse, the Hunt's
    quarry mark and banner bar, and the Wishing Well's accent. It tints the scene's sky
    light, and many foe rigs mix it into their colours.
16. **The 20-telegraph cap** is written in BUILD_BRIEF §1 but not enforced in code. The
    only limit is the governor: 2 player-targeted telegraphs at once, 72 ticks apart.
