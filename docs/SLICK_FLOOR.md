# Slick floor

A floor type where you and the enemies keep sliding: wet, algae-slick
flagstone in the Sunken Mill and grave frost in the Ashen Barrow. It is a
hazard placed by the room layouts, like brambles and the millrace, and it
never hurts by itself: it moves you, and the fights around it do the rest.

## What it does

- **Momentum.** On a patch a walking body keeps its momentum. Let go of the
  keys and you slide on (about 0.4 u from a walk on wet stone); turn and you
  drift the old way for a moment before the new way takes over.
- **Dodges and knockback carry.** A dodge is taken in full and then slides
  on: about 3.0 u on wet stone and 3.4 u on frost, against 1.8 u on dry
  ground. An enemy knocked back on a patch slides about twice as far.
- **Who slides.** The party (players and AI) and every ground enemy. Fliers
  (moths, wasps, crows), burrowed moles and the bosses never slip. Boss rooms
  carry no hazards, so a boss never meets one anyway.
- **Frost is slicker than wet stone** (grip 0.07 against 0.09 per tick).
- **Leaving a patch** you skid to a stop within a few steps.
- **The AI party steps carefully.** AI-played party members slide too, but
  recover two and a half times faster, so they do not glide into a
  gravefire line or a millrace surge. The Level 1 autopilot never meets a
  patch (there is none in Act I).

## Where it is

| Act | Layout | Patches |
|---|---|---|
| II, The Sunken Mill | 5 Weir | two wet patches by the south bank |
| II, The Sunken Mill | 13 Flooded Cellar | the flooded east and west ends, where every body walks in |
| III, The Ashen Barrow | 9 Moonwell | frost on both flanks |
| III, The Ashen Barrow | 14 Bell Tower | frost in the two south doorways, uphill of the fire line |

Never in Act I (so never in Level 1 or the tutorial clearing), never in a
boss or shop room. Endless Descent meets them in its Act II and III rooms.
Every patch passes `tools/gntM4b-layoutcheck.mjs` (clear of the spawn ring,
the Waystone, the party's entry spots, the dressing and the other
placements, and off the millrace lanes); grass does not grow through them.

## How it reads

The surface itself is the telegraph, in the biome palette and never in Ember
(it never hurts). One shader disc per patch, its organic edge kept on the
sim's circle:

- the surface: wet slate stones with black water joints and a teal algae
  film (Mill), or rime over dark grave earth with pale crystal cracks and
  feathered frost toward the edge (Barrow);
- a crisp light rim exactly where the slip starts;
- a steady cool glaze, plus a gloss sheen that sweeps across the patch every
  few seconds, so a still frame always shows a highlight;
- four-point star glints that wink in turn;
- low cold mist over frost, a soft glow over wet stone;
- spray at the feet of every body sliding on it (droplets on wet stone, ice
  dust and a puff of cold air on frost), heavier during a dodge, and ripples
  on wet stone while anyone moves on it.

The first time your own body stands on a patch in a fight, a one-time tip
comes up on the bottom card (not the centred card: the fight is never held)
and leaves after nine seconds or on Got it. Settings ▸ Gameplay ▸ Show tips
again brings it back with the others. The tip is in all ten languages.

The VFX lab (`?vfxlab=1`) has a **Slick floor** row: Wet stone and Grave
frost lay a patch under the party with two boars charging across it; Flooded
Cellar and Bell Tower place the layout's own patches in the live room.

## How it works

- `src/sim/hazards.js` spawns the `slip` hazard (r, skin) and installs the
  live patches into the movement module every tick
  (`movement.setSlipPatches`). A room without a patch never writes the list.
- `src/sim/movement.js slipFollow(e, x0, z0)` is the one rule: after a body's
  own motion for the tick, its momentum (`slipVx`/`slipVz`, u per tick)
  eases toward the step it took by the patch's grip, the difference is
  walked (walls and blockers stay solid), and what the body actually
  travelled becomes its momentum. A dash or knockback is taken whole. A move
  faster than 0.4 u per tick is a reposition and carries no momentum.
- `src/sim/world.js` runs the rule after knockback for every walking body.
  Human seats run it per input frame inside their own step
  (`src/sim/remote.js stepHumanMove`), the step a co-op guest's predictor
  replays, so the guest slides on exactly what the host computes.
- Pure data, no RNG: patches come from the layout table, so host and guests
  see the same floor and the nine golden traces are unchanged (Act I only,
  and the slip list stays out of the save tree while empty).

## Co-op

The patches are hazard entities, so they ride the snapshot like every other
hazard; the slip list rides the movement block of the save tree, so a guest's
own-seat predictor (`src/net/reconcile.js`) has it too and its body's
momentum comes from the host in each snapshot. The render-ahead step uses the
slide, not the raw key.

## Checks

- `node tools/slickfloor-probe.mjs` (headless): stop, turn, dodge (wet and
  frost), knockback, a boar, a moth, a human seat's step, the layout table
  and a Level 3 campaign room that rolls a slick layout.
- `node tools/slickfloor-browser.mjs [--lang de]` (dev server on 5199): the
  Weir and the Moonwell draw their patches, the tip, the slide and the dodge
  in the page, screenshots.
- `node tools/slickfloor-net.mjs` (dev server on 5199): a co-op guest holds
  the same patches, the same slip list and draws them.
- `node tools/gntM2-goldens.mjs`: the nine golden traces, unchanged.
