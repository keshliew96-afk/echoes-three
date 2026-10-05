// Lobby room (docs/gauntlet/PLAN.md §1.3 'lobby', §3.7 lobby / matchmaking).
// Owner: M5b.
//
// The room code (large, to read out loud), who sits where — seat 0 the
// Healer, seats 1–3 Tank / Swordsman / Archer, empty seats read "AI" (CLASS
// SELECT: every player, the host too, picks a class by taking its free seat;
// on arrival the player moves to the class chosen in camp when it is free;
// a taken class reads "Taken") — each player's ready state, connection and ping, the
// host's network addresses (LAN play), who builds what (each player their
// own character, the host the AI-held seats — howtoLine), and the one action that matters for
// each role: guests toggle Ready (and may take a free seat), the host
// Starts once every connected player is ready (the AI plays the empty
// seats). Quick match: while alone in a fresh public room the lobby says it
// is looking for players and, after 15 s, offers "Start now — AI fills the
// empty seats". Esc / B asks before leaving. The session (src/net/
// session.js) takes over when the room starts: the game begins under a
// 1.5 s countdown and this screen closes. A room that is already playing
// (drop-in, PLAN G5b.1) has nothing to wait for here — mpjoin.js never opens
// the lobby for one, and should this screen still find itself over an
// `in_game` room it closes itself (gauntlet r1, J4).
import { service } from '../../app/registry.js';
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { createHints } from './hints.js';
import { installMpStyle, mkBtn, setCaption, inviteLine } from './mpmenu.js';
import { SEAT_LABELS, SEAT_CRITTERS, SEAT_CLASSES } from '../../net/seats.js';
import { PLAY_CLASS_KEY } from '../../app/playclass.js';
import { QUICK_MATCH_ALONE_MS } from '../../net/protocol/constants.js';

const CSS = `
.nt-lobby .nt-panel { width: min(${px(1280)}, calc(100vw - 32px)); }
.nt-roomcode { font-family: ui-monospace, Consolas, monospace; font-size: ${px(46)}; font-weight: 800; letter-spacing: 0.22em; color: ${P.hearthAmber}; }
.nt-seats { flex: 1 1 ${px(560)}; display: flex; flex-direction: column; gap: ${px(10)}; min-width: 0; }
.nt-seat { display: grid; grid-template-columns: ${px(58)} minmax(0, 1fr) auto; align-items: center; gap: ${px(14)};
  width: 100%; min-height: ${px(68)}; padding: ${px(8)} ${px(18)}; text-align: left; }
.nt-seat .nt-sclass { width: ${px(50)}; height: ${px(50)}; border-radius: ${px(10)}; display: flex; align-items: center; justify-content: center;
  font-size: ${px(26)}; font-weight: 800; color: ${P.parchment}; border: 2px solid ${P.warmGrey}88; }
.nt-seat .nt-swho { display: flex; flex-direction: column; min-width: 0; }
.nt-seat .nt-sname { font-size: ${px(26)}; font-weight: 800; color: ${P.parchment}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nt-seat .nt-srole { font-size: ${px(22)}; color: ${P.bone}; }
.nt-seat .nt-stag { font-size: ${px(22)}; font-weight: 800; letter-spacing: 0.06em; padding: ${px(4)} ${px(12)}; border-radius: 999px; border: 1px solid ${P.warmGrey}88; color: ${P.bone}; white-space: nowrap; }
.nt-seat .nt-stag.nt-ready { color: ${P.voidCharcoal}; background: ${P.hearthAmber}; border-color: ${P.hearthAmber}; }
.nt-seat .nt-stag.nt-host { color: ${P.parchment}; border-color: ${P.hearthAmber}AA; }
.nt-seat.nt-empty .nt-sname { color: ${P.warmGrey}; }
.nt-seat.nt-mine { border-color: ${P.hearthAmber}88; background: linear-gradient(180deg, #3A3226 0%, #2A251E 100%); }
.nt-lobby .nt-countdown { font-size: ${px(30)}; font-weight: 800; color: ${P.hearthAmber}; text-align: center; min-height: 1.2em; }
`;
let styled = false;
function installLobbyStyle() {
  installMpStyle();
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'nt-lobby-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const CLASS_TINT = ['#33513C', '#6B6157', '#6B2E3A', '#6E7A3F'];

// fix-DEPLOY-r6 (DEP6-F2): who plays and who builds what, told to THIS
// viewer. PER-CHARACTER BUILDS (PLAN §16, BUILD_BRIEF §25.7): every human
// builds their OWN character between rooms (reward card, sockets, shop); the
// host builds the AI-held seats under Settings ▸ Gameplay ▸ Ally builds; the
// doors and the level flow stay the host's. Seats come from the room, so a
// guest who takes another free seat — or a host after a migration — reads
// its real character. (Was one fixed line: "The host plays the Healer and
// makes the build choices between rooms".)
const NBSP = String.fromCharCode(160); // the settings path never breaks before a ▸
export function howtoLine(room, peerId) {
  const seats = (room && room.seats) || [];
  const mine = seats.find((s) => s.peerId && s.peerId === peerId) || null;
  const hostSeat = seats.find((s) => s.peerId && room && s.peerId === room.hostPeerId) || null;
  const cls = (s) => SEAT_LABELS[s.index] || 'ally';
  if (mine && hostSeat && mine === hostSeat)
    return `You play the ${cls(mine)}. Between rooms each player builds their own character; you also build the AI-held seats (Settings${NBSP}▸${NBSP}Gameplay). Anyone can drop in later.`;
  const host = hostSeat ? `the host plays the ${cls(hostSeat)} and builds the AI-held seats` : 'the host builds the AI-held seats';
  if (mine) return `You play the ${cls(mine)} and build it yourself between rooms — its skills, nodes and shop picks. ${host.charAt(0).toUpperCase()}${host.slice(1)}; anyone can drop in later.`;
  return `Each player builds their own character between rooms; ${host}. Anyone can drop in later.`;
}

export function createLobbyScreen(ctx) {
  installLobbyStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'nt-mp nt-lobby';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Lobby');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="nt-panel ap-plate">
      <div class="nt-head"><h2 class="ap-h2">Room</h2><span class="nt-roomcode">·····</span><div class="nt-sub nt-vis"></div></div>
      <div class="nt-body">
        <div class="nt-seats"></div>
        <aside class="nt-side">
          <h3>Share</h3>
          <div class="nt-line nt-share"></div>
          <div class="nt-line nt-lanline"></div>
          <div class="nt-line nt-howto"></div>
          <div class="nt-countdown"></div>
        </aside>
      </div>
      <div class="nt-err" aria-live="polite"></div>
      <div class="nt-foot"><div class="nt-btnrow nt-acts"></div></div>
    </div>`;
  const codeEl = el.querySelector('.nt-roomcode');
  const visEl = el.querySelector('.nt-vis');
  const seatsEl = el.querySelector('.nt-seats');
  const shareEl = el.querySelector('.nt-share');
  const lanEl = el.querySelector('.nt-lanline');
  const howtoEl = el.querySelector('.nt-howto');
  const cdEl = el.querySelector('.nt-countdown');
  const errEl = el.querySelector('.nt-err');
  const acts = el.querySelector('.nt-acts');
  const hints = createHints(app, [
    ['move', 'Select'],
    ['confirm', 'Choose'],
    ['back', 'Leave'],
  ]);
  el.querySelector('.nt-foot').prepend(hints.el);

  const readyBtn = mkBtn('Ready', 'nt-lobby-ready', { cls: 'ap-primary', onPress: () => toggleReady() });
  const startBtn = mkBtn('Start', 'nt-lobby-start', { cls: 'ap-primary', caption: ' ', onPress: () => start() });
  const leaveBtn = mkBtn('Leave', 'nt-lobby-leave', { onPress: () => leave() });
  startBtn.style.alignItems = 'flex-start';
  startBtn.style.flexDirection = 'column';
  const seatBtns = [0, 1, 2, 3].map((i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ap-btn nt-seat';
    b.id = `nt-seat-${i}`;
    b.setAttribute('data-nav', '');
    b.innerHTML = `<span class="nt-sclass" style="background:${CLASS_TINT[i]}">${SEAT_LABELS[i][0]}</span><span class="nt-swho"><span class="nt-sname"></span><span class="nt-srole"></span></span><span class="nt-stag"></span>`;
    b.addEventListener('click', () => seatPressed(i));
    seatsEl.appendChild(b);
    return b;
  });

  let open = false;
  let queuedSince = null;
  let countdownUntil = 0;
  let cdTimer = 0;
  let offs = [];
  let busy = false;
  let preferTried = null; // the room code the camp class was last asked for
  const n = () => service('net');
  // CLASS SELECT: on arriving in a room, move to the class chosen in camp
  // (app/playclass.js) when its seat is free — once per room.
  async function takePreferred() {
    const net = n();
    const r = net && net.room;
    if (!r || r.state !== 'lobby' || busy || preferTried === r.code || !app.settings) return;
    const mine = me();
    if (!mine) return;
    preferTried = r.code;
    const want = SEAT_CLASSES.indexOf(app.settings.get(PLAY_CLASS_KEY));
    if (want < 0 || want === mine.index) return;
    const target = r.seats[want];
    if (!target || target.peerId) return;
    busy = true;
    try {
      await net.selectSeat(want);
    } catch {
      /* stays on its seat */
    } finally {
      busy = false;
      render();
    }
  }

  function setErr(t) {
    errEl.textContent = t || '';
    errEl.classList.toggle('nt-bad', !!t);
  }
  function me() {
    const net = n();
    const r = net && net.room;
    return r ? r.seats.find((s) => s.peerId === net.peerId) || null : null;
  }
  const amHost = () => {
    const net = n();
    return !!(net && net.room && net.room.hostPeerId === net.peerId);
  };

  function render() {
    const net = n();
    const r = net ? net.room : null;
    if (!r) {
      codeEl.textContent = '·····';
      howtoEl.textContent = howtoLine(null, null);
      return;
    }
    codeEl.textContent = r.code;
    const host = amHost();
    visEl.textContent = r.visibility === 'public' ? 'Public — Quick Match can fill empty seats' : 'Private — share the code';
    for (const s of r.seats) {
      const b = seatBtns[s.index];
      const mine = s.peerId && s.peerId === net.peerId;
      const isHostSeat = s.peerId && s.peerId === r.hostPeerId;
      b.classList.toggle('nt-mine', !!mine);
      b.classList.toggle('nt-empty', !s.peerId);
      b.querySelector('.nt-sname').textContent = s.peerId ? `${s.name}${mine ? ' (you)' : ''}` : 'AI';
      const ping = s.peerId && Number.isFinite(s.rttMs) ? ` · ${Math.round(s.rttMs)} ms` : '';
      b.querySelector('.nt-srole').textContent = `${SEAT_LABELS[s.index]} · the ${SEAT_CRITTERS[s.index]}${ping}`;
      const tag = b.querySelector('.nt-stag');
      tag.className = 'nt-stag';
      if (!s.peerId) tag.textContent = r.state === 'lobby' ? 'AI · take it' : 'AI plays';
      else if (!s.connected) tag.textContent = 'Reconnecting…';
      else if (isHostSeat) {
        tag.textContent = 'Host';
        tag.classList.add('nt-host');
      } else if (s.ready) {
        tag.textContent = 'Ready';
        tag.classList.add('nt-ready');
      } else tag.textContent = 'Not ready';
      if (s.peerId && !mine) b.querySelector('.nt-srole').textContent += ' · Taken';
      const canTake = !s.peerId && r.state === 'lobby';
      b.setAttribute('aria-label', `${SEAT_LABELS[s.index]}: ${s.peerId ? s.name : 'AI'}${canTake ? ' — press to take this seat' : ''}`);
    }
    shareEl.textContent = `Friends open Multiplayer ▸ Join by Code and type ${r.code}.`;
    // DEPLOY (PLAN §14): the invite is the page link when the game is served
    // from a site (no address to type); the LAN server line otherwise.
    lanEl.textContent = inviteLine(net, { code: r.code });
    howtoEl.textContent = howtoLine(r, net.peerId);
    // Actions.
    acts.textContent = '';
    const others = r.seats.filter((s) => s.peerId && s.peerId !== r.hostPeerId);
    const notReady = others.filter((s) => !s.connected || !s.ready);
    const ai = r.seats.filter((s) => !s.peerId).length;
    if (host) {
      const alone = others.length === 0;
      const waitedLong = queuedSince !== null && performance.now() - queuedSince >= QUICK_MATCH_ALONE_MS;
      startBtn.querySelector('.nt-bl').textContent = alone && waitedLong ? 'Start now' : 'Start';
      const can = notReady.length === 0 && r.state === 'lobby';
      startBtn.disabled = !can;
      startBtn.setAttribute('aria-disabled', can ? 'false' : 'true');
      setCaption(
        startBtn,
        !can
          ? r.state !== 'lobby'
            ? 'Starting…'
            : `Waiting for ${notReady.map((s) => s.name).join(', ')} to be ready`
          : ai
            ? alone && waitedLong
              ? 'AI fills the empty seats'
              : `AI plays ${ai} seat${ai === 1 ? '' : 's'}`
            : 'Everyone is here'
      );
      acts.append(startBtn, leaveBtn);
      startBtn.setAttribute('data-nav-default', '');
      readyBtn.removeAttribute('data-nav-default');
      if (queuedSince !== null && alone && !waitedLong) {
        const s = Math.floor((performance.now() - queuedSince) / 1000);
        setErr(`Looking for players… ${s} s`);
        errEl.classList.remove('nt-bad');
      } else if (errEl.textContent.startsWith('Looking')) setErr('');
    } else {
      const mine = me();
      readyBtn.textContent = mine && mine.ready ? 'Not ready' : 'Ready';
      acts.append(readyBtn, leaveBtn);
      readyBtn.setAttribute('data-nav-default', '');
      startBtn.removeAttribute('data-nav-default');
    }
  }

  async function toggleReady() {
    const net = n();
    const mine = me();
    if (!net || !mine || busy) return;
    busy = true;
    try {
      const r = await net.setReady(!mine.ready);
      if (!r.ok) setErr(r.text || `Couldn’t change ready (${r.reason})`);
    } finally {
      busy = false;
      render();
    }
  }
  async function start() {
    const net = n();
    if (!net || busy || startBtn.disabled) return;
    busy = true;
    try {
      const r = await net.start();
      if (!r.ok) setErr(r.text || `Couldn’t start (${r.reason})`);
    } finally {
      busy = false;
    }
  }
  async function seatPressed(i) {
    const net = n();
    if (!net || !net.room || busy) return;
    const s = net.room.seats[i];
    const mine = me();
    if (mine && mine.index === i && !amHost()) return toggleReady();
    if (s.peerId || (mine && mine.index === i) || net.room.state !== 'lobby') return undefined;
    busy = true;
    try {
      const r = await net.selectSeat(i);
      if (!r.ok) setErr(r.text || `That class is taken (${r.reason})`);
      else {
        setErr('');
        // The lobby pick is this player's class from now on (camp too).
        if (app.settings) app.settings.set(PLAY_CLASS_KEY, SEAT_CLASSES[i]);
      }
    } finally {
      busy = false;
      render();
    }
    return undefined;
  }
  async function leave() {
    const ok = await app.confirm({ title: 'Leave the room?', body: amHost() ? 'You are the host — the room passes to the next player, or closes if nobody is left.' : 'You can join again with the same code while the room is open.', confirmLabel: 'Leave', cancelLabel: 'Stay', defaultFocus: 'cancel' });
    if (!ok) return;
    const net = n();
    if (net) await net.leave();
    if (manager.top() === 'lobby') manager.pop();
  }

  // Drop-in guard (J4): over a room that is already playing this screen is a
  // dead end (Ready / seats are refused by the server) — the session runs the
  // game underneath. Close; the net HUD and the game take over.
  function closeIfPlaying() {
    const net = n();
    if (!open || !net || !net.room || net.room.state !== 'in_game') return false;
    if (manager.top() !== 'lobby') return false;
    manager.pop();
    return true;
  }

  function tickCountdown() {
    cdTimer = 0;
    if (!open) return;
    const left = countdownUntil - performance.now();
    if (left > 0) {
      cdEl.textContent = `Starting in ${(left / 1000).toFixed(1)} s`;
      cdTimer = setTimeout(tickCountdown, 100);
    } else if (countdownUntil) cdEl.textContent = 'Starting…';
    if (queuedSince !== null) render();
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    defaultFocus: '#nt-lobby-ready',
    onOpen(params = {}) {
      open = true;
      countdownUntil = 0;
      cdEl.textContent = '';
      setErr('');
      const net = n();
      queuedSince = params.via === 'quick' ? performance.now() : null;
      if (net) {
        offs = [
          net.on('room', () => {
            if (open && !closeIfPlaying()) {
              render();
              takePreferred();
            }
          }),
          net.on('state', () => closeIfPlaying()),
          net.on('game_starting', (m) => {
            countdownUntil = performance.now() + (m.countdownMs || 1500);
            if (!cdTimer) tickCountdown();
          }),
          net.on('match_found', () => {
            queuedSince = null;
            render();
          }),
          net.on('room_closed', () => {
            if (manager.top() === 'lobby') {
              manager.pop();
              app.toast('The room closed', { tone: 'warn' });
            }
          }),
          net.on('session_lost', (m) => {
            if (manager.top() === 'lobby') {
              manager.pop();
              app.toast((m && m.text) || 'Connection to the server was lost.', { tone: 'warn', ms: 5200 });
            }
          }),
        ];
      }
      render();
      preferTried = null;
      takePreferred();
      if (queuedSince !== null) cdTimer = setTimeout(tickCountdown, 1000);
      // Opened over a room that is already playing: close once push() has
      // finished (never pop from inside onOpen).
      queueMicrotask(() => closeIfPlaying());
    },
    onClose() {
      open = false;
      for (const off of offs) off();
      offs = [];
      clearTimeout(cdTimer);
      cdTimer = 0;
    },
    back() {
      leave();
      return true;
    },
  };
}
