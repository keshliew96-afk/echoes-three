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
import { CLASS_OF_SEAT, CLASS_NAME } from '../../data/classes.js';
import { iconHtml } from '../hud/icons.js';
import { portraitCache } from '../hud/portraits.js';
import { esc } from './style.js';

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
  .rn-ptab .rn-powner { position: absolute; right: 8px; top: 3px; font-size: 16px; color: ${PALETTE.warmGrey}; }
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
`;

const faceHtml = (classId, px = 40) => {
  const src = portraitCache()[classId];
  return src
    ? `<img alt="" src="${src}" width="${px}" height="${px}">`
    : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-weight:900;font-size:18px">${esc(CLASS_NAME[classId][0])}</span>`;
};

// The owner band markup ("FOR THE TANK" + portrait + accent stripe).
export function ownerBandHtml(seat, { you = false } = {}) {
  const classId = CLASS_OF_SEAT[seat];
  const acc = CLASS_ACCENTS[classId];
  const label = seat === 0 ? (you ? 'FOR YOU — THE HEALER' : 'FOR THE HEALER') : `FOR THE ${CLASS_NAME[classId].toUpperCase()}`;
  return `<div class="rn-owner" data-seat="${seat}" style="--acc:${acc}"><span class="rn-ownerface">${faceHtml(classId, 22)}</span>${iconHtml(`cls_${classId}`, { size: 18 })}<span>${esc(label)}</span></div>`;
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
      const classId = CLASS_OF_SEAT[seat];
      const t = document.createElement('div');
      t.className = 'rn-ptab';
      t.dataset.seat = String(seat);
      t.setAttribute('role', 'tab');
      t.innerHTML = `<span class="rn-pcaret">▼</span>
        <span class="rn-pface">${faceHtml(classId)}<span class="rn-pglyph">${iconHtml(`cls_${classId}`, { size: 16 })}</span></span>
        <span class="rn-pname">${esc(CLASS_NAME[classId])}</span>
        <span class="rn-pchip">—</span>
        <span class="rn-powner"></span>
        <i class="rn-paccent" style="background:${CLASS_ACCENTS[classId]}"></i>`;
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelect) onSelect(seat, 'mouse');
      });
      tabs.push(t);
      el.appendChild(t);
    }
  }
  build();
  if (host) host.appendChild(el);

  // update(rows, viewSeat): rows[seat] = { chip, tone: 'take'|'wait'|'', owner }
  function update(rows, viewSeat) {
    if (Object.keys(portraitCache()).join(',') !== faces) build();
    view = viewSeat;
    for (let s = 0; s < 4; s++) {
      const t = tabs[s];
      const r = (rows && rows[s]) || {};
      const chip = t.querySelector('.rn-pchip');
      const txt = r.chip ?? '—';
      if (chip.textContent !== txt) chip.textContent = txt;
      chip.className = `rn-pchip${r.tone === 'take' ? ' rn-ptake' : r.tone === 'wait' ? ' rn-pwait' : ''}`;
      const own = t.querySelector('.rn-powner');
      const o = r.owner ?? '';
      if (own.textContent !== o) own.textContent = o;
      const on = s === viewSeat;
      t.classList.toggle('rn-pview', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }
  return { el, update, viewSeat: () => view, tabs: () => tabs.slice() };
}
