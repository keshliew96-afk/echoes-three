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
.nt-banner { position: absolute; left: 50%; top: 22%; transform: translateX(-50%); min-width: 320px; max-width: 80vw; padding: 16px 26px;
  text-align: center; color: ${P.parchment}; background: ${P.voidCharcoal}F0; border: 1px solid ${P.warmGrey}88; border-radius: 14px;
  box-shadow: 0 6px 24px #000A; }
.nt-banner.nt-off { display: none; }
.nt-banner .nt-bt { font-size: 22px; font-weight: 800; letter-spacing: 0.03em; }
.nt-banner .nt-bs { margin-top: 6px; font-size: 16px; color: ${P.bone}; }
.nt-ping { position: absolute; right: 18px; top: 12px; padding: 6px 12px; font-size: 15px; font-weight: 700; color: ${P.voidCharcoal};
  background: ${P.hearthAmber}; border-radius: 10px; opacity: 0; transition: opacity 0.25s; }
.nt-ping.nt-on { opacity: 1; }
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
    <div class="nt-chip"><span class="nt-dot"></span><span class="nt-main"></span><span class="nt-sub"></span><span class="nt-link nt-off"><span class="nt-q" data-level="good"><i></i><i></i><i></i><b class="nt-bang">!</b></span><span class="nt-lt"></span></span></div>
    <div class="nt-detail" style="display:none"></div>
    <div class="nt-notes"></div>
    <div class="nt-banner nt-off"><div class="nt-bt"></div><div class="nt-bs"></div></div>
    <div class="nt-ping"></div>`;
  document.body.appendChild(root);
  const chip = root.querySelector('.nt-chip');
  const main = root.querySelector('.nt-main');
  const sub = root.querySelector('.nt-sub');
  const linkEl = root.querySelector('.nt-link');
  const qEl = root.querySelector('.nt-q');
  const ltEl = root.querySelector('.nt-lt');
  const detail = root.querySelector('.nt-detail');
  const notes = root.querySelector('.nt-notes');
  const banner = root.querySelector('.nt-banner');
  const bt = root.querySelector('.nt-bt');
  const bs = root.querySelector('.nt-bs');
  const pingEl = root.querySelector('.nt-ping');
  // The chip sits just ABOVE the command bar (whose height grows with the
  // viewport): at 1024x576 a fixed bottom offset put it on top of the
  // portraits. Re-measured on resize and while the HUD is visible.
  function placeChip() {
    const bar = document.querySelector('.hud-bar');
    let bottom = 44;
    if (bar) {
      const r = bar.getBoundingClientRect();
      if (r.height > 0) bottom = Math.max(14, Math.round(window.innerHeight - r.top + 10));
    }
    // Bottom-left column, stacked upward from the bar: chip, the optional
    // detail line, then the notes.
    chip.style.bottom = `${bottom}px`;
    detail.style.bottom = `${bottom + 34}px`;
    notes.style.bottom = `${bottom + 66}px`;
  }
  window.addEventListener('resize', () => placeChip());
  let synced = false;
  // A join that has waited this long for the host's first snapshot says so
  // and names the way out (NET4-F1, fix-M5a-r4: the banner read "Receiving
  // the world from the host" for as long as the host never sent it).
  const JOIN_SLOW_MS = 8000;
  let joiningSince = 0;
  function joinBanner(code) {
    if (!joiningSince) joiningSince = performance.now();
    if (performance.now() - joiningSince >= JOIN_SLOW_MS) setBanner(`Still joining ${code || ''}…`, "The host's game hasn't sent the world yet. Keep waiting, or leave with Esc → Leave Session.");
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
    if (last && last.role === 'guest' && !synced && joiningSince && !last.reconnecting && !last.hostLost) joinBanner(last.code);
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

  function note(text, ms = 3600) {
    const n = document.createElement('div');
    n.className = 'nt-note';
    n.textContent = text;
    notes.appendChild(n);
    while (notes.children.length > 4) notes.removeChild(notes.firstChild);
    setTimeout(() => n.classList.add('nt-fade'), ms);
    setTimeout(() => n.remove(), ms + 450);
  }

  return {
    el: root,
    update,
    note,
    show(on) {
      root.classList.toggle('nt-off', !on);
      if (on) placeChip();
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
      pingEl.classList.add('nt-on');
      clearTimeout(pingTimer);
      pingTimer = setTimeout(() => pingEl.classList.remove('nt-on'), 1600);
    },
    debug: () => ({ visible: !root.classList.contains('nt-off'), banner: banner.classList.contains('nt-off') ? null : bt.textContent, chip: `${main.textContent} ${sub.textContent} ${ltEl.textContent}`.trim(), link: lastLink, notes: [...notes.children].map((n) => n.textContent) }),
    nameOfSeat,
    app,
  };
}
