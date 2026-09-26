STATUS: COMPLETE
VERDICT: FAIL — 2 must-fix (NET3-F1 old host that accepts Rejoin after a host migration controls a Healer that never moves; NET3-F2 own dodge snaps 1.1-1.8 u on 25 % of dodges at 150 ms RTT, Archer 50 %, predErrMax 1.04-1.58 u > the G5b.2 1.0 u cap) + 8 advisories; everything else re-measured and met (lobby/race 50/50, delta 0.05-0.08, 7.5-8.3 KB/s, 0 desyncs over 4 x 180 s x 3 guests, hit-reg 98 % with rewind vs 52-76 % without, reconnect 1.0-1.4 s, migration 0.24-0.40 s after grace, campaign MP 8/8, SP bit-identical). Benchmark 22/25 met, 3 partial.

Started 2026-09-26. Steps are appended below as they complete.

## Step 1 — Blind benchmark checklist (written BEFORE inspecting any Echoes capture)

Systems: Valve Source multiplayer model (Bernier 2001 / VDC "Source Multiplayer Networking"), Quake 3 net code (Carmack snapshot/delta vs acked baseline), Overwatch netcode (GDC 2017 Ford "Overwatch Gameplay Architecture and Netcode"), co-op roguelike lobbies (Risk of Rain 2, Gunfire Reborn).

| # | Benchmark item (how the shipped systems behave) | Testable form for Echoes |
|---|---|---|
| B1 | Authoritative server/host sends world snapshots at a fixed rate (Source default 20-66 Hz tickrate, cl_updaterate 20+); clients never trust other clients' state | Measure snapshot rate on the wire per client (Hz) and that guests cannot write authoritative state |
| B2 | Snapshots delta-compressed against the LAST ACKNOWLEDGED baseline (Q3 `deltaNum`), full snapshot only when no baseline acked; lost packets never corrupt state because the next delta is from an older acked baseline | Delta bytes vs full bytes ratio; under 20% loss the guest still converges (no permanent divergence) |
| B3 | Unchanged fields/entities cost ~0 bytes (Q3 field bitmask; Source SendTable change detection) | Idle-room snapshot bytes << busy-room bytes |
| B4 | Bandwidth budget per client small and bounded (Source default rate 30-80 KB/s; Q3 ~ a few KB/s for 4 players) | Measure bytes/s down per client with 4 players in combat; must be bounded and not grow over time |
| B5 | Entity interpolation: remote entities rendered ~100 ms (cl_interp) in the past between two snapshots, so remote motion is smooth even at 20 Hz; extrapolation limited (<= 250 ms) when snapshots stop | Remote-avatar motion jerk/teleports at 50/150/250 ms RTT with jitter: no visible stepping; bounded extrapolation on stall |
| B6 | Client-side prediction of the LOCAL player (input applied immediately, zero perceived input latency) | Local avatar moves on the same frame input is pressed regardless of RTT |
| B7 | Server reconciliation: client replays unacked inputs on top of authoritative state; prediction error small and corrected smoothly (error decay, not snap) | Measure per-tick prediction error (world units) and max correction per frame at 50/150/250 ms RTT |
| B8 | Lag compensation (Source "rewind"): server rewinds other entities to the shooter's view time (RTT + interp) to test hits, capped (sv_maxunlag 1 s) | A hit that is valid on the client's screen at 150-250 ms RTT registers on the host; a hit beyond the cap does not |
| B9 | Overwatch: favor-the-shooter with limits; high-ping clients lose the favour (rewind cap), and "movement abilities" of the victim can escape — cap exists and is documented | Rewind window cap measured/documented; behaviour beyond cap |
| B10 | Robust to packet loss: redundant input sending (Overwatch sends each input redundantly in several packets; Q3 resends unacked commands in every usercmd packet) so 5-20% loss causes no lost actions | At 5/10/20% loss, zero lost guest actions (casts/interacts) and position still converges |
| B11 | Duplicate / out-of-order packets ignored by sequence number (Q3 sequence, Source netchannel) | Duplication + reordering: no double-applied actions, no rollback to stale state |
| B12 | Timeouts: connection problem indicator after ~1-3 s of silence (Source "Connection problem, auto-disconnect in N s"), disconnect after a documented timeout (cl_timeout 30 s) | Guest UI shows a "connection problem" indicator on stall; disconnect message on timeout |
| B13 | Reconnect: a dropped player can reconnect into the same session and receive a full snapshot (full-state resync), state restored (RoR2 allows rejoin into lobby; Gunfire Reborn rejoin) | Guest drop + reconnect mid-room restores seat, hero, HP, build |
| B14 | Host drop policy (P2P co-op): RoR2/Gunfire Reborn — host leaving ends the session for everyone with a clear message and players returned to menu/lobby (no host migration); some games migrate host | Host drop: guests get a clear message + clean return (or a real migration), never a frozen world |
| B15 | Server kill: all clients get a clear "Disconnected" message within a few seconds and return to a usable menu; local game does not crash | Kill server process: clients reach a usable screen, no page error |
| B16 | Lobby: create a private lobby with a shareable code, join by code, quick-play/matchmaking into an open public lobby, visible seat/slot list with player names and ready state, host starts when ready (RoR2 lobby: 4 slots, ready-up, host starts; Gunfire Reborn: room code) | All five lobby operations measured end-to-end with latency |
| B17 | Lobby full handling: joining a full lobby is refused with a clear message; last-seat race resolves to exactly one winner | Two clients joining the last seat simultaneously: exactly one seated, the other gets "lobby full" |
| B18 | Shared-object interaction arbitration: server decides who got the item/chest (RoR2 chests: one opener; shared interactables are server-authoritative) | Two clients using one object in the same tick: exactly one effect |
| B19 | Co-op pause: online games do NOT freeze the shared sim on one player's pause (RoR2 pause menu does not pause multiplayer); or host-only pause documented | Host and guest pausing at once: no deadlock, sim continuity as documented |
| B20 | Simultaneous per-player choices (RoR2 item pickups / Gunfire Reborn per-player scroll choices): each player's pick applied once, independently | Simultaneous draft picks: each applied exactly once, no lost or duplicated pick |
| B21 | Determinism/desync detection: lockstep-style titles hash state and flag desync; snapshot titles converge by construction | >= 3 min of 2-4 client play with no divergence beyond tolerance and no desync flag |
| B22 | Netgraph / diagnostics (Source net_graph: ping, loss, choke, in/out bytes) | A visible ping/loss indicator for players and a debug API exposing RTT/loss/bytes |
| B23 | Single-player path does not go through the network and is unaffected (Source listen server with maxplayers 1 still deterministic for demos) | Same seed with no server -> identical event sequence to pre-net baseline |
| B24 | Network failure never crashes the game loop (no uncaught exceptions; local frame rate holds) | No page errors in any probe; client fps under loss within budget |
| B25 | Server hardening: malformed/oversized messages rejected without crashing the server; rate limiting | Send garbage frames/oversized JSON; server stays up and other rooms unaffected |

## Step 2 — Own infrastructure (DONE)
- HEAD 027850e, v0.5.94, working tree has no src/server changes (git status: only untracked docs/tools/captures).
- Production build `npx vite build --outDir dist-cnet3` (built 646 ms); preview `npx vite preview --outDir dist-cnet3 --port 4328 --strictPort` = PID 69528.
- Session server `node server/index.mjs --port 7841 --admin --log` = PID 76700; ready line printed; `/health` {"ok":true,"protocol":2,...} at 7 s uptime. Child servers for kill/LAN tests will use 7842-7849.
- Harness rule adopted from r1 advisory 9: every client is its OWN browser process (own temp profile), so localStorage (session tokens, rejoin) is per client.

## Step 3 — Single-player isolation, Node (DONE)
- `node tools/gntM2-goldens.mjs` (builder harness, re-run by me): G2.10 ok, 9/9 match (kill_all 1/2/3 f254f4b09d29c9d1 / 30feae84f2f09445 / 51350d4bac767b3a; defend cfe0bddd3d904164 / 10ac7c2be3dac6bf / 8cfac9303d522607; run 8402e18042f82aa4 / 342b9c8e1a3ec667 / 12343b91a7b23b9e).
- Independent: `node tools/gnt-arch-simtrace.mjs --mode kill_all --ticks 3600 --seed 7` (default script 3) -> eventsHash d1eff38b03f581aa (759 events) = PLAN §6.5 v0.5.0 reference; defend seed 7 -> 554cd9c41db19975 = reference. In-page (browser, after an MP session) leg follows in a later step.

## Step 4 — Harness written (DONE)
tools/gntcnet3-lib.mjs (own browser per client, admin API, child servers), gntcnet3-session-lib.mjs (session forming, CDP WebSocket wire tap), gntcnet3-probes.mjs (rAF samplers of the guest's rendered own pose + rendered hostiles and the host's authoritative seats; real-key driver; wire parser of SNAP headers [u8 ch, u8 seat, u32 tick, u32 seq, u32 baselineSeq]; path deviation / rest error / keydown-to-move / hostile per-frame jumps), gntcnet3-sweep.mjs (per-condition windows). Scouting (gntcnet3-scout*.mjs): wire in combat room 1 N0 = SNAP 99 frames / 5 s (19.8 Hz), 87-163 B deltas; EVENTS 3 + EVENTS_U 7 each 99/5 s; INPUT out 299/5 s (60 Hz, 20-24 B).

## Step 5 — Lobby / matchmaking / last-seat race / hardening by raw Node WebSockets (DONE)
`node tools/gntcnet3-lobby.mjs --port 7842 --trials 50` (own child server, ready 1 line; captures/gntcnet3-lobby.json) -> **21/21 PASS**.
| probe | result |
|---|---|
| socket open x20 | p50 7.0 ms, max 39.3 ms; hello->welcome p50 1.46 / max 8.6 ms |
| create private | code JZ5E8 (5 chars, alphabet), 3.1 ms |
| join by code | seat 1 in 2.2 ms; host gets peer_joined; lower-case code accepted |
| seat select | taken seat -> error seat_taken; free seat 3 granted |
| start | guest start -> error not_host; unready -> error not_ready; ready -> game_starting 4.7 ms (countdown 1500) -> in_game at 1591 ms |
| drop-in | join of an in_game room takes AI seat 2 in 1.5 ms |
| rejections | 5th join -> full; ZZZZZ -> not_found; "x" -> not_found; build 0.0.1 -> join_rejected version_mismatch; protocol 999 -> error version_mismatch + close 4001 |
| last-seat race | 50/50 trials exactly one room_state + one join_rejected{full}, 0 doubled seats |
| quick match | joins the open public room in 1.97 ms; 8 simultaneous -> rooms [2,3] / [0,1,2,3] / [0,1], 0 doubled; alone -> room_state + match_status(queued, waited 0, open 0) |
| hardening | garbage text + injection object + binary from a non-member + 3 MB frame: offender closed 1009 "frame too large", /health ok, the other room's sockets untouched, new client welcomed |
| server kill | both sockets closed 1006 in 9.2 ms |

## Step 6 — Condition sweep A: RTT 50/150/250 with jitter, loss 5/10/20 %, dup+reorder, burst (DONE, raw analysis pending)
`node tools/gntcnet3-sweep.mjs --guests 2 --conds N0,C50,C150,C250,L5,L10,L20,DR,BURST --seconds 35 --settle 6 --tag sweepA` (host page + 2 guest pages, own browsers, 960x540, real WASD/Space/1-2/right-mouse on both guests, host on autopilot through L1 rooms 1-8 -> L2 rooms 1-5; captures/gntcnet3-sweepA.json, frames gntcnet3-sweepA-<cond>-guest.png; report `node tools/gntcnet3-report-sweep.mjs captures/gntcnet3-sweepA.json`). Wire numbers are from the CDP WebSocket tap (independent of net.stats); prediction numbers from the rendered own pose vs the host's authoritative seat.
| cond (guest link, both dirs) | RTT meas. | snaps/s | wire loss % (server applied down) | dup/reo seen | delta avg B | full B | delta/full | in KB/s avg / p95 (1 s) | pathDev p95 / max u | rest err p95 u | corr frames >0.1 u | key->move frames | desync |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| N0 | 16-17 | 19.4 | 0 | 0/0 | 176 | 3728 | 0.05 | 6.8 / 10.6-11.5 | 0.01-0.02 / 0.06-0.81 | 0.01 | 1-2 (0.35-0.47 u) | 1-2 (p50 22-25 ms) | 0/89 |
| C50 lat25 jit5 | 61-64 | 19.5 | 0 | 0/1 | 221 | 3875-3994 | 0.06 | 7.9 / 11.6-12.1 | 0.01-0.02 / 0.03-0.08 | 0.01 | 0 | 1-2 | 0/177 |
| C150 lat75 jit15 | 208-221 | 18.4 | 0 | 0/42-47 | 319-321 | 4420 | 0.07 | 9.2 / 15.1 (seat 1); **13.1 / 59.7** (seat 2: 31 natural FULL snapshots after a 3.17 s guest frame stall) | 0.02-0.07 / 0.54-1.73 | 0.01-0.81 | 2-7 | 1-2 (one 2249 ms during the stall) | 0/261 |
| C250 lat125 jit25 | 262-304 | 19.5 | 0 | 0/81-84 | 363 | 4750-4810 | 0.08 | 10.6 / 16.2-16.8 | 0.03-0.06 / 0.11-0.17 | 0.01 | 0 | 1-2 | 0/350 |
| L5 | 122-140 | 18.4-18.6 | 5.5-6.8 (3.6-4.2) | 0/11-14 | 333-345 | 5178-5238 | 0.06-0.07 | 11.2-11.5 / 17.6-18.1 | 0.02-0.05 / 0.07-0.53 | 0.01 | 0-6 | 1-2 | 0/435 |
| L10 | 114-120 | 17.5-17.7 | 9.7-10.9 (6.3-6.8) | 0/0-1 | 296-300 | 5881-6053 | 0.05 | 9.5-9.6 / 15.6-16.1 | 0.03-0.04 / 0.16-0.37 | 0.01 | 0 | 1-2 (one 7) | 0/516 |
| L20 | 117-135 | 15.2-16.2 | 17.5-22.4 (12.7-14.3) | 0/0 | 335-341 | 5624 | 0.06 | 9.4-9.7 / 16.2-18.7 | 0.02-0.10 / 0.13-0.15 | 0.01-0.24 | 0 | 1-2 | 0/586 |
| DR dup5 reo10 | 144-150 | 20.4-20.5 | 0 | 29-33 / 21-30 (server 78 dup, 146-158 reo) | 401-413 | 5898 | 0.07 | 14.7-15.0 / 26.2-26.7 | 0.01-0.04 / 0.04-0.22 | 0.01 | 0 | 1-2 | 0/675 |
| BURST GE .05/.3/.8 lat75 | 169-176 | 17.5-17.6 | 10.4-10.8 (6.5-7.8) | 0/0 | 407-431 | 6522-6643 | 0.06 | 11.2-11.8 / 22.9-26.2 | 0.02-0.29 / 0.27-**4.61** | **0.42-3.71** | 0-5 | 1-2 | 0/759 |
Net stats cross-check: guest lossPct (in/out) tracks the wire (L10 10.2/6, L20 17.9-19.6/19-22), quality chip poor at L10+/C250, desyncs 0 everywhere, decodeErrors 0, eventDuplicates 0, replayedOnce true, simCalls 0, refusedEmits 0, predicted = confirmed actions in every window (retractions 0). Host net ms p95 2.3-4.7 (9.0 in the C150 hitch window), frameOver50Net 0-7. 0 page errors.
Open items from this sweep: (a) BURST rest error 3.71 u / path deviation 4.61 u and C150 1.73 u — raw re-run needed; (b) bandwidth p95 above the §3.7 24 KB/s p95 budget at DR and BURST (26.2-26.7 KB/s) and avg 14.7-15.0 KB/s at DR (> 12 KB/s) — PLAN budget applies at N1-N3, re-measure at N-conditions; (c) guest frame stalls 1.6-3.2 s at C150 on both guests + host.

## Step 7 — Raw analysis of the large own-path deviations (DONE)
`node tools/gntcnet3-sweep.mjs --guests 2 --conds BURST,N3 --seconds 45 --tag burstraw --raw 1` then `node tools/gntcnet3-rawdev.mjs captures/gntcnet3-burstraw-N3-raw0.json 0.5` and `node tools/gntcnet3-lag.mjs <raw files>` (new metric: per 2 s window, the time offset L that best maps the guest's rendered own path onto the host's authoritative seat path — the host's execution lag of that guest's inputs).
- The 3.04 u "deviation" in N3 is NOT a shape error: the host's seat path equals the guest's predicted path shifted by ~1.5 s (host (-5.76,4.57) at t+42008 = guest (-5.76,4.57) at t+40519).
- Cause in the same raw: the HOST page froze for **3066 ms** (ticks 6028 -> 6043, i.e. only 15 ticks in 3 s — sim time dropped, not caught up). After it, both guests' inputs were executed **2048 / 1624 ms late**, decaying over ~3 s (series ... 136, 2048, 2024, 856, 144 and ... 128, 1624, 1344, 256, 256). Normal windows: lag p50 112-120 ms at 150 ms RTT, 152-168 ms at 250 ms RTT (= one-way + ~2-tick buffer).
- Host tick rate under this 3-browser load: 54-60 ticks/s per second-bucket (never catches up) — the shared sim runs slow for everyone when the host renders < 60 fps.
- Multi-second page freezes seen so far: host 3066 ms (N3), guest 3170 ms + host-side 1663 ms (sweep A C150), guests 2132 / 1680 ms (first RTT run). A same-machine single-player CONTROL page is now added to every soak window to separate environment stalls from net-induced ones.

## Step 8 — Further tools written (runs pending, in order): gntcnet3-soak (sweep --guests 3 --conds N1,N2,N3,N4 --seconds 180 --control 1, running), gntcnet3-races.mjs, gntcnet3-drops.mjs (child 7843), gntcnet3-hitreg.mjs, gntcnet3-campaign.mjs (child 7844), gntcnet3-sp.mjs (child 7845), gntcnet3-ui.mjs (child 7849).

## Step 9 — 4-client soaks, 180 s each at PLAN N1/N2/N3/N4 + same-machine SP control page (DONE)
`node tools/gntcnet3-sweep.mjs --guests 3 --conds N1,N2,N3,N4 --seconds 180 --settle 6 --tag soak --control 1` (host + 3 guest pages = Tank/Swordsman/Archer, each its own browser, real keys on all 3 guests, host autopilot L1 rooms 1 -> 8; a 5th browser runs single-player as a control; ~30 fps per page under this load). captures/gntcnet3-soak.json, frames gntcnet3-soak-N*-guest.png.
| | N1 150 ms ±10, 10 % | N2 250 ms ±20, 20 % | N3 GE burst @150 | N4 dup 1 % reo 2 % @100 |
|---|---|---|---|---|
| hash checks / desyncs (3 guests) | 344/339/345, **0** | 648/648/646, **0** | 981/992/988, **0** | 1367/1381/1380, **0** |
| wire loss % / snaps/s | 10.1-10.9 / 17.4-17.5 | 19.6-21.5 / 15.6-16.0 | 12.0-12.8 / 17.3-17.4 | 0 (dups 30-39, reo 21-26 seen) / 20.1-20.2 |
| guest lossPct in/out (chip) | 3-11 / 7-12 (poor) | 12-21 / 19-22 (poor) | 9-17 / 13-20 (poor) | 0 / 0 (good) |
| delta avg B / full B / ratio | 272-277 / 4422-4437 / 0.06 | 333-335 / 4810-4817 / 0.07 | 293-295 / 4867 / 0.06 | 225-226 / 4751-4810 / 0.05 |
| down KB/s avg / p95 (1 s) | 7.7-8.3 / 12.5-14.0 (max 61.9-67.2 in the stall second) | 7.8-8.0 / 13.6-14.7 | 7.9-8.1 / 13.8-15.0 | 7.5-7.6 / 12.1-12.3 |
| up KB/s | 1.45 | 1.54-1.55 | 1.61-1.62 | 1.60-1.61 |
| host out KB/s (3 guests) | 22.6 | 25.7 | 23.7 | 19.2 |
| predErr p95 / max u (net.stats) | 0.037-0.085 / 0.49-1.09 | 0.036-0.089 / 0.24-1.04 | 0.035-0.083 / 0.17-1.18 | 0.032-0.082 / 0.24-0.84 |
| own snaps (correctionSnaps) seat1/2/3 | 0 / 1 / 11 | 0 / 10 / 16 | 0 / 2 / 8 | 0 / 0 / 4 |
| own path dev p95 (mine) | 0.05-0.11 | 0.07-0.12 | 0.02-0.07 | 0.02-0.06 |
| input exec lag p50 / p95 / max ms (mine) | 96-112 / 176-200 / **1688-2928** | 144-152 / 184-200 / 200-344 | 96-120 / 128-152 / 160-176 | 72-96 / 104-120 / 168-216 |
| key->first moved frame (hist) | 1: 12-20, 2: 29-32 | 1: 18-21, 2: 25-31 | 1: 19-24, 2: 23-31 | 1: 16-20, 2: 28-32 |
| own-action feedback ms p95 (max) | 23.5-25.8 (87.6) | 23.3-27.4 (72.8) | 19.9-22.2 (55.3) | 19.4-22.1 (30.5) |
| predicted / confirmed / retracted | 68/67/1, 66/66/0, 63/63/0 | 136/135/1, 132/132/0, 127/126/1 | 206/205/1, 198/198/0, 191/190/1 | 276/275/1, 264/264/0, 255/253/2 |
| events replayed / late / dup / replayedOnce | 2558-2574 / 17-50 / 0 / true | 4983-5015 / 105-153 / 0 / true | 7712-7735 / 182-223 / 0 / true | 10266-10401 / 182-241 / 0 / true |
| host net ms p50/p95, frameOver50Net | 2.0 / **6.7**, 31 | 1.8 / **4.8**, 19 | 1.4 / **3.1**, 3 | 1.9 / **6.9**, 11 |
| host ticks/s | 58.5 | 59.6 | 59.5 | 59.9 |
| SP control frames > 150 ms (max) | 6 (**2800 ms**) | 4 (267) | 2 (236) | 0 (127) |
simCalls 0 and refusedEmits 0 on every guest; 0 page errors on all 5 pages.
Attribution: the N1 multi-second freeze hit ALL five browsers at once (control 2800 ms, host 2733, guests 2977/3038/2775) = machine-wide environment stall, not net. BUT its aftermath is net: for 3-6 s after it, seats 1 and 2 had their inputs executed **1.7-2.9 s late** by the host (over500 windows 3 and 6), and 29-30 natural FULL snapshots were sent to each (61-67 KB in one second).
Own-body snaps concentrate on seats 2 (Swordsman) and 3 (Archer): 10-16 per 3 min at N2 with no stall in the window (Tank 0) -> suspect unpredicted kit movement; probe follows.

## Step 10 — Race conditions in a live session (DONE)
`node tools/gntcnet3-races.mjs --port 7841` (host + guest pages, real keys) -> 10/10 (captures/gntcnet3-races.json, gntcnet3-races-*.png). First run 9/10 was my setup error (new Dewfont spawned on top of the used one; both presses targeted the used font -> both `interact_denied`), fixed by walking the guest between trials.
- Same-moment E on one Dewfont (both bodies at 50 % HP, both within 1.1 u): trial 0 `interact@669 by 0` + `dewfont_drink@669 by 0` + `interact_denied@681 (used) by 1`; trial 1 drink@947 by 0 + denied@950 (used) by 1 -> exactly one activation, the loser gets an explicit reason. (Bell spawned by cmd stays `dormant` in this room: no activation for either press — not a race result.)
- Host + guest Esc at once: both pause menus open; host 59.98-60.13 ticks/s, guest applied ticks 59.8-60.7/s while both menus are up; both resume with Esc (stack []). Host menu: "Online — the game keeps running", Quit to Lobby, Leave Session; guest menu: Save Game "Only the host can save an online session", Leave Session, no Quit to Lobby.
- Simultaneous Enter on the draft: host `skill_equip` + `draft_taken` once (@2534), guest `rejectedPicks` +1, both on the path page, guest skills == host skills. Guest 60 ms before host: same (draft_taken once @3641, guest refused).
- Last seat: 50/50 in step 5 (raw sockets, same event-loop turn).

## Step 11 — Connection drop-offs (DONE)
`node tools/gntcnet3-drops.mjs --port 7843 --legs A,B` / `--legs C,D,E,F` / `--port 7846|7847 --legs G[,F]` (host + 2 guest pages, own browsers, own child servers; durable harmless enemy keeps the room in combat) and `node tools/gntcnet3-killsp.mjs` (child 7848). captures/gntcnet3-drops.json (last run = leg G), gntcnet3-drops-*.png, gntcnet3-killsp.json + gntcnet3-killsp-*.png. Harness corrections made along the way (not game defects): reload must go to the plain URL (menu-skip boots skip the title), the title needs a key press first, the reward page freezes movement (combat keeper added), busCounters is a property.
| leg | result |
|---|---|
| A guest socket close 4 s | seat held/AI in 55-67 ms; other guest told in 67-92 ms; own banner 85-99 ms; resynced **1045-1369 ms** after the link returned; phase/room/level/wallet/skills equal, own pos err 0-0.01 u, HP equal; walk by keys +1.89-2.10 u; desyncs 0 — PASS |
| B guest blackhole 7 s | dropped to AI at 5210-5330 ms (5 s silence rule); banner 26-29 ms; resynced 1217-1304 ms after restore; state equal; control +1.68 u; desyncs 0 — PASS |
| C guest page reload (plain URL, own profile) | title shows "Rejoin 37XVH?" (rejoinInfo seat 1, age 23.7 s); Rejoin -> synced in **306 ms**, seat 1, state equal, walk +1.5 u — PASS |
| D host blackhole 5 s | guests frozen at 3144-3167 ms with "Host connection lost — waiting (10 s) If the host does not come back, another player takes over…"; resumed after restore; host kept its role; migrations 0 — PASS |
| E admin kill-host | guests told at 29-44 ms; migration at **10235 ms** (grace 10 s + 0.24 s), keyframe state age 1277 ms applied in 7 ms; new host 57.2 ticks/s; other guest synced, 0 desyncs; run continued (leader bot took the draft). The barred OLD host lands on a plain title with NO message (gntcnet3-drops-E-oldhost.png) — same as r1 advisory 4 |
| G host socket closed + refused 18 s (realistic host loss > grace) | guests frozen at 72-104 ms with a live countdown (remainingMs 9985 -> 820); migration at **10238-10404 ms**, keyframe age 284-379 ms, applied in 7-12 ms; "DGuestA is now hosting"; other guest synced, 0 desyncs — PASS. Old host: "Connection lost — reconnecting (15 s)" at 108-125 ms, then the title with "Rejoin XXXXX? Your Healer seat is held for a minute" -> Rejoin -> guest in **seat 0 (Healer)** in 146-172 ms, synced, new host lists it human (humanSeats [2,0], seat_control@2567) — **but the Healer cannot move: KeyD held 2 s and KeyA held 2 s (after a canvas click) -> 0.00 u on the new host AND 0.00 u on its own predicted pose; every sent input frame has move 0 (aim changes)** (captures/gntcnet3-drops.json data.G_rejoin, gntcnet3-drops-G-oldhost-rejoined.png). The Healer is frozen: no bot, no human. |
| F / killsp server kill | reconnect banner at 2-86 ms; "Connection to the server was lost." on every in-session client at **15.07-15.22 s**; the title simultaneously shows a modal "Rejoin 3GR2C? Your Tank seat is held for a minute…" although the server is dead (gntcnet3-killsp-guest-msg.png); Rejoin -> "Couldn't rejoin 3GR2C — unreachable" after 2.1 s (no hang); Not now -> New Game -> camp, 60 ticks/s, walked +2.2 u, not a replica — PASS with a copy advisory |
0 page errors on every page in every leg.

## Step 12 — Hit registration under lag, host rewind ON vs OFF (DONE)
`node tools/gntcnet3-hitreg.mjs --port 7841 --conds N0,N1,N2,C250 --seconds 60 --reach 0.70 --half 35` (guest = Swordsman seat 2, melee_arc basic reach 0.75 / half-angle 40 per the host's own ally_basic payload; the guest HOLDS the real right mouse button, chases the nearest hostile it SEES with real WASD and steers the real mouse by closed-loop aim (screen<->world homography from 25 calibration points, max err 0.11-0.14 u); every predicted own swing logs what that frame rendered; the host's ally_basic {seat, inputSeq, targets[]} decides registration; durable moving mantis targets). Valid-on-screen = rendered distance <= 0.70 u (0.05 u inside the reach) and angle <= 35 deg. Calibration run at N0: registered max distance 0.76 u, max angle 8.8 deg. captures/gntcnet3-hitreg.json.
| cond | RTT ms | swings (pred = host) | valid on screen | registered WITH rewind | WITHOUT rewind | rewind clamped |
|---|---|---|---|---|---|---|
| N0 | 2-20 | 171 / 166 | 201 / 214 | **99.0 %** (199) | 86.9 % (186) | 2 |
| N1 150±10, 10 % | 161-162 | 171 / 173 | 167 / 166 | **98.2 %** (164) | 51.8 % (86) | 6 |
| N2 250±20, 20 % | 268-274 | 172 / 172 | 217 / 198 | **98.2 %** (213) | 76.3 % (151) | 98 |
| C250 250±25 | 268-294 | 172 / 173 | 163 / 209 | **97.6 %** (159) | 73.2 % (153) | 71 |
G5b.3 (>= 95 % at N1, >= 85 % at N2, visible drop without rewind) MET with margin; every predicted swing had its authoritative twin (pred = host counts). 0 page errors.

## Step 13 — Linear campaign in multiplayer (DONE)
`node tools/gntcnet3-campaign.mjs --port 7844` (host + guest pages, own browsers, fresh profiles = only Level 1 unlocked) -> **8/8** (captures/gntcnet3-campaign.json, gntcnet3-campaign-*.png). First run 5/7 were harness faults (state().scene is 'camp' during runs — switched to vfx.mode; my second click hit the pause item instead of the dialog's #ap-confirm-* button; busCounters is a property).
- Camp: guest `campChoose 3/2` -> {ok:false, reason:'locked', line:'Clear The Sunken Mill to unlock'}, `startCampaign {level:3}` / `{level:1}` -> false, `campaignAdvance` / `abandonRun` -> null, `campaign.choose(3)` locked; host unchanged (camp, inactive); host `campChoose 3` refused (locked).
- Host walks into the portal + E -> Level 1; guest in L1 combat 145-199 ms later, same layout (2).
- L1 Stag clear: host and guest each see level_clear@934, level_transit@934, level_start@1114 exactly once; guest card within 46 ms ("LEVEL I CLEARED … NEXT Level II · The Sunken Mill … The Healer carries · Mending Bolt · Swift Mend … Preparing The Sunken Mill… The Healer leads on…"); guest level_ready reported 1.2 s after the card; auto-advance at 3.0 s; guest entered L2 162 ms after the host; 0 camp frames (vfx.mode) on the guest across the transition; layout 5 = 5, wallet 84 = 84, skills equal, desyncs 0/30.
- Guest pause: Leave Session, "Only the host can save an online session", no Quit to Lobby. Host Quit to Lobby (real mouse, confirmed via the dialog) -> host camp in 21 ms, guest camp in 194 ms, guest still `guest` + synced.
- Party wipe -> guest shows the defeat card -> both in camp (2-6 ms after the host's Enter). Level-3 harness start -> Stag cleared -> guest shows CAMPAIGN COMPLETE -> both auto-return to camp (guest 89 ms after the host).
- Guest Leave Session (confirmed) -> title, not a replica, still connected in `lobby`; host lists seat 1 empty.

## Step 14 — Single-player isolation in the browser + core loop (DONE)
`node tools/gntcnet3-sp.mjs --port 7845` (captures/gntcnet3-sp.json):
- `?seed=7&scene=arena&room=kill_all&freeze=1` -> `sim.trace(600, 3)`: two fresh loads identical (stateHash 0db5d828a848381b, eventsHash **817f1e9940c91d76**, 184 events); the same page with a LIVE server connection (connect ok, state lobby, idle) identical. eventsHash = the PLAN §6.5 v0.5.0 reference 817f1e9940c91d76; the stateHash differs from the v0.5.0 8e8d6fd519dca899 only because `sim.hash()` now hashes M2's grown complete capture (same event sequence).
- After a real hosted session (guest joined, 15 s of combat) the host's Leave Session -> title, bus `replica:false`, net back to `lobby`; the guest was promoted to host ("Hosting Room KW5MS · 1 player") and kept playing, not a replica. (Two checks in that tool were my mis-specification — the title does not tick; a second startCampaign from inside a live campaign is not a determinism test — and are not counted.)
- Production build, PLAN §6.2 core loop `node tools/cert-capture.mjs shot gntcnet3-core --url "http://127.0.0.1:4328/?seed=7&menu=0" --actions tools/actions/gnt-arch-coreloop.json`: exit 0, 0 PAGEERROR, run_start@632 -> room_cleared@765 -> reward_offer@765. Smoke `gntcnet3-smoke` (plain URL): exit 0, 0 PAGEERROR.
- Node goldens 9/9 + seed-7 traces = reference (step 3). After a server kill, New Game -> camp at 60 ticks/s, walk +2.2 u, not a replica (step 11).

## Step 15 — Player-facing MP flow by real mouse/keys + lobby drop (DONE)
`node tools/gntcnet3-ui.mjs --port 7849` -> 6/6 (captures/gntcnet3-ui.json, gntcnet3-ui-*.png): no server -> Multiplayer -> "Can't reach the Echoes server at ws://127.0.0.1:7849/echoes" with the `npm run net` copy in **4643 ms**; server started -> Retry -> online menu in 5 ms; Host a Game -> lobby "ROOM 7CGX8 · Private — share the code", share panel, seats with names / class / ping / "Free — take it" (gntcnet3-ui-lobby-guest.png); Join by Code typed lower-case -> seated in 982 ms; full room -> "That room is full." (gntcnet3-ui-full.png); Ready + Start by mouse -> guest in game in 833 ms, chip "Online · Tank Room PVXDC · 2 players 2 ms", tooltip "Connection good, ping 2 ms, packet loss in 0% out 0%".
`node tools/gntcnet3-lobbydrop.mjs` (captures/gntcnet3-lobbydrop.json): a lobby member whose socket dies without leave_room keeps its seat "held" and blocks the host's Start with "Every player must be ready first." for **10-15 s** (start refused at 14 / 5025 / 10043 ms, accepted at 15052 ms once the seat was released). First UI run showed the same (Start waited out 15 s).

## Step 16 — Own-kit prediction and dodge snaps (DONE)
`node tools/gntcnet3-kit.mjs --port 7841 --cond lat75,jit10 --reps 3` (host + Tank/Swordsman/Archer guest pages, every kit key 1-4, Space, right-mouse basic; captures/gntcnet3-kit.json): no kit skill moves the caster (host displacement 0 for all 12 skills); only the dodge moves the body (1.8 u). Predicted casts/basics: 1 predicted per press, 0 retractions.
`node tools/gntcnet3-dodge.mjs --port 7841 --cond lat75,jit10|off --reps 12 --actions Space` (12 standing dodges per class; captures/gntcnet3-dodge-C150.json, gntcnet3-dodge-N0.json). A "snap" = the game's own correctionSnaps counter rising + my rendered own-pose steps outside dash frames:
| RTT | Tank | Swordsman | Archer | all |
|---|---|---|---|---|
| ~150 ms (lat75 jit10, no loss) | 1/12 (1.22 u) | 2/12 (1.39 + 1.80 u) | **6/12** (pairs of 1.80 u jumps: the body flicks back to the pre-dodge spot and forward again, 1-2 frames, 200-600 ms after the key) | **9/36 = 25 %** |
| ~2 ms (no conditioner) | 1/12 (1.11 u) | 1/12 (1.18 + 1.42 u) | 1/12 (1.59, 1.80, 1.80 u) | 3/36 = 8 % |
Also 1-2 dodges per class started late (first own-body motion 160-338 ms after the key instead of 21-43 ms = not predicted, moved by the server correction). This explains the soak's snap counts (seats 2/3: 10-16 correctionSnaps per 3 min at N2, Tank 0-1) and predErrMax 1.04-1.58 u (> the 1.0 u snap threshold the PLAN caps N2/N3 max error at).

## Step 17 — Hitch recovery of the guest-input pipeline (DONE)
`node tools/gntcnet3-hitch.mjs --port 7841 --cond lat50,jit5` (a synchronous busy loop blocks one page mid-combat while the guest walks by real keys; host-execution lag of the guest's inputs in 1 s windows every 250 ms; captures/gntcnet3-hitch.json):
| hitch | base lag | peak lag after | back to base+150 ms |
|---|---|---|---|
| guest 500 ms | 104 ms | 112 ms | immediate |
| guest 1000 ms | 96 ms | 120 ms | immediate |
| guest 2000 ms | 104 ms | 128 ms | immediate |
| host 1000 ms | 104 ms | 896 ms | ~1.25 s |
| host 2000 ms | 104 ms | **1816 ms** | ~3.5 s after the hitch start (1816 -> 1592 -> 1240 -> 816 -> 488 -> 120) |
Guest hitches are absorbed cleanly. After a HOST stall of H ms the guests' inputs are executed up to ~H ms late and the backlog drains at ~1:1 (the host sim drops the stalled time, never catches up), matching the soak's machine-wide 2.8 s stall -> 1.7-2.9 s input lag for 3-6 s. PLAN §3.7 says a late frame is applied "≤ 250 ms late".

## Step 18 — Real hidden tabs, host local loop, keydown latency parity (DONE)
- `node tools/gntcnet3-hidden.mjs --port 7841` (a second tab is brought to the front inside the client's own browser window = real `hidden`; captures/gntcnet3-hidden.json): guest hidden -> host marks the seat away in **6 ms**, AI walked it 2.4 u in 5 s, guest metronome 20 Hz kept acking (19.8 snaps/s, 0 desyncs); visible again -> human in 53 ms, control +1.79 u. Host hidden 20 s -> host metronome 1203 ticks (59.6/s), guest applied ticks per 2 s window 56.8 / 62.7 / 55.2 / 59.9 / 59.6 / 59.9 / 59.7 / 59.6 / 61.2 / 59.4 (mean 59.8; 3 of 10 windows outside 60 ± 2), 0 desyncs over 40 hash checks, no double speed (max 62.7), 59.8 after return. Stale input: staleRepeatTicksMax = 8 in every soak window (step 9).
- `node tools/gntcnet3-hostloop.mjs --port 7841` (ONE 1600x900 page hosting 3 playing Node guests at N1 — builder bots used only as load; captures/gntcnet3-hostloop.json): host fps 73.6, hostNetMs p50/p95 **0.2 / 1.1 ms** (bar 2), captureMsP95 0.7, encodeMsP95 0.4, 20.7 KB/s out, bots 0 desyncs / 115-124 checks; **frameOver50Net 1** (bar 0) coinciding with one 1806 ms frame; host keydown-to-move frames [1,2,3,2,2,2] vs the same page single-player [1,1,1,1,2,1] (n = 6 each). With 3 BROWSER guests on the same machine (soak) hostNetMs p95 was 3.1-6.9 ms and frameOver50Net 3-31 per 3 min.
- `node tools/gntcnet3-keylat.mjs --port 7841` (captures/gntcnet3-keylat.json, same method both legs): first rendered frame with own movement after the keydown — single-player {1: 4, 2: 3, 3: 1} (p50 29 ms), guest at N0 {1: 5, 2: 3} (p50 22 ms) -> prediction gives SP parity.

## Step 19 — Builder harnesses re-run unmodified on my ports (DONE)
`node tools/gntM5a-protocol.mjs` 72/72 (tree-diff law corpus + 10 000 fuzz, codec, conditioner). `node tools/gntM5a-corpus.mjs --acts 1 --seconds 40`: act 1 delta 304.7 / full 3342.9 B = 0.091, 0 mismatches and 0 hash mismatches for 3 guests at 20 % snapshot + 20 % ack loss, quantisation <= 1/512 u. `node tools/gnt-M5a-netbench.mjs --server ws://127.0.0.1:7841/echoes --pages 2 --bots 1 --seconds 30 --cond lat75,jit10,loss10 --url http://127.0.0.1:4328/` -> schema echoes-netbench/1, every gate true (guest RTT p50 154-157, loss 9 %, 6.1 KB/s avg / 10.7-11.3 p95, delta ratio 0.14-0.15, 0 desyncs, 0 page errors). Server after 2.2 h and 71 connections / 919 k relayed frames: RSS 96.8 MB, 0 rooms, 12 disconnected peer records (bounded), counters badFrames 1 (no_host), protocolErrors 0.
Builder claims re-measured: fix-M5b-r1 NET-F1 (retractions) holds — soak predicted/confirmed 63-276 per window, 0-2 retractions retracted in 0.3-0.4 ms; fix-M5a-r1 NET-F2 holds — guest lossPct tracks wire loss and the chip reads "253 ms · 26% loss" with the amber "!" at N2 (captures/gntcnet3-soak-N2-guest.png); build-CAMPAIGN GC.11 net 12/12 claim holds on my own tool (step 13).

## Step 20 — Benchmark scoring (checklist from step 1, scored against the evidence above)
| # | item | score | evidence |
|---|---|---|---|
| B1 | fixed-rate authoritative snapshots | MET | 19.4-20.2 SNAP/s on the wire at 0 % loss; guest mutators refused (steps 6, 9, 13) |
| B2 | delta vs last ACKED baseline, loss-proof | MET | baseline age p50 1-7 snapshots; 0 desyncs / 0 decode errors at 20 % loss (soak 648 checks, corpus 0 mismatches) |
| B3 | unchanged data ~0 bytes | MET | delta 176-431 B vs full 3.7-6.6 KB (0.05-0.08) on the wire |
| B4 | bounded bandwidth | MET | 7.5-8.3 KB/s avg, 12.1-15.0 p95 down, 1.45-1.62 up at N1-N4; bursts of natural fulls after stalls (61-98 KB in 1 s) noted |
| B5 | entity interpolation | MET | interp 123-250 ms; hostile per-frame jumps > 0.6 u 0-2 per 20-46 k frames; remoteJumps03 0 |
| B6 | local prediction, no added latency | MET | key->first moved frame guest {1:5,2:3} vs SP {1:4,2:3,3:1} (step 18) |
| B7 | smooth reconciliation | **PARTIAL** | walking: path dev p95 0.01-0.12 u, rest error 0.01 u; DODGE: 25 % of dodges at 150 ms snap 1.1-1.8 u (Archer 50 %), 8 % at 2 ms (step 16) |
| B8 | lag compensation | MET | 98.2 % at N1 and N2 vs 51.8 / 76.3 % without rewind (step 12) |
| B9 | capped rewind | MET | 24-tick clamp, clamped counts reported (98/172 at N2) |
| B10 | redundant input, no lost actions | MET | predicted = confirmed (+-1) at 20 % loss; 6-frame redundancy (60 Hz INPUT, 20-24 B) |
| B11 | dup / reorder safe | MET | DR (5 % dup, 10 % reo) and N4: 0 duplicated events, 0 desyncs, 0 decode errors |
| B12 | connection-problem indicator | MET | banners in 2-99 ms; chip poor + "N% loss"; "No updates from the host" |
| B13 | reconnect with full state | MET | 1.0-1.4 s after link return; reload -> Rejoin 306 ms (step 11) |
| B14 | host-drop policy | **PARTIAL** | migration at 10.2-10.4 s, keyframe age 0.28-1.28 s, other guests synced; the old host's offered "Rejoin" lands in a Healer that cannot move (step 11 G) |
| B15 | server kill | MET | message at 15.07-15.22 s on every client, SP intact; contradictory "seat is held" modal (advisory) |
| B16 | lobby create/join/quick/seats/ready/start | MET | step 5 + step 15 |
| B17 | full lobby / last-seat race | MET | 50/50; "That room is full." |
| B18 | shared-object arbitration | MET | one Dewfont drink, loser `interact_denied (used)` |
| B19 | co-op pause | MET | both menus up, 60 ticks/s continue |
| B20 | simultaneous per-player choices | **PARTIAL** | host-only picks by design: draft_taken once, guest refused; the guest's read-only draft still shows a focused, active-looking "Take" button (gntcnet3-scout6-guest-draft.png) |
| B21 | desync detection >= 3 min | MET | 0 mismatches in 12 k+ hash checks across 4 x 180 s x 3 guests |
| B22 | netgraph / diagnostics | MET | chip ping/loss/bars + tooltip "packet loss in 0% out 0%"; net.stats |
| B23 | SP unaffected | MET | goldens 9/9, in-page eventsHash = reference with and without a live connection |
| B24 | no crash, local loop holds | MET | 0 page errors in every probe; host net ms p95 1.1 ms with 3 bots |
| B25 | server hardening | MET | garbage / injection / 3 MB frame -> offender closed 1009, others unaffected |
Score: **22 met / 3 partial / 0 not met of 25**.

## Step 21 — PLAN gates (literal)
G5a.1 MET · G5a.2 MET · G5a.3 MET (live 0.05-0.08, corpus 0.091, 0 mismatches at 20 % loss, law corpus 72/72) · G5a.4 MET (up-link applied loss 5.4 / 9.7-9.9 / 19.8-20.3 % at 5/10/20; SNAP wire loss 5.5-6.8 / 9.7-10.9 / 17.5-22.4 %; dup/reo observed) · G5a.5 MET (netbench unmodified on my port) · G5a.6 MET (goldens 9/9) · G5b.1 MET · **G5b.2 NOT MET** (N2/N3 "max <= 1.0 u": net.stats predErrMax 1.04 / 1.18 u in the soaks, 1.58 u at 150 ms no loss, 10-16 own snaps per 3 min on Swordsman/Archer; everything else in G5b.2 met) · G5b.3 MET · G5b.4 MET · G5b.5 MET · G5b.6 MET literally (reconnect 1.0-1.4 s, migration 0.24-0.40 s after the grace, state age <= 1.28 s, server kill -> message + SP) — but see must-fix 1 · G5b.7 MET · G5b.8 MET · G5b.9 PARTIAL (hostNetMs p95 1.1 ms and 73.6 fps with 3 bots, but frameOver50Net 1 and 3.1-6.9 ms p95 with 3 browser guests on this machine) · G5b.10 PARTIAL (keydown parity with SP met; fps >= 60 not measurable with 3-5 browsers; dodge snaps) · G5b.11 MET (8-tick hold, away 6 ms / back 53 ms, host-hidden mean 59.8 ticks/s) · G5b.12 PARTIAL (feedback p95 19.4-27.4 ms = within one frame at ~30 fps but above the literal 17 ms; retract 0.3-0.4 ms; 0 doubled presentations) · G5b.13 MET for unreachable (4.6 s) / Retry (5 ms) / full / Back; LAN + https not re-verified · G5b.14 MET · GC.11 MET.

## Verdict
**FAIL — 2 must-fix, 8 advisories.** The network core is strong and re-measured independently: lobby / matchmaking / last-seat race (50/50) / rejections all explicit; acked-baseline delta snapshots at 0.05-0.08 of full on the wire; 7.5-8.3 KB/s per guest at N1-N4; walking prediction error p95 <= 0.12 u with SP-parity input latency; 0 desyncs in 12 k+ hash checks over four 3-minute 4-client soaks; hit registration 98 % with the rewind (52-76 % without); reconnect in 1.0-1.4 s, reload-rejoin in 0.3 s, host migration 0.24-0.40 s after the 10 s grace with <= 1.3 s old state; races resolve to one winner; the campaign follows the host through L1 -> card -> L2, Quit to Lobby, defeat and CAMPAIGN COMPLETE in sync; single-player bit-identical.
What fails: (1) a host whose connection drops long enough for the session to migrate is offered "Rejoin — your Healer seat is held", and after accepting it controls a Healer that never moves (every sent input frame move = 0; 0.00 u in 2 x 2 s, reproduced twice); (2) the own-body DODGE rubber-bands: 25 % of dodges at 150 ms RTT (Archer 50 %) and 8 % at 2 ms snap the body 1.1-1.8 u back and forth, breaking the PLAN's N2/N3 max-error bar.

### Must-fix
| id | title | evidence | reproduce | suspect files |
|---|---|---|---|---|
| NET3-F1 | Old host who accepts "Rejoin" after a host migration controls a frozen Healer | captures/gntcnet3-drops.json data.G_rejoin: rejoined as guest seat 0 in 146-172 ms, synced, new host humanSeats [2,0] + seat_control@2567, but KeyD 2 s -> hostSideMove 0, ownPoseDx 0; after a canvas click KeyA 2 s -> 0; the guest's sent frames all move:0 (aim changes); gntcnet3-drops-G-oldhost-rejoined.png shows "Online · Healer" | `node tools/gntcnet3-drops.mjs --port 7847 --legs G` (host socket closed + refused 18 s via POST /admin/drop mode close -> migration at ~10.3 s -> old host title "Rejoin XXXXX?" -> Enter -> hold D) | src/net/session.js (guest input sampling for a seat-0 / player-kind entity), src/net/seats.js, src/sim/netseats.js, src/net/driver.js (seat 0 human control after migration) |
| NET3-F2 | Own dodge mispredicted: 1.1-1.8 u back-and-forth snaps on 25 % of dodges at 150 ms RTT (Archer 6/12, Swordsman 2/12, Tank 1/12), 3/36 at 2 ms; some dodges start 160-338 ms late | captures/gntcnet3-dodge-C150.json / -N0.json (pairs of 1.80 u per-frame jumps outside dash frames + correctionSnaps +2); soak captures/gntcnet3-soak.json correctionSnaps seat 2/3 = 10/16 at N2, 1/11 at N1, predErrMax 1.04-1.18 u > the G5b.2 N2/N3 1.0 u cap | `node tools/gntcnet3-dodge.mjs --port <srv> --cond lat75,jit10 --reps 12 --actions Space` | src/net/predict.js, src/net/reconcile.js (replay of the dodge press / dodge cooldown at the rewind point), src/sim/movement.js (human-ally dodge rules) |

### Advisories
1. Host-stall recovery: after a host main-thread stall of H ms the guests' inputs run up to ~H ms late and drain ~1:1 (host 2 s -> 1816 ms peak, ~3.5 s to recover; soak machine-wide 2.8 s stall -> 1.7-2.9 s for 3-6 s) against PLAN §3.7 "<= 250 ms late"; guest stalls are absorbed (peak 112-128 ms). Natural full-snapshot bursts follow (29-31 fulls, 61-98 KB in one second).
2. After a server kill the title shows "Connection to the server was lost." together with a "Rejoin XXXXX? Your Tank seat is held for a minute" modal although the server is dead; Rejoin fails cleanly after 2.1 s ("Couldn't rejoin — unreachable") (gntcnet3-killsp-guest-msg.png).
3. The barred old host after admin kill-host lands on a plain title with no message (r1 advisory 4 persists; gntcnet3-drops-E-oldhost.png).
4. A lobby member whose socket dies without leave_room blocks the host's Start for 10-15 s with the misleading "Every player must be ready first." (captures/gntcnet3-lobbydrop.json).
5. The guest's read-only draft page shows a focused, primary-styled "Take" button; pressing it only produces a refusal (gntcnet3-scout6-guest-draft.png).
6. G5b.9 not proven under browser load: frameOver50Net 1 (one 1.8 s frame) with 3 bots; hostNetMs p95 3.1-6.9 ms and frameOver50Net 3-31 per 3 min with 3 browser guests on this machine; host keydown-to-move [1,2,3,2,2,2] frames hosting vs [1,1,1,1,2,1] SP (n 6).
7. Host-hidden 20 s: mean 59.8 ticks/s but 3 of 10 two-second windows outside 60 ± 2 (55.2-62.7).
8. Stress beyond the PLAN's N4: 5 % dup + 10 % reorder costs 14.7-15.0 KB/s avg / 26.2-26.7 KB/s p95 (over the 12 / 24 budget); N1-N4 are inside it.
Environment note: this machine had machine-wide 2.3-3.2 s freezes (the single-player control page froze 2800 ms together with every client in the N1 soak) — those stalls are not attributed to the game; only their aftermath (advisory 1) is.

Processes: session server PID 76700 (:7841) and vite preview PID 69528 (:4328) stopped at the end; child servers 7842-7849 were spawned and stopped by their tools.
