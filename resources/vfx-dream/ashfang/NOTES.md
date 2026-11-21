# Ashfang VFX dream loop (page only, game frozen)

Step 1 (19 Nov): four impact shots for Kesh to repaint in ChatGPT images.

- Review build rebuilt from the page backup (ashfang-abilities/tools/src = v35, hooks.py, review-only-build/reviewFlatStage.js,
  GLB tripo-pilot/fox-model/fox-tripo-rigged.glb -> public/review/) on gauntlet ae0fc5d in a scratch worktree, never committed.
- Camera: the game's play camera FOV 45 (the page uses 21-28). Rendered 1920x1080 at DSF 2 (3840x2160); targets are
  1920x1080 native crops; full frames in full/. Caption and legend hidden, game HUD kept (out of crop).
- Recorder: ashfang-abilities/tools/rec2.cjs with env W/H/DSF/FOV/FROM/TO/EXT/NOCAP (copy in tools-vfx/rec2.cjs).
  Jobs from motion26.json: S15 Crescent Finisher frame 34, S21 Lunge Strike 14, S20 Triple Crescent 16, S39 Thousand Cuts 14.
- Crop centres (4K): S15 1820,960; S21 1880,960; S20 2000,1000; S39 2000,1040.

Step 2 waits for his repaints. Judge: one persistent Fable subagent per skill scores live vs target and plans the fix
list (Kesh 19 Nov 06:11 UTC); Opus builds. When stuck, Kesh judges from a side-by-side ("Now: X, Expected: Y").

## Triple Crescent: PASSED v8 (Kesh 9/10, 19 Nov 17:26 SGT)
Built as strandCrescent({blaze:true}) -> blazeCrescent(): additive feather trails + body (hot pink core over magenta/crimson) + two echo blades + pink core, a normal-blended silver-white hairline edge under the bloom threshold with a sliding glint; needle tips (pw 2.2). Hits: cream-white core flash, white-tipped radiating needles, faint white ring. Files: triple-crescent-v8-vs-target.jpg, triple-crescent-live-v8(.mp4, -slow.mp4).

## Thousand Cuts: judge PASSED 9/10 (19 Nov, round 7), waits for Kesh's eye
- One straight camera-facing needle cut per struck foe (1.45 u, 0.105 u mid, sin^2.2 taper): hot-pink body, white-pink core (middle third), silver hairline riding the edge. Angle from the foe's place in the pack: front-left 75° "/", front-right -65° "\", centre and back 28-36° descending right. A repeat hit replaces the foe's old cut; cuts hold at 85%+ until the click.
- Two solid crescents round him (replacing the 5 floor whirls): lower-left ~100°, 0.2 u; upper-right ~60°, 0.14 u, shifted 0.3 u right, with a normal-blended pink base. No depth test.
- Burst per hit: 12 tapered pink needles with white last quarter, fanned 200° outward, hot-pink knot; 5 sliver flecks drift off each cut's tips. No white flash sprite (it bloomed into haze).
- Files: thousand-cuts-vs-target.jpg, thousand-cuts-live(.mp4, -slow.mp4); src/reviewAshfangFx.js.

## Audit (Kesh 19 Nov 22:17 SGT): copy only the LOOK of the repaint onto the original's effects; never add the repaint's extra 剑光
- Thousand Cuts v2: the two swirl crescents removed; one cut per hit again (a repeat hit on a foe crosses its earlier cut at +50/-40/+25°).
- Lunge Strike v2: the X of crescents + star + fanned streaks removed. The original drill is back in the look: the spiral is one camera-facing blade ribbon (hot pink body, white-pink core, silver hairline, thick on the lobes), the cones a faint pink haze (x0.06), the spear band back as hot pink + white-pink core, hit sparks as pink white-tipped needles on each foe the spiral reaches.
- Crescent Finisher and Triple Crescent: audited OK (same elements restyled; Triple's hit sparks were Kesh's ask).
- Files: thousand-cuts-v2-original-target-live.jpg, thousand-cuts-live-v2(.mp4,-slow); lunge-strike-v2-original-target-live.jpg, lunge-strike-live-v2(.mp4,-slow).

## Round 2 (19 Nov, from 14:50 UTC)
- Kesh: apply the learned looks to every skill; shoot only the looks none of the passed four cover.
- Survey: 30 jobs from ashfang-abilities/tools/motion26.json, 960x540 all frames (scratchpad r2/), pink-pixel peak pick.
- 6 repaint shots in round2/ (4K frames, 1920x1080 crops; full frames in round2/full/; PROMPTS.md = one full prompt per image):
  01 Blade Storm S34 f19 (floor shock rings), 02 Mirror Ring N_ring f56 (sword zone + floor crescents),
  03 Titan Cleave N_split f50 (impact disc, rings, floor cuts), 04 Sword Grove S25 f15 (ghost swords, threads, base rings),
  05 Rift Cut S24 f18 (floor spike line), 06 Fox Step S33 f13 (fox after-images).
- Everything else is restyled with the passed looks: blade arcs = blazeCrescent, straight cuts = TC needle cut,
  bursts = pinkStar, bands = #FF6FA6 + #FFD0E2 core, sparks = needle, no white flash haze.
- Restyle pass 1 (19 Nov ~15:40 UTC), shared primitives in reviewAshfangFx.js (passed four pinned to their old looks):
  sweepSlash (basic cuts) = pink body + white-pink core + silver hairline; bladeHit = pinkStar + pink cut mark + needle sparks;
  bladeStroke blaze:true (Triple passes blaze:false); moonAt = blazeCrescent; flying 剑气 waves (non-great) = strandCrescent blaze;
  sparkSpray needles by default (Finisher end + TC click keep needle:false); band() helper for thrusts, dash, streaks, blinks;
  flashStar() replaces white/silver flash sprites (TC blinks with ev.dim keep theirs); slash3d crimson/silver = blade look.
  Hook 2 (src/hooks-vfx2.py, sig/party.js): the game's gold crit lightning flipbook + crit bloom off for af_ hits; the fx draws a pink needle star.
  Waits for repaints: rings, zones, floor cuts, ghost swords, spikes, after-images.

## Round 2 repaints built (19 Nov, ~16:50 UTC)
Compares (original / target / live) in round2/compare/. Helpers added in reviewAshfangFx.js: swordRing (Blade Storm,
Mirror Ring), bladeArc (Mirror Ring crescents), glassRing + fieldDisc (crisp-edged see-through field) + floorCut (Titan
Cleave, Grove rings), groveSword ghost swords, pinkSpike (Rift Cut), pinkShade after-images (Fox Step), band/flashStar.
Skipped as repaint-only extras: Titan disc veins and embers; Grove ring diamonds and paw glyph.
Render: rec/shot2.sh <job> <frame> <name> <cx> <cy> <tag>; never edit src while it runs.
Spread (17:10 UTC): ring() now draws glassRing for CRIMSON (pink) and SILVER/white (soft silver) rings; disc() in
CRIMSON draws fieldDisc. `keep: true` holds the passed four's rings (Finisher spike ring, Triple hit ring). Before/after
sheets of the 24 other shots in round2/restyle/. Passed four re-shot: unchanged.
Ghost swords (17:25 UTC): ghostSword() draws the Grove ghost-sword look (keep=true for Triple's wings); swordStand uses
it point-down; the Skyblade Waltz white beam is now a hot-pink shaft with a pale core. Sheet round2/restyle/ghost-swords.jpg.

## Kesh's round 2 marks (20 Nov 01:31 UTC) and PAUSE (01:47 UTC: all VFX paused except Tide Caller)
Passed: Blade Storm, Mirror Ring, Rift Cut, Fox Step. Built (in src backup, low-res checked, NOT yet sent):
- Titan Cleave: taperCrack() (Stonehide-style jagged gap, wide at the hit point to a hairline, pink seam, one branch).
- Sword Grove: magicCircle() texture under the grove (double rim, rune band, dashed ring, faint six-point star), fades on call.
- Blade Storm (his idea): per-foe slash3d across each foe on each spin beat + strong bladeHit rock.
- Mirrors: every snapshot is pinkShade() (setShade(g,a)); Thousand Cuts keeps its 3-way spread; Echo spirit pink. pinkShade
  now carries the snapshot's world pose on the group (fixed Mirror Ring images landing off place).
- Skyblade Waltz: groveSword (x0.75) drops from the sky; swordStand removed. Blade Wheel: 12 swords, 0.3 long.
Still to do on resume: 4K shots of each (rec/shot2.sh) + send; restyle 1-4 failed per Kesh -> make repaint shots with one
full prompt per image for the restyled skills.

## Round 3, Tide Caller method (20 Nov 06:22 UTC on)
Passed elements used as they are: sword light, fox shade, Grove sword (Kesh 06:23), plus Blade Storm ring, Mirror Ring zone,
Rift Cut spike. Element list round3/ELEMENTS.md, passed by Kesh 06:41 ("look good", my picks for rings and zones).
Merged: ring() pink/silver -> swordRing; glassRing deleted; fieldDisc -> zoneLook (Mirror Ring zone, also tidering);
ghostSword -> groveSword (keep=true on Triple's wings); xspikes -> pinkSpike. Notes shots round3/notes/.
Repaint shots sent 07:00 UTC with prompts (round3/PROMPTS.md): 03 floor crack, 04 magic circle, 06 charge glow.
05 dust skipped (almost invisible at play camera; asked Kesh to drop it or send a ref). Recorder: rec/shot3.sh
(job frame cx cy out [jobs]); 4K coords = lowres x4 for jall jobs; rpall jobs use shot2 coords.

### Round 3 build (20 Nov, from Kesh's 07:11 UTC repaints)
- Floor crack (taperCrack): dark jagged gaps, wide at the hit and a hairline at the end; the hot-pink light sits deep in
  the gap near the hit and dies out by 70% of the length; side branches and hairlines are dark. Used by Titan Cleave,
  Ink Dive's landing and the ground wave crack (Rift Cut and Fox Step keep their passed looks).
- Magic circle (magicCircle): glowing double rim, rune band (diamonds and small glyphs), inner ring, crisp pale six-point
  star; the glow is the same drawing added again at half strength. Sword Grove (and its Echo ghost), radius 1.62.
- Charge glow: chargeCircle (thin crisp hot-pink line, pale core, tight glow) for Titan Cleave's charge; the Crescent
  basic charge's fill arc takes the same line. crystalBlade: a flat crystal blade (silver bevel, deep pink panel, lit
  left half, white ridge, diamond tip, winged guard) that turns round the sword to face the camera, set in front of
  the sword so it covers it.
- Sheets: round3/sheets/ (your shot / your repaint / page now). Dust shot waits on Kesh (drop, or a ref).
- DUST DROPPED (Kesh 20 Nov 08:00 UTC: "ashfang no stone or earth element, so can no dust"): every grey dust puff removed
  (dash stop, footfalls on hits 1/5/6, lift, quake ring, wall slam, sword throw burst, Titan Cleave charge and slam,
  Ink Dive landing, a blade drag); puff's default colour is pink now. The flying slivers (chunks) were already pink and
  silver light, not rocks, so they stay.

PASSED (Kesh, 21 Nov 01:23 SGT, "Look good, mark pass"): Ashfang VFX done at page v46 (DX11pzJ3cFu5ztRUNk5PL5).
Source backup in src/; contact sheets in specials/ and round4/.
