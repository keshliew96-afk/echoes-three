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

### 2.4 Later boss work (slice 3)
- **Alternate bosses**, one more per act, rolled per run so a replay can end differently:
  - Act I *The Thornmother*: a bramble sow that seeds bramble hazards and charges through them.
  - Act II *The Millwheel*: a rolling wheel construct that sweeps lanes across the room and grinds barricades.
  - Act III *The Lich Ram*: a ram skeleton with a horn-guard (front immune like the Barrow Ram) that raises moles from graves.
- **Boss medals and icons**: the HUD banner medal still draws the Stag icon for every boss; each boss needs its own icon in `src/ui/hud/icons.js`.
- **Boss music stings** per boss (audio theme hooks already exist per act).

## 3. Enemies per biome

Shipped in slice 1 (✅). Each is a plain-data module in `src/sim/enemies/<id>.js`, with a rig in `src/render/enemies/archetypes.js` and a threat cost in `src/data/difficulty.js`.

| Enemy | Biome | Role | Mechanic |
|---|---|---|---|
| ✅ **Rotcap** | Mill (Wood later) | punisher | Slow contact biter (22 HP, 7 dmg). On death it bursts: a 48-tick Ember ring r 1.2 at the corpse, 10 dmg, then a spore slick (30% slow, 150 ticks). Melee pays for the kill. |
| ✅ **Lantern Snail** | Mill | support | 48 HP, no attack, keeps 3.5 u from the party inside its own pack. Every 240 ticks it heals other non-boss hostiles within 3.2 u by 12. A priority target. |
| ✅ **Barrow Crow** | Barrow | ranged | 14 HP, keeps 3.5–5.5 u. Cone telegraph (45 ticks), then a fan of three shots (−15°/0°/+15°, 5 dmg each). |
| ✅ **Brood Spider** | Barrow | splitter | 30 HP contact biter (8 dmg). On death it splits into two **Broodlings** (6 HP, 2.8 u/s, 3 dmg) that inherit its scaling. |

Planned (slice 2):

| Enemy | Biome | Idea |
|---|---|---|
| Briar Wasp | Wood | Spawns in groups of 3; low HP fliers that dive in short lanes; a "swarm" read for Act I. |
| Thornling | Wood | Plants a bramble patch where it stands every few seconds (uses the existing bramble hazard). |
| Weir Crab | Mill | Side-steps; its claw guard blocks frontal projectiles (the Ram's guard, but mobile and small). |
| Bog Lamprey | Mill | Lurks in the millrace hazard and lunges out in a lane when a party member enters the water. |
| Grave Wisp | Barrow | Tethers to another enemy and makes it immune until the wisp dies. |
| Bone Knight | Barrow | Elite-only heavy with a shield turn and a delayed overhead slam (ring). |

Act I deliberately stays unchanged in slice 1. Its Stag fight is the most RNG-sensitive in the autopilot runs: putting the Rotcap in Act I dropped autopilot wins from 24/30 to 16/30 purely by reshuffling drafts, so new Act I enemies wait for slice 2 with a dedicated Act I balance pass.

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
- *Flooded Cellar*: "narrow" comes from two races along the long walls; there is no slick floor type yet.
- *Bell Tower*: rockfall stays party-targeted; the ring is four broken cairn walls round the middle with doorways at the corners.
- *Open Grave*: rosters are not changed per layout (the layout is rolled after the wave schedule, and the rosters belong to the roster work); the grid is five gravefire lines rippling a fifth of a cycle apart.

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
2. **Slice 2**: the six slice-2 enemies, six layouts, and the Act I balance pass (Rotcap into the wood).
3. **Slice 3**: alternate bosses, boss icons and stings.
4. **Slice 4**: relics and curses.

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
