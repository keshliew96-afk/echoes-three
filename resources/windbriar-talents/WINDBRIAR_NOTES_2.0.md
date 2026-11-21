# Windbriar: design notes

**Version 2.0, 2026-11-19. Design only.** The details behind `WINDBRIAR_KIT.md` (lines W, T,
F). Every form is in full in section 10 (N102 to N104). Older text is kept as
`WINDBRIAR_NOTES_1.x.md`; what changed when is in N93 and N94. All numbers are first guesses
until measured in play.

## 1. The ask and how I read it

- **N1.** Kesh, 2026-11-18 12:35 Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5ySjvZFWTKwcZYXFqajkHUbr):
  "windbriar, can refer idea from Dota windrunner hero, or dragonnest archer. The play style:
  1. Single target high damage, like charge shoot, aim shoot, sniper-like play style 2. multi
  target medium damage, good at 清杂怪, 范围射击, 箭雨 and etc 3. melee play style, like 枪斗术 it
  control wind to 聚怪, kick foes, 位移, short range arrow shoot quickly. The element, bow, arrow,
  fancy kick skill, wind, 弓斗术".
- **N2.** Pattern taken from Ashfang 2.x: one pool, a base form for each skill, and the tier I
  talent re-shapes every skill. Unlike Ashfang's Will path, all three of her paths have forms,
  so every pressed skill reacts to all three styles (72 forms on 24 skills).
- **N3.** Pattern taken from Stonehide and Ashfang: the passive must serve all three styles.
  Tailwind does (Kesh's pick 1b): the speed helps every style, and the style gives the Gale
  Arrow its shape (W5). The briar passive of 1.0 is kept in `WINDBRIAR_KIT_1.0.md`.
- **N4.** Kept from the game: all eleven skills she has today, with today's numbers. Three are
  renamed and two re-shaped (N86). The eight draft nodes of hers (Skewer, Concussive, Steady
  Aim, Disengage, Scatter, Heartseeker, Prey, Longshot) are not touched by this design. The
  talent T4 shares a name with the Heartseeker node; rename one when it is built.
- **N5.** Kept from her model page (passed 13 Nov): the three-shot combo with the flat bow, the
  somersault dash with three homing arrows, power shot, sky volley, trap, feather fan, vault shot.

## 2. Kit rules

- **N6. Tailwind 顺风.** Each pressed skill gives one Tailwind as its cast ends: 6 s, three at
  most; a new one sets all of them back to 6 s. Each is 5% run speed and 5% attack speed (a
  faster basic combo and faster draws). Passives, the capstone shows and what a form adds give
  none. Seen: three jade feathers of wind circling her bow arm; three pips on the HUD.
- **N7. The Gale Arrow 风矢.** With three Tailwinds, the last shot of her next basic combo is
  the Gale Arrow and the three are spent: one great wind arrow in place of the flat bow's three,
  7 u through every foe: 30. A skill cast in between does not lose it.
- **N8. Its shape in each style.** Deadeye: her next full drawn basic shot is the Gale Arrow;
  it stops in the first foe: 42, ignoring its defence. A tap keeps the Tailwinds. Volley: it
  breaks on the first foe (20) into seven wind arrows that fan out 4 u behind it: 10 each. Gale:
  the flip kick of her form throws a ring of wind, 3 u: 24; the foes are pulled 1 u to her and
  launched 0.5 s.
- **N9.** The Gale Arrow is 常规直伤 and a hit. Under Deadeye it is a single arrow (T4), under
  Volley a wide hit when it reaches three foes (T5), under Gale a close hit (T6). Budget: 30 for
  each three casts plus the speed, about what Ashfang's ghost swords give.
- **N10. The draw 引弦 (pick 2b: hold to charge).** Power Shot, Skypiercer and the Deadeye
  basic shot are drawn by holding the key (the attack button for the basic shot). Letting go
  looses. A tap looses at once for half; the damage climbs with the hold to the full number at
  the full draw time; she can hold a full draw 2 s more, then it looses by itself. While
  drawing she walks at half speed, the aim follows the pointer, and a jade aim line shows and
  narrows. The dash does not cancel a draw (combo C10): while the key stays held she keeps
  drawing through the somersault. Letting go in the dash looses upside down.
  - Cast modes: in mode 2 (hold shows the area, let go casts) the hold is the draw. In modes 1
    and 3 these two skills still draw while the key, or the confirming click, is held. A note
    for the cast modes build.
  - Drawn shots inside a flip or a stream (Deadeye Split the shaft, Hang time, Running draw)
    are full draws with no hold.
  - Two Deadeye forms add to the hold: Power Shot's Sweet spot (a window at the end of the
    draw, D2) and Feather Fan's Closing fan (held like Power Shot, D17).
  - Volley Scatter draw keeps the hold (V2); Gale Kick-off has no draw (G2).
- **N11. Words the talents use.**
  - A **single arrow** (T4): an arrow that damaged exactly one foe. An arrow that went through
    two foes is not one. Rains, rings and bursts are not arrows.
  - A **wide hit** (T5): one release (a fan, a ring, a burst, one half-second of a rain, one
    piercing arrow) that damaged three or more foes; each of them takes the 25%.
  - A **close hit** (T6, T9): a kick, a bow strike, or an arrow that hits a foe within 2 u of
    her.
  - A **drawn shot**: an arrow with a draw (N10): Power Shot, Skypiercer, the Deadeye basic
    shot, Deadeye Closing fan, and the forms that say "full drawn".
- **N12. Movement.** A step, flip or kick dash of a form is untouchable only where the line says
  so. It stops at a wall and never ends on a floor warning or a floor bed: she lands on the
  nearest clear spot. The dash cancels any of them; hits already landed stay.
- **N13. Kicks and small stuns.** A launch, push or pull is movement, not a stun. The 0.3 to
  0.4 s stuns in the Gale forms do not start the 2 s stun guard and do not land on a foe inside
  it (the fix Ashfang and Stonehide already use).
- **N14. Bosses.** A boss cannot be pushed, pulled, launched, carried or tied. When one of her
  moves fails to move a boss, that hit deals 20% more (the kits' rule; formula pick 13a). Her
  stuns and slows on a boss last 20% of their time (formula D40): Pinning Arrow's 0.75 s is
  0.25 s.
- **N15. Pinning Arrow's tie.** The second foe must be within 2.5 u behind the first, within 30°
  of the arrow's line. A wall counts; Stonehide's slab and Stone Ring count as walls.
- **N16. Kill Shot.** "Ready again" needs the kill to come from the Kill Shot itself.
- **N17. Stances.** Eagle Stance has no second press. It ends when she walks, dashes or is moved,
  or after 4 s. Skills can be cast from it without ending it if they do not move her.
- **N18. No second presses and no extra keys.** A key is held only for the draws of N10.
- **N19. She has no heal, no shield and no damage over time.** A rain is a row of area hits. A
  wind wall, lane or twister is a row of area hits. Her one damage cut is 风护, under
  Bow Dance (N22).
## 3. Talents in full

### Tier I, Style (free)

- **N20. T1 Full Draw 满弦 (Deadeye).** Every skill she holds takes its Deadeye form. Her basic
  shot is a drawn shot: hold attack; a tap is 12, a full draw (0.75 s) is 26, reach 6.5 u,
  through one more foe at full strength. The trade: fewer, slower arrows; packs are slow to clear.
- **N21. T2 Split Arrows 分矢 (Volley).** Every skill takes its Volley form. Basic shots one
  and two split in three: the middle arrow 12, the side arrows 6 at 15° each side. The last shot
  is five arrows of 6. The trade: a lone foe is only hit by the middle arrows.
- **N22. T3 Bow Dance 弓斗术 (Gale).** Every skill takes its Gale form. The basic attack is the
  five-beat form (N57). Her arrows reach 3 u at most. **风护** (audit A6a): she takes 20% less
  damage while a foe is within 3 u of her. The trade: she fights inside the pack with 80 health.
### Tier II, Power (20 Embers)

- **N23. T4 Heartseeker 破的.** A single arrow (N11) deals 25% more.
- **N24. T5 Hail 密雨.** A wide hit (N11) deals 25% more to each foe. A champion or a boss
  counts as three foes (audit A5a).
- **N25. T6 Iron Leg 劲腿.** A close hit (N11) deals 25% more.

### Tier III, Trick (40 Embers)

- **N26. T7 Through the Heart 穿心.** An arrow that fells a foe is not spent: it turns to the
  nearest foe within 5 u and hits it for the same damage. It goes on as long as each hit
  fells, with no limit (audit A4b). Not rains, rings or bursts.
- **N27. T8 Falling Feathers 余雨.** A foe felled by her drops a small rain where it stood 0.3 s
  later: 8 to every foe within 1.5 u. A rain's kills drop rains too; at most one for each 0.3 s
  on the same spot.
- **N28. T9 Slipstream 借风.** A close hit readies her dash at once, at most once a second. The
  first arrow she shoots within 2 s after a kick or bow strike fires at once, with no wait, and
  goes through one more foe (1.4: it was 30% more, which copied Deadeye Windrun).
### Tier IV, Reach (60 Embers)

- **N29. T10 Far Sight 千步.** Arrows and the spots she can aim a rain at reach 35% farther;
  arrows fly 40% faster; the view pulls back about 10% (each player's own view in co-op). Not
  kicks, pulls or winds.
- **N30. T11 Wide Sky 遮天.** Fans cover 30% more angle; rings, bursts and rains are 30% wider.
  Same arrows, same damage.
- **N31. T12 Long Wind 长风.** Every pull, drag and wind reaches 30% farther (Windknot and its
  forms, Tornado Shot and its forms, Breakdance, Haul, Wake, Lone wolf's push, the Gale Arrow's
  ring). The dash, Vault Shot, Eagle Dive's reach, every step, flip, hop and kick dash of a
  form, and every distance a kick sends a foe go 25% farther.

### Tier V, Capstone (80 Embers)

- **N32. T13 Hundred Paces 百步穿杨.** When she has given no walk input for 1 s (shooting, drawing
  and Eagle Stance are fine), the first arrow of her next arrow skill is perfect: a sure crit
  with 50% more crit damage, it goes through every foe, and it ignores defence. Then the 1 s
  starts again. Seen: a thin ring closes on her and her ears prick; the perfect arrow is white
  with a jade halo and stops the frame for 0.1 s on its first hit.
- **N33. T14 Ten Thousand Arrows 万箭齐发.** Every 6th skill press, 0.5 s after that cast, the
  sky opens over the whole room for 3 s: each foe is struck four times, 6 each. It is not a
  cast and gives no Tailwind.
- **N34. T15 Hurricane Dance 飓风舞.** Every 6th skill press, after that cast, a jade cyclone
  wraps her for 4 s: each kick or bow strike of hers also hits every other foe within 3 u for
  half (常规直伤, area; it is not a kick, so it gives no Iron Leg or Slipstream of its own). A
  boss is hit as any foe. It moves nothing. Not a cast, no Tailwind. Seen: a slim jade cyclone
  turns round her waist, and each strike throws a jade arc out to its rim. Sound: a steady low
  howl. (1.5 lifted the pack, which copied Gale Haul and Scatter launch; 1.4 flung foes out,
  which copied Breakdance; 1.3 pulled them in.)
### Checks

- **N35. Every talent works alone.** T4: base Piercing Shot's last foe, Hunter's Mark, Pinning
  Arrow, Rapid Fire, Kill Shot and every basic shot are single arrows. T5: base Rain of Arrows,
  Whirl Shot, Burst Arrow, Arrowstorm in a pack. T6 and T9: an arrow within 2 u is a close hit,
  so a hero with no kick still has them. T7: any arrow. T8: any kill. T10 to T12 name base
  things. T13: any arrow skill. T14, T15: any skill press.
- **N36. Mixes checked.**
  1. Full Draw with Hail: a few Deadeye forms reach many foes (Piercing Shot's Flank line,
     Sky Bolt's edge, Sticky charge's 18, Gathered quiver's curtain), and a boss counts as
     three, so Hail is weak but not dead under Full Draw.
  2. Split Arrows with Heartseeker: each split arrow that hits one foe is a single arrow, so
     the two work together on spread packs. Inside the budget.
  3. Bow Dance with Far Sight: her 3 u becomes 4 u. Small, honest.
  4. Through the Heart with Kill Shot: a kill readies Kill Shot and the arrow flies on. In a
     pack of weak foes one shot clears a line. Wanted; to measure.
  5. Falling Feathers with Ten Thousand Arrows: the room rain's kills drop small rains. Chain
     clears. Wanted; to measure.
  6. Slipstream with Bow Dance: every kata beat readies the dash once a second. The dash is
     untouchable; she is not while kicking.
  7. Hundred Paces with Eagle Stance: the stance counts as standing, so each skill cast from
     the stance is perfect after 1 s. The sniper's dream turn; to measure.
  8. Hundred Paces with Bow Dance: she rarely stands; she can still stop for 1 s behind the
     tank. Honest trade.
  9. The Gale Arrow with Hundred Paces: it is a basic shot, not a skill arrow, so it is
     never the perfect one.
  10. Hurricane Dance with Breakdance: each kick-out also hits every other foe within 3 u for
     half (4). The half-hits are not kicks, so Iron Leg adds only to the kick itself. Fine.
  11. Pain link with Through the Heart: a linked foe felled by the share is not felled by an
     arrow, so T7 does not fly on from it. No loop.
  12. Spotter wheel with Ten Thousand Arrows: the room rain's hits drop the wheel's arrows at
     most one each 0.2 s (D12), so the wheel empties in 2.4 s. Wanted.
  13. Gathered quiver with Hundred Paces: the perfect arrow gains the +45 and then crits.
     The biggest Deadeye shot (Sweet spot's 77 plus 45, then the perfect crit); to measure
     first.
- **N37. Budget** (docs/TALENTS.md): tier I about 20% more output in its style; one whole path
  about 50%; no mix above 70%.

## 4. The basic attack and the dash

- **N38.** Base combo 12, 12, 3 × 6 (42), reach 4.5 u; the game's own shot today is 12.
- **N39.** Deadeye: 26 a drawn shot (52 in the time of one base combo, on one foe).
- **N40.** Volley: 24, 24, 30 if every arrow hits; 12, 12, about 12 on a lone foe.
- **N41.** Gale: 8, 8, 8, 5 + 5, 10 + 6 (50), all within 3 u; the back kick pushes 0.5 u, the
  flip kick launches 0.3 s (N13) and it is the kick that throws the Gale Arrow's ring when Tailwind is full (N8).
- **N42.** The dash is the passed one. Its three arrows are 5 each (my guess; the page does not
  give a number).

## 5. Motions

**The lines here are the base motions. Every form's own motion is in section 10 (N102 to N104).**

- **N43. The bar** (Kesh's video refs for Ashfang, same level here): every skill is a small
  choreography: a ready pose, the shot or kick, a flourish, an end pose held a beat (残心). The
  body leaves the floor often. Every beat has one big readable shape: a long streak, a fan, a
  falling curtain, a wheel of spokes, a spiral tunnel, a twister.
- **N44. Her own gestures.** The arrow twirl (arrows roll over the back of her paw from the
  quiver). The flat bow, palm down, for fans (passed). The hare's kick: both hind paws,
  straight-legged, body thrown back. Shooting upside down in a flip. The bow spun as a staff.
  Ears and scarf trail every turn and settle a beat late.
- **N45. Length.** Quick skills 0.5 to 1.0 s, big ones 1.4 to 1.8 s. The dash cancels any beat.
- **N46. Looks.** Arrows are Feather Bone streaks; wind is Wind Jade. Deadeye: one thin bright
  line and tight rings. Volley: many thin streaks, ranks and wheels. Gale: jade arcs off her
  hind paws and the bow tips. No Ember, no Violet; effects dim and readable.

### Shot

- **N47. Piercing Shot** (0.6 s). A side step, the bow upright; one ear folds back out of the
  string's way as she draws along her cheek. Loose at 0.25 s: a long bone streak with a jade
  thread spiralling round it. The bow spins once round her paw off the release. End: bow arm
  out, draw paw open behind her ear.
- **N48. Power Shot** (1.3 s). She plants a hind paw back and sinks low. Wind is sucked into the
  arrowhead in a tightening spiral, dust runs along the floor toward her, her ears flatten, the
  string hums (0 to 0.8 s). Loose: the recoil slides her back 0.3 u; a wind tunnel with rings
  along it; a groove of blown dust. She straightens slowly and flicks her ears.
- **N49. Hunter's Mark** (0.5 s). Two fingers drawn across her eyes, then pointed at the foe; a
  snap shot without looking down the shaft. A reticle of three jade feathers closes on the foe.
  End: the finger still pointing.
- **N50. Pinning Arrow** (0.7 s). A hop; she shoots steeply down from the top of it. The arrow
  nails the foe's foot to the floor; a jade cord whips from its nock to the foe or wall behind
  and pulls taut. She lands and tugs the line.
- **N51. Rapid Fire** (1.7 s). A fistful of arrows between her fingers, the bow tilted. Ten
  shots, the draw paw a blur, an ear rocking with each. The last is loosed out of a full spin.
  End: the empty paw fanned out, wind curling off the string.
- **N52. Kill Shot** (0.8 s). She tosses one arrow up, spinning, and catches it on the string as
  she turns side-on. A breath; the light dims a touch round the foe. Loose at 0.45 s: one white
  streak, dead straight, no wind. On a kill the same arrow curves back up into her paw: that is
  the skill made ready.
- **N53. Eagle Stance** (0.4 s to settle). She slides down onto one haunch, the bow resting
  level across her raised hind paw, ears pinned forward like a sight; a jade aim line and a
  small ring at the pointer. Each shot rocks her back. Out: she springs up with a twirl of the
  bow.
- **N54. Skypiercer** (1.8 s). She leaps straight up and hangs, bow fully drawn; wind coils into
  a great jade drill round a bone-white arrow three times her length (0.3 to 1.0 s). Loose: the
  drill bores along the floor, a spiral tunnel with the dust lifted in a helix and foes tumbling
  inside; the recoil flips her backward once. She lands on one paw, bow behind her back.

### Rain

- **N55. Volley** (0.6 s). Three arrows fanned between her fingers, the bow flat, loose at 0.25
  s, then a half turn on her toes with her ears wrapping round.
- **N56. Rain of Arrows** (1.0 s to the first arrows). She leans far back, one hind paw up,
  shoots one arrow that splits into a flock high up; her head follows it. Arrows fall in slanted
  lines, stand in the floor a moment and fade; jade ripples on the floor.
- **N57. The Gale basic** (1.5 s): the lower bow limb sweeps low; a hip shot; a spinning back
  kick with both paws; two hip shots across her body, left then right; a jump, a flip kick, and
  a shot straight down from the top of the flip. She lands in a crouch.
- **N58. Burst Arrow** (0.9 s). She rolls the arrow along the string, its head wound with a knot
  of wind, and lobs it. It sticks upright, feathers shivering, the knot tightening with a rising
  whistle; it bursts at 0.8 s: a flat ring and six feather shards skimming out.
- **N59. Whirl Shot** (0.8 s). She sweeps a fan of arrows out of the quiver in a full-arm
  circle, spins once on the toes of one hind paw with the bow flat, loosing all round; twelve
  streaks draw a spoked wheel on the floor. She stops dead facing her aim; her ears swing on.
- **N60. Ricochet** (0.5 s, then the flight). A low skimming shot behind her back, looking over
  her shoulder. The arrow rings off each foe with a bright tick and a jade spark and draws a
  zigzag. She holds the pose until the last hop.
- **N61. Tornado Shot** (0.7 s). She spins the arrow on a fingertip until wind winds onto it
  like thread on a spindle, and shoots. A slim jade twister rises where it lands, arrows
  circling inside it like a carousel and flicking out at foes; it ends by unwinding upward.
- **N62. Briar Trap** (0.6 s). She stabs an arrow into the floor with a hop and a double pat
  (passed). A bone-white briar vine coils round it and sinks. Snap: the vines whip up as a cage
  and hold the foes.
- **N63. Arrowstorm** (1.8 s). Two sprint steps and a slide on her haunches, bow drawn at the
  sky; one whistling arrow. It bursts overhead into a bright seam; arrows fall in ranks, the
  nearest rank first, marching away from her like rain crossing a field, each rank thudding in a
  line. She rises with the bow arm out as the last rank lands.

### Kata

- **N64. Feather Fan** (0.5 s, passed). Five arrows fanned, a sweeping flat release across her
  body, then she darts with her ears flat.
- **N65. Vault Shot** (0.6 s, passed). A backflip, the shot upside down at the top, a low
  sliding landing with one paw on the floor.
- **N67. Crescent Kick** (0.9 s). A step in, then a backflip with both hind paws scything up:
  a tall jade crescent, the foes lift. Upside down at the top she nocks and shoots the highest
  foe. She lands in a crouch, bow across her knees.
- **N68. Windknot** (1.0 s). She spins the bow overhead, round her waist and behind her back,
  wind streaming off both tips in jade ribbons. She thrusts the bow at the spot: the ribbons
  shoot out, wrap the pack and pull it tight; foes skid in on spiralling dust lines. She snaps
  the bow upright; the ribbons tie off and pop.
- **N69. Cyclone Kick** (1.0 s). Her free paw drops to the floor and she spins on it, hind paws
  wheeling (hits at 0.1, 0.4, 0.7 s); each turn she shoots one arrow from under her own leg;
  the wind ring grows each turn. The last kick is a double-paw thrust; she flips to her feet.
- **N70. Bow Sweep** (0.7 s). The lower limb strikes low, the upper limb reverses high, then
  she hooks the string behind the foe's guard, plants a paw and snaps: the arrow fires at arm's
  length with a flat jade shock. The bow twirls back to rest.
- **N71. Windrun** (0.3 s to start). Two thumps of her hind paws (her passed foot thumps);
  small jade feathers at her ankles, ears streaming. She leans far into turns and leaves
  streaks; foes' shots bend round her with a puff.
- **N72. Eagle Dive** (1.5 s). A deep crouch, ears down. She rockets up; at the top she turns
  slowly head-down and looses five arrows in a spiral, one after another. She tucks, turns twice
  and comes down heel first: a jade ring and a crown of dust. She stands with the bow on her
  shoulder.
- **N73. The two capstone shows.** Ten Thousand Arrows: the room dims a little and arrows fall
  everywhere in ranks for 3 s. Hurricane Dance: a slim jade cyclone rises round her waist for
  4 s; each kick or bow strike throws a jade arc out to its rim (N34).

## 6. The damage formula (v1.2) on her kit

- **N66.** Types (formula D3 to D6):

  | Her line | Type | A hit? | Form for 抗性 |
  |---|---|---|---|
  | basic shots, skill arrows, dash arrows | 常规直伤 | yes | ranged |
  | the Gale Arrow (N7) | 常规直伤 | yes | ranged; area under Volley; melee under Gale |
  | rains, rings, bursts, shards, wind trails | 常规直伤, in a row | yes | area |
  | kicks, bow strikes | 常规直伤 | yes | melee |
  | Falling Feathers (T8) | 附加伤害 | no | area |
  | Kestrel Watch | 常规直伤, her damage | yes | ranged |
  | 持续伤害, 真实伤害, heals, shields | she has none | | |

- **N74. Zones.** The zone of every number is in N101 and on each form's line (N102 to N104).
- **N75. Why this fits.** Bosses have defence 50 (× 0.67) and 80% 效果抵抗. Deadeye is the
  boss path: 无视防御 (Hundred Paces, its Gale Arrow), 减防 (Armour break), Execute's triple,
  Big game, Sky Bolt on a slow boss, Pain link and Lone wolf to move damage onto it. Volley is
  plain 直伤 on foes with no defence, and Flare for the team. Gale's wind is mostly movement,
  which 效果抵抗 does not shorten but a boss ignores, so its boss answer is the 20% of N14.
- **N76. 控制.** Every stun, trip, root, net, stagger and slow of hers follows D35 (N95.3 for
  bosses, N95.6 for the small stuns). The Deadeye Interrupt is not a stun: it cancels a
  wind-up and never a boss's (D40). Pushes, pulls, launches, drags and carries are movement:
  full length on anything that can be moved.

## 7. AI seat, sound

- **N77. AI seat.** Deadeye: stands 5 to 6 u out, aims at the highest-health foe or the boss,
  stops walking to let Hundred Paces fill when nothing is near her. Volley: stands 4 to 5 u out
  and aims where the most foes are. Gale: fights within 3 u but only beside the tank or behind
  a foe the tank holds; never kicks into a boss's wind-up; keeps the dash for escapes. All:
  today's rules for leaving floor warnings. Each form's own line is in N102 to N104.
- **N78. Sound.** A drawn shot: a rising creak and a crack. A fan: a ripple of soft twangs. A
  rain: a hiss and dry thuds. A kick: a short whoosh and a thump. A Tailwind: a soft rising
  breath, higher for each. The Gale Arrow: a deep whoosh and a crack.

## 8. For the page and the build

- **N79. The model.** Her rig has no knee bones (22 bones). The kicks are written as
  straight-legged, both-paw kicks to suit it. If they read stiff on the page, the rig needs one
  knee bone a leg.
- **N80. New moves** (beyond the 28 passed): the draw-and-hold, the haunch stance, the 霹雳舞
  floor spin, the sky lean, the behind-the-back shot, the bow staff spin, bow strikes, the back
  kick, the flip kick, the axe kick, the bicycle kick, the overhead whirl and throw of a tied
  foe, the head-hop chain, the vault over a foe's head, the arrow-first spear dive, the grab
  and head-first slam, the high leap with the head-down turn, the ride on the spiral, the
  kick on the string, the volley kick of a trap.
- **N81. Things to show.** The three Tailwind feathers on her bow arm, the Gale Arrow in each
  style, the jade cord of the tie and of Pain link, the aim line, the Sweet spot glint, the
  Spotter wheel, the Sky Bolt reticle, the Flare, the wind lane and wall, the twister, the
  trap, the cage, the T15 cyclone, the kestrel (a small wind bird; today's effect).
- **N82. Order for the page.** Base forms first (24 clips and the passive), then one style at
  a time.

## 9. The record

- **N83. Guessed:** every number; the dash arrows' 5; the view pull of Far Sight; that a tap is half and a full draw may be
  held 2 s more.
- **N84. Kesh's picks, 2026-11-18 13:02 Singapore time
  (cmsg_01T9kVc7qNub7xZ7DH6oTE5yPaGPRXHzzToadUSgTYAV76):** "1b, 2b, 3a, 4a, 5a, 6a i will review
  again at ability page. A1b still can moves, if after moves the foes is still in taunt state,
  it will still go find the tank, A2b, A3a, A4b, A5a, A6a".
  - 1b: the passive is Tailwind (N6 to N9). The briars are gone, and with them Windcall, the
    passive skill Barbed Heads (Fleet Foot takes its place, N90) and Briar Trap's briars.
  - 2b: drawn shots are held (N10).
  - 3a the Gale basic; 4a the path names; 5a the three renames; 6a the pool, to be judged
    again on the ability page.
  - A1b: N88. A2b: N89. A3a: nothing left to rule, the briars are gone. A4b: N26. A5a: N24.
    A6a: N22.
  - The combos: closed at 13:07, N91.
- **N85. Pool count.** 11 from the game, 15 new: Power Shot, Rapid Fire, Kill Shot, Eagle
  Stance, Skypiercer, Ricochet, Tornado Shot, Arrowstorm, Crescent Kick, Windknot, Cyclone
  Kick, Bow Sweep, Windrun, Eagle Dive, Fleet Foot.
- **N86. Changed from the game's eleven.**
  - Detonating Charge is **Burst Arrow**: was a burning patch (12 a second for 3 s, 0.85 u);
    now one burst and six shards. She has no damage over time.
  - Sundering Nova is **Whirl Shot**: was 16 to four foes within 1.1 u; now a ring of twelve
    arrows to 3 u.
  - Barbed Trap is **Briar Trap**: same numbers, a new name.
  - Pinning Arrow gains the tie (Windranger's Shackleshot).
  - Kestrel Watch, Piercing Shot, Hunter's Mark, Volley, Rain of Arrows, Feather Fan and Vault
    Shot are as they are today.
- **N87. Spares** (not in the pool): Arc Shot (a lobbed arrow that showers and leaves arrows
  standing in the floor), Seeker (three homing wind arrows), Mirror Arrow (an arrow that
  becomes a copy of her that shoots for 3 s), and the briars of 1.0 (arrows that stay in the
  foe and are torn out).
- **N88. Pushes and the team (audit A1b).** Her pushes, launches and carries move every foe that
  can be moved, a taunted one too. Kesh: "still can moves, if after moves the foes is still in
  taunt state, it will still go find the tank". So a foe that is still taunted when it stops
  walks back to the tank by itself.
- **N89. Free juggling (audit A2b).** A launch has no guard: a foe can be launched again before
  it lands or as it lands. Bosses cannot be launched (N14); elites and champions can.
- **N90. Fleet Foot 脱兔 (passive skill F26).** After her dash, or any skill that flips, hops or
  dives her, her next three basic shots come 50% faster and deal 20% more. Under Bow Dance: her
  next three beats. Under Full Draw: her next three draws.
- **N91. The twelve combos.** Kesh, 2026-11-18 13:07 Singapore time
  (cmsg_01T9kVc7qNub7xZ7DH6oTE5yXScebW9hmPupPfQ4ub4CBv): "All combo". C1 to C12 are in kit
  section 6.
  - A foe in the air (C3, C4) is one launched by her, by Ashfang or by anything else; with free
    juggling (N89) the Gale loop is kick up, shoot, kick again, spike.
  - C4's Spike ends the launch: the foe is on the floor after it.
  - C5: the three arrows that come out are not arrows through the twister again.
  - C9: one Burst Arrow is set off once.
  - C10 does not count as standing still for Hundred Paces.
  - C11 needs the game to keep a pressed skill for the top of the dash (the same new machinery
    as Ashfang's Dash strike).
  - C12: while Windrun lasts the Gale Arrow can still be spent; Windrun then fills her again
    only on its next cast.
  - To measure: C3 with Iron Leg and free juggling; C12's uptime with cooldown nodes.
- **N92. Eagle Stance's Gale form is a 霹雳舞.** Kesh on the ability page, 2026-11-18 16:09
  Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5y8Eixkm4thHsxn4Mhfqfxdg): "Eagle Stance: gale
  style: the windbriar play 霹雳舞 with wind vfx to slowly drag foes to it, then get kick out
  and drag again. the foes fly back due to getting kicked, also hurt foes along the way". It
  replaces the crane stance of 1.0.
  - For 4 s she spins on the floor. Her wind drags every foe within 4 u toward her, about
    1 u a second (my guess).
  - A foe that comes within 1.5 u is kicked out: 8, and it flies back 3 u (my guess). Each foe
    it passes on the way takes 6 (the page thread's guess). Then the wind drags it in again.
    Each foe is kicked at most once a second.
  - The 1.0 line "close shots 60% more" is gone: she does not shoot while she spins.
  - As before: she cannot walk; walking or the dash ends it (N17). A boss is not dragged or
    flung; the kick deals 20% more to it (N14).
  - The kick is a close hit (Iron Leg, Slipstream) and 常规直伤, melee. The 6 to the foes in
    the way is 附加伤害, area: not a hit, so it starts nothing else.
  - With Wall slam (C2) a kicked foe that hits a wall takes 10 more and is stunned 0.5 s. With
    Long Wind the drag reaches 5.2 u.
  - Cyclone Kick's base motion (N69) is also a spin on the floor. If the two read alike on the
    page, Cyclone Kick becomes three upright jumping spin kicks and the floor spin stays with
    the stance. Open, for the page.
- **N93. Every form its own 特点.** Kesh on the ability page, 2026-11-18 23:53 Singapore time
  (cmsg_01T9kVc7qNub7xZ7DH6oTE5y7MFzw9hYWR77U9orsQ9yRx): "After I review again, I found for the
  deadeye style, many skill make in a very similar way, example there are 2 skill with 箭雨
  deadeye treat it the same where focus on 1 person to arrow rain, I not saying this is bad
  idea, I just saying they using same idea. So you need to re think and re design to many each
  skill have its own 特点"; 23:54 (cmsg_01T9kVc7qNub7xZ7DH6oTE5y4mFiTCefvVLXk6qH6EyKN8): "Since
  already need review, you also do full audit and review to make sure each skill is different";
  00:02 (cmsg_01T9kVc7qNub7xZ7DH6oTE5yCDjDDKRQVfwHeTYsKC9WLr): "I going to sleep, can you
  continuously complete the goal, which run audit and review and make it insanely detailed,
  until it have score 9 out of 10".
  - The audit is the page thread's `WINDBRIAR_SAMENESS_AUDIT.md`, merged with my list; the
    passes and scores are in `WINDBRIAR_REVIEW_PASSES.md`. Kit 1.4 changed 39 forms, 1.5
    fixed pass 1, 2.0 fixed pass 2 (35 forms and T15, N94).
  - The test for "its own 特点": each form of a style is named by one idea (the label in its
    kit cell), and no two forms of a style, no talent and no combo share that idea. Forms of
    different styles may share an idea (Deadeye Skeet and Volley Scatter launch both shoot a
    foe in the air), since a hero has one style at a time.
- **N94. What 2.0 changed and why** (pass 2's findings, `WINDBRIAR_REVIEW_PASSES.md`).
  - Deadeye. F1 Flank: 50% more, not double (budget, N98). F2 Sweet spot: the arrowhead glints
    jade in the window, not a gold ring (T13's white halo and Ashfang's gold stay theirs), 77.
    F3 Bounty: the 1.4 form only curved arrows to the mark, a number tweak. F4 Pain link: a
    sure crit was a number tweak. F5 Split the shaft: the 1.5 ramp was a number tweak and the
    last "grows with count" form. F7 Push-back: roots that grow repeated Tripwire's hold. F11
    Sticky charge: the stuck foe now takes the most (48), so it is a one-foe bomb, not a pack
    bomb. F12 Spotter wheel: Shoot-down did nothing in a room with no shooters (pass 1 S2). F13
    Bank shot: no 30% ramp; it skips off the floor in the open. F15 Tripwire: one foe, a longer
    trip; five foes was a Volley idea. F16 Gathered quiver: Called rain was a third "arrows fall
    on the foe I hit" idea after Sky Bolt and Hunter's Mark's curve. F17 Closing fan: Counter
    copied Hang time's "a beat of stillness, then one shot". F19 Skeet: "shoots it three times"
    repeated Rapid Fire. F20 Lone wolf: the row was 1.3's Line-up, gone. F23 Running draw: the
    30% was a number tweak (and T9 used to copy it). F24 Spear dive: Perch repeated Hang time's
    hang in the air.
  - Volley. F1 Echo line and F2 Scatter draw: "adds side arrows" and "no fall-off" were number
    tweaks. F3 Flare: "marks every foe within 2 u" made a pack mark that read as Hunter's Mark
    with a radius. F9 Rolling volley: five arrows was a number tweak. F10 Cloudburst: a steered
    rain repeated C6. F12 Spinning top: the outward ring repeated Fountain's spray. F14 Arrow
    eater: Twin twisters repeated Two knots' collision. F21 Orbit: the saw discs repeated
    Boomerang's flying cutter. F22 Staff dance: was only "full circles".
  - Gale. F4 Flail swing: the neck throw repeated Meteor's slam. F5 Orbit run: was 1.3's run
    with a label. F6 Bicycle kick: her rig has no knees, so the flying knee could not be built
    (N79). F9 Trip: labelled, numbers kept. F10 Haul: kicking foes into the rain repeated
    Breakdance's kick-out. F13 Head hop: labelled. F14 Tag twister: a twister round her copied
    T15 of 1.5 and Breakdance's drag. F18 Over the top: the 20% open back repeated Hunter's
    Mark; the foe now turns to follow her, which opens it to the team without a number. F19
    Air juggle: "spikes it down" repeated C4. F20 Knot kick: Rope swing repeated Orbit run's
    circle. F22 Hook pull: "a third strike" was a number tweak. F23 Wake: "kicks foes she runs
    through" repeated Ride.
  - T15 Hurricane Dance: lifting the pack copied Gale Scatter launch and Haul; a cyclone round
    her that widens her own kicks and strikes is a new idea in the path.
- **N95. Rules every form follows.**
  1. **Tags.** Each form's line below names the tag it usually earns: single (T4), wide (T5),
     close (T6, T9). The tag is decided at each hit by N11; the line only says what to expect.
  2. **Moved foes hitting foes.** A foe she moves that strikes another foe deals that foe
     附加伤害, area: not a hit, no crit, starts nothing (Breakdance, Two knots, Flail swing,
     Knot kick, Gale Chase). The moved foe's own damage is the form's hit.
  3. **Bosses.** A boss is never moved, tied, grabbed, launched or turned (N14); the hit that
     would move it deals 20% more. Her stuns, roots, trips and slows on a boss last 20% of their
     time, then its 5 s hard-CC guard (formula D35, D40). A boss's telegraphed attack is never
     broken. Each form says what it does on a boss.
  4. **Taunt.** A foe Stonehide holds is moved as W9 says and walks back; no form turns a
     taunted foe away from him (Decoy, Over the top).
  5. **Co-op.** Her slows, trips and nets work for every hero; her 易伤 (Hunter's Mark, Flare)
     counts every hero's hits; her 增伤 (Wind lane, Lone wolf, Gathered quiver) is hers alone.
     Nothing dims or slows another player's screen. Her walls (Wind wall, Cage) let allies and
     their shots through.
  6. **Small stuns.** The 0.3 to 0.5 s stuns and trips of the forms follow N13: no 2 s guard.
  7. **Floor.** Nothing she makes stands on a floor warning; a wire, wall, trap or cage spot
     on one moves to the nearest clear spot.
  8. **Colour.** Every new shape is Wind Jade #5ED3C0 or Feather Bone #C9C2B3. No Ember, no
     Violet, no Foe Crimson, no gold (Ashfang's 剑意). Effects dim and readable (N100).
- **N96. Combos under the forms.**
  - C1 Thread the knot needs a Pinning Arrow hit on a gathered pack, in any form: Deadeye Pain
    link ties up to three and links them all; Volley Net nets them, stun 1 s; Gale Flail swing
    ties the first and swings it through the others.
  - C2 Wall slam: any form that moves a foe into a wall (Piercing Shot's Gale Chase, Push-back,
    Kick fan, Breakdance, Flail swing, Knot kick, the base Skypiercer carry and Bow Sweep push).
  - C3 Air shot: every form that launches (Bicycle kick, Haul, Blast jump, Scatter launch,
    Skeet, Air juggle, Knot kick, Eagle Dive's base heel) feeds it.
  - C4 Spike: unchanged; under Gale, Air juggle does not spike (that is C4's job).
  - C5 Through the twister: only arrows shot into the twister from outside split. Under
    Deadeye the twister is a lane (no split; the lane's own 30%). Under Gale, Tag twister
    splits arrows that enter it after it jumps.
  - C6 The rain rides the wind: the rain moves once, to the knot or the twister, at the cast;
    it does not follow it after. Under Deadeye there is no rain (Sky Bolt), so nothing moves;
    under Volley Cloudburst is over in 1 s, so it moves only if cast first.
  - C7: under Deadeye the kestrel shoots the Bounty mark; under Volley it shoots foes in the
    Flare; under Gale the Heel mark.
  - C8 Kick them in: Deadeye Tripwire counts (a foe knocked across trips 1.4 s); Volley each
    mine; Gale the kicked trap.
  - C9 Shoot the arrow: Deadeye Sticky charge set off at once, twice as wide; Volley Cluster
    each shard set off too; Gale Blast jump: it is stamped in, so an arrow sets it off early.
  - C10 Dash draw: works with Closing fan and Sweet spot (the window can be hit in the dash).
  - C11 Sky cast: a form that does not shoot at once (Spotter wheel, Closing fan's draw) takes
    no 30%; it starts as normal where she lands.
  - C12 Full sail: unchanged.
  - Execute with T7: the arrow that executes flies on with its direct damage (the triple or
    the base), not with the 真实 health of the felled foe.
- **N97. Two base nudges, open with Kesh (kit section 7, pick 2):** Volley a long narrow fan,
  Feather Fan without its 30% run. The other base pairs (four piercing lines, three backflips,
  two pulls, several spins) stay as roles; the page makes their looks differ: Piercing thin and
  fast, Power slow and heavy, Skypiercer a carrying drill; Vault low and long, Crescent tall
  and in place.
- **N98. Budget.** The bar (docs/TALENTS.md): a tier I form gives about 20% more output in its
  style's case than the base; no form doubles the base in its own case. Rough numbers, its
  case first:
  - Deadeye, one foe: Flank 45 vs 30; Sweet spot 77 vs 48 (needs the window; AI capped at 60%
    of windows, so about 60); Split the shaft 62 vs 50; Sticky charge 48 vs 18; Closing fan 70
    vs 45 (needs a 0.6 s draw); Spear dive 60 vs 46; Hang time 30 vs 18 (plus the 60% slow);
    Gathered quiver up to +45 on the next drawn shot (needs the shot through the arrows).
    Execute and Big game are the boss forms: watch them first.
  - Volley, a pack of six: Echo line 45 a foe on the line vs 30; Scatter draw 18 to about four
    foes (72) vs 48 falling off; Rolling volley 90 if all nine hit vs 42; Spinning top 16 to
    each foe on a 5 u lane; Orbit up to 36 a foe vs 12; Crossfire 84 where they cross vs 42.
    Rolling volley and Orbit are the two to measure.
  - Gale, within 3 u: Trip 54 vs 42; Head hop 52 over four foes; Flail swing 26 plus the
    附加; Knot kick 12 to each of the pack; Hook pull 8 plus the base 30.
  - Measure in play before numbers move: Sweet spot, Rolling volley, Orbit, Execute.
- **N99. AI seat, every style.** As N77, and every form has its own line below. Shared: the AI
  never casts a move form into a floor warning; never moves a foe that Stonehide holds unless
  the form is a pull toward him; holds a drawn shot only when no foe is within 2 u of her;
  hits the Sweet spot window at most 60% of the time; casts boss-only forms (Big game,
  Execute's triple) on the boss first.
- **N100. Looks, colour and VFX templates** (docs/VFX_TEMPLATES.md; the archer maps to blade).
  - Blade: every arrow, kick and bow strike: a thin streak or arc, a white core, a short tail.
    Magic: every wind shape, reticle, wire, lane, net, wall, cage and the sky. Ring: every
    burst and landing. One light budget per spot; glows about 40% under the Part 2 draft.
  - Colours: arrows Feather Bone, wind Wind Jade. The Flank arc is Feather Bone; the Execute
    line is Wind Jade; the Sweet spot glint is jade with a white core (not T13's halo, which is
    white with a jade rim). The Sky Bolt reticle is a jade ring with four feather ticks, so it
    never reads as a foe warning.
- **N101. The formula on the forms** (formula v1.2; types and zones per form are on each line
  below).
  - 基础伤害区: Flank's 50%, Sweet spot, Split the shaft's 30, Execute's triple, Kill Shot's
    double, Gathered quiver's +3s, the 20% on a boss she cannot move.
  - 暴击区: Hundred Paces only (2.0 has no sure crit in the forms).
  - 增伤区 (all add): Heartseeker, Hail, Iron Leg, Eagle Stance's 60%, Wind lane's 30%, Lone
    wolf's 25%, Fleet Foot's 20%.
  - 易伤区: Hunter's Mark (30%), Volley Flare (20%; a foe in both takes the higher).
  - 减伤区: 风护 20%. 防御区: Armour break's 30% 减防, Hundred Paces and the Deadeye Gale Arrow
    ignore defence.
  - 真实伤害: Execute's fall only (the health left; shields first, D9).
  - 附加伤害: Pain link's share, Falling Feathers, every moved-foe collision (N95.2).
  - 控制 (D35): every stun, trip, root, net, slow and stagger in the forms.

## 10. Every form in full

Each form: the rule, its tag (N95.1), formula type and 抗性 form, the boss and co-op rule, the
motion (times from the press), the look and VFX template, the sound, and the AI line. Kit
lines F1 to F24; D = Deadeye, V = Volley, G = Gale.

- **N102. Deadeye forms.**
  - **D1 背射 Flank** (Piercing Shot). The line pierces as the base: 30; a foe struck on the
    half of its body away from its facing takes 45. Each foe is judged alone. Tag: single on a
    lone foe, wide on three. 常规直伤, ranged. Boss: turns slowly, so this is its use; no
    change. Co-op: foes Stonehide holds face him, so her flank is open. Motion 0.6 s: a skip
    to the side to open the angle, a flat snap shot, ears swing. Look (blade): a Feather Bone
    arc lights on each foe's back as the arrow passes; a flank hit bursts in a small jade ring.
    Sound: a thin crack; a bright ping on a flank hit. AI: steps up to 1.5 u sideways first.
  - **D2 满月 Sweet spot** (Power Shot). The base draw; let go in the last 0.15 s before the
    full draw, when the arrowhead glints: 77 and a 0.5 s stagger. Outside the window the full
    draw is 48, a tap 24. Tag: single. 常规直伤, ranged. Boss: 77, stagger 0.1 s then its guard.
    Co-op: none. Motion 1.3 s: low on one haunch, the arrowhead swells with jade light, a glint
    and a tick at the window; a sweet release freezes the hit 0.08 s and a white shock ring
    pops at the bow. Look: blade. Sound: a rising hum, a bell at the window, a deep crack. AI:
    the window at most 60% of the time.
  - **D3 悬赏 Bounty** (Hunter's Mark). The mark lasts 5 s (30% 易伤 as the base); if the
    marked foe falls in it, to anyone, every cooldown of hers drops 3 s. Tag: single. 易伤.
    Boss: the mark holds; it never falls in 5 s, so this is the elite and champion form.
    Co-op: any hero's kill pays her. Motion 0.5 s: two fingers across her eyes, then a slow
    point; a snap shot. Look (magic): a reticle of three jade feathers over the foe, turning;
    on the payout the feathers fly to her bow. Sound: a soft lock click; a bright chime on the
    payout. AI: marks the lowest-health elite within 6 u.
  - **D4 痛链 Pain link** (Pinning Arrow). The base pin and tie; for 4 s, half of what one tied
    foe takes, the other takes too (附加, so it never echoes back). With C1 up to three are
    linked. Tag: single. 常规直伤, ranged; the share 附加. Boss: a boss is not tied, but can be
    linked to the foe pinned beside it: half of what that foe takes goes to the boss. Co-op:
    every hero's hits are shared. Motion 0.7 s: a hop, a steep shot down; the jade cord pulls
    taut and throbs on each shared hit. Look (magic): a pulse runs along the cord. Sound: a
    taut hum; a low thrum on each share. AI: ties a weak foe to the boss or an elite.
  - **D5 劈箭 Split the shaft** (Rapid Fire). Five full draws of 8 at one foe, each landing in
    the same spot; the fifth splits the four before it down the middle: 30, and the foe is
    knocked back 1.5 u. Tag: single. 常规直伤, ranged. Boss: not knocked back, the fifth 36.
    Co-op: none. Motion 1.7 s: five slow, even draws, ears still; the arrows stack in one
    bunch; the fifth shot cracks through them and the split shafts fan out. Look (blade): the
    four shafts burst outward like petals. Sound: four flat thocks, then a splintering crack.
    AI: casts on a foe that is not moving.
  - **D6 斩杀 Execute** (Kill Shot). A small foe or elite under 15% health falls (真实伤害,
    the health left); a champion or boss under 30% takes triple (72); otherwise the base
    (double under 30%). A kill readies it again. Tag: single. 常规直伤, ranged; the fall 真实.
    Boss: the triple is its boss use; to watch in the budget. Co-op: shields take the fall
    first. Motion 0.8 s: the arrow toss and catch, a slow draw with narrowed eyes; one white
    streak; a felled foe is pinned upright a beat, then folds. Look (blade): a thin Wind Jade
    line across each health bar in reach at its threshold. Sound: silence, one hard snap. AI:
    holds it for the line.
  - **D7 压制 Push-back** (Eagle Stance). The kneel and its 60%, reach and pierce; each shot
    knocks its foe back 0.6 u and stops its walk 0.3 s. Tag: single per shot. 常规直伤, ranged.
    Boss: not moved, +20% per shot. Co-op: keeps foes off the tank's back line. Motion 0.4 s
    to settle: down on one haunch, the bow across her raised hind paw; each shot rocks her
    back and the foe skids. Look (blade): a short dust skid under each struck foe. Sound: a
    crack and a scrape each. AI: kneels when the nearest foe is 3 to 6 u away and walking in.
  - **D8 猎巨 Big game** (Skypiercer). The drill passes small foes (no damage, no carry) and
    stops in the first elite, champion or boss: all six hits and a burst of 24 in it. With no
    big foe it flies as the base. Tag: single. 常规直伤, ranged; the burst area. Boss: its
    main boss form. Co-op: none. Motion 1.8 s: the base leap and hang; the drill thins to a
    needle; it slips through the small foes and buries in the big one, which bulges with jade
    light, then bursts. Look: blade, ring on the burst. Sound: a thin whine, a muffled boom.
    AI: casts only when a big foe is on the line.
  - **D9 断招 Interrupt** (Volley). The three arrows go one by one to foes winding up an
    attack within 6 u; each breaks that wind-up and deals 28. With none winding up they fly as
    the base fan. Tag: single per arrow. 常规直伤, ranged. Boss: its wind-up is never broken;
    the arrow still deals 28. Co-op: saves allies from a charge. Motion 0.6 s: head still, eyes
    flicking; three snap shots; a broken telegraph shatters like glass. Look: blade. Sound:
    three dry ticks, a glass crack. AI: casts only when a wind-up is in reach.
  - **D10 天坠 Sky Bolt** (Rain of Arrows). No rain; a reticle on the spot, and 1.5 s later one
    giant arrow drops: 70 at the centre falling evenly to 20 at 1.5 u. Tag: single when it
    hits one. 常规直伤, area. Boss: the full 70; its main slow-boss form. Co-op: the reticle
    shows to all. Motion 1.0 s: she shoots straight up and holds the pose, bow high; the
    reticle narrows; the arrow drops as a column of wind and stands 1 s in a crater. Look
    (magic, ring): a jade ring with four feather ticks, never Ember. Sound: a falling whistle,
    one deep boom. AI: aims where its foe will be in 1.5 s.
  - **D11 黏爆 Sticky charge** (Burst Arrow). It sticks in the first foe; 2 s later 48 to it
    and 18 to every other foe within 2 u. Tag: single on the stuck foe. 常规直伤, area. Boss:
    sticks; a boss takes 48. Co-op: an ally's hit does not set it off (C9 is hers). Motion
    0.9 s: a lob from the hip; the head swells with a knot of wind that pulses faster. Look
    (magic, ring): the knot glows jade brighter as it nears. Sound: a quickening tick, a heavy
    whump. AI: sticks the biggest foe.
  - **D12 准星轮 Spotter wheel** (Whirl Shot). Twelve arrows circle over the foe nearest the
    pointer for 4 s; each hit on that foe by anyone drops one: 8 (at most one each 0.2 s).
    Arrows not dropped fade. Tag: single. 常规直伤, ranged. Boss: works. Co-op: her teammates'
    hits call them too: the co-op sniper. Motion 0.8 s: the spin; the twelve fly up and form a
    turning wheel over the foe. Look (blade): Feather Bone arrows point-down in a slow ring.
    Sound: soft chimes; a tick each drop. AI: on the foe the most allies are hitting.
  - **D13 折射 Bank shot** (Ricochet). The arrow bounces off walls, pillars, Stonehide's slab
    and Stone Ring up to four times; in the open it skips off the floor every 3 u instead,
    over the foes between. 22 to each foe it strikes; it ends after four bounces or 14 u. Tag:
    single per strike. 常规直伤, ranged. Boss: works. Co-op: none. Motion 0.5 s: a glance at the
    wall, a shot across her body. Look (blade): a jade spark and a short light trail at each
    bounce. Sound: a clean ring each bounce. AI: uses it on a foe behind cover.
  - **D14 风道 Wind lane** (Tornado Shot). The twister lies down as a lane from her to the spot
    for 3 s; her arrows along it fly twice as fast and deal 30% more. Tag: none of its own.
    增伤 on her arrows. Boss: works. Co-op: her arrows only. Motion 0.7 s: the spindle spin,
    the arrow shot along the floor; it unrolls as a lane. Look (magic): jade streaks flowing
    away from her. Sound: a steady rushing breath. AI: lays it toward the boss, then stands in
    it.
  - **D15 绊线 Tripwire** (Briar Trap). Two arrows 4 u apart with a wire between, 6 s; the
    first foe across trips 1 s and cannot dash, leap or charge for 3 s; the wire is spent.
    Tag: single. 控制. Boss: slowed 30% for 3 s instead; its charge goes on. Co-op: any foe
    crossing springs it. Motion 0.6 s: two arrows into the floor with a hop between, the wire
    pulls taut. Look (magic): a thin jade wire, glinting. Sound: a taut twang, a trip thud.
    AI: across the line between the nearest charger and the party.
  - **D16 拾箭 Gathered quiver** (Arrowstorm). The curtain sweeps as the base; then its
    arrows stand 5 s; her next drawn shot through them gains 3 for each arrow it passes, up
    to 45. Arrows left fade. Tag: single on the drawn shot. 常规直伤; the curtain area, the shot
    ranged. Boss: works. Co-op: hers alone. Motion 1.8 s: the base slide and sky shot; the
    ranks stand like reeds; the drawn shot sweeps them up, its trail thickening. Look (blade):
    standing Feather Bone shafts. Sound: a hiss of gathering shafts on the shot. AI: draws
    along the longest row.
  - **D17 收扇 Closing fan** (Feather Fan). A drawn shot (W8): as she draws the fan narrows
    from 90° to one line; let go early for a wider fan of 9 each, or full (0.6 s) for 5 × 14
    down one line. Tag: single at full draw on a lone foe. 常规直伤, ranged. Boss: 70 at full
    draw. Co-op: none. Motion 0.5 to 1.1 s: five arrows fanned on the string, the fan folding
    shut like a hand fan as she draws. Look (blade): five streaks that merge. Sound: a fan
    clack as it closes, one crack. AI: full draw on a lone foe, early on a pack.
  - **D18 滞空 Hang time** (Vault Shot). She hangs 0.6 s at the top, untouchable; foes within
    6 u are slowed 60% for 1.5 s; one full drawn shot: 30. Tag: single. 常规直伤, ranged; the
    slow 控制. Boss: slowed 12%. Co-op: no screen dim, the sim never slows; others see her hang
    and the slowed foes' jade drag lines. Motion 0.6 s + 0.6 s: the backflip stops upside down,
    she draws fully and looses down the line, the flip finishes. Look (magic): a jade ring of
    still air round her. Sound: the world dulls, one sharp snap. AI: when two foes are within
    2 u.
  - **D19 打靶 Skeet** (Crescent Kick). The kick and launch; three shots keep the foe up 1.5 s
    in all: 8 each. Tag: single. 常规直伤; the kick melee, the shots ranged. Boss: not
    launched, the kick +20%, the shots as normal. Co-op: a longer air time for Ashfang. Motion
    0.9 s + 1.5 s: the flip; upside down she shoots it, lands, and shoots it twice more as it
    bobs. Look (blade): a small jade puff lifts it at each hit. Sound: three pops. AI: on the
    foe nearest the pack.
  - **D20 孤狼 Lone wolf** (Windknot). The wind blows every other foe 3 u away from the foe
    nearest the spot; while no other foe is within 3 u of it (4 s at most), it takes 25% more
    from her. Tag: single. 增伤, hers. Boss: the others are blown off the boss; the boss is the
    lone one. Co-op: clears adds off the boss for the tank. Motion 1.0 s: the bow spun as a
    staff; she thrusts it and the ribbons push outward. Look (magic): a ring of jade wind round
    the lone foe. Sound: a whoosh outward. AI: on the boss or an elite in a pack.
  - **D21 点后排 Back line** (Cyclone Kick). The three kicks as the base; each spin's arrow
    flies over the near foes to the foe farthest from her within 7 u: 10. Tag: single per
    arrow. Kicks melee, arrows ranged. Boss: if it is farthest, it takes them. Co-op: picks off
    the shooters behind the tank. Motion 1.0 s: the floor spin; at each turn she looks past
    the pack. Look (blade): high arcing streaks. Sound: a long whistle each. AI: when a shooter
    hides behind a pack.
  - **D22 破甲 Armour break** (Bow Sweep). The bow hooks one foe and she drives the arrow in by
    paw: 34; its defence is 30% lower for 4 s. Tag: single, close. 常规直伤, melee; 减防. Boss:
    the boss use (defence 50 to 35). Co-op: every hero gains. Motion 0.7 s: the hook, a plant,
    a two-pawed drive. Look (blade): a jade crack spreads on the foe. Sound: a crunch. AI: on
    the boss whenever it is within 1.5 u.
  - **D23 疾引 Running draw** (Windrun). During the run every draw finishes at once (a full
    draw on a tap) and drawing never slows her. Tag: none. Boss: works. Co-op: none. Motion
    0.3 s to start: the foot thumps; she runs drawn, the bow level, ears streaming. Look
    (magic): a jade wake. Sound: a breath rush. AI: when Sweet spot or Skypiercer is ready.
  - **D24 枪坠 Spear dive** (Eagle Dive). She leaps and dives arrow first at the foe under the
    pointer within 6 u: 60, and it is pinned 0.5 s; no five arrows. With no foe in reach the
    base. Tag: single. 常规直伤, melee. Boss: 60, pin 0.1 s. Co-op: none. Motion 1.3 s: the leap,
    a head-down turn, she drops like a thrown spear, the arrow first, and flips off. Look
    (blade): a long streak from the sky, a ring on impact. Sound: a rising whistle, a deep
    thunk. AI: on a shooter out of reach.

- **N103. Volley forms.**
  - **V1 回声 Echo line** (Piercing Shot). The line as the base; 0.5 s later a jade echo of the
    arrow runs it again: 15 to each foe on it. Tag: wide. 常规直伤, ranged. Boss: works. Co-op:
    none. Motion 0.6 s: the base side step; the echo leaves her bow by itself. Look (blade): a
    pale jade ghost arrow. Sound: a crack, then a softer echo. AI: along the longest line.
  - **V2 散弦 Scatter draw** (Power Shot). The draw as the base; a full draw looses seven
    arrows in a 40° fan: 18 each (a tap: three of 12). Tag: wide. 常规直伤, ranged. Boss: one
    or two arrows hit it. Co-op: none. Motion 1.3 s: seven arrows fanned on the string; the
    release spreads them like a hand of cards. Look: blade. Sound: one deep twang, seven hisses.
    AI: full draw at the pack's centre.
  - **V3 照明 Flare** (Hunter's Mark). The arrow bursts into light over the foe: every foe
    within 3 u takes 20% more for 4 s. Tag: wide. 易伤. Boss: works. Co-op: every hero gains.
    Motion 0.5 s: a snap shot high; a jade flare hangs. Look (magic): a soft jade light pool.
    Sound: a pop and a hum. AI: on the largest pack.
  - **V4 网矢 Net** (Pinning Arrow). It opens over the foe into a net 2 u wide: 14 to each
    under it, stun 0.5 s, then slowed 40% for 2 s; the tie is gone. Tag: wide. 常规直伤,
    area; 控制. Boss: stun 0.1 s, slow 8%. Co-op: any foe under it. Motion 0.7 s: one arrow; at
    the top it opens into a jade net. Look (magic). Sound: a snap and a rustle. AI: on a pack of
    three or more.
  - **V5 扫射 Scythe** (Rapid Fire). She sweeps the bow; the ten arrows fan across 90° at the
    foes in it, 5 each. Tag: wide per sweep. 常规直伤, ranged. Boss: works. Co-op: none. Motion
    1.7 s: the bow swings side to side like a scythe. Look: blade. Sound: a run of twangs. AI:
    at the pack's centre.
  - **V6 清点 Cull** (Kill Shot). One arrow to each foe under 30% health within 6 u, up to six:
    24 each, doubled by the rule (48). With none, one base arrow. Tag: single per arrow. 常规
    直伤, ranged. Boss: one arrow if it is under 30%. Co-op: finishes allies' work. Motion 0.8 s:
    arrows fanned between her fingers, loosed one by one, turning on her toes. Look: blade.
    Sound: a quick run of twangs. AI: when three foes are under 30%.
  - **V7 曲射 Mortar** (Eagle Stance). She kneels and aims at the sky: each shot falls as a
    1.5 u burst at the pointer, with the stance's 60%. Tag: wide. 常规直伤, area. Boss: works.
    Co-op: none. Motion: she leans back on her haunch, bow high. Look (ring). Sound: a thump up,
    a whistle down. AI: on the largest pack within 7 u.
  - **V8 风墙 Wind wall** (Skypiercer). The drill stands up along its line as a wall for 3 s;
    foes cannot cross it and take 6 each half second while they touch it. Tag: wide. 常规直伤,
    area. Boss: walks through it and takes the damage. Co-op: allies and their shots pass;
    foes' shots are stopped. Motion 1.8 s: the drill bores, then rises behind its line. Look
    (magic): a tall wall of turning wind. Sound: a long howl. AI: across the way the pack walks
    to the party.
  - **V9 连环 Rolling volley** (Volley). Three fans of three, 0.2 s apart, landing at 3, 4.5 and
    6 u: 10 each. Tag: wide per fan. 常规直伤, ranged. Boss: works. Co-op: none. Motion 0.9 s:
    three flat releases, each a step back, the bow rising. Look: blade. Sound: three ripples.
    AI: at a pack walking in.
  - **V10 骤雨 Cloudburst** (Rain of Arrows). All eight hits fall in 1 s: 7 each 0.125 s, 56,
    slow 60% for 2 s. Tag: wide. 常规直伤, area. Boss: works, slow 12%. Co-op: none. Motion 1.0 s:
    one arrow up; the cloud bursts at once. Look (magic): a dense grey-white sheet. Sound: one
    loud hiss and a drum roll. AI: when a pack is gathered (after Windknot).
  - **V11 连爆 Cluster** (Burst Arrow). The burst as the base; each of the six shards bursts
    again where it stops: 8 within 1 u. Tag: wide. 常规直伤, area. Boss: works. Co-op: none.
    Motion 0.9 s: the base lob. Look (ring): six small rings after the big one. Sound: a pop
    chain. AI: in a pack.
  - **V12 陀螺 Spinning top** (Whirl Shot). The ring of twelve spins and rolls 5 u along her
    aim in 1 s: 16 to each foe it passes. Tag: wide. 常规直伤, area. Boss: works. Co-op: none.
    Motion 0.8 s: one spin, a push of the bow; the wheel rolls away. Look (blade): a spinning
    spoked wheel. Sound: a rolling whirr. AI: along a line of foes.
  - **V13 分叉 Branch** (Ricochet). On its third hit it splits in two, each with three hops
    left: up to 9 hits of 10. Tag: wide. 常规直伤, ranged. Boss: works. Co-op: none. Motion:
    the base behind-the-back shot. Look: blade, a jade fork spark. Sound: a double ring. AI: in
    a pack.
  - **V14 卷矢 Arrow eater** (Tornado Shot). The base twister, and it swallows every foe's shot
    that comes within 4 u of it; each comes back out as three arrows of 6 at foes near it.
    Tag: wide. 常规直伤, ranged. Boss: its shots are swallowed, never its spells or floor
    warnings. Co-op: shields the party. Motion 0.7 s: the spindle spin. Look (magic): foes'
    shots curve into it. Sound: a gulp, three twangs. AI: between shooters and the party.
  - **V15 雷区 Minefield** (Briar Trap). Three small traps 2 u apart in a row: each snaps alone,
    stun 0.5 s, 6 each half second for 2 s. Tag: wide. 常规直伤, area. Boss: stun 0.1 s.
    Co-op: none. Motion 0.6 s: three hops, three stabs. Look (magic). Sound: three pats. AI:
    across a doorway.
  - **V16 交叉 Crossfire** (Arrowstorm). Two curtains sweep in from her left and right and cross
    over her aim: three hits of 14 each; a foe where they cross is hit by both. Tag: wide.
    常规直伤, area. Boss: works. Co-op: none. Motion 1.8 s: one arrow up, two curtains march
    in. Look (blade): a bright X. Sound: two drums that meet. AI: the cross on the pack.
  - **V17 回旋羽 Boomerang** (Feather Fan). The feathers fly 4 u and curve back to her, hitting
    both ways: 9 and 9. Tag: wide. 常规直伤, ranged. Boss: works. Co-op: none. Motion 0.5 s: a
    flat release, then she catches them. Look: blade. Sound: a whirr out, a whirr back. AI:
    with foes on both sides.
  - **V18 替身 Decoy** (Vault Shot). A feather decoy stays where she stood: foes within 4 u turn
    on it for 2 s, then it bursts into eight arrows of 8. Tag: wide. 常规直伤, ranged. Boss: not
    turned. Co-op: never a foe Stonehide holds. Motion 0.6 s: the backflip; a feather image of
    her stays, bow up. Look (magic). Sound: a flutter, a burst. AI: when a foe is within 2 u.
  - **V19 群挑 Scatter launch** (Crescent Kick). Every foe within 2.5 u is launched 0.6 s; she
    shoots each once in the air: 12. Tag: wide on the kick. 常规直伤; melee kick, ranged shots.
    Boss: not launched, +20%. Co-op: none. Motion 0.9 s: a wide flip kick; upside down she
    shoots each in turn. Look (blade). Sound: a whoosh, a run of pops. AI: within a pack.
  - **V20 双结 Two knots** (Windknot). The base knot and a second at the pointer; the two packs
    are dragged into each other: 12 each (附加, N95.2), stun 0.4 s. Tag: wide. 附加, area; 控制.
    Boss: not dragged; its pack crashes into it. Co-op: none. Motion 1.0 s: the staff spin and
    two thrusts. Look (magic): two ribbons. Sound: two whooshes, one crash. AI: on the two
    largest packs.
  - **V21 环刃 Orbit** (Cyclone Kick). The kicks as the base; the three spin arrows orbit her
    at 2.5 u for 3 s instead: 6 to each foe they touch, each half second. Tag: wide. 常规直伤,
    area. Boss: works. Co-op: none. Motion 1.0 s: the spin; three arrows circle on. Look (blade):
    three Feather Bone streaks. Sound: a steady whirr. AI: inside a pack.
  - **V22 棍舞 Staff dance** (Bow Sweep). Two full circles of the bow: 8 to each foe within
    1.5 u each circle; then the arrow flies on 4 u through foes: 14. Tag: wide. 常规直伤, melee
    and ranged. Boss: works. Co-op: none. Motion 0.9 s: the bow whirls round her twice like a
    staff. Look (blade): two jade arcs. Sound: two whooshes, a twang. AI: two foes within 1.5 u.
  - **V23 回马箭 Parting fans** (Windrun). Each second of the run she looses a fan of five arrows
    behind her: 6 each. Tag: wide. 常规直伤, ranged. Boss: works. Co-op: none. Motion: no turn,
    the fan snaps out behind. Look: blade. Sound: a short volley each second. AI: away from a
    chasing pack.
  - **V24 箭泉 Fountain** (Eagle Dive). The base dive; the landing crater sprays arrows 1.5 s:
    6 to each foe within 3 u every 0.3 s. Tag: wide. 常规直伤, area. Boss: works. Co-op: none.
    Motion 1.5 s: the dive; arrows gush up and fall. Look (ring). Sound: a gush and a patter.
    AI: into a pack.

- **N104. Gale forms.**
  - **G1 追射 Chase** (Piercing Shot). A back kick flies the foe 3 u (8); the arrow chases it
    and nails it where it stops: 30, stun 0.4 s. Foes it strikes in flight take 6 附加. Tag:
    close on the kick. 常规直伤, melee and ranged. Boss: not moved: nailed at once, +20%.
    Co-op: no kick of a held foe away from the tank unless toward him. Motion 0.9 s: a spinning
    back kick, she nocks as it flies, the arrow catches it. Look (blade). Sound: a thump, a
    whistle, a pinning crack. AI: kicks toward a wall (C2).
  - **G2 蹬射 Kick-off** (Power Shot). No draw: a paw on the foe's chest, she springs back 2 u
    and looses from the hip: 8 + 40. Tag: close. Melee then ranged. Boss: works (she moves,
    not it). Co-op: none. Motion 0.7 s: a step in, a push off, a hip shot in the air. Look
    (blade). Sound: a thump, a crack. AI: when a foe is within 1.5 u.
  - **G3 踵印 Heel mark** (Hunter's Mark). An axe kick marks (12, 30% 易伤 3 s); each close hit
    of hers adds 0.5 s, up to 6 s. Tag: close. 常规直伤, melee; 易伤. Boss: works. Co-op: every
    hero gains while she stays close. Motion 0.5 s: a jump, the axe kick stamps a reticle. Look
    (magic). Sound: a stamp. AI: on the foe the tank holds.
  - **G4 甩投 Flail swing** (Pinning Arrow). The cord ties the foe to her bow; she whirls it
    overhead once (12 to foes within 2 u of it) and hurls it 4 u along her aim: 14 to it and 8
    附加 to foes within 1 u where it lands. Tag: close. Melee; the landing 附加. Boss: not tied:
    20 with the pin, +20%. Co-op: never hurled away from the tank. Motion 1.0 s: the shot, a
    yank, a full overhead whirl, a throw. Look (magic): the jade cord. Sound: a creak, a whoosh,
    a crash. AI: in a pack of three or more.
  - **G5 绕射 Orbit run** (Rapid Fire). She circles the foe at 2 u at full run, fourteen hip
    shots of 4. Tag: close. Ranged. Boss: works. Co-op: none. Motion 1.7 s: a tight run round
    the foe, shots across her body. Look (blade). Sound: a run of soft twangs. AI: on the foe
    the tank holds.
  - **G6 倒挂金钩 Bicycle kick** (Kill Shot). She flips upside down, a scissor kick lifts the foe
    (10, launched 0.6 s) and she shoots it from the flip: 16, doubled under 30%. Tag: close.
    Melee and ranged. Boss: not launched, +20%. Co-op: none. Motion 0.8 s: a back roll into an
    overhead scissor kick, both paws straight (no knees, N79), the shot at the top. Look
    (blade). Sound: a whoosh, a smack. AI: on a weak foe.
  - **G7 霹雳舞 Breakdance** (Eagle Stance). As N92: 4 s floor spin; wind drags foes within 4 u
    in; each that reaches 1.5 u is kicked out 3 u (8), and foes in its way take 6 附加. Tag:
    close. Melee; 附加. Boss: not dragged; kicked +20%. Co-op: not a foe Stonehide holds unless
    it flies toward him. Motion: N53. Look (magic): a wide jade spiral. Sound: a whirring beat.
    AI: in a pack.
  - **G8 乘矢 Ride** (Skypiercer). She rides it: a spinning flying kick 6 u through the foes,
    three hits of 8 to each. Tag: close. Melee. Boss: she stops at it, +20%. Co-op: none.
    Motion 1.4 s: she springs onto the drill feet first, spinning. Look (magic). Sound: a howl.
    AI: through a line of foes.
  - **G9 绊摔 Trip** (Volley). A low sweep trips the foes within 1.5 u 0.4 s (6), then three
    point-blank arrows: 16 each. Tag: close. Melee and ranged. Boss: not tripped, +20%. Co-op:
    none. Motion 0.7 s: a floor sweep, a crouched fan. Look (blade). Sound: a scrape, three
    cracks. AI: two foes within 1.5 u.
  - **G10 收网 Haul** (Rain of Arrows). The rain falls as the base; jade threads tie each foe
    struck in it; at its end she yanks: all are pulled to the centre (14) and launched 0.5 s.
    Tag: wide or close. Area; launches. Boss: not pulled, +20%. Co-op: never off the tank.
    Motion 1.0 s + 4 s: the rain; she holds the threads; a hard yank. Look (magic). Sound: a
    creak, a snap. AI: on a pack.
  - **G11 爆跳 Blast jump** (Burst Arrow). She stamps it into the floor and backflips off the
    blast: 24 within 1.5 u, launched 0.5 s. Tag: close. Area. Boss: +20%. Co-op: none. Motion
    0.9 s: a stamp, the flip. Look (ring). Sound: a boom. AI: when hemmed in.
  - **G12 踵轮 Heel wheel** (Whirl Shot). A flat spin in the air, heels out; twelve arrows fall
    on foes within 3 u: 16, knocked flat 0.3 s. Tag: wide or close. Area. Boss: not knocked,
    +20%. Co-op: none. Motion 0.9 s: a 540 spin. Look (blade). Sound: a whirr, a patter. AI:
    within a pack.
  - **G13 踩头 Head hop** (Ricochet). She springs off four foes' heads, a kick each (8), and
    shoots the last from the air: 20. Tag: close. Melee and ranged. Boss: one hop. Co-op: none.
    Motion 1.2 s: paws off one head after another, a turn between. Look (blade). Sound: four
    bops, a crack. AI: in a pack of four.
  - **G14 追风 Tag twister** (Tornado Shot). The twister stands 2.5 s; each foe she kicks (once a
    second) calls it to that foe, where it drags the foes round it. Tag: close. Area. Boss: it
    sits by the boss. Co-op: none. Motion 0.7 s: the spindle spin; the twister hops after her
    kicks. Look (magic). Sound: a rush each hop. AI: kicks the foe nearest the pack's centre.
  - **G15 踢阱 Snare kick** (Briar Trap). She kicks the trap 5 u like a ball; it snaps on the
    first foe and those within 1 u: stun 0.7 s, 8 each half second for 3 s. Tag: close.
    Area. Boss: stun 0.14 s. Co-op: none. Motion 0.6 s: a drop and a volley kick. Look (magic).
    Sound: a thump, a snap. AI: at a pack, never a lone boss.
  - **G16 箭笼 Cage** (Arrowstorm). The arrows fall as a 3 u fence round the pack for 3 s; foes
    cannot leave; she leaps in: 14 each as she lands. Tag: close. Area. Boss: not held; the
    fence hurts it 8 as it crosses. Co-op: allies pass. Motion 1.8 s: one arrow up, the fence
    falls, a leap over it. Look (blade). Sound: a fence of thuds. AI: around a pack.
  - **G17 踢扇 Kick fan** (Feather Fan). She kicks the five arrows off the string: 12 each,
    knocked back 1.5 u. Tag: close. Ranged. Boss: not moved, +20%. Co-op: never off the tank.
    Motion 0.5 s: the bow low, a hind-paw kick on the string. Look (blade). Sound: a twang, a
    thump. AI: at foes within 2 u.
  - **G18 翻越 Over the top** (Vault Shot). She vaults over the foe, untouchable, shooting down
    (18), and lands behind it; it turns to follow her for 2 s. Tag: close. Ranged. Boss: not
    turned. Co-op: never a foe Stonehide holds; the turned foe shows its back to the team.
    Motion 0.8 s: a sprint, a paw on its head, a vault. Look (blade). Sound: a whoosh, a snap.
    AI: on a foe facing an ally.
  - **G19 空中连踢 Air juggle** (Crescent Kick). The kick and launch; she leaps after it: three
    kicks of 6 before it lands. Tag: close. Melee. Boss: +20%. Co-op: none. Motion 0.9 s + 0.6 s:
    the flip, a leap, three straight-legged kicks. Look (blade). Sound: three smacks. AI: on a
    launched foe.
  - **G20 聚踢 Knot kick** (Windknot). The knot gathers; then she drop-kicks the pack 3 u as one
    ball: 12 each, launched 0.5 s; foes the ball strikes take 6 附加. Tag: wide or close.
    Melee. Boss: not moved, +20%. Co-op: never off the tank. Motion 1.4 s: the staff spin, a
    leap, a two-paw drop kick. Look (magic). Sound: a whoosh, a thump. AI: toward a wall.
  - **G21 行旋 Travel spin** (Cyclone Kick). She travels 3 u with the three kicks and a fourth;
    the last launches. Tag: close. Melee. Boss: +20%. Co-op: none. Motion 1.3 s: an upright
    travelling spin. Look (blade). Sound: four whooshes. AI: through a pack.
  - **G22 钩拉 Hook pull** (Bow Sweep). The bow hooks a foe within 3 u and yanks it in (8), then
    the base strikes and shot. Tag: close. Melee. Boss: not pulled: she steps in instead. Co-op:
    never off the tank. Motion 0.9 s: a reach, a yank, the strikes. Look (blade). Sound: a hook
    clack. AI: on a shooter within 3 u.
  - **G23 风尾 Wake** (Windrun). Foes she passes within 1.5 u are dragged in her wake for 3 s:
    4 each half second. Tag: close. Area. Boss: not dragged. Co-op: lead them to the tank.
    Motion: the run; jade threads trail. Look (magic). Sound: a rush. AI: runs a loop to the
    tank.
  - **G24 流星 Meteor** (Eagle Dive). At the top she grabs the nearest foe and drives it down
    head first: 30 to it, 14 within 1.8 u. A boss is never grabbed: the base dive, +20%. Tag:
    close. Melee. Co-op: none. Motion 1.5 s: the leap, a grab, a flip, the slam. Look (ring).
    Sound: a rush, a crash. AI: on the foe nearest the pack's centre.
