// Seat focus (docs/HIT_FEEDBACK.md "Your hits stand out"; game feel audit
// picks 1 and 2, /mnt/project-files/game-feel/GAME_FEEL_AUDIT.md): three AI
// heroes land most of a room's hits and kills, so their feedback is turned
// down beside yours. Another hero's hit on a foe plays its impact sounds
// SEAT_FOCUS.partyHitDb quieter and draws its contact bloom, flare and flash
// at partyFlare; another hero's action never kicks or dollies your camera;
// a kill another hero lands shakes the screen at partyKillShake. Your own
// hits, and anything no hero landed (a relic, a hazard, a keg), keep the
// full beat. Render and audio only: no sim import, the goldens cannot move.
//
// A module-level singleton like render/hold.js:
//   wireSeatFocus({ bus, byId })   once, from main.js, before any listener
//                                  that reads a kill's seat
//   eventSeat(ev)                  the hero seat behind an event, or null
//   isPartySeat(seat)              another hero's seat (not yours, not null)
//   killSeat(tick)                 the seat that landed the last kill on
//                                  that tick (a kill's screenshake follows
//                                  its death event on the same tick)
//   shakeFocus(ev)                 the gain on a `screenshake` event
//   hitGainDb(ev)                  the dB on an event's sounds
import { viewerSeat } from '../../app/viewerseat.js';
import { hitterSeat } from '../numbers.js';

export const SEAT_FOCUS = Object.freeze({
  partyHitDb: -4, // dB on another hero's hit sounds (impact families, the snap, its crit)
  partyFlare: 0.6, // size of another hero's contact bloom, flare and flash
  partyCamera: 0, // gain on a kick or dolly from another hero's action
  partyKillShake: 1 / 3, // the kill shake when another hero lands the kill
  mapCap: 512, // bodies remembered for their last hitter
});

let byIdFn = () => null;
const lastHitter = new Map(); // foe id -> the seat of its last hit (null: no hero)
const zoneSeat = new Map(); // zone id -> its caster's seat (a zone can be gone by zone_expire)
let lastKill = { tick: -1, seat: null };

const seatOfBody = (b) => (b && Number.isInteger(b.partyIndex) ? b.partyIndex : null);

// A hit's hero: the attacker's seat, or a zone's caster for a zone's strike.
function hitSeat(ev) {
  const s = hitterSeat(ev, byIdFn);
  if (s !== null || ev.attacker == null) return s;
  const a = byIdFn(ev.attacker);
  return a && a.sourceId != null ? seatOfBody(byIdFn(a.sourceId)) : (zoneSeat.get(ev.attacker) ?? null);
}

export function eventSeat(ev) {
  if (!ev) return null;
  if (ev.type === 'hit') return hitSeat(ev);
  if (ev.type === 'death') return lastHitter.get(ev.id) ?? null;
  if (Number.isInteger(ev.partyIndex)) return ev.partyIndex;
  if (Number.isInteger(ev.seat)) return ev.seat;
  // The Healer's own kit casts carry no classId and no seat: seat 0.
  if (ev.type === 'skill_cast' && !ev.classId) return 0;
  if (ev.id == null) return null;
  if (zoneSeat.has(ev.id)) return zoneSeat.get(ev.id);
  const b = byIdFn(ev.id);
  if (!b) return null;
  if (b.kind === 'zone') return b.sourceId != null ? seatOfBody(byIdFn(b.sourceId)) : null;
  return seatOfBody(b);
}

export const isPartySeat = (seat) => Number.isInteger(seat) && seat !== viewerSeat();

export function killSeat(tick) {
  return lastKill.tick === tick ? lastKill.seat : null;
}

// The dB on an event's cues (audio engine setEventGain): another hero's hit
// on a foe plays partyHitDb quieter; everything else unchanged.
export function hitGainDb(ev) {
  return ev && ev.type === 'hit' && isPartySeat(eventSeat(ev)) ? SEAT_FOCUS.partyHitDb : 0;
}

// The gain on a `screenshake`: a kill another hero landed shakes at
// partyKillShake; yours, one no hero landed and every other cause at 1.
export function shakeFocus(ev) {
  return ev && ev.cause === 'kill' && isPartySeat(killSeat(ev.tick)) ? SEAT_FOCUS.partyKillShake : 1;
}

export function wireSeatFocus({ bus, byId }) {
  if (typeof byId === 'function') byIdFn = byId;
  bus.on('hit', (ev) => {
    if (ev.kind === 'player' || ev.kind === 'ally') return;
    if (lastHitter.size > SEAT_FOCUS.mapCap) lastHitter.clear();
    lastHitter.set(ev.target, hitSeat(ev));
  });
  bus.on('zone_spawn', (ev) => {
    if (zoneSeat.size > SEAT_FOCUS.mapCap) zoneSeat.clear();
    const z = byIdFn(ev.id);
    const s = Number.isInteger(ev.seat) ? ev.seat : z && z.sourceId != null ? seatOfBody(byIdFn(z.sourceId)) : !ev.classId ? 0 : null;
    zoneSeat.set(ev.id, s);
  });
  bus.on('death', (ev) => {
    lastKill = { tick: ev.tick, seat: lastHitter.get(ev.id) ?? null };
  });
}

// Probes: the tables' sizes and the last kill.
export function seatFocusDebug() {
  return { hitters: lastHitter.size, zones: zoneSeat.size, lastKill: { ...lastKill } };
}
