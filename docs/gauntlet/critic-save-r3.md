STATUS: COMPLETE
VERDICT: FAIL - 3 must-fix: F1 mouse hover retargets the saves detail panel (title Load loads a different slot, Export exports it); F2 saves on a Level-Select depart card are described as "Level N cleared" (row, detail, title Continue); F3 about 13% of manual/quick saves stall 2-3.1 s with no feedback, swallow input and lose the thumbnail (also 2/8 headful). Engine PASS: 8/8 bit-identical round trips dev+prod, 13/13 corruption, real quota, torn writes, export/import, genuine v0.5.87 schema-2 upgrade, safe-point autosaves, exactly-once records, goldens 9/9, 0 page errors on real-input paths. Benchmark 20/25.

# Critic — SAVE module, gauntlet round 3 (fresh context)

Role: harsh critic. Judged only the running game (pixels, console logs, debug-API state, storage contents, network). Every tool/capture/action file this round is prefixed `gntcsave3-`.

## Step log
- S0 (done): checkpoint file created; no prior round-3 save-critic files existed (only round-1 `gntcsave1-*`).

## Step 1 — BLIND benchmark checklist (written BEFORE any Echoes capture was inspected)

Sources: my own knowledge of shipped Hades (Supergiant, 2020), Slay the Spire (Mega Crit, 2019), Stardew Valley (ConcernedApe, 2016), The Elder Scrolls V: Skyrim / Oblivion (Bethesda), and standard save-engineering practice.

### A. Autosave + resume (Hades, Slay the Spire)
- B1. Autosave fires at SAFE POINTS only: Hades saves on entering each new chamber and in the House; StS saves on every room entry / after a reward is claimed / when the floor map is shown. Never mid-animation, never mid-attack-resolution.
- B2. There is no manual "save anywhere" needed to not lose a run: quitting (Save & Quit / closing the game) and relaunching resumes the run. StS "Save & Quit" from the pause menu returns to title; "Continue" appears as the first title option.
- B3. Resume is EXACT: StS restores the same room, same HP, same deck/relics/gold/potions, and the same RNG so the same card rewards reappear (save-scumming a reward yields the identical reward). Hades restores the same chamber with the same boon offers.
- B4. The Continue button only appears when a resumable run exists and shows no stale run after the run ended (StS deletes the run save on death/victory; the run save is deleted when abandoned).
- B5. Crash safety: a crash / power loss / alt-F4 during a write never leaves a corrupt save. StS writes the `.autosave` then keeps a `.backUp` copy; Hades keeps multiple profile backups (Profile1.sav plus `_Temp`/backup files) so a failed write falls back to the previous good file.
- B6. Meta-progression (records / high scores / unlocks) is saved separately from the run and survives a run ending, a reload and a corrupt run save (StS: run history + ascension unlocks in separate prefs files; Hades: House/mirror state).
- B7. Death / victory finalises the run and clears the run save; records (best score, wins, streaks, fastest time) update exactly once.

### B. Save-slot menu (Stardew Valley, Elder Scrolls)
- B8. Load menu lists every save with METADATA: Stardew shows farmer name, farm name, in-game date (Season/Day/Year), money, total play time; Skyrim shows character name, level, location, in-game date, real play time, save number, and a screenshot thumbnail of the moment of saving.
- B9. Ordered newest first (Skyrim sorts by save time; the most recent save highlighted).
- B10. Save into a NEW slot is one action; saving over an existing slot asks "Save over [name]?" (Skyrim) — a yes/no confirmation that defaults safe.
- B11. Delete asks for confirmation (Stardew: "Really delete?" with confirm/cancel; Skyrim: "Delete this save?"); cancel leaves the slot untouched.
- B12. Load from the title screen (Stardew "Load" / Skyrim "Load") restores precisely the chosen slot, not the latest one.
- B13. Load mid-game warns that unsaved progress will be lost (Skyrim: "Load this game? All progress since your last save will be lost").
- B14. Distinct autosave and quicksave entries labelled as such (Skyrim "Autosave 1-3" rotating ring, "Quicksave"); autosaves do not overwrite manual slots.
- B15. Keyboard, mouse and gamepad can all navigate the slot list and the confirmation dialogs; Escape/B backs out without acting.
- B16. The slot menu stays usable with many saves (scrolling), and the current selection is always visible.

### C. Robust save engineering practice
- B17. Versioned schema: every save carries a format version; loading an OLDER version runs a migration; loading a NEWER/unknown version is refused with a clear message (never a crash, never silently partially applied).
- B18. Integrity check: a checksum/hash over the payload; a truncated or bit-flipped file is detected before any state is touched.
- B19. Atomic write: write to a temporary key/file then swap (or write-then-verify); a failed write (quota exceeded, storage blocked) leaves the previous good save intact and surfaces an error to the player.
- B20. Backup: the previous good copy is kept and offered for recovery when the primary is corrupt.
- B21. Missing keys/fields in an otherwise-valid save get defaults or a clean refusal — never NaN/undefined leaking into the sim.
- B22. Export / import (browser equivalent of copying save files): export produces a self-describing file; import validates it with the same checks as a load and never overwrites a slot without confirmation.
- B23. Deterministic sim: load reproduces the exact state (state hash equal) and the continuation after load is bit-identical to an unsaved continuation with the same inputs.
- B24. Save is fast and non-blocking (no visible hitch > 1 frame budget at 60 Hz for a normal save).
- B25. Storage honesty in a browser: the UI says where the saves live (this browser's local storage) and that clearing site data deletes them.

- S1 (done): blind checklist above written before any capture. Read PLAN §3.4, §6, §7 M2, §12.8/§12.11/GC.*, TESTING M2 + CAMPAIGN sections, round-1 save critic verdict (F1/F2 to re-check).
- S2 (done): own tools written — tools/gntcsave3-drive.mjs (driver, GPU harness via the read-only shared launcher, `--disable-features=NetworkServiceSandbox`), tools/gntcsave3-lib.mjs (in-page helpers: my OWN digest = SHA-256 over a sorted-key canonical JSON of save.capture(), independent of the game's FNV hash; continuation recorder via `__echoes.on('*')`; moment builders), API exploration captures/gntcsave3-sc-explore*.json (v0.5.94, StateTree v:3, save.* surface present).

## Step 3 — Round trip probe (own tool tools/gntcsave3-sc-roundtrip.mjs; JSON captures/gntcsave3-sc-roundtrip-all.json; 0 page errors, 0 console errors)

Method: per moment THREE page loads of `?menu=0&seed=7&freeze=1`: **R** = fresh profile, build the moment with setup commands, 600-tick continuation (scripted input seed 3) that was NEVER saved (the reference); **S** = fresh profile, same build, real `save.save("manual-6")` to localStorage, 600-tick continuation (proves saving has no side effect), then `save.load` (player path) and another 600-tick continuation; **L** = page reload keeping storage, `save.load`, 600-tick continuation. Digest = my OWN SHA-256 (first 96 bits) over a sorted-key canonical JSON of `save.capture()` + the game hash; compared every 60 ticks; every non-sound event recorded with `__echoes.on("*")` and compared as a SHA-256 over the ordered JSON list.

| moment | tick | phase / room / level | in flight at save | inventory at save | save bytes / ms | hash before = after load (in page, reload) | 600-tick continuation = unsaved reference (after save, after load, after reload) | events |
|---|---|---|---|---|---|---|---|---|
| camp | 300 | idle / 0 / L1 | proj 0, eshots 0, zones 0, azones 0, kinds {player:1,ally:3} | wallet 0, bench , sockets mending_bolt: swift_mend: | 4760 B / 143.4 | EQUAL (9d91c3fd263b / 134c30a686b595dc) | = = = | 92/92 |
| combat | 814 | combat / 2 / L1 | proj 1, eshots 0, zones 1, azones 0, kinds {player:1,ally:3,hazard:4,barricade:2,keg:2,waystone:1,mantis:3,quillback:1,boar:1,skillbolt:6,bolt:1,zone:1} | wallet 12, bench sharpen+bounce+resonance, sockets mending_bolt:{"node":"echo","verdict":"live"} swift_mend: sanctuary: spirit_bolt: | 14563 B / 193.4 | EQUAL (60190ab2430b / bc15981cac43ad1f) | = = = | 220/220 |
| reward | 718 | reward / 1 / L1 | proj 0, eshots 0, zones 0, azones 0, kinds {player:1,ally:3,hazard:2,dewfont:1,barricade:2,keg:1} | wallet 12, bench sharpen+bounce, sockets mending_bolt: swift_mend: | 7737 B / 140.5 | EQUAL (a10411a8ef6a / 6e421b59768fd4d1) | = = = | 102/102 |
| shop | 708 | shop / 7 / L1 | proj 0, eshots 0, zones 0, azones 0, kinds {player:1,ally:3} | wallet 72, bench sharpen+bounce+resonance, sockets mending_bolt:{"node":"echo","verdict":"live"} swift_mend: | 6501 B / 510.7 | EQUAL (a0c340be3776 / e66e284342d44915) | = = = | 113/113 |
| boss | 759 | combat / 8 / L1 | proj 1, eshots 0, zones 0, azones 3, kinds {player:1,ally:3,stag:1,azone:3,bolt:1,boar:2,mantis:1} | wallet 72, bench sharpen+bounce+resonance, sockets mending_bolt:{"node":"echo","verdict":"live"} swift_mend: | 9557 B / 3100.4 | EQUAL (72e5abd69bab / 417beb771a0aa8a5) | = = = | 320/320 |
| card | 769 | transit / 8 / L1 (card) | proj 0, eshots 0, zones 0, azones 0, kinds {player:1,ally:3} | wallet 84, bench sharpen+bounce+resonance, sockets mending_bolt:{"node":"echo","verdict":"live"} swift_mend: | 5875 B / 209.8 | EQUAL (2572d32a4dfb / a369ed26f6f953d7) | = = = | 137/137 |
| l2mid | 907 | combat / 1 / L2 | proj 1, eshots 0, zones 0, azones 1, kinds {player:1,ally:3,hazard:3,sluice:1,dewfont:1,barricade:3,keg:2,toad:2,quillback:1,boar:1,mantis:1,bolt:1,skillbolt:5,azone:1,eglob:1} | wallet 84, bench sharpen+bounce+resonance, sockets mending_bolt:{"node":"echo","verdict":"live"} swift_mend: sanctuary: | 15286 B / 3082 | EQUAL (2adb82e71230 / 4958aa72b8795767) | = = = | 294/294 |
| l3content | 964 | combat / 2 / L3 | proj 0, eshots 0, zones 0, azones 3, kinds {player:1,ally:3,hazard:5,dewfont:1,barricade:3,keg:2,waystone:1,moth:2,mantis:1,ram:2,mole:1,azone:3,skillbolt:2,rubble:1,boar:1,kegfuse:1} | wallet 72, bench echo+resonance+echo+resonance, sockets mending_bolt:{"node":"sharpen","verdict":"live"}+{"node":"multiply","verdict":"live"}+{"node":"quicken","verdict":"live"}+{"node":"split","verdict":"live"}+{"node":"detonate","verdict":"live"}+{"node":"quicken","verdict":"live"}+{"node":"reach","verdict":"live"}+{"node":"bounce","verdict":"live"} swift_mend:{"node":"echo","verdict":"live"}+{"node":"detonate","verdict":"live"}+{"node":"galvanize","verdict":"live"}+{"node":"keen","verdict":"live"}+{"node":"reach","verdict":"live"}+{"node":"split","verdict":"live"}+{"node":"snare","verdict":"live"}+{"node":"ascend","verdict":"live"} hearthsong:{"node":"detonate","verdict":"live"}+{"node":"keen","verdict":"live"}+{"node":"widen","verdict":"live"}+{"node":"echo","verdict":"live"}+{"node":"siphon","verdict":"live"}+{"node":"sharpen","verdict":"live"}+{"node":"widen","verdict":"live"}+{"node":"galvanize","verdict":"live"} pale_lance:{"node":"siphon","verdict":"live"}+{"node":"galvanize","verdict":"live"}+{"node":"echo","verdict":"live"}+{"node":"detonate","verdict":"live"}+{"node":"bounce","verdict":"live"}+{"node":"reach","verdict":"live"}+{"node":"sharpen","verdict":"live"}+{"node":"ascend","verdict":"live"} | 20139 B / 269.5 | EQUAL (2533c0a2456d / fa698278bf667ae9) | = = = | 496/496 |

Result: **8/8 moments PASS** — hash equal, and all three continuations bit-identical to the never-saved reference at every 60-tick checkpoint (both digests) with identical non-sound event streams (92–496 events per window). Build determinism across page loads 8/8 (the moment built in page R and page S hashes identically). Spot list (summary diff, R vs reload): tick, seed, RNG {seed, s, draws}, phase, room, level, wallet, all 4 party positions/HP, skill cooldowns, 8-socket rows, bench, every enemy id/hp/position, projectile/zone counts, campaign {level, index, card} — identical at all 8 moments. The only summary difference: `campaign.state().transitionState` read "advancing" in R right after a synchronous build vs "none" after a load at reward/shop — presentation-only (no frame had rendered yet in R), sim hash identical; harness artifact, not a defect.

Observation: two probe saves took 3.1 s wall (boss, l2mid) — each was the FIRST render of a freshly-built arena (probe-built synchronously while frozen, so the thumbnail frame compiled that level’s shaders). Real-play save latency measured separately in Step 4.

## Step 4 — Save-slot menu by real keyboard + mouse (tools/gntcsave3-sc-slots.mjs, -sc-savetiming, -sc-quickenter, -sc-mouse, -sc-mouse2, -sc-mousepath; JSON captures/gntcsave3-sc-*.json)

| check | result | evidence |
|---|---|---|
| Title on a fresh profile | New Game focused, Load Game disabled "No saved games yet" | gntcsave3-ui-title-fresh.png |
| Keyboard create (pause > Save Game > Enter on empty slot) | PASS — landed in 55 ms (sc-slots save1), 340 ms incl. first-save warm-up (sc-savetiming), toast "Saved to “Slot 1”"; quick Enter 150–1200 ms after the screen opens saves 7/7 (sc-quickenter) | slots-after-save1.png |
| Metadata | PASS — row: name, "Camp — at the hearth", date "26 Sept 2026, 02:52 · just now · Playtime 5 s", thumbnail; detail: Where / Saved / Played / Party HP per member / Skills / Run challenge / File size + version (sc-slots detail1); run saves carry level name + room (Step 3 meta: level 1 "The Hollow Wood", room, campaign {mode, startLevel, level, index}) | mousepath-hover-*.png |
| Overwrite (keyboard) | PASS — confirm "Overwrite “Slot 1”? The save from 26 Sept 2026, 02:52 (Camp — at the hearth) will be replaced." with **Cancel focused**; Cancel leaves hash 9e8abafae045b650 + savedAt unchanged; OK writes 7edc932014eb8a4c in 62 ms | slots-overwrite-confirm.png |
| Rename (F2) | PASS — "Before the bend", hash unchanged | sc-slots rename |
| Delete (keyboard) | PASS — confirm "Delete “Slot 3”? … This can't be undone." Cancel focused; Cancel keeps it, OK removes it | slots-delete-confirm.png |
| Mid-game load warning | PASS — "Load “Before the bend”? Anything since your last save will be lost." | slots-midgame-load-confirm.png |
| Save & Quit → title focus (round-1 F2) | PASS (fixed) — focus `ap-title-continue` "Continue — Autosave · Camp · just now"; also after a page reload | slots-title-after-savequit.png |
| Title Load Game → a NON-newest slot (keyboard) | PASS — slot 2 restored hash be07bd052b96c804, position (3.15, -0.68) exact, 127 ms Enter→playing | sc-slots titleLoadSlot2 |
| Reload page → Load Game → slot 1 | PASS — hash 7edc932014eb8a4c, position (1.072, -0.738) exact, 141 ms | sc-slots reloadLoadSlot1 |
| Pause-menu saves screen stacking (round-1 F1) | PASS (fixed) — elementFromPoint on pz-save / slot rows / Save here / confirm buttons hits the right element; mouse save, overwrite+confirm, delete+confirm, Load tab + confirm all work | sc-mouse, sc-slots mouseSave4 / mouseLoad |
| Mouse wheel / right-click | PASS — wheel scrolls the list 0→248 px so Slot 8 becomes visible; right-click = Back (saves → pause) | sc-mouse2 |
| **Mouse: detail-panel buttons act on whatever row the pointer last crossed** | **FAIL (must-fix F1)** — rows select on HOVER and the Load/Rename/Export/Delete buttons sit in the right-hand panel below the list; moving the pointer in a straight line (20 steps / 300 ms) from the hovered row to the button crosses the rows beneath it and silently retargets the panel. Title Load screen (3 saves, newest first): hover Slot 2 (panel "Slot 2 · Played 7 s") → move to **Load** → panel now "Slot 1 · Played 5 s" → click → **Slot 1 loaded** (lastLoad.slot manual-1, position (1.35,-0.48) instead of Slot 2's (2.87,-0.48)); no confirm on the title path. Same for **Export** (exported Slot 1 while the player picked Slot 2). Delete/Overwrite are mitigated only by the confirm naming the (wrong) slot. | mousepath-hover-manual-2-sv-act-load.png vs mousepath-preclick-manual-2-sv-act-load.png; captures/gntcsave3-sc-mousepath-shots.json wrongTarget |
| Mouse: click a FILLED row in Save mode | raises "Overwrite “Slot N”?" (Cancel focused) — a mouse user must dismiss an overwrite prompt before Rename/Export/Delete of that slot become reachable without hover (clunky, safe) | sc-mouse2 clickFilled3 |

## Step 5 — Corruption, quota, torn writes, blocked storage (tools/gntcsave3-sc-corrupt.mjs, -sc-quota.mjs, -sc-blocked.mjs; JSON captures/gntcsave3-sc-corrupt.json, -sc-quota.json, -sc-blocked*.json; 0 page errors)

My OWN edits to `echoes.save.v1.manual-2` (main + a valid `.bak` from an earlier save of the same slot; manual-1 / manual-3 bystanders), each followed by `save.load('manual-2')` in the live page:

| corruption | load result | live state untouched | backup offered | bystanders load | slot status / message (list after the load) |
|---|---|---|---|---|---|
| truncated to 50 % | `corrupt` | yes | yes | 2/2 | damaged — "not valid JSON (Unterminated string …)" |
| schema 99 (newer) | `version` | yes | yes | 2/2 | newer — "made by a newer version of Echoes (schema 99, this build reads 3)" |
| schema 0 | `corrupt` | yes | yes | 2/2 | damaged — "schema missing" (message slightly inexact for 0) |
| `state` deleted | `corrupt` | yes | yes | 2/2 | "required keys missing (state is not an object)" |
| `state.registry` deleted | `corrupt` | yes | yes | 2/2 | "required keys missing (state.registry missing)" |
| `hash` deleted | `corrupt` | yes | yes | 2/2 | "required keys missing (slot / meta / hash)" |
| one tick inside `state` +1 | `hash` | yes | yes | 2/2 | "integrity check failed (stored 1b17…, computed 5a55…)" |
| one float `x` in the registry +0.5 | `hash` | yes | yes | 2/2 | "integrity check failed (stored 1b17…, computed 6c86…)" |
| foreign JSON `{format:'not-echoes'}` | `corrupt` | yes | yes | 2/2 | "not an Echoes save file" |
| non-JSON text / empty string / `null` / `[1,2,3]` | `corrupt` ×4 | yes | yes | 2/2 | "not valid JSON …" / "empty file" / "not an Echoes save file" |

13/13 detected, 0 throws, 0 page errors. (`list()` returns the status cached from the previous load until the slot is next read — the table uses the post-load status; after a reload the title list is correct.)

UI (title → Load Game with a truncated Slot 2): row "Slot 2 DAMAGED · This file could not be read · Backup from 26 Sept 2026, 03:02 available"; detail "That save file is damaged. The file is cut short or garbled — the write may have been interrupted. A backup from … (Level I · The Hollow Wood · Room 1 of 8 · Hunt) is intact." with Restore backup / Export / Delete; Enter → "Restore the backup?" confirm → restored hash 7522d0df619e1c05 = the first good save, toast "Backup restored — the slot is loadable again" (corrupt-title-list-damaged.png, corrupt-enter-damaged.png, corrupt-after-restore.png). Title Continue skipped the damaged slot ("Continue — Bystander B · Level I · The Hollow Wood · Room 1").

REAL quota (localStorage filled with 5 228 368 chars of junk until `QuotaExceededError`): keyboard save to an empty slot → toast "Not enough browser storage — delete a slot or export saves to files.", nothing written; confirmed OVERWRITE of slot 1 → same toast, main hash 5e8a6d5d6a12480e intact, no `.tmp` left, still loads; F5 quicksave → same toast; after freeing the junk a save succeeds (quota-new-slot.png, quota-overwrite.png).

Torn writes hand-crafted, then a page reload: main=A + valid newer `.tmp`=B → promoted to B (recovery log "promoted"); main=A + truncated `.tmp` → A kept, tmp "discarded"; main missing + valid tmp → promoted; main AND `.bak` truncated → row DAMAGED, only Export / Delete offered ("Export the raw file to keep it, or delete the slot."), Enter does nothing harmful; deleted index rebuilt silently (quota-double-damaged.png).

Blocked site data (`localStorage` getter throws SecurityError): boots to the title with 0 page errors, toast "Settings can't be saved in this browser mode"; Save screen says "Saves last for this visit only (browser storage is off)"; a save lands in memory (backend "memory"), toast "Saved to “Slot 1”", loads back hash-identical (blocked-saves.png). (Saving in a SECOND headless tab stayed `busy` ~5 s in both the blocked run and an unblocked control — the occluded-tab frame bound; harness artifact, not storage-specific.)

## Step 6 — Export / import files and the schema-2 → 3 upgrade (tools/gntcsave3-sc-files.mjs, -sc-oldgen.mjs, -sc-upgrade.mjs)

Export (keyboard, pause > Save Game > slot > Export) → a REAL download via CDP `Page.setDownloadBehavior`: `captures/gntcsave3-downloads/echoes-manual-1-2026-09-26_0308.json`, 4 448 B, `format echoes-save`, `schema 3`, `game 0.5.94`, hash a5ec3458efcb9aa4 = the slot hash; toast "Exported echoes-manual-1-…json". Deleted the slot (confirm), then **Import…** through the REAL file chooser (`page.waitForFileChooser`) → "Imported into “Slot 1”", hash a5ec3458efcb9aa4, `loadRaw` restores exactly that hash. Importing the same file again goes to the next FREE slot (manual-2), never over an occupied one. Bad files → a toast, nothing changed: schema 99 → "That save was made by a newer version of Echoes — this build cannot read it."; truncated JSON and a PNG → "The file is cut short or garbled…" (PNG wording imprecise, harmless). Two schema-2 camp files exported by v0.5.44 / v0.5.62 in earlier rounds import, migrate to schema 3 and load (8-socket rows, seeds 9 / 7 kept).

**Genuine in-place upgrade from the pre-campaign build.** I built v0.5.87 (`git archive b21aac1`, the last pre-CAMPAIGN commit) into my scratchpad and served it on MY port 4324 (vite preview, PID 88648 — killed right after the dump; no process left with "old087" in its command line). In it: an Act I run saved at room 3 (echo socketed), Act I won (old profile: high score 2 741, `unlocks.acts [1,2]`), an Act II run saved at room 2 (wallet 12, bench snare+reach) — both `schema 2` (captures/gntcsave3-sc-oldgen.json; the whole `echoes.*` storage dumped to captures/gntcsave3-old087-storage.json). Written into the current build's origin, then a plain boot:
- Title: **Continue — OLD act2 room2 · Level II · The Sunken Mill · Room 2** (focused); Load Game lists both old saves with level/room/Glint/playtime and "File 13 KB · v0.5.87" (upgrade-title.png, upgrade-load-list.png).
- Records keep the old run (#1 2 741, Victory, 8/8, 9 kills), "Levels open I · II" (upgrade-records.png). *Advisory A1:* the old Act I victory is not translated into the new campaign records — "Furthest level —", "Level I cleared" shows the deepest-room value "room 8/8" while `levelClears[1] = 0`.
- Loading the old Act II save (title Load Game, keyboard) → a CAMPAIGN at level 2 (`startLevel 2, index 1, harness false`), room 2 combat, player position (0.00721, -0.20721) exactly the old save's, wallet 12, bench snare+reach (lock check passes because the migrated profile keeps Act II unlocked). Playing on: 600 ticks, Stag cleared → card "The Sunken Mill → The Ashen Barrow" (carried: 2 skills, 16 sockets, bench 2, wallet 84, no grant) → Level 3 (`index 2`), profile unlock `[1,2,3]`.
- The old Act I room-3 save → campaign level 1, echo still socketed → cleared → Level 2 (`index 2`).

## Step 7 — Mid-campaign save / Continue by the player path (tools/gntcsave3-sc-campaign.mjs, -sc-latency.mjs; captures/gntcsave3-sc-campaign.json, -sc-latency.json)

- New Game → hold W to the portal → E: a player campaign at Level 1 (`level 1, index 1, harness false`, combat at tick 419) — no picker (GC.1 spot check).
- Room 1 cleared, echo socketed, skip to the Stag, Stag killed → the card at tick 552 ("LEVEL I CLEARED · THE HOLLOW WOOD · NEXT Level II · The Sunken Mill · skills 2/4 · sockets 1/16 · bench 3 · Glint 84 · party restored to full", campaign-card-live.png). **level_transit autosave** written at the clear tick (auto-2, phase transit, captureTick 552 = eventTick).
- Esc on the card → pause (items: Resume, Settings, Save Game, Load Game, **Quit to Lobby**, Save & Quit, Quit to Title) → Save Game → Slot 1: phase `transit`, tick 602 (card elapsed 50 of 180 ticks; the pause held the card).
- Page reload → title focuses **"Continue — Slot 1 · Level I cleared · just now"** → Enter → `lastLoad` = manual-1, tick and hash equal to the slot (4a0883b9f3f46474 in run 2), 30.6 ms; the card is drawn again with its progress bar at the saved elapsed time (campaign-card-after-continue.png) and **auto-advances after 2.1 s** (remaining 113–130 ticks) to Level 2 room 1: `index 2`, echo still socketed, bench + wallet 84 carried, HP full (campaign-l2-after-card.png).
- F5 in Level 2 → "Quicksaved" → reload → "Continue — Quicksave · Level II · The Sunken Mill · Room 1" → loaded hash = the quicksave hash, `level 2, index 2` (campaign-l2-continue.png).
- Save latency in real play (sc-latency, 11 presses): F5 → slot written + "Quicksaved" toast in **142–191 ms** in camp, Level 1 combat and Level 2 combat (incl. the first second of a new level); one earlier F5 right after a level start took 3 085 ms before its toast (sc-campaign run 2, not reproduced in 4 later presses) — *advisory A2*. Longest rAF gap in an F5 window 24–67 ms at the harness's 55–82 fps.

## Step 8 — Autosave: safe points, throttle, frame cost (tools/gntcsave3-sc-autosave.mjs real-time autopilot run; -sc-autosave-ab.mjs A/B)

Real time, no probe stepping: New Game → portal E → `autopilot` plays Level 1 (8 rooms, shop, Stag) → card → Level 2 rooms 1–3 (4.6 min, ticks 416–15 112; captures/gntcsave3-sc-autosave.json). Every `autosaveLog()` entry vs the event stream I recorded with `__echoes.on('*')`:

| event tick | event(s) | autosave | capture tick | slot | pieces (capture / thumb / write ms) |
|---|---|---|---|---|---|
| 416 | L1 room_enter | yes | 416 | auto-1 | 0.6 / 1.8 / 8.4 |
| 1132 | room_enter | skipped — throttle (12.2 s) | — | — | — |
| 1797 | room_enter | yes (+23 s) | 1797 | auto-2 | 1.1 / 1.5 / 6.0 |
| 2939 | room_enter | skipped — throttle (19.7 s) | — | — | — |
| 5658 | room_enter | yes (+64 s) | 5658 | auto-1 | 0.7 / 0.7 / 3.1 |
| 7106 | room_enter | yes (+24 s) | 7106 | auto-2 | 0.8 / 1.5 / 4.2 |
| 9824 | room_enter + shop_open (same tick) | yes, merged reason "room_enter+shop_open" | 9824 | auto-1 | 0.6 / 0.7 / 3.4 |
| 9842 | room_enter (Stag room) | skipped — throttle (0.3 s) | — | — | — |
| 11092 | level_clear + level_transit | yes, **unthrottled** | 11092 | auto-2 | 0.6 / 1.3 / 3.7 |
| 11272 | L2 level_start + room_enter | skipped — throttle (3 s after the card save) | — | — | — |
| 13127 | room_enter | yes (+55 s) | 13127 | auto-1 | 1.1 / 2.6 / 6.5 |
| 15063 | room_enter | yes (+32 s) | 15063 | auto-2 | 0.7 / 0.3 / 3.2 |

8 autosaves, **all on safe-point events, capture tick = event tick 8/8, none mid-wave**, slots alternate auto-1/auto-2 (a torn write never costs the only autosave), throttled intervals 23–64 s (≥ 20 s), level_transit unthrottled. (The scenario's own checker flagged 5 rows because it did not know the `skipped: "throttle"` rows and the merged reason — re-derived above from the raw log; not defects.) Run-end / return-to-camp / quit safe points: Step 9 and Step 10.

Frame cost: in the real-time run the longest rAF gaps near room entries were 36–109 ms WITH an autosave and 48–73 ms at room entries WITHOUT one (throttled) — the room change, not the save. Controlled A/B in steady Level 1 combat (sc-autosave-ab, 10 forced autosaves vs 10 idle windows interleaved, 1 s each, 82 fps): autosave windows max gap p50 30.5 ms / max 54.7 ms (2/10 windows with one frame > 50 ms); idle windows p50 36.3 ms / max 217.8 ms (2/10). The save adds no measurable frame cost over idle noise (self-timed pieces ≤ 8.4 ms, spread over calm frames). G2.7 PASS in substance; the literal "no frame > 50 ms" is unmeasurable on this harness because idle frames exceed it at the same rate.

## Step 9 — High scores, records, run end, Save & Quit (tools/gntcsave3-sc-scores.mjs, -sc-runend.mjs, -sc-savequit.mjs)

| check | result | evidence |
|---|---|---|
| Quit to Lobby (pause, confirmed: "Quit to the lobby? This abandons the current campaign and returns you to camp. Unlocks and records are kept.") | entry `abandoned` score 160 = recomputed 100×1 room + 5×12 kills; records `abandoned 1, campaigns 1, furthestLevel 1` | sc-scores abandon |
| Party wipe in Level 1 | card "THE CAMPAIGN ENDS … SCORE 0 · #2 on your records" → Enter → camp; entry `defeat` 0 = recomputed; `defeats 1` | scores-after-defeat.png |
| Full campaign L1 → L2 → L3 (player portal start) | CAMPAIGN COMPLETE card "10,815 · New best!"; entry `victory`, 24 rooms, levels 3; **10 815 = my recomputation** Σ(100·8+5·1+1000)·{1, 1.5, 2} = 8 122.5 → 8 123, + speed bonus 2 700 − 7.68 s = 2 692; records `campaignsCompleted 1, furthestLevel 3, fastestCampaignSec 8, levelClears {1:1,2:1,3:1}`, unlocks [1,2,3] | scores-campaign-complete.png |
| Persistence across a reload | high-score table byte-identical; Records screen: "#1 10,815 I → III · Campaign · Campaign complete · 24 · 3 · 0:08 / #2 160 Abandoned / #3 0 Defeat; Campaigns completed 1 of 3; Furthest level Level III; Level I/II/III cleared ×1; Levels open I · II · III" | scores-records-after-reload.png |
| Loading an OLDER slot (saved before any run ended) | high scores 3/3 and records unchanged — meta-progression is not rolled back by a slot load | sc-scores olderSlotLoad |
| Tab closed ON the end card, then Continue (run_end autosave) | the defeat / CAMPAIGN COMPLETE card is shown again, Enter → camp idle; records and high scores **not double-counted** (defeat run: n 1 / defeats 1 before and after; victory run: n 1 / completed 1 / best 10 816 before and after) | runend-*-continued.png, sc-runend.json |
| Run-end autosave | `run_end` captured on the defeat tick (855), unthrottled; `return_to_camp` 25 ticks later skipped by the throttle (the run_end save already holds it) | sc-savequit runEndAutosave |
| Save & Quit to Title from Level 1 combat | confirm "Save and quit to the title? Your run is written to the autosave slot first." → auto-2 at the paused tick 646, hash f9010f7c3c3c6395 = the live hash at pause → title "Continue — Autosave · Level I · The Hollow Wood · Room 1" → Enter restores tick 646 / that hash exactly | sc-savequit saveQuitMidCombat |
| F5 then the tab closed 250 ms later (page reload) | the quicksave is on disk (tick 748), no `.tmp` left | sc-savequit f5ThenClose250ms |

## Step 10 — Save files vs level locks, and the setting-out card (tools/gntcsave3-sc-lock.mjs, -sc-startcard.mjs)

- A PLAYER-made Level 2 save (portal campaign, `harness false`) exported and imported into a FRESH profile (only Level 1 open): Load → refused with toast "That save is in a level you haven't unlocked yet — Clear The Hollow Wood to unlock"; nothing loaded, the title stays usable (sc-lock loadLocked manual-3). The row itself carries no lock marker before you try (minor).
- A save made in a harness campaign (`startCampaign {level:3}` — the same flag the documented `?level=N` URL sets) imported into that fresh profile loads and plays Level 3 (`harness: true` exempts it; title Continue even picked it). *Advisory A3:* such a file is a save-file path around the level locks the spec forbids; it inherits the `?level=N` probe bypass, so I do not rate it must-fix, but a save should drop the harness exemption when it is exported/imported.
- **FAIL (must-fix F2): wrong save description on the setting-out card.** Level 1 cleared → Quit to Lobby → Level Select `campChoose(2)` (player path, `harness false`) → card "SETTING OUT · LEVEL II · THE SUNKEN MILL · The campaign begins here…" (startcard-live.png). Saving on it (pause > Save Game) — and the `level_transit` autosave the game writes on it (auto-2, tick 577) — are described as **"Level II cleared — on the road to the next level"** in the slot row and the detail "Where", and the title shows **"Continue — Slot 1 · Level II cleared · just now"** (startcard-saved-row.png, sc-startcard.json). Level II has not been played; the player is about to start it. The same label appears for a Level-3 start ("Harness L3 · Level III cleared", sc-lock). G2.3 "metadata correct" fails for every save taken on a depart card.

## Step 11 — Other gates, production build, goldens

- **G2.9** (tools/gntcsave3-sc-newgame.mjs): a campaign played, Quit to Title, **New Game** (navigated to `ap-title-new`) → frozen at tick 0, seed 3725502864 → my digest 6fb6a034… / game 0129f5c87b08c456, **identical** to a fresh `?menu=0&seed=3725502864&freeze=1` boot. (My first attempt pressed Enter on the focused Continue and loaded the autosave — expected, Continue is the default when a save exists.)
- **G2.11**: tree saved with ids …10,11,12,15,16,17 applied over a live registry …6,7,8,9,77,78 → entities strictly ascending, exactly the saved set; plus the 8 in-page/reload continuations of Step 3.
- **G2.10**: `node tools/gntM2-goldens.mjs` (read-only use) → **9/9** match (kill_all / defend / run × seeds 1–3), captures/gntcsave3-goldens.json.
- **Production bundle** (`npx vite build --outDir dist-gntcsave3`, `vite preview` on MY port 4324, PID 77916 — killed; no process left with dist-gntcsave3 / old087 in its command line): round trip combat / card / l3content bit-identical in all legs (saves 258–296 ms); keyboard slot flows identical to dev (create 58 ms, overwrite cancel/confirm, rename, delete, Save & Quit → Continue focus, title Load of slot 2 in 162 ms, reload → slot 1 in 160 ms); mouse flows (sc-mouse) OK; 13 corruption cases OK; export → import hash 0ebdbfbdde9c9905 kept, old schema-2 imports OK, bad files refused; **F1 reproduces** (mousepath-prod: Slot 2 hovered, Slot 1 loaded); player-path campaign card save → reload → Continue → L2 2/2 OK, Continue onto the card + Enter spam 3/3 OK, 0 page errors in those 5 runs.
- *Advisory A4:* `TypeError: Cannot read properties of undefined (reading 'isReady')` (three bundle, a compileAsync callback) — 3 of 4 production round-trip runs that included the card moment (roundtrip-prod, -prod-card, -prod-card1; 0 in -prod-card2), timestamped in the **reload leg** (URL without `fresh`): a card save loaded into a cold page, then `sim.stepN` drives the card past its hard bound while the next level's shaders are still compiling. Never with real input (0/5 prod, 0 on dev); a real device whose shader compile outlasts the card's 10 s hard bound would hit the same race. Owner: campaign level manager preload/teardown.
- Harness notes (not defects): puppeteer's `waitForFileChooser` missed the chooser in ~50 % of Export→Import sequences on both servers, while the instrumented page shows the game calling `input[type=file].click()` with active user activation every time (sc-expimp) and direct Import… presses opened it 8/8 (sc-importbtn); the mouse FAILs inside sc-slots come from my wrong assumption that a row click only selects (a click on an empty row saves at once; a filled row asks to overwrite) — sc-mouse covers the mouse paths.

## Step 12 — Save responsiveness, gamepad, multiplayer, regression smoke

**FAIL (must-fix F3): a manual save / quicksave sporadically hangs ~3.1 s with no feedback, swallows further presses and loses its thumbnail.** Measured press → slot written (in-page poller every 20 ms, tools/gntcsave3-sc-firstsave.mjs):
- captures/gntcsave3-sc-firstsave.json: 145, **3 098**, 285, 178 (gamepad A), 192 ms; captures/gntcsave3-sc-firstsave-reps.json: 334, 195, **3 081**, 152, 143, 141 ms.
- In both stalled presses the frames were healthy (reps #3: 351 rAF frames in 4 s, max gap 42 ms, p50 12 ms), the state capture happened at once (`captureLog` captureTick 213, "between": true), but `lastThumb()` is **null**: the thumbnail encoder (`via: "worker"`, normally 82–180 ms) never answered and the write went out on a ~3 s bound. For those 3.1 s the slot still read "Slot 1 — empty", no "Saving…" text, no toast; the second Enter pressed 350 ms later did nothing (in every normal run it opened the overwrite confirm at ~500 ms); the slot finally appears with the "◇" no-picture marker instead of a thumbnail.
- **Display harness (headful, a real window at the panel cadence)**, captures/gntcsave3-sc-firstsave-headful.json: 203, 153, 173, 163, **3 118** (thumb null), 148, 195, **2 062** ms (thumb worker took 1 987 ms) — 2 of 8, so not a headless artifact.
- Same 3.1 s signature elsewhere: F5 at the start of Level 2 (sc-campaign run 2: 3 085 ms before "Quicksaved"; run 1 not yet written at 1.2 s), the gamepad A save (sc-gamepad: nothing in the list 0.9 s after A, written seconds later), the very first Enter in sc-uiexplore2 (> 1.5 s), and the probe saves in Step 3 (boss 3 100 ms, l2mid 3 082 ms). Roughly 6 of ~45 real-input save presses in this round (~13 %).
- Against G1.3 ("input → visual change p95 ≤ 50 ms, max ≤ 100 ms") and every benchmark (Hades/StS/Stardew/Skyrim acknowledge a save at once), a 3-second silent save that ignores input reads as broken, and the saves it produces lack the thumbnail G2.3 requires.

Gamepad (mocked standard pad, sc-gamepad): pad Start opened the pause in-game (2nd run; the 1st run's Start came before the pad was polled), D-pad reached Save Game and slot 2, A saved (landed late — F3), B backed out of the confirm, the saves screen and the pause, one level at a time.

Multiplayer (my own server `node server/index.mjs --port 7846`, PID 65868 — killed; tools/gntcsave3-sc-net.mjs): after ready + start, the **guest** has `canSave: {ok:false, reason:"Only the host can save an online session"}`, its pause menu offers only Resume / Settings / **Leave Session** (no save/load entries), API save → `not_allowed` (F5 as a guest is silently ignored — no toast, minor); the **host** saves with `meta.network: true`; that file imported into a fresh offline page loads into single-player (`net offline`, player + tank/swordsman/archer AI seats), Level 1 combat. (In the pre-start lobby both clients still counted as offline and could save — fine.)

Regression: `node tools/cert-capture.mjs shot gntcsave3-smoke` exit 0, 0 PAGEERROR; core loop (`?seed=7&menu=0` + tools/actions/gnt-arch-coreloop.json) exit 0, 0 PAGEERROR: camp tick 657 → combat room 1 tick 681 → reward tick 869.

## Step 13 — Benchmark scoring (checklist from Step 1, written before any capture)

| # | item | score | evidence |
|---|---|---|---|
| B1 | autosave at safe points only | MET | 8/8 autosaves on room_enter / shop_open / level_transit / run_end, capture tick = event tick, ≥ 20 s throttle (a crash can cost up to one room — Hades/StS save every room; acceptable by PLAN) — Step 8 |
| B2 | Save & Quit, Continue first on the title | MET | mid-combat Save & Quit → Continue restores the paused tick/hash; Continue focused after Save & Quit and after reload — Steps 4, 9 |
| B3 | exact resume incl. RNG | MET | 8/8 moments bit-identical 600-tick continuations, dev + prod — Steps 3, 11 |
| B4 | Continue never resurrects a finished run | MET | Continue from the run_end autosave re-shows the end card then camp, no second record — Step 9 |
| B5 | crash-safe writes | MET | tmp→bak→main, newer tmp promoted / bad tmp dropped across a reload, F5 then tab closed after 250 ms survives — Steps 5, 9 |
| B6 | meta-progression separate from the run save | MET | loading an older slot keeps 3/3 high scores and records — Step 9 |
| B7 | records update exactly once | MET | abandon / defeat / complete each once; no double count on a resumed end card — Step 9 |
| B8 | slot metadata + screenshot | PARTIAL | name, place, date, relative time, playtime, party HP, skills, Glint, challenge, size, version, thumbnail — but a depart-card save says "Level N cleared" (F2) and stalled saves have no thumbnail (F3) |
| B9 | newest first | MET | "N saves · newest first", autosaves & quicksave grouped on top — Step 4 |
| B10 | overwrite confirm, safe default | MET | "Overwrite “Slot 1”? … will be replaced." Cancel focused, cancel changes nothing — Step 4 |
| B11 | delete confirm | MET | "Delete “Slot 3”? … This can't be undone." Cancel focused — Step 4 |
| B12 | title Load restores exactly the chosen slot | PARTIAL | keyboard exact (127–162 ms, dev + prod); mouse via the detail-panel Load button loads a different slot (F1) |
| B13 | mid-game load warning | MET | "Anything since your last save will be lost." — Step 4 |
| B14 | autosave / quicksave distinct, never over manual slots | MET | auto-1/auto-2 rotating + quick, separate section; manual slots untouched — Steps 4, 8 |
| B15 | keyboard, mouse, gamepad | PARTIAL | keyboard and mocked gamepad complete; mouse hover retargets the panel (F1) |
| B16 | many saves: scrolling, visible selection | MET | wheel scrolls to Slot 8, focus ring on the selected row — Step 4 |
| B17 | versioned schema, migration, newer refused | MET | genuine v0.5.87 schema-2 act runs → schema-3 campaigns that play on; schema 99 refused, file untouched — Steps 5, 6 |
| B18 | checksum | MET | one-tick and one-float flips → "integrity check failed" — Step 5 |
| B19 | atomic write, quota | MET | real QuotaExceededError: message, previous save intact — Step 5 |
| B20 | backup offered | MET | "Restore backup" from the damaged row, restored hash = previous good save — Step 5 |
| B21 | missing keys | MET | state / registry / hash removed → clean refusal, live state untouched — Step 5 |
| B22 | export / import validated, no silent overwrite | MET | real download + file chooser, hash kept, duplicate import → next free slot, bad files refused — Steps 6, 11 |
| B23 | deterministic round trip | MET | Step 3 (dev) + Step 11 (prod), G2.9, G2.11, goldens 9/9 |
| B24 | save fast, non-blocking, acknowledged | NOT MET | normally 140–340 ms with a toast, autosave frame cost ≈ idle; but 2–3.1 s silent stalls that swallow input in ~13 % (headless) / 2 of 8 (headful) presses (F3) |
| B25 | storage honesty | PARTIAL | "Browser storage N KB used", "Saves last for this visit only (browser storage is off)", quota advice to export — no line saying that clearing site data deletes the saves |

**Score: 20 / 25 met, 4 partial, 1 not met.**

## Step 14 — PLAN §7 M2 + campaign save gates (re-measured, not trusted)

| gate | result | where |
|---|---|---|
| G2.1 round trip at the listed moments + after reload | PASS (8 moments incl. card, carried L2, L3 content; my own SHA-256 digest + the game hash; dev + prod) | Steps 3, 11 |
| G2.2 completeness spot list | PASS | Step 3 |
| G2.3 slot menu | **FAIL** — create / overwrite / delete / rename / title load ≤ 1.5 s pass by keyboard, but metadata is wrong on depart-card saves (F2), stalled saves carry no thumbnail (F3), and the mouse detail-panel buttons act on the wrong slot (F1) | Steps 4, 10, 12 |
| G2.4 corruption | PASS (13 cases + real quota) | Step 5 |
| G2.5 atomicity / torn writes | PASS | Step 5 |
| G2.6 files | PASS (dev + prod) | Steps 6, 11 |
| G2.7 autosave safe points / frame cost | PASS in substance (A/B equal to idle noise) | Step 8 |
| G2.8 high scores | PASS (formula recomputed 3/3, reload, Records, "New best!") | Step 9 |
| G2.9 New Game = fresh boot | PASS | Step 11 |
| G2.10 goldens | PASS 9/9 | Step 11 |
| G2.11 registry order | PASS | Step 11 |
| G2.12 capture point | PASS (every autosave captureTick = eventTick; manual captures "between" frames) | Steps 8, 12 |
| GC.9 campaign save / Continue / migration / level_transit autosave | PASS for the mechanics (card save → reload → Continue → card → L2 with the carried build; schema-2 act runs migrate; level_transit autosave at every transition incl. a Level-2 start) — label defect F2 | Steps 6, 7, 10 |
| GC.10 records | PASS | Step 9 |

Builder claims re-checked: build-M2 "G2.1–G2.12 all pass" — true except G2.3 (F1 and F2 are new since; F3 not caught). fix-M2-r1 SAVE-R1-F1 (pause over the saves screen) and SAVE-R1-F2 (title focus after Save & Quit) — both fixed, re-verified on dev and prod. build-CAMPAIGN D8/D12 (lock refusal with a reason), schema 3 + MIGRATIONS[2], level_transit autosave, Continue onto the card — true; its save labels on the depart card are wrong (F2).

## Findings

**MUST-FIX**
- **F1 (mouse, wrong slot acted on)** — Save/Load rows select on hover and the Load / Rename / Export / Delete buttons live in the right-hand detail panel below the list; moving the pointer straight from the chosen row to a button crosses the rows beneath and silently retargets the panel. Title Load Game: hover Slot 2 → click Load → **Slot 1 loads** (no confirm on the title path); Export likewise exports the other slot; Delete/Overwrite are only rescued by a confirm that names the wrong slot. Reproduced dev + prod. Evidence: gntcsave3-mousepath-hover-manual-2-sv-act-load.png vs gntcsave3-mousepath-preclick-manual-2-sv-act-load.png, captures/gntcsave3-sc-mousepath-shots.json and -prod.json. Suspects: src/ui/menu/saves.js (hover → selection), src/app/nav.js.
- **F2 (wrong save description)** — a save, or the level_transit autosave, taken on the "SETTING OUT · LEVEL II" card of a Level-Select start is described as "Level II cleared — on the road to the next level" in the row and the detail, and the title shows "Continue — Slot 1 · Level II cleared"; same for a Level-3 start. Evidence: gntcsave3-startcard-live.png, gntcsave3-startcard-saved-row.png, captures/gntcsave3-sc-startcard.json, -sc-lock.json. Suspects: src/save/slots.js / src/save/index.js (meta description of phase transit ignores card kind "depart"), src/ui/menu/saves.js, src/ui/menu/title.js.
- **F3 (silent 2–3 s save stall, input swallowed, thumbnail lost)** — in ~13 % of manual/quick saves (2 of 8 in a headful window) the thumbnail worker answers late or never; the write waits up to ~3.1 s, the UI shows nothing (slot still "empty", no "Saving…", no toast), a second press is ignored, and the slot is written without its picture. Evidence: captures/gntcsave3-sc-firstsave.json (#2 3 098 ms), -firstsave-reps.json (#3 3 081 ms, lastThumb null, frames healthy), -firstsave-headful.json (#5 3 118 ms, #8 2 062 ms with workerMs 1 987), -sc-campaign.json (F5 3 085 ms). Suspects: src/save/thumbnail.js, src/save/thumb-worker.js, src/save/index.js (the bound), src/ui/menu/saves.js (no pending state).

**ADVISORIES**
- A1 — Upgrade: an old Act I victory is not carried into the campaign records (Records shows "Furthest level —" and "Level I cleared room 8/8" while `levelClears[1] = 0`). upgrade-records.png.
- A3 — A save made in a harness campaign (`?level=N` / debug `startCampaign`, `harness: true`) loads in any profile after export/import — a save-file route around the level locks the spec forbids (inherits the `?level=N` probe bypass). captures/gntcsave3-sc-lock.json.
- A4 — Production bundle: `TypeError … reading 'isReady'` (three compileAsync callback) in 3 of 4 probe round trips that load a card save into a cold page and `sim.stepN` past the card's hard bound while the next level compiles; 0 with real input in 5 production runs. A device whose shader compile outlasts the 10 s hard bound could hit it. Owner: the campaign level manager. captures/gntcsave3-sc-roundtrip-prod-card*.json `timedErrors`.
- A5 — Small UX/text nits: a locked save's row gives no lock hint until Load is pressed (then a clear toast); F5 as a net guest is silently ignored; "schema 0" reports "schema missing"; a PNG import says "cut short or garbled"; `save.list()` status reflects the last read, not an external edit, until the slot is read again.
- (A2 from Step 7 is folded into F3.)

## Verdict
FAIL — 3 must-fix (F1 mouse retargets the Load/Export/Delete panel so a different slot is loaded; F2 depart-card saves labelled "Level N cleared"; F3 about 13 % of saves stall ~3 s silently, drop input and lose their thumbnail). The save engine itself is strong: 8/8 bit-identical round trips (dev + prod, incl. the card and carried Level 2/3), 13/13 corruption cases, real quota, torn writes, export/import, a genuine schema-2 → 3 upgrade from v0.5.87, safe-point autosaves, exactly-once records, goldens 9/9, 0 page errors on every real-input path. Benchmark 20/25.

Processes: I started vite preview PID 88648 (old build, port 4324), vite preview PID 77916 (production, port 4324) and the net server PID 65868 (port 7846); all three killed and verified gone. Nothing committed.
