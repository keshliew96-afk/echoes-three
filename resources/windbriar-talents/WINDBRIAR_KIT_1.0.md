# Windbriar: skills and talent paths

**Version 1.0, 2026-11-18. Design only** (the feature freeze holds). Kesh, 12:35 Singapore time:
three play styles (1 single target, charge and aim, sniper; 2 many targets, 清杂怪, 箭雨; 3 melee
like 枪斗术: wind to 聚怪, kicks, 位移, quick short-range arrows) and the elements bow, arrow,
fancy kicks, wind, 弓斗术. Numbers, motions, the damage formula sort and the reasons are in
`WINDBRIAR_NOTES.md`; other games' ideas are in `WINDBRIAR_IDEA_LIST.md`. All numbers are first
guesses. Answer by line number.

## 1. In one look

- **W1.** One pool of 26: 8 Shot 狙, 8 Rain 雨, 8 Kata 斗, 2 passives. She holds 4.
- **W2.** Three paths: **Deadeye 穿杨** (one foe, drawn shots), **Volley 万箭** (many foes, fans
  and rains), **Gale 弓斗** (within 3 u: kicks, wind, hip shots). One pick per tier from any path.
- **W3.** The tier I talent sets her style and re-shapes every skill she holds (section 4). A
  skill of the style's own kind keeps its move and gets more; the others change shape.
- **W4.** No heal, no shield, no damage over time. Her safety is range, the dash and her legs.

## 2. Passive, basic attack, dash

- **W5. Windbriar 风棘 (passive).**
  1. **Briars.** Every arrow that hits stays in the foe: up to 6, for 6 s.
  2. **Windcall 唤风.** The last shot of her basic combo calls the wind: every briar in the foes
     it hits is torn out, 2 each. Three skills call the wind too (marked 唤).
  3. **Each style sends the torn briars somewhere else.**
     - No style: they just tear out.
     - Deadeye: every briar within 6 u flies into the one foe she shot.
     - Volley: each flies to the nearest other foe within 3 u, hits it and stays in it.
     - Gale: they fly back to her paw through the pack; each one caught is 5% attack speed
       for 3 s (up to 30%).
- **W6. Basic attack.** Shot, shot, then the flat bow with three arrows: 12, 12, 3 × 6, reach
  4.5 u (as passed on her model page).
  - Deadeye: every shot is a drawn shot: 0.75 s, 26, reach 6.5 u, through one more foe.
  - Volley: shots one and two split in three (12 and two of 6); the last is five arrows.
  - Gale: a five-beat 弓斗术 within 3 u: bow sweep 8, hip shot 8, back kick 8, two hip shots
    of 5, flip kick 10 with a shot straight down 6.
- **W7. Dash.** As passed: a somersault with three homing arrows; top priority, untouchable.
  Deadeye: all three at the foe nearest the pointer. Volley: at three foes. Gale: it ends in a
  dive kick, 8 within 1.5 u.

## 3. The talent grid

| Tier | Deadeye 穿杨 | Volley 万箭 | Gale 弓斗 |
|---|---|---|---|
| I Style | **T1 Full Draw 满弦**: every skill takes its Deadeye form | **T2 Split Arrows 分矢**: every skill takes its Volley form | **T3 Bow Dance 弓斗术**: every skill takes its Gale form |
| II Power | **T4 Heartseeker 破的**: an arrow that hits only one foe deals 25% more | **T5 Hail 密雨**: a shot, ring or rain that hits three or more foes deals 25% more | **T6 Iron Leg 劲腿**: kicks, bow strikes and arrows that hit within 2 u deal 25% more |
| III Trick | **T7 Through the Heart 穿心**: an arrow that fells a foe flies on to the next foe within 5 u at full strength | **T8 Falling Feathers 余雨**: a foe she fells drops a small rain where it stood: 8 within 1.5 u | **T9 Slipstream 借风**: a kick or an arrow within 2 u readies her dash (once a second); her next arrow after a kick fires at once for 30% more |
| IV Reach | **T10 Far Sight 千步**: arrows fly 35% farther and 40% faster; the view pulls back a little | **T11 Wide Sky 遮天**: fans, rings, bursts and rains are 30% wider | **T12 Long Wind 长风**: pulls and winds reach 30% farther; steps, flips and kick dashes go 25% farther |
| V Capstone | **T13 Hundred Paces 百步穿杨**: after 1 s standing still her next skill arrow is perfect: a sure crit, 50% more crit damage, through everything, ignoring defence | **T14 Ten Thousand Arrows 万箭齐发**: every 6th skill, the sky opens over the whole room for 3 s: each foe is struck four times, 6 each | **T15 Hurricane Dance 飓风舞**: every 6th skill she whirls up in a cyclone: pulls all within 4 u, twelve arrows in a spiral (3 each), then an axe kick: 20 within 2.5 u |

## 4. The 26 skills and their forms

"adds" keeps the move and puts more on it. "changes" replaces it. 唤 = calls the wind.

| # | Skill (cooldown) | Base | Deadeye 穿杨 | Volley 万箭 | Gale 弓斗 |
|---|---|---|---|---|---|
| | **Shot 狙** | | | | |
| F1 | Piercing Shot 贯矢 (3 s) | one arrow through every foe on a 5.5 u line: 30 | changes: it stops in the first foe with all its force: 42, nails it 1 u back | adds: each foe it passes sheds two side arrows: 6 | changes: a back kick, then the arrow point-blank through 3 u: 6 + 30 |
| F2 | Power Shot 满弦箭 (6 s) | 0.8 s draw; a wind arrow 8 u: 48, 10% less for each foe after the first | adds: 1.2 s draw; the first foe takes 72 and half its defence is ignored | changes: no fall-off; its wind trail cuts for 2 s more | changes: no draw: a paw on the foe's chest, she springs back 2 u and looses from the hip: 8 + 40 |
| F3 | Hunter's Mark 猎印 (6 s) | 12; the foe takes 30% more for 3 s | adds: 5 s, and her arrows curve to the marked foe | changes: marks every foe within 2 u, 20% | changes: an axe kick marks; each close hit adds 0.5 s |
| F4 | Pinning Arrow 钉矢 (7 s) | 20, stun 0.75 s; ties the foe to a foe or wall within 2.5 u behind it: both stunned 1 s | adds: her next arrow on a pinned foe is a sure crit | changes: three arrows in a fan: 14, stun 0.5 s | changes: she hooks its neck with the bow, throws it down and shoots it on the floor: 10 + 14 |
| F5 | Rapid Fire 连珠 (9 s) | 1.5 s: ten arrows at one foe within 6 u, walking at half speed: 5 each | changes: five drawn arrows of 9, each 10% more than the last | changes: she sweeps the bow: the arrows fan across 90° | changes: fourteen arrows of 4 from the hip within 3 u, at full run |
| F6 | Kill Shot 绝矢 (8 s) | 24; double under 30% health; a kill readies it again | adds: the arrow that fells a foe flies on to the next within 4 u | changes: three arrows, 10 each, same rule | changes: a flying knee, then an arrow under the chin: 10 + 16 |
| F7 | Eagle Stance 鹰踞 (12 s) | she kneels 4 s: basic shots 60% more, 3 u farther, through one more foe; walking ends it | adds: each shot 15% harder than the last | changes: she aims at the sky: each shot falls as a 1.5 u burst at the pointer | changes: crane stance: a foe that comes within 1.5 u is kicked away: 8 |
| F8 | Skypiercer 贯日 (big, 14 s) 唤 | 1 s draw; a giant spiral wind arrow, 10 u: six hits of 8; small foes are carried to its end | changes: a needle: it passes small foes and stops in the first elite, champion or boss: all six hits and a burst of 24 | adds: wind pulls foes onto the line; arrows rain along it 2 s | changes: she rides it: a spinning flying kick 6 u through the foes |
| | **Rain 雨** | | | | |
| F9 | Volley 散矢 (4.5 s) | three arrows in a fan, 4.8 u: 14 each | changes: one behind another at one foe: 14, 14, 20 | adds: five arrows, each through one foe | changes: a low sweep trips the foes, then three arrows point-blank: 6 + 16 each |
| F10 | Rain of Arrows 箭雨 (11 s) | a rain 1.4 u wide, 4 s: 7 each half second, slow 25% | changes: the whole rain follows one foe: 10 | adds: 2.2 u wide; it creeps to the pointer | changes: it falls round her and follows her |
| F11 | Burst Arrow 绽矢 (7 s) | the arrow lands, then bursts: 18 within 1.5 u; six shards fly out: 6 | changes: it sticks in a foe and bursts inside: 36 | adds: each shard bursts again: 8 | changes: she stamps it into the floor and backflips off the blast: 24, launch |
| F12 | Whirl Shot 旋矢 (8 s) | one spin, a ring of twelve arrows: 16 to each foe within 3 u | changes: the twelve curve round and all strike one foe: 4 each | adds: a second ring the other way for half | adds: a roundhouse kick first that pulls foes 1 u in: 8 |
| F13 | Ricochet 弹矢 (6 s) | one arrow hops foe to foe, six hits: 10 each | changes: it hops between one foe and the floor: four hits of 11 | adds: on its third hit it splits in two | changes: she is the ricochet: she springs off four foes, a kick each, and shoots the last from the air |
| F14 | Tornado Shot 旋风矢 (8 s) 唤 | the arrow becomes a whirlwind, 2 u, 2.5 s: pulls foes in and shoots one every 0.4 s: 6 × 6 | changes: it wraps one foe: held 1.5 s, six arrows of 7 | adds: 3 u wide, drifts to the pack, ends in a ring of arrows | changes: the whirlwind is round her and shoots with her |
| F15 | Briar Trap 棘阱 (9 s) | a trap, 0.75 u; it snaps: stun 0.7 s, 8 each half second for 3 s, three briars | changes: one great jaw holds one foe 1.5 s; arrows on it are sure crits | changes: three small traps in a row | changes: it springs under her own feet as she hops: all within 1.5 u |
| F16 | Arrowstorm 万箭 (big, 14 s) | one arrow to the sky; a curtain of arrows 5 u wide sweeps 8 u away from her: three hits of 14 | changes: the curtain closes into a column on one spot: ten hits of 6 | adds: the curtain sweeps out and comes back | changes: a ring of arrows falls round her and closes in, driving the foes to her feet |
| | **Kata 斗** | | | | |
| F17 | Feather Fan 羽扇 (5 s) | five arrows in a close spray, 3.2 u: 9 each; she runs 30% faster 1.5 s | changes: all five into one foe; the fifth knocks it back 2 u | adds: nine arrows across 150°, through the foes | adds: she turns and fans again behind her |
| F18 | Vault Shot 跃射 (6 s) | a backflip 1.6 u, untouchable, one arrow from the air: 18, slow 30% | adds: 2.5 u, and the arrow is a drawn shot: 30 | adds: three arrows, to three foes | changes: she leaps at the foe, kicks off its face and flips back, shooting: 10 + 14 |
| F19 | Crescent Kick 月弧踢 (5 s) | a backflip kick: 14 within 1.5 u, launched 0.6 s; she shoots one launched foe: 12 | adds: she shoots it three times before it lands: 8 each | adds: the kick throws a crescent of wind 4 u: 10 | adds: a second flip kick spikes it down: 12 round where it lands |
| F20 | Windknot 聚风 (8 s) 唤 | she whirls the bow like a staff: wind pulls every foe within 4 u of the spot to its centre: 8, slow 40% | changes: the wind draws the foes into one straight row along her aim | adds: pulls from 5.5 u and holds them 0.6 s | changes: centred on her; she ends in a low sweep: 10 |
| F21 | Cyclone Kick 旋风腿 (7 s) | three spinning kicks, 1.8 u: 6 each, the last pushes 1.5 u; each spin looses an arrow: 6 | changes: three kicks and three shots, all on one foe: 6 and 8 | adds: each spin looses a ring of six arrows | adds: she travels 3 u, a fourth spin, the last kick launches |
| F22 | Bow Sweep 弓击 (4 s) | two strikes with the bow, 1.5 u: 8, 8; the string snaps an arrow point-blank: 14, 2 u back | changes: the bow hooks one foe, she drives the arrow in by paw: 34; its defence is 30% lower 4 s | adds: full circles; the arrow flies on 4 u | adds: a third strike and a rising kick: 8, launch |
| F23 | Windrun 御风 (12 s) | 3 s: she runs 40% faster, foes' shots pass through her, she shoots at full run | adds: when it ends her next arrow skill needs no draw and deals 30% more | adds: arrows rain along the trail she ran: 8 | adds: each foe she runs through is kicked: 6 |
| F24 | Eagle Dive 鹰坠 (10 s) | she leaps high, untouchable, shoots five arrows down: 6 each; then dives heel first: 16 within 1.8 u, launch | changes: all five into one foe; no dive, a drawn shot from the air: 24 | adds: ten arrows; the landing sends a ring of arrows: 8 | adds: she bounces into a second dive on the next pack: 10 |
| | **Passives** (no form) | | | | |
| F25 | Kestrel Watch 隼望 | a wind kestrel circles her; each second it shoots the nearest foe within 4 u: 6 | | | |
| F26 | Barbed Heads 倒钩 | a foe takes 3% more from her for each briar in it (up to 18%); briars last 2 s longer | | | |

## 5. Picks (answer like "1a 2a 3a")

1. The passive. **a) Windbriar 风棘**, the briars (W5, my pick). b) Tailwind 顺风: each skill
   gives a wind stack (speed); at three the next combo ender is one big wind arrow.
2. Charged shots. **a) she draws by herself for a fixed time while the aim follows the pointer**
   (my pick: in cast mode 2 a held key already means "aim"). b) hold the key to charge, let go to
   shoot.
3. Gale's basic attack. **a) the five-beat 弓斗术 within 3 u** (W6, my pick). b) she keeps
   shooting from range; only her skills go close.
4. Path names. **a) Deadeye 穿杨, Volley 万箭, Gale 弓斗** (my pick). b) your names.
5. Three old skills renamed to fit bow, arrow and wind: Detonating Charge is Burst Arrow,
   Sundering Nova is Whirl Shot, Barbed Trap is Briar Trap. **a) rename** (my pick). b) keep the
   old names.
6. The pool. **a) 8 Shot, 8 Rain, 8 Kata, 2 passives as listed** (my pick). b) drop or swap
   some: name the F numbers.
