# Video 8: sword-swipes-juicy (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

Vertical TikTok, 576x1024, 30 fps, 30.67 s (920 frames). A sequential build-up with no split-screen. 0-3.0 s: the finished swipe on a 3-hit combo. Then 5 steps, each a construction view followed by the same combo in real time with the effect at that stage. Outro 28.4-30.67 s. Persistent header 'HOW TO: / MAKE SWORD SWIPES!' in a light-blue handwritten font (#8BC1EB, bright #93C7F1) with a wavy underline. Each step heading has a circled numeral and is written on stroke by stroke. Progress dots 1-5 sit near the bottom, with the current one filled. Sub-captions type on character by character in sync with the narration (light blue #90BFE3). Punch lines are yellow (#F6E082 to #FCE58A). Demo art: an orange capsule hero (#F78534 mid, #FFA353 lit, #AC5A22 shade; 64-66 px wide, 96-98 px tall at rest) holds a white-blue blade (#E3F4FF, about 80 px long at rest, about 1.3 enemy widths) with a navy crossguard (about #333C62). The violet-blue capsule enemy (body #6E66CC, shade edge #4F4BA7, top highlight to #8286FF) is about 63-64 px wide and 91 px tall in the wide view, and 76-80 px wide in the zoomed views. It has no health bar. The floor is dark navy (#10182B, background #0E1629) with a pale grid whose cell is about one capsule width. Centre-to-centre spacing is 191 px (3.0 enemy widths). The camera is high three-quarter, and it is NOT static. In the intro it slowly pushes in about 1.5% over 3 s. In the step-5 gameplay it slowly pulls out about 2.5% over 3 s. Each hit adds a small punch. It dollies in x1.25-1.3, eased over 10-12 frames, into each construction view (f100-111, f454-463, f640-649) and back out for gameplay (f381-390, f562-571, f756-766). Combo: hit 1 is a low horizontal sweep from front-left round to the enemy. Hits 2 and 3 are high over-the-top swings from back-left down onto the enemy and look nearly identical. First flash frames: f20/46/72, f396/418/440, f578/601/623, f779/805/830. Gaps are 25-26 frames in the intro and step 5 and 22-23 frames in steps 3-4 (733-867 ms overall). Construction views run in slow motion: the step-1 swing takes about 56 frames (f124-180) against 7-9 in real time, about 7-9x. The soundtrack is narration plus SFX only, with no music bed.

## Before and after

There is no side-by-side. 'Before' is the raw mesh played in real time in steps 3 and 4. 'After' is the intro and the step-5 gameplay. The hit reactions are the same in every version: a white enemy flash for 4-5 frames, a 3-frame hold (once 2), a knockback hop, a landing squash and a small camera punch. So the comparison isolates the trail itself. BEFORE (raw fan, step 3 f393-402, step 4 f575-585): the whole 240-tri fan pops in at full size on the first forward-swing frame, 3 frames before contact. It covers parts of the arc the blade has not reached yet and is drawn over the hero's lower body. It stays static and uniform at full opacity for 8 frames (step 3) or 9 frames (step 4). Then it fades to grey as a whole over 2 frames, so it is on screen 10-11 frames (333-367 ms). Frame luma jumps 27.0 to 35.2 in the single pop frame (+8). Contact then only adds the enemy flash (36.9). So the trail's own brightness arrives all at once at spawn, 3 frames early, rather than building to the hit. It has hard edges and no taper. Step 3 shows a checker fill (#ECF5FE/#AEBAD9). Step 4 shows solid white (#F7F9FC) with only a baked smoky start. AFTER (f17-26, f776-786): a 4-point star glint at the blade tip on the first strike frame. On the low sweep it is followed by about 6-10 white-blue streak shards around the tip. The trail is born at the blade and grows with it: blue-trail pixels 836 at f18, 2599 at f19, 3968 at f20 (flash frame). It holds at about 3800-4000 through f23 while still flickering. Then it dies tail-first: 2576 at f24, 721 at f25, 56 at f26, gone at f27. Its lower edge recedes 559, 525, 463, 391 px. That is 9 frames visible including a 1-frame remnant (8 frames on the over-the-top swing f45-52). Only part of the arc shows at any instant, as a moving window. It is a crescent about 40-60 px thick at the head, tapering to a point at the tail. Colour runs from a white-hot head (#D1F3FF to near-white) through ice blue (#A4CFF6) and steel blue (#7A98CA) to slate (#5C6E8D), with a bloom haze (#414A61) around it. Frame luma ramps 27.4 (f775), 28.5 (glint f776), 29.1, 32.5, then plateaus at 36.6-36.7 over the hold (f779-782), then decays 35.1, 30.9, 28.5, 27.6 by f786. The near-white area at peak is smaller (1.4-1.6% of pixels against 2.2% for the checker fan and 3.0% for the white fan) but concentrated at the contact point.

## Step 0: Intro (not a numbered step): the finished swipe on a 3-hit combo

**Narration.** If you want a sword swipe like this, do these five steps.

**On screen.** HOW TO: / MAKE SWORD SWIPES! | IF YOU WANT A SWIPE LIKE THIS, | DO THESE 5 STEPS! (yellow)

**What you see.**

Hit 1 (low sweep). f12-16 wind-up: the hero crouches back down-left and squashes (bbox 77x88 against 64x96 at rest). The centroid moves from (178,471) to (156,487), with the blade low and pointing down-left toward camera. f17: a 4-point star glint at the blade tip, with long horizontal spikes about 95-100 px across. f18: the blade sweeps down past the front; about 6-10 white-blue streak shards (5-25 px long) appear around the tip; the trail starts. f19: the hero lunges (+34 px), stretched tall and thin (64x104, +8% tall) with motion blur. The blade reaches the still-violet enemy, and a blue-white arc runs from the front-left floor up to the enemy. f20 FIRST FLASH FRAME: the enemy turns solid white (#FDFDFD) with a large blocky bloom halo. Its top rises about 13 px while its bottom and width are unchanged (+14-17% height). The hero leans about 20-25 degrees toward the enemy, centroid +54 px from rest. Frame luma rises from about 25 to 34. f20-22: full hold (enemy, hero and blade frozen; the trail still flickers). f23: the enemy, still white, is launched right and up; the blade continues up and the trail curls up behind it as a crescent. f24: the enemy is violet again at (429,395): +59 px right, -37 px up on screen, tilted about 10 degrees away from the hero. The trail shrinks from the tail. f25-28: the enemy falls while easing left, stretched (PCA long 97-101 against 88, short 53-56 against 62), and the tilt returns to 0 by f27. f26: a trail remnant; f27: gone. f29: the enemy lands with a 1-frame squash (bbox 72x81 against 64x91). f31-32: rebound stretch (60-61 x 99). f33-34: normal. f29-36: it slides back to its start (x≈370). The hero's body stays at about x=230 through f24, snaps back over f25-27, and the sword returns to the rest pose over f28-38. Hits 2 (f39-60) and 3 (f65-88) are over-the-top swings. The blade is raised back-left with a bright emissive edge, the glint comes on the first strike frame (f44, f69), 4-7 shards follow, and the arc rises about 98 px above the hero's head. Otherwise the reactions are identical. Underneath it all the camera slowly pushes in (about 1.5% over the intro) and punches slightly on each hit.

**Measurements.**

- **enemy white flash duration**: 4 frames (f20-23), 5 (f46-50), 4 (f72-75); across all 12 hits 4 or 5 frames (133-167 ms at 30 fps): 4,5,4 | 4,4,4 | 5,5,5 | 5,4,4 (frames 20-23, 46-50, 72-75, 396-399, 418-421, 440-443, 578-582, 601-605, 623-627, 779-783, 805-808, 830-833; confidence high)
  - Method: violet-mask pixel count (B>120, B-G>45, R>60, G<R+10) falls from about 4800-5100 to 0-60
- **flash lag behind blade contact**: the blade reaches the still-violet enemy 1 frame before the first white frame (33 ms) (frames 19-20, 71-72, 395-396; confidence medium)
  - Method: frame reading
- **hitstop (pose hold)**: first flash frame plus 2 held frames = 3 frames (100 ms); the enemy is launched on the 4th frame (f23, f49, f75, f399, f604, f782, f833). Once (f805) only 2 (launched f807). The hero's body keeps its contact position 2 more frames (through contact+4) while the sword continues up. The trail keeps flickering during the hold (frames 20-24, 46-50, 72-76, 396-400, 601-605, 779-784, 805-809, 830-834; confidence high)
  - Method: enemy white/violet bbox and centroid per frame; hero orange centroid; visual montage
- **knockback / launch**: centroid from rest (370,432) to (429,395) at contact+4: +59 px back (about 0.94 enemy width) and -37 px on screen (about 0.6 width). The floor slope is -0.25 px/px, so true lift is about 21 px at the bottom edge and about 27 px at the centroid (0.33-0.43 width). Repeats: +60/-38 (f51), +61/-36 (f76), +56/-40 (f784). Airtime f23-f28 = 6 frames (200 ms). x offset eases back while airborne: +59, +55, +48, +42, +36; lands at +30 at f29 and slides home over 7 frames (f29-36) (frames 23-36, 49-63, 75-88, 782-795; confidence high)
  - Method: violet-mask centroid and bbox per frame; bbox bottom compared with the floor line from the hero to the enemy
- **launch tilt**: up to about 10 degrees, top away from the hero (+10.4, +7.2, +2.8, 0 over f24-27), back upright in 3-4 frames (frames 24-28, 51-55, 76-80, 784-787; confidence medium)
  - Method: PCA long-axis angle of the violet mask
- **enemy squash and stretch**: on flash: +14-17% taller (top up 13 px), width unchanged. Airborne: +10-15% long, -10 to -15% wide. Landing (1 frame): bbox +11-13% wide, -9 to -11% tall (f29 72x81, f56 71x83, f81 72x82); up to +20-22% wide, -15% tall at f788 (77x77). Rebound (2 frames): +8% tall, -5% wide. Normal by landing+4 (frames 44-48, 24-34, 51-60, 76-84, 784-792; confidence medium)
  - Method: vertical and horizontal luminance profiles of the white enemy; PCA 99% extents and bbox of the violet mask
- **hero anticipation, lunge and recovery**: wind-up 5 frames (f12-16), back 26 px with a squash to 77x88; strike f17-20 (+76 px in x from the crouch, +54 from rest, about 0.85 enemy width), with a +8% tall stretch at f19; held at contact through contact+4; snaps back to rest in 2-3 frames (f25-27) (frames 12-28, 39-56, 772-788; confidence high)
  - Method: orange-mask centroid and bbox per frame
- **tip glint**: one frame, the first forward-swing frame, 2-3 frames before the first white frame. A 4-point star with a core about 20 px and horizontal spikes about 95-100 px across. Followed next frame by about 6-10 white-blue streak shards, 5-25 px long, near the tip (low sweep), or 4-7 (over-the-top) (frames 17, 18, 44, 45, 69, 70, 776, 777; confidence medium)
  - Method: 2x-zoom frame reading; connected components of min channel >150 excluding the blade
- **trail lifetime and size**: visible 8-9 frames (267-300 ms): grows over 1-2 frames before the flash frame, holds 3-4 frames, dies tail-first in 2-3 frames (the last frame is a remnant). Low-sweep arc about 160-175 px wide at contact (about 2.7 widths). Over-the-top arc about 260 px wide including the white head (blue part 186-189 px), apex about 98 px (about 1.55 widths) above the hero's head. Head thickness about 40-60 px, tapering to a point (frames 18-27, 45-53, 777-786; confidence medium)
  - Method: blue-trail mask count and bbox per frame (B>150, G>R+25, B>G+15)
- **camera punch at impact**: about 1-1.5% zoom-in at contact or contact+1, plus a 3-7 px frame kick (about 0.05-0.1 enemy width) that flips direction once. Examples: f73 +1.4%/+3.3 px, f74 +0.7%/-0.9 px, f75 +1.1 px, flat by f79; f830 +1.5%/(-4.3,-5.5) px, f831 +1.0%, f833 +1.4 px overshoot, flat by f835. Back to baseline in 4-6 frames. On top of this, the camera drifts slowly (intro push-in to +1.5%; step-5 pull-out to -2.5%) (frames 71-80, 45-55, 804-813, 829-839, 0-92, 766-858; confidence low)
  - Method: high-passed floor-grid patches (5-7 patches away from the action), NCC shift per patch with subpixel refinement, least-squares fit of zoom about (288,450) plus translation, against the frame before contact
- **whole-frame brightness on impact**: mean luma about 25-27 rising to 34-37 (+30-40%), and near-white pixels 0.13% rising to 1.35-1.6% on the hold frames, back to baseline about 6 frames after the first white frame (frames 19-26, 45-53, 70-78, 776-786; confidence high)
  - Method: metrics.csv luma and white_pct

**Colours.** #FDFDFD / #FDFCFF enemy hit-flash core (f20, f46, f72); #D1F3FF to near-white: slash head; #A4CFF6 slash ice blue; #7A98CA slash steel blue; #5C6E8D slash darker body; #414A61 bloom haze around the slash; #6E66CC enemy body, #4F4BA7 enemy shade edge, #8286FF enemy top highlight; #F78534 hero orange mid, #FFA353 lit, #AC5A22 shade; #E3F4FF sword blade, #333C62 crossguard; #10182B floor, #0E1629 background

**Rule.** Sell a sword hit as a stack in this order: a tip glint on the first strike frame; a trail that grows with the blade and peaks on contact; the boom on the contact-pose frame; a white enemy flash starting the next frame for 4-5 frames; a 3-frame full freeze while the VFX keep moving; a launch back about one body width with a small away-tilt; a squash on landing and a short rebound; and the trail gone within about 6 frames of contact.

## Step 1: Trace the tip

**Narration.** Step 1, trace the tip. Follow the blade through the whole swing.

**On screen.** ① TRACE THE TIP! | FOLLOW THE BLADE... | THROUGH THE WHOLE SWING!

**What you see.**

The intro captions fade (about f96-104). The camera dollies in over f100-111: enemy width goes from 61 to 80 px and it shifts from (371,431) to (481,392). The numeral '1' appears at f108 and 'TRACE THE TIP!' is written by about f120. The hero then plays combo hit 1 (the low horizontal sweep) in slow motion, from the wind-up at f124 to the top at about f180. A pale-yellow polyline is laid down at the blade tip, with round dot markers (about 8 px) added roughly every 5-7 frames, the first at about f128 and the ninth by about f185. The hero leans about 20-25 degrees toward the enemy mid-swing. The 9 dots, in order: (141,544) front-left at floor level; round the front (221,571), (304,574), (374,552); up the enemy side (418,511), (434,460); then over the top and behind (417,406), (372,358), (310,323). In screen terms the path sweeps about 3/4 of a loop: left, down, right, up. The sword holds up until about f192, then snaps back to rest at f196-204. The trace stays on screen through steps 2 and 3.

**Measurements.**

- **tip path size**: 302 x 258 px on screen = 3.8 x 3.2 enemy widths (79-80 px in this zoomed view). Horizontal radius from the hero centre (about 241,438) to the rightmost point is 192-196 px (about 2.4-2.5 widths) (frames 185, 200, 230, 290; confidence high)
  - Method: yellow-mask bbox; dot centroids from connected components
- **reach**: the path's rightmost point (x=434-437) touches the enemy's near edge (half-max left edge at about 435): the arc reaches exactly to the target's surface (frames 230, 300; confidence medium)
  - Method: yellow dots compared with the enemy row profile
- **number of samples**: 9 dots, spaced 53-84 px (closest on the enemy side, 53-60 px, where the tip slows as it turns upward) (frames 185-290; confidence high)
  - Method: connected components of dense yellow pixels
- **slow motion**: demo swing about 56 frames (f124-180, 1.9 s) against 7-9 frames for the same arc in gameplay (f16/17-24/25), about 7-9x slower (frames 124-180 compared with 16-25; confidence medium)
  - Method: frame reading
- **dolly into the construction view**: x1.3 (enemy 61 to 80 px) over f100-111 (12 frames, 400 ms), eased (frames 96-129; confidence high)
  - Method: enemy mid-row width and centroid per frame

**Colours.** #F1DB79 to #F9D076 traced tip path and its dots (anti-aliased line medians about #FACE74); #F78534 hero; #6E66CC enemy; #10182B floor

**Rule.** Record the blade-tip position over the entire swing, wind-up through follow-through, and use that exact path, which should just reach the target's near surface, as the outer edge of the slash.

## Step 2: Make an arc

**Narration.** Step 2, make an arc around the tip reaching almost down to the hilt.

**On screen.** ② MAKE AN ARC! | AROUND THE TIP... | ALMOST DOWN TO THE HILT!

**What you see.**

The heading writes on from f204 ('2') to about f218. Up to f224 only the yellow tip path is showing. At f225 a pale-blue copy appears exactly on top of it. It sits there for 2-3 frames, then scales down toward the hero's sword hand from f228, fastest over f228-232 and settling by about f241 (ease-in-out). It ends as a small arc wrapping just around the hilt and hand, drawn over the hero's body: from the crossguard (about (232,470)) round the hero's right side (rightmost about (299,437)) to near the top of the hero (about (262,397)). The yellow path stays as the outer edge, so the two arcs bound a band covering most of the blade length.

**Measurements.**

- **inner arc radius as a fraction of the tip radius**: about 0.30: rightmost point 58 px from the hero centre against 196 px for the tip path. The band spans about 70% of the radius (frames 244-300; confidence medium)
  - Method: ruler reading of a 2x crop of frame 260
- **shrink animation**: about 14-16 frames (f227-241, about 500 ms), ease-in-out (slow first 1-2 frames, fastest f228-232, decelerating to f241) (frames 225-244; confidence medium)
  - Method: frame-by-frame montage

**Colours.** #F1DB79 outer (tip) path; #8FC0E9 to #99BDDB inner arc (as drawn after f240; whiter #B6C5DC while overlapping the yellow path at f225)

**Rule.** Make the slash a band: outer edge on the tip path, inner edge at about 0.3 of the tip radius, just short of the hilt, so it covers most of the blade rather than only a thin line at the tip.

## Step 3: Make it a mesh

**Narration.** Step 3, turn it into a mesh so a texture can go on it.

**On screen.** ③ MAKE IT A MESH! | FILL THE ARC... | THE TEXTURE GOES ON IT! | annotation: 240 TRIS (with a curved arrow along the arc)

**What you see.**

The heading writes on from f308 ('3'), complete by about f320. Over f344-360 (16 frames) the band between the two arcs fills with a UV checker, sweeping from the swing start (front-left) to the end (top). There are about 6 checker rows across the band, with squares narrowing toward the inner edge, so U runs along the swing and V across it. From about f364-368 a yellow hand-written label '240 TRIS' appears near the hero's top, with a curved yellow arrow along the mid-arc pointing toward the swing end. The camera pulls back over f381-390 while the fan fades. The combo then plays in real time with the raw mesh. On the first forward-swing frame (f393, f415, f437) the whole fan appears at full size around the hero, drawn over the hero's lower body. It stays static while the blade sweeps through it. The enemy flashes white at f396, f418 and f440, 3 frames after each pop. The fan fades to grey over 2 frames (f401-402) and is gone at f403.

**Measurements.**

- **mesh budget**: 240 triangles (on-screen label) (frames 364-384; confidence high)
  - Method: read the label at 2x zoom
- **raw mesh lifetime in gameplay**: full opacity 8 frames (f393-400) plus a 2-frame fade (f401-402), so 10 frames (333 ms) on screen, popping 3 frames before the first white frame. The same for the other two hits (f415-424, f437-446). Combo cadence 22 frames (733 ms) (frames 393-403, 415-425, 437-447; confidence high)
  - Method: count of pixels with luma>200 (and >120, >60) that are low-saturation in the fan region, per frame
- **pop-in brightness**: frame luma 27.0 to 35.2 in the single pop frame (+8.2). It then holds 35.1 and 34.8, reaches 36.9 at contact because the enemy flash adds +2.1, and decays 34.9, 33.5, 30.6, 27.0 over the fade (frames 392-403; confidence high)
  - Method: metrics.csv
- **fill-on animation in the construction view**: 16 frames (533 ms), start to end of the arc (frames 344-360; confidence medium)
  - Method: frame reading
- **fan occludes the hero**: orange hero pixels drop from 4649 to 3438 at the pop frame: the flat fan is drawn over the hero's lower body (frames 392-393; confidence medium)
  - Method: orange-mask pixel count

**Colours.** #ECF5FE checker light square (construction view), #E6EFFE in gameplay; #AEBAD9 checker dark (lavender) square (construction), #B6B6D0 in gameplay; #FCD172 '240 TRIS' annotation and arrow

**Rule.** Build the band as a light ribbon mesh (about 240 tris) whose UVs run U along the swing and V from hilt to tip, and check the UV flow with a checker texture before adding art.

## Step 4: Fade the tail

**Narration.** Step 4, fade the tail, paint the alpha 0 at the start and blend it in.

**On screen.** ④ FADE THE TAIL! | ALPHA 0 AT THE START... | BLEND IT IN!

**What you see.**

The camera dollies in over f454-463 while the mesh fades in as solid white (grey at f462, solid by f467). The heading writes on f462-472. A thin yellow circle brush cursor appears at the arc's start, at the front-left by the blade, at about f482. It paints along the start of the arc, moving from about (200-223,490-505) to about (322,505) by f510-514, and disappears by about f518-522, as in vertex or texture alpha painting. The start becomes transparent and blends smoothly into opaque white. The camera pulls back over f562-571. In gameplay the mesh still pops in whole on the first strike frame (f575, f598, f620). Its start now reads as a soft smoky fade instead of a hard edge. It stays at full opacity 9 frames, then turns grey and fades over 2 frames, gone at f586/f609/f630. At f635 the blade, pointing horizontally at the enemy during the recovery, shows a single-frame silent bloom flash. It is the only single-frame luma spike in the video and is unexplained.

**Measurements.**

- **alpha ramp along the arc after painting**: at 80% radius (background luma 29, opaque 253): alpha about 0 at the very start, 0.11 at 5%, 0.44 at 15%, 0.59 at 20%, 0.71 at 25%, 0.81 at 30%, 0.89 at 35%, 0.95 at 40%, opaque from about 40-45% of the arc length onward. A concave curve: steep at first, easing into full opacity. The 65% radius gives the same profile. Before painting (f470) the whole arc is 253 (frames 470, 560; confidence medium)
  - Method: luminance along the step-1 dot path pulled 20% (and 35%) toward the hero centre; the 10% sample falls on the blade and is skipped
- **brush size and travel**: ring diameter about 125-130 px (about 1.6 zoomed enemy widths, about 0.4 of the arc's outer width). It travels about 100-120 px along the arc start over f482-514 (frames 482-518; confidence medium)
  - Method: bbox of the thin yellow ring (partly hidden where it crosses white)
- **faded-mesh gameplay lifetime**: full opacity 9 frames (f575-583) plus a 2-frame fade to grey (f584-585), gone at f586: 11 frames (367 ms) on screen. Contact (first white frame) 3 frames after the pop (frames 575-586, 598-609, 620-630; confidence high)
  - Method: luma>200 low-saturation pixel count per frame
- **f635 flash**: single frame, frame luma 26.7 to 30.9 to 26.8, with a bloom halo on the blade; no audio event (about -46 dB) (frames 634-636; confidence high)
  - Method: metrics.csv spike search over all frames; audio RMS

**Colours.** #F7F9FC solid white mesh; #E1DD91 brush circle (thin yellow ring; about #DEC8A0 where blended over white); #10182B background showing through the faded start

**Rule.** Bake an alpha ramp along the swing: alpha 0 at the swing's start, rising quickly then easing to full opacity about 40-45% of the way along, so the trail never shows a hard starting edge.

## Step 5: Slash texture x panning mask

**Narration.** Step 5, the best part, tile a slash texture and multiply it by a mask that pans along it so it flows with the swing. (TikTok ASR heard 'switch' for 'swing'.)

**On screen.** ⑤ SLASH X MASK! | TILE A SLASH TEXTURE... | PAN A MASK ALONG IT! | inset labels: SLASH TEXTURE × MASK (with an arrow ↗ by MASK)

**What you see.**

The camera dollies in over f640-649 (enemy 61 to 76 px) as the heading writes on ('5' at f645, 'SLASH X MASK!' by about f655). f646-741: the mesh now carries a tiled streak texture of about 6-8 concentric streak lines running along the arc. They are mid blue with pale highlights, semi-transparent over the dark floor, and the step-4 faded start is still visible. The streaks change slowly in place (a subtle boil), with no visible scroll. From about f690-695 a yellow-framed swatch at the bottom-left shows the texture: horizontal grey-white streaks on black. By f740, '× MASK' and a second swatch appear: a horizontal gradient from black (left) to white (right) with a feathered bright end. f742: the textured mesh vanishes and a 1-frame white flash appears at the arc's start by the blade. f743-754: the product of the two is a short, bright band that travels along the arc, from the front-left start round the bottom and up the enemy side to the end at the top. Its head is white-hot, its body blue and streaky, and its tail fades to nothing. From f745 a yellow curved arrow beside the arc shows the direction, and a ↗ appears by MASK from about f751. f753-763: what is left thins to a streak and a bright sparkle point at the arc's end, fading out as the camera pulls back (f756-766). Then the combo plays with the finished effect (first white frames f779, f805, f830, identical to the intro).

**Measurements.**

- **mask pan speed and easing**: band median angle around (245,440) (0=right, + up): -68, -54, -39, -29, -16, -3, +13, +27, +34, +40, +47 degrees over f744-754. That is about 11.5 degrees per frame on average, about 13 in the middle (f746-750), easing to about 7-8 over the last 4 frames. The band traversal from the f742 start flash to the end takes about 12 frames (400 ms); with the lingering sparkle, about 20-22 frames (700 ms) to vanish. In gameplay the trail lives 8-9 frames (frames 742-764; confidence medium)
  - Method: median angle of near-white pixels (blade masked out; the MASK swatch's white end sits at a fixed angle and biases late medians slightly)
- **visible window length**: about 40-70 degrees of arc lit at once (for example about -51 to -9 at f747, about -23 to +45 at f750): about a third to a half of the swing (frames 746-751; confidence medium)
  - Method: 5th to 95th percentile angle of the bright pixels
- **band brightness envelope**: near-white pixels above the swatch baseline (about 600): about 1500 (f744), 3700, 6000, 8400, then a peak of about 9400 (f748-749), 8800, 7100, 4300, 2200, 1100 (f754), about 100 by f755. A blue-tinted remnant persists (blue count 1207 at f755, 621 at f758, 419 at f761, 207 at f763), back to baseline at f764 (frames 742-764; confidence high)
  - Method: min-channel >200 and blue-mask counts in y300-590, blade region excluded
- **texture motion**: not static but with no rigid scroll. The mesh region changes 1.6-3.9 grey levels per frame (8-10 over 4 frames) against about 0 on the floor. Polar-unwrapped zero-shift correlation is 0.987 (1 frame), 0.97 (2), 0.93 (4), 0.83 (8). No angular or radial shift beats zero shift (at most about 0.2 degrees per frame). Reads as a slow in-place boil; the visible flow comes from the mask (frames 660-740; confidence low)
  - Method: region mean absolute difference; polar unwrap about the hero (3 centre/ellipse guesses) with angular-derivative cross-correlation
- **dolly into the construction view**: x1.25 (enemy 61 to 76 px) over f640-649; pull-out over f756-766 (frames 638-651, 756-769; confidence high)
  - Method: enemy mid-row width per frame

**Colours.** #436595 / #4E81B7 tiled streak texture on the mesh (step-5 view); #D3F3FF to near-white band head; #A2C8F5 / #7A97C8 band body; #D5C88A / #F8DF78 yellow inset labels and direction arrow; inset texture: grey-white streaks on black; inset mask: black-to-white horizontal gradient

**Rule.** Shade the ribbon as a tiling streak texture multiplied by a gradient mask, and pan the mask's U offset from the swing's start to its end in step with the blade (ease-out at the end). Only a short window with a bright head and a fading tail is then visible, and it travels with the sword.

## The kill or finisher

This video has no kill or finisher. The enemy is a dummy with no health bar that is hit 12 times and always resets. What happens on every hit was measured instead, consistently across all 12. (0) Contact pose, frame N-1: the blade reaches the still-violet enemy, and the low boom is already sounding (onset about 45-60 ms before frame N). (1) First flash frame N: the enemy turns solid white (#FDFDFD) with a big bloom halo. Its top rises about 13 px (+14-17% height) while width and bottom are unchanged. Whole-frame luma rises from about 26 to 34-37 (+30-40%). The camera punches in about 1-1.5% with a 3-7 px kick that flips direction once and settles in 4-6 frames (low confidence). (2) N to N+2: everything holds for 3 frames (100 ms; once only 2) while the slash keeps flickering. The hero's body stays at its contact position 2 more frames while the sword follows through. (3) N+3: the enemy, still white, is launched away from the hero. At N+4 it is violet again, +59 px back (about 0.94 enemy width) and 37 px up on screen (about 21-27 px true lift, 0.33-0.43 width), tilted about 10 degrees away. The flash lasts 4-5 frames in total. (4) Airborne about 6 frames (200 ms), stretched +10-15% long and -10 to -15% wide, drifting back toward its start, with the tilt gone after 3 frames. (5) Landing: a 1-frame squash, about -9 to -15% height and +11 to +22% width, then a 2-frame rebound stretch (+8% tall), then normal. (6) It slides home over about 7 frames (233 ms). From the first flash frame to full rest takes about 16 frames (533 ms). The next swing's flash comes 22-26 frames after the previous one.

## Sound

No music bed: the 10 ms RMS floor is -52 to -66 dB (10th to 5th percentile), and gaps reach -85 to -90 dB. Only narration and SFX. Each swing has two layers. (1) WHOOSH: broadband air noise in the 5-16 kHz band. It rises during the wind-up, about 130-400 ms (4-12 frames) before the first white frame (for example from about 12.95 s for the f396 hit, when the wind-up starts at f388). It peaks 34-143 ms (median about 85 ms, about 2.5 frames) before the flash frame, around the glint and strike frames. (2) IMPACT: a low thump/boom with a fundamental of 48-52 Hz, the same on all 12 hits, plus energy in the 1-3 kHz band at the hit. Its peak level (4 ms RMS, 20-180 Hz) is -15.0 to -21.4 dBFS. It falls 25 dB in about 180-270 ms (median about 240 ms; one hit 103 ms). Alignment against the first white-flash frame time n/30: low-band onset (15 dB below peak) at -42 to -78 ms (median -59 ms), -6 dB point median -49 ms, peak median -45 ms (range -62 to +13 ms). On the cleanest hits f578/f601/f623: onset -48/-43/-47 ms, peak -34/-30/-41 ms. So the boom lands on or just before the contact-pose frame (N-1), about 1.5-2 frames ahead of the flash, never after it. Container sync was checked: the audio edit list (skip 7106 samples) and the video edit list (1024 ticks) are applied, and 8 kHz and 44.1 kHz decodes align at lag 0. Pitch: no audible randomisation (fundamental constant within about 4 Hz). Seven hits fall in narration gaps (f396, f418, f440, f578, f601, f623, f830). Their 1/3-octave spectra correlate 0.84-0.98. f440 and f601 (and probably f779) form a second group (0.98 within, 0.84-0.88 to the rest), which suggests 2 alternating or random sample variants on about 2-3 of the 12 hits. No separate SFX could be isolated for the glint, shards, step-1 dots, brush or mask pan, because narration overlaps those moments. The f635 blade flash is silent.

## Principles

- Derive the effect from the real motion. The slash's outer edge is the sampled blade-tip path of that exact swing, and the path reaches exactly to the target's near surface (step 1, x≈435).
- A slash is a travelling window, not a shape. At any instant only about 40-70 degrees (about a third to a half) of the swing arc is lit: a white-hot head at the blade, a blue streaky body and a transparent tail. Showing the whole arc at once (steps 3-4 gameplay) reads as a flat fan.
- Taper toward the past. Make it thick and bright at the blade (about 40-60 px, 0.65-0.95 enemy widths), thin and transparent at the tail. Bake alpha 0 at the swing start, ramping quickly then easing to opaque by about 40-45% of the arc.
- Let the trail's brightness build to contact, not arrive at spawn. The finished trail ramps over 2-3 frames (luma 27.4, 28.5, 29.1, 32.5, 36.6) and holds through the freeze. The raw fan dumps its full brightness (+8 luma) in one frame, 3 frames before the hit, so contact adds little.
- Timing budget at 30 fps: glint on the first strike frame (2-3 frames before the flash); boom on the contact-pose frame; flash from the next frame for 4-5 frames; full freeze 3 frames; launch airtime about 6 frames; trail about 8-9 frames total, gone about 6 frames after the first flash frame. Every effect ends well before the next hit (22-26 frames apart), so nothing stacks.
- Freeze bodies, not VFX. During the 3-frame hitstop the hero, blade and enemy hold while the slash keeps flickering. The hero's body can stay at contact 2 more frames while the weapon follows through.
- Layering order: clean geometry (ribbon mesh), baked alpha ramp, tiling detail texture multiplied by a panning mask, then the extras the steps never name but the finished swipe has: tip glint star, streak shards, big bloom, white enemy flash with a vertical stretch, away-tilted launch, landing squash and rebound, a small camera punch, and squash-stretch on the hero's wind-up and lunge.
- Use debug views to build it: a tip-path trace, a UV checker for flow and a triangle count. Keep it cheap (240 tris).
- Colour contrast: a cold white/ice-blue slash (near-white head, #A4CFF6, #7A98CA) against the warm orange hero and violet enemy on dark navy. For Echoes, this hue (about 210-220 degrees) is clear of Ember #FF5A36, Bright Heal #5FE873 and Violet #B79CF0, so it fits as a hero-attack colour. Spell out for the sword template that a hero slash's white-hot head must not borrow Ember.
- Sound split: a high whoosh (5-16 kHz) that starts in the wind-up and peaks about 1-4 frames before the flash, plus a low boom (about 50 Hz) that starts about 1.5-2 frames before the first white frame, i.e. on the frame the blade meets the target. The same hit-feel stack runs on every hit regardless of how polished the trail is.
- Transfer to Echoes' similar high three-quarter camera, in relative units (enemy capsule width about 63 px wide view, 80 px zoomed): the slash's outer radius is about 2.4-2.5 widths from the wielder's centre (the target stood 3.0 widths away, centre to centre). The inner edge is about 0.3 of that radius. The over-the-top arc rises about 1.5 widths above the head. The knockback is about 0.95 width back, with about 0.35-0.45 width of true lift (0.6 on screen) and about 10 degrees of tilt. The camera punch is about 1-1.5% zoom with a 0.05-0.1 width kick.

## Extra tips

- 'If you want a sword swipe like this, do these five steps.' The hook plays over the finished 3-hit combo; on screen: 'IF YOU WANT A SWIPE LIKE THIS,' then 'DO THESE 5 STEPS!' in yellow.
- 'Step 5, the best part,' The creator flags the slash texture times the panning mask as the step that sells it. Steps 3-4 alone still look like a flat fan popping in.
- On-screen annotation '240 TRIS' (step 3), with a curved arrow along the arc: the whole slash ribbon is a 240-triangle mesh, a cheap budget.
- Inset recipe card (step 5): 'SLASH TEXTURE' × 'MASK', two swatches with a multiply sign. The texture is horizontal grey-white streaks on black; the mask is a black-to-white horizontal gradient, with a ↗ arrow by MASK and a yellow curved arrow beside the arc showing the pan direction.
- Debug visualisations used as teaching aids: yellow dots on the traced tip path (step 1), a UV checker on the mesh (step 3), and a paint-brush circle for the alpha (step 4).
- Outro: 'Send this to your friends.' / 'SEND THIS TO YOUR FRIENDS!' in yellow with a paper-plane icon. No tip content.

## Uncertain

- Camera punch (zoom about 1-1.5%, a 3-7 px kick that flips direction once, settled in 4-6 frames) rests on floor-grid patch fits whose scores fall to 0.2-0.6 on impact frames because of the blocky bloom. The pattern repeats on 5 hits, but amplitudes are about ±0.5% and ±2 px.
- The slow camera drift (intro push-in about 1.5%, step-5 pull-out about 2.5%) is measured from the grid and the hero-enemy spacing. It could be a scripted cinematic camera, or a follow camera that the hits nudge.
- The 45-60 ms lead of the boom over the first white frame could be the game playing the sound on the contact frame and drawing the flash a frame later, or a capture offset; the container edit lists themselves are applied correctly.
- Whether the step-5 streak texture scrolls: it changes in place (correlation 0.99 to 0.83 over 8 frames) but shows no rigid angular shift. It may boil, cross-fade, or scroll too slowly to resolve.
- Whether the thump varies by sample variant or randomly: only 7 hits are free of narration and 2 of them split from the rest.
- The +14-17% vertical stretch of the white enemy on impact has a sharp edge and no lateral growth, so it is probably real, but bloom could add a few px.
- The true 3D swing angle cannot be measured. '240' on screen is a triangle count ('240 TRIS'), not degrees. The tip path covers about 3/4 of a loop in screen space.
- Lift height, knockback distance and arc radii are screen-space pixels under perspective. World-unit conversion assumes the hero and enemy capsules are equal width (measured 64-66 px against 63-64 px in the wide view).
- The step-2 inner-arc radius ratio (about 0.30) is a ruler reading on one frame.
- Whether the raw fan is unlit and two-sided cannot be seen; it looks flat-shaded.
- f635: a single-frame, silent bloom flash on the blade during the step-4 recovery. It is unexplained; it could be an edit transition or a stray glint.
- The creator's game probably ran at 60 fps and was captured at 30 fps, so every frame count is ±1 frame (±33 ms). The construction views are slowed (about 7-9x in step 1), so only the gameplay segments give real timings.
- The streak shards after the glint (about 6-10) come from a brightness threshold. They may be pieces of the slash texture appearing under the mask rather than separate particles.
- Hero lean angle (about 20-25 degrees at contact) is a by-eye reading; PCA of the orange mask is biased by shading.
- Caption ellipses: the captions end in a short trailing mark, transcribed as '...'.

## Verify verdicts

- **confirmed**: Video is 576x1024, 30 fps, 30.67 s (920 frames); audio present
  - ffprobe: video nb_frames=920, duration 30.667 s, 30/1 fps; AAC 44.1 kHz stereo 30.625 s.
- **corrected**: Enemy is about 58 px wide (85-90 px tall) in the wide view and about 70 px wide in zoomed views
  - Wide view, f10: half-max row profile at y=432 runs x≈338-403 (63-64 px); violet bbox x339-402, y387-477 (64x91). Zoomed steps 1-4 (f300 row y=390): x≈435-514 (79-80 px). Step 5 zoom (f650-756): 76-77 px. Hero at rest is 64-66 px wide, 96-98 px tall.
- **corrected**: Centre-to-centre spacing 191 px = 3.3 enemy widths
  - Hero centroid (178,472), enemy (370,432) at f10, so 191-192 px is confirmed, but that is 3.0 enemy widths at the measured 63-64 px. Zoomed view: (241,438) to (474,390) is 238 px / 79 px = 3.0 widths.
- **corrected**: Enemy colour #8782EA mid, #665FBE shade
  - f10: centre pixels #6F6ACF/#6F6ACD, row maximum #7068CC, mask median #6B64C9; right-edge shade #4F4BA7 (5th pct #4F4BA7); top highlight up to #8286FF (95th pct). #8782EA is a highlight value, not the mid.
- **confirmed**: Hero orange #F88835 mid, #FF9F52 lit, #C76928 shade; blade #E3F4FF about 82 px long
  - Row y=472 at f10 peaks #F88635 (centre pixel #F58332); 95th pct #FFA353, 5th pct #AC5A22. Blade mask median #E3F4FF, length along PCA axis 80 px (about 1.3 enemy widths). Crossguard navy about #333C62.
- **corrected**: Camera is static in gameplay
  - Floor-grid patch tracking (5 patches, affine fit about (288,450)) against f10. The intro slowly pushes in: scale 0.9976 (f0), 1.003 (f18), 1.009 (f24-44), 1.0145 (f54-71), 1.013 (f86-92). Step-5 gameplay slowly pulls out: 1.000 (f770) to 0.975 (f858). Corroborated by hero-enemy spacing: 192 px at f10 to 195 px at f90; 195 px at f770 to 188 px at f858. Each hit adds a small punch on top (see the camera-punch row).
- **corrected**: Camera dollies in about x1.2 for each construction view (f90-126, f458-462, f644-648) and back out for gameplay
  - Enemy mid-row width per frame: 61 px at f99 grows to 80 px at f111 (x1.3), over f100-111. Step 4: 64 px at f454 to 79 px at f464 (f454-463). Step 5: 61 px at f640 to 76 px at f649 (x1.25). Pull-outs at f381-390, f562-571 and f756-766. Each move takes 10-12 frames (333-400 ms) and is eased.
- **confirmed**: Impacts at f20/46/72, f396/418/440, f578/601/623, f779/805/830, 22-26 frames apart
  - The first frame with violet count ~0 is the flash frame in each case. Gaps: 26, 26 (intro); 22, 22 (step 3); 23, 22 (step 4); 26, 25 (step 5). Added: the intro and step-5 combos run at 25-26 frames per hit, steps 3-4 at 22-23.
- **corrected**: Construction views run in slow motion, about 9x (56 frames against about 6)
  - Step-1 swing runs f124 (wind-up) to f180 (top), 56 frames. The same arc in gameplay runs f16/17 to f24/25 (7-9 frames), so about 7-9x, not a fixed 9x.
- **corrected**: Sub-captions type on word by word
  - Captions type on character by character: f10 shows 'IF YOU W' and f20 shows 'IF YOU WANT A SWIPE LIKE TH'.
- **confirmed**: Header #8DC1E8, punch lines yellow #F8DF78, sub-captions light blue
  - Header at f300: median #8BC1EB, bright #93C7F1. Yellow 'DO THESE 5 STEPS!' at f80: #F6E082 to #FCE58A. Outro yellow #FCDF77. Sub-captions #90BFE3 to #9BC7ED.
- **confirmed**: Hit 1 wind-up f12-16 (back about 26 px), lunge +54 px from rest at contact, recovery f25-27
  - Hero centroid: (178,471) at f10, (156,487) at f16 (22 px left, 15 px down = 26.6 px), (212,465) at f19, (232,473) at f20 (+54 from rest, +76 in x from the crouch), about 230 through f24, then 206, 184, 180 at f25-27.
- **corrected**: f19: hero stretches and leans toward the enemy (bbox 59x98 against 63x91 at rest); hero leans 15-20 degrees
  - My bbox: f19 64x104 against 64x96 at rest (+8% tall, motion-blurred, nearly upright). f16 wind-up is a squash: 77x88 (crouched, leaning back). The clear lean toward the enemy is at f20-22, about 20-25 degrees by eye. PCA gives +17/+18 against -17 at rest, but shading biases that. The step-1 demo lean (f164-180) is similar.
- **confirmed**: Tip glint: one 4-point star frame on the first strike frame, 2-3 frames before contact (f17, f44, f69, f776)
  - Star with long horizontal spikes about 95-100 px across and a core about 20 px, only at f17/f44/f69/f776. Contact comes at f20/f46/f72/f779, i.e. 3, 2, 3 and 3 frames later.
- **corrected**: About 40 spark specks follow the glint on the low sweep, 3-7 on over-the-top swings
  - Connected components of min(R,G,B)>150 in x0-330, y300-600, excluding the blade blob: 6 at f18 (sizes 45-117 px), 8 at f777, 6-7 at f45, 4 at f70. At 2x zoom they are about 6-10 elongated white-blue streak shards, 5-25 px long, around the tip. That is not 40 specks; they may be pieces of the slash texture rather than particles.
- **confirmed**: Enemy white flash 4-5 frames on all 12 hits (20-23, 46-50, 72-75, 396-399, 418-421, 440-443, 578-582, 601-605, 623-627, 779-783, 805-808, 830-833)
  - Violet-mask count 0-60 px (against about 4800-5100 at rest) on exactly those frames. Lengths: 4, 5, 4, 4, 4, 4, 5, 5, 5, 5, 4, 4.
- **confirmed**: Flash core #FDFDFD; white enemy about 15-19% taller with unchanged width
  - Core #FDFCFF/#FDFDFD at f20-22, f46-48 and f72-74. f46 vertical luminance profile through x365-376: white from y≈373 to 483, against 386-480 at rest (f44). The top rises 13 px, the bottom is unchanged, so about +14-17%. Row y=465: white x346-397 against 345-399 at rest, so width is unchanged. The edge is sharp (142 to 253 in 4 px), so this is a real stretch, not bloom.
- **added**: The blade's contact pose precedes the flash
  - f19, f71 and f395: the blade/trail already reaches the still-violet enemy one frame before the first white frame.
- **confirmed**: Hitstop: impact frame plus 2 held frames (3 frames); once (f805) only 2
  - The enemy stays in place and is launched on the 4th frame: f23, f49, f75, f399, f604, f782, f833. At f805 it is launched on f807 (2 held frames). Added: the hero's body stays at about x=230 through contact+4 (f20-24, f779-783) while the sword keeps swinging up from contact+3, so only the first 3 frames are a full freeze.
- **confirmed**: Knockback: enemy to (428,396), +59 px back, about 37 px up on screen, about 25 px true lift; airtime 6 frames; x offset 58, 54, 48, 41, 35, 30; lands about 30 px out; slides home over 7 frames
  - Enemy centroid: (429,395) at f24 (+59/-37), (431,395) at f51 (+60/-38), (432,396) at f76 (+61/-36), (427,392) at f784 (+56/-40). x offsets f24-29: +59, +55, +48, +42, +36, +30. Lands at f29 and slides home over f29-36. Floor slope along the hero-to-enemy line is -0.25 px/px, so true lift is about 21 px at the bbox bottom (f25 bottom 442 against floor 463) and about 27 px at the centroid.
- **confirmed**: Launch tilt up to about 10 degrees away from the hero
  - PCA long-axis tilt (top toward the right = away from the hero): +10.4 (f24), +7.2, +2.8, 0.1 (f27); +9.9 (f51); +11.2 (f76); +8.8 (f784).
- **corrected**: Airborne stretch +8% long, -11% wide (92x51 against 86x57)
  - PCA 99% extents: long 97-101 against 88 at rest (+10-15%), short 53-56 against 62 (-10 to -15%), over f24-28, f51-55, f76-80 and f784-787. Airborne bbox is 56-60 x 101-103 against 64 x 91.
- **corrected**: Landing squash 76x67 px, -11% tall, +16% wide, up to +30% at f788
  - Landing-frame bbox: f29 72x81, f56 71x83, f81 72x82 (+11-13% wide, -9 to -11% tall); f788 77x77 (+20-22% wide, -15% tall). Nothing reaches +30%.
- **confirmed**: 1-2 frame rebound stretch after landing, then normal
  - f31-32: 60-61 x 99 (+8% tall, -5% wide); 64x95 at f33; normal by f34-36.
- **corrected**: Camera punch: scale about 1.025-1.03 on the impact frame, decaying over 4-8 frames, with a 2-8 px offset
  - Floor-patch affine fits against the pre-contact frame. f73: +1.4% zoom with +3.3 px x shift, then f74 +0.7%/-0.9 px, f75 +0.6%/+1.1 px, f76 +0.25%, about 0 by f79. f830: +1.5%, (-4.3,-5.5) px, then f831 +1.0%, f832 +0.5%, f833 +1.4 px overshoot, 0 by f835. f805: +0.6%, (+2.5,+3.2) px, then (-1.2,-1.9), then 0. So: zoom about 1-1.5% (not 2.5-3%) plus a 3-7 px kick that flips direction once and settles in 4-6 frames. Impact-frame fits are degraded by bloom.
- **confirmed**: Whole-frame luma 26 to 34-37 and white 0.13% to 1.4-1.6% at impact, back about 6 frames later
  - metrics.csv: f19-20 luma 31.1 then 34.3, white 1.35% at f20, 0.12% by f26; f779 36.6, 1.41%.
- **confirmed**: Raw fan pops in whole on the first forward-swing frame, 3 frames before contact
  - Grey/white fan pixel count jumps from about 4600 to about 29000 at f393, f415, f437, f575, f598 and f620; contact at +3 frames each time.
- **corrected**: Raw fan visible 9 frames (300 ms), then vanishes as a whole in 2 frames
  - Pixels with luma>200 in the fan region. Step 3: full f393-400 (8 frames), fading f401 (8588 px) and f402 (835 px, grey), gone f403, so 10 frames (333 ms) on screen. Hits 2-3 likewise f415-424 and f437-446. Step 4: full f575-583 (9 frames), grey f584, faint f585, gone f586, so 11 frames (367 ms); f598-608 and f620-629 match.
- **corrected**: Raw fan: luma jumps 27.0 to 35.2 at the pop and stays flat until the pop-out, so the brightest moment is the swing start
  - Step 3 luma: 27.0, 35.2 (pop), 35.1, 34.8, 36.9 (contact, enemy flash), 36.7, 36.7, 36.3, 34.9, 33.5, 30.6, 27.0. Step 4: 26.7, 34.5 (pop), 34.2, 33.8, 35.9 (contact), ... The frame is brightest at contact. What differs is that the fan adds its full brightness (+8 luma) in one frame at spawn, 3 frames early, while the finished trail ramps up to contact.
- **corrected**: Raw fan appears behind and around the hero; unlit and visible from both sides
  - At f393 the fan covers the hero's lower body (orange pixels 4649 at f392 against 3438 at f393; visible in the montage). 'Unlit and two-sided' cannot be seen in the video and is moved to uncertain.
- **corrected**: Finished trail grows over 2 frames, holds, dies tail-first; visible about 8 frames
  - Blue-trail mask (B>150, G>R+25, B>G+15): f18 836, f19 2599, f20 3968 (contact), f21-23 3879/3962/3755, f24 2576, f25 721, f26 56, f27 0. The bbox bottom recedes 559, 525, 463, 391 (tail-first, confirmed). That is 9 frames visible (f18-26) with f26 a tiny remnant; over-the-top hit 2 runs f45-52 (8 frames, grows only 1 frame before contact); step 5 runs f777-785 (9).
- **corrected**: Step-5 gameplay luma: 27.4, 28.5, 29.1, 32.5, peaks 36.6 on f779, then 35.1, 30.9, 28.5, 27.6
  - metrics.csv shows a 4-frame plateau the analysis skipped: f779 36.6, f780 36.7, f781 36.4, f782 36.5, then f783 35.1, f784 30.9, f785 28.5, f786 27.6. The peak is f780, effectively the whole hold.
- **confirmed**: White area at peak 1.4-1.6% (finished) against 2.2-3.0% (raw fan)
  - white_pct 1.41-1.64% at f779-782; 2.20% at f396; 3.03% at f578.
- **confirmed**: Trail colours: white head, ice blue #A5CCF3, sky/steel blue, haze #464D61
  - Luminance-binned medians in the trail at f21: 220+ #D1F3FF, 180-220 #A4CFF6, 140-180 #7A98CA, 100-140 #5C6E8D, 60-100 #414A61. f780 is the same (#D3F3FF, #A2C8F5, #7A97C8, #424C64).
- **confirmed**: Over-the-top arc about 258 px wide, apex about 100 px above the hero's head; low sweep about 175 px wide
  - Hit 2: blue trail top at y=332 at f45-47 against the hero's top at about 430, so 98 px higher. The blue part spans x128-317 (186-189 px), and with the white head reaching the enemy at x≈390 that is about 260 px. Hit 1 at f19-20: blue x208-383 plus the white head.
- **confirmed**: Step 1: 9 dots at (140,544) ... (310,322); path 302x257 px; spacing 54-83 px; reaches the enemy's near edge
  - Yellow components at f290: (141,544), (221,571), (304,574), (374,552), (418,511), (434,460), (417,406), (372,358) (seen at f230), (310,323). Path bbox x136-437, y320-577. Spacing 53-84 px. Rightmost x=434-437 against the enemy's left half-max edge at about 435.
- **corrected**: Step-1 path is 4.3x3.7 enemy widths with a tip radius of 2.7 widths
  - Measured against the 79-80 px zoomed enemy width: 3.8 x 3.2 widths. The rightmost point is 192-196 px from the hero centre (about 241,438), so 2.4-2.5 widths.
- **confirmed**: Step-1 heading writes on at f106-122; swing at f126-185; snap back at f198-202
  - '1' appears at f108 and the heading is complete by about f120. The swing runs from the wind-up at f124 to the top at f180. The sword snaps down at f196-204.
- **corrected**: Step 2: copy appears at f225, shrinks over f225-240 with ease-out to an inner arc at about 0.3 of the tip radius, partly hidden behind the hero's body
  - Every frame f225-244: the copy sits on the path at f225-227, starts shrinking at f228, moves fastest over f228-232, and settles by about f241, so the ease is in-out. At f260 the inner arc runs from the crossguard (about 232,470) to its rightmost point (299,437) and ends near the hero's top (about 262,397). That is 58 px from the hero centre against 196 px, ratio 0.30 (confirmed). It is drawn OVER the hero's body, not hidden behind it.
- **corrected**: Step 3: heading f306-322, checker fill f346-362, '240 TRIS' label with a curved arrow from f366, pull-back f386-392
  - '3' appears at f308, the heading is complete by f320, the fill runs f344-360, and the label and arrow are visible from f364-368. Pull-back by enemy width is f381-390. Checker colours #ECF5FE/#AEBAD9 (construction) and #E6EFFE/#B6B6D0 (gameplay).
- **corrected**: Step 4: brush appears about f478 and paints f486-520; brush diameter about 126 px = 1.8 enemy widths
  - The yellow ring is first detected at f482 (centre about 223,489). By f510-514 it has moved to about (322,505), and it is gone by f518-522. Ring height 124-132 px (confirmed about 126), which is 1.6 zoomed enemy widths (79-80 px), not 1.8.
- **corrected**: Alpha ramp: opaque from about 35% of the arc length
  - Luminance along the step-1 dot path pulled to 80% radius at f560 (background 29, opaque 253; the 10% sample falls on the blade): 5% 55 (alpha≈0.11), 15% 129 (0.44), 20% 162 (0.59), 25% 189 (0.71), 30% 212 (0.81), 35% 231 (0.89), 40% 245 (0.95), 45%+ 253 (1.0). The 65% radius gives the same. Opaque from about 40-45%, with a concave (fast-then-easing) curve. At f470 (before painting) the arc is 253 throughout.
- **confirmed**: f635: single-frame bloom flash on the blade during recovery
  - The only single-frame luma spike in the video: 26.7, 30.9, 26.8. Added: it is silent (10 ms RMS about -46 dB at 21.16 s) and does not occur in any other recovery.
- **corrected**: Step-5 textured mesh looks nearly static; no measurable scroll
  - The streaks change in place. Mean absolute grey change in the mesh region (x250-440, y330-540) is 1.6-3.9 per frame and 8-10 over 4 frames, against about 0 on the static floor. Polar-unwrapped correlation at zero shift is 0.987 (1 frame), 0.969 (2), 0.93 (4) and 0.83-0.84 (8). No rigid angular or radial shift beats zero shift (at most about 0.2 degrees per frame), so this is a slow boil, not a U scroll. Low-medium confidence.
- **confirmed**: Swatch at f692; '× MASK' at f740; start flash f742; band f744-754; mask-pan angles -68 ... +55 degrees
  - Swatch partial at f690 and full by f695; MASK swatch present by f740 and absent at f735. At f742 the textured mesh vanishes (blue 6541 to 183) with a flash at the arc start. Band median angle (my convention converted to 0=right, + up): -68, -54, -39, -29, -16, -3, +13, +27, +34, +40, +47 over f744-754.
- **corrected**: Band thins to a sparkle and is gone at f761; about 18 frames start to vanish
  - Blue remnant counts: f758 621, f760 473, f761 419, f762 332, f763 207, back to baseline (108) at f764, while the camera pulls out over f756-766. From the f742 start flash that is about 20-22 frames (about 700 ms).
- **confirmed**: No music bed; floor about -50 to -65 dB
  - 10 ms RMS: 5th pct -66 dB, 10th pct -52 dB; gaps reach -85 to -90 dB (12.90 s, 300 ms before f578).
- **confirmed**: Thump fundamental 47-52 Hz, the same on all 12 hits
  - Spectral peak in 25-200 Hz over 120 ms: 52, 50, 51, 48, 52, 49, 49, 49, 52, 51, 48, 50 Hz.
- **corrected**: Boom peak about -17 to -21 dBFS (4 ms RMS, 20-180 Hz), decaying about 25 dB in about 300 ms
  - Peaks -15.0 to -21.4 dBFS (f440 -15.0, f20 -21.4). Time to fall 25 dB: 103-266 ms, mostly 180-266 (median about 240 ms).
- **corrected**: Boom alignment: -1, +2, +1 ms on f578/f601/f623; range -61 to +2 ms (median -28) across 12 hits
  - 20-180 Hz, 4 ms RMS. Onset (15 dB below peak) leads the first white frame (t=n/30) by 42-78 ms (median 59). The -6 dB point leads by a median 49 ms. The peak leads by a median 45 ms (range -62 to +13). For f578/601/623: onset -48/-43/-47 ms, peak -34/-30/-41 ms. The per-frame table shows the low band already at -18 to -21 dB 36 ms before each flash frame. Sync check: the edit lists are applied (audio skip 7106 samples, video media time 1024 ticks), and 8 kHz and 44.1 kHz decodes align at lag 0. So the boom lands about 1.5-2 frames before the flash, on or just before the blade-contact pose frame (n-1), never after.
- **corrected**: Whoosh starts 120-400 ms before contact and peaks 25-110 ms before
  - 5-16 kHz, 8 ms RMS: peaks 34-143 ms before the first white frame (median about 85 ms, about 2.5 frames). Onset on the clean hits is about 130-400 ms before (f396 level -85 dB at 12.90 s rising from 12.95 s, as the wind-up starts at f388).
- **corrected**: Only 6 hits are free of narration
  - By caption timings, 7 hits fall in speech gaps: f396, f418, f440 (12.84-14.98 s), f578, f601, f623 (18.96-21.18 s) and f830 (26.92-28.66 s).
- **corrected**: About half the hits have a different spectral shape (similarity 0.15-0.3 against 0.5-0.65), suggesting 2+ sample variants
  - 1/3-octave log spectra over 150 ms from onset, clean hits: f440 and f601 correlate at 0.98 with each other and 0.84-0.88 with the rest; the other five correlate at 0.91-0.98. f779 groups with f440/f601 (0.94/0.91). So 2-3 of 12 hits form a second group. That fits 2 sample variants, not 'half'. Low confidence.
- **confirmed**: No separate SFX for glint, sparks, dots, brush or mask pan
  - Narration overlaps those moments; the f635 flash is silent.
