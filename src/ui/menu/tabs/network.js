// Settings ▸ Network (docs/gauntlet/PLAN.md §3.2 keys net.playerName /
// net.serverUrl; tab order 50). Owner: M5b.
//   Player name        net.playerName — the name plate in lobbies and the
//                      in-game net HUD (≤ 16 characters)
//   Server address     net.serverUrl — ws:// or wss:// (wss:// only when the
//                      page itself is served over https: browsers block ws://
//                      from an https page); Check probes it right here
//   Connection details net.showStats — the rtt / loss / snapshot line under
//                      the in-game connection chip
// plus the honest note on how multiplayer is hosted (a small server on the
// host's computer: `npm run net`, `--host 0.0.0.0` for LAN play).
import { registerSettingsTab, service } from '../../../app/registry.js';
import { HIT } from '../../../app/style.js';
import { installMpStyle, mkBtn, httpsPage } from '../mpmenu.js';
import { validateServerUrl } from '../../../net/lobbyClient.js';
import { sanitizeName } from '../../../net/protocol/messages.js';
import { DEFAULT_URL } from '../../../net/protocol/constants.js';

function textRow({ id, label, help, value, maxLength, onCommit, placeholder = '' }) {
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
  input.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') onCommit(input.value);
  });
  return { el: row, input, ctl, setNote: (t) => (note.textContent = t || ''), set: (v) => (input.value = v) };
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
    label: 'Player name',
    help: 'The name other players see in the lobby and above your seat in the connection chip. Up to 16 characters.',
    value: settings.get('net.playerName'),
    maxLength: 16,
    onCommit: (v) => {
      const clean = sanitizeName(v, '');
      if (!clean) {
        name.set(settings.get('net.playerName'));
        name.setNote('A name needs at least one visible character');
        return;
      }
      settings.set('net.playerName', clean, { source: 'ui' });
      name.set(clean);
      name.setNote('Saved — shown in lobbies from now on');
    },
  });
  name.setNote('Shown in lobbies and on the connection chip');

  const server = textRow({
    id: 'nt-set-server',
    label: 'Server address',
    help: 'Where the Echoes session server runs — ws://host:port/echoes. The host starts it on their computer with `npm run net` (add `-- --host 0.0.0.0` so players on the same network can reach it; they then use ws://<host-ip>:7800/echoes).',
    value: settings.get('net.serverUrl'),
    maxLength: 200,
    placeholder: DEFAULT_URL,
    onCommit: (v) => {
      const r = validateServerUrl(v, { https: httpsPage() });
      if (!r.ok) {
        server.setNote(
          r.reason === 'insecure_on_https'
            ? 'This page is served over https, so the browser only allows secure (wss://) servers.'
            : r.reason === 'not_ws'
              ? 'Server addresses start with ws:// or wss://'
              : 'Not a server address — e.g. ws://192.168.1.20:7800/echoes'
        );
        return;
      }
      settings.set('net.serverUrl', r.url, { source: 'ui' });
      server.set(r.url);
      server.setNote('Saved — press Check to test it');
    },
  });
  server.setNote(httpsPage() ? 'This page is https: only wss:// servers are allowed' : 'ws:// or wss:// — the default is this computer');
  const check = mkBtn('Check', 'nt-set-check', {
    onPress: async () => {
      const n = service('net');
      if (!n) return;
      server.setNote('Checking…');
      check.disabled = true;
      try {
        const r = await n.probe(settings.get('net.serverUrl'));
        server.setNote(r.state === 'online' ? `Online — answered in ${r.ms} ms${r.lanUrls && r.lanUrls.length ? ` · LAN ${r.lanUrls.join(', ')}` : ''}` : `Can’t reach it (${r.error || 'no answer'}) — is \`npm run net\` running there?`);
      } finally {
        check.disabled = false;
      }
    },
  });
  check.style.minWidth = 'calc(110px * var(--ap-s, 1))';
  check.style.minHeight = HIT;
  server.ctl.appendChild(check);

  const stats = widgets.toggle({
    id: 'nt-set-stats',
    label: 'Connection details in game',
    value: settings.get('net.showStats'),
    help: 'Adds a line under the in-game connection chip: round trip, jitter, loss, snapshot rate and bandwidth.',
    onChange: (v) => settings.set('net.showStats', !!v, { source: 'ui' }),
  });
  stats.setNote('Round trip, loss and bandwidth while playing online');

  const how = document.createElement('p');
  how.className = 'ap-note';
  how.textContent =
    'Multiplayer runs through a small session server on the host’s computer: in the game folder run “npm run net” (friends on the same network: “npm run net -- --host 0.0.0.0”, then they enter ws://<host-ip>:7800/echoes here). Traffic travels over WebSocket; the game models packet loss and delay on top and never pauses for one player.';

  el.append(name.el, server.el, stats.el, how);
  const offs = [
    settings.subscribe('net.playerName', (v) => name.set(v)),
    settings.subscribe('net.serverUrl', (v) => server.set(v)),
    settings.subscribe('net.showStats', (v) => stats.set(!!v)),
  ];
  return {
    el,
    onShow() {
      name.set(settings.get('net.playerName'));
      server.set(settings.get('net.serverUrl'));
      stats.set(!!settings.get('net.showStats'));
    },
    reset() {
      settings.reset('net');
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
