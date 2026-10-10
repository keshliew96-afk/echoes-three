# Cross-run unlocks

Something to play for after one win. Every run pays **Embers** into the player's profile, and Embers (or milestones) unlock things that carry into later runs. Roadmap item 4, alongside the Endless Descent (docs/ENDLESS.md).

Code: catalogue and rules in `src/data/unlocks.js`; the profile block in `src/save/profile.js`; the save service calls in `src/save/index.js`; the run side (`boons`) in `src/sim/run.js` and `src/sim/party.js`; the screen in `src/ui/run/unlocks.js`; the camp entry in `src/scenes/camp.js`; tints in `src/data/vfx.js`.

## How a player uses it

- In the camp, **U** (or the portal prompt's *Unlocks* chip) opens the between-runs screen: the Ember balance, what the last run paid and why, what to aim for next, what the next run will wear, and every unlock by kind (Kits, Heirlooms, Purse, Vows, Tints) plus the Deeds list.
- A card shows one of: locked (with its requirement), *Buy* with its price, *Need N more*, *Owned / Equip*, or *Equipped / Take off*. Pressing a card buys it, or equips / takes off one already owned. A kit, heirloom, purse or tint bought is equipped at once (the press is the pick); a vow never is.
- *Plain run* takes off everything that changes a run. Tints stay on (they are cosmetic).
- At the end of each run a toast names the Embers earned.

## Earning Embers

| Source | Embers |
| --- | --- |
| Every room left behind (combat rooms and the shop) | 3 |
| Level I / II / III cleared (its boss killed) | 20 / 40 / 60 |
| Campaign complete | 50 |
| Endless Descent: Depth N past 3 cleared | 60 + 20 × (N − 3) |
| Challenge | Relaxed ×0.75, Harrowing ×1.5 |
| Each vow worn | +25% |
| Each deed, once | see below |

A run that is abandoned (Quit to Lobby) still pays for what it cleared. A whole campaign from Level I on Standard pays about 240 Embers before deeds; a Level I loss pays 10 to 20.

### Deeds (paid once, on the run that first meets them)

| Deed | Condition | Embers |
| --- | --- | --- |
| First Light | Clear Level I | 20 |
| Fell the … (six deeds) | Defeat each boss: Hollow Stag, Thornmother, Drowned Heron, Millwheel, Barrow Wyrm, Lich Ram | 25 each |
| The Long Road | Complete a campaign | 60 |
| Harrowed | Clear a level on Harrowing | 40 |
| Cursebearer | Walk through 3 cursed doors in one run | 25 |
| Magpie | Hold 5 relics at once | 25 |
| Oathbound | Clear a level wearing 2 vows | 40 |
| Veteran | Finish 10 runs | 30 |
| Into the Deep | Reach Depth 5 of the Endless Descent | 50 |
| Abyss Walker | Reach Depth 8 of the Endless Descent | 100 |
| Rill's Return | Clear a level with the Tidecaller in the party | 25 |
| High Water | Crash 5 soaked enemies with one cast | 30 |

## The unlocks (34)

| Kind | Unlock | Cost | Requirement | Effect |
| --- | --- | --- | --- | --- |
| Kit | Lanternbearer (Healer) | 60 | none | Starts with Mending Bolt + Lantern Flurry |
| Kit | Grovekeeper (Healer) | 90 | Clear Level I | Starts with Dewfall + Mending Tide |
| Kit | Bulwark (Tank) | 80 | none | Heavy Slam, Shield Wall, Taunting Roar, Iron Stance |
| Kit | Duelist (Swordsman) | 80 | Clear Level I | Flurry, Fox Step, Riposte, Crescent Finisher |
| Kit | Warden (Archer) | 80 | Clear Level II | Piercing Shot, Pinning Arrow, Rain of Arrows, Kestrel Watch |
| Kit | Millrace (Tidecaller) | 80 | Rill freed (the Verse of Water) | Riverbolt, Undertow, Torrent, Bubble Ward (the last two with her slice 3) |
| Heirloom | One per relic (15) | 40 / 90 / 160 by rarity | Take that relic in a run once | Begin every run holding it |
| Purse | Pilgrim's Purse I / II / III | 50 / 100 / 150 | the previous tier | Begin with 15 / 30 / 45 extra Glint |
| Vow | Elite Tide / Crowded / Iron Hide / Sharp Fangs | free | Clear Level I / II / III / complete a campaign | That curse on every combat room; Embers +25% each |
| Tint | Moonlit (Healer), Emberforge (Tank), Gravefrost (Swordsman), Thornbloom (Archer) | 30 | none | Recolours that class's effects |
| Tint | Wyrmfire (Healer) / Heron Mist (Archer) / Abyssal (Swordsman) | free | Defeat the Barrow Wyrm / the Drowned Heron / reach Depth 6 | Same |
| Tint | Brine (Tidecaller) | 30 | Rill freed | Same |
| Tint | Heron Rain (Tidecaller) | free | Fell the Drowned Heron with the Tidecaller in the party | Same |

**Feats** (docs/TIDECALLER.md): `meta.feats` holds one-off facts that pay nothing but open unlocks (`{ feat: id }` requirements): `tidecaller` (Rill freed: the first Level II clear, or a Level II boss felled) and `rill_heron`. Loadouts have a kit and a tint slot for every class that can join the team, the Tidecaller included.

Kits use each class's skills outside its starting pool (CLASS_SKILLS in `src/data/classes.js`; the Healer's from its draft pool), so a kit changes how the opening rooms play without new skill data. Vows reuse the four room curses that reshape a room's numbers (Famine, which works through the relic system's healing factor, is left out). Only one kit per class, one heirloom and one purse tier are worn at a time; vows stack.

## Round two (plan 3 slice 13)

Deeds and Ember sinks for what landed after round one: event rooms, elite affixes, the four objective rooms, champions, vaults, the act arenas, relic batch four, the third bosses, the Tidecaller, the Daily and Boss Rush.

### New deeds (17)

| Deed | Condition | Embers | Counted |
| --- | --- | --- | --- |
| Wayfarer | Enter every kind of event room (14) | 60 | across runs |
| Signbreaker | Fell an elite with each of the eight affixes | 60 | across runs |
| Run to Ground | Win a Hunt room | 20 | one run |
| Scorched Nests | Win a Purge room | 20 | one run |
| Safe Home | Win an Escort room | 20 | one run |
| Holdfast | Win a Hold room | 20 | one run |
| Four Trials | Win a Hunt, a Purge, an Escort and a Hold room in one run | 50 | one run |
| Crownbreaker | Fell a champion | 20 | one run |
| Four Crowns | Fell all four champions | 60 | across runs |
| Keyholder | Open a vault | 20 | one run |
| Treasure Seeker | Open 3 vaults in one run | 50 | one run |
| Ringwalker | Fight in all four arenas (layouts 21, 23, 25, 27) | 40 | across runs |
| Hoarder | Hold 8 relics at once | 40 | one run |
| Kingslayer | Fell every boss at least once (all twelve, the Vein Weaver included) | 120 | across runs |
| Down the River | Complete a campaign with the Tidecaller in the party | 60 | one run |
| Three Dawns | Play the Daily Descent three days in a row | 30 | across runs |
| Seven Dawns | Play the Daily Descent seven days in a row | 80 | across runs |

The Fell the … deeds already cover the third bosses (one per boss, built from the level tables), and Boss Rush has Once Around, Back to Back and Against the Clock from its own slice.

A deed counted across runs shows its progress on its card ("5 of 14" with a bar). Those counts live in `meta.marks`:

```
meta.marks = { event: [encounterId], affix: [affixId], champion: [championId], arena: [layoutId],
               daily: { last: 'YYYY-MM-DD' | null, streak, best } }
```

`saneMarks()` keeps only known ids, so an older profile loads with empty marks. A Daily run (any result) the day after the last one adds a day; the same day again or an older day changes nothing; a gap starts a new streak of one. The per-run facts come from `src/save/deedrun.js`, a bus listener in the save service (event rooms entered, affixes worn by elites felled, objective rooms won, champions felled, vaults opened, arenas fought in). It only reads events, so it never changes a run. A run continued from a save after a page reload counts only what happens after the reload.

### New unlocks (11)

| Kind | Unlock | Cost | Requirement | Effect |
| --- | --- | --- | --- | --- |
| Kit | Dawnwatch (Healer) | 100 | Clear Level III | Lantern Ward + Dawn Brand |
| Kit | Earthwarden (Tank) | 100 | Clear Level III | Earthshatter, Rallying Cry, Earthen Grasp, Shield Wall |
| Kit | Moonblade (Swordsman) | 100 | Clear Level III | Moonfang, Blade Dance, Crimson Edge, Razor Wake |
| Kit | Huntmaster (Archer) | 100 | Clear Level III | Hunter's Mark, Barbed Trap, Feather Fan, Vault Shot |
| Kit | Stormwater (Tidecaller) | 100 | Clear Level IV | Crashing Wave, Rain Squall, Maelstrom, Whirlpool |
| Vow | Restless | free | Clear Level IV | Waves in every combat room arrive 35% sooner; Embers +25% |
| Vow | Short Fuse | free | The deed Once Around (four Boss Rush bosses) | Enemy warnings in every combat room 20% shorter (never under 0.6 s); Embers +25% |
| Tint | Heartlight (Healer), Censer Smoke (Tank), Hollow Tide (Tidecaller) | 40 | Clear Level IV | Act IV colours |
| Tint | Crowned (Archer) | free | The deed Four Crowns | Gold |

Kits draw on the newer skills of each class's eleven-skill pool. A new requirement form `{ deed: id }` opens an unlock once that deed is done. Short Fuse is the first vow with no wave numbers: the run reads it live from its boons (`vowFuse()` in `src/sim/run.js`) and shortens every enemy telegraph in a combat room, never in the boss room. Heirlooms for relic batch four arrive on their own (one per relic).

Verification: `node tools/deeds-unlocks-2-probe.mjs` (headless, 51 checks: the catalogue and its text in all ten languages, every new deed met and one short, marks over several runs on a real profile store and a reload, the Daily streak, deed requirements, both vows in a real room, and whole autopilot campaigns with the tracker on the sim bus).

## Determinism: an unlock changes a run only when it is picked

- Only a **real Begin Run from the camp** (the portal or the Level Select) passes `boons` to `startCampaign`, built by `loadoutBoons(meta)` from what is equipped. With nothing equipped it is `null`, the call is exactly the call it was before, and the run is event-for-event the same: `tools/unlocks-probe.mjs --base <gauntlet checkout>` hashes whole plain campaigns on both trees (seeds 1–3, identical), and the 9 golden traces (legacy `startRun()`, which never takes boons) match.
- Developer starts (`?level=N`, `cmd('startCampaign')` without `boons`) never carry them.
- The run checks what it is handed (`sanitizeBoons`: real skills of the right class, a real relic, real diff curses) and stores it as `campaign.boons`, so it rides saves and network snapshots with the run. The boons make no RNG draws: kits set slots before the run-start event, the heirloom is granted (not rolled) and the purse is a plain Glint gain after any starter grant; one `boons` event names them. Vows apply `cursedDiff` to each combat room after any door curse.
- The run view and summary carry `boons` only when there are some; the summary also carries `curses` (curses taken) when relics are on.

## Co-op

- **Each player's profile is their own**: it lives in that player's browser. Every player earns Embers, deeds and boss kills from the shared run on their own profile (a network guest's save service hears the host's run end through the replicated events).
- **The host's loadout is the party's loadout.** Only the host starts runs, so the host's kits (for all four classes), heirloom, purse and vows set the run; the guests see the same run in their replica. A guest can still open the Unlocks screen, buy and equip; their picks apply when they host. The screen says which case applies.
- **Tints are local**: each player sees their own tints on their own screen, whoever is hosting.
- Checked by `tools/unlocks-net.mjs` (a host on 127.0.0.1 and a guest on localhost, so two separate profiles).

## Save data

`echoes.profile.v1` gains one block, `meta`, versioned on its own (`mv: 1`):

```
meta = { mv, embers, earned, owned: { unlockId: embersPaid }, deeds: [id],
         bosses: { kind: kills }, relicsSeen: [relicId], feats: [featId],
         loadout: { kits: { classId: id|null }, heirloom, purse: 0..3, vows: [id], tints: { classId: id|null } },
         lastAward: { at, result, embers, lines: [{ label, embers }], deeds, unlocked } }
```

- `saneMeta()` lifts any older, missing or damaged block to the current shape. An owned unlock that a later build no longer has is dropped and what was paid for it goes back on the balance; a loadout only ever holds owned unlocks.
- Every change is one atomic profile write through the existing multi-tab protocol (a stale tab replays only its own changes), so two tabs never lose a purchase or a run's Embers.
- A Records reset clears scores and records but keeps `meta`.
- The Endless Descent's facts are read where they exist: `records.endlessBestDepth` for the depth requirement, and the run summary's `campaign.endless` / `depth` / per-level `index` for depth Embers and the depth deeds.

## Verification

- `node tools/unlocks-probe.mjs [--base <gauntlet checkout>]` (headless): plain campaigns identical to the base tree, empty or invalid boons are a plain run, a played campaign earns Embers and deeds, buying and equipping persist across a new profile store over the same storage (a reload), the next run carries the kit skills (cast in room 1), heirloom relic, purse Glint and vow numbers, boons ride a save, and the meta survives damage, version changes, two tabs and a records reset.
- `node tools/unlocks-browser.mjs` against `npm run dev`: the real screen in a fresh browser, a camp-started run to the Level I boss and a Quit to Lobby that pays Embers, buying the purse and a tint by clicking the cards, a page reload, and the next run opening with the purse's Glint and the tint live. Screenshots `captures/unlocks-1..4-*.png`.
- `node tools/unlocks-net.mjs` against `npm run dev` (own server on port 7910): the co-op rules above.
- `node tools/gntM2-goldens.mjs` (9 of 9) and `node tools/relics-probe.mjs`.
