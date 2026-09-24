STATUS: PARTIAL
# NET CRITIC — Gauntlet Round 1 (critic-net-r1)

Started: 2026-09-24. Role: harsh critic, fresh context. Judges only the running game.

## Completed steps
- [x] Step 0: checkpoint created.
- [x] Step 1: blind benchmark checklist written (47 items) — see below.
- [x] Step 2: own infra up — server `node server/index.mjs --port 7840 --admin --log` (node PID 85568), preview `npx vite preview --outDir dist-cnet --port 4328` (PID 71132), build v0.5.62 (HEAD 2c67b2a).
- [x] Step 3: SP isolation (Node): `node tools/gntM2-goldens.mjs` → 9/9 GOLDEN MATCH (captures/gntcnet1-goldens.json; e.g. kill_all/1 f254f4b09d29c9d1/04e3edebdf962690, run/3 12343b91a7b23b9e/79b766652093bc77); seed-7 kill_all 3600-tick trace eventsHash d1eff38b03f581aa = PLAN §6.5 reference.
- [x] Step 4: lobby by raw Node WebSocket (tools/gntcnet1-lobby.mjs, captures/gntcnet1-lobby.json): 23/25 + 3/3 follow-ups (gntcnet1-lobby2.mjs) = every check holds. Numbers: socket open p50 4.3 / max 50.8 ms, hello→welcome p50 1.3 / max 5.7 ms; create 2.2 ms; join 2.5 ms; start→game_starting 0.6 ms, →in_game 1519.9 ms (countdown 1500); last-seat race 50/50 exactly one winner + one `full`; 8 simultaneous quick matches → rooms [1,2,3],[0,1,2,3],[0] no double seat; rejections not_found / full / bad_request / not_ready / not_host / version_mismatch (build enforced at join, protocol at hello close 4001) all explicit; drop-in to in_game room 1 ms; host leaves lobby → guest promoted 1.7 ms; child server ready 214 ms; server kill → all sockets closed 9 ms (1006).

## Step 1 — BLIND BENCHMARK CHECKLIST (written before inspecting any Echoes capture)

Source: my own knowledge of the Source engine / Valve networking model, Quake 3
delta compression, Overwatch netcode (GDC 2017 talk), and the co-op lobbies of
Risk of Rain 2 and Gunfire Reborn. Each item is concrete and testable; scored
later as MET / PARTIAL / NOT MET with capture + numbers.

### A. Source engine model (snapshots, interpolation, prediction, lag comp)
- A1. Authority ticks at a fixed rate (66/64 Hz Source, 60 Hz here) and sends snapshots at a lower fixed rate (cl_updaterate 20 default) — snapshot rate must be observable and stable (~20/s +-10%).
- A2. Clients send input commands every client tick with redundancy (usercmds carry the last N unacked cmds so a lost packet does not lose a press).
- A3. Remote entities render in the past by an interpolation delay (cl_interp ~100 ms at 20 Hz); the interp delay is >= 2 snapshot intervals and adapts to jitter; between two snapshots motion is linear interpolation, never a jump.
- A4. If snapshots are missing, the client extrapolates a bounded time (Source 0.25 s; PLAN says <= 100 ms) and then holds — never runs away.
- A5. Client-side prediction of the LOCAL player: movement responds on the same frame as the key press (0 added latency), using the same movement code as the authority, and inputs are re-simulated after each ack (rewind + replay).
- A6. Prediction error correction: small errors are smoothed (Source cl_smoothtime 0.1 s), big ones snap; under a stable link the prediction error is ~0.
- A7. Lag compensation: the authority rewinds hit-tested entities to the client's view time (max 1 s in Source, 250 ms here); a shot that hit on the client's screen hits on the authority nearly always under lag <= the max; beyond the clamp hits degrade gracefully.
- A8. The listen-server local player is never lag-compensated (no rewind for seat 0).
- A9. Reliable vs unreliable channel: events that must arrive (round state, deaths) go reliable; positions unreliable latest-wins; loss on the unreliable channel must not produce decode errors.
- A10. net_graph-style stats: in/out bytes/s, loss, latency visible to the player — at minimum ping in the UI, ideally packet loss.

### B. Quake 3 delta compression against acknowledged baselines
- B1. Each snapshot is delta-encoded against the last snapshot the client ACKED; the server keeps a ring (Q3: 32, PACKET_BACKUP) and falls back to a FULL snapshot when the ack is too old — no protocol failure on any loss pattern.
- B2. Delta size is a small fraction of full size in steady state — Q3 deltas typically 5–20% of a full snapshot; above ~30% the field masks / quantisation are not doing their job.
- B3. Per-entity field masks: unchanged entities cost ~1 byte; only changed fields are sent.
- B4. Delta/ack is robust to duplication and reordering: an older snapshot arriving after a newer one is discarded (seq monotonic), a duplicate is ignored, neither causes a mis-applied delta or a desync.
- B5. Out-of-order or too-old ack → the authority uses the newest usable acked baseline, never an unacked one.
- B6. Full snapshot on join / after reconnect (baseline reset) is explicit and the client can always recover from any state with a full.
- B7. Bandwidth: Q3 at 20 Hz ~2–8 KB/s per client; a modern 4-player co-op should be well under ~15 KB/s downstream per guest in combat.

### C. Overwatch netcode (GDC 2017, Tim Ford)
- C1. Client predicts its OWN abilities immediately (movement, casts, animations, sounds) — feedback on the same frame; the authority confirms or denies.
- C2. When the authority denies a predicted ability (e.g. you were stunned), the client rolls back cleanly (ability un-cast, cooldown restored) with a small visible correction and no doubled effects.
- C3. Confirmed predictions are de-duplicated: the authoritative event does not replay the sound/VFX a second time.
- C4. Under high latency the client's tick-ahead buffer grows so the authority always has an input for every tick; the authority reports buffer depth and the client adapts.
- C5. When input is missing the authority repeats the last held input for a short time then goes neutral (no "runs into a wall forever" and no sudden stop from a single lost packet).
- C6. Damage, kills and hit reactions are never predicted — authoritative only; "favor the shooter" applies via bounded rewind.
- C7. A desync detector exists (hash checks) and triggers recovery (full snapshot), not silent divergence.
- C8. High latency / loss surfaces to the player (icon/warning) instead of silently degrading.

### D. Co-op roguelike lobbies (Risk of Rain 2, Gunfire Reborn)
- D1. Host/Join by lobby code and Quick Match both exist; private lobbies exist; the code is short and readable and shown prominently / copyable.
- D2. Seat/character selection with a Ready state per player; host alone can start; start is blocked until every connected player is ready.
- D3. The lobby shows every player's name, class, ready state and ping; empty seats are visibly empty / "AI" labelled.
- D4. Full lobby → join rejected with a clear reason ("Lobby is full"), not a hang; wrong code → "not found"; version mismatch → explicit message.
- D5. Drop-in mid-run: a late joiner gets a full state and takes a free seat within seconds.
- D6. Player disconnect: the game continues for the rest; the seat is held and a reconnect within a grace window restores control with progress intact.
- D7. Host disconnect: RoR2 / Gunfire end the session for all with a "Host has left" message and no crash. PLAN promises migration <= 5 s after a 10 s grace, so that is the bar here.
- D8. Build/draft decisions in co-op: guests must see the state read-only with an explicit "waiting on host" and never hit a dead end or hang.
- D9. Pause in multiplayer never halts the shared session; the pause menu still works for settings/leave.
- D10. Leaving a lobby returns cleanly to the menu; the room closes when empty; rejoin is offered after a reload within the grace window.
- D11. Server unavailable → explicit, actionable message and Retry, never an infinite spinner; single-player is never affected by the network layer.
- D12. Same-object interaction race (two players use one object at the same tick) → exactly one activation; the loser sees it already used.

### E. Cross-cutting production bars
- E1. 0 uncaught page errors and 0 non-whitelisted console errors across all clients for the whole session.
- E2. Host frame rate under 3 guests + boss fight stays at the single-player bar (60 fps).
- E3. Single-player with no server is bit-identical to before (same seed → same event sequence).
- E4. A >= 3 min run with 0 desyncs at every conditioner profile.

Total checklist items: 47 (A 10, B 7, C 8, D 12, E 4).
