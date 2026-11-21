# Video 2: v2-how-to-make-a-punch-juicy (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

The video is a vertical 576x1024 clip at 30 fps, 30.27 s long (908 frames). It has narration (likely TTS) and no music. Audio between phrases is near-silent (-40 to -84 dBFS); only 2.73-2.80 s and 3.86-3.93 s are digital silence.

**Layout**
- The persistent title "HOW TO: MAKE HITS PUNCHY!" is light-blue (#8EC6F0-#98CEF6) handwritten caps with a wavy underline, at y≈180-260. It is written on over f4-f31 (0.13-1.03 s).
- Like all the hand-drawn HUD text, the title 'boils' (is redrawn with a small wobble) every 3 frames (10 fps), whatever is happening in the scene.
- Under the title is the step heading (e.g. "① FLASH!"). The 3D demo fills the middle band (y≈330-600). Caption lines sit at y≈607-627, 652-672 and 684-704, typed letter by letter at about 0.3-0.4 s per line. They fade out over about 5 frames and are gone about 0.1 s before the next heading.
- A pagination row of five circled dots (y≈780) shows from 5.40 s to 27.8 s, with the current step filled; none is filled during the finisher.
- Note: the 1 fps contact sheets show frames about 0.5 s later than their labels.

**Camera and art style**
- One fixed high three-quarter camera. The faint blue-grey floor grid fades into a navy vignette (#0A111F top, #10162B centre).
- Hero: glossy orange capsule, about 61x93 px, resting at (176,469), holding a short white sword.
- Enemy: purple capsule (lit #8C7BF8, centre #6D5EC5-#7260CD, shadow #5A4FAD), about 64x92 px, resting at (369,433). The floor axis from hero to enemy has a screen slope of -0.19.
- Health bar: 72x8 px with a light-cyan outline, about 37 px above the enemy. Fill #7CDE69 turns red (#FF5550-#FB5E5F) at ≤1/3. Each hit removes 12 px (1/6) instantly, with no trailing damage chunk.

**Attack loop (identical in every segment): a 3-swing combo in strict rotation**
- A: underhand upswing (blade low, trail sweeps up).
- B: backhand diagonal from over the shoulder.
- C: leaping overhead chop. The hero hops about 35 px (bounding-box bottom 523 to 487) during the wind-up, stretches on the lunge and squashes on landing at impact+2 (77-83 px tall versus 92).
- Rotation from f23 (A): C hits are f78, f181, f261, f352, f445, f527, f606, f707, f789, f894. The kill f817 is also a C, out of rotation.
- Swing interval 24-32 frames.
- A and B wind-ups lean back and down (-17..-25 px x, +16..+21 px y) over about 4 frames. The strike covers about 2-3 frames to a +53..+58 px lunge on the impact frame.
- In steps 1-3 the lunge pose drifts back slowly for about 5 frames, then returns to rest by impact+12..+13.
- A bloomed slash trail (white/yellow core, gold, orange, pink edge) accompanies every swing.

**Structure: sequential cumulative build-up, no split screen**

| Segment | Time | Hits (impact frame) |
|---|---|---|
| Intro, plain hit | 0-5.2 s | f23, f49, f78, f107, f136 |
| Step 1 Flash | 5.2-9.13 s (heading at f160) | f181, f208, f234, f261 |
| Step 2 Sound | 9.13-12.93 s | f299, f325, f352, f378 |
| Step 3 Particles | 12.93-16.57 s | f417, f445, f472, f496 |
| Step 4 Knockback | 16.57-20.63 s | f527, f553, f580, f606 |
| Step 5 Shake + Freeze | 20.63-25.87 s | f649, f681, f707, f733, f760 |
| Finisher "Out of health?" | 25.87-28.43 s | f789, kill f817, burst f824, respawn f846-853 |
| Outro "SAVE THIS FOR LATER!" | 27.83-30.27 s | f870, f894 (full juice) |

- Each step keeps every earlier layer, except the WHACK! label, which is shown only in step 2.
- The health bar refills at f160, f277, f391, f500, f622 and f846.
- About 4 s and 4-5 hits per step.

## Before and after

**PLAIN (intro, 0-5.2 s; hits f23, f49, f78, f107, f136):**
- The hero performs the full combo swing (wind-up, 2-3 frame strike, +54 px lunge, bloomed trail).
- The health bar loses 12 px per hit and turns red after the 4th hit.
- The enemy does nothing: the bounding-box right edge stays at 399-405 px, and the only colour change is trail bloom passing in front of it.
- No particles, no camera motion, no freeze.
- Audio: no hit sound and no swing whoosh. f78 (2.600 s) falls in a near-silent gap (-76 to -84 dBFS in every band), and the 25-90 Hz band near every plain hit stays at the noise floor.
- Caption: "THIS HIT WORKS... / BUT IT FEELS LIKE NOTHING." (second line red #F16C78).

**JUICY (step 5, f649-f760, and the outro f870/f894), the same swing plus:**
1. **Flash.** The enemy hard-cuts to near-white (#F0EAFF-#FFFFFA) for 5-6 frames: the 3-4 held frames plus 2.
2. **Sound.** An airy swing whoosh starts with the wind-up 7-9 frames before contact. A 52-56 Hz thump starts within the impact frame, about 25-35 dB above the plain version in the 35-80 Hz band. A secondary knock follows at about +175 ms.
3. **Shards.** About 15-25 yellow-to-orange diamond shards spray from the contact point on the far side, in a ~45° cone along the hit direction, for about 0.5 s.
4. **Hitstop.** The game is held for 3 frames (100 ms); on the two underhand hits a 4th frame is partly resumed. Particles keep moving during the hold.
5. **Shake (world camera only, during the hold).** The impact frame kicks hardest, about 6-12 px, mostly toward the hit direction and up. Offsets then decay, about 9, 6 and 3 px on frames 1-3; maximum |x| 12 px, |y| 9 px. The HUD never shakes.
6. **Knockback.** On the first resumed frame the enemy launches +57..+63 px (+86..+90 on the C overhead-chop finisher) and 36-54 px up the screen (bounding-box bottom; part of that is depth).
   - In the air it tilts back about 7-12° and stretches about 10% vertically.
   - It peaks at impact+4..+5, lands at +9..+10 with a one-frame squash (up to +18% wide, -15% tall), and is eased home by +17..+18.
7. **Recoil.** The hero snaps back about 40 px from the lunge to about 7-12 px ahead of its rest spot.

**Net difference:** the plain hit has no target reaction, no audio, no camera response and no time manipulation. Its only feedback is the attacker's animation, the trail and the health number.

## Step 1: Flash

**Narration.** "Step 1, flash. Turn the enemy white for just a few frames." (TikTok captions and SenseVoice agree; 5.14-8.84 s)

**On screen.** Heading "① FLASH!" (written on from f160, 5.33 s); captions "TURN THE ENEMY WHITE..." (f202-213, 6.73-7.10 s) / "FOR JUST A FEW FRAMES!" (f224-235, 7.47-7.83 s); pagination dot ① filled.

**What you see.**

Four hits, one per combo swing: f181 (C overhead chop), f208 (A), f234 (B) and f261 (C).

On the impact frame (the same frame the bar loses 12 px), the whole enemy capsule switches in one frame from shaded purple to flat near-white with a faint lavender tint and almost no shading. It stays white for 2 frames (3 on f181), then snaps back to purple in one frame. There is no fade and no outline glow.

The hero is not flashed. Nothing else reacts: no motion (bounding-box right edge 399-403 px), no particles, no sound, no shake, no freeze.

f181 frame by frame: the trail arcs over the hero at f179-180; f181 is the impact (enemy white, bar drops); f182-183 the enemy is still white; f184 it is purple again.

**Measurements.**

- **flash duration without freeze**: 2-3 frames at 30 fps. 12 of 16 no-freeze hits (steps 1-4) show 2 white frames; 4 show 3 (f181-183, f325-327, f445-447, f553-555). Mean 2.25 frames ≈ 75 ms. (frames 181-184, 208-210, 234-237, 261-263, 299-301, 325-328, 352-354, 378-380, 417-419, 445-448, 472-474, 496-498, 527-529, 553-556, 580-582, 606-608; confidence high)
  - Method: Per-frame count of near-white lavender pixels (R>215, G>205, B>230, R≥G-3) in the enemy region; frames over about 3,800 px counted as white
- **flash on/off shape**: Hard cut both ways. The centre patch goes #6F5FCC (f180), #F2EEFB (f181), #F2EDFC, #F2EEFB, then purple (f184), with no intermediate frame. (frames 180-184; confidence high)
  - Method: Mean RGB of a 12x12 patch at the enemy centre
- **flash colour and coverage**: Whole capsule (about 5,000-5,400 white px versus about 4,800 purple px at rest). Body #F0EAFF-#F2EEFB, highlight up to #F4F0FF, shadow side #EAE4FB. Base purple centre #6D5EC5, lit #8C7BF8, shadow #5A4FAD. (frames 180-184, 520; confidence high)
  - Method: Pixel samples across the flashed body versus the same pixels before
- **flash sync**: Starts on the impact frame, the same frame as blade contact and the health-bar drop (0 frames delay) (frames 181, 208, 234, 261; confidence high)
  - Method: Bar fill width versus white-pixel count
- **enemy motion in steps 0-3**: None: bounding-box right edge 399-405 px throughout f0-499 (centroid wobble is trail occlusion) (frames 0-499; confidence high)
  - Method: Largest connected component of the purple-or-white mask
- **damage readout**: 72 px bar loses 12 px (1/6) per hit, instantly, with no delayed chunk; the fill turns red when ≤24 px (≤1/3) (frames 23-160, 600-622, 706-710; confidence high)
  - Method: Green/red pixel extent of bar row y 344-351; bar crops

**Colours.** #F0EAFF / #F2EEFB enemy flash body (near-white, faint lavender); #EAE4FB flash shadow side; #6D5EC5 enemy base purple (centre); #8C7BF8 enemy lit purple; #5A4FAD enemy shadow purple; #7CDE69 health fill; #FF5550 low-health fill

**Rule.** On the impact frame, override the whole target's material to flat near-white (keep a faint trace of its hue) for 2-3 frames at 30 fps (≈70-100 ms; mean 75 ms). Switch it on and off with a hard cut, never a fade. Do not flash the attacker.

## Step 2: Sound

**Narration.** "Step 2, add sound. A sharp whack right on the impact frame." (9.06-12.76 s)

**On screen.** Heading "② ADD SOUND!" (from f277, 9.23 s); captions "A SHARP WHACK..." (f323-330, 10.77-11.00 s) / "RIGHT ON THE IMPACT FRAME!" (f342-356, 11.40-11.87 s). On every hit a pale-yellow comic "WHACK!" (#F7EB89) pops above the enemy's health bar.

**What you see.**

Hits f299 (9.967 s), f325, f352 and f378, with the step-1 flash kept.

On the impact frame a "WHACK!" label appears about 40 px above the bar. It is fully drawn on f299, f352 and f378, and written on over f325-326. It holds about 12 frames, dims over about 6 and is gone by about impact+18 (≈0.6 s). It drifts slightly as it fades.

The audio gains a hit sound for the first time:
- (a) An airy broadband swing whoosh (2-10 kHz noise) that starts abruptly with the wind-up, 7-9 frames before contact, and holds through contact. It is only cleanly audible on the speech-free outro hits; elsewhere narration masks it.
- (b) A deep thump (fundamental 52-56 Hz) that starts within the impact frame. It peaks 17-50 ms later, dips at about +70-100 ms, holds to about +230 ms and is 10 dB down by about +350 ms.
- (c) A softer mid-band knock at about +175 ms.

There is no separate high-frequency crack at contact. Visually nothing else changes from step 1.

**Measurements.**

- **thump onset versus impact frame**: In the first half (0-17 ms) of the impact frame on f445, f527, f606, f707 and f894; one half-frame earlier on f789; kill f817 also at 0-17 ms. Within ±1 frame, in practice about half a frame. (frames 445, 527, 606, 707, 789, 817, 894; confidence high)
  - Method: 35-80 Hz band (FFT mask), RMS in 16.7 ms bins aligned to n/30, plus a Hilbert envelope with a -10 dB onset threshold
- **low-band loudness, plain versus sound**: 25-90 Hz band peak within ±0.2 s: -1 to +11 (relative dB) on every intro and step-1 hit versus +31 to +38 on every hit from f299 on (+25-35 dB). Smoothed 35-80 Hz peaks: -43 to -52 dBFS (plain) versus -10 to -22 dBFS. (frames 23, 49, 78, 107, 136, 181, 208, 234, 261 versus 299-894; confidence high)
  - Method: 40 ms FFT band energies with a 5 ms hop; Hilbert envelope
- **thump character**: Fundamental 51.5-56 Hz (55.0, 56.0, 55.5, 52.0, 53.5, 55.0, 54.5, 51.5 Hz). Envelope: peak +17..+50 ms, 10-20 dB notch at +67..+100 ms, rebound holding near -20 dBFS to about +230 ms, -10 dB by about +350 ms. Secondary 80-2000 Hz knock at about +170..+185 ms on hits with and without a freeze, so it is part of the sample. (frames 352, 445, 527, 606, 707, 789, 817, 870, 894; confidence medium)
  - Method: FFT peak over 0-200 ms; per-half-frame band RMS
- **swing whoosh**: 2-10 kHz noise starts abruptly with the wind-up (f863 for the f870 hit, f885 for f894; 7-9 frames before contact), plateaus at about -20 dBFS from about -3 to +4 frames and fades by about +10. Absent on the plain hit f78 (all bands silent) and on f261. (frames 860-905, 70-85, 255-268; confidence medium)
  - Method: Spectrogram and band RMS on the speech-free outro hits and on plain hits that fall in speech gaps
- **WHACK! label timing**: On the impact frame (f299, f352, f378; written over f325-326). Full brightness to about +11, dims +12..+17, gone by about +18 (0.6 s). Step 2 only. (frames 298-318, 325-341, 351-367, 377-394; confidence high)
  - Method: Yellow-pixel count above the bar plus frame reading

**Colours.** #F7EB89 WHACK! label (pale yellow comic text)

**Rule.** Fire the impact sound so that its low body, a deep ~50-56 Hz thump, starts within the impact frame (no more than one frame off). Let it peak within 50 ms and ring for about 0.25-0.35 s. Lead it with an airy swing whoosh that starts at the wind-up (~0.25-0.3 s earlier) and carries through contact. Never start the thump at swing start or after the reaction.

## Step 3: Particles

**Narration.** "Step 3, particles. Blast them out in the direction of the hit." (12.90-16.44 s)

**On screen.** Heading "③ PARTICLES!" (from f391, 13.03 s); captions "BLAST THEM OUT..." (f442-450, 14.73-15.00 s) / "IN THE DIRECTION OF THE HIT!" (f454-469, 15.13-15.63 s). A pale-yellow arrow (#FCE683) is drawn flat on the floor right of the enemy, pointing away from the hero along the hero-to-enemy axis.

**What you see.**

Hits f417 (B), f445 (C), f472 (A) and f496 (B), with flash and sound kept.

One frame after impact (f418) a small bright yellow-white clump appears just past the enemy's far side, about 25-35% down the body. Over 2-3 frames it opens into about 15-25 small flat glowing diamond shards that tumble, so their apparent size flickers.

The cloud first travels up-right along the hit axis (screen slope about -0.2) for about 5 frames, then sinks about 20 px under light gravity while fanning to about ±40 px. A few tiny white four-point star twinkles linger near the spawn point.

The shards cool from pale yellow to gold to orange, with a few pink specks at the end. They leave the right edge or fade by about 16 frames.

Every swing type sprays the same way (right, away from the hero). The enemy still does not move.

**Measurements.**

- **spawn time and point**: First shard pixels at impact+1 (f418): x 406-423, y 408-419, colour #F0DD86, just beyond the enemy's right edge (about x 401-405), 25-35% down the body (frames 416-420, 445-447, 496-498; confidence high)
  - Method: Warm-pixel mask (R>150, R-B>90) right of x 404, plus connected components
- **particle count**: Blob count (≥4 px) peaks at 15-16 (f425-426, f454) with some merging; visually about 15-25 shards plus 2-4 white star sparkles (frames 422-431, 450-456; confidence medium)
  - Method: Connected components plus a visual count on full-resolution crops
- **direction, spread and gravity**: Centroid (416,413) to (460,404) over 5 frames (slope about -0.2, along the hero-to-enemy axis), then down to (530,424) by +11. f496: (413,409) to (454,405) to (512,422). Fan about ±40 px vertical after about 100 px of travel (≈45° total). (frames 418-433, 497-512; confidence medium)
  - Method: Centroid and bounding box of warm blobs per frame
- **speed**: Leading edge 423, 437, 451, 465, 483, 501, 519, 537, 557, 572 px: 14-20 px/frame (≈420-600 px/s ≈ 6.5-9.5 enemy widths/s). Centroid about 11 px/frame. (frames 418-427; confidence high)
  - Method: Frame-to-frame maximum x of warm pixels
- **lifetime**: 16 frames (≈0.53 s): f418-433, f497-512 (f651-667 in step 5); pink specks to +17 (frames 418-436, 497-515, 651-668; confidence high)
  - Method: Warm-pixel count back to zero
- **colour over life**: #F0DD86 at birth, #E9D071-#E4BF5F at +4..+7, #E5A64D-#E6943E at +11..+13, #E38A3B-#E37C44 at +14..+16; additive-looking glow (frames 418-433; confidence high)
  - Method: Mean RGB of warm pixels per frame

**Colours.** #F0DD86 shard at birth (pale yellow, glowing); #E4BF5F shard mid-life gold; #E6943E shard late orange; #E37C44 shard dying dark orange; pink specks at death; #FCE683 on-screen direction arrow; white 4-point star sparkles near spawn

**Rule.** One frame after impact, burst ~15-25 small glowing shards from the contact point on the target's far side. Spawn them in world space, so they do not follow a knocked-back target. Fire them at ~14-20 px/frame (7-10 body widths/s) in a ~45° cone along the attacker-to-target direction, with light gravity. Cool them pale yellow → gold → orange over ~0.5 s.

## Step 4: Knockback

**Narration.** "Step 4, knockback. Push the enemy away and bounce the player back a bit." Spoken words are ambiguous: ASR has 'back of it', TRANSCRIPTS.md has 'back off it', the on-screen caption has 'BACK A BIT!'. (16.54-20.56 s)

**On screen.** Heading "④ KNOCKBACK!" (from f500, 16.67 s); captions "PUSH THE ENEMY AWAY..." (f546-557, 18.20-18.57 s) / "BOUNCE THE PLAYER BACK A BIT!" (f569-584, 18.97-19.47 s). Two green floor arrows (#8FDB86): one right of the enemy pointing away from the hero, one under the hero pointing back.

**What you see.**

Hits f527 (C), f553 (A), f580 (B) and f606 (C), with flash, sound and particles kept.

**Enemy.** It is flung up and away along the hit direction in a hop:
- Already displaced on the impact frame on 3 of 4 hits (f553 moves from +1).
- In the air it tilts back about 7-12° beyond rest (top away from the hero) and stretches about 10% vertically (narrower and taller).
- It peaks 2 frames after impact. Its x offset starts easing home immediately while it falls.
- It lands at impact+7 with a one-frame squash (wider and shorter), recovers over 2 frames, and is back on its spot by +13..+14.

**Particles.** They spawn at the contact point in world space, so on these hits they appear in front of and to the left of the already flying enemy. They are hidden behind it for a frame and emerge on its right.

**Hero.** In steps 1-3 the hero holds the lunge at +53..+57 px. Here it snaps back to +11..+13 px within 2 frames, as if recoiling off the enemy. The recoil is an extra offset of about -40 px that fades over about 8 frames on top of the normal return, so the hero drifts forward about 10 px before walking home.

**Combo finisher.** The C overhead-chop hits (f527, f606, and later f707, f789, f894) throw the enemy about 50% further and higher. This is the third swing of the hero's 3-swing combo; it is never narrated.

**Measurements.**

- **enemy displacement on the impact frame**: f527 +36 px x / -18 px y; f580 +31; f606 +18; f553 +3 (+44 on f554) (frames 525-528, 552-554, 579-581, 605-607; confidence high)
  - Method: Largest connected component of the purple-or-white mask
- **enemy peak displacement**: Normal (A/B) hits +55 px x, -41..-42 px centroid y (f553, f580; ≈0.85 widths). C finisher hits +84..+85 px x, -56..-60 px y (f527, f606; ≈1.3 widths). Peak x at impact+2 (67 ms), peak height at +3. Bounding-box bottom rises 36-38 px (normal) or 50-54 px (finisher); about 10-16 px of that is depth along the axis. (frames 527-541, 553-567, 580-594, 606-621; confidence high)
  - Method: Centroid and bounding-box track relative to rest (369,433)
- **offset curve**: f527: +36, +79, +85, +79, +69, +59, +51, +43 (lands), +39, +34, +27, +19, +12, +4, 0. Fast out in 2 frames, then a near-linear return of 7-10 px/frame starting at impact+3 (in the air) (frames 527-541; confidence high)
  - Method: Per-frame centroid x
- **tilt**: About +2° at rest. +14.1° / +12.9° at f528/f529 (finisher), +9.2° / +8.7° at f554/f555 (normal), i.e. about 7-12° beyond rest. Upright by +4..+5, slightly forward (-3..-5° relative) before landing. (frames 526-537, 553-562, 650-663; confidence medium)
  - Method: Principal-axis angle of the eroded enemy mask
- **squash and stretch**: Airborne stretch: bounding box 55-59 x 97-105 px versus 65x91 at rest (≈-12% wide, +8-14% tall). One-frame landing squash: f534 73x77, f561 67x85, f587 75x79, f613 77x79 (up to +18% wide, -15% tall). Next frame 61-65 x 87-93, then normal. (frames 532-536, 559-563, 585-589, 611-615; confidence high)
  - Method: Bounding box of the enemy mask; frame crops
- **airtime and return**: Back on the floor (bounding-box bottom ≥466) at exactly impact+7 on all four hits (233 ms). |dx|≤2 px at impact+13..+14 (0.43-0.47 s). (frames 527-541, 553-567, 580-594, 606-621; confidence high)
  - Method: Bounding-box bottom and centroid track
- **hero recoil**: Hero centroid x at impact 209-231 falls to 187-188 by impact+2. Relative to the steps 1-3 path it is an additive offset of 0, -32, -39, -38, -36, -31, -25, -17, -10, -4, 0 px over impact..+10: a ≈-40 px kick (≈0.65 hero widths) in 2 frames, fading over ≈8 frames. The visible path is +55, +23, +13, +12, +12, +14, +17, +21, +22, +22, +20, +16, +10, +3. (frames 527-541, 553-567, 580-594, 606-620 versus 181-195, 208-222, 299-313; confidence high)
  - Method: Largest orange component (trail excluded) per frame versus the step 1-3 mean
- **combo finisher identity**: Big-knockback hits are always the C overhead chop. The hero's bounding-box bottom rises 523 to 487 during the wind-up (a hop of about 35 px), and the hero squashes to 77-83 px tall at impact+2. The same squash appears on C hits without knockback (f78, f181, f261, f352, f445), so it belongs to the swing. (frames 70-82, 174-190, 520-530, 600-610; confidence high)
  - Method: Hero bounding box around every hit; visual swing classification

**Colours.** #8FDB86 green direction arrows (annotation only); #F0EAFF flashed enemy while airborne for 2 frames

**Rule.** On impact, launch the target ~0.85 body widths (~1.3-1.4 on a combo finisher) along the hit direction with a small hop. Give it ~7-12° backward tilt and ~10% vertical stretch, and peak in ~2 frames. Land it at ~0.23 s with a one-frame squash (~+15% wide, -13% tall), then ease it back. At the same moment snap the attacker back ~0.65 body widths in 2 frames, as an additive offset that fades over ~0.25 s.

## Step 5: Shake + Freeze

**Narration.** "Step 5, shake and freeze. Tiny screen shake on impact, and freeze the game for a few frames." (ASR broke it as "Tiny screen. Shake on impact..."; corrected from the caption; 20.62-25.72 s)

**On screen.** Heading "⑤ SHAKE + FREEZE!" (from f622, 20.73 s); captions "TINY SCREEN SHAKE ON IMPACT" (f678-693, 22.60-23.10 s) / "FREEZE THE GAME" (f719-727, 23.97-24.23 s) / "FOR A FEW FRAMES!" (f728-736, 24.27-24.53 s, larger type).

**What you see.**

Hits f649 (A), f681 (B), f707 (C), f733 (A) and f760 (B), with every earlier layer.

**The hold.** The impact frame (enemy white, trail arc beside it, blade touching) is held. Hero pose, sword, trail and white enemy stay identical for 3 frames. On the two underhand hits (f649, f733) a 4th frame is held, but the hero-to-enemy gap already changes by about 10 px on it, so it is partly resumed.

**The shake.** On every held frame the whole 3D scene (floor grid, characters, health bar, trail) is offset as one. The impact frame gets the biggest kick, about 6-12 px, mostly toward the hit direction (right and slightly up). The next frames get smaller random offsets: about 9, then 6, then 3 px on average. The title, heading and captions do not shake (they only keep their normal 10 fps boil). Shaken frames show doubled grid lines, as if two game frames were blended.

**What still moves.** Particles keep simulating during the hold. They spawn at impact+1 or +2 and start to fan out.

**Release.** On the first resumed frame the knockback launch (already about 85% of its peak) and the hero recoil happen together. The enemy peaks 4-5 frames after impact instead of 2 and lands at +9..+10. The white-flash timer is paused by the hold: the enemy stays white for the whole hold plus 2 frames.

There is no shake before step 5 (floor grid unchanged at step-4 hits).

**Measurements.**

- **freeze (hitstop) duration**: 3 frames (100 ms) on f681-683, f707-709, f760-762, f789-791, f870-872 and f894-896. 4 frames on f649-652 and f733-736, but the 4th is partly resumed (hero-to-enemy x gap -145 to -154 and -149 to -158; enemy residual 17.8/18.9 versus 4.5-6.8 when held), so ≈100-120 ms. Kill: 5 frames, f817-821. The hold starts ON the impact frame. (frames 648-653, 680-684, 706-710, 732-737, 759-763, 788-792, 816-822, 869-873, 893-897; confidence high)
  - Method: Consecutive-frame residual after a ±14 px shift search (held 2.5-5.8, moving 25-77), on hero and enemy regions separately
- **shake amplitude**: World offsets per held frame (x,y px): f649 (+12,+2) (-2,-6) (+1,+2) (+8,-3); f681 (+2,-3) (+4,-3) (0,0); f707 (+12,-2) (+8,0) (0,+2); f733 (+6,-8) (+3,0) (+6,0) (+9,-2); f760 (-4,-1) (-1,-6) (+3,-4); f789 (+8,-7) (-4,0) (-2,-3); f870 (+6,-5) (-2,-1) (-2,-2); f894 (+9,0) (-5,-7) (0,-2). Max |x| 12 px, |y| 9 px of 576x1024 (≤2.1% of width, ≤0.19 enemy widths). (frames 646-652, 678-683, 704-709, 730-736, 757-762, 786-791, 867-872, 891-896; confidence medium)
  - Method: Template match of the health-bar outline and left fill (the bar rides on the frozen enemy) against its position 3 frames before impact; cross-checked against hero-box deltas between held frames
- **shake pattern**: Decaying, direction-biased kick. Mean offset size about 9 px (frame 1), 6 px (frame 2), 3 px (frame 3). First-frame x positive on 8 of 9 hits, mean (+6.8,-3.7) px, i.e. along the hit direction. Lasts only the hold. Return to rest is within about ±3 px on the first moving frame (±1 not measurable). (frames 646-662, 678-690, 704-716, 730-742; confidence medium)
  - Method: Statistics of the offsets above; floor-grid matching after the hold (noisy because of doubled grid lines)
- **UI not shaken**: Title-region difference 0.1-0.4 on every held frame apart from the regular 3-frame boil frames, so no offset. The world-space health bar shakes with the scene. (frames 640-700; confidence high)
  - Method: Frame differencing of the title region (x 100-480, y 160-270) across the whole video
- **flash length with freeze**: Hold + 2 frames: f649-654 (6), f681-685 (5), f707-711 (5), f733-738 (6), f760-764 (5), f789-793 (5), f870-874 (5), f894-898 (5) (frames 649-655, 681-686, 707-712, 733-739, 760-765; confidence high)
  - Method: Enemy white-pixel count plus a visual check that the launched enemy is still white
- **knockback delayed by freeze**: Peak at impact+4..+5: +59, +61, +89, +63, +62 px (f649, f681, f707, f733, f760); +90 (f789), +57 (f870), +86 (f894). First resumed frame already at +44..+69 px. Landing +9..+10, home +17..+18. (frames 649-667, 681-699, 707-725, 733-751, 760-778; confidence high)
  - Method: Enemy centroid track
- **particles during freeze**: Spawn at impact+1 (f682) or +2 (f651) inside the hold. Leading edge advances 431 to 453 px between f651 and f652 while everything else is held. (frames 649-657, 681-690; confidence high)
  - Method: Warm-pixel tracking right of x 404

**Colours.** #F0EAFF to #FFFFFA enemy held white through the freeze (bloom from the held trail brightens it)

**Rule.** On impact, hold attacker, target and trail for ~3 frames at 30 fps (≈100-120 ms; ~5 frames ≈167 ms on a kill), starting on the impact frame. During the hold, offset only the world camera. Kick hardest on the impact frame (~6-12 px ≈ 1-2% of screen width, ≤0.19 body widths), roughly along the hit direction, then use smaller random offsets decaying to ≤3 px by the last held frame. Never shake the HUD. Pause the flash timer during the hold, keep particles simulating, and release knockback and recoil together on the first resumed frame.

## The kill or finisher

**Beat:** "OUT OF HEALTH? / POP IT LIKE A BALLOON!" (captions f780-833, 26.00-27.77 s; all five layers active).

**Lead-in hit (f789, 26.300 s)**
- A normal full-juice C overhead chop: 3-frame hold, flash f789-793, finisher knockback +90 px.
- The red health sliver (about 10 px) does NOT shrink, so the demo is scripted.

**Kill hit (f817, 27.233 s), also a C overhead chop, out of combo rotation**
1. **f817:** impact. The enemy flashes white and the bar empties to its outline.
2. **f817-821:** a 5-frame hold (167 ms) versus the normal 3. Hero, sword and trail are held (residual 2.5-5.1). World shake offsets: (+10,-9), (+12,+4), (-3,+3), (+5,-4), (0,-1) px. That is in the normal ≤12 px band, without the clean decay of normal hits.
3. **f820 (27.333 s), inside the hold:** a pale-yellow comic "POP!" (#FAEA8B) appears above-right of the enemy, 4 frames before the visual pop.
4. **f822-823: swell (balloon inflate), still white, bottom anchored at y≈480.**
   - f822 about 70x100 px (versus 65x92).
   - f823 about 85-95 x 120 px: ≈1.3-1.45x wide, ≈1.3x tall, rounder.
   - The hero is already recoiling.
5. **f824 (27.467 s, impact+7 = 233 ms): burst.** In one frame the capsule becomes a tight clump of purple cubes in its own footprint, with bright yellow sparks inside. The bar outline vanishes.
6. **f825-837: radial burst.**
   - Several dozen purple cubes (enemy palette, roughly 10-16 px each) tumble outward in all directions, including behind the hero, biased slightly along the hit direction.
   - Many yellow/orange step-3 shards are mixed in and fly further, to the screen edges.
7. **f836-845:** cubes arc down onto the floor, scatter and shrink. "POP!" dims over f836-841.
8. **f846-847:** debris gone, about 23 frames (≈0.77 s) after the burst.

**Respawn (demo reset)**
- f846: a full green bar reappears.
- The enemy grows up from the floor (bottom fixed at y 479): heights 25, 65, 91, 103, 105, 101, 97, 95 px at f846-853 (rest 95).
- That is ≈0.26, 0.68, 0.96, 1.08, 1.11, then settling to 1.0 by f853: about 7 frames (≈230 ms) with ≈10% overshoot.

**Audio (low confidence; narration overlaps)**
- The thump starts within f817 like a normal hit, and its 35-80 Hz body decays like a normal hit (about -20..-26 dBFS to f827, -29..-44 from f828).
- A broadband rise at f820 coincides with the POP! label and the end of the word 'balloon'; it cannot be separated from speech.
- No transient at the f824 burst. The low-band rise at f835-839 coincides with the narrator's 'Save'.
- No kill-specific sound can be confirmed.

## Sound

**No music.** The soundtrack is narration plus hit SFX. Between phrases the level falls to -40 to -84 dBFS; true digital silence (<-80 dBFS for ≥50 ms) occurs only at 2.73-2.80 s and 3.86-3.93 s.

**Plain intro and step 1 (flash only): no hit SFX and no swing whoosh.**
- f78 (2.600 s) falls in a near-silent gap: -76 to -84 dBFS in every band.
- f261 (8.700 s) falls just after the narrator's 'frames'. Every band is at or below the noise floor from 8.64 s.
- The other plain hits overlap narration (f136 overlaps '...in five steps'), but none shows any 25-90 Hz energy above the floor.

**From step 2 ("A sharp whack right on the impact frame") onward, every hit carries three layers.**

**(1) Swing whoosh**
- Airy broadband noise (2-10 kHz) starts abruptly with the wind-up, 7-9 frames (≈0.25-0.3 s) before contact: f863 for the f870 hit, f885 for f894.
- It plateaus at about -20 dBFS from about -3 to +4 frames and fades by about +10.
- Clean only on the speech-free outro hits; elsewhere it is masked by narration and inferred.

**(2) Deep thump (the 'whack' body)**
- Fundamental 51.5-56 Hz (55.0, 56.0, 55.5, 52.0, 53.5, 55.0, 54.5, 51.5 Hz on eight hits).
- Onset in the first half (0-17 ms) of the impact frame on f445, f527, f606, f707, f817 and f894, and one half-frame earlier on f789.
- Peak 17-50 ms after onset, a 10-20 dB notch at +67..+100 ms, a rebound that holds near -20 dBFS to about +230 ms, and -10 dB by about +350 ms.
- 35-80 Hz peak level is -10 to -22 dBFS versus -43 to -52 dBFS on plain hits (+25-35 dB).

**(3) Secondary knock**
- A softer 80-2000 Hz knock at about +170..+185 ms.
- It sits at the same offset with and without the hitstop (f527, f606 versus f789, f870, f894), so it is part of the sample, not a landing or launch sound.

There is no separate high-frequency crack at contact (the 2-10 kHz level is flat across the impact bin).

**Pitch variation (low confidence, unverified here):** the original analysis's resampling correlation suggested about ±5% playback-rate variation between repeats; narration overlap prevents a firm call.

**Steps 3-5:** no separable particle, knockback, landing or freeze sounds; the step-5 hold does not visibly change the audio.

**Kill (f817):**
- The thump starts within the impact frame and decays like a normal hit.
- A broadband rise at f820 coincides with the POP! label and with the narrator finishing 'balloon'.
- The f824 burst has no audible transient. The later low-band rise (f835-839) coincides with the narrator's 'Save'.
- No kill-specific sound can be confirmed.

## Principles

- Everything keys off ONE impact frame. Flash, health drop, thump onset (within half a frame), knockback start (on that frame, or on the first frame after the hold), hold start and shake start all land on it. The particles appear one frame later. The swing whoosh is the one cue that deliberately starts earlier, with the wind-up. The video's own caption is "RIGHT ON THE IMPACT FRAME!"
- Layer, don't replace. The finished hit is the stack of flash + sound + particles + knockback + shake/hold firing together. Each step alone is small; the sum is the punch.
- Effects are very short and use hard cuts: flash 2-3 frames (~75 ms) with no fade; hitstop ~3 frames (~100-120 ms); shake only during the hitstop. The 30 fps capture of a likely 60 fps game makes each figure ±1 frame.
- Time manipulation stacks: the hold pauses the flash timer and delays the knockback and recoil, so a 3-frame hold stretches the white to 5 frames and the launch peak to 4-5 frames after impact. Particles keep simulating during the hold, so it still feels alive.
- Direction sells force. Shards leave the far side along the attacker-to-target vector, the target flies along the same vector with a hop and a backward tilt, the first shake kick goes along it, and the attacker recoils the opposite way. Every reaction agrees on one hit direction.
- Reaction belongs to the target. The plain version already had a bloomed trail, a lunge and a health drop, and still 'feels like nothing' because the thing being hit never reacts. Prioritise target response over attacker flourish.
- Squash and stretch the reaction: the target stretches in flight and squashes for one frame on landing; the attacker's finisher hops, stretches into the lunge and squashes on landing.
- Anticipation, then a fast strike, then a hold: a ~4-frame wind-up, a 2-3 frame strike, and a held follow-through (pose hold or hitstop). The asymmetry makes the contact frame read.
- Value contrast drives readability. The near-white flash sits on a dark navy scene and the yellow shards are the hottest colour on screen. Both are large luma jumps, not hue shifts.
- Camera shake stays world-only, small and front-loaded: the biggest offset (≤12 px, ≤2.1% of width) comes on the impact frame, roughly along the hit direction, then it decays over the 3-frame hold. The HUD never shakes, so text stays legible during the juice.
- Escalate on kill, visually: a longer hold (5 frames versus 3), a text callout timed inside the hold, a 2-frame inflate (≈1.3-1.45x), then a burst of several dozen body-coloured cubes plus extra sparks over ~0.8 s, and a respawn scale-in with ~10% overshoot. No kill-specific sound could be confirmed.
- Vary repeated hits: the combo's third swing (a leaping overhead chop) throws ~50% further and higher. Hit-sound pitch variation is weak evidence only.
- Transfer to Echoes: the camera and scale match closely. Measured in enemy widths: knockback ~0.85 (finisher ~1.35), attacker recoil ~0.65, shards 0.1-0.23 wide at 7-10 widths/s, shake ≤0.19.
- Transfer to Echoes, colours: the spark ramp ends at #E37C44 with pink specks, close to Ember #FF5A36, which Echoes reserves for enemy threats. Player hit-sparks need a ramp that stays yellow/white, or the template colour for the effect.
- Transfer to Echoes, flash and debris: the flash white (#F0EAFF) is safe. Kill debris uses the victim's own colours, which in Echoes must not drift into Violet #B79CF0 (corruption-only) unless the victim is corrupted.

## Extra tips

- "THIS HIT WORKS..." / "BUT IT FEELS LIKE NOTHING." (second line red #F16C78), 0.17-2.80 s, over the plain hits: the attacker animates and the trail blooms, but the target shows no reaction and there is no sound and no camera response.
- "LET'S MAKE IT PUNCHY..." / "IN 5 STEPS!" (yellow #FCE889, pop-in f113-119, 3.77-3.97 s). The narration, confirmed by two independent ASR passes, says "Here's how to make it punchy in five steps."
- "WHACK!" (pale-yellow comic text) pops above the health bar on the impact frame of every step-2 hit and is gone after about 0.6 s. It is an onomatopoeia stand-in that shows the viewer exactly when the sound fires.
- Floor arrows as teaching overlays: a yellow arrow in step 3 ("IN THE DIRECTION OF THE HIT!") and two green arrows in step 4 (away from the hero beside the enemy; back toward the left under the hero), drawn flat on the floor along the hero-to-enemy axis.
- "TINY SCREEN SHAKE ON IMPACT" / "FREEZE THE GAME" / "FOR A FEW FRAMES!": the shake really is tiny (≤12 px of 576 ≈ 2%) and lasts only for the 3-frame hold.
- "OUT OF HEALTH?" / "POP IT LIKE A BALLOON!" (yellow) with a "POP!" label 4 frames before the burst. The kill is a longer hold, then a 2-frame white swell, then a voxel-cube burst, not just a removal.
- "SAVE THIS FOR LATER!" (yellow, typed from f835). A bookmark outline draws on over f849-852 (28.30-28.40 s) and fills yellow in one frame at f860 (28.67 s). Full-juice hits keep looping underneath (f870, f894).
- Not narrated but visible: the hero runs a 3-swing combo (underhand upswing, backhand diagonal, leaping overhead chop). The overhead chop is the finisher: the hero hops, squashes on landing, and the knockback is about 50% bigger (+84..+90 versus +55..+63 px).
- Not narrated but visible: the knocked-back enemy squashes and stretches. It is about 10% taller and 12% narrower in the air, with a one-frame landing squash of up to +18% wide and -15% tall.
- Not narrated but visible: the hero's recoil is an additive -40 px kick fading over about 8 frames on top of its normal return, not a teleport to a new pose.
- Not narrated but visible: the enemy respawns with a scale-in from the floor that overshoots to about 1.1x before settling (about 7 frames).
- The health bar drains instantly with no trailing damage chunk or damage number. All weight comes from the target's reaction.
- HUD text is hand-drawn and 'boils' every 3 frames throughout; it never takes part in the camera shake.

## Uncertain

- Hit-sound pitch variation between repeats (about ±5% suggested by resampling correlation in the original pass) was not re-verified; narration overlap makes it low confidence.
- The swing whoosh is cleanly isolated only on the two speech-free outro hits (f870, f894). Its presence on the step 2-5 hits is inferred. It is clearly absent on the plain hits f78 and f261.
- Kill sound: the f820 broadband rise may be speech ('balloon') or a pop SFX timed to the POP! label; the f824 burst has no audible transient. No kill-specific sound is confirmed.
- True game-time durations: the capture is 30 fps of a game that probably ran at 60 fps. Shaken frames show doubled grid lines (frame blending or motion blur), so per-frame shake offsets are partly averages of two game frames, and the hold is about 3-3.5 video frames (100-120 ms) rather than an exact count.
- The two 4-frame holds (f649, f733) are both underhand (A) swings. Whether the hitstop is longer for that swing or this is 60→30 fps sampling cannot be told; the 4th frame is partly resumed.
- Whether the camera is exactly back at rest on the first resumed frame cannot be measured better than ±3 px, because floor-grid matching is ambiguous on the blended frames.
- Whether particles run in unscaled time during the hitstop or are simply spawned at impact and keep simulating: they visibly advance during held frames (f651-652) at normal speed; the mechanism is not visible.
- The enemy's return to its home spot (x offset easing back from impact+3, home by +13..+18) is probably the demo dummy resetting for the loop, not part of the knockback rule; in a real game the target would likely stay displaced.
- The kill debris count (several dozen cubes) and the exact number of extra shards could not be counted cleanly (the HUD text contaminates the purple mask).
- Step-4 narration: the spoken words could be 'back a bit' (matches the on-screen caption) or 'back off it' (TRANSCRIPTS.md); both mean a small attacker recoil.
- A subtle 2-3 px drift of the enemy and bar rest position between segments (e.g. bar left edge 333 versus 338) may be an edit-level zoom or reframe; it is unrelated to hits.
- The hop height of the C overhead chop (bounding-box bottom rising about 35 px) could partly be a step backward in depth; the landing squash at impact+2 suggests a real hop.
- Shard count (about 15-25) comes from blob counts with merging plus a visual count; exact emitter counts cannot be recovered.

## Verify verdicts

- **confirmed**: Impact frames: intro f23,f49,f78,f107,f136; step 1 f181,f208,f234,f261; step 2 f299,f325,f352,f378; step 3 f417,f445,f472,f496; step 4 f527,f553,f580,f606; step 5 f649,f681,f707,f733,f760; finisher f789, f817 (kill); outro f870, f894
  - The health-bar fill width drops 12 px on exactly these frames (72>60>48>36>24>12), and from f181 on the enemy white-pixel count jumps from under 700 to 3,800-6,500 on the same frames. The bar refills at f160, f277, f391, f500, f622 and f846.
- **confirmed**: Without a freeze, the flash lasts 2-3 frames (mean 2.3) and switches on and off with a hard cut
  - Counting white frames on the 16 no-freeze hits: 12 hits show 2 frames and 4 show 3 (f181-183, f325-327, f445-447, f553-555), a mean of 2.25 frames (about 75 ms). The enemy-centre patch goes #6F5FCC at f180, #F2EEFB at f181-183, then purple at f184, with no in-between frame.
- **confirmed**: With a freeze, the flash lasts freeze + 2 frames (5-6 frames)
  - White frames: f649-654, f681-685, f707-711, f733-738, f760-764, f789-793, f870-874, f894-898. The enemy is still white at f653-654 after it has launched (visual check).
- **confirmed**: In the plain intro the enemy never reacts (colour and position unchanged)
  - Over f0-499 the enemy bounding-box right edge stays at 399-405 px. The lighter centre patch on f23, f50 and f107 (#A38BD6) is the bloomed trail passing in front of the enemy (frame strip f21-26, f47-52); the body is not flashed.
- **confirmed**: Freeze: 3 frames (f681-683, f707-709, f760-762, f789-791, f870-872, f894-896), 4 frames on f649-652 and f733-736, 5 frames on the kill f817-821, starting on the impact frame
  - Shift-searched consecutive-frame residuals are 2.5-5.8 grey levels between held frames and 25-77 once motion resumes. Nuance: on f651>652 and f735>736 the enemy residual rises to 17.8/18.9 and the hero-to-enemy x gap changes by about 10 px (-145 to -154, -149 to -158), so the 4th frame is partly resumed. Both 4-frame holds are underhand-swing hits. Hitstop is about 100-120 ms.
- **corrected**: Shake: max |x| 10 px, |y| 8 px (≤1.7% of width, ≤0.16 capsule widths)
  - Template-matching the health-bar outline (the bar rides on the frozen enemy) against its position 3 frames before impact gives f649 (+12,+2) (-2,-6) (+1,+2) (+8,-3); f681 (+2,-3) (+4,-3) (0,0); f707 (+12,-2) (+8,0) (0,+2); f733 (+6,-8) (+3,0) (+6,0) (+9,-2); f760 (-4,-1) (-1,-6) (+3,-4); f789 (+8,-7) (-4,0) (-2,-3); f817 (+10,-9) (+12,+4) (-3,+3) (+5,-4) (0,-1); f870 (+6,-5) (-2,-1) (-2,-2); f894 (+9,0) (-5,-7) (0,-2). Max |x| = 12 px and max |y| = 9 px, i.e. ≤2.1% of the 576 px width and ≤0.19 enemy widths.
- **corrected**: Shake is a new random offset each frame with no decay
  - The mean offset size per held frame is about 9 px on frame 1, 6 px on frame 2 and 3 px on frame 3, so it decays. The first-frame x offset is positive (toward the enemy, i.e. along the hit direction) on 8 of 9 hits, mean (+6.8,-3.7) px. Pattern: a directional kick, then smaller random jitter. The 4th frames of f649/f733 (+8/+9) are the partly resumed frames.
- **confirmed**: HUD title and captions do not shake (offset 0 px)
  - The title-region difference is 0.1-0.4 on every non-boil frozen frame (f650, f651, f682, f708, f734...). Added: all hand-drawn HUD text 'boils', i.e. is redrawn with a small wobble, every 3 frames (10 fps), whether or not a hit is happening (diff spikes 5-12 on f640, 643, 646, 649, 652, 655...). That is a separate style effect, not shake.
- **unsupported**: Camera is back at rest (±1 px) on the first resumed frame
  - The floor grid gives only ambiguous matches. Shaken frames show doubled grid lines, as if two game frames were blended. Floor-region matching puts the first moving frames (f653-654, f684-685) within about ±3 px of rest. ±1 px cannot be confirmed.
- **confirmed**: Step 4 knockback: normal hits +55 px x, -40..-42 px y; third hits +84..+85 px, -56..-60 px; peak at impact+2; landing at impact+7..+10; home by +12..+14
  - Enemy centroid peaks: f553 +55 (f555), f580 +55 (f582), f527 +85 (f529), f606 +84 (f608). Minimum dy -42/-41/-56/-60 at impact+3. Bounding-box bottom is back at y≥466 at exactly impact+7 on all four hits. |dx|≤2 at +13/+14.
- **confirmed**: Step 5 knockback: peak at impact+4-5, +59..+63 px normal, +89 px on third hits, lands about +10, home about +17
  - Peaks: f649 +59 (+5), f681 +61 (+4), f707 +89 (+5), f733 +63 (+5), f760 +62 (+4), f789 +90 (+5), f870 +57 (+5), f894 +86 (+5). Landing at +9/+10; |dx|≤2 at +17/+18.
- **corrected**: The enemy 'slides back to its spot' after landing
  - The x offset starts shrinking right after the peak (f527: 85, 79, 69, 59, 51, 43 at landing, 39, 34, 27, 19, 12, 4, 0), at about 7-10 px per frame while the enemy is still in the air. It is one out-and-back offset (hop out, ease home), not a slide that starts on landing.
- **corrected**: On the impact frame the enemy is already moving (step 4)
  - True on 3 of 4 hits (f527 +36, f580 +31, f606 +18 px). On f553 it moves only 3 px on the impact frame and +44 on f554. Displacement on the impact frame depends on sub-frame timing.
- **corrected**: Enemy tilts back roughly 15-25° in the air
  - Principal-axis angle of the enemy mask: about +2° at rest, +14.1°/+12.9° at f528/f529 (combo-finisher hit) and +9.2°/+8.7° at f554/f555 (normal hit). So about 7-12° beyond rest, peaking at impact+1..+2. It is upright again by +4..+5 and tips slightly forward (-3..-5° relative) just before landing.
- **added**: (missed) The knocked-back enemy squashes and stretches
  - In the air it is stretched: bounding box 55-59 x 97-105 px versus 65x91 at rest (about -12% wide, +8-14% tall), e.g. f533, f559-560, f611-612. On the landing frame it squashes for one frame: f534 73x77, f561 67x85, f587 75x79, f613 77x79, f660 67x87, f691 71x83, f717 73x81, f744 69x87, f770 75x83, f799 69x87, f880 75x79, f904 75x79 (up to +18% wide, -15% tall). It is about half recovered on the next frame (63-65 x 87-91) and normal on the frame after.
- **confirmed**: Hero bounce-back: snaps from the lunge spot to about +10 px ahead of rest within 2 frames, about 40 px extra pull-back
  - Hero centroid x f527 216>187, f553 231>188, f580 209>188, f606 225>188 by impact+2. Steps 1-3 sit at +53..+57 px at impact+2.
- **added**: (missed) The recoil is an additive offset that decays on top of the normal attack return
  - f553 hero dx from impact: 55, 23, 13, 12, 12, 14, 17, 21, 22, 22, 20, 16, 10, 3. Steps 1-3 mean at the same frames: 55, 55, 52, 50, 48, 45, 42, 38, 32, 26, 19, 12, 4. The difference is 0, -32, -39, -38, -36, -31, -25, -17, -10, -4, +1: a -40 px kick in 2 frames that fades over about 8 frames (0.27 s). The visible path therefore drifts forward again by about 10 px before the normal return.
- **corrected**: Every third hit (f527, f606, f707, f789, f894) has bigger knockback; the swing shapes of big and small hits look similar
  - The loop is a fixed 3-swing combo: A, an underhand upswing (blade low, trail sweeps up); B, a backhand diagonal from over the shoulder; C, a leaping overhead chop. In C the hero's bounding-box bottom rises from 523 to 487 (a hop of about 35 px), the hero stretches on the lunge and squashes on landing at impact+2 (77-83 px tall versus 92). The rotation holds from f23 (A) to f789 (C); C hits: f78, f181, f261, f352, f445, f527, f606, f707, f789, f894. Every big-knockback hit is a C. The kill f817 is also a C, out of rotation (scripted).
- **corrected**: Anticipation: hero leans back and down about 21 px left and 17 px down
  - True for A and B swings (dx -17..-25, dy +16..+21 at impact-4). C swings instead move up (dy -21 at impact-2, -29..-33 at impact).
- **corrected**: Hero swings every 26-29 frames
  - Measured intervals run 24-32 frames: f472>f496 = 24, f649>f681 = 32 (includes a 4-frame hold), most are 26-29.
- **confirmed**: Step 3 particles: spawn at impact+1 just past the far side (x 406-423, y 408-419), about 15-25 shards, leading edge 14-21 px/frame, gone after 14-16 frames, colour #EFE289 to #E47C42
  - Warm-blob tracking: f418 x 406-423, y 408-419, colour #F0DD86. Blob count peaks at 15-16 (f425-426). Leading edge 423>437>451>465>483>501>519>537>557>572. Colour #E4BF5F at +7, #E6943E at +13, #E37C44 at +16. Gone at f434, f512, f668. Pink specks at f434-435.
- **corrected**: Particles fly straight along +x with y almost constant, very little gravity
  - The centroid first rises along the hit axis ((416,413)>(460,404) over 5 frames, slope about -0.2, matching the hero-to-enemy axis), then sinks about 20 px ((460,404)>(530,424) by +11). f496 behaves the same: (413,409)>(454,405)>(512,422). So there is light gravity.
- **corrected**: In step 4 the particles ride out with the launched enemy
  - The first clump (f528-530, x 404-429, y 402-421) appears at the contact point in world space, to the left of and in front of the already flying enemy (bounding box x 416-487). It is hidden behind the enemy at f531 and only shows on the enemy's right from f532 (frame strip f527-542).
- **confirmed**: Step 5 particles spawn at impact+1 or +2 and keep moving during the freeze
  - f649: first shards at f651 (+2); leading edge 431>453 between f651 and f652 while hero, enemy and trail are held. f681: shards from f682 (+1).
- **corrected**: WHACK! label appears on the impact frame, holds about 0.4 s, gone by about 0.75 s (f322)
  - Label pixel counts: on f299-310 (full), dimming f311-316, zero from f315 at the counting threshold and visually gone by f317-318. So it is visible about 18 frames (0.6 s). Same on f326-340, f352-366 and f378-393. It is written on over f325-326 for the second hit. Not on f351.
- **corrected**: Narration gaps are digital silence (for example 2.45-2.80 s and 8.55-9.00 s); hits f78 and f136 fall in gaps and are completely silent
  - The only stretches of at least 50 ms below -80 dBFS are 2.73-2.80 s and 3.86-3.93 s. The 2.47-2.80 s gap sits at -60 to -84 dBFS, and 8.55-9.00 s at -40 to -57 dBFS. f136 (4.533 s) overlaps the narration '...in five steps', with levels -19 to -47 dBFS. f78 (2.600 s) is near-silent (-76 to -84 dBFS). At f261 every band is at or below the noise floor once the 's' of 'frames' ends at about 8.62 s. Neither hit carries a hit sound or a whoosh.
- **confirmed**: No hit sound before step 2; the 25-90 Hz level rises about +25-30 dB from step 2 on
  - Peak 25-90 Hz band energy within ±0.2 s of each hit: -1 to +11 (relative dB) on all intro and step-1 hits versus +31 to +38 on every hit from f299 on, a gain of about +25-35 dB. Smoothed 35-80 Hz envelope peaks: -43 to -52 dBFS on plain hits versus -10 to -22 dBFS from f299.
- **confirmed**: Thump onset lands on the impact frame (within ±1 frame); fundamental 52-56 Hz
  - In half-frame (16.7 ms) bins the 35-80 Hz level jumps from about -35 to -15..-21 dBFS in the first half of the impact frame on f445, f527, f606, f707 and f894 (one bin earlier on f789), peaking 17-50 ms after. FFT peak over 0-200 ms after impact: 55.0, 56.0, 55.5, 52.0, 53.5, 55.0, 54.5, 51.5 Hz (f352, f445, f527, f606, f707, f789, f817, f894).
- **corrected**: Thump decays over 7-8 frames (230-270 ms); secondary low bump about 6.5 frames (215 ms) after onset
  - The 35-80 Hz envelope (f527, f606, f707, f894) peaks at +17..+50 ms, dips 10-20 dB at +67..+100 ms, rebounds and holds near -20 dBFS to about +230 ms, and is 10 dB down by about +350 ms. A second transient in 80-2000 Hz falls at about +170..+185 ms (half-frame bin +10/+11) on hits with and without a freeze (f527, f606, f789, f870, f894). It does not move with the freeze, so it is part of the sample, but it is about 5.3 frames, not 6.5.
- **corrected**: The impact sound is a thump plus a noisy 'whack'/crack at contact
  - In the speech-free outro the 2-10 kHz band shows no transient at contact (f894: -20, -21, -21 dBFS around the impact bin). The noise is a swing whoosh. It starts abruptly at the wind-up (f863 for f870, f885 for f894, i.e. 7-9 frames before impact), plateaus from about -3 to +4 frames and fades by about +10. It is absent on the plain hit f78 (all bands silent).
- **unsupported**: Kill audio: sub-bass lasts about 0.7 s (to about f848) versus 0.25 s on normal hits, suggesting a bigger kill sound
  - The 35-80 Hz band after f817 follows a normal hit (-30 at onset, -19..-26 to f827, -29..-44 from f828). The rise at f835-839 coincides with the narrator's 'Save' (2-10 kHz sibilant from f835.5). There is no transient at the f824 burst. A broadband rise at f820 (overall -12 dBFS) coincides with the POP! label and the end of 'balloon' and cannot be separated from speech.
- **corrected**: Bookmark: outline about 28.0-28.5 s, filled yellow by 29.0 s
  - Light-pixel count in the icon area: zero until f848; the outline draws on over f849-852 (28.30-28.40 s); it fills yellow in one frame at f860 (28.67 s; yellow count 0>1559) and stays.
- **confirmed**: Caption timings (e.g. TURN THE ENEMY WHITE... 6.73-6.97 s, FOR JUST A FEW FRAMES! 7.47-7.77 s, step-5 lines 22.6 / 23.97 / 24.27 s), title written on over 0.13-1.0 s
  - Per-frame text-band counts: L1 starts f202 (6.73 s), full f213 (7.10); L2 f224 (7.47), full f235 (7.83); step 5 L1 f678, L2 f719, L3 f728. Title pixels f4-f31. Note: the 1 fps contact sheets show frames about 0.5 s later than their labels (sheet '7.000' shows 'FO', first drawn at f224).
- **confirmed**: Captions clear 0.1 s before each new heading
  - Captions fade over about 5 frames (f151-157, f271-275, f385-390, f495-499, f616-621, f773-778) and are gone about 3 frames before the next heading or caption (f160, f277, f391, f500, f622, f780).
- **confirmed**: Kill: 5-frame freeze, POP! at f820, swell f822-823, burst into purple cubes at f824, debris gone about f846-847, respawn scale-in f846-853 with about 10% overshoot
  - Held-frame residuals 2.5-5.1 for f817-821. POP! first visible at f820. White body about 65x92 at f821, about 70x100 at f822 and about 85-95 x 120 at f823, bottom fixed at y 480. Bar outline gone and cubes at f824. Respawn heights 25, 65, 91, 103, 105, 101, 97, 95 px at f846-853 (rest 95), so overshoot is 1.10-1.11x.
- **unsupported**: About 45-50 kill cubes, 20-35 extra shards
  - Blob counting is contaminated by the light-blue HUD text, which passes the purple mask. Visually the count is several dozen cubes (f834), so the order of magnitude is plausible but the exact count is not verified.
- **corrected**: Step-4 narration 'bounce the player back a bit'
  - The on-screen caption reads 'BOUNCE THE PLAYER BACK A BIT!' (f600 crop). TikTok ASR says 'back of it' and TRANSCRIPTS.md renders it 'back off it'. The spoken words are near-homophones, so the narration is ambiguous; the caption says 'a bit'. Either way it means a small recoil.
- **corrected**: Intro narration 'Here's how to make it punchy in five steps' could not be verified
  - TikTok's captions (2.70-4.96 s) and the separate SenseVoice pass in TRANSCRIPTS.md agree on 'Here's how to make it punchy in five steps.' The on-screen caption differs ('LET'S MAKE IT PUNCHY... / IN 5 STEPS!').
- **corrected**: Pagination dots ①-⑤ shown 5.33-27.8 s with the current step filled
  - The dots appear at f162 (5.40 s) and fade at f831-834 (27.7-27.8 s). During the finisher (f780-833) no dot is filled.
- **added**: (missed) The health bar drains instantly with no trailing damage chunk
  - Bar crops (f706-710 and the intro) show the lost segment going straight to the dark empty track on the impact frame, with no white or yellow delayed chunk and no damage number.
- **confirmed**: Hero squash on overhead hits (76-80 px versus 92) belongs to the swing animation
  - Minimum bounding-box height at impact+2 is 77-83 px on every C swing (f78 79, f181 77, f261 83, f352 83, f445 77, f527 81, f606 79), with and without knockback.
- **confirmed**: No background music
  - Spectrograms show only speech harmonics, hit thumps and swing whooshes. The gaps between hits in the outro (29.15-29.48 s) drop to about -45 dBFS in every band.
- **unsupported**: Tonal partials near 1.2, 2.4 and 5 kHz ride along with the whoosh
  - Narrow-band peak search at these frequencies gives inconsistent frequencies (1082-1287 Hz, 2175-2562 Hz, 4538-5394 Hz) and similar prominence between hits and in speech. Horizontal lines near 5 kHz are also present at 26.0-26.5 s before any outro hit. Probably codec or other artefacts, not part of the hit sound.
