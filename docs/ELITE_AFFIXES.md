# Elite affixes

Content plan 2, slice 3 (v0.5.235). In a campaign, every elite carries one
or two named **powers** from a set of eight (twelve from room 4 of a level
on since v0.5.300, see Batch two). The powers show as chips on a
plate above the elite, each with its own colour, aura and sound, and the two
that hurt (Molten and Frozen) warn with the usual red (Ember) ring first.

## Where they roll

- Campaign wave rooms (kill and defend), Endless included, and the trapped
  chest's ambush. Never the boss room (its adds), the tutorial, the legacy
  single-level run or the `?room=` harness, so the nine goldens never see one.
- Room objectives: the Hunt's quarry never carries a power (it is prey);
  elites a Purge nest spawns roll like any wave elite.
- How many: **one** on Level I; on Level II one in rooms 1 to 3 and **two**
  from room 4; **two** on Levels III and IV and at every Endless depth past
  the campaign (Depth 5 on). Endless Depths 1 to 4 count as their level
  (small fixes 2, v0.5.246, Kesh's call).
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

## Batch two

Content plan 5, slice 10 (v0.5.300). Four more powers that borrow from the
newer lands. They join the pool only **from room 4 of a level on** (the
rule's `late` flag; campaign, Endless, Daily and the chest ambush alike), so
rooms 1 to 3 roll exactly as before: the roll there draws from the first
eight with the same hash. From room 4 on an elite draws from all twelve (so
which of the first eight it gets can differ from before). How many powers an
elite carries and how often elites appear are unchanged.

| Power | What it does | Warning | Not on |
|---|---|---|---|
| Gusting | When a party body is within 2.6 u: roots itself and gathers a gust for 0.9 s (radius 2.6), which hits for 5 x its damage multiplier and throws everyone inside 2.4 u straight out (over 0.2 s). Every 6.5 s. | Ember ring around it, wind drawn in | Grave Wisp, Heart Censer, Mire Leech, Gargoyle, Chime Wraith, Bell Sacristan, Gust Kite |
| Crystal | When a party body is within 4 u: plants a spur where it stands; 1.0 s later the spur erupts (radius 1.1, 8 damage) and leaves a rose-quartz bed (radius 0.9, 3 s) that slows 30%. Every 4 s. | Ember ring on the spur, the spur growing | Grave Wisp, Heart Censer, Geode Brute, Heart Bloom |
| Tolling | When a party body is within 2.8 u: roots itself and swings its bell for 1.0 s (radius 3.0); the toll does no damage but slows everyone inside by 40% for 2 s. Every 7 s. | Ember ring around it, ripples closing in | as Gusting |
| Cinder | While it walks, drops a burning patch where it was every 0.4 s (radius 0.6, 2.5 s, 2 damage every 0.5 s to who stands in it; at most 6 live, the oldest goes first). Nothing while it stands still. | The glowing patch itself | Grave Wisp, Heart Censer, Grave Mole, Bog Lamprey, Heart Bloom, Ember Newt, Cinder Moth, Slag Golem |

- Gusting and Tolling never share an elite with each other or with Frozen
  (three rooted rings); Cinder never with Frozen.
- The three rings are player-targeted telegraphs and take a §11 governor
  slot, like Molten and Frozen (the toll too: a slow under another burst is
  what the governor is there to keep apart). A knocked-back elite waits, as a
  Frozen one does.
- Heroes ignore knockback, so the gust's throw is a short walk the sim takes
  for them (`affixShove` on the hero, the champions' throw rule).
- The AI seats leave all three rings (they are affix globs). Since Small
  fixes 7 every AI seat (melee too) moves its spot off a live Cinder patch,
  a Molten death pool or a Furnace Knight slag pool (`STEER_OFF_POOLS` in
  `src/data/classes.js`, `cinderClear` in `src/sim/allies.js`, keeping
  inside the leash) and the autopilot walks out of one (a zone with no
  landing tick, so never a dodge); a human seat is never steered. Small
  fixes 8 adds the slow-only beds, whoever lays them (thorn, moss, ash,
  glass: `STEER_OFF_SLOW_POOLS`, read through `steersOff`: the champions,
  Thornlings, the Thornmother, Coal Hurlers and the Ash Raven) and keeps a
  seat's chosen way out (`poolExit`) while it stays dry, so a wide pool no
  longer flips it between two turns.
- Colours: gale aqua, rose quartz, cold bell iron (kept off the Bellwright's
  verdigris), banked-coal red (darker than Ember and never the Kiln's gold).
- The **Signbreaker** deed still counts the first eight only.

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
- `src/audio/cues.js`: ten new procedural cues (seven more in batch two:
  `gust_charge`, `gust_burst`, `spur_plant`, `spur_burst`, `toll_charge`,
  `toll_ring`, `cinder_drop`; landing cues mapped in
  `src/render/hazards/cues.js`).
- `src/ui/tutorial/index.js`: the tip. `src/ui/vfxlab.js`: an
  **Elite affixes** row (`?vfxlab=1`) spawns one elite per power, or two
  with two each.
- Text in all ten languages (docs/I18N.md).

## Probes

- `node tools/affixes-probe.mjs [--tune]`: headless (22 checks): where they
  roll, each of the eight through the real sim, the governor over Level III
  autopilot play, the AI reactions, snapshots and saves. `--tune` plays
  autopilot campaigns on Levels I to III.
- `node tools/affixes-2-probe.mjs`: headless (14 checks) for batch two:
  rooms 1 to 3 roll as before, the late rule, all four through the real sim,
  the governor, the AI, Signbreaker, snapshots and saves.
- `node tools/affixes-browser.mjs [--lang de] [--only id,id]`: the real page
  against `npm run dev`; screenshots into `captures/affix-*.png`.
