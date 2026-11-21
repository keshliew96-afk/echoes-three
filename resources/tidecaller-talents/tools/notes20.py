import re
F='TIDECALLER_NOTES.md'
t=open(F,encoding='utf-8').read()
def setN(n, body):
    global t
    key='- **N%s.' % n
    assert t.count(key)==1, (n, t.count(key))
    a=t.index(key)
    m=re.search(r'\n(?=- \*\*N|\n|#)', t[a+5:])
    b=a+5+m.start()
    t=t[:a]+key+' '+body.strip('\n')+t[b:]
def rep(a,b):
    global t
    assert t.count(a)==1,(a,t.count(a)); t=t.replace(a,b)

rep("**Version 1.9, 2026-11-19. Design only.**","**Version 2.0, 2026-11-21. Design only.**")

setN(2, """**Her styles.** In kits 1.0 to 1.9 the three styles were mine (Jet, Surge, Bubble); he
  picked them on 19 Nov and passed the page. On 20 Nov he asked for more: "as a mage and sea
  and water element design character, i expecting tide caller is a massive aoe mage", with
  Bubble kept. From a list of five he picked Flood and Tsunami (kit section 5). Kit 2.0 is
  that pick.""")
setN(3, """**Where the three styles come from.** Each grows out of something he already passed or
  that is in the game:
  - Flood 涨潮: her water on the floor: the dash's wet path (passed), Home Waters, Call the
    Tide.
  - Tsunami 海啸: her tsunami (his basic attack ask of 13 Nov and his drawing of it), and the
    Surge forms he passed on the page.
  - Bubble 泡沫: Bubble Ward, the one skill she has today that helps a friend.
  They also follow the template's pattern: ground (the floor becomes her weapon), weight (few
  big waves), conversion (her water becomes protection).""")
setN(8, """**Her place in the team.** She is the wide one: her casts cover the room. Flood makes
  the floor hers, Tsunami moves the whole pack so the other heroes' skills land, and Bubble
  guards them. Mosslight has no shield and Stonehide gives himself none, so bubbles do not
  repeat anyone. What she gives up is the single target: no style of hers is a boss path
  (N114).""")
setN(10, """**Soaked 浸湿** (R5; Kesh's pick 2a of 19 Nov: "make more use of the soak, and make
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
  - A Frozen elite still cannot be soaked (today's affix rule).""")
setN(11, """**The three tags.** Every pressed skill has at least one; the table in section 12
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
  - Whirlpool soaks a foe again at once after a Crash; the rain's soak lasts 8 s.""")
setN(12, """**What Crashes.** Twelve skills of 24: Torrent, Tide Orb's burst, Depth Charge, Call the Tide,
  Floodgate, Breaker, Crashing Wave, Sky Fall's drop, Clapping Waves, Maelstrom, Water
  Prison's pop, the Tidal Dome's end. Three are big. The tsunami Crashes too, so the basic
  attack pays off a soak in every style. A Crash
  deals its damage first and spends the soak after; a skill that both Crashes and soaks
  (the tsunami, Water Prison's pop) soaks after the Crash.""")
setN(13, """**The Crash by style** (R5). Flood: a puddle of still water, 1.2 u, 4 s, under each
  foe the cast crashed; puddles that touch are one piece, so a Crash on a pack leaves one
  pool under it. Tsunami: the splash soaks the foes within 1.5 u, so the next Crash has
  targets. Bubble: an 8 bubble for 4 s on the friend
  nearest the crashed foe within 5 u, or on her; by D33 a new one replaces the old one, it
  does not grow.""")
setN(16, """**Two paws** (R8). With attack held, a skill is cast by the left paw and the staff keeps
  shooting. With attack not held, the same skill uses its full staff motion. Both do the same
  thing. The big skills (Floodgate, Maelstrom, Tidal Dome) and the moves that carry her (Wave
  Rider, Otter Dive, Ripple Step, the dash) take her whole body: they pause the stream and keep
  its count. One Bubble form is made with the stream and does not pause it: the Bubble
  flail.""")
setN(17, """**Slam 拍岸** (R9). 附加伤害, never a hit. One rule for every skill and form.
  - Into a wall or pillar: 10 and a 0.5 s stun. It needs 1 u of travel.
  - Into another foe: 6 to both, no stun.
  - A foe is slammed at most once a second, whatever slams it.
  - Only a throw, a push or a carry that ends can Slam. The rain itself never does, and the waves of Call the
    Tide do not move a foe (its Tsunami form throws, and can). The Spouts' drop is a throw.
  - Walls: room walls, pillars, Stonehide's slab and Stone Ring, the Pinball dome's skin, and
    the floor under Slam down. Her Sky Fall is water: foes pass through it.
  - Windbriar's Wall slam (her combo C2) is the same wall rule; her kicked foes do not hurt
    other foes.""")
setN(18, """**Held 浮空** (R10). A foe that is afloat (in a bubble, or launched), carried (the
  Pick-up, the Bubble wave, the Tow, a Spout, the Whip wave, the Pond clap), sunk (the Sink)
  or swallowed (the Abyss)
  cannot act and keeps its target. Everyone can hit it. Afloat, it hangs 0.6 u up, turning
  slowly; for Duskwing it counts as stunned.
  - The cap: no hold lasts over 2 s on a small foe, 1 s on an elite. When a hold ends, that
    foe cannot be held again for 2 s (it can still be pushed, thrown and Slammed).
  - A launch (Geyser, the Blowout, the Fall slam, Otter Dive's breach, the Porpoise) is
    under 1.3 s. The foe is afloat (T3 counts it) but it is not a hold for the cap.
  - Stuns and knock-flats are under the formula's stun guard (D38); the end of a hold starts
    that guard too, so a hold cannot be chained into a stun.""")
setN(20, """**Her water** (R12). The wet path, puddles, ponds, pools, canals, rain, wet footprints
  and the dome's floor. Each is drawn as a wet floor with a pale foam edge, so the player can
  see where Home Waters, the Water door, Call the Tide, the Flood forms and the combos C2,
  C4, C9 and C10 work.
  - **It soaks.** A foe standing in any of her water is soaked each second.
  - **One piece 一片.** Water that touches is one piece: its foam edges open and it is drawn
    as one shape. Each part keeps its own time; when a part dries the piece can fall apart
    again. "A piece" in a form's rule is the whole joined shape.
  - **Still water 静水** is what the Flood forms lay, and Flood's basic attack, dash and Crash.
    It soaks and does nothing else: no damage, no slow but the soak's. 6 s unless its line
    says another time. At most 12 parts of still water lie at once; the oldest dries first.
  - Water with its own rule keeps it inside a piece: the Whirlpool still drags only in its own
    circle, a Ripple Step puddle still ticks only on itself.
  - Water can be moved (the Roll-up, the Pond clap, the Drain) or drunk (the Drinker); the
    rain, the dome and The Sea cannot.""")
setN(22, """**Holds, drawn lines, second presses, the pad.**
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
  - In co-op a timed press (the Crest) is judged on her own screen.""")
setN(24, """**T1 Overflow 水漫 (Flood).** Every skill takes its Flood form. When a skill of hers hits
  a foe that stands in her water, the hit runs through that piece: every other foe standing
  in it takes half of that hit.
  - The spread is 附加伤害: not a hit, so it never Crashes and never spreads again.
  - A foe takes one spread from a cast, the largest; a foe the cast hit itself takes none.
  - Zone ticks (the rain, the Whirlpool, puddles) do not spread. A lasting skill (the Hanging
    rain's needles, the Tide Orb's ticks) spreads at most once a second.
  - The stream is not a skill and does not spread (Shared water on herself gives it 30%).
  - A form that already hits the whole piece (the Dunk, the Pond-hopper, the Sleeper, the
    Plunge pool, the Blowout) gains nothing from it.
  - The trade: on dry floor she is the base kit. Her first casts in a fight lay water; her
    later ones pay. On one foe alone she gains nothing.""")
setN(25, """**T2 Swell 蓄潮 (Tsunami).** Every skill takes its Tsunami form. Each skill she casts
  adds one Swell, up to 3; the basic attack and the dash add none. At 3 the Swell is full
  满潮, and the next skill she casts spends it. A full cast:
  - is twice the size: the reach, width and radius of every wave, ring, fall, pool, orb and
    dome in it. Never a time, never a count;
  - deals 30% more (增伤区);
  - rolls on: each wave, ring or push in it goes on past its own reach as a low wave to the
    far wall: half damage, pushed 1 u (附加伤害);
  - on a friend (Bubble Ward, River's Gift): the bubble is twice as large, or the gift lasts
    twice as long.
  A full cast adds no Swell: the count starts again at 0. Swell is kept between rooms. Shown:
  three wave marks rise behind her feet, one a cast; at full, the water round her draws back
  from her in a ring, as the sea does before a tsunami, and stays drawn back until she casts.
  The trade: three casts in four are plain, and her waves scatter what they do not Slam.""")
setN(27, """**T4 Deep Water 深水.** A foe standing in her water takes 20% more from her skills, her
  stream and her water's own ticks (增伤区). A boss counts. It is read when the hit lands; a
  zone locks it at its cast (D26).""")
setN(28, """**T5 Heavy Swell 重浪.** A skill that pushes, pulls, throws, carries or launches deals
  25% more to the foes it moves (增伤区). A boss counts as moved. Slam is doubled: 20 on a
  wall, 12 foe on foe (in kits 1.0 to 1.9 that was Rolling Tide's).""")
setN(30, """**T7 Meeting Waters 汇流.** When two pieces of her water that were apart touch and become
  one, the new piece surges: 12 to every foe standing in it, soaks. 常规直伤, area; not a
  Crash. Once a second for the room. Water laid on top of her water is not a joining; a piece
  that fell apart and joins again is. It works with base water alone: the wet path into a
  puddle, a Ripple Step puddle into the rain.""")
setN(31, """**T8 Backwash 回潮.** Only after a push or a throw that leaves the foe 1.5 u or more
  farther from her than it was: 1.5 s later a thin sheet of water runs back the way it came
  and the foe is dragged 60% of the way back and soaked. Never after a pull, a gather, a
  carry or a launch, so it does not undo the Drag-in, the Abyss, the Whip wave or the
  Round-up. It can Slam on the way back (N17's once a second holds). A drag back never starts
  another Backwash.""")
setN(33, """**T10 Floodplain 泛滥.** Her water on the floor is 40% wider when it is laid: the wet
  path, puddles, ponds, pools, canals, the rain's circle and the Whirlpool. The dome is not.""")
setN(34, """**T11 Wide Water 浩荡.** Waves, rings and waterfalls are 30% wider: the tsunami, Breaker,
  Crashing Wave, Call the Tide's waves, Sky Fall, Clapping Waves, the Great Wave. Her pushes,
  pulls and throws move the foe 40% farther (in kits 1.0 to 1.9 that was Rolling Tide's). A
  path with a fixed end is not changed: the Conveyor's spots, the Tow's rope, the Round-up,
  the Spouts, the Whip wave's arc, the Pond clap's slide. The Tow's throw is a throw.""")
setN(36, """**T13 The Sea 沧海.** Every eighth skill she casts floods the room: for 6 s the whole
  floor is her water, one piece, still water. Everything that reads her water reads the
  room: Overflow, Deep Water, Call the Tide, Home Waters, the Water door, the combos. Her
  other water goes on under it and is there when it drains. Casts made during the flood do
  not count toward the next. The count is kept between rooms. Meeting Waters does not fire
  when the flood comes or goes. The Drain counts the flood as one piece and ends it.""")
setN(39, """**Every talent works alone.** T1 to T3 need nothing. T4, T7 and T10 read her water,
  which every style lays (the wet path, Ripple Step's puddles, the rain, the Whirlpool, Home
  Waters' footprints). T13 counts casts. T5, T8, T11 and T14 read moves and Crashes, which the
  base tsunami and base skills give. T6 brings its own bubble (every cast), T9 starts from any
  Crash, and T12 always has the wet path of the dash to lengthen. No talent needs a certain
  skill, and none needs another talent: nothing reads Swell but T2.""")
setN(40, """**Tier jobs.** No two talents of one tier push the same lever: II is three damage
  conditions (in her water, moved, bubbled); IV is the width of floor water, the width of
  waves with the length of pushes, and time; V is the room as her water, the room as one
  wave, and a friend saved.""")
setN(41, """**Budget** (docs/TALENTS.md: tier I about 20% more output in its style, one whole path
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
    path with Swell in place of the longer push.""")
setN('42a', """**Three example builds** (four skills each, to see the styles play).
  - Flood: Floodgate (Open the gate), Riverbolt (Pond-maker), Call the Tide (Tide on tide),
    Depth Charge (Sleeper). The loop: open the gate, pond the gaps, call the tide every
    5 s, sink a charge into the big piece.
  - Tsunami: Spray (Drag-in), Crashing Wave (Three Crests), Sky Fall (Ring out), Maelstrom
    (the Fall slam). The loop: gather, three casts fill the Swell, and the fourth is the
    double one.
  - Bubble: Bubble Ward (it hops), Whirlpool (Steady water), Water Prison (Store the team's
    burst), Tidal Dome (Same boat). The loop: guard, lift, let the friends hit, pop.""")
setN(42, """**Mixes worth trying.** Flood style with the Great Wave (her Crashes leave puddles, and
  every third sends the room wave); Tsunami style with Deep Water and Floodplain (the dash's
  wet path and the rain are water enough for the 20%); Bubble style with The Sea (Bubbling up
  lifts the whole room, and the Water door goes anywhere).""")
setN(44, """**Flood.** The stream and the tsunami as the base (the tsunami after 5 s). Where the
  stream ends, on a foe or on the floor at its reach, the water pools: a puddle of still
  water that grows while she holds the stream there, to 2 u in 2 s, and stays 4 s after the
  stream leaves it. Moving the stream starts a new puddle, so sweeping it draws water. The
  tsunami leaves its whole path (6 u long, 1.3 u wide) as still water, 6 s. The page's miss
  rule of 20 Nov (a stream that ends in empty air droops and spills a puddle) is the same
  picture.""")
setN(45, """**Tsunami.** The tsunami comes after 2 s of stream and is three times as wide: 3.9 u
  (the passed 1.3 u was his own correction for the base wave; the base keeps it). It carries
  small foes to its end (6 u). It is not a skill: it adds no Swell and a full Swell does not
  double it. Wide Water widens it. She streams little and heaves often: most of her basic
  output is the wave.""")
setN(47, """**The dash** is the passed one (the tide she rides is 0.95 u high, 1.17 u at the crest).
  The wet path lasts 3 s: 30% slower and soaked. Flood: the wet path is twice as wide and
  lasts 8 s: her first piece of water in every fight. Tsunami: the tide does not sink when
  she steps off: it rolls on 5 u, twice as wide (2.6 u): 10, pushed 1.5 u. Bubble: the crest
  closes over her as a 10 bubble for 3 s.""")
setN(53, """**The styles' looks.** Flood: flat, wide and bright: the floor shines, every piece has
  a pale foam edge, and two pieces join with a soft run of water; lapping sounds. Tsunami:
  thick rolling fronts with a curling Sea Foam crest; the floor is left wet and flat; a low
  roar. Bubble: round, slow, wobbling; rim lights; soft plinks and one clean pop. No style
  draws a wall: water that stands tall falls from the sky.""")
setN(78, """**The passives and capstones.** Tidepool: today's ripples at her feet. Home Waters: on
  her own water she drops to her belly and slides, the belly slide passed on her model page.
  Swell: three wave marks behind her feet; at full the water round her draws back in a ring.
  The Sea: a tide line climbs the walls, water runs in from every edge and lies ankle-deep
  over the whole floor; at the end it drains to the corners. Great
  Wave: the far wall darkens, the floor wets toward the foes, then one great wave with a
  full crest. Lifebubble: the fall stops in mid-air, a bubble with a bright rim; a held
  breath; the pop.""")
# N79 table
a=t.index("- **N79.** Types"); b=t.index("- **N80.**")
t=t[:a]+"""- **N79.** Types (formula D3 to D7):

  | Her line | Type | A hit? | Form for 抗性 |
  |---|---|---|---|
  | the stream, bolts, the whip, stones, the Hanging rain's needles | 常规直伤 | yes | ranged |
  | the tsunami, waves, rings, bursts, lobs, falls, Floodgate, Call the Tide, the whole-piece hits (the Dunk, the Pond-hopper, the Sleeper, the Plunge pool, the Blowout), Meeting Waters' surge, the Great Wave (T14) | 常规直伤 | yes | area |
  | Whirlpool, Rain Squall (under the Hanging rain too), puddles | 持续伤害, in a zone | no | DoT |
  | the Flood crest, the Guardian orb's ticks | 常规直伤 | yes | area |
  | Slam, a pop's 6 (T3), Overflow's half, Shared water's 30%, a full cast's roll-on, Return's shots, Lend a wave's bump | 附加伤害 | no | area or ranged |
  | Store's pay-out (the store) | 真实伤害 (D23.4) | no | |
  | bubbles, the Same boat dome | shield, a layer per skill | | |

"""+t[b:]
setN(80, """Zones:
  - 基础伤害区: every card number; Crash's 60%; Tide on tide's rise; the Roll-up's 4 and the
    Drain's 6 a piece.
  - 增伤区 (all add): Deep Water, Heavy Swell, a full Swell's 30%, the 20% on a boss and the
    10% on a champion she cannot move (R13, audit G27), Surface Tension's 15%, the
    Alley-oop's 30% for the friend.
  - 易伤区: a foe afloat under T3 (20%).
  - 减伤区: the dome's 25% for friends.""")
setN(81, """**Why this fits, and where it is thin.** Small foes have no defence, so all three
  styles lose nothing in rooms. Elites, champions and bosses have defence (25, 40, 50), and
  with Jet gone she has no lever on one big foe but time and area: Flood has Deep Water and
  the whole-piece hits on the piece it stands in; Tsunami has R13's 20%, Heavy Swell and the
  full cast. Her boss damage is the kit's weak side now. That is the price of his ask, and
  the first thing to measure (N114).""")
setN(82, """**控制.** Soaked, the slows, the stuns (Slam, the Abyss's pile, Clapping Waves, the
  Pond clap, the Alley-oop), the blind (Faceful), the root (Heavy bubbles) and the
  knock-flats (the Crest, the Dunk, the Whip wave, the Foam floor) follow D35 and
  the stun guard of D38. On a boss they last a fifth as long, never under 0.25 s (D37), and a
  boss takes one hard control every 5 s (D40.3). Every boss line in section 11 is already
  written with that floor. Pushes, pulls, carries, launches and floats are movement: 效果抵抗
  does not shorten them; N18 and N21 do.""")
setN(83, """**Zones lock** her 增伤 when they are cast (D26). A Crash is always a hit, never a zone
  tick.""")
setN(85, """**AI seat, all styles.** The Archer's stand-off and kite, as today. It holds attack on
  the nearest foe that is after a friend. It soaks first, then Crashes when two soaked foes are
  in reach, or one soaked elite, champion or boss (today's rule).
  - Flood: it lays water where the pack stands or is walking to, joins pieces when it can,
    and keeps its Crash skills for foes that stand in her water. It fights from her own water.
  - Tsunami: it looks for the nearest wall, pillar or pack and throws foes at it; it never moves
    a foe the tank holds unless that foe would hit a wall. It spends a full Swell on its
    widest skill, never on a friend skill.
  - Bubble: bubbles go to the friend foes are after, the tank last (today's rule); it keeps the
    Tidal Dome on the friends, not on the foes.
  - It never Leaps, Water walks or opens a Water door onto a floor warning or a bed (G17).""")
setN(86, """**Sound.** The stream: a steady pour. A soak: a small
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
    with Lifebubble it does nothing different.""")
setN(87, """**The model.** The page thread should first check: the coil round the upright staff,
  the lean on a planted staff with the tail braced, the back float, the dive arc and the five
  porpoise leaps, the run across the water on her toes (Water walk), the tail kick at a
  landing (Kick waves), the half-turn sweep with the ribbon out (Whip wave), the staff
  dragged along the floor (Pond clap), the three balls flicked over her shoulder (Flood
  crest), the bounce on a bubble (Bubble hop) and the flick up and slam down of the Bubble
  flail. No move puts the left paw on the staff, holds an object or lifts a paw to her
  mouth.""")
setN(88, """**New moves** (beyond the passed set): the coil, the dive and breach, the porpoise
  leap, the back float, the whip turn and the half-turn sweep, the disc flick, the nozzle
  sweep and the low broom sweep, the heave lob, the planted lean, the wave ride on all
  fours, the tuck and belly landing (Leap), the surface run, the tail kick, the staff drag,
  the three-ball flick.""")
setN(89, """**Things to show.** The three soak tags on each skill; a soaked foe sliding farther; a
  drenched foe Crashed twice; Soaked and a Crash beside a dry hit; her water on the floor, two
  pieces joining into one, and a hit running through a piece (Overflow); Swell filling, the
  draw-back at full, and a full cast beside a plain one; a Slam on a wall and on another foe;
  a foe afloat; a bubble, its layers and its pop; a left-paw cast beside the full staff
  cast.""")
setN(91, """**For the build.** New machinery: a held continuous attack with a count, a pressed
  skill kept through a hold, carrying and throwing foes with a wall test, a held state with
  its cap, shield layers with a break event, friend-aimed casts, a steered projectile, an
  under-floor state, a decoy that takes blows, a blind, a drawn line and a
  closed-ring test, soak values by foe rank, the slide, a drenched state, wet footprints.
  New in 2.0: her water as joined pieces (shapes on the floor with a "same piece" test),
  water that moves, grows, is drunk or drains, a zone that follows a friend, a room-wide
  flood state, and a cast count that doubles a skill's sizes. Each goes in the module that
  owns the job. The soak and crash keys, the drag zones and the delayed burst exist today.""")
setN(93, """**Names I avoided.** Today's node names (Wellspring, Deluge, Current, Ebb, Spring Tide,
  Undercurrent, Riptide, Confluence) and the deed High Water are not used for any talent, form
  or skill. So T7 is Meeting Waters, not Confluence, and a full Swell is 满潮, not 大潮. The
  Flood form of Bubble Ward is the Paddling pool, not the Moat (an Undertow form of kit 1.1).""")
setN(95, """**Kit 2.0, 20 Nov.** Flood had been a spare idea since pick 1b (Flood in place of
  Bubble, not taken on 19 Nov); it is a path now. Jet is gone: he asked for a massive AoE mage
  and Jet was the one-foe path. Three Surge forms that worked on one foe went when Surge
  became Tsunami: the Cradle, the Flail and the Swap (which he had kept on 19 Nov; it is the
  one passed form I took out without his word, and the first to give back if he asks).
  Overhead, the Sea fall and the Whale breach had already gone on 20 Nov by his picks.""")
setN(96, """**The tsunami is in every style again.** Jet's water blade went with Jet.""")
setN(99, """**Three skills move her** besides the dash (Ripple Step, Otter Dive, Wave Rider), and
  one form (the Leap). She holds four of 26, so a build rarely has more
  than one.""")
setN(103, """**What I guessed.** Every number; that he wants bubbles to be shields and not heals;
  that the stream should not soak; that "lower value" on an elite means half of the slow and
  the slide, and that a Crash keeps its 60% on every foe; which skills get a 湿 line and
  what each does; that a Slam between two foes should be small; the 2 s cap on holds; the
  10% for a champion. In 2.0: what counts as one piece; Overflow's half; Swell's count of 3
  and what "twice the size" covers; every size and time of still water; that Three Crests
  should grow; which Surge forms were too small for Tsunami.""")
setN(105, """**Next.** The page thread builds the 48 Flood and Tsunami cards and the new Bubble
  Breaker; he marks them there.""")
setN(114, """**Styles on a boss.** No style is the boss path now (Jet was). Flood: the boss
  stands in her water: Deep Water's 20%, the Sleeper, Tide on tide every 5 s, the Hanging
  rain's 36 on it, the Drain; Overflow gives nothing on a lone boss and pays on its helpers.
  Tsunami loses its moves there and is paid by R13's 20%, Heavy Swell and the full cast's
  30%. Bubble brings little damage of its own to a boss (Store pays 30% of the team's
  burst): it guards the team (Same boat, Steady water) and lifts the team's damage (Surface
  Tension, Reflection, Store). If her boss damage reads too low in play, the first lever is
  Deep Water's number.""")

# section 12
a=t.index("## 12. Every skill and form: its tie to Soaked")
t=t[:a]+"""## 12. Every skill and form: its tie to Soaked

His rule of 19 Nov: every skill interacts with the soak. 浸 soaks, 拍 Crash, 湿 more on a soaked
foe, 滑 it moves foes, so a soaked foe goes farther. No cell is empty. All still water soaks
(R12), so a Flood form that leaves water has 浸 for as long as the water lies.

| # | Skill | Base | Flood 涨潮 | Tsunami 海啸 | Bubble 泡沫 |
|---|---|---|---|---|---|
| F1 | Riverbolt | 浸 湿 | Pond-maker: 浸, and the pond | Wave head: 浸 滑 | Bouncer: 浸 |
| F2 | Torrent | 拍 | Canal: 拍; 浸 (the canal) | Part the sea: 拍 滑 | Wash: 拍 |
| F3 | Water Whip | 浸 湿 滑 | Dunk: 浸 滑, the whole piece | Whip wave: 浸 湿 滑 | Rescue: 浸 滑 |
| F4 | Skipping Stone | 浸 湿 | Pond-hopper: 浸, each piece | Conveyor: 浸 | Drift mines: 浸 湿 |
| F5 | Spray | 浸 湿 | Sweep-in: 浸 湿 滑 | Drag-in: 浸 湿 滑 | Foam floor: 浸 湿 |
| F6 | Tide Orb | 浸 拍 | Paint: 浸 拍; 浸 (the trail) | Pick-up: 浸 拍 滑 | Guardian orb: 浸 拍 |
| F7 | Depth Charge | 拍 | Sleeper: 拍, the whole piece | Slam down: 拍 | Raft: 拍 |
| F8 | Floodgate | 拍 | Open the gate: 拍 滑; 浸 (the sea) | Flood crest: 拍 滑 | Bubble wave: 拍 (the pop at the end), 浸 (after it), 滑 |
| F9 | Breaker | 拍 滑 | Spreading ring: 拍 滑; 浸 (the far ring, the pool) | Leap: 拍 滑 | Bubble flail: 浸 (the catch), 拍 (the third slam), 浸 (the pop) |
| F10 | Crashing Wave | 拍 滑 | Roll-up: 拍 滑; 浸 (the pool) | Three Crests: 滑 three times, 拍 (the third) | Faceful: 拍 滑 |
| F11 | Call the Tide | 拍, on every foe in her water | Tide on tide: 拍, every 5 s | Gathering tide: 拍 滑 | Bubbling up: 浸, they land soaked |
| F12 | Whirlpool | 浸, again after a Crash | Drinker: the same, over all it has drunk | Abyss: the same | Steady water: the same |
| F13 | Sky Fall | 浸 拍 | Plunge pool: 浸 拍, the whole pool | Ring out: 浸 拍 滑 | Return: 浸 拍 |
| F14 | Wave Rider | 浸 滑 | Bow wave: 浸 滑; 浸 (the road) | Crest: 浸 拍 | Bubble wake: 浸 (pops) |
| F15 | Clapping Waves | 拍 | Pond clap: 拍 滑 | Vice: 拍 滑 | Bang: 拍 |
| F16 | Maelstrom | 拍 | Drain: 拍 滑 | Fall slam: 拍 滑 | Decoy: 拍 |
| F17 | Ripple Step | 浸, at every landing | Water walk: 浸, as the base | Kick waves: 浸 滑 | Bubble hop: 浸, foes land soaked |
| F18 | Bubble Ward | 浸 (pop) | Paddling pool: 浸 (the pop, the pool) | Lend a wave: 浸 滑 | Hop: 浸 (each pop) |
| F19 | Rain Squall | 浸, 8 s | Hanging rain: 浸, 8 s, the pack and its target; 浸 (the pool) | Spouts: the same | Heavy bubbles: the same |
| F20 | Geyser | 浸 湿 | Blowout: 浸 湿, the whole piece | Toss: 浸 湿 滑 | Bubble fountain: 浸 湿 |
| F21 | Water Prison | 拍 浸 | Sink: 拍 浸, up to four foes | Tow: 拍 浸 | Store: 拍 浸 |
| F22 | Otter Dive | 浸 | Porpoise: 浸, at each breach | Round-up: 浸 | Water door: 浸 |
| F23 | River's Gift | 浸 | Shared water: 浸 | Alley-oop: 浸 滑 | Reflection: 浸 |
| F24 | Tidal Dome | 浸 拍 | Lagoon: 浸 拍; 浸 (the lake) | Pinball: 浸 拍 | Same boat: 浸 拍 |
| F25 | Tidepool | 浸 | | | |
| F26 | Home Waters | 湿 | | | |

- The basic attack: the tsunami is 拍 then 浸 in every style; Flood's puddle soaks.
  The dash: 浸 (the wet path).
- Forms that drop the base's 湿 line say so in section 10: the Pond-maker, the Pond-hopper,
  the Wave head, the Bouncer, the Conveyor. The Dunk always lands its foe flat.
"""
open(F,'w',encoding='utf-8').write(t)
