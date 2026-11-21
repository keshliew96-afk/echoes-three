# Windbriar: sameness audit

2026-11-18, for kit 1.3. Kesh, 23:53 and 23:54 Singapore time: the Deadeye forms reuse one idea
(two 箭雨 skills both become "rain on one foe"); every skill needs its own 特点; do a full audit that
each skill is different.

**What was checked:** the 26 base skills, all 72 style forms, the Gale Arrow, basic attack and dash
forms, the 15 talents and the 12 combos (`WINDBRIAR_KIT.md` 1.3).

**The rule used:** each form is boiled down to its one core idea (its 特点). An idea used by two or
more forms of the same style is a repeat. One form keeps the idea; the others get a new one. A form
that does what a talent already does is also a repeat.

**The fixes below are suggestions.** The design thread turns them into kit 1.4, with numbers, for
Kesh's picks.

## 1. Result in one look

| Style | Forms | Own idea | Repeats | Worst repeat |
|---|---|---|---|---|
| Deadeye 穿杨 | 24 | 9 | 15 | 9 forms pour every hit into one foe |
| Volley 万箭 | 24 | 13 | 11 | 8 forms just add more arrows or a ring |
| Gale 弓斗 | 24 | 17 | 7 | 5 forms move the skill onto her own body |
| Base pool | 26 | 20 | 6 pairs | 4 long piercing arrows, 2 fans, 3 backflips |

## 2. Deadeye 穿杨

**Repeated ideas:**
- **D1. Everything into one foe** (9): F9, F10, F12, F13, F14, F16, F17, F21, F24. Kesh's example is
  F10 and F16.
- **D2. Stops in the first foe** (4): F1, F8, F11 and the Deadeye Gale Arrow.
- **D3. Each shot harder than the last** (2): F5, F7.
- **D4. Sure crit or held foe** (3): F4, F14 (held), F15 (held and sure crits).
- **D5. Ignores defence** (3): F2, the Gale Arrow, and T13 Hundred Paces.
- **D6. "The arrow becomes a drawn shot"** (2): F18, F24.
- **F6 copies a talent:** "the arrow that fells a foe flies on" is T7 Through the Heart word for word.

**Every form, with a suggested 特点 for each one that changes** (all 24 end up different):

| # | Now | Verdict | Suggested 特点 |
|---|---|---|---|
| F1 Piercing Shot | stops in the first foe, nails it back | change (D2) | **Long shot 远射**: through every foe as the base; the farther it has flown, the harder it hits (double at 8 u) |
| F2 Power Shot | longer draw, ignores half defence | change (D5) | **Sweet spot 满月**: a ring closes on the arrowhead as she draws; let go inside its short window for double and a stagger |
| F3 Hunter's Mark | 5 s, her arrows curve to the mark | keep | homing |
| F4 Pinning Arrow | next arrow on the pinned foe is a sure crit | keep | the one sure-crit form |
| F5 Rapid Fire | five drawn arrows, each 10% more | keep | the one build-up form |
| F6 Kill Shot | a kill flies on to the next foe | change (copies T7) | **Execute 斩杀**: a foe under 15% (not a champion or boss) falls at once; a boss under 30% takes triple |
| F7 Eagle Stance | each shot 15% harder | change (D3) | **Overwatch 守望**: her aim line stays on the floor; any foe that steps onto it is shot at once |
| F8 Skypiercer | needle: passes small foes, stops in the first big one | keep | the one form that picks the big foe |
| F9 Volley | three arrows one behind another at one foe | change (D1) | **Disarm 断招**: the first arrow breaks the foe's wind-up (its attack is cancelled), the next two hit it as it reels |
| F10 Rain of Arrows | the rain follows one foe | change (D1) | **Sky Bolt 天坠**: no rain; 1.5 s later one giant arrow drops on the spot, hardest at the centre. Aim where the foe will be |
| F11 Burst Arrow | sticks in a foe, bursts inside | change (D2) | **Remote fuse 遥爆**: it sticks and waits up to 4 s; press again to set it off. Each of her arrows that hits that foe first makes the burst bigger |
| F12 Whirl Shot | twelve arrows curve onto one foe | change (D1) | **Shoot-down 拦截**: the twelve arrows hunt foes' shots in flight within 5 u; each shot stopped sends an arrow back at its shooter |
| F13 Ricochet | hops between one foe and the floor | change (D1) | **Bank shot 折射**: it bounces off walls and pillars, not foes, up to four times, harder each bounce; aim it round cover |
| F14 Tornado Shot | wraps one foe, held 1.5 s | change (D1, D4) | **Wind lane 风道**: the twister lies down as a straight lane from her to the spot for 3 s; her arrows along it fly twice as fast and hit 30% harder; foes' shots in it are blown back |
| F15 Briar Trap | one jaw holds one foe; arrows on it are sure crits | change (D4) | **Tripwire 绊线**: a wire 4 u long between two arrows; up to five foes that cross it trip and are stunned |
| F16 Arrowstorm | the curtain closes into a column on one spot | keep (or change) | the one "rain on a spot" form left. If Kesh wants both 箭雨 skills changed, F16 could become **Wind-read 读风**: each rank falls only on foes still moving |
| F17 Feather Fan | all five into one foe | change (D1) | **Counter 反射**: for 0.6 s she watches; a hit that would land on her she slips, and shoots one full-draw arrow back at that foe |
| F18 Vault Shot | longer flip, the arrow is a drawn shot | change (D6) | **Hang time 滞空**: she hangs at the top 0.6 s while the world slows for her aim, then one drawn shot |
| F19 Crescent Kick | shoots the launched foe three times before it lands | keep | skeet shooting |
| F20 Windknot | draws the foes into one row along her aim | keep | lines them up for a piercing shot |
| F21 Cyclone Kick | three kicks and three shots on one foe | change (D1) | **Back line 点后排**: each spin shoots the foe farthest from her within 7 u, the shooters behind the pack |
| F22 Bow Sweep | paw-driven arrow, defence 30% lower for the team | keep | the one defence-break form |
| F23 Windrun | next arrow skill 30% more, a tap is a full draw | keep | the one "charge up the next skill" form (see X5) |
| F24 Eagle Dive | all five into one foe, a drawn shot from the air | change (D1, D6) | **Perch 栖高**: she stays up 2 s and lobs drawn shots over the front line at the foe under the pointer |

The Deadeye Gale Arrow (stops in the first foe, ignores defence) can stay: it is the passive's
shape, not a skill, and with F1 and F11 changed only F8 shares "stops in a foe".

## 3. Volley 万箭

**Repeated ideas:**
- **V1. Just more arrows** (8): F4, F6, F9, F17, F18, F21, F24, and F12's second ring.
- **V2. A second pass** (2): F12 (ring the other way), F16 (out and back).
- **V3. A line that keeps hurting** (3): F2 (cutting trail), F8 (rain along its line), F23 (rain
  along her trail).
- **V4. Splits** (4): F1, F8, F13 and the Volley Gale Arrow.
- **V5. Wider** copies T11 Wide Sky: F10 (2.2 u) and F14 (3 u). F10 and F14 also both drift.

| # | Now | Verdict | Suggested 特点 |
|---|---|---|---|
| F1 Piercing Shot | each foe it passes sheds two side arrows | keep | shed feathers |
| F2 Power Shot | no fall-off, its trail cuts 2 s | keep | the one cutting lane |
| F3 Hunter's Mark | marks every foe within 2 u | keep | spread mark |
| F4 Pinning Arrow | three arrows in a fan | change (V1) | **Net 网矢**: it opens over the foe into a net 2 u wide: all under it stunned briefly and slowed |
| F5 Rapid Fire | the stream sweeps across 90° | keep | scythe sweep |
| F6 Kill Shot | three arrows, same rule | change (V1) | **Cull 清点**: one arrow to every foe under 30% within 6 u |
| F7 Eagle Stance | each shot falls as a burst at the pointer | keep | mortar |
| F8 Skypiercer | pulls foes onto the line, rains along it | change (V3, V4) | **Wind wall 风墙**: the drill stands up as a wall of wind along its line for 3 s; foes cannot cross it and take damage while they touch it |
| F9 Volley | five arrows, each through one foe | keep | the one plain "more arrows" form |
| F10 Rain of Arrows | 2.2 u wide, creeps to the pointer | keep, drop the width (V5) | a rain she steers |
| F11 Burst Arrow | each shard bursts again | keep | cluster bursts |
| F12 Whirl Shot | a second ring the other way | change (V1, V2) | **Shock ring 波环**: the ring rolls outward to 6 u, hitting each foe as it passes |
| F13 Ricochet | splits in two on its third hit | keep | the branching chain |
| F14 Tornado Shot | 3 u wide, drifts to the pack | change (V5) | **Twin twisters 双旋**: two twisters circle each other and fling the foes between them |
| F15 Briar Trap | three small traps in a row | keep | minefield |
| F16 Arrowstorm | sweeps out and comes back | keep | out and back |
| F17 Feather Fan | nine arrows across 150° | change (V1) | **Boomerang 回旋羽**: the feathers fly out 4 u and curve back to her, hitting both ways |
| F18 Vault Shot | three arrows to three foes | change (V1) | **Parting gift 留矢**: from the air she drops a rain of arrows on the spot she left, for whoever chased her |
| F19 Crescent Kick | throws a crescent of wind 4 u | keep | wind wave |
| F20 Windknot | pulls from 5.5 u, holds 0.6 s | change (just bigger) | **Two knots 双结**: a second knot at the pointer; the two packs are dragged into each other and collide |
| F21 Cyclone Kick | each spin a ring of six arrows | change (V1, same as base F12) | **Saw discs 旋刃**: each spin throws one spinning feather disc that skims 5 u and cuts every foe it passes |
| F22 Bow Sweep | full circles, the arrow flies on 4 u | keep | sweep all round |
| F23 Windrun | arrows rain along her trail | change (V3) | **Wind shades 风影**: two wind copies of her run beside her and shoot when she shoots, for half |
| F24 Eagle Dive | ten arrows, a ring on landing | change (V1) | **Fountain 箭泉**: the landing leaves a crater that sprays arrows up and out for 1.5 s |

## 4. Gale 弓斗

**Repeated ideas:**
- **G1. The skill moves onto her own body** (5): F10 (rain round her), F14 (twister round her), F15
  (trap under her feet), F16 (ring closes on her), F20 (knot centred on her). T15 Hurricane Dance and
  F7's 霹雳舞 also pull foes to her.
- **G2. A strike, then a point-blank arrow** (7): F1, F2, F4, F6, F9, F18, F22. This is the style
  itself, so most keep it; each needs a different strike *and* a different result, not only a
  different strike.
- **G3. A second bounce or dive** (2): F13 (springs off foes), F24 (bounces into a second dive).
- **G4. A low sweep** (2): F9, F20.
- **G5. "Do it again"** (2): F17 (fans again behind), F22 (one more strike).

| # | Now | Verdict | Suggested 特点 |
|---|---|---|---|
| F1 Piercing Shot | back kick, then the arrow point-blank | change (G2) | **Chase 追射**: the back kick sends the foe flying 3 u; the arrow chases it and nails it where it stops |
| F2 Power Shot | paw on the chest, springs back 2 u, hip shot | keep | the escape kick (could be untouchable in the spring) |
| F3 Hunter's Mark | an axe kick marks; close hits make it last | keep | a mark fed by melee |
| F4 Pinning Arrow | hooks the neck, throws it down, shoots it on the floor | keep | the throw and ground shot |
| F5 Rapid Fire | fourteen hip shots at full run | keep | running gun circle |
| F6 Kill Shot | flying knee, then the arrow under the chin | keep | the finisher |
| F7 Eagle Stance | 霹雳舞: drag in, kick out, drag again | keep | Kesh's own |
| F8 Skypiercer | she rides it, a spinning flying kick 6 u | keep | rides the arrow |
| F9 Volley | low sweep trips, three arrows point-blank | keep | the one trip |
| F10 Rain of Arrows | falls round her and follows her | change (G1) | **Rain dance 雨舞**: she kicks the rain's arrows out of the floor as they land; each kick fires one at a foe within 3 u |
| F11 Burst Arrow | stamps it in, backflips off the blast | keep | blast jump |
| F12 Whirl Shot | a roundhouse kick first that pulls foes in | keep | the pull kick |
| F13 Ricochet | she is the ricochet, a kick on each foe | keep | foe hopping |
| F14 Tornado Shot | the whirlwind is round her and shoots with her | keep | the one "zone on her" form |
| F15 Briar Trap | springs under her own feet as she hops | change (G1) | **Snare kick 踢阱**: she kicks the trap into the pack like a ball; it snaps where it hits |
| F16 Arrowstorm | a ring falls round her and drives foes to her feet | change (G1) | **Cage 箭笼**: the arrows fall as a fence round the pack and stand 3 s; she leaps in and fights them inside it |
| F17 Feather Fan | turns and fans again behind | change (G5) | **Kick fan 踢扇**: she kicks the five arrows off the string; each kicked arrow knocks its foe back |
| F18 Vault Shot | kicks off the foe's face and flips back, shooting | keep | uses the foe as a step |
| F19 Crescent Kick | a second flip kick spikes it down | keep | the spike |
| F20 Windknot | centred on her, ends in a low sweep | change (G1, G4) | **Rope swing 绕柱**: the wind ribbon ties to the centre foe; she swings round it at full stretch, kicking every foe in the circle |
| F21 Cyclone Kick | travels 3 u, a fourth spin launches | keep | the travelling spin |
| F22 Bow Sweep | a third strike and a rising kick | keep | the rising launch |
| F23 Windrun | each foe she runs through is kicked | keep | run-through kicks |
| F24 Eagle Dive | bounces into a second dive | change (G3) | **Meteor 流星**: at the top she grabs the nearest foe and drives it down head first (a boss is never grabbed: 20% more instead, W9) |

## 5. Base pool

These are the passed base skills, so they only need a nudge, not a new idea:

- **B1. Two fans.** Volley 散矢 (three arrows, 4.8 u) and Feather Fan 羽扇 (five arrows, 3.2 u,
  then a dart). Suggest a wider gap: Volley a long narrow fan, Feather Fan a point-blank wide spray
  that she darts out of.
- **B2. Four long piercing arrows.** Piercing Shot, Power Shot, Skypiercer and the Gale Arrow all
  fly a line through foes. They differ by speed, draw and carry, which is enough if the page makes
  that plain: Piercing fast and thin, Power slow and heavy, Skypiercer a carrying drill.
- **B3. Three backflips.** The dash somersault, Vault Shot and Crescent Kick all flip back and shoot.
  Vault is the escape, Crescent the launch. On the page their flips should read different (Vault
  low and long, Crescent tall and in place).
- **B4. Two pulls.** Windknot and Tornado Shot both pull a pack to a point; combos C1 and C6 treat
  them as one thing. Windknot is the instant gather, Tornado the lasting zone that shoots. Fine as
  roles.
- **B5. Spins.** Whirl Shot, Cyclone Kick, T15 Hurricane Dance and Gale F7 all spin. Fine as long as
  the spins look different.
- **B6. Two run boosts.** Feather Fan's 30% run and Windrun. Small; Feather Fan's could go.

## 6. Talents and combos that copy a form

- **X1.** Deadeye Kill Shot copies T7 Through the Heart (fixed above by Execute).
- **X2.** Volley Rain of Arrows and Tornado Shot widths copy T11 Wide Sky (fixed above).
- **X3.** Sure crits: Deadeye Pinning Arrow, Deadeye Briar Trap, T13. After the fix only Pinning
  Arrow and T13.
- **X4.** Defence: Deadeye Power Shot, the Gale Arrow, T13, Deadeye Bow Sweep. After the fix only the
  Gale Arrow, T13 and Bow Sweep's team 减防.
- **X5.** "The next arrow is a full draw and 30% more": Deadeye Windrun and T9 Slipstream give the
  same reward from different triggers. Suggest T9 gives something else (for example: the arrow after
  a kick is shot at once and pierces one more foe).
- **X6.** T15 Hurricane Dance (pull all to her, spiral of arrows, axe kick) overlaps Gale Tornado
  Shot and Gale F7. Suggest T15 throws foes outward instead (a cyclone that flings).

## 7. What it means for the page

33 forms change (Deadeye 15, Volley 11, Gale 7). Each needs a new card once Kesh picks. The kept
forms and the base cards stay as passed.
