# Mosslight kit 2.0: what changes from kit 1.11

**Version 3, 2026-11-18, from the design thread ("Rethink Mosslight's play styles") for the ability
page thread.** Kesh, 02:06 Singapore time: three new styles, every skill reacts to each. His picks,
02:19: "1b, 2a, 3a, 4a". Talents are 3.7 (`MOSSLIGHT_TALENT_PATHS.md`). Lines K1 to K24.

**Settled; ready to build.** Kesh has not yet seen the new parts on the page: show them marked
"New, not passed", as the 1.11 combos were.

## What stays

- **K1.** The 26 skills, their rules and numbers as passed (kit 1.11): each is still its old self
  first.
- **K2.** Sower, seeds and Spitters, the garden rules (S49), the eleven combos (S68), the nodes
  (section 5), the wisp relic, no shields.

## What changes

- **K3. Every skill has three parts, always on, with no talent:** a heal, something that lasts, and
  damage (Kesh's pick 1b). The table is the talent doc's section 5, rows L1 to L29. A part marked
  ＋ is new: 43 in all (44 at first; Kesh added three, K16, and four went with the two cut skills, K19). Rows L17 and L29 gained nothing.
- **K4. The groups lose their path names.** S1 and the three headings read "quick heals", "lasting
  heals", "damage" only. No skill leans toward a path.
- **K5. Three small parts many skills reuse** (talent doc T9): the blossom (a heal of 5 that flies
  to the most hurt ally within 6 u), the sprig (Moss, 3 a second for 4 s), thorns (3 a second for
  4 s on a foe, one from each skill, a new cast restarts it).
- **K6. Sizes the table leaves out.**
  - L1 razor leaf: the leaf's path is 1 u wide for foes. L2: the bolt's own width.
  - L3 wet lane: the same 4 u by 1.6 u, 3 s, allies only.
  - L4 petal blades and L24 fruit: on the burst, once.
  - L5: the wall slam needs the foe to stop against a wall or another foe inside the 2 u push.
  - L6: the three wisps fall 0.2 s apart on the three nearest foes within the 2 u (0.9 u each).
  - L7 thorn moss: only while the Moss is on.
  - L9, L10, L12, L15: thorns and acorns fly like a Spitter's thorn; an acorn bursts in 1 u.
  - L11 wisp fire: only while 3 wisps wait and no ally within 4 u is hurt; the timer then runs
    on. A wisp still becomes a seed at 10 s when no foe is in reach.
  - L14: one foe choked per creep; a foe is choked once per cast.
  - L16: one leaf and one blade per stopped shot, 8 of each a wall.
  - L19: the healing wisps fall at 0.5 s, 1.5 s and so on, five a storm.
  - L20, L21: allies heal only while they stand inside.
  - L25: the burst is damage only and carries no pollen.
  - L26: nightmare ticks are not hits on a sleeper.
  - L27: thorns come from her own two bolts, not the turret's. The mote needs the planted staff.
  - L28: the dash's own rules (top priority, cancel, i-frames, 5% once every 3 s) are untouched;
    the ally heal and the thorn burst share the 3 s limit.
  - As built on the page (v30, 2026-11-18; the page thread's guesses, kept): the sapling's thorn
    reaches 4 u; a creep chokes the nearest foe within 3 u; the dash's thorn burst fires only on
    a dash whose heal is ready. All 44 parts are built.
- **K7. Slows do not add;** the strongest counts.
- **K8. Section 7 ("the kit under the talents") is replaced** by the talent doc, sections 3 and 4.
  Spring and old Evergreen are gone, so its cooldown and Regrowth tables go.
- **K9. Briar Coat is back as a part**, not a skill: Mossgrowth's thorn moss (L7).
- **K10. AI (section 8):** unchanged; the new parts need no aim (talent doc T30).

- **K15. Seeds (Kesh, 2026-11-18 08:18 to 08:23 Singapore time, in the page thread; built on the
  page).** This replaces "sprouts at 3 s near a foe, gone at 8 s" (S43) and Sower's 3 seeds (S54).
  - A seed waits 5 s. A hurt ally who walks on it picks it up and heals 11.
  - If nobody does, at 5 s it always turns into a flower (a Spitter) that attacks for 5 s, foe
    near or not. 10 s in all.
  - Sower: the turret bursts out 2 seeds, not 3. The pouch seed every 8 s stays.
  - Every seed source bursts its seed out on a low arc; none drops a seed at a hero's feet (it
    would be an instant heal). As built: a seed that would land within 1 u of a hero or on its
    own source lands 1.2 to 2 u out. This covers Mossgrowth's full run, the relic wisp, the
    sapling's end, a Seed Bolt miss and a dusted foe.
  - Styles: a pickup gives a Ring (Growth Rings); Long Season makes it 6.5 s and 6.5 s; the
    flower's damage is stored (Reap). No new rule was needed, only T7: a seed's wait is now
    lengthened too.
  - Unchanged: skills wake or use a seed at once (S56); at most 4 Spitters.

- **K16. Four parts changed by Kesh (2026-11-18 09:25 Singapore time, in the page thread; built on
  the page, v33).** The sizes are the page thread's picks.
  - L2 Seed Bolt: when it ends, on an ally or a miss, 2 seeds hop out (low arc, K15). This
    replaces "a miss leaves a seed".
  - L8 Firefly Swarm: stung foes take 20% more damage (减防, the kit's exposed), in place of the
    20% slow.
  - L12 Elder Oak: a foe that stays 2 s under the crown is held by roots 1 s, then its count
    starts again. A boss is only slowed.
  - L9 Dewfall: allies inside attack 30% faster.

- **K17. Mending Sapling (Kesh, 2026-11-18 11:30 Singapore time; numbers by the page thread).**
  As built on the page (v34): level 1 from the start (blossom 8), level 2 at 3 s (11), level 3
  at 6 s (14, reach 4 u, a bigger tree). On cast it absorbs up to 5 seeds within 3 u, each adds
  2 s; level 3 unlocks only with 3 or more. Base life 8 s. This replaces U4 c (up to 3 seeds).
- **K18. Two skills cut and replaced (Kesh, same message).** The pool stays 26.
  - Out: Forest Spirit (S67) and Sapping Vine (S25); text in
    `cut/FOREST_SPIRIT_S67_AND_SAPPING_VINE_S25.md`.
  - In: **Rootweb 根脉** (kit S70, a passive, lasting group) and **Snapjaw 捕蝇草** (kit S71, damage
    group, cooldown 12 s). Full text in the kit file; rows L15 and L22 of the talent doc.
  - Shown to Kesh as my picks with two spare ideas (a spirit that repeats her casts; a vine
    whip). He may swap.
- **K19. What goes with the two old skills.**
  - Combos: A6 / C43 (the oak carries the spirit's 10%), A12 / C49 (the spirit tends the garden),
    A7 / C44 (Drowsy Spores, then Sapping Vine). Eight of the eleven stay: A3, A4, A5, A8, A9,
    A10, A11, A13.
  - Parts: row L15's three (the spirit's heal of 4, the 10% kept 2 s, its acorn) and row L22's
    one (the bound slow). The new-part count is 43, plus two whole new skills.
  - Rules: "the spirit tends" in the garden rules (S49); Sapping Vine as a seed source (a seed
    when its foe falls) and as the exception on a sleeper (S65); the vine's AI rule; the "stand
    together" line; both node rows.
  - New combos: W1 water runs through the web, W2 the oak links every plant under its crown, W3
    the Oakling's moving line; J1 the Snapjaw eats seeds, J2 a foe that falls in its jaws leaves
    a seed, J3 it bites sleepers first and 50% harder. The Snapjaw is a helper for A5.

- **K20. Rootweb cut, Lure Lily in (Kesh, 2026-11-18 12:05 Singapore time: "no Rootweb, re-design
  one to replace it").** Take the Rootweb and its combos W1 to W3 off the page. **Lure Lily 诱香花**
  (kit S72, lasting group, cooldown 16 s) takes row L15. Its combos are Y1 (it drinks up to 3
  seeds: 1 s of lure and 6 burst damage each) and Y2 (a Pollen Gust that crosses it lures the
  foes it pushes, 2 s). New machinery: a lure (a forced target on a foe, like a taunt). She has
  one passive again, Glade Wisps. Models wanted: Snapjaw (prompt 8) and Lure Lily (prompt 9) in
  `MOSSLIGHT_PLANT_SHEET_PROMPTS.md`.
  As built on the page (v35, 2026-11-18): the lily as written, Y1 and Y2 as clips C57 and C58;
  Kesh's Snapjaw and Lure Lily models are in (softened GLBs, accepted by him 12:25); the
  Snapjaw's bite is a lunge and a squash, since its jaw has no hinge.

- **K21. Kesh's eight changes (2026-11-18 14:28 Singapore time, in the page thread).** Six are his
  rules. The sizes are the page thread's guesses, as built on the page; Kesh has not picked them.
  - L12 Elder Oak: no slow; the root stays; allies under the crown deal 20% more damage.
  - L5 Pollen Gust: no slow; a slight push of 0.8 u; the foes it pushes are dusted 6 s.
  - L19 Wispfall: a channel, 15 s, cooldown 30 s. Each wisp is 10% stronger than the last, up to
    double (dives 7 to 14, heals 6 to 12). A stun, a step, any other cast, a basic attack or a
    dash breaks it.
  - L8 Firefly Swarm: a stop on an ally gives that ally 15% more damage for the 3 s stop.
  - L14 Creeping Moss: a hit on an ally who carries it is split evenly among all who carry it
    (at least 1 each); 30% of a hit on a choked foe hits each other choked foe as added damage.
  - L3 Dew Wave and L13 Rain Cloud: watering is doubled (seed growth, a helper's time and speed,
    Moss).
  The other two are re-designs, K22 and K23, built as written (page clips C59 to C63 for P1, P2,
  P3, F4, F3; C41 dropped). One gap on the page: Swiftleaf's hop and full turn is not built; the
  rig keeps its usual cast pose there.
- **K22. Pollen Mark cut, Petal Twister 花旋风 in (kit S73, row L25).** A roaming twister of petals:
  2.2 u radius, up to 5 u away, lives 5 s, drifts 1.5 u a second toward the nearest foe not yet
  dusted, cooldown 12 s, one at a time. Foes it touches are dusted 6 s; allies inside heal 4 a
  second; foes inside take 4 a second. It moves and slows no foe. No model.
  - Dusted is a shared status now (kit S74), unchanged from 1.11, from the gust and the twister.
    Pollen Mark's burst (12 in 2 u) is gone with it.
  - **A4 is dropped:** the gust dusts by itself. A5 and A11 stay and work on any dusted foe.
  - New combos: P1 it lifts up to 3 seeds and throws them out as Spitters when it ends; P2 a
    Pollen Gust that crosses it blows it 4 u along the wind and adds 2 s (once); P3 it carries
    a Puffcap's spores (foes inside take 20% more).
- **K23. Swiftleaf re-designed (kit S10, row L1).** Three leaves on three curves (left, right,
  high) meet on the most hurt ally within 5 u: 5 each (7 on Moss). Then one flies on to the next
  most hurt ally (7), one stays as a sprig, one cuts its way home (6). On the way out each leaf
  cuts 3, and the meeting cuts 5 within 1.5 u. Cooldown 2.5 s.
  - The motion is in the kit entry, four beats, about 1.2 s; the three ribbons draw one big leaf
    on the floor. This is the part he asked for: "extremely fancy".
  - Combos: F1 seeds ride the leaves (U5 a, kept: 11 each, 2 a cast); F2 on Moss (kept); F3 dew
    leaves (a leaf through her water makes the meeting water Moss and plants within 1.5 u); F4
    dusty leaves (a leaf through the twister dusts the foes it cuts, 3 s).
  - Gone: the 1.5 return rule (R27) and the razor leaf, both folded into the three leaves.
  - The new-part count is 45: 43, less Swiftleaf's two and Pollen Mark's one, plus his five (L5,
    L8, L12, two on L14).

- **K24. Two more from Kesh (2026-11-18 16:12 Singapore time, in the page thread; built on page
  v37, sizes are the page thread's guesses).**
  - L17 Scatter Seeds: a seed this skill makes takes double from watering: the seed and the
    Spitter it becomes get 6 s more and are faster for 6 s. It stacks with the doubled watering
    of Dew Wave and the Rain Cloud (K21). Page clip C64.
  - L22 Snapjaw: a bite mark (a ring of teeth) shows on the foe it will bite next. A bitten foe
    is dragged to 0.75 u from the Snapjaw, then held 1.2 s. A boss is not dragged.

- **Motions (for the record; no rule changed).** Kesh, 2026-11-18 16:47 Singapore time, in the page
  thread: a motion pass on every skill. Page v38 gives each skill its own cast move and makes
  the plants spring up, breathe, squash and wilt. The list, one line a skill, is
  `/mnt/project-files/mosslight-abilities/MOSSLIGHT_MOTIONS.md`; it is the source for any "her
  move" line.

## New machinery

- **K11.** For the parts: thorns (a damage over time status, from any skill); a wall slam on a
  push; a shot thrown back; damage on a dash. For the talents: Rings (a stacking status that
  raises maximum health and healing taken, maximum only, as the Forest Spirit's 10% was); a timer scale for
  everything of hers that lasts; an effect that comes back once (Perennial); a save from being
  downed (Last Leaf). Since K21 to K23: a channel (Wispfall); shared damage and added damage
  between carriers (Creeping Moss); a zone that roams (the twister); three shots on curves that
  arrive together (Swiftleaf).

## For the page

- **K12.** The parts are the skills now, so each skill's clip shows all three: a hurt ally, a foe,
  and the lasting thing. Pollen Gust first (Kesh's own example).
- **K13.** Each card: three short lines, Heal, Lasts, Damage, with ＋ on the new ones. No more
  words than that (his rule for review pages).
- **K14.** Talents later, if he asks: a style switch that lights the part each style feeds on, and
  Rings as rings of light on the floor round an ally's feet, one per Ring.
