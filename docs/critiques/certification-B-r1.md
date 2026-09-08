STATUS: COMPLETE
VERDICT: PASS

# Certification B round 1 — full-loop critic (certB1)

Build: v0.4.16 (src/** unchanged since 2026-09-03 20:57). Dev server 127.0.0.1:5199 (reused, never restarted).
Completed 2026-09-06 22:24 (+08:00) by the third instance of this critic (usage-limit kills on 09-05 and 09-06 00:27).

## Method / checkpoint notes

- Fresh instance 2026-09-06. A previous instance (usage-limit-killed 2026-09-05, prefix `certB1-r1*`) left a
  generator and a clean-exit log but NO report; its certified run ended in DEFEAT in room 8 (`run_end(defeat)@13161`,
  boss 327/1800, 3 allies down, ~12 heals in the boss room because each loop iteration cost ~840 ms). Its captures
  are NOT reused as evidence; only its proven click rects informed my generator.
- My files: generator `tools/certB1-fl-gen.mjs` -> `tools/actions/certB1-fl-main.json` (certified loop) and
  `tools/actions/certB1-fl-bossrecon.json` (policy validation only, cmd-driven, not evidence for B2);
  recon `tools/certB1-fl-recon-gen.mjs` -> `tools/actions/certB1-fl-recon.json` (field-shape dump);
  offline digest `tools/certB1-fl-report.mjs` (console.txt -> probe table, `captures/certB1-fl-main.report.txt`).
  Captures: `captures/certB1-fl-*` (+ `.console.txt`). Harness: `tools/cert-capture.mjs --timeout 180000`.
- Policy (real input only on certified runs): WASD held across the whole loop iteration; RMB held; Digit1-4 pressed
  when `remainingTicks===0` and an ally < 95 % (aimed heals aim at the lowest ally via the 12-point ring picked by
  bearing from the player's projected position); Space dodge on a telegraph resolving <= 30 ticks within its radius
  (+ one deliberate test dodge per room); E held 5.3 s stationary within 0.45 u of a downed ally when no hostile is
  within 1.4 u of it; boss room: post 1.8 u behind the allies' centroid, back off when the Stag is < 2.2 u, flee the
  quake ring. Screens: Take / door / shop card / Advance / Return to Camp are real clicks at the live rect.
- Resume 2026-09-06 22:19 (+08:00): generator validated on `certB1-fl-bossrecon2` (boss room to victory in 18.5 s by the
  real-input policy, 0 downed), reused unchanged. Certified loop:
  `node tools/cert-capture.mjs shot certB1-fl-main --url "http://127.0.0.1:5199/?seed=777" --settle 2500 --actions tools/actions/certB1-fl-main.json --timeout 180000`
  -> `captured 1 frame(s) (+59 shots)`, **exit 0**, `[GOTO] 16401 ms`, 807 evals, 10 loops, one page scope, 253 s of
  page time (boot tick 519 -> final tick 14470). No cmd touched run 1 or run 3; run 2 used `cmd('downAll')` once (permitted, to hasten the wipe).

## Verdict summary

| Probe | Result | Key evidence |
|---|---|---|
| B1 camp -> portal by WASD (x3) | PASS | walks 5.49 / 5.52 / 5.54 u in 206 / 193 / 207 ticks; `promptVisible true`, DOM `#camp-prompt` display flex opacity 1 box (574,67,404,54), chip "E"; real `KeyE` -> `run_start` 19 / 6 / 4 ticks later, `runState {active, combat, room 1, kill_all, wallet 0, freeSkillSlots 2}` |
| B2 rooms 1-8 by real play | PASS | 7 combat rooms cleared in 11.3 / 45.6 / 12.1 / 12.5 / 17.6 / 45.7 / 18.0 s (all < 4 min); 0 downed the whole run; 6 drafts, 4 socketings, 5 doors, 1 shop buy + Advance, boss FELLED + 4-add mop-up, Victory, Return to Camp — every one a real click/key |
| B3 defeat loop | PASS | run 2 via portal, 2 s real play, `downAll` -> `run_end(defeat)@13570`, real click Return to Camp -> `return_to_camp@13674 {enemies:0}`; camp: party 100/150/95/80 alive, seated (seatDrift 0, idle), leaks all 0, banner none/gated/opacity 0, threat markers 0 |
| B4 third run freshness | PASS | seeds 2947974146 -> 2829298529 -> 2575428333 (all distinct); party 100/150/95/80; skills [MB, SM, null, null], freeSlots 2, wallet 0, bench []; room 1 fresh (waves [3,3,3], cleared 0) |
| B5 event integrity | PASS | 3 ordered lists, 0 ordering violations; exactly 1 `boss_spawn`, `boss_death@12361` < `run_end(victory)@12601` = `run_wiped`; defeat run `downed x4 -> run_end(defeat) -> run_wiped -> defeat` |
| B6 console | PASS | 0 `[PAGEERROR]`, 0 `[error]`, 0 `[HARNESS-ERROR]`, 0 `[REQFAIL]`; warnings: MeshToon `flatShading` x576 (allowed) + 1 X3595/X4000 shader warning (known); exit 0 |

## B1 — camp -> portal by real WASD (`certB1-fl-r1-prompt.png`, `-r2-prompt.png`, `-r3-prompt.png`)

`cmd('campState')` at boot: player (1.35, 1), portal (0, -6.9) radius 1.9, `inPortal false`, `promptVisible false`,
prompt DOM `display none`, chip "E". The walk loop held W (and A once past z < -2.5) in 110 ms legs until `inPortal`:

| run | ticks | path (first -> mid -> last) | dist | prompt | press -> run_start |
|---|---|---|---|---|---|
| 1 | 566 -> 772 (206) | (1.35,1) -> (1.35,-1.92) -> (0.22,-4.37) | 5.49 u | visible, box (574,67,404,54), text "E Begin Run · the wood is waiting" | E @821 -> `run_start@834` (19 ticks / 326 ms), seed 2947974146 |
| 2 | 13036 -> 13229 (193) | (1.35,1) -> (1.35,-1.76) -> (0.26,-4.41) | 5.52 u | visible, box (572,67,404,54) | E @13280 -> `run_start@13293` (6 ticks), seed 2829298529 |
| 3 | 13968 -> 14175 (207) | (1.35,1) -> (1.35,-1.84) -> (0.24,-4.43) | 5.54 u | visible, box (575,67,404,54) | E @14228 -> `run_start@14241` (4 ticks), seed 2575428333 |

`lastBegin.deltaMs` (press -> start) 202 / 185 / 183 ms. Start events each time: `run_start, room_enter, room_start,
wave_start` on one tick. Pixels: `certB1-fl-r1-prompt.png` shows the amber-rimmed chip at x 580-980, y 72-118 with the
healer inside the violet portal ring (~790,330); `certB1-fl-r1-room1.png` is room 1 900 ms later (WAVE 1/2 · 5 LEFT,
threat pointers 4 drawn / 0 uncued).

## B2 — rooms 1-8 by real play (run 1, seed 2947974146; frame modes kill_all, defend, kill_all, kill_all, kill_all, defend, shop, boss)

| room | mode | loop wall | enter -> clear | party HP at clear | screens handled (real input) | snapshot deltas | shots |
|---|---|---|---|---|---|---|---|
| 1 | kill_all waves [5,4] | 9.4 s | 651 ticks / 11.3 s | 100/150/95/80 | draft Spirit Bolt: click Take (728,522) -> `draft_taken@1617:spirit_bolt`; path: click door 0 (703,399) -> `path_chosen@1731:side0` | wallet 0 -> 12, freeSlots 2 -> 1, skills +SB | `-r1-fight` `-r1-tele` `-r1-clear` `-r1-draft` `-r1-path` |
| 2 | defend waves [3,3,4,3] | 44.0 s | 2700 ticks / 45.6 s (timer) | 100/150/95/80, Waystone 140/150 | draft Warding Aura: click Take (728,534) -> `draft_taken@4572`; door 0 -> `path_chosen@4686` | wallet 12 -> 24, freeSlots 1 -> 0, skills +WA | `-r2-enter` `-r2-fight` `-r2-tele` `-r2-clear` `-r2-draft` `-r2-path` |
| 3 | kill_all [4,5] | 10.6 s | 705 / 12.1 s | 100/150/95/80 | draft Siphon (node): click Take (728,562) -> `node_granted@5521`; socket overlay: click bench card (380,246) + fitting cell (1127,324) -> **SOCKETED** MB.A=siphon, Esc; door 1 (897,405) -> `path_chosen@5765:side1` | wallet 24 -> 36; sockets MB [siphon,-] | `-r3-enter` `-r3-fight` `-r3-tele` `-r3-clear` `-r3-draft` `-r3-socket` `-r3-path` |
| 4 | kill_all [4,5] | 11.0 s | 723 / 12.5 s | 100/150/95/80 | draft Siphon: click Take (728,562) -> `node_granted@6627` (+ one redundant Enter, see advisory A2); socket: SM.A=siphon by clicks; door 0 -> `path_chosen@6868` | wallet 36 -> 48; SM [siphon,-] | `-r4-*` (7) |
| 5 | kill_all [5,4,3] | 15.9 s | 1027 / 17.6 s | 100/150/95/80 | draft Quicken: click Take (728,518) -> `node_granted@8043`; socket: MB.B=quicken (cell 1270,336); door 1 -> `path_chosen@8288` | wallet 48 -> 60; MB [siphon,quicken] | `-r5-*` (7) |
| 6 | defend [4,3,3,4] | 43.7 s | 2700 / 45.7 s (timer) | 100/150/95/80, Waystone 150/150 | draft Quicken: click Take -> `node_granted@11127`; socket: SM.B=quicken; no path (shop next) | wallet 60 -> 72; SM [siphon,quicken] | `-r6-enter` `-r6-fight` `-r6-tele` `-r6-clear` `-r6-draft` `-r6-socket` |
| 7 | shop | ~6 s | — | — | click Bounce card (528,390) -> `shop_purchase@11409 {bounce, 25, wallet 47}`, card SOLD; click Advance (800,570) -> `shop_close@11502` | wallet 72 -> 47; bench [bounce] | `-r7-shop` `-r7-shop-bought` |
| 8 | boss | 16.8 s | spawn@11520 -> `boss_death@12361` (841 ticks, 14.0 s) -> `run_end(victory)@12601` (mop-up 240 ticks) | 80/88/47.5/80 at run end (never downed) | adds at 0.75/0.5/0.25 @11699/11939/12179 (gaps 240/240), 3 quakes, 6 tramples; FELLED plate "THE HOLLOW STAG · FELLED / 4 ADDS REMAIN"; Victory card; click Return to Camp (800,530) -> `return_to_camp@12750` | wipe: wallet 0, freeSlots 2, skills [MB,SM], bench [], sockets [] | `-r8-enter` `-r8-fight` `-r8-adds` `-r8-tele` `-r8-felled` `-r8-clear` `-r1-end` `-r1-camp-after` |

Real-input evidence over the run (event counts from the bus): `basic_fire` 283 (RMB hold), `skill_cast` 52 (Digit1-4),
`heal` 56, `dodge_intent` 14 = `dash_end` 14 (Space), `intent_denied` 5, `hit` 290, enemy `death` 76. Deliberate dodge
tests per room: keydown -> `dashTicksLeft>0` observed in 3-5 ticks (poll 8 ms), intent 1-3 ticks after the press:
r1 @1021->1025, r2 @1986->1990, r3 @4931->4936, r4 @5979->5984, r5 @7075->7079, r6 @8501->8504, r8 @11764->11768.
HP persisted across boundaries (r8-enter 100/135/60.5/65 after the entry quake), cooldowns kept ticking across screens
(r3-done MB 168 / SM 112 / SB 169 remaining while the draft was up), sockets/bench persisted room to room and were
wiped at `run_end`. Boss room: `bossfx` FELLED frame `certB1-fl-r8-felled.png` — plate at (297,14,1006,35) reads
"THE HOLLOW STAG · FELLED" with an empty violet bar and "4 ADDS REMAIN"; four slate adds around the party, damage
numerals 9/14/12/11/11, heal numeral "+3"; analyzer >160 14.79 % / >200 3.42 % / 16/16 buckets / FLAT 3.63 %.
Victory card `certB1-fl-r1-end.png`: "VICTORY — ROOMS CLEARED 8/8, GLINT EARNED 59, SKILLS CARRIED 4, NODES HELD 5,
RUN SEED 2947974146, RUN LENGTH 196 s", kit line "Mending Bolt · Swift Mend · Spirit Bolt · Warding Aura · Bounce ·
Siphon · Quicken · Siphon · Quicken", Return to Camp button rect (708,511,185,42).

Gameplay-frame gates (analyzer): fight frames r1-r6 >160 10.5-20.1 %, >200 1.50-3.84 %, 15/16 buckets, FLAT 1.36-2.07 %,
danger 4-20 px (r6 1517 px = live Ember telegraph rings on the party, `certB1-fl-r6-fight.png` shows two rings at
(915-1010,570-640) and (985-1075,700-790)); boss frames >160 5.0-14.8 %, >200 2.08-4.04 %, 16/16, FLAT 3.6-9.0 %.

## B3 — defeat loop (run 2, seed 2829298529)

Portal by WASD + real E (table above). Real play 2 s: RMB held, W 300 ms, Digit2 then Digit1 (prewipe snapshot shows
MB 118 / SM 42 ticks remaining = both cast; `certB1-fl-r2-prewipe.png` WAVE 1/3 · 1 LEFT, SM slot counting "0.7").
`cmd('downAll')` @13569 (the only command on this run) -> `downed x4 @13570`, `run_end(defeat)@13570`,
`director_stop`, `run_wiped`, `defeat` (same tick). Defeat card `certB1-fl-r2-end.png`: "THE RUN ENDS — ROOMS
CLEARED 0/8, GLINT 0, SKILLS CARRIED 2, NODES HELD 0, RUN SEED 2829298529, RUN LENGTH 5 s"; real click Return to
Camp (800,530) -> `return_to_camp@13674 {enemies:0}`, scene camp / mode camp / phase idle / screen none in 0 ticks.
Camp audit 3 s later (`certB1-fl-r2-camp-after.png`, tick 13919): `enemies 0, eshots 0, zones 0, azones 0, skillBolts 0,
projectiles 0, entities 4, room null, boss null, healOverride null, domNumeralsVisible 0` (12 pooled numeral nodes, all
hidden); banner `{mode none, gated true, show false, text "", opacity 0}`; threat `{gated true, markersDrawn 0,
domMarkers 0, threats 0}`; hud `{combat false, runActive false, roomLive false, threatNodes 0}`; bus since return:
`{return_to_camp: 1}` only. Party 100/150/95/80, none downed, rigs at seats (healer 1.35,1; tank -1.95,0.5; swordsman
2.3,0.2; archer -2.3,-2.5), `seatDrift {0,0,0}`, anims idle; pixels show all four seated around the hearth with
the HUD back to MB/SM. The same audit after the victory run (`certB1-fl-r1-camp-after.png`) reads identically.

## B4 — third run (seed 2575428333)

`seedsAll [[834, 2947974146, 777], [13293, 2829298529, 777], [14241, 2575428333, 777]]` — runs 2 and 3 differ from
each other and from run 1. At `certB1-fl-r3-room1-live.png` (tick 14388, 2.4 s in): party 100/150/95/80 none downed;
skills `[[mending_bolt,0],[swift_mend,0],null,null]`, `freeSkillSlots 2`, wallet 0 (`cmd('wallet')` 0), bench [],
sockets empty; room 1 `kill_all`, waves [3,3,3], cleared 0, `clearedRooms 0`; enemies alive mantis (15 HP) + boar
(8 HP, already hit), WAVE 1/3 · 2 LEFT on the banner; a "30" numeral at (470,50).

## B5 — event integrity (armed via `E.on`, dumped per run by `window.__dumpRun`)

Run 1 (63 events): `run_start@834 room_enter(r1)@834 room_start@834 reward_offer@1485 room_cleared@1485 draft_taken@1617
path_offer@1617 path_chosen@1731 room_transition@1731 room_enter(r2)@1749 room_start@1749 … room_enter(r7:shop)@11145
shop_open@11145 shop_purchase@11409 shop_close@11502 room_transition@11502 room_enter(r8:boss)@11520 boss_spawn@11520
room_start@11520 boss_adds(0.75)@11699 boss_adds(0.5)@11939 boss_adds(0.25)@12179 boss_death@12361 run_end(victory)@12601
director_stop@12601 run_wiped@12601 room_cleared@12601` then `return_to_camp@12750`. Counts: room_enter 8, room_start 7,
room_cleared 7, reward_offer 6, draft_taken 6, path_offer 5 = path_chosen 5, shop_open/purchase/close 1 each,
boss_spawn 1, boss_adds 3, boss death 1, run_end 1, run_wiped 1. Checker: 0 violations (no cleared-before-start,
no draft without offer, no path without a draft decision, one boss_spawn in r8 only, boss_death before run_end(victory),
run_wiped not before run_end).
Run 2 (7): `run_start@13293 room_enter(r1)@13293 room_start@13293 run_end(defeat)@13570 director_stop@13570
run_wiped@13570 defeat@13570` + `return_to_camp@13674`. 0 violations.
Run 3 (3, still live at capture end): `run_start@14241 room_enter(r1)@14241 room_start@14241`. 0 violations.
(`reward_offer` and `room_cleared` share a tick, as do `run_end` and `room_cleared` in room 8 — see advisory A4.)

## B6 — console

`captures/certB1-fl-main.console.txt`: `[PAGEERROR]` 0, `[error]` 0, `[HARNESS-ERROR]` 0, `[REQFAIL]` 0; `[warn]` 577 =
576 x `THREE.Material: 'flatShading' is not a property of THREE.MeshToonMaterial` (allowed) + 1 x the X3595
gradient-in-loop / X4000 uninitialized `f_ApplyFXAA` shader info log (known since round A). `[DEBUG-API]
{version 0.4.16, tick 14470, fps 83.3, entities 8}`. Exit code 0 (`captures/certB1-fl-main.stdout.txt`). The two
recon captures (`certB1-fl-recon`, `certB1-fl-bossrecon2`) also exited 0 with the same warning set.

## Failures

None.

## Advisories (not blocking)

- **A1 `?seed=777` names the boot seed, not the first run's seed — but the first run IS deterministic.** `E.seed`/`bootSeed`
  read 777 at boot, yet the portal-started run 1 gets seed **2947974146 on every boot on record** (this run plus the
  09-04 `certB1-main`/`-mainB` and 09-05 `certB1-r1` logs, all `seed 2947974146, seedBefore 777`), with the identical
  room-mode frame; runs 2 and 3 are fresh each boot. Determinism checks via `?seed=` therefore hold for the first
  portal run, but the Victory/Defeat cards print `RUN SEED 2947974146`, not 777 — TESTING.md's "forces the run seed" is
  only true up to a fixed derivation. Cosmetic/debug-surface only.
- **A2 `runUi().screen` stayed `draft` for >= 1.3 s after `draft_taken@6627` (room 4) while the socket overlay was up**,
  whereas rooms 3/5/6 reported the underlying `path`/`shop` screen 700 ms after the Take click. My guard therefore pressed
  one redundant Enter (real key) which landed on the socket overlay and was inert (sockets before the chain identical to
  the room-3 result; `certB1-fl-r4-socket.png` shows the overlay with the Siphon bench card and no draft card behind it;
  the 109-tick snap->draft_taken delta matches the click-committed rooms' 103-132). Debug-API readout only.
- **A3 Camp frames exceed the Ember-danger budget with no enemy present**: `certB1-fl-boot.png` danger 952 px,
  `-r1-camp-after.png` 768 px, `-r2-camp-after.png` 810 px (bar < 500 px) — the hearth core and torch flames fall in the
  danger hue band (same observation as critic E's "boot-frame danger band 971 px from non-Ember sources"). Not a loop defect.
- **A4 Same-tick ordering in the bus**: `reward_offer` is listed before `room_cleared` on the same tick in every combat
  room (e.g. @1485), and in room 8 `run_end(victory)`/`director_stop`/`run_wiped` precede `room_cleared` on tick 12601.
  Semantically harmless (my checker keys on ticks), but a listener that assumes `room_cleared` arrives first would misread it.
- **A5 `state().room` is stale in the boss room**: at r8-enter it still reports room 6's descriptor
  (`mode defend, cleared true, waveIndex 3/4`) while `run.mode` is `boss` and `hud.roomLive false`; the boss room does
  not use the wave director. Debug snapshot only.

## Files

- Generator: `tools/certB1-fl-gen.mjs` -> `tools/actions/certB1-fl-main.json`, `tools/actions/certB1-fl-bossrecon.json`
- Digest: `tools/certB1-fl-report.mjs` -> `captures/certB1-fl-main.report.txt`
- Captures: `captures/certB1-fl-main.png` + `.console.txt` + `.stdout.txt`, `captures/certB1-fl-boot.png`,
  `certB1-fl-r{1,2,3}-prompt.png`, `certB1-fl-r{1,2,3}-room1.png`, `certB1-fl-r3-room1-live.png`,
  `certB1-fl-r{1..6}-{enter,fight,tele,clear,draft}.png`, `certB1-fl-r{1..5}-path.png`, `certB1-fl-r{3..6}-socket.png`,
  `certB1-fl-r7-shop.png`, `certB1-fl-r7-shop-bought.png`, `certB1-fl-r8-{enter,fight,adds,tele,felled,clear}.png`,
  `certB1-fl-r1-end.png`, `certB1-fl-r1-camp-after.png`, `certB1-fl-r2-prewipe.png`, `certB1-fl-r2-end.png`,
  `certB1-fl-r2-camp-after.png`; recon: `certB1-fl-recon*.png`, `certB1-fl-bossrecon*.png/.console.txt`.
