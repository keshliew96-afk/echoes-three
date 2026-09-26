STATUS: COMPLETE
VERDICT: FAIL — 3 must-fix. J3-F1: saves taken on a Level-N setting-out card are labelled "Level N cleared — on the road to the next level" (slot row, Load detail, title Continue) although Level N was never played (real player path, prod). J3-F2: boot dead air — 2.0 s (warm) / 3.6–4.6 s (cold) of a blank Void-Charcoal page on the production build before any feedback, then the raw camp render flashes before the loading splash fades in. J3-F3: New Game after "Save & Quit" asks nothing, and the Save & Quit autosave (the only copy) is rotated out by the new game's 2nd autosave — the saved campaign is silently lost. Everything else in the linear-campaign journey is seamless by real input on dev AND production (prod journey 86/90, all 4 misses triaged; MP 9/9; regression 8 rooms 0 debug clears, pause on 8 page types, telegraphs ≥ 42 t, REFERENCE_BAR 18/18/19, quiet-machine frames 0 > 100 ms), 0 page errors. Benchmark 16 met / 2 partial / 2 not met of 20.

# Critic — JOURNEY, gauntlet round 3 (linear campaign) — v0.5.94 (HEAD 027850e, branch gauntlet)

Fresh-context harsh critic. Judged only the running game (pixels, console, debug-API reads, storage, network). Every file I created is prefixed `gntcjourney3-` (tools/, captures/). No src/**, server/**, PLAN, BUILD_BRIEF or other agents' files touched; nothing committed.

## Verdict: FAIL (3 must-fix)

| ID | Must-fix | Evidence (numbers + captures) | Reproduce | Suspect files |
|---|---|---|---|---|
| **J3-F1** | A save made on the **setting-out card** of a Level-N start is described as "Level N cleared — on the road to the next level"; the title then offers "Continue — Slot 1 · Level II cleared". The state itself restores correctly — only the description lies (G2.3 metadata / GC.9 / B9). | Prod, pure player path: Level 1 cleared by real input → pause → Quit to Lobby → map table E → Level Select → Level II → Enter; on the card pause → Load Game: autosave **auto-2** (meta phase `transit`, level 2, room 0) row "Autosave · **Level II cleared** — on the road to the next level" and detail "Where: Level II cleared…" (captures/gntcjourney3-prod-O-depart-saves.png, journey-prod.json O1b). Manual Slot 1 on the same card → row "Level II cleared — on the road to the next level", title "Continue · Slot 1 · Level II cleared · just now" (captures/gntcjourney3-dev-departsave-title.png, probes-dev.json departSave). A clear card (L1→L2) is described correctly ("Level I cleared"). | New Game → clear L1 (or `campaign.unlock([1,2])`) → Level Select → Level II → Enter → Esc → Save Game → Slot 1 → Quit to Title → read Continue. `tools/gntcjourney3-probes.mjs --legs departsave` | src/save/index.js / src/save/meta (caption from `phase==='transit'` without the card's `kind` depart vs clear), src/ui/menu/saves.js, src/ui/menu/title.js, src/sim/run.js (card kind in the captured meta) |
| **J3-F2** | **Boot dead air + scene flash.** The production build shows nothing but a flat Void-Charcoal page for 2.0–2.15 s warm / 3.6–4.6 s cold (localhost, quiet machine) before any logo, text or progress; the first content frame is the raw live camp render with no overlay, and only then does the "ECHOES · Lighting the hearth…" splash fade in over it. Benchmark B1 (Hades/Dead Cells/StS show a logo or loader within ~1 s); a first-time player sees an apparently dead page. | captures/gntcjourney3-bootframes-prod-quiet2.json: rep 1 frames at 36 ms luma 18 → 67 ms luma 31 (flat, bootframe-1.png) → next frame 2146 ms = full camp render (bootframe-2.png) → splash fading in (bootframe-5.png); rep 0 (cold) first frame 3715 ms. boot-prod-quiet.json: FCP 4616 / 1952 / 1780 ms, splash 4557 / 1943 / 1771 ms, "press any key" 7814 / 3174 / 2984 ms; 592 KB transferred. Under the concurrent-agent load FCP was 6.6 s, ready 11.7–14.5 s. | `npm run build` → `vite preview` → `node tools/gntcjourney3-bootframes.mjs http://127.0.0.1:<port> prod` (CDP screencast luma) | index.html (no static loader/HTML splash before the JS bundle), src/main.js boot order, src/app (loading screen fades in from opacity 0 over an already-rendered camp frame) |
| **J3-F3** | **Silent loss of a saved campaign.** "Save & Quit to Title" writes the run only into the 2-slot autosave rotation; **New Game** on the title (focus lands one Down from Continue) starts a fresh world with **no confirmation**, and the new game's 2nd autosaved room overwrites the last copy of the saved campaign. PLAN §0 "state is never silently lost"; benchmark B4 (StS asks "Abandon run?"). | captures/gntcjourney3-newgame2-prod.json: campaign A L1 room 4 (Glint 36, seed 2575734311) → Save & Quit → title "Continue — Autosave · Level I · The Hollow Wood · Room 4" → New Game: stack [] → playing (no dialog, newgame-prod.json) → campaign B: after room 2 auto-1 = B (seed 1110681614), after room 3 auto-2 = B → campaign A gone (autosaveLog: room_enter writes at 50.2 s and 84.7 s). | Title with a Save & Quit autosave → New Game → Begin Run → play ~2 rooms (≥ the autosave throttle) → Load Game shows no trace of the old campaign. `tools/gntcjourney3-newgame2.mjs` | src/ui/menu/title.js (New Game handler: confirm when `save.latest()` is a live run), src/app/app.js `newGame`, src/save/autosave.js (Save & Quit record rotates like any autosave; a protected "suspended run" slot or skipping rotation onto it would also fix it) |

## Blind benchmark checklist — scored (checklist written first, Step 1 below)

| # | Item | Score | Evidence |
|---|---|---|---|
| B1 | Feedback ≤ ~1 s, no blank frame without progress | **NOT MET** | J3-F2: 2.0 s warm / 3.6–4.6 s cold blank page, raw-scene flash |
| B2 | Title: Continue first when a save exists; keyboard/mouse/pad focus | MET | fresh: New Game focused, Load disabled "No saved games yet"; after any save Continue focused with caption (H3, L3, R1, S3 on dev+prod); keys, mouse click (N4), mocked pad (N5) |
| B3 | Settings live, persist, back keeps change, reset exists | MET | scale 1.00→0.75 → canvas 1200×675 live + Keep/Revert 10 s; master 0.8→0.5 = bus −3.22→−10 dB, 6 UI ticks; Esc → title focus on Settings; reload keeps 0.75 / 0.5; "Reset to defaults" |
| B4 | New Game over a live run/save confirms | **NOT MET** | J3-F3 |
| B5 | Hub → run in one action, no picker | MET | portal E → L1 room-1 combat 277 ms (dev) / 403 ms (prod), `levels` never pushed, `harness:false` |
| B6 | Pause freezes, audio ducks, resume exact | MET | 0 ticks (4047→4047), music `ducked:true` at −31 dBFS; Enter-resume leaks 0 actions, released W does not stick |
| B7 | Save & Quit + autosave at transitions | MET | Save & Quit → Continue "Autosave · Level II · The Sunken Mill · Room 1" → L2 same build; autosave at `level_transit` (auto-1 phase transit) |
| B8 | Destructive actions confirmed | MET | Quit to Title, Quit to Lobby (default focus Keep Playing; cancel keeps run), Load ("Anything since your last save will be lost"), Exit |
| B9 | Continue/Load = exact state | PARTIAL | exact: lastLoad hash b65f4cfc083518f8 == hash at save (prod), same level/room/HP/build/seed; but depart-card saves mis-described (J3-F1) |
| B10 | Biome transition readable, build carries, music crossfade, no hitch/leftovers | MET | card 2987–3004 ms (quiet prod), frames all `run`, max frame 55–73 ms, 0 near-black (min luma 35.4), build sig identical, HP full, 0 leftovers, victory→combat/`mill` crossfade |
| B11 | Death card + return to hub | MET (copy advisory) | real-input wipe (Harrowing, passive healer) at 79 s → "THE CAMPAIGN ENDS · The gods applaud. SCORE 533 · New best!…" → Enter → camp 21 ms |
| B12 | Run history updates | MET | runs 0→1, defeats 0→1, campaigns 1; Records: 3 runs, per-level rows, Abandoned 2, Furthest Level II, best 2,378 |
| B13 | Locked content shown with requirement, unenterable, persistent | MET | L3 dashed "Clear The Sunken Mill to unlock"; keys never focus it (7 presses), click shakes, pad never reaches it, `choose(3)`/`campChoose(3)` → `{ok:false,reason:'locked'}`; unlocks [1,2] survive reload |
| B14 | One confirm/back key everywhere, no input bleed, pad works | MET | Enter/Esc on every screen tested; Resume-Enter leaks nothing; pad d-pad/A work on Level Select |
| B15 | Audio continuity | MET | music states menu→camp→combat→boss→victory(card)→combat(mill)→camp→defeat→menu, crossfades, never `silence` except farewell (journey-dev.json audioSamples) |
| B16 | No dead ends | MET | every screen exited by Esc/Back; journey prod 86/90 with 0 stuck states |
| B17 | No > 100 ms hitch, stable pacing | MET (quiet machine) | quiet prod: combat 76.7–83.3 fps, boss 70.1, 0 frames > 100 ms (max 78.8); v0.4.63 on the same machine slower (combat 43–47 fps). Under other agents' load: 41 fps, 109–182 ms frames (environment) |
| B18 | Co-op host/join/leave, other side told | MET | MP 9/9: menus Join by code, Ready by keys, Start, L1 → card → L2 in sync (0 desyncs), host Quit to Lobby → both camp, drop-in by code, "Guest left — AI plays the Tank", migration |
| B19 | Input ≤ 2 frames, i-frames, telegraphs readable | MET | keydown→move 1–2 ticks (7/7 quiet prod; regress 2/1/1); dash probe → `hit_immune`, HP 100→100; 124 telegraphs min 42 t (0.70 s), median 60 |
| B20 | Focus loss never punishes | PARTIAL | hidden tab: 1–3 ticks advance in 2.5 s (rAF halts) but no pause menu on return and `simPaused()` false; real window blur not reproducible headless |

**Score: 16 met, 2 partial, 2 not met (of 20).**

## Required probes — results

| Probe | Dev | Prod | Evidence |
|---|---|---|---|
| Boot → title (real key) | loading splash, sim frozen, audio locked; unlock 137 ms | same; unlock 376 ms (loaded) | journey-*.json A1–A3; boot timings: J3-F2 |
| Change a display + an audio setting | 1200×675 live, Keep; −10 dB bus | same | B3–B8 |
| New Game → camp | control 61 ms | 346 ms | C2 |
| Begin Run → Level 1 directly | 277 ms, no picker | 403 ms | D2 |
| Clear rooms (real input) | rooms 1–8, 1 debug clear (a defend room before the fix) | **rooms 1–8, 0 debug clears** | J_log |
| Pause → save to slot | 400 ms, toast "Saved to “Slot 1”" | 416 ms | G3/G4 |
| Quit to title → Load → same room + build | hash bd6b0a673f04d62c equal | hash b65f4cfc083518f8 equal | I4/I5 |
| Clear Level 1 → card → Level 2 by itself | 2968 ms, events 1/1/1 | 3074 ms, events 1/1/1 | K1–K4 |
| Carried build | sig identical, HP full | sig identical, HP full | K4 |
| Pause → Quit to Lobby | confirm, cancel keeps run, camp 187 ms, no end card | camp 127 ms | M1–M7 |
| Level select: L2 unlocked, L3 locked | all input paths refused | same | N1–N8 |
| Die → records | debug-assisted wipe; runs/defeats/high score +1 | same + **real-input wipe** (realdeath-prod.json) | O2/O3, realdeath |
| MP host + headless guest → leave → title | Q1–Q10 + MP 9/9 | Q1–Q10 | mp-dev.json |
| 8-room regression by real input, drafts | 8 rooms, 6 drafts, 5 doors, 0 debug clears | — | regress-dev.json R4/R5 |
| Esc-pause on every page type | combat, draft, path, socket-first, shop, boss, transit, end: all 0 ticks | pause→Load leg OK | regress P-*, luma-prod.json |
| keydown→move ≤ 2 ticks | 2/1/1 | 1–2 on 7/7 (quiet) | R1, focus-prod-quiet.json |
| Dodge i-frames | dash 14 t, hit_immune | — | R2 |
| Telegraphs ≥ 0.7 s | min 42 t / 124 | — | R6 |
| REFERENCE_BAR camp/combat/boss | 18 / 18 / 19 (no zero) | — | Step 7 table |
| fps, no > 100 ms after warm-up | loaded: inconclusive | quiet: 0 > 100 ms, 70–102 fps | fpsab.json, transhitch-prod.json |
| 0 page errors | 0 | 0 | Z1/Z2, every tool |
| Production build boots and plays | — | `npm run build` exit 0 (1.43 s), preview :4330, full journey | journey-prod.json |

## PLAN gates (journey-relevant, checked literally)

| Gate | Result | Evidence |
|---|---|---|
| GI.1 full journey by real input, no dead end | PASS (with the J3 defects noted) | journey dev 79/89 → all misses harness/advisory; prod 86/90 |
| GI.2 pause menu items + Esc on every page type | PASS | regress P-* (8 page types), Resume/Settings/Save/Load/Save & Quit/Quit (confirm)/Quit to Lobby; MP host never pauses (tick 985 advancing), guest has Leave Session only |
| GI.3 audio cues for new content | not re-measured (audio critic) | — |
| GI.4 build + preview boots and plays | PASS | journey-prod |
| GI.5 no dev chrome in player build | PASS | plain URL: fps meter not visible, no #debug-overlay, version label present |
| GI.6 regression | PASS on a quiet machine | 8 rooms real input, 1–2 tick move, i-frames, telegraphs ≥ 42 t, RB 18/18/19, 0 > 100 ms (quiet A/B), 0 page errors |
| G1.11 New Game → camp ≤ 1.0 s; legacy params | PASS | 61 / 346 ms; `?menu=0`, `?seed`, `?room`, `?scene=arena&room`, `?run=1`, `?level=2/3`, `?menu=1` all behave (params-prod.json) |
| GC.1 Begin Run = Level 1, no picker | PASS | D2 |
| GC.2 automatic transition, no camp frame, index once | PASS | 70 / 66 frames all `run`, index 1→2, events 1/1/1 |
| GC.4 campaign end paths | PASS | CAMPAIGN COMPLETE countdown 10→1, camp 601 ticks after the final clear; defeat → Enter → camp; Quit to Lobby → camp, no end card |
| GC.7 timing / near-black / gaps | PASS (quiet prod) | auto 2987–3004 ms (≤ 4.0), Enter@0.52 s 722–1363 ms (≤ 1.5), 0 near-black (min 35.4 / 30.0), max gap 73 ms |
| GC.8 locking on every path | PASS | N2–N8 + reload |
| GC.9 save mid-level / on the card / Continue | **PARTIAL** | restore exact; J3-F1 description wrong on depart cards |
| GC.10 records | PASS | Records: campaigns completed, furthest level, abandoned, per-level clears |
| GC.11 multiplayer follows the campaign | PASS | MP3/MP4 |

Builder claims re-measured: build-CAMPAIGN "auto 3030/3046 ms, Enter 724/844, max gap 97 ms, 0 near-black" → mine 2987–3004 / 722–1363 / 73 ms / 0 near-black (consistent). fix-INT-r1 J1–J4 → J1 slot hit-testable under pause (G2 hitOk), J2 Continue focused after every quit (H3/L3/R1), J3 Load list focuses the newest save (I2), J4 drop-in by code enters play (MP5) — all hold.

## Advisories (not must-fix)
- A1 Defeat card never says the party fell: "THE CAMPAIGN ENDS / THE RUN ENDS · The gods applaud." on every wipe (5 start paths + a real-input wipe) — the wry tone is BUILD_BRIEF l.793 design, but a defeat kicker would read clearer.
- A2 Setting-out card lasts 2.83–3.72 s on a quiet machine (4.3–6.4 s under load) vs the ~2 s design; the chosen level's preload ("Preparing … 0/3") only starts at the card — pre-warm when the Level Select opens.
- A3 Load-screen detail panel clips its "Where / Party / Skills" lines and leaves orphan glyph fragments; the depart-card autosave thumbnail is a black void (prod-O-depart-saves.png).
- A4 Focus loss: with "Pause when the window loses focus" On, a hidden tab halts via rAF but returns without a pause menu and `simPaused()` stays false; the blur case could not be verified headless.
- A5 One deliberate guest leave produces two host notices ("Tank lost connection — AI plays the Tank" + "Guest left — AI plays the Tank").
- A6 Frame pacing drops to ~41 fps with 109–182 ms frames whenever other agents' browsers share this integrated Radeon — environmental; quiet samples are clean.
- A7 Damage numerals draw over the top-left location plate ("30" in rb-combat.png and prod-K-level2.png).
- A8 After an auto-advance the victory cue runs ~0.5 s into Level 2 before the combat/`mill` crossfade; camp/menu keep the last level's theme id (`mill`) after Quit to Lobby.
- A9 The first key of a menu-skip harness boot costs 9 ticks (audio unlock) — harness-only.

## Own processes
vite preview :4330 (PIDs 70372 / 85424 / 87004 + bash wrappers) and the v0.4.63 baseline preview :7853 (PIDs 70148 / 87104 / 80164 + wrappers) killed; ports 4330, 7850–7853 free. Net servers :7850–7852 were spawned and killed by the tools themselves. The scratchpad node_modules junction was removed with `rmdir` (project node_modules intact).

---
## Step log (checkpoint, chronological)

# Critic — JOURNEY, gauntlet round 3 (linear campaign)

Role: harsh critic, fresh context. Judges only the running game (pixels, console logs, debug-API state, storage, network).
Every tool/capture/action file created by this critic is prefixed `gntcjourney3-`.

## Step 1 — Blind benchmark checklist (written BEFORE looking at any Echoes capture)

Benchmark systems: the first-hour flow of Hades (Supergiant, 2020), Dead Cells (Motion Twin, 2018), Slay the Spire (MegaCrit, 2019).
Each item is concrete and testable; scored in Step 9.

| # | Benchmark item (how the shipped games behave) | Test on Echoes |
|---|---|---|
| B1 | Boot shows feedback within ~1 s (logo/loading) and reaches an interactive title within a few seconds; no blank/black frame without progress feedback. | time from navigation to title interactive; frame at t≈1 s not blank |
| B2 | Title: Continue is present and focused first when a save exists (StS "Continue" / Hades "Continue"), New Game, Settings/Options, Quit equivalent; keyboard, mouse and gamepad all move a visible focus. | title capture + focus state per input device |
| B3 | Settings apply live (audio sliders audibly change level at once; display options change the picture immediately), persist across a restart, Esc/Back leaves without losing the change, a reset-to-defaults exists. | change 1 display + 1 audio setting, measure effect (pixels / gain), reload, re-read |
| B4 | New Game over an existing save/run asks for confirmation before destroying it (StS "Abandon run?"). | New Game with a live save -> confirm dialog present |
| B5 | Hub -> run is one action (walk into the door/portal and confirm); no picker in the way for the default path; load dead time is short and covered. | camp portal E -> Level 1 room 1 in ≤ a few s, no picker |
| B6 | Pause (Esc/Start) freezes the simulation at once; audio ducks/filters (Hades muffles music on pause); Resume restores exactly. | tick frozen while paused; bus gain/filters change; resume |
| B7 | Save & Quit from pause returns to the title with the run intact (StS "Save & Quit"); autosave at room/biome transitions (Hades/Dead Cells). | save to slot from pause, quit to title, storage has the save |
| B8 | Destructive pause actions (abandon run / quit to hub) are confirmed; non-destructive ones are not needlessly gated. | Quit to Lobby shows confirm; cancel keeps run |
| B9 | Continue/Load resumes the exact state: same room/floor, same HP, same build (deck/boons), same currency, same seed. | compare state() before save vs after load |
| B10 | Biome transition (Dead Cells passage / Hades region change): a short, readable interstitial, build carries over, music crossfades into the new theme, no hitch spike, no leftover entities. | level-clear card -> Level 2 on its own; build diff; leak counters; frame gaps |
| B11 | Death: a death card with run summary, then an automatic/one-press return to the hub (Hades "return to the House"; Dead Cells back to Prisoners' Quarters). | party wipe -> defeat card -> camp |
| B12 | Run history / stats update after every run end (StS run history, Hades run records). | records before/after death |
| B13 | Locked content is shown locked with the unlock requirement (StS characters/ascension, Dead Cells rune doors) and cannot be entered; unlocks persist across restarts. | level select L2 unlocked / L3 locked; reload; attempt to start L3 by every path |
| B14 | Consistent input: one confirm key and one back key everywhere; the press that closes a menu never leaks into gameplay; gamepad works in every menu; mouse hover highlights. | Enter/Esc in each screen; no dodge/attack from the confirming press |
| B15 | Audio continuity: music never double-plays or cuts to hard silence between title/hub/combat/boss/transition; UI sounds on navigation; levels consistent. | bus/voice counts across transitions |
| B16 | No dead ends / soft-locks: every screen has a back route; after victory/defeat the player lands in the hub. | journey completes with no stuck state |
| B17 | Performance: stable frame pacing; no > 100 ms hitch after warm-up. | frame-gap trace on the GPU harness |
| B18 | Co-op session (Risk of Rain 2 / Hades-like co-op standard): host gets a join code, a guest joins and both enter play; leaving returns the leaver to the title and the other side is told. | host + 1 headless guest, start, leave, title |
| B19 | Responsiveness: input-to-motion within 1–2 frames; dodge has i-frames; enemy telegraphs readable (≥ ~0.5–0.7 s). | keydown-to-move ≤ 2 ticks, i-frame hit test, telegraph durations |
| B20 | Focus loss (alt-tab) pauses or at least never punishes the player; audio behaves per setting. | blur -> tick/pause state |

## Step 2 — Scout (done)
- Build under test: `__echoes.version` = **0.5.94**, HEAD 027850e (branch gauntlet). Scout tool `tools/gntcjourney3-scout.mjs` -> `captures/gntcjourney3-scout.json`, `gntcjourney3-scout-title.png`, `gntcjourney3-scout-camp.png`.
- Registered screens: loading, title, settings, confirm, keep-display, farewell, levels, saves, sv-rename, records, mp-menu, mp-join, lobby, nt-server, pause. Fresh profile title: New Game (focused), Load Game (disabled "No saved games yet"), Multiplayer, Settings, Records, Exit. Camp portal prompt text "E Begin Run · Level 1 · The Hollow Wood · L Levels"; map table at (-3.6, -5.85) r 1.25; fresh unlocked = [1]. Camp pause: Resume, Settings, Save Game, Load Game (disabled), Save & Quit to Title, Quit to Title. 0 page errors.
- Scout 2-5 (`tools/gntcjourney3-scout2..5.mjs`, discovery only, debug shortcuts): run pause adds `pz-lobby` "Quit to Lobby — Abandon this campaign — back to camp"; Level Select = 3 cards (L1 focusable, L2/L3 aria-disabled with "Clear <prev> to unlock"); card screen `transit` reads "LEVEL I CLEARED / THE HOLLOW WOOD / NEXT Level II · The Sunken Mill / SKILLS CARRIED / SOCKETS FILLED / BENCH / GLINT / PARTY restored to full / … setting out in 3 s / Enter set out now"; `hud.project(x,y,z)` gives screen coords (used to aim the healer's basic by mouse).
## Step 3 — Journey harness written, first dev run in progress
- `tools/gntcjourney3-journey.mjs` (sections A–S, real input via puppeteer keyboard/mouse; debug only to READ state except labelled debug-assisted steps) and `tools/gntcjourney3-regress.mjs` (GI.6 regression on the GPU harness).
- Dev run #1 partial results (captures/gntcjourney3-journey-dev.log): A boot loading splash present (frozen sim, locked audio) but boot→"press any key" 10.65 s on the DEV server (DOMContentLoaded alone 6.9 s — unbundled vite; re-measure on production); audio unlock 137 ms; settings: render scale 0.75 → drawing buffer 1200×675 live, Keep/Revert 10 s, master 0.8→0.5 = −3.22→−10 dB bus, meter −21.7→−29.4 dBFS, 6 UI ticks; focus restored to Settings; New Game → controllable 61 ms; portal E → Level 1 room 1 in 277 ms with no Level Select, campaign harness=false; pause 0 ticks, music ducked not silent, Enter-resume leaks nothing; save to Slot 1 in 400 ms with "Saved to “Slot 1”" toast and caption "Level I · The Hollow Wood · Room 2 of 8 · Defend … Playtime 1 min 09 s"; Quit to Title confirmed; Continue focused "Slot 1 · Level I · The Hollow Wood · Room 2"; Load → control 155 ms, same level/room/HP/build/seed, lastLoad.hash bd6b0a673f04d62c == hash at save.
- Harness artifacts (not game defects): E1/G4 expected room 3 but room 2 is a timed Defend room that killAllEnemies cannot end — the fixed tool waits defend rooms out.
## Step 4 — Dev journey run #1 complete (79/89; every failure triaged) + MP probe
- `captures/gntcjourney3-journey-dev.json/.log`. Genuine results beyond Step 3: card → Level 2 on its own: level_clear tick 13496 → level_start 13676 (180 ticks), wall clear→L2 combat 2968 ms, 70 frames all vfx mode `run`, max frame gap 109 ms, level_clear/level_transit/level_start 1/1/1; carried build sig identical (4 skills, bench 16, Glint 84→84), party HP full; autosave auto-1 at phase transit; Save & Quit → Continue "Autosave · Level II · The Sunken Mill · Room 1" → Level 2 index 2 same build; Quit to Lobby confirm ("…abandons the current campaign… Unlocks and records are kept", default focus Keep Playing), cancel keeps run, confirm → camp 187 ms no end card, abandoned 0→1, unlocks [1,2], 0 leftovers; map table E → Level Select (L1 "Cleared ×1", L2 open "Starter kit +2 skills · 19 nodes · 34 Glint", L3 dashed "Clear The Sunken Mill to unlock"); keyboard never focuses L3 (7 presses), mouse click L3 shakes and starts nothing, mocked pad d-pad never reaches L3, choose(3)/campChoose(3) → {ok:false, reason:'locked'}; L at the portal opens the select; L2 start → setting-out card with grant (+2 skills, 19 nodes, 19/32 sockets, 34 Glint) → L2; records/Records screen update; reload keeps 0.75 scale / master 0.5 / 3 saves / unlocks [1,2]; Exit → farewell 208 ms, music silence; 0 page errors, 0 console errors.
- Harness artifacts (re-checked, not defects): E1/G4 (defend room), K1 (card text read after the card closed — K-card.png shows the full card), K5 (music read at the first L2 frame; the 250 ms timeline shows victory→combat/mill crossfade 0.5 s after L2 start), N2 (text truncation — N-levels.png shows the lock line), P2 (best score printed "2,423"), Q4/Q7 (`net.inSession` is a function).
- REAL findings to confirm: (1) defeat card after a party wipe reads "THE CAMPAIGN ENDS · The gods applaud." — never says defeat (O-defeat.png); (2) setting-out card lasted 257 ticks / 4.3 s ("Preparing The Sunken Mill… 0/3") vs the ~2 s design; (3) boot 10.65 s on the dev server (re-measure on production).
- MP probe `tools/gntcjourney3-mp.mjs` (own server :7851) 9/9: guest joins by menus (Join → code), Ready by keys, Start → both playing; host Begin Run → both L1; guest follows card ("…The Healer leads on") + Level 2, layout equal, 0 desyncs, no camp frame; host Quit to Lobby (confirm names the whole party) → both camp, session up; third client drop-in by code → play with toast; guest Leave → host notice "Guest left — AI plays the Tank" (plus a redundant "Tank lost connection"); host Leave → remaining client migrates to host; 0 page errors.
## Step 5 — Targeted probes (dev) `tools/gntcjourney3-probes.mjs` → captures/gntcjourney3-probes-dev.json
- End cards (5 wipes: portal L1 by real E, startCampaign L1/L2/L3, startRun act 1): all read "THE CAMPAIGN ENDS / THE RUN ENDS · The gods applaud." with defeat music and a full summary (score, levels cleared x / N, furthest level, rooms, Glint, build, seed, length). BUILD_BRIEF l.793 specifies this wry curtain-call tone → advisory only (the word "defeat" never appears).
- Setting-out card (Level Select → Enter, L3 ×6 because focus opened on L3): 180–204 ticks, 3.0–3.4 s wall, "Preparing The Ashen Barrow… 0/3 → 1/3 → 2/3"; journey run: L2 257 ticks / 4.3 s. Design says ~2 s → advisory (no gate; a loading card with progress).
- Enter at 0.52 s on the clear card → Level 2 control 1308 / 1326 / 1363 ms after level_clear (GC.7 ≤ 1.5 s: PASS on dev).
- Final clear (L3 harness start): "CAMPAIGN COMPLETE · The last Stag falls. Every level is clear — the long night is over." countdown 10→1, camp automatically 601 ticks (10.0 s) after the clear; campaignsCompleted 0→1.
- **CONFIRMED DEFECT (J3-F1):** a manual save on the Level-II setting-out card (pause → Save → Slot 1) is described "Level II cleared — on the road to the next level" in the slot row and the title reads "Continue — Slot 1 · Level II cleared · just now" (captures/gntcjourney3-dev-departsave-title.png) — Level II has not been played. The auto-1 autosave written on the same card has the same meta (phase transit, level 2, room 0).
## Step 6 — GI.6 regression on dev (`tools/gntcjourney3-regress.mjs` → captures/gntcjourney3-regress-dev.json, 17/20)
- Level 1's 8 rooms (kill_all ×4, defend ×2, shop, boss) by REAL input, **0 debug clears**, 6 drafts taken + 5 doors by Enter, socket screen closed by Esc; card → Level 2 by itself (after a pause on the card).
- Esc-pause with 0 ticks and the page intact on combat, draft (candidate kept: warding_aura), path, socket-first, shop, boss, transit card, defeat end card — all PASS.
- Dodge: dashTicksLeft 14, probe hit → `hit_immune`, HP 100→100. Keydown→move 2/1/1 ticks (R1 flagged FAIL only because the harness pressed W+S together on 3 presses — the 3 real samples are ≤ 2 ticks).
- Telegraphs: 124 paired spans, min 42 ticks (0.70 s), median 60, 0 under 42.
- Frames: 10 frames > 100 ms (max 176) and p50 18.2 ms — BUT measured while the harness polled state every ~0.4 s AND the net critic's multi-browser probe (gntcnet3-ui, 36 chrome.exe, CPU 66–80 %) ran concurrently; a no-poll re-sample (`tools/gntcjourney3-fps.mjs`) under the same load: camp 82.6 fps / 0 >100 ms, L1 combat 33 fps, boss 27 fps (5 >100 ms), L2 combat with load gone (10 chrome, CPU 54 %) 82 fps / max 91 ms. → fps must be re-measured on a quiet machine before any verdict.
- 0 page errors, 0 console errors.
- Own processes: vite preview :4330 PIDs 87004 (npx) / 85424 (cmd) / 70372 (vite) — kill before returning.
## Step 7 — REFERENCE_BAR (frames from the real-input regression, dev GPU harness)
| Check | camp (rb-camp.png) | combat L1 r1 (rb-combat.png) | boss L1 r8 (rb-boss.png) |
|---|---|---|---|
| 1 No dead ground (analyze FLAT) | 2 (1.81 %) | 2 (1.85 %) | 2 (1.43 %) |
| 2 Layered light | 2 hearth + 4 lantern pools + violet portal, cool 79.6 % | 2 five brazier pools, green cauldron glow | 2 braziers + violet rune + boss glow |
| 3 Silhouette read | 2 outlined chibis + class rings | 2 | 1 party stacked on the Stag at centre (healer/tank/archer overlap) |
| 4 Prop density | 2 (≥16 types: tents, benches, woodpile, cart, stall, portal, map table, lantern poles, banners, bedrolls…) | 2 braziers, fences, crates, barrels, gravestones, cauldron, logs at edges | 2 pillars, urns, braziers, fences, rune slab |
| 5 VFX layering | 1 (embers/fireflies only — no attack in a camp frame) | 1 one healer bolt (core+glow), telegraph ring, numeral "30" clipped under the location plate | 2 violet bolts core+glow, 8 numerals, ember telegraph, heal ring |
| 6 Colour discipline | 2 indigo/amber/violet | 2 woodland/warm/ember (danger 1787 px), heal green only on heal cauldron | 2 violet boss 21692 px, ember telegraph 15397 px |
| 7 Post stack | 2 bloom + vignette | 2 | 2 |
| 8 Grounding | 2 | 2 | 2 |
| 9 UI polish | 2 | 2 wave pill, location plate, command bar | 2 ornate boss bar |
| 10 Motion juice | 1 idle frame | 2 cast pose + bolt in flight | 2 impact numerals, casts |
| **Total** | **18/20** | **18/20** | **19/20** |
All ≥ 16, no zero. LUMA 16/16 buckets on all three (>160: 2.72 / 5.00 / 4.02 %).
## Step 8 — Production build (`npm run build -- --outDir dist-gntcjourney3`, exit 0, 1.43 s; `vite preview :4330`) + journey on prod
- `captures/gntcjourney3-journey-prod.json/.log` **86/90**. Whole Level 1 by REAL input with **0 debug clears** (rooms 1–8 incl. 2 defend rooms, shop, Stag in 24.0 s); save Slot 1 in 416 ms ("Level I · The Hollow Wood · Room 3 of 8 · Hunt … Playtime 1 min 15 s", toast "Saved to “Slot 1”"); Quit to Title → Continue focused; Load → control 138 ms, lastLoad hash b65f4cfc083518f8 == hash at save; card "LEVEL I CLEARED … NEXT Level II · The Sunken Mill … SKILLS CARRIED 4/4 … Preparing The Sunken Mill… 1/3 · Enter set out now"; Level 2 on its own 3074 ms after the clear, 66 frames all `run`, max gap 127 ms, events 1/1/1; build identical, HP full; music victory/wood on the card → combat/mill in Level 2; autosave at the transition; Save & Quit → Continue "Autosave · Level II · The Sunken Mill · Room 1" → Level 2 same build; Quit to Lobby confirmed → camp 127 ms, no end card; locks by keys / mouse / pad / API; Level-2 start with grant; death → records; Records screen; MP host+guest (Q4 1595/4471 ms, Q5, Q6, Q7 both camp); reload persistence; Exit farewell 203 ms; 0 page / console errors.
- Failures: A2 boot 14.5 s (machine loaded by the net critic — re-measure), B7 meter noise only (bus gain −3.22 → −10 dB is exact; music RMS varies across windows), O2 wording (design, advisory), **O1b CONFIRMED on the real player path**: after clearing Level 1 by real input, Quit to Lobby, Level Select → Level II, the setting-out card's autosave is listed as "Autosave · Level II cleared — on the road to the next level" (auto-2, meta phase transit level 2 room 0; captures/gntcjourney3-prod-O-depart-saves.png).
- Setting-out card on prod (loaded machine): Enter → Level 2 combat 6654 ms (card ≈ 6.4 s, the 6 s wall cap) — re-measure quiet.
- Player build GI.5: plain URL has no visible fps meter, no #debug-overlay, version label "v0.5.94" (boot probe captures/gntcjourney3-boot-prod.json).
## Step 9 — Params, focus loss, latency (prod, machine loaded)
- Harness params on prod (`tools/gntcjourney3-params*.mjs`): `?menu=0` camp no title; `?seed=5` camp seed 5; `?room=kill_all&seed=7` wave room (3 enemies, waves [3,4]); `?scene=arena&room=kill_all` arena-v1 wave room; `?run=1` single-level run room 1 (mode single, harness); `?level=2` / `?level=3` campaign at that level (harness true); `?seed=7&menu=1` forces the title. 0 page errors. PASS.
- Focus loss (`tools/gntcjourney3-focus.mjs`): another tab to the front → page hidden, `Pause when the window loses focus` = On; sim advanced 3 ticks in 2.5 s (rAF stops), simPaused false, no pause menu on return (stack []). Real window blur cannot be produced headless (hasFocus stays true, `tools/gntcjourney3-blur2.mjs`) → the setting's blur effect is unverified here (menu critic's domain).
- Keydown→move on prod under load: 15/6/7/5/4/4/2/2 ticks (29–105 ms) — the machine was rendering at 17 fps ("Rendering 17 fps · display ~42 Hz" in the Display tab) because the net critic's multi-browser probes were running; must be re-measured quiet.
## Step 10 — Quiet-machine re-measurements (prod :4330; only my own browser running, 9–11 chrome.exe)
- A/B frame pacing (`tools/gntcjourney3-fpsab.mjs`, same seed/script, v0.4.63 exported with `git archive 1fd8120` to the scratchpad and built, served on :7853): current build camp 80.5–102.5 fps, combat 76.7–83.3, boss 40.9–70.1 (the 40.9 sample with 26 chrome.exe of another agent), **0 frames > 100 ms in every current-build sample** (max 78.8 ms); v0.4.63 on the same machine: camp 49.5–51.6, combat 43–47, boss 33.7–67, one 103 ms frame. → no regression vs the certified build; GI.6 frame bar PASS on a quiet machine.
- Transitions (`tools/gntcjourney3-transhitch.mjs`, 6 transitions L1→L2 / L2→L3): clear → next level combat 2987–3004 ms, max frame 55–73 ms (the card-open frame, ~55 ms after the clear), 0 > 100 ms. Screencast luma (`tools/gntcjourney3-luma.mjs`): clear transition 234 frames min mean luma 35.4, setting-out card 376 frames min 30.0 → 0 near-black. Enter at 0.52 s → control 722–1237 ms (GC.7 ≤ 1.5 s).
- Keydown→move (prod quiet): 1/2/1/2/2/1/1 ticks (11–30 ms) on 7 presses; the very first key of a menu-skip boot took 9 ticks (55 ms, the audio-unlock task) — players meet that key on the title's "press any key".
- Boot (prod, `tools/gntcjourney3-boot.mjs` / `-bootframes.mjs`): cold first load splash 4.56 s / ready 7.81 s; warm 1.77–1.94 s / 2.98–3.17 s. Screencast: 36–71 ms a flat Void-Charcoal page (luma 18→31, captures/gntcjourney3-prod-quiet2-r1-bootframe-1.png), nothing else until 2.15 s (warm) / 3.6–3.7 s (cold); the first content frame is the RAW camp render without any overlay (bootframe-2.png) and the "ECHOES · Lighting the hearth…" splash then fades in over it (bootframe-5.png).
- Setting-out card (Level Select → Enter, 6 runs): 169–222 ticks = 2.83–3.72 s wall ("Preparing … 0/3 → 1/3 → 2/3") vs the ~2 s design → advisory.
- Pause → Load Game → Slot 2 (confirm "Anything since your last save will be lost") → lastLoad hash c9be9063f79ff24f == hash at save; GI.2 Load leg PASS.
## Step 11 — New Game over a live campaign (`tools/gntcjourney3-newgame*.mjs`, prod)
- **CONFIRMED DEFECT (J3-F3, data loss):** campaign A Level 1 room 4 (Glint 36, seed 2575734311) → pause → Save & Quit ("Your run is written to the autosave slot first") → title "Continue — Autosave · Level I · The Hollow Wood · Room 4" → **New Game: no confirmation** (stack [] → playing) → a new campaign B; after B's 2nd autosaved room (≈ 75 s of play) auto-1/auto-2 both hold campaign B (rooms 2/3, seed 1110681614) — campaign A is gone with no warning (captures/gntcjourney3-newgame2-prod.json autosaveLog). Autosaves are the ONLY copy a Save & Quit makes and they rotate between 2 slots.
## Step 12 — Real-input death + final cleanup
- `tools/gntcjourney3-realdeath.mjs` (prod, no debug writes): Settings → Gameplay (E tab key) → Challenge ArrowRight → `harrowing`; New Game; portal E; healer walks into enemies, declines drafts (X), never casts → party HP [100,150,95,80] → [0,3,0,0] at 80 s in room 3 → "THE CAMPAIGN ENDS … SCORE 533 · New best! … ROOMS CLEARED 2 / 8 … CAMPAIGN LENGTH 79 s" → runs 0→1, defeats 0→1, campaigns 1 → Enter → camp 21 ms, 0 page errors.
- Processes killed, ports free, junction removed (see "Own processes").
