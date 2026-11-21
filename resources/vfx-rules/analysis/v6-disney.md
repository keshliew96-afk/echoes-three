# Video 6: disney (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

The video is 576x1024 portrait, 30 fps, 47.3 s (1420 frames). A hand-lettered cyan header "VFX = CARTOON RULES!" (#88C0E9 to #8FBFDF, wavy underline) sits at y~200-240 for the whole video.

The game camera is fixed: a high three-quarter view looking from front-left onto a dark navy void (#0B101B at the edges, ~#151A2E behind the floor) with a faint isometric grid floor (lines ~#23293C). The orange capsule hero (#E77D2F) stands bottom-left and the purple capsule enemy (#6D66CE to #816CCE) stands upper-right. They are ~300 px apart horizontally in single view and ~245 px in split. The enemy has no health bar, only floating damage numbers.

The only camera moves are:
- the split-to-single edit transition at n=133-142;
- a 3-4 px game-camera shake on the outro hits.

Structure by frame n:
(a) 0.00-4.40 s (n=0-132), split screen. A wavy line at y~507 divides it. The top half is labelled "RULES OFF" (coral ~#EF6B5F) and the bottom half "RULES ON!" (yellow ~#EFE18D). Both fire the same fireball, three shots each. The plain top loops every 39-40 frames (flash peaks n=25/65/104). The juicy bottom loops every 42-43 frames (holds at n=37/80/122). In this layout the enemy body is ~39x57 px (37-40 depending on threshold) and the hero ~40x58 px.
(b) n=133-142: animated transition. The bottom half fades out while the top (rules-off) panel slides down and scales up ~1.2x. Then 4.7-11.3 s, single view: enemy body 44-48x70 px, hero 48-52x71 px. Only the plain version plays, on a 40-frame loop with contacts at n=156/196/236/276; a 5th shot is frozen by an edit pause at n=298-332. The caption "MORE PARTICLES? MORE GLOW?" types in, is struck through in red at 6.97-7.4 s, and "DISNEY'S 1930s RULES!" types in at 9.1-9.5 s under a hand-drawn bouncing-ball sketch.
(c) Five numbered steps of ~6 s each, all following the same recipe:
- the scene dims to ~15-20% and a hand-drawn yellow ball sketch demonstrates the principle (dark spans n=343-391, 512-560, 698-757, 953-1002, 1133-1186);
- the live demo plays with freeze-and-dim edit pauses (scene at ~55-65%) while hand-drawn annotations draw on (cyan outlines, yellow labels, arrows);
- then a real-time repeat.
A row of 5 circled step dots under the captions (y~705) marks the current step.
(d) Outro, ~43.6-47.3 s (the step 5 header fades at n=1300-1306): the full rules-on loop with no teaching overlays. It runs on a 31-32-frame cycle with contacts at n=1325/1357/1388, under "NINETY YEARS OLD... STILL WORKS!" and then "SEND THIS TO YOUR FRIENDS!" with a paper-plane icon.

The step demos are cumulative:
- Step 1 adds only anticipation.
- Step 2 adds squash/stretch and the big white number pop.
- Step 3 adds the follow-through: the hero overshoots and settles, the trail lags, a white bloom burst fires, streaks exit through the far side of the enemy, and embers and scorch linger.
- Step 4 adds the 3-frame hold.
- Step 5 adds the arcing numbers.

In steps 1-5 the projectile carries cyan teaching overlays: a circle in step 1, an ellipse from step 2 on, with cyan speed lines or ghost rings. Only the split bottom and the outro show the bare stretched flame comet.

## Before and after

The plain version is not bare. It shares the juicy version's projectile speed (~21 px/frame), white hit flash, gold rim outline, pink/lilac hit tint and damage number, and it plays the same sub-bass boom. What it lacks is motion design.

PLAIN (split top n=0-132; single view n=143-339):
- The orb appears at the hand and sits 3 frames (split n=10-12; single n=143-145). A small muzzle flash fires (n=13; n=146) and the orb leaves.
- The hero never moves: no lean, no lunge, no settle.
- The projectile is a round white core, 14-16 x 14-18 px (~0.33 enemy widths), with a ~25 px glow. It flies a straight line at a constant ~20-24 px/frame and reaches the enemy ~13 frames after it spawns.
- On contact the enemy goes white-lavender for 1-2 frames (interior luma 206 in split at n=24-25; 232 for 1 frame in single at n=157). A gold rim and lilac tint then decay over ~9-10 frames.
- The enemy bounding box is unchanged (~46x70 px): no squash.
- No freeze, no bloom burst, no exit streaks, no embers or scorch, no shake.
- The number is a fixed 24x16 px. It is cream (#E9DED7) for 1 frame, then turns orange (~#E9B468) within 2 frames. It floats straight up at ~1.9 px/frame with x constant (~390 single) and is gone after ~21 frames (0.7 s).

JUICY (split bottom; outro):
- Anticipation: a swirling fire crescent appears at the front hand 1-2 frames before the lean (outro n=1302) and grows to ~50-60 px. The hero slides and rocks back 14-18 px over 10-11 frames (split n=15-25, outro n=1304-1313) and loses ~7-9 px of height (crouch). The top edge drops 12-14 px because the body also slides down and back ~5 px.
- Release: a 1-frame snap. The hero lunges +12 to +16 px past rest (split +8 to +12; once +20-22) and is ~7% taller on that frame. Most of the return happens in 4-5 frames; it is fully at rest after 6-13 frames.
- Projectile: a comet with a white core of ~53-66 x 25-32 px (aspect ~2:1 along travel) and a tapered flame tail ~1.5-2x the core length, at the same ~21 px/frame. Contact comes 10-12 frames (mostly 11) after release.
- Contact frame: the enemy squashes into a wide, low white blob, 1.18-1.30x wide and 0.85-0.91x tall. Its top drops 13-14 px and its base spreads 4-7 px toward the camera. A big white number (33-34 x 24 px) pops ~35 px above the enemy.
- The whole game then holds for 3 video frames (~100 ms). In the split, only the juicy half freezes while the plain half keeps animating. During the hold the enemy interior luma is 233-243.
- Burst: a white bloom of 2-3 frames (enemy luma 247-249; demo-region luma +10, e.g. 43.4 -> 53.8). Needle streaks exit the far side of the enemy, reaching 31-44 px (0.7-1.0 enemy widths) past its edge for 3 frames.
- The enemy springs to ~1.05-1.1x height and ~0.88x width at +5 to +8 frames, and is at rest by +10 to +13.
- Gold embers spray from the impact face: the main mass lasts ~10-12 frames, with a faint tail to ~+20. Red-brown scorch lingers ~20-25 frames, until the next shot.
- The number shrinks to ~21-22x15 px within 3 frames of the burst, turns orange, and arcs sideways, alternating left and right. It rises 36-43 px, peaks at +13 to +16 frames, falls and fades at ~+22 to +24 frames.
- Outro only: a 3-4 px game-camera shake.

Shot cost:
- Latency: ~23 frames from fire appearing to contact, plus a 3-frame hold, against ~13 frames from orb spawn to contact for the plain shot. That is ~12-13 frames (~400-430 ms) more latency per attack.
- Rate: the juicy loop is not slower. The outro fires every 31-32 frames against 40 for the plain single view, because the next wind-up starts ~8 frames after contact, during the previous burst.

## Step 1: Anticipation

**Narration.** Step 1, anticipation. The hero leans back while the fire gathers, then throws. (11.34-16.04 s; TikTok ASR and the merged transcript agree; no corrections needed)

**On screen.** Header: "(1) ANTICIPATION!". Sketch: "WIND UP..." with a left arrow, then "GO!". Demo labels: "LEANS BACK..." with a left arrow, then "THROW!" (the label rides above the projectile). Bottom captions: "THE HERO LEANS BACK..." / "...THEN THROWS!"

**What you see.**

n=343-391: the scene dims to ~15-20% and a hand-drawn yellow ball squashes backward ("WIND UP...") before launching up and right on an arc ("GO!").

n=392-402: the demo returns. A swirling fire crescent and a white-hot core form at the hero's front-right hand, with a cyan teaching ring around the core. At the same time the hero slides and rocks back away from the enemy: its left edge goes 72 -> 54 px over n=393-402.

n=403-411: the pose holds while the scene dims.

n=410-454: edit pause, 45 identical frames. The scene is at ~65% (hero #E27F36 -> #9A5C2F), a cyan circle is drawn round the hero, and "LEANS BACK..." appears.

n=455-460: the scene brightens back.

n=461: release. In this step the hero snaps straight back to upright in 1 frame with no overshoot (left edge 55 -> 72 = rest). A round orb flies a straight line to the enemy, with a cyan circle ~35 px, 4 cyan speed lines behind it, and "THROW!" riding above it.

n=472: the next shot's fire swirl already appears at the hand.

n=473: contact. A plain hit: pale flash, gold rim, a small 24x16 "27" that turns orange and rises straight up. No squash (body 46x72 unchanged), no freeze.

Real-time repeat: the hero leans back over n=474-483 (72 -> 56 px), releases at n=484, and the orb makes contact at n=494-495 ("25").

In the split-screen and outro versions the same lean takes 10-11 frames: n=15-25 (split) and n=1304-1313 (outro). The fire appears 1-2 frames earlier.

**Measurements.**

- **anticipation (wind-up) duration**: Lean: 10 frames = 333 ms (n=474->483, release 484); 11 frames (split n=15->25, release 26); 10-11 frames (outro n=1303/1304->1313, release 1314). From the fire swirl's first frame to release: 12-13 frames (outro n=1302->1314) (frames 474-484, 15-26, 1302-1314; confidence high)
  - Method: hero left edge from an orange mask at mid-height, per frame; fire onset read from frames
- **lean-back distance**: Left edge moves 16 px back in single view (step 1, 0.35 enemy widths of ~46 px) and 18 px in the outro (0.39). In split it moves 14-16 px (0.36-0.41 of ~39 px). Visually there is also a backward tilt of roughly 10-15 deg (frames 474-483, 1304-1313, 15-25, 58-68; confidence high)
  - Method: orange-mask left edge vs rest; tilt read by eye (fire occludes the right side)
- **crouch during wind-up**: Hero height 71 -> 62-65 px (7-9 px, ~10-13%). The top edge drops 12-14 px because the body also slides down and back ~5 px (base 532 -> 537) (frames 1304-1313, 474-483; confidence medium)
  - Method: topmost and bottom orange rows per frame
- **release**: 1-frame snap from full lean to release pose (n=460->461; n=483->484; n=1313->1314) (frames 460-461, 483-484, 1313-1314; confidence high)
  - Method: hero left-edge jump between consecutive frames
- **size of the gathering fire**: Bright (luma>235) swirl of ~50-60 x 40-68 px (1.1-1.4 enemy widths), centred ~30-40 px in front of the hero at about hand height (frames 18-22, 398-400, 1306-1312; confidence medium)
  - Method: bbox of pixels with luma > 235 near the hand
- **plain-version comparison**: 0 frames of body anticipation. The orb sits at the hand for 3 frames (single n=143-145, split n=10-12) and the hero never moves (frames 10-13, 143-146; confidence high)
  - Method: orange mask stationary; bright-blob tracking
- **flight time and speed**: 10-12 frames (mostly 11, ~367 ms) from release to contact. About 21 px/frame (0.45 enemy widths per frame, ~630 px/s) in a straight line (frames 461-473, 484-494, 1314-1325, 1320-1324; confidence high)
  - Method: white-core centroid tracking; release and contact frames
- **edit pause (editing device, not in-game)**: Frames 410-454 identical (45 frames, 1.5 s). The scene is dimmed to ~65% (hero #E27F36 -> #9A5C2F, enemy #7B73DF -> #4C4B8C) (frames 410-454; confidence high)
  - Method: near-zero region diffs plus pixel sampling

**Colours.** #E77D2F to #EB812E hero body (lit side #F99644, shaded side #C26528); #FFFFD2 / #FDFFE7 white-hot fire core at the hand; #FCFAAF / #AD9148 yellow-to-gold flame swirl; #98BABC to #A4BAD1 cyan teaching ring and speed lines (overlay, not game VFX); #84B9DF cyan caption text; #ECD77F yellow caption and labels; #0B101B to #151A2E background; #23293C grid lines

**Rule.** Before every attack release, pull the caster back and down, away from the target, by ~0.35-0.4 target widths over ~10 frames (330 ms) while the charge visibly grows at the hand, then release in a single frame.

## Step 2: Squash & stretch

**Narration.** Step 2, squash and stretch. The fireball stretches in flight and the enemy squashes on the hit. (16.90-22.24 s; no corrections)

**On screen.** Header: "(2) SQUASH & STRETCH!". Sketch labels: "STRETCH" (elongated falling ball) and "SQUASH!" (flat ball on a line). Demo labels: "STRETCH!" (over the projectile) and "SQUASH!" (beside the enemy). Captions: "THE FIREBALL STRETCHES..." / "THE ENEMY SQUASHES!"

**What you see.**

n=512-560: sketch interstitial. A bouncing ball stretches along its path as it falls and flattens on the ground line.

n=561-572: the demo returns with the hero winding up (left edge 78 -> 60). Release at n=573, with no lunge past rest.

n=582-605: mid-flight edit pause, dimmed (~56%). The projectile's cyan outline is now an ellipse stretched along the travel direction, tilted ~12 deg up-right, with 3-4 cyan speed lines and a hollow ghost ellipse behind. In step 1 the same outline was a circle.

n=606-614: flight resumes, leaving hollow ghost ellipses (afterimages) behind.

n=615: contact. The enemy becomes a short, wide white-lavender blob and a big white "28" pops above it.

n=616-622: a gold rim appears; the enemy recovers.

n=622-656: pause with a yellow hand-drawn ellipse around the squashed enemy.

Real-time repeat: release at n=670 (left edge +2 px at most) and contact at n=681 ("41").
- The squash is held 2 frames (n=681-682, height 60).
- The enemy rises back over n=683-685 (64, 66, 70).
- It overshoots taller and narrower at n=686-687 (height 72-76, width 42).
- It settles by n=688-689 with a ±2 px wobble to n=695.
There is no hitstop and no bloom in this step (demo luma flat at 36.3 on the contact frame).

**Measurements.**

- **projectile stretch (teaching outline)**: Circle ~35 px (step 1) -> ellipse ~57x26 px (step 2): 1.6x along travel, 0.74x across, aspect ~2.2:1 (1.27 x 0.58 enemy widths). Roughly area-preserving (frames 468 vs 590, 677-678; confidence medium)
  - Method: zoomed crops with a 10 px ruler; cyan-mask bbox
- **final comet shape (rules on)**: White core 53-66 px long x 25-32 px (~1.2-1.4 x 0.6 enemy widths, aspect ~2:1) plus a tapered flame tail ~1.5-2x the core length (luma>150 glow 166-184 px long in total). Plain orb core 14-16 x 14-18 px, round (frames 1320-1324, 150-155; confidence medium)
  - Method: bbox at luma > 240 and > 150 per frame
- **enemy squash on the contact frame**: Step 2 single view: body 48x66 -> 62x60 px (1.29x wide, 0.91x tall); top drops 13 px, base drops 7 px (spreads toward the camera). Outro: 46x69 -> 60x62 (1.30x, 0.90x; top -14, base +7). Split: 40x59 -> 47x50 (1.18x, 0.85x; top -13, base +4). Overall range: width 1.18-1.30x, height 0.85-0.91x (frames 676-681, 1322-1325, 33-37; confidence medium)
  - Method: lavender/purple body-mask bbox without the gold rim (the left edge is partly fireball glow), plus 2x zooms
- **squash-to-rebound timing**: Squash held 2 frames (n=681-682) -> heights 64, 66, 70 -> overshoot 72-76 px (+5-10% depending on mask) with width 42 (0.88-0.91x) at +5 to +6 frames (167-200 ms) -> rest at +7 to +8 frames. Outro (after the hold): overshoot height 74 vs 69 (+7%) at +7 to +8 frames, rest by +10 to +13. Split overshoot is width 34 vs 40 (0.85x) at +7 to +8 frames (frames 681-695, 1325-1341, 37-50; confidence medium)
  - Method: body-mask bbox per frame
- **damage number pop**: White 32x24 px at contact (vs 24x16 orange in step 1). Shrinks to 27x19 the next frame and 22x16 by +2 frames while turning orange (~#E6B776). Rises straight up at ~1.8 px/frame (36.6 px over 20 frames, x drift < 1 px) (frames 681-701, 473-492; confidence high)
  - Method: glyph-mask bbox and centroid per frame
- **edit pauses (editing device)**: 24 identical frames mid-flight (n=582-605); 35 identical frames on the squash (n=622-656) (frames 582-605, 622-656; confidence high)
  - Method: region diffs about 0

**Colours.** #F0E6FB / #E3DAF6 squash-flash body (shade #DDD1F5); #FFF8FC to #E9E2D5 damage number at pop; orange after shrink #E6B776 to #E8BF7B; #ECD592 / #D3B186 gold rim outline, ~3-4 px; #C198E1 lilac hit tint; #DC8ACA / #E08BC1 pink highlight; #6D66CE to #816CCE enemy at rest (top #8679EF, shade #5B51B4); #9DBDCF cyan teaching ellipse and ghost rings (overlay)

**Rule.** Stretch a fast projectile along its travel direction (about 2:1). On the hit frame, squash the target vertically (about 1.2-1.3x wide, 0.85-0.9x tall, base planted), then spring it past rest (about 1.05-1.1x tall, 0.9x wide) and let it settle within about 8-12 frames.

## Step 3: Follow-through

**Narration.** But here's the better way to make it feel alive. Step 3, follow through. The hero's body settles after the throw, the trail lags behind, and the burst flies on. (22.94-30.68 s; no corrections; 'make it feel alive' is only spoken, the caption reads "BUT HERE'S THE BETTER WAY...")

**On screen.** Sketch: "IT STOPS..." / "THE TAIL KEEPS GOING!" with the caption "BUT HERE'S THE BETTER WAY...". Header: "(3) FOLLOW-THROUGH!". Demo labels: "SETTLES." with a double-headed arrow, "LAGS!", and "FLIES ON!" with three arrows fanning right. Captions: "THE BODY SETTLES," / "THE TRAIL LAGS..." / "AND THE BURST FLIES ON!"

**What you see.**

n=698-757: sketch. A tailed ball hits a vertical wall and stops while its tail swings on past.

n=788: release. The hero lunges forward past upright (left edge 88 vs rest ~72, tilted toward the enemy, stretched taller). The stretched fireball leaves 4-5 trailing wavy cream-yellow streaks that bend back toward the hand.

n=789-801: slow motion. The projectile barely advances while a cyan outline is drawn round the hero.

n=801-863: edit pause, 63 identical frames, with "SETTLES." and "LAGS!".

n=864-880: the hero eases back upright (88 -> 72) while the fireball flies off at ~21 px/frame with its wavy trail lagging behind.

n=881: contact ("24"); no hold in this step. n=882-883: burst.

n=892-911: pause while yellow arrows labelled "FLIES ON!" are drawn from the enemy toward right, up-right and down-right.

Real-time repeat:
- The hero leans back over n=913-923 (left edge 68 -> 56) and releases at n=924, snapping 14 px past rest (86 vs 72).
- It eases back over n=925-937: 82, 80, 78, 78, 76, 76, 76, 74, 74, 74, 74, 74, 72.
- Contact at n=935: squash plus a fully white enemy (luma 248.6) with a bloom (demo luma 46 -> 56) that lasts n=935-937.
- Over n=935-937 thin bright needle streaks spray out of the far (right) side of the enemy, continuing the projectile's direction, with shorter ones on the near side.
- Over n=938-950 small gold embers spread from the impact face (the enemy's left, toward the camera), drift down and fade. Dark red-brown scorch lingers at the impact point and is still visible at n=927-931 before this hit, left over from the n=881 hit.

**Measurements.**

- **forward overshoot (lunge) on the release frame**: Single view +12 to +22 px past rest, typically +12 to +16: step 3 +14 (924); step 4 +14 (1033) and +20 to +22 (1101); step 5 +15-16 (1204) and +14 (1276); outro +14/+12/+13-15 (1314/1346/1377). Split +8 to +12 (69, 26). That is 0.25-0.45 enemy widths. The hero is ~7% taller on that frame (height 76 vs 71 at 1314). Steps 1-2: 0 to +2 px (frames 924, 1033, 1101, 1204, 1276, 1314, 1346, 1377, 26, 69, 461, 484, 573, 670; confidence high)
  - Method: hero left-edge x vs rest (72-76 px single view, 108-110 px split); top and bottom rows
- **settle after the throw**: Ease-out: most of the return within 4-5 frames, fully at rest after 6-13 frames (200-433 ms). Step 3: 86, 82, 80, 78, 78, 76, 76, 76, 74, 74, 74, 74, 74, 72 (13 frames). Outro: 88, 82, 79, 76, 76, 76, 74 (6 frames). Split: 122, 118, 114, 114, 112, 112, 112, 112, 110 (8 frames) (frames 924-937, 1314-1320, 26-34; confidence high)
  - Method: hero left edge per frame
- **no-follow-through comparison (step 1)**: Release snaps 55 -> 72 px and stays at 72-74 px: 0 px overshoot, 0 frames settle (frames 455-469, 483-499; confidence high)
  - Method: hero left edge
- **lagging trail**: 4-5 wavy streaks ~80-125 px long behind a 48-50 px ellipse (1.6-2.5x the projectile length; 1.8-2.8 enemy widths). The streaks wiggle and their rear ends trail the head (frames 927-931, 790-797; confidence medium)
  - Method: 2x zoom with an x ruler
- **bloom burst (first appears in this step)**: Enemy interior luma 248.6/245.0/242.5 on n=935-937 and demo-region luma 46 -> 56.1/54.3/51.4. In step 2 the contact frame has no bloom (enemy luma 223, demo luma flat at 36.3) (frames 932-945, 678-691; confidence high)
  - Method: mean luma of a 20x20 enemy patch and of the demo region
- **burst flies on (exit-side streaks)**: Needle streaks reach 31-44 px past the enemy's far edge (0.7-1.0 enemy widths) and live 3 frames (100 ms): step 3 n=935-937 (x 460-463 vs edge ~419); outro n=1328-1330; split n=40-42 (36-42 px past an edge of ~395). The annotation fan covers about ±30 deg around the travel direction. 0 px of exit streaks in the plain version, step 1 and step 2 (frames 935-938, 1328-1331, 40-43; absent at 154-162, 491-499, 679-687; confidence medium)
  - Method: rightmost pixel with luma > 170 right of the enemy's right edge
- **embers and scorch**: Gold flecks of 2-5 px spread 20-60 px from the impact face and drift down. Their main mass fades in ~10-12 frames (ember-pixel count 553 -> 115 by +10 after burst n=1290), with a faint tail to ~+20 to +24. Red-brown scorch lingers ~20-25 frames (count ~100-120 px from +8 to +19 frames, ~15 by +25), i.e. until the next shot. Not present in the plain version or steps 1-2 (frames 1290-1321, 1328-1352, 938-949; confidence medium)
  - Method: ember and scorch colour-mask pixel counts in the impact-face region; visual reading of 2x zooms
- **edit pauses (editing device)**: 63 identical frames (n=801-863) after a slow-motion stretch of ~12 frames (n=789-801), and 20 identical frames (n=892-911) (frames 789-863, 892-911; confidence high)
  - Method: region diffs about 0

**Colours.** #FCFAAF / #FFF692 cream-yellow lagging trail streaks; #D9C47C embers (median), brightest #FFFA8A; #885538 red-brown scorch smoke; #FDF2F8 / #FCF6FD burst core, #FFFADB warm halo; #9DBDCF cyan outline round the hero (overlay); #ECD77F yellow "LAGS!" / "FLIES ON!" and arrows

**Rule.** After every release and impact let something keep moving: overshoot the caster ~0.3 target widths forward and ease it back over 6-13 frames, drag a trail that lags behind the projectile, bloom the target white for 2-3 frames, spray streaks ~1 target width onward through the target in the travel direction, and leave embers for ~0.4 s and scorch for ~0.8 s.

## Step 4: Timing (hitstop)

**Narration.** But none of this lands unless you nail step 4, timing. Freeze the game for a few frames on the hit. (31.42-36.44 s; no corrections)

**On screen.** Sketch: "HOLD..." with 4 small squares filling one by one, then "4 FRAMES!", with the caption "NONE OF THIS LANDS UNLESS...". Header: "(4) TIMING!". Demo label: "HOLD IT!" above the number, with a 4-box frame counter just below the number (between it and the enemy). Captions: "FREEZE THE GAME..." / "FOR A FEW FRAMES ON THE HIT!"

**What you see.**

n=953-1002: sketch. The ball lands, flattens on the line and is held while 4 boxes fill ("4 FRAMES!").

Demo hit 1:
- Release at n=1033 (+14 px lunge), contact at n=1044.
- The impact frame shows the enemy squashed and white with the fireball still embedded (its trail visible), a big white "26", and 4 empty boxes. The next shot's fire swirl is already at the hero's hand.
- The editor holds this frame until n=1090. The scene dims to ~60% over n=1045-1060, "HOLD IT!" types in, the boxes fill, and the scene brightens back over n=1086-1090.
- The burst plays at n=1091, and the hero leans for the next throw over n=1091-1100.

Demo hit 2, real time:
- Release at n=1101 (+20 to +22 px lunge), contact at n=1113.
- Frames n=1113-1115 are identical across the whole game: hero, trail, embedded fireball, short streaks already poking out of the far side, enemy and number.
- The boxes fill over n=1115-1118.
- On n=1116 the fireball is replaced by the burst (white bloom, longer needle streaks) and the number starts to shrink and turn orange.
- The number then rises straight up (x drift +1.2 px over 23 frames).

The same 3-frame hold appears at every later rules-on hit and at the split-screen hits n=37/80/122. The real hold is not dimmed.

**Measurements.**

- **hitstop length**: 3 identical video frames = 100 ms at 8 of 9 hits (37-39, 80-82, 122-124, 1113-1115, 1215-1217, 1287-1289, 1325-1327, 1388-1390) and 2 frames once (1357-1358). The true hold is therefore ~67-100 ms. The creator labels it "4 FRAMES" (4 frames at 60 fps = 67 ms) (frames 37-40, 80-83, 122-125, 1113-1116, 1215-1218, 1287-1290, 1325-1328, 1357-1359, 1388-1391; confidence high)
  - Method: consecutive-frame mean absolute difference in the enemy and demo regions ~0.0-0.5 while neighbours are 3-42
- **what freezes**: Everything in that game: hero region diff 0.01-0.07, projectile and trail, enemy squash pose, number. The burst has not started yet. In the split screen only the juicy (bottom) game freezes; the plain top keeps animating (enemy diff 1.40-1.42 during n=38-39) (frames 1113-1115, 1325-1327, 37-39; confidence high)
  - Method: region diffs
- **brightness during and after the real hold**: The hold is not dimmed: demo-region luma is constant during the hold. Enemy interior luma is 233-243 during the hold (split 232.7, outro 235.0, step 4 243.4) and 247-249 on the 2-3 burst frames, then decays to ~145-160 by +10 to +14. The burst adds ~+10 demo luma in split (38.5 -> 49-51) and outro (43.4 -> 53.8-54.1). In step 4 hit 2 the held frames are already at 54.0 because the embedded fireball glow is larger, so the burst adds nothing (53.9) (frames 1110-1127, 34-51, 1322-1339; confidence high)
  - Method: mean luma of the demo region and a 20x20 enemy patch
- **plain-version flash for comparison**: Enemy luma peaks at ~206 for 2 frames (split top n=24-25), or 232 for 1 frame then 220 (single n=157-158), and decays to ~145-155 in ~9-10 frames. No hold (frames 20-35, 153-169; confidence high)
  - Method: enemy-interior luma
- **edit-extended hold in demo hit 1 (editing device)**: The impact frame n=1044 is held through n=1090 (47 frames shown), with the dim ramping in over n=1045-1060 and out over n=1086-1090 (frames 1044-1091; confidence high)
  - Method: region diffs about 0 apart from overlay drawing; pixel sampling (hero #884A23 at n=1070)

**Colours.** #F0E6FB / #FBEFF6 frozen squash body; #F0EAEC frozen white number; #ECD77F "HOLD IT!" and filled counter boxes (cyan outlines); #FDF2F8 / #FFFADB burst after the hold

**Rule.** On the hit frame, freeze the whole game (caster, projectile, target, numbers) for about 4 frames at 60 fps (70-100 ms) on the pose of maximum deformation, then release straight into the burst.

## Step 5: Arcs

**Narration.** And here's the best part. Step 5, arcs. Nothing flies straight. Not the sparks, not the damage numbers. (37.38-44.46 s; no corrections)

**On screen.** Sketch: a red dotted straight line with a red X, labelled "NOT STRAIGHT...", while the yellow ball hops over on a curve labelled "AN ARC!"; caption "AND HERE'S THE BEST PART:". Header: "(5) ARCS!". Captions: "NOTHING FLIES STRAIGHT..." / "NOT THE SPARKS," / "NOT THE NUMBERS!". Annotations: a cyan circle round the number with a dashed yellow arc path; dashed cyan arcs curving down from the enemy for the sparks.

**What you see.**

n=1133-1186: sketch, a straight path crossed out against an arcing ball.

Demo hit 1: release at n=1204, contact at n=1215, hold n=1215-1217, burst at n=1218. The white "31" shrinks to orange and flies up-left on a decelerating curve.

n=1234-1269: edit pause. A circle is drawn round the number and dashed arc paths are added for the number and the sparks.

Demo hit 2: release at n=1276, contact at n=1287, hold n=1287-1289, burst at n=1290. "40" drifts right at a steady rate while rising, peaks at about n=1303, sinks, and fades at about n=1310. Embers spray out at the impact face and fall.

The projectile itself still flies a straight line and still carries the cyan teaching ellipse in this step. The split-screen rules-on numbers (n=37-60, 80-102, 122-137) and the outro numbers follow the same sideways arcs. Numbers in the plain version and in steps 1-4 rise straight up.

**Measurements.**

- **damage-number arc**: Sideways ~2.5-3 px/frame, constant. Vertical starts at about -5 px/frame and slows by ~0.4 px/frame^2 (outro hit 1: -5.4, -3.6, -3.7, -3.4, -3.1, -1.8, ... 0, +0.8 ... +2.6). Apex at +13 to +16 frames (430-530 ms) with a rise of 36-43 px (0.8-0.95 enemy widths), then a fall of 5-10 px before fading. Total sideways travel 44-63 px (1-1.4 enemy widths) (frames 1325-1347, 1357-1379, 1388-1411, 37-60, 80-102, 1287-1310; confidence high)
  - Method: per-frame glyph-centroid tracking
- **arc direction across repeats**: Alternates: split L, R, L; step 5 L, R; outro L, R, L (frames 37-60, 80-101, 122-137, 1215-1240, 1287-1310, 1325-1347, 1357-1379, 1388-1411; confidence high)
  - Method: sign of x drift
- **number lifetime and scale**: Pops at 33-34 x 24 px, white (2 digits; ~0.73 enemy widths), and holds through the freeze. Shrinks to ~21-22x15 px (~0.48 enemy widths) within 3 frames after the hold while turning orange. Total life 22-24 frames (730-800 ms); fades over the last ~2-4 frames (frames 1325-1347, 37-60; confidence high)
  - Method: glyph bbox per frame
- **straight-number comparison (plain version, steps 1-4)**: x constant (drift within ±2 px: plain 389.5-390.3, step 2 -0.9, step 3 -1.7, step 4 +1.2); rises at 1.8-2 px/frame; no sideways motion (frames 157-177, 473-492, 681-701, 935-955, 1113-1135; confidence high)
  - Method: glyph centroid
- **projectile path**: Straight: per-frame dy constant at about -4 to -5.5 px while dx is ~19-25 px; no arc on the fireball (frames 1320-1324, 150-155; confidence high)
  - Method: white-core centroid tracking
- **spark/ember arcs**: Embers drift out from the impact face and fall over ~10-20 frames; the annotation draws them as downward-curving arcs. Single-particle trajectories could not be tracked (frames 1290-1314; confidence low)
  - Method: visual reading of 2x zooms; ember-mask counts

**Colours.** #F0EAEC number at pop -> orange #E2AD64 / #E8B46B in flight; #D9C47C / #FFFA8A embers; #84B9DF cyan annotation circle and dashed spark arcs; #ECD77F yellow dashed number path; #EF6B5F red X and "NOT STRAIGHT..."

**Rule.** Launch every secondary element (sparks, embers, damage numbers) on a ballistic arc: a constant sideways velocity plus an upward kick that gravity bends back down, alternating sides between hits. Never float a number straight up.

## The kill or finisher

There is no kill or finisher beat in this video. The enemy capsule never dies, has no health bar and never changes state. Every shot loops with a new damage number (24-41).

The closest thing to a climax is the impact burst that follows the 3-frame hold:
- Burst frame 1 (e.g. n=40, 1116, 1218, 1290, 1328) replaces the projectile with a white bloom over the enemy (#FDF2F8 core, #FFFADB halo). The enemy interior reaches luma 247-249 for 2-3 frames, and demo-region luma rises by ~+10 (split and outro).
- Bright needle streaks fly out both sides, longest on the exit side: 31-44 px (0.7-1.0 enemy widths) past the far edge for 3 frames.
- The squashed enemy springs back to a capsule ~1.05-1.1x tall and ~0.88x wide at +5 to +8 frames, with a gold rim and lilac/pink tint, and is at rest by +10 to +13.
- Gold embers spray from the impact face for ~10-12 frames, with a faint tail to ~20. Red-brown scorch lingers ~20-25 frames.
- In the outro only, the game camera shakes 3-4 px in a varying direction, held through the freeze: (+4.0,+1.4), (+4.0,-1.4), (+2.9,-3.1). On the burst frame it jumps to another offset of ~3-4 px, e.g. (-3.1,+1.9), (+0.9,-3.6), (-2.8,+2.8), and is back to 0 within 2-3 frames.

None of this is labelled as a kill.

## Sound

Narration covers almost the whole track. There is no music bed: the gaps between sentences drop to digital silence (about n=663-667, 872-878, 917-920, 1089-1098).

Two game sound effects can be heard in the speech gaps.

(1) THROW: a soft low 'whoomp/fwoosh'.
- Low peak at 126-132 Hz plus a partial near 200 Hz; ~75% of the energy lies in 90-500 Hz and little lies above 2 kHz.
- The centroid is ~140-215 Hz, depending on the window and band.
- Sharp onset, sustains ~4 frames, decays over ~9-10 frames (~300-330 ms).
- Onsets: n=667.75-668.0, 920.75-921.0, 1098.75-1099.0, against visual releases at n=670, 924, 1101.

(2) IMPACT: a deep sub-bass 'boom' with a broadband crackle.
- Sub peak at ~44-50 Hz (20-60 Hz holds ~41% of the energy) plus a 117-122 Hz body and noise up to 8 kHz.
- Peaks ~5-6 frames after onset and is down 20 dB by ~10.5-11 frames (~350 ms).
- ~7 dB louder than the throw (RMS -22 vs -29 dBFS).
- Onsets: n=678.25-678.5, 931.75-932.0, 1109.5-1110.0, against visual contacts at n=681, 935, 1113.

Alignment:
- Both sounds lead their visual events by a near-constant 2-3.25 frames (67-108 ms).
- The throw-to-impact gap matches the visual gap (10.5-11 frames in audio, 11-12 in video), so the sounds are event-locked. The lead is probably a capture or trigger offset rather than a deliberately early sound.
- The impact sound starts at contact, i.e. at the first frozen frame (after allowing for the offset). Its energy peaks through the 3-frame hold, and no separate onset marks the burst at the end of the hold (step 4 hit 2).
- There is no charge or wind-up sound: digital silence during the anticipation (n=917-920 in step 3).

Repeats:
- The throws match each other closely (low peaks 126.5/130.2/132.2 Hz, same band split), and so do the impacts (47.4/48.4/49.8 Hz).
- Any pitch variation is within ±3%, inside the measurement resolution, so no deliberate pitch randomisation could be detected.

Plain version: sub-bass booms also start ~2-2.5 frames before each plain contact (onsets n=153.75/194.25/233.75/273.75; contacts 156/196/236/276; spectrum peak 44.7 Hz + 110.7 Hz). The plain version therefore has the same kind of impact sound, but narration overlaps it, so it could not be confirmed as the identical sample.

Step 4 edit-extended hold:
- The hit-1 boom starts at n=1041 (3 frames before contact 1044) and narration continues through most of the hold.
- The track then drops to digital silence from about n=1089 to 1098, so the burst shown at n=1091 is silent.

## Principles

- Juice is motion design, not more stuff. The plain and juicy versions share projectile speed (~21 px/frame), white flash, gold rim, tint, damage numbers and the impact sound. Every difference is shape, timing and trajectory.
- Rules stack cumulatively. The step demos add one rule each:
- step 1: the lean only;
- step 2: the projectile stretch, the target squash and the big white number pop;
- step 3: the caster overshoot and settle, the lagging trail, the white bloom, the exit-side burst streaks, and lingering embers and scorch;
- step 4: the 3-frame whole-game hold;
- step 5: the arcing numbers.
Each one is visibly absent in the steps before it.
- Timing contrast carries the weight: ~10-11 frames slow lean, 1-frame release, ~11 frames of flight, 3 frames of hold, 2-3 frames of bloom, 6-13 frames of settle. Wind-up to release is ~10:1, and the hold is about a quarter of the flight time.
- Freeze on the pose of maximum information. The held frame shows the projectile still embedded, the target at full squash and nearly white (luma 233-243), and the number at its largest. The release from the hold is the burst.
- Overshoot, then settle, on both ends. The caster lunges ~0.27-0.45 enemy widths past rest and eases back, mostly within 4-5 frames and fully within 6-13. The target squashes to ~0.85-0.91x height, rebounds to ~1.05-1.1x and rests by ~+10 to +13 frames (a damped spring).
- Something always keeps going after the stop: the trail lags behind the projectile, burst streaks continue ~1 enemy width through the target in the travel direction, embers fall for ~0.4 s and scorch stays ~0.8 s.
- Arcs go on secondary elements, not on the projectile. The fireball flies a straight line; numbers (and, per the annotation, sparks) get ballistic arcs, alternating sides between hits.
- Number hierarchy: big and white (~0.73 enemy widths) during the hold, then within 3 frames it shrinks to ~0.48 enemy widths and turns orange, so it reads as an event first and a value second. Total life ~0.75-0.8 s.
- Readability: warm white, yellow and gold effects on a dark navy floor against a cool purple target. The target's near-white squash frame is the brightest thing on screen at the hit. The colour contrast comes from the warm effects against the cool target, not from the white frame itself.
- Screen shake is optional. Every step demo, and the opening split, gets its punch without any camera move. Only the outro adds a small 3-4 px (~0.08 enemy widths) shake in a varying direction: held through the freeze and jumped to another offset on the burst frame.
- Juice adds latency, not necessarily lower fire rate. Intent to contact is ~23 frames plus a 3-frame hold, against ~13 for the plain orb: ~400-430 ms more per attack. Yet the creator's juicy outro loop fires every 31-32 frames against 40 for the plain loop, because the next wind-up starts during the previous hit's burst. So the anticipation and hold lengths have to fit the game's input-to-hit budget, and wind-ups can overlap the previous aftermath.
- Transfer to Echoes: the demo camera matches Echoes' high three-quarter view, so convert pixel values through the enemy capsule width (~46 px single view, ~39 px split). Map the demo's white/gold/orange hit palette to Echoes' reserved colours: Ember #FF5A36 only for enemy threats, Bright Heal #5FE873 only for healing, Violet #B79CF0 only for corruption, so a hero fireball's hit should not read as Ember.

## Extra tips

- "VFX = CARTOON RULES!" (permanent header): the thesis that game VFX quality comes from cartoon-animation rules.
- "RULES OFF" / "RULES ON!" (0-4.4 s): the same fireball, VFX assets and boom sound, side by side; only the motion design differs. Only the juicy half freezes on its hits while the plain half keeps playing.
- "MORE PARTICLES? MORE GLOW?" struck through in red at 6.97-7.4 s, then "DISNEY'S 1930s RULES!" (9.1-9.5 s) over a hand-drawn bouncing-ball sketch. Narration: "It's not the particles. It's not the shaders. It's rules Disney animators wrote in the 1930s."
- "WIND UP... GO!": the sketch ball squashes backward before launching. The demo hero leans back ~0.35-0.4 enemy widths for ~10 frames before a 1-frame throw.
- "LEANS BACK..." / "THROW!": the THROW! label rides above the projectile in flight.
- "STRETCH" / "SQUASH!": the sketch ball stretches when falling and flattens on landing. The demo projectile outline goes from a circle to a ~2.2:1 ellipse, and the enemy becomes a wide, low white blob (~1.3x wide, ~0.9x tall).
- "IT STOPS... THE TAIL KEEPS GOING!": the tailed ball hits a wall and its tail swings past. This is the follow-through idea.
- "BUT HERE'S THE BETTER WAY..." (spoken: "But here's the better way to make it feel alive.")
- "SETTLES." (double-headed arrow) / "LAGS!" / "FLIES ON!" (three arrows fanning through the enemy in the travel direction)
- "NONE OF THIS LANDS UNLESS..." then "HOLD... 4 FRAMES!": the sketch counts 4 boxes while the squashed ball holds. The demo shows "HOLD IT!" with a 4-box counter under the number; the measured hold is 3 video frames (~100 ms).
- "FREEZE THE GAME... FOR A FEW FRAMES ON THE HIT!"
- "AND HERE'S THE BEST PART:" then "NOT STRAIGHT..." (red X over a dotted straight line) / "AN ARC!"
- "NOTHING FLIES STRAIGHT... NOT THE SPARKS, NOT THE NUMBERS!": the number is circled with a dashed arc path, and dashed arcs fall from the enemy for the sparks.
- "NINETY YEARS OLD... STILL WORKS!" over the full rules-on loop. The outro has no teaching overlays and adds a 3-4 px game-camera shake.
- "SEND THIS TO YOUR FRIENDS!" with a paper-plane icon (call to action).

## Uncertain

- The true hold length is not certain. 8 of 9 holds show 3 identical video frames and 1 shows 2, so the hold is ~67-100 ms. The creator's own label is "4 FRAMES", which implies a 60 fps game (67 ms). The game's frame rate is unknown.
- The constant 67-108 ms audio lead is in the presented media: ffmpeg honours the file's edit lists (audio skips 7106 priming samples = 161 ms; video has a 66.7 ms composition offset), so it is not a decoding artefact. Whether it comes from recorder latency or from SFX fired on the logic frame before render cannot be determined.
- Squash width (1.18-1.30x) is partly contaminated by fireball glow on the enemy's near side, and pure-white burst pixels fall out of the body mask. The height (0.85-0.91x) and the top drop (13-14 px) are more reliable. Rebound overshoot height ranges from +5% to +10% depending on the mask threshold.
- The hero's lean-back angle (~10-15 deg) was read by eye because fire occludes the hero's right side. The translation (14-18 px) and height loss (7-9 px) were measured.
- Spark and ember arcs were not tracked particle by particle (particles are 2-5 px). The 'sparks arc' claim rests on the visual reading and the creator's dashed-arc annotation; ember and scorch lifetimes come from colour-mask pixel counts, not from individual particles.
- Camera shake appears only in the outro hits (3-4 px in a varying direction, held through the freeze, then a different 3-4 px offset on the burst frame). It is not in the split screen or any step demo (grid shift 0.0-0.1 px), so it may be an extra layer in the creator's full build rather than one of the five rules.
- The number's left/right alternation (L, R, L in each sequence) could be strict alternation or a seeded random pattern.
- Whether the plain and juicy versions use the identical impact sample could not be isolated, because narration overlaps the plain hits.
- The task brief mentions a green health bar, but this video has none, and there is no kill or death beat.
- The narration was checked against TikTok ASR and the merged transcript, which agree word for word; it was not re-transcribed independently from the audio.
- The cyan circle/ellipse outlines, speed lines and ghost rings on the projectile in steps 1-5 are teaching overlays. The final juicy projectile (split bottom and outro) is a flame comet without them.
- Loop periods differ between segments (split juicy 42-43 frames, outro juicy 31-32, plain 39-40). They are probably the creator's demo timing, not a property of the rules.

## Verify verdicts

- **confirmed**: Hitstop is 3 identical video frames at 8 of 9 rules-on hits (37-39, 80-82, 122-124, 1113-1115, 1215-1217, 1287-1289, 1325-1327, 1388-1390) and 2 frames once (1357-1358).
  - Region diffs from full-res frames: demo-region diff 0.05-0.50 on the held frames, 3-13 on neighbours (e.g. n=1114 0.05, 1115 0.08, 1116 1.96; n=1358 0.17, 1359 9.64; split bottom n=38 0.70, 39 0.16, 40 10.96).
- **added**: In the split screen the whole game holds.
  - Only the bottom (rules-on) game freezes. During n=38-39 the bottom enemy diff is 0.33-0.99 while the top (rules-off) enemy keeps changing (diff 1.40-1.42). So the hold is game time, not a video freeze.
- **corrected**: Split screen: both versions fire on a loop of about 43 frames.
  - Top (plain) flash peaks are at n=25, 65 and 104, a 39-40 frame loop. Bottom (juicy) holds are at n=37, 80 and 122, a 42-43 frame loop. The single-view plain loop is 40 frames (156/196/236/276) and the outro juicy loop is 31-32 frames (1325/1357/1388).
- **corrected**: Camera is fixed; no camera move apart from the outro shake.
  - The game camera is fixed, but n=133-142 is an animated edit transition: the bottom half fades out while the top (rules-off) panel slides down and scales up about 1.18-1.2x (enemy body 39 -> 46 px wide). Grid phase-correlation shift is 0.0-0.1 px at hits 935, 1113, 1215 and 1287.
- **corrected**: Split-layout enemy capsule is 36-37 px wide; single view 45 px; hero 39-40 / 50 px; about 300 px apart.
  - Purple body mask without the rim: split enemy 39x57 px, hero 40x58 px; single enemy 44-48x70-72 px, hero 48-52x71-72 px. Centre-to-centre horizontal distance is about 300 px in single view (hero cx 97, enemy cx about 395) and about 245 px in split (129 vs 373). The analysis's 36-37 px is within threshold error, so the corrected range is 37-40 px.
- **corrected**: Plain orb sits at the hand 2-3 frames (n=144-145 single, n=10-12 split), then muzzle flash.
  - Single view: the orb appears at n=143 and sits 143-145 (3 frames), muzzle flash at 146, contact at 156. Split: it appears at n=10 (faint at 9), sits 10-12, muzzle flash at 13, flash on the enemy at 24.
- **confirmed**: Plain projectile 16x17 px, about 20-21 px/frame, straight; the juicy comet moves at the same speed.
  - Luma>240 core: plain 14-16 x 14-18 px, centroid x 237.6 -> 343.0 over n=150-155 (about 21 px/frame). Outro comet core 53-66 x 25-32 px, centroid x 269.5 -> 354.9 over n=1320-1324 (about 21 px/frame), with dy constant (-3.7 to -5.5).
- **corrected**: Enemy luma 202 during the hold, 237-245 on burst frames.
  - Enemy-interior luma (20x20 patch) is 233-243 during the hold (split 232.7, outro 235.0, step 4 243.4) and 247-249 on the burst frames (split n=40-41 248.8; outro n=1328-1330 247-248.5). The 202-206 value is the plain flash peak (split top n=24-25 206.5-206.8; single plain peak 232 at n=157 for 1 frame).
- **corrected**: The burst frame raises demo-region luma by about +10; bloom lasts 2 frames.
  - Confirmed for split (38.5 -> 49.1, 50.9) and outro (43.4 -> 53.8, 54.1, 50.7). The bloom lasts 2-3 frames. Not true for step 4 hit 2, where the held frames are already at 54.0 because of the larger embedded fireball glow and the burst frame n=1116 is 53.9.
- **added**: Step 3 adds overshoot, lagging trail, exit streaks and embers.
  - Step 3 also adds the white bloom burst. At step 2 contact (n=681) the demo luma is flat (36.3) and enemy luma is 223. At step 3 contact (n=935-937) the demo luma jumps 46 -> 56.1/54.3/51.4 and enemy luma is 248.6/245/242.5.
- **corrected**: Teaching overlays (cyan circle or ellipse plus speed lines) appear on the projectile only in steps 1-3.
  - The cyan ellipse outline is still on the projectile in step 4 (n=1040, 1108) and step 5 (n=1210, 1212, 1282, 1284): 89-319 cyan px vs 32-60 in the outro (n=1318-1384) and 10-44 in the split bottom. Only the split bottom and the outro show the bare flame comet.
- **corrected**: Step 1 first demo: fire forms n=392-402, then the hero slides back n=402-411.
  - The hero's left edge moves 72 -> 54 px over n=393-402 while the fire gathers, so the two happen together. The pose then holds while the scene dims (frames 404-411) into the edit pause (frames 410-454 identical).
- **corrected**: Step 1 real-time repeat: fire swirl restarts at n=474.
  - The swirl is visible at the hand at n=472, one frame before contact (n=473, when the number appears). The left edge moves 72 -> 56 over n=474-483, and the release is at 484.
- **confirmed**: Lean-back: 17 px single, 13 px split, 19 px outro; wind-up 10-11 frames.
  - Left edge: step 1 72->56 (16 px, n=474-483); outro 74->56 (18 px, n=1304-1313); split 110->96 (14 px, n=15-25) and 110->94 (16 px, n=58-68). Lean lasts 10-11 frames. The fire swirl appears 1-2 frames before the lean starts (outro n=1302).
- **confirmed**: Crouch during wind-up 7-10 px.
  - Hero height 71 -> 62-65 px in the outro (n=1309-1312). The top edge drops 12-14 px because the whole body also slides down and back about 5 px (base 532 -> 537).
- **corrected**: Release overshoot +11 to +20 px (before_vs_after says 11-12 px).
  - Left edge vs rest on the release frame: step 3 +14 (n=924, 86 vs 72), step 4 +14 (n=1033) and +20 to +22 (n=1101, 96), step 5 +15-16 (n=1204), +14 (n=1276), outro +14/+12/+13-15 (n=1314/1346/1377), split +12 (n=26) and +8-10 (n=69). Typical value +12-16 px single (0.27-0.35 enemy widths). Height +7% at n=1314 (76 vs 71). Steps 1 and 2 show 0 to +2 px.
- **corrected**: Settle 10-13 frames ease-out.
  - Most of the return happens in the first 4-5 frames. Full rest comes after 6-13 frames: outro 88,82,79,76,76,76,74 (6 frames); step 3 86,82,80,78,78,76,76,76,74...72 (13 frames); split 122,118,114,114,112,112,112,112,110 (8 frames).
- **confirmed**: Flight 11 frames release-to-contact.
  - Release -> contact: 484->494, 670->681, 924->935, 1033->1044, 1101->1113 (12), 1204->1215, 1276->1287, 1314->1325, 1346->1357, 1377->1388, 26->37. That is 10-12 frames, mostly 11.
- **corrected**: Squash on contact about 1.3x wide, 0.87x tall, top drops 15-18 px.
  - Body bbox without the rim: step 2 n=681 48x66 -> 62x60 (1.29x, 0.91x; top -13, base +7); outro n=1325 46x69 -> 60x62 (1.30x, 0.90x; top -14, base +7); split n=37 40x59 -> 47x50 (1.18x, 0.85x; top -13, base +4). Ranges: width 1.18-1.30x, height 0.85-0.91x, top drop 13-14 px.
- **confirmed**: Rebound overshoot 1.05-1.1x height, settles by about +10 frames.
  - Step 2 n=686-687: height 72-76 vs 66-70 rest, width 42 (0.88-0.91x). Outro n=1332-1333: height 74 vs 69, width 40. Step 3 n=939: height 74 vs 70. Back to rest at +7 to +13 frames.
- **corrected**: Exit-side needle streaks reach 43-53 px past the far edge (1-1.2 enemy widths) for 3-4 frames.
  - Bright pixels (luma>170) right of the enemy: step 3 x=460-463 at n=935-937 vs right edge about 419 (41-44 px); outro x=450-463 at n=1328-1330 (31-44 px); split x=431-437 at n=40-42 vs edge about 395 (36-42 px). That is 0.7-1.0 enemy widths for 3 frames. None at plain n=154-162, step 1 n=491-499 or step 2 n=679-687.
- **corrected**: Embers fade over 12-15 frames; scorch lingers about 15 frames.
  - Ember-pixel count after burst n=1290: 553 -> 115 by n=1300 (+10), about 20 by 1303-1309, 0 by 1314 (+24). Scorch (red-brown) count is about 100-120 px from n=1298 to 1309, then 92/63/53/31 and about 15 by 1315 (+25). The same happens after 1328 (scorch about 60-130 px until 1352). So the scorch lingers 20-25 frames, until the next shot.
- **corrected**: Outro shake: about +4 px right and +1 px down held through the freeze, then -3 px on the burst.
  - Hero-centroid offsets (the static body tracks the camera), held through the freeze: hit 1 (+4.0,+1.4), hit 2 (+4.0,-1.4), hit 3 (+2.9,-3.1). Burst frame: (-3.1,+1.9), (+0.9,-3.6), (-2.8,+2.8). Back to about 0 within 2-3 frames. Amplitude 3-4 px in a varying direction. Header and caption phase-correlation shift is 0.0 px, so it is a game-camera shake, not an edit shake.
- **corrected**: Damage-number arc: sideways 2.5-3 px/frame, apex +13-15 frames, rise 35-42 px, total sideways 44-52 px, life 22-25 frames, alternating L/R.
  - Glyph tracking: outro hit 1 x 393.6->339.2 (-54 px), apex n=1340 (+15), rise 43 px, life 23 frames; hit 2 +50 px, apex +15; hit 3 -63 px, apex +16; split 37 -54 px, apex +14; split 80 +53 px, apex +15. Vertical velocity -5.4 -> +2.6 px/frame (about 0.4 px/frame^2). Directions L,R,L / L,R / L,R,L confirmed. Sideways total widens to 44-63 px; apex range +13 to +16.
- **confirmed**: Number pops white about 33x24 and shrinks to about 22x15 within 3 frames; plain number 24x16, cream 1 frame then orange, rising 1.9 px/frame straight, x about 390, life about 21 frames.
  - Split n=37-39 34x24 white, then 29x22, 25x17, 21x15 at n=40-42. Step 2 n=681 32x24 -> 22x16 by n=683. Plain n=157 25x16 #E9DED7, n=159 orange #E9C187, cy 344->306.6 over 20 frames, cx 389.5-390.3, gone after n=177. The plain orange measures about #E9B468 rather than #D8AD6E.
- **confirmed**: Numbers in the plain version and steps 1-4 rise straight up.
  - Total x drift: step 2 (681) -0.9 px, step 3 (935) -1.7 px, step 4 (1113) +1.2 px with a 41 px rise; plain x constant 389.5-390.3.
- **corrected**: Step 4: 'HOLD IT!' over a 4-square counter above the number.
  - In frames 1044-1090 and 1113-1118 the 4 boxes sit below the number (number cy about 340, boxes at y about 360-375, between the number and the enemy), and 'HOLD IT!' is above the number. Boxes fill: 1 at n=1116 (partial at 1115), all 4 by 1118.
- **confirmed**: Step 4 hit 1 edit hold n=1045-1090 dimmed to about 60%.
  - Hero #E27F36 -> #884A23 at n=1070. The dim ramps in over n=1045-1060 and back out over n=1086-1090. Added: the next shot's fire swirl is already at the hero's hand on the held frame (n=1043-1044); the lean for hit 2 then runs n=1091-1100.
- **corrected**: During the edit-extended hold in step 4 the audio is muted.
  - The hit-1 boom starts at n=1041 (3 frames before contact 1044) and narration ('Freeze the game...') plays through the hold (all-band envelope 10-26 dB). The track drops to digital silence only from about n=1089 to 1098, so the burst at n=1091 is silent.
- **confirmed**: Audio lead of 2.5-3.5 frames on throw and impact; throw onsets 667.75/921.0/1099.0, impact onsets 678.25/931.5/1109.5.
  - 25-70 Hz and all-band envelopes: throws at 667.75-668.0, 920.75-921.0, 1098.75-1099.0 (releases 670, 924, 1101); impacts at 678.25-678.5, 931.75-932.0, 1109.5-1110.0 (contacts 681, 935, 1113); plain booms at 153.75-154, 194.25, 233.75-234, 273.75-274 (contacts 156...). Lead 2-3.25 frames. Throw-to-impact gap 10.5-11 frames.
- **unsupported**: The lead is likely due to the AAC stream starting at -0.161 s with an edit list.
  - The audio edit list skips 7106 samples (0.161 s) and the video has a 1024/15360 s (66.7 ms) composition offset. ffmpeg honours both, so decoded audio and video both start at 0 and the lead is in the presented media. Its cause (recorder latency or SFX fired on the logic frame before render) cannot be determined.
- **corrected**: Throw sound energy centred near 120 Hz (centroid 141-149 Hz); impact sub peak 43.7-46.4 Hz; impact about 8 dB louder.
  - 4-frame FFT windows: throw low peaks 126.5/130.2/132.2 Hz plus a partial at about 200 Hz; 90-180 Hz holds 33-43% and 180-500 Hz 33-43% of the energy; centroid about 207-217 Hz over 20-8000 Hz (method-dependent). Impact sub peak 47.4/48.4/49.8 Hz (44.7 Hz on a plain hit) plus a body at 117-122 Hz; 20-60 Hz holds 41-42%. RMS -22 vs -29 dBFS, so about 7 dB louder.
- **confirmed**: Sketch interstitials dim the scene to about 15%; edit pauses to about 60%.
  - Hero centre luma 135 -> 28-30 at n=370/530/725/980/1160 (about 12% above the background). Edit pause hero #E27F36 -> #9A5C2F (n=420), about 65%; step 2 #834721, about 56%.
- **corrected**: Step boundaries and sketch ranges (344-392, 513-560, 702-752, 953-1001, 1142-1180).
  - Dark (sketch) spans from hero-box luma: 343-391, 512-560, 698-757, 953-1002, 1133-1186. Steps 3 and 5 are slightly longer than stated. The step 5 header and captions fade over n=1300-1306, and the outro captions start at about n=1309 (43.6 s).
- **confirmed**: Caption strike-through at 7.1-7.3 s; 'DISNEY'S 1930s RULES!' types in at 9.1-9.5 s.
  - Red pixels in the caption band rise from n=209 (6.97 s) to a plateau by n=222 (7.4 s); yellow caption from n=273 (9.1 s) to a plateau by n=285 (9.5 s).
- **confirmed**: On-screen text verbatim (headers, sketch labels, demo labels, captions, outro).
  - Read in frames 392-476, 588-592, 748, 796-803, 996, 1044-1098, 1180, 1355, 1380-1419: 'IT STOPS...', 'THE TAIL KEEPS GOING!', 'HOLD...', '4 FRAMES!', 'NONE OF THIS LANDS UNLESS...', 'AN ARC!', 'NOT STRAIGHT...', 'NINETY YEARS OLD... STILL WORKS!', 'SEND THIS TO YOUR FRIENDS!' with a paper plane.
- **confirmed**: Narration verbatim matches TikTok ASR and the merged transcript.
  - The VTT cues and TRANSCRIPTS.md section 6 agree word for word (11.34-16.04, 16.90-22.24, 22.94-30.68, 31.42-36.44, 37.38-44.46 s). Not re-transcribed from the audio.
- **confirmed**: Plain version: no squash, no freeze, no exit streaks; steps 1-2 have no lunge; step 1 hit is plain.
  - Plain body bbox stays 44-48x66-70 through n=150-165. Step 1 n=473-478 46x72 unchanged; no static diffs at 156-160 or 473-476. Exit-streak count is 0 for plain, step 1 and step 2. Steps 1-2 release offsets are 0 to +2 px.
- **corrected**: Juicy shot costs about 13 more frames (about 430 ms) per attack.
  - True for intent-to-contact latency: fire appears at n=1302 and contact is at 1325 (23 frames) plus a 3-frame hold, vs plain spawn 143 -> contact 156 (13 frames). But the loop period is not longer: the outro juicy loop is 31-32 frames vs the single-view plain loop of 40, because the next wind-up starts about 8 frames after contact during the previous burst (fire at the hand by n=1333-1334).
- **corrected**: Readability principle: the target's white squash frame is the brightest and most saturated thing on screen.
  - The squash body is near-white (#F0E6FB, luma 235): the brightest but the least saturated thing on screen. The saturation contrast comes from the cool purple target against the warm gold/orange effects.
- **confirmed**: Fire gathering at the hand is about 56x50 px.
  - Luma>235 bbox: split n=20-22 57x39-40, n=18 51x58; outro n=1308-1312 49-63x54-68; step 1 n=398-400 49-50x49-52.
- **corrected**: Colour samples: hero #E27D37, enemy #7869D2, header #8FBFDF, RULES OFF #D86163.
  - Medians: hero #E77D2F to #EB812E, enemy rest #6D66CE (split) to #816CCE (single), header text #88C0E9, 'RULES OFF' #EF6B5F, background #0B101B (top/bottom) and #151A2E (mid), grid lines #23293C, step caption yellow #ECD77F, cyan #84B9DF. These are minor shifts; the families are the same.
