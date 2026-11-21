# Windbriar ability page: notes

Page: https://claude.ai/artifact/76ZcXQbuVdqCqPLzKPqYQN (version 7, 2026-11-18). Kit: `../windbriar-talents/WINDBRIAR_KIT.md` v1.3. The motion detail pass is in `MOTION_AUDIT.md`.
Design only. The game is untouched (feature freeze).

## What is on it (phase 1, base forms)

- W5 Tailwind (three casts fill the feathers, then the combo ends in the Gale Arrow), the Gale Arrow, W6 basic attack, W7 dash.
- F1 to F24 in their base form, F25 Kestrel Watch, F26 Fleet Foot.
- Chinese first, English switch (remembered in this browser), speed 1× / 0.5× / 0.25×, click a clip to pause.

Phase 2 (styles, done): each card has a switch for its base, Deadeye, Volley and Gale forms; the switch at the top changes every card.
Words under the clip change with the form (the kit's section 4 column, shortened). Defs: `FORMS.de / vo / ga` at the end of `tools/defs.js`.

Phase 3 (combos, done): C1 to C12 in their own section at the end (`DEFS.C1`..`C12` in `tools/defs.js`). Jade numbers are what the combo adds.
C2 uses a stand-in stone wall; C4 launches with her own Crescent Kick, then dives; C10 keeps the draw body while the page flips her.

## How it is built

- Live three.js page, not videos. One renderer draws each visible card in turn. Every clip is a function of its time, so slow
  motion and pause are exact. The motion runs at full speed on a laptop. In the cloud it renders at about 1 fps, so motion
  was judged from still frames only.
- Her model is the passed hare GLB with new clips baked in (`bake/new/*.mjs` on top of the passed clips; `bake/mk.sh out.glb`).
  The page ships it as base64 (`site/windbriar-model.js`) because artifacts do not serve .glb files.
- Root travel, jumps, flips and spins are done by the page (`tools/defs.js`, `root:` keys); the clip is the body.
- `tools/mkpage.py` writes `site/index.html` (`python3 mkpage.py local` for a local test with a local three).
  `tools/shot.cjs <id> <out.jpg> t1,t2,...` makes a contact sheet of one card.

## Stand-ins and guesses

- Passed clips reused: F15 Briar Trap uses castPlant, F17 Feather Fan uses castSweep, F18 Vault Shot uses vault,
  F23 Windrun uses run, the dash uses dash, the basic attack and Gale Arrow use combo.
- F25 Kestrel Watch: she idles; only the kestrel moves.
- All numbers are the kit's first guesses.
- Dummy shooter in F23 fires Foe Crimson shots. Wind is Wind Jade, arrows Feather Bone. No Ember, no Violet.

## Style stand-ins

- Since version 7 the Gale forms have their own body clips (`bake/new/40_gale.mjs`); see `MOTION_AUDIT.md`. Still on kata bodies: Gale Arrow, the dash, F19, F21, F24 (they are the same kick with more of it).
- Gale F10 and F14 use the passed walk as it is; every run card uses the version 8 bounding run.
- Dummies bunch together where a form pulls them in (Volley F14, Gale Gale Arrow and F16).

## Known small faults

- Her rig has no knee bones, so every kick is straight-legged. If they read stiff, the rig needs knee bones (N79).
- F8 Skypiercer: the bow touches her head for about one frame as she lands (1.45 s).
- F19 Crescent Kick: the overhead shot's draw paw sits 0.23 off the string.
- F7 Eagle Stance: one toe vertex dips 0.11 under the floor in the kneel.
- F16 Arrowstorm: the wide camera makes her small.
- Version 8 (Kesh's "then change it", 18 Nov): the run on this page is a new bounding hop (bake/new/50_run.mjs): both hind paws push together, she flies, lands, and the page plays the loop at the speed she travels. A planted paw now moves 0.5 to 0.8 u/s against 4.2 u/s of travel (it was sliding the whole way). The passed run clip in the rig file under tripo-pilot/ is untouched; the game model gets the bound only if Kesh asks when the freeze lifts.
- Correction: the earlier note said the old run "grips at 0.55 u/s". That figure was a bad measurement (it averaged the planted paw with the swinging paw). The real fault was stiff legs swinging like scissors with both paws skimming the floor. The slide itself was real.
- Found while measuring: on every circle path (F23, C12, Gale F5 and F10) she faced the mirror of her travel direction, so she ran backward at the quarter points; F17's turn was mirrored too and she glided back to her start. Both fixed in version 8.
- The walk still slides (Gale F10 and F14: paw grip 1.45 u/s against 0.6 u/s of travel). Kesh, 18 Nov: no need, good enough as it is.
- Gale F6 is called a flying knee, but with no knee it is a thrown straight leg.

## Open choices

- Live 3D page instead of mp4 clips (real speed, slow motion and pause); videos can be made instead if he prefers.

## Status

Kesh passed the whole page on 18 Nov 2026 (version 8). Version 9 below is not passed yet.

## Version 9 (19 Nov 2026, kit 2.5)

- After Kesh's sameness review (Deadeye skills repeated one idea), the design thread wrote kit 2.5
  (`/mnt/project-files/windbriar-talents/WINDBRIAR_KIT.md` section 4, notes section 10).
- Rebuilt 66 form cards, each marked "新 · 未通过 / New, not passed" when its style is picked:
  every bold cell of kit 2.5 (62) plus Sky Bolt (Deadeye F10), Wind wall, Decoy and Parting fans
  (Volley F8, F18, F23), which the page still showed in an older shape.
- Kept as passed: Deadeye F8 Big game, F22 Armour break; Volley F7 Mortar, F11 Cluster; Gale F7
  Breakdance, F13 Head hop. Base cards, passive, basic, dash and the 12 combos are unchanged.
- Every form line on the page now opens with its 特点 name (kit 2.5 wording).
- Dummies can face a way now (a small nose and arm), used for Flank and Avenger.
- Colours: effects stay Wind Jade and Feather Bone (colour pick 3 still open); foe wind-ups and
  foe shots are Foe Crimson #B8141F; the Dust cloud is plain brown-grey.
- Gale was built last and may change after Kesh's morning pass on the kit.
- Only seen as still frames in software GL (about 1 fps); speed and feel need his laptop.
- Known: the motion audit still flags foot slide in spins and slides (Gale F9 slide, F21 spin,
  F17 turn-to-run) and a few long-reach strikes from the wind (Gale F10, F12, F20). They are
  wind or arrow hits, not paw hits.
- Sources: `tools/k25_de.js`, `k25_vo.js`, `k25_ga.js` (merged into `defs.js` by `merge25.py`).

Status: version 9 waits for Kesh's pass.

## Versions 10 and 11 (19 Nov): knees
Kesh 19 Nov: "add for other hero to have knees as well". Her legs get a knee bone halfway down on load
(tools/knees.js; the GLB is untouched). Skill clips bend it forward (no splay): the build's hidden bend
(the leg root slid up into the tabard) is now half root, half knee, and feet that sank into the floor stand on it.
Idle, walk, run, dash and the basic combo never bend it (PASSED in wb.js). Changed cards carry a gold
"膝 · 新" chip. The tunic was checked from the side in stills (no clipping seen). Audit: tools/kneeaudit.html,
stills: tools/kneeview.html. Rule: /mnt/project-files/knees/KNEES.md.

## Version 12 (19 Nov 2026, kit 2.6 picks)

- Colour pick 3a: arrows, kicks, bow strikes, bursts and hit sparks are the Blade look (Blaze Core
  #FFF3C4 head, Blaze Gold #FFB43C tail, sparks throw short blurred gold rays). Wind shapes stay
  Wind Jade: twisters, the knot, nets, webs, walls, cords, the coil of Wound kick, the closing
  rain and the Sky Bolt reticle. Done as defaults in `wb.js` (arrow, trail, ring, disc, spark)
  plus `col: A.C.jade` on the wind rings in `defs.js`.
- Base nudge 2a: base Volley is a long narrow fan (6 u, 30°, three arrows of 14; `narrowFan` in
  defs.js, Painted fan uses it too). Base Feather Fan has no run: the release stays and the dart
  is a small weight shift. Feather sentry and Pinwheel have no run either.
- Built on top of the knees thread's version (knees.js, knee chips); both are in this build.
- Only seen as stills in software GL.

Kesh 19 Nov 01:27 UTC: "the knees part mark pass". The knees are passed; the "膝 · 新" chips can go at the next publish.

## Version 13 (19 Nov 2026): new motion from the street-dance / Dragon Nest pass, not passed
Kesh 19 Nov 09:24 SGT: Kill Shot Gale floated on the foe; Eagle Stance looked like a 一字马; Eagle Stance Gale sprawled 四仰八叉; 09:27 Ricochet Gale hopped like a 僵尸.
Spec from the design thread: /mnt/project-files/windbriar-talents/WINDBRIAR_MOTION_GALE.md (batch 1 Gale, batch 2 Deadeye and Volley).
- Eagle Stance (base, Deadeye, Volley): the kneeling archer. KNEEL in bake/new/10_shot.mjs: right knee down, left paw planted forward, hips -0.155; the runtime knees bend both. Spec's per-style extras (bow braced on the knee for Deadeye, 25° lean and 60° bow for Volley) not built yet.
- Ricochet Gale (GA.F13): clips gRico + gAirShot. Crouch and spring each time; head 1 a stomp on the left paw, head 2 a scissor with the right heel, head 3 a cartwheel (page roll 360 at spin -90) tapping both paws, head 4 a corkscrew (page roll 360) with the shot loosed upside down (20), three-point landing. Dummies weave.
- Breakdance (GA.F7): clips gTop, gSwipe, gMill, gFlare, g1990, gAirFlare, gChair (+ gKip). Windmill = page pitch -122 with a hips twist ±40 (roll onto each shoulder); flare = held on the forepaws, legs V 80°; 1990 = page pitch -180 on the right forepaw. Kick-outs only from the flare legs (2.3 to 2.84) and the air flare (4.05).
- Ride (GA.F6): clip gRide. Leapfrog mount, astride with the right forepaw on its ears; four stumbling steps (dummy face 45, bob and roll on each); stands on its shoulders and leans 42° to shoot down (24); the dummy goes down; recoil backflip (page pitch -360) to land behind it, looking back.
- Knee chips and the knee box are gone (knees passed 19 Nov). MOT set in mkpage.py badges the six re-motioned cards "新动作 · 未通过".
- Tools: wb.js reads globalThis.__camEl / __camAz (tools only, default view unchanged); shot.cjs takes EL and AZ env for side views.

## Version 14 (19 Nov 2026): Gale F1 to F5 and F8 to F12 re-motioned from the spec, not passed
- F1 pivot, pitched mule kick, tuck roll, sprinter-lunge shot (gChase, gLunge). Card headMin 0.02 so the floor guard lets the roll touch the floor.
- F2 coffee grinder (gGrindIn, gGrind loop) into a tornado kick (gTornado), lands on the right leg.
- F3 toprock into the axe kick, baby freeze with a bow tap (gBaby), sweep.
- F4 ski skid (gSki), then a corkscrew dropkick (gDropkick, hips 0 to 360), three-point landing.
- F5 six-step orbit round the foe (gSix, radius 0.77), handspring out (gHandspring).
- F8 bow as a spear (gSpear): pull out, figure eight, overhead helicopter, crouch sweep, throw.
- F9 baseball slide under it, three snap shots up between the hind paws (gSlide), kip-up behind it (slide ends at fw 2.6 so the launched dummy clears her).
- F10 four closing coffee-grinder turns (gGrindClose) with the shrinking rain ring, rises with a fist (gCloseUp).
- F11 sprinter's blocks, blast, flying side kick laid flat (gSideKick, page roll -75), long skid and turn.
- F12 instep keepy-up of the wheel (gKeepy) into a tornado kick (gTornadoS).
- Next: Gale F14 to F24, the Gale basic / Arrow ring / dash notes, Eagle Stance per-style extras, then batch 2 (Deadeye, Volley).

## Version 15 (19 Nov 2026): Gale F14 to F24 re-motioned from the spec, not passed (clips in bake/new/41_gale2.mjs, 42_gale3.mjs)
- F14 lasso whirl overhead (gLasso), tug-of-war haul leaning back with planted steps back (gHaul loop, page pitch -14), pirouette in the twister (gPirouette, page spin 720). Live cord helper `liveCord` in defs.js.
- F15 vine drawn like a sword, loop overhead, deep lunge, crack right to left at shin height, wrap and flick (gLash).
- F16 three shoves of the level bow from planted stamps (gShove, gShoveL), toprock with the bow on her shoulders between (gRock), a leaping flat-out push (gLeapShove, page pitch 55).
- F17 arrows spun on a fingertip into a cone, cross punch drives it in, hop back to a low crouch (gPinwheel).
- F18 handstand on its shoulders and a seesaw swap (gSwitch, page pitch 360).
- F19 rising front kick, butterfly twist, bicycle kick upside down, superhero landing (gJuggle).
- F20 dribble taps, knee juggle, rainbow flick, around the world, scorpion kick, roll out (gDribble, gKneeUp, gRainbow, gWorld, gScorpion).
- F21 three same-way spins on the left paw, parries, back kick / hook kick / crescent kick, side-on guard (gParry).
- F22 bow hooked behind both necks, dropped-weight hip-twist yank, toprock brag (gClap).
- F23 zigzag with four different turn kicks: hook, spinning back, tornado, low sweep; skid and toprock (zHook, zBack, gTornadoS, gSweepLow, zSkid).
- F24 launch, flip, corkscrew heel drill, three drill turns in the pit, back handspring to the rim (gSink).

## Version 16 (19 Nov 2026)
- Kesh 10:21 SGT: "Rain of Arrows: Gale: undo to previous version, that one is good". GA.F10 restored to its version 13 def (rRain, closing jade ring, no coffee grinder); the gGrindClose / gCloseUp clips stay in the bake unused. KEEP THIS ONE: do not re-motion Rain of Arrows Gale.
- The spec's "Also on the Gale side" (clips in bake/new/43_gale4.mjs): Gale basic beat 4 is now gHipSix (two hip shots over a crouched six-step); beat 5 was already a backflip with the shot down from the top. Gale Arrow ring thrown by a butterfly twist (gButterfly, page pitch 78 + spin 360). Gale dash ends in a diving side kick angled down (gSideKick from 0.06, page spin 90 roll -55).

## Version 17 (19 Nov 2026): Eagle Stance per-style extras and the thin Deadeye forms (spec batch 2), not passed
- Eagle Stance Deadeye: sEagleInDE / sEagleShotDE, bow level braced low on the raised left knee, hunched along it, 2 cm jolt per shot. Volley: sEagleInVO / sEagleShotVO, leaned back (spine -20), bow 72° up (AIMD -72), bob per shot. Clips appended to bake/new/10_shot.mjs.
- Deadeye (bake/new/44_deadeye.mjs): F1 dRoll (shoulder roll sideways, page roll -360, kneel, canted snap shot, bow behind back); F3 dBounty + dTuck (finger frame, point, one-motion snap; feather tucked behind ear at the payout); F4 dAirShot (1 u jump tipped forward, shot down, cord yank, paw brush); F9 dInterrupt (hip, knee, pivot shots, head still); F12 dSpotter (eight arrows flicked up, paw raised, fist); F13 dBank (glance along the bounce path, lean, bow canted 30°, step through); F15 dTrip (stab, one-paw cartwheel 4 u with a live wire, stab, pluck); F20 dLone (staff spin, leap, bow driven into the floor, blast, strike); F22 dBreak (hook aside, spear thrust with the bow, plates crack, shot into the crack).
- Kneels that must hold: put the kneel inside the clip's air window (as the Eagle clips do), or the bake slides her legs into a lunge.

## Version 18 (19 Nov 2026): the thin Volley forms (spec batch 2), not passed
Clips in bake/new/45_volley.mjs; card edits in site/defs.js (VO.*).
- F2 vSpinDraw: full draw turned through a whole circle (page spin 360, 0.32-0.8), hold sinks lower, the loose pushes her back.
- F3 vFlare: one-paw pirouette (page spin 360), snap shot straight up from behind her back; the arrow becomes the star; she shades her eyes looking up.
- F4 vNet: hop back with an overhead, nearly flat shot; draw paw pulled down as the net closes.
- F5 vScythe: ten snap shots while walking a quarter circle; the bow sweeps like a scythe; the last two from behind her back (body turned 60° away, arrows keep the sweep line).
- F8 vSlap: after the Skypiercer hang she lands and slaps both forepaws on the floor as the wall locks.
- F9 vFingerFan: flat release swept across her body, then a paw flick that paints the foes (old spin removed).
- F10 vUpShot + vPoint: lean-back shot straight up, then she points at the pack and snaps her facing to each hop.
- F11 vSnap: spins away on her toes after the lob, back to the blast, finger snap as the shards go off.
- F12 vBowl: bowling delivery out of the spin.
- F14 vSpindle: two-turn spindle on one paw, flat shot, both paws thrown up, head back.
- F15 vStabHop x3 + vWhip: hop and stab each trap, then the cord whipped out with a glint.
- F16 vSky2 + vCrossX: one arrow up to her left, a turn, one up to her right; forearms cross in an X as the curtains meet.
- F17 vGust: arrows opened like a hand fan, full-body swing low-behind to high-front, follow-through onto her toes.
- F20 vKnots: staff spin, thrust left (knot one), spinning back thrust right (knot two), bow held crosswise.
- F23 vRunBackA / vRunBackB / vRunRoll: shots back while running, under the arm, over the shoulder, and from a forward roll.
- F24 vCrater: three turns crouched in the crater with the bow up, then a kneeling freeze.

## Version 19 (19 Nov 2026): Eagle Stance fixes on Kesh's 11:25 SGT ask, not passed
- Kesh: "Eagle Stance: the base, deadeye and volley style: the stance pose, when stance start, it should stay stance pose, not re-play from normal post to stance pose for each arrow; Gale style: re-design the motion."
- Stance hold, two causes fixed: (1) the bake gives an IK track (staffPose / offHand) weight 0 on the frame where `from` or `to` sits exactly on the clip's start or end, so each shot's first and last frames dropped the bow arm to the raw pose; the Eagle clips now run their IK from -0.1 to T+0.13 (bake/new/10_shot.mjs). (2) wb.js poseBody crossfaded the same clip into itself (sEagleShot after sEagleShot shares one action, so the fade showed the bind pose); same-name neighbours now skip the crossfade. Fix (2) also helps Volley F15 (vStabHop x3).
- Rule for new clips: put IK `from` before 0 and `to` after T when the pose must hold across clip joins.
- Gale Eagle Stance redesigned (bake/new/46_eaglega.mjs, GA.F7): a b-boy get-down stance held all the way, draw paw planted on the floor, bow low in front. Four beats on the base stance's beat times: snap kick front-right, mule kick back with both legs, legs-together thrust kick to her right, back flick with the left leg; each beat kicks one dragged foe out (8), fires one stance shot (10), then hop-turns 60°. Drop-in spin and a push-up exit. The old breaking routine clips (gTop, gSwipe, gMill, gFlare, g1990, gAirFlare, gKip, gChair) stay in the bake unused.
- Paw plant reach: with spine 70 and hips -0.24 the planted paw lands within 2.4 cm (GRIP=1 env on build3.mjs prints the miss).

## Version 20 (19 Nov 2026): Gale Eagle Stance is now Wind well (kit 2.7), not passed
- Kesh 12:41 SGT: jump and dive to the ground; the slam makes wind that slowly, continuously drags foes in; she is free to move; at the end the wind bursts for damage; the wind does not follow her. (His second opening, jump and shoot an arrow into the floor, is kit pick 5b in the design thread; build it only if he picks b.)
- Kit 2.7 numbers (design thread): slam 10 within 1.5 u; the well stays 4 s where she landed and drags every foe within 4 u in at 1 u a second; the burst deals 24 within 3 u; a boss is not dragged.
- Clip gSlam (bake/new/46_eaglega.mjs): crouch, spring into a front tuck (page flip 360 and a 1.6 u arc), heel-first dive with the bow behind, slam crouch with the draw paw on the floor, rise at 1.25. Card GA.F7: she then runs a loop round the well (run, root path built in the def) and fires her basic combo at the gathered foes; the well bursts at 5.02. The b-boy stance clips from version 19 (gEagleK1-K4, gEagleIn/Out) stay in the bake unused.
- Page line for Gale F7 updated in mkpage.py (风井 Wind well).
- Kesh picked 1a in the design thread (19 Nov 13:02 SGT): Wind well keeps the dive slam; the arrow opening is dropped.

## Version 21 (19 Nov 2026): Rapid Fire Gale (Foot pin) motion redesigned, not passed
- Kesh 13:40 SGT: "Rapid Fire: Gale: redesign". Rule kept (a paw on its foot; fourteen hip shots of 4); motion only.
- New clip gPinKata (bake/new/47_galef5.mjs), 枪斗术 gun-kata standing over the pinned foot instead of the six-step orbit (six-step was also in the Gale basic and read alike): shots 1-3 twisting left-right with the bow flat at the hip; 4-5 leaning back under its chin; 6-8 through a snap kick of the free leg into its chest (the kick reaches waist height on this rig); 9-11 through a pivot on the pinned paw (page spin 360); 12-14 nose to nose; then a push kick off its chest and the back handspring away. Dummy moved to x -0.5 so she does not clip it.
- gSix stays in the bake unused by F5 (gHipSix still uses its legs).

## Version 22 (19 Nov 2026): Rapid Fire Gale is now Shadow kicks 影踢 (kit 2.8), not passed
- Kesh 14:09 SGT: a hard kick knocks the foe back; when the knock-back ends she appears at its back and kicks it another way; three kicks; the fourth kicks it up and one arrow follows. Kit 2.8 numbers from the design thread: three kicks of 10, each a 2.5 u knock-back at least 90° from the last (a Z path); blink to its back (untouchable, up to 7.5 u); fourth kick launches 0.6 s for 8; one arrow in the air for 24; no damage to foes it passes.
- Card GA.F5 (T 4.0): zBack spinning back kick (page spin 180, contact 0.49), blink + gRound side kick (1.22), blink + gTornadoS jumping tornado kick (1.9), blink low + gRise rising kick (2.54, launch up 0.99 = 0.6 s), vUpShot lean-back shot hitting near the apex (2.86). Jade dust, hip trail and ring at each blink; a foot trail, spark and ring on each kick; a bone trail on the dummy's knock-back path.
- Page line for Gale F5 updated in mkpage.py. gPinKata (v21) and gFrontKick stay in the bake unused.

## Version 23 (19 Nov 2026): Shadow kicks 4th kick goes higher, not passed
- Kesh 14:55 SGT: "all good, just the 4th kick, make it kick higher, kick to air". New clip gFlash (bake/new/47_galef5.mjs), a flash kick: she springs, the right leg whips up under the foe (contact 2.53) and keeps driving up as the page turns her through a backflip (rk 2.43-2.95, y 1.0, pitch -360), the other leg trails within 90°, she lands at 2.95.
- The foe now flies higher: launch height 2.8 (about 1 s in the air, was 0.6 s in kit 2.8). The lean-back shot starts at 3.0 and the arrow hits at 3.26 on its way down. Card T 4.4. gRise is no longer used by F5.
- Version 24 (Kesh 15:10 SGT: the last arrow faster, hitting at the top of the arc): vUpShot now starts at 2.88 at speed 2.5 (release 2.985), the arrow flies 0.05 s and hits at 3.035, the foe's apex (launch 2.53, height 2.8). Card T back to 4.0. Defs only, no rebake.
- Version 25 (Kesh 15:38 SGT "mark pass"): Shadow kicks (Gale F5) PASSED. mkpage.py now has a PASSED set and a green 已通过 / Passed badge (.passb in style.css).
- Version 26 (Kesh 15:58 SGT "mark all pass"): every new form and new motion on the page PASSED (PASSED |= MOT | NEW25 in mkpage.py; 74 badges, none left unpassed).
