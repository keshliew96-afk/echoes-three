# Content plan: bosses, enemies, rooms and run modifiers

Status: **slice 1 shipped** (two new bosses, five new enemy bodies); slices 2–4 planned.
Owner of the numbers: this file. Code is the source of truth once a slice lands.

## 1. Where the game stands (before slice 1)

| Area | Count | Notes |
|---|---|---|
| Expeditions | 3 | Hollow Wood, Sunken Mill, Ashen Barrow (`src/data/levels.js`) |
| Room layouts | 9 | 3 per expedition (`src/data/layouts.js`) |
| Enemy types | 7 | boar, mantis (Act I core) + quillback, toad, moth, ram, mole (`src/sim/enemies/`) |
| Bosses | 1 | the Hollow Stag, reused in all three expeditions (`src/sim/boss.js`) |
| Skills / nodes | 41 / 35 | `src/sim/skills.js`, `src/sim/nodes.js` |
| Between-room choice | 2 doors, each a draft (skill or node), plus the room-7 shop | no run-wide modifiers |

The loop is sound; what is thin is variety. Every expedition ends on the same fight, Acts II and III borrow most of Act I's roster, and nothing changes the rules of a run once it starts.

## 2. Bosses: one distinct boss per expedition

All bosses keep the existing contract: room 8, three add phases at 75/50/25% HP, the act's add roster, clear = boss and adds dead, every player-targeted telegraph through the §11 governor (cap 2, 1.2 s stagger), ≥ 0.7 s Ember warnings.

### 2.1 Act I: The Hollow Stag (unchanged)
Antler Quake (ring under the target) and Trample (short untelegraphed lunge). Kept byte-identical so the certified Act I traces still match.

### 2.2 Act II: The Drowned Heron ✅ slice 1
A 2.6 u wading bird whose bill is a spear. It is the only vertical boss silhouette.
- **Bill Spear** (primary): an Ember lane (1.0 u × up to 7.5 u, 48 ticks) from the Heron through its target, then it drives down the lane at 11 u/s for 16 damage to each party member it crosses. Cooldown 270 ticks.
- **Wingbeat** (secondary): an Ember ring r 2.2 centred on itself (42 ticks), 10 damage. It only fires when someone stands within 2.4 u, so it punishes crowding. Cooldown 360 ticks.
- **Submerge** (each add phase): it dives under the millrace and can't be hit while it glides to the centre. It resurfaces when its adds are dead (or after 360 ticks) through a 48-tick ring r 1.8 that bursts for 14 damage.

### 2.3 Act III: The Barrow Wyrm ✅ slice 1
A long, low, segmented grave worm.
- **Ash Breath** (primary): an Ember cone (radius 4.2 u, half-angle 32°, 54 ticks) from its jaws, 14 damage. Cooldown 240 ticks (168 once enraged).
- **Burrow Strike** (secondary, every 600 ticks): it dives (untargetable) and tunnels at 3.4 u/s toward its target for up to 150 ticks, then emerges through a 54-tick ring r 1.9 for 16 damage. After that it lies **exposed** for 90 ticks with no attacks, which is the party's punish window.
- **Enrage** under 50% HP: breath cooldown −30%.
- HP is 0.85× the act's boss HP because the burrow windows already stretch the fight.

### 2.4 Second boss per act ✅ slice 2
Each act now has two bosses. Which one a run meets is `bossFor(act, seed)` in `src/data/levels.js`: a pure hash of the run seed and the act, so it costs no RNG draw and saves nothing. A seed always meets the same boss, a replay on another seed can end differently, and a campaign rolls each level on its own (over seeds 1–40: Act I 15 Stag / 25 Thornmother, Act II 22 Heron / 18 Millwheel, Act III 25 Wyrm / 15 Lich Ram). `cmd('startRun', { act, boss })` forces one for probes. Kits live in `src/sim/bosses/`, rigs in `src/render/boss/slice2.js`.

- **Act I *The Thornmother*** (`thornmother`): a bramble sow that fights the floor rather than the party.
  - **Seed Volley**: three lobbed pods (one at the target, two 1.9 u to its sides), Ember rings r 1.0 for 54 ticks, 12 damage each, and each roots a thorn patch (r 1.1, 35% slow, 720 ticks). Cooldown 300.
  - **Briar Charge**: an Ember lane through the target to the wall (1.4 u wide, 60 ticks), then a 10 u/s charge for 18. Every thorn patch she runs through is torn up and bursts for 8 on whoever still stands in it. She skids for 40 ticks after. Cooldown 420.
- **Act II *The Millwheel*** (`millwheel`): the mill's wheel, torn off its axle. It owns the room's edge.
  - **Rim Roll**: it rolls round the walls at 2.4 u/s and grinds anyone it touches (3, at most every 90 ticks per body). The centre is the party's ground.
  - **Cog Shards**: an Ember cone locked on the target (r 6, half-angle 28°, 48 ticks), then a fan of five shards, 5 each. Cooldown 240.
  - **Crosscut** (also at every add phase): an Ember lane from the wheel through the target to the far wall (1.6 u, 66 ticks), a 9 u/s roll across for 14 that grinds barricades, kegs and puffcaps, then 75 ticks DIZZY at the far wall (the punish window). Cooldown 480. HP is 0.75× the act's boss HP.
- **Act III *The Lich Ram*** (`lichram`): a ram skeleton the graves answer.
  - **Horn Guard**: projectiles within ±60° of its facing are blocked; it turns at 75°/s, so the party works its flanks.
  - **Grave Call**: three lobbed souls (Ember rings r 1.0, 60 ticks, 10 each) around the target; the grave under the target raises a Grave Mole inside the §11 add cap. Cooldown 390 (270 under 40% HP).
  - **Bone Rush**: only along its horns (target within ±25°), an Ember lane (1.3 u, 54 ticks) and an 11 u/s rush for 12; the horns lodge and it is STUCK, guard down, for 75 ticks. Cooldown 300. HP is 0.8× the act's boss HP.

Boss medals and music stings: ✅ done in the Boss identity slice (see `docs/BOSS_IDENTITY.md`): each boss wears its own banner medal and has its own signature, phase and death stings, beat cues and (for each act's second boss) its own boss groove.

## 3. Enemies per biome

Shipped in slice 1 (✅). Each is a plain-data module in `src/sim/enemies/<id>.js`, with a rig in `src/render/enemies/archetypes.js` and a threat cost in `src/data/difficulty.js`.

| Enemy | Biome | Role | Mechanic |
|---|---|---|---|
| ✅ **Rotcap** | Mill (Wood later) | punisher | Slow contact biter (22 HP, 7 dmg). On death it bursts: a 48-tick Ember ring r 1.2 at the corpse, 10 dmg, then a spore slick (30% slow, 150 ticks). Melee pays for the kill. |
| ✅ **Lantern Snail** | Mill | support | 48 HP, no attack, keeps 3.5 u from the party inside its own pack. Every 240 ticks it heals other non-boss hostiles within 3.2 u by 12. A priority target. |
| ✅ **Barrow Crow** | Barrow | ranged | 14 HP, keeps 3.5–5.5 u. Cone telegraph (45 ticks), then a fan of three shots (−15°/0°/+15°, 5 dmg each). |
| ✅ **Brood Spider** | Barrow | splitter | 30 HP contact biter (8 dmg). On death it splits into two **Broodlings** (6 HP, 2.8 u/s, 3 dmg) that inherit its scaling. |

Shipped in slice 2 (✅). Rigs are in `src/render/enemies/slice2.js`.

| Enemy | Biome | Role | Mechanic |
|---|---|---|---|
| ✅ **Briar Wasp** (`wasp`) | Wood | swarm | One wave draw is a swarm of three 10 HP fliers on a tight orbit. Each darts down a short Ember lane (0.6 × 3.6 u, 42 ticks) at 9 u/s for 4; the sisters' first darts are staggered, so a swarm reads as a string of small lanes. |
| ✅ **Thornling** (`thornling`) | Wood | zoner | 26 HP, never bites, keeps 2.6–4.2 u away. Every 240 ticks it roots for 30 and plants a thorn patch (r 1.0, 420 ticks, 35% slow, pricks for 3 every 40 ticks), at most three alive. Chasing it means wading through its thicket. |
| ✅ **Weir Crab** (`crab`) | Mill | mobile shield | 40 HP, closes sideways. Its claw guard blocks projectiles within ±60° and it turns at 300°/s, so circling fails; melee, arcs and novas work. Its snap (cone r 1.4, 42 ticks, 10) drops the guard for the wind-up and 45 ticks after. |
| ✅ **Bog Lamprey** (`lamprey`) | Mill | ambusher | 28 HP, lurks submerged (untargetable) 3 u from its target, on the millrace when one is near. It surfaces into a lane lunge (0.9 × 5 u, 48 ticks, 10 u/s, 12) and is beached and hittable for 110 ticks after. |
| ✅ **Grave Wisp** (`gravewisp`) | Barrow | warder | 12 HP flier with no attack. It tethers the nearest other enemy within 5.5 u, which is immune (`hit_immune`) while the tether holds: 240 ticks, snaps past 6.5 u, then 150 ticks to gather a new one. |
| ✅ **Bone Knight** (`knight`) | Barrow | elite heavy | Always Elite (`alwaysElite`). A tower shield blocks projectiles and melee arcs within ±65°; it turns at 110°/s and wheels (×3) when hit from behind. Its overhead slam is a 66-tick ring r 1.4 in front of it for 12; the shield is down for the swing. |

Act I's balance pass (slice 2): the Rotcap, Briar Wasp and Thornling join the wood from room 4 (Thornling room 5), so rooms 1–3 roll exactly the certified v0.4.63 waves and the golden traces are unchanged. In slice 1, putting the Rotcap in from room 1 dropped autopilot wins from 24/30 to 16/30 by reshuffling drafts; introducing the new bodies late keeps the early draft path identical.

## 4. Room layouts (slice 2)

Six new layouts, two per expedition, using the existing hazard and interactable sets. Each expedition goes from 3 to 5 layouts in its room table.

| Id | Expedition | Name | Hook |
|---|---|---|---|
| 10 | Wood | Bramble Maze | Three bramble rows that funnel charges; kegs at the ends. |
| 11 | Wood | Fallen Oak | A trunk blocker across the middle; puffcaps under it. |
| 12 | Mill | Sluice Gates | Two sluices that open and close millrace lanes on a timer. |
| 13 | Mill | Flooded Cellar | Narrow room; slick-prone floor; barricades in a ring. |
| 14 | Barrow | Bell Tower | Two bells (stun) and a rockfall ring around the centre. |
| 15 | Barrow | Open Grave | Gravefire glyphs on a grid; moles and broods favoured. |

**Shipped** (campaign rooms; the legacy single-level run keeps each level's `legacyLayouts`, so the Node goldens are unchanged). Each new layout also has its own spawn ring (`spawns` in `src/data/layouts.js`): the wave roll still draws a point index and the run frame moves the rolled units onto the room's ring, with no extra draw. Where the build differs from the hooks above:
- *Fallen Oak*: the trunk is a row of five timber barricades (it blocks, and it can be chopped through); the crown is a bramble thicket at its east end.
- *Sluice Gates*: the two races surge half a cycle apart; each sluice is still pulled by a player, as everywhere else.
- *Flooded Cellar*: "narrow" comes from two races along the long walls. Its slick floor came with the Slick floor slice (v0.5.231, docs/SLICK_FLOOR.md): wet flagstone at the flooded east and west ends, also in the Weir, and grave frost in the Moonwell and the Bell Tower.
- *Bell Tower*: rockfall stays party-targeted; the ring is four broken cairn walls round the middle with doorways at the corners.
- *Open Grave*: the grid is five gravefire lines rippling a fifth of a cycle apart. Its moles and broods came with the balance pass (v0.5.224, docs/BALANCE_PASS.md): a layout `mix` retypes part of the rolled schedule after the layout roll, with no draw, so moles and broods are 58 % of its units (other Barrow layouts 35 %).

Probes: `node tools/slice2-layouts.mjs` (headless; each layout in a campaign room: spawn ring, all four seats moving, clear, doors, reachability) and `tools/slice2-layouts-shots.mjs` (browser screenshots against `npm run dev`).

## 5. Run modifiers: relics and curses (slice 4)

The run has no persistent modifiers today. Two kinds are planned, both stored in run state (saved and replicated like the wallet).

- **Relics** (permanent for the run, 3 rarities):
  - Where they drop: the boss of a campaign level, elite kills (a small chance), and a relic shelf in the room-7 shop.
  - What they look like: plain data in `src/data/relics.js` (`{ id, name, rarity, hooks: { onHit, onKill, onRoomStart, stipend, draft } }`), applied at the existing choke points (`combat.applyDamage`, the run stipend, the draft roller).
  - First 8: *Ember Tooth* (+10% crit damage), *Lantern Oil* (heals +8%), *Millstone* (+1 knockback), *Grave Coin* (+3 Glint per room), *Ash Feather* (dodge cooldown −15%), *Spore Sac* (enemies killed by the party leave no hazards), *Heron Quill* (first skill each room is free of cooldown), *Wyrm Scale* (+15% max HP, −5% move speed).
- **Curses** (opt-in risk for reward, on doors):
  - One of the two doors can carry a curse glyph. Taking it applies the curse for the next room (or the rest of the run for major curses) and upgrades that room's reward: a rarer draft, a relic, or bonus Glint.
  - Examples: *Elite Tide* (elite chance ×2), *Short Fuse* (telegraphs 20% faster, never below 0.6 s), *Famine* (no healing for the next room), *Crowded* (+1 wave).
- **UI**: the path screen already has a two-glyph legend per door; a third glyph family (curse) and a relic strip on the HUD corner plate are the only new surfaces.

## 6. Slice order

1. ✅ **Slice 1**: Drowned Heron + Barrow Wyrm, Rotcap / Lantern Snail / Barrow Crow / Brood Spider (+ Broodling), boss names across the HUD, shop, path, end and save screens. (This PR.)
2. **Slice 2**: ✅ the six slice-2 enemies, the Act I balance pass (Rotcap into the wood) and, pulled forward from slice 3, the second boss of each act; six layouts.
3. **Slice 3**: ✅ boss icons and stings (Boss identity), full VFX for the slice-2 creatures (PR #9).
4. **Slice 4**: ✅ relics and curses (PR #5: 15 relics, 5 curses), then slice 2 (v0.5.225): Ash Feather, Spore Sac, Short Fuse, four run-long major curses, elite relic drops and the peddler's relic shelf. docs/RELICS.md has the numbers.

## 7. How slice 1 was verified

- `node tools/content-slice1.mjs` runs every expedition end to end on the deterministic autopilot (headless sim) and checks the right boss appears, that it uses its kit, and that every new enemy spawns. Add `--browser 1` to run the same check in the real game against `npm run dev` (port 5199), with screenshots.
- `node tools/content-slice1-rigs.mjs` captures each new rig and each boss telegraph (lane, cone, ring), submerge and burrow in the real renderer.
- Balance, from `node tools/gnt-M4a-actrun.mjs --act N --seeds 1-16 --node 1` (autopilot wins):

  | Act | Before | After |
  |---|---|---|
  | I | 8/8 (seeds 1–8) | 8/8, unchanged (roster and boss untouched) |
  | II | 15/16 | 15/16, boss ~60 s vs ~45 s |
  | III | 13/16 | 11/16, boss ~46 s |
- The legacy golden traces (`node tools/gntM2-goldens.mjs`: 9 hashes for kill_all, defend and run seeds 1–3) are identical before and after.

## 8. How slice 2 was verified

- `node tools/content-slice2.mjs` (headless, 31 checks): every new enemy spawns in a real run of its act and fires its beat (the knight always Elite, wasps in threes, a wisp ward turning hits immune); all six bosses fight a real room 8 and every new boss fires each beat of its kit; `bossFor` gives both bosses per act over seeds 1–40 and a run meets exactly that boss; a mid-fight capture of each new boss and of an Act III wisp room continues bit-identically in a fresh world for 600 ticks.
- `node tools/content-slice2-rigs.mjs` (browser, against `npm run dev`): each new rig in a room of its act and each new boss's telegraphs in the real renderer, an in-page save round trip per room, no page errors.
- Balance, `node tools/gnt-M4a-actrun.mjs --act N --seeds 1-16 --node 1` (autopilot wins; `--boss <kind>` forces a boss):

  | Act | Before | After | Bosses met (after) |
  |---|---|---|---|
  | I | 16/16 | 16/16 | Stag 6/6, Thornmother 10/10 |
  | II | 15/16 | 16/16 | Heron 7/7, Millwheel 9/9 |
  | III | 11/16 | 10/16 | Wyrm 7/8, Lich Ram 3/3 (11 of 16 runs reach the boss; 12 before) |

- Level 1 in campaigns (relics on), `node tools/gntCAMPAIGN-camprun.mjs --from 1 --seeds 1-40 --stop-after 1`: 40/40 clear before and after. The GP.13 (d) Level 1 HP dip (a down or a member under 35%) lands on 23 of 40 seeds, against 7 for v0.5.150 and 12 before this slice, so the ruling's "at least as often as v0.5.150" still holds.
- The legacy golden traces (`node tools/gntM2-goldens.mjs`, 9 hashes) are identical before and after.
