# Video 4: gunfire-punchy (measured notes)

Checked twice: a watch pass measured every frame, then an independent verify pass re-measured each claim and corrected it. The verdicts are at the end.

Frame numbers count video frames at 30 fps (one frame is 33 ms, two Echoes ticks). Pixel sizes are in the video's own frame; widths in bw are the target's body width.

## Format

Portrait 576x1024, 30 fps, 52.2 s (1566 frames). It has a spoken voiceover. TikTok made no caption file; the narration comes from the merged offline SenseVoice transcript (/mnt/project-files/vfx-rules/TRANSCRIPTS.md section 4), checked against the on-screen captions. Hand-lettered all-caps captions in light blue (#88B4DA) are typed letter by letter in sync with the voice. The background is dark navy (#11192F floor, grid lines #475266), seen from a high three-quarter camera looking down at a grid floor. An orange capsule hero (about 52x79 px at full res) on the left holds a dark navy rifle pointing right. A purple capsule enemy (about 50-52 x 74-77 px) stands about 4.2 enemy-widths away on the right, in front of a vertical wire wall panel (#728BA7). The enemy has a green HP bar (#75CD6D, 72-74 px) above it. Structure: 0.00-4.63 s is a split screen with two identical scenes stacked, separated by a wavy line, under the title 'HOW TO: MAKE GUNFIRE PUNCHY!'. Both halves fire from f13 (0.43 s) to 0.97 s and again at 1.67-1.90 s. From 1.93 to 3.57 s the bottom half is dimmed to about 34%, the coral caption 'FEELS LIKE NOTHING.' is typed under the top half, and the top half fires alone (2.80-3.17 s). From 3.60 to 4.50 s the top half is dimmed, the gold caption 'FEELS LIKE THUNDER!' is typed, and the bottom half fires alone (3.97-4.37 s). At 4.50-4.63 s the bottom scene slides away and one full-width scene remains. At 4.67-6.57 s the card 'HERE'S THE DIFFERENCE... IN 7 STEPS!' plays over plain shots. Then 7 steps follow, each with a numbered title, a 7-dot pager and two caption lines. Pager change and HP refill happen on the same frame: step 1 6.73-12.13 (f202-363), step 2 12.13-18.17, step 3 18.17-24.17, step 4 24.17-28.87, step 5 28.87-34.13, step 6 34.13-43.73, step 7 43.73-49.73 (the pager fades out 49.70-49.90 s). The outro, 'SEND THIS TO YOUR FRIENDS!' in gold with a paper-plane icon that fills gold, runs 49.80-52.20. The layers are cumulative: each step keeps every earlier layer and adds one. At each step start the scene resets (HP refilled, enemy back in place), but blood and shells persist from step 5 to the end. Each step shows 1-8 automatic bursts (4, 5, 5, 3, 4, 8 and 1), about every 1.03-1.27 s. A burst lasts 10-16 frames (333-533 ms) at 15 shots/s. The kill burst is 24 frames (800 ms, 12 shots). The steps 1-5 demos are visually rich but silent. Gun audio exists only in the intro and in steps 6-7.

## Before and after

Narration: 'Same gun. The top one feels like nothing, the bottom one feels like thunder. Here's the difference in seven steps.' The top half is plain ('FEELS LIKE NOTHING.') and the bottom half is the full stack ('FEELS LIKE THUNDER!'). It is the same rifle firing at the same rate (one bullet per 2 frames, 15/s), in bursts that start on the same frame (f13). PLAIN: (1) There is no muzzle flash and no light. (2) Each bullet is a 3x3 px white dot, flying a dead-straight line at a constant ~45 px/frame, and every bullet is identical. (3) The enemy is completely inert. Its centroid moves under 1 px (345.5 to 346.2 over f8-33), its mean luma stays at 119.3-119.8, and it never changes shape or colour. Only the HP bar shrinks. (4) The hero does not move or squash, and the camera is static. (5) No blood, no shells, nothing is left behind. (6) Silence: while the plain half fires alone (2.80-3.17 s), 15-70 Hz energy stays at the no-gunfire level. JUICY, in the split-view scale where the enemy is about 44 px wide: (1) On the shot frame (f13) a white-hot starburst flash and an orange flame appear at the muzzle and light the scene, and the camera zoom-punches (the enemy shifts +5 px from the zoom alone). (2) Glowing tracers, with sparks at the wall. (3) Hit reaction 4 frames after the first shot (f13 shot, f17 hit). The enemy turns pale white-lavender (mean luma 119 to 178). It is shoved +6.6 px on the hit frame, about +24 px by f18 and up to about +40 px by f24-31 in screen space (about 0.9 enemy widths, including camera drift), with a small hop. It slides back from about f33. (4) The hero squashes from 44x65 px to 60x58 px (+36% width, -11% height) within 2 frames and shifts down-left, and the camera kicks. (5) Red splats land on the wall and red droplets on the floor, and gold casings drop at the hero's feet. (6) Loud gunfire: with the juicy half firing alone at 3.97-4.37 s, 15-70 Hz energy is about 25-35 dB above the plain half's solo.

## Step 1: The shot

**Narration.** Step one, the shot: kick the gun and flash the barrel. Every pull of the trigger needs an answer on the same frame.

**On screen.** 1 THE SHOT! / KICK THE GUN, FLASH THE BARREL... / ANSWER ON THE SAME FRAME!

**What you see.**

Four bursts start at 7.20, 8.40, 9.63 and 10.83 s with 7, 5, 6 and 6 shots. A shot fires every 2 video frames. Frame 1 of each shot: a big white-hot starburst with a yellow rim and 4-6 irregular points appears centred on the muzzle (about (236,463) px), with a faint soft square bloom quad behind it. Frame 2: it is replaced by a smaller orange flame tongue. Then the next shot's starburst appears. Under continuous fire the flash therefore flickers big/small at 15 Hz for the whole burst. It is at full size on the very first frame of the burst and gone on the first frame after the last shot (f230), with no fade in or out. The starburst's shape and rotation differ every shot. The flash is also a warm point light: the floor around the muzzle, the gun, the hero's side and even the enemy about 120 px away warm up on starburst frames and dim on flame frames. Bullets are still the plain 3 px white dots, which reach the enemy about 2 frames after leaving the muzzle. The enemy shows no reaction except the lighting. The 'kick the gun' is not visible: the receiver does not move at all.

**Measurements.**

- **muzzle flash life per shot**: 2 frames (66.7 ms): 1 frame of white-hot starburst, then 1 frame of orange flame. Each new shot restarts it, so in a burst the flash is on screen continuously (f216-f229 = 14 frames, 467 ms) and absent on f230 (frames 214-233, 250-263; confidence high)
  - Method: warm/white pixel counts in a muzzle ROI per frame; 3x contact sheets
- **fire rate and burst length**: 1 shot per 2 frames = 15 shots/s (66.7 ms period). Bursts are 5-7 shots (10-14 frames, 333-467 ms), repeating every 36-37 frames (1.2 s) (frames 216-229, 252-261, 289-300, 325-336; confidence high)
  - Method: alternating big-flash frames (216,218,...,228; 252,...,260)
- **starburst size**: 30-39 x 24-32 px (about 0.6-0.75 enemy widths). The principal axis varies between shots, so it is randomly rotated or reshaped (frames 216,218,220,222,224,226,228; confidence high)
  - Method: warm-pixel blob bbox per frame
- **orange flame size**: 23-28 x 17-21 px (about 0.5 enemy widths) (frames 217,219,221,223,225,227,229; confidence high)
  - Method: warm-pixel blob bbox
- **flash light radius**: Pixels at least +15 luma brighter than the pre-shot frame: about 3,900 on starburst frames vs about 1,050 on flame frames, inside a region about 110x85 px around the muzzle (2.2x1.7 enemy widths) (frames 216-219; confidence medium)
  - Method: luma difference vs frame 215 (analyst's; not re-measured)
- **enemy lit by the flash**: Enemy mean luma 114 to 133-137 on starburst frames (+17-20%) and 126-127 on flame frames. Mean RGB goes from 106,101,199 to 142,121,199 (a warm tint). The hero region rises about 8-11% (frames 212-233; confidence high)
  - Method: fixed capsule mask colour mean per frame
- **gun kick**: None visible: NCC tracking of the receiver gives 0 px shift on every frame of the burst. No rotation (frames 212-233; confidence high)
  - Method: NCC template tracking of the receiver box
- **ramp-in**: 0 frames. The first frame of a burst already has the full-size starburst (422 warm px, inside the mid-burst range of 369-526), and there is no fade-out after the last shot (frames 216, 230, 252, 262; confidence high)
  - Method: per-frame muzzle pixel counts

**Colours.** #FFF4CC starburst core (brightest #FEFBD4); #EBCD86 starburst body (bright #FEF0A7, edge #BC9764); #F0B446 orange flame (bright #FFE16D, edge #C1833D); #333541 soft square bloom halo over floor #11192F; #E97B2D hero orange (#FC8C31 when lit by the flash); #6C64C7 enemy purple; its mean shifts to about #8E79C7 on starburst frames

**Rule.** On the frame the trigger fires, show a full-size, randomly rotated white-hot muzzle flash that also lights the shooter, the floor and the target. Swap it for a smaller orange flame on the next frame and remove it on the third frame, so continuous fire flickers at the fire rate. No ramp-in, no fade-out.

## Step 2: Bullets

**Narration.** Step two, bullets: random spread and speed, a glowing tail, and sparks where they land. Identical bullets look like a laser.

**On screen.** 2 BULLETS! / SPREAD, A TAIL, SPARKS... / SAME BULLETS LOOK LIKE A LASER!

**What you see.**

Bursts start at 12.60, 13.83, 15.00, 16.03 and 17.17 s. The white dots become glowing tracer streaks: a white-yellow hot head with a yellow-orange tail that tapers back toward the gun. Each streak leaves at a slightly different angle and height and moves at a different speed, so the stream looks ragged instead of being one line. In this step the tracers pass through the still-unreactive enemy. Where a tracer crosses the translucent capsule, a pink glow lights inside it. They then hit the wall behind. Each wall impact makes a small yellow-white starburst of short spark streaks with a soft orange glow, plus a few loose specks. The sparks linger a few frames after the last shot.

**Measurements.**

- **tracer length**: 15-35 px (4-sigma principal-axis length), median about 22 px (0.3-0.65 enemy widths), about 3-6 px thick (frames 378-395; confidence high)
  - Method: connected warm-pixel blobs
- **tracer speed**: about 34-57 px/frame (about 1,000-1,700 px/s), varying per bullet. Plain dots move at a constant ~45 px/frame (frames 378-393; plain 150-165; confidence medium)
  - Method: blob centroid displacement between consecutive frames, outside the enemy (where its pink glow pollutes detection)
- **tail length vs per-frame travel**: about 0.4-0.6, so the tail reads like motion blur (frames 379-392; confidence medium)
  - Method: length / displacement
- **spread**: Screen angle +8 to +23 degrees vs the aim line at about +12 degrees (about ±6-10 degrees). Vertical scatter is about ±5 px at the enemy and ±11 px at the wall (frames 378-395; confidence medium)
  - Method: blob PCA angle and positions
- **wall spark burst**: Clusters 8-29 px across (0.15-0.6 enemy widths), about 5-10 short streaks each. Still visible about 6 frames (200 ms) after the last impact (frames 382-398; confidence medium)
  - Method: warm blobs in the wall ROI (analyst's)
- **flight time**: muzzle to enemy plane 2-3 frames (67-100 ms), to the wall 3-4 frames (frames 378-384; confidence medium)
  - Method: tracer positions per frame

**Colours.** #EEDEB1 tracer body (head #FFF8C1, tail #C1AC7A); #E7D5A3 wall sparks (cores #F5E5B6 to #FFFCC6); #F8AFCC pink glow inside the enemy where a tracer passes

**Rule.** Fire tracers, not dots. Give every bullet a hot head and a tail about half its per-frame travel, randomise each shot's angle (about ±6 degrees) and speed (about ±20%), and burst a short-lived (about 200 ms) spark star where it lands.

## Step 3: The hit

**Narration.** Step three, the hit: flash the enemy white, squash it and knock it back. If the target doesn't react, you can't tell you hit it.

**On screen.** 3 THE HIT! / FLASH, SQUASH, KNOCK BACK... / OR YOU CAN'T TELL YOU HIT!

**What you see.**

Bursts start at 18.63, 19.70, 20.77, 21.83 and 23.10 s. In the first burst the first bullets pass through with no reaction (f559-567, a before/after toggle). From f568 every arriving bullet does four things on its arrival frame: (1) it turns the whole capsule pale white-lavender with a white rim; (2) it squashes the capsule wider and shorter; (3) it shoves the capsule along the shot direction toward the wall, away from the shooter, which on screen is right and slightly up because the body moves deeper into the scene; (4) it adds a small upward hop. Bullet speeds are random, so hits sometimes land on consecutive frames and the capsule stays pale for the whole burst (f568-573); with gaps it alternates white and lavender (f594-602). Small dark, white and yellow chips fly back toward the shooter. After the burst a pink-magenta glow lingers on the capsule's far side. The capsule gets its shape back in about 3 frames, holds the pushed spot for about 0.3 s, then eases back to its start over about 0.35 s. The HP bar rides along with it.

**Measurements.**

- **white flash duration**: Peak on each arrival frame (mean luma about 170-187 vs 120 at rest and 136-146 when only muzzle-lit; 13-36% of pixels above luma 190). With a gap, the next frame drops back to the muzzle-lit level (burst 2 sequence f594-602: 182/146/147/169/157/180/168/174/149). With hits on consecutive frames it stays pale (f568-573: 172/164/184/174/187/182). Back to rest colour about 3-4 frames after the last hit (frames 568-575, 594-606; confidence high)
  - Method: eroded capsule mask (largest component) mean luma and whiteness fraction
- **bullet-to-reaction delay**: 2-3 frames (67-100 ms) from the first muzzle flash to the first enemy flash: f591->594, f739->742, f1038->1041 (3 frames), kill burst f1348->1350 (2 frames). The reaction lands on the bullet's arrival frame (frames 591-594, 739-742, 1038-1041, 1348-1350; confidence high)
  - Method: per-frame flash detection at muzzle and enemy
- **squash**: Width 48-51 to 55-57.5 px (+12 to +20%) and height 73 to 67-72 px (-1 to -8%) while hits continue. Back to rest shape within about 3 frames (100 ms) of the last hit (frames 567-577, 593-606; confidence high)
  - Method: capsule mask width (median of widest third of rows) and height
- **knockback**: The first hit moves the centroid +14.6 px x and -6.3 px y in a single frame (f567 to f568). It peaks at +29-32 px (including squash widening) and settles at +23 to +29 px (about 0.45-0.55 enemy widths) along the shot line away from the hero. The camera is static in this step (frames 567-584, 593-610; confidence high)
  - Method: capsule centroid track
- **hop**: The bottom edge rises from 472 to 453-455 px on screen, but it settles at 463-464 at the pushed position, because the push moves the body deeper into the scene. The real hop above the new ground is about 8-10 px (0.11-0.14 capsule heights). It peaks 2-3 frames after the first hit and lands 5-6 frames after it; in burst 2 there is also a brief landing dip to 469-472 (f600-602) (frames 567-584, 593-611; confidence medium)
  - Method: capsule bottom edge with reference lines; along-floor slope from the hero-to-enemy feet line
- **hold then return**: Holds the pushed position for 9-11 frames (300-370 ms) after the last hit, then eases back to its start over 10-11 frames (330-370 ms), averaging 2.5 px/frame (ease-in-out, peak 3.3 px/frame) (frames 574-593, 602-622; confidence high)
  - Method: capsule centroid track
- **afterglow**: pink-magenta tint on the far side lasts 4-14 frames after the burst (about 11-14 after burst 1, 4-6 after burst 2) (frames 574-590, 602-608; confidence medium)
  - Method: pink pixel count in the capsule box

**Colours.** #6C64C7 enemy at rest (highlight #8782F2, shade #4B4A99); #CEACE6 hit flash, whole capsule median (brightest/rim #EAD4E8); #BD89D0 far-side afterglow (bright #F8AFCC); #75CD6D HP bar fill, frame #5E7D9C

**Rule.** On the frame a bullet arrives, flash the whole target near-white (one frame per hit, letting overlapping hits keep it white), squash it about 15% wider and 5% shorter, and shove it about half a body-width along the shot direction with a small hop (about 0.12 body heights). Restore its shape within about 100 ms, hold the push about 300 ms, then ease it back over about 350 ms.

## Step 4: Recoil

**Narration.** Step four, recoil: push the hero back and kick the camera. The force should hit the player too.

**On screen.** 4 RECOIL! / PUSH THE HERO, KICK THE CAMERA... / THE PLAYER FEELS IT TOO!

**What you see.**

Bursts start at 24.63, 25.90 and 27.13 s. On the first shot the orange hero squashes fat and short and slides back away from the enemy (down-left on screen), and the whole view punches in about 3% with a jolt. During the burst the camera keeps getting pushed back opposite the shot direction, so the scene slides right; the camera follows the hero's push, so the hero stays near its screen spot while the world drifts. On release the hero pops back to shape in 3 frames with a slight stretch overshoot. Relative to the floor it is back in about 0.45 s. The camera holds about 0.25 s, then eases back over about 0.6 s, carrying the hero with it.

**Measurements.**

- **hero squash**: Width 52 to 64 px on the first shot frame (+23%, including about 3% zoom), up to 72 px (+38%). Height 79 to 70-72 px (-9 to -11%). Held for the whole burst. Width back to 52 px 3 frames after the last shot (60, 56, 52), with a height stretch to 82 px (+4%) 4-5 frames after (frames 736-756, 776-792; confidence high)
  - Method: orange capsule largest-component bbox
- **hero push**: -19 to -23 px relative to the floor (about 0.4 hero widths), directly away from the enemy. Screen motion is only about -3 to -10 px x and +8 to +15 px y because the camera follows. Back to its floor spot by about f763 (14 frames, 0.47 s after the last shot); on screen it overshoots right (+15 px) while riding the still-offset camera, then settles with the camera by about f776 (frames 739-776; confidence medium)
  - Method: hero centroid minus cumulative floor-patch shift
- **camera zoom punch**: +3.0 to 3.2% on the first shot of each burst: floor patches about 450 px apart separate by 14.3 px on f739. Decays to about 0 over 6-7 frames (200-230 ms). No further zoom jumps on later shots (frames 739-746, 777-781; confidence high)
  - Method: frame-to-frame NCC of left and right floor patches; scale = differential shift
- **camera push during the burst**: Burst 1: a steady push of +1 to +4 px per frame (about 0.05 enemy widths) with no recoveries. Burst 2: kicks of +3 to +7 px with -1.5 to -3 px recoveries between shots. Net drift +18 to +21 px (about 0.4 widths) over a 10-11-frame burst, opposite the fire direction (frames 739-749, 777-787; confidence high)
  - Method: frame-to-frame patch shifts
- **camera hold and return**: Holds 7-8 frames (f750-757, about 250 ms) after the last shot, then eases back at -0.6 to -1.2 px/frame over about 19 frames (f758-776, about 630 ms). That is about 0.9 s in all (frames 750-776; confidence high)
  - Method: patch shifts

**Colours.** #E97B2D hero at rest (highlight #FD994D, shade #BA6223); #FC8C31 hero while firing (lit by the flash)

**Rule.** On each shot squash the shooter (about +25-38% wide, -10% tall) and push it back about 0.4 body-widths, with the camera pushed a few px per shot opposite the fire direction and a ~3% zoom punch on the first round of a burst. After the trigger is released, restore the shooter's shape in about 100 ms with a small stretch overshoot and its position in about 0.45 s. Hold the camera about 0.25 s, then ease it back over about 0.6 s.

## Step 5: Blood & shells

**Narration.** Step five, blood and shells: spray it out and leave it on the floor with the cartridges. The fight should leave a mess.

**On screen.** 5 BLOOD & SHELLS! / SPRAY IT, LEAVE IT ON THE FLOOR... / THE FIGHT LEAVES A MESS!

**What you see.**

Bursts start at 29.33, 30.50, 31.57 and 32.83 s. Again the first bullets of the first burst pass through (f880-886; the enemy's small rightward creep there is the recoil camera), and the first registered hit is at f887. Each hit makes a small red puff at the entry point. A dense red splash slaps onto the wall behind the enemy and stays as a growing decal. Red droplets spray back, down-left toward the shooter, and rain onto the floor 50-80 px in front of the enemy, where they stay as small red spots that build into a pool. Each shot ejects a gold cartridge case upward out of the rifle's receiver, just right of the hero. It tumbles, drops beside the hero's front-right foot and stays, so casings pile up. None of it fades: the wall splat, floor pool and casing pile are all still there through steps 6-7 and the outro.

**Measurements.**

- **blood timing**: Entry puff on the first hit frame (f887, the same frame as the white flash). Wall splat from 2 frames later (f889). Droplets flying back from f890 (frames 885-894; confidence high)
  - Method: 2x crops per frame
- **wall splat size**: Grows to a bbox of about 39x52 px (about 0.75 x 1.0 enemy widths; about 965 red px) by f1015. Persists to the end of the video (frames 892-1015; confidence high)
  - Method: red mask in the wall ROI
- **floor droplets**: About 10-20 per burst, each 2-6 px. They fly 50-80 px back toward the shooter and land within about 10-12 frames (330-400 ms). They never fade (frames 891-913; confidence medium)
  - Method: red blob centroids tracked per frame (analyst's)
- **shell ejection**: About one casing per shot, out of the receiver above the gun, up then down to the floor right of the hero's feet in about 6-8 frames (200-270 ms), tumbling. Casing about 6-8 x 3 px (about 0.15 enemy widths) (frames 879-896; confidence medium)
  - Method: 2x contact sheet
- **casing pile**: About 15-16 casings visible after 4 bursts, overlapping in a pile with a bbox of about 55x38 px at the hero's feet (frames 1015; confidence medium)
  - Method: gold mask bbox and visual count
- **persistence**: Blood and casings remain for the remaining about 18 s of the video (steps 6, 7, outro); there is no fade or cleanup (frames 1015-1566; confidence high)
  - Method: 1 fps sheets

**Colours.** #A8213A airborne/floor droplets (bright #E2303F, dark #7B0F38); #9F1E13 wall splat (bright #B72717); #781921 settled floor pool; #C2954A shell casings (bright #EBBB5C, dark #A17430)

**Rule.** Spray blood both ways from every hit: an entry puff on the hit frame, an exit splash onto the surface behind 2 frames later, and droplets back toward the shooter. Eject one casing per shot at the shooter's feet, and leave all of it on the floor and walls for the rest of the fight.

## Step 6: Sound

**Narration.** Step six, sound: a crack on every shot, a whiz as the bullet flies, a thud on the body and a ping off the wall. Use a few samples and nudge the pitch every time; the same sound twice in a row feels fake.

**On screen.** 6 SOUND! / CRACK, WHIZ, THUD, PING... / FEW SAMPLES, NUDGE THE PITCH! — plus in-scene comic words: CRACK! (at the muzzle), WHIZ! (over the bullet path), THUD! (at the enemy), PING! (at the wall)

**What you see.**

Bursts start at 34.60 (all layers, no word), 35.73 (CRACK!), 36.83 (WHIZ!), 37.93 (THUD!), 39.13 (PING!), 40.17 (PING!), 41.40 (PING!) and 42.60 s (no word). The visual stack is unchanged. For each layer burst a yellow comic word is typed at the place and moment its sound comes from: CRACK! just above the muzzle on the shot frame, WHIZ! above the middle of the bullet path 1 frame later, THUD! at the enemy's upper left on the hit-arrival frame (3 frames in), PING! at the wall when tracers reach it (6+ frames in). The word is re-stamped on each shot with small offsets, giving a doubled, jittering look, then fades out about 0.7 s after it appears. The HP bar turns coral red once it falls below about a third (f1258).

**Measurements.**

- **gun sound only from this step on**: 15-70 Hz energy during bursts is about 30 dB higher in steps 6-7 (+25 to +35 dB on my per-frame scale) than in steps 1-5 (about -10 to +5 dB, the same as voice-only windows). In step 2 shots fire at f481-485 while the audio is at -86 to -91 dBFS. So the steps 1-5 demos are silent and the gun comes in about 30 dB louder when 'sound' is turned on (frames all 30 bursts (f216-f1371); confidence high)
  - Method: per-frame 4096-pt FFT band energy; per-frame rms
- **onset vs first muzzle frame**: Audio leads the first muzzle-flash frame in all 12 sound-on bursts: f13 -103, f50 -47, f119 -10, f1038 -48, f1072 -103, f1105 -102, f1138 -50, f1174 -118, f1205 -54, f1242 -11, f1278 -56, kill f1348 -73 ms (median -55 ms, about 1.5-2 frames). The spectrograms agree (kill rattle starts about f1344.6). The consistent lead points to an edit or encode offset; the file shows sound and flash within 0-4 frames, sound first (frames 13, 50, 119, 1038, 1072, 1105, 1138, 1174, 1205, 1242, 1278, 1348; confidence medium)
  - Method: causal 4th-order 70 Hz low-pass + 15 Hz high-pass, 10 ms causal envelope; onset = first time within 10 dB of the burst's 90th percentile; spectrogram cross-check
- **sound tail**: Gunfire energy continues about 0.05-0.25 s past the end of the last muzzle-flash frame in normal bursts (f1038: +0.20-0.24 s; f1138: +0.05-0.12 s). The kill tails about 0.45 s (to about 46.18 s), including the kill thumps (frames 1050-1058, 1147-1153, 1371-1386; confidence medium)
  - Method: causal sub-bass envelope
- **word animation**: 'C' f1072, 'CRA' f1073, 'CRACK' f1074, 'CRACK!' f1075 (typed in 4 frames, starting on the first shot frame), re-stamped with offset f1076-1078, fading f1090-1094, gone f1096 (about 0.75 s life). Onsets relative to the burst's first muzzle frame: CRACK! +0, WHIZ! +1, THUD! +3, PING! +6 (frames 1072-1096, 1105-1130, 1138-1160, 1174-1201, 1205-1231, 1242-1273; confidence high)
  - Method: frame reading; yellow-word pixel counts per frame
- **pitch variation between repeats**: not measurable: the voiceover covers almost every burst, and at 15 shots/s the rattle has no separable per-shot transients (envelope autocorrelation shows no peak at the 66.7 ms shot period) (frames 1072-1091, 1205-1217, 1348-1372; confidence low)
  - Method: onset detection, envelope autocorrelation, spectral centroid

**Colours.** #F1D577 onomatopoeia yellow (bright #FAE381); THUD!/PING! slightly oranger #E4B67B to #ECB171; #F46F56 HP bar fill when low, below about 32% (replaces green #75CD6D)

**Rule.** Give every shot four sound layers, each fired at its own event: a crack at the muzzle on the shot frame, a whiz while the bullet flies, a thud on the hit-arrival frame, and a ping when it reaches the wall. Draw each from a few samples and nudge the pitch on every play, so no two sounds in a row are identical.

## Step 7: The kill

**Narration.** Step seven, the kill: freeze for a beat and throw the body into the wall. The last bullet has to feel the biggest. ('the kill' is from the merged transcript; voiced speech at 44.6-44.8 s, just before the gunfire starts, fits it.)

**On screen.** 7 THE KILL! / FREEZE, THEN THROW THE BODY... / THE LAST BULLET HITS HARDEST! (the first caption line starts typing on f1372, at the kill)

**What you see.**

One long burst, 44.93-45.73 s (f1348-1371, 24 frames, 12 shots), with every layer and sound on. The enemy flashes, squashes and is pinned toward the wall in a growing blood spray. Kill sequence: (1) The last starburst is f1370 and the last flame f1371; from f1372 the gun is silent and the last tracer is still in flight. (2) f1373: the last bullet reaches the body. Camera, gun and HP bar are still for this one frame, but the hero (recoil recovery), the fading enemy flash and the particles keep moving, so it is not a full world freeze. (3) f1374: the HP bar disappears (still about 74% full), the capsule turns fully pale white-lavender, the camera punches in hard (about 7.5%), and blood bursts at the entry point. (4) f1374-1376: the enemy is held upright and white (f1376 already fading). (5) It topples back into the wall: about 90 degrees from f1376 to f1380, easing in (axis tilt about 28, 42 and 54 degrees at f1377-1379), ending on its side at the wall's base. Its colour returns as a darker purple. (6) It slides about 25-30 px back off the wall and comes to rest by about f1400 in the blood pool. The camera eases out of the punch and drifts back left. The corpse, blood and casings stay through the outro.

**Measurements.**

- **freeze**: No pixel-identical frames, and no global hitstop. f1373 (33 ms) is a camera/gun stop: floor patch diff 0.15/0.00 (NCC shift exactly 0), gun 3.4 and HP bar 1.3, vs 3-40 on firing frames. The hero (6.6) and enemy (12.1) still change. Then the white body is held upright for f1374-1375 and starts to tip on f1376-1377. Total pause before the topple is about 3-4 frames (100-130 ms) (frames 1366-1380; confidence medium)
  - Method: regional frame differences; capsule axis track
- **kill white flash**: 2 full frames plus 1 fading frame (mean luma 182/178/146 at f1374-1376, 113 at f1377; colour about #C4A2CA), vs 1 frame per ordinary hit (frames 1371-1377; confidence high)
  - Method: capsule mask luma
- **kill camera punch**: About +7.5% zoom in one frame on f1374, centred near the enemy's feet (about (368,488)): the wall's top corner moves (402,327) to (407,315), and the hero moves -15 px and grows 77 to 87 px tall. It decays over roughly 7-10 frames (wall-corner offsets -12, -9, -4, -5, -5, -3 px). That is about 2.5x the ~3% first-shot punch (frames 1372-1385; confidence medium)
  - Method: non-periodic features (wall corner, hero box); the floor grid aliases under this jump
- **body throw**: Upright at f1376 (axis 98 deg, where 90 = vertical), tilting about 28/42/54 deg at f1377-1379 and horizontal at f1380 (bbox 70x39): about 90 degrees in 4 frames (133 ms), easing in, ending against the wall (frames 1373-1381; confidence high)
  - Method: capsule principal-axis angle and bbox
- **rebound and rest**: Corpse centroid x 410.7 to 365.8 px (f1380-1400) while the camera drifts about -19 px (wall top corner 403 to 384). It slides about 26 px (25-31 px; about 0.5 enemy widths) back off the wall, decelerating to rest at f1400 (0.87 s after the kill frame) (frames 1380-1401; confidence medium)
  - Method: capsule centroid minus wall-corner shift
- **HP bar at the kill**: The bar still shows about 74% (54-55 of 72-74 px green) on f1370-1373 and is removed on f1374. The kill is scripted to the 'last bullet', not to the bar (frames 1312-1374; confidence high)
  - Method: green-mask extent
- **kill audio**: Causal sub-bass envelope: a dip at 45.70-45.74 s, a bump peaking at 45.82 s, a dip at 45.94 s, a bump at 45.98-46.02 s, and below -55 dB by 46.18 s (broadband silence 46.18-46.30 s). With the ~2-frame audio lead, the two bumps map to about the kill/topple start (f1376-1377) and the landing (f1381-1382). The narration 'freeze' begins at about 45.83 s and overlaps (frames 1370-1390; confidence low)
  - Method: causal 15-70 Hz band envelope at 20 ms steps

**Colours.** #C4A2CA kill flash on the capsule (lighter pixels #CCADE6); #625DC0 dead body (RGB about 98,93,192; luma about 106 vs about 120 live with the same mask), possibly partly lighting on the lying capsule; #781921 to #A8213A blood pool and spray

**Rule.** Make the killing hit the biggest beat: stop the camera and gun for a frame, hold the victim upright and white for about 2-3 frames, punch the camera in about 2.5x harder than a normal shot, then throw the body along the shot direction into the nearest wall with a fast, easing-in ~90-degree topple (about 130 ms), a short slide back off the wall and a darker dead tint. Remove its HP bar on the kill frame.

## The kill or finisher

The finisher is step 7, one burst at 44.93-45.73 s (f1348-1371, 12 shots). The last starburst is f1370 and the last flame f1371; f1372 has no muzzle flash, and the last tracer reaches the body at f1373. Frame f1373 (45.767 s) stops the camera and gun (floor diff 0.15/0.00, gun 3.4, HP bar 1.3 vs 3-40 on firing frames), but the hero's recoil recovery, the enemy's fading flash and the particles keep moving. So the 'freeze' is not a global hitstop; at most a 1-frame camera/gun stop is visible at 30 fps. Frame f1374 (45.800 s) is the kill frame: the HP bar is removed while still showing about 74% fill, so the kill is scripted. The capsule turns fully pale white-lavender (#C4A2CA) for 2 full frames plus 1 fading frame (luma 182/178/146 at f1374-1376), vs 1 frame per normal hit. The camera punches in about 7.5% in one frame, centred near the enemy's feet at about (368,488). That is about 2.5x the ~3% first-shot recoil punch, and it decays over about 7-10 frames. Blood bursts from the entry point. The body stays upright and white through f1375-1376, then topples into the wall, easing in: about 28 degrees at f1377, 42 at f1378, 54 at f1379 and horizontal at f1380. That is a quarter turn in 4 frames (133 ms). Its colour returns as a darker purple (luma about 106 vs 120 live), possibly partly from lighting. It slides about 26 px (0.5 enemy widths) back off the wall and comes to rest at f1400, in a pool that keeps growing. The corpse, wall splat, floor pool and casing pile all stay in view through the outro to 52.2 s. The first caption line 'FREEZE, THEN THROW THE BODY...' starts typing on f1372, at the kill. Audio is low confidence because the narration overlaps: the sub-bass dips around the last shots, bumps at about 45.82 s and 45.98-46.02 s, and is silent by about 46.18 s. Since the file's audio leads its video by about 2 frames, these bumps fall around the topple start and the landing.

## Sound

There is a full voiceover from about 0.1 to 50.5 s. There is no caption file; the text is the merged SenseVoice transcript (TRANSCRIPTS.md section 4), which includes 'Step 7, the kill'. The gun sound is a dense, broadband auto-fire rattle with a strong sub-bass boom (15-70 Hz) and energy up to about 16 kHz. Where it plays: in the intro (both halves firing at 0.3-1.3 s; the juicy half alone at 3.97-4.37 s) and in every step 6 and step 7 burst. On a per-frame scale it is about 25-35 dB above the no-gun level. It is absent from the plain half (2.80-3.17 s) and from every step 1-5 burst. Step 2 even fires shots at f481-485 while the audio sits at -86 to -91 dBFS. So the steps 1-5 demos are visually juicy but silent, and 'Step 6: Sound' turns the gun on. Alignment: measured with a causal 70 Hz low-pass envelope (the original 5 ms STFT method cannot resolve 15-70 Hz). The first gunfire onset LEADS the first muzzle-flash frame in all 12 sound-on bursts, by 10-118 ms (median 55 ms, about 1.5-2 frames): f13 -103, f50 -47, f119 -10, f1038 -48, f1072 -103, f1105 -102, f1138 -50, f1174 -118, f1205 -54, f1242 -11, f1278 -56, f1348 -73 ms. The spectrograms confirm it (the kill rattle starts at about f1344.6). A lead this consistent is most likely an edit or encode offset, so the file cannot prove frame-exact sync, only that sound and flash are within about 0-4 frames. The gun sound tails about 0.05-0.25 s past the last flash frame in normal bursts and about 0.45 s at the kill. Step-6 layers: the creator labels them crack (muzzle), whiz (flight), thud (body) and ping (wall), but they cannot be separated in the mix. The narration covers almost every burst, and at 15 shots/s the rattle has no separable per-shot transients (no 66.7 ms periodicity in the envelope autocorrelation), so pitch nudging is not measurable. Kill (low confidence, narration overlaps): the sub-bass bumps at about 45.82 s and 45.98-46.02 s and is silent by about 46.18 s. The low-frequency bumps at the step changes (12.0, 18.0, 24.0, 28.7, 34.0 s) are the spoken 'Step N': the same envelope recurs at each, and the spectrogram shows the fricative-vowel-plosive pattern. They are not a transition SFX.

## Principles

- Build feedback in layers on one unchanged gun. Fire rate, damage and scene stay identical from 'nothing' to 'thunder'; only presentation layers are added (flash, tracers, hit reaction, recoil, debris, sound, kill beat).
- Answer on the trigger frame, react on the arrival frame. The flash appears at full size on the shot frame with no ramp; the target reacts on the frame the bullet arrives (2-3 frames / 67-100 ms of flight here), never later.
- Fast attack, slow release. Squash and flash snap in within 1 frame and recover in about 100 ms. Displacement holds about 0.25-0.35 s and returns over 0.35-0.6 s (enemy slide-back about 0.35 s, hero back to its floor spot about 0.45 s, camera hold 0.25 s then ease-back 0.6 s).
- Variety kills the 'laser' look. Randomise every repeat: bullet angle and speed, flash sprite rotation and size, sample choice and pitch, even the stamped onomatopoeia's position.
- Feedback at both ends plus the world. The shooter gets flash, light, squash, push, casings and camera push. The target gets white flash, squash, knockback, hop and blood. The environment gets wall sparks and persistent decals.
- Light sells the shot. The muzzle flash is also a light source: hero, gun, floor and even the enemy warm up on flash frames (enemy +17-20% luma).
- Persistence: the arena should record the fight. Blood and casings never fade, so later beats play over an accumulating mess.
- Escalate the finisher. The last hit gets a camera/gun stop, a longer white flash, about 2.5x the camera punch, and a big directional throw into geometry. It ends with a darker dead tint and no HP bar.
- Contrast and colour coding. White-hot cores and a white hit flash pop against the dark navy floor. Warm yellows and oranges belong to the shooter's effects, red to blood, and the victim's own purple washes to white when hit.
- Sound is a layer of its own and a large part of the punch. The same visuals are demonstrated silent in steps 1-5, and the intro's 'thunder' half is about 30 dB louder in the sub-bass than the silent plain half.
- Place sounds at their sources and their moments: crack at the muzzle on the shot frame, whiz on the path while it flies, thud on the body on the hit frame, ping on the wall when the bullet gets there.
- Transfer notes for Echoes (camera and capsule scale match closely). The pixel values here can be expressed relative to capsule width: flash 0.6-0.75 widths, tracer 0.3-0.65 widths, knockback 0.45-0.55 widths, hop about 0.12 heights, recoil push 0.4 widths, camera push about 0.4 widths per burst, zoom punch 3% (normal) and about 7.5% (kill). Echoes' colour law restricts some colours to one meaning: Ember #FF5A36 for enemy threats only, Bright Heal #5FE873 for healing only, Violet #B79CF0 for corruption only. So the hero's muzzle and tracer warms must stay off Ember. The coral HP-low red (measured #F46F56) is close to Ember and the pale-lavender hit flash (#CEACE6) is close to Violet, so both would need checking against those rules.

## Extra tips

- 'FEELS LIKE NOTHING.' (coral #DB6858) under the plain top half vs 'FEELS LIKE THUNDER!' (gold #E9DB8A) under the juicy bottom half. Each is shown with the other half dimmed to about 34% and its own half firing alone; the voice says 'Same gun.'
- 'HERE'S THE DIFFERENCE... IN 7 STEPS!' (the second line is gold #F6DF80), played over plain dot bullets.
- 'ANSWER ON THE SAME FRAME!' The muzzle flash is at full size on the first frame of every burst and gone on the first frame after; narration: 'Every pull of the trigger needs an answer on the same frame.'
- 'SAME BULLETS LOOK LIKE A LASER!' Tracers vary in angle (about ±6-10 degrees) and speed (about 34-57 px/frame), and each muzzle starburst is rotated differently; narration: 'Identical bullets look like a laser.'
- 'OR YOU CAN'T TELL YOU HIT!' The first burst of step 3 starts with bullets passing through an unreactive enemy, then switches on flash, squash and knockback mid-burst; narration: 'If the target doesn't react, you can't tell you hit it.'
- 'THE PLAYER FEELS IT TOO!' The hero squashes up to +38% wide, is pushed back about 0.4 widths, and the camera zoom-punches 3% and is pushed about 20 px; narration: 'The force should hit the player too.'
- 'THE FIGHT LEAVES A MESS!' The wall splat, floor blood and casing pile persist for the rest of the video; narration: 'Spray it out and leave it on the floor with the cartridges.'
- 'FEW SAMPLES, NUDGE THE PITCH!' with narration 'The same sound twice in a row feels fake.' The on-screen words CRACK!, WHIZ!, THUD! and PING! are placed where each sound comes from and appear at its event moment (shot frame, +1, hit frame +3, wall arrival +6), re-stamped with an offset on every shot.
- 'THE LAST BULLET HITS HARDEST!' The kill gets about a 7.5% camera punch (vs 3%), a 2-3-frame white flash (vs 1), and a 90-degree throw into the wall.
- 'SEND THIS TO YOUR FRIENDS!' (gold #EEDD8C), with a paper-plane outline that fills gold (#E8DD8A). The outro is shown over the corpse and the mess.

## Uncertain

- The narration comes from ASR (two SenseVoice passes merged with the on-screen captions), not from a caption file; the step 7 words 'the kill' rest on that transcript plus voiced speech at 44.6-44.8 s.
- Audio leads video by 10-118 ms in every sound-on burst (median 55 ms). This is most likely a capture/edit/encode offset, so 'same frame' sound sync cannot be confirmed or refuted from this file.
- Freeze/hitstop: no frame is pixel-identical, and on the one camera/gun-still frame (f1373) the hero and enemy still change. If the game used a hitstop, it is either shorter than one 30 fps frame or limited to the camera and gun.
- Pitch variation between repeats and the separation of the crack/whiz/thud/ping layers were not measurable, because the voiceover masks them and the 15 shots/s rattle has no separable transients.
- Kill audio bump timings (about 45.82 s and 45.98-46.02 s) overlap the spoken 'freeze' and may be partly voice.
- In the first bursts of steps 3 and 5 the first 2-3 bullets pass through without a reaction (f559-567, f880-886). This looks like a deliberate off/on toggle, but that is inferred.
- The step 3 hop height (about 8-10 px) depends on separating the push into depth (which raises the body on screen) from the vertical hop, using the floor slope of the hero-to-enemy line.
- Hero squash and push numbers in step 4 include about 3% camera zoom on the first frames and the camera drift; the push relative to the floor depends on floor-patch tracking, which drifts about 3 px over a burst.
- The kill camera punch is measured from the wall corner and hero box only; frame-to-frame grid tracking aliases to the grid period on that jump.
- The darker dead tint (luma about 106 vs 120) may be partly lighting on the lying capsule rather than a deliberate colour change.
- The step 3 afterglow (4-14 frames) may partly be the tracers' own light inside the translucent capsule.
- The casing count (about 15-16) and blood droplet counts are visual and approximate, because casings overlap in the pile.
- The HP bar showed about 74% when the enemy died, so the kill timing in the demo is scripted and does not follow the bar.
- Top vs bottom HP drain in the intro could not be compared reliably (the dimmed halves break the green mask), so 'same gun, same damage' rests on the narration ('Same gun.').

## Verify verdicts

- **corrected**: Step boundaries (pager change and HP refill): step 1 6.77-12.00, 2 12.13-18.00, 3 18.17-24.00, 4 24.17-28.73, 5 28.87-34.00, 6 34.13-43.60, 7 43.73-49.80
  - Pager dot luma per frame: dot 1 fades in f199-202 (lit at 6.73 s), dots 2-7 switch on f364, f545, f725, f866, f1024, f1312 (12.13/18.17/24.17/28.87/34.13/43.73 s). The HP bar refills on the same frames (green width 28->74 at f363->364, 35->72 at f544->545, 46->74 at f724->725, 56->72 at f865->866, 48->72 at f1023->1024, 0->74 at f1311->1312). The pager fades out over f1491-1497 (49.70-49.90 s). The starts are confirmed. The ends were about 4 frames early: each step runs until the next step starts.
- **confirmed**: Steps 1-5 demos have no gun sound; gun audio exists only in the intro and steps 6-7
  - 15-70 Hz band (4096-pt FFT per frame) during bursts: steps 1-5 about -10 to +5 dB, steps 6-7 bursts +25 to +35 dB on the same scale. Strongest proof: step 2 burst f481-492 fires shots at f481-485 while broadband rms is -55, -63, -86, -91, -76 dBFS, i.e. digital near-silence. The broadband noise at the start of step 1 burst f216-231 is the spoken 'the shot': the spectrogram shows glottal pulses at about 100 Hz in f222-227.
- **confirmed**: Intro: the plain half firing alone (2.80-3.17 s) is silent; the juicy half alone (3.97-4.37 s) is about 30 dB louder in sub-bass
  - Per-frame 15-70 Hz: f84-95 -9.5 to +7 dB; f119-131 +21 to +34 dB on the same scale (difference about 25-35 dB).
- **corrected**: Audio onset vs first muzzle frame: same frame (+5 to +18 ms) in 5-6 of 12 bursts, about 1 frame early in 3, 52 ms late at f1242, so within about 2 frames
  - The original method (a 5 ms STFT frame on a 15-70 Hz band) cannot resolve that band: the bins are 200 Hz wide. I re-ran it with a causal 4th-order 70 Hz low-pass plus a 15 Hz high-pass and a 10 ms causal envelope, taking the onset where the level comes within 10 dB of the burst's 90th percentile. The audio LEADS the first muzzle-flash frame in all 12 sound-on bursts: f13 -103, f50 -47, f119 -10, f1038 -48, f1072 -103, f1105 -102, f1138 -50, f1174 -118, f1205 -54, f1242 -11, f1278 -56, kill f1348 -73 ms (median -55 ms, about 1.5-2 frames). The spectrograms agree: the kill's broadband rattle starts at about f1344.6 (-110 ms), f1205's at about f1202.8, and f1138's at about f1135.5. Because the lead is consistent, it is most likely an edit or encode offset. The file therefore cannot prove 'same frame'; it shows sound and flash within about 0-4 frames, with the sound always first.
- **corrected**: Gunfire sound tails 0.25-0.5 s past the last muzzle flash
  - In the causal sub-bass envelope, f1038 burst (last flash f1050, ends 35.03 s) decays by about 35.23-35.27 s (+0.20-0.24 s). f1138 burst (ends 38.27 s) decays by about 38.32-38.38 s (+0.05-0.12 s). The kill (ends 45.73 s) falls below -55 dB at about 46.18 s (+0.45 s, including the kill thumps). Normal bursts tail 0.05-0.25 s, and the audio's ~2-frame lead shortens the apparent tail.
- **corrected**: Kill audio: 12 dB dip at 45.76-45.84 s, thumps at 45.86-45.92 and 46.06-46.12 s, fade by 46.28 s
  - Causal 15-70 Hz envelope at 20 ms steps: a dip to -50 dB at 45.70-45.74 s, a bump peaking -28 dB at 45.82 s, a dip -50 dB at 45.94 s, a bump -33 to -35 dB at 45.98-46.02 s, and below -55 dB by 46.18 s (broadband silence 46.18-46.30 s). The narration 'freeze' starts about 45.83 s, so the shape stays low-confidence. The analyst's times are 40-100 ms later than these.
- **confirmed**: Step 1 muzzle flash: 1 frame white-hot starburst then 1 frame orange flame per shot, continuous over f216-229, gone f230, no ramp
  - 3x crops of f214-233: starburst with a square bloom on even frames f216-228, an orange flame on odd frames f217-229, nothing on f230. Warm-blob bbox: starburst 30-39 x 24-32 px (422 warm px on f216, 369-526 mid-burst), flame 23-28 x 17-21 px.
- **confirmed**: Flash lights the enemy: luma 115 -> 134-136 on starburst frames, 127 on flame frames
  - Fixed purple mask of 3384 px: 114.1-114.5 at rest (f212-215, f230-233). Starburst frames 132.7-136.7 (RGB 106,101,199 -> 142,121,199). Flame frames 126.2-127.5. The hero box rises 86 -> 93-96 (+8-11%).
- **confirmed**: Gun kick not visible
  - NCC tracking of the receiver box (x160-215, y455-490) against f214 gives 0,0 px shift on every frame f212-233 (corr 0.87-0.94 on flash frames because of the lighting).
- **corrected**: Fire rate 15 shots/s (1 per 2 frames), bursts 10-16 frames, every 1.03-1.27 s, 3-8 bursts per step, kill burst 24 frames
  - Muzzle detector burst starts match every listed time (f216, 252, 289, 325 / 378, 415, 450, 481, 515 / 559, 591, 623, 655, 693 / 739, 777, 814 / 880, 915, 947, 985 / 1038, 1072, 1105, 1138, 1174, 1205, 1242, 1278 / 1348-1371). Intervals are 1.03-1.27 s. Bursts per step are 4, 5, 5, 3, 4, 8 and 1, so the range is 1-8, not 3-8. The kill burst is 24 frames (12 shots).
- **confirmed**: Step 2 tracers: 15-33 px long, 37-57 px/frame, angle +7 to +19 deg vs aim about +13 deg
  - Warm-blob tracking f378-395: lengths (4 sigma) 15-35 px, consecutive displacements 34-50 px/frame (f378->379 +34, 379->380 +49, 380->381 +46, 381->382 +50), angles 8-23 deg vs an aim line of 12 deg (muzzle (237,462) to enemy (357,436)). The pink glow inside the capsule pollutes detection at x 320-385, so confidence stays medium.
- **confirmed**: Step 3: first bullets pass through (f559-567); first reaction f568
  - Enemy centroid stays at 356.4-357.7 over f559-567, with luma rising only on muzzle-lit frames (129-151). At f568 cx jumps to 371.5 and luma to 172. Step 5 likewise: no reaction f880-886, first hit f887 (luma 176, cx +17). Steps 4, 6 and 7 react from the first bullet.
- **corrected**: Bullet-to-reaction delay 3 frames (100 ms)
  - First muzzle frame to first enemy flash: f591->594, f739->742, f1038->1041 (3 frames), but kill burst f1348->1350 (2 frames), consistent with step 2's random bullet speed. Correct value: 2-3 frames (67-100 ms).
- **corrected**: Hit white flash lasts 1 frame; the next frame is back to 0-10% white
  - Burst 2 (f594-602) mean capsule luma 182/146/147/169/157/180/168/174/149, where 136-146 is the muzzle-lit level, so each arrival flashes for 1 frame. In burst 1, f568-573 stay pale throughout (mean luma 172/164/184/174/187/182; white fraction 0.18/0.04/0.32/0.13/0.36/0.28) because random-speed bullets land on consecutive frames. The colour returns to rest within about 3-4 frames of the last hit (f602 149, f603 132, f605 129, f606 126).
- **confirmed**: Squash: width 50 -> 56-58.5 (+12-17%), height 74 -> 68-70
  - Eroded/dilated capsule mask: median-of-widest-third width 48-51 at rest -> 55-57.5 during hits; height 73 -> 67-72. Shape is back within about 3 frames of the last hit (f574-577, f602-605).
- **confirmed**: Knockback: +16 px x / -5 px y on the first hit frame, cumulative +25-30 px
  - f567->568 cx 356.9->371.5 (+14.6), cy 436.4->430.1 (-6.3). Peak cx 385.7 (f572) and 388.6 (f599) vs rest 356.9 (+29-32 incl. squash widening); settled hold +23 (f577-584, cx 379.7) to +29 (f602-610). The camera is static in step 3.
- **corrected**: Hop: bottom edge rises 474 -> 454-457 (17-20 px, 0.25 capsule heights)
  - Bottom edge 472 at rest -> 453-455 during hits (f570-572, f596) -> settles at 463-464 at the pushed position (f574-584, f603-611). The knockback moves the body deeper into the scene, which is up on screen (along-floor slope about -0.25 to -0.4 px y per px x, so +23-28 px x gives about -6 to -9 px y). The real hop above the pushed ground is therefore about 8-10 px (0.11-0.14 capsule heights), peaking 2-3 frames after the first hit and landing 5-6 frames after it. In burst 2 the body also dips about 7 px below its new ground at f600-602 (a landing squash) before settling.
- **confirmed**: Hold 8-11 frames then slide back in 8-10 frames at 2.5-3 px/frame
  - Burst 1 holds f574-584 (11 frames) and starts back (378.1 at f585), but burst 2 interrupts at f591. Burst 2 holds f602-610 (9 frames), returns f611-621 (384.3->358.9, 25 px in 10 frames, ease-in-out: deltas -1.6, -2.2, -2.3, -3.3, -3.3, -3.3, -2.7, -3.1, -1.7, -1.9).
- **corrected**: Pink-magenta afterglow on the far side for 6-10 frames after the burst
  - Pink pixel count in the capsule box: burst 1 stays 140-587 px through f588 (about 11 frames after the last bullet arrives at about f577). Burst 2 is gone by f607 (about 4-6 frames). Range 4-14 frames. Part of this may be the tracer's own light inside the translucent capsule.
- **corrected**: Step 4 hero squash 52 -> 62 px first frame (+19%), max 68 (+31%), height 70-72, back in 2 frames, overshoot to 82
  - Orange-mask bbox: 52x79 at rest; f739 64x80 (+23%, includes about 3% zoom); f743-745 72x70-72 (+38%, -9 to -11%). Width back to 52 at f752, 3 frames after the last shot f749 (60, 56, 52). Stretch 82 px (+4%) at f753-754. Burst 2 matches (f777 64x78, f781 72x72, f791 52x80).
- **confirmed**: Camera zoom punch +2.9-3.0% on the first shot of each burst, decaying over about 6 frames
  - Frame-to-frame NCC of floor patches at x 20-85 and x 465-540: at f739 the patches separate by +14.3 px across about 450 px (+3.2%), then the separation decays 11.0, 7.7, 5.5, 3.6, 1.9, 0.9 px over f740-745 (about 6-7 frames; the integrated tracker drifts about 3 px). Burst 2 at f777 also gives about 3%. No further zoom jumps occur on later shots.
- **corrected**: Camera per-shot kick +4 to +7 px with -1 to -3 px partial recovery, net +18-23 px
  - Burst 1 (f740-749) is a steady push of +0.9 to +3.8 px/frame with no recoveries. Burst 2 (f778-787) has kicks of +3.0 to +7.2 px with recoveries of -1.5 to -2.9 px. The net camera shift is confirmed at +18 to +21 px (left patch +20.7 at f749, right +18.5).
- **confirmed**: Camera eases back at -1.0 to -1.3 px/frame over about 20 frames
  - Added detail: after the last shot f749 the camera HOLDS for 7-8 frames (f750-757, shifts within 0.3 px). It then eases back at -0.6 to -1.2 px/frame over f758-776 (about 19 frames), about 0.9 s in total after the last shot.
- **corrected**: Hero pushed -19 to -23 px relative to the floor, returning over about 25 frames (0.8 s)
  - Hero cx minus floor shift: -18.7 at f745, -23.1 at f749 (confirmed). Relative to the floor it is back to about -2 px by f763, 14 frames (0.47 s) after the last shot. On screen it overshoots to +14.7 px at f763 while riding the still-offset camera, then settles with the camera by about f776.
- **confirmed**: Step 5: entry puff on the first hit frame f887, wall splat from f889, droplets spray back toward the shooter, one casing per shot from the receiver
  - 2x crops f885-894: red puff at the entry point on f887-888, wall splat appears f889, droplets fly down-left f890-894. Crops f879-896: gold casings leave the receiver above the gun and tumble to the floor right of the hero's feet.
- **corrected**: Blood and casing colours; splat 25-35x50 px; casing pile about 45x25 px
  - Median colours at f1015: wall splat #9F1E13, floor pool #781921, casings #C2954A (confirmed). Bounding boxes: splat 39x52 px, casing pile 55x38 px (larger than stated).
- **confirmed**: Blood and shells persist to the end; the scene resets HP and position each step
  - 1 fps sheets at 34, 44 and 48-51 s show the splat, pool and casings intact. The HP bar refills on each pager frame.
- **confirmed**: CRACK! typed f1072-1075, re-stamped with offset, faded by about f1094-1096
  - Crops: 'C' f1072, 'CRA' f1073, 'CRACK' f1074, 'CRACK!' f1075, overlapped double stamps f1076-1078, single at f1088, fading f1090-1094, gone f1096.
- **added**: Each comic word appears at its sound's event (added)
  - Yellow-word pixels (region above the scene) first appear relative to the burst's first muzzle frame: CRACK! +0 (f1072, the shot frame), WHIZ! +1 (f1106 'WH', bullet in flight), THUD! +3 (f1141, the hit-arrival frame, enemy white), PING! +6 (f1180 'P', f1182 'PING!', when tracers reach the wall), later PING! +6/+7 (f1211-1213) and +11 (f1253-1255).
- **corrected**: In the 'few samples' bursts PING! returns
  - PING! shows in the 40.17 s and 41.40 s bursts (f1213-1231, f1255-1270). The last burst at 42.60 s (f1278-1289) has no word: yellow-word count is 0 on f1279-1309.
- **confirmed**: HP bar turns coral red below about a third at f1258
  - Green width 24-26 px at f1256-1257 -> red at f1258 (23 px of about 73, 32%). Red colour about #F46F56 (RGB 244,111,86), a little more saturated than the stated #F06C59.
- **corrected**: Kill: firing stops after f1372; f1373 is the near-still frame
  - The muzzle detector's last starburst is f1370 and last flame f1371; there is no flash from f1372. A tracer is still in flight on f1372 and reaches the body on f1373.
- **corrected**: f1373: camera, gun, casings and HP bar almost still; only blood particles move
  - Regional frame differences f1372->1373 (vs 3-40 on neighbouring frames): floor patches 0.15/0.00 (NCC shift exactly 0, corr 1.00), gun 3.4, HP bar 1.3, casings 4.0, pool 3.6. But the hero still changes (6.6; recoil recovery, width 60->56, height 74->77) and so does the enemy (12.1; flash fading, luma 168->143). This is a camera/gun stop as firing ends, not a world freeze.
- **confirmed**: Kill white flash 3 frames (f1374-1376) vs 1 frame per normal hit
  - Capsule mean luma 182 (f1374), 178 (f1375), 146 (f1376, fading), then 113 (f1377, purple). That is 2 full frames plus 1 fading frame.
- **confirmed**: Kill camera punch +7.4% in one frame, about 2.5x the first-shot punch
  - The wall panel's top corner moves (402,327) -> (407,315) at f1374: -12 px vertical at about 161 px above the stated centre (368,488), about 7.5%. The hero shifts cx 119.1 -> 104.2 (-15 px vs -18 expected at 7.4%) and grows 77 -> 87 px tall. Warning: frame-to-frame floor-grid NCC aliases to the grid period on this jump (it reads +7 px for both patches), so only non-periodic features are valid here.
- **corrected**: Body rotates about 40/60/75/90 deg at f1377-1380
  - Timing confirmed: upright at f1376 (axis 98 deg, vertical = 90), horizontal at f1380 (axis 179 deg), so about 90 deg in 4 frames. The principal-axis fit gives smaller intermediate tilts (about 28, 42 and 54 deg at f1377-1379), so the topple accelerates (ease-in) rather than being linear.
- **corrected**: Rebound: corpse slides about 30 px back off the wall (camera -13 px), rest by about f1400
  - Corpse cx 410.7 (f1380) -> 365.8 (f1400), stable at f1400-1401. The camera drift measured on the wall's top corner is -19 px (403 -> 384, f1380-1399), so the slide relative to the wall is about 26 px (0.5 enemy widths; 25-31 px depending on the drift estimate). Rest by f1400 is confirmed.
- **confirmed**: Dead body darker purple (luma 99 vs 115)
  - Same mask method: live at rest luma about 120 (RGB 114,106,207); corpse 106-107 (RGB 98,93,192), about 11% darker. This could be lighting on the lying capsule rather than a deliberate tint.
- **confirmed**: HP bar still about 73% at the kill; removed f1374
  - Green width 54-55 of 72-74 px on f1370-1373; 0 on f1374.
- **confirmed**: Intro: plain enemy inert; juicy hit 4 frames after the f13 shot; hero squash 43x65 -> 57x56
  - Plain top enemy cx 345.5 -> 346.2 over f8-33, luma 119.3-119.8. Juicy bottom enemy luma 119 -> 178 at f17; cx +6.6 on f17, +24 by f18 (relative to f12, including the camera). Its +5 px jump at f13 is the zoom punch, not a hit. Juicy hero 44x65 -> 60x58 by f15 (+36%, -11%).
- **confirmed**: The non-active half is dimmed to about 30%
  - Bright hero pixels in the bottom half drop from a top-500 mean of 175 (f40) to 58-59 (f70-100), i.e. 34%. Bottom dims f58-62, top dims f106-110, top restores f126-134.
- **corrected**: Step 7 narration: only 'Step seven' was recognised; whether 'the kill' is spoken is unclear
  - The merged transcript (TRANSCRIPTS.md section 4, two SenseVoice passes) reads 'Step 7, the kill: freeze for a beat and throw the body into the wall. The last bullet has to feel the biggest.' The spectrogram shows voiced harmonics at f1338-1343 (44.6-44.8 s), between 'Step seven' and the start of the gunfire, which fits 'the kill'.
- **confirmed**: Narration text for steps 1-6
  - Matches TRANSCRIPTS.md section 4 word for word ('a whiz as the bullet flies'). Added the intro 'Same gun. The top one feels like nothing, the bottom one feels like thunder. Here's the difference in seven steps.' and the outro 'Send this to your friends.'
- **confirmed**: Low-frequency bumps at 12.0, 18.0, 24.0, 28.7 s are the spoken 'step', not a transition SFX
  - The same envelope shape (sub-bass up to about -40 dB, broadband -21 to -25 dB) recurs at 12.0, 18.0, 24.0, 28.7 and 34.0 s. The 11.8-12.5 s spectrogram shows fricative noise (f357-360), a voiced segment, a burst and a voiced segment: 'Step two'.
- **confirmed**: Per-shot pitch variation not measurable
  - Envelope autocorrelation of the kill burst (44.86-45.70 s) and two step-6 bursts shows no peak at the 66.7 ms shot period in either the sub-bass or the 2-12 kHz band, so individual shots cannot be separated.
- **confirmed**: Capsule sizes: hero 52x79, enemy 50x74 px
  - Colour-mask bboxes at f212-215: hero 53x78, enemy 52x77 (a threshold-dependent difference of ±3 px). Centre-to-centre gap 218 px, about 4.2 enemy widths.
