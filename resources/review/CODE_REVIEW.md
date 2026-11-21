# Code review: Echoes at v0.5.305

Whole-repository review of `gauntlet` at `cbb181b` (the merge of PR #90), done 2026-10-19 before the next content plan. Nothing in the repo was changed. Every finding marked **Proved** was reproduced with a script against the real modules or a local server (never the live site); the scripts are in [code-review-proofs/](code-review-proofs/), grouped by area. **Inferred** means read from the code and not run.

## Verdict

The game is in better shape than ninety incremental slices would suggest. The data tables cross-check clean, the sim is fully seeded (no `Math.random` or `Date.now` anywhere in `src/sim`, `src/data` or `src/campaign`), save files round-trip and survive retired content, co-op replication covers every new system, all ten languages are complete with zero placeholder errors, and five camp→run→camp cycles showed no GPU, audio, listener or timer leak.

What needs attention before more content lands:

1. **The server can be knocked over by one client** (out of memory in seconds), and on Render all its per-IP limits probably act as one shared bucket.
2. **Three ways to lose or corrupt a player's progress** in the save system (a failed cloud load deletes saves; an older tab wipes or prunes a newer profile; Continue loses the run's deed progress).
3. **Two real gameplay bugs** (Daily wins credit the wrong bosses; the last room's enemies, pilgrim and Waystone follow the party into shops and vaults).
4. **Debug commands and harness URL flags ship to players**, so the Daily board and the unlock chain can be skipped from the address bar or console.
5. **The probe suite is not a safety net any more**: 8% of probes cannot run, the goldens are not in the repo, and there is no CI. Every future slice leans on this.

None of these is a build break, and none is losing data on the live site today in a way a hotfix must stop this hour, so no PR was opened.

## Top findings

| # | Severity | Area | Finding | Proof |
|---|---|---|---|---|
| 1 | Critical | server | No WebSocket write backpressure: one client takes the server to 1.3 GB | Proved |
| 2 | High | server | Per-IP limits likely shared by every player behind Render's proxy | Inferred |
| 3 | High | server | Cloud uploads buffered (3 MB each) before the rate limit: 527 MB peak | Proved |
| 4 | High | server + client | Daily board scores forgeable; debug `cmd` surface ships to players | Proved |
| 5 | High | saves | A cloud load that fails part-way deletes local slots, says "Nothing was changed", leaves autosave off | Proved |
| 6 | High | saves | A newer-version profile is treated as corrupt and overwritten by a fresh one | Proved |
| 7 | Medium-high | saves | An older build prunes unknown unlocks, deeds and marks and writes the result back | Proved |
| 8 | High | sim | Daily wins credit bosses the party never fought (337 of 365 days) | Proved |
| 9 | Medium-high | client | Harness URL flags (`?sable=1`, `?level=4`, `?partygrant=max`, `?rush=1`) unlock content in the player build | Inferred, partly |
| 10 | Medium | sim | Previous room's retreaters, pilgrim and Waystone carry into shop, event and vault rooms | Proved |
| 11 | Medium | saves | Per-run deed progress is not in the save; Continue after a reload loses it | Proved |
| 12 | Medium | tooling | Probe suite: 78 probes unrunnable, goldens not committed, no CI, many stale | Proved |
| 13 | High (perf) | bundle | 3.6 MB main chunk loads everything up front; `three` is only 14% of it | Proved |

### 1. Critical: one client can run the server out of memory
- **Where:** `server/ws.mjs:181-206` (`_frame`), `ws.mjs:261` (ping→pong), `server/server.mjs:206,220`. `ws.mjs:141` defines a `bufferedAmount` getter that nothing calls.
- **Why it matters:** nothing checks `socket.writableLength`, so a client that stops reading makes Node queue every outgoing frame in memory. Pings are answered inside `ws.mjs` before the rate limiter and before `hello`. The free Render instance has 512 MB and runs one process, so this takes down co-op, cloud saves and the daily board for everyone. A real guest on a stalled mobile link causes the same growth, only slower.
- **Proof:** `server/ping_nohello.mjs`: one socket, no hello, 4.5 s of pings, reading nothing: RSS 60 MB → 1,353 MB. `server/relay.mjs`: 1 host and 3 guests that stop reading, host sends 200 KB snapshots: 60 MB → 1,316 MB in 6 s.
- **Fix:** in `_frame`, drop unreliable frames (SNAP, INPUT, EVENTS_U, pong) when `writableLength` is over ~1 MB and `terminate()` over ~4 MB; count pings in the control rate bucket and refuse them before hello.

### 2. High: per-IP limits are probably one global bucket on Render
- **Where:** `server/server.mjs:63-71` (`clientIp`).
- **Why it matters:** `X-Forwarded-For` is trusted only when the direct peer is loopback. On Render the direct peer is Render's proxy, so every player likely shares one "IP". Then the whole site gets 16 WebSocket connections, 30 cloud saves and 60 loads per 10 minutes, and 30 daily posts per 10 minutes, and one script can lock everyone out. This may also explain any "server full" or 429 a real player has seen.
- **Check:** log `req.socket.remoteAddress` once on Render, or run with `--log` and look for `ip_cap` lines.
- **Fix:** a `--trust-proxy` option (on when `RENDER` is set) that takes the rightmost `X-Forwarded-For` hop.

### 3. High: cloud uploads are read in full before they are rate-limited
- **Where:** `server/cloud.mjs:239` reads up to 3 MB + 4 KB and parses it; `allow()` only runs inside `save` at `:159`.
- **Proof:** `server/cloudflood.mjs`: 80 concurrent 3 MB POSTs from one IP; 50 got 429 only after being read; peak RSS 527 MB. Storage: 30 × 3 MB per IP per 10 minutes, kept 365 days, fills Upstash's free 256 MB quickly. Real bundles are about 24k characters per slot (save review `t6-sizes.mjs`).
- **Fix:** check `allow()` and `content-length` before reading; cap concurrent uploads (~4); lower `MAX_BUNDLE_BYTES` to what real bundles need; count bytes per IP per day.

### 4. High: the Daily board is open to forged scores, and the debug console helps
- **Where:** `server/daily.mjs:113-137`; `src/main.js:1146` (`window.__echoes` always installed).
- **Why it matters:** the server checks only values the client knows (`dailySeed` is public code) and accepts any version from 0.5.0 up. `window.__echoes.cmd` reaches about 188 handlers in the player build, including `killBoss`, `setHp`, `wallet`, `skipToRoom` and `startCampaign`, so even a "plausible" run is one console line away. With the memory backend, 5,000 fake ids fill the day and real players get 503 `full`; with Redis there is no cap, and every board GET runs `HGETALL` on the whole day.
- **Proof:** curl posted `{depth:40, won:true, ticks:9600, seed:<today's seed>, version:"0.5.0"}` twice with fresh ids; both landed at ranks 1 and 2.
- **Fix:** install `__echoes` only under `import.meta.env.DEV` (keep a read-only subset for players) and mark any run that used `cmd` as practice; on the server, accept only the current and previous version, limit new ids per IP per day, keep a top-N sorted set per day. Full protection needs input-log replay, which is a bigger project.

### 5. High: a cloud load that fails part-way deletes local saves
- **Where:** `src/save/cloud.js:73-96` (`applyBundle`), `src/save/index.js:853-860` (`applyCloud`), `src/ui/menu/cloud.js:119`.
- **Why it matters:** the loop walks every slot and either writes the bundle's copy or deletes the local slot and its backup. A failure part-way (quota) returns `{ok:false}` with no rollback, and the UI says "Nothing was changed". `applyCloud` also turns autosave off first and never turns it back on, so the rest of the session silently stops saving.
- **Proof:** `saves/t5-cloud-partial.mjs`: device had manual-1/2/3, bundle held only auto-1, the write was made to hit quota: result `{ok:false, error:'quota'}`, and all three manual saves were gone.
- **Fix:** stage every bundle file under `<key>.incoming`, swap in only when all are written, delete the staged files on failure; re-enable autosave on failure; correct the message.

### 6. High: a profile from a newer version gets wiped
- **Where:** `src/save/profile.js:172` (`sane`: `p.v !== 1` → null), `:324-337`, `:727` (`flush`).
- **Why it matters:** there is no "newer" state, only "corrupt". With no readable backup the store starts from `freshProfile()`, and the next flush writes it over the newer profile. The original text survives only in `echoes.profile.v1.corrupt`, which nothing reads and the next corruption overwrites. Today `v` is still 1, so this bites the day the profile version is bumped and a player has an old tab open or a deploy is rolled back.
- **Proof:** `saves/t1-newer-profile.mjs`: `{v:2, runs:120, embers:5000, acts:1..6}` → after one flush: `v 1, runs 0, embers 0, acts [1]`.
- **Fix:** treat `v > 1` as `'newer'` and make the store read-only until reload; offer to restore `.corrupt` from the Records screen. Do this before any slice bumps the profile version.

### 7. Medium-high: an older build prunes newer content out of the profile
- **Where:** `src/data/unlocks.js:454-487` (`saneMeta`), run on every `sync()` and `persist()` (`profile.js:191,235`).
- **Why it matters:** `saneMeta` whitelists against the running build's tables. Unknown unlocks are dropped and refunded, unknown deeds, feats, seen relics and marks are dropped, and loadout pointers to them are cleared. A tab left open across a deploy adopts the new profile through the storage event, then writes the pruned copy back when hidden (playtime always gives it something to write). New unlocks vanish, new deeds are paid twice when re-earned, lifetime marks are lost for good. Every deploy of new content is exposed to this.
- **Proof:** `saves/t9-forward.mjs`: a profile with future ids and a new key, one `noteStory` write: embers 100 → 310, `owned []`, `deeds ['first_light']`, `marks.champion []`, `loadout.heirloom null`, new key gone.
- **Fix:** keep unknown ids and keys verbatim in the stored copy and filter only the in-memory view (never refund on load); or stamp the build number and refuse to write over a newer one.

### 8. High: Daily wins credit the wrong bosses
- **Where:** `src/sim/run.js:2300` stores `rec.boss` only `if (thirdOpen.length || c.rush)`; `src/data/unlocks.js:565-567` (`runFacts`) falls back to `bossFor(level, s.seed)`. The Daily reseeds each level (`run.js:2574`), but `summary.seed` is only the last level's seed, so every earlier level is re-rolled with the wrong seed.
- **Why it matters:** the wrong list feeds `meta.bosses` (and so which third bosses open), the `boss_*` deeds, Kingslayer, the Duskwing/Bellwright/Tidecaller unlock feats and the boss tints.
- **Proof:** `sim/daily-boss.mjs`: 337 of 365 days credit at least one boss not fought (e.g. fought `thornmother, heron, lichram, colossus, skyhorn`, credited `stag, heron, lichram, cantor, skyhorn`). `sim/daily-e2e.mjs` confirms it end to end with the real sim.
- **Fix:** always set `rec.boss = currentBoss().kind` (drop the gate); `runFacts` already prefers it. Check the goldens stay identical.

### 9. Medium-high: harness URL flags unlock content for anyone
- **Where:** `src/app/params.js:52-54` and others; `src/main.js:623,635,647`; `src/scenes/camp.js:680,691`; `src/ui/run/levels.js:221,290`.
- **Why it matters:** `?rill=1`, `?tolly=1`, `?sable=1` open locked heroes; `?endless=1` and `?rush=1` open modes; `?level=N` starts at any level; `?partygrant=max` gives a maxed build; `?fresh=1` wipes all `echoes.*` storage at boot. There is one `import.meta.env` check in all of `src`. The only `campaign.harness` check found (`src/save/index.js:452`) skips the lock test; nothing stops a harness run from writing profile records, so a `?level=4` clear probably frees Sable for good (not confirmed at runtime). `?fresh=1` in a shared link would erase a player's saves.
- **Fix:** honour harness params only under `import.meta.env.DEV` or a `?harness=` token, and never write profile records from a harness run.

### 10. Medium: the last room's bodies follow the party into shops and vaults
- **Where:** `src/sim/run.js:806` (`exitRoom`), `:874`. Enemy-block entities are cleared only by `waves.planRoom` → `enemies.reset()`, which runs for combat rooms only.
- **Proof:** `sim/harness.mjs 4 campaign 1`: the escort pilgrim from L1 room 5 is still alive in room 6, the shop (room 7) and the boss entry; hunt-room retreaters (`state=retreating`, hostile, hp > 0) stand in the next room; seed 6 put 10 of them in a shop. Seen in all 6 multi-level seeds run. Player and ally zones and bolts also cross non-combat rooms (`sweepPlayerTransients`, `run.js:1099`, only runs on `room_cleared`).
- **Fix:** in `exitRoom`, despawn the pilgrim, Waystone, nests and retreaters, and call `sweepPlayerTransients` plus the ally room boundary. Likely changes no golden (goldens stop at room 3), but re-record to be sure.

### 11. Medium: Continue loses the run's deed progress
- **Where:** `src/save/index.js:1079-1154,1198-1204`. `deedRun`, `crashBest` and `crashCasts` live only in closures; `appState.save()` (`:184`) stores playtime and kill bases only.
- **Why it matters:** after closing the tab and pressing Continue, deeds earned earlier in the run are not paid (Keyholder, Crownbreaker, the objective deeds, Four Trials, High Water, Full Peal, Lights Out, the Wayfarer/Signbreaker/crown marks). Long campaigns are exactly when players reload. Loading a different save in the same page also keeps the previous run's facts.
- **Proof:** `saves/t8-deedrun.mjs`: same page → `deeds ['run_to_ground','keyholder']`; captured, applied on a fresh page → `deeds []`.
- **Fix:** add the deed facts, `crashBest` and the `wore` map to `tree.app`, restore them on load, reset them on every apply. Changes the state hash, so re-record goldens.

### 12. Medium: the probe suite no longer protects the next slice
- **Where:** `tools/` (975 files), `.gitignore` (`captures/`).
- **Evidence:** 77 imports in 78 probes point at critic libraries not in the repo (`gntcmenu3-lib.mjs`, `gntcmenu6-lib`, `gntccontent5-lib`, ...). The golden traces live only in gitignored `captures/` (0 tracked files), so a fresh clone cannot check them: `gntM2-goldens` fails with ENOENT. Of 197 browser-free probes run: 133 pass, 55 exit 1-2 (9 on stale assertions, e.g. `small-fixes-9-probe` expects v0.5.304, `gntM4a-simprobe` expects 8 skill slots, `gntCAMPAIGN-edge` has 10 FAILs), 9 time out. 4,167 fixed sleeps, port 5199 hard-coded 403 times, 181 probes pass the Windows-only `--use-angle=d3d11`. `tools/i18n-extract.mjs --check` rewrites `catalog.json` even in check mode.
- **Why it matters:** each slice re-records goldens in its own container and proves only its own probe, so regressions in older systems go unseen. The bugs above (8, 10, 11) are exactly the kind a small always-run suite would catch.
- **Fix:** commit the nine golden traces; delete probes whose libraries are gone; put a curated set of ~20 browser-free probes (the cross-check, round-trip and harness scripts from this review are good candidates) behind `npm test`; add a GitHub Actions job running `npm test` and `vite build`; make version checks read `src/version.js`.

### 13. High (performance): the main chunk is 3.6 MB and loads up front
- **Where:** `vite.config.js:144-153`, `src/main.js:33-38`.
- **Evidence:** `index-*.js` 3,615 kB (1,104 kB gzip). By folder: render 1,025 kB (`vfx/signature.js` alone 289 kB), sim 662, ui 560, audio 251, env 201, net 189, data 133; `three` is 607 kB (14%, not the 75% the config comment says). Languages (one lazy chunk each), the VFX lab and levels are already split.
- **Fix, in order of payoff:** load `net/` + `ui/net` on opening Multiplayer; drop the static imports of rendertest, simtest, graybox and chartest (`main.js:33-36`); load combat-only render code (`render/enemies`, `render/boss`, boss/champion cues, signature FX) during the camp→run transition; add a `modulepreload` for the player's language so it downloads alongside the main chunk. Replace the deprecated `advancedChunks` with `build.rolldownOptions.output.codeSplitting = { groups: [{ name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/ }] }` (tested: same `three` chunk, no warning).

## Long tail

### Server
- **Medium:** one IP can hold all 64 rooms by creating and dropping them (an abandoned lobby is held 10 s). `server/lobby.mjs:153`. Proved (`server/rooms.mjs`). Fix: 2 rooms per IP, close an empty lobby after ~2 s.
- **Medium:** dropped identities are kept 10 minutes; 20,000 hello/close cycles added 67 MB in 64 s. Peer ids are 32-bit, so collisions overwrite entries. `server.mjs:480-485,545-550`. Proved (`server/churn.mjs`). Fix: expire never-joined identities after ~30 s, rate-limit new connections, 64-bit ids.
- **Low:** a code whose save has expired can be claimed by any token, then serve a different bundle to anyone holding the code. `cloud.mjs:169`.
- **Low:** `/health` is public with `CORS *` and lists LAN URLs, peer and room counts.
- **Low (bug):** Quick Match status updates never send: `lobby.mjs:603` checks `host.conn`, peers have `rec`. Proved (`server/qm.mjs`). No client reads `offerStart` yet.
- **Low:** `rttPushed` never forgets closed rooms; the cloud and daily `hits` maps `clear()` at 20,000 keys (resets everyone's limits); Upstash fetches have no timeout; board names keep bidi and zero-width characters (escaped, so not XSS); `ws.mjs` concatenates buffers per chunk (quadratic up to 1 MB); no CSP or frame-ancestors header.
- **Fine:** static file traversal (all tricks 404/400), every JSON.parse guarded, control messages validated, 128-bit session tokens, admin off by default and loopback-only, timing-safe cloud token check, Origin checks, WebSocket framing rules.

### Co-op
- **Medium-high:** the host's per-seat input buffer has no cap or seq window (`src/net/driver.js:144-158,194-203`). A guest sending far-future seqs bloats host memory and freezes its own seat in gap-fill. Proved (`net/flood.mjs`: 300,001 buffered entries; one seq 1,000,000 kept the feed in gap-fill). Fix: drop seq > last + ~120, cap the buffer at ~128, reject non-integer seqs, rate-cap per seat.
- **Medium:** a guest's event-batch counter freezes for good after any lost reliable batch (socket blip inside the 60 s seat hold, or a dead direct link's 4 s fallback). `src/net/session.js:1473-1481`, reset only on `host_changed` (`:1615`). Mispredictions are then fixed only by the state path, and `g.batches.toTick` grows ~20 entries a second. Inferred. Fix: reset `contig` on reconnect and p2p fallback.
- **Medium:** during the host's own socket outage the host keeps simulating while guests stand still (up to 10 s grace), and `mesh.reset` tears down healthy direct links on reconnect. `driver.js:255-275`, `lobbyClient.js:345-358`, `transport.js:461`. Inferred. Fix: pause the host sim or hand guest seats to the AI while the transport is not open; keep direct links up.
- **Low-medium:** host migration without a usable keyframe hosts from the quantized replica, where bolts lack `boltOwner`/`power` (`session.js:1693-1719`); `resumeHost` refuses in the same case. Fix: refuse, or despawn transient bolts and zones.
- **Low:** guest input frames pile up while the socket is down (`session.js:1191`); the guest mutation guard is a deny-list (`RUN_MUTATORS`, `session.js:81`) so new run APIs default to unguarded (`openSecret`, `useTonics` are callable on a replica today); a socket CMD without `col` defaults to slot 0 (`:573`).
- **Fine (verified):** capture→apply→600 ticks matched hash and events for all 17 bosses, Boss Rush, the Kiln road and Levels 4-6 (`net/trip.mjs`); `gntM2-nodetrip` 9/9; decoder bounds, depth and `__proto__` handling; seat stamping by server or mesh; party CMD validation; timer and listener cleanup.

### Saves
- **Medium:** saving over a damaged slot overwrites its good backup with the damaged file; the autosave ranks a damaged slot first. `src/save/storage.js:136-138`, `index.js:536,581,1015`. Proved (`saves/t7-size-bak.mjs`). Fix: `backupIf` that keeps a readable `.bak`.
- **Low-medium:** failed autosaves and profile writes are silent (`written:false` read nowhere in `src/ui` or `src/app`). Fix: one toast per session.
- **Low:** cloud load shows nothing about local progress and writes no backup first (`src/ui/menu/cloud.js:151-175`); a records reset whose write fails is silently undone (`profile.js:763-786`).
- **Fine:** tmp/bak/main write protocol; slot files from newer schemas refused unchanged; migrations 1→4; `reconcileContent` survives retired enemies, hazards, bosses, relics, curses and affixes (`saves/t2..t4`); determinism after restore (`saves/t10-det.mjs`); multi-tab profile writes replay only their own changes.

### Sim
- **Medium:** a Grave Shrine curse overwrites a major-curse door's record, so the promised rare/legendary pick becomes an ordinary one and two curses land in one room. `run.js:857`, `relics.js:1329,1342` (`curseFor` returns null for majors). Proved (`sim/shrine-major.mjs`). Fix: guard on any curse held for room n.
- **Low:** Famine's heal cut applies outside the cursed room (`relics.js:427` lacks `cursedHere()`), so reward-phase heals in the previous room are cut 60%. Inferred.
- **Low:** `FINAL` in `src/data/endless.js:31` is the Kiln (6), not the campaign's last level (5); the `levelClears` fallback opens Endless on a Kiln clear but not a Spire clear (only affects old saves).
- **Perf:** enemy soft separation is a pairwise loop over every entity, shots and props included (`src/sim/enemies.js:611-630`), and `registry.all()` (`src/core/registry.js:26`) copies the whole map at 195 sim sites and 68 render/ui sites, several per enemy per tick. 20 hostiles 0.64 ms/tick, 80 → 3.2, 160 → 5.9 (`sim/scale.mjs`). Fine at today's cap of 20 concurrent; the first thing to break if rooms get bigger. `run.view()` rebuilds everything on each call and is called per frame. Fix: a non-copying iterator, one filtered enemy list per tick, squared distances, j > i pairs.
- **Fine (verified):** `sim/xcheck.mjs` cross-checks every roster, boss, layout, hazard, skill, node, unlock, vow, journal and champion id: no errors. 8 rooms × 5 levels on both roads; Rush tables match 10 fights; no lap repeats a boss over 200 seeds; zero NaN in ~250k headless ticks.

### Rendering, audio, UI
- **Medium:** about 17 new materials a second in steady combat (material id +186 in 11 s; geometries +2). Likely `rigShell().track()` giving each enemy its own materials for the hit flash, and `makeGlowSprite` (170 call sites) making a fresh `SpriteMaterial` each call. Fix: share per rig type, drive the flash with a uniform, pool glow sprites as `vfx/kit.js` already does.
- **Low:** `#proto-hud` className written 8 times a frame (`src/ui/hud/commandbar.js:408`) and `#run-veil` once a frame (`src/ui/run/index.js:310`); write only on change.
- **Fine (measured):** across 5 camp→run→camp cycles, geometries, textures, programs, GL buffers, the heap, bus/window listeners, intervals and live AudioNodes all level off.

### i18n
- **Medium:** catalog and tables have drifted: `CLASS_CRITTER` (`src/net/seats.js:16`) is missing from the extractor's `NAME_TABLES` (`tools/i18n-extract.mjs:85`), so Otter, Beetle and Bat stay translated only because 27 "unused" entries were never pruned. 24 of those are genuinely stale text. Fix: add the table, prune the 24, make `--check` fail on unused keys and stop it writing.
- **Low:** canvas heal glyph draws a literal `'+HP'` (`src/render/skillfx/index.js:106-108`) while the HUD says LP/ОЗ/生命; hyphenation table keyed on translated class names (`src/ui/run/classpick.js:66-77`); `src/ui/run/unlocks.js:79-86` regex-parses English data sentences; English slip "node go" in `src/ui/run/draft.js:578`.
- **Low:** the browser i18n probe only sees ~20% of keys (682 of 3,424) and only reports, not fails, on lines missing from the catalog.
- **Fine:** 0 missing keys, 0 placeholder or plural errors in all nine tables; the ~10-88 lines per language identical to English are cognates, names and codes; tables are lazy and not in the main chunk.

### Structure and dead code
- `createSignatureFx` (`src/render/vfx/signature.js`) is one 7,460-line closure with 216 bus handlers and a 1,000-line `updateBody`; `src/sim/run.js` 4,186 lines; `src/env/props.js` 3,745. New hero kits and bosses keep growing these.
- `rigShell`, `iface` and `ease` are byte-identical in five boss render files (`src/render/boss/{heart,kiln,spire,third,slice2}.js`); 18 files define their own `glow()`, 12 their own `clamp`. Overall duplication is modest (2.9% at 10-line windows).
- 58 exports are referenced nowhere, including all of `src/ui/run/expedition.js` (205 lines, never imported), `buildGroundMesh`, `meshSupported`, `isRushFight`, `layoutFor`, `ELITE_MUL` (duplicates `enemies.js` `ELITE`). Full list: [code-review-proofs/perf/truly_dead.txt](code-review-proofs/perf/truly_dead.txt).
- Probe-only code ships to players: `campaign.census()` and `glTrack()` (`src/campaign/manager.js:415,444`), the latter monkey-patching three's EventDispatcher.
- `CONTENT_PLAN.md` header and `PROGRESS.md` are stale (known).

## Recommended order

1. **Server hardening (one PR):** findings 1, 2, 3, plus room and identity caps. Touches only `server/`, no goldens. Biggest risk to the live site.
2. **Save safety (one PR):** findings 5, 6, 7, plus the slot backup fix. Must land before any slice bumps the profile version or ships new unlock ids.
3. **Gameplay bugs (one PR):** findings 8, 10, 11, plus the shrine/major curse and Famine fixes. Re-record goldens.
4. **Player build gating (one PR):** findings 4 (client half) and 9. Needs a decision on what stays reachable (see below).
5. **Safety net (one PR):** finding 12: commit goldens, prune dead probes, `npm test` plus a CI job. Pays off on every later slice.
6. **Bundle split and render allocations:** finding 13 and the material churn; worth doing before more bosses and kits are added.
7. Co-op robustness (input buffer cap first), i18n tooling, dead code, then splitting `signature.js` and `run.js` when a slice next touches them.

## Not covered
- Behaviour on Render itself (proxy headers, real remote address), the live site, Upstash plan limits.
- Real-GPU frame times (swiftshader ran at 2.7-5.4 fps); per-room paint cost in `env/props.js` and `ground.js`; `audio/music.js` and `bake.js` line by line.
- Individual boss and enemy kits, ally AI internals, node and technique maths, consumables, `predict.js`/`reconcile.js` maths, `delta.js`/`treediff.js` against a hostile host.
- A live two-client reconnect (co-op findings 2 and 3 are inferred); the ~433 probes that need a browser or server; whether a harness-run clear really writes unlocks.
