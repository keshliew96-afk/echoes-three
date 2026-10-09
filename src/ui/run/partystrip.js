// The party strip (BUILD_BRIEF §25.6, PLAN §16.4) — ONE component on every
// build page: the party page, the shop shelf, the socket screen (and the
// compact build lines of the level cards). Owner: PARTY.
//
// 4 tabs in party order (Healer · Tank · Swordsman · Archer = the command
// bar's portrait order = F1-F4). Each tab: the rendered portrait (the §17
// head from the HUD's portrait cache), the class glyph in Parchment ink, the
// class name, a thin class-accent underline, a state chip and — in a network
// session — the owner ("you" / "AI" / a name). The VIEWED tab is raised,
// outlined in Hearth Amber (§19.1 selection) and carries a ▼ caret: never
// colour alone. Tabs are ≥ 44 design px tall.
//
// Switching is navigation, never a commit: a click on a tab (mouse), Q / E
// or PgUp / PgDn (previous / next, wrapping), F1-F4 (direct), pad LB / RB —
// the page that owns the strip maps its keys to setView().
import { PALETTE, CLASS_ACCENTS } from '../../data/palette.js';
import { CLASS_NAME } from '../../data/classes.js';
import { classOfSeat } from '../../data/lineup.js';
import { iconHtml } from '../hud/icons.js';
import { portraitCache } from '../hud/portraits.js';
import { esc } from './style.js';
import { service } from '../../app/registry.js';
import { t } from '../../i18n/index.js';

export const PARTY_STRIP_CSS = `
  .rn-pstrip { display: flex; gap: 8px; margin: 0 0 10px; justify-content: center; }
  .rn-ptab {
    position: relative; display: grid; grid-template-columns: 40px auto; grid-template-rows: auto auto;
    column-gap: 8px; align-items: center; min-height: 52px; min-width: 150px;
    padding: 5px 12px 7px 6px; cursor: pointer; user-select: none;
    background: ${PALETTE.voidCharcoal}; border: 2px solid ${PALETTE.warmGrey}66; border-radius: 10px;
    color: ${PALETTE.parchment}; transition: transform 120ms ease, border-color 120ms ease;
  }
  .rn-ptab:hover { border-color: ${PALETTE.bone}; }
  .rn-ptab.rn-pview {
    border-color: ${PALETTE.hearthAmber}; transform: translateY(-3px);
    box-shadow: 0 0 14px ${PALETTE.hearthAmber}44;
  }
  .rn-ptab .rn-pface {
    grid-row: 1 / span 2; width: 40px; height: 40px; border-radius: 8px; overflow: hidden;
    background: #2c2823; border: 1px solid ${PALETTE.warmGrey}55; position: relative;
  }
  .rn-ptab .rn-pface img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .rn-ptab .rn-pface .rn-pglyph {
    position: absolute; right: -2px; bottom: -3px; color: ${PALETTE.parchment};
    background: ${PALETTE.voidCharcoal}; border-radius: 6px; line-height: 0; padding: 1px;
  }
  .rn-ptab .rn-pname { font-size: 16px; font-weight: 800; letter-spacing: 0.04em; white-space: nowrap; }
  .rn-ptab .rn-pchip { font-size: 16px; color: ${PALETTE.bone}; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .rn-ptab .rn-pchip.rn-ptake { color: ${PALETTE.hearthAmber}; }
  .rn-ptab .rn-pchip.rn-pwait { color: ${PALETTE.parchment}; font-weight: 700; }
  /* fix-M5a-r5 (NET5-F1): the owner line is IN FLOW — a pill after the
     class name on the name row (was absolutely pinned to the tab's top-right
     corner, drawn over "Healer" / "Swordsman"). Only a tab that has an owner
     (a network session) gets the third column, so single-player tabs keep
     their exact size; a long player name ends in an ellipsis (full name in
     the tooltip / accessible name), never over its neighbour. */
  .rn-ptab .rn-powner { display: none; }
  .rn-ptab.rn-howner { grid-template-columns: 40px auto auto; }
  .rn-ptab.rn-howner .rn-pname { grid-column: 2; grid-row: 1; }
  .rn-ptab.rn-howner .rn-pchip { grid-column: 2 / span 2; grid-row: 2; }
  .rn-ptab.rn-howner .rn-powner {
    display: block; grid-column: 3; grid-row: 1; justify-self: start; align-self: center;
    max-width: 7.5em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: 16px; line-height: 1.1; font-weight: 700; color: ${PALETTE.bone};
    padding: 0 6px 1px; border: 1px solid ${PALETTE.warmGrey}88; border-radius: 6px;
  }
  .rn-ptab.rn-howner .rn-powner.rn-pyou { color: ${PALETTE.parchment}; border-color: ${PALETTE.parchment}aa; }
  .rn-ptab.rn-howner .rn-powner.rn-pai { color: ${PALETTE.warmGrey}; font-weight: 600; }
  .rn-ptab .rn-paccent { position: absolute; left: 10px; right: 10px; bottom: 2px; height: 3px; border-radius: 2px; }
  .rn-ptab .rn-pcaret {
    position: absolute; left: 50%; top: -17px; transform: translateX(-50%);
    font-size: 16px; color: ${PALETTE.hearthAmber}; display: none;
  }
  .rn-ptab.rn-pview .rn-pcaret { display: block; }
  /* The owner band on every card / shelf card / socket row (§25.6). */
  .rn-owner {
    display: flex; align-items: center; gap: 7px; justify-content: center;
    font-size: 16px; font-weight: 800; letter-spacing: 0.14em; color: ${PALETTE.parchment};
    padding: 3px 10px; margin: 0 0 6px; border-radius: 8px;
    background: ${PALETTE.voidCharcoal}; border-left: 5px solid var(--acc, ${PALETTE.warmGrey});
  }
  .rn-owner .rn-ownerface { width: 22px; height: 22px; border-radius: 5px; overflow: hidden; background: #2c2823; }
  .rn-owner .rn-ownerface img { width: 100%; height: 100%; object-fit: cover; display: block; }
  #run-screen.rn-compact .rn-ptab { min-height: 48px; min-width: 138px; padding: 4px 10px 6px 5px; }
  #run-screen.rn-compact .rn-pstrip { margin: 0 0 6px; gap: 6px; }
  /* gauntlet r5 PARTY F3: the party page is one fixed frame (draft.js sizes
     it to its tallest character card). The note row takes the spare height
     BELOW its notes, so the strip, the card and the Take / Leave row sit at
     the same place on every character's tab. */
  #run-screen .rn-draft.rn-party .rn-noterow { flex: 1 0 auto; align-content: flex-start; }
  /* The frame / shelf measuring pass flips every tab in one task: no
     transition may start from those unpainted states. */
  #run-screen .rn-measuring, #run-screen .rn-measuring * { transition: none !important; }
  /* gauntlet r5 PARTY F4 — the shop's party rail.
     (a) The viewed tab's caret (17 px above the tab + its 3 px lift) sits in
         the strip's own top margin, clear of the title row (1024x576: the
         Healer tab's caret was drawn over "THE PEDDLER'S SHELF"); the tabs
         are the socket screen's 46 px ones (>= 44 design px) to pay for it. */
  #run-screen .rn-shop .rn-shopstrip .rn-pstrip { margin: 15px 0 6px; }
  #run-screen .rn-shop .rn-ptab { min-height: 46px; padding: 3px 12px 4px 6px; grid-template-columns: 36px auto; }
  #run-screen .rn-shop .rn-ptab .rn-pface { width: 36px; height: 36px; }
  #run-screen .rn-shop .rn-ptab .rn-pname, #run-screen .rn-shop .rn-ptab .rn-pchip { line-height: 1.15; }
  #run-screen .rn-shop .rn-ptab .rn-pcaret { line-height: 1; top: -15px; }
  #run-screen .rn-shop .rn-ptab.rn-howner { grid-template-columns: 36px auto auto; }
  /* (b) The measuring twin (shop.js): laid out like the shelf, never seen,
         never hit, never in the page's flow. */
  #run-screen .rn-shop .rn-shelf.rn-shelftwin {
    position: absolute; left: 0; top: 0; width: max-content; margin: 0;
    visibility: hidden; pointer-events: none; z-index: -1;
  }
  /* (c) Stacked ribbons (shop.js decides per visit): the owner band on its
         own row, the Suggested ribbon under it at the right — every item's
         row the same height on every shelf, so the cards start at one y. */
  #run-screen .rn-shop.rn-ribstack .rn-itemtabs {
    flex-direction: column; align-items: flex-start; justify-content: flex-start;
    gap: 2px; min-height: 46px;
  }
  #run-screen .rn-shop.rn-ribstack .rn-suggest { align-self: flex-end; }
  /* (e) Narrow + short windows (shop.js rn-tabhead): the tabs take the
         title's place in the header row; the row's top padding holds the
         viewed tab's caret. */
  #run-screen .rn-shop.rn-tabhead .rn-title { display: none; }
  #run-screen .rn-shop.rn-tabhead .rn-head { padding-top: 15px; align-items: center; }
  #run-screen .rn-shop.rn-tabhead .rn-head .rn-shopstrip { width: auto; flex: 0 0 auto; }
  #run-screen .rn-shop.rn-tabhead .rn-head .rn-shopstrip .rn-pstrip { margin: 0; }
  #run-screen.rn-compact .rn-shop.rn-tabhead { padding-top: 5px; padding-bottom: 8px; }
  #run-screen.rn-compact .rn-shop.rn-tabhead .rn-plaque { padding-top: 3px; padding-bottom: 3px; }
  /* (f) fix-M5a-r6 (NET6-F2) — the tab-head FIT levels (shop.js fitHead
         adds them in order until the header row holds its content; a
         session's owner pills pushed the Glint / room plate out of the
         window at 1024-1279 px).
         L1 the owner pill joins the narrower line of its tab (beside the
            purse when the purse is the shorter line). */
  #run-screen .rn-shop.rn-hf-own2 .rn-ptab.rn-howner.rn-pown2 .rn-pname { grid-column: 2 / span 2; grid-row: 1; }
  #run-screen .rn-shop.rn-hf-own2 .rn-ptab.rn-howner.rn-pown2 .rn-pchip { grid-column: 2; grid-row: 2; }
  #run-screen .rn-shop.rn-hf-own2 .rn-ptab.rn-howner.rn-pown2 .rn-powner { grid-column: 3; grid-row: 2; }
  /*     L2 the plate on two lines: "◉ 72 GLINT" over "ROOM 7 OF 8" (same
            text, same type sizes — the " · " rule hides, a line break shows). */
  #run-screen .rn-shop.rn-hf-plate2 .rn-head .rn-strip {
    display: block; text-align: center; white-space: nowrap; line-height: 1;
    padding-top: 2px; padding-bottom: 2px; margin-bottom: 0; border-radius: 14px;
  }
  #run-screen .rn-shop.rn-hf-plate2 .rn-head .rn-strip .rn-glint { display: inline-flex; vertical-align: middle; }
  #run-screen .rn-shop.rn-hf-plate2 .rn-head .rn-strip .rn-labsep { display: none; }
  #run-screen .rn-shop.rn-hf-plate2 .rn-head .rn-strip .rn-labbr::before { content: '\\A'; white-space: pre; }
  #run-screen .rn-shop.rn-hf-plate2 .rn-head .rn-strip .rn-num { margin-left: 0.35em; }
  /*     L3 / L4 / L6 a long player name ends in an ellipsis sooner (the
            full name stays in the pill's tooltip / accessible name). */
  #run-screen .rn-shop.rn-hf-own5 .rn-ptab.rn-howner .rn-powner { max-width: 5em; }
  #run-screen .rn-shop.rn-hf-own4 .rn-ptab.rn-howner .rn-powner { max-width: 4em; }
  #run-screen .rn-shop.rn-hf-own3 .rn-ptab.rn-howner .rn-powner { max-width: 3em; }
  /*     L5 the lantern ornament steps aside (names before decoration); L7
            the plate wraps under the tabs (last resort — never off the frame). */
  #run-screen .rn-shop.rn-hf-nolamp .rn-head .rn-orn { display: none; }
  #run-screen .rn-shop.rn-hf-nolamp .rn-head .rn-strip { margin-left: auto; }
  #run-screen .rn-shop.rn-hf-wrap .rn-head { flex-wrap: wrap; row-gap: 4px; }
  /* (d) Windows at least 1280 px wide give the compact shelf the roomy
         280 px cards (4 x 280 + 3 x 14 + 40 = 1202 px): the band and the
         ribbon share one row there, and the copy wraps less. */
  @media (min-width: 1280px) {
    #run-screen.rn-compact .rn-shop .rn-item,
    #run-screen.rn-compact .rn-shop .rn-item .rn-card { width: 280px; }
  }
`;

const faceHtml = (classId, px = 40) => {
  const src = portraitCache()[classId];
  return src
    ? `<img alt="" src="${src}" width="${px}" height="${px}">`
    : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-weight:900;font-size:18px">${esc(t(CLASS_NAME[classId])[0])}</span>`;
};

// The owner band markup ("FOR THE TANK" + portrait + accent stripe).
export function ownerBandHtml(seat, { you = false } = {}) {
  const classId = classOfSeat(seat);
  const acc = CLASS_ACCENTS[classId];
  const label = seat === 0 ? (you ? t('FOR YOU — THE HEALER') : t('FOR THE HEALER')) : t('FOR THE {cls}', { cls: t(CLASS_NAME[classId]).toUpperCase() });
  return `<div class="rn-owner" data-seat="${seat}" style="--acc:${acc}"><span class="rn-ownerface">${faceHtml(classId, 22)}</span>${iconHtml(`cls_${classId}`, { size: 18 })}<span>${esc(label)}</span></div>`;
}

// fix-M5a-r5 (NET5-F1): the owner line of each tab in a network session
// (BUILD_BRIEF §25.6): "you" (the viewer's own character), the player's name
// (another human's character) or "AI" (an AI-held seat — the host builds it).
// ['', '', '', ''] outside a session: single-player tabs carry no owner line.
// `kinds` = per-seat 'human' | 'ai' when the page knows it (the party page's
// `owners`); otherwise the sim's seat controllers, then the room roster.
export function netOwners(kinds = null) {
  const none = ['', '', '', ''];
  const n = service('net');
  let guest = false;
  let host = false;
  try {
    guest = !!(n && typeof n.isGuest === 'function' && n.isGuest());
    host = !guest && !!(n && typeof n.isHost === 'function' && n.isHost());
  } catch {
    return none;
  }
  if (!guest && !host) return none;
  const own = guest && Number.isInteger(n.seat) ? n.seat : 0;
  const seats = (n.room && Array.isArray(n.room.seats) && n.room.seats) || [];
  const seatOf = (i) => seats.find((x) => x && x.index === i) || null;
  let k = Array.isArray(kinds) ? kinds : null;
  if (!k) {
    try {
      const c = service('content');
      const w = c && typeof c.world === 'function' ? c.world() : null;
      const a = w && typeof w.allySystem === 'function' ? w.allySystem() : null;
      const ctl = a && typeof a.controllers === 'function' ? a.controllers() : null;
      if (Array.isArray(ctl)) k = ctl;
    } catch {
      k = null;
    }
  }
  return [0, 1, 2, 3].map((s) => {
    if (s === own) return 'you';
    const r = seatOf(s);
    const human = k ? k[s] === 'human' : !!(r && r.peerId && r.connected);
    return human ? (r && r.peerId && r.name) || 'player' : 'AI';
  });
}

// The owner line as shown: netOwners' 'you' / 'AI' / 'player' markers are
// translated; a player's own name is shown as typed.
export function ownerLabel(o) {
  if (o === 'you') return t('you');
  if (o === 'AI') return t('AI');
  if (o === 'player') return t('player');
  return o;
}

export function createPartyStrip({ onSelect = null, host = null } = {}) {
  const el = document.createElement('div');
  el.className = 'rn-pstrip';
  el.setAttribute('role', 'tablist');
  const tabs = [];
  let view = 0;
  let faces = '';
  function build() {
    el.innerHTML = '';
    tabs.length = 0;
    faces = Object.keys(portraitCache()).join(',');
    for (let seat = 0; seat < 4; seat++) {
      const classId = classOfSeat(seat);
      const tab = document.createElement('div');
      tab.className = 'rn-ptab';
      tab.dataset.seat = String(seat);
      tab.setAttribute('role', 'tab');
      tab.innerHTML = `<span class="rn-pcaret">▼</span>
        <span class="rn-pface">${faceHtml(classId)}<span class="rn-pglyph">${iconHtml(`cls_${classId}`, { size: 16 })}</span></span>
        <span class="rn-pname">${esc(t(CLASS_NAME[classId]))}</span>
        <span class="rn-pchip">—</span>
        <span class="rn-powner"></span>
        <i class="rn-paccent" style="background:${CLASS_ACCENTS[classId]}"></i>`;
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelect) onSelect(seat, 'mouse');
      });
      tabs.push(tab);
      el.appendChild(tab);
    }
  }
  build();
  if (host) host.appendChild(el);

  // update(rows, viewSeat): rows[seat] = { chip, tone: 'take'|'wait'|'', owner }
  function update(rows, viewSeat) {
    if (Object.keys(portraitCache()).join(',') !== faces) build();
    view = viewSeat;
    let owners = null;
    for (let s = 0; s < 4; s++) {
      const tab = tabs[s];
      const r = (rows && rows[s]) || {};
      const chip = tab.querySelector('.rn-pchip');
      const txt = r.chip ?? '—';
      if (chip.textContent !== txt) chip.textContent = txt;
      chip.className = `rn-pchip${r.tone === 'take' ? ' rn-ptake' : r.tone === 'wait' ? ' rn-pwait' : ''}`;
      // A row without an `owner` (the shop and socket strips) takes the
      // session's owner line; '' = no line (single-player).
      const own = tab.querySelector('.rn-powner');
      const o = r.owner !== undefined && r.owner !== null ? String(r.owner) : (owners || (owners = netOwners()))[s];
      const shown = ownerLabel(o);
      if (own.textContent !== shown) {
        own.textContent = shown;
        own.title = o === 'you' ? t('Your character') : o === 'AI' ? t('AI-held — the host builds it') : o ? t('Played by {name}', { name: shown }) : '';
      }
      own.className = `rn-powner${o === 'you' ? ' rn-pyou' : o === 'AI' ? ' rn-pai' : ''}`;
      tab.classList.toggle('rn-howner', !!o);
      const on = s === viewSeat;
      tab.classList.toggle('rn-pview', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }
  return { el, update, viewSeat: () => view, tabs: () => tabs.slice() };
}
