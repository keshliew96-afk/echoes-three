# Stonehide review page: notes and records

**PASSED (Kesh, 17 Nov 05:49 UTC, "Seem all good mark all pass"):** every skill, rule and combo on
version 3 of the page. The thrown slab, flipped round boss up, passed 17 Nov 12:12 UTC ("yes correct").
**ALL PASSED (Kesh, 18 Nov 08:26 UTC, "stonehide mark all pass"):** the whole page, version 7 (flat floor, Chinese/English). Page header reads "All passed / 全部通过".

The page shows only the skills, their clips, a few lines each and the nodes (Kesh, 16 Nov:
"simple and clean ... too many word inside makes me headache"). Everything else is here and in the
design docs.

## Version 15 (19 Nov): VFX dream loop

Four skills rebuilt to Kesh's ChatGPT repaints (files in `/mnt/project-files/vfx-dream/stonehide/`):
Heavy Slam, Fault Line (his notes) and Colossus, Landslide (Fable judge 9/10). All four passed by Kesh;
Colossus giant set to 2x ("go for 2", 09:12 UTC). All 43 clips retaken (the shared floor-debris and dummy-flash
changes touch every clip). Header and the Colossus line updated. Review build backup refreshed in
`tools/review-only-build/` (plus `public-review/` textures).

## Version 11 (18 Nov): passed

Kesh (12:18 UTC): "mark stonehide pass". The motion pass (version 9) and the longer wind-ups (version 10)
are passed. Page header back to "All passed"; kit, talent and combo docs marked. No clip changed.

## Version 10 (18 Nov): longer wind-ups on four skills

Kesh (11:55 UTC), "yes" to the open choice from version 9: Heavy Slam and Colossus take effect 0.3 s after
the press, Grudge's slam lands 0.35 s after its count ends, Badger Toss lets go 0.55 s after the grab.
Moves rebuilt (heavySlam, colossus, grudgeSlam, grab), timing changed in `reviewStonehide.js` (`WIND`,
`GRUDGE_WIND`, `btoss.lift`), 11 clips retaken, and the kit doc and the page lines say it. Details in
`MOTION_AUDIT.md` section 5. He also had the duplicate page (published by mistake) deleted. Passed 12:18 UTC.

## Version 9 (18 Nov): motion detail pass

Kesh (08:47 UTC): "now do audit and review to insanely fill in motion details with extreme quality".
Every skill now has a move of its own, baked with the model page's build plus a foot lock, and every clip
is retaken at 30 frames a second (was 15). The audit, the list of moves, the before and after numbers and
what is not assessed are in `MOTION_AUDIT.md`. Kit timings are unchanged (effects still land 0.10 s after
the press). Passed 12:18 UTC. Open choice offered: longer wind-ups on the big skills (taken, version 10).
Build: `tools/motion/` (README); the baked file is `tools/motion/tank-tripo-moves.glb`, loaded by the
review build as `public/review/tank-tripo-moves.glb`. Recorder jobs at 30 fps: `tools/all30.json`.

## Version 7 (17 Nov): Chinese and English

Kesh (18:08 UTC): every ability review page gets a language switch, Chinese by default, English on a
tap, no other languages. The page remembers the choice in the browser. Node names use the game's own
zh-Hans words; the Chinese hero, skill, combo and chip names are mine (guesses, open to his picks): 石皮
(Stonehide), 石 (Stone), 裂痕 (Crack), 咆哮石 (Growlstone), 石盾 (the slab). The words burned into the
clips (caption, Stone count, floating labels) are still English. Page text: tools/page/zh.py.

## Version 5 (17 Nov): flat floor with dummies

Kesh (07:04 UTC): "is it easier if the background like model review page is a flat square floor? with
dummy unit, if yes then build like that." All 43 clips retaken on a flat floor of square grey tiles under
even light, every foe drawn as a training dummy (it wobbles and flashes when hit). The game's dark ground
stains (kill splats, scorch burns, the dark half of impact marks, foe glob slicks) are hidden there,
because on the light floor they read as black holes; the glowing part of an impact mark stays. Ember
telegraph rings from the foes still show (S21, S21b). Build: tools/flat-stage/ (README).

## Where the full text is

- Skill kit, every rule and number: `/mnt/project-files/stonehide-talents/STONEHIDE_SKILL_KIT.md`
  (version 1.6, S1 to S60; the page shows the 26 skills and the combos of 1.6).
- Talent paths T1 to T33: `/mnt/project-files/stonehide-talents/STONEHIDE_TALENT_PATHS.md`.
- His Tripo model: `/mnt/project-files/tripo-pilot/tank-model/tank-tripo-rigged.glb` (passed 13 Nov).
- The Growlstone: Kesh's Tripo model, 17 Nov, 960 faces,
  `/mnt/project-files/tripo-props/growlstone/growlstone.glb`.

## Review build

- Local only, branch `review-only/stonehide-tripo`, never committed or pushed (feature freeze).
  Backup: `tools/review-only-build/` (the diff and the three new files).
- He is played as the human seat, so the camera follows him. The view is narrowed (FOV 28, the game
  uses 45) so his body reads in the clips; it is not the play zoom.
- Allies are kept out of the fight and quiet in most clips, so only his numbers show. Clips about
  allies (Bristle's growl, Bellow, Rock Toss, Growlstone, Menace, Bodyguard, Iron Briar, Iron Quills)
  let them fight.
- Foes are Level I Rotcaps (they walk in and bite, so taunts and thorns show) at 8 times their health
  and a quarter of their damage. Thornlings keep their distance and never bite, so they appear only
  where a foe must stand off (Bristle's growl, Savage Bite's kill). One dummy in the dash clip.
- Some foes are held on their spot for the first second or two so the hits land in the clip.
- A foe held on its spot does not bite. In the Stoneheart and Counter Spin clips the hits on him are
  driven by hand (a 45 blow, then 7s from each foe in turn), drawn as a short Foe Crimson swipe.
- Iron Quills uses boars (one set to 8 health so the quills fell it), because a falling Rotcap bursts.
- The clip skips its first 0.2 s (spawn dust).
- Clips are recorded in software GL with a stepped clock, so motion and feel need a look on a laptop.

## New moves (built for this page)

- **Dig (Burrow):** he drops onto both forepaws and claws down (0.3 s), sinks out of sight, a mound
  of earth runs along the tunnel, and he bursts up paws first, lands heavily and rises.
- **Bare Claws set (Feral talent):** the slab is hidden. On idle, walks and runs the left paw takes
  the right paw's fist swing, mirrored and half a step late, with a small hunch. The bash becomes a
  backhand claw rake, hit 3 brings both fists down, Plant, Guard and Thrust play with empty paws.
  The dash turns his trunk so the left shoulder leads (a shoulder ram).
- **Rock Toss:** he rips a rock up with the free paw and lobs it underarm.
- **Maul:** six swipes, paws in turn, the trunk turning into each.
- **Savage Bite:** a lunge with the head low and jaws first.
- The badger is heavy, so the no-splay rule does not hold him (Kesh's exception).

- **Hop (Bodyguard):** a short crouch, paws tucked in the air, a hard landing that squashes him low.
- **Slab held up (Slabguard):** the Guard clip's upper body at 0.5 s laid over the walk, so the legs
  keep walking. The body turns so the slab sits toward the aim. Bare Claws: the same with a stone
  slab ripped from the floor, which breaks on the shove.
- **Growth (Colossus):** the model scales to 1.4 in 0.5 s with a small overshoot, his hide greys,
  the ore shows; he shrinks the same way.
- **Throw (Slab Throw):** the slab swings back across his chest and flies out flat.
- **Grab and throw (Badger Toss):** both paws down, the foe comes up over his head, he heaves it.
- **Spin (Counter Spin):** one full turn on the spot, arms out.

## Stand-ins (until real VFX at the freeze lift)

- Cracks (Fracture): pale crack lines on the foe and four pips over its head; the shatter is a burst
  of stone chips and a "shatter" word.
- Stone Ring: plain grey standing stones and a faint grey ring line.
- Stone Cubs: built from boxes until Kesh's Tripo cub (about 1,500 faces) comes.
- Grindstone: grey dust and pebbles whirling round him, a grey ring at 2.5 u.
- Stoneheart: a grey heart with a Forge Steel edge on his chest; a capped hit throws a ring of chips
  and shows "thrown → taken" (45 → 7.5 in the clip).
- Thrown up (Fault Line, Burrow, Badger Toss): the foe body is lifted in an arc.
- Wall slam: dust, chips and a dark crack mark where the foe hits.

- Stone patches: up to 8 grey stone plates on his back, shoulders, arms, hips and head, one per
  Stone, in that order; they crumble when Stone ends.
- Iron thorns: dark iron spikes on his back and shoulders (Iron Bristles, Grudge). The ore glow is
  their Forge Steel shine, brightening as Grudge counts.
- Rust for berserk (S43): Bloodboil's dim rust steam and a faint rust tint, Maul's claw marks.
  Never on the floor. To be checked against Ember on the laptop.
- Bodyguard: a grey line on the floor between them and a ring under her.
- Floor shapes are earth (Earth Ochre and debris), roars are Parchment, his stone and steel rings
  Forge Steel. No Ember, no Violet.

## Combos (kit 1.6, built for this page)

Eight clips, each two or three skills he already has (kit S58 to S60). The 1.5 and 1.6 text lines
are on the skill cards; C6 Blood debt, C10, C11 and C12 are text only.

- C1 Throw the stone: the Growlstone flies 0.6 s in an arc and lands 0.9 u in front of the foe,
  on his side. Allies are kept quiet in this clip.
- C2 Slab pinball: the slab bounces off the ring stone nearest to it (the 16 stones of the ring).
- C3 Rubble is ammo: "within 2 u of rubble" counts from the nearest point of Fault Line's crack.
  The three rocks leave 0.12 s apart.
- C4 The cubs copy him: the cubs burst up 1.1 u to each side of him.
- C5 Spike: one Heavy Slam hits a foe in the air and a foe on the floor, so the two numbers sit side
  by side (73.5 against 49).
- C7 Slab charge: carried foes keep their place in front of him; when one meets a wall the charge
  stops there.
- C8 Thorn slam: the Badger Toss lands in the briar, so the landing hit and the impale both show.
- C9 Grudge bursts the quills: the hits on him during Grudge are driven by hand (12 from three foes).
- A "CRIT!" in a clip is the game's own crit roll, left as it plays.

## What is guessed

- Basic attack numbers: 9, 9, then 14 + 4% HP on the slam (the kit leaves them to this page; today's
  basic is 9 every 0.65 s). The combo runs as the model page's 2.3 s clip, contacts at 0.30, 0.78
  and 1.42 s.
- The dash moves 2.2 u from 0.10 to 0.64 s of the passed clip; foes within 0.95 u of his path are
  pushed 1 u aside.
- "Cannot be pushed or pulled" (Slabguard) and Colossus's immunities have nothing to stop in these
  clips. Slabguard's dash cut-off is not shown.
- Slabguard: shots are stopped 1.25 u in front of him; a stopped shot flies back at 8 u/s.
- Fracture: his hits start a Crack (basic hits, taunts, returned hits); the clip has two allies.
- Bodyguard lands 0.95 u from the ally on the nearest foe's side.
- Slab Throw flies at 11 u/s.
- Stone Cubs run 4.5 u/s and bite every 0.5 s for 3 (6 a second). With no foe on an ally they go to
  the nearest foe that is not on him.
- Wall slam: room walls sit off the screen in this camera, so both wall clips use a stone of his
  Stone Ring (the kit counts ring stones as walls). Room walls work the same in the build.
- The rolling Growlstone moves 5 u in 0.8 s, easing out; it hits each foe once.
- Badger Toss holds the foe over his head for 0.3 s, then throws it in 0.5 s.
- Hearty's growth (up to 15% taller) and Stone from boss hits are text only on the page.
- Every skill fires 0.1 s after the press (its clip starts 0.1 s before its effect frame), as for
  Mosslight. Fault Line's crack runs out in 0.25 s after its 0.4 s wait.
- A big blow "within 2 u of the Growlstone" counts when the blow's own area reaches it.
- Every number on a new or redesigned skill or rule is the kit's first guess.

## Page versions

- Version 1 (17 Nov): kit 1.1, 22 clips (Bristle, basic attack, dash, the 18 skills, the Bare Claws
  set). Page: https://claude.ai/artifact/BBW4wymaDTWddmtKmAYCHi
- Version 2 (17 Nov): kit 1.4, 26 skills. New clips S20 Fracture (Menace's dropped), S45 Colossus
  (and S45b Bare Claws), S47 Stone Ring, S48 Slab Throw, S49 Grindstone, S50 Stone Cubs, S53
  Stoneheart, S54 Counter Spin, S55 Badger Toss, S51 Wall slam, S55b throw into a ring stone, S19b
  Kick the stone. Retakes: S17, S21 Slabguard (and S21b), S22 Bodyguard, S23 Fault Line, S26 Heavy
  Slam, S33 Iron Quills. Same link.
- Kit 1.5 (17 Nov, interaction audit, Kesh's picks): no skill added or cut, no clip needed. The page
  still reads 1.4; a few rule lines differ (S5, S13, S15, S21, S53, S54; kit S57 lists them). The next
  retake or page update uses 1.5.
- Version 3 (17 Nov): kit 1.6, the 1.5 and 1.6 text lines on the cards and a Combos row of eight clips
  (C1 to C5, C7 to C9). Same link. Jobs `tools/r11.json` to `r14.json`.
- Tools for a retake: `tools/rec.cjs` (needs the review build running on :5199), jobs in
  `tools/v2.json` (plus `r3.json` to `r10.json` for the retakes and version 2; `r10.json` is the
  final Wall slam take), clips encoded with `tools/enc.sh`, page from `tools/mkpage.py`. The
  build's patch scripts are in `tools/patches/`, the diff and new modules in `tools/review-only-build/`.
