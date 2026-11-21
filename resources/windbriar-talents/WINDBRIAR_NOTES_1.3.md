# Windbriar: design notes

**Version 1.3, 2026-11-18. Design only.** The details behind `WINDBRIAR_KIT.md` (lines W, T, F).
(1.3: Eagle Stance's Gale form is a 霹雳舞, N92. 1.2: the twelve combos, N91. 1.1: Kesh's picks of 13:02 Singapore time, N84: the passive is Tailwind, drawn shots are held,
and the audit picks are written in. The 1.0 text is kept as `WINDBRIAR_NOTES_1.0.md`.)
Every line here has a number (N1 to N92). All numbers are first guesses until measured in play.

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
  - Drawn shots inside a flip or a stream (Rapid Fire's, Vault Shot's and Eagle Dive's Deadeye
    forms) are full draws with no hold.
- **N11. Words the talents use.**
  - A **single arrow** (T4): an arrow that damaged exactly one foe. An arrow that went through
    two foes is not one. Rains, rings and bursts are not arrows.
  - A **wide hit** (T5): one release (a fan, a ring, a burst, one half-second of a rain, one
    piercing arrow) that damaged three or more foes; each of them takes the 25%.
  - A **close hit** (T6, T9): a kick, a bow strike, or an arrow that hits a foe within 2 u of
    her.
  - A **drawn shot**: an arrow with a draw (N10): Power Shot, Skypiercer, the Deadeye basic
    shot, and the forms that say so.
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
  wind trail (Power Shot, Volley form) is a row of area hits. Her one damage cut is 风护, under
  Bow Dance (N22).
## 3. Talents in full

### Tier I, Style (free)

- **N20. T1 Full Draw 满弦 (Deadeye).** Every skill she holds takes its Deadeye form. Her basic
  shot is a drawn shot: hold attack; a tap is 12, a full draw (0.75 s) is 26, reach 6.5 u,
  through one more foe for half. The trade: fewer, slower arrows; packs are slow to clear.
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
  first arrow she shoots within 2 s after a kick or bow strike is a full draw at once, with no wait, and
  deals 30% more.

### Tier IV, Reach (60 Embers)

- **N29. T10 Far Sight 千步.** Arrows and the spots she can aim a rain at reach 35% farther;
  arrows fly 40% faster; the view pulls back about 10% (each player's own view in co-op). Not
  kicks, pulls or winds.
- **N30. T11 Wide Sky 遮天.** Fans cover 30% more angle; rings, bursts and rains are 30% wider.
  Same arrows, same damage.
- **N31. T12 Long Wind 长风.** Pulls and winds (Windknot, Tornado Shot, Whirl Shot's pull,
  Skypiercer's Volley pull, Hurricane Dance) reach 30% farther. The dash, Vault Shot, Eagle
  Dive's reach, Cyclone Kick's travel and every hop a Gale form adds go 25% farther.

### Tier V, Capstone (80 Embers)

- **N32. T13 Hundred Paces 百步穿杨.** When she has given no walk input for 1 s (shooting, drawing
  and Eagle Stance are fine), the first arrow of her next arrow skill is perfect: a sure crit
  with 50% more crit damage, it goes through every foe, and it ignores defence. Then the 1 s
  starts again. Seen: a thin ring closes on her and her ears prick; the perfect arrow is white
  with a jade halo and stops the frame for 0.1 s on its first hit.
- **N33. T14 Ten Thousand Arrows 万箭齐发.** Every 6th skill press, 0.5 s after that cast, the
  sky opens over the whole room for 3 s: each foe is struck four times, 6 each. It is not a
  cast and gives no Tailwind.
- **N34. T15 Hurricane Dance 飓风舞.** Every 6th skill press, after that cast, she whirls up in a
  cyclone for 1.2 s, untouchable: every foe within 4 u is pulled to her; twelve arrows spiral
  down, each on a foe inside, 3; she comes down with an axe kick: 20 within 2.5 u. Not a cast.

### Checks

- **N35. Every talent works alone.** T4: base Piercing Shot's last foe, Hunter's Mark, Pinning
  Arrow, Rapid Fire, Kill Shot and every basic shot are single arrows. T5: base Rain of Arrows,
  Whirl Shot, Burst Arrow, Arrowstorm in a pack. T6 and T9: an arrow within 2 u is a close hit,
  so a hero with no kick still has them. T7: any arrow. T8: any kill. T10 to T12 name base
  things. T13: any arrow skill. T14, T15: any skill press.
- **N36. Mixes checked.**
  1. Full Draw with Hail: fused arrows hit one foe, so Hail is nearly dead under Full Draw. It
     is a free pick, not a trap the picker hides: the card shows "0 skills changed". To decide
     when built.
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
  out, draw paw open behind her ear. Deadeye: a jade ring pops flat on the foe and it skids
  back. Volley: side arrows peel off each foe like shed feathers. Gale: a hop, a spinning back
  kick, the shot from the hip with the bow level.
- **N48. Power Shot** (1.3 s). She plants a hind paw back and sinks low. Wind is sucked into
  the arrowhead in a tightening spiral, dust runs along the floor toward her, her ears flatten,
  the string hums (0 to 0.8 s). Loose: the recoil slides her back 0.3 u; a wind tunnel with
  rings along it; a groove of blown dust. She straightens slowly and flicks her ears. Deadeye:
  on one haunch, a longer draw, the rings tight. Volley: the tunnel stays as a lane of cutting
  wind. Gale: a paw on the foe's chest, she kicks off and looses upside down in the back flip.
- **N49. Hunter's Mark** (0.5 s). Two fingers drawn across her eyes, then pointed at the foe; a
  snap shot without looking down the shaft. A reticle of three jade feathers closes on the foe.
  End: the finger still pointing. Gale: a jumping axe kick stamps the reticle on.
- **N50. Pinning Arrow** (0.7 s). A hop; she shoots steeply down from the top of it. The arrow
  nails the foe's foot to the floor; a jade cord whips from its nock to the foe or wall behind
  and pulls taut. She lands and tugs the line. Volley: three arrows fanned between her
  fingers. Gale: the bow hooks the neck, a hip turn throws the foe flat, the shot goes straight
  down.
- **N51. Rapid Fire** (1.7 s). A fistful of arrows between her fingers, the bow tilted. Ten
  shots, the draw paw a blur, an ear rocking with each. The last is loosed out of a full spin.
  End: the empty paw fanned out, wind curling off the string. Deadeye: five slow full draws,
  each ring brighter. Volley: the bow swings side to side like a scythe. Gale: she circles the
  foe at a run, shooting from the hip across her body.
- **N52. Kill Shot** (0.8 s). She tosses one arrow up, spinning, and catches it on the string
  as she turns side-on. A breath; the light dims a touch round the foe. Loose at 0.45 s: one
  white streak, dead straight, no wind. On a kill the same arrow curves back up into her paw:
  that is the skill made ready. Gale: a flying knee lifts the chin, the arrow goes under it,
  she springs back off the foe.
- **N53. Eagle Stance** (0.4 s to settle). She slides down onto one haunch, the bow resting
  level across her raised hind paw, ears pinned forward like a sight; a jade aim line and a
  small ring at the pointer. Each shot rocks her back. Out: she springs up with a twirl of the
  bow. Volley: she leans back and aims at the sky. Gale: a 霹雳舞: she drops to the floor and spins
  on her back and shoulders, hind paws wheeling, the bow held flat against her chest; a wide
  jade spiral of wind turns round her and draws the foes in along its arms; each kick is a
  hind paw snapping out of the spin, and the kicked foe flies back through the pack (N92).
- **N54. Skypiercer** (1.8 s). She leaps straight up and hangs, bow fully drawn; wind coils
  into a great jade drill round a bone-white arrow three times her length (0.3 to 1.0 s). Loose:
  the drill bores along the floor, a spiral tunnel with the dust lifted in a helix and foes
  tumbling inside; the recoil flips her backward once. She lands on one paw, bow behind her
  back. Deadeye: a needle of light, then one burst deep in the big foe. Volley: the tunnel
  stays and rains. Gale: she springs after it and rides the spiral feet first, spinning.

### Rain

- **N55. Volley** (0.6 s). Three arrows fanned between her fingers, the bow flat, loose at
  0.25 s, then a half turn on her toes with her ears wrapping round. Deadeye: three snaps from
  one draw, like a stutter. Gale: a low sweeping kick first, then the fan at shin height.
- **N56. Rain of Arrows** (1.0 s to the first arrows). She leans far back, one hind paw up,
  shoots one arrow that splits into a flock high up; her head follows it. Arrows fall in slanted
  lines, stand in the floor a moment and fade; jade ripples on the floor. Deadeye: the rain is
  a narrow shaft that walks with its foe. Gale: she shoots straight up and fights under it.
- **N57. The Gale basic** (1.5 s): the lower bow limb sweeps low; a hip shot; a spinning back
  kick with both paws; two hip shots across her body, left then right; a jump, a flip kick, and
  a shot straight down from the top of the flip. She lands in a crouch.
- **N58. Burst Arrow** (0.9 s). She rolls the arrow along the string, its head wound with a
  knot of wind, and lobs it. It sticks upright, feathers shivering, the knot tightening with a
  rising whistle; it bursts at 0.8 s: a flat ring and six feather shards skimming out. Gale:
  she stamps it in with a hind paw and backflips off the ring.
- **N59. Whirl Shot** (0.8 s). She sweeps a fan of arrows out of the quiver in a full-arm
  circle, spins once on the toes of one hind paw with the bow flat, loosing all round; twelve
  streaks draw a spoked wheel on the floor. She stops dead facing her aim; her ears swing on.
  Deadeye: the spokes bend round and close on one foe like a claw. Gale: the spin opens with a
  roundhouse kick that drags the foes in.
- **N60. Ricochet** (0.5 s, then the flight). A low skimming shot behind her back, looking over
  her shoulder. The arrow rings off each foe with a bright tick and a jade spark and draws a
  zigzag. She holds the pose until the last hop. Gale: she is the zigzag: paws off one head
  after another, a turn in the air between each.
- **N61. Tornado Shot** (0.7 s). She spins the arrow on a fingertip until wind winds onto it
  like thread on a spindle, and shoots. A slim jade twister rises where it lands, arrows
  circling inside it like a carousel and flicking out at foes; it ends by unwinding upward.
- **N62. Briar Trap** (0.6 s). She stabs an arrow into the floor with a hop and a double pat
  (passed). A bone-white briar vine coils round it and sinks. Snap: the vines whip up as a cage
  and hold the foes.
- **N63. Arrowstorm** (1.8 s). Two sprint steps and a slide on her haunches, bow drawn at the
  sky; one whistling arrow. It bursts overhead into a bright seam; arrows fall in ranks, the
  nearest rank first, marching away from her like rain crossing a field, each rank thudding in
  a line. She rises with the bow arm out as the last rank lands. Deadeye: the ranks fold into
  one column. Gale: the ranks fall as a ring and march inward; she flips out over the last one.

### Kata

- **N64. Feather Fan** (0.5 s, passed). Five arrows fanned, a sweeping flat release across her
  body, then she darts with her ears flat. Gale: she turns on one paw and fans again behind.
- **N65. Vault Shot** (0.6 s, passed). A backflip, the shot upside down at the top, a low
  sliding landing with one paw on the floor. Gale: a leap in, both paws on the foe's face, the
  flip back off it.
- **N67. Crescent Kick** (0.9 s). A step in, then a backflip with both hind paws scything up:
  a tall jade crescent, the foes lift. Upside down at the top she nocks and shoots the highest
  foe. She lands in a crouch, bow across her knees.
- **N68. Windknot** (1.0 s). She spins the bow overhead, round her waist and behind her back,
  wind streaming off both tips in jade ribbons. She thrusts the bow at the spot: the ribbons
  shoot out, wrap the pack and pull it tight; foes skid in on spiralling dust lines. She snaps
  the bow upright; the ribbons tie off and pop. Deadeye: the ribbons comb the foes into a row.
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
  everywhere in ranks for 3 s. Hurricane Dance: she rises in a jade cyclone, spinning with the
  bow out, arrows spiralling down round her, and drops in an axe kick.

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

- **N74.** Zones:
  - 基础伤害区: every card number; Kill Shot's double; Power Shot's fall-off; Rapid Fire's and
    Eagle Stance's Deadeye ramps; the 20% on a boss she cannot move (N14).
  - 暴击区: Pinning Arrow's and Briar Trap's Deadeye sure crits; Hundred Paces (sure crit, 50%
    more crit damage).
  - 增伤区 (all add): Heartseeker, Hail, Iron Leg, Slipstream's 30%, Windrun's Deadeye 30%,
    Eagle Stance's 60% (it is on her, for all her basic shots), Fleet Foot's 20%.
  - 易伤区: Hunter's Mark (30%, or 20% under Volley).
  - 减伤区: 风护, 20% (it multiplies with any other cut on her).
  - 防御区: Power Shot's Deadeye form ignores half; Hundred Paces and the Deadeye Gale Arrow ignore all; Bow Sweep's
    Deadeye form is 30% 减防 for 4 s, which the whole team uses.
- **N75. Why this fits.** Bosses have defence 50 (× 0.67) and 80% 效果抵抗. Deadeye is the
  path with 无视防御 and 减防, so it is the boss path. Volley is plain 直伤 on foes with no
  defence. Gale's wind is mostly movement, which 效果抵抗 does not shorten but a boss ignores,
  so its boss answer is the 20% of N14.
- **N76. 控制.** Stuns (Pinning Arrow, Briar Trap, the small kick stuns), slows, and Tornado
  Shot's Deadeye hold follow D35. Pushes, pulls, launches and the carry of Skypiercer are
  movement: full length on anything that can be moved.

## 7. AI seat, sound

- **N77. AI seat.** Deadeye: stands 5 to 6 u out, aims at the highest-health foe or the boss,
  stops walking to let Hundred Paces fill when nothing is near her. Volley: stands 4 to 5 u out
  and aims where the most foes are. Gale: fights within 3 u but only beside the tank or behind
  a foe the tank holds; never kicks into a boss's wind-up; keeps the dash for escapes. All:
  today's rules for leaving floor warnings.
- **N78. Sound.** A drawn shot: a rising creak and a crack. A fan: a ripple of soft twangs. A
  rain: a hiss and dry thuds. A kick: a short whoosh and a thump. A Tailwind: a soft rising
  breath, higher for each. The Gale Arrow: a deep whoosh and a crack.

## 8. For the page and the build

- **N79. The model.** Her rig has no knee bones (22 bones). The kicks are written as
  straight-legged, both-paw kicks to suit it. If they read stiff on the page, the rig needs one
  knee bone a leg.
- **N80. New moves** (beyond the 28 passed): the draw-and-hold, the haunch stance, the 霹雳舞
  floor spin of the stance, the sky lean, the behind-the-back shot, the bow staff spin, bow strikes, the back
  kick, the flip kick, the floor spin, the axe kick, the flying knee, the neck hook throw, the
  high leap with the head-down turn, the ride on the spiral.
- **N81. Things to show.** The three Tailwind feathers on her bow arm, the Gale Arrow in each style, the jade cord of the tie, the
  aim line, the twister, the trap's vines, the kestrel (a small wind bird; today's effect).
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
