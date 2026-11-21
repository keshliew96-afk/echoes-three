# Windbriar ability page: motion detail pass (version 7, 2026-11-18)

Kesh's ask (2026-11-18): "do audit and review to insanely fill in motion details with extreme quality".

## How the audit was done

`tools/audit.html` with `tools/audit.cjs` builds every card (28 base, 78 style forms, 12 combos) and measures, at 60 Hz:
planted paws that move (skate), anything under the floor, the fastest one-frame jump of her hips, root keys out of time order,
the fastest turn between two root keys, and how far her paws or bow are from a dummy at the moment a close hit lands.
Run it with the page folder served on port 8123: `node audit.cjs out.json`.

## Found and fixed

- Flips squeezed into one or two frames. Root keys are sorted by time and filled forward, so a key written out of order
  cut a jump short and packed a full flip into 0.06 s: base F18 Vault Shot, Deadeye F18, Gale F2, Gale F11, combo C10
  (seen as a teleport), combo C11 (60 degrees in one frame). They are now one arc with the flip inside it (`rk` in defs.js).
  The vault flips early, so the arrow leaves while she is upright.
- Gale F19: the second flip kick turned forward and then back again. It now turns the same way twice.
- F6 Killshot: a 60 degree snap in one frame before the second shot is now a turn of 0.2 s.
- Gale F22: the point-blank arrow knocked the dummy 2.6 u away, so the third strike and the rising kick hit air. The dummy stays.
- Gale F20: the pulled dummies landed on one spot. They now fan out in front of her.
- Gale F4: she turned away from the foe she had thrown. She now turns to it, and it lies on the floor.
- Reach: base F19 and F21 dummies stood 1.0 to 1.5 u from her paws at the hit. Now 0.7 to 0.95 u.
- Under the floor: a tilted spin or a low flip could put a paw, a hand or her head under it (worst 0.26 u, Gale F9).
  The engine now lifts her by what is missing, eased in and out.
- Turns and steps on planted paws (F5, F19, F20, F22, Volley F12, Gale Arrow, Gale basic, Gale F1 to F4): a small hop is laid over them (`hops` in a card).

## Added to every card (engine, wb.js)

- Ears and tail follow the page's own travel, spins and flips (springs at 240 Hz): ears lay back on a start, flop forward on a stop, splay in a spin.
- A stretch off the floor and a squash with one rebound on landing; dust under her landings, scaled by the fall.
- Hit pause: when a paw or the bow really lands on a dummy, the whole card nearly stops for 0.055 s (0.085 s on a heavy hit).
- A glint where a blow or an arrow lands. Arrows shot at a dummy stay in it for 1.1 s, shiver, and ride with it.
- Dummies squash on a hit, kick up dust where they land and along a hard shove, and can be tripped or thrown flat (`A.down`).

## New body clips (bake/new/40_gale.mjs), Gale only

gMule (both hind paws straight back), gAxe, gKnee, gSweepLow, gRound, gRise, gWind (breakdance windmill, a loop),
gWindKick, gKip (kip-up), gHip and gHipRun (hip shot loops), gHook (bow over the neck), gStamp, gPush, gDrill, gSpring.
Used by Gale basic, F1 to F9, F11 to F13, F18, F20, F22, F23.

- F7 Eagle Stance: she is on her back the whole time now, legs in a V; the kick is both legs laid flat and whipped round the ring; she kips up at the end.

## Not fixed

- The walk cards (Gale F10, F14) still slide. The run was replaced in version 8 (below).
- Her legs are short and have no knee, so kicks read mostly from her whole body's move.
- Seen only as still frames in software rendering; timing and feel need his laptop.

## Version 8: bounding run (Kesh's "then change it")

- New run clip (bake/new/50_run.mjs): a 0.36 s bound, paws on the floor for 0.108 s, both hind legs together, a 0.11 hop. On the floor the paw's backward speed is constant, so it can match her travel.
- The page measures the clip's grip (4.39 u per clip second) and plays run loops at her travel speed; a puff of dust at each landing.
- gHipRun (Gale F5) rebuilt on the bound: three snap shots per bound.
- Circle headings were mirrored on F23, C12, Gale F5 and F10 since version 1; fixed. F17's turn was mirrored and ended in a 3 u glide back; fixed with a hop turn.
- Result: stance paw 0.5 to 0.8 u/s against 4.2 u/s of travel; the audit lists a skate only on the run's first and last frame (F23, C12, Gale F5).
- The earlier "grip 0.55 u/s" figure was a wrong measurement; see NOTES.md.
