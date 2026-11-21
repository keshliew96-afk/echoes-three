# Tide Caller ability page: notes

Page: https://claude.ai/artifact/DKPsEdrofPCkk2FJ2naMx1 (v1 19 Nov 2026; v2 19 Nov: the Wave group's Jet forms F9 to F16 rebuilt from kit 1.2 after Kesh's mark; v3 19 Nov: he meant only Breaker, so F11, F12, F14, F15, F16 Jet are back to their v1 cards; kept new: F9 Full circle, F10 Domino, F13 Ram; v4 19 Nov, kit 1.4: F11 is the new skill Call the Tide with all forms, Jet F12 Roll call, Surge F13 Sea fall, Jet F19 Raincloud, Surge F21 Tow with the throw, combo C9 on the dash's wet path; v5 19 Nov, kit 1.5: Ripple Step base, Jet Ring step, Bubble Bubble hop; v6 19 Nov, kit 1.6: Ripple Step Jet is Water double, copies drawn as see-through copies of her model; v7 19 Nov, kit 1.7: Depth Charge Jet is Torpedo (full charge, 36), Floodgate Bubble is Bubble wave; v8 19 Nov, kit 1.8: Spray Jet is Sprinkler; v9 19 Nov, kit 1.9: Rain Squall Jet is Hanging rain; v10 19 Nov: on Kesh's ask the rain first falls as the base (cloud, streaks, 1 s), then hangs; v12 19 Nov: his redo: base rain 6 s, every second three drops hang and fire 1 s later, 2 each; v13 19 Nov 23:50 SGT: Kesh "look good mark all pass": ALL PASSED, badge under the title)

## What is on it
- Base: passive Ebb and Flow, basic attack, dash, F1 to F26 (kit 1.1).
- Every skill with forms (B, D, F1 to F24) switches Base / Jet 水刀 / Surge 狂澜 / Bubble 泡沫. The passive skills F25 and F26 have no style forms.
- Combos C1 to C12 at the bottom.
- Opens in Chinese; English switch and speed are remembered per browser.

## Numbers I chose for the cards
- Surge cards show the Rolling Tide talent's Slam numbers (a wall 20, a foe 12 each), so a Slam is visible as it would play with that talent. Without it they are 10 and 6.
- Bubble cards are shot with Bubble Blower on.
- Jet B: the Pressure pips fill twice as fast on a soaked foe, as the kit says; the blade card runs 3 s through three foes at 6 each.

## Stand-ins and guesses
- Walls and pillars for Pin, Flail, Flood crest and Pinball are plain grey blocks.
- Mosslight's seeds in C12 are small sprout shapes, not her real plants.
- Whale breach (Surge F16) is a simple water whale shape.
- The water-otter decoy (Bubble F16) is a see-through copy of her own model.

## New Wave Jet cards (F9, F10, F13)
- Elites are the bigger dummies with a brown cap.

## Kit 1.4 cards (v4)
- Call the Tide cards open with her water already on the floor: an old wet path and three puddles (one under her feet), since the kit says to lay water first.
- Sea fall is shot facing up the screen so the wall's face is seen; the press comes at 2 s, so it is 4 u deep and deals 27.
- Raincloud shows one Riverbolt Crash on the foe, then "Soaked again".
- The Tow throw lands beside a second foe so the Slam shows.
- Hanging rain (kit 1.9): her stream is on a foe outside the rain for four volleys, then she stops streaming and the last two volleys go to the foe tagged Low inside the rain.

## Known limits
- Waves can read as blocks from the page's 52° camera, most in Surge F2 and the Base wave cards.
- A spoken word like "Watered" in C12 shows over her, not over the plant.
- Everything was only seen as stills in software GL (about 1 fps). Motion and feel need a look on a laptop.

## Kit 2.2 page (v36, 21 Nov)
- Flood 涨潮 stands where Jet stood: all 27 Flood cards are new (fl.js). je.js is kept in tools/ as the old Jet cards and is no longer on the page.
- Tsunami 海啸 is the old Surge with seven new or changed cards: the passive, basic attack, dash, Wave head (F1), Whip wave (F3), Three Crests growing (F10), Kick waves (F17). Bubble has two: its passive and the Bubble flail on F9.
- Cards he has not marked carry a blue New chip (NEW20 in kit20.py); the four with an open choice carry a yellow note (FLAG); the header lists the five open choices (OPEN).
- Form text for kit 2.2 lives in kit20.py (FL, and the SU and BU lines that changed); mkpage.py reads it. Older Tsunami and Bubble lines stay in FT in mkpage.py.
- Still water is drawn as flat ponds, puddles and canals; pieces that touch are shown overlapping, as one piece.
- Waves are kept low (0.3 to 0.5 u) so none reads as a wall; from the 52° camera a wide wave still shows a long back slope.
- Canal (Flood F2) uses a grey pillar for the Slam at its far end. Sink (F21) shows foes sunk to the neck by lowering the dummies.
- Kick waves: small wet marks show her trail; they are not ripples and deal nothing.
- Captions that are too long now wrap onto a second line (tc.js).
- sweep.cjs builds and steps every card of every style (122) and prints errors only; pagecheck.cjs opens the built page at desktop and phone width.
- Seen only as stills in software GL. Motion, speed and feel need a look on a laptop.

## Rebuild
Copy tools/ to a local folder, `npm i three@0.170.0` beside it for local tests, `python3 mkpage.py` writes ../site. Form text lives in FT in mkpage.py, card motion in defs.js (base), fl.js, su.js, bu.js, co.js; kit 2.2 text in kit20.py.
