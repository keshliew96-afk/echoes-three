import re
def rd(f): return open(f,encoding='utf-8').read()
def wr(f,s): open(f,'w',encoding='utf-8').write(s)
# sameness: hedge
s=rd('TIDECALLER_SAMENESS_AUDIT.md')
a="- Tsunami Three Crests and Ashfang's Crescent 剑气 waves: both send fronts along the floor;\n  hers push, his cut."
assert s.count(a)==1
s=s.replace(a,"- Tsunami Three Crests and Ashfang's Crescent 剑气 style, as I recall it (not re-read): both\n  send fronts out from the hero; hers push, his cut.")
wr('TIDECALLER_SAMENESS_AUDIT.md',s)

# ------------------------------------------------ interaction audit
t=rd('TIDECALLER_INTERACTION_AUDIT.md')
def rep(a,b):
    global t
    assert t.count(a)==1,(a[:50],t.count(a)); t=t.replace(a,b)
def row(g, text):   # replace or delete a table row by its G number
    global t
    m=re.search(r'(?m)^\| %s \|.*\n' % g, t); assert m, g
    t=t[:m.start()]+(text+'\n' if text else '')+t[m.end():]
rep("**2026-11-19, on kit 1.9.** Design only. What happens when her rules meet each other, the other\nheroes, bosses and the damage formula v1.2. Kesh closed all four picks on 19 Nov; the rest are closed here.",
    "**2026-11-21, on kit 2.0.** Design only. What happens when her rules meet each other, the other\nheroes, bosses and the damage formula v1.2. Kesh closed all four picks on 19 Nov; the rest are closed here.\nRows G69 on are new in 2.0 (Flood, Tsunami); rows that were only about Jet are gone. My own read only.")
rep("Water Prison and her style's own holds (Surge: the\n  Abyss, the Tow, the Vice; Bubble: the Bubble wave, the Bubble wake)",
    "Water Prison and her style's own holds (Flood: the\n  Sink, the Pond clap's carry; Tsunami: the Abyss, the Tow, the Pick-up; Bubble: the Bubble wave,\n  the Bubble wake, the Bubble flail)")
rep("- **A3. Surge moves the pack away from her friends.**","- **A3. Tsunami (then Surge) moves the pack away from her friends.**")
for g in ('G4','G5','G25','G31','G32','G33','G34','G35','G38','G45','G47','G61','G62','G63','G64','G68'): row(g,'')
row('G2',"| G2 | A Crash skill that hits a foe several times (Floodgate, Three Crests) | Only one hit on each foe is a Crash: Floodgate's first, Three Crests' third |")
row('G9',"| G9 | Slam | Notes N17, one rule: a wall or pillar 10 and a stun; foe on foe 6 to both; a foe once a second; never from the rain itself (the Spouts' drop is a throw). Walls: room walls, pillars, Stonehide's slab and Stone Ring, the Pinball dome's skin, the floor under Slam down. Her Sky Fall is not a wall |")
row('G17',"| G17 | Where her moves end | A ride, step, dive, Leap, Water walk, Porpoise or Water door never ends on a floor warning or bed: she lands on the nearest clear spot |")
row('G18',"| G18 | What stops shots | Flying shots only, never beams, floor warnings or blows: Sky Fall, for shots that fly into the fall. The Tidal Dome and its forms stop nothing; they cut or take damage |")
row('G20',"| G20 | Water Prison on a champion or boss | Not sealed: the bubble pops at once (10% and 20% more, R13). Store sticks on it and works without the seal; the Sink does not sink it (notes, section 10) |")
row('G21',"| G21 | Return's shots, Overflow's half, a full cast's roll-on | 附加伤害: not hits; they never Crash, spread again or count for the Great Wave |")
row('G24',"| G24 | The Great Wave's count (T14) | Casts that crashed at least one soaked foe, not foes. Its own wave is not a Crash, and the tsunami is not a cast. A full Swell does not double it |")
row('G27',"| G27 | The 20% on a boss, the 10% on a champion (R13), Heavy Swell (T5), Deep Water (T4) and a full Swell's 30% | All are 增伤区 and add |")
row('G37',"| G37 | Call the Tide (F11) | It rises from every piece of her water (G69) and from the floor within 2 u of her. A foe is hit once a cast. The base wave does not move a foe, so it never Slams. Its 2 s adds to Deep Breath's 30%. Tide on tide: the rise is kept while casts are within 6 s of each other; it is read at the cast. Gathering tide's throws slide, Slam and can start Backwash. Bubbling up is a hold (R10) |")
row('G43',"| G43 | Depth Charge's hold under its forms | Slam down has no hold. The Sleeper and the Raft keep the base's hold and lob |")
row('G44',"| G44 | Whole-body skills | Floodgate, Maelstrom, Tidal Dome, Wave Rider, Otter Dive, Ripple Step and the dash pause the stream and keep its count |")
row('G52',"| G52 | Wide Water (T11) and fixed paths | The 40% lengthens pushes, pulls and throws. It does not move the Conveyor's spots, the Tow's rope, the Round-up, a Spout's drop, the Whip wave's arc or the Pond clap's slide |")
row('G55',"| G55 | The slide 滑 | A soaked small foe is pushed, pulled and thrown 50% farther, an elite or champion 25%. Carries and fixed paths do not stretch (G52). It adds with Wide Water. The soak is read when the move starts |")
row('G65',"| G65 | Hanging rain (Flood Rain Squall; his design, 19 Nov; moved from Jet by his pick 2a) | The rain is the base rain in every way (her water, C2, C4, C10). The needles come from above and cannot be blocked. The target is read when the drops fire: the foe her stream is on then; stream off, the foe with the least health within 8 u of her (a tie: the nearest). The last volley fires as the rain ends. A volley on a foe in her water spreads by Overflow, once a second. The pool it leaves is still water, 6 s |")
row('G66',"| G66 | Ripple Step | Steps not used within 3 s are lost. A step stops at a wall and lands on the nearest clear spot (G17). Water walk: the long step is one step of the three; it ends at the piece's edge or at 8 u. Kick waves: a wave for each landing, aimed when she lands. Bubble hop: a foe is lifted once a cast and it is a hold (R10); a friend gets one bubble a cast; she can bounce on a boss, which is soaked |")
rep("| G40 | Tow | The bubble follows her through her dash and her moves. It cannot be dragged into a pit or a floor bed: it pops at the edge. The second press is a throw: Rolling Tide and the slide lengthen it,",
    "| G40 | Tow | The bubble follows her through her dash and her moves. It cannot be dragged into a pit or a floor bed: it pops at the edge. The second press is a throw: Wide Water and the slide lengthen it,")
rep("The trip is a carry with a fixed end (the line's end as it was when the foe was sealed): Rolling Tide and the slide do not lengthen it;","The trip is a carry with a fixed end (the line's end as it was when the foe was sealed): Wide Water and the slide do not lengthen it;")
new_rows = """| G69 | One piece of her water | Water that touches is one piece. Each part keeps its own time; when a part dries the piece can fall apart. A foe is "in" the piece it stands on. At most 12 parts of still water lie at once; the oldest dries first. The rain, the Whirlpool and the dome are parts like any other |
| G70 | Overflow (T1) | Half of the hit as it was dealt to the foe that was hit, so Deep Water and a Crash's 60% are not counted twice. One spread a foe a cast, the largest. Zone ticks never spread; a lasting skill spreads once a second. The stream never spreads |
| G71 | Flood's Crash puddle (R5) | One puddle for each foe a cast crashed, 1.2 u, 4 s, still water. They count toward the 12 parts. A foe already standing in her water gets none |
| G72 | Swell and the full cast (T2) | One Swell a skill cast, at the press. The basic attack, the dash, a second press and Ripple Step's later steps add none. A full cast doubles sizes, never times or counts; all three steps or all three crests of one cast are full. A held skill (Tide Orb, Depth Charge) is full from its press. On a friend skill it doubles the bubble or the gift's time. Nothing else reads Swell |
| G73 | The Sea (T13) | Counts skill casts, as Swell does; the two counts are separate. For its 6 s the whole floor is one piece of still water; pits and floor beds are not water. Her other water goes on under it. Meeting Waters does not fire when it comes or goes. A Drain ends it |
| G74 | Meeting Waters (T7) | Fires when two pieces that were apart become one. Once a second for the room; the same two pieces once every 3 s (a Paddling pool walking in and out). Water laid on water is not a joining |
| G75 | Water that moves | The Roll-up, the Pond clap, the Drain and the Drinker take still water, puddles, ponds, canals and the wet path. They never take the rain, the dome, The Sea, or a Whirlpool (the Drinker is one). Moved water keeps the time it had left. A Sleeper waiting in moved water goes with it |
| G76 | Dunk (Flood Water Whip) | The throw is a throw: the slide and Slam apply, and a foe thrown onto others in the pond Slams them. The splash is one hit a foe. A boss is not thrown; if it stands in her water the splash goes out from it |
| G77 | Sleeper (Flood Depth Charge) | One waits at a time: a second cast into any of her water sets the first off. If its water dries it goes off as the base burst. It reads the piece as it is when it goes off |
| G78 | Drain (Flood Maelstrom) | Pieces are counted at the cast, up to 5. The rain, the dome and a Whirlpool stay where they are and do not count. The drag is a pull that ends: foes can Slam on each other at her feet (R9). Call the Tide after a Drain has only the floor round her |
| G79 | A friend and her water (Paddling pool, Shared water) | The pool under a friend is her water for every rule, and joins and leaves pieces as the friend walks (G74). Shared water's 30% is her damage, read from the friend's hit as dealt; it is 附加伤害 and never spreads again |
| G80 | Sink (Flood Water Prison) | A hold (R10): its cap and the 2 s free apply to each foe. Sunk foes can be hit by everyone. A champion or boss is not sunk: the 12 at once. On dry floor it is the base bubble |
| G81 | Bubble flail (Bubble Breaker; his design, 20 Nov; moved from Jet by his pick 1a) | The foe in the bubble is held (R10) and afloat (T3: 20% more). Each slam's ring is one hit; the third pops the bubble: its Crash, T3's 6, then the soak. Her stream is not paused. With the stream off it takes the foe nearest the pointer. A champion or boss is not caught: the rings go out from where it stands |
| G82 | Three Crests (Tsunami Crashing Wave; his pick, 20 Nov) | A foe in all three is pushed three times and can Slam once a second. The third is the Crash, so the soak holds through the slides. New in 2.0: the crests grow (2.2 u, 4 u, the far wall); under a full Swell the first two double |
| G83 | Sky Fall (F13) and its forms | The fall stops flying shots that enter it. Wide Water widens it. Pressing drops it; not pressed, it runs dry at 4 s with no hit. Plunge pool: the pool is still water and can be moved or drunk once the fall has ended. Ring out's ring is a throw. C6: a wave through it carries the fall |
| G84 | Whip wave, Kick waves, Wave head (Tsunami) | The Whip wave's carry has a fixed arc: no slide; the heap can Slam (R9); Backwash never follows it. Kick waves and the Wave head push: the slide and Wide Water apply |
| G85 | Porpoise and Water walk (Flood) | Both read the water under her as she goes. In The Sea a Water walk is 8 u. A Porpoise leaves her water: she stays under as the base for what is left of the swim |
"""
i=t.index("| G60 | A form and the base's tags"); t=t[:i]+new_rows+t[i:]
a=t.index("## How she meets the other heroes")
t=t[:a]+"""## How she meets the other heroes

- Windbriar: her arrows deal 30% more to foes Rill lifts or launches, and her Spike works on
  them. Windbriar's kicks can Slam foes into the Pinball dome's skin.
- Stonehide: his slab and Stone Ring are walls for her Slam. Bubbles can go on him; he has no
  shield of his own. The Decoy never takes his taunt (G36). He is the best carrier for a
  Paddling pool: the pack stands round him.
- Mosslight: no shields of her own, so bubbles fill that gap. Rill's water can water her plants
  (combo C12); a Flood room waters all of them, once each, by Mosslight's rule.
- Ashfang: he fights in the pack she moves (A3). A pack spat out by the Abyss, swept in by
  the Round-up or heaped by the Whip wave is one place for his blade.
- Duskwing: Air bite works on foes she lifts; a foe afloat is a backstab from any side (G10).

## To measure first when it is built

- Her damage on a lone boss in each style, now that Jet is gone (notes N81, N114).
- Overflow with Deep Water on a pack in one piece; The Sea with Overflow for its 6 s.
- How much of a room is her water after 10 s under Flood, and whether the 12-part cap is felt.
- How often a full Swell lands on a skill worth doubling; Three Crests under a full Swell.
- The slide with Wide Water (90% farther); drenched foes under three Crash skills.
- Slam damage with Heavy Swell's double in a room with many pillars.
- How much of a fight a small foe spends held (A2).
- T3's 20% on afloat foes for a team of four; the Bubble flail's three rings in a pack.
- Reflection on each hero's big skill (his pick: allowed).
- Store on an elite with four heroes hitting it.
- Call the Tide every 5 s (Tide on tide) in a room full of her water.
"""
wr('TIDECALLER_INTERACTION_AUDIT.md',t)

# ------------------------------------------------ idea list
s=rd('TIDECALLER_IDEA_LIST.md')
a="How it was checked: web search only (20 searches)."
assert s.count(a)==1
s=s.replace(a,"""**Kit 2.0, 21 Nov.** Jet is gone and Surge is Tsunami. No new web search was made for 2.0:
the Flood forms come from her own rules (her water, Call the Tide, Home Waters), not from
other games. Rows below still say "Jet" or "Surge" as they did when the idea was taken:
- A row that names a **Jet** form: that form is gone with the style. Two live on: the Hanging
  rain (now Flood's Rain Squall) and the Bubble flail (now Bubble's Breaker).
- A row that names a **Surge** form: read "Tsunami". Gone since: the whale (row 10, 17, 54:
  the Fall slam stands there), Overhead, the Sea fall, the Cradle (row 63), the Flail, the
  Swap; and row 23's Guard bubbles (the Bubble flail stands there).
- Row 39 (a stack for each cast) was left for Windbriar's Tailwind. Swell (T2) counts casts
  too; it pays in size on the fourth, not in a stacking buff.

"""+a)
wr('TIDECALLER_IDEA_LIST.md',s)

# ------------------------------------------------ review log
r=rd('TIDECALLER_REVIEW_LOG.md')
r=r.rstrip('\n')+"""

## 20 Nov: changes on the page by the VFX thread (his picks)

No walls anywhere; F13 Tidal Wall became Sky Fall 天落; Surge's Crashing Wave became Three
Crests; Slam down, the Flood crest, the Vice and Maelstrom's Surge form (the Fall slam) were
re-shaped; Jet's Breaker became his Bubble flail. All passed by his eye on page v35. They are
in the kit and, since 2.0, in the notes.

## Kit 2.0: Flood and Tsunami beside Bubble, 21 Nov (not judged)

His words, 20 Nov 16:37 UTC: "for tide caller, help me think the play style, for bubble
style is good, can keep, but as a mage and sea and water element design character, i
expecting tide caller is a massive aoe mage. you help think and list down the style and let
me pick".

I listed five styles: Tsunami, Flood, Storm, Maelstrom, Tide (my pick: Tsunami and Storm).
He answered "1 and 3", then "wait, sorry i typo, i mean 1 and 2": Tsunami and Flood. On his
two own designs that were Jet forms he answered "1a, 2a": the Bubble flail moves to Bubble's
Breaker, the Hanging rain to Flood's Rain Squall with standing water.

What was made:
- Flood 涨潮: 24 forms, the rule of one piece of water, five talents (Overflow, Deep Water,
  Meeting Waters, Floodplain, The Sea), a basic attack that pools and a wide wet path.
- Tsunami 海啸: Surge's forms as they stood on 20 Nov; three new ones where Surge worked on
  one foe (Wave head, Whip wave, Kick waves); Three Crests grows; Swell as the style rule.
- Bubble: only Breaker changed.

What I am not sure of, for his eye on the page:
- The Swap was a form he had kept ("The Swap stays", 19 Nov). I took it out for Kick waves
  because it works on one foe. It is the first to give back.
- Tide on tide and the Lagoon only change numbers (sameness audit, section 5).
- Flood has three forms that draw a line of water and five that hit a whole piece.
- She has no boss path now. Her damage on a lone boss is the first thing to measure.
- His earlier Jet marks threw out zones that only sat there. Flood is water that sits, so
  each Flood form was given something it does with the water; whether that is enough is his
  call.

No fresh judge read kit 2.0. The scores above are for kits 1.0 and 1.1 only.
"""
wr('TIDECALLER_REVIEW_LOG.md',r+"\n")
