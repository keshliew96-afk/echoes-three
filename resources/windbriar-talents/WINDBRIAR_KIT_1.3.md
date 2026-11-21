# Windbriar: skills and talent paths

**Version 1.3, 2026-11-18. Design only** (the feature freeze holds). 1.3: Eagle Stance's Gale form
is a 霹雳舞 (Kesh on the ability page, 16:09 Singapore time; notes N92). 1.2 added the twelve combos
(section 6; Kesh, 13:07 Singapore time: "All combo"). 1.1 had his picks of 13:02 (section 5):
the passive is Tailwind, drawn shots are held, and the audit picks are in. Version 1.0 is kept as `WINDBRIAR_KIT_1.0.md`. Kesh, 12:35 Singapore time:
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
  Under Bow Dance she also has 风护 (T3).

## 2. Passive, basic attack, dash

- **W5. Tailwind 顺风 (passive).**
  1. Each skill she casts gives one Tailwind for 6 s, up to three: each is 5% run speed and 5%
     attack speed.
  2. At three, the last shot of her next basic combo is the **Gale Arrow 风矢**, and the three
     are spent: one great wind arrow, 7 u through every foe: 30.
  3. **Each style gives the Gale Arrow its shape.**
     - Deadeye: her next full drawn shot. It stops in the first foe: 42, ignoring its defence.
     - Volley: it breaks on the first foe (20) into seven wind arrows that fan out behind it:
       10 each.
     - Gale: her flip kick throws a ring of wind, 3 u: 24; the foes are pulled to her and
       launched.
- **W6. Basic attack.** Shot, shot, then the flat bow with three arrows: 12, 12, 3 × 6, reach
  4.5 u (as passed on her model page).
  - Deadeye: every shot is a drawn shot: hold attack. A tap is 12, a full draw (0.75 s) is 26,
    reach 6.5 u, through one more foe.
  - Volley: shots one and two split in three (12 and two of 6); the last is five arrows.
  - Gale: a five-beat 弓斗术 within 3 u: bow sweep 8, hip shot 8, back kick 8, two hip shots
    of 5, flip kick 10 with a shot straight down 6.
- **W7. Dash.** As passed: a somersault with three homing arrows; top priority, untouchable.
  Deadeye: all three at the foe nearest the pointer. Volley: at three foes. Gale: it ends in a
  dive kick, 8 within 1.5 u.
- **W8. Drawn shots are held.** Power Shot, Skypiercer and the Deadeye basic shot: hold the key
  to draw, let go to shoot. A tap shoots at once for half; a full draw is the full number.
- **W9. Kicks move everything.** Her pushes, launches and carries move a taunted foe too; if it
  is still taunted when it stops, it walks back to the tank. A foe can be launched again and
  again (free juggling). A boss is never moved; that hit deals 20% more instead.

## 3. The talent grid

| Tier | Deadeye 穿杨 | Volley 万箭 | Gale 弓斗 |
|---|---|---|---|
| I Style | **T1 Full Draw 满弦**: every skill takes its Deadeye form | **T2 Split Arrows 分矢**: every skill takes its Volley form | **T3 Bow Dance 弓斗术**: every skill takes its Gale form; 风护: 20% less damage while a foe is within 3 u |
| II Power | **T4 Heartseeker 破的**: an arrow that hits only one foe deals 25% more | **T5 Hail 密雨**: a shot, ring or rain that hits three or more foes deals 25% more; a champion or boss counts as three | **T6 Iron Leg 劲腿**: kicks, bow strikes and arrows that hit within 2 u deal 25% more |
| III Trick | **T7 Through the Heart 穿心**: an arrow that fells a foe flies on to the next foe within 5 u at full strength, with no limit | **T8 Falling Feathers 余雨**: a foe she fells drops a small rain where it stood: 8 within 1.5 u | **T9 Slipstream 借风**: a kick or an arrow within 2 u readies her dash (once a second); her next arrow after a kick fires at once for 30% more |
| IV Reach | **T10 Far Sight 千步**: arrows fly 35% farther and 40% faster; the view pulls back a little | **T11 Wide Sky 遮天**: fans, rings, bursts and rains are 30% wider | **T12 Long Wind 长风**: pulls and winds reach 30% farther; steps, flips and kick dashes go 25% farther |
| V Capstone | **T13 Hundred Paces 百步穿杨**: after 1 s standing still her next skill arrow is perfect: a sure crit, 50% more crit damage, through everything, ignoring defence | **T14 Ten Thousand Arrows 万箭齐发**: every 6th skill, the sky opens over the whole room for 3 s: each foe is struck four times, 6 each | **T15 Hurricane Dance 飓风舞**: every 6th skill she whirls up in a cyclone: pulls all within 4 u, twelve arrows in a spiral (3 each), then an axe kick: 20 within 2.5 u |

## 4. The 26 skills and their forms

"adds" keeps the move and puts more on it. "changes" replaces it.

| # | Skill (cooldown) | Base | Deadeye 穿杨 | Volley 万箭 | Gale 弓斗 |
|---|---|---|---|---|---|
| | **Shot 狙** | | | | |
| F1 | Piercing Shot 贯矢 (3 s) | one arrow through every foe on a 5.5 u line: 30 | changes: it stops in the first foe with all its force: 42, nails it 1 u back | adds: each foe it passes sheds two side arrows: 6 | changes: a back kick, then the arrow point-blank through 3 u: 6 + 30 |
| F2 | Power Shot 满弦箭 (6 s) | hold to draw, up to 0.8 s; a wind arrow 8 u: 24 on a tap, 48 at full draw, 10% less for each foe after the first | adds: the draw goes on to 1.2 s: the first foe takes 72 and half its defence is ignored | changes: no fall-off; its wind trail cuts for 2 s more | changes: no draw: a paw on the foe's chest, she springs back 2 u and looses from the hip: 8 + 40 |
| F3 | Hunter's Mark 猎印 (6 s) | 12; the foe takes 30% more for 3 s | adds: 5 s, and her arrows curve to the marked foe | changes: marks every foe within 2 u, 20% | changes: an axe kick marks; each close hit adds 0.5 s |
| F4 | Pinning Arrow 钉矢 (7 s) | 20, stun 0.75 s; ties the foe to a foe or wall within 2.5 u behind it: both stunned 1 s | adds: her next arrow on a pinned foe is a sure crit | changes: three arrows in a fan: 14, stun 0.5 s | changes: she hooks its neck with the bow, throws it down and shoots it on the floor: 10 + 14 |
| F5 | Rapid Fire 连珠 (9 s) | 1.5 s: ten arrows at one foe within 6 u, walking at half speed: 5 each | changes: five drawn arrows of 9, each 10% more than the last | changes: she sweeps the bow: the arrows fan across 90° | changes: fourteen arrows of 4 from the hip within 3 u, at full run |
| F6 | Kill Shot 绝矢 (8 s) | 24; double under 30% health; a kill readies it again | adds: the arrow that fells a foe flies on to the next within 4 u | changes: three arrows, 10 each, same rule | changes: a flying knee, then an arrow under the chin: 10 + 16 |
| F7 | Eagle Stance 鹰踞 (12 s) | she kneels 4 s: basic shots 60% more, 3 u farther, through one more foe; walking ends it | adds: each shot 15% harder than the last | changes: she aims at the sky: each shot falls as a 1.5 u burst at the pointer | changes: a 霹雳舞: her spin's wind slowly drags foes in; each one that reaches her is kicked out (8) and flies back, hurting the foes in its way (6); then the wind drags them in again |
| F8 | Skypiercer 贯日 (big, 14 s) | hold to draw, up to 1 s; a giant spiral wind arrow, 10 u: three hits of 8 on a tap, six at full draw; small foes are carried to its end | changes: a needle: it passes small foes and stops in the first elite, champion or boss: all six hits and a burst of 24 | adds: wind pulls foes onto the line; arrows rain along it 2 s | changes: she rides it: a spinning flying kick 6 u through the foes |
| | **Rain 雨** | | | | |
| F9 | Volley 散矢 (4.5 s) | three arrows in a fan, 4.8 u: 14 each | changes: one behind another at one foe: 14, 14, 20 | adds: five arrows, each through one foe | changes: a low sweep trips the foes, then three arrows point-blank: 6 + 16 each |
| F10 | Rain of Arrows 箭雨 (11 s) | a rain 1.4 u wide, 4 s: 7 each half second, slow 25% | changes: the whole rain follows one foe: 10 | adds: 2.2 u wide; it creeps to the pointer | changes: it falls round her and follows her |
| F11 | Burst Arrow 绽矢 (7 s) | the arrow lands, then bursts: 18 within 1.5 u; six shards fly out: 6 | changes: it sticks in a foe and bursts inside: 36 | adds: each shard bursts again: 8 | changes: she stamps it into the floor and backflips off the blast: 24, launch |
| F12 | Whirl Shot 旋矢 (8 s) | one spin, a ring of twelve arrows: 16 to each foe within 3 u | changes: the twelve curve round and all strike one foe: 4 each | adds: a second ring the other way for half | adds: a roundhouse kick first that pulls foes 1 u in: 8 |
| F13 | Ricochet 弹矢 (6 s) | one arrow hops foe to foe, six hits: 10 each | changes: it hops between one foe and the floor: four hits of 11 | adds: on its third hit it splits in two | changes: she is the ricochet: she springs off four foes, a kick each, and shoots the last from the air |
| F14 | Tornado Shot 旋风矢 (8 s) | the arrow becomes a whirlwind, 2 u, 2.5 s: pulls foes in and shoots one every 0.4 s: 6 × 6 | changes: it wraps one foe: held 1.5 s, six arrows of 7 | adds: 3 u wide, drifts to the pack, ends in a ring of arrows | changes: the whirlwind is round her and shoots with her |
| F15 | Briar Trap 棘阱 (9 s) | a trap, 0.75 u; it snaps: stun 0.7 s, 8 each half second for 3 s | changes: one great jaw holds one foe 1.5 s; arrows on it are sure crits | changes: three small traps in a row | changes: it springs under her own feet as she hops: all within 1.5 u |
| F16 | Arrowstorm 万箭 (big, 14 s) | one arrow to the sky; a curtain of arrows 5 u wide sweeps 8 u away from her: three hits of 14 | changes: the curtain closes into a column on one spot: ten hits of 6 | adds: the curtain sweeps out and comes back | changes: a ring of arrows falls round her and closes in, driving the foes to her feet |
| | **Kata 斗** | | | | |
| F17 | Feather Fan 羽扇 (5 s) | five arrows in a close spray, 3.2 u: 9 each; she runs 30% faster 1.5 s | changes: all five into one foe; the fifth knocks it back 2 u | adds: nine arrows across 150°, through the foes | adds: she turns and fans again behind her |
| F18 | Vault Shot 跃射 (6 s) | a backflip 1.6 u, untouchable, one arrow from the air: 18, slow 30% | adds: 2.5 u, and the arrow is a drawn shot: 30 | adds: three arrows, to three foes | changes: she leaps at the foe, kicks off its face and flips back, shooting: 10 + 14 |
| F19 | Crescent Kick 月弧踢 (5 s) | a backflip kick: 14 within 1.5 u, launched 0.6 s; she shoots one launched foe: 12 | adds: she shoots it three times before it lands: 8 each | adds: the kick throws a crescent of wind 4 u: 10 | adds: a second flip kick spikes it down: 12 round where it lands |
| F20 | Windknot 聚风 (8 s) | she whirls the bow like a staff: wind pulls every foe within 4 u of the spot to its centre: 8, slow 40% | changes: the wind draws the foes into one straight row along her aim | adds: pulls from 5.5 u and holds them 0.6 s | changes: centred on her; she ends in a low sweep: 10 |
| F21 | Cyclone Kick 旋风腿 (7 s) | three spinning kicks, 1.8 u: 6 each, the last pushes 1.5 u; each spin looses an arrow: 6 | changes: three kicks and three shots, all on one foe: 6 and 8 | adds: each spin looses a ring of six arrows | adds: she travels 3 u, a fourth spin, the last kick launches |
| F22 | Bow Sweep 弓击 (4 s) | two strikes with the bow, 1.5 u: 8, 8; the string snaps an arrow point-blank: 14, 2 u back | changes: the bow hooks one foe, she drives the arrow in by paw: 34; its defence is 30% lower 4 s | adds: full circles; the arrow flies on 4 u | adds: a third strike and a rising kick: 8, launch |
| F23 | Windrun 御风 (12 s) | 3 s: she runs 40% faster, foes' shots pass through her, she shoots at full run | adds: when it ends her next arrow skill deals 30% more, and a tap is a full draw | adds: arrows rain along the trail she ran: 8 | adds: each foe she runs through is kicked: 6 |
| F24 | Eagle Dive 鹰坠 (10 s) | she leaps high, untouchable, shoots five arrows down: 6 each; then dives heel first: 16 within 1.8 u, launch | changes: all five into one foe; no dive, a drawn shot from the air: 24 | adds: ten arrows; the landing sends a ring of arrows: 8 | adds: she bounces into a second dive on the next pack: 10 |
| | **Passives** (no form) | | | | |
| F25 | Kestrel Watch 隼望 | a wind kestrel circles her; each second it shoots the nearest foe within 4 u: 6 | | | |
| F26 | Fleet Foot 脱兔 | after her dash or any flip, her next three basic shots are 50% faster and deal 20% more | | | |

## 5. Picks

**Closed. Kesh, 2026-11-18 13:02 Singapore time:** "1b, 2b, 3a, 4a, 5a, 6a i will review again at
ability page. A1b still can moves, if after moves the foes is still in taunt state, it will
still go find the tank, A2b, A3a, A4b, A5a, A6a".

1. b: the passive is Tailwind 顺风 (W5).
2. b: hold the key to charge (W8).
3. a: Gale's basic attack is the five-beat 弓斗术 (W6).
4. a: Deadeye 穿杨, Volley 万箭, Gale 弓斗.
5. a: Burst Arrow, Whirl Shot, Briar Trap.
6. a: the pool as listed, to be judged again on the ability page.

Audit: A1 b with his rule (W9), A2 b free juggling (W9), A4 b no limit (T7), A5 a (T5),
A6 a 风护 (T3). A3 was about the briars, which are gone with pick 1b.

**Changed because the briars are gone:** Windcall and its three marks; the passive skill Barbed
Heads is now Fleet Foot (F26); Briar Trap keeps its name and loses its briars.

## 6. Combos (all twelve taken)

Each is one small rule between two skills; none needs a talent. Notes in
`WINDBRIAR_COMBO_IDEAS.md`.

| # | Name | The rule |
|---|---|---|
| C1 | Thread the knot 一箭穿结 | Pinning Arrow into foes gathered by Windknot or Tornado Shot ties up to three: all stunned 1 s |
| C2 | Wall slam | A foe she knocks or carries into a wall takes 10 and is stunned 0.5 s; Stonehide's slab and Stone Ring count |
| C3 | Air shot 空射 | Her arrows deal 30% more to a foe in the air, whoever launched it |
| C4 | Spike | Eagle Dive's heel or Kill Shot on a foe in the air slams it down: 50% more, and 10 to foes within 1.5 u |
| C5 | Through the twister 穿风 | An arrow of hers through her Tornado Shot comes out as three, each at a foe near it, for half |
| C6 | The rain rides the wind | Windknot or Tornado Shot cast on her Rain of Arrows takes the rain with it |
| C7 | The kestrel hunts the mark | Kestrel Watch shoots only the foe with Hunter's Mark, twice as often |
| C8 | Kick them in 踢入陷阱 | A foe pushed, pulled or carried into Briar Trap: the stun is 1.4 s and its first second deals double |
| C9 | Shoot the arrow 射爆 | Any arrow of hers that hits her standing Burst Arrow sets it off at once, twice as wide |
| C10 | Dash draw 空中引弦 | A dash does not cancel a draw: she keeps drawing through the somersault and can loose in it |
| C11 | Sky cast 空中施放 | Volley, Feather Fan, Whirl Shot or Burst Arrow pressed during the dash is shot down from its top and covers 30% more |
| C12 | Full sail 满帆 | Windrun fills Tailwind to three at once, and the Tailwinds do not run out while it lasts |
