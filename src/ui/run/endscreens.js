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
import { levelFor, bossNameOfRun } from '../../data/levels.js';
import { chorusLine, ENDING } from '../../data/story.js';
import { verseLine } from './transit.js';
import { t } from '../../i18n/index.js';

// Per-act victory line (matches ui/run/transit.js FLAVOUR).
const WIN_FLAVOUR = {
  1: () => t('The Hollow Stag falls. The wood breathes out.'),
  2: () => t('The Drowned Heron sinks. The water runs clear again.'),
  3: () => t('The Barrow Wyrm is still. The long night lifts.'),
  4: () => t('The Heart\'s warden falls. Below the Barrow, the old beat falters.'),
};
const BOSS_WIN_FLAVOUR = {
  thornmother: () => t('The Thornmother falls. The briars let the wood go.'),
  millwheel: () => t('The Millwheel shatters. The water runs clear again.'),
  lichram: () => t('The Lich Ram crumbles. The graves close; the long night lifts.'),
  // Act IV (docs/ACT_IV_BOSSES.md).
  cantor: () => t('The Hollow Cantor’s last note fades. The Heart falls quiet.'),
  colossus: () => t('The Geode Colossus shatters. Below the Barrow, the old beat falters.'),
};
import { CAMPAIGN_LEVELS } from '../../data/campaign.js';
import { PALETTE } from '../../data/palette.js';
import { CLASS_NAME } from '../../data/classes.js';
import { classOfSeat } from '../../data/lineup.js';
import { iconHtml, hasIcon } from '../hud/icons.js';
import { portraitCache } from '../hud/portraits.js';
import { netOwners, ownerLabel } from './partystrip.js';
// DAILY DESCENT (docs/DAILY.md): the day's place and the board's answer.
import { placeLine, dayLabel } from './daily.js';
import { clockOf } from '../../data/daily.js';

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
  return src ? `<img alt="" src="${src}" width="30" height="30">` : esc((CLASS_NAME[classId] ? t(CLASS_NAME[classId]) : '?')[0]);
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
      const classId = b.classId || classOfSeat(b.seat) || 'healer';
      const skills = (b.skills || []).filter(Boolean);
      const chips = skills.length
        ? skills
            .map((id) => `<span class="rn-chip" data-skill="${esc(id)}">${hasIcon(id) ? iconHtml(id, { size: 20 }) : ''}${esc(SKILLS[id] ? t(SKILLS[id].name) : id)}</span>`)
            .join('')
        : `<span class="rn-chip rn-none">${esc(t('no skills'))}</span>`;
      // (a network session names who played each character, under the class)
      const own = owners[b.seat] ? `<span class="rn-pown">${esc(ownerLabel(owners[b.seat]))}</span>` : '';
      return `<div class="rn-prow" data-seat="${b.seat}">
        <div class="rn-pwho"><span class="rn-pface">${faceHtml(classId)}</span><span class="rn-pid"><span class="rn-pname">${esc(CLASS_NAME[classId] ? t(CLASS_NAME[classId]) : classId)}</span>${own}</span></div>
        <div class="rn-pskills">${chips}</div>
        <div class="rn-pnodes">${t('<b>{filled}</b> / {sockets} nodes', { filled: b.filled ?? 0, sockets: b.sockets ?? 32 })}</div>
        <div class="rn-ppurse">${iconHtml('coin', { size: 18 })}<b>${b.purse ?? 0}</b></div>
      </div>`;
    })
    .join('');
  return `<div class="rn-party-head">${esc(t('THE PARTY'))}</div>${rows}`;
}

// THE HEARTH SONG (docs/STORY.md): the Chorus — the gods, an audience —
// picks its line by how the party fell; the run seed picks among the rest.
function chorus(view, s) {
  const line = chorusLine({
    bossRoom: !!(s && s.lastRoom === 8),
    room: s ? s.lastRoom : 0,
    level: view.act ?? 1,
    curses: s && s.curses ? (Array.isArray(s.curses) ? s.curses.length : Number(s.curses) || 0) : 0,
    seed: s && Number.isFinite(s.seed) ? s.seed : 0,
  });
  return t(line, { boss: t(bossNameOfRun(view)).replace(/^The /, 'the ') });
}

export function createEndScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-end';
  el.innerHTML = `
    <div class="rn-title rn-headline">${esc(t('VICTORY'))}</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-sub rn-flavour"></div>
    <div class="rn-verse"></div>
    <div class="rn-summary"></div>
    <div class="rn-party" style="display:none"></div>
    <div class="rn-endfoot">
      <div class="rn-buttons">
        <div class="rn-btn rn-camp rn-primary rn-focus">${esc(t('Return to Camp'))}</div>
      </div>
      <div class="rn-hint">${t('<b>Enter</b> return to camp')}</div>
    </div>`;

  const headline = el.querySelector('.rn-headline');
  const flavour = el.querySelector('.rn-flavour');
  const verseEl = el.querySelector('.rn-verse');
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
    // ENDLESS (docs/ENDLESS.md): a descent always ends in a fall; its card
    // leads with the depth reached and the profile's depth record.
    const deep = camp && camp.endless ? camp : null;
    const daily = camp && camp.daily ? camp.daily : null;
    dailySeen = dailyRev();
    headline.textContent = daily ? (daily.won ? t('THE DAILY DESCENT IS CLEARED') : t('THE DAILY DESCENT ENDS')) : deep ? t('THE DESCENT ENDS') : win ? (complete ? t('CAMPAIGN COMPLETE') : t('VICTORY')) : camp ? t('THE CAMPAIGN ENDS') : t('THE RUN ENDS');
    flavour.textContent = deep
      ? deep.won
        ? t('The campaign was won, and the party went on. The dark took them at Depth {depth}.', { depth: deep.depth })
        : t('The party fell at Depth {depth}, before the Heart. The gods applaud.', { depth: deep.depth })
      : win
      ? complete
        ? t('The last of the old beasts falls. Every level is clear — the long night is over.')
        : ((view.act === 4 ? null : BOSS_WIN_FLAVOUR[view.actBoss && view.actBoss.kind]) ?? WIN_FLAVOUR[view.act] ?? WIN_FLAVOUR[1])()
      : chorus(view, s);
    // THE HEARTH SONG (docs/STORY.md): a won level hands the bell its verse;
    // a complete campaign closes on the story's ending for its length.
    verseEl.textContent = deep || !win ? '' : complete ? `${verseLine(view.act)} ${t(CAMPAIGN_LEVELS.length >= 4 ? ENDING.heart.text : ENDING.barrow.text)}` : verseLine(view.act);
    {
      const c = run().campaign ? run().campaign() : null;
      const secs = c && c.autoReturnInTicks !== null && c.autoReturnInTicks !== undefined ? Math.ceil(c.autoReturnInTicks / 60) : null;
      hintEl.innerHTML = secs !== null && win ? t('Returning to camp in {secs} s &nbsp;·&nbsp; <b>Enter</b> return now', { secs }) : t('<b>Enter</b> return to camp');
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
        const score = rec.score.toLocaleString();
        scoreRow = row(t('SCORE'), rec.newBest ? t('{score} · New best!', { score }) : rec.rank ? t('{score} · #{rank} on your records', { score, rank: rec.rank }) : score);
      }
    }
    // @gnt:M2 NEW-BEST end
    // fix-INT-r5 (J5-F2): SCORE is the card's hero line across the top of the
    // stats; the rest read as key / value PAIRS, two per row (the second
    // key of a row is indented from the first pair's value).
    const pairs = [];
    let rooms = [`${s.rooms} / 8`];
    if (daily) {
      // The day's place first, then what the board made of it.
      const d = service('daily');
      const post = d ? d.last() : null;
      const mine = post && post.key === daily.key && post.ticks === s.ticks ? post : null;
      const board = !mine
        ? t('Not posted')
        : mine.state === 'posting'
        ? t('Posting to the board…')
        : mine.state === 'posted'
        ? mine.best
          ? t('#{rank} of {total} today · Your best today!', { rank: mine.rank, total: mine.total })
          : t('#{rank} of {total} today', { rank: mine.rank, total: mine.total })
        : t('Not posted: the server could not be reached');
      pairs.push([t('DAILY'), dayLabel(daily.key)], [t('BOARD'), board]);
      pairs.push([t('DEPTH REACHED'), `${placeLine(daily.depth, daily.won)} · ${clockOf(s.ticks)}`]);
    }
    if (deep) {
      const sv = service('save');
      const rec = sv && typeof sv.lastRecord === 'function' ? sv.lastRecord() : null;
      const e = rec && rec.endless && rec.summary && rec.summary.seed === s.seed ? rec.endless : null;
      const land = t(levelFor(deep.level).name);
      pairs.push([t('DEPTH REACHED'), e && e.newDepthRecord ? t('{depth} · {land} · New record!', { depth: deep.depth, land }) : `${deep.depth} · ${land}`]);
      pairs.push([t('DEEPEST EVER'), String(e ? Math.max(e.depth, e.prevBestDepth) : deep.depth)]);
      pairs.push([t('DEPTHS CLEARED'), String(deep.depthsCleared ?? deep.levelsCleared)]);
      pairs.push([t('CAMPAIGN'), deep.won ? t('won') : t('not won')]);
      const n = (camp.levels || []).reduce((acc, l) => acc + (l.rooms || 0), 0);
      rooms = [String(n)];
    } else if (camp) {
      const span = CAMPAIGN_LEVELS.filter((l) => l >= camp.startLevel);
      const n = (camp.levels || []).reduce((acc, l) => acc + (l.rooms || 0), 0);
      pairs.push([t('LEVELS CLEARED'), `${camp.levelsCleared} / ${span.length}`]);
      pairs.push([complete ? t('FINAL LEVEL') : t('FURTHEST LEVEL'), `${ROMAN[camp.level] ?? camp.level} · ${t(levelFor(camp.level).name)}`]);
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
    pairs.push([t('ROOMS CLEARED'), rooms[0]], [t('GLINT EARNED'), String(s.glint)]);
    pairs.push([t('SKILLS CARRIED'), String(skillsHeld)], [t('NODES HELD'), String(nodesHeld)]);
    pairs.push([t('RUN SEED'), String(s.seed ?? '—')], [deep ? t('DESCENT LENGTH') : camp ? t('CAMPAIGN LENGTH') : t('RUN LENGTH'), t('{secs} s', { secs: Math.round(s.ticks / 60) })]);
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

  // DAILY: repaint when the board answers the posted run.
  let dailySeen = -1;
  function dailyRev() {
    const d = service('daily');
    return d && typeof d.rev === 'function' ? d.rev() : 0;
  }
  const dirty = () => dailySeen !== -1 && dailyRev() !== dailySeen;

  return { el, render, key, dirty, name: 'end' };
}
