STATUS: COMPLETE
VERDICT: FAIL - 1 must-fix (NET5-F1: the multiplayer party page draws the per-character owner labels "you" / "player" / "AI" over the character names at every supported size, 29-82 % overlap, on host and guest; single-player is clean) + 11 advisories. The round-4 must-fix items NET4-F1 / F2 / F3 are verified FIXED. Re-measured and met: 0 desyncs over 3 guests x 180 s x N1-N4, delta 4-8 % of full, predErr p95 <= 0.09 u with SP key parity, 108/108 guest dashes host = guest, hit-reg 97.0 / 94.8 % vs 77 / 69 % without rewind, L3 max-stress 11.7 / 19.7 KB/s, guest reconnect 1.7-2.6 s, migration at grace + 0.4-0.9 s, PARTY ownership + 30 s deadlines + build replication 20/20 with 4 clients, campaign MP 8/8, zero-config 12/12, SP bit-identical. Benchmark 18 met / 4 partial / 0 not met of 22.
# Critic NET r5 (gauntlet round 5) - checkpoint

Started 2026-09-28. Steps are appended below as completed.

## Step 1 - BLIND BENCHMARK CHECKLIST (written before any Echoes capture/log was inspected)

From my own knowledge of the shipped systems. Each item is concrete and testable; scored in Step N.

### Source engine / Valve multiplayer networking model
- B1 Server-authoritative sim at a fixed tick (cl_tickrate 66/64); clients send usercmds every tick, with redundancy (cl_cmdbackup: previous 2 cmds resent) so a lost packet does not lose input.
- B2 Snapshots at cl_updaterate (20 default); entities interpolated at cl_interp = 100 ms (2 x snapshot interval) so one lost snapshot is invisible; extrapolation capped (cl_extrapolate_amount 0.25 s) then freeze.
- B3 Client-side prediction of own movement: pressing a key moves you the same frame; on server correction the client re-simulates from the acked cmd and smooths the error (cl_smoothtime 0.1 s); large errors snap.
- B4 Lag compensation: server rewinds hitboxes to (now - latency - lerp) to validate a hit the shooter saw; capped (sv_maxunlag 1 s); "what you saw is what you hit" for hitscan/instant shapes.
- B5 net_graph style diagnostics: rate in/out, loss, choke, latency visible to player.
- B6 Timeout / reconnect: a client silent for N seconds times out with a clear message; retry reconnect; server shutdown shows a disconnect reason, not a hang.

### Quake 3 delta compression
- B7 Every snapshot is delta-encoded against the newest snapshot the client ACKED (not the last one sent); if no valid baseline, send a full (uncompressed-vs-null) snapshot.
- B8 Unchanged entities cost ~0 bytes; per-field change bitmask; quantised floats. Typical delta ~10-30% of full.
- B9 Survives arbitrary UDP loss without resync: loss simply means the next delta uses an older acked baseline; no desync, no stalls.

### Overwatch netcode (GDC 2017, Tim Ford / Phil Orwig)
- B10 Own-action prediction: abilities/weapon fire animate + sound instantly on the client; server mis-prediction rolls back and replays; mis-prediction retraction is prompt.
- B11 Input buffering on the server with the client adjusting its send rate (time dilation) to keep the buffer small but non-empty under loss; input redundancy.
- B12 Favour-the-shooter hit registration with a rewind cap (~250 ms); beyond cap, hits start to fail.
- B13 Packet loss causes degraded but playable, never broken, play; no teleporting remote players at moderate loss.

### Co-op roguelike lobbies (Risk of Rain 2, Gunfire Reborn)
- B14 Host/Join/Quick play: create a lobby, share a code (or friend invite), public quick match finds an open lobby in seconds.
- B15 Seat/character select with ready states; host starts when all ready; last-slot race gives exactly one winner.
- B16 Drop-in: a player can join a run in progress (RoR2 allows join mid-run via lobby; Gunfire Reborn allows join in progress) taking a free slot.
- B17 Guest disconnect: the run continues for others; the dropped player's character is removed or AI-held; reconnect restores the player into the run.
- B18 Host disconnect: in RoR2/GR the session ends for all (no migration) with a clear message; better systems migrate. Either way: clear message, no hang, no crash, single-player intact.
- B19 Host pausing does not freeze online sessions for everyone (RoR2: pause menu in MP does not stop time).
- B20 Shared progression moments (level transitions, boss kills, reward selection) are synchronised: every client transitions together; each player picks their own reward; nobody waits forever on a silent picker (timeouts).
- B21 Bandwidth modest: a co-op game of 4 uses tens of KB/s at most per client.
- B22 Version mismatch: a client on another build is rejected with an explicit message.

## Step 2 - environment (done)
- Build under test: working tree v0.5.165 (HEAD 85f5f19, src/ and server/ clean), `npx vite build --outDir dist-cnet5` -> version.json {version 0.5.165, entry index-AlMY3IPy.js}.
- My processes: session server `node server/index.mjs --port 7841 --admin` (PID 72672, protocol 4, ready line + /health ok); `ECHOES_NET_PORT=7841 npx vite preview --outDir dist-cnet5 --port 4328` (PID 69140). Shared dev server 5199 answers but took 47.6 s for index.html (other agents loading it), so my probes use my own preview 4328.
- Tools: copies of the round-4 critic harness renamed gntcnet5-* (own prefix, outputs captures/gntcnet5-*), each re-read before use.

## Step 3 - raw lobby / matchmaking / race probe (done) - captures/gntcnet5-lobby.json
`node tools/gntcnet5-lobby.mjs --port 7842 --trials 50 --build 0.5.165` (own child server; hello updated to protocol v4 - a v2 hello now gets an explicit `error version_mismatch serverProtocol 4` and close 4001). **21/21**:
connect+hello x20 open p50 3.8 ms / max 26 ms, hello p50 0.8 ms; create private -> code 2RXPP (5 chars, alphabet) 1.6 ms; join by code -> seat 1 in 2.7 ms, host gets peer_joined; lower-case code accepted; taken seat -> `error seat_taken`, free seat 3 granted; guest start -> `not_host`; unready start -> `not_ready`; start -> game_starting countdown 1500 -> in_game at 1576 ms; drop-in to in_game takes AI seat 2; 5th join -> `full`; unknown/malformed code -> `not_found`; build mismatch -> `join_rejected version_mismatch`; protocol 999 -> close 4001; **last-seat race exactly one winner + one `full` in 50/50**; quick match joins the open public room in 0.7 ms; 8 simultaneous quick matches -> 3 rooms, 0 doubled seats; lone quick match -> match_status(queued, open 0); garbage/3 MB frame (1009)/2000-ping flood -> server + other room unaffected; server kill -> sockets close 1006 in 10 ms.

## Step 4 - RTT sweep, 3 guests, Level 1 combat, real keys (done) - captures/gntcnet5-rtt.json / .log, -rtt-*-guest.png
`node tools/gntcnet5-sweep.mjs --guests 3 --conds N0,C50,C150,C250 --seconds 30 --settle 6 --tag rtt --raw 1` (host page + 3 guest browsers on preview 4328 + server 7841; conditioner per guest link both directions; CDP wire tap on every page; host authoritative seat path vs guest rendered path per rAF). Machine loaded by other agents: guests 27-32 fps, host 21.5-23.6 fps (sim still 58.4-59.9 ticks/s).

| cond (per dir) | snaps/s | delta B avg / full B -> ratio | guest down B/s avg / p95 (1 s) | up B/s | own path dev p95 / max (u) | predErr p95 / max | snaps (>1 u) | corr frames >0.1 u /30 s | remote jumps >0.3 | key->move frames (hist) | host exec lag p50 | desync / checks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N0 off | 19.4 | 236-248 / 3320 -> 0.07 | 5937-6197 / 11652-14528 | 1412-1433 | 0.20-0.48 / 0.59-1.05 | 0.036-0.046 / 0.071-0.089 | 0 | 2-19 | 0 | {1:4, 2:14} | 136-152 ms | 0/284 |
| C50 25+-5 | 18.9 | 272-278 / 3926 -> 0.07 | 6407-6503 / 13368-15772 | 1466-1481 | 0.11-0.21 / 0.44-0.75 | 0.036-0.088 / 0.25-0.32 | 0 | 2-5 | 0 | {1:4, 2:19} | 120-160 ms | 0/531 |
| C150 75+-15 | 19.8 | 262-271 / 3358 -> 0.08 | 6605-6701 / 14193-18219 | 1466-1483 | 0.05-0.13 / 0.18-0.72 | 0.036-0.079 / 0.14-0.25 | 2-4 per guest | 3-9 | 0 | {1:3, 2:21} | 152-160 ms | 0/798 |
| C250 125+-25 | 19.8 | 246 / 3322-3363 -> 0.07 | 5665-5703 / 8247-8672 | 1459-1476 | 0.11-0.16 / 0.33-0.46 | 0.071-0.088 / 0.28-0.54 | 0-2 | 2-8 | 0 | {1:5, 2:19} | 192-208 ms | 0/1088 |

- Delta compression: every window ~0.07-0.08 of a full snapshot (Quake-3 style acked baseline; full snapshots only on the explicit end-of-window requestFull). 0 desyncs over 2701 hash checks; 0 page errors on 4 pages.
- Server-measured link RTT: N0 50-120 ms on loopback (page main threads at ~28 fps answer late), C150 219-307, C250 524-561 (reliable in-order channel: jitter becomes head-of-line delay). Guest-side `net.stats().rttMs` reads 754-1425 ms at C250 and the in-game quality says "poor ... jitter" even at N0 (jitter 108-168 ms measured on an unconditioned loopback link) -> advisory (diagnostic inflated by page load).
- Host net cost on this loaded machine: hostNetMsP95 16-22 ms, frameOver50Net 47-73 per window (G5b.9 bar 2 ms / 0) - re-measured in the G5b.9 leg with 1 host page + Node guests (Step later) before any verdict.
- Key -> first moved rendered frame: p95 = 2 frames (latMs p50 37-60) on the guest; compared against SP on the same machine in the key-latency leg.
- C150/C250 snaps: 2-4 correction snaps per guest per 30 s at C150 (exMax 2.4-3.7 u single-frame own steps) -> attributed in a later step.

## Step 5 - packet loss / dup / reorder sweep, 3 guests (done) - captures/gntcnet5-loss.json / .log, -loss-*-guest.png
`node tools/gntcnet5-sweep.mjs --guests 3 --conds L5,L10,L20,DR --seconds 30 --settle 6 --tag loss` (same rig as Step 4; conditioner lat 50 jit 10 + loss / dup / reorder per guest link, both directions). Per guest (3 seats, ranges); 0 page errors on 4 pages.

| cond | wire loss % (guest-seen) / server down/up % | snaps/s | delta avg B / full B -> ratio | down B/s avg / p95 | up B/s | own path dev p95 / max u | predErr p95 / max u | snaps | key->move frames | exec lag p50 / max ms | dup/reo seen | events replayed-once / dup | act pred/conf/retr | desync / checks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L5 | 3.8-5.5 / 2.4-3.1 , 4.5-5.6 | 18.0-18.4 | 236-242 / 3174 -> 0.07-0.08 | 5029-5355 / 7264-9101 | 1432-1444 | 0.10-0.16 / 0.44-1.23 | 0.036-0.044 / 0.21-0.44 | 0-1 | p95 2 | 128 / 208 | 0 / 68-74 | true / 0 | 11/11/0, 9/9/0, 10/9/0 | 0 / 80-92 |
| L10 | 10.0-11.0 / 6.4-6.9 , 9.2-10.4 | 15.9-16.2 | 218-226 / 3616-3700 -> 0.06 | 4474-4680 / 11604-12796 | 1354-1447 | 0.28-0.63 / 0.67-2.34 | 0.044-0.070 / 0.28-1.07 | 0-3 | p95 2 | 312 / 2992 | 0 / 126-134 | true / 0 | 26/26/0, 17/16/1, 16/13/0 | 0 / 160-169 |
| L20 | 18.7-20.1 / 12.9-13.9 , 19.1-20.1 | 15.7-16.0 | 223-229 / 3472 -> 0.06-0.07 | 4429-4464 / 6844-7989 | 1479-1496 | 0.02-0.03 / 0.09-0.17 | 0.035-0.044 / 0.12-0.22 | 0 | p95 2 | 136 / 272 | 0 / 16-22 | true / 0 | 41/41/0, 25/24/1, 22/19/0 | 0 / 222-232 |
| DR dup5 reo10 | 0 (dups 21-32 seen, server dup 56-77 / reo 123-135) | 20.7-21.0 | 139-141 / 3424-3496 -> 0.04 | 3578-3627 / 4946-5114 | 1490-1507 | 0.01-0.02 / 0.04-0.33 | 0.003-0.032 / 0.05-0.11 | 0 | p95 2 | 128 / 144 | 32/29 | true / 0 | 52/52/0, 34/33/1, 33/30/0 | 0 / 303-314 |

- 0 decode errors, 0 duplicated event presentations, replayedOnce true, busCounters simCalls 0 / refusedEmits 0 on every guest in every window.
- The L10 window contains a MACHINE-WIDE freeze: every guest has one frame of 2340 / 3694 / 3427 ms at the same moment (bigFrames), the host 885 ms; the L10 own-path max 1.96-2.34 u, rest err 1.54-5.93 u (11-15 samples), exec-lag max 2992 ms and seat 3's 3 snaps all follow it. L5 / L20 / DR (no freeze) show 0-1 snaps and path dev p95 <= 0.16 u. Environment, not attributed to the game; re-checked in the 3-minute soaks (Step 6).
- Degrade behaviour: at 20 % loss the stream keeps 15.7-16.0 snaps/s, baseline age p50 5 / max 28 ticks, delta ratio 0.06-0.07, own path dev p95 0.02-0.03 u -> loss is absorbed as Quake 3 does (older acked baseline, no resync).
- Diagnostics: net.stats rttMs reads 641-746 ms at L5 on a 100 ms link (server-measured 302-618) -> the inflated-RTT advisory from Step 4 again.
- Resume (instance 2, 19:47): previous processes gone (workflow restart). Restarted: session server `node server/index.mjs --port 7841 --admin --static dist-cnet5` PID 80220; preview `ECHOES_NET_PORT=7841 npx vite preview --outDir dist-cnet5 --port 4328 --strictPort` PIDs 92064 (npx) / 91700 (vite). src/ + server/ unchanged since 85f5f19 (git diff empty).

## Step 6 - 3-minute soaks at PLAN N1/N2/N3/N4, host + 3 guests (done) - captures/gntcnet5-soak.json, -soak.stdout.txt, -soak-N*-raw*.json, -soak-N*-guest.png
`node tools/gntcnet5-sweep.mjs --guests 3 --conds N1,N2,N3,N4 --seconds 180 --settle 6 --tag soak --raw 1` (real keys on 3 guests, host autopilot L1 r1 -> r8; 4 browsers, machine CPU at 100 % from other agents: host 16.2-23.9 fps, guests 22-30 fps). 0 page errors on 4 pages.

| | N1 150+-20, 10 % | N2 250+-40, 20 % | N3 GE burst @150 | N4 dup1 reo2 @100 |
|---|---|---|---|---|
| host rooms | L1 r1 -> r4 | r4 -> r6 | r6 -> r8 (shop, Stag) | r8 (Stag) |
| hash checks / desyncs (3 guests, cumulative) | 342-346 / **0** | 662-671 / **0** | 1007-1013 / **0** | 1406-1421 / **0** |
| wire loss % / snaps/s | 9.8-11.0 / 17.2-17.4 | 19.0-20.6 / 15.7-16.0 | 13.1-13.7 / 17.1-17.2 | 0 (dups 34-46, reo 29-33) / 20.1-20.2 |
| delta avg B / full B / ratio | 250-256 / 3389 / 0.07-0.08 | 362-365 / 4661 / 0.08 | 318-320 / 3960 / 0.08 | 193-194 / 3676-3684 / 0.05 |
| down B/s avg / p95 (1 s) | 5364-5528 / 9238-9687 | 6726-6845 / 14437-15292 | 6968-7143 / 14198-14623 | 4899-4915 / 7853-8152 |
| up B/s | 1449-1461 | 1542-1551 | 1551-1553 | 1586-1593 |
| net.stats predErr p95 / max u | 0.035-0.044 / 0.37-0.64 | 0.086-0.089 / 0.35-0.67 | 0.049-0.081 / 0.25-0.62 | 0.035-0.043 / 0.14-0.18 |
| correctionSnaps per seat | 6 / 9 / 4 | 3 / 4 / 2 | 7 / 3 / 7 | 0 / 0 / 1 |
| remote jumps > 0.3 u (net.stats) / max | 0 / 0.21-0.29 | 0 / 0.20-0.21 | 0 / 0.20-0.28 | 0 / 0.20-0.26 |
| own path dev p95 u | 0.10-0.29 | 0.17-0.23 | **0.28-2.09** | 0.09-0.13 |
| key -> first moved frame | 1: 8-11, 2: 32-35, 3+: 1-2 | 1: 5-11, 2: 32-38 | 1: 10-13, 2: 23-29 | 1: 6-8, 2: 35-38 |
| host exec lag of guest input p50 / p95 / max ms | 152-160 / 304-688 / 928-3000 | 200-216 / 528-648 / 824-1072 | 200-216 / **800-2144** / 2584-3000 | 144 / 408-528 / 1152-1712 |
| own-action feedback ms p95 (max) | 40-51 (110) | 36-59 (98) | 45-49 (918) | 33-45 (72) |
| predicted / confirmed / retracted | 63/60/0, 62/58/0, 57/57/0 | 130/119/2, 125/120/0, 121/121/0 | 189/175/2, 180/174/1, 174/174/0 | 253/238/2, 243/237/1, 233/232/0 |
| events replayed / dup / replayedOnce | 2632-2700 / 0 / true | 5771-6119 / 0 / true | 9650-9753 / 0 / true | 11807-11910 / 0 / true |
| host ticks/s, fps, hostNet p95 ms, frameOver50Net | 57.9, 23.9, 9.5, 233 | 59.4, 21.9, 15.7, 647 | 59.5, 16.2, 15.0, 914 | 59.9, 23.2, 23.5, 298 |

- simCalls 0 / refusedEmits 0 on every guest; 0 decode errors; 0 duplicated events.
- Bandwidth in Level 1 is well inside the §3.7 budget (<= 7.1 KB/s avg, <= 15.3 KB/s p95 vs 12 / 24).
- Snap attribution (`node tools/gntcnet5-snaps.mjs captures/gntcnet5-soak-N*-raw*.json`): N4 0/0/3; N1 and N2 = room re-seats (transition), dodge rows, and "none" rows of 0.5-2.5 u excess; N1 contains a machine-wide freeze (all 3 guests 2613 / 3326 / 3214 ms frames at the same moment, host 4200 ms). **N3: from ~90 s (the Stag room) all three seats show 2-3 u out-of-dash steps with the own body 2-6.5 u away from the host's seat afterwards; the host executed guest inputs with p95 0.8-2.1 s and max >= 2.6 s of lag (r4 N3: p95 224-240 ms, max 288-504) while the host page ran at 16 fps (48 frames > 150 ms, max 348 ms) and the sim at 59.5 ticks/s.** Attribution run in Step 8 (1 guest, less load).

## Step 7 - PARTY ownership / deadlines / build replication with 4 clients at N1 (done) - captures/gntcnet5-party.json, -party.stdout.txt, -party-stall-fox.png, -party-stall-moss.png, -party-shopcountdown-wren.png
NEW `node tools/gntcnet5-party.mjs --port 7843 --cond lat75,jit10,loss10` (own child server; host + Fox/Wren/Moss guests = seats 1/2/3, each its own browser; every guest link at N1). **20/20**, 0 page errors, 0 desyncs over 248 / 257 / 252 hash checks.
- Page 1 opens with owners [human x4] and a deadline of 1800 ticks (30 s). Fox's own-UI calls on Wren's seat / the Healer (pick, buy, autofill) return false locally with 0 CMDs sent; RAW CMDs from Fox for seats 2 / 0 (pick, pick, autofill, reorder) -> host `not_owner` +4, Fox told 4, cards and all four builds byte-identical; the host's UI cannot pick / reorder Fox's seat (false).
- Simultaneous picks (4 presses within 32 ms): the page commits on the host 194 ms and on the guests 449 / 541 / 551 ms after the last press; afterwards all four builds are identical on all 4 clients.
- Stalled guest (Moss never answers): the page commits **30.00 s** after it opened with `party_autopick reason timeout`, Moss's card = its AI suggestion (take), the toast on all 4 clients, the event replayed on every guest; the others see "Your pick is in - waiting for the party - 7 s" and "Waiting for Archer - auto-pick in 7 s" (gntcnet5-party-stall-fox.png). Door deadline: nobody picks -> left door at **30.00 s**.
- Fox's own autofill on the door page is a CMD (`pending`), lands on the host (2 filled) and is equal on all clients. Shop: Fox's buy on Wren's shelf refused locally; its own buy lands (purse 72 -> 57, sold); the host's Advance with guests not Done -> countdown, guests show 845-875 ticks left, the shop leaves at **15.00 s**; builds + purses equal on all 4 clients.
- Level 1 -> Level 2 transition (skipToRoom 8 + Stag kill): all 4 clients in Level 2, every ally's skills + sockets carried and identical on every client.
- Observed on the frame (960x540, below the 1024x640 minimum): the character-tab owner labels ("player" / "you") are drawn ON TOP of the character names ("Healer", "Swordsman", "Archer") and the "Your pick is in" toast covers the Tank tab - re-checked at supported sizes in Step 9.

## Step 8 - Step-6 N3 attribution, ONE guest (done) - captures/gntcnet5-n3g1.json / .stdout.txt
`node tools/gntcnet5-sweep.mjs --guests 1 --conds N3,N1 --seconds 90 --settle 6 --tag n3g1 --raw 1` (2 browsers; host 26-28 fps). N3: exec lag p50 160 / p95 176 / **max 248 ms**, own path dev p95 0.04 / max 1.53 u, 0 snaps, predErr p95 0.035 / max 0.25, 0 desyncs / 163, down 5.1 KB/s avg / 7.9 p95. N1: lag max 192 ms, path dev p95 0.04 / max 0.31, 0 snaps, 0 desyncs / 347. -> the Step-6 N3 input lag (p95 0.8-2.1 s) and its 2-6 u own-body corrections follow host overload (host page 16 fps with 4 browsers on a CPU at 100 %), not burst loss itself; recorded as the r4 A1/A8 host-slowness advisory, re-checked at the Stag with 1 guest in Step 10.

## Step 9 - multiplayer party page: owner labels drawn over the character names (done) - captures/gntcnet5-partytabs.json, gntcnet5-partytabs-{Host,Fox}-{1024,1280,1600,1920}.png, -Fox-afterpick-1280.png; control gntcnet5-partytabs-sp.json / -sp-1920.png
NEW `node tools/gntcnet5-partytabs.mjs --port 7844` (host + 1 guest, own child server, the Level-1 room-1 party page; overlapping-text audit = visible elements with their own text, tight text boxes, pairs intersecting > 25 % of the smaller) at 1024x640, 1280x720, 1600x900, 1920x1080:
- EVERY size, both clients: `.rn-powner` owner label over `.rn-pname` character name - host: "Healer" x "you" 29 %, "Swordsman" x "AI" 82 %; guest: "Healer" x "player" 55 %, "Swordsman" x "AI" 82 % (host 1920 zoom also shows "Tank" x "player"). The frames read "Heal~er~you", "Tan~k~player", "Swordsma~n~AI".
- Control, single-player 1920x1080 (`node tools/gntcnet5-partytabs-sp.mjs`): the owner label is empty and hidden on all 12 tabs, 0 px overlap -> the defect exists only in multiplayer, on the per-character ownership tabs every co-op player sees on every reward page.

## Step 10 - N3 at the Stag, ONE guest (done) - captures/gntcnet5-n3boss.json / .stdout.txt
`node tools/gntcnet5-sweep.mjs --guests 1 --conds N3 --seconds 60 --settle 6 --room 8 --tag n3boss --raw 1` (L1 Stag + adds -> Stag killed -> L2 r2; host 35.8 fps): exec lag p50 152 / p95 168 / max 240 ms, 0 snaps, own path dev p95 0.01 / max 0.13 u, predErr p95 0.003 / max 0.105, 0 desyncs / 120, down 5.5 KB/s avg / 7.4 p95. -> Step-6 N3 degradation confirmed as host overload (advisory), not a burst-loss or Stag-room defect.

## Step 11 - Level 3 with the four MAX-STRESS builds: bandwidth (G5b.4 / GP.10, NET4-F3 re-check) (done) - captures/gntcnet5-max3.json / .stdout.txt / -max3-N*-raw*.json, gntcnet5-max3g1.json / .stdout.txt
Host boot `?partygrant=max` + `startCampaign({level:3})`; verified on the host: Level 3 room 1, every ally 32/32 sockets (Tank taunting_roar / whirling_guard / ground_crack / iron_stance; Swordsman flurry / blade_storm / caltrops / razor_wake; Archer volley / rain_of_arrows / piercing_shot / kestrel_watch).
- 3 guests (`--guests 3 --conds N1,N2,N3 --seconds 60 --level 3 --extraQ partygrant=max --tag max3 --raw 1`; host 12.9-18.8 fps): down avg / p95 KB/s **N1 8.5-8.7 / 14.9-16.1**, **N2 9.6-10.0 / 16.5-18.1**, **N3 8.3-8.5 / 13.8-16.4** (budget 12 / 24: MET); delta 0.06-0.08 of a 5.8-6.6 KB full; up 1.41-1.47 KB/s; 0 snaps on all 9 seat-windows; predErr p95 0.036-0.088 / max 0.29-0.90 u; desyncs 0 / 147-405; events replayedOnce, simCalls 0. Host out 28-37 KB/s for 3 guests.
- 1 guest, 120 s (`--guests 1 --conds N1 --seconds 120 --level 3 --extraQ partygrant=max --tag max3g1`; host 25 fps, L3 r1 -> r4): down **11.70 KB/s avg** / **19.7 p95** / 30.4 max (<= 12 / 24: MET, 2.5 % headroom on the average), snapshots 8.9 KB/s + events 1.4 reliable + 1.3 unreliable copies; up 1.45 KB/s; delta ratio 0.07 of a 7.8 KB full; 0 snaps, predErr p95 0.004, 0 desyncs / 234. The one 3000 ms exec-lag sample follows a 3037 ms host frame / 2277 ms guest frame (machine freeze).
- NET4-F3 (r4: L3 16.4 / 28.5 KB/s) -> FIXED as measured: 11.7 / 19.7 with ONE guest and max-stress builds; 8.3-10.0 / 13.8-18.1 with three.

## Step 12 - guest-seat skill DISPLACEMENT prediction (GP.4 net leg / GP.9 f) (done) - captures/gntcnet5-dash-N1.json, -dash-N2.json (+ .stdout.txt)
NEW `node tools/gntcnet5-dash.mjs --port 7841 --cond <N1|N2> --reps 12 --gap 4500` (host + Tank / Swordsman / Archer guests, own browsers; on the room-1 party page the host puts shoulder_charge / fox_step+pursuit / vault_shot+disengage in slot 1 with partySwap / partyGrantNode / partySocket, everyone picks, door, harmless durable targets; each guest presses the REAL key 1 with the real mouse aimed left / right alternately; rendered own pose per frame vs the host's authoritative seat). Summary `node tools/gntcnet5-dashsum.mjs`. (Harness notes: two earlier runs were discarded - an idle 4-human party wiped in room 1 before my single killAllEnemies cleared wave 2, and a single aim direction pinned the bodies on the wall; my inherited keeper passes setHp(id, maxHp), which the API reads as a FRACTION -> 95 x 95 = 9025 HP; harmless for net numbers.)

| cond | class | casts predicted / host casts | displaced | guest disp = host disp | snaps | retractions | net predErrMax (cum) | out-of-dash steps > 0.3 u (max) |
|---|---|---|---|---|---|---|---|---|
| N1 150+-20, 10 % | Tank Shoulder Charge | 12 / 12 | 12 | 12/12 (2.4 u) | 0 | 0 | 0.153 | 5 (0.71) |
| N1 | Swordsman Fox Step + Pursuit | 12 / 12 | 12 | 12/12 (2.61-3.0 u) | 0 | 0 | 0.169 | 7 (0.58) |
| N1 | Archer Vault Shot + Disengage | 12 / 12 | 12 | 12/12 (1.75-2.4 u) | 0 | 0 | 0.240 | 8 (0.97) |
| N2 250+-40, 20 % | Tank | 12 / 12 | 12 | 12/12 | 0 | 0 | 0.152 | 5 (2.15, rep 0) |
| N2 | Swordsman | 12 / 12 | 12 | 12/12 | **1** | 0 | 0.169 | 9 (**3.0 u twice, rep 3: frames 22 and 29 after the press, ~0.7-1 s after the dash ended = an out-and-back jump**) |
| N2 | Archer | 12 / 12 | 12 | 11/12 (rep 0 host 4.64 vs 2.4: host still settling the seat) | 0 | 0 | 0.240 | 10 (1.84, rep 0) |

- Every press predicted on the guest AND cast once on the host (72/72), 0 retractions, 0 page errors. Out-of-dash steps of 0.3-1.0 u are the dash's last frame at 25-30 fps (9-10 u/s x 60-100 ms).
- GP.4 N1 bars (p95 <= 0.15, 0 snaps, max correction per frame) met by every measure I have (net predErrMax <= 0.24 cumulative incl. walking). N2: 1 snap in 36 casts (a 3 u out-and-back) - one occurrence on a loaded machine; reproduction attempt in a later step.

## Step 13 - round-4 must-fix re-verification: NET4-F1 hidden host at the start, NET4-F2 host reload / second tab (done) - captures/gntcnet5-hiddenstart.json, -hiddenstart-ui.json, -hiddenstart-A-guest.png, gntcnet5-hostreload.json / .stdout.txt, gntcnet5-secondtab-20s.json, gntcnet5-sametab.json (log captures/gntcnet5-chainC1.log)
- **NET4-F1 FIXED.** `node tools/gntcnet5-hiddenstart.mjs --port 7841 --cases A,B`: case A (API Start, host switches to its other tab 380 ms later, inside the 1.5 s countdown) -> host ticks 0 -> 842 in 14 s on the Worker metronome (842 metronome ticks), guest synced at 2.4 s, applied 42 -> 294 in 4 s; case B (hidden 4.8 s after the start) -> 861 ticks, guest applied 861. Real-UI variant `--cases A --ui 1 --hideAt 800 --observe 40` (title -> Multiplayer -> Host a Game -> Start by mouse, other tab at 1.08 s): host 2395 ticks in ~40 s hidden (313 ticks per 5.2 s = 60.2/s, metronome starts 1, fallback false), guest synced at 2.1 s and applied 2394, host back visible -> guest synced 19 ms. r4: tick 0 for 40 s. 0 page errors.
- **NET4-F2 FIXED.** `node tools/gntcnet5-hostreload.mjs --port 7842` (host + 2 guests, L1 room 1 party page, Glint 12): host page reloaded -> guests "If the host does not come back, another player takes over" -> the reloaded title offers "Rejoin GCAW4? You were hosting GCAW4 - your party is waiting. Rejoin to carry on the run." -> Enter at 12.5 s -> "Welcome back - you are hosting again (the run resumed from 0.9 s earlier)", guests "The host is back"; host AND guests stay Level 1 room 1, Glint 12, then the party-page deadline auto-picks at 30 s and the run moves on to the door page with a 3rd Healer skill on all three (r4: camp, Glint 0). `node tools/gntcnet5-secondtab.mjs --port 7841 --waitS 20`: the live host opening the plain link in a second tab gets NO offer (offer null, rejoinInfo null); tab 1 keeps hosting (tick 2019 -> 2736), the guest stays synced, 0 desyncs (r4: Rejoin offered and accepting wiped the run). 0 page errors.
- Same-profile two tabs (`node tools/gntcnet5-sametab.mjs --port 7841`, 1/4 of my inherited checks): (c) a reloaded GUEST tab is offered ITS OWN Tank seat ("Rejoin 6VUPZ? Your Tank seat is held...", ownTab true) and lands there in 297 ms while the host tab stays host (r4: offered the Healer seat and took the host role) - FIXED. (a)/(b) "fail" only because the guest tab of the same window is a background tab from the start (synced false = AI-held while hidden, PLAN §3.7) - not a defect; sessions are now stored per tab (`echoes.net.sessions` keyed by tabId).

## Step 14 - connection drop-offs + server kill (done) - captures/gntcnet5-drops-ABCDE.json / .stdout.txt, -drops-G.json / .stdout.txt, gntcnet5-drops-*.png, gntcnet5-killsp.json / .stdout.txt (log captures/gntcnet5-chainC2.log)
`node tools/gntcnet5-drops.mjs --port 7843 --legs A,B,C,D,E` 5/6 and `--port 7846 --legs G` 3/3 (host + 2 guests, own child servers with --admin, a durable harmless enemy keeps the room in combat); 0 page errors.

| leg | result |
|---|---|
| A guest socket closed 4 s | seat held for AI at 544 ms, other guest told 637 ms, own banner 667 ms; resynced **2581 ms** after the link returned; phase / room / level / wallet / skills / HP equal, own pos err 0.00 u; walk by keys +1.64 u; desyncs 0 - PASS (<= 3 s) |
| B guest blackhole 7 s | dropped to AI at 5388 ms; own banner 139 ms; resynced **1749 ms** after restore; state equal; control +2.00 u; desyncs 0 - PASS |
| C guest page reload | title offers Rejoin; accepted -> same seat in **735 ms**, state equal, walk +1.89 u - PASS |
| D host blackhole 5 s (inside the grace) | guests frozen at 3232 ms with "Host connection lost - waiting (10 s) / If the host does not come back, another player takes over and the run continues."; resumed 1593 ms after restore; host kept its role, migrations 0, desyncs 0 - PASS. Frame gntcnet5-drops-D-guest-frozen.png (taken after the return) shows the toasts "The host is back" AND "DHost reconnecting..." stacked at once (stale toast, advisory). |
| E admin kill-host | guests told at 96 ms; migration at **10368 ms** (grace + 0.37 s), keyframe state age 1187 ms applied in 18 ms; new host 60.9 ticks/s; other guest synced, 0 desyncs; run continues (L1 r1 combat, skills equal) - PASS. The barred OLD host lands on a plain title with NO message - FAIL of my check (r3/r4 advisory A3 persists). |
| G host socket closed + refused 18 s (> grace) | migration at **10934 ms** after the loss (10.0 s after it was noticed at 898 ms), state age **1801 ms** (<= 2 s, 10 % headroom) applied in 20 ms; other guest synced 0 desyncs. Old host: "Connection lost - reconnecting (15 s) / The game keeps running here; your party sees you as reconnecting." at 943 ms, then the title with a Rejoin confirm; Rejoin -> guest seat 0 synced in 346 ms in the new host's room 3 with 24 Glint - PASS. |

Server kill mid-session (`node tools/gntcnet5-killsp.mjs`, own server 7848, title-booted host + guest in a live L1 campaign): reconnect banner host 110 ms / guest 9 ms after the kill; "Connection to the server was lost." on both at **15.2 s**; the title NO LONGER offers Rejoin for the dead server (r4 advisory A2 fixed: nothing to click for 20 s); New Game by mouse -> camp in 10 ms, 75 ticks, walked +2.28 u by keys, replica false, net offline - PASS. 0 page errors.

## Step 15 - race conditions (done) - captures/gntcnet5-races.json / .stdout.txt, gntcnet5-interact.json / .stdout.txt, and Step 7 for per-seat picks
- `node tools/gntcnet5-races.mjs --port 7841` 8/10: same-tick E on one Dewfont -> exactly one activation (drink@713 by 0 + interact_denied(used)@721 by 1; drink@1015 + denied@1024); bell trials 0 activations (dormant, nothing to race); **host + guest Esc at once -> both pause menus open, host 59.69 ticks/s, guest applied 59.16 ticks/s, both resume** - the session never halts. The 2 "fails" are my round-4 draft expectation ("the guest's Enter is refused"): under the PARTY model the guest's Enter decides the guest's OWN card, so there is no refusal; the outcome is still single - the Healer's take applied once (skill_equip@2692 + draft_taken@2692 once; rootsnare once @3541), the guest's skills mirror the host's, the page commits. Not a defect.
- `node tools/gntcnet5-interact.mjs --port 7841 --cond lat50,jit5` (12 trials, the guest's E leading the host's by 0-200 ms): **0 double activations**; 7 trials with a drink (host won 6, guest won 1 at a 200 ms lead), the loser always `interact_denied (used)`; 5 trials both presses hit an older used font (both denied, the new font stays ready) - r4 advisory A10 persists.
- Simultaneous per-seat picks with 4 clients, last-seat race 50/50: Steps 7 and 3.

## Step 16 - hit registration under lag with the host rewind ON vs OFF (done) - captures/gntcnet5-hitreg.json / .stdout.txt
`node tools/gntcnet5-hitreg.mjs --port 7841 --conds N0,N1,N2 --seconds 45 --reach 0.70 --half 35` (Swordsman guest holding the REAL right mouse button, chasing the nearest hostile it SEES with real WASD, closed-loop mouse aim through a 25-point homography, max err 0.12 u; valid-on-screen = rendered distance <= 0.70 u and angle <= 35 deg at the predicted swing frame; registration = the host's ally_basic targets for the same inputSeq). 0 page errors.

| cond | RTT ms | swings predicted = host | valid on screen | registered WITH rewind | WITHOUT rewind | rewind clamped |
|---|---|---|---|---|---|---|
| N0 | 20.5-39.3 | 129 = 129 / 126 = 126 | 108 / 149 | **99.1 %** (107) | 75.2 % (112) | 0 |
| N1 150+-20, 10 % | 163-211 | 129 = 129 / 129 = 129 | 135 / 113 | **97.0 %** (131) | 77.0 % (87) | 1 |
| N2 250+-40, 20 % | 278-300 | 129 = 129 / 130 = 130 | 96 / 126 | **94.8 %** (91) | 69.1 % (87) | 125 |

G5b.3 (>= 95 % at N1, >= 85 % at N2, visible drop without rewind) MET.

## Step 17 - linear campaign in multiplayer (done) - captures/gntcnet5-campaign.json / .stdout.txt / -campaign-*.png
`node tools/gntcnet5-campaign.mjs --port 7844` **8/8**, 0 page errors: guest campChoose 3 / 2 -> {ok:false, reason:'locked', "Clear The Sunken Mill to unlock"}, guest startCampaign / campaignAdvance / abandonRun refused, host unchanged; host portal E -> Level 1, guest in L1 combat 134 ms later (layout 2 = 2); L1 Stag clear: level_clear@1047 / level_transit@1047 / level_start@1312 exactly once on BOTH, guest card 29 ms after the host's, guest in L2 286 ms after the host, 0 camp frames, layout 5 = 5, wallet 84 = 84, skills equal, 0 desyncs / 35; guest pause = Leave Session + "Only the host can save an online session", no Quit to Lobby; host Quit to Lobby (real mouse, confirmed) -> host camp 65 ms, guest camp 81 ms, session up and synced; party wipe -> guest defeat card -> both camp (19 / 45 ms); Level-3 start -> Stag -> guest CAMPAIGN COMPLETE -> both back to camp (guest 47 ms); guest Leave Session -> title, not a replica, host's seat freed.

## Step 18 - single-player isolation, Node (done)
`node tools/gntM2-goldens.mjs` (builder harness, re-run by me): G2.10 ok, **9/9 match** (the 6 `?room=` goldens + 3 run goldens). Independent `node tools/gnt-arch-simtrace.mjs --mode kill_all|defend --ticks 3600 --seed 7` -> eventsHash **d1eff38b03f581aa** (759 events) / **554cd9c41db19975** (961) = the PLAN §6.5 references (same as r4). `node tools/gntM5a-protocol.mjs` **72/72** (tree-diff corpus + fuzz, codec, conditioner incl. 20 % loss reliable in order, outage, dup/reorder parse).

## Step 19 - single-player in page + on a server-backed origin (done) - captures/gntcnet5-sp.json / .stdout.txt, gntcnet5-spsockets.json / .stdout.txt (log captures/gntcnet5-chainC3.log)
- `node tools/gntcnet5-sp.mjs --port 7845`: `?seed=7&scene=arena&room=kill_all&freeze=1` -> `sim.trace(600, 3)` identical on two fresh loads AND with a live server connection (stateHash 6acb086c4aac5d6b, eventsHash **817f1e9940c91d76** = the §6.5 v0.5.0 reference, 184 events); after a hosted session the guest is promoted when the host leaves ("Hosting Room HGGUH · 1 player", not a replica, simCalls counting). Two inherited checks remain mis-specified exactly as r4 noted (the host's page after Leave Session is on the title, which does not tick; a second startCampaign inside a live page draws a new run seed) - not counted.
- `node tools/gntcnet5-spsockets.mjs http://127.0.0.1:7841/` (the zero-config address resolves to this very server): title -> New Game -> camp -> portal -> room 1 combat with **0 WebSockets created**, net offline (GD.9).

## Step 20 - player-facing MP flow, hidden tabs, zero-config, input parity, prediction retraction, orientation (done) - captures/gntcnet5-ui.json + gntcnet5-ui-*.png, -hidden.json, -zeroconf.json + -zeroconf-*-guest.png, -keylat.json, -retract.json, -orient.json (+ .stdout.txt each)
- UI by real mouse / keys (`node tools/gntcnet5-ui.mjs --port 7849`, raw filler hellos updated to protocol 4): no server -> Multiplayer -> "Can't reach the Echoes server at ws://127.0.0.1:7849/echoes ... run npm run net (for players on your network: npm run net -- --host 0.0.0.0), then press Retry" with Retry focused, **4916 ms after the click** (gntcnet5-ui-unreachable.png; bar 5 s, 84 ms headroom; my check also counted the click itself, hence its FAIL line); server started -> Retry -> online menu 72 ms; Host a Game -> code 7TZ9S on screen 551 ms; Join by Code typed lower-case -> seat 1 in 1488 ms; full room -> "full" 176 ms; Ready + Start by mouse -> guest in game 1031 ms with the chip "Online · Tank Room 7TZ9S · 2 players 4 ms" and tooltip "Connection good, ping 4 ms, packet loss in 0% out 0%". 0 page errors.
- Hidden tabs (`node tools/gntcnet5-hidden.mjs --port 7841`): guest hidden -> seat away in **13 ms**, the AI walked it 2.55 u, guest Worker metronome at 20 Hz kept acking (20 snaps/s, 0 desyncs); visible -> human in 51 ms, synced 2 ms, control +1.58 u - PASS. HOST hidden 20 s mid-game: metronome 1133 ticks in 19.68 s (**57.6/s**, fallback false), guest applied ticks per 2 s window **44.2 / 56.2 / 56.4** / 59.4 / 59.5 / 59.4 / 60.5 / 59.4 / 61.1 / 59.0 (3 of 10 outside 60 +- 2, mean 57.5), 0 desyncs / 39, never double speed, 60.75 after return (r4: mean 58.8, 3/10 outside).
- Zero-config (`node tools/gntcnet5-zeroconf.mjs --srv 7841 --preview 4328`) **12/12**: pages opened WITHOUT ?net= on the server's own --static site and on the preview proxy resolve their own origin (source 'site'); host 155 / 762 ms, joins 105-147 ms, guests synced 1616-1675 ms after Start; walk replicates (+2.2 / +2.83 u); the admin conditioner applies through both paths (RTT 24-64 -> 205-219 ms); guest socket closed 4 s -> resynced 1592 / 1443 ms on the same address; 0 desyncs.
- Key -> first moved rendered frame (`node tools/gntcnet5-keylat.mjs --port 7841`): single-player {1: 1, 2: 8} p50 41 ms, guest {1: 1, 2: 9} p50 29 ms -> prediction gives SP parity.
- Denied prediction (`node tools/gntcnet5-retract.mjs --port 7841 --cond lat75,jit10 --reps 8`; host downs the guest seat ~10 ms before the guest's real kit key): predicted cast 17-27 ms after the key on 8/8, **8/8 retracted 77-147 ms after the key** at 175-212 ms RTT (inside the first snapshot carrying the denial), net mispredictRetractMs p95 0.3, 0 confirmations of a denied cast.
- Orientation (`node tools/gntcnet5-orient.mjs --port 7841 --cond lat75,jit10,loss10`): 7/7 predicted swings matched on the host for the same inputSeq, angle error p50 / p95 / max **0.00 deg**.

## Step 21 - hitch recovery, lobby drop, host local loop (done) - captures/gntcnet5-hitch.json, -lobbydrop.json, -hostloop.json (+ .stdout.txt)
- `node tools/gntcnet5-hitch.mjs --port 7841 --cond lat50,jit5`: GUEST main-thread hitch 500 / 1000 / 2000 ms -> host exec lag of its input base 112 ms, peak 136 / 144 / 240 ms, recovered in 0.7-2.2 s (absorbed). HOST hitch 1000 ms -> peak **2440 ms**, back to base only at 7.5 s (a second 1968 ms spike at +5.2 s); HOST hitch 2000 ms -> peak **1776 ms**, draining ~1:1 to base at 3.5 s. r4 advisory A1 persists (PLAN §3.7 "a late frame's presses are applied on the next tick (<= 250 ms late)").
- `node tools/gntcnet5-lobbydrop.mjs` (a lobby member's socket dies before Start): Start refused with **"Every player must be ready first."** at 85 ms and 5123 ms, accepted at 10143 ms once the held seat was released - r4 advisory A4 persists (the copy blames readiness, not the dropped player).
- `node tools/gntcnet5-hostloop.mjs --port 7841` (ONE GPU page, 3 builder Node bots as playing guests at N1): SP leg 52.1 fps (p95 31.3 ms, 16 frames > 50 ms; this machine cannot hold 60 in SP), key->move [2,4,2,2,2,2]; HOST leg **56.2 fps** (p95 30.4 ms, 13 > 50 ms, one 1382 ms stall), hostNetMs p50 / p95 **0.3 / 2.4 ms** (bar 2), captureMs p95 0.7, encodeMs p95 1.2, **frameOver50Net 1** (bar 0), 14.4 KB/s out, key->move [2,2,2,2,3,3]; bots 0 desyncs / 122-125. G5b.9 not provable on this shared machine (the SP control misses 60 fps itself); hosting did not make the host's own loop worse than single-player here.

## Step 22 - guest dash prediction at N2, reproduction attempt (done) - captures/gntcnet5-dash-N2b.json
`node tools/gntcnet5-dash.mjs --port 7841 --cond lat125,jit20,loss20 --reps 12 --gap 4500 --out gntcnet5-dash-N2b.json`: Tank / Swordsman / Archer 12/12 predicted, 12/12 displaced, guest disp = host disp 36/36, **0 snaps**, 0 retractions, out-of-dash step max 0.40 / 0.31 / 0.49 u. The Step-12 N2 snap (1 in 36) did not reproduce in 36 more casts -> advisory.

## Step 23 - builder harness re-run on my port (done) - captures/gntcnet5-netbench.json
`node tools/gnt-M5a-netbench.mjs --server ws://127.0.0.1:7841/echoes --pages 2 --bots 1 --seconds 30 --cond lat75,jit10,loss10 --url http://127.0.0.1:4328/ --out captures/gntcnet5-netbench.json`: schema echoes-netbench/1, every verdict PASS (guest RTT 150-170 ms, loss 9-10 %, down 3.4-3.5 KB/s avg / 5.3-6.4 p95, delta ratio 0.11-0.115, 0 desyncs / 66-67, 0 page errors). Its Level-1 scenario and 1.3 KB fulls are far lighter than my Level-3 max-stress windows (Step 11: 7.8 KB fulls, 11.7 KB/s) - my own numbers are the ones I score.

Processes: stopped my session server PID 80220 (:7841) and vite preview PIDs 92064 / 91700 (:4328) at the end; child servers 7842-7849 were started and stopped by their tools (none left listening); two dash runs I aborted mid-way (PIDs 70792, 90760) left no browser behind (the only puppeteer Chrome still running belongs to a live node PID 67168 that is not mine). The shared dev server 5199 was never touched.

## Builder checkpoint claims, re-measured
- fix-M5a-r4 **NET4-F1** (hidden host at the start): HOLDS. Step 13 measures 60.2 ticks/s hidden from the first tick by real UI, and the guest synced 2.1 s after Start.
- fix-M5a-r4 **NET4-F3** (L3 bandwidth, claimed 7.8 / 13.4 KB/s per guest): HOLDS against the budget, with less margin than claimed. Step 11 measures 11.7 / 19.7 KB/s with ONE guest and the max-stress builds (the claim predates the PARTY builds), and 8.3-10.0 / 13.8-18.1 with three.
- fix-M5b-r4 **NET4-F2** (host reload / second tab): HOLDS. Step 13: the run resumed from 0.9 s earlier with Glint kept; a second tab gets no offer; a reloaded guest tab gets its own seat.
- build-PARTY S7 / S9 **GP.9** (own 28/28 + rearm 14/14, 1 guest): HOLDS with 3 guests. Step 7 is 20/20: not_owner x4, 30.00 s autopick, 30.00 s door, 15.00 s shop, builds equal on 4 clients. I did not re-run rearm (a)-(e).
- build-PARTY S9 **GP.10** (repl 8/8; L3 max-stress 10.73 / 11.09 KB/s avg, p95 13.8-14.5):
  - Replication HOLDS (Step 7): builds are equal on 4 clients after every commit / buy / socket op / level transition, with 0 desyncs.
  - Bandwidth HOLDS but measures higher here: 11.7 avg / 19.7 p95 (Step 11).
  - I did not re-test build retention across rejoin / migration. The Healer's skills were equal after every drop leg.
- build-PARTY S9 **GP.4 net leg** (displacement predErr p95 <= 0.005 pooled, max <= 0.16, 0 snaps): HOLDS at N1 (36/36, 0 snaps). At N2 there was 1 snap in 72 casts over two runs (Steps 12, 22).
- build-PARTY S10 **GP.6** "0 overlapping interactive boxes, 0 clipped text": true as scoped, but it never checked text drawn over text inside a tab. The MULTIPLAYER party page draws the owner label over the character name at every size (Step 9). This is the one must-fix below.
- Round-4 advisories:
  - A2 (Rejoin offered for a dead server) is FIXED (Step 14).
  - These persist: A1 (host-stall recovery), A3 (silent title for a barred old host), A4 (a dropped lobby member blocks Start with the wrong copy), A5 (hidden-host dips), A9 (the old host's solo sim is discarded), A10 (E on a used Dewfont).

## PLAN gates, literally

| gate | result | evidence |
|---|---|---|
| G5a.1 | MET | servers ready < 1 s, /health ok, 20 sequential + 8 simultaneous clients (Step 3) |
| G5a.2 | MET | Step 3; race 50/50; every rejection explicit |
| G5a.3 | MET | live delta/full 0.04-0.08; 0 decode errors at 20 % loss; protocol 72/72 |
| G5a.4 | MET | server-applied up-link loss 4.5-5.6 / 9.2-10.4 / 19.1-20.1 % at 5 / 10 / 20 %; dup + reorder seen on the wire; protocol suite passes |
| G5a.5 | MET | Step 23 |
| G5a.6 | MET | goldens 9/9 |
| G5b.1 | MET | 2-4 clients; position path dev p95 <= 0.29 u at N1; orientation 0.00 deg; actions 72/72 predicted = cast; AI seats; drop-in |
| G5b.2 | MET, with advisory A1 (overloaded host) | N1: predErr p95 0.035-0.044, max correction per frame 0.10, remote jumps 0. N2 / N3: p95 <= 0.089, max 0.25-0.67 <= 1.0, remote jumps > 0.6 u 0 %, no reconnect, 0 desyncs. N4: 0 decode errors, 0 duplicated events |
| G5b.3 | MET | 97.0 / 94.8 % with the rewind vs 77.0 / 69.1 % without |
| G5b.4 | MET | Level 1 <= 7.1 / 15.3 KB/s; Level 3 max-stress 11.7 / 19.7 with one guest; up 1.4-1.6 |
| G5b.5 | MET | 0 mismatches, 3 guests x 180 s x N1-N4 |
| G5b.6 | MET | guest back 1.7-2.6 s after the link returns (reload 0.7 s); host grace 10 s, then migration at +0.37 s / +0.93 s with state age 1.2 / 1.8 s; server kill -> title + message at 15.2 s, SP intact |
| G5b.7 | MET | one activation; draft / per-seat picks single; last seat 50/50; pause never halts |
| G5b.8 | MET | goldens 9/9; simtrace references; in-page 817f1e9940c91d76 with and without a server |
| G5b.9 | PARTIAL | hostNet p95 2.4 ms vs 2; frameOver50Net 1 vs 0; 56 fps while SP itself runs 52 fps on this machine |
| G5b.10 | PARTIAL | key->move parity with SP; >= 60 fps cannot be shown here |
| G5b.11 | PARTIAL | stale repeat 8 ticks; guest away in 13 ms; hidden host at the start 60.2/s; hidden host mid-game 57.6/s with 3/10 windows at 44-56 |
| G5b.12 | MET in function; literal bar not met under load | cast predicted 17-27 ms after the key, 8/8 retracted within the first snapshot, 0 doubled. The literal 17 ms p95 fails: feedback p95 33-59 ms at 20-30 fps |
| G5b.13 | MET for what I re-ran | unreachable 4.92 s, Retry 72 ms, room full. Change-server validation / LAN / https not re-run |
| G5b.14 | MET | replayedOnce true, simCalls 0, refusedEmits 0 on every guest; wallet equal |
| GC.11 | MET | 8/8 |
| GD.2 / GD.4 / GD.9 | MET | zero-config 12/12; single-player opens 0 sockets |
| GP.4 net leg | MET | one N2 snap that did not reproduce, kept as advisory A7 |
| GP.9 | MET | Step 7, 20/20 |
| GP.10 | MET | Steps 7 and 11 |
| GP.6 (the multiplayer party page) | NOT MET in spirit | the tabs that must "show clearly WHICH character" render overlapping text (NET5-F1) |

## Benchmark scoring (Step 1 checklist, scored after the probes)

| # | score | evidence |
|---|---|---|
| B1 authoritative sim + input redundancy | MET | 60 Hz input at 1.4-1.6 KB/s. At 20 % loss, predicted vs confirmed: 41/41; 25/24 + 1 retracted; 22/19 (the rest in flight at window end) (Step 5) |
| B2 20 Hz snapshots + ~100 ms interpolation, bounded extrapolation | MET | 15.7-21.0 snaps/s, interp 142-250 ms, remote jumps > 0.3 u: 0 at 20 % loss (Steps 5-6) |
| B3 own-movement prediction + smoothed reconciliation | MET | key->move SP {1:1,2:8} vs guest {1:1,2:9}; predErr p95 <= 0.09; 108/108 dashes host = guest (Steps 12, 20, 22) |
| B4 lag compensation with a rewind cap | MET | 97.0 / 94.8 % vs 77 / 69 % without; 125 clamps at N2 (Step 16) |
| B5 net_graph-style diagnostics | PARTIAL | the chip shows ping / loss / quality, but net.stats rttMs reads 641-746 ms on a 100 ms link (server 302-618) and quality says "poor" at N0 under load (Steps 4-5) |
| B6 timeout / disconnect with a clear message | PARTIAL | banners in 9-667 ms; "Connection to the server was lost." at 15.2 s; but the barred old host lands on a silent title (Step 14) |
| B7 delta against the ACKED baseline | MET | ratio 0.04-0.08, baseline age p50 4-10 ticks, fulls only on request or natural (Steps 4-6) |
| B8 unchanged entities ~0 bytes, delta 10-30 % | MET | delta 139-365 B vs full 3.2-7.8 KB (4-8 %) |
| B9 loss absorbed without resync | MET | 20 % loss: 0 desyncs, 0 decode errors, 15.7 snaps/s (Steps 5-6) |
| B10 own-action prediction with rollback | MET | 72/72 casts predicted, 8/8 denials retracted in 77-147 ms, 0 doubled cues (Steps 12, 20) |
| B11 server input buffer robust to stalls | PARTIAL | depth 0-1 normally; after a 1 s host hitch, guest inputs run 2.4 s late and drain 1:1; overloaded host at N3: p95 0.8-2.1 s (Steps 6, 21) |
| B12 favour-the-shooter with a cap | MET | the rewind clamps at N2 and still registers 94.8 % |
| B13 degraded-but-playable under loss | MET | L20 / N2 own path dev p95 <= 0.23 u, no remote teleports |
| B14 host / join by code / quick play | MET | Steps 3, 20 |
| B15 seats / ready / last-slot race | MET | 50/50 exactly one winner |
| B16 drop-in | MET | drop-in takes an AI seat (Step 3) |
| B17 guest disconnect -> rejoin with state | MET | 1.7-2.6 s, reload 0.7 s, state equal (Step 14) |
| B18 host leaves -> clear policy | MET | migration at grace + 0.4-0.9 s, state age <= 1.8 s; a reloading host resumes the run (Steps 13-14) |
| B19 pause never halts online | MET | 59.7 / 59.2 ticks/s with both menus open (Step 15) |
| B20 synced shared moments, per-player picks, no silent picker | PARTIAL | transitions exactly once on every client; 30.00 s autopick, 15.00 s shop, 30.00 s door; builds equal on 4 clients. But the per-character tabs of the co-op party page draw the owner labels over the names (NET5-F1) |
| B21 bandwidth in the shipped-game range | MET | 3.6-11.7 KB/s down, 1.4-1.6 up per guest |
| B22 version mismatch rejected explicitly | MET | `join_rejected version_mismatch`; close 4001 for protocol 999 (Step 3) |

Score: **18 met / 4 partial / 0 not met of 22**.

## Verdict
**FAIL - 1 must-fix.** The replication stack is strong, and all three round-4 must-fix items are fixed: NET4-F1 (hidden host at the start), NET4-F2 (host reload / second tab) and NET4-F3 (Level-3 bandwidth).

Re-measured independently:
- 0 desyncs over 3 guests x 180 s x N1-N4, and in every other window.
- Deltas are 4-8 % of a full snapshot.
- Walking predErr p95 <= 0.09 u, with the same key-to-move latency as single-player.
- 108 guest dashes / vaults predicted, with host = guest displacement.
- Hit registration 97 / 95 % with the rewind vs 77 / 69 % without.
- Guest reconnect in 1.7-2.6 s; migration at grace + 0.4-0.9 s.
- PARTY ownership, the 30 s deadlines, the 15 s shop countdown and build replication all hold with 4 clients.
- Campaign MP 8/8, zero-config 12/12, single-player bit-identical.

What fails: on the multiplayer party page, every character tab draws its owner label ("you", "player", "AI") on top of the character name. This happens at every supported window size, on the host and the guest.

### Must-fix
| id | title | evidence | reproduce |
|---|---|---|---|
| NET5-F1 | Multiplayer party page: the per-character owner labels ("you" / "player" / "AI") are drawn over the character names on every reward page | captures/gntcnet5-partytabs.json: at 1024x640, 1280x720, 1600x900 and 1920x1080, on the host AND the guest, `.rn-powner` overlaps `.rn-pname`: "Healer" x "you" 29 %, "Healer" x "player" 55 %, "Swordsman" x "AI" 82 %. The frames gntcnet5-partytabs-Host-1920.png, -Fox-afterpick-1280.png and gntcnet5-party-stall-fox.png read "Heal~er~you", "Tan~k~player", "Swordsma~n~AI". Single-player control (gntcnet5-partytabs-sp.json, 1920x1080): the owner labels are empty and hidden, 0 px overlap, so the defect is multiplayer-only. The spec requires rewards to "show clearly WHICH character a card ... belongs to", and this tab strip is the first thing every co-op player reads after every room. | `node tools/gntcnet5-partytabs.mjs --port <free port>` (host + 1 guest, Level 1 room 1 party page, overlapping-text audit at 4 sizes) |

### Advisories
- **A1 Host overload / host stall.**
  - With the host page at 16 fps (4 browsers, CPU at 100 %), guest inputs ran with p95 0.8-2.1 s lag at N3, and the own body was corrected by 2-6 u in the Stag room (Step 6).
  - With 1 guest and the host at 28-36 fps, the lag max was 240-248 ms (Steps 8 and 10).
  - A 1 s host hitch gives 2.4 s of input lag, which drains 1:1 (Step 21). PLAN §3.7 says a late frame is applied <= 250 ms late.
- **A2 Inflated RTT / quality diagnostics.** net.stats rttMs reads 641-746 ms on a 100 ms link (server-measured 302-618). On a loaded page the quality reads "poor ... jitter" even at N0 (Steps 4-5).
- **A3 Silent title for a barred host.** The old host barred by kill-host lands on a plain title with no message (Step 14 E; r3/r4 A3).
- **A4 Dropped lobby member blocks Start.** Start is blocked for ~10 s with "Every player must be ready first." instead of naming the dropped player (Step 21; r3/r4 A4).
- **A5 Hidden host mid-game.** 57.6 ticks/s over 20 s; the first three 2 s windows are 44.2 / 56.2 / 56.4 (Step 20). The hidden-at-start case holds 60.2/s.
- **A6 Contradictory toasts.** "The host is back" shows together with "DHost reconnecting..." after a host blackhole (gntcnet5-drops-D-guest-frozen.png).
- **A7 One dash snap at N2.** A 3 u out-and-back own-body snap on the Swordsman's Fox Step (1 in 72 casts over two runs; not reproduced; Steps 12, 22).
- **A8 Migration margins.** The state age in leg G was 1801 ms (bar 2 s, 10 % headroom). The old host's 15 s of solo simulation is discarded (r4 A9).
- **A9 Literal fps / latency bars.** The G5b.9 / G5b.10 / G5b.12 fps and 17 ms bars cannot be shown on this shared machine; the single-player control itself runs at 52 fps.
- **A10 E targets a used Dewfont.** Next to a fresh Dewfont, E still targets an older used one (5/12 contested trials had both presses denied; r4 A10).
- **A11 Harness note.** `cmd('setHp', id, v)` treats v as a fraction of max HP; my inherited keeper passed maxHp (-> 9025 HP). This has no effect on the network numbers.
