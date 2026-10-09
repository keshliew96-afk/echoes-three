// KEYS AND VAULTS (docs/VAULTS.md, content plan 3 slice 2): the piece of
// Gauntlet still missing. Elites and champions drop a KEY; a key opens a
// locked VAULT DOOR on a later path screen, and behind it waits a treasure
// room with no fight: Glint piles, a food platter and a relic chest.
//
//   - A key is not a currency. The party holds at most one, it lasts the
//     level it was found in (lost at the level's end, unused or not), and a
//     level opens at most one vault.
//   - The champion always drops a key when it falls (the `champion_fall`
//     spot), unless the party already holds one or the level's vault is
//     already open. An elite felled in rooms 1-5 drops one by a hash roll
//     (never the run stream), on the same terms.
//   - The key lies where it fell, turning in a gold beam: any hero who walks
//     over it picks it up for the party. A key still on the floor when the
//     room clears flies to the party by itself, so nobody can miss it.
//   - The vault door shows on the next path screen into rooms 2-6 while a key
//     is held: never on the cursed door and never over the crown door (when
//     the crown takes one door and the other is cursed, it waits for the next
//     screen); over a "?" door only when no plain door is left. It keeps its
//     door's own reward glyph: the room's draft still follows the vault.
//   - Taking it spends the key. The vault room stands in the last combat
//     room's clearing (as the shop and the "?" rooms do, no layout draw),
//     dressed as a sanctum. Walking over a pile or the platter takes it;
//     opening the chest (E) gathers whatever is left, then pays the draft and
//     a relic pick. Nothing in it can hurt the party.
//
// WHERE: campaign runs only (Endless and the Daily included), never the
// tutorial and never the legacy single-level run, so the nine goldens never
// see a key. Sim only: no DOM, no i18n.
import { fnv1a64Hex } from '../core/hash.js';

export const VAULT_RULES = Object.freeze({
  eliteChance: 0.1, // an elite felled in rooms 1-5 drops a key this often
  eliteRooms: Object.freeze([1, 5]), // the rooms whose elites can drop one
  doorRooms: Object.freeze([2, 6]), // the rooms a vault door can lead into
  maxPerLevel: 1, // vaults a level can open
  pickupRadius: 0.95, // u, a hero this close to a key (or a pile, the platter) takes it
  pileGlint: 12, // each of the three Glint piles, to the Healer's wallet...
  pilePurse: 6, // ...and to each ally purse
  platterHeal: 0.5, // the food platter heals every living hero this share of max HP
  chestSource: 'vault', // the relic pick the chest pays (the common pool)
  chestRadius: 0.55, // the chest's solid footprint
});

// The vault's treasure, laid out in an arc round the chest at the top of the
// room (the party walks in at the centre). A spot blocked by the clearing's
// props moves to the first clear one of its row.
export const VAULT_SPOTS = Object.freeze({
  chest: Object.freeze([[0, -4.2], [0, -3.4], [0, -5]]),
  piles: Object.freeze([
    Object.freeze([[-3.4, -2.6], [-3, -1.6], [-4.4, -2.2]]),
    Object.freeze([[3.4, -2.6], [3, -1.6], [4.4, -2.2]]),
    Object.freeze([[-1.9, -5.1], [-2.4, -4.4], [-1.4, -3.6]]),
  ]),
  platter: Object.freeze([[1.9, -5.1], [2.4, -4.4], [1.4, -3.6]]),
});

const hash32 = (s) => parseInt(fnv1a64Hex(s).slice(0, 8), 16) >>> 0;

// Does the elite `id` felled in `room` drop a key? A pure hash of the level's
// frame seed and index, the room and the body's id: no stream draw.
export function eliteDropsKey(seed, index, room, id) {
  const R = VAULT_RULES;
  if (!(room >= R.eliteRooms[0] && room <= R.eliteRooms[1])) return false;
  const h = hash32(`${seed >>> 0}:${index | 0}:${room | 0}:${id | 0}:KEY`);
  return h / 0x100000000 < R.eliteChance;
}

// The side the vault door prefers on a screen (a hash, like the crown's).
export function vaultPref(seed, index, room) {
  return (hash32(`${seed >>> 0}:${index | 0}:${room | 0}:VAULT`) >>> 4) & 1;
}

// Where the vault door goes on a path screen, or null when it must wait:
// never the cursed door, never the crown door; over a "?" door only when the
// other door is cursed or crowned. `pref` breaks a tie between two plain doors.
export function vaultSide(pref, curseSide, eventSide, crownSide) {
  const taken = (s) => s === curseSide || s === crownSide;
  const open = [0, 1].filter((s) => !taken(s));
  if (open.length === 0) return null;
  if (open.length === 1) return open[0];
  const plain = open.filter((s) => s !== eventSide);
  if (plain.length === 1) return plain[0];
  return pref === 1 ? 1 : 0;
}

// The vault system: the key, the level's vault and the vault room's bodies.
// Plain state, saved with the run (present only when on).
export function createVaultSystem({ registry, events, getTick }) {
  let on = false;
  // key: null | { from: 'champion'|'elite', room, kind } (held by the party)
  let key = null;
  let opened = 0; // vaults opened this level
  let room = null; // the live vault room: { room, state: 'shut'|'open', glint, healed }
  let found = 0; // keys picked up this run (the end card / probes)
  let lapsed = 0; // keys a level ended with, unused
  // A key that fell this tick waits here and lands at the end of the tick
  // (a death resolves inside the damage pipeline, mid-iteration).
  let pending = null;

  const r2 = (v) => Math.round(v * 100) / 100;
  const isLoose = (e) => e.kind === 'vault_key';

  function canDrop() {
    return on && !key && !pending && opened < VAULT_RULES.maxPerLevel && !registry.all().some(isLoose);
  }

  // A key falls at (x, z); it lands at the end of the tick. Returns whether
  // one fell.
  function drop(from, kind, x, z, roomIndex) {
    if (!canDrop()) return false;
    pending = { from, kind, x: r2(x), z: r2(z), room: roomIndex };
    return true;
  }
  function land() {
    const p = pending;
    pending = null;
    const e = registry.spawn({ kind: 'vault_key', faction: 'neutral', keyFrom: p.from, keyKind: p.kind, keyRoom: p.room, x: p.x, z: p.z, px: p.x, pz: p.z, yaw: 0, spawnTick: getTick() });
    events.emit(getTick(), 'key_drop', { id: e.id, from: p.from, kind: p.kind, room: p.room, x: p.x, z: p.z });
    return e;
  }

  function pickUp(e, by, auto) {
    key = { from: e.keyFrom, room: e.keyRoom, kind: e.keyKind };
    found += 1;
    events.emit(getTick(), 'key_pickup', { id: e.id, from: e.keyFrom, by, auto: !!auto, x: r2(e.x), z: r2(e.z) });
    registry.despawn(e.id);
  }

  const heroes = () => registry.all().filter((e) => e.partyIndex !== undefined && e.hp > 0);
  function toucher(e) {
    for (const h of heroes()) if (Math.hypot(h.x - e.x, h.z - e.z) <= VAULT_RULES.pickupRadius + (h.radius ?? 0.3)) return h;
    return null;
  }

  return {
    reset(enabled) {
      on = !!enabled;
      key = null;
      opened = 0;
      room = null;
      found = 0;
      lapsed = 0;
      pending = null;
    },
    enabled: () => on,
    held: () => !!key,
    key: () => (key ? { ...key } : null),
    open: () => opened < VAULT_RULES.maxPerLevel,
    drop,
    // Each tick: a hero walking over a loose key takes it.
    step() {
      if (!on) return;
      if (pending) land();
      for (const e of registry.all()) {
        if (!isLoose(e)) continue;
        const h = toucher(e);
        if (h) pickUp(e, h.id, false);
      }
    },
    // The room cleared: a key still on the floor flies to the party.
    sweep() {
      if (!on) return;
      if (pending) land();
      for (const e of registry.all()) if (isLoose(e)) pickUp(e, null, true);
    },
    // A vault door was taken: the key turns in the lock.
    spend(roomIndex) {
      if (!key) return null;
      const k = key;
      key = null;
      opened += 1;
      events.emit(getTick(), 'vault_door_taken', { room: roomIndex, from: k.from });
      return k;
    },
    // The level ends: an unused key goes with it.
    levelReset(level) {
      if (key) {
        lapsed += 1;
        events.emit(getTick(), 'key_lapse', { level, from: key.from });
      }
      key = null;
      opened = 0;
      room = null;
      pending = null;
      for (const e of registry.all()) if (isLoose(e)) registry.despawn(e.id);
    },
    // The live vault room's record (run.js spawns and pays the bodies).
    enterRoom(roomIndex) {
      room = { room: roomIndex, state: 'shut', glint: 0, healed: 0 };
      return room;
    },
    live: () => room,
    finishRoom() {
      if (room) room.state = 'open';
    },
    toucher,
    view() {
      return {
        key: key ? { ...key } : null,
        opened,
        ...(room ? { vault: { ...room } } : {}),
        found,
        ...(lapsed ? { lapsed } : {}),
      };
    },
    saveState: () => ({ on, key: key ? { ...key } : null, opened, room: room ? { ...room } : null, found, lapsed, ...(pending ? { pending: { ...pending } } : {}) }),
    loadState(d) {
      on = !!(d && d.on);
      key = d && d.key ? { ...d.key } : null;
      opened = d && Number.isFinite(d.opened) ? d.opened : 0;
      room = d && d.room ? { ...d.room } : null;
      found = d && Number.isFinite(d.found) ? d.found : 0;
      lapsed = d && Number.isFinite(d.lapsed) ? d.lapsed : 0;
      pending = d && d.pending ? { ...d.pending } : null;
    },
  };
}
