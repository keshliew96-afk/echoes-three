# WebRTC co-op (v0.5.232)

Co-op game traffic now goes **directly between the players' browsers** over
WebRTC data channels. The session server only matches players (rooms, codes,
Quick Match, as before) and passes on the handshake. The old WebSocket relay
stays as the fallback, so a player whose network blocks a direct path keeps
playing exactly as before.

The game rules do not change: the host is still the only authority, guests
still send inputs and receive snapshots and events. Only the transport moved.

## What a player sees

- The in-game connection chip (bottom left) ends with **Direct** or **Relay**.
  A host with several guests on different paths sees `Direct 1 · Relay 2`;
  hovering the chip names each seat ("Tank: direct connection", "Archer:
  through the server relay").
- The room screen adds the same word to each other player's seat line (a host
  sees each guest, a guest sees the host).
- Nothing else. Nobody presses anything: a link that does not come up, or
  breaks, simply leaves that seat on the relay and the game keeps going.

All five new lines are in the ten language tables.

## How it works

- **Topology.** A star around the host, like the game's authority: the host
  opens one `RTCPeerConnection` per connected guest seat; each guest answers
  the host's offer. Guests never connect to each other.
- **When.** Links come up as soon as players sit in the same room (lobby), so
  most games start already direct. A player who drops in or reconnects
  mid-game gets a fresh offer at once.
- **Signalling.** A new control message `rtc` (`offer`, `answer`, `cand`)
  travels over the existing socket. The server checks it (both players in the
  same room, one of them the host, the target seat held by a connected player),
  stamps the sender's seat as `from`, and forwards it. Counter:
  `/stats` → `counters.signals`.
- **ICE.** Public STUN only (Google's two and Cloudflare's). No TURN server:
  the free Render plan has none and no paid service was added. The relay is
  the answer for networks where STUN alone cannot open a path (symmetric NATs,
  some corporate, school and mobile-carrier networks).
- **Channels.** Two pre-negotiated data channels per link:
  - `r`, ordered and reliable: `EVENTS`, `CMD`, and any frame over 1150
    bytes (one packet).
  - `u`, unordered with no retransmits: `SNAP`, `INPUT`, `EVENTS_U`.

  This follows the relay's own delivery classes. The relay already treats
  SNAP, INPUT and EVENTS_U as the unreliable class (its network conditioner
  drops, duplicates and reorders them in tests), and the protocol is built for
  their loss: inputs are sent six deep, snapshots are deltas against acked
  baselines with a full snapshot on request, and every EVENTS batch is resent
  once on EVENTS_U with batch-sequence dedupe. So the unreliable channel gives
  the real latency win (no head-of-line blocking) without new failure modes.
- **What stays on the socket.** Lobby and room messages, pings, the signalling,
  `KEYFRAME`s (the server keeps them for reconnect and host migration), and
  every frame for a seat without a direct link. The ping also piggybacks on
  direct sends (at least twice a second) so a hidden tab, whose timers are
  throttled, still keeps its socket alive the way its stream of frames used
  to.
- **Routing.** `src/net/lobbyClient.js` installs a router on the transport
  (`transport.setRouter`). It runs after the client's network conditioner, so
  `?netcond=` shapes both paths alike. A host broadcast (`seat 0xFF`) goes to
  each direct seat on its link and to each relay seat as an addressed copy
  through the server (never the server's broadcast, which would duplicate).
  A frame from a guest arrives at the host stamped with that guest's seat, as
  the relay would have done, and only the channels a guest may send are
  accepted (the host checks what the server used to check).

## Fallback rules

| Situation | Result |
|---|---|
| Link not open within 6 s of the offer | That seat stays on the relay |
| Link silent for 4 s (heartbeats every 0.5 s, plus game frames) | Relay |
| Data channel closes or errors, ICE fails, send buffer over 4 MB | Relay |
| The player reconnects, or the seat changes hands | A fresh offer |
| Host migrates or resumes | Every link is rebuilt around the new host |
| A browser without WebRTC, or `?p2p=0` | Relay only (the host's offer times out) |

A link that failed is not retried for the same connection of that player (a
link that keeps flapping would cost more than the relay). When a guest's link
breaks mid-game, the frames in flight on it are lost; the guest asks the host
for a full snapshot at once, exactly as after a reconnect.

Silence checks skip one round after the page itself stalled for seconds (a
long frame, a starved tab), so frames that arrived during the stall are read
before anyone is judged silent.

## Files

- `src/net/mesh.js` — the peer links: offers, answers, candidates, the two
  channels, heartbeats, timeouts and fallback, `paths()`, `stats()`,
  `debugDrop(seat)` for probes.
- `src/net/lobbyClient.js` — creates the mesh, routes frames, handles `rtc`
  messages, `net.paths()`, `net.stats().paths` / `.p2p`, the `path` event.
- `src/net/transport.js` — `setRouter()` and `injectBinary()` (a direct frame
  goes through the same meters, conditioner and listeners, but never counts as
  socket life for the socket's own silence check).
- `server/server.mjs` + `src/net/protocol/messages.js` / `constants.js` — the
  `rtc` message, its validation and forwarding; a host's ping also refreshes
  its keyframe age.
- `src/net/session.js` — a guest re-baselines when its direct link breaks.
- `src/ui/net/hud.js`, `src/ui/menu/lobby.js` — Direct / Relay.
- `src/app/params.js` — `?p2p=0` (relay only), `?p2pwait=ms` (stretches the
  connect window and silence limit; for slow probe browsers).

## Probe

`node tools/webrtc-coop-probe.mjs` (own session server, a Vite dev server on
5199, the chrome wrapper of the cloud probe recipe). Three browsers on one
machine:

- A: host and guest come up direct in the lobby; in game the guest's frames
  arrive on the direct link, the server relays nothing, the guest stays in sync.
- B: the direct link is broken mid-game; both sides land on the relay by
  themselves and the guest stays in sync through the server.
- C: a player with `?p2p=0` drops in; the host's offer goes unanswered, that
  seat falls back to the relay after the connect window and plays in sync.

On this software-GL machine each page runs at 1 to 3 fps and each step of the
handshake waits on the page, so the probe passes `?p2pwait=30000` (links took
8 to 11 s to open here). A browser at a normal frame rate should need well
under the 6 s window, but that is not measured from this machine.

## Known limits

- No TURN: players behind symmetric NATs or strict firewalls stay on the relay.
- Direct links are only host to guest; a guest-to-guest path is never needed
  because all game traffic goes through the host's simulation.
- A real game across two different networks has not been tried from here (the
  probe runs all browsers on one machine).
