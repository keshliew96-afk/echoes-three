// Content reconcile (fix-M2-r6, SAVE6-F1). Owner: M2. Pure module — no DOM.
//
// A save file can name content THIS build does not have: a skill or node
// renamed or removed by an update (a file exported from another version, an
// old autosave), or a hand-edited file. The integrity hash cannot catch that
// — the file is exactly as written — and the sim trusts its ids (SKILLS[id],
// NODES[id]) on every frame, so one unknown id hard-locked the game
// (gauntlet r6 SAVE6-F1: 'reading id' / 'reading kind' every frame).
//
// reconcileContent(tree) checks every place a StateTree holds a skill or node
// id (the census: tools/gntfixM26-idpaths.mjs) against the live content and
// repairs the tree IN PLACE (the caller passes its private clone), the way a
// shipped game treats removed content — it leaves the save, nothing else does:
//   - a skill this character cannot hold (unknown, another class's, a second
//     copy, a 5th+ skill) leaves the loadout; the nodes socketed in it go to
//     that character's bench (never lost, BUILD_BRIEF ruling A17), and its
//     Resonance count, pending Echo recasts and passive clocks end with it;
//   - a node this build does not know leaves the socket / bench / shelf;
//   - a reward card that offers unknown content becomes an empty offer ("the
//     run moves on"); a swap offer whose character now has a free slot
//     becomes a plain offer; a shop / shelf item for an unknown node leaves;
//   - effects in flight of an unknown skill (bolts, zones) end;
//   - records (spoils, the level card's / run summary's build lists, the
//     level starter grant) drop the unknown ids.
// It is a strict NO-OP on a tree whose ids are all known (nothing is
// re-ordered, re-created or re-assigned), so every save of this build keeps
// its hash (G2.1 round trips, goldens). It draws no RNG and emits nothing.
//
// Returns a report: { changed, skills: [{ seat, id, why }], nodes: [{ seat,
// id, where }], benched: [{ seat, node, from }], offers, shopItems, effects,
// records } — describeRepair(report) is the player-facing line.
import { SKILLS } from '../sim/skills.js';
import { NODES } from '../sim/nodes.js';
import { CLASS_OF_SEAT, CLASS_NAME } from '../data/classes.js';
import { LINEUP_CLASSES } from '../data/lineup.js';
import { SKILL_SLOTS } from '../core/constants.js';

const has = Object.prototype.hasOwnProperty;
// Own keys only: a crafted id such as "constructor" or "toString" is not a
// skill just because Object.prototype has a member by that name.
export const isKnownSkill = (id) => typeof id === 'string' && has.call(SKILLS, id);
export const isKnownNode = (id) => typeof id === 'string' && has.call(NODES, id);
// An effect in flight may carry a class's BASIC attack as its `skill`
// (allies.js: `${classId}_basic` — the Archer's arrows); that is not a
// skill row but it is content this build has.
const isKnownEffectSkill = (id) => isKnownSkill(id) || (typeof id === 'string' && id.endsWith('_basic') && has.call(CLASS_NAME, id.slice(0, -6)));
const skillClass = (id) => SKILLS[id].cls || 'healer';
const fits = (classId, id) => isKnownSkill(id) && skillClass(id) === classId;

// The line an emptied reward card shows (draft.js EMPTY_LINE style).
export const RETIRED_LINE = 'not in this version of Echoes — the run moves on';
export const RETIRED_REASON = 'retired';

function newReport() {
  return { changed: false, skills: [], nodes: [], benched: [], offers: 0, shopItems: 0, effects: 0, records: 0 };
}

// Drop entries of a [[key, value]] list / an { key: value } map whose key is
// gone. Reassigns only when something was dropped.
function filterPairs(list, drop) {
  if (!Array.isArray(list)) return list;
  if (!list.some((p) => Array.isArray(p) && drop(p[0]))) return list;
  return list.filter((p) => !(Array.isArray(p) && drop(p[0])));
}
function filterKeys(obj, drop) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  let any = false;
  for (const k of Object.keys(obj)) {
    if (drop(k)) {
      delete obj[k];
      any = true;
    }
  }
  return any;
}

// One character's build payload (createBuildSystem().saveState()).
// `gone` = the skills that left this character's loadout (plus every
// unknown key met here); rows keyed by them are released to the bench.
function reconcileBuild(b, seat, gone, R) {
  if (!b || typeof b !== 'object') return;
  const dropSkill = (k) => !isKnownSkill(k) || gone.has(k);
  if (Array.isArray(b.bench) && b.bench.some((r) => !(r && typeof r === 'object' && isKnownNode(r.node)))) {
    const keep = [];
    for (const r of b.bench) {
      if (r && typeof r === 'object' && isKnownNode(r.node)) keep.push(r);
      else R.nodes.push({ seat, id: r && typeof r === 'object' && typeof r.node === 'string' ? r.node : null, where: 'bench' });
    }
    b.bench = keep;
    R.changed = true;
  }
  if (Array.isArray(b.assignments)) {
    let changed = false;
    const out = [];
    for (const pair of b.assignments) {
      if (!Array.isArray(pair)) {
        changed = true;
        continue;
      }
      const [k, row] = pair;
      const cells = Array.isArray(row) ? row : [];
      if (dropSkill(k)) {
        changed = true;
        if (typeof k === 'string') gone.add(k);
        for (const rec of cells) {
          if (!rec) continue;
          if (typeof rec === 'object' && isKnownNode(rec.node) && Array.isArray(b.bench)) {
            b.bench.push(rec); // provenance kept (A17: never lost)
            R.benched.push({ seat, node: rec.node, from: typeof k === 'string' ? k : null });
          } else R.nodes.push({ seat, id: rec && typeof rec === 'object' && typeof rec.node === 'string' ? rec.node : null, where: 'socket' });
        }
        continue;
      }
      if (cells.some((rec) => rec && !(typeof rec === 'object' && isKnownNode(rec.node)))) {
        changed = true;
        out.push([
          k,
          cells.map((rec) => {
            if (!rec || (typeof rec === 'object' && isKnownNode(rec.node))) return rec;
            R.nodes.push({ seat, id: typeof rec === 'object' && typeof rec.node === 'string' ? rec.node : null, where: 'socket', skill: k });
            return null;
          }),
        ]);
        continue;
      }
      out.push(pair);
    }
    if (changed) {
      b.assignments = out;
      R.changed = true;
    }
  }
  const r1 = filterPairs(b.resonance, dropSkill);
  if (r1 !== b.resonance) {
    b.resonance = r1;
    R.changed = true;
  }
  const r2 = filterPairs(b.auraEchoNext, dropSkill);
  if (r2 !== b.auraEchoNext) {
    b.auraEchoNext = r2;
    R.changed = true;
  }
  if (Array.isArray(b.echoQueue) && b.echoQueue.some((q) => !q || dropSkill(q.skill))) {
    b.echoQueue = b.echoQueue.filter((q) => q && !dropSkill(q.skill));
    R.changed = true;
  }
}

// A loadout (array of ids) for `classId`: unknown / foreign / repeated / 5th+
// entries leave. Returns { slots, gone } — `slots` is the SAME array when
// nothing changed.
function reconcileLoadout(slots, classId, seat, R, idOf = (x) => x, empty = null) {
  if (!Array.isArray(slots)) return { slots, gone: new Set(), changedIdx: [] };
  const gone = new Set();
  const seen = new Set();
  const changedIdx = [];
  let changed = false;
  const out = slots.map((x, i) => {
    if (x === null || x === undefined) return x;
    const id = idOf(x);
    let why = null;
    if (typeof id !== 'string') why = 'malformed';
    else if (!isKnownSkill(id)) why = 'unknown';
    else if (skillClass(id) !== classId) why = 'class';
    else if (seen.has(id)) why = 'duplicate';
    else if (i >= SKILL_SLOTS) why = 'over_cap';
    if (!why) {
      seen.add(id);
      return x;
    }
    changed = true;
    changedIdx.push(i);
    R.skills.push({ seat, id: typeof id === 'string' ? id : null, why });
    // A repeated copy leaves, the skill itself stays (its sockets too).
    if (typeof id === 'string' && why !== 'duplicate') gone.add(id);
    return empty;
  });
  if (!changed) return { slots, gone, changedIdx };
  R.changed = true;
  // Never more than 4 slots (a 5th+ skill was nulled above; trim the tail).
  while (out.length > SKILL_SLOTS && out[out.length - 1] === empty) out.pop();
  return { slots: out, gone, changedIdx };
}

// A reward card / run.reward offer: empty when its content is unknown (or a
// skill this character cannot hold), plain when a swap offer's character now
// has a free slot. `card` = a party-page card ({ seat, type, id, ... }) or
// run.reward ({ type, id, swap?, replace?, suggest?, upgrade?, pool? }).
function offerUnknown(o, classId) {
  if (!o || typeof o !== 'object' || !o.type) return false;
  if (o.type === 'skill') return !fits(classId, o.id);
  if (o.type === 'node') return !isKnownNode(o.id);
  return false; // only skill / node offers name content (draft.js)
}
function upgradeUnknown(o) {
  const u = o && o.upgrade;
  if (!u || typeof u !== 'object') return false;
  return (u.skill !== undefined && u.skill !== null && !isKnownSkill(u.skill)) || (u.replaces !== undefined && u.replaces !== null && !isKnownNode(u.replaces));
}

function reconcileReward(reward, free, R) {
  if (!reward || typeof reward !== 'object') return;
  if (offerUnknown(reward, 'healer')) {
    reward.type = null;
    reward.id = null;
    reward.substituted = false;
    reward.line = RETIRED_LINE;
    reward.reason = RETIRED_REASON;
    reward.poolSize = 0;
    for (const k of ['swap', 'replace', 'suggest', 'pool', 'upgrade']) delete reward[k];
    R.offers += 1;
    R.changed = true;
    return;
  }
  if (upgradeUnknown(reward)) {
    delete reward.upgrade;
    delete reward.pool;
    R.changed = true;
    R.records += 1;
  }
  if (reward.swap && free > 0) {
    // The character lost a skill to this reconcile: a free slot, so the
    // skill simply equips (applyTake's swap path needs 4 owned).
    for (const k of ['swap', 'replace', 'suggest']) delete reward[k];
    reward.freeSkillSlots = free;
    R.changed = true;
  }
}

function reconcileCard(c, classId, free, R) {
  if (!c || typeof c !== 'object') return;
  if (Array.isArray(c.spoils) && c.spoils.some((id) => !isKnownNode(id))) {
    c.spoils = c.spoils.filter((id) => isKnownNode(id));
    R.records += 1;
    R.changed = true;
  }
  if (offerUnknown(c, classId)) {
    c.type = null;
    c.id = null;
    c.swap = false;
    c.substituted = false;
    c.replace = null;
    c.line = RETIRED_LINE;
    c.reason = RETIRED_REASON;
    c.suggest = { choice: 'leave', replace: null };
    delete c.pool;
    delete c.upgrade;
    if (c.seat === 0) {
      if (c.decided && c.choice === 'take') c.choice = 'leave';
    } else {
      // Nothing to offer: decided (Continue), as partypage.open() does.
      c.decided = true;
      c.choice = 'leave';
      c.by = 'ai';
    }
    R.offers += c.seat === 0 ? 0 : 1; // card 0 mirrors run.reward (counted there)
    R.changed = true;
    return;
  }
  if (upgradeUnknown(c)) {
    delete c.upgrade;
    delete c.pool;
    R.changed = true;
  }
  if (c.swap && free > 0) {
    c.swap = false;
    c.replace = null;
    if (c.suggest && typeof c.suggest === 'object') c.suggest = { choice: 'take', replace: null };
    R.changed = true;
  }
}

// summary / card build lists: unknown skills -> null in a 4-slot list,
// dropped from a plain list.
function nullUnknownSkills(list) {
  if (!Array.isArray(list) || !list.some((id) => id !== null && !isKnownSkill(id))) return list;
  return list.map((id) => (id === null || isKnownSkill(id) ? id : null));
}
function dropUnknown(list, known) {
  if (!Array.isArray(list) || !list.some((id) => !known(id))) return list;
  return list.filter((id) => known(id));
}

export function reconcileContent(tree) {
  const R = newReport();
  if (!tree || typeof tree !== 'object' || !tree.systems || typeof tree.systems !== 'object') return R;
  const sys = tree.systems;
  const freeBySeat = [0, 0, 0, 0];

  // ---- the Healer (seat 0): systems.skills + systems.build + the player
  let gone0 = new Set();
  let changed0 = [];
  if (sys.skills && Array.isArray(sys.skills.slots)) {
    const r = reconcileLoadout(sys.skills.slots, 'healer', 0, R, (s) => (s && typeof s === 'object' ? s.id : undefined), null);
    if (r.slots !== sys.skills.slots) sys.skills.slots = r.slots;
    gone0 = r.gone;
    changed0 = r.changedIdx;
    const a = filterPairs(sys.skills.auraNext, (k) => !isKnownSkill(k) || gone0.has(k));
    if (a !== sys.skills.auraNext) {
      sys.skills.auraNext = a;
      R.changed = true;
    }
    for (let i = 0; i < SKILL_SLOTS; i++) if (!sys.skills.slots[i]) freeBySeat[0] += 1;
  }
  reconcileBuild(sys.build, 0, gone0, R);

  // ---- the allies (seats 1-3): systems.party.seats[i]
  const seats = sys.party && Array.isArray(sys.party.seats) ? sys.party.seats : [];
  // PARTY LINEUP (docs/LINEUP.md): each saved seat names its class; a save
  // from before the lineup is the default four.
  const seatCls = [0, 1, 2, 3].map((i) => (i > 0 && seats[i] && LINEUP_CLASSES.includes(seats[i].classId) ? seats[i].classId : CLASS_OF_SEAT[i]));
  for (let i = 1; i < 4; i++) {
    const s = seats[i];
    if (!s || typeof s !== 'object') continue;
    const classId = seatCls[i];
    let gone = new Set();
    if (Array.isArray(s.slots)) {
      const r = reconcileLoadout(s.slots, classId, i, R);
      if (r.slots !== s.slots) s.slots = r.slots;
      gone = r.gone;
      for (let k = 0; k < SKILL_SLOTS; k++) if (!s.slots[k]) freeBySeat[i] += 1;
    }
    reconcileBuild(s.build, i, gone, R);
    const dropSkill = (k) => !isKnownSkill(k) || gone.has(k);
    if (filterKeys(s.auraNext, dropSkill)) R.changed = true;
    if (s.state && typeof s.state === 'object') {
      if (filterKeys(s.state.combo, dropSkill)) R.changed = true;
      if (filterKeys(s.state.retaliate, dropSkill)) R.changed = true;
      if (Array.isArray(s.state.recentCasts) && s.state.recentCasts.some((c) => c && typeof c === 'object' && typeof c.skill === 'string' && dropSkill(c.skill))) {
        s.state.recentCasts = s.state.recentCasts.filter((c) => !(c && typeof c === 'object' && typeof c.skill === 'string' && dropSkill(c.skill)));
        R.changed = true;
      }
    }
  }

  // ---- the registry: the player's id mirror, effects in flight
  const reg = tree.registry;
  if (reg && Array.isArray(reg.entities)) {
    const live = sys.skills && Array.isArray(sys.skills.slots) ? sys.skills.slots : null;
    let dropped = false;
    const keep = [];
    for (const e of reg.entities) {
      if (e && e.kind === 'player' && Array.isArray(e.skills) && live) {
        // player.skills mirrors the slot ids (skills.js): follow every slot
        // this reconcile changed, and never keep an id the build lacks.
        for (let k = 0; k < e.skills.length; k++) {
          const id = e.skills[k];
          const stale = changed0.includes(k) || (typeof id === 'string' && (!isKnownSkill(id) || gone0.has(id)));
          if (!stale) continue;
          const want = live[k] ? live[k].id : null;
          if (id !== want) {
            e.skills[k] = want;
            R.changed = true;
          }
        }
      }
      if (e && typeof e.skill === 'string' && !isKnownEffectSkill(e.skill)) {
        dropped = true;
        R.effects += 1;
        continue;
      }
      if (e && e.kind === 'ally' && Number.isInteger(e.partyIndex) && e.partyIndex >= 1 && e.partyIndex <= 3 && typeof e.classId === 'string' && !has.call(CLASS_NAME, e.classId)) {
        e.classId = seatCls[e.partyIndex];
        R.changed = true;
        R.records += 1;
      }
      keep.push(e);
    }
    if (dropped) {
      reg.entities = keep;
      R.changed = true;
    }
  }

  // ---- the run: offers, shelves, records
  const run = sys.run;
  if (run && typeof run === 'object') {
    reconcileReward(run.reward, freeBySeat[0], R);
    if (run.shop && Array.isArray(run.shop.stock) && run.shop.stock.some((c) => !(c && isKnownNode(c.node)))) {
      const n0 = run.shop.stock.length;
      run.shop.stock = run.shop.stock.filter((c) => c && isKnownNode(c.node));
      R.shopItems += n0 - run.shop.stock.length;
      R.changed = true;
    }
    if (run.spoils && typeof run.spoils === 'object') {
      const n = dropUnknown(run.spoils.nodes, isKnownNode);
      if (n !== run.spoils.nodes) {
        run.spoils.nodes = n;
        R.records += 1;
        R.changed = true;
      }
      if (Array.isArray(run.spoils.upgrades) && run.spoils.upgrades.some((u) => u && typeof u === 'object' && ((u.node !== undefined && !isKnownNode(u.node)) || (u.replaces !== undefined && u.replaces !== null && !isKnownNode(u.replaces)) || (u.skill !== undefined && u.skill !== null && !isKnownSkill(u.skill))))) {
        run.spoils.upgrades = run.spoils.upgrades.filter((u) => !(u && typeof u === 'object' && ((u.node !== undefined && !isKnownNode(u.node)) || (u.replaces !== undefined && u.replaces !== null && !isKnownNode(u.replaces)) || (u.skill !== undefined && u.skill !== null && !isKnownSkill(u.skill)))));
        R.records += 1;
        R.changed = true;
      }
    }
    const pp = run.partyPages;
    if (pp && typeof pp === 'object') {
      if (pp.page && Array.isArray(pp.page.cards)) {
        for (const c of pp.page.cards) {
          if (!c || typeof c !== 'object') continue;
          const seat = Number.isInteger(c.seat) && c.seat >= 0 && c.seat < 4 ? c.seat : 0;
          reconcileCard(c, seatCls[seat], freeBySeat[seat], R);
        }
      }
      const sh = pp.shop;
      if (sh && Array.isArray(sh.shelves)) {
        for (let i = 0; i < sh.shelves.length; i++) {
          const shelf = sh.shelves[i];
          if (!Array.isArray(shelf) || !shelf.some((c) => !(c && isKnownNode(c.node)))) continue;
          const keepIdx = shelf.map((c, k) => (c && isKnownNode(c.node) ? k : -1)).filter((k) => k >= 0);
          R.shopItems += shelf.length - keepIdx.length;
          sh.shelves[i] = keepIdx.map((k) => shelf[k]);
          // `marked` is index-aligned with the shelf (partypage.openShop).
          if (Array.isArray(sh.marked) && Array.isArray(sh.marked[i])) sh.marked[i] = keepIdx.map((k) => !!sh.marked[i][k]);
          R.changed = true;
        }
      }
    }
    // Records the level card / end card / level starter grant print.
    const c = run.campaign;
    if (c && typeof c === 'object') {
      const card = c.card;
      if (card && Array.isArray(card.summary)) {
        for (const row of card.summary) {
          if (!row || typeof row !== 'object') continue;
          const s2 = nullUnknownSkills(row.skills);
          if (s2 !== row.skills) {
            row.skills = s2;
            R.records += 1;
            R.changed = true;
          }
        }
      }
      const g = c.grant;
      if (g && typeof g === 'object') {
        const sk = dropUnknown(g.skills, isKnownSkill);
        const nd = dropUnknown(g.nodes, isKnownNode);
        if (sk !== g.skills || nd !== g.nodes) {
          g.skills = sk;
          g.nodes = nd;
          R.records += 1;
          R.changed = true;
        }
        if (Array.isArray(g.allies)) {
          for (const a of g.allies) {
            if (!a || typeof a !== 'object') continue;
            const an = dropUnknown(a.nodes, isKnownNode);
            const as = dropUnknown(a.swaps, isKnownSkill);
            if (an !== a.nodes || as !== a.swaps) {
              a.nodes = an;
              a.swaps = as;
              R.records += 1;
              R.changed = true;
            }
          }
        }
      }
    }
    const sum = run.summary;
    if (sum && typeof sum === 'object') {
      const sk = dropUnknown(sum.skills, isKnownSkill);
      if (sk !== sum.skills) {
        sum.skills = sk;
        R.records += 1;
        R.changed = true;
      }
      if (Array.isArray(sum.builds)) {
        for (const b of sum.builds) {
          if (!b || typeof b !== 'object') continue;
          const s2 = nullUnknownSkills(b.skills);
          if (s2 !== b.skills) {
            b.skills = s2;
            R.records += 1;
            R.changed = true;
          }
        }
      }
      if (sum.nodes && typeof sum.nodes === 'object') {
        const bn = dropUnknown(sum.nodes.bench, isKnownNode);
        const so = dropUnknown(sum.nodes.socketed, (x) => {
          if (typeof x !== 'string') return false;
          const at = x.indexOf(':');
          return at > 0 && isKnownSkill(x.slice(0, at)) && isKnownNode(x.slice(at + 1));
        });
        if (bn !== sum.nodes.bench || so !== sum.nodes.socketed) {
          sum.nodes.bench = bn;
          sum.nodes.socketed = so;
          R.records += 1;
          R.changed = true;
        }
      }
    }
  }
  return R;
}

// describeRepair(report) -> null | { line, short, counts } — the toast after a
// load (and the note after an import) when reconcileContent changed anything.
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const quoteIds = (ids) => {
  const u = [...new Set(ids.filter((x) => typeof x === 'string' && x))];
  if (!u.length) return '';
  const shown = u.slice(0, 2).map((x) => `“${x.slice(0, 24)}”`).join(', ');
  return ` (${shown}${u.length > 2 ? ', …' : ''})`;
};
export function describeRepair(R) {
  if (!R || !R.changed) return null;
  const skills = R.skills.filter((s) => s.why !== 'duplicate');
  const dupes = R.skills.length - skills.length;
  const parts = [];
  if (skills.length) parts.push(`${plural(skills.length, 'skill')}${quoteIds(skills.map((s) => s.id))}`);
  if (R.nodes.length) parts.push(`${plural(R.nodes.length, 'node')}${quoteIds(R.nodes.map((n) => n.id))}`);
  if (R.offers) parts.push(plural(R.offers, 'reward offer'));
  if (R.shopItems) parts.push(plural(R.shopItems, 'shop item'));
  if (R.effects) parts.push(plural(R.effects, 'effect in flight', 'effects in flight'));
  const tail = [];
  if (R.benched.length) tail.push(`${plural(R.benched.length, 'socketed node')} moved to the bench`);
  if (dupes) tail.push(`${plural(dupes, 'repeated skill')} dropped`);
  let line;
  if (parts.length) line = `This save had ${parts.join(', ')} that this version of Echoes doesn't have — removed${tail.length ? `; ${tail.join('; ')}` : ''}.`;
  else if (tail.length) line = `This save was repaired — ${tail.join('; ')}.`;
  else line = 'This save named content this version of Echoes doesn’t have — its records were tidied.';
  const short = parts.length ? `${parts.join(', ')} from another version will be removed when it loads` : 'it will be repaired when it loads';
  return {
    line,
    short,
    counts: { skills: skills.length, duplicates: dupes, nodes: R.nodes.length, benched: R.benched.length, offers: R.offers, shopItems: R.shopItems, effects: R.effects, records: R.records },
  };
}
