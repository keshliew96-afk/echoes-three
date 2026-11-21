# Windbriar: design notes

**Version 1.0, 2026-11-18. Design only.** The details behind `WINDBRIAR_KIT.md` (lines W, T, F).
Every line here has a number (N1 to N87). All numbers are first guesses until measured in play.

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
- **N3.** Pattern taken from Stonehide and Ashfang: the passive must serve all three styles. The
  briars do: the style decides where the torn briars fly (W5).
- **N4.** Kept from the game: all eleven skills she has today, with today's numbers. Three are
  renamed and two re-shaped (N86). The eight draft nodes of hers (Skewer, Concussive, Steady
  Aim, Disengage, Scatter, Heartseeker, Prey, Longshot) are not touched by this design. The
  talent T4 shares a name with the Heartseeker node; rename one when it is built.
- **N5.** Kept from her model page (passed 13 Nov): the three-shot combo with the flat bow, the
  somersault dash with three homing arrows, power shot, sky volley, trap, feather fan, vault shot.

## 2. Kit rules

- **N6. Briars.** An arrow from her bow that damages a foe leaves one briar in it (basic shots,
  skill arrows, the dash's arrows). Not: kicks, bow strikes, wind, the kestrel, torn briars. A
  rain, ring or burst leaves at most one briar a second in each foe. Six at most on a foe; each
  new one sets all of that foe's briars back to 6 s. Seen: bone-white shafts with jade fletching
  standing out of the foe; the count is plain to read up to six.
- **N7. Windcall.** Called by the last shot of the basic combo and by Skypiercer, Tornado Shot
  (when it ends) and Windknot. In each foe the call hits, every briar is torn out for 2. The
  calling shot tears the old briars first and then leaves its own.
- **N8. Where torn briars go.** No style: nowhere. Deadeye: every briar in every foe within 6 u
  of the foe she shot flies into that foe, 2 each on it. Volley: each torn briar flies to the
  nearest other foe within 3 u, deals its 2 there and stays as a briar; one flight for each call,
  so briars never ping back and forth. Gale: they fly to her paw, 2 to each foe they cross (each
  foe once for each call); each briar caught is 5% attack speed for 3 s, up to 30%.
- **N9.** A torn briar's 2 is 附加伤害 (N66): it can crit, it is not a hit, so it never leaves a
  briar or calls anything.
- **N10. The draw 引弦.** A drawn skill takes its draw time before the arrow flies. She walks
  at half speed, the aim follows the pointer, and a thin jade aim line shows. The dash cancels a
  draw; the skill is then ready again after 1 s. No key is held (pick 2).
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
- **N18. No second presses, no held keys, no extra keys** anywhere in the kit.
- **N19. She has no heal, no shield and no damage over time.** A rain is a row of area hits. A
  wind trail (Power Shot, Volley form) is a row of area hits.

## 3. Talents in full

### Tier I, Style (free)

- **N20. T1 Full Draw 满弦 (Deadeye).** Every skill she holds takes its Deadeye form. Her basic
  shot is a drawn shot: 0.75 s, 26, reach 6.5 u, through one more foe for half. Every third
  drawn shot calls the wind. The trade: fewer, slower arrows; packs are slow to clear.
- **N21. T2 Split Arrows 分矢 (Volley).** Every skill takes its Volley form. Basic shots one
  and two split in three: the middle arrow 12, the side arrows 6 at 15° each side. The last shot
  is five arrows of 6. The trade: a lone foe is only hit by the middle arrows.
- **N22. T3 Bow Dance 弓斗术 (Gale).** Every skill takes its Gale form. The basic attack is the
  five-beat form (N57). Her arrows reach 3 u at most. The trade: she fights inside the pack with
  80 health.

### Tier II, Power (20 Embers)

- **N23. T4 Heartseeker 破的.** A single arrow (N11) deals 25% more.
- **N24. T5 Hail 密雨.** A wide hit (N11) deals 25% more to each foe.
- **N25. T6 Iron Leg 劲腿.** A close hit (N11) deals 25% more.

### Tier III, Trick (40 Embers)

- **N26. T7 Through the Heart 穿心.** An arrow that fells a foe is not spent: it turns to the
  nearest foe within 5 u and hits it for the same damage. It can go on as long as each hit
  fells. Not rains, rings or bursts.
- **N27. T8 Falling Feathers 余雨.** A foe felled by her drops a small rain where it stood 0.3 s
  later: 8 to every foe within 1.5 u. A rain's kills drop rains too; at most one for each 0.3 s
  on the same spot.
- **N28. T9 Slipstream 借风.** A close hit readies her dash at once, at most once a second. The
  first arrow she shoots within 2 s after a kick or bow strike has no draw and no wait, and
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
  cast; each strike leaves a briar (N6's one-a-second rule).
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
  9. Only one style is ever on (one tier I pick), so the three ways the torn briars fly
     never meet.
- **N37. Budget** (docs/TALENTS.md): tier I about 20% more output in its style; one whole path
  about 50%; no mix above 70%.

## 4. The basic attack and the dash

- **N38.** Base combo 12, 12, 3 × 6 (42), reach 4.5 u; the game's own shot today is 12.
- **N39.** Deadeye: 26 a drawn shot (52 in the time of one base combo, on one foe).
- **N40.** Volley: 24, 24, 30 if every arrow hits; 12, 12, about 12 on a lone foe.
- **N41.** Gale: 8, 8, 8, 5 + 5, 10 + 6 (50), all within 3 u; the back kick pushes 0.5 u, the
  flip kick launches 0.3 s (N13) and its shot down calls the wind.
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
  bow. Volley: she leans back and aims at the sky. Gale: one hind paw raised, bow across her
  shoulders; the kick is a snap of the raised paw.
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
  and their thorns stay in the foes as briars.
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
  | basic shots, skill arrows, dash arrows | 常规直伤 | yes, leaves a briar | ranged |
  | rains, rings, bursts, shards, wind trails | 常规直伤, in a row | yes, one briar a second | area |
  | kicks, bow strikes | 常规直伤 | yes, no briar | melee |
  | torn briars (W5), Falling Feathers | 附加伤害 | no | ranged; area for the feathers |
  | Kestrel Watch | 常规直伤, her damage | yes, no briar | ranged |
  | 持续伤害, 真实伤害, heals, shields | she has none | | |

- **N74.** Zones:
  - 基础伤害区: every card number; Kill Shot's double; Power Shot's fall-off; Rapid Fire's and
    Eagle Stance's Deadeye ramps; the 20% on a boss she cannot move (N14).
  - 暴击区: Pinning Arrow's and Briar Trap's Deadeye sure crits; Hundred Paces (sure crit, 50%
    more crit damage).
  - 增伤区 (all add): Heartseeker, Hail, Iron Leg, Slipstream's 30%, Windrun's Deadeye 30%,
    Eagle Stance's 60% (it is on her, for all her basic shots).
  - 易伤区: Hunter's Mark (30%, or 20% under Volley) and Barbed Heads (3% a briar, hers only).
    Different names, so they add: 48% at most from her, under the zone's 100% cap.
  - 防御区: Power Shot's Deadeye form ignores half; Hundred Paces ignores all; Bow Sweep's
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
  rain: a hiss and dry thuds. A kick: a short whoosh and a thump. A briar torn out: a small
  pluck, in a run when many go. Windcall: one breath of wind.

## 8. For the page and the build

- **N79. The model.** Her rig has no knee bones (22 bones). The kicks are written as
  straight-legged, both-paw kicks to suit it. If they read stiff on the page, the rig needs one
  knee bone a leg.
- **N80. New moves** (beyond the 28 passed): the draw-and-hold, the haunch stance, the crane
  stance, the sky lean, the behind-the-back shot, the bow staff spin, bow strikes, the back
  kick, the flip kick, the floor spin, the axe kick, the flying knee, the neck hook throw, the
  high leap with the head-down turn, the ride on the spiral.
- **N81. Things to show.** Briars on a foe (up to six shafts), the jade cord of the tie, the
  aim line, the twister, the trap's vines, the kestrel (a small wind bird; today's effect).
- **N82. Order for the page.** Base forms first (24 clips and the passive), then one style at
  a time.

## 9. The record

- **N83. Guessed:** every number; the dash arrows' 5; the view pull of Far Sight; that a draw
  cancelled by the dash returns the skill after 1 s.
- **N84. Open with Kesh:** the six kit picks (kit section 5), the six audit picks A1 to A6
  (`WINDBRIAR_INTERACTION_AUDIT.md`) and the twelve combos C1 to C12
  (`WINDBRIAR_COMBO_IDEAS.md`). None of them is written into the kit yet.
- **N85. Pool count.** 11 from the game, 15 new: Power Shot, Rapid Fire, Kill Shot, Eagle
  Stance, Skypiercer, Ricochet, Tornado Shot, Arrowstorm, Crescent Kick, Windknot, Cyclone
  Kick, Bow Sweep, Windrun, Eagle Dive, Barbed Heads.
- **N86. Changed from the game's eleven.**
  - Detonating Charge is **Burst Arrow**: was a burning patch (12 a second for 3 s, 0.85 u);
    now one burst and six shards. She has no damage over time.
  - Sundering Nova is **Whirl Shot**: was 16 to four foes within 1.1 u; now a ring of twelve
    arrows to 3 u.
  - Barbed Trap is **Briar Trap**: same numbers, and it leaves three briars.
  - Pinning Arrow gains the tie (Windranger's Shackleshot).
  - Kestrel Watch, Piercing Shot, Hunter's Mark, Volley, Rain of Arrows, Feather Fan and Vault
    Shot are as they are today.
- **N87. Spares** (not in the pool): Arc Shot (a lobbed arrow that showers and leaves arrows
  standing in the floor), Seeker (three homing wind arrows), Mirror Arrow (an arrow that
  becomes a copy of her that shoots for 3 s), Fleet Foot (passive: after any flip her next three
  shots are faster).
