STATUS: COMPLETE
VERDICT: SAVE4-F1 FIXED — a stale second tab reloaded / closed / navigated away no longer erases high scores, records or level unlocks (dev + production BEFORE hs 1->0, unlocks [1,2]->[1], levelClears {1:1}->{1:0} -> AFTER all kept); profile merged on every write, slot catalogue + ended runs re-read before every decision, other tabs follow live. Commits 8a9a8bf (v0.5.125), ac89332 (v0.5.128), checkpoint (v0.5.129).

## Steps
### Step 1 — BEFORE (reproduced on dev, v0.5.124)
- Driver: tools/gntfixM24-drive.mjs (own-prefixed copy of the critic's driver; runs the critic's scenario modules unchanged).
- `node tools/gntfixM24-drive.mjs tools/gntcsave4-sc-twotabs4.mjs --tag before-dev` -> captures/gntfixM24-sc-twotabs4-before-dev.json FAIL:
  storage before tab B's F5: hs 1, unlocks {"acts":[1,2]}, levelClears {1:1}, abandoned 1 -> after: hs 0, unlocks {"acts":[1]}, levelClears {1:0}, abandoned 0.
  Tab A after reload: records all zero, Level Select "LEVEL II … Clear The Hollow Wood to unlock" (captures/gntfixM24-twotabs4-level-select-after.png).
- Root cause: src/save/profile.js keeps the whole profile in memory from boot and every write (flush on pagehide / visibilitychange-hidden, playtime on every save, recordRun, noteLevelClear) serialises that in-memory copy over echoes.profile.v1 — a blind overwrite, never a merge with what another tab wrote meanwhile. Two exits (pagehide + a second flush) also rotate the stale copy into .bak.
- Same pattern (stale in-memory cache written over storage / used for decisions) also in src/save/index.js: the slot catalogue `slots` (index writes, pickAutoSlot, firstEmptyManual import target, latest() = Continue) and `endedRuns` (markEnded writes its boot-time list).
- BEFORE matrix (critic's twotabs3, Level 1 cleared in A, GCS4_ACLEAR=1): captures/gntfixM24-sc-twotabs3-before-dev.json — neutral/reload exits 4/4 LOST (hs 1->0, unlocks [1,2]->[1], levelClears {1:1}->{1:0}); close 2/2 kept.

### Step 2 — fix (uncommitted -> committed in step 3)
- src/save/profile.js: merge-on-write profile store. `base` (last stored copy) + this tab's `pending` ops (recordRun, noteLevelClear, unlockLevel) + `deferred` counters (playtime, lastAct, furthestLevel). Every write = sync() (re-read storage; a torn main falls back to .bak; nothing readable keeps this tab's copy) + replay own ops + write; failed writes keep ops pending (applied exactly once). Ranks / New best measured against the freshest stored profile. .bak only receives a readable profile (writeAtomic `backupIf`).
- src/save/storage.js: writeAtomic(key, text, { backupIf }) — optional guard so a damaged main never replaces a good backup.
- src/save/slots.js: writeIndex writes in catalogue order (identical bytes from every tab) and returns the stored text.
- src/save/index.js: ensureFresh() before every catalogue read/decision (list/latest/hasAny, pickAutoSlot, newGameImpact, firstEmptyManual, F9 check, late thumb attach, index writes via putSlot, flush) — the stored index differing from the one this tab wrote = another tab changed a slot -> rescan; endedRuns re-read before use and read-modify-write in markEnded; `storage` event -> profileStore.sync() (+ onProfileChanged listeners) and a debounced (150 ms) slot rescan (+ onSlotsChanged listeners); debug `__echoes.save.tabs()`.
- src/ui/menu/records.js / saves.js: an open Records / Saves screen redraws when another tab writes.
- Node probe tools/gntfixM24-profile-tabs.mjs: 26/26 (critic sequence, both tabs recording, playtime + unlock merge, idle flush writes nothing, quota -> pending -> applied once, formula/rank/top-10, torn main + .bak, torn tmp promotion, reset vs stale exit).
- Smoke: captures/gntfixM24-smoke.png exit 0, 0 PAGEERROR.

### Step 2b — AFTER on dev
- `node tools/gntfixM24-drive.mjs tools/gntcsave4-sc-twotabs4.mjs --tag after-dev` -> OK: storage before B's F5 hs 1 / unlocks [1,2] / levelClears {1:1} / abandoned 1 -> after: identical. Tab A reloaded: Records 1 run, best 1,805, Levels open I · II (captures/gntfixM24-twotabs4-records-after.png); Level Select: Level II selectable "Not cleared yet · Campaign Level II -> III" (captures/gntfixM24-twotabs4-level-select-after.png).
- Playtime across tabs: captures/gntfixM24-sc-playtime-dev.json OK — B's exit added 3.0 s = its own 179 unwritten ticks; A's run kept.

### Step 3 — committed 8a9a8bf (v0.5.125) + production BEFORE/AFTER
- Commit 8a9a8bf fix(save) (v0.5.125). Pre-commit: smoke exit 0 / 0 PAGEERROR; core loop dev (?seed=7&menu=0, shot mode, tools/actions/gntfixM24-coreloop.json = copy of gnt-arch-coreloop): camp 69 -> portal 224 -> combat room 1 248 -> reward 440 (run_start@238, room_cleared@370, reward_offer@370), 0 PAGEERROR; goldens tools/gntM2-goldens.mjs 9/9.
- Production builds from clean `git archive` exports (so other agents' uncommitted WIP is not in them): fixed 8a9a8bf = v0.5.125 entry index-B2Lk3rYj.js on MY port 4362 (Windows PID 69392); pre-fix 26ffd81 = v0.5.124 entry index-DGyKhaqD.js (the critic's exact build) on 4363 (PID 83612).
- Critic sequence twotabs4: BEFORE prod (4363) FAIL hs 1->0, unlocks [1,2]->[1], levelClears {1:1}->{1:0}, abandoned 1->0 (captures/gntfixM24-sc-twotabs4-before-prod.json, Level II locked: captures/gntfixM24-twotabs4-level-select-after-before-prod.png). AFTER prod (4362) OK, all kept (captures/gntfixM24-sc-twotabs4-after-prod.json, Level II open: captures/gntfixM24-twotabs4-level-select-after-after-prod.png). Dev after: OK (captures/gntfixM24-sc-twotabs4-after-dev.json).
- Storage-diff matrix (critic twotabs3 + B's unwritten seconds, tools/gntfixM24-sc-twotabs3x.mjs, Level 1 cleared in A): BEFORE dev 4/4 neutral/reload LOST; AFTER prod 5/5 rows kept (hs 1->1, unlocks [1,2], clears {1:1}); each exit adds exactly B's unwritten seconds (3.8 s -> +3.8, 5.1 -> +5.1, 3.9 -> +3.9, 4.2 -> +4.2) (captures/gntfixM24-sc-twotabs3x-after-prod.json).
- tools/gntfixM24-sc-tabs.mjs: BEFORE prod 11 FAILS (B's open Records stayed "0 runs" and Level II locked; B listed no saves, Continue none, B's next autosave = auto-1 = A's run in progress, B's real autosave overwrote A's auto-1 (seed 5 -> 6), B's import landed on manual-1 (A's slot), A's open saves screen kept a deleted row, ended runs lost A's run ["run:6"], profile counted 1 of 2 runs — B's recordRun overwrote A's). AFTER prod + dev: 0 FAILS (B Records "1 run · 0 won" + unlock [1,2] live, 4 profile adoptions; B lists auto-1 + manual-1, Continue auto-1, rotation auto-2, import manual-2, A's manual-1 hash kept, A's saves screen 4 -> 3 rows, ended ["run:5","run:6"], runs 2). Screens: captures/gntfixM24-tabs-B-records-live-prod.png, captures/gntfixM24-tabs-A-saves-live-prod.png.
- Playtime: captures/gntfixM24-sc-playtime-prod.json OK (B's exit +3.3 s = its own 197 ticks).
- Core loop prod (4362): camp 117 -> portal 272 -> combat 298 -> reward 487 (run_start@284, room_cleared@417, reward_offer@417), 0 PAGEERROR. Save-engine regress (tools/gntfixM24-regress.mjs = own-prefixed copy of gntfixM23-regress) prod 8/8 (roundTrip, save, exportImport, rename, autosaveQuit, overwrite, remove, runMeta), 0 page errors.

### Step 4 — self-found: damaged main vs an older .bak (would have been a regression of the critic's corruption leg)
- The critic's corrupt scenario records a run, then truncates echoes.profile.v1 under the RUNNING page and reloads. The .bak there is the copy BEFORE that run. The first cut of sync() fell back to .bak whenever main was unreadable, so the page's exit would have written the older .bak (run lost). Fix: on a damaged main, adopt the newest readable copy among this tab's own / .bak / .tmp by savedAt (never a backup older than the tab's copy), and flush() repairs a damaged main even when the tab has nothing pending.
- Node probe now 30/30 (case 10: damaged main + older .bak keeps the tab's newer copy, reload report ok; clean tab repairs on flush; a stale tab adopts a NEWER .bak).
- Critic corrupt scenario on dev: profile leg PASS (hs 1 kept, report ok). Its close-mid-save row d=150 ms was "OTHER" once: the probe reads `want` = hash() in one evaluate and starts save() in the next, and the save captures at the next tick end — a tick between the two calls gives a legit later-tick file (the critic noted the same race class on prod); not touched by this fix (no slot-file write path changed).

### Step 5 — final regression on the production build of ac89332 (v0.5.128, entry index-C61-EBy7.js, MY port 4362, PID 78252, killed)
- Critic twotabs4: OK, storage before/after B's F5 identical (hs 1, unlocks [1,2], levelClears {1:1}, abandoned 1) — captures/gntfixM24-sc-twotabs4-final-prod.json, Records + Level Select screens captures/gntfixM24-twotabs4-records-after-final-prod.png, captures/gntfixM24-twotabs4-level-select-after-final-prod.png.
- tools/gntfixM24-sc-tabs.mjs: OK 0 FAILS (captures/gntfixM24-sc-tabs-final-prod.json).
- Critic profclobber: OK — leg1 an injected profile (416 B, hs 1, unlocks [1,2]) written under a running page is KEPT after that page's unload (545 B = merged with the page's playtime; BEFORE: 403 B, hs 0, unlocks [1]); leg3/leg4 two-tab runs kept (hs 3 after both tabs recorded).
- Critic scores (G2.8) OK, newgame (J3-F3 rotation + G2.9) OK, 0 page errors.
- Critic corrupt: profile leg OK (main 605 B / .bak 401 B older -> truncated main -> reload hs 1, report ok: the Step-4 rule at work); 1 FAIL "case truncate5 did not return within 25 s" = the critic's own recorded ADVISORY page stall (critic-save-r4 Step 16: loads ~60 ms apart freeze the page in native GL code on production 4/4; not a save-path defect, reproduced on v0.5.124 by the critic).
- Dev after the last commit: smoke exit 0 / 0 PAGEERROR; core loop (?seed=7&menu=0): camp 122 -> portal 276 -> combat room 1 663 -> reward 845 (run_start@288, room_cleared@773, reward_offer@773), 0 PAGEERROR (first attempt hit a 180 s navigation timeout while the dev server was loaded — retried per the harness contract).
- Node: tools/gntfixM24-profile-tabs.mjs 30/30; goldens tools/gntM2-goldens.mjs 9/9 (no sim file touched).

## Decisions (PLAN was silent on several tabs)
- D1 Merge, never lock: a second tab stays fully playable (no "open in another tab" lockout — browsers restore old tabs on their own, and a lockout would strand the player's session); instead nothing a tab writes can take back another tab's progress. Profile = stored base + this tab's op log (runs, level clears, unlocks) + counters (playtime, last level, furthest level); counters from both tabs add up, unlocks union, high scores merge (top 10), ranks / New best measured against the freshest stored copy.
- D2 Last writer is never blind: every profile write re-reads storage first (works even when a frozen tab never received the storage event); the `storage` event is only the live-UI layer (Records, Level Select via content.unlockedActs, title Continue, saves list).
- D3 A damaged main is repaired from the newest readable copy (this tab's / .bak / .tmp by savedAt); .bak only receives a readable profile (writeAtomic `backupIf`). A cleared main (null — the player cleared site data) is re-written only when the tab has something of its own to write (old behaviour).
- D4 Slots: the index is the cheap change detector (catalogue-ordered bytes, identical from every tab); decisions re-scan when it differs. Slot FILES are whole saves chosen by the player, so a manual overwrite in one tab of a slot the other tab just wrote is still an explicit overwrite (the confirm reads the fresh list).
- D5 Explicit Records reset (profileStore.reset) still wins over other tabs' older copies (a later stale exit adds only its playtime).

## Cross-owner edits
- src/ui/menu/title.js (M1): one anchored line `// @gnt:M2 TABS` — `app.events.on('saves_changed', schedule)` so the title's Continue follows another tab's saves (the save service emits the app event after a storage-driven re-scan).
- docs/gauntlet/PLAN.md §3.4 Profile: the multi-tab contract paragraph; docs/TESTING.md: fix-M2-r4 note.
- Not changed, noted for M1: src/app/settings.js persists the whole settings blob on pagehide only when THIS tab changed a setting (dirty) — last-changer-wins for settings, no silent loss of progress; left as is.

## Processes
- vite preview 4362 (PID 69392, then 78252) and 4363 (PID 83612) — all killed, no listener on 4362/4363, no node process with gntfixM24/dist-gntfixM24 left. Export dirs (git archive of 8a9a8bf / 26ffd81 / ac89332) removed after unlinking their node_modules junctions.
