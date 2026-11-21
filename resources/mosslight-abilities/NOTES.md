# Mosslight review page: notes and records

The page (https://claude.ai/artifact/PRvbQox74ZuoGZkzVjEq5c) shows only the skills, their clips and
short descriptions (Kesh, 16 Nov 19:47 Singapore time: "simple and clean ... too many word inside
makes me headache"). Everything else lives here and in the design docs.

## Where the full text is

- Skill kit, every rule and number: `/mnt/project-files/mosslight-talents/MOSSLIGHT_SKILL_KIT.md`
  (version 1.7, lines S1 to S56).
- Druid review, R1 to R52: `/mnt/project-files/mosslight-talents/MOSSLIGHT_DRUID_REVIEW.md`.
- Talent paths T1 to T53: `/mnt/project-files/mosslight-talents/MOSSLIGHT_TALENT_PATHS.md`.
- Plant model prompts: `/mnt/project-files/mosslight-talents/MOSSLIGHT_PLANT_SHEET_PROMPTS.md`.
- The last long page (version 15, with the review lines, nodes, relics, open choices and talents):
  `page-v15-full.html` in this folder.

## Page versions

- v15 (16 Nov): kit 1.4, the druid review's [1.4] lines, combos C5 to C11.
- The clean page (first published as version 16). Kesh's five Tripo plant models in the clips: Elder Oak, Oakling
  (a five-bone skin made from the model for walk and slam), Mending Sapling, Spitter (softened
  texture, his pick), Puffcap.
- Page version 18 (16 Nov, published 13:35 UTC; versions 16 and 17 were the same page while I fixed its version line): kit 1.5, his "1 a, 2 yes, 3 build all": pool 18 plus Bramble Hedge (S53), and the 13 R lines
  that waited (R25 to R28, R33, R39, R44 to R50). New: an "Attack and dash" section (S8, S9), the 1.5
  lines on S10, S12, S13, S14, S19, S22, the Bramble Hedge card, two garden rows and combos C12 to C17.
- Page version 19 (16 Nov, 14:35 UTC): kit 1.6. Kesh's two asks in this thread (13:50 UTC): Oakling
  grows every seed within 3 u into an Oakling too (C18); a Mending Sapling that ends by itself leaves
  a seed (C19). Sower (S54), her class passive, shown above the skills: a turret that runs its full
  5 s leaves 3 seeds 0.8 u apart, none on an early call back (S54, C20); in a fight a seed hops from
  her pouch every 8 s, 1 to 4 u away, first at 4 s (C23). C21 and C22: Sower seeds, then Oakling or
  Rootspear. S8 retaken with the staff's seed buds. The page now says "kit 1.6" in place of a version.

- Page version 20 (16 Nov, about 16:00 UTC): kit 1.7. Kesh 14:48 UTC: no dash flower trail, no
  flowers on Dew Wave (its grass stays). 14:52 and 14:53: the turret's end bursts and shoots its 3
  seeds on low arcs to random spots round it. Kit 1.7 (his "i like all" to U1 to U7): seeds wait 3 s
  before they sprout by themselves, and ten skills use seeds (combos C24 to C33). His seed model
  (softened, his pick "1") draws every seed. C12 (Heartbloom wakes seeds) left the page: C30 shows
  the 1.7 rule. Version 21 (16:50 UTC): the older clips with seeds retaken with the model.

- Page version 22 (17 Nov, 23:02 UTC on 16 Nov): Kesh passed the kit ("So far so good", "Can mark pass
  first"). The header now reads "Passed by Kesh, 17 Nov". The clips' effects are stand-ins; real VFX
  come at the freeze lift and get their own review.

- Page version 23 (17 Nov): kit 1.9 from the design thread, on his picks "drop the hedge, add in 17
  and 20" and "1 b / 2 make it 2 hit or 3 hit ... / 3 drop compost, add 16 / 4 you decide". Bramble
  Hedge (S53) left the page with its combos (C17, C27). Eight new skills with one clip each: S57
  Nectar Burst, S58 Rain Cloud, S59 Creeping Moss, S61 Leaf Gale, S62 Wild Thicket, S64 Pollen Mark,
  S65 Drowsy Spores, S67 Forest Spirit; six new combos C34 to C39. Pool shows 26. The new cards
  carry a "New, not passed" chip; kit 1.7 stays passed.

- Kit 1.10 (17 Nov, Kesh's "1 a / 2 b" on the combo audit): Forest Spirit adds max health only on
  entering (the bar grows, the fill stays); Leaf Gale makes at most 8 leaves a wall. Both are in the
  review build; the S67, S61 and C38 clips still show 1.9 and get retaken with the next page version.
  The audit's combo ideas A3 to A13 are not answered, so none is built.

- Page version 25 (17 Nov, 05:37 UTC): Kesh "Mark all pass". Every card on the page is passed, kit
  1.10 (the 1.9 skills and combos plus the 1.10 Forest Spirit and Leaf Gale rules; S67, S61 and C38
  retaken for 1.10). The eleven 1.11 combos (A3 to A13, his "the combo i want all") are being
  recorded and come next as C40 to C50, marked "New, not passed".

- Page version 26 (17 Nov): kit 1.11, the eleven combos of S68 (his "the combo i want all") as
  C40 to C50, one clip each, marked "New, not passed". The header says kit 1.10 is passed.

- Page version 27 (17 Nov, 06:02 UTC): Kesh "all good, mask pass". Kit 1.11 passed, all 26 skills
  and every combo; no card carries a "New" tag.

## Review build

- Local only, branch `review-only/mosslight-tripo`, never pushed (feature freeze). Backup with a
  diff and the changed files: `tools/review-only-build/` in this folder.
- The review build hides the game's orange rune circle under Dewfall and the heal beam under
  Swiftleaf and Mossgrowth, so the plant looks show. Damage from her skills on an exposed foe shows
  whole numbers.
- Clips are recorded in software GL (about 1 fps), so motion and feel need a look on a laptop.

## What is guessed

- Kit 1.5 numbers: the leaf waits 0.3 s on its ally before it flies home at 8 u/s; the hedge grows in
  0.3 s and keeps each foe on the side it came from; the dash's flowers are seven, 1.25 s each.
- Bramble Hedge is a stand-in shape (leaf clumps, wood stems, pale blossoms, pale thorns, a crystal
  bud at each end) until its model comes. The clip's dummies are stepped toward her by the page,
  since training dummies do not walk; the boss clip (C17) is a dummy marked as a boss.
- The Sprout node shows on Dew Wave (a seed at the lane's end) and Rootspear (a seed at the row's end).

- Kit 1.6: the 3 u Oakling reach for seeds; a seed Oakling counts beside the cast's own Oaklings (no
  cap yet); the pouch seed's spot is clamped inside the room's walls, which stands in for "nearest
  open floor"; the buds swell on the staff's roots at 1.6, 3.3 and 5 s and wither with a puff on an
  early call back.
- The pouch runs only in clips that turn it on (the page sets `__reviewPouch`), so each other clip
  shows only its own rule.
- Kit 1.7: turret seeds land 0.8 to 2.2 u out (seeded stream); seed flight 0.42 s, about 0.3 u
  high; a used seed zips 0.28 s to what took it. The other 1.7 numbers are the design thread's.
- C25: the page holds D for 0.8 s so she walks after the gust; the gust's end at 7 u is otherwise at
  the clip's edge. C26: the seed Puffcap by a dummy bursts at once, the others wait.
- Every number on a new or redesigned skill or rule.
- Model sizes follow the sheet prompts: Oakling 0.6 u, Elder Oak about 3 u, sapling up to 1.3 u,
  Spitter 0.5 u, Puffcap 0.4 u. The Oakling reads small at play zoom; 0.75 u would read better.
- The Elder Oak's crown is drawn half see-through so the party under it stays visible.

- Kit 1.9 looks are stand-ins: the rain cloud is a ring of pale spheres with falling drops; the
  Leaf Gale wall is a pale standing slab with leaves; Wild Thicket uses the Rootspear spikes, taller;
  the sleep cloud and the z sprite; the exposed ring is a hex ring for the 4 s.
- Kit 1.9 rules filled in by me: Drowsy Spores keeps one count on the foe that adds up hits from
  everyone, and damage over time counts once a second per source (the design thread confirmed); the third hit wakes the foe and exposes it 20% for 4 s; a boss is only
  slowed. Leaf Gale turns a foe shot that enters the wall into a leaf that heals the most hurt ally
  within 6 u of the wall (the kit line now says the same). Forest Spirit floats 0.8 u behind and 0.45 u to the side; it adds 10% max HP while an
  ally is within 4 u and takes it back on leaving.
- Clips with real fights use spawned boars or mantises (the mantis shoots) in place of a room's
  roster.

- Kit 1.11 rules filled in by me: A3 measures 1.5 u from the wall's edge and the seed flies 0.3 s
  before its Spitter comes up; A4 carries pollen from any dusted foe in the gust, a boss included,
  but dusts only the foes it pushes; A5 counts one heal per hit, at most 3 in any 60 ticks for the
  whole party; A6 counts the oak only after it has grown (0.6 s) and needs the spirit to be out;
  A10 starts once the gust's band touches the cloud's circle; A11 is one seed per 1.5 s for the
  whole room; A12 adds the 2 s before the plant's first event, so a Puffcap waits 2 s longer;
  A13 checks the oak at the thicket's burst, not its cast.
- Clip helpers in 1.11 (review build only): live counters on C41 (dusted foes), C46 (slowed foes),
  C47 (Spitters watered), C49 (each Spitter's time left), C50 (toss length). C48 gives the party
  i-frames so no one picks up the seeds before the viewer sees them.

## Clip notes

- Mossgrowth: the seed from a full run lands at the Tank's feet and he picks it up at once (+11).
- C8: the dummies set the Puffcap off before the wind arrives, so the gust carries the spores from
  its cloud, which the rule allows.
- C9: numbers like 14.4 and 7.5 come from other heroes' hits and critical hits, not from her skills.
- C12 to C17 and S8, S9, S10, S12, S19, S53 are new for 1.5; every clip with a plant was retaken with
  his models and the thorn bolts. The C17 dummy marked as a boss draws as the Stag boss.
- S54: the turret's bolts push the dummies past 4 u, so the three seeds do not sprout in that clip;
  sprouting shows in C21, C22 and C23.
- C18: the hurt Tank picks up one seed, so two or three Oaklings slam. C23: the dummies drift, so few
  seeds sprout; it shows seeds piling up from the pouch and the turret.
- C14: the gust's 7 u end sits near the clip's right edge, so the Spitters it wakes are small there.

## v28 (17 Nov, ~09:15 UTC): flat floor
Kesh asked for a flat square floor with dummy units, like the model review page. All 76 clips on the page were retaken on a flat grey floor with a 1 u grid (no fog, no dressing, no fireflies, no vignette).
- Review build only: `?flat=1` in `src/scenes/arena.js` hides the room dressing and draws the floor (diff in tools/review-only-build/flat-floor/). Runner: tools/kit-jobs/runflat.sh.
- Training dummies stand in wherever a skill only needs a target. Real foes stay where the rule needs them to act (shooters, chargers, sleepers, foes that fall and drop seeds).
- Skill rules, numbers and texts did not change; only the background did.

## v30 (18 Nov SGT): kit 2.0, tile floor, language switch
- Kit 2.0 from the design thread (Kesh's "1b, 2a, 3a, 4a"): every skill, the basic attack and the dash show Heal / Lasts / Damage; 44 new parts marked ＋ and "New, not passed". 27 new clips kit20_S*.
- Built on a patched copy of the review build (scratch k20repo, dev server 5200) so the tile-floor retakes on 5199 kept running. Patches: tools/kit20/ (patch_sim.py + k20_block.js for the sim, patch_fx.py + k20_fx.js for looks). Not in the repo (freeze).
- Recorder fix: dummies get 400 HP before the settle and go back to their spots on the first frame (allies used to kill or shove them before the take).
- Guesses (open for Kesh): sapling thorn reach 4 u; wet lane heals allies, not her; pollen burst 12 in 2 u at the end or on a fall; choke picks the nearest foe within 3 u per creep; nectar wisps do not wake seeds; dash haste on every dash, but the thorn burst and ally heal only on a dash whose heal is ready; Pollen Gust slam shown foe-into-foe (the arena wall is 12 u away on this stage).
- Number placement in clips is the game's own (numbers drift on their arc), so a number can sit a little off its foe.
- Remaining tile-floor retakes of old combo clips land in the next publish.

## v31 (2026-11-17 21:40 UTC)
The last 33 combo and skill clips were retaken on the tile floor, so every clip on the page now stands on the square grid. Text unchanged from v30. Not passed yet.

## v32 (2026-11-18 01:20 UTC)
Kesh 18 Nov: a seed waits 5 s (a hurt ally who walks on it heals 11), then always turns into a flower that shoots for 5 s. The Sower turret bursts out 2 seeds (pouch seed every 8 s stays). Every seed bursts out on a low arc and never lands within 1 u of a hero (my rule: such a seed moves 1.2 to 2 u out). Seed card dropped at his word. 19 clips retaken on the kit 2.0 copy (patch_seed.py, patch_seed2.py). Open: the Spitter cap of 4 is unchanged.

## v33 (2026-11-18 02:00 UTC)
Kesh 18 Nov 01:25: Seed Bolt hops out 2 seeds when it ends, on an ally or a miss. Firefly Swarm: stung foes take 20% more damage (减防), in place of the 20% slow. Elder Oak: a foe 2 s under the crown is held by roots 1 s, then its count starts again (bosses only slowed). Dewfall: allies inside attack 30% faster. My numbers: 20%, 2 s, 1 s, 30%. Patch: tools/kit20/patch_kesh4.py.

## v34 (2026-11-18 04:10 UTC): kit 2.1
Kesh 18 Nov 03:30: Mending Sapling grows in levels and heals more each level; on cast it drinks up to 5 nearby seeds, each +2 s; 3 or more seeds unlock level 3. Forest Spirit and Sapping Vine removed; Rootweb (根脉, passive: root lines link her plants, allies on a line heal 3/s, foes crossing are slowed 30% and take 6/s) and Snapjaw (捕蝇草, damage, 12 s: a flytrap that bites 14 every 2.5 s, holds the foe 1.2 s and throws a fruit of 6 to the most hurt ally) replace them, so the pool stays 26.
- Six new combos C51 to C56 ("New, not passed"); old combos C43, C44, C49 (they needed the removed skills) were dropped; C28 text updated.
- My numbers: sapling heal 8 / 11 / 14 at 0 / 3 / 6 s; level 3 also +1 u reach; Snapjaw bite 14, hold 1.2 s, 10 s life, fruit 6, eats up to 3 seeds (+4 bite, +0.3 u reach each), bosses take +20% for 2 s instead of the hold; Rootweb numbers above. Rootweb does not lengthen the staff turret.
- Patches: tools/kit20/patch_sapling.py, patch_kit21.py. Stand-in flytrap shape (no Tripo model yet).

## v35 (2026-11-18 04:45 UTC): Lure Lily, plant models
Kesh 04:05 UTC (design thread): "no Rootweb, re-design one to replace it". Rootweb and its combos C51 to C53 are off the page. Lure Lily 诱香花 (kit S72, design thread) takes its place, "New, not passed": cd 16 s, planted up to 5 u, opens in 0.4 s, stands 6 s, foes cannot hurt it; foes within 4 u walk to it and attack only it for 3 s (bosses slowed 30%); allies within 4 u heal 4 a second; at the end it snaps shut, 20 to foes within 2.5 u. Combos C57 (drinks up to 3 seeds: +1 s lure, +6 burst each) and C58 (a Pollen Gust that crosses it lures the foes it pushes back to it, 2 s). The pool is still 26.
- The lure is a taunt whose source is an untouchable body at the lily (review build: patch_kit22.py; enemies.js accepts it as a taunt source).
- Kesh's Snapjaw and Lure Lily models (tripo-summons/, softened by the design thread) replace the stand-ins (patch_kit22b.py). The Snapjaw's jaw has no hinge, so a bite is a lunge from the base plus a squash; the lily opens from a narrow bud and squashes shut at the end. Retaken: S71, C54, C55, C56, S72, C57, C58.
- Fix: the Snapjaw's reach ring was drawn too big after it ate seeds (the ring scaled with the plant); it now matches its reach.
- In the C57 clip a hurt ally picked up one of the three seeds first, so the lily drank 2 (lure 5 s, burst 32).

## v36 (2026-11-18): kit 2.3, Kesh's eight changes
Kesh 06:28 UTC: Elder Oak no slow, keeps the root, allies under it deal more damage; Pollen Gust no slow, a slight push, dusts; Wispfall a 15 s channel (cd 30 s) that grows each hit and breaks on CC, moving, casting, basic attack or dash; Pollen Mark dropped for a new wind skill that dusts; Firefly Swarm gives a damage buff at ally stops; Creeping Moss shares damage among Moss allies and passes X% of a hit on a choked foe to the other choked foes; Dew Wave and Rain Cloud water at double strength; Swiftleaf re-designed, "extremely fancy".
- The two re-designs are the design thread's (kit S10 Swiftleaf, S73 Petal Twister, S74 dusted). Both "New, not passed".
- My numbers (guesses, open for Kesh): Elder Oak +20% damage; Firefly Swarm +15% for the 3 s stop; Wispfall +10% a wisp, up to double (7 to 14 damage, 6 to 12 heal), a move of more than 0.08 u a tick breaks it; Creeping Moss passes 30%, the shared hit is split evenly and rounded to whole numbers; Pollen Gust push 0.8 u.
- Swiftleaf: three leaves (left, right, high) meet on the most hurt ally within 5 u: 5 each (7 on Moss); the pinwheel cuts 5 within 1.5 u; each leaf cuts 3 on its curve; one flies on to the next ally (7, 10 on Moss), one stays as a sprig (Moss 3/s, 4 s), one cuts its way home for 6. Not built: her hop and full turn on the cast (the rig keeps its usual cast pose).
- Petal Twister: 2.2 u, lives 5 s, roams 1.5 u/s to the nearest foe not yet dusted; dusts 6 s (restarted inside), heals allies inside 4/s, cuts foes inside 4/s. Combos C59 (lifts up to 3 seeds, throws them 2 u as Spitters), C60 (a gust blows it 4 u, +2 s, once), C61 (Puffcap cloud: foes inside take 20% more), C62 (F4 dusty leaves, 3 s), C63 (F3 wet leaves water within 1.5 u).
- Dropped: S64 Pollen Mark and C41 (A4, the gust dusts by itself now). C42 now shows the Petal Twister. C10 text: allies under the oak deal 20% more (no slow).
- Patches: tools/kit20/patch_kit23.py, patch_kit24.py.
- Fix found on the retake: a walking step is about 0.07 u a tick, so the first Wispfall build never broke on moving; the limit is now 0.02 u a tick and the S22 clip shows the break.

## v37 (2026-11-18 08:55 UTC): Scatter Seeds water, Snapjaw bite mark
Kesh 08:12 UTC: Scatter Seeds' seeds get double the watering; the Snapjaw puts a bite mark on its target and drags it to itself.
- Scatter Seeds: its seeds, and the flowers they become, take any watering twice (+6 s life and 6 s faster, not 3). My call: it stacks with Dew Wave and Rain Cloud's double, so x4 there. New combo C64 (Scatter Seeds in Dewfall, beside a plain seed).
- Snapjaw: a ring of teeth under the foe it will bite next (sleepers first, then the nearest), with a small marker over its head. A bitten foe is dragged to 0.75 u from the stem in about 0.25 s, then held 1.2 s. Bosses are not dragged (they were never held). My numbers.
- Patch: tools/kit20/patch_kit25.py.

## v38 (2026-11-18 12:30 UTC): the motion pass, skill clips

Kesh 08:47 UTC: "look good, now do audit and review to insanely fill in motion details with extreme quality".
The list he reads is MOSSLIGHT_MOTIONS.md (audit, her move for each skill, the effects, three open choices).

- Every skill plays its own cast move (`c_<sim skill id>` in tools/motion/casts.mjs, built to casts.json by build_casts.mjs
  with the rig thread's pipeline from the passed GLB; the GLB is unchanged). The page starts each move 0.1 s before its
  effect frame, as before (choice 24 b), so each move is a 0.1 s wind-up, the blow, and a long follow-through.
- Wispfall: c_bell_toll (raise) runs into c_bell_loop (held, swaying) until `review_fall_end`; c_bell_end lowers the staff
  (from 0.22 s in when the channel breaks). A dip of spine and ears on every `review_fall_stack`.
- Reactions that only play when she stands idle: c_catch on `review_sl_home`, c_yank on `review_snare_clench`.
  Glade Wisps: a head glance and ear flick on `review_wisp`, at most once per 2.5 s, laid over any clip.
- Staff twirls are applied at runtime after the paw attach (Leaf Gale: axis z, 4 turns; Petal Twister: axis x, 3 turns;
  the catch: 1 turn).
- Plants: one pivot at each plant's foot (JUICE table in reviewPathsFx.js) adds a spring at birth, breath and sway,
  a squash on its action events, a stretch on `review_water`, and a wilt to one side while it fades.
  Floor rings and sprites stay outside the pivot so they stay flat.
- Floor dust: LAND table, timed from `skill_cast`, at the staff's foot, her left paw, her feet or the gem.
- My choices, not his: every pose and timing; the yawn on Drowsy Spores; the side wheel on Petal Twister (a flat
  lasso over her head went through her ears); reactions only from idle.
- Checked: each move as stills in the close-up viewer (two views), then in the page clips cropped to her (tools/motion/zoom.py).
  No page errors in any take. Motion and feel not judged (cloud renders about 1 fps).
- Recording: two recorders in parallel, about 4.5 minutes a clip each; 28 skill clips in 60 minutes.
- v39 (2026-11-18 15:55 UTC): the 55 combo clips retaken with the new moves (two recorders, about 2 h 40 min);
  every take finished, no page errors, framing checked on contact sheets. All 83 clips now show the motion pass.

## v40 (overnight 18 to 19 Nov, Kesh 16:02 UTC: "continuously ... until it have score 9 out of 10")

Score and what holds it back: MOTION_SCORE.md. Moves changed: MOSSLIGHT_MOTIONS.md.

Open choices (my picks, built; say if you want them back):
1. Each skill card now has a small close-up of her move in the corner of its clip (360 px loop from the close-up viewer).
2. Elder Oak and Rootspear plant the staff a little to her right instead of dead centre, so her face shows; both paws still on it.
3. Wispfall holds the staff high beside her head instead of straight over her face.
4. Leaf Gale's wall is a little fainter (the leaves read more than the sheet) and springs up with a small overshoot.

Guessed: effect curve strengths (spark spray, ring ease, trail swell) were judged at about 1 frame a second only.

Kesh, 19 Nov 06:28 (UTC+8): "All look good, for 4, the vfx and 数值 is a future thing to workout, now only draft a simple one for me to see how it will work". All v40 changes and choices kept. Effects on the page stay simple drafts that show how each skill works; VFX polish and numbers (数值) are later work.
Kesh, 19 Nov 06:28 (UTC+8): "Mosslight mark pass". Mosslight's ability page (v40) is PASSED.
