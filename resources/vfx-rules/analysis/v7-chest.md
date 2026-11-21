# Video 7: v7-chest-opening (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

Vertical TikTok, 576x1024, 30 fps, 27.63 s (829 frames). The audio is voiceover only: no music and no SFX, and the last ~1.1 s (from f797) is silent. Structure:
(a) 0.00-3.27 s: the copier's video is shown as a white phone card. Card text: "HOW TO: MAKE A CHEST FEEL EPIC!", "★ BONUS RARITY!", "♦ AND GOLD? LEGENDARY!". His flat-lit chest does have a short anticipation: it rocks for f8-16, squashes about 9% at f17-19, holds still for f19-24, then pops open in 1-2 frames (f25-26). The open brings a flat golden burst, a god-ray fan, a rising crown and coins spilling onto a plate. At f84 (2.8 s) the card flashes into a "BEFORE / AFTER / NOW" layout, then dissolves (f93-100); the BEFORE chest becomes the thumbnail card.
(b) 3.3-6.2 s: teaser of the finished juicy chest. The title "HOW TO: MAKE A CHEST JUICY!" types in, and a small thumbnail card above the chest replays the copier's clip (wobble f111-118, open f125). The 3D chest below runs the full juicy sequence: wobble f101-122, press f123-136, snap S=f137, 12 frames after the copier's open.
(c) Five numbered steps, each about 3-4 s: 1 WOBBLE 6.2-9.57, 2 PRESS 9.57-12.6, 3 SNAP 12.6-16.63, 4 LIGHT 16.63-20.37, 5 SPARKLES 20.37-24.0. The build is cumulative: every step replays the same closed-chest sequence from the start and adds one layer. Steps 1-2 still end in a plain lid open. Steps are joined by 8-9-frame cross-dissolves with a slight luma dip (f187-194, 287-295, 378-386, 499-507, 611-619, 719-727).
(d) Finale 24.2-25.9 s: the copier's clip in the thumbnail beside "SAME CHEST, WAY MORE JUICE!" (copier wobble f738-745, open f752). Then the full juicy open (snap at f764 = 25.467 s, again 12 frames after the copier's open).
(e) Outro from about 25.7 s: over f770-780 the 3D scene dims about 20-30% (background 21 -> 17, chest 82 -> 57 luma) while the header text stays at full brightness. Meanwhile "SEND THIS TO YOUR FRIENDS!" appears with a paper-plane icon that fills in. Stars keep popping and the rays keep glowing.

Camera: fixed, high three-quarter view looking down at one chest centred in frame, very close to Echoes' camera. It never moves except for the impact shake and zoom punch. Only the 3D scene shakes; the header UI does not.

Art: a stylised low-poly treasure chest on a dark navy void (#0E1629) with a light-blue wireframe floor grid (about #728BA2, brightest #85C2F4). The chest has orange wood (median about #9B5C3C, lit faces about #AD6B45), grey metal bands (about #5B565D), a padlock on a front hasp, and flat yellow coins (#FCD240) inside. At rest the closed chest is about 218-222 x 190-195 px, centred at about (291, 563), roughly 38% of the frame width. All px figures below are for the 576x1024 video, and "chest width" means about 220 px. In the teaser and finale the chest is smaller (about 190 px wide) and sits lower in the frame.

Text and UI: a hand-drawn light-blue font (about #84B5DD to #88C1EB). Each step header is a circled number plus a word under the title, and five progress dots sit at the bottom. Captions type on in sync with the speech: the first line is light blue, the punch line yellow (about #E6D88C), and the jab "BUT HIS CHEST HAS NO JUICE…" is salmon red (about #DC6D61).

## Before and after

PLAIN, as shown in the step 1-2 demos (lid open f236-246 and f337-347):
- In step 1 the wobble is followed by a 12-13-frame dead stop (f223/224-235, pixel-identical), so it does not lead into the open. In step 2 the press releases into the plain open.
- The lid swings open on a smooth ease-in-out over 11-12 frames (367-400 ms). The top edge rises 468 -> 374 px in per-frame steps of about 2, 4, 8, 12, 14, 12, 14, 10, 10, 4, 4 px, with no visible overshoot.
- The chest does not hop (bottom edge stays at 657-659), the padlock stays on the hasp, and the coins stay flat unlit yellow (#FCD240, 0 px above luma 230).
- No light, no particles, no camera motion, no freeze, no sound.

The copier's version (intro card and thumbnail) is not anticipation-free:
- It rocks for about 9 frames (f8-16, about ±2° screen roll), squashes to about 0.91 height x 1.06 width over 3 frames (f17-19), holds 6 frames, then pops open in 1-2 frames with a flat light burst, ray fan, crown and coins. That is about 0.57 s of anticipation in all.
- What it lacks: a long escalating wind-up, a tremble, a hop, a hitstop (it keeps moving after the open), any camera reaction, a loose part, contained internal light, and particles with their own later beats.

JUICY, measured in steps 3-5, the teaser and the finale, with S = the first frame of the release:
- About 1.2-1.4 s of anticipation: a wobble of about 22-26 frames whose period shrinks from about 280-300 ms to about 200-230 ms, then a press of 14-15 frames. The press squashes the chest to about 0.92 height x 1.06-1.07 width, with a living-outline tremble.
- The release is instant. The chest un-squashes in 1 frame and the lid is open in 2-3 frames (67-100 ms, about 4-5x faster than plain).
- The chest hops about 16-20 px (7-9% of chest width) and lands at S+11.
- The padlock flips off the hasp at S, hangs in the air through the freeze, tumbles down the front, hits the floor at about S+31 and settles by about S+35. It stays on the floor in front of the chest, slightly right of centre.
- A 4-frame freeze (about 133 ms) on S+4 to S+7 at the top of the hop; the lid, body, padlock, light sheet and stars all hold.
- Camera reaction from S+5 (the second frozen frame): a first kick of about 3 px, then about ±1.5-2 px of alternating jitter until S+10, plus a zoom punch peaking at about 1.8-1.9% at S+6/S+7. The zoom decays smoothly to 0.5% by S+14 and is gone by about S+25.
- From step 4: a thin cream rim light-line at S (1.0x chest width) becomes a translucent cream light sheet. The sheet grows to about 1.55-1.6x chest width by S+5 and is gone at S+11. The coins turn emissive, and soft light shafts rise from the coins and keep shimmering for over 2 s.
- From step 5: 8 stars burst out and rise about 145 px with ease-out, then hang in an arc. They pop one by one between S+26 and S+46: each swells to about 2x, whitens, flips to a hollow outline, fades and vanishes, throwing tiny sparks.

The plain open lacks every one of these: anticipation, timing contrast, hitstop, camera reaction, secondary object motion, internal light and lingering particles.

## Step 1: Wobble

**Narration.** "Step 1, wobble. Rock it side to side, faster and faster." (TikTok captions 5.22-9.58, which also include "Let me show you how."; no mishearing.)

**On screen.** Header: "① WOBBLE!"; captions: "ROCK IT SIDE TO SIDE…" (light blue) then "FASTER AND FASTER!" (yellow).

**What you see.**

Progress dot 1 is lit and the closed chest sits on the grid. Frames 196-222 (6.53-7.40 s): the chest rocks side to side by rolling onto one bottom edge and then the other; it does not spin in place.
- Leaning right (f207, f215): the left bottom corner lifts about 10-12 px and the right top corner rises.
- Leaning left (f203, f211, f218): the left top corner rises about 10 px and the right base lifts about 6 px.
- The centroid swings about ±1.7 px in x and lifts 3-5 px at each extreme.
- There are seven extremes (about 3.5 cycles). The swings shorten slightly: full periods of about 8.5, 8, 7.5 and 7 frames, then a final 3-frame half-swing.
- The amplitude stays roughly constant and drops only on the last half-swing (f221) before rest.

In step 1 only, the chest then stands perfectly still for 12-13 frames (f223/224-235, pixel-identical). It then opens the plain way at f236-246 (smooth ease-in-out, no hop, padlock stays on, no light) and holds open until the dissolve at f287. In steps 2-5 the same wobble (f297-321, 388-411, 508-533, 620-645) flows straight into the press with no pause.

**Measurements.**

- **wobble duration**: step 1: 26 frames (f196-222) = 867 ms; steps 3-5: about 22-25 frames (733-833 ms) before the press (frames 196-222, 388-411, 508-533, 620-645; confidence high)
  - Method: whole-chest mask centroid per frame (python)
- **swing extremes and acceleration**: Step 1 centroid-x extremes at f197-199 (+0.2), 203 (-1.7), 207 (+1.5), 211 (-1.8), 215 (+1.4), 218 (-1.9), 221 (+0.7) px from rest 290.9. Full periods about 8.5, 8, 7.5, 7 frames (about 280 -> 230 ms), with a last half-swing of 3 frames. Step 4 half-periods 5, 4, 4, 4, 3 frames. The acceleration is real but mild. (frames 196-222, 508-534; confidence medium)
  - Method: whole-chest mask centroid tracking at full resolution
- **wobble amplitude**: The lifted bottom corner rises about 6-12 px (3-5% of chest width) and the top corners rise 10-18 px at fixed columns. That is about 2-2.5° of screen-space roll (the true 3D roll is probably larger). Centroid x ±1.7-1.9 px; centroid lift 3-5 px at the extremes. Rocking right lifts the left side more than rocking left lifts the right. (frames 203, 207, 211, 215, 218; confidence medium)
  - Method: per-column top and bottom edges compared to the rest frame f230
- **still pause before the plain open (step 1 only)**: 12-13 frames = 400-433 ms (frames 223-235; confidence high)
  - Method: frame diff 0.0-0.1, identical centroid and bbox
- **plain lid open (baseline)**: 11-12 frames = 367-400 ms, ease-in-out. Top edge 468 -> 374 px in steps of about 2, 4, 8, 12, 14, 12, 14, 10, 10, 4, 4 px; settles with no visible overshoot; no hop (frames 235-248, 336-348; confidence high)
  - Method: chest-mask top and bottom edge per frame

**Colours.** #9B5C3C chest wood (median; lit faces about #AD6B45); #5B565D metal bands / padlock; #FCD240 coins, unlit (plain); #0E1629 background navy; #728BA2 floor grid lines (median; brightest about #85C2F4); #84B5DD first caption line (header about #88C1EB); #E6D88C yellow punch-line caption

**Rule.** Before a reward opens, rock it on alternating bottom edges for about 0.7-0.9 s, lifting the far corner only about 3-5% of its width (about 2-2.5° on screen). Let each swing come a little sooner (period about 280-300 ms down to about 200-230 ms), so the object visibly fights to open before anything happens.

## Step 2: Press

**Narration.** "Step 2, press. Squash it down and let it tremble." (TikTok captions 9.58-12.56; correct as captioned.)

**On screen.** Header: "② PRESS!"; captions: "SQUASH IT DOWN…" (light blue) then "AND LET IT TREMBLE!" (yellow).

**What you see.**

The step replays the wobble (f297-321). Straight out of the last swing, the chest squashes down from f322: the top edge sinks and the sides bulge outward with an ease-out, reaching about 90% in 8 frames and then creeping a final 2 px until the release. The bottom edge spreads about 4 px lower in screen space as the base widens. While held, the silhouette is never fully still: the frame-difference outline flickers around the edge, but no rigid jitter of 0.5 px or more is measurable at 30 fps. At f336 the chest pops back to full height in one frame. In step 2 the lid still opens the plain way (f337-347, 11-12 frames), so this step isolates the press. The same press appears before every later snap (f412-426, 534-547, 646-659, teaser 123-136, finale 750-763).

**Measurements.**

- **squash depth**: Top edge 468 -> 486-488 px (18-20 px down); bottom 657 -> 661. Height about 190 -> 174-176 px = 0.92-0.93; width about 217 -> 230-232 px = 1.06-1.07. Volume roughly kept. Teaser and finale (smaller chest): top 544 -> 558-560. (frames 322-335, 412-426, 534-547, 123-136, 750-763; confidence high)
  - Method: chest-mask bounding box
- **press timing**: attack about 8 frames (267 ms) to about 90% depth with ease-out (about 2 px/frame, decreasing), then a 6-frame creep or hold. Total 14-15 frames = 467-500 ms (frames 322-335, 412-426; confidence high)
  - Method: top-edge y per frame
- **tremble amplitude**: 1 px or less (0.5% of chest width or less): sub-pixel rigid shifts, a slow 2 px creep, and an edge that changes every frame (diff_bot 0.1-0.2) (frames 331-335, 420-426, 541-547, 653-659; confidence low)
  - Method: subpixel phase correlation and amplified frame-difference images (taken from the first analysis; not re-measured beyond the bbox creep)
- **release of the squash**: 1 frame (33 ms) back to full height (frames 335-336, 426-427; confidence high)
  - Method: bbox top 488 -> 470 (step 2), 488 -> 448 with the lid already opening (step 3)

**Colours.** #9B5C3C wood; #5B565D metal; #FCD240 coins (still unlit)

**Rule.** After the wobble, compress the object for about 0.5 s (about 8% shorter, about 6-7% wider, volume kept) with a fast ease-out attack, keep it alive with a 1 px or smaller tremble, then let it go in a single frame.

## Step 3: Snap

**Narration.** "Step 3, snap. It springs back, slams the lid, and the game freezes for a beat." (TikTok captions 12.58-16.58, correct; the on-screen text drops "the game". The caption reads "IT SPRIN" on the release frame, so the word "springs" lands on the spring.)

**On screen.** Header: "③ SNAP!"; captions: "IT SPRINGS BACK, SLAMS THE LID…" (light blue) then "AND FREEZES FOR A BEAT!" (yellow).

**What you see.**

Wobble at f388-411, then the press at f412-426. S = f427 (14.233 s):
- S: the chest has un-squashed and already starts to rise (bottom edges up 4-10 px). The lid is half open and the padlock flips upward off the hasp.
- S+1 (f428): the lid is nearly open (top edge 376) and the chest is about 10 px off the floor.
- S+2 to S+3 (f429-430): the lid is fully open (silhouette about 8 px taller than its final open pose) and the chest reaches the top of its hop. The bottom edge rises 16 px above rest (18-20 px above the squashed pose), more on the far left. The body is 2-4 px narrower than at rest.
- S+4 to S+7 (f431-434): FREEZE. Lid, body and padlock (in mid-air above the front) hold the same pose; motion-compensated lid diffs are 2.0/2.4/1.8, against 5.1 before and 10.1 after. The camera starts to move on S+5 (f432), the second frozen frame.
- S+8 to S+10 (f435-437): time resumes and the chest drops; it lands at S+11 (f438). The silhouette dips about 4 px below its final open height at S+10/S+11 and recovers by S+13: a small settle.
- The camera jitter ends by about S+10, and the zoom punch decays until about S+18-25.
- The padlock tumbles down the front (f439-457), hits the floor at about S+31 (f458) and settles by about S+35 (f462). It lies in front of the chest, slightly right of centre and partly under the caption, for the rest of the clip.
There is no light and no particle in this step, and the coins stay flat. The same snap, freeze and shake timing recurs in the teaser (S=137), step 4 (S=548), step 5 (S=660) and the finale (S=764).

**Measurements.**

- **lid open time (juicy)**: 2-3 frames = 67-100 ms from closed to open (top edge 488 -> 448 -> 376 -> 346), against 11-12 frames (367-400 ms) plain: about 4-5x faster (frames 426-429 vs 235-246; confidence high)
  - Method: top edge per frame and visual frame read
- **hop height and airtime**: Bounding-box bottom 657 (rest) / 659-661 (squashed) -> 641 at the apex: about 16 px above rest and 18-20 px above the squash (7-9% of chest width). Per-column rises are 18-20 px on the right half and 24-28 px on the far left, so the chest tips slightly. Airborne S..S+10 including the freeze; lands S+11 in steps 3, 4 and 5. (frames 424-439, 545-561, 657-673; confidence high)
  - Method: lowest chest-mask pixel in 9 columns per frame
- **stretch on release**: width 2-4 px (1-2%) narrower than rest at S+2/S+3 (right edge 395 vs 397-399 rest and 405-407 squashed); at S+1 it is the same as rest. Height stretch cannot be separated from the opening lid. (frames 428-431; confidence medium)
  - Method: bbox right edge
- **freeze (hitstop)**: 4 displayed frames S+4..S+7 = about 133 ms in steps 3, 4 and 5 (f431-434, 552-555, 664-667); 3-4 frames in the teaser (f141-143/144) and finale (f768-770/771). Probably about 0.12-0.15 s in a 60 fps game. The stars and light sheet freeze too. (frames 430-435, 551-556, 663-668, 140-145, 767-772; confidence medium)
  - Method: motion-compensated diffs (best shift ±6 px x scale 0.98-1.02) on a lid-only region and the whole chest
- **camera shake / punch**: Starts at S+5 in every instance (f432, 553, 665; teaser f142, finale f769). The zoom pulse comes from the separation of left and right floor patches 446 px apart: about 1.35% (S+5), 1.9% (S+6), 1.8-1.9% (S+7), 1.5% (S+8), 1.3% (S+9), 1.0% (S+10), 0.8% (S+12), 0.5% (S+14), about 0.2% (S+18-22), 0 by about S+25. Translation: about -3 px x kick at S+5, then about +0.8, +1.5-1.8, -1.2 to -1.75, +0.5 to +1.5 px, flat by S+10 (about 1.4% of chest width at peak); y jitter about ±2 px; floor patches at the frame edges move up to 5-6 px. The step 4 and 5 curves are identical to 0.5 px (canned). There is no persistent zoom afterwards. The header UI does not shake. (frames 426-450, 547-575, 659-690; confidence medium)
  - Method: 2x-upsampled exhaustive block matching of 4 floor-grid patches (frame corners, avoiding chest and captions) and 2 header patches against the pre-release frame, fitted to scale about the frame centre plus translation
- **padlock flight**: Flips off the hasp at S, holds in mid-air during the freeze, tumbles down the front (S+12..S+30), hits the floor at about S+31 (f458) and settles by about S+35 (f462, about 1.17 s). It rests in front of the chest slightly right of centre (about x 280-380, y 700-740) and stays there. Steps 4-5 are the same (on the floor by about f580). In the finale it lands at about S+32-34 and slides to rest by about S+46 at about (327, 740). (frames 427-467, 575-600, 780-828; confidence medium)
  - Method: zoomed frame strips and a grey-blob centroid in the finale

**Colours.** #9B5C3C wood; #5B565D metal / padlock; #FCD240 coins (unlit in step 3)

**Rule.** Release the anticipation as a 2-3-frame pop with a small hop of about 8% of the object's width. Freeze everything, including any flying part, for about 4 frames (about 130 ms) at the apex. Start the camera punch and shake on the second frozen frame, with the jitter done after about 6 frames and the zoom decaying for about 0.5-0.7 s. Let a loose part (here the padlock) fly off and stay on the floor.

## Step 4: Light

**Narration.** "Step 4, light. A glow from deep inside with slow turning rays." (TikTok captions 16.58-20.44, correct.)

**On screen.** Header: "④ LIGHT!"; captions: "A GLOW FROM DEEP INSIDE…" (light blue) then "WITH SLOW TURNING RAYS!" (yellow).

**What you see.**

Same wobble, press and snap (S = f548, 18.267 s).
- S: as the lid cracks, a thin bright cream line (about #FCE4B7) traces the rim and seam of the chest, as if light is escaping through the gap. It is about 1.0x the chest width (x 179-396).
- S+1 to S+5: that outline becomes a flat, horizontal, semi-transparent warm-cream rounded-rectangle light sheet lying at rim height around the open chest. It expands with an ease-out (about 1.19x, 1.35x, 1.46x, 1.55x, 1.58x chest width) and has a brighter edge. The chest front shows through it, whitened.
- S+4 to S+7: the sheet holds during the freeze (plus the camera zoom) at about 1.6x.
- S+8 to S+10: it fades and breaks up from its edges, and is gone at S+11 (f559).
- The coins become emissive: a bright, blooming yellow-white hot core inside the chest, where the plain coins were flat yellow.
- From about S+4/S+5: several soft, tapered, semi-transparent white-yellow light shafts fan upward from the coins. They are most visible on the right and back, where the open lid does not cover them. They change quickly for the first second (ray-region diff 1.2-2.3 per frame) and then slowly (about 0.3-0.4 per frame), still shimmering at the dissolve more than 2 s later.

**Measurements.**

- **rim flash**: 1 frame at S: a thin outline about 1.0x chest width (x 179-396, 919 px above luma 200), median #FCE4B7 (frames 548, 660, 764, 137; confidence high)
  - Method: luma threshold and frame read
- **light sheet size and life**: width 262 -> 296 -> 321 -> 340 -> 347 px (about 1.19x -> 1.58x chest width) over S+1 to S+5; about 352-360 px (1.6x, partly the camera zoom) through S+8; fades S+8 to S+10; gone at S+11. Life about 10 frames = about 333 ms (frames 549-559; confidence high)
  - Method: chest+sheet mask horizontal extent per frame
- **light sheet opacity**: interior over navy reads about #6F6651 (luma about 85-118 vs about 23 background), roughly 35-40% of a cream colour; bright rim up to luma about 140-153 (frames 552; confidence medium)
  - Method: pixel sampling and row luminance profiles
- **interior glow**: coins go from 0 px above luma 230 (plain, f275 and f480) to 163-209 px (f590-600, bright mean #FFF589) and 504 px in step 5 (f700, peak #FFFFFF) (frames 275, 480, 590, 600, 700; confidence high)
  - Method: pixel counts in the chest-mouth region
- **rays**: About 3-5 shafts, roughly 90-110 px long (about 0.45 chest width) and 10-15 px wide. They start about S+4/S+5 and last at least 2 s. Their motion is visible but slow: ray-region diff about 0.3-0.4 per frame after S+27, 4.5 over 30 frames. Count, length and drift speed are rough. (frames 552-612; confidence low)
  - Method: frame read and ray-region frame differences

**Colours.** #FCE4B7 rim light-line at the moment of opening; #6F6651 light sheet over navy (translucent cream); #FFF589 average bright glow of the emissive coins; #FFFFFF brightest glow pixels (step 5)

**Rule.** Make the reward's own contents the light source. Leak a rim line on the opening frame, flash a translucent light sheet that grows to about 1.5-1.6x the object's width and is gone in about 0.33 s, then keep a few soft, slowly shimmering rays and an emissive core alive for seconds afterwards.

## Step 5: Sparkles

**Narration.** "Step 5, sparkles. Stars that pop and sparks that keep rising." (TikTok captions 20.58-23.94, correct. The release f660-661 falls in a silent gap between "sparkles" and "stars".)

**On screen.** Header: "⑤ SPARKLES!"; captions: "STARS THAT POP…" (light blue) then "AND SPARKS THAT KEEP RISING!" (yellow).

**What you see.**

Full sequence again with the light layer (S = f660, 22.000 s).
- S: rim flash with the lid just cracked. S+1: the light sheet appears, the lid is half open and a few tiny glints show at the rim.
- S+2 to S+4: a tight cluster of 8 chunky five-pointed stars bursts up out of the chest mouth, slightly right of centre. Over S+4 to S+6 it is one bright blob about 102-114 x 44-54 px.
- S+4 to S+7: the cluster is frozen with everything else by the hitstop.
- The stars separate and keep rising with a strong ease-out, then hang in an arc about one chest width across (centroids x 181-399 px, y 346-415 px), about 0.6-0.8 s after S.
- From S+26 (f686) the stars pop one at a time in no fixed left-to-right order; the last vanishes at S+46/47 (f706-707). Each one swells to about 2x and turns near-white with a big glow over 3-4 frames, flips to a hollow outline star for 1-2 frames, dims and vanishes, throwing a little scatter of tiny spark dots.
- About 10-40 tiny sparks twinkle at once during the pop phase, drifting upward.
- By f707 all stars are gone. The rays, glow and a few sparks keep changing through f709-718 (it is not a frozen frame) until the dissolve at f719.

**Measurements.**

- **star count**: 8 stars (frames 677-684; confidence high)
  - Method: connected-component blob count, luma > 200, area 20 px or more, once separated
- **star size**: 19-36 px across at rest (0.09-0.16 chest width); swell to about 45-58 px (about 2x) when popping (frames 677-706; confidence high)
  - Method: blob bounding boxes
- **star rise**: Top star: y about 401 at S+10, 382 at S+13, 353 at S+19, 346 at S+24, from about y 490 at the mouth: about 145 px in total (0.65 chest width). About 6-8 px/frame at S+10 to S+13, decaying to about 1 px/frame by S+20 (ease-out). Final arc centroids x 181-399 px, y 346-415 px. (frames 662-684; confidence high)
  - Method: blob centroid tracking
- **pop timing**: pops staggered from S+26 to S+46 (f686-706, about 0.67 s). Each pop: swell and whiten 3-4 frames (100-133 ms), hollow outline 1-2 frames, gone. Star lifetime from burst about 26-46 frames (0.87-1.5 s). (frames 684-707; confidence high)
  - Method: blob size per frame and zoomed frame read
- **sparks**: tiny dots 3-8 px (0.01-0.04 chest width); 7-21 on screen before the pops and 9-43 during them (peak about 43 at f695), each blinking for about 1-3 frames (frames 660-712; confidence medium)
  - Method: small-blob count (area 2-20 px, luma > 200)
- **spark rise speed**: upward drift is visible (also in the teaser f164-180), but the sparks flicker too fast to track individually (frames 164-180, 685-706; confidence low)
  - Method: frame read

**Colours.** #FFFBC5 star fill core; #FFF9B8 star body; #63594C star halo over navy (warm, soft); #FEF9EC popping star, whitened; #FFFFFF spark dots (near-white)

**Rule.** Burst a handful (about 8) of big, readable reward shapes out of the source on the release, and freeze them with the hitstop. Then ease them up about 0.65 object widths into a hanging arc and pop them one by one over about 0.7 s, starting about 0.85 s after the release. Each pop swells to 2x and whitens, shows a hollow outline for a frame or two and throws tiny sparks, so the reward keeps firing after the impact.

## The kill or finisher

This video has no kill. The finisher is the payoff open, shown complete in the teaser (S = f137, 4.567 s), step 5 and the finale.

Finale reveal (24.2-25.9 s):
- Caption "SAME CHEST." then "SAME CHEST, WAY MORE JUICE!". A small card above replays the copier's clip: it wobbles at f738-745 and opens flat at f752 (25.07 s), then the card fades out over f765-773.
- The 3D chest below wobbles (f727-749, centroid x 288.1-290.7 px), then presses (f750-763: top edge 544 -> 560).
- It snaps open at f764 (25.467 s), 12 frames after the copier's open (the teaser uses the same 12-frame offset: f125 vs f137), so the two read back to back.
- Frame by frame from S: S rim flash, then the light sheet and star cluster at S+1 to S+4. The pose freezes on about S+4 to S+6/S+7 (f768-770/771). The camera kicks and zooms from S+5 (f769), then the stars rise and pop.
- The padlock hits the floor at about f796-798 and slides to rest by about f810 in front of the chest, right of centre.
- Over f770-780 (25.67-26.0 s) the 3D scene dims about 20-30% while the header stays bright, under "SEND THIS TO YOUR FRIENDS!" and a paper-plane icon that fills in. Stars keep popping and the rays keep glowing. The audio ends at about 26.5 s.

The canonical juicy timeline, identical in steps 3-5, teaser and finale, relative to the release frame S:
- Anticipation: wobble about 22-25 frames (733-833 ms), then a press of 14-15 frames (467-500 ms).
- S: un-squash in 1 frame, lid half open, padlock flips off, rim light-line (from step 4).
- S+1 to S+3: lid fully open, hop to about 16-20 px, light sheet expanding, stars bursting.
- S+4 to S+7: 4-frame freeze at the apex (lid, body, padlock, sheet and stars all hold).
- S+5: camera kick (about 3 px) and the zoom punch begins.
- S+5 to S+10: jitter of ±1.5-2 px; zoom peaks at about 1.8-1.9% at S+6/S+7.
- S+8 to S+11: the chest drops and lands; the light sheet is gone at S+11.
- S+14: zoom down to about 0.5%. About S+25: zoom gone.
- S+26 to S+46: stars pop one by one.
- About S+31 to S+35: the padlock hits the floor and settles.
- Rays and glow persist more than 2 s.

## Sound

The soundtrack is voiceover only: no music bed and no sound effects at any beat.

Evidence:
- Every gap between phrases drops to -87 to -93 dBFS per video frame (for example f45-47, f94-98, f182-186, f310-314, f416-419), so no music runs under the speech.
- Step 5 release (S = f660-661, 22.000-22.067 s): -91 and -88 dBFS.
- Finale freeze (f768, S+4, 25.600 s): -92 dBFS.
- The step 2 wobble gap (f310-314): -91 to -93 dBFS.
- The step 3 press gap (f416-419, 13.87-13.97 s): -90 to -92 dBFS.
- Loudest speech frames peak at about -17 dBFS (f511).
- The high-frequency burst at f662-665 (step 5, S+2 to S+5) is speech, not a sparkle SFX: its centroid is about 6 kHz, its spectral flatness 0.09-0.18 and its peaks 5.0-5.7 kHz, the same as the /s/ in 'juice' (f762-763) and 'send' (f770). It is the start of 'stars'.
- At the other releases (S=137, 427, 548) the band energies follow the ongoing words, with no low-frequency thump.
- From f797 (26.57 s) to the end the track is digitally silent; the audio stream ends at 27.58 s.

Therefore audio-peak-to-impact alignment and pitch variation between repeats cannot be measured: there are no SFX to measure.

Narration rhythm:
- Each step's word ("wobble", "press", "snap", "light", "sparkles") is spoken as the step header types in, and the captions type on word by word in sync with the speech.
- In step 3 the word "springs" lands on the release frame (caption "IT SPRIN" at f427).
- In step 5 the release falls in a silent gap between "sparkles" and "stars".

## Principles

- Anticipation before payoff: 1.2-1.4 s of wobble and press, then a 67-100 ms release. The slow wind-up against the instant release is a ratio of about 12-20:1. The copier's 0.57 s wind-up shows that a token wobble is not enough.
- Anticipation should escalate. The wobble's swings come slightly sooner each time (about 280-300 ms down to about 200-230 ms) and lead straight into the press, so tension rises continuously into the release.
- Squash before stretch, with volume kept: about 0.92 x 1.06-1.07 at the press, then a 1-frame un-squash, a slightly narrower pose and a hop of about 8% of the object's width.
- Put the hitstop at the apex of the action (lid flung open, chest at the top of its hop, padlock in mid-air), not at the start. Hold it about 4 frames (about 130 ms) and freeze every element, particles included.
- Start the camera reaction on the second frame of the freeze. Use a short translation kick (about 3 px, then ±1.5-2 px for about 6 frames) plus a zoom-in pulse peaking at about 1.8-1.9% that decays over about 0.5-0.7 s. Leave the UI out of the shake. One canned curve reused on every open is fine.
- Layer in this order and add one layer at a time on an identical sequence: motion (wobble, press, snap), then time (freeze), then light (rim flash, sheet, rays, emissive core), then particles (stars, sparks).
- Pair fast-in/slow-out lifetimes. Use one-shot elements for the moment (rim line on frame S, light sheet gone by S+11) plus persistent slow ones (rays and glow lasting over 2 s, stars popping 0.85-1.5 s later). The reward keeps firing after the impact instead of ending on it.
- Light should come from inside the object: the contents become emissive and the rays start there, rather than a flat sprite pasted on top.
- Stagger particle deaths. Stars pop one at a time in no fixed order over about 0.7 s, each with its own mini-beat (swell to 2x, whiten, hollow outline, tiny spark scatter).
- Secondary motion that persists: the padlock flips off, hangs through the freeze, tumbles and stays on the floor as evidence that something happened.
- Contrast and readability: a dark navy scene with warm cream and gold light. The reward palette is warm, desaturated cream (no reds). The big shapes (8 stars of 0.09-0.16 object width, a sheet about 1.6x object width) read at a glance from a high three-quarter camera.
- The juice is in timing and layering, not the asset: the same chest model reads as plain or juicy purely through animation timing and added FX ("SAME CHEST, WAY MORE JUICE!").
- Transfer note for Echoes: this demo has no sound at all, so it teaches nothing about audio. Echoes' 'a beat' rule (every rule shows a visual and plays a sound) means each layer here (snap, freeze, light, star pops) still needs its own SFX designed separately. The warm cream and gold reward light fits the colour rules, since it uses none of Ember, Bright Heal or Violet.

## Extra tips

- "HE COPIED MY FORMAT…" / "AND BLOCKED ME!" (0.7-3.2 s, over the copier's card). Narration: "This guy copied my format and then blocked me so I wouldn't see it."
- The copier's card text, verbatim: "HOW TO: MAKE A CHEST FEEL EPIC!", "★ BONUS RARITY!", "♦ AND GOLD? LEGENDARY!", then "BEFORE" / "AFTER" / "NOW". His chest does wobble (about 0.3 s) and squash (about 9%) before a 1-2-frame pop with a flat light burst, crown and coins. But it has no hitstop, no camera reaction, no hop or loose part, and only about 0.57 s of total anticipation.
- "IT'S COOL…" (light blue, 3.4-4.0 s) then "BUT HIS CHEST HAS NO JUICE…" (salmon red, about #DC6D61, 4.0-5.5 s), over the teaser of the finished juicy chest. Even with a wobble, a squash, light, a crown and coins, the copier's open is not juice: it is missing the long escalating wind-up, the freeze, the camera punch, the secondary motion and the delayed particle beats.
- "LET ME SHOW YOU!" (yellow, 5.6-6.3 s). Narration (auto-caption): "Let me show you how."
- "SAME CHEST, WAY MORE JUICE!" (24.3-25.9 s): the copier's clip plays in a thumbnail card and opens 12 frames before the same 3D chest opens with all five layers. Same asset; the difference is only timing and FX.
- "SEND THIS TO YOUR FRIENDS!" (from about 25.7 s) with a paper-plane icon over the still-sparkling chest while the scene dims.
- The step 1 and 2 demos deliberately end in the plain 11-12-frame lid open, so each technique is seen on its own before the snap replaces the open in step 3.

## Uncertain

- The tremble: no rigid jitter of 0.5 px or more is measurable at 30 fps. The silhouette edge changes every frame by up to about 1 px, with a slow 2 px creep, during the press hold. The true tremble frequency and amplitude in the 60 fps game are unknown.
- Freeze length is ±1 frame. With lid-only motion compensation, steps 3-5 hold 4 frames (S+4..S+7); the teaser and finale read 3-4 frames because the chest is smaller and the measurement noisier. Residual diffs of 2-3 remain after compensation because the camera zoom also moves during the hold.
- Camera shake decomposition (zoom peak about 1.8-1.9%, translation kick about 3 px, then ±1.5-2 px) comes from block matching four floor-grid patches at 0.5 px resolution. The floor is a 3D plane, so the shake is fitted as a 2D zoom plus translation, and horizontal and vertical zoom estimates differ (about 1.8% vs about 1.3%). The first analysis's 2.2% peak and 3.6 px translation are within this method spread; its 'about 1% zoom persisting in steps 4-5' did not reproduce.
- Wobble angles are screen-space estimates (about 2-2.5° from the lifted corner); the true 3D roll of the model is likely larger because of foreshortening.
- Lid overshoot: the silhouette is about 8 px taller at S+2/S+3 than in the final open pose and about 4 px shorter at S+10/S+11. That shows a settle, but I cannot tell whether the lid swings past its rest angle or the body stretches.
- Ray motion: the rays clearly change for about 1 s, then shimmer slowly (diff about 0.3-0.4 per frame) until the dissolve. The count (3-5) and the drift speed (about 1 px/frame) are rough, because the lid hides some rays.
- Spark rise speed and exact spark lifetime could not be tracked: sparks blink for 1-3 frames.
- The stretch height on release cannot be separated from the opening lid; only the about 1-2% narrowing at S+2/S+3 and the 16-20 px hop are measured.
- The game was probably running at 60 fps and recorded at 30 fps, so all frame timings are ±33 ms.
- 'Slams the lid' is read as the lid flung open hard; the lid is never slammed shut in any demo.
- The spoken line "Let me show you how" (TikTok captions) differs from the on-screen "LET ME SHOW YOU!"; I could not listen to resolve it, so the auto-caption wording is kept.
- Light sheet opacity (about 35-40%) is estimated from composited pixel samples, assuming a cream source colour.
- Copier chest wobble angle (about ±2°) is a second-moment estimate on a half-resolution mask inside the card and is approximate.

## Verify verdicts

- **corrected**: The copier's chest (intro card) opens instantly with no wobble, press, snap, freeze or shake
  - Copier chest silhouette (half-res mask) is still f0-7, then rocks f8-16: second-moment angle alternates 10.6 -> 12.4 (f12) -> 9.1 (f13) -> 13.4 (f14) -> 9.1 (f15) -> 11.8 (f16) deg, centroid x swings ±1.5 px. It then squashes f17-19 (top 196 -> 202 half-px, height 57 -> 52 = 0.91, width 64 -> 68 = 1.06) and holds still f19-24 (6 frames, diff 0.05-0.08), then pops open in 1-2 frames (f25 half open, f26 open). The same wobble shows in the thumbnail replays (f111-118, open f125; f738-745, open f752). It has no freeze (chest-region diffs stay 2-4 after f25), no camera move (card edges diff 0.00) and no loose part. Total anticipation is about 17 frames (0.57 s), against 1.2-1.4 s in the juicy version.
- **confirmed**: Audio is voiceover only: no music and no SFX at any beat
  - Per-frame RMS of the decoded track: every gap between phrases falls to -87 to -93 dBFS, so there is no music bed. Step 5 release f660-661 reads -91/-88. Finale f768 (S+4) reads -92. The high-frequency burst at f662-665 (centroid about 6 kHz, flatness 0.09-0.18, peaks 5.0-5.7 kHz) matches the /s/ of 'juice' (f762-763) and 'send' (f770), so it is the /s/ of 'stars', not a sparkle SFX.
- **corrected**: Pauses during the step 2 wobble are at -60 dBFS
  - f310-314 (step 2 wobble) read -93, -93, -91, -91, -91 dBFS: digital silence, not -60.
- **confirmed**: Pauses during the step 3 press (13.87-13.97 s) at -91 dBFS; loudest speech about -17 dBFS
  - f416-419 read -91, -92, -91, -90 dBFS; maximum frame f511 reads -17 dBFS.
- **added**: (added) The outro's last ~1.1 s has no audio
  - From f797 (26.57 s) to the end the RMS is -180 dBFS (zero samples); the audio stream ends at 27.58 s.
- **confirmed**: Step boundaries and cross-dissolves at f187-194, 287-295, 378-386, 499-507, 611-619, 719-727; card dissolve f93-100
  - metrics.csv diff_all rises to 1.4-4.5 exactly in those ranges, with the luma dipping 2-4 levels; the frame strips f152-199 show the open teaser chest cross-fading into the closed step-1 chest while '① WOBBLE!' types in at f191-196. The card's white flash to BEFORE/AFTER/NOW is at f84.
- **confirmed**: Closed chest at rest 222x195 px centred at (290,562)
  - My mask ((b-r)<12 and luma>30) gives x 182-399, y 468-657 = 218x190, centroid (290.9, 563.4) at f225-235; the analysis's slightly larger box is a threshold difference (it may include the handle). Teaser chest f105: 190x170 (about 0.86x).
- **confirmed**: Step 1 wobble f196-222, 3.5 cycles, then 13 identical frames f223-235
  - Centroid x extremes: 291.1 (f197-199), 289.2 (f203), 292.4 (f207), 289.1 (f211), 292.3 (f215), 289.0 (f218), 291.6 (f221) = 7 extremes. Centroid is constant (290.9, 563.4) from f225 to f235; metrics diff 0.0-0.1 for f224-235.
- **corrected**: Wobble amplitude: roll ±1.5-1.75 deg, top corners ±5 px, body lift 2-4 px; amplitude grows then decays
  - Per-column edges against rest f230: at the right-leaning extremes (f207, f215) the left bottom corner lifts 10-12 px while the right one lifts 2 px, and the right top corner rises 14-18 px. At the left-leaning extremes (f203, f211, f218) the left top corner rises 10 px. That is a lift of about 8-10 px across a 202 px base, about 2-2.5 deg on screen, larger than ±1.5 deg. The centroid lifts 3-5 px (cy 558-560 vs 563.4). The amplitude stays roughly constant (-1.7, +1.5, -1.8, +1.4, -1.9 px centroid) and only drops on the final half-swing (+0.7 at f221); it does not grow and then decay.
- **corrected**: Swing period shortens from about 9-10 frames (300-330 ms) to about 6-7 frames (200-230 ms)
  - Step 1 full periods from the centroid extremes: about 8.5, 8, 7.5, 7 frames, with a final half-swing of 3 frames. Step 4 (extremes f511, 516, 520, 524, 528, 531): half-periods 5, 4, 4, 4, 3. So the period goes from about 280-300 ms to about 230 ms, and to about 200 ms only on the last swing. The acceleration is real but mild.
- **confirmed**: Plain lid open f236-247: top edge 466 -> 373 in steps 4, 8, 12, 14, 14, 12, 12, 8, 4, 4, 1; no hop; padlock stays
  - Top edge 468 (f235) -> 466, 462, 454, 442, 428, 416, 402, 392, 382, 378, 374 (f246): steps 2, 4, 8, 12, 14, 12, 14, 10, 10, 4, 4, within the 2 px quantisation of the analysis. The bottom edge stays 657-659 (no hop). The padlock is still on the front at f285. Step 2 open f337-347: the same ease-in-out, 11-12 frames.
- **confirmed**: Press: top 466 -> 486, 0.92 height x 1.07 width, attack 8 frames then creep, total 14-15 frames, 1-frame release
  - Step 2: top 468 -> 472 (f322) ... 486 (f330), 488 (f335); height 190 -> 174-176 (0.92-0.93), width 217 -> 230 (1.06); bottom 657 -> 661. Release at f336: top 470, back to rest height in 1 frame. Step 3 press f412-426 and step 4 press f534-547 have the same values. Teaser press f123-136: top 544 -> 558. Finale press f750-763: top 544 -> 560 (about 16 px on the smaller chest, not 538 -> 558).
- **confirmed**: Lid fully open in 2-3 frames after S (67-100 ms), 4-5x faster than plain
  - Step 3 top edge: 488 (f426) -> 448 (S) -> 376 (S+1) -> 346 (S+2), against 11 frames for the plain open.
- **corrected**: S+1: body tall and narrow, right edge 397 vs 401 rest and 408 squashed
  - Right edge: rest 397-399, squashed 405-407, S+1 (f428) 399 (equal to rest), S+2/S+3 (f429-430) 395. The narrowing is 2-4 px (1-2%) and appears at S+2/S+3, not at S+1.
- **confirmed**: Hop of 19 px (660 -> 641), lands S+11
  - Bounding-box bottom 657 at rest, 659-661 squashed, 641 at S+3/S+4 (f430-431, also f551-552 and f663-664): 16 px above rest, 18-20 px above the squashed pose. Per-column bottoms rise 18-20 px on the right half and 24-28 px on the far left, so the chest also tips slightly as it hops. It is back at 657 at S+11 (f438, f559, f671).
- **unsupported**: Lid overshoots past its rest angle at S+2/S+3 and bounces back at S+8 to S+10
  - Silhouette height (bottom minus top) is 295 px at S+3 against 287 at rest, then 283 at S+10/S+11 and 287 again by S+13. Something settles, but a taller silhouette can mean the lid passing vertical or the body stretching. I could not separate an angle overshoot from the frames, so I moved it to uncertain.
- **corrected**: Freeze of 3-4 frames starting S+4 (step 3, teaser) or S+5 (steps 4, 5, finale): holds 431-434, 141-144, 553-555, 665-667, 768-771
  - Motion-compensated diffs (best shift ±6 px x scale 0.98-1.02) on a lid-only box: step 3 f432/433/434 = 2.0/2.4/1.8 vs 5.1 at f431 and 10.1 at f435; step 4 f553/554/555 = 2.3/2.8/2.5 vs 7.7 before and 8.2 after; step 5 f665/666/667 = 3.2/2.2/2.4 vs 9.3 before and 10.1 after. So the held pose is S+4..S+7 (4 displayed frames, 133 ms) in all three steps; S+5 is only where the camera starts to move. Teaser f142/143 = 4.4/2.7 vs 9.8 and 6.2, finale f769/770 = 4.5/3.2 vs 11.1 and 5.3: 3-4 frames, noisier on the smaller chest. The stars and the light sheet freeze too.
- **confirmed**: Camera shake starts at S+5 in every instance
  - Floor-grid patches (4 corners, 2x-upsampled exhaustive search) read 0.0 shift up to S+4 and first move at f432, 553, 665 (and in the mc fits at f142 and f769).
- **corrected**: Shake is a zoom pulse peaking at 1.022 with translation jitter up to 3.6 px; about 14 frames; about 1% zoom persists in steps 4-5
  - Left and right floor patches 446 px apart separate by 6.0 (S+5), 8.5 (S+6), 8.0-8.5 (S+7), 6.5 (S+8), 6.0 (S+9), 4.5 (S+10), 3.5 (S+12), 2.5 (S+14), about 1 (S+18-22) and 0 by S+25. That is a zoom peak of about 1.8-1.9% at S+6/S+7, decaying smoothly. Translation (mean of the patches): a first kick of about -3 px in x at S+5, then about +0.8, +1.5-1.8, -1.2 to -1.75, +0.5 to +1.5 px, flat by S+10; y jitter about ±2 px. The step 4 and step 5 profiles are identical to 0.5 px, so it is a canned curve; step 3 differs slightly on the first frame. There is no persistent 1% zoom: at most 0.25% by S+18-22 and about 0 from S+25 (f573, f685). The header text does not shake (header patches 0.0 shift); only the 3D scene does.
- **corrected**: Padlock pops off, tumbles and comes to rest on the floor at the chest's front-left at S+30..S+37 (bbox x0 -> 124 px, y1 677 -> 722)
  - Zoomed strips f427-467: the padlock flips up off the hasp at S, hangs in mid-air through the freeze (f431-434), tumbles down the front (f439-457), hits the floor at about S+31 (f458) and settles by about S+35 (f462). It rests in front of the chest slightly right of centre (about x 280-380, y 700-740), partly under the caption. The bbox jump at f464 (x0 125, y1 722) is the second caption line 'AND FREEZES FOR A BEAT!' typing in, not the padlock. Steps 4 and 5 land the same way (on the floor by f580). In the finale it lands at about f796-798 and slides to rest by about f810 at (327, 740).
- **confirmed**: Step 4 light sheet 257 -> 345 px (1.16x -> 1.55x) over S+1..S+5, gone S+11; rim line 1 frame at S about 1.0x width
  - Mask widths f549-555: 262, 296, 321, 340, 347, 352, 353 (1.19x -> 1.6x, the last frames inflated by the camera zoom); 342 at f558 and back to the 262-px chest at f559 (S+11). Rim line at f548: 919 px above luma 200 spanning x 179-396 (1.0x), median #FCE4B7. Sheet interior luma 85-118 with edge 130-153; sample #6F6651.
- **confirmed**: Coins emissive: 0 px above luma 230 plain, about 228 at f600
  - Chest-mouth box: f275 0 px, f480 0 px, f590 163 px, f600 209 px (bright mean #FFF589), f700 504 px (max #FFFFFF). Plain coin median #FCD240.
- **confirmed**: 8 stars, 19-36 px, swell to about 2x, rise about 145 px with ease-out, pops S+25..S+46 with a hollow-outline frame
  - Connected components (luma>200, area>=20): 8 blobs at f677-684, 19-36 px. Top star y 401 (S+10), 382 (S+13), 353 (S+19), 346 (S+24). Arc centroids x 181-399. The first swell is at f686 (S+26) and the last star disappears at f706-707. Swollen blobs measure 45-58 px. The zoom strip f684-707 shows each star whiten, swell, turn into a hollow outline for 1-2 frames, dim and vanish.
- **confirmed**: 10-27 sparks at once
  - Small blobs (2-20 px, luma>200) number 7-21 before the pops and 9-43 during them (peak 43 at f695).
- **corrected**: f709-718 is a static 10-frame hold, probably an edit
  - In the ray region the frame-to-frame diff is 0.41-0.46 (max per pixel 41-63), against 0.00 on truly static frames (f230/231). Over f709-718 the diff is 2.89 mean and 102 max. The rays and the remaining tiny sparks keep changing; the frame only looks still because every star has popped. The rays also keep changing through f575-610 in step 4 (f580 vs f610 diff 4.5).
- **corrected**: Outro: the whole frame darkens, mean luma 32 -> 23, from 25.9 s
  - The dimming runs f770-780 (25.67-26.0 s). The background goes 21 -> 17, the chest 82 -> 57 and the floor 22 -> 18, while the header text stays at p99 luma 191-192 (not dimmed). Whole-frame mean is 31.8 (f764) -> 22.3 (f780); part of that drop is the light sheet fading.
- **confirmed**: Finale: copier's thumbnail opens at 25.07-25.4 s, just before the 3D snap at f764
  - Thumbnail diffs: wobble f738-745, open f752 (25.07 s), thumbnail fades out f765-773. The 3D snap is at f764, 12 frames later. The teaser uses the same 12-frame offset (thumbnail open f125, 3D snap f137).
- **confirmed**: Teaser timeline wobble f102-122, press f123-136, snap f137
  - Teaser chest centroid oscillates 288.4-291.5 over f101-122; top edge 544 -> 558 over f123-136; f137 shows the rim line and the lid cracking.
- **confirmed**: Colours: wood #AA6A43, metal #645D66, coins #FCD13F, bg #0E1629, grid #648CA7, blue text #80C0F1, yellow #EBDD7C, salmon #E16A5F
  - My samples: wood median #9B5C3C (75th percentile #AD6B45), metal #5B565D, coins #FCD240, background (500,300) #0E1629, grid lines median #728BA2, caption blue #84B5DD and header #88C1EB, yellow caption #E6D88C, salmon caption #DC6D61. They match within the spread of shading and anti-aliasing.
- **confirmed**: Captions and narration verbatim
  - The webvtt cues and TRANSCRIPTS.md section 7 match. The on-screen captions read in frames are 'ROCK IT SIDE TO SIDE…'/'FASTER AND FASTER!', 'SQUASH IT DOWN…'/'AND LET IT TREMBLE!', 'IT SPRINGS BACK, SLAMS THE LID…'/'AND FREEZES FOR A BEAT!', 'A GLOW FROM DEEP INSIDE…'/'WITH SLOW TURNING RAYS!', 'STARS THAT POP…'/'AND SPARKS THAT KEEP RISING!', 'SAME CHEST, WAY MORE JUICE!' and 'SEND THIS TO YOUR FRIENDS!'.
- **added**: (added) Narration is timed to the release
  - In step 3 the caption reads 'IT SPRIN' on the release frame f427, so the word 'springs' lands on the spring. In step 5 the release f660-661 falls in a silent gap (-91 dBFS) between 'sparkles' and 'stars'.
