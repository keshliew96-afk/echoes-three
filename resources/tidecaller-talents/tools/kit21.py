# kit 2.1: the lines outside the form tables (run after apply.py)
import re, json
def rd(f): return open(f, encoding='utf-8').read()
def wr(f, s): open(f, 'w', encoding='utf-8').write(s)
T = {}
def rep(f, old, new, count=1):
    s = T.setdefault(f, rd(f))
    pat = r'\s+'.join(re.escape(w) for w in old.split())
    n = len(re.findall(pat, s))
    assert n == count, (f, n, old[:70])
    T[f] = re.sub(pat, lambda m: new, s)

K, N, IA, CO, SA, RL = 'TIDECALLER_KIT.md', 'TIDECALLER_NOTES.md', 'TIDECALLER_INTERACTION_AUDIT.md', 'TIDECALLER_COMBO_IDEAS.md', 'TIDECALLER_SAMENESS_AUDIT.md', 'TIDECALLER_REVIEW_LOG.md'
# ---------------- kit
rep(K, "**Version 2.0, 2026-11-21. Design only**", "**Version 2.1, 2026-11-21. Design only**")
rep(K, "`TIDECALLER_NOTES.md` section 10. Numbers are guesses.", "`TIDECALLER_NOTES.md` section 10. Numbers are guesses. Kit 2.1 is kit 2.0 after a critic loop\n(section 5).")
rep(K, "Flood: a Crash leaves a puddle under each foe it crashes. Tsunami: a Crash's spent water soaks the foes within 1.5 u.",
       "Flood: a Crash leaves a puddle under each foe it crashes that stands on dry\n    floor. Tsunami: a Crash's spent water soaks the other foes within 1.5 u.")
rep(K, "Flood: the stream pools where it ends: a puddle that grows to 2 u; the tsunami leaves its whole path as water. Tsunami: the tsunami comes after 2 s, is three times as wide (about 4 u) and carries small foes to its end.",
       "Flood: where the stream stays 1 s it pools: one\n  puddle that grows to 2 u; the tsunami leaves its whole path as water. Tsunami: the tsunami\n  comes after 3 s, is twice as wide (2.6 u) and carries small foes to its end.")
rep(K, "Flood: the wet path is twice as wide and lasts 8 s.", "Flood: where she steps\n  off, the tide sinks into a pond, 2.6 u, 8 s.")
rep(K, "**T7 Meeting Waters 汇流**: when two pieces of her water join, the new piece surges", "**T7 Meeting Waters 汇流**: when a cast of hers joins two pieces of her water, the new piece surges")
rep(K, "Three Crests now grows: the third crest crosses the room.", "Three Crests now grows (2.2 u, 3.5 u, 5 u).")
rep(K, "**Kept from 20 Nov (the VFX thread, his picks on the page):**", """**What kit 2.1 changed (the critic loop, 21 Nov; his ask: "run critic loop ... make sure it
fit the design element, and no repeating skills, fill in details insanely"):** two fresh critics
read kit 2.0, one for fit and one for repeats. Nothing he passed was changed.
- Flood forms no longer pay "for each separate piece", because the style joins her water into
  one. New rules for the Pond-hopper, Roll-up, Inflow (was the Drinker), Pond clap and Drain.
- Repeats taken out. The Sleeper is a torpedo, not a second Blowout. The Canal has a current.
  The Spreading ring runs through her whole water. Tide on tide spills the edge outward, not
  just bigger numbers. Water walk is free steps on water. The Porpoise is one great leap. Shared
  water makes a friend Crash. The Lagoon sends canals to all her water. The Spill (was the
  Paddling pool) no longer follows the friend. Paint's burst leaves no pool.
- Tsunami: the Wave head is the bolt and then a wide wave at its end; Kick waves go back the
  way she came; Three Crests stops at 5 u (a full Swell still crosses the room); the basic
  tsunami is back to the passed 3 s, twice as wide, not three times.
- Rules: Flood's dash leaves a pond where she steps off; the stream's puddle needs 1 s on one
  spot; a Crash's puddles are not laid on her water; Meeting Waters needs a cast of hers.

**Kept from 20 Nov (the VFX thread, his picks on the page):**""")
rep(K, "**Open:** nothing. The 48 Flood and Tsunami forms are not on the ability page yet; he marks them there.",
       "**Open, for his mark:** (1) Kick waves stand where his kept Swap stood; (2) Three Crests grows;\n(3) no style is the boss path now; (4) the Hanging rain's needles hit one foe in the area style:\nkept as he designed it. The Flood and the new Tsunami forms are his to mark on the page.")
# ---------------- notes
rep(N, "**Version 2.0, 2026-11-21. Design only.**", "**Version 2.1, 2026-11-21. Design only.**")
rep(N, "under each foe the cast crashed; puddles that touch are one piece, so a Crash on a pack leaves one pool under it. Tsunami: the splash soaks the foes within 1.5 u, so the next Crash has targets.",
       "under each\n  foe the cast crashed that stands on dry floor (none under a foe already in her water);\n  puddles that touch are one piece, so a Crash on a pack leaves one pool under it, and all\n  the puddles of one cast are one part for N20's cap. Tsunami: the splash soaks the other\n  foes within 1.5 u (not the foes that cast crashed), so the next Crash has targets.")
rep(N, "(Geyser, the Blowout, the Fall slam, Otter Dive's breach, the Porpoise)", "(Geyser, the Blowout, the Fall slam, Otter Dive's breach)")
rep(N, "At most 12 parts of still water lie at once; the oldest dries first.", "A part 块 is one thing she laid: a pond, a canal, a road, a rim, the puddles\n    of one Crash. At most 12 parts lie at once; past that the smallest dries first.")
rep(N, "Water can be moved (the Roll-up, the Pond clap, the Drain) or drunk (the Drinker); the rain, the dome and The Sea cannot.",
       "Water can be moved for a moment (the Pond clap folds it in and it runs back) or spent\n    (the Drain); the rain, the dome and a Whirlpool cannot. No other form takes water away.")
rep(N, "(Shared water on herself gives it 30%)", "(Shared water on herself makes one tick a second a small Crash)")
rep(N, "A form that already hits the whole piece (the Dunk, the Pond-hopper, the Sleeper, the Plunge pool, the Blowout) gains nothing from it.",
       "A form that already reaches through her water (the Dunk and the Blowout within 3 u,\n    the Plunge pool, the Spreading ring) spreads only to the foes of that piece it did not\n    reach itself.")
rep(N, "When two pieces of her water that were apart touch and become one, the new piece surges: 12 to every foe standing in it, soaks. 常规直伤, area; not a Crash. Once a second for the room. Water laid on top of her water is not a joining; a piece that fell apart and joins again is.",
       "When a cast of hers joins two pieces of her water that\n  were apart, each at least 1 s old, the new piece surges: 12 to every foe standing in it, soaks.\n  常规直伤, area; not a Crash. A piece surges once in 3 s. Water laid on top of her water is not a\n  joining; wet footprints and water that only moves (the Pond clap) never fire it; a piece that\n  fell apart and is joined again by a cast does.")
rep(N, "Only after a push or a throw that leaves the foe 1.5 u or more farther from her than it was:", "Only after a push or a throw that leaves the foe 1.5 u or more\n  farther from her than it was (measured from where the push began; a cast with several pushes is\n  judged on the whole move):")
rep(N, "The Drain counts the flood as one piece and ends it.", "The Drain counts the flood as five parts and ends it. Nothing lengthens\n  the flood (the Pond-maker's 2 s do not).")
rep(N, "The loop: open the gate, pond the gaps, call the tide every 5 s, sink a charge into the big piece.", "The loop: open the gate, pond the gaps, call the tide every\n    6 s so the edge creeps out, send a Sleeper under the water to the pack.")
rep(N, "the water pools: a puddle of still water that grows while she holds the stream there, to 2 u in 2 s, and stays 4 s after the stream leaves it. Moving the stream starts a new puddle, so sweeping it draws water.",
       "the water pools once the\n  stream has stayed there 1 s: one puddle of still water that grows while she holds the stream\n  on it, to 2 u in 2 s, and stays 4 s after the stream leaves it. One puddle at a time grows;\n  a stream that sweeps draws nothing (drawing water is the Paint's job).")
rep(N, "The tsunami comes after 2 s of stream and is three times as wide: 3.9 u (the passed 1.3 u was his own correction for the base wave; the base keeps it).",
       "The tsunami comes after 3 s of stream (as passed for Surge) and is twice\n  as wide: 2.6 u (the passed 1.3 u was his own correction for the base wave; the base keeps it).")
rep(N, "Flood: the wet path is twice as wide and lasts 8 s: her first piece of water in every fight.",
       "Flood: the wet path as the base, and where\n  she steps off the tide sinks into a pond of still water, 2.6 u wide, 8 s: her first water in\n  every fight, and it lies under her own feet for a Spreading ring.")
rep(N, "Flood form of Bubble Ward is the Paddling pool, not the Moat", "Flood form of Bubble Ward is the Spill 溢泡, not the Moat")
rep(N, "the Sleeper, Tide on tide every 5 s,", "the Sleeper, Tide on tide every 6 s,")
for old, new in [
  ("Dunk: 浸 滑, the whole piece", "Dunk: 浸 滑, her water within 3 u"),
  ("Pond-hopper: 浸, each piece", "Pond-hopper: 浸, each foe it hunts"),
  ("Sleeper: 拍, the whole piece", "Sleeper: 拍, 2.5 u"),
  ("Open the gate: 拍 滑; 浸 (the sea)", "Open the gate: 拍; 浸 (the sea)"),
  ("Spreading ring: 拍 滑; 浸 (the far ring, the pool)", "Spreading ring: 拍 滑, through her whole piece"),
  ("Roll-up: 拍 滑; 浸 (the pool)", "Roll-up: 拍 滑, as far as her water goes"),
  ("Tide on tide: 拍, every 5 s", "Tide on tide: 拍, every 6 s; 浸 (the rim)"),
  ("Drinker: the same, over all it has drunk", "Inflow: the same; 滑 (carried along her water)"),
  ("Water walk: 浸, as the base", "Water walk: 浸, 3 u on her water"),
  ("Paddling pool: 浸 (the pop, the pool)", "Spill: 浸 (the puddles, the pop, the pool)"),
  ("Blowout: 浸 湿, the whole piece", "Blowout: 浸 湿, her water within 3 u"),
  ("Porpoise: 浸, at each breach", "Porpoise: 浸 滑, at the landing"),
  ("| Shared water: 浸 |", "| Shared water: 浸 拍 (the friend's small Crash) |"),
  ("Lagoon: 浸 拍; 浸 (the lake)", "Lagoon: 浸 拍; 浸 (the canals)"),
  ("| Wave head: 浸 滑 |", "| Wave head: 浸 湿 滑 |"),
  ("Canal: 拍; 浸 (the canal)", "Canal: 拍; 浸 滑 (the canal and its current)"),
  ("the Pond-maker, the Pond-hopper, the Wave head, the Bouncer, the Conveyor.", "the Pond-maker, the Pond-hopper,\n  the Bouncer, the Conveyor."),
]: rep(N, old, new)
# ---------------- interaction audit
rep(IA, "Tide on tide: the rise is kept while casts are within 6 s of each other; it is read at the cast.", "Tide on tide: the second step (22) needs a cast within 6 s of the last; each rim is laid where the waves broke and is its own part.")
rep(IA, "Water walk: the long step is one step of the three; it ends at the piece's edge or at 8 u. Kick waves: a wave for each landing, aimed when she lands.", "Water walk: a landing on her water gives the step back, six steps at most; in The Sea every landing is free, to the six. Kick waves: a wave for each landing, back along the step she has just made.")
rep(IA, "Fires when two pieces that were apart become one. Once a second for the room; the same two pieces once every 3 s (a Paddling pool walking in and out). Water laid on water is not a joining", "Fires when a cast of hers joins two pieces that were apart, each at least 1 s old. A piece surges once in 3 s. Water laid on water is not a joining; footprints and the Pond clap's folding water never fire it. A Canal, a Lagoon's canals, a Tide on tide rim, a Bow wave road and a Paint stroke do")
rep(IA, "The Roll-up, the Pond clap, the Drain and the Drinker take still water, puddles, ponds, canals and the wet path. They never take the rain, the dome, The Sea, or a Whirlpool (the Drinker is one). Moved water keeps the time it had left. A Sleeper waiting in moved water goes with it", "Only the Pond clap moves water, and it runs back where it lay. The Inflow and the Canal move foes, not water. The Drain spends still water, puddles, ponds, canals, roads and the wet path; it never takes the rain, the dome or a Whirlpool. A Sleeper under drained water goes up at once")
rep(IA, "One waits at a time: a second cast into any of her water sets the first off. If its water dries it goes off as the base burst. It reads the piece as it is when it goes off", "One sleeps at a time: a second cast sets the first off where it lies. It swims only under her water, 6 u a second, to the foe in that piece nearest the pointer at the cast; if that foe leaves the water it takes the next nearest. If its water dries it goes up at once")
rep(IA, "A friend and her water (Paddling pool, Shared water) | The pool under a friend is her water for every rule, and joins and leaves pieces as the friend walks (G74). Shared water's 30% is her damage, read from the friend's hit as dealt; it is 附加伤害 and never spreads again", "A friend and her water (Spill, Shared water) | The Spill's puddles and pool are her water for every rule and lie where they fell. Shared water reads where the friend stands when the hit lands; the small Crash's 30% is 增伤区 on the friend's own hit, and it spends the soak like any Crash (Great Wave does not count it)")
rep(IA, "In The Sea a Water walk is 8 u. A Porpoise leaves her water: she stays under as the base for what is left of the swim", "A Porpoise's clock stops only under her water; if she swims out under dry floor the base's 2 s run on from where they stood. Her leap never ends on a floor warning (G17)")
rep(IA, "He is the best carrier for a Paddling pool: the pack stands round him.", "He is the best friend for a Spill: the pack that hits him stands in its puddles.")
rep(IA, "Call the Tide every 5 s (Tide on tide) in a room full of her water.", "Call the Tide every 6 s (Tide on tide) in a room full of her water, and how far its rim creeps in a long fight.")
s = T[IA]; a = s.index('| G85 |'); b = s.index('\n', a)
T[IA] = s[:b] + """
| G86 | Canal's current (Flood Torrent) | A push, never a hold: washed foes act and attack. 1.5 u a second, an elite half, a champion or a boss not. A foe is Slammed once at the canal's end (R9). Two canals that cross: the newer one's current wins where they cross. Under an Inflow the faster pull wins; they never add |
| G87 | Inflow (Flood Whirlpool) | Reads the pieces that touch the pool each second. Foes are carried along the water, never over dry floor; one that reaches the pool's circle is under the base's drag. It moves no water and does not fire Meeting Waters |
| G88 | Pond-hopper (Flood Skipping Stone) | A foe is hit twice at most by one stone. A hop is 4 u at most and may cross dry floor between two waters. The 16 is the last skip, wherever it lands. Combo C4 gives 10 skips |
| G89 | Spreading ring and Roll-up | Both read her water at the cast. The ring follows the water's shape and stops 1 u past its edge or 6 u from her. The Roll-up needs water under its middle: a dry gap wider than 1 u ends it there. Neither moves or spends water |
| G90 | Lagoon's canals (Flood Tidal Dome) | Up to 5, to the nearest parts within 8 u; each canal is a part for N20's cap and has no current. The joined piece surges once for Meeting Waters, not once a canal. The dome's floor is water only while the dome stands and for the 8 s after |
| G91 | Tide on tide's rim | Each rim is 1 u wide round every piece, 6 s, one part for each cast (not one for each piece). With Floodplain the rim is 1.4 u. In The Sea there is no edge: it only deals its damage |
| G92 | Porpoise's leap | Up to 4 u to the pointer; untouchable in the air. The splash grows only with time swum under her own water, 5 s at most. It is a push, not a launch |
| G93 | Wave head (Tsunami Riverbolt) | The wave rises where the bolt stops: on the first foe that is not soaked, or at 5 u. The foe the bolt hit is not hit again by the wave, but it is pushed with the rest |""" + s[b:]
# ---------------- combos
for old, new in [
  ("Paint: the orb's trail into the pool is drunk by the Drinker, and the orb circles as written", "Paint: the stroke into the pool is one piece with it, so the Inflow pulls along the stroke; the orb circles as written"),
  ("as written; the Drinker drinks the rain's pool when the rain ends", "as written; the Inflow pulls through the Hanging rain's pool when the rain ends"),
  ("the Pond-hopper: up to 8 pieces in place of 6", "the Pond-hopper: its hunt goes to 10 skips in place of 8"),
  ("so the Blowout launches every foe inside, and the rain's 16 comes on top", "so the Blowout launches every foe within 3 u of the vent, and the rain's 16 falls on everyone inside"),
  ("the Roll-up picks up the Plunge pool and its fall with it;", "the Roll-up rolls on over the Plunge pool and takes the fall with it;"),
  ("the Sleeper: every foe in the piece is launched", "the Sleeper: the foes it goes up under are launched, as written"),
  ("Shared water and the Paddling pool: as written", "Shared water and the Spill: as written; the Spill's pool is water for the friend to stand in"),
]: rep(CO, old, new)
# ---------------- sameness audit: idea rows from ideas.json, and a 2.1 section
ideas = json.load(open('ideas.json'))
s = rd(SA)
for col, title, nxt in (('J', '## 2. Flood', '## 3. Tsunami'), ('S', '## 3. Tsunami', '## 4. Bubble')):
    i = s.index(title); j = s.index(nxt)
    def fix(m):
        k = f"{m.group(1)}{col}"
        return f"| F{m.group(1)} | {m.group(2)} | {ideas[k]} |" if k in ideas else m.group(0)
    s = s[:i] + re.sub(r'\| F(\d+) \| (.+?) \| (.+?) \|(?=\n)', fix, s[i:j]) + s[j:]
s = s.replace("**2026-11-21, on kit 2.0.**", "**2026-11-21, on kit 2.1** (kit 2.0 after a fresh critic's repeat hunt; section 1b).")
a = s.index('## 2. Flood')
s = s[:a] + """## 1b. Kit 2.1: what the repeat critic found and what changed

A fresh critic who had not seen the design read the kit and the full rules for repeats only.
Its test: two entries repeat when a player would describe them with the same sentence.

| The sentence | Who shared it | What changed |
|---|---|---|
| A straight wave rolls along my aim and shoves the line | Wave head, Kick waves, the Tsunami dash, the Tsunami basic attack | Wave head is the bolt, then a wide wave across its end. Kick waves go back the way she came |
| Point at my water and the whole piece goes up | Sleeper, Blowout, Call the Tide | Sleeper is a torpedo under the water (2.5 u). Blowout throws up 3 u, not the whole piece |
| A straight strip of still water | Canal, the Flood tsunami's path | The Canal has a current that carries foes to its end |
| Hold and drag to draw water | Paint, the Flood stream | The stream pools only where it stays 1 s; only the Paint draws |
| I ride and a road of water stays behind | Bow wave, the Flood dash | The dash leaves a pond where she steps off; the road is the Bow wave's |
| The hit runs through the whole piece | Overflow (T1), Dunk, Pond-hopper, Sleeper, Plunge pool, Blowout, Shared water | Pond-hopper hunts foe to foe; Shared water makes the friend Crash; Dunk and Blowout reach 3 u |
| The base skill, and a round pool stays | Pond-maker, Spreading ring, Plunge pool, Paint's burst | Spreading ring leaves no water: it runs through the water she stands in. Paint's burst leaves none |
| A round water spot, it drops, a wide sheet stays | Plunge pool, Lagoon | The Lagoon sends canals to all her water and joins it |
| Gather my scattered pieces, bigger for each | Roll-up, Drinker, Drain | Roll-up rolls on over her water and takes none. Inflow (was the Drinker) pulls foes along the water and drinks none. Only the Drain spends |
| A wave that crosses the room | Three Crests, a full Swell, Great Wave | Three Crests stops at 5 u |
| On my water my escape goes much farther | Water walk, Porpoise | Water walk is free steps with wide ripples. The Porpoise is a long swim and one great leap |

What Flood's 24 forms do now: lay water 7 (Pond-maker, Canal, Paint, Open the gate, Plunge
pool, Bow wave, Spill, and his Hanging rain's pool); reach through her water 5 (Dunk,
Spreading ring, Roll-up, Blowout, Pond-hopper); move foes with her water 5 (Canal's current,
Sweep-in, Inflow, Pond clap, Sink); grow or join it 2 (Tide on tide, Lagoon); spend it 1
(Drain); other 4 (Sleeper, Water walk, Porpoise, Shared water).

Left as they are, because he passed them (open choices only): Whirlpool and Maelstrom both
pull to a centre; Sky Fall, Tidal Dome, Rain Squall and Whirlpool are four soak-and-slow
circles; Geyser, Depth Charge and Clapping Waves are three aimed, delayed bursts.

""" + s[a:]
s = s.replace("""- **Flood, a line of water:** F2 Canal (straight, from the jet), F6 Paint (freehand, held)
  and F14 Bow wave (her own ride), beside the Flood dash's wide path. Four ways to draw a
  line. The first family to look at.""", """- **Flood, a line of water:** F2 Canal (straight, and it runs: a current), F6 Paint
  (freehand, held) and F14 Bow wave (her own ride, foes drawn onto it). In 2.1 the dash no
  longer draws a fourth line.""")
T[SA] = s
# ---------------- review log
T[RL] = rd(RL).rstrip('\n') + """

## Kit 2.1: the critic loop, round 1, 21 Nov (two fresh critics)

His words, 20 Nov 17:24 UTC, before he slept: "I going to sleep, you help run critic loop to
check on the ability, make sure it fit the design element, and no repeating skills, fill in
details insanely".

Two fresh critics who had not seen the design read `TIDECALLER_KIT.md` and the full rules.
One judged fit (massive area, style fit, sea and water, his standing rules, the shapes he has
rejected, clarity). One hunted repeats only. Neither gave a score. They were told what he has
passed; nothing passed was changed.

**Fit critic: 19 findings, 8 must fix.** No rule breaks (no wall, heal, non-bubble shield,
moved friend or moved boss; every form touches Soaked). The must-fixes:
1. Five Flood forms paid "for each separate piece" while the style joins her water into one:
   Pond-hopper, Roll-up, Drinker, Pond clap, Drain. All five now read the water itself.
2. Roll-up and Drinker deleted her water for a small gain. Neither takes water now.
3. The Tsunami basic attack (2 s, 3.9 u wide) beat every wave skill. Back to the passed 3 s,
   twice as wide.
4. Tide on tide only changed numbers. It now spills each piece's edge 1 u outward.
5. The Paddling pool was a zone that only follows (a shape he has rejected). It is the Spill.
6. Water walk had no area and an unknown length. It is free steps with 3 u ripples.
7. "Its time starts again" let a 2.5 s skill keep any water, and The Sea, for ever. Now 2 s,
   near the hit only, never The Sea.
8. One Crash on a pack could dry her oldest water through the 12-part cap. One cast's puddles
   are one part; none are laid on her water; the smallest dries first.

**Repeat critic: 16 groups, 4 must fix.** The table is in the sameness audit, section 1b.

**Not taken, and why:**
- Three Crests as 6, 8, 14 with a carrying third crest: its numbers and its soak rule are the
  passed ones; only its reach grows.
- Great Wave's width and wall Slam, the Hanging rain's needles spread over three foes: both
  are his passed designs. Listed as open choices only.
- The Whip wave throwing its heap away from her: its arc already ends on the pointer's side.
- "Standing in Flood water makes every Crash +60%": that is the style working. It is on the
  list to measure first.

**Still true:** she has no boss path; the Swap is out without his word.
"""
for f, s in T.items(): wr(f, s)
print('ok', list(T))
