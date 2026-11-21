# Video 9: 8-steps-juicy-ice-attack (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

The video is vertical, 576x1024 at 30 fps and 35.1 s long (1053 frames). The camera is a single fixed, high three-quarter view looking down at roughly 45-55 degrees, with the floor grid tilted on screen. Steps 1-5 never move the camera at all.

The cast:
- The orange hero capsule (about #EE7F36) sits bottom-left, centred at (158,545), about 72x103 px.
- The purple enemy capsule (about #6E67C7) sits upper-right, centred at (420,377), 60x89 px.
- They are 311 px apart on screen, about 5.2 enemy widths. This video has no health bar.
- The background is dark navy #0B101D and the floor about #0F172C.

Screen layout from top to bottom:
- A persistent hand-lettered title, "HOW TO: / MAKE ICE SPIKES JUICY!", with a wavy underline.
- A step label under the title: a circled number plus a name.
- The demo.
- A two-line caption that types itself in. The first line is pale blue (about #9BCAF4) and the second a gold emphasis line (about #E3D173-#FAEEAF).
- A row of 8 numbered circles that fills as the steps advance.

Structure: a sequential, cumulative build-up with no split screen.
- 0-2.3 s: the plain version is shown once.
- 2.3-4.4 s: "LET'S MAKE IT JUICY... IN 8 STEPS!"
- Step label changes start at f134 (4.47 s), f246 (8.2 s), f355 (11.83 s), f461 (15.37 s), f566 (18.87 s), f678 (22.6 s), f813 (27.1 s) and f918 (30.6 s). Each wipe takes about 12 frames.
- Each step, 3.5-4.5 s long, shows one complete cast with every earlier layer: about 0.8-0.87 s of charge, the cast, about 0.53-0.57 s of travel, the impact, then 1-2 s of aftermath.
- Outro: the step label is gone at f1027-1028 (34.25 s). The whole frame dims over f1030-1038 (corner luma 16.1 to 11.9, mean luma 28 to 19.5), "SAVE THIS FOR LATER!" types in, and a bookmark outline appears at about f1040 and is filled yellow by f1048.

Editing: each step is a separate take, joined by cuts or short dissolves.
- Plain to step 1: the plain cast replays at f142-145 and dissolves into the charged take over f145-149.
- End of step 6: the take runs into a second charge (glow from f804, ring at f822-824) that is cut on the step 7 label change before release. The step 7 take's charge starts at f826-828.
- End of step 7: the shards and crack decal fade over f926-931 into the step 8 take.

Steps 6, 7 and 8 replay the same take, so the effect is deterministic. The casts fall on f717, f852 and f956, and the flashes on f733, f868 and f972. Timing, camera shake and spike geometry match exactly, and frames differ only at codec-noise level plus a few sparkles; only the new layers are added. Cast-to-impact alternates between 17 frames (plain and steps 1, 4, 5) and 16 (steps 2, 3, 6, 7, 8), which fits a true value of about 16.5 frames (about 550 ms) sampled at 30 fps.

## Before and after

PLAIN version (f0-60), which the creator calls 'works but feels like nothing':
- The hero slowly squashes in anticipation for about 0.8-0.9 s (f4-f28). Its top drops 492 to 508 px and its bbox goes 70x105 to 81x94 (-10% height, +16% width).
- On the cast frame, f31 (1.033 s), it snaps taller and leans about 15-17 degrees back, away from the target. The lean decays over 7 frames (f31-38).
- A single opaque, matte, pale-blue faceted icicle appears (median #9ACFF0), about 34x78 px (0.55 x 1.3 enemy widths). It leans slightly forward and slides along the floor at 13.4-13.9 px/frame (about 410 px/s, constant).
- At the enemy's feet it sinks into the ground over f47-49.
- The enemy squashes for exactly 1 frame at f48 (1.600 s). Its top drops 12 px (332 to 344) and its bottom edge moves 6 px down the screen, so the bbox goes 60x89 to 68x83 (+13% width, -7% bbox height). It rebounds on f49 (top 332), stretches on f50 (top 328, 57 px wide), and settles by f52.
- Cast-to-hit is 17 frames (567 ms).
- There is nothing else: no glow or light, no particles, no flash, no shake, no floor mark, no aftermath and no sound effect. The hit sits under narration, and no SFX exists anywhere it can be tested.

JUICY version (step 8, the full stack):
- About 0.8 s of charge: spark specks gather into a glow at the hand. In the last 6 frames a camera-facing ring 131-135 px across (about 2.2 enemy widths) collapses into a bright orb, and a 1-2 frame glow burst (about 50 ms) fires on the cast frame.
- The icicle is replaced by a sequential wave of translucent cyan crystal spikes erupting from the floor along the whole path at about 15.6 px/frame. Each spike is born white-hot for 1-2 frames, cools to cyan, and pops up with an area overshoot of about 1.2-1.3x.
- The spikes grow about 5x taller toward the target and fan out into a wedge, with smaller spikes on the flanks tilted outward.
- From step 6 on, a light 1-2 px camera rumble runs during the travel.
- Frost specks start floating up along the path during the travel, from about cast+8 to +12.
- At the target:
  - a 1-frame squash;
  - the enemy turns white for about 4 frames (partly white for 6) and fades over about 12 frames to an icy tint;
  - a local radial bloom spreads to about 160-200 px (about 3 enemy widths);
  - the camera kicks to 8 px and shakes, decaying, for about 9 frames;
  - a huge crown of spikes pops up to 1.31x its final height in 3-4 frames and settles over about 10-15 frames, encasing the enemy.
- A cracked-floor decal pops in 3 frames after the hit, about 236-266 x 103-110 px (about 4 enemy widths), with debris chunks.
- About 1 s after the hit the spikes melt from the hero end toward the target with a white-hot receding front, leaving a field of tiny glowing shards on the floor.
- A cloud of tiny twinkling frost specks and a faint mist hangs over the area until the outro.

What does NOT change: the cast-to-impact time stays 16-17 frames (533-567 ms) in every version, and the enemy's 1-frame squash and stretch is identical. The juice is entirely added layers, not slower gameplay. Screen area covered by ice grows from about 1.5k px (icicle) to about 6-8k (step 2), 15.7k (step 3), 25.7k (step 4) and about 29-36k (step 6), depending on the mask.

## Step 1: Charge up

**Narration.** "Step 1, charge up: gather magic in the hand and let it burst out on the cast." (webvtt 4.58-8.32 s; auto-captions accurate)

**On screen.** Label: "(1) CHARGE UP!" Caption: "GATHER MAGIC IN THE HAND..." / "AND LET IT BURST OUT ON THE CAST!" (second line gold)

**What you see.**

f142-145 replay the old plain cast, then dissolve into the new take over f145-149, with the plain icicle fading to a ghost. The new take, frame by frame:
- f146: a small blue glow appears on the hero's leading edge, the side facing the enemy, about 20 px below the top of the capsule (the 'hand'), centred at about (196,513). The hero is in its slow anticipation squash.
- f149-165: about 15-20 tiny blue-white dashes are visible at once, scattered about 35-80 px from the hand and mostly on the enemy side and above. Their radial streak shape reads as sparks flying inward. The glow holds at about 40-47 px, and from about f158-162 a thin vertical up-arrow-shaped light streak flickers in it.
- f166: a crisp saturated blue ring appears around the hand, 131-135 px across (about 1.9x hero width, 2.2 enemy widths). It is a perfect circle on screen, so it faces the camera like a billboard; it does not lie on the floor.
- f167-170: the ring contracts to about 112, 101 and 86 px, then to a small ring of about 57-60 px inside a glow. It implodes into the hand over 4 frames.
- f171: a bright cyan-white orb, about a 25 px core inside a 68-88 px glow.
- f172 (5.733 s), the cast: the hero snaps upright and leans back, and the same plain icicle spawns. A blue glow burst about 57x69 px sits behind the icicle's base.
- f173: the burst dims (about 40x53 px).
- f174: the burst is gone, leaving a few white sparkles.
- f174-189: the icicle travels as before and hits on f189 (6.30 s) with the usual 1-frame enemy squash (top 333 to 344).

The same charge timing repeats in every later step: glow at cast-24 to cast-26, ring at exactly cast-6, orb at cast-1.

**Measurements.**

- **total charge time before release**: glow appears 24-26 frames (0.80-0.87 s) before the cast in all 8 steps (e.g. f146 to f172); the sparks are visible from f149, 23 frames before (frames 146-172, 255-285, 368-394, 475-500, 580-604, 691-717, 826-852, 931-956; confidence high)
  - Method: saturated-blue mask (B>180, R<120, B-R>100) pixel count per frame relative to each cast
- **ring implosion**: ring appears exactly 6 frames (200 ms) before release; outer diameter 131 to 112 to 101 to 86 to about 57-75 px (glow included) over f166-170; orb with a 68 px glow on f171; centre about (196,513); 131x131 px on screen, so it is a camera-facing billboard (frames 166-172; confidence high)
  - Method: 1st-99th percentile extents of the saturated-blue mask plus visual check at 1x
- **gathering particles**: about 15-20 small sparks visible at once, median 36-59 px (max about 61-80 px, about 1.1 hero widths) from the hand, each about 2-13 px in area; individual inward motion not trackable (frames 147-171; confidence medium)
  - Method: connected components (luma>90, B>R+10, changed vs f138, area<=40 px, r>25 px) and distance to the glow centre
- **release burst**: 1-2 frames: blue px 2289 (cast), 1591 (cast+1), 15 (cast+2) in step 1, and the same in steps 4 and 5; only about 180-280 px at cast+1 in steps 2, 3, 6, 7 and 8, so the true burst is about 1.5 video frames (about 50 ms) (frames 172-174, 285-287, 394-396, 500-502, 604-606, 717-719, 852-854, 956-958; confidence high)
  - Method: blue-pixel mask count and bbox per frame, all 8 casts compared
- **cast-to-hit time (unchanged)**: f172 to f189 = 17 frames (567 ms), identical to the plain f31 to f48 (frames 31,48,172,189; confidence high)
  - Method: hero top-edge snap and enemy top-edge drop from tracking
- **hero cast recoil (present in all versions, not taught)**: leans about 15-17 degrees back, away from the target, on the cast frame and decays over 7 frames (233 ms); bbox top snaps from the squashed 508-520 px to 496 px (frames 28-39,172-181; confidence medium)
  - Method: principal-axis angle of the orange mask (rest about -5 degrees, cast frame -18 to -22 degrees)

**Colours.** #4BAEF4 charge glow (median); #84E9FF charge glow highlight; #1B75E4 ring (median), #084FAE darkest, #308DFF brightest; #FFFFFF orb core; #2F99FB release burst glow; #9ACFF0 the plain icicle, which is still used in this step

**Rule.** Gather inward-streaking spark specks into a glow at the casting hand for about 0.8 s before the release. In the last 6 frames (0.2 s), collapse a camera-facing ring about 2.2 target-widths across into the hand, hold a bright orb for 1 frame, then fire a glow burst of about 50 ms (1-2 frames at 30 fps) on the release frame.

## Step 2: Spikes

**Narration.** "Step 2, spikes. Instead of one icicle, pop spikes out of the ground." (webvtt 8.34-12.02 s; auto-captions accurate)

**On screen.** Label: "(2) SPIKES!" Caption: "INSTEAD OF ONE ICICLE..." / "POP SPIKES OUT OF THE GROUND!"

**What you see.**

The charge plays as in step 1:
- f255: glow appears.
- f279: ring appears.
- f285 (9.50 s): cast.

There is no icicle. The spikes:
- f286: a first tiny white shard appears.
- f287: two frames after the cast, the first cluster of 2-3 small crystal shards erupts from the floor at the hero's front foot, about 35 px ahead of the hero's centre.
- The spikes are translucent faceted ice: dark floor shows through the body, with bright cyan edges and white emissive tips, leaning forward toward the target.
- New spikes keep popping up one after another along the straight line to the enemy's feet, forming a single continuous ridge of about 20 small spikes, each roughly 20-35 px tall.
- The newest spikes at the front of the wave are overexposed white and cool to cyan within about 3 frames, so the wave has a white-hot leading edge.
- f301 (10.03 s): the front reaches the enemy's feet, and the enemy does its 1-frame squash (top 333 to 348). It rebounds f302 (338), stretches f303-304 (330) and settles by f306.
- f301-330: the ridge holds.
- f331-350: the ridge sinks away in spawn order, starting at the hero end, as a second wave travelling toward the enemy. The receding end shows a small bright flash. The last spike, at the enemy's feet, is gone by f350-351.

**Measurements.**

- **spawn wave speed**: white leading edge moves about 15.6 px/frame (about 470 px/s) along the hero-to-enemy line: 50 px at f287, 136 at f292, 213 at f297, 268 at f301; it reaches the enemy's feet 16 frames (533 ms) after the cast, a little faster than the plain icicle (13.4-13.9 px/frame) (frames 286-302; confidence high)
  - Method: pure-white pixels projected onto the hero foot (190,575) to enemy foot (420,421) axis, max per frame
- **spike size and count**: about 20-35 px tall each (about 0.2-0.35x hero height, about 0.4-0.5 enemy widths), leaning forward; about 20 spikes in one row over about 255 px; band about 25-45 px wide on screen (frames 300,310; confidence medium)
  - Method: contiguous ice height above the axis plus 1.2x zoom read
- **white-hot birth then cool**: pure-white px (all channels >225) in fixed 50x50 boxes peak at 313/183/110 px 1-2 frames after the spikes appear and fall 60-90% within 3 frames; a residue of white tips stays while the ridge holds (frames 287-317; confidence high)
  - Method: pure-white pixel count in three fixed boxes at 30/50/70% of the path
- **pop-up with overshoot**: cyan area in a box peaks 4-5 frames after appearing (e.g. 106, 565, 902, 1319, 1541 px) and then shrinks to 1.23-1.33x below that peak over 12-15 frames (frames 288-317; confidence medium)
  - Method: cyan pixel count in fixed boxes
- **spike lifetime and despawn order**: each spike lives about 44-48 frames (1.47-1.6 s); the despawn front moves hero-to-enemy over f331-350 (about 19 frames, about 13 px/frame, in uneven jumps), first in, first out (frames 329-351; confidence high)
  - Method: rear edge (0.5th percentile) of the projected ice mask per frame

**Colours.** #62A5D4 spike pixels (median of the changed-ice mask; #4A71A1 in the darker translucent body); #A4ECFF to #AAEEFF spike faces; #E4FFFF spike edges; #FFFFFF newborn spike tips (white-hot)

**Rule.** Replace a single travelling projectile with a sequence of ground-erupting spikes that spawn one after another along the path at about projectile speed. Each is born white-hot for 1-2 frames and pops up with about 20-30% overshoot over 4-5 frames. They despawn in the same order, sinking from the caster end.

## Step 3: Grow

**Narration.** "Step 3, grow. Make each spike bigger the closer it gets to the enemy." (webvtt 12.02-15.62 s; auto-captions accurate)

**On screen.** Label: "(3) GROW!" Caption: "MAKE EACH SPIKE BIGGER..." / "THE CLOSER IT GETS TO THE ENEMY!"

**What you see.**

The charge plays first:
- f388: ring appears.
- f391-393: ring contracts, then the orb.
- f394 (13.13 s): cast.

The spike wave starts at f396. The spikes nearest the hero are tiny, about 16-25 px, and each later spike is taller, so the ridge forms a rising ramp. The spikes now show white internal crack lines and veins. Just before the hit (f407-409) the tall front spikes overlap the enemy's lower half and light it bluish.

At the target:
- f409: the ramp reaches the enemy.
- f410: the enemy squashes for 1 frame (top 333 to 348).
- f411-414: two or three large spikes shoot up behind and beside the enemy, rising above its head.
- f414: their tips peak at y about 283.
- f415-428: they sink back to y about 319-320, an overshoot and settle.

The enemy's lower half is hidden behind the tall front spikes and only its domed top shows above the ice, so it reads as impaled or encased.

**Measurements.**

- **height gradient caster to target**: about 16-25 px at the hero end, about 45-68 px midway, about 90-100 px (settled) and about 138 px (peak) at the target: about 5x growth; the settled tallest is about 1.1x enemy height (1.7 enemy widths) and the peak about 1.5x (frames 413-430; confidence medium)
  - Method: contiguous ice height above the hero-to-enemy axis in 10% bins (f420: 16, 28, 45, 52, 61, 68, 55, 66, 91 px) plus tip tracking
- **target spike pop and overshoot**: tip y 352 (f411), 324, 291, 283 (f414, peak), 293, 303, ... 320 (f428): rise 3 frames (100 ms), settle about 13 frames (433 ms); peak/settled height 138/101 = 1.37 (frames 411-430; confidence high)
  - Method: top-most changed pure-white pixel at x>=385; enemy base y 421
- **impact timing**: cast f394 to enemy squash f410 = 16 frames (533 ms); top drops 15 px for 1 frame (frames 394,410-412; confidence high)
  - Method: hero top-edge snap and enemy top-edge tracking
- **ice area when fully grown**: about 15.7k px on screen (about 2x step 2) (frames 420,430; confidence medium)
  - Method: changed-ice mask in a band around the path at impact+20

**Colours.** #4A71A1 spike body; #AAEEFF faces; #E4FFFF edges and internal veins; #253A57 darkest refracted areas

**Rule.** Scale every spawned piece of a travelling effect up with distance from the caster, about 5x from first to last, so it builds to a crescendo at the target. Pop the last ones up with about 35-40% height overshoot in 3 frames and settle over about 13 frames.

## Step 4: Fan out

**Narration.** "Step 4, fan out. Add smaller spikes on the sides, tilted outward." (webvtt 15.62-19.74 s; auto-captions accurate; the caption line break falls inside the sentence)

**On screen.** Label: "(4) FAN OUT!" Caption: "ADD SMALLER SPIKES ON THE SIDES..." / "TILTED OUTWARD!"

**What you see.**

The charge plays first: the ring is visible at f494 and contracts until f499, then the cast at f500 (16.67 s).

From f502 the spike wave grows as a widening wedge rather than a line. At the hero end it is one spike wide. Toward the enemy, extra rows of smaller spikes appear on both flanks, leaning outward away from the centre line. The outermost spikes at the target end lean the most, and one long right-flank spike points almost sideways. The leading edge of the wedge is white-hot.

At the target:
- f513-514: the front reaches the enemy.
- f517: the enemy squashes.
- f518-520: a crown of tall spikes rises around the enemy, with the flank spikes splaying out like a crown.
- After f520 it settles to its final height by about f534.

**Measurements.**

- **wedge width**: at the hero end the band's near-side extent is unchanged (about 45 px); at the target end the near-side flank reaches about 50-65 px further out than in step 3 (perpendicular max 71-74 px vs 22-41 px) (frames 420,530,540; confidence medium)
  - Method: perpendicular extent of the ice mask in 40 px bins along the hero-to-enemy axis, steps 3 and 4 compared (analyst's measure, not re-run)
- **flank spike tilt**: outer flank spikes lean about 45-60 degrees from vertical, away from the centre line; the tallest right-flank spike is nearly horizontal (frames 518-536; confidence low)
  - Method: visual read at 0.7-1.8x zoom
- **ice area**: about 25.7k px (1.6x step 3) (frames 537; confidence medium)
  - Method: changed-ice mask in a band around the path at impact+20
- **timing**: cast f500 to squash f517 (17 frames, 567 ms); crown tips 336 (f518), 306, 284 (f520, peak), 288, 299 ... settles to y about 320 by f534 (14 frames), the same crown height and timing as step 3 (frames 500,512-540; confidence high)
  - Method: hero top-edge snap, enemy top-edge drop (333 to 344), top-most white pixel at x>=385

**Colours.** #4A71A1 spike body; #AAEEFF faces; #E4FFFF edges; #FFFFFF leading-edge spikes

**Rule.** Add rows of smaller secondary pieces along the sides of a travelling ground effect, tilted outward and growing toward the target, so the path opens into a wedge and the impact fans out instead of ending in a point.

## Step 5: Crack the floor

**Narration.** "Step 5, crack the floor. Crack the ground around the enemy and kick up little chunks." (auto-captions accurate; webvtt splits it as "tilted outward. Step 5," / "crack the floor.", 18.30-22.88 s)

**On screen.** Label: "(5) CRACK THE FLOOR!" Caption: "CRACK THE GROUND AROUND THE ENEMY..." / "AND KICK UP LITTLE CHUNKS!"

**What you see.**

The step 4 sequence plays again: cast f604 (20.13 s), the wave reaches the enemy at f618-620, squash at f621, and the crown peaks at f624.

The new layer:
- f623: a few precursor specks appear.
- f624, 3 frames after the squash: a cracked-ground decal is present in full. It is an elliptical patch centred on the enemy's feet, about 236-266 x 103-110 px on screen.
- The patch is dark navy-blue broken floor slabs with bright glowing blue crack lines. The cracks are jagged and branch in Y and arrow shapes.
- Small dark chunks with glowing blue rims lie scattered over it, mostly visible on the right and front of the crown.
- The chunks move over about f622-627, then sit still.

Aftermath:
- From about f650: the spikes retract from the hero end, with the crown last (about f664-668).
- The crack decal stays after the ice is gone. It dims and thins over f668-687 and has faded by f688 (22.93 s).

**Measurements.**

- **crack decal size**: about 236-266 x 103-110 px ellipse centred on the enemy's feet (x about 288-554 or 308-544, y about 376-486), about 4-4.4 enemy widths across; size depends on the mask threshold (frames 668-676; confidence high)
  - Method: blue-dominant pixels brighter than a pre-cast reference, measured after the spikes left
- **crack appearance timing**: present on f624, 3 frames (100 ms) after the impact squash f621, essentially complete in 1 frame (precursor specks on f623) (frames 620-630; confidence high)
  - Method: frame reads at 1.3x zoom plus frame differencing in floor regions beside the crown
- **chunks**: small (about 3-8 px) dark slab pieces with blue rims; visible motion f622-627 (1475-1949 px changing >25 grey levels at f622-624, 391 at f625, 143-153 at f626-627), static from f628; whether they fly up cannot be seen at 30 fps (frames 619-639; confidence low)
  - Method: frame differencing in a floor box right of the crown (x480-570, y400-500)
- **decal lifetime**: f624 to faded at about f687: about 63 frames (2.1 s); outlives the spikes (gone at about f668-671) by about 0.6 s; pixel count 12.4k (f670), 7.1k (f676), 3.1k (f684), 1.9k (f686), 0 (f688), so the fade takes about 18 frames (frames 624-698; confidence high)
  - Method: pixel count of the decal mask over time

**Colours.** #183266 to #264587 cracked-decal base (dark blue); #3863BC to #76BFFE glowing crack lines; #BCF7FF brightest crack and ice at birth; #0F172C untouched floor for contrast

**Rule.** On impact, stamp a cracked-ground decal about 4 target-widths across, with glowing crack lines and a few debris chunks that move for about 5 frames, around the target's feet about 3 frames after the hit. Let it outlive the main effect by about half a second, then fade it over about 0.6 s.

## Step 6: Big finish

**Narration.** "Step 6, big finish: a huge cluster around the enemy. Flash and shake the camera." (the auto-captions split it as "Step 6, big" / "finish a huge cluster around the enemy."; corrected; webvtt 23.00-27.26 s)

**On screen.** Label: "(6) BIG FINISH!" Caption: "A HUGE CLUSTER AROUND THE ENEMY..." / "FLASH AND SHAKE THE CAMERA!"

**What you see.**

The cast is at f717 (23.90 s), and the wedge wave runs f719-732.

New already during the travel: a light camera rumble of 1-2 px from f719 to f732, which steps 1-5 never have. From about f726 the enemy is tinted pale lavender-blue by the approaching ice glow (#A4A0FD on its dome at f732).

The finisher:
- f733 (24.433 s): the enemy turns almost white and is squashed into a flat dome in the same frame. The bloom starts.
- f734: a large soft blue-white radial bloom spreads around the enemy, and the big camera shake starts.
- f735-737: a crown of about 8-10 huge spikes erupts through the white glow on all sides of the enemy, including behind it. They are taller and denser than in step 5.
- f736-738: the bloom peaks. The spike tips peak at y 259 (f737), reaching into the label row.
- f739-753: the spikes settle to y about 296-298, and the enemy fades over about 12 frames to an icy lavender-blue. It now looks frozen inside translucent ice.
- The crack decal from step 5 is also present.
- The camera shake ends: under 1 px after f741, 0 from f744.
- The cluster holds for about 1 s.
- f763-776: the spikes sink from the hero end. The receding front flares white-hot, as in step 7.
- f784-790: the crown sinks.
- About f790: the enemy is purple again.
- After this, the take runs into another charge (f804-825) that is cut away before release.

No hitstop: frame-to-frame change stays high through f733-741.

**Measurements.**

- **camera shake**: offsets (dx,dy) px from rest: f733 (-1,-1), f734 (+1,+2), f735 (0,-8), f736 (+2..3,-1), f737 (+3,+5), f738 (+5,-3), f739 (-3,+1), f740 (0,-2), f741 (0,-1), f742-743 (+1,0), f744 (0,0). That is about 9 frames (300 ms) starting 1 frame after the flash; peak 8 px vertical (about 0.13 enemy widths, about 0.8% of frame height); random direction, decaying; translation only, no zoom (left, bottom and right floor patches agree); the UI title and captions do not shake; identical in steps 7 (f869-878) and 8 (f973-982); absent in plain and steps 1-5 (frames 700-800; confidence high)
  - Method: gradient block matching (+-12 px) of floor patches against f700, plus a title patch
- **pre-impact travel rumble (new with this step)**: 1-2 px offsets from cast+2 to impact-1: f719 (0,-1), f720 (-1,+1), f725 (0,-2), f727 (+1,0), f728 (+2,+1), f729 (0,+1), f730 (+1,0), f731 (0,+1); about 0.02-0.03 enemy widths; identical in steps 7 and 8; the hero centroid jitters 1-2 px (vs 0.3 px in step 5) (frames 719-732, 854-866, 958-970; confidence high)
  - Method: same block matching; hero orange-mask centroid per frame, steps 5, 6 and 7 compared
- **enemy white flash**: dome patch #A4A0FD (f732), #CEE2F1 (f733), #EEFDFA, #FBFBFE, #F2FAF9 (f736): near-white for about 4 frames (f733-736), still partly white #D7F0FA-#E5F6F9 at f737-738 (a lower patch behind the ice stays at or above #E7F5FD to f741); fades over about 12 frames to #A4B2FD by f750; frozen tint #B6CEFC-#C0D8FD while encased to about f769, fading f772-787; back to purple #8480E0 by f790 (frames 726-799; confidence high)
  - Method: mean colour of patches on the enemy capsule
- **bloom / screen flash**: local only: median excess luma above the enemy vs f715 at r = 100/130/160/200/240 px is +27/+22/+15/+5/+1 at f733, +58/+43/+27/+7/+1 at f734, and +87/+59/+32/+12/+1 at the f736-738 peak; frame corners stay at 16.1/13.4 luma throughout, so there is no full-screen white flash; ramp 4 frames, decay about 10 frames to a residual glow while the cluster stands (frames 728-755; confidence high)
  - Method: corner luma and a radial profile around the enemy (420,380), upper half
- **cluster height and overshoot**: tips y 351 (f733), 346, 309, 278, 259 (f737, peak), 262, 285 (f739), 292, 296 (f747), 298 (f753): peak about 162 px vs settled about 124 px tall (x1.31); settled about 1.4x enemy height (2.1 enemy widths), about 23% taller than the step 5 crown (101 px) (frames 728-760; confidence medium)
  - Method: top-most changed pure-white pixel at x>=385 (title excluded); enemy base y 421; shake adds +-8 px noise f734-739
- **cluster size**: ice area about 29-36k px (mask dependent; about 1.3x step 5); about 8-10 big spikes in a ring (frames 640,748,753; confidence medium)
  - Method: changed-ice mask pixel count plus zoom read
- **timing**: cast f717 to flash f733 = 16 frames (533 ms); the cluster stands about 30 frames before the retract starts (f763 = flash+30); path gone at about f776, crown at about f790 (1.9 s after the flash) (frames 717-795; confidence high)
  - Method: frame reads plus in-band ice pixel count per frame
- **hitstop**: none: consecutive-frame difference in the demo region (y 300-720) is 6.5-11.6 grey levels over f733-739 and never about 0 (frames 729-746; confidence high)
  - Method: mean absolute frame difference of the demo region

**Colours.** #FBFBFE enemy at peak white; #6388B9 bloom above the enemy at peak (from #1E2C44); #A4B2FD to #B6CEFC enemy frozen tint while encased (purple capsule lit by blue ice); #AAEEFF / #E4FFFF cluster faces and edges

**Rule.** Reserve the climax for the end of the attack. Run a faint 1-2 px camera rumble while the attack travels. On the impact frame, turn the target white for about 4 frames and squash it, then fade it over about 12 frames to an element-coloured tint. Burst a crown of the largest pieces around it, popping to about 1.3x final height in 3-4 frames and settling over about 10-15. Add a local radial bloom about 3 target-widths in radius. Shake the camera for about 9 frames: the first big kick is about 0.13 target-widths vertical, then it decays in random directions.

## Step 7: Shatter

**Narration.** "Step 7, shatter. Melt the spikes from the top and break them into shards." (webvtt 27.26-30.80 s; auto-captions accurate)

**On screen.** Label: "(7) SHATTER!" Caption: "MELT THE SPIKES FROM THE TOP..." / "AND BREAK THEM INTO SHARDS!"

**What you see.**

This is the same take as step 6: cast f852, flash and shake f868 (28.93 s), cluster settled by about f880.

The aftermath now leaves debris:
- f898-899 (30 frames after the flash, the same moment step 6's sink began): the spikes at the hero end start to go. The spikes at the receding front shrink from their tips down and glow overexposed white as they go. That white front was already in step 6's sink, at the same frames.
- Where they stood, they break into dozens of tiny glowing shards that lie scattered over the floor around the path. This is the visible new layer.
- The front travels from the hero toward the target and reaches the crown at about f912-913.
- f915-919: the crown's tips fray and dissolve with white edges, and the crown shortens from the top. The enemy emerges and returns to purple at about f919-921.
- f920-921: only a low white-glowing mound remains at its feet.
- f922-925: the mound breaks into shards.
- The shards lie on the floor among the crack decal. Over f926-931 they and the decal fade together as the video dissolves to the step 8 take, so their natural lifetime is not shown here; in step 8 they last until the outro.

**Measurements.**

- **melt start and travel**: starts 30-31 frames (about 1.0 s) after the flash, at the hero end (ice count drops from f898); the front reaches the target crown at about f912-913 (about 14 frames, about 16-18 px/frame); the crown melts tips-first over f915-925; timing is identical to step 6's sink (f763-790, +135 frames) (frames 897-929; confidence medium)
  - Method: in-band ice pixel count per frame, plus frames read at 0.55-1.1x zoom, steps 6 and 7 side by side
- **white-hot receding front**: pure-white px rise from about 1200 (cluster holding) to 1529-2391 at f902-906 as the front recedes; step 6's sink shows the same flare (1613-2038 at f768-771) (frames 890-912, 755-776; confidence high)
  - Method: pure-white pixel count in the band around the path
- **shards**: about 25-35 visible at once in a 180x150 px window at the hero end and about 50-80 over the whole path; each about 3-4 px across (median area 8-13 px, about 0.05-0.07 enemy widths); they stay at least about 0.9 s (f900 to the f926-931 dissolve); the full lifetime is not shown (frames 900-931; confidence medium)
  - Method: connected components of bright blue-white pixels plus zoom read (analyst's count; component counts are polluted by floor-chunk edges)
- **identical lead-in**: cast, flash and shake frames are step 6 + 135 frames exactly (shake offsets identical); frames differ only at codec-noise level (mean 2.3-3.3 per channel) (frames 852-880; confidence high)
  - Method: frame-difference curve, block-matching comparison and direct pixel difference f745 vs f880

**Colours.** #7CADD8 shards (median); #B9EBFF shard highlights; #FFFFFF receding/melting front; #6E67C7 enemy restored when the ice melts

**Rule.** Never just delete a big effect. Remove each piece in the order it spawned, shrinking it from its tip with a white-hot edge, and leave small glowing shards on the ground that stay for at least about 1 s before fading.

## Step 8: Frost

**Narration.** "Step 8, frost: snow, mist and tiny sparkles in the air. Save this for later." (webvtt 30.82-35.11 s; auto-captions accurate)

**On screen.** Label: "(8) FROST!" Caption: "SNOW, MIST..." / "AND TINY SPARKLES IN THE AIR!"; outro "SAVE THIS FOR LATER!" with a bookmark icon

**What you see.**

This is the same take again: cast f956, flash and shake f972 (32.40 s), melt from f1002-1003, crown melting f1019-1025.

The new layer is a field of tiny pale blue-white specks floating in the air:
- They appear during the spike travel. First specks float above the newly erupted spikes at about f961-965, about 5-9 frames after the cast and before the impact; the step 7 frames at the same moments (f861, f865) have none.
- After the flash they thicken around and above the crown. They spread from about x 70-550 and from about 150 px above the crown down to the floor.
- Most are 1-3 px. Some twinkle on and off between frames, and none visibly fall; they drift by less than 1 px per frame.

A very faint mist slightly brightens the air above and around the ice.

The specks persist through the melt and shatter and fade with the outro dim (f1030-1038).

**Measurements.**

- **sparkle count and size**: in an air band above the path: about 15-25 specks at cast+8..+16 vs 5-12 in steps 6/7, and about 27-34 vs 11-17 from cast+28 to +56 (about 2x); over the whole effect about 90-110 extra specks below y=300 vs step 7 (analyst's count); each about 2x2 px (about 0.03 enemy widths) (frames 956-1012; confidence medium)
  - Method: bright local maxima (luma>110 and at least 30 above the 7x7 mean) in a band 70-150 px above the hero-to-enemy axis, steps 6/7/8 at equal cast offsets; visual comparison f861/f965, f865/f969, f872/f976
- **sparkle onset and life**: first specks during the travel at about cast+5 to +12 (f961-968), 4-8 frames before the impact, densifying after the flash (f973 on); they persist until the outro dims (f1030-1038), about 2 s (frames 956-1040; confidence medium)
  - Method: speck counts per cast offset plus frame reads at 1.4x zoom
- **mist**: low-frequency brightening of only about +2 to +6 grey levels (of 255) in 64x50 px cells over and around the ice vs step 7 (frames 984-1000; confidence low)
  - Method: Gaussian-blurred (sigma 12 px) step 8 minus step 7 difference at equal offsets

**Colours.** #C9E2FF frost sparkles; #FFFFFF brightest twinkles; #0B101D background they read against

**Rule.** Leave a lingering ambient layer in the effect's element: emit tiny 2 px twinkling specks from the path while the attack travels, thicken them around the impact, add a faint mist, and keep them for 1-2 s after the action ends so the place keeps reading as frozen.

## The kill or finisher

There is no kill in this video. The enemy survives every version, with no knockback, no health bar and no death. The finisher beat is step 6, 'big finish', which is replayed as the climax of steps 7 and 8. Measured on the step 6 take (cast f717, impact f733 = 24.433 s):

1. Travel (f719-732): a light 1-2 px camera rumble. The approaching ice tints the enemy lavender-blue from about f726.
2. Impact frame f733: the enemy is near-white and squashed into a flat dome in the same frame. The bloom starts.
3. f734: the radial blue-white bloom grows and the big shake starts.
4. f735-737: a crown of about 8-10 huge spikes erupts around the enemy in 3-4 frames and overshoots. Tips peak at about 162 px tall (about 1.8x enemy height) on f737.
5. f739-753: the crown settles to about 124 px (about 1.4x enemy height).
6. Bloom: peaks f736-738, local only, about 3 enemy widths in radius (+12 luma at 200 px, +1 at 240 px). Frame corners never brighten.
7. Enemy colour: near-white for about 4 frames (f733-736) and partly white to f738. It then fades over about 12 frames to an icy lavender-blue (#A4B2FD-#B6CEFC) that reads as frozen inside the ice.
8. Shake: about 9 frames (f734-742). It starts with (+1,+2), then the big -8 px vertical kick on f735, then +-3-5 px in random directions, decaying. Translation only, no zoom; the UI does not shake.
9. No hitstop.
10. The cluster stands about 1 s (30 frames). Then:
   - Step 6: it sinks from the hero end with a white-hot receding front (f763-776), then the crown sinks (f784-790).
   - Steps 7 and 8: the same receding front at the same timing, but each spike breaks into small glowing shards that stay on the floor (step 7 f898-925; shards visible until the dissolve at f926-931 or the outro).
11. The enemy un-freezes back to purple as the ice leaves (about f790 in step 6, about f919-921 in step 7).

The cast-to-impact time is the same 16 frames (533 ms) as every other version.

## Sound

The soundtrack is narration only. No sound effects or music are detectable. TikTok metadata: music 'original sound' by EgorV, original = true.

Decoded audio (mono, 22.05 kHz, RMS per video frame) shows the narrator's voice with hard-gated gaps of digital silence (-92 to -93 dBFS) between sentences, at 2.27-2.40, 4.33-4.53, 8.13-8.30, 11.87-12.00, 18.90-19.07, 22.67-22.90 and 34.00-34.23 s. That rules out a continuous music bed.

Every demo event that falls in a narration pause is silent or a decaying voice tail with no transient:
- step 1 cast, f172 (5.733 s): -85 dB;
- step 2 cast and spike eruption, f285-292: -49 decaying to -85 dB;
- step 3 cast, f394: -83 dB;
- step 4 cast, f500: -45 dB, the decaying tail of the word 'out' (-38, -45, -48, -51, -62, -78 over f499-504);
- step 6 white flash and spike burst, f731-735: -61 to -65 dB;
- step 7 cast, f852: -81 dB;
- step 8 cast, f956: -72 dB.

Steps 7 and 8 replay the step 6 take, so their impacts are also SFX-free. The other impacts (plain hit 1.60 s, step 2 arrival 10.03 s, steps 3-5 impacts) fall under narration. A very quiet SFX there cannot be fully excluded, but no transient stands out of the voice envelope, and the silent identical events elsewhere make one unlikely. There are no impact sounds to align.

## Principles

- Layer, don't retime: every step adds visuals while cast-to-impact stays 16-17 frames (about 550 ms). Feedback is added around the gameplay timing, never by changing it.
- Full arc of a spell, with a layer for each phase:
- anticipation: charge of about 0.8 s, with the ring only in the last 0.2 s;
- release: a burst of about 50 ms;
- travel: sequenced spikes, plus a faint rumble and frost specks in the full version;
- climax: cluster, flash, bloom, shake, cracks;
- aftermath of 1-2 s: receding front, shards, decal, frost.
- Lock the charge to the release frame: glow from 24-26 frames before, ring at exactly 6 frames before, orb on the last frame. The collapse reads as the trigger.
- Crescendo toward the target: size, density, brightness and width all increase with distance from the caster (about 5x spike height). The biggest and brightest beat is at the impact, not at the cast.
- Reserve the strongest tools for the single finishing beat: the white flash on the target, bloom, camera shake and even the faint travel rumble. Steps 1-5 use none of them; the camera does not move at all. The finish reads as a peak by contrast.
- White-hot birth and death: newly spawned pieces show as overexposed white for 1-2 frames, then cool to the element colour. The same white marks the receding front when pieces leave and the target at the hit. White means 'energy right now'.
- Pop with overshoot: crown pieces reach 131-137% of their final height in 3-4 frames, then settle over about 10-15 frames (a back or elastic ease). Small path spikes overshoot their area by about 20-30%.
- Sequence spawns and despawns in the same order (first in, first out) along the path, so the effect reads as one directed motion from caster to target, even on the way out.
- Never pop an effect out of existence: retract or melt it in order, leave debris (shards) and a ground decal that outlives it by about 0.5-1 s, then fade.
- Ambient residue sells the element: a lingering field of tiny twinkles and mist, starting during the travel and lasting 1-2 s after it, keeps the area reading as ice.
- One-element palette with value contrast: everything is cool blue, cyan and white (#1B75E4, #AAEEFF, #FFFFFF) on a very dark floor (#0F172C). Translucent ice bodies (#4A71A1) let the floor show through, while the edges glow.
- Light is shared: the approaching ice tints the enemy before the hit, about 7 frames ahead, and the encased enemy keeps an icy tint while frozen. The effect lights its surroundings, and the status reads on the body.
- Keep shake on the world camera only: the title and captions (UI) never shake, the shake is pure translation with no zoom, and there is no full-screen flash (frame corners unchanged). The flash is on the target plus a local bloom.
- No hitstop is used in this video. Impact weight comes from the flash, overshoot, shake and size jump instead (unlike other videos in the series).
- Echoes transfer, scale: on this nearly identical high three-quarter camera, express sizes per enemy-capsule width (60 px here):
- ring: about 2.2 widths across;
- path spikes: about 0.35-0.5 widths tall;
- finisher crown: about 2.1 widths tall settled, 2.7 at peak;
- crack decal: about 4 widths across;
- bloom: about 3 widths in radius;
- shake: peak about 0.13 widths for about 9 frames;
- travel rumble: about 0.02-0.03 widths;
- shards: about 0.05 widths;
- sparkles: about 0.03 widths.
- Echoes transfer, colour: the whole demo is a cool blue, cyan and white ice palette. Echoes reserves Ember, Bright Heal and Violet for threats, healing and corruption, so an Echoes ice rule should keep to this cool-blue range and its white-hot accents. The 'icy lavender' frozen tint seen here (#A4B2FD-#B6CEFC) is only the purple capsule lit by blue ice, and it sits close to Violet #B79CF0. On Echoes enemies, tint the frozen body toward ice cyan (about #AAEEFF), not lavender.

## Extra tips

- Title, on screen for the whole video: "HOW TO: / MAKE ICE SPIKES JUICY!". The narration says 'ice attack' while the on-screen title says 'ice spikes'.
- Hook over the plain icicle (0-2.3 s): "THIS ICE ATTACK WORKS... / BUT IT FEELS LIKE NOTHING". The second line is red (about #FB776E); the narration is identical.
- "LET'S MAKE IT JUICY... / IN 8 STEPS!". The second line is large gold. The narration says 'Here's how to make it juicy in 8 steps.'
- Step 1 caption: "GATHER MAGIC IN THE HAND... / AND LET IT BURST OUT ON THE CAST!". It shows about 0.8 s of inward sparks, a camera-facing ring imploding into the hand over the last 6 frames, and a 1-2 frame (about 50 ms) burst on release.
- Step 2 caption: "INSTEAD OF ONE ICICLE... / POP SPIKES OUT OF THE GROUND!". It shows a white-hot leading wave of small spikes along the path at about 15.6 px/frame.
- Step 3 caption: "MAKE EACH SPIKE BIGGER... / THE CLOSER IT GETS TO THE ENEMY!". The spikes ramp from about 16-25 px to about 100 px settled (138 px peak).
- Step 4 caption: "ADD SMALLER SPIKES ON THE SIDES... / TILTED OUTWARD!". The path becomes a wedge with a splayed crown.
- Step 5 caption: "CRACK THE GROUND AROUND THE ENEMY... / AND KICK UP LITTLE CHUNKS!". A glowing crack decal about 4 enemy widths across appears 3 frames after the hit and outlives the spikes by about 0.6 s.
- Step 6 caption: "A HUGE CLUSTER AROUND THE ENEMY... / FLASH AND SHAKE THE CAMERA!". It shows:
- the enemy white for about 4 frames;
- a local bloom;
- an 8 px camera kick and about 9 frames of shake;
- a faint 1-2 px rumble during the travel, not mentioned in the narration.
- Step 7 caption: "MELT THE SPIKES FROM THE TOP... / AND BREAK THEM INTO SHARDS!". The white-hot receding front is already in step 6; what step 7 adds is the field of small shards left on the floor for at least about 1 s.
- Step 8 caption: "SNOW, MIST... / AND TINY SPARKLES IN THE AIR!". About 100+ twinkling 2 px specks, emitted from the path during the travel and densest around the crown after the hit, plus a very faint mist. No falling snow is visible.
- Outro: "SAVE THIS FOR LATER!". The whole frame dims over f1030-1038 (mean luma 28 to 19.5) and a bookmark fills yellow by about 34.9 s.
- Not stated but shown: all eight upgrades keep the 16-17 frame (about 550 ms) cast-to-impact time of the plain version. Juice is layering, not slowing the attack.
- Not stated but shown: these are already in the plain version, and the video builds on top of them:
- the hero's 0.8-0.9 s anticipation squash;
- the 15-17 degree cast recoil;
- the enemy's 1-frame squash plus stretch two frames later.

## Uncertain

- Chunks in step 5: they appear on f624 and change for only about 5 frames (f622-627). Any upward 'kick' is too short to read at 30 fps, so they may be decal-attached debris rather than flying chunks.
- Snow vs sparkles in step 8 could not be separated. All visible frost particles are 1-3 px specks, some twinkling, and none clearly fall. The mist is extremely faint (+2-6 grey levels) and is low confidence. Speck counts depend heavily on the detector, because grid-line crossings and caption text create false peaks; only the step 8 vs step 6/7 comparison at equal offsets is reliable.
- Spike counts are approximate: about 20 in the step 2 row, about 8-10 in the step 6 crown, and about 50-80 shards. They come from zoomed reads and connected components on 4:2:0 video, where touching pieces merge and floor-chunk edges add false components.
- The natural lifetime of the step 7 shards is not shown. They fade together with the crack decal during the dissolve to the step 8 take (f926-931), and in step 8 they are still present when the outro dims.
- Enemy squash amounts in steps 3-6 are partly hidden by ice in front of the enemy. The top-edge drop (11-15 px for 1 frame) is reliable, but width changes are not. In the plain version the bottom edge also moves 6 px down the screen during the squash, probably because the widened base ellipse reaches lower on screen.
- Inward motion of the step 1 charge particles is inferred from their radial streak shape. Individual particles could not be tracked frame to frame, and their median distance to the hand does not shrink consistently.
- Flank spike tilt angles in step 4 (about 45-60 degrees) are visual estimates only. The step 4 wedge-width numbers come from the original analyst and were not re-run.
- Spike heights are screen-space px on a perspective camera, measured from an assumed baseline (hero front foot to enemy base). Absolute heights may be off by about 10 px; the ratios (about 5x growth, about 1.31-1.37x overshoot) are more reliable. The step 6 tip track also carries up to 8 px of camera-shake noise.
- The source game probably ran at 60 fps and was captured at 30. Every timing is +-1 frame (+-33 ms). 1-frame events such as the enemy squash and the release burst may really be 1-3 game frames; the 16/17-frame cast-to-impact alternation and the 1-vs-2-frame burst both follow that sampling phase.
- Audio SFX can only be ruled out at events that fall in narration pauses (step 1-4 and 7-8 casts, step 2 eruption, step 6 flash). The other impacts sit under the voice.
- The hero recoil angle (15-17 degrees) comes from a principal-axis fit on a short capsule. It is medium confidence, and frames where the glow covers the hero (f168-171 and the matching frames in later steps) are unreliable and were ignored.
- The step 6 travel rumble is only 1-2 px, close to the block-matching resolution. It is trusted because it repeats identically in steps 6, 7 and 8, shows in two separate floor patches and in the hero centroid, and is absent in every earlier step.

## Verify verdicts

- **confirmed**: Cast and impact frames: plain f31/f48, step 1 f172/f189, step 2 f285/f301, step 3 f394/f410, step 4 f500/f517, step 5 f604/f621, steps 6-8 f717/f733, f852/f868, f956/f972. Cast-to-impact stays 16-17 frames.
  - Hero bbox top snaps from a squashed 508-520 px to 496 px on exactly those cast frames (hero.npy). The enemy bbox top drops from 332-333 to 344-348 for one frame on each impact frame. The 17/16 alternation (17 in plain and steps 1, 4, 5; 16 in steps 2, 3, 6, 7, 8) fits a true value of about 16.5 frames (about 550 ms) sampled at 30 fps.
- **confirmed**: Step label change times are 4.4, 8.2, 11.83, 15.37, 18.87, 22.6, 27.1 and 30.6 s.
  - The bright-pixel count in the label row (y 250-310) starts each transition at f134 (4.47 s), f246, f355, f461, f566, f678, f813 and f918. The label is gone at f1027-1028.
- **confirmed**: Step 1: a ring 135 px across appears at f166 and contracts 135, 115, 105, 91, ~57 over 4 frames into an orb at f170-171. The glow starts at f146 and the cast is f172.
  - Saturated-blue mask, 1st-99th percentile extents: 131, 112, 101, 86 and 75 px (glow included) over f166-170, then 68 px of orb glow at f171. Ring centre is about (196,513). Every step has the same timing: glow from cast-24 to cast-26, ring at exactly cast-6, contracting to cast-1.
- **added**: (added) The charge ring is a camera-facing billboard, not a floor ring.
  - At f166 the ring measures 131x131 px on screen, a true circle. A ring lying on this tilted floor would be a flattened ellipse, like the crack decal at 236x103.
- **corrected**: The release burst lasts 2 frames (f172-173) and is gone on f174.
  - Blue pixels at cast, cast+1, cast+2: step 1 2289/1591/15, step 4 3029/1543/39, step 5 3038/1593/15. In steps 2, 3, 6, 7 and 8 the cast+1 frame keeps only 282/184/202/228/183 px, so the burst is effectively 1 frame there. It splits along the same 17/16 phase as cast-to-hit, so the true burst is about 1.5 video frames (about 50 ms, about 3 frames at 60 fps).
- **corrected**: About 11-14 gathering spark streaks are visible at once, median 37-52 px from the hand.
  - Connected components (luma>90, B>R+10, changed from f138, size<=40 px, r>25 px) number 15-20 per frame over f149-165, with a median distance of 36-59 px and a maximum of about 61-80 px. The count depends on the detector. 'About 15-20' fits better.
- **corrected**: Plain enemy squash on f48: top 332 to 344 (-12 px, -13% height), width 59 to 67 (+14%).
  - Purple-mask bbox: f47 x390-449, y334-421; f48 x386-453, y344-427. The top drops 12 px but the bottom edge also moves 6 px down the screen, so the bbox height goes 89 to 83 px (-7%). Width goes 60 to 68 px (+13%). The 12 px is 13% of the height only as a top-edge drop. The rebound reads f49 332, f50 328 (stretch, 57 px wide), f51 332, f52 336.
- **corrected**: Plain hero anticipation: top 490 to 506, height 107 to 97 (-9%), width 69 to 82 (+19%), over about 1 s.
  - Orange-mask bbox: rest (f0) x124-193, y492-596 (70x105). Deepest squash f28-30: x118-198, y508-601 (81x94), which is -10% height and +16% width. The squash starts at about f4 and bottoms out at about f28, roughly 0.8-0.9 s.
- **corrected**: The hero leans 13-15 degrees back on the cast frame and the lean decays over about 7 frames.
  - Principal-axis angle of the orange mask: about -5 degrees at rest, -22 at f31 and -18 to -22 on the later cast frames. That is 15-17 degrees of lean, back to -6.3 by f38 (7 frames). Medium confidence.
- **confirmed**: The plain icicle is about 35x81 px and #96C4EB, and slides at about 14 px/frame.
  - Light-blue mask bbox is 33-34 x 76-80 px over f39-46, with median colour #9ACFF0. Its centroid moves 160 to 254 px along the hero-to-enemy axis in 7 frames, 13.4-13.9 px/frame (about 405-415 px/s). It sinks at the enemy's feet over f47-49.
- **confirmed**: Step 2: the spike-wave front moves about 15 px/frame and reaches the enemy's feet at f301, 16 frames after the cast.
  - The white leading edge projected on the hero-foot (190,575) to enemy-foot (420,421) axis reads 50 (f287), 66, 85, 99, 116, 136, 150, 163, 179, 197, 213, 226, 239, 254, 268 (f301). That is 15.6 px/frame. A first tiny white shard is already visible at f286.
- **confirmed**: Each spike group is white-hot for 1-2 frames after it appears, and its white drops 70-90% by +4 frames.
  - Pure-white pixels (all channels >225) in fixed 50x50 boxes at 30/50/70% of the path peak at 313 (f290), 183 (f293) and 110 (f298). By 3 frames later they are down 60%, 73% and 90%. A residue of white tips stays (about 90-100 px in the first box).
- **confirmed**: The step 2 pop-up overshoots: the cyan area grows over 4 frames, then shrinks about 20-25% over about 10 frames.
  - The same boxes reach peak cyan area 4-5 frames after appearing: 1541 (f292), 1562 (f296), 1176 (f299). They settle to 1251, 1180 and 887 over 12-15 frames, an overshoot of 1.23-1.33x in area.
- **confirmed**: Step 2 spikes live 44-49 frames and despawn first in, first out over f331-350.
  - The rear edge on the axis moves from 19 (f331) to 55, 84, 105, 156, 167, 201, 234, 243, 265 (f349), and the ice is gone at f351. A spike born at f287 dies at about f332, and one born at f301 dies at about f349.
- **confirmed**: Step 3 target-spike tips go 346, 322, 290, 281 (peak f414), then settle to 319 by f427, a peak/settled ratio of about 1.37.
  - Top-most changed white pixel at x>=385: f411 352, f412 324, f413 291, f414 283, f415 293, f416 303 ... f428 320. Against the enemy base at y 421 that is 138/101 = 1.37.
- **confirmed**: Step 3 spike height ramps about 5x from about 20 px at the hero end to about 100 px at the target.
  - Contiguous ice height above the axis at f420, in 10% steps: 16, 28, 45, 52, 61, 68, 55, 66, 91 px.
- **confirmed**: Step 4/5 crown peaks at f520/f624 with tips at y about 283 and settles to about 320 by about f536.
  - Step 4 tips: 336 (f518), 306, 284 (f520), 288 ... 320 by f534. Step 5 tips: 335 (f622), 307, 284 (f624) ... 320 by f638. The crown is identical in steps 3, 4 and 5 (283-284 at peak, 320 settled).
- **corrected**: Step 6 cluster tips go 349 (f733), 306, 274, 258 (f737 peak), 282, then settle at about 294-296.
  - Measured per frame: f733 351, f734 346, f735 309, f736 278, f737 259, f738 262, f739 285, f742 292, f747 296, f753 298. The analysis's sequence skipped a frame. The rise is 3-4 frames (f734-737), and peak/settled is 162/124 = 1.31.
- **confirmed**: Step 6 camera shake offsets: f734 (0,+2), f735 (-1,-8), f736 (+2,-1), f737 (+3,+4), f738 (+4,-3), f739 (-3,0), f740 (0,-2), f741 (0,-1), f742 (0,0). The title does not shake, and steps 7 and 8 are identical.
  - Gradient block matching (+-12 px) against f700 on two floor patches: f734 (1,2), f735 (0,-8), f736 (2..3,-1), f737 (3,5), f738 (5,-3), f739 (-3,1), f740 (0..-1,-2..-1), f741 (0,-1), f742-743 (1,0), (0,0) from f744. The title patch stays (0,0). Steps 7 (f869-878) and 8 (f973-982) repeat it. Floor patches on the left, bottom and right all give the same translation, so there is no zoom or punch-in. Plain and steps 1-5 show zero offset.
- **added**: (added) Steps 6-8 also have a low camera rumble during the spike travel, before the impact.
  - Offsets against f700 of 1-2 px appear only from cast+2 to impact-1: f719 (0,-1), f720 (-1,1), f725 (0,-2), f727 (1,0), f728 (2,1), f729 (0,1), f730 (1,0), f731 (0,1). The same pattern repeats at f854-866 and f958-970. The hero centroid jitters 1-2 px in steps 6 and 7 over cast+8 to +17, but only 0.3 px in step 5. There is none in the plain version or steps 1-5.
- **confirmed**: The enemy is near-white for 4 frames (f733-736), fades over about 10 frames (f737-747) to icy #A9BEFA, holds while encased until about f780, and is purple again by about f790.
  - Upper-dome patch (x410-430, y346-358): f732 #A4A0FD, f733 #CEE2F1, f734 #EEFDFA, f735 #FBFBFE, f736 #F2FAF9, f737 #D7F0FA, f738 #E5F6F9, f739 #D3EBFD, f744 #B6CAFA, f750 #A4B2FD, steady to f755. A lower patch behind the ice stays at or above #E7F5FD until f741. Back to purple: f787 #8988E9, f790 #8480E0 (the rest value). The tint begins about f726, 7 frames before the hit.
- **confirmed**: The bloom is local, peaks f737-738, is about +20 luma at r about 160 px and faint to about 200 px, and the frame corners stay at 16.0.
  - Corner lumas stay 16.1/16.0/13.4/13.5 through f728-755. Median luma above the enemy minus f715 at r = 100/130/160/200/240 px: +27/+22/+15/+5/+1 at f733, +58/+43/+27/+7/+1 at f734, and +87-89/+55-59/+29-32/+12/+1 at f736-738.
- **confirmed**: No hitstop in any version.
  - Mean absolute frame difference over the demo region (y 300-720) never approaches zero at an impact: f47-49 0.9-1.2, f188-190 1.0-1.3, f300-302 0.8-1.6, f409-412 1.7-2.6, f516-519 2.1-3.1, f620-623 2.3-3.2, f733-739 6.5-11.6. Steps 7 and 8 repeat step 6.
- **confirmed**: The step 5 crack decal pops in at f624, 3 frames after the f621 squash. It is about 236x103 px around the enemy's feet and fades out by about f686.
  - Precursor specks appear on f623, and crack lines and chunks are present on f624. A looser mask gives the decal at f670 as x288-554, y376-486 (266x110), centred at x 421, so the size is about 236-266 x 103-110 px (about 4-4.4 enemy widths). Its pixel count falls 12.4k (f670), 7.1k (f676), 3.1k (f684), 1.9k (f686) to 0 at f688.
- **corrected**: The step 5 chunks move only during f622-625, then are static.
  - In a floor box right of the crown (x480-570, y400-500), pixels changing by more than 25 grey levels number 1475-1949 at f622-624, 391 at f625 and 143-153 at f626-627. They are 0-4 from f628. Small motion lasts through f627, about 5-6 frames (170-200 ms).
- **corrected**: Step 6 aftermath: spikes sink from the hero end over f762-778, the crown sinks over f778-790, and the white-hot melting front is new in step 7.
  - In step 6 the in-band ice count starts falling at f763 (flash+30). The path is gone by about f776 and the crown sinks over f784-790. The receding front already flares white in step 6: white pixels rise from about 1200 to 1613-2038 at f768-771. Step 7's melt has the same timing (f898 = flash+30; white 1529-2391 at f902-906), and side-by-side frames f762-776 and f897-911 match in shape. The visible addition in step 7 is the field of shards left behind.
- **confirmed**: The step 7 melt starts at f899, 31 frames after the flash.
  - The ice count starts dropping at f898 (29543 to 28537) and the rear edge moves at f899, so 30-31 frames after f868.
- **unsupported**: Shards live about 25-30 frames and are gone by about f930.
  - In step 7 the shards and the crack decal fade together over f926-931, during the step 8 label change (f918-929). The step 8 take's charge glow starts at f932, so the end of the shards looks like the cut, not their natural life. In step 8 the shards are still dense at f1024-1028 when the outro dims. Their lifetime is at least 0.9 s; the full value is not shown.
- **corrected**: Frost sparkles become noticeable from about f982, 10 frames after the flash.
  - The specks start during the spike travel. In f965 and f969 (cast+9, cast+13) small white specks float above the travelling spikes, and the matching step 7 frames f861 and f865 have none. Bright local maxima (luma>110, at least 30 above the 7x7 mean) in an air band above the path, step 8 vs steps 6/7: cast+8 15 vs 8-10, cast+12 21 vs 7-12, cast+16 25 vs 5-11, cast+28 to +56 27-34 vs 11-17. They are emitted along the path from about f964-968 (4-8 frames before the impact) and then densify around the crown after the flash.
- **confirmed**: Steps 6, 7 and 8 replay the identical take.
  - Timing, shake and spike geometry match exactly at offsets of 135 and 104 frames. Pixel differences between f745 and f880 are at codec-noise level (mean 2.3-3.3 per channel), apart from a few differing sparkles.
- **added**: (added) The step boundaries are cuts or dissolves between separate takes. Step 6's take continues into a second charge that is cut before release.
  - After step 6's cluster is gone, the hero charges again: glow from f804, hero squash, and a ring at f822-824. On the step 7 label change the glow collapses at f826 and the step 7 take's own charge starts at f826-828 (cast f852 = +26). The plain-to-step-1 dissolve over f142-149 is the same kind of edit.
- **corrected**: Audio: narration only, no SFX or music. Step 4 cast f500 is at about -80 dB.
  - Narration-only is confirmed. The gaps sit at -92 to -93 dB (2.27-2.40, 4.33-4.53, 8.13-8.30, 11.87-12.00, 18.90-19.07, 22.67-22.90, 34.00-34.23 s), so there is no music bed. Casts at f172 (-85), f394 (-83), f852 (-81) and f956 (-72) and the step 6 flash at f731-735 (-61 to -65) are silent, and the impacts of the identical step 7 and 8 takes are therefore SFX-free too. One number was wrong: at the step 4 cast f500 the level is -45 dB, the decaying tail of the word 'out' (-38, -45, -48, -51, -62, -78 over f499-504), with no transient. Metadata: music 'original sound', author EgorV, original=true.
- **confirmed**: Outro: the scene dims from luma 28 to 19.5 over f1029-1040, and the bookmark fills yellow at f1047.
  - Corner luma drops 16.1 to 11.9 and left-floor luma 24.9 to 18.8 over f1030-1038. Mean luma reads 28.1 at f1029 and 19.5 at f1038. The bookmark outline shows at f1040-1044 and is filled by f1048.
- **confirmed**: Narration and on-screen captions, labels and title as quoted.
  - They match TRANSCRIPTS.md section 9 and v9.eng-US.webvtt word for word, including the split cues ('tilted outward. Step 5,' / 'crack the floor.' and 'Step 6, big' / 'finish a huge cluster...'). Labels and captions were read on the 1 fps sheets.
- **corrected**: Caption colours: pale blue #8BBEE5, red #E96B5D, gold about #E3D580.
  - The brightest 3% of caption pixels give pale blue #9BCAF4 (f55), red #FB776E (f55) and gold #E3D173 to #FAEEAF (f125, f230). These differ only by anti-aliasing and sampling.
- **confirmed**: Screen-area numbers: ice about 6k (step 2), 15.6k (step 3), 25.5k (step 4), 36.4k (step 6).
  - An axis-band mask at impact+20 gives 8.1k, 15.7k, 25.7k, 27.0k (step 5, decal included) and 29.4k (step 6, crown tips partly outside the band). Steps 3 and 4 match. The others depend on the mask.
- **confirmed**: Hero and enemy colours and sizes: hero #EA7C36 at 71x107 px centred (159,547); enemy #6F68C8 at 60x89 px centred (421,379); 311 px apart.
  - At f100 the hero median is #EE7F36, bbox 72x103 px centred (157.5,545). The enemy median is #6E67C7, bbox 60x89 px centred (419.5,377). The centres are 311 px apart.
- **added**: (added) Echoes colour note: the encased enemy's 'icy lavender' is the purple capsule lit by blue ice, not a colour to copy.
  - The frozen tint measures #A4B2FD to #B6CEFC, which sits close to Echoes' corruption Violet #B79CF0. On Echoes enemies the frozen tint should lean toward the ice cyan instead.
