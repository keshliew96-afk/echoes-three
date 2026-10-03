// Relics and curses (docs/CONTENT_PLAN.md §5, "the collect half of the loop").
//
// RELICS are run-long party buffs. A relic pick (one of three, no reroll)
// opens after the draft of:
//   - room 1 of every level (a free relic: one per level, three per campaign);
//   - any CURSED room the party cleared (the curse's reward).
// CURSES are opt-in risk: on each path screen one of the two doors may carry a
// curse (relic stream roll). Walking through it applies the curse to that
// room only; clearing the room pays a relic pick. A defend soft-fail forfeits
// it with the room's reward.
//
// Determinism: every roll here (curse on a door, which door, which curse,
// which three relics) comes from the RELIC STREAM, seeded from the run seed
// with no gameplay draw (hash32(seed, 'RELC')), so turning relics on never
// moves the gameplay stream's run frame, waves or drafts. Relic procs that go
// through the combat pipeline (Hearthstone's heal, Thorn Mail's reflect) draw
// their crit rolls from the gameplay stream like any other instance.
//
// Scope: relics are ON for campaign runs (Begin Run, the Level Select) and
// OFF for the legacy single-level startRun() the act runner, the golden
// traces and ?run=1 use; cmd('relics', true) turns them on for a probe. With
// relics off nothing here runs, no event fires and the run view carries no
// `relics` key, so the 9 golden traces hash exactly as before.
import { createGameplayRng } from '../core/rng.js';

const r2 = (v) => Math.round(v * 100) / 100;

// rarity -> offer weight (the relic stream draws without replacement).
export const RELIC_WEIGHT = Object.freeze({ common: 6, rare: 3, legendary: 1 });

// Every number a relic changes lives here (the UI prints `text`).
export const RELICS = Object.freeze({
  whetstone: { name: 'Whetstone', rarity: 'common', text: 'The party deals 12% more damage.', dealt: 0.12 },
  ember_tooth: { name: 'Ember Tooth', rarity: 'common', text: 'Party critical hits deal ×2 instead of ×1.5.', critMul: 0.5 },
  hawk_feather: { name: 'Hawk Feather', rarity: 'common', text: '+7% critical chance on party hits and heals.', crit: 0.07 },
  lantern_oil: { name: 'Lantern Oil', rarity: 'common', text: 'Healing on the party is 20% stronger.', heal: 0.2 },
  millstone: { name: 'Millstone', rarity: 'common', text: 'Party hits knock enemies back 75% farther.', kb: 0.75 },
  grave_coin: { name: 'Grave Coin', rarity: 'common', text: '+6 Glint every time a combat room is cleared.', glint: 6 },
  peddlers_seal: { name: "Peddler's Seal", rarity: 'common', text: "Your shelf at the peddler is 25% cheaper.", shop: 0.25 },
  wyrm_scale: { name: 'Wyrm Scale', rarity: 'rare', text: 'The party takes 15% less damage.', taken: -0.15 },
  hearthstone: { name: 'Hearthstone', rarity: 'rare', text: 'Clearing a room heals the party for 25% of max HP.', clearHeal: 0.25 },
  heron_quill: { name: 'Heron Quill', rarity: 'rare', text: 'Every room opens with all party skills ready.', freshCds: true },
  thorn_mail: { name: 'Thorn Mail', rarity: 'rare', text: 'Enemies that hit the party take 60% of it back.', thorns: 0.6 },
  leech_fang: { name: 'Leech Fang', rarity: 'rare', text: 'Each party kill heals the most wounded member for 4 HP.', leech: 4 },
  last_light: { name: 'Last Light', rarity: 'legendary', text: 'Once per room, each member who would fall stays up at 1 HP.', lastLight: true },
  glass_heart: { name: 'Glass Heart', rarity: 'legendary', text: 'The party deals 35% more damage but takes 20% more.', dealt: 0.35, taken: 0.2 },
  ashen_crown: { name: 'Ashen Crown', rarity: 'legendary', text: '+8% party damage for every curse taken this run (up to +40%).', perCurse: 0.08, perCurseMax: 5 },
});
export const RELIC_IDS = Object.freeze(Object.keys(RELICS));

// A curse lasts its room only. `diff` reshapes the room's difficulty numbers
// (sim/run.js applies it to a copy before the wave plan is rolled).
export const CURSES = Object.freeze({
  elite_tide: { name: 'Elite Tide', text: 'Elites are far more common in this room.', diff: { eliteAdd: 0.35 } },
  crowded: { name: 'Crowded', text: 'Every wave in this room is half again as large.', diff: { budgetMul: 1.5 } },
  iron_hide: { name: 'Iron Hide', text: 'Enemies in this room have 40% more HP.', diff: { hpMul: 1.4 } },
  sharp_fangs: { name: 'Sharp Fangs', text: 'Enemies in this room deal 35% more damage.', diff: { dmgMul: 1.35 } },
  famine: { name: 'Famine', text: 'Healing on the party is 60% weaker in this room.', healCut: 0.6 },
});
export const CURSE_IDS = Object.freeze(Object.keys(CURSES));

export const RELIC_RULES = Object.freeze({
  choices: 3, // relics per pick
  curseChance: 0.6, // a path screen carries a cursed door
  emptyPoolGlint: 20, // a pick with every relic owned pays Glint instead
});

// The relic stream's seed: derived from the run SEED with no gameplay draw.
export function relicSeed(seed) {
  let h = ((seed >>> 0) ^ 0x52454c43) >>> 0; // 'RELC'
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// A room's difficulty numbers with the live curse applied (a plain copy; the
// frozen difficulty() row is never touched).
export function cursedDiff(diff, curseId) {
  const c = CURSES[curseId];
  if (!c || !c.diff) return diff;
  const d = { ...diff };
  const m = c.diff;
  if (m.eliteAdd) d.eliteChance = r2(Math.min(0.9, (d.eliteChance ?? 0) + m.eliteAdd));
  if (m.budgetMul) {
    d.budget = r2(d.budget * m.budgetMul);
    d.defendBudget = r2(d.defendBudget * m.budgetMul);
  }
  if (m.hpMul) d.hpMul = r2(d.hpMul * m.hpMul);
  if (m.dmgMul) d.dmgMul = r2(d.dmgMul * m.dmgMul);
  return d;
}

export function createRelicSystem({ registry, events, getTick, combat, skillSys, player, live = () => true }) {
  let on = false;
  let stream = null;
  let owned = []; // relic ids in pick order
  let curse = null; // { id, room } — the room the party walked into cursed
  let cursesTaken = 0;
  let due = null; // { room, source } — a pick owed once the draft is done
  let offer = null; // { room, source, choices: [id], focus }
  let savedThisRoom = []; // Last Light: party ids already saved this room
  let pending = []; // procs resolved at the end of the tick (never mid-attack)

  const has = (id) => owned.includes(id);
  const sum = (key) => owned.reduce((s, id) => s + (RELICS[id][key] ?? 0), 0);
  const partyBodies = () => registry.all().filter((e) => e.partyIndex !== undefined);

  function reset(seed, enabled) {
    on = !!enabled;
    stream = on ? createGameplayRng(relicSeed(seed)) : null;
    owned = [];
    curse = null;
    cursesTaken = 0;
    due = null;
    offer = null;
    savedThisRoom = [];
    pending = [];
    if (combat && typeof combat.setMods === 'function') combat.setMods(on ? mods : null);
  }

  // ------------------------------------------------------- combat mods --
  // Read by sim/combat.js on every instance while relics are on. With nothing
  // owned and no curse every factor is exactly 1 (and every bonus 0).
  const mods = {
    active: () => on && live() && (owned.length > 0 || curse !== null),
    dealtMul() {
      let m = 1 + sum('dealt');
      if (has('ashen_crown')) m += RELICS.ashen_crown.perCurse * Math.min(RELICS.ashen_crown.perCurseMax, cursesTaken);
      return m;
    },
    takenMul: () => Math.max(0.1, 1 + sum('taken')),
    critChance: () => sum('crit'),
    critMulAdd: () => sum('critMul'),
    kbMul: () => 1 + sum('kb'),
    healMul() {
      let m = 1 + sum('heal');
      if (curse && CURSES[curse.id] && CURSES[curse.id].healCut) m *= 1 - CURSES[curse.id].healCut;
      return m;
    },
    // Last Light: true = the blow leaves this member at 1 HP instead.
    saveFromDown(target) {
      if (!has('last_light') || savedThisRoom.includes(target.id)) return false;
      savedThisRoom.push(target.id);
      events.emit(getTick(), 'relic_proc', { relic: 'last_light', target: target.id, x: r2(target.x), z: r2(target.z) });
      return true;
    },
    onPartyHit(target, attacker, amount) {
      if (!has('thorn_mail') || !attacker || !(amount > 0)) return;
      pending.push({ kind: 'thorns', attacker: attacker.id, amount: amount * RELICS.thorn_mail.thorns, from: target.id });
    },
    onKill() {
      if (has('leech_fang')) pending.push({ kind: 'leech' });
    },
  };

  // Procs land at the end of the tick, after every attack of the tick has
  // resolved, so a reflected blow never despawns an enemy mid-swing.
  function endOfTick() {
    if (!on || pending.length === 0) return;
    const list = pending;
    pending = [];
    for (const p of list) {
      if (p.kind === 'thorns') {
        const a = registry.byId(p.attacker);
        if (!a || !(a.hp > 0)) continue;
        const r = combat.applyDamage(a, p.amount, { delivery: 'skill', shape: 'thorns', attacker: null, source: 'thorn_mail' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'thorn_mail', target: a.id, from: p.from, x: r2(a.x), z: r2(a.z) });
      } else if (p.kind === 'leech') {
        let best = null;
        for (const e of partyBodies()) if (e.hp > 0 && e.hp < e.maxHp && (!best || e.hp / e.maxHp < best.hp / best.maxHp)) best = e;
        if (!best) continue;
        combat.applyHeal(best, RELICS.leech_fang.leech, { source: 'leech_fang' });
        events.emit(getTick(), 'relic_proc', { relic: 'leech_fang', target: best.id, x: r2(best.x), z: r2(best.z) });
      }
    }
  }

  // ------------------------------------------------------- run hooks --
  // A combat or boss room's first tick.
  function onRoomEnter(room, mode) {
    if (!on) return;
    savedThisRoom = [];
    if (curse && curse.room !== room) curse = null;
    if (curse) {
      events.emit(getTick(), 'curse_apply', { curse: curse.id, room, mode, x: r2(player.x), z: r2(player.z) });
    }
    if (has('heron_quill')) {
      const tick = getTick();
      for (const e of partyBodies()) if (e.kind === 'ally' && Array.isArray(e.cds)) e.cds = e.cds.map(() => tick);
      const s = skillSys.serialize();
      s.slots = s.slots.map((x) => (x ? { ...x, remaining: 0 } : null));
      skillSys.restore(s);
      events.emit(tick, 'relic_proc', { relic: 'heron_quill', x: r2(player.x), z: r2(player.z) });
    }
  }

  // The room was cleared (boundary step 5). `gainGlint(n, reason)` is the
  // run's wallet. Returns nothing; queues the pick that is owed.
  function onRoomCleared(room, { forfeited = false, gainGlint, boss = false } = {}) {
    if (!on) return;
    const tick = getTick();
    if (has('grave_coin')) gainGlint(RELICS.grave_coin.glint, 'relic_grave_coin');
    if (has('hearthstone')) {
      for (const e of partyBodies()) if (e.hp > 0 && e.hp < e.maxHp) combat.applyHeal(e, e.maxHp * RELICS.hearthstone.clearHeal, { source: 'hearthstone' });
      events.emit(tick, 'relic_proc', { relic: 'hearthstone', x: r2(player.x), z: r2(player.z) });
    }
    const cursed = curse && curse.room === room ? curse.id : null;
    if (cursed) {
      events.emit(tick, 'curse_lift', { curse: curse.id, room, forfeited });
      curse = null;
    }
    if (boss || forfeited) return;
    if (cursed) due = { room, source: 'curse', curse: cursed };
    else if (room === 1) due = { room, source: 'free' };
  }

  // Called once the draft is resolved: opens the owed pick, if any. Returns
  // true when a pick is now open (the run enters phase 'relic').
  function presentDue(gainGlint) {
    if (!on || !due) return false;
    const d = due;
    due = null;
    const pool = RELIC_IDS.filter((id) => !owned.includes(id));
    const choices = [];
    while (choices.length < RELIC_RULES.choices && pool.length > 0) {
      const total = pool.reduce((s, id) => s + RELIC_WEIGHT[RELICS[id].rarity], 0);
      let roll = stream.float() * total;
      let k = 0;
      for (; k < pool.length - 1; k++) {
        roll -= RELIC_WEIGHT[RELICS[pool[k]].rarity];
        if (roll < 0) break;
      }
      choices.push(pool.splice(k, 1)[0]);
    }
    if (choices.length === 0) {
      gainGlint(RELIC_RULES.emptyPoolGlint, 'relic_pool_empty');
      return false;
    }
    offer = { room: d.room, source: d.source, choices, focus: 0, ...(d.curse ? { curse: d.curse } : {}) };
    events.emit(getTick(), 'relic_offer', { room: d.room, source: d.source, choices: [...choices] });
    return true;
  }

  function focus(i) {
    if (!offer) return null;
    const n = Number(i);
    if (Number.isInteger(n) && n >= 0 && n < offer.choices.length) offer.focus = n;
    return offer.focus;
  }

  // Take choice `i` (default: the focused one). Returns the relic id.
  function choose(i) {
    if (!offer) return null;
    const n = Number.isInteger(Number(i)) && i !== null && i !== undefined ? Number(i) : offer.focus;
    const id = offer.choices[n];
    if (!id) return null;
    owned.push(id);
    const o = offer;
    offer = null;
    events.emit(getTick(), 'relic_gain', { relic: id, rarity: RELICS[id].rarity, room: o.room, source: o.source, owned: owned.length, x: r2(player.x), z: r2(player.z) });
    return id;
  }

  // Path screen: does one door carry a curse? -> { side, curse } | null.
  function rollDoorCurse() {
    if (!on) return null;
    if (!(stream.float() < RELIC_RULES.curseChance)) return null;
    const side = stream.int(2);
    const id = CURSE_IDS[stream.int(CURSE_IDS.length)];
    return { side, curse: id };
  }

  function takeCurse(id, room) {
    if (!on || !CURSES[id]) return;
    curse = { id, room };
    cursesTaken += 1;
    events.emit(getTick(), 'curse_taken', { curse: id, room, taken: cursesTaken });
  }

  const curseFor = (room) => (on && curse && curse.room === room ? curse.id : null);

  // Level reset (level clear): nothing level-bound survives but the relics.
  function levelReset() {
    curse = null;
    due = null;
    offer = null;
    savedThisRoom = [];
    pending = [];
  }

  // Shop: the Healer's shelf prices with Peddler's Seal.
  function shopPrice(price) {
    if (!on || !has('peddlers_seal')) return price;
    return Math.max(1, Math.round(price * (1 - RELICS.peddlers_seal.shop)));
  }

  function view() {
    return {
      owned: owned.map((id) => ({ id, name: RELICS[id].name, rarity: RELICS[id].rarity, text: RELICS[id].text })),
      curse: curse ? { id: curse.id, room: curse.room, name: CURSES[curse.id].name, text: CURSES[curse.id].text } : null,
      cursesTaken,
      offer: offer
        ? {
            room: offer.room,
            source: offer.source,
            focus: offer.focus,
            ...(offer.curse ? { curse: { id: offer.curse, name: CURSES[offer.curse].name } } : {}),
            choices: offer.choices.map((id) => ({ id, name: RELICS[id].name, rarity: RELICS[id].rarity, text: RELICS[id].text })),
          }
        : null,
    };
  }

  function saveState() {
    if (!on) return null;
    return {
      on,
      stream: stream.getState(),
      owned: [...owned],
      curse: curse ? { ...curse } : null,
      cursesTaken,
      due: due ? { ...due } : null,
      offer: offer ? { ...offer, choices: [...offer.choices] } : null,
      savedThisRoom: [...savedThisRoom],
    };
  }
  function loadState(d) {
    if (!d || !d.on) {
      reset(0, false);
      return;
    }
    reset(d.stream && Number.isFinite(d.stream.seed) ? d.stream.seed : 0, true);
    if (d.stream) stream.setState(d.stream);
    owned = Array.isArray(d.owned) ? d.owned.filter((id) => RELICS[id]) : [];
    curse = d.curse && CURSES[d.curse.id] ? { ...d.curse } : null;
    cursesTaken = Number.isFinite(d.cursesTaken) ? d.cursesTaken : 0;
    due = d.due ? { ...d.due } : null;
    offer = d.offer && Array.isArray(d.offer.choices) ? { ...d.offer, choices: d.offer.choices.filter((id) => RELICS[id]) } : null;
    savedThisRoom = Array.isArray(d.savedThisRoom) ? [...d.savedThisRoom] : [];
  }

  return {
    reset,
    enabled: () => on,
    enable(v) {
      on = !!v;
      if (on && !stream) stream = createGameplayRng(relicSeed(0));
      if (combat && typeof combat.setMods === 'function') combat.setMods(on ? mods : null);
      return on;
    },
    mods,
    endOfTick,
    onRoomEnter,
    onRoomCleared,
    presentDue,
    hasOffer: () => !!offer,
    focus,
    choose,
    rollDoorCurse,
    takeCurse,
    curseFor,
    levelReset,
    shopPrice,
    owned: () => [...owned],
    grant(id) {
      // Probe / harness: give a relic now (no pick).
      if (!on || !RELICS[id] || owned.includes(id)) return null;
      owned.push(id);
      events.emit(getTick(), 'relic_gain', { relic: id, rarity: RELICS[id].rarity, room: 0, source: 'grant', owned: owned.length, x: r2(player.x), z: r2(player.z) });
      return id;
    },
    view,
    saveState,
    loadState,
  };
}
