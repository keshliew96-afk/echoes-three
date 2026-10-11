// TONICS AND BOMBS (docs/CONSUMABLES.md, content plan 4 slice 1): Gauntlet's
// potion. Every hero has ONE carry slot for a consumable, found in a run and
// spent in a fight:
//
//   - Six kinds: three drinks (Mending Tonic, Haste Draught, Ward Flask), two
//     bombs thrown at the aim point (Fire Bomb, Frost Bomb) and the Bell Charm,
//     whose toll shatters the enemy shots around its ringer.
//   - Found on the floor where an elite fell (a hash roll), paid by a
//     champion's chest and a vault's chest, and sold at the Peddler's tonic
//     stand (one kind a visit; each hero may buy one into an empty slot).
//   - A hero walking over a loose one takes it into an empty slot. A player
//     with a full slot swaps (the old one is left where the new one lay); an
//     AI seat only fills an empty slot. Whatever still lies on the floor when
//     the room clears flies to the heroes with empty slots, in seat order;
//     the rest is lost with the room.
//   - Use: one press (Q / pad RS, rebindable) in a fight. The AI seats and the
//     autopilot use theirs on simple rules (aiChoice below).
//   - Not a currency: the slots last the run (across its levels) and nothing
//     carries past it.
//
// WHERE: campaign runs only (Endless, the Daily and Boss Rush included), never
// the tutorial and never the legacy single-level run, so the nine goldens
// never see one. Every roll is a pure hash (never the run stream); the effects
// go through the combat pipeline (its crit roll is the run stream's, as for
// every other hit). Sim only: no DOM, no i18n.
import { fnv1a64Hex } from '../core/hash.js';
import { TICK_HZ } from '../core/constants.js';
import * as STATUS from './status.js';

const sec = (s) => Math.round(s * TICK_HZ);

// The six kinds, in their catalogue order (ids are stable save data).
//   type 'drink' acts on the user, 'bomb' is thrown at the aim, 'charm' rings
//   round the user. Damage is a share of the target's max HP, so a bomb reads
//   the same in Level I and at Depth 12: `dmg` for a common foe, `elite` for an
//   elite, `big` for a champion or a boss.
export const CONSUMABLES = Object.freeze({
  mend_tonic: Object.freeze({
    id: 'mend_tonic',
    type: 'drink',
    name: 'Mending Tonic',
    text: 'Drink: heal 50% of max HP at once.',
    price: 30,
    weight: 30,
    heal: 0.5,
  }),
  haste_draught: Object.freeze({
    id: 'haste_draught',
    type: 'drink',
    name: 'Haste Draught',
    text: 'Drink: +35% move speed and +15% damage for 8 s.',
    price: 28,
    weight: 14,
    haste: 0.35,
    inspired: 0.15,
    ticks: sec(8),
  }),
  ward_flask: Object.freeze({
    id: 'ward_flask',
    type: 'drink',
    name: 'Ward Flask',
    text: 'Drink: a shield of 40% of max HP for 10 s.',
    price: 30,
    weight: 16,
    shield: 0.4,
    ticks: sec(10),
  }),
  fire_bomb: Object.freeze({
    id: 'fire_bomb',
    type: 'bomb',
    name: 'Fire Bomb',
    text: 'Throw: bursts at the aim and leaves fire burning for 3 s.',
    price: 34,
    weight: 16,
    radius: 2.4,
    dmg: 0.35,
    elite: 0.2,
    big: 0.05,
    // The fire patch: a tick of damage every `every` ticks for `ticks`.
    fire: Object.freeze({ radius: 2.1, ticks: sec(3), every: sec(0.5), dmg: 0.04, elite: 0.025, big: 0.005 }),
  }),
  frost_bomb: Object.freeze({
    id: 'frost_bomb',
    type: 'bomb',
    name: 'Frost Bomb',
    text: 'Throw: bursts at the aim, freezes foes for 1 s and slows them 50% for 4 s.',
    price: 32,
    weight: 14,
    radius: 2.8,
    dmg: 0.15,
    elite: 0.1,
    big: 0.025,
    slow: 0.5,
    slowTicks: sec(4),
    stunTicks: sec(1),
  }),
  bell_charm: Object.freeze({
    id: 'bell_charm',
    type: 'charm',
    name: 'Bell Charm',
    text: 'Ring: shatters every enemy shot within 8 u and wards the heroes near you (-30% damage taken for 4 s).',
    price: 26,
    weight: 10,
    clearRadius: 8,
    wardRadius: 6,
    ward: 0.3,
    ticks: sec(4),
  }),
});
export const CONSUMABLE_IDS = Object.freeze(Object.keys(CONSUMABLES));

export const CONSUMABLE_RULES = Object.freeze({
  eliteChance: 0.2, // an elite felled in a combat room drops one this often
  pickupRadius: 0.9, // u, a hero this close to a loose one takes it
  maxLoose: 3, // at most this many lie on a room's floor at once
  throwRange: 6.5, // u, a bomb flies at most this far
  minThrow: 1.2, // u, and at least this far (a bomb at your feet is aimed ahead)
  flightTicks: sec(0.45), // a bomb's flight
  aiEvery: 6, // ticks between an AI seat's looks at its slot
  // AI rules (aiChoice): a tonic under 35% HP; a flask under 60% with two foes
  // close (or under 35%); a draught for a champion, a boss or a crowd of four;
  // a bomb into a crowd of four, or at a champion or a boss; the charm against
  // three shots closing in.
  aiTonicBelow: 0.35,
  aiFlaskBelow: 0.6,
  aiCrowd: 4,
  aiShots: 3,
});

const hash32 = (s) => parseInt(fnv1a64Hex(s).slice(0, 8), 16) >>> 0;
const unit = (s) => hash32(s) / 0x100000000;
const r2 = (v) => Math.round(v * 100) / 100;

// Which kind a roll `s` picks, by the catalogue weights.
function kindOf(s) {
  const total = CONSUMABLE_IDS.reduce((n, id) => n + CONSUMABLES[id].weight, 0);
  let x = unit(`${s}:KIND`) * total;
  for (const id of CONSUMABLE_IDS) {
    x -= CONSUMABLES[id].weight;
    if (x < 0) return id;
  }
  return CONSUMABLE_IDS[0];
}

// Does the elite `id` felled in `room` drop one, and which? A pure hash of the
// level's frame seed and index, the room and the body's id: no stream draw.
export function eliteDropsTonic(seed, index, room, id) {
  const s = `${seed >>> 0}:${index | 0}:${room | 0}:${id | 0}:TONIC`;
  return unit(s) < CONSUMABLE_RULES.eliteChance ? kindOf(s) : null;
}
// What a chest pays (`src` 'champion' | 'vault').
export function chestTonic(seed, index, room, src) {
  return kindOf(`${seed >>> 0}:${index | 0}:${room | 0}:${src}:CHEST`);
}
// The kind the Peddler's stand sells on a visit.
export function standKind(seed, index, room) {
  return kindOf(`${seed >>> 0}:${index | 0}:${room | 0}:STAND`);
}

// Damage share of a hostile's max HP for an item row (`dmg` / `elite` / `big`).
export function shareFor(row, e, isChampion) {
  if (e.boss === true || e.kind === 'stag' || isChampion(e.kind)) return row.big;
  return e.elite ? row.elite : row.dmg;
}

const isHostile = (e) => e.faction === 'hostile' && e.hp > 0 && e.hittable && (e.state === 'active' || e.kind === 'stag' || e.kind === 'dummy' || e.boss === true);
const isShot = (e) => e.kind === 'eshot' || e.kind === 'eglob';
const alive = (b) => !!b && b.hp > 0 && !b.downed;

// The AI's call on its slot: null, or { aim: {x, z} | null }. Pure: reads the
// listed bodies only (ascending id), so a seeded run replays the same.
export function aiChoice(id, body, hostiles, shots, isChampion) {
  const row = CONSUMABLES[id];
  if (!row || !alive(body)) return null;
  const R = CONSUMABLE_RULES;
  const hp = body.maxHp > 0 ? body.hp / body.maxHp : 1;
  const near = (r) => hostiles.filter((e) => Math.hypot(e.x - body.x, e.z - body.z) <= r);
  const big = (e) => e.boss === true || e.kind === 'stag' || isChampion(e.kind);
  if (id === 'mend_tonic') return hp < R.aiTonicBelow ? { aim: null } : null;
  if (id === 'ward_flask') return hp < R.aiTonicBelow || (hp < R.aiFlaskBelow && near(3).length >= 2) ? { aim: null } : null;
  if (id === 'haste_draught') {
    const n = near(6);
    return n.some(big) || n.length >= R.aiCrowd ? { aim: null } : null;
  }
  if (id === 'bell_charm') {
    const close = shots.filter((s) => Math.hypot(s.x - body.x, s.z - body.z) <= 5).length;
    return close >= R.aiShots || (close >= 2 && hp < 0.5) ? { aim: null } : null;
  }
  // A bomb: the foe in reach with the most others round it (ties: lower id).
  let best = null;
  let bestN = 0;
  for (const e of hostiles) {
    const d = Math.hypot(e.x - body.x, e.z - body.z);
    if (d > R.throwRange || d < R.minThrow * 0.5) continue;
    const n = hostiles.filter((o) => Math.hypot(o.x - e.x, o.z - e.z) <= row.radius).length;
    const score = big(e) ? Math.max(n, R.aiCrowd) : n;
    if (score > bestN) {
      bestN = score;
      best = e;
    }
  }
  return best && bestN >= R.aiCrowd ? { aim: { x: best.x, z: best.z } } : null;
}

// The consumable system. Plain state, saved with the run (present only when
// on). `isChampion(kind)` comes from sim/champions.js.
export function createConsumableSystem({ registry, events, getTick, combat, isChampion = () => false }) {
  let on = false;
  let slots = [null, null, null, null]; // per seat: null | id
  let pending = []; // drops that fell this tick (they land at its end)
  let found = 0; // picked up / bought / paid this run
  let used = 0;
  let usedBy = {}; // id -> count (the end card / probes / deeds later)
  const nextAi = [0, 0, 0, 0]; // AI look cadence (not saved: a pure tick rule)

  const heroes = () =>
    registry
      .all()
      .filter((e) => e.partyIndex !== undefined)
      .sort((a, b) => a.partyIndex - b.partyIndex);
  const bodyOf = (seat) => registry.all().find((e) => e.partyIndex === seat) ?? null;
  const loose = () => registry.all().filter((e) => e.kind === 'tonic_item');

  function emitGain(seat, id, from, x, z, extra = {}) {
    found += 1;
    events.emit(getTick(), 'tonic_gain', { seat, item: id, from, ...(x !== undefined ? { x: r2(x), z: r2(z) } : {}), ...extra });
  }

  // A loose one falls at (x, z): it lands at the end of the tick.
  function drop(id, from, x, z) {
    if (!on || !CONSUMABLES[id]) return false;
    if (loose().length + pending.length >= CONSUMABLE_RULES.maxLoose) return false;
    pending.push({ id, from, x: r2(x), z: r2(z) });
    return true;
  }
  function spawnLoose(id, from, x, z, skip = null) {
    const e = registry.spawn({ kind: 'tonic_item', faction: 'neutral', item: id, itemFrom: from, x, z, px: x, pz: z, yaw: 0, spawnTick: getTick(), ...(skip !== null ? { skipBy: skip } : {}) });
    events.emit(getTick(), 'tonic_drop', { id: e.id, item: id, from, x: r2(x), z: r2(z) });
    return e;
  }

  // A chest (or the stand) pays one straight into a slot: `seat` first when
  // given, else the first empty slot in seat order. Returns the seat or -1.
  function grant(id, from, seat = null, x, z) {
    if (!on || !CONSUMABLES[id]) return -1;
    const order = seat !== null ? [seat, 0, 1, 2, 3] : [0, 1, 2, 3];
    for (const s of order) {
      if (slots[s] !== null) continue;
      const b = bodyOf(s);
      if (!b) continue;
      slots[s] = id;
      emitGain(s, id, from, x ?? b.x, z ?? b.z, { to: b.id });
      return s;
    }
    events.emit(getTick(), 'tonic_lost', { item: id, from });
    return -1;
  }

  function take(e, b, controller) {
    const s = b.partyIndex;
    const had = slots[s];
    if (had !== null && controller !== 'human') return false;
    if (had === e.item) return false; // the same kind: nothing to swap
    slots[s] = e.item;
    registry.despawn(e.id);
    emitGain(s, e.item, 'floor', e.x, e.z, { id: e.id, by: b.id });
    if (had !== null) {
      spawnLoose(had, 'swap', e.x, e.z, b.id);
      found -= 1; // a swap is not a find
    }
    return true;
  }

  // ---------------------------------------------------------------- use --
  function denyUse(seat, reason) {
    events.emit(getTick(), 'tonic_denied', { seat, reason, item: slots[seat] ?? null });
    return { denied: reason };
  }
  // `seat` presses its slot, aiming at `aim` ({x, z} | null). `live` says a
  // fight is on (the run's combat phase).
  function use(seat, aim, live) {
    if (!on) return null;
    const id = slots[seat];
    if (!id) return denyUse(seat, 'empty');
    const b = bodyOf(seat);
    if (!alive(b)) return denyUse(seat, 'downed');
    if (!live) return denyUse(seat, 'calm');
    const row = CONSUMABLES[id];
    const tick = getTick();
    slots[seat] = null;
    used += 1;
    usedBy[id] = (usedBy[id] ?? 0) + 1;
    const base = { seat, item: id, by: b.id, x: r2(b.x), z: r2(b.z) };
    if (id === 'mend_tonic') {
      const r = combat.applyHeal(b, b.maxHp * row.heal, { healer: b.id, source: id });
      events.emit(tick, 'tonic_use', { ...base, healed: r && r.amount !== undefined ? r2(r.amount) : null });
    } else if (id === 'haste_draught') {
      STATUS.apply(b, 'haste', row.haste, row.ticks, tick, b.id);
      STATUS.apply(b, 'inspired', row.inspired, row.ticks, tick, b.id);
      events.emit(tick, 'tonic_use', base);
    } else if (id === 'ward_flask') {
      STATUS.apply(b, 'shield', b.maxHp * row.shield, row.ticks, tick, b.id);
      events.emit(tick, 'tonic_use', base);
    } else if (id === 'bell_charm') {
      let cleared = 0;
      for (const s of registry.all()) {
        if (!isShot(s) || Math.hypot(s.x - b.x, s.z - b.z) > row.clearRadius) continue;
        events.emit(tick, s.kind === 'eglob' ? 'eglob_despawn' : 'eshot_despawn', { id: s.id, cause: 'charm', x: r2(s.x), z: r2(s.z) });
        registry.despawn(s.id);
        cleared += 1;
      }
      const warded = [];
      for (const h of heroes()) {
        if (!alive(h) || Math.hypot(h.x - b.x, h.z - b.z) > row.wardRadius) continue;
        STATUS.apply(h, 'ward', row.ward, row.ticks, tick, b.id);
        warded.push(h.id);
      }
      events.emit(tick, 'tonic_use', { ...base, cleared, warded, radius: row.clearRadius });
    } else {
      // A bomb: it flies from the hand to the aim (clamped to the throw).
      const R = CONSUMABLE_RULES;
      let ax = aim ? aim.x : b.x + (b.faceX ?? 0) * 3;
      let az = aim ? aim.z : b.z + (b.faceZ ?? 1) * 3;
      let dx = ax - b.x;
      let dz = az - b.z;
      let d = Math.hypot(dx, dz);
      if (d < 1e-6) {
        dx = b.faceX ?? 0;
        dz = b.faceZ ?? 1;
        d = Math.hypot(dx, dz) || 1;
        ax = b.x;
        az = b.z;
      }
      const len = Math.min(R.throwRange, Math.max(R.minThrow, Math.hypot(ax - b.x, az - b.z)));
      const tx = r2(b.x + (dx / d) * len);
      const tz = r2(b.z + (dz / d) * len);
      const bomb = registry.spawn({ kind: 'tonic_bomb', faction: 'neutral', item: id, by: b.id, seat, fromX: r2(b.x), fromZ: r2(b.z), toX: tx, toZ: tz, x: r2(b.x), z: r2(b.z), px: r2(b.x), pz: r2(b.z), launchTick: tick, landTick: tick + R.flightTicks });
      events.emit(tick, 'tonic_use', { ...base, bomb: bomb.id, toX: tx, toZ: tz, landTick: tick + R.flightTicks });
    }
    return { used: id, seat };
  }

  function burst(bomb) {
    const row = CONSUMABLES[bomb.item];
    const tick = getTick();
    const x = bomb.toX;
    const z = bomb.toZ;
    registry.despawn(bomb.id);
    const hit = [];
    for (const e of registry.all().filter(isHostile).sort((a, c) => a.id - c.id)) {
      const dx = e.x - x;
      const dz = e.z - z;
      if (Math.hypot(dx, dz) > row.radius + (e.radius ?? 0.3)) continue;
      hit.push(e.id);
      combat.applyDamage(e, e.maxHp * shareFor(row, e, isChampion), { delivery: 'item', shape: 'burst', dirX: dx, dirZ: dz, attacker: bomb.by, source: bomb.item });
      if (!registry.byId(e.id) || !(e.hp > 0)) continue;
      if (row.slow) STATUS.apply(e, 'slow', row.slow, row.slowTicks, tick, bomb.by);
      if (row.stunTicks) STATUS.apply(e, 'stun', 1, row.stunTicks, tick, bomb.by);
    }
    events.emit(tick, 'tonic_burst', { id: bomb.id, item: bomb.item, seat: bomb.seat, x, z, radius: row.radius, hit });
    if (row.fire) {
      const f = registry.spawn({ kind: 'tonic_fire', faction: 'neutral', item: bomb.item, by: bomb.by, x, z, px: x, pz: z, radius: row.fire.radius, untilTick: tick + row.fire.ticks, nextTick: tick + row.fire.every });
      events.emit(tick, 'tonic_fire', { id: f.id, x, z, radius: row.fire.radius, untilTick: f.untilTick });
    }
  }

  function burn(f) {
    const tick = getTick();
    if (tick >= f.untilTick) {
      events.emit(tick, 'tonic_fire_end', { id: f.id });
      registry.despawn(f.id);
      return;
    }
    if (tick < f.nextTick) return;
    f.nextTick = tick + CONSUMABLES.fire_bomb.fire.every;
    const row = CONSUMABLES.fire_bomb.fire;
    for (const e of registry.all().filter(isHostile).sort((a, c) => a.id - c.id)) {
      if (Math.hypot(e.x - f.x, e.z - f.z) > f.radius + (e.radius ?? 0.3)) continue;
      combat.applyDamage(e, e.maxHp * shareFor(row, e, isChampion), { delivery: 'item', shape: 'burn', attacker: f.by, source: 'fire_bomb' });
    }
  }

  // Remove the room's loose ones, bombs in the air and fire (a room change,
  // the run's end).
  function clearRoom() {
    pending = [];
    for (const e of registry.all()) if (e.kind === 'tonic_item' || e.kind === 'tonic_bomb' || e.kind === 'tonic_fire') registry.despawn(e.id);
  }

  return {
    reset(enabled) {
      on = !!enabled;
      slots = [null, null, null, null];
      pending = [];
      found = 0;
      used = 0;
      usedBy = {};
      nextAi.fill(0);
    },
    enabled: () => on,
    slot: (seat) => slots[seat] ?? null,
    slots: () => [...slots],
    drop,
    grant,
    use,
    clearRoom,
    // Give / clear a slot directly (probes, screenshots, the lab).
    setSlot(seat, id) {
      if (!on || !(seat >= 0 && seat <= 3)) return null;
      slots[seat] = id && CONSUMABLES[id] ? id : null;
      return slots[seat];
    },
    // Each tick (end of tick): drops land, heroes walk over loose ones, bombs
    // land, fire burns. `controllers` are the seat controllers.
    step(controllers) {
      if (!on) return;
      const tick = getTick();
      if (pending.length) {
        const list = pending;
        pending = [];
        for (const p of list) spawnLoose(p.id, p.from, p.x, p.z);
      }
      for (const e of registry.all()) {
        if (e.kind === 'tonic_bomb' && tick >= e.landTick) burst(e);
        else if (e.kind === 'tonic_bomb') {
          const k = Math.min(1, (tick - e.launchTick) / Math.max(1, e.landTick - e.launchTick));
          e.x = r2(e.fromX + (e.toX - e.fromX) * k);
          e.z = r2(e.fromZ + (e.toZ - e.fromZ) * k);
        } else if (e.kind === 'tonic_fire') burn(e);
      }
      const items = loose();
      if (!items.length) return;
      for (const e of items) {
        if (!registry.byId(e.id)) continue;
        for (const h of heroes()) {
          if (!alive(h)) continue;
          const d = Math.hypot(h.x - e.x, h.z - e.z);
          const reach = CONSUMABLE_RULES.pickupRadius + (h.radius ?? 0.3);
          if (e.skipBy === h.id) {
            if (d > reach + 0.4) delete e.skipBy;
            continue;
          }
          if (d > reach) continue;
          if (take(e, h, controllers ? controllers[h.partyIndex] : 'ai')) break;
        }
      }
    },
    // The room cleared: loose ones fly to the empty slots, in seat order.
    sweep() {
      if (!on) return;
      for (const p of pending) spawnLoose(p.id, p.from, p.x, p.z);
      pending = [];
      const tick = getTick();
      for (const e of registry.all()) {
        if (e.kind === 'tonic_bomb' || e.kind === 'tonic_fire') registry.despawn(e.id);
      }
      for (const e of loose().sort((a, c) => a.id - c.id)) {
        const s = [0, 1, 2, 3].find((k) => slots[k] === null && bodyOf(k));
        if (s === undefined) continue;
        slots[s] = e.item;
        registry.despawn(e.id);
        emitGain(s, e.item, 'sweep', e.x, e.z, { id: e.id, to: bodyOf(s).id });
      }
      void tick;
    },
    // The AI seats' look at their slots. `seats`: the AI-held seats this
    // tick; `live`: a fight is on. Returns the uses made.
    aiStep(seats, live) {
      if (!on || !live) return [];
      const tick = getTick();
      const hostiles = registry.all().filter(isHostile).sort((a, b) => a.id - b.id);
      if (!hostiles.length) return [];
      const shots = registry.all().filter(isShot);
      const out = [];
      for (const s of seats) {
        const id = slots[s];
        if (!id || tick < nextAi[s]) continue;
        nextAi[s] = tick + CONSUMABLE_RULES.aiEvery;
        const pick = aiChoice(id, bodyOf(s), hostiles, shots, isChampion);
        if (!pick) continue;
        const r = use(s, pick.aim, live);
        if (r && r.used) out.push(r);
      }
      return out;
    },
    view() {
      return { slots: [...slots], found, used };
    },
    saveState: () => ({ on, slots: [...slots], found, used, usedBy: { ...usedBy }, ...(pending.length ? { pending: pending.map((p) => ({ ...p })) } : {}) }),
    loadState(d) {
      on = !!(d && d.on);
      slots = d && Array.isArray(d.slots) ? [0, 1, 2, 3].map((k) => (CONSUMABLES[d.slots[k]] ? d.slots[k] : null)) : [null, null, null, null];
      found = d && Number.isFinite(d.found) ? d.found : 0;
      used = d && Number.isFinite(d.used) ? d.used : 0;
      usedBy = d && d.usedBy ? { ...d.usedBy } : {};
      pending = d && Array.isArray(d.pending) ? d.pending.map((p) => ({ ...p })) : [];
      nextAi.fill(0);
    },
  };
}
