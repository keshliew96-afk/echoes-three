# Mosslight's talents: three paths, mix and match, and the template for every hero

**Version 2.3, 2026-11-17.** Design only. Nothing here is in the game. The feature freeze still holds,
so the first build is the ability thread's review-only build and its review page. Every line has a
number (T1 to T54) so Kesh can answer with numbers, for example "T21 change to 40%, T43 b".

**What changed in version 2.3.** Kit 1.8 and 1.9 (Kesh, 2026-11-17 11:34 and 11:55 Singapore time): the
Bramble Hedge is cut and eight skills are new (Compost and Briar Coat came and went within the hour;
Wind Wall is now Leaf Gale; the pool is 26). T16, T21, T28, T29 and section 7 name them; no talent changed. The new
skills under the talents are in the kit doc, section 7, line "1.8".

**What changed in version 2.2.** Kesh, 2026-11-17 07:17 Singapore time, to the list of open choices:
"Checked follow your pick will do". So T42 to T53 are closed with my picks (section 9), and the three
points where kit 1.7 touches the talents are settled as T54 (K1 to K3). Two picks change the text:
T43 b (Quick Sprout also makes her heals 15% smaller) and T50 b (the Daily wears the tier I pick
only). The doc now names the kit 1.7 skills (`MOSSLIGHT_SKILL_KIT.md`, passed by Kesh on 17 Nov);
the skill table moved to that doc's section 7. **Ruling A24: Kesh, 2026-11-17 07:47 Singapore time, "Yes"**:
talents are in the game's scope and are built after the freeze lifts (section 10). With that, this
design is finished: nothing in it waits for a pick.

**What changed in version 2.1.** Kesh (2026-11-16 03:48 UTC): Mosslight has no shield skills at all,
because shields go to another hero; her class relic Mercy Bell changes to a nature wisp (overheal summons a
wisp that circles the healed ally and stores the overheal; when that ally takes damage, the wisp heals
them). So Overgrowth (T32, overheal to shield) is replaced by Perennial, Kindred Shield leaves her heal
skills (ten now), and the Bulwark node is greyed on her skills. Line numbers are unchanged.

**What changed from version 1.** Kesh added (2026-11-16 02:32 UTC): a path is not a lock. Each talent
is a free pick, for example talent 1 from Spring, talent 2 from Evergreen, talent 3 from Spring again,
talent 4 from Harvest, so the game has more possibilities (可能性) and more to play with (可玩性).
Version 1 had one path worn at a time with upgrades that needed their keystone. Version 2 is a grid:
five tiers, three talents in each, one pick per tier from any path. Nine of the fifteen talents were rewritten or replaced
so that every talent works alone. The line numbers are new.

Kesh's first ask, in his words: Mosslight is a druid style class with a three-way talent path, chosen
and upgraded at camp; an upgrade can change numbers (数值) or mechanics (机制); later every hero gets
three play styles of its own. The three for Mosslight:

1. low cooldown, spam heal skills;
2. medium, slightly higher cooldown, but every heal becomes a heal over time (HoT);
3. a share of her damage is stored in the staff, and when she walks close to an ally it heals them.

All numbers are first guesses, checked by arithmetic only, not by play. Section 10 says how to measure.

---

## 1. The template (every hero)

- **T1. Three paths per hero.** A path is a play style and a column of talents. A hero with no talent
  picked plays exactly as today.
- **T2. Five tiers, three talents in each, one pick per tier.** Each tier holds one talent from each
  path. The player turns on one talent per tier, from any path, so a build is five picks and a hero
  has 3 × 3 × 3 × 3 × 3 = 243 builds. A tier may also be left empty.
- **T3. Every talent works alone.** No talent needs another talent to do something. Talents of the
  same path build on each other, which is the reward for staying on one path, never a requirement.
- **T4. Each tier has one job, the same for every hero.** Talents that push the same lever share a
  tier, so the player can never hold two of them. That is the rule that stops stacking.

  | Tier | Job | Kind |
  |---|---|---|
  | I | Style: the rule that sets the play style. It may carry a trade | 机制 |
  | II | Power: more of the style's main output | 数值 |
  | III | Trick: a new thing the hero can do | 机制 |
  | IV | Reach: range, area or capacity. No extra output | 数值 |
  | V | Capstone: the path's signature | 机制 |

- **T5. Camp only, and changing is free.** Between runs the player can change any tier's pick, as
  often as they like, at no cost. Nothing changes during a run.
- **T6. Embers buy tiers, not talents.** Buying a tier once opens all three of its talents for good.
  Tier I is free. Tiers II to V cost 20, 40, 60 and 80, bought in order. That is 200 Embers for one
  hero and 1,400 for all seven. For scale, counted from `src/data/unlocks.js` today: the 117 unlocks
  cost 6,930 in all, the 61 deeds pay 2,725 once, and a Standard campaign pays about 240.
- **T7. A talent only changes its own hero.** It never changes drafts, rewards, rooms, foes or another
  hero's kit. (T49 offers a draft tilt as an open choice.)
- **T8. Budget.** A tier I talent is worth about +20% of the hero's main output in its style. A build
  that stays on one path is worth about +50% on paper. No mix of five picks may beat about +70%.
  Section 5 checks Mosslight against this.
- **T9. Shared stacking rules.**
  - Cooldown changes from talents add together (−20% and −10% make −30%; +25% and −10% make +15%),
    then multiply after the skill's nodes. The 0.5 s cooldown floor stays.
  - A status given by a talent (ward, shield, Inspired and so on) never adds to and never lengthens a
    stronger status of the same kind from a skill or a node. Only the stronger one counts while both
    are on.
  - A talent's repeat of a cast is not a cast: it never triggers another talent or a technique node.
- **T10. Look and sound.** Every talent rule has a look and a sound when it fires. The hero's portrait
  wears the badge of the path with the most picks (a tie goes to the tier I pick). Skill cards and
  the HUD show the changed numbers.
- **T11. Which runs wear it.** Every run that takes camp loadouts today (the same `boons` a kit rides
  in). The tutorial never does. The Daily wears the tier I pick only (T50 b, Kesh).
- **T12. Co-op.** Each human wears their own profile's picks on their own hero. AI seats wear the host's.
- **T13. AI seats and the autopilot play every talent that is on.** Section 6 lists the rules.
- **T14. Old profiles** show tier I open with nothing picked, and play as today. A run saved mid-way
  keeps the picks it started with.
- **T15. The nine goldens stay identical**: the legacy run takes no loadout, so no talent reaches it.

The three paths follow one pattern that fits any hero: **tempo** (more casts, each smaller),
**weight** (fewer casts, each lasting longer), and **conversion** (the hero's off-role output feeds
its main role). Section 8 shows a seed for each of the other six heroes.

---

## 2. Mosslight's grid

| Tier | Spring (春芽): tempo | Evergreen (常青): weight | Harvest (丰收): conversion |
|---|---|---|---|
| I Style | **Quick Sprout**: heal cooldowns 20% shorter; her heals 15% smaller | **Regrowth**: every heal becomes a HoT worth 150%; heal cooldowns 25% longer | **Reap**: 30% of her damage is stored as Sap; the gem pours it into hurt allies near her |
| II Power | **Spring Rain**: heal cooldowns 10% shorter | **Deep Roots**: every heal leaves 20% more as an afterglow over time | **Rich Sap**: 10% of her damage is stored as Sap |
| III Trick | **Twin Buds**: each heal skill holds 2 charges | **Bark**: an ally she heals takes 10% less damage for 4 s | **Rooted Staff**: the planted staff stores Sap from its own bolts and pours to allies near it |
| IV Reach | **Long Reach**: heal skills reach 20% farther | **Wide Canopy**: area heals are 20% wider | **Deep Gem**: the gem holds 30 more, pours 0.6 u farther, and starts each room with 15 Sap |
| V Capstone | **Second Flush**: every 5th heal cast repeats at 50% | **Perennial**: anyone she heals regrows 1% of maximum health a second for 6 s | **Bounty**: each foe felled stores 3 Sap; a poured ally deals 10% more damage |

Kesh's example reads on this grid as: tier I Quick Sprout, tier II Deep Roots, tier III Twin Buds,
tier IV Deep Gem. She spams short-cooldown heals that each leave an afterglow, holds two charges of
each, and starts every room with 15 Sap in the gem to pour into whoever she stands beside.

### Shared rules the talents use

- **T16. Heal skills.** Under kit 1.8 these are the fourteen that heal on a press: Swiftleaf, Seed Bolt,
  Dew Wave, Heartbloom, Pollen Gust, Nectar Burst, Mossgrowth, Firefly Swarm, Dewfall, Mending
  Sapling, Elder Oak, Rain Cloud, Creeping Moss and Leaf Gale. Pollen Mark heals but is not a heal
  skill (like Sapping Vine). The Forest Spirit is a passive that heals nothing.
  Glade Wisps is a heal skill with no press: cooldown, reach and heal-size talents change it, charge
  and cast-count talents do not. Her numbers are in the kit doc, section 7.
- **T17. The Sap rule** (shared by all five Harvest talents; any one of them turns it on).
  - Sap is stored in the staff's gem, up to 50.
  - While she stands within 1.8 u of a hurt ally, the gem pours by itself: every 0.5 s it heals the
    ally with the lowest share of health by up to 8 and spends the same amount of Sap. That is 16
    health a second, so a full gem empties in about 3 s.
  - A pour is a heal: relics and curses that change heals change it. It is always instant, never
    crits, never heals Mosslight herself and never reaches a downed ally.
  - Sap carries from room to room. It is lost when she is downed, and emptied when health is
    restored between levels.
  - While the staff is planted as the turret (her hit 3), the Sap still counts on her and she pours
    from her paw.
  - 2.2: the pour is not a heal skill. Quick Sprout does not shrink it and Regrowth does not slow it.
- **T18. The HoT rule** (for Regrowth and Deep Roots). A HoT is the kit's Moss (kit S3): one rule, one
  look.
  - A HoT ticks once a second. One HoT per skill on each ally, so one ally can carry up to four.
  - Casting the same skill on the same ally again restarts it and keeps what was still unpaid, up
    to one extra cast's worth.
  - A crit is rolled once when the HoT lands; a crit HoT ticks ×1.5 all the way. Technique nodes
    fire once on landing, never per tick. A HoT ends when its ally is downed.

---

## 3. The fifteen talents

### Tier I, Style (free)

- **T19. Quick Sprout (Spring).** Her heal skills' cooldowns are 20% shorter. With two Quicken nodes
  (−30%) Swiftleaf goes 2.5 × 0.7 × 0.8 = 1.4 s.
  2.2 (T43 b, Kesh): the price. While it is on, every heal skill heals 15% less (Swiftleaf 11.9, Seed
  Bolt 18.7, Moss and Glade wisps included). It is a style, more and smaller heals, not a plain
  bonus: alone it is about +6% healing a second with 25% more casts. The dash heal, seeds, the gem's
  pour and the relic's wisp are not heal skills and keep their size.
- **T20. Regrowth (Evergreen).**
  - Every heal from her skills lands as a HoT worth 150% of the heal, paid in 6 ticks: the first on
    landing, then one a second (5 s in all). Each tick is 25% of the heal. Seed Bolt's 22 becomes
    6 ticks of 5.5 (33 in all).
  - Her heal skills' cooldowns are 25% longer.
  - Dewfall and the Elder Oak already heal each second. Their healing clings: an ally keeps getting
    the tick for 3 more seconds after stepping out or after the zone ends.
  - Skills that are Moss already (Mossgrowth, Firefly Swarm's ally stops, Heartbloom's bud) pay 150%
    over their own time: Mossgrowth is 7.5 a second for 6 s.
  - A Glade wisp and a sapling's blossom land as small HoTs (kit section 7). A seed's 11 on touch is
    not a skill heal and stays instant.
  - Swiftleaf (T54, K2 a): its +50% on an ally who carries Moss adds to Regrowth, it does not
    multiply: 14 becomes 21 as a HoT, plus 7, so 28 in all.
  - Her dash's landing heal (5% of maximum health) becomes 3 ticks of 2.5%.
  - What rides on a heal stays instant: Pollen Gust's haste, Dew Wave's wash.
- **T21. Reap (Harvest).** 30% of the damage she deals to foes is stored as Sap (T17). It counts her
  basic attack, the gem turret's bolts and her damage skills (zone ticks and node damage included).
  It does not count overkill, breakable props or relic effects.
  2.2, under kit 1.7 her damage is: the basic attack, the turret's bolts, her damage skills, Spitter
  shots, the Oakling's slams, the Firefly Swarm's stings, Rootspear's seed bursts, and since kit 1.8
  Wild Thicket. Spitters from Sower's free seeds store in full (T54, K3 a).

### Tier II, Power (20 Embers)

- **T22. Spring Rain (Spring).** Her heal skills' cooldowns are 10% shorter. Alone that is −10%; with
  Quick Sprout −30%; with Regrowth the penalty drops from +25% to +15%.
- **T23. Deep Roots (Evergreen).** Every heal from her skills leaves an afterglow: 20% of the heal
  again, paid over 4 s (4 ticks of 5%). On a Regrowth HoT the 20% is added to the HoT (150% becomes
  180%, each tick 30% of the heal). Zone healing (Dewfall, the Elder Oak) clings 1 s (4 s with Regrowth).
- **T24. Rich Sap (Harvest).** 10% of the damage she deals is stored as Sap, counted like Reap. Alone
  that is 10%; with Reap 40%.

### Tier III, Trick (40 Embers)

- **T25. Twin Buds (Spring).** Each heal skill holds 2 charges. A charge refills on the skill's
  cooldown, one at a time. She can press the same heal twice in a row. This adds burst, not healing
  per second.
  2.2: two saplings may stand at once. One Elder Oak stands at a time, so its second charge is the
  next oak, not a second one.
- **T26. Bark (Evergreen).** An ally takes 10% less damage for 4 s after any of her heals lands on
  them: a skill, a Moss tick, a wisp, a blossom, a seed or a pour, whether or not they were hurt. Her
  own dash heal gives it to herself.
  2.2 (T54, K1 a, Kesh): Bark stays. "No shields" rules out shields only; Bark absorbs nothing.
- **T27. Rooted Staff (Harvest).** While the staff is planted, 50% of its own bolts' damage is stored
  as Sap (on top of Reap and Rich Sap), and the staff pours too: allies within 1.8 u of the staff
  are healed from the same Sap, as well as allies near her. She can throw the staff beside the Tank
  and keep her distance. Alone, a planted staff stores about 4 Sap a second. This talent needs
  Kesh's hit 3 (the staff turret) from the ability review.
  2.2: it fits Sower. A staff left standing its full 5 s stores the most Sap and then leaves its 3
  seeds. A watered staff fires 50% faster for 3 s and stores that much more.

### Tier IV, Reach (60 Embers)

- **T28. Long Reach (Spring).** Her heal skills reach 20% farther (range, reach and who counts as in
  range). It changes Swiftleaf, Seed Bolt, Dew Wave's length, Heartbloom, Pollen Gust's travel,
  Mossgrowth, Firefly Swarm, Dewfall, Mending Sapling, the Elder Oak's placing and Glade Wisps' 4 u
  search; since kit 1.8 also Nectar Burst, the Rain Cloud, Creeping Moss and the Leaf Gale.
- **T29. Wide Canopy (Evergreen).** Her area heals are 20% wider (ring radius, sweep angle, zone
  radius). It changes Dew Wave's width, Heartbloom's bloom, Pollen Gust's wall, Dewfall, Mending
  Sapling's reach and the Elder Oak's crown; since kit 1.8 also Nectar Burst, the Rain Cloud and the
  Leaf Gale.
- **T30. Deep Gem (Harvest).** The gem holds 80 instead of 50, pours 2.4 u instead of 1.8 u, and
  starts every room with at least 15 Sap. Alone, that is a 15 health top-up for one ally each room.

### Tier V, Capstone (80 Embers)

- **T31. Second Flush (Spring).** Every 5th heal cast repeats by itself 1 s later at 50%. This is the
  game's Echo rule: the repeat is not a cast, uses no charge and does not count toward the next 5.
  2.2: a repeat on a standing sapling adds 2 blossoms; on a standing Elder Oak it adds 4 s. A Glade
  wisp is not a cast.
- **T32. Perennial (Evergreen).** Anyone she heals (a skill, a Moss tick, a wisp, a blossom, a seed or a pour)
  regrows 1% of their maximum health a second for 6 s (Tank 1.5, Mosslight 1, Swordsman 0.95, Archer
  0.8 a second). Another heal restarts the 6 s; it never stacks. Its ticks are not casts and do not
  restart it. It replaces version 2's Overgrowth (overheal into a shield), because Mosslight has no
  shields (Kesh, 2026-11-16).

- **T33. Bounty (Harvest).** Each foe felled in the room stores 3 Sap, whoever felled it. An ally the
  gem pours into is Inspired: +10% damage for 3 s, refreshed by each pour.

---

## 4. What a build feels like

| Build | Picks, tier I to V | On paper |
|---|---|---|
| All Spring | Quick Sprout, Spring Rain, Twin Buds, Long Reach, Second Flush | ×1.34 healing per second from 43% more casts and the repeat, two charges, long range |
| All Evergreen | Regrowth, Deep Roots, Bark, Wide Canopy, Perennial | ×1.44 healing per second, 10% less damage taken, every ally she touches regrowing |
| All Harvest | Reap, Rich Sap, Rooted Staff, Deep Gem, Bounty | 40% of her damage becomes healing (about 18 a second with three damage skills), allies deal 10% more |
| Kesh's example | Quick Sprout, Deep Roots, Twin Buds, Deep Gem, any | ×1.28 healing per second, two charges, 15 Sap each room |
| HoT spreader | Regrowth, Spring Rain, Twin Buds, Wide Canopy, Perennial | ×1.3 healing per second, two charges to put HoTs on two allies at once |
| Battle druid | Reap, Deep Roots, Rooted Staff, Deep Gem, Bounty | her few heals leave afterglows while her damage fills the gem |

"On paper" means every cast lands on a hurt ally. A no-talent Mosslight with four heal skills heals
about 31 a second at best and deals about 16 damage a second.
2.2: the Spring figures include Quick Sprout's 15% smaller heals (T43 b). Under kit 1.7 a no-talent
kit heals about 32 a second (kit section 7), so the figures hold.

Every hero starts a run with four empty skill slots. Spring and Evergreen talents wait for her first
heal skill; Harvest talents work from room 1, because the basic attack already deals damage. Since
kit 1.6 Sower's free seeds also work from room 1: their Spitters feed the gem, and a seed's heal
gives Bark and Perennial.

---

## 5. Combos checked (T34)

**Clashes found and how the design settles them.**

1. *Talents that needed their keystone.* Version 1's Deep Roots, Bark, Patient Seasons, Overgrowth,
   Rich Sap, Rooted Staff, Deep Gem and Bounty did nothing without Regrowth or Reap. All are
   rewritten to work alone (T3). Patient Seasons is gone: Spring Rain now does that job when mixed
   with Regrowth, and Wide Canopy takes its place.
2. *Two cooldown talents.* They add, they do not multiply (T9).
3. *Regrowth and the gem.* A pour stays instant under Regrowth (T17). Regrowth only changes skill
   heals and the dash heal.
4. *Regrowth and Twin Buds.* Two charges on one ally cannot stack past one extra cast's worth (T18),
   so the second charge is better spent on a second ally.
5. *Bark, Bounty and stronger statuses.* The game refreshes a status to the larger size and the
   later end. Without a rule, Bark's 10% ward, refreshed every second, would keep another hero's
   stronger ward on forever, and Bounty would do the same to Rallying Cry's +20%. T9 forbids it. The build
   needs a separate record for talent statuses (section 10).
6. *Bark and her garden.* Moss ticks, Glade wisps, blossoms and seeds land a heal on an ally every
   second or two, so allies she looks after nearly always have Bark. That is meant: it is 10%, it
   never stacks, and it is not a shield (T54, K1 a).
7. *Perennial and her garden.* For the same reason those allies nearly always regrow. That is meant,
   and it is bounded: 1% a second never stacks.
8. *Perennial and Regrowth.* They add: a Regrowth HoT and Perennial's 1% run side by side. One
   vine ring shows each.
9. *Mercy Bell's wisp (her class relic).* The wisp takes her overheal; no talent uses overheal any
   more, so nothing clashes with it. The wisp's heal is a heal: it refreshes Bark and Perennial.
10. *Second Flush and the Echo node.* Both repeat the cast (two repeats at 50%). Neither repeat
    triggers the other.
11. *Bounty in a boss arena.* A boss arena has one foe, so the 3 Sap per foe pays once. Her other
    Sap talents and the Inspired bonus still work.
12. *Regrowth and Swiftleaf (2.2, K2 a).* Under Regrowth every ally she heals carries Moss, so
    Swiftleaf's +50% is always on. The two add (28), they do not multiply (31.5).
13. *Regrowth and Heartbloom (2.2).* The bloom pays out all unpaid Moss at once, Regrowth HoTs included.
    That is meant: it is Evergreen's answer to a big hit, once every 8 to 10 s.
14. *Harvest and free seeds (2.2, K3 a).* Up to 4 Spitters stand, 16 damage a second at most, so Reap
    stores up to about 5 Sap a second from Sower alone. Kept as it is: it suits Kesh's goal of plenty,
    and the cap of 4 Spitters bounds it. If play shows Harvest ahead, the lever is Reap's 30%.
15. *Quick Sprout's price and the other talents (2.2, T43 b).* The 15% applies to heal skills only, so
    it does not shrink Sap pours, and it multiplies with Regrowth's 150% (a Seed Bolt is 28 as a HoT).

**Stacks that are strongest on paper.**

- Most healing per second: Quick Sprout, Deep Roots, Rooted Staff, any tier IV, Second Flush. That is
  ×1.25 × 0.85 × 1.2 × 1.1 = ×1.40 since T43 b (it was ×1.65), plus about 3 Sap a second from the
  staff. All Evergreen (×1.44) is now the most healing per second on paper, all Spring is ×1.34, and
  everything sits well under the T8 ceiling of +70%. If play shows a mix too strong, the lever is
  Second Flush (every 6th cast) or Deep Roots (15%).
- Most protection: Regrowth, Deep Roots, Bark, Wide Canopy, Perennial, which is the all Evergreen
  build. No mix protects more.
- Most damage help: all Harvest. No mix adds more Sap, because each tier has one Sap talent.

No pair of talents multiplies the same lever twice, because the two cooldown talents sit in tiers I
and II and add together, and every other output talent sits alone in its tier.

---

## 6. AI rules (T35)

The AI seat and the autopilot follow one rule per talent that is on.

- Quick Sprout, Spring Rain: no new rule; shorter cooldowns are used as they come.
- Twin Buds: keep the second charge for an ally under 50% health.
- Regrowth: cast a heal skill on an ally under 90% health who does not carry that skill's HoT; recast
  on an ally whose HoT has more than 2 s left only when that ally is under 40%.
- Any Sap talent: with at least 10 Sap and an ally under 70% health, walk to stand within the pour's
  reach of that ally, inside her leash ring and off the beds she already avoids. Otherwise keep her
  usual distance.
- Reap or Rich Sap: rank her damage skills higher in swap offers.
- Rooted Staff: throw the staff (hit 3) toward the hurt ally when one is in throwing range.
- Bark, Perennial, Deep Roots, Long Reach, Wide Canopy, Deep Gem, Second Flush, Bounty: no new rule.

---

## 7. Every part of her kit under the talents (T36)

Since 2.2 the table of her heal skills under the talents (cooldowns, and how each lands under
Regrowth) is kept in one place: the kit doc, `MOSSLIGHT_SKILL_KIT.md`, section 7 (S31). Add to it:

- Quick Sprout: every heal in that table is 15% smaller while it is on (T43 b).
- Deep Roots without Regrowth leaves each heal as it is and adds 20% of it over 4 s (Seed Bolt: 22
  at once, then 4 ticks of 1.1). With Regrowth each tick is 30% of the heal, not 25%.

**The rest of her kit.**

| Part | Spring talents | Evergreen talents | Harvest talents |
|---|---|---|---|
| Glade Wisps (passive) | a wisp forms sooner; Long Reach widens its search | each wisp lands as a small HoT; it feeds Bark and Perennial | as written |
| Damage skills (10 since kit 1.9) | as written | as written | Reap and Rich Sap store their damage; Pollen Mark and Drowsy Spores deal none |
| Helpers: Spitters, Oakling, Firefly stings | as written | as written | their damage is hers and is stored |
| Basic attack (hits 1 and 2) | as written | as written | Reap and Rich Sap store its damage |
| Hit 3, the planted staff turret | as written | as written | Reap and Rich Sap store its bolts; Rooted Staff stores 50% more and the staff pours |
| Sower, her class passive | takes no talent | a seed's heal gives Bark and Perennial | its Spitters feed the gem |
| Seeds (11 on touch) | not a skill heal: not shrunk | stays instant; gives Bark and Perennial | as written |
| Dash landing heal (5%, once per 3 s) | not shrunk | Regrowth: 3 ticks of 2.5%; it feeds Bark and Perennial | as written |
| The relic's wisp | as written | its heal gives Bark and Perennial | the pour never overheals, so it never feeds a wisp |
| Nodes on her skills | a talent's cooldown change multiplies after Quicken | fire once when a HoT lands | damage nodes (Detonate, Bounce and so on) store Sap like the skill |

Which nodes each skill is offered is in the kit doc, section 5.

---

## 8. Look and sound, and the other heroes

- **T37. All talents.** Skill cards and the HUD show the changed cooldowns and heal numbers. Colours
  follow the colour rule: every heal is Bright Heal `#5FE873`; her damage keeps the darker green Kesh
  picked (head `#8CC46E`, trail `#3E8240`); nothing wears Ember or Violet. Glows stay dim.
- **T38. Spring.** Twin Buds: two pips on each heal skill slot. Second Flush: the heal lands a second
  time with a softer copy of its sound, and a small "×2" mark shows on the slot as the 5th cast arms it.
- **T39. Evergreen.** HoTs and afterglows: one leaf pip per HoT (up to four) over the ally's health
  bar, and a thin vine ring at the ally's feet that shrinks as it runs out. Tick numerals are added
  up and shown once a second per ally. One soft sound when a HoT lands and one when it ends, none
  per tick. Bark uses the game's ward look in a thinner line; Perennial uses the vine ring of a HoT.
- **T40. Harvest.** When Sap is stored, a dark green mote flies to the gem (at most four a second).
  The gem grows and brightens as it fills, and a small arc by her portrait shows the Sap. A full gem
  pulses once with a chime. A pour is a Bright Heal stream from the gem (or the planted staff) to
  the ally with a soft pouring sound and one numeral per pour. A faint ring on the floor shows the
  pour's reach only while she holds Sap and an ally is hurt. Bounty uses the game's Inspired look.

**T41. How the template fits the other six heroes.** One-line seeds to show the pattern holds. None
is designed. Each hero gets its own doc like this one when Kesh reaches it.

| Hero | Tempo path | Weight path | Conversion path |
|---|---|---|---|
| Stonehide (Tank) | short cooldown guards and taunts | long cooldowns, big lasting wards | damage he takes is stored and released as a slam |
| Ashfang (Swordsman) | many light cuts | hits become bleeds over time | damage dealt builds a guard on himself |
| Windbriar (Archer) | rapid light arrows | traps and marks that last | hits on marked foes shield the nearest ally |
| Tide Caller | short cooldown soaks | deep pools that last | Crash damage heals allies standing in her water |
| Bellwright | many small quick bells | few great bells that toll long | her rings shield allies inside them |
| Duskwing | short cooldown dives | bites bleed over time | Night Hunger's overflow heals allies near him |

What each hero's doc must fill in: the grid of fifteen talents with the tier jobs of T4, the shared
rules its talents use, the combo check of section 5, the table of every skill under the talents, the
look and sound, and the AI rules. Text per hero is about 36 strings (3 path names and lines, 15
talent names and lines), so about 250 for seven heroes, each in ten languages.

---

## 9. The choices, closed

**All closed by Kesh, 2026-11-17 07:17 Singapore time: "Checked follow your pick will do".** The pick
is first; what was not picked is kept for the record.

- **T42. Path names.** Spring, Evergreen, Harvest. (Not picked: Bloom, Root, Thorn; his own names.)
- **T43. Quick Sprout's price.** b) Her heal skills also heal 15% less while it is on (T19). (Not
  picked: a pure cooldown cut.)
- **T44. Reap's price.** None. (Not picked: heal skills heal 20% less.)
- **T45. Does the gem heal Mosslight?** No, allies only. (Not picked: herself at half rate.)
- **T46. A bonus for staying on one path.** None. (Not picked: a sixth bonus at four or five picks.)
- **T47. Paying.** Per tier, 20/40/60/80 Embers, all three talents of the tier open. (Not picked: per
  talent; all free.)
- **T48. Saved builds.** One build per hero. (Not picked: three named slots.)
- **T49. Drafts.** Unchanged. (Not picked: offers lean toward the tier I pick.)
- **T50. The Daily.** b) It wears the tier I pick only (T11). (Not picked: it ignores talents.)
- **T51. Where the picker lives.** On the hero's card in the camp's hero pick (K): five rows, three
  columns, one pick lit per row. (Not picked: a tab on the Unlocks screen.)
- **T52. HoT stacking.** One HoT per skill, up to four on one ally. (Not picked: one merged HoT.)
- **T53. Number of tiers.** Five. (Not picked: four.)
- **T54. Kit 1.7 and the talents (new in 2.2).**
  - K1. Bark stays: "no shields" rules out shields only (a). This also closes the kit's S35.
  - K2. Regrowth and Swiftleaf's Moss bonus add, 28 in all (a).
  - K3. Spitters from Sower's free seeds store Sap in full under Reap and Rich Sap (a).

Ruling A24 is given: yes (Kesh, 2026-11-17 07:47 Singapore time). Nothing in this doc is open.

---

## 10. Notes for the ability thread (how to build and show it)

**Review stage (now, under the freeze).** Build the fifteen talents in the review-only local build
and add them to the Mosslight ability page: the grid of section 2 at the top, one card per talent
(T19 to T33) with a short clip, and four 20 s fight clips (all Spring, all Evergreen, all Harvest,
and Kesh's example mix). A page clip shows the proposed version, as on lines 1 and 2.

**Kesh's picks this rested on are all given:** hit 3 as the planted staff turret (Rooted Staff, T27),
the dash heal of 5% once per 3 s (T20), and the kit itself (1.7, passed 17 Nov).

**Review stage, version 2.2.** The page's talent section follows this version: Quick Sprout shows
"heal cooldowns 20% shorter, heals 15% smaller"; the talent cards and clips use the kit 1.7 skills;
Regrowth with Swiftleaf pays 28; Sower's Spitters fill the gem under Reap.

**Game stage (after the freeze lifts).** This needs a ruling first: BUILD_BRIEF A8 and A19 keep
"talent trees" out of scope, and CLAUDE.md repeats it. Kesh's ask overrides that; write it as ruling
A24 and fix the CLAUDE.md line in the same slice. **A24 is given: Kesh, 2026-11-17 07:47 Singapore
time, answered "Yes" to "should talents be in the game's scope, built after the freeze lifts?".** It
replaces A8 and A19 for talents only; the Echoes and Seals currencies and camp facilities stay out
of scope. The repo's BUILD_BRIEF and CLAUDE.md still carry the old line until that slice or a small
docs change writes A24 in, as A23 was written. New machinery, each in the module that owns the job:

1. The talent table and its numbers: one frozen table (for example `src/data/talents.js`), nothing
   hard-coded elsewhere.
2. Buying and picking: tier rows of a new kind in `src/data/unlocks.js`, the profile block in
   `src/save/profile.js`, and `loadoutBoons()` handing the run `boons.talents` (for each hero, the
   pick of each tier or none).
3. Cooldown changes and charges: the slot machinery in `src/sim/skills.js` (the save already carries
   remaining ticks; charges add one more value per slot).
4. HoTs and afterglows: a new party-only status kind in `src/sim/status.js`, and the heal-to-HoT
   switch inside the one `deliver` in `src/sim/allycast.js`.
5. Talent statuses (T9): statuses today refresh to the larger size and the later end
   (`applyStatus` in `src/sim/status.js`), and a shield does not add up. Bark and Bounty's Inspired
   each need their own record so they never lengthen a stronger status.
6. Sap: listeners on her damage events and on foe deaths, and a pour every 30 sim ticks, in the
   sim, saved with the run.
7. AI rules in `src/sim/autopilot.js` and `src/sim/partyai.js`.
8. UI in `src/ui/run/classpick.js` and the HUD; all text in ten languages.
9. One probe (`tools/talents-probe.mjs`) that also walks all 243 builds for a dead or broken pick,
   and one doc (`docs/TALENTS.md`).

**Measuring the numbers.** Headless autopilot campaigns are fast (five seeds in about 25 s). Run the
same seeds with no talents, with each tier I talent alone, with the three one-path builds, and with
the strongest mixes of section 5. Compare clear rate, downs, healing done, overheal and her damage.
Tune until the three one-path builds land within about 10% of each other on clear rate and no mix
beats the T8 ceiling.

**What is guessed.** Every number in sections 2 to 7; the Ember prices; the damage figures used for
Harvest: 37 a second with three damage skills, counted on the old kit (basic attack about 14;
Pale Lance through two foes 10; Lantern Flurry 5.4; Bell Toll on three foes 7.5), and a planted staff
landing 3 damage every 0.34 s. The kit 1.7 damage skills and Sower's Spitters have not been
re-counted; measure them in play.
