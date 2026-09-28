STATUS: PARTIAL
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
