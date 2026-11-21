// REVIEW-ONLY (never committed): Mosslight's talent grid, version 2
// (/mnt/project-files/mosslight-talents/MOSSLIGHT_TALENT_PATHS.md T19 to T33).
// ?tripo=1&talents=quick_sprout,deep_roots,... turns on any mix, one per tier
// is the rule but the review build does not police it.
const Q = typeof location !== 'undefined' ? location.search : '';
const ON = /[?&]tripo=1\b/.test(Q);
const LIST = ON ? ((Q.match(/[?&]talents=([\w,]+)/) || [])[1] || '').split(',').filter(Boolean) : [];
export const TALENTS = new Set(LIST);
export const has = (id) => TALENTS.has(id);
// Kesh 11-16: her class relic Mercy Bell becomes the nature wisp (no shields for her).
// ?relics=mercy_bell turns it on in the training arena.
export const RELICS_ON = new Set(ON ? ((Q.match(/[?&]relics=([\w,]+)/) || [])[1] || '').split(',').filter(Boolean) : []);
export const hasRelic = (id) => RELICS_ON.has(id);
export const SAP_TALENTS = ['reap', 'rich_sap', 'rooted_staff', 'deep_gem', 'bounty'];
export const sapOn = () => SAP_TALENTS.some(has);

// T9: talent cooldown changes add together, then multiply after the skill's nodes.
export function talentCdMul(def) {
  if (!def || def.archetype !== 'heal') return 1;
  let p = 0;
  if (has('quick_sprout')) p -= 0.2; // T19
  if (has('spring_rain')) p -= 0.1; // T22
  if (has('regrowth')) p += 0.25; // T20
  return 1 + p;
}

// T28 Long Reach (heal skills' range and reach +20%), T29 Wide Canopy (area heals +20%:
// ring radius, sweep angle, zone radius, aura radius).
const AREA_SHAPES = new Set(['nova', 'melee_arc', 'ground_aoe', 'aura']);
const cache = new WeakMap();
export function talentDef(def) {
  if (!def || !(has('long_reach') || has('wide_canopy'))) return def;
  const heal = def.archetype === 'heal';
  const healAura = def.shape === 'aura' && def.archetype === 'passive';
  if (!heal && !healAura) return def;
  let out = cache.get(def);
  if (out) return out;
  out = { ...def };
  if (heal && has('long_reach') && def.range > 0) out.range = def.range * 1.2;
  if (has('wide_canopy') && AREA_SHAPES.has(def.shape) && def.area > 0) out.area = def.shape === 'melee_arc' ? Math.min(90, def.area * 1.2) : def.area * 1.2;
  cache.set(def, out);
  return out;
}

// Kesh 11-16: Glade Wisps' nodes in the review build, ?gnodes=reach,quicken,multiply,bounce,linger,breeze
// (a name twice = two copies). The real game would socket them like any node.
const GN = ON ? ((Q.match(/[?&]gnodes=([\w,]+)/) || [])[1] || '').split(',').filter(Boolean) : [];
export const gladeNodes = (id) => GN.filter((n) => n === id).length;
