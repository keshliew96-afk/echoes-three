// Card bodies shared by the draft screen and the shop shelf (BUILD_BRIEF §16
// card copy + §15.1/§15.3 node effects + §15.5 verdict line).
import { SKILLS } from '../../sim/skills.js';
import { NODES } from '../../sim/nodes.js';
import { PALETTE } from '../../data/palette.js';
import { esc } from './style.js';
import { iconHtml, hasIcon } from '../hud/icons.js';
import { t } from '../../i18n/index.js';

export const RARITY_COLOR = {
  common: PALETTE.bone, // §19.1 Bone = common
  rare: PALETTE.signalBlue, // Signal Blue = rare
  legendary: PALETTE.hearthAmber, // Hearth Amber = legendary
};

// DRAWN card icons (REFERENCE_BAR check 9 / round-1 shop defect: the unicode
// glyphs made Detonate and Ascend both "a star"). The command bar draws the
// same silhouettes for skills, so a card and its slot agree. The old glyph
// table stays exported for the socket screen's cell chips.
export function cardIconHtml(id, size = 30) {
  return hasIcon(id) ? iconHtml(id, { size }) : `<span class="rn-cardicon-txt">${esc(id ? id[0].toUpperCase() : '·')}</span>`;
}

// Same glyph set the socket screen uses, so a node reads the same everywhere.
export const NODE_GLYPH = {
  sharpen: '▲',
  quicken: '»',
  multiply: '✚',
  ascend: '★',
  bounce: '⇄',
  siphon: '⇓',
  echo: '◎',
  detonate: '✶',
  widen: '⇔',
  reach: '↠',
  linger: '≋',
  keen: '✧',
  snare: '※',
  galvanize: '↯',
  bulwark: '▣',
  split: '⋔',
  resonance: '⁂',
  // PARTY class nodes (BUILD_BRIEF §25.3 glyphs — single BMP symbols).
  provoke: '‼',
  brace: '▣',
  tremor: '∿',
  anchor: '⤓',
  retaliate: '↺',
  aegis: '⬡',
  flow: '⟳',
  momentum: '⇶',
  parry: '⟂',
  pursuit: '↗',
  lethality: '✕',
  execute: '⌖',
  skewer: '→',
  concussive: '⊙',
  steady_aim: '⊡',
  disengage: '↶',
  scatter: '∴', // PARTY decision: the §25.3 '⁂' collided with Resonance's glyph on the Archer's own pool
  heartseeker: '♡',
};

// §15.1 "Effect" column + the §15.3 matrix summarised per node.
export const NODE_EFFECT = {
  sharpen: '+25% power on the skill it sits in.',
  quicken: '−15% cooldown on the skill it sits in.',
  multiply: '+1 count — one more bolt, target or recipient.',
  ascend: '×2 power on the skill it sits in — on a passive, every pulse ×2.',
  bounce:
    'the impact hops once more per copy, within 2.2 u — a ricochet on damage, a chain-heal on a heal.',
  siphon:
    'damage skills self-heal · heal skills scorch the nearest enemy within 2.0 u.',
  echo: 'the whole cast repeats 1.0 s later — 50% power on damage, 100% on a heal.',
  detonate:
    'kills by this skill explode · full heals burst-heal — 50% power in 1.2 u.',
  // §23.4 Gauntlet nodes.
  widen: '+25% area — bigger bursts and zones; a wider arc (to 90°).',
  reach: '+25% range — farther bolts, placements and heal reach.',
  linger: '+50% duration — zones last longer, statuses hold longer.',
  keen: '+15% crit chance on every instance of this skill.',
  snare: 'damage slows the enemies hit 40% · heals haste allies 20% · a field slows enemies inside.',
  galvanize: 'damage exposes (+20% taken) · heals inspire (+15% dealt) · a field inspires allies inside.',
  bulwark: 'damage shields you (20% of it, up to 30) · overheal becomes a shield · a field adds shield.',
  split: 'on impact two shards fly on at ±35° (40%) · heals splash the 2 nearest allies (40%).',
  resonance: 'every 3rd cast of this skill resolves at ×2 power — on a passive, every 3rd pulse.',
  // PARTY class nodes (BUILD_BRIEF §25.3).
  provoke: 'hits taunt onto the Tank (90 ticks, Stag 45) · Shield Wall: near its shields · Iron Stance: 2 inside · enemies prefer the Tank.',
  brace: 'every cast shields the Tank +8 per copy (4 s) · on Iron Stance +2 per pulse (up to 12).',
  tremor: 'area strikes stun non-boss enemies for 18 ticks (a zone: its first tick on each).',
  anchor: 'area strikes PULL non-boss enemies 0.5 u toward the Tank (a zone: its centre) instead of knocking them back.',
  retaliate: 'for 2 s after the cast, anything that hits the Tank takes 25% of this skill’s base power back.',
  aegis: 'the Tank takes 20% less damage while this skill cools down · shields ward their bearers · Iron Stance wards allies inside.',
  flow: 'a connecting cast cuts every other Swordsman skill’s cooldown by 0.3 s per copy.',
  momentum: '+12% power per different Swordsman skill cast in the last 2 s (up to +36%).',
  parry: 'after the cast, a 24-tick parry: the next hit is blocked and answered at 50% power · on Riposte: its window +24.',
  pursuit: 'the fox dashes up to 1.2 u toward the target before an arc or burst · Fox Step dashes 1.0 u further.',
  lethality: 'crits from this skill deal ×2.2 instead of ×1.5.',
  execute: '×2 power on an enemy at or below 35% HP — the Stag included.',
  skewer: 'a bolt pierces one more enemy per copy, full power each.',
  concussive: 'non-boss hits are knocked back twice as far.',
  steady_aim: '+40% power when the Archer stood still for half a second before the cast.',
  disengage: 'after the cast the Archer hops 1.0 u away from the nearest enemy · Vault Shot vaults 0.8 u further.',
  scatter: 'a zone lands as 3 smaller zones (60%) · a bolt that flies out without a hit bursts into 3 shards (40%).',
  heartseeker: 'the first hit of each cast on each enemy is a guaranteed crit.',
};

// The same effects in one breath. Used by the compact reflow (short windows),
// where the height a four-line body costs is the difference between a page
// that fits at 1:1 and a page whose type gets scaled under the §17 floors.
// This is a SHORTER copy variant, never a hidden one: exactly one body string
// is ever in the DOM.
export const NODE_EFFECT_SHORT = {
  sharpen: '+25% power on this skill.',
  quicken: '−15% cooldown on this skill.',
  multiply: '+1 count — one more bolt or target.',
  ascend: '×2 power — a passive: every pulse.',
  bounce: 'one extra hop within 2.2 u — ricochet, or chain-heal.',
  siphon: 'damage self-heals · heals scorch the nearest enemy.',
  echo: 'the cast repeats 1.0 s later — 50% damage, 100% heal.',
  detonate: 'kills explode · full heals burst — 50% within 1.2 u.',
  widen: '+25% area on this skill.',
  reach: '+25% range on this skill.',
  linger: '+50% duration on this skill.',
  keen: '+15% crit chance on this skill.',
  snare: 'hits slow · heals haste · fields slow.',
  galvanize: 'hits expose · heals inspire allies.',
  bulwark: 'hits and overheals become shields.',
  split: 'impacts split into 2 shards at 40%.',
  resonance: 'every 3rd cast — or pulse — at ×2.',
  provoke: 'hits taunt enemies onto the Tank; enemies prefer the Tank.',
  brace: 'every cast shields the Tank +8.',
  tremor: 'area hits stun 18 ticks.',
  anchor: 'area hits pull enemies in.',
  retaliate: 'the Tank strikes back for 2 s.',
  aegis: 'Tank wards while this cools down.',
  flow: 'a connect cuts other cooldowns.',
  momentum: '+12% per recent other skill.',
  parry: 'a short parry after the cast.',
  pursuit: 'dash to the target first.',
  lethality: 'crits deal ×2.2.',
  execute: '×2 on enemies at ≤ 35% HP.',
  skewer: 'bolts pierce one more.',
  concussive: 'knockback ×2.',
  steady_aim: '+40% after standing still.',
  disengage: 'hop away after the cast.',
  scatter: '3 zones · a spent bolt bursts.',
  heartseeker: 'first hit per enemy crits.',
};

export const SHAPE_LABEL = {
  projectile: 'projectile',
  direct: 'direct',
  nova: 'nova',
  ground_aoe: 'ground zone',
  aura: 'passive aura',
  melee_arc: 'arc',
};

const ARCH_GLYPH = { heal: '✚', damage: '✦', passive: '◍', guard: '⬡' };

// §23.3: what each Gauntlet skill does beyond its stat row (the status it
// carries, the pierce, the field) — the card states it in words, with the
// authored numbers.
export const SKILL_BODY = {
  lantern_flurry: 'Three lantern bolts in a 12° fan, 9 each.',
  pale_lance: 'A lance that pierces: it strikes up to 3 enemies in a line, full power each.',
  bell_toll: 'A tolling burst around you: 20 to up to 5 enemies, and a 0.5 s stun (not the Stag).',
  rootsnare: 'Roots at the cursor for 5 s: 6 per second to enemies inside, and they are slowed 45%.',
  dewfall: 'A falling dew at the cursor for 5 s: 7 per second to allies inside.',
  kindred_shield: 'Heals the neediest ally 16 and shields them for 20 (4 s).',
  mending_tide: 'A wide healing sweep: 70° either side, 1.8 u, up to 4 allies.',
  hearthsong: 'A warm burst: heals up to 4 allies 10 and hastes them 25% for 2 s.',
  quiet_hearth: 'A passive field: 2 per second to allies inside, who take 15% less damage.',
  // PARTY class skills (BUILD_BRIEF §25.2).
  heavy_slam: 'A crushing overhead arc: 34 to up to 3 enemies in reach.',
  brutal_cleave: 'A wide cleave: 16 to up to 6 enemies in an 80° arc.',
  ground_crack: 'A fissure at the target for 4 s: 10 per second to enemies inside.',
  whirling_guard: 'A spinning burst: 20 to up to 5 enemies around the Tank.',
  taunting_roar: 'A roar: 6 to up to 6 nearby enemies, taunted 2.5 s (the Stag 1 s). Enemies prefer the Tank.',
  shield_wall: 'Shields the two neediest allies in 3 u (the Tank included) for 24, 4 s.',
  shoulder_charge: 'A 2.4 u charge at the target, then a 22 arc that stuns for 0.6 s (not the Stag).',
  iron_stance: 'A passive field: every second, everyone within 1.3 u gains 3 shield (up to 12).',
  flurry: 'Rapid cuts: 11 to up to 6 enemies in reach.',
  lunge_strike: 'A long thrust: 26 to up to 2 enemies 1.3 u ahead.',
  blade_storm: 'A storm of blades: 14 to up to 5 enemies around the fox.',
  caltrops: 'Spikes at the target for 5 s: 8 per second to enemies inside.',
  fox_step: 'A 2 u untouchable dash to the target, then a 18 cut.',
  crescent_finisher: 'A crescent sweep: 20, +50% for each other fox skill that just connected (up to +100%).',
  riposte: 'A 0.6 s guard: the next hit is blocked and answered with a 30 counter-arc.',
  razor_wake: 'A passive field: every second, the 3 nearest enemies within 0.9 u take 4 — no knockback.',
  piercing_shot: 'A heavy arrow: 30 to the first enemy in line.',
  volley: 'Three arrows in a fan: 14 each.',
  detonating_charge: 'A charge at the target for 3 s: 12 per second to enemies inside.',
  sundering_nova: 'A burst: 16 to up to 4 enemies around the hare.',
  vault_shot: 'The hare vaults 1.6 u away (untouchable), then shoots: 18 and a 30% slow.',
  pinning_arrow: 'A pinning arrow: 20 and a 0.75 s stun (not the Stag).',
  rain_of_arrows: 'Arrows rain on an area for 4 s: 7 per second, enemies inside slowed 25%.',
  kestrel_watch: 'A passive kestrel: every second, the nearest enemy within 4 u takes 6.',
};

// A skill candidate card body (no frame — the caller owns .rn-card).
export function skillCardHtml(id) {
  const def = SKILLS[id];
  if (!def) return '';
  const stats = [];
  stats.push(`<span><i>${esc(t('PWR'))}</i> ${def.power}</span>`);
  if (def.cd !== undefined) stats.push(`<span><i>${esc(t('CD'))}</i> ${esc(t('{sec}s', { sec: def.cd }))}</span>`);
  if (def.range !== undefined) stats.push(`<span><i>${esc(t('RNG'))}</i> ${def.range}</span>`);
  if (def.area !== undefined && def.area > 0)
    stats.push(`<span><i>${esc(def.shape === 'melee_arc' ? t('ARC') : t('AREA'))}</i> ${def.area}${def.shape === 'melee_arc' ? '°' : ''}</span>`);
  if (def.count !== undefined) stats.push(`<span><i>${esc(t('CNT'))}</i> ${def.count}</span>`);
  const body = SKILL_BODY[id] ? t(SKILL_BODY[id]) : (
    def.shape === 'aura'
      ? t('A passive field: it holds a slot and never needs a press.')
      : def.archetype === 'heal'
        ? t('A healing shape for the party.')
        : t('A damaging shape of your own.'));
  return `
    <div class="rn-cardkind">${esc(t('SKILL · {kind}', { kind: t(def.archetype) }))}</div>
    <div class="rn-cardicon">${cardIconHtml(id, 40)}</div>
    <div class="rn-cardname">${esc(t(def.name))}</div>
    <div class="rn-cardsub">${ARCH_GLYPH[def.archetype] ?? ''} ${esc(
      t(SHAPE_LABEL[def.shape] ?? def.shape)
    )}</div>
    <div class="rn-stats">${stats.join('')}</div>
    <div class="rn-body">${esc(body)}</div>`;
}

// A node candidate card body. `verdict` is the §15.5 kit line (already
// translated; `cold` = the sim's verdict is not a fit), `extra` any binding
// card copy (Siphon's line, English — translated here).
// `row` = the shop's shelf layout (icon medallion beside the name; the
// rarity tag leads the sub line). Same words as the column card, arranged so
// a narrow shelf card never wraps its header — the round-1 "Ascend" defect was
// "NODE · legendary" breaking onto two lines, and the M4c 4-card shelf (216 px
// cards in the compact reflow) has no room for a tag beside "Resonance".
// fix-M4a-r4 (CONTENT4-F1): a node that UPGRADES a full build names the
// socket it would take — "⇧ upgrades Spirit Bolt · replaces Quicken" (a grey
// or +0 occupant is named as such). `upgrade` = draft.upgradeInfo() data.
export function upgradeLine(upgrade) {
  if (!upgrade || !upgrade.skill) return '';
  const sk = SKILLS[upgrade.skill];
  const occ = NODES[upgrade.replaces];
  const skill = sk ? t(sk.name) : upgrade.skill;
  const node = occ ? t(occ.name) : upgrade.replaces;
  if (upgrade.why === 'grey') return t('⇧ upgrades {skill} · replaces a grey {node}', { skill, node });
  if (upgrade.why === 'inert') return t('⇧ upgrades {skill} · replaces a +0 {node}', { skill, node });
  return t('⇧ upgrades {skill} · replaces {node}', { skill, node });
}

// §15.5 kit verdict (sim/nodes.js kitVerdict: 'fits your kit' / 'nothing in
// your kit uses this yet') as shown; `cls` = an ally's class name (English),
// whose kit it then names.
export function kitVerdictText(v, cls = null) {
  if (!v) return v;
  if (!cls) return t(v);
  if (v === 'fits your kit') return t("fits the {cls}'s kit", { cls: t(cls) });
  if (v === 'nothing in your kit uses this yet') return t("nothing in the {cls}'s kit uses this yet", { cls: t(cls) });
  return t(v);
}

export function nodeCardHtml(
  id,
  { verdict = null, cold = null, extra = null, owned = 0, compact = false, bench = false, row = false, upgrade = null } = {}
) {
  const n = NODES[id];
  if (!n) return '';
  const effect = (compact ? NODE_EFFECT_SHORT[id] : NODE_EFFECT[id]) ?? NODE_EFFECT[id] ?? '';
  const limit = t('limit {n}/skill', { n: n.limit });
  const head = row
    ? `<div class="rn-cardicon">${cardIconHtml(id, 30)}</div>
    <div class="rn-cardhead"><span class="rn-cardname">${esc(t(n.name))}</span></div>
    <div class="rn-cardsub"><span class="rn-cardkind">${esc(t(n.rarity))}</span> ${esc(t(n.kind))}<span class="rn-sublimit">${esc(limit)}</span></div>`
    : `<div class="rn-cardkind">${esc(t('NODE · {rarity}', { rarity: t(n.rarity) }))}</div>
    <div class="rn-cardicon">${cardIconHtml(id, 40)}</div>
    <div class="rn-cardname">${esc(t(n.name))}</div>
    <div class="rn-cardsub">${esc(t(n.kind))} · ${esc(limit)}</div>`;
  // The cold tint follows the sim's verdict, never the displayed words.
  const isCold = cold ?? (verdict ? !verdict.startsWith('fits') : false);
  return `
    ${head}
    <div class="rn-body">${esc(effect ? t(effect) : '')}</div>
    ${extra ? `<div class="rn-body">“${esc(t(extra))}”</div>` : ''}
    ${
      upgrade
        ? `<div class="rn-verdict rn-upgrade">${esc(upgradeLine(upgrade))}</div>`
        : verdict
          ? `<div class="rn-verdict${isCold ? ' rn-cold' : ''}">${esc(verdict)}</div>`
          : ''
    }
    ${
      owned > 0
        ? `<div class="rn-owned">${esc(bench ? t('you own {n} · on the bench', { n: owned }) : t('you own {n}', { n: owned }))}</div>`
        : ''
    }`;
}

export function rarityOf(type, id) {
  if (type === 'node') return NODES[id] ? NODES[id].rarity : 'common';
  return 'common';
}
