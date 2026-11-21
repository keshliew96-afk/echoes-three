C = {}
def ch(f, col, **k): C[(f, col)] = k
# ---------- base ----------
ch(5,'B', short="a quick wide fan, 3 u: 10, soaks", full="a quick fan of water, 3 u, 70°: 10, soaks. No push",
   idea="the cheap wide soak", boss="as written")
ch(14,'B', short="she surfs a wave she steers, 1.5 s: foes she passes take 14 and are soaked",
   full="she surfs a wave for 1.5 s, steering it, up to 6 u: foes she passes take 14, are soaked and knocked 1 u aside",
   idea="a surf she steers", boss="not knocked aside: 20% more",
   motion_base="(the ride, 1.5 s). She hops, a wave lifts under her belly, and she rides it on all fours, staff forward like a bowsprit, leaning into each turn.")
ch(15,'B', motion_base="(Plant, 0.7 s). She drops the staff's tip to the floor in front of her; two walls rise far apart to the sides and run in to meet with a boom and a tall thin fin of spray.")
ch(21,'B', motion_base="(Bloom, 0.5 s). One slow bubble leaves the staff's shell tip; it drifts, swallows the foe, lifts it; the foe paws at the skin. Pop: a crown.")
# ---------- Jet ----------
ch(5,'J', name="近射 Point-blank", short="five needle jets: a foe at arm's length takes all five and is knocked back",
   full="the fan is five needle jets, 6 each: the nearer the foe, the more of them hit it. A foe within 1 u takes all five: 30, and is knocked back 1.5 u",
   idea="Point-blank: all five jets up close", boss="not knocked back: 20% more", beat="Shot, five lines", sound="five hisses as one", ai="on a foe that has reached her",
   motion="the nozzle turns edge-on; five white needles leave together and a close foe is thrown off its feet.")
ch(8,'J', name="立杖 Planted staff", short="she lets go: the staff stays planted and fires the beam alone 3 s; she is free to move",
   full="she lets go of the staff: it stays planted and keeps a thin beam on its line for 3 s: 6 each 0.25 s; the first hit on each foe is a Crash. She walks free and casts with the left paw; she has no stream until the staff flies back to her (at the end, or press again)",
   idea="Planted staff: the staff fires alone", boss="as written", beat="Nova, a beam", sound="a river from a standing pipe", ai="on a boss or champion that stands still",
   motion="she drives the staff in and steps away; it stands humming, hosing its line; at the end it pulls free and spins back to her paw.")
ch(17,'J', name="甩尾 Tail shot")
ch(21,'J', short="her stream pumps the bubble up: its pop grows to 48, 2 u wide",
   full="the bubble seals the foe for 2 s. Her stream on it pumps it up: each 0.5 s of stream adds 9 to the pop and widens it, up to 36 more and 2 u. A champion or boss is not sealed: the bubble sticks on it for 2 s and is pumped the same")
ch(22,'J', short="she comes up behind a foe; it does not turn for 2 s",
   full="let go: she surfaces behind the foe nearest the pointer, with the base's burst. That foe has lost her: for 2 s it does not turn and cannot aim at her (a champion 1.4 s, a boss 0.4 s)",
   idea="Flank: up behind it, and it does not turn", boss="it does not turn for 0.4 s", ai="on a foe that guards its front, or to drop a boss's aim",
   motion="she breaches behind it with a half twist; the foe keeps swinging at the ripple where she was.")
ch(24,'J', name="决斗场 Duel", short="the dome closes round her and one foe: other foes cannot enter or shoot in",
   full="the dome closes round her and the foe nearest the pointer: for the 5 s other foes cannot enter it and their shots stop at its skin. Friends pass freely. A foe already inside with them stays",
   idea="Duel: the dome shuts the others out", boss="as written: its helpers are shut out", beat="Nova, a dome", sound="a door of water closing", ai="on a boss or champion with helpers round it",
   motion="the dome snaps shut round the two of them; small foes press their faces to the skin from outside.")
ch(9,'J', full="no ring, no knock back, no Crash: a water blade circles her at 1.4 u for 3 s: 4 each 0.3 s")
ch(10,'J', short="it breaks into jets: one to each soaked foe within 6 u: a Crash each",
   full="it breaks into jets: one to each soaked foe within 6 u, up to 6: 14, a Crash on each. With none soaked: one jet at the nearest foe: 14")
ch(7,'J', full="no hold; thrown straight, not lobbed: it bores into the first foe: eight hits of 4 in 1 s, then bursts out of its back: 14 to the foes in a 3 u cone behind it. The first hit is the Crash")
# ---------- Surge ----------
ch(7,'S', full="no hold, no lob: a sheet of water falls on a line 4 u wide across her aim: 24, and every foe under it is Slammed into the floor: R9's wall Slam, with the floor as the wall. Crash")
ch(8,'S', short="the beam is a river that pushes the pack along; on a wall they take double",
   full="the beam is a river 2 u wide: it pushes every foe in it along at 3 u a second for the 2 s, and she turns it slowly: 4 each 0.25 s; a foe it presses on a wall or pillar takes 8. The first hit on each foe is a Crash",
   boss="not pushed: it takes 8 each 0.25 s as if pressed, and 20% more")
ch(9,'S', name="跃浪 Leap", short="the ring throws her up; she comes down at the pointer as a second ring",
   full="the ring throws her into the air, untouchable; she comes down at the pointer within 4 u as a second ring: 22 again there, knocked back 1 u. Crash on both rings (a foe once)",
   idea="Leap: she lands as a second ring", boss="not knocked back: 20% more", beat="Nova, twice", sound="the ring, a held breath, the ring", ai="from a pack she is in to a pack she wants",
   motion="the ring wall lifts her on its crest; she tucks, turns once in the air and lands flat on her belly in a second ring.")
ch(13,'S', name="扇门 Swing gate", short="press again: the wall swings like a door and bats the foes it sweeps 3 u sideways",
   full="press again: the wall does not fall: it swings like a door on the end nearest the pointer, through a quarter turn: foes it sweeps take 16 and are batted 3 u sideways (they can Slam). Crash",
   idea="Swing gate: the wall is a bat", boss="not batted: 20% more", beat="Ward, a wall; Swing on the press", sound="a creak, a flat smack", ai="swings it toward the nearest wall or pillar",
   motion="she hooks the staff sideways; the whole wall turns on one end like a barn door and the foes go off its face.")
ch(14,'S', short="press again as the wave peaks: it breaks: 28, knocked flat",
   full="press again as the wave peaks (a 0.4 s window, judged on her own screen in co-op): it breaks under her: 28 to foes within 2 u, knocked flat 1 s. A miss: the base",
   idea="Crest: a timed second press", boss="20% more; flat 0.25 s",
   motion="she stands up at the crest; on the press the wave folds and breaks under her feet.")
ch(15,'S', full="hold up to 2 s: the two walls close and hold the foes between (an elite 1 s): 4 each 0.3 s; the first is the Crash. Let go: no stun: the pack squirts out 3 u along her aim and can Slam")
ch(11,'S', short="the current is a ring: foes go round and round 2 s",
   full="the current is a ring 2.5 u across at the pointer: foes in it are carried round and round for 2 s (an elite 1 s; a dash leaves it); then it runs out")
ch(12,'S', short="foes at the centre are swallowed up to 2 s, then spat out in one pile: stun 1 s",
   full="a foe that reaches the centre is swallowed for up to 2 s (an elite 1 s). Press again, or the time ends: everything swallowed is spat out in one pile: stun 1 s")
ch(6,'S', full="it swallows up to 3 small foes it touches and carries them, for 2 s at most. Let go: it throws them 2 u out")
ch(17,'S', name="对调 Swap", short="she trades places with a foe: it lands in her puddle, flat on its back",
   full="no vault: she trades places with the small foe or elite under the pointer within 4 u, untouchable as she goes; it lands in her puddle, soaked and knocked flat 0.5 s. A champion, a boss or no foe: the base",
   idea="Swap: she trades places with a foe", boss="no swap: the base vault", beat="Dash", sound="two splashes, crossed", ai="swaps a foe on a friend's back into her puddle, when her new spot is safe",
   motion="she and the foe each sink into a splash and come up out of the other's; the foe lands on its back in her puddle.")
ch(19,'S', name="水旋 Spouts", short="three spouts wander in the rain: each lifts a foe, spins it and drops it on another",
   full="three waterspouts wander in the rain for the 6 s: each picks up the nearest small foe, spins it 1 s and drops it on the nearest other foe: a Slam for both (R9, foe on foe). A foe is picked up once every 3 s. No slow",
   idea="Spouts: wandering spouts drop foes on foes", boss="not picked up: the rain as the base", beat="Placed, rain", sound="three whirring spouts, thumps", ai="on the thickest pack",
   motion="three thin spouts walk about under the cloud like drunks; each plucks a foe, whirls it and lets it fall on a neighbour.")
ch(21,'S', short="the sealed foe follows her on a rope of water for 2 s, like a balloon",
   full="the bubble with its foe follows her on a rope of water, 1.5 u behind, for 2 s (an elite 1 s). Press again, or the time ends: it pops where it is")
ch(24,'S', name="弹球 Pinball", short="foes cannot leave; its skin is a wall for Slam and bounces them back",
   full="foes inside cannot leave; its skin is a wall for Slam, and a foe thrown into it bounces 1 u back. It ends by falling in as the base",
   idea="Pinball: a cage whose skin is a wall", boss="it can leave; soaked", beat="Nova, a dome", sound="wet rings off the skin", ai="on a pack, before her throws",
   motion="foes that hit the skin ring off it like marbles in a bowl.")
# ---------- Bubble ----------
ch(3,'U', name="救援 Rescue", short="the whip wraps a friend in a 12 bubble and yanks the foes off them",
   full="it can wrap a friend: a 12 bubble, and the foes within 1.2 u of that friend are yanked 2 u toward her, soaked. The friend is not moved. On a foe: as the base",
   idea="Rescue: yanks the foes off a friend", boss="not yanked: 20% more on the whip's 12", ai="on a friend under 30% health with foes on it",
   motion="the ribbon loops the friend once, becomes a bubble, and its free end cracks the foes off them like a tablecloth trick.")
ch(7,'U', name="浮垫 Raft", short="it lands as a raft of bubbles: friends on it ignore burning and slowing ground",
   full="it lands as the base, then stays as a raft of bubbles 2.5 u wide for 4 s: friends standing on it take nothing from burning, slowing or poisoned ground under it. A foe's strike still lands",
   idea="Raft: safe ground over a bad floor", boss="as written", beat="Placed; Ward, a floor", sound="a thump, then a creak of bubbles", ai="over a floor bed the friends must fight on",
   motion="the column settles into a quilt of bubbles; friends' feet sink a little into it and the fire under it shows through, harmless.")
ch(9,'U', short="12; three bubbles circle her 5 s: each stops one hit, then pops",
   full="12 and the knock back. Crash. Three bubbles circle her 5 s: each stops one hit (up to 6), then pops")
ch(10,'U', short="foam: every foe it hits is blinded 1.2 s: its aimed blows and shots miss",
   full="the wave is foam: 12 and the push. Crash. Every foe it hits is blinded 1.2 s: its aimed blows and shots miss; a strike on an area still lands",
   boss="not pushed: 20% more; blinded 0.25 s, and a move it has already shown still lands")
ch(11,'U', short="the current rings a spot 3 s: foes that step in are carried round and put back outside",
   full="the current is a ring 2.5 u across at the pointer, 3 s: a foe that steps into it is carried a quarter round and set down outside: 6 a second, soaks. Friends cross freely; shots and leaps cross it. Its cooldown is 10 s")
ch(12,'U', name="定海 Steady water", short="friends standing in it cannot be stunned, pushed, pulled or knocked flat",
   full="the pool as the base; friends standing in it cannot be stunned, pushed, pulled or knocked flat",
   idea="Steady water: friends in it keep their feet", boss="not dragged: the ticks 20% more", beat="Zone pulse; Ward on friends", sound="the swirl, with a low steady note", ai="under the friends when a foe winds up a slam or a pull",
   motion="the pool's rim turns but its middle lies glass-flat; friends in it stand with a ring of still water round each foot.")
ch(14,'U', full="each foe she rides past is lifted in a bubble behind her: afloat 1.2 s (an elite 0.6 s), a row of them; each pops: 14, soaks. No knock aside")
ch(22,'U', short="she comes up at once from any of her water in the room",
   full="no swim: she comes up at once from any of her water (R12) or a friend's bubble of hers under the pointer, anywhere in the room, with the base's burst. With none in the room: the base")
ch(8,'U', full="no damage and no Crash while it holds: small foes it touches are lifted and follow the beam where she points, for 2 s at most. When it ends they drop: 20 each. A champion or boss is not lifted: it takes the base's ticks")
ch(16,'U', full="no draw: the spin leaves an otter made of water where she stands, and she slides 2 u back. Small foes and elites within 5 u that no friend has taunted attack the otter for 3 s; it has 40 health. It ends, or breaks, in the base's burst: 40. Crash")
# ---------- round 2b: trims and last form fixes ----------
def up(f, col, **k): C.setdefault((f, col), {}).update(k)
up(24,'U', name="同舟 Same boat", short="the dome is one great bubble: it takes every hit meant for the friends inside, up to 60",
   full="the dome is one great bubble with 60: it takes every hit meant for the friends inside, in place of the 25%. Foes inside are soaked and slowed as the base. When it breaks, or at 5 s, it falls in as the base: 24. Crash",
   idea="Same boat: one bubble takes the team's hits", boss="soaked; the slow lasts a fifth", beat="Nova, a dome; Ward", sound="a glass bell, a dent with every hit", ai="over the friends when a big hit is coming",
   motion="the dome's skin dents and rings with every blow it takes for them; cracks of light run over it before it falls in.")
up(24,'B', ai="over the friends when they are being hit hard")
up(1,'S', full="the bolt shoves the foe 2.5 u straight back. A foe it runs into is shoved on 1.5 u, and so on, up to three foes down the row (each bump is a Slam, R9)")
up(14,'J', full="no surf: she shoots 6 u in a blink, untouchable, through every foe: 18; within 1.5 s she can fire once more")
up(7,'U', full="the hold and the lob as the base; it lands as the base, then stays as a raft of bubbles 2.5 u wide for 4 s: friends standing on it take nothing from burning, slowing or poisoned ground under it. A foe's strike still lands")
up(8,'J', short="the staff stands and fires the beam alone 3 s; she walks free")
up(20,'J', short="it lifts her 3 s: she streams over every head; melee cannot reach her")
up(19,'U', short="each second sticks a bubble on a foe; at four it is rooted, then they pop")
up(12,'S', short="foes at the centre are swallowed 2 s, then spat out in one pile, stunned")
up(7,'S', short="a sheet of water falls on a line and Slams every foe under it into the floor")
up(23,'S', short="a foe thrown to the friend arrives stunned and takes 30% more from their next hit")
up(13,'S', short="press again: the wall swings like a door and bats foes 3 u sideways")
up(11,'U', short="it rings a spot 3 s: foes that step in are carried round and set down outside")
up(8,'S', short="the beam is a river that pushes the pack along; double on a wall")
up(7,'J', short="thrown straight: it drills one foe, then sprays out of its back: 14")
up(6,'U', short="steered onto a friend it guards them (14); its ticks hit the foes round them")
up(3,'J', short="a jet shoves one foe 4 u; at a wall it is nailed there 1.5 s")
up(21,'U', short="the bubble keeps all damage dealt to the sealed foe, then pays it back, 30% more")
up(19,'S', short="three spouts wander: each lifts a foe, spins it and drops it on another")
up(16,'S', short="a breaching whale: launched 1.2 s; it falls back as a ring: 12")
up(16,'J', short="the whole burst goes into one foe: 40, and 10 more for each foe drawn in")
up(8,'U', short="no damage: small foes are lifted and follow the beam; dropped: 20")
up(4,'S', short="each splash throws its foes on to the next: 4.5 u down the line")
up(3,'S', short="swings the foe round her (8 to foes it hits), then throws it 5 u")
up(22,'S', short="swim a ring round foes: all inside are swept to its centre and Slammed")
up(21,'S', short="the sealed foe follows her on a rope of water 2 s, like a balloon")
up(15,'S', short="hold: the walls squeeze the foes; let go: they squirt out 3 u")
up(14,'U', short="each foe she rides past is lifted in a bubble behind her")
up(9,'S', short="the ring throws her up; she lands at the pointer as a second ring")
up(24,'J', short="the dome closes round her and one foe: others cannot enter or shoot in")
up(23,'J', short="her stream, aimed at the friend, shoots on from the friend's weapon")
up(17,'U', short="press again: she snaps back to where she started and bumps foes away")
up(17,'S', short="she trades places with a foe: it lands flat in her puddle")
up(12,'J', short="the pool is a long channel: it drags foes into single file")
up(10,'U', short="foam: foes it hits are blinded 1.2 s: aimed blows and shots miss")
up(9,'J', name="水环 Hoop", short="a hoop of water circles her 3 s: 4 each 0.3 s",
   full="no ring, no knock back, no Crash: a hoop of water circles her at 1.4 u for 3 s: 4 each 0.3 s to foes it passes through",
   idea="Hoop: a ring of water that circles her 3 s")
# ---------- round 3: the third judge's gaps and disagreements (no new ideas) ----------
up(9,'J', short="no ring, no Crash: a hoop of water circles her 3 s: 4 each 0.3 s")
up(15,'J', short="two jets cross: 12 each; a foe at the crossing takes 36. No stun")
up(15,'U', short="two great bubbles meet and pop: 18, no stun; every wind-up within 4 u breaks")
up(15,'S', short="hold: the walls squeeze the foes (4 each 0.3 s); let go: no stun: they squirt out 3 u")
up(10,'U', short="foam, 12: foes it hits are blinded 1.2 s: aimed blows and shots miss")
up(4,'S', short="each splash (6) throws its foes on to the next: 4.5 u down the line")
up(8,'S', short="the beam is a river (4 each) that pushes the pack along; double on a wall")
up(8,'J', short="the staff stands and fires alone 3 s (6 each); it counts as her stream; she walks free",
   full="she lets go of the staff: it stays planted and keeps a thin beam on its line for 3 s: 6 each 0.25 s; the first hit on each foe is a Crash. The beam counts as her stream: Pressure climbs, and Erosion and the Sea Dragon count it. She walks free and casts with the left paw; she has no second stream until the staff is back at her side (at the end, or press again)",
   motion="she drives the staff in and steps away, one paw trailing off it; it stands humming, hosing its line; at the end it pulls free and hops back to her side, and she lays her paw on it.")
up(18,'S', short="a 10 bubble; the friend rides a wave 4 s: faster, and bumps foes aside: 8")
up(19,'S', short="no slow: three spouts wander: each lifts a foe, spins it and drops it on another")
up(16,'U', short="no pull: she leaves an otter of water: foes attack it 3 s, then it bursts: 40", boss="it ignores the otter; the burst as written")
up(11,'U', full="the current is a ring 2.5 u across at the pointer, 3 s: a foe that steps into it is carried a quarter round and set down outside: 6 a second, soaks. Friends cross freely; shots and leaps cross it")
up(22,'J', full="let go: she surfaces behind the foe nearest the pointer, with the base's burst. That foe has lost her: for 2 s it does not turn and cannot aim at her (a boss 0.4 s)")
up(5,'U', full="foam stays on the fan's floor 4 s: a foe that runs or charges across it falls: stun 0.6 s, once each. A champion is slowed 40% for 1 s instead; a boss is not affected")
up(21,'U', full="the sealed foe takes no damage; the bubble keeps all that is dealt to it, up to the health the foe has left. When it pops the foe takes the store and 30% more, as true damage that is not a hit, and other small foes and elites within 1.5 u take half. A champion or boss is not sealed: the bubble sticks on it 1.5 s, it takes damage as usual, and the bubble then pays 30% of what was dealt")
up(10,'J', short="it breaks into jets, one to each soaked foe within 6 u: 20, a Crash each",
   full="it breaks into jets: one to each soaked foe within 6 u, up to 6: 20, a Crash on each. With none soaked: one jet at the nearest foe: 20")
up(24,'J', full="the dome closes round her and the foe nearest the pointer: for the 5 s other foes cannot enter it and their shots stop at its skin. Friends pass freely. A foe already inside with them stays. The chosen foe cannot leave if it is a small foe or an elite; a champion or boss can")
up(24,'S', full="foes inside cannot leave (a champion or boss can); its skin is a wall for Slam, and a foe thrown into it bounces 1 u back. It ends by falling in as the base")
up(11,'J', full="press and drag for up to 1 s: the cut follows the pointer (on a pad, the stick), up to 6 u, any curve; it stands 4 s: a foe that crosses takes 14 and is soaked (a foe once a second). No current")
up(22,'U', full="no swim: she comes up at once from the water of hers (R12) nearest the pointer, anywhere in the room, with the base's burst. On a pad the reticle jumps to her water in the stick's direction. With none in the room: the base")
up(23,'J', full="for 5 s, while her stream is aimed at the gifted friend, it leaves again from the friend's weapon at the foe that friend hit last, at full strength and reach (Pressure and the water blade too). On its way to the friend it passes through foes. On herself: as the base")
up(3,'U', full="it can wrap a friend: a 12 bubble, and the foes within 1.2 u of that friend are yanked 2 u toward her, soaked. The friend is not moved. A friend under the pointer comes first; with none there it is the base on a foe")
up(18,'B', short="a 14 bubble, 4 s, on the friend under the pointer, else the friend in danger, else herself",
   full="a 14 bubble for 4 s on the friend under the pointer within 4 u; with none there, the friend foes are after; else herself")
up(9,'U', full="12 and the knock back. Crash. Three bubbles circle her 5 s: each stops one whole hit, then pops")
up(12,'S', full="a foe that reaches the centre is swallowed for up to 2 s from when it went under (an elite 1 s). Press again: everything swallowed is spat out in one pile: stun 1 s. A foe whose time ends is spat out the same way")
up(14,'B', motion_base="(the ride, 1.5 s). She hops, a wave lifts under her, and she rides it on her belly (the passed slide), the staff in her right paw pointing ahead, leaning into each turn.")
up(17,'J', motion="on her belly she swings the staff back along her side and fires past her own tail.")
up(9,'S', motion="the ring wall lifts her on its crest; she curls nose to tail, turns once in the air and lands flat on her belly in a second ring.")
# ---------- kit 1.1: Kesh's pick 2a (19 Nov): every skill uses the soak ----------
up(1,'B', short="【浸】a bolt, 5 u: 14. 【湿】it goes on through a soaked foe",
   full="a bolt, 5 u: 14, soaks. Wet: it passes through a soaked foe and goes on to the next, to its full reach")
up(2,'B', short="【拍】a jet through a 5.5 u line: 18")
up(3,'B', short="【浸】grabs the first foe within 4 u and throws it to the pointer: 12. 【湿】a soaked foe lands flat",
   full="a whip, 4 u: it grabs the first foe and throws it to the pointer, up to 3 u: 12, soaks (a foe thrown onto others is a Slam). Wet: a foe that was soaked when grabbed lands flat on its back 0.5 s")
up(4,'B', short="【浸】a stone skips four times along her aim: 10 each; the last 16. 【湿】one more skip for each soaked foe it hits",
   full="a flat stone skips along her aim: four splashes 1.5 u apart: 10 within 0.9 u, soaks; the last: 16. Wet: one more skip for each soaked foe it hits, up to 8 skips")
up(5,'B', short="【浸】a quick wide fan, 3 u: 10. 【湿】a foe already soaked is drenched 透湿: its next Crash does not spend the soak",
   full="a quick fan of water, 3 u, 70°: 10, soaks. No push. Wet: a foe that is already soaked is drenched 透湿 for as long as its soak lasts: the next Crash on it does not spend the soak")
up(6,'B', short="【浸】hold: an orb follows the pointer: 4 each 0.3 s. 【拍】let go: it bursts: 14",
   full="hold up to 3 s: an orb of water follows the pointer: 4 each 0.3 s to foes it touches, soaks. Let go: it bursts: 14 within 1.2 u. Crash")
up(7,'B', short="【拍】hold, then lob a water ball over everything: 18 to 36")
up(8,'B', short="【拍】staff planted: a great beam, 8 u, 2 s: 8 each 0.25 s; she turns slowly")
up(9,'B', short="【拍】a ring round her: 22, knocked back 1 u")
up(10,'B', short="【拍】a wave, 100°, 2.2 u: 20, pushed 1.2 u")
up(11,'B', short="【浸】a current along her aim, 4 s: 6 a second, carries foes down it")
up(12,'B', short="【浸】a pool, 5 s: 4 a second, slows, drags foes to its centre; a foe in it is soaked again at once after a Crash",
   full="a pool within 4 u, 1.4 u, 5 s: 4 a second, soaks, slow 30%, drags foes to its centre. A foe in it whose soak a Crash spends is soaked again at once")
up(13,'B', short="【浸】a water wall, 4 s: stops foes' shots; soaks a foe that walks through. 【拍】press again: it falls as a wave: 16")
up(14,'B', short="【浸】she surfs a wave she steers, 1.5 s: 14 to foes she passes")
up(15,'B', short="【拍】two waves rise at the sides of a spot and clap shut: 18, stun 0.5 s")
up(16,'B', short="【拍】pulls everything within 3 u inward, then bursts: 40")
up(17,'B', short="【浸】she vaults 2.6 u away, untouchable; a puddle stays: 6 a second")
up(18,'B', short="【浸】a 14 bubble, 4 s, on the friend under the pointer, else the friend in danger, else herself; its pop soaks")
up(19,'B', short="【浸】rain, 6 s: 3 a second, slow 25%; its soak lasts 8 s",
   full="rain within 5 u, 1.8 u, 6 s: 3 a second, soaks, slow 25%. A soak from the rain lasts 8 s")
up(20,'B', short="【浸】a spot erupts 0.6 s later: 16, launched 0.8 s. 【湿】a soaked foe flies twice as high",
   full="a spot within 5 u; 0.6 s later it erupts: 16 within 1 u, launched 0.8 s, soaks. Wet: a foe that was soaked is launched 1.6 s")
up(21,'B', short="a bubble seals the first foe: afloat 1.5 s. 【拍】it pops: 12. 【浸】the pop soaks",
   full="a bubble flies to the first foe within 5 u and seals it: afloat 1.5 s. Then it pops: 12 within 1.2 u, a Crash; then the pop soaks")
up(22,'B', short="【浸】she swims under the floor up to 2 s, untouchable; she surfaces: 14, launched")
up(23,'B', short="【浸】a friend's hits soak and splash for 5 s: 4")
up(24,'B', short="【浸】a dome, 5 s: friends inside take 25% less; foes inside are soaked, slowed. 【拍】it falls in: 24")
up(9,'J', short="no ring, no Crash: a hoop of water circles her 3 s: 4 each 0.3 s, soaks",
   full="no ring, no knock back, no Crash: a hoop of water circles her at 1.4 u for 3 s: 4 each 0.3 s to foes it passes through, and it soaks them")
up(6,'J', short="let go: no burst: it shoots off walls 5 times, through every foe: 10 a pass")
up(14,'S', short="【拍】press again as the wave peaks: it breaks: 28, knocked flat")
up(8,'U', short="no damage: small foes are lifted and follow the beam. 【拍】dropped: 20")
# ---------- kit 1.2 and 1.3: Kesh's mark on the page (19 Nov): Breaker Jet redone; Domino and Ram kept ----------
up(9,'J', name="扫圈 Full circle", short="no ring: she spins and her stream sweeps a full circle at its reach: 22",
   full="no ring: she spins once and her stream sweeps a full circle at its full reach (4.5 u; Long Stream lengthens it): 22 to every foe it crosses, knocked back 1 u. Crash. While the water blade is on, the sweep is the blade: double. The stream ends on her aim and never stops",
   idea="Full circle: the stream itself sweeps round her", boss="not knocked back: 20% more", beat="Swing, a full ring", sound="the pour whipping round once", ai="with three foes inside the stream's reach, or foes on two sides",
   motion="she plants one foot and spins a full turn, staff level, the stream whipping round her like a ribbon dancer's ribbon; it ends on her aim with a small skid.")
up(10,'J', name="骨牌 Domino", short="a pulse down her stream Crashes its foe: 20; the Crash jumps on from soaked foe to soaked foe, up to 5",
   full="no cone: a pulse runs down her stream and breaks on the foe at its end (stream off: the first foe on her aim within 4.5 u): 20, pushed 1.2 u. Crash. If that foe was soaked, the spent water jumps to the nearest soaked foe within 4 u and Crashes it too: 20; and on again, up to 5 foes, a foe once",
   idea="Domino: the Crash jumps from soaked foe to soaked foe", boss="not pushed: 20% more; the chain starts from it as from any foe", beat="Shot; a small Nova on each", sound="a thump down a hose, then splashes hopping away", ai="on a soaked foe with other soaked foes near it",
   motion="a bulge runs down the stream like an egg down a hose and bursts on the foe; smaller bulges hop on from wet foe to wet foe.")
up(13,'J', name="推墙 Ram", short="her stream pushes the wall forward: it stops shots, shoves small foes and breaks on the first big foe: 16",
   full="the wall is a pane 2 u wide, 1 u in front of her, 4 s. Her stream pushes it: while the stream is on its back it slides forward at 2 u a second, up to 6 u, stopping foes' shots; small foes in front of it are shoved along and soaked (they can Slam). It breaks on the first elite, champion, boss or wall, at 6 u, at 4 s, or on a second press: 16 within 2 u. Crash. Pressure does not fall while she pushes",
   idea="Ram: her stream pushes her own wall", boss="the pane breaks on it: 20% more", beat="Ward, a pane; Nova at the break", sound="a hiss on glass, shots thudding, a crash", ai="down a line of shooters, or at a big foe behind small ones",
   motion="a clear pane rises at her nose; she leans into the stream, knees bent, and the pane slides away like a puck on ice, shots thudding into it; it shatters on a big foe.")

# ---------- kit 1.4: Kesh's five marks on the page (19 Nov, 14:30 SGT) ----------
up(11,'B', short="【拍】all her water in the room, and the floor within 2 u of her, rises as waves: 16 to foes standing in it; that water lasts 2 s longer",
   full="every piece of her water in the room (R12) and the floor within 2 u of her rises at once as a standing wave: 16 to each foe standing in it, a foe once. Crash. The water it rose from lasts 2 s longer. A left-paw cast",
   boss="as written", beat="Nova, one at each piece of water", sound="a deep pull of the tide, then many waves breaking at once", ai="when three or more foes stand in her water",
   motion_base="She lifts the left paw slowly, palm up, as if raising the sea on a string: every wet patch on the floor swells, stands up as a small wave and breaks where it stands; a ring of tide rises round her feet.")
up(11,'J', name="百川 Hundred rivers", short="no waves: every piece of her water fires a jet at the foe her stream is on: 8 each, up to 6",
   full="no waves: each piece of her water within 8 u, and the tide at her feet, fires one jet at the foe her stream is on (stream off: the foe nearest the pointer within 6 u): 8 each, up to 6 jets, one after another. The first is the Crash. The water is not spent, and lasts 2 s longer",
   idea="Hundred rivers: all her water shoots one foe", boss="as written: this is its use", beat="Shot, many lines to one point", sound="quick spits from all sides, a rising scale", ai="on the boss or the biggest foe, with three or more pieces of water down",
   motion="the left paw points at the foe: each wet patch lifts a thin jet that arcs in to it, one after another, from every side.")
up(11,'S', name="聚潮 Gathering tide", short="each wave throws its foes 3 u toward the pointer: they Slam where they meet",
   full="each wave breaks toward the pointer: 16 (Crash), and its foes are thrown 3 u toward the pointer (R9: they Slam on walls and on each other)",
   idea="Gathering tide: waves from everywhere throw the pack to one spot", boss="not thrown: 20% more", beat="Nova at each piece of water, then throws inward", sound="waves breaking inward, bodies thudding together", ai="pointer on a wall or on the thickest pack",
   motion="the left paw sweeps to the pointer: every wave leans that way as it breaks and flings its foes toward the spot.")
up(11,'U', name="泡涌 Bubbling up", short="no damage: foes in her water float up 1.2 s; friends in her water get a 10 bubble",
   full="no damage and no Crash: each small foe standing in her water is lifted afloat in a bubble 1.2 s (an elite 0.6 s) and lands soaked; each friend standing in her water, herself too, gets a 10 bubble for 4 s",
   idea="Bubbling up: her water blows bubbles under everyone in it", boss="not lifted: it is soaked", beat="Ward on each friend; a lift on each foe", sound="a kettle of bubbles rising, soft pops", ai="when friends fight in her water",
   motion="the left paw wiggles upward: the wet patches fizz like soda and bubbles rise under everyone standing in them: foes go up, friends are wrapped.")
up(12,'J', name="点名 Roll call", short="no drag: each foe her stream touches is sucked down and comes up in the pool",
   full="no drag of its own; the ticks, the soak and the slow stay. While the pool lasts, each small foe or elite her stream touches is sucked down a small whirl under its feet and comes up at the pool's centre 0.3 s later, a foe once. A champion or boss is not taken: the pool slides under it instead, once",
   idea="Roll call: the stream picks who goes into the pool", boss="not taken: the pool slides under it; the ticks 20% more", beat="Zone pulse; a small whirl under each foe taken", sound="a plughole gulp, then a pop as it comes up", ai="pool on the melee line, then the stream across the shooters",
   motion="she stirs the staff's tip once and the pool opens; where her stream touches a foe a small whirl opens under its feet, it drops through with its arms up, and bobs up in the pool.")
up(13,'S', name="倒海 Sea fall", short="the wall climbs while it stands; press again: it curls over and crashes down like a tsunami: 16 to 32, 2 to 5 u deep",
   full="the wall climbs while it stands, 1 u a second. Press again, or at 4 s: it curls over and crashes down forward like a tsunami, covering the floor in front of it as deep as it is tall: 2 u and 16 at once, up to 5 u and 32 after 3 s. Crash. Foes under it are knocked flat 0.5 s and washed to its far edge (a wash that ends: they can Slam there)",
   idea="Sea fall: the wall grows into a tsunami and falls", boss="not washed or knocked flat: 20% more", beat="Ward, a wall; Slam at the fall, a long sheet", sound="a roar that deepens as it climbs, a hush, one huge flat crash", ai="raise it against shooters; drop it when the pack is in its shadow",
   motion="the wall keeps climbing and its crest curls forward, foaming; its shadow creeps out over the floor to show where it will land. On the press she chops the left paw down and the whole wall topples and slaps flat, a white sheet racing to its far edge.")
up(19,'J', name="乌云罩顶 Raincloud", short="no area: one small cloud follows the foe her stream is on: 9 a second, and it is always soaked",
   full="no area: one small cloud hangs over the foe her stream is on (stream off: the foe nearest the pointer within 6 u) and follows it, 6 s: 9 a second to it alone, slow 25%. It is soaked the whole time: when a Crash spends the soak, the next drop soaks it again (within 0.3 s). If it falls, the cloud drifts to the foe her stream is on. The floor under the cloud is her water",
   idea="Raincloud: one foe carries its own rain", boss="as written, without the slow: this is its use", beat="Placed, rain; a small cloud that follows", sound="a small grumbling cloud, rain on one hat", ai="on the boss or the biggest foe",
   motion="she flicks a pawful of water straight up: a small dark cloud puffs open over the foe's head, no wider than its shoulders, and pours on it alone; it trots after the foe like a balloon on a string.")
up(21,'S', short="the sealed foe follows her on a rope of water 2 s, like a balloon; press again: she throws it to the pointer",
   full="the bubble with its foe follows her on a rope of water, 1.5 u behind, for 2 s (an elite 1 s). Press again while it is towed: she swings the rope once and throws the bubble to the pointer, up to 5 u: it pops where it lands (12 within 1.2 u, Crash, then the pop soaks); thrown onto a wall or a foe it Slams (R9). If the time ends first it pops where it is",
   idea="Tow: she leads one foe away, then throws it where she likes", beat="Ward, on a foe; a Swing at the throw", sound="a rubber squeak, following; a whoosh and a wet pop", ai="pull a dangerous foe off a friend, then throw it at a wall or into the pack",
   motion="a ribbon runs from the staff's butt to the bubble; it bobs after her and bumps her tail when she stops. On the second press she turns once with the rope over her head, like a hammer thrower, and lets the bubble fly to the pointer.")

# ---------- kit 1.5: Kesh's mark "Ripple Step: base, jet and bubble: re-design" (19 Nov, 14:54 SGT) ----------
up(17,'B', short="【浸】three quick steps, 1.6 u each, untouchable as she steps; each landing spreads a ripple: 6, and leaves a puddle",
   full="up to three steps within 3 s, one a press: each 1.6 u the way she is moving (standing still: away from her aim), untouchable for the step. Each landing spreads a ripple, 1.5 u: 6, soaks, and leaves a puddle there, 0.8 u, 3 s: 6 a second, soaks. The cooldown starts at the first step. A step pauses the stream for a blink and keeps its count",
   boss="as written", beat="Dash, three short; a ring at each landing", sound="three light taps on water, each a note higher", ai="one step out of a blow; all three through a pack to soak it",
   motion_base="(Step, 0.2 s a step). Three light hops on the water, knees bent, tail out for balance: she barely touches the floor; a ripple ring spreads from each landing and settles into a puddle. The belly slide passed on her model page stays as Home Waters' slide.")
up(17,'J', name="绕步 Ring step", short="the steps circle the foe her stream is on, a third of the way round each; the stream stays on it; the third closes a ring: 16",
   full="with her stream on a foe, each step carries her a third of the way round it at the same distance, left or right as she is moving, untouchable for the step; the stream stays on the foe and does not pause. No ripples: each landing leaves the puddle. The third step closes a ring of water on that foe: 16. Crash. Stream off: the base",
   idea="Ring step: she circles her stream's foe and closes a ring on it", boss="as written: this is its use", beat="Dash, three arcs; a ring closing", sound="three skate strokes on water, a ring snapping shut", ai="round a boss or an elite as its blow winds up",
   motion="she skates sideways on one foot round the foe, leaning in like a speed skater, the staff pointed at it the whole way; each landing draws an arc on the floor; the third arc joins the first and the ring snaps shut on the foe.")
up(17,'S', full="no steps: she trades places with the small foe or elite under the pointer within 4 u, untouchable as she goes; it lands in a puddle where she stood, soaked and knocked flat 0.5 s. A champion, a boss or no foe: the base",
   boss="no swap: the base steps")
up(17,'U', name="踩泡 Bubble hop", short="her steps bounce off heads: a friend she bounces on gets an 8 bubble; a foe is lifted 0.6 s",
   full="each step can land on the head of the friend or foe nearest the pointer within 3 u: she bounces off a bubble on it and comes down 1 u beyond, untouchable. A friend she bounces on gets an 8 bubble, 4 s. A small foe is lifted afloat in the bubble 0.6 s (an elite 0.3 s) and lands soaked. No ripples, no puddles. With no one in reach: the base step",
   idea="Bubble hop: she bounces from head to head, bubbling friends and lifting foes", boss="not lifted: it is soaked", beat="Dash; Ward on a friend; a lift on a foe", sound="three rubbery boings, rising", ai="to the friend under attack, then off the foe that is hitting them",
   motion="a bubble swells on the head she aims at; she springs onto it feet first, knees bent, it squashes like a trampoline and throws her on; a friend's bubble slides down round them, a foe's lifts it off its feet.")

# ---------- kit 1.6: Kesh's mark "Ripple Step: jet style: re-design" (19 Nov, 15:04 SGT); the Ring step is gone ----------
up(17,'J', name="水影 Water double", short="each step leaves a water copy of her where she stood, 3 s: it goes on streaming at her foe, for half; her own stream does not pause",
   full="the base steps, and her stream does not pause. Each place she steps from keeps a water copy of her, 3 s, up to three: each copy pours a stream at the foe her stream is on, for half damage, and stops when hers stops. Foes ignore the copies and cannot hit them",
   idea="Water double: each step leaves a copy of her that keeps streaming", boss="as written: this is its use", beat="Dash, three short; a standing copy where she stepped from", sound="three light taps, then three thin pours joining hers", ai="three steps round a boss or an elite while she streams",
   motion="each hop leaves a clear water otter standing where she was, in her last pose, staff out, pouring a thin stream at the same foe; they wobble like jelly and fall as a splash when the time ends.")

# ---------- kit 1.7: Kesh's mark on Floodgate's Bubble form (19 Nov, 15:16 SGT): a wave of bubbles, blown out, pop at the end, fall ----------
up(8,'U', name="泡浪 Bubble wave", short="no beam: she blows a wave of bubbles down the line: small foes are sealed and blown to its end. 【拍】there the bubble pops: 20, and they fall flat",
   full="no beam: for the 2 s she blows a wave of bubbles down the 8 u line, turning slowly. Each small foe it touches is sealed in a bubble and blown along to the line's end (an elite half as far): afloat, a hold (R10). There the bubble pops: 20. Crash; then the pop soaks, and the foe falls to the ground, flat 0.5 s. A foe blown into a wall pops there and Slams (R9). A champion or boss is not sealed: the bubbles burst on it: 4 each 0.25 s",
   idea="Bubble wave: foes are bubbled, blown to the end of the line, popped and dropped", boss="not sealed: the bubbles burst on it, 4 each 0.25 s, 20% more", beat="Channel, a wave of bubbles; a pop and a drop at the end", sound="a long breath through a bubble wand, a hundred small pops, thumps as they land", ai="down a lane of small foes, away from the party",
   motion="the planted staff's shell tip opens like a bubble wand; she puffs her cheeks and blows across it (no paw to her mouth): a rolling wave of bubbles pours down the line, the big ones swallowing foes and tumbling them along; at the end they pop in a row and the foes drop on their backs.")

# ---------- kit 1.7: Kesh's mark "Depth Charge: jet style: re-design" (19 Nov, 15:16 SGT); the Bore is gone ----------
up(7,'J', name="鱼雷 Torpedo", short="no lob: it dives under the floor and swims to the foe her stream is on, turning with it; it comes up under that foe: 18 to 36",
   full="hold as the base, then no lob: the ball dives under the floor and swims at 8 u a second to the foe her stream is on (stream off: the foe nearest the pointer), turning as that foe moves, for up to 3 s; walls and other foes do not stop it. It comes up under that foe: 18 to 36 to it alone. Crash. If its foe falls first, it turns to the nearest foe",
   idea="Torpedo: it swims under the floor and hunts her stream's foe", boss="as written: this is its use", beat="In flight, a wake on the floor; a burst from below", sound="a plop, a rising whirr under the floor, a thump from below", ai="at the foe her stream is on, or a shooter behind cover",
   motion="she tips the staff down and the ball slides off its tip into the floor; a V-shaped wake races across the floor, bends after its foe, and the ball bursts up under it in a column.")

# ---------- kit 1.8: Kesh's mark "Spray: Jet style: re-design" (19 Nov, 22:25 SGT); Point-blank is gone ----------
up(5,'J', name="洒水头 Sprinkler", short="no fan: 3 s: her stream bursts into a round spray where it ends: the foe it is on and the foes round it are soaked: 2 each 0.5 s",
   full="no fan: for 3 s her stream bursts into a round spray where it ends, 2.5 u: every 0.5 s, 2 to the foe the stream is on and to each foe round it, soaks; a foe already soaked is drenched, as the base. The spray moves with the stream's end. Stream off: the base fan",
   idea="Sprinkler: the foe her stream is on sprays everyone round it", boss="as written: it and its helpers are soaked and drenched", beat="Channel on the stream's end; a spinning spray", sound="a lawn sprinkler's tick-tick-hiss over the pour", ai="when her stream's foe has others round it; before a Crash skill",
   motion="a flick of the left paw: where her stream strikes, the water flies off the foe in a spinning wheel of arcs, like a lawn sprinkler, wetting everyone round it; the foe in the middle drips.")

# ---------- kit 1.9: Kesh's mark "Rain Squall: jet style: re-design" again (19 Nov, 22:31 SGT); the Raincloud is gone ----------
up(19,'J', name="悬雨 Hanging rain", short="the rain stops in mid-air: foes among the drops are soaked and slowed; after 2 s, or on a second press, every drop flies at the foe her stream is on: 36",
   full="the rain does not fall: the drops hang still in the air over the area for 2 s: foes among them are soaked (8 s) and slowed 25%, no damage. Then, or on a second press, every drop turns into a needle and flies at the foe her stream is on (stream off: the foe nearest the pointer within 8 u): 36 to it alone, and it is soaked 8 s. Not a Crash",
   idea="Hanging rain: the rain stops in the air, then all of it flies at one foe", boss="as written: this is its use", beat="Placed, rain held still; Shot, many lines to one point", sound="the rain cuts to silence, a held breath, then a rush like a flight of arrows", ai="over the pack beside its target; loosed at once if the target stands alone",
   motion="she flicks the staff up, then holds the left paw out flat: the rain stops dead, every drop hanging and glinting; she turns the paw and points: the drops stretch into needles, swing round together and streak into the foe from above and all sides.")

# ---------- kit 1.9, his change of 22:45 SGT: "change to like base rain, but will have rain hanged, then after same as current one" ----------
up(19,'J', short="the rain falls as the base for 1 s, then stops in mid-air 2 s: foes among the drops stay soaked and slowed; then, or on a second press, every drop flies at the foe her stream is on: 36",
   full="the rain falls as the base for 1 s (3 a second, soaks 8 s, slow 25%). Then the drops stop where they are and hang for 2 s: foes among them are still soaked and slowed, no damage. Then, or on a second press at any time, every drop turns into a needle and flies at the foe her stream is on (stream off: the foe nearest the pointer within 8 u): 36 to it alone, and it is soaked 8 s. Not a Crash",
   idea="Hanging rain: the rain falls, stops in the air, then all of it flies at one foe", beat="Placed, rain; the rain held still; Shot, many lines to one point", sound="the passed rain, cut to silence, a held breath, then a rush like a flight of arrows",
   motion="the passed cloud and falling streaks for a moment; then she holds the left paw out flat and the rain stops dead where it is, every drop hanging and glinting; she turns the paw and points: the drops stretch into needles, swing round together and streak into the foe from above and all sides.")

# ---------- kit 1.9, his design of 22:52 SGT: base rain 6 s; every X s X drops hang, X s later they fire at the streamed target, else the lowest-health foe ----------
up(19,'J', short="the base rain, and every second three of its drops stop in mid-air; a second later they fire at the foe her stream is on: 2 each (stream off: at the foe with the least health)",
   full="the rain as the base, all 6 s (3 a second, soaks 8 s, slow 25%). While it rains, every second three drops stop and hang over the rain; one second later they fire as needles at the foe her stream is on: 2 each, and it is soaked 8 s. With the stream off they fire at the foe with the least health within 8 u of her. Six volleys, 36 in all. Not a Crash. No second press",
   idea="Hanging rain: base rain whose drops stop in the air, then fire at her stream's foe", boss="as written: this is its use", beat="Placed, rain; three drops held still, then Shot, each second", sound="the passed rain; each second a small hush, then three quick darts", ai="rain on the pack, stream on the boss or the biggest foe",
   motion="the passed cloud and falling streaks. Each second three drops stop dead high in the rain and hang, glinting; a second later they stretch into needles, turn together and streak into the foe her stream is on. She only keeps streaming: no extra move.")

# ====================================================================================
# kit 2.0 (20-21 Nov): Kesh's pick "1 and 2": Tsunami and Flood beside Bubble.
# Column J is now Flood 涨潮, column S is Tsunami 海啸. Jet and Surge are gone.
# ====================================================================================
def form(f, col, name, short, full, idea, boss, beat, sound, ai, motion):
    C[(f, col)] = dict(name=name, short=short, full=full, idea=idea, boss=boss, beat=beat, sound=sound, ai=ai, motion=motion)

# ---------- the 20 Nov base change (VFX thread, his pick): F13 is Sky Fall ----------
C[(13,'B')] = dict(
   short="【浸】she points: a round waterfall pours from the sky onto the spot, 4 s: washes down foes' shots that fly into it; foes under it are soaked and 40% slower. 【拍】press again: the whole fall drops at once: 16",
   full="she points at a spot within 5 u: a round waterfall, 1.4 u wide, pours from the sky onto it for 4 s: foes' shots that fly into it are washed down; foes under it are soaked and 40% slower. Press again within the 4 s: the whole fall drops at once: 16 to the foes under it. Crash. Not pressed: it runs dry at 4 s",
   idea="a waterfall from the sky that washes shots down, then drops", boss="as written", beat="Ward, a waterfall; Nova at the drop",
   sound="a steady fall of water, then one heavy drop", ai="on the shooters' line to the party, or on a pack; drops it when three foes are under it",
   motion_base="(Point up, 0.6 s). She lifts the staff slowly, tip up, as if pulling a cord: a round waterfall pours out of the sky onto the spot, shots sinking into it. The drop: she chops the left paw down and the whole column lets go at once.")

# ---------- Flood 涨潮: 24 forms (column J) ----------
form(1,'J', "添塘 Pond-maker",
   "the bolt bursts where it lands: 14 within 1.5 u, and leaves a pond, 2 u, 6 s. Shot into her water, it makes that piece 1 u wider instead",
   "the bolt bursts on the first foe or at its full reach: 14 to every foe within 1.5 u, soaks, and leaves a pond of still water there, 2 u wide, 6 s. If it lands in her water there is no new pond: that piece grows 1 u wider and its time starts again. The base's 湿 line is dropped",
   "Pond-maker: every bolt is a new pond", "as written", "Shot; a small Nova; a pond left", "a spit, a plop, water settling",
   "on cooldown, at the pack's feet, or to widen the water foes stand in",
   "the bolt is fat and heavy; it bursts like a dropped water balloon and the splash settles into a round pond with a foam edge.")
form(2,'J', "开渠 Canal",
   "the jet's line stays 6 s as a canal; a canal joins every piece of water it touches into one",
   "the jet as the base (18, Crash); its line stays as a canal of still water, 5.5 u long, 1 u wide, 6 s. Water that touches is one piece (R12), so a canal through two ponds makes them one",
   "Canal: a line of water that joins her ponds", "as written", "Shot; a line left on the floor", "the passed blast, then a trickle running down a channel",
   "through two pieces of her water that have foes in them",
   "the jet scores the floor and the score fills behind it; where it meets a pond the foam edges open and the two run together.")
form(3,'J', "摔水 Dunk",
   "the whip grabs the first foe and dunks it into her nearest water: it lands flat, and the splash hits every foe in that piece: 12",
   "the whip grabs the first foe within 4 u and throws it into the piece of her water nearest the pointer, up to 5 u: it lands flat 0.5 s, and the splash hits it and every other foe standing in that piece: 12 each, soaks. With none of her water within 5 u: the base",
   "Dunk: one foe thrown into the pond splashes everyone in it", "not thrown: 20% more; if it stands in her water the splash still goes out", "Swing; a Nova on the water", "a whip crack, a belly flop",
   "throws a shooter into the pond the pack stands in",
   "the ribbon lifts the foe high and brings it down flat on the pond like a belly flop; a crown of water jumps from the whole pond at once.")
form(4,'J', "逐水 Pond-hopper",
   "the stone skips from piece to piece of her water, nearest first, up to 6: each splash hits the whole piece: 10",
   "the first splash lands as the base, 1.5 u along her aim; then the stone turns and skips to the nearest piece of her water within 5 u, and on to the next, up to 6 skips, a piece once. A splash on her water hits every foe standing in that piece: 10, soaks; the last: 16. With no water in reach: the base. The base's 湿 line is dropped",
   "Pond-hopper: the stone visits each of her waters in turn", "as written", "Shot; a Nova on each piece", "plunks, each higher, each with a wide slosh",
   "when three or more pieces of her water hold foes",
   "the disc skims from pond to pond round the room; each pond it touches jumps as one sheet.")
form(5,'J', "赶水 Sweep-in",
   "the fan washes the foes it hits up to 2.5 u toward her nearest water",
   "the fan as the base (10, soaks, drenches), and it washes each foe it hits up to 2.5 u toward the nearest piece of her water; a foe stops once it is inside. A foe already standing in her water is not moved",
   "Sweep-in: the fan sweeps foes into her water", "not washed: 20% more", "Swing; a wash toward the water", "a hose burst, a slide over wet stone",
   "when foes stand just outside her water",
   "she sweeps the fan low like a yard broom; a thin sheet of water carries the foes off their feet and tips them into the pond.")
form(6,'J', "画水 Paint",
   "the orb trails still water wherever it rolls; let go: it bursts and leaves a pool",
   "hold up to 3 s as the base (4 each 0.3 s, soaks): the orb leaves a trail of still water behind it, 1 u wide, 6 s. Let go: it bursts as the base (14, Crash) and leaves a pool, 2.4 u, 6 s. The trail and the pool are one piece",
   "Paint: she draws the water where she wants it", "as written", "Placed, held; a trail left", "a low hum, a brush on wet paper",
   "draws a line through the pack to her other water",
   "the orb rolls like a wet brush across the floor and leaves a shining stroke; she steers with the left paw as if painting; the burst leaves a round blot at the stroke's end.")
form(7,'J', "伏雷 Sleeper",
   "lobbed into her water it sinks, and the whole piece goes up under the foes in it: 18 to 36 each. No foe in it: it waits for the first to step in",
   "the hold and the lob as the base. Onto dry floor: the base. Into her water: the ball sinks without a splash and the whole piece erupts: 18 to 36 to every foe standing in it. Crash. With no foe in that piece it waits there, up to 8 s, and goes off when the first foe steps in. One charge waits at a time",
   "Sleeper: a mine that blows the whole pond", "as written", "Placed; a Nova as wide as the water", "a plop, a held breath under water, the whole pond going up",
   "into the largest piece with foes in it; else into the water foes are walking to",
   "the ball drops into the pond and sinks, a dark round shadow under the surface; then the whole pond lifts at once like a lid blown off.")
form(8,'J', "开闸 Open the gate",
   "no beam: for 2 s water pours out at the staff and spreads in front of her: a sea 8 u long and 5 u wide, 8 s. 【拍】its front: 24",
   "no beam: for the 2 s water pours out of the floor at the planted staff and spreads forward as a low flood, to 8 u long and 5 u wide; she turns slowly. Its front hits each foe once as it reaches it: 24, pushed 1 u. Crash. The flooded floor stays as one piece of still water for 8 s",
   "Open the gate: one cast floods a third of the room", "not pushed: 20% more", "Nova, a spreading sheet", "a sluice opening, a long rush, then lapping water",
   "toward the pack, when fewer than two pieces of her water are down",
   "she drives the staff in and leans back on it, tail braced; the floor cracks open at its foot and the water comes out low and wide, a foam front running away from her over the whole floor ahead; it settles ankle-deep and stays.")
form(9,'J', "涨环 Spreading ring",
   "the ring rolls on to 3 u: 22 near her, 11 beyond; the floor it crossed stays as a round pool, 6 s",
   "the ring as the base within 1.4 u (22, knocked back 1 u, Crash); it rolls on as a low ring to 3 u: 11 to the foes it reaches there, soaks, no knock back. All the floor it crossed stays as one round pool of still water where she stood, 6 s",
   "Spreading ring: the ring leaves a pool round her", "not knocked back: 20% more", "Nova; a pool left", "the passed ring, running out long and thin",
   "with two foes within 1.4 u, or to put water under the pack round her",
   "the ring breaks and keeps going as a low ripple, and the floor inside it stays wet and bright; she ends standing in the middle of her own pond.")
form(10,'J', "滚潮 Roll-up",
   "the wave rolls 5 u and picks up every piece of her water it crosses: wider and 4 stronger for each; at its end it lays them down as one pool",
   "the wave rolls on 5 u along her aim: 20, pushed 1.2 u. Crash. Each piece of her water it crosses is picked up: the wave is 0.5 u wider and hits for 4 more, up to 3 pieces. Where it ends it lays down all the water it carries as one pool, 2 u wide and 1 u more for each piece, 6 s",
   "Roll-up: the wave gathers her ponds and sets them down as one", "not pushed: 20% more", "Swing; a wave that grows", "the passed crash, swelling as it drinks each pond",
   "along a line of her ponds toward the pack",
   "the wave crosses a pond and the pond is gone, rolled up into it like a carpet; it comes out taller and whiter each time, then lies down flat as one wide pool.")
form(11,'J', "连潮 Tide on tide",
   "cooldown 5 s. Each cast within 6 s of the last rises higher: 16, 20, 24, 28",
   "the base, on a 5 s cooldown. A cast within 6 s of her last one rises higher: 16, then 20, 24 and 28, where it stays. Each cast still gives the water it rose from 2 s more",
   "Tide on tide: the short cooldown; each tide higher than the last", "as written", "Nova, one at each piece of water, taller each time", "the deep pull of the tide, a step higher each cast",
   "on cooldown while two or more foes stand in her water",
   "the same slow lift of the left paw, higher each time: the first tide is knee-high, the fourth stands over the foes' heads before it breaks.")
form(12,'J', "吞水 Drinker",
   "the pool drinks her other water that touches it: 0.7 u wider and 2 s longer for each piece, up to three times as wide",
   "the pool as the base. While it turns, any other piece of her water that touches it is drunk: that water is gone, and the pool is 0.7 u wider and lasts 2 s longer for each piece, up to 4.2 u wide and 11 s. Its ticks, slow and drag cover all of it. Water laid on it later is drunk too",
   "Drinker: the whirlpool eats her ponds and grows", "not dragged: the ticks 20% more", "Zone pulse, growing", "the passed swirl, a gulp for each pond, deeper each time",
   "on a pack that stands between her ponds",
   "the ponds near it stretch into ribbons and run down into the pool; its rim jumps outward with each one, the foam lines winding tighter.")
form(13,'J', "瀑潭 Plunge pool",
   "the fall fills a pool that spreads 1 u a second, to 5 u; the drop hits the whole pool: 16; the pool stays 6 s",
   "the fall as the base; under it a pool of still water spreads, 1 u wider each second, from 1.4 u to 5 u wide at 4 s. On the press the fall drops and the blow runs out through the whole pool: 16 to every foe standing in it. Crash. The pool stays 6 s after the fall ends",
   "Plunge pool: the waterfall fills a pool, and the drop hits all of it", "as written", "Ward, a waterfall; a pool spreading; Nova at the drop", "a steady fall into deepening water, then one heavy drop",
   "on the pack; drops it when four foes stand in the pool",
   "the fall drums on the floor and the water runs out from under it in a widening round pool; on the press the whole column lets go and a ring runs out to the pool's edge.")
form(14,'J', "破浪 Bow wave",
   "she rides 2.5 s; the wave lays a road of water 2 u wide behind her, 6 s",
   "she surfs for 2.5 s, up to 10 u, steering; foes she passes take 14, are soaked and knocked 1 u aside, as the base. Behind her the wave lays a road of still water, 2 u wide, 6 s, one piece with any water it crosses",
   "Bow wave: she draws a road of water with her own ride", "not knocked aside: 20% more", "Dash; a road left", "a rolling wave, water sheeting out behind",
   "rides a line that joins her ponds, through the pack",
   "she rides as the base; the wave spreads flat behind her like the wake of a boat and stays, a bright road with a foam edge.")
form(15,'J', "撞水 Pond clap",
   "the two pieces of her water nearest the spot slide together and clap there: 18, stun 0.5 s; foes in them are carried along; they stay as one pool",
   "no side waves: the two pieces of her water nearest the spot, within 6 u of it, slide across the floor and clap together on it: 18 to the foes at the spot and to the foes carried, stun 0.5 s. Crash. Small foes standing in either piece are carried along with it (a carry, R10). The two stay there as one pool, 6 s. With one piece in reach: it slides to the spot alone: 18, no stun. With none: the base",
   "Pond clap: two ponds slide together and clap", "not carried: 20% more; the stun lasts 0.25 s", "Placed; two pools sliding; a Nova where they meet", "two long slides over stone, a boom",
   "spot between two pieces that hold foes",
   "she drops the staff's tip to the floor and drags it toward her: two ponds run across the floor like beads of water on glass, the foes rocking on them, and meet with a boom and a tall thin fin of spray.")
form(16,'J', "排空 Drain",
   "all her water in the room drains to her, dragging the foes in it; then the burst: 40, and 6 more and 0.3 u wider for each piece. The water is spent",
   "every piece of her water in the room runs to her spot in 1 s, and small foes standing in it are dragged with it up to 4 u toward her; the base's pull within 3 u too. Then the burst: 40 to every foe within 1.6 u, 6 more and 0.3 u wider for each piece drained, up to 5 pieces: 70 within 3.1 u. Crash. All the water drained is spent",
   "Drain: she pulls the plug: all her water for one burst", "not dragged: 20% more", "Nova; streams running in from the whole room", "a plughole roar from every corner, a beat of silence, the column",
   "when four pieces are down and the pack stands in them",
   "she spins with the staff out and every pond in the room stretches into a stream and runs to her feet, the foes sliding with them; one beat of stillness on a dry floor; then the column, as tall as the water it drank.")
form(17,'J', "凌波 Water walk",
   "a step that starts on her water crosses the whole piece in one go",
   "a step that starts on her water carries her to that piece's far edge the way she is moving, up to 8 u, untouchable: she skims its surface. A step from dry floor is the base step. Each landing spreads the base ripple (6, soaks) and leaves its puddle, which joins the water it touches",
   "Water walk: one step crosses a whole pond", "as written", "Dash, a long skim; a ring at each landing", "a long skate over water, a tap at the landing",
   "to cross her water away from a blow, or to a friend on its far side",
   "she runs across the surface on her toes, tail flat, too light to sink, a line of small rings behind her; she steps off the far edge with a hop.")
form(18,'J', "随身池 Paddling pool",
   "a 10 bubble, and a pool of her water under the friend's feet, 2 u, 5 s: it goes where they go",
   "a 10 bubble for 4 s, and for 5 s a round pool of still water, 2 u wide, lies under the friend and moves with them. It is her water: it soaks, it is one piece with the water it touches while it touches, and her skills read it. On herself: the same",
   "Paddling pool: a friend carries a pool of her water into the pack", "as written", "Ward; a pool under the friend", "the passed bubble, water lapping in step",
   "on the melee friend in the thickest pack",
   "the bubble closes and a bright round pool opens under the friend's feet; it slides with every step they take, lapping at the ankles of the foes round them.")
form(19,'J', "悬雨 Hanging rain",
   "the base rain; every second three of its drops stop in mid-air and a second later fire at the foe her stream is on: 2 each (stream off: the foe with the least health). The rain's floor stays as a pool 6 s after",
   "the rain as the base, all 6 s (3 a second, soaks 8 s, slow 25%). While it rains, every second three drops stop and hang over the rain; one second later they fire as needles at the foe her stream is on: 2 each, and it is soaked 8 s. With the stream off they fire at the foe with the least health within 8 u of her. Six volleys, 36 in all. Not a Crash. No second press. The floor under the rain fills: when the rain ends it stays as a pool of still water, 1.8 u, 6 s",
   "Hanging rain: his design: the rain's drops stop in the air, then fire at her stream's foe; the rain stays as a pool", "as written", "Placed, rain; three drops held still, then Shot, each second; a pool left", "the passed rain; each second a small hush, then three quick darts; lapping water after",
   "rain on the pack, stream on the boss or the biggest foe",
   "the passed cloud and falling streaks. Each second three drops stop dead high in the rain and hang, glinting; a second later they stretch into needles, turn together and streak into the foe her stream is on. The floor under the cloud shines deeper each second; when the cloud goes, a pool is left.")
form(20,'J', "喷涌 Blowout",
   "on her water the whole piece is thrown up: every foe in it is launched: 16; the water lands 1 u wider",
   "on dry floor: the base. On her water: 0.6 s later the whole piece is thrown up with the column: 16 to every foe standing in it, launched 0.8 s (a soaked foe 1.6 s), soaks. The water falls back where it was, 1 u wider, and its time starts again",
   "Blowout: the geyser launches a whole pond", "not launched: 20% more", "Placed; a Nova as wide as the water", "a rumble under the whole pond, a blast, rain falling back",
   "on the piece with the most foes in it",
   "the whole pond shivers, then goes up as one flat sheet with the foes on it and comes down as rain, lying wider than before.")
form(21,'J', "陷水 Sink",
   "on her water: the foe and the small foes within 1.5 u of it sink to the neck: held 1.5 s; then they are thrown out: 12 each",
   "on a foe standing in her water: no bubble: the water opens under it and under each small foe within 1.5 u of it in that piece, up to 4 in all: they sink to the neck, held 1.5 s (an elite 0.75 s; R10): they cannot act and everyone can hit them. Then the water throws them out: 12 each, a Crash; then it soaks them. On a foe on dry floor: the base",
   "Sink: her water swallows a knot of foes to the neck", "not sunk: the 12 at once, 20% more", "Ward, on the water; a Nova as they come up", "a gulp, bubbles, a spit",
   "on the knot of foes in her water that is hitting a friend",
   "a flick of the staff's shell tip at the water: the foes drop straight down to their necks, heads turning, paddling; then the pond spits them out on their backs.")
form(22,'J', "鱼跃 Porpoise",
   "in her water she leaps in and out along her path, up to 5 leaps: each breach 10 within 1.2 u",
   "she dives as the base. While the floor above her is her water she does not stay under: she leaps out and in again along her path, up to 5 leaps in 3 s, untouchable all the way: each breach hits 10 within 1.2 u, soaks, launched 0.3 s. Out of her water: the base swim and the base surfacing",
   "Porpoise: she leaps in and out across her own water", "not launched: 20% more", "Dash, under the floor; a small Nova at each breach", "plunge, breach, plunge, breach, quicker each time",
   "along the longest piece of her water with foes on it",
   "she arcs out of the water nose first, tucked, staff flat along her side, a full curve in the air and back in without a splash; five curves in a row, like a skipping stone that is alive.")
form(23,'J', "共潮 Shared water",
   "for 5 s the friend's hits on a foe standing in her water run through that piece: every other foe in it takes 30%",
   "the base gift (the friend's hits soak and splash: 4 within 1 u), and for the 5 s each hit of that friend on a foe standing in her water runs through that piece: every other foe in it takes 30% of the hit, a foe once each 0.5 s. On herself: the same for her stream",
   "Shared water: a friend's hits run through her water", "as written: its helpers in the same water take the 30%", "Ward; a ripple through the water at each hit", "a ribbon winding; each hit a ripple and small splashes round the pond",
   "on the friend who fights in her water",
   "the ribbon winds round the friend's weapon; each blow they land sends a ring through the pond they stand in, and every foe in it flinches.")
form(24,'J', "水乡 Lagoon",
   "the dome is 5 u wide; when it falls in, its water runs out over 7 u and stays 8 s",
   "the dome is 5 u wide (the base 3 u); inside it as the base: friends take 25% less, foes are soaked and slowed 40%; its floor is her water. It ends by falling in: 24 to the foes inside. Crash. Its water then runs out to 7 u wide and stays as one piece of still water for 8 s",
   "Lagoon: the dome bursts into a lake", "soaked; the slow lasts a fifth", "Nova, a dome; a wide sheet after", "the sea from below, the fall, water running out far",
   "over the friends and the pack together",
   "the dome closes wide and low; when it drops the water does not vanish: it runs out across the floor on all sides and lies there, a lake with the fight in the middle.")

# ---------- Tsunami 海啸 (column S): three new forms, six brought to their 20 Nov state; the rest are Surge's, unchanged ----------
form(1,'S', "浪头 Wave head",
   "no bolt: a wave 2 u wide rolls 6 u: 14 to every foe, pushed 1 u",
   "no bolt: a wave 2 u wide rolls 6 u along her aim, through every foe: 14, pushed 1 u, soaks. The base's 湿 line is dropped",
   "Wave head: her cheapest cast is already a wave", "not pushed: 20% more", "Shot, a wide front", "a spit that opens into a rush",
   "on cooldown, down the longest row of foes",
   "the flick from the hip throws a low curling front as wide as a door; it runs out with a foam lip and sinks.")
form(3,'S', "甩浪 Whip wave",
   "no grab: the whip sweeps a half circle in front of her, 4 u, and a wave runs under its tip: 12, and the small foes are carried to the arc's end in one heap",
   "no grab: the whip sweeps a half circle in front of her at 4 u, from one side to the other, ending on the pointer's side; a wave runs under its tip: 12 to every foe in the half circle, soaks. Small foes are carried along the arc and dropped in one heap at its end (a carry that ends: they Slam on each other and on a wall, R9). Wet: a foe that was soaked lands flat 0.5 s",
   "Whip wave: one sweep piles the whole front into a heap", "not carried: 20% more", "Swing, a half ring", "a whip crack drawn out into a wash, a thud of bodies",
   "sweeps toward a wall, or toward the tank",
   "she coils round the staff and unwinds through a half turn, the ribbon out flat; a wave runs along the floor under its tip like a windscreen wiper and leaves the foes in one pile at the end of the stroke.")
form(7,'S', "拍地 Slam down",
   "no lob: a small whirlpool gathers the pack, then a waterfall drops on it and Slams every foe into the floor: 24",
   "no hold, no lob: a small whirlpool opens at the pointer, within 6 u, and drags the foes within 2.5 u into one knot for 0.6 s; then a waterfall drops on it from the sky: 24 within 1.6 u, and every foe under it is Slammed into the floor: R9's wall Slam, with the floor as the wall. Crash",
   "Slam down: gathered, then the floor is the wall", "not dragged: 20% more; the stun lasts 0.25 s", "Zone pulse, small; then Placed, a fall", "a quick swirl, a fall of water, a flat smack",
   "on a loose pack",
   "she stirs the staff's tip once: a small whirl pulls the foes into a knot; she points up and a waterfall drops on them and presses them flat.")
form(8,'S', "洪峰 Flood crest",
   "she lobs three water balls up behind her; they and she fire together, one river that pushes the pack along (4 each); double on a wall",
   "she lobs three small water balls up behind her; for the 2 s the balls and she each fire a jet of the base's size, side by side, one river about 4 u wide: it pushes every foe in it along at 3 u a second, and she turns it slowly: 4 each 0.25 s; a foe it presses on a wall or pillar takes 8. The first hit on each foe is a Crash",
   "Flood crest: four jets as one river that pushes the pack to the wall", "not pushed: it takes 8 each 0.25 s as if pressed, and 20% more", "Nova, four beams as one", "three plops, then a river breaking out",
   "down a corridor or toward a wall",
   "she flicks three balls of water off the staff's tip up over her shoulder; they hang in a row behind her; she plants the staff and all four fire: one wide river with the foes tumbling in it; she walks it round.")
form(10,'S', "三叠浪 Three Crests",
   "three crests, each bigger: 2.2 u, 4 u, then the third across the whole room: 8 each, pushed 1.2 u each",
   "the wave rolls out as three crests, 0.4 s apart: each 8, pushed 1.2 u (3.6 u for a foe in all three). The first reaches the base's 2.2 u, the second 4 u, and the third rolls on at the base's 100° until it meets a wall. A soaked foe slides 50% farther each time and stays soaked through all three: the third is the Crash. A foe pushed into a wall Slams",
   "Three Crests: three waves, each bigger, the last across the room", "not pushed: each crest 20% more", "Swing, three times, growing", "three crashes, each deeper and longer",
   "when the Crash rule is met in front; with a wall behind the pack",
   "one trunk turn throws all three: a low crest, a taller one behind it, and a third that keeps rising as it goes and does not stop until the far wall.")
form(13,'S', "潮环 Ring out",
   "on the press its pool bursts outward as a ring wave: 16, thrown 2 u out (soaked farther)",
   "the fall as the base. On the press the fall drops and its pool bursts outward as a ring wave, to 3 u: 16, and every foe it reaches is thrown 2 u outward (a soaked foe farther; they can Slam). Crash",
   "Ring out: the fall lands and a ring wave throws the pack outward", "not thrown: 20% more", "Ward, a waterfall; Nova, a ring, at the drop", "a steady fall, one heavy drop, a ring running out",
   "on the middle of a pack that stands near walls",
   "the fall lets go at once; where it lands the pool jumps outward as a ring wave with a foam lip, and the foes go out with it.")
form(15,'S', "夹击 Vice",
   "the two waves crush together: 20 (32 on a soaked foe), no stun; the foes between squirt out 3 u",
   "the two waves run in and crush the foes between: one hit of 20, a Crash (32 on a soaked foe). No stun and no hold: the pack squirts out 3 u along her aim and can Slam",
   "Vice: crushed, then squirted out", "not squirted out: 20% more", "Placed, two waves", "a boom, a wet squirt",
   "aimed along a wall, on a spread pack",
   "the two waves slam shut on the pack and it shoots out of the gap like a pip from between two fingers.")
form(16,'S', "瀑压 Fall slam",
   "the burst launches them 1.2 s; a waterfall drops from the sky and slams them down into a ring: 12",
   "the burst: 40, launched 1.2 s. Crash. Then a waterfall drops from the sky on the launched foes and slams them down; where it lands a ring runs out: 12, pushed 2 u",
   "Fall slam: launched, then a waterfall slams them down", "not launched: 20% more", "Nova; then Placed, a fall, and a ring", "the spiral and the column, a held breath, a fall and a slap",
   "as the base",
   "the column throws the pack up; a waterfall comes down on them out of the sky and drives them into the floor, a ring running out from the landing.")
form(17,'S', "蹬浪 Kick waves",
   "each landing kicks a wave at the pointer, 3 u long, 2 u wide: 8, pushed 1 u",
   "the base steps; in place of the ripple, each landing kicks a wave toward the pointer, 2 u wide, 3 u long: 8 to every foe, pushed 1 u, soaks. Three steps, three waves. The puddle is left as the base",
   "Kick waves: every step throws a wave at her aim", "not pushed: 20% more", "Dash, three short; a Swing at each landing", "three taps, three short crashes",
   "steps sideways along a pack's front and kicks it back",
   "she lands each hop with a swing of the tail along the floor, knees bent, and the tail throws a low wave off toward her aim.")

# ---------- Bubble 泡沫: his pick 1a (21 Nov): the Bubble flail moves here in place of Guard bubbles; Return on the Sky Fall ----------
form(9,'U', "泡锤 Bubble flail",
   "no ring: the foe her stream is on is caught in a bubble (12, soaked); she bounces it high and slams it down where it stands, three times: each slam rings out: 12 within 1.8 u, 6 to the foe inside; the third pops it. 【拍】22",
   "no ring: the foe her stream is on (stream off: the foe nearest the pointer within 4.5 u) is caught in a bubble: 12, soaks. She bounces it high and slams it down where it stands, three times in 1.8 s: each slam rings out: 12 to the foes within 1.8 u, 6 to the foe inside. The third slam pops the bubble: 22 to the foe inside, a Crash, and the pop soaks. The foe is held while it is in the bubble (R10). Her stream does not stop. A champion or boss is not caught: the three slams ring out from it where it stands",
   "Bubble flail: his design: one foe in a bubble is the hammer, slammed three times", "not caught: the three slams ring out from it where it stands, 20% more", "Ward, on a foe; three Novas", "a glug, three rubbery slams, each with a ring of spray, a pop",
   "on a foe in the middle of a pack",
   "the stream wraps its foe in a bubble; she flicks the staff up and the bubble rides high on the stream like a ball on a fountain, then she brings the staff down and it slams where it stood, a ring of spray running out; three times; on the third it pops.")
form(13,'U', "回礼 Return",
   "a soap-film fall; the shots it washes down float back to who fired them in bubbles: 6 each",
   "the fall is thin as a soap film; each shot it washes down is wrapped in a bubble and floats back to who fired it: 6 each. Friends' shots pass through it. The drop as the base",
   "Return: shots go back to the shooter", "its shots come back too", "Ward, thin", "plinks going home",
   "on the shooters' line to the party",
   "thin as a soap film, with slow colours; each shot it catches turns in a small bubble and drifts home.")

C[(15,'B')]['motion_base'] = "(Plant, 0.7 s). She drops the staff's tip to the floor in front of her; two waves rise far apart to the sides and run in to meet with a boom and a tall thin fin of spray."
C[(15,'B')]['beat'] = "Placed, two waves"
C[(9,'S')]['motion'] = "the ring lifts her on its crest; she curls nose to tail, turns once in the air and lands flat on her belly in a second ring."
C[(10,'U')]['motion'] = "the wave is all foam; foes come out of it with white beards over their eyes, swinging at nothing."

# ====================================================================================
# kit 2.1 (21 Nov, after critic round 1; Kesh, 20 Nov 17:24 UTC: "run critic loop ... make sure it fit
# the design element, and no repeating skills, fill in details insanely").
# Two fresh critics read kit 2.0: one for fit, one for repeats. What they found, and what changed, is in
# the review log. Nothing he passed is changed here.
# ====================================================================================
up(1,'J', full="the bolt bursts on the first foe or at its full reach: 14 to every foe within 1.5 u, soaks, and leaves a pond of still water there, 2 u wide, 6 s. If it lands in her water there is no new pond: that piece grows 1 u wider round the hit, and the parts of it within 3 u of the hit last 2 s longer (The Sea never does). The base's 湿 line is dropped",
   motion="the flick from the hip, the trunk a quarter turn behind it; the bolt is fat and heavy and wobbles like a water balloon. It bursts flat: a crown of drops, a ring of foam running out to 1.5 u, and the water does not sink away: it settles into a round pond whose foam edge rocks twice and lies still. Into her water: no crown; the piece's edge pushes out 1 u round the hit like a poured cup. She shakes one drop off the shell tip.")
form(2,'J', "开渠 Canal",
   "the jet's line stays 6 s as a canal with a current: small foes standing in it are washed 1.5 u a second to its far end",
   "the jet as the base (18, Crash); its line stays as a canal, 5.5 u long, 1 u wide, 6 s. The canal runs: small foes standing in it are washed along it at 1.5 u a second toward its far end (an elite half as fast; a champion or a boss not). It is a push, not a hold: they can act, and a foe washed into a wall or into another foe at the canal's end Slams once (R9). Water that touches the canal is one piece with it (R12); the current runs only in the canal itself",
   "Canal: a river that carries the foes in it to its end", "not washed: the jet deals 20% more", "Shot; a running line left on the floor",
   "the passed blast, then a fast brook running one way", "from the pack toward her big water or a wall, so the canal empties into it",
   "the braced stance and the jet as passed; the jet's line does not fall away: it lies down into the floor as a straight channel with two foam banks, and streaks run down it away from her, fast. Foes in it slide feet first, arms out, turning to face upstream; where it ends the water piles up in a small boil. She leans on the staff a beat and watches them go.")
up(3,'J', short="the whip grabs the first foe and dunks it into her nearest water: it lands flat, and the splash hits every foe in that water within 3 u: 12",
   full="the whip grabs the first foe within 4 u and throws it into the piece of her water nearest the pointer, up to 5 u: it lands flat 0.5 s, and the splash hits it and every other foe standing in that piece within 3 u of the landing: 12 each, soaks. With none of her water within 5 u: the base",
   beat="Swing; a Nova on the water, 3 u",
   motion="she coils round the staff and unwinds; the ribbon takes the foe by the middle, lifts it high over her head in one arc, and brings it down flat on the water like a belly flop. A crown of water jumps round the landing, 3 u out, and every foe in it rocks back a step. The ribbon lets go with a snap; her tail slaps the floor once.")
form(4,'J', "逐水 Pond-hopper",
   "in her water the stone hunts: it skips from foe to foe standing in her water, up to 8 skips: 10 each, the last 16",
   "thrown as the base along her aim. When it lands on her water, or hits a foe standing in it, it stops going straight: it skips to the nearest foe standing in her water within 4 u that it has not yet hit twice, and again, up to 8 skips in all: 10 each, soaks, the last 16. It crosses dry floor between two waters that are within 4 u. No such foe: it goes on along her aim as the base. The base's 湿 line is dropped",
   "Pond-hopper: the stone hunts foe to foe across her water", "as written; it can hit the boss twice", "Shot; a zigzag of small splashes over the water",
   "plunks, each a note higher and a little quicker; a deeper one on the last", "when four or more foes stand in her water",
   "the low side-arm flick as the base; on her water the stone does not go straight. It lands on a foe's head, kicks up a small crown, turns in the air and skips to the next, drawing a zigzag of rings over the water, each hop a little higher than the last; the eighth lands with a taller crown. Her head follows it left and right, ears up.")
up(6,'J', short="the orb trails still water wherever it rolls, 1 u wide, 6 s; let go: it bursts at the stroke's end",
   full="hold up to 3 s as the base (4 each 0.3 s, soaks): the orb leaves a stroke of still water behind it, 1 u wide, 6 s, one piece with any water it crosses. Let go: it bursts as the base (14, Crash). The burst leaves no pool: the stroke is the water",
   idea="Paint: she draws her water where she wants it, by hand",
   motion="the orb rides low, its belly on the floor, and rolls like a wet brush: behind it a shining stroke with a foam edge, bending where she bends it. She steers with the left paw held out flat, moving it as if painting, her head tilted. The burst is the base's: a crown at the stroke's end; the stroke stays.")
form(7,'J', "伏雷 Sleeper",
   "lobbed into her water it sinks and swims under it to the foe nearest the pointer in that water, and goes up there: 18 to 36 within 2.5 u. No foe in the water: it waits 8 s for the first to step in",
   "hold and lob as the base. On dry floor: the base. Into her water: it sinks with a plop and swims under that piece at 6 u a second to the foe standing in it nearest the pointer, as far as the water goes, and goes up under it: 18 to 36 (by the hold) to every foe within 2.5 u. Crash. No foe stands in that piece: it sleeps under the spot for up to 8 s and goes up under the first foe that steps into the piece. One sleeps at a time: a second cast sets the first off where it lies. If its water dries it goes up at once",
   "Sleeper: a torpedo that swims her water to the pack", "as written", "Placed; a line under the water; a Nova, 2.5 u",
   "a plop, a low hum moving under water, a held breath, the blast", "into any water that reaches the pack; into empty water on the way foes will come",
   "the heave as the base; the ball does not burst: it goes under with one fat ring and a dark round shadow runs under the water, a V of ripples over it, straight to its foe. One beat: the water over it domes up. Then a white column, and a ring out to 2.5 u. Waiting, the shadow lies still and breathes: a slow ring every second. She points the left paw the way it should swim.")
up(8,'J', full="no beam: for the 2 s water pours out of the floor at the planted staff and spreads forward as a low flood, to 8 u long and 5 u wide; she turns slowly. Its front hits each foe once as it reaches it: 24. Crash. It does not push. The flooded floor stays as one piece of still water for 8 s",
   boss="as written",
   motion="she drives the staff in and leans back on it, tail braced, knees bent; the floor opens at its foot and the water comes out low and wide, a foam front as wide as five of her running away over the whole floor ahead, lifting each foe a hand's height as it passes under. It settles ankle-deep, flat and bright, the foam edge lapping. She pulls the staff out with both feet planted and shakes from nose to tail.")
form(9,'J', "涨环 Spreading ring",
   "cast standing in her water, the ring runs out through that whole piece, to its edge and 1 u beyond (6 u from her at most): 22, knocked back 1 u",
   "on dry floor: the base. Standing in her water: the ring does not stop near her. It runs out from her through the whole piece she stands in, following the water's shape (down a canal, round a bend), to the piece's edge and 1 u beyond, 6 u from her at most: 22 to every foe it passes, knocked back 1 u. Crash. It takes no water and leaves none",
   "Spreading ring: one ring through all the water she stands in", "not knocked back: 20% more", "Nova, as wide as her water",
   "the passed boom, rolling on and on, a hiss where it leaves the water", "standing in her biggest piece with the pack in it",
   "the hop and the staff's butt down, as the base; the ring leaves her feet and keeps going: a low wave with a foam lip running out over the water in every direction it lies, lifting each foe off its feet as it passes. At the water's edge it jumps the bank, breaks on dry floor 1 u out and is gone. The water behind it rocks. Her tail slaps once; her ears flatten in the spray.")
form(10,'J', "滚潮 Roll-up",
   "over her water the wave does not stop: it rolls on as far as the water goes, up to 10 u, and grows: 4 more for each 2 u of water it has crossed, to 32",
   "on dry floor: the base (2.2 u). Where the wave meets her water it rolls on for as long as there is water under its middle, up to 10 u from her: 20, and 4 more for each 2 u of water it has crossed (to 32), and it widens with it, from the base's front to 4 u; each foe is pushed 1.2 u as it passes. Crash. It takes no water with it and leaves none",
   "Roll-up: her water carries the wave across the room", "not pushed: 20% more", "Swing; a wave that grows as it runs",
   "the passed crash, swelling instead of dying, breaking late and far", "down the long way of her water, through the pack",
   "the trunk turn as the base; over dry floor the wave would curl and die at 2.2 u. Over her water it lifts instead: the crest climbs a hand higher every 2 u, the foam lip thickens, the front widens, and the water ahead of it draws back to feed it. Where the water ends it breaks: one heavy fall of foam on the bank. She follows it with the staff's tip, leaning into it.")
form(11,'J', "连潮 Tide on tide",
   "cooldown 6 s. Every piece spills over: its waves break 1 u past its edge, hit the foes there too, and that rim stays as water. Cast again within 6 s: 22",
   "cooldown 6 s (the base 9 s). As the base (16 to foes standing in her water; the water lasts 2 s longer), and each piece spills over as it breaks: its waves reach 1 u past the piece's edge all round and hit the foes standing there too; that 1 u rim stays as still water for 6 s, part of the piece. A cast within 6 s of the last hits for 22, and its rim lies outside the last one: the water creeps out 1 u a cast. Two steps only: 16, then 22",
   "Tide on tide: each tide comes in a little farther up the floor", "as written", "Nova, one at each piece of water; the edge moving out",
   "the deep pull of the tide, then a second, higher, and water running up over stone", "on cooldown while foes stand in or at the edge of her water",
   "the left paw lifts slowly, palm up, as the base; every piece swells in the middle and breaks outward, not straight up: its foam edge runs 1 u up the dry floor like a tide coming in and stays there, the new rim darker for a moment. The second cast lifts her onto her toes: the swell is half again as tall and the edge runs out again. Her whiskers shake as the paw comes down.")
form(12,'J', "引流 Inflow",
   "nothing is drunk: every piece of her water that touches the pool flows toward it, and carries its small foes along at 1 u a second",
   "the pool as the base (5 s: 4 a second, slows, drags foes in its circle to its centre). While it turns, every piece of her water that touches it flows toward it: small foes standing anywhere in those pieces are carried along the water toward the pool at 1 u a second (an elite half as fast; a champion or a boss not). They can act. The pool's ticks and slow stay inside its own circle. The water is not used up",
   "Inflow: the whirlpool pulls on all the water that touches it", "not carried: the ticks deal 20% more", "Zone pulse; streaks running in from far",
   "the passed swirl, and a long sucking draw from far off", "where her water meets the pack, on the side she wants them",
   "the plant as the base; the pool turns, and the pull shows in all the water joined to it: long foam streaks slide over the ponds and down the canals toward the eye, bending like hair in a drain. Foes far off lean back against it and are walked in backward, step by step, arms out. She keeps the staff planted and turns it a little, as if stirring.")
up(14,'J', short="she rides 2.5 s; the wave lays a road of water 2 u wide behind her, 6 s, and draws the foes she passes onto it",
   full="she surfs for 2.5 s, up to 10 u, steering; foes she passes take 14 and are soaked, as the base, and are drawn 1 u in behind her, onto the road, in place of knocked aside. Behind her the wave lays a road of still water, 2 u wide, 6 s, one piece with any water it crosses",
   boss="not drawn in: 20% more",
   motion="she rides on her belly as the base, steering with the tail; the wave spreads flat behind her like the wake of a boat and stays: a bright road with two foam edges. Each foe she passes is sucked a step in behind her and left standing in the middle of the road, turning to look. She steps off with a small hop and the last of the wave runs on a hand's length and lies down.")
form(15,'J', "撞水 Pond clap",
   "her water on both sides of the spot folds in and claps there: foes standing in her water within 4 u are carried to the spot: 18, stun 0.5 s",
   "at a spot within 5 u. If any of her water lies within 4 u of the spot: in place of the two waves her water itself folds in from both sides. Every small foe standing in her water within 4 u of the spot is carried to it in 0.4 s (an elite half as far; a champion or a boss not; a carry, R10), and the water claps shut over the spot: 18 to every foe there, stun 0.5 s. Crash. Then the water runs back to where it lay. No water within 4 u: the base",
   "Pond clap: her own water folds in and brings the foes with it", "not carried: 20% more; the stun lasts 0.25 s", "Placed; two sheets of water sliding in; a Nova where they meet",
   "two long slides over stone, a boom, a thin jet going up, water running home", "at the middle of the pack that stands in her water",
   "the staff's tip dropped to the floor in front, as the base; the water on each side of the spot lifts its edge like two blankets being pulled together and slides in over dry floor, the foes on it riding in on their heels. The two meet with a boom and a tall thin fin; the fin falls, and both sheets run back out to where they lay, leaving the foes in a dazed knot. Her tail slaps on the boom.")
up(16,'J', short="all her water in the room drains to her, dragging the foes in it; then the burst: 40, and 6 more and 0.3 u wider for each pond, canal, pool or road drained (up to 5). The water is spent",
   full="every part of her water in the room runs to her spot in 1 s, and small foes standing in it are dragged with it up to 4 u toward her; the base's pull within 3 u too. Then the burst: 40 to every foe within 1.6 u, 6 more and 0.3 u wider for each part drained (each pond, canal, pool, road or path she laid counts as one, joined or not), up to 5: 70 within 3.1 u. The Sea counts as 5 and is ended. Crash. All the water drained is spent",
   ai="when four or more parts are down and the pack stands in them")
form(17,'J', "凌波 Water walk",
   "a step that lands on her water is free: up to six steps; a ripple on her water is twice as wide (3 u)",
   "the base steps. A step that lands on her water does not use up one of the three, so she takes up to six steps in the 3 s. A landing on her water spreads its ripple twice as wide, 3 u: 6, soaks, and leaves no puddle (the water is hers already). A landing on dry floor: the base's ripple and puddle",
   "Water walk: on her water she keeps stepping, and every step rings wide", "as written", "Dash, up to six hops; a wide ring at each landing on water",
   "taps on water, light and quick, each with a wide ring of sound", "through the pack along her water, landing beside the most foes",
   "the light hops as the base, knees bent, tail out; on her water each landing barely dents it: one toe, a wide clean ring running out 3 u, and she is already in the air again, a little higher each time, the staff held out to the side for balance. The sixth landing she lets sink: both feet, a small crown, a shake of the tail.")
form(18,'J', "溢泡 Spill",
   "a 10 bubble that spills: each foe that hits it gets a puddle under its feet; when it pops it leaves a pool, 3 u, 6 s, where the friend stands",
   "a 10 bubble for 4 s on the friend the base would pick. Each hit the bubble takes spills at the foe that struck it: a puddle of still water, 1.2 u, 4 s, under that foe wherever it stands (a shooter too), one a second at most. When the bubble pops or ends it bursts into a pool of still water, 3 u wide, 6 s, where the friend stands; the pop soaks as the base. The pool stays where it fell: it does not follow the friend",
   "Spill: the friend's bubble waters whoever hits it, and pops into a pool", "as written", "Ward; a spurt to each attacker; a pool at the pop",
   "the passed bubble; a squirt at each hit; a long splash when it goes", "on the friend the pack is hitting, where she wants her next water",
   "the bubble is fat and heavy, its lower half full of water that swings as the friend moves. Each hit dents it and a thin spurt jumps from the dent to the attacker's feet, where it lies as a puddle. At the pop the skin is gone in one blink and the water inside falls straight down and runs out to 3 u, a round pool with the friend in the middle. She tips the staff toward the friend as it lands.")
form(20,'J', "喷涌 Blowout",
   "on her water, the water within 3 u of the vent goes up with it: every foe standing there is launched: 16",
   "on dry floor: the base. On her water: 0.6 s later the column throws up all of her water within 3 u of the vent with it: 16 to every foe standing on that water, launched 0.8 s (a soaked foe 1.6 s), soaks. The water falls back where it was",
   "Blowout: the geyser throws up the water round it and everyone on it", "not launched: 20% more", "Placed; a Nova, 3 u, on the water",
   "a rumble under the pond, a blast, rain falling back", "on her water where the most foes stand within 3 u",
   "the two taps as the base; the water for 3 u round the mark shivers and pulls flat, dimpled like rain. Then it goes up in one piece: a white column in the middle and a flat sheet of water round it with the foes on it, arms and legs out. It hangs a beat and comes down as heavy rain on the same floor; the foes land on their backs in it. She looks up, then steps back from the splash.")
form(22,'J', "鱼跃 Porpoise",
   "under her own water the 2 s do not run (5 s at most); she comes out in one great leap to the pointer, up to 4 u, and lands with a splash that grows with her time under: 14, and 4 more and 0.4 u wider a second",
   "she dives as the base. While she swims under her own water the 2 s clock stops, for up to 5 s under in all; under dry floor it runs as the base. Let go, or time out: if she is under her water she does not breach where she is: she leaves it in one great leap, up to 4 u to the pointer, untouchable in the air, and lands with a splash: 14 to every foe within 1.5 u, and 4 more and 0.4 u wider for each second she swam under her water (to 34 within 3.5 u), knocked back 1 u, soaks. Under dry floor: the base's breach",
   "Porpoise: a long swim under her water, then one great leap", "not knocked back: 20% more", "Dash, under the water; a leap; a Nova that grows with the swim",
   "a plunge, a long quiet under water, a breach, a held note in the air, a great flat slap", "under the pack through her water, leaping onto its middle",
   "the nose-first arc into the floor as the base; under her water a V of ripples runs where she swims, wider the longer she stays down. The leap: she comes out nose first in a tall clean arc, body straight, tail trailing a rope of water, turns once at the top with the staff tucked to her chest, and comes down belly first. A round wall of spray, a ring running out; she slides a hand's length on her belly and stands with a shake.")
form(23,'J', "共潮 Shared water",
   "while the friend stands in her water their hits Crash 小拍: 30% more to a soaked foe, and the soak is spent",
   "the base gift (5 s: the friend's hits soak, and splash 4 within 1.5 u). While the gifted friend stands in her water, each of their hits on a soaked foe is a small Crash 小拍: 30% more (增伤区), and the soak is spent after the hit; by R5 her Flood puddle is left under that foe if it stands on dry floor. The gift's own soak lands after the hit, so their next hit finds it soaked again. Off her water: the base. On herself: her stream's ticks count, one small Crash a second at most",
   "Shared water: a friend who stands in her water Crashes with every hit", "as written: the boss is soaked and Crashed like any foe", "Ward; a small Crash burst at each of the friend's hits",
   "a ribbon winding; a wet clap on each of the friend's hits", "on the melee friend who fights in her water",
   "the ribbon runs to the friend's weapon as the base; while the friend stands in her water a second ribbon climbs from the water up their legs and joins it, and the weapon drips. Each hit lands with a short flat burst of water off the foe, the Crash's own look at a third the size, and the drop over the foe's head winks out and comes back. Step off the water and the leg ribbon lets go.")
form(24,'J', "水乡 Lagoon",
   "the dome is 5 u wide; while it stands, canals run from it to every water of hers within 8 u: all one piece. When it falls in, its floor and the canals stay 8 s",
   "the dome is 5 u wide (the base 3 u). As it closes, a canal 1 u wide runs out from its foot to each part of her water within 8 u of its centre, up to 5 canals, nearest first: the dome's floor, the canals and all they touch are one piece. Inside it is the base: friends take 25% less; foes are soaked and slowed. It falls in as the base: 24 to the foes inside. Crash. The dome's floor and the canals stay as still water for 8 s after",
   "Lagoon: the dome sends canals to all her water and makes it one", "soaked; the slow lasts a fifth", "Nova, a dome; canals running out from it",
   "the sea from below, water running out along stone in several lines, the fall", "over the fight, when her water lies in several pieces round it",
   "the wind-up and the throw as the base; the dome closes from the floor upward, and as its skin meets at the top its foot opens in five places: canals run out along the floor to each of her waters, fast, foam at their heads, and where each arrives the two waters open into one. Under the dome the light is green and moving. It falls in as the base; the floor and the canals stay, a wheel of water with its spokes.")
# ---------- Tsunami: the three new waves, made unlike the tsunami she already has ----------
form(1,'S', "浪头 Wave head",
   "where the bolt stops, a wave head rises across her aim, 4 u wide, and rolls 2 u on: 14, pushed 1 u",
   "the bolt as the base (5 u: 14, soaks; 湿: it goes on through a soaked foe). Where it stops, on the first foe it does not pass or at its full reach, a wave head rises across her aim, 4 u wide, and rolls 2 u on: 14 to every foe it reaches (not the foe the bolt hit), pushed 1 u, soaks",
   "Wave head: the bolt lands and a wide wave gets up where it landed", "not pushed: 20% more", "Shot; then a wide front at range",
   "the passed spit, then a wave getting up far off and breaking", "at the front rank, so the wave takes the ranks behind it",
   "the flick from the hip as the base; the bolt hits and does not just splash: the water it carried spreads sideways along the floor in a blink, a line 4 u wide, and stands up as a low curling front that rolls 2 u on and breaks. Seen from her it is a T: a thin bolt, then a wide wave across its end. She holds the flick's end a beat, staff level, then lets the tip drop.")
up(3,'S', short="no grab: the whip sweeps a half circle in front of her, 4 u, and a wave runs under its tip: 12, and up to 5 small foes are carried to the arc's end in one heap",
   full="no grab: the whip sweeps a half circle in front of her at 4 u, from one side to the other, ending on the pointer's side; a wave runs under its tip: 12 to every foe in the half circle, soaks. Up to 5 small foes, nearest first, are carried along the arc and dropped in one heap at its end (a carry that ends: they Slam on each other and on a wall, R9). Wet: a foe that was soaked lands flat 0.5 s")
form(10,'S', "三叠浪 Three Crests",
   "three crests, each bigger: 2.2 u, 3.5 u, then 5 u: 8 each, pushed 1.2 u each",
   "the wave rolls out as three crests, 0.4 s apart, each bigger than the last: the first reaches the base's 2.2 u, the second 3.5 u, the third 5 u, all at the base's 100°: each 8, pushed 1.2 u (3.6 u for a foe in all three). A soaked foe slides 50% farther each time and stays soaked through all three: the third is the Crash. A foe pushed into a wall Slams",
   "Three Crests: three waves, each bigger than the last", "not pushed: each crest 20% more", "Swing, three times, each wider",
   "the passed crash three times, each lower and longer", "into the pack with a wall behind it",
   "one trunk turn throws all three: a low crest that dies at 2.2 u, a taller one through its foam to 3.5 u, and a third, tallest, that runs to 5 u before it breaks. Her tail slaps the floor once for each, the third the hardest; she rocks back on her heels after it and shakes.")
form(17,'S', "蹬浪 Kick waves",
   "each landing kicks a wave back the way she came, 3 u wide, 4 u long: 8, pushed 1.5 u",
   "the base steps; in place of the ripple, each landing kicks a wave back along the step she has just made, at whoever follows her: 3 u wide, 4 u long: 8 to every foe, pushed 1.5 u, soaks. Three steps, three waves. The puddle is left as the base",
   "Kick waves: every step away throws a wave back at the chasers", "not pushed: 20% more", "Dash, three hops; a wave behind each",
   "three light taps, each with a slap of tail and a short rush of water", "stepping away from the pack that chases her or a friend",
   "she lands each hop with her back to where she came from, knees bent, and her tail sweeps the floor behind her from side to side: a low wave as wide as three of her jumps off it and runs back down her own track, into the faces of whoever follows. She does not look back until the third, and then only over one shoulder.")

# ====================================================================================
# kit 2.2 (21 Nov, after critic round 2: one fresh critic for fit and repeats, one for detail).
# Three rules were broken or unbounded (Tide on tide's second step, Pond-maker's time, Blowout's
# launch); the Flood users fell into three sentences; the motions had no timings. Nothing he
# passed is changed here.
# Timings read: wind-up, the release, recovery. "wide" is across; "within" and "out to" are
# from the centre.
# ====================================================================================
up(1,'J', short="the bolt bursts where it lands: 14 within 1.5 u, and leaves a pond, 2 u, 6 s, on her water too",
   full="the bolt bursts on the first foe or at its full reach: 14 to every foe within 1.5 u, soaks, and leaves a pond of still water there, 2 u wide, 6 s. On her water it lays the same pond: where the two overlap they are one piece, and each part keeps its own time. The base's 湿 line is dropped",
   ai="on cooldown, at the pack's feet; beside her water to make it bigger",
   sound="a spit, a fat plop, water rocking twice and lying still",
   motion="(0.2 s wind-up, the release at 0.45 s, 0.3 s recovery.) The flick from the hip, the trunk a quarter turn behind it; the bolt is fat and heavy and wobbles like a water balloon, 0.3 s in the air at full reach. It bursts flat: a crown of drops no higher than a foe's knee, a ring of foam running out to 1.5 u in 0.2 s, and the water does not sink away: it settles into a round pond whose foam edge rocks twice and lies still by 0.6 s. Beside older water the two foam edges open in 0.3 s and one ripple crosses the join. She shakes one drop off the shell tip.")
form(2,'J', "开渠 Canal",
   "the jet's line stays 6 s as a canal with a fast current: a small foe that steps in is swept to its far end and Slams there",
   "the jet as the base (18, Crash); its line stays as a canal, 5.5 u long, 1.5 u wide, 6 s. The canal runs away from her at 3 u a second: a small foe in it is swept to its far end. It cannot walk against the current; it keeps its feet and still turns and attacks, so it is not held (R10). At the far end it Slams once on a wall or on another foe (R9) and can then walk out. An elite is slid half as fast and can walk out sideways; a champion or a boss is not moved. Water that touches the canal is one piece with it (R12); the current runs only in the canal itself",
   "Canal: a river that carries the foes in it to its end", "not swept: the jet deals 20% more", "Shot; a running line left on the floor",
   "the passed blast, a fast brook running one way for 6 s, a gurgle as it runs dry", "from the pack toward a wall or her big water, so the canal empties its foes there",
   "(0.2 s wind-up, the jet at 0.44 s, 0.4 s recovery.) The braced stance and the jet as passed; the jet's line does not fall away: it lies down into the floor in 0.3 s as a straight channel with two foam banks, and streaks run down it away from her, fast. Foes in it stay on their feet and are slid backward, heels first, still swinging at whatever is near; where it ends the water piles up in a small boil and they bump into one heap. In its last 0.6 s the streaks slow, the banks run inward and the floor is left dark. She leans on the staff a beat and watches them go.")
up(3,'J', sound="a whip crack, a whoosh overhead, one belly flop and a wide slosh",
   motion="(0.25 s coil, the grab at 0.6 s, the throw 0.4 s in the air, 0.35 s recovery.) She coils round the staff and unwinds; the ribbon takes the foe by the middle and lifts it in one arc toward the pointer, over the heads of the others, and brings it down flat on the water like a belly flop. A crown of water jumps round the landing and runs out 3 u, stopping at the water's foam edge where the water is narrower; every foe in it rocks back a step. The ribbon lets go with a snap; her tail slaps the floor once.")
up(4,'J', full="thrown as the base along her aim. When it lands on her water, or hits a foe standing in it, it stops going straight: it skips to the nearest foe standing in her water within 4 u that it has not yet hit twice, and again, up to 8 skips in all: 10 each, soaks, the last 16. It crosses dry floor between two waters that are within 4 u. On dry floor, or with no such foe: it goes on along her aim as the base, with the base's 湿 line",
   sound="plunks, each a note higher and a little quicker; a deeper one on the last, then the rings dying out",
   motion="(0.2 s wind-up, the release at 0.5 s, 0.3 s recovery; each hop 0.2 s.) The low side-arm flick as the base; on her water the stone does not go straight. It lands on a foe's head, kicks up a small crown, turns in the air and skips to the next, drawing a zigzag of rings over the water, each hop a hand higher than the last; the eighth lands with a taller crown and the stone is gone in it. Eight skips take 1.6 s. Her head follows it left and right, ears up.")
up(5,'J', sound="a hose burst, a long slide over wet stone, a small splash as each foe tips in",
   motion="(0.15 s wind-up, the fan at 0.4 s, 0.3 s recovery; the wash 0.5 s.) She turns the shell tip flat and sweeps low, like a yard broom, from her right to her left; the fan leaves the staff as the base, and under it a thin sheet of water no deeper than a toe runs over the floor toward her nearest water, taking each foe's feet with it. They ride it sitting, arms out, and stop at the water's foam edge with a small splash; the sheet runs into the pond and is gone. She ends with the staff out to her left and flicks it once.")
up(6,'J', short="the orb trails still water wherever it rolls, 1 u wide, 6 s; a stroke that closes a loop fills the floor inside it; let go: it bursts at the stroke's end",
   full="hold up to 3 s as the base (4 each 0.3 s, soaks): the orb leaves a stroke of still water behind it, 1 u wide, 6 s, one piece with any water it crosses; the orb moves 3 u a second at most. A stroke that closes a loop, on itself or on her other water, fills the floor inside the loop with still water at once, up to 5 u across; the stroke and its fill are one part. Let go: it bursts as the base (14, Crash). The burst leaves no pool: the stroke is the water",
   sound="a low hum, a brush on wet paper; a soft rush as a loop fills; the base's burst",
   ai="draws a ring round the pack, or a line from the pack to her other water",
   motion="(Bloom 0.3 s, held up to 3 s, the burst, 0.35 s recovery.) The orb rides low, its belly on the floor, and rolls like a wet brush at a walking pace: behind it a shining stroke with a foam edge, bending where she bends it. She steers with the left paw held out flat, moving it as if painting, her head tilted. Where the stroke meets itself the floor inside goes bright in 0.3 s, filling from the edge inward. The burst is the base's: a crown at the stroke's end; the stroke stays, and dries from its oldest end first.")
up(7,'J', sound="a plop, a low hum moving under water, a held breath, the blast, rain coming down",
   motion="(Bloom, held, the heave 0.3 s, 0.4 s recovery; the swim 6 u a second; the dome 0.25 s before it goes.) The heave as the base; the ball does not burst: it goes under with one fat ring and a dark round shadow runs under the water, a V of ripples over it, straight to its foe. One beat: the water over it domes up a hand high. Then a white column twice a foe's height, and a ring out to 2.5 u in 0.2 s. Waiting, the shadow lies still and breathes: a slow ring every second. She points the left paw the way it should swim.")
up(8,'J', short="no beam: for 2 s water pours out at the staff and spreads in front of her: a sea 8 u long and 5 u wide, 8 s. 【拍】its front: 24; when the gate shuts the sea slaps back: 16 to every foe standing in it",
   full="no beam: for the 2 s water pours out of the floor at the planted staff and spreads forward as a low flood, to 8 u long and 5 u wide; she turns slowly. Its front hits each foe once as it reaches it: 24. Crash. It does not push. When the 2 s end the gate shuts and the sea slaps back once from its far end to her: 16 to every foe standing in it, soaks. The flooded floor stays as one piece of still water for 8 s",
   sound="a sluice opening, a long rush, one flat slap coming back, then lapping water",
   motion="(Plant 0.3 s, 2 s held, 0.5 s recovery.) She drives the staff in and leans back on it, tail braced, knees bent; the floor opens at its foot and the water comes out low and wide: a foam front 5 u wide that runs the 8 u in the 2 s, ankle-high, never taller. Each foe rocks back on its heels as the front passes under it and is not moved. At 2 s she pulls the staff out: the far edge sends one low ripple back over the whole sea to her feet in 0.4 s, and every foe standing in it is slapped off balance. Then it lies flat and bright, the foam edge lapping. She shakes from nose to tail.")
form(9,'J', "涨环 Spreading ring",
   "cast standing in her water, the ring carries the small foes in that water out to its edge and drops them 1 u beyond: 22",
   "on dry floor: the base. Standing in her water: the ring does not stop near her. It runs out from her through the whole piece she stands in, following the water's shape, and carries every small foe standing in that piece out with it to the piece's edge, dropping them 1 u beyond it, 6 u from her at most: 22 each. Crash. It is a carry that ends (R10): a foe carried into a wall or another foe Slams (R9). An elite is carried half as far; a champion or a boss is not carried. It takes no water and leaves none",
   "Spreading ring: one ring empties the water she stands in", "not carried: 20% more", "Nova, as wide as her water; foes riding its lip",
   "the passed boom, rolling on and on, a hiss where it leaves the water, bodies landing", "standing in her biggest piece with the pack in it; with a wall beyond its edge",
   "(0.2 s hop, the butt down at 0.5 s, 0.4 s recovery; the ring runs 6 u a second.) The hop and the staff's butt down, as the base; the ring leaves her feet and keeps going: a low wave with a foam lip, no taller than her dash crest, running out over the water in every direction it lies, down a canal, round a bend. Each foe it meets sits down on its lip and rides it out backward. At the water's edge it jumps the bank, breaks on dry floor 1 u out and tips them off in a row. The water behind it rocks and lies still. Her tail slaps once; her ears flatten in the spray.")
up(10,'J', short="over her water the wave does not stop: it rolls on as far as the water goes, up to 10 u, and grows: 4 more for each 2 u of water it has crossed, to 32",
   full="on dry floor: the base (2.2 u). Where the wave meets her water it rolls on for as long as there is water under its middle, up to 10 u from her: 20 to every foe it passes, and 4 more for each 2 u of water it has crossed (to 32), and its front widens with it to 4 u; each foe is pushed 1.2 u as it passes. Crash. It takes no water with it and leaves none",
   sound="the passed crash, swelling instead of dying, breaking late and far, foam hissing out",
   motion="(0.2 s wind-up, the wave at 0.46 s, 0.4 s recovery; the wave runs 7 u a second.) The trunk turn as the base; over dry floor the wave would curl and die at 2.2 u. Over her water it lifts instead: the foam lip thickens, the front widens to 4 u, and the crest climbs a little every 2 u but never stands taller than her dash crest. The water ahead of it draws back to feed it and runs level again behind it within 0.5 s. Where the water ends it breaks: one heavy fall of foam on the bank. She follows it with the staff's tip, leaning into it.")
form(11,'J', "连潮 Tide on tide",
   "cooldown 6 s. Every piece spills over: its waves break 1 u past its edge, hit the foes there too, and that rim stays as water. Cast again within 9 s: 22",
   "cooldown 6 s (the base 9 s). As the base (16 to foes standing in her water; the water is topped up 2 s, never above the time it was laid with), and each piece spills over as it breaks: its waves reach 1 u past the piece's edge all round and hit the foes standing there too; that 1 u rim stays as still water for 6 s, part of the piece. A cast within 9 s of the last hits for 22, and its rim lies outside the last one: the water creeps out 1 u a cast. Two steps only: 16, then 22",
   "Tide on tide: each tide comes in a little farther up the floor", "as written", "Nova, one at each piece of water; the edge moving out",
   "the deep pull of the tide, then a second, higher, water running up over stone and sinking in", "on cooldown while foes stand in or at the edge of her water",
   "(Bloom, the left paw, 0.7 s; the waves break at 0.7 s; 0.4 s recovery.) The left paw lifts slowly, palm up, as the base; every piece swells in the middle and breaks outward, not straight up: its foam edge runs 1 u up the dry floor in 0.3 s like a tide coming in and stays there, the new rim darker for a moment. The second cast lifts her onto her toes: the swell is half again as tall and the edge runs out again. Her whiskers shake as the paw comes down.")
form(12,'J', "搅水 Stir",
   "while the pool touches her water, its 4 a second and its slow run through that whole piece",
   "the pool as the base (5 s: 4 a second, soaks, slow 30%, drags foes in its circle to its centre). While the pool touches a piece of her water, its tick and its slow reach every foe standing anywhere in that piece. Nothing is carried and no water is used: the drag stays in the pool's own circle, and so does the base's soak again after a Crash",
   "Stir: the whirlpool stirs all the water it touches", "as written; in its circle, not dragged: the ticks deal 20% more", "Zone pulse; the whole piece turning slowly",
   "the passed swirl, and under it a slow wide churn that winds down when the pool ends", "where her biggest water meets the pack",
   "(Plant 0.4 s, then one stir of 0.6 s, 0.3 s recovery.) The plant as the base; she turns the planted staff one full turn with the right paw, as if stirring a pot, and lets go. The pool spins, and the turn spreads: over 0.5 s every pond and canal joined to it begins to turn slowly the same way, long foam streaks winding across it, small eddies round each foe's ankles. Foes in it wade as if through mud. When the pool ends the streaks drift on a second and stop.")
up(13,'J', short="the fall fills a pool that spreads 0.9 u a second, to 5 u; the drop hits the whole pool: 16; the pool stays 6 s",
   full="the fall as the base; under it a pool of still water spreads, 0.9 u wider each second, from 1.4 u to 5 u wide at 4 s. On the press the fall drops and the blow runs out through the whole pool: 16 to every foe standing in it. Crash. The pool stays 6 s after the fall ends",
   sound="a steady fall into deepening water, one heavy drop, a ring running out, lapping",
   motion="(0.3 s lift, the fall from 0.6 s, 0.3 s recovery; the drop: 0.15 s chop.) The staff lifted slowly, tip up, as the base; the fall drums on the floor and the water runs out from under it in a widening round pool with a foam edge. On the press she chops the left paw down: the whole column lets go at once, and a ring crosses the pool to its edge in 0.25 s, each foe in it knocked off balance as it passes. The pool rocks twice and lies still.")
up(14,'J', sound="a rolling wave, water sheeting out behind, a last small wash as she steps off",
   motion="(0.2 s hop, the ride 2.5 s, 0.3 s recovery.) She rides on her belly as the base, steering with the tail; the wave spreads flat behind her like the wake of a boat and stays: a bright road 2 u wide with two foam edges, laid as fast as she goes. Each foe she passes is sucked a step in behind her and left standing in the middle of the road, turning to look. She steps off with a small hop and the last of the wave runs on a hand's length and lies down.")
up(15,'J', sound="two long slides over stone, a boom, a thin jet going up, water running home",
   motion="(Plant 0.3 s, the slide 0.4 s, the clap at 0.7 s, 0.4 s recovery.) The staff's tip dropped to the floor in front, as the base; the water on each side of the spot lifts its near edge like two blankets pulled together and slides in over dry floor, the foes on it riding in on their heels. With water on one side only, that sheet comes alone and meets the base's wave from the other. They meet with a boom and a fin of spray as thin as a blade, up and gone in 0.3 s; both sheets run home in 0.5 s, leaving the foes in a dazed knot. Her tail slaps on the boom.")
up(16,'J', short="all her water in the room drains to her, dragging the foes in it; then the burst: 40, and 6 more and 0.3 u wider for each pond, canal, pool or road drained (up to 5). The water is spent; the burst leaves one pond",
   full="every part of her water in the room runs to her spot in 1 s, and small foes standing in it are dragged with it up to 4 u toward her; the base's pull within 3 u too. Then the burst: 40 to every foe within 1.6 u, 6 more and 0.3 u wider for each part drained (each pond, canal, pool, road or path she laid counts as one, joined or not), up to 5: 70 within 3.1 u. Crash. The Sea counts as 5 and is not ended. All the other water drained is spent; the burst's own circle stays as a pond for 6 s. Overflow and Deep Water read the foes as they stood when she cast",
   sound="a plughole roar from every corner, a beat of silence, the column, rain falling on a wet floor",
   motion="(the coil 0.4 s, the drain 1 s, the burst at 1.6 s, 0.6 s recovery.) She spins on the spot with the staff out; a foam ring 1.6 u round her, and wider by a step for each water coming, marks where the burst will land. Every pond in the room stretches into a stream and runs to her feet, the foes sliding with it; the floor behind is left dark. One beat of stillness. Then the column: twice her height for a dry cast, and a head taller for each water it drank. It comes down as rain into one round pond at her feet. End: the shake.")
up(17,'J', sound="taps on water, light and quick, each with a wide ring of sound; the last one a soft double splash",
   motion="(each hop 0.2 s; 0.3 s recovery after the last.) The light hops as the base, knees bent, tail out; on her water each landing barely dents it: one toe, a wide clean ring running out 3 u in 0.3 s, and she is already in the air again, the staff held out to the side for balance. A landing on dry floor is the base's: both feet, a small ring, a puddle. The last landing she lets sink: both feet, a small crown, a shake of the tail.")
up(18,'J', full="a 10 bubble for 4 s on the friend the base would pick. Each hit the bubble takes spills at the foe that struck it: a puddle of still water, 1.2 u, 4 s, under that foe wherever it stands (a shooter too), one a second at most; one bubble's puddles are one part (R12). When the bubble pops or ends it bursts into a pool of still water, 3 u wide, 6 s, where the friend stands; the pop soaks as the base. The pool stays where it fell: it does not follow the friend",
   sound="the passed bubble; a squirt at each hit; a long splash when it goes, and lapping",
   motion="(Bloom 0.4 s, 0.3 s recovery.) The bubble is fat and heavy, its lower half full of water that swings as the friend moves. Each hit dents it and a thin spurt jumps from the dent to the attacker's feet in 0.2 s, where it lies as a puddle. At the pop the skin is gone in one blink and the water inside falls straight down and runs out to its 3 u in 0.3 s, a round pool with the friend in the middle. She tips the staff toward the friend as it lands.")
up(19,'J', motion="(0.3 s lift, the cloud at 0.5 s, 0.3 s recovery; each volley: 1 s hanging, 0.15 s in flight.) The passed cloud and falling streaks. Each second three drops stop dead high in the rain and hang, glinting; a second later they stretch into needles, turn together and streak into the foe her stream is on. The floor under the cloud shines deeper each second; when the cloud goes, a pool is left, its foam edge closing in 0.3 s.")
form(20,'J', "喷涌 Blowout",
   "on her water, the water within 3 u of the vent goes up with it: every foe standing there is launched: 16",
   "on dry floor: the base. On her water: 0.6 s later the column throws up all of her water within 3 u of the vent with it: 16 to every foe standing on that water, launched 0.8 s, soaks. The water falls back where it was. The base's 湿 line is dropped: on her water every foe is soaked",
   "Blowout: the geyser throws up the water round it and everyone on it", "not launched: 20% more", "Placed; a Nova, 3 u, on the water",
   "a rumble under the pond, a blast, heavy rain falling back, then quiet", "on her water where the most foes stand within 3 u",
   "(Plant 0.5 s, the warning 0.6 s, the launch 0.8 s, 0.3 s recovery.) The two taps as the base; only her water within 3 u of the mark answers, in whatever shape it lies: it shivers and pulls flat, dimpled like rain. Then it goes up in one piece: a white column in the middle and a flat sheet of water round it, knee-high, with the foes on it, arms and legs out. It hangs a beat and comes down as heavy rain on the same floor; the foes land on their backs in it. Dry floor inside the 3 u does nothing. She looks up, then steps back from the splash.")
up(21,'J', sound="a gulp, bubbles, a wet spit, bodies landing",
   motion="(Bloom 0.5 s, held 1.5 s, the throw, 0.3 s recovery.) A flick of the staff's shell tip at the water. Under each foe a dark whirling patch a step wide opens and shivers for 0.2 s; then each drops straight down to the neck in 0.2 s, heads turning, paws paddling at the surface, rings running out from each. At the end a short column under each, no taller than a foe, throws it out and it lands on its back; the patches close in 0.3 s. She holds the staff's tip down for the 1.5 s, then flicks it up.")
form(22,'J', "鱼跃 Porpoise",
   "under her own water the 2 s do not run (3.5 s at most); she comes out in one great leap to the pointer, up to 4 u, and lands with a splash that grows with her time under: 14, and 4 more and 0.4 u wider a second",
   "she dives as the base. While she swims under her own water the 2 s clock stops, for up to 3.5 s under in all; under dry floor it runs as the base. Let go, or time out: if she is under her water she does not breach where she is: she leaves it in one great leap, up to 4 u to the pointer, 0.6 s in the air, untouchable, and lands with a splash: 14 to every foe within 1.5 u, and 4 more and 0.4 u wider for each second she swam under her water (to 28 within 2.9 u), knocked back 1 u, soaks. Under dry floor: the base's breach. The cooldown starts when she lands",
   "Porpoise: a long swim under her water, then one great leap", "not knocked back: 20% more", "Dash, under the water; a leap; a Nova that grows with the swim",
   "a plunge, a long quiet under water, a breach, a held note in the air, a great flat slap, drops pattering down", "under the pack through her water, leaping onto its middle",
   "(the dive 0.3 s, the swim, the leap 0.6 s, 0.5 s recovery.) The nose-first arc into the floor as the base; under her water a V of ripples runs where she swims, wider the longer she stays down. As she leaves the water a foam ring opens on the floor where she will land, as wide as the splash will be. The leap: she comes out nose first in a tall clean arc, body straight, tail trailing a rope of water, turns once at the top with the staff tucked to her chest, and comes down belly first. A tall crown of drops and a ring running out; she slides a hand's length on her belly and stands with a shake.")
up(23,'J', sound="a ribbon winding; a wet clap on each of the friend's hits; the ribbon unwinding at the end",
   motion="(Point at a friend 0.4 s, 0.3 s recovery.) The ribbon runs to the friend's weapon as the base; while the friend stands in her water a second ribbon climbs from the water up their legs in 0.3 s and joins it, and the weapon drips. Each hit lands with a short flat burst of water off the foe, the Crash's own look at a third the size, and the drop over the foe's head winks out and comes back. Step off the water and the leg ribbon lets go and falls as drops.")
form(24,'J', "水乡 Lagoon",
   "the dome is 5 u wide; five canals run out from it: one to each of her waters within 8 u, the rest to the nearest foes outside, each ending in a puddle under its foe: all one piece. They stay 8 s",
   "the dome is 5 u wide (the base 3 u). As it closes, five canals, each 1 u wide, run out from its foot: one to each separate piece of her water within 8 u of its centre, nearest first; each canal left over runs to the nearest foe outside the dome within 8 u, a foe once, and ends in a puddle of still water under it, 1.2 u. The dome's floor, the canals, the puddles and all they touch are one piece. Inside it is the base: friends take 25% less; foes are soaked and slowed. It falls in as the base: 24 to the foes inside. Crash. The dome's floor, the canals and the puddles stay as still water for 8 s after",
   "Lagoon: the dome sends five canals out to her water and to the foes outside it", "soaked; the slow lasts a fifth", "Nova, a dome; five canals running out from it",
   "the sea from below, water running out along stone in five lines, the fall, lapping after", "over the fight, when her water or the pack lies spread round it",
   "(the coil 0.6 s, both paws up at 1.4 s, 0.5 s recovery; the canals run 8 u a second.) The wind-up and the throw as the base; the dome closes from the floor upward, and as its skin meets at the top its foot opens in five places: canals run out along the floor, fast, foam at their heads, one to each of her waters and the rest to the feet of the foes outside, where each opens into a small round puddle. Where a canal meets old water the two foam edges open in 0.3 s and one ripple crosses the join. Under the dome the light is Deep Cobalt and moving. It falls in as the base; the floor and the canals stay, a wheel of water with its spokes.")
# ---------- Tsunami ----------
up(1,'S', full="the bolt as the base (5 u: 14, soaks; 湿: it goes on through a soaked foe). Where it stops, on the last foe it hits or at its full reach, a wave head rises across her aim, 4 u wide, and rolls 2 u on: 14 to every foe it reaches (not a foe the bolt hit), pushed 1 u, soaks",
   sound="the passed spit, then a wave getting up far off, breaking, and hissing flat",
   motion="(0.2 s wind-up, the release at 0.45 s, 0.3 s recovery.) The flick from the hip as the base; the bolt hits and does not just splash: the water it carried spreads sideways along the floor in a blink, a line 4 u wide, stands up in 0.15 s as a low curling front, rolls its 2 u in 0.4 s and breaks into foam. Seen from her it is a T: a thin bolt, then a wide wave across its end. She holds the flick's end a beat, staff level, then lets the tip drop.")
up(3,'S', sound="a whip crack drawn out into a wash, a thud of bodies, water running off",
   motion="(0.25 s coil, the sweep 0.35 s, 0.4 s recovery.) She coils round the staff and unwinds through a half turn, the ribbon out flat at knee height. Under the ribbon's whole length a low crest stands up, from her feet to its tip, and sweeps the half circle with it like a windscreen wiper; the foes it takes ride its front, tumbling, and are left in one pile where the stroke ends. The crest falls flat there; the floor it crossed is wet and dark for a second. Her tail swings out the other way for balance.")
up(10,'S', sound="the passed crash three times, each lower and longer, the last one hissing out",
   motion="(0.2 s wind-up; the crests leave at 0.46 s, 0.86 s and 1.26 s; 0.5 s recovery.) One trunk turn throws the first: a low crest that dies at 2.2 u. Her tail slaps the floor and the second rises through its foam, taller, to 3.5 u. A second slap, the hardest, and the third, the tallest, runs to 5 u before it breaks. Each crest's foam is still on the floor when the next crosses it. She rocks back on her heels after the third and shakes.")
form(17,'S', "蹬浪 Kick waves",
   "the steps leave no ripple; the last landing kicks one wave back down her whole trail, bigger for each step: 8, 16 or 24",
   "the base steps, with no ripple at a landing (the puddles are left as the base). When she stops stepping (the third landing, or the 3 s running out) she kicks one wave back along the steps she has made, at whoever follows her. One step: 3 u wide, 4 u long: 8, pushed 1.5 u. Two steps: 4.5 u wide, 6 u long: 16, pushed 3 u. Three steps: 6 u wide, 8 u long: 24, pushed 4.5 u. Soaks. A foe it pushes into a wall Slams (R9)",
   "Kick waves: she runs, then turns and sends one wave back down her own track", "not pushed: 20% more", "Dash, three hops; one wave back along them",
   "three light taps, a slap of tail, one rush of water running away behind her", "stepping three times away from the pack that chases her or a friend, then the kick",
   "(each hop 0.2 s; the kick 0.25 s; 0.3 s recovery.) The light hops as the base, but the floor stays quiet behind her: only her puddles. On the last landing she turns her back to where she came from, knees bent, and her tail sweeps the floor behind her from side to side, once. A wave jumps off it and runs back down her own track, over her puddles, into the faces of whoever follows: as wide as three of her after one step, twice that after three. She looks back over one shoulder as it breaks.")

# ---------- kit 2.2, after critic round 3 (changed items only; eight must-fixes, all taken) ----------
up(11,'J', short="cooldown 6 s. Every piece spills over: its waves break 1 u past its edge, hit the foes there too, and that rim stays 9 s as water. Cast again within 9 s: 22",
   full="cooldown 6 s (the base 9 s). As the base (16 to foes standing in her water; the water is topped up 2 s, never above the time it was laid with), and each piece spills over as it breaks: its waves reach 1 u past the piece's edge all round and hit the foes standing there too; that 1 u rim stays as still water for 9 s, part of the piece. A cast within 9 s of the last hits for 22, and its rim lies outside the last one, which still stands: the water creeps out 1 u a cast. Two steps only: 16, then 22")
up(16,'J', short="all her water in the room drains to her, dragging the foes in it; then the burst: 40, and 6 more and 0.3 u farther out for each pond, canal, pool or road drained (up to 5: 70 within 3.1 u). The water is spent; the burst leaves one pond",
   full="every part of her water in the room runs to her spot in 1 s, and small foes standing in it are dragged with it up to 4 u toward her; the base's pull within 3 u too. Then the burst: 40 to every foe within 1.6 u, 6 more and 0.3 u farther out for each part drained (each pond, canal, pool, road or path she laid counts as one, joined or not), up to 5: 70 within 3.1 u. Crash. The Sea counts as 5 and is not ended. All the other water drained is spent; the burst's own circle stays as a pond for 6 s. Overflow and Deep Water read the foes as they stood when she cast")
up(22,'J', short="under her own water the 2 s do not run (3.5 s at most); she comes out in one great leap to the pointer, up to 4 u, and lands with a splash that grows with her time under: 14 within 2 u, and 4 more and 0.4 u farther out a second (to 28 within 3.4 u)",
   full="she dives as the base. While she swims under her own water the 2 s clock stops, for up to 3.5 s under in all; under dry floor it runs as the base. Let go, or time out: if she is under her water she does not breach where she is: she leaves it in one great leap, up to 4 u to the pointer, 0.6 s in the air, untouchable, and lands with a splash: 14 to every foe within 2 u, and 4 more and 0.4 u farther out for each second she swam under her water (to 28 within 3.4 u), knocked back 1 u, soaks. This takes the place of the base's line \"in her own water: twice as wide\". Under dry floor: the base's breach. The cooldown starts when she lands")
up(24,'J', short="the dome is 5 u wide; up to five canals run out from it: one to each of her waters within 8 u, the rest to the nearest foes outside, each ending in a puddle under its foe: all one piece. They stay 8 s after it falls",
   full="the dome is 5 u wide (the base 3 u). As it closes, up to five canals, each 1 u wide, run out from its foot: one to each separate piece of her water within 8 u of its centre, nearest first; each canal left over runs to the nearest foe outside the dome within 8 u, a foe once, and ends in a puddle of still water under it, 1.2 u. The dome's floor, the canals, the puddles and all they touch are one piece. Inside it is the base: friends take 25% less; foes are soaked and slowed. It falls in as the base: 24 to the foes inside. Crash. The dome's floor, the canals and the puddles stay as still water for 8 s after it falls")
up(12,'J', motion="(Plant 0.4 s, then one stir of 0.6 s, 0.3 s recovery.) The plant as the base; with her right paw resting on the staff's top she walks her trunk round it once, hips first, so the staff's top draws one slow circle, as if stirring a pot; the paw never leaves it. The pool spins, and the turn spreads: over 0.5 s every pond and canal joined to it begins to turn slowly the same way, long foam streaks winding across it, small eddies round each foe's ankles. Foes in it wade as if through mud. When the pool ends the streaks drift on a second and stop.")
up(3,'S', short="no grab: the whip sweeps a half circle in front of her, 4 u, and a wave runs under its whole length: 12, and up to 5 small foes are carried to the arc's end in one heap",
   full="no grab: the whip sweeps a half circle in front of her at 4 u, from one side to the other, ending on the pointer's side; a wave runs under its whole length, from her feet to its tip: 12 to every foe in the half circle, soaks. Up to 5 small foes, nearest first, are carried along the arc and dropped in one heap at its end (a carry that ends: they Slam on each other and on a wall, R9). Wet: a foe that was soaked lands flat 0.5 s")
up(17,'S', full="the base steps, with no ripple at a landing (the puddles are left as the base). When she stops stepping (the third landing, or the 3 s running out) she kicks one wave from where she stands, back along the steps she has made, at whoever follows her. One step: 3 u wide, 4 u long: 8, pushed 1.5 u. Two steps: 4.5 u wide, 6 u long: 16, pushed 3 u. Three steps: 6 u wide, 8 u long: 24, pushed 4.5 u. Soaks. A foe it pushes into a wall Slams (R9)")
