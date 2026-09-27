// Network protocol constants (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
// ISOMORPHIC: imported by the browser client (src/net/**) AND the Node
// session server (server/**). No DOM, no Node built-ins here.

// v2 (M5b, W4): + EVENTS_U (0x07) redundant unreliable event batches.
// v3 (fix-M5a-r4, NET4-F3 bandwidth): baseline-relative patch ops (bvalue.js
// u / w / D / based k), a one-byte HOT field mask, NEW mover anchors relative
// to the snapshot tick, EVENTS bodies with static shapes (evshapes.js),
// re-measured dictionaries; EVENTS_U carries the previous batch only.
// v4 (PARTY, PLAN §16.5 / GP.10): the per-character build event shapes,
// snapshot keys and strings appended to the static tables (evshapes.js,
// bvalue.js) — existing indices unchanged, a v3 peer is refused as before.
export const PROTOCOL_VERSION = 4;
export const WS_PATH = '/echoes';
export const DEFAULT_PORT = 7800; // player default; agents use their own ports (PLAN §6.3)
export const DEFAULT_URL = `ws://127.0.0.1:${DEFAULT_PORT}${WS_PATH}`;

// ---------------------------------------------------------------- rates --
export const SIM_HZ = 60;
export const SNAPSHOT_HZ = 20; // every 3 sim ticks
export const SNAPSHOT_EVERY_TICKS = SIM_HZ / SNAPSHOT_HZ;
export const INPUT_REDUNDANCY = 6; // each input packet repeats up to 6 unacked frames
export const KEYFRAME_EVERY_TICKS = 120; // host -> server full state for reconnect / migration
export const BASELINE_RING = 32; // snapshots kept per guest for delta baselines (1.6 s)
export const PING_INTERVAL_MS = 1000;
export const PEER_TIMEOUT_MS = 5000; // no traffic -> peer considered dropped
export const HOST_TIMEOUT_MS = 3000; // host silence -> host_lost
export const HOST_GRACE_MS = 10000; // wait for the host before migrating
export const SEAT_HOLD_MS = 60000; // a dropped guest's seat is held (AI plays it)
// Reconnect backoff, capped at 1.5 s (PLAN text: 0.25/0.5/1/2/4/5 s). With
// 4 s / 5 s steps a link restored right after a failed attempt waits up to
// 5 s, which breaks gate G5b.6 ("full state and control within 3 s of link
// restoration") for any outage longer than ~7.75 s. M5a capped it at 2.5 s
// (measured 2.5 s restore -> full state at M5b's drop probe: no margin); M5b
// caps it at 1.5 s so every restoration lands inside 1.5 s + one connect +
// the full snapshot (< 2 s), at <= 0.67 attempts/s per reconnecting client.
export const RECONNECT_BACKOFF_MS = Object.freeze([250, 500, 1000, 1500]);

// --------------------------------------------------- client-side timing --
export const INTERP_DELAY_MIN_MS = 100;
export const INTERP_DELAY_MAX_MS = 250;
// Lag compensation window. PLAN §3.7 text: 15 ticks (250 ms). M5b raises it
// to 24 ticks (400 ms): at the PLAN's own interp delay (2 × 50 ms + 2σ jitter
// = 130-140 ms at N1) and the depth-2 input buffer, a guest's view at N1
// (150 ms RTT) is 18-20 ticks old when its input is consumed (measured
// rewind wanted p50 18.4 / p95 20.4 ticks) — a 15-tick cap clamped EVERY N1
// rewind and left each N1 hit ~80 ms off what the guest saw (G5b.3's N1
// bar). 24 covers N1; N2 (250 ms RTT, ~27 ticks) still clamps, as G5b.3
// anticipates. History keeps 30 ticks (positions only).
export const REWIND_MAX_TICKS = 24;
export const REWIND_HISTORY_TICKS = 30;
export const CORRECTION_TAU_MS = 100; // visual error decay time constant
export const CORRECTION_SNAP_U = 1.0; // errors above this snap instead of smoothing

// ------------------------------------------------------- quantisation --
export const Q = Object.freeze({
  pos: 256, // 1/256 u, int16 -> ±128 u
  aim: 64, // aim point 1/64 u, int16
  yawSteps: 256, // uint8 orientation, 1.41°
  hp: 100, // 0.01 HP, varint
});

// --------------------------------------------- binary channel headers --
// First byte of every binary WebSocket frame.
export const BIN = Object.freeze({
  SNAP: 0x01, // host -> guest (via server), unreliable class
  INPUT: 0x02, // guest -> host (via server), unreliable class
  EVENTS: 0x03, // host -> guest, reliable class (sim events for VFX/audio/UI)
  CMD: 0x04, // guest -> host, reliable class (meta commands: interact, ready, ping a door)
  KEYFRAME: 0x05, // host -> server, reliable class (full state, reconnect/migration)
  RELIABLE_ACK: 0x06,
  // M5b (W4): the last few EVENTS batches again on the UNRELIABLE class, sent
  // with every snapshot — Quake 3's "resend until acked" for presentation
  // events: a batch whose reliable copy is held back by a retransmit
  // (>= 200 ms) still reaches the guest before its render clock gets there.
  EVENTS_U: 0x07,
});

// ------------------------------------------------ JSON control messages --
// { t: <type>, ...payload } text frames. Full table in PLAN.md §3.7.
export const MSG = Object.freeze({
  // client -> server
  HELLO: 'hello',
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  QUICK_MATCH: 'quick_match',
  CANCEL_MATCH: 'cancel_match',
  LEAVE_ROOM: 'leave_room',
  SET_READY: 'set_ready',
  SELECT_SEAT: 'select_seat',
  START_GAME: 'start_game',
  RECONNECT: 'reconnect',
  PING: 'ping',
  // server -> client
  WELCOME: 'welcome',
  ROOM_STATE: 'room_state',
  JOIN_REJECTED: 'join_rejected',
  MATCH_STATUS: 'match_status',
  MATCH_FOUND: 'match_found',
  GAME_STARTING: 'game_starting',
  PEER_JOINED: 'peer_joined',
  PEER_LEFT: 'peer_left',
  PEER_DROPPED: 'peer_dropped',
  PEER_RESTORED: 'peer_restored',
  HOST_LOST: 'host_lost',
  HOST_CHANGED: 'host_changed',
  BECOME_HOST: 'become_host',
  PONG: 'pong',
  ERROR: 'error',
});

export const REJECT = Object.freeze({
  FULL: 'full',
  NOT_FOUND: 'not_found',
  IN_PROGRESS_LOCKED: 'in_progress_locked',
  VERSION: 'version_mismatch',
  BAD_REQUEST: 'bad_request',
  SERVER_FULL: 'server_full',
});

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export const ROOM_CODE_LENGTH = 5;
export const MAX_SEATS = 4; // seat 0 = Healer (host), 1 Tank, 2 Swordsman, 3 Archer
export const MAX_ROOMS = 64;
export const QUICK_MATCH_ALONE_MS = 15000; // then offer "start now, AI fills seats"

// Bandwidth budget per guest (PLAN gate G5b.4), bytes per second.
export const BUDGET = Object.freeze({
  guestDownAvg: 12 * 1024,
  guestDownP95: 24 * 1024,
  guestUpAvg: 4 * 1024,
});
