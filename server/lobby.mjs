// Lobby rooms + seats (docs/gauntlet/PLAN.md §3.7 "Lobby / matchmaking
// states"). Owner: M5a. No I/O: the server hands in `send(peer, t, payload)`
// and a clock; every operation runs to completion inside the server's single
// event-loop turn, so seat assignment is ATOMIC — two joins for the last seat
// always yield exactly one room_state with the seat and one join_rejected
// { reason: 'full' }.
//
// Room.state: lobby -> starting -> in_game -> closed, plus `migrating` while
// the host is lost (grace window, then migration). Seat 0 is the Healer and
// belongs to the host at creation; seats 1-3 are Tank, Swordsman, Archer. In
// the lobby any player (the host too) may move to any free seat (CLASS
// SELECT). An empty or dropped seat is played by the AI on the host.
import { randomInt } from 'node:crypto';
import {
  MSG,
  REJECT,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  MAX_SEATS,
  MAX_ROOMS,
  SEAT_HOLD_MS,
  HOST_GRACE_MS,
} from '../src/net/protocol/constants.js';
import { CLASS_BY_SEAT, ERR, sanitizeName } from '../src/net/protocol/messages.js';

export const LOBBY_HOLD_MS = 10000; // a disconnected lobby member keeps the seat 10 s (page reload)
export const START_COUNTDOWN_MS = 1500;
// A returning host's page resumes from the keyframe cache only while the
// keyframe misses at most this much play (keyframes arrive every 2 s).
export const RESUME_MAX_STATE_AGE_MS = 10000;

function newSeat(i) {
  return { index: i, classId: CLASS_BY_SEAT[i], peerId: null, name: null, ready: false, connected: false, rttMs: null, holdUntil: null };
}

export class Lobby {
  constructor({ send, now = () => Date.now(), log = () => {}, maxRooms = MAX_ROOMS, onRoomClosed = () => {} } = {}) {
    this.send = send;
    this.now = now;
    this.log = log;
    this.maxRooms = maxRooms;
    this.rooms = new Map(); // code -> room
    this.onRoomClosed = onRoomClosed;
    this.counters = { created: 0, closed: 0, joins: 0, rejects: {}, migrations: 0, hostReturns: 0, hostResumes: 0, raceLosses: 0 };
  }

  // ------------------------------------------------------------ helpers --
  newCode() {
    for (let tries = 0; tries < 1000; tries++) {
      let c = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) c += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      if (!this.rooms.has(c)) return c;
    }
    throw new Error('room code space exhausted');
  }
  reject(peer, reason, re, extra = {}) {
    this.counters.rejects[reason] = (this.counters.rejects[reason] || 0) + 1;
    this.send(peer, MSG.JOIN_REJECTED, { reason, re, ...extra });
    return { ok: false, reason };
  }
  error(peer, reason, re, extra = {}) {
    this.send(peer, MSG.ERROR, { reason, re, ...extra });
    return { ok: false, reason };
  }
  roomOf(peer) {
    return peer.roomCode ? this.rooms.get(peer.roomCode) || null : null;
  }
  seatOf(room, peerId) {
    return room.seats.find((s) => s.peerId === peerId) || null;
  }
  humans(room) {
    return room.seats.filter((s) => s.peerId !== null);
  }
  connectedHumans(room) {
    return room.seats.filter((s) => s.peerId !== null && s.connected);
  }
  isFree(seat, now = this.now()) {
    return seat.peerId === null && !(seat.holdUntil !== null && seat.holdUntil > now);
  }
  // CLASS SELECT (docs/CLASS_SELECT.md): every free seat, the Healer's
  // included once the host has moved off it. Guests fill 1-3 first.
  freeGuestSeats(room) {
    const now = this.now();
    const free = room.seats.filter((s) => this.isFree(s, now));
    return free.filter((s) => s.index > 0).concat(free.filter((s) => s.index === 0));
  }

  view(room) {
    return {
      code: room.code,
      state: room.state,
      visibility: room.visibility,
      name: room.name,
      build: room.build,
      dropIn: room.dropIn,
      quick: room.quick,
      hostPeerId: room.hostPeerId,
      hostSeat: room.hostPeerId ? this.seatOf(room, room.hostPeerId)?.index ?? null : null,
      seed: room.seed,
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      seats: room.seats.map((s) => ({
        index: s.index,
        classId: s.classId,
        peerId: s.peerId,
        name: s.name,
        ready: s.peerId && s.peerId === room.hostPeerId ? true : s.ready,
        connected: s.connected,
        rttMs: s.rttMs,
        ai: !s.peerId || !s.connected,
        held: !s.connected && s.peerId !== null,
        holdMs: s.holdUntil ? Math.max(0, s.holdUntil - this.now()) : null,
      })),
    };
  }
  broadcast(room, t, payload = {}, exceptPeerId = null) {
    for (const s of room.seats) {
      if (!s.peerId || !s.connected || s.peerId === exceptPeerId) continue;
      const p = room.peerRef.get(s.peerId);
      if (p) this.send(p, t, payload);
    }
  }
  pushState(room) {
    this.broadcast(room, MSG.ROOM_STATE, { room: this.view(room) });
  }

  // ------------------------------------------------------------- create --
  createRoom(peer, { visibility = 'private', name = null, dropIn = true, quick = false } = {}, re = MSG.CREATE_ROOM) {
    if (peer.roomCode) return this.error(peer, ERR.ALREADY_IN_ROOM, re);
    if (this.rooms.size >= this.maxRooms) return this.reject(peer, REJECT.SERVER_FULL, re);
    const code = this.newCode();
    const room = {
      code,
      visibility,
      name: sanitizeName(name || `${peer.name}'s camp`, `${peer.name}'s camp`),
      build: peer.build,
      protocol: peer.protocol,
      dropIn: dropIn !== false,
      quick: !!quick,
      state: 'lobby',
      createdAt: this.now(),
      startedAt: null,
      seed: null,
      hostPeerId: peer.id,
      hostLostAt: null,
      migrateAt: null,
      startAt: null,
      lastMatchStatusAt: 0,
      seats: Array.from({ length: MAX_SEATS }, (_, i) => newSeat(i)),
      peerRef: new Map(),
      keyframe: null,
      evicted: new Set(),
    };
    this.seatPeer(room, room.seats[0], peer);
    this.rooms.set(code, room);
    this.counters.created += 1;
    this.log('room_created', { code, visibility, host: peer.id, quick: room.quick });
    this.pushState(room);
    return { ok: true, room };
  }

  seatPeer(room, seat, peer) {
    seat.peerId = peer.id;
    seat.name = peer.name;
    seat.ready = false;
    seat.connected = true;
    seat.rttMs = peer.rttMs ?? null;
    seat.holdUntil = null;
    room.peerRef.set(peer.id, peer);
    peer.roomCode = room.code;
    peer.seat = seat.index;
  }

  // --------------------------------------------------------------- join --
  joinRoom(peer, code, wantSeat = null, re = MSG.JOIN_ROOM) {
    if (peer.roomCode) return this.error(peer, ERR.ALREADY_IN_ROOM, re);
    const room = code ? this.rooms.get(code) : null;
    if (!room || room.state === 'closed') return this.reject(peer, REJECT.NOT_FOUND, re, { code });
    if (room.evicted.has(peer.id)) return this.reject(peer, REJECT.NOT_FOUND, re, { code });
    if (room.protocol !== peer.protocol || room.build !== peer.build) {
      return this.reject(peer, REJECT.VERSION, re, { code, roomBuild: room.build, yourBuild: peer.build });
    }
    if (room.state === 'starting' || room.state === 'migrating') return this.reject(peer, REJECT.IN_PROGRESS_LOCKED, re, { code, state: room.state });
    if (room.state === 'in_game' && !room.dropIn) return this.reject(peer, REJECT.IN_PROGRESS_LOCKED, re, { code, state: room.state });
    const free = this.freeGuestSeats(room);
    if (free.length === 0) {
      this.counters.raceLosses += 1;
      return this.reject(peer, REJECT.FULL, re, { code });
    }
    const seat = (wantSeat !== null && free.find((s) => s.index === wantSeat)) || free[0];
    this.seatPeer(room, seat, peer);
    this.counters.joins += 1;
    this.log('join', { code, peer: peer.id, seat: seat.index, dropIn: room.state === 'in_game' });
    this.broadcast(room, MSG.PEER_JOINED, { peerId: peer.id, seat: seat.index, name: peer.name, dropIn: room.state === 'in_game' }, peer.id);
    this.pushState(room);
    if (room.quick && this.connectedHumans(room).length === 2) {
      const host = room.peerRef.get(room.hostPeerId);
      if (host) this.send(host, MSG.MATCH_STATUS, { queued: false, matched: true, code: room.code, waitedMs: this.now() - room.createdAt, openRooms: this.openRoomCount(peer) });
    }
    return { ok: true, room, seat: seat.index };
  }

  openRoomCount(peer) {
    let n = 0;
    for (const r of this.rooms.values()) {
      const hs = this.seatOf(r, r.hostPeerId);
      if (r.visibility === 'public' && r.state === 'lobby' && r.build === peer.build && r.protocol === peer.protocol && hs && hs.connected && this.freeGuestSeats(r).length > 0 && r.hostPeerId !== peer.id) n += 1;
    }
    return n;
  }

  // --------------------------------------------------------------- leave --
  leaveRoom(peer, { reason = 'leave', silent = false } = {}) {
    const room = this.roomOf(peer);
    if (!room) {
      if (!silent) this.error(peer, ERR.NOT_IN_ROOM, MSG.LEAVE_ROOM);
      return { ok: false };
    }
    const seat = this.seatOf(room, peer.id);
    const wasHost = room.hostPeerId === peer.id;
    if (seat) this.clearSeat(seat);
    room.peerRef.delete(peer.id);
    peer.roomCode = null;
    peer.seat = null;
    this.log('leave', { code: room.code, peer: peer.id, seat: seat?.index, reason, wasHost });
    if (seat) this.broadcast(room, MSG.PEER_LEFT, { peerId: peer.id, seat: seat.index, reason });
    if (wasHost) this.hostGone(room, reason);
    if (room.state !== 'closed') {
      if (this.humans(room).length === 0) this.closeRoom(room, 'empty');
      else this.pushState(room);
    }
    return { ok: true };
  }

  clearSeat(seat) {
    seat.peerId = null;
    seat.name = null;
    seat.ready = false;
    seat.connected = false;
    seat.rttMs = null;
    seat.holdUntil = null;
  }

  // The host left for good (explicit leave, hold expired, killed).
  hostGone(room, reason) {
    if (room.state === 'lobby' || room.state === 'starting') {
      // Lobby: pass the host to the next connected player, who keeps the
      // class they picked (CLASS SELECT) — nothing has started, so no state moves.
      const next = room.seats.filter((s) => s.peerId && s.connected).sort((a, b) => a.index - b.index)[0];
      if (!next) {
        this.closeRoom(room, 'host_left');
        return;
      }
      const p = room.peerRef.get(next.peerId);
      room.hostPeerId = p.id;
      room.state = 'lobby';
      room.startAt = null;
      for (const s of room.seats) s.ready = false;
      this.log('host_passed', { code: room.code, host: p.id, reason });
      this.broadcast(room, MSG.HOST_CHANGED, { hostPeerId: p.id, seat: p.seat, reason: 'lobby_host_left' });
      return;
    }
    // In game: migrate right away (an explicit leave needs no grace).
    this.migrate(room, reason);
  }

  // ---------------------------------------------------------- seat/ready --
  selectSeat(peer, want) {
    const room = this.roomOf(peer);
    if (!room) return this.error(peer, ERR.NOT_IN_ROOM, MSG.SELECT_SEAT);
    if (room.state !== 'lobby') return this.error(peer, ERR.WRONG_STATE, MSG.SELECT_SEAT, { state: room.state });
    // CLASS SELECT: any player, the host included, takes any free seat.
    const cur = this.seatOf(room, peer.id);
    const target = room.seats[want];
    if (!target) return this.error(peer, ERR.BAD_REQUEST, MSG.SELECT_SEAT);
    if (cur && cur.index === want) {
      this.pushState(room);
      return { ok: true };
    }
    if (!this.isFree(target)) return this.error(peer, ERR.SEAT_TAKEN, MSG.SELECT_SEAT, { seat: want });
    const rtt = cur ? cur.rttMs : null;
    if (cur) this.clearSeat(cur);
    this.seatPeer(room, target, peer);
    target.rttMs = rtt;
    this.pushState(room);
    return { ok: true };
  }

  setReady(peer, ready) {
    const room = this.roomOf(peer);
    if (!room) return this.error(peer, ERR.NOT_IN_ROOM, MSG.SET_READY);
    if (room.state !== 'lobby') return this.error(peer, ERR.WRONG_STATE, MSG.SET_READY, { state: room.state });
    const seat = this.seatOf(room, peer.id);
    if (seat) seat.ready = !!ready;
    this.pushState(room);
    return { ok: true };
  }

  // ---------------------------------------------------------------- start --
  startGame(peer, seed) {
    const room = this.roomOf(peer);
    if (!room) return this.error(peer, ERR.NOT_IN_ROOM, MSG.START_GAME);
    if (room.hostPeerId !== peer.id) return this.error(peer, ERR.NOT_HOST, MSG.START_GAME);
    if (room.state !== 'lobby') return this.error(peer, ERR.WRONG_STATE, MSG.START_GAME, { state: room.state });
    const notReady = room.seats.filter((s) => s.peerId && s.peerId !== room.hostPeerId && (!s.connected || !s.ready));
    if (notReady.length) return this.error(peer, ERR.NOT_READY, MSG.START_GAME, { seats: notReady.map((s) => s.index) });
    room.state = 'starting';
    room.seed = Number.isInteger(seed) ? seed >>> 0 : randomInt(0x7fffffff);
    room.startAt = this.now() + START_COUNTDOWN_MS;
    this.log('starting', { code: room.code, seed: room.seed });
    this.broadcast(room, MSG.GAME_STARTING, { countdownMs: START_COUNTDOWN_MS, seed: room.seed, seats: this.view(room).seats });
    this.pushState(room);
    return { ok: true };
  }

  // ---------------------------------------------------------- disconnect --
  // The peer's socket closed or went silent. Its seat is HELD (the AI plays
  // it); the host gets a grace window before migration.
  peerDropped(peer, why) {
    const room = this.roomOf(peer);
    if (!room) return;
    const seat = this.seatOf(room, peer.id);
    if (!seat || !seat.connected) return;
    const now = this.now();
    const holdMs = room.state === 'lobby' || room.state === 'starting' ? LOBBY_HOLD_MS : SEAT_HOLD_MS;
    seat.connected = false;
    seat.holdUntil = now + holdMs;
    this.log('peer_dropped', { code: room.code, peer: peer.id, seat: seat.index, why, holdMs });
    this.broadcast(room, MSG.PEER_DROPPED, { peerId: peer.id, seat: seat.index, holdMs, why });
    if (room.hostPeerId === peer.id && room.state === 'in_game') {
      room.state = 'migrating';
      room.hostLostAt = now;
      room.migrateAt = now + HOST_GRACE_MS;
      this.broadcast(room, MSG.HOST_LOST, { graceMs: HOST_GRACE_MS, hostPeerId: peer.id });
    }
    if (this.connectedHumans(room).length === 0 && room.state !== 'in_game' && room.state !== 'migrating') {
      // Nobody left to hold the lobby open beyond the hold window; the sweep closes it.
    }
    this.pushState(room);
  }

  // reconnect { token, code, fresh? } after hello resumed the identity.
  // `fresh` = the client is a page with no world for this session (the
  // title's "Rejoin" after a reload, a reopened tab) — a HOST coming back
  // that way gets the run back from the keyframe cache (resumeHost).
  reattach(peer, code, { fresh = false } = {}) {
    const room = code ? this.rooms.get(code) : null;
    if (!room || room.state === 'closed') return this.reject(peer, REJECT.NOT_FOUND, MSG.RECONNECT, { code, detail: 'room closed' });
    if (room.evicted.has(peer.id)) return this.reject(peer, REJECT.NOT_FOUND, MSG.RECONNECT, { code, detail: 'removed from the room' });
    const seat = this.seatOf(room, peer.id);
    if (!seat) return this.reject(peer, REJECT.NOT_FOUND, MSG.RECONNECT, { code, detail: 'seat hold expired' });
    const wasHost = room.hostPeerId === peer.id;
    if (fresh && wasHost && (room.state === 'in_game' || room.state === 'migrating')) return this.resumeHost(room, peer, seat);
    seat.connected = true;
    seat.holdUntil = null;
    seat.name = peer.name;
    room.peerRef.set(peer.id, peer);
    peer.roomCode = room.code;
    peer.seat = seat.index;
    if (wasHost && room.state === 'migrating') {
      room.state = 'in_game';
      room.hostLostAt = null;
      room.migrateAt = null;
      this.counters.hostReturns += 1;
    }
    this.log('peer_restored', { code: room.code, peer: peer.id, seat: seat.index, wasHost });
    this.broadcast(room, MSG.PEER_RESTORED, { peerId: peer.id, seat: seat.index, host: wasHost }, peer.id);
    this.pushState(room);
    return { ok: true, room, seat: seat.index, host: wasHost };
  }

  // ---------------------------------------------------------- host resume --
  // fix-M5b-r4 (NET4-F2). The host's page reloaded (F5, a crashed or closed
  // tab reopened, the game opened again in another tab) and it accepted
  // "Rejoin" — within the grace, or while its old tab still held the socket.
  // That page has NO world: letting it host would stream a fresh camp to the
  // party and wipe the run. It gets the room's newest keyframe instead —
  // the exact state tree it streamed <= 2 s before it went quiet, the same
  // state a migration hands a guest — via become_host { reason:
  // 'host_resume', keyframe, room }; the guests re-baseline on host_changed
  // { reason: 'host_resume' } (sequence spaces restart, as after a
  // migration). No usable keyframe (the host dropped before its first one):
  // migrate now to a guest (its view is the newest state) and the returning
  // player plays the Healer as a guest; nobody else in the room: the session
  // ends with an explicit answer.
  resumeHost(room, peer, seat) {
    const now = this.now();
    const kf = room.keyframe;
    const others = room.seats.filter((s) => s.peerId && s.connected && s.peerId !== peer.id);
    const lastHeard = kf ? (kf.hostPeerId === peer.id ? kf.hostLastSeenAt ?? kf.receivedAt : room.hostLostAt ?? now) : now;
    const stateAgeMs = kf ? Math.max(0, lastHeard - kf.receivedAt) : null;
    const usable = !!kf && stateAgeMs <= RESUME_MAX_STATE_AGE_MS;
    if (!usable && !others.length) {
      this.log('host_resume_failed', { code: room.code, peer: peer.id, keyframe: !!kf, stateAgeMs });
      this.closeRoom(room, 'host_reloaded');
      return this.reject(peer, REJECT.NOT_FOUND, MSG.RECONNECT, { code: room.code, detail: 'the session ended — nobody else was in it' });
    }
    seat.connected = true;
    seat.holdUntil = null;
    seat.name = peer.name;
    room.peerRef.set(peer.id, peer);
    peer.roomCode = room.code;
    peer.seat = seat.index;
    if (room.state === 'migrating') {
      room.state = 'in_game';
      room.hostLostAt = null;
      room.migrateAt = null;
    }
    if (!usable) {
      this.log('host_resume_migrate', { code: room.code, peer: peer.id, keyframe: !!kf, stateAgeMs });
      // A keyframe that misses more play than a guest's own view is no
      // state to continue from: the new host keeps its (newer) view.
      if (kf) room.keyframe = null;
      this.migrate(room, 'host_reloaded');
      return { ok: true, room, seat: seat.index, host: false };
    }
    this.counters.hostResumes += 1;
    const keyframe = { tick: kf.tick, bytes: kf.bytes.length, b64: kf.b64(), receivedAt: kf.receivedAt, stateAgeMs, ageMs: now - kf.receivedAt };
    this.log('host_resume', { code: room.code, peer: peer.id, seat: seat.index, keyframeTick: kf.tick, stateAgeMs });
    const view = this.view(room);
    this.send(peer, MSG.BECOME_HOST, { code: room.code, keyframe, seats: view.seats, hostSeat: seat.index, previousHost: peer.id, reason: 'host_resume', room: view });
    this.broadcast(room, MSG.HOST_CHANGED, { hostPeerId: peer.id, seat: seat.index, previousHost: peer.id, reason: 'host_resume', stateAgeMs }, peer.id);
    this.pushState(room);
    return { ok: true, room, seat: seat.index, host: true, resumed: true };
  }

  // ------------------------------------------------------------ migration --
  migrate(room, reason) {
    const candidates = room.seats.filter((s) => s.peerId && s.connected && s.peerId !== room.hostPeerId);
    const oldHost = room.hostPeerId;
    if (candidates.length === 0) {
      this.closeRoom(room, 'no_guests');
      return null;
    }
    candidates.sort((a, b) => (a.rttMs ?? 1e9) - (b.rttMs ?? 1e9) || a.index - b.index);
    const next = candidates[0];
    const p = room.peerRef.get(next.peerId);
    room.hostPeerId = p.id;
    room.state = 'in_game';
    room.hostLostAt = null;
    room.migrateAt = null;
    this.counters.migrations += 1;
    const kf = room.keyframe;
    const now = this.now();
    // stateAgeMs = how much play the keyframe misses: from its arrival to the
    // last moment anything was heard from the old host.
    const old = room.peerRef.get(oldHost);
    const lastHeard = Math.max(kf ? kf.hostLastSeenAt ?? 0 : 0, old && Number.isFinite(old.lastRecvAt) ? old.lastRecvAt : 0);
    const keyframe = kf
      ? { tick: kf.tick, bytes: kf.bytes.length, b64: kf.b64(), receivedAt: kf.receivedAt, stateAgeMs: Math.max(0, lastHeard - kf.receivedAt), ageMs: now - kf.receivedAt }
      : null;
    this.log('migrate', { code: room.code, from: oldHost, to: p.id, seat: next.index, reason, keyframeTick: keyframe?.tick ?? null, stateAgeMs: keyframe?.stateAgeMs ?? null });
    const seats = this.view(room).seats;
    this.send(p, MSG.BECOME_HOST, { code: room.code, keyframe, seats, hostSeat: next.index, previousHost: oldHost, reason });
    this.broadcast(room, MSG.HOST_CHANGED, { hostPeerId: p.id, seat: next.index, previousHost: oldHost, reason }, p.id);
    this.pushState(room);
    return p;
  }

  closeRoom(room, reason) {
    if (room.state === 'closed') return;
    room.state = 'closed';
    this.log('room_closed', { code: room.code, reason });
    this.broadcast(room, MSG.ERROR, { reason: 'room_closed', detail: reason, code: room.code });
    for (const s of room.seats) {
      const p = s.peerId ? room.peerRef.get(s.peerId) : null;
      if (p && p.roomCode === room.code) {
        p.roomCode = null;
        p.seat = null;
      }
    }
    this.rooms.delete(room.code);
    this.counters.closed += 1;
    this.onRoomClosed(room, reason);
  }

  // --------------------------------------------------------------- sweep --
  // Called by the server every ~100 ms: countdowns, seat holds, host grace,
  // quick-match status.
  sweep() {
    const now = this.now();
    for (const room of [...this.rooms.values()]) {
      if (room.state === 'starting' && room.startAt !== null && now >= room.startAt) {
        room.state = 'in_game';
        room.startedAt = now;
        room.startAt = null;
        this.log('in_game', { code: room.code });
        this.pushState(room);
      }
      if (room.state === 'migrating' && room.migrateAt !== null && now >= room.migrateAt) {
        this.migrate(room, 'host_timeout');
        if (room.state === 'closed') continue;
      }
      for (const s of room.seats) {
        if (s.peerId && !s.connected && s.holdUntil !== null && now >= s.holdUntil) {
          const p = room.peerRef.get(s.peerId);
          const wasHost = room.hostPeerId === s.peerId;
          const pid = s.peerId;
          this.clearSeat(s);
          room.peerRef.delete(pid);
          if (p && p.roomCode === room.code) {
            p.roomCode = null;
            p.seat = null;
          }
          this.log('hold_expired', { code: room.code, peer: pid, seat: s.index });
          this.broadcast(room, MSG.PEER_LEFT, { peerId: pid, seat: s.index, reason: 'hold_expired' });
          if (wasHost && room.state !== 'closed') this.hostGone(room, 'hold_expired');
          if (room.state === 'closed') break;
          this.pushState(room);
        }
      }
      if (room.state === 'closed') continue;
      if (this.humans(room).length === 0) {
        this.closeRoom(room, 'empty');
        continue;
      }
      if (this.connectedHumans(room).length === 0 && room.state !== 'migrating') {
        // Everyone is disconnected with holds pending — keep until they expire.
      }
      if (room.quick && room.state === 'lobby' && this.connectedHumans(room).length === 1 && now - room.lastMatchStatusAt >= 1000) {
        room.lastMatchStatusAt = now;
        const host = room.peerRef.get(room.hostPeerId);
        const waited = now - room.createdAt;
        if (host && host.conn) this.send(host, MSG.MATCH_STATUS, { queued: true, code: room.code, waitedMs: waited, openRooms: this.openRoomCount(host), offerStart: waited >= 15000 });
      }
    }
  }

  // Admin: close the host's link and bar it from the room (migration test).
  evictHost(code) {
    const room = this.rooms.get(code);
    if (!room) return null;
    const host = room.peerRef.get(room.hostPeerId) || null;
    room.evicted.add(room.hostPeerId);
    return { room, host };
  }

  stats() {
    return {
      rooms: [...this.rooms.values()].map((r) => ({
        ...this.view(r),
        keyframe: r.keyframe ? { tick: r.keyframe.tick, bytes: r.keyframe.bytes.length, ageMs: this.now() - r.keyframe.receivedAt } : null,
      })),
      counters: this.counters,
    };
  }
}
