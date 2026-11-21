# Ashfang review page: notes and records

The page shows only the skills, a clip and one short line each (Kesh, 16 Nov: keep it simple and
clean). Everything else is here and in the design docs.

## Version 18 and 19 (18 Nov): kit 2.2, no will effects, normal colours, Echo in the passive

- From `ashfang-talents/ASHFANG_KIT_2.2_CHANGES.md` K28 to K41. v18 put up the passive (Sword Heart,
  Echo), basic attack, ghost sword throw, dash, two marks and the seven 剑意 skills first (K41); v19
  is the retake of the rest.
- Review build: burn, slow, stun, launch and blind are off (`st.fx` false), and foes are moved only
  by Radiant Cascade's gather (and Blade Wheel's carry, which is the skill). Every look is Fox
  Crimson with a Moon Silver edge; the ghost swords are Moon Silver with their character on the
  blade; the spirit is Moon Silver with a Fox Crimson edge. The legend text is uncoloured.
- Lost damage over time added at half (K30): Flurry 3.75 a cut, Crescent Finisher 26, Keen Crescent
  20.5, Radiant Cascade 7 + 7 and dash 20, Triple Crescent 24.
- Redrawn (K31): Sword Bloom (lines at 0.4 s, bursts at 0.8 s); Crimson Edge (a crit calls a small
  ghost blade 0.14 s later for 30%); Calm Edge (a small silver ring and a "calm +15%" or "calm broken"
  label; the clip has a shooter so the break shows).
- Readings, open: Sword Bloom · Swift thrusts 3 u and the lines burst 0.4 s after; Sword Bloom ·
  Crescent carries the lines to 6 u with a 剑风. Echo's Swift and Crescent clips are Lunge Strike and
  Keen Crescent. On the Sword Heart clip a small press counter shows the fourth cast.
- The first v19 takes still showed the 狂热 skills' old silver rings and wheels (Blade Storm, Blade Dance,
  Blade Wheel, Skyblade Waltz, Thousand Cuts); those looks were turned Fox Crimson and the 19 clips retaken.
  After-images of him and the specials' spirits stay Moon Silver (they are ghosts of him, K36).
- Copies are off for good (K39, Kesh's E1); the Echo card is in the passive section, the trial
  section is gone. Combos left: C2, C6, C7, C8, C9, C11.

## Version 17 (18 Nov): kit 2.1, Sword Heart with ghost swords (P1) and the Echo trial (P3)

- From `ashfang-talents/ASHFANG_KIT_2.1_CHANGES.md` K18 to K27. v17 put up the Sword Heart, basic
  attack (with forms), ghost sword throw and Echo 残响 (trial) cards first (K27); v18 is the retake of
  the rest with the ghost swords.
- The strong cut is gone (sim and page); the 'Skill, cut, skill' rule card went with it.
- Ghost swords: clones of his blade at 0.6 of its length in the ghost shader, point down behind his
  shoulders, newest on the right (tripoFox.js, ghosts). A new one starts as a full-size copy on his
  blade and shrinks as it flies to its shoulder (0.38 s). The one pushed out moves to a far left slot
  and fades after its copy. Readability over the letter: 0.6 rather than 0.5 of his blade, and a
  thrown or copying sword grows to 0.85 or 0.8 so it reads at play zoom.
- Copies (K20): from the swords held at the press, so a skill's first cast with none shows none.
  They fire 0.12 s after the skill's last hit (at most 1.2 s after its own time). Base: both stab the
  nearest foe the skill hit. Swift: along the line from where he pressed to where he ended (2.5 u
  ahead if he barely moved). Crescent: a thin 剑气 from each shoulder.
- Sixth hit: new keys for hit 6 in COMBO_KEYS: the sword stays low in his right paw, the left paw
  draws back by the shoulder and flicks forward.
- Specials (K23): the two ghost swords fly into the spirit's paws as it fades in; the spirit holds
  the first will's sword in the right paw and the second's in the left (placed along the forearm).
- Echo (K26, trial): the review build records his fourth cast (looks, hits and effects, his path)
  and plays it back 0.4 s after through a silver ghost of him for half. The echo clips have the
  ghost swords off so the echo reads alone; in two of them he steps aside after the fourth cast so
  the ghost is not hidden in him. Counter 1 to 4 over his head.
- Not shown: the chime (the clips are silent). The Spirit Swords capstone (K24) has no clip on the
  page.

## Version 14 (18 Nov): kit 2.0, phase 3 (the ten Will specials)

- Ten cards SP1 to SP10 under "Will specials", each with its two marks and its kind (T12, M27 to M36).
- The sword spirit is his own model drawn as light (st.spirit in tripoFox.js), 1.5 times his size
  (2 times for Still Mountain, 1.4 for Frenzy's four and Wild Dance), body in the first will's colour,
  edge in the second (white edge for a pure pair). It plays his own clips, so he keeps cutting or
  walking under it in every clip.
- Counterblow, Unmoved, Still Mountain and Clear Mirror use the dummy shooter: the blocked blow, the
  40% and 30% cuts (6 becomes 3.6 and 4.2), the stilled shooter, and a hurt fox to heal.
- My readings, open: See Through's "slow frame" is a short dim of the floor round him (the review
  build cannot pause the game); Still Mountain's seated pose is his planting crouch held still;
  Flow's "cooldowns -2 s" is a label (the page has no cooldown bar).
- Seen only as stills from the cloud's software GL; motion and feel need his laptop.
- Design thread (18 Nov): the three readings stand for the page. For the real build: Still Mountain
  gets a true seated pose and See Through the game's own slow frame. Kesh's notes on any motion short
  of his videos go to the design thread with the skill names.

## Version 13 (18 Nov): kit 2.0, phase 2 (the forms)

- Each of the 24 cards with forms has a Base / Swift 疾 / Crescent 剑气 switch; the clip and the
  line under it change with it. Rows F1 to F23 of talents 2.1 section 5, looks from MOTIONS.
- T6 numbers: a standard thrust 2.5 u for 10 each; a 剑气 a 5 u line for 70% of its hit; a 剑风 a
  ring or fan to 3 u for 50%; an added part carries the skill's effect at half length; a form never
  stores a second mark.
- Basic combo: Swift changes only hit 5 (he cuts through the pack) and a dash while the thrown sword
  is out takes him to the sword; Crescent adds a 剑气 to hits 1 to 5.
- Riposte · Swift is staged with the dummy shooter, which fires the shot he answers.
- Swift and Crescent strokes keep the will colours; the basic combo's added parts stay Fox Crimson.
- My reading, open for Kesh: Triple Crescent · Swift turns back through the pack between thrusts
  (a Z: forward, back across, forward again), so he ends near the foes instead of 10 u away.
- Clips: 48 at 15 fps from the cloud's software GL; motion and feel still need his laptop.

## Version 12 (18 Nov): language switch

- Chinese by default, English on the switch (Kesh). The choice is kept in the browser.
- Lunge Strike is 贯刺 (the dash's thrust is 突刺); Blade Storm stays 剑岚.

## Version 11 (18 Nov): kit 2.0, phase 1

- Kit 2.0 is written: `/mnt/project-files/ashfang-talents/ASHFANG_SKILL_KIT.md` (1.7 kept as
  `ASHFANG_SKILL_KIT_1.7.md`). Source: the design thread's `ASHFANG_KIT_2.0_CHANGES.md` v2, K1 to K17.
- Built for phase 1 (K15): the 17 base motions M8 to M24 as new clips (one 120 Hz timeline each,
  whole-body leaps, rolls and cartwheels, the sword toss in Sword Bloom); the dash look M7b; the new
  passive Sword Heart (the marks 剑 屈 水 热 over the left paw, no count); the new names; no element
  look on any clip, the six video skills included (motes for smoke and flame, bronze slivers for
  rocks, blade fins for spikes, iron caltrops).
- The four effects read: the scar (a gold line, a ghost blade at each tick), the daunt (three bronze
  blades and a halo), stillness (a still ring and a ripple), the launch.
- Each skill keeps its 1.7 damage, effect and cooldown; its damage lands on the beats marked "hit"
  in the motion script.
- My choice, open for Kesh: the ten Fusion mix cards are off the page now (their names are element
  names), not in phase 3. Juggle is gone with the count. Gale Crescent is in "Gone in kit 2.0".
- Combos re-shot with today's skills: C1 Fervour spreads the scar uses Blade Wheel; C2 Wall slam uses
  Blade Wheel; C12 Settle uses Sword Bloom, then Calm Crescent; B2 Two marks uses Keen Crescent, Blade
  Wheel, Rift Cut.
- Still stand-ins: every effect is a placeholder shape in the will colours; real ones wait for the
  VFX templates after the freeze. Seen only in software GL at about 1 fps: motion and feel need a look
  on a laptop.
- Not done yet: phase 2 (the Swift and Crescent forms) and phase 3 (the sword-spirit specials).

## Where the full text is

- Skill kit, every rule and number: `/mnt/project-files/ashfang-talents/ASHFANG_SKILL_KIT.md`
  (version 1.4: 26 skills, passive Bladesong, new moves S8, colours S9, clip list section 10).
- Talent paths and the ten Fusion mixes (T5): `/mnt/project-files/ashfang-talents/ASHFANG_TALENT_PATHS.md`.
- His Tripo model: `/mnt/project-files/tripo-pilot/fox-model/fox-tripo-rigged.glb` (passed).

## The page (version 1, 17 Nov)

Page: https://claude.ai/artifact/DX11pzJ3cFu5ztRUNk5PL5 (local copy `index.html` and `vid/` here).

57 clips: Bladesong (the count and the orbs), basic attack and dash, the 26 skills by element
(fire, earth, water, wind), the combos (C1 to C12, Coloured whirl in three elements) and the ten
Fusion mixes.

## Review build

- Local only, never committed or pushed (feature freeze). Backup in `tools/` here: the hooks script,
  the three new review modules, the recorder and job list, and the page builder.
- Stage: Kesh's flat stage (17 Nov), a plain square floor, no fireflies or motes, and the game's ground stains hidden (the Stonehide thread's fix). The dummies are
  Level I boars, dressed as training dummies and scaled to 0.72 so they sit beside the fox.
  They stand still and never attack; only his skills move them.
- He is the swordsman seat with the camera on him. The view is narrowed (FOV 21; the game uses 45)
  so his body reads; it is not the play zoom. Other heroes are kept out of the fight.
- The counter at his head is the Bladesong count. The top-right legend reads the count, the cooldown
  bonus it gives and his two orbs.
- Clips are recorded in software GL with a stepped clock, so motion and feel need a look on a laptop.

## Effects are stand-ins

Every effect is a placeholder shape (rings, discs, crescents, puffs, labels) in the kit's colours:
Fox Crimson #E8577A for his own cuts, Moon Silver #E7E3F0 for plain blade and wind, fire gold
#FFB43C / Hearth Amber #E8A23D, earth Ochre #8F6B45 with debris #5A4632, water #7FE0F2. The dummy
shooter (Riposte, Returning Wave) fires Foe Crimson #B8141F. No Ember, no Violet. Glows are dimmed
(additive looks at half strength). The game's own status looks (blue slow ring, stun halo, taunt "!")
show as they are. The real effects are built from the VFX templates after the freeze lifts.

## New moves (built from the passed clips, kit S8)

- Wave throw (every crescent): the passed crescent cut, drawn quicker.
- Pommel bash (Hilt Bash): the lunge's short drive with the sword turned in the paw so the pommel leads.
- Floor drag (Ground Wave): low on the free-side foot, the point down at the floor, then up and out.
- Upward flick (Blade Rain): the edge draw's blade to the sky, sharp.
- Flowing three-step (Flowing Blade): forehand, rising backhand, forehand, a step on each.
- Hop with a throw (Tide Crescent): the crescent cut in the air.
- Three-wave draw (Triple Crescent): the salute draw, then three cuts a quarter second apart.
- Flurry: four fast cuts in 0.4 s, forehand and backhand by turns.
- Thousand Cuts: he turns to a blur (silver afterimages) and cuts from foe to foe.
- Rising cut (Crescent Finisher).
- Mirror Image: a still water-coloured copy of him in the cast pose.
- The sword always rides his right paw through the grip read from the passed idle.

## Guessed (not in the kit; to settle)

- Basic attack 11 / 11 / 13 / 16.5 (the four hits of the combo).
- Dash 2.6 u, 8 damage on a dash cut.
- Wave speed 14 u/s (Gale Crescent 18).
- Caltrops: 8 on a foe's first step.
- The dummy shooter's shot: 6 damage at 7 u/s.
- Mirror Image bursts at 3 s, since the dummies never attack it.
- Thousand Cuts: 0.14 s per cut.
- A Fusion mix fires 0.4 s after the second press, 2.6 u along his aim in the clips.

## Changelog

- v1 (17 Nov): first page, 57 clips.
- v2 (17 Nov, kit 1.5, Kesh's first batch of refs): a "New in 1.5" section with four clips: the open
  left paw with the orbs over it, the sword throw on the last basic hit, Earthsplitter (a quick slam,
  then a full charge) and Tide Ring. Stone Crescent and Blade Rain are marked replaced. Guessed: the
  throw's numbers (4 u out at 13 u/s, 0.4 s whirl, 1.5 u burst for half), Earthsplitter's (20 to 40,
  1.5 u to 2.8 u, stun 0.5 to 1 s, 6 s cooldown) and Tide Ring's (5 a thrust, 4 a burst, 14 s
  cooldown). Stand-in moves: the charge holds the edge draw's raised blade, the slam is the forehand
  cut with a deep forward lean, the 剑花 wheels the sword in the paw over the passed flourish, the
  images are still water copies of him that glide across the ring. The refs are in `refs/`.
- v3 (17 Nov): the six-hit basic combo from Kesh's reel (Vimeo 497152947, 3.3 to 12.8 s), each hit
  posed from the reel's key frames; the sixth throws the sword. The sword throw clip is re-shot on
  the new combo. Guessed: the hits' damage (10, 10, 12, 11, 14, then the throw at 12, strong 18) and
  timing (about 3.5 s for all six).
- v4 (17 Nov, kit 1.6): Kesh's ruling that each "copy all" video is one skill copying its whole
  motion. A "New in 1.6" section with four clips: Blazing Cascade (5bsoG8vEr, fire), Skyblade Waltz
  (Pi4PRflgB, wind), Inkstone Dive (2SnjhTKLD, earth) and Riptide Form (24ioI3PQo, water). Flare
  Wave, Ground Wave, Flowing Blade and Gale Crescent are marked replaced (my pick, open). Tide Ring
  re-shot (an event clash had added a stray white ring). Guessed: every number of the four new
  skills, and their timings, compressed from the videos (2.0 to 3.2 s). Stand-in moves: one posed
  move per skill from the videos' key frames; the leaps are a lift of the whole model, the spin in
  Skyblade Waltz is a body twist, not a full turn. Stand-in effects: the videos' magenta is swapped
  for each element's colour; Inkstone Dive's strokes are Fox Crimson ink. Restyles of other skills
  that I had started from these videos were dropped; those skills keep their earlier looks.
- v5 (17 Nov, kit 1.7): Kesh's "3" to the talent doc's T33 W: Ground Wave and Gale Crescent are
  back, Hilt Bash and Thousand Cuts go (the talent thread's pick, open). Cards relabelled.
- v6 (17 Nov): the page cleaned and rearranged: skills by element in kit order, combos and mixes
  after, every replaced or gone skill in its own "Replaced or gone" section at the bottom.
- v7 (17 Nov): the white flash on the strong cut and the throw's glow on his body went (a small
  crimson spark at the blade's reach now; the thrown sword shows its glow once 0.9 u clear).
- v8 (17 Nov): the body bending weirdly in the basic attack and the sword throw: the posed clips
  kept the last sample's hips drop and piled it up. Every sample now starts from the idle pose, and
  the drop is scaled to 40% (his legs have no knees).
- v9 (17 Nov): the basic combo 30% faster: a cut every 0.29 s, all six in about 2.1 s.
- v10 (17 Nov): Kesh's "audit and review again basic attack, increase detail insanely". The six
  cuts are now one continuous motion (one timeline on the sim's hand-off times, sampled 120 times a
  second) instead of six separate posed clips, so each cut flows into the next.
  Audit, old to new (the worst cut of six):
  | what | old | new |
  |---|---|---|
  | blade jump in one frame | 53 to 177° | 28 to 64° |
  | pose jump at a hand-off | 0.2 to 1.1 u | none |
  | wrist bend | 152 to 178° | 65 to 101° |
  | blade tip under the floor | yes (-0.07 u) | never (lowest 0.17 u) |
  | feet travel | 0.007 u (planted) | 0.04 to 0.14 u (real steps) |
  | hips turn | 1° | 7 to 13° |
  | left paw travel | 0.11 to 0.18 u | 0.13 to 0.44 u |
  Added detail: a step into each cut and a settle out of it, hips lead the chest, the head turns a
  beat early, the left paw guards, reaches and joins the grip for the two-paw chop, the ears and
  tail drag behind the swing, a re-chamber between cuts. Hits: the game's melee hit pause (2 ticks,
  3 on a kill), a three-layer slash that follows the blade's real path, a cut mark and sparks and
  canvas flecks on the dummy, the dummy pushed along the swing's direction, dust at the stepping
  foot. Two new clips: the combo 4x slower, and from the side.
  Dropped: the blade's edge leading the swing (it jittered; the paw now turns with the forearm).
  Takes have crits off. Motion was only seen in software GL at a fake clock; feel needs the laptop.
- v20 and v21 (18 Nov): Basic attack · Crescent is a charge shot (Kesh 14:54 SGT). Tiers, open:
  under 0.4 s 8, 4 u, stops at the first foe; 0.4 to 1.2 s 14 to 26, 5 to 6 u, through every foe;
  at 1.2 s it fires by itself as the last hit, 30, 7 u, wide, and the newest ghost sword flies
  with it. v21 retuned the tap from 14 to 8 so holding beats tapping.
- v22 (18 Nov, kit 2.3): Kesh's twelve form changes (15:36 SGT). Ten forms as he wrote them;
  Lunge Strike redrawn (spear, drill, star; Swift drills through, Crescent sends a drilling 剑气)
  and Sword Grove 剑林 in place of Caltrops (six full-size crimson swords with silver edges, threads
  to his paw, called back by a second press). Dash strike now uses the new Lunge Strike; Kick the
  caltrops is Ring the grove. Readings, open: the numbers his words left open (kit file 5a and
  record 2.3); an echo's grove is a short ghost ring and is not called back; the grove clips call
  it by a second press at about 1.9 s, so the 5 s auto-call is not shown.
- v23 to v25 (18 Nov): the design thread's budget notes and its T8 rule (a Crescent form never
  moves him). Crescent Finisher · Crescent built as Kesh wrote it: mark 4 and gather, sweep 6 and
  push, flat 剑气 10, then the rising cut 26 with the tall 剑气 14 (60 in all); the trim without the
  tall 剑气 (46) is an open choice. Ink Dive · Swift counts at most 4 carried foes. Mirror Ring is
  8 thrusts in every style (he makes the eighth; Crescent uses eight mirrors) (Kesh 16:18 SGT).
  Blade Wheel · Swift's second cast aims its sweep at the foes the wheel gathered (Kesh 16:20 SGT).
- v26 (18 Nov): the motion audit. Kesh 16:50 SGT: "do audit and review to insanely fill in motion
  details with extreme quality". Read as: every skill's motion, like the v10 basic attack audit.
  Measured first (79 clips, 60 samples a second: feet, hips, left paw, head, ears, tail, blade).
  Found: (1) the four video skills (Radiant Cascade, Skyblade Waltz, Ink Dive, Calm Forms) moved
  only the sword arm, trunk and head, 30 samples a second with a stop at every key; feet, left
  paw, ears and tail stood on idle and the chest twisted up to 68° over still hips; (2) 12 of 29
  skill clips had a foot that never moved; (3) a whole-body spin, flip or leap left the tail,
  ears, head and legs as if he stood; (4) the blade's direction was blended straight between
  keys, so a turn near 180° snapped in one frame (up to 169°).
  Done, on every skill clip (the passed six-cut basic combo is untouched):
  - the four video skills rebuilt on the full body at 120 samples a second, with steps, hips,
    both paws, and the leaps and the spin inside the clip (they were a sim hop before);
  - the blade turns on an arc (great-circle waypoints; a wide turn names the way it passes);
  - a detail pass in the solver: a short jolt through the body on every hit, a bank into each
    turn and the weight over that side, legs that fold and split with toes down in the air, the
    head spotting through a spin, the ears pressed back by speed, the tail whipped by spins,
    flips and falls with a lag down its bones, a rise and sink out of the last pose, and a held
    pose that still breathes;
  - a hand-keyed detail layer on all 29 clips: a step under every cut, a wide stance on every
    landing with a rebound after it, the left paw as a counterweight or braced on the floor,
    the lean and weight shift through each cut.
  Audit, before to after:
  | skill clip | feet travel (u) | hips turn | tail travel (u) | worst blade turn in a frame |
  |---|---|---|---|---|
  | Flurry | 0.40 to 0.83 | 16° to 16° | 0.64 to 0.84 | 99° to 79° |
  | Crescent Finisher | 0.76 to 1.34 | 15° to 15° | 0.44 to 1.04 | 129° to 97° |
  | Keen Crescent | 0.31 to 1.02 | 18° to 18° | 0.34 to 0.46 | 40° to 39° |
  | Sword Bloom | 0.29 to 1.00 | 7° to 7° | 0.31 to 0.33 | 157° to 38° |
  | Triple Crescent | 0.55 to 1.31 | 24° to 24° | 0.69 to 1.26 | 169° to 50° |
  | Lunge Strike | 1.30 to 1.55 | 9° to 9° | 0.34 to 0.95 | 114° to 49° |
  | Lunge Strike · Swift | 1.17 to 1.77 | 9° to 9° | 0.31 to 0.84 | 51° to 24° |
  | Lunge Strike · Crescent | 0.83 to 1.15 | 9° to 9° | 0.22 to 0.24 | 19° to 19° |
  | Rift Cut | 0.28 to 0.99 | 18° to 18° | 0.43 to 0.47 | 43° to 40° |
  | Sword Grove | 1.60 to 1.64 | 7° to 7° | 0.26 to 0.91 | 66° to 50° |
  | Sword Grove, the call | 0.00 to 0.36 | 5° to 5° | 0.09 to 0.12 | 7° to 7° |
  | Riposte, the guard | 0.00 to 0.20 | 3° to 3° | 0.03 to 0.04 | 14° to 14° |
  | Riposte, the answer | 0.00 to 0.88 | 18° to 18° | 0.37 to 0.46 | 81° to 40° |
  | Riposte, lowered | 0.00 to 0.28 | 3° to 3° | 0.03 to 0.04 | 8° to 8° |
  | Moonfang | 0.44 to 1.14 | 18° to 18° | 0.33 to 0.32 | 126° to 42° |
  | Calm Crescent | 0.40 to 1.03 | 15° to 15° | 0.30 to 0.82 | 38° to 38° |
  | Mirror Image | 0.25 to 0.51 | 2° to 2° | 0.07 to 0.18 | 10° to 9° |
  | Fox Step | 0.79 to 1.06 | 6° to 6° | 0.21 to 0.69 | 42° to 38° |
  | Blade Storm | 0.40 to 0.95 | 5° to 5° | 0.29 to 0.89 | 22° to 22° |
  | Blade Dance | 0.38 to 0.97 | 3° to 3° | 0.06 to 0.92 | 33° to 33° |
  | Blade Wheel | 0.24 to 0.80 | 11° to 11° | 0.38 to 0.47 | 88° to 62° |
  | Thousand Cuts | 0.00 to 0.82 | 7° to 7° | 0.19 to 0.29 | 86° to 23° |
  | Dash | 0.35 to 1.03 | 2° to 2° | 0.08 to 0.21 | 8° to 8° |
  | Charge shot, down cut | 0.60 to 0.60 | 16° to 16° | 0.20 to 0.17 | 46° to 30° |
  | Charge shot, rising cut | 0.62 to 0.62 | 14° to 13° | 0.19 to 0.17 | 64° to 61° |
  | Radiant Cascade | 0.19 to 1.94 | 0° to 26° | 1.09 to 1.02 | 116° to 44° |
  | Skyblade Waltz | 0.38 to 2.59 | 0° to 28° | 1.40 to 1.63 | 113° to 43° |
  | Ink Dive | 0.28 to 1.67 | 0° to 18° | 1.28 to 1.63 | 118° to 47° |
  | Calm Forms | 0.51 to 1.18 | 0° to 26° | 1.06 to 1.16 | 64° to 28° |
  Means over the 29 clips: feet 0.46 to 1.08 u, tail 0.40 to 0.64 u; clips with a dead foot 12
  to 0; worst blade turn in a frame 169° to 97° (Crescent Finisher's rising cut, a real fast cut).
  Left as they were: the model's own clips (Mirror Ring's 剑花, Titan Cleave's charge and slam, the
  specials' spirit swords) and the walk, run and idle. Not assessed: feel and timing at speed.
  Everything was only seen in software GL as frame sheets (21 close-up clips, 20 frames each, and
  the page takes); it needs the laptop. No numbers, reaches or timings of any skill changed.
- v27 (18 Nov, Kesh 20:27 SGT): Moonfang's mark in the base and Swift styles is the Crescent
  style's mark (4 s; his next hit on that foe pops it for 12, a sure crit; the 20% more damage
  taken is gone). Moonfang · Crescent holds 2 charges. Readings, open: Swift's dash back pops the
  marks and leaves no new one; the base clip ends with one basic cut back at the foes to show the
  pop (the pop reads 18 because a crit is 1.5 times).
- v28 (18 Nov, Kesh 20:32 SGT): Fox Step redrawn in all three styles, Rift Cut · Swift redrawn (kit
  file record 2.3b has the numbers). New clips foxstep20 (three steps), foxstepC (Crescent, in
  place), riftRide (Rift Cut · Swift); new looks: the crimson shade each step leaves, the step cut,
  the X flare, fins bursting from the rift. Readings, open: every number; the Swift hunt takes two
  to four steps by how many foes are ahead (two plain zigzag steps with none); the shades are
  images of him, not copies (no damage of their own except the Swift form's last cut).
  Same day: Rift Cut · Swift trimmed to the design thread's budget (crossings 4, plunge 8,
  eruption 4; up to about 34 on one foe instead of 40).
- v30 to v32 (18 to 19 Nov, overnight): Kesh 16:02 UTC "run audit and review and make it insanely
  detailed, until it have score 9 out of 10". Four scored passes; scores, what holds it back and
  the open choices are in SCORES.md. Solver (skill clips only, the passed basic combo untouched):
  hips lead a turn and the chest follows; an impact hold on every hit; stances a third wider and
  the crouch a quarter deeper; a held pose presses on and eases back; breathing up. Clips: Mirror
  Ring redrawn (the point draws the ring, the paw pushes the image out, a hop back); the Riposte
  guard sinks, beckons and shuffles; Sword Bloom pirouettes under the tossed sword; Fox Step ·
  Crescent and Rift Cut flick the blade down after the rising cut; Blade Wheel turns the body
  1.6 times as far; Keen Crescent's held thrust pushes on. Backups of each step: /tmp only.
- v33 (19 Nov, Kesh 06:15 SGT on the open choices: "1. Yes 2. No 3. ... if you want knee, and you
  doable you can try"):
  - Pick 1: the glare 40% down in four skills, shapes and rings kept: Lunge Strike (the spear's white
    core, its point, the drill's cones), Thousand Cuts (the after-images, the cuts' white cores,
    its blink flashes; other skills' blinks unchanged), Sword Grove (the swords' silver edges; the
    crimson blades unchanged), Blade Wheel (the wheel's white blades; the rim unchanged).
  - Pick 3: knees. The GLB is untouched: on load each leg gets a knee bone halfway down, the foot
    hangs from it and the leg's skin below the knee follows it (blended over 10 cm). Skill clips
    bend it with two-bone IK: the leg root takes half of a crouch, the knee the rest, the knee
    points where the hips face (no splay). Every passed clip (idle, walk, run, dash, the six-cut
    basic combo) never turns the knee: the audit measures them identical to before.
- v34 (19 Nov, Kesh 08:43 SGT on knees-side.jpg "穿模", 08:47 SGT Moonfang, 09:31 SGT 剑光):
  - Kilt: in the deep crouches (Rift Cut, Crescent Finisher, Lunge and the like) the thigh swung
    80 to 90 degrees forward and its top came up through the kilt. Now on a skill clip, when a crouch
    would swing a thigh more than 50 degrees forward of its rest line, the body rises just enough
    (SWING_MAX in tripoFox.js); the leg root never slides more than 0.03 up into the kilt. Those
    crouches sit a little higher than v33. Tried and dropped: a kilt that swings with the thighs
    (left and right halves, front and back panels, a front flap): the kilt tore at its seams and
    showed its dark inside. Passed clips untouched (the rise only runs on skill clips).
  - Moonfang · Swift: the first dash marks; the dash back pops each mark (12 more, a sure crit) and
    leaves a new mark on every foe it hits. Kit text updated (ASHFANG_SKILL_KIT.md, TALENT_PATHS F13).
  - 剑光, three causes found and fixed for every clip:
    1. The basic cuts' slash was drawn out at the hit's reach (scaled out from his chest), away from
       the sword. Now it is a band along the blade itself, guard to a little past the tip.
    2. Slashes and strokes used fixed time windows written for older clips, so some missed part of
       the cut (Calm Crescent's stroke ended before its hit; the basic slash covered 50 ms before the
       cut to 60 after). Now each covers the whole cut: from where the blade speeds up (at most
       0.25 s before the hit) to where it slows (at most 0.1 s after), measured from the clip
       (st.strikes). A stroke is drawn only as far as the blade has gone, never ahead of it.
    3. The blade's own trail showed whenever the blade moved fast: wind-ups, flourishes, spins,
       the chiburi flick, recoveries. Now it shows only while the clip cuts (st.strikes).
    This changes how the passed basic combo's slashes look (motion unchanged). Guess: the 4 u/s
    "fast" line and the 0.25 s / 0.1 s limits.
- v35 (19 Nov, Kesh 11:34 SGT: Crescent Finisher's 剑光 far from the sword, base and Swift): the cause
  was a second fox rig built off the scene (a preview) taking the name window.__tripoFox, so every
  look that reads the blade's path (the basic slashes, the skill strokes, the hit sparks along the
  blade) was placed from that rig, as if he stood at the floor's middle. The farther he stood from
  the middle, the farther off the 剑光. window.__tripoFox is now the rig in the scene. All clips retaken.

## Passed (19 Nov 13:49 SGT)

Kesh marked page v35 passed ("Mark pass"). VFX and numbers on the page are simple drafts; the real ones come later. The review build stays local (feature freeze).

- v36 (20 Nov, VFX thread): Kesh passed every Ashfang VFX element (round 3, "all look good" 08:03 UTC; dust dropped).
  The 100 clips of motion26.json were retaken with the new looks and swapped in; text and motions unchanged.
  The 19 older clips not in motion26 (B_side, B_slow, M1-M10, N_idle, S12, S17, S22, S23, S28, S30) were not retaken.
  The v35 clips are kept in vid-v35/. Source: /mnt/project-files/vfx-dream/ashfang/src/reviewAshfangFx.js.
- v37 (20 Nov, VFX thread, Kesh's card notes 16:34 to 17:08 SGT; METHOD step 7). Changed, 27 clips retaken
  (E, E_s, E_c, S11, N_split_c, S20_s, N_riptide, N_riptide_s, S29_s, S31, S31_s, S31_c, C6, C7, N_waltz, N_waltz_s,
  N_waltz_c, S36_s, S19_c, S37, S37_s, S37_c, B2, C2, N_cascade, N_cascade_s, N_cascade_c); v36 copies in vid-v36/:
  1. Echo (every echo): the replayed looks come from the mirror, at its pose, not from him.
  2. Titan Cleave · Crescent: no sword grows in his paw; a floating sword hangs point down over the drop point
     (his aim, 2.5 to 5 u), grows while he charges, shoots down on release into a ring of eight tall curved crescent
     blades with floor rays. The old Crescent fin line is gone. Hit numbers unchanged.
  3. Triple Crescent · Swift: each thrust aims at a foe (Z字抖动): the nearest unaimed foe within 4.5 u, not behind
     him, on the other side of the cast line from the last; runs 0.8 u past it (1.2 to 3.5 u). No foe: the old turns.
  4. Calm Forms · base and Swift: the leap draws foes within 2.2 u of the stab point in to 0.55 u of it over the leap
     (0.32 s), so the stab catches the pack. Crescent unchanged. (Read as a request: he likes 聚怪.)
  5. Calm Crescent · Swift: as the wave unfolds, a fox mirror (Fox Step shade) beside each foe the hop cut cuts it
     again for 4 (guess: half the hop's 8), 0.07 s apart.
  6. Mirror Image (every form): the mirror is a moving shade that plays Mirror Image's own 剑花 (mirror20, 0.10 to
     0.325 s) in a slow loop at half speed. The old still copy and turning ghost sword are gone.
  7. Skyblade Waltz (every form): the rising pink bars are the Grove sword model, point up, flat to the camera.
  8. Blade Dance · Swift: a mirror stays where he dashed out; when he bursts it plays the same dance and bursts
     too, 5 to foes within 1.3 u (guess: half his 10).
  9. Sword Bloom · Crescent: no bloom goes out (no 剑风 ring, no line bursts). A sword floats point down over every
     foe a line cut; 0.5 s later each stabs down at its own moment within 0.5 s, for the bursts' numbers (10, and 4
     within 1.5 u).
  10. Blade Wheel (every form): a small tornado (1.7 u tall, widening up) with 22 small ghost swords flying up it;
      each 0.25 s cut shows a small crimson crescent on every held foe. The wind-up on his blade is unchanged.
  11. Radiant Cascade (every form): the swirl's spinning arcs are the passed 剑光; the spikes round it are Grove
      swords, crimson and white by turns. Crescent: the stray floor line on the last hit removed.
- v38 (20 Nov, Kesh 17:29 SGT, Sword Bloom): the v37 Crescent (hanging swords that stab, no burst) is now the base
  (lines 4 u). Crescent = the same at 6 u, and each stab opens the full bloom (the old burst star, rays and ring).
  Swift = each foe he passes gets a cut line (6) and a hanging sword that stabs (10, 4 within 1.5 u) with a half-size
  bloom; the old line burst is gone. Numbers unchanged. Retaken: S19, S19_s, S19_c (v37 copies in vid-v37/).
  Also v38 (Kesh 17:32 SGT, Titan Cleave · Crescent): each crescent blade of the ring is a vertical 剑风 cut out of the
  blow: it flies out from 0.3 r to r while it rises (0.18 s), with a vertical sword-light cut along its way. Retaken N_split_c.
- v39 (20 Nov, Kesh 17:36 SGT, Calm Forms, every form): the v37 leap gather was a misread and is gone. Each hit but the
  last gives the foes it struck a small push (0.25 s, spread 0.35 u) to where the next cut lands: hit 1 to the stab
  point past the leap, the stab to 0.8 u ahead of him (the rising cut), the rising cut to 0.9 u ahead of the low sweep
  (Swift: past its 2 u slide). The low sweep pushes none. Retaken N_riptide, _s, _c (v38 copies in vid-v38/).
- v40 (20 Nov, Kesh 17:40 SGT, Calm Forms, every form): the leap gather is back beside the pushes, smaller: foes within
  1.4 u of the stab point come to 0.55 u of it over the leap. Retaken N_riptide, _s, _c (v39 copies not kept).
- v41 (20 Nov, Kesh 18:12 SGT, Titan Cleave · Crescent "the sword mirror got 2"): the slam cleared the shared sky-sword
  state before the drop ended, so the dropped sword went back to hovering and stayed; the next cast showed two. The sword
  now keeps its own state and is removed once it has dropped. Retaken N_split_c.
- v42 (20 Nov, Kesh 18:38 SGT, Titan Cleave · Crescent "剑风 slower and more details"): each blade flies out in 0.5 s
  (was 0.18) and rises in 0.3 s, 0.035 s apart, lasting 1.3 s; two fading after-images trail it (0.05 and 0.1 s behind),
  a silver hairline runs down its edge, its pale core shimmers, it sheds pink needle sparks while it flies, and it cuts
  a glowing line in the floor along its way. Retaken N_split_c.
- v43 (20 Nov, Kesh 18:42 SGT, Blade Wheel repaint round4/targets/07-blade-wheel.png, "copy only how the tornado wind
  looks"): the wind is now spiral brush-stroke sheets (a bright pale line on the top edge with a hot-pink glow trailing
  down): 4 outer (#FF7AAE, 1.7 turns), 3 inner (#FF2F7A, 2.2 turns, faster), 2 pale upper (#FFB0CC); the funnel has a
  narrow foot (0.18 u) opening to 1 u at 1.9 u tall, a soft hot-pink haze cone inside and two low sheets round the foot.
  Our swords unchanged. Retaken S37, S37_s, S37_c, B2, C2.
  Also v43 (Kesh 18:44 SGT, Titan Cleave · Crescent): each 剑风 is a moon crescent (tips on the floor and up top, thickest
  in the middle), fired from where the floating sword stabs down: it starts at the point at 15% size and grows to full
  size as it flies out to the ring in 0.5 s. Floor lines start at the point. Retaken N_split_c.
- v44 (20 Nov, Kesh 19:06 SGT, Titan Cleave · Crescent "too slow ... facing outside angle ... 0.1s reach the end point"):
  all eight moons fire together the moment the sword stabs down (0.004 s apart), reach the ring in 0.1 s (about 0.1 s
  before the slam motion ends), and stand facing out along their own line (world-fixed, bulge leading) instead of
  turning to the camera. After-images 0.025/0.05 s behind; the moons fade by 0.45 s. Retaken N_split_c.
  Guess: "facing outside" = each moon's face turned along its outward line, convex edge first.
- v45 (21 Nov, Kesh 00:02 SGT "Frenzy: design is good, but make it extremely fancy" and 00:04 SGT "All Will specials lack
  of details, add in insanely details example 剑光, 剑痕, 剑风, 剑影, the mirror effect, the water effect"). Looks only;
  no rule, number or timing changed. Shared pieces in reviewAshfangFx.js: swordScar (剑痕: floor scar, pink glow + pale
  core + silver hairline), moonWave / moonBurst (剑风: the Titan moon crescent, facing out, small to big), swordShade
  (剑影: a fading ghost sword), ripples / drops (water: thin pale ripples, pale drops), mirrorShade (his Fox Step shade).
  Each special's extras are in SPECIAL_DETAIL (Frenzy's are inline in SPECIAL_FX.frenzy):
  SP1 One Thought: 4 sword shadows trail the falling sword, a vertical 剑光 along the line, 3 moons run the 7 u line,
    a long scar (3 s) with two side scars, stars down the line. SP2 Unmoved: 8 moons + 8 scars from the planted sword,
    8 small planted sword shadows round it for 3 s, a slow silver sword ring. SP3 Clear Mirror: 6 still-water ripples,
    his mirror twin facing him, 4 more mirror shades round him with ripples, a full circle of 剑光, a scar circle,
    drops. SP4 Frenzy: burst out of him, streaks on every dash, each cut a 剑光 crescent + hairline + star + floor
    scar, the 8 scars flash as one star, spirits streak back into him, 4 s haste: spinning twin-arc ring, pink
    after-images every 0.2 s, pink and silver blade sparks. SP5 Counterblow: 5 sword shadows fan out in front of the
    guard; the answer (blocked or not) fires a moon 剑风 down the line with a scar and a star. SP6 See Through: his
    mirror shade steps in behind each marked foe and cuts, a cross scar under each, a star. SP7 Wild Dance: each
    stroke a 剑光 crescent, a sword shadow at its corner and a scar; 5 moons fly out of the star's points at the end.
    SP8 Still Mountain: a ripple under him each 0.6 s, 6 sword shadows hang point down and turn round him for 3 s; on
    rising 8 moons, ripples and drops. SP9 Last Stand: 10 radial scars, 8 moons, 8 swords spring up from the floor.
    SP10 Flow: a scar along the S, drops and ripples where the stream passes, a 剑光 and star at its turn, ripples home.
  Rocks removed from One Thought, Unmoved and Last Stand (no dust or rock on Ashfang). v44 copies in vid-v44/.
  Contact sheets /mnt/project-files/vfx-dream/ashfang/specials/. Not changed: Clear Mirror's pale cyan mirror disc
  (older look; open choice to turn it pale pink).
- v46 (21 Nov, Kesh 00:51 SGT "for the ten will special, the floor crack use what we have" and 00:53 SGT "see in ten
  will which one can replace to what we have"): every 剑痕 (swordScar) is now the passed floor crack (taperCrack; its
  layers factored into crackMesh). New pathCrack draws the same crack along a curve: Clear Mirror's circle and Flow's
  S. Frenzy's cut scars use it too. Plain pieces swapped for passed looks: the spirit seal (two rings) -> magic circle
  (One Thought, Counterblow, Still Mountain); One Thought's wide flat band -> a row of Rift Cut spikes along the line;
  Clear Mirror's pale cyan disc -> Mirror Ring zone; Counterblow's flat 1 u band -> a row of Rift Cut spikes;
  See Through's yellow preview lines -> a faint held 剑光; Wild Dance's flat floor star -> the crack star; Still
  Mountain's two plain rings under him -> Mirror Ring zone; Last Stand's two plain cylinders -> a sheaf of Rift Cut
  spikes. Kept: Unmoved's plain guard ring that follows him, Flow's ribbon, Last Stand's silver strokes. Retaken SP1-SP10.
- PASSED (Kesh, 21 Nov 01:23 SGT, "Look good, mark pass"): page v46, Ashfang VFX with all card notes, the Blade Wheel
  wind, the Titan moon 剑风 and the ten Will specials (crack + passed looks).
