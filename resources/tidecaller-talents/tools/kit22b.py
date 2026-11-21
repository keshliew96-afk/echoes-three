import re, json
def rd(f): return open(f, encoding='utf-8').read()
def wr(f, s): open(f, 'w', encoding='utf-8').write(s)
SA, RL = 'TIDECALLER_SAMENESS_AUDIT.md', 'TIDECALLER_REVIEW_LOG.md'
ideas = json.load(open('ideas.json'))
s = rd(SA)
for col, title, nxt in (('J', '## 2. Flood', '## 3. Tsunami'), ('S', '## 3. Tsunami', '## 4. Bubble')):
    i = s.index(title); j = s.index(nxt)
    def fix(m):
        k = f"{m.group(1)}{col}"
        return f"| F{m.group(1)} | {m.group(2)} | {ideas[k]} |" if k in ideas else m.group(0)
    s = s[:i] + re.sub(r'\| F(\d+) \| (.+?) \| (.+?) \|(?=\n)', fix, s[i:j]) + s[j:]
assert "on kit 2.1** (kit 2.0 after a fresh critic's repeat hunt; section 1b)." in s
s = s.replace("on kit 2.1** (kit 2.0 after a fresh critic's repeat hunt; section 1b).", "on kit 2.2** (kit 2.0 after three critic rounds; sections 1b and 1c).")
a = s.index('## 2. Flood')
s = s[:a] + """## 1c. Kit 2.2: round 2's repeats

A second fresh critic read kit 2.1. Its finding on Flood: the forms that use her water had
fallen into three sentences.

| The sentence | Who shared it | What changed |
|---|---|---|
| The base hit, but on every foe in my water | Spreading ring, Blowout, Sleeper, Plunge pool, Dunk, Overflow | The Spreading ring now carries the foes out of the water. The others keep their own picture (a launch, a torpedo, a fall's ring, a thrown foe) |
| My water carries foes slowly toward a point | Canal, Inflow | The Canal sweeps a foe to its end and Slams it. The Inflow is the Stir: it carries no one; the whirlpool's tick runs through the piece |
| Lines of water run out and join my pieces | Canal, Paint, Lagoon | The Lagoon's canals also run to foes and put a puddle under each. A Paint loop fills the floor inside it |
| A wave runs back or on from my dash | Kick waves, the Tsunami dash | Kick waves is one wave at her last landing, down her whole trail, sized by her steps |
| A full cast crosses the room | a full Swell, the Great Wave | A full Swell pushes twice as far and stays at twice its size; only the Great Wave crosses the room |
| The edge of my water creeps out | Pond-maker on her water, Tide on tide | The Pond-maker always lays a pond; only Tide on tide moves an edge |

What Flood's 24 forms do in 2.2: lay water 8 (Pond-maker, Canal, Paint, Open the gate, Plunge
pool, Bow wave, Spill, his Hanging rain); hit through her water 4 (Dunk, Roll-up, Blowout,
Pond-hopper); move foes with her water 5 (Canal's current, Sweep-in, Spreading ring, Pond
clap, Sink); grow or join it 2 (Tide on tide, Lagoon); spend it 1 (Drain); other 5 (Sleeper,
Stir, Water walk, Porpoise, Shared water). The Canal is counted twice: it lays and it moves.

Weakest form, for his eye: Shared water (a friend Crashes while standing in her water). Round
1 said it repeated Overflow; round 2 said its fix reads like a Crash rule of its own. The two
critics' fixes pull opposite ways, so it stays as 2.1 wrote it.

""" + s[a:]
wr(SA, s)

r = rd(RL)
r = r.rstrip('\n') + """

## Kit 2.2: the critic loop, rounds 2 and 3, 21 Nov

**Round 2: one fresh critic for fit and repeats, one for detail.** Both read kit 2.1 cold.

**Fit and repeats: 3 must fix, 12 should fix.** Its verdict on kit 2.1: the Tsunami four are
close (Whip wave and Three Crests good, Wave head a nit, Kick waves repeats the dash); the
Flood column is not yet healthy as a set.
1. Tide on tide's 22 could never land: a 6 s cooldown and a 6 s window. The window is 9 s.
2. Pond-maker's 2 s and Call the Tide's 2 s kept water for ever. The Pond-maker lays a new
   pond every time, and nothing lifts a part above the time it was laid with.
3. The Blowout launched a soaked pack 1.6 s, outside the hold cap. 0.8 s for all.
The should-fixes taken: the Canal sweeps to its end; the Spreading ring carries foes out; the
Inflow is the Stir; the Lagoon's canals reach foes; a Paint loop fills; Open the gate slaps
back; the Drain leaves a pond and reads foes at the cast; the Porpoise is 3.5 s at most; The
Sea is a layer on top; Meeting Waters is 16 and tops the piece up; a full Swell no longer
crosses the room; Kick waves is one wave sized by her steps.

**Detail critic: 19 gaps in single forms, 5 across the kit.** No Flood motion had a time; six
did not say how the water ends; three could be drawn as a wall (the Open the gate front, the
Roll-up's crest, the Porpoise's "round wall of spray"). All 24 Flood motions and the four new
Tsunami motions were rewritten with wind-up, release and recovery, the water's start and end,
what the foes do, and a sound with an ending. New notes: N20 (time, joining, sizes), N53 (no
moving water taller than her dash crest), N53a, and the style looks of the basic attack and
dash in N44, N45, N47.

**Not taken, and why:**
- The Sink moving its foes to the pointer: one more carrier in a style that now has five.
- Shared water: the two rounds gave opposite fixes. Kept, and named the weakest form.
- Anything on Three Crests' numbers, the Great Wave or the Hanging rain's needles: passed.
"""
wr(RL, r)
print('ok')
