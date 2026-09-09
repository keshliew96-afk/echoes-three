STATUS: COMPLETE
VERDICT: PASS - B1-B6 all met at v0.4.43; 0 failures, 9 advisories

# Certification B round 2 — full-loop certification (critic)

Started: run in progress.

Build under test: **v0.4.43** (`[DEBUG-API] {"version":"0.4.43"}` in every console below).
Dev server 127.0.0.1:5199 reused, never restarted. Harness `tools/cert-capture.mjs --timeout 180000`.
Method copied from the round-1 B critic (docs/critiques/certification-B-r1.md): one page scope,
real input only on the certified runs, every click guarded by a live getBoundingClientRect
containment check with a logged `[FALLBACK]` to a real Enter key if the guard misses.

## Files

- Recon (NOT evidence, cmd-driven): `tools/certB2-recon-gen.mjs` -> `tools/actions/certB2-recon.json`
  -> `captures/certB2-recon*.png` + `.console.txt` (exit 0);
  `tools/certB2-recon2-gen.mjs` -> `tools/actions/certB2-recon2.json` -> `captures/certB2-recon2*.png` (exit 0).
- Certified generator: `tools/certB2-fl-gen.mjs` -> `tools/actions/certB2-fl-main.json` (288 top-level steps).
- Certified capture: `captures/certB2-fl-main.png` + `.console.txt` + `.stdout.txt`, plus `captures/certB2-fl-*.png` shots.

## Recon: live DOM rects re-measured at v0.4.43 (why the round-1 grids were re-calibrated)

| Screen | Element | rect (x,y,w,h) | centre | round-1 click point | round-2 click point |
|---|---|---|---|---|---|
| draft | `.rn-btn.rn-take` | 662,501,132,42 | 728,522 | 728 / row grid 470-640 | unchanged |
| path | door 0 `.rn-door` | 623,289,160,220 | 703,399 | 703,399 | unchanged |
| path | door 1 `.rn-door` | 817,295,160,220 | 897,405 | 897,405 | unchanged |
| shop | card 0/1/2 `.rn-card` | 360,524,280,167 / 660,524 / 960,524 | 500,608 / 800,608 / 1100,608 | 528,390 / 800,390 / 1072,390 (**moved**) | 500,608 / 800,608 / 1100,608 |
| shop | `.rn-advance` | 650,748,300,42 | 800,769 | row grid 530-630 (**moved**) | row grid 700-840 |
| end | `.rn-camp` | 708,511,185,42 | 800,532 | 800 / row grid 490-600 | unchanged |
| socket | `.nd-bench .nd-card` | 236,218,249,58 | 360,246 | x grid 300-1300 @ y246 | unchanged |
| socket | `.nd-cell` x8 | cx 1126/1272, cy 347/449/551/653 | — | x {1127,1270}, y 300-720 | unchanged |

Camp boot (`E.cmd('campState')` at tick 445, seed 777 / bootSeed 777): player (1.35, 1), portal (0, -6.9) r 1.9,
`inPortal false`, `promptVisible false`, prompt DOM `display none`, key chip **"E"**, text
"E Begin Run · the wood is waiting", `roadViolations 0`, colliders 31, seats drift 0.

## Certified capture (one page scope, one browser)

`node tools/cert-capture.mjs shot certB2-fl-main --url "http://127.0.0.1:5199/?seed=777" --settle 2500 --actions tools/actions/certB2-fl-main.json --timeout 180000`
-> `captured 1 frame(s) (+60 shots)`, **exit 0**, `[GOTO] 12149 ms / 112 requests`, boot tick 445 -> final tick 15468,
~256 s of page time. Three runs, all three started by real WASD + real KeyE at the portal. No cmd touched run 1 or run 3;
run 2 used `cmd('downAll')` once (permitted, to hasten the wipe).

## Verdict summary

| Probe | Result | Key evidence |
|---|---|---|
| B1 camp -> portal by WASD (x3) | PASS | walks 5.33 / 5.29 / 5.53 u in 151 / 198 / 192 ticks; `promptVisible true`, DOM `#camp-prompt` `display flex` `opacity 1` class `cp-on` box (567,67,404,54); chip "E"; real `KeyE` -> `run_start` 13 ticks later each time (`lastBegin.deltaMs` 196 / 191 / 197) |
| B2 rooms 1-8 by real play | PASS | 7 combat rooms cleared in 12.3 / 45.8 / 15.7 / 16.9 / 18.5 / 45.6 s + boss 16.7 s (all << 4 min); 0 downed, 0 revives needed; 6 drafts, 4 socketings, 5 doors, 1 shop buy + Advance, boss FELLED + add mop-up, Victory, Return to Camp — all real clicks/keys |
| B3 defeat loop | PASS | run 2 via portal, 2 s real play, `downAll@14557` -> `run_end(defeat)@14558`, real click Return to Camp (800,530) -> `return_to_camp@14670 {enemies:0}`; camp leaks all 0, banner opacity 0 / gated, threat markers 0, party 100/150/95/80 seated at exact seats, `seatDrift {0,0,0}` |
| B4 third run freshness | PASS | seeds 2947974146 -> 3960052136 -> 1608512557 (all distinct; runs 2/3 differ per the known first-run advisory); party 100/150/95/80; skills [mending_bolt, swift_mend, null, null], freeSlots 2, wallet 0, bench []; room 1 fresh waves [3,3,4], cleared 0 |
| B5 event integrity | PASS | 3 ordered lists dumped; exactly 1 `boss_spawn`, `boss_death@13269` < `run_end(victory)@13539`; no `room_cleared` before its `room_start`; defeat run `downed x4 -> run_end(defeat) -> run_wiped -> defeat` |
| B6 console | PASS | 0 `[PAGEERROR]`, 0 `[error]`, 0 `[HARNESS-ERROR]`, 0 `[REQFAIL]`; **1** `[warn]` total (the known X3595/X4000 shader info log); the round-1 flatShading warnings are gone (0 occurrences); exit 0 |

## B1 — camp -> portal by real WASD, run started by the prompt's own key

`certB2-fl-r1-prompt.png` / `-r2-prompt.png` / `-r3-prompt.png`. Boot `campState`: player (1.35, 1),
portal (0, -6.9) radius 1.9, `inPortal false`, `promptVisible false`, prompt DOM `display none`, chip "E".
The walk loop held W (and A once past z < -2.5) in 110 ms legs until `inPortal`:

| run | ticks | path (first -> mid -> last) | dist | prompt | press -> run_start | seed |
|---|---|---|---|---|---|---|
| 1 | 426 -> 577 (151) | (1.35,1) -> (1.35,-1.92) -> (0.29,-4.22) | 5.33 u | visible, box (567,67,404,54), class `cp-on`, opacity 1, chip "E" | KeyE @643 -> `run_start@656` (13 ticks, `deltaMs` 196) | 2947974146 |
| 2 | 14001 -> 14199 (198) | (1.35,1) -> (1.35,-1.68) -> (0.12,-4.15) | 5.29 u | visible, box (580,67,404,54) | KeyE @14269 -> `run_start@14281` (13 ticks, 191 ms) | 3960052136 |
| 3 | 14964 -> 15156 (192) | (1.35,1) -> (1.35,-1.92) -> (0.22,-4.41) | 5.53 u | visible, box (577,67,404,54) | KeyE @15222 -> `run_start@15235` (13 ticks, 197 ms) | 1608512557 |

Start events each time on one tick: `run_start, room_enter, room_start, wave_start`. `runState` immediately after:
`{active true, phase combat, room 1, mode kill_all, wallet 0, freeSkillSlots 2, clearedRooms 0}`.
Pixels (`certB2-fl-r1-prompt.png`): amber-rimmed "E" chip at x 588-620 / y 78-112, label "Begin Run · the wood is
waiting" running to x 950, healer standing inside the violet portal ring centred ~(770,300); version label `v0.4.43`
bottom-left; command bar with 2 filled + 2 empty skill slots and the SPC dodge chip.

## B2 — rooms 1-8 by real play (run 1, seed 2947974146; modes kill_all, defend, kill_all, kill_all, kill_all, defend, shop, boss)

| room | mode / waves | loop wall | enter -> clear | party HP at clear | screens handled (real input) | snapshot deltas | shots |
|---|---|---|---|---|---|---|---|
| 1 | kill_all [5,4] | 10.6 s | 703 ticks / **12.3 s** | 100/150/95/80 | draft Spirit Bolt: click Take (728,522) -> `skill_equip@1525` + `draft_taken@1525:spirit_bolt`; path: click door 0 (703,399) -> `path_chosen@1652:side0` | wallet 0->12, freeSlots 2->1, skills +SB | `-r1-fight` `-r1-tele` `-r1-clear` `-r1-draft` `-r1-path` |
| 2 | defend, 4 waves | 43.7 s | 2700 / **45.8 s** (timer), `softFailed false` | 100/150/95/80 | draft Sanctuary: click Take (728,522) -> `draft_taken@4520`; door 0 -> `path_chosen@4658` | wallet 12->24, freeSlots 1->0, skills +Sanctuary | `-r2-enter` `-r2-fight` `-r2-tele` `-r2-clear` `-r2-draft` `-r2-path` |
| 3 | kill_all | 14.2 s | 913 / **15.7 s** | 100/150/95/80 | draft Bounce (node): Take -> `node_granted@5765`; socket overlay: click bench card (380,246) + fitting cell (1127,336) -> **SOCKETED** MB.A=bounce, Escape; door 1 (897,405) -> `path_chosen@6080:side1` | wallet 24->36; MB [bounce,-] | `-r3-enter` `-r3-fight` `-r3-tele` `-r3-clear` `-r3-draft` `-r3-socket` `-r3-path` |
| 4 | kill_all [3,3,5] | 15.1 s | 980 / **16.9 s** | 100/150/95/80 | draft Multiply: Take (728,518) -> `node_granted@7248` (+ one redundant real Enter, advisory A2); socket: MB.B=multiply by clicks (340,246)+(1270,336); door 0 -> `path_chosen@7648` | wallet 36->48; MB [bounce,multiply] | `-r4-enter` `-r4-fight` `-r4-tele` `-r4-clear` `-r4-draft` `-r4-socket` `-r4-path` |
| 5 | kill_all [5,5,3] | 16.6 s | 1073 / **18.5 s** | 100/150/95/80 | draft Detonate: Take -> `node_granted@8886`; socket: SM.A=detonate (1127,438); door 1 -> `path_chosen@9215` | wallet 48->60; SM [detonate,-] | `-r5-*` (7 shots) |
| 6 | defend [3,3,4,3] | 43.6 s | 2700 / **45.6 s** (timer), Waystone 150/150, `softFailed false` | 100/150/95/80 | draft Bounce: Take (728,530) -> `node_granted@12059`; socket: SM.B=bounce (1270,438); no path (shop next) | wallet 60->72; SM [detonate,bounce] | `-r6-enter` `-r6-fight` `-r6-tele` `-r6-clear` `-r6-draft` `-r6-socket` |
| 7 | shop | ~6 s | — | — | click Quicken card (500,608) -> `shop_purchase@12326 {quicken, 25, wallet 47}`, card stamped SOLD (opacity 0.62 / `saturate(0.55)`); click Advance (800,768) -> `shop_close@12437` | wallet 72->47; bench [quicken] | `-r7-shop` `-r7-shop-bought` |
| 8 | boss | 16.7 s | `boss_spawn@12455` -> `boss_death@13269` (814 ticks) -> `run_end(victory)@13539` (mop-up 270 ticks) | 100/150/95/80 at run end, **0 downed all run** | adds at 0.75/0.5/0.25 @12642/12882/13122 (gaps 240/240), 3 quakes, 6 tramples; FELLED plate at t13287 "THE HOLLOW STAG · FELLED / 3 ADDS REMAIN", still FELLED with "1 ADD…" at t13489; Victory card; click Return to Camp (800,530) -> `return_to_camp@13711` | run wiped: wallet 0, freeSlots 2, skills [MB,SM], bench [], sockets [] | `-r8-enter` `-r8-fight` `-r8-quake` `-r8-adds` `-r8-tele` `-r8-felled` `-r8-clear` `-r1-end` `-r1-camp-after` |

Every combat room cleared far inside the 4-minute gate (worst 45.8 s, a defend room ending on its own timer).
Real-input evidence over run 1 (bus counts): `basic_fire` 301 (RMB hold), `skill_cast` 72 (Digit1-4), `heal` 65,
`dodge_intent` 14 = `dash_end` 14 (Space), `intent_denied` 9, `hit` 303, enemy `death` 83, `wave_start` 19.
Deliberate dodge test per room — real Space press, then poll (8 ms) to the first `dashTicksLeft>0`:
r1 848->851 (3 ticks), r2 1876->1880 (4), r3 4878->4884 (6), r4 6336->6340 (4), r5 7877->7882 (5), r8 12724->12728 (4).
Command audit of `tools/actions/certB2-fl-main.json`: `killAllEnemies` 0, `killBoss` 0, `skipToRoom` 0, `endRun` 0,
`startRun` 0, `setHp` 0, `teleport` 0, `heal` 0, `grantNode` 0, `giveSkill` 0 — the only mutating command anywhere in
the file is a single `downAll` (run 2, B3).

Gameplay-frame analyzer (gates: >160 >= 1.5 %, >200 >= 0.4 %, >= 13/16 buckets, FLAT < 20 %):

| frame | >160 | >200 | buckets | FLAT | danger px |
|---|---|---|---|---|---|
| `certB2-fl-r1-fight.png` | 2.903 % | 0.590 % | 15/16 | 1.42 % | 32 |
| `certB2-fl-r2-fight.png` | 3.498 % | 0.844 % | 16/16 | 1.32 % | 157 |
| `certB2-fl-r5-fight.png` | 1.960 % | 0.610 % | 15/16 | 1.51 % | 3016 (live telegraphs) |
| `certB2-fl-r6-fight.png` | 2.289 % | 0.912 % | 15/16 | 1.28 % | 350 |
| `certB2-fl-r8-fight.png` | 3.438 % | 1.418 % | 16/16 | 1.24 % | 14942 (boss quake ring) |
| `certB2-fl-r8-felled.png` | 6.241 % | 2.311 % | 16/16 | 1.65 % | 7724 |
| `certB2-fl-r7-shop-bought.png` | 2.424 % | 0.607 % | 16/16 | 1.58 % | 37 |

All pass. No-threat frames (camp) sit inside the Ember-danger budget: `certB2-fl-boot.png` **130 px**,
`-r1-camp-after.png` **208 px**, `-r2-camp-after.png` **217 px** (bar < 500) — round-1 advisory A3 (768-952 px) is fixed.

## B3 — defeat loop (run 2, seed 3960052136)

Portal by WASD + real E (B1 table). Real play ~2 s: RMB held, W 300 ms, Digit2 then Digit1 — `certB2-fl-r2-prewipe.png`
at tick 14511 shows WAVE 1/2 · 3 LEFT with MB 118 / SM 41 ticks remaining (both cast) and 3 azones + 2 skillBolts live.
`cmd('downAll')@14557` (the only command on this run) -> `downed x4 @14558`, `run_end(defeat)@14558`, `director_stop`,
`run_wiped`, `defeat` (all same tick). Defeat card `certB2-fl-r2-end.png`: "THE RUN ENDS — ROOMS CLEARED 0/8, GLINT 0,
SKILLS CARRIED 2, NODES HELD 0, RUN SEED 3960052136, RUN LENGTH 5 s", veil tone `rn-open rn-defeat`. Real click
Return to Camp (800,530) -> `return_to_camp@14670 {enemies:0}`; `campState.mode camp`, `run.phase idle`,
`runUi().screen none` reached in 3 ms.

Camp audit 3 s later (`certB2-fl-r2-camp-after.png`, tick 14911): **leaks all zero** —
`enemies 0, eshots 0, zones 0, azones 0, skillBolts 0, projectiles 0, entities 4, room null, boss null,
healOverride null, domNumerals 12 pooled / domNumeralsVisible 0`; `banner {mode none, gated true, show false,
text "", opacity 0}`; `threat {gated true, markersDrawn 0, domMarkers 0, uncued 0, threats 0}`;
`hud {combat false, runActive false, roomLive false, threatNodes 0}`; bus since return = `{return_to_camp: 1}` only.
Party 100/150/95/80, none downed, rigs at their exact seats (healer 1.35,1; tank -1.95,0.5; swordsman 2.3,0.2;
archer -2.3,-2.5), `seatDrift {0,0,0}`, all anims `idle`. Pixels confirm four upright critters on their identity
rings around the hearth (badger ~(505,385), fox ~(875,375), hare ~(515,205), healer ~(795,415)), 0 GLINT, no banner,
no numerals. The post-victory audit (`-r1-camp-after.png`, tick 13949) reads identically.

## B4 — third run (seed 1608512557)

`seedsAll [[656, 2947974146, 777], [14281, 3960052136, 777], [15235, 1608512557, 777]]` — runs 2 and 3 differ from each
other and from run 1 (the first portal run reusing a fixed derivation of the boot seed is the known advisory A1).
At `certB2-fl-r3-room1-live.png` (tick 15386, 2.5 s in): party 100/150/95/80 none downed; skills
`[[mending_bolt,0],[swift_mend,0],null,null]`, `freeSkillSlots 2` (BUILD_BRIEF: 4 slots, `free_skill_slots = 4 - owned`;
Mending Bolt "start, slot 1", Swift Mend "start, slot 2"), wallet 0 and `cmd('wallet')` 0 (brief `starting_glint 0`),
bench [], sockets all null; room 1 `kill_all` waves [3,3,4], `clearedRooms 0`, enemies boar 20 HP + mantis 3 HP,
banner "WAVE 1/3 · 2 LEFT", a "30" numeral at ~(310,705), one threat pointer drawn at ~(385,875).
Wallet economics matched the brief on run 1 too: +12 per combat-room clear -> exactly **72** at the shop, prices
25/30/35, wiped to 0 at run end.

## B5 — event integrity (armed via `E.on`, dumped per run, machine-checked by `tools/certB2-events.mjs`)

Run 1 (63 events): `run_start@656 room_enter(r1:kill_all)@656 room_start@656 reward_offer@1359 room_cleared@1359
draft_taken@1525 path_offer@1525 path_chosen@1652 room_transition@1652 room_enter(r2:defend)@1670 room_start@1670 ...
room_enter(r7:shop)@12077 shop_open@12077 shop_purchase@12326 shop_close@12437 room_transition@12437
room_enter(r8:boss)@12455 boss_spawn@12455 room_start@12455 boss_adds(0.75)@12642 boss_adds(0.5)@12882
boss_adds(0.25)@13122 boss_death@13269 run_end(victory)@13539 director_stop@13539 run_wiped@13539 room_cleared@13539`
then `return_to_camp@13711`. Counts: room_enter 8, room_start 7, room_cleared 7, reward_offer 6 = draft_taken 6,
path_offer 5 = path_chosen 5, shop_open/purchase/close 1 each, **boss_spawn 1**, boss_adds 3, boss_death 1,
run_end 1, run_wiped 1.
Run 2 (7): `run_start@14281 room_enter(r1)@14281 room_start@14281 run_end(defeat)@14558 director_stop@14558
run_wiped@14558 defeat@14558` + `return_to_camp@14670`.
Run 3 (3, still live at capture end by design): `run_start@15235 room_enter(r1)@15235 room_start@15235`.

`node tools/certB2-events.mjs` applies 12 rules (run_start first; every room_cleared after a room_start; every
room_start after a room_enter; draft_taken after reward_offer; path_chosen after path_offer; shop open<purchase<close;
at most one boss_spawn and exactly one if room 8 was entered; boss_adds/boss_death after boss_spawn; exactly one
run_end; victory requires a preceding boss_death; run_wiped never before run_end; nothing unexpected after run_end;
monotonic ticks): **runs 1 and 2 report `violations: NONE`.** Run 3 trips only rule 9 ("run_end count 0") because that
run was deliberately left live when the capture ended — a checker artifact, not a game defect.

## B6 — console

`captures/certB2-fl-main.console.txt` (787 lines): `[PAGEERROR]` **0**, `[error]` **0**, `[HARNESS-ERROR]` **0**,
`[REQFAIL]` **0**; `[warn]` **1** = the known X3595 gradient-in-loop / X4000 uninitialized `f_ApplyFXAA` shader info
log. The `THREE.Material 'flatShading' is not a property of THREE.MeshToonMaterial` warnings allowed by the brief no
longer appear at all (0 occurrences, vs 576 in round 1). `[DEBUG-API] {version 0.4.43, tick 15468, fps 82.6,
entities 8}`. Exit code 0 (`captures/certB2-fl-main.stdout.txt`). Both recon captures also exited 0 with the same
single warning.

## Failures

None.

## Advisories (not blocking)

- **A1 `?seed=777` names the boot seed, not the first run's seed.** `E.seed`/`bootSeed` read 777 at boot, yet the
  portal-started run 1 gets seed **2947974146** — the same value the round-1 critic recorded on every boot. Runs 2
  and 3 are fresh each boot (3960052136, 1608512557). The Victory card therefore prints `RUN SEED 2947974146`, not
  777. Known/expected per the task brief; debug-surface only.
- **A2 `runUi().screen` stays `draft` while the socket overlay is up** (recurrence of round-1 A2). In room 4 the
  guarded click landed inside the live Take rect (662,498,132,42; click at 728,518) and committed —
  `node_granted@7248` + `draft_taken@7248:multiply` with `socketOpen true` — but 700 ms later `runUi().screen` still
  read `draft`, so the generator logged `[FALLBACK]` and pressed one extra real Enter, which landed on the socket
  overlay and was inert (bench held exactly one node, exactly one `draft_taken` for the room, sockets went
  [bounce,null] -> [bounce,multiply]). Rooms 3/5/6 reported the underlying screen within 700 ms. Readout only.
- **A3 `E.state().scene` is hard-wired `"camp"`.** All 31 snapshots — including mid-combat in rooms 1-8 and the boss
  room — report `scene:"camp"`. The field cannot distinguish camp from an arena, so the B3 "camp scene active" check
  had to rest on `cmd('campState').mode==='camp'`, `run.phase==='idle'`, `runUi().screen==='none'` and the pixels.
- **A4 Same-tick bus ordering** (recurrence of round-1 A4): `reward_offer` is listed before `room_cleared` on the same
  tick in every combat room (e.g. @1359), and in room 8 `run_end(victory)`/`director_stop`/`run_wiped` precede
  `room_cleared` on tick 13539. Harmless to a tick-keyed listener; misleading to an order-keyed one.
- **A5 The Victory card is the flattest frame in the set.** `certB2-fl-r1-end.png` FLAT **32.62 %**, buckets 13/16,
  amber 814179 px — a full-screen amber wash behind the card (the defeat card is 8.93 %). Meta screens sit outside
  the gameplay gate, but this is the one frame that would fail REFERENCE_BAR check 1 if judged as a frame. A-block.
- **A6 Boss-room minimum instantaneous fps sample 43.5** (`fpsMin` r8 43.5; r4 49.3, r5 49.5, r6 50.3, r2 49.5,
  r3 55.2, r1 58.1). These are single ~120 ms poll samples of the smoothed counter taken while the dev server was
  shared with other agents, not a sustained measure — the D critic's dedicated probe read 82-95 fps in the boss room.
  D-block territory; recorded here only because it was observed.
- **A7 Defeat flavour line reads "The gods applaud."** on the THE RUN ENDS card (`certB2-fl-r2-end.png`, sub-line
  rect ~(621,278,358,21)), where the Victory card reads "The Hollow Stag falls. The wood breathes out." Reads like
  victory-side copy on the defeat screen. Text only.
- **A8 Party silhouettes fuse into one white bloom under simultaneous casts in the boss room** —
  `certB2-fl-r8-felled.png`, blob at roughly (700,400)-(950,560): the individual critters and their identity rings
  are unreadable there, while the damage numerals (11 / 10 / 12) and the green Sanctuary zone at (950,540)-(1170,720)
  stay legible. A-block (matches the round-1 scorers' "party fuses into a bloom blob under casts"); no loop effect.
- **A9 Improvements confirmed since round 1** (recorded so the next round does not re-litigate them): camp
  Ember-danger band 768-952 px -> 130-217 px; the shop is no longer a charcoal modal hiding the party
  (FLAT 52.9 % -> 1.58 %, all four critters visible above the shelf in `certB2-fl-r7-shop-bought.png`); the 576
  MeshToonMaterial flatShading warnings are gone.

## Files

- Generators: `tools/certB2-fl-gen.mjs` (certified), `tools/certB2-recon-gen.mjs`, `tools/certB2-recon2-gen.mjs` (recon)
- Checker: `tools/certB2-events.mjs`
- Action files: `tools/actions/certB2-fl-main.json` (288 top-level steps), `tools/actions/certB2-fl-bossrecon.json`
  (generated but not run), `tools/actions/certB2-recon.json`, `tools/actions/certB2-recon2.json`
- Captures: `captures/certB2-fl-main.png` + `.console.txt` + `.stdout.txt`, `captures/certB2-fl-boot.png`,
  `certB2-fl-r{1,2,3}-prompt.png`, `certB2-fl-r{1,2,3}-room1.png`, `certB2-fl-r3-room1-live.png`,
  `certB2-fl-r{1..6}-{fight,tele,clear,draft}.png`, `certB2-fl-r{2..6}-enter.png`, `certB2-fl-r{1..5}-path.png`,
  `certB2-fl-r{3..6}-socket.png`, `certB2-fl-r7-shop.png`, `certB2-fl-r7-shop-bought.png`,
  `certB2-fl-r8-{enter,fight,quake,adds,tele,felled,clear}.png`, `certB2-fl-r1-end.png`,
  `certB2-fl-r1-camp-after.png`, `certB2-fl-r2-prewipe.png`, `certB2-fl-r2-end.png`, `certB2-fl-r2-camp-after.png`;
  recon: `captures/certB2-recon*.png`, `captures/certB2-recon2-socket.png`
