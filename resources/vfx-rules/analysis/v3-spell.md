# Video 3: how-to-make-a-spell-juicy (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

Vertical 576x1024 video at 30 fps, 53.0 s long. The header 'HOW TO: MAKE A MAGIC ATTACK!' types in during the first second and then stays. It is light blue (about #98C9F3) in a hand-drawn comic font with a wavy underline. The on-screen title says 'magic attack'; the TikTok description says 'spell'.

Structure:
(a) 0.00-4.5 s, split screen. The top panel is the plain cast and the bottom panel is the juicy cast. Both cast in sync every 29 frames (hits on n22, 51, 80, 109).
- 0-1.73 s: both panels are lit.
- n52-56 (1.73-1.87 s): the bottom panel dims to about 47% luma. A red 'FEELS LIKE NOTHING.' types in under the top panel (n54-63).
- n102-108 (3.40-3.60 s): the top panel dims to about 53%. A yellow 'FEELS LIKE MAGIC!' types in under the bottom panel (n105-114) and fades at n134-136.
(b) n136-141 (4.53-4.70 s): the top panel animates into a single view. 'HERE'S THE DIFFERENCE... IN 8 STEPS!' (blue, then yellow) types in from n144 and fades at n190-195. Two plain casts play (dot flights n138-148 and n163-174). A row of circled step dots 1-8 appears around n192-198.
(c) 6.18-49.70 s: a cumulative build-up in 8 steps. Each step adds one layer on top of all the earlier ones, and no layer is ever removed.
- At each step switch, the old label and caption fade over 4 frames. On the next frame the new '(n) NAME!' label starts typing and the enemy's health bar refills to full (n196, 353, 518, 684, 848, 1014, 1194, 1371). This is 0.35-0.46 s after the narrator says 'So step N'.
- Each step plays 5-6 casts at 1 cast per 30 frames (step 8 quickens to 25-26). Five hits per step drop the bar 74 -> about 10 px (11-14 px each). The bar then floors at about 10 px, so it never empties before the finisher. The fill turns from green to red below about one third.
- A blue instruction caption types in word by word in sync with the voice. A red 'BUT ...' caption then names what is still missing (step 8 has none). The current step dot is filled.
(d) 49.72-51.43 s: the kill beat. 'OUT OF HEALTH?' types in from n1493 and 'BURN IT TO ASHES!' from n1506.
(e) 51.47-53.0 s: outro 'SAVE THIS FOR LATER!' with a yellow bookmark icon (from n1555). The enemy respawns at n1562 and is hit once more ('32').

Camera: fixed. There is no camera cut, move or zoom, from a high three-quarter view looking diagonally across a small dark-navy floor patch (#1E263D to #20273D) with light grid lines (#6C738B). The patch fades into a dark navy gradient background (#0A0F1C to #0F1626).
- Hero: orange capsule (#DF7734), about 50x67 px, lower left, centre about (100,499).
- Enemy: purple capsule (#6C5EC5, lit side #7160C9), about 46x68 px, upper right, centre about (392,426). That is about 300 px away, roughly 6.5 enemy widths.
- Health bar: about 74x9 px, floating above the enemy. Fill is green #7FDF70, turning red #ED5957 below about one third, with outline #A5BAD4.
The only screen motion is the in-game camera shake from step 4 on, which is pure translation. Header and captions never move. The health bar and the damage numbers are world-anchored and shake with the scene. This is very close to the Echoes camera.

Cast cycle, frames relative to release R:
- R-12 to R-1: charge (12 frames, 400 ms).
- R: hero lunge and launch.
- R+1 to R+10: flight at about 20 px/frame.
- R+11 = C: contact frame.
- R+12 = C+1: bar drop, camera-shake kick, damage number spawn and enemy flash; the bloom's white area peaks on C+1 or C+2.
- R+18: the next charge begins.

Caption colours: instructions are blue (about #8ABEE4, brightest #9FCCF5), problems are red (about #F66F60) and punchlines are yellow (about #F4DF83 to #FEDE76).

## Before and after

Measured in the intro split, n0-55: the top panel is plain and the bottom panel is juicy. Both share the hero's cast body animation: a lean-back during the charge, then a forward tilt and lunge on the release frame. Both projectiles fly 11 frames (about 367 ms).

PLAIN (top panel):
- Projectile: a cream dot about 10x10 px (#FAEAD2, white core about 6x6) appears at the hand on the release frame (n11), with no charge.
- Flight: it moves at a constant speed with no trail, no glow and no light.
- Contact: it reaches the enemy on n21. On n22 it simply disappears and the bar jumps down about 13 of 73 px.
- Enemy and screen: no change in colour, shape or position. Top-panel mean luma stays 33.4-33.7 and near-white pixels stay at 0-6 through the impact. The floor moves 0.00 px (no shake).
- No sound, no number, nothing left behind.

JUICY (bottom panel, same frames):
- Charge: a 12-frame fire swirl with a white-hot core at the hand.
- Projectile: a glowing orb (about 15 px white core, about 42 px warm halo) with a flame trail about 110 px long that lights the enemy before contact.
- Impact: on n22 near-white pixels jump to about 2000 and panel mean luma rises about 15-18%, decaying over 4-5 frames. The enemy flashes white and squashes, sparks spray through it, and the floor shakes about 2-3 px ((-0.85,+2.04) on n22, (-2.2,-2.0) on n109).
- After: a damage number '35' pops (34x24 white, then 23x17, drifting left and up, living 22 frames). A gold burn rim and a pink inner glow stay on the enemy.

Sound: the juicy panel carries the SFX. The same boom as steps 6-8 (43-47 Hz body) plays on its hits at n22 (onset about 0.64 s) and n109 (onset about 3.52 s), probably with a whoosh before n109. The plain panel's hits are silent. While the plain panel is in focus, the n51 and n80 hits have no SFX at all, and 2.30-2.47 s sits at -80 to -90 dBFS.

So the plain version lacks all 8 layers: anticipation charge, a readable projectile core, a motion trail, an impact burst, target reaction, sound, lingering aftermath and a damage readout. It also lacks the unnarrated camera shake. It keeps only the caster body animation and the instant health-bar drop.

## Step 1: Charge

**Narration.** Step 1, charge. Pull fire out of the air before the cast, but there's nothing there to throw.

**On screen.** (1) CHARGE! / PULL FIRE OUT OF THE AIR... BEFORE THE CAST! (blue) / BUT THERE'S NOTHING THERE TO THROW. (red)

**What you see.**

The bar refills on n196 and the label types in from n198. The first charge starts n199 (R=211). Representative cycle R=301.
- From R-12 (n289), 3-4 pale-gold crescent flame arms appear just in front of the hero's chest on the enemy side. They spin as a pinwheel and spiral in toward a centre about 35 px in front of the hero, at upper-third height.
- The arms reach full brightness by R-10 and stay bright to R-2. The bright area is about 85-98 x 59-70 px.
- Meanwhile the hero leans back: its back edge moves 16-18 px left (x76 -> x58-60) and its top drops 6-8 px.
- On R-1 (n300) the swirl collapses into a tighter, darker orange spiral.
- On R (n301) the swirl is gone. The hero lunges and tilts toward the enemy (bbox x90-139, top y448: +14 px forward, 18 px up) and eases back to rest by about R+11.
- A plain dot about 12x12 px leaves the hand (a speck on R, clear from R+1). It travels 20 px/frame right and about 4 px/frame up, touches the enemy on R+11 (n312) and vanishes. The bar drops on R+12 (n313).
- Nothing else happens at the target: no shake (0.00 px).
- The charge glow lights the hero's front face yellow. The next charge starts at R+18.

**Measurements.**

- **charge duration**: 12 frames = 400 ms (R-12..R-1); bright R-10..R-2; collapse on R-1; gone on R (frames 289-301 (R=301); same in every later cycle; confidence high)
  - Method: count of L>190 pixels near the hand per frame
- **charge swirl size**: about 85-98 x 59-70 px (L>190 bbox), starting about 17 px in front of the hero's front edge; about 1.9x1.4 enemy widths (frames 291-299; confidence medium)
  - Method: bbox of L>190 pixels in x60-260, y400-560
- **structure of the swirl**: 3-4 crescent arms rotating together; only 17-153 scattered px with min channel >230 (no solid white core in step 1) (frames 288-300; confidence medium)
  - Method: frames read + min-channel>230 count
- **hero anticipation and lunge**: back edge x76 -> x58-60 (-16..-18 px, about 0.35 hero width) and top 466 -> 472-474 (6-8 px down) over R-11..R-1; on R bbox x90-139, top y448 (+14 px forward, 18 px up); centroid back to rest by R+11. Also present in the plain version. (frames 286-313; confidence high)
  - Method: strict orange mask (r-g>60, b<80) bbox and centroid per frame
- **projectile in step 1**: dot about 12x12 px at x156, 176, 196, ... 360 over n302-312 (20 px/frame, -4.4 px/frame vertical); contact R+11, bar 36->23 px on R+12; no impact effect (frames 302-313; confidence high)
  - Method: warm-mask component per frame

**Colours.** #FFFACE charge swirl hottest pixels (L>230); #F8EA9E charge arms (L 180-230); #C19B5D charge arm edges / outer glow; #DF7734 hero capsule; #F0C59D / #FAEAD2 plain dot

**Rule.** Before every cast, spin up a visible fire swirl at the caster's hand for 12 frames (0.4 s) while the caster leans back about a third of its width. Collapse the swirl on the frame before release, then launch on a forward lunge.

## Step 2: Core

**Narration.** So step 2, core: a hot ball that swells in the hand, but mid-flight it's just a dot. (Auto-caption ran it together as 'core a hot ball'.)

**On screen.** (2) CORE! / A HOT BALL... THAT SWELLS IN THE HAND! (blue) / BUT MID-FLIGHT, IT'S JUST A DOT. (red)

**What you see.**

The step-2 charge starts n349 while the step-1 label fades (n349-352). The bar refills on n353. First core release R=361 (12.03 s); representative R=451.
- Inside the same charge swirl, a white-hot ball appears on R-11 as a 4x6 px spark. It swells to 30x20 on R-10 and 32x32 by R-9, then holds and pulses at 28-46 px through R-2.
- It shrinks to 28x20 on R-1 and is launched on R.
- In flight it is a small glowing orb: a white core with a salmon-orange halo, slightly comet-shaped and brighter at the front. Its light tints the floor and, 2 frames before contact, the enemy's near side pink.
- A faint ring of the spent swirl lingers at the hand for about 3 frames (n453-455), then embers for a few more.
- On contact (R+11, n462) the orb overlaps the enemy and its near half glows pink for 1 frame. Then the orb is simply gone (n463) and the bar drops. No burst and no shake.

**Measurements.**

- **core swell in hand**: 4x6 px (R-11) -> 30x20 (R-10) -> 32x32 (R-9) -> 28-46 x 26-38 (R-8..R-2; widest 46x27 at R-4, about 0.6-1.0 enemy width) -> 28x20 (R-1) -> launched on R (frames 440-451 (R=451); same pattern 590-601; confidence high)
  - Method: bbox of min-channel>230 pixels near the hand, per frame
- **in-flight orb size vs plain dot**: orb white core about 15x13 px, warm halo about 36-52 px long (warm mask) vs plain dot 10-12 px; core about 0.33 enemy widths, halo about 0.9-1.1 (frames 456-461 vs 15-16 and 302-311; confidence medium)
  - Method: connected components / warm-mask extent
- **projectile as light source**: enemy near side goes pink (#7464C5 -> about #9C7DCA) 1-2 frames before contact; floor under the orb warms (frames 460-462; confidence medium)
  - Method: pixel sample in the enemy core box + frames read
- **impact in step 2**: none: no white pixels on C+1 (n463 = 0), orb gone, bar drops; enemy unchanged; floor shift 0.00-0.06 px (frames 462-467; confidence high)
  - Method: white count + phase correlation

**Colours.** #FFFDE2 core in hand; #F6E19B core/swirl glow; #FFF8EA in-flight orb core; #F5CCB0 orb inner halo; #C88C77 / #CC8973 orb outer halo (salmon-orange); #9C7DCA enemy lit pink by the orb

**Rule.** Grow a white-hot core inside the charge, from a spark to about two-thirds of the target's width within 2-3 frames. Launch that same core as the projectile and let its light tint the floor and the target as it nears.

## Step 3: Trail

**Narration.** So step 3, trail: tongues of flame streaming behind it, but it lands softer than a pillow.

**On screen.** (3) TRAIL! / TONGUES OF FLAME... STREAMING BEHIND IT! (blue) / BUT IT LANDS SOFTER THAN A PILLOW. (red)

**What you see.**

First trail at R=511 (17.03 s); the bar refills on n518. Representative R=601.
- From the first flight frame, a long tapered flame tail streams behind the orb. The head is white-hot and the body golden. Licking flame tongues taper to a point and to thin trailing wisps, and a few sparks are shed along the path.
- The trail is fully grown (about 105-120 px) by mid-flight and keeps that length to contact.
- The projectile moves at a constant 20 px/frame, rising on screen with the floor's perspective.
- At contact (R+11, n612) the head enters the enemy. For the next 5 frames the tail keeps flowing into the impact point and shortens until it is gone (n617), instead of vanishing at once.
- Still no burst, no enemy reaction and no shake. Embers from the launch linger at the hand.

**Measurements.**

- **trail length**: about 105-120 px (2.3-2.6 enemy widths, about 5-6 frames of travel); warm-mask length 118 px at R+10, 106 px at R+11 (frames 605-612; confidence medium)
  - Method: warm mask (r>140, r-b>40, L>110) extent, excluding the hand glow
- **projectile speed**: head advances 16-28 px/frame, mean about 20 px/frame (about 600 px/s, about 0.43 enemy widths per frame), constant; same speed as the plain dot (frames 602-612; confidence high)
  - Method: rightmost min>225 pixel of the head per frame
- **trail drain after contact**: length 106 -> 84 -> 66 -> 46 -> 18 -> 2 px over R+11..R+16, gone R+17 (about 5 frames, 167 ms, about 17-20 px/frame into the enemy) (frames 612-618; confidence high)
  - Method: warm-mask extent per frame
- **flight time**: 11 frames release-to-contact (367 ms) in every cycle (frames R=211..1411 every 30 frames, 1436, 1462, 1508, 1559; confidence high)
  - Method: hero lunge / charge-glow dip vs bar-drop frame

**Colours.** #FFFDE1 trail head; #FADE9E trail body; #BF9569 trail edges / wisps; #7F6552 faint smoke-like outer glow

**Rule.** Stream a tapered flame trail about 2-2.5 target widths long (about 5 frames of travel) behind the projectile. On impact, let it keep flowing into the hit point for about 5 frames instead of cutting it.

## Step 4: Burst

**Narration.** So step 4, burst: a flash and sparks spraying through the enemy, but the enemy doesn't feel a thing.

**On screen.** (4) BURST! / A FLASH... AND SPARKS SPRAYING THROUGH THE ENEMY! (blue) / BUT THE ENEMY DOESN'T FEEL A THING. (red)

**What you see.**

The bar refills on n684. The first burst is at contact n702 (flash n703); representative R=721, C=732.
- C (n732): the orb touches the enemy's left side and lights it pink.
- C+1 (n733): a white bloom swallows the near two-thirds of the enemy. Thin white-yellow streak sparks appear on the far side. The bar drops and the camera kicks.
- C+2 (n734): peak. The round white flash is about twice the enemy's width. About 6 streaks spray out the far side, up and to the right along the projectile's travel line ('through' the enemy), and 3-4 shoot back along the incoming path.
- C+3 to C+4: the flash shrinks back to the impact side and the streaks lengthen outward and break into yellow dots.
- C+5 to C+17: about 10-25 small yellow embers scatter, mostly on the impact side, and fall. A small cluster of red-orange flame flecks clings to the exit side and then the impact side (n738-749).
The enemy's shape does not change. Its colour is washed pink-lavender by the bloom light for about 6 frames, never a flat white silhouette.

NOT NARRATED: from this step on, every impact kicks the camera. The first frame jumps 1-4 px (median 3 px) in a random direction, about 1-2 px back on C+2, about 1 px on C+3, and it settles by C+4. Hero, floor grid and health bar move together while the text overlay stays still. Steps 1-3 had 0 px shift. There is no hit-stop: frame-to-frame change never drops near zero.

**Measurements.**

- **flash timing**: white px (min>215, y300-600): C 1000, C+1 1784, C+2 1907 (peak), C+3 1747, C+4 1055, C+5 553, C+6 354; above 1000 px for 4 frames (133 ms); gone by C+7 (frames 732-739; also 702-708, 762-768; confidence high)
  - Method: count of min(R,G,B)>215 in y300-600
- **flash size**: white core about 2 enemy widths across, centred on the impact side; glow area (L>120) rises from about 9,000-9,500 to about 11,000-11,700 px (frames 733-736; confidence medium)
  - Method: bbox of min>215 and L>120 counts
- **spark streaks**: about 6 exit-side streaks 20-30 px long (0.45-0.65 enemy widths) in a cone of about +/-20-30 deg around the travel direction (up and right), plus 3-4 back along the trail; live C+1..C+5 (frames 733-737; confidence medium)
  - Method: frames read at 1.6x zoom
- **embers and flecks**: about 10-25 yellow dots, 2-4 px, falling and scattering mostly on the impact side, the last gone about C+17-18 (about 0.6 s); small red-orange flame flecks at the exit and impact points over about C+6..C+17 (they persist to about C+25 in later steps) (frames 737-750; 891-899; 1071-1087; confidence low)
  - Method: frames read + yellow / red-orange masks
- **camera shake (unnarrated)**: first-frame kick median 3.1 px (range 0.6-4.2 px over 26 hits), random direction, e.g. (+2.9,0) at C=732, (-3.0,+3.0) at C=942, (+3.1,+2.5) at C=1212; then about 1-2 px opposite on C+2, about 1 px on C+3, settled by C+4 (about 100 ms). Pure translation (two floor patches agree, no zoom); title overlay 0.0 px. About 6-7% of enemy width, 0.5% of frame width. (frames 702-1574 (all impacts from step 4); steps 1-3 C=312, 462, 612 show 0.00-0.06 px; confidence high)
  - Method: sub-pixel phase correlation of floor patches (x120-300, y500-600 and x60-150, y470-540) and the hero region against frame C
- **enemy shape and colour in step 4**: top edge constant at y394 (no squash); far-side box #E8C1E6 (C+1) -> #DCB2E0 (C+2) -> #BEA0DD (C+4) -> base #766DD0 by C+7 (frames 731-739; confidence high)
  - Method: vertical luma-gradient edge detection + mean RGB of box x397-412, y405-450
- **hit-stop**: none: mean frame-to-frame difference in the enemy region stays at 3.4 or above after contact (e.g. 24.3, 9.5, 9.2, 16.7 ...) (frames 730-744; confidence high)
  - Method: mean absolute frame difference in x320-480, y350-500

**Colours.** #FEFBF8 flash core; #E9BCC3 flash halo (pinkish white); #B98E7C outer bloom; #FFF1D6 spark streaks / hot embers; #E8CCA3 cooler embers; red-orange impact flecks about #D96A3A (visual estimate); #E8C1E6 enemy washed by the bloom

**Rule.** On contact, pop a white bloom about 2 target widths wide that peaks on its 2nd frame and stays bright for 4 frames. Spray thin sparks out the far side of the target along the projectile's direction, and shed falling embers that live about 0.5 s. Unnarrated but present from here on: kick the camera 2-4 px in a random direction on the impact frame and settle it within 3 frames, with no hit-stop.

## Step 5: Reaction

**Narration.** So step 5, reaction. Flash it white and make it flinch, but look away and you'd never know it hit.

**On screen.** (5) REACTION! / FLASH IT WHITE... AND MAKE IT FLINCH! (blue) / BUT LOOK AWAY, AND YOU'D NEVER KNOW IT HIT. (red)

**What you see.**

The bar refills on n848. The first reaction is at contact n852 (28.4 s); representative R=871, C=882.
- C+1 (n883): the whole enemy capsule turns flat near-white, a slightly lavender white. On the same frame it squashes: shorter, and slightly wider at the base.
- C+2: it stays white; its top is back up and the middle bulges away from the hit.
- C+3: it overshoots into a slight stretch, taller than rest.
- By C+5 it has settled.
- The white holds for 2-3 frames, then fades through lavender-pink back to the normal purple by about C+15-17.
The burst, sparks, flecks and shake from step 4 play on top. The flinch has no travel: the bottom stays anchored and there is no knockback, only a squash-and-stretch pulse.

**Measurements.**

- **white flash colour and duration**: far-side box: #F0E3F4 (C+1), #F0DEF1 (C+2), #EBD1E9 (C+3), #DCBFE5 (C+4), #CDACDF (C+5), #B99CDA (C+6), #A78DD4 (C+7), #947DCF (C+9), #8470CD (C+12), #7668CA (C+15), base #6F66C9 by C+17. Near-white plateau 2-3 frames (67-100 ms); about half-way back by C+6; back by C+15-17 (500-570 ms). (frames 881-900; also 1061-1080; confidence high)
  - Method: mean RGB of a 15x45 px box (x397-412, y405-450) on the far-side half of the capsule
- **squash on hit**: top edge y392-396 -> y400-404 (-8 to -9 px, about -12% of the 69 px height) on C+1 at 5 columns; bottom anchored at y462-464; right edge +3 px on C+1 (frames 881-883; 1061-1063; confidence high)
  - Method: vertical/horizontal luma-gradient edges at several columns and rows
- **push / stretch overshoot**: C+2: top back to y391, mid-body bulge away from the hit (right edge partly hidden by sparks); C+3: top y388 (+4 px = +6% stretch); C+4 y390; rest by C+5 (y393-395) (frames 884-888; confidence medium)
  - Method: same edge tracking
- **near-white pixel peak vs step 4**: 3060 (step 5, C+1) vs 1907 (step 4, C+2); the white enemy adds about 1100 px (frames 883 vs 734; confidence high)
  - Method: min channel >215 count
- **shake in step 5 impacts**: C=882: (-1.0,0), (+1.2,-1.0), (-0.9,-1.0) px over C+1..C+3; C=942: (-2.9,+2.9), (+1.0,+1.0), 0 (frames 883-885, 943-945; confidence high)
  - Method: phase correlation of the floor patch

**Colours.** #F0E3F4 enemy hit-flash white (C+1); #F0DEF1 enemy white (C+2); #DCBFE5 fade step (C+4); #B99CDA fade step (C+6); #8470CD fade step (C+12); #6F66C9 / #7160C9 enemy normal purple

**Rule.** On every hit, draw the target flat white for 2-3 frames and fade it back over about 12-15 more frames. On the first frame, squash it about 12% with the base anchored; let its middle push away from the hit on the second; overshoot into a small (about 6%) stretch on the third, and settle by the fifth.

## Step 6: Sound

**Narration.** So step 6, sound: a whoosh on the cast and a boom on impact. But one blink later, it looks untouched.

**On screen.** (6) SOUND! / A WHOOSH ON THE CAST... AND A BOOM ON IMPACT! (blue) / BUT ONE BLINK LATER, IT LOOKS UNTOUCHED. (red)

**What you see.**

Visually identical to step 5: charge, core, trail, burst, white flash, squash and shake. Nothing new is on screen. The enemy is back to plain purple by about C+15-17, with no rim; only the small red-orange flecks at the impact spot linger to about C+25.

In the build-up this is the first step with sound effects; steps 1-5 carry narration only. The intro's juicy panel already used the same SFX. The bar refills on n1014. The first SFX cycle is R=1021: its whoosh starts at about 33.95 s and the first boom lands on contact n1032.

Each cast now has two sounds:
- Whoosh: a breathy broadband fire noise. It starts about 2-3 frames before the visual release and is gone by about R+8.
- Boom: a deep 43-48 Hz impact with a short bright crack on top, then a low rumble tail of about 0.3 s. It starts about 2-3 frames before the contact frame.
Both lead their visual events by the same amount, which most likely is a constant capture offset.

**Measurements.**

- **whoosh timing and spectrum**: onset between R-3 and R-2 (about 75-85 ms before the lunge frame); sustains through about R+3 and is gone by about R+8 (about 350 ms); broadband, strongest about 100-600 Hz; no sound during the 12-frame visual charge (frames R=1021..1411 step 30, 1436, 1462, 1508, 1559 (18 cycles); confidence medium)
  - Method: per-offset minimum and median of band levels across the 18 cycles aligned on R (the minimum suppresses narration)
- **boom timing**: onset between R+8 and R+9: about 2.3 frames (about 77 ms) before the contact frame R+11 and about 3.3 frames before the flash frame R+12. Clean isolated example: onset 52.245 s, all bands at once, vs contact n1570 = 52.333 s (88 ms early). (frames R+8..R+12 of all 18 cycles; 1567-1571; confidence medium)
  - Method: epoch minimum band envelopes (1024-sample windows) + 10 ms RMS envelope of the last hit after the narration ends
- **boom spectrum and length**: fundamental 43-48 Hz in all 20 booms (18 in steps 6+ plus 2 in the intro); 5-16 kHz crack lasting 2-3 frames; sub tail holds to about R+19 and is gone by about R+20-21 (about 330 ms). Clean example: strong sub 52.25-52.56 s, near silent (about -50 dBFS) by 52.71 s. (frames 1567-1582; confidence high)
  - Method: FFT peak 25-140 Hz over 250 ms per cycle; band envelopes
- **audio-video offset**: whoosh-to-boom spacing about 11.2 frames matches the 11-frame flight, and both lead by the same 2-3 frames, in the intro too. Read as a constant capture offset (audio about 75-90 ms early): intended sync is the whoosh on the release frame and the boom on the impact frame. (frames all SFX cycles; confidence medium)
  - Method: onset spacing vs the visual release-to-contact interval
- **mix level**: hit frames R+9..R+17: median -23.5 dBFS RMS (10-90% range -28.6 to -21.3), about as loud as the voiced narration (median -27.8, range -40 to -22) (frames R+9..R+17 of each cycle; confidence medium)
  - Method: per-frame RMS
- **no SFX before step 6 (outside the intro)**: across the 27 cycles of steps 1-5 the per-offset minimum level is -45 to -57 dB at every offset, so nothing repeats per cast. Silences, e.g. n900-903 (30.00-30.10 s) at -66 to -77 dBFS during the release of R=901. (frames 211-1002; confidence high)
  - Method: epoch minimum band levels; per-frame RMS

**Rule.** Play a fire whoosh that starts on the release frame and tails off by mid-flight (about 350 ms). Play a deep boom (43-48 Hz body, a 2-3 frame 5-16 kHz crack on top, about 0.3 s tail) on the impact frame. Use one boom for every normal hit and crit, at the same level and pitch.

## Step 7: Aftermath

**Narration.** So step 7, aftermath. Set the enemy on fire and let it die down. But you have no idea if that was a lot.

**On screen.** (7) AFTERMATH! / SET THE ENEMY ON FIRE... AND LET IT DIE DOWN! (blue) / BUT YOU HAVE NO IDEA IF THAT WAS A LOT. (red)

**What you see.**

The bar refills on n1194. The first burn is at contact n1212 (40.40 s); representative cycles 1212-1242 and the last pre-kill hit C=1473.

As the white flash fades, the enemy is left burning:
- A thin, bright cream-gold rim glows around the whole silhouette, like a fresnel edge fire.
- A hot pink-magenta glow sits inside the body, on the far side.

The red-orange flecks at the impact spot are the same as in steps 4-6 and are not new here.

The rim appears on C+2 and flares for about 8 frames. It then holds at roughly a third to a half of its peak for about 0.8 s and finally fades out over about 8 frames, gone about 1.1 s after contact. The pink inner glow fades more slowly and is still above the base colour 1.5 s after the last hit. Because the next cast lands every second, the enemy never cools during this step: the rim is still a clear gold outline at C+24..C+28 (n1236-1240) when the next hit re-lights it.

**Measurements.**

- **rim decay**: rim pixel count after C=1212: 315 (C+2) -> 250-260 (C+5..C+7) -> 110-130 plateau C+10..C+30. After the last pre-kill hit C=1473: 353 (C+3) -> about 150 plateau through C+24 (n1497) -> 105, 62, 46, 33, 29, 29, 16, 3 over n1498-1506. Flare about 8 frames, hold about 0.8 s, fade about 8 frames; gone about C+33 (1.1 s). (frames 1212-1243, 1472-1512; confidence medium)
  - Method: count of gold pixels (r>170, g>120, b<150, r>b+50) in box x392-430, y380-470
- **rim width**: 2-3 px bright edge on the silhouette (about 5% of enemy width) (frames 1216-1290; confidence medium)
  - Method: horizontal colour profile across the right edge
- **inner glow decay**: hot-spot box #F9E1F5 (C+1) -> #E6AECC (C+6) -> #C37BB5 plateau (C+19..C+22) -> #A970B5 (C+28) -> #8F65B7 (C+36) -> #7B61B4 (C+45); base unburnt #5B55AB (frames 1210-1243, 1472-1519; confidence medium)
  - Method: mean RGB of a 16x25 px box (x400-416, y420-445)
- **onset**: rim appears on C+2 with the flash and is re-lit by every hit (1 s cadence) (frames 1212-1214, 1242-1244, 1272-1274; confidence high)
  - Method: frames read + rim count

**Colours.** #FDDABC rim peak; #D6B689 rim median (cream gold); #F388D1 inner hot spot core (pink-magenta); #C37BB5 / #C576B7 inner glow between hits; #5B55AB / #6050B0 unburnt purple in the same box

**Rule.** After the hit, leave visible damage on the target: a thin (2-3 px) bright burn rim that flares for about 8 frames, holds at a third to a half of its brightness for about 0.8 s, then fades out over about 0.25 s. Add an inner ember glow that fades more slowly (over 1.5 s or more). A glance a second after the hit should still show that it landed.

## Step 8: Damage numbers

**Narration.** So step 8, damage numbers: small, punchy and bigger for crits. (Auto-caption misheard 'crits' as 'Fritz'.)

**On screen.** (8) DAMAGE NUMBERS! / SMALL, PUNCHY... AND BIGGER FOR CRITS! (blue)

**What you see.**

The bar refills on n1371. Releases fall at n1381, 1411, 1436 and 1462: the cadence quickens from 30 to 25-26 frames after the second cast. Numbers appear in order: '26' (n1393), '28' (n1423), '27' (n1448), then the crit '121' (n1474). '32' appears in the outro and '35' in the intro.

Normal numbers:
- Each pops on the flash frame (C+1), just above the enemy's health bar and slightly off centre.
- It appears oversized and white (34x24 px), snaps to 23x16 within 2 frames while turning pale orange, then floats about 16-20 px sideways and 7-12 px up in a shallow arc.
- In its last 2 frames it shrinks and fades out, after 22 frames in total.
- The sideways direction varies: '26', '28', '27', '32' and '121' go right, but '35' and the kill's '128' go left.

Crit:
- The number appears much bigger, white and tilted with motion blur (68x41).
- One frame later a 'CRIT!' tag (36x13) appears above it.
- The digits settle at 26 px tall (1.6x normal) in a deeper orange, drift the same way and fade after about 21-22 frames.
- The crit has no distinct sound and no extra shake (1.2 px).

The bar does not follow the numbers: the crit '121' removes 14 px, the same as a '26'.

The step-8 label and caption fade at n1488-1490, and the kill caption starts at n1493.

**Measurements.**

- **normal number pop**: spawn on C+1 at 34x24 px pure white -> 27x18 (C+2) -> 23x16 (C+3) -> resting 24-25 x 16-17. Scale pop about 1.4x settling in 2 frames (67 ms). Resting height 16-17 px = about 0.24 enemy heights; width about 0.5 enemy width for 2 digits. (frames 1393-1396, 1423-1426, 1448-1451, 1571-1574, 22-24; confidence high)
  - Method: bbox of warm/white text pixels above the bar (L>120, r>=b, r>=g-10)
- **normal number motion and life**: '26': centre x401 -> 421 (+20 px), y339 -> 331 (-8 px) then +2 px sink over about 20 frames; '35' (intro): x369 -> 353 (-16 px, LEFT), y567 -> 555 (-12 px); shrink and fade over the last 2 frames; life 22 frames (about 730 ms) (frames 1393-1414, 22-43; confidence high)
  - Method: centroid per frame
- **normal number colour**: white -> pale orange by C+3: brightest pixels about #F9CA96, median about #E4AD68 (frames 1395-1413; confidence high)
  - Method: brightest third / median of text pixels
- **crit number**: spawns on C+1 white at 68x41 px, tilted; 'CRIT!' tag 36x13 px appears on C+2 above the digits; digits settle at 48x26 px (1.6x normal height; 3 digits); the kill '128' has the same 54x26 digits and 36x12 tag (frames 1474-1495, 1520-1541; confidence high)
  - Method: row-profile split of tag vs digits + bbox
- **crit colour, motion, life**: median #E8823F, brightest about #F2A475 (deeper orange than normal); drifts +17 px right and -5 px up; visible n1474-1494, faint to n1495 (21-22 frames, about 0.7 s) (frames 1474-1495; confidence high)
  - Method: same
- **sync with the impact**: the number spawns on the same frame as the white flash, the bar drop and the camera kick (C+1) (frames 1393, 1423, 1448, 1474, 1520, 1571; confidence high)
  - Method: frames read + bar-drop detection
- **bar loss vs number**: bar drops (px of about 74): '26' 12, '28' 13, '27' 11, crit '121' 14, kill '128' 22 (the remainder) (frames 1393, 1423, 1448, 1474, 1520; confidence high)
  - Method: green/red fill width per frame

**Colours.** #FFFFFF number spawn white; #F9CA96 normal number resting fill (brightest); #E4AD68 normal number median incl. edges; #E8823F crit digits median; #F2A475 crit digits brightest; #ED5957 health bar red (low HP); #7FDF70 health bar green

**Rule.** Spawn the damage number on the impact frame at about 1.4x size in white, and snap it to a small resting size (about a quarter of the target's height) within 2 frames as it turns pale orange. Drift it about 15-20 px sideways (left or right) and 7-12 px up, and shrink-fade it over its last 2 frames, for a life of about 22 frames (0.73 s). For crits, make the digits about 1.6x taller and a deeper orange, and add a 'CRIT!' tag one frame later.

## The kill or finisher

'OUT OF HEALTH?' types in from n1493 (49.77 s), about 1 frame after the spoken 'out'. 'BURN IT TO ASHES!' types in from n1506 (50.20 s). Kill cast: charge from n1496, release R=1508 (50.27 s), after a 46-frame gap instead of the 25-26 frames before it. Contact C=1519 (50.63 s). The enemy had about 22 of 74 px of bar left.

Frame by frame:
- C+1 (n1520): an oversized flash. Near-white pixels in y300-600 reach 4776, then 6008 on C+2 and 5892 on C+3, against about 2700-3300 for a normal hit and 3087-3452 for the crit. They stay above 1500 for 5 frames (C+1..C+5), against 4 for a normal hit. Glow area (L>120) is 22,000-26,000 px against about 12,000-13,000 for a normal hit (about 2x). Demo-region mean luma goes 44.6 -> 70.9 (x1.6, against x1.14 for a normal hit), and full-frame luma +36% (against +11%). It is a large local bloom around the enemy, not a full-screen flash. The kill number '128' spawns white and big (77x40); the 'CRIT!' tag follows on C+2. The health bar empties on C+1.
- Camera shake: a (-4.2,-1.0) px kick on C+1 (4.3 px; hero region 4.7 px), then (+2.0,+1.0) and about 1 px, settled by C+4. That is about 1.4x the median normal hit (3.1 px) and equal to the strongest normal hits, so the escalation is mostly in the visuals, not the shake.
- C+4 to C+9 (n1523-1528): a bright ground shockwave ring expands on the floor around the enemy's base. It reaches about x284-494, roughly 190-200 px across (about 4.2 enemy widths, radius about 100 px), then breaks into arcs and fades by about C+10.
- C+6 (n1525) on: a scorch decal appears under the enemy, with a charcoal centre and an irregular glowing orange rim. It is about 100 px wide by 43-54 px tall (about 2.1 enemy widths, a foreshortened ellipse). It stays after the respawn and is still under the enemy at the end of the video.
- C+6 to C+12: the enemy's lower half is engulfed in yellow-orange flames while its top is still lavender. Many sparks and embers.
- C+11 to C+31 (n1530-1550): the body becomes a see-through orange-brown ember husk. A glowing orange dissolve edge sweeps down from the top (y about 415) to the base (y about 458), about 3 px/frame. The body is gone at C+32 (n1551).
- About C+28 to C+41 (n1547-1560): dark crimson ash flakes rise and drift above the decal.
- Bar outline: visible to n1554, hidden n1555-1560, refilled green on n1561.
- Respawn on n1562, growing out of the decal with its bottom anchored at y459: 24x34 px (about 50%) -> 40x58 -> 49x70 -> 52x73 (n1565, about 7% overshoot) -> settles at about 46x68.

Totals from contact: body gone in 32 frames (1.07 s), ash gone in about 41 frames (1.37 s), respawn after 43 frames (1.43 s).

Audio:
- The impact onset is on the normal schedule (sub rises at about 50.575 s, about R+9.2), but it is softer: 30-90 Hz is about 7-8 dB below a normal boom over its first 200 ms.
- After the impact, a sustained low rumble (30-150 Hz at 20-30 dB, where normal hits fall to 0-14 dB) runs from about C+9 through at least C+28 (about 50.93-51.45 s), with hissy 5-16 kHz crackle bursts (e.g. 51.05-51.10 s). It is clearly audible in the narration gap 50.95-51.43 s.

Colours:
- Flames: #FCDC76 and #D69058
- Ember husk: #D08F5E and #9C603C
- Dissolve edge: #FFD185
- Ash: #621F2B
- Decal centre: #262325
- Decal rim: #F0AE70 while hot, cooling to #9D7355
- Kill number: the same deep orange as a crit (median about #E8823F)

## Sound

Intro (0-4.5 s):
- The juicy bottom panel uses the same SFX as the later steps. A boom with a 45.8 Hz body plays on its hit at n22 (onset about 0.64 s) and a 47.1 Hz boom on its hit at n109 (onset about 3.52 s), probably with a whoosh before it. Both booms are at the same level as the step-6+ booms.
- The plain top panel's hits are silent. While the plain panel is in focus, the juicy panel's hits at n51 and n80 are silent too, and 2.30-2.47 s drops to -80 to -90 dBFS.

Steps 1-5 (6.2-33.4 s): narration only, with no SFX. Across their 27 casts the per-offset minimum level is -45 to -57 dB at every offset, so nothing repeats per cast. Gaps between words fall silent (e.g. n900-903, 30.00-30.10 s, -66 to -77 dBFS).

SFX return with step 6 (first whoosh at about 33.95 s for R=1021) and continue through steps 7-8, the kill and the outro. 18 cycles were analysed.

Cast whoosh:
- A breathy broadband fire noise, strongest at about 100-600 Hz.
- Onset between R-3 and R-2 (about 75-85 ms before the lunge frame). It sustains to about R+3 and is gone by about R+8 (about 350 ms).
- There is no separate sound during the 12-frame visual charge.
- Whether it uses alternating samples is unclear: a low-end peak alternation (about 65-70 vs about 114 Hz) shows only on some consecutive casts, and narration overlaps.

Impact boom:
- Onset between R+8 and R+9, about 2.3 frames before the contact frame R+11 and about 3.3 frames before the flash frame R+12. The clean isolated last hit agrees: onset 52.245 s, every band at once, against contact n1570 at 52.333 s (88 ms early).
- Shape: a 2-3 frame 5-16 kHz crack over a sub-bass body with a 43-48 Hz fundamental. The body holds to about R+19 (about 330 ms) and is gone by about R+20-21.
- Pitch and level: constant across all 20 occurrences (18 in steps 6+, 2 in the intro). The crit (C=1473) uses the same boom at the same level.

Alignment: both sounds lead their visual events by the same 2-3 frames, in the intro too. The whoosh-to-boom spacing (about 11.2 frames) matches the 11-frame flight. So the lead is most likely a constant capture offset (audio about 75-90 ms early). The intended sync is the whoosh on the release frame and the boom on the impact frame.

Kill:
- Onset is on schedule, but the first thump is about 7-8 dB weaker in 30-90 Hz than a normal boom.
- A sustained low rumble follows (30-150 Hz at 20-30 dB, where normal hits fall to 0-14 dB), with 5-16 kHz crackle bursts, from about C+9 through at least C+28 (about 50.93-51.45 s), during the burn-to-ash dissolve. It is audible in the narration gap 50.95-51.43 s.

Mix: SFX hit frames measure about -21 to -29 dBFS RMS (median -23.5), about level with the voiced narration (median -27.8). The outro decays to about -50 dBFS by 52.71 s and about -65 dBFS at the end.

## Principles

- Break a spell into its phases (wind-up, projectile, travel, contact, target response, sound, what stays behind, how much it did, the kill) and give each phase its own layer. The finished effect is all eight layers stacked; no layer replaces another.
- Each layer fixes the specific gap the previous one leaves (the red 'BUT ...' line), working outward in time from the cast to long after the hit. Use this order as a checklist when judging an effect.
- Timing budget per 1 s cast:
- 12-frame charge (400 ms) and 11-frame flight (367 ms).
- 4-frame bright impact flash (133 ms) and a camera kick settling in 3 frames.
- 2-3 frames of solid white on the target plus about 12-15 frames of fade, and a 5-frame squash-and-stretch.
- A 22-frame damage number.
- A burn rim that flares for 8 frames, holds about 0.8 s and is gone by about 1.1 s, plus a slower inner glow.
Short things are the shocks; the longer things tell the player what happened.
- Escalate with importance. A crit uses the same hit, sound and shake with a number about 1.6x taller, a deeper orange and a 'CRIT!' tag. The kill adds:
- about 2x the flash area, bright for 5 frames instead of 4;
- a ground ring about 4 enemy widths across;
- a persistent scorch decal;
- a 1 s burn-to-ash dissolve;
- a sustained low burn rumble (its initial thump is actually softer).
The kill's shake (4.3 px) is only at the top of the normal range.
- Line the cues up on one frame. The white flash, damage number, health-bar drop and camera kick all start on the frame after contact. The boom belongs on that same frame; in this capture it leads by about 3 frames, which looks like a constant A/V offset.
- Show direction. Sparks exit the far side of the target along the projectile's travel line, the trail drains into the hit point, and the target's middle pushes away from the hit side. The camera kick itself is random in direction, not along the shot.
- Make the target react, not just the space around it. The burst alone (step 4) only washed the enemy with light and left it reading as unharmed. Only the flat white flash plus squash (step 5) read as 'hit'.
- Let the effect last past the hit. A burn rim that holds for most of a second, an inner glow that fades over 1.5 s or more, and a scorch decal that outlives the enemy all say 'this was hit' even when the player looked away.
- Light the scene with the effects. The charge, orb, trail and flash light the caster, floor and target (pink tint on the enemy's near side before contact), which ties the effect into the 3D scene.
- Contrast: the fire palette is warm white-gold on a dark navy floor, between an orange caster and a purple target. The hit flash is near-white, the brightest thing on screen, so it reads at a glance.
- Readability of numbers: small by default (about a quarter of the target's height). They pop in white at about 1.4x for 2 frames, and only crits grow. Numbers sit above the health bar and drift sideways (either way) and up, so they do not cover the target.
- Camera shake here is subtle: a 1-4 px kick (median 3 px, about 0.5% of frame width) that settles within 3 frames, reaching 4.3 px on the kill. There is no hit-stop and no zoom at all for a ranged spell, unlike melee juice.
- Sound comes late in the teaching order, but it is tied to the same two events as the visuals: a whoosh from release through the first half of the flight, and a boom on impact with a 43-48 Hz body and a short high crack. The kill swaps in a softer thump plus a long burn rumble.
- Transfer to Echoes: the camera, capsule scale and floor-grid framing match Echoes closely, so the px-to-capsule ratios can carry straight over. Watch the house colour rules. The fire palette (#FFFACE/#F8EA9E/#C19B5D) and the crit orange #E8823F are clear of Ember #FF5A36. But the enemy hit flash (lavender-white #F0E3F4 fading through #B99CDA) and the burn's inner glow (pink-magenta #F388D1/#C37BB5) both sit near Violet #B79CF0, which Echoes keeps for corruption.

## Extra tips

- 'FEELS LIKE NOTHING.' (red, typed n54-63 under the plain top panel while the bottom panel is dimmed, about 1.8-3.4 s): the cast with only a dot and a health-bar drop. Its hits are silent.
- 'FEELS LIKE MAGIC!' (yellow, typed n105-114 under the juicy bottom panel while the top is dimmed, about 3.5-4.5 s): all eight layers, including the whoosh and boom.
- 'HERE'S THE DIFFERENCE... IN 8 STEPS!' (n144-195): two plain casts play on the single view.
- 'BUT THERE'S NOTHING THERE TO THROW.': step 1's charge swirl ends in the same tiny dot.
- 'BUT MID-FLIGHT, IT'S JUST A DOT.': step 2's swollen core still reads as a small orb in the air, with no motion streak.
- 'BUT IT LANDS SOFTER THAN A PILLOW.': step 3's trailed fireball still just drains into the enemy and disappears.
- 'BUT THE ENEMY DOESN'T FEEL A THING.': in step 4 the burst happens around an enemy that keeps its shape and is only washed by the light.
- 'BUT LOOK AWAY, AND YOU'D NEVER KNOW IT HIT.': after step 5's white flash, the enemy is plain purple again within about 15-17 frames.
- 'BUT ONE BLINK LATER, IT LOOKS UNTOUCHED.': step 6 adds only sound, so nothing persists on the enemy.
- 'BUT YOU HAVE NO IDEA IF THAT WAS A LOT.': step 7's burn shows that a hit happened, but not how much damage it did.
- 'SMALL, PUNCHY... AND BIGGER FOR CRITS!': numbers are 16 px tall and pale orange; the crit is 26 px tall, deep orange, with a 'CRIT!' tag.
- 'OUT OF HEALTH? BURN IT TO ASHES!': about 2x the flash area held 5 frames, a ground shockwave ring, a scorch decal, a top-down burning dissolve, crimson ash and a sustained burn rumble.
- 'SAVE THIS FOR LATER!' with a yellow bookmark icon: the outro, over a respawn and one more normal hit ('32').
- Unnarrated: from step 4 on, every impact kicks the camera 1-4 px (median 3 px) in a random direction, settling within 3 frames (4.3 px on the kill). The health bar and numbers shake with the world; the captions do not. No hit-stop is used anywhere in this spell video.
- Unnarrated demo detail: the enemy's health bar refills to full at every step switch, and each step shows 5 bar-dropping hits; the bar floors at about 10 px until the finisher. Numbers are cosmetic: the crit '121' removes the same bar as a '26'.

## Uncertain

- Audio lead: whoosh and boom both start 2-3 frames (about 75-90 ms) before their visual events, consistently, including in the intro. I read this as a capture A/V offset, not a design choice, but cannot prove it. The typed captions lag the spoken words by 0.6-1.4 frames, which does not test the game-capture offset.
- Whoosh variants: the low-end peak alternates on only some consecutive casts (R=1171-1351); two alternating samples or pitch-randomised variants are possible. The boom's pitch is constant.
- Kill audio: the softer initial thump and the sustained rumble are measured from band levels. The rumble is clear in the narration gap; the thump's level may be slightly masked by the overlapping word 'burn'.
- Intro whoosh: the boom on the juicy panel's n22 and n109 hits is clear. The whoosh before them overlaps narration and is likely but not isolated.
- Enemy 'flinch' on C+2: the mid-body push away from the hit is partly hidden by sparks. Squash (-8..-9 px) and stretch (+4 px) are clear, and there is no knockback.
- Ember, spark and fleck counts (about 6 exit streaks, about 10-25 embers) come from thresholded components plus visual reading at 30 fps with JPEG artefacts; treat them as approximate.
- Charge swirl arm count (3-4) and rotation direction were read by eye; rotation speed was not measured.
- The step-7 pink-magenta inner glow could be an intended internal burn glow or emissive light left over from the flash. It persists between hits and decays over 1.5 s or more, which suggests a deliberate burn state.
- The 46-frame gap before the kill cast (against 25-30 elsewhere) may be an edit or a deliberate pause before the kill; it is not narrated.
- The health-bar refill at each step switch looks like the creator's layer toggle resetting the enemy, not a teaching point; it is not narrated.
- The creator's game frame rate is unknown. At the 30 fps capture every timing is +/-1 frame (+/-33 ms).
- Some colours were sampled from bloom-affected pixels (flash halo, burning body) and are blended with the background; treat them as approximate hues. Exact percentages for panel dimming and glow areas depend on the measurement region.

## Verify verdicts

- **corrected**: Intro (0-4.4 s) has no sound effects; audio is pure narration; SFX first appear in step 6.
  - Audio decoded at 44.1 kHz. The juicy panel's hits carry the same boom as steps 6-8: at the n22 hit the 30-90 Hz band jumps from about -5 to 35 dB at 0.66 s (onset about 0.64 s, frame 19.2), f0 45.8 Hz; at the n109 hit it jumps to 34.6 dB at 3.54 s (onset about 3.52 s), f0 47.1 Hz. The 93 ms sub peaks are 42.5 and 41.2 dB, against 41.4-42.7 dB for every step-6+ boom and 6-16 dB for step 1-5 contacts. The hits at n51 and n80, while the plain panel is in focus, are silent (sub <=6 dB; 2.30-2.47 s at -80 to -90 dBFS). A whoosh probably precedes n109 (the low band rises at 3.13-3.18 s), but narration overlaps it.
- **corrected**: Steps 1-5 have narration only, no SFX; e.g. true silences of about -90 dBFS fall at impact times, 30.1-30.5 s around contact n912.
  - No-SFX confirmed: across the 27 cycles R=211..991, the per-offset minimum level is -45 to -57 dB in every band at every offset R-8..R+25, so no event repeats. The example is wrong: n906-915 (30.2-30.5 s) is narration at -21 to -39 dBFS RMS. The silences are n900-903 (30.00-30.10 s, -66 to -77 dBFS) and n69-74 (2.30-2.47 s, -80 to -90 dBFS).
- **confirmed**: Cast cycle: charge R-12..R-1, launch on R, contact R+11, impact peak R+12 (flash, white enemy, number, bar drop, shake), next charge R+18.
  - R=301: charge glow (L>190 px near the hand) runs n289-300; lunge on n301 (hero bbox x90-139 vs rest x76-125); the dot touches the enemy on n312; the bar drops 36->23 px on n313; the next charge starts n319. Every single-view bar drop from n223 to n1423 falls on n = 13 mod 30. The number appears on C+1 (n1393, 1423, 1448, 1474, 1520, 1571); the shake kick is on C+1; the white-pixel count peaks on C+1 or C+2.
- **added**: Camera fixed, never cut; enemy health carries across the run until the finisher (implicit).
  - The camera never moves, but the enemy's bar refills to full (about 74 px) on each step switch: n196, 353, 518, 684, 848, 1014, 1194 and 1371. The new '(n)' label appears on that same frame, after the old label and caption fade over 4 frames (e.g. n349-352, n680-683, n1367-1370). Each step has exactly 5 bar-dropping hits (74 -> about 10 px, 11-14 px each). The bar then floors at about 10 px: extra hits at n175 and n673 do not lower it. Fill is green at 37 px and red at 23-24 px, so it turns red below about one third. The on-screen switch trails the narrator's 'So step N' by 0.35-0.46 s.
- **added**: Text overlays never move; only in-game camera shake (implicitly the health bar is an overlay).
  - Header and captions show 0.00-0.2 px drift. The health bar is world-anchored and shakes with the floor: its edges move (-3,-3) px on n1393, (+3,+2..3) on n1213 and (-3,+3) on n943, matching the floor phase correlation on those frames.
- **corrected**: (b) 4.4-6.1 s: single view with one plain cast.
  - The split panel animates into the single view over n136-141 (4.53-4.70 s). Two plain casts play: dot flight n138-148, with the bar dropping 24->11 px on n149; and release n163, flight n163-174, contact n175 with no bar change (floored). 'HERE'S THE DIFFERENCE... IN 8 STEPS!' types from n144 (4.80 s) and fades n190-195; the step dots appear n192-198; the step-1 label and first charge start n198-199.
- **corrected**: Intro dimming: bottom panel dimmed to about 53% from 1.87 s; top dimmed to about 59% from 3.47 s.
  - Bottom panel (y565-770) mean luma 49.3 -> 22.2 over n52-56 (1.73-1.87 s), about 47%. Top panel (y290-495) 33.5 -> 17.6 over n102-108 (3.40-3.60 s), about 53%. 'FEELS LIKE NOTHING.' types n54-63 (1.80-2.10 s); 'FEELS LIKE MAGIC!' types n105-114 and fades n134-136. Exact percentages depend on the region.
- **confirmed**: Intro panels cast in sync about every 29 frames; plain top panel unchanged at impact; juicy panel flash on n22 (about 2060 near-white px).
  - Juicy-panel white counts (min channel >215): n22 2006, n51 1525, n109 2102, so hits come at n22, 51, (80), 109 = 29-frame spacing. Top panel luma stays 33.4-33.7 with 0-6 white px through n21-24. The juicy panel also shakes, (-0.85,+2.04) px on n22 and (-2.2,-2.0) on n109, while the plain panel moves 0.00 px.
- **corrected**: Kill section starts 50.18 s ('OUT OF HEALTH? BURN IT TO ASHES!' caption starts 50.18 s); step 8 runs to 50.18 s.
  - The step-8 label and caption fade n1488-1490. 'OUT OF HEALTH?' types from n1493 (49.77 s), about 1 frame after the spoken 'out' (speech-band onset about 49.72 s). 'BURN IT TO ASHES!' types from n1506 (50.20 s), after 'burn' at about 50.18 s. The caption fades n1539-1542; 'SAVE THIS FOR LATER!' types from n1544 (51.47 s); the bookmark appears from n1555. The VTT line break hides that 'out of health' was spoken before 50.18 s. So step 8 ends at about 49.70 s and the kill beat runs 49.72-51.43 s.
- **corrected**: Captions 'TONGUES OF FLAME STREAMING BEHIND IT!' and 'FLASH IT WHITE AND MAKE IT FLINCH!'.
  - Full-res crops of n610 and n940 read 'TONGUES OF FLAME... STREAMING BEHIND IT!' and 'FLASH IT WHITE... AND MAKE IT FLINCH!' (two-line captions with ellipses). The other captions match as written.
- **corrected**: Caption colours: blue #ABD3F4, red #EC7378, yellow #FEF3AB; header #9FD1F6.
  - Median of text pixels (L>130): blue instruction #8ABEE4 (90th percentile #9FCCF5) at n610, n940 and n1290; red 'BUT' #F66F60 (bright #FA7469) at n335, and 'FEELS LIKE NOTHING' #F17165; yellow #F4DF83 to #FEDE76 (bright #FCE796) at n1530 and n1580; header #8BC1EA (bright #98C9F3), close to #9FD1F6.
- **corrected**: Hero anticipation: back edge x76 -> x60 and top down 8-16 px; lunge on R to x91-138, top y451; rest by about R+9.
  - Strict orange mask (r-g>60, b<80), n286-313: back edge 76 -> 58-60 (-16..-18 px) confirmed; the top drops only 466 -> 472-474 (6-8 px) at R-4..R-1; centroid x 99.8 -> 85.7. On R (n301) the bbox is x90-139 with top y448 (+14 px forward, 18 px up); the centroid is back to 99.1 by R+11.
- **confirmed**: Step-1 swirl about 90x75 px; 0-160 scattered min>230 px.
  - L>190 bbox at R-10..R-2 (n291-299) is 85-98 x 59-70 px, starting at x93 (in front of the hero); min-channel>230 count is 17-153 px.
- **confirmed**: Step-2 core swell 5x6 (R-11) -> 26x17 -> 30x29 -> up to 45x29 -> 27x21 (R-1).
  - R=451, min>230 bbox: 4x6 (n440), 30x20 (n441), 32x32 (n442), 28-32 x 26-38 (n443-447), 46x27 (n447), 44x28 (n448), 28x20 (n450). The same pattern appears at R=601.
- **confirmed**: Projectile speed about 20 px/frame, constant, rising about 4 px/frame; flight 11 frames.
  - The step-1 dot sits at x156, 176, 196, 218, 240, 260, 280, 300, 320, 340, 360 over n302-312 (20-22 px/frame) and y 472 -> 424 (-4.4 px/frame). The step-3 head moves 16-28 px/frame, mean 20. Contact is R+11 in every cycle.
- **confirmed**: Trail about 100-115 px; drains into the enemy over 5 frames after contact (98->81->64->46->18->2).
  - Warm mask (r>140, r-b>40, L>110), R=601: length 118 px (R+10), 106 (R+11), then 84, 66, 46, 18, 2 over n613-617, none on n618. Step 2 (R=451) has only a 36-52 px orb, with nothing left after contact.
- **confirmed**: Step-4 flash starts C+1, peaks C+2 (1889 px), above 1000 px for 4 frames, gone by C+6.
  - C=732, min>215 count in y300-600: C 1000, C+1 1784, C+2 1907, C+3 1747, C+4 1055, C+5 553, C+6 354, C+7 48. The first burst is at C=702 (n703 1617); the C=672 hit has no burst (n673 360).
- **corrected**: Step 4: enemy only pink-lit by the bloom (no white flash), shape unchanged.
  - Shape unchanged is confirmed: the top edge stays y394 over C-1..C+6 at 5 columns. But the far-side box (x397-412, y405-450) goes #E8C1E6 at C+1, #DCB2E0 at C+2, #BEA0DD at C+4 and back to base #766DD0 by C+7. That is a strong pink-lavender wash for about 6 frames: it reads as lit, never as a flat white silhouette (compare step 5's #F0E3F4 held 2-3 frames and a 15-frame fade).
- **corrected**: Camera shake (unnarrated) from step 4: 1-3 px for about 3 frames; 0 px in steps 1-3; kill about 5 px, roughly twice a normal hit.
  - Sub-pixel phase correlation of a floor patch (x120-300, y500-600), checked against a second floor patch and the hero region. Steps 1-3 (C=312, 462, 612): 0.00-0.06 px. Hits C=702..1570 (26 hits): the first kick on C+1 has median 3.1 px (range 0.6-4.2) in a random direction each hit (e.g. (+2.9,0), (-2.9,+2.9), (+3.1,+2.5), (-3.0,-3.0)); about 1-2 px back on C+2, about 1 px on C+3, settled by C+4. Pure translation, no zoom (two separate floor patches give the same shift); title 0 px. Kill (C=1519): (-4.2,-1.0) = 4.3 px, hero region 4.7 px, which is about 1.4x the median and equal to the strongest normal hits, not 2x. Crit (C=1473): only 1.2 px.
- **confirmed**: No hit-stop anywhere.
  - Mean absolute frame difference in the enemy region (x320-480, y350-500) over C-2..C+9 never drops below 3.4 (steps 4-8 and kill; e.g. C=882: 8.6, 9.1, 22.0, 28.0, 10.3, 9.7, 12.4, 13.2, ...). Sparks and the bloom keep moving every frame.
- **confirmed**: Step-5 white flash: full white 2 frames (#F3E6F6, #F2DFF2) then fade, back by C+12..C+15.
  - Far-side box, C=882: #F0E3F4, #F0DEF1, #EBD1E9, #DCBFE5, #CDACDF, #B99CDA (C+6), #A78DD4, #9E85D3, #947DCF (C+9), #8470CD (C+12), #7668CA (C+15), base #6F66C9 by C+17. In steps 6-7 the near-white plateau lasts 3 frames (C+1..C+3 at #F0+), so '2-3 frames'.
- **confirmed**: Step-5 squash -9 px (-13%) on C+1, stretch +4 px on C+3, settled by C+5.
  - Top-edge gradient at x385-405, C=882: y392-396 -> 400-404 on C+1 (-8 to -9 px of 69, about -12%), 391 on C+2, 388 on C+3 (+4), 390 on C+4, 393-395 by C+5. The bottom stays anchored at y462-464. The right edge is +3 px on C+1; the C+2 'push' is contaminated by sparks (medium). C=1062 is the same (top 394 -> 400 on C+1).
- **corrected**: Step 7 adds 'little red-orange flame flecks and char crackle at the impact spot on the near side'.
  - The same red-orange fleck cluster on the near (impact) side is already present in step 4 (n744-749), step 5 (n891-899) and step 6 (n1071-1087, lasting about C+9..C+25). It belongs to the burst's residue, not to the step-7 burn. What step 7 adds is the gold fresnel rim and the pink-magenta inner glow.
- **corrected**: Step-7 rim decays with a 6-8 frame half-life: 240 (C+2) -> 150 (C+8) -> 47 (C+18) -> 17 (C+28); fully out about 24 frames after the last hit.
  - Gold-pixel count (r>170, g>120, b<150, r>b+50; box x392-430, y380-470). After C=1212: 315 (C+2) -> 250-260 (C+5..C+7) -> 110-130 plateau from C+10 to C+30 (the next hit). After the last pre-kill hit C=1473: 353 (C+3) -> about 150 plateau through C+24 (n1497) -> 105, 62, 46, 33, 29, 29, 16, 3 over n1498-1506. So it flares for about 8 frames, holds at 1/3-1/2 brightness for about 0.8 s, then fades over about 8 frames and is gone by about C+33 (1.1 s). Visually the rim is still a clear gold outline at n1236-1240 and n1500.
- **confirmed**: Step-7 inner glow fades slowly; still above base about 40 frames after the last hit.
  - Box x400-416, y420-445: #F9E1F5 (C+1) -> #C37BB5 plateau (C+19..C+22) -> #A970B5 (C+28) -> #8F65B7 (C+36) -> #7B61B4 (C+45). Unburnt base #5B55AB (n1210).
- **corrected**: Normal damage number: spawn C+1 33x24 white -> 27x18 -> 23x16-17; life 21-22 frames; drifts +15 px right and -7 px up.
  - Size and life confirmed: '26' is 34x24 #FFFFFF (n1393), 27x18 (n1394), 23x16 (n1395), resting 24-25 x 16-17, last seen n1414 (22 frames); '28' and '32' are the same. The drift direction is not fixed. '26', '28', '27' and '32' drift +18..+21 px right and -6..-8 px up; crit '121' drifts +17 right. But the intro '35' (n22-43) drifts -16 px LEFT and -12 up, and the kill '128' (n1520-1541) drifts -17 px left. Treat the sideways direction as random.
- **confirmed**: Crit '121': spawn white 68x37 tilted, settles about 49x26 (about 1.55x normal height), 'CRIT!' tag about 36x12 on C+2, deeper orange #E27D41, life about 0.8 s.
  - n1474: 68x41 white, tilted. The tag appears on n1475. Row split at n1485: tag 36x13 above digits 48x26 (1.6x the normal 16 px height). Median #E8823F. Visible to n1494-1495 (21-22 frames). The kill '128' has the same 54x26 digits and 36x12 tag.
- **added**: Crit and kill numbers imply bigger damage (implicit).
  - The bar is cosmetic relative to the numbers. Crit '121' drops the bar 37->23 px (14 px), the same as normal '26', '28' and '27' hits (11-13 px). The kill '128' removes the remaining 22 px.
- **corrected**: Step-8 releases at 1411, 1437 and 1462 (25-26 frames apart).
  - Charge-glow dips mark releases at n1381, 1411, 1436 and 1462 (gaps 30, 25, 26). The third cycle is R=1436: contact 1447, bar drop and number '27' on n1448 = C+1. Then the kill R=1508 (46-frame gap) and the outro R=1559.
- **corrected**: Kill flash: 4891 / 6115 white px on C+1/C+2; white above 1500 px for 6 frames vs 4 for a normal hit; glow area 2.2-2.5x; demo luma 46 -> 84.5, almost a full-screen flash.
  - White counts 4776 (C+1) and 6008 (C+2) confirmed. Above 1500 px for 5 frames (C+1..C+5: 4776, 6008, 5892, 4762, 3791; C+6 1449), against 4 for a normal hit. L>120 area is 22-26k vs 12-13k (about 2x). Demo-region (y300-600) mean luma 44.6 -> 70.9 (x1.6), against x1.14 for a normal hit; full-frame luma 28 -> 38 (+36%) against +11%. It is a large local bloom around the enemy, not a full-screen flash.
- **corrected**: Kill audio: the same boom starts on schedule at normal level, then a sustained 30-90 Hz rumble C+6..C+27 (medium-low confidence).
  - The onset is on schedule: sub rises at about 50.575 s = n1517.2, about R+9.2. But the impact is about 7-8 dB weaker in 30-90 Hz than a normal boom (about 27 vs 35 dB in 46 ms windows; 43 vs 49-50 dB over the first 200 ms). After it, 30-150 Hz stays 20-30 dB, with 5-16 kHz crackle bursts (26-28 dB at 51.05-51.10 s, while the speech band is only about 13 dB), from about C+9 through at least C+28 (51.45 s). The narration-free gap 50.95-51.43 s holds this rumble, so confidence is medium-high.
- **confirmed**: Whoosh onset about R-2.6, decaying by about R+8; boom onset about R+9.0 (2 frames before contact, 3 before the flash); clean last hit 74 ms early; boom f0 42-47 Hz; tail to about R+19-20.
  - Per-offset minimum over 18 SFX cycles (1024-sample windows): low and mid bands jump between R-3 and R-2 (-20 -> +8 / +15 dB) and fall by R+8. The boom jumps between R+8 and R+9, with the sub tail to about R+19 and gone by R+20-21. Clean final hit: onset at 52.245 s (all bands at once, f0 43 Hz) vs contact n1570 = 52.333 s, so 88 ms early (2.6 frames; 3.6 frames before the flash frame). f0 is 43-48 Hz in all 20 booms, including the 2 in the intro.
- **unsupported**: Whoosh low-end peak alternates 65-70 Hz vs 90-105 Hz on consecutive casts.
  - A 50-115 Hz peak search on each whoosh puts most casts at the band edge (114 Hz). Only R=1171-1351 alternate (70/114/66/114/65/114/66); a 40-160 Hz search gives 115-157 Hz with no pattern. Narration overlaps, so this is inconclusive.
- **confirmed**: Kill sequence: ring n1523-1528 about 200 px across; decal from about n1525, about 100 px wide; ember husk and top-down dissolve to n1550; body gone n1551; bar outline to n1554, hidden 1555-1560, refill n1561; respawn n1562 with an overshoot.
  - Frames n1518-1565 read at 1.2x. The ring spans about x284-467 at n1524-1525. Respawn purple bbox: 24x34 (n1562) -> 40x58 -> 49x70 -> 52x73 (n1565, about +7% over the rest height of 68) -> settles. The decal is still under the respawned enemy at n1566-1590.
- **confirmed**: SFX and narration mix level.
  - Per-frame RMS on hit frames R+9..R+17 (steps 6-8): median -23.5 dBFS (10-90% range -28.6 to -21.3). Voiced narration frames in steps 1-5: median -27.8 (-40 to -22).
- **added**: Header 'HOW TO: MAKE A MAGIC ATTACK!' is persistent.
  - n0 has no header; it types in during the first second (the 1 fps sheet at t=0 shows 'MAKE A MAGIC' partly typed) and then stays to the end.
