STATUS: COMPLETE
VERDICT: FAIL - 2 must-fix. NET6-F1: a guest's full-slot swap card does not predict the Replaces mark, so at N1 / N2 presses within one round trip are lost (S S S W Down Up -> final mark off by one, 3/3 runs) and S + Enter 150 ms later replaced Ground Crack instead of the chosen Whirling Guard (2/2 runs; N0 correct). NET6-F2: the multiplayer shop pushes "GLINT · ROOM 7 OF 8" outside the window at 1024x576 / 1024x640 / 1152x648 (3 / 3 / 1 text boxes off-window; SP 0) because the NET5-F1 owner pills widen the tab row. Re-measured and met: 0 desyncs / 7115 checks over 3 guests x 180 s x N1-N4; delta 3-7 % of full; hit-reg 98.0 / 98.2 % vs 67.5 / 74.4 % without the rewind; 16 injected corruptions detected + repaired in <= 409 ms; reconnect 2.1-2.3 s, migration grace + 0.4 s (state age <= 665 ms); L3 max-stress 10.79 / 18.85 KB/s; PARTY ownership / deadlines / build replication 20/20 with 4 clients; campaign MP 8/8; SP bit-identical; NET5-F1 fixed. Benchmark 21 met / 4 partial / 0 not met of 25.

# Critic NET — round 6

## Step log
- S0 (2026-10-01): checkpoint file created; no prior r6 file existed. Branch gauntlet, HEAD f91670d.

## Step 1 - BLIND BENCHMARK CHECKLIST (written before any round-6 Echoes capture / log / state was inspected)

From my own knowledge of the named shipped systems. Every item is concrete and testable; each is scored after the probes (met / partial / not met, with evidence).

### Source engine / Valve multiplayer networking model
- B1 Authoritative fixed-tick simulation; the client sends a usercmd every tick and re-sends the previous ones (cl_cmdbackup 2) so one lost packet never loses an input.
- B2 Snapshots at ~20 Hz (cl_updaterate); remote entities rendered cl_interp ~100 ms in the past (2 x snapshot interval) so a single lost snapshot is invisible; extrapolation is capped (cl_extrapolate_amount 0.25 s) and then the entity freezes instead of running away.
- B3 Client-side prediction of own movement: the key press moves the local player on the same rendered frame; on correction the client re-simulates from the last acked command and smooths the residual (cl_smoothtime 0.1 s); only large errors snap.
- B4 Lag compensation: the server rewinds target positions to the shooter's view time (latency + interp) to validate hits the shooter saw; capped (sv_maxunlag); with it disabled registration visibly drops under lag.
- B5 net_graph-style truthful diagnostics: ping / loss / choke visible to the player and matching the real link.
- B6 Timeouts: a silent client/server is detected in seconds, the player sees a disconnect reason ("Connection to server timed out"), never a hang; the game returns to a usable menu.

### Quake 3 delta compression
- B7 Every snapshot is delta-coded against the newest snapshot the client ACKNOWLEDGED (not the last one sent); no usable baseline -> a full snapshot.
- B8 Unchanged entities / fields cost ~0 bytes (per-field change bitmask, quantised floats); a typical delta is 10-30 % of a full snapshot or less.
- B9 Arbitrary loss is absorbed with no resync handshake: the next delta simply uses an older acked baseline; no stall, no divergence.
- B10 Duplicated / reordered datagrams are discarded by sequence number (older-than-newest snapshot ignored) with no visible effect.

### Overwatch netcode (Ford / Orwig GDC 2017)
- B11 Own-ability prediction: weapon fire / abilities animate and play sound on the input frame; a server denial rolls back quickly (within one server update) and no cue plays twice on confirmation.
- B12 Server input buffer + client time dilation: the client adjusts its command rate to keep the server's input buffer small but non-empty; recovers from hitches/loss without long input lag; inputs are sent redundantly.
- B13 Favour-the-shooter with a rewind cap (~250 ms); high-ping players lose the favour beyond the cap.
- B14 Graceful degradation: at moderate loss/latency play stays responsive; remote players do not teleport; the game shows a connection-quality indicator.
- B15 Determinism / desync detection: state divergence is detectable and repaired (full state resend) rather than silently persisting.

### Co-op roguelikes with lobbies (Risk of Rain 2, Gunfire Reborn)
- B16 Host a lobby, join via code/invite, public quick play that finds an open lobby within seconds; lobby shows every player, character and ready state.
- B17 Character/seat selection with ready-up; the host starts when everyone is ready; exactly one winner for a contested last slot; a full lobby rejects with a clear message.
- B18 Join in progress (drop-in) into a free slot of a running game.
- B19 Guest disconnect: the run continues for the others; the dropped character is removed/AI-held; the guest can rejoin into the same run with state intact.
- B20 Host disconnect: a clear policy with a clear message (RoR2/GR end the session for all; better systems migrate the host) - never a hang or crash; single-player intact afterwards.
- B21 Pause in online play never freezes time for everyone (RoR2's MP pause menu does not stop the game).
- B22 Shared progression moments (stage transitions, boss kills, item/reward choice) are synchronised: every client transitions together; each player picks their own reward; timeouts / auto-picks so no one waits forever on a silent picker.
- B23 Build/progression replication: items / builds of every player are identical on every client and survive stage transitions.
- B24 Modest bandwidth (tens of KB/s per client at most) and a version/build mismatch is rejected with an explicit message.
- B25 UI hygiene of MP overlays: online status / player labels / reconnect toasts never overlap each other or the game's own text; contradictory messages never show at once.

## Step 2 - environment (done)
- Build under test: HEAD f91670d, VERSION 0.5.197; src/ and server/ clean in git status. `npx vite build --outDir dist-cnet6` -> version.json {0.5.197, entry index-OoO8EUa-.js}. No commit since round 5's HEAD 85f5f19 touches src/net or server/; the net-relevant changes since r5 are src/ui/net/hud.js (+314: session notes / chip docking), src/ui/run/partystrip.js (owner pill, NET5-F1 fix 87854e8), and sim changes (allies/partyai/enemies/world/run/nodes: AI engagement, MENACE, difficulty) that bear on replication and SP determinism.
- My processes: session server `node server/index.mjs --port 7841 --admin --static dist-cnet6` PID 96028 (protocol 4, /health ok, build 0.5.197); preview `ECHOES_NET_PORT=7841 npx vite preview --outDir dist-cnet6 --port 4328 --strictPort` PID 85720 (vite). Shared dev server 5199 untouched.
- Tools: the round-5 net critic's harness copied to gntcnet6-* (prefix + dist dir renamed, outputs captures/gntcnet6-*), each re-read before use. CPU load at start 71 % (other agents running).

## Step 3 - raw lobby / matchmaking / race / hardening probe (done) - captures/gntcnet6-lobby.json, -lobby.stdout.txt
`node tools/gntcnet6-lobby.mjs --port 7842 --trials 50 --build 0.5.197` (own child server, Node WebSocket clients) **21/21**:
connect+hello x20: open p50 2.9 ms / max 26.0, hello p50 0.62 / max 4.29 ms; create private -> code C3MB6 in 2.25 ms; join by code -> seat 1 in 1.45 ms, host gets peer_joined; lower-case code accepted; taken seat -> `error seat_taken`, seat 3 granted; guest start -> `not_host`; unready start -> `not_ready`; start -> game_starting (countdown 1500) -> in_game at 1518 ms; drop-in to in_game takes AI seat 2 in 1.3 ms; 5th join -> `full`; unknown / malformed code -> `not_found`; build 0.0.1 -> `join_rejected version_mismatch`; protocol 999 -> `error version_mismatch` + close 4001; **last-seat race 50/50 exactly one winner + one `full`, 0 doubled seats**; quick match joins the open public room in 1.27 ms; 8 simultaneous quick matches -> rooms [2,3] / [0,1,2,3] / [0,1], 0 doubled; lone quick match -> room_state + match_status(queued, open 0); garbage JSON / 3 MB frame (closed 1009 "frame too large") / 2000-ping flood -> health ok, the other room's sockets untouched; server kill -> both clients close 1006 in 5.7 ms.

## Step 4 - RTT sweep, host + 3 guests, Level 1 combat, real keys (done) - captures/gntcnet6-rtt.json, -rtt.stdout.txt, -rtt-*-raw*.json, -rtt-*-guest.png
`node tools/gntcnet6-sweep.mjs --guests 3 --conds N0,C50,C150,C250 --seconds 30 --settle 6 --tag rtt --raw 1`; summary `node tools/gntcnet6-sumsweep.mjs captures/gntcnet6-rtt.json` (host page + 3 guest browsers on preview 4328 + server 7841; conditioner per guest link both directions; CDP wire tap on every page; each guest driven by real WASD / Space / 1-2 / right mouse). 0 page errors on 4 pages. Host 22.9-33.9 fps, sim 54.8-60.0 ticks/s (machine shared).

| cond (per dir) | snaps/s | delta B avg / full B -> ratio | guest down B/s avg / p95 (1 s) | up B/s | server RTT / net.stats RTT ms | own path dev p95 / max u | predErr p95 / max u | corr snaps | remote jumps >0.3 u | key->move frames | host exec lag p50 / p95 ms | actions pred/conf/retr | desync / checks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N0 off | 19.5 | 117-124 / 3335-3374 -> 0.03-0.04 | 3144-3272 / 4100-4385 | 1452-1476 | 28-54 / 27-58 | 0.01-0.03 / 0.11-0.41 | 0.003-0.016 / 0.07-0.09 | 0/0/0 | 0 | {1:4, 2:19} | 80 / 88-160 | 11/11/0, 9/9/0, 11/11/0 | 0/79-81 |
| C50 25+-5 | 19.7 | 167-171 / 3993 -> 0.04 | 4225-4313 / 5783-6073 | 1512-1527 | 85-101 / 84-103 | 0.01 / 0.08-0.40 | 0.003 / 0.09-0.13 | 0/0/0 | 0 | {1:3, 2:20, 3:1} | 104-112 / 112-120 | 26/26/0, 17/17/0, 17/17/0 | 0/161-163 |
| C150 75+-15 | 18.3 | 185-194 / 3324-3332 -> 0.06 | 4247-4635 / 6628-10990 | 1390-1413 | 194-211 / 192-211 | 0.06-0.18 / 0.84-2.61 * | 0.035-0.044 / 0.19-0.34 | 0/0/0 | 0 | {1:6, 2:18} | 144-160 / 168-2784 * | 35/35/0, 30/30/0, 26/25/1 | 0/239-240 |
| C250 125+-25 | 20.0 | 139-140 / 3175 -> 0.04 | 3478-3499 / 4910-5459 | 1472-1502 | 256-270 / 255-266 | 0.05-0.06 / 0.13-0.52 | 0.035-0.044 / 0.12-0.55 | 1/0/0 | 0 | {1:9, 2:16} | 152-160 / 168-184 | 44/44/0, 43/43/0, 35/34/1 | 0/321-322 |

- Delta compression 0.03-0.06 of a full snapshot in every window (net.stats deltaRatio 0.043-0.052); baseline age p50 2-6 ticks. 0 desyncs over 2410 hash checks; 0 decode / apply errors; every guest `replayedOnce` true, 0 duplicate events, busCounters simCalls 0 / refusedEmits 0.
- Diagnostics now truthful: net.stats rttMs matches the server-measured link RTT within a few ms at every condition (r5 advisory A2 read 641-1425 ms on 100-250 ms links). Quality "good" at N0 / C50, "fair (latency, jitter)" at C150, "poor (latency, jitter)" at C250.
- Own-action feedback p95 20-58 ms (the predicted swing / cast on the rendered frame after the key at 28-40 fps); 0 doubled cues; one retraction each at C150 / C250.
- \* C150 attribution: the host page froze 2913 ms (only 15 ticks advanced) at the same wall time as guest 0's 2744 ms frame (machine-wide stall); guests 1 / 2 each had one separate 3.0 s frame. The exec-lag spikes 2040-2784 ms, the 2.61 u path max, the 2.73 u rest error and the hostile jumps > 0.6 u (1-4 of 2064-2458 frames) all follow those freezes. Outside them: lag 120-168 ms, path dev p95 <= 0.06 u. Environment (CPU shared with other agents), not attributed to the game.

## Step 5 - packet loss / dup / reorder sweep, host + 3 guests (done) - captures/gntcnet6-loss.json, -loss.stdout.txt, -loss-*-raw*.json, -loss-*-guest.png
`node tools/gntcnet6-sweep.mjs --guests 3 --conds L5,L10,L20,DR --seconds 30 --settle 6 --tag loss --raw 1` (same rig; conditioner lat 50 jit 10 + loss / dup / reorder on every guest link, both directions). 0 page errors on 4 pages; host 29-35 fps, sim 58.3-59.9 ticks/s.

| cond | guest-seen snapshot loss % / server-applied down, up % | snaps/s | delta avg B / full B -> ratio | down B/s avg / p95 | up B/s | own path dev p95 / max u | predErr p95 / max u | corr snaps | remote jumps >0.3 u | key->move frames | exec lag p50 / max ms | dup / reorder seen (server applied) | events dup / replayedOnce | actions pred/conf/retr | desync / checks |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L5 | 3.2-5.8 / 2.7-3.7, 4.6-5.7 | 18.3-18.8 | 191-195 / 3177-3185 -> 0.06 | 4508-4548 / 5998-6093 | 1468-1470 | 0.02-0.08 / 0.11-2.34 (room re-seat) | 0.035-0.043 / 0.12-0.18 | 0/0/0 | 0 | p95 2 | 120-128 / 136-280 | 0 / 12-16 | 0 / true | 11/11/0, 9/9/0, 11/11/0 | 0/80-83 |
| L10 | 10.0-11.0 / 6.5-7.1, 9.6-10.6 | 17.5-17.7 | 207-209 / 3523-3539 -> 0.06 | 4658-4730 / 6014-6627 | 1494-1519 | 0.02-0.03 / 0.06-0.15 | 0.003-0.04 / 0.09-0.11 | 0/0/0 | 0 | p95 2 | 128-136 / 136-200 | 0 / 5-7 | 0 / true | 26/26/0, 17/17/0, 17/17/0 | 0/154-160 |
| L20 | 19.9-21.8 / 13.2-14.9, 19.6-20.3 | 14.9-15.2 | 150-152 / 3470 -> 0.04 | 3074-3141 / 4086-4532 | 1444-1487 | 0.02-0.03 / 0.10-1.76 * | 0.004-0.04 / 0.09-0.13 | 0/0/0 | 0 | p95 2 | 120-128 / 136-200 | 0 / 1-7 | 0 / true | 41/40/1, 25/25/0, 23/23/0 | 0/216-223 |
| DR dup5 reo10 | 0 (server dup 73-74, reo 142-150) | 20.9-21.0 | 151-156 / 3408-3446 -> 0.04-0.05 | 3975-4057 / 5175-5340 | 1518-1527 | 0.01-0.02 / 0.05-0.26 | 0.003-0.014 / 0.07-0.09 | 0/0/0 | 0 | p95 2 | 120-128 / 128-136 | 29-33 / 22-30 | 0 / true | 52/51/1, 34/34/0, 34/34/0 | 0/299-307 |

- Loss absorbed Quake-3 style: at 20 % loss the stream keeps 14.9-15.2 snaps/s, baseline age p50 4 / max 9 ticks, delta ratio 0.04, 0 full snapshots needed inside the window, own path dev p95 <= 0.03 u, 0 correction snaps, 0 remote jumps. Duplicated / reordered snapshots (29-33 / 22-30 seen per guest) produce 0 decode errors, 0 duplicate events and 0 desyncs.
- simCalls 0 / refusedEmits 0 on every guest in every window; 0 desyncs over 2080 hash checks.
- Attribution: the L5 path max (2.34 u) and the 3 own-body steps > 0.5 u are the room-1 -> room-2 re-seat (gntcnet6-snaps: all 3 in class `transition`). \* L20 guest 1: at the very start of the window the host's seat stood 1.76-2.51 u behind the guest's predicted body for 280 ms, then moved at dash speed and converged (no own-body step > 0.5 u, no correction snap) = one dodge executed ~0.35 s late under 20 % loss, a bounded degrade.
- Quality chip: "fair (loss, jitter)" at 5 %, "poor (loss)" at 10-20 %, "good"/"fair (latency)" under dup/reorder - consistent with the link.

## Step 6 - single-player isolation + protocol, Node (done) - captures/gntcnet6-protocol.stdout.txt (+ builder outputs captures/gntM5a-protocol.json, gntM2-goldens output)
- `node tools/gntM2-goldens.mjs` (builder harness, re-run by me): G2.10 ok, **9/9 match** (kill_all / defend / run x seeds 1-3; run-2 f4b1de84195be987 / b99e890329a08ff6, run-3 bd43384911d117a9 / b42c0af175fc067a = the PLAN §6.5 v0.5.184 reference).
- Independent `node tools/gnt-arch-simtrace.mjs --mode kill_all|defend --ticks 3600 --seed 7` -> eventsHash **d1eff38b03f581aa** (759 events) / **554cd9c41db19975** (961 events) = the PLAN §6.5 v0.5.0 references (unchanged since v0.4.63).
- `node tools/gntM5a-protocol.mjs` **72/72**: the full tree-diff corpus (value<->null, delete vs null, array insert/remove/truncate/grow, Map-as-pairs, id-keyed arrays, NaN / +-Inf / -0, empty containers), 10 000 fuzz pairs 0 failures, hostile patches never pollute prototypes, INPUT packet 6 redundant frames 28-43 B (1.64 KB/s), conditioner latency 75.00 ms, jitter sigma 9.95, loss 10 % -> 10.20 % / 20 % -> 20.27 % / 20 unseeded runs 9.45-10.63 %, dup 1.034 %, reorder 1.98 %, GE burst 11.56 vs 11.43 %, reliable class 0 dropped at 20 % loss with +249 ms retransmit delay, 64 kbit/s -> 8028 B/s, outage.

## Step 7 - 3-minute soaks at PLAN N1 / N2 / N3 / N4, host + 3 guests (done) - captures/gntcnet6-soak.json, -soak.stdout.txt, -soak-N*-raw*.json, -soak-N*-guest.png
`node tools/gntcnet6-sweep.mjs --guests 3 --conds N1,N2,N3,N4 --seconds 180 --settle 6 --tag soak --raw 1` (real keys on 3 guests, host autopilot L1 room 1 -> room 8; 4 browsers). 0 page errors on 4 pages. Snap attribution `node tools/gntcnet6-snaps.mjs captures/gntcnet6-soak-N*-raw*.json`.

| | N1 150+-20, 10 % | N2 250+-40, 20 % | N3 GE burst @150 | N4 dup1 reo2 @100 |
|---|---|---|---|---|
| host rooms / fps / sim ticks/s | r1 -> r4 / 30.6 / 58.4 | r4 -> r5 / 29.6 / 59.5 | r5 -> r6 / 25.2 / 59.6 | r6 -> r8 (Stag) / 30.7 / 59.6 |
| hash checks / desyncs (3 guests) | 337-344 / **0** | 647-664 / **0** | 991-1003 / **0** | 1383-1402 / **0** |
| guest-seen snapshot loss % / snaps/s | 10.2-10.6 / 17.4-17.5 | 19.9-20.3 / 15.8-15.9 | 10.4-11.1 / 17.6-17.8 | 0 (dups 28-49, reo 14-25) / 20.0-20.1 |
| delta avg B / full B / ratio (net.stats) | 199-200 / 3425 / 0.06 (0.069-0.082) | 254-255 / 3996-4014 / 0.06 (0.068-0.074) | 229-231 / 5664-5753 / 0.04 (0.052-0.057) | 164-168 / 3638 / 0.05 (0.049-0.053) |
| guest down B/s avg / p95 / max (1 s) | 4339-4351 / 6825-7134 / 14558 | 4881-4898 / 8826-9511 / 16296 | 4976-5139 / 11968-13089 / **24593-49127** | 4286-4361 / 6835-7190 / 10005 |
| up B/s | 1498-1507 | 1585-1594 | 1591-1608 | 1626-1632 |
| predErr p95 / max u | 0.003-0.031 / 0.09-0.18 | 0.036-0.044 / 0.25-0.42 | 0.044-0.082 / 0.18-0.34 | 0.003-0.004 / 0.07-0.09 |
| correctionSnaps (per seat) | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |
| own path dev p95 u (max excl. room re-seats) | 0.02-0.03 | 0.05-0.07 | 0.02-0.08 (0.96-1.18) | 0.02 |
| remote party jumps > 0.3 u (net.stats) / max | 0 / 0.10-0.24 | 0 / 0.12-0.20 | 0 / 0.20-0.24 | 0 / 0.10 |
| hostile jumps > 0.6 u / frames | 0-1 / 23 k | 3-4 / 38-40 k (0.01 %) | 22-43 / 23 k (0.1-0.2 %) | 0 / 37-40 k |
| key -> first moved frame | {1:19, 2:119} | {1:27, 2:106, 3:2} | {1:32, 2:103, 4:1} | {1:22, 2:108, 12:1, 26:1} |
| host exec lag of guest input p50 / p95 / max ms | 144-152 / 168-216 / 1600-3000 * | 184 / 232-240 / 264-496 | 152 / 280-376 / 1328-2248 | 128 / 144-160 / 160-352 |
| own-action feedback p95 (max) ms | 25-28 (62) | 35-36 (140) | 34-73 (1720) | 27-48 (148) |
| predicted / confirmed / retracted | 63/63/0, 62/62/0, 62/62/0 | 126/126/0, 125/125/0, 127/127/0 | 191/191/0, 189/189/0, 190/190/0 | 251/251/0, 247/247/0, 246/246/0 |
| events replayed / dup / replayedOnce | 2378-2391 / 0 / true | 4684-4695 / 0 / true | 6559-6630 / 0 / true | 8930-8949 / 0 / true |
| host hostNetMs p50 / p95, frameOver50Net | 2.1 / 8.3, 23 | 2.4 / 7.1, 149 | **11.7 / 71.4, 428** | 2.1 / 8.1, 88 |

- 0 desyncs over 12 guest x 180 s windows (7115 hash checks), 0 decode / apply errors, 0 duplicated events, simCalls 0 / refusedEmits 0 on every guest; every predicted action confirmed (0 retractions over 1929 predictions).
- Every own-body step > 0.5 u in N1 / N2 / N4 is a room re-seat (class `transition`); N3 adds 1-2 per seat with a dash or a host stall > 300 ms nearby, the body ending 1.1-2.5 u from the host seat and converging (no correction snap).
- \* N1: the host page froze 2928 ms once (machine-wide), which is the 1.6-3.0 s exec-lag max and the path max 9.4 u (a re-seat inside that freeze).
- N3 needs attribution (next step): the host's own net cost rose to p50 11.7 / p95 71.4 ms per frame with 428 frames > 50 ms attributed to net work (N1 / N2 / N4 on the same machine: p95 7.1-8.3 ms), and the host page showed a run of 200-400 ms frames advancing <= 15 ticks each from the room-6 start onward. Hostile jumps: the large ones (4.1-7.1 u) are the same two hostiles at the same host tick (~32970) on all three guests = an authoritative displacement, not a network artefact; the 0.6-0.9 u ones follow the host's 200-400 ms frames. The 1 s download max reached 24.6-49.1 KB in N3 (p95 12.0-13.1 KB/s is within the 24 KB/s p95 budget) with 3-8 full snapshots per guest re-sent after burst outages.

## Step 8 - N3 host-cost attribution: A/B on one host page (done) - captures/gntcnet6-hostcost.json, gntcnet6-hostloop-N1r6.json
NEW `node tools/gntcnet6-hostcost.mjs --port 7841 --room 6 --seconds 30 --conds N1,N3,N1,N3` (ONE host page 1600x900 + 3 playing Node bot guests (builder botlib, load only), Level 1 room 6 kept in combat by durable harmless hostiles; the conditioner alternates on every bot link under the same machine load; net stats reset per window). Machine CPU at 100 % (40 chrome processes from other agents).

| window | host fps / frame p95 ms / frames > 50 ms | hostNetMs p50 / p95 | frameOver50Net | capture / encode p95 ms | host out B/s | bot down KB/s | bot desyncs / checks |
|---|---|---|---|---|---|---|---|
| N1 #1 | 37.1 / 42.5 / 15 | 1.8 / 5.9 | 3 | 1.9 / 1.6 | 21308 | 5.6-5.7 | 0 / 46-55 |
| N3 #1 | 40.9 / 36.4 / 3 | 1.5 / 4.0 | 2 | 1.5 / 1.4 | 19569 | 4.8-4.9 | 0 / 52-54 |
| N1 #2 | 46.5 / 30.4 / 8 | 0.7 / 2.9 | 1 | 1.3 / 1.4 | 20072 | 4.4-4.5 | 0 / 52-54 |
| N3 #2 | 65.1 / 24.2 / 1 | 0.7 / 3.1 | 0 | 1.1 / 1.4 | 20015 | 4.4 | 0 / 50-54 |

- Burst loss does NOT raise the host's net cost: N3 windows cost the same as N1 windows on the same page (p95 3.1-4.0 vs 2.9-5.9 ms). The soak's N3 host p95 71 ms / 428 frames came from the overloaded 4-browser rig (host page 25 fps, 200-400 ms frames), consistent with r5's A1 host-overload advisory. The literal G5b.9 bars (hostNetMsP95 <= 2 ms, 0 frames > 50 ms with net work) are still not met on this machine: best window 2.9-3.1 ms and 0-1 frames.
- `node tools/gntcnet6-hostloop.mjs --cond lat75,jit10,loss10 --room 6 --seconds 60 --tag hostloop-N1r6` (the r5 hostloop, parameterised): SP control 31.6 fps / p95 54 ms; HOST leg 26.2 fps with a 4345 ms machine freeze; hostNet p50 3.3 / p95 12.8 ms, frameOver50Net 49; bots 0 desyncs / 116-122. The room cleared mid-window (no keeper in that tool), so its key->move nulls are a reward page, not a defect. Recorded for completeness; the A/B above is the controlled measurement.

## Step 9 - PARTY ownership / deadlines / build replication, 4 clients at N1 (done) - captures/gntcnet6-party.json, -party.stdout.txt, -party-stall-fox.png, -party-stall-moss.png, -party-shopcountdown-wren.png
`node tools/gntcnet6-party.mjs --port 7843 --cond lat75,jit10,loss10` (own child server; host + Fox / Wren / Moss = seats 1 / 2 / 3, each its own browser; every guest link at N1) **20/20**, 0 page errors, 0 desyncs over 258 / 258 / 260 checks.
- Page 1: owners [human x4], deadline 1800 ticks. Fox's own-UI calls on Wren's seat / the Healer return false with 0 CMDs sent; raw CMDs from Fox for seats 2 / 0 (pick, pick, autofill, reorder) -> host `not_owner` +4, Fox told 4, cards + builds unchanged; the host's UI cannot pick / reorder Fox's seat.
- Simultaneous picks (4 presses within 36 ms): commit on the host 211 ms and on the guests 715-829 ms after the last press; all four builds identical on all 4 clients.
- Stalled guest (Moss): the page commits **30.00 s** after it opened with `party_autopick reason timeout`, Moss's card = its AI suggestion (take); toast on all 4 clients; replayed on every guest. Door deadline: nobody picks -> left door at **30.00 s**. Fox's autofill on the door page is a CMD and lands (2 filled), equal everywhere.
- Shop: Fox's buy on Wren's shelf refused locally; its own buy lands (purse 72 -> 57, sold); host Advance with guests not Done -> countdown, guests see 846-852 ticks, the shop leaves at **15.00 s**; builds + purses equal on all 4.
- Level 1 -> Level 2: all 4 clients in Level 2, ally skills + sockets carried and identical.
- Frame gntcnet6-party-stall-fox.png (960x540): the tab row reads "Healer [Host]", "Tank [you]", "Swordsman [Wren]", "Archer [Moss] ... 9 s", and "Waiting for Archer - auto-pick in 9 s" - the NET5-F1 owner labels now sit in flow as pills and name the player.

## Step 10 - FULL-SLOT SKILL REWARDS in multiplayer: swap offers decided by the owner (done) - captures/gntcnet6-swap.json, -swap.stdout.txt, -swap-fox-marked.png, -swap-stall-*.png
NEW `node tools/gntcnet6-swap.mjs --port 7843` (host + Fox (Tank, seat 1) + Wren (Swordsman, seat 2), own browsers, guest links N1; one class node socketed into each of Fox's 4 skills by host cmd before the pick) **13/13**, 0 page errors, 0 desyncs (0/77, 0/88).
- Fox holds 4 skills -> the room-1 card is `type skill, swap true` (Shield Wall, suggest take / replace 2), never a node; Wren (4 skills) likewise gets a swap card.
- Only the owner decides: the host's UI `partyPick(fox, take, 0)` -> false; Wren's UI -> false; Wren's raw swap CMD -> host `not_owner` +1; Fox's card stays undecided.
- Fox's REAL keys on its own page: S, S moved the Replaces mark 2 -> 3 (frame gntcnet6-swap-fox-marked.png: "Whirling Guard replace", "Shield Wall replaces Whirling Guard - Whirling Guard's 1 node go to the Tank's bench", focus on "Take · Replace"), Enter -> host card decided take / replace 3 by human.
- Commit: on the host Fox has exactly 4 skills [heavy_slam, brutal_cleave, ground_crack, shield_wall], shield_wall in slot 3, whirling_guard gone, its node `brace` on the bench with provenance `grant` (0 nodes lost); Wren's Leave kept loadout + sockets; both builds identical on all 3 clients; `skill_swapped` seen exactly once per client.
- Page 2 (a node card for Fox) with Fox stalled: commits at 30.00 s with the AI suggestion applied, still exactly 4 skills, equal on every client.
- Observation: of the two S presses only one moved the mark (2 -> 3, expected 2 -> 3 -> 0 wrap); the mark shown and the applied slot agree, so no wrong swap - followed up in a later step.

## Step 11 - multiplayer build pages: NET5-F1 re-check + widened text / window audit (done) - captures/gntcnet6-partytabs.json + -partytabs-*.png, gntcnet6-mpoverlap.json + -mpoverlap-*.png, gntcnet6-mpwidth.json + -mpwidth-*.png, control gntcnet6-mpwidth-sp.json, gntcnet6-spshop.json / -spshop-1024.png
- r5 probe `node tools/gntcnet6-partytabs.mjs --port 7844`: owner x name overlap **0** at 1024x640 / 1280x720 / 1600x900 / 1920x1080 on host and guest (r5: 0.29-0.82 at every size). The only pairs are HUD text UNDER the modal page at 1024x640 (hud-loc-name / hud-loc-sub under the strip: covered, not drawn over - frame gntcnet6-partytabs-Host-1024.png) and the guest note vs the #hud-banner labels at opacity 0 after the pick (frame -Fox-afterpick-1280.png shows no banner). **NET5-F1 FIXED.**
- NEW `node tools/gntcnet6-mpoverlap.mjs --port 7844` (host + Fox + Wren): reward page at 1024x576 / 1024x640 / 1280x720 / 1600x900 / 1920x1080 / 2560x1440 - pills read "you" / "Fox" / "Wren" / "AI" (guest: "Host" / "you" / ...), 0 text-on-text pairs at >= 1280x720, the 1024 pairs are HUD under the page; a live drop (Wren's socket closed 4 s) shows "Wren lost connection - AI plays the Swordsman" in its own row under the page, 0 pairs (frame -dropnote-Fox.png), the tab flips to "AI ✓ Take"; the guest's socket screen is opaque over the page (frame -socket-Fox-1024.png clean; the audit's pairs are the covered page beneath); door page 0 pairs.
- **Defect: the multiplayer SHOP pushes its purse / room plate out of the window at the small supported sizes.** NEW `node tools/gntcnet6-mpwidth.mjs --port 7846` (host "Host" + guests "Maximilian Wolfe" (16 = NAME_MAX) + "Wren") vs the same probe single-player (`--sp 1`):

| size | shop MP host: text boxes outside the window | shop MP guest (Maximilian Wolfe) | shop SP control | reward page MP / SP |
|---|---|---|---|---|
| 1024x576 | 3: "GLINT · ROOM" 959-1077, "7" 1084-1095, "OF 8" 1103-1141 | 3: "GLINT · ROOM" 893-1011, "7" 1018-1029, "OF 8" 1037-1075 | 0 (frame 40-984) | 0 / 0 |
| 1024x640 | 3: "GLINT · ROOM" 990-1117, "7" 1125-1137, "OF 8" 1145-1185 | 3 | 0 | 0 / 0 |
| 1152x648 | 1: "OF 8" 1145-1185 | 0 | 0 | 0 / 0 |
| 1280x720 / 1366x768 | 0 | 0 | 0 | 0 / 0 |

  Tab widths MP [171, 235, 226, 160] vs SP [138, 138, 164, 138] px at 1024x640: the in-flow owner pills (the NET5-F1 fix, v0.5.182) add ~214 px to the shop's header row, and the shop frame does not re-fit it. Frame gntcnet6-mpwidth-shop-H-1024x640.png: the plate reads "72 GLI" cut at the window edge, "ROOM 7 OF 8" not visible; gntcnet6-mpoverlap-shop-Fox-1024.png (short names, 1024x576): "72 GLINT · ROOM 7" with the "7" cut and "OF 8" gone. SP control gntcnet6-spshop-1024.png: "72 GLINT · ROOM 7 OF 8" fully inside. PLAN GP.6 requires 0 clipped text nodes on the shop at 1024x576.

## Step 12 - guest-seat displacement prediction (GP.4 net leg) + host-hitch attribution (done) - captures/gntcnet6-dash-N1.json, -dash-N2.json, -dash-N2b.json (+ .stdout.txt), gntcnet6-hitchdash.json / .stdout.txt
`node tools/gntcnet6-dash.mjs --port 7841 --cond <N1|N2> --reps 12 --gap 4500` (host + Tank / Swordsman / Archer guests; Shoulder Charge / Fox Step + Pursuit / Vault Shot + Disengage in slot 1; REAL key 1 with the real mouse aimed left / right alternately); summary `node tools/gntcnet6-dashsum.mjs`.

| cond | class | casts / predicted | displaced / guest disp = host disp | correction snaps | retractions | predErrMax (cum) | out-of-dash steps > 0.3 u (max) |
|---|---|---|---|---|---|---|---|
| N1 | Tank | 12 / 11 | 11 / 12 of 12 (one press cast nothing on either side) | 0 | 0 | 0.148 | 1 (0.32) |
| N1 | Swordsman | 12 / 12 | 12 / 12 | 0 | 0 | 0.168 | 1 (0.42) |
| N1 | Archer | 12 / 12 | 12 / 12 | 0 | 0 | 0.240 | 5 (0.67) |
| N2 | Tank | 12 / 12 | 11 / 11 | 0 | 0 | 0.003 | 0 |
| N2 | Swordsman | 12 / 12 | 12 / 12 | **3 (reps 5 and 8: 3.0 u out-and-back)** | 0 | 0.167 | 6 (3.0) |
| N2 | Archer | 12 / 12 | 12 / 12 | 0 | 0 | 0.242 | 11 (1.18) |
| N2 re-run (`--only swordsman --reps 16`, instrumented) | Swordsman | 16 / 16 | 16 / 16 | 0 | 0 | 0.168 | 2 (0.49) |

- The two snapping Swordsman casts are the only ones in which the host started the dash ~0.9-1.1 s after the guest's predicted start (every other cast: 150-280 ms). The instrumented re-run (host frame gaps <= 115 ms, host start 188-276 ms after the guest) shows 0 snaps in 16. r5 saw 1 snap in 72 N2 casts (A7).
- NEW `node tools/gntcnet6-hitchdash.mjs --port 7841 --cond lat50,jit5 --reps 8 --hitch 900 --lead 60`: the host page is frozen 900 ms (synchronous busy loop) around the guest's real Shoulder Charge key -> the host executes the cast 941-1075 ms after the key (control 136-265 ms), yet the guest shows 0 snaps, 0 backtrack, guest disp = host disp 2.4 u in 8/8 hitched and 8/8 control trials. A host stall alone does not rubber-band a predicted dash; the N2 snaps need a ~1 s host delay combined with 20 % loss on Fox Step + Pursuit. Kept as advisory A-DASH (GP.4 "0 snaps" at N2 met in 28 of 30 Swordsman casts across two runs; 3 snaps in 2 casts).

## Step 13 - connection drop-offs, build retention (GP.10), server kill (done) - captures/gntcnet6-drops-ABCDE.json / -ACE.json / -G.json (+ .stdout.txt), gntcnet6-drops-*.png, gntcnet6-killsp.json / .stdout.txt
`node tools/gntcnet6-drops.mjs --port 7843 --legs A,B,C,D,E` 5/6, `--legs A,C,E` 3/4 (re-run after my probe's node grants were fixed: 3 class nodes put on every ally's bench before the legs, and every state comparison now also compares all three ally builds - slots, sockets, bench, purse), `--port 7846 --legs G` 3/3 (host + 2 guests, own child servers with --admin, durable harmless hostiles keep room 1 in combat). 0 page errors.

| leg | result |
|---|---|
| A guest socket closed 4 s | seat held for AI at 182-224 ms, other guest told 215-248 ms, own banner 255-281 ms; resynced **2106-2118 ms** after the link returned; phase / room / level / wallet / Healer skills / all ally builds (incl. benched nodes) equal, own pos err 0.00 u; walk by keys +1.57-1.61 u; desyncs 0 - PASS (<= 3 s) |
| B guest blackhole 7 s | dropped to AI at 5405 ms; own banner 90 ms; resynced **2314 ms** after restore; state + builds equal; control +1.61 u - PASS |
| C guest page reload | the title offers Rejoin; accepted -> same seat in **454-517 ms**, state + builds equal, walk +1.58-2.03 u - PASS |
| D host blackhole 5 s (inside the grace) | guests frozen at 3089 ms with "Host connection lost - waiting (10 s) / If the host does not come back, another player takes over and the run continues."; resumed after restore; host kept its role, 0 migrations, 0 desyncs - PASS |
| E admin kill-host | guests told at 56-99 ms; migration at **10394 ms** (grace + 0.39 s), keyframe state age **368 ms** applied in 29 ms; new host 59.9 ticks/s; other guest synced, 0 desyncs; all three ally builds (benched nodes included) identical before / after the migration - PASS. The barred OLD host lands on a plain title with NO message (frame gntcnet6-drops-E-oldhost.png) - my check FAILS (r3-r5 advisory A3 persists; an admin kick, not a player path). |
| G host socket closed + refused 18 s (> grace) | migration at **10471 ms** after the loss, state age **665 ms**, applied in 20 ms; other guest synced, 0 desyncs. Old host: "Connection lost - reconnecting (15 s) / The game keeps running here; your party sees you as reconnecting." at 309 ms, then the title with a Rejoin confirm; Rejoin -> guest seat 0 synced in 331 ms in the new host's room 3 with 24 Glint - PASS |

Server kill mid-session (`node tools/gntcnet6-killsp.mjs`, own server 7848, title-booted host + guest in a live L1 campaign): reconnect banner host 99 ms / guest 5 ms after the kill; "Connection to the server was lost." on both at **15.13 s**; no Rejoin offered for the dead server; New Game -> camp, 78 ticks, walked +2.24 u by keys, replica false, net offline - PASS. 0 page errors.

## Step 14 - hidden host at start, host reload, second tab (done) - captures/gntcnet6-hiddenstart.json / .stdout.txt, gntcnet6-hostreload.json / .stdout.txt, gntcnet6-secondtab.json / .stdout.txt
- `node tools/gntcnet6-hiddenstart.mjs --port 7841 --cases A,B`: case A (host switches to its other tab inside the 1.5 s countdown, away ~14 s) -> host 840 ticks / 838 metronome ticks (60/s), the guest synced while the host was hidden, back visible in 7 ms; case B (hidden 3 s after the start) -> 850 host ticks, guest applied 849. NET4-F1 stays fixed.
- `node tools/gntcnet6-hostreload.mjs --port 7842` (host + 2 guests, L1 room 1 page, Glint 12): the reloaded title offers "Rejoin L7VWH? You were hosting L7VWH - your party is waiting. Rejoin to carry on the run."; Enter at 13 s -> "Welcome back - you are hosting again (the run resumed from 0.9 s earlier)"; host AND guests stay Level 1 room 1, Glint 12, Healer skills [mending_bolt, swift_mend, nova_bloom] on all three. NET4-F2 stays fixed.
- `node tools/gntcnet6-secondtab.mjs --port 7841 --waitS 20`: a second tab of the live host gets NO offer (offer null, rejoinInfo null); tab 1 keeps hosting (tick 2078 -> 2866), the guest stays synced, 0 desyncs.

## Step 15 - race conditions (done) - captures/gntcnet6-races.json / .stdout.txt, gntcnet6-interact.json / .stdout.txt (+ Step 3 last seat, Step 9 simultaneous picks, Step 10 swap ownership)
- `node tools/gntcnet6-races.mjs --port 7841` 8/10: same-tick E on one Dewfont -> exactly one activation (drink@644 by 0 + interact_denied(used)@648 by 1; drink@913 + denied@916); bell trials: dormant, nothing to race; **host + guest Esc at once -> both pause menus open, host 60.28 ticks/s, guest applied 59.92 ticks/s, both resume** - the session never halts. The 2 "fails" are the inherited pre-PARTY expectation "the guest's Enter is refused": the guest now decides its own card; the outcome is still single (skill_equip + draft_taken once at 2526 and at 3933, guest skills mirror the host's) - not a defect.
- `node tools/gntcnet6-interact.mjs --port 7841 --cond lat50,jit5` (12 trials, the guest's E leading the host's by 0-200 ms): **0 double activations**; 6 trials with a drink (host won the 0 / 40 ms leads, the guest the 80-200 ms leads), the loser always `interact_denied (used)`; in the other 6 both presses hit the older used font next to a fresh one (both denied, the new font stays ready) - r4 / r5 advisory A10 persists.
- Simultaneous picks with 4 clients (Step 9: commit 211-829 ms after the last press, builds equal), last-seat race 50/50 (Step 3), the swap card decided only by its owner (Step 10).

## Step 16 - hit registration under lag, host rewind ON vs OFF (done) - captures/gntcnet6-hitreg.json / .stdout.txt
`node tools/gntcnet6-hitreg.mjs --port 7841 --conds N0,N1,N2 --seconds 45 --reach 0.70 --half 35` (Swordsman guest holding the REAL right mouse button, chasing the nearest hostile it SEES with real WASD, closed-loop mouse aim via a 25-point homography, calibration max err 0.12 u; valid-on-screen = rendered distance <= 0.70 u and angle <= 35 deg at the predicted swing frame; registration = the host's ally_basic targets for the same inputSeq). 0 page errors.

| cond | RTT ms (rewind / no-rewind leg) | swings predicted = host | valid on screen (on / off) | registered WITH rewind | WITHOUT rewind | rewind clamped | rewind avg ticks |
|---|---|---|---|---|---|---|---|
| N0 | 14.5 / 2 | 129 = 129 / 124 = 124 | 101 / 109 | **100 %** (101) | 72.5 % (79) | 0 | 12.7 |
| N1 150+-20, 10 % | 190 / 144 | 129 = 129 / 130 = 130 | 149 / 126 | **98.0 %** (146) | 67.5 % (85) | 0 | 15.9 |
| N2 250+-40, 20 % | 250 / 286 | 129 = 129 / 129 = 129 | 164 / 133 | **98.2 %** (161) | 74.4 % (99) | 85 | 18.5 |

G5b.3 (>= 95 % at N1, >= 85 % at N2, visible drop without the rewind) MET; every predicted swing had exactly one host swing.

## Step 17 - linear campaign in multiplayer (done) - captures/gntcnet6-campaign.json / .stdout.txt / -campaign-*.png
`node tools/gntcnet6-campaign.mjs --port 7844` **8/8**, 0 page errors: guest campChoose 3 / 2 -> {ok:false, reason:'locked', "Clear The Sunken Mill to unlock" / "Clear The Hollow Wood to unlock"}, guest startCampaign / campaignAdvance / abandonRun refused, host unchanged (unlocked [1]); host portal E -> Level 1, guest in L1 combat 145 ms later (layout 2 = 2); L1 Stag clear: level_clear@1322 / level_transit@1322 / level_start@1502 exactly once on BOTH, guest card 27 ms after the host's, guest in L2 153 ms after the host, 0 camp frames, layout 5 = 5, wallet 84 = 84, skills equal, 0 desyncs / 38; guest pause = Leave Session + "Only the host can save an online session", no Quit to Lobby; host Quit to Lobby (real mouse, confirmed) -> host camp 31 ms, guest camp 211 ms, session up and synced; party wipe -> guest defeat card -> both camp (18 / 21 ms); Level-3 start -> Stag -> guest CAMPAIGN COMPLETE -> both back to camp (guest 22 ms); guest Leave Session -> title, not a replica, host's seat freed.

## Step 18 - single-player bit-identity in the browser (done) - captures/gntcnet6-spbit.json / .stdout.txt, gntcnet6-spsockets.stdout.txt
NEW `node tools/gntcnet6-spbit.mjs --port 7845` **4/4** (every leg a FRESH page, sim frozen at boot and stepped by sim.trace with scripted input):
- A `?seed=7&scene=arena&room=kill_all&freeze=1` trace(600, 3) = eventsHash **817f1e9940c91d76** (the PLAN §6.5 v0.5.0 reference), stateHash 6acb086c4aac5d6b, 184 events; B = the same page with a live server connection (hello/welcome, idle) -> identical hashes.
- C / D `?menu=0&seed=7&freeze=1` -> startCampaign L1 -> trace(3600, 3): eventsHash **f1d0bd3db0ef5c8e** / stateHash 2f0ec988e2f83c0b, 880 events, identical on two fresh loads; E = the same after the page connected, HOSTED a lobby room (XXYVE) and left it -> identical hashes, not a replica.
- `node tools/gntcnet6-spsockets.mjs http://127.0.0.1:7841/` (the zero-config address resolves to this very server): title -> New Game -> camp -> portal -> room 1 combat with **0 WebSockets created**, net offline (GD.9).

## Step 19 - player-facing MP flow, hidden tabs, zero-config, input parity, retraction, orientation (done) - captures/gntcnet6-ui.json + gntcnet6-ui-*.png, -hidden.json, -zeroconf.json, -keylat.json, -retract.json, -orient.json (+ .stdout.txt each)
- UI by real mouse / keys (`node tools/gntcnet6-ui.mjs --port 7849`) **6/6** (first run 3/6 was a harness artefact: my inherited raw filler clients said build 0.5.165, got `version_mismatch` and never filled the room; fixed to 0.5.197): no server -> Multiplayer -> "Can't reach the Echoes server at ws://127.0.0.1:7849/echoes ... npm run net ..." **4657 ms after the click** (bar 5 s); server started -> Retry -> online menu 4 ms; Host a Game -> code HQ56K on screen 93 ms; Join by Code typed lower-case -> seat 1 in 865 ms; full room -> "That room is full." in 133 ms (frame gntcnet6-ui-full.png); Ready + Start by mouse -> guest in game 919 ms with the chip "Online · Tank Room HQ56K · 2 players 4 ms" + tooltip "Connection good, ping 4 ms, packet loss in 0% out 0%". 0 page errors.
- Copy note (frame gntcnet6-ui-lobby-guest.png): the lobby's SHARE panel says "The host plays the Healer and makes the build choices between rooms; everyone else plays an ally." - stale since the PARTY rule (each human builds their own character, Steps 9-10). Advisory.
- Hidden tabs (`node tools/gntcnet6-hidden.mjs --port 7841`) 2/2: guest hidden -> seat away in **15 ms**, the AI walked it 3.18 u, the guest's Worker metronome kept 20 Hz acks (19.2 snaps/s, 0 desyncs); visible -> human in 46 ms, synced 4 ms, control +1.57 u. HOST hidden 20 s: metronome 1214 ticks in 20.2 s (**60.1/s**, fallback false), guest-applied ticks per 2 s window 59.0 / 56.4 / 58.0 / 59.7 / 58.1 / 59.5 / 60.8 / 59.8 / 59.8 / 57.9 (2 of 10 outside 60 +- 2, mean 58.9; r5 mean 57.6 with 3/10 outside), 0 desyncs / 40, 61.1 after return.
- Zero-config (`node tools/gntcnet6-zeroconf.mjs --srv 7841 --preview 4328`) **12/12**: pages WITHOUT ?net= on the server's own --static site and on the preview proxy resolve their own origin (source 'site'); host 95 / 177 ms, joins 67-138 ms, guests synced 1648-1747 ms after Start; walk replicates (+2.13 u); the admin conditioner applies through both paths (RTT 23-46 -> 180-189 ms); guest socket closed 4 s -> resynced 1269 / 1209 ms on the same address; 0 desyncs.
- Key -> first moved rendered frame (`node tools/gntcnet6-keylat.mjs --port 7841`): single-player {1: 2, 2: 6, 3: 1} p50 24 ms; guest {1: 4, 2: 4} p50 33 ms (one 162 ms outlier) -> prediction gives SP parity.
- Denied prediction (`node tools/gntcnet6-retract.mjs --port 7841 --cond lat75,jit10 --reps 8`; host downs the guest seat ~10 ms before the guest's real kit key): predicted cast 15-19 ms after the key on 8/8, **8/8 retracted 71-134 ms after the key** at 141-187 ms RTT, net mispredictRetractMs p95 0.6, 0 confirmations of a denied cast.
- Orientation (`node tools/gntcnet6-orient.mjs --port 7841 --cond lat75,jit10,loss10`): 7/7 predicted swings matched on the host for the same inputSeq, angle error p50 0.00 / p95 / max **0.29 deg**.

## Step 20 - hitch recovery, lobby drop (done) - captures/gntcnet6-hitch.json, -lobbydrop.json (+ .stdout.txt)
- `node tools/gntcnet6-hitch.mjs --port 7841 --cond lat50,jit5`: GUEST main-thread hitch 500 / 1000 / 2000 ms -> host exec lag of its input base 104 ms, peak 128-136 ms, recovered in 0.7-2.2 s (absorbed). HOST hitch 1000 ms -> peak 920 ms, back to base at **1.25 s** (r5: peak 2440 ms, base only at 7.5 s) - improved; an unrelated 1648 ms spike at +11 s (machine). HOST hitch 2000 ms -> peak 1832 ms, back to base at 3.5 s (r5: 1776 / 3.5 s) - unchanged; the backlog drains at ~0.75-1x (PLAN §3.7 "a late frame's presses are applied on the next tick (<= 250 ms late)"): advisory A1 (reduced).
- `node tools/gntcnet6-lobbydrop.mjs` (a lobby member's socket dies before Start; first run invalid - my inherited crasher said build 0.5.165 and never joined; fixed): Start refused with **"Every player must be ready first."** at 41 / 5053 / 10087 ms while the dead member's seat is held ("Dh"), accepted at 15176 ms once released - r3-r5 advisory A4 persists (the copy blames readiness, not the dropped player, and names nobody).

## Step 21 - Level 3 with the four MAX-STRESS builds: bandwidth (G5b.4 / GP.10) (done) - captures/gntcnet6-max3g1.json / .stdout.txt, gntcnet6-max3.json / .stdout.txt
Host boot `?partygrant=max` + startCampaign({level: 3}); verified on the host: Level 3 room 1, every ally 32/32 sockets (Tank taunting_roar / whirling_guard / ground_crack / iron_stance; Swordsman flurry / blade_storm / caltrops / razor_wake; Archer volley / rain_of_arrows / piercing_shot / kestrel_watch).
- 1 guest, 120 s, N1 (`--guests 1 --conds N1 --seconds 120 --level 3 --extraQ partygrant=max --tag max3g1`; L3 r1 -> r4; host 35 fps): down **10.79 KB/s avg / 18.85 p95** / 26.1 max (budget 12 / 24: MET), delta 462 B = 0.06 of a 7.6 KB full, up 1.48 KB/s, 0 correction snaps, predErr p95 0.035 / max 0.28, 0 desyncs / 240, events replayedOnce.
- 3 guests, 60 s each (`--guests 3 --conds N1,N2,N3 --seconds 60 --level 3 --extraQ partygrant=max --tag max3`; host 12-25 fps on the loaded machine): down avg / p95 KB/s **N1 8.5-8.6 / 13.5-17.0**, **N2 9.3-9.6 / 14.9-15.3**, **N3 7.8-8.2 / 13.0-13.6** (MET); delta 0.04-0.07 of a 6.7-8.2 KB full; up 1.40-1.48 KB/s; correction snaps 0 / 1 (one seat at N2) / 0; predErr max 0.14-0.90 u (<= 1.0); 0 desyncs over 2257 checks; simCalls 0.

## Step 22 - builder harness re-run on my port (done) - captures/gntcnet6-netbench.json / .stdout.txt
`node tools/gnt-M5a-netbench.mjs --server ws://127.0.0.1:7841/echoes --pages 2 --bots 1 --seconds 30 --cond lat75,jit10,loss10 --url http://127.0.0.1:4328/ --out captures/gntcnet6-netbench.json`: schema echoes-netbench/1, every verdict gate true (guest RTT p50 150-162 ms, loss 12-13 %, down 3.45-3.50 KB/s avg / 6.8-6.9 p95, delta ratio 0.10-0.12 of 1.3-1.5 KB fulls, 0 desyncs, 0 page errors). Its Level-1 scenario is far lighter than my Level-3 max-stress windows (Step 21: 7.6 KB fulls, 10.8 KB/s) - my own numbers are the ones I score.

## Step 23 - the guest's own swap selector under latency (done) - captures/gntcnet6-firstkey*.json, gntcnet6-firstkey-*.stdout.txt, gntcnet6-firstkey-*.png
Follow-up of the Step-10 observation (S, S moved the mark once). NEW `node tools/gntcnet6-firstkey.mjs --port 7847 [--gap ms] [--cond spec] [--enterAfter ms]` (host + Tank guest, own browsers / server; on the room-1 swap card the guest presses REAL keys; after each press the guest's mark is read from its sim card AND from the DOM tile labelled "replace"):

| guest link | press spacing | sequence S S S W Down Up from mark 2 (intended 3 0 1 0 1 0) | DOM mark after each press | final (intended 0) |
|---|---|---|---|---|
| N0 (none) | 450 / 250 / 200 ms | 3 0 1 0 1 0 (6/6 moved) | same | 0 |
| N0 | 120 ms | 3 3 1 0 0 1 (reads lag, no press lost) | same | settles correctly |
| N1 75+-10 ms, 10 % | 450 ms | 3 0 1 0 1 0 (6/6) | same | 0 |
| **N1** | **250 ms** | **2 3 3 0 2 1** (2 of 6 presses show no move) | **2 3 3 0 2 1** | **1** (two runs, identical) |
| **N2 125+-20 ms, 20 %** | **250 ms** | **2 3 3 0 2 1** | **2 3 3 0 2 1** | **1** |

| guest link | S then Enter after | mark / DOM at Enter | intended slot | slot the host REPLACED |
|---|---|---|---|---|
| N0 | 150 ms | 3 / 3 | 3 (Whirling Guard) | 3 - correct |
| **N1** | **150 ms** | **2 / 2** | 3 (Whirling Guard) | **2 - Ground Crack replaced instead** |
| N1 | 300 ms | 3 / 3 | 3 | 3 |

- The guest's Replaces mark is not predicted locally: after a W/S press the tile highlight does not move until the host's confirmation comes back (~0.3-0.4 s at N1), and every further press is computed from that stale replicated mark, so presses inside one round trip are lost (final mark off by one in 3/3 runs at N1 / N2, 0 at N0). Enter inside that window commits the OLD target: the owner's Shield Wall replaced Ground Crack although the player had moved the mark to Whirling Guard - an irreversible wrong swap on the full-slot reward the user asked for ("in multiplayer the character's owner decides"). Single-player / N0 controls are correct. PLAN GP.6 ("the Replaces selector cycles by W/S, wheel and D-pad") and the own-action feedback rule (G5b.12, "<= 1 rendered frame") are not met for this selector in multiplayer.

## Resume (2026-10-01, after the workflow pause)
- HEAD 885ad8a (docs-only commits since f91670d; `git diff f91670d HEAD -- src server` empty) -> the build under test is unchanged, v0.5.197; dist-cnet6/version.json still {0.5.197, index-OoO8EUa-.js}. The pre-pause processes (96028 / 85720) were gone (nothing listening on 7841 / 4328).
- Restarted MY processes: session server `node server/index.mjs --port 7841 --admin --static dist-cnet6` (listener PID 70224, /health protocol 4, build 0.5.197); preview `ECHOES_NET_PORT=7841 npx vite preview --outDir dist-cnet6 --port 4328 --strictPort` (listener PID 74556). Shared dev server 5199 untouched.
- Found an unrecorded in-flight step: tools/gntcnet6-desyncinject2.mjs -> captures/gntcnet6-desyncinject2.json = harness crash (`debugGuest()` returned null before the guest was a replica), no result. Redone as Step 24.

## Step 24 - desync DETECTION + REPAIR under injected corruption (B15) (done) - captures/gntcnet6-wirecorrupt.json, -wirecorrupt-combat.json (+ .stdout.txt), gntcnet6-desyncinject3.json / 4.json, gntcnet6-desyncsurf*.json
- Debug-API tampering cannot reach the decoder: `dec.viewOf(seq)` hands out copies (`same: false`, a write to it is not seen by the next `viewOf`), and corrupting the replica's applied / newest views (wallet +500, Healer x +3) is overwritten by the next snapshot (guest wallet 0 / 12 = host's on every poll, 0 desyncs) - captures/gntcnet6-desyncinject3.json / 4.json. `session.requestFull()` -> a full snapshot 406 ms later (fullRequests 1 -> 2).
- NEW `node tools/gntcnet6-wirecorrupt.mjs --port 7841 --tag combat`: the GUEST page's WebSocket is wrapped before boot so ONE byte (XOR 0x5a) of ONE incoming snapshot frame (type 1, 114-247 B) is flipped on demand, at 16 relative offsets 0.05-0.97; room 1 kept in combat by durable harmless mantises; host + 1 guest, no conditioner.

| outcome of a 1-byte flip in a live delta snapshot | trials | detection | repair |
|---|---|---|---|
| decoder rejects the frame (`decodeErrors` / dec `corrupt` +1) | 9 / 16 | <= 407 ms (first poll) | full snapshot re-sent (fullCount +1) <= 407 ms; next 8-9 hash checks clean |
| decodes to a WRONG state -> 30-tick state hash mismatch (`desyncs` +1) | 4 / 16 | 400-409 ms | full requested + applied <= 409 ms; next 8-9 hash checks clean |
| no effect seen (header / hot field overwritten by the next snapshot: offsets 6, 14, 192) | 3 / 16 | - | 0 hash mismatches in the next 8 checks |

- After 16 corruptions: desyncs 4, decodeErrors 9, fulls 14; the last 7 checks 0 mismatches; guest synced, 0 page errors on both pages. The earlier no-keeper run (captures/gntcnet6-wirecorrupt.json): 1 decode-corrupt + 1 hash desync, both repaired in <= 407 ms. **B15 met: a divergence is detected within one hash interval and repaired by a full state resend; none persisted.**

## Step 25 - spot re-checks after the resume (done) - captures/gntcnet6-firstkey-cond-enter150-resume.json / gntcnet6-firstkey-N1-enter150-resume.stdout.txt (pre-pause copy -prepause.json)
- `node tools/gntcnet6-firstkey.mjs --port 7847 --cond lat75,jit10,loss10 --enterAfter 150 --legs warm` (own child server, killed by the tool): the Tank guest on its full-slot swap card presses REAL S then Enter 150 ms later -> mark at Enter 2 / DOM tile 2 (intended 3); host card {replace: 2, decided: true, choice: take}; loadout before [heavy_slam, brutal_cleave, ground_crack, whirling_guard] -> after [heavy_slam, brutal_cleave, **shield_wall**, whirling_guard] = Ground Crack replaced although the player had moved the mark to Whirling Guard. **Identical to the pre-pause run** (2 of 2 runs at N1). 0 page errors.
- Frame re-read: captures/gntcnet6-mpwidth-shop-H-1024x576.png (session, host) - the purse plate reads "72 GLINT ·" and is cut at the window's right edge (x 1024); "ROOM 7 OF 8" is not visible; the plate sits outside the shop frame's right border. SP control captures/gntcnet6-mpwidth-sp-shop-H-1024x576.png: "72 GLINT · ROOM 7 OF 8" fully inside the frame. Tabs in the session carry the owner pills "you" / "Maximilian ..." / "Wren" / "AI".
- G5b.11 stale input from the host's own stats across every window I ran: staleRepeatTicksMax 4-8 (rtt 4 / 7 / 8 / 8, loss 5-8, soak 8 x4, hitch 8 x5; bar <= 8).

## Builder checkpoint claims, re-measured
- **fix-M5a-r5 NET5-F1** (owner labels over the names): HOLDS. Step 11: 0 owner x name pairs at 1024x640 / 1280x720 / 1600x900 / 1920x1080 on host and guest; the pills name the player ("you" / "Fox" / "Wren" / "AI"); the drop note "Wren lost connection - AI plays the Swordsman" has its own row, 0 pairs.
- **fix-M5a-r5 "regression green"**: DOES NOT HOLD for the shop. The in-flow owner pills from that fix (v0.5.182) widen the shop's tab row by ~214 px at 1024x640 (MP tab widths [171, 235, 226, 160] vs SP [138, 138, 164, 138]). The shop frame does not re-fit, so the purse / room plate leaves the window at 1024x576, 1024x640 and 1152x648 (Step 11). Their broadened probe audited text-on-text overlap only, never text outside the window.
- **fix-PARTY-r5 F4** ("nothing off-screen 1024x576-2560x1440" for the shop): HOLDS in single-player (gntcnet6-spshop-1024.png: 0 boxes outside). It does NOT hold in a session (Step 11), and their MP probe (gntfixPARTY5-mptabs) covered the party page only at 1280x720 / 1024x640 / 1600x900, not the shop at 1024x576.
- **fix-CAMPAIGN-r5 F3** (swap pick + Enter "every input path 100 %"): HOLDS in single-player and for a guest at N0 (Step 23: S + Enter after 150 ms replaced the chosen slot). FAILS for a guest at N1 / N2: presses inside one round trip are lost and Enter commits the stale target (Steps 23, 25).
- **build-PARTY GP.9**: HOLDS with 4 clients at N1 (Step 9, 20/20).
- **build-PARTY GP.10**: HOLDS. Builds are equal on 4 clients after every commit / buy / socket op / level transition, and a migration keeps all three ally builds (Steps 9, 13). L3 max-stress measures 10.79 / 18.85 KB/s with 1 guest and 8.5 / 17.0 with 3 at N1 (budget 12 / 24).
- **build-PARTY GP.4 net leg**:
  - HOLDS at N1: 36/36 casts host = guest, 0 snaps.
  - At N2, 3 snaps in 2 of 12 Swordsman casts in the loaded run, and 0 in 16 in the controlled re-run (Step 12).
- **G5a.5 netbench** (builder harness, run unmodified on my port): every verdict true (Step 22).

## PLAN gates, literally

| gate | result | evidence |
|---|---|---|
| G5a.1 | MET | own servers listen < 1 s, /health ok (protocol 4, build 0.5.197); 20 sequential + 8 simultaneous clients (Step 3) |
| G5a.2 | MET | create / join by code (lower-case too) / quick match / seat / ready / start; last-seat race 50/50 exactly one winner; every rejection explicit: seat_taken, not_host, not_ready, full, not_found, version_mismatch (Step 3) |
| G5a.3 | MET | live delta 0.03-0.07 of full in every window; protocol 72/72 incl. the full corpus + 10 000 fuzz pairs, 0 failures (Step 6) |
| G5a.4 | MET | latency 75.00 ms, jitter sigma 9.95, loss 10 % -> 10.20 %, 20 % -> 20.27 %, dup 1.034 %, reorder 1.98 %, GE burst 11.56 vs 11.43 %, outage (Step 6) |
| G5a.5 | MET | Step 22 |
| G5a.6 | MET | goldens 9/9; simtrace d1eff38b03f581aa / 554cd9c41db19975 (Step 6) |
| G5b.1 | MET | 2-4 clients; position path dev p95 <= 0.08 u; orientation p95 / max 0.29 deg; actions predicted = host 1929 / 1929; AI seats; drop-in (Steps 3, 4, 7, 19) |
| G5b.2 | MET (own move = SP parity) | N1: predErr p95 0.003-0.031 u, 0 correction snaps, remote party jumps > 0.3 u: 0. N2 / N3: p95 <= 0.082, max <= 0.42 u, hostile jumps > 0.6 u 0.01-0.2 % of frames, 0 desyncs, no reconnect. N4: 0 decode errors, 0 duplicated events (Step 7). Key -> first moved frame: guest {1: 4, 2: 4} vs SP {1: 2, 2: 6, 3: 1} (Step 19) |
| G5b.3 | MET | 98.0 % (N1) / 98.2 % (N2, 85 clamps) with the rewind vs 67.5 / 74.4 % without (Step 16) |
| G5b.4 | MET | Level 1 3.1-5.1 KB/s avg, p95 <= 13.1; Level 3 max-stress 10.79 / 18.85 KB/s (1 guest), 8.5 / 17.0 (3 guests) at N1; delta ratio <= 0.07 (Steps 4, 5, 7, 21) |
| G5b.5 | MET | 0 mismatches over 3 guests x 180 s x N1 / N2 / N3 / N4 = 7115 checks (Step 7) |
| G5b.6 | MET | guest resynced 2106-2314 ms after the link returned (reload 454-517 ms); host loss: grace 10 s, then migration at +0.39 / +0.47 s, state age 368 / 665 ms; server kill -> "Connection to the server was lost." at 15.13 s, then single-player works (Step 13) |
| G5b.7 | MET | same-tick interaction -> 1 activation (24/24 incl. 12 lagged trials); per-seat picks single; last seat 50/50; both pause menus open -> 60.28 / 59.92 ticks/s (Steps 3, 9, 15) |
| G5b.8 | MET | goldens 9/9; in-page 817f1e9940c91d76 with / without a server; campaign trace f1d0bd3db0ef5c8e identical after hosting (Steps 6, 18) |
| G5b.9 | PARTIAL (not provable here) | best controlled window hostNet p95 2.9-3.1 ms (bar 2), frameOver50Net 0-1 (bar 0); host 37-65 fps on a CPU at 100 % (Step 8) |
| G5b.10 | PARTIAL | key -> move parity with SP and the dodge predicted; >= 60 fps cannot be shown on this machine |
| G5b.11 | PARTIAL | staleRepeatTicksMax <= 8; guest away in 15 ms and back in 46 ms; hidden host 60.1 metronome ticks/s, but the guest-applied 2 s windows had mean 58.9 with 2 of 10 outside 60 +- 2 (Step 19) |
| G5b.12 | MET in function, literal 17 ms not met | own-action feedback p95 20-58 ms at 28-40 fps (1-2 rendered frames); 8/8 denials retracted 71-134 ms after the key (mispredictRetractMs p95 0.6); 0 doubled cues (Steps 4, 19) |
| G5b.13 | MET for what I re-ran | unreachable panel 4657 ms after the click (bar 5 s); Retry 4 ms; "That room is full." (Step 19). Change-server / LAN / https not re-run |
| G5b.14 | MET | replayedOnce true, 0 duplicates, simCalls 0, refusedEmits 0 on every guest over 180 s x 4 (Step 7) |
| GC.11 | MET | 8/8: L1 -> card -> L2 exactly once on both, guest 27 ms / 153 ms behind, layout / wallet / skills equal, 0 desyncs; host Quit to Lobby -> both camp (Step 17) |
| GD.2 / GD.4 / GD.9 | MET | zero-config 12/12; single-player opens 0 WebSockets (Steps 18, 19) |
| GP.4 net leg | MET at N1; N2 3 snaps in 2 of 28 Swordsman casts (advisory A-DASH) | Step 12 |
| **GP.6 (multiplayer)** | **NOT MET** | (a) the guest's Replaces selector drops presses inside one round trip, and Enter commits the stale target (Steps 23, 25); (b) the session shop clips "GLINT · ROOM 7 OF 8" outside the window at 1024x576 (Step 11) |
| GP.9 | MET | 20/20 (Step 9) |
| GP.10 | MET | Steps 9, 13, 21 |

## Benchmark scoring (Step 1 checklist, scored after the probes)

| # | score | evidence |
|---|---|---|
| B1 authoritative tick + redundant input | MET | INPUT packet carries 6 redundant frames, 28-43 B, 1.4-1.6 KB/s up. staleRepeatTicksMax <= 8. In the soaks, predicted / confirmed is 1929 / 1929 (Steps 6, 7) |
| B2 ~20 Hz snapshots, interpolation, bounded extrapolation | MET | 18.3-21.0 snaps/s (14.9-15.9 at 20 % loss); remote party jumps > 0.3 u: 0 in every window, max 0.24 u under burst loss (Steps 4, 5, 7) |
| B3 own-move prediction + smoothed reconciliation | MET (advisory A-DASH) | key -> move parity with SP; predErr p95 <= 0.08 u; 0 correction snaps in 12 x 180 s; 70 of 72 guest dashes clean, with 3 snaps in 2 N2 casts on a ~1 s late host (Steps 7, 12, 19) |
| B4 lag compensation | MET | 98.0 / 98.2 % with the rewind vs 67.5 / 74.4 % without (Step 16) |
| B5 truthful net_graph | MET | rttMs = server RTT within a few ms at 0-250 ms; quality chip + tooltip (ping, loss in / out) (Steps 4, 19). r5 A2 fixed |
| B6 timeout -> clear reason, usable menu | PARTIAL | reconnect banners in 5-99 ms; "Connection to the server was lost." at 15.13 s with a working title. But the old host barred by kill-host lands on a silent title (Step 13 E) |
| B7 delta vs the ACKED baseline | MET | baseline age p50 2-6 ticks; fulls only after burst outages / request (Steps 4, 7) |
| B8 unchanged ~0 B, delta <= 10-30 % | MET | 117-462 B vs 3.2-7.6 KB = 3-7 % |
| B9 loss absorbed without resync | MET | 20 % loss: 0 desyncs, 0 decode errors, baseline age max 9 ticks (Step 5) |
| B10 dup / reorder discarded | MET | 29-33 dups / 22-30 reorders per guest -> 0 decode errors, 0 duplicate events (Step 5) |
| B11 own-ability prediction + rollback, no double cue | MET | feedback p95 20-58 ms (1-2 frames); 8/8 denials retracted in 71-134 ms; 0 doubled (Step 19) |
| B12 input buffer robust to hitches | PARTIAL | guest hitches are absorbed in 0.7-2.2 s. A 1 s host hitch drains in 1.25 s (r5: 7.5 s), but a 2 s hitch still runs 1.8 s late and takes 3.5 s to drain (Step 20) |
| B13 favour-the-shooter with a cap | MET | 85 clamps at N2, still 98.2 % |
| B14 graceful degradation + quality indicator | MET | L20 / N2: own path dev p95 <= 0.07 u, 0 remote party jumps; the chip reads good / fair / poor in line with the link |
| B15 desync detected and repaired | MET | 16 injected byte flips: 9 decode rejects + 4 hash mismatches, each detected and full-resynced in <= 409 ms; 0 persisted (Step 24) |
| B16 host / code / quick play / roster | MET | Steps 3, 19 (stale lobby copy: advisory A-COPY) |
| B17 seats / ready / last slot / full | MET | 50/50 one winner; "That room is full." in 133 ms |
| B18 drop-in | MET | takes AI seat 2 in 1.3 ms (Step 3) |
| B19 guest drop -> rejoin with state | MET | resynced 2.1-2.3 s after the link returned; a reload rejoins in 0.45-0.52 s; builds equal (Step 13) |
| B20 host drop policy | MET | migration at grace + 0.4 s, state age <= 665 ms; a host reload resumes the run; second tab gets no offer (Steps 13, 14) |
| B21 pause never freezes online | MET | 60.28 / 59.92 ticks/s with both menus open (Step 15) |
| B22 synced shared moments, own reward pick, no silent picker | PARTIAL | transitions exactly once on every client; 30.00 s autopick, 30.00 s door, 15.00 s shop; only the owner decides a swap. But under latency the owner's Replaces choice is applied to the wrong slot (NET6-F1) |
| B23 builds replicated and kept across transitions | MET | equal on 4 clients after every commit / buy / socket op / L1 -> L2; kept through migration (Steps 9, 13) |
| B24 modest bandwidth + version check | MET | 3-11 KB/s down, 1.4-1.6 up; version_mismatch explicit (Steps 3, 21) |
| B25 MP overlay hygiene | PARTIAL | NET5-F1 is fixed and the drop note gets its own row. But the session shop pushes the purse / room plate out of the window at <= 1152 px wide (NET6-F2), and the lobby copy is stale |

Score: **21 met / 4 partial / 0 not met of 25**.

## Verdict
**FAIL - 2 must-fix.**

The replication core is strong this round. Every number below was re-measured on my own server and clients against v0.5.197:
- **Desync:** 0 over 3 guests x 180 s x N1-N4 (7115 hash checks), and 0 in every other window.
- **Delta size:** 3-7 % of a full snapshot.
- **Diagnostics:** the RTT readout now matches the link (the r5 A2 advisory is fixed).
- **Hit registration:** 98.0 / 98.2 % with the rewind vs 67.5 / 74.4 % without.
- **Desync repair:** 16 injected corruptions were each caught in <= 409 ms and repaired by a full resend; none persisted.
- **Drop-offs:** guest reconnect in 2.1-2.3 s; migration at grace + 0.4 s with state age <= 665 ms.
- **PARTY rules:** ownership, the 30 s deadlines and build replication hold with 4 clients.
- **Campaign MP:** 8/8.
- **Single-player:** bit-identical.
- **NET5-F1:** fixed.

Two multiplayer-only defects fail PLAN GP.6. Both sit on the build pages every co-op player uses between rooms.

### Must-fix
| id | title | evidence | reproduce |
|---|---|---|---|
| NET6-F1 | A guest's full-slot swap card ignores Replaces presses made within one round trip, and Enter then replaces the WRONG skill | Steps 23 and 25, captures/gntcnet6-firstkey-*.json / .stdout.txt. The guest's W/S marker is not predicted locally: it moves only when the host's echo returns, ~0.3-0.4 s at N1. Further presses are computed from that stale mark. At N1 / N2 with presses 250 ms apart, the sequence S S S W Down Up from mark 2 reads 2 3 3 0 2 1 (intended 3 0 1 0 1 0). 2 of 6 presses are lost, and the final mark is off by one in 3/3 runs. At N0 the same probe reads 6/6 correct. S then Enter 150 ms later at N1: the DOM mark at Enter is 2, and the host replaced slot 2. Ground Crack was swapped for Shield Wall although the player had moved the mark to Whirling Guard (slot 3). This reproduced in 2/2 runs, including one after the resume (gntcnet6-firstkey-cond-enter150-resume.json); at N0 slot 3 was replaced as intended. The result is an irreversible loss of a skill the player did not choose. It breaks the user's rule that "in multiplayer the character's owner decides", the PLAN §16.4 swap-card rule ("Enter / A commits the replacement just chosen"), GP.6 ("the Replaces selector cycles by W/S, wheel and D-pad") and the G5b.12 own-input feedback rule. | `node tools/gntcnet6-firstkey.mjs --port <free> --cond lat75,jit10,loss10 --enterAfter 150 --legs warm` (wrong slot), and `--cond lat75,jit10,loss10 --gap 250` (lost presses); control without `--cond` |
| NET6-F2 | The multiplayer shop pushes the purse / room plate ("72 GLINT · ROOM 7 OF 8") outside the window at 1024x576, 1024x640 and 1152x648 | Step 11 (captures/gntcnet6-mpwidth.json, frames gntcnet6-mpwidth-shop-H-1024x576.png / -1024x640.png / -M-*.png, gntcnet6-mpoverlap-shop-Fox-1024.png). Text boxes outside the window: host 3 at 1024x576 ("GLINT · ROOM" 959-1077 px, "7" 1084-1095, "OF 8" 1103-1141), 3 at 1024x640, 1 at 1152x648. The guest named "Maximilian Wolfe" also has 3 at 1024x576 / 1024x640. The frame reads "72 GLINT ·" cut at the edge. Single-player control at the same sizes: 0 (gntcnet6-mpwidth-sp.json, gntcnet6-spshop-1024.png "72 GLINT · ROOM 7 OF 8" inside). Cause, measured: the in-flow owner pills of the NET5-F1 fix widen the shop tab row (MP [171, 235, 226, 160] vs SP [138, 138, 164, 138] px) and the shop frame does not re-fit. This breaks GP.6 ("0 clipped text nodes" at 1024x576). The fix-M5a-r5 / fix-PARTY-r5 claims missed it because they audited overlap only, not off-window text, in a session. | `node tools/gntcnet6-mpwidth.mjs --port <free>` (host + "Maximilian Wolfe" + "Wren", shop + reward page at 1024x576 / 1024x640 / 1152x648 / 1280x720 / 1366x768), and the control `--sp 1` |

### Advisories
- **A1 Host stall recovery (reduced).** A 1 s host hitch now drains in 1.25 s (r5: 7.5 s). A 2 s hitch still peaks at 1.8 s of input lag and drains in 3.5 s at ~0.75-1x. PLAN §3.7 says presses are applied <= 250 ms late (Step 20).
- **A-DASH Fox Step snap at N2.** There were 3 out-and-back 3.0 u own-body snaps in 2 of 12 Swordsman casts. Both casts are the only ones in which the host executed the dash 0.9-1.1 s after the guest's predicted start. The instrumented re-run had 0 of 16. A 900 ms host freeze alone gives 0 snaps in 8/8 (Step 12). GP.4 asks for 0 snaps at N2.
- **A3 Silent title for a barred host.** The old host barred by an admin kill-host lands on a plain title with no message (Step 13 E; r3-r5).
- **A4 Dropped lobby member blocks Start.** Start says "Every player must be ready first." for ~15 s while a dead member's seat is held. The copy names nobody and blames readiness (Step 20; r3-r5).
- **A5 Hidden host mid-game.** The guest-applied rate has mean 58.9 ticks/s with 2 of 10 two-second windows outside 60 +- 2 (r5: 57.5, 3/10). G5b.11 is literally partial (Step 19).
- **A9 Literal fps / latency bars.** These bars cannot be shown on this shared machine: the CPU was at 100 % with 40 Chrome processes from other agents.
  - G5b.9: best window hostNet p95 2.9-3.1 ms (bar 2), frameOver50Net 0-1 (bar 0).
  - G5b.10: >= 60 fps.
  - G5b.12: 17 ms. Feedback p95 is 20-58 ms at 28-40 fps.
- **A10 E targets a used Dewfont.** Next to a fresh Dewfont, E still targets the older used one: in 6 of 12 lagged trials both presses were denied (Step 15; r4-r5).
- **A-COPY Stale lobby text.** The SHARE panel says "The host plays the Healer and makes the build choices between rooms; everyone else plays an ally." Since PARTY, each human builds their own character (frame gntcnet6-ui-lobby-guest.png).
- **A-N3 Burst bandwidth.** Under N3 burst loss the 1 s download maximum reached 24.6-49.1 KB, with 3-8 full snapshots re-sent per guest after outages. The p95 of 12.0-13.1 KB/s is within budget (Step 7).

### Processes
- Pre-pause: session server PID 96028 and preview PID 85720 were already gone at the resume.
- After the resume I started the session server, listener PID 70224 (:7841), and the vite preview, listener PID 74556 (:4328). I stopped both at the end, and nothing is listening on 7841-7849 / 4328.
- Child servers 7842-7849 were started and stopped by their tools.
- No node process running a gntcnet6 tool remains.
- The shared dev server 5199 was never touched.
