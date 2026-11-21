# kit 2.2: the lines outside the form tables (run once, after apply.py)
import re
def rd(f): return open(f, encoding='utf-8').read()
def wr(f, s): open(f, 'w', encoding='utf-8').write(s)
T = {}
def rep(f, old, new, count=1):
    s = T.setdefault(f, rd(f))
    pat = r'\s+'.join(re.escape(w) for w in old.split())
    n = len(re.findall(pat, s))
    assert n == count, (f, n, old[:70])
    T[f] = re.sub(pat, lambda m: new, s)
def row(f, gid, new):   # replace a whole table row "| Gxx | ... |"
    s = T.setdefault(f, rd(f))
    pat = r'^\| %s \|.*$' % re.escape(gid)
    assert len(re.findall(pat, s, re.M)) == 1, gid
    T[f] = re.sub(pat, lambda m: new, s, flags=re.M)

K, N, IA, CO, SA, RL = 'TIDECALLER_KIT.md', 'TIDECALLER_NOTES.md', 'TIDECALLER_INTERACTION_AUDIT.md', 'TIDECALLER_COMBO_IDEAS.md', 'TIDECALLER_SAMENESS_AUDIT.md', 'TIDECALLER_REVIEW_LOG.md'

# ---------------- kit
rep(K, "**Version 2.1, 2026-11-21. Design only**", "**Version 2.2, 2026-11-21. Design only**")
rep(K, "Kit 2.1 is kit 2.0 after a critic loop (section 5).", "Kit 2.2 is kit 2.0 after three rounds of a critic\nloop (section 5).")
rep(K, "puddle that grows to 2 u; the tsunami leaves its whole path as water.", "puddle that grows to 2 u (it follows a foe that moves less than 1 u); the tsunami leaves its\n  whole path as water.")
rep(K, "her next skill is twice the size, 30% stronger, and its waves roll on to the far wall", "her next skill is twice the size, 30% stronger, and pushes twice as far")
rep(K, "when a cast of hers joins two pieces of her water, the new piece surges: 12 to every foe in it", "when a cast of hers joins two pieces of her water, the new piece surges: 16 to every foe in it, and all of it lasts as long as when it was laid")
rep(K, "every eighth skill floods the whole room for 6 s: all of it is her water, one piece", "every eighth skill floods the whole room for 6 s: all of it is her water, one piece, on top of what she has laid")
rep(K, "Three Crests stops at 5 u (a full Swell still crosses the room);", "Three Crests stops at 5 u;")
rep(K, "**Kept from 20 Nov (the VFX thread, his picks on the page):**", """**What kit 2.2 changed (critic rounds 2 and 3, 21 Nov):** a fresh critic read kit 2.1 for fit
and repeats, and a detail critic read every motion. Nothing he passed was changed.
- Three rules were broken and are mended: Tide on tide's second step could never land (now
  within 9 s); the Pond-maker could keep water for ever (it lays a new pond each time; no
  water is ever topped up past the time it was laid with); the Blowout launched a soaked pack
  for 1.6 s (now 0.8 s for all).
- The Flood users had fallen into three sentences. Now each does its own thing: the Canal
  sweeps foes to its end; the Spreading ring carries them out of her water; the Stir (was the
  Inflow) runs the whirlpool's tick through the whole piece; the Lagoon's canals run to foes
  too; a Paint loop fills; Open the gate slaps back when it shuts; the Drain leaves one pond.
- Tsunami: Kick waves is one wave down her whole trail, sized by her steps (it repeated her
  dash). A full Swell pushes twice as far and no longer crosses the room: only the Great Wave
  does.
- Details: every Flood form and the four new Tsunami forms now carry wind-up, release and
  recovery times, how the water starts and ends, and a sound with an ending (notes N53a).

**Kept from 20 Nov (the VFX thread, his picks on the page):**""")
rep(K, "(4) the Hanging rain's needles hit one foe in the area style: kept as he designed it.", "(4) the Hanging rain's needles hit one foe in the area style:\nkept as he designed it; (5) Shared water is the weakest Flood form: two critics gave opposite fixes, so it waits for his eye.")

# ---------------- notes
rep(N, "puddles that touch are one piece, so a Crash on a pack leaves one pool under it, and all the puddles of one cast are one part for N20's cap.",
       "puddles that touch are one piece, so a Crash on a pack leaves one pool under it, and all\n  the puddles of one cast are one part for N20's cap. Each rises from under the foe in 0.3 s\n  as the Crash's water falls back.")
rep(N, "carried (the Pick-up, the Bubble wave, the Tow, a Spout, the Whip wave, the Pond clap), sunk (the Sink)",
       "carried (the Pick-up, the Bubble wave, the Tow, a Spout, the Whip wave, the Pond clap, the\n  Spreading ring, the Tsunami basic wave), sunk (the Sink)")
rep(N, "A launch (Geyser, the Blowout, the Fall slam, Otter Dive's breach) is under 1.3 s.", "A launch (Geyser, the Blowout, the Fall slam, Otter Dive's breach) is\n    under 1.3 s; the Blowout's is 0.8 s for every foe.")
rep(N, "The foe is afloat (T3 counts it) but it is not a hold for the cap.", "The foe is afloat (T3 counts it) but it is not a hold for the cap.\n  - A current is not a hold: a foe in the Canal is slid along and still acts.")
rep(N, "At most 12 parts lie at once; past that the smallest dries first.",
       "At most 12 parts lie at once; past that the smallest dries first.\n  - **Time.** Nothing lifts a part above the time it was laid with: Call the Tide's 2 s and\n    Meeting Waters top a part up, never past that time. In its last 0.6 s a part's foam edge\n    runs inward and the floor is left dark for 1 s.\n  - **Joining.** Where new water touches old, the two foam edges open in 0.3 s and one ripple\n    crosses the join.\n  - **Sizes.** \"Wide\" is across. \"Within\" and \"out to\" are from the centre.")
rep(N, "(the Dunk and the Blowout within 3 u, the Plunge pool, the Spreading ring) spreads only", "(the Dunk and the Blowout within 3 u,\n    the Plunge pool, the Spreading ring, the Stir) spreads only")
rep(N, "- rolls on: each wave, ring or push in it goes on past its own reach as a low wave to the far wall: half damage, pushed 1 u (附加伤害);",
       "- pushes, throws and carries twice as far (the slide and Wide Water then apply). It does\n    not cross the room: only the Great Wave does;")
rep(N, "each at least 1 s old, the new piece surges: 12 to every foe standing in it, soaks.", "each at least 1 s old, the new piece surges: 16 to every foe standing in it, soaks, and every\n  part of the new piece is topped up to the time it was laid with.")
rep(N, "Her other water goes on under it and is there when it drains.", "It is a layer on top: her\n  other water goes on under it and is there when it drains, and every skill that lays water\n  lays its part beneath as if on dry floor. A form that asks for a foe outside her water (the\n  Sweep-in) finds none, so in The Sea the Sweep-in washes its foes 2.5 u toward the pointer.")
rep(N, "The Drain counts the flood as five parts and ends it. Nothing lengthens the flood (the Pond-maker's 2 s do not).", "The Drain counts the flood as five parts and does not end it. Nothing lengthens\n  the flood.")
rep(N, "call the tide every 6 s so the edge creeps out, send a Sleeper under the water to the pack.", "call the tide every\n    6 s so the edge creeps out and every second tide hits for 22, send a Sleeper under the\n    water to the pack.")
rep(N, "One puddle at a time grows; a stream that sweeps draws nothing (drawing water is the Paint's job).",
       "One puddle at a time grows;\n  it follows a foe that moves less than 1 u, and a stream that sweeps farther starts again and\n  draws nothing (drawing water is the Paint's job). The look: the stream's end stops splashing\n  and starts to fill; a round puddle rises under the foe's feet, its foam edge creeping out;\n  the sound drops from a hiss to a pour.")
rep(N, "It carries small foes to its end (6 u).", "It carries\n  small foes to its end (6 u) in 0.9 s (a carry, R10). The tell: in the last 0.3 s before it\n  comes, the water at her feet draws back toward her, and the stream thins. The sound: the\n  hiss stops, one deep breath in, then the roll and a long wash out.")
rep(N, "her first water in every fight, and it lies under her own feet for a Spreading ring.", "her first water in\n  every fight, and it lies under her own feet for a Spreading ring. The tide does not crash\n  when she steps off: it lies down round her in 0.4 s, crest last, with a long soft pour.")
rep(N, "it rolls on 5 u, twice as wide (2.6 u): 10, pushed 1.5 u.", "it rolls on 5 u in 0.6 s, twice as wide (2.6 u): 10, pushed 1.5 u; she hops off its back\n  as it leaves, and it breaks with one short crash.")
rep(N, "No style draws a wall: water that stands tall falls from the sky.", """No style
  draws a wall: water that stands tall falls from the sky. Nothing that rises from the floor
  and moves stands taller than her dash crest (1.17 u); only columns and sky falls are taller.
- **N53a. How to read the motions below (kit 2.2).** Each Flood segment and the four new
  Tsunami segments open with their times: wind-up, the release, recovery. The base's time in
  the bullet's head is the release. Each says how the water starts, how it ends and what the
  foes do. The basic attack and the dash: N44, N45, N47.""")
rep(N, "the dive arc and the five porpoise leaps,", "the dive arc and the one porpoise leap,")
rep(N, "the tail kick at a landing (Kick waves),", "the tail sweep at her last landing (Kick waves),")
rep(N, "the staff dragged along the floor (Pond clap),", "the staff's tip dropped to the floor (Pond clap), the planted staff stirred one turn (Stir),")
rep(N, "Renamed: the Drinker is the Inflow 引流; the Paddling pool is the Spill 溢泡.", """Renamed: the Drinker is the
  Stir 搅水 (it was the Inflow 引流 in 2.1); the Paddling pool is the Spill 溢泡.
- **N95c. Kit 2.2, 21 Nov.** Rounds 2 and 3 of the loop. Round 2: a fresh critic for fit and
  repeats (3 must fix, 12 should fix) and a detail critic (19 gaps, 5 across the kit). The
  second lesson: a Flood form that uses her water must not read as "the base, but on every
  foe in the piece"; each needs its own verb (sweeps, carries out, stirs, folds, skips). The
  log has what was taken and what was not.""")
rep(N, "Canal: 拍; 浸 滑 (the canal and its current)", "Canal: 拍; 浸 滑 (the canal sweeps to its end)")
rep(N, "Spreading ring: 拍 滑, through her whole piece", "Spreading ring: 拍 滑, carried out of her whole piece")
rep(N, "Inflow: the same; 滑 (carried along her water)", "Stir: the same, through the whole piece it touches")
rep(N, "Blowout: 浸 湿, her water within 3 u", "Blowout: 浸, her water within 3 u")
rep(N, "Open the gate: 拍; 浸 (the sea)", "Open the gate: 拍; 浸 (the sea, and its slap back)")
rep(N, "Kick waves: 浸 滑 |", "Kick waves: 浸 滑, one wave at the last landing |")
rep(N, "Lagoon: 浸 拍; 浸 (the canals)", "Lagoon: 浸 拍; 浸 (the canals and their puddles)")

# ---------------- interaction audit
rep(IA, "At most 12 parts of still water lie at once; the oldest dries first.", "At most 12 parts of still water lie at once; the smallest dries first. Nothing lifts a part above the time it was laid with.")
rep(IA, "Meeting Waters does not fire when it comes or goes. A Drain ends it", "Meeting Waters does not fire when it comes or goes. It is a layer on top: makers lay their parts beneath as if on dry floor. A Drain counts it as 5 and does not end it. The Sweep-in washes toward the pointer in it")
rep(IA, "A piece surges once in 3 s.", "A piece surges once in 3 s: 16, and every part of the new piece is topped up to its laid time.")
rep(IA, "The Inflow and the Canal move foes, not water.", "The Canal and the Spreading ring move foes, not water; the Stir moves neither.")
rep(IA, "Pieces are counted at the cast, up to 5.", "Parts are counted at the cast, up to 5; Overflow and Deep Water read the foes as they stood at the cast. The burst's circle stays as one pond, 6 s.")
rep(IA, "New in 2.0: the crests grow (2.2 u, 4 u, the far wall); under a full Swell the first two double", "New in 2.0: the crests grow (2.2 u, 3.5 u, 5 u); under a full Swell all three double (4.4 u, 7 u, 10 u) and push twice as far")
rep(IA, "A full cast doubles sizes, never times or counts;", "A full cast doubles sizes and how far it pushes, throws or carries, never times or counts; it does not cross the room;")
rep(IA, "Kick waves and the Wave head push: the slide and Wide Water apply", "Kick waves and the Wave head push: the slide and Wide Water apply. Kick waves is one wave, at the last landing, sized by the steps taken (1, 2 or 3); a step cancelled by a hold kicks at once")
row(IA, "G86", "| G86 | Canal's current (Flood Torrent) | 1.5 u wide, 3 u a second. A small foe in it is swept to its far end: it cannot walk against it, it keeps its feet and still attacks, so it is not held (R10) and the hold cap does not count it. It Slams once at the canal's end (R9), then can walk out. An elite is slid half as fast and can walk out sideways; a champion or a boss not. Two canals that cross: the newer one's current wins where they cross |")
row(IA, "G87", "| G87 | Stir (Flood Whirlpool; was the Inflow) | Reads the pieces that touch the pool each second. The tick (4 a second) and the 30% slow reach every foe in those pieces; the drag and the soak again after a Crash stay in the pool's circle. Zone ticks never spread by Overflow. It moves no foe and no water and does not fire Meeting Waters |")
rep(IA, "The ring follows the water's shape and stops 1 u past its edge or 6 u from her.", "The ring follows the water's shape and carries small foes out with it (R10: a carry of under 1 s), dropping them 1 u past the edge or 6 u from her; they Slam on a wall or each other (R9); an elite half as far.")
row(IA, "G90", "| G90 | Lagoon's canals (Flood Tidal Dome) | Always five: one to each separate piece within 8 u, nearest first; the rest to the nearest foes outside the dome within 8 u, a foe once, each ending in a 1.2 u puddle. With fewer than five targets, fewer canals. All five and their puddles are one part for N20's cap and have no current. The joined piece surges once for Meeting Waters, not once a canal |")
rep(IA, "Each rim is 1 u wide round every piece, 6 s, one part for each cast (not one for each piece).", "Each rim is 1 u wide round every piece, 6 s, one part for each cast (not one for each piece). The 22 needs a cast within 9 s of the last (the cooldown is 6 s).")
rep(IA, "The splash grows only with time swum under her own water, 5 s at most. It is a push, not a launch", "The splash grows only with time swum under her own water, 3.5 s at most (28 within 2.9 u). It is a push, not a launch. The cooldown starts at the landing")
rep(IA, "The wave rises where the bolt stops: on the first foe that is not soaked, or at 5 u. The foe the bolt hit is not hit again by the wave, but it is pushed with the rest", "The wave rises where the bolt stops: at the last foe it hits, or at 5 u. No foe the bolt hit is hit again by the wave, but those in the wave's reach are pushed with the rest")
s = T[IA]; i = s.index('| G93 |'); j = s.index('\n', i)
T[IA] = s[:j] + """
| G94 | Pond-maker on her water | It always lays its own pond (2 u, 6 s). A pond laid on older water is a new part with its own time; the two are one piece. It lengthens nothing |
| G95 | Paint's loop | A stroke that meets itself or her other water closes a loop; the floor inside fills at once if the loop is 5 u across or less. The stroke and its fill are one part and dry together, from the stroke's oldest end. A fill is water laid on dry floor: it can fire Meeting Waters only if it joins two pieces |
| G96 | Open the gate's slap back | One hit of 16 at 2 s on every foe standing in the sea. It is not a Crash, so it lands on foes the front left soaked and keeps them soaked. Overflow spreads the front's 24, not the slap |
| G97 | Blowout on a soaked pack | The launch is 0.8 s for every foe. The base's 湿 line (1.6 s) is off on her water, where every foe is soaked. On dry floor it is the base Geyser with its 湿 line |
| G98 | Spill's puddles | All the puddles of one bubble are one part. The pool at the pop is a second part |""" + s[j:]

# ---------------- combos
rep(CO, "so the Inflow pulls along the stroke;", "so the Stir's tick runs along the stroke;")
rep(CO, "the Inflow pulls through the Hanging rain's pool when the rain ends", "the Stir's tick runs through the Hanging rain's pool when the rain ends")
rep(CO, "the Pond-maker rides the path and bursts at its end; the whole path is 1 u wider", "the Pond-maker rides the path and bursts at its end, and lays its pond there")

# ---------------- sameness audit
rep(SA, "Roll-up rolls on over her water and takes none. Inflow (was the Drinker) pulls foes along the water and drinks none.", "Roll-up rolls on over her water and takes none. The Stir (was the Drinker, then the Inflow) runs the whirlpool's tick through the piece and drinks none.")
rep(SA, "move foes with her water 4 (Sweep-in, Inflow, Pond clap, Sink)", "move foes with her water 4 (Sweep-in, Stir, Pond clap,\nSink)")
rep(SA, "Inflow: the whirlpool pulls on all the water that touches it", "Stir: the whirlpool stirs all the water it touches")
rep(SA, "F12 Inflow (everything flows to the whirlpool),", "F9 Spreading ring (carried out to the edge),")
rep(SA, "The Canal and the Inflow are the nearest pair: one is a straight line with a fixed end, one is every joined water toward a pool. A pair to look at on the page.",
        "The Canal\n  and the Spreading ring are the nearest pair: one is a straight line that sweeps to its end\n  for 6 s, one is a single ring that empties the water she stands in. In 2.2 the Stir left\n  this family: it moves no one; it is the whirlpool's tick through the whole piece.")
rep(SA, "The Pond-maker's second use (1 u wider round the hit) and Tide on tide's rim grow one piece by a cast;", "Tide on tide's rim grows a piece 1 u a cast;")
wr_all = [wr(f, s) for f, s in T.items()]
print('ok', len(T))
