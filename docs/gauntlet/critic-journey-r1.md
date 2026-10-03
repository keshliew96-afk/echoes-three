STATUS: COMPLETE
VERDICT: FAIL — 4 must-fix (Save/Load from pause drawn under the pause plate and hit-blocked; title focuses New Game instead of Continue after Quit/Save & Quit; Continue and "newest first" rank by autosave write time so a deferred autosave outranks a newer manual save and Continue resumes older state; drop-in by code into a running session never enters play). Full journey by real input otherwise seamless on dev and production builds: 0 page errors, settings/saves/records persist across reload, MP host+guest+leave+migration work, 8-room loop + pause on every page + telegraphs ≥ 42 ticks pass, REFERENCE_BAR camp 19 / combat 17 / boss 18; benchmark 44/55 met, 9 partial, 2 not met.

# Journey Critic — Gauntlet round 1

Role: harsh critic, fresh context. Judges only the running game (captures, console logs, debug-API state, storage, network). Never trusts builder claims.

## Steps completed
- [x] Step 0: checkpoint created; docs read begins (no Echoes captures viewed yet).

## Step 1 — BLIND benchmark checklist (written before any Echoes capture was viewed)

Benchmarks: the first hour of Hades (Supergiant), Dead Cells (Motion Twin) and
Slay the Spire (MegaCrit); co-op lobby items from Risk of Rain 2 / Gunfire
Reborn. Each item is something a player of those games experiences and a probe
can measure. Scoring: met / partial / not met, with the capture or log name.

### Boot
- B1 Boot shows a splash/loading with progress; no dead black frame > 1 s; a "press any key" card at most once (Hades: logo → "Press any button"; Dead Cells: logo → press; StS: logo → menu).
- B2 Boot → interactive title ≤ 10 s on an SSD (Hades ≈ 8 s, StS ≈ 5 s).
- B3 Menu music is audible within 1 s of the first accepted input (native: at once; web: after the unlock gesture, with the prompt telling the player).

### Title
- T1 Items: Continue (only when a save exists, and then it is the DEFAULT focus — Hades, StS and Dead Cells all put Continue first), New Game, Load, Settings, Exit.
- T2 Exactly one visible highlight; Up/Down wraps at the ends (Hades, StS).
- T3 The title backdrop is a live animated scene (House of Hades; Dead Cells' animated title; StS' animated title), not a static bitmap.
- T4 Keyboard, mouse (hover moves the highlight) and gamepad drive the same menu; nothing is mouse-only or keyboard-only.
- T5 Esc/Back on the title root is a no-op (no crash, no blank frame).
- T6 A small version string sits in a corner.

### Settings
- S1 Tabbed settings (Hades: General/Graphics/Audio/Controls; Dead Cells: Video/Audio/Controls/Accessibility); tab switch by a shoulder-style key.
- S2 Display rows: resolution/scale, windowed/fullscreen, V-Sync, frame cap — each applies IMMEDIATELY as a live preview (Hades applies on change) and a display change that could strand the player has a Keep/Revert countdown (the Windows/Unreal/Unity convention).
- S3 Audio rows: Master, Music, SFX; Left/Right steps the value; the number/bar updates and the change is audible at once; a UI tick plays per step (Hades).
- S4 Every setting survives a restart (all three games).
- S5 Back from Settings returns to the previous screen with the focus on the item it was opened from.
- S6 Reset to defaults exists and asks first.
- S7 Settings are reachable from the pause menu and apply to the live game.

### New Game → play
- N1 New Game → the player controls the character within 1–3 s (Hades ≈ 2 s fade, StS instant, Dead Cells ≈ 3 s).
- N2 New Game never silently destroys an existing run save (StS: "Abandon run?"; Dead Cells confirms over an occupied slot); at minimum the save is still loadable afterwards.
- N3 Hub → portal → room 1 has a visible transition (≤ 1 s) and a music state change (Hades: House → Tartarus).
- N4 Clear → reward → next room by the confirm key; the HUD reflects the new build immediately.

### Pause
- P1 Esc opens the pause menu in EVERY game state — combat, reward/draft, path, shop, boss, end card (StS opens its menu over a card reward; Hades over anything).
- P2 In single player the sim halts: 0 ticks elapse, enemies/projectiles visibly frozen (all three).
- P3 Items: Resume, Settings, Save (or shown as auto), Quit to Title (confirmed), Exit; default focus Resume; Esc again resumes (Hades / Dead Cells / StS).
- P4 Resume restores the exact state and focus underneath; the confirm key that closed the menu never fires an attack; keys held when the menu opened are released (no run-away character).
- P5 Music continues (ducked or filtered) — never a hard cut to silence and never a second music layer.
- P6 Pause → Settings → change → Back lands on the pause menu, and Resume still works.

### Save
- V1 The slot list shows real metadata: date/time, playtime, location (act/room), build summary; occupied vs empty slots are visually distinct.
- V2 Overwrite and delete each ask for confirmation.
- V3 Saving is ≤ 1 s with a visible "Saved" indicator (Hades save glyph, StS "Saving…", Dead Cells save icon).
- V4 Autosave at safe points so a crash loses at most one room.
- V5 Save & Quit → title where Continue is the DEFAULT focus; Continue restores the exact room, phase, build, wallet and party HP (StS restores mid-combat exactly).
- V6 Load Game from the title: pick a slot → in control ≤ 1.5 s; same room/phase/build as saved.
- V7 A corrupt slot gives a clear message and the game still boots and plays.

### Quit / Exit
- Q1 Quit to Title mid-run asks for confirmation; the title then still offers the run (Continue) — nothing lost.
- Q2 Exit asks for confirmation; on the web it ends with an honest "your browser keeps the tab open" card, never a fake toggle.

### Run end / records
- R1 The victory/defeat card shows run stats (rooms, time, score) and "New best" when it is one (Dead Cells run recap, StS score breakdown, Hades run summary).
- R2 The record persists across a reload and is shown on a Records screen.
- R3 One confirm on the end card returns to the hub, in control within ≈ 2 s.
- R4 After the run ends, the slots reflect the post-run state (a dead run cannot be resurrected from a stale mid-run slot without the game saying so).

### Multiplayer lobby (RoR2 / Gunfire Reborn co-op)
- M1 Title → Multiplayer → Host / Join by code / Quick match; hosting shows a room code and a player list; Start enabled with ≥ 1 player.
- M2 A joining guest appears in the host's list within 1 s and the guest sees the same list.
- M3 Start puts both in the same room; each controls their own seat; own movement responds within 1 frame.
- M4 Leave → both back at the title (or lobby) with no error; the host's single-player saves are untouched.
- M5 Pausing during a session never stops the game and the menu says so.
- M6 With no server: an explicit "unreachable" message with Retry within 5 s, never an endless spinner.

### Input consistency
- I1 The same keys mean the same thing on every screen: Enter/Space confirm, Esc back one level, arrows/WASD move, Q/E or PageUp/Down tabs.
- I2 No menu key leaks into gameplay (the Enter that confirms Resume fires no attack; a held W is released when a menu opens).
- I3 Gameplay responsiveness: keydown-to-move ≤ 2 ticks, dodge on keydown with i-frames, telegraphs ≥ 0.7 s (docs/REFERENCE_BAR.md).

### Audio throughout
- A1 Music per state (menu, camp, combat, boss, victory, defeat) with crossfades; no gap > 1 s between states; never two music layers.
- A2 UI sounds on nav / confirm / back; sliders give immediate audible feedback.
- A3 A volume set on the title applies in-game and after a reload.
- A4 No clipping at 100 % sliders in a boss fight.

### Production build and performance
- PB1 `npm run build` succeeds; the preview boots to the title with 0 page errors; a run plays; no dev chrome on the plain URL.
- PB2 No console errors beyond the two known ANGLE warnings.
- F1 60 fps on the GPU harness; no frame > 100 ms after warm-up during the 8-room loop; camp / combat / boss frames each ≥ 16/20 on REFERENCE_BAR with no zero.

Total: 55 items.

- [x] Step 1: blind checklist written (55 items). No Echoes capture viewed yet.

## Step 2 — dev-server journey run (tools/gntcjourney1-journey.mjs --tag dev), in progress
Files: captures/gntcjourney1-journey-dev.log / .json, captures/gntcjourney1-dev-*.png.
Interim findings (A–I phases done):
- Smoke plain URL: exit 0, 0 PAGEERROR, GOTO 7977 ms (captures/gntcjourney1-smoke.console.txt).
- Title frame gntcjourney1-title.png: live camp backdrop, New Game focused, Load disabled "No saved games yet", version v0.5.62 bottom-left.
- G2 FAIL confirmed by pixels (gntcjourney1-dev-G-saves-from-pause.png): Save screen opened from pause is drawn UNDER the pause plate; elementFromPoint(Slot 1 centre) = .pz-wrap; two amber rings visible (Resume + Slot 1).
- H3 FAIL: after Quit to Title the focus is ap-title-new although ap-title-continue is present (gntcjourney1-dev-H-title-after-quit.png).
- Continue caption after a manual save in room 2 + Quit reads "Autosave · The Hollow Wood · Room 1 · just now" = the OLDER autosave, not the newer manual Slot 1 (room 2, 24 s, 12 glint) — see gntcjourney1-dev-I-load-list.png ("2 saves · newest first" yet the older autosave is listed and focused first).
- I3/I4 in the log are harness picks of the autosave (first focused item), NOT a stale save; Slot 1 itself holds room 2 correctly. Being re-probed by tools/gntcjourney1-stalesave.mjs (S1–S7).
- A11 menu key→paint p95 95.5 ms / max 95.5 (20 presses, machine under load from other agents: 22 chrome.exe).
- A8 hover-focus did not move with a single mouse.move; re-probed with stepped moves in tools/gntcjourney1-probes.mjs.
- C2 New Game controllability inconclusive (W held only 400 ms); re-probed (P4).

## Step 3 — follow-up probes on the dev server (done)
- tools/gntcjourney1-probes.mjs → captures/gntcjourney1-probes-dev.{log,json}: 13/16. P2 stepped mouse hover focuses + click confirms (A8 was a single-jump mousemove, not a defect); P3 right-click = back; P4 New Game → player moves at 942 ms (playing at 68 ms, then ~0.9 s before input is accepted); P7 Save & Quit writes auto-1 and reaches the title; **P8 FAIL focus = ap-title-new after Save & Quit**; P9 Continue restores the same room/phase/wallet/build/seed/HP; **P10 FAIL Load Game from pause: 6/6 visible slot/action items hit-test to .pz-wrap / .pz-plate**; P11 filled slot text has date, "just now", playtime, location; P12 harness tab-detect bug (the closed saves screen's .ap-active "Load" tab matched) — the audio-change-from-pause leg is unverified; P13/P14 New Game over existing saves: no confirm, but no slot lost (autosaves auto-1/auto-2 untouched).
- tools/gntcjourney1-stalesave.mjs → captures/gntcjourney1-stalesave-dev.{log,json}: the steering never left camp (S0 FAIL, harness), but S1/S3 show a Save from the pause menu writes the CURRENT tick (captureLog reason save:manual-1 captureTick 5365 = live tick 5365) — the stale-save hypothesis is refuted; S4 F5 quicksave writes tick 6938 at live 6936 with a "Quicksaved" toast; S6 Continue = "Quicksave · Camp · just now" = the newest by time (harness regex expected "Room N"), focus Continue on a title first shown after the quit.
- tools/gntcjourney1-unreach.mjs (v1) → captures/gntcjourney1-unreach-dev.json: opening Multiplayer with a dead server: stack [title, mp-menu], serverState "checking", focus nt-mp-back (Host/Join/Quick not focusable while checking); the journey's K13 "pass" was my Enter landing on Back. Re-probed by v2 (wait without pressing, Retry with a server started).

## Step 4 — Continue / ordering / run-end / MP probes (dev server)
- tools/gntcjourney1-continue.mjs (--boot skip 8/8; --boot title 7/8): room-1 autosave then a manual save in room 2 → save.list() = [manual-1 (room 2), auto-1 (room 1)] newest first; Continue caption "Slot 1 · The Hollow Wood · Room 2 · just now"; Continue loads room 2 with wallet 12 and the 3-skill build (C6). Title focus after the quit: Continue on a menu-skip boot (title first shown then), New Game on a title boot (the item the player left from is restored).
- tools/gntcjourney1-thumbflip.mjs (no load): manual save 1.2 s after the autosave → order [manual-1, auto-1] stable for 8 s, savedAt stamps never change, thumbnails present from the first sample → the thumbnail re-stamp hypothesis is refuted.
- The journey's "Continue → Autosave · Room 1" (gntcjourney1-dev-H-title-after-quit.png) is explained by the journey log itself: G3 "the save landed" fired on save.list().length>0 with **slots: 1**, and G4 shows that single entry was the room-1 AUTOSAVE (meta tick 458, playtime 8 s) — i.e. the autosave captured at room-1 enter was WRITTEN ~16 s late, at the same moment as the manual save, under the 22-chrome.exe load; its savedAt then out-ranked the manual save's and Continue/Load listed it first. Re-probing under synthetic load (thumbflip --load 3).
- tools/gntcjourney1-runend.mjs: with the whole party at 1 HP the party AI still clears room 1 (D1 phase reward) — the defeat needs a lethal room; re-run pending. D9/D10/D12: camp pause → Quit to Title → Records → Esc all by keys, 0 page errors.
- tools/gntcjourney1-mp.mjs (first run, under load): M1 host lobby 12 ms; M3 guest typed the code → lobby 103 ms, host list 38 ms; M4 Ready by key seen by the host in 18 ms; M7 guest pause honest (tick advances, "Online — the game keeps running", Save "Only the host can save an online session", Load "Leave the online session to load a save", Leave); M8 guest Leave → title, host continues; M10 host Leave confirm copy "Your friends keep playing — another player takes over as host"; M11 guest promoted to Host in the lobby. M6 own-move 136–158 ms was the page at ~7 fps under 4 Chrome instances — re-measuring alone.

## Step 5 — reproductions (dev server)
- **Autosave write-time ordering (REPRODUCED under load)** tools/gntcjourney1-thumbflip.mjs --load 3 → captures/gntcjourney1-thumbflip-devload.json: the manual save (manual-1, savedAt 08:10:08.595) was listed first; the room-1 AUTOSAVE's write landed 395 ms LATER (savedAt 08:10:08.990, autoAppearedAt +248 ms after the manual save was already listed) and the list flipped to [auto-1, manual-1]; `save.list()[0]` = auto-1. Content order is by construction autosave (room enter) < manual (later): devload2 ticks auto 534 < manual 567. A second loaded run (devload2) did not flip because its autosave landed 1 s before the manual save — the flip needs the deferred autosave write to land after the manual save, which the journey's 22-chrome load produced (~16 s late: log G3 "slots: 1" = the autosave alone, G4 meta tick 458 / playtime 8 s).
- Defeat path tools/gntcjourney1-runend.mjs → captures/gntcjourney1-runend-dev.{log,json} 13/14: lethal room (8 elite mantises, party at 1 HP; the sim delivers the blows) → defeat card at 20.9 s; profile runs 0→1, highScores 0→1, best 30, defeats 1; card text "THE RUN ENDS … SCORE 30 · New best! ROOMS CLEARED 0 / 8 … RUN LENGTH 22 s … Return to Camp"; music combat→defeat (tick 1940); Esc on the card pauses (0 ticks) and resumes; Enter → camp controllable at 71 ms; music → camp; Records "1 run · 0 won … 30 … Defeat 0/8 … 6 … 0:22"; D8 advisory: auto-1 still offers the dead run mid-combat (room 1 tick 598) next to auto-2 (camp, post-defeat).
- MP solo run tools/gntcjourney1-mp.mjs → captures/gntcjourney1-mp-dev.{log,json} 10/11: own-move guest 33.8 ms / host 39.5 ms (1 rendered frame); M9 drop-in by code into the RUNNING session leaves the guest in the lobby ("Not ready"; frame gntcjourney1-dev-M-rejoin-lobby.png) for 25 s — re-run with the real Ready button (gntcjourney1-mp-dev2).
- Dead server v2 tools/gntcjourney1-unreach.mjs → captures/gntcjourney1-unreach-dev.json 5/5: mp-menu shows "Host a Game — Checking the server…" at once; the unreachable panel ("Can't reach the Echoes server at ws://127.0.0.1:7851/echoes … run npm run net …", Retry / Change server / Back, focus Retry) at 4577 ms without any press; Retry after `node server/index.mjs --port 7851` → online in 5 ms, Host focusable; Esc → title. (The journey's K13 pass was invalid — my Enter had landed on Back while the check was pending.)
- MP drop-in re-run gntcjourney1-mp-dev2 11/13: M9 confirmed with the real Ready button (nt-lobby-ready): after Enter the host's peer list still shows Guest ready:false and the guest stays on the lobby screen ("Not ready", "Free — take it" seats) for 25 s while the host session runs (frames gntcjourney1-dev2-M-rejoin-lobby.png, -M-rejoin-after-ready.png).
- Production build: `npx vite build --outDir dist-gntcjourney1` exit 0 in 1.90 s (three 600.59 kB, index 1187.88 kB, workers), preview on 127.0.0.1:4330.
- [x] Steps 2–5 done; Step 6 (GI.6 regression on the GPU harness) and Step 7 (production build journey) running.

## Step 8 — benchmark scoring (dev server measurements; regression + production rows appended below)

| # | Item | Score | Evidence |
|---|---|---|---|
| B1 | splash + press-any-key once | met | gntcjourney1-smoke.png: "Ready — Press any key or click"; journey A1 stack [loading], tick 0, audio locked |
| B2 | boot → title ≤ 10 s | partial | dev server under load: 21.4 s to the prompt (A2); smoke GOTO 7977 ms + warm-up; production number below |
| B3 | music ≤ 1 s after first input | met | A4 music tap −25.86 dBFS, state menu 1.6 s after Enter; audio locked→running observed 277 ms after the press by a 5 ms poll (A3) |
| T1 | Continue default when a save exists | **not met** | H3 / P8 / continue-title C5: focus ap-title-new after Quit / Save & Quit although Continue is listed first (gntcjourney1-dev-H-title-after-quit.png) |
| T2 | one highlight, wrap | met | A5 rings 1; A7 Up from New Game → Exit |
| T3 | live animated backdrop | met | A9 mean |Δ| 10.59/channel between frames 700 ms apart |
| T4 | keyboard / mouse / gamepad parity | partial | keys everywhere; P2 stepped hover focuses + click confirms; P3 right-click = back; gamepad not re-measured (INT's mock-pad file only) |
| T5 | Esc at root no-op | met | A6 |
| T6 | version label | met | A10 "v0.5.62" at (386,846), 18.3 px |
| S1 | tabbed settings | met | tabs Display · Audio · Gameplay · Controls · Network (B3), Q/E tabs |
| S2 | display rows apply live + Keep/Revert | met | B5 1600×900 → 1200×675 at 75 %; B6 "Keep these display settings? … Reverting in 10 s", default Keep; gntcjourney1-dev-B-display.png honest V-Sync/limit copy ("Display ~156 Hz · rendering 32 fps · frame work 17.3 ms") |
| S3 | audio sliders audible at once + tick | met | B9 master −3.22 → −13.22 dB, master meter −21.19 → −31.4 dBFS; B10 8 UI ticks for 8 steps |
| S4 | settings survive restart | met | L1 0.75 → 1200×675 on boot, L2 master 0.4 / −13.22 dB |
| S5 | back restores focus | met | B12 focus ap-title-settings; L7 focus ap-title-records |
| S6 | reset to defaults | partial | B11 "Reset to defaults" present; its confirm not exercised |
| S7 | settings from pause apply live | met | F7 / P12: pause › Settings › Esc lands on pause with focus Settings; the store is the same one B9 measured live |
| N1 | New Game → control 1–3 s | met | P4 playing at 68 ms, first movement at 942 ms with W held (≤ 1.0 s gate G1.11, barely) |
| N2 | New Game never silently destroys a save | partial | P13 no confirm dialog, but the autosaves stay loadable (P14) |
| N3 | portal → room 1 transition + music | met | D1 combat 280 ms after E; D2 music → combat at 483 ms |
| N4 | draft / path by confirm | met | E2 nova_bloom taken by Enter; E3 path Enter → room 2 |
| P1 | Esc pauses in every state | met (combat, defeat card) | F1; runend D5 (end card); the draft/path/shop/boss pages in the regression rows below |
| P2 | SP pause halts the sim | met | F1 tick 1373 → 1373 over 700 ms; D5 2108 → 2108 |
| P3 | items + default Resume + Esc resumes | met | F2 Resume/Settings/Save/Load/Save & Quit/Quit, focus pz-resume; F6 |
| P4 | no key leak, held keys released | met | F4 leak []; F5 position unchanged over 31 ticks after Resume |
| P5 | music continues under pause | met | F3 combat music ducked, −34.4 dBFS |
| P6 | pause › Settings › back › Resume | met | F7 stack [pause], focus pz-settings |
| V1 | slot metadata | met | gntcjourney1-dev-I-load-list.png: date/time, "just now", playtime, act/room/mode, glint, party HP; details pane with skills, file size, version; thumbnail (C4 frame) |
| V2 | overwrite / delete confirm | partial | not exercised here (save critic G2.3) |
| V3 | save ≤ 1 s with a "Saved" indicator | met | G3 522 ms; toast "Saved to “Slot 1”" (frames H, I); "Quicksaved" (S4) |
| V4 | autosave at safe points | met | C1 auto-1 at room-1 enter (+364 ms); rotation auto-1/auto-2; Save & Quit writes one (P7) |
| V5 | Save & Quit → Continue default, exact state | **not met** | P8 focus New Game; P9 / C6 the state IS exact when Continue is chosen; but see the ordering failure (thumbflip-devload) |
| V6 | Load ≤ 1.5 s, same state | met | I2 122 + 54 ms; C6 room 2, wallet 12, 3 skills |
| V7 | corrupt slot handled | partial | not exercised here (save critic G2.4) |
| Q1 | Quit mid-run confirms, run kept | met | H2 "Quit to the title? Anything since the last save is lost."; H3 Continue listed |
| Q2 | Exit honest | met | M2 farewell 203 ms, music silence, "Your browser keeps this tab open…"; M3 Return → title, settings intact |
| R1 | end card stats + New best | met | D3 "SCORE 30 · New best! ROOMS CLEARED 0/8 … RUN LENGTH 22 s" |
| R2 | record persists, Records screen | met (same session) | D11 Records "1 run · 0 won … 30 … Defeat 0/8 … 6 … 0:22"; cross-reload persistence in the production journey below |
| R3 | end card → hub ≤ 2 s | met | D6 camp at 1 ms, control at 71 ms |
| R4 | dead run not resurrectable silently | partial | D8 auto-1 still offers the dead run mid-combat (room 1, tick 598) beside auto-2 (camp); it is labelled |
| M1 | host: code + list + Start | met | K3 / M1 lobby in 12–16 ms with code, 4 seats, "Start — AI plays 3 seats" |
| M2 | guest appears ≤ 1 s | met | M3 typed code → lobby 54–103 ms, host list 25–38 ms |
| M3 | both in play, own move ≤ 1 frame | met | M5; M6 guest 33.8 ms / host 39.5 ms (1 rendered frame, solo run) |
| M4 | leave paths clean | met | M8 guest Leave → title, host continues; M10 host Leave (copy "another player takes over as host"); M11/M12 guest promoted then reaches the title |
| M5 | MP pause never stops the game | met | K8 / M7 "Online — the game keeps running", ticks advance, Save/Load disabled with reasons |
| M6 | no server → explicit + retry | met | U1 "Checking the server…" then the unreachable panel at 4577 ms with Retry; U2 Retry → online 5 ms |
| I1 | consistent keys | met | Enter/Esc/arrows/Q-E identical on title, settings, pause, saves, lobby, join (key hints in every frame) |
| I2 | no leak into gameplay | met | F4 / F5 |
| I3 | responsiveness bar | see regression rows | |
| A1 | music per state, crossfades | met | menu → camp 1 ms (C3), camp → combat 483 ms (D2), combat → defeat (D4), defeat → camp (D7), run → title menu (H5), silence on farewell (M2); gap length not measured |
| A2 | UI sounds | met | B10 |
| A3 | volume applies in-game + after reload | met | B9, L2 |
| A4 | no clipping at 100 % in a boss | not measured here | audio critic G3.3 |
| PB1/PB2/F1 | production build, console, fps | see rows below | |

## Step 6 — GI.6 regression on the GPU harness (tools/gntcjourney1-regress.mjs --seed 7 → captures/gntcjourney1-regress-dev.{log,json}, 14/18)
| Probe | Result | Numbers |
|---|---|---|
| R0 menu-skip boot → camp, no title | PASS | app playing, stack [], tick > 200 |
| R1 keydown-to-move ≤ 2 ticks | PASS | 5/5 presses: 1 tick (log) |
| R2 dodge on keydown + i-frames | PASS | dashTicksLeft > 0, keenProbe left HP unchanged |
| R3 camp → portal → room 1 by WASD + E, no expedition picker | PASS | |
| P-combat / draft / path / socket / boss / end | PASS ×6 | Esc opens pause in ≤ 25 ms, 0 ticks elapse (1052→1052, 1643→1643, 1746→1746, 12038→12038, 13116→13116), page underneath intact, draft candidate still offered (dewfall), Esc resumes; the first Esc on the socket screen closes it without pause |
| R4 8 rooms → end card | PASS | 1 kill_all · 2 kill_all · 3 defend · 4 kill_all · 5 defend · 6 kill_all · 7 shop · 8 boss → VICTORY; every draft / door / shop answered by Enter; 2 rooms cleared by real input inside the 15 s budget, the rest finished with the documented debug clear (same recipe as INT's) |
| R4b run recorded | PASS (records) / music note | runs 1, high score 1, best 3048, victories 1; card "VICTORY … SCORE 3,048 · New best! ROOMS CLEARED 8 / 8 GLINT EARNED 84 SKILLS CARRIED 4 NODES HELD 16 RUN LENGTH 202 s"; music state read 'camp' ~3 s into the card (the stinger had already handed over) |
| R5 drafts / doors by real keys | PASS | draft_taken 6, path_chosen 5, room_cleared 7, run_end 1 |
| R6 telegraphs ≥ 0.7 s | PASS | 91 spans, min 42 ticks, median 48, 0 under 42 |
| R7 no frame > 100 ms | **not certifiable** | 8734 frames: p50 24.2 ms, p95 42.4, p99 60.5, max 267, over50 136, over100 20 (14 of the 20 in the first 6 s after warm-up in camp; 218 ms at room-1 tick 858; 170 ms at room-3 tick 5279) — measured with 23 chrome.exe from other agents on the machine (rAF cadence 41.5 Hz, displayHz 82) |
| R8 60 fps | **not certifiable** | renderedFps 41.5 under the same load; re-sampled below |
| R9 0 page errors / console errors | PASS | |

REFERENCE_BAR (fresh critic scores, captures/gntcjourney1-dev-rb-*.png): camp 19/20 (motion proxy 1), combat 17/20 (silhouette 1: the second hostile is not identifiable; VFX layering 1: only a telegraph ring and a "30" number 2 s in; motion 1), boss 18/20 (VFX 1: no kill decals yet; grounding 1: the Stag's shadow reads only as glow). No zero. Analyzer: camp LUMA>160 2.59 % / >200 0.93 % / 16 buckets / FLAT 1.81 %; combat 4.64 / 0.54 / 15 / 1.62 %; boss 4.42 / 1.79 / 16 / 1.43 %.

## Step 7 — production build (dist-gntcjourney1, `npx vite preview --port 4330`)
- `npx vite build --outDir dist-gntcjourney1`: exit 0, 1.90 s; three 600.59 kB (gzip 150.46), index 1187.88 kB (gzip 392.99), paint/thumb workers; one rolldown note (ineffective dynamic import of src/app/registry.js).
- Smoke gntcjourney1-prod-smoke: exit 0, 0 PAGEERROR, 8 requests (assets done at 5.8 s; networkidle at 17.3 s on the loaded machine), title after Enter.
- ARCH core loop on the preview (gntcjourney1-prod-core): run_start 1479 → room_cleared / reward 1602, exit 0.
- Full journey against the preview: gntcjourney1-journey-prod.{log,json} (below).

### Production journey (captures/gntcjourney1-journey-prod.{log,json}: 75/86, 0 page errors, 0 console errors beyond ANGLE)
| Leg | Result | Numbers |
|---|---|---|
| A boot → prompt | 13.6 s (loaded machine) | audio locked before the gesture; unlock + title 233 ms after Enter; music −26 dBFS |
| A title | met | ring 1, wrap, Esc no-op, hover needs a moving pointer (single jump ignored — not a defect), key→paint p50 52.7 / p95 80 / max 80 ms (20 presses) |
| B settings | met | 1600×900 → 1200×675, Keep/Revert "Reverting in 10 s", master −3.22 → −13.22 dB, 8 UI ticks, Esc → focus Settings |
| C New Game | met | playing at 70 ms, first movement at 450 ms |
| D portal → room 1 | met | combat + music switch |
| E clear + draft | met | draft by Enter, path by Enter → room 2 |
| F pause | met | 0 ticks, Resume default, no key leak, W released, Esc-Esc, pause › Settings › Esc |
| G save | **G2 FAIL** | Save screen under the pause plate again (hit → .pz-wrap); save 482 ms, "Saved to “Slot 1”", metadata room 2 / defend / wallet 12 / party HP |
| H quit | **H3 FAIL** | confirm copy ok; Continue listed but focus = New Game |
| I load | met / **I1b** | Load → control 62 + 31 ms; same room/phase/wallet/build/seed/HP from the manual slot; the Load list's default focus is `sv-slot-auto-2` (autosave section pinned above the newer manual save) |
| J die → records | met | lethal room → defeat at 22.4 s; runs 0→1, high score 225 "New best!", "ROOMS CLEARED 1 / 8 … RUN LENGTH 62 s"; defeat music; Enter → camp in 5 ms, control 38 ms |
| K multiplayer | met (harness K5–K7 are the `?netjoin` path / inSession-object / 45 ms = 2 frames at 45 Hz) | host lobby + code, guest listed in 4 ms, host pause "Online — the game keeps running", host Leave → title, guest promoted to host with the "Mouse763 left — AI plays the Healer" message and reaches the title by keys; dead server → `nt-server` panel with the npm run net copy, Esc → title |
| L reload | met | renderScale 0.75 → 1200×675, master 0.5 / −10 dB, 3 slots, runs 1, best 225, Continue default focus on a fresh title, Records "1 run · 0 won … 225 … Defeat 1/8 … 25 … 1:02" |
| M exit | met | farewell 201 ms, music silence, Return → title with settings intact |

### Frame-time re-sample (tools/gntcjourney1-fps.mjs, GPU harness, 15 s each, 20 chrome.exe still running on the machine)
camp 54.9 fps (p50 18.2 / p95 36.2 / max 54.4 ms, over100 0, work 13.1 ms) · combat 54.9 fps (p95 30.7 / max 66.6, over100 0, work 12.7) · boss 41.2 fps (p50 24.3 / p95 36.5 / max 54.5, over100 0, work 18.4); rAF cadence of the harness itself 54.9 Hz (p95 42.4 ms). The 60 fps / no-hitch bar cannot be certified or failed on this shared machine; INT's 86 fps / 97 ms claim was not reproducible under today's load.

## Verdict — FAIL (4 must-fix)
1. **Save / Load screens opened from the pause menu are drawn under the pause plate and hit-blocked** — dev G2 + prod G2 (`elementFromPoint` on Slot 1 = `.pz-wrap`), probes P10 6/6 items blocked (`.pz-wrap` / `.pz-plate`), frames gntcjourney1-dev-G-saves-from-pause.png and gntcjourney1-dev-title-C4-saves-list.png show two amber rings (Resume + Slot 1). Keyboard works, a mouse player cannot save or load from the pause menu. (Same defect the save critic filed as F1.)
2. **After Quit to Title / Save & Quit the title focuses New Game although Continue is listed first** — dev H3, prod H3, probes P8, continue-title C5 (focus `ap-title-new`); the benchmark titles (Hades, Slay the Spire, Dead Cells) put the cursor on Continue. Enter starts a new game instead of resuming. (Same as the save critic's F2.)
3. **Continue / "newest first" rank saves by write time, and a deferred autosave write can land after a newer manual save** — journey dev: Continue "Autosave · The Hollow Wood · Room 1 · just now" while Slot 1 held room 2 (gntcjourney1-dev-H-title-after-quit.png, gntcjourney1-dev-I-load-list.png; log G3 slots:1 = the autosave alone landing ~16 s after its room-1 capture); reproduced under synthetic load (captures/gntcjourney1-thumbflip-devload.json: manual-1 listed first, auto-1 appeared 248 ms later with a NEWER savedAt 08:10:08.990 vs 08:10:08.595 and took `save.list()[0]`; content order auto tick 534 < manual tick 567 in devload2). The default Continue then silently resumes an older state.
4. **Drop-in by code into a running session never enters play** — mp-dev M9 and mp-dev2 M9: the guest lands in the lobby ("Not ready", seats "Free — take it"), pressing the real Ready button leaves the host's peer list at `Guest ready:false`, and the guest stays on the lobby screen for 25 s while the host plays (frames gntcjourney1-dev2-M-rejoin-lobby.png, -M-rejoin-after-ready.png). The lobby copy promises "anyone can drop in later" (PLAN G5b.1).

Advisories: menu key→paint p95 80–95 ms under load (menu critic's G1.3 finding); boot to the prompt 13.6 s (prod) / 21.4 s (dev) under load; first-gesture unlock+title in one ~233–277 ms task; New Game accepts input 0.45–0.94 s after 'playing'; the Load list pins the autosave section above the newer manual save and focuses it (prod I1b); a dead run's older autosave stays loadable mid-combat after the defeat (runend D8); the "Saved to Slot 1" toast lingers onto the title after Quit; New Game over existing saves has no confirmation (nothing lost); Host/Join/Quick are unfocusable for ~4.6 s while "Checking the server…" (focus lands on Back); fps/hitch bar not certifiable on the shared machine.

Benchmark: 44 met / 9 partial / 2 not met of 55 (plus the PLAN G5b.1 drop-in gate, outside the checklist).
