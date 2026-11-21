# Video 5: anime-hit (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

Portrait 576x1024, 30 fps, 24.33 s, mono audio: narration over a low sub-120 Hz bed that is probably music.

Layout (fixed):
- Title at the top: "HOW TO:" (y 166-184) and "MAKE ANIME HITS!" (y 190-227) in light blue (#83BEE9-#88C0EB) hand-drawn type, with a wavy underline (y 236-241).
- Under it, a step label: a circled number plus the step name (y 256-308).
- The demo sits in the middle (y about 330-560).
- Two caption lines below it (y about 600-685) type in letter by letter.
- A row of five step dots (y 753-783) fills in the current step.
- All hand-drawn text boils, redrawing with jitter every 3 frames (about 10 Hz), even during hitstops; the dots are static.

Camera: a fixed high three-quarter perspective over a navy floor (#0F172D) with light grid lines (about #535A6E) and a vignette; the background is #0B1220-#0E1626.

Demo art:
- An orange capsule hero (#E77B2F, 64x94-96 px, resting centroid (178,472)) holds a short white sword.
- A purple capsule enemy (#6A64C8, 63x92 px, resting centroid (370,432)) has a green HP fill (#71CD61, 74x8 px) inside a 77x12 px light-blue outline. The bar follows the enemy's position but keeps its screen size.
- The two centres are about 196 px apart, about 3.1 enemy widths.
- The swing trail is a crescent: yellow outer edge (#FCC143-#FDC850), white core (#FCFAFB-#FEFCFC), pink inner edge (#FC7EB1).
- Sparks are yellow shards (#E8D873, brightest #FFEA7F) that cool to orange (#F39A47).

The swing is a 3-hit combo that runs through the whole video regardless of section:
- pos 1: an upswing from below;
- pos 2: an overhead arc;
- pos 3: a leaping overhead finisher. The hero hops about 34 px off the floor and stretches, and the knockback is about 1.5x larger.

Hits land about every 27-28 frames (0.92 s) within a section.

Structure (sequential, cumulative build-up; 24 hits in all):
- Intro (0-3 s): the title types on (f4-20). Two plain hits land at f20 (0.67 s, pos 1) and f46 (1.53 s, pos 2) under "THIS HIT WORKS… / BUT IT'S NOT ANIME."
- Preview of the finished anime hit, twice: f105 (3.50 s, pos 3) and f133 (4.43 s, pos 1), under "LET'S MAKE IT ANIME… / IN 5 STEPS!".
- Step 1 Freeze (label f159-271): 4 demos at f175, f202, f230, f258.
- Step 2 Silhouette (f276-352): 3 demos at f290, f318, f345.
- Step 3 Invert (f357-434): 3 demos at f371, f398, f426.
- Step 4 Burst lines (f435-519): 3 demos at f449, f477, f505.
- Step 5 Punch in (f524-629): 4 demos at f539, f567, f595, f622. Demo D's zoomed colour return plays at f631-635, under the new pro-tip caption, after the hero has been reset to idle.
- Pro tip (about f630-670): 2 demos at f638 and f661.
- Outro "SAVE THIS FOR LATER!" (f671-729) with a bookmark icon: 1 demo at f701 (pos 3).

There is no split screen. "Before" is the intro plain hit and "after" is the preview; each step re-runs the same combo with one more layer added. The stylised frames are ink manga panels (hatched line art) that replace the whole screen. They are rendered live from the scene, while the title, label, captions and dots stay on top, never inverted. The HP bar refills at each section change (f91, f159, f276, f357, f435, f524, f631), even mid-knockback.

## Before and after

PLAIN hit (f14-f34 and f40-f60). This is already a juicy hit:
- Wind-up: the hero pulls back about 21-26 px (x 177→151-156, 3-4 frames before contact), then lunges forward. The lunge reaches +53 px on the contact frame of plain hit 2 (x 231, f46); plain hit 1 was sampled at +36 on f19, the frame before its contact.
- A yellow/white/pink crescent trail sweeps the blade arc.
- On contact the enemy turns fully white (#F2EDFE) for 2-3 frames (f20-21, f46-48; 67-100 ms) and is already displaced about (+34,-13) px on the contact frame.
- The HP bar drops instantly on the contact frame (74→62 px, about -16%), with no drain.
- Knockback is a hop up and to the right. The peak is (+59,-39) px = 71 px ≈ 1.1 enemy widths, 2 frames after contact (f22, f49).
- In the air the enemy is stretched (about 55-59 x 95-99 vs 63x92). It lands squashed 7 frames after contact (f27: 68x83; f53: 76x80) and slides back to rest by about +13 (f33, f60).
- About 4→32 yellow shards spawn 2 frames after contact on the enemy's right side and fly about 60-110 px right.
- A metallic ring (f0 2132 Hz + 4264 Hz; 2202 + 4404 Hz) is already present.
What the plain version lacks: no hitstop (every frame changes), no screen-space effect, no camera move (floor-grid fit f10→f22: scale 0.997, shift ≤2 px) and no shake. The palette never leaves the colour scene.

ANIME hit (preview f101-f125; full version in steps 4-5, the pro tip and the outro):
- From the contact frame the bodies hold for 9-10 frames (300-333 ms).
- The first 8-9 frames of that hold are replaced by 5 full-screen ink panels, 1-2 frames each, in alternating polarity:
  - K: black with only a thin white slash line through the contact point;
  - W: white paper, black line-art silhouettes, radial focus lines;
  - R: black with a red splat starburst and white droplets;
  - S: white with a black spike star and red wedge rays;
  - O: black spiky mass inside an expanding white ring.
  Sequences: K2 W2 R2 S1 O2 (f105-113) and K2 W1 R2 S2 O2 (f133-141).
- The colour scene returns on the held contact pose for 1 frame, with the camera zoomed about 1.10-1.12x (f114 floor/full fit 1.12; hero sqrt-area 1.09-1.12). It springs back to 1.0 by about f118, while the enemy, white for 3 more frames, is knocked back (preview 1 is a finisher: 106 px apparent, zoom included).

Net difference: about 9-10 extra frames of contact time, a 3-colour (black, white, red) full-frame takeover in which every graphic converges on or radiates from the contact point, and a camera punch-in on release.

## Step 1: Freeze

**Narration.** Step 1, freeze. Stop the game for a few frames right on contact.

**On screen.** ① FREEZE! / STOP THE GAME… / RIGHT ON CONTACT!

**What you see.**

Four hits in combo order:
- A (f175, pos 2 overhead arc);
- B (f202, pos 3 leaping finisher);
- C (f230, pos 1 upswing from below);
- D (f258, pos 2 overhead arc).

Demo B frame by frame:
- f196-199: the hero pulls back and up (x 171→155; base lifts off the floor).
- f200-201: it leaps and swings; the trail grows from the upper left over the top.
- f202 (contact): the blade touches the enemy's left side, the enemy turns fully white, and the HP bar drops (61→50 px). The hero is stretched (66x107) with its base 34 px off the floor.
- f202-f211: everything holds. Hero pose, sword, the full crescent trail and the white enemy are pixel-frozen (region diff <0.7). Only the sparks move: they spawn at the enemy's right edge on f203 and stream about 115 px right during the hold.
- f212: release. The trail resumes sweeping down. The enemy (still white) flies up and right and turns purple on f214. The hero drops back and lands squashed (72x85) on f214.
- The enemy hops (stretched), lands squashed at about release+8 and slides back to rest by release+14.

No camera shake or zoom. After the 4th hit (D) the HP fill falls to 24/74 px and turns coral red (#FA6A4E) until the next section refills it (f276).

**Measurements.**

- **freeze (hitstop) length**: 9-10 video frames = 300-333 ms: A f175-f183 = 9, B f202-f211 = 10, C f230-f239 = 10, D f258-f266 = 9. About 18-20 game frames if the game ran at 60 fps (frames 174-184, 201-212, 229-240, 257-267; confidence high)
  - Method: full-res hero box (100-280, 380-560) mean abs grey change <0.5 between consecutive frames; first changed frames f184 (9.4), f212 (17.9), f240 (26.6), f267 (6.9)
- **when the freeze starts and ends**: On the contact frame itself (the first white-enemy frame). The swing runs at full speed into it (hero diffs 24-39 on the 2 frames before), with no slow-down ramp, and releases at full speed (frames 172-175, 200-203, 211-213, 239-241; confidence high)
  - Method: region diffs plus frames read
- **enemy white-flash length**: The whole freeze plus 2 frames = 11-12 frames (367-400 ms): A f175-185, B f202-213, C f230-241, D f258-268. The plain hit flashes for only 2-3 frames (frames 172-188, 199-216, 227-244, 256-271; confidence high)
  - Method: enemy mask classed purple vs near-white (#F2EDFE)
- **particles during the freeze**: Sparks keep simulating. Freeze B: spawn on f203 at x 405-411; mean x 409→524 by f211 (+115 px ≈ 1.8 enemy widths); 12-31 blobs; y 357-455. Colour cools from #E8D873 to #F39A47 by f213-215, then they fade (frames 203-215; confidence high)
  - Method: yellow-orange mask (R>200, G>110, B<130) right of x=405; blob counts
- **HP bar timing**: Drops on the contact frame (74→61, 61→50, 49→36, 36→24 px; 12-13 px a hit), not on release, with no drain. Below about a third the fill turns coral red (#FA6A4E) (frames 174-176, 201-203, 229-231, 257-259, 258-276; confidence high)
  - Method: green/red columns inside the 77x12 bar outline
- **camera during and after the freeze**: No shake, no zoom: floor-grid fit against f196 gives scale 1.000 at f202, 0.994 at f211, 0.999 at f214 (noise ±0.007) (frames 196, 202, 211, 214; confidence high)
  - Method: scale+shift fit of the floor patch y 490-610
- **knockback after release**: Peak 2 frames after release. A (pos 2) (+56,-37) = 67 px ≈ 1.05 widths; C (pos 1) 65 px; D (pos 2) 66 px; B (pos-3 finisher) (+80,-50) = 95 px ≈ 1.5 widths. Stretched in flight (about 55x97), landing squash about 70x79 at release+7..8, back to rest at release+13..14 (≈450 ms) (frames 184-200, 212-228, 240-256, 267-283; confidence high)
  - Method: centroid and bbox of the purple enemy blob, offset from rest (370,432)
- **hero contact pose**: Normal hits: the hero is squashed and leaning at the frozen frame (76-77 x 85-86 vs 64x94), centroid x 231-236 (+54..+58 px lunge). Finisher: stretched 66x107, base 34 px off the floor (frames 175, 202, 230, 258; confidence medium)
  - Method: orange-mask bbox

**Colours.** #F2EDFE enemy white flash held through the freeze; #6A64C8 enemy purple (rest); #E77B2F hero orange; #FCC143 trail outer yellow; #FEFCFC trail white core; #FC7EB1 trail inner pink; #E8D873 fresh sparks (brightest #FFEA7F), cooling to #F39A47; #71CD61 HP fill green; #FA6A4E HP fill at low HP; #0F172D floor; #0B1220-#0E1626 background

**Rule.** On the exact contact frame, freeze the attacker, the target and the weapon trail for about 0.3 s (9-10 frames at 30 fps) with no ease in or out. Keep the target fully white for the whole freeze plus 2 frames, apply the damage on the contact frame, and let particles keep simulating through the freeze.

## Step 2: Silhouette

**Narration.** Step 2, silhouette: black shapes on white.

**On screen.** ② SILHOUETTE! / BLACK SHAPES… / ON WHITE!

**What you see.**

Contacts at f290 (9.67 s, pos-3 finisher), f318 (10.60 s, pos-1 upswing) and f345 (11.50 s, pos-2 overhead).

Demo A frame by frame:
- f288-289: the leaping overhead swing, in colour.
- f290-292: the whole screen becomes a white sheet holding only black ink line art at exactly the in-game screen positions and scale: the hero capsule (crosshatched on its shadow side), the sword with crossguard and grip, the enemy capsule (hatched), and the trail redrawn as one tapered black brush crescent. Floor, grid, HP bar, glow and sparks are gone. The title, label and captions stay on top in blue; the step dots go faint.
- f293-298: back to the colour scene, still frozen. The enemy is purple with a lavender/white rim, not white, and the sparks stream out.
- f299: the enemy turns fully white (still frozen).
- f300: release. The enemy stays white through f301 and is purple from f302.

Demo B (upswing, f318-326) has the same timing and draws the brush crescent below the blade. Demo C's knockback is still in flight when the step-3 label starts at f357; the HP bar refills mid-flight with no cut.

**Measurements.**

- **silhouette panel duration**: 3 frames = 100 ms (f290-292, f318-320) or 4 frames = 133 ms (f345-348). Static image (diff ≤0.4 between its frames) (frames 289-293, 317-321, 344-349; confidence high)
  - Method: metrics luma 245-247; white share 92.9-95.0% of y 250-760
- **place inside the freeze**: It replaces the first 3-4 frames of the same 9-10-frame stop. A colour hold follows (f293-299, f321-326, f349-354; hero diff <0.6). Release at f300, f327 and f355. Total stop 10, 9 and 10 frames (frames 290-300, 318-328, 345-356; confidence high)
  - Method: region diffs
- **panel composition**: About 93-95% white paper (#FDFDFD), the rest black ink (#050608). No grey fill, no colour, no environment, no focus lines (0 border crossings) (frames 290, 318, 345; confidence high)
  - Method: pixel classes on y 250-760; dark-run count along the frame border
- **registration with the 3D scene**: Figures sit at in-game scale and position. W panels of the same swing match across steps (mean diff 4.6-7.3 grey levels; scale fit f290→f372 1.02 ±0.03). Different swing variants differ by about 16 (frames 290, 318, 345, 372, 400, 428, 107, 451; confidence high)
  - Method: mean abs diff and scale+shift fit of matched panels
- **enemy colour after the silhouette**: Purple with a lavender/white rim during the colour hold (≈4440 purple px, ≈490 white px in demo A). Fully white only on the last held frame (f299, f326, f354) and the next 2 frames (frames 288-302, 316-330, 343-358; confidence high)
  - Method: purple/white pixel counts in the enemy blob
- **knockback after release**: Follows the combo position: A (finisher) (+81,-51) = 95 px ≈ 1.5 widths; B (+58,-34) = 69 px; C (+60,-35) = 70 px; all 2 frames after release (frames 300-316, 327-343, 355-370; confidence high)
  - Method: purple-blob centroid offset from rest

**Colours.** #FDFDFD paper white (whole screen); #050608 ink black line art; #83BEE9 title/label/caption blue, left un-inverted on the white panel; #6A64C8 enemy purple during the post-silhouette colour hold

**Rule.** Replace the first ~0.1 s (3-4 frames) of the hitstop with a full-screen white panel. Show only black ink outlines of the attacker, the weapon, the target and the slash arc at their exact screen positions and scale. Drop the floor, the health bar and all glows; keep the UI captions on top.

## Step 3: Invert

**Narration.** Step 3, invert: flip it to the negative.

**On screen.** ③ INVERT! / FLIP IT… / TO THE NEGATIVE!

**What you see.**

Contacts at f371 (12.37 s, pos-3 finisher), f398 (13.27 s, pos-1 upswing) and f426 (14.20 s, pos-2 overhead).

Demo A frame by frame:
- f369-370: the swing, in colour.
- f371 (K): the whole screen goes black. The only thing left is one thin white tapered slash line through the contact point, a steep '/' from (382,308) to (323,495).
- f372-373 (W): the white silhouette panel from step 2.
- f374-375 (K): its exact photographic negative: black screen, white figures with black hatching, white brush crescent.
- f376-377 (W): white again.
- f378 (K): negative again.
- f379: colour returns on the held contact pose. The enemy is white and the sparks are already out.
- f380-381: release; the enemy is white through f382 and purple from f383.

Demos B and C run K2 W2 K2 W1 K2 and K2 W2 K1 W2 K2. Each returns to colour on the held contact pose for 1 frame, then releases. Both slash lines run '\'. The title, label and captions stay light blue on both polarities.

**Measurements.**

- **flicker sequence and duration**: A: K1 W2 K2 W2 K1 (f371-378, 8 frames). B: K2 W2 K2 W1 K2 (f398-406, 9). C: K2 W2 K1 W2 K2 (f426-434, 9). 5 panels in 267-300 ms, each 1-2 frames (mean ≈1.75 frames ≈ 58 ms): about 17 panels a second, about 8 full black-white cycles a second (frames 369-381, 396-408, 424-436; confidence high)
  - Method: per-frame black/white share of y 250-760. The opening cut-line K is 96.8-98.2% black with 0.3-0.5% white; the negative K is 94.3-96.3% black with 1.6-1.8% white; W is 93.6-95.4% white
- **how exact the negative is**: Inverted W panel vs the next K panel: mean abs difference 5.4-5.9 grey levels (raw difference about 244), so a true full-screen negative (frames 372/374, 373/375, 376/378, 400/402, 428/430; confidence high)
  - Method: |(255-W) - K| over y 320-560
- **opening cut-line panel**: Black (#000000-#020104) with one white (#FCF9FC-#FFFEFF) tapered stroke, 1-2 frames. Its shape depends on the combo position:
- pos-3 finisher: '/' from (383,304) to (321,499), 196-205 px ≈ 3.2 enemy widths, ≤13-14 px thick;
- pos-1 upswing: '\' from (291,345) to (424,531), 226-230 px, ≤17 px;
- pos-2 overhead: '\' from (289,330) to (414,545), 244-256 px, ≤17-18 px.
Each passes within ≤6 px of the contact point (345,430) (frames 105, 133, 371, 398, 426, 449, 477, 505, 539, 567, 595, 622, 638, 661, 701; confidence high)
  - Method: connected component of bright pixels: endpoints, max row span, point-to-line distance
- **stop length including the colour return**: Panels 8-9 frames, then 1 colour frame on the held contact pose (hero-box diff vs frozen step-1 frames 6.3-6.7, vs 18-24 on real release frames), then release. Total 9-10 frames, the same as step 1 (frames 379-381, 407-409, 435-437; confidence high)
  - Method: region diffs against matched frozen frames f211, f239, f266
- **enemy flash after the panels**: White for 3-4 frames after colour returns (f379-382; f407-409), then purple (frames 379-384, 407-412; confidence high)
  - Method: enemy blob colour class
- **knockback after release**: A (finisher) (+85,-51) = 99 px ≈ 1.55 widths at f383; B (+61,-37) = 71 px; C (+60,-35) = 70 px (frames 380-397, 407-424, 435-450; confidence high)
  - Method: purple-blob centroid offset

**Colours.** #000000-#020104 black panel and cut-line background; #FCF9FC-#FFFEFF white cut line; #FDFDFD / #050608 positive panel (white paper, black ink); #000000 / #F6F5F8 negative panel (black paper, white ink); #83BEE9 title/caption blue, unchanged on both polarities

**Rule.** Fill the hitstop with 5 panels that alternate between the white-paper silhouette and its exact negative every 1-2 frames (~50-60 ms). Open on a black frame that shows only a thin white slash line through the contact point, return to colour on the held contact pose for one frame, and never invert the UI captions.

## Step 4: Burst lines

**Narration.** Step 4, burst lines: sharp spikes from the hit. (TikTok ASR wrote 'hip'. The on-screen caption reads 'FROM THE HIT POINT!'; whether 'point' is spoken could not be confirmed, because the impact ring at f505 overlaps the end of the phrase.)

**On screen.** ④ BURST LINES! / SHARP SPIKES… / FROM THE HIT POINT!

**What you see.**

Contacts at f449 (14.97 s, finisher), f477 (15.90 s, upswing) and f505 (16.83 s, overhead). The 5-panel polarity rhythm of step 3 stays (black, white, black, white, black-ish), but from the second panel on each one carries a graphic centred on the contact point (≈345,430).

Demo A:
- f446-448: the swing.
- f449-450 (K): the white cut line on black.
- f451-452 (W): the white silhouette panel plus about 30 thin black tapered focus/speed lines, coming in from every screen edge toward the hit, with a clear centre around the figures.
- f453 (R): black screen. A red jagged starburst (#EC351D, about 12-16 long spikes) explodes from the hit point, overlaid with white ink droplets radiating outward. The figures are ink line art with white rims; their fill varies by demo.
- f454-455 (S): white screen. A huge black brush-ink star (8-10 big points) centred on the hit runs off-screen. 2-4 red wedge rays (#F33617) fan from the centre out to the corners, with black ink specks. The figures are white with black outlines.
- f456-457 (O): a black hairy spiked mass fills the middle (figures in white line), bounded by a thick white brush ring that expands outward between the two frames, with black beyond.
- f458: colour returns on the held contact pose (enemy white, sparks already out). Release from f459; the enemy stays white through f460 and is knocked up and right.

**Measurements.**

- **panel order and timing**: A: K2 W2 R1 S2 O2 (f449-457). B: K2 W1 R2 S2 O2 (f477-485). C: K1 W2 R2 S1 O2 (f505-512). 8-9 frames = 267-300 ms; each panel 1-2 frames (≈55-60 ms). Plus 1 colour frame on the held pose = 9-10-frame stop (frames 446-460, 474-488, 502-515; confidence high)
  - Method: per-frame classifier on y 250-760 (black share, white share, red share)
- **focus lines (W panel)**: 28-54 thin tapered black strokes cross the frame border and converge on the hit. A centre about 360x300 px is left clear; ink covers 2.4-7.2% of the area outside it. Absent from the step 2-3 W panels (frames 107, 135, 451, 479, 506, 541, 569, 596, 624, 640, 663, 702; controls 290, 372, 376, 400, 428; confidence medium)
  - Method: dark-run count 8 px inside each border; ink share outside the central box
- **red splat starburst (R panel)**: Red centroid (339-361, 432-455), within about 25 px of the contact point. Spike radius median 129-148 px, p95 232-253 px ≈ 3.7-4 enemy widths, max 302-336 px. Red covers 13-18% of y 250-760 (about 6-9% of the whole frame) (frames 453, 480, 508, 543; confidence high)
  - Method: red mask (R>170, G<110, B<100), distances from (345,430)
- **spike star with red rays (S panel)**: White paper with a black 8-10-point brush star centred on the hit, running off the edges, and 2-4 red wedges reaching the corners (red centroid off-centre at (206-245, 570-598)). Shares on y 250-760: red 9-19%, black 33-49%, white 28-41% (frames 454, 482, 510, 544; confidence medium)
  - Method: pixel class shares; red-mask centroid
- **expanding ring (O panel)**: Finisher variants: the white ring's inner edge sits at a median ≈245-285 px from the hit on the first O frame and ≈330-345 px on the second (+55-90 px per video frame ≈ 1.7-2.7k px/s). Outer edge ≈360-420 → 460-550 px. Black spiky core inside (frames 112-113, 456-457, 546-547, 629-630; confidence medium)
  - Method: 72-ray radial scan for the first white run beyond r=150 px
- **scale of the panels**: Figures stay at in-game scale and position in every panel (scale fits of matched panels 0.97-1.02, within the fit noise): no zoom yet (frames 371→449, 105→449, 372→451; confidence high)
  - Method: scale+shift fits of matched panels across steps
- **release and knockback**: The colour frame shows the held contact pose (hero-box diff vs frozen f211: 5.9; enemy at its contact offset). The enemy is white for 3 frames (f458-460). Knockback: A (finisher) (+87,-53) ≈ 99 px ≈ 1.55 widths at f461; B 68 px; C 67 px. Landing squash 69x82 at return+8; back to rest about 16 frames after return (frames 458-474, 486-502, 513-529; confidence high)
  - Method: enemy blob centroid and bbox; region diffs

**Colours.** #EC351D red splat starburst (R panel); #F13515-#F33617 red wedge rays (S panel); #FDFDFD white paper and ink droplets; #000000-#010000 black ink and backgrounds; #FCF9FC-#FFFEFF white cut line

**Rule.** On the alternating hitstop panels, layer graphics that all centre on the contact point: inward focus lines on the white panel, a red spiky splat with white droplets on black, a black spike star with red rays on white, then an outward-expanding ring. Use black, white and one accent colour only.

## Step 5: Punch in

**Narration.** Step 5, punch in: zoom in hard, then snap back with color.

**On screen.** ⑤ PUNCH IN! / ZOOM IN HARD… / SNAP BACK WITH COLOR!

**What you see.**

Contacts at f539 (17.97 s, finisher), f567 (18.90 s, upswing), f595 (19.83 s, overhead) and f622 (20.73 s, finisher). The 5 ink panels are the same as step 4, at the same in-game scale: K2 W2 R1 S2 O2 for demo A, f539-547.

What is new is the release:
- f548: the colour scene comes back on the held contact pose with the camera noticeably closer. Grid cells, capsules and blade are all about 10-12% bigger, shifted as a zoom about a point near the screen centre would shift them. The white enemy and the trail fill more of the frame. The HP bar keeps its 77 px screen size.
- f549-552: the camera eases back out to normal (f550 about 1.06, f551 about 1.01, f552 normal) while the knockback, trail sweep and sparks play.

Colours are not graded on return; the 'color' is simply the scene coming back after the black-and-white panels.

Demo D: the section changes during its panels. On the O frame f630 the hero is already drawn in its idle pose, and on f631-635 the zoomed colour return plays (1.12x → 1.01x, the enemy white and flying to (+88,-51) px) under the 'PRO TIP:' caption, with the HP bar refilled and the hero back at its idle spot.

**Measurements.**

- **punch-in zoom on release**: Peak 1.10-1.12x linear (up to about 1.15) on colour frame +0 or +1, back to 1.00 by +3 to +4 (100-133 ms).
- A f548-552: 1.12, 1.12, 1.06, 1.01, 1.00.
- B f576-579: 1.08-1.10, 1.08, 1.03-1.04, 1.00.
- C f603-607: 1.05, 1.12, 1.08, 1.03, 1.00.
- D f631-635: 1.12, 1.10, 1.08, 1.03, 1.01.
- Pro A f647-651: 1.08, -, 1.05-1.08, 1.03, 1.01.
- Pro B f670-674: 1.08, 1.15, 1.11, 1.04, 1.01.
- Outro f709-713: 1.10, 1.16, 1.11, -, 1.01.
- Preview f114-118: 1.12, 1.06-1.12, 1.07, 1.03, 1.01; f142-146: 1.11, 1.08, 1.06, 1.02, 1.00 (frames 546-553, 576-580, 603-607, 631-636, 647-651, 670-674, 709-713, 114-118, 142-146; references 458-462, 486-490, 513-517, 530; confidence high)
  - Method: scale+shift fit of the floor-grid patch (y 490-610) against rest frame f530, and full-frame fits against the step-4 frame at the same phase (f458-462, f486-490, f513-517). Cross-checked with hero sqrt-area ratios (1.08-1.12 at the peak)
- **zoom pivot**: Near the screen centre (288,512), not the hit point (345,430). Fitted pivots scatter over x 222-341, y 445-545 and average about (282,476) (frames 548, 549, 576, 604, 605, 631, 633, 647, 670, 672, 709, 114, 142; confidence medium)
  - Method: pivot = shift/(1-scale) from the fits
- **zoom in the ink panels**: None measurable: scale fits of step-5 panels against step-4 panels give 0.97-1.01, within the fit noise for thin line art. The punch-in shows only on the 3-4 colour frames after the panels (frames 449→539, 449→622, 451→541, 457→547; confidence medium)
  - Method: scale+shift fit of matched panels
- **colour on return**: No grade or saturation boost: hero #F18333 on the zoomed return frame vs #F28233 in step 4 (both lit by the flash; #E77B2F at rest) (frames 10, 458, 548, 114; confidence high)
  - Method: median of the hero mask
- **total time from contact to normal camera**: 8-9 frames of panels, plus the 1 held colour frame, plus 3-4 frames of zoom recovery: about 13 frames ≈ 430 ms (f539→f552) (frames 539-552; confidence high)
  - Method: frame classification plus scale fits
- **knockback seen during the zoom**: Demo A apparent (+96,-38) px at f550 with zoom included; unzoomed peak (+86,-56) ≈ 101 px at f551. Demo B 65 px, C 71 px, D 99 px (frames 548-565, 576-590, 603-618, 631-640; confidence medium)
  - Method: enemy blob centroid offset
- **HP bar during the zoom**: Keeps its 76-78 px outline width while the scene is 1.06-1.10x zoomed: a screen-space overlay that follows the enemy's position (frames 550, 551, 632, 633, 634; confidence medium)
  - Method: longest horizontal run of the bar outline

**Colours.** #F18333 hero on the zoomed return frame (no grade); #EC351D / #F33617 red accents of the panels; #FDFDFD / #000000 white and black panels

**Rule.** When the stylised hitstop ends, bring the full-colour scene back on the held contact pose with the camera about 1.1x zoomed about the screen centre, then spring it back to 1.0 within 3-4 frames (~100-130 ms) while the knockback and particles play; keep UI overlays at their normal size.

## The kill or finisher

There is no kill or death beat; the enemy is never defeated.
- Each hit takes 12-13 px (16-17%) of the 74 px fill, and the bar refills at each section change (f91, f159, f276, f357, f435, f524, f631; not before the outro).
- The lowest point is the 4th hit of step 1 (freeze D, f258): 36 → 24 px, about 32%. The fill turns coral red (#FA6A4E) from f258 to f275, a low-HP colour change.

The in-game finisher is the third hit of a 3-hit combo that cycles through the whole video: upswing, overhead, leaping overhead. It falls on hits 3, 6, 9, 12, 15, 18, 21 and 24 (preview 1, freeze B, silhouette A, invert A, burst A, punch A, punch D and the outro).
- The hero hops about 34 px off the floor and is stretched (66x107) at contact.
- Its cut line runs '/' instead of '\'.
- Knockback is about 1.5x larger: 95-106 px (1.5-1.7 enemy widths) vs 65-75 px (1.05-1.2 widths) for hits 1 and 2.

Every hit ends with the same hop and return:
- The peak comes 2-3 frames after release.
- In the air the enemy stretches to about 0.88x width and 1.05x height.
- It lands squashed about 7-8 frames after release (1.1-1.2x wide, 0.84-0.9x tall).
- It slides back to its spot about 13-16 frames (about 450-530 ms) after release.

The video closes on a finisher (outro, f701) dressed with the full 5-panel ink sequence plus punch-in, which it presents as the anime climax treatment: about 300 ms of black/white/red panels, then the zoom snap-back.

## Sound

The soundtrack is narration over a continuous low bed, probably music. The <120 Hz band sits at -21 to -35 dBFS, with its strongest bins at 30-51 Hz, and stops at about f726. Impact SFX are partly masked by the voice.

1) A metallic impact ring on every analysable hit, plain hits included, in at least two timbres:
- Family A: harmonic f0 + 2f0 with a weak partial at 1.12 f0, f0 2002-2304 Hz (plain1 2132/4264 Hz; plain2 2202/4404; frzA 2304; frzD 2186/4366; burA 2104; punA 2174; punB 2002/4011). Its partials peak between -0.6 and +1.9 video frames of the contact frame and fade (to less than 6 dB above the pre-level) by +4 to +9 frames, so it fades during the 9-10-frame stop.
- Family B: an inharmonic bell with partials at 1 : 1.077 : 1.34 plus a 7.1-7.8 kHz cluster, base 1539-1690 Hz (silA 1653/1776/2213; invB 1550/1669/2078; burC 1690/1820/2266; punD 1540/1658/2067). It appears on hits 9, 13, 17 and 21, swells to a peak +2 to +7 frames after contact and rings to +9 to +13 frames, covering the whole stop.
- Pitch spread is about 2.4 semitones in family A and 1.6 in family B, consistent with per-hit pitch randomisation and a random pick between sounds.

2) Swing build-up. The median band energy aligned on all 24 contact frames rises from about -8 frames (-270 ms):
- mid band 1-3 kHz: +7 to +11 dB from -5 to +4 frames;
- high band 3-10 kHz: +6 to +9 dB from -5 to +2 frames;
- low band 150 Hz-1 kHz: peak +8 dB at -2 frames, then a dip to -8 dB at +10 to +11 frames (about 350 ms);
- sub-150 Hz: only +2 to +3 dB.
24 random times show no such shape. This reads as a whoosh leading into the impact, masked by narration.

3) No distinct extra sound could be tied to the ink panels or the zoom snap-back. In pro-tip demo A the sub band drops from -24 to -41..-43 dBFS during the panels (f640-645) and returns at f646; this is not seen in other demos.

4) During freeze demo D (f259-266) the 300-4000 Hz band decays from -35 to about -50 dBFS, so the freeze has no sustained 'hold' sound.

## Principles

- The anime look lives inside the hitstop. In every step the bodies hold for the same 9-10 frames (300-333 ms) from the contact frame. The silhouette, invert, burst and ring panels replace frames inside that window rather than adding time. The colour scene returns on the held contact pose for one frame, then the pose, knockback and flash pick up where they froze.
- Build up cumulatively: freeze; then a silhouette in the first 3-4 frozen frames; then fill the whole freeze with polarity flips; then hang burst graphics on those flips; then add a camera punch on release. Each layer keeps the previous ones.
- Contrast rhythm: alternate full-screen polarity every 1-2 frames (about 55-60 ms per panel). Black and white do the work; a single accent (red #EC351D/#F33617) appears only from the burst step on.
- Strip the scene for the stylised frames: no floor, grid, HP bar, glow or sparks. Keep only attacker, weapon, target and slash arc, drawn as ink at their exact in-game screen positions and scale, so the eye never loses where things are. The creator renders the panels live from the scene (frame f630 shows a pose change mid-panel), so they always match the current pose.
- Everything radiates from or converges on the contact point. The cut line passes within ≤6 px of it, focus lines point to it, and the splat, spike star and ring are centred on it (red centroid within about 25 px).
- Escalate inside the 300 ms: thin cut line, then silhouettes with focus lines, then red explosion, then a full black spike star, then an expanding ring. Detail and coverage grow panel by panel before the release.
- Particles and sound are not frozen. Sparks fly about 115 px during the freeze, and the impact ring keeps sounding into the hold, so the stop reads as dramatic, not as a lag spike. The white flash is stretched across the whole freeze.
- Damage registers on the contact frame (HP bar drops instantly), not on release.
- Release with a punch: about 1.1x camera zoom about the screen centre on the first colour frames, easing back to 1.0 in 3-4 frames. The return to full colour after black and white is itself the 'snap back with color'.
- Vary the combo: three swing shapes cycle, and the third (a leaping overhead) is the finisher, with about 1.5x the knockback and its own slash direction.
- UI captions stay on top and un-inverted across all panels.
- Teach with payoff first: show the plain hit, then the finished result, then the steps.
- Transfer note for Echoes: the panels are full-screen, so a 300 ms whole-screen takeover hides every other combatant in a busy co-op fight. It suits rare beats (a finisher, crit or boss stagger) rather than every hit. Each anime hit makes 5-6 full-screen black/white reversals in about 0.3 s and repeats every 0.9 s; that is at or above the WCAG 2.3.1 limit of 3 flashes a second, so a reduced-flash option is needed. The video's red accent (#EC351D, #F33617) is close to Echoes' Ember #FF5A36, which is reserved for enemy threats, so a player-hit version would need another accent.

## Extra tips

- Opening punchline: "THIS HIT WORKS…" (blue #86B9DF, typing from f4) / "BUT IT'S NOT ANIME." (red #E3695A, typing by about f40-46); both dim at f85 and clear at f86. It is shown over two already-juicy plain hits (white flash, knockback hop, trail, sparks, metallic ring) to say that juice alone is not the anime look.
- "LET'S MAKE IT ANIME… / IN 5 STEPS!" ("IN 5 STEPS!" larger, in yellow #ECD97B; f91-152): shown over two previews of the finished hit (f105, f133) before any step is explained. The payoff comes first, then the breakdown.
- PRO TIP (narration "Pro tip: hide something."; captions "PRO TIP:" in blue #84B4DB / "HIDE SOMETHING IN IT!" in yellow #E9D986): in the pro-tip and outro demos only, a tiny extra figure is planted in the O (ring) panel. It is a solid white capsule about 26x41 px (about 0.4 enemy width) with a thin white stick pointing up and to the right, like a miniature capsule holding a sword. It sits at x 490-552, y 454-497, about 90 px right of the enemy silhouette in the dark field, on f645-646, f668-669 and f708 (33-67 ms). It is absent from every earlier ring panel (f113, f141, f457, f485, f512, f547, f575, f602, f630). An easter egg readable only frame by frame.
- Outro: "SAVE THIS FOR LATER!" (yellow #E6D786) types from f671. A bookmark icon appears as a blue outline at f682 and fills yellow (#FDDE77) at f693, a 'tap to save' animation, over one more full anime finisher (contact f701, zoomed return f709-713).
- Step-progress UI: five numbered circles at the bottom fill as each step starts. They, the title and the captions are drawn above the ink panels, never inverted, and the hand-drawn text boils (redraws) about every 3 frames even during hitstops.

## Uncertain

- Per-panel duration in the creator's game is unknown. At 30 fps the panels alternate 1 and 2 frames (mean about 1.75 frames ≈ 58 ms), so the true value is probably 3-4 frames at 60 fps (50-67 ms). Every timing is ±1 frame (±33 ms).
- The freeze measures 9-10 video frames (about 0.3 s), much longer than the narration's 'a few frames'.
- The zoom factor (1.10-1.12x typical, up to about 1.15x) comes from floor-grid and full-frame fits plus hero-area ratios. Fits are noisy (±0.02-0.03) when the trail crosses the floor patch. The pivot is near the screen centre, but the fitted pivots scatter about ±50 px.
- Whether the zoom peaks on the first or the second colour frame varies by demo (+0 for A, B, D and the previews; +1 for C, the pro tips and the outro). It may ramp over 1-2 game frames at 60 fps.
- The narration of step 4 may say 'from the hit' or 'from the hit point'. The caption says 'FROM THE HIT POINT!'; the impact ring at f505 overlaps the end of the phrase.
- Audio: the impact SFX sit under continuous narration. The two ring families were separated by partial ratios on 11 of 24 hits; the rest are masked. The pre-contact whoosh is inferred from the aligned median, not heard in isolation. Whether family B is tied to every 4th hit or picked at random cannot be told from 4 occurrences.
- Speed-line counts (28-54) come from border crossings and are approximate. Spike counts on the red starburst (about 12-16) and black star (about 8-10) were read by eye.
- The ring expansion speed is a coarse radial-scan estimate from two frames, reliable only for the finisher variant.
- Why the enemy is purple, not white, during the post-silhouette colour hold in step 2 (white only on the last held frame) is unclear. It may be an implementation detail of the creator's flash timing.
- The hidden pro-tip figure is assumed to be an intentional easter egg (a tiny capsule with a sword); what it is meant to depict is a guess.
- The section reset at f630-631 (hero snapped to idle and HP refilled while the enemy's knockback and the zoom continue) is probably the creator's demo script, not a game rule.

## Verify verdicts

- **confirmed**: Freeze (hitstop) is 9-10 video frames: A f175-183, B f202-211, C f230-239, D f258-266
  - Full-res hero-box (100-280,380-560) mean abs diff is under 0.5 grey levels on f176-183, f203-211, f231-239 and f259-266. The first changed frames are f184 (9.4), f212 (17.9), f240 (26.6) and f267 (6.9). Grid fit against the rest frame f196: f202 scale 1.000, f211 0.994, so no camera move.
- **confirmed**: The freeze starts on the contact frame with no ramp and releases at full speed
  - Hero-box diffs on the 2 frames before contact are 28/39 (f173-174), 24/25 (f201-202) and 28/36 (f228-229). On the release frame the diffs are 9-27 straight away (f184 9.4, f212 17.9, f240 26.6).
- **confirmed**: The enemy stays white for the whole freeze plus about 2 frames (11-12 frames); the plain hit flashes for 2-3 frames
  - Enemy mask colour class (purple vs near-white #F2EDFE): A white f175-185, B f202-213, C f230-241, D f258-268. Plain hit 1 is white f20-21 and plain hit 2 f46-48.
- **confirmed**: Sparks keep simulating through the freeze, about +115 px
  - Freeze B, yellow-orange mask right of x=405: spawn on f203 at x 405-411; the mean x runs 409 → 421 → 434 → 447 → 467 → 485 → 499 → 516 → 524 (f211); 12-31 blobs; y 357-455. Added: the median colour cools from #E8D873/#E4CC6F to #F39A47 orange by f213-215, then the sparks fade.
- **corrected**: Step 1 shows four identical overhead-arc swings
  - Three swing variants cycle as a 3-hit combo through the whole video. Pos 1 is an upswing from below (trail under the blade); pos 2 is an overhead arc; pos 3 is a leaping overhead finisher in which the hero's bbox bottom rises from 524 to 490 px (f194→f202) and the body stretches to 66x107. Freeze A (f175) and D (f258) are pos 2, B (f202) is pos 3 and C (f230) is pos 1. The cut-line shapes and W-panel diffs confirm the same cycle: same-variant W panels differ by 4.6-7.3 grey levels, different variants by about 16.
- **corrected**: Knockback size differs between demos for an unknown reason; most anime demos reach about 81-94 px
  - Peak centroid offset of the purple enemy, 2-3 frames after release. Every 3rd hit (the pos-3 finisher) reaches 95-106 px: prev1 106, frzB 95, silA 95, invA 99, burA 99, punA 101, punD 99, outro 102. Every other hit, in every step, reaches 65-75 px: plain1 71, plain2 69, prev2 72, frzA 67, frzC 65, frzD 66, silB 69, silC 70, invB 71, invC 70, burB 68, burC 67, punB 65, punC 71, proA 74, proB 75. So the size follows the combo position, not the step.
- **corrected**: The HP fill never drops below 33-36 of 74 px
  - The 4th hit of step 1 (freeze D, f258) cuts the fill from 36 to 24 px, about 32%, and the fill turns coral red (#FA6A4E, f258-f275). It resets to a full green bar at f276. Measured as red/green columns inside the 77x12 px bar outline. Each hit takes 12-13 px.
- **confirmed**: The HP bar drops instantly on the contact frame with no drain
  - 74→62 at f20, 74→61 at f175, 61→50 at f202, 49→36 at f230. No ghost segment. Added: the bar refills at section changes (f91, f159, f276, f357 while the enemy is still flying, f435, f524, f631) but not before the outro. It follows the enemy's knockback (plain1 peak: bar +50,-12 vs body +59,-39) and keeps its 77 px outline width while the camera zooms (76-78 px on f550 and f632-633).
- **corrected**: Plain hit: the hero lunges about +36 px (centroid x 176→212)
  - +36 is plain hit 1 sampled on f19 (x 213). Plain hit 2 reaches x 231 (+53) on its contact frame f46, and every frozen contact pose sits at x 231-236 (+54 to +58 px, about 0.9 enemy widths). Added: a wind-up pull-back to x 151-156 (-21 to -26 px) 3-4 frames before contact (f16, f42-43, f198-199, f254).
- **confirmed**: Plain hit knockback peaks at (+58,-40) px, 71 px, 2 frames after contact; stretch in the air, squash at landing, rest by about +13
  - Plain 1: (+59,-39) on f22, 59x93 in the air vs 63x92 at rest, squash 68x83 on f27, rest by f33-34. Plain 2: (+58,-36) on f49, squash 76x80 on f53. Measured the in-air height as 95-99 px, slightly less than the claimed 101-103.
- **confirmed**: The plain hit has no hitstop, no camera move and no shake
  - metrics diff_all is above 1.4 on every frame f17-33. Floor-grid fit f10→f22: scale 0.997, shift (+1,+2).
- **confirmed**: Silhouette panel lasts 3/3/4 frames, about 94% white, followed by a frozen colour hold with the enemy purple until the last held frame; total stop about 10 frames
  - W panels f290-292, f318-320, f345-348 are 92.9-95.0% white on y 250-760, with frame-to-frame diff ≤0.3. Colour holds f293-298, f321-325, f349-353 have hero diff <0.6. The enemy is purple during the hold (4436 purple px, ~490 white rim px) and white on f299-301, f326-328 and f354-356. Release frames f300, f327 and f355.
- **corrected**: Knockback after the silhouette is (+81 to +84, -46 to -54) px, about 97 px
  - Only silhouette A (a pos-3 finisher) reaches 95 px, (+81,-51) on f302. B reaches (+58,-34) 69 px on f329 and C (+60,-35) 70 px on f357.
- **confirmed**: Invert sequences K1 W2 K2 W2 K1, K2 W2 K2 W1 K2, K2 W2 K1 W2 K2, opening on a cut-line frame
  - Per-frame black/white shares on y 250-760. The opening K (f371, f398-399, f426-427) is 96.8-98.2% black with 0.3-0.5% white (cut line only). The later K frames (f374-375, f378, f402-403, f405-406, f430, f433-434) are 94.3-96.3% black with 1.6-1.8% white (the negative). The W frames are 93.6-95.4% white.
- **confirmed**: The K panels are an exact photographic negative of the W panels
  - |(255-W)-K| mean on y 320-560 is 5.5 (372/374), 5.5 (400/402), 5.9 (428/430), 5.6 (373/375) and 5.4 (376/378). The plain |W-K| is about 244.
- **corrected**: Cut line: a 'side swing' line (384,304)→(321,503) about 209 px and an 'uppercut' line (289,340)→(426,535) about 235 px
  - Connected-component endpoints show three shapes, one per combo position. Pos 3 (f105, 371, 449, 539, 622, 701): '/' from (383,304) to (321,499), 196-205 px, ≤13-14 px thick, about 72° from horizontal. Pos 1 (f133, 398, 477, 567, 638): '\' from (291,345) to (424,531), 226-230 px, ≤17 px. Pos 2 (f426, 505, 595, 661): '\' from (289,330) to (414,545), 244-256 px, ≤17-18 px. All pass within ≤6 px of the contact point (345,430). Colours: line #FCF9FC-#FFFEFF on #000000-#020104.
- **corrected**: Steps 3-4: colour returns 'already in motion' with no colour hold (step 3 B/C and step 4)
  - The first colour frame after the panels is the held contact pose. Hero-box diff against the frozen frames: f211 vs f458 5.9, f239 vs f486 5.3, f266 vs f513 4.9, f239 vs f407 6.7, f266 vs f435 6.5. A real release frame gives 18-24, enemy box 104-109. The enemy is still at its contact offset and the hero centroid matches (f458 (234,437) vs frozen (236,438)). Motion starts on the next frame. Panels 8-9 frames + 1 colour frame = a 9-10 frame stop in every step.
- **confirmed**: Burst panel orders K2 W2 R1 S2 O2 / K2 W1 R2 S2 O2 / K1 W2 R2 S1 O2 and the same in previews, punch-ins and pro tip
  - Classified f449-457, f477-485, f505-512, f105-113, f133-141. Added for the rest: punch A K2 W2 R1 S2 O2 (f539-547), B K2 W1 R2 S2 O2 (f567-575), C K1 W2 R2 S1 O2 (f595-602), D K2 W2 R1 S2 O2 (f622-630); pro A and B K2 W2 R2 S1 O2 (f638-646, f661-669); outro K1 W2 R2 S2 O1 (f701-708). 8-9 frames each.
- **confirmed**: The red splat is centred on the hit (within about 20 px), median radius 125-155 px, p95 225-270 px
  - Mask R>170, G<110, B<100. Centroids (339,433) f453, (352,455) f480, (361,448) f508, (353,432) f543. Median r from (345,430) is 129-148 px, p95 232-253 px. Median colour #EC351D/#E93820.
- **corrected**: S panel coverage: red 13-19%, black 20-29%, white 45-57%; red rays fan from the centre
  - On y 250-760 the shares are red 9.4-18.6%, black 33-49% and white 28-41%; the figures depend on the region used. The red wedges (#F13515-#F33617) run from the centre out to the corners: the red centroid sits at (206-245, 570-598), well off the hit, while the black spike star is centred on it (frames 454, 482, 510, 544).
- **corrected**: R panel: the hero is drawn white and the enemy black with a white rim
  - It varies by demo. In f453 both capsules are dark with white rims and hatching; in f480 the hero is light and hatched, the enemy dark. The S panels f454 and f482 draw both figures white with black outline and hatching.
- **confirmed**: Focus lines: 27-53 strokes cross the border of the W panel and converge on the hit
  - Dark-run counts 8 px inside the border: 28-54 (f451 29, f506 54, f596 49, f702 50). Ink outside the central box is 2.4-7.2%. The step-2/3 W panels (f290, f372, f376, f400, f428) have 0 crossings, so focus lines first appear in step 4.
- **confirmed**: The O-panel ring expands outward between its two frames (inner edge about 250-300 → 345-365 px)
  - Radial scan from (345,430), finisher variants. Inner edge median 243→332 (f112-113), 284→340 (f456-457), 276→333 (f546-547), 268→343 (f629-630); outer edge 359-422 → 462-550. That is +55-90 px per video frame. Scans of the other variants were ambiguous.
- **confirmed**: Punch-in: peak 1.08-1.13x on colour frame +0 or +1, back to 1.00 by +3 to +4
  - Floor-grid (y 490-610) scale+shift fit against rest frame f530: f548 1.120, f549 1.117, f550 1.060, f551 1.010, f552 0.997. Full-frame fits against the step-4 frame at the same phase: punB 1.10/1.08/1.03/0.99, punC 1.05/1.12/1.08/1.03/1.00, proA 1.08/-/1.05/1.03/1.01, proB 1.08/1.15/1.11/1.04/1.01, prev1 1.12/1.06/1.07/1.03/1.01, prev2 1.11/1.08/1.06/1.02/1.00, outro (floor) 1.10/1.16/1.11/-/1.01. Hero sqrt-area ratios agree (1.08-1.12 at the peak). So the typical peak is 1.10-1.12, up to about 1.15.
- **confirmed**: The zoom pivots about the screen centre (288,512), not the hit point
  - Fitted pivots of the clean fits scatter over x 222-341, y 445-545 (for example (267,517), (306,476), (313,470), (321,494), (270,540)), averaging about (282,476). The hit point (345,430) is outside most of the scatter. Medium confidence.
- **confirmed**: No zoom in steps 1-4; no zoom inside the ink panels
  - Floor fit against rest: f202 1.000, f211 0.994, f458 0.999, f460 0.999, f379 1.006 (noise ±0.007). Panel-to-panel fits step 4 → step 5 give 0.97-1.01, within the ±3-4% ambiguity of fitting thin lines; f449→f539 is 0.97 and f449→f701 0.99.
- **corrected**: Punch-in demo D is cut at f631 into the pro-tip section before its colour return
  - f631-635 is D's colour return, and the punch-in plays: floor-fit scale 1.123, 1.104, 1.077, 1.033, 1.010. The enemy is white on f631-633 and reaches its knockback peak (+88,-51) px on f634. At the same moment the scene resets for the pro-tip: the hero is back in idle pose at its rest spot from f630 (the O panel f630 already draws the idle hero outline), the HP bar is full and the step label is gone. The pro-tip's first hit lands only 16 frames later (f638).
- **corrected**: Unknown whether the ink panels are rendered live or pre-drawn
  - Resolved, live: in the O panel f630 the hero outline is drawn in its new idle pose (sword pointing down) at its idle position, one frame after the hero was reset, while the enemy outline stays at the contact spot. The panels are an ink render of the current scene state with screen-space burst overlays.
- **confirmed**: Game time being frozen behind the panels is only inferred
  - Now measured: the first colour frame equals the contact pose (see the colour-return item above). Sparks on the return frame f458 have mean x 526 and span 439-575, the same as the end of the 10-frame step-1 freeze (f211-212: mean x 524-525), so bodies held while particles ran for the same time.
- **corrected**: Pro tip captions 'PRO TIP:' / 'HIDE SOMETHING IN IT!' are both yellow
  - 'PRO TIP:' is blue #84B4DB and 'HIDE SOMETHING IN IT!' yellow #E9D986 (f660). The 'PR' of the caption is already typed on the O panel f630.
- **confirmed**: Hidden figure in the pro-tip ring panels only
  - A white capsule plus stick at x 490-548, y 454-494 (f646), x 491-549, y 454-495 (f669) and x 492-552, y 456-497 (f708), also on f645 and f668. Absent (0 white px in x 470-576, y 430-520) on f113, f141, f457, f485, f512, f547, f575, f602, f630.
- **corrected**: Outro bookmark icon shows f680-729
  - A blue outline is drawn from f682 (22.73 s) and it fills yellow (#FDDE77) on f693 (23.10 s), staying to the end. 'SAVE THIS FOR LATER!' (yellow #E6D786) types from f671.
- **corrected**: Opening captions run f10-f95
  - 'THIS HIT WORKS…' (blue #86B9DF) types from f4; 'BUT IT'S NOT ANIME.' (red #E3695A) is typing by f40-46; both are dimmed by f85 and gone at f86. 'LET'S MAKE IT ANIME…' types from f91, 'IN 5 STEPS!' (yellow #ECD97B, larger) from about f116, and both clear on f153.
- **corrected**: Audio: one metallic ring, fundamental 2.0-2.3 kHz with a 4.0-4.5 kHz partial, pitch 2002-2271 Hz
  - 4096-pt spectra 0-300 ms after contact minus 30-350 ms before show two ring timbres. A: f0 + 2f0 (+ a weak partial at 1.12 f0), f0 2002-2304 Hz (punB 2002/4011, burA 2104, plain1 2132/4264 + 2396, punA 2174, frzD 2186/4366, plain2 2202/4404 + 2471, frzA 2304), a 2.4-semitone spread. B: inharmonic 1 : 1.077 : 1.34 plus a 7.1-7.8 kHz cluster, base 1539-1690 Hz (silA 1653/1776/2213, invB 1550/1669/2078, burC 1690/1820/2266, punD 1540/1658/2067). B appears on hits 9, 13, 17 and 21. The 2.07-2.27 kHz partial of B was likely counted as a 'fundamental'.
- **corrected**: The ring starts within ±1 frame of contact and rings 6-11 frames, through the freeze
  - 2048-pt per-partial tracks (window ±1.4 frames). Family A peaks at -0.6 to +1.9 frames and stays more than 6 dB above the pre-level until +4.3 to +8.9 frames, so it fades before the 9-10-frame stop ends. Family B swells and peaks at +2.3 to +7 frames, then rings to +9 to +13 frames, which covers the whole stop.
- **corrected**: Pre-contact whoosh: aligned median rises +8 to +11 dB in every band, sub peak at -43 ms
  - Median over 24 contacts, relative to -12..-9 frames. Mid band 1-3 kHz: +7 to +11 dB from -5 to +4 frames. High 3-10 kHz: +6 to +9 dB from -5 to +2. Low 150 Hz-1 kHz: peak +8 dB at -2 frames, then a dip to -8 dB at +10..+11 frames. Sub-150 Hz: only +2..+3 dB, so not a peak. 24 random times stay within about ±5 dB with no such shape.
- **confirmed**: Freeze D audio is quiet (mid band -50 to -62 dBFS)
  - 300-4000 Hz band per frame: -35 dBFS on f258, decaying -38, -39, -42, -44, -49, -47, -51, -49 through f259-266. Quiet, with no sustained hold sound; the exact levels depend on the band.
- **corrected**: A strong low thump falls on f646 (pro tip A)
  - Sub-150 Hz level: -24 dBFS on f637-638, falling to -37..-43 on f640-645 (during the panels), back to -21 on f646. That is a dropout of the bed and its return, not an added thump. It is not seen in proB, punA, burA or the outro.
- **unsupported**: No sample-identical SFX repeats (cross-correlation 0.03-0.10)
  - Narration overlaps every impact, so waveform correlation is dominated by speech and cannot show the SFX differ. The pitch spread and the two timbres above are the real evidence of variation.
- **confirmed**: A sub-120 Hz music bed at -20 to -30 dBFS stops at about f725
  - The <120 Hz band sits at -21 to -35 dBFS throughout. In the speech-free tail (f705-723, mid band -41 to -58) it holds at -21 to -24, then drops to -51 on f726. The strongest bins are at 30-51 Hz.
- **confirmed**: The 1 fps sheet timestamps are about 0.4 s off the frame numbering
  - The offset is about +0.47 s. The '4.000' tile shows the '\' cut line of preview 2 (f133-134, 4.43-4.47 s), '12.000' shows the negative of invert A (f374-375) and '23.000' the R panel of the outro (f704-705).
- **confirmed**: Layout, sizes and colours (hero 64x94 at (176,474), enemy 65x93 at (370,433), title #88C0EB, trail #FDC850/#FCFAFB/#FB7CB0, HP #71CD61, floor #0E172C)
  - f0: hero 64x96 at (178,472) #E77C30; enemy 63x92 at (370,432) #6A64C8; HP fill 74x8 #71CD61 in a 77x12 light-blue outline; title #83BEE9; trail at f205 #FCC143 / #FEFCFC / #FC7EB1; flash #F2EDFE; floor #0F172D; grid lines about #535A6E; background #0B1220-#0E1626. Text bands: 'HOW TO' y 166-184, title 190-227, underline 236-241, step label 256-308, captions about 600-685, dots 753-783.
- **confirmed**: Step boundaries 5.1 / 9.04 / 11.9 / 14.6 / 17.38 / 20.86 s
  - Within ±0.2 s. Step labels are on screen f159-271 (5.30-9.03 s), f276-352 (9.20-11.73), f357-434 (11.90-14.47), f435-519 (14.50-17.30) and f524-629 (17.47-20.97). Pro tip runs about f630-670 (21.0-22.33 s); the outro caption starts at f671 (22.37 s).
- **added**: Hero squash and stretch at contact
  - On normal hits the hero is squashed and leaning at the frozen contact frame (76-77x85-86 vs 64x94 at rest, f230 and f258). On the finisher it is stretched (66x107, f202) with its base 34 px off the floor, and it lands squashed 72x85 two frames after release (f214).
- **added**: Text line boil
  - Title and label regions change by 3-11 grey levels every 3 frames (f172, 175, 177, 180, 183, 186...) with near-0 diffs between, about a 10 Hz redraw. It continues through the freeze (f203, f206, f209). The step dots are static.
- **corrected**: Photosensitivity transfer note: 15-17 Hz full-screen alternation
  - Panels change about 17 times per second (1-2 frames each), which is about 8 full black-white cycles per second. Each anime hit makes 5-6 full-screen luminance reversals in 0.27-0.30 s, and hits repeat every 0.9 s. That is about 3 or more full-screen flashes per second, at or above the WCAG 2.3.1 general flash threshold.
