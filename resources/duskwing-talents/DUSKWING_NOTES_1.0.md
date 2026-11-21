# Duskwing: design notes

**Version 1.0, 2026-11-18. Design only.** The details behind `DUSKWING_KIT.md` (lines K, T, F).
Every line here has a number (N1 to N96). All numbers are first guesses until measured in play.

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
  last counted hit. The number is shown beside him and on the HUD and has no top (×87 is fine);
  the Rampage talents stop reading at 30. The hit sound rises a step every five points.
- **N11. Dodge 闪避 (T1).** A hit thrown at him has that chance to miss: no damage, no effect.
  He flickers aside as two or three small bats and a "miss" shows. Rolled on the seeded stream.
  Floor beds and damage over time cannot be dodged.
- **N12. Faster moves (T1).** A skill started at N Combo plays at 1 + N/30 speed for its whole
  length (so it does not change speed mid-move), every hit landing sooner, same damage. Moves
  with a set time (Blood Mist's 1.5 s, Night Flight's 2.5 s, zones) keep their time; only his
  own motions speed up. The basic attack is not sped up (pick 3a).
- **N13. Unseen 隐身.** Foes do not choose him and drop him as a target; a foe mid-attack
  finishes it where he was. It ends with his first hit or damaging cast, when he is hit, or
  when its time runs out. That first hit is a backstab from any side. Floor warnings, beds and
  area hits still hurt him. To the player he is a dark glass shape with two rose eye glints; to
  co-op friends he is half faded. When he is the only hero standing, Unseen lasts 2 s at most.
- **N14. Bleed 流血.** 持续伤害 on one foe. One bleed for each skill that gives one; the same
  skill again restarts it. Open Wounds (T5) keeps its own record: each hit adds 25% of itself
  to an amount that drains over 3 s.
- **N15. Comes back.** A heal on him equal to that share of what the skill dealt after the
  formula. It does not crit. With Blood Drinker the shares add (Bloodbite: 50% + 15%).
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
  2.5 s at full stack, full damage"). The trade: no heal, no shield; an empty Combo is a slow,
  fragile bat.
- **N23. T2 Blood Drinker 饮血 (Sanguine).** Every skill takes its Sanguine form. 15% of all the
  damage he deals, of every type, comes back as health; overheal fills the blood shield (N16).
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
  4. Blood Drinker with Blood Tithe: about 270 damage dealt fills the store. In a pack that is
     a 40 true-damage ring every 10 s or so.
  5. Nightcloak with Killing Pace: waiting 3 s loses the Combo, so Killing Pace is weak for a
     hero who waits. A free pick, not a trap the picker hides.
  6. Nightcloak, First Blood and Killing Hour: 20% + 30% + 30% in one zone (80% more), a sure
     crit and half the defence ignored, for 4 s. The burst build; the first thing to measure.
  7. Twin Fangs with Carnage: more counted hits, so Carnage comes sooner.
  8. Shade with Nightcloak: he is almost never the target. He also deals nothing while unseen.
  9. Open Wounds with Blood Drinker: the bleed leeches too.
- **N40. Budget** (docs/TALENTS.md: tier I about 20% more output in its style, one whole path
  about 50%, no mix above 70%). Two tier I talents are over it as written and are built as
  Kesh asked: Bloodrush at full Combo roughly doubles his skill output, and a Phantom backstab
  is 1.2 × 1.5 = 1.8 times a front hit. What holds them back is the build-up (30 hits, lost in
  3 s) and the positioning. If play shows them too strong, the levers are the Combo's top speed
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
  - 增伤区 (all add): the backstab 20%, Killing Pace, First Blood, Killing Hour, Blood Scent,
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
- **N96. The audit and the combos** are in their own files; their picks will be written in
  here when Kesh answers.
