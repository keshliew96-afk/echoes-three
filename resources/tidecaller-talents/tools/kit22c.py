import re
exec(open('kit22.py').read().split("K, N, IA, CO, SA, RL")[0])
K, N, IA, RL = 'TIDECALLER_KIT.md', 'TIDECALLER_NOTES.md', 'TIDECALLER_INTERACTION_AUDIT.md', 'TIDECALLER_REVIEW_LOG.md'
rep(IA, "Return's shots, Overflow's half, a full cast's roll-on", "Return's shots, Overflow's half")
rep(IA, "Tide on tide: the second step (22) needs a cast within 6 s of the last;", "Tide on tide: the second step (22) needs a cast within 9 s of the last;")
rep(IA, "Kick waves: a wave for each landing, back along the step she has just made.", "Kick waves: one wave when she stops stepping, from where she stands, back along the steps she made; sized by the steps taken.")
rep(IA, "Each rim is 1 u wide round every piece, 6 s, one part for each cast", "Each rim is 1 u wide round every piece, 9 s, one part for each cast")
rep(IA, "A piece surges once in 3 s: 16, and every part of the new piece is topped up to its laid time.", "A piece surges once in 3 s: 16, and every part of the new piece is topped up 2 s, never above the time it was laid with.")
rep(IA, "Always five: one to each separate piece within 8 u, nearest first; the rest to the nearest foes outside the dome within 8 u, a foe once, each ending in a 1.2 u puddle. With fewer than five targets, fewer canals. All five", "Up to five: one to each separate piece within 8 u, nearest first; the rest to the nearest foes outside the dome within 8 u, a foe once, each ending in a 1.2 u puddle. All of them")
rep(IA, "3.5 s at most (28 within 2.9 u).", "3.5 s at most (14 within 2 u, to 28 within 3.4 u); this takes the place of the base's \"twice as wide in her own water\".")
rep(IA, "Kick waves is one wave, at the last landing, sized by the steps taken (1, 2 or 3); a step cancelled by a hold kicks at once", "Kick waves is one wave, from where she stands when she stops stepping (the third landing, or the 3 s running out), sized by the steps taken (1, 2 or 3)")
rep(K, "the new piece surges: 16 to every foe in it, and all of it lasts as long as when it was laid", "the new piece surges: 16 to every foe in it, and all of it lasts 2 s longer")
rep(N, "the new piece surges: 16 to every foe standing in it, soaks, and every part of the new piece is topped up to the time it was laid with.", "the new piece surges: 16 to every foe standing in it, soaks, and every\n  part of the new piece is topped up 2 s, never above the time it was laid with.")
rep(N, "under 1.3 s; the Blowout's is 0.8 s for every foe.", "under 1.3 s, but for the base Geyser's 1.6 s on a soaked foe; the Blowout's is 0.8 s for every foe.")
rep(N, "- **Sizes.** \"Wide\" is across. \"Within\" and \"out to\" are from the centre.", "- **Sizes.** \"Wide\" is across. \"Within\", \"out to\" and \"farther out\" are from the centre.")
r = T.setdefault(RL, rd(RL)).rstrip('\n') + """

**Round 3: one fresh critic, the changed items only, must-fixes only.** Eight found, all taken.
1. Three audit rows were stale (G21, G37, G66).
2. Tide on tide's rim dried in the same instant the second tide broke, so the edge never crept.
   The rim lasts 9 s.
3. Meeting Waters topped a piece up to full every 3 s: water for ever again. It tops up 2 s.
4. The Porpoise's full splash was narrower than the base breach in her own water. It starts at
   2 u and reaches 3.4 u, and takes the place of that base line.
5. "Wider" was used for a radius in the Drain and the Porpoise. Now "farther out".
6. The launch line forgot the base Geyser's 1.6 s.
7. Four small contradictions (the Lagoon's "always five", its 8 s, the Whip wave's "under its
   tip", where a timed-out Kick wave starts).
8. The Stir's motion twisted the staff with fingers that do not close. Her trunk walks it round.
Checked and clean by that critic: every other changed form, T2, T13, the height cap, and that
no changed form heals, moves a friend, moves or holds a boss, or misses Soaked.

**The loop stops here** (three rounds, the cap set at the start). Not judged again after the
round 3 fixes. Left for his eye: Shared water (the weakest Flood form), and two near-repeats
the last critic let pass: Open the gate's slap back beside the Plunge pool's drop, and the
Porpoise's leap beside the Tsunami Leap.
"""
T[RL] = r
[wr(f, s) for f, s in T.items()]; print('ok')
