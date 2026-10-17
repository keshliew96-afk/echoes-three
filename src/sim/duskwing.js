// THE DUSKWING (docs/DUSKWING.md) — Night Hunger, the bat's life steal.
// Owner: PARTY.
//
// Every blow the Duskwing lands on an enemy (his Nip, his skills, his Night
// Wings) feeds him CLASS_TECH.duskDrain of the damage it dealt; a skill row
// with `drain` (Bloodbite) adds its own share on top. The feed banks on the
// body (`e.drainBank`, plain data, so saves and snapshots carry it) and pays
// out as one `heal` event once it reaches CLASS_TECH.drainSip HP, so a flurry
// of small bites reads as a few green numerals instead of a smear. A full
// body banks nothing.
//
// Only a body whose classId is 'duskwing' is ever read, so a run without him
// (the nine goldens, every old save) emits nothing and draws no RNG: the heal
// is applied here, never through the combat pipeline's crit roll.
//
// Two of his class nodes ride it (content plan 5, slice 5), read from the
// skill's socketed techniques through `techsOf(seat, skillId)`: Thirst feeds
// him CLASS_TECH.thirstDrain more per copy, and Vampire doubles the feed and,
// at full health, banks it as a shield instead (up to vampireShieldCap).
import { CLASS_TECH } from '../data/classes.js';
import { SKILLS } from './skills.js';
import { addShield } from './status.js';

const r2 = (v) => Math.round(v * 100) / 100;

// The extra share a hit's source carries ('blood_bite', 'blood_bite:echo').
export function drainOf(source) {
  if (typeof source !== 'string') return 0;
  const id = source.split(':')[0];
  const def = SKILLS[id];
  return def && def.cls === 'duskwing' && def.drain > 0 ? def.drain : 0;
}

// The techniques socketed on the skill a hit came from ('flit:echo' -> flit).
function techsFor(techsOf, seat, source) {
  if (typeof techsOf !== 'function' || typeof source !== 'string') return [];
  const id = source.split(':')[0];
  if (!SKILLS[id] || SKILLS[id].cls !== 'duskwing') return [];
  const t = techsOf(seat, id);
  return Array.isArray(t) ? t : [];
}

export function installNightHunger({ registry, events, getTick, techsOf = null }) {
  events.on('hit', (ev) => {
    if (!(ev.amount > 0) || ev.attacker === null || ev.attacker === undefined) return;
    const a = registry.byId(ev.attacker);
    if (!a || a.classId !== 'duskwing' || a.partyIndex === undefined || !(a.hp > 0)) return;
    const t = registry.byId(ev.target);
    if (!t || t.faction !== 'hostile') return;
    const techs = techsFor(techsOf, a.partyIndex, ev.source);
    const vampire = techs.includes('vampire');
    const thirst = techs.filter((x) => x === 'thirst').length * CLASS_TECH.thirstDrain;
    const share = (CLASS_TECH.duskDrain + drainOf(ev.source) + thirst) * (vampire ? CLASS_TECH.vampireMul : 1);
    if (!(a.hp < a.maxHp)) {
      a.drainBank = 0;
      // Vampire: a full body banks the feed as a shield.
      if (vampire) {
        const tick = getTick();
        const sh = a.status && a.status.shield;
        const before = sh && sh.untilTick > tick ? sh.mag : 0;
        const rec = addShield(a, r2(ev.amount * share), CLASS_TECH.vampireShieldCap, 240, tick, a.id, 'vampire');
        if (rec && rec.mag > before + 1e-6) events.emit(tick, 'dusk_vampire', { id: a.id, seat: a.partyIndex, shield: r2(rec.mag), x: r2(a.x), z: r2(a.z) });
      }
      return;
    }
    const bank = (a.drainBank || 0) + ev.amount * share;
    if (bank < CLASS_TECH.drainSip) {
      a.drainBank = r2(bank);
      return;
    }
    a.drainBank = 0;
    const applied = Math.min(bank, a.maxHp - a.hp);
    a.hp += applied;
    events.emit(getTick(), 'heal', {
      target: a.id,
      healer: a.id,
      source: 'night_hunger',
      amount: r2(bank),
      applied: r2(applied),
      crit: false,
      x: r2(a.x),
      z: r2(a.z),
    });
  });
}
