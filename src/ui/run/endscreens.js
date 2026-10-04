// Victory / Defeat (BUILD_BRIEF §18 "Meta screens"):
//   Victory — warm high-key wash (the ONE screen where the environment matches
//     party warmth), run summary + "Return to Camp".
//   Defeat  — soft God-stuff violet-white wash regardless of act, wry tone
//     ("The gods applaud."), "Return to Camp".
// Both render from the FROZEN run summary the sim took at run end: the live
// state is already wiped by then (§13 "wiped at run end: everything").
import { esc } from './style.js';
import { SKILLS } from '../../sim/skills.js';
import { service } from '../../app/registry.js'; // M2 NEW-BEST: the save service's run record
import { levelFor } from '../../data/levels.js';

// Per-act victory line (matches ui/run/transit.js FLAVOUR).
const WIN_FLAVOUR = {
  1: 'The Hollow Stag falls. The wood breathes out.',
  2: 'The Drowned Heron sinks. The water runs clear again.',
  3: 'The Barrow Wyrm is still. The long night lifts.',
};
import { CAMPAIGN_LEVELS } from '../../data/campaign.js';
import { PALETTE } from '../../data/palette.js';
import { CLASS_NAME, CLASS_OF_SEAT } from '../../data/classes.js';
import { iconHtml, hasIcon } from '../hud/icons.js';
import { portraitCache } from '../hud/portraits.js';
import { netOwners } from './partystrip.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

// fix-INT-r5 (J5-F2, benchmark B14): the end card is a FIXED-WIDTH plate.
// Its width used to be whatever its content asked for — with a built party
// the one-line "skills · every node name" note grew the page to the whole
// window (1280 of 1280 px, 1600 of 1600) and the four build rows' grid
// stretched its columns edge to edge; with 0 nodes the same page was a
// ~410 px plate. Now the page is END_W px (never wider than the window
// minus a margin), the stats sit in two key / value pairs per row, and the
// party is a real table — one row per character (portrait + class, the
// equipped skills as icon chips that wrap inside their own column, sockets
// filled, purse) whose columns every row shares (CSS subgrid), so a longer
// loadout wraps within its cell instead of widening anything.
const END_W = 980; // = the run pages' design width (ui/run/index.js DESIGN.w)
export const END_CSS = `
  #run-screen .rn-page.rn-end { width: min(${END_W}px, calc(100vw - 96px)); }
  /* The roomy (non-compact, >= 1200 px tall) layout pads the page wider, so
     its plate is wider by the same amount: one skill line per character. */
  #run-screen:not(.rn-compact) .rn-page.rn-end { width: min(${END_W + 40}px, calc(100vw - 96px)); }
  /* ui/run/index.js fitScale: the band under the HUD's corner plates (0 when
     the card needs the whole height, and for every other page). */
  #run-screen.rn-open { padding-top: var(--rn-top, 0px); }
  /* Under 1200 px of width the chips drop their icons so a loadout still
     reads on one line (the names carry the information; the icons repeat
     the command bar's). */
  @media (max-width: 1199px) { .rn-end .rn-chip svg { display: none; } }
  .rn-end .rn-summary {
    grid-template-columns: max-content max-content max-content max-content;
    justify-content: center; gap: 5px 14px; margin: 4px 0 2px; font-size: 18px;
  }
  .rn-end .rn-summary .rn-k2 { margin-left: 30px; }
  .rn-end .rn-summary .rn-hero {
    grid-column: 1 / -1; justify-self: center; margin-bottom: 4px;
    display: flex; align-items: baseline; gap: 12px;
  }
  .rn-end .rn-summary .rn-hero .rn-v { font-size: 22px; font-weight: 700; }
  .rn-end .rn-party {
    align-self: stretch; margin-top: 12px;
    display: grid; grid-template-columns: max-content minmax(0, 1fr) max-content max-content;
    column-gap: 18px; row-gap: 4px;
  }
  .rn-end .rn-party-head {
    grid-column: 1 / -1; display: flex; align-items: center; gap: 12px;
    font-size: 16px; letter-spacing: 0.24em; color: ${PALETTE.warmGrey};
  }
  .rn-end .rn-party-head::before, .rn-end .rn-party-head::after {
    content: ''; flex: 1 1 0; height: 1px; background: ${PALETTE.warmGrey}55;
  }
  .rn-end .rn-prow {
    grid-column: 1 / -1; display: grid; grid-template-columns: subgrid; align-items: center;
    padding: 5px 12px 5px 8px; border-radius: 10px;
    background: ${PALETTE.voidCharcoal}B3; border: 1px solid ${PALETTE.warmGrey}33;
  }
  .rn-end .rn-pwho { display: flex; align-items: center; gap: 9px; }
  .rn-end .rn-pface {
    width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%; overflow: hidden;
    border: 2px solid ${PALETTE.warmGrey}88; background: ${PALETTE.voidCharcoal};
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 900; color: ${PALETTE.bone};
  }
  .rn-end .rn-pface img { width: 100%; height: 100%; display: block; }
  .rn-end .rn-pname { font-size: 17px; font-weight: 800; color: ${PALETTE.parchment}; }
  .rn-end .rn-pid { display: flex; flex-direction: column; line-height: 1.12; }
  .rn-end .rn-pown { font-size: 16px; color: ${PALETTE.warmGrey}; }
  .rn-end .rn-pskills { display: flex; flex-wrap: wrap; gap: 3px 11px; min-width: 0; }
  .rn-end .rn-chip {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 16px; color: ${PALETTE.bone}; white-space: nowrap;
  }
  .rn-end .rn-chip svg { flex: 0 0 auto; color: ${PALETTE.parchment}; }
  .rn-end .rn-chip.rn-none { color: ${PALETTE.warmGrey}; }
  .rn-end .rn-pnodes, .rn-end .rn-ppurse {
    font-size: 16px; color: ${PALETTE.bone}; white-space: nowrap; text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .rn-end .rn-pnodes b { font-size: 20px; color: ${PALETTE.parchment}; }
  .rn-end .rn-ppurse { display: inline-flex; align-items: center; justify-content: flex-end; gap: 5px; }
  .rn-end .rn-ppurse b { font-size: 20px; color: ${PALETTE.paleGold}; }
  .rn-end .rn-ppurse svg { color: ${PALETTE.paleGold}; }
  #run-screen.rn-compact .rn-end .rn-party { margin-top: 8px; row-gap: 3px; }
  #run-screen.rn-compact .rn-end .rn-prow { padding: 3px 12px 3px 8px; }
  #run-screen.rn-compact .rn-end .rn-summary { row-gap: 3px; }
  #run-screen.rn-compact .rn-end .rn-buttons { margin-top: 12px; }
  .rn-end .rn-endfoot { display: flex; flex-direction: column; align-items: center; }
  /* Short windows (< 860 px tall: 1024x640 .. 1366x768) reflow like the
     party page does: the ornament gives way, the key hint sits beside the
     button, the rows tighten — so the card still clears the corner plates. */
  #run-screen.rn-short .rn-end .rn-orn { display: none; }
  #run-screen.rn-short .rn-end .rn-sub { margin-top: 2px; }
  #run-screen.rn-short .rn-end .rn-endfoot { flex-direction: row; gap: 20px; margin-top: 10px; }
  #run-screen.rn-short .rn-end .rn-endfoot .rn-buttons,
  #run-screen.rn-short .rn-end .rn-endfoot .rn-hint { margin-top: 0; }
  #run-screen.rn-short .rn-end .rn-party { margin-top: 6px; row-gap: 3px; }
  #run-screen.rn-short .rn-end .rn-prow { padding: 2px 12px 2px 8px; }
  #run-screen.rn-short .rn-end .rn-pface { width: 28px; height: 28px; flex-basis: 28px; }
  @media (max-width: 1199px) {
    .rn-end .rn-pskills { column-gap: 8px; }
    .rn-end .rn-chip + .rn-chip::before { content: '·'; margin-right: 8px; color: ${PALETTE.warmGrey}; }
  }
`;

const faceHtml = (classId) => {
  const src = portraitCache()[classId];
  return src ? `<img alt="" src="${src}" width="30" height="30">` : esc((CLASS_NAME[classId] || '?')[0]);
};

// One row per character: [portrait · class (· owner)] [skill chips] [n / 32 nodes] [purse].
function partyHtml(builds) {
  let owners = ['', '', '', ''];
  try {
    owners = netOwners();
  } catch {
    /* outside a session: no owner labels */
  }
  const rows = builds
    .map((b) => {
      const classId = b.classId || CLASS_OF_SEAT[b.seat] || 'healer';
      const skills = (b.skills || []).filter(Boolean);
      const chips = skills.length
        ? skills
            .map((id) => `<span class="rn-chip" data-skill="${esc(id)}">${hasIcon(id) ? iconHtml(id, { size: 20 }) : ''}${esc(SKILLS[id] ? SKILLS[id].name : id)}</span>`)
            .join('')
        : '<span class="rn-chip rn-none">no skills</span>';
      // (a network session names who played each character, under the class)
      const own = owners[b.seat] ? `<span class="rn-pown">${esc(owners[b.seat])}</span>` : '';
      return `<div class="rn-prow" data-seat="${b.seat}">
        <div class="rn-pwho"><span class="rn-pface">${faceHtml(classId)}</span><span class="rn-pid"><span class="rn-pname">${esc(CLASS_NAME[classId] ?? classId)}</span>${own}</span></div>
        <div class="rn-pskills">${chips}</div>
        <div class="rn-pnodes"><b>${b.filled ?? 0}</b> / ${b.sockets ?? 32} nodes</div>
        <div class="rn-ppurse">${iconHtml('coin', { size: 18 })}<b>${b.purse ?? 0}</b></div>
      </div>`;
    })
    .join('');
  return `<div class="rn-party-head">THE PARTY</div>${rows}`;
}

export function createEndScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-end';
  el.innerHTML = `
    <div class="rn-title rn-headline">VICTORY</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-sub rn-flavour"></div>
    <div class="rn-summary"></div>
    <div class="rn-party" style="display:none"></div>
    <div class="rn-endfoot">
      <div class="rn-buttons">
        <div class="rn-btn rn-camp rn-primary rn-focus">Return to Camp</div>
      </div>
      <div class="rn-hint"><b>Enter</b> return to camp</div>
    </div>`;

  const headline = el.querySelector('.rn-headline');
  const flavour = el.querySelector('.rn-flavour');
  const summaryEl = el.querySelector('.rn-summary');
  const partyEl = el.querySelector('.rn-party');
  const hintEl = el.querySelector('.rn-hint');
  el.querySelector('.rn-camp').addEventListener('click', () => run().returnToCamp());

  function row(k, v) {
    return `<div class="rn-k">${esc(k)}</div><div class="rn-v">${esc(v)}</div>`;
  }

  function render(view) {
    const s = view.summary;
    const win = view.phase === 'victory';
    // CAMPAIGN (PLAN §12.6): a campaign's end card speaks for the whole
    // campaign; CAMPAIGN COMPLETE returns to camp by itself (sim time).
    const camp = s && s.campaign && s.campaign.mode === 'campaign' ? s.campaign : null;
    const complete = !!(camp && camp.complete);
    headline.textContent = win ? (complete ? 'CAMPAIGN COMPLETE' : 'VICTORY') : camp ? 'THE CAMPAIGN ENDS' : 'THE RUN ENDS';
    flavour.textContent = win
      ? complete
        ? 'The last of the old beasts falls. Every level is clear — the long night is over.'
        : WIN_FLAVOUR[view.act] ?? WIN_FLAVOUR[1]
      : 'The gods applaud.';
    {
      const c = run().campaign ? run().campaign() : null;
      const secs = c && c.autoReturnInTicks !== null && c.autoReturnInTicks !== undefined ? Math.ceil(c.autoReturnInTicks / 60) : null;
      hintEl.innerHTML = secs !== null && win ? `Returning to camp in ${secs} s &nbsp;·&nbsp; <b>Enter</b> return now` : '<b>Enter</b> return to camp';
    }
    if (!s) {
      summaryEl.innerHTML = '';
      partyEl.style.display = 'none';
      return;
    }
    // @gnt:M2 NEW-BEST begin — "New best" line + score rank (profile, §3.4).
    // The save service recorded this run at run_end (score formula §3.4);
    // the card shows the score, its high-score rank and a New best flag.
    let scoreRow = '';
    {
      const sv = service('save');
      const rec = sv && typeof sv.lastRecord === 'function' ? sv.lastRecord() : null;
      // (CAMPAIGN: matched by seed + length — a campaign's rooms span levels.)
      const same = rec && rec.summary && rec.summary.seed === s.seed && Math.round(rec.summary.timeSec * 60) === s.ticks;
      if (same) {
        const tail = rec.newBest ? ' · New best!' : rec.rank ? ` · #${rec.rank} on your records` : '';
        scoreRow = row('SCORE', `${rec.score.toLocaleString()}${tail}`);
      }
    }
    // @gnt:M2 NEW-BEST end
    // fix-INT-r5 (J5-F2): SCORE is the card's hero line across the top of the
    // stats; the rest read as key / value PAIRS, two per row (the second
    // key of a row is indented from the first pair's value).
    const pairs = [];
    let rooms = [`${s.rooms} / 8`];
    if (camp) {
      const span = CAMPAIGN_LEVELS.filter((l) => l >= camp.startLevel);
      const n = (camp.levels || []).reduce((acc, l) => acc + (l.rooms || 0), 0);
      pairs.push(['LEVELS CLEARED', `${camp.levelsCleared} / ${span.length}`]);
      pairs.push([complete ? 'FINAL LEVEL' : 'FURTHEST LEVEL', `${ROMAN[camp.level] ?? camp.level} · ${levelFor(camp.level).name}`]);
      rooms = [`${n} / ${8 * (camp.levels || []).length}`];
    }
    // PARTY (BUILD_BRIEF §25.9 "the end card shows the four builds"): the
    // skill / node totals are the whole party's — the sums of the table below
    // (the Healer's own when an old summary carries no builds).
    const builds = Array.isArray(s.builds) && s.builds.length ? s.builds : null;
    const skillsHeld = builds ? builds.reduce((n, b) => n + (b.skills || []).filter(Boolean).length, 0) : s.skills.length;
    const nodesHeld = builds
      ? builds.reduce((n, b) => n + (b.filled || 0) + (Number.isFinite(b.bench) ? b.bench : 0), 0)
      : s.nodes.bench.length + s.nodes.socketed.length;
    pairs.push(['ROOMS CLEARED', rooms[0]], ['GLINT EARNED', String(s.glint)]);
    pairs.push(['SKILLS CARRIED', String(skillsHeld)], ['NODES HELD', String(nodesHeld)]);
    pairs.push(['RUN SEED', String(s.seed ?? '—')], [camp ? 'CAMPAIGN LENGTH' : 'RUN LENGTH', `${Math.round(s.ticks / 60)} s`]);
    summaryEl.innerHTML =
      (scoreRow ? `<div class="rn-hero">${scoreRow}</div>` : '') +
      pairs.map(([k, v], i) => (i % 2 ? row(k, v).replace('class="rn-k"', 'class="rn-k rn-k2"') : row(k, v))).join('');
    // The party table (a fallback Healer row for a summary without builds).
    const rowsOf = builds || [{ seat: 0, classId: 'healer', skills: s.skills, filled: s.nodes.socketed.length, sockets: s.skills.length * 8, bench: s.nodes.bench.length, purse: s.glint }];
    partyEl.style.display = '';
    partyEl.innerHTML = partyHtml(rowsOf);
  }

  function key(code, fresh) {
    // Esc is the pause key on every page (PLAN §1.5, ruling A13) — the end
    // card no longer treats it as "return to camp".
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (!fresh) return true;
      run().returnToCamp();
      return true;
    }
    return false;
  }

  return { el, render, key, name: 'end' };
}
