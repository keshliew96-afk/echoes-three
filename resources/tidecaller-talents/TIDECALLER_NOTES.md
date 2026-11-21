# Tide Caller: design notes

**Version 2.1, 2026-11-21. Design only.** The details behind `TIDECALLER_KIT.md` (lines R, T,
F, C). Every line here has a number. All numbers are first guesses until measured in play.

## 1. The ask and how I read it

- **N1.** Kesh, 2026-11-19 00:02 and 00:03 Singapore time, before he slept: "can you
  continuously complete the goal, which run audit and review and make it insanely detailed,
  until it have score 9 out of 10", and "You can also work at other hero, if there is any
  changes, I will give feedback tomorrow". The Tide Caller is the next hero after Duskwing.
- **N2. Her styles.** In kits 1.0 to 1.9 the three styles were mine (Jet, Surge, Bubble); he
  picked them on 19 Nov and passed the page. On 20 Nov he asked for more: "as a mage and sea
  and water element design character, i expecting tide caller is a massive aoe mage", with
  Bubble kept. From a list of five he picked Flood and Tsunami (kit section 5). Kit 2.0 is
  that pick.
- **N3. Where the three styles come from.** Each grows out of something he already passed or
  that is in the game:
  - Flood 涨潮: her water on the floor: the dash's wet path (passed), Home Waters, Call the
    Tide.
  - Tsunami 海啸: her tsunami (his basic attack ask of 13 Nov and his drawing of it), and the
    Surge forms he passed on the page.
  - Bubble 泡沫: Bubble Ward, the one skill she has today that helps a friend.
  They also follow the template's pattern: ground (the floor becomes her weapon), weight (few
  big waves), conversion (her water becomes protection).
- **N4. Pattern taken from Windbriar and Duskwing:** one pool of 26, a base form for each
  skill, and the tier I talent re-shapes every skill (72 forms on 24 skills). The kit's layout
  follows Windbriar 2.5: short cells that open with the 特点, whole rules in the notes.
- **N5. His newest rule** (Windbriar, 18 Nov 23:53): every skill and every form has its own
  特点. The check is `TIDECALLER_SAMENESS_AUDIT.md`; what a fresh judge found, and what was
  redone, is in `TIDECALLER_REVIEW_LOG.md`.
- **N6. Kept from the game:** ten of the eleven skills she has today, with today's numbers.
  Undertow is dropped on his mark of 19 Nov; Call the Tide stands in its place (N94).
  Ripple Step is re-shaped on his mark of 19 Nov: three steps in place of one vault (N94). Soaked and Crash are today's rules. Her eight nodes, two relics
  and two deeds are not touched (N101).
- **N7. Kept from her model page (passed 13 Nov):** the held stream, the tsunami after 5 s with
  its fixed 1.3 u width, the two kinds of cast (the full staff motion, and the left paw while
  the stream runs), the tide-ride dash at tsunami height with its slowing wet path, the belly
  slide.
- **N8. Her place in the team.** She is the wide one: her casts cover the room. Flood makes
  the floor hers, Tsunami moves the whole pack so the other heroes' skills land, and Bubble
  guards them. Mosslight has no shield and Stonehide gives himself none, so bubbles do not
  repeat anyone. What she gives up is the single target: no style of hers is a boss path
  (N114).
- **N9. No heal** (the Healer stays the healer). Lifebubble (T15) holds a friend at 1 health and
  gives a bubble; it does not heal.

## 2. Kit rules

- **N10. Soaked 浸湿** (R5; Kesh's pick 2a of 19 Nov: "make more use of the soak, and make
  elite and boss can be soaked, but elite at lower value, boss no value only get the status,
  i want all skill to have interaction with soaked status"). 4 s, started again by each new
  soak.
  - Small foe: 15% slower (today's), and it slides 滑: her pushes, pulls and throws move it
    50% farther.
  - Elite and champion: 8% slower, 25% farther (a champion is pushed half as far first, R13).
  - Boss: the status only: no slow, never moved. It is there so that Crash and the 湿 lines
    work on a boss.
  - I read "value" as the soak's own effects (the slow and the slide). A Crash keeps its 60%
    on every foe.
  - A fixed path does not stretch (the list in N34). With Wide Water (T11) the two add: 90%.
  - A soaked foe's hits take only half from a bubble (an elite's or champion's three
    quarters; a boss's all).
  - A Frozen elite still cannot be soaked (today's affix rule).
- **N11. The three tags.** Every pressed skill has at least one; the table in section 12
  shows every skill and form.
  - 【浸】 soaks: Riverbolt, Water Whip, Skipping Stone, Spray, Tide Orb, Whirlpool, Sky Fall
    (foes under it), Wave Rider, Ripple Step's ripples and puddles, Bubble Ward's
    pop (every bubble's pop), Rain Squall, Geyser, Water Prison's pop, Otter Dive's splash,
    River's Gift, the Tidal Dome, Tidepool, the tsunami (after its Crash), the wet path of
    the dash, and all her water (R12). The stream does not soak, so the basic attack never
    does the whole job.
  - 【拍】 Crash: N12.
  - 【湿】 more on a soaked foe, and the soak stays: Riverbolt (goes on through it), Water Whip
    (it lands flat), Skipping Stone (one more skip), Spray (drenched), Geyser (twice as
    high), Home Waters (wet footprints). Also the slide and the bubble rule of N10, which
    every style feels without a skill.
  - Whirlpool soaks a foe again at once after a Crash; the rain's soak lasts 8 s.
- **N12. What Crashes.** Twelve skills of 24: Torrent, Tide Orb's burst, Depth Charge, Call the Tide,
  Floodgate, Breaker, Crashing Wave, Sky Fall's drop, Clapping Waves, Maelstrom, Water
  Prison's pop, the Tidal Dome's end. Three are big. The tsunami Crashes too, so the basic
  attack pays off a soak in every style. A Crash
  deals its damage first and spends the soak after; a skill that both Crashes and soaks
  (the tsunami, Water Prison's pop) soaks after the Crash.
- **N13. The Crash by style** (R5). Flood: a puddle of still water, 1.2 u, 4 s, under each
  foe the cast crashed that stands on dry floor (none under a foe already in her water);
  puddles that touch are one piece, so a Crash on a pack leaves one pool under it, and all
  the puddles of one cast are one part for N20's cap. Each rises from under the foe in 0.3 s
  as the Crash's water falls back. Tsunami: the splash soaks the other
  foes within 1.5 u (not the foes that cast crashed), so the next Crash has targets. Bubble: an 8 bubble for 4 s on the friend
  nearest the crashed foe within 5 u, or on her; by D33 a new one replaces the old one, it
  does not grow.
- **N14. The stream.** 3 each 0.2 s, 4.5 u, stops at the first foe. It turns with the pointer
  at 360° a second. It is 常规直伤: every tick is a hit.
- **N15. The tsunami.** After 5 s of stream she stops for the heave (1.6 s; the wave leaves at
  0.68 s): 28, 1.3 u wide, 6 u, knocked back 1 u, soaked. The count runs on through a left-paw
  cast, pauses while attack is let go for up to 1.5 s, then empties. A dash in the wind-up keeps
  the count (as passed).
- **N16. Two paws** (R8). With attack held, a skill is cast by the left paw and the staff keeps
  shooting. With attack not held, the same skill uses its full staff motion. Both do the same
  thing. The big skills (Floodgate, Maelstrom, Tidal Dome) and the moves that carry her (Wave
  Rider, Otter Dive, Ripple Step, the dash) take her whole body: they pause the stream and keep
  its count. One Bubble form is made with the stream and does not pause it: the Bubble
  flail.
- **N17. Slam 拍岸** (R9). 附加伤害, never a hit. One rule for every skill and form.
  - Into a wall or pillar: 10 and a 0.5 s stun. It needs 1 u of travel.
  - Into another foe: 6 to both, no stun.
  - A foe is slammed at most once a second, whatever slams it.
  - Only a throw, a push or a carry that ends can Slam. The rain itself never does, and the waves of Call the
    Tide do not move a foe (its Tsunami form throws, and can). The Spouts' drop is a throw.
  - Walls: room walls, pillars, Stonehide's slab and Stone Ring, the Pinball dome's skin, and
    the floor under Slam down. Her Sky Fall is water: foes pass through it.
  - Windbriar's Wall slam (her combo C2) is the same wall rule; her kicked foes do not hurt
    other foes.
- **N18. Held 浮空** (R10). A foe that is afloat (in a bubble, or launched), carried (the Pick-up, the Bubble wave, the Tow, a Spout, the Whip wave, the Pond clap, the
  Spreading ring, the Tsunami basic wave), sunk (the Sink)
  or swallowed (the Abyss)
  cannot act and keeps its target. Everyone can hit it. Afloat, it hangs 0.6 u up, turning
  slowly; for Duskwing it counts as stunned.
  - The cap: no hold lasts over 2 s on a small foe, 1 s on an elite. When a hold ends, that
    foe cannot be held again for 2 s (it can still be pushed, thrown and Slammed).
  - A launch (Geyser, the Blowout, the Fall slam, Otter Dive's breach) is
    under 1.3 s, but for the base Geyser's 1.6 s on a soaked foe; the Blowout's is 0.8 s for every foe. The foe is afloat (T3 counts it) but it is not a hold for the cap.
  - A current is not a hold: a foe in the Canal is slid along and still acts.
  - Stuns and knock-flats are under the formula's stun guard (D38); the end of a hold starts
    that guard too, so a hold cannot be chained into a stun.
- **N19. Bubbles** (R11). A shield, one layer for each skill (formula D33): the same skill on
  the same friend replaces its layer with the larger one and starts its time again. Bubbles can
  crit as shields do (D30). The pop soaks within 1 u; under T3 it also deals 6 within 1.5 u. A
  bubble that is replaced does not pop.
- **N20. Her water** (R12). The wet path, puddles, ponds, pools, canals, rain, wet footprints
  and the dome's floor. Each is drawn as a wet floor with a pale foam edge, so the player can
  see where Home Waters, the Water door, Call the Tide, the Flood forms and the combos C2,
  C4, C9 and C10 work.
  - **It soaks.** A foe standing in any of her water is soaked each second.
  - **One piece 一片.** Water that touches is one piece: its foam edges open and it is drawn
    as one shape. Each part keeps its own time; when a part dries the piece can fall apart
    again. "A piece" in a form's rule is the whole joined shape.
  - **Still water 静水** is what the Flood forms lay, and Flood's basic attack, dash and Crash.
    It soaks and does nothing else: no damage, no slow but the soak's. 6 s unless its line
    says another time. A part 块 is one thing she laid: a pond, a canal, a road, a rim, the puddles
    of one Crash. At most 12 parts lie at once; past that the smallest dries first.
  - **Time.** Nothing lifts a part above the time it was laid with: Call the Tide's 2 s and
    Meeting Waters top a part up, never past that time. In its last 0.6 s a part's foam edge
    runs inward and the floor is left dark for 1 s.
  - **Joining.** Where new water touches old, the two foam edges open in 0.3 s and one ripple
    crosses the join.
  - **Sizes.** "Wide" is across. "Within", "out to" and "farther out" are from the centre.
  - Water with its own rule keeps it inside a piece: the Whirlpool still drags only in its own
    circle, a Ripple Step puddle still ticks only on itself.
  - Water can be moved for a moment (the Pond clap folds it in and it runs back) or spent
    (the Drain); the rain, the dome and a Whirlpool cannot. No other form takes water away.
- **N21. Who is moved** (R13).
  - Small foes and elites are pushed, thrown, carried, swallowed, lifted and sealed; an elite
    is held for half the time.
  - A champion is pushed and thrown half as far, and is never carried, swallowed, lifted,
    sealed or swapped. Where a form would only do one of those to it, that form's hit deals
    10% more to it instead (增伤区).
  - A boss is never moved: that hit deals 20% more (formula pick 13a).
  - A taunted foe moves and then walks back to the tank.
  - "Small foes" in the kit's short cells means small foes and elites.
- **N22. Holds, drawn lines, second presses, the pad.**
  - Held skills: Tide Orb; Depth Charge (the base, the Sleeper and the Raft; Slam down has no
    hold); Otter Dive.
  - Drawn with the pointer: Otter Dive under Tsunami (the Round-up ring); Tide Orb under Flood
    (Paint). Drawn with her own ride: Wave Rider under Flood (the Bow wave).
  - Second presses: Sky Fall's drop (every form); Wave Rider under Tsunami (the Crest); Ripple
    Step (its second and third steps); Water Prison under Tsunami (to throw the Tow);
    Whirlpool under Tsunami (to spit the Abyss out).
  - On a pad the pointer is the aim stick's reticle, which reaches 6 u from her. "The foe
    nearest the pointer" is the foe nearest the reticle; a drawn line is drawn with the stick;
    a skill on a friend takes the friend nearest the reticle. The Water door's reticle jumps
    to her water.
  - In co-op a timed press (the Crest) is judged on her own screen.
- **N23. Friends.** "Friend" means another hero, a player or an AI seat. Aim rule: audit G13.
  No skill of hers moves a friend (N98).

## 3. Talents in full

### Tier I, Style (free)

- **N24. T1 Overflow 水漫 (Flood).** Every skill takes its Flood form. When a skill of hers hits
  a foe that stands in her water, the hit runs through that piece: every other foe standing
  in it takes half of that hit.
  - The spread is 附加伤害: not a hit, so it never Crashes and never spreads again.
  - A foe takes one spread from a cast, the largest; a foe the cast hit itself takes none.
  - Zone ticks (the rain, the Whirlpool, puddles) do not spread. A lasting skill (the Hanging
    rain's needles, the Tide Orb's ticks) spreads at most once a second.
  - The stream is not a skill and does not spread (Shared water on herself makes one tick a second a small Crash).
  - A form that already reaches through her water (the Dunk and the Blowout within 3 u,
    the Plunge pool, the Spreading ring, the Stir) spreads only to the foes of that piece it did not
    reach itself.
  - The trade: on dry floor she is the base kit. Her first casts in a fight lay water; her
    later ones pay. On one foe alone she gains nothing.
- **N25. T2 Swell 蓄潮 (Tsunami).** Every skill takes its Tsunami form. Each skill she casts
  adds one Swell, up to 3; the basic attack and the dash add none. At 3 the Swell is full
  满潮, and the next skill she casts spends it. A full cast:
  - is twice the size: the reach, width and radius of every wave, ring, fall, pool, orb and
    dome in it. Never a time, never a count;
  - deals 30% more (增伤区);
  - pushes, throws and carries twice as far (the slide and Wide Water then apply). It does
    not cross the room: only the Great Wave does;
  - on a friend (Bubble Ward, River's Gift): the bubble is twice as large, or the gift lasts
    twice as long.
  A full cast adds no Swell: the count starts again at 0. Swell is kept between rooms. Shown:
  three wave marks rise behind her feet, one a cast; at full, the water round her draws back
  from her in a ring, as the sea does before a tsunami, and stays drawn back until she casts.
  The trade: three casts in four are plain, and her waves scatter what they do not Slam.
- **N26. T3 Bubble Blower 吹泡泡 (Bubble).** Every skill takes its Bubble form. A foe afloat
  takes 20% more from everyone (易伤). Every bubble that pops, a friend's or a foe's, deals 6
  within 1.5 u (附加伤害) and soaks; a foe takes this at most once a second. The trade: her own
  damage is the lowest of the three.

### Tier II, Power (20 Embers)

- **N27. T4 Deep Water 深水.** A foe standing in her water takes 20% more from her skills, her
  stream and her water's own ticks (增伤区). A boss counts. It is read when the hit lands; a
  zone locks it at its cast (D26).
- **N28. T5 Heavy Swell 重浪.** A skill that pushes, pulls, throws, carries or launches deals
  25% more to the foes it moves (增伤区). A boss counts as moved. Slam is doubled: 20 on a
  wall, 12 foe on foe (in kits 1.0 to 1.9 that was Rolling Tide's).
- **N29. T6 Surface Tension 张力.** Every skill she casts leaves a 4 bubble on her for 3 s (one
  layer: a new one replaces it, D33). Her bubbles are 30% larger (护盾加成区). A friend with
  one of her bubbles deals 15% more (增伤区); she counts as a friend.

### Tier III, Trick (40 Embers)

- **N30. T7 Meeting Waters 汇流.** When a cast of hers joins two pieces of her water that
  were apart, each at least 1 s old, the new piece surges: 16 to every foe standing in it, soaks, and every
  part of the new piece is topped up 2 s, never above the time it was laid with.
  常规直伤, area; not a Crash. A piece surges once in 3 s. Water laid on top of her water is not a
  joining; wet footprints and water that only moves (the Pond clap) never fire it; a piece that
  fell apart and is joined again by a cast does. It works with base water alone: the wet path into a
  puddle, a Ripple Step puddle into the rain.
- **N31. T8 Backwash 回潮.** Only after a push or a throw that leaves the foe 1.5 u or more
  farther from her than it was (measured from where the push began; a cast with several pushes is
  judged on the whole move): 1.5 s later a thin sheet of water runs back the way it came
  and the foe is dragged 60% of the way back and soaked. Never after a pull, a gather, a
  carry or a launch, so it does not undo the Drag-in, the Abyss, the Whip wave or the
  Round-up. It can Slam on the way back (N17's once a second holds). A drag back never starts
  another Backwash.
- **N32. T9 Chain Pop 连环泡.** A Crash lifts each soaked foe it crashes in a small bubble for
  0.6 s (the lift comes after the Crash's damage). When any bubble of hers pops (a small one,
  a friend's, a prison), each foe within its pop that was already soaked before the pop is
  lifted the same way. A foe is lifted this way once every 3 s (N18's cap also holds). On a
  champion or a boss: nothing.

### Tier IV, Reach (60 Embers)

- **N33. T10 Floodplain 泛滥.** Her water on the floor is 40% wider when it is laid: the wet
  path, puddles, ponds, pools, canals, the rain's circle and the Whirlpool. The dome is not.
- **N34. T11 Wide Water 浩荡.** Waves, rings and waterfalls are 30% wider: the tsunami, Breaker,
  Crashing Wave, Call the Tide's waves, Sky Fall, Clapping Waves, the Great Wave. Her pushes,
  pulls and throws move the foe 40% farther (in kits 1.0 to 1.9 that was Rolling Tide's). A
  path with a fixed end is not changed: the Conveyor's spots, the Tow's rope, the Round-up,
  the Spouts, the Whip wave's arc, the Pond clap's slide. The Tow's throw is a throw.
- **N35. T12 Deep Breath 长息.** The wet path, puddles, pools, rain, bubbles and the
  dome last 30% longer. Holds on foes do not (N18's cap).

### Tier V, Capstone (80 Embers)

- **N36. T13 The Sea 沧海.** Every eighth skill she casts floods the room: for 6 s the whole
  floor is her water, one piece, still water. Everything that reads her water reads the
  room: Overflow, Deep Water, Call the Tide, Home Waters, the Water door, the combos. It is a layer on top: her
  other water goes on under it and is there when it drains, and every skill that lays water
  lays its part beneath as if on dry floor. A form that asks for a foe outside her water (the
  Sweep-in) finds none, so in The Sea the Sweep-in washes its foes 2.5 u toward the pointer. Casts made during the flood do
  not count toward the next. The count is kept between rooms. Meeting Waters does not fire
  when the flood comes or goes. The Drain counts the flood as five parts and does not end it. Nothing lengthens
  the flood.
- **N37. T14 Great Wave 巨浪.** Every third cast that crashes at least one soaked foe: the sea
  rises behind her and one wave crosses the whole room along her aim: 24 to every foe, carried
  3 u, soaked. The wave is not a Crash and does not count toward the next. (Named Great Wave so
  that it is not mixed up with the basic attack's tsunami.)
- **N38. T15 Lifebubble 救生泡.** A hit that would down a friend or her instead leaves them at 1
  health inside a great bubble: untouchable 2 s, then a 30 bubble for 4 s. The great bubble
  pops: 30 within 3 u, launched 1 s. One clock for the team: 40 s.

### Checks

- **N39. Every talent works alone.** T1 to T3 need nothing. T4, T7 and T10 read her water,
  which every style lays (the wet path, Ripple Step's puddles, the rain, the Whirlpool, Home
  Waters' footprints). T13 counts casts. T5, T8, T11 and T14 read moves and Crashes, which the
  base tsunami and base skills give. T6 brings its own bubble (every cast), T9 starts from any
  Crash, and T12 always has the wet path of the dash to lengthen. No talent needs a certain
  skill, and none needs another talent: nothing reads Swell but T2.
- **N40. Tier jobs.** No two talents of one tier push the same lever: II is three damage
  conditions (in her water, moved, bubbled); IV is the width of floor water, the width of
  waves with the length of pushes, and time; V is the room as her water, the room as one
  wave, and a friend saved.
- **N41. Budget** (docs/TALENTS.md: tier I about 20% more output in its style, one whole path
  about 50%, no mix above 70%). Not measured: paper only.
  - T1: nothing on dry floor. On a pack of six standing in one piece, a cast that hits three
    gives half again to the other three: about 50% more on that cast. With water under the
    pack half the time: about 20 to 25%.
  - T2: every fourth cast is 30% stronger and twice the size: about 8% more on one foe, and
    about twice the foes on that cast in a room.
  - T4: 20% on every foe in her water, a boss too. With T1 the two multiply in a room.
  - T13 with T1: for 6 s half of every skill hit lands on every foe in the room. This is the
    largest number in the kit and the first to cut (The Sea's 6 s, or Overflow's half).
  - T5's doubled Slam: a wall Slam goes from 10 to 20, foe on foe 12, each foe at most once
    a second (R9). In a room with walls about 20%.
  - Flood's whole path is over 50% in a full room on paper. Tsunami's path is the old Surge
    path with Swell in place of the longer push.
- **N42a. Three example builds** (four skills each, to see the styles play).
  - Flood: Floodgate (Open the gate), Riverbolt (Pond-maker), Call the Tide (Tide on tide),
    Depth Charge (Sleeper). The loop: open the gate, pond the gaps, call the tide every
    6 s so the edge creeps out and every second tide hits for 22, send a Sleeper under the
    water to the pack.
  - Tsunami: Spray (Drag-in), Crashing Wave (Three Crests), Sky Fall (Ring out), Maelstrom
    (the Fall slam). The loop: gather, three casts fill the Swell, and the fourth is the
    double one.
  - Bubble: Bubble Ward (it hops), Whirlpool (Steady water), Water Prison (Store the team's
    burst), Tidal Dome (Same boat). The loop: guard, lift, let the friends hit, pop.
- **N42. Mixes worth trying.** Flood style with the Great Wave (her Crashes leave puddles, and
  every third sends the room wave); Tsunami style with Deep Water and Floodplain (the dash's
  wet path and the rain are water enough for the 20%); Bubble style with The Sea (Bubbling up
  lifts the whole room, and the Water door goes anywhere).

## 4. The basic attack and the dash

- **N43. Base.** Today's Spit is 6 each 0.35 s (17 a second). The stream is 15 a second and the
  tsunami adds 28 each 6.6 s: about the same, with a wave. The tsunami is a Crash, then it
  soaks.
- **N44. Flood.** The stream and the tsunami as the base (the tsunami after 5 s). Where the
  stream ends, on a foe or on the floor at its reach, the water pools once the
  stream has stayed there 1 s: one puddle of still water that grows while she holds the stream
  on it, to 2 u in 2 s, and stays 4 s after the stream leaves it. One puddle at a time grows;
  it follows a foe that moves less than 1 u, and a stream that sweeps farther starts again and
  draws nothing (drawing water is the Paint's job). The look: the stream's end stops splashing
  and starts to fill; a round puddle rises under the foe's feet, its foam edge creeping out;
  the sound drops from a hiss to a pour. The
  tsunami leaves its whole path (6 u long, 1.3 u wide) as still water, 6 s. The page's miss
  rule of 20 Nov (a stream that ends in empty air droops and spills a puddle) is the same
  picture.
- **N45. Tsunami.** The tsunami comes after 3 s of stream (as passed for Surge) and is twice
  as wide: 2.6 u (the passed 1.3 u was his own correction for the base wave; the base keeps it). It carries
  small foes to its end (6 u) in 0.9 s (a carry, R10). The tell: in the last 0.3 s before it
  comes, the water at her feet draws back toward her, and the stream thins. The sound: the
  hiss stops, one deep breath in, then the roll and a long wash out. It is not a skill: it adds no Swell and a full Swell does not
  double it. Wide Water widens it. She streams little and heaves often: most of her basic
  output is the wave.
- **N46. Bubble.** The stream carries a string of bubbles, from the staff as passed: same
  damage and reach. A small foe hit by it for 2 s without a break floats 1 s.
  The tsunami is a roll of foam: it hits as the base and leaves a 10 bubble (4 s) on each
  friend it passes.
- **N47. The dash** is the passed one (the tide she rides is 0.95 u high, 1.17 u at the crest).
  The wet path lasts 3 s: 30% slower and soaked. Flood: the wet path as the base, and where
  she steps off the tide sinks into a pond of still water, 2.6 u wide, 8 s: her first water in
  every fight, and it lies under her own feet for a Spreading ring. The tide does not crash
  when she steps off: it lies down round her in 0.4 s, crest last, with a long soft pour. Tsunami: the tide does not sink when
  she steps off: it rolls on 5 u in 0.6 s, twice as wide (2.6 u): 10, pushed 1.5 u; she hops off its back
  as it leaves, and it breaks with one short crash. Bubble: the crest
  closes over her as a 10 bubble for 3 s.

## 5. Motions

- **N48. The bar** (Kesh's video refs for Ashfang, the same level here): every skill is a small
  choreography: a ready pose, the cast, a flourish, an end pose held a beat. She is a long,
  loose animal: her moves coil and uncoil, and water follows the tip of the staff like a ribbon.
- **N49. What her body can do** (rig facts from her model page): 21 bones, four in the tail, no
  knees, fingers that do not close, arms that reach about 0.19 on a body 0.4 wide. So the staff
  stays in the right paw, big sweeps come from turning the whole trunk, and the tail and the
  long spine do the acting. No move here needs two paws on the staff or a bent knee.
  Kesh's rule of 19 Nov: every hero's page gets knee bones from the shared `knees.js`
  (`/mnt/project-files/knees/KNEES.md`), bent in skill moves only. Her page adds them from the
  start; the motions here still work without a bent knee, and the page may add one.
- **N50. Her own gestures.**
  - The four casts she has (passed): Point, Bloom, Plant, Sweep, each as a full staff motion and
    as a left-paw gesture.
  - The heave: the staff hauled back over the shoulder, up on her toes, over and down (passed).
  - The tail slap: the tail cracks on the floor at the release of every heavy cast.
  - The coil: she winds her long body once round the upright staff, then unwinds into the cast.
  - The slide: flat on her belly, staff tucked (passed as Ripple Step; now Home Waters' slide).
  - The dive: a nose-first arc into the floor with a ring of water, and the breach back out.
  - The shake: after a big cast she shakes from nose to tail and drops fly. Her end pose.
  - The float: on her back on her own water, paws on her chest, for one beat.
  - Bubbles leave the staff's shell tip. Nothing is held in the left paw, lifted to her mouth
    or pressed with both paws: her arms are too short (N49).
- **N51. Length and the left paw.** Quick skills 0.4 to 0.8 s by the staff. The gesture named
  in each line below (Point, Bloom, Plant, Sweep) is also its left-paw version, a third
  shorter, used while the stream runs. Big skills and the moves that carry her have no
  left-paw version: they pause the stream (R8). Big ones 1.2 to 2 s. The dash cancels any beat.
- **N52. Looks.** Water is Deep Cobalt #3F7FE6, crests and foam Sea Foam #E6F3F7, spray dust
  River Pebble (her passed palette). Glows stay dim; shapes, rings and warnings at full
  strength. No Ember, no Violet, no Bright Heal on her water. Bubbles are clear with one Sea
  Foam rim light, so a friend inside stays readable.
- **N53. The styles' looks.** Flood: flat, wide and bright: the floor shines, every piece has
  a pale foam edge, and two pieces join with a soft run of water; lapping sounds. Tsunami:
  thick rolling fronts with a curling Sea Foam crest; the floor is left wet and flat; a low
  roar. Bubble: round, slow, wobbling; rim lights; soft plinks and one clean pop. No style
  draws a wall: water that stands tall falls from the sky. Nothing that rises from the floor
  and moves stands taller than her dash crest (1.17 u); only columns and sky falls are taller.
- **N53a. How to read the motions below (kit 2.2).** Each Flood segment and the four new
  Tsunami segments open with their times: wind-up, the release, recovery. The base's time in
  the bullet's head is the release. Each says how the water starts, how it ends and what the
  foes do. The basic attack and the dash: N44, N45, N47.

### Stream

- **N54. Riverbolt** (Point, 0.45 s; today's). A flick from the hip; a twisting bolt with a foam trail and a splash crown. Flood: (0.2 s wind-up, the release at 0.45 s, 0.3 s recovery.) The flick from the hip, the trunk a quarter turn behind it; the bolt is fat and heavy and wobbles like a water balloon, 0.3 s in the air at full reach. It bursts flat: a crown of drops no higher than a foe's knee, a ring of foam running out to 1.5 u in 0.2 s, and the water does not sink away: it settles into a round pond whose foam edge rocks twice and lies still by 0.6 s. Beside older water the two foam edges open in 0.3 s and one ripple crosses the join. She shakes one drop off the shell tip. Tsunami: (0.2 s wind-up, the release at 0.45 s, 0.3 s recovery.) The flick from the hip as the base; the bolt hits and does not just splash: the water it carried spreads sideways along the floor in a blink, a line 4 u wide, stands up in 0.15 s as a low curling front, rolls its 2 u in 0.4 s and breaks into foam. Seen from her it is a T: a thin bolt, then a wide wave across its end. She holds the flick's end a beat, staff level, then lets the tip drop. Bubble: it leaves the staff's shell tip as a wobbling bubble, bounces with a plink each time, and settles on a friend like a hat.
- **N55. Torrent** (Point, 0.44 s; passed). The staff levelled, a braced stance, a shock ring at the muzzle. Flood: (0.2 s wind-up, the jet at 0.44 s, 0.4 s recovery.) The braced stance and the jet as passed; the jet's line does not fall away: it lies down into the floor in 0.3 s as a straight channel with two foam banks, and streaks run down it away from her, fast. Foes in it stay on their feet and are slid backward, heels first, still swinging at whatever is near; where it ends the water piles up in a small boil and they bump into one heap. In its last 0.6 s the streaks slow, the banks run inward and the floor is left dark. She leans on the staff a beat and watches them go. Tsunami: the jet opens like a zip and two low waves peel the foes off to the sides. Bubble: the jet is wide and soft; each friend it passes through shakes like a wet dog and shines for a moment.
- **N56. Water Whip** (Sweep, 0.6 s). She coils round the staff and unwinds: a ribbon of water cracks out, wraps the foe's middle; she turns her whole body and the foe is carried over in an arc to the pointer. Flood: (0.25 s coil, the grab at 0.6 s, the throw 0.4 s in the air, 0.35 s recovery.) She coils round the staff and unwinds; the ribbon takes the foe by the middle and lifts it in one arc toward the pointer, over the heads of the others, and brings it down flat on the water like a belly flop. A crown of water jumps round the landing and runs out 3 u, stopping at the water's foam edge where the water is narrower; every foe in it rocks back a step. The ribbon lets go with a snap; her tail slaps the floor once. Tsunami: (0.25 s coil, the sweep 0.35 s, 0.4 s recovery.) She coils round the staff and unwinds through a half turn, the ribbon out flat at knee height. Under the ribbon's whole length a low crest stands up, from her feet to its tip, and sweeps the half circle with it like a windscreen wiper; the foes it takes ride its front, tumbling, and are left in one pile where the stroke ends. The crest falls flat there; the floor it crossed is wet and dark for a second. Her tail swings out the other way for balance. Bubble: the ribbon loops the friend once, becomes a bubble, and its free end cracks the foes off them like a tablecloth trick.
- **N57. Skipping Stone** (Point, 0.5 s). She flicks a flat disc of water off the staff's tip, low and side-on: four skips, each with a round splash and a plink higher than the last. Flood: (0.2 s wind-up, the release at 0.5 s, 0.3 s recovery; each hop 0.2 s.) The low side-arm flick as the base; on her water the stone does not go straight. It lands on a foe's head, kicks up a small crown, turns in the air and skips to the next, drawing a zigzag of rings over the water, each hop a hand higher than the last; the eighth lands with a taller crown and the stone is gone in it. Eight skips take 1.6 s. Her head follows it left and right, ears up. Tsunami: each crown tosses its foes in a low arc to the next crown. Bubble: each splash blows a slow bubble that drifts off looking for a foe.
- **N58. Spray** (Sweep, 0.4 s). She turns the staff so its shell tip faces flat, like a hose nozzle, and sweeps: a flat fan with a rainbow edge. Flood: (0.15 s wind-up, the fan at 0.4 s, 0.3 s recovery; the wash 0.5 s.) She turns the shell tip flat and sweeps low, like a yard broom, from her right to her left; the fan leaves the staff as the base, and under it a thin sheet of water no deeper than a toe runs over the floor toward her nearest water, taking each foe's feet with it. They ride it sitting, arms out, and stop at the water's foam edge with a small splash; the sheet runs into the pond and is gone. She ends with the staff out to her left and flicks it once. Tsunami: she flings the fan up and over; it lands behind the pack and washes back to her feet with the foes sliding on it. Bubble: suds stay on the floor; a foe that runs on them goes head over heels.
- **N59. Tide Orb** (Bloom, hold). A ball of water rises off the staff's shell tip; it follows the pointer like a balloon on a string, the left paw pointing the way. The burst is a round crown. Flood: (Bloom 0.3 s, held up to 3 s, the burst, 0.35 s recovery.) The orb rides low, its belly on the floor, and rolls like a wet brush at a walking pace: behind it a shining stroke with a foam edge, bending where she bends it. She steers with the left paw held out flat, moving it as if painting, her head tilted. Where the stroke meets itself the floor inside goes bright in 0.3 s, filling from the edge inward. The burst is the base's: a crown at the stroke's end; the stroke stays, and dries from its oldest end first. Tsunami: foes inside it turn over and over like washing; she throws it open. Bubble: the orb settles over the friend like a glass bell; foes that touch it are slapped by small tongues of water.
- **N60. Depth Charge** (Bloom then the heave, hold). Water gathers on the staff's tip into a ball as big as she is; she heaves it; it wobbles over the pack and drops with a deep thump and a column. Flood: (Bloom, held, the heave 0.3 s, 0.4 s recovery; the swim 6 u a second; the dome 0.25 s before it goes.) The heave as the base; the ball does not burst: it goes under with one fat ring and a dark round shadow runs under the water, a V of ripples over it, straight to its foe. One beat: the water over it domes up a hand high. Then a white column twice a foe's height, and a ring out to 2.5 u in 0.2 s. Waiting, the shadow lies still and breathes: a slow ring every second. She points the left paw the way it should swim. Tsunami: she stirs the staff's tip once: a small whirl pulls the foes into a knot; she points up and a waterfall drops on them and presses them flat. Bubble: the column settles into a quilt of bubbles; friends' feet sink a little into it and the fire under it shows through, harmless.
- **N61. Floodgate** (Plant, 2 s). She drives the staff into the floor and leans back on it, tail braced on the floor behind her: the floor cracks open in front and a river comes out as one beam. She turns by walking round the staff. End: the shake. Flood: (Plant 0.3 s, 2 s held, 0.5 s recovery.) She drives the staff in and leans back on it, tail braced, knees bent; the floor opens at its foot and the water comes out low and wide: a foam front 5 u wide that runs the 8 u in the 2 s, ankle-high, never taller. Each foe rocks back on its heels as the front passes under it and is not moved. At 2 s she pulls the staff out: the far edge sends one low ripple back over the whole sea to her feet in 0.4 s, and every foe standing in it is slapped off balance. Then it lies flat and bright, the foam edge lapping. She shakes from nose to tail. Tsunami: she flicks three balls of water off the staff's tip up over her shoulder; they hang in a row behind her; she plants the staff and all four fire: one wide river with the foes tumbling in it; she walks it round. Bubble: the planted staff's shell tip opens like a bubble wand; she puffs her cheeks and blows across it (no paw to her mouth): a rolling wave of bubbles pours down the line, the big ones swallowing foes and tumbling them along; at the end they pop in a row and the foes drop on their backs.

### Wave

- **N62. Breaker** (Plant, 0.5 s; today's). A hop, the staff's butt down; a ring of water breaks outward. Flood: (0.2 s hop, the butt down at 0.5 s, 0.4 s recovery; the ring runs 6 u a second.) The hop and the staff's butt down, as the base; the ring leaves her feet and keeps going: a low wave with a foam lip, no taller than her dash crest, running out over the water in every direction it lies, down a canal, round a bend. Each foe it meets sits down on its lip and rides it out backward. At the water's edge it jumps the bank, breaks on dry floor 1 u out and tips them off in a row. The water behind it rocks and lies still. Her tail slaps once; her ears flatten in the spray. Tsunami: the ring lifts her on its crest; she curls nose to tail, turns once in the air and lands flat on her belly in a second ring. Bubble: the stream wraps its foe in a bubble; she flicks the staff up and the bubble rides high on the stream like a ball on a fountain, then she brings the staff down and it slams where it stood, a ring of spray running out; three times; on the third it pops.
- **N63. Crashing Wave** (Sweep, 0.46 s; passed). The trunk turn and the curling wave. Flood: (0.2 s wind-up, the wave at 0.46 s, 0.4 s recovery; the wave runs 7 u a second.) The trunk turn as the base; over dry floor the wave would curl and die at 2.2 u. Over her water it lifts instead: the foam lip thickens, the front widens to 4 u, and the crest climbs a little every 2 u but never stands taller than her dash crest. The water ahead of it draws back to feed it and runs level again behind it within 0.5 s. Where the water ends it breaks: one heavy fall of foam on the bank. She follows it with the staff's tip, leaning into it. Tsunami: (0.2 s wind-up; the crests leave at 0.46 s, 0.86 s and 1.26 s; 0.5 s recovery.) One trunk turn throws the first: a low crest that dies at 2.2 u. Her tail slaps the floor and the second rises through its foam, taller, to 3.5 u. A second slap, the hardest, and the third, the tallest, runs to 5 u before it breaks. Each crest's foam is still on the floor when the next crosses it. She rocks back on her heels after the third and shakes. Bubble: the wave is all foam; foes come out of it with white beards over their eyes, swinging at nothing.
- **N64. Call the Tide** She lifts the left paw slowly, palm up, as if raising the sea on a string: every wet patch on the floor swells, stands up as a small wave and breaks where it stands; a ring of tide rises round her feet. Flood: (Bloom, the left paw, 0.7 s; the waves break at 0.7 s; 0.4 s recovery.) The left paw lifts slowly, palm up, as the base; every piece swells in the middle and breaks outward, not straight up: its foam edge runs 1 u up the dry floor in 0.3 s like a tide coming in and stays there, the new rim darker for a moment. The second cast lifts her onto her toes: the swell is half again as tall and the edge runs out again. Her whiskers shake as the paw comes down. Tsunami: the left paw sweeps to the pointer: every wave leans that way as it breaks and flings its foes toward the spot. Bubble: the left paw wiggles upward: the wet patches fizz like soda and bubbles rise under everyone standing in them: foes go up, friends are wrapped.
- **N65. Whirlpool** (Plant, 0.4 s; passed). Spiral caustics, foam lines running in. Flood: (Plant 0.4 s, then one stir of 0.6 s, 0.3 s recovery.) The plant as the base; with her right paw resting on the staff's top she walks her trunk round it once, hips first, so the staff's top draws one slow circle, as if stirring a pot; the paw never leaves it. The pool spins, and the turn spreads: over 0.5 s every pond and canal joined to it begins to turn slowly the same way, long foam streaks winding across it, small eddies round each foe's ankles. Foes in it wade as if through mud. When the pool ends the streaks drift on a second and stop. Tsunami: the centre is a dark hole; foes go under; at the end one spout spits them out in a heap. Bubble: the pool's rim turns but its middle lies glass-flat; friends in it stand with a ring of still water round each foot.
- **N66. Sky Fall** (Point up, 0.6 s). She lifts the staff slowly, tip up, as if pulling a cord: a round waterfall pours out of the sky onto the spot, shots sinking into it. The drop: she chops the left paw down and the whole column lets go at once. Flood: (0.3 s lift, the fall from 0.6 s, 0.3 s recovery; the drop: 0.15 s chop.) The staff lifted slowly, tip up, as the base; the fall drums on the floor and the water runs out from under it in a widening round pool with a foam edge. On the press she chops the left paw down: the whole column lets go at once, and a ring crosses the pool to its edge in 0.25 s, each foe in it knocked off balance as it passes. The pool rocks twice and lies still. Tsunami: the fall lets go at once; where it lands the pool jumps outward as a ring wave with a foam lip, and the foes go out with it. Bubble: thin as a soap film, with slow colours; each shot it catches turns in a small bubble and drifts home.
- **N67. Wave Rider** (the ride, 1.5 s). She hops, a wave lifts under her, and she rides it on her belly (the passed slide), the staff in her right paw pointing ahead, leaning into each turn. Flood: (0.2 s hop, the ride 2.5 s, 0.3 s recovery.) She rides on her belly as the base, steering with the tail; the wave spreads flat behind her like the wake of a boat and stays: a bright road 2 u wide with two foam edges, laid as fast as she goes. Each foe she passes is sucked a step in behind her and left standing in the middle of the road, turning to look. She steps off with a small hop and the last of the wave runs on a hand's length and lies down. Tsunami: she stands up at the crest; on the press the wave folds and breaks under her feet. Bubble: she rides low and fast; behind her the foes rise one after another like corks.
- **N68. Clapping Waves** (Plant, 0.7 s). She drops the staff's tip to the floor in front of her; two waves rise far apart to the sides and run in to meet with a boom and a tall thin fin of spray. Flood: (Plant 0.3 s, the slide 0.4 s, the clap at 0.7 s, 0.4 s recovery.) The staff's tip dropped to the floor in front, as the base; the water on each side of the spot lifts its near edge like two blankets pulled together and slides in over dry floor, the foes on it riding in on their heels. With water on one side only, that sheet comes alone and meets the base's wave from the other. They meet with a boom and a fin of spray as thin as a blade, up and gone in 0.3 s; both sheets run home in 0.5 s, leaving the foes in a dazed knot. Her tail slaps on the boom. Tsunami: the two waves slam shut on the pack and it shoots out of the gap like a pip from between two fingers. Bubble: two fat bubbles roll in and burst on each other with one sharp bang; the foes' wind-up marks break.
- **N69. Maelstrom** (the coil, 1.6 s; today's, grown). She spins on the spot with the staff out, the room's water running to her feet in a spiral; one beat of stillness; a column goes up. End: the shake. Flood: (the coil 0.4 s, the drain 1 s, the burst at 1.6 s, 0.6 s recovery.) She spins on the spot with the staff out; a foam ring 1.6 u round her, and wider by a step for each water coming, marks where the burst will land. Every pond in the room stretches into a stream and runs to her feet, the foes sliding with it; the floor behind is left dark. One beat of stillness. Then the column: twice her height for a dry cast, and a head taller for each water it drank. It comes down as rain into one round pond at her feet. End: the shake. Tsunami: the column throws the pack up; a waterfall comes down on them out of the sky and drives them into the floor, a ring running out from the landing. Bubble: she spins and the water keeps her shape as she slips out of its back; the copy waves its staff and wobbles at each hit.

### Spring

- **N70. Ripple Step** (Step, 0.2 s a step). Three light hops on the water, knees bent, tail out for balance: she barely touches the floor; a ripple ring spreads from each landing and settles into a puddle. The belly slide passed on her model page stays as Home Waters' slide. Flood: (each hop 0.2 s; 0.3 s recovery after the last.) The light hops as the base, knees bent, tail out; on her water each landing barely dents it: one toe, a wide clean ring running out 3 u in 0.3 s, and she is already in the air again, the staff held out to the side for balance. A landing on dry floor is the base's: both feet, a small ring, a puddle. The last landing she lets sink: both feet, a small crown, a shake of the tail. Tsunami: (each hop 0.2 s; the kick 0.25 s; 0.3 s recovery.) The light hops as the base, but the floor stays quiet behind her: only her puddles. On the last landing she turns her back to where she came from, knees bent, and her tail sweeps the floor behind her from side to side, once. A wave jumps off it and runs back down her own track, over her puddles, into the faces of whoever follows: as wide as three of her after one step, twice that after three. She looks back over one shoulder as it breaks. Bubble: a bubble swells on the head she aims at; she springs onto it feet first, knees bent, it squashes like a trampoline and throws her on; a friend's bubble slides down round them, a foe's lifts it off its feet.
- **N71. Bubble Ward** (Bloom, 0.4 s; today's). The held bubble and its pop. Flood: (Bloom 0.4 s, 0.3 s recovery.) The bubble is fat and heavy, its lower half full of water that swings as the friend moves. Each hit dents it and a thin spurt jumps from the dent to the attacker's feet in 0.2 s, where it lies as a puddle. At the pop the skin is gone in one blink and the water inside falls straight down and runs out to its 3 u in 0.3 s, a round pool with the friend in the middle. She tips the staff toward the friend as it lands. Tsunami: the friend's feet are on a small board of water. Bubble: the pop jumps as a smaller bubble with a rising plink.
- **N72. Rain Squall** (Point up, 0.5 s; today's). Clouds, streaking rain, ripple rings. Flood: (0.3 s lift, the cloud at 0.5 s, 0.3 s recovery; each volley: 1 s hanging, 0.15 s in flight.) The passed cloud and falling streaks. Each second three drops stop dead high in the rain and hang, glinting; a second later they stretch into needles, turn together and streak into the foe her stream is on. The floor under the cloud shines deeper each second; when the cloud goes, a pool is left, its foam edge closing in 0.3 s. Tsunami: three thin spouts walk about under the cloud like drunks; each plucks a foe, whirls it and lets it fall on a neighbour. Bubble: bubbles fall slowly, stick on the foes and weigh them down.
- **N73. Geyser** (Plant, 0.5 s). The staff's butt taps the floor twice; a round wet mark shivers (the warning, in her colours since it is hers); a white column. Flood: (Plant 0.5 s, the warning 0.6 s, the launch 0.8 s, 0.3 s recovery.) The two taps as the base; only her water within 3 u of the mark answers, in whatever shape it lies: it shivers and pulls flat, dimpled like rain. Then it goes up in one piece: a white column in the middle and a flat sheet of water round it, knee-high, with the foes on it, arms and legs out. It hangs a beat and comes down as heavy rain on the same floor; the foes land on their backs in it. Dry floor inside the 3 u does nothing. She looks up, then steps back from the splash. Tsunami: at the top a hand of water bats the foes away. Bubble: after the column the vent keeps burping; each bubble wobbles off and settles over a friend.
- **N74. Water Prison** (Bloom, 0.5 s). One slow bubble leaves the staff's shell tip; it drifts, swallows the foe, lifts it; the foe paws at the skin. Pop: a crown. Flood: (Bloom 0.5 s, held 1.5 s, the throw, 0.3 s recovery.) A flick of the staff's shell tip at the water. Under each foe a dark whirling patch a step wide opens and shivers for 0.2 s; then each drops straight down to the neck in 0.2 s, heads turning, paws paddling at the surface, rings running out from each. At the end a short column under each, no taller than a foe, throws it out and it lands on its back; the patches close in 0.3 s. She holds the staff's tip down for the 1.5 s, then flicks it up. Tsunami: a ribbon runs from the staff's butt to the bubble; it bobs after her and bumps her tail when she stops. On the second press she turns once with the rope over her head, like a hammer thrower, and lets the bubble fly to the pointer. Bubble: the skin darkens with each hit it stores, then bursts from inside.
- **N75. Otter Dive** (the dive, hold). The nose-first arc into the floor; a V-shaped ripple runs where she swims; the breach: she comes out spinning, arms tucked, in a column. End: the shake. Flood: (the dive 0.3 s, the swim, the leap 0.6 s, 0.5 s recovery.) The nose-first arc into the floor as the base; under her water a V of ripples runs where she swims, wider the longer she stays down. As she leaves the water a foam ring opens on the floor where she will land, as wide as the splash will be. The leap: she comes out nose first in a tall clean arc, body straight, tail trailing a rope of water, turns once at the top with the staff tucked to her chest, and comes down belly first. A tall crown of drops and a ring running out; she slides a hand's length on her belly and stands with a shake. Tsunami: the V-ripple draws a white ring; when it closes the water inside drops and rushes to the middle with the foes. Bubble: no ripple: a pool somewhere else bulges and she is there.
- **N76. River's Gift** (Point at a friend, 0.4 s). A ribbon of water runs to the friend's weapon and winds round it; each hit throws a small splash. Flood: (Point at a friend 0.4 s, 0.3 s recovery.) The ribbon runs to the friend's weapon as the base; while the friend stands in her water a second ribbon climbs from the water up their legs in 0.3 s and joins it, and the weapon drips. Each hit lands with a short flat burst of water off the foe, the Crash's own look at a third the size, and the drop over the foe's head winks out and comes back. Step off the water and the leg ribbon lets go and falls as drops. Tsunami: a ring of water turns round the friend's feet; a foe that lands in it sits down hard. Bubble: the friend's next skill is followed by its own shape in clear water, a half beat late.
- **N77. Tidal Dome** (the coil and Bloom, 1.4 s). She winds up and throws both paws up: a dome closes from the floor upward, its skin moving like the surface of the sea seen from below. The end: it drops in on itself. Flood: (the coil 0.6 s, both paws up at 1.4 s, 0.5 s recovery; the canals run 8 u a second.) The wind-up and the throw as the base; the dome closes from the floor upward, and as its skin meets at the top its foot opens in five places: canals run out along the floor, fast, foam at their heads, one to each of her waters and the rest to the feet of the foes outside, where each opens into a small round puddle. Where a canal meets old water the two foam edges open in 0.3 s and one ripple crosses the join. Under the dome the light is Deep Cobalt and moving. It falls in as the base; the floor and the canals stay, a wheel of water with its spokes. Tsunami: foes that hit the skin ring off it like marbles in a bowl. Bubble: the dome's skin dents and rings with every blow it takes for them; cracks of light run over it before it falls in.
- **N78. The passives and capstones.** Tidepool: today's ripples at her feet. Home Waters: on
  her own water she drops to her belly and slides, the belly slide passed on her model page.
  Swell: three wave marks behind her feet; at full the water round her draws back in a ring.
  The Sea: a tide line climbs the walls, water runs in from every edge and lies ankle-deep
  over the whole floor; at the end it drains to the corners. Great
  Wave: the far wall darkens, the floor wets toward the foes, then one great wave with a
  full crest. Lifebubble: the fall stops in mid-air, a bubble with a bright rim; a held
  breath; the pop.

## 6. The damage formula (v1.2) on her kit

- **N79.** Types (formula D3 to D7):

  | Her line | Type | A hit? | Form for 抗性 |
  |---|---|---|---|
  | the stream, bolts, the whip, stones, the Hanging rain's needles | 常规直伤 | yes | ranged |
  | the tsunami, waves, rings, bursts, lobs, falls, Floodgate, Call the Tide, the whole-piece hits (the Dunk, the Pond-hopper, the Sleeper, the Plunge pool, the Blowout), Meeting Waters' surge, the Great Wave (T14) | 常规直伤 | yes | area |
  | Whirlpool, Rain Squall (under the Hanging rain too), puddles | 持续伤害, in a zone | no | DoT |
  | the Flood crest, the Guardian orb's ticks | 常规直伤 | yes | area |
  | Slam, a pop's 6 (T3), Overflow's half, Shared water's 30%, a full cast's roll-on, Return's shots, Lend a wave's bump | 附加伤害 | no | area or ranged |
  | Store's pay-out (the store) | 真实伤害 (D23.4) | no | |
  | bubbles, the Same boat dome | shield, a layer per skill | | |

- **N80.** Zones:
  - 基础伤害区: every card number; Crash's 60%; Tide on tide's rise; the Roll-up's 4 and the
    Drain's 6 a piece.
  - 增伤区 (all add): Deep Water, Heavy Swell, a full Swell's 30%, the 20% on a boss and the
    10% on a champion she cannot move (R13, audit G27), Surface Tension's 15%, the
    Alley-oop's 30% for the friend.
  - 易伤区: a foe afloat under T3 (20%).
  - 减伤区: the dome's 25% for friends.
- **N81. Why this fits, and where it is thin.** Small foes have no defence, so all three
  styles lose nothing in rooms. Elites, champions and bosses have defence (25, 40, 50), and
  with Jet gone she has no lever on one big foe but time and area: Flood has Deep Water and
  the whole-piece hits on the piece it stands in; Tsunami has R13's 20%, Heavy Swell and the
  full cast. Her boss damage is the kit's weak side now. That is the price of his ask, and
  the first thing to measure (N114).
- **N82. 控制.** Soaked, the slows, the stuns (Slam, the Abyss's pile, Clapping Waves, the
  Pond clap, the Alley-oop), the blind (Faceful), the root (Heavy bubbles) and the
  knock-flats (the Crest, the Dunk, the Whip wave, the Foam floor) follow D35 and
  the stun guard of D38. On a boss they last a fifth as long, never under 0.25 s (D37), and a
  boss takes one hard control every 5 s (D40.3). Every boss line in section 11 is already
  written with that floor. Pushes, pulls, carries, launches and floats are movement: 效果抵抗
  does not shorten them; N18 and N21 do.
- **N83. Zones lock** her 增伤 when they are cast (D26). A Crash is always a hit, never a zone
  tick.
- **N84. Shields.** Bubbles follow D30 to D34: they can crit, they add across skills, each has
  its own time, and a break is an event (the pop hangs on it).

## 7. AI seat, sound

- **N85. AI seat, all styles.** The Archer's stand-off and kite, as today. It holds attack on
  the nearest foe that is after a friend. It soaks first, then Crashes when two soaked foes are
  in reach, or one soaked elite, champion or boss (today's rule).
  - Flood: it lays water where the pack stands or is walking to, joins pieces when it can,
    and keeps its Crash skills for foes that stand in her water. It fights from her own water.
  - Tsunami: it looks for the nearest wall, pillar or pack and throws foes at it; it never moves
    a foe the tank holds unless that foe would hit a wall. It spends a full Swell on its
    widest skill, never on a friend skill.
  - Bubble: bubbles go to the friend foes are after, the tank last (today's rule); it keeps the
    Tidal Dome on the friends, not on the foes.
  - It never Leaps, Water walks or opens a Water door onto a floor warning or a bed (G17).
- **N86. Sound.** The stream: a steady pour. A soak: a small
  splash. A Crash: today's bright splash and thump. A Slam: a wet slap and a knock. A bubble: a
  plink going on, a clean pop coming off. The tsunami: a held breath, then the roar. Still
  water: a soft lapping, louder the more of the floor is hers. No sound
  here is new to the palette of `src/audio/tidecues.js` but the plink, the pop, the lapping
  and the hush of a full Swell.
  - Talents: Overflow a ripple running out through the pond; Deep Water a deeper, duller hit;
    Meeting Waters a rush and a slap as two ponds join; The Sea a flood rising from every
    wall, then lapping; Swell three rising notes, then a hush as the water draws back; Heavy
    Swell a deeper thump; Backwash a suck back over wet stone; Surface Tension a tighter
    plink; Chain Pop a run of plinks; the Great Wave a held breath, then the whole room's
    roar; Lifebubble one held note and a pop. Floodplain and Wide Water have none.
  - Combos play the two skills' own sounds and one bright chime when the combo fires.
  - The AI seat plays talents as plain rules. With the Great Wave it keeps its third Crash for
    a pack in line; with The Sea it keeps Call the Tide and its Crash skills for the flood;
    with Lifebubble it does nothing different.

## 8. For the page and the build

- **N87. The model.** The page thread should first check: the coil round the upright staff,
  the lean on a planted staff with the tail braced, the back float, the dive arc and the one porpoise leap, the run across the water on her toes (Water walk), the tail sweep at her last landing (Kick waves), the half-turn sweep with the ribbon out (Whip wave), the staff's tip dropped to the floor (Pond clap), the planted staff stirred one turn (Stir), the three balls flicked over her shoulder (Flood
  crest), the bounce on a bubble (Bubble hop) and the flick up and slam down of the Bubble
  flail. No move puts the left paw on the staff, holds an object or lifts a paw to her
  mouth.
- **N88. New moves** (beyond the passed set): the coil, the dive and breach, the porpoise
  leap, the back float, the whip turn and the half-turn sweep, the disc flick, the nozzle
  sweep and the low broom sweep, the heave lob, the planted lean, the wave ride on all
  fours, the tuck and belly landing (Leap), the surface run, the tail kick, the staff drag,
  the three-ball flick.
- **N89. Things to show.** The three soak tags on each skill; a soaked foe sliding farther; a
  drenched foe Crashed twice; Soaked and a Crash beside a dry hit; her water on the floor, two
  pieces joining into one, and a hit running through a piece (Overflow); Swell filling, the
  draw-back at full, and a full cast beside a plain one; a Slam on a wall and on another foe;
  a foe afloat; a bubble, its layers and its pop; a left-paw cast beside the full staff
  cast.
- **N90. Order for the page.** Base forms first (24 clips, the passive, basic attack, dash),
  then one style at a time, then the combos. Chinese first with an English switch; a flat grid
  floor with dummy units; few words (his rules for review pages).
- **N91. For the build.** New machinery: a held continuous attack with a count, a pressed
  skill kept through a hold, carrying and throwing foes with a wall test, a held state with
  its cap, shield layers with a break event, friend-aimed casts, a steered projectile, an
  under-floor state, a decoy that takes blows, a blind, a drawn line and a
  closed-ring test, soak values by foe rank, the slide, a drenched state, wet footprints.
  New in 2.0: her water as joined pieces (shapes on the floor with a "same piece" test),
  water with a current, water that folds in, grows at its edge or drains, canals laid by rule, a
  projectile that swims under water, a room-wide
  flood state, and a cast count that doubles a skill's sizes. Each goes in the module that
  owns the job. The soak and crash keys, the drag zones and the delayed burst exist today.

## 9. The record

- **N92.** The 15 new skills and where each came from are in `TIDECALLER_IDEA_LIST.md`.
- **N93. Names I avoided.** Today's node names (Wellspring, Deluge, Current, Ebb, Spring Tide,
  Undercurrent, Riptide, Confluence) and the deed High Water are not used for any talent, form
  or skill. So T7 is Meeting Waters, not Confluence, and a full Swell is 满潮, not 大潮. The
  Flood form of Bubble Ward is the Spill 溢泡, not the Moat (an Undertow form of kit 1.1).
- **N94. Undertow dropped** (his mark, 19 Nov: "Undertow: drop this and re-design one"). I
  read it as the whole skill, since his other marks name a style. Call the Tide 唤潮 stands in
  its place: the one skill that answers from all her water at once, so every wet path, puddle,
  pool and rain she lays is worth more. Undertow is in the game today; taking it out waits for
  the build. Pick 4a no longer applies. There are no currents in the kit now.
  Ripple Step (his mark: "Ripple Step: base, jet and bubble: re-design"): the base was one
  vault away, close to the dash. Now it is three steps she spends one at a time, each with a
  ripple. The Swap stayed as he passed it until kit 2.0 (N95).
- **N95. Kit 2.0, 20 Nov.** Flood had been a spare idea since pick 1b (Flood in place of
  Bubble, not taken on 19 Nov); it is a path now. Jet is gone: he asked for a massive AoE mage
  and Jet was the one-foe path. Three Surge forms that worked on one foe went when Surge
  became Tsunami: the Cradle, the Flail and the Swap (which he had kept on 19 Nov; it is the
  one passed form I took out without his word, and the first to give back if he asks).
  Overhead, the Sea fall and the Whale breach had already gone on 20 Nov by his picks.
- **N95b. Kit 2.1, 21 Nov.** His ask before he slept: "run critic loop to check on the ability,
  make sure it fit the design element, and no repeating skills, fill in details insanely". Two
  fresh critics read kit 2.0. What they found and what changed: the review log and the sameness
  audit, section 1b. The lesson for this style: a Flood form must never pay for water that lies
  in separate pieces, because the style's whole pull is to join it; and a Flood form must not
  take water away, except the Drain, which is the one spender. Renamed: the Drinker is the
  Stir 搅水 (it was the Inflow 引流 in 2.1); the Paddling pool is the Spill 溢泡.
- **N95c. Kit 2.2, 21 Nov.** Rounds 2 and 3 of the loop. Round 2: a fresh critic for fit and
  repeats (3 must fix, 12 should fix) and a detail critic (19 gaps, 5 across the kit). The
  second lesson: a Flood form that uses her water must not read as "the base, but on every
  foe in the piece"; each needs its own verb (sweeps, carries out, stirs, folds, skips). The
  log has what was taken and what was not.
- **N96. The tsunami is in every style again.** Jet's water blade went with Jet.
- **N97. Hero name.** "Tide Caller" in these files; the game's class name today is Tidecaller
  唤潮者 and the otter is Rill 莉儿. A new hero name, like Mosslight or Ashfang, is his to give.
- **N98. No skill moves a friend** (a bubble that carries a friend, a dive that takes a friend
  along, a gate that moves the team were all left out): moving another player's hero is bad
  in co-op. Rescue wraps the friend and yanks the foes; Lend a wave only makes the friend
  faster, and the friend steers.
- **N99. Three skills move her** besides the dash (Ripple Step, Otter Dive, Wave Rider), and
  one form (the Leap). She holds four of 26, so a build rarely has more
  than one.
- **N100. Windbriar and the Tide Caller both gather and throw.** Wind and water do like things.
  Their rules are shared where that helps (Slam, the air rules) and their pictures differ: wind
  is thin lines and spirals, water is mass with a crest.
- **N101. Not touched.** Her eight nodes, the relics Otter's Pearl and Millrace Charm, the deeds
  Rill's Return and High Water, her unlock, her story lines.
- **N102. The freeze.** Nothing here enters the game until Kesh lifts the freeze; then a new
  BUILD_BRIEF ruling is needed for the damage formula (the formula notes say A25).
- **N103. What I guessed.** Every number; that he wants bubbles to be shields and not heals;
  that the stream should not soak; that "lower value" on an elite means half of the slow and
  the slide, and that a Crash keeps its 60% on every foe; which skills get a 湿 line and
  what each does; that a Slam between two foes should be small; the 2 s cap on holds; the
  10% for a champion. In 2.0: what counts as one piece; Overflow's half; Swell's count of 3
  and what "twice the size" covers; every size and time of still water; that Three Crests
  should grow; which Surge forms were too small for Tsunami.
- **N104. Passes.** Every pass, mine and the two fresh judges', is in
  `TIDECALLER_REVIEW_LOG.md`.
- **N105. Next.** The page thread builds the 48 Flood and Tsunami cards and the new Bubble
  Breaker; he marks them there.
- **N106. Sources.** Twenty web searches, listed by idea in the idea list. No video was used.
- **N107. Files read first.** CLAUDE.md, docs/TIDECALLER.md and docs/TALENTS.md in the repo; the
  Windbriar, Duskwing and Stonehide kits; the Windbriar sameness audit; the damage formula
  v1.2.1 and its notes; her model page record.
- **N108. Formula note N65** (the formula thread left her soak on a boss "for later"): closed
  by his pick 2a: a boss carries the status and nothing else.

## 10. Every skill and form in full

The kit's table is cut short for reading. This is the whole rule of each. A form keeps
everything the base does (its damage, soak, Crash and moves) unless it says "no" or gives its
own.

| # | Skill (cooldown) | Base | Flood 涨潮 | Tsunami 海啸 | Bubble 泡沫 |
|---|---|---|---|---|---|
| | **Stream 流** | | | | |
| F1 | Riverbolt 河流弹 (2.5 s) | a bolt, 5 u: 14, soaks. Wet: it passes through a soaked foe and goes on to the next, to its full reach | **添塘 Pond-maker**: the bolt bursts on the first foe or at its full reach: 14 to every foe within 1.5 u, soaks, and leaves a pond of still water there, 2 u wide, 6 s. On her water it lays the same pond: where the two overlap they are one piece, and each part keeps its own time. The base's 湿 line is dropped | **浪头 Wave head**: the bolt as the base (5 u: 14, soaks; 湿: it goes on through a soaked foe). Where it stops, on the last foe it hits or at its full reach, a wave head rises across her aim, 4 u wide, and rolls 2 u on: 14 to every foe it reaches (not a foe the bolt hit), pushed 1 u, soaks | **弹泡 Bouncer**: a bubble that bounces off foes and walls 4 times: 8 each, soaks; a friend it touches catches it: an 8 bubble The base's 湿 line is dropped |
| F2 | Torrent 激流 (6 s) | a jet through every foe on a 5.5 u line: 18. Crash | **开渠 Canal**: the jet as the base (18, Crash); its line stays as a canal, 5.5 u long, 1.5 u wide, 6 s. The canal runs away from her at 3 u a second: a small foe in it is swept to its far end. It cannot walk against the current; it keeps its feet and still turns and attacks, so it is not held (R10). At the far end it Slams once on a wall or on another foe (R9) and can then walk out. An elite is slid half as fast and can walk out sideways; a champion or a boss is not moved. Water that touches the canal is one piece with it (R12); the current runs only in the canal itself | **分海 Part the sea**: the foes on the line are thrown 1.5 u out to both sides | **洗礼 Wash**: it passes through friends too: each is washed clean of slows, burns and curses, and for 2 s none of those sticks to it. No bubble |
| F3 | Water Whip 水鞭 (5 s) **New** | a whip, 4 u: it grabs the first foe and throws it to the pointer, up to 3 u: 12, soaks (a foe thrown onto others is a Slam). Wet: a foe that was soaked when grabbed lands flat on its back 0.5 s | **摔水 Dunk**: the whip grabs the first foe within 4 u and throws it into the piece of her water nearest the pointer, up to 5 u: it lands flat 0.5 s, and the splash hits it and every other foe standing in that piece within 3 u of the landing: 12 each, soaks. With none of her water within 5 u: the base | **甩浪 Whip wave**: no grab: the whip sweeps a half circle in front of her at 4 u, from one side to the other, ending on the pointer's side; a wave runs under its whole length, from her feet to its tip: 12 to every foe in the half circle, soaks. Up to 5 small foes, nearest first, are carried along the arc and dropped in one heap at its end (a carry that ends: they Slam on each other and on a wall, R9). Wet: a foe that was soaked lands flat 0.5 s | **救援 Rescue**: it can wrap a friend: a 12 bubble, and the foes within 1.2 u of that friend are yanked 2 u toward her, soaked. The friend is not moved. A friend under the pointer comes first; with none there it is the base on a foe |
| F4 | Skipping Stone 打水漂 (6 s) **New** | a flat stone skips along her aim: four splashes 1.5 u apart: 10 within 0.9 u, soaks; the last: 16. Wet: one more skip for each soaked foe it hits, up to 8 skips | **逐水 Pond-hopper**: thrown as the base along her aim. When it lands on her water, or hits a foe standing in it, it stops going straight: it skips to the nearest foe standing in her water within 4 u that it has not yet hit twice, and again, up to 8 skips in all: 10 each, soaks, the last 16. It crosses dry floor between two waters that are within 4 u. On dry floor, or with no such foe: it goes on along her aim as the base, with the base's 湿 line | **接力浪 Conveyor**: each splash throws the foes it hits on to the next splash's spot: a foe caught by the first lands at the last, 4.5 u on. 6 each splash, the last 12 The base's 湿 line is dropped: its spots are fixed | **浮雷 Drift mines**: each splash leaves a bubble 4 s that drifts to the nearest foe and pops: 10 within 1 u, soaks The base's 湿 line gives one more mine for each soaked foe hit |
| F5 | Spray 泼水 (4 s) **New** | a quick fan of water, 3 u, 70°: 10, soaks. No push. Wet: a foe that is already soaked is drenched 透湿 for as long as its soak lasts: the next Crash on it does not spend the soak | **赶水 Sweep-in**: the fan as the base (10, soaks, drenches), and it washes each foe it hits up to 2.5 u toward the nearest piece of her water; a foe stops once it is inside. A foe already standing in her water is not moved | **倒卷 Drag-in**: it falls behind the foes and washes them to her feet, up to 2 u | **滑泡 Foam floor**: foam stays on the fan's floor 4 s: a foe that runs or charges across it falls: stun 0.6 s, once each. A champion is slowed 40% for 1 s instead; a boss is not affected |
| F6 | Tide Orb 潮珠 (7 s) **New** | hold up to 3 s: an orb of water follows the pointer: 4 each 0.3 s to foes it touches, soaks. Let go: it bursts: 14 within 1.2 u. Crash | **画水 Paint**: hold up to 3 s as the base (4 each 0.3 s, soaks): the orb leaves a stroke of still water behind it, 1 u wide, 6 s, one piece with any water it crosses; the orb moves 3 u a second at most. A stroke that closes a loop, on itself or on her other water, fills the floor inside the loop with still water at once, up to 5 u across; the stroke and its fill are one part. Let go: it bursts as the base (14, Crash). The burst leaves no pool: the stroke is the water | **卷珠 Pick-up**: it swallows up to 3 small foes it touches and carries them, for 2 s at most. Let go: it throws them 2 u out | **护卫珠 Guardian orb**: steered onto a friend it stays on them while she holds, up to 3 s: a bubble that takes up to 14 for the friend, and its ticks hit the foes within 1.2 u of the friend. Let go: it bursts as the base |
| F7 | Depth Charge 深水弹 (8 s) **New** | hold up to 1 s; she lobs a ball of water over everything to the pointer, up to 6 u: 18 to 36 within 1.2 to 2 u. Crash | **伏雷 Sleeper**: hold and lob as the base. On dry floor: the base. Into her water: it sinks with a plop and swims under that piece at 6 u a second to the foe standing in it nearest the pointer, as far as the water goes, and goes up under it: 18 to 36 (by the hold) to every foe within 2.5 u. Crash. No foe stands in that piece: it sleeps under the spot for up to 8 s and goes up under the first foe that steps into the piece. One sleeps at a time: a second cast sets the first off where it lies. If its water dries it goes up at once | **拍地 Slam down**: no hold, no lob: a small whirlpool opens at the pointer, within 6 u, and drags the foes within 2.5 u into one knot for 0.6 s; then a waterfall drops on it from the sky: 24 within 1.6 u, and every foe under it is Slammed into the floor: R9's wall Slam, with the floor as the wall. Crash | **浮垫 Raft**: the hold and the lob as the base; it lands as the base, then stays as a raft of bubbles 2.5 u wide for 4 s: friends standing on it take nothing from burning, slowing or poisoned ground under it. A foe's strike still lands |
| F8 | Floodgate 决堤 (big, 14 s) **New** | she plants the staff: a great beam, 8 u long, 1.2 u wide, 2 s: 8 each 0.25 s; she turns slowly. The first hit on each foe is a Crash | **开闸 Open the gate**: no beam: for the 2 s water pours out of the floor at the planted staff and spreads forward as a low flood, to 8 u long and 5 u wide; she turns slowly. Its front hits each foe once as it reaches it: 24. Crash. It does not push. When the 2 s end the gate shuts and the sea slaps back once from its far end to her: 16 to every foe standing in it, soaks. The flooded floor stays as one piece of still water for 8 s | **洪峰 Flood crest**: she lobs three small water balls up behind her; for the 2 s the balls and she each fire a jet of the base's size, side by side, one river about 4 u wide: it pushes every foe in it along at 3 u a second, and she turns it slowly: 4 each 0.25 s; a foe it presses on a wall or pillar takes 8. The first hit on each foe is a Crash | **泡浪 Bubble wave**: no beam: for the 2 s she blows a wave of bubbles down the 8 u line, turning slowly. Each small foe it touches is sealed in a bubble and blown along to the line's end (an elite half as far): afloat, a hold (R10). There the bubble pops: 20. Crash; then the pop soaks, and the foe falls to the ground, flat 0.5 s. A foe blown into a wall pops there and Slams (R9). A champion or boss is not sealed: the bubbles burst on it: 4 each 0.25 s |
| | **Wave 浪** | | | | |
| F9 | Breaker 碎浪 (8 s) | a ring of water round her, 1.4 u: 22 to up to 5 foes, knocked back 1 u. Crash | **涨环 Spreading ring**: on dry floor: the base. Standing in her water: the ring does not stop near her. It runs out from her through the whole piece she stands in, following the water's shape, and carries every small foe standing in that piece out with it to the piece's edge, dropping them 1 u beyond it, 6 u from her at most: 22 each. Crash. It is a carry that ends (R10): a foe carried into a wall or another foe Slams (R9). An elite is carried half as far; a champion or a boss is not carried. It takes no water and leaves none | **跃浪 Leap**: the ring throws her into the air, untouchable; she comes down at the pointer within 4 u as a second ring: 22 again there, knocked back 1 u. Crash on both rings (a foe once) | **泡锤 Bubble flail**: no ring: the foe her stream is on (stream off: the foe nearest the pointer within 4.5 u) is caught in a bubble: 12, soaks. She bounces it high and slams it down where it stands, three times in 1.8 s: each slam rings out: 12 to the foes within 1.8 u, 6 to the foe inside. The third slam pops the bubble: 22 to the foe inside, a Crash, and the pop soaks. The foe is held while it is in the bubble (R10). Her stream does not stop. A champion or boss is not caught: the three slams ring out from it where it stands |
| F10 | Crashing Wave 怒涛 (9 s) | a wave, 100°, 2.2 u: 20 to up to 6 foes, pushed 1.2 u. Crash | **滚潮 Roll-up**: on dry floor: the base (2.2 u). Where the wave meets her water it rolls on for as long as there is water under its middle, up to 10 u from her: 20 to every foe it passes, and 4 more for each 2 u of water it has crossed (to 32), and its front widens with it to 4 u; each foe is pushed 1.2 u as it passes. Crash. It takes no water with it and leaves none | **三叠浪 Three Crests**: the wave rolls out as three crests, 0.4 s apart, each bigger than the last: the first reaches the base's 2.2 u, the second 3.5 u, the third 5 u, all at the base's 100°: each 8, pushed 1.2 u (3.6 u for a foe in all three). A soaked foe slides 50% farther each time and stays soaked through all three: the third is the Crash. A foe pushed into a wall Slams | **糊脸 Faceful**: the wave is foam: 12 and the push. Crash. Every foe it hits is blinded 1.2 s: its aimed blows and shots miss; a strike on an area still lands |
| F11 | Call the Tide 唤潮 (9 s) **New** | every piece of her water in the room (R12) and the floor within 2 u of her rises at once as a standing wave: 16 to each foe standing in it, a foe once. Crash. The water it rose from lasts 2 s longer. A left-paw cast | **连潮 Tide on tide**: cooldown 6 s (the base 9 s). As the base (16 to foes standing in her water; the water is topped up 2 s, never above the time it was laid with), and each piece spills over as it breaks: its waves reach 1 u past the piece's edge all round and hit the foes standing there too; that 1 u rim stays as still water for 9 s, part of the piece. A cast within 9 s of the last hits for 22, and its rim lies outside the last one, which still stands: the water creeps out 1 u a cast. Two steps only: 16, then 22 | **聚潮 Gathering tide**: each wave breaks toward the pointer: 16 (Crash), and its foes are thrown 3 u toward the pointer (R9: they Slam on walls and on each other) | **泡涌 Bubbling up**: no damage and no Crash: each small foe standing in her water is lifted afloat in a bubble 1.2 s (an elite 0.6 s) and lands soaked; each friend standing in her water, herself too, gets a 10 bubble for 4 s |
| F12 | Whirlpool 漩涡 (12 s) | a pool within 4 u, 1.4 u, 5 s: 4 a second, soaks, slow 30%, drags foes to its centre. A foe in it whose soak a Crash spends is soaked again at once | **搅水 Stir**: the pool as the base (5 s: 4 a second, soaks, slow 30%, drags foes in its circle to its centre). While the pool touches a piece of her water, its tick and its slow reach every foe standing anywhere in that piece. Nothing is carried and no water is used: the drag stays in the pool's own circle, and so does the base's soak again after a Crash | **沉渊 Abyss**: a foe that reaches the centre is swallowed for up to 2 s from when it went under (an elite 1 s). Press again: everything swallowed is spat out in one pile: stun 1 s. A foe whose time ends is spat out the same way | **定海 Steady water**: the pool as the base; friends standing in it cannot be stunned, pushed, pulled or knocked flat |
| F13 | Sky Fall 天落 (10 s) **New, 20 Nov** | she points at a spot within 5 u: a round waterfall, 1.4 u wide, pours from the sky onto it for 4 s: foes' shots that fly into it are washed down; foes under it are soaked and 40% slower. Press again within the 4 s: the whole fall drops at once: 16 to the foes under it. Crash. Not pressed: it runs dry at 4 s | **瀑潭 Plunge pool**: the fall as the base; under it a pool of still water spreads, 0.9 u wider each second, from 1.4 u to 5 u wide at 4 s. On the press the fall drops and the blow runs out through the whole pool: 16 to every foe standing in it. Crash. The pool stays 6 s after the fall ends | **潮环 Ring out**: the fall as the base. On the press the fall drops and its pool bursts outward as a ring wave, to 3 u: 16, and every foe it reaches is thrown 2 u outward (a soaked foe farther; they can Slam). Crash | **回礼 Return**: the fall is thin as a soap film; each shot it washes down is wrapped in a bubble and floats back to who fired it: 6 each. Friends' shots pass through it. The drop as the base |
| F14 | Wave Rider 踏浪 (9 s) **New** | she surfs a wave for 1.5 s, steering it, up to 6 u: foes she passes take 14, are soaked and knocked 1 u aside | **破浪 Bow wave**: she surfs for 2.5 s, up to 10 u, steering; foes she passes take 14 and are soaked, as the base, and are drawn 1 u in behind her, onto the road, in place of knocked aside. Behind her the wave lays a road of still water, 2 u wide, 6 s, one piece with any water it crosses | **浪尖 Crest**: press again as the wave peaks (a 0.4 s window, judged on her own screen in co-op): it breaks under her: 28 to foes within 2 u, knocked flat 1 s. A miss: the base | **掀泡 Bubble wake**: each foe she rides past is lifted in a bubble behind her: afloat 1.2 s (an elite 0.6 s), a row of them; each pops: 14, soaks. No knock aside |
| F15 | Clapping Waves 合浪 (8 s) **New** | two waves rise 1.5 u to each side of a spot within 5 u and clap shut: 18 to the foes between, stun 0.5 s. Crash | **撞水 Pond clap**: at a spot within 5 u. If any of her water lies within 4 u of the spot: in place of the two waves her water itself folds in from both sides. Every small foe standing in her water within 4 u of the spot is carried to it in 0.4 s (an elite half as far; a champion or a boss not; a carry, R10), and the water claps shut over the spot: 18 to every foe there, stun 0.5 s. Crash. Then the water runs back to where it lay. No water within 4 u: the base | **夹击 Vice**: the two waves run in and crush the foes between: one hit of 20, a Crash (32 on a soaked foe). No stun and no hold: the pack squirts out 3 u along her aim and can Slam | **爆响 Bang**: two great bubbles roll in from the sides, meet and pop with a bang: 18 within 2.5 u, and it breaks every foe's wind-up within 4 u (never a boss's). No stun. Crash |
| F16 | Maelstrom 大漩涡 (big, 16 s) | everything within 3 u of her is pulled 1 u inward; 1 s later it bursts: 40 to up to 8 foes within 1.6 u. Crash | **排空 Drain**: every part of her water in the room runs to her spot in 1 s, and small foes standing in it are dragged with it up to 4 u toward her; the base's pull within 3 u too. Then the burst: 40 to every foe within 1.6 u, 6 more and 0.3 u farther out for each part drained (each pond, canal, pool, road or path she laid counts as one, joined or not), up to 5: 70 within 3.1 u. Crash. The Sea counts as 5 and is not ended. All the other water drained is spent; the burst's own circle stays as a pond for 6 s. Overflow and Deep Water read the foes as they stood when she cast | **瀑压 Fall slam**: the burst: 40, launched 1.2 s. Crash. Then a waterfall drops from the sky on the launched foes and slams them down; where it lands a ring runs out: 12, pushed 2 u | **水獭替身 Decoy**: no draw: the spin leaves an otter made of water where she stands, and she slides 2 u back. Small foes and elites within 5 u that no friend has taunted attack the otter for 3 s; it has 40 health. It ends, or breaks, in the base's burst: 40. Crash |
| | **Spring 泉** | | | | |
| F17 | Ripple Step 涟漪步 (7 s) | up to three steps within 3 s, one a press: each 1.6 u the way she is moving (standing still: away from her aim), untouchable for the step. Each landing spreads a ripple, 1.5 u: 6, soaks, and leaves a puddle there, 0.8 u, 3 s: 6 a second, soaks. The cooldown starts at the first step. A step pauses the stream for a blink and keeps its count | **凌波 Water walk**: the base steps. A step that lands on her water does not use up one of the three, so she takes up to six steps in the 3 s. A landing on her water spreads its ripple twice as wide, 3 u: 6, soaks, and leaves no puddle (the water is hers already). A landing on dry floor: the base's ripple and puddle | **蹬浪 Kick waves**: the base steps, with no ripple at a landing (the puddles are left as the base). When she stops stepping (the third landing, or the 3 s running out) she kicks one wave from where she stands, back along the steps she has made, at whoever follows her. One step: 3 u wide, 4 u long: 8, pushed 1.5 u. Two steps: 4.5 u wide, 6 u long: 16, pushed 3 u. Three steps: 6 u wide, 8 u long: 24, pushed 4.5 u. Soaks. A foe it pushes into a wall Slams (R9) | **踩泡 Bubble hop**: each step can land on the head of the friend or foe nearest the pointer within 3 u: she bounces off a bubble on it and comes down 1 u beyond, untouchable. A friend she bounces on gets an 8 bubble, 4 s. A small foe is lifted afloat in the bubble 0.6 s (an elite 0.3 s) and lands soaked. No ripples, no puddles. With no one in reach: the base step |
| F18 | Bubble Ward 泡泡护盾 (11 s) | a 14 bubble for 4 s on the friend under the pointer within 4 u; with none there, the friend foes are after; else herself | **溢泡 Spill**: a 10 bubble for 4 s on the friend the base would pick. Each hit the bubble takes spills at the foe that struck it: a puddle of still water, 1.2 u, 4 s, under that foe wherever it stands (a shooter too), one a second at most; one bubble's puddles are one part (R12). When the bubble pops or ends it bursts into a pool of still water, 3 u wide, 6 s, where the friend stands; the pop soaks as the base. The pool stays where it fell: it does not follow the friend | **借浪 Lend a wave**: a 10 bubble, and the friend rides a wave 4 s: 30% faster; foes it runs into take 8 and are pushed 1 u; the bump soaks | **跳泡 Hop**: when it pops it hops to the next friend within 5 u at 60% size, up to three friends |
| F19 | Rain Squall 骤雨 (14 s) | rain within 5 u, 1.8 u, 6 s: 3 a second, soaks, slow 25%. A soak from the rain lasts 8 s | **悬雨 Hanging rain**: the rain as the base, all 6 s (3 a second, soaks 8 s, slow 25%). While it rains, every second three drops stop and hang over the rain; one second later they fire as needles at the foe her stream is on: 2 each, and it is soaked 8 s. With the stream off they fire at the foe with the least health within 8 u of her. Six volleys, 36 in all. Not a Crash. No second press. The floor under the rain fills: when the rain ends it stays as a pool of still water, 1.8 u, 6 s | **水旋 Spouts**: three waterspouts wander in the rain for the 6 s: each picks up the nearest small foe, spins it 1 s and drops it on the nearest other foe: a Slam for both (R9, foe on foe). A foe is picked up once every 3 s. No slow | **沉泡 Heavy bubbles**: in place of the slow, each second in it sticks a bubble on a foe: 15% slower each; at four it is rooted 1 s, then the four pop as one: 12 |
| F20 | Geyser 间歇泉 (7 s) **New** | a spot within 5 u; 0.6 s later it erupts: 16 within 1 u, launched 0.8 s, soaks. Wet: a foe that was soaked is launched 1.6 s | **喷涌 Blowout**: on dry floor: the base. On her water: 0.6 s later the column throws up all of her water within 3 u of the vent with it: 16 to every foe standing on that water, launched 0.8 s, soaks. The water falls back where it was. The base's 湿 line is dropped: on her water every foe is soaked | **托抛 Toss**: at the top a wave throws the launched foes 3 u toward the pointer | **泡泉 Bubble fountain**: the vent stays 5 s after it erupts and blows one bubble a second: each drifts to the nearest friend within 6 u who has none from it: a 6 bubble for 4 s |
| F21 | Water Prison 水牢 (9 s) **New** | a bubble flies to the first foe within 5 u and seals it: afloat 1.5 s. Then it pops: 12 within 1.2 u, a Crash; then the pop soaks | **陷水 Sink**: on a foe standing in her water: no bubble: the water opens under it and under each small foe within 1.5 u of it in that piece, up to 4 in all: they sink to the neck, held 1.5 s (an elite 0.75 s; R10): they cannot act and everyone can hit them. Then the water throws them out: 12 each, a Crash; then it soaks them. On a foe on dry floor: the base | **牵走 Tow**: the bubble with its foe follows her on a rope of water, 1.5 u behind, for 2 s (an elite 1 s). Press again while it is towed: she swings the rope once and throws the bubble to the pointer, up to 5 u: it pops where it lands (12 within 1.2 u, Crash, then the pop soaks); thrown onto a wall or a foe it Slams (R9). If the time ends first it pops where it is | **存伤 Store**: the sealed foe takes no damage; the bubble keeps all that is dealt to it, up to the health the foe has left. When it pops the foe takes the store and 30% more, as true damage that is not a hit, and other small foes and elites within 1.5 u take half. A champion or boss is not sealed: the bubble sticks on it 1.5 s, it takes damage as usual, and the bubble then pays 30% of what was dealt |
| F22 | Otter Dive 潜游 (10 s) **New** | she dives under the floor: up to 2 s a ripple at double speed, untouchable. Let go: she surfaces: 14 within 1.5 u, launched 0.5 s, soaks. In her own water: twice as wide | **鱼跃 Porpoise**: she dives as the base. While she swims under her own water the 2 s clock stops, for up to 3.5 s under in all; under dry floor it runs as the base. Let go, or time out: if she is under her water she does not breach where she is: she leaves it in one great leap, up to 4 u to the pointer, 0.6 s in the air, untouchable, and lands with a splash: 14 to every foe within 2 u, and 4 more and 0.4 u farther out for each second she swam under her water (to 28 within 3.4 u), knocked back 1 u, soaks. This takes the place of the base's line "in her own water: twice as wide". Under dry floor: the base's breach. The cooldown starts when she lands | **围鱼 Round-up**: her ripple leaves a line on the floor. If she swims a closed ring within the 2 s, every foe inside it is swept to its centre as she surfaces: each is Slammed (R9, foe on foe) and launched 0.5 s. Not closed: the base | **水遁 Water door**: no swim: she comes up at once from the water of hers (R12) nearest the pointer, anywhere in the room, with the base's burst. On a pad the reticle jumps to her water in the stick's direction. With none in the room: the base |
| F23 | River's Gift 河赐 (10 s) **New** | the friend nearest the pointer within 6 u, or herself, for 5 s: its hits soak and splash: 4 to foes within 1 u | **共潮 Shared water**: the base gift (5 s: the friend's hits soak, and splash 4 within 1.5 u). While the gifted friend stands in her water, each of their hits on a soaked foe is a small Crash 小拍: 30% more (增伤区), and the soak is spent after the hit; by R5 her Flood puddle is left under that foe if it stands on dry floor. The gift's own soak lands after the hit, so their next hit finds it soaked again. Off her water: the base. On herself: her stream's ticks count, one small Crash a second at most | **送球 Alley-oop**: for 5 s, a foe her water pushes, throws or carries to within 2 u of the gifted friend arrives stunned 0.5 s, and that friend's next hit on it deals 30% more | **倒影 Reflection**: the friend's next skill, a big one too (his pick of 19 Nov), is cast twice: the second by its reflection in the water, for 40% |
| F24 | Tidal Dome 水穹 (big, 16 s) **New** | a dome of water 3 u wide within 5 u, 5 s: friends inside take 25% less; foes inside are soaked and slowed 40%. It ends by falling in: 24. Crash | **水乡 Lagoon**: the dome is 5 u wide (the base 3 u). As it closes, up to five canals, each 1 u wide, run out from its foot: one to each separate piece of her water within 8 u of its centre, nearest first; each canal left over runs to the nearest foe outside the dome within 8 u, a foe once, and ends in a puddle of still water under it, 1.2 u. The dome's floor, the canals, the puddles and all they touch are one piece. Inside it is the base: friends take 25% less; foes are soaked and slowed. It falls in as the base: 24 to the foes inside. Crash. The dome's floor, the canals and the puddles stay as still water for 8 s after it falls | **弹球 Pinball**: foes inside cannot leave (a champion or boss can); its skin is a wall for Slam, and a foe thrown into it bounces 1 u back. It ends by falling in as the base | **同舟 Same boat**: the dome is one great bubble with 60: it takes every hit meant for the friends inside, in place of the 25%. Foes inside are soaked and slowed as the base. When it breaks, or at 5 s, it falls in as the base: 24. Crash |
| | **Passives** (no form) | | | | |
| F25 | Tidepool 潮池 | every second, 5 to the 2 nearest foes within 2.5 u, soaks (today's) |  |  |  |
| F26 | Home Waters 如鱼得水 **New** | while she is on her own water (R12) she slides on her belly, 20% faster. Wet: a soaked foe leaves wet footprints behind it for as long as it is soaked: her water, each print 2 s |  |  |  |

## 11. Every form: on a boss, the look, the sound, the AI seat

- **N109. The finish.** She takes the Magic template for the basic attack and every skill
  (`docs/VFX_TEMPLATES.md`, "Which heroes take which"). Her own water shapes (N52, N53) are
  drawn first; the template is the finish on top: an arcane circle, a light beam, a celestial
  burst, stardust. The "Beat" column names the template beat of each form. Bubbles take the
  Ward beat, with the circle under the friend.
- **N110. A boss** is never moved or held (R13). The table says what each form does to one
  instead. "20% more" is on that form's own hit. A stun, a root, a blind or a knock-flat on a
  boss lasts a fifth as long, never under 0.25 s, and a boss takes one hard control every 5 s
  (formula D37, D40). A move a boss has already shown is never stopped. A form with no hit of
  its own on the boss gives nothing more: its line says what is left.
- **N111. A champion** has no column: N21 covers it. It is pushed and thrown half as far;
  where the boss line says "not carried", "not lifted", "not sealed" or "no swap", the same
  holds for a champion with 10% more in place of the 20%. Its controls last their full time.
- **N112. The AI seat** follows N85; the last column adds the one thing it looks for.

| # | Form | On a boss | Beat | Sound | The AI seat casts it |
|---|---|---|---|---|---|
| F1 | Riverbolt | as written | Shot | a quick spit | on a dry foe, on cooldown |
| | Pond-maker | as written | Shot; a small Nova; a pond left | a spit, a fat plop, water rocking twice and lying still | on cooldown, at the pack's feet; beside her water to make it bigger |
| | Wave head | not pushed: 20% more | Shot; then a wide front at range | the passed spit, then a wave getting up far off, breaking, and hissing flat | at the front rank, so the wave takes the ranks behind it |
| | Bouncer | bounces off it like any foe | Shot; Ward on the catch | plinks, rising | with two foes near, or a friend in the pack |
| F2 | Torrent | as written | Shot | the passed blast | when the Crash rule is met on a line |
| | Canal | not swept: the jet deals 20% more | Shot; a running line left on the floor | the passed blast, a fast brook running one way for 6 s, a gurgle as it runs dry | from the pack toward a wall or her big water, so the canal empties its foes there |
| | Part the sea | not thrown: 20% more | Shot; two waves | a zip, then two splashes | on a pack between two walls |
| | Wash | as the base | Shot; Ward on each friend | a soft rush | when a friend on the line is slowed, burning or cursed |
| F3 | Water Whip | not thrown: 20% more | Swing | a whip crack | on a shooter or healer at the back |
| | Dunk | not thrown: 20% more; if it stands in her water the splash still goes out | Swing; a Nova on the water, 3 u | a whip crack, a whoosh overhead, one belly flop and a wide slosh | throws a shooter into the pond the pack stands in |
| | Whip wave | not carried: 20% more | Swing, a half ring | a whip crack drawn out into a wash, a thud of bodies, water running off | sweeps toward a wall, or toward the tank |
| | Rescue | not yanked: 20% more on the whip's 12 | Ward | a soft reel | on a friend under 30% health with foes on it |
| F4 | Skipping Stone | as written | Shot; four small bursts | plunks, each higher | along the longest row of foes |
| | Pond-hopper | as written; it can hit the boss twice | Shot; a zigzag of small splashes over the water | plunks, each a note higher and a little quicker; a deeper one on the last, then the rings dying out | when four or more foes stand in her water |
| | Conveyor | not thrown: each splash 20% more | Shot; four bursts | plunk and whoosh, four times | toward a wall about 5 u off |
| | Drift mines | as written | Placed, small | a slow glug, a pop | ahead of a pack that walks in |
| F5 | Spray | as written | Swing | a hose burst | when two foes are within 3 u |
| | Sweep-in | not washed: 20% more | Swing; a wash toward the water | a hose burst, a long slide over wet stone, a small splash as each foe tips in | when foes stand just outside her water |
| | Drag-in | not dragged: 20% more | Swing, turned back | a wash and a suck | before a Breaker or a Maelstrom |
| | Foam floor | does not slip; its charge is not stopped | Zone pulse | a fizz | across a doorway or a charger's line |
| F6 | Tide Orb | as written | Placed, held | a low hum | rolls it through the pack 1.5 s, then bursts it |
| | Paint | as written | Placed, held; a trail left | a low hum, a brush on wet paper; a soft rush as a loop fills; the base's burst | draws a ring round the pack, or a line from the pack to her other water |
| | Pick-up | not swallowed: the ticks 20% more | Placed, held | a washing tumble | carries three foes to the nearest wall |
| | Guardian orb | as written | Placed, held; Ward | a low hum on the friend | on the tank in a pack |
| F7 | Depth Charge | as written | Placed | a deep thump | holds the full second on a pack |
| | Sleeper | as written | Placed; a line under the water; a Nova, 2.5 u | a plop, a low hum moving under water, a held breath, the blast, rain coming down | into any water that reaches the pack; into empty water on the way foes will come |
| | Slam down | not dragged: 20% more; the stun lasts 0.25 s | Zone pulse, small; then Placed, a fall | a quick swirl, a fall of water, a flat smack | on a loose pack |
| | Raft | as written | Placed; Ward, a floor | a thump, then a creak of bubbles | over a floor bed the friends must fight on |
| F8 | Floodgate | as written | Nova, a beam | a river breaking out | when four foes are in the line, or a boss |
| | Open the gate | as written | Nova, a spreading sheet | a sluice opening, a long rush, one flat slap coming back, then lapping water | toward the pack, when fewer than two pieces of her water are down |
| | Flood crest | not pushed: it takes 8 each 0.25 s as if pressed, and 20% more | Nova, four beams as one | three plops, then a river breaking out | down a corridor or toward a wall |
| | Bubble wave | not sealed: the bubbles burst on it, 4 each 0.25 s, 20% more | Channel, a wave of bubbles; a pop and a drop at the end | a long breath through a bubble wand, a hundred small pops, thumps as they land | down a lane of small foes, away from the party |
| F9 | Breaker | not knocked back: 20% more | Nova | the passed ring | with two foes within 1.4 u |
| | Spreading ring | not carried: 20% more | Nova, as wide as her water; foes riding its lip | the passed boom, rolling on and on, a hiss where it leaves the water, bodies landing | standing in her biggest piece with the pack in it; with a wall beyond its edge |
| | Leap | not knocked back: 20% more | Nova, twice | the ring, a held breath, the ring | from a pack she is in to a pack she wants |
| | Bubble flail | not caught: the three slams ring out from it where it stands, 20% more | Ward, on a foe; three Novas | a glug, three rubbery slams, each with a ring of spray, a pop | on a foe in the middle of a pack |
| F10 | Crashing Wave | not pushed: 20% more | Swing | the passed crash | when the Crash rule is met in front |
| | Roll-up | not pushed: 20% more | Swing; a wave that grows as it runs | the passed crash, swelling instead of dying, breaking late and far, foam hissing out | down the long way of her water, through the pack |
| | Three Crests | not pushed: each crest 20% more | Swing, three times, each wider | the passed crash three times, each lower and longer, the last one hissing out | into the pack with a wall behind it |
| | Faceful | not pushed: 20% more; blinded 0.25 s, and a move it has already shown still lands | Swing | a wet splat | when three or more foes are about to hit |
| F11 | Call the Tide | as written | Nova, one at each piece of water | a deep pull of the tide, then many waves breaking at once | when three or more foes stand in her water |
| | Tide on tide | as written | Nova, one at each piece of water; the edge moving out | the deep pull of the tide, then a second, higher, water running up over stone and sinking in | on cooldown while foes stand in or at the edge of her water |
| | Gathering tide | not thrown: 20% more | Nova at each piece of water, then throws inward | waves breaking inward, bodies thudding together | pointer on a wall or on the thickest pack |
| | Bubbling up | not lifted: it is soaked | Ward on each friend; a lift on each foe | a kettle of bubbles rising, soft pops | when friends fight in her water |
| F12 | Whirlpool | not dragged: the ticks 20% more | Zone pulse | the passed swirl | on the thickest pack |
| | Stir | as written; in its circle, not dragged: the ticks deal 20% more | Zone pulse; the whole piece turning slowly | the passed swirl, and under it a slow wide churn that winds down when the pool ends | where her biggest water meets the pack |
| | Abyss | not swallowed: as the base | Zone pulse, dark | a gulp, a spit | on the thickest pack, before a Crash |
| | Steady water | not dragged: the ticks 20% more | Zone pulse; Ward on friends | the swirl, with a low steady note | under the friends when a foe winds up a slam or a pull |
| F13 | Sky Fall | as written | Ward, a waterfall; Nova at the drop | a steady fall of water, then one heavy drop | on the shooters' line to the party, or on a pack; drops it when three foes are under it |
| | Plunge pool | as written | Ward, a waterfall; a pool spreading; Nova at the drop | a steady fall into deepening water, one heavy drop, a ring running out, lapping | on the pack; drops it when four foes stand in the pool |
| | Ring out | not thrown: 20% more | Ward, a waterfall; Nova, a ring, at the drop | a steady fall, one heavy drop, a ring running out | on the middle of a pack that stands near walls |
| | Return | its shots come back too | Ward, thin | plinks going home | on the shooters' line to the party |
| F14 | Wave Rider | not knocked aside: 20% more | Dash | a rolling wave | through a row of foes to soak them, or out of a corner |
| | Bow wave | not drawn in: 20% more | Dash; a road left | a rolling wave, water sheeting out behind, a last small wash as she steps off | rides a line that joins her ponds, through the pack |
| | Crest | 20% more; flat 0.25 s | Dash; Nova at the break | the wave, a leap, a crash | always takes the second press |
| | Bubble wake | not lifted: 20% more | Dash; Ward on the foes | a wave, then plinks in a row | through a row of foes toward her friends |
| F15 | Clapping Waves | 20% more; the stun lasts 0.25 s | Placed, two waves | a boom | on a spread pack |
| | Pond clap | not carried: 20% more; the stun lasts 0.25 s | Placed; two sheets of water sliding in; a Nova where they meet | two long slides over stone, a boom, a thin jet going up, water running home | at the middle of the pack that stands in her water |
| | Vice | not squirted out: 20% more | Placed, two waves | a boom, a wet squirt | aimed along a wall, on a spread pack |
| | Bang | its wind-up is never broken | Placed | one sharp bang | when two or more foes wind up |
| F16 | Maelstrom | not pulled: 20% more | Nova | the passed spiral and column | with four foes within 3 u |
| | Drain | not dragged: 20% more | Nova; streams running in from the whole room | a plughole roar from every corner, a beat of silence, the column, rain falling on a wet floor | when four or more parts are down and the pack stands in them |
| | Fall slam | not launched: 20% more | Nova; then Placed, a fall, and a ring | the spiral and the column, a held breath, a fall and a slap | as the base |
| | Decoy | it ignores the otter; the burst as written | Nova | a giggle of bubbles, the burst | when three or more foes are on her or on a hurt friend |
| F17 | Ripple Step | as written | Dash, three short; a ring at each landing | three light taps on water, each a note higher | one step out of a blow; all three through a pack to soak it |
| | Water walk | as written | Dash, up to six hops; a wide ring at each landing on water | taps on water, light and quick, each with a wide ring of sound; the last one a soft double splash | through the pack along her water, landing beside the most foes |
| | Kick waves | not pushed: 20% more | Dash, three hops; one wave back along them | three light taps, a slap of tail, one rush of water running away behind her | stepping three times away from the pack that chases her or a friend, then the kick |
| | Bubble hop | not lifted: it is soaked | Dash; Ward on a friend; a lift on a foe | three rubbery boings, rising | to the friend under attack, then off the foe that is hitting them |
| F18 | Bubble Ward | as written | Ward | the passed bubble | today's rule |
| | Spill | as written | Ward; a spurt to each attacker; a pool at the pop | the passed bubble; a squirt at each hit; a long splash when it goes, and lapping | on the friend the pack is hitting, where she wants her next water |
| | Lend a wave | not pushed: the bump 20% more | Ward; Dash | a small wave | on a melee friend who is far from the fight |
| | Hop | as written | Ward | plinks, each higher | when friends stand within 5 u of each other |
| F19 | Rain Squall | as written | Placed, rain | the passed rain | on the thickest pack |
| | Hanging rain | as written | Placed, rain; three drops held still, then Shot, each second; a pool left | the passed rain; each second a small hush, then three quick darts; lapping water after | rain on the pack, stream on the boss or the biggest foe |
| | Spouts | not picked up: the rain as the base | Placed, rain | three whirring spouts, thumps | on the thickest pack |
| | Heavy bubbles | the root lasts 0.25 s | Placed, rain | slow plops | on runners and chargers |
| F20 | Geyser | not launched: 20% more | Placed | a rumble, a blast | under a foe that stands still |
| | Blowout | not launched: 20% more | Placed; a Nova, 3 u, on the water | a rumble under the pond, a blast, heavy rain falling back, then quiet | on her water where the most foes stand within 3 u |
| | Toss | not launched: 20% more | Placed | a blast and a slap | throws toward a wall |
| | Bubble fountain | not launched: 20% more | Placed; Ward | a blast, then glugs | near the friends in a long fight |
| F21 | Water Prison | not sealed: it pops at once, 20% more | Ward, on a foe | a slow glug | on the most dangerous small foe |
| | Sink | not sunk: the 12 at once, 20% more | Ward, on the water; a Nova as they come up | a gulp, bubbles, a wet spit, bodies landing | on the knot of foes in her water that is hitting a friend |
| | Tow | not sealed: it pops at once, 20% more | Ward, on a foe; a Swing at the throw | a rubber squeak, following; a whoosh and a wet pop | pull a dangerous foe off a friend, then throw it at a wall or into the pack |
| | Store | not sealed: it then pays 30% of what was dealt in 1.5 s | Ward, on a foe | a darkening hum, a burst | on the foe the friends are about to burst |
| F22 | Otter Dive | not launched: 20% more | Dash, under the floor | a plunge, a breach | to leave a corner, into a pack she has soaked |
| | Porpoise | not knocked back: 20% more | Dash, under the water; a leap; a Nova that grows with the swim | a plunge, a long quiet under water, a breach, a held note in the air, a great flat slap, drops pattering down | under the pack through her water, leaping onto its middle |
| | Round-up | not swept: 20% more | Dash, under the floor; Nova in the ring | a rush, a wet clap | circles the thickest pack |
| | Water door | as written | Dash, no path | a bulge, a pop | to her water nearest a friend in danger |
| F23 | River's Gift | as written | Ward | a ribbon winding | on the friend that hits fastest |
| | Shared water | as written: the boss is soaked and Crashed like any foe | Ward; a small Crash burst at each of the friend's hits | a ribbon winding; a wet clap on each of the friend's hits; the ribbon unwinding at the end | on the melee friend who fights in her water |
| | Alley-oop | not thrown: the gift as the base | Ward | a splash, a ting on the hit | on the melee friend nearest a pack |
| | Reflection | as written (big skills too) | Ward | the skill again, under water | on the friend whose strongest skill is ready |
| F24 | Tidal Dome | soaked; the slow lasts a fifth | Nova, a dome | the sea from below | over the friends when they are being hit hard |
| | Lagoon | soaked; the slow lasts a fifth | Nova, a dome; five canals running out from it | the sea from below, water running out along stone in five lines, the fall, lapping after | over the fight, when her water or the pack lies spread round it |
| | Pinball | it can leave; soaked | Nova, a dome | wet rings off the skin | on a pack, before her throws |
| | Same boat | soaked; the slow lasts a fifth | Nova, a dome; Ward | a glass bell, a dent with every hit | over the friends when a big hit is coming |

- **N113. Talents and combos on a boss** follow the same lines: one that moves or holds gives
  its 20% instead (a champion 10%). Chain Pop gives nothing there (N32).
- **N114. Styles on a boss.** No style is the boss path now (Jet was). Flood: the boss
  stands in her water: Deep Water's 20%, the Sleeper, Tide on tide every 6 s, the Hanging
  rain's 36 on it, the Drain; Overflow gives nothing on a lone boss and pays on its helpers.
  Tsunami loses its moves there and is paid by R13's 20%, Heavy Swell and the full cast's
  30%. Bubble brings little damage of its own to a boss (Store pays 30% of the team's
  burst): it guards the team (Same boat, Steady water) and lifts the team's damage (Surface
  Tension, Reflection, Store). If her boss damage reads too low in play, the first lever is
  Deep Water's number.

## 12. Every skill and form: its tie to Soaked

His rule of 19 Nov: every skill interacts with the soak. 浸 soaks, 拍 Crash, 湿 more on a soaked
foe, 滑 it moves foes, so a soaked foe goes farther. No cell is empty. All still water soaks
(R12), so a Flood form that leaves water has 浸 for as long as the water lies.

| # | Skill | Base | Flood 涨潮 | Tsunami 海啸 | Bubble 泡沫 |
|---|---|---|---|---|---|
| F1 | Riverbolt | 浸 湿 | Pond-maker: 浸, and the pond | Wave head: 浸 湿 滑 | Bouncer: 浸 |
| F2 | Torrent | 拍 | Canal: 拍; 浸 滑 (the canal sweeps to its end) | Part the sea: 拍 滑 | Wash: 拍 |
| F3 | Water Whip | 浸 湿 滑 | Dunk: 浸 滑, her water within 3 u | Whip wave: 浸 湿 滑 | Rescue: 浸 滑 |
| F4 | Skipping Stone | 浸 湿 | Pond-hopper: 浸, each foe it hunts | Conveyor: 浸 | Drift mines: 浸 湿 |
| F5 | Spray | 浸 湿 | Sweep-in: 浸 湿 滑 | Drag-in: 浸 湿 滑 | Foam floor: 浸 湿 |
| F6 | Tide Orb | 浸 拍 | Paint: 浸 拍; 浸 (the trail) | Pick-up: 浸 拍 滑 | Guardian orb: 浸 拍 |
| F7 | Depth Charge | 拍 | Sleeper: 拍, 2.5 u | Slam down: 拍 | Raft: 拍 |
| F8 | Floodgate | 拍 | Open the gate: 拍; 浸 (the sea, and its slap back) | Flood crest: 拍 滑 | Bubble wave: 拍 (the pop at the end), 浸 (after it), 滑 |
| F9 | Breaker | 拍 滑 | Spreading ring: 拍 滑, carried out of her whole piece | Leap: 拍 滑 | Bubble flail: 浸 (the catch), 拍 (the third slam), 浸 (the pop) |
| F10 | Crashing Wave | 拍 滑 | Roll-up: 拍 滑, as far as her water goes | Three Crests: 滑 three times, 拍 (the third) | Faceful: 拍 滑 |
| F11 | Call the Tide | 拍, on every foe in her water | Tide on tide: 拍, every 6 s; 浸 (the rim) | Gathering tide: 拍 滑 | Bubbling up: 浸, they land soaked |
| F12 | Whirlpool | 浸, again after a Crash | Stir: the same, through the whole piece it touches | Abyss: the same | Steady water: the same |
| F13 | Sky Fall | 浸 拍 | Plunge pool: 浸 拍, the whole pool | Ring out: 浸 拍 滑 | Return: 浸 拍 |
| F14 | Wave Rider | 浸 滑 | Bow wave: 浸 滑; 浸 (the road) | Crest: 浸 拍 | Bubble wake: 浸 (pops) |
| F15 | Clapping Waves | 拍 | Pond clap: 拍 滑 | Vice: 拍 滑 | Bang: 拍 |
| F16 | Maelstrom | 拍 | Drain: 拍 滑 | Fall slam: 拍 滑 | Decoy: 拍 |
| F17 | Ripple Step | 浸, at every landing | Water walk: 浸, 3 u on her water | Kick waves: 浸 滑, one wave at the last landing | Bubble hop: 浸, foes land soaked |
| F18 | Bubble Ward | 浸 (pop) | Spill: 浸 (the puddles, the pop, the pool) | Lend a wave: 浸 滑 | Hop: 浸 (each pop) |
| F19 | Rain Squall | 浸, 8 s | Hanging rain: 浸, 8 s, the pack and its target; 浸 (the pool) | Spouts: the same | Heavy bubbles: the same |
| F20 | Geyser | 浸 湿 | Blowout: 浸, her water within 3 u | Toss: 浸 湿 滑 | Bubble fountain: 浸 湿 |
| F21 | Water Prison | 拍 浸 | Sink: 拍 浸, up to four foes | Tow: 拍 浸 | Store: 拍 浸 |
| F22 | Otter Dive | 浸 | Porpoise: 浸 滑, at the landing | Round-up: 浸 | Water door: 浸 |
| F23 | River's Gift | 浸 | Shared water: 浸 拍 (the friend's small Crash) | Alley-oop: 浸 滑 | Reflection: 浸 |
| F24 | Tidal Dome | 浸 拍 | Lagoon: 浸 拍; 浸 (the canals and their puddles) | Pinball: 浸 拍 | Same boat: 浸 拍 |
| F25 | Tidepool | 浸 | | | |
| F26 | Home Waters | 湿 | | | |

- The basic attack: the tsunami is 拍 then 浸 in every style; Flood's puddle soaks.
  The dash: 浸 (the wet path).
- Forms that drop the base's 湿 line say so in section 10: the Pond-maker, the Pond-hopper,
  the Bouncer, the Conveyor. The Dunk always lands its foe flat.
