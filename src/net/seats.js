// Seat model for network play (docs/gauntlet/PLAN.md §3.7). Owner: M5b.
// Seat index == party index: seat 0 = the Healer, 1 Tank, 2 Swordsman,
// 3 Archer. CLASS SELECT (docs/CLASS_SELECT.md): any player, the host
// included, takes any free seat; an empty seat 0 is the leader bot's. Pure data.
//
// PARTY LINEUP (docs/LINEUP.md): which class holds seats 1-3 is the run's
// lineup (data/lineup.js). SEAT_CLASSES / SEAT_LABELS / SEAT_CRITTERS stay
// the default four (the class list, in picker order); a seat's label,
// critter and class come from seatLabel / seatCritter / seatClass.
import { classOfSeat } from '../data/lineup.js';

export const SEAT_CLASSES = Object.freeze(['healer', 'tank', 'swordsman', 'archer']);
export const SEAT_LABELS = Object.freeze(['Healer', 'Tank', 'Swordsman', 'Archer']);
export const SEAT_CRITTERS = Object.freeze(['Mouse', 'Badger', 'Fox', 'Hare']);
export const CLASS_LABEL = Object.freeze({ healer: 'Healer', tank: 'Tank', swordsman: 'Swordsman', archer: 'Archer', tidecaller: 'Tidecaller' });
export const CLASS_CRITTER = Object.freeze({ healer: 'Mouse', tank: 'Badger', swordsman: 'Fox', archer: 'Hare', tidecaller: 'Otter' });

export const seatClass = (i) => classOfSeat(i);
export const seatLabel = (i) => CLASS_LABEL[classOfSeat(i)] ?? `Seat ${i + 1}`;
export const seatCritter = (i) => CLASS_CRITTER[classOfSeat(i)] ?? '';

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
// sockets) are right now: the HOST's (PLAN §3.7), whichever seat it plays —
// CLASS SELECT (docs/CLASS_SELECT.md) lets the host pick any class, and the
// seat-0 leader bot plays the Healer's combat only. Guests' read-only
// banners name this seat.
export function chooserSeat(room) {
  if (!room || !Array.isArray(room.seats)) return 0;
  const hostSeat = room.seats.find((s) => s && s.peerId && s.peerId === room.hostPeerId);
  return hostSeat ? hostSeat.index : 0;
}
