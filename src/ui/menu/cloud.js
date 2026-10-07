// Settings ▸ Gameplay ▸ Cloud save (docs/CLOUD_SAVES.md).
//   Save to cloud        uploads the whole local save (profile + every slot)
//                        to this site's session server and shows the short
//                        code it is kept under; saving again keeps the code
//   Copy code            the code to the clipboard
//   Cloud code + Load    fetches a code's save and, after a confirm, replaces
//                        this device's profile and slots, then reloads
//   Backup file          the same bundle as a file on disk, and back — the
//                        fallback when the server has forgotten a code
// Nothing syncs on its own: the local save is the game's save, and it changes
// only when the player loads.
import { registerSettingsRow, service } from '../../app/registry.js';
import { t, tn, getLanguage } from '../../i18n/index.js';
import { resolveServerAddress } from '../../net/address.js';
import { textRow } from './tabs/network.js';

const REMEMBER_KEY = 'echoes.cloud.v1';
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const TIMEOUT_MS = 30000;

export function normalizeCode(raw) {
  const s = String(raw == null ? '' : raw)
    .toUpperCase()
    .replace(/[\s-]+/g, '');
  if (s.length !== 8) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}
const formatCode = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;

function remembered() {
  try {
    const j = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
    return j && typeof j.code === 'string' && normalizeCode(j.code) ? j : null;
  } catch {
    return null;
  }
}
function remember(rec) {
  try {
    localStorage.setItem(REMEMBER_KEY, JSON.stringify(rec));
  } catch {
    /* the code is still on screen */
  }
}

// The HTTP origin of the session server the game would connect to.
function cloudBase() {
  let ws = null;
  try {
    const n = service('net');
    ws = n && typeof n.addressInfo === 'function' ? n.addressInfo().url : null;
  } catch {
    ws = null;
  }
  if (!ws) ws = resolveServerAddress().url;
  try {
    const u = new URL(ws);
    return `${u.protocol === 'wss:' ? 'https:' : 'http:'}//${u.host}`;
  } catch {
    return '';
  }
}

async function call(path, { method = 'GET', body = null } = {}) {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : 0;
  try {
    const res = await fetch(`${cloudBase()}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: ctl ? ctl.signal : undefined,
    });
    let j = null;
    try {
      j = await res.json();
    } catch {
      j = null;
    }
    if (j && typeof j === 'object') return { status: res.status, ...j, ok: !!j.ok && res.ok };
    return { ok: false, status: res.status, error: res.status === 413 ? 'too_large' : 'server' };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function when(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  try {
    return d.toLocaleString(getLanguage(), { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return d.toLocaleString();
  }
}

function errorLine(r, code) {
  switch (r.error) {
    case 'bad_code':
      return t('That isn’t a cloud code. Codes are 8 letters and digits, like ABCD-EFGH (there is no 0, O, 1, I or L).');
    case 'not_found':
      return t('No cloud save under {code}. It may have expired, or the server forgot it when it restarted. Save to cloud again on the device that made it, or load a backup file.', { code: code ? formatCode(code) : '' });
    case 'network':
      return t('Couldn’t reach the server. Check your connection and try again.');
    case 'busy':
      return t('Too many tries. Wait a few minutes and try again.');
    case 'too_large':
      return t('This save is too large for the cloud. Save a backup file instead.');
    case 'newer':
      return t('This save comes from a newer version of Echoes. Reload the page to update the game, then try again.');
    case 'corrupt':
    case 'not_a_bundle':
    case 'empty':
      return t('This save is damaged or empty and can’t be loaded.');
    case 'quota':
      return t('This device has no room left for the save. Nothing was changed.');
    default:
      return t('The server couldn’t do that right now ({status}). Try again later.', { status: r.status || r.error || '?' });
  }
}

export function registerCloudSaveRows({ app, world = null }) {
  // A run in progress (not the camp): its loss is named in the confirm.
  const inRun = () => {
    if (app.state !== 'playing') return false;
    try {
      const r = world && typeof world.runSystem === 'function' ? world.runSystem() : null;
      return !!(r && typeof r.isActive === 'function' && r.isActive());
    } catch {
      return false;
    }
  };
  const save = () => service('save');
  const toast = (text, tone = 'info', ms) => {
    if (typeof app.toast === 'function') app.toast(text, ms ? { tone, ms } : { tone });
  };
  let serverInfo = null; // GET /cloud/info: { durable, ttlDays, store }

  const keepLine = (durable) =>
    durable ? t('Kept for a year after your last cloud save.') : t('Kept until the server restarts: on this free hosting that is about 15 minutes after the last player leaves, and every update.');
  const saveHelp = (durable) =>
    durable
      ? t('Uploads your profile (records, Embers, unlocks) and every save slot to this game’s server and shows a short code. Enter the code on another device with Load from cloud. Saving again keeps the same code. The server keeps it for a year after your last cloud save. Your save on this device is never changed.')
      : t('Uploads your profile (records, Embers, unlocks) and every save slot to this game’s server and shows a short code. Enter the code on another device with Load from cloud. Saving again keeps the same code. This site runs on free hosting whose server forgets cloud saves when it restarts (about 15 minutes after the last player leaves, and on every update), so use the code right away and keep a backup file for anything longer. Your save on this device is never changed.');

  // Load: confirm, replace, reload. `source` is the code or the file name.
  async function confirmAndApply(bundle, source, kind) {
    const s = save();
    if (!s || typeof s.readBundle !== 'function') return { ok: false, error: 'server' };
    const r = s.readBundle(bundle);
    if (!r.ok) return r;
    const sum = r.summary;
    const parts = [];
    if (sum.savedAt) parts.push(t('Saved {when}', { when: when(sum.savedAt) }));
    parts.push(tn(sum.slots, '{n} save slot', '{n} save slots'));
    parts.push(tn(sum.embers, '{n} Ember', '{n} Embers'));
    const playing = inRun();
    const ok =
      typeof app.confirm === 'function'
        ? await app.confirm({
            title: kind === 'file' ? t('Load this backup file?') : t('Load cloud save {code}?', { code: formatCode(source) }),
            body: `${parts.join(' · ')}\n\n${t('It replaces the profile (records, Embers, unlocks) and every save slot on this device, then the game reloads. Save a backup file first if you want to keep what is here.')}${
              playing ? `\n\n${t('You are in a run: it is replaced too. After the reload, Continue resumes the loaded save’s run at the start of its room. An online game is left.')}` : ''
            }`,
            confirmLabel: t('Replace and reload'),
            cancelLabel: t('Cancel'),
            danger: true,
          })
        : true;
    if (!ok) return { ok: false, cancelled: true };
    const w = s.applyBundle(bundle);
    if (!w.ok) return w;
    if (kind === 'cloud') {
      const cur = remembered();
      remember({ code: source, token: cur && cur.code === source ? cur.token : null, savedAt: sum.savedAt || null, loaded: true });
    }
    toast(t('Loaded. Reloading…'), 'good');
    setTimeout(() => {
      try {
        window.location.reload();
      } catch {
        /* the player reloads */
      }
    }, 350);
    return { ok: true, reloading: true };
  }

  registerSettingsRow('gameplay', {
    id: 'cloud-save',
    order: 95,
    build(ctx) {
      const { widgets } = ctx;
      const wrap = document.createElement('div');
      wrap.className = 'ap-cloud';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = 'calc(10px * var(--ap-s, 1))';
      const head = widgets.section(t('Cloud save'));
      const status = widgets.note('', 'info');
      status.id = 'ap-cloud-status';
      let busy = false;

      function paintStatus() {
        const rec = remembered();
        if (!rec) status.textContent = t('No cloud save yet. Your save lives on this device.');
        else if (rec.loaded) status.textContent = t('Loaded from cloud code {code}.', { code: formatCode(rec.code) });
        else
          status.textContent = `${t('Your cloud code: {code}', { code: formatCode(rec.code) })} · ${t('saved {when}', { when: when(rec.savedAt) })}${serverInfo ? ` · ${keepLine(!!serverInfo.durable)}` : ''}`;
        copyBtn.setDisabled(!rec, t('No code yet'));
      }

      const saveBtn = widgets.button({
        id: 'ap-cloud-save',
        label: t('Save to cloud'),
        variant: 'primary',
        help: saveHelp(false),
        onPress: async () => {
          if (busy) return;
          const s = save();
          if (!s || typeof s.cloudBundle !== 'function') return;
          busy = true;
          status.textContent = t('Saving to the cloud…');
          const prev = remembered();
          const r = await call('/cloud/save', {
            method: 'POST',
            body: { bundle: s.cloudBundle(), code: prev && prev.token ? prev.code : null, token: prev && prev.token ? prev.token : null },
          });
          busy = false;
          if (!r.ok) {
            paintStatus();
            status.textContent = errorLine(r);
            toast(errorLine(r), 'warn', 5200);
            return;
          }
          serverInfo = { durable: !!r.durable, ttlDays: r.ttlDays, store: r.store };
          remember({ code: r.code, token: r.token, savedAt: r.savedAt, durable: !!r.durable });
          codeRow.set(formatCode(r.code));
          paintStatus();
          saveBtn.el.dataset.help = saveHelp(!!r.durable);
          toast(t('Saved to the cloud. Your code: {code}', { code: formatCode(r.code) }), 'good', 6000);
        },
      });

      const copyBtn = widgets.button({
        id: 'ap-cloud-copy',
        label: t('Copy code'),
        help: t('Copies your cloud code so you can paste it somewhere safe or on another device.'),
        onPress: async () => {
          const rec = remembered();
          if (!rec) return;
          const text = formatCode(rec.code);
          try {
            await navigator.clipboard.writeText(text);
            toast(t('Code copied: {code}', { code: text }), 'good');
          } catch {
            codeRow.set(text);
            codeRow.input.focus();
            codeRow.input.select();
            toast(t('Your code: {code}', { code: text }), 'info');
          }
        },
      });

      async function loadCode(raw) {
        if (busy) return;
        const code = normalizeCode(raw);
        if (!code) {
          codeRow.setNote(errorLine({ error: 'bad_code' }));
          return;
        }
        busy = true;
        codeRow.setNote(t('Looking up {code}…', { code: formatCode(code) }));
        const r = await call(`/cloud/save/${code}`);
        busy = false;
        if (!r.ok) {
          codeRow.setNote(errorLine(r, code));
          return;
        }
        codeRow.set(formatCode(code));
        const a = await confirmAndApply(r.bundle, code, 'cloud');
        if (a.cancelled) codeRow.setNote(t('Not loaded. Your save on this device is unchanged.'));
        else if (!a.ok) codeRow.setNote(errorLine(a, code));
        else codeRow.setNote(t('Loaded. Reloading…'));
      }

      const codeRow = textRow({
        id: 'ap-cloud-code',
        label: t('Cloud code'),
        help: t('Type the code another device showed after Save to cloud (like ABCD-EFGH), then press Load from cloud.'),
        value: '',
        maxLength: 12,
        placeholder: 'ABCD-EFGH',
        onCommit: (v) => {
          if (String(v || '').trim()) loadCode(v);
        },
        onCancel: () => codeRow.setNote(''),
      });
      codeRow.input.style.maxWidth = 'calc(260px * var(--ap-s, 1))';
      codeRow.input.style.textTransform = 'uppercase';
      codeRow.input.style.letterSpacing = '0.08em';

      const loadBtn = widgets.button({
        id: 'ap-cloud-load',
        label: t('Load from cloud'),
        help: t('Fetches the save under the code above and, after you confirm, replaces the profile and save slots on this device with it. The game then reloads.'),
        onPress: () => loadCode(codeRow.input.value),
      });

      const file = document.createElement('input');
      file.type = 'file';
      file.accept = '.json,application/json';
      file.style.display = 'none';
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0];
        file.value = '';
        if (!f) return;
        if (f.size > 4 * 1024 * 1024) {
          backupNote.textContent = errorLine({ error: 'corrupt' });
          return;
        }
        let text = '';
        try {
          text = await f.text();
        } catch {
          backupNote.textContent = errorLine({ error: 'corrupt' });
          return;
        }
        const a = await confirmAndApply(text, f.name, 'file');
        if (a.cancelled) backupNote.textContent = t('Not loaded. Your save on this device is unchanged.');
        else if (!a.ok) backupNote.textContent = errorLine(a);
      });
      const backupSave = widgets.button({
        id: 'ap-cloud-backup',
        label: t('Save a backup file'),
        help: t('Downloads your profile and every save slot as one file. Load it here on any device, even when the server has forgotten your cloud code.'),
        onPress: () => {
          const s = save();
          const r = s && typeof s.exportBackup === 'function' ? s.exportBackup() : { ok: false };
          if (r.ok) toast(t('Backup file saved: {file}', { file: r.filename }), 'good', 4200);
          else toast(t('Couldn’t make the backup file'), 'warn');
        },
      });
      const backupLoad = widgets.button({
        id: 'ap-cloud-restore',
        label: t('Load a backup file'),
        help: t('Opens a backup file and, after you confirm, replaces the profile and save slots on this device with it. The game then reloads.'),
        onPress: () => file.click(),
      });
      const backupNote = widgets.note('', 'info');
      backupNote.id = 'ap-cloud-backup-note';

      wrap.append(head, saveBtn.el, copyBtn.el, status, codeRow.el, loadBtn.el, backupSave.el, backupLoad.el, backupNote, file);

      async function refreshInfo() {
        const r = await call('/cloud/info');
        if (r.ok) {
          serverInfo = { durable: !!r.durable, ttlDays: r.ttlDays, store: r.store };
          saveBtn.el.dataset.help = saveHelp(!!r.durable);
          paintStatus();
        }
      }
      paintStatus();
      const rec = remembered();
      if (rec) codeRow.set(formatCode(rec.code));
      refreshInfo();
      return { el: wrap, sync: paintStatus };
    },
  });

  return {
    // Probe surface: window.__echoes.cloud()
    debug: () => ({ base: cloudBase(), remembered: remembered(), serverInfo }),
    normalizeCode,
  };
}
