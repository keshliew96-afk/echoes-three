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
// Slice 2 (docs/RELICS.md "Slice 2"): two more relics (Ash Feather, Spore
// Sac), a sixth room curse (Short Fuse), MAJOR curses that bind the party for
// the rest of the run and pay a greater relic (rare or legendary), relic
// drops from elite kills (one roll per elite, at most one drop a level) and a
// relic shelf at the room-7 peddler. Every new roll is on the relic stream.
//
// Scope: relics are ON for campaign runs (Begin Run, the Level Select) and
// OFF for the legacy single-level startRun() the act runner, the golden
// traces and ?run=1 use; cmd('relics', true) turns them on for a probe. With
// relics off nothing here runs, no event fires and the run view carries no
// `relics` key, so the 9 golden traces hash exactly as before.
import { createGameplayRng } from '../core/rng.js';
import { CLASS_OF_SEAT } from '../data/classes.js';
import * as STATUS from './status.js';
import { dailyPick } from '../data/daily.js';

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
  // Slice 2.
  ash_feather: { name: 'Ash Feather', rarity: 'common', text: 'Dodges recover 25% faster.', dodgeCd: -0.25 },
  spore_sac: { name: 'Spore Sac', rarity: 'rare', text: 'Party kills leave no hazards behind and puff spores that slow nearby enemies by 35%.', spores: true },
  // Batch 3 (docs/RELICS.md "Batch 3"): synergy relics. A `cls` relic is a
  // CLASS relic, offered only while that class stands in the party.
  wardens_oath: { name: "Warden's Oath", rarity: 'rare', cls: 'tank', text: 'Each enemy the Tank taunts heals the Tank for 6 HP (once per enemy every 3 seconds).', oath: Object.freeze({ heal: 6, perTick: 4, everyTicks: 180 }) },
  fox_ribbon: { name: 'Fox Ribbon', rarity: 'common', cls: 'swordsman', text: "The Swordsman's critical hits cut again for half the damage.", ribbon: 0.5 },
  fletchers_knot: { name: "Fletcher's Knot", rarity: 'rare', cls: 'archer', text: "The Archer's hits on an exposed enemy ricochet to another enemy nearby for 60% of the damage.", knot: Object.freeze({ frac: 0.6, range: 3.2 }) },
  mercy_bell: { name: 'Mercy Bell', rarity: 'common', cls: 'healer', text: "The Healer's healing past full health becomes a shield, up to 20% of max HP.", bell: Object.freeze({ cap: 0.2, ticks: 300 }) },
  kindling_coal: { name: 'Kindling Coal', rarity: 'rare', text: 'Party critical hits flare, dealing 8 damage to other enemies nearby (16 with Ember Tooth).', kindle: Object.freeze({ dmg: 8, radius: 1.6, max: 4, emberMul: 2 }) },
  sun_chalice: { name: 'Sun Chalice', rarity: 'legendary', text: 'Party healing also sears the nearest enemy for the health it restores.', chalice: Object.freeze({ range: 4.5, min: 1 }) },
  cinder_pact: { name: 'Cinder Pact', rarity: 'legendary', text: 'In a cursed room the party deals 30% more damage and takes 15% less. Each major curse held adds 5% damage everywhere.', pact: Object.freeze({ dealt: 0.3, taken: -0.15, perMajor: 0.05 }) },
  bounty_writ: { name: 'Bounty Writ', rarity: 'common', text: 'Each elite the party kills pays 6 Glint, plus 4 for every affix it carried.', bounty: Object.freeze({ base: 6, perAffix: 4 }) },
  huntsmans_horn: { name: "Huntsman's Horn", rarity: 'rare', text: 'In Hunt and Purge rooms the party deals 25% more damage, and winning one pays 15 more Glint.', horn: Object.freeze({ dealt: 0.25, glint: 15 }) },
  pilgrims_lamp: { name: "Pilgrim's Lamp", rarity: 'common', text: 'Entering an event room heals the party for 30% of max HP and pays 10 Glint.', lamp: Object.freeze({ heal: 0.3, glint: 10 }) },
});
// Batch 3: the class relics (a relic -> the class it needs in the party).
export const CLASS_RELICS = Object.freeze(Object.fromEntries(Object.keys(RELICS).filter((id) => RELICS[id].cls).map((id) => [id, RELICS[id].cls])));
export const RELIC_IDS = Object.freeze(Object.keys(RELICS));

// A curse lasts its room only. `diff` reshapes the room's difficulty numbers
// (sim/run.js applies it to a copy before the wave plan is rolled).
export const CURSES = Object.freeze({
  elite_tide: { name: 'Elite Tide', text: 'Elites are far more common in this room.', diff: { eliteAdd: 0.35 } },
  crowded: { name: 'Crowded', text: 'Every wave in this room is half again as large.', diff: { budgetMul: 1.5 } },
  iron_hide: { name: 'Iron Hide', text: 'Enemies in this room have 40% more HP.', diff: { hpMul: 1.4 } },
  sharp_fangs: { name: 'Sharp Fangs', text: 'Enemies in this room deal 35% more damage.', diff: { dmgMul: 1.35 } },
  famine: { name: 'Famine', text: 'Healing on the party is 60% weaker in this room.', healCut: 0.6 },
  short_fuse: { name: 'Short Fuse', text: 'Enemy attack warnings in this room are 20% shorter (never under 0.6 s).', fuse: { mul: 0.8, minTicks: 36 } },
  // MAJOR curses: taken on a door like any curse, but they bind the party for
  // the rest of the run (across levels) and the room they open pays a GREATER
  // relic pick (rare and legendary only). `diff` reshapes every combat room;
  // `taken` / `healCut` hold everywhere, the boss room included.
  hunted: { name: 'Hunted', major: true, text: 'Elites are more common in every combat room for the rest of the run.', diff: { eliteAdd: 0.15 } },
  thick_hide: { name: 'Thick Hide', major: true, text: 'Enemies in every combat room have 15% more HP for the rest of the run.', diff: { hpMul: 1.15 } },
  brittle_bones: { name: 'Brittle Bones', major: true, text: 'The party takes 12% more damage for the rest of the run.', taken: 0.12 },
  withering: { name: 'Withering', major: true, text: 'Healing on the party is 25% weaker for the rest of the run.', healCut: 0.25 },
});
// The room curses a door can carry, and the major ones.
export const CURSE_IDS = Object.freeze(Object.keys(CURSES).filter((id) => !CURSES[id].major));
export const MAJOR_CURSE_IDS = Object.freeze(Object.keys(CURSES).filter((id) => CURSES[id].major));

// DAILY DESCENT (docs/DAILY.md): the day's fixed relic (any relic not bound
// to a class) and its fixed major curse, from the day's seed.
export function dailyOmen(seed) {
  return {
    relic: dailyPick(seed, RELIC_IDS.filter((id) => !RELICS[id].cls), 'relic'),
    curse: dailyPick(seed, MAJOR_CURSE_IDS, 'curse'),
  };
}

export const RELIC_RULES = Object.freeze({
  choices: 3, // relics per pick
  curseChance: 0.6, // a path screen carries a cursed door
  emptyPoolGlint: 20, // a pick with every relic owned pays Glint instead
  majorChance: 0.3, // a cursed door carries a MAJOR curse instead
  majorMax: 3, // major curses a run can hold
  eliteDrop: 0.05, // an elite killed by the party drops a relic (at most one a level)
  shelfSize: 2, // relics on the peddler's relic shelf
  shelfPrice: Object.freeze({ common: 30, rare: 40, legendary: 55 }),
  spore: Object.freeze({ radius: 1.8, slow: 0.35, ticks: 90 }), // Spore Sac's kill puff
});

// Pick one relic id from `pool` by rarity weight (removes it from `pool`).
function weightedTake(stream, pool) {
  const total = pool.reduce((s, id) => s + RELIC_WEIGHT[RELICS[id].rarity], 0);
  let roll = stream.float() * total;
  let k = 0;
  for (; k < pool.length - 1; k++) {
    roll -= RELIC_WEIGHT[RELICS[pool[k]].rarity];
    if (roll < 0) break;
  }
  return pool.splice(k, 1)[0];
}

// Ash Feather: the dodge cooldown for a set of owned relic ids (the sim's
// mods.dodgeCdMul() as a pure function, for the guest's predictors and the
// HUD rings, which only see the replicated run view).
export function dodgeCooldownTicks(base, ownedIds) {
  const ids = Array.isArray(ownedIds) ? ownedIds : [];
  const add = ids.reduce((s, id) => s + ((RELICS[id] && RELICS[id].dodgeCd) || 0), 0);
  return add ? Math.round(base * Math.max(0.2, 1 + add)) : base;
}

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

export function createRelicSystem({ registry, events, getTick, combat, skillSys, player, live = () => true, glint = null }) {
  let on = false;
  let stream = null;
  let owned = []; // relic ids in pick order
  let curse = null; // { id, room } — the room the party walked into cursed
  let cursesTaken = 0;
  let majors = []; // major curse ids, run-long, in the order taken
  let shelf = null; // the peddler's relic shelf: [{ id, price, sold }]
  let roomNow = 0; // the combat room being fought (elite drop cap)
  let dropped = false; // an elite already dropped a relic this level
  let forced = null; // probe: the next path screen's cursed door
  let dropNext = false; // probe / VFX lab: the next elite kill drops (no draw)
  let due = null; // { room, source } — a pick owed once the draft is done
  let offer = null; // { room, source, choices: [id], focus }
  let savedThisRoom = []; // Last Light: party ids already saved this room
  let pending = []; // procs resolved at the end of the tick (never mid-attack)
  let roomMode = null; // batch 3: the live room's mode (Huntsman's Horn)
  let oathAt = {}; // batch 3: Warden's Oath, enemy id -> the tick it last healed
  let oathTick = -1; // ... and how many taunts healed on that tick
  let oathCount = 0;

  const has = (id) => owned.includes(id);
  const sum = (key) => owned.reduce((s, id) => s + (RELICS[id][key] ?? 0), 0);
  const partyBodies = () => registry.all().filter((e) => e.partyIndex !== undefined);
  // Batch 3: the body of a class's seat, and whether that class stands in
  // the party (a class relic is offered only then).
  const seatBody = (cls) => partyBodies().find((e) => CLASS_OF_SEAT[e.partyIndex] === cls) ?? null;
  const offerable = (id) => !owned.includes(id) && (!RELICS[id].cls || !!seatBody(RELICS[id].cls));
  const pool0 = () => RELIC_IDS.filter(offerable);
  const hostileLive = (e) => !!e && e.faction === 'hostile' && e.hp > 0 && e.lifecycle !== 'break' && e.kind !== 'eglob';
  const relicSource = (src) => typeof src === 'string' && !!RELICS[src];
  const cursedHere = () => !!curse && curse.room === roomNow;
  const pay = (n, reason) => {
    if (typeof glint === 'function' && n > 0) glint(n, reason);
  };

  function reset(seed, enabled) {
    on = !!enabled;
    stream = on ? createGameplayRng(relicSeed(seed)) : null;
    owned = [];
    curse = null;
    cursesTaken = 0;
    majors = [];
    shelf = null;
    roomNow = 0;
    dropped = false;
    forced = null;
    due = null;
    offer = null;
    savedThisRoom = [];
    pending = [];
    roomMode = null;
    oathAt = {};
    oathTick = -1;
    oathCount = 0;
    if (combat && typeof combat.setMods === 'function') combat.setMods(on ? mods : null);
  }

  // ------------------------------------------------------- combat mods --
  // Read by sim/combat.js on every instance while relics are on. With nothing
  // owned and no curse every factor is exactly 1 (and every bonus 0). Live
  // for the whole relic run (not only once a relic is owned) so an elite
  // killed in room 1 can already drop one.
  const majorSum = (key) => majors.reduce((s, id) => s + (CURSES[id][key] ?? 0), 0);
  const mods = {
    active: () => on && live(),
    dealtMul() {
      let m = 1 + sum('dealt');
      if (has('ashen_crown')) m += RELICS.ashen_crown.perCurse * Math.min(RELICS.ashen_crown.perCurseMax, cursesTaken);
      if (has('cinder_pact')) {
        const P = RELICS.cinder_pact.pact;
        m += P.perMajor * majors.length;
        if (cursedHere()) m += P.dealt;
      }
      if (has('huntsmans_horn') && (roomMode === 'hunt' || roomMode === 'purge')) m += RELICS.huntsmans_horn.horn.dealt;
      return m;
    },
    takenMul: () => Math.max(0.1, 1 + sum('taken') + majorSum('taken') + (has('cinder_pact') && cursedHere() ? RELICS.cinder_pact.pact.taken : 0)),
    critChance: () => sum('crit'),
    critMulAdd: () => sum('critMul'),
    kbMul: () => 1 + sum('kb'),
    healMul() {
      let m = 1 + sum('heal');
      if (curse && CURSES[curse.id] && CURSES[curse.id].healCut && !CURSES[curse.id].major) m *= 1 - CURSES[curse.id].healCut;
      for (const id of majors) if (CURSES[id].healCut) m *= 1 - CURSES[id].healCut;
      return m;
    },
    // Ash Feather: the dodge cooldown factor (1 = unchanged).
    dodgeCdMul: () => Math.max(0.2, 1 + sum('dodgeCd')),
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
    // A party blow is about to kill `target` (before its death event).
    // Spore Sac: the corpse leaves no hazard (sim/enemies.js reads the flag).
    beforeKill(target) {
      if (has('spore_sac')) target.noDeathHazard = true;
    },
    onKill(target) {
      if (has('leech_fang')) pending.push({ kind: 'leech' });
      if (!target) return;
      if (has('spore_sac')) pending.push({ kind: 'spores', x: target.x, z: target.z, id: target.id });
      if (target.elite && has('bounty_writ')) pending.push({ kind: 'bounty', x: target.x, z: target.z, id: target.id, affixes: Array.isArray(target.affixes) ? target.affixes.length : 0 });
      if (target.elite && (!dropped || dropNext)) pending.push({ kind: 'drop', x: target.x, z: target.z, id: target.id, etype: target.kind });
    },
  };

  // ------------------------------------------------ batch 3 listeners --
  // The synergy relics read the sim's own bus (hits, heals, statuses). Each
  // only queues a proc for endOfTick(); nothing here runs while relics are
  // off, so the legacy run and the golden traces never see them.
  const bodyCls = (id) => {
    const b = id !== null && id !== undefined ? registry.byId(id) : null;
    return b && b.partyIndex !== undefined ? CLASS_OF_SEAT[b.partyIndex] : null;
  };
  events.on('hit', (ev) => {
    if (!on || !live() || owned.length === 0 || relicSource(ev.source) || !(ev.amount > 0)) return;
    const t = registry.byId(ev.target);
    if (!t || t.faction !== 'hostile' || t.lifecycle === 'break') return;
    const atk = ev.attacker !== null && ev.attacker !== undefined ? registry.byId(ev.attacker) : null;
    if (atk && atk.faction === 'hostile') return;
    // A party blow: a party body's, or an id-less bolt or skill.
    if (!atk && ev.delivery !== 'basic' && ev.delivery !== 'skill') return;
    const cls = atk ? bodyCls(atk.id) : null;
    if (ev.crit && cls === 'swordsman' && has('fox_ribbon')) pending.push({ kind: 'ribbon', target: t.id, amount: ev.amount * RELICS.fox_ribbon.ribbon, dx: ev.dirX ?? 0, dz: ev.dirZ ?? 0 });
    if (cls === 'archer' && has('fletchers_knot') && STATUS.magnitude(t, 'exposed', getTick()) > 0) pending.push({ kind: 'knot', from: t.id, x: t.x, z: t.z, amount: ev.amount * RELICS.fletchers_knot.knot.frac });
    if (ev.crit && has('kindling_coal')) pending.push({ kind: 'kindle', from: t.id, x: t.x, z: t.z });
  });
  events.on('heal', (ev) => {
    if (!on || !live() || owned.length === 0) return;
    const t = registry.byId(ev.target);
    if (!t || t.partyIndex === undefined) return;
    if (has('mercy_bell') && ev.amount > ev.applied + 0.01 && bodyCls(ev.healer) === 'healer') pending.push({ kind: 'bell', target: t.id, healer: ev.healer, amount: ev.amount - ev.applied });
    if (has('sun_chalice') && ev.applied >= RELICS.sun_chalice.chalice.min) pending.push({ kind: 'chalice', target: t.id, x: t.x, z: t.z, amount: ev.applied });
  });
  events.on('status_apply', (ev) => {
    if (!on || !live() || ev.status !== 'taunt' || !has('wardens_oath')) return;
    if (bodyCls(ev.src) !== 'tank') return;
    const O = RELICS.wardens_oath.oath;
    const tick = getTick();
    if (Number.isFinite(oathAt[ev.id]) && tick - oathAt[ev.id] < O.everyTicks) return;
    if (oathTick !== tick) {
      oathTick = tick;
      oathCount = 0;
    }
    if (oathCount >= O.perTick) return;
    oathCount += 1;
    oathAt[ev.id] = tick;
    pending.push({ kind: 'oath', tank: ev.src, from: ev.id, x: ev.x ?? 0, z: ev.z ?? 0 });
  });

  // Short Fuse: the live room's telegraph rule ({ mul, minTicks }) or null.
  // sim/enemies.js shortens every new telegraph by it.
  function fuse() {
    if (!on || !curse) return null;
    const c = CURSES[curse.id];
    return c && c.fuse ? c.fuse : null;
  }

  // A relic arrives without a pick (elite drop, shop, probe grant).
  function gain(id, source, at, extra = {}) {
    owned.push(id);
    events.emit(getTick(), 'relic_gain', { relic: id, rarity: RELICS[id].rarity, room: roomNow, source, owned: owned.length, x: r2(at.x), z: r2(at.z), ...extra });
  }

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
      } else if (p.kind === 'spores') {
        const S = RELIC_RULES.spore;
        const tick = getTick();
        let n = 0;
        for (const e of registry.all()) {
          if (e.faction !== 'hostile' || !(e.hp > 0) || e.lifecycle === 'break' || e.kind === 'eglob') continue;
          if (Math.hypot(e.x - p.x, e.z - p.z) > S.radius + (e.radius ?? 0)) continue;
          if (combat.status.apply(e, 'slow', S.slow, S.ticks, tick, null)) n += 1;
        }
        events.emit(tick, 'relic_proc', { relic: 'spore_sac', x: r2(p.x), z: r2(p.z), radius: S.radius, slowed: n });
      } else if (p.kind === 'drop') {
        // One roll per elite kill, at most one drop a level.
        if (dropped && !dropNext) continue;
        if (dropNext) dropNext = false;
        else if (!(stream.float() < RELIC_RULES.eliteDrop)) continue;
        const pool = pool0();
        if (pool.length === 0) continue;
        const id = weightedTake(stream, pool);
        dropped = true;
        events.emit(getTick(), 'relic_drop', { relic: id, rarity: RELICS[id].rarity, room: roomNow, from: p.id, etype: p.etype, x: r2(p.x), z: r2(p.z), px: r2(player.x), pz: r2(player.z) });
        gain(id, 'elite', player, { fromX: r2(p.x), fromZ: r2(p.z) });
      } else if (p.kind === 'oath') {
        const tank = registry.byId(p.tank);
        if (!tank || !(tank.hp > 0)) continue;
        combat.applyHeal(tank, RELICS.wardens_oath.oath.heal, { healer: tank.id, source: 'wardens_oath' });
        events.emit(getTick(), 'relic_proc', { relic: 'wardens_oath', target: tank.id, from: p.from, fx: r2(p.x), fz: r2(p.z), x: r2(tank.x), z: r2(tank.z) });
      } else if (p.kind === 'ribbon') {
        const t = registry.byId(p.target);
        if (!hostileLive(t)) continue;
        const r = combat.applyDamage(t, p.amount, { delivery: 'skill', shape: 'ribbon', dirX: p.dx, dirZ: p.dz, attacker: null, source: 'fox_ribbon' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'fox_ribbon', target: t.id, amount: r2(r.amount), dx: r2(p.dx), dz: r2(p.dz), x: r2(t.x), z: r2(t.z) });
      } else if (p.kind === 'knot') {
        const K = RELICS.fletchers_knot.knot;
        let best = null;
        let bd = Infinity;
        for (const e of registry.all()) {
          if (e.id === p.from || !hostileLive(e)) continue;
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d <= K.range + (e.radius ?? 0) && d < bd) {
            best = e;
            bd = d;
          }
        }
        if (!best) continue;
        const l = bd || 1;
        const r = combat.applyDamage(best, p.amount, { delivery: 'skill', shape: 'projectile', dirX: (best.x - p.x) / l, dirZ: (best.z - p.z) / l, attacker: null, source: 'fletchers_knot' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'fletchers_knot', target: best.id, from: p.from, fx: r2(p.x), fz: r2(p.z), x: r2(best.x), z: r2(best.z) });
      } else if (p.kind === 'kindle') {
        const K = RELICS.kindling_coal.kindle;
        const dmg = K.dmg * (has('ember_tooth') ? K.emberMul : 1);
        const near = registry
          .all()
          .filter((e) => e.id !== p.from && hostileLive(e) && Math.hypot(e.x - p.x, e.z - p.z) <= K.radius + (e.radius ?? 0))
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z) || a.id - b.id)
          .slice(0, K.max);
        const hit = [];
        for (const e of near) {
          const l = Math.hypot(e.x - p.x, e.z - p.z) || 1;
          const r = combat.applyDamage(e, dmg, { delivery: 'skill', shape: 'kindle', dirX: (e.x - p.x) / l, dirZ: (e.z - p.z) / l, attacker: null, source: 'kindling_coal' });
          if (r && r.amount > 0) hit.push(e.id);
        }
        events.emit(getTick(), 'relic_proc', { relic: 'kindling_coal', from: p.from, hit, radius: K.radius, ember: has('ember_tooth'), x: r2(p.x), z: r2(p.z) });
      } else if (p.kind === 'bell') {
        const t = registry.byId(p.target);
        if (!t || !(t.hp > 0)) continue;
        const B = RELICS.mercy_bell.bell;
        const before = STATUS.magnitude(t, 'shield', getTick());
        const rec = STATUS.addShield(t, p.amount, t.maxHp * B.cap, B.ticks, getTick(), p.healer);
        if (rec && rec.mag > before + 1e-6) events.emit(getTick(), 'relic_proc', { relic: 'mercy_bell', target: t.id, shield: r2(rec.mag), x: r2(t.x), z: r2(t.z) });
      } else if (p.kind === 'chalice') {
        const C = RELICS.sun_chalice.chalice;
        const from = registry.byId(p.target);
        const fx = from ? from.x : p.x;
        const fz = from ? from.z : p.z;
        let best = null;
        let bd = Infinity;
        for (const e of registry.all()) {
          if (!hostileLive(e)) continue;
          const d = Math.hypot(e.x - fx, e.z - fz);
          if (d <= C.range + (e.radius ?? 0) && d < bd) {
            best = e;
            bd = d;
          }
        }
        if (!best) continue;
        const l = bd || 1;
        const r = combat.applyDamage(best, p.amount, { delivery: 'skill', shape: 'sear', dirX: (best.x - fx) / l, dirZ: (best.z - fz) / l, attacker: null, source: 'sun_chalice' });
        if (r && r.amount > 0) events.emit(getTick(), 'relic_proc', { relic: 'sun_chalice', target: best.id, from: p.target, amount: r2(r.amount), fx: r2(fx), fz: r2(fz), x: r2(best.x), z: r2(best.z) });
      } else if (p.kind === 'bounty') {
        const B = RELICS.bounty_writ.bounty;
        const n = B.base + B.perAffix * p.affixes;
        pay(n, 'relic_bounty_writ');
        events.emit(getTick(), 'relic_proc', { relic: 'bounty_writ', from: p.id, glint: n, affixes: p.affixes, x: r2(p.x), z: r2(p.z) });
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
    roomNow = room;
    roomMode = mode;
    if (curse && curse.room !== room) curse = null;
    if (curse) {
      events.emit(getTick(), 'curse_apply', { curse: curse.id, room, mode, ...(CURSES[curse.id].major ? { major: true } : {}), x: r2(player.x), z: r2(player.z) });
      if (has('cinder_pact')) events.emit(getTick(), 'relic_proc', { relic: 'cinder_pact', room, majors: majors.length, x: r2(player.x), z: r2(player.z) });
    }
    if (has('huntsmans_horn') && (mode === 'hunt' || mode === 'purge')) events.emit(getTick(), 'relic_proc', { relic: 'huntsmans_horn', room, mode, stage: 'enter', x: r2(player.x), z: r2(player.z) });
    if (has('pilgrims_lamp') && mode === 'event') {
      const L = RELICS.pilgrims_lamp.lamp;
      for (const e of partyBodies()) if (e.hp > 0 && e.hp < e.maxHp) combat.applyHeal(e, e.maxHp * L.heal, { source: 'pilgrims_lamp' });
      pay(L.glint, 'relic_pilgrims_lamp');
      events.emit(getTick(), 'relic_proc', { relic: 'pilgrims_lamp', room, glint: L.glint, x: r2(player.x), z: r2(player.z) });
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
  function onRoomCleared(room, { forfeited = false, gainGlint, boss = false, objective = null, won = false } = {}) {
    if (!on) return;
    const tick = getTick();
    roomMode = null;
    if (has('huntsmans_horn') && objective && won) {
      gainGlint(RELICS.huntsmans_horn.horn.glint, 'relic_huntsmans_horn');
      events.emit(tick, 'relic_proc', { relic: 'huntsmans_horn', room, mode: objective, stage: 'won', glint: RELICS.huntsmans_horn.horn.glint, x: r2(player.x), z: r2(player.z) });
    }
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
    if (cursed) due = { room, source: CURSES[cursed].major ? 'major' : 'curse', curse: cursed };
    else if (room === 1) due = { room, source: 'free' };
  }

  // Called once the draft is resolved: opens the owed pick, if any. Returns
  // true when a pick is now open (the run enters phase 'relic').
  function presentDue(gainGlint) {
    if (!on || !due) return false;
    const d = due;
    due = null;
    let pool = pool0();
    // A major curse pays a GREATER pick: rare and legendary relics only
    // (any relic once those run out).
    // EVENT ROOMS: the altar pays legendaries (rare when none are left), the
    // spirit pays the greater pool like a major curse.
    if (d.source === 'altar') {
      const legend = pool.filter((id) => RELICS[id].rarity === 'legendary');
      const greater = pool.filter((id) => RELICS[id].rarity !== 'common');
      if (legend.length > 0) pool = legend;
      else if (greater.length > 0) pool = greater;
    }
    if (d.source === 'major' || d.source === 'spirit') {
      const greater = pool.filter((id) => RELICS[id].rarity !== 'common');
      if (greater.length > 0) pool = greater;
    }
    if (Array.isArray(d.not)) pool = pool.filter((id) => !d.not.includes(id));
    const choices = [];
    while (choices.length < RELIC_RULES.choices && pool.length > 0) choices.push(weightedTake(stream, pool));
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

  // Path screen: does one door carry a curse? -> { side, curse, major? } | null.
  // A cursed door is major with RELIC_RULES.majorChance while the run holds
  // fewer than majorMax major curses (one more stream draw only then).
  function rollDoorCurse() {
    if (!on) return null;
    if (forced) {
      const f = forced;
      forced = null;
      return { side: f.side, curse: f.curse, ...(CURSES[f.curse].major ? { major: true } : {}) };
    }
    if (!(stream.float() < RELIC_RULES.curseChance)) return null;
    const side = stream.int(2);
    const free = MAJOR_CURSE_IDS.filter((id) => !majors.includes(id));
    if (free.length > 0 && majors.length < RELIC_RULES.majorMax && stream.float() < RELIC_RULES.majorChance) {
      return { side, curse: free[stream.int(free.length)], major: true };
    }
    const id = CURSE_IDS[stream.int(CURSE_IDS.length)];
    return { side, curse: id };
  }

  function takeCurse(id, room) {
    if (!on || !CURSES[id]) return;
    const major = !!CURSES[id].major;
    if (major && majors.includes(id)) return;
    curse = { id, room, ...(major ? { major: true } : {}) };
    if (major) majors.push(id);
    cursesTaken += 1;
    events.emit(getTick(), 'curse_taken', { curse: id, room, taken: cursesTaken, ...(major ? { major: true, majors: majors.length } : {}) });
  }

  // The ROOM curse that reshapes room `room`'s numbers (a major curse's
  // numbers come from majorCurses(), every combat room).
  const curseFor = (room) => (on && curse && curse.room === room && !curse.major ? curse.id : null);

  // ------------------------------------------------- the relic shelf --
  // The room-7 peddler's relic shelf: RELIC_RULES.shelfSize relics (relic
  // stream, by rarity weight, none owned), priced by rarity. Any character
  // buys from its own purse; the relic is the party's.
  function openShelf() {
    if (!on) return null;
    const pool = pool0();
    const ids = [];
    while (ids.length < RELIC_RULES.shelfSize && pool.length > 0) ids.push(weightedTake(stream, pool));
    shelf = ids.map((id) => ({ id, price: RELIC_RULES.shelfPrice[RELICS[id].rarity], sold: false }));
    events.emit(getTick(), 'relic_shelf', { stock: shelf.map((s) => ({ relic: s.id, rarity: RELICS[s.id].rarity, price: s.price })) });
    return shelf;
  }
  const shelfItem = (i) => (on && shelf && shelf[i] && !shelf[i].sold && !owned.includes(shelf[i].id) ? shelf[i] : null);
  // The purse was charged by the run; the relic joins the party.
  function sellShelf(i, seat, purse) {
    const item = shelfItem(i);
    if (!item) return null;
    item.sold = true;
    events.emit(getTick(), 'relic_purchase', { relic: item.id, rarity: RELICS[item.id].rarity, price: item.price, seat, wallet: purse, index: i });
    gain(item.id, 'shop', player, { seat });
    return item.id;
  }

  // Level reset (level clear): nothing level-bound survives but the relics.
  function levelReset() {
    shelf = null;
    dropped = false;
    roomNow = 0;
    curse = null;
    due = null;
    offer = null;
    savedThisRoom = [];
    pending = [];
    roomMode = null;
    oathAt = {};
  }

  // Shop: the Healer's shelf prices with Peddler's Seal.
  function shopPrice(price) {
    if (!on || !has('peddlers_seal')) return price;
    return Math.max(1, Math.round(price * (1 - RELICS.peddlers_seal.shop)));
  }

  function view() {
    return {
      owned: owned.map((id) => ({ id, name: RELICS[id].name, rarity: RELICS[id].rarity, text: RELICS[id].text, ...(RELICS[id].cls ? { cls: RELICS[id].cls } : {}) })),
      curse: curse ? { id: curse.id, room: curse.room, name: CURSES[curse.id].name, text: CURSES[curse.id].text, ...(curse.major ? { major: true } : {}) } : null,
      cursesTaken,
      majors: majors.map((id) => ({ id, name: CURSES[id].name, text: CURSES[id].text })),
      shelf: shelf ? shelf.map((s) => ({ id: s.id, name: RELICS[s.id].name, rarity: RELICS[s.id].rarity, text: RELICS[s.id].text, ...(RELICS[s.id].cls ? { cls: RELICS[s.id].cls } : {}), price: s.price, sold: s.sold || owned.includes(s.id) })) : null,
      offer: offer
        ? {
            room: offer.room,
            source: offer.source,
            focus: offer.focus,
            ...(offer.curse ? { curse: { id: offer.curse, name: CURSES[offer.curse].name } } : {}),
            choices: offer.choices.map((id) => ({ id, name: RELICS[id].name, rarity: RELICS[id].rarity, text: RELICS[id].text, ...(RELICS[id].cls ? { cls: RELICS[id].cls } : {}) })),
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
      majors: [...majors],
      shelf: shelf ? shelf.map((s) => ({ ...s })) : null,
      roomNow,
      dropped,
      due: due ? { ...due } : null,
      offer: offer ? { ...offer, choices: [...offer.choices] } : null,
      savedThisRoom: [...savedThisRoom],
      ...(roomMode ? { roomMode } : {}),
      ...(Object.keys(oathAt).length ? { oathAt: { ...oathAt } } : {}),
      ...(pending.length ? { pending: pending.map((p) => ({ ...p })) } : {}),
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
    majors = Array.isArray(d.majors) ? d.majors.filter((id) => CURSES[id] && CURSES[id].major) : [];
    shelf = Array.isArray(d.shelf) ? d.shelf.filter((s) => s && RELICS[s.id]).map((s) => ({ id: s.id, price: Number(s.price) || 0, sold: !!s.sold })) : null;
    roomNow = Number.isFinite(d.roomNow) ? d.roomNow : 0;
    dropped = !!d.dropped;
    due = d.due ? { ...d.due } : null;
    offer = d.offer && Array.isArray(d.offer.choices) ? { ...d.offer, choices: d.offer.choices.filter((id) => RELICS[id]) } : null;
    savedThisRoom = Array.isArray(d.savedThisRoom) ? [...d.savedThisRoom] : [];
    roomMode = typeof d.roomMode === 'string' ? d.roomMode : null;
    oathAt = d.oathAt && typeof d.oathAt === 'object' ? { ...d.oathAt } : {};
    pending = Array.isArray(d.pending) ? d.pending.filter((p) => p && typeof p.kind === 'string').map((p) => ({ ...p })) : [];
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
    majorCurses: () => (on ? [...majors] : []),
    fuse,
    openShelf,
    shelfItem,
    sellShelf,
    dropNext() {
      if (!on) return false;
      dropNext = true;
      return true;
    },
    forceDoor(curseId, side = 0) {
      // Probe: the next path screen's cursed door (no stream draw).
      if (!on || !CURSES[curseId]) return null;
      forced = { curse: curseId, side: side === 1 ? 1 : 0 };
      return forced;
    },
    levelReset,
    shopPrice,
    owned: () => [...owned],
    pool: () => (on ? pool0() : []),
    // DAILY DESCENT (docs/DAILY.md): the day's fixed relic and major curse,
    // held from the first room. The curse binds like one taken on a door
    // but opens no room, so it owes no pick.
    grantDaily(relicId, curseId) {
      if (!on) return null;
      if (RELICS[relicId] && !owned.includes(relicId)) gain(relicId, 'daily', player);
      if (CURSES[curseId] && CURSES[curseId].major && !majors.includes(curseId)) {
        takeCurse(curseId, 0);
        curse = null;
      }
      return { relic: relicId, curse: curseId };
    },
    grant(id) {
      // Probe / harness: give a relic now (no pick).
      if (!on || !RELICS[id] || owned.includes(id)) return null;
      gain(id, 'grant', player);
      return id;
    },
    // EVENT ROOMS (docs/EVENT_ROOMS.md): a pick owed by an encounter (shown
    // by the next presentDue), a relic given outright, the newest relic
    // taken back, and a major curse taken in an event room.
    owe(room, source, { not = null, curse = null } = {}) {
      if (!on) return false;
      due = { room, source, ...(Array.isArray(not) && not.length ? { not: [...not] } : {}), ...(curse && CURSES[curse] ? { curse } : {}) };
      return true;
    },
    grantRandom(source, at = player) {
      if (!on) return null;
      const pool = pool0();
      if (pool.length === 0) return null;
      const id = weightedTake(stream, pool);
      gain(id, source, at);
      return id;
    },
    loseNewest(source) {
      if (!on || owned.length === 0) return null;
      const id = owned.pop();
      events.emit(getTick(), 'relic_lose', { relic: id, rarity: RELICS[id].rarity, source, owned: owned.length, x: r2(player.x), z: r2(player.z) });
      return id;
    },
    freeMajors: () => (on && majors.length < RELIC_RULES.majorMax ? MAJOR_CURSE_IDS.filter((id) => !majors.includes(id)) : []),
    takeMajor(id, room) {
      if (!on || !CURSES[id] || !CURSES[id].major || majors.includes(id)) return null;
      majors.push(id);
      cursesTaken += 1;
      events.emit(getTick(), 'curse_taken', { curse: id, room, taken: cursesTaken, major: true, majors: majors.length, source: 'altar' });
      return id;
    },
    view,
    saveState,
    loadState,
  };
}
