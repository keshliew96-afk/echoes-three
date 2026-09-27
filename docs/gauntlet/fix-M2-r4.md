STATUS: PARTIAL
fix-M2-r4 (SAVE4-F1: stale second tab erases profile on unload) — in progress

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
