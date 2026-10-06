// Socket screen (BUILD_BRIEF §15/§16 + the M4c user correction) — the
// between-rooms build workbench for 4 skills × 8 node sockets. Flat storybook
// card page in the §17 HUD grammar (charcoal plates, parchment ink, warm-grey
// chrome — never browser-default text), laid over the world; the Zone-1 HUD
// persists beneath (§16).
//
// M4c (user correction 2026-09-22, binding): the player equips at most 4
// skills and EVERY skill — the passive included — has 8 sockets that accept a
// node of ANY rarity. There are no slot-A/slot-B labels and no cap badges any
// more; the only hard blocks are the per-skill repetition limit, a full row
// and live combat.
//
// Binding display contract (§15.5), unchanged:
//   - GREY (technique cell GREY / stat key absent): per-cell HOLLOW glyph +
//     diagonal strike-through. Advisory only — socketing proceeds with a warn.
//   - SATURATION-INERT (Multiply, realizable delta 0): hollow glyph + "+0"
//     badge — a DISTINCT marker that never reuses the grey strike.
//   - Hard blocks (repetition limit / full row): rejection SHAKE + block glyph
//     on the cell; the sim logs `socket_denied` (§16).
//   - A node's rarity rides its border and glyph colour (common Bone / rare
//     Signal Blue / legendary Hearth Amber, §19.1) AND a text channel (the
//     detail line names it); legendary chrome gets the shimmer sweep (never a
//     pulse, §19.1 colorblind fence).
//   - No state by colour alone: grey = strike, inert = "+0", live preview = ◆,
//     limit block = ⊘, in hand = ▲ — every state has a glyph channel.
//
// LAYOUT. One page authored at DESIGN_W × DESIGN_H (1280×690) virtual px,
// uniformly scaled by min(innerWidth/1320, innerHeight/730) (clamped
// 0.5-1.75), so the whole build — the party strip, 4 rows × 8 cells, the
// bench, the detail line — is on screen at once from 1024×576 (×0.776: 64 px
// cells = 49.7 real px, 16 px text = 12.4 real px — G4c.5's 48 / 12 floors)
// to 2560×1440 (×1.75) with no scrolling.
//
// INTERACTION (fast by keyboard, mouse and gamepad — one focus cursor):
//   ←↑→↓ / WASD  move the cursor over the socket grid and the bench
//   Enter/Space   bench chip: pick it up (the cursor jumps to the socket the
//                 auto-fill policy would choose) · cell: place what you hold
//                 (swapping out an occupant) · a filled cell with nothing in
//                 hand: pick that node up to move it
//   X / Delete    remove the node in the focused cell to the bench
//   F             auto-fill (the sim's one policy — live placements only,
//                 spread over the kit; the autopilot uses the same call)
//   1-4           jump to that skill's row · Tab bench ⇄ sockets
//   Esc / B       close (a held node never left the bench — Esc banks it)
//   mouse         hover = cursor, click = Enter, right-click = remove
//   gamepad       D-pad/stick move, A = Enter, B = drop the held node / close,
//                 X = remove, Y = auto-fill, LB/RB = previous/next skill row,
//                 View (Back) opens/closes it between rooms
// __echoes.cmd('openSocket'|'closeSocket') drives the same paths for tests.
//
// PARTY (BUILD_BRIEF §25.6, PLAN §16.4): the party strip across the top — the
// VIEWED character's 4 rows × 8 sockets and its own bench (each row carries
// `data-seat` + the class accent). Q / E, PgUp / PgDn, F1-F4, a click on a
// tab, pad LB / RB switch character (the pad's row jump moves to LT / RT).
// REORDER: ← from socket 1 reaches the row's skill header; Enter picks the
// skill up; ↑ / ↓ (or 1-4) to another header; Enter swaps the two rows
// (sockets travel; slot order = keys 1-4 = the AI's cast order). Mouse: click
// a header, click another. F auto-fills the viewed character; Shift+F or the
// "Auto-fill all" button (pad: D-pad up to it from row 1's header, A) fills
// all four.
//
// Reads sim truth exclusively through world.buildSystem() (view / preview /
// verdictFor / planFill) and mutates only through socket / unsocket /
// autoFill — the same entry points as __echoes.cmd, so every screen action
// emits the same sim events.
import { PALETTE } from '../../data/palette.js';
import { viewerSeat } from '../../app/viewerseat.js';
import { SKILLS } from '../../sim/skills.js';
import { NODES } from '../../sim/nodes.js';
import { SKILL_SLOTS } from '../../core/constants.js';
import { iconHtml, hasIcon } from '../hud/icons.js';
import { NODE_EFFECT, NODE_GLYPH as CARD_GLYPH, skillAbbrev } from '../run/cards.js';
import { createPartyStrip } from '../run/partystrip.js';
import { CLASS_OF_SEAT, CLASS_NAME } from '../../data/classes.js';
import { CLASS_ACCENTS } from '../../data/palette.js';
import { service } from '../../app/registry.js';
import { t, tn } from '../../i18n/index.js';
// @gnt:M3 RUN-NAV-SOUND (fix-M3-r5 AUD5-F1): cursor / tab moves tick like a menu move.
import { createSelectionSound } from '../../audio/uiselect.js';

const RARITY_COLOR = {
  common: PALETTE.bone,
  rare: PALETTE.signalBlue,
  legendary: PALETTE.hearthAmber,
};
const RARITY_RANK = { common: 0, rare: 1, legendary: 2 };

const NODE_GLYPH = {
  sharpen: '▲',
  quicken: '»',
  multiply: '✚',
  ascend: '★',
  bounce: '⇄',
  siphon: '⇓',
  echo: '◎',
  detonate: '✶',
  // §23.4 Gauntlet nodes (same glyph set as ui/run/cards.js).
  widen: '⇔',
  reach: '↠',
  linger: '≋',
  keen: '✧',
  snare: '※',
  galvanize: '↯',
  bulwark: '▣',
  split: '⋔',
  resonance: '⁂',
  // PARTY class nodes: the same glyphs as the cards.
  ...Object.fromEntries(Object.entries(CARD_GLYPH).filter(([k]) => !['sharpen', 'quicken', 'multiply', 'ascend', 'bounce', 'siphon', 'echo', 'detonate', 'widen', 'reach', 'linger', 'keen', 'snare', 'galvanize', 'bulwark', 'split', 'resonance'].includes(k))),
};

// Getters: looked up (translated) when read, after the language has loaded.
const SHAPE_LABEL = {
  get projectile() {
    return t('projectile');
  },
  get direct() {
    return t('direct');
  },
  get nova() {
    return t('nova');
  },
  get ground_aoe() {
    return t('ground zone');
  },
  get aura() {
    return t('passive aura');
  },
  get melee_arc() {
    return t('arc');
  },
};

// Sim words the screen shows (node rarity / kind, skill archetype, bench
// provenance), translated when read; an unknown word shows as the sim has it.
const WORD = {
  get common() {
    return t('common');
  },
  get rare() {
    return t('rare');
  },
  get legendary() {
    return t('legendary');
  },
  get stat() {
    return t('stat');
  },
  get technique() {
    return t('technique');
  },
  get damage() {
    return t('damage');
  },
  get guard() {
    return t('guard');
  },
  get heal() {
    return t('heal');
  },
  get passive() {
    return t('passive');
  },
  get drafted() {
    return t('drafted');
  },
  get purchased() {
    return t('purchased');
  },
  get spoils() {
    return t('spoils');
  },
  get grant() {
    return t('grant');
  },
  get catchup() {
    return t('catchup');
  },
  get plan() {
    return t('plan');
  },
  get preview() {
    return t('preview');
  },
};
const word = (w) => (Object.prototype.hasOwnProperty.call(WORD, w) ? WORD[w] : String(w ?? ''));

const DENY_COPY = {
  get limit() {
    return t('repeat limit reached on this skill');
  },
  get full() {
    return t('all 8 sockets on this skill are full');
  },
  get combat_active() {
    return t('sockets open between rooms only');
  },
  get no_such_slot() {
    return t('no such socket');
  },
  get not_on_bench() {
    return t('that node is not on the bench');
  },
  get skill_not_owned() {
    return t('that skill is not in your kit');
  },
};

// The sim's live preview lines (src/sim/nodes.js preview() / verdict
// reasons) are English with the numbers baked in. Each known form is matched
// here and re-said through its own key; a line no pattern knows shows as the
// sim wrote it (docs/I18N.md).
const STAT_WORD = {
  get power() {
    return t('power');
  },
  get cooldown() {
    return t('cooldown');
  },
  get count() {
    return t('count');
  },
  get area() {
    return t('area');
  },
  get range() {
    return t('range');
  },
  get 'arc half-angle'() {
    return t('arc half-angle');
  },
};
const PREVIEW_FIXED = () => ({
  'legal to socket — contributes nothing': t('legal to socket — contributes nothing'),
  'contributes nothing on this skill right now': t('contributes nothing on this skill right now'),
  'legal to socket — contributes nothing while this holds': t('legal to socket — contributes nothing while this holds'),
  'already socketed here — this is its live contribution': t('already socketed here — this is its live contribution'),
  'reapply: one bonus full-strength pulse every 3.0 s': t('reapply: one bonus full-strength pulse every 3.0 s'),
  'enemies inside the field are slowed 25% (refreshed every pulse)': t('enemies inside the field are slowed 25% (refreshed every pulse)'),
  'healed allies gain haste 20% for 1.5 s': t('healed allies gain haste 20% for 1.5 s'),
  'enemies hit are slowed 40% for 1.5 s': t('enemies hit are slowed 40% for 1.5 s'),
  'allies inside are inspired: +10% damage dealt (refreshed every pulse)': t('allies inside are inspired: +10% damage dealt (refreshed every pulse)'),
  'healed allies are inspired: +15% damage dealt for 3 s': t('healed allies are inspired: +15% damage dealt for 3 s'),
  'enemies hit are exposed: +20% damage taken for 3 s': t('enemies hit are exposed: +20% damage taken for 3 s'),
  'each pulse adds 2 shield to the allies inside (up to 10)': t('each pulse adds 2 shield to the allies inside (up to 10)'),
  'you gain a shield worth 20% of the damage dealt (up to 30)': t('you gain a shield worth 20% of the damage dealt (up to 30)'),
  'no cooldown stat on this skill': t('no cooldown stat on this skill'),
  'no count stat on this skill': t('no count stat on this skill'),
  'no power stat on this skill': t('no power stat on this skill'),
  'no power stat': t('no power stat'),
  'no range stat on this skill': t('no range stat on this skill'),
  'single-target shape — no area to widen': t('single-target shape — no area to widen'),
  'nothing on this skill lasts — no duration to extend': t('nothing on this skill lasts — no duration to extend'),
  'a passive field — nothing here for this technique to act on': t('a passive field — nothing here for this technique to act on'),
  'needs a retargetable impact (projectile or direct)': t('needs a retargetable impact (projectile or direct)'),
  'shields never crit': t('shields never crit'),
  'a shield drains nothing': t('a shield drains nothing'),
  'a hostile field of another class': t('a hostile field of another class'),
  'no hostile delivery to stagger with': t('no hostile delivery to stagger with'),
  'no hostile area delivery to pull with': t('no hostile area delivery to pull with'),
  'the counter answers an attacker already in reach': t('the counter answers an attacker already in reach'),
  'the delivery is placed at range — nothing to close': t('the delivery is placed at range — nothing to close'),
  'only a bolt can pierce': t('only a bolt can pierce'),
  'a self burst has nothing to scatter': t('a self burst has nothing to scatter'),
  'already a full 90° half-angle (the §23.4 clamp)': t('already a full 90° half-angle (the §23.4 clamp)'),
  'the whole party is already reached': t('the whole party is already reached'),
  'fits your kit': t('fits your kit'),
  'nothing in your kit uses this yet': t('nothing in your kit uses this yet'),
});
const STATUS_WORD = () => ({ haste: t('haste'), shield: t('shield'), slow: t('slow'), stun: t('stun'), taunt: t('taunt'), ward: t('ward'), zone: t('zone') });
const UNIT = (u) => (u === ' s' ? t(' s') : u === ' u' ? t(' u') : u || '');
const PREVIEW_FORMS = [
  [/^\+1 target — currently \+0 \(all (\d+) allies already hit\)$/, (m) => t('+1 target — currently +0 (all {n} allies already hit)', { n: m[1] })],
  [/^crit chance (\d+)% → (\d+)%$/, (m) => t('crit chance {a}% → {b}%', { a: m[1], b: m[2] })],
  [/^zone (\d+) ticks → (\d+) ticks \(([\d.]+) s → ([\d.]+) s\)$/, (m) => t('zone {a} ticks → {b} ticks ({sa} s → {sb} s)', { a: m[1], b: m[2], sa: m[3], sb: m[4] })],
  [/^(power|cooldown|count|area|range|arc half-angle) ([\d.]+)( s| u|°)? → ([\d.]+)( s| u|°)?$/, (m) => t('{stat} {a} → {b}', { stat: STAT_WORD[m[1]], a: m[2] + UNIT(m[3]), b: m[4] + UNIT(m[5]) })],
  [/^([a-z]+) (\d+) → (\d+) ticks$/, (m) => t('{status} {a} → {b} ticks', { status: STATUS_WORD()[m[1]] ?? m[1], a: m[2], b: m[3] })],
  [/^heal chains to the next-lowest-HP other ally within ([\d.]+) u — full power, 1 hop per copy$/, (m) => t('heal chains to the next-lowest-HP other ally within {r} u — full power, 1 hop per copy', { r: m[1] })],
  [/^impact ricochets to the nearest other enemy within ([\d.]+) u — full power, 1 hop per copy$/, (m) => t('impact ricochets to the nearest other enemy within {r} u — full power, 1 hop per copy', { r: m[1] })],
  [/^damages the nearest enemy within ([\d.]+) u of the healed ally for ([\d.]+)$/, (m) => t('damages the nearest enemy within {r} u of the healed ally for {n}', { r: m[1], n: m[2] })],
  [/^self-heals ([\d.]+) per instance$/, (m) => t('self-heals {n} per instance', { n: m[1] })],
  [/^full recast 1\.0 s later at (\d+)% power$/, (m) => t('full recast 1.0 s later at {pct}% power', { pct: m[1] })],
  [/^full heals burst-heal allies within ([\d.]+) u for 50% power$/, (m) => t('full heals burst-heal allies within {r} u for 50% power', { r: m[1] })],
  [/^kills by this skill explode — 50% power burst, radius ([\d.]+) u$/, (m) => t('kills by this skill explode — 50% power burst, radius {r} u', { r: m[1] })],
  [/^overhealing becomes a shield — up to ([\d.]+) per heal, 4 s$/, (m) => t('overhealing becomes a shield — up to {n} per heal, 4 s', { n: m[1] })],
  [/^the 2 nearest other allies within ([\d.]+) u get ([\d.]+) too$/, (m) => t('the 2 nearest other allies within {r} u get {n} too', { r: m[1], n: m[2] })],
  [/^on impact: 2 shards at ±([\d.]+)°, ([\d.]+) power, ([\d.]+) u$/, (m) => t('on impact: 2 shards at ±{deg}°, {n} power, {r} u', { deg: m[1], n: m[2], r: m[3] })],
  [/^every 3rd pulse resolves at ×2 power \(([\d.]+) per ally\)$/, (m) => t('every 3rd pulse resolves at ×2 power ({n} per ally)', { n: m[1] })],
  [/^every 3rd cast resolves at ×2 power \(([\d.]+)\)$/, (m) => t('every 3rd cast resolves at ×2 power ({n})', { n: m[1] })],
];
function previewText(line) {
  const l = String(line ?? '');
  const fixed = PREVIEW_FIXED()[l.replace(/^\+0\s*—\s*/, '')];
  if (fixed !== undefined) return fixed;
  for (const [re, say] of PREVIEW_FORMS) {
    const m = re.exec(l);
    if (m) return say(m);
  }
  return t(l); // the siphon card line and anything keyed elsewhere
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const DESIGN_W = 1280;
// fix-M4a-r5 (F8, G4c.5): the page is compacted vertically (head 52, rows
// 98, detail 108, foot 32 — the party strip kept) so the fit at 1024×576 is
// width-limited again (×0.776: cells 49.7 real px, 16 px text 12.4 real px);
// the PARTY strip had grown it to 764 (×0.709: 45.4 / 11.4, under the floors).
const DESIGN_H = 690;
const FIT_MARGIN = 40; // design px kept free above + below the page
const COLS = 8;

export function createSocketScreen({ bus, world }) {
  // PARTY: the viewed character's build (seat 0 = the Healer's, unchanged).
  let viewSeat = 0;
  // The viewer's own seat (a network guest: its class seat) and whether a
  // session is up (the socket hold is reported to the host only then).
  const netSvc = () => {
    try {
      return service('net') || null;
    } catch {
      return null;
    }
  };
  const isGuest = () => {
    const n = netSvc();
    return !!(n && typeof n.isGuest === 'function' && n.isGuest());
  };
  const inSession = () => {
    const n = netSvc();
    return !!(n && ((typeof n.isGuest === 'function' && n.isGuest()) || (typeof n.isHost === 'function' && n.isHost())));
  };
  const ownSeat = () => viewerSeat();
  let noteSync = () => {};
  let headerInHand = null; // a skill row picked up to reorder (row index)
  const partySys = () => (typeof world.partySystem === 'function' ? world.partySystem() : null);
  const build = () => {
    if (viewSeat === 0) return world.buildSystem();
    const P = partySys();
    return P ? P.build(viewSeat) : null;
  };
  let swapNote = null; // ruling A17: the note a swap-chained open shows once

  // ------------------------------------------------------------------ style --
  const style = document.createElement('style');
  style.textContent = `
    #socket-screen {
      position: fixed; inset: 0; z-index: 30; display: none;
      align-items: center; justify-content: center;
      background: radial-gradient(ellipse at center, ${PALETTE.voidCharcoal}99 0%, ${PALETTE.voidCharcoal}D9 100%);
      font-family: system-ui, -apple-system, 'Segoe UI', var(--i18n-font, sans-serif);
      color: ${PALETTE.parchment};
      user-select: none;
    }
    #socket-screen.nd-open { display: flex; }
    #socket-screen * { box-sizing: border-box; }
    .nd-page {
      width: ${DESIGN_W}px; height: ${DESIGN_H}px; flex: none;
      transform: scale(var(--nd-s, 1)); transform-origin: center center;
      display: flex; flex-direction: column; position: relative;
      background: linear-gradient(175deg, #2b2723 0%, ${PALETTE.voidCharcoal} 55%);
      border: 2px solid ${PALETTE.warmGrey}77;
      border-radius: 16px;
      box-shadow: 0 0 0 5px ${PALETTE.voidCharcoal}CC, 0 0 0 6px ${PALETTE.warmGrey}44,
                  0 18px 60px #000000AA, inset 0 0 0 1px ${PALETTE.bone}22;
      overflow: hidden;
    }
    .nd-head {
      display: flex; align-items: center; gap: 14px; flex: none;
      padding: 7px 20px; height: 52px;
      border-bottom: 1px solid ${PALETTE.warmGrey}44;
      background: ${PALETTE.voidCharcoal}80;
    }
    .nd-title { font-size: 28px; font-weight: 800; letter-spacing: 0.14em; color: ${PALETTE.parchment}; }
    .nd-orn { color: ${PALETTE.warmGrey}; font-size: 16px; letter-spacing: 0.3em; }
    .nd-sub { font-size: 17px; color: ${PALETTE.bone}; letter-spacing: 0.02em; }
    .nd-sub b { color: ${PALETTE.parchment}; }
    .nd-headr { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .nd-total { font-size: 17px; color: ${PALETTE.bone}; font-variant-numeric: tabular-nums; }
    .nd-total b { color: ${PALETTE.parchment}; font-size: 20px; }
    .nd-btn {
      white-space: nowrap;
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
      height: 38px; padding: 0 14px; border-radius: 9px;
      font-size: 18px; font-weight: 800; letter-spacing: 0.04em;
      color: ${PALETTE.voidCharcoal}; background: ${PALETTE.hearthAmber};
      border: 2px solid ${PALETTE.hearthAmber};
    }
    .nd-btn.nd-off { background: ${PALETTE.voidCharcoal}; color: ${PALETTE.warmGrey}; border-color: ${PALETTE.warmGrey}66; cursor: default; }
    .nd-btn .nd-k { font-size: 16px; padding: 1px 6px; border-radius: 5px; background: ${PALETTE.voidCharcoal}; color: ${PALETTE.parchment}; }
    .nd-btn.nd-off .nd-k { background: #2e2a25; color: ${PALETTE.warmGrey}; }
    .nd-btn.nd-close { background: ${PALETTE.voidCharcoal}; color: ${PALETTE.parchment}; border-color: ${PALETTE.warmGrey}88; }
    .nd-btn.nd-close .nd-k { background: #2e2a25; }
    .nd-lock {
      display: none; margin: 8px 20px 0; padding: 7px 12px; flex: none;
      border: 1px solid ${PALETTE.warmGrey}66; border-radius: 8px;
      background: ${PALETTE.voidCharcoal}; color: ${PALETTE.bone};
      font-size: 18px; text-align: center;
    }
    .nd-lock.nd-on { display: block; }
    .nd-main { flex: 1 1 auto; min-height: 0; display: flex; gap: 12px; padding: 6px 16px 6px; }
    /* ------------------------------------------------------------ rows --- */
    .nd-rows { flex: none; width: 892px; display: flex; flex-direction: column; gap: 6px; }
    .nd-row {
      position: relative; height: 98px; padding: 5px 10px 3px 10px;
      display: grid; grid-template-columns: 214px ${COLS * 64 + (COLS - 1) * 7}px 76px; grid-template-rows: 64px 22px;
      column-gap: 10px; row-gap: 2px; align-items: center;
      background: ${PALETTE.voidCharcoal}B3;
      border: 1px solid ${PALETTE.warmGrey}33; border-radius: 12px;
    }
    .nd-row.nd-rowfocus { border-color: ${PALETTE.warmGrey}AA; background: #2a2622E6; }
    /* PARTY: whose row (the class accent), the header zone, a row picked up. */
    .nd-row { border-left: 4px solid var(--seatAcc, ${PALETTE.warmGrey}); }
    .nd-row.nd-headfocus .nd-rowhead { outline: 2px solid ${PALETTE.hearthAmber}; outline-offset: 2px; border-radius: 10px; }
    .nd-row.nd-rowheld { border-color: ${PALETTE.hearthAmber}; box-shadow: 0 0 16px ${PALETTE.hearthAmber}44; }
    .nd-row .nd-rowhead { cursor: pointer; }
    /* the viewed tab's caret (17 px above the tab + its 3 px lift) sits in
       the strip's top margin, clear of the header's buttons (party r5 F4) */
    .nd-strip { display: flex; justify-content: center; margin: 17px 0 0; flex: none; }
    .nd-strip .rn-pstrip { margin: 0; }
    .nd-strip .rn-ptab { min-height: 46px; padding: 3px 12px 4px 6px; }
    .nd-strip .rn-ptab .rn-pname, .nd-strip .rn-ptab .rn-pchip { line-height: 1.15; }
    .nd-strip .rn-ptab .rn-pcaret { line-height: 1; top: -15px; }
    .nd-btn.nd-focusbtn { outline: 2px solid ${PALETTE.hearthAmber}; outline-offset: 2px; }
    .nd-rowhead { display: flex; align-items: center; gap: 10px; min-width: 0; }
    /* the skill's key (1-4) rides the icon medallion's corner as a keycap */
    .nd-rkey {
      position: absolute; left: -7px; top: -7px; width: 24px; height: 24px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800; color: ${PALETTE.parchment};
      background: ${PALETTE.voidCharcoal}; border: 1px solid ${PALETTE.warmGrey}AA;
    }
    .nd-ricon {
      position: relative; flex: none; width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: ${PALETTE.parchment}; background: #2e2a25; border: 2px solid ${PALETTE.warmGrey}66;
    }
    .nd-ricon.nd-heal { color: ${PALETTE.brightHeal}; }
    .nd-ricon.nd-damage { color: ${PALETTE.hearthAmber}; }
    /* a long class-skill name ("Detonating Charge") wraps to a second line
       inside the 64 px header instead of being elided (party r5 F4) */
    .nd-rname { font-size: 19px; font-weight: 800; line-height: 1.1; overflow: hidden;
      display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
    .nd-rsub { font-size: 16px; color: ${PALETTE.warmGrey}; white-space: nowrap; }
    .nd-cells { display: flex; gap: 7px; }
    .nd-cell {
      position: relative; width: 64px; height: 64px; border-radius: 10px; flex: none;
      display: flex; align-items: center; justify-content: center;
      font-size: 30px; cursor: pointer;
      background: #2e2a25; border: 2px solid var(--rar, ${PALETTE.warmGrey});
    }
    .nd-cell.nd-vacant { border-style: dashed; border-color: ${PALETTE.warmGrey}77; background: ${PALETTE.voidCharcoal}; }
    .nd-cell.nd-vacant .nd-glyph { color: ${PALETTE.warmGrey}55; font-size: 18px; }
    /* the node in hand: every vacant cell carries its verdict badge; the
       glyph itself ghosts in only on the focused and the suggested cell */
    .nd-cell.nd-ghost { border-color: var(--rar, ${PALETTE.warmGrey}); }
    .nd-cell.nd-ghost .nd-glyph { display: none; font-size: 30px; color: var(--rar, ${PALETTE.bone}); opacity: 0.6; }
    .nd-cell.nd-ghost .nd-glyph.nd-hollow { opacity: 0.85; color: transparent; }
    .nd-cell.nd-ghost.nd-focus .nd-glyph, .nd-cell.nd-ghost.nd-suggest .nd-glyph { display: block; }
    .nd-cell.nd-ghost .nd-gidx { position: absolute; font-size: 18px; color: ${PALETTE.warmGrey}88; pointer-events: none; }
    .nd-cell.nd-ghost.nd-focus .nd-gidx, .nd-cell.nd-ghost.nd-suggest .nd-gidx { display: none; }
    .nd-cell.nd-legendary::after {
      content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: 8px;
      background: linear-gradient(115deg, transparent 30%, ${PALETTE.hearthAmber}33 46%, ${PALETTE.godstuffVioletPeak}22 50%, transparent 66%);
      background-size: 260% 100%;
      animation: nd-shimmer 3.2s linear infinite; /* shimmer sweep, never a pulse */
    }
    .nd-idx { position: absolute; left: 4px; top: 1px; font-size: 16px; line-height: 1; color: ${PALETTE.warmGrey}AA; pointer-events: none; font-variant-numeric: tabular-nums; }
    .nd-glyph { color: var(--rar, ${PALETTE.bone}); font-weight: 700; line-height: 1; }
    /* §15.5 GREY: hollow glyph + diagonal strike-through */
    .nd-glyph.nd-hollow { color: transparent; -webkit-text-stroke: 1.4px ${PALETTE.bone}; }
    .nd-strike { display: none; position: absolute; width: 124%; height: 3px;
      background: ${PALETTE.bone}; transform: rotate(-45deg); border-radius: 2px;
      box-shadow: 0 0 0 1px ${PALETTE.voidCharcoal}; pointer-events: none;
    }
    .nd-cell.nd-grey .nd-strike { display: block; }
    /* §15.5 SATURATION-INERT: hollow glyph + "+0" — never the strike */
    .nd-inert-badge { display: none; position: absolute; right: -6px; top: -7px;
      background: ${PALETTE.voidCharcoal}; border: 1px solid ${PALETTE.bone};
      border-radius: 7px; padding: 0 4px; font-size: 16px; font-weight: 800; color: ${PALETTE.bone};
      font-variant-numeric: tabular-nums; pointer-events: none; line-height: 1.15;
    }
    .nd-cell.nd-inert .nd-inert-badge { display: block; }
    .nd-fit-badge { display: none; position: absolute; right: -5px; top: -7px;
      color: ${PALETTE.hearthAmber}; font-size: 18px; pointer-events: none; text-shadow: 0 0 3px ${PALETTE.voidCharcoal};
    }
    .nd-cell.nd-fits .nd-fit-badge { display: block; }
    .nd-capblock { display: none; position: absolute; right: -6px; top: -8px;
      color: ${PALETTE.bone}; font-size: 20px; pointer-events: none; text-shadow: 0 0 3px ${PALETTE.voidCharcoal};
    }
    .nd-cell.nd-limited .nd-capblock { display: block; }
    .nd-cell.nd-focus { outline: 3px solid ${PALETTE.hearthAmber}; outline-offset: 3px; }
    .nd-cell.nd-suggest { box-shadow: 0 0 0 2px ${PALETTE.hearthAmber}66 inset; }
    @keyframes nd-reject {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-5px); } 35% { transform: translateX(5px); }
      55% { transform: translateX(-4px); } 75% { transform: translateX(3px); }
    }
    .nd-cell.nd-shake { animation: nd-reject 0.3s ease-out; }
    .nd-blockglyph {
      position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
      font-size: 38px; color: ${PALETTE.bone}; background: ${PALETTE.voidCharcoal}B3; border-radius: 8px;
      pointer-events: none;
    }
    .nd-cell.nd-blocked .nd-blockglyph { display: flex; }
    .nd-rfill {
      justify-self: stretch; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden;
    }
    .nd-rfill .nd-n { font-size: 24px; font-weight: 800; color: ${PALETTE.parchment}; }
    .nd-rfill .nd-of { font-size: 16px; color: ${PALETTE.warmGrey}; }
    .nd-rfill .nd-verd { display: block; font-size: 16px; font-weight: 800; letter-spacing: 0.03em; margin-top: 2px; }
    .nd-verd.v-live { color: ${PALETTE.hearthAmber}; }
    .nd-verd.v-upgrade { color: ${PALETTE.paleGold}; }
    .nd-verd.v-grey, .nd-verd.v-inert, .nd-verd.v-limit, .nd-verd.v-full { color: ${PALETTE.bone}; }
    .nd-rstats {
      grid-column: 1 / span 3; font-size: 16px; color: ${PALETTE.bone};
      font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .nd-rstats .nd-mod { color: ${PALETTE.hearthAmber}; font-weight: 700; }
    .nd-rstats .nd-warn { color: ${PALETTE.parchment}; font-weight: 800; }
    .nd-rowempty { height: 98px; border: 1px dashed ${PALETTE.warmGrey}33; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; font-size: 17px; color: ${PALETTE.warmGrey}; }
    /* ----------------------------------------------------------- bench --- */
    .nd-benchp {
      flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column;
      background: ${PALETTE.voidCharcoal}B3; border: 1px solid ${PALETTE.warmGrey}33; border-radius: 12px;
      padding: 8px 10px;
    }
    .nd-sect { font-size: 16px; font-weight: 800; letter-spacing: 0.2em; color: ${PALETTE.warmGrey}; margin: 0 0 6px; display: flex; }
    .nd-sect b { margin-left: auto; color: ${PALETTE.parchment}; letter-spacing: 0.02em; font-size: 18px; }
    .nd-bench { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-content: start; min-width: 0; }
    .nd-bench-empty { grid-column: 1 / span 2; font-size: 17px; color: ${PALETTE.warmGrey}; padding: 6px 2px; line-height: 1.35; }
    .nd-chip {
      position: relative; height: 40px; display: flex; align-items: center; gap: 6px; min-width: 0;
      padding: 0 7px 0 4px; cursor: pointer; overflow: hidden;
      background: #2a2622; border: 2px solid var(--rar, ${PALETTE.bone}); border-radius: 9px;
    }
    .nd-chip.nd-legendary::after {
      content: ''; position: absolute; inset: 0; pointer-events: none;
      background: linear-gradient(115deg, transparent 30%, ${PALETTE.hearthAmber}33 46%, ${PALETTE.godstuffVioletPeak}22 50%, transparent 66%);
      background-size: 260% 100%; animation: nd-shimmer 3.2s linear infinite;
    }
    @keyframes nd-shimmer { from { background-position: 130% 0; } to { background-position: -130% 0; } }
    .nd-chip-ico { flex: none; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; color: var(--rar, ${PALETTE.bone}); font-size: 18px; }
    .nd-chip-name { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .nd-chip-n { margin-left: auto; flex: none; font-size: 16px; font-weight: 800; color: ${PALETTE.parchment}; font-variant-numeric: tabular-nums; }
    .nd-chip.nd-cold .nd-chip-name { color: ${PALETTE.warmGrey}; }
    .nd-chip.nd-focus { outline: 3px solid ${PALETTE.hearthAmber}; outline-offset: 2px; }
    .nd-chip.nd-held { background: #3a3125; box-shadow: 0 0 0 2px ${PALETTE.hearthAmber} inset; }
    .nd-chip.nd-held .nd-chip-n::before { content: '▲ '; color: ${PALETTE.hearthAmber}; }
    /* ---------------------------------------------------------- detail --- */
    .nd-detail {
      flex: none; height: 108px; margin: 0 16px; padding: 4px 14px;
      border: 1px solid ${PALETTE.warmGrey}44; border-radius: 12px; background: ${PALETTE.voidCharcoal}CC;
      display: flex; flex-direction: column; justify-content: center; gap: 1px; overflow: hidden;
    }
    .nd-dtitle { font-size: 20px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nd-dtitle .nd-rar { font-weight: 700; font-size: 16px; letter-spacing: 0.08em; text-transform: uppercase; margin-left: 8px; }
    .nd-dtitle .nd-hand { color: ${PALETTE.hearthAmber}; font-size: 16px; font-weight: 800; letter-spacing: 0.06em; margin-right: 8px; }
    .nd-dline { font-size: 17px; color: ${PALETTE.bone}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nd-dline .nd-live { color: ${PALETTE.hearthAmber}; font-weight: 800; }
    .nd-dline .nd-warn { color: ${PALETTE.parchment}; font-weight: 800; }
    .nd-dline.nd-quote { font-style: italic; }
    .nd-dverdict { font-size: 16px; color: ${PALETTE.warmGrey}; font-style: italic; }
    .nd-foot {
      flex: none; min-height: 32px; padding: 0 20px; display: flex; flex-wrap: wrap; align-items: center; gap: 2px 18px;
      font-size: 16px; color: ${PALETTE.warmGrey}; overflow: hidden;
    }
    .nd-foot > * { white-space: nowrap; }
    .nd-foot b { color: ${PALETTE.bone}; font-weight: 800; }
    .nd-foot .nd-pad { margin-left: auto; }
    .nd-toast {
      position: absolute; left: 50%; top: 64px; transform: translateX(-50%); z-index: 4;
      background: ${PALETTE.voidCharcoal}; color: ${PALETTE.bone};
      border: 1px solid ${PALETTE.warmGrey}88; border-radius: 8px;
      padding: 8px 18px; font-size: 18px; opacity: 0; pointer-events: none; white-space: nowrap;
      transition: opacity 0.18s ease;
    }
    .nd-toast.nd-show { opacity: 1; }
  `;
  document.head.appendChild(style);

  // ------------------------------------------------------------------- dom --
  const rootEl = document.createElement('div');
  rootEl.id = 'socket-screen';
  rootEl.innerHTML = `
    <div class="nd-page">
      <div class="nd-head">
        <span class="nd-orn">◆ ◇</span>
        <span class="nd-title">${t('SOCKETS')}</span>
        <span class="nd-orn">◇ ◆</span>
        <span class="nd-sub">${t('<b>8 sockets</b> per skill · <b>any node, any socket</b>')}</span>
        <span class="nd-headr">
          <span class="nd-total"></span>
          <span class="nd-btn nd-auto" data-act="auto"><span class="nd-k">F</span>${t('Auto-fill')}</span>
          <span class="nd-btn nd-autoall" data-act="autoall"><span class="nd-k">⇧F</span>${t('Fill all')}</span>
          <span class="nd-btn nd-close" data-act="close"><span class="nd-k">Esc</span>${t('Close')}</span>
        </span>
      </div>
      <div class="nd-strip"></div>
      <div class="nd-lock"></div>
      <div class="nd-main">
        <div class="nd-rows"></div>
        <div class="nd-benchp">
          <div class="nd-sect">${t('BENCH')}<b class="nd-bcount"></b></div>
          <div class="nd-bench"></div>
        </div>
      </div>
      <div class="nd-detail"></div>
      <div class="nd-foot">
        <span><b>←↑→↓</b> ${t('move')}</span><span><b>Enter</b> ${t('pick · place')}</span><span><b>X</b> ${t('remove')}</span>
        <span><b>F</b> ${t('auto-fill')}</span><span><b>1–4</b> ${t('skill')}</span><span><b>Q</b>/<b>E</b> ${t('character')}</span><span><b>←</b> ${t('reorder')}</span><span><b>Esc</b> ${t('close')}</span>
        <span class="nd-pad">${t('pad')} <b>LB</b>/<b>RB</b> ${t('character')} <b>Ⓐ</b> ${t('place')} <b>Ⓧ</b> ${t('remove')} <b>Ⓨ</b> ${t('fill')} <b>Ⓑ</b> ${t('back')}</span>
      </div>
      <div class="nd-toast"></div>
    </div>`;
  document.body.appendChild(rootEl);

  const pageEl = rootEl.querySelector('.nd-page');
  const lockEl = rootEl.querySelector('.nd-lock');
  const rowsEl = rootEl.querySelector('.nd-rows');
  const benchEl = rootEl.querySelector('.nd-bench');
  const bcountEl = rootEl.querySelector('.nd-bcount');
  const detailEl = rootEl.querySelector('.nd-detail');
  const totalEl = rootEl.querySelector('.nd-total');
  const autoBtn = rootEl.querySelector('.nd-auto');
  const toastEl = rootEl.querySelector('.nd-toast');
  const autoAllBtn = rootEl.querySelector('.nd-autoall');
  const strip = createPartyStrip({ onSelect: (s) => setSeat(s), host: rootEl.querySelector('.nd-strip') });
  function setSeat(seat) {
    const s = ((Number(seat) % 4) + 4) % 4;
    if (s === viewSeat) return;
    viewSeat = s;
    held = null;
    headerInHand = null;
    noteSync();
    if (open) {
      renderAll();
      setFocus({ zone: chips.length ? 'bench' : 'cells', r: 0, c: 0, i: 0 });
    }
  }

  let scale = 1;
  function fitScale() {
    const s = Math.max(0.5, Math.min(1.75, window.innerWidth / (DESIGN_W + FIT_MARGIN), window.innerHeight / (DESIGN_H + FIT_MARGIN)));
    scale = s;
    rootEl.style.setProperty('--nd-s', s.toFixed(4));
    return s;
  }
  fitScale();
  window.addEventListener('resize', fitScale);

  // ------------------------------------------------------------------ state --
  // Cursor: zone 'cells' (r = skill row 0..3, c = socket 0..7) or 'bench'
  // (i = chip index). `held` = the node in hand ({ node }) — it never left
  // the bench (the sim only moves it when it is placed).
  let open = false;
  const focus = { zone: 'cells', r: 0, c: 0, i: 0 };
  let held = null;
  let view = null; // last build view
  let chips = []; // [{ node, count, benchIndex, provenance: {…} }]
  const cellEls = new Map(); // `${r}:${c}` -> element
  const chipEls = [];
  const rowEls = [];
  let toastTimer = null;
  let prefocus = null; // a node just drafted (§16 chain: open with it in hand)

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.remove('nd-show');
    void toastEl.offsetWidth;
    toastEl.classList.add('nd-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('nd-show'), 1700);
  }

  const info = (id) => NODES[id] ?? null;
  const sysOk = () => {
    const s = build();
    return s && typeof s.view === 'function' ? s : null;
  };

  function groupBench(bench) {
    const by = new Map();
    bench.forEach((b, idx) => {
      let g = by.get(b.node);
      if (!g) {
        g = { node: b.node, count: 0, benchIndex: idx, provenance: {} };
        by.set(b.node, g);
      }
      g.count += 1;
      g.provenance[b.provenance] = (g.provenance[b.provenance] ?? 0) + 1;
    });
    return [...by.values()].sort((a, b) => {
      const ra = RARITY_RANK[info(a.node)?.rarity] ?? 0;
      const rb = RARITY_RANK[info(b.node)?.rarity] ?? 0;
      if (ra !== rb) return rb - ra;
      return (info(a.node)?.name ?? a.node) < (info(b.node)?.name ?? b.node) ? -1 : 1;
    });
  }

  // Per-row verdict of the node in hand: live / grey / inert / limit / full
  // / upgrade (fix-M4a-r4: a full row where the node OUTRANKS a socketed one —
  // the sim's upgradeIn(), the same policy auto-fill swaps by).
  function rowVerdict(sys, sk, nodeId) {
    const n = info(nodeId);
    if (!n) return { k: 'grey', text: '—' };
    const copies = sk.sockets.filter((s) => s && s.node === nodeId).length;
    if (copies >= n.limit) return { k: 'limit', text: t('⊘ limit {limit}', { limit: n.limit }) };
    if (!sk.sockets.some((s) => s === null)) {
      const up = typeof sys.upgradeIn === 'function' ? sys.upgradeIn(sk.id, nodeId) : null;
      if (up) return { k: 'upgrade', text: t('⇧ better'), up }; // fits the 76 px verdict column
      return { k: 'full', text: t('⊘ full') };
    }
    const v = sys.verdictFor(sk.id, nodeId);
    if (v.state === 'grey') return { k: 'grey', text: t('⊘ grey') };
    if (v.state === 'inert') return { k: 'inert', text: t('＋0 inert') };
    return { k: 'live', text: t('◆ live') };
  }

  // Where the auto-fill policy would place `nodeId` (fewest filled live row,
  // first vacant socket) — the cursor jumps there when a node is picked up.
  function suggestFor(sys, nodeId) {
    if (!view) return null;
    let best = null;
    view.skills.forEach((sk, r) => {
      const vd = rowVerdict(sys, sk, nodeId);
      if (vd.k !== 'live') return;
      const c = sk.sockets.indexOf(null);
      if (c < 0) return;
      if (!best || sk.filled < best.filled) best = { r, c, filled: sk.filled };
    });
    if (best) return best;
    // fix-M4a-r4: no vacant live socket — the upgrade swap auto-fill would
    // make (the weakest socketed node this one outranks), so Enter swaps it in.
    const up = typeof sys.upgradeFor === 'function' ? sys.upgradeFor(nodeId) : null;
    if (up) {
      const r = view.skills.findIndex((s) => s.id === up.skill);
      if (r >= 0) return { r, c: up.slot, filled: view.skills[r].filled, upgrade: up };
    }
    // Nowhere live: the first vacant socket of the first row that is not limit-blocked.
    for (let r = 0; r < view.skills.length; r++) {
      const sk = view.skills[r];
      const vd = rowVerdict(sys, sk, nodeId);
      const c = sk.sockets.indexOf(null);
      if (c >= 0 && vd.k !== 'limit') return { r, c, filled: sk.filled };
    }
    return null;
  }

  // ---------------------------------------------------------------- render --
  const fmtStat = (label, base, res, unit = '') => {
    const changed = res !== null && res !== undefined && base !== res;
    const b = `${label} ${base}${unit}`;
    return changed ? `${b} → <span class="nd-mod">${res}${unit}</span>` : b;
  };

  function statsLine(sk) {
    const stats = [];
    stats.push(fmtStat(t('power'), sk.base.power, sk.resolved.power));
    if (sk.base.cd !== null) stats.push(fmtStat(t('cd'), sk.base.cd, sk.resolved.cd, t(' s')));
    if (sk.base.count !== null) stats.push(fmtStat(t('count'), sk.base.count, sk.resolved.count));
    if (sk.base.area !== null && sk.resolved.area !== null && sk.resolved.area !== sk.base.area)
      stats.push(fmtStat(t('area'), sk.base.area, sk.resolved.area, sk.shape === 'melee_arc' ? '°' : t(' u')));
    if (sk.base.range !== null && sk.resolved.range !== null && sk.resolved.range !== sk.base.range)
      stats.push(fmtStat(t('range'), sk.base.range, sk.resolved.range, t(' u')));
    if (sk.resolved.critBonus > 0) stats.push(fmtStat(t('crit'), '5%', `${Math.round((0.05 + sk.resolved.critBonus) * 100)}%`));
    if (sk.resonance > 0) stats.push(t('resonance {n}/3', { n: sk.resonance % 3 }));
    const grey = sk.sockets.filter((s) => s && s.verdict === 'grey').length;
    const inert = sk.sockets.filter((s) => s && s.verdict === 'inert').length;
    if (grey) stats.push(`<span class="nd-warn">${t('⊘ {grey} grey', { grey })}</span>`);
    if (inert) stats.push(`<span class="nd-warn">＋0 ×${inert}</span>`);
    return stats.join(' · ');
  }

  function renderAll() {
    const sys = sysOk();
    if (!sys) return;
    view = sys.view();
    // PARTY: the strip (chips = sockets filled + bench nodes waiting).
    const P = partySys();
    const rowsFor = [0, 1, 2, 3].map((s) => {
      const v = s === 0 ? world.buildSystem().view() : P ? P.build(s).view() : null;
      if (!v) return { chip: '—' };
      const f = v.skills.reduce((a, k) => a + k.filled, 0);
      return { chip: `${f}/${v.skills.length * v.socketCount}${v.bench.length ? ` · ▲${v.bench.length}` : ''}`, tone: v.bench.length ? 'take' : '' };
    });
    strip.update(rowsFor, viewSeat);
    const bench = view.bench;
    chips = groupBench(bench);
    if (held && !bench.some((b) => b.node === held.node)) held = null;

    lockEl.classList.toggle('nd-on', view.combatActive);
    lockEl.textContent = view.combatActive ? t('⊘ combat is live — sockets open between rooms only') : '';
    const filled = view.skills.reduce((a, s) => a + s.filled, 0);
    const total = view.skills.length * view.socketCount;
    totalEl.innerHTML = t('socketed <b>{filled}</b> / {total}', { filled, total });
    const canFill = typeof sys.planFill === 'function' && !view.combatActive && sys.planFill().length > 0;
    autoBtn.classList.toggle('nd-off', !canFill);

    // Rows (always SKILL_SLOTS rows: an empty skill slot is a placeholder).
    rowsEl.innerHTML = '';
    cellEls.clear();
    rowEls.length = 0;
    for (let r = 0; r < SKILL_SLOTS; r++) {
      const sk = view.skills[r];
      if (!sk) {
        const e = document.createElement('div');
        e.className = 'nd-rowempty';
        e.textContent = t('skill slot {slot} is empty — skills arrive from drafts', { slot: r + 1 });
        rowsEl.appendChild(e);
        continue;
      }
      const def = SKILLS[sk.id];
      const row = document.createElement('div');
      row.className = `nd-row${headerInHand === r ? ' nd-rowheld' : ''}`;
      row.dataset.skill = sk.id;
      row.dataset.seat = String(viewSeat); // PARTY: whose row (probes + the accent)
      row.style.setProperty('--seatAcc', CLASS_ACCENTS[CLASS_OF_SEAT[viewSeat]]);
      const iconCls = def && def.archetype === 'heal' ? ' nd-heal' : def && def.archetype === 'damage' ? ' nd-damage' : '';
      const vd = held ? rowVerdict(sys, sk, held.node) : null;
      row.innerHTML = `
        <div class="nd-rowhead">
          <span class="nd-ricon${iconCls}">${hasIcon(sk.id) ? iconHtml(sk.id, { size: 28 }) : esc(skillAbbrev(def))}<span class="nd-rkey">${r + 1}</span></span>
          <span style="min-width:0">
            <div class="nd-rname">${esc(t(sk.name))}</div>
            <div class="nd-rsub">${sk.shape === 'aura' ? t('passive · aura field') : `${esc(word(sk.archetype))} · ${esc(SHAPE_LABEL[sk.shape] ?? sk.shape)}`}</div>
          </span>
        </div>
        <div class="nd-cells"></div>
        <div class="nd-rfill"><span class="nd-n">${sk.filled}</span><span class="nd-of"> / ${view.socketCount}</span>${
          vd ? `<span class="nd-verd v-${vd.k}">${esc(vd.text)}</span>` : `<span class="nd-verd" style="color:${PALETTE.warmGrey}">${t('{n} live', { n: sk.live })}</span>`
        }</div>
        <div class="nd-rstats">${statsLine(sk)}</div>`;
      const head = row.querySelector('.nd-rowhead');
      head.addEventListener('mouseenter', () => setFocus({ zone: 'head', r }));
      head.addEventListener('click', () => {
        setFocus({ zone: 'head', r });
        activateHead();
      });
      const cells = row.querySelector('.nd-cells');
      sk.sockets.forEach((rec, c) => {
        const cell = document.createElement('div');
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cells.appendChild(cell);
        cellEls.set(`${r}:${c}`, cell);
        paintCell(sys, cell, sk, rec, c);
        cell.addEventListener('mouseenter', () => setFocus({ zone: 'cells', r, c }));
        cell.addEventListener('click', () => {
          setFocus({ zone: 'cells', r, c });
          activate();
        });
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          setFocus({ zone: 'cells', r, c });
          removeFocused();
        });
      });
      rowsEl.appendChild(row);
      rowEls[r] = row;
    }

    // Bench.
    benchEl.innerHTML = '';
    chipEls.length = 0;
    bcountEl.textContent = String(bench.length);
    if (chips.length === 0) {
      const d = document.createElement('div');
      d.className = 'nd-bench-empty';
      d.textContent = t('nothing on the bench — nodes arrive as clear spoils, from node drafts and from the shop');
      benchEl.appendChild(d);
    }
    chips.forEach((g, i) => {
      const n = info(g.node);
      const chip = document.createElement('div');
      const fits = view.skills.some((sk) => {
        const k = rowVerdict(sys, sk, g.node).k;
        return k === 'live' || k === 'upgrade';
      });
      chip.className = `nd-chip${n && n.rarity === 'legendary' ? ' nd-legendary' : ''}${fits ? '' : ' nd-cold'}${held && held.node === g.node ? ' nd-held' : ''}`;
      chip.style.setProperty('--rar', RARITY_COLOR[n ? n.rarity : 'common']);
      chip.dataset.node = g.node;
      chip.innerHTML = `
        <span class="nd-chip-ico">${hasIcon(g.node) ? iconHtml(g.node, { size: 22 }) : esc(NODE_GLYPH[g.node] ?? '?')}</span>
        <span class="nd-chip-name">${esc(n ? t(n.name) : g.node)}</span>
        <span class="nd-chip-n">${g.count > 1 ? `×${g.count}` : ''}</span>`;
      chip.addEventListener('mouseenter', () => setFocus({ zone: 'bench', i }));
      chip.addEventListener('click', () => {
        setFocus({ zone: 'bench', i });
        activate();
      });
      benchEl.appendChild(chip);
      chipEls[i] = chip;
    });
    clampFocus();
    paintFocus();
  }

  function paintCell(sys, cell, sk, rec, c) {
    cell.className = 'nd-cell';
    cell.style.removeProperty('--rar');
    let glyphChar = String(c + 1);
    let hollow = false;
    if (rec) {
      const n = info(rec.node);
      glyphChar = NODE_GLYPH[rec.node] ?? '?';
      cell.style.setProperty('--rar', RARITY_COLOR[n ? n.rarity : 'common']);
      if (n && n.rarity === 'legendary') cell.classList.add('nd-legendary');
      if (rec.verdict === 'grey') {
        hollow = true;
        cell.classList.add('nd-grey');
      } else if (rec.verdict === 'inert') {
        hollow = true;
        cell.classList.add('nd-inert');
      }
    } else {
      cell.classList.add('nd-vacant');
      if (held) {
        const vd = rowVerdict(sys, sk, held.node);
        const n = info(held.node);
        glyphChar = NODE_GLYPH[held.node] ?? '?';
        cell.classList.add('nd-ghost');
        cell.style.setProperty('--rar', RARITY_COLOR[n ? n.rarity : 'common']);
        if (vd.k === 'limit') {
          cell.classList.add('nd-limited');
          hollow = true;
        } else if (vd.k === 'grey') {
          cell.classList.add('nd-grey');
          hollow = true;
        } else if (vd.k === 'inert') {
          cell.classList.add('nd-inert');
          hollow = true;
        } else cell.classList.add('nd-fits');
      }
    }
    const showIdx = !!rec;
    const ghost = !rec && !!held;
    cell.innerHTML = `
      ${showIdx ? `<span class="nd-idx">${c + 1}</span>` : ''}
      ${ghost ? `<span class="nd-gidx">${c + 1}</span>` : ''}
      <span class="nd-glyph${hollow ? ' nd-hollow' : ''}">${esc(glyphChar)}</span>
      <span class="nd-strike"></span>
      <span class="nd-inert-badge">+0</span>
      <span class="nd-fit-badge">◆</span>
      <span class="nd-capblock">⊘</span>
      <span class="nd-blockglyph">⊘</span>`;
  }

  function clampFocus() {
    const rows = view ? view.skills.length : 0;
    if (focus.zone === 'bench' && chips.length === 0) focus.zone = 'cells';
    if (focus.zone === 'head' && rows === 0) focus.zone = 'cells';
    if (focus.zone === 'cells' && rows === 0 && chips.length > 0) focus.zone = 'bench';
    focus.r = Math.max(0, Math.min(Math.max(0, rows - 1), focus.r));
    focus.c = Math.max(0, Math.min(COLS - 1, focus.c));
    focus.i = Math.max(0, Math.min(Math.max(0, chips.length - 1), focus.i));
  }

  function setFocus(next) {
    Object.assign(focus, next);
    clampFocus();
    paintFocus();
  }

  function paintFocus() {
    for (const el of cellEls.values()) el.classList.remove('nd-focus', 'nd-suggest');
    for (const el of chipEls) if (el) el.classList.remove('nd-focus');
    for (const el of rowEls) if (el) el.classList.remove('nd-rowfocus', 'nd-headfocus');
    autoAllBtn.classList.toggle('nd-focusbtn', focus.zone === 'autoall');
    if (focus.zone === 'head') {
      if (rowEls[focus.r]) rowEls[focus.r].classList.add('nd-rowfocus', 'nd-headfocus');
    } else if (focus.zone === 'cells') {
      const el = cellEls.get(`${focus.r}:${focus.c}`);
      if (el) el.classList.add('nd-focus');
      if (rowEls[focus.r]) rowEls[focus.r].classList.add('nd-rowfocus');
    } else if (chipEls[focus.i]) chipEls[focus.i].classList.add('nd-focus');
    const sys = sysOk();
    if (sys && held) {
      const sg = suggestFor(sys, held.node);
      if (sg) cellEls.get(`${sg.r}:${sg.c}`)?.classList.add('nd-suggest');
    }
    renderDetail();
  }

  function nodeTitle(id, extra = '') {
    const n = info(id);
    if (!n) return '';
    return `<span style="color:${RARITY_COLOR[n.rarity]}">${esc(NODE_GLYPH[id] ?? '')} ${esc(t(n.name))}</span><span class="nd-rar" style="color:${RARITY_COLOR[n.rarity]}">${esc(t('{rarity} · {kind} · limit {limit}/skill', { rarity: word(n.rarity), kind: word(n.kind), limit: n.limit }))}</span>${extra}`;
  }

  function renderDetail() {
    const sys = sysOk();
    if (!sys || !view) return;
    const lines = [];
    let title = '';
    let verdict = '';
    const handTag = held ? `<span class="nd-hand">${t('▲ IN HAND')}</span>` : '';
    if (focus.zone === 'head' && view.skills[focus.r]) {
      // PARTY reorder zone.
      const sk = view.skills[focus.r];
      title = `<span>${esc(t(sk.name))}</span><span class="nd-rar">${t('key {key} · row {row} of {rows}', { key: focus.r + 1, row: focus.r + 1, rows: view.skills.length })}</span>`;
      if (headerInHand === null) lines.push(t('Enter picks this skill up to REORDER — its sockets travel with it'));
      else if (headerInHand === focus.r) lines.push(t('picked up — ↑ / ↓ or 1–4 to another skill, Enter there swaps the two rows · Esc drops it'));
      else lines.push(t('Enter swaps {from} (key {fromKey}) with {to} (key {toKey}) — keys follow the new order', { from: esc(t(view.skills[headerInHand].name)), fromKey: headerInHand + 1, to: esc(t(sk.name)), toKey: focus.r + 1 }));
      lines.push(esc(viewSeat === 0 ? t('slot order = keys 1–4') : t('slot order = keys 1–4 = the order the AI casts in')));
    } else if (focus.zone === 'autoall') {
      title = `<span>${t('Auto-fill all')}</span>`;
      lines.push(t('every character’s bench goes into its own live sockets — the same policy as F, for all four'));
    } else if (focus.zone === 'bench' && chips[focus.i]) {
      const g = chips[focus.i];
      const prov = Object.entries(g.provenance)
        .map(([k, v]) => `${word(k)}${v > 1 ? ` ×${v}` : ''}`)
        .join(', ');
      title = (held && held.node === g.node ? handTag : '') + nodeTitle(g.node, `<span class="nd-rar" style="color:${PALETTE.warmGrey}">${t('on the bench ×{count} · {from}', { count: g.count, from: esc(prov) })}</span>`);
      if (g.node === 'siphon') lines.push(`<span class="nd-quote">“${esc(t(sys.siphonCardLine()))}”</span>`);
      else lines.push(esc(t(NODE_EFFECT[g.node] ?? '')));
      const per = view.skills.map((sk) => {
        const vd = rowVerdict(sys, sk, g.node);
        const cls = vd.k === 'live' || vd.k === 'upgrade' ? 'nd-live' : 'nd-warn';
        return `${esc(t(sk.name))} <span class="${cls}">${esc(vd.text)}</span>`;
      });
      if (per.length) lines.push(per.join(' · '));
      verdict = `${previewText(sys.kitVerdict(g.node))} — ${held && held.node === g.node ? t('Enter on a socket places it · Esc keeps it on the bench') : t('Enter picks it up')}`;
    } else if (focus.zone === 'cells' && view.skills[focus.r]) {
      const sk = view.skills[focus.r];
      const rec = sk.sockets[focus.c];
      const where = `<span class="nd-rar" style="color:${PALETTE.warmGrey}">${t('{skill} · socket {socket} of {sockets}', { skill: esc(t(sk.name)), socket: focus.c + 1, sockets: view.socketCount })}</span>`;
      if (held) {
        const p = sys.preview(sk.id, held.node);
        const vd = rowVerdict(sys, sk, held.node);
        title = handTag + nodeTitle(held.node, where);
        const mark = vd.k === 'live' ? '◆' : vd.k === 'upgrade' ? '⇧' : vd.k === 'inert' ? '＋0' : '⊘';
        const why =
          vd.k === 'limit'
            ? t('repeat limit — {limit} per skill already socketed here', { limit: info(held.node).limit })
            : vd.k === 'full' && !rec
              ? DENY_COPY.full
              : p && p.lines
                ? p.lines.filter((l) => l !== sys.siphonCardLine()).map(previewText).join(' — ')
                : '';
        lines.push(`<span class="${vd.k === 'live' || vd.k === 'upgrade' ? 'nd-live' : 'nd-warn'}">${mark}</span> ${esc(why)}`);
        // fix-M4a-r4: a swap says whether it is an upgrade (the node in hand
        // outranks this occupant: a grey / +0 one, or a lower rarity), a
        // sidegrade or a downgrade — words + glyph, never colour alone.
        const swap = rec ? swapTag(held.node, rec) : null;
        const tag = swap ? swap.text : '';
        if (held.node === 'siphon') lines.push(`<span class="nd-quote">“${esc(t(sys.siphonCardLine()))}”</span>`);
        else if (rec) {
          const out = t('swaps out {node} (it banks to the bench)', { node: esc(t(info(rec.node).name)) });
          lines.push(tag ? `${esc(tag)} — ${out}` : out);
        }
        verdict =
          vd.k === 'limit'
            ? t('refused on this skill — try another row')
            : vd.k === 'grey'
              ? t('legal here, but it contributes nothing on this skill')
              : rec
                ? swap && swap.up
                  ? t('Enter swaps it in here — an upgrade')
                  : t('Enter swaps it in here')
                : t('Enter places it here');
      } else if (rec) {
        title = nodeTitle(rec.node, where);
        const p = sys.preview(sk.id, rec.node);
        const mark = rec.verdict === 'live' ? '◆' : rec.verdict === 'inert' ? '＋0' : '⊘';
        const body = p && p.lines ? p.lines.filter((l) => !/already socketed/.test(l) && l !== sys.siphonCardLine()).map(previewText).join(' — ') : word(rec.verdict);
        lines.push(`<span class="${rec.verdict === 'live' ? 'nd-live' : 'nd-warn'}">${mark}</span> ${esc(body)}`);
        if (rec.node === 'siphon') lines.push(`<span class="nd-quote">“${esc(t(sys.siphonCardLine()))}”</span>`);
        else lines.push(esc(t(NODE_EFFECT[rec.node] ?? '')));
        verdict = t('X removes it to the bench · Enter picks it up to move it');
      } else {
        title = `<span>${t('Empty socket')}</span>${where}`;
        lines.push(chips.length ? t('pick a bench node (Tab, then Enter) — or F to auto-fill every live socket') : t('the bench is empty — clear spoils, node drafts and the shop fill it'));
        lines.push(`<span>${statsLine(sk)}</span>`);
      }
    } else {
      title = `<span>${viewSeat === 0 ? t('Your build') : t("The {cls}'s build", { cls: esc(t(CLASS_NAME[CLASS_OF_SEAT[viewSeat]])) })}</span>`;
      lines.push(t('4 skills · 8 sockets each · grey cells socket freely but contribute nothing'));
    }
    detailEl.innerHTML = `
      <div class="nd-dtitle">${title}</div>
      ${lines
        .slice(0, 2)
        .map((l) => `<div class="nd-dline${l.includes('nd-quote') ? ' nd-quote' : ''}">${l}</div>`)
        .join('')}
      ${verdict ? `<div class="nd-dverdict">${esc(verdict)}</div>` : ''}`;
  }

  // ------------------------------------------------------------ interaction --
  function pickUp(nodeId) {
    held = { node: nodeId };
    const sys = sysOk();
    renderAll();
    const sg = sys ? suggestFor(sys, nodeId) : null;
    if (sg) setFocus({ zone: 'cells', r: sg.r, c: sg.c });
  }

  function activate() {
    const sys = sysOk();
    if (!sys || !view) return;
    if (view.combatActive) {
      toast(t('⊘ sockets are for between rooms'));
      return;
    }
    if (focus.zone === 'bench') {
      const g = chips[focus.i];
      if (!g) return;
      if (held && held.node === g.node) {
        held = null;
        renderAll();
        return;
      }
      pickUp(g.node);
      return;
    }
    const sk = view.skills[focus.r];
    if (!sk) return;
    const rec = sk.sockets[focus.c];
    if (held) {
      const bi = view.bench.findIndex((b) => b.node === held.node);
      const r = sys.socket(sk.id, held.node, focus.c, bi >= 0 ? bi : null);
      if (r && !r.denied) {
        held = null;
        if (r.verdict === 'grey') toast(t('socketed — grey here: it contributes nothing on this skill'));
        else if (r.verdict === 'inert') {
          // A class cell's +0 has its own reason (§25.3); only the Healer's
          // saturated Multiply is "every target already covered".
          const v = sys.verdictFor(sk.id, r.node, r.slot);
          const why = v && typeof v.reason === 'string' && v.reason !== 'saturated' ? v.reason.replace(/^\+0\s*—\s*/, '') : '';
          toast(why ? t('socketed — +0 right now: {why}', { why: previewText(why) }) : t('socketed — +0 right now (every target already covered)'));
        }
        renderAll();
      }
      return; // a denial shakes the cell via the socket_denied listener
    }
    if (rec) {
      // Pick the socketed node up to move it: it goes back to the bench (the
      // sim's unsocket) and is now in hand.
      const r = sys.unsocket(sk.id, focus.c);
      if (r && !r.error && !r.denied) {
        held = { node: rec.node };
        renderAll();
      }
      return;
    }
    if (chips.length) setFocus({ zone: 'bench', i: 0 });
  }

  // PARTY reorder: Enter on a header picks the skill up; Enter on another
  // header swaps the two rows (sockets and cooldowns travel with the skill).
  function activateHead() {
    if (!view || !view.skills[focus.r]) return;
    if (headerInHand === null) {
      headerInHand = focus.r;
      toast(t('{skill} picked up — ↑ / ↓ to another skill, Enter to swap the rows', { skill: t(view.skills[focus.r].name) }));
      renderAll();
      return;
    }
    if (headerInHand === focus.r) {
      headerInHand = null;
      renderAll();
      return;
    }
    const from = headerInHand;
    const to = focus.r;
    headerInHand = null;
    const run = world.runSystem();
    const r = run && typeof run.reorderLoadout === 'function' ? run.reorderLoadout(viewSeat, from, to) : null;
    if (r && r.denied) toast(`⊘ ${DENY_COPY[r.denied] ?? r.denied}`);
    else if (r === false) toast(t('read-only — only your own character'));
    else toast(t('rows {from} ⇄ {to} — keys follow the new order', { from: from + 1, to: to + 1 }));
    renderAll();
  }
  function autoFillAll() {
    const run = world.runSystem();
    const r = run && typeof run.autoFillAll === 'function' ? run.autoFillAll() : null;
    if (r && r.denied) {
      toast(`⊘ ${DENY_COPY[r.denied] ?? r.denied}`);
      return r;
    }
    held = null;
    renderAll();
    const n = Array.isArray(r) ? r.reduce((a, x) => a + (x.socketed ? x.socketed.length : 0), 0) : 0;
    toast(r === false ? t('read-only — only your own character') : tn(n, 'auto-fill all: {n} node socketed across the party', 'auto-fill all: {n} nodes socketed across the party'));
    return r;
  }

  function removeFocused() {
    const sys = sysOk();
    if (!sys || !view || focus.zone !== 'cells') return;
    const sk = view.skills[focus.r];
    if (!sk || !sk.sockets[focus.c]) return;
    const r = sys.unsocket(sk.id, focus.c);
    if (r && r.denied) toast(`⊘ ${DENY_COPY[r.denied] ?? r.denied}`);
    else if (r && !r.error) renderAll();
  }

  // fix-M4a-r4: how a swap of the node in hand for a socketed one ranks.
  function swapTag(nodeId, rec) {
    const a = info(nodeId);
    const b = info(rec.node);
    if (!a || !b || rec.node === nodeId) return null;
    const ra = RARITY_RANK[a.rarity] ?? 0;
    const rb = rec.verdict === 'live' ? RARITY_RANK[b.rarity] ?? 0 : -1;
    if (ra > rb)
      return {
        up: true,
        text:
          rec.verdict === 'live'
            ? t('⇧ upgrade ({from} → {to})', { from: word(b.rarity), to: word(a.rarity) })
            : rec.verdict === 'grey'
              ? t('⇧ upgrade (replaces a grey node)')
              : t('⇧ upgrade (replaces a +0 node)'),
      };
    if (ra === rb) return { up: false, text: t('⇄ sidegrade') };
    return { up: false, text: t('⇩ downgrade ({from} → {to})', { from: word(b.rarity), to: word(a.rarity) }) };
  }

  function autoFill() {
    const sys = sysOk();
    if (!sys || typeof sys.autoFill !== 'function') return null;
    const r = sys.autoFill();
    if (r === false) {
      // Another player's (or, on a guest, the Healer's) build: read-only.
      toast(viewSeat === 0 ? t('read-only — the Healer sets the sockets') : t('read-only — only your own character'));
      return r;
    }
    if (r && r.denied) {
      toast(`⊘ ${DENY_COPY[r.denied] ?? r.denied}`);
      return r;
    }
    held = null;
    renderAll();
    if (r && r.pending) {
      // PARTY: a guest's own tab — the host applies it (replicated back).
      toast(t('auto-fill sent — your sockets update in a moment'));
      return r;
    }
    const n = r && r.socketed ? r.socketed.length : 0;
    const u = r && r.upgraded ? r.upgraded : 0;
    toast(
      n > 0
        ? u
          ? `${tn(n, 'auto-fill socketed {n} node', 'auto-fill socketed {n} nodes')} ${tn(u, '({n} upgrade — the replaced node is on the bench)', '({n} upgrades — the replaced nodes are on the bench)')} · ${t('{bench} left on the bench', { bench: r.bench })}`
          : `${tn(n, 'auto-fill socketed {n} node', 'auto-fill socketed {n} nodes')} · ${t('{bench} left on the bench', { bench: r.bench })}`
        : t('auto-fill: nothing on the bench fills or upgrades a socket')
    );
    return r;
  }

  function move(dx, dy) {
    if (!view) return;
    const rows = view.skills.length;
    // PARTY: the header zone (reorder) left of socket 1; the Auto-fill all
    // button above row 1's header (the pad's way to it).
    if (focus.zone === 'autoall') {
      if (dy > 0 || dx !== 0) setFocus({ zone: 'head', r: 0 });
      return;
    }
    if (focus.zone === 'head') {
      if (dx > 0) setFocus({ zone: 'cells', c: 0 });
      else if (dy < 0 && focus.r === 0 && headerInHand === null) setFocus({ zone: 'autoall' });
      else if (dy !== 0) setFocus({ r: Math.max(0, Math.min(rows - 1, focus.r + dy)) });
      return;
    }
    if (focus.zone === 'cells') {
      if (dx < 0 && focus.c === 0) {
        setFocus({ zone: 'head' });
        return;
      }
      if (dx !== 0) {
        const c = focus.c + dx;
        if (c > COLS - 1) {
          if (chips.length) setFocus({ zone: 'bench', i: Math.min(chips.length - 1, focus.r * 2) });
          return;
        }
        setFocus({ c: Math.max(0, c) });
      } else setFocus({ r: Math.max(0, Math.min(rows - 1, focus.r + dy)) });
      return;
    }
    // bench: a 2-column grid
    const i = focus.i;
    if (dx < 0 && i % 2 === 0) {
      if (rows) setFocus({ zone: 'cells', r: Math.min(rows - 1, Math.floor(i / 2)), c: COLS - 1 });
      return;
    }
    if (dx !== 0) setFocus({ i: Math.max(0, Math.min(chips.length - 1, i + dx)) });
    else setFocus({ i: Math.max(0, Math.min(chips.length - 1, i + dy * 2)) });
  }

  function shakeCell(skillId, slot) {
    const r = view ? view.skills.findIndex((s) => s.id === skillId) : -1;
    if (r < 0) return;
    const keys = slot === null || slot === undefined ? [...Array(COLS).keys()].map((c) => `${r}:${c}`) : [`${r}:${slot}`];
    for (const k of keys) {
      const cell = cellEls.get(k);
      if (!cell) continue;
      cell.classList.remove('nd-shake', 'nd-blocked');
      void cell.offsetWidth;
      cell.classList.add('nd-shake', 'nd-blocked'); // §16: shake + block glyph
      setTimeout(() => cell.classList.remove('nd-blocked'), 650);
    }
  }

  function setOpen(next) {
    if (next === open) return { open };
    if (next) {
      const sys = sysOk();
      const active = sys ? sys.view().combatActive : false;
      if (active) return { denied: 'combat_active' }; // §3: B opens between rooms only
      // PARTY: a network guest opens on its own character's tab.
      if (isGuest() && !guestSeatShown) {
        viewSeat = ownSeat();
        guestSeatShown = true;
      }
      open = true;
      reportScreen(true);
      held = null;
      fitScale();
      rootEl.classList.add('nd-open');
      renderAll();
      const pre = prefocus;
      prefocus = null;
      if (pre && view && view.bench.some((b) => b.node === pre)) pickUp(pre);
      else if (chips.length) setFocus({ zone: 'bench', i: 0 });
      else setFocus({ zone: 'cells', r: 0, c: 0 });
      // Ruling A17: opened by a taken SWAP — say where the replaced skill's
      // nodes went and offer the auto-fill (F).
      if (swapNote) {
        toast(swapNote);
        swapNote = null;
      }
    } else {
      open = false;
      held = null; // Esc banks the candidate: it never left the bench
      rootEl.classList.remove('nd-open');
      reportScreen(false);
    }
    return { open };
  }
  let guestSeatShown = false;
  // CAMP FIXES (v0.5.227): B (or the pad's View) opens on the character the
  // player controls — the class chosen in class select, a co-op seat — not
  // on the Healer's tab. The reward chains keep opening on their own card.
  function openOwn() {
    if (!open) viewSeat = ownSeat();
    return setOpen(true);
  }
  // PARTY (BUILD_BRIEF §25.7): in a session the host learns which socket
  // screens are open — a committed door waits <= 8 s for them.
  function reportScreen(on) {
    if (!inSession()) return;
    try {
      const r = world.runSystem();
      if (r && typeof r.partyScreen === 'function') r.partyScreen(ownSeat(), on);
    } catch {
      /* no run system */
    }
  }
  // The party is leaving (the socket hold ran out): close, banking the node
  // in hand (it never left the bench).
  bus.on('party_socket_close', () => {
    if (!open) return;
    setOpen(false);
    const a = service('app');
    if (a && typeof a.toast === 'function') a.toast(t('The party moved on — your node in hand is back on the bench'), { tone: 'info', ms: 4200 });
  });
  // The leave countdown every open socket screen shows (a door held for a
  // socket screen, the shop leaving, a page deadline): its last 10 s.
  // fix-M5a-r5 (NET5-F1 family): it sits IN the header, in the subtitle's
  // place while it counts (was pinned over the header's Fill all / Close
  // buttons, hiding Close, on every multiplayer socket screen).
  const countEl = document.createElement('div');
  countEl.className = 'nd-count';
  countEl.style.cssText =
    'flex:none;white-space:nowrap;padding:5px 14px;border-radius:10px;' +
    'background:#3A2A12EE;color:#F4EFE6;font:800 16px/1.2 "Nunito","Trebuchet MS",system-ui,var(--i18n-font, sans-serif);border:1px solid #E8A23D;display:none;';
  const subEl = rootEl.querySelector('.nd-sub');
  subEl.after(countEl);
  function leaveIn() {
    let v = null;
    try {
      const r = world.runSystem();
      v = r && typeof r.view === 'function' ? r.view() : null;
    } catch {
      v = null;
    }
    if (!v) return null;
    if (v.path && v.path.hold) return { ticks: v.path.hold.inTicks, what: 'door' };
    if (v.partyShop) {
      const c = [v.partyShop.leaveInTicks, v.partyShop.deadlineInTicks].filter((t) => Number.isFinite(t));
      if (c.length && Math.min(...c) <= 600) return { ticks: Math.min(...c), what: 'shop' };
    }
    if (v.party && Number.isFinite(v.party.deadlineInTicks) && v.party.deadlineInTicks <= 600) return { ticks: v.party.deadlineInTicks, what: 'page' };
    return null;
  }
  setInterval(() => {
    const l = open ? leaveIn() : null;
    const secs = l ? Math.max(0, Math.ceil(l.ticks / 60)) : 0;
    const text = l ? (l.what === 'page' ? t('Auto-pick in {secs} s', { secs }) : t('The party leaves in {secs} s', { secs })) : '';
    if (countEl.textContent !== text) countEl.textContent = text;
    const disp = l ? '' : 'none';
    if (countEl.style.display !== disp) {
      countEl.style.display = disp;
      subEl.style.display = l ? 'none' : '';
    }
  }, 200);

  rootEl.querySelector('[data-act="auto"]').addEventListener('click', () => autoFill());
  autoAllBtn.addEventListener('click', () => autoFillAll());
  rootEl.querySelector('[data-act="close"]').addEventListener('click', () => setOpen(false));

  // Keyboard. While open the screen owns the keyboard (the run UI steps aside,
  // main.js swallows gameplay intents); its keys are consumed.
  const KEY_DIR = {
    ArrowLeft: [-1, 0], KeyA: [-1, 0],
    ArrowRight: [1, 0], KeyD: [1, 0],
    ArrowUp: [0, -1], KeyW: [0, -1],
    ArrowDown: [0, 1], KeyS: [0, 1],
  };
  const OWN_KEYS = new Set(['Enter', 'NumpadEnter', 'Space', 'Tab', 'KeyX', 'Delete', 'Backspace', 'KeyF', 'Escape', 'KeyB', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyQ', 'KeyE', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4']);
  window.addEventListener('keydown', (e) => {
    if (!open) {
      if (e.repeat) return;
      if (e.code === 'KeyB') {
        const r = openOwn();
        if (r.denied) toast(t('⊘ sockets are for between rooms'));
      }
      return;
    }
    const code = e.code;
    selSound.input('keyboard', code === 'Escape' || code === 'KeyB'); // @gnt:M3 RUN-NAV-SOUND
    const dir = KEY_DIR[code];
    let used = true;
    if (dir) move(dir[0], dir[1]); // auto-repeat allowed: a held arrow glides
    else if (e.repeat) used = OWN_KEYS.has(code); // swallow repeats, act once
    else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (focus.zone === 'head') activateHead();
      else if (focus.zone === 'autoall') autoFillAll();
      else activate();
    } else if (code === 'KeyX' || code === 'Delete' || code === 'Backspace') removeFocused();
    else if (code === 'KeyF' && e.shiftKey) autoFillAll();
    else if (code === 'KeyF') autoFill();
    else if (code === 'KeyQ' || code === 'PageUp') setSeat(viewSeat - 1);
    else if (code === 'KeyE' || code === 'PageDown') setSeat(viewSeat + 1);
    else if (/^F[1-4]$/.test(code)) setSeat(Number(code.slice(1)) - 1);
    else if (code === 'Tab') setFocus(focus.zone === 'cells' ? { zone: 'bench' } : { zone: 'cells' });
    else if (/^Digit[1-4]$/.test(code)) {
      const r = Number(code.slice(5)) - 1;
      if (focus.zone === 'head' && headerInHand !== null && view && view.skills[r]) {
        setFocus({ zone: 'head', r });
        activateHead();
      } else if (view && view.skills[r]) {
        const c = view.skills[r].sockets.indexOf(null);
        setFocus({ zone: 'cells', r, c: c >= 0 ? c : 0 });
      }
    } else if ((code === 'KeyB' || code === 'Escape') && headerInHand !== null) {
      headerInHand = null; // drop the skill picked up for a reorder
      renderAll();
    } else if (code === 'KeyB' || code === 'Escape') {
      // The socket screen is a sub-overlay (PLAN §1.5): its Esc closes it
      // (banking the candidate) and is CONSUMED — the pause menu listener,
      // registered last in the bubble phase, sees defaultPrevented.
      setOpen(false);
    } else used = false;
    if (used) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Gamepad (standard mapping), polled per frame. Open: D-pad/stick move
  // (first repeat 400 ms, then every 90 ms), A activate, B drop the held node
  // or close, X remove, Y auto-fill, LB/RB previous/next row. Closed: View
  // (button 8) opens the screen between rooms. Gameplay on a pad stays out of
  // scope (PLAN §9.3); this is a menu.
  const pad = { buttons: [], dir: null, since: 0, last: 0 };
  const pressedBtn = (b) => !!b && (typeof b === 'object' ? !!b.pressed || (typeof b.value === 'number' && b.value > 0.5) : b > 0.5);
  function padDir(p) {
    const b = p.buttons || [];
    if (pressedBtn(b[12])) return 'up';
    if (pressedBtn(b[13])) return 'down';
    if (pressedBtn(b[14])) return 'left';
    if (pressedBtn(b[15])) return 'right';
    const ax = (p.axes && p.axes[0]) || 0;
    const ay = (p.axes && p.axes[1]) || 0;
    if (Math.abs(ax) < 0.5 && Math.abs(ay) < 0.5) return null;
    return Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'right' : 'left') : ay > 0 ? 'down' : 'up';
  }
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const padLog = [];
  function onPadButton(i) {
    padLog.push({ t: Math.round(performance.now()), i, open });
    if (padLog.length > 30) padLog.shift();
    if (!open) {
      if (i === 8) {
        const r = openOwn();
        if (r.denied) toast(t('⊘ sockets are for between rooms'));
      }
      return;
    }
    selSound.input('gamepad', i === 1 || i === 8); // @gnt:M3 RUN-NAV-SOUND
    if (i === 0) {
      if (focus.zone === 'head') activateHead();
      else if (focus.zone === 'autoall') autoFillAll();
      else activate();
    } else if (i === 1) {
      if (held) {
        held = null;
        renderAll();
      } else if (headerInHand !== null) {
        headerInHand = null;
        renderAll();
      } else setOpen(false);
    } else if (i === 2) removeFocused();
    else if (i === 3) autoFill();
    else if (i === 4 || i === 5) setSeat(viewSeat + (i === 5 ? 1 : -1)); // PARTY: LB / RB = character
    else if (i === 6 || i === 7) {
      // PARTY: LT / RT = previous / next skill row (was LB / RB).
      const rows = view ? view.skills.length : 0;
      if (rows) setFocus({ zone: 'cells', r: (focus.r + (i === 7 ? 1 : rows - 1)) % rows });
    } else if (i === 8) setOpen(false);
  }
  function pollPad(now) {
    let list = null;
    try {
      list = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : null;
    } catch {
      list = null;
    }
    const p = list ? [...list].find((g) => g && g.connected !== false) : null;
    if (!p) {
      pad.buttons = [];
      pad.dir = null;
      return;
    }
    const btns = (p.buttons || []).map(pressedBtn);
    if (pad.buttons.length === 0) {
      pad.buttons = btns; // first sight: a button already held does not fire
      pad.dir = padDir(p);
      return;
    }
    for (let i = 0; i < btns.length; i++) {
      if (i >= 12 && i <= 15) continue; // D-pad handled as a direction
      if (btns[i] && !pad.buttons[i]) onPadButton(i);
    }
    pad.buttons = btns;
    if (!open) return;
    const d = padDir(p);
    if (d !== pad.dir) {
      pad.dir = d;
      pad.since = now;
      pad.last = now;
      if (d) {
        padLog.push({ t: Math.round(now), dir: d, open });
        if (padLog.length > 30) padLog.shift();
        selSound.input('gamepad'); // @gnt:M3 RUN-NAV-SOUND
        move(DIRV[d][0], DIRV[d][1]);
      }
    } else if (d && now - pad.since >= 400 && now - pad.last >= 90) {
      pad.last = now;
      selSound.input('gamepad'); // @gnt:M3 RUN-NAV-SOUND
      move(DIRV[d][0], DIRV[d][1]);
    }
  }
  // @gnt:M3 RUN-NAV-SOUND begin — fix-M3-r5 AUD5-F1: the cursor (cell / bench
  // chip / row header / Auto-fill all) and the viewed character tick like a
  // menu move when a key, the pad or the pointer moves them (src/audio/
  // uiselect.js; Esc / B / the pad's B close and never tick).
  const selSound = createSelectionSound('socket');
  let lastPX = null;
  let lastPY = null;
  rootEl.addEventListener(
    'pointermove',
    (e) => {
      // Real motion only: a re-render under a still cursor re-sends the same position.
      const moved = e.clientX !== lastPX || e.clientY !== lastPY;
      lastPX = e.clientX;
      lastPY = e.clientY;
      if (open && e.pointerType !== 'touch' && moved) selSound.input('mouse', false);
    },
    { passive: true }
  );
  for (const type of ['pointerdown', 'wheel']) rootEl.addEventListener(type, () => open && selSound.input('mouse', false), { passive: true, capture: true });
  const selSig = () => (open ? `${viewSeat}|${focus.zone}:${focus.r}:${focus.c}:${focus.i}` : null);
  // @gnt:M3 RUN-NAV-SOUND end
  function padLoop(now) {
    pollPad(now);
    selSound.poll('socket', selSig()); // @gnt:M3 RUN-NAV-SOUND
    requestAnimationFrame(padLoop);
  }
  requestAnimationFrame(padLoop);

  // Sim events keep the screen truthful even when cmd() drives the changes.
  bus.on('node_granted', () => open && renderAll());
  bus.on('node_socketed', (ev) => {
    if (!open) return;
    renderAll();
    if (ev.verdict === 'grey') toast(t('grey socket — contributes nothing on this skill'));
  });
  bus.on('node_unsocketed', () => open && renderAll());
  // §16: a room starting flips combat_active — the workbench must never be the
  // thing holding the Healer still, so it closes itself the moment combat opens.
  bus.on('room_start', () => {
    if (open) setOpen(false);
  });
  bus.on('build_restored', () => open && renderAll());
  bus.on('skill_equip', () => open && renderAll());
  bus.on('skill_swapped', () => open && renderAll());
  bus.on('loadout_reorder', () => open && renderAll());
  bus.on('build_autofill', () => open && renderAll());
  bus.on('draft_taken', (ev) => {
    // §16 chain: the run UI opens us right after this; open with the drafted
    // node in hand and the cursor on the socket the auto-fill policy picks.
    // PARTY: the Healer's own card — its tab.
    if (ev.reward === 'node' || ev.swap) viewSeat = 0;
    if (ev.reward === 'node') prefocus = ev.id;
    // Ruling A17: a taken swap releases the replaced skill's nodes.
    if (ev.reward === 'skill' && ev.swap && Array.isArray(ev.released) && ev.released.length > 0) {
      const n = ev.released.length;
      const was = SKILLS[ev.replaced] ? t(SKILLS[ev.replaced].name) : ev.replaced;
      swapNote = tn(n, '{n} node from {skill} back on the bench — F auto-fills them', '{n} nodes from {skill} back on the bench — F auto-fills them', { skill: was });
    }
  });
  bus.on('socket_denied', (ev) => {
    if (!open) return;
    shakeCell(ev.skill, ev.slot);
    toast(t('⊘ {reason} — refused', { reason: DENY_COPY[ev.reason] ?? esc(ev.reason) }));
  });

  // __echoes.cmd bridge (main.js routes these two names here).
  function cmd(name) {
    if (name === 'openSocket') return setOpen(true);
    if (name === 'closeSocket') return setOpen(false);
    return null;
  }

  // @gnt:M2 RESTORE-RESYNC begin — a loaded save is another moment: the
  // workbench closes (presentation only — the candidate was never off the
  // bench) so it never shows a build the restored sim does not hold.
  bus.on('state_restored', () => {
    if (open) setOpen(false);
  });
  // @gnt:M2 RESTORE-RESYNC end
  // @gnt:M5b GUEST-GUARD begin
  // A network guest may browse the workbench (the replicated build), but the
  // Healer's sockets are the host's to set: the net session's build-system
  // proxy turns socket()/unsocket() into a refused CMD, and the workbench
  // says so while it is open on a guest.
  {
    const guestNote = document.createElement('div');
    guestNote.className = 'nt-socket-note';
    guestNote.style.cssText =
      'position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:5;padding:6px 16px;border-radius:10px;' +
      'background:#221F1BEE;color:#F4EFE6;font:700 16px/1.2 "Nunito","Trebuchet MS",system-ui,var(--i18n-font, sans-serif);border:1px solid #9C918688;display:none;';
    guestNote.textContent = t('Read-only — the Healer sets the sockets');
    rootEl.appendChild(guestNote);
    // PARTY: a guest's OWN tab is editable (its CMDs go to the host); every
    // other tab is read-only and says whose build it is.
    const syncNote = () => {
      let guest = false;
      let who = 'Healer';
      try {
        const n = (window.__echoes && window.__echoes.net) || null;
        guest = !!(n && typeof n.isGuest === 'function' && n.isGuest());
        // The host decides (net/seats.js chooserSeat: the Tank after a
        // migration once a human is back on the Healer).
        if (guest && n.session && typeof n.session.chooserLabel === 'function') who = n.session.chooserLabel() || 'Healer';
      } catch {
        guest = false;
      }
      const own = guest && viewSeat === ownSeat();
      const cls = CLASS_NAME[CLASS_OF_SEAT[viewSeat]] ?? 'Healer';
      const text = viewSeat === 0 ? t('Read-only — the {who} sets the sockets', { who: t(who) }) : t("Read-only — the {cls}'s build is its player's", { cls: t(cls) });
      if (guestNote.textContent !== text) guestNote.textContent = text;
      guestNote.style.display = open && guest && !own ? '' : 'none';
    };
    noteSync = syncNote;
    const obs = new MutationObserver(syncNote);
    obs.observe(rootEl, { attributes: true, attributeFilter: ['class'] });
  }
  // @gnt:M5b GUEST-GUARD end

  const rectOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
  };
  return {
    cmd,
    isOpen: () => open,
    // Probe surface (M4c gates): rows, cells, bench chips, cursor, hand, the
    // on-screen rects (fit + overlap checks) and the pad log.
    debug: () => ({
      open,
      scale: Math.round(scale * 1000) / 1000,
      rows: [...rowsEl.querySelectorAll('.nd-row .nd-rname')].map((n) => n.textContent),
      cells: rowEls.map((row, r) =>
        [...Array(COLS).keys()].map((c) => {
          const el = cellEls.get(`${r}:${c}`);
          if (!el) return null;
          const cls = el.className;
          return {
            state: /nd-vacant/.test(cls) ? (/nd-ghost/.test(cls) ? 'ghost' : 'vacant') : 'filled',
            grey: /nd-grey/.test(cls),
            inert: /nd-inert/.test(cls),
            fits: /nd-fits/.test(cls),
            limited: /nd-limited/.test(cls),
            focus: /nd-focus/.test(cls),
          };
        })
      ),
      bench: chips.map((g) => ({ node: g.node, count: g.count })),
      focus: { ...focus },
      held: held ? { ...held } : null,
      detail: detailEl.innerText,
      rects: {
        page: rectOf(pageEl),
        rows: rowEls.map((r) => rectOf(r)),
        cells: [...cellEls.entries()].map(([k, el]) => ({ k, ...rectOf(el) })),
        chips: chipEls.map((c) => rectOf(c)),
        detail: rectOf(detailEl),
        auto: rectOf(autoBtn),
      },
      pad: padLog.slice(-10),
      // PARTY probe surface (PLAN §16.4 socketUi()).
      viewSeat,
      inHand: held ? held.node : null,
      headerInHand,
      rowSeats: rowEls.map((r) => (r ? Number(r.dataset.seat) : null)),
      tabs: strip.tabs().map((t) => ({ seat: Number(t.dataset.seat), viewed: t.classList.contains('rn-pview'), chip: t.querySelector('.rn-pchip').textContent, h: Math.round(t.getBoundingClientRect().height) })),
    }),
    // PARTY: view a character's tab (the chain from a party card, probes).
    setSeat,
  };
}
