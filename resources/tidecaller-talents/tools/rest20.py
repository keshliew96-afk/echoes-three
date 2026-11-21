import json, re
ideas=json.load(open('ideas.json'))
SK=["Riverbolt","Torrent","Water Whip","Skipping Stone","Spray","Tide Orb","Depth Charge","Floodgate","Breaker","Crashing Wave","Call the Tide","Whirlpool","Sky Fall","Wave Rider","Clapping Waves","Maelstrom","Ripple Step","Bubble Ward","Rain Squall","Geyser","Water Prison","Otter Dive","River's Gift","Tidal Dome"]
def tab(col): return "| # | Skill | 特点 |\n|---|---|---|\n"+"\n".join(f"| F{i+1} | {SK[i]} | {ideas[f'{i+1}{col}']} |" for i in range(24))

# ------------------------------------------------ sameness audit
old=open('TIDECALLER_SAMENESS_AUDIT.md',encoding='utf-8').read()
i6=old.index("## 6. Base pool"); i7=old.index("## 7. Talents, combos, basic attack and dash against forms")
sec6=old[i6:i7]
for a,b in [("- **B7. Tidal Wall and Tidal Dome.** Only the wall stops shots; the dome is the room where\n  friends take less.","- **B7. Sky Fall and Tidal Dome.** Only the fall stops shots; the dome is the room where\n  friends take less."),
            ("| Water Whip | it lands flat | the Crest and the Swap also knock flat, by other means |","| Water Whip | it lands flat | the Crest and the Dunk also knock flat, by other means |"),
            ("| Riverbolt | the bolt goes on through it | the water blade and Torrent go through every foe; this one only through wet ones |","| Riverbolt | the bolt goes on through it | Torrent goes through every foe; this one only through wet ones |"),
            ("The rules every style feels without a skill: the slide 滑 (close to T2 Rolling Tide, which also\nlengthens pushes; they add), the bubble rule (R11) and Jet's double Pressure. The slide and T2\nare the pair to watch.","The rules every style feels without a skill: the slide 滑 (close to T11 Wide Water, which also\nlengthens pushes; they add) and the bubble rule (R11). The slide and T11 are the pair to\nwatch.")]:
    assert sec6.count(a)==1, a[:40]; sec6=sec6.replace(a,b)
new=f"""# Tide Caller: sameness audit

**2026-11-21, on kit 2.0.** Kesh's rule from Windbriar (18 Nov, 23:53 and 23:54 Singapore
time): every skill and every style form needs its own 特点; no idea may be used twice in one
style.

**What was checked:** the 24 pressed base skills, the 2 passives, all 72 style forms, the
passive's three shapes, the basic attack and dash forms, the 15 talents and the 12 combos.

**The rule used:** each form is boiled down to one core idea. A repeat is an idea used by two
forms of one style, or a form that does what a talent, a combo, the basic attack or the dash of
that style already does, or a form that only changes a number. The same idea in two styles, or
on two heroes, is allowed.

**How it was checked:** kits 1.0 and 1.1 were read by two fresh judges (their lists were
fixed then). **Kit 2.0's Flood column, its three new Tsunami forms and its ten new talents
have only my own read.** My own reads have missed repeats before, so this file does not claim
"0 left": section 5 lists the families that are close, and names two forms that only change a
number. His eye on the page is the check.

## 1. What changed in 2.0

| Style | Forms | New in 2.0 | Kept |
|---|---|---|---|
| Flood 涨潮 | 24 | 23, and the Hanging rain (his design, moved from Jet) with standing water added | |
| Tsunami 海啸 | 24 | Wave head, Whip wave, Kick waves; Three Crests grows | 20, as they stood on 20 Nov |
| Bubble 泡沫 | 24 | the Bubble flail (his design, moved from Jet) in place of Guard bubbles | 23 |
| Base pool | 26 | none | all; F13 has been Sky Fall since 20 Nov |

## 2. Flood 涨潮: one idea each

{tab('J')}

Gone: all 24 Jet forms went with the style (`TIDECALLER_KIT_1.9.md` lists them). Two of them
were his own designs and moved on his picks 1a and 2a: the Hanging rain to this column, the
Bubble flail to Bubble.

## 3. Tsunami 海啸: one idea each

{tab('S')}

Gone in 2.0: the Cradle (one shove down a row), the Flail (one foe swung) and the Swap (one
foe traded): each worked on one foe. Gone on 20 Nov by his picks: Overhead (Three Crests),
the Sea fall (Ring out, when the wall became Sky Fall) and the Whale breach (the Fall slam).
The older cuts are in the kit 1.9 copy of this file's history (review log).

## 4. Bubble 泡沫: one idea each

{tab('U')}

Gone in 2.0: Guard bubbles (three bubbles that each stop one hit), for the Bubble flail.

## 5. Families that are still close

These share a goal, not a mechanic. They are the first ones to look at on the page.

- **Flood, a line of water:** F2 Canal (straight, from the jet), F6 Paint (freehand, held)
  and F14 Bow wave (her own ride), beside the Flood dash's wide path. Four ways to draw a
  line. The first family to look at.
- **Flood, a round pool:** F1 Pond-maker (a shot), F9 Spreading ring (round her), F13 Plunge
  pool (it grows under the fall), F19 the rain's pool, F8 Open the gate and F24 Lagoon (the
  two big ones). Laying water is the path, as giving a bubble is Bubble's; each lays it
  another way.
- **Flood, the whole piece is hit:** F3 Dunk (by a thrown foe), F4 Pond-hopper (each piece
  in turn), F7 Sleeper (a mine that waits), F13 Plunge pool (the drop), F20 Blowout (a
  launch), beside the base Call the Tide and T1 Overflow's half. Five forms. The Sleeper and
  the Blowout are the nearest pair: one is damage and waits, one launches.
- **Flood, her water moves:** F10 Roll-up (a wave gathers it), F15 Pond clap (two slide
  together), F16 Drain (all of it, spent), F12 Drinker (the whirlpool eats it).
- **Flood, a friend and her water:** F18 Paddling pool (the friend carries a pool) and F23
  Shared water (the friend's hits run through it).
- **Flood, she crosses her own water:** F17 Water walk (one step over a whole piece) and F22
  Porpoise (leaps along it), beside Home Waters' slide.
- **Flood, only a number:** F11 Tide on tide (a shorter cooldown and a rising number) and
  F24 Lagoon (wider, and it leaves water). Both break the rule as written. Tide on tide is
  kept because Call the Tide is the path's main button and the short cooldown was in the
  pick list he chose from; the Lagoon is the weakest form in the column.
- **Tsunami, holds:** F6 Pick-up (in the orb), F12 Abyss (under), F21 Tow (on a rope). The
  Vice is one crush now, not a hold.
- **Tsunami, thrown to the pointer:** F20 Toss, F11 Gathering tide (from all her water) and
  F21 the Tow's throw (his ask).
- **Tsunami, a waterfall drops:** F7 Slam down (on a gathered knot), F16 Fall slam (on a
  launched pack) and F13 Ring out (the standing fall), since 20 Nov. Three in one style;
  they differ in what comes before the fall.
- **Tsunami, a wave from her that pushes:** F1 Wave head (a line), F17 Kick waves (three
  short ones), F10 Three Crests (three that grow), F8 Flood crest (a river she turns),
  beside the tsunami, the Tsunami dash and T14. The Wave head is the plainest: it is close
  to the dash's rolling tide.
- **Tsunami, the pack ends in one heap:** F3 Whip wave (along an arc), F5 Drag-in (to her
  feet), F22 Round-up (to a ring's centre), F7 Slam down's whirlpool, F12 Abyss.
- **Tsunami, she moves:** F9 Leap, beside the base Wave Rider.
- **Bubble, bubbles for friends:** F1 (a catch), F3 (and the foes yanked off), F6 (it bites),
  F18 (it hops), F20 (a fountain), F24 (one for all), and the foam tsunami.
- **Bubble, one foe in a bubble:** F9 Bubble flail (slammed three times), the base Water
  Prison (sealed), F8 Bubble wave (blown down a line), F14 Bubble wake (a row).
- **Bubble, bubbles on herself:** the Bubble dash and T6's small bubble on every cast. Guard
  bubbles is gone, so nothing in the style stops a hit on her but those two.
- **Bubble, foes up and friends bubbled in one cast:** F11 Bubbling up and F17 Bubble hop.
- **Bubble, safe ground:** F2 Wash, F7 Raft, F12 Steady water.
- **Bubble, fooling the foe:** F10 Faceful (blind) and F16 Decoy.

{sec6}## 7. Talents, combos, basic attack and dash against forms

- T1 Overflow (half through the piece): the five whole-piece forms hit at full and gain
  nothing from it (notes N24). No form copies the half.
- T4 Deep Water: no form only adds damage in her water.
- T7 Meeting Waters: the Canal, Paint and the Bow wave join pieces and so fire it; the Pond
  clap joins two by its own rule and fires it too. No form surges on a joining.
- T10 Floodplain: no form only widens water, but the Pond-maker's second use (1 u wider)
  and the Blowout's landing (1 u wider) sit near it.
- T13 The Sea: Open the gate and the Lagoon are large water; The Sea is the room.
- T2 Swell: no form counts casts. T5 Heavy Swell: no form only adds damage for a move or a
  Slam. T8 Backwash: no form drags a thrown foe back.
- T11 Wide Water: no form only widens a wave or lengthens a push.
- T14 Great Wave and Three Crests' third crest both cross the room. The crest is a fan from
  her for 8; the Great Wave is one front for 24 that carries 3 u. Close: a pair to look at.
- T9 Chain Pop: the Bubble wake also lifts foes, by her ride and not by a Crash or a pop.
- T15 Lifebubble: no form saves a falling friend.
- Flood basic attack (the stream pools) and F6 Paint both draw water by pointing: Paint is
  wider and bursts.
- Flood dash (a wide wet path) and F14 Bow wave both lay a road by moving: the nearest pair
  in the style.
- Tsunami dash (the tide rolls on and pushes) and F1 Wave head: both a plain push along a
  line from her.
- Bubble tsunami and dash (bubbles for friends and for herself): section 5.
- C1 (the orb parked in the pool), C3 and C8 (the prison shot up, or whipped away): no form
  does the same. C10 (a charge on her water launches) sits beside the Sleeper: under Flood
  the Sleeper's foes are launched too.

## 8. Ideas and names that other heroes also have

Allowed by the rule; listed so the page can make them look different. Checked against
Windbriar 2.5 and Duskwing 1.2 by name; the other kits by memory of their pages.

- Swell (every fourth cast is double) and Windbriar's Tailwind (a stack for each cast): both
  count casts. The idea list left a per-cast stack out for this reason (row 39); Swell pays
  out in size, not in a stacking buff, but the two are neighbours.
- Flood's water on the floor and Mosslight's planted ground: both own the floor. Hers is
  plain water with no helper in it; combo C12 lets it water her plants.
- Tsunami Crest's timed press and Windbriar's Sweet spot.
- Tsunami Three Crests and Ashfang's Crescent 剑气 waves: both send fronts along the floor;
  hers push, his cut.
- Flood Hanging rain and Windbriar's Arrowstorm: a volley from the air. Hers hangs first.
- Flood Sleeper and Bubble's own Drift mines: both wait and burst (two styles: allowed).
- Bubble Return and Windbriar's Catch: shots go back.
- Bubble Bang and Windbriar's Interrupt.
- Bubble Decoy and Windbriar's Decoy: the same word and the same job (替身 on both).
- Bubble Faceful and Windbriar's Dust cloud, Duskwing's blind.
- Slam's wall rule is Windbriar's Wall slam, on purpose (notes N17).
"""
open('TIDECALLER_SAMENESS_AUDIT.md','w',encoding='utf-8').write(new)

# ------------------------------------------------ combos
c=open('TIDECALLER_COMBO_IDEAS.md',encoding='utf-8').read()
a=c.index("## Under each style"); b=c.index("## Notes")
head=c[:a]
h0=head[:head.index("| # | Name |")]
head="""# Tide Caller: ways her skills play together

**2026-11-21, on kit 2.0.** Design only. Twelve combos, C1 to C12, all picked by Kesh
(19 Nov; C6 changed with Sky Fall on 20 Nov). Each is one small rule between two of her
skills, or a skill and her dash or her water; none needs a talent. The rules are unchanged in
2.0; only the table "Under each style" is new.

"""+head[head.index("| # | Name |"):]
mid="""## Under each style

A combo reads the skill, whatever its form. Where a form changes what the combo can do:

| # | Flood 涨潮 | Tsunami 海啸 | Bubble 泡沫 |
|---|---|---|---|
| C1 | Paint: the orb's trail into the pool is drunk by the Drinker, and the orb circles as written | the Pick-up drops its foes into the Abyss | not while the orb sits on a friend |
| C2 | as written; the Drinker drinks the rain's pool when the rain ends | the Abyss under the Spouts: as written | Steady water under Heavy bubbles: as written |
| C3 | on dry floor both are the base: as written. On her water: a Blowout under sunk foes throws them out at once, and the Sink's 12 hits every foe in the piece | Tow: the bubble goes up on its rope | Store: the doubled pop pays out the store once, not twice |
| C4 | the Pond-hopper: up to 8 pieces in place of 6 | the Conveyor gets one more spot for each | one more Drift mine for each |
| C5 | the Lagoon's floor is her water, so the Blowout launches every foe inside, and the rain's 16 comes on top | Pinball and the Toss: as written | the Bubble fountain's first bubble goes to every friend inside |
| C6 | the Roll-up picks up the Plunge pool and its fall with it; the Bow wave carries the fall too | the first of the Three Crests takes it; the Crest does too | Faceful and the Bubble wake do |
| C7 | as written | as written | as written |
| C8 | on a sealed foe (the base prison, on dry floor): the Dunk throws it into her water, and the pop and the splash both hit the piece | the Whip wave carries the bubble along its arc; a Tow's rope is cut | Rescue on a friend is not a combo |
| C9 | the Pond-maker rides the path and bursts at its end; the whole path is 1 u wider | the Wave head follows the path's bends | the Bouncer rolls down the path, then starts its four bounces |
| C10 | the Sleeper: every foe in the piece is launched | Slam down: the foes bounce up after the Slam | the Raft: as written |
| C11 | Shared water and the Paddling pool: as written | Alley-oop and Lend a wave: as written | Hop: only the first pop starts the gift again. Reflection is spent by one skill: no combo |
| C12 | as written | as written | as written |

On a boss, a combo's launch or throw gives 20% more instead (R13); on a champion 10%.

"""
tail=c[b:]
for x,y in [("- Three combos are dead under Jet (C3, C5, C6): Jet turns those skills toward herself and\n  her stream. That is the style's trade, not a gap. None is dead under Surge or Bubble.",
             "- No combo is dead under any style (three were under Jet). Under Flood, C3 and C8 need the\n  base Water Prison, which Flood keeps on dry floor.\n- Flood gets the most from C2, C4 and C10: all three read water on the floor."),
            ("- C6 is the only way the base wall moves.","- C6 is the only way the base fall moves."),
            ("a wave wearing the wall as its crest (C6)","a wave carrying the waterfall along (C6)")]:
    assert tail.count(x)==1, x[:30]; tail=tail.replace(x,y)
open('TIDECALLER_COMBO_IDEAS.md','w',encoding='utf-8').write(head+mid+tail)
