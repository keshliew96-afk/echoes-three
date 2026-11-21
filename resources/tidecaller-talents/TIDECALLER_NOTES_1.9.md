# Tide Caller: design notes

**Version 1.9, 2026-11-19. Design only.** The details behind `TIDECALLER_KIT.md` (lines R, T,
F, C). Every line here has a number. All numbers are first guesses until measured in play.

## 1. The ask and how I read it

- **N1.** Kesh, 2026-11-19 00:02 and 00:03 Singapore time, before he slept: "can you
  continuously complete the goal, which run audit and review and make it insanely detailed,
  until it have score 9 out of 10", and "You can also work at other hero, if there is any
  changes, I will give feedback tomorrow". The Tide Caller is the next hero after Duskwing.
- **N2. He has not given her styles.** For every other hero he gave three play styles and the
  elements first. Here the three styles are mine (kit pick 1), so the whole kit is a proposal
  that may be redone when he answers.
- **N3. Where the three styles come from.** Each grows out of something he already passed or
  that is in the game:
  - Jet 水刀: her held stream (his basic attack ask of 13 Nov).
  - Surge 狂澜: her tsunami (the same ask, and his drawing of its fixed width).
  - Bubble 泡沫: Bubble Ward, the one skill she has today that helps a friend.
  They also follow the template's pattern: tempo (a stream that never stops), weight (few big
  waves), conversion (her water becomes protection).
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
- **N8. Her place in the team.** She is the one who bends the fight: she gathers, moves and
  holds the foes so the other heroes' skills land, and in the Bubble style she guards them.
  Mosslight has no shield and Stonehide gives himself none, so bubbles do not repeat anyone.
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
  - Boss: the status only: no slow, never moved. It is there so that Crash, the 湿 lines and
    Pressure work on a boss.
  - I read "value" as the soak's own effects (the slow and the slide). A Crash keeps its 60%
    on every foe.
  - A fixed path does not stretch (the list in N25). With Rolling Tide the two add: 90%.
  - A soaked foe's hits take only half from a bubble (an elite's or champion's three
    quarters; a boss's all).
  - A Frozen elite still cannot be soaked (today's affix rule).
- **N11. The three tags.** Every pressed skill has at least one; the table in section 12
  shows every skill and form.
  - 【浸】 soaks: Riverbolt, Water Whip, Skipping Stone, Spray, Tide Orb, Whirlpool,
    the Tidal Wall (a foe that walks through), Wave Rider, Ripple Step's ripples and puddles, Bubble Ward's
    pop (every bubble's pop), Rain Squall, Geyser, Water Prison's pop, Otter Dive's splash,
    River's Gift, the Tidal Dome, Tidepool, the tsunami (after its Crash) and the wet path of
    the dash. The stream does not soak, so the basic attack never does the whole job.
  - 【拍】 Crash: N12.
  - 【湿】 more on a soaked foe, and the soak stays: Riverbolt (goes on through it), Water Whip
    (it lands flat), Skipping Stone (one more skip), Spray (drenched), Geyser (twice as
    high), Home Waters (wet footprints). Also the slide, the Jet Pressure rule and the
    bubble rule of N10, which every style feels without a skill.
  - Whirlpool soaks a foe again at once after a Crash; the rain's soak lasts 8 s.
- **N12. What Crashes.** Twelve skills of 24: Torrent, Tide Orb's burst, Depth Charge, Call the Tide,
  Floodgate, Breaker, Crashing Wave, the Tidal Wall's fall, Clapping Waves, Maelstrom, Water
  Prison's pop, the Tidal Dome's end. Three are big. The tsunami Crashes too (so the basic
  attack pays off a soak in Surge and Bubble), and so does the Sea Dragon (T13). A Crash
  deals its damage first and spends the soak after; a skill that both Crashes and soaks
  (the tsunami, Water Prison's pop) soaks after the Crash.
- **N13. The Crash by style** (R5). Jet: her stream builds Pressure twice as fast on a soaked
  foe (2 a second), and a cast that crashed gives 1 Pressure (once a cast, not once a foe):
  she chooses between keeping the foe wet and spending it. Surge: the splash soaks the foes
  within 1.5 u, so the next Crash has targets. Bubble: an 8 bubble for 4 s on the friend
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
  its count and its Pressure. One Jet form is made of the stream and does not pause it: the
  Full circle. Under Jet her Ripple Steps do not pause it (the Water double).
- **N17. Slam 拍岸** (R9). 附加伤害, never a hit. One rule for every skill and form.
  - Into a wall or pillar: 10 and a 0.5 s stun. It needs 1 u of travel.
  - Into another foe: 6 to both, no stun.
  - A foe is slammed at most once a second, whatever slams it.
  - Only a throw, a push or a carry that ends can Slam. The rain itself never does, and the waves of Call the
    Tide do not move a foe (its Surge form throws, and can). The Spouts' drop is a throw.
  - Walls: room walls, pillars, Stonehide's slab and Stone Ring, the Pinball dome's skin, and
    the floor under Slam down. Her Tidal Wall is water: foes pass through it.
  - Windbriar's Wall slam (her combo C2) is the same wall rule; her kicked foes do not hurt
    other foes.
- **N18. Held 浮空** (R10). A foe that is afloat (in a bubble, or launched), carried (the
  Pick-up, the Bubble wave, the Tow, a Spout, the Vice) or swallowed (the Abyss)
  cannot act and keeps its target. Everyone can hit it. Afloat, it hangs 0.6 u up, turning
  slowly; for Duskwing it counts as stunned.
  - The cap: no hold lasts over 2 s on a small foe, 1 s on an elite. When a hold ends, that
    foe cannot be held again for 2 s (it can still be pushed, thrown and Slammed).
  - A launch (Geyser, the whale, Otter Dive's breach) is under 1.3 s. The foe is afloat (T3
    counts it) but it is not a hold for the cap.
  - Stuns and knock-flats are under the formula's stun guard (D38); the end of a hold starts
    that guard too, so a hold cannot be chained into a stun.
- **N19. Bubbles** (R11). A shield, one layer for each skill (formula D33): the same skill on
  the same friend replaces its layer with the larger one and starts its time again. Bubbles can
  crit as shields do (D30). The pop soaks within 1 u; under T3 it also deals 6 within 1.5 u. A
  bubble that is replaced does not pop.
- **N20. Her water** (R12). The wet path, puddles, pools, rain,
  wet footprints and the dome. Each is
  drawn as a wet floor with a pale foam edge, so the player can see where Home Waters, the
  Water door, Call the Tide and the combos C2, C4, C9 and C10 work.
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
  - Held skills: Tide Orb; Depth Charge (the base, the Torpedo and the Raft; Slam down has no
    hold); Otter Dive; Clapping Waves under Surge (the Vice).
  - Drawn with the pointer: Otter Dive under Surge (the
    Round-up ring).
  - Second presses: the Tidal Wall's fall (the Sea fall too); Wave Rider under Jet (the second
    rocket) and under Surge (the Crest); Ripple Step (its second and third steps); Water Prison under Surge
    (to throw the Tow); Whirlpool under Surge (to spit the Abyss out); Floodgate under Jet
    (to call the staff back).
  - On a pad the pointer is the aim stick's reticle, which reaches 6 u from her. "The foe
    nearest the pointer" is the foe nearest the reticle; a drawn line is drawn with the stick;
    a skill on a friend takes the friend nearest the reticle. The Water door's reticle jumps
    to her water.
  - In co-op a timed press (the Crest) is judged on her own screen.
- **N23. Friends.** "Friend" means another hero, a player or an AI seat. Aim rule: audit G13.
  No skill of hers moves a friend (N98).

## 3. Talents in full

### Tier I, Style (free)

- **N24. T1 High Pressure 高压 (Jet).** Every skill takes its Jet form. Pressure: 1 for each
  second the stream runs (2 on a soaked foe), up to 5, each 10% more stream damage. At 5 the stream is the water
  blade for 3 s: 6 u, through every foe, double damage in place of the 50%; then Pressure is 0
  again. No tsunami (pick 3). Pressure holds 1.5 s with the stream off, then falls 1 a second.
  The trade: nearly all of her damage sits on one line, and she gathers nothing.
- **N25. T2 Rolling Tide 涌潮 (Surge).** Every skill takes its Surge form. Her pushes, pulls
  and throws move the foe 40% farther. A path with a fixed end is not changed: the Conveyor's
  spots, the Tow's rope, the Round-up, the Swap, the Spouts, the Roll call's trip. The Tow's
  throw is a throw. Slam is
  doubled: 20 on a wall, 12 foe on foe. The trade: her waves scatter what they do not slam;
  she needs walls, pillars or a pack.
- **N26. T3 Bubble Blower 吹泡泡 (Bubble).** Every skill takes its Bubble form. A foe afloat
  takes 20% more from everyone (易伤). Every bubble that pops, a friend's or a foe's, deals 6
  within 1.5 u (附加伤害) and soaks; a foe takes this at most once a second. The trade: her own
  damage is the lowest of the three.

### Tier II, Power (20 Embers)

- **N27. T4 Erosion 水滴石穿.** Each hit of hers on a foe within 2 s of her last hit on it deals
  3% more than the one before, up to 30% (增伤区). The stream reaches it in 2 s.
- **N28. T5 Heavy Swell 重浪.** A skill that pushes, pulls, throws, carries or launches deals
  25% more to the foes it moves (增伤区). A boss counts as moved.
- **N29. T6 Surface Tension 张力.** Every skill she casts leaves a 4 bubble on her for 3 s (one
  layer: a new one replaces it, D33). Her bubbles are 30% larger (护盾加成区). A friend with
  one of her bubbles deals 15% more (增伤区); she counts as a friend.

### Tier III, Trick (40 Embers)

- **N30. T7 Fork 分流.** The stream forks at the first foe to one more foe within 2.5 u of it,
  for half. Riverbolt, Torrent, Skipping Stone and Depth Charge fire a second copy at another
  foe within 4 u of the first, for half: the copy does the form's damage and nothing else (no
  shove, no tag, no bubble). A form that no longer shoots a foe (Wash, the Raft, Slam down)
  gets no copy. The copies are 附加伤害.
- **N31. T8 Backwash 回潮.** Only after a push or a throw that leaves the foe 1.5 u or more
  farther from her than it was: 1.5 s later a thin sheet of water runs back the way it came
  and the foe is dragged 60% of the way back and soaked. Never after a pull, a gather, a
  carry, a swap or a launch, so it does not undo the Drag-in, the Abyss or the
  Round-up. It can Slam on the way back (N17's once a second holds). A drag back never starts
  another Backwash. A foe nailed by the Pin is dragged when the nail ends.
- **N32. T9 Chain Pop 连环泡.** A Crash lifts each soaked foe it crashes in a small bubble for
  0.6 s (the lift comes after the Crash's damage). When any bubble of hers pops (a small one,
  a friend's, a prison), each foe within its pop that was already soaked before the pop is
  lifted the same way. A foe is lifted this way once every 3 s (N18's cap also holds). On a
  champion or a boss: nothing.

### Tier IV, Reach (60 Embers)

- **N33. T10 Long Stream 长流.** The stream, bolts, jets and beams reach 30% farther; bolts and
  stones fly 40% faster.
- **N34. T11 Wide Water 浩荡.** Waves, rings, walls and whirlpools are 30% wider.
- **N35. T12 Deep Breath 长息.** The wet path, puddles, pools, rain, bubbles and the
  dome last 30% longer. Holds on foes do not (N18's cap).

### Tier V, Capstone (80 Embers)

- **N36. T13 Sea Dragon 水龙.** A coiled dragon of water on the staff fills with every second
  the stream hits a foe; 8 s fills it, and it is kept through the room. The next skill she
  casts is followed, 0.3 s later, by the dragon along her aim: 10 u, 1.5 u wide, through
  everything: 60, a Crash on each soaked foe. The dragon's Crash feeds nothing: not Pressure,
  not the next Dragon, not the Great Wave's count.
- **N37. T14 Great Wave 巨浪.** Every third cast that crashes at least one soaked foe: the sea
  rises behind her and one wave crosses the whole room along her aim: 24 to every foe, carried
  3 u, soaked. The wave is not a Crash and does not count toward the next. (Named Great Wave so
  that it is not mixed up with the basic attack's tsunami.)
- **N38. T15 Lifebubble 救生泡.** A hit that would down a friend or her instead leaves them at 1
  health inside a great bubble: untouchable 2 s, then a 30 bubble for 4 s. The great bubble
  pops: 30 within 3 u, launched 1 s. One clock for the team: 40 s.

### Checks

- **N39. Every talent works alone.** T1 to T3 need nothing. T4, T7, T10 and T13 read the
  stream, which she always has. T5, T8, T11 and T14 read moves and Crashes, which the base
  tsunami and base skills give. T6 brings its own bubble (every cast), T9 starts from any
  Crash, and T12 always has the wet path of the dash to lengthen. No talent needs a certain
  skill.
- **N40. Tier jobs.** No two talents of one tier push the same lever: II is three different
  damage conditions; IV is length, width and time.
- **N41. Budget** (docs/TALENTS.md: tier I about 20% more output in its style, one whole path
  about 50%, no mix above 70%).
  - T1: the basic attack is about 15.6 a second with the tsunami. Under Jet, with one Crash
    cast every 6 s, a cycle is about 4 s of climb and 3 s of blade: about 24 a second, 55% more
    basic output on one line, and no tsunami. The basic attack is near half of her damage, so
    about 25% overall. A little over; the first cut would be the blade's 3 s.
  - T2: a wall Slam goes from 10 to 20. A Surge cast that reaches a wall adds about 20 a foe,
    and foe on foe 12, each foe at most once a second (R9). In a room with walls
    about 20 to 25%. On a boss it is worth nothing by itself, which is why Heavy Swell counts a
    boss as moved.
  - Kit 1.1's soak: Pressure at 2 a second on a soaked foe puts the blade up about a third
    more often; the tsunami's Crash adds about 17 to a soaked foe each 6.6 s; the slide adds
    to T2. All three push the budget up and are the first numbers to cut.
  - T3: 20% 易伤 on afloat foes for the whole team is the largest number here. It is held back
    by how short a float is (0.6 to 1.5 s). The pop's 6 is capped at once a second a foe.
  - Erosion with the water blade and Long Stream is her highest steady damage; Heavy Swell with
    Backwash and the Great Wave her highest burst. Both are inside 70% on paper.
- **N42a. Three example builds** (four skills each, to see the styles play).
  - Jet: Riverbolt (Homing), Torrent (Sever), Rain Squall (the Hanging rain soaks the pack while its
    drops hit what the stream is on), Tidal Dome (the Duel). The loop: shut the boss in, tag it, hold the stream, the
    rain soaks it, Crash it, cut.
  - Surge: Spray (Drag-in), Crashing Wave (Overhead), Tidal Wall (the Sea fall), Maelstrom
    (the whale). The loop: gather, throw at a wall, Crash, and every third Crash is a Great
    Wave.
  - Bubble: Bubble Ward (it hops), Whirlpool (Steady water), Water Prison (Store the team's
    burst), Tidal Dome (Same boat). The loop: guard, lift, let the friends hit, pop.
- **N42. Mixes worth trying.** Jet style with Chain Pop (the Sprinkler soaks a pack, the Domino
  Crashes through it, and every foe it crashes is lifted); Surge style with Chain Pop (every Crash splash
  meets a pop); Bubble style with Erosion and Sea Dragon (a guarded turret).

## 4. The basic attack and the dash

- **N43. Base.** Today's Spit is 6 each 0.35 s (17 a second). The stream is 15 a second and the
  tsunami adds 28 each 6.6 s: about the same, with a wave. The tsunami is a Crash, then it
  soaks.
- **N44. Jet.** N24. The stream thins and brightens with each point of Pressure; at 5 it is a
  hard white line with a hiss, and cuts a wet score in the floor.
- **N45. Surge.** The tsunami comes after 3 s and carries small foes to its end (6 u). Its
  width stays the passed 1.3 u (his own correction on the model page); Wide Water widens it. She streams less and heaves more: about half of her basic output is the wave.
- **N46. Bubble.** The stream carries a string of bubbles, from the staff as passed: same
  damage and reach. A small foe hit by it for 2 s without a break floats 1 s.
  The tsunami is a roll of foam: it hits as the base and leaves a 10 bubble (4 s) on each
  friend it passes.
- **N47. The dash** is the passed one (the tide she rides is 0.95 u high, 1.17 u at the crest).
  The wet path lasts 3 s: 30% slower and soaked. Jet: she turns on the board of water and keeps
  the stream on her target for the whole ride. Surge: the tide does not sink when she steps
  off: it rolls on 3 u, 1.3 u wide: 10, pushed 1.5 u. Bubble: the crest closes over her as a 10
  bubble for 3 s.

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
- **N53. The styles' looks.** Jet: thin, hard, straight lines; wet scores cut in the floor; a
  hiss. Surge: thick rolling fronts with a curling Sea Foam crest; the floor is left wet and
  flat; a low roar. Bubble: round, slow, wobbling; rim lights; soft plinks and one clean pop.

### Stream

- **N54. Riverbolt** (Point, 0.45 s; today's). A flick from the hip; a twisting bolt with a foam trail and a splash crown. Jet: the tagged foe carries a small turning ring, and her stream bends to it like a hose swung round a corner. Surge: the bolt is a round fist; each foe stops dead as the next one leaves, like beads on a wire. Bubble: it leaves the staff's shell tip as a wobbling bubble, bounces with a plink each time, and settles on a friend like a hat.
- **N55. Torrent** (Point, 0.44 s; passed). The staff levelled, a braced stance, a shock ring at the muzzle. Jet: the jet is a flat sheet on edge; a foe it finishes parts into two splashes. Surge: the jet opens like a zip and two low waves peel the foes off to the sides. Bubble: the jet is wide and soft; each friend it passes through shakes like a wet dog and shines for a moment.
- **N56. Water Whip** (Sweep, 0.6 s). She coils round the staff and unwinds: a ribbon of water cracks out, wraps the foe's middle; she turns her whole body and the foe is carried over in an arc to the pointer. Jet: the ribbon goes straight and stiff, a lance on the foe's chest; the foe's feet leave the floor and it is held flat on the wall. Surge: one full turn on her toes with the foe swung flat at the ribbon's end, tail out for balance, then the let-go. Bubble: the ribbon loops the friend once, becomes a bubble, and its free end cracks the foes off them like a tablecloth trick.
- **N57. Skipping Stone** (Point, 0.5 s). She flicks a flat disc of water off the staff's tip, low and side-on: four skips, each with a round splash and a plink higher than the last. Jet: one skip and it cracks into a foe's brow; the foe's head snaps back. Surge: each crown tosses its foes in a low arc to the next crown. Bubble: each splash blows a slow bubble that drifts off looking for a foe.
- **N58. Spray** (Sweep, 0.4 s). She turns the staff so its shell tip faces flat, like a hose nozzle, and sweeps: a flat fan with a rainbow edge. Jet: a flick of the left paw: where her stream strikes, the water flies off the foe in a spinning wheel of arcs, like a lawn sprinkler, wetting everyone round it; the foe in the middle drips. Surge: she flings the fan up and over; it lands behind the pack and washes back to her feet with the foes sliding on it. Bubble: suds stay on the floor; a foe that runs on them goes head over heels.
- **N59. Tide Orb** (Bloom, hold). A ball of water rises off the staff's shell tip; it follows the pointer like a balloon on a string, the left paw pointing the way. The burst is a round crown. Jet: she slaps it away with her tail; it flattens to a disc and rings off the walls. Surge: foes inside it turn over and over like washing; she throws it open. Bubble: the orb settles over the friend like a glass bell; foes that touch it are slapped by small tongues of water.
- **N60. Depth Charge** (Bloom then the heave, hold). Water gathers on the staff's tip into a ball as big as she is; she heaves it; it wobbles over the pack and drops with a deep thump and a column. Jet: she tips the staff down and the ball slides off its tip into the floor; a V-shaped wake races across the floor, bends after its foe, and the ball bursts up under it in a column. Surge: she points up; a sheet of water falls in a line and the foes are pressed flat under it. Bubble: the column settles into a quilt of bubbles; friends' feet sink a little into it and the fire under it shows through, harmless.
- **N61. Floodgate** (Plant, 2 s). She drives the staff into the floor and leans back on it, tail braced on the floor behind her: the floor cracks open in front and a river comes out as one beam. She turns by walking round the staff. End: the shake. Jet: she drives the staff in and steps away, one paw trailing off it; it stands humming, hosing its line; at the end it pulls free and hops back to her side, and she lays her paw on it. Surge: the river is as wide as a door and foes tumble in it; she leans on the staff and walks the river round. Bubble: the planted staff's shell tip opens like a bubble wand; she puffs her cheeks and blows across it (no paw to her mouth): a rolling wave of bubbles pours down the line, the big ones swallowing foes and tumbling them along; at the end they pop in a row and the foes drop on their backs.

### Wave

- **N62. Breaker** (Plant, 0.5 s; today's). A hop, the staff's butt down; a ring wall of water breaks outward. Jet: she plants one foot and spins a full turn, staff level, the stream whipping round her like a ribbon dancer's ribbon; it ends on her aim with a small skid. Surge: the ring wall lifts her on its crest; she curls nose to tail, turns once in the air and lands flat on her belly in a second ring. Bubble: three bubbles pop out of the ring and circle her, each wobbling when it eats a hit.
- **N63. Crashing Wave** (Sweep, 0.46 s; passed). The trunk turn and the curling wall. Jet: a bulge runs down the stream like an egg down a hose and bursts on the foe; smaller bulges hop on from wet foe to wet foe. Surge: she swings the staff up and back over her shoulder like a fishing rod; the wall of water arcs over her with the foes in it. Bubble: the wall is all foam; foes come out of it with white beards over their eyes, swinging at nothing.
- **N64. Call the Tide** She lifts the left paw slowly, palm up, as if raising the sea on a string: every wet patch on the floor swells, stands up as a small wave and breaks where it stands; a ring of tide rises round her feet. Jet: the left paw points at the foe: each wet patch lifts a thin jet that arcs in to it, one after another, from every side. Surge: the left paw sweeps to the pointer: every wave leans that way as it breaks and flings its foes toward the spot. Bubble: the left paw wiggles upward: the wet patches fizz like soda and bubbles rise under everyone standing in them: foes go up, friends are wrapped.
- **N65. Whirlpool** (Plant, 0.4 s; passed). Spiral caustics, foam lines running in. Jet: she stirs the staff's tip once and the pool opens; where her stream touches a foe a small whirl opens under its feet, it drops through with its arms up, and bobs up in the pool. Surge: the centre is a dark hole; foes go under; at the end one spout spits them out in a heap. Bubble: the pool's rim turns but its middle lies glass-flat; friends in it stand with a ring of still water round each foot.
- **N66. Tidal Wall** (Bloom, 0.6 s). She lifts the staff slowly, tip up, as if raising a heavy curtain: a wall climbs out of the floor, fish-tank clear, with shots stuck in it. The fall: she tips the staff forward and it topples as a wave. Jet: a clear pane rises at her nose; she leans into the stream, knees bent, and the pane slides away like a puck on ice, shots thudding into it; it shatters on a big foe. Surge: the wall keeps climbing and its crest curls forward, foaming; its shadow creeps out over the floor to show where it will land. On the press she chops the left paw down and the whole wall topples and slaps flat, a white sheet racing to its far edge. Bubble: thin as a soap film, with slow colours; each shot it catches turns in a small bubble and drifts home.
- **N67. Wave Rider** (the ride, 1.5 s). She hops, a wave lifts under her, and she rides it on her belly (the passed slide), the staff in her right paw pointing ahead, leaning into each turn. Jet: the staff points backward, a blast, and she is a streak on her belly along the floor. Surge: she stands up at the crest; on the press the wave folds and breaks under her feet. Bubble: she rides low and fast; behind her the foes rise one after another like corks.
- **N68. Clapping Waves** (Plant, 0.7 s). She drops the staff's tip to the floor in front of her; two walls rise far apart to the sides and run in to meet with a boom and a tall thin fin of spray. Jet: two lines cross and the crossing flashes. Surge: she holds the staff down on the floor and leans on it, shaking, the foes squeezed; she lifts it and they shoot out like a pip. Bubble: two fat bubbles roll in and burst on each other with one sharp bang; the foes' wind-up marks break.
- **N69. Maelstrom** (the coil, 1.6 s; today's, grown). She spins on the spot with the staff out, the room's water running to her feet in a spiral; one beat of stillness; a column goes up. End: the shake. Jet: the spiral closes to a point under one foe and a single needle of water goes up through it. Surge: the column is a whale: it rises nose first, hangs, and falls flat with a ring. Bubble: she spins and the water keeps her shape as she slips out of its back; the copy waves its staff and wobbles at each hit.

### Spring

- **N70. Ripple Step** (Step, 0.2 s a step). Three light hops on the water, knees bent, tail out for balance: she barely touches the floor; a ripple ring spreads from each landing and settles into a puddle. The belly slide passed on her model page stays as Home Waters' slide. Jet: each hop leaves a clear water otter standing where she was, in her last pose, staff out, pouring a thin stream at the same foe; they wobble like jelly and fall as a splash when the time ends. Surge: she and the foe each sink into a splash and come up out of the other's; the foe lands on its back in her puddle. Bubble: a bubble swells on the head she aims at; she springs onto it feet first, knees bent, it squashes like a trampoline and throws her on; a friend's bubble slides down round them, a foe's lifts it off its feet.
- **N71. Bubble Ward** (Bloom, 0.4 s; today's). The held bubble and its pop. Jet: a thin jet snaps out of the bubble at whoever hit it. Surge: the friend's feet are on a small board of water. Bubble: the pop jumps as a smaller bubble with a rising plink.
- **N72. Rain Squall** (Point up, 0.5 s; today's). Clouds, streaking rain, ripple rings. Jet: the passed cloud and falling streaks. Each second three drops stop dead high in the rain and hang, glinting; a second later they stretch into needles, turn together and streak into the foe her stream is on. She only keeps streaming: no extra move. Surge: three thin spouts walk about under the cloud like drunks; each plucks a foe, whirls it and lets it fall on a neighbour. Bubble: bubbles fall slowly, stick on the foes and weigh them down.
- **N73. Geyser** (Plant, 0.5 s). The staff's butt taps the floor twice; a round wet mark shivers (the warning, in her colours since it is hers); a white column. Jet: she taps the floor between her feet and rides the column up standing, tail wrapped round it. Surge: at the top a hand of water bats the foes away. Bubble: after the column the vent keeps burping; each bubble wobbles off and settles over a friend.
- **N74. Water Prison** (Bloom, 0.5 s). One slow bubble leaves the staff's shell tip; it drifts, swallows the foe, lifts it; the foe paws at the skin. Pop: a crown. Jet: the bubble swells and whitens as the stream goes in, the foe pressed flat to its skin; then it goes. Surge: a ribbon runs from the staff's butt to the bubble; it bobs after her and bumps her tail when she stops. On the second press she turns once with the rope over her head, like a hammer thrower, and lets the bubble fly to the pointer. Bubble: the skin darkens with each hit it stores, then bursts from inside.
- **N75. Otter Dive** (the dive, hold). The nose-first arc into the floor; a V-shaped ripple runs where she swims; the breach: she comes out spinning, arms tucked, in a column. End: the shake. Jet: she breaches behind it with a half twist; the foe keeps swinging at the ripple where she was. Surge: the V-ripple draws a white ring; when it closes the water inside drops and rushes to the middle with the foes. Bubble: no ripple: a pool somewhere else bulges and she is there.
- **N76. River's Gift** (Point at a friend, 0.4 s). A ribbon of water runs to the friend's weapon and winds round it; each hit throws a small splash. Jet: the stream curls once round the friend's weapon and leaves along it; the friend does not flinch. Surge: a ring of water turns round the friend's feet; a foe that lands in it sits down hard. Bubble: the friend's next skill is followed by its own shape in clear water, a half beat late.
- **N77. Tidal Dome** (the coil and Bloom, 1.4 s). She winds up and throws both paws up: a dome closes from the floor upward, its skin moving like the surface of the sea seen from below. The end: it drops in on itself. Jet: the dome snaps shut round the two of them; small foes press their faces to the skin from outside. Surge: foes that hit the skin ring off it like marbles in a bowl. Bubble: the dome's skin dents and rings with every blow it takes for them; cracks of light run over it before it falls in.
- **N78. The passives and capstones.** Tidepool: today's ripples at her feet. Home Waters: on
  her own water she drops to her belly and slides, the belly slide passed on her model page. Sea Dragon: a
  coil of water on the staff grows scales one by one; it leaves with a roar of water. Great
  Wave: the far wall darkens, the floor wets toward the foes, then one wall of water with a
  full crest. Lifebubble: the fall stops in mid-air, a bubble with a bright rim; a held
  breath; the pop.

## 6. The damage formula (v1.2) on her kit

- **N79.** Types (formula D3 to D7):

  | Her line | Type | A hit? | Form for 抗性 |
  |---|---|---|---|
  | the stream, bolts, jets (Domino, Hundred rivers, the Hanging rain's needles, the Planted staff), the whip, stones, the rocket | 常规直伤 | yes | ranged |
  | the tsunami, waves, rings, bursts, lobs, Floodgate, Funnel, the Full circle, the Ram's break, the dragon, the Great Wave (T14) | 常规直伤 | yes | area |
  | Whirlpool, Rain Squall (under the Hanging rain too), the Sprinkler, puddles | 持续伤害, in a zone | no | DoT |
  | the Flood crest, the Guardian orb's ticks | 常规直伤 | yes | area |
  | Slam, a pop's 6 (T3), Fork's copies, the Water doubles' streams, Return's shots, Lend a wave's bump | 附加伤害 | no | area or ranged |
  | Sever's cut (the health left), Store's pay-out (the store) | 真实伤害 (D23.3, D23.4) | no | |
  | bubbles, the Same boat dome | shield, a layer per skill | | |

- **N80.** Zones:
  - 基础伤害区: every card number; Crash's 60%; the Meeting point's 50%; Funnel's 10 a foe;
    the Pressure cell's 9 a pump; the water blade's double (it is written on the basic attack).
  - 增伤区 (all add): Pressure, Erosion, Heavy Swell, the 20% on a boss and the 10% on a
    champion she cannot move (R13, audit G27), Surface Tension's 15%, Sever's 30% on a big foe,
    the Alley-oop's 30% for the friend.
  - 易伤区: a foe afloat under T3 (20%).
  - 减伤区: the dome's 25% for friends.
- **N81. Why this fits.** Small foes have no defence, so Surge and Bubble lose nothing in rooms.
  Elites, champions and bosses have defence (25, 40, 50). Jet has no lever on defence: it
  wins there by time on target (Pressure, Erosion, the Planted staff) and by the one execute
  (Sever).
- **N82. 控制.** Soaked, the slows, the stuns (Slam, Headshot, the Abyss's pile, Clapping
  Waves, the Alley-oop), the blind (Faceful), the roots (Heavy bubbles, the Pin's nail), the
  lost aim (Flank) and the knock-flats (the Crest, the Swap, the Foam floor) follow D35 and
  the stun guard of D38. On a boss they last a fifth as long, never under 0.25 s (D37), and a
  boss takes one hard control every 5 s (D40.3). Every boss line in section 11 is already
  written with that floor. Pushes, pulls, carries, launches and floats are movement: 效果抵抗
  does not shorten them; N18 and N21 do.
- **N83. Zones lock** her 增伤 when they are cast (D26). Erosion does not grow from zone ticks.
  A Crash is always a hit, never a zone tick.
- **N84. Shields.** Bubbles follow D30 to D34: they can crit, they add across skills, each has
  its own time, and a break is an event (the pop hangs on it).

## 7. AI seat, sound

- **N85. AI seat, all styles.** The Archer's stand-off and kite, as today. It holds attack on
  the nearest foe that is after a friend. It soaks first, then Crashes when two soaked foes are
  in reach, or one soaked elite, champion or boss (today's rule).
  - Jet: it keeps the stream on the biggest foe; it never lets Pressure fall for a small one.
    It keeps that foe soaked while Pressure climbs and Crashes it when the blade is up.
  - Surge: it looks for the nearest wall, pillar or pack and throws foes at it; it never moves
    a foe the tank holds unless that foe would hit a wall.
  - Bubble: bubbles go to the friend foes are after, the tank last (today's rule); it keeps the
    Tidal Dome on the friends, not on the foes.
  - It never Swaps, Leaps or opens a Water door onto a floor warning or a bed (G17).
- **N86. Sound.** The stream: a steady pour, rising in pitch with Pressure. A soak: a small
  splash. A Crash: today's bright splash and thump. A Slam: a wet slap and a knock. A bubble: a
  plink going on, a clean pop coming off. The tsunami: a held breath, then the roar. No sound
  here is new to the palette of `src/audio/tidecues.js`; the new ones are the hiss of the
  blade, the plink and the pop.
  - Talents: Erosion a tick that rises with each hit; Heavy Swell a deeper thump; Surface
    Tension a tighter plink; Fork a second, thinner pour; Backwash a suck back over wet stone;
    Chain Pop a run of plinks; Sea Dragon a roar of water; the Great Wave a held breath, then
    the whole room's roar; Lifebubble one held note and a pop.
  - Combos play the two skills' own sounds and one bright chime when the combo fires.
  - The AI seat plays talents as plain rules. With the Great Wave it keeps its third Crash for
    a pack in line; with Lifebubble it does nothing different.

## 8. For the page and the build

- **N87. The model.** The page thread should first check: the coil round the upright staff,
  the lean on a planted staff with the tail braced, the staff standing alone (Planted staff),
  the back float, the dive arc, riding a column standing (High ground), the over-the-shoulder
  cast (Overhead), the bounce on a bubble (Bubble hop) and the
  full spin with the staff level (Full circle). No move puts the left paw
  on the staff, holds an object or lifts a paw to her mouth.
- **N88. New moves** (beyond the passed set): the coil, the dive and breach, the back float,
  the whip turn, the disc flick, the nozzle sweep, the heave lob, the planted lean, the step
  away from the standing staff and its catch, the wave ride on all fours, the column ride,
  the over-the-shoulder cast, the back twist, the tuck and belly landing (Leap), the full spin,
  the lean into a pushed pane (Ram).
- **N89. Things to show.** The three soak tags on each skill; a soaked foe sliding farther; a
  drenched foe Crashed twice; Soaked and a Crash beside a dry hit; Pressure and the water blade;
  a Slam on a wall and on another foe; a foe afloat; a bubble, its layers and its pop; her
  water on the floor; a left-paw cast beside the full staff cast.
- **N90. Order for the page.** Base forms first (24 clips, the passive, basic attack, dash),
  then one style at a time, then the combos. Chinese first with an English switch; a flat grid
  floor with dummy units; few words (his rules for review pages).
- **N91. For the build.** New machinery: a held continuous attack with a count, a pressed
  skill kept through a hold, carrying and throwing foes with a wall test, a held state with
  its cap, shield layers with a break event, friend-aimed casts, a steered projectile, an
  under-floor state, a decoy that takes blows, a blind, a lost-aim state, a drawn line and a
  closed-ring test, a stream that leaves again from a friend, a staff that fires alone, a
  place swap, a dome that shuts foes out, soak values by foe rank, the slide, a drenched state,
  wet footprints. Each goes in the module that owns the job. The soak
  and crash keys, the drag zones and the delayed burst exist today.

## 9. The record

- **N92.** The 15 new skills and where each came from are in `TIDECALLER_IDEA_LIST.md`.
- **N93. Names I avoided.** Today's node names (Wellspring, Deluge, Current, Ebb, Spring Tide,
  Undercurrent, Riptide, Confluence) and the deed High Water are not used for any talent, form
  or skill. The path is Jet, not Torrent, because Torrent is a skill.
- **N94. Undertow dropped** (his mark, 19 Nov: "Undertow: drop this and re-design one"). I
  read it as the whole skill, since his other marks name a style. Call the Tide 唤潮 stands in
  its place: the one skill that answers from all her water at once, so every wet path, puddle,
  pool and rain she lays is worth more. Undertow is in the game today; taking it out waits for
  the build. Pick 4a no longer applies. There are no currents in the kit now.
  Ripple Step (his mark: "Ripple Step: base, jet and bubble: re-design"): the base was one
  vault away, close to the dash. Now it is three steps she spends one at a time, each with a
  ripple. The Swap stays as he passed it.
- **N95. Pick 1b (Flood in place of Bubble) was not taken.** Flood stays a spare idea.
- **N96. Pick 3b (the tsunami in every style) was not taken.** Jet has the water blade.
- **N97. Hero name.** "Tide Caller" in these files; the game's class name today is Tidecaller
  唤潮者 and the otter is Rill 莉儿. A new hero name, like Mosslight or Ashfang, is his to give.
- **N98. No skill moves a friend** (a bubble that carries a friend, a dive that takes a friend
  along, a gate that moves the team were all left out): moving another player's hero is bad
  in co-op. Rescue wraps the friend and yanks the foes; Lend a wave only makes the friend
  faster, and the friend steers.
- **N99. Three skills move her** besides the dash (Ripple Step, Otter Dive, Wave Rider), and
  two forms (the Leap, the Water rocket). She holds four of 26, so a build rarely has more
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
  10% for a champion.
- **N104. Passes.** Every pass, mine and the two fresh judges', is in
  `TIDECALLER_REVIEW_LOG.md`.
- **N105. Next.** All picks are closed (19 Nov). His go for the ability page thread.
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

| # | Skill (cooldown) | Base | Jet 水刀 | Surge 狂澜 | Bubble 泡沫 |
|---|---|---|---|---|---|
| | **Stream 流** | | | | |
| F1 | Riverbolt 河流弹 (2.5 s) | a bolt, 5 u: 14, soaks. Wet: it passes through a soaked foe and goes on to the next, to its full reach | **引流 Homing**: the foe is tagged 4 s: her stream bends to it from any angle, through the foes in the way | **连撞 Cradle**: the bolt shoves the foe 2.5 u straight back. A foe it runs into is shoved on 1.5 u, and so on, up to three foes down the row (each bump is a Slam, R9) | **弹泡 Bouncer**: a bubble that bounces off foes and walls 4 times: 8 each, soaks; a friend it touches catches it: an 8 bubble The base's 湿 line is dropped |
| F2 | Torrent 激流 (6 s) | a jet through every foe on a 5.5 u line: 18. Crash | **断流 Sever**: a small foe or elite the jet leaves under 20% health is cut down (true damage equal to the health it has left). A champion or boss under 20% takes 30% more instead | **分海 Part the sea**: the foes on the line are thrown 1.5 u out to both sides | **洗礼 Wash**: it passes through friends too: each is washed clean of slows, burns and curses, and for 2 s none of those sticks to it. No bubble |
| F3 | Water Whip 水鞭 (5 s) **New** | a whip, 4 u: it grabs the first foe and throws it to the pointer, up to 3 u: 12, soaks (a foe thrown onto others is a Slam). Wet: a foe that was soaked when grabbed lands flat on its back 0.5 s | **压墙 Pin**: no throw: one hard jet shoves the first foe straight back up to 4 u: 12, soaks. If it reaches a wall or pillar it is nailed there 1.5 s on top of the Slam: it cannot move, and can only hit what is in its reach | **抡摔 Flail**: she swings the foe once round her: 8 to foes within 2.5 u; then lets go: it flies 5 u | **救援 Rescue**: it can wrap a friend: a 12 bubble, and the foes within 1.2 u of that friend are yanked 2 u toward her, soaked. The friend is not moved. A friend under the pointer comes first; with none there it is the base on a foe |
| F4 | Skipping Stone 打水漂 (6 s) **New** | a flat stone skips along her aim: four splashes 1.5 u apart: 10 within 0.9 u, soaks; the last: 16. Wet: one more skip for each soaked foe it hits, up to 8 skips | **弹额 Headshot**: one skip, then into one foe's face: 24, stun 0.6 s The base's 湿 line is dropped | **接力浪 Conveyor**: each splash throws the foes it hits on to the next splash's spot: a foe caught by the first lands at the last, 4.5 u on. 6 each splash, the last 12 The base's 湿 line is dropped: its spots are fixed | **浮雷 Drift mines**: each splash leaves a bubble 4 s that drifts to the nearest foe and pops: 10 within 1 u, soaks The base's 湿 line gives one more mine for each soaked foe hit |
| F5 | Spray 泼水 (4 s) **New** | a quick fan of water, 3 u, 70°: 10, soaks. No push. Wet: a foe that is already soaked is drenched 透湿 for as long as its soak lasts: the next Crash on it does not spend the soak | **洒水头 Sprinkler**: no fan: for 3 s her stream bursts into a round spray where it ends, 2.5 u: every 0.5 s, 2 to the foe the stream is on and to each foe round it, soaks; a foe already soaked is drenched, as the base. The spray moves with the stream's end. Stream off: the base fan | **倒卷 Drag-in**: it falls behind the foes and washes them to her feet, up to 2 u | **滑泡 Foam floor**: foam stays on the fan's floor 4 s: a foe that runs or charges across it falls: stun 0.6 s, once each. A champion is slowed 40% for 1 s instead; a boss is not affected |
| F6 | Tide Orb 潮珠 (7 s) **New** | hold up to 3 s: an orb of water follows the pointer: 4 each 0.3 s to foes it touches, soaks. Let go: it bursts: 14 within 1.2 u. Crash | **台球 Billiard**: let go: it shoots off the way it was going, three times as fast, off walls 5 times, through every foe: 10 a pass. No burst, so no Crash; every pass soaks | **卷珠 Pick-up**: it swallows up to 3 small foes it touches and carries them, for 2 s at most. Let go: it throws them 2 u out | **护卫珠 Guardian orb**: steered onto a friend it stays on them while she holds, up to 3 s: a bubble that takes up to 14 for the friend, and its ticks hit the foes within 1.2 u of the friend. Let go: it bursts as the base |
| F7 | Depth Charge 深水弹 (8 s) **New** | hold up to 1 s; she lobs a ball of water over everything to the pointer, up to 6 u: 18 to 36 within 1.2 to 2 u. Crash | **鱼雷 Torpedo**: hold as the base, then no lob: the ball dives under the floor and swims at 8 u a second to the foe her stream is on (stream off: the foe nearest the pointer), turning as that foe moves, for up to 3 s; walls and other foes do not stop it. It comes up under that foe: 18 to 36 to it alone. Crash. If its foe falls first, it turns to the nearest foe | **拍地 Slam down**: no hold, no lob: a sheet of water falls on a line 4 u wide across her aim: 24, and every foe under it is Slammed into the floor: R9's wall Slam, with the floor as the wall. Crash | **浮垫 Raft**: the hold and the lob as the base; it lands as the base, then stays as a raft of bubbles 2.5 u wide for 4 s: friends standing on it take nothing from burning, slowing or poisoned ground under it. A foe's strike still lands |
| F8 | Floodgate 决堤 (big, 14 s) **New** | she plants the staff: a great beam, 8 u long, 1.2 u wide, 2 s: 8 each 0.25 s; she turns slowly. The first hit on each foe is a Crash | **立杖 Planted staff**: she lets go of the staff: it stays planted and keeps a thin beam on its line for 3 s: 6 each 0.25 s; the first hit on each foe is a Crash. The beam counts as her stream: Pressure climbs, and Erosion and the Sea Dragon count it. She walks free and casts with the left paw; she has no second stream until the staff is back at her side (at the end, or press again) | **洪峰 Flood crest**: the beam is a river 2 u wide: it pushes every foe in it along at 3 u a second for the 2 s, and she turns it slowly: 4 each 0.25 s; a foe it presses on a wall or pillar takes 8. The first hit on each foe is a Crash | **泡浪 Bubble wave**: no beam: for the 2 s she blows a wave of bubbles down the 8 u line, turning slowly. Each small foe it touches is sealed in a bubble and blown along to the line's end (an elite half as far): afloat, a hold (R10). There the bubble pops: 20. Crash; then the pop soaks, and the foe falls to the ground, flat 0.5 s. A foe blown into a wall pops there and Slams (R9). A champion or boss is not sealed: the bubbles burst on it: 4 each 0.25 s |
| | **Wave 浪** | | | | |
| F9 | Breaker 碎浪 (8 s) | a ring of water round her, 1.4 u: 22 to up to 5 foes, knocked back 1 u. Crash | **扫圈 Full circle**: no ring: she spins once and her stream sweeps a full circle at its full reach (4.5 u; Long Stream lengthens it): 22 to every foe it crosses, knocked back 1 u. Crash. While the water blade is on, the sweep is the blade: double. The stream ends on her aim and never stops | **跃浪 Leap**: the ring throws her into the air, untouchable; she comes down at the pointer within 4 u as a second ring: 22 again there, knocked back 1 u. Crash on both rings (a foe once) | **护身泡 Guard bubbles**: 12 and the knock back. Crash. Three bubbles circle her 5 s: each stops one whole hit, then pops |
| F10 | Crashing Wave 怒涛 (9 s) | a wave, 100°, 2.2 u: 20 to up to 6 foes, pushed 1.2 u. Crash | **骨牌 Domino**: no cone: a pulse runs down her stream and breaks on the foe at its end (stream off: the first foe on her aim within 4.5 u): 20, pushed 1.2 u. Crash. If that foe was soaked, the spent water jumps to the nearest soaked foe within 4 u and Crashes it too: 20; and on again, up to 5 foes, a foe once | **过肩浪 Overhead**: the wave curls back over her: the foes in its arc are thrown over her head and land up to 3 u behind her: 20. Crash. A foe that lands on a wall or on a foe is Slammed | **糊脸 Faceful**: the wave is foam: 12 and the push. Crash. Every foe it hits is blinded 1.2 s: its aimed blows and shots miss; a strike on an area still lands |
| F11 | Call the Tide 唤潮 (9 s) **New** | every piece of her water in the room (R12) and the floor within 2 u of her rises at once as a standing wave: 16 to each foe standing in it, a foe once. Crash. The water it rose from lasts 2 s longer. A left-paw cast | **百川 Hundred rivers**: no waves: each piece of her water within 8 u, and the tide at her feet, fires one jet at the foe her stream is on (stream off: the foe nearest the pointer within 6 u): 8 each, up to 6 jets, one after another. The first is the Crash. The water is not spent, and lasts 2 s longer | **聚潮 Gathering tide**: each wave breaks toward the pointer: 16 (Crash), and its foes are thrown 3 u toward the pointer (R9: they Slam on walls and on each other) | **泡涌 Bubbling up**: no damage and no Crash: each small foe standing in her water is lifted afloat in a bubble 1.2 s (an elite 0.6 s) and lands soaked; each friend standing in her water, herself too, gets a 10 bubble for 4 s |
| F12 | Whirlpool 漩涡 (12 s) | a pool within 4 u, 1.4 u, 5 s: 4 a second, soaks, slow 30%, drags foes to its centre. A foe in it whose soak a Crash spends is soaked again at once | **点名 Roll call**: no drag of its own; the ticks, the soak and the slow stay. While the pool lasts, each small foe or elite her stream touches is sucked down a small whirl under its feet and comes up at the pool's centre 0.3 s later, a foe once. A champion or boss is not taken: the pool slides under it instead, once | **沉渊 Abyss**: a foe that reaches the centre is swallowed for up to 2 s from when it went under (an elite 1 s). Press again: everything swallowed is spat out in one pile: stun 1 s. A foe whose time ends is spat out the same way | **定海 Steady water**: the pool as the base; friends standing in it cannot be stunned, pushed, pulled or knocked flat |
| F13 | Tidal Wall 潮墙 (10 s) **New** | a wall of water 4 u wide, 2 u ahead, 4 s: it stops foes' shots; a foe that walks through is soaked and slowed 40% for 2 s. Press again: it falls forward: 16, pushed 1.5 u. Crash | **推墙 Ram**: the wall is a pane 2 u wide, 1 u in front of her, 4 s. Her stream pushes it: while the stream is on its back it slides forward at 2 u a second, up to 6 u, stopping foes' shots; small foes in front of it are shoved along and soaked (they can Slam). It breaks on the first elite, champion, boss or wall, at 6 u, at 4 s, or on a second press: 16 within 2 u. Crash. Pressure does not fall while she pushes | **倒海 Sea fall**: the wall climbs while it stands, 1 u a second. Press again, or at 4 s: it curls over and crashes down forward like a tsunami, covering the floor in front of it as deep as it is tall: 2 u and 16 at once, up to 5 u and 32 after 3 s. Crash. Foes under it are knocked flat 0.5 s and washed to its far edge (a wash that ends: they can Slam there) | **回礼 Return**: each shot it stops is wrapped in a bubble and floats back to who fired it: 6 each. Friends' shots pass through it |
| F14 | Wave Rider 踏浪 (9 s) **New** | she surfs a wave for 1.5 s, steering it, up to 6 u: foes she passes take 14, are soaked and knocked 1 u aside | **水箭 Water rocket**: no surf: she shoots 6 u in a blink, untouchable, through every foe: 18; within 1.5 s she can fire once more | **浪尖 Crest**: press again as the wave peaks (a 0.4 s window, judged on her own screen in co-op): it breaks under her: 28 to foes within 2 u, knocked flat 1 s. A miss: the base | **掀泡 Bubble wake**: each foe she rides past is lifted in a bubble behind her: afloat 1.2 s (an elite 0.6 s), a row of them; each pops: 14, soaks. No knock aside |
| F15 | Clapping Waves 合浪 (8 s) **New** | two waves rise 1.5 u to each side of a spot within 5 u and clap shut: 18 to the foes between, stun 0.5 s. Crash | **汇点 Meeting point**: two jets cross at the spot: 12 each through every foe on their lines; a foe at the crossing takes both and 50% more: 36. No stun. Crash | **夹击 Vice**: hold up to 2 s: the two walls close and hold the foes between (an elite 1 s): 4 each 0.3 s; the first is the Crash. Let go: no stun: the pack squirts out 3 u along her aim and can Slam | **爆响 Bang**: two great bubbles roll in from the sides, meet and pop with a bang: 18 within 2.5 u, and it breaks every foe's wind-up within 4 u (never a boss's). No stun. Crash |
| F16 | Maelstrom 大漩涡 (big, 16 s) | everything within 3 u of her is pulled 1 u inward; 1 s later it bursts: 40 to up to 8 foes within 1.6 u. Crash | **聚锋 Funnel**: the draw as the base; no ring burst: the whole burst goes up through the one foe nearest her: 40, and 10 more for each other foe drawn in, up to 80. Crash | **鲸跃 Whale breach**: the burst is a whale of water breaching: 40, launched 1.2 s; it falls back as a ring: 12, pushed 2 u | **水獭替身 Decoy**: no draw: the spin leaves an otter made of water where she stands, and she slides 2 u back. Small foes and elites within 5 u that no friend has taunted attack the otter for 3 s; it has 40 health. It ends, or breaks, in the base's burst: 40. Crash |
| | **Spring 泉** | | | | |
| F17 | Ripple Step 涟漪步 (7 s) | up to three steps within 3 s, one a press: each 1.6 u the way she is moving (standing still: away from her aim), untouchable for the step. Each landing spreads a ripple, 1.5 u: 6, soaks, and leaves a puddle there, 0.8 u, 3 s: 6 a second, soaks. The cooldown starts at the first step. A step pauses the stream for a blink and keeps its count | **水影 Water double**: the base steps, and her stream does not pause. Each place she steps from keeps a water copy of her, 3 s, up to three: each copy pours a stream at the foe her stream is on, for half damage, and stops when hers stops. Foes ignore the copies and cannot hit them | **对调 Swap**: no steps: she trades places with the small foe or elite under the pointer within 4 u, untouchable as she goes; it lands in a puddle where she stood, soaked and knocked flat 0.5 s. A champion, a boss or no foe: the base | **踩泡 Bubble hop**: each step can land on the head of the friend or foe nearest the pointer within 3 u: she bounces off a bubble on it and comes down 1 u beyond, untouchable. A friend she bounces on gets an 8 bubble, 4 s. A small foe is lifted afloat in the bubble 0.6 s (an elite 0.3 s) and lands soaked. No ripples, no puddles. With no one in reach: the base step |
| F18 | Bubble Ward 泡泡护盾 (11 s) | a 14 bubble for 4 s on the friend under the pointer within 4 u; with none there, the friend foes are after; else herself | **反击 Answer**: each hit on the bubble is answered by a jet at the attacker: 8, up to four; each jet soaks | **借浪 Lend a wave**: a 10 bubble, and the friend rides a wave 4 s: 30% faster; foes it runs into take 8 and are pushed 1 u; the bump soaks | **跳泡 Hop**: when it pops it hops to the next friend within 5 u at 60% size, up to three friends |
| F19 | Rain Squall 骤雨 (14 s) | rain within 5 u, 1.8 u, 6 s: 3 a second, soaks, slow 25%. A soak from the rain lasts 8 s | **悬雨 Hanging rain**: the rain as the base, all 6 s (3 a second, soaks 8 s, slow 25%). While it rains, every second three drops stop and hang over the rain; one second later they fire as needles at the foe her stream is on: 2 each, and it is soaked 8 s. With the stream off they fire at the foe with the least health within 8 u of her. Six volleys, 36 in all. Not a Crash. No second press | **水旋 Spouts**: three waterspouts wander in the rain for the 6 s: each picks up the nearest small foe, spins it 1 s and drops it on the nearest other foe: a Slam for both (R9, foe on foe). A foe is picked up once every 3 s. No slow | **沉泡 Heavy bubbles**: in place of the slow, each second in it sticks a bubble on a foe: 15% slower each; at four it is rooted 1 s, then the four pop as one: 12 |
| F20 | Geyser 间歇泉 (7 s) **New** | a spot within 5 u; 0.6 s later it erupts: 16 within 1 u, launched 0.8 s, soaks. Wet: a foe that was soaked is launched 1.6 s | **高台 High ground**: cast under herself: the column lifts her and holds her up 3 s. From there her stream and jets pass over foes and low cover to the foe she points at, and melee blows cannot reach her; shots can. Foes at its foot when it rises: 16, soaks, no launch. The dash steps off. No launch, so the base's 湿 line does not apply | **托抛 Toss**: at the top a wave throws the launched foes 3 u toward the pointer | **泡泉 Bubble fountain**: the vent stays 5 s after it erupts and blows one bubble a second: each drifts to the nearest friend within 6 u who has none from it: a 6 bubble for 4 s |
| F21 | Water Prison 水牢 (9 s) **New** | a bubble flies to the first foe within 5 u and seals it: afloat 1.5 s. Then it pops: 12 within 1.2 u, a Crash; then the pop soaks | **高压泡 Pressure cell**: the bubble seals the foe for 2 s. Her stream on it pumps it up: each 0.5 s of stream adds 9 to the pop and widens it, up to 36 more and 2 u. A champion or boss is not sealed: the bubble sticks on it for 2 s and is pumped the same | **牵走 Tow**: the bubble with its foe follows her on a rope of water, 1.5 u behind, for 2 s (an elite 1 s). Press again while it is towed: she swings the rope once and throws the bubble to the pointer, up to 5 u: it pops where it lands (12 within 1.2 u, Crash, then the pop soaks); thrown onto a wall or a foe it Slams (R9). If the time ends first it pops where it is | **存伤 Store**: the sealed foe takes no damage; the bubble keeps all that is dealt to it, up to the health the foe has left. When it pops the foe takes the store and 30% more, as true damage that is not a hit, and other small foes and elites within 1.5 u take half. A champion or boss is not sealed: the bubble sticks on it 1.5 s, it takes damage as usual, and the bubble then pays 30% of what was dealt |
| F22 | Otter Dive 潜游 (10 s) **New** | she dives under the floor: up to 2 s a ripple at double speed, untouchable. Let go: she surfaces: 14 within 1.5 u, launched 0.5 s, soaks. In her own water: twice as wide | **绕后 Flank**: let go: she surfaces behind the foe nearest the pointer, with the base's burst. That foe has lost her: for 2 s it does not turn and cannot aim at her (a boss 0.4 s) | **围鱼 Round-up**: her ripple leaves a line on the floor. If she swims a closed ring within the 2 s, every foe inside it is swept to its centre as she surfaces: each is Slammed (R9, foe on foe) and launched 0.5 s. Not closed: the base | **水遁 Water door**: no swim: she comes up at once from the water of hers (R12) nearest the pointer, anywhere in the room, with the base's burst. On a pad the reticle jumps to her water in the stick's direction. With none in the room: the base |
| F23 | River's Gift 河赐 (10 s) **New** | the friend nearest the pointer within 6 u, or herself, for 5 s: its hits soak and splash: 4 to foes within 1 u | **接力 Relay**: for 5 s, while her stream is aimed at the gifted friend, it leaves again from the friend's weapon at the foe that friend hit last, at full strength and reach (Pressure and the water blade too). On its way to the friend it passes through foes. On herself: as the base | **送球 Alley-oop**: for 5 s, a foe her water pushes, throws or carries to within 2 u of the gifted friend arrives stunned 0.5 s, and that friend's next hit on it deals 30% more | **倒影 Reflection**: the friend's next skill, a big one too (his pick of 19 Nov), is cast twice: the second by its reflection in the water, for 40% |
| F24 | Tidal Dome 水穹 (big, 16 s) **New** | a dome of water 3 u wide within 5 u, 5 s: friends inside take 25% less; foes inside are soaked and slowed 40%. It ends by falling in: 24. Crash | **决斗场 Duel**: the dome closes round her and the foe nearest the pointer: for the 5 s other foes cannot enter it and their shots stop at its skin. Friends pass freely. A foe already inside with them stays. The chosen foe cannot leave if it is a small foe or an elite; a champion or boss can | **弹球 Pinball**: foes inside cannot leave (a champion or boss can); its skin is a wall for Slam, and a foe thrown into it bounces 1 u back. It ends by falling in as the base | **同舟 Same boat**: the dome is one great bubble with 60: it takes every hit meant for the friends inside, in place of the 25%. Foes inside are soaked and slowed as the base. When it breaks, or at 5 s, it falls in as the base: 24. Crash |
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
| | Homing | the tag works: this is its use | Shot; a small circle on the foe | a soft lock chime | on the biggest foe |
| | Cradle | not shoved: 20% more | Shot | clack, clack, clack | at the front of a row of foes |
| | Bouncer | bounces off it like any foe | Shot; Ward on the catch | plinks, rising | with two foes near, or a friend in the pack |
| F2 | Torrent | as written | Shot | the passed blast | when the Crash rule is met on a line |
| | Sever | under 20% health it takes 30% more | Shot | a clean slice | on a line with a foe under 35% health |
| | Part the sea | not thrown: 20% more | Shot; two waves | a zip, then two splashes | on a pack between two walls |
| | Wash | as the base | Shot; Ward on each friend | a soft rush | when a friend on the line is slowed, burning or cursed |
| F3 | Water Whip | not thrown: 20% more | Swing | a whip crack | on a shooter or healer at the back |
| | Pin | not shoved: 20% more | Shot | a hard hiss, a knock | on a foe with a wall behind it |
| | Flail | not swung: the base hit, 20% more | Swing, a full ring | a whoosh round, then a slap | on a foe inside a pack |
| | Rescue | not yanked: 20% more on the whip's 12 | Ward | a soft reel | on a friend under 30% health with foes on it |
| F4 | Skipping Stone | as written | Shot; four small bursts | plunks, each higher | along the longest row of foes |
| | Headshot | the stun lasts 0.25 s | Shot | a knock on bone | on a foe winding up |
| | Conveyor | not thrown: each splash 20% more | Shot; four bursts | plunk and whoosh, four times | toward a wall about 5 u off |
| | Drift mines | as written | Placed, small | a slow glug, a pop | ahead of a pack that walks in |
| F5 | Spray | as written | Swing | a hose burst | when two foes are within 3 u |
| | Sprinkler | as written: it and its helpers are soaked and drenched | Channel on the stream's end; a spinning spray | a lawn sprinkler's tick-tick-hiss over the pour | when her stream's foe has others round it; before a Crash skill |
| | Drag-in | not dragged: 20% more | Swing, turned back | a wash and a suck | before a Breaker or a Maelstrom |
| | Foam floor | does not slip; its charge is not stopped | Zone pulse | a fizz | across a doorway or a charger's line |
| F6 | Tide Orb | as written | Placed, held | a low hum | rolls it through the pack 1.5 s, then bursts it |
| | Billiard | as written | In flight | rings off the walls | lets go along the long wall |
| | Pick-up | not swallowed: the ticks 20% more | Placed, held | a washing tumble | carries three foes to the nearest wall |
| | Guardian orb | as written | Placed, held; Ward | a low hum on the friend | on the tank in a pack |
| F7 | Depth Charge | as written | Placed | a deep thump | holds the full second on a pack |
| | Torpedo | as written: this is its use | In flight, a wake on the floor; a burst from below | a plop, a rising whirr under the floor, a thump from below | at the foe her stream is on, or a shooter behind cover |
| | Slam down | 20% more; the stun lasts 0.25 s | Placed, a line | a sheet falling, a flat smack | across a pack's front |
| | Raft | as written | Placed; Ward, a floor | a thump, then a creak of bubbles | over a floor bed the friends must fight on |
| F8 | Floodgate | as written | Nova, a beam | a river breaking out | when four foes are in the line, or a boss |
| | Planted staff | as written | Nova, a beam | a river from a standing pipe | on a boss or champion that stands still |
| | Flood crest | not pushed: it takes 8 each 0.25 s as if pressed, and 20% more | Nova, a beam | a river breaking out | down a corridor or toward a wall |
| | Bubble wave | not sealed: the bubbles burst on it, 4 each 0.25 s, 20% more | Channel, a wave of bubbles; a pop and a drop at the end | a long breath through a bubble wand, a hundred small pops, thumps as they land | down a lane of small foes, away from the party |
| F9 | Breaker | not knocked back: 20% more | Nova | the passed ring | with two foes within 1.4 u |
| | Full circle | not knocked back: 20% more | Swing, a full ring | the pour whipping round once | with three foes inside the stream's reach, or foes on two sides |
| | Leap | not knocked back: 20% more | Nova, twice | the ring, a held breath, the ring | from a pack she is in to a pack she wants |
| | Guard bubbles | as written | Ward | three plinks | before a volley reaches her |
| F10 | Crashing Wave | not pushed: 20% more | Swing | the passed crash | when the Crash rule is met in front |
| | Domino | not pushed: 20% more; the chain starts from it as from any foe | Shot; a small Nova on each | a thump down a hose, then splashes hopping away | on a soaked foe with other soaked foes near it |
| | Overhead | not thrown: 20% more | Swing, turned over | a curl, a thump behind | with her friends or a wall behind her |
| | Faceful | not pushed: 20% more; blinded 0.25 s, and a move it has already shown still lands | Swing | a wet splat | when three or more foes are about to hit |
| F11 | Call the Tide | as written | Nova, one at each piece of water | a deep pull of the tide, then many waves breaking at once | when three or more foes stand in her water |
| | Hundred rivers | as written: this is its use | Shot, many lines to one point | quick spits from all sides, a rising scale | on the boss or the biggest foe, with three or more pieces of water down |
| | Gathering tide | not thrown: 20% more | Nova at each piece of water, then throws inward | waves breaking inward, bodies thudding together | pointer on a wall or on the thickest pack |
| | Bubbling up | not lifted: it is soaked | Ward on each friend; a lift on each foe | a kettle of bubbles rising, soft pops | when friends fight in her water |
| F12 | Whirlpool | not dragged: the ticks 20% more | Zone pulse | the passed swirl | on the thickest pack |
| | Roll call | not taken: the pool slides under it; the ticks 20% more | Zone pulse; a small whirl under each foe taken | a plughole gulp, then a pop as it comes up | pool on the melee line, then the stream across the shooters |
| | Abyss | not swallowed: as the base | Zone pulse, dark | a gulp, a spit | on the thickest pack, before a Crash |
| | Steady water | not dragged: the ticks 20% more | Zone pulse; Ward on friends | the swirl, with a low steady note | under the friends when a foe winds up a slam or a pull |
| F13 | Tidal Wall | walks through; the fall: 20% more | Ward, a wall | a curtain of water | between shooters and the party |
| | Ram | the pane breaks on it: 20% more | Ward, a pane; Nova at the break | a hiss on glass, shots thudding, a crash | down a line of shooters, or at a big foe behind small ones |
| | Sea fall | not washed or knocked flat: 20% more | Ward, a wall; Slam at the fall, a long sheet | a roar that deepens as it climbs, a hush, one huge flat crash | raise it against shooters; drop it when the pack is in its shadow |
| | Return | its shots come back too | Ward, thin | plinks going home | between shooters and the party |
| F14 | Wave Rider | not knocked aside: 20% more | Dash | a rolling wave | through a row of foes to soak them, or out of a corner |
| | Water rocket | as written | Dash, a streak | a blast and a hiss | through a line of foes, then back |
| | Crest | 20% more; flat 0.25 s | Dash; Nova at the break | the wave, a leap, a crash | always takes the second press |
| | Bubble wake | not lifted: 20% more | Dash; Ward on the foes | a wave, then plinks in a row | through a row of foes toward her friends |
| F15 | Clapping Waves | 20% more; the stun lasts 0.25 s | Placed, two walls | a boom | on a spread pack |
| | Meeting point | as written: aim the crossing at it | Placed, two beams | two hisses and a flash | crossing on the biggest foe |
| | Vice | not held: the ticks 20% more | Placed, held | a long creak | holds the full 2 s on a pack |
| | Bang | its wind-up is never broken | Placed | one sharp bang | when two or more foes wind up |
| F16 | Maelstrom | not pulled: 20% more | Nova | the passed spiral and column | with four foes within 3 u |
| | Funnel | not pulled: 20% more; it is the one foe when it is nearest | Nova, one beam | the spiral, then one spike | on a boss or champion with small foes round it |
| | Whale breach | not launched: 20% more | Nova, a whale | a deep call, a slap | as the base |
| | Decoy | it ignores the otter; the burst as written | Nova | a giggle of bubbles, the burst | when three or more foes are on her or on a hurt friend |
| F17 | Ripple Step | as written | Dash, three short; a ring at each landing | three light taps on water, each a note higher | one step out of a blow; all three through a pack to soak it |
| | Water double | as written: this is its use | Dash, three short; a standing copy where she stepped from | three light taps, then three thin pours joining hers | three steps round a boss or an elite while she streams |
| | Swap | no swap: the base steps | Dash | two splashes, crossed | swaps a foe on a friend's back into her puddle, when her new spot is safe |
| | Bubble hop | not lifted: it is soaked | Dash; Ward on a friend; a lift on a foe | three rubbery boings, rising | to the friend under attack, then off the foe that is hitting them |
| F18 | Bubble Ward | as written | Ward | the passed bubble | today's rule |
| | Answer | as written | Ward; Shot on a hit | a snap | on the friend most foes are hitting |
| | Lend a wave | not pushed: the bump 20% more | Ward; Dash | a small wave | on a melee friend who is far from the fight |
| | Hop | as written | Ward | plinks, each higher | when friends stand within 5 u of each other |
| F19 | Rain Squall | as written | Placed, rain | the passed rain | on the thickest pack |
| | Hanging rain | as written: this is its use | Placed, rain; three drops held still, then Shot, each second | the passed rain; each second a small hush, then three quick darts | rain on the pack, stream on the boss or the biggest foe |
| | Spouts | not picked up: the rain as the base | Placed, rain | three whirring spouts, thumps | on the thickest pack |
| | Heavy bubbles | the root lasts 0.25 s | Placed, rain | slow plops | on runners and chargers |
| F20 | Geyser | not launched: 20% more | Placed | a rumble, a blast | under a foe that stands still |
| | High ground | as written | Placed, under her | a rumble, a held column | when melee foes reach her and no shooter is up |
| | Toss | not launched: 20% more | Placed | a blast and a slap | throws toward a wall |
| | Bubble fountain | not launched: 20% more | Placed; Ward | a blast, then glugs | near the friends in a long fight |
| F21 | Water Prison | not sealed: it pops at once, 20% more | Ward, on a foe | a slow glug | on the most dangerous small foe |
| | Pressure cell | not sealed: the bubble sticks on it and is pumped the same | Ward, on a foe; Nova at the pop | a rising squeal, a burst | on the foe her stream is on |
| | Tow | not sealed: it pops at once, 20% more | Ward, on a foe; a Swing at the throw | a rubber squeak, following; a whoosh and a wet pop | pull a dangerous foe off a friend, then throw it at a wall or into the pack |
| | Store | not sealed: it then pays 30% of what was dealt in 1.5 s | Ward, on a foe | a darkening hum, a burst | on the foe the friends are about to burst |
| F22 | Otter Dive | not launched: 20% more | Dash, under the floor | a plunge, a breach | to leave a corner, into a pack she has soaked |
| | Flank | it does not turn for 0.4 s | Dash, under the floor | a plunge, a breach behind | on a foe that guards its front, or to drop a boss's aim |
| | Round-up | not swept: 20% more | Dash, under the floor; Nova in the ring | a rush, a wet clap | circles the thickest pack |
| | Water door | as written | Dash, no path | a bulge, a pop | to her water nearest a friend in danger |
| F23 | River's Gift | as written | Ward | a ribbon winding | on the friend that hits fastest |
| | Relay | as written | Ward | the pour, twice | on the friend fighting the biggest foe |
| | Alley-oop | not thrown: the gift as the base | Ward | a splash, a ting on the hit | on the melee friend nearest a pack |
| | Reflection | as written (big skills too) | Ward | the skill again, under water | on the friend whose strongest skill is ready |
| F24 | Tidal Dome | soaked; the slow lasts a fifth | Nova, a dome | the sea from below | over the friends when they are being hit hard |
| | Duel | as written: its helpers are shut out | Nova, a dome | a door of water closing | on a boss or champion with helpers round it |
| | Pinball | it can leave; soaked | Nova, a dome | wet rings off the skin | on a pack, before her throws |
| | Same boat | soaked; the slow lasts a fifth | Nova, a dome; Ward | a glass bell, a dent with every hit | over the friends when a big hit is coming |

- **N113. Talents and combos on a boss** follow the same lines: one that moves or holds gives
  its 20% instead (a champion 10%). Chain Pop gives nothing there (N32).
- **N114. Styles on a boss.** Jet is the boss path (Homing, the Torpedo, the Planted staff, the
  Hanging rain, the Pressure cell, Flank, Funnel, the Meeting point, the Duel). Surge loses its moves
  there and is paid by R13's 20% and by Heavy Swell. Bubble brings little damage of its own to
  a boss (Store pays 30% of the team's burst): it guards the team (Same boat, Steady water)
  and lifts the team's damage (Surface Tension, Reflection, Store).

## 12. Every skill and form: its tie to Soaked

His rule of 19 Nov: every skill interacts with the soak. 浸 soaks, 拍 Crash, 湿 more on a soaked
foe, 滑 it moves foes, so a soaked foe goes farther. No cell is empty.

| # | Skill | Base | Jet 水刀 | Surge 狂澜 | Bubble 泡沫 |
|---|---|---|---|---|---|
| F1 | Riverbolt | 浸 湿 | Homing: 浸 湿 | Cradle: 浸 滑 | Bouncer: 浸 |
| F2 | Torrent | 拍 | Sever: 拍 | Part the sea: 拍 滑 | Wash: 拍 |
| F3 | Water Whip | 浸 湿 滑 | Pin: 浸 滑 | Flail: 浸 湿 滑 | Rescue: 浸 滑 |
| F4 | Skipping Stone | 浸 湿 | Headshot: 浸 | Conveyor: 浸 | Drift mines: 浸 湿 |
| F5 | Spray | 浸 湿 | Sprinkler: 浸 湿, every 0.5 s | Drag-in: 浸 湿 滑 | Foam floor: 浸 湿 |
| F6 | Tide Orb | 浸 拍 | Billiard: 浸 | Pick-up: 浸 拍 滑 | Guardian orb: 浸 拍 |
| F7 | Depth Charge | 拍 | Torpedo: 拍 | Slam down: 拍 | Raft: 拍 |
| F8 | Floodgate | 拍 | Planted staff: 拍 | Flood crest: 拍 滑 | Bubble wave: 拍 (the pop at the end), 浸 (after it), 滑 |
| F9 | Breaker | 拍 滑 | Full circle: 拍 滑 | Leap: 拍 滑 | Guard bubbles: 拍, 浸 (pops) |
| F10 | Crashing Wave | 拍 滑 | Domino: 拍, jumps between soaked foes | Overhead: 拍 滑 | Faceful: 拍 滑 |
| F11 | Call the Tide | 拍, on every foe in her water | Hundred rivers: 拍, the first jet | Gathering tide: 拍 滑 | Bubbling up: 浸, they land soaked |
| F12 | Whirlpool | 浸, again after a Crash | Roll call: the same | Abyss: the same | Steady water: the same |
| F13 | Tidal Wall | 浸 拍 滑 | Ram: 浸 拍 滑 | Sea fall: 浸 拍 滑 | Return: 浸 拍 滑 |
| F14 | Wave Rider | 浸 滑 | Water rocket: 浸 | Crest: 浸 拍 | Bubble wake: 浸 (pops) |
| F15 | Clapping Waves | 拍 | Meeting point: 拍 | Vice: 拍 滑 | Bang: 拍 |
| F16 | Maelstrom | 拍 | Funnel: 拍 | Whale breach: 拍 滑 | Decoy: 拍 |
| F17 | Ripple Step | 浸, at every landing | Water double: 浸, as the base | Swap: 浸 | Bubble hop: 浸, foes land soaked |
| F18 | Bubble Ward | 浸 (pop) | Answer: 浸 (jets, pop) | Lend a wave: 浸 滑 | Hop: 浸 (each pop) |
| F19 | Rain Squall | 浸, 8 s | Hanging rain: 浸, 8 s, the pack and its target | Spouts: the same | Heavy bubbles: the same |
| F20 | Geyser | 浸 湿 | High ground: 浸 | Toss: 浸 湿 滑 | Bubble fountain: 浸 湿 |
| F21 | Water Prison | 拍 浸 | Pressure cell: 拍 浸 | Tow: 拍 浸 | Store: 拍 浸 |
| F22 | Otter Dive | 浸 | Flank: 浸 | Round-up: 浸 | Water door: 浸 |
| F23 | River's Gift | 浸 | Relay: 浸 | Alley-oop: 浸 滑 | Reflection: 浸 |
| F24 | Tidal Dome | 浸 拍 | Duel: 浸 拍 | Pinball: 浸 拍 | Same boat: 浸 拍 |
| F25 | Tidepool | 浸 | | | |
| F26 | Home Waters | 湿 | | | |

- The basic attack: the stream reads the soak under Jet (Pressure); the tsunami is 拍 then 浸.
  The dash: 浸 (the wet path).
- Forms that drop the base's 湿 line say so in section 10: Cradle, Bouncer, Headshot, the
  Conveyor, High ground.

