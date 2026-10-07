# Elite affixes

Content plan 2, slice 3 (v0.5.235). In a campaign, every elite carries one
or two named **powers** from a set of eight. The powers show as chips on a
plate above the elite, each with its own colour, aura and sound, and the two
that hurt (Molten and Frozen) warn with the usual red (Ember) ring first.

## Where they roll

- Campaign wave rooms (kill and defend), Endless included, and the trapped
  chest's ambush. Never the boss room (its adds), the tutorial, the legacy
  single-level run or the `?room=` harness, so the nine goldens never see one.
- How many: **one** on Level I; on Level II one in rooms 1 to 3 and **two**
  from room 4; **two** on Level III and at every Endless depth.
- Which: a hash of the run seed, the level, the room and the elite's spawn
  ordinal (no gameplay RNG draws), so a seed replays the same powers. Molten
  and Frozen never share an elite, and a few kinds skip powers that would
  break them (the table below).
- Elites are as common as before (`data/difficulty.js`); the powers are what
  make them harder.

## The eight

| Power | What it does | Warning | Not on |
|---|---|---|---|
| Molten | Dies into a molten core. Once the §11 governor allows, the core swells for 1.0 s and bursts (14 x its damage multiplier, radius 1.7), leaving a burning pool (radius 1.3, 4 s, 3 damage every 0.5 s). A core that waits 3 s with no slot fizzles. | Ember ring over the core | |
| Frozen | When a party body is within 3 u: roots itself and charges a nova for 1.0 s (radius 2.4, 6 damage); the burst leaves a frost patch that slows 45% for 1.5 s. Every 6 s. | Ember ring around it, ice pulling in | Grave Wisp |
| Vampiric | Heals for 40% of the damage it deals. | Crimson heartbeat aura, blood threads | Grave Wisp |
| Warded | A gold rune shell flickers for 0.75 s, then makes it immune for 2.5 s (the Grave Wisp's `hit_immune`), then rests 4.25 s. | Flickering shell, chip lights up | |
| Blinking | Every 5.5 s, when its target is 3.2 u away or more: marks a clear spot beside the target for 0.7 s, then blinks there. No damage of its own. | Ember ring at the spot, cobalt glow | Grave Mole, Bog Lamprey, Grave Wisp |
| Splitting | Splits into two smaller plain copies when it dies (40% of its base HP, 70% damage, x0.78 size). | Seam aura | Brood Spider, Broodling, Bone Knight, Bog Lamprey, Grave Wisp |
| Hasted | Moves 40% faster (telegraph timings are untouched). | Yellow chevrons, spark wake | |
| Thorned | A party hit from within 2.6 u stings the striker for 20% of it (at most 8). Ranged bolts are safe. | Bone thorns, flare on a sting | Grave Wisp |

Every number lives in `AFFIX_RULES` in `src/sim/affixes.js`.

## Fairness

- Molten and Frozen bursts are player-targeted telegraphs and go through the
  §11 governor (two at most, starts 1.2 s apart), like every other attack.
  Short Fuse shortens them like the rest.
- The Blinking mark does no damage, so it does not take a governor slot.
- The AI seats step out of a Molten or Frozen ring before it lands (ranged
  seats already left toad rings; melee seats now leave these two as well),
  and look past a Warded elite while its ward holds, as they do for a
  wisp-warded one. The autopilot dodges the rings like any telegraph.

## Co-op and saves

All of it is plain data on entities (`affixes`, `affixSpeed`, the ward and
blink clocks, the `affix_core` body), so host snapshots and save files carry
it with no protocol change. Guests draw the plates and auras from the
replicated entities and hear the events like any other.

## First-time tip

The first affixed elite in a fight shows the **Elite powers** tip on the
coach card (like the slick floor tip). Settings ▸ Gameplay ▸ Show tips again
brings it back.

## Code

- `src/sim/affixes.js`: the eight, `AFFIX_RULES`, the roll, the live logic.
- `src/sim/enemies.js`: rolls on spawn (the run's rule, or `affixes` forced
  in the spawn options), runs the powers each tick, the molten cores, the
  burning pool, the leech and thorns off `hit`, the core and split off
  `death`.
- `src/sim/status.js`: `affixSpeed` in `speedMul` (Hasted, the Frozen root).
- `src/sim/run.js`: the rule; probe commands `affixRule`, `affixes`,
  `affixData`.
- `src/sim/allies.js`: the two AI reactions.
- `src/render/enemies/affixes.js`: plates, auras, the blink mark, the core,
  the swelling bursts. `src/render/vfx/signature.js`: the one-shot beats.
  `src/render/enemies/extras.js`: frost and lava patches.
- `src/audio/cues.js`: ten new procedural cues.
- `src/ui/tutorial/index.js`: the tip. `src/ui/vfxlab.js`: an
  **Elite affixes** row (`?vfxlab=1`) spawns one elite per power, or two
  with two each.
- Text in all ten languages (docs/I18N.md).

## Probes

- `node tools/affixes-probe.mjs [--tune]`: headless (22 checks): where they
  roll, each of the eight through the real sim, the governor over Level III
  autopilot play, the AI reactions, snapshots and saves. `--tune` plays
  autopilot campaigns on Levels I to III.
- `node tools/affixes-browser.mjs [--lang de] [--only id,id]`: the real page
  against `npm run dev`; screenshots into `captures/affix-*.png`.
