# Video 1: lightning-vfx-7-steps (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

Not the 3D capsule demo the brief expected. This is a 2D hand-drawn chalk/sketch tutorial: 576x1024 (9:16), 30 fps, 53.03 s (1591 frames), side-on. The camera never pans or zooms, but every flash frame carries a tiny 2-4 px screen shake (see step 9). The background is a dark navy vignette (#060912 corners, #121830-#131A31 centre). The 'enemy' is a semi-dome slime blob, 143 px wide and about 105 px tall (x184-327, crown y525, floor line y630), outlined #A3C3E4, filled #1D263D, with a smiling face. A fixed header 'HOW TO: ANIMATE LIGHTNING!' has a wavy underline. Each step has a circled step number and a typewriter label, and a progress row at the bottom shows 7 numbered dots plus a play icon. Hook, 0-3.17 s: the VO says 'Here's how to make a lightning effect in your game in seven steps.' The blob fades in f1-f8, the title types on f5-f19, three strikes land at f10/f38/f65 with damage numbers, and 'IN 7 STEPS!' types on at f56 and fades f85-f91. Then ONE bolt is built up layer by layer. Step labels appear at: step 1 f95 (3.17 s), step 2 f197 (6.57), step 3 f338 (11.27), step 4 f507 (16.90), step 5 f687 (22.90), step 6 f799 (26.63), step 7 f964 (32.13). 'Now make it move' (f1129, 37.63 s to 48.75 s) shows a two-drawing boil, a 5-card flipbook strip, a slowed 2-3-4 loop, held cards and four real-time plays. Outro (f1463, 48.77-53.03 s): 'LOOP IT... OR TRIGGER IT ON HIT!' with five strikes on the blob; 'THAT'S YOUR LIGHTNING!' types on f1506-f1518, between strikes 2 and 3. Steps last about 3.4-6 s each and the animation section about 11 s. Labels appear within about 0.1 s of the spoken step number. The outgoing label fades over about 6 frames before the next one types on. There is no split screen. The comparisons are inline: the BAD/GOOD stroke pair in step 6 and the 5-card strip in step 8. Transfer to Echoes: the decay timing, layer stack, colour ramp, flash, tiny shake and target reaction carry over directly. The geometry does not: the bolt is drawn vertically in screen space for a side view, and a high three-quarter camera would foreshorten a world-vertical bolt.

## Before and after

There is no split screen. The plain version is the step-1 squiggle (f150-f195): one smooth lazy S line, 2-3 px wide, pale grey-lavender #B6BCD2, 160x336 px, uniform width, no glow, static and silent. The juicy version is the hook/outro strike (e.g. f10, f1478) and the finished bolt (f1080). It differs in these ways:
- Path: straight segments with about 9 hard corners. Each corner is pushed 5-12 px further out and two small extra kinks are added, so the bolt is 16% wider (160 to 185 px) at the same 336 px height.
- Body: swells to about 13-14 px at the bends and pinches to 3 px between them; the tips taper to points.
- Core: hard-edged white (#F3FFFF-#FFFFFF), about 5-6 px typical and 8-9 px at its widest, falling to azure within 3-5 px.
- Inner glow: bright azure #388BFC-#448BF3, half intensity about 8 px from the body edge, gone by about 15 px.
- Outer glow: deep royal blue #1C3899-#1E3BA6, half intensity about 27 px from the body edge, 10% at about 47 px, gone by 55-60 px (about 0.4 blob widths).
- Accents: about 10-12 tapered light-cyan arcs (#6CB6F7-#A0E3FE), dropped again for the animated version.
- Life on a static hold: once the core is in, the glow breathes. A 16-frame (533 ms) inner-glow pulse of about ±3% runs on the static bolt, and a 6-7-frame pulse of about ±5% on the held card-1 drawing.
- Motion: a 5-drawing flipbook (thick/bright, thinner, thinner, broken in 3, 3 fragments), one drawing per 30 fps frame, 5-6 frames = 167-200 ms.
- Screen flash: drawing 1 only. A spatially uniform full-screen lift of about +27/+33/+49 RGB on hits (#060912 to about #212A43), decaying to about 0.66, 0.47, 0.29, 0.22, 0.14 of peak over +1..+5.
- Screen shake: 2-4 px, random direction each frame, decaying over +0..+3.
- Sound: a 0.5 s boom+crackle zap SFX.
- Target reaction: squash and stretch, an 8-frame pale hurt fill with a '>_<' face, and a rising cream damage number that lives about 0.57 s.
Inline micro-comparison (f903-f957): BAD! is an even-width 6-7 px pale-blue arc (#9AB9EB), 122 px long with blunt ends. GOOD :) is a near-white arc (#E3ECFE), 109 px long, that thickens from 1 px to 8 px over its first ~20% and tapers linearly to 1 px. Static vs moving: the taught static bolt (f1012-f1096) keeps one drawing (only the glow breathes), while the real-time version never shows a drawing for more than 1-2 frames.

## Step 1: Draw a squiggle (not white)

**Narration.** Step 1, draw a squiggle, not white. That comes later.

**On screen.** "1 SQUIGGLE!" / "(NOT WHITE... THAT COMES LATER)"

**What you see.**

The blob and 'IN 7 STEPS!' fade out (f85-f92). The label '1 SQUIGGLE!' appears at f95 and the first progress dot fills. A thin pale grey-lavender line is drawn stroke-on from its top end (upper right, about x349 y252) downward over f120-f150/f155. The shape is a smooth lazy S: a hook out to the left (x189 at mid-height), a bulge right, then a long straight diagonal down-left to the bottom tip (about x205 y589). It has uniform width, no glow and no taper. The caption types on below (f146-f160). The label and caption fade out f190-f196.

**Measurements.**

- **stroke draw-on time**: 30-35 frames = 1.0-1.17 s (f120 to f150-f155) (frames 110-175; confidence high)
  - Method: bbox and pixel count of luma>80 line mask per frame (bottom y 256 at f120, 584 at f150, 589 at f155)
- **line width**: 2-3 px at 576x1024 (2 px above luma 140, antialiased); about 2% of blob width (frames 172; confidence high)
  - Method: row profiles across the line
- **squiggle bounding box**: 160 x 336 px (x189-349, y252-588); height = 2.35 blob widths (frames 172; confidence high)
  - Method: largest-component bbox (luma>100, B-R>5)
- **line colour**: #B6BCD2 (brightest #C0C7DE), deliberately mid-value and not white (frames 172; confidence high)
  - Method: mean of top-10% brightest line pixels

**Colours.** #B6BCD2 squiggle line (pale grey-lavender, not white); #060912 background corner / #121830-#131A31 background centre (navy vignette); #98C2DD-#9BC4E6 header and caption text

**Rule.** Block in the bolt's path first as a thin, mid-value, coloured line, and keep pure white for the final core layer.

## Step 2: Exaggerate the action in the line

**Narration.** Step 2, exaggerate the action. Push the corners out and make every turn sharper.

**On screen.** "2 EXAGGERATE THE ACTION IN THE LINE!" / "PUSH THE CORNERS OUT... SHARPER TURNS!"

**What you see.**

This happens in two phases. (a) Straighten, f226-f250: the smooth S morphs into a polyline of straight segments with about 9 hard corners, and the width grows 160 to 175 px. (b) Push, f266-f300: 10 small coral-red arrows pop in one about every 2-3 frames, each at a corner and pointing away from the inside of the turn. As they appear, the corners actually move 5-12 px outward along the arrows, and two small extra kinks appear (near the top-right corner and on the lower run). The bolt ends 185 px wide at the same 336 px height. The line keeps its 2-3 px width and grey-lavender colour.

**Measurements.**

- **sideways amplitude**: 160 px (smooth S) to 175 px (straightened, f250-f270) to 185 px (pushed, x164-349, f290 on): +16% overall; height unchanged at 336 px (y252-588); 185 px = 1.3 blob widths (frames 196-340; confidence high)
  - Method: line-mask bbox (luma>110, B-R>10; red arrows excluded) per frame
- **corner push distance**: about 5-12 px per corner (4-8% of blob width), outward along each arrow (frames 196, 262, 330; confidence medium)
  - Method: overlay of the f196, f262 and f330 line masks
- **number of corners**: about 9 hard vertices plus 2 small added kinks (frames 330; confidence medium)
  - Method: read from the full-res frame
- **curve-to-zigzag morph time**: about 24 frames = 800 ms (f226-f250), then the push over about 30 frames (f266-f300) (frames 220-300; confidence medium)
  - Method: line bbox and pixel count per frame
- **push-direction arrows**: 10 arrows, each 13-26 px on the long axis, popping in f266-f292 (one about every 2.6 frames), colour #DB5E64 (frames 264-330; confidence high)
  - Method: connected components of red pixels (R>150, R-B>60)
- **line width after reshaping**: 2-3 px (unchanged) (frames 330; confidence high)
  - Method: distance transform

**Colours.** #DB5E64-#E26268 annotation arrows (coral red; tutorial markup, not part of the effect); #B6BCD2 line

**Rule.** Replace smooth curves with straight segments and hard angles. Then push every corner a little further out along its turn (about 5-12 px here, widening the bolt about 15%) and add one or two small kinks.

## Step 3: Give it some shape (thick at bends, thin between)

**Narration.** Step 3, give the line some shape: thick at the bends, thin in between, organic or sharp, your call.

**On screen.** "3 GIVE IT SOME SHAPE!" / "THICK AT THE BENDS, THIN BETWEEN." / "AS ORGANIC OR SHARP AS YOU PREFER!"

**What you see.**

Dusty-rose fill shapes are painted onto each bend (about f362-f400). Each is a lens or diamond swelling centred on the corner that tapers back to the thin line along the straight runs, so the bolt reads like a chain of beads. Both tips stay needle-thin. The red arrows stay on as reference.

**Measurements.**

- **width at bends vs between**: about 13-14 px at the widest bend vs 3 px on runs (about 4.5:1); 13-14 px = 9-10% of blob width (frames 330 vs 420, 560; confidence high)
  - Method: Euclidean distance transform of the line+fill mask (luma>90, arrows excluded): max half-width 6.7 px at f420, 7.1 px at f560
- **painted area**: 1205 to 2670 px (x2.2) (frames 330 vs 420; confidence high)
  - Method: line+fill pixel count
- **shape fill colour**: #CD98AB (≈#CA9AAE) (frames 420; confidence high)
  - Method: median of pink mask

**Colours.** #CA9AAE-#CD98AB bend fill (tutorial colour, later turned pale periwinkle); #E26268 arrows

**Rule.** Vary the bolt's width along its length: swell it to about 4-5x the run width at every bend, and pinch it thin on the straight runs and at both tips.

## Step 4: Broad soft glow on a layer underneath

**Narration.** Step 4, on a layer underneath, paint a broad, soft glow: loose, atmospheric, low opacity.

**On screen.** "4 START BROAD! LOOSE AND ATMOSPHERIC, LOW OPACITY!" / "NEW LAYER... PAINT UNDER 1ST LAYER" / "HEHE... LOWPACITY."

**What you see.**

The arrows and pink shapes fade (f509-f524), and the shaped body becomes a flat pale periwinkle fill. A dashed-circle airbrush cursor about 55-60 px across sweeps down the bolt from top to bottom (f564-f632). It leaves a soft deep royal-blue halo underneath while the body stays crisp on top.

**Measurements.**

- **broad glow falloff from the body edge**: blue excess +105 at 3-8 px, +78 at 15-20, +47 at 25-30 (half intensity about 27 px), +15 at 40-45 (about 10% at about 47 px), +5 at 50-55, 0 by 60 px; visible reach 55-60 px = about 0.4 blob widths (frames 560, 680; confidence high)
  - Method: mean colour per distance bin from the f560 body mask (full-res distance map), f680 minus f560
- **glow colour**: #1C3899-#1B3795 at 3-8 px from the body, fading through #182F79 (15-20 px) and #14255B (25-30 px) to the #0E1428 background (frames 680; confidence high)
  - Method: same distance-bin means
- **glow area vs body area**: about 41,000 px of glow (B-R>60) vs about 2,600 px of body (about 15x) (frames 560-656; confidence medium)
  - Method: pixel counts
- **airbrush cursor diameter**: about 55-60 px (frames 584, 600, 616; confidence medium)
  - Method: read from full-res crops of the dashed circle
- **painting time**: about 68 frames = 2.3 s, top to bottom (glow pixels 2,649 at f564 to 41,195 at f632) (frames 564-632; confidence high)
  - Method: glow pixel count per frame
- **body width**: max about 13-14 px at bends (frames 560; confidence high)
  - Method: distance transform

**Colours.** #B6C9FE-#C0C9F8 bolt body (pale periwinkle); #1C3899 / #1E3BA6 broad glow next to the body, fading to the #0E1428-#131A31 background by 55-60 px

**Rule.** Under the bolt, add a wide, soft, low-opacity glow in a deep saturated hue. It should fall to half intensity about 2 body-bend widths out and fade fully by about 4-5 bend widths.

## Step 5: Narrower glow, brighter colour

**Narration.** Step 5, closer to the center, a narrower glow in a brighter color.

**On screen.** "5 CLOSER TO CENTER... NARROWER AIRBRUSH..." / "BRIGHT COLOR!"

**What you see.**

A smaller dashed cursor (about 20-25 px) repaints the bolt top to bottom (f714-f764). It lays a tight, saturated bright-azure halo hugging the body, sitting between the pale body and the deep-blue broad glow. The bolt now reads as a glowing neon tube.

**Measurements.**

- **narrow glow falloff from the body edge**: added blue (f790 minus f680): 94 at 1-3 px, 89 at 3-5, 70 at 5-8, 38 at 8-11, 15 at 11-15, 4 at 15-20; half intensity at about 8 px, gone by about 15 px (about 1/4 of the broad glow's reach) (frames 680 vs 790; confidence high)
  - Method: distance-bin means from the body mask
- **cursor size vs step 4**: about 20-25 px vs 55-60 px (about 2.4:1) (frames 755 vs 600; confidence medium)
  - Method: read from full-res crops
- **painting time**: about 50 frames = 1.7 s, top to bottom (frames 712-776; confidence high)
  - Method: bright-azure pixel count (B>230, R<90): 0 at f712, 119 at f716, 5,817 at f764, then flat

**Colours.** #448BF3 / #357AF2 / #388BFC narrow inner glow (bright azure); #1C3899-#1E3BA6 broad glow beneath; #B6C9FE body

**Rule.** Add a second, tighter glow close to the core, in a brighter and lighter version of the same hue, reaching about a quarter as far as the broad glow.

## Step 6: Accents; taper every stroke

**Narration.** Step 6, accents: little arcs and sparks around the bolt. Taper every stroke thick to thin.

**On screen.** "6 ACCENTS... TAPER ALL BRUSH STROKES." / "BAD!" / "GOOD :)" / "THICK TO THIN!"

**What you see.**

About 10-12 small curled arcs (C-shapes and hooks) in light cyan are drawn hugging the bolt, mostly at the bends and along the runs (about f862-f900). Each is a tapered brush stroke. A small curl at the top tip was already there. Then two demo strokes appear under the bolt: 'BAD!' (pixels f903-f912), an even-width blunt arc, and 'GOOD :)' (f924-f933), a near-white arc that swells quickly and tapers to a hairline, with 'THICK TO THIN!'. Both are gone by f960.

**Measurements.**

- **accent count and size**: 12 new-pixel components (about 10-12 arcs), each 10-44 px long (0.07-0.3 blob widths), at most about 5 px thick; mean colour #6CB6F7 (frames 850-955; confidence medium)
  - Method: connected components of new bright pixels, f955 minus f850
- **BAD stroke**: constant 6-7 px over 122 px (x83-204), blunt ends, colour #9AB9EB (frames 955; confidence high)
  - Method: per-column thickness (luma>100)
- **GOOD stroke**: 109 px long (x307-415): thickness 1, 4, 6, 8, 7, 7, 6, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1 px every 6 px; peaks at 8 px about 20% along, then a linear taper to 1 px; colour #E3ECFE (frames 955; confidence high)
  - Method: per-column thickness (luma>100)

**Colours.** #6CB6F7 / #A0E3FE accent arcs (light cyan); #9AB9EB BAD stroke; #E3ECFE GOOD stroke; #BD636F 'BAD!' label; #93C491 'GOOD :)' label

**Rule.** Add small secondary arcs and sparks around the bolt, and draw every stroke tapered: swell fast near the start (peak at about 20% of the length) and then thin linearly to a point. Never use a uniform width.

## Step 7: Add the zap: sharp white core

**Narration.** Step 7, add the zap: a sharp, bright, white core for contrast. And now it's electric. (The on-screen text reads 'ADD DAT ZAP!'. The captions and transcript hear 'the'.)

**On screen.** "7 ADD DAT ZAP!" / "BRIGHT WHITE INNER ACCENT, SHARP EDGE. THIS ADDS CONTRAST... POW!!" / "AND NOW, IT'S ELECTRIC!" / "(BOOGIE WOOGIE WOOGIE)"

**What you see.**

On f998 a full-screen blue-white flash fires with the zap sound and a small 2-4 px screen shake. A hard-edged white core paints down the centre of the bolt, top to bottom, and is complete by f1010. The pale body now reads as the transition between the white core and the azure glow. The drawing then holds still, but the glow breathes: a 16-frame (533 ms) pulse of about ±3% in the inner glow that was absent before the core went in. On f1097 ('electric') a second flash and shake fire. The bolt then jitters through two alternate drawings (f1103-1104 and f1105-1106) and snaps back on f1107. From f1128 the accents fade out (gone by about f1142).

**Measurements.**

- **zap flash**: 1 peak frame. Corner lift +36/+40/+61 RGB (#060912 to about #2C324E). Whole-frame mean luma 21.5 to 58.1 (metrics.csv). Background blue excess 61, 38, 27, 18, 8, 8, 8, 7, 6, 5, 1, at baseline by +10 (about 330 ms) (frames 997-1008; confidence high)
  - Method: corner-patch RGB vs the previous frame; metrics.csv
- **zap screen shake**: +0 offset about 3-4 px (4.0,1.9 / 2.9,0.3 / 3.0,1.6 in three UI regions), +1 about 2 px, +2 about 1 px, about 0 by +3 (frames 995-1002, 1094-1101; confidence medium)
  - Method: edge phase correlation of header, caption and progress-dot regions against the pre-flash frame
- **white core reveal**: 12 frames = 400 ms, top to bottom (lowest white pixel y338 at f998, 393 at f1004, 462 at f1007, 537 at f1010) (frames 995-1015; confidence high)
  - Method: strict white mask (R>235, G>240, B>240)
- **core width**: about 5-6 px typical, 8-9 px at the widest bend (6% of blob width). White to azure within about 3-5 px (#DEF2FC inside, #6CAEF2 at 1-3 px, #4188F1 at 3-5 px) (frames 1080; confidence high)
  - Method: distance transform of the white mask; radial colour profile
- **layer reach (from the body edge)**: core 5-6 px wide inside a body 3 px (runs) to 13-14 px (bends); inner glow half intensity about 8 px, gone by about 15 px; outer glow half intensity about 27 px, gone by 55-60 px (frames 560, 680, 790, 1080; confidence high)
  - Method: distance-bin colour profiles
- **static-hold glow pulse**: inner-glow band mean blue cycles about 168 to 178 (±3%) with a 16-frame period (533 ms): about 8 frames high, 3 down, 5 low, 3 up; the outer band moves 78.8-82.7; the band was flat (163) during step 6 (frames 800-859, 1010-1096; confidence medium)
  - Method: mean blue in 5-20 px and 20-50 px distance bands per frame
- **'electric' jitter**: 2 alternate drawings, each held 2 frames = 67 ms (frames 1094-1113; confidence high)
  - Method: bolt-region frame diff (6.1 at f1103, 9.9 at f1105, 7.7 at f1107; ≤0.5 between)
- **finished static bolt size**: about 183 px wide (x163-346); 300-336 px tall depending on how much of the faint bottom tip is counted (frames 560/1080; confidence medium)
  - Method: largest-component bbox

**Colours.** #F3FFFF / #FFFFFF white core; #6CAEF2 core edge; #B6C9FE body; #388BFC-#448BF3 inner glow; #1C3899-#1E3BA6 outer glow; #2C324E flash-lifted background

**Rule.** Finish with a thin, hard-edged pure-white core down the centre of the bolt, painted last so it contrasts with the coloured layers. While a bolt is held, let its glow breathe by a few percent on a slow cycle (about 0.5 s) rather than freezing it.

## Step 8: Now make it move (flipbook timing; play-icon stage)

**Narration.** Now make it move. Draw three or four versions of the bolt and swap them every couple of frames. Start with the thickest, brightest frame and a quick flash. Then let it thin out, break apart and fade. The whole thing lasts about a quarter of a second.

**On screen.** "NOW MAKE IT MOVE!" / "DRAW 3-4 VERSIONS... SWAP EVERY 2 FRAMES!" / "START THICK + BRIGHT... AND A QUICK FLASH!" / "THIN OUT" / "THIN OUT... BREAK APART... FADE." / "WHOLE THING: 1/4 SECOND!" (cards numbered 1-5)

**What you see.**

With the accents gone, a clean core-plus-glow bolt starts to boil (f1140-f1205). It alternates between two drawings with irregular holds, including a burst of strict 2-video-frame swaps (f1170-f1179). Five numbered thumbnail cards pop in under it, one every 7 frames (f1164, 1171, 1178, 1185, 1192):
1. Thick and bright with a big glow.
2. A re-drawn variant, slightly thinner.
3. Thinner again.
4. Broken into 3 segments with gaps at the bends.
5. Three tiny fragments.
While 'swap every 2 frames' is on screen, the big bolt loops cards 2-3-4 at 3-4-frame holds (f1206-f1237). Card 1 is then held f1238-f1329; its glow pulses about ±5% every 6-7 frames, and one flash fires on f1309. Card 2 is skipped. Card 3 is held f1330-f1339 ('thin out'), card 4 f1340-f1361 ('break apart') and card 5 f1362-f1381. Card 5 then fades out over 8 frames (f1382-f1389, 'fade'), and the screen stays empty f1390-f1405. Finally the full sequence plays at real speed four times (f1406, f1421, f1436, f1449). Each drawing shows for one video frame (one is sometimes doubled), the screen flashes and shakes about 1 px on drawing 1 only, and drawing 5 hard-cuts.

**Measurements.**

- **real-time sequence length**: 5 drawings in 5-6 video frames = 167-200 ms (one drawing per 30 fps frame = 2 frames at 60 fps; d4 doubled at f1409-10, d5 doubled at f1425-26) (frames 1406-1411, 1421-1426, 1436-1440, 1449-1454; confidence high)
  - Method: per-frame drawing ID by mask IoU plus card highlight
- **total with flash tail**: whole-frame luma excess under 10% by +6 frames (200 ms), at baseline by +8-10 frames (267-333 ms), matching '1/4 second' (frames 1420-1431; confidence high)
  - Method: metrics luma (f1421: 21.4 to 43.7, 37.0, 31.2, 27.7, 25.3, 25.1, 23.2, 22.9, 22.2, 22.1, 21.4)
- **per-drawing white core area**: 1329 / 654 / 508 / 185 / 51 px = 100 / 49 / 38 / 14 / 4% (frames 1421-1425; confidence high)
  - Method: white mask (R>215, G>225, B>235), card strip excluded (y<515)
- **per-drawing glow area**: blue excess >15 levels: 35.9k / 30.9k / 30.8k / 23.3k / 4.4k px = 100 / 86 / 86 / 65 / 12%; at >40 levels: 100 / 84 / 75 / 38 / 5%. The glow outlives the core through drawing 4; drawing 5 is nearly glowless (frames 1421-1426, 10-15, 1478-1483; confidence medium)
  - Method: blue excess over the pre-strike frame with the uniform flash lift subtracted
- **max core width per drawing**: 9 / 5 / 3 / 3 / 2 px (frames 1406-1411, 1421-1426; confidence medium)
  - Method: distance transform of the white mask
- **break-apart geometry**: drawing 4 = 3 segments separated by about 23-26 px gaps at the bends; drawing 5 = 3 fragments, each about 13-44 px long, left near the segment middles (frames 1424, 1425; confidence medium)
  - Method: connected components (not re-measured; the 3-segment and 3-fragment structure is confirmed visually)
- **screen flash**: drawing 1 only, instant with no ramp-up. Real-time plays lift about +15..+21 / +17..+26 / +24..+38 RGB (#060912 to about #181E31), about 60% of the hit flash. Blue excess at f1421: 28, 19, 11, 6, 6, 5, 4. The f1309 demo flash is hit-strength (+33/+37/+56) (frames 1405-1460, 1308-1318; confidence high)
  - Method: corner-patch RGB vs the previous frame
- **screen shake on real-time plays**: about 1.0-1.1 px mean at +0/+1 (max 2.0), gone by +3; about half the hit shake (frames 1405-1455; confidence medium)
  - Method: edge phase correlation of header/caption/dots regions
- **card pop-in**: one card every 7 frames (233 ms): f1164, 1171, 1178, 1185, 1192 (frames 1160-1195; confidence high)
  - Method: card top-edge luma
- **pre-loop boil**: 2 drawings alternate with holds of 3, 5, 3, 5, 14 frames, then 2, 2, 2, 2, 2 frames (f1170-f1179), then 9, 4, 4, 5, 4 (frames 1140-1205; confidence medium)
  - Method: bolt-region frame diff and drawing ID
- **slowed loop demo**: cards 2-3-4 cycled with holds of 3, 4, 3, 3, 4, 3, 4, 3, 4 frames (mean 3.4 frames = 113 ms), slower than real time (frames 1204-1238; confidence high)
  - Method: bolt-region frame diff plus highlighted card
- **hold-demo durations**: card 1: 92 frames (glow pulse period 6-7 frames, about ±5%, flash at f1309); card 3: 10 frames; card 4: 22 frames; card 5: 20 frames, then an 8-frame fade (core pixels 86, 80, 77, 74, 67, 49, 28, 12, 6, 0) (frames 1238-1405; confidence high)
  - Method: drawing ID, card highlight, glow/core pixel counts
- **repeat interval of real-time plays**: 15, 15, 13 frames (500, 500, 433 ms) (frames 1406, 1421, 1436, 1449; confidence high)
  - Method: flash frames

**Colours.** #F3FFFF-#FFFFFF core (card 1); #388BFC inner glow; #1C3899-#1E3BA6 outer glow; #181E31 flash-lifted background; #98C2DD card outlines (white #FFFFFF outline marks the active card)

**Rule.** Animate lightning as a flipbook of 3-5 distinct drawings swapped every ~33 ms (2 frames at 60 fps). Drawing 1 is the thickest and brightest and carries a one-frame screen flash plus a tiny shake. Then it thins, breaks into segments, then into fragments, then is gone, all within about 0.17-0.2 s (about 0.25-0.33 s including the flash tail).

## Step 9: (unnumbered outro) Loop it or trigger it on hit

**Narration.** Loop it or trigger it on hit, and that's your lightning.

**On screen.** "LOOP IT... OR TRIGGER IT ON HIT!" / "THAT'S YOUR LIGHTNING!" (types on f1506-f1518) / damage numbers "-21" "-47" "-25" "-48" "-45"

**What you see.**

The card strip fades and the blob fades back in (f1461-f1469). It takes five strikes (f1478, f1496, f1521, f1542, f1564); the hook's three strikes (f10, f38, f65) work the same way. The hit bolt is a narrower drawing set than the step-8 demo bolt. Its last segment drops straight into the blob's crown centre (x≈255, y≈520), and there are about 3 frame-1 variants (A: f10/f1478, and close to it f65/f1521/f1564; B: f38/f1496, about 20-25 px further left; C: f1542, about 40 px left and taller). On the impact frame (+0):
- The bolt's drawing 1 appears.
- The whole screen flashes with a flat uniform lift and shakes 2-4 px.
- The blob swaps to a pale fill with a '>_<' face.
- A cream handwritten damage number appears above-right.
- The sound has already started about 1-2 frames earlier.
Peak squash (flat and wide) lands on +0 or +1. Then the bolt runs its 5-drawing decay. The blob rebounds into a stretch (+2/+3), wobbles, and snaps back to its dark fill and smile on +8. The shake dies out by +4. The number rises with ease-out, holds and fades out by +16.

**Measurements.**

- **hurt sprite / tint duration**: exactly 8 frames = 267 ms (+0..+7) on all 8 strikes. Fill #1D263D to #5F7499-#6A84A7 on +0, drifts to #48566E-#4D5A76 by +7, hard cut back on +8 (frames 8-20, 36-48, 63-75, 1476-1488, 1494-1506, 1519-1531, 1540-1552, 1562-1574; confidence high)
  - Method: fill sample at x200-212, y585-595
- **squash and stretch**: Peak squash 158-163 px wide at y600 (+10..+14%) on +0 (3 strikes) or +1 (4 strikes), crown at x225 7-13 px lower. +2/+3: 132-133 px (-7%), crown 5-7 px higher. +4/+5: 146-148 px. +6/+7: 140-141 px. Back to 143 px by +8/+9. A damped about-4-frame oscillation with the base planted on the floor (frames same as above; confidence high)
  - Method: outline width at y600 and crown y at x225 (full res)
- **damage number**: Spawns on +0, left edge about x352-376 (100-120 px right of blob centre), bottom about 20-25 px above the crown. Rises about 48 px (0.33 blob widths) over +0..+13: 6-9 px/frame for the first 4 frames, 4 px/frame on +4..+6, 2 px/frame from +7. Full brightness to +11, fades over +12..+16, gone on +17: life about 17 frames (about 0.57 s). Glyphs about 17-19 px tall (12-13% of blob width). Colour #DADF9F median, #FDFDC6 core. No scale pop (frames 10-27, 38-54, 1478-1494, 1496-1512, 1542-1559, 1564-1581; confidence high)
  - Method: yellow mask (R-B>40) bottom-edge tracking plus local-contrast tracking and 2x zoom
- **bolt life on hit**: 5-6 frames = 167-200 ms (5 drawings; one sometimes doubled) (frames 10-14, 38-43, 65-69, 1478-1483, 1496-1501, 1521-1525, 1542-1547, 1564-1569; confidence high)
  - Method: core/glow mask per frame
- **hit screen flash**: Corner lift +23..+34 / +27..+42 / +39..+59 RGB (f10: +27/+30/+47, #060912 to about #212A43), uniform across the frame within ±3. Background blue excess relative to +0 (mean of 8): 1.00, 0.66, 0.47, 0.29, 0.22, 0.14, 0.12, 0.10, about 0 by +10. Whole-frame luma (mean of 8): 18.6 to 56.7, 44.5, 37.2, 31.0, 27.1, 24.4 (this includes the bolt itself) (frames 9-20 and the other strikes; confidence high)
  - Method: corner/edge-patch RGB vs the previous frame; metrics.csv
- **screen shake**: Whole-screen translation, random direction each frame. Mean magnitude over the 5 outro hits: +0 2.1 px (max 3.6), +1 1.4, +2 1.1, +3 0.7, +4 at the noise floor (0.3). That is about 0.4-0.6% of the 576 px frame width, or 1.5-2.5% of blob width, for about 4 frames (130 ms). Examples: f1496 +0 = (2.0,-2.9) in both header and dots; f1542 +0 = (0,-2.1..-3.0). No zoom: top and bottom regions move the same way (frames 1475-1483, 1493-1501, 1518-1526, 1539-1547, 1561-1569; confidence medium)
  - Method: edge phase correlation of header (y110-175), caption (y178-245) and progress-dot (y745-795) regions against the pre-strike frame; control frames ≤0.2 px
- **bolt size vs target**: glow from y≈240 to the crown (y≈520-525): about 280-285 px = about 2.0 blob widths (variant C about 345 px = 2.4). White-core bbox 103-122 px wide = 0.72-0.85 blob widths (frames 10, 38, 65, 1478, 1496, 1521, 1542, 1564; confidence medium)
  - Method: core/glow masks with the flash-lifted damage number excluded
- **strike spacing**: hook 28, 27 frames (0.93, 0.9 s); outro 18, 25, 21, 22 frames (0.6-0.83 s) (frames 10, 38, 65, 1478, 1496, 1521, 1542, 1564; confidence high)
  - Method: flash frames
- **hit drawing variants**: about 3 frame-1 variants. A≈A' (IoU 0.71-0.87 within ±6 px): f10, f1478, f65, f1521, f1564. B: f38, f1496 (best IoU 0.45 at dx -20..-26). C: f1542 (IoU 0.33 at dx -42). All differ from the step-8 demo bolt (IoU 0.19-0.37) (frames 10, 38, 65, 1406, 1421, 1478, 1496, 1521, 1542, 1564; confidence medium)
  - Method: glow-mask IoU with a ±70 px x / ±60 px y shift search

**Colours.** #1D263D blob fill (idle); #5F7499-#6A84A7 blob fill on impact (pale hurt tint, not white); #6787D0 crown fill where the bolt lands; #A3C3E4 blob outline; #DADF9F-#E5DD9E damage number (cream yellow; core #FDFDC6-#FFFDC8); #212A43 flash-lifted background

**Rule.** When the bolt hits, fire everything on the same impact frame: flash, tiny shake, bolt drawing 1, hurt sprite, damage number and sound, with peak squash on that frame or the next. Then let each element decay on its own clock: bolt 0.2 s, shake 0.13 s, hurt 0.27 s, sound 0.5 s, number 0.57 s.

## The kill or finisher

There is no kill or finisher in this video. The blob is struck 8 times (hook f10, f38, f65; outro f1478, f1496, f1521, f1542, f1564), and every hit gets the same non-lethal reaction:
- Flash and a 2-4 px shake on +0.
- Peak squash on +0 or +1: width +10..+14%, crown 7-13 px lower.
- Stretch on +2/+3: width -7%, crown 5-7 px higher.
- Pale hurt fill (#5F7499-#6A84A7) with a '>_<' face for exactly 8 frames (267 ms).
- A cream damage number that rises about 48 px and fades out by +16 (about 0.57 s).
- Return to the dark fill and smile on +8.
There is no pop, burn, disintegration, body throw, escalating hit or final-hit difference: the last strike (f1564) is the same as the first. The video ends at f1590 with the blob smiling under 'THAT'S YOUR LIGHTNING!' (on screen since f1506). Damage values shown: -21, -47, -25 (hook, repeated in the outro), then -48, -45. None of this video's material is usable for a death beat.

## Sound

Soundtrack: voice-over plus one zap SFX. There is no music bed: pauses between phrases drop to about -80 dBFS (the quietest 5% of 10 ms windows sit at -81 dBFS), and the end is digitally silent. The SFX fires on all 15 lightning events: hook f10/f38/f65, step-7 flashes f998 and f1097, the quick-flash demo f1309, real-time plays f1406/f1421/f1436/f1449, and outro f1478/f1496/f1521/f1542/f1564. A scan for low-band (<150 Hz) peaks above -15 dBFS finds only these 15. No designed sound was found for the drawing steps, but quieter events under the voice cannot be ruled out.
SFX character: an instant attack (from silence to about -10 dBFS RMS within the first 20 ms; sample peaks hit 0.0 dBFS), with two layers:
- A designed low 'boom' whose spectral peak sweeps down about 160, 100, 80, 60, 60, 40, 40 Hz in successive 50 ms windows. 50-90% of the energy is below 200 Hz in the first 150 ms.
- A broadband >4 kHz crackle/sizzle that holds while the boom decays and makes up 57-68% of the energy by about 400 ms.
Level relative to peak on the clean hits f1542/f1564: -10 dB at 160 ms, a plateau around -10..-12 dB to 280 ms, -15 dB at 320 ms, -20 dB at 400 ms, -26/-27 dB at 480 ms, then a hard cut below -60 dBFS at 0.50-0.52 s. Category: crack + thud/boom with an electric crackle tail.
Pitch: no variation between repeats. Clean repeats (f1449, f1496, f1564) best-match f1542 at 0.00 semitones. Waveform correlation is 0.45-0.74, limited by HE-AACv2 parametric coding and voice overlap.
Alignment to the impact (first flash) frame: waveform-aligned onsets lead the impact frame by 34-67 ms (median about 56 ms, about 1.5 frames) on every event. The file has a 98.6 ms jump in its audio timestamps at 50.087 s (one AAC packet declared 145 ms long). Honouring that jump, the last three strikes would lag +31..+57 ms. Ignoring it, they lead by 41-66 ms like the rest, which is the more consistent reading. The stream is HE-AACv2 with 0.161 s priming, so a constant 1-2 frame offset may come from the encode. Design rule: start the sound on the impact frame.

## Principles

- Build the effect in a fixed layer order, from structure to light: path line, then exaggerated angles, then width variation, then a broad glow underneath, then a narrow bright glow, then accents, and the white core last.
- Use a one-hue value ramp from inside out. White core #F3FFFF-#FFFFFF, then pale periwinkle body #B6C9FE-#C0C9F8, bright azure inner glow #388BFC-#448BF3, deep royal-blue outer glow #1C3899-#1E3BA6, and the navy background #060912-#131A31. Each outer layer is darker, more saturated, wider and lower in opacity.
- Layer reach, measured from the body edge: core 5-6 px wide (8-9 at bends) inside a body 3 px on runs and 13-14 px at bends; inner glow half intensity at about 8 px, gone by about 15 px; outer glow half intensity at about 27 px, 10% at about 47 px, gone by 55-60 px. The outer glow reaches about 0.4 target widths and about 4x as far as the inner glow.
- Use pure white only for the smallest, sharpest element, so the contrast reads; never start in white.
- Exaggerate the shape: replace curves with straight segments, push each corner a little further out along its turn (about 5-12 px here, +16% overall width), and add a kink or two.
- Taper every stroke: bends fat (about 4-5x the run width), runs thin, tips needle-sharp, and accent arcs swelling fast then thinning to a point. Uniform-width strokes read as wrong (BAD).
- Front-load the timing. Drawing 1 is the biggest and brightest and carries the screen flash, the shake and the sound. Every drawing after it is decay: thinner, then broken into segments, then fragments, then gone.
- Swap distinct drawings rather than moving one drawing: one new drawing per 33 ms (one 30 fps frame or two 60 fps frames), 5 drawings, 167-200 ms of bolt, about 250-330 ms including the flash tail. A soft alpha fade appears only in the slowed teaching demo; real time hard-cuts after drawing 5.
- The core dies faster than the glow: by drawing 4 the white core is at 14% of its drawing-1 area while the glow is still at about 40-65%. By drawing 5 both are nearly gone (core 4%, glow 5-12%).
- The screen flash is a spatially uniform, whole-screen cool wash, not a white-out. It lifts about +23..+36 / +27..+42 / +39..+61 RGB on hits and demo zaps (about 60% of that on untargeted plays), on the impact frame only with no ramp-up. It decays to about 0.66, 0.47, 0.29, 0.22, 0.14 of peak over the next 5 frames and is gone by about +8..+10.
- Add a tiny screen shake with the flash: a 2-4 px translation (about 0.5% of screen width) in a new random direction each frame, decaying over about 4 frames (130 ms). It is small enough to go unnoticed as shake while the flash does the heavy lifting.
- Synchronise the hit stack. Flash, shake, bolt drawing 1, hurt sprite, damage number and sound all start on the same frame, with peak squash on that frame or the next. Then each decays on its own clock: bolt 0.2 s, shake 0.13 s, hurt 0.27 s, sound 0.5 s, number about 0.57 s.
- The target reacts with volume-preserving squash and stretch (+10..+14% wide and 7-13 px lower, then -7% wide and 5-7 px taller, settling in about 6-8 frames). Add a pale tint about 30-50% toward light rather than pure white, with a hurt face, held for exactly 8 frames (at 30 fps).
- Damage number: spawn beside and above the target, rise about 0.33 target widths with ease-out (fast for 4 frames, then 2 px/frame), hold full brightness about 0.37 s, then fade over about 5 frames. No scale pop.
- Held or looping bolts should breathe, not freeze: a subtle glow pulse of about ±3-5% on a 0.2-0.5 s cycle.
- Readability: the effect stays in one blue family on a dark background, and damage numbers use a separate warm cream (#DADF9F-#E5DD9E) so they never merge with the effect.
- Variety on repeats comes from a few frame-1 drawing variants (3 here, some offset 20-40 px sideways) and different damage numbers, not from pitch changes; the SFX is the same sample every time.
- Sound runs longer than the visual: the zap SFX lasts about 0.5 s, about 2.5-3x the visible bolt. It is an instant-attack low boom sweeping from about 160 Hz down to 40 Hz, and a >4 kHz crackle tail takes over after about 250-300 ms before a hard cut.
- For Echoes (3D, high three-quarter top-down camera): copy the decay timing, the flash curve, the tiny shake, the layer and colour ramp, the hurt-tint duration and the number motion. The bolt's height relative to the target (about 2 target widths in this side view) would need to be authored in screen space or as a camera-facing sprite, because a world-vertical bolt will foreshorten.

## Extra tips

- Hook VO: 'Here's how to make a lightning effect in your game in seven steps.' (0-2.9 s, over three demo strikes).
- "(NOT WHITE... THAT COMES LATER)": on the step-1 squiggle (f146-f195). The base line is #B6BCD2, and white is saved for the step-7 core.
- "PUSH THE CORNERS OUT... SHARPER TURNS!": 10 coral arrows pop in at the corners (f266-f292), and the corners really move 5-12 px outward along them. The bolt widens 175 to 185 px (160 px before straightening).
- "THICK AT THE BENDS, THIN BETWEEN." / "AS ORGANIC OR SHARP AS YOU PREFER!": pink swellings up to 13-14 px at each bend vs 3 px runs (f362-f500).
- "NEW LAYER... PAINT UNDER 1ST LAYER": the broad glow goes beneath the body, painted top to bottom with a 55-60 px airbrush (f564-f632).
- "HEHE... LOWPACITY.": joke caption reinforcing a low-opacity outer glow.
- "BRIGHT COLOR!": the second glow is a lighter, more saturated azure #388BFC-#448BF3 vs the #1C3899-#1E3BA6 outer glow (painted f714-f764).
- "BAD!" / "GOOD :)" / "THICK TO THIN!": a uniform 6-7 px blunt arc (f903-f912) vs an arc that swells from 1 to 8 px in its first fifth and tapers to 1 px (f924-f933).
- "BRIGHT WHITE INNER ACCENT, SHARP EDGE. THIS ADDS CONTRAST... POW!!": the white core is painted top to bottom over 12 frames, right after a full-screen flash, shake and zap sound on f998. The finished bolt then breathes on a 16-frame glow pulse.
- "AND NOW, IT'S ELECTRIC!" / "(BOOGIE WOOGIE WOOGIE)": a flash and shake on f1097, then a jitter of 2 alternate drawings at 2 frames each (f1103-f1106). The boogie line is on screen only, not spoken.
- "DRAW 3-4 VERSIONS... SWAP EVERY 2 FRAMES!": the bolt boils between 2 drawings (including strict 2-frame swaps f1170-f1179) while 5 cards pop in every 7 frames: thick, thinner, thinner, broken in 3, 3 fragments. Then a slowed 2-3-4 loop at 3-4-frame holds (f1206-f1237).
- "START THICK + BRIGHT... AND A QUICK FLASH!": card 1 held for 92 frames with a subtle 6-7-frame glow pulse and one flash on f1309 that decays over about 6-8 frames.
- "THIN OUT... BREAK APART... FADE.": cards 3, 4 and 5 held in turn (f1330, f1340, f1362). Card 2 is skipped, and card 5 fades out over 8 frames (f1382-f1389).
- "WHOLE THING: 1/4 SECOND!": four real-time plays, each 5-6 frames of bolt plus a flash tail (f1406-f1458).
- "LOOP IT... OR TRIGGER IT ON HIT!": five strikes on the blob, each with flash, shake, squash, hurt face and damage number (f1478-f1590).
- "THAT'S YOUR LIGHTNING!": sign-off caption typed on f1506-f1518, between strikes 2 and 3.

## Uncertain

- The video is a 2D side-view sketch with a blob target, not the 3D capsule demo described in the brief. All 'enemy width' ratios use the blob's 143 px width.
- A/V sync: the measured ~56 ms audio lead is consistent across all 15 events, but it is small enough (1-2 frames) to be an HE-AACv2 priming or decoder-delay artefact. A 98.6 ms timestamp jump at 50.087 s makes the last three strikes ambiguous by about 3 frames.
- Whether 'swap every 2 frames' means 60 fps frames (fits the real-time plays: one drawing per 30 fps frame = 33 ms) or 30 fps frames (only a short burst at f1170-f1179 uses strict 2-video-frame swaps; the slowed loop holds 3-4 frames). Measured real-time behaviour is 1 video frame per drawing.
- Spoken word in step 7: the captions and transcript say 'add the zap' and the screen says 'ADD DAT ZAP!'; the voice may say 'that'.
- The flash blend mode (additive vs alpha over a light blue) cannot be separated. It is spatially uniform and is reported as a measured RGB lift (+23..+34 / +27..+42 / +39..+59 on hits, about +15..+21 / +17..+26 / +24..+38 on real-time plays, +36/+40/+61 for the step-7 zap). An alpha overlay of about 25% #7A9EDA would fit the hit value.
- The screen shake is 1-4 px, near the resolution limit of a compressed 30 fps video. It is detected consistently in three separate static UI regions on flash frames only, but its exact per-frame vectors are ±1 px.
- The glow 'breathing' on holds (16-frame pulse on the step-7 static bolt, 6-7-frame pulse on the held card 1) is ±3-5% in brightness or area. It is too regular and too absent during step 6 to be codec noise, but its exact curve is approximate.
- Glow reach values come from distance-binned colour means; the edge of a soft glow depends on the threshold (±5 px).
- Accent count in step 6 is about 10-12, counted from new-pixel components (some arcs split into two).
- The damage number's first frames sit on flashed backgrounds, so its spawn position is known to about ±5 px. At f1496 the number shows '-4' for one frame before '-47'; this is probably an edit artefact, not a designed type-on.
- Whether the blob's pale hurt fill is a light overlay at about 30-50% or a separate pale sprite cannot be determined; it is reported as hex values.
- Which hit drawing variant plays on which strike may be random or a fixed cycle; with 8 strikes and about 3 variants this cannot be told apart.

## Verify verdicts

- **confirmed**: Format: 2D side-on chalk tutorial, 576x1024, 30 fps, 53.03 s, 1591 frames; blob target 143 px wide (x184-327), crown y524, floor y630; navy vignette #060912 corners / #131A31 centre
  - ffprobe: 576x1024, 30/1, 1591 frames, 53.033 s. Full-res f30: outline at row 600 spans x184-327 (143 px), crown at x255 = y525, floor line y630. Corners f150 = #060A13, centre (288,512) f100 = #121830.
- **corrected**: No camera move, zoom or shake anywhere ('No screen shake is used... the camera stays perfectly still')
  - Edge phase correlation on three static UI regions far apart (header y110-175, caption y178-245, progress dots y745-795) gives the same translation vector on flash frames and ~0 elsewhere. Examples: f1496 +0 = (2.0,-2.9)/(3.0,-1.9)/(2.1,-2.9) px; f1542 +0 = (0.1,-2.1)/(-0.1,-2.9)/(-0.6,-3.0); f1478 +1 = (0.2,-1.1)/(1.8,-1.0)/(1.0,-1.0). Mean offset over the 5 outro hits: +0 2.1 px (max 3.6), +1 1.4, +2 1.1, +3 0.7, +4 0.3 (noise floor). The step-7 and demo flashes (f998, f1097, f1309) behave the same (mean 2.4 px at +0). Real-time plays: about 1 px. Control frames (f1506 with no hit) are <=0.2 px. Header and dots move the same way vertically, so this is translation, not zoom. It is a tiny shake of 2-4 px (about 0.5% of frame width) that changes direction each frame and is gone by +4.
- **corrected**: Hook: blob fades in f4-f8
  - Outline max luma at row 600 ramps 21,38,57,75,92,119,149,178,206 over f0-f8, so the fade-in runs f1-f8 (8 frames, about 267 ms).
- **confirmed**: Hook: title types on f5-f19, strikes at f10/f38/f65, 'IN 7 STEPS!' f56-f88
  - 'HO' first appears on f5 and 'LIGHTNING!' completes on f19. metrics luma jumps at f10, f38, f65. 'IN 7 STEPS!' text pixels appear on f56, are fully typed by about f62, fade f85-f91 and are gone by f92.
- **confirmed**: Step boundaries 3.2/6.6/11.3/16.9/23.0/26.6/32.0/37.6/48.7 s
  - Step-label region (y175-250) first non-empty frames: f95 (3.17 s), f197 (6.57), f338 (11.27), f507 (16.90), f687 (22.90), f799 (26.63), f964 (32.13), f1129 (37.63, 'NOW MAKE IT MOVE!'), f1463 (48.77, outro). Each label appears within about 0.1 s of the spoken 'Step N' (VTT 3.06, 6.50, 11.26, 16.94, ~23.0, 26.54, 32.14, 37.50, 48.58).
- **confirmed**: Previous step's text dims for about 5 frames before the next label appears
  - Label 99.7th-percentile luma falls over about 6 frames (e.g. f190-f196: 187 to 17; f331-f337: 201 to 17). The new label starts 0-6 frames later and is fully legible about 10 frames after the old one started dimming.
- **confirmed**: Step 1: squiggle drawn top to bottom f120-f150, 3 px wide, bbox 160x337 (x189-349, y252-589), colour #B6BCD2
  - Line-pixel bbox grows from x347-349 y252-256 (f120) to y252-584 (f150) and y252-589 (f155). Final bbox x189-349 y252-588/589. Row profiles are 2 px at luma >140 with antialiasing (2-3 px). Top-10% colour #B6BCD2, max #C0C7DE. Small fix: x189 is the left hook at mid-height; the bottom tip ends near x205, y589.
- **corrected**: Step 2: corners pushed out so the bolt goes from 160 to 231 px wide (+44%); principle 'push corners about 40-45% further out'
  - Line mask (luma>110, B-R>10, which excludes the red arrows): 160 px (f196-224), then 175 px after the straightening morph (f250-f270), then 185 px (x164-349) after the push phase (f290-f340). That is +16%, not +44%. The 231 px figure matches the span of the red arrows (about x130-370), not the line. Height is unchanged at 336 px.
- **corrected**: Step 2: arrows are annotation only; 'the line keeps its 3 px width'
  - Width stays 2-3 px (confirmed). An overlay of f196 (smooth), f262 (zigzag) and f330 shows the corners physically move 5-12 px outward along the arrow directions while the arrows pop in (f270-f300). Two small extra kinks are added: a notch near the top-right corner and one on the lower run. So the step has two phases: straighten (f226-f250), then push (f270-f300).
- **confirmed**: Step 2: 10 coral arrows popping in f262-f291, about 20-25 px, colour #E26268; about 9 corners
  - Red-component count (R>150, R-B>60): 1 at f266, then 2,3,4,5,6,7,8,9, and 10 by f292. Bboxes are 13-26 px on the long axis. Median colour #DB5E64. About 9 corners counted on the full-res f330 crop.
- **corrected**: Step 3: about 15 px at bends vs 3 px on runs (5:1); fill #CA9AAE
  - Euclidean distance transform of the line+fill mask (luma>90, arrows excluded): max half-width 6.7 px at f420 and 7.1 px at f560, so about 13-14 px at the widest bend. Runs are 3 px, giving about 4.5:1. Pink median #CD98AB (≈#CA9AAE). Area grows 1205 to 2670 px (x2.2).
- **confirmed**: Step 4: arrows/pink fade f511-f525; broad glow painted top to bottom f564-f632 (about 2.1 s) with a ~58 px airbrush; glow reaches about 51-62 px; colour #1E3BA6
  - Red/pink pixels fall from 960/1035 (f506) to 0/0 by f527. Glow pixels (B-R>60) rise from 2649 (f564) to 41,195 (f632) and then plateau. Radial profile by distance from the body edge (f680 minus f560): blue excess +105 at 3-8 px, +78 at 15-20 px, +47 at 25-30 px (about half), +15 at 40-45 px, +5 at 50-55 px, 0 by 60 px. Peak colour near the body is #1C3899 (≈#1E3BA6). The dashed cursor is about 55-60 px across (f584/f600).
- **confirmed**: Step 5: narrower azure glow, 12-15 px from the body edge, painted f714-f764, colour #388BFC
  - Azure pixels (B>230, R<90): 0 at f712, 119 at f716, 5817 at f764, then flat. f790 minus f680 blue excess by distance from the body edge: 94 (1-3 px), 89 (3-5), 70 (5-8), 38 (8-11), 15 (11-15), 4 (15-20). Half intensity is at about 8 px, and the glow is gone by about 15 px. Colour at 1-5 px is #448BF3 / #357AF2.
- **confirmed**: Step 6: about 10 tapered accent arcs (20-45 px); BAD = constant 6-7 px over 121 px; GOOD = 1 to 7 px within the first ~15%, then a linear taper to 1 px; BAD f906-f912, GOOD f925-f930
  - New-pixel components (f955 vs f850) number 12, each 10-44 px long (some arcs split), so about 10-12 strokes; mean colour #6CB6F7. BAD: x83-204 (122 px), thickness 6-7 px throughout, colour #9AB9EB. GOOD: x307-415 (109 px), thickness 1,4,6,8,7,7,6,6,6,5,5,4,4,3,3,2,2,2,1 sampled every 6 px, so it peaks at 8 px about 20% along, colour #E3ECFE. Pixels appear: BAD f903-f912, GOOD f924-f933, both gone by f960.
- **corrected**: Step 7: zap flash on f998 with whole-frame luma 24.2 to 63.7; corner lift +38/+41/+60; back to baseline by about +9
  - metrics.csv luma for f997 to f998 is 21.5 to 58.1, not 24.2 to 63.7. The corner-patch lift +36/+40/+61 is confirmed. Blue excess decays 61, 38, 27, 18, 8, 8, 8, 7, 6, 5, 1 and is at baseline by +10. A 2-4 px screen shake also fires: f998 +0 offset (4.0,1.9)/(2.9,0.3)/(3.0,1.6) px in the three UI regions.
- **confirmed**: Step 7: white core painted top to bottom over 12 frames (f998-f1010)
  - Lowest strict-white pixel (R>235, G>240, B>240): y338 (f998), 361 (f1003), 393 (f1004), 413, 431, 462, 479, 502, then 537 (f1010), constant after that. That is about 400 ms.
- **confirmed**: Step 7: core about 6 px typical, 9 px at bends
  - f1080 white mask distance transform: max half-width 4.5 px (about 8 px wide), 90th-percentile half-width 2.8 px (about 5-6 px wide). The white-to-azure edge falls within about 3-5 px (#DEF2FC inside, #6CAEF2 at 1-3 px, #4188F1 at 3-5 px).
- **corrected**: Step 7: the static bolt f1012-f1096 holds one drawing unchanged (diff 0.1-0.6, treated as static)
  - The mean blue of the inner-glow band (5-20 px from the body edge) cycles 177-179 / 167-169 with a 16-frame period (533 ms): troughs at f1019-23, 1035-39, 1053, 1067-71, 1083-87, each about 8 frames high, 3 down, 5 low, 3 up. That is about ±3% (outer band 78.8-82.7). The same band is perfectly flat (163±0) during step 6 (f800-f847), so this is a designed glow pulse that starts once the core is added, not codec noise. The drawing itself does not change.
- **confirmed**: Step 7: 'electric' flash on f1097, then 2 alternate drawings of 2 frames each (f1103-04, f1105-06), back at f1107
  - Bolt-region frame diff: 30.9 at f1097 (flash), then 6.1 at f1103, 9.9 at f1105, 7.7 at f1107, and ≤0.5 between. Confirmed visually on a frame tile.
- **corrected**: Step 8: cards pop in about every 6 frames (f1162-f1192)
  - Card top-edge luma jumps: card 1 f1164, card 2 f1171, card 3 f1178, card 4 f1185, card 5 f1192. That is every 7 frames (233 ms).
- **confirmed**: Step 8: slowed loop of cards 2-3-4 f1206-f1237 with holds 3,4,3,3,4,3,4,3,4
  - Drawing ID by IoU against the real-time drawings, plus card highlight: d2 1206-08, d3 1209-12, d4 1213-15, d2 1216-18, d3 1219-22, d4 1223-25, d2 1226-29, d3 1230-32, d4 1233-36, then d1 from 1238.
- **added**: (missing) What the big bolt does f1140-f1205
  - After the accents fade (f1128-f1142), the big bolt already alternates between two drawings with irregular holds (5,3,5,14 frames...), including a burst of strict 2-video-frame swaps f1170-f1179 while the cards pop in (frame diffs 5.8/5.7/1.4/1.7/2.1 on alternate frames).
- **corrected**: Step 8: holds of card 1 (flash f1309), then cards 3, 4, 5 at f1330, f1342, f1362
  - Card 1 is held f1238-f1329 (92 frames). The held drawing pulses: glow pixel count 17.3k-19.4k with troughs every 6-7 frames (f1242, 1249, 1256, 1262, 1268, 1275, 1282, 1288, 1295, 1301), about ±5%, and one flash on f1309. Card 2 is skipped. Card 3: f1330-f1339 (10 frames). Card 4: f1340-f1361 (starts f1340, not f1342). Card 5: f1362-f1381, then a soft fade-out f1382-f1389 (white pixels 86, 80, 77, 74, 67, 49, 28, 12, 6, 0), then empty f1390-f1405. The 'FADE' beat is an 8-frame (267 ms) alpha fade, but in the real-time plays drawing 5 hard-cuts.
- **confirmed**: Step 8: real-time plays at f1406, f1421, f1436, f1449; 5 drawings in 5-6 frames; core area 100/51/40/14/4%
  - Bolt present f1406-1411 (d4 doubled), f1421-1426 (d5 doubled), f1436-1440, f1449-1454. White core (y<515, card strip excluded) at f1421-1425: 1329/654/508/185/51 px = 100/49/38/14/4%. Max core width 9/5/3/3/2 px. Repeat intervals 15, 15, 13 frames.
- **corrected**: Step 8: glow area per drawing 100/88/90/67/23% (glow outlives the core)
  - Blue excess over the pre-strike frame with the uniform flash lift subtracted, f1421-1425: >15 levels 35.9k/30.9k/30.8k/23.3k/4.4k px = 100/86/86/65/12%; >40 levels 100/84/75/38/5%. Hook f10-14 behaves the same (32.3k, 27.0k, 24.0k, 19.6k, 3.7k). The glow does outlive the core through drawing 4, but drawing 5 is nearly glowless (5-12%, not 23%).
- **confirmed**: Step 8: real-time flash about +18/+21/+31 RGB, instant, decaying about 0.65-0.7x per frame
  - Corner patches f1406/1421/1436/1449 at +0: +17/+19/+30, +17/+17/+28, +15/+17/+24, +21/+26/+38. Blue excess at f1421: 28, 19, 11, 6, 6, 5, 4 (ratios 0.68, 0.39, 0.21). There is no ramp-up on -1. These flashes are about 60% of the hit and demo flashes (+39..+61 B).
- **confirmed**: Hit flash: background #060912 to about #212A43 (+27/+33/+49); whole-frame luma 18 to 56 then 44, 37.5, 31.6, 27.8, 24.5
  - Corner lift at +0 across 8 hits: R +23..+34, G +27..+42, B +39..+59 (f10: +27/+30/+47). Mean whole-frame luma over the 8 hits: baseline 18.6, then 56.7, 44.5, 37.2, 31.0, 27.1, 24.4. Added: the lift is spatially uniform (TL/TR/BL/BR/mid/low-centre agree within ±3 levels at f1478/1542/1564), so it is a flat full-screen overlay, not radial. Background-only blue excess (mean of 8 hits) relative to +0: 1.00, 0.66, 0.47, 0.29, 0.22, 0.14, 0.12, 0.10, then about 0 by +10.
- **confirmed**: Hurt fill exactly 8 frames (+0..+7) on all 8 strikes, #1D263D to #62779E, drifting to about #4C5B74, hard cut on +8
  - Fill sample (x200-212, y585-595): +0 #5F7499-#6A84A7, drifting to #48566E-#4D5A76 by +7, then #19283E-#1D253E on +8 for all of f10, 38, 65, 1478, 1496, 1521, 1542, 1564.
- **confirmed**: Squash on +0/+1: width 151-163 (+6..+14%), crown 7-12 px lower; stretch +2/+3 at 132-133 px; back to 143 by +6..+8
  - Row-600 width: +0 = 163,154,163,155,145,163,152,158 and +1 = 148,159,148,161,162,149,162,158 for the 8 strikes, so the peak squash (158-163 px, +10..+14%) lands on +0 in 3 strikes and on +1 in 4 (one tie). Crown at x225: 534 to 541-547 (7-13 px lower). +2/+3 minimum 132-133 px with crown 527-529 (5-7 px higher). +4/+5: 146-148. +6/+7: 140-141. Baseline 143 by +8/+9.
- **corrected**: Damage number: life about 14-15 frames (470-500 ms), rises 45-50 px over about 10 frames, fades over about 3 frames (+11..+14)
  - Local text contrast (y430-470) holds about 210-225 until +11, then 152/139/100/71/50 over +12..+16, and is gone on +17 (f1542 and f1564; f10 is the same, gone by +17). So life is about 17 frames (about 0.57 s) with a 5-frame fade. Bottom edge per frame (f1542): 501, 495, 489, 483, 477, 473, 469, 465, 463, 461, 459, 457, 455, 453, which is about 6-9 px/frame at first and 2 px/frame from +7, about 48 px total. Spawn about 100-120 px right of blob centre, bottom about 20-25 px above the crown. Glyph height about 17-19 px. Colour median #DADF9F, core #FDFDC6 (≈#E5DD9E / #FFFDC8). No scale pop. The '-4' on f1496 is confirmed (full '-47' from f1497).
- **corrected**: Hit bolt: same drawing set as the demo, sometimes shifted about 45 px; length 280-330 px (2.0-2.3 blob widths), width 120-165 px (0.85-1.15)
  - Shifted mask IoU of hit frame 1 against the step-8 demo frame 1 (f1406/f1421) is only 0.19-0.37, so the hits use a different, narrower drawing set whose last segment drops vertically into the crown. Among the hits there are about 3 frame-1 variants: A = f10≈f1478 (IoU 0.87), with f65/f1521/f1564 close (0.71-0.75, ±4-6 px); B = f38≈f1496 (best IoU 0.45 at dx -20..-26); C = f1542 (IoU 0.33 at dx -42, top reaching y≈180). White-core bbox (damage number excluded): 103-122 px wide (0.72-0.85 blob widths). Glow from y≈240 to the crown at y≈520-525 is about 280-285 px (about 2.0 blob widths), and about 345 px for variant C.
- **confirmed**: Strike spacing: hook 28, 27 frames; outro 18, 25, 21, 22 frames; damage values -21, -47, -25, -21, -47, -25, -48, -45
  - Flash frames f10, 38, 65, 1478, 1496, 1521, 1542, 1564. Numbers read on frame tiles.
- **corrected**: Outro: five strikes, 'then' THAT'S YOUR LIGHTNING!
  - 'THAT'S YOUR LIGHTNING!' types on f1506-f1518, between strike 2 (f1496) and strike 3 (f1521), and stays up for strikes 3-5. The blob fades back in f1461-f1469.
- **confirmed**: Audio: VO + one zap SFX on all 15 events, no music bed; instant attack, peaks 0 dBFS, about -10 dBFS RMS; boom sweeping down plus a >4 kHz crackle tail; hard cut at about 0.50-0.52 s
  - Low-band (<150 Hz) peaks above -15 dBFS occur only at the 15 lightning times (0.30, 1.26, 2.13, 33.24, 36.55, 43.61, 46.85, 47.35, 47.85, 48.30, 49.27, 49.87, 50.68, 51.40, 52.13 s). Other low-band peaks are -18..-25 dBFS and overlap voice. The quietest 5% of 10 ms windows sit at -81 dBFS. Clean hits f1542/f1564: sample peak 0.0/-0.2 dBFS, first 20 ms RMS -10 dBFS, level relative to peak -10 dB at 160 ms, -15 at 320, -20 at 400, -26/-27 at 480, then a cut to <-60 dBFS at 502/518 ms. Peak frequency below 400 Hz in 50 ms windows: 160, 100, 80, 60, 60, 40, 40 Hz. Share above 4 kHz rises to 57-68% by 400 ms.
- **confirmed**: Audio sync: SFX onset leads the impact frame by 35-70 ms (median about 55 ms); 98.6 ms timestamp jump at 50.087 s
  - Waveform-alignment onsets against the f1542 instance: -34..-67 ms for all 14 tested events (median about -56 ms). Low-band onsets give -36..-69 ms. One AAC packet at pts 50.086848 has a 0.14508 s duration (the next frame pts is 50.231927), a 98.6 ms jump. Ignoring it, the after-jump events lead by -41..-66 ms like all the others. The stream is HE-AACv2 with 0.161 s priming, so a constant 1-2 frame offset could come from the encode. Treat the sound as on the impact frame.
- **confirmed**: SFX pitch: no variation between repeats
  - Pitch-scan (±2 semitones, 0.25 steps) of 0.3 s log spectra: clean repeats f1564, f1496 and f1449 best-match f1542 at 0.00 semitones. Voice-overlapped events give unreliable matches. Waveform correlation is 0.45-0.74 (HE-AAC parametric coding stops it reaching 1).
- **added**: (missing) The hook narration
  - VTT 0.00-2.92: 'Here's how to make a lightning effect in your game in seven steps.' TRANSCRIPTS.md matches.
- **confirmed**: Narration and on-screen text for steps 1-8 and the outro
  - Matches TRANSCRIPTS.md section 1 and the VTT cues. On-screen strings checked on 1 fps sheets and full-res crops ('ADD DAT ZAP!', '(BOOGIE WOOGIE WOOGIE)' on screen only, 'HEHE... LOWPACITY.', 'WHOLE THING: 1/4 SECOND!').
