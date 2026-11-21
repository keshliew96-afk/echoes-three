# Windbriar: design notes

**Version 1.5, 2026-11-19. Design only.** The details behind `WINDBRIAR_KIT.md` (lines W, T, F).
(1.5: pass 1 of the review, N93 to N101 rewritten and new; `WINDBRIAR_REVIEW_PASSES.md`.
1.4: every form its own 特点; the 1.3 text is kept as `WINDBRIAR_NOTES_1.3.md`.
1.3: Eagle Stance's Gale form is a 霹雳舞, N92. 1.2: the twelve combos, N91. 1.1: Kesh's picks of 13:02 Singapore time, N84: the passive is Tailwind, drawn shots are held,
and the audit picks are written in. The 1.0 text is kept as `WINDBRIAR_NOTES_1.0.md`.)
Every line here has a number (N1 to N101). All numbers are first guesses until measured in play.

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
  - Drawn shots inside a flip, a stream or a reply (Rapid Fire's, Vault Shot's, Eagle Dive's
    and Feather Fan's Deadeye forms) are full draws with no hold.
  - Power Shot's Deadeye form adds a sweet spot to the hold (N94).
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
  first arrow she shoots within 2 s after a kick or bow strike fires at once, with no wait, and
  goes through one more foe (1.4: it was 30% more, which copied Deadeye Windrun).
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
- **N34. T15 Hurricane Dance 飓风舞.** Every 6th skill press, after that cast, a cyclone rises
  round her for 1.2 s, untouchable: every foe within 4 u is lifted into the air for 1.2 s (a
  launch: a boss is not lifted and takes 20% more from the kick, N14); twelve arrows spiral up
  into the lifted foes, 3 each (combo C3 adds its 30%); she comes down with an axe kick that
  slams them all down: 20 within 2.5 u. Not a cast. (1.4 flung foes out, which copied Gale
  F7's kick-out; 1.3 pulled them in, which copied F7's drag.)
### Checks

- **N35. Every talent works alone.** T4: base Piercing Shot's last foe, Hunter's Mark, Pinning
  Arrow, Rapid Fire, Kill Shot and every basic shot are single arrows. T5: base Rain of Arrows,
  Whirl Shot, Burst Arrow, Arrowstorm in a pack. T6 and T9: an arrow within 2 u is a close hit,
  so a hero with no kick still has them. T7: any arrow. T8: any kill. T10 to T12 name base
  things. T13: any arrow skill. T14, T15: any skill press.
- **N36. Mixes checked.**
  1. Full Draw with Hail: since 1.4 several Deadeye forms reach many foes (Line-up, Sky Bolt,
     Fuse, Shoot-down, Called rain, Tripwire), and a boss counts as three. Hail is no longer
     dead under Full Draw.
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

**Since 1.4 the motion of every form named in bold in the kit is in N98; where a line below
describes the old form, N98 wins.**

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
  - 基础伤害区: every card number; Kill Shot's double and the Deadeye Execute's triple; Power
    Shot's fall-off and its Deadeye sweet spot; Rapid Fire's Deadeye ramp; Line-up's 25% a foe;
    Fuse's 20% a hit; Bank shot's 30% a bounce; the 20% on a boss she cannot move (N14).
  - 暴击区: Pinning Arrow's Deadeye sure crit; Hundred Paces (sure crit, 50% more crit damage).
  - 增伤区 (all add): Heartseeker, Hail, Iron Leg, Windrun's Deadeye 30%, Wind lane's 30% (on her arrows in the lane),
    Eagle Stance's 60% (it is on her, for all her basic shots), Fleet Foot's 20%.
  - 易伤区: Hunter's Mark (30%, or 20% under Volley).
  - 减伤区: 风护, 20% (it multiplies with any other cut on her).
  - 防御区: Hundred Paces and the Deadeye Gale Arrow ignore all; Bow Sweep's
    Deadeye form is 30% 减防 for 4 s, which the whole team uses.
- **N75. Why this fits.** Bosses have defence 50 (× 0.67) and 80% 效果抵抗. Deadeye is the
  path with 无视防御, 减防, Execute's triple under 30% and Line-up's growth, so it is the boss
  path. Volley is plain 直伤 on foes with no
  defence. Gale's wind is mostly movement, which 效果抵抗 does not shorten but a boss ignores,
  so its boss answer is the 20% of N14.
- **N76. 控制.** Stuns (Pinning Arrow, Briar Trap, the small kick stuns), slows, and Deadeye Suppressing fire's roots,
  Tripwire, the Volley Net and Two knots follow D35. The Deadeye Interrupt is not a stun: it
  cancels a wind-up and never a boss's (formula D40). Pushes, pulls, launches and the carry of Skypiercer are
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
- **N93. Every form its own 特点 (kit 1.4 and 1.5).** Kesh on the ability page, 2026-11-18 23:53
  Singapore time (cmsg_01T9kVc7qNub7xZ7DH6oTE5y7MFzw9hYWR77U9orsQ9yRx): "After I review again, I
  found for the deadeye style, many skill make in a very similar way, example there are 2 skill
  with 箭雨 deadeye treat it the same where focus on 1 person to arrow rain, I not saying this is
  bad idea, I just saying they using same idea. So you need to re think and re design to many
  each skill have its own 特点"; 23:54 (cmsg_01T9kVc7qNub7xZ7DH6oTE5y4mFiTCefvVLXk6qH6EyKN8):
  "Since already need review, you also do full audit and review to make sure each skill is
  different"; 00:02 (cmsg_01T9kVc7qNub7xZ7DH6oTE5yCDjDDKRQVfwHeTYsKC9WLr): "I going to sleep,
  can you continuously complete the goal, which run audit and review and make it insanely
  detailed, until it have score 9 out of 10".
  - The audit is the page thread's `WINDBRIAR_SAMENESS_AUDIT.md`, merged with my list; the
    passes and scores are in `WINDBRIAR_REVIEW_PASSES.md`. 39 forms change (Deadeye 16, Volley
    14, Gale 9) and two talents (T9, T15).
  - Where I left the audit's suggestion, and why: Deadeye F1 is Flank shot, not "farther is
    harder" (the archer's Longshot draft node already does that). Deadeye F7 is Suppressing
    fire, not Overwatch (a foe stepping on a line repeats Tripwire). Deadeye F11 is Sticky
    charge (a press-again fuse breaks N18; a fuse fed by her hits repeats Rapid Fire's build-up).
    Deadeye F14's lane does not blow shots back (that is Shoot-down's trait). Deadeye F16 is
    Called rain, not a column (a column on a spot repeats Sky Bolt, the other 箭雨 Kesh named).
    Volley F16 is Crossfire (out and back repeats the Boomerang); Volley F18 is a Decoy and F23
    Parting fans (a rain on the spot she left repeats Falling Feathers; wind copies of her
    repeat the Decoy); Volley F19 is Mass skeet (a thrown crescent repeats the Saw discs). Gale
    F10 is Kick into the rain (kicking arrows out of the floor repeats the Kick fan); Gale F12
    Heel wheel and F18 Over the top are pass-1 fixes (a small pull kick; a push off the foe
    that repeated Power Shot's spring).
  - Close but different, kept: Gale F4 (hooks a foe on the ground and throws it down) and F24
    Meteor (grabs one in the air and drives it down head first). Deadeye F18 (one shot at the
    top of a flip) and F24 (stays up 2 s and lobs three over the front line). Gale F8 (rides
    her own arrow), F21 (a travelling spin) and F23 (kicks while running). Deadeye F2 (release
    timing) and F17 (reaction timing).
- **N94. The new Deadeye forms in play.**
  - Flank shot (F1): "side or back" is the half of the foe's body away from its facing; a boss
    turns slowly, so it is the main use. Each foe on the line is judged on its own.
  - Sweet spot (F2): the window is the last 0.15 s before the full draw; missing it gives the
    plain full draw, 48. A tap is still half. The stagger is a 0.5 s stun under D35 (0.25 s on
    a boss, then its 5 s hard-CC guard).
  - Execute (F6): "falls at once" is 真实伤害 equal to the health it has left (formula D23,
    source 3), so shields still take it first (D9). The base "a kill readies it again" stays.
  - Suppressing fire (F7): the stance's 60%, reach and pierce stay. A root is hard CC (D36):
    on a boss 0.25 s, then its 5 s guard.
  - Interrupt (F9): a wind-up is a foe's telegraphed attack. With no wind-up in reach the three
    arrows fly as the base fan. A boss's wind-up is never broken (D40); the arrow still deals
    double.
  - Sky Bolt (F10): 1.5 s fall; the reticle shows where it lands; slows 25% for 2 s where it
    hits. Damage falls in a straight line from the centre to the edge.
  - Sticky charge (F11): the stuck foe takes 18 and the others 36, so throw it into a pack.
    Combo C9: an arrow of hers that hits the stuck foe sets it off at once, twice as wide.
  - Shoot-down (F12): only foes' shots, never a boss's spell or a floor warning. Each arrow
    stops one shot.
  - Bank shot (F13): a wall is any wall, pillar, Stonehide's slab or Stone Ring. It hits each
    foe on its path; it ends after the fourth bounce or 14 u.
  - Wind lane (F14): her own arrows only; allies' shots are not changed.
  - Tripwire (F15): "no dash or leap" stops foes' jumps and charges; it is not a stun.
  - Called rain (F16): five arrows for each hit, at most one call each 0.3 s on the same foe.
  - Counter (F17): the first foe attack that would hit her in the 0.6 s misses; with none, the
    arrow flies at the nearest foe after the 0.6 s for half.
  - Hang time (F18): the sim never slows; the 60% slow on foes within 6 u is a real slow under
    D35, and the dim is her own screen only (in co-op the others see her hang, not the dim).
  - Back line (F21): with fewer foes than spins, the farthest is hit again.
  - Perch (F24): the lobbed shots fly over foes and low walls and land on the pointer's foe.
- **N95. The new Volley and Gale forms in play.**
  - Volley Net (F4): the net is the tie's cord thrown wide; it replaces the tie.
  - Cull (F6): with no foe under 30% it flies as one base arrow.
  - Wind wall (F8): her own and her allies' shots pass through it; foes' shots do not. A boss
    walks through it and takes the damage.
  - Twin twisters (F14): each twister shoots one foe every 0.8 s, so the two together keep the
    base's rate.
  - Crossfire (F16): each curtain sweeps 8 u across; the cross point is the pointer.
  - Decoy (F18): not a boss, and never a foe Stonehide holds taunted (his taunt wins).
  - Mass skeet (F19): each launched foe is shot once; a boss is not launched and takes the
    kick's 20% (N14).
  - Two knots (F20): the second knot is at the pointer, the first at her cast spot as the base.
  - Parting fans (F23): behind her means opposite to the way she runs.
  - Gale Chase (F1): a boss is not sent flying: the arrow nails it at once, 20% more (N14).
  - Kick into the rain (F10): once a second for each foe.
  - Heel wheel (F12): "knocked flat" is a 0.3 s small stun under N13 (no 2 s guard).
  - Snare kick (F15): the kicked trap flies 5 u; with no foe it lands and waits as the base.
  - Cage (F16): a boss is not held in; the fence still hurts what crosses it, 8.
  - Over the top (F18): the open back is 易伤 under its own name, 20%, for every hero's hits.
  - Rope swing (F20): on a boss the ribbon ties and she swings, but the boss is not stunned.
- **N96. Combos and the new forms.**
  - C1 (Thread the knot) needs Pinning Arrow's tie: under Volley the Net gives the gathered
    pack the 1 s stun instead; under Gale the neck throw ties the thrown foe to its pack.
  - C5 (Through the twister): only arrows shot into the twister from outside count. Under Gale
    the twister is round her, so her own arrows never split; an ally cannot split them either.
    Under Deadeye the lane takes its place (its own 30%).
  - C6 (The rain rides the wind): under Deadeye Rain of Arrows is a single bolt, so nothing
    moves; under Volley and Gale it works.
  - C8 (Kick them in): under Deadeye the wire counts as the trap (a foe knocked across it
    trips for 1.4 s); under Gale the kicked trap does.
  - C9 (Shoot the arrow): on the Deadeye Sticky charge, N94.
  - C11 (Sky cast): a form that does not shoot at once (Deadeye Whirl Shot, Deadeye Feather
    Fan) takes no 30%; it starts as normal where she lands.
- **N97. Two base nudges, open with Kesh (kit section 7, pick 2):** Volley a long narrow fan,
  Feather Fan without its 30% run. The audit's other base pairs (four piercing lines, three
  backflips, two pulls, several spins) stay as roles; the page should make their looks differ:
  Piercing thin and fast, Power slow and heavy, Skypiercer a carrying drill; Vault low and long,
  Crescent tall and in place.
- **N98. Motions and sounds of the 39 new forms.** Times from the press. Each keeps the bar of
  N43: a ready pose, the big shape, a flourish, a held end pose.

  | Form | Motion | Sound |
  |---|---|---|
  | Deadeye F1 Flank shot | She skips one step to the side to open the angle, ears swing; a flat snap shot. A gold arc lights on each foe's back as the arrow passes; a flank hit bursts in a gold ring | a thin crack, a bright ping on a flank hit |
  | Deadeye F2 Sweet spot | The base draw; a thin jade ring shrinks toward the arrowhead (0 to 0.8 s). In the window the ring and the head flash together. A sweet release: a white shock ring at the bow and a brief freeze on the hit (0.08 s); the foe rocks back | a rising hum; a bell tone in the window; a deep crack |
  | Deadeye F6 Execute | She draws slowly, eyes narrowed; a gold line crosses each foe's health bar at the line. Loose at 0.5 s: one white streak. A foe under the line is pinned upright for a beat, then folds | silence before the loose; one hard snap |
  | Deadeye F7 Suppressing fire | The haunch stance. Each shot pins a jade spike at the foe's feet; a held foe trembles and its spikes multiply | a short thock for each pin |
  | Deadeye F9 Interrupt | Head still, eyes flicking; three snap shots one by one at the foes with a wind-up. A broken wind-up shatters its telegraph like glass and the foe staggers | three dry ticks; a glass crack on a break |
  | Deadeye F10 Sky Bolt | She shoots straight up and holds the pose, bow high; a jade reticle opens on the spot and narrows. At 1.5 s one giant arrow drops from the sky: a column of wind, a crater ring, the arrow standing in the floor 1 s | a falling whistle; one deep boom |
  | Deadeye F11 Sticky charge | A lob from the hip; the arrow sticks in a foe, its head swelling with a knot of wind that pulses faster. At 2 s the foe is blown open in a ring that throws the others out | a fuse tick that speeds up; a heavy whump |
  | Deadeye F12 Shoot-down | One spin; twelve arrows hang round her point-out like a clock face. When a foe's shot comes, the nearest arrow flicks out and strikes it in the air (a spark), then a second arrow flies back at the shooter | soft chimes; a clink on each stop |
  | Deadeye F13 Bank shot | She glances at the wall, then shoots across her body; the arrow rings off each wall in a jade spark and a short trail of light, faster after each bounce | a clean ring on each bounce |
  | Deadeye F14 Wind lane | She shoots the arrow along the floor; it lies down as a long jade lane with streaks flowing away from her for 3 s. Her arrows in it draw long bright trails | a steady rushing breath |
  | Deadeye F15 Tripwire | Two arrows into the floor, left then right, with a hop between; a thin jade wire pulls taut. A foe that crosses trips flat, and the wire twangs and holds | a taut twang; a trip thud |
  | Deadeye F16 Called rain | One arrow to the sky; a ring of 30 arrows waits overhead, turning slowly. Each hit of hers calls five down on that foe in a quick drum | a soft hiss overhead; a five-beat drum |
  | Deadeye F17 Counter | She lowers the bow and stands still, ears up, a thin ring round her (0.6 s). A hit comes: she slips aside in a blur and shoots back at once, point-blank or far | a held breath; a whoosh; a crack |
  | Deadeye F18 Hang time | The backflip stops at the top; she hangs upside down, the screen dims and the near foes crawl; she draws fully and looses straight down the line, then the flip finishes | the world's sounds dull; one sharp snap |
  | Deadeye F21 Back line | The three spinning kicks; at each turn she looks past the pack and the arrow flies over the near foes to the farthest one | a long whistle each |
  | Deadeye F24 Perch | She leaps high and hangs 2 s in a crouch on the wind, as if on a branch, cape flaring; three lobbed shots arc over the front line | wind rushing; three high twangs |
  | Volley F4 Net | One arrow; at the top of its flight it opens into a jade net that drops and pins everything under it | a snap and a rustle |
  | Volley F6 Cull | She fans arrows between her fingers and shoots them one by one at every weak foe, turning on her toes, ears whipping | a quick run of twangs |
  | Volley F8 Wind wall | The drill bores, then stands up behind its line as a tall wall of turning wind; foes that touch it are shredded | a long howl |
  | Volley F10 Steered rain | The base rain; a jade thread runs from her bow to the cloud, and she leans as it slides | rain hiss, a creak as it moves |
  | Volley F12 Shock ring | One spin; the ring of arrows unrolls outward along the floor like a ripple, a wave of thuds | a rolling rumble |
  | Volley F14 Twin twisters | Two slim twisters circle each other; foes are tossed between them in arcs | two rushing tones that beat against each other |
  | Volley F16 Crossfire | One arrow up; two curtains open at her left and right and march in, crossing in a bright X over her aim | two drums that meet |
  | Volley F17 Boomerang | A flat fan of five feathers that curve away and swing back past her like a flock | a whirr out, a whirr back |
  | Volley F18 Decoy | The backflip; a feather image of her stays where she stood, bow up. Foes turn on it; it bursts into eight arrows | a soft flutter; a burst of twangs |
  | Volley F19 Mass skeet | The flip kick throws every near foe up; upside down at the top she shoots each in turn | a whoosh; a quick run of hits |
  | Volley F20 Two knots | Two knots of wind, one at her spot, one at the pointer; the two packs are dragged together and crash | two rising whooshes, one crash |
  | Volley F21 Saw discs | Each spin flings a spinning disc of feathers that skims the floor and saws through the line | a buzzing whine |
  | Volley F23 Parting fans | While she runs, a fan of five snaps out behind her once a second, without her turning | a short volley each second |
  | Volley F24 Fountain | The heel landing opens a crater; arrows spray up out of it like a fountain and fall all round | a gush and a patter |
  | Gale F1 Chase | A spinning back kick launches the foe flat away; she nocks as it flies and the arrow catches it and nails it to the floor where it lands | a thump; a whistle; a pinning crack |
  | Gale F10 Kick into the rain | The rain falls on the spot; she fights at its edge and kicks foes into it; each lands in a burst of falling arrows | rain hiss; a burst on each kick-in |
  | Gale F12 Heel wheel | She leaps into a flat 540 spin in the air, heels out; arrows spray down from the spin and knock the foes flat; she lands in a crouch | a whirr; a patter of hits |
  | Gale F15 Snare kick | She drops the trap and volleys it with a hind paw like a ball; it flies spinning and snaps open on the first foe | a kick thump; a snap |
  | Gale F16 Cage | One arrow up; arrows fall as a ring fence round the pack and stand; she leaps over the fence and lands inside in a crouch | a fence of thuds; a landing whump |
  | Gale F17 Kick fan | She holds the bow low and kicks the string with her hind paw; five arrows burst out and knock foes back | a twang and a thump |
  | Gale F18 Over the top | She sprints, vaults over the foe's head with one paw on it, shoots down at it upside down, lands behind; a jade crack shows on its back | a whoosh; a snap; a crack |
  | Gale F20 Rope swing | A wind ribbon ties to the foe; she swings round it at full stretch, hind paws out, kicking every foe on the circle, and lets go | a rope creak; a run of kicks |
  | Gale F24 Meteor | At the top of the leap she grabs the nearest foe, flips and drives it down head first; a crater and a ring of dust | a rush; a heavy crash |
  | T15 Hurricane Dance | A jade cyclone rises round her and lifts the pack; arrows spiral up into them; she drops through the middle in an axe kick that slams them all down | a rising howl; one crash |

- **N99. AI seat for the new forms.** Deadeye: releases Power Shot in the sweet spot every time
  (the AI's timing is exact, so its sweet-spot rate is capped at 60% to match a good player);
  aims Sky Bolt where its foe will be in 1.5 s; casts Shoot-down only when foes' shots are in
  the air near the party; casts Counter when a foe's wind-up is aimed at her; lays Tripwire
  across the path between the pack and the party; uses Bank shot only on a foe it cannot hit
  straight; casts Interrupt only when a wind-up is in reach; uses Perch when a shooter hides
  behind the pack. Volley: Two knots on the two largest packs; Wind wall across the way the
  pack walks to the party; Decoy only when a foe is within 2 u of her. Gale: Rope swing only
  with three or more foes within 2 u of the tied one; Meteor on the foe nearest the pack's
  centre; Snare kick at the pack, never at a boss alone; Over the top only when the tank holds
  the foe.
- **N100. Looks and colours of the new forms.** Every reticle, aim ring, wire, lane, net, wall,
  ribbon and cage is Wind Jade or Feather Bone, never Ember (Ember is the foes' floor warning)
  and never Violet. The Sky Bolt reticle is a jade ring with four feather ticks, so it cannot
  read as a foe's warning. Gold for the Deadeye flank arc and the Execute line (it is in her
  palette, not a reserved colour). Effects dim and readable (`.claude/rules/visuals.md`).
- **N101. The damage formula for the new forms.**

  | Form | Type | A hit? | 抗性 form |
  |---|---|---|---|
  | Execute's "falls at once" | 真实伤害, the health left | no | none |
  | Sticky charge, Sky Bolt, Called rain, Crossfire, Shock ring, Fountain, Wind wall touch, Two knots crash, Decoy burst, Heel wheel arrows, Cage landing and fence | 常规直伤 | yes | area |
  | Flank shot, Sweet spot, Interrupt, Bank shot, Shoot-down's arrows back, Counter, Hang time, Back line, Perch, Cull, Mass skeet, Saw discs, Parting fans, Boomerang, Chase's arrow | 常规直伤 | yes | ranged |
  | Chase's kick, Kick fan, Over the top's kick, Rope swing kicks, Meteor, Snare kick | 常规直伤 | yes | melee |
  | T15's flung or lifted foes | movement, no damage of their own | | |

  - 基础伤害区: Flank shot's double, Sweet spot's double, Execute's triple, Sticky charge's
    split. 增伤区: Wind lane's 30%. 易伤区: Over the top's open back, 20%, own name (adds with
    Hunter's Mark). 控制 (D35): Sweet spot's stagger, Suppressing fire's roots, Tripwire's trip
    and grounding, the Net, Two knots, Heel wheel, Snare kick, Rope swing, Hang time's slow.
