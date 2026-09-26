// Seat model for network play (docs/gauntlet/PLAN.md §3.7). Owner: M5b.
// Seat index == party index: seat 0 = the Healer (the host, or the leader
// bot after a migration), 1 Tank, 2 Swordsman, 3 Archer. Pure data.
export const SEAT_CLASSES = Object.freeze(['healer', 'tank', 'swordsman', 'archer']);
export const SEAT_LABELS = Object.freeze(['Healer', 'Tank', 'Swordsman', 'Archer']);
export const SEAT_CRITTERS = Object.freeze(['Mouse', 'Badger', 'Fox', 'Hare']);

export const seatLabel = (i) => SEAT_LABELS[i] ?? `Seat ${i + 1}`;
export const seatClass = (i) => SEAT_CLASSES[i] ?? null;

// Human-readable reasons for a seat_control change (net HUD toasts).
export function seatControlText(ev, nameOf = () => null) {
  const who = nameOf(ev.partyIndex) || seatLabel(ev.partyIndex);
  const cls = seatLabel(ev.partyIndex);
  if (ev.controller === 'ai') {
    switch (ev.reason) {
      case 'away':
        return `${who} stepped away — AI plays the ${cls}`;
      case 'drop':
        return `${who} lost connection — AI plays the ${cls}`;
      case 'migrate':
        return `The ${cls} is played by AI`;
      default:
        return `AI plays the ${cls}`;
    }
  }
  switch (ev.reason) {
    case 'return':
      return `${who} is back on the ${cls}`;
    case 'migrate':
      return `${who} keeps the ${cls}`;
    default:
      return `${who} took the ${cls}`;
  }
}

// chooserSeat(room) — whose call the between-room choices (draft, door, shop,
// sockets) are right now: the HOST's (PLAN §3.7) — except while the leader
// bot plays the Healer for a host that is not seat 0 (after a migration with
// nobody on seat 0: the bot makes the Healer's choices). A human back on
// seat 0 (the old host accepting "Rejoin", a drop-in) hands the choices to
// the host. Guests' read-only banners name this seat.
export function chooserSeat(room) {
  if (!room || !Array.isArray(room.seats)) return 0;
  const hostSeat = room.seats.find((s) => s && s.peerId && s.peerId === room.hostPeerId);
  if (!hostSeat || hostSeat.index === 0) return 0;
  const s0 = room.seats.find((s) => s && s.index === 0);
  return s0 && s0.peerId && s0.connected !== false ? hostSeat.index : 0;
}
