// Player-facing description of WHERE a save was taken (docs/gauntlet/PLAN.md
// §3.4 slot metadata, §12.6 cards, gate G2.3 "metadata correct"). Owner: M2.
// Pure (no DOM): the saves screen (row + detail "Where"), the overwrite /
// delete / restore confirms and the title's Continue caption all read the
// level-card wording from here, so the two card kinds can never disagree.
//
// Phase 'transit' is one of two cards (src/sim/run.js beginTransit):
//   kind 'clear'  — Level N was cleared; the road to Level N+1 (run.act = N).
//   kind 'depart' — the SETTING OUT card of a campaign that starts at Level N
//                   (the Level Select, or Begin Run while Level 1 loads);
//                   Level N has not been played yet (run.act = N).
// Saves from v0.5.102 on carry meta.campaign.card = { kind, from, to }. Older
// files (schema 3 before the fix) do not: a clear card is always taken in the
// Stag room (meta.room 8), a setting-out card before any room (meta.room 0).
import { levelFor } from '../data/levels.js';
import { nextLevel } from '../data/campaign.js';
import { t } from '../i18n/index.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export const roman = (n) => (Number.isFinite(Number(n)) && ROMAN[Number(n)] ? ROMAN[Number(n)] : String(n ?? ''));

function levelName(n) {
  try {
    const nm = levelFor(Number(n)).name;
    return nm ? t(nm) : null;
  } catch {
    return null;
  }
}

// transitCard(meta) -> null | { kind: 'clear'|'depart', from, to }
export function transitCard(meta) {
  const m = meta && typeof meta === 'object' ? meta : {};
  if (m.mode !== 'run' || m.phase !== 'transit') return null;
  const lv = Number(m.level ?? m.act) || 1;
  const c = m.campaign && typeof m.campaign === 'object' ? m.campaign : null;
  const card = c && c.card && typeof c.card === 'object' ? c.card : null;
  if (card && (card.kind === 'clear' || card.kind === 'depart')) {
    const to = Number.isFinite(Number(card.to)) && card.to !== null ? Number(card.to) : null;
    const from = Number.isFinite(Number(card.from)) && card.from !== null ? Number(card.from) : null;
    return card.kind === 'depart' ? { kind: 'depart', from: null, to: to ?? lv } : { kind: 'clear', from: from ?? lv, to: to ?? nextLevel(from ?? lv) };
  }
  // Legacy file (no card in the meta): the room tells the two cards apart.
  const room = Number(m.room) || 0;
  return room > 0 ? { kind: 'clear', from: lv, to: nextLevel(lv) } : { kind: 'depart', from: null, to: lv };
}

// Long form (slot row line 1, detail "Where", confirm bodies).
//   clear:  "Level I cleared — next: Level II · The Sunken Mill"
//   depart: "Setting out — Level II · The Sunken Mill" (the level has not begun)
export function transitWhere(meta) {
  const c = transitCard(meta);
  if (!c) return null;
  if (c.kind === 'depart') {
    const nm = levelName(c.to);
    return nm ? t('Setting out — Level {level} · {name}', { level: roman(c.to), name: nm }) : t('Setting out — Level {level}', { level: roman(c.to) });
  }
  if (c.to === null) return t('Level {level} cleared', { level: roman(c.from) });
  const nm = levelName(c.to);
  return nm
    ? t('Level {level} cleared — next: Level {next} · {name}', { level: roman(c.from), next: roman(c.to), name: nm })
    : t('Level {level} cleared — next: Level {next}', { level: roman(c.from), next: roman(c.to) });
}

// Short form (the title's Continue caption, clamped to two lines).
//   clear:  "Level I cleared"      depart: "Setting out · Level II · The Sunken Mill"
export function transitShort(meta) {
  const c = transitCard(meta);
  if (!c) return null;
  if (c.kind === 'depart') {
    const nm = levelName(c.to);
    return nm ? t('Setting out · Level {level} · {name}', { level: roman(c.to), name: nm }) : t('Setting out · Level {level}', { level: roman(c.to) });
  }
  return t('Level {level} cleared', { level: roman(c.from) });
}

// A slot's name as shown: the default names the game gives a slot (stored in
// the file in English, src/save/slots.js defaultSlotName / 'Imported save')
// are shown in the player's language; a name the player typed is shown as is.
export function slotDisplayName(name) {
  const s = String(name ?? '');
  if (s === 'Autosave') return t('Autosave');
  if (s === 'Quicksave') return t('Quicksave');
  if (s === 'Imported save') return t('Imported save');
  const m = /^Slot (\d+)$/.exec(s);
  if (m) return t('Slot {n}', { n: Number(m[1]) });
  return s;
}
