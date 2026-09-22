// In-game network HUD (docs/gauntlet/PLAN.md §3.7 UI states; z band 60–79,
// CSS prefix nt-). Owner: M5b.
//
//   - a connection chip (bottom-left, clear of the command bar and the room
//     banner): role, room code,
//     players, ping — amber dot online, grey reconnecting;
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

const CSS = `
#nt-hud { position: fixed; inset: 0; pointer-events: none; z-index: 64; font-family: "Nunito", "Trebuchet MS", system-ui, sans-serif; }
#nt-hud.nt-off { display: none; }
.nt-chip { position: absolute; left: 14px; bottom: 44px; display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 10px;
  background: ${P.voidCharcoal}E6; color: ${P.parchment}; border: 1px solid ${P.warmGrey}66; border-radius: 10px;
  font-size: 15px; font-weight: 700; letter-spacing: 0.02em; box-shadow: 0 2px 10px #0006; }
.nt-dot { width: 9px; height: 9px; border-radius: 50%; background: ${P.hearthAmber}; box-shadow: 0 0 6px ${P.hearthAmber}AA; }
.nt-chip.nt-warn .nt-dot { background: ${P.bone}; box-shadow: none; animation: nt-blink 0.9s steps(2) infinite; }
.nt-chip .nt-sub { color: ${P.bone}; font-weight: 600; }
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
    <div class="nt-chip"><span class="nt-dot"></span><span class="nt-main"></span><span class="nt-sub"></span></div>
    <div class="nt-detail" style="display:none"></div>
    <div class="nt-notes"></div>
    <div class="nt-banner nt-off"><div class="nt-bt"></div><div class="nt-bs"></div></div>
    <div class="nt-ping"></div>`;
  document.body.appendChild(root);
  const chip = root.querySelector('.nt-chip');
  const main = root.querySelector('.nt-main');
  const sub = root.querySelector('.nt-sub');
  const detail = root.querySelector('.nt-detail');
  const notes = root.querySelector('.nt-notes');
  const banner = root.querySelector('.nt-banner');
  const bt = root.querySelector('.nt-bt');
  const bs = root.querySelector('.nt-bs');
  const pingEl = root.querySelector('.nt-ping');
  let synced = false;
  let lostUntil = 0;
  let reconnectUntil = 0;
  let timer = 0;
  let last = null;
  let pingTimer = 0;

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
    const role = st.role === 'host' ? 'Hosting' : st.role === 'guest' ? `Online · ${seatLabel(st.seat ?? 0)}` : 'Online';
    main.textContent = role;
    const humans = st.seats.filter((s) => s.name && s.connected).length;
    const rtt = Number.isFinite(st.rttMs) ? ` · ${Math.round(st.rttMs)} ms` : '';
    sub.textContent = `${st.code ? `Room ${st.code} · ` : ''}${humans} player${humans === 1 ? '' : 's'}${rtt}`;
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
    } else if (st.role === 'guest' && !synced) setBanner(`Joining ${st.code || ''}…`, 'Receiving the world from the host');
    else setBanner(null);
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
      if (!on) {
        synced = false;
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
    debug: () => ({ visible: !root.classList.contains('nt-off'), banner: banner.classList.contains('nt-off') ? null : bt.textContent, chip: `${main.textContent} ${sub.textContent}`, notes: [...notes.children].map((n) => n.textContent) }),
    nameOfSeat,
    app,
  };
}
