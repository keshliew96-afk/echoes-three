STATUS: COMPLETE
VERDICT: FAIL — B1-B6 all met, but one reproducible must-fix found by real input: a single WASD tap in the ~200 ms after a room clears moves the reward screen's focus from Take to Decline, so the documented "Enter commit" destroys the reward (12 of 12 rewards lost across two complete real-play runs).

# Full-Loop Certification — Block B, Round 3

Critic: fresh-context full-loop certification (block B r3), code at **v0.4.59**.
Dev server 127.0.0.1:5199 (shared, never restarted, no extra vite). Harness
`tools/cert-capture.mjs`, always `--timeout 180000`, 1600x900 headless SwiftShader.
All action files generated programmatically by `tools/certB3-*.mjs` (never hand-escaped);
all captures/actions prefixed `certB3-`. Nothing under `src/**`, `docs/BUILD_BRIEF.md`,
`docs/REFERENCE_BAR.md` or another critic's file was touched.

Generators: `tools/certB3-gen.mjs`, `tools/certB3-parts.mjs`, `tools/certB3-parts2.mjs`
(socket-aware blocks) and `tools/certB3-{recon,b1,b1b,scout,b2,stuck,sock,b2b,draftclick,
draftclick2,b2c,b2d,b34,b34b,b34c,b34d,defeat2,focus}.mjs`.

---

## Probe table

| Probe | Capture | Exit | Result |
|---|---|---|---|
| B1 camp -> portal -> run 1 | `certB3-b1b` | 0 | **PASS** |
| B2 rooms 1-8 by real play (certified run) | `certB3-b2d` | 0 | **PASS** |
| B2 earlier attempts (harness gaps, kept as evidence) | `certB3-b2`, `certB3-b2b`, `certB3-b2c` | 1 / 0 / 0 | see F1 + A1 |
| B3 defeat loop (run 2 of 3, enemy-dealt wipe) | `certB3-b34d`, `certB3-defeat2` | 0 | **PASS** |
| B4 third run freshness | `certB3-b34d` | 0 | **PASS** |
| B5 event integrity | `certB3-b2d`, `certB3-b34d` | 0 | **PASS** (advisories) |
| B6 console | all 18 `certB3-*` | 0 | **PASS** |
| Reward-focus isolation | `certB3-focus` | 0 | **F1 reproduced, 4 cases** |
| Socket-overlay recon | `certB3-sock`, `certB3-stuck` | 0 | advisory A1 |
| Screen-geometry scout | `certB3-scout` | 0 | click boxes |

---

## B1 — Camp -> portal by real WASD — PASS

`captures/certB3-b1b*`, boot `http://127.0.0.1:5199/?seed=777` (no `?room`).

| Measurement | Value |
|---|---|
| `campState` at boot | player (1.35, 1.00); portal (0, -6.9) r 1.9; hearth (0, -0.2) |
| Prompt / interaction key | `#camp-prompt` = "E  Begin Run · the wood is waiting" -> **E** |
| Walk | 6 real `KeyW` down/up presses (3043 ms) -> player (1.35, **-5.16**) |
| Prompt visible | `campState.inPortal true`, `promptVisible true`; DOM `display:flex`, rect **[474, 67, 404, 54]** |
| Press | `key KeyE` at tick 977 |
| Run starts | `run_start@989` seed 2947974146, `room_enter@989 {index:1, mode:"kill_all"}`, `room_start@989` — 12 ticks later |
| `runState` | `{active:true, room:1, rooms:8, mode:"kill_all"}` |

Shots `certB3-b1-prompt.png`, `certB3-b1-room1.png`. Repeated 5 more times across
`certB3-b34d` (runs 1/2/3: 6/7/7 presses, 3.0-3.5 s each) — the portal start is reliable.

Route note (harness, not a defect): stepping west first jams the walk on the hearth
collider at (0,-0.2) — 50 held-`KeyW` presses over 30.5 s moved the player only 1.77 u
(`certB3-b1.console.txt`, `[LOOP] walkToPortal iterations 50, 30522 ms, cond false`).
From the gate road at x = 1.35 the walk is clean.

## B2 — Rooms 1-8 by real play — PASS (`certB3-b2d`, exit 0)

Portal start by real input, then every room fought with WASD taps + held right mouse +
Digit1-4 + Space dodges (`fightBody`, ~0.9 s per iteration), allies dealing the damage.

| Room | Mode | Wall time | Ticks | Screens handled after it | Shot |
|---|---|---|---|---|---|
| 1 | kill_all | **13.6 s** | 791 | draft (Guardian Bond taken), path door 1 | `certB3-b2d-r1-cleared.png` |
| 2 | defend | **45.2 s** | 2675 | draft (Warding Aura taken), path | `certB3-b2d-r2-cleared.png` |
| 3 | kill_all | **12.0 s** | 696 | draft (node Sharpen taken) -> **SOCKETS chained**, path | `certB3-b2d-r3-socket.png` |
| 4 | kill_all | **11.0 s** | 635 | draft (node Echo), SOCKETS, path | `certB3-b2d-r4-socket.png` |
| 5 | kill_all | **18.6 s** | 992 | draft (node Echo), SOCKETS, path | `certB3-b2d-r5-socket.png` |
| 6 | defend | **45.6 s** | 2695 | draft (node Siphon), SOCKETS, **shop** | `certB3-b2d-r6-shop.png` |
| 7 | shop | 1.3 s transit | 70 | (shop handled at the r6 boundary) | `certB3-b2d-r7-enter.png` |
| 8 | boss | **18.3 s** | 984 | FELLED plate, add mop-up, Victory | `certB3-b2d-victory.png` |

Worst room 45.6 s — every room inside the 4-minute bar with ~3.9x margin.
No `killAllEnemies` / `killBoss` / `skipToRoom` / `endRun` touched this run.

- **Drafts**: 6 of 6 **taken** by real input (`ArrowLeft` to focus Take, then `Enter`);
  `draft_taken` at ticks 1938 / 4933 / 5968 / 7060 / 8473 / 11618, each paired with a
  same-tick `skill_equip` or `node_granted`. Final skills
  `[mending_bolt, swift_mend, guardian_bond, warding_aura]`, bench 5 nodes.
- **Socket screen** chained after each of the 4 node drafts; closed with a real `Escape`
  each time (`b2d-r{3,4,5,6}-socketClosed {open:false}`).
- **Path**: 5 real door clicks at (703,399) inside door-1 box (623,289,160,220) ->
  `path_chosen` @2061/5055/6220/7310/8714, sides all 0. Rooms 6->7 and 7->8 are fixed
  transitions with no path screen, per the brief.
- **Shop (room 7)**: wallet **72** on arrival (brief: 0 + 12x6 = 72). Real click on card 1
  (500,607) -> `node_granted{bounce}@11868`, wallet **72 -> 47**,
  `owned:["you own 1 · on the bench","you own 2"]`. Real click on Advance (800,769) -> room 8.
- **Boss (room 8)**: `boss_spawn@12009 {id:579}`. Banner timeline sampled at 100 ms:
  `THE HOLLOW STAG 1291/1800` -> **`THE HOLLOW STAG · FELLED` / `5 ADDS REMAIN`@12983** ->
  `THE HOLLOW STAG · FELLED` / `1 ADD REMAIN`@13084 -> cleared @13122. 3 quake cycles,
  3 add phases. Adds mopped up by real play, then the Victory plate.
- **Victory summary**: `{result:"victory", rooms:8, combatRooms:7, lastRoom:8, glint:59,
  seed:2947974146, ticks:12194, skills:[4], nodes.bench:[sharpen,echo,echo,siphon,bounce]}`.
- **Return to camp** by a real click on "Return to Camp" (708,511,185,42):
  `return_to_camp@13329`; camp with party **100/100, 150/150, 95/95, 80/80**, all alive,
  all on their exact seats, `seatDrift {0,0,0}`, skills reset to
  `[mending_bolt, swift_mend, null, null]`, bench `[]`, wallet 0,
  enemies/eshots/zones/azones/skillBolts/projectiles **all 0**, `visibleNumerals 0`
  (12 pooled `#dmg-num-layer` children, none visible), banner `""`, threat markers 0.
  Pixel proof `captures/certB3-b2d-backcamp.png`.

Real-input tallies over the certified run: `skill_cast 108, heal 99, ally_basic 239,
ally_cast 152, hit 300, death 75, enemy_spawn 75, boss_quake_start 3, boss_adds 3, mark 2`.

### B2 attempt 1 (`certB3-b2`) — blocked, cause = my missing socket branch, NOT the game

`[LOOP] screens-b2-r3 iterations 34, 91814 ms, cond false` — 33 door clicks + 33 `Enter`
presses over 91.8 s with no `path_chosen`. `captures/certB3-b2-r3-path.png` shows why: the
**SOCKETS** overlay was on top ("click a bench node, then a slot · **B/Esc close**"),
chained by the room-3 node draft. `#socket-screen` is a root div at **z-index 30** above
`#run-screen` (z 28) — `certB3-sock.console.txt` tag `after-B`: closed = class `""` rect 0x0,
open = class `"nd-open"` rect 1600x900, `Escape` closes it. Recorded as advisory A1
(`runUi().screen` still says `'path'`), not a game failure — the close key is on screen.

---

## F1 (MUST FIX) — one WASD tap at room-clear silently retargets the reward screen to Decline

Isolation probe `captures/certB3-focus.console.txt` (four legs, one variable, room cleared
with `killAllEnemies` so the only input is the tap under test):

| Leg | Input in the ~200 ms after `room_cleared` | Focused button on arrival | `Enter` result |
|---|---|---|---|
| A | **nothing** | `rn-btn rn-take rn-primary rn-focus` = **Take** | takes 0 -> **1**, `guardian_bond` equipped |
| B | one fresh **`KeyD`** tap (60 ms) | `rn-btn rn-decline rn-focus` = **Decline** | screen -> `path`, takes stays **1**, skills unchanged, `freeSkillSlots` unchanged — **reward destroyed** |
| C | one fresh **`KeyA`** tap | **Take** | takes 1 -> **2**, `spirit_bolt` equipped |
| D | `KeyD` tap, then `ArrowLeft` | Decline -> **Take** | takes 2 -> **3** |

At leg B, `runUi().held` = `[]` and `runUi().stale` = `[]` — the §18 held/stale gate does
not cover a *fresh* press landing in the screen's fade-in window, so the movement key is
consumed as the reward screen's "choose right".

Impact measured in real play, not just in the probe:

- `certB3-b2b` (complete 8-room run): **6 of 6 drafts destroyed** — zero `draft_taken` in the
  whole `B2-events` list, skills `[mending_bolt, swift_mend, null, null]` and
  `freeSkillSlots 2` from room 1 to the victory screen; summary `skills:["mending_bolt","swift_mend"]`.
- `certB3-b2c` (complete 8-room run, `Enter`-first handler): **6 of 6 destroyed**, `takes:0`
  at every `endRoom` probe, same final summary.
- `certB3-b2d` (same fight loop, but `ArrowLeft` pressed before `Enter`): **6 of 6 taken**.
  Its per-draft `focusOnArrival` dumps show `rn-decline rn-focus` at rooms **1, 3, 4, 6**
  and `rn-take rn-focus` at rooms 2 and 5 — i.e. the leak fired on 4 of 6 boundaries with
  an ordinary movement pattern.

So a player who is strafing when the last enemy dies loses that room's reward to the very
next `Enter`, which is the key the screen itself advertises ("Enter commit"). Twelve
rewards were lost across two otherwise-successful full runs.

Reproduce: `node tools/cert-capture.mjs shot certB3-focus --url "http://127.0.0.1:5199/?seed=777"
--settle 4000 --actions tools/actions/certB3-focus.json --timeout 180000`, leg B
(`clearRoom('clearB')` -> `key KeyD 60 ms` -> `focus('B-one-KeyD-tap')` -> `key Enter` ->
`focus('B-afterEnter')`). Full-run form: `tools/actions/certB3-b2c.json`, any room boundary.

Also proven inert/irrelevant so the fix does not chase the wrong thing: a click on the draft
**card body** does nothing at all (`certB3-draftclick` probe A, screen stays `draft`, no
event); clicking the **Take** button (728,536) takes correctly (probe B / L3); `Enter` alone
after a keyless clear takes correctly (probe C / L2).

---

## B3 — Defeat loop — PASS (`certB3-b34d`, run 2 of 3, exit 0)

Wipe hastened only by pinning HP at 2 % (`setHp(id, 0.02)`); **every killing blow was dealt
by an enemy** — no `downAll`, no `endRun`.

- Second run started from camp through the portal by real input: 7 `KeyW` presses (3398 ms),
  prompt visible, `KeyE` -> `run_start@1896 {seed:1050569501}`.
- Chain: `downed@2147/2148 (player 0)`, `downed@2206/2207 (2)`, `downed@2242/2243 (1)`,
  `downed@2337 (3)` -> **`run_end@2337 {result:"defeat"}`** -> `director_stop@2337` ->
  `revive@2337` x4 -> **`run_wiped@2337 {wallet:0}`** -> `defeat@2337 {reason:"all_downed"}`
  -> real click on "Return to Camp" -> **`return_to_camp@2461`**.
- Defeat plate (`certB3-b34d-run2-defeat.png`): "THE RUN ENDS ◆ ◆ ◆ … ROOMS CLEARED 0 / 8 ·
  GLINT EARNED 0 · SKILLS CARRIED 2 · NODES HELD 0 · RUN SEED 3134283868→1050569501 ·
  RUN LENGTH 7 s · Return to Camp · Enter return to camp".
- Camp after the defeat (`leak` dumps at arrival tick 2700 and +362 ticks tick 3062,
  identical): `campMode "camp"`, `runActive false`, phase `idle`, **party 100/100, 150/150,
  95/95, 80/80, none downed**, seated at (-1.95,0.5) / (2.3,0.2) / (-2.3,-2.5),
  `seatDrift {0,0,0}`, rigs all `idle`.
- **Zero leaks**: enemies 0, eshots 0, zones 0, azones 0, skillBolts 0, projectiles 0,
  `visibleNumerals 0` (9 pooled children), `hud.banner().text ""`, `threat.markersDrawn 0`,
  `domMarkers 0`, `socketOpen false`, `runUi().screen "none"`, wallet 0, skills reset.
- **Quiescence**: `newEventsSinceArrival 0` over 362 ticks in camp.
- Pixel proof `captures/certB3-b34d-run2-backcamp.png` — clean camp, four portraits with
  full bars, no revive rings, no prompts.

Independent confirmation with a different hastening pattern: `certB3-defeat2` (natural wipe
in room 1, 3 enemies alive) — same chain, camp party full HP, camp walk speed after the
defeat **2.06 u/s** vs fresh-boot **2.05 u/s** (identical), `camp-revive-dom count 0`.

## B4 — Third run freshness — PASS (`certB3-b34d`, run 3)

| Check | Value |
|---|---|
| Seeds | run 1 **2947974146**, run 2 **1050569501**, run 3 **486908871** — run 3 differs from run 2 and run 1 |
| bootSeed | 777 (`?seed=777`); run 1 via the portal is deterministic from it, runs 2 and 3 are not — the known advisory holds and the gate (2 != 3) is met |
| Room | `room 1`, `rooms 8`, `mode kill_all`, `clearedRooms 0`, `roomsDone 0` |
| Wallet | **0** (brief `starting_glint = 0`) |
| Party | 100/100, 150/150, 95/95, 80/80, none downed |
| Skill slots | `skillSlotCount` **4**, `[mending_bolt, swift_mend, null, null]`, `freeSkillSlots 2` (brief: 4 slots, `free = 4 - owned`) |
| Bench | `[]` |
| Room 1 fresh | **4 enemies** `[boar, mantis, mantis, boar]`, `wave_start index 0`, banner "WAVE 1/24 LEFT" |
| Frame | modes `[kill_all, defend, defend, kill_all, kill_all, kill_all, shop, boss]` — a different frame from run 1's `[kill_all, defend, kill_all, kill_all, kill_all, defend, shop, boss]` |
| Events since run start | exactly `run_start@3336`, `room_enter@3336 {index:1, wallet:0}`, `room_start@3336`, `wave_start@3336` |

## B5 — Event integrity — PASS (coherent), with advisories

Certified victory run `certB3-b2d`, full ordered list (64 events) in
`captures/certB3-b2d.console.txt`, tag `B2d-events`. Coherence checks:

- `run_start` exactly once and first; `return_to_camp` exactly once and last.
- 8 `room_enter` with indices 1..8 and wallets 0/12/24/36/48/60/72/47 (the 47 is the
  25-Glint shop spend) — the stipend is +12 per combat room, per the brief.
- Every combat room: `room_enter` -> `room_start` (same tick) -> `wave_start`(s) ->
  `room_cleared`. **No `room_cleared` before its `room_start` anywhere.**
- 6 `draft_taken`, each after its room's `room_cleared` and before the next `path_chosen`,
  each paired with a same-tick `skill_equip` or `node_granted`.
- 5 `path_chosen` (rooms 1-5 only) — correct, rooms 6->7 and 7->8 are fixed.
- **Exactly one `boss_spawn`** per full run (`@12009 {id:579}`).
- `run_end{result:"victory"}` after all room activity, then `return_to_camp`.
- Defeat runs (`certB3-b34d` run 1 + run 2, `certB3-defeat2`): `run_start -> room_enter ->
  room_start -> wave_start -> downed... -> run_end{defeat} -> director_stop -> revive x4 ->
  run_wiped -> defeat -> return_to_camp`. Coherent.

Advisories A3-A6 below cover the vocabulary/ordering warts (`boss_death`, `victory`,
`reward` and `shop_buy` are never emitted; `room_cleared{boss}` lands after `run_end`;
`downed` double-fires).

## B6 — Console — PASS

18 `certB3-*.console.txt` files: **0 `[PAGEERROR]`, 0 `[error]`** in every one.
The only `[warn]` in any capture is the single WebGL shader-compile block
(`X3595 gradient instruction used in a loop…` x2 + `X4000 use of potentially uninitialized
variable (f_ApplyFXAA)`) — advisory A7. The known `THREE.Material 'flatShading'` warnings
did not appear at all in this round.

Exit codes: 0 for all captures except `certB3-b2`, whose exit 1 is a `[HARNESS-ERROR]
Missing catch or finally after try` — a syntax bug in **my own** `waitFor` condition, not a
page error (that file also has 0 `[PAGEERROR]`).

---

## Advisories

- **A1** `E.runUi().screen` reports `'path'` (or `'shop'`) while the modal `#socket-screen`
  (z-index 30) is open above `#run-screen` (z 28) and owns all input. `runUi()` exposes no
  socket field at all (`screen, phase, room, fit, floors, typeAudit, wallet, freeSkillSlots,
  open, held, stale, text, subline, doors, buttons, cards, plaques, owned, fade, veil,
  shopAnim, shopPin`). Seen 5 times in `certB3-b2d` (`b2d-r{3,4,5,6}-socket`,
  `uiScreen:"path"/"shop"`) and in `certB3-sock` (`after-B`). Any critic or harness that
  trusts `runUi().screen` deadlocks here; `certB3-b2` lost 5 rooms to exactly that.
- **A2** `E.state().scene` stays `"camp"` for the entire run, rooms 1-8 (every snapshot in
  `certB3-b2b`/`b2c`/`b2d`). `E.cmd('campState').mode` does switch (`"camp"` / `"run"`) and
  is the reliable signal.
- **A3** No `boss_death` and no `victory` event is ever emitted; the Stag dies as a plain
  `death` and the run ends with `run_end{result:"victory"}`. `run_wiped{wallet:0}` also
  fires on a **win** (`certB3-b2d` @13122), so its name does not mean "party wiped".
- **A4** No `reward` event and no `shop_buy` event exist: a purchase surfaces only as
  `node_granted{bounce}@11868`, indistinguishable from a drafted node except by the bench
  `provenance` field. B5's requested `reward`/`shop_buy` subscriptions never fire.
- **A5** `room_cleared@13122 {mode:"boss"}` is delivered *after* `run_end@13122` /
  `run_wiped@13122` on the same tick; `boss_spawn@12009` precedes `room_start@12009`; the
  shop room emits `room_enter` but never `room_start`/`room_cleared`.
- **A6** `downed` double-fires — two identical events one tick apart for every ally except
  the last one down: `certB3-b34d` run 2 `downed@2147, 2148 (id 0)`, `@2206, 2207 (id 2)`,
  `@2242, 2243 (id 1)`, then a single `@2337 (id 3)`. `certB3-defeat2` and `certB3-b34`
  show the same shape; `certB3-b34` also double-fires `defeat@3190` and `defeat@3234`.
- **A7** Every capture logs one WebGL shader warning block (X3595 x2, X4000 FXAA).
- **A8** `E.cmd('downAll')` corrupts the post-defeat camp. In `certB3-b34` (runs 1 and 2)
  it left the whole party at **HP 0** with the healer still `downed:true` after the return
  to camp, and the run-end `revive@3190` x4 did not repair it (state unchanged 440 ticks
  later). `captures/certB3-b34-run2-backcamp.png` shows four leaked revive-channel rings
  with hold-`E` badges around the seated party (rings centred ~(520,225) r90, (505,405)
  r110, (795,440) r105, (890,390) r105; badges at (503,163), (490,338), (799,376),
  (886,320); portrait `E` badges at (562,828), (623,828), (679,828), (738,828)) and empty
  portrait bars — in a scene with no combat. Camp walk was also ~3x slower afterwards
  (19 loop presses / 9.49 s for the route that takes 6 presses / 3.02 s from a fresh boot).
  **Not player-reachable** — a natural, enemy-dealt wipe is clean (`certB3-b34d`,
  `certB3-defeat2`) — so this is a debug-command defect, not a gameplay one, but it will
  mislead any future critic that uses `downAll` to hasten a wipe.
- **A9** Defeat flavour text reads "The gods applaud." on the defeat plate
  (`certB3-b34d-run2-defeat.png`, `certB3-defeat2-defeatscreen.png`) — check that this is
  the intended line and not the victory string leaking.

## Screen geometry harvested (`certB3-scout`, cmd-driven scouting run, not the certified run)

draft card (630, 276..336, 340, 154..240) · **Take (662, 498..560, 132, 42)** ·
Decline (806, +2y, 132, 42) · path doors **(623,289,160,220)** / **(817,295,160,220)** ·
shop cards x = 360 / 660 / 960, y 459..524, w 280 · **Advance (650,748,300,42)** ·
end-screen **Return to Camp (708,511,185,42)** · socket overlay `#socket-screen.nd-open`,
bench row and slot cells reflow with the skill count (no stable coordinates — close it
with the on-screen `Escape`/`B`).
