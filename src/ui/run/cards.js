// Card bodies shared by the draft screen and the shop shelf (BUILD_BRIEF §16
// card copy + §15.1/§15.3 node effects + §15.5 verdict line).
import { SKILLS } from '../../sim/skills.js';
import { NODES } from '../../sim/nodes.js';
import { PALETTE } from '../../data/palette.js';
import { esc } from './style.js';
import { iconHtml, hasIcon } from '../hud/icons.js';

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
};

const SHAPE_LABEL = {
  projectile: 'projectile',
  direct: 'direct',
  nova: 'nova',
  ground_aoe: 'ground zone',
  aura: 'passive aura',
  melee_arc: 'arc',
};

const ARCH_GLYPH = { heal: '✚', damage: '✦', passive: '◍' };

// §23.3: what each Gauntlet skill does beyond its stat row (the status it
// carries, the pierce, the field) — the card states it in words, with the
// authored numbers.
const SKILL_BODY = {
  lantern_flurry: 'Three lantern bolts in a 12° fan, 9 each.',
  pale_lance: 'A lance that pierces: it strikes up to 3 enemies in a line, full power each.',
  bell_toll: 'A tolling burst around you: 20 to up to 5 enemies, and a 0.5 s stun (not the Stag).',
  rootsnare: 'Roots at the cursor for 5 s: 6 per second to enemies inside, and they are slowed 45%.',
  dewfall: 'A falling dew at the cursor for 5 s: 7 per second to allies inside.',
  kindred_shield: 'Heals the neediest ally 16 and shields them for 20 (4 s).',
  mending_tide: 'A wide healing sweep: 70° either side, 1.8 u, up to 4 allies.',
  hearthsong: 'A warm burst: heals up to 4 allies 10 and hastes them 25% for 2 s.',
  quiet_hearth: 'A passive field: 2 per second to allies inside, who take 15% less damage.',
};

// A skill candidate card body (no frame — the caller owns .rn-card).
export function skillCardHtml(id) {
  const def = SKILLS[id];
  if (!def) return '';
  const stats = [];
  stats.push(`<span><i>PWR</i> ${def.power}</span>`);
  if (def.cd !== undefined) stats.push(`<span><i>CD</i> ${def.cd}s</span>`);
  if (def.range !== undefined) stats.push(`<span><i>RNG</i> ${def.range}</span>`);
  if (def.area !== undefined && def.area > 0)
    stats.push(`<span><i>${def.shape === 'melee_arc' ? 'ARC' : 'AREA'}</i> ${def.area}${def.shape === 'melee_arc' ? '°' : ''}</span>`);
  if (def.count !== undefined) stats.push(`<span><i>CNT</i> ${def.count}</span>`);
  const body = SKILL_BODY[id] ?? (
    def.shape === 'aura'
      ? 'A passive field: it holds a slot and never needs a press.'
      : def.archetype === 'heal'
        ? 'A healing shape for the party.'
        : 'A damaging shape of your own.');
  return `
    <div class="rn-cardkind">SKILL · ${esc(def.archetype)}</div>
    <div class="rn-cardicon">${cardIconHtml(id, 40)}</div>
    <div class="rn-cardname">${esc(def.name)}</div>
    <div class="rn-cardsub">${ARCH_GLYPH[def.archetype] ?? ''} ${esc(
      SHAPE_LABEL[def.shape] ?? def.shape
    )}</div>
    <div class="rn-stats">${stats.join('')}</div>
    <div class="rn-body">${esc(body)}</div>`;
}

// A node candidate card body. `verdict` is the §15.5 kit line, `extra` any
// binding card copy (Siphon's line).
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
  const skillName = sk ? sk.name : upgrade.skill;
  const occName = occ ? occ.name : upgrade.replaces;
  const dead = upgrade.why === 'grey' ? 'a grey ' : upgrade.why === 'inert' ? 'a +0 ' : '';
  return `⇧ upgrades ${skillName} · replaces ${dead}${occName}`;
}

export function nodeCardHtml(
  id,
  { verdict = null, extra = null, owned = 0, compact = false, bench = false, row = false, upgrade = null } = {}
) {
  const n = NODES[id];
  if (!n) return '';
  const effect = (compact ? NODE_EFFECT_SHORT[id] : NODE_EFFECT[id]) ?? NODE_EFFECT[id] ?? '';
  const head = row
    ? `<div class="rn-cardicon">${cardIconHtml(id, 30)}</div>
    <div class="rn-cardhead"><span class="rn-cardname">${esc(n.name)}</span></div>
    <div class="rn-cardsub"><span class="rn-cardkind">${esc(n.rarity)}</span> ${esc(n.kind)}<span class="rn-sublimit">limit ${n.limit}/skill</span></div>`
    : `<div class="rn-cardkind">NODE · ${esc(n.rarity)}</div>
    <div class="rn-cardicon">${cardIconHtml(id, 40)}</div>
    <div class="rn-cardname">${esc(n.name)}</div>
    <div class="rn-cardsub">${esc(n.kind)} · limit ${n.limit}/skill</div>`;
  return `
    ${head}
    <div class="rn-body">${esc(effect)}</div>
    ${extra ? `<div class="rn-body">“${esc(extra)}”</div>` : ''}
    ${
      upgrade
        ? `<div class="rn-verdict rn-upgrade">${esc(upgradeLine(upgrade))}</div>`
        : verdict
          ? `<div class="rn-verdict${verdict.startsWith('fits') ? '' : ' rn-cold'}">${esc(verdict)}</div>`
          : ''
    }
    ${
      owned > 0
        ? `<div class="rn-owned">you own ${owned}${bench ? ' · on the bench' : ''}</div>`
        : ''
    }`;
}

export function rarityOf(type, id) {
  if (type === 'node') return NODES[id] ? NODES[id].rarity : 'common';
  return 'common';
}
