# Balance pass (v0.5.224, 2026-10-05)

Three items from the project's own measurements: the Archer past Depth 3 of
the Endless Descent, Level 1 with relics on, and Open Grave's enemy mix. Every
number below is the headless default-build autopilot (the Healer autopilot plus
the §25.8 ally AI), same seeds before and after. "Before" is `gauntlet` at
a5bc5a7 (v0.5.223), measured with `--root` on a checkout of it.

## 1. The Archer past Depth 3

**Cause.** In the PR #10 runs the Archer took half of all party downs past
Depth 3. Tracing every down (attacker, shape, distance) showed the Mire Toad's
lobbed glob was the last hit on half of them: an AI seat in its stand-off
spot stood still under the 1-second landing ring, and once the depth scaling
lifts a glob to 60+ damage, two of them drop an 80 HP body. The stand-off rule
also only ever closed distance, so the Archer never backed off a boar or a
mole that reached it.

**Change** (only while the engagement rules are on, i.e. live runs, never the
`?room=` harness or the legacy goldens):
- `AI_EVADE` (data/classes.js, sim/allies.js `evadeGoal`): a ranged AI seat
  inside an in-flight glob ring (Toad, Thornmother, Lich Ram graves) walks out
  past its edge, turning in 45° steps when the leash ring blocks the straight
  way out, still aiming at its target. Melee seats hold their ground: with
  them dodging too, five-Toad rooms dragged on past the stuck limit and the
  descent got much easier (median 8 depths) without spreading the downs.
- `AI_KITE`: a ranged AI seat backs off a hostile inside 1.6 u, to 2.8 u.
- `DEPTH_STEP` (data/endless.js): HP .18 -> .21 and damage .10 -> .12 per
  depth past 4, so the smarter Archer does not make the deep descent easier.

**Numbers** (`tools/endless-run.mjs`, the runner with a per-down trace):

| seeds 1-32 | before | after |
| --- | --- | --- |
| down share past Depth 3, Healer / Tank / Swordsman / Archer | 4 / 9 / 38 / **49** % | 6 / 12 / 49 / **33** % |
| first member down in a room past Depth 3 is the Archer | 56 % | 32 % |
| Toad globs aimed at the Archer that land on it (Level 2, seeds 1-16) | 177 of 295 | 2 of 340 |
| median depths cleared | 6 | 6 |
| deepest | 11 (2 runs) | 10 (1 run) |

| depth | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| before, reached / cleared | 31/22 | 22/21 | 21/19 | 19/16 | 16/15 | 15/11 | 11/6 | 6/4 | 4/2 |
| after, reached / cleared | 32/23 | 23/23 | 23/20 | 20/16 | 16/13 | 13/10 | 10/3 | 3/1 | 1/0 |

On PR #10's own seeds 1-16 the Archer's share past Depth 3 goes 50 % -> 31 %.
The Swordsman, the other light body and the one in front, now takes the
largest share; letting it dodge globs too did not even the split (46 / 37 %)
and made the descent far easier, so it stays as is.

## 2. Level 1 with relics on

docs/RELICS.md recorded Level 1 losses rising from 1 of 16 to 4 of 16 seeds
once relics were in, all at the Hollow Stag. That was measured on the relics
branch (d71518d) while the Level 1 Stag still hit at x4.0; PR #4 set it to
x2.1 before the relics merged. Re-measured (`gntCAMPAIGN-camprun --stop-after
1`, new `--relics 0` switch for the A/B):

| Level 1 | relics on | relics off |
| --- | --- | --- |
| d71518d (Stag x4.0), seeds 1-16, cleared | 12 / 16 | 15 / 16 |
| gauntlet a5bc5a7, seeds 1-40, cleared / HP dip | 40 / 40, 18 dips | 40 / 40, 22 dips |
| this pass, seeds 1-40, cleared / HP dip | 40 / 40, 21 dips | 40 / 40, 17 dips |

The losses are gone on `gauntlet` already, so nothing in the relics, the
curses or the Stag changed. Kesh's Level 1 rule (an HP dip below 35 % on at
least as many of seeds 1-40 as v0.5.150, which had 7) holds: 21 of 40.

## 3. Open Grave's enemy mix

The CONTENT_PLAN hook was "moles and broods favoured"; PR #6 left the roster
alone because the layout rolls after the wave schedule. Layouts may now carry
a `mix` (data/layouts.js): after the layout roll, `waves.favourRoster`
retypes part of the rolled schedule with no random draw (like the spawn ring
relocation), and the save carries the result. Open Grave's: every second unit
of threat 2 or less that is not already one becomes a Grave Mole, a Grave
Mole, then a Brood Spider, in turn (only types the room has introduced); Rams
and Knights stay.

| Level 3, seeds 1-16 (`tools/balance-pass.mjs`) | before | after |
| --- | --- | --- |
| moles + broods among Open Grave's units | 28 % | 58 % |
| the same on the other Barrow layouts | 34 % | 35 % |
| Open Grave party damage per room / downs per room | 791 / 0.9 | 973 / 1.5 |

A strict every-other Mole / Brood split took Level 3 clears from 31 to 25 of
48 seeds; the Mole-heavy turn keeps them level (below).

## Stalls fixed on the way

Each of these left a room live forever (the runners' 180 s stuck rule):
- **Bog Lamprey**: it lurks on the nearest millrace point, and a race point
  outside its 2.0-4.6 u lunge band left it waiting, unhittable, while the
  party had nothing to hit. It now skips such a point.
- **Grave Wisp ward**: all three AI seats kept attacking a warded (immune)
  enemy. A seat's target now looks past a warded hostile to the nearest one
  it can hurt.
- **Bone Knight**: its shield only drops to swing, and a room of cawing Crows
  could hold the telegraph governor so it never swung. A Knight held back for
  4 s now swings anyway.

## Whole-campaign checks (same seeds before and after)

| check | before | after |
| --- | --- | --- |
| goldens (`tools/gntM2-goldens.mjs`) | 9 / 9 | 9 / 9 |
| Act I autopilot (`gnt-M4a-actrun --act 1 --seeds 1-16`) | 16 / 16 | 16 / 16 |
| Level 2 from its start, seeds 1-48, cleared | 48 / 48 | 47 / 48 |
| Level 3 from its start, seeds 1-48, cleared | 31 / 48 | 33 / 48 |
| `tools/gntPARTY-band.mjs` (5 seeds against v0.5.150) | 12 / 18 | 9 / 18 |

The band tool was already failing on `gauntlet` (content slices 1 and 2
changed Levels 2 and 3 since the v0.5.150 baseline). Its three new misses are
Level 2 and Level 3 rooms costing the party less damage on 5 seeds, the
Archer no longer eating Toad globs; Level 1's own gate (d) passes.

## Tools

- `node tools/balance-pass.mjs [--seeds 1-16] [--root dir]`: Toad globs aimed
  at AI seats and how many land (Level 2), Open Grave's mix, damage and downs
  against the other layouts (Level 3), and a replay hash.
- `node tools/endless-run.mjs --seeds 1-32 [--root dir]`: the depth curve and
  down shares.
- `node tools/gntCAMPAIGN-camprun.mjs --from 1 --seeds 1-40 --stop-after 1
  [--relics 0]`: Level 1 with relics on or off.
