// Direct peer links for co-op (WEBRTC CO-OP, docs/WEBRTC_COOP.md).
// ISOMORPHIC in the sense that matters: with no RTCPeerConnection (Node
// bots, an old browser, ?p2p=0) the mesh is simply off and every frame keeps
// taking the server relay, exactly as before.
//
// Topology follows the game's authority: a star around the HOST. The host
// opens one RTCPeerConnection per connected guest seat; a guest answers the
// host's offer. The server matches the players (rooms, codes, quick match)
// and forwards the signalling (`rtc` control messages); after that the
// game's binary frames go browser to browser:
//   'r'  ordered + reliable    EVENTS, CMD, and any frame over UNREL_MAX bytes
//   'u'  unordered, 0 retries  SNAP, INPUT, EVENTS_U (the classes the relay's
//                              conditioner already treats as unreliable — the
//                              protocol is built for their loss: input
//                              redundancy, snapshot baselines/acks, the
//                              EVENTS_U resend)
// A link that is not open within CONNECT_MS, goes quiet for SILENT_MS, or
// closes mid-game is dropped and its seat stays on the relay for the rest of
// that seat's connection (a reconnect of that player tries again). The game
// never waits on a link: until one is 'direct', frames take the relay.
//
//   const mesh = createMesh({ signal: (m) => ws.sendControl(m), deliver, log });
//   mesh.sync({ room, peerId });          // on every room change
//   mesh.onSignal(m);                     // an `rtc` control message
//   mesh.send(seat, u8) -> bool           // false = use the relay
//   mesh.isDirect(seat); mesh.paths() -> { [seat]: 'direct'|'connecting'|'relay' }
//   mesh.on('path', fn)                   // { seat, path, prev, reason }
import { BIN, MAX_SEATS } from './protocol/constants.js';
import { isUnreliableChannel, withSeat } from './protocol/codec.js';

export const CONNECT_MS = 6000;
export const SILENT_MS = 4000;
export const HEARTBEAT_MS = 500;
export const UNREL_MAX = 1150; // one SCTP packet: a bigger frame rides 'r'
export const BUFFER_LIMIT = 4 * 1024 * 1024; // a link this far behind is dead weight
const HEARTBEAT = 0xf0;
// The heartbeat doubles as the peer ping: [HEARTBEAT, PING, f64 sent-at]
// out, the same 8 bytes back as [HEARTBEAT, PONG, …] — the sender's clock on
// both ends, so no clock sync. The chip shows the median of the last few.
const PING = 1;
const PONG = 2;
const RTT_SAMPLES = 5;
// Public STUN only (no TURN on the free plan): players whose networks block a
// direct path stay on the relay, which is the fallback for exactly that.
export const ICE_SERVERS = Object.freeze([{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }]);

// What each side may receive on a direct link (the server used to check this).
const FROM_GUEST = Object.freeze({ [BIN.INPUT]: 1024, [BIN.CMD]: 4096 });
const FROM_HOST = Object.freeze({ [BIN.SNAP]: 256 * 1024, [BIN.EVENTS]: 256 * 1024, [BIN.EVENTS_U]: 256 * 1024, [BIN.CMD]: 4096 });

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function meshSupported(RTC = typeof RTCPeerConnection !== 'undefined' ? RTCPeerConnection : null) {
  return typeof RTC === 'function';
}

// connectMs / silentMs: the connect window and the silence limit (the
// defaults above; ?p2pwait=ms stretches both alike for a machine whose pages
// crawl, such as a software-GL probe browser).
export function createMesh({ signal, deliver, log = () => {}, now = defaultNow, enabled = true, RTC = null, iceServers = ICE_SERVERS, connectMs = CONNECT_MS, silentMs = SILENT_MS } = {}) {
  const PC = RTC || (typeof RTCPeerConnection !== 'undefined' ? RTCPeerConnection : null);
  const on = enabled && typeof PC === 'function';
  const listeners = new Map();
  // seat -> link. A HOST holds one per guest seat; a GUEST at most one (to
  // the host's seat).
  const links = new Map();
  // seat -> 'failed' for the (seat, peerId) pair that already fell back: no
  // second try until that player's connection changes.
  const failedFor = new Map();
  let me = { role: 'none', seat: null, peerId: null, hostSeat: null, code: null };
  let nextId = 1;
  let beat = null;
  const counters = { offers: 0, opened: 0, fallbacks: 0, framesOut: 0, framesIn: 0, bytesOut: 0, bytesIn: 0, refused: 0, maxFrameOut: 0, lastError: null };

  function emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try {
        fn(payload);
      } catch {
        /* a listener never breaks the mesh */
      }
    }
  }

  function setPath(L, path, reason = null) {
    if (L.path === path) return;
    const prev = L.path;
    L.path = path;
    log('p2p_path', { seat: L.seat, path, prev, reason });
    emit('path', { seat: L.seat, path, prev, reason });
  }

  function newLink(seat, peerId, id, initiator) {
    let pc;
    try {
      pc = new PC({ iceServers });
    } catch (err) {
      log('p2p_pc_error', { error: String(err && err.message) });
      return null;
    }
    const L = { seat, peerId, id, initiator, pc, r: null, u: null, path: 'relay', startedAt: now(), openAt: null, lastRecvAt: now(), rtts: [], pendingCands: [], outCands: [], described: false, remoteSet: false, closed: false, timer: null };
    links.set(seat, L);
    pc.onicecandidate = (ev) => {
      if (L.closed || !ev.candidate || !ev.candidate.candidate) return;
      const c = ev.candidate;
      const m = { t: 'rtc', to: seat, id: L.id, kind: 'cand', cand: { candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null } };
      // Candidates gather while setLocalDescription runs: hold them until the
      // offer / answer itself has gone, or the far end has no link to add them to.
      if (L.described) signal(m);
      else L.outCands.push(m);
    };
    pc.onconnectionstatechange = () => {
      if (L.closed) return;
      const s = pc.connectionState;
      if (s === 'failed' || s === 'closed') fail(L, `pc_${s}`);
    };
    pc.oniceconnectionstatechange = () => {
      if (L.closed) return;
      if (pc.iceConnectionState === 'failed') fail(L, 'ice_failed');
    };
    // Pre-negotiated ids: both ends create the same two channels, so they
    // ride the one offer and no 'datachannel' event can race the first frame.
    wire(L, pc.createDataChannel('r', { ordered: true, negotiated: true, id: 0 }), 'r');
    wire(L, pc.createDataChannel('u', { ordered: false, maxRetransmits: 0, negotiated: true, id: 1 }), 'u');
    L.timer = setTimeout(() => {
      if (!L.closed && L.path !== 'direct') fail(L, 'timeout');
    }, connectMs);
    setPath(L, 'connecting');
    return L;
  }

  function wire(L, dc, which) {
    dc.binaryType = 'arraybuffer';
    L[which] = dc;
    dc.onopen = () => {
      if (L.closed) return;
      if (L.r && L.u && L.r.readyState === 'open' && L.u.readyState === 'open') {
        clearTimeout(L.timer);
        L.openAt = now();
        L.lastRecvAt = now();
        counters.opened += 1;
        log('p2p_open', { seat: L.seat, ms: Math.round(L.openAt - L.startedAt) });
        setPath(L, 'direct');
        ensureBeat();
      }
    };
    dc.onclose = () => {
      if (!L.closed) fail(L, `dc_${which}_closed`);
    };
    dc.onerror = (ev) => {
      const e = ev && ev.error;
      counters.lastError = e ? `${e.errorDetail || ''} ${e.message || ''} sctp=${e.sctpCauseCode ?? ''}`.trim() : 'error';
      if (!L.closed && L.path === 'direct') fail(L, `dc_${which}_error`);
    };
    dc.onmessage = (ev) => {
      if (L.closed) return;
      L.lastRecvAt = now();
      const d = ev.data;
      const u8 = d instanceof ArrayBuffer ? new Uint8Array(d) : ArrayBuffer.isView(d) ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : null;
      if (!u8 || u8.length < 2) return;
      if (u8[0] === HEARTBEAT) {
        beatIn(L, u8);
        return;
      }
      receive(L, u8);
    };
  }

  function beatIn(L, u8) {
    if (u8.length !== 10) return;
    if (u8[1] === PING) {
      const back = new Uint8Array(u8);
      back[1] = PONG;
      try {
        if (L.u && L.u.readyState === 'open') L.u.send(back);
      } catch {
        /* the close handler takes it */
      }
    } else if (u8[1] === PONG) {
      const sent = new DataView(u8.buffer, u8.byteOffset, u8.byteLength).getFloat64(2);
      const ms = now() - sent;
      if (!(ms >= 0 && ms < 60000)) return;
      L.rtts.push(ms);
      if (L.rtts.length > RTT_SAMPLES) L.rtts.shift();
    }
  }
  function beatOut() {
    const u8 = new Uint8Array(10);
    u8[0] = HEARTBEAT;
    u8[1] = PING;
    new DataView(u8.buffer).setFloat64(2, now());
    return u8;
  }

  function receive(L, u8) {
    const allowed = me.role === 'host' ? FROM_GUEST : FROM_HOST;
    const max = allowed[u8[0]];
    if (max === undefined || u8.length > max || L.path !== 'direct') {
      counters.refused += 1;
      return;
    }
    counters.framesIn += 1;
    counters.bytesIn += u8.length;
    // As the relay would have stamped it: a guest's frame carries its seat.
    deliver(me.role === 'host' ? withSeat(u8, L.seat) : u8);
  }

  function close(L, reason) {
    if (L.closed) return;
    L.closed = true;
    clearTimeout(L.timer);
    for (const dc of [L.r, L.u]) {
      if (!dc) continue;
      dc.onopen = dc.onclose = dc.onerror = dc.onmessage = null;
      try {
        dc.close();
      } catch {
        /* ignore */
      }
    }
    try {
      L.pc.onicecandidate = L.pc.onconnectionstatechange = L.pc.oniceconnectionstatechange = null;
      L.pc.close();
    } catch {
      /* ignore */
    }
    if (links.get(L.seat) === L) links.delete(L.seat);
    if (L.path !== 'relay') {
      const prev = L.path;
      L.path = 'relay';
      log('p2p_path', { seat: L.seat, path: 'relay', prev, reason });
      emit('path', { seat: L.seat, path: 'relay', prev, reason });
    }
  }
  // A link that cannot carry the game: back to the relay for this player's
  // connection (the seat keeps playing — frames simply take the server).
  function fail(L, reason) {
    if (L.closed) return;
    counters.fallbacks += 1;
    failedFor.set(L.seat, L.peerId);
    log('p2p_fallback', { seat: L.seat, reason, wasDirect: L.path === 'direct' });
    close(L, reason);
  }

  function ensureBeat() {
    if (beat) return;
    let lastBeat = now();
    beat = setInterval(() => {
      const t = now();
      // This page stalled (the beat ran seconds late): frames that arrived
      // meanwhile are still queued, so silence is judged on the next beat.
      const late = t - lastBeat > HEARTBEAT_MS * 4;
      lastBeat = t;
      for (const L of [...links.values()]) {
        if (L.path !== 'direct') continue;
        if (!late && t - L.lastRecvAt > silentMs) {
          fail(L, 'silent');
          continue;
        }
        if (L.r && L.r.bufferedAmount > BUFFER_LIMIT) {
          fail(L, 'backlog');
          continue;
        }
        try {
          if (L.u && L.u.readyState === 'open') L.u.send(beatOut());
        } catch {
          /* the close handler takes it */
        }
      }
      if (!links.size) {
        clearInterval(beat);
        beat = null;
      }
    }, HEARTBEAT_MS);
  }

  function described(L) {
    L.described = true;
    for (const m of L.outCands.splice(0)) signal(m);
  }

  // ------------------------------------------------------------- host --
  async function offer(seat, peerId) {
    const L = newLink(seat, peerId, nextId++, true);
    if (!L) return;
    counters.offers += 1;
    try {
      const o = await L.pc.createOffer();
      if (L.closed) return;
      await L.pc.setLocalDescription(o);
      if (L.closed) return;
      signal({ t: 'rtc', to: seat, id: L.id, kind: 'offer', sdp: L.pc.localDescription.sdp });
      described(L);
    } catch (err) {
      fail(L, `offer_${String(err && err.name)}`);
    }
  }

  // -------------------------------------------------------- signalling --
  async function onSignal(m) {
    if (!on || !m || !Number.isInteger(m.from) || !Number.isInteger(m.id)) return;
    if (me.role === 'guest') {
      if (m.from !== me.hostSeat) return;
      let L = links.get(m.from);
      if (m.kind === 'offer') {
        // A new offer replaces whatever link to the host this page had.
        if (L) close(L, 'replaced');
        failedFor.delete(m.from);
        L = newLink(m.from, null, m.id, false);
        if (!L) return;
        try {
          await L.pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
          if (L.closed) return;
          L.remoteSet = true;
          for (const c of L.pendingCands.splice(0)) await addCand(L, c);
          const a = await L.pc.createAnswer();
          if (L.closed) return;
          await L.pc.setLocalDescription(a);
          if (L.closed) return;
          signal({ t: 'rtc', to: m.from, id: L.id, kind: 'answer', sdp: L.pc.localDescription.sdp });
          described(L);
        } catch (err) {
          fail(L, `answer_${String(err && err.name)}`);
        }
        return;
      }
      if (!L || L.id !== m.id) return;
      if (m.kind === 'cand') await addCand(L, m.cand);
      return;
    }
    if (me.role === 'host') {
      const L = links.get(m.from);
      if (!L || L.id !== m.id || L.closed) return;
      if (m.kind === 'answer' && !L.remoteSet) {
        try {
          await L.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp });
          if (L.closed) return;
          L.remoteSet = true;
          for (const c of L.pendingCands.splice(0)) await addCand(L, c);
        } catch (err) {
          fail(L, `remote_${String(err && err.name)}`);
        }
      } else if (m.kind === 'cand') await addCand(L, m.cand);
    }
  }
  async function addCand(L, c) {
    if (!c || L.closed) return;
    if (!L.remoteSet) {
      L.pendingCands.push(c);
      return;
    }
    try {
      await L.pc.addIceCandidate(c);
    } catch {
      /* one bad candidate is not a failed link */
    }
  }

  // ---------------------------------------------------------- the room --
  // Reconcile the links with the room: the host offers to every connected
  // guest seat it has no link to (and has not already failed with); links to
  // seats that emptied, changed hands or dropped are closed; a change of host
  // (migration, resume) or of room rebuilds everything.
  function sync({ room, peerId }) {
    if (!on) return;
    const mySeat = room ? room.seats.find((s) => s.peerId === peerId) : null;
    const role = !room || !mySeat || room.state === 'closed' ? 'none' : room.hostPeerId === peerId ? 'host' : 'guest';
    const hostSeat = room ? (room.seats.find((s) => s.peerId && s.peerId === room.hostPeerId)?.index ?? null) : null;
    const code = room ? room.code : null;
    if (role !== me.role || code !== me.code || hostSeat !== me.hostSeat || (mySeat ? mySeat.index : null) !== me.seat || peerId !== me.peerId) {
      reset('topology');
      me = { role, seat: mySeat ? mySeat.index : null, peerId, hostSeat, code };
    }
    if (role === 'host') {
      for (const s of room.seats) {
        if (s.index === me.seat) continue;
        const L = links.get(s.index);
        const live = !!(s.peerId && s.connected);
        if (L && (!live || L.peerId !== s.peerId)) close(L, live ? 'seat_changed' : 'seat_left');
        if (!live) {
          failedFor.delete(s.index);
          continue;
        }
        if (failedFor.has(s.index) && failedFor.get(s.index) !== s.peerId) failedFor.delete(s.index);
        if (!links.has(s.index) && !failedFor.has(s.index)) offer(s.index, s.peerId);
      }
    } else if (role === 'guest') {
      const hs = hostSeat !== null ? room.seats[hostSeat] : null;
      const L = links.get(hostSeat);
      if (L && (!hs || !hs.connected)) close(L, 'host_away');
    }
  }
  function reset(reason = 'reset') {
    for (const L of [...links.values()]) close(L, reason);
    failedFor.clear();
  }

  // ------------------------------------------------------------- send --
  // Carry one binary frame to `seat` on its direct link. false = not direct
  // (or the frame cannot go this way): the caller sends it on the relay.
  function send(seat, u8) {
    const L = links.get(seat);
    if (!L || L.path !== 'direct') return false;
    const unrel = isUnreliableChannel(u8[0]) && u8.length <= UNREL_MAX;
    const dc = unrel ? L.u : L.r;
    if (!dc || dc.readyState !== 'open') return false;
    const maxMsg = L.pc.sctp && Number.isFinite(L.pc.sctp.maxMessageSize) && L.pc.sctp.maxMessageSize > 0 ? L.pc.sctp.maxMessageSize : 256 * 1024;
    if (u8.length > maxMsg) return false;
    try {
      dc.send(u8);
    } catch {
      fail(L, 'send_error');
      return false;
    }
    counters.framesOut += 1;
    counters.bytesOut += u8.length;
    if (u8.length > counters.maxFrameOut) counters.maxFrameOut = u8.length;
    return true;
  }

  function paths() {
    const out = {};
    for (let i = 0; i < MAX_SEATS; i++) {
      const L = links.get(i);
      if (L) out[i] = L.path;
    }
    return out;
  }

  return {
    get enabled() {
      return on;
    },
    get role() {
      return me.role;
    },
    get hostSeat() {
      return me.hostSeat;
    },
    sync,
    onSignal,
    // When the newest frame (game or heartbeat) arrived on any direct link.
    lastRecvAt() {
      let t = -Infinity;
      for (const L of links.values()) if (L.path === 'direct' && L.lastRecvAt > t) t = L.lastRecvAt;
      return t;
    },
    send,
    reset,
    isDirect: (seat) => {
      const L = links.get(seat);
      return !!(L && L.path === 'direct');
    },
    // seat -> 'direct' | 'connecting' (seats with no link are on the relay).
    paths,
    pathOf(seat) {
      const L = links.get(seat);
      return L ? L.path : 'relay';
    },
    on(type, fn) {
      let set = listeners.get(type);
      if (!set) listeners.set(type, (set = new Set()));
      set.add(fn);
      return () => set.delete(fn);
    },
    // Probe hook: break one seat's direct link as a dead network would.
    debugDrop(seat, reason = 'debug_drop') {
      const L = links.get(seat);
      if (!L) return false;
      fail(L, reason);
      return true;
    },
    // The round trip to `seat` over its direct link (median of the last few
    // heartbeats, ms), or null when not direct or not measured yet.
    rttOf(seat) {
      const L = links.get(seat);
      if (!L || L.path !== 'direct' || !L.rtts.length) return null;
      const a = [...L.rtts].sort((x, y) => x - y);
      return Math.round(a[a.length >> 1] * 10) / 10;
    },
    stats() {
      const per = {};
      for (const L of links.values()) per[L.seat] = { path: L.path, rttMs: L.rtts.length ? Math.round(L.rtts[L.rtts.length - 1]) : null, openMs: L.openAt === null ? null : Math.round(L.openAt - L.startedAt), lastRecvAgoMs: Math.round(now() - L.lastRecvAt) };
      return { enabled: on, role: me.role, links: per, ...counters };
    },
  };
}
