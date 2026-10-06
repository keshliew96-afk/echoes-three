// Multiplayer menu (docs/gauntlet/PLAN.md §1.3 'mp-menu', §3.7 "No server /
// unreachable / LAN"). Owner: M5b. CSS prefix nt-.
//
// Opening the menu — and every Host / Join / Quick Match press — first
// probes the session server (hello -> welcome, 3 s timeout, one retry after
// 0.5 s): `checking` (a labelled progress line + Back) -> `online` (actions
// enabled; the server address, its round trip and every LAN address it
// listens on) or `unreachable` (Retry — default focus —, Change server, Back,
// with the honest copy: multiplayer runs through a small server on the
// host's computer, `npm run net`). The UI never claims UDP and never spins
// forever. Single-player is untouched throughout.
//
// DEPLOY (PLAN §14): the address is automatic — the session server of the
// site the page came from — unless ?net=, a saved address or VITE_NET_URL
// says otherwise; the unreachable copy says which, and how to fix THAT case
// (a site without a server, the dev/preview proxy with no `npm run net`, a
// page opened as a file, a saved address, a server older than the page).
// A newer build on the server / site / a room gives an `update` state:
// "A new version of Echoes is available" · Reload (default) · Back.
//
// Registered screens: 'mp-menu' (this file), 'mp-join' (mpjoin.js), 'lobby'
// (lobby.js), 'nt-server' (the change-server dialog, this file).
import { registerScreen, service } from '../../app/registry.js';
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { createHints } from './hints.js';
import { createJoinScreen } from './mpjoin.js';
import { createLobbyScreen } from './lobby.js';
import { validateServerUrl } from '../../net/lobbyClient.js';
import { seatLabel } from '../../net/seats.js';
import { sourceLabel, isLoopbackHost, pageLocation } from '../../net/address.js';
import { updateCopy, reloadForUpdate } from '../net/update.js';
import { t } from '../../i18n/index.js';

export const MP_CSS = `
.nt-panel { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(${px(1180)}, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto;
  display: flex; flex-direction: column; padding: ${px(26)} ${px(34)} ${px(20)}; gap: ${px(14)}; }
.nt-head { display: flex; align-items: baseline; gap: ${px(22)}; flex-wrap: wrap; padding-bottom: ${px(10)}; border-bottom: 1px solid ${P.warmGrey}44; }
.nt-head .nt-sub { font-size: ${px(22)}; color: ${P.bone}; }
.nt-body { display: flex; gap: ${px(28)}; min-height: 0; flex-wrap: wrap; }
.nt-actions { flex: 1 1 ${px(420)}; display: flex; flex-direction: column; gap: ${px(12)}; min-width: 0; }
.nt-actions .ap-btn { justify-content: flex-start; width: 100%; min-height: ${px(62)}; flex-direction: column; align-items: flex-start; gap: ${px(2)}; padding: ${px(8)} ${px(24)}; }
.nt-actions .ap-btn .nt-bl { font-size: ${px(26)}; font-weight: 800; letter-spacing: 0.05em; }
.nt-actions .ap-btn .nt-bc { font-size: ${px(22)}; font-weight: 600; letter-spacing: 0.01em; color: ${P.bone}; white-space: normal; text-align: left; }
.nt-actions .ap-btn[disabled] .nt-bc { color: ${P.warmGrey}; }
.nt-side { flex: 1 1 ${px(380)}; min-width: 0; display: flex; flex-direction: column; gap: ${px(12)}; padding: ${px(18)} ${px(22)};
  border-radius: ${px(14)}; background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}44; }
.nt-side h3 { margin: 0; font-size: ${px(22)}; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: ${P.parchment}; }
.nt-line { font-size: ${px(22)}; color: ${P.bone}; line-height: 1.4; overflow-wrap: anywhere; }
.nt-line b { color: ${P.parchment}; }
.nt-status { display: flex; align-items: center; gap: ${px(10)}; font-size: ${px(24)}; font-weight: 700; color: ${P.parchment}; }
.nt-status .nt-sdot { width: ${px(14)}; height: ${px(14)}; border-radius: 50%; background: ${P.warmGrey}; flex: 0 0 auto; }
.nt-status.nt-online .nt-sdot { background: ${P.hearthAmber}; box-shadow: 0 0 ${px(8)} ${P.hearthAmber}AA; }
.nt-status.nt-checking .nt-sdot { background: ${P.bone}; animation: nt-pulse 0.9s ease-in-out infinite; }
.nt-status.nt-unreachable .nt-sdot { background: ${P.bruiseUmber}; border: 2px solid ${P.bone}; }
.nt-status.nt-update .nt-sdot { background: ${P.hearthAmber}; }
.nt-addr .nt-src { color: ${P.bone}; }
@keyframes nt-pulse { 50% { opacity: 0.3; } }
.nt-code { font-family: ui-monospace, Consolas, monospace; letter-spacing: 0.08em; color: ${P.parchment}; }
.nt-err { font-size: ${px(22)}; color: ${P.bone}; min-height: 1.3em; }
.nt-err.nt-bad { color: ${P.parchment}; border-left: 3px solid ${P.hearthAmber}; padding-left: ${px(10)}; }
.nt-unreach { display: flex; flex-direction: column; gap: ${px(14)}; }
.nt-unreach .nt-msg { font-size: ${px(24)}; color: ${P.parchment}; line-height: 1.45; }
.nt-unreach .nt-how { font-size: ${px(22)}; color: ${P.bone}; line-height: 1.45; }
.nt-kbdline { font-family: ui-monospace, Consolas, monospace; background: #161411; color: ${P.parchment}; padding: ${px(2)} ${px(8)}; border-radius: ${px(6)}; border: 1px solid ${P.warmGrey}55; white-space: nowrap; }
.nt-btnrow { display: flex; gap: ${px(14)}; flex-wrap: wrap; }
.nt-foot { display: flex; align-items: center; gap: ${px(16)}; padding-top: ${px(10)}; border-top: 1px solid ${P.warmGrey}44; }
.nt-foot .ap-hints { flex: 1 1 auto; min-width: 0; }
.nt-input { width: 100%; min-height: ${px(56)}; padding: 0 ${px(16)}; font-family: inherit; font-size: ${px(26)};
  color: ${P.parchment}; background: #161411; border: max(2px, ${px(2)}) solid ${P.warmGrey}88; border-radius: ${px(10)}; box-sizing: border-box; }
.nt-input.ap-focus { outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(2)}; border-color: ${P.hearthAmber}AA; }
.nt-input.nt-codein { text-transform: uppercase; letter-spacing: 0.3em; font-family: ui-monospace, Consolas, monospace; text-align: center; font-size: ${px(34)}; }
`;
let styled = false;
export function installMpStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'nt-mp-style';
  s.textContent = MP_CSS;
  document.head.appendChild(s);
}

export function mkBtn(label, id, { cls = '', caption = '', onPress } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `ap-btn ${cls}`.trim();
  b.id = id;
  b.setAttribute('data-nav', '');
  if (caption) {
    const l = document.createElement('span');
    l.className = 'nt-bl';
    l.textContent = label;
    const c = document.createElement('span');
    c.className = 'nt-bc';
    c.textContent = caption;
    b.append(l, c);
  } else b.textContent = label;
  b.addEventListener('click', () => {
    if (!b.disabled && onPress) onPress();
  });
  return b;
}
export function setCaption(b, text) {
  const c = b.querySelector('.nt-bc');
  if (c) c.textContent = text;
}
export const net = () => service('net');
export const httpsPage = () => typeof location !== 'undefined' && location.protocol === 'https:';
// The link friends open to play this page's game (no query / hash).
export function pageLink() {
  const loc = pageLocation();
  return loc && (loc.protocol === 'http:' || loc.protocol === 'https:') ? `${loc.origin}${loc.pathname}` : null;
}
export const addressOf = (n) => (n && typeof n.addressInfo === 'function' ? n.addressInfo() : { url: n ? n.serverUrl : '—', source: 'local' });
// DEPLOY: who can join, in one line — the page link when the game is served
// from a real site, the LAN page link a `--static` server serves, else the
// LAN server address (the legacy `npm run net -- --host 0.0.0.0` setup).
export function inviteLine(n, { code = null, online = true } = {}) {
  const a = addressOf(n);
  const sites = n && Array.isArray(n.siteUrls) ? n.siteUrls : [];
  const lans = n && Array.isArray(n.lanUrls) ? n.lanUrls : [];
  const link = pageLink();
  const loc = pageLocation();
  // The link this page was opened by is the invite, unless it only works on
  // this computer (127.0.0.1 / localhost) — then the LAN link a `--static`
  // server serves the game at.
  if (a.source === 'site' && link && loc && !isLoopbackHost(loc.hostname))
    return code ? t('Friends open {link} — no settings needed · code {code}', { link, code }) : t('Friends open {link} — no settings needed', { link });
  if (a.source === 'site' && sites.length)
    return code
      ? t('Friends on your network open {link} — no settings needed · code {code}', { link: sites[0], code })
      : t('Friends on your network open {link} — no settings needed', { link: sites[0] });
  if (lans.length) return code ? t('Friends on your network: server {url} · code {code}', { url: lans[0], code }) : t('On your network: {urls}', { urls: lans.join('  ·  ') });
  if (a.source === 'site' && link)
    return code
      ? t('Friends on your network open this game’s Network address (npm run dev -- --host or npm run serve prints it) · code {code}', { code })
      : t('Friends on your network open this game’s Network address (npm run dev -- --host or npm run serve prints it)');
  if (code) return t('Server {url}', { url: n ? n.serverUrl : '—' });
  return online ? t('Local only — start the server with --host 0.0.0.0 to let friends on your network join.') : '';
}

// ------------------------------------------------------------- mp-menu --
function createMpMenuScreen(ctx) {
  installMpStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'nt-mp';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t('Multiplayer'));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="nt-panel ap-plate">
      <div class="nt-head"><h2 class="ap-h2">${t('Multiplayer')}</h2><div class="nt-sub">${t('Co-op for up to four — the host plays the Healer, the AI fills empty seats')}</div></div>
      <div class="nt-body">
        <div class="nt-actions"></div>
        <aside class="nt-side">
          <h3>${t('Server')}</h3>
          <div class="nt-status"><span class="nt-sdot"></span><span class="nt-stext">${t('Checking…')}</span></div>
          <div class="nt-line nt-addr"></div>
          <div class="nt-line nt-lan"></div>
          <div class="nt-line nt-name"></div>
        </aside>
      </div>
      <div class="nt-err"></div>
      <div class="nt-foot"></div>
    </div>`;
  const actions = el.querySelector('.nt-actions');
  const statusEl = el.querySelector('.nt-status');
  const stext = el.querySelector('.nt-stext');
  const addrEl = el.querySelector('.nt-addr');
  const lanEl = el.querySelector('.nt-lan');
  const nameEl = el.querySelector('.nt-name');
  const errEl = el.querySelector('.nt-err');
  const foot = el.querySelector('.nt-foot');
  const hints = createHints(app, [
    ['move', t('Select')],
    ['confirm', t('Choose')],
    ['back', t('Back')],
  ]);
  foot.appendChild(hints.el);

  let state = 'checking'; // checking | online | unreachable
  let busy = false;
  let probeGen = 0;
  let lastProbe = null;
  let offUpdate = null;

  const rejoinBtn = mkBtn(t('Rejoin'), 'nt-mp-rejoin', { cls: 'ap-primary', caption: ' ', onPress: () => doRejoin() });
  const hostBtn = mkBtn(t('Host a Game'), 'nt-mp-host', { caption: t('A private room — friends join with its code'), onPress: () => act('host') });
  const hostPubBtn = mkBtn(t('Host a Public Game'), 'nt-mp-hostpub', { caption: t('Quick Match can fill the empty seats'), onPress: () => act('hostpub') });
  const joinBtn = mkBtn(t('Join by Code'), 'nt-mp-join', { caption: t('Enter the 5-letter room code a host shares'), onPress: () => act('join') });
  const quickBtn = mkBtn(t('Quick Match'), 'nt-mp-quick', { caption: t('Join an open public room, or open one and wait'), onPress: () => act('quick') });
  const backBtn = mkBtn(t('Back'), 'nt-mp-back', { onPress: () => manager.pop() });
  // Unreachable panel.
  const unreach = document.createElement('div');
  unreach.className = 'nt-unreach';
  const umsg = document.createElement('div');
  umsg.className = 'nt-msg';
  const uhow = document.createElement('div');
  uhow.className = 'nt-how';
  uhow.innerHTML = t('Multiplayer runs through a small server on the host’s computer. On that computer, in the game folder, run {net} (for players on your network: {netHost}), then press Retry.', {
    net: '<span class="nt-kbdline">npm run net</span>',
    netHost: '<span class="nt-kbdline">npm run net -- --host 0.0.0.0</span>',
  });
  const uhttps = document.createElement('div');
  uhttps.className = 'nt-how';
  const ubtns = document.createElement('div');
  ubtns.className = 'nt-btnrow';
  const retryBtn = mkBtn(t('Retry'), 'nt-mp-retry', { cls: 'ap-primary', onPress: () => check() });
  const changeBtn = mkBtn(t('Change server'), 'nt-mp-change', { onPress: () => changeServer() });
  const autoBtn = mkBtn(t('Use this site’s server'), 'nt-mp-auto', { onPress: () => useAutomatic() });
  const ubackBtn = mkBtn(t('Back'), 'nt-mp-uback', { onPress: () => manager.pop() });
  ubtns.append(retryBtn, changeBtn, ubackBtn);
  unreach.append(umsg, uhow, uhttps, ubtns);
  // Update panel (DEPLOY, PLAN §14.5): Reload (default focus) · Back.
  const upd = document.createElement('div');
  upd.className = 'nt-unreach nt-updpanel';
  const updMsg = document.createElement('div');
  updMsg.className = 'nt-msg';
  const updHow = document.createElement('div');
  updHow.className = 'nt-how';
  const updBtns = document.createElement('div');
  updBtns.className = 'nt-btnrow';
  const reloadBtn = mkBtn(t('Reload'), 'nt-mp-reload', { cls: 'ap-primary', onPress: () => reloadForUpdate() });
  const updBackBtn = mkBtn(t('Back'), 'nt-mp-updback', { onPress: () => manager.pop() });
  updBtns.append(reloadBtn, updBackBtn);
  upd.append(updMsg, updHow, updBtns);

  // The honest "how to fix it" for THIS address (PLAN §14.1).
  const KBD = (cmd) => `<span class="nt-kbdline">${cmd}</span>`;
  const LEGACY_HOW = t('Multiplayer runs through a small server on the host’s computer. On that computer, in the game folder, run {net} (for players on your network: {netHost}), then press Retry.', {
    net: KBD('npm run net'),
    netHost: KBD('npm run net -- --host 0.0.0.0'),
  });
  function unreachableHow(n) {
    const a = addressOf(n);
    const loc = pageLocation();
    if (lastProbe && lastProbe.error === 'server_outdated') return t('That server runs an older version of Echoes than this page. Whoever runs it: update the game folder and restart it ({serve}), then press Retry.', { serve: KBD('npm run serve') });
    if (a.source === 'site') {
      if (loc && isLoopbackHost(loc.hostname))
        return t('Multiplayer connects to this site’s {path}, which the dev and preview servers forward to the session server on this computer — and it isn’t running. In the game folder run {net}, then press Retry. ({serve} runs the game and the server together.)', { path: KBD('/echoes'), net: KBD('npm run net'), serve: KBD('npm run serve') });
      return t('Multiplayer connects to the session server of the site you opened the game from, and this site isn’t running one right now. If you host it: start it with {serve}, or forward {path} to {net} (README ▸ Host it on a server), then press Retry. If a friend hosts it, ask them — or press Change server to use another address.', { serve: KBD('npm run serve'), path: KBD('/echoes'), net: KBD('npm run net') });
    }
    if (a.source === 'local' && a.file)
      return t('This page was opened as a file, so there is no site to find a server on. In the game folder run {serve} and open the address it prints (friends on your network open the same link) — or run {net} and press Retry.', { serve: KBD('npm run serve'), net: KBD('npm run net') });
    if (a.source === 'build') return t('This build was made to connect to that server. Whoever runs it: start it ({net}), then press Retry — or press Change server to use another address.', { net: KBD('npm run net') });
    if (a.source === 'saved') return t('That is the custom address saved in Settings ▸ Network. {how} Or press “Use this site’s server” to go back to automatic.', { how: LEGACY_HOW });
    if (a.source === 'param') return t('That address comes from the page link (?net=). {how}', { how: LEGACY_HOW });
    return LEGACY_HOW;
  }
  function useAutomatic() {
    app.settings.set('net.serverUrl', '', { source: 'ui' });
    const n = net();
    if (n) n.serverUrl = '';
    check();
  }

  function render() {
    const n = net();
    const info = n && n.rejoinInfo ? n.rejoinInfo() : null;
    actions.textContent = '';
    if (state !== 'checking' && n && n.updateInfo) state = 'update';
    if (state === 'update') {
      const c = updateCopy(n ? n.updateInfo : null);
      updMsg.textContent = c.title;
      updHow.textContent = c.body;
      actions.appendChild(upd);
      retryBtn.removeAttribute('data-nav-default');
      reloadBtn.setAttribute('data-nav-default', '');
      return;
    }
    if (state === 'unreachable') {
      const a = addressOf(n);
      umsg.textContent = lastProbe && lastProbe.error === 'server_outdated' ? t('The Echoes server at {url} runs an older version.', { url: n ? n.serverUrl : '—' }) : t('Can’t reach the Echoes server at {url}.', { url: n ? n.serverUrl : '—' });
      uhow.innerHTML = unreachableHow(n);
      uhttps.textContent = httpsPage() ? t('This page is served over https, so the browser only allows secure (wss://) servers.') : '';
      if (a.source === 'saved') ubtns.insertBefore(autoBtn, ubackBtn);
      else if (autoBtn.parentNode) autoBtn.remove();
      actions.appendChild(unreach);
      retryBtn.setAttribute('data-nav-default', '');
      return;
    }
    retryBtn.removeAttribute('data-nav-default');
    if (info) {
      rejoinBtn.querySelector('.nt-bl').textContent = t('Rejoin {code}', { code: info.code });
      setCaption(rejoinBtn, info.role === 'host' ? t('You were hosting — your party is waiting for you') : t('Your {cls} seat is held for a minute after a disconnect', { cls: t(seatLabel(info.seat ?? 1)) }));
      actions.appendChild(rejoinBtn);
    }
    for (const b of [hostBtn, hostPubBtn, joinBtn, quickBtn]) {
      const ok = state === 'online' && !busy;
      b.disabled = !ok;
      b.setAttribute('aria-disabled', ok ? 'false' : 'true');
      actions.appendChild(b);
    }
    (info ? rejoinBtn : hostBtn).setAttribute('data-nav-default', '');
    (info ? hostBtn : rejoinBtn).removeAttribute('data-nav-default');
    actions.appendChild(backBtn);
    if (state === 'checking') setCaption(hostBtn, t('Checking the server…'));
    else setCaption(hostBtn, t('A private room — friends join with its code'));
  }

  function renderSide() {
    const n = net();
    statusEl.className = `nt-status nt-${state}`;
    stext.textContent =
      state === 'online'
        ? lastProbe && Number.isFinite(lastProbe.ms)
          ? t('Online · {ms} ms', { ms: lastProbe.ms })
          : t('Online')
        : state === 'checking'
          ? t('Checking the server…')
          : state === 'update'
            ? t('Update available')
            : t('Unreachable');
    addrEl.innerHTML = '';
    const a = document.createElement('span');
    a.textContent = `${t('Address')} `;
    const code = document.createElement('span');
    code.className = 'nt-code';
    code.textContent = n ? n.serverUrl : '—';
    const src = document.createElement('span');
    src.className = 'nt-src';
    src.textContent = ` · ${t(sourceLabel(addressOf(n).source))}`;
    addrEl.append(a, code, src);
    const lans = n && Array.isArray(n.lanUrls) ? n.lanUrls : [];
    lanEl.textContent = state === 'online' ? inviteLine(n) : lans.length ? t('On your network: {urls}', { urls: lans.join('  ·  ') }) : '';
    nameEl.textContent = t('You play as {name} (change it in Settings ▸ Network)', { name: n ? n.name : '—' });
  }

  async function check() {
    const n = net();
    if (!n) return;
    const gen = ++probeGen;
    state = 'checking';
    errEl.textContent = '';
    render();
    renderSide();
    // fix-M5b-r4: a fresh look at this browser's other tabs (<= 0.2 s), so
    // Rejoin is never offered for a session that is live in another tab. It
    // never holds the menu in 'checking': the menu opens on the probe's
    // answer (the cached picture, primed at boot) and renders again only if
    // the fresh look changes what Rejoin shows.
    const rejoinKey = () => {
      const i = n.rejoinInfo ? n.rejoinInfo() : null;
      return i ? `${i.code}|${i.role}|${i.seat}` : '';
    };
    const liveP = typeof n.rejoinCandidate === 'function' ? n.rejoinCandidate().catch(() => null) : null;
    const r = await n.probe();
    if (gen !== probeGen || manager.top() === null) return;
    lastProbe = r;
    state = r.state === 'online' ? 'online' : r.state === 'update' ? 'update' : 'unreachable';
    render();
    renderSide();
    focusDefault();
    if (liveP) {
      const shown = rejoinKey();
      liveP.then(() => {
        if (gen !== probeGen || manager.top() !== 'mp-menu' || busy || rejoinKey() === shown) return;
        render();
        focusDefault();
      });
    }
  }
  function focusDefault() {
    if (manager.top() !== 'mp-menu') return;
    const d = actions.querySelector('[data-nav-default]:not([disabled])') || actions.querySelector('[data-nav]:not([disabled])');
    if (d) manager.focusElement(d, 'api');
  }

  function setError(text) {
    errEl.textContent = text || '';
    errEl.classList.toggle('nt-bad', !!text);
  }

  // Every action re-probes first (the server may have gone away).
  async function act(kind) {
    if (busy) return;
    const n = net();
    if (!n) return;
    busy = true;
    setError('');
    render();
    try {
      if (!n.connected) {
        state = 'checking';
        renderSide();
        const p = await n.probe();
        lastProbe = p;
        if (p.state !== 'online') {
          state = p.state === 'update' ? 'update' : 'unreachable';
          render();
          renderSide();
          focusDefault();
          return;
        }
        state = 'online';
        renderSide();
      }
      if (kind === 'join') {
        manager.push('mp-join');
        return;
      }
      let r;
      if (kind === 'quick') r = await n.quickMatch();
      else r = await n.host({ visibility: kind === 'hostpub' ? 'public' : 'private' });
      if (!r || !r.ok) {
        if (r && r.reason === 'update_available') {
          state = 'update';
          render();
          renderSide();
          return;
        }
        setError(
          r && r.text
            ? t(r.text)
            : kind === 'quick'
              ? t('Couldn’t find a match ({reason}).', { reason: (r && r.reason) || t('no answer') })
              : t('Couldn’t open a room ({reason}).', { reason: (r && r.reason) || t('no answer') })
        );
        if (r && (r.reason === 'unreachable' || r.reason === 'timeout')) {
          state = 'unreachable';
          render();
          renderSide();
        }
        return;
      }
      manager.push('lobby', { via: kind });
    } finally {
      busy = false;
      if (manager.top() === 'mp-menu') {
        render();
        focusDefault();
      }
    }
  }

  async function doRejoin() {
    const n = net();
    if (!n || busy) return;
    busy = true;
    setError(t('Rejoining…'));
    try {
      const info = n.rejoinInfo ? n.rejoinInfo() : null;
      const r = await n.rejoin(info ? { code: info.code } : {});
      if (!r.ok) setError(t('Couldn’t rejoin — {reason}.', { reason: r.detail || (r.text && t(r.text)) || r.reason || t('the seat was released') }));
    } finally {
      busy = false;
      if (manager.top() === 'mp-menu') render();
    }
  }

  function changeServer() {
    manager.push('nt-server', {
      onDone: (changed) => {
        if (changed) check();
      },
    });
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    defaultFocus: '#nt-mp-host',
    onOpen() {
      state = 'checking';
      render();
      renderSide();
      check();
      // DEPLOY: a newer build found while the menu is open (the server came
      // back from a redeploy, a room of a newer version) -> the update panel.
      const n = net();
      if (offUpdate) offUpdate();
      offUpdate =
        n && typeof n.on === 'function'
          ? n.on('update_available', () => {
              if (manager.top() !== 'mp-menu') return;
              probeGen += 1; // a check in flight must not overwrite it
              state = 'update';
              render();
              renderSide();
              focusDefault();
            })
          : null;
    },
    onFocus() {
      // Back from the lobby / join / server dialog: re-check and re-render.
      render();
      renderSide();
      if (state !== 'update' && (!net() || !net().connected)) check();
      else focusDefault();
    },
    onClose() {
      probeGen += 1;
      if (offUpdate) offUpdate();
      offUpdate = null;
    },
  };
}

// --------------------------------------------------- change-server dialog --
function createServerScreen(ctx) {
  installMpStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-dialog nt-server';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ap-dlg ap-plate">
      <div class="ap-dlg-title">${t('Change server')}</div>
      <div class="ap-dlg-body">${t('The address of the Echoes server — ws://host:port/echoes (wss:// for a secure server). Automatic uses the server of the site you opened the game from.')}</div>
      <input type="text" id="nt-server-input" class="nt-input" maxlength="200" autocomplete="off" spellcheck="false" data-nav data-nav-default />
      <div class="nt-err"></div>
      <div class="ap-dlg-btns"></div>
    </div>`;
  const input = el.querySelector('input');
  const err = el.querySelector('.nt-err');
  const btns = el.querySelector('.ap-dlg-btns');
  let p = null;
  let done = false;
  function finish(changed) {
    if (done) return;
    done = true;
    if (manager.top() === 'nt-server') manager.pop();
    if (p && typeof p.onDone === 'function') p.onDone(changed);
  }
  function useAuto() {
    app.settings.set('net.serverUrl', '', { source: 'ui' });
    const n = net();
    if (n) n.serverUrl = '';
    finish(true);
  }
  function save() {
    if (!input.value.trim()) return useAuto(); // an empty address = automatic
    const v = validateServerUrl(input.value, { https: httpsPage() });
    if (!v.ok) {
      err.textContent =
        v.reason === 'insecure_on_https'
          ? t('This page is served over https, so the browser only allows secure (wss://) servers.')
          : v.reason === 'not_ws'
            ? t('Server addresses start with ws:// or wss://')
            : t('That is not a server address — e.g. ws://192.168.1.20:7800/echoes');
      err.classList.add('nt-bad');
      return;
    }
    app.settings.set('net.serverUrl', v.url, { source: 'ui' });
    const n = net();
    if (n) n.serverUrl = v.url;
    finish(true);
  }
  const ok = mkBtn(t('Save'), 'nt-server-ok', { cls: 'ap-primary', onPress: save });
  const def = mkBtn(t('Automatic'), 'nt-server-default', { onPress: () => useAuto() });
  const cancel = mkBtn(t('Cancel'), 'nt-server-cancel', { onPress: () => finish(false) });
  btns.append(ok, def, cancel);
  input.addEventListener('click', () => input.focus({ preventScroll: true }));
  input.addEventListener('input', () => {
    err.textContent = '';
    err.classList.remove('nt-bad');
  });
  return {
    el,
    blocking: true,
    layer: 'dialog',
    reusable: false,
    onOpen(params = {}) {
      p = params;
      done = false;
      const n = net();
      const a = addressOf(n);
      input.value = n ? n.serverUrl : '';
      input.placeholder = a && a.site ? a.site : '';
      setTimeout(() => {
        try {
          input.focus({ preventScroll: true });
          input.select();
        } catch {
          /* detached */
        }
      }, 0);
    },
    onClose() {
      if (!done) {
        done = true;
        if (p && typeof p.onDone === 'function') p.onDone(false);
      }
    },
    onNav(action) {
      if (action === 'confirm' && document.activeElement === input) {
        save();
        return true;
      }
      return false;
    },
    back() {
      finish(false);
      return true;
    },
  };
}

let registered = false;
export function registerMultiplayerScreens() {
  if (registered) return;
  registered = true;
  registerScreen('mp-menu', createMpMenuScreen);
  registerScreen('mp-join', createJoinScreen);
  registerScreen('lobby', createLobbyScreen);
  registerScreen('nt-server', createServerScreen);
}
