# Stonehide: motion audit and detail pass (18 Nov)

**PASSED.** Kesh, 18 Nov 20:18 Singapore time: "mark stonehide pass" (the motion pass and the longer wind-ups).

Kesh, 18 Nov 08:47 UTC: "now do audit and review to insanely fill in motion details with extreme quality".

Scope: the body motion of every clip on the Stonehide ability page (version 8), checked against his two
animation templates (combo flow, momentum inheritance, key poses: anticipation, strike, contact,
follow-through) and his technical self-check (root and legs agree, planted feet locked, hips and legs
make the force). Effects and numbers of the kit were not touched. Every skill's effect still lands 0.10 s
after the press, except the four big skills, which got a longer wind-up on his yes (section 5).

## 1. What the audit found

1. **Twelve skills shared two cast moves.** Bellow, Colossus, Grindstone, Rallying Cry, Bloodboil and Iron
   Quills all played the model page's roar. Growlstone, Stone Ring, Stone Cubs, Fault Line, Heavy Slam and
   Iron Briar all played its plant. Slabguard, Stoneheart, Iron Bristles and Grudge all played its guard.
2. **Every wind-up was skipped.** The page moves were made for the model page, with the contact 0.2 to
   0.46 s in. To land the effect at 0.10 s the build started each clip 0.10 s before its contact, so the
   anticipation never played and the pose popped in over 0.06 s.
3. **Nine moves were thin.** Burrow (down and up), Maul, Rock Toss, Savage Bite, the hop, Slab Throw,
   Badger Toss and Counter Spin were built in the page code at 30 fps from 4 to 6 keys each, with a full
   stop at every key and none of the model page's detail: no follow-through lag, no ear or tail springs,
   no hip drive, no floor or slab clearance.
4. **Planted feet slid** (self-check 2). Measured on the passed base clips, how far a foot on the floor
   travels along it: combo 1.15 u, shield thrust 0.81 u, guard 0.65 u, sweep 0.41 u, hurt 0.20 u, plant
   0.16 u.
5. **Maul froze his legs.** The clip held the legs still while the sim walked him at half speed.
6. **Slabguard froze his legs too** for its first 2 s (the guard clip's legs over a moving body).
7. **The slab came back to a still paw.** No catch.
8. **Grudge's slam had no wind-up** (the plant clip from its last 0.10 s), and Slabguard's shove was the
   first hit of the basic combo.
9. **Savage Bite's body moved before its legs did:** the lunge slid him along the floor during the
   crouch frames (self-check 1).
10. **The tail tip popped about 10 degrees** at the start of most clips (the sway did not start from rest).
11. **The clips were recorded at 15 frames a second,** so a 0.10 s wind-up was one frame.

## 2. What was built

A motion build for this page (`tools/motion/`): the model page's own build (60 fps bake, a smooth curve
through the keys, contact frames that arrive at full speed, follow-through lag on chest, head and the free
arm, ear and tail springs, hip drive, slab kept out of his body and above the floor), plus one new part:
**a foot lock.** A foot on the floor keeps its place and heading while the body moves over it; when the
body has gone too far it takes one short lifted step. Feet in the air are left alone.

Every move below has: a compact wind-up opposite to the blow (0 to 0.10 s), the contact at 0.10 s arriving
at full speed, a carry past it, a held beat with his weight down, and a slow heavy recovery (the Tank
rule: short release, slow recovery, weight drops on every contact, the slab leads).

| # | Skill (page clip) | Move | What he does |
|---|---|---|---|
| 1 | Bellow (S16) | bellow | Drops, fills his chest, arms thrown wide, head back; the roar sweeps right to left. |
| 2 | Rock Toss (S17) | toss | Scoops a rock beside his right foot, lobs it underarm, weight onto the front foot. |
| 3 | Landslide (S18) | haul | Digs the slab's edge in far out, hauls it back along the floor, rocks onto his heels. |
| 4 | Growlstone (S19) | summonStone | A stamp, then he hauls the stone up with the free paw, shaking with the weight. |
| 5 | Slabguard (S21) | guardUp, shove | A stamp and the slab is square in front. At the end he sinks back, then rams it out. His legs walk under it. |
| 6 | Bodyguard (S22) | hop | Crouch, legs tucked, the slab swings to the front in the air, lands squashed behind it. |
| 7 | Fault Line (S23) | faultLine | The long load: slab up at 0.10 s (the line shows), he strains on his toes, hop, edge into the floor at 0.50 s. |
| 8 | Burrow (S24) | digDown, digUp | Right claw, left claw, in head first. Out paws first, lands, shakes the dirt off like a wet dog. |
| 9 | Rallying Cry (S25) | rally | Fist punched straight up, slab raised beside it like a banner, two pumps. |
| 10 | Heavy Slam (S26) | heavySlam | Long wind-up: the slab goes up, he strains on his toes and hops. Then a belly flop: the slab goes down flat with both paws and all his weight on it, 0.3 s after the press. |
| 11 | Maul (S27) | maul | Slab edge from the left, claws from the right, six times; each follow-through is the next wind-up. Upper body only: his legs walk. |
| 12 | Bloodboil (S28) | boil | Two thumps on his chest, then head back in a snarl, trembling. |
| 13 | Savage Bite (S29) | bite | Drops on his haunches, leaps flat with the slab swept back, head snaps down, worries it side to side. |
| 14 | Iron Bristles (S30) | bristle | A wet-dog shake from hips to ears, then he stands a size bigger. |
| 15 | Grudge (S31) | grudgeBrace, grudgeSlam | Hunched behind the slab, shaking harder as it counts (legs free to walk). Then the long wind-up: slab up, he strains under it, leaves the floor, comes down on its edge 0.35 s after the count ends, and roars. |
| 16 | Iron Briar (S32) | scatter | A sower's backhand from the hips; the slab swings back as the counterweight. |
| 17 | Iron Quills (S33) | quills | Balls up tight, snaps open with his back arched; a shiver runs out after. |
| 18 | Colossus (S45) | colossus | Long wind-up: a breath in on his toes, then he curls in and stamps (0.3 s after the press), and swells out of the curl through the half second he grows; roar at full height. |
| 19 | Stone Ring (S47) | plant | A short stab of the slab's edge at his feet; he watches the stones rise left, then right. |
| 20 | Slab Throw (S48) | throw, catch | A discus throw off a straight arm, hips first. On the return it slaps into his paw, turns him, and he hitches it back. |
| 21 | Grindstone (S49) | grind | Drags the slab's edge across the floor round him, left to right, low. |
| 22 | Stone Cubs (S50) | callCubs | Knocks the slab's edge on the floor twice, looks to each side, waves them up. |
| 23 | Stoneheart (S53) | stoneheart | One fist on his chest, a wide stance, and he goes still as stone. |
| 24 | Counter Spin (S54) | spin | A hop and one full turn in the air with the slab out as a blade. |
| 25 | Badger Toss (S55) | grab | Goes down for it, hoists it over his shoulder, strains under it with his back arched (the long wind-up), and whips it forward 0.55 s after the grab. |
| 26 | Basic combo (S14) | combo | The passed keys, re-baked with the foot lock and a tail that starts from rest. |

The dash is the passed clip, unchanged.

## 3. Numbers, before and after

| Check | Before | After |
|---|---|---|
| Skills with a move of their own (Fracture is a passive with none) | 9 of 25 | 25 of 25 |
| Wind-up frames played | none (clips started at contact minus 0.10 s) | all (every clip starts at 0) |
| Bake rate of the skill moves | 30 fps, 4 to 6 keys, a stop at each key | 60 fps, smooth through the keys |
| Planted-foot slide, standing moves | 0.16 to 1.15 u | 0.00 to 0.03 u (30 moves measured) |
| Combo foot slide | 1.15 u | 0.03 u |
| Pose jump at a clip's first frame | up to 13 degrees (tail), plus the skipped wind-up | 0 |
| Ears and tail | springs on 5 base moves only | springs on every move |
| Page clips | 15 frames a second | 30 frames a second |

Measured by `tools/motion/audit.mjs` on the baked frames. Hop, bite and the dig travel through the air,
so the slide figure does not apply to them.

## 4. Not assessed, guesses, limits

- **Feel is not judged.** Cloud renders are slow software GL; weight and snap need his laptop.
- The page clips are at play zoom, so fine detail (ears, tail, fingers) is small there. The model page
  shows the same skeleton close up; the moves file loads there as it is.
- Every pose is my guess from the skill's text. None came from a reference video.
- **Bare Claws** (no slab) reuses each move with the slab hidden. Only the combo's third hit was remade
  (both fists come down). His left arm still shapes itself round a slab that is not there in the others.
- His arms are too short to put both paws on the slab overhead, as on the model page: the free paw joins
  it as it lands.
- The dash, the walks and runs, idle, hurt and the downed set are the passed clips, not rebuilt.
- Four moves keep 2 to 14 mesh points touching (slab brushing an ear or the hood for a frame in the hop,
  Badger Toss and Grudge slam; a tail tip at the floor in Landslide).

## 5. Longer wind-ups on the four big skills (built)

Offered as an open choice with version 9; Kesh, 18 Nov 19:55 Singapore time: "yes". This changes how the
game plays, so it is also written into the kit doc (`stonehide-talents/STONEHIDE_SKILL_KIT.md`, lines
marked "Wind-up").

| Skill | Before | Now |
|---|---|---|
| Heavy Slam | lands 0.10 s after the press | lands 0.30 s after the press |
| Colossus | roar and taunt at 0.10 s, growing from 0.25 s | roar and taunt at 0.30 s, growing from 0.45 s |
| Grudge's slam | 0.10 s after the count ends (move starts 0.3 s before) | 0.35 s after the count ends (move starts 0.3 s before) |
| Badger Toss | lets go 0.30 s after the grab | lets go 0.55 s after the grab |

- Retaken: S26, S19b, S45, S45b, S31, S55, S55b, C5, C8, C9 and BC (every clip that uses one of the four).
- Not shown in a clip: the dash cancelling one of these wind-ups (his rule). The review build's dash does
  not cancel a cast, so that needs the real build.
- Spike (C5) still works: Fault Line throws the first foe up for 1 s, and the slam lands inside that.
- The other 21 skills keep the 0.10 s rule. Fault Line keeps its own 0.4 s.

## 6. Files

- Moves: `tools/motion/moves.mjs` (keys and comments), build `build3.mjs`, audit `audit.mjs`, stills
  `shots.py`.
- Baked file: `tools/motion/tank-tripo-moves.glb` (the passed model plus 30 clips; the passed file is untouched).
- Review build wiring: `tripoTank.js`, `reviewStonehide.js` (review only, never committed).
