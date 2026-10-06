// Settings ▸ Network (docs/gauntlet/PLAN.md §3.2 keys net.playerName /
// net.serverUrl; tab order 50). Owner: M5b.
//   Player name        net.playerName — the name plate in lobbies and the
//                      in-game net HUD (≤ 16 characters)
//   Server address     net.serverUrl — '' = Automatic (DEPLOY, PLAN §14.1:
//                      the session server of the site the page came from,
//                      shown with the address it resolves to), or a custom
//                      ws:// / wss:// address (wss:// only when the page
//                      itself is served over https: browsers block ws://
//                      from an https page); Check probes it right here;
//                      Reset to automatic drops a custom address
//   Connection details net.showStats — the rtt / loss / snapshot line under
//                      the in-game connection chip
// plus the honest note on how multiplayer is hosted (players open the host's
// link; the host serves it with `npm run serve`, or `npm run net` beside the
// dev / preview server).
import { registerSettingsTab, service } from '../../../app/registry.js';
import { HIT } from '../../../app/style.js';
import { installMpStyle, mkBtn, httpsPage } from '../mpmenu.js';
import { validateServerUrl } from '../../../net/lobbyClient.js';
import { sanitizeName } from '../../../net/protocol/messages.js';
import { sourceLabel } from '../../../net/address.js';
import { t } from '../../../i18n/index.js';

function textRow({ id, label, help, value, maxLength, onCommit, onCancel, placeholder = '' }) {
  const row = document.createElement('div');
  row.className = 'ap-row nt-textrow';
  row.dataset.help = help;
  row.dataset.helpTitle = label;
  row.dataset.rowId = id;
  const lab = document.createElement('span');
  lab.className = 'ap-label';
  lab.textContent = label;
  const ctl = document.createElement('div');
  ctl.className = 'ap-ctl';
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.className = 'nt-input';
  input.maxLength = maxLength;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = placeholder;
  input.setAttribute('data-nav', '');
  input.value = value;
  input.style.maxWidth = 'calc(520px * var(--ap-s, 1))';
  input.style.minHeight = HIT; // >= 40 CSS px at 1024x576 (G1.1; was 48 authored = 36 px)
  input.style.fontSize = 'calc(22px * var(--ap-s, 1))';
  ctl.appendChild(input);
  const note = document.createElement('div');
  note.className = 'ap-note';
  row.append(lab, ctl, note);
  input.addEventListener('click', () => input.focus({ preventScroll: true }));
  input.addEventListener('change', () => onCommit(input.value));
  // Enter commits. The app's nav layer (src/app/nav.js) takes every keydown
  // in its capture phase while a menu is open, so a keydown listener here
  // never ran and Enter did nothing until the field lost focus (DEPLOY
  // fix): the keyup still reaches the field.
  input.addEventListener('keyup', (e) => {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') onCommit(input.value);
  });
  // Esc / B / right-click is CANCEL, never commit (MENU-R4-F1): the menu's
  // back action asks the field first (src/app/screens.js). An uncommitted
  // edit reverts to the saved value with the caret kept in the field — so
  // no blur-'change' can save it — and the note says so; with nothing to
  // cancel, back leaves Settings as usual.
  let committed = String(value == null ? '' : value);
  const setNote = (text) => (note.textContent = text || '');
  input.__navDirty = () => input.value !== committed; // Settings' footer: "Esc Cancel edit"
  input.__navCancelEdit = () => {
    if (input.value === committed) return false;
    input.value = committed;
    if (onCancel) onCancel(committed);
    return true;
  };
  return {
    el: row,
    input,
    ctl,
    setNote,
    set: (v) => {
      committed = String(v == null ? '' : v);
      input.value = committed;
    },
  };
}

function buildNetworkTab(ctx) {
  installMpStyle();
  const { settings, widgets } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-tabcontent nt-nettab';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = 'calc(10px * var(--ap-s, 1))';

  const name = textRow({
    id: 'nt-set-name',
    label: t('Player name'),
    help: t('The name other players see in the lobby and above your seat in the connection chip. Up to 16 characters.'),
    value: settings.get('net.playerName'),
    maxLength: 16,
    onCommit: (v) => {
      const clean = sanitizeName(v, '');
      if (!clean) {
        name.set(settings.get('net.playerName'));
        name.setNote(t('A name needs at least one visible character'));
        return;
      }
      settings.set('net.playerName', clean, { source: 'ui' });
      name.set(clean);
      name.setNote(t('Saved — shown in lobbies from now on'));
    },
    onCancel: (v) => name.setNote(t('Change cancelled — your name is still “{name}”', { name: v })),
  });
  name.setNote(t('Shown in lobbies and on the connection chip'));

  // DEPLOY (PLAN §14.1): '' = Automatic — the server of the site this page
  // came from; the note always names the address it resolves to.
  const netSvc = () => service('net');
  const info = () => {
    const n = netSvc();
    return n && typeof n.addressInfo === 'function' ? n.addressInfo() : { url: n ? n.serverUrl : '', source: 'local' };
  };
  function autoNote() {
    const a = info();
    const saved = settings.get('net.serverUrl');
    if (a.source === 'param') return t('Set by the page link (?net=) — {url}', { url: a.url });
    if (saved) return t('Custom address — “Reset to automatic” goes back to this site’s server');
    return t('{source} — {url}', { source: t(sourceLabel(a.source)), url: a.url });
  }
  const server = textRow({
    id: 'nt-set-server',
    label: t('Server address'),
    help: t('Leave it on Automatic: the game connects to the Echoes server of the site you opened it from (wss:// on an https site) — players just open the host’s link. Enter ws://host:port/echoes only to use a different server, e.g. ws://192.168.1.20:7800/echoes for `npm run net -- --host 0.0.0.0` on another computer. An empty address is Automatic.'),
    value: settings.get('net.serverUrl'),
    maxLength: 200,
    placeholder: t('Automatic'),
    onCommit: (v) => {
      if (!String(v || '').trim()) {
        resetAuto();
        return;
      }
      const r = validateServerUrl(v, { https: httpsPage() });
      if (!r.ok) {
        server.setNote(
          r.reason === 'insecure_on_https'
            ? t('This page is served over https, so the browser only allows secure (wss://) servers.')
            : r.reason === 'not_ws'
              ? t('Server addresses start with ws:// or wss://')
              : r.reason === 'incomplete'
                ? t('“{typed}” isn’t a full address (it would reach {host}) — e.g. ws://192.168.1.20:7800/echoes', { typed: r.typed, host: r.host })
                : r.reason === 'unroutable'
                  ? t('{host} is where a server listens, not an address to reach — use the host computer’s address, e.g. ws://192.168.1.20:7800/echoes', { host: r.host })
                  : t('Not a server address — e.g. ws://192.168.1.20:7800/echoes')
        );
        return;
      }
      settings.set('net.serverUrl', r.url, { source: 'ui' });
      const n = netSvc();
      if (n) n.serverUrl = r.url; // applies at once, also on a ?net= page
      server.set(r.url);
      server.setNote(t('Saved — press Check to test it'));
      syncAuto();
    },
    onCancel: () => server.setNote(t('Change cancelled. {status}', { status: autoNote() })),
  });
  server.setNote(autoNote());
  const check = mkBtn(t('Check'), 'nt-set-check', {
    onPress: async () => {
      const n = netSvc();
      if (!n) return;
      server.setNote(t('Checking…'));
      check.disabled = true;
      try {
        const r = await n.probe(settings.get('net.serverUrl') || null);
        server.setNote(
          r.state === 'online'
            ? r.lanUrls && r.lanUrls.length
              ? t('Online — {url} answered in {ms} ms · LAN {lan}', { url: r.url, ms: r.ms, lan: r.lanUrls.join(', ') })
              : t('Online — {url} answered in {ms} ms', { url: r.url, ms: r.ms })
            : r.state === 'update'
              ? t('A new version of Echoes is available — reload the page')
              : t('Can’t reach {url} ({error}) — is the server running there?', { url: r.url || t('it'), error: r.error || t('no answer') })
        );
      } finally {
        check.disabled = false;
      }
    },
  });
  check.style.minWidth = 'calc(110px * var(--ap-s, 1))';
  check.style.minHeight = HIT;
  server.ctl.appendChild(check);

  // "Reset to automatic" (its own row so the address row keeps its width).
  const autoRow = document.createElement('div');
  autoRow.className = 'ap-row nt-autorow';
  autoRow.dataset.helpTitle = t('Reset to automatic');
  autoRow.dataset.help = t('Forget the custom server address and connect to the Echoes server of the site you opened the game from — what every player gets without touching a setting.');
  autoRow.dataset.rowId = 'nt-set-autorow';
  const autoLab = document.createElement('span');
  autoLab.className = 'ap-label';
  autoLab.textContent = t('Automatic server');
  const autoCtl = document.createElement('div');
  autoCtl.className = 'ap-ctl';
  const autoNoteEl = document.createElement('div');
  autoNoteEl.className = 'ap-note';
  const autoBtn = mkBtn(t('Reset to automatic'), 'nt-set-auto', { onPress: () => resetAuto() });
  autoBtn.style.minHeight = HIT;
  autoCtl.appendChild(autoBtn);
  autoRow.append(autoLab, autoCtl, autoNoteEl);
  function resetAuto() {
    settings.set('net.serverUrl', '', { source: 'ui' });
    const n = netSvc();
    if (n) n.serverUrl = '';
    server.set('');
    server.setNote(autoNote());
    syncAuto();
  }
  function syncAuto() {
    const custom = !!settings.get('net.serverUrl');
    autoBtn.disabled = !custom;
    autoBtn.setAttribute('aria-disabled', custom ? 'false' : 'true');
    const a = info();
    const site = a.site || null;
    autoNoteEl.textContent = custom
      ? t('Uses {site} instead of the custom address', { site: site || t('this computer’s server') })
      : t('In use — {source}: {url}', { source: t(sourceLabel(a.source)), url: a.url });
    server.input.placeholder = t('Automatic');
  }
  syncAuto();

  const stats = widgets.toggle({
    id: 'nt-set-stats',
    label: t('Connection details in game'),
    value: settings.get('net.showStats'),
    help: t('Adds a line under the in-game connection chip: round trip, jitter, loss, snapshot rate and bandwidth.'),
    onChange: (v) => settings.set('net.showStats', !!v, { source: 'ui' }),
  });
  stats.setNote(t('Round trip, loss and bandwidth while playing online'));

  const how = document.createElement('p');
  how.className = 'ap-note';
  how.textContent = t('Players join by opening the host’s link — the game finds the Echoes server of the site it came from, so there is nothing to set here. Hosting: “npm run serve” serves the game and multiplayer from one port (README ▸ Host it on a server); with the dev or preview server, run “npm run net” beside it. Traffic travels over WebSocket; the game models packet loss and delay on top and never pauses for one player.');

  el.append(name.el, server.el, autoRow, stats.el, how);
  const offs = [
    settings.subscribe('net.playerName', (v) => name.set(v)),
    settings.subscribe('net.serverUrl', (v) => {
      server.set(v);
      syncAuto();
    }),
    settings.subscribe('net.showStats', (v) => stats.set(!!v)),
  ];
  return {
    el,
    onShow() {
      name.set(settings.get('net.playerName'));
      server.set(settings.get('net.serverUrl'));
      server.setNote(autoNote());
      syncAuto();
      stats.set(!!settings.get('net.showStats'));
    },
    reset() {
      settings.reset('net');
      // settings.reset() also returns the address to Automatic.
      const n = netSvc();
      if (n) n.serverUrl = '';
      server.setNote(autoNote());
      syncAuto();
    },
    destroy() {
      for (const off of offs) off();
    },
  };
}

let registered = false;
export function registerNetworkTab() {
  if (registered) return;
  registered = true;
  registerSettingsTab({ id: 'network', label: 'Network', order: 50, build: buildNetworkTab });
}
