// JSON control messages (docs/gauntlet/PLAN.md §3.7 table). Owner: M5a.
// ISOMORPHIC, pure. Text frames carry `{ t: <type>, ...payload }`.
//
// Client -> server messages are VALIDATED here (the server trusts nothing):
// decodeClientMessage(text) -> { ok: true, msg } | { ok: false, reason }.
// Every failure maps to an explicit reason the server answers with
// (join_rejected { reason } or error { reason }), never a silent drop.
import { MSG, REJECT, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, MAX_SEATS } from './constants.js';

export const MAX_CONTROL_BYTES = 4096;
export const NAME_MAX = 16;
export const CLASS_BY_SEAT = Object.freeze(['healer', 'tank', 'swordsman', 'archer']);
export const SEAT_NAMES = Object.freeze(['Healer', 'Tank', 'Swordsman', 'Archer']);

// Extra (non-join) error reasons the server may answer with `error { reason }`.
export const ERR = Object.freeze({
  BAD_REQUEST: REJECT.BAD_REQUEST,
  VERSION: REJECT.VERSION,
  SERVER_FULL: REJECT.SERVER_FULL,
  NOT_IN_ROOM: 'not_in_room',
  ALREADY_IN_ROOM: 'already_in_room',
  NOT_HOST: 'not_host',
  NOT_READY: 'not_ready',
  WRONG_STATE: 'wrong_state',
  SEAT_TAKEN: 'seat_taken',
  RATE_LIMITED: 'rate_limited',
  NO_HELLO: 'no_hello',
  SESSION_EXPIRED: 'session_expired',
});

const CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);
const TOKEN_RE = /^[0-9a-f]{32}$/;

// normalizeCode("ab cd-e") -> "ABCDE" (null when it cannot be a room code).
export function normalizeCode(s) {
  if (typeof s !== 'string') return null;
  const c = s.toUpperCase().replace(/[\s-]/g, '');
  return CODE_RE.test(c) ? c : null;
}
export function isRoomCode(s) {
  return typeof s === 'string' && CODE_RE.test(s);
}

// C0/C1 controls, zero-width and bidi-override code points (built from code
// points so the source file carries no literal control characters).
const NAME_STRIP_RE = new RegExp(
  '[' +
    [
      [0x00, 0x1f],
      [0x7f, 0x9f],
      [0x200b, 0x200f],
      [0x2028, 0x202e],
      [0xfeff, 0xfeff],
    ]
      .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b))
      .join('') +
    ']',
  'gu'
);
// Printable, trimmed, ≤ 16 code points; empty -> fallback.
export function sanitizeName(s, fallback = 'Player') {
  if (typeof s !== 'string') return fallback;
  const clean = [...s.replace(NAME_STRIP_RE, '').trim()].slice(0, NAME_MAX).join('');
  return clean || fallback;
}

const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const isStr = (v, max) => typeof v === 'string' && v.length <= max;
const optional = (v, pred) => v === undefined || v === null || pred(v);

// Per-type validators: return an error reason string, or null when valid.
const C2S = {
  [MSG.HELLO]: (m) =>
    !isInt(m.v, 0, 0xffff)
      ? 'bad_request'
      : !isStr(m.build, 32)
        ? 'bad_request'
        : !optional(m.name, (x) => isStr(x, 64))
          ? 'bad_request'
          : !optional(m.token, (x) => typeof x === 'string' && TOKEN_RE.test(x))
            ? 'bad_request'
            : null,
  [MSG.CREATE_ROOM]: (m) =>
    m.visibility !== 'public' && m.visibility !== 'private'
      ? 'bad_request'
      : !optional(m.name, (x) => isStr(x, 64))
        ? 'bad_request'
        : !optional(m.dropIn, (x) => typeof x === 'boolean')
          ? 'bad_request'
          : null,
  [MSG.JOIN_ROOM]: (m) => (normalizeCode(m.code) === null ? 'not_found' : !optional(m.seat, (x) => isInt(x, 1, MAX_SEATS - 1)) ? 'bad_request' : null),
  [MSG.QUICK_MATCH]: () => null,
  [MSG.CANCEL_MATCH]: () => null,
  [MSG.LEAVE_ROOM]: () => null,
  [MSG.SELECT_SEAT]: (m) => (isInt(m.seat, 1, MAX_SEATS - 1) ? null : 'bad_request'),
  [MSG.SET_READY]: (m) => (typeof m.ready === 'boolean' ? null : 'bad_request'),
  [MSG.START_GAME]: (m) => (optional(m.seed, (x) => isInt(x, 0, 0xffffffff)) ? null : 'bad_request'),
  [MSG.RECONNECT]: (m) => (typeof m.token === 'string' && TOKEN_RE.test(m.token) && normalizeCode(m.code) !== null ? null : 'bad_request'),
  [MSG.PING]: (m) => (Number.isFinite(m.t) && optional(m.rttMs, (x) => Number.isFinite(x) && x >= 0 && x < 600000) ? null : 'bad_request'),
};

export const CLIENT_TYPES = Object.freeze(Object.keys(C2S));

export function decodeClientMessage(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'bad_request', detail: 'not text' };
  if (text.length > MAX_CONTROL_BYTES) return { ok: false, reason: 'bad_request', detail: 'too large' };
  let m;
  try {
    m = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'bad_request', detail: 'bad json' };
  }
  if (!m || typeof m !== 'object' || Array.isArray(m) || typeof m.t !== 'string') return { ok: false, reason: 'bad_request', detail: 'no type' };
  const v = C2S[m.t];
  if (!v) return { ok: false, reason: 'bad_request', detail: `unknown type ${String(m.t).slice(0, 32)}`, t: m.t };
  const err = v(m);
  if (err) return { ok: false, reason: err, t: m.t, detail: 'invalid payload' };
  if (m.code !== undefined && m.code !== null) m.code = normalizeCode(m.code);
  return { ok: true, msg: m };
}

// Server -> client (and client -> server) encoder.
export function encodeMessage(t, payload = {}) {
  return JSON.stringify({ ...payload, t });
}

// Tolerant decoder for server -> client messages (the client trusts the
// server's shape but never throws on garbage).
export function decodeServerMessage(text) {
  try {
    const m = JSON.parse(text);
    if (m && typeof m === 'object' && typeof m.t === 'string') return m;
  } catch {
    /* fall through */
  }
  return null;
}

// Human copy for every rejection / error reason (the lobby UI and the logs
// show these; no reason is ever displayed as a raw code alone).
export const REASON_TEXT = Object.freeze({
  full: 'That room is full.',
  not_found: 'No room with that code.',
  in_progress_locked: 'That game is starting or does not allow joining mid-run.',
  version_mismatch: 'That room runs a different version of Echoes.',
  bad_request: 'The request was not understood.',
  server_full: 'The server is full right now.',
  not_in_room: 'You are not in a room.',
  already_in_room: 'You are already in a room — leave it first.',
  not_host: 'Only the host can do that.',
  not_ready: 'Every player must be ready first.',
  wrong_state: 'That is not possible right now.',
  seat_taken: 'That seat is taken.',
  rate_limited: 'Too many requests — slow down.',
  no_hello: 'Say hello first.',
  session_expired: 'The session expired.',
});
export function reasonText(reason) {
  return REASON_TEXT[reason] || `Request refused (${reason}).`;
}
