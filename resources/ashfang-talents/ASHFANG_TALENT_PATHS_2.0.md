# Ashfang: talent paths

**Version 2.0, 2026-11-18.** The re-think. Kesh, 01:20 to 01:30 Singapore time: path 1 is 机动性
("no more combo ... thrust thru foes"), path 2 is 站桩 ranged ("more aoe or line up"), path 3 is
意志 ("instead of element, it is mental thing status": 剑意, 不屈, 止水, 狂热); "for all ashfang
skills, it have a base animation" and each style adds to it or changes it; the motions must be
"extremely fancy"; and his picks "1a, 2a, 3 your choice". The proposal and its three picks are in
`ASHFANG_RETHINK.md` (closed); the motion scripts are in `ASHFANG_MOTIONS.md`; the kit changes
for the ability page thread are in `ASHFANG_KIT_2.0_CHANGES.md`. The 1.7 text is kept as
`ASHFANG_TALENT_PATHS_1.7.md`.

Design only. Nothing here is in the game; the feature freeze holds. Every line has a number (T1
to T40). All numbers are first guesses until they are measured in play. The template every hero
shares is the repo's `docs/TALENTS.md`.

---

## 1. How Ashfang's talents work

- **T1.** One pool of 26 skills. Each skill has a **base form**. With no tier I talent he plays
  the base forms.
- **T2.** The tier I talent sets his style and re-shapes every skill he holds:
  - **Swift 疾 (机动):** each skill gets a thrust, a dash or a cut through the foes.
  - **Crescent 剑气 (站桩):** each skill throws 剑气 (a line) or 剑风 (an area), and he stands.
  - **Will 意志:** skills stay in their base form; two will marks cast a special by themselves.
- **T3.** One pick per tier from any path, so only one style is ever on. Every talent works
  alone: the tier II to V talents of a path also work on the base forms.
- **T4.** The passive is Sword Heart 剑心 (kit): will marks, the strong cut, the thrown sword, the
  dash. The combo count is gone from the whole hero.

## 2. The grid

| Tier | Swift 疾 (机动) | Crescent 剑气 (站桩) | Will 意志 |
|---|---|---|---|
| I Style | **Piercing Step**: every skill takes its Swift form | **Sword Wave**: every skill takes its Crescent form, and every basic cut throws a 剑气 | **Resolve**: two will marks cast a special by themselves and are spent |
| II Power | **Keen Point**: hits he lands while passing through a foe deal 25% more | **Honed Wave**: every 剑气 and 剑风 deals 25% more | **Tempered Will**: the marks' bonuses are doubled and specials are 30% stronger |
| III Trick | **Flash Step**: the dash thrust hits twice as hard; a foe felled by a thrust readies the dash | **Returning Wave**: a 剑气 flies back from its far end and cuts again for half | **Lingering Will**: for 5 s after a cast, that skill's bonus stays on him at three times its size |
| IV Reach | **Long Stride**: thrusts, dashes and dash cuts go 25% farther | **Long Wave**: 剑气 fly 40% farther, 剑风 are 30% wider | **Wide Will**: specials are 25% wider, and the marks' bonuses also reach allies within 4 u |
| V Capstone | **Afterimage 残影**: each thrust or dash leaves an image that repeats it 0.6 s later for half | **Spirit Swords**: each cast calls a spirit sword (up to 3); they throw 剑气 with his strong cuts | **One Mind 万念归一**: every 6th cast, all four wills strike round him at once |

A mix reads like this: Piercing Step, Honed Wave, Lingering Will, Long Stride, Afterimage. Every
skill ends in a long thrust, an image repeats each thrust, the wave of his strong cut hits
harder, and the will of his last skill stays on him between casts.

## 3. Shared rules

- **T5. Will marks** (kit; they were the orbs). Each skill press stores the mark of its will. He
  holds two; a new one pushes out the oldest. One mark gives: 剑意 4% more damage, 不屈 4% less
  damage taken, 止水 1 health every 2 s in a fight, 狂热 basic attacks 5% faster. Fire skills
  give 剑意, earth 不屈, water 止水, wind 狂热. The three passives store none.
- **T6. The forms.** The table in section 5 gives each skill's Swift and Crescent form.
  - Standard thrust: 2.5 u along his aim, through every foe, 10 each.
  - Standard 剑气: a line 5 u along his aim, through every foe, for 70% of the hit that threw it.
  - Standard 剑风: a ring or fan that spreads to 3 u, for 50% of the hit that threw it.
  - "adds" keeps the base move and puts the new part after it. "changes" replaces the move.
  - A form is part of the cast: it stores no second mark and starts no second strong cut.
  - A form's added part carries the skill's own effect (burn, stun, slow, push) at half length.
- **T7. Swift and safety.** A Swift thrust is untouchable only where the base skill already was.
  It stops at a wall and never ends on a floor warning or a floor bed: he lands on the nearest
  clear spot. The dash cancels it like anything else.
- **T8. Crescent and standing.** A Crescent form never moves him, except in the six skills made
  from Kesh's videos and sketch (★), which keep every move. The dash is his escape.
- **T9. What counts as a 剑气 or 剑风** for Honed Wave, Returning Wave and Long Wave:
  - the five ranged skills: Flame Crescent, Triple Crescent, Ground Wave, Tide Crescent,
    Whirlwind Slash;
  - the floor crescent that opens Skyblade Waltz;
  - the wave of the strong cut, and the sword thrown by the sixth basic hit;
  - everything a Crescent form adds, Sword Wave's waves and the Spirit Swords' waves.
  - Not: the specials, Tide Ring's bursts, Skyblade Waltz's beams.
- **T10. What counts as passing through a foe** for Keen Point, Flash Step, Long Stride and
  Afterimage: the dash thrust; Fox Step, Moonfang and Thousand Cuts; the dashes inside Blazing
  Cascade and Skyblade Waltz; the low lunge of the basic combo under Piercing Step; and every
  thrust a Swift form adds.
- **T11. Resolve's rules.** When the second mark is stored, the special of the two fires by
  itself 0.3 s after that cast's last hit, and both marks are spent. Order does not matter. Two
  casts of the same will, or of the same skill, make the pure special. A special is not a cast:
  no mark, no strong cut, not counted by One Mind. It is his damage: it can crit and his damage
  talents raise it. It is done by a sword spirit, so it never stops his own hands.
- **T12. The ten specials.**

  | Special | Marks | What it does |
  |---|---|---|
  | **One Thought 一念** | 剑意 + 剑意 | One great cut along his aim, 6 u long, 1.5 u wide: 30 |
  | **Unmoved 不动** | 不屈 + 不屈 | He plants the sword: 12 within 2.5 u and a 0.5 s stun. For 3 s he takes 40% less and nothing pushes or stuns him |
  | **Clear Mirror 明镜** | 止水 + 止水 | A ripple round him, 3 u: 10 and a 40% slow for 3 s. He heals 12 and loses every slow or burn on him |
  | **Frenzy 狂澜** | 狂热 + 狂热 | Eight fast cuts round him in 1 s, 2 u: 3 each. Basic attacks 30% faster for 4 s |
  | **Counterblow 后发** | 剑意 + 不屈 | He guards 1 s. A hit in that time is blocked and answered: 28 along a 3 u line. With no hit the cut still comes, for 14 |
  | **Draw 居合** | 剑意 + 止水 | One calm draw-cut, 4 u: 20. He heals half of what it deals (15 at most) |
  | **Wild Dance 乱舞** | 剑意 + 狂热 | Ten cuts on the one foe nearest his aim within 3 u: 4 each |
  | **Still Mountain 静岳** | 不屈 + 止水 | For 3 s he heals 4 a second and takes 30% less. A foe that hits him is slowed 40% for 2 s |
  | **Last Stand 破釜** | 不屈 + 狂热 | A shock round him, 2.5 u: 12 and a 1 u push. For 4 s nothing slows or stuns him and basic attacks are 20% faster |
  | **Flowing Water 流水** | 止水 + 狂热 | A ribbon cut round him, 2.5 u: 10. The dash is ready at once and every skill loses 2 s of cooldown |

  - On a boss the kit's rule holds: a stun, slow or push it shrugs off is 20% more damage on
    that hit.

## 4. The fifteen talents

### Tier I, Style (free)

- **T13. Piercing Step (Swift).** Every skill he holds takes its Swift form.
  - The fifth hit of the basic combo, the low lunge, carries him through the foes in front and
    stops behind them. With no foe in reach it does not move him.
  - A dash pressed while the thrown sword is away takes him to the sword, cutting on the way.
  - The trade: his skills move him. A player who wants to stand picks another style.
- **T14. Sword Wave (Crescent).** Every skill he holds takes its Crescent form. Each of the
  first five basic hits throws a 剑气 5 u for 70% of the cut; a foe in reach is hit by the cut,
  not by both. The sixth hit, the sword throw, is as it is.
- **T15. Resolve (Will).** T11. The price is the two marks' small bonuses, spent with each
  special.

### Tier II, Power (20 Embers)

- **T16. Keen Point (Swift).** Every hit he lands while passing through a foe (T10) deals 25%
  more.
- **T17. Honed Wave (Crescent).** Every 剑气 and 剑风 (T9) deals 25% more.
- **T18. Tempered Will (Will).** One mark's bonus is doubled: 8% damage, 8% less damage taken,
  1 health a second, 10% faster. Specials deal 30% more and their boons are 30% larger.

### Tier III, Trick (40 Embers)

- **T19. Flash Step (Swift).** The dash thrust hits twice as hard (16). A foe felled by a hit of
  T10 readies the dash at once.
- **T20. Returning Wave (Crescent).** A 剑气 that reaches the end of its flight turns and flies
  back to him, cutting each foe again for half. The return carries damage only. A 剑风 does not
  return. The thrown sword cuts for half on its way back to his paw.
- **T21. Lingering Will (Will).** For 5 s after a skill press, that skill's will stays on him at
  three times one mark (12% damage, 12% less damage taken, 3 health every 2 s, or 15% faster),
  even after Resolve has spent the mark. A new cast replaces it. Tempered Will does not double
  it.

### Tier IV, Reach (60 Embers)

- **T22. Long Stride (Swift).** Everything in T10 goes 25% farther: the dash, Fox Step 2.5 u,
  Moonfang 4 u, a standard thrust 3.1 u, Thousand Cuts finds foes within 3.75 u.
- **T23. Long Wave (Crescent).** 剑气 fly 40% farther and are 30% wider; 剑风 spread 30% wider.
  The thrown sword flies 5.6 u and its burst is 30% wider.
- **T24. Wide Will (Will).** The areas and lines of the specials are 25% larger. The plain
  bonus of each mark he holds also reaches allies within 4 u.

### Tier V, Capstone (80 Embers)

- **T25. Afterimage 残影 (Swift).** Each dash, dash cut or thrust (T10) leaves an image of him
  where it began. 0.6 s later the image repeats the move along the same line for half. One
  image for each skill cast and one for each dash. A repeat is not a cast and does not move him.
- **T26. Spirit Swords (Crescent).** Each skill press calls a spirit sword that floats at his
  shoulder for 8 s, up to 3. On each strong cut (the cut after a cast, and the sword throw)
  each sword throws a 剑气 for 4.
- **T27. One Mind 万念归一 (Will).** Every 6th skill press, four sword spirits strike round him
  at once, radius 3 u: 24, and for 4 s he has all four wills at the size of Lingering Will. It
  spends no mark and is not a cast.

## 5. Every skill under the styles

★ marks the six skills made from Kesh's videos and sketch. The three passives (Crimson Edge,
Cold Edge, Razor Wake) have no move and so no form. The motion of each form is in
`ASHFANG_MOTIONS.md`.

| # | Skill | Base | Swift form | Crescent form |
|---|---|---|---|---|
| | **剑意 Intent (fire)** | | | |
| F1 | Flurry | four fast cuts in front | changes: four step-thrusts, each 0.6 u forward through the foes | adds: each cut throws a thin 剑气 4 u |
| F2 | Crescent Finisher | one rising cut | changes: he dashes 2.5 u through the foes and ends in the rising cut | adds: the cut throws a tall 剑气 |
| F3 | Flame Crescent | a burning wave 6 u | changes: he is the wave: a burning thrust 4 u | adds: the wave is twice as wide and bursts at its end, 1.5 u |
| F4 | Blazing Cascade ★ | sweeps, slam, swirl, dash | adds: after the last dash he dashes back through the pack, 8 | adds: the flame in his paw is also thrown as a 剑气 6 u |
| F5 | Flashfire | every foe within 4 u catches fire | changes: he thrusts 3 u; the foes he passes catch fire, burning ones burst | adds: the fire goes out as a 剑风 to 6 u |
| F6 | Triple Crescent | three great waves | changes: three thrusts of 3.5 u, turning between them | adds: each wave bursts at its end, 1.5 u for 8 |
| | **不屈 Unbowed (earth)** | | | |
| F7 | Lunge Strike | a thrust, reach 1.3 u | changes: the thrust carries him 3 u and hits every foe on the line | adds: the point shoots a thin 剑气 6 u |
| F8 | Ground Wave | a crack runs 5 u | changes: he runs 4 u along the crack with the blade in the floor | changes: three cracks fan out |
| F9 | Earthsplitter ★ | charged slam | adds: on release he leaps up to 3 u to his aim, then slams | adds: the slam sends a line of rock spikes 5 u |
| F10 | Inkstone Dive ★ | rising cut, X, leap, dive | adds: the dive reaches 4 u, not 2 | adds: the landing sends a 剑风 to 3.5 u |
| F11 | Caltrops | a thrown patch | changes: he dashes 3 u and drops them along his path | adds: thrown to 5 u, patch radius 1.2 u |
| F12 | Riposte | a parry and a backhand | changes: on a catch he flashes through the attacker and cuts from behind | adds: the answer is thrown as a 剑气 6 u |
| | **止水 Still Water (water)** | | | |
| F13 | Moonfang | a dash cut 3.2 u | adds: he dashes back along the same line for half | changes: he stays and throws a moon 剑气 6 u with the same mark and slow |
| F14 | Riptide Form ★ | arc, leap stab, rising cut, low sweep | adds: the leap goes 3 u, and the low sweep slides 2 u through the foes | adds: the low sweep throws a wide 剑风 to 4 u |
| F15 | Tide Crescent | a wide wave and a hop | adds: the hop is 3 u and cuts the foes he passes, 8 | changes: no hop; the wave is 4 u wide and flies 6 u |
| F16 | Tide Ring ★ | seven images thrust across a ring, then 剑花 | adds: after the seventh image he thrusts across the ring himself | adds: each image's thrust flies on 3 u past the ring as a 剑气 |
| F17 | Mirror Image | he leaves a water image | changes: he dashes 3 u away as the image appears | adds: the image throws a 剑气 at the nearest foe each second, 6 |
| | **狂热 Fervour (wind)** | | | |
| F18 | Fox Step | a dash cut 2 u | adds: a second press within 2 s dashes again | changes: he stays; a gust runs 4 u along the floor and throws the foes up |
| F19 | Blade Storm | a spin round him | changes: the spin travels 3 u through the foes | adds: the spin throws a 剑风 ring |
| F20 | Skyblade Waltz ★ | crescent, cut, dash, spin, blades, beams | adds: he dashes once more, to where the beams fall, 8 | adds: the flat cut and the rising cut each throw a 剑气; five beams, not three |
| F21 | Blade Dance | a burst round him | changes: he dashes 2.5 u and bursts where he arrives | adds: the burst is a 剑风 to 3 u |
| F22 | Whirlwind Slash | a whirl travels 4 u | changes: he rides inside the whirl | adds: the whirl is half again as wide and stays 1 s where it ends |
| F23 | Thousand Cuts | a blur: eight cuts from foe to foe | adds: he ends where he aims, up to 4 u from the last foe, with one more cut through the pack | changes: he stands and sheathes while eight images of him do the cuts; then a 剑风 ring |

- **T28. The basic attack and the dash under the styles.** Base: the six hits and the dash as
  on his page. Swift: T13. Crescent: T14. Will: no change.

## 6. Combos checked

- **T29.**
  1. Piercing Step with the Crescent talents: the base ranged skills and the strong cut's wave
     still take Honed, Returning and Long Wave. Under Swift a ranged skill that "changes" is a
     thrust, so it is no longer a 剑气.
  2. Sword Wave with the Swift talents: Keen Point, Flash Step, Long Stride and Afterimage still
     work on the dash and on the dash cuts that the base forms keep (the ★ skills).
  3. Afterimage with Piercing Step: one image for each cast, so a skill with two thrusts repeats
     only the last. To measure.
  4. Keen Point with Afterimage: the image's repeat is a hit of T10 and gets the 25%.
  5. Flash Step in a pack of weak foes: every thrust that fells a foe readies the dash. The dash
     is untouchable, the thrusts are not (T7), so it is not endless safety.
  6. Resolve with One Mind: on the 6th cast both fire, the special first.
  7. Tempered Will without Resolve: two 剑意 marks are 16% damage for as long as he casts fire
     skills. With Lingering Will, 28% for 5 s. Inside the budget (T30), and to measure.
  8. Resolve with three passives held: his one pressed skill makes its own pure special every
     second cast. Never dead.
  9. Wide Will in a party: Mosslight and Stonehide get 4% bonuses from him. Small on purpose.
  10. Unmoved, Counterblow and Still Mountain give him the only damage cuts he has besides
      Riposte and Mirror Image. None is a shield.
  11. Returning Wave with the three cracks of Ground Wave's Crescent form: each crack runs back.
  12. Mirror Image's water image copies his base ranged skills (kit, C6), not what a form adds.
  13. A Swift thrust through his own Mirror Image bursts it (kit, C7).
  14. Riposte's Swift form on a boss: he flashes behind it; the boss is not moved.
  15. Tide Ring under Swift: his own thrust across the ring ends the skill, so he may dash out
      early and lose only that last thrust.

## 7. Budget, look and AI

- **T30. Budget.** Tier I is about 20% more output in its style: a thrust of 10 on each cast, a
  剑气 at 70% of each basic cut, or one special every two casts. One whole path is about 50%.
  The strongest mix must stay under 70%.
- **T31. Look.** Swift: a Fox Crimson streak with a Moon Silver edge on every thrust; the
  Afterimage is a still silver outline. Crescent: 剑气 and 剑风 take the colour of the skill's
  family (gold, ochre, aqua, silver). Will: the two marks float over his empty left paw as
  small characters (剑, 屈, 水, 热) in the family colours; a special's spirit is his outline in
  the colours of its two marks. No Ember, no Violet; effects dim and readable.
- **T32. Sound.** A thrust: a short whistle and a ring. A 剑气: a clean rising note. A mark: a
  soft chime. A special: one low bell, then the cut.
- **T33. AI seat.** Swift: he never thrusts onto a floor warning, never through a boss's
  wind-up, and keeps the dash for escapes. Crescent: he stands 4 to 5 u from the nearest foe
  and casts along the longest line of foes. Will: he casts as today; the specials need no
  choice.

## 8. The record

- **T34. Kesh's picks, 2026-11-18 01:30 Singapore time:** "1a, 2a, 3 your choice".
  - R1 a: skills keep their looks and effects; the four elements are the four wills.
  - R2 a: the combo count is gone from the whole hero.
  - R3 a (my pick, as he left it to me): Thousand Cuts is back in Gale Crescent's place. The
    pool is 12 close, 5 ranged, 9 arts.
- **T35. Kept from 1.7:** Sword Wave, Honed Wave, Returning Wave, Long Wave, Spirit Swords,
  Flash Step (without the count).
- **T36. Renamed, same job:** Fusion is Resolve, Tempered is Tempered Will, Enchanted Edge is
  Lingering Will, Wide Elements is Wide Will, Cataclysm is One Mind.
- **T37. Gone with the count:** Crescendo, Keen Rhythm, Wide Arc, Storm of Blades. The ten
  element mixes (Blaze to Frost) gave way to the ten specials.
- **T38. New:** Piercing Step, Keen Point, Long Stride, Afterimage, and the forms.
- **T39. Kept whole, though he gave leave to redo them:** his six ★ skills, the six-hit basic
  combo with the sword throw, and the dash. They are his own refs and already fit.
- **T40. Open, for the laptop:** every number here; how much the Swift forms move the camera;
  whether 0.3 s is the right wait before a special.
