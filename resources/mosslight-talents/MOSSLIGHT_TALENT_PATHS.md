# Mosslight: talent paths

**Version 3.7, 2026-11-18.** (3.7: Kesh, 16:12 Singapore time, in the page thread: seeds from
Scatter Seeds take double from watering (L17), and the Snapjaw marks its target and drags it in
(L22). 3.6: Kesh, 14:28 Singapore time, in the page thread, eight changes.
Two are re-designs of mine: Swiftleaf (L1, three leaves) and the Petal Twister, a wind skill in
Pollen Mark's place (L25). Six are his rules, sized by the page thread: Elder Oak (L12), Pollen
Gust (L5), Wispfall (L19), Firefly Swarm (L8), Creeping Moss (L14), and Dew Wave with the Rain
Cloud (L3, L13). 3.5: Kesh, 12:05 Singapore time: "no Rootweb, re-design one to
replace it". Row L15 is now the Lure Lily. 3.4: Kesh, 11:30 Singapore time, in the page thread: the Forest
Spirit and Sapping Vine are removed and re-designed, and the Mending Sapling grows in levels. The
Rootweb (L15) and the Snapjaw (L22) take the two places; the pool stays 26. Row L10 has his sapling
rule. 3.3: Kesh, 09:25 Singapore time, in the page thread, four parts
changed: Seed Bolt hops out 2 seeds when it ends, Firefly Swarm's stung foes take more damage
(减防), the Elder Oak's roots hold a foe that stays under it, Dewfall speeds allies' attacks. Rows
L2, L8, L9 and L12; the sizes are the page thread's picks. 3.2: Kesh, 08:18 to 08:23 Singapore time, in the page thread, new
seed rules: a seed waits 5 s for a hurt ally, then always flowers as a Spitter for 5 s; the turret
bursts 2 seeds, not 3; every seed is burst out on a low arc, never dropped at a hero's feet. His
style reactions: a seed's heal gives a Ring, Evergreen lengthens the seed and the flower, Harvest
stores the flower's damage. Rows L17 and L29, T7 and T12 follow.) The re-think, with Kesh's picks. Kesh, 02:06 Singapore time: low
cooldowns and heal over time are already what the druid class is, so they are not talent styles any
more. His three styles:

1. **Pure heal.** Each heal gives a stack: more maximum health and more healing received. Big 容错.
2. **Prolong.** Buffs, debuffs and crowd control last longer. A mix of healer and DPS.
3. **As now.** The staff turret, seed turrets and wisp fire deal damage; a share is stored and heals
   allies she stands near.

And: every skill is reworked to react to all three (his Pollen Gust example), with full rights to
redesign anything, the basic attack and the dash too.

**His picks, 02:19 Singapore time: "1b, 2a, 3a, 4a"** (section 8). 1b changed the design: every
skill now always has a heal part, a lasting part and a damage part, with no talent at all. The
style layers of 3.0 are gone; their best lines became those parts.

Design only. Nothing here is in the game; the feature freeze holds. Lines are numbered T1 to T32
(talents) and L1 to L29 (skills). All numbers are first guesses. The shared template is the repo's
`docs/TALENTS.md`. The 2.3 text is kept as `MOSSLIGHT_TALENT_PATHS_2.3.md`. The kit changes for the
page thread are in `MOSSLIGHT_KIT_2.0_CHANGES.md`.

---

## 1. How it works

- **T1.** One pool of 26 skills. Since kit 2.0 every skill has **three parts**, always on, with or
  without talents: a **heal**, something that **lasts**, and **damage** (section 5).
- **T2.** Each style feeds on one part of every skill:
  - **Heartwood 年轮 (pure heal):** every heal adds a Ring.
  - **Evergreen 常青 (prolong):** everything that lasts, lasts longer.
  - **Harvest 丰收 (damage to healing):** her damage fills the gem.
- **T3.** One pick per tier from any path. Every talent works alone, and since every skill has all
  three parts, no skill is ever a dead draft for a style.
- **T4.** The class keeps short cooldowns and Moss by itself. No talent shortens a cooldown or turns
  a heal into Moss any more.
- **T5.** Kept as passed: no shields, the wisp relic, Sower's free seeds, the garden rules and the
  combos (kit S49, S54, S68; seven of the eleven are left, with F, J, P and Y new).

## 2. The grid

| Tier | Heartwood 年轮: pure heal | Evergreen 常青: prolong | Harvest 丰收: damage to healing |
|---|---|---|---|
| I Style | **Growth Rings**: each heal gives the ally a Ring: +2% maximum health and +2% healing taken, up to 10 | **Long Season**: everything of hers that lasts, lasts 30% longer | **Reap**: 30% of her damage is stored as Sap; the gem pours it into hurt allies near her |
| II Power | **Bark**: an ally she heals takes 10% less damage for 4 s | **Deep Roots**: every heal leaves 20% more as Moss, every hit 20% more as thorns, over 4 s | **Rich Sap**: 10% of her damage is stored as Sap |
| III Trick | **Twin Buds**: each heal skill holds 2 charges | **Tend**: her basic attack lengthens her debuffs on the foe; her heals lengthen her buffs on the ally | **Rooted Staff**: the planted staff stores Sap from its own bolts and pours to allies near it |
| IV Reach | **Old Growth**: every ally always keeps 3 Rings; Rings last 4 s longer | **Wide Canopy**: all her areas are 20% wider | **Deep Gem**: the gem holds 30 more, pours 0.6 u farther, starts each room with 15 Sap |
| V Capstone | **Last Leaf**: once a room, an ally who would fall stays at 1 health and regrows 30% | **Perennial**: a lasting effect that runs out comes back once at half length | **Bounty**: each foe felled stores 3 Sap; a poured ally deals 10% more damage |

A mix reads like this: Growth Rings, Deep Roots, Rooted Staff, Wide Canopy, Last Leaf. Every heal
stacks Rings and leaves Moss behind, the planted staff heals whoever stands by it, her circles are
wide, and once a room someone is caught before they fall.

## 3. Shared rules

- **T6. Rings 年轮 (Heartwood).**
  - Any heal of hers on an ally adds 1 Ring, at most 1 a second for each ally. Up to 10.
  - Each Ring: +2% maximum health and +2% healing taken from everything.
  - Rings last 8 s after her last heal on that ally, then fall off one a second.
  - A Ring raises the maximum only; the heal that brought it fills the room. Losing Rings trims
    health above the new maximum and can never down anyone. It is not a shield.
  - She gets Rings from heals on herself. Rings add to sweetened's 30%; nothing
    multiplies.
- **T7. What lasts (Evergreen; Kesh's pick 2a: zones and plants too).** Long Season, Tend and
  Perennial count:
  - Moss and every other heal over time;
  - her buffs on allies: haste, sweetened, Bark, Rings, Inspired;
  - her debuffs on foes: slow, exposed, dusted, thorns and every other damage over time;
  - her holds: held in place, asleep, tossed (a boss still shrugs these off);
  - her zones and plants: Dewfall, the cloud, the oak, the wall, the sapling, Spitters, the
    Oakling, a Puffcap's cloud, the swarm's stops, the Petal Twister, the Lure Lily, the Snapjaw
    (not Wispfall since 3.6: it is a channel with Kesh's 15 s);
  - seeds (3.2, Kesh): the 5 s a seed waits to be picked up, and the 5 s its flower lives.
  - Not: cooldowns, the planted staff's 5 s (Kesh's number).
  - It adds to a Linger node and to a watering.
- **T8. Sap (Harvest).** As passed (2.3, T17): the gem holds 50 and pours 8 every 0.5 s into the
  most hurt ally within 1.8 u. A pour is instant, never crits and never heals her.
- **T9. Three small parts the skills reuse.**
  - **Blossom**: a heal of 5 that flies to the most hurt ally within 6 u.
  - **Sprig**: Moss, 3 a second for 4 s.
  - **Thorns**: damage over time on a foe, 3 a second for 4 s; one from each skill.
- **T10. Heal skills** (for Twin Buds): the fourteen whose main part is a heal (2.3, T16).

## 4. The fifteen talents

### Tier I, Style (free)

- **T11. Growth Rings (Heartwood).** T6.
- **T12. Long Season (Evergreen).** Everything in T7 lasts 30% longer: Moss 6 s is 7.8 s, sleep 3 s
  is 3.9 s, a seed waits 6.5 s and its Spitter lives 6.5 s.
- **T13. Reap (Harvest).** 30% of the damage she deals is stored as Sap. It counts every damage
  part in section 5, her helpers included.

### Tier II, Power (20 Embers)

- **T14. Bark (Heartwood).** An ally takes 10% less damage for 4 s after any heal of hers. As
  passed.
- **T15. Deep Roots (Evergreen).** Every heal from a skill leaves 20% of itself again as Moss over
  4 s. Every hit from a skill leaves 20% of itself again as thorns over 4 s.
- **T16. Rich Sap (Harvest).** As passed.

### Tier III, Trick (40 Embers)

- **T17. Twin Buds (Heartwood).** Each heal skill holds 2 charges. As passed.
- **T18. Tend (Evergreen).** Each bolt of her basic attack, the turret's too, adds 0.5 s to every
  debuff of hers on the foe it hits. Each heal of hers adds 1 s to every buff of hers on that ally.
  An effect can grow to double its first length. Holds are not lengthened this way.
- **T19. Rooted Staff (Harvest).** As passed.

### Tier IV, Reach (60 Embers)

- **T20. Old Growth (Heartwood).** Every ally always has at least 3 Rings (+6% maximum health, +6%
  healing taken), in every room, with or without Growth Rings. Rings last 12 s, not 8.
- **T21. Wide Canopy (Evergreen).** Every area of hers is 20% wider: heal, hold and damage alike.
- **T22. Deep Gem (Harvest).** As passed.

### Tier V, Capstone (80 Embers)

- **T23. Last Leaf (Heartwood; Kesh's pick 3a).** Once a room, the first ally (or she) who would be
  downed stays at 1 health. Roots catch them, nothing can hurt them for 1 s, and they regrow 30% of
  their maximum health over 3 s.
- **T24. Perennial (Evergreen).** When something in T7 runs its full time, it comes back once at
  half length: the Moss regrows, the roots clench again, a Spitter sprouts again. Something ended
  early (a sleeper hit awake, a plant replaced) does not come back. Not the planted staff.
- **T25. Bounty (Harvest).** As passed.

## 5. The three parts of every skill (kit 2.0)

Always on, with no talent. **＋ marks a part that is new**; the rest is kit 1.11 as passed, in
short. The new parts are small on purpose: the skill's old job stays its main job.

| # | Skill | Heal (Heartwood) | Lasts (Evergreen) | Damage (Harvest) |
|---|---|---|---|---|
| | **Quick heals** | | | |
| L1 | Swiftleaf (re-designed, 3.6) | three leaves meet on one ally: 5 each, 15; then one flies on to the next ally, 7 | one stays and circles the ally as a sprig | each leaf cuts foes on its curve, 3; the meeting cuts foes within 1.5 u, 5; one leaf cuts its way home, 6 |
| L2 | Seed Bolt | heals the first ally 22; ＋ when it ends, on an ally or a miss, 2 seeds hop out | ＋ foes it flies through are tangled: 30% slow, 2 s | ＋ it pierces: 10 to each foe it flies through |
| L3 | Dew Wave | a lane heals up to 4 allies 12 | waters plants and Moss at double strength (Kesh, 3.6); ＋ the lane stays wet 3 s: 3 a second | ＋ foes in the lane take 10 |
| L4 | Heartbloom | the bloom heals 12 round the ally | the bud's Moss, 16 in 4 s | ＋ the bloom throws petal blades: 14 to foes within 3 u |
| L5 | Pollen Gust | the wind heals allies 10 | allies run 30% faster 3 s; ＋ foes it pushes are dusted 6 s (Kesh, 3.6; no slow) | a slight push, 0.8 u (Kesh, 3.6); ＋ it hits for 12, and a foe blown into a wall or a foe takes 10 more |
| L6 | Nectar Burst | heals 10 within 2 u | sweetened 5 s (30% more healing); foes slowed 2 s | ＋ three wisps dive into the burst, 6 each |
| | **Lasting heals** | | | |
| L7 | Mossgrowth | Moss, 5 a second | for 6 s; ＋ 15% haste while the Moss is on | ＋ thorn moss: a foe that hits the ally takes 6 (once a second) |
| L8 | Firefly Swarm | ally stops heal 5 a second | 3 s a stop, 4 stops; ＋ an ally it stops on deals 15% more damage for the stop (Kesh, 3.6); ＋ stung foes are exposed (减防): they take 20% more damage | foe stops sting 5 a second |
| L9 | Dewfall | a circle heals 7 a second | for 5 s; ＋ allies inside attack 30% faster; ＋ the heal clings 2 s after stepping out | ＋ the flower bed shoots a thorn a second at the nearest foe within 4 u, 5 |
| L10 | Mending Sapling | a blossom every 2 s: 8, then 11 at level 2, 14 at level 3 | it lives 8 s; on cast it absorbs up to 5 seeds within 3 u, 2 s more each, and 3 or more unlock level 3; ＋ its roots slow foes within 2 u by 25% | ＋ it shoots a thorn of 6 with each blossom |
| L11 | Glade Wisps (passive) | a wisp every 2.5 s heals 10 | ＋ a wisp leaves a sprig | ＋ wisp fire: with 3 waiting and nobody hurt, the oldest dives on a foe within 4 u, 8 |
| L12 | Elder Oak | the crown heals 6 a second | for 8 s; ＋ a foe that stays 2 s under the crown is held by roots 1 s, then its count starts again; ＋ allies under it deal 20% more damage (Kesh, 3.6; no slow) | ＋ acorns fall: one a second on a foe under the crown, 8 |
| L13 | Rain Cloud | follows an ally, heals 5 a second | for 6 s; it waters at double strength (Kesh, 3.6); ＋ foes under it are slowed 20% | ＋ heavy rain: foes under it take 3 a second |
| L14 | Creeping Moss | Moss, 4 a second; ＋ a hit on an ally who carries it is split evenly among all who carry it (Kesh, 3.6) | for 6 s; it creeps from ally to ally | ＋ each creep also chokes the nearest foe within 3 u: 3 a second for 6 s; ＋ 30% of a hit on a choked foe also lands on each other choked foe (Kesh, 3.6) |
| L15 | Lure Lily 诱香花 (new skill) | its scent heals allies within 4 u for 4 a second | it stands 6 s; foes within 4 u are lured to attack the flower for 3 s | when it closes it bursts: 20 to foes within 2.5 u |
| L16 | Leaf Gale | a stopped shot becomes a healing leaf, 5 | the wall stands 4 s; ＋ allies who cross it run 20% faster 3 s, foes are slowed 30% 2 s | ＋ each stopped shot also flies back at its shooter, 8 |
| | **Damage** | | | |
| L17 | Scatter Seeds | a hurt ally who walks on a seed picks it up: 11 | a seed waits 5 s, then flowers as a Spitter for 5 s; ＋ its seeds take double from watering (Kesh, 3.7) | Spitters shoot 4 a second |
| L18 | Rootspear | ＋ each foe hit sends a blossom, up to 4 | ＋ the roots leave thorns | a row of roots, 28 |
| L19 | Wispfall (a channel, Kesh, 3.6) | ＋ a healing wisp falls on the most hurt ally each second: 6, each 10% more than the last, up to 12 | she channels up to 15 s (cooldown 30 s); a hold on her, a step, a cast, a basic attack or a dash ends it; ＋ a dive slows 20% for 1.5 s | the dives: 7, each 10% more than the last, up to 14 |
| L20 | Rootsnare | ＋ allies in the circle heal 4 a second | the roots drag and slow 3 s, then hold 0.8 s | 5 a second, then the clench, 12 |
| L21 | Puffcap | ＋ allies in the cloud heal 4 a second | the cloud stays 4 s; foes in it take 20% more | 5 a second |
| L22 | Snapjaw 捕蝇草 (new skill) | after each bite it spits a fruit to the most hurt ally, 6 | the flytrap lives 10 s; it marks its next foe with a bite mark, drags the bitten foe to itself and holds it 1.2 s (Kesh, 3.7) | it bites the nearest foe within 2 u every 2.5 s, 14 |
| L23 | Oakling | ＋ the ally it guards heals 3 a second | it lives 10 s; its slam slows 30% | slams of 9 |
| L24 | Wild Thicket | ＋ fruit falls: allies in the circle heal 20 | a 1 s toss; plants work 50% faster 5 s | 30 |
| L25 | Petal Twister 花旋风 (new skill, 3.6) | petals heal allies inside it 4 a second; a hero's hit on a dusted foe heals them 3 | the twister roams 5 s toward foes; foes it touches are dusted 6 s | its petals cut foes inside, 4 a second |
| L26 | Drowsy Spores | ＋ allies in the puff rest: heal 12, slows end | sleep 3 s; woken early, the foe takes 20% more for 4 s | ＋ nightmares: sleepers take 4 a second, and it does not wake them |
| | **Always hers** | | | |
| L27 | Basic attack | ＋ the planted gem sends a mote of 3 a second to the most hurt ally within 4 u | ＋ her two bolts leave thorns (2 a second, 3 s) | two bolts, then the gem turret |
| L28 | Dash | heals her 5% on landing; ＋ allies within 2 u of the landing heal 5 | ＋ she runs 20% faster for 2 s after it | ＋ thorn burst: 6 to foes she dashes through |
| L29 | Seeds (Sower) | a hurt ally who walks on a seed picks it up: 11 | a seed waits 5 s, then always flowers as a Spitter for 5 s | a Spitter shoots 4 a second |

Kesh's example, L5 Pollen Gust: its heal gives Rings (Heartwood), its haste and its dust last
longer (Evergreen), its hit and its wall slam fill the gem (Harvest).

Small rules behind the table:

- A new heal part is a heal of hers: it gives Rings, Bark and seeds' rules as any heal does.
- Thorns: one from each skill on a foe; a new cast restarts it.
- L11: a wisp dives only while 3 wait and nobody is hurt, so healing always comes first. A wisp
  still becomes a seed at 10 s when no foe is in reach.
- L16: the wall's 8 leaves are also its 8 blades; later shots are stopped with neither.
- L26: nightmares are the one thing that does not count as a hit on a sleeper.
- Slows do not add: the strongest one counts, as in the game today.
- 3.7 (Kesh; sizes by the page thread, v37): a watered Scatter Seeds seed, and the Spitter it
  becomes, gets 6 s more and is faster for 6 s; this stacks with the doubled watering of Dew
  Wave and the Rain Cloud. The Snapjaw shows a ring of teeth on the foe it will bite next, and
  a bitten foe is dragged to 0.75 u from it before the hold. A boss is not dragged. The
  new-part count is 46.
- 3.6 (Kesh): the sizes of his six rules are the page thread's picks, as built on the page
  (K21 of the changes file). L1 and L25 are whole new skills (kit S10, S73), so they carry no ＋. With his five
  new parts (L5, L8, L12 and two on L14) the new-part count is 45. **Dusted** is now a shared status (kit S74): 6 s; a hero's hit on a dusted foe
  heals that hero 3; a helper's hit heals the most hurt ally 1; a dusted foe that falls leaves a
  seed. Pollen Gust and the Petal Twister both apply it. The pollen burst went with Pollen Mark.
- 3.4 (Kesh): L10, the sapling reaches level 2 at 3 s and level 3 at 6 s; level 3 needs 3 or more
  seeds absorbed. L15 and L22 are whole new skills (kit S70, S71), so they carry no ＋.
- 3.3 (Kesh): L8's 20% is the kit's exposed, so a stung foe is weakened for Rootspear, and it
  took the place of the 20% slow. L12: a boss is only slowed, never held. L9: the attack speed
  is for allies standing inside; only the heal clings.
- Seeds (3.2, Kesh): a picked-up seed's heal gives a Ring; Long Season lengthens the wait and the
  flower; a flower's damage is stored as Sap. The turret bursts 2 seeds; the pouch seed every 8 s
  stays. Every seed flies out on a low arc and never lands at a hero's feet. Skills still wake
  or use a seed at once (kit S56). At most 4 Spitters, as before.

## 6. Combos checked

- **T26.**
  1. Rings alone are +20% maximum health at 10. Old Growth sets a floor of 3 Rings, not a higher
     top. (The Forest Spirit's 10% is gone with it, 3.4.)
  2. Rings with sweetened: +20% and +30% add to +50% healing taken, not ×1.56.
  3. Rings and the wisp relic: the wisp stores 20% of a bigger maximum. Meant.
  4. Every skill heals now, so Rings come fast. The limit of one Ring a second for each ally
     bounds it: 10 Rings take 10 s.
  5. Long Season with Linger and watering: all add (Moss 6 s is 10.8 s with all three).
  6. Long Season on a boss: holds and slows still do nothing; exposed, dusted and thorns do.
  7. Tend with the turret: 0.5 s a bolt fills a debuff to double in about 2 s. The cap bounds it.
  8. Perennial with holds: a full sleep returns as 1.5 s, a clench as 0.4 s. To measure.
  9. Perennial with plants: a returned Spitter still counts toward the cap of 4.
  10. Deep Roots without Long Season: Moss and thorns of 20%, 4 s. With it, 5.2 s and 26%.
  11. Bark under Long Season lasts 5.2 s; under Tend each heal keeps it up. Still 10%, no stack.
  12. Last Leaf and Rings: the 30% is healing, so Rings and sweetened raise it.
  13. Every skill hurts now, so the gem fills faster under Reap. The lever is Reap's 30%.
  14. Thorns and sleepers: thorns count as one hit a second, so her own bolts can wake a pack.
      Meant: it is the "wake them exposed" choice.
  15. Mossgrowth's thorn moss (L7) is Briar Coat come back as a part; it costs no slot.
  16. With no talent she is stronger than in kit 1.11: every skill gained one or two small
      parts. The first thing to measure; the lever is the size of the ＋ parts.
  17. Dusted comes from two skills now (3.6). One status, one 6 s, no stacking; a new dusting
      only starts the time again. The heal limit of twice a second for each hero holds.
  18. Dusted foes that fall leave seeds (A11), and the gust dusts whole packs. The room limit
      of one seed every 1.5 s bounds it.
  19. The Petal Twister under Long Season lives 6.5 s and its dust 7.8 s. Under Wide Canopy it
      is 2.64 u. Perennial brings it back for 2.5 s where it ended.
  20. Swiftleaf's damage: a foe on all three curves, at the meeting and on the way home takes
      20 from one cast. Most take 3 to 8. To measure; the lever is the 3 a curve.
  21. Swiftleaf under Twin Buds: two casts in a row put six leaves in the air. Meant.
  22. Creeping Moss's shared damage (Kesh) moves damage, it prevents none: it is not a shield.

## 7. Budget, look, AI

- **T27. Budget.** Tier I is about +20% in its style: +20% healing taken at 10 Rings, 30% longer
  effects, or 30% of damage as healing. One path about +50%; no mix above +70%.
- **T28. Look.**
  - Heartwood: one thin ring of light on the floor round the ally's feet for each Ring, like a cut
    tree; at 10 a small crown of leaves. Last Leaf: roots catch the ally and one leaf hangs above.
  - Evergreen: ivy grows over what lasts. Perennial: the effect withers brown, then greens again.
  - Harvest: as passed (motes to the gem, the pour).
  - The new parts: heals are Bright Heal blossoms, fruit and motes; damage is thorns, acorns and
    petal blades in her dark green, and wisp fire in Wispfall's white-gold. No Ember, no Violet.
    Glows dim.
- **T29. Sound.** A Ring: a soft wooden knock, rising in pitch to 10. A return (Perennial): the
  effect's own sound, softer. Last Leaf: one low chime.
- **T30. AI seat.** It casts as today; the new parts need no aim of their own. Evergreen: keep
  swinging under Tend. Harvest: as passed (walk to pour, leave the staff by the hurt ally).

## 8. The picks, closed

**Kesh, 2026-11-18 02:19 Singapore time: "1b, 2a, 3a, 4a".**

1. **Base skills: b.** Every skill always has all three parts, heal, lasting and damage, with no
   talent (section 5). (Not picked: skills as passed, with a layer added by the style.)
2. **Evergreen's reach: a.** It lengthens zones and plants too (T7).
3. **Last Leaf: a.** Kept (T23).
4. **Names: a.** Heartwood 年轮, Evergreen 常青, Harvest 丰收.

## 9. The record

- **T31. From 2.3.** Kept: Reap, Rich Sap, Rooted Staff, Deep Gem, Bounty (all Harvest); Bark and
  Twin Buds (now Heartwood); Wide Canopy (now every area); Deep Roots (now hits too). The name
  Perennial has a new rule. Gone: Quick Sprout, Spring Rain, Long Reach, Second Flush, Regrowth,
  and the old Perennial (1% a second).
- **T32. Guessed by me:** every number; which part each skill gained and its size; one Ring a
  second; that the planted staff keeps Kesh's 5 s under Evergreen. Kesh's own parts since
  (3.3): the Elder Oak's hold is his, so "no new hold" has that one exception. From 3.0 I dropped the lines
  that only made an old part bigger, and every new hold (they are slows or thorns now), so that a
  no-talent kit does not grow too far.
