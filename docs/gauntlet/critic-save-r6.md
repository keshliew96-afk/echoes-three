STATUS: COMPLETE
VERDICT: FAIL - 3 must-fix: SAVE6-F1 a hash-valid save naming a Healer skill / socketed node the build does not know (content drift) imports + loads ok then throws 'reading id' every frame: sim frozen, camp on screen, pause empty/dead, tab reload only (repro by real Import chooser: captures/gntcsave6-sc-driftrepro.json); SAVE6-F2 a crash (Page.crash) in room 2 resumed room 1 - reward, nodes, 12 Glint lost; natural L1 play keeps safe-point captures unwritten 20.6/20.6/21.5 s (~25% of the level exposed) though writes cost 3-21 ms; SAVE6-F3 no Import on a browser without saves (title Load Game disabled, no other entry). Engine otherwise PASS: 13/13 bit-identical round trips, 10 genuine schema 1-4 files migrate, G2.1-G2.12 / GC.9 / GP.11 pass, SAVE5-F1/F2/F3 fixed. Benchmark 14/18.
# Critic SAVE r6 (gauntlet round 6)

Started 2026-10-01. Steps appended as completed.

## Step 1 — Blind benchmark checklist (written BEFORE viewing any Echoes capture)

From my own knowledge of the shipped systems (no Echoes pixels/logs consulted yet):

| # | Benchmark item | Source behaviour |
|---|---|---|
| B1 | Autosave at safe points only (room entry/exit, between encounters, reward pickups), never mid-animation/mid-combat snapshot that would resume into an unfair state | Hades saves on every chamber exit; Slay the Spire saves on floor entry / after each combat reward |
| B2 | Resume exactly where you left: quitting and relaunching drops you into the same room/floor with same HP, deck/boons, gold, RNG (StS: same card rewards/map seeds because RNG counters are saved) | StS "Save & Quit" + Continue; Hades resume |
| B3 | Save-scum resistance / determinism: reloading reproduces the same RNG outcomes (StS seeds persist per-floor RNG streams) | Slay the Spire |
| B4 | Crash-safe atomic writes: write to temp, then swap; a crash mid-write never destroys the previous good save | StS writes .autosave with backup; Hades keeps .sav + backups (_Temp / .bak) |
| B5 | Backup of the previous save kept; on corruption the game offers/uses the backup instead of wiping | Hades/Stardew (Stardew keeps _old save file) |
| B6 | Save-slot menu shows metadata per slot: name, location/progress, playtime, date/time saved, (character/portrait) | Stardew load menu (farm name, money, days, playtime); Skyrim (character, level, location, playtime, date, screenshot) |
| B7 | Overwrite requires confirmation ("Overwrite existing save?") | Skyrim / Oblivion save menu |
| B8 | Delete requires confirmation (Stardew: trash can -> "Really delete?") | Stardew / Skyrim |
| B9 | Load from title screen ("Continue" = most recent; "Load" = choose slot) restores the chosen slot, not another | Skyrim/Stardew/Hades title menus |
| B10 | Keyboard/mouse/gamepad navigation of the slot menu, Esc/B backs out without side effects | Console-grade UX |
| B11 | Versioned schema: saves carry a version; old saves migrate forward when the game updates; newer-than-game saves refused with message, not crash | Engine practice (Unity/Unreal SaveGame versioning) |
| B12 | Integrity check (checksum/hash) detects truncated/tampered files; corrupted slot is marked "corrupt" in menu, other slots unaffected, no crash | Engine practice |
| B13 | Storage-full / write failure surfaced as a clear error, previous save intact | Console TRC requirement practice |
| B14 | Export/import (browser equivalent of save-file portability / cloud copy) round trips exactly | Steam cloud / manual file copy equivalent |
| B15 | Meta-progression/high scores persist independently of run slots, across runs and relaunches; not lost when a run save is deleted | Hades Mirror/records, StS statistics & unlocks |
| B16 | Saving indicator visible when a save happens (spinning icon / "Saving..." toast), no hitch | Hades / console TRC |
| B17 | Save during combat either disallowed with explanation or restores exact in-flight state (projectiles, enemies) | Hades disallows (saves only between chambers); StS restores to start of combat |
| B18 | Loading a save never double-grants rewards or re-rolls shop stock (no save-scum of shop) | StS shop contents fixed per floor |

## Step 2 — Setup
- Read PLAN §3.4 (save contract), §6.4 (debug API), M2 gates G2.1–G2.12, §12.8 (campaign save), GC.9, §16.6 (schema 4), GP.11; previous critic-save-r5 (FAIL: SAVE5-F1 G2.9, F2 slot detail, F3 isReady) and fix-M2-r5 (claims F1/F2 fixed, F3 verified) — claims to be re-measured, not trusted.
- HEAD f91670d = v0.5.197 (src/** clean). Dev 5199 answers 200 (not used for evidence except smoke).
- Own production build `npx vite build --outDir dist-gntcsave6` (v0.5.197) + `npx vite preview --outDir dist-gntcsave6 --port 4324` = **Windows PID 65756 on 4324 — kill at the end**.
- Own tools: tools/gntcsave6-*.mjs = own-prefixed copies of the r5 critic's driver / lib / scenarios (outputs renamed gntcsave6-*), plus new scenarios added below.

## Step 3 — API surface (captures/gntcsave6-sc-explore.json, 0 page errors)
v0.5.197, StateTree v 4, systems combat/skills/build/enemies/waves/allies/boss/run/layout/party/movement/shapes; save API has capture/apply/hash/save/load/list/rename/remove/restoreBackup/exportText/importText/corrupt/simulateQuota/simulateTornWrite/roundTrip/profile/usage/lockCheck. `window.__echoes.party` still absent (party critic's concern, not save).

## Step 4 — ROUND TRIP, 13 moments, production preview :4324 (tools/gntcsave6-sc-roundtrip.mjs, seed 13, script 5; captures/gntcsave6-sc-roundtrip.json)
Legs: R never saved (reference); S save to real localStorage -> 600-tick continuation (side-effect check) -> save.load -> continuation; L page reload (storage kept) -> save.load -> continuation. My own SHA-256 over sorted-key canonical JSON of save.capture() + the game's hash every 60 ticks + every non-sound event.

| moment | tick | hash before = after load (page & reload) | bytes | save ms | load ms (page / reload) | 600 ticks == never-saved reference (after save / in page / after reload) | events | game roundTrip() |
|---|---|---|---|---|---|---|---|---|
| camp | 300 | a38eeae186a1da2d | 6346 | 266 | 8 / 7 | = = = | 93 | equal+cont |
| combat L1 r2 (6 skillbolts, 1 bolt, 1 zone, 2 kegs, barricades) | 814 | 4727c4805f8d7059 | 16163 | 74 | 6 / 11 | = = = | 295 | equal+cont |
| reward L1 r1 | 718 | fe17c422a3994d3d | 10341 | 96 | 5 / 368 | = = = | 105 | equal+cont |
| shop L1 r7 | 708 | dd6b21f5b054ada8 | 10165 | 158 | 13 / 484 | = = = | 119 | equal+cont |
| boss + adds | 759 | b678d3d5cca334ae | 12435 | 148 | 17 / 547 | = = = | 241 | equal+cont |
| level-clear card (transit) | 769 | faf8a66c8754f3eb | 8329 | 223 | 14 / 17 | = = = | 140 | equal+cont |
| carried L2 mid-combat | 907 | 364655bf91be44eb | 16568 | 219 | 22 / 915 | = = = | 242 | equal+cont |
| Level-1 content (bramble slow, barricade, keg fuse) | 698 | c6b77628130b97c3 | 14408 | 251 | 9 / 601 | = = = | 280 | equal+cont |
| Level-2 content (puffcap/millrace telegraphs, sluice cd, slick, haste) | 1387 | 26001793ad025b73 | 17772 | 72 | 7 / 480 | = = = | 384 | equal+cont |
| Level-3 content (mole, rockfall+rubble, gravefire, echo armed, resonance, elite) | 964 | 721e1ee041c95814 | 27663 | 91 | 10 / 377 | = = = | 539 | equal+cont |
| hswap (Healer 4/4 swap offer, selector moved, Tank card decided) + POST Take | 713 | e3f66194f627546b | 10577 | 95 | 7 / 480 | = = = ; POST identical all legs (slot 2 sanctuary -> kindred_shield, echo -> bench `echo:drafted`) | 123 | equal+cont |
| built4 (four max builds mid-combat) | 931 | 384023ef7f2e129e | 24281 | 274 | 19 / 19 | = = = | 525 | equal+cont |
| pshop (party shop, ally purchase) | 713 | ff1cd7cc4dba8eae | 9523 | 126 | 14 / 601 | = = = | 121 | equal+cont |

**13/13 bit-identical**, moment builds deterministic 13/13, save side-effect free 13/13, pageErrors 0, timedErrors 0 (r5: 3 isReady errors in this same probe -> SAVE5-F3 not reproduced). Only summary diff: campaign.transitionState "advancing" (never-saved leg) vs "none" (after reload) at reward/shop/hswap/pshop — presentation flag, hash-identical (same as r5).

## Step 5 — hostile CONTENT in names / metadata (tools/gntcsave6-sc-inject.mjs; captures/gntcsave6-sc-inject.json, gntcsave6-inject-loadlist.png; 0 page errors)
- HTML in a slot name (rename API) and in an imported file's slot.name / meta.levelName / meta.actName: rendered as literal text (window.__xss 0, __xss2 0, no #xssb / #xssi element, no <img> created) on the Load list, the detail and the title Continue button. Rename caps the name at 32 chars. PASS.
- **Metadata spoof** (new): a camp file whose `meta` was edited to "Level III · Room 8 of 8 · ◉ 9999 · Playtime 27 h 46 min" (state untouched, hash still valid because the hash covers `state` only) imports `ok` and the Load list + detail show the forged metadata (gntcsave6-inject-loadlist.png row 3); loading it lands in the CAMP with wallet 0 (lastLoad manual-3 hash a99b5e0b…). The slot metadata is taken from the file verbatim, never re-derived from the verified state on import. Advisory (requires a hand-edited file).
- Imported slots have no picture ("◇" placeholder, meta.thumb false) — export files do not carry the thumbnail. Advisory.
- `window.__echoes.save.hash(tree)` IGNORES its argument: hash(a) = hash(a with tick+1) = hash({}) = the live capture's hash a5c2b9286f34d026 (captures/gntcsave6-sc-hashapi.json). PLAN §6.4 lists the debug member as `hash()` so this is not a gate defect, but it means r5's "rehash_*" corruption cases never produced integrity-valid files (they were refused by the key check or the hash check). Re-done properly in step 6 with the game's own pure hash module imported in Node (tools/gntcsave6-rehash.mjs, selfCheck on the unmodified files = true).

## Step 6 — SLOT MENU by real keyboard (tools/gntcsave6-sc-slots.mjs; captures/gntcsave6-sc-slots.json; 0 failures, 0 page errors)
Fresh title: New Game / "Load Game — No saved games yet" / Multiplayer / Settings / Records / Exit. Pause: Resume / Settings / Save Game / Load Game / Save & Quit to Title / Quit to Title. Create Slot 1: "Saving…" 36 ms after Enter, written + thumbnail + toast "Saved to “Slot 1”" 244 ms (thumb 256×144 JPEG 9699 B, luma std 43.1, 102 colour bins = a real picture). Slot 2: 31 / 219 ms. Overwrite: confirm "Overwrite “Slot 1”? The save from 1 Oct 2026, 04:15 (Camp — at the hearth) will be replaced." with **Cancel focused**; Cancel kept the slot hash; OK wrote 6b7be293… (160 ms). Rename -> "Mill Approach", hash kept. Delete: "Delete “Slot 3”? Camp — at the hearth · saved 1 Oct 2026, 04:16. This can't be undone." Cancel focused; cancel kept / OK removed every manual-3 storage key. Mid-game Load: "Load “Mill Approach”? Anything since your last save will be lost." Save & Quit: confirm -> auto-1 hash 45830b69… = the paused hash (tick 644) -> title focuses "Continue — Camp · just now · Autosave". Title Load of the NON-newest slot (Mill Approach) -> lastLoad manual-2 hash 06c144a8… = slot, pos (3.391, -0.751) tick 449 = intended, 156 ms; page reload -> Load Slot 1 -> hash 6b7be293… = slot, pos (0.967, -0.911) = intended, 259 ms. Metadata audit: name, savedAt, playtime, mode/level/room/phase, 4-member HP, wallet, thumbnail all correct for all 3 slots. PASS (G2.3).

## Step 7 — INTEGRITY-VALID hostile files (tools/gntcsave6-sc-crafted.mjs + tools/gntcsave6-rehash.mjs; captures/gntcsave6-sc-crafted.json)
Each file = a real save exported from :4324, mutated, re-hashed with the game's own pure `hashState` (selfCheck true for all 25), imported into a FRESH profile (unlocks [1]) + a bystander slot, loaded by `save.load`, then 2 s of real time.

| case | import | load | after 2 s | page errors |
|---|---|---|---|---|
| control L1 | ok | ok | combat L1 r1, ticking | 0 |
| L3 file, harness flag -> false (= a player's L3 save) | ok | **refused `locked`** | stays in camp | 0 |
| L3 file as made by `?level=3` (harness true) | ok | **ok -> Level 3 room 1 combat in a profile with only Level 1 open** | ticking | 0 |
| L3 harness false + meta forged to Level 1 | ok | refused `locked` (lock reads the state, not meta) | camp | 0 |
| player x = "NaN-string" | ok | ok | ticking, player x stays a string, **3 NaN** in the next capture | 0 |
| player x = null | ok | ok | ticking, x null | 0 |
| player hp -50 / 1e9 | ok | ok | combat continues with hp -50 (not downed after 2 s) / 1e9 | 0 |
| unknown system key | ok | ok (ignored) | ticking | 0 |
| registry not array / no run / no party / no rng / rng.s string / duplicate entity ids / tree v 99 | **corrupt** (clear detail, e.g. "required keys missing (state.systems.party missing)") | — | camp | 0 |
| seat 1 with 6 skills | ok | ok | seats trimmed to [4,4,4] | 0 |
| seat 1 unknown skill id | ok | ok | ticking | 0 |
| **Healer (seat 0) unknown skill id** | ok | ok | **sim STOPPED (0 ticks in 700 ms), `E.state()` throws** | **1: "Cannot read properties of undefined (reading 'id')" at getSkillSlots (index-OoO8EUa-.js:1166)** |
| wallet -500 | ok | ok | wallet -500 kept | 0 |
| entities ×3000 | ok | ok | ticking | 0 |
| tick -100 | ok | ok | ticking | 0 |

Bystander slot loaded fine after every case. Findings: (1) a save whose Healer skill id the build does not know (a renamed / removed skill — what content drift between builds produces) passes every load check and then throws an uncaught page error every frame path that reads the skill slots, freezing the game (follow-up probe step 8); (2) structural types are not validated after integrity (string / null position, negative HP, negative wallet accepted); (3) the lock decision trusts the file's `harness` boolean.

## Step 8 — CONTENT-ID DRIFT through the PLAYER path (tools/gntcsave6-sc-drift.mjs; captures/gntcsave6-sc-drift.json, gntcsave6-drift-*.png)
Integrity-valid files (rehashed, selfCheck true 13/13) that reference content ids this build does not know — exactly what a save from a build whose skill / node was renamed or removed looks like — imported, then title -> Load Game -> slot -> Enter (real keys), 3 s, then Esc.

| case | import | after load (1 s) | page errors | Esc |
|---|---|---|---|---|
| control L1 | ok | combat, 61 ticks/s | 0 | full pause menu (7 items, gntcsave6-drift-control_L1.png) |
| **Healer skill slot 0 id unknown** | ok | **0 ticks/s, `state()` throws, scene still the CAMP** | **1 "Cannot read properties of undefined (reading 'id')"** | **pause card with NO items** (gntcsave6-drift-healer_unknown_skill.png) |
| **Healer skill slot 1 id unknown ("retired_skill")** | ok | **0 ticks/s** | **1 (same)** | **empty pause** |
| **L3 socketed node id unknown** | ok | **0 ticks/s, scene camp, HUD 0 Glint** | **1 "Cannot read properties of undefined (reading 'kind')"** | **empty pause** (gntcsave6-drift-socket_unknown_node_L3.png) |
| Healer 5 skills | refused "required keys missing (state.systems.skills has more than 4 skills)" | — | 0 | — |
| Healer duplicate skill (mending_bolt ×2) | ok | runs, Healer holds the same skill twice | 0 | normal |
| bench unknown node / seat-2 unknown node / seat-1 unknown class / hazard, enemy, entity-kind unknown | ok | runs 60-61 ticks/s | 0 | normal |
| seat-2 unknown skill | ok | runs; the slot becomes null (sanitised) | 0 | normal |

**A load the game accepts as valid hard-locks the game**: sim dead, the camp scene left on screen, the pause menu rendered with zero items (no Resume / Load / Quit), only a page reload escapes. Ally seats are sanitised (unknown skill -> null) but the Healer's skills and socketed nodes are not validated against the content registry. -> SAVE6-F1.

## Step 9 — CRASH SAFETY + close mid-save (tools/gntcsave6-sc-crash.mjs; captures/gntcsave6-sc-crash.json, gntcsave6-crash-title.png, gntcsave6-crash-resumed.png; 0 page errors)
Real sequence: fresh title -> New Game (Enter) -> walk W to the portal -> E -> Level 1 room 1 (cleared by setup kills) -> reward page (skill "dewfall", Enter takes it) -> room 2 combat, 2.5 s in, walked right. State before the crash: tick 1079, L1 room 2 combat, skills [mending_bolt, swift_mend, dewfall], bench [multiply, quicken], wallet 12. Autosave log: room 1 `room_enter` written to auto-1 at tick 432 (write 49.7 ms); room 2 `room_enter` at tick 837 **skipped: throttle, deferred, dueInMs 13144** (held in memory).
Renderer killed with CDP `Page.crash` (no pagehide / visibilitychange). Reopen: title "Continue — Level I · The Hollow Wood · Room 1 · just now · Autosave" -> Enter -> **Level 1 ROOM 1 combat, tick 653, skills [mending_bolt, swift_mend], bench [], wallet 0** — the room-1 clear, the dewfall skill, both nodes and 12 Glint are lost (426 ticks of progress + one completed room). Hades / StS resume at the start of the room the player was in. The held-capture design (PLAN §3.4 "the throttle spaces WRITES only", written on pagehide) protects close / reload / background, but not a crash within 20 s of the previous autosave. Exposure measured in natural play in step 10.
Close mid-save with the sim FROZEN (deterministic captures; replaces the r5-copied realtime check whose "OTHER" rows were a live-tick artifact — got tick 150 vs want tick 120 because the sim kept running): 7/7 closes at 0/5/15/30/60/120/250 ms left the slot = previous (6) or new (1 at 250 ms), always loadable, no .tmp left. PASS (G2.5 spirit).

## Step 10 — SAVE5-F1 / SAVE5-F2 re-measured + FILES
- **G2.9 / SAVE5-F1** (tools/gntcsave6-sc-g29.mjs, -g29repeat, -g29seed, -newgame; captures/gntcsave6-sc-g29.json, -g29repeat.json, -g29seed.json, -newgame.json; 0 page errors): dirty game (Tank / Swordsman / Archer 32/24/32 filled, purses 12, party rng draws 6) -> Quit to Title -> New Game tick 0 hash 3d2e21dae1bb864c == fresh `?menu=0&seed=1633117742&freeze=1` boot 3d2e21dae1bb864c, diffs []; keyboard New Game a4807b74b72bff78 == fresh boot a4807b74b72bff78; three New Games in one page: party rng0 3156766672 / 80092052 / 778691788 (all different, = per-seed derivation); fresh-boot seed table identical to r5 (959409563 -> f487eeec211dd682). **FIXED.** New Game over a run: dialog "Start a new game? Your run in progress stays in Load Game: Level I · The Hollow Wood · Room 3 · just now · Autosave", run A survives game B's autosaves and loads to 19277710594d39c7 exactly.
- **SAVE5-F2** (tools/gntcsave6-sc-detail.mjs at 1024×576 / 1600×900 / 1920×1080 [2560×1440 below]; captures/gntcsave6-sc-detail-*.json, gntcsave6-detail-1600x900.png viewed): Where / Saved / Played / Party / Skills / File / Tank / Swordsman / Archer all visible, 0 scrollers, hasAllyBuild true — the detail is a Party · HP · Skills (icons) · Nodes · Glint table (Healer 0/32, Tank 32/32, Swordsman 32/32, Archer 32/32, ◉ 24 each). **FIXED.**
- **FILES** (tools/gntcsave6-sc-files.mjs; captures/gntcsave6-sc-files.json; 0 page errors): mouse Export -> real download echoes-manual-1-2026-10-01_0425.json (11 025 B, schema 4, game 0.5.197, hash 67df1a0e329bdd96 = slot); Delete by mouse with confirm; Import… through the REAL file chooser -> "Imported into “Slot 1”", load hash 67df1a0e… exact; same file again -> manual-2 (never over an occupied slot); tampered / newer / truncated / foreign JSON / text -> 5/5 refused with specific toasts ("checksum doesn't match", "made by a newer version", "cut short or garbled", "isn't an Echoes save file"), list unchanged; v0.5.44 / v0.5.62 schema-2 exports import as schema 4 and load (8-socket rows); whole v0.5.87 storage (schema 2) upgraded in place: title "Continue | Level II · The Sunken Mill · Room 2 · 5 d ago", profile kept (2741, unlocks [1,2]), Level-2 load -> campaign L2 room 2, bench snare+reach, toast "Your allies caught up: 5 nodes each". PASS (G2.6).

## Step 11 — natural-play autosave exposure (tools/gntcsave6-sc-autothrottle.mjs; captures/gntcsave6-sc-autothrottle.json; 0 page errors)
Autopilot plays Level 1 (seed 11) in REAL time from a fresh profile; every safe-point event and every autosave write logged (autosaveLog `at` and my event stamps share performance.now()).
Room durations: 16.0 / 13.3 / 16.7 / 45.3 / 45.3 / 23.5 s (rooms 1-6), shop 0.3 s. Writes 8 (writeMs 5.8-20.7 ms), skipped 6 (throttle ×2, busy ×3, superseded ×1).
Time from a safe point to the moment it is on disk: level start 2.2 s · room 1 20.6 s · **room 2 20.6 s** · room 3 7.2 s · room 4 9.5 s · room 5 1.8 s · room 6 1.7 s · shop 0.4 s · **room 8 (Stag) 21.5 s**.
=> For 34.5-55.2 s (room 2 and the start of room 3) the disk held the room-1 start; 65.3-74.7 s one room behind; 185.6-207.1 s the shop. **About 52 s of the 207 s level (25 %) a crash resumes one or two completed rooms back** (their rewards, nodes and Glint lost — step 9 shows exactly that). The writes themselves cost 6-21 ms, so the 20 s write throttle is not protecting a frame budget. Benchmark B1/B2/B4 (Hades writes at every chamber, StS at every floor; a crash costs at most the current room). -> SAVE6-F2.

## Step 12 — storage refused by the browser + isReady re-check
- tools/gntcsave6-sc-nostorage.mjs (captures/gntcsave6-sc-nostorage-blocked.json, -full.json, gntcsave6-nostorage-blocked-aftersave.png viewed; 0 page errors both): (a) every localStorage access throws SecurityError; (b) every write throws QuotaExceededError from boot. Both boot and play; toast "Settings can't be saved in this browser mode"; the Save screen header states "Saves last for this visit only (browser storage is off)"; a save works in memory (row + picture + detail) and Export stays available. Honest browser equivalent — PASS. Advisory: the toast still reads "Saved to “Slot 1”" (no "for this visit"), and the header subtitle "Choose a slot — autosaves and the quicksa…" is ellipsised at 1600×900 next to that notice.
- SAVE5-F3 (isReady) on the save/load paths: the 13-moment round trip (step 4) 0 page errors / 0 timed errors (r5: 3); fast player loads (tools/gntcsave6-sc-fastloads.mjs; captures/gntcsave6-sc-fastloads.json): 4 page reloads with Continue mashed + 24 pause-menu loads by real keys, 2.0-2.8 s each (median 2.24 s), alive 24/24, 0 page errors. F9 quickload mashed 12× at 120 / 60 ms (L1) and 120 / 40 ms (L3) (tools/gntcsave6-sc-f9mash.mjs; captures/gntcsave6-sc-f9mash.json, -f9mash-L3.json): page responsive 30/30 heartbeats every round, sim advancing, 0 page errors. **SAVE5-F3 not reproduced.**
- Harness-speed stall persists (r4 A1 / r5 advisory): in the r5-copied corruption loop, after 4 back-to-back successful API loads ~150 ms apart the page stopped answering ("case partyTamper did not return within 25 s", "NO RESPONSE 5 s"; captures/gntcsave6-sc-corrupt.json). Player paths above (F9 at 40 ms, pause-menu loads, Continue mashing) never hit it. Advisory.

## Step 13 — high scores / records + safe-point autosave log
- tools/gntcsave6-sc-scores.mjs (captures/gntcsave6-sc-scores.json, 0 page errors): abandoned L1 run 2 rooms 22 kills -> 310 = (100·2 + 5·22)·1.0 ✓ (newBest, rank 1); defeat 0 ✓; a full L1->L3 campaign 24 rooms 3 kills 21 s -> 10 802 = round(1805·(1+1.5+2)) + (900·3 − 21) ✓. Same entries after reload, after deleting every slot, after a second reload (same12/13/14 true). Records screen: "3 runs · 1 won", table with "I → III · Campaign · Campaign complete", Lifetime: campaigns completed 1, abandoned 1, furthest Level III, fastest campaign 0:21, level clears ×1 each, levels open I · II · III, the score formula spelled out. PASS (G2.8, GC.10).
- tools/gntcsave6-sc-autosave.mjs (captures/gntcsave6-sc-autosave.json, 0 page errors): autopilot Level 1 real time: autosaves only at room_enter (captured ON the event tick 8/8), room_enter+shop_open (the shop), run_end (camp after the defeat, capture 96 ticks after the event = the camp return, as PLAN §3.4 defines). No mid-fight capture. Save & Quit -> reload -> Continue = quit hash b7feb0c1d4a9b66c exactly. The r5-copied checker's 2 "failures" are checker artefacts (combined reason string; run_end is captured at the camp by design). Frame gaps around events 67-497 ms but control windows without any autosave show p50 66.6 / p90 96.9 ms on this loaded machine (3 browsers running) — not attributable; A/B hitch test in step 16.

## Step 14 — campaign card save, GP.11 carry, locks, MIGRATION of genuine old files, goldens
- CARD (tools/gntcsave6-sc-cards.mjs; captures/gntcsave6-sc-cards.json; 0 page errors): real portal start; `level_transit` autosave captured ON the event tick (574 = 574, write 6.4 ms, auto-2); manual save on the L1 card -> row "Slot 1 | Level I cleared — next: Level II · The Sunken Mill"; reload -> title "Continue | Level I cleared · just now · Slot 1" -> hash b4e3d8294d2fb192 exact (20 ms), the card back with its remaining time (untilTick 754 at tick 735), auto-advance 4.3 s -> L2 room 1 with the carried build (wallet 84, bench bounce+keen, mending_bolt:echo, all four at max HP); F5 in L2 -> reload -> "Continue | Level II · The Sunken Mill · Room 1 · just now · Quicksave" exact bb9394087b34a5be (663 ms). PASS (GC.9).
- GP.11 (tools/gntcsave6-sc-gp11.mjs; captures/gntcsave6-sc-gp11.json; 0 page errors): four built characters (Tank / Swordsman / Archer 32/32, Healer 1/16) carried L1 -> L2 -> L3: builds identical before/after each card (4/4 comparisons true), party at max HP, no statuses; saved on the L2 card (hash ec0fd1198b195a69) -> reload -> "Continue | Level II cleared" -> exact -> L3 room 1 builds identical. PASS.
- LOCKS (tools/gntcsave6-sc-locks.mjs; captures/gntcsave6-sc-locks.json): a PLAYER Level-2 save moved into a fresh profile (unlocks [1]) is refused on Load with "That save is in a level you haven't unlocked yet — Clear The Hollow Wood to unlock" (stays on the Saves screen); the `?level=3` HARNESS save (harness true) is offered by the title Continue and loads Level 3. Step 7 proves the lock decision is the file's `harness` boolean (flip false -> refused; as made -> loads). Advisory (r4 A2 / r5 unchanged): a save file can start a locked level if it carries the harness flag.
- MIGRATION (tools/gntcsave6-sc-migrate.mjs; captures/gntcsave6-sc-migrate.json; 0 page errors) of 10 GENUINE files from older builds: v0.5.150 schema 3 ×4 (L2 room 4 combat, L1 reward, L1 shop, L1 card), v0.5.39 schema 1 (reward), v0.5.44 schema 2 (camp), v0.5.87 schema 2 ×2 (from a whole old storage), **v0.5.165 schema 4 ×2 (network save + export — same-schema files from the previous round's build)**: 10/10 import -> stored schema 4 / v 4 -> load ok; catch-up exactly once where a run is active (L2 3 rooms -> 9 nodes per ally; L1 6 rooms -> 12; L1 1 room -> 2), 0 on camp / schema-4 files; second fresh page same hash 10/10; re-save + reload -> same hash and 0 further catch-ups 9/10 (the v0.5.87 Level-2 run is refused `locked` after the reload because my harness unlock is not persisted — the documented lock rule). PASS (§16.6, G4c.9, GP.11 migration part).
- G2.10 goldens: `node tools/gntM2-goldens.mjs` 9/9 match (run twice).

## Step 15 — G2.12, two tabs, mouse, gamepad, F9, network saves
- G2.12 (tools/gntcsave6-sc-g212.mjs; captures/gntcsave6-sc-g212.json): capture requested inside room_enter / shop_open / run_end listeners at 82 / 55 / 33 fps: capture tick = event tick 9/9, deferred 0 / continuations 0, never threw. PASS.
- Two tabs (tools/gntcsave6-sc-twotabs4.mjs; captures/gntcsave6-sc-twotabs4.json): tab A clears Level 1 + Quit to Lobby (storage hs 1, unlocks [1,2], clears {1:1}, abandoned 1); stale tab B resumes, plays (tick 63 -> 280), F5-reloads -> storage unchanged; tab A after reload: bestScore 1805, Level Select "LEVEL I … Cleared ×1", Level II open. PASS (SAVE4-F1 holds).
- Mouse (tools/gntcsave6-sc-mouse.mjs; captures/gntcsave6-sc-mouse.json): 8/8 trials on 6 trajectories (straight, fast, slow, L-shaped, arc, jittery) hit the intended slot; loaded position = intended (1.35, 1); Delete by mouse opens "Delete “Slot 4”?". PASS.
- Misc (tools/gntcsave6-sc-misc.mjs; captures/gntcsave6-sc-misc.json): F9 quickload exact (c2b97bff… tick 350, toast "Quickloaded"); gamepad Start -> pause -> Saves -> A on empty slot creates it -> A on filled -> overwrite confirm (Cancel focused) -> B cancels -> X -> delete confirm -> B backs out, no side effects. A room_enter autosave (auto-2 ok) shows NO saving indicator (only the older "Quickloaded" toast) — r4/r5 A3 unchanged, advisory.
- Network (own session server `node server/index.mjs --port 7847`, PID 93600 — stopped; tools/gntcsave6-sc-net.mjs; captures/gntcsave6-sc-net.json; 0 page errors): guest canSave {ok:false, "Only the host can save an online session"}, guest pause = Resume / Settings / Leave Session, guest F5 -> no toast, API save `not_allowed`; host autosaves + manual save carry meta.network true (four 32/32 builds); that file loaded offline -> net offline, owners [human, ai, ai, ai], builds kept, phase reward. PASS.

## Step 16 — save cost (paused Saves screen A/B, autosave A/B, latency)
- tools/gntcsave6-sc-hitch.mjs (captures/gntcsave6-sc-hitch.json): 8 idle windows max gap 18-55 ms (1 frame > 50) vs 8 manual-save windows 24-121 ms (2 frames > 50; the 121 ms is the FIRST save of the session), 0 long tasks.
- tools/gntcsave6-sc-autosaveab.mjs (captures/gntcsave6-sc-autosaveab.json): 7 room entries WITH an autosave (writeMs 3.2-6.4 ms; snap 0.4-1.1, jpeg 0.1-0.2, build 1.4-3.4, verifyWrite 1.8-3.0) max gaps 24-61 ms (2 > 50) vs 8 WITHOUT 24-61 ms (2 > 50): indistinguishable. G2.7 frame criterion met.
- tools/gntcsave6-sc-latency.mjs (captures/gntcsave6-sc-latency.json): manual save "Saving…" 17-38 ms after Enter, written + picture + toast 58-169 ms, second press -> overwrite confirm 8/8; F5 "Quicksaved" ≤ 111 ms. First two saves of the session max frame gap 194 / 266 ms (r4 A4 / r5: 314 / 311 ms) — advisory, paused screen, once per session.

## Step 17 — the SCREEN after a load (tools/gntcsave6-sc-uiresync.mjs; captures/gntcsave6-sc-uiresync.json, gntcsave6-uiresync-*-before/after.png; 0 page errors)
Moment built -> screenshot -> save -> tab reload -> title -> Load Game -> slot -> Enter (real keys) -> screenshot. Healer SWAP offer (Kindred Shield, Replaces moved to slot 3 Sanctuary, Tank "✓ Take", AI seats "AI ✓ Take"): the reward page returns identical (gntcsave6-uiresync-hswap-before.png vs -after.png: same title, same "Kindred Shield replaces Sanctuary — Sanctuary's 1 node go to the bench", same selection, same spoils line); runUi screen draft, reward.replace 2 both. Party shop: screen "shop", "THE PEDDLER'S SHELF", purse 72 / seat-2 purchase kept. Level-clear card: screen "transit", "LEVEL I CLEARED". PASS (PLAN §3.4 rule 5).

## Step 18 — load time, G2.11, undo-death
- G2.3 load time (tools/gntcsave6-sc-loadtime.mjs; captures/gntcsave6-sc-loadtime.json): cold tab, title -> Load Game -> slot -> Enter: restored (lastLoad = slot, app playing) L3 mid-combat 431 / 401 ms, L2 635 / 921 ms, L1 138 / 66 ms; sim ticking +30 ticks at 928 / 922, 1131 / 1420, 655 / 587 ms; hash = slot 6/6. PASS (≤ 1.5 s).
- G2.11 (tools/gntcsave6-sc-gates.mjs; captures/gntcsave6-sc-gates.json): saved ids [3..14] applied over live [0..9, 22..25] -> registry [3..14] ascending, same set, hash equal, 600-tick continuation equal (246 events each). PASS. Cold L3 title load 511 ms.
- Undo-death (tools/gntcsave6-sc-undodeath.mjs; captures/gntcsave6-sc-undodeath.json): L1 room 2 (auto-2 = room 2), whole party set to 0 HP -> defeat -> camp; records runs 1 / defeats 1; auto-1 = camp, **auto-2 still holds the dead run's room 2** -> load ok -> combat room 2 at full HP. Slay the Spire / Hades make a death final; with the user's manual slots this is a design choice — advisory (the records already counted the defeat).

## Step 19 — SAVE6-F1 by player input only + import on a new browser
- **Reproduction without the debug API** (tools/gntcsave6-sc-driftrepro.mjs; captures/gntcsave6-sc-driftrepro.json, gntcsave6-driftrepro-row.png / -after.png / -pause.png; input file captures/gntcsave6-drift-retired-skill.json = the genuine v0.5.165 export echoes-manual-1-2026-09-28_0703.json with the Healer's slot-2 skill id changed to "retired_skill" and the integrity hash recomputed, selfCheck true): fresh profile -> New Game -> Esc -> Save Game -> Import… (REAL file chooser) -> "Imported into “Drift: retired skill”" -> Load tab -> row "Level I · The Hollow Wood · Room 1 of 8 · Hunt" -> Enter -> confirm "Load “Drift: retired skill”? Anything since your last save will be lost." -> Enter: **2 uncaught page errors "Cannot read properties of undefined (reading 'id')", 0 ticks in 1 s, `state()` throws, the CAMP stays on screen with 0 Glint, Esc opens nothing (pause stack empty)** — the only way out is reloading the tab (gntcsave6-driftrepro-pause.png).
- **Import on a new browser** (tools/gntcsave6-sc-emptyimport.mjs; captures/gntcsave6-sc-emptyimport.json, gntcsave6-emptyimport-after-enter.png): with no saves in this browser the title's "Load Game — No saved games yet" is disabled (keyboard focus skips it, Enter/click do nothing) — the title offers no Import…; the only route is New Game -> Esc -> **Save Game** -> Import… -> Load tab. Export/import is the browser's truthful equivalent of copying a save folder to a new machine, and its main use (restoring a backup / moving to another browser, where there are by definition no saves yet) starts at a greyed-out Load Game. -> SAVE6-F3.

## Step 20 — BENCHMARK SCORING (checklist of step 1, scored only now)

| # | item | score | evidence |
|---|---|---|---|
| B1 | autosave at safe points only | MET | room_enter (capture = event tick 8/8 natural, 9/9 G2.12), shop_open, level_transit (574 = 574), run_end at camp, Save & Quit; none mid-fight (steps 11, 13, 14, 15) |
| B2 | resume exactly where you left (quit / close / reload) | MET | 13/13 bit-identical 600-tick continuations in page and after reload (step 4); Save & Quit -> reload -> Continue exact (steps 6, 13); screens return identical (step 17) |
| B3 | RNG streams saved, reload reproduces outcomes | MET | per-60-tick hashes + events equal 13/13; party stream per New Game (step 10) |
| B4 | crash-safe: a crash costs at most the current room; writes atomic | PARTIAL | atomic: close mid-save 7/7 previous-or-new, torn tmp promoted / truncated tmp discarded (steps 7-9); **crash: Continue resumed room 1 after a crash in room 2, reward + nodes + Glint lost; ~25 % of Level-1 play exposed (SAVE6-F2)** |
| B5 | previous-generation backup kept and offered | MET | .bak; "Slot 2 DAMAGED … Backup from 1 Oct 2026, 04:18 available" -> "Restore the backup?" -> "Backup restored — the slot is loadable again", hash af4b0dec… (captures/gntcsave6-sc-corrupt.json UI-damaged) |
| B6 | slot metadata (name, place, progress, playtime, date, picture) | MET | row + detail: name, level/room/mode, date + relative, playtime, 4-member HP / skill icons / nodes / Glint, 256×144 picture (steps 6, 10); forged meta displays (advisory A2) |
| B7 | overwrite asks, cancel leaves slot identical | MET | "Overwrite “Slot 1”? The save from … will be replaced." Cancel focused, hash kept (step 6) |
| B8 | delete asks, only that slot removed | MET | "Delete “Slot 3”? … This can't be undone." Cancel kept / OK removed every key (steps 6, 10, 15) |
| B9 | Continue = newest, Load = chosen slot | MET | title Load of non-newest slot exact 156 ms; reload + Load exact 259 ms; Continue labels (steps 6, 14, 18) |
| B10 | keyboard, mouse, gamepad; Esc/B backs out | MET | keys (step 6), mouse 8/8 trajectories, pad A/B/X/Start (step 15) |
| B11 | versioned schema, forward migration, newer refused | MET | 10 genuine files schema 1/2/3/4 from 5 builds migrate (step 14); schema 5 refused "made by a newer version of Echoes (schema 5, this build reads 4)" |
| B12 | integrity check; corrupt slot marked, others unaffected, never a crash | PARTIAL | checksum + key checks catch 16 corruption kinds, bystanders load 16/16 (step 7, corrupt json); **a file that passes those checks but names a skill / node the build does not know hard-locks the game with page errors (SAVE6-F1)**; metadata outside the checksum (A2) |
| B13 | storage full / unavailable reported, saves intact | MET | real quota: "Not enough browser storage — delete a slot or export saves to files", main intact; storage blocked / write-refused: honest "Saves last for this visit only (browser storage is off)" (step 12) |
| B14 | export / import round trip (portable save) | PARTIAL | real download + real chooser import, hash 67df1a0e… kept, bad files refused 5/5 (step 10); **on a browser with no saves the title's Load Game is disabled and there is no Import… anywhere but New Game -> Save Game (SAVE6-F3)** |
| B15 | meta progression / high scores persist independent of slots | MET | 310 / 0 / 10 802 exact, persist through reload, deleting every slot, second reload; two tabs never erase (steps 13, 15) |
| B16 | a saving indicator while autosaving | NOT MET | room_enter autosave shows no indicator (step 15) — advisory A3 |
| B17 | mid-combat save restores in-flight state | MET | combat moment with 6 skillbolts + bolt + zone + kegs, boss + adds, L3 hazards: 600 ticks identical (step 4) |
| B18 | a load never re-rolls rewards / shop or double-grants | MET | reward / shop / party-shop / swap moments identical after load; catch-up exactly once (steps 4, 14, 17) |

**Score: 14 met / 3 partial / 1 not met of 18 (14/18).**

## Step 21 — PLAN gates (literal)

| gate | result | evidence |
|---|---|---|
| G2.1 round trip at 8 moments across 3 levels + reload | PASS 13/13 | step 4 |
| G2.2 completeness | PASS | step 4 (full-capture hash equality + summary), step 6 positions |
| G2.3 slot menu, metadata, title Load ≤ 1.5 s | PASS (66-921 ms restored) | steps 6, 10, 18 |
| G2.4 corruption kinds detected, backup offered, 0 page errors, bystanders unaffected | PASS for the listed kinds; **content-id drift not detected -> page errors (SAVE6-F1)** | steps 7, 8, 19; corrupt json |
| G2.5 atomicity | PASS | torn writes promoted / discarded; close mid-save 7/7 |
| G2.6 export -> import keeps the hash | PASS | step 10 |
| G2.7 safe points only, no frame > 50 ms from an autosave | PASS (autosave A/B indistinguishable; writes 3.2-6.4 ms) | steps 13, 16 |
| G2.8 high scores | PASS | step 13 |
| G2.9 New Game = fresh boot | PASS (SAVE5-F1 fixed) | step 10 |
| G2.10 goldens | PASS 9/9 | step 14 |
| G2.11 registry order | PASS | step 18 |
| G2.12 capture point | PASS | step 15 |
| GC.9 campaign save / card / Continue / migration / level_transit autosave | PASS | step 14 |
| GP.11 carry + save | PASS | step 14 |
| §16.6 schema 4 + MIGRATIONS[3] + slot build lines | PASS (SAVE5-F2 fixed) | steps 10, 14 |

Builder claims re-measured: fix-M2-r5 SAVE5-F1 (fixed — true), SAVE5-F2 (fixed — true at 1024×576 / 1600×900 / 1920×1080 / 2560×1440), SAVE5-F3 (0 isReady errors on the save/load paths — true in every run this round); build-CAMPAIGN GC.9 and build-PARTY §16.6 / GP.11 — true.

## FINDINGS

### Must-fix
- **SAVE6-F1 — a save the loader accepts can hard-lock the game (content-id drift).** A file whose integrity hash is valid but whose Healer skill id (slot 0 or slot 1) or socketed node id is unknown to this build — exactly what a skill / node renamed or removed by a content update leaves in players' saves — imports "ok", loads "ok", then throws "Cannot read properties of undefined (reading 'id')" (getSkillSlots) / "(reading 'kind')" every frame: 0 ticks per second, `state()` throws, the camp stays on screen, and Esc opens a pause card with ZERO items or nothing at all. Only a tab reload escapes. Ally seats are sanitised (unknown skill -> null, 6 skills -> 4) and >4 Healer skills are refused with a clear message, so the gap is the Healer's skills and the socket assignments. Evidence: captures/gntcsave6-sc-crafted.json (healer_unknown_skill: 1 page error, 0 ticks), gntcsave6-sc-drift.json (3 of 13 cases: healer slot 0, slot 1 "retired_skill", L3 socketed node), gntcsave6-sc-driftrepro.json (player input only: Import… via the real file chooser -> Load -> 2 page errors, frozen, Esc dead), screenshots gntcsave6-drift-healer_unknown_skill.png, gntcsave6-drift-socket_unknown_node_L3.png, gntcsave6-driftrepro-pause.png. Repro file: captures/gntcsave6-drift-retired-skill.json.
- **SAVE6-F2 — a crash costs completed rooms, rewards and Glint (the 20 s write throttle holds safe-point captures in memory).** Renderer killed in room 2 (CDP Page.crash, no pagehide) -> Continue = "Level I · Room 1" -> room 1 start: the dewfall skill, bench [multiply, quicken] and 12 Glint gone (captures/gntcsave6-sc-crash.json, gntcsave6-crash-title.png). Natural autopilot Level 1 (captures/gntcsave6-sc-autothrottle.json): room_enter captures written 20.6 / 20.6 / 7.2 / 9.5 / 21.5 s after the room started (rooms 1-3 last 13-17 s), so ~52 s of a 207 s level (25 %) the disk is one or two completed rooms behind. The writes themselves cost 3.2-20.7 ms and are indistinguishable from no-autosave frames (captures/gntcsave6-sc-autosaveab.json), so the deferral buys nothing. Hades / Slay the Spire write at every chamber / floor; the benchmark requires crash-safe resume.
- **SAVE6-F3 — no Import on a browser that has no saves yet.** The title's "Load Game — No saved games yet" is disabled (focus skips it, Enter and click do nothing) and neither the title, Settings nor Records offers Import… (captures/gntcsave6-sc-emptyimport.json, gntcsave6-sc-settingsimport.json, gntcsave6-emptyimport-after-enter.png). A player restoring an exported backup on a new browser / computer — the reason export exists — must discover New Game -> Esc -> **Save Game** -> Import… -> Load tab. Navigation dead end on the platform's only save-portability path.

### Advisories
- A1 The level lock trusts the file's `harness` boolean: a `?level=3` save (harness true) loads Level 3 in a profile with only Level 1 open; the same file with harness false is refused `locked` (steps 7, 14; r4 A2 / r5 unchanged).
- A2 Slot metadata is outside the checksum and never re-derived on import: a camp file with forged meta shows "Level III · Room 8 of 8 · ◉ 9999 · Playtime 27 h 46 min" and loads into the camp with 0 Glint (captures/gntcsave6-sc-inject.json, gntcsave6-inject-loadlist.png).
- A3 Autosaves show no saving indicator (captures/gntcsave6-sc-misc.json; r4 / r5 A3).
- A4 First save of a session: 121-266 ms frame gap on the paused Saves screen (captures/gntcsave6-sc-hitch.json, -latency.json; r5 311-314 ms).
- A5 Harness-speed back-to-back API loads (4 loads ~150 ms apart) stall the page ("NO RESPONSE 5 s"; captures/gntcsave6-sc-corrupt.json partyTamper). Not reachable by F9 at 40 ms, pause-menu loads or Continue mashing (step 12).
- A6 No type validation after integrity: a string / null player position loads (3 NaN in the next capture), HP -50 and wallet -500 accepted, the Healer may hold the same skill twice (captures/gntcsave6-sc-crafted.json, -drift.json).
- A7 After a party wipe the dead run's room autosave stays loadable (records already counted the defeat) (captures/gntcsave6-sc-undodeath.json).
- A8 Exported files carry no picture — imported slots show "◇" (step 5).
- A9 Storage-off mode: the toast still says "Saved to “Slot 1”" (the header does say "Saves last for this visit only"); the header subtitle is ellipsised next to it (gntcsave6-nostorage-blocked-aftersave.png).
- A10 `window.__echoes.save.hash(tree)` ignores its argument (always the live capture) (captures/gntcsave6-sc-hashapi.json).
- A11 Level-clear card: "SOCKETS FILLED 1 / 16" next to a party row "Healer · 2 skills · 1/32" (captures/gntcsave6-sc-cards.json) — campaign card, not save.

## Processes
Own production preview `npx vite preview --outDir dist-gntcsave6 --port 4324` (PID 65756) and own session server on 7847 (PID 93600, stopped after step 15). dist-gntcsave6/ is git-ignored. No commits.

## VERDICT
FAIL — 3 must-fix (SAVE6-F1 content-id drift hard-lock, SAVE6-F2 crash loses completed rooms, SAVE6-F3 no import on a fresh browser). The engine is otherwise strong: 13/13 bit-identical round trips, 10 genuine old files migrate, all G2.* / GC.9 / GP.11 gates pass, SAVE5-F1/F2/F3 fixed. Benchmark 14/18.
