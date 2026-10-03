// Quick match (docs/gauntlet/PLAN.md §3.7). Owner: M5a.
//
// quick_match: join the OLDEST public room in `lobby` with a free seat and the
// same protocol + build; if the join loses a race (the last seat went to a
// peer processed a moment earlier) try the next candidate; with no candidate
// left, create a public quick room and wait as its host. While alone the host
// receives match_status { queued, waitedMs, openRooms } once a second, with
// offerStart: true after 15 s ("Start now — AI fills the empty seats").
// A matched joiner receives match_found { code } before the room_state.
import { MSG, QUICK_MATCH_ALONE_MS } from '../src/net/protocol/constants.js';
import { ERR } from '../src/net/protocol/messages.js';

export function quickMatch(lobby, peer) {
  if (peer.roomCode) return lobby.error(peer, ERR.ALREADY_IN_ROOM, MSG.QUICK_MATCH);
  const candidates = [...lobby.rooms.values()]
    .filter((r) => r.visibility === 'public' && r.state === 'lobby' && r.protocol === peer.protocol && r.build === peer.build && !r.evicted.has(peer.id) && hostOnline(lobby, r))
    .sort((a, b) => a.createdAt - b.createdAt || (a.code < b.code ? -1 : 1));
  for (const room of candidates) {
    if (lobby.freeGuestSeats(room).length === 0) continue;
    // Silence the per-room rejection: a lost race just moves to the next room.
    const res = tryJoinQuiet(lobby, peer, room);
    if (res.ok) {
      lobby.send(peer, MSG.MATCH_FOUND, { code: room.code, seat: res.seat, waitedMs: 0 });
      return res;
    }
  }
  const made = lobby.createRoom(peer, { visibility: 'public', quick: true }, MSG.QUICK_MATCH);
  if (made.ok) {
    made.room.lastMatchStatusAt = lobby.now();
    lobby.send(peer, MSG.MATCH_STATUS, { queued: true, code: made.room.code, waitedMs: 0, openRooms: 0, offerStart: false, aloneMs: QUICK_MATCH_ALONE_MS });
  }
  return made;
}

// Never match a player into a room whose host is offline (seat held while
// the host reloads / reconnects): it could not start the game.
function hostOnline(lobby, room) {
  const s = lobby.seatOf(room, room.hostPeerId);
  return !!(s && s.connected);
}

function tryJoinQuiet(lobby, peer, room) {
  const sent = [];
  const realSend = lobby.send;
  // Capture a rejection instead of sending it (the peer is routed onward).
  lobby.send = (p, t, payload) => {
    if (p === peer && t === MSG.JOIN_REJECTED) sent.push(payload);
    else realSend(p, t, payload);
  };
  try {
    return lobby.joinRoom(peer, room.code, null, MSG.QUICK_MATCH);
  } finally {
    lobby.send = realSend;
  }
}

// cancel_match: leave the quick room we are waiting in (closes it when alone),
// or leave whatever room we are in.
export function cancelMatch(lobby, peer) {
  const room = lobby.roomOf(peer);
  if (!room) {
    lobby.send(peer, MSG.MATCH_STATUS, { queued: false, cancelled: true });
    return { ok: true };
  }
  lobby.leaveRoom(peer, { reason: 'cancel_match', silent: true });
  lobby.send(peer, MSG.MATCH_STATUS, { queued: false, cancelled: true });
  return { ok: true };
}
