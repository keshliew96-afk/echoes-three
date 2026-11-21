# Windbriar: design notes

**Version 2.8, 2026-11-19. Design only.** The details behind `WINDBRIAR_KIT.md` (lines W, T,
F). Every form is in full in section 10 (N102 to N104; the base forms N105, the rig N106). Older text is kept as
`WINDBRIAR_NOTES_x.x.md`; what changed when is in N93 and N94. All numbers are first guesses
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
  - Drawn shots inside a flip or a stream (Deadeye Split the shaft, Catch) are full draws with
    no hold.
  - Deadeye Sweet spot adds a window at the end of Power Shot's draw (DE2). Volley Pressure
    line and Wind wall keep the hold (VO2, VO8). Under Gale, Power Shot is a held kick (Wound
    kick, GA2) and Skypiercer has no draw (Arrow spear, GA8).
- **N11. Words the talents use.**
  - A **single arrow** (T4): an arrow that damaged exactly one foe. An arrow that went through
    two foes is not one. Rains, rings and bursts are not arrows.
  - A **wide hit** (T5): one release (a fan, a ring, a burst, one half-second of a rain, one
    piercing arrow) that damaged three or more foes; each of them takes the 25%.
  - A **close hit** (T6, T9): a kick, a bow strike, or an arrow that hits a foe within 2 u of
    her.
  - A **drawn shot**: an arrow with a draw (N10): Power Shot, Skypiercer, the Deadeye basic
    shot, and the forms that say "full drawn".
- **N12. Movement.** A step, flip or kick dash of a form is untouchable only where the line says
  so. It stops at a wall and never ends on a floor warning or a floor bed: she lands on the
  nearest clear spot. The dash cancels any of them; hits already landed stay.
- **N13. Kicks and small stuns.** A launch, push or pull is movement, not a stun. A stun of
  0.5 s or less from a form is a small stun: it does not start the 2 s stun guard and does not
  land on a foe inside it (the fix Ashfang and Stonehide already use). One rule everywhere:
  N95.5 points here; combo C2's 0.5 s is the one exception (N96).
- **N14. Bosses.** A boss cannot be pushed, pulled, launched, carried or tied. When one of her
  moves fails to move a boss, that hit deals 20% more (the kits' rule; formula pick 13a). Her
  stuns and slows on a boss last 20% of their time (formula D40): Pinning Arrow's 0.75 s is
  0.25 s.
- **N15. Pinning Arrow's tie.** The second foe must be within 2.5 u behind the first, within 30°
  of the arrow's line. A wall counts; Stonehide's slab and Stone Ring count as walls.
- **N16. Kill Shot.** "Ready again" needs the kill to come from the Kill Shot itself, in the
  base and every form except Volley Cull (whose kills do not ready it, so a weak pack cannot
  loop it). Deadeye Execute's fall and Gale Ride's shot ready it.
- **N17. Stances.** Eagle Stance has no second press. It ends when she walks, dashes or is moved,
  or after 4 s. Skills can be cast from it without ending it if they do not move her.
- **N18. No second presses and no extra keys.** A key is held only for the draws of N10.
- **N19. She has no heal, no shield and no damage over time.** A rain is a row of area hits. A
  wind wall, web thread or twister is a row of area hits. Her one damage cut is 风护, under
  Bow Dance (N22).
## 3. Talents in full

### Tier I, Style (free)

- **N20. T1 Full Draw 满弦 (Deadeye).** Every skill she holds takes its Deadeye form. Her basic
  shot is a drawn shot: hold attack; a tap is 12, a full draw (0.75 s) is 26, reach 6.5 u,
  through one more foe at full strength. The trade: fewer, slower arrows; packs are slow to clear.
- **N21. T2 Split Arrows 分矢 (Volley).** Every skill takes its Volley form. Basic shots one
  and two split in three: the middle arrow 8, the side arrows 4 at 15° each side. The last shot
  is five arrows of 4 (N40). The trade: a lone foe is only hit by the middle arrows.
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
- **N31. T12 Long Wind 长风.** One rule for the whole kind. Everything of hers that moves a foe
  (every pull, drag, push, knock, nudge, plow, steer, carry and wind) reaches 30% farther.
  Everything that moves her own body (the dash, every flip, hop, step, slide, swap, ride,
  flight, rocket and run) and every distance she kicks a foe or a thing goes 25% farther; the
  Kicked saw lands 3.75 u away, the one way Gale reaches past 3 u. Shapes that do not move
  anything keep their size (walls, hedges, traps, threads; T11 widens rings, bursts and rains).

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
     Sky Bolt's edge, Recoil blast's splash, Arrow hedge's curtain), and a boss counts as
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
  10. Hurricane Dance with Wind well: the slam is a kick, so T15's half-hit rides on it; the
     well's burst is wind, not her strike, so T15 adds nothing to it. She keeps kicking with
     T15 while the well drags. Fine.
  11. Pain link with Through the Heart: a linked foe felled by the share is not felled by an
     arrow, so T7 does not fly on from it. No loop.
  12. Spotter wheel with Ten Thousand Arrows: the room rain's hits drop the wheel's arrows at
     most one each 0.2 s (DE12), so the wheel empties in 1.6 s. Wanted.
  13. Slide stance with Hundred Paces: the slide ends her walk input and the stance counts as
     standing, so 1 s into the free stance her next arrow skill is perfect. A real sniper turn;
     to measure first.
- **N37. Budget** (docs/TALENTS.md): tier I about 20% more output in its style; one whole path
  about 50%; no mix above 70%.

## 4. The basic attack and the dash

- **N38.** Base combo 12, 12, 3 × 6 (42), reach 4.5 u; the game's own shot today is 12.
- **N39.** Deadeye: 26 a drawn shot (52 in the time of one base combo, on one foe).
- **N40.** Volley: shots one and two split into 8 and two of 4; the last is five arrows of 4.
  On a pack that is 16, 16, 20 (52, +24% on the base's 42, inside N37); on a lone foe about 24.
- **N41.** Gale: 8, 8, 8, 5 + 5, 10 + 6 (50), all within 3 u; the back kick pushes 0.5 u, the
  flip kick launches 0.3 s (N89, N95.6) and it is the kick that throws the Gale Arrow's ring when Tailwind is full (N8).
- **N42.** The dash is the passed one. Its three arrows are 5 each (my guess; the page does not
  give a number). Deadeye: all three go to the foe nearest the pointer. Volley: to three
  foes. Gale: it ends in a dive kick, 8 within 1.5 u.

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
- **N46. Looks.** Arrows are streaks and wind is jade (the colours of each are kit pick 3,
  N100). Deadeye: one thin bright line and tight rings. Volley: many thin streaks, ranks and
  wheels. Gale: arcs off her hind paws and the bow tips. No Ember, no Violet; effects dim and
  readable.

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
  s, then a half turn on her toes with her ears wrapping round. Under
  pick 2a the three arrows are held close together and fly as a tight, long fan.
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
  body, then she darts with her ears flat. Under pick 2a the dart is
  only a weight shift: the passed release stays, the run is gone.
- **N65. Vault Shot** (0.6 s, passed). A backflip, the shot upside down at the top, a low
  sliding landing with one paw on the floor.
- **N67. Crescent Kick** (0.9 s). A step in, then a backflip with both hind paws scything up:
  a tall jade crescent, the foes lift. Upside down at the top she nocks and shoots the highest
  foe. She lands in a crouch, bow across her lap.
- **N68. Windknot** (1.0 s). She spins the bow overhead, round her waist and behind her back,
  wind streaming off both tips in jade ribbons. She thrusts the bow at the spot: the ribbons
  shoot out, wrap the pack and pull it tight; foes skid in on spiralling dust lines. She snaps
  the bow upright; the ribbons tie off and pop.
- **N69. Cyclone Kick** (1.0 s). Three upright jumping spin kicks, each a little higher (hits at
  0.1, 0.4, 0.7 s), hind paws straight out; each turn she shoots one arrow across her body; the
  wind ring grows each turn. The last kick is a double-paw thrust; she lands on her haunches.
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
  Big game, Sky Bolt on a slow boss, Pain link to move damage onto it, Lone wolf to clear its
  adds. Volley is
  plain 直伤 on foes with no defence, and Flare for the team. Gale's wind is mostly movement,
  which 效果抵抗 does not shorten but a boss ignores, so its boss answer is the 20% of N14.
- **N76. 控制.** Every stun, trip, root, net, stagger and slow of hers follows D35 (N95.3 for
  bosses, N95.5 for the small stuns). The Deadeye Interrupt is not a stun: it cancels a
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

- **N79. The model.** Her rig has no knee bones (22 bones). Kicks are straight-legged; sits and
  crouches fold at the hip and ankle. The full rule and the page test are in N106.
- **N80. New moves** (beyond the 28 passed): the draw-and-hold, the haunch sit, the dive slam into a wind well,
  the sky lean, the behind-the-back shot, the bow staff spin, bow strikes, the back kick, the flip
  kick, the axe kick, the slingshot launch, the spear spin and javelin throw, the 蹴鞠
  dribble, the parry spin, the slide under a foe, the vine whip, the pinwheel punch, the feather
  sentry, the foe ride, the place swap, the zigzag spin kicks, the bow-plant ripple, the head-hop chain, the arrow-first spear
  dive, the drill drop, the recoil skid, the held kick wind-up, the head clap, the blast ride, the
  mid-air catch.
- **N81. Things to show.** The three Tailwind feathers on her bow arm, the Gale Arrow in each
  style, the cord (tie, Pain link, Slingshot), the aim line, the Sweet spot glint, the Spotter
  wheel, the Sky Bolt reticle, the Flare, the painted feathers, the wall, hedge and web, the
  twisters, the traps, the Cuju ball, the sinkhole, the closing rain, the T15 cyclone, the kestrel.
- **N81b. Motion specs (19 Nov).** `WINDBRIAR_MOTION_GALE.md` gives every Gale form, the 21 thin
  Deadeye and Volley forms and the Eagle Stance kneel as beats at 60 fps; where it differs
  from a form's Motion line in section 10, the spec wins.
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
  - 2026-11-19 08:59 Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5yTts6R9EXi5vWEwmkbpErib), on kit
    2.5's picks 1 to 4: "go a head with your pick". So 1a the forms as written, 2a the two
    base nudges (N97), 3a the colours (N100), 4a no more paper redesigns: he marks forms that
    feel alike on the page and only those are fixed.
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
  (cmsg_01T9kVc7qNub7xZ7DH6oTE5yXScebW9hmPupPfQ4ub4CBv): "All combo". C1 to C12 are in
  `WINDBRIAR_COMBO_IDEAS.md` (kit section 5).
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
- **N92. Eagle Stance's Gale form was a 霹雳舞 (replaced in 2.7 by Wind well, N92b).** Kesh on the ability page, 2026-11-18 16:09
  Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5y8Eixkm4thHsxn4Mhfqfxdg): "Eagle Stance: gale
  style: the windbriar play 霹雳舞 with wind vfx to slowly drag foes to it, then get kick out
  and drag again. the foes fly back due to getting kicked, also hurt foes along the way". It
  replaces the crane stance of 1.0.
  - For 4 s she spins on the floor. Her wind drags every foe within 4 u toward her, about
    1 u a second (my guess).
  - A foe that comes within 1.5 u is kicked out: 8, and it flies back 3 u (my guess). Each foe
    it passes on the way takes 6 (the page thread's guess). Then the wind drags it in again.
    Each foe is kicked at most once each 1.5 s (budget, N98).
  - The 1.0 line "close shots 60% more" is gone: she does not shoot while she spins.
  - As before: she cannot walk; walking or the dash ends it (N17). A boss is not dragged or
    flung; the kick deals 20% more to it (N14).
  - The kick is a close hit (Iron Leg, Slipstream) and 常规直伤, melee. The 6 to the foes in
    the way is 附加伤害, area: not a hit, so it starts nothing else.
  - With Wall slam (C2) a kicked foe that hits a wall takes 10 more and is stunned 0.5 s. With
    Long Wind the drag reaches 5.2 u.
  - Cyclone Kick's base is three upright jumping spin kicks (decided in 2.1, N97), so the floor
    spin stays with the stance.
- **N92b. Wind well replaces the 霹雳舞 (kit 2.7).** Kesh on the ability page, 2026-11-19 12:41
  Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5yR6v67F2egBg4JuwCg1D3gk): "Eagle Stance: Gale style:
  make it jump and dive to ground, when slam to ground generate winds slowly and continueously to
  drag foes in, once slam to ground, the windbriar is free to move, when end, burst out wind to
  deal damage. Or jump up and shoot a arrow to ground, the arrow generate wind, the windbriar is
  free to move, and when end, burst out wind to deal damage. PS: the wind does not follow
  windbriar."
  - Opened by the dive slam: his pick 1a, 2026-11-19 13:02 Singapore time
    (cmsg_01T9kVc7qNub7xZ7DH6oTE5yDtq7Sc4d9ZeXvd5SphRsZc). The arrow opening is not used.
  - The numbers are my guesses: the slam 10 within 1.5 u; the well drags foes within 4 u
    toward its centre at 1 u a second for 4 s; the burst 24 to each foe within 3 u.
  - It is not a stance: N17 does not apply. She walks, dashes and casts freely. The well
    stays where she landed.
  - The 霹雳舞's kick-outs and their 附加 are gone, so no form now makes a moved foe hurt
    others (N95.2).
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
    different styles may share an idea (Volley Two knots and Gale Head clap both knock foes together), since a hero has one style at a time.
- **N94. What changed and why.** Kit 1.4 changed 39 forms, 1.5 fixed review pass 1, 2.0 fixed
  pass 2, 2.1 fixed pass 3, 2.2 pass 4, 2.3 pass 5, 2.4 pass 6, 2.5 pass 7 (`WINDBRIAR_REVIEW_PASSES.md`). The 1.5 and 2.0 reasons are kept in
  `WINDBRIAR_NOTES_2.0.md` N94. The 2.1 changes:
  - Deadeye. F3 Bounty hits for 24 (pass 3: Deadeye utility forms dealt too little). F11 Recoil
    blast replaces Sticky charge (a delay then a big hit repeated Sky Bolt). F12 Spotter wheel
    has eight arrows (budget). F15 Tripwire's two arrows now fire into the tripped foe. F16 Arrow
    hedge replaces Gathered quiver ("shoot through what she laid down" repeated Wind lane and
    C5). F17 Feather guard replaces Closing fan (five arrows into one line repeated Split the
    shaft). F20 Lone wolf hits the lone foe for 24. F23 Vanish replaces Running draw ("draws at
    once" copied T9; drawing on the move copied C10).
  - Volley. F5 Herding sweep replaces Scythe (only an angle). F9 Painted fan replaces Rolling
    volley (a number tweak). F13 Skip burst replaces Branch (splitting repeated Cluster and the
    Volley Gale Arrow). F15 Linked traps replaces "three traps" (a count). F16 Crossfire is
    3 × 10 a curtain (budget). F17 Seeking feathers replaces Boomerang (a second pass repeated
    Echo line). F21 Orbit is 2 s of 4 (budget). F22 String wave replaces Staff dance (a ring
    round her repeated Orbit).
  - Gale. F3 Homing heel replaces the timed mark (a number tweak). F4 Lasso replaces Flail swing
    and F20 Cuju replaces Knot kick (both used a foe as a bowling ball, which is Breakdance's
    and W9's). F5 Foot pin replaces Orbit run (a circle run repeated Lasso). F6 Last rites
    replaces the bicycle kick (a flip kick that launches and shoots repeated the base Crescent
    Kick and Air juggle). F8 Arrow spear replaces Ride (a spin through a line repeated Travel
    spin). F10 Rain cloak replaces Haul (pull in, then launch, repeated the Gale Arrow's ring).
    F15 Barbed heel replaces Snare kick (a kicked ball repeated Cuju). F18 Over the top is a
    cartwheel that never touches the foe (a spring off a foe repeated Head hop and Kick-off).
    F21 Parry spin replaces Travel spin (a number tweak). F22 Hook swap replaces Hook pull (a
    small extra). F23 Kick wake replaces Wake (dragging foes while she moves repeated Cuju).
    F24 Sinkhole replaces Meteor (a slam down with a splash copied combo C4).
  - 2.2 (review pass 4): Deadeye Quick dart replaces Feather guard (Deadeye had six keep-away
    tools); Crescent cut replaces Skeet (the base Crescent Kick with counts changed); Lone wolf
    loses its 25% (it echoed T4); Bounty and Interrupt are under double (budget); Push-back's halt
    is a slow (a clean control class). Volley Corridor replaces Scatter draw (a fan, as the base
    Volley and the Volley Gale Arrow); Four rains replaces Cloudburst (the same 56 made faster);
    Twister field replaces Arrow eater (it copied C5); Feather drift replaces Seeking feathers
    (homing to different foes repeated Cull); Bouncing launch replaces Scatter launch (the base
    with counts changed); String wave stuns instead of pushing (three pushes in Volley); Cull no
    longer doubles or readies itself. Gale Slingshot replaces Lasso (it copied C1, and with Cage
    both enclosed the pack); Beat mark replaces Homing heel (Slingshot now flies her at a foe);
    Last gust replaces Last rites (a third spring off a foe); Closing rain replaces Rain cloak,
    and Homecoming twister replaces Tag twister (with Barbed heel, three forms were "a kick calls
    the skill onto the foe", and Rain cloak copied T15); Kicked saw replaces Heel wheel (the base
    Whirl Shot restyled); Wing steps replaces Kick fan (a tweak that threw foes away); Chase now
    kicks a straggler back into the pack (聚怪); Barbed heel's snaps are small stuns with no ticks
    (budget).
  - Also: the boss and control lines follow formula D35 to D40 (N95.3); the tank lines are AI
    lines (N99); Execute's true damage is a health source (D23.3); the knees (N79); colours are
    an open pick (kit pick 3, N100); the form ids are DE, VO and GA, so they never read as the
    formula's D numbers.
  - 2.3 (review pass 5): Deadeye Eye hold replaces Wind lane (T10 in a strip), Snap shot
    replaces Quick dart (it echoed C10), Catch replaces Hang time's slow (a sixth keep-away),
    Avenger replaces Back line (it skipped near foes, as Big game does), Run-up replaces Vanish
    (keep-away). Volley Pressure line replaces Corridor (it scattered the pack), Hopping rain
    and Updraft replace Four rains and Twister field (with Cluster, three "one becomes many"),
    Gust replaces Feather drift (walk-in mines, as Linked traps), Dust cloud replaces Orbit (an
    aura, as Fountain), Resonance replaces String wave (an area stun, as the Net). Gale: Chase
    no longer throws its foe into others (Breakdance's), Wound kick replaces Kick-off (a spring
    off a foe, as Head hop), Pull fan replaces Trip (a lock then point-blank shots, as Foot pin),
    Bramble patch replaces Barbed heel (charges spent by hits, as Beat mark), Fan feint replaces
    Wing steps (the Gale dash kick three times), Shoulder throw replaces Hook swap (behind the
    foe, as Over the top). Budget numbers moved for Catch, Pressure line, Two knots, Fountain,
    Beat mark, Breakdance, Cuju and Shoulder throw (N98).
  - 2.4 (review pass 6): Deadeye Eye hold now flings its foe up after the hold (it was a hold
    and one volley, as Split the shaft's one big hit); Recall feather replaces Snap shot (an
    instant shot, as Interrupt's snap shots and the base); Catch is 30 and returns two caught
    shots to their shooters at 10 each (budget); Crescent cut grows with range (it was the base
    kick's crescent with the kick taken out); Slide stance replaces Run-up (a damage wind-up,
    as Sweet spot). Volley Web replaces Skip burst (a travelling burst, as Cluster); Ripple
    replaces Resonance (a delayed echo of past hits, as Echo line and Painted fan). Gale Slide
    shot replaces Pull fan (three arrows that tug foes in, as the Gale Arrow's ring); Blast ride
    replaces Blast jump (a blast that throws her up, as Vault Shot and Recoil blast); Kicked saw
    kicks 3 u (her 3 u reach); Briar lash replaces Bramble patch (a patch that roots, as Foot
    pin); Bulldoze replaces Cage (a fence round the pack, as the Closing rain's ring); Pinwheel
    replaces Fan feint (a blind, as Dust cloud); Head clap replaces Shoulder throw (a foe thrown
    behind her with a stun, as Chase). Also: the rules name which hits are arrows, the blind
    cap, the champion Interrupt guard and the launch rule (N95); C3, C4 and C11 list every form
    (N96); every form has a co-op line; the template tags name Blade only (N100). After my own
    check: Curve line replaces Echo line (with Painted fan, two forms re-hit foes already hit);
    Avenger's three arrows all hunt one foe, 16 each (it was a guard tool, not a sniper move).
  - 2.5 (review pass 7): Deadeye Feather sentry replaces Recall feather (a free full draw copied
    T9 and C10). Volley Linked traps drag their foes together, with no stun (with the Net and
    Two knots, three forms ended in a small stun on a pack). Gale Ride replaces Last gust (a
    kill that turns into an area copied T8); Switch replaces Over the top (with Slide shot, two
    forms ended behind one foe); Zigzag replaces Kick wake (with Blast ride, two forms hit each
    foe on her path). Also: tags fixed to N95.1 (blasts, wind strikes and her body are not
    arrows); Dust cloud no longer renews past the blind guard; N95.6's launch times corrected;
    Pain link capped at 16 (N101); T12 is one rule for the whole kind (N31); the Volley basic
    is inside N37 (N40); C1, C4 and C6 ruled per style; budget rows 3, 4, 6, 9, 12, 15, 17, 18,
    21 and 23 redone; seven forms changed since 1.5 are now bold; seven "none" co-op lines
    made real; Spear dive and Sky Bolt look apart. Not fixed, and listed as close pairs below:
    Bulldoze and Closing rain, Pinwheel and Sinkhole, Crossfire and Two knots, Ripple and
    Bouncing launch, Interrupt and Avenger, Flank and Crescent cut.
  - 2.7 (Kesh's redesign, N92b): Eagle Stance's Gale form is Wind well, a well left by a dive
    slam that drags foes in 4 s while she moves freely, then bursts. No form makes a moved foe
    hurt others any more (N95.2, N101).
  - 2.8 (Kesh's redesign): Rapid Fire's Gale form is Shadow kicks, a blink-and-kick chain that
    ends in a launch and one arrow; Foot pin's root and hip shots are gone, so she has no root.
    Then the fourth kick became a backflip flash kick that sends the foe high (1.0 s in the air).
  - **One mechanism per form.** The core mechanism of each form, so a repeat can be seen at a
    glance. Goals may repeat (Gale gathers seven ways); mechanisms do not.

    | F | Deadeye | Volley | Gale |
    |---|---|---|---|
    | 1 | bonus by where it hits | a line that curves round the pack | kick, then the arrow chases |
    | 2 | release timing | wind drags foes into the line | a held, wound kick |
    | 3 | refund on the mark's fall | vulnerability on an area | pips popped by her hits |
    | 4 | damage shared by a tie | a thrown net | she slings herself |
    | 5 | stacked arrows split | a sweep that herds | she blinks behind a knocked-back foe and kicks it on |
    | 6 | a health line kills | finishing every weak foe | she rides a foe, then shoots down |
    | 7 | each shot knocks back | stance shots fall as bursts | a well left in place drags, then bursts |
    | 8 | passes small, stops in big | a wall foes cannot cross | the arrow as a spear |
    | 9 | breaks wind-ups | paint, then the next skill echoes | under a foe, it is shot up from below |
    | 10 | a delayed drop she aims ahead | a rain that hops after packs | a ring of rain closing in |
    | 11 | point-blank, she is blown back | bursts that burst again | a blast fires her through a line |
    | 12 | allies' hits call the arrows | a ring that rolls away | a saw she kicks out |
    | 13 | bounces off walls | hops leave threads between foes | springs off heads |
    | 14 | held in the eye, then flung up | the twister lifts the pack | the twister rolls back to her |
    | 15 | a wire across a path | the traps drag their foes together | a whip that knocks an arc flat |
    | 16 | arrows stand as cover | two curtains cross | a curtain that plows forward |
    | 17 | a feather that shoots 2 s later | a flap that blows back | a drill in one foe pulls the rest |
    | 18 | catches shots, returns them | a decoy draws foes | she and a foe trade places |
    | 19 | a crescent that grows with range | one launch chains on | she leaps after the launched foe |
    | 20 | the others blown off one | two packs collide | the pack as a ball |
    | 21 | three spin arrows hunt the team's attacker | a cloud that blinds | parries melee hits |
    | 22 | defence shredded | a shock through touching foes | two heads knocked together |
    | 23 | the run slides into a stance | fans loosed while fleeing | sharp turns become spin kicks |
    | 24 | a spear-like dive | a crater fountain | the floor sinks into a pit |

  - Close but kept, said plainly (each pair shares a goal or a shape, not the mechanism):
    - Deadeye Flank and Crescent cut both raise one hit by position: Flank by the angle on the
      foe, Crescent cut by her distance from it. Flank and Lone wolf: where she strikes, or
      clearing the foe's friends away.
    - Gale Wound kick and Arrow spear both spin round her for damage: a kick she winds by
      holding, or a spear spin that ends in a throw down a line.
    - Deadeye Avenger and Spotter wheel both answer the team: Avenger's arrows hunt who hit
      an ally, the wheel's arrows drop when allies hit its foe.
    - Deadeye Tripwire and Volley Web: one wire she lays across a path to trip one foe, or
      threads the hops leave inside a pack that slow it.
    - Volley Ripple and Bouncing launch both chain through a pack: an instant shock through
      foes that touch, or launches passed on foe by foe as each lands.
    - Volley Two knots and Gale Head clap both bang foes together: two whole packs at range,
      or two foes in her paws.
    - Gale Ride and Head hop both stand on foes: one ridden and steered 1 s, or four heads
      sprung off in a row. Switch and Chase both relocate one foe: a trade of places, or a kick
      toward the pack.
    - Gale Wind well and Sinkhole both start with a dive into the floor that pulls foes in: a
      well that drags for 4 s while she leaves, or a pit she drills and springs out of (he
      kept the dive, pick 1a).
    - Gale Shadow kicks and Chase both kick one foe away and follow it: a chain of blinks behind
      it, or one kick and an arrow that chases. Shadow kicks and Air juggle both end with the foe
      in the air: one arrow, or three air kicks.
      Its last kick is a backflip kick that launches, as the base Crescent Kick's (Kesh's pick).
    - Gale Pinwheel and Sinkhole both pull foes to a spot: a drill stuck in one foe, or a pit
      in the floor. Kicked saw is a third spot that grinds, and pulls nothing.
    - Volley Crossfire and Two knots both meet two copies at a point: two curtains crossing
      over the aim, or two packs dragged into each other.
    - Deadeye Interrupt and Avenger both choose their foes by what the foes do: wind-ups, or
      hits on the team.
    - Deadeye Slide stance's core is another skill: it hands her a short Eagle Stance.
    - Volley Hopping rain follows packs by itself, which C6 does once by combo.
    - Deadeye Feather sentry and the passive Kestrel Watch both shoot for her: one shot from
      where she stood, or a steady 6 a second at the nearest foe.
    - Deadeye Recoil blast and Gale Blast ride mirror each other: a blast that throws her back
      off one foe, or one that fires her forward through many.
    - Gale Bulldoze, Gale Closing rain and Volley Herding sweep all move a pack with arrows: a
      plow in her facing (it feeds C2), a ring closing on a spot, a sweep that bends foes into
      a corner.
- **N95. Rules every form follows.**
  1. **Tags and arrows.** Each form's line names the tag it usually earns: single (T4: an arrow
     that hit one foe), wide (T5), close (T6, T9), or none. An arrow is any shaft she shoots or
     throws: shots, fans, curtains, Pinwheel's drill and the Arrow spear's throw. Not arrows:
     kicks, bow strikes, the Arrow spear's spin, wind shapes and blasts
     (crescents, twisters, knots, gusts, Lone wolf's strike, Recoil blast, Blast ride), Spear
     dive (her body) and the kestrel. A twister's shots are arrows. So Recoil blast, Lone wolf,
     Spear dive, Crescent cut, Eye hold and Blast ride are tagged none, and T7 and T13 never
     count them. A close hit (T6, T9) is a kick, bow strike or arrow within 2 u, as N11.
     Extra strikes are arrows on one foe each (single for T4; T7 can fly on from them):
     Painted fan's strike and the Spotter wheel's drops. Area ticks are not arrows: trap ticks,
     rain ticks, Web's threads and the Kicked saw's cuts count for T5 (each tick one release),
     never for T4 or T7.
  2. **Thrown foes.** No moved foe hurts the foes it hits (the 霹雳舞's kick-outs went in 2.7).
     Every push, throw, blow, drag, plow or carry moves foes through each other with no
     damage. Head clap's 15 is the bow's hit on each foe, not the knock. A foe moved into a
     wall: C2.
  3. **Control time** (formula D35 to D40). Control time = base × (1 − 效果抵抗); a boss has 80%,
     a champion 30%, an elite 20%; never shorter than 0.25 s (D37). A slow keeps its strength
     and only its time is cut (D36). A stun is 1 s at most, then 2 s with no stun (D38), except
     the small stuns of item 5. After a hard CC a boss takes no hard CC for 5 s (D40.3); slows
     have no such gap. A boss is never moved, tied, grabbed, launched, carried, flung or thrown
     (D40.1); the hit that would move it deals 20% more. Eye hold's hold is a stun, so a boss
     is held 0.25 s and is not flung. Every stun on a boss, small or not (a stagger, a pin, a
     trip, a knock-down), is hard CC: it lasts 0.25 s and starts the 5 s gap; inside the gap
     the boss takes the hit with no stun. A boss's telegraphed attack is never broken (D40.2).
  4. **Control classes.**
     - Stun (hard CC): every "stun", Sweet spot's stagger, Tripwire's trip, Eye hold's hold,
       Spear dive's pin, Briar lash's knock-down, Head clap, Ride's ride.
     - Blind (hard CC, D36): Dust cloud only: the foe's attacks and shots miss. A foe is blinded
       1.5 s at most, then cannot be blinded for 2 s (as D38's stun guard), even if it stays in
       the cloud. A boss: 0.3 s, then its 5 s gap.
     - Slow: every "slow", Push-back, Web's threads. Gust's dropped shots are not control.
     - Grounded (Tripwire): no dash, leap or charge; cut like a slow, no gap.
     - Forced target, taunt under D36 and D41 (at most 1 s on a boss, then 5 s free; no form
       uses it on a boss): Decoy only. Stonehide's taunt wins over hers.
     - Movement, not control (D40.1; 效果抵抗 does not cut it): pushes, pulls, drags, launches,
       flings, throws, plows, the Cuju carry, the Updraft lift, the Closing rain's herding,
       Pinwheel's pull, Bulldoze's push, the Sinkhole's slide, Linked traps' drag, Switch's
       swap, Ride's steer.
     - Terrain, not control: Wind wall and Arrow hedge. A taunted foe walks along a wall toward
       the tank and goes to him when it falls.
     - Not control: a foe whose target is gone (Decoy's end) picks again at once.
  5. **Small stuns.** N13: a stun of 0.5 s or less from a form starts no 2 s guard. Cap: a foe
     takes at most 1 s of small stuns in any 2 s, from all heroes together; one that would go
     over is dropped. So the Gale small stuns cannot lock an elite.
  6. **Launches have no guard.** Kesh's A2b (N89): a foe can be launched again while in the air.
     I do not cap it; it is his pick. Launches are movement (item 4), so a boss is never
     launched and an elite or champion is launched for the full time. Her launches last 0.3 s
     (the Gale basic's flip kick) to 1.5 s (Updraft). With the flip kick in every Gale combo
     (1.5 s), she can keep one small foe in the air as long as she keeps hitting it; that is
     the juggling he asked for. Every launch form hits each foe once per cast.
  7. **The tank.** Her moves move a foe Stonehide holds; it walks back if still taunted (W9, N88).
     The AI never moves a held foe away from him (N99).
  8. **Co-op.** Her slows, roots, blinds and stuns work for every hero; her 易伤 (Hunter's Mark,
     Flare, Beat mark) counts every hero's hits; her 增伤 (Eagle Stance's 60%, also in Slide
     stance) is hers alone. Nothing dims or slows another player's screen. Her walls, hedges,
     threads and curtains let allies and their shots through.
  9. **Floor.** Nothing she makes stands on a floor warning; it moves to the nearest clear spot.
  10. **Colour.** Never Ember, Violet or Foe Crimson. The rest is kit pick 3 (N100).
  11. **Her damage over time.** She has none (W4). A trap's ticks, a rain, a thread and a saw
     are area hits while a foe stays in them (N19).
  12. **Champions and Interrupt.** A champion's wind-up can be broken once, then not again for
     5 s (as a boss's hard CC gap; its telegraphed attacks are never broken, D40.2). An elite's
     can be broken each time.
- **N96. Combos under the forms.**
  - C1 Thread the knot: any Pinning Arrow form on a pack Windknot or Tornado Shot gathered.
    Deadeye: C1 has no Deadeye case. The combo needs Windknot or Tornado Shot, and neither
    Deadeye form gathers (Lone wolf blows foes off, Eye hold pulls none).
    Volley: the Net stuns them 1 s. Gale: Slingshot's cord threads them, all stunned 1 s, and she
    slings herself at the knot.
  - C2 Wall slam: any form that moves a foe into a wall: the base Skypiercer carry, Bow Sweep and
    Cyclone Kick pushes, Deadeye Split the shaft, Push-back and Lone wolf's blow, Volley Herding
    sweep, Gust and Two knots, Gale Chase, Wound kick, Shadow kicks' knock-backs, Ride's steer,
    Blast ride's knock, Bulldoze, Parry spin's push and Cuju's last kick; also the base kicks' push
    kept by Avenger and Dust cloud, the base shot's push kept by Ripple, Pressure line's drag,
    Closing rain's herding, the Homecoming twister's pull and Arrow spear's thrown drill (its
    carry). Its 0.5 s stun is the one small stun that starts the 2 s guard (N13), so Push-back
    cannot lock a foe on a wall.
  - C3 Air shot: every launch feeds it: the base Crescent Kick and Eagle Dive, the Gale flip kick of
    the basic, the Gale style's Gale Arrow ring, Deadeye Eye hold's fling, Volley Updraft and
    Bouncing launch, Gale Beat mark's burst, Slingshot's landing, Shadow kicks' fourth kick, Slide
    shot and Air juggle (on the base kick's launch). Crescent cut no longer launches.
  - C4 Spike: the base Eagle Dive's heel or Kill Shot on a foe in the air. Deadeye: Spear dive
    spikes; Execute spikes. Volley: Fountain's dive spikes as the base; each Cull arrow spikes.
    Gale: Sinkhole drills the floor and never spikes; Ride spikes (she lands on the foe in the
    air and brings it down).
  - C5 Through the twister: only arrows shot into a twister from outside split. Deadeye: Eye hold
    has no open wall, so nothing splits. Volley: Updraft splits as the base. Gale: the Homecoming
    twister splits arrows that enter it.
  - C6 The rain rides the wind: the rain moves once, at the cast. Deadeye: no rain (Sky Bolt),
    and Lone wolf and Eye hold move none. Volley: Two knots takes the rain to the first knot,
    Updraft leaves it where it is; Hopping rain then hops on as itself. Gale: Cuju's ball does
    not carry a rain; the Homecoming twister drags the Closing rain's ring back toward her as
    it rolls, still closing.
  - C7 The kestrel hunts the mark: the Bounty mark, any Flared foe, the Beat mark.
  - C8 Kick them in: the stun is 1 s (D38 caps the combo file's 1.4 s), then a 50% slow for
    0.4 s; the first second deals double. Deadeye Tripwire counts (the knocked foe trips 1 s);
    Volley each linked trap. Gale Briar lash lays no trap, so C8 has nothing to spring under
    Gale.
  - C9 Shoot the arrow: Volley Cluster goes off at once with every shard. Deadeye Recoil blast
    and Gale Blast ride burst at once, so C9 never applies to them.
  - C10 Dash draw: works with Sweet spot (the window can be hit in the dash). It covers drawn
    shots only: a dash cancels Wound kick's held wind-up.
  - C11 Sky cast (Volley, Feather Fan, Whirl Shot or Burst Arrow pressed in the dash). All 16
    forms of the four:
    - Shot from the top, 30% more cover: base Volley, Feather Fan's spray, Whirl Shot's ring
      and Burst Arrow; Deadeye Interrupt; Volley Painted fan, Gust and Cluster (its first burst).
    - From the top, no 30% (one target): Deadeye Recoil blast (point-blank).
    - Start where she lands, no 30% (they need the floor or a foe at reach): Deadeye Spotter
      wheel and Feather sentry (the feather is left where she lands); Volley Spinning top; Gale
      Slide shot, Pinwheel, Kicked saw and Blast ride.
  - C12 Full sail: unchanged.
  - Execute with T7: the arrow that executes flies on with its direct damage (the triple or the
    base), not with the true damage of the fall.
- **N97. Two base nudges, taken (kit pick 2a, 19 Nov):** Volley is a long narrow fan (6 u, 30°),
  and Feather Fan has no 30% run. The other base pairs (four piercing lines, three backflips, two pulls,
  several spins) stay as roles; the page makes their looks differ: Piercing thin and fast, Power
  slow and heavy, Skypiercer a carrying drill; Vault low and long, Crescent tall and in place.
  Cyclone Kick is three upright jumping spins (N92's open point, decided), so no form spins
  on the floor.
  Feather sentry and Pinwheel had the run as part of the base; both now go without it.
- **N98. Budget, all 72 forms by one method.** Each form is set against its base in the base's
  own case: one foe for Power Shot, Hunter's Mark, Pinning Arrow, Rapid Fire, Kill Shot, Vault
  Shot and Bow Sweep; a pack of four for the rest. Two rules: no form reaches double the base's
  total (a form that reaches more foes than the base is judged per foe), and a pack form of a one-foe base deals each foe no more than the base deals its one
  foe. A base with almost no damage (Eagle Stance's own press, Windknot's 8, Windrun's 0) is set
  against its own gain: the form's damage is its whole gain, and its control is its point.
  Numbers are totals per cast; × is the ratio.

  | F | Base (its case) | Deadeye | Volley | Gale |
  |---|---|---|---|---|
  | 1 | 120 (four on the line) | Flank about 150, × 1.25 | Curve line 26 a foe, about 104 on four, × 0.87 (more foes on a curve) | Chase 38 one foe, × 0.3 + stun |
  | 2 | 48 (one) | Sweet spot 77, × 1.6 (needs the window) | Pressure line 20 a foe ≤ 48 | Wound kick 40 a foe ≤ 48 |
  | 3 | 12 + 30% 3 s (one, about 27) | Bounty 18 + 30% 5 s, about 43, × 1.6 + refund | Flare 12 + 20% on four, about 44, × 1.6 | Beat mark 30 + 30% kept up while her pips renew it, about 50, × 1.85 |
  | 4 | 20 + 1 s tie (one) | Pain link 20 + at most 16 shared, 36 on the first foe, × 1.8 judged per foe | Net 14 a foe ≤ 20, stun | Slingshot 30 + launches, × 1.5 |
  | 5 | 50 (one) | Split the shaft 62, × 1.24 | Herding sweep 50, × 1.0 + herd | Shadow kicks 30 + 8 + 24, 62, × 1.24 (31 on the arrow with C3) |
  | 6 | 48 under 30% (one) | Execute 72, × 1.5 (or the fall) | Cull 24 a foe ≤ 48 | Ride 48 under 30% + a 1 s stun, × 1.0 |
  | 7 | stance, about +66 over 4 s | Push-back +66 and the slows | Mortar: +66 on the foe aimed at, a third of each shot (about 60) on each other foe in the burst, judged per foe | Wind well: slam 10 + burst 24 a foe, about 116 on four, × 1.76 of the stance gain |
  | 8 | 192 (four in the drill) | Big game 72 on one big foe | Wind wall about 96 + the block | Arrow spear 96 spin + 24 a foe on the throw's line, about 140, × 0.73 |
  | 9 | 42 (four) | Interrupt 60 on wind-ups, × 1.43 | Painted fan 42 + 8 on up to three painted, about 66, × 1.57 | Slide shot 48 on one, × 1.14 + launch |
  | 10 | 224 (four for 4 s) | Sky Bolt 70 + 20s, about 130, × 0.6 | Hopping rain about 290 as it follows, × 1.3 | Closing rain about 112 + herd, × 0.5 |
  | 11 | 90 (four) | Recoil blast 72, × 0.8 | Cluster about 130, × 1.44 | Blast ride 64 on four + the base shards 36, about 100, × 1.1 |
  | 12 | 64 (four) | Spotter wheel 64, × 1.0 | Spinning top 64 on four, × 1.0 | Kicked saw about 72, × 1.13 |
  | 13 | 60 | Bank shot 88, × 1.47 | Web 60 + threads about 30, about 90, × 1.5 | Head hop 52, × 0.87 |
  | 14 | 36 + the pull | Eye hold 24 on one + 1 s hold + fling, × 0.67 | Updraft 36 + 1.5 s lift | Homecoming twister 36 + the pull to her |
  | 15 | 48 (the foes in its 0.75 u) | Tripwire 32 + 1 s trip + 3 s grounded | Linked traps 24 a foe ≤ 48, three spots + the drag | Briar lash 32 on four + knock-down, × 0.67 |
  | 16 | 168 (four) | Arrow hedge 168 + cover, × 1.0 | Crossfire about 150 (60 at the cross), × 0.9 | Bulldoze 120 + the push, × 0.71 |
  | 17 | 45 (four) | Feather sentry 45 + 24, about 69, × 1.53 | Gust 36 + the push, × 0.8 | Pinwheel 24 + the pull, × 0.53 |
  | 18 | 18 (one) | Catch 30 on one, × 1.67; each returned shot 10 to its shooter | Decoy 8 a foe ≤ 18 + the draw | Switch 18 + the swap, × 1.0 |
  | 19 | 40 (two kicked, one shot) | Crescent cut 20 to 60, × 0.5 to 1.5 | Bouncing launch 50, × 1.25 | Air juggle 32, × 0.8 |
  | 20 | 32 + the gather | Lone wolf 36, × 1.1 | Two knots 12 a foe (eight foes) vs 8, × 1.5 + stun | Cuju 14 a foe vs 8, × 1.75 + a 2 s carry |
  | 21 | 90 (four: kicks 3 × 6 × 4, arrows 3 × 6) | Avenger 72 + 48 on one, about 120, × 1.33 | Dust cloud 72 + blind, × 0.8 | Parry spin 72 + 10 a parry, about 92, × 1.02 |
  | 22 | 30 (one) | Armour break 34 + 30% 减防, × 1.13 | Ripple 30 + 10 a touching foe ≤ 30 | Head clap 15 a foe, 30 on two, × 1.0 + stun |
  | 23 | 0 (a run) | Slide stance: a free 2 s stance, about +33 | Parting fans up to 90 | Zigzag 12 a foe a turn, at most 144 (two foes, six turns) |
  | 24 | 94 (four) | Spear dive 60 on one, × 0.64 | Fountain 154, × 1.64 | Sinkhole 64 + the pit, × 0.7 |

  - To measure first: Sweet spot, Execute, Painted fan, Fountain, Catch, Wind well, Feather
    sentry, Crescent cut at long range, Mortar, Zigzag.
- **N99. AI seat, every style.** As N77, and each form has its own AI line in section 10.
  Shared: the AI never casts a move form into a floor warning; never moves a foe Stonehide
  holds away from him; holds a drawn shot only when no foe is within 2 u of her; hits the Sweet
  spot window 60% of the time; casts boss forms (Big game, Execute's triple, Armour break) on
  the boss first.
- **N100. Looks, colour and VFX templates** (docs/VFX_TEMPLATES.md, which archers map to Blade,
  and which wins over "the Archer's thin jade lines").
  - Kit pick 3, taken as a (19 Nov): arrows, kicks, bow strikes and bursts take the Blade template
    (Blaze Core #FFF3C4 heads, Blaze Gold #FFB43C tails, sparks with motion blur); her wind
    shapes stay Wind Jade #5ED3C0 (twisters, webs, nets, walls, wires, the knot, the closing
    rain, the Sky Bolt reticle). (He did not take b, all Wind Jade, or
    c, all Blade.) Ashfang is Fox Crimson with a silver edge, so her gold does
    not clash with his.
  - Every look line in section 10 names its shape; "streak" means a Blade comet.
  - Glows about 40% under the Part 2 draft; one light budget per spot; reticles and warnings
    full strength. The Sky Bolt reticle is a jade ring with four feather ticks, never Ember.
- **N101. The formula on the forms** (v1.2).
  - 基础伤害区: Flank's 50%, Sweet spot, Split the shaft's 30, Execute's triple, Kill Shot's
    double, the 20% on a boss she cannot move, Crescent cut's range.
  - 暴击区: Hundred Paces only.
  - 增伤区 (all add): Heartseeker, Hail, Iron Leg, Eagle Stance's 60% (also in Slide stance),
    Fleet Foot's 20%.
  - 易伤区: Hunter's Mark (30%; also Bounty and Beat mark) and Flare (20%). They are forms of one
    skill, so one Windbriar holds only one; with another hero's 易伤 of another name they add
    (D19).
  - 减伤区: 风护 20%. 防御区: Armour break's 30% 减防; Hundred Paces and the Deadeye Gale Arrow
    ignore defence.
  - 真实伤害: Execute's fall: 15% of the foe's maximum health (D23 source 3), which is more than
    it has left, so it falls; shields take it first (D9).
  - 附加伤害 (D5: it can crit and takes 增伤 and 易伤; not a hit): Falling Feathers.
  - 真实伤害 by D23 source 1 (the final damage of the hit that triggered it): Pain link's share,
    half of that final damage, capped at 16 on each foe per cast. No new damage type.
  - 控制: N95.3 to N95.5.

## 10. Every form in full

Each form: the rule; its tag (N95.1); type and 抗性 form; boss; co-op; motion with times from
the press; look; sound; AI. DE = Deadeye, VO = Volley, GA = Gale, then the kit's F number.
Bosses follow N95.3 everywhere; a line only says what is special.

- **N102. Deadeye forms.**
  - **DE1 背射 Flank** (Piercing Shot). The line pierces: 30; a foe struck in its side or back
    (the half of its body away from its facing) takes 45. Tag single or wide. 常规直伤, ranged. Boss: turns slowly,
    so this is its use. Co-op: a foe Stonehide holds faces him, so her flank is open. Motion
    0.6 s: a skip to the side to open the angle, a flat snap shot, ears swinging. Look: a thin
    streak; a pale arc lights on each foe's back as it passes; a flank hit throws a small spark
    ring. Sound: a thin crack, a bright ping on a flank. AI: steps up to 1.5 u aside first.
  - **DE2 满月 Sweet spot** (Power Shot). The base draw; let go in the last 0.15 s before the full
    draw, as the arrowhead glints: 77 and a 0.5 s stagger. Otherwise 48 full, 24 tap. Tag single.
    常规直伤, ranged. Boss: stagger 0.25 s. Co-op: a stagger for allies to hit. Motion 1.3 s: low on her
    haunches, the head swells with light, a glint and a tick at the window; a sweet release freezes
    the hit 0.08 s and a white shock ring pops at the bow. Look: a heavy streak with rings along it.
    Sound: a rising hum, a bell at the window, a deep crack. AI: the window 60% of the time.
  - **DE3 悬赏 Bounty** (Hunter's Mark). 18; the mark lasts 5 s (30% 易伤); if the foe falls in it,
    to anyone, every cooldown of hers drops 3 s. Tag single. 常规直伤, ranged; 易伤. Boss: it holds
    but never pays in 5 s: the elite and champion form. Co-op: any hero's kill pays her. Motion
    0.5 s: two fingers across her eyes, a slow point, a snap shot. Look: three feathers turn
    over the foe; on the payout they fly to her bow. Sound: a lock click; a chime on the payout.
    AI: marks the lowest-health elite within 6 u.
  - **DE4 痛链 Pain link** (Pinning Arrow). The base pin and tie; for 4 s half of what one tied foe
    takes, the other takes too (真实伤害 by formula D23 source 1, so it never echoes back), at most 16
    on each foe in the 4 s. Tag single. 常规直伤, ranged; the share 真实. Boss: not tied, but it can be
    linked to the foe pinned beside it and takes half of that foe's damage. Co-op: every hero's hits
    are shared. Motion 0.7 s: a hop, a steep shot down; the cord pulls taut. Look: a jade cord that
    pulses at each shared hit. Sound: a taut hum, a low thrum each share. AI: links an elite to the
    boss, or a weak foe to an elite.
  - **DE5 劈箭 Split the shaft** (Rapid Fire). Four full draws of 8 into the same spot on one foe; the
    fifth splits the four: 30, and it is knocked back 1.5 u. Tag single. 常规直伤, ranged. Boss: not
    moved, the fifth 36. Co-op: the knock-back can send the foe to the tank. Motion 1.7 s: five
    slow, even draws, ears still; the shafts bunch in one spot; the fifth cracks through them. Look:
    four split shafts burst out like petals. Sound: four flat thocks, a splintering crack. AI: on a
    foe that is standing still.
  - **DE6 斩杀 Execute** (Kill Shot). A small foe or elite under 15% health falls (true damage,
    N101); a champion or boss under 30% takes triple (72); otherwise the base. A kill readies it
    again. Tag single. 常规直伤, ranged. Boss: its triple is the boss use; measure it first.
    Co-op: shields take the fall first. Motion 0.8 s: the arrow toss and catch, a slow draw with
    narrowed eyes, one streak; a felled foe stands pinned a beat, then folds. Look: a thin jade
    line across each health bar in reach at its threshold. Sound: silence, one hard snap. AI:
    holds it for the line.
  - **DE7 压制 Push-back** (Eagle Stance). The stance; each shot knocks its foe back 0.6 u and
    slows it 50% for 0.5 s (a slow, D36; no hard-CC gap). Tag single. 常规直伤, ranged. Boss: not
    moved, +20% a shot; slowed 50% for 0.25 s. Co-op: holds foes off the back line. Motion 0.4 s
    to settle: down on her haunches, the bow across a raised hind paw; each shot rocks her and
    the foe skids. Look: a dust skid under each struck foe. Sound: a crack and a scrape. AI: when
    the nearest foe walks in from 3 to 6 u.
  - **DE8 猎巨 Big game** (Skypiercer). The drill passes small foes (no damage, no carry) and buries
    in the first elite, champion or boss: six hits and a 24 burst. With no big foe, the base. Tag
    single. 常规直伤, ranged; the burst area. Boss: its main boss form. Co-op: the drill passes through
    allies' small foes to the big one. Motion 1.8 s: the leap and hang; the drill thins to a needle
    and slips through the small foes; the big foe bulges with light and bursts. Look: a needle
    streak, a burst ring. Sound: a thin whine, a muffled boom. AI: only with a big foe on the line.
  - **DE9 断招 Interrupt** (Volley). The three arrows go one by one to foes winding up within 6 u:
    each wind-up broken, 20. With none, the base fan. Tag single. 常规直伤, ranged. Boss: its
    wind-up is never broken; it still takes 20. Co-op: stops a charge at an ally. Motion 0.6 s:
    head still, eyes flicking, three snap shots. Look: a broken telegraph shatters like glass.
    Sound: three dry ticks, a glass crack. AI: only when a wind-up is in reach.
  - **DE10 天坠 Sky Bolt** (Rain of Arrows). No rain; a reticle, and 1.5 s later one giant arrow:
    70 at the centre falling evenly to 20 at 1.5 u. Tag single or wide. 常规直伤, area. Boss: the
    slow boss's bane. Co-op: all see the reticle. Motion 1.0 s: she shoots straight up and holds,
    bow high; the reticle narrows; the arrow drops as a column of wind and stands 1 s in a
    crater. Look: a jade ring with four feather ticks, never Ember; a dust crown. Sound: a falling
    whistle, a deep boom. AI: aims where its foe will be in 1.5 s.
  - **DE11 爆退 Recoil blast** (Burst Arrow). Shot point-blank into a foe within 2 u, it bursts at
    once: 36 to it, 12 to others within 1 u; the blast throws her 3 u back along her aim's opposite,
    untouchable in the flight. Tag none (a blast, N95.1). 常规直伤, area. Boss: 36. Co-op: the AI blasts
    away from the tank, never into him. Motion 0.7 s: a jab of the bow, the shot, she is blown back
    in a flat spin and skids on her haunches. Look: a short fat burst, sparks thrown at her. Sound:
    a crack and a whump. AI: when a foe is within 2 u and a wall is not behind her.
  - **DE12 准星轮 Spotter wheel** (Whirl Shot). Eight arrows circle over the foe nearest the
    pointer for 4 s; each hit on it by anyone drops one: 8 (one each 0.2 s at most). Arrows left
    fade. Tag single. 常规直伤, ranged. Boss: works. Co-op: her team's hits call them: the co-op
    sniper. Motion 0.8 s: the spin; the arrows fly up and form a turning wheel over the foe. Look:
    eight shafts point-down in a slow ring. Sound: soft chimes, a tick each drop. AI: on the foe
    most allies are hitting.
  - **DE13 折射 Bank shot** (Ricochet). It bounces off walls, pillars, Stonehide's slab and Stone Ring
    up to four times; in the open it skips off the floor every 3 u instead, over the foes between.
    22 to each foe struck; it ends after four bounces or 14 u. Tag single. 常规直伤, ranged. Co-op:
    Stonehide's slab and Stone Ring are walls for it. Motion 0.5 s: a glance at the wall, a shot
    across her body. Look: a spark and a short light trail each bounce. Sound: a clean ring each
    bounce. AI: on a foe behind cover.
  - **DE14 风眼 Eye hold** (Tornado Shot). The twister forms on the foe nearest the spot and holds it
    still in its calm eye for 1 s (a stun, D38; no pull on other foes); then the eye spits it
    straight up: 24, launched 0.6 s (C3 feeds on it). Tag none (the fling is wind). 常规直伤, ranged;
    控制, then movement. A foe inside its 2 s stun guard (D38) is not held: it is flung at once. Boss:
    the hold is a stun of 0.25 s (D37) and starts its 5 s gap; it is not flung, so the 24 deals 20%
    more. Co-op: a held, then airborne foe for every hero's air hits. Motion 0.7 s: the spindle spin
    and a flat shot; she closes her paw as the eye shuts, then flicks it open and up. Look: a slim
    twister with a clear core; the foe shoots out of its top. Sound: a rush, a hush, a pop. AI: on
    an elite that is winding up.
  - **DE15 绊线 Tripwire** (Briar Trap). Two arrows 4 u apart with a wire, 6 s; the first foe across
    trips 1 s and the two arrows tear free into it (2 × 16); it is grounded 3 s (N95.4). Tag single.
    常规直伤, ranged; 控制. Boss: tripped 0.25 s, then its 5 s gap; grounded 0.6 s. Co-op: any foe springs
    it. Motion 0.6 s: two arrows into the floor, a hop between, the wire pulled taut. Look: a thin
    jade wire with a glint running along it. Sound: a taut twang, a trip thud. AI: across the
    nearest charger's path.
  - **DE16 箭篱 Arrow hedge** (Arrowstorm). The curtain sweeps as the base (three hits of 14);
    then its arrows stand as a hedge along its far edge for 5 s: foes walk round it, their shots
    stop on it, hers and allies' pass. Tag wide on the sweep. 常规直伤, area. Boss: walks through,
    the hedge breaks where it passes. Co-op: cover for the whole team. Motion 1.8 s: the slide and
    sky shot; the last rank stands up like reeds. Look: a row of standing shafts. Sound: a fence
    of thuds; a tick on each stopped shot. AI: between the shooters and the party.
  - **DE17 留羽 Feather sentry** (Feather Fan). The base spray (five of 9); a feather stays upright
    where she stood. 2 s after the cast it looses one shot of its own from that spot at the last foe
    she hit, wherever it has gone within 8 u: 24. It is not a draw and does not touch hers. Tag
    single. 常规直伤, ranged. Boss: works. Co-op: a second angle on the foe the team is on. Motion 0.5
    s: the fan sweep, a feather tucked into the floor with two fingers as she turns away; 2 s later
    the feather bends like a tiny bow and snaps straight. Look (blade: comet): a white feather
    standing upright; one comet from it. Sound: a flutter; later a small twang behind her. AI:
    sprays, then moves to put the foe between her and the feather.
  - **DE18 接矢 Catch** (Vault Shot). The backflip stops at the top for 0.6 s, untouchable; foe shots
    that would hit her in it are caught, two at most. Then one full drawn shot at the foe nearest
    the pointer: 30; each caught shot flies back with it to the foe that shot it: 10. Tag single.
    常规直伤, ranged. Boss: its shots are caught, never its spells or beams. Co-op: only shots at her.
    Motion 1.2 s: upside down, her draw paw snatches shafts out of the air and nocks them on the
    string with her own. Look (blade: sparks): a spark at each catch; the shot is a thick comet with
    thin streaks peeling off it. Sound: a click for each catch, a heavy snap. AI: when two shooters
    aim at her.
  - **DE19 弦月斩 Crescent cut** (Crescent Kick). The backflip kick throws its crescent of wind forward
    up to 8 u; it stops in the first foe and grows as it flies: 20 at 1 u, 60 at 8 u (straight
    between). No launch, no point-blank kick. Tag none (a wind crescent, N95.1). 常规直伤, ranged. Boss:
    +20% (not moved). Co-op: flies through allies to the first foe. Motion 0.8 s: a step back, then
    the backflip with both hind paws scything; the crescent leaves her heels and flies flat. Look: a
    thin crescent that widens and brightens with distance. Sound: a sharp whoosh that rises in
    pitch, a slice. AI: steps back to about 7 u first.
  - **DE20 孤狼 Lone wolf** (Windknot). The wind blows every other foe 3 u away from the foe nearest
    the spot and strikes that one: 36. Tag none (a wind strike, N95.1). 常规直伤, area. Boss: the others
    are blown off it. Co-op: clears adds off the boss for the tank. Motion 1.0 s: the bow spun as a
    staff, thrust down; the ribbons blast outward. Look: a ring of wind bursting outward from the
    lone foe. Sound: a whoosh outward. AI: on the boss or an elite in a pack.
  - **DE21 报复 Avenger** (Cyclone Kick). The three kicks as the base (6 each to foes within 1.5 u);
    all three spin arrows hunt one foe: the one that last hit her or an ally in the last 3 s, or the
    foe nearest the pointer if none did: 16 each, 48 on it. Tag single. Kicks melee, arrows ranged.
    Boss: works. Co-op: punishes whatever just hit the team. Solo: a foe that hit her counts. Motion
    1.0 s: three jumping spins; at each turn her head snaps back to the same foe and she looses
    without stopping. Look (blade: comet): three streaks that bend round to one foe. Sound: a
    whistle each, three cracks on one target. AI: on the foe hitting the weakest ally.
  - **DE22 破甲 Armour break** (Bow Sweep). The bow hooks one foe and she drives the arrow in by
    paw: 34; its defence is 30% lower for 4 s. Tag single, close. 常规直伤, melee; 减防. Boss: its
    use (defence 50 to 35). Co-op: every hero gains. Motion 0.7 s: the hook, a plant, a two-pawed
    drive. Look: a crack spreads on the foe. Sound: a crunch. AI: on the boss within 1.5 u.
  - **DE23 滑步架 Slide stance** (Windrun). The base run (3 s faster, foe shots pass through her); it
    ends in a slide on her haunches into a free 2 s Eagle Stance: her basic shots 60% more and
    farther, as the base stance (her Eagle Stance form if she holds it). It does not start Eagle
    Stance's cooldown and needs no Eagle Stance in her bar. It ends early as N17. Tag single (the
    stance shots). 增伤 (the stance's 60%). Boss: works. Co-op: hers alone. Motion 0.3 s to start, the
    3 s run, then a 0.4 s slide that ends seated, bow across a raised hind paw. Look: a dust streak
    from the slide. Sound: a skid, a creak of the string. AI: runs to a firing spot 5 u from the
    pack.
  - **DE24 枪坠 Spear dive** (Eagle Dive). She leaps and dives arrow first at the foe under the
    pointer within 6 u: 60, pinned 0.5 s; no five arrows. With none in reach, the base. Tag none
    (her body, N95.1). 常规直伤, melee. Boss: pin 0.25 s. Co-op: pins a shooter for allies. Motion 1.3
    s: the leap, a head-down turn, she drops like a thrown spear and flips off. Look (blade: blaze):
    her own body as a streak with a wind wake and no reticle; a foe pinned under a standing arrow.
    Sound: a rising whistle, a deep thunk. AI: on a shooter out of reach.

- **N103. Volley forms.**
  - **VO1 弧矢 Curve line** (Piercing Shot). She sets the bend with the pointer: the arrow flies an
    arc up to 8 u long, curving up to 90° round the pack's edge, and pierces every foe on it: 26
    each. Tag wide. 常规直伤, ranged. Boss: pierced as any foe. Co-op: curves round the tank instead of
    through him (her shots never hurt allies anyway; the AI aims the arc past him). Motion 0.6 s:
    the side step, the bow tilted 45° and her wrist rolled at the release, so the shaft leaves
    spinning. Look (blade: comet): a bending streak with a curled tail. Sound: a crack and a rising
    whistle that bends with it. AI: the arc through the most foes, round any wall in the way.
  - **VO2 风压 Pressure line** (Power Shot). The draw; a full draw's wind drags every foe within 1.5 u
    of its 8 u path into the line (0.4 s), then the arrow pierces them all: 20 each (a tap: 0.5 u,
    10). Tag wide. 常规直伤, ranged. Boss: not dragged, +20%. Co-op: lines a pack up for the tank.
    Motion 1.3 s: she sinks low; the arrowhead sucks wind in from both sides. Look: two sheets of wind folding into one line. Sound: a deep inward rush, a crack. AI:
    across the widest pack.
  - **VO3 照明 Flare** (Hunter's Mark). The arrow hits the foe (12) and bursts into light over it:
    every foe within 3 u takes 20% more for 4 s. Tag wide. 易伤. Co-op: every hero gains. Motion 0.5
    s: a snap shot high; the flare hangs. Look: a soft jade light pool on the floor and a small star
    overhead. Sound: a pop and a hum. AI: on the largest pack.
  - **VO4 网矢 Net** (Pinning Arrow). It opens over the foe into a net 2 u wide: 14 to each under it,
    stun 0.5 s, then slowed 40% for 2 s; no tie. Tag wide. 常规直伤, area; 控制. Boss: stun 0.25 s, then
    40% for 0.4 s. Co-op: the slow helps every hero. Motion 0.7 s: one arrow; at the top it opens
    and drops. Look: a jade mesh that settles and fades. Sound: a snap and a rustle. AI: on three or
    more foes.
  - **VO5 赶羊 Herding sweep** (Rapid Fire). She sweeps the bow through 90° over 1.5 s; the ten
    arrows follow the sweep, 5 each, and each nudges its foe 0.5 u toward the side the sweep ends
    on, so the pack is swept into a corner. Tag wide. 常规直伤, ranged. Boss: not moved. Co-op:
    sweeps the pack to the tank. Motion 1.7 s: the bow swings like a scythe, ears leading. Look:
    a fan of streaks and dust pushed along. Sound: a run of twangs. AI: sweeps toward Stonehide
    or a wall.
  - **VO6 清点 Cull** (Kill Shot). One arrow to each foe under 30% within 6 u, up to six: 24 each
    (the base double does not apply). With none, one base arrow. Its kills do not ready it again
    (N16). Tag single per arrow. 常规直伤, ranged. Co-op: finishes allies' work. Motion 0.8 s:
    arrows fanned between her fingers, loosed one by one as she turns on her toes. Look: thin
    streaks curving to each weak foe. Sound: a quick run of twangs. AI: when three foes are under
    30%.
  - **VO7 曲射 Mortar** (Eagle Stance). She sits back and aims at the sky: each shot falls as a 1.5 u
    burst at the pointer, with the stance's 60%: the full shot to the foe it aims at, a third to the
    others in the burst. Under Split Arrows the split shots fall together as one burst. Tag wide.
    常规直伤, area. Co-op: bursts never hurt allies. Motion 0.4 s to settle: she leans back on her
    haunches, bow high, each shot thumps up. Look: a falling streak and a dust ring. Sound: a thump
    up, a whistle down. AI: on the largest pack within 7 u.
  - **VO8 风墙 Wind wall** (Skypiercer). Drawn as the base (a tap: 1.5 s); the drill stands up along
    its line as a wall for 3 s: foes cannot cross and take 6 each half second while they touch
    it. Tag wide. 常规直伤, area. Boss: walks through and takes it. Co-op: allies and their shots
    pass; foes' shots stop. Motion 1.8 s: the drill bores, then rises behind its line. Look: a tall
    jade wall of turning wind. Sound: a long howl. AI: across the pack's path to the party.
  - **VO9 涂羽 Painted fan** (Volley). The fan; each foe it hits is painted with a jade feather for
    3 s; her next skill also strikes every painted foe once: 8 each. Tag wide. 常规直伤, ranged.
    Co-op: hers alone. Motion 0.6 s: the flat release, then a flick of the draw paw. Look: a jade
    feather pinned on each painted foe; on the next skill each one flares. Sound: soft thocks; a
    chime when they flare. AI: on a spread pack before a single-target skill.
  - **VO10 跳雨 Hopping rain** (Rain of Arrows). The base rain (1.4 u, 4 s, 7 a half second, slow
    25%); each second it hops to the thickest pack within 4 u of where it is. Tag wide. 常规直伤, area.
    Boss: the boss counts as three foes for "thickest" (as Hail). Co-op: chases the thickest pack,
    often the one the tank holds. Motion 1.0 s: one arrow up; her head jerks after each hop. Look
    (blade: sparks): a slanted shower that jumps, a ring where it lands. Sound: a hiss that jumps.
    AI: on the largest pack.
  - **VO11 连爆 Cluster** (Burst Arrow). The burst; each of the six shards bursts again where it
    stops: 8 within 1 u. Tag wide. 常规直伤, area. Co-op: best on a pack the tank holds; bursts never
    touch allies. Motion 0.9 s: the lob, the standing arrow. Look: one big ring, then six small
    rings popping in a circle. Sound: a pop chain. AI: in a pack.
  - **VO12 陀螺 Spinning top** (Whirl Shot). The ring of twelve spins up and rolls 5 u along her aim
    in 1 s: 16 to each foe it passes. Tag wide. 常规直伤, area. Co-op: rolls through allies with no
    harm. Motion 0.8 s: one spin and a push of the bow; the wheel rolls away. Look: a spinning
    spoked wheel standing on its edge. Sound: a rolling whirr. AI: along a line of foes.
  - **VO13 蛛网 Web** (Ricochet). The six hops as the base (10 each); each hop leaves a jade thread on
    the floor between the two foes' spots for 3 s. A foe touching a thread takes 6 (once a second
    for each thread) and is slowed 30% while it touches. Tag wide. 常规直伤, area; slow. Boss: slowed
    30% for 0.4 s at a time (D36). Co-op: the pack walks slowly into the tank and allies' areas.
    Motion 0.5 s, then the flight: the skimming shot behind her back; she follows the hops with a
    flick of her ears. Look: thin jade threads strung foe to foe, fading. Sound: a twang each hop, a
    soft hum from the threads. AI: into a spread pack.
  - **VO14 卷天 Updraft** (Tornado Shot). The twister lifts every foe within 2 u into the air for 1.5
    s (a launch) and shoots them as the base, 6 × 6. Tag wide. 常规直伤, ranged. Boss: not lifted, +20%.
    Co-op: feeds every hero's air hits. Motion 0.7 s: the spindle spin; foes rise turning in the
    twister. Look: a wide jade twister with foes tumbling. Sound: a rising howl. AI:
    on a pack of three.
  - **VO15 连环阱 Linked traps** (Briar Trap). Three traps 2 u apart in a row, joined by a cord; they
    stand 8 s. When one snaps, the cord drags every foe on the other two to it (movement, no stun);
    all of them are slowed 40% for 2 s and take 6 each half second while on it. Tag wide. 常规直伤,
    area; slow. Boss: not dragged; slowed 40% for 0.4 s. Co-op: any foe an ally pushes in springs
    them. Motion 0.6 s: three hops, three stabs, the cord whipped between. Look: three small cages
    joined by a jade cord that reels in. Sound: three pats, a snap and a reel. AI: across a doorway
    or a pack's path.
  - **VO16 交叉 Crossfire** (Arrowstorm). Two curtains sweep in from her left and right and cross over
    her aim: three hits of 10 each; a foe where they cross takes both. Tag wide. 常规直伤, area. Co-op:
    the cross can be laid on the pack the tank holds. Motion 1.8 s: one arrow up; two curtains march
    in. Look: a bright X where they meet. Sound: two drums that meet. AI: the cross on the pack.
  - **VO17 扇风 Gust** (Feather Fan). One flap of the five arrows fanned: every foe in a 90°, 3 u cone
    takes 9, is knocked 2 u back, and its shots in flight drop. Tag wide. 常规直伤, area. Boss: not
    moved, +20%. Co-op: keeps a pack off a downed ally. Motion 0.5 s: the arrows held like a hand
    fan, one big sweep. Look: a curved gust with flying dust. Sound: a big whump of
    air. AI: when a pack is within 2 u.
  - **VO18 替身 Decoy** (Vault Shot). A feather decoy stays where she stood: foes within 4 u attack
    it for 2 s, then it bursts into eight arrows of 8. Tag wide. 常规直伤, ranged. Boss: not
    turned. Co-op: never a foe Stonehide holds. Motion 0.6 s: the backflip; a feather image of her
    stays, bow up. Look: a pale feather outline of her. Sound: a flutter, a burst. AI: when a foe
    is within 2 u.
  - **VO19 跳珠 Bouncing launch** (Crescent Kick). The kick launches one foe; where it lands it
    launches the foe it lands on (or the nearest within 1 u), and so on, up to five foes: 10
    each, launched 0.4 s. Tag wide. 常规直伤, melee. Boss: the chain skips a boss. Co-op: feeds
    Ashfang's air hits. Motion 0.9 s: the flip kick; she lands and watches the chain, a paw
    flicking at each bounce. Look: a bouncing arc from foe to foe. Sound: a run of bops. AI: in
    a pack.
  - **VO20 双结 Two knots** (Windknot). The base knot and a second at the pointer; the two packs are
    dragged into each other and crash: 4 each, stun 0.4 s. Tag wide. 常规直伤, area; 控制. Boss: not
    dragged; its pack crashes into it. Co-op: crashes two packs where the tank stands. Motion 1.0 s:
    the staff spin and two thrusts. Look: two jade ribbons and one dust burst. Sound: two whooshes,
    one crash. AI: on the two largest packs.
  - **VO21 扬尘 Dust cloud** (Cyclone Kick). The three kicks as the base (6 each, no arrows) raise a 3
    u dust cloud for 3 s; foes in it are blinded (their attacks and shots miss) for 1.5 s at most
    (the N95.4 guard); her arrows still find them. Tag wide. 控制 (blind, a hard CC under D40.3).
    Boss: blinded 0.3 s, then its 5 s gap. Co-op: allies' hits land too. Motion 1.0 s: three jumping
    spins, hind paws scuffing the floor. Look: a brown-grey dust ring, no colour of hers. Sound: a
    scrape and a hiss of sand. AI: inside a pack that is hitting the tank.
  - **VO22 连波 Ripple** (Bow Sweep). The two strikes and the shot on one foe as the base; then the
    shock runs on from it to every foe touching it (within 0.5 u), and from those to the foes
    touching them, through the whole knot: 10 each, once. Tag wide. 常规直伤, area. Boss: the shock
    passes through it. Co-op: grows with every pull: after Windknot, Stonehide's pull or the Volley
    knots it runs through the pack. Motion 0.8 s: the strikes, the shot, then she plants the lower
    limb and the shock ripples out from her bow. Look (blade: sparks): a shock spark jumping foe to
    foe. Sound: a deep harp twang and a run of thuds. AI: on a foe inside a tight pack.
  - **VO23 回马箭 Parting fans** (Windrun). Each second of the run she looses a fan of five arrows
    behind her: 6 each. Tag wide. 常规直伤, ranged. Co-op: covers a retreat for the team. Motion 0.3 s
    to start, then 3 s: no turn; the fan snaps out behind. Look: a short fan of streaks trailing.
    Sound: a short volley each second. AI: away from a chasing pack.
  - **VO24 箭泉 Fountain** (Eagle Dive). The base dive; the landing crater sprays arrows for 1.5 s: 3
    to each foe within 3 u every 0.3 s. Tag wide. 常规直伤, area. Co-op: the crater keeps spraying round
    the tank if he stands in it. Motion 1.5 s + 1.5 s: the dive; arrows gush up and fall round her.
    Look: a fountain of shafts and a crater ring. Sound: a gush and a patter. AI: into a pack.

- **N104. Gale forms.** Her arrows reach 3 u (N22), except Chase's arrow, which follows its foe, and
  Arrow spear's thrown drill, which flies its full 10 u. Her body may go farther: Slingshot flies to
  a tied foe up to 6 u away, and Shadow kicks' blinks follow its foe up to 7.5 u. Her wind may too:
  the Homecoming twister starts 4 u out and rolls in; Bulldoze's curtain walks to 4 u. Everything
  else of Gale's is within 3 u.
  - **GA1 追射 Chase** (Piercing Shot). A spinning back kick flies the foe 3 u toward the nearest
    other foes (8); the arrow chases it and nails it where it stops: 30, stun 0.4 s. It hurts no foe
    on the way. Its arrow follows its foe beyond 3 u (N104). Tag close. Kick melee, arrow ranged.
    Boss: nailed at once, +20%. Co-op: the AI kicks toward the tank. Motion 0.9 s: the back kick,
    she nocks as it flies, the shot. Look (blade: comet): a kick arc, a streak that bends after the
    foe. Sound: a thump, a whistle, a pinning crack. AI: kicks a straggler back into the pack.
  - **GA2 蓄腿 Wound kick** (Power Shot). A held kick (W8): she winds a spinning kick while the key is
    held, up to 0.8 s; let go: a tap is a 1 u kick for 20, a full wind a 2.5 u spin for 40, each foe
    pushed 1 u. Tag close. 常规直伤, melee. Boss: +20%. Co-op: the push is 1 u, so a held pack stays by
    the tank. Motion 0.3 to 1.1 s: she coils on one hind paw, turning slowly, ears wrapping; the
    release whips round. Look (blade: blaze): an arc that grows into a full ring. Sound: a rising
    whirr, a crack. AI: full wind when three foes are within 2.5 u.
  - **GA3 连印 Beat mark** (Hunter's Mark). An axe kick marks (12, 30% 易伤 for 3 s) with five pips;
    each close hit of hers on it pops one and renews the 3 s; the fifth bursts: 18 and it is
    launched 0.5 s (her five-beat basic fills it at once). Tag close. Melee; 易伤. Boss: the burst,
    +20%. Co-op: every hero gains the 易伤; only her hits pop pips. Motion 0.5 s: a jump and the axe
    kick; five pips light round the foe. Look: five small rings that pop. Sound: a stamp; a rising
    tick for each pip; a crack on the fifth. AI: on the foe the tank holds.
  - **GA4 弹弓 Slingshot** (Pinning Arrow). The arrow ties a cord to a foe within 6 u; she pulls back
    on it and slings herself at the foe: a flying two-paw kick, 30, and foes within 1.5 u of it are
    launched 0.4 s. Untouchable in the flight. Tag close. Melee. Boss: the kick, +20% (it is not
    moved). Co-op: reaches a shooter on the back line for the team. Motion 0.9 s: the shot, she
    leans back on the taut cord, then fires forward feet first. Look: a taut cord that snaps short;
    a kick streak. Sound: a rope creak, a twang, a thump. AI: on a shooter out of reach.
  - GA5 影踢 Shadow kicks** (Rapid Fire). Kesh's design, 2026-11-19 14:09 Singapore time
    (cmsg_01T9kVc7qNub7xZ7DH6oTE5yPNLpW3QQb242WuZEeXWUx3). A hard kick knocks a foe within 2 u back
    2.5 u: 10. As the knock-back ends she blinks to its back, untouchable in the blink, and kicks it
    off in a new direction (at least 90° from the last): 10, 2.5 u. Three such kicks in all; the
    fourth is a backflip flash kick that sends it high, launched 1.0 s (Kesh, 14:55,
    cmsg_01T9kVc7qNub7xZ7DH6oTE5yPXhMhtgTGMbC3yjqHRNbBN): 8; then one arrow at it in the air: 24 (C3
    adds its 30%). It hurts no other foe on its way (N95.2); a foe kicked into a wall: C2. Tag close
    (the kicks; the arrow within 2 u). 常规直伤, melee then ranged; the knock-backs and the launch are
    movement. Boss: not moved: she blinks round it and kicks from three sides, each +20%; no launch,
    the arrow +20%. Co-op: the AI kicks toward the tank on the last knock-back. Motion:
    WINDBRIAR_MOTION_GALE.md F5. Look: a Blade arc at each kick, a short jade blur where she blinks,
    a comet for the arrow. Sound: three heavy thumps with a whoosh between, a pop up, a crack. AI:
    on an elite or a lone foe.
  - **GA6 骑射 Ride** (Kill Shot). She leaps onto a foe within 3 u and rides it 1 s, steering it up to
    2 u where she aims (it cannot act: a stun, D38). The ride lasts as long as that stun after 效果抵抗
    (0.8 s on an elite, 0.7 s on a champion); a foe inside its 2 s stun guard is not ridden: she
    shoots from its shoulder as on a boss; then she shoots down into it: 24, double under 30%; a
    kill readies it (N16). A foe steered into a wall: C2. Tag close. 常规直伤, ranged; 控制, the steer
    movement. Boss: she cannot ride it: the shot from its shoulder, 24 +20%, and the stun is 0.25 s.
    Co-op: steers a foe into the tank or away from an ally. Motion 0.9 s: a leap onto its back, paws
    on its ears, a lean to steer, the bow pointed straight down. Look (blade: comet): one short
    comet down; dust under its feet. Sound: a thump, a skid, a close crack. AI: on a foe under 30%,
    or steers one into a wall.
  - **GA7 风井 Wind well** (Eagle Stance). She leaps and dives heel first into the floor within 3 u:
    10 to foes within 1.5 u. Where she lands a wind well opens and stays put for 4 s: it drags every
    foe within 4 u toward its centre at 1 u a second. She is free at once: she walks, dashes and
    casts (not a stance, N17 does not apply), and the well does not follow her. At 4 s it bursts: 24
    to each foe within 3 u. Tag close (the slam, a kick); the burst none (wind). 常规直伤, melee then
    area; the drag is movement. Boss: not dragged; slam and burst +20%. Co-op: holds a pack in one
    place for the team for 4 s. Motion: WINDBRIAR_MOTION_GALE.md F7. Look: a Wind Jade spiral on the
    floor, slowly turning inward, dust streaming to it; the burst a jade ring. Sound: a deep thump,
    a steady low suction, a whoomp at the burst. AI: slams into the largest pack, then fights at its
    rim.
  - **GA8 矢枪 Arrow spear** (Skypiercer). No draw: she takes the giant arrow as a spear and spins it
    round her (24 to each foe within 3 u), then throws it: the base drill at a tap's three hits (8
    each), carrying small foes as the base. The spin is melee strikes; the throw is an arrow. Tag
    close. Melee, then ranged. Co-op: the spin clears foes off the tank; the throw opens a line.
    Motion 1.6 s: she pulls the arrow from the drill of wind, a full spear spin overhead and low, a
    javelin throw. Look: a jade drill round a long shaft, a spin arc. Sound: a howl, a whoosh. AI:
    inside a pack.
  - **GA9 穿裆 Slide shot** (Volley). She slides under a foe within 2 u (small and medium foes; beside
    a big one) and, coming out behind it, shoots three arrows up into it: 16 each, launched 0.5 s.
    Untouchable in the slide. Tag close. 常规直伤, ranged. Boss: she slides past its side; the three
    shots +20%. Co-op: sends a foe off the tank into the air for C3. Motion 0.6 s: a dive onto her
    side, the bow flat on her chest, the shots fired up between her own hind paws. Look (blade:
    comet): three short streaks going up. Sound: a skid and three cracks. AI: on the foe in front of
    her when two more close in.
  - **GA10 收雨 Closing rain** (Rain of Arrows). The rain falls as a ring 4 u wide round a spot within
    3 u of her and closes to its centre over 2 s: foes under its edge take 7 each half second and
    are herded inward ahead of it. Tag wide (rain ticks). 常规直伤, area. Boss: not herded. Co-op: herd
    to the tank. Motion 1.0 s: one arrow straight up; she sweeps both paws inward as the ring
    closes. Look: a ring curtain of slanted shafts shrinking. Sound: a hiss closing in. AI: round a
    loose pack.
  - **GA11 爆步 Blast ride** (Burst Arrow). She plants the arrow behind her and its blast fires her 3
    u along her aim, untouchable; each foe she passes takes 16 and is knocked 1 u aside; the shards
    fly out behind her as the base. Tag none (a blast, N95.1). 常规直伤, area. Boss: she stops at it: 16
    +20%. Co-op: a way out through a pack. Motion 0.9 s: a stab behind, a crouch, a flat rocket with
    her ears streaming, a skid. Look (blade: blaze): a burst ring behind, a streak along the path.
    Sound: a boom, a rushing whoosh. AI: out of a pack toward open floor, or into a line of
    shooters.
  - **GA12 踢轮 Kicked saw** (Whirl Shot). One spin forms the wheel of twelve arrows flat at her feet;
    she kicks it 3 u like a frisbee and it spins there 2 s as a saw: 4 every 0.3 s to foes touching
    its 1.5 u. Tag wide (the saw's cuts are area ticks, N95.1). 常规直伤, area. Boss: works. Co-op: a
    saw for a pack the tank holds still. Motion 0.9 s: the spin, then a side kick that sends the
    wheel skimming. Look: a flat spinning wheel of shafts with sparks. Sound: a whine that rises and
    holds. AI: into a pack.
  - **GA13 踩头 Head hop** (Ricochet). She springs off four foes' heads, a kick each (8), and shoots
    the last from the air: 20. Tag close. Melee and ranged. Boss: one hop off it. Co-op: works on
    foes allies hold. Motion 1.2 s: paws off one head after another, a turn between. Look: a kick
    spark on each head. Sound: four bops, a crack. AI: in a pack of four.
  - **GA14 回旋风 Homecoming twister** (Tornado Shot). The twister rises 4 u out along her aim and
    rolls back to her in 2 s, pulling the foes on its path along with it; it ends at her feet,
    shooting as the base on the way. Tag wide (close only within 2 u of her). Area. Boss: not
    pulled. Co-op: brings a far pack to her and the tank. Motion 0.7 s: the spindle spin, a long
    shot, then she beckons with the bow. Look: a slim twister rolling toward her. Sound: a rush
    growing louder. AI: when a pack stands 3 to 5 u away.
  - **GA15 荆鞭 Briar lash** (Briar Trap). No trap: she swings the briar as a 3 u vine whip across a
    120° arc in front: 8 to each foe, knocked flat 0.4 s (a small stun, N95.5). Tag close. 常规直伤,
    melee; 控制. Boss: not knocked flat; 8 +20%. Co-op: knocks a pack off a downed ally. Motion 0.6 s:
    she pulls the vine out of the arrow's head and cracks it round from the hip. Look: a pale vine
    arc with a leaf trail. Sound: a whip crack, a rustle. AI: when three foes are in front within 3
    u.
  - **GA16 推浪 Bulldoze** (Arrowstorm). The curtain falls as a 4 u wall 1 u ahead of her and walks 3
    u forward with her: every foe in front is pushed ahead of it to its far edge and takes three
    hits of 10. A foe pushed into a wall: C2. Tag close or wide. 常规直伤, area. Boss: not pushed; the
    curtain stops at it, +20%. Co-op: plows a pack into the tank or a wall. Motion 1.8 s: one arrow
    up, then she strides behind the falling curtain, the bow held across her chest like a bar. Look:
    a moving wall of shafts with a dust wave in front. Sound: a drum roll moving away. AI: toward a
    wall or the tank.
  - **GA17 风车 Pinwheel** (Feather Fan). She drives the five arrows as a spinning drill into one foe
    within 2 u and leaves it there 1.5 s: 24 to it (8 a half second); foes within 2 u are pulled
    against it. Tag close. 常规直伤, melee; the pull is movement. Boss: the drill works; nothing is
    pulled to a boss. Co-op: the foes pulled in stand still for allies' areas. Motion 0.5 s: she
    spins the fan into a cone with one paw, punches it in, and kicks off the foe into the run. Look:
    a spinning white cone, dust lines pulled in. Sound: a drill whine, a suck of air. AI: on the foe
    in the middle of a loose pack.
  - **GA18 换位 Switch** (Vault Shot). She springs onto a foe within 3 u and kicks off it backward;
    the two trade places in the air: it lands where she stood, she lands where it was: 18.
    Untouchable in the swap. Tag close. 常规直伤, melee; the swap is movement (N95.4). Boss: no swap;
    she kicks off it and flips back, 18 +20%. Co-op: swaps a foe off a downed ally, or puts a
    shooter beside the tank. Motion 0.6 s: a hop onto its shoulders, a backflip push with both hind
    paws, the foe tumbling the other way. Look: two crossing arcs of wind. Sound: a thump and a
    whoosh. AI: swaps a foe out of a pack the tank cannot reach.
  - **GA19 空中连踢 Air juggle** (Crescent Kick). The kick and launch; she leaps after it: three kicks
    of 6 before it lands. Tag close. Melee. Boss: +20%. Co-op: follows any hero's launch. Motion 0.9
    s + 0.6 s: the flip, a leap, three straight-legged kicks. Look: three kick arcs in the air.
    Sound: three smacks. AI: on a launched foe.
  - **GA20 蹴鞠 Cuju** (Windknot). The knot gathers the pack (the knot's own 8 is not dealt) and rolls
    it into a wind ball; for 2 s the ball rolls ahead of her as she runs, sweeping in every foe it
    touches (2 to those inside each half second, held); then she kicks it 3 u and it bursts: 6 to
    each. Tag close or wide. Melee; the carry is movement (N95.4), not control. Boss: not taken in;
    the ball stops at it. Co-op: the AI kicks it toward the tank. Motion 1.0 s, then the 2 s dribble
    (a channel like the stance; no key is held, N18): the staff spin, then light dribbling kicks
    left and right like 蹴鞠, a big instep kick. Look: a jade ball of wind with foes tumbling inside.
    Sound: a rolling rush, a deep thump. AI: dribbles toward a wall or the tank.
  - **GA21 卸力 Parry spin** (Cyclone Kick). The three spins (6 each); in them each melee hit that
    would land on her misses, and the attacker is kicked: 10, pushed 1 u. Tag close. Melee. Boss:
    its telegraphed hits are not parried. Co-op: only hits on her are parried. Motion 1.0 s: three
    upright spins with the bow held flat, sweeping blows aside. Look: a spark and a small ring at
    each parry. Sound: a clack each parry. AI: when a melee foe is winding up at her.
  - **GA22 撞头 Head clap** (Bow Sweep). The bow strikes two foes within 1.5 u and knocks their heads
    together: 15 each, stun 0.5 s (a small stun, N95.5). The 15 is the bow's hit, not the knock
    (W9). With one foe, the bow bangs it into the floor: 15, stun 0.5 s. Tag close. 常规直伤, melee; 控制.
    Boss: not moved; the other foe is knocked into it; both take 15 (the boss +20%), the boss's stun
    0.25 s. Co-op: stops two foes hitting an ally. Motion 0.8 s: the bow hooked behind two heads, a
    two-paw yank inward, a step back. Look (blade: blaze): two sparks meeting, a small star burst.
    Sound: a hollow clonk. AI: on two foes side by side.
  - **GA23 折风 Zigzag** (Windrun). The base run (3 s faster, foe shots pass through her); each sharp
    turn of 90° or more is a spin kick: 12 to foes within 1.5 u, at most one turn each 0.5 s (six in
    the run). Tag close. 常规直伤, melee. Boss: kicked, +20%. Co-op: zigzags through the pack the tank
    holds. Motion 0.3 s to start, then 3 s: low sprinting, and at each hard turn a planted paw and a
    straight-legged spin kick. Look: a jagged wind trail with a kick arc at each corner. Sound: a
    skid and a smack at each turn. AI: weaves through a pack.
  - **GA24 陷坑 Sinkhole** (Eagle Dive). She drills down heel first: 16 within 1.8 u; the floor sinks
    2.5 u wide for 2 s, and foes on it slide to the centre (slowed 50%). Tag close or wide. Area;
    控制. Boss: not moved; slowed 50% for 0.4 s. Co-op: the tank at the rim catches what slides in.
    Motion 1.5 s: the leap, a spinning drop like a drill, she springs out of the pit. Look: a round
    dip with dust sliding in. Sound: a crunch and a rumble. AI: on a pack, the tank at the rim.

- **N105. The base forms in full** (the kit's base column as of 2.0; the kit now keeps a short line).

  | # | Skill | Base |
  |---|---|---|
  | F1 | Piercing Shot 贯矢 (3 s) | one arrow through every foe on a 5.5 u line: 30 |
  | F2 | Power Shot 满弦箭 (6 s) | hold to draw, up to 0.8 s; a wind arrow 8 u: 24 on a tap, 48 at full draw, 10% less for each foe after the first |
  | F3 | Hunter's Mark 猎印 (6 s) | 12; the foe takes 30% more for 3 s |
  | F4 | Pinning Arrow 钉矢 (7 s) | 20, stun 0.75 s; ties the foe to a foe or wall within 2.5 u behind it: both stunned 1 s |
  | F5 | Rapid Fire 连珠 (9 s) | 1.5 s: ten arrows at one foe within 6 u, walking at half speed: 5 each |
  | F6 | Kill Shot 绝矢 (8 s) | 24; double under 30% health; a kill readies it again |
  | F7 | Eagle Stance 鹰踞 (12 s) | she sits on her haunches 4 s: basic shots 60% more, 3 u farther, through one more foe; walking ends it |
  | F8 | Skypiercer 贯日 (big, 14 s) | hold to draw, up to 1 s; a giant spiral wind arrow, 10 u: three hits of 8 on a tap, six at full draw; small foes are carried to its end |
  | F9 | Volley 散矢 (4.5 s) | three arrows in a long narrow fan, 6 u, 30°: 14 each |
  | F10 | Rain of Arrows 箭雨 (11 s) | a rain 1.4 u wide, 4 s: 7 each half second, slow 25% |
  | F11 | Burst Arrow 绽矢 (7 s) | the arrow lands, then bursts: 18 within 1.5 u; six shards fly out: 6 |
  | F12 | Whirl Shot 旋矢 (8 s) | one spin, a ring of twelve arrows: 16 to each foe within 3 u |
  | F13 | Ricochet 弹矢 (6 s) | one arrow hops foe to foe, six hits: 10 each |
  | F14 | Tornado Shot 旋风矢 (8 s) | the arrow becomes a whirlwind, 2 u, 2.5 s: pulls foes in and shoots one every 0.4 s: 6 × 6 |
  | F15 | Briar Trap 棘阱 (9 s) | a trap, 0.75 u; it snaps: stun 0.7 s, 8 each half second for 3 s |
  | F16 | Arrowstorm 万箭 (big, 14 s) | one arrow to the sky; a curtain of arrows 5 u wide sweeps 8 u away from her: three hits of 14 |
  | F17 | Feather Fan 羽扇 (5 s) | five arrows in a close spray, 3.2 u: 9 each |
  | F18 | Vault Shot 跃射 (6 s) | a backflip 1.6 u, untouchable, one arrow from the air: 18, slow 30% |
  | F19 | Crescent Kick 月弧踢 (5 s) | a backflip kick: 14 within 1.5 u, launched 0.6 s; she shoots one launched foe: 12 |
  | F20 | Windknot 聚风 (8 s) | she whirls the bow like a staff: wind pulls every foe within 4 u of the spot to its centre: 8, slow 40% |
  | F21 | Cyclone Kick 旋风腿 (7 s) | three jumping spin kicks, 1.8 u: 6 each, the last pushes 1.5 u; each spin looses an arrow: 6 |
  | F22 | Bow Sweep 弓击 (4 s) | two strikes with the bow, 1.5 u: 8, 8; the string snaps an arrow point-blank: 14, 2 u back |
  | F23 | Windrun 御风 (12 s) | 3 s: she runs 40% faster, foes' shots pass through her, she shoots at full run |
  | F24 | Eagle Dive 鹰坠 (10 s) | she leaps high, untouchable, shoots five arrows down: 6 each; then dives heel first: 16 within 1.8 u, launch |
  | F25 | Kestrel Watch 隼望 | a wind kestrel circles her; each second it shoots the nearest foe within 4 u: 6 |
  | F26 | Fleet Foot 脱兔 | after her dash or any flip, her next three basic shots are 50% faster and deal 20% more |

- **N106. The rig and knees.** Her rig has no knee bones (N79). Every pose here that sits, crouches
  or kneels is a sit on her haunches, folding at the hip and the ankle, as hares sit; every kick
  is straight-legged. Poses that need a knee bend to read (Eagle Stance's sit, Wound kick's
  coil, Cuju's dribble, Shadow kicks' blinks) are the test on the page: if they read stiff, the rig
  gets one knee bone a leg (a call for the page thread).
