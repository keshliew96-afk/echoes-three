# Duskwing: design notes

**Version 1.5, 2026-11-20. Design only.** The details behind `DUSKWING_KIT.md` (lines K, T, F).
(1.5: Cloak Turn, N102. 1.4: Hawk Drag, Hanging Claws, the Ride, N101. 1.3: the 22 new forms, N100. 1.2: the twelve combos, N98. 1.1: Kesh's picks of 17:09 Singapore time, N96 and N97: changed lines are N7, N10, N11, N12,
N13, N15, N22, N23, N39, N40, N77. The 1.0 text is kept as `DUSKWING_NOTES_1.0.md`.)
Every line here has a number (N1 to N102). All numbers are first guesses until measured in play.

## 1. The ask and how I read it

- **N1.** Kesh, 2026-11-18 16:39 Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5yCc3qkQCtoaqerVdczNPV5E):
  "duskwing is an assassin class, its job is to assassinate 脆皮 foes, mean it will sometime
  脱离队伍 range, its play style: 1. combo, the higher the combo, the higher the CDR and the
  faster the skill animation, mean original animation need 5s to play full, when full stack of
  combo, maybe 2.5s can play all and deal full damage, and the higher chance of dodge or
  evasion. this is kill foes before foes kill me style 2. leech, it can leech hp when hit foes,
  so have a bit higher survivability, so it can have self-heal without teammate 3. blink,
  invisible, split to bat to move, this is a high 机动性 style, it allow to 潜行/blink to foes
  behind and backstab so it deal penatrated damage and crit strike. This is either silence do
  nothing when skills in cd, or when skill all active then can burst out to deal massive damage
  then blink out to 脱离战场 or back to teammate. design element, blood, bat, blink, assassin,
  backstab."
- **N2.** Pattern taken from Windbriar 1.3: one pool of 26, a base form for each skill, and the
  tier I talent re-shapes every skill, so every pressed skill reacts to all three styles (72
  forms on 24 skills).
- **N3.** The passive must serve all three styles. Night Hunt does: the backstab and the kill
  help every style, and the style gives the kill its shape (K5).
- **N4.** "His job is 脆皮 foes, sometimes out of the team's range" is why each style carries its
  own way to live with no healer near (K4), and why the kill is in the passive: shooters and
  casters fall fast, and each one that falls pays him back.
- **N5.** Kept from the game: all eleven skills he has today, with today's numbers. One is
  re-shaped (Blood Scent, N90) and his innate trait moves to a path (Night Hunger, N89). His
  eight draft nodes and two relics are not touched (N91).
- **N6.** Kept from his model page (passed 13 Nov): the six-hit combo in 1.35 s with a blink for
  each of hits 4 to 6, the blink dash that splits into small bats, the torn claw marks and the
  bite mark, screech, nightfall, bloodbite, talon rake, dusk dive.

## 2. Kit rules

- **N7. Backstab 背刺.** A hit is a backstab when he stands in the rear third of the foe (120°
  behind its facing) as the hit lands, or when the foe is blinded or stunned. It deals 20% more
  (增伤区). A foe keeps facing its target, and does not turn during its own wind-up or attack.
  Area hits count from where he stands. Bleeds, pools, the swarm and Night Wings are never
  backstabs. Seen: the claw mark is larger and pale-edged, with a short dry crack.
  - **The same 20% from two more places** (Kesh's rule on pick 1a, N97): a hit on a foe that
    carries any bleed of his, and every hit while his Combo is 15 or more. It is one 20%: a
    backstab on a bleeding foe at 20 Combo is still 20%.
  - These two give the 20% only. They do not make the hit a backstab, so Nightcloak's sure
    crit, First Blood and the backstab mark still need a real back (confirmed by Kesh, N97).
  - Seen: at 15 Combo his claws take a rose edge; a bleeding foe's marks glow faintly.
- **N8. The kill.** A foe that falls within 2 s of a hit of his is his kill, whoever struck
  last. It readies the dash at once and takes 1 s off every skill cooldown he has running.
  Several foes falling together each count. Seen: a rose glint runs along his wings and the
  dash pip snaps full.
- **N9. The kill by style.** Rampage: 5 Combo and the 3 s start again. Sanguine: a red thread
  from the fallen foe, 6 health. Phantom: Unseen 1.5 s (so a kill in a pack lets him leave or
  pick the next back). These three are part of the tier I talent's style, not extra talents.
- **N10. Combo 连击.** Counts every hit of his basic attack and skills on a foe, each foe hit
  counting once, and every bat bite and ghost claw (F12's Rampage form, T7). Not counted:
  bleeds, pools, the mist, the moon's drinking, Night Wings, the puff. It is lost 3 s after his
  last counted hit. Being hit does not lose it (audit A1a). The number is shown beside him and on the HUD and has no top (×87 is fine);
  the Rampage talents stop reading at 30. The hit sound rises a step every five points.
- **N11. Dodge 闪避 (T1).** A hit thrown at him has that chance to miss: no damage, no effect.
  He flickers aside as two or three small bats and a "miss" shows. Rolled on the seeded stream.
  Floor beds and damage over time cannot be dodged, and a hit that showed a floor warning is
  never dodged (audit A4b): those are for the dash.
- **N12. Faster moves (T1).** A skill started at N Combo plays at 1 + N/30 speed for its whole
  length (so it does not change speed mid-move), every hit landing sooner, same damage. Moves
  with a set time (Blood Mist's 1.5 s, Night Flight's 2.5 s, zones) keep their time; only his
  own motions speed up. The basic attack speeds up the same way (pick 3b): at 30 Combo the six
  hits take 0.68 s.
- **N13. Unseen 隐身.** Foes do not choose him and drop him as a target; a foe mid-attack
  finishes it where he was. It ends with his first hit or damaging cast, when he is hit, or
  when its time runs out. That first hit is a backstab from any side. Floor warnings, beds and
  area hits still hurt him. Foes that lose him pick another hero at once (audit A3b). To the player he is a dark glass shape with two rose eye glints; to
  co-op friends he is half faded. When he is the only hero standing, Unseen lasts 2 s at most.
- **N14. Bleed 流血.** 持续伤害 on one foe. One bleed for each skill that gives one; the same
  skill again restarts it. Open Wounds (T5) keeps its own record: each hit adds 25% of itself
  to an amount that drains over 3 s.
- **N15. Comes back.** A heal on him equal to that share of what the skill dealt after the
  formula. It does not crit. With Blood Drinker the shares add (Bloodbite: 50% + 15% on one
  foe). A skill's own share is paid in full whatever it hits; only Blood Drinker's 15% drops
  to a third (N23).
- **N16. The blood shield (T2).** One layer of its own (formula D33): overheal adds to it up to
  24 (30% of his 80 health) and each gain restarts its 6 s. It is drawn as a thin red rim on
  his health bar. Today's Vampire node (a shield up to 15) uses the same layer: the larger top
  counts.
- **N17. Blind.** Today's status and rules (2 s at most; a blinded foe starts no attack). With
  the damage formula's pick 11b a boss is no longer immune: blind lasts a fifth of its time on
  it, with the 5 s guard between hard controls (formula D40).
- **N18. Movement.** A blink, dive, flit or leap stops at a wall and never ends on a floor
  warning or a floor bed: he lands on the nearest clear spot. "Untouchable" only where the line
  says so. The dash cancels any move; hits already landed stay.
- **N19. Bosses.** A boss cannot be launched, pinned, held or carried; that hit deals 20% more
  (the kits' rule; formula pick 13a). A boss has a back like every foe.
- **N20. Holds and second presses.** One hold: Thousand Claws under Rampage. Second presses:
  Roost (the return), Dusk Dive under Rampage (the next dive). Nothing else.
- **N21. Launches.** Skyward Rip and Blood Spikes launch. Windbriar's arrows deal 30% more to a
  foe in the air (her C3) and her Spike rule works on foes he launches.

## 3. Talents in full

### Tier I, Style (free)

- **N22. T1 Bloodrush 连击 (Rampage).** Every skill takes its Rampage form. Each Combo point up
  to 30 gives a thirtieth of: moves twice as fast, cooldowns running 60% faster, 30% dodge. So
  at 15: moves 50% faster, cooldowns 30% faster, 15% dodge. This is Kesh's own rule ("5 s to
  2.5 s at full stack, full damage"). The basic attack is sped up too (pick 3b). The trade: no
  heal, no shield; an empty Combo is a slow, fragile bat.
- **N23. T2 Blood Drinker 饮血 (Sanguine).** Every skill takes its Sanguine form. 15% of the
  damage of a strike that hit one foe comes back as health. A strike that hit two or more
  foes, a zone and a bleed return a third of that, 5% (audit A5b). Overheal fills the blood
  shield (N16).
  The trade: his forms are slower and wider, with less burst.
- **N24. T3 Nightcloak 夜隐 (Phantom).** Every skill takes its Phantom form. A backstab is a sure
  crit and ignores half the foe's defence. After 2.5 s with no basic attack and no cast he is
  Unseen until he hits (N13). The trade: nearly all of his damage needs a back, and he does
  nothing while he waits.

### Tier II, Power (20 Embers)

- **N25. T4 Killing Pace 杀势.** 1% more damage for each Combo point, up to 30% (增伤区).
- **N26. T5 Open Wounds 血流不止.** Every hit of his makes the foe bleed for 25% of that hit's
  card damage over 3 s (N14). Bleeds and bat bites do not start it.
- **N27. T6 First Blood 先手.** Backstabs deal 30% more; 60% on a foe he has not damaged yet.

### Tier III, Trick (40 Embers)

- **N28. T7 Twin Fangs 双牙.** Every fourth counted hit is repeated 0.1 s later by a pale ghost
  claw for half. The ghost claw is 附加伤害; it counts for the Combo but not toward the next
  fourth hit.
- **N29. T8 Blood Pact 血契.** While a skill is on cooldown its key can be pressed once more: it
  costs 12 health (15% of 80), casts at once, and its cooldown starts again from the top. It
  cannot be bought again until that skill has come ready by itself. The cost is 生命消耗 (formula
  D7): not damage, not through the shield, and it cannot be paid at 12 health or less. Seen: he
  bites his own wing claw, the skill's HUD ring turns red.
- **N30. T9 Shade 残影.** His dash and each blink skill (N31) leave a dark shade of him where he
  left, 2 s. Foes that were on him attack the shade. When it ends or is struck three times it
  bursts into small bats: 8 within 1.5 u, blind 0.5 s. One shade at a time. Not from the
  basic attack's blinks.
- **N31. Blink skills:** Blink Strike, Dusk Dive, Flit, Roost's return, Death Mark, and any
  Phantom form that blinks him. Not Blood Mist or Night Flight.

### Tier IV, Reach (60 Embers)

- **N32. T10 Wingspan 展翼.** Talon Rake, Thousand Claws, Wing Wheel, Skyward Rip, Last Bite,
  Bloodbite, Night Wings and the basic claws reach 30% farther; their arcs are 30% wider. The
  basic attack's blinks find foes 30% farther off.
- **N33. T11 Red Tide 血潮.** Bat Swarm, Blood Mist, Blood Moon, Blood Spikes and every pool are
  30% wider. Blood Lance, the blood crescent and every thread reach 30% farther.
- **N34. T12 Far Step 远遁.** The dash, Dusk Dive, Flit, Blink Strike, Pounce, Death Mark and
  every blink of a form go or reach 30% farther. Nightfall, Flit's puff, the eclipse and the
  black mist are 30% wider.

### Tier V, Capstone (80 Embers)

- **N35. T13 Carnage 血舞.** Each time the Combo passes a multiple of 30, the room dims and
  everything holds for 0.3 s; a torn claw mark opens on every foe within 6 u, one after
  another; he lands in his cape pose (N52) and flicks his claws; all the marks tear at once:
  24 each. He is untouchable for the 0.6 s it takes. It is not a cast and does not add to the
  Combo.
- **N36. T14 Blood Tithe 血偿.** Every point of health he regains, from any source and overheal
  too, also fills a store, up to 40. A small red moon over his shoulder fills. When it is full
  his next skill also throws a ring of blood blades: 40 真实伤害 to every foe within 3 u, and the
  store is empty. The store carries from room to room and is lost when he is downed.
- **N37. T15 Killing Hour 月黑风高.** When every skill he holds is ready, his eyes light rose.
  His next cast opens 4 s in which every hit of his is a backstab from any side and deals 30%
  more. Then he is Unseen 2 s. It cannot open again until all his skills are ready again.

### Checks

- **N38. Every talent works alone.** T4 and T13 read the Combo, which is always counted (K8).
  T5: any hit. T6: backstabs are in the passive. T7: any hit. T8: any skill and his own health.
  T9: the dash. T10 to T12 name base things. T14: any heal (Bloodbite, the kill under Sanguine,
  the healer). T15: any four skills.
- **N39. Mixes checked.**
  1. Bloodrush with Killing Hour: cooldowns run faster, so the Hour opens more often. Wanted;
     to measure.
  2. Bloodrush with Blood Pact: a paid second cast at double speed. He has no leech to pay it
     back; honest.
  3. Blood Drinker with Blood Pact: the leech pays the Pact. The vampire's loop; to measure.
  4. Blood Drinker with Blood Tithe: about 270 damage on single foes fills the store, or about
     800 in area damage (audit A5b). The Blood skills' own shares fill it faster.
  5. Nightcloak with Killing Pace: waiting 3 s loses the Combo, so Killing Pace is weak for a
     hero who waits. A free pick, not a trap the picker hides.
  6. Nightcloak, First Blood and Killing Hour: 20% + 30% + 30% in one zone (80% more), a sure
     crit and half the defence ignored, for 4 s. The burst build; the first thing to measure.
  7. Twin Fangs with Carnage: more counted hits, so Carnage comes sooner.
  8. Shade with Nightcloak: he is almost never the target. He also deals nothing while unseen.
  9. Open Wounds with Blood Drinker: the bleed leeches too, at 5%; and every foe he has hit is
     bleeding, so the passive's 20% is nearly always on. Wanted (Kesh's rule); to measure.
  10. Killing Pace at 15 Combo and above: 15% to 30% plus the passive's 20%, in one zone.
- **N40. Budget** (docs/TALENTS.md: tier I about 20% more output in its style, one whole path
  about 50%, no mix above 70%). Two tier I talents are over it as written and are built as
  Kesh asked: Bloodrush at full Combo roughly doubles his skill output, and a Phantom backstab
  is 1.2 × 1.5 = 1.8 times a front hit. What holds them back is the build-up (30 hits, lost in
  3 s) and the positioning. Pick 3b adds the basic attack to Bloodrush's speed, so his basic
  output doubles at 30 too. If play shows them too strong, the levers are the Combo's top speed
  (1.5 times instead of 2) and the crit damage of a sure crit.

## 4. The basic attack and the dash

- **N41.** Base combo 4, 4, 6, 5, 5, 8 (32 in 1.35 s); today's Nip is 7 each 0.3 s, the same
  rate. Hits 4 to 6 blink to the back of the foe nearest the pointer within 3 u, a different
  side each time on the same foe, and he ends where he stood (as passed). They are backstabs.
- **N42.** Rampage: after hit 6, while attack is held, he keeps blinking, 5 a hit, a new foe
  each time while there is one. Letting go ends it where he stood.
- **N43.** Sanguine: hit 3 is a held bite, 0.3 s: 10, half comes back.
- **N44.** Phantom: hits 4 to 6 are one move: he vanishes for 0.3 s and one great claw lands in
  the foe's back: 18. He stays behind it.
- **N45.** The dash is the passed one. Rampage: 5 to each foe the bats pass. Sanguine: 4 to
  each, all of it comes back. Phantom: 1 s Unseen as he gathers; aimed at a foe within 3 u he
  gathers behind it.

## 5. Motions

- **N46. The bar** (Kesh's video refs for Ashfang, same level here): every skill is a small
  choreography: a ready pose, the strike, a flourish, an end pose held a beat (残心). He leaves
  the floor often and is the one hero who truly flies. Every beat has one big readable shape: a
  claw mark, a crescent, a wheel, a ring of bats, a red moon, a column of spikes.
- **N47. His own gestures.**
  - The wing snap: both wings flare wide with one hard beat on every cast (his rig's trait).
  - The scatter and gather: he bursts into small bats and they close back into him (passed).
  - The cape pose: he lands in a three-point crouch with one wing swept across his face like a
    cloak, eyes over the edge. His end pose.
  - The hang: upside down from nothing, wings folded (Roost, the start of Night Flight).
  - The barrel roll in the air, wings tight, then thrown open to stop dead.
  - Ears: they swivel to the target a beat before he moves and flick after a kill.
- **N48. Length.** Quick skills 0.5 to 1.0 s, big ones 1.4 to 2.5 s. The dash cancels any beat.
- **N49. Looks.** Claw marks are the passed torn slashes; a backstab's mark is larger and
  pale-edged. Darkness is ink smoke with Dusk Rose eye glints. Blood is pick 6. Heal numbers
  stay Bright Heal. No Ember, no Violet; effects dim and readable.
- **N50. The styles' looks.** Rampage: rose after-images trail him, one more for each ten
  Combo, and his marks overlap in stacks. Sanguine: red threads from foe to fang, drops that
  hang in the air and fly home, crescent moons. Phantom: he is absent between hits; ink smoke,
  one huge mark from behind with a 0.1 s freeze frame.

### Claw

- **N51. Talon Rake** (0.5 s). A half step, both wings thrown back; he rakes across with both
  wing claws, body turning through; four torn marks fan out. End: wings crossed over his chest.
  Rampage: left, right, both, each from a deeper crouch. Phantom: bats pour through the pack
  and he is behind it, mid-rake.
- **N52. Thousand Claws** (1.2 s). He drops low, wings half open as fists; eight jabs, left and
  right, his body a blur, marks stacking on the foes; then a jump and both claws drawn down and
  apart: a big cross mark. End: the cape pose. Sanguine: the cross is a lunge bite, and eight
  drops hanging in the air snap to his mouth. Phantom: he is a ring of after-images round one
  foe, a strike from each, then solid behind it.
- **N53. Wing Wheel** (0.9 s). He leaps, turns flat in the air like a thrown blade, wings rigid;
  three turns draw three rose rings; he lands running. Phantom: the wheel is bats: a ring of
  them widens, hangs, and closes on one point behind a foe, where he stands up out of it.
- **N54. Skyward Rip** (1.4 s). A low step in and a rising claw from the floor to above his
  head; the foes lift. One beat of his wings takes him up beside the highest; four cuts while
  both hang; he rolls over it and stamps it down with both feet; dust ring. He drifts down
  with wings spread and folds them. Sanguine: he clamps on in the air, wings wrapped round the
  foe, both turning slowly; a red thread runs. Phantom: he rises out of sight; a shadow grows
  on the floor behind the foe; he falls on it claws first.
- **N55. Last Bite** (0.6 s). Ears forward; the light dims a touch round the foe. One flat
  lunge, jaws first, wings swept back like a dart; the bite mark snaps shut. On a kill he
  lands beyond it, licks a fang, and the key is lit again. Phantom: bats, then the bite from
  behind the neck.
- **N56. Pounce** (1.2 s). A crouch, a high arc with wings spread; he lands on the foe's chest
  and rides it down; five fast claws, left right left right, then both; he springs off
  backward in a flip. Rampage: the flip off is the leap to the next foe. Phantom: no arc: the
  foe's own shadow rises behind it and is him.
- **N57. Crescent Wings** (0.5 s). He spreads both wings full, a breath, and claps them shut
  in front: two thin crescents leave the edges and cross; the clap blows dust forward. End:
  wings wrapped round him like a cloak. Sanguine: one wide red crescent that slows, turns and
  flies home into his open jaws. Phantom: he bursts into bats that fly inside the crescents'
  wake and gathers at their end, already cutting back.
- **N58. Night Flight** (2.5 s). He hangs for a beat, then drops upward: three beats and he is
  a shape against the ceiling, his shadow racing on the floor. Each dive is a folded-wing
  streak down, a claw mark the size of the ring, and a snap back up with a barrel roll. The
  last dive lands in the cape pose with a slow fold of the wings. Sanguine: each dive plucks a
  foe up; a bite at the top; it falls. Phantom: the room dims to ink; only his eyes show,
  circling; then one streak.

### Blood

- **N59. Bloodbite** (0.44 s, passed). A lunge and the bite mark; rose threads to him.
  Rampage: three snaps, his head whipping. Phantom: bats, then the bite from behind.
- **N60. Open Vein** (0.5 s). One wing claw drawn slowly back, then a single fast line across
  the foe: one long thin mark that weeps. The foe leaves drops where it walks. Phantom: the
  line is drawn up its back; a beat later it opens all at once.
- **N61. Blood Lance** (0.6 s). He bites his own wing claw, draws a red thread out between both
  claws like a bowstring, and throws it: a thin spear with a spiral of drops. A thread stays
  from the first foe to him and pulses once. Rampage: three flicks. Phantom: he runs up the
  thread as bats.
- **N62. Bat Swarm** (0.5 s, today's). He throws both wings open and small bats pour out of
  his shadow. Rampage: they wheel round his shoulders and dart at whatever he hits. Phantom:
  they wrap him so only the cloud is seen.
- **N63. Blood Spikes** (0.8 s). He leaps and drives one claw into the floor; red crystal
  spikes burst in a running row, each taller than the last. They break into drops. Rampage:
  three stabs, three rows. Sanguine: the spikes stay like a hedge and melt back toward him.
  Phantom: spikes rise in a ring round one foe and lean in.
- **N64. Blood Mist** (1.5 s). He wraps his wings shut and comes apart as red mist with bat
  shapes turning inside it; two eye glints drift. He gathers out of it in the cape pose.
  Phantom: the mist is ink black.
- **N65. Boiling Blood** (0.4 s to start). He rakes his own chest ruff, throws his head back in
  a silent screech; a red haze rises off his wings and his eyes burn rose. Each claw throws a
  small splash. Phantom: no haze; he flickers.
- **N66. Blood Moon** (1.6 s, today's, grown). He rises slowly with wings spread; a red moon
  swells behind him; he claps his wings and a sheet of dark falls with two shock rings; a
  thread runs from every foe to him. Sanguine: the moon stays and the threads stay. Phantom:
  a black disc slides over the moon; the room goes dark and he is gone.

### Night

- **N67. Dusk Dive** (0.56 s, passed). Wings fold, a falling streak, a rose star where he
  lands. Rampage: each landing bounces him into the next dive. Phantom: no streak: he is
  simply there, behind.
- **N68. Blink Strike** (0.4 s). His ears flick to the target; bats; he is behind it with one
  wing claw already driven in; a single pale-edged mark. He looks back over his shoulder.
  Rampage: three places almost at once, three after-images fading. Sanguine: he rips the claw
  out sideways with a fan of drops.
- **N69. Flit** (0.4 s, today's). A back somersault into bats; ink puff where he was.
- **N70. Nightfall** (0.6 s, passed). The dome of ink and its floor sigil. Rampage: rose claw
  marks light up inside the dark one after another.
- **N71. Echo Screech** (0.42 s, passed). Ears flat, three pale sound fronts. Rampage: the
  fronts bounce off the far side and roll back. Phantom: one ring; a rose mark lights on each
  foe's back.
- **N72. Shadow Veil** (0.5 s, today's). Two dark wings shut round him. Rampage: he becomes
  three flickering after-images; a blow passes through one and a claw answers. Phantom: the
  wings shut and nothing is there.
- **N73. Roost** (0.3 s; the return 0.3 s). He kicks up and hangs upside down, wings folded,
  then drops out of a dark copy that stays hanging. The return: he scatters, the bats stream
  to the copy, and it opens its eyes.
- **N74. Death Mark** (1.0 s). He drops into the floor as ink; the foe's own shadow stretches
  behind it and he stands up out of it, one claw resting on its back: a rose sigil, a bat's
  skull, is left there. Each hit of his brightens it. At 3 s every claw mark he made on it
  re-opens at once.
- **N75. The capstone shows.** Carnage: N35. Blood Tithe: the small moon over his shoulder
  bursts into a ring of red blades. Killing Hour: his eyes burn, the screen edge darkens a
  little for the 4 s, and every mark is a backstab mark.

## 6. The damage formula (v1.2) on his kit

- **N76.** Types (formula D3 to D7):

  | His line | Type | A hit? | Form for 抗性 |
  |---|---|---|---|
  | basic claws and bites, skill strikes, dives, the dash under Rampage or Sanguine | 常规直伤 | yes | melee |
  | Crescent Wings, Blood Lance, Echo Screech | 常规直伤 | yes | ranged |
  | Wing Wheel, Blood Spikes, Blood Moon's burst, Nightfall, landings, Carnage | 常规直伤 | yes | area |
  | bleeds (Open Vein, forms, Open Wounds) | 持续伤害 | no | DoT |
  | Bat Swarm, pools, Blood Mist, the puff, the moon's drinking, Night Wings | 持续伤害, in a zone | no | DoT |
  | bat bites (F12 Rampage), ghost claws (T7), Boiling Blood's splash, the shade's burst | 附加伤害 | no | melee or area |
  | Death Mark's tear, Blood Tithe | 真实伤害 (source: a store) | no | none |
  | Blood Pact's cost | 生命消耗 | | |
  | comes back, Blood Drinker | heal, no crit | | |
  | Shadow Veil, the blood shield | shield, its own layer | | |

- **N77.** Zones:
  - 基础伤害区: every card number; Last Bite's double; Bloodbite's Rampage ramp; the 20% on a
    boss he cannot move (N19).
  - 暴击区: Nightcloak's sure crit on backstabs.
  - 增伤区 (all add): the passive's 20% (a backstab, a bleeding foe, or 15 Combo; once),
    Killing Pace, First Blood, Killing Hour, Blood Scent,
    Shadow Veil's Phantom 40%.
  - 易伤区: Echo Screech (25%).
  - 防御区: Nightcloak ignores half on backstabs.
  - 真实伤害: Death Mark keeps 35% (50% under Phantom) of the final damage he dealt to the foe
    (formula D23, source 4). So the team's 易伤 and his own crits are already inside it.
- **N78. Why this fits.** Small foes have no defence, so on 脆皮 foes Phantom's edge is the sure
  crit and the First Blood opener. Elites, champions and bosses have defence (25, 40, 50):
  there his 无视防御 and Death Mark's true damage are his "penetrated damage".
- **N79. Dodge** sits at the first step of the order (formula D15): no damage, no effect.
- **N80. 控制.** Blind, the stuns (Skyward Rip's and Pounce's Phantom forms) and the slows
  follow D35. Launches, pins by movement and the carry of Night Flight's Sanguine form are
  movement. Open Wounds and every bleed lock his 增伤 when applied (D26).

## 7. AI seat, sound

- **N81. AI seat.** Target order for all styles: shooters, casters and healers first, then the
  lowest health, never a boss's wind-up. He may leave the team by up to 8 u for a kill and
  comes back after it.
  - Rampage: stays on a pack and keeps hitting; keeps Flit and the dash for floor warnings.
  - Sanguine: fights on; pulls out at 20% health instead of today's 35%.
  - Phantom: waits 4 u out of the fight, Unseen, until three of his skills are ready; picks
    the back-line foe; spends everything; leaves with Flit, Roost or the dash; waits again.
- **N82. Sound.** A claw: a dry rip. A backstab: the rip and a crack. A blink: a leathery
  flutter, in and out. A bleed: a soft drip. A drink: today's rising breath. The Combo: the
  rip rises a step each five points. Unseen: the room's sound dulls a little for the player.
  Carnage: silence for 0.3 s, then every rip at once.

## 8. For the page and the build

- **N83. The model.** His rig is 19 bones; on the first page version the wings could not unfold
  and the mouth did not open. Wing Wheel, Night Flight, Crescent Wings and the cape pose need
  spread wings; the bites need a jaw or the passed bite mark doing the work. The page thread
  should check this first and say what the rig needs.
- **N84. New moves** (beyond the passed set): the cape pose, the hang, the flat spin, the
  rising claw and air cuts, the lunge bite, the pounce and maul, the wing clap, the take-off
  and dives, the self-bite and thread throw, the floor stab, the mist, the shade.
- **N85. Things to show.** The Combo number and after-images, a dodge, Unseen (how the player
  sees himself), a backstab mark beside a plain mark, the bleed, threads, the blood shield
  rim, the shade, the small moon of Blood Tithe.
- **N86. Order for the page.** Base forms first (24 clips, the passive, basic attack, dash),
  then one style at a time.
- **N87. For the build.** New machinery: a facing test for hits, the Combo count, a per-seat
  animation speed, a dodge roll, an untargeted state, a damage-over-time status, kept keys
  (the hold and the two second presses). Each goes in the module that owns the job.

## 9. The record

- **N88. Guessed:** every number; the 120° back; the 2 s kill window; the Combo's 3 s; that
  Unseen comes after 2.5 s; the blood shield's 24 and 6 s.
- **N89. Night Hunger** (today: every blow feeds him 8%) is not in the base kit: leech is the
  Sanguine style (pick 2a). Blood Drinker's 15% is its heir. The Blood skills keep today's
  shares (Bloodbite 50%, Bat Swarm 25%, Blood Moon 35%).
- **N90. Blood Scent** changes: today it is an aura (2 a second to the 2 nearest within 2.6 u,
  each exposed 15%), nearly the same as Night Wings. Now it is the hunter's nose (F26). Its
  red wisp look stays.
- **N91. Not touched:** his eight draft nodes (Deep Dive, Thirst, Gloom, Ambush, Echolocate,
  Frenzy, Vampire, Eclipse), his relics (Ripe Fig, Moonless Fang), his deeds (Lights Out still
  counts blinds). Dusk Dive's Sanguine form was kept away from Ripe Fig's rule on purpose.
- **N92. Pool count.** 11 from the game, 15 new: Thousand Claws, Wing Wheel, Skyward Rip, Last
  Bite, Pounce, Crescent Wings, Night Flight, Open Vein, Blood Lance, Blood Spikes, Blood Mist,
  Boiling Blood, Blink Strike, Roost, Death Mark.
- **N93. Spares** (not in the pool): Hemorrhage (marks on every foe near him that burst after
  3 s), Feast (a channel that drains every foe within 3 u), Flicker (blinks foe to foe, a cut
  each; left out because Ashfang's Thousand Cuts and his own basic attack do it), Fang Marks
  (the passive of pick 1b).
- **N94. Other heroes.** Ashfang lost his combo count on Kesh's word; Duskwing's Combo is a
  different thing: a count that only speeds him, never a currency to spend. Stonehide's Blood
  Price burns health for damage; Blood Pact burns it for a cast.
- **N95. Names.** Chinese names are mine; the page thread may improve them. "Frenzy" and
  "Thirst" are node names today, so no talent or skill uses them.
- **N96. Kesh's picks, 2026-11-18 17:09 Singapore time
  (cmsg_01T9kVc7qNub7xZ7DH6oTE5yWFJnRXCsYGcWMbrNWeMbzw):** "1a, the backstab bonus apply to
  bleeded target and reached X combo too, so the other 2 play style also benefit from it. 2a 3b
  4a 5a 6a 7a. A1 a A2 a A3 b A4 b A5 b".
  - 1a with his rule: N7, N97. 2a: N89. 3b: N12, N22. 4a: N24. 5a the names. 6a: blood is the
    dark red of his passed claw marks with a Dusk Rose glow; never Foe Crimson's hue on a
    glow or a floor shape (for the page thread to hold). 7a the pool, judged again on the page.
  - A1a: N10. A2a: each tenth of a champion's or boss's health that his own damage takes is a
    kill for Night Hunt and its three shapes (N8, N9). A3b: N13. A4b: N11. A5b: N23.
  - The combos: closed at 19:05, N98.
- **N97. The 20% for every style.** His words: the backstab bonus also applies to a bleeding
  target and at X Combo, "so the other 2 play style also benefit from it". Sanguine bleeds
  through its forms (Wing Wheel, Bloodbite, Blood Spikes; Nightfall drinks since
  1.3, Talon Rake became Hawk Drag in 1.4) and Open
  Wounds; Rampage lives above 15 Combo; Phantom has the back. X is 15: half of the Combo's
  top, about 3 s of fighting in a pack. Confirmed, with the 20%-only reading of N7: Kesh,
  2026-11-18 19:15 Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5yRFo4mGQhGdspamqttjnzNu), "1 ok",
  to the coordinator's question in the project chat.
- **N98. The twelve combos.** Kesh, 2026-11-18 19:05 Singapore time
  (cmsg_01T9kVc7qNub7xZ7DH6oTE5y4hGaiQp4CJRbrf3wh6mz2D): "all". C1 to C12 are in kit section 6.
  - A bleeding foe (C1, C8, C9) is one with any bleed of his: Open Vein, a Sanguine form's
    bleed, or Open Wounds. C1 ends the bleed it brings out; it is 持续伤害 paid at once, so it
    does not crit and is not a hit.
  - C2 is Windbriar's Spike rule: it ends the launch, and it works on foes she or anyone else
    launched. On a foe that cannot be launched there is no air, so no C2.
  - C3: with no marked foe in reach the swarm and Night Wings bite as usual.
  - C4: the blind starts again from its own length, 2 s at most (today's top).
  - C5: the shade's copies are not casts: no Combo, no kill cooldown cut of their own, no
    Carnage step. They take his style's form.
  - C6 needs the game to keep a pressed skill for the end of the dash (the same new machinery
    as Ashfang's Dash strike and Windbriar's Sky cast).
  - C7: the three that come out are not shots through the cloud again.
  - C8: "what comes back" is doubled for the skills' own shares and Blood Drinker alike, while
    he stands under the moon.
  - C9 with Open Vein's own rule (double while it moves): one doubling, not two.
  - C11 is today's Eclipse node as a kit rule; held together they do not add.
  - C12: the dives not yet made are lost; he lands on that foe.
  - To measure: C8 with Blood Drinker and Blood Tithe; C4 and C11 chaining blinds in a pack
    (every hit on a blinded foe is a backstab).
- **N99. New form options, not passed.** The ability page thread's review (18 Nov evening, after
  Kesh's "You can also work at other hero, if there is any changes, I will give feedback
  tomorrow", cmsg_01T9kVc7qNub7xZ7DH6oTE5yNPQyYNdZHSSXdbZk3njBWs) found twelve forms that repeat
  another card's idea. 22 options, R1a to R12b, are in `DUSKWING_NEW_OPTIONS.md`, shown on the
  page beside the passed versions. The kit is unchanged until Kesh picks.
- **N100. The new forms are in.** Kesh, 2026-11-19 06:47 Singapore time, on the ability page
  (cmsg_01T9kVc7qNub7xZ7DH6oTE5yLNCYUb5nhh24GbCh6Pr6kY): "I saw the new skill you add, those look
  good, use those". All 22 options, R1a to R12b, replace the passed forms in kit section 4 and the
  three combo lines (C1, C4, C12). What went:
  - Nightfall's Sanguine bleed (R12b): the threads drink instead. Nightfall is no longer one of
    the Sanguine forms that bleed (N97 now lists Talon Rake, Wing Wheel, Bloodbite and Blood
    Spikes, with Open Wounds and Open Vein).
  - Blood Spikes' Phantom "every hit on it is a backstab" (R3a), Echo Screech's Phantom "every
    foe shows its back" (R3b), Blink Strike's Rampage "three blinks" (R5b), Bat Swarm's Rampage
    follow (R7a), Roost's Rampage basic copies (R8a), Flit's Phantom 4.5 u away (R2b), Shadow
    Veil's Phantom +40% opener (R2c), the four "behind the foe nearest the pointer" Phantom
    targets (R1a to R1c, R4a).
  - The motions in N46 to N75 for these forms follow the page clips (v11 on), not the old text.
  - Kept the same: every other form, the passive, the talents and the other nine combos.
  - Words: a moved foe (R1c's swap) and an ally's +20% (R2b) or +40% (R3a) never give an ally a
    sure crit. Under formula D18 the ally's 20% and 40% go in that ally's 增伤区 for that hit.
- **N101. Three re-designs.** Kesh on the ability page, 2026-11-19 22:37 to 22:38 Singapore time:
  "Talon Rake: re-design entirely", "Thousand Claws: re-design entirely", "Pounce: rampage style:
  re-design"; his picks, 22:54 (cmsg_01T9kVc7qNub7xZ7DH6oTE5yT5zKhosvdsWbe2u33EZMMi): "1b, 2b, 3c".
  - F1 is **Hawk Drag 鹰掠** (option 1b), F2 is **Hanging Claws 悬爪** (2b), and Pounce's Rampage
    form is the **Ride 骑兽** (3c). Full rules and motions: `DUSKWING_REDESIGNS.md`; the old
    motions N51 and N52 and the old Pounce Rampage line are replaced by them.
  - Names that read the old cards: Talon Rake and Thousand Claws in N32 (Wingspan), N39 and
    combo C9 now mean Hawk Drag and Hanging Claws. C9's "knocked back, launched or carried"
    covers Hawk Drag's drag and fling. Wingspan (T10) makes Hawk Drag's skim and Hanging Claws'
    fan 30% longer and wider.
  - Hanging Claws adds a second press (N20: Roost, Dusk Dive under Rampage, Hanging Claws).
  - Hawk Drag's wall hit (10, stun 0.5 s) is his own rule, like Windbriar's Wall slam.
  - The Ride: the ridden foe is moved, so a taunted foe walks back to the tank when he leaps off
    (Windbriar's rule A1b). Crashes are 常规直伤, area.
  - The 1.3 Sanguine bleed sources (N97, N100) lose Talon Rake; Hawk Drag's blood trail is a
    zone, not a bleed.
- **N102. Cloak Turn 翻袍 replaces Hanging Claws.** Kesh on the ability page, 2026-11-19 23:51
  Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5y63khMeHhiWvEj4uyoFprHe): "Hanging Claws: re-design
  all"; his pick, 2026-11-20 08:53 (cmsg_01T9kVc7qNub7xZ7DH6oTE5yUdqp4o6CoWvMmYp37dfTBw): "2d".
  F2 is now Cloak Turn; full rule and motion in `DUSKWING_REDESIGNS.md` section 4.
  - Hanging Claws' second press is gone with it (N20 is back to Roost and Dusk Dive under
    Rampage). It is no longer a Sanguine bleed source.
  - A caught shot does no damage to him and is not a hit on him (it does not end Unseen; under
    Rampage it is not dodged, it is caught). Only foe projectiles are caught; melee and floor
    warnings are not.
  - The returned shards: his 常规直伤, ranged, the shot's own damage + 8; on a boss shot they go
    back at the boss. The streak to the shooter is a movement: it stops at walls and never ends
    on a floor warning (N18). With no shooter left alive he does not streak.
  - Wingspan (T10) widens the cape's catch by 30%. Combo C6 and Hawk Drag are unchanged.
  - AI seat: casts it when a shot is in flight toward him or the tank within 2 u, or a shooter is
    the target he is hunting.
