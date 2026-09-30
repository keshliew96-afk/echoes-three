// In-game network HUD (docs/gauntlet/PLAN.md §3.7 UI states; z band 60–79,
// CSS prefix nt-). Owner: M5b.
//
//   - a connection chip (bottom-left, clear of the command bar and the room
//     banner): role, room code, players, then the LINK part — signal bars
//     (3 good / 2 fair / 1 poor, from net.stats().quality), ping, and the
//     packet loss whenever it is >= 1 % (NET-F2, fix-M5a-r1); a poor link
//     turns the bars and figures Hearth Amber with a "!" badge, and a note
//     says why ("Unstable connection — 12% packet loss") at most every 15 s.
//     Amber dot online, grey reconnecting;
//   - a centre banner for the states a player must understand at once:
//     "Joining ABCDE…" until the first snapshot, "Connection lost —
//     reconnecting (15 s)" with a live countdown (then the title + Rejoin),
//     "Host connection lost — waiting (10 s)" with a live countdown;
//   - short notes (seat changes, pings, rejections) stacked under the chip;
//   - optional detail line (net.showStats): rtt / loss / snapshot rate.
// Void Charcoal plates, Parchment ink, Hearth Amber accents; never Ember
// (danger), never violet (corruption), never Heal green (§19.1 bands).
import { PALETTE as P } from '../../data/palette.js';
import { seatLabel } from '../../net/seats.js';
import { service } from '../../app/registry.js';
import { QUALITY_THRESHOLDS } from '../../net/transport.js';

const CSS = `
#nt-hud { position: fixed; inset: 0; pointer-events: none; z-index: 64; font-family: "Nunito", "Trebuchet MS", system-ui, sans-serif; }
#nt-hud.nt-off { display: none; }
.nt-chip { position: absolute; left: 14px; bottom: 44px; display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 10px;
  background: ${P.voidCharcoal}E6; color: ${P.parchment}; border: 1px solid ${P.warmGrey}66; border-radius: 10px;
  font-size: 15px; font-weight: 700; letter-spacing: 0.02em; box-shadow: 0 2px 10px #0006; }
.nt-dot { width: 9px; height: 9px; border-radius: 50%; background: ${P.hearthAmber}; box-shadow: 0 0 6px ${P.hearthAmber}AA; }
.nt-chip.nt-warn .nt-dot { background: ${P.bone}; box-shadow: none; animation: nt-blink 0.9s steps(2) infinite; }
.nt-chip .nt-sub { color: ${P.bone}; font-weight: 600; }
.nt-chip .nt-short { display: none; color: ${P.bone}; font-weight: 600; }
.nt-chip.nt-compact { gap: 7px; padding: 2px 10px 2px 9px; }
.nt-chip.nt-compact .nt-main, .nt-chip.nt-compact .nt-sub { display: none; }
.nt-chip.nt-compact .nt-short { display: inline; }
.nt-chip.nt-aside, .nt-detail.nt-aside, .nt-notes.nt-aside { display: none !important; }
.nt-link { display: inline-flex; align-items: center; gap: 6px; color: ${P.bone}; font-weight: 600; font-variant-numeric: tabular-nums; }
.nt-link.nt-off { display: none; }
.nt-q { position: relative; display: inline-flex; align-items: flex-end; gap: 2px; height: 13px; }
.nt-q i { display: block; width: 4px; border-radius: 1px; background: ${P.warmGrey}55; }
.nt-q i:nth-child(1) { height: 5px; } .nt-q i:nth-child(2) { height: 9px; } .nt-q i:nth-child(3) { height: 13px; }
.nt-q[data-level="good"] i { background: ${P.parchment}; }
.nt-q[data-level="fair"] i:nth-child(-n+2) { background: ${P.hearthAmber}; }
.nt-q[data-level="poor"] i:nth-child(1) { background: ${P.hearthAmber}; }
.nt-q .nt-bang { display: none; position: absolute; right: -9px; top: -6px; width: 13px; height: 13px; border-radius: 50%;
  background: ${P.hearthAmber}; color: ${P.voidCharcoal}; font-size: 11px; font-weight: 900; line-height: 13px; text-align: center; font-style: normal; }
.nt-q[data-level="poor"] .nt-bang { display: block; }
.nt-q[data-level="poor"] { margin-right: 7px; }
.nt-chip.nt-fair .nt-lt { color: ${P.parchment}; }
.nt-chip.nt-poor { border-color: ${P.hearthAmber}CC; }
.nt-chip.nt-poor .nt-lt { color: ${P.hearthAmber}; }
.nt-detail { position: absolute; left: 14px; bottom: 14px; padding: 3px 10px; font-size: 13px; color: ${P.bone};
  background: ${P.voidCharcoal}CC; border-radius: 8px; font-variant-numeric: tabular-nums; }
.nt-notes { position: absolute; left: 14px; bottom: 92px; display: flex; flex-direction: column-reverse; gap: 6px; max-width: min(420px, 28vw); }
.nt-note { padding: 6px 12px; font-size: 15px; color: ${P.parchment}; background: ${P.voidCharcoal}E0; border-left: 3px solid ${P.hearthAmber};
  border-radius: 6px; transition: opacity 0.4s; }
.nt-note.nt-fade { opacity: 0; }
#nt-hud .nt-note.nt-wait { display: none !important; }
.nt-notes.nt-row { flex-direction: row; align-items: center; }
.nt-notes.nt-row > :not(:last-child) { display: none; }
.nt-notes.nt-row > * { min-width: 0; max-width: 100%; padding-top: 2px; padding-bottom: 2px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nt-notes.nt-row2 > :last-child { white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.nt-pingnote { padding: 6px 12px; font-size: 15px; font-weight: 700; color: ${P.voidCharcoal}; background: ${P.hearthAmber}; border-radius: 10px; }
.nt-banner { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); min-width: 320px; max-width: 80vw; padding: 16px 26px;
  text-align: center; color: ${P.parchment}; background: ${P.voidCharcoal}F0; border: 1px solid ${P.warmGrey}88; border-radius: 14px;
  box-shadow: 0 6px 24px #000A; }
.nt-banner.nt-off { display: none; }
.nt-banner .nt-bt { font-size: 22px; font-weight: 800; letter-spacing: 0.03em; }
.nt-banner .nt-bs { margin-top: 6px; font-size: 16px; color: ${P.bone}; }
@keyframes nt-blink { 50% { opacity: 0.25; } }
`;

export function createNetHud({ app, settings, api, nameOfSeat = () => null }) {
  if (!document.getElementById('nt-hud-style')) {
    const s = document.createElement('style');
    s.id = 'nt-hud-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const root = document.createElement('div');
  root.id = 'nt-hud';
  root.className = 'nt-off';
  root.innerHTML = `
    <div class="nt-chip"><span class="nt-dot"></span><span class="nt-main"></span><span class="nt-sub"></span><span class="nt-short"></span><span class="nt-link nt-off"><span class="nt-q" data-level="good"><i></i><i></i><i></i><b class="nt-bang">!</b></span><span class="nt-lt"></span></span></div>
    <div class="nt-detail" style="display:none"></div>
    <div class="nt-notes"></div>
    <div class="nt-banner nt-off"><div class="nt-bt"></div><div class="nt-bs"></div></div>`;
  document.body.appendChild(root);
  const chip = root.querySelector('.nt-chip');
  const main = root.querySelector('.nt-main');
  const sub = root.querySelector('.nt-sub');
  const shortEl = root.querySelector('.nt-short');
  const linkEl = root.querySelector('.nt-link');
  const qEl = root.querySelector('.nt-q');
  const ltEl = root.querySelector('.nt-lt');
  const detail = root.querySelector('.nt-detail');
  const notes = root.querySelector('.nt-notes');
  const banner = root.querySelector('.nt-banner');
  const bt = root.querySelector('.nt-bt');
  const bs = root.querySelector('.nt-bs');
  // The ping line ("Fox points at card 2") lives in the notes column, so it
  // docks with the notes (it sat top-right, over the HUD's Glint plate, on
  // every page it pinged); in the DOM only while it shows.
  const pingEl = document.createElement('div');
  pingEl.className = 'nt-pingnote';
  // The chip sits just ABOVE the command bar (whose height grows with the
  // viewport): at 1024x576 a fixed bottom offset put it on top of the
  // portraits. Re-measured on resize and while the HUD is visible.
  //
  // fix-M5a-r5 (NET5-F1 family, 2026-09-30): a modal build page — the run
  // pages (party reward page, shop, doors, level card) and the socket
  // screen — owns the middle of the screen, and the chip (z 64) drew over
  // its text: the socket screen's node detail at every size, the shop's
  // hint / Done button up to 1280x720, the party page's hint at 1024x576.
  // While one is open the chip DOCKS where it covers none of the page: its
  // usual place when that is clear, else the command bar's row left of the
  // bar (the run pages keep the bar), else the band under the page (the
  // socket screen covers the bar) — full, or compact (dot · players · link
  // bars · ping) when only that fits; where neither fits it steps aside
  // until the page closes (the connection banners and notes still show).
  // Re-placed at 5 Hz while shown, so a page opening or closing re-docks it.
  const visible = (e) => {
    if (!e) return false;
    const cs = getComputedStyle(e);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  function modalPage() {
    const sock = document.getElementById('socket-screen');
    if (visible(sock)) {
      const pg = sock.querySelector('.nd-page');
      const r = pg ? pg.getBoundingClientRect() : null;
      if (r && r.width > 0 && r.height > 0) return { r, keepsBar: false };
    }
    const run = document.getElementById('run-screen');
    if (run && run.classList.contains('rn-open') && visible(run)) {
      for (const pg of run.querySelectorAll('.rn-page')) {
        if (!visible(pg)) continue;
        const r = pg.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return { r, keepsBar: true };
      }
    }
    return null;
  }
  const PAD = 6;
  const hits = (x0, y0, x1, y1, r) => !!r && x0 < r.right + PAD && x1 > r.left - PAD && y0 < r.bottom + PAD && y1 > r.top - PAD;
  let dock = 'free';
  let placeSig = '';
  // What the last docking saw, for the notes column (placeNotes).
  let lastModal = null;
  let lastBar = null;
  let notesBase = { b: 92, chip: null };
  function placeChip() {
    const H = window.innerHeight;
    const bar = document.querySelector('.hud-bar');
    let barR = null;
    let bottom = 44;
    if (bar) {
      const r = bar.getBoundingClientRect();
      if (r.height > 0) {
        barR = r;
        bottom = Math.max(14, Math.round(H - r.top + 10));
      }
    }
    const m = root.classList.contains('nt-off') ? null : modalPage();
    // Nothing moved (page, bar, window, chip text, detail line): keep the
    // placement — the 10 Hz check then costs a few rect reads, no reflow.
    const q = (r) => (r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}` : '-');
    const sig = `${window.innerWidth}x${H}|${q(barR)}|${m ? q(m.r) : 'none'}|${main.textContent}|${sub.textContent}|${ltEl.textContent}|${detail.style.display}`;
    if (sig !== placeSig) {
      placeSig = sig;
      lastModal = m;
      lastBar = barR;
      dockChip(H, m, barR, bottom);
    }
    placeNotes();
  }
  function dockChip(H, m, barR, bottom) {
    chip.classList.remove('nt-aside');
    detail.classList.remove('nt-aside');
    // Bottom-left column, stacked upward from the chip: the optional detail
    // line (only where it covers no page), then the notes.
    const put = (b, where, compact) => {
      dock = where;
      chip.classList.toggle('nt-compact', compact);
      chip.style.bottom = `${Math.round(b)}px`;
      const ch = chip.offsetHeight || 32;
      const top = H - b - ch;
      if (m && hits(14, top - 30, 374, top - 4, m.r)) detail.classList.add('nt-aside');
      detail.style.bottom = `${Math.round(b + ch + 4)}px`;
      const detailOn = detail.style.display !== 'none' && !detail.classList.contains('nt-aside');
      notesBase = { b: Math.round(b + ch + (detailOn ? 36 : 8)), chip: { x0: 14, y0: top, x1: 14 + chip.offsetWidth, y1: H - b, b: Math.round(b), h: ch } };
    };
    if (!m) {
      put(bottom, 'free', false);
      return;
    }
    const L = 14;
    for (const compact of [false, true]) {
      chip.classList.toggle('nt-compact', compact);
      const w = chip.offsetWidth;
      const h = chip.offsetHeight;
      // 1. its usual place, above the command bar
      if (!hits(L, H - bottom - h, L + w, H - bottom, m.r)) return put(bottom, 'above-bar', compact);
      // 2. the command bar's row, left of the bar
      if (barR && m.keepsBar) {
        const y0 = barR.top + (barR.height - h) / 2;
        if (L + w <= barR.left - 8 && y0 >= 0 && y0 + h <= H && !hits(L, y0, L + w, y0 + h, m.r)) return put(H - y0 - h, 'bar-row', compact);
      }
      // 3. the band under the page
      const band = H - m.r.bottom;
      if (band >= h + 4) {
        const y0 = m.r.bottom + (band - h) / 2;
        if (!(m.keepsBar && barR && hits(L, y0, L + w, y0 + h, barR))) return put(H - y0 - h, 'under-page', compact);
      }
    }
    // 4. no room anywhere: step aside while the page is open
    put(bottom, 'aside', false);
    chip.classList.add('nt-aside');
    detail.classList.add('nt-aside');
    notesBase = { b: notesBase.b, chip: null };
  }
  // fix-M5a-r5 (the NET5-F1 family, 2026-09-30): the notes column ("No
  // updates from the host…", "Not applied (…)", "Fox reconnecting…") and the
  // ping line stacked above the chip wherever it docked — over the socket
  // screen's footer keys at 1920x1080 once the chip sat in the band under
  // the page. While a modal page is open the column docks too, in order:
  //   stack — its usual place above the chip, when that covers none of it;
  //   side  — the same stack narrowed into the margin left of the page (>= 200 px);
  //   row   — ONE line beside the chip, in the chip's docked row (the newest
  //           message, ellipsis, full text in the tooltip; >= 180 px);
  //   held  — no room at all (the socket screen filling a 16:9 window): new
  //           messages wait, and show — with their full lifetime — as soon as
  //           there is room (page closed / window grown); a message that
  //           waited NOTE_HOLD_MS is dropped as stale; a ping is not kept (the
  //           pinged card's outline already shows it).
  // The connection banners (reconnecting / host lost) still overlay: the
  // game is frozen or about to hand over and the page cannot be used.
  const NOTE_HOLD_MS = 15000;
  const ROW_H = 22; // one message line: 15 px type, line-height 1.2, 2 px padding
  const ROW2_H = 44; // two lines
  let notesMode = 'stack';
  let notesSig = '';
  let notesRev = 0; // bumped on every message in / out (identical texts too)
  function placeNotes(force = false) {
    const now = performance.now();
    for (const n of [...notes.querySelectorAll('.nt-wait')]) {
      if (now - Number(n.dataset.at || now) > NOTE_HOLD_MS) {
        n.remove();
        notesRev += 1;
      }
    }
    const m = lastModal;
    const sig = `${placeSig}|${notesRev}|${notes.children.length}`;
    if (!force && sig === notesSig) return;
    notesSig = sig;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const base = notesBase;
    const waiting = [...notes.querySelectorAll('.nt-wait')];
    const reset = () => {
      notes.classList.remove('nt-row', 'nt-row2', 'nt-aside');
      notes.style.left = '14px';
      notes.style.maxWidth = '';
      notes.style.height = '';
      notes.style.bottom = `${base.b}px`;
    };
    const release = (mode) => {
      notesMode = mode;
      for (const n of waiting) {
        n.classList.remove('nt-wait');
        armNote(n);
      }
    };
    reset();
    // Nothing to show, or no page to keep clear: the usual stack.
    if (!m || !notes.children.length) return release('stack');
    // Measure with the waiting messages laid out (same frame, never painted).
    for (const n of waiting) n.classList.remove('nt-wait');
    // Clear of the page AND of the command bar (a stack above a chip docked
    // in the bar's row reaches over the bar's portraits at 1024x576).
    const clearOf = (pad) => {
      const r = notes.getBoundingClientRect();
      const hit = (o) => !!o && r.left < o.right + pad && r.right > o.left - pad && r.top < o.bottom + pad && r.bottom > o.top - pad;
      return r.top >= 0 && r.bottom <= H && r.right <= W && !hit(m.r) && !hit(lastBar);
    };
    let mode = null;
    if (clearOf(PAD)) mode = 'stack';
    const margin = Math.floor(m.r.left - PAD - 2 - 14);
    if (!mode && margin >= 200) {
      notes.style.maxWidth = `${margin}px`;
      if (clearOf(PAD)) mode = 'side';
      else notes.style.maxWidth = '';
    }
    if (!mode) {
      // A message row in a free slot: beside the docked chip, just above it,
      // or the band under the page (its top 44 px, or all of it) — the
      // widest gap between the page, the bar, the chip and the corner labels
      // (version / fps) on that slot; two lines where the slot is >= 44 px
      // tall. The slot with the most room (width x lines) wins.
      const c = base.chip;
      const slots = [];
      if (c) slots.push({ y0: c.y0, h: c.h }, { y0: c.y0 - 6 - ROW_H, h: ROW_H });
      const band = H - m.r.bottom;
      if (band >= ROW_H + 8) {
        slots.push({ y0: m.r.bottom + 4, h: Math.min(ROW2_H, band - 8) });
        if (band - 8 > ROW2_H) slots.push({ y0: m.r.bottom + 4, h: band - 8 });
      }
      const obstacles = [m.r, lastBar, c ? { left: c.x0, right: c.x1, top: c.y0, bottom: c.y1 } : null];
      for (const id of ['version-label', 'fps-meter']) {
        const e = document.getElementById(id);
        if (e && getComputedStyle(e).display !== 'none') obstacles.push(e.getBoundingClientRect());
      }
      let best = null;
      for (const s of slots) {
        if (s.y0 < 0 || s.y0 + s.h > H) continue;
        let gaps = [[14, W - 14]];
        for (const o of obstacles) {
          if (!o || !(o.top < s.y0 + s.h + 1 && o.bottom > s.y0 - 1)) continue;
          const a = o.left - 8;
          const b = o.right + 8;
          gaps = gaps.flatMap(([g0, g1]) => (b <= g0 || a >= g1 ? [[g0, g1]] : [[g0, Math.min(g1, a)], [Math.max(g0, b), g1]].filter(([p, q]) => q - p > 0)));
        }
        const g = gaps.reduce((w, x) => (!w || x[1] - x[0] > w[1] - w[0] ? x : w), null);
        if (!g || g[1] - g[0] < 180) continue;
        const lines = s.h >= ROW2_H ? 2 : 1;
        const room = (g[1] - g[0]) * lines;
        if (best && room <= best.room) continue;
        notes.classList.add('nt-row');
        notes.classList.toggle('nt-row2', lines === 2);
        notes.style.left = `${Math.round(g[0])}px`;
        notes.style.maxWidth = `${Math.floor(g[1] - g[0])}px`;
        notes.style.bottom = `${Math.round(H - s.y0 - s.h)}px`;
        notes.style.height = `${s.h}px`;
        if (clearOf(1)) best = { room, lines, left: notes.style.left, maxWidth: notes.style.maxWidth, bottom: notes.style.bottom, height: notes.style.height };
      }
      reset();
      if (best) {
        notes.classList.add('nt-row');
        notes.classList.toggle('nt-row2', best.lines === 2);
        Object.assign(notes.style, { left: best.left, maxWidth: best.maxWidth, bottom: best.bottom, height: best.height });
        mode = 'row';
      }
    }
    if (mode) return release(mode);
    // No room anywhere: hold what has not shown yet, hide what has.
    for (const n of waiting) n.classList.add('nt-wait');
    notes.classList.add('nt-aside');
    notesMode = 'held';
    if (pingEl.parentNode) {
      pingEl.remove();
      notesRev += 1;
    }
  }
  window.addEventListener('resize', () => placeChip());
  let placeTimer = 0;
  let synced = false;
  // A join that has waited this long for the host's first snapshot says so
  // and names the way out (NET4-F1, fix-M5a-r4: the banner read "Receiving
  // the world from the host" for as long as the host never sent it).
  const JOIN_SLOW_MS = 8000;
  let joiningSince = 0;
  function joinBanner(code) {
    // A hidden guest takes its seat back (and the world with it) only when
    // shown: time spent hidden is not a slow host.
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (hidden) joiningSince = 0;
    else if (!joiningSince) joiningSince = performance.now();
    if (!hidden && performance.now() - joiningSince >= JOIN_SLOW_MS) setBanner(`Still joining ${code || ''}…`, "The host's game hasn't sent the world yet. Keep waiting, or leave with Esc → Leave Session.");
    else setBanner(`Joining ${code || ''}…`, 'Receiving the world from the host');
  }
  let lostUntil = 0;
  let reconnectUntil = 0;
  let timer = 0;
  let last = null;
  let pingTimer = 0;

  // ---- link quality (NET-F2): read once a second while the chip shows.
  const REASON_NOTE_MS = 15000;
  const SEAT_NOTE_MS = 30000;
  const seatNoteAt = new Map();
  const seatStreak = new Map(); // seat -> consecutive 1 s reads at poor loss
  let linkTimer = 0;
  let linkLevel = null;
  let lastReasonNoteAt = -Infinity;
  let lastReason = null;
  const REASON_REPEAT_MS = 45000;
  let lastLink = null;
  const lossText = (v) => `${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}%`;
  function readLink() {
    const net = service('net');
    if (!net || typeof net.stats !== 'function') return null;
    try {
      return net.stats();
    } catch {
      return null;
    }
  }
  function refreshLink() {
    const s = readLink();
    const q = s && s.quality ? s.quality : null;
    const rtt = s && Number.isFinite(s.rttMs) ? Math.round(s.rttMs) : last && Number.isFinite(last.rttMs) ? Math.round(last.rttMs) : null;
    // The loss the quality judged (a guest: the worse direction; a host: its
    // own link = the loss every guest's inputs share), else lossPct.
    const loss = q && Number.isFinite(q.lossPct) ? q.lossPct : s && Number.isFinite(s.lossPct) ? s.lossPct : 0;
    const stalled = !!(q && q.reasons.includes('stalled'));
    const parts = [];
    if (stalled) parts.push('no updates');
    else if (rtt !== null) parts.push(`${rtt} ms`);
    // No quality = no live link (reconnecting): a stale loss figure would
    // contradict the reconnect banner, so only the last ping stays.
    if (!stalled && q && loss >= 1) parts.push(`${lossText(loss)} loss`);
    ltEl.textContent = parts.join(' · ');
    const level = q ? q.level : null;
    linkEl.classList.toggle('nt-off', !level && !parts.length);
    qEl.setAttribute('data-level', level || 'good');
    qEl.style.visibility = level ? '' : 'hidden';
    chip.classList.toggle('nt-fair', level === 'fair');
    chip.classList.toggle('nt-poor', level === 'poor');
    const inP = s && Number.isFinite(s.lossInPct) ? s.lossInPct : null;
    const outP = s && Number.isFinite(s.lossOutPct) ? s.lossOutPct : null;
    let label = '';
    if (level) {
      label = `Connection ${level}`;
      if (rtt !== null) label += `, ping ${rtt} ms`;
      if (inP !== null || outP !== null) label += `, packet loss${inP !== null ? ` in ${lossText(inP)}` : ''}${outP !== null ? ` out ${lossText(outP)}` : ''}`;
      if (stalled) label += ', no updates from the host';
    }
    chip.setAttribute('title', label);
    chip.setAttribute('aria-label', `${main.textContent} ${sub.textContent} ${label}`.trim());
    // Say WHY once when the link turns poor (not on every flap): at most one
    // note per 15 s, and the SAME reason again only after 45 s (a link that
    // sits on a threshold flips fair/poor without repeating itself).
    if (level === 'poor' && linkLevel !== 'poor' && !(last && (last.reconnecting || last.hostLost))) {
      const t = performance.now();
      const why = q.reasons[0];
      if (t - lastReasonNoteAt >= (why === lastReason ? REASON_REPEAT_MS : REASON_NOTE_MS)) {
        lastReasonNoteAt = t;
        lastReason = why;
        let text = 'Unstable connection — high jitter';
        if (why === 'stalled') text = 'No updates from the host — the world may freeze for a moment';
        // The figures that EARNED the level (a held level keeps them).
        const c = q.cause || {};
        const cLoss = Number.isFinite(c.lossPct) ? c.lossPct : loss;
        const cRtt = Number.isFinite(c.rttMs) ? Math.round(c.rttMs) : rtt;
        if (why === 'loss') text = `Unstable connection — ${lossText(cLoss)} packet loss`;
        else if (why === 'latency') text = `High latency — ${cRtt} ms ping`;
        note(text);
      }
    }
    // Host: a guest whose inputs arrive badly (3 s running) while the others
    // are fine gets named once (every 30 s at most) — its own chip already
    // warns that player; the host learns why that seat may act late.
    if (last && last.role === 'host' && s && s.lossBySeat && typeof s.lossBySeat === 'object') {
      const t = performance.now();
      const ownPoor = loss >= QUALITY_THRESHOLDS.poor.lossPct;
      for (const [k, v] of Object.entries(s.lossBySeat)) {
        const seat = Number(k);
        const bad = !ownPoor && Number.isFinite(v) && v >= QUALITY_THRESHOLDS.poor.lossPct;
        const streak = bad ? (seatStreak.get(seat) || 0) + 1 : 0;
        seatStreak.set(seat, streak);
        if (streak < 3 || t - (seatNoteAt.get(seat) ?? -Infinity) < SEAT_NOTE_MS) continue;
        seatNoteAt.set(seat, t);
        note(`${nameOfSeat(seat) || seatLabel(seat)}'s connection is unstable — ${lossText(v)} packet loss`);
      }
    }
    // The optional detail line (Settings > Network > Connection details) can
    // be switched on mid-session: keep its 4 Hz ticker running while it is
    // on, and hide it at once when it goes off.
    if (settings.get('net.showStats')) {
      if (!timer) timer = setTimeout(tick, 0);
    } else detail.style.display = 'none';
    // A join still waiting for the host's world turns into the slow-join
    // banner on this 1 s read (update() is not called while nothing changes).
    if (last && last.role === 'guest' && !synced && !last.reconnecting && !last.hostLost) joinBanner(last.code);
    linkLevel = level;
    lastLink = { level, reasons: q ? q.reasons.slice() : [], rttMs: rtt, lossPct: loss, lossInPct: inP, lossOutPct: outP, lossBySeat: s && s.lossBySeat ? s.lossBySeat : null, text: ltEl.textContent };
  }
  function startLinkTimer() {
    if (linkTimer) return;
    refreshLink();
    linkTimer = setInterval(refreshLink, 1000);
  }
  function stopLinkTimer() {
    if (linkTimer) clearInterval(linkTimer);
    linkTimer = 0;
    linkLevel = null;
    lastLink = null;
    chip.classList.remove('nt-fair', 'nt-poor');
  }

  function setBanner(title, subText) {
    if (!title) {
      banner.classList.add('nt-off');
      return;
    }
    bt.textContent = title;
    bs.textContent = subText || '';
    banner.classList.remove('nt-off');
  }

  function update(st) {
    last = st;
    placeChip();
    const role = st.role === 'host' ? 'Hosting' : st.role === 'guest' ? `Online · ${seatLabel(st.seat ?? 0)}` : 'Online';
    main.textContent = role;
    const humans = st.seats.filter((s) => s.name && s.connected).length;
    sub.textContent = `${st.code ? `Room ${st.code} · ` : ''}${humans} player${humans === 1 ? '' : 's'}`;
    shortEl.textContent = `${humans} player${humans === 1 ? '' : 's'}`;
    refreshLink();
    chip.classList.toggle('nt-warn', !!(st.reconnecting || st.hostLost));
    if (st.reconnecting) {
      // A live countdown (the ticker below redraws it every 250 ms).
      reconnectUntil = Number.isFinite(st.reconnectLeftMs) ? performance.now() + st.reconnectLeftMs : 0;
      drawReconnect();
      if (!timer) timer = setTimeout(tick, 250);
      return;
    }
    reconnectUntil = 0;
    if (st.hostLost) {
      // Countdown drawn by the ticker below.
    } else if (st.role === 'guest' && !synced) joinBanner(st.code);
    else {
      if (synced) joiningSince = 0;
      setBanner(null);
    }
  }

  function drawReconnect() {
    const left = reconnectUntil ? Math.max(0, Math.ceil((reconnectUntil - performance.now()) / 1000)) : null;
    setBanner(left !== null ? `Connection lost — reconnecting (${left} s)` : 'Connection lost — reconnecting…', last && last.role === 'host' ? 'The game keeps running here; your party sees you as reconnecting.' : 'Your seat is held — the AI plays it until you are back.');
  }

  function tick() {
    timer = 0;
    if (reconnectUntil) drawReconnect();
    if (lostUntil) {
      const left = Math.max(0, Math.ceil((lostUntil - performance.now()) / 1000));
      if (left > 0) setBanner(`Host connection lost — waiting (${left} s)`, 'If the host does not come back, another player takes over and the run continues.');
      else setBanner('Host connection lost — handing over…', 'A new host is taking over the session.');
    }
    if (settings.get('net.showStats') && api && typeof api.statsLine === 'function') {
      detail.style.display = '';
      detail.textContent = api.statsLine();
    } else detail.style.display = 'none';
    if (lostUntil || reconnectUntil || (settings.get('net.showStats') && !root.classList.contains('nt-off'))) timer = setTimeout(tick, 250);
  }

  // A message's lifetime starts when it first SHOWS (placeNotes releases it):
  // one that arrives while a page leaves no room waits instead of timing out
  // unseen.
  function armNote(n) {
    const ms = Number(n.dataset.ms) || 3600;
    setTimeout(() => n.classList.add('nt-fade'), ms);
    setTimeout(() => {
      n.remove();
      notesRev += 1;
      placeNotes();
    }, ms + 450);
  }
  function note(text, ms = 3600) {
    const n = document.createElement('div');
    n.className = 'nt-note nt-wait';
    n.textContent = text;
    n.title = text;
    n.dataset.ms = String(ms);
    n.dataset.at = String(performance.now());
    notes.appendChild(n);
    const all = notes.querySelectorAll('.nt-note');
    for (let i = 0; i < all.length - 4; i++) all[i].remove();
    notesRev += 1;
    placeChip();
  }

  return {
    el: root,
    update,
    note,
    show(on) {
      root.classList.toggle('nt-off', !on);
      if (on) placeChip();
      if (on && !placeTimer) placeTimer = setInterval(placeChip, 100);
      if (!on && placeTimer) {
        clearInterval(placeTimer);
        placeTimer = 0;
      }
      if (on) startLinkTimer();
      else stopLinkTimer();
      if (!on) {
        synced = false;
        joiningSince = 0;
        lostUntil = 0;
        reconnectUntil = 0;
        setBanner(null);
      } else if (!timer) timer = setTimeout(tick, 250);
    },
    setSynced(on) {
      synced = !!on;
      if (last) update(last);
    },
    hostLost(graceMs) {
      lostUntil = performance.now() + graceMs;
      if (!timer) timer = setTimeout(tick, 0);
    },
    hostBack(who) {
      lostUntil = 0;
      setBanner(null);
      if (who) note(who === 'you' ? 'You are now the host' : `${who} is now hosting`);
      else note('The host is back');
    },
    ping(p, who) {
      pingEl.textContent = `${who} points at ${p.page === 'path' ? 'door' : p.page === 'shop' ? 'item' : 'card'} ${Number.isInteger(p.index) ? p.index + 1 : ''}`;
      pingEl.title = pingEl.textContent;
      notes.appendChild(pingEl);
      notesRev += 1;
      clearTimeout(pingTimer);
      pingTimer = setTimeout(() => {
        if (pingEl.parentNode) pingEl.remove();
        notesRev += 1;
        placeNotes();
      }, 1600);
      placeChip();
    },
    debug: () => ({ visible: !root.classList.contains('nt-off'), banner: banner.classList.contains('nt-off') ? null : bt.textContent, chip: `${main.textContent} ${sub.textContent} ${ltEl.textContent}`.trim(), link: lastLink, notes: [...notes.querySelectorAll('.nt-note:not(.nt-wait)')].map((n) => n.textContent), held: [...notes.querySelectorAll('.nt-wait')].map((n) => n.textContent), ping: pingEl.parentNode ? pingEl.textContent : null, notesMode, dock }),
    nameOfSeat,
    app,
  };
}
