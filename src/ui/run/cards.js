// Card bodies shared by the draft screen and the shop shelf (BUILD_BRIEF §16
// card copy + §15.1/§15.3 node effects + §15.5 verdict line).
import { SKILLS } from '../../sim/skills.js';
import { NODES } from '../../sim/nodes.js';
import { PALETTE } from '../../data/palette.js';
import { esc } from './style.js';

export const RARITY_COLOR = {
  common: PALETTE.bone, // §19.1 Bone = common
  rare: PALETTE.signalBlue, // Signal Blue = rare
  legendary: PALETTE.hearthAmber, // Hearth Amber = legendary
};

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
};

// §15.1 "Effect" column + the §15.3 matrix summarised per node.
export const NODE_EFFECT = {
  sharpen: '+25% power on the skill it sits in.',
  quicken: '−15% cooldown on the skill it sits in.',
  multiply: '+1 count — one more bolt, target or recipient.',
  ascend: '×2 power. Legendary: fits slot B only.',
  bounce:
    'the impact hops once more per copy, within 2.2 u — a ricochet on damage, a chain-heal on a heal.',
  siphon:
    'damage skills self-heal · heal skills scorch the nearest enemy within 2.0 u.',
  echo: 'the whole cast repeats 1.0 s later — 50% power on damage, 100% on a heal.',
  detonate:
    'kills by this skill explode · full heals burst-heal — 50% power in 1.2 u.',
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
  const body =
    def.shape === 'aura'
      ? 'A passive field: it holds a slot and never needs a press.'
      : def.archetype === 'heal'
        ? 'A healing shape for the party.'
        : 'A damaging shape of your own.';
  return `
    <div class="rn-cardkind">SKILL · ${esc(def.archetype)}</div>
    <div class="rn-cardicon">${esc(def.abbrev)}</div>
    <div class="rn-cardname">${esc(def.name)}</div>
    <div class="rn-cardsub">${ARCH_GLYPH[def.archetype] ?? ''} ${esc(
      SHAPE_LABEL[def.shape] ?? def.shape
    )}</div>
    <div class="rn-stats">${stats.join('')}</div>
    <div class="rn-body">${esc(body)}</div>`;
}

// A node candidate card body. `verdict` is the §15.5 kit line, `extra` any
// binding card copy (Siphon's line).
export function nodeCardHtml(id, { verdict = null, extra = null, owned = 0 } = {}) {
  const n = NODES[id];
  if (!n) return '';
  return `
    <div class="rn-cardkind">NODE · ${esc(n.rarity)}</div>
    <div class="rn-cardicon">${NODE_GLYPH[id] ?? '?'}</div>
    <div class="rn-cardname">${esc(n.name)}</div>
    <div class="rn-cardsub">${esc(n.kind)} · limit ${n.limit}/skill</div>
    <div class="rn-body">${esc(NODE_EFFECT[id] ?? '')}</div>
    ${extra ? `<div class="rn-body">“${esc(extra)}”</div>` : ''}
    ${
      verdict
        ? `<div class="rn-verdict${verdict.startsWith('fits') ? '' : ' rn-cold'}">${esc(verdict)}</div>`
        : ''
    }
    ${owned > 0 ? `<div class="rn-owned">you own ${owned}</div>` : ''}`;
}

export function rarityOf(type, id) {
  if (type === 'node') return NODES[id] ? NODES[id].rarity : 'common';
  return 'common';
}
