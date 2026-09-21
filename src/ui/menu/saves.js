// Save-slot management menu (docs/gauntlet/PLAN.md §1.3 'saves', §3.4, gate
// G2.3). Owner: M2. Registered by main.js @gnt:SAVE (registerSaveScreens).
//
// params: { mode: 'load' | 'save' }. From the title only Load exists; in a
// running game (the pause menu, INT) the header offers Save | Load tabs
// (Q / E, LB / RB). Layout: the slot list (left, scrolls) and the detail
// panel of the SELECTED slot (right): a 256 x 144 thumbnail, where / when /
// playtime / party HP / build, and the actions.
//   Load            (Enter / A on a row)   in-game loads ask first
//   Save / Overwrite (Enter / A in Save)   overwriting asks first
//   Rename          (F2 / Y)               a text dialog, 32 characters
//   Export          downloads the slot as echoes-<slot>-<date>.json
//   Delete          (Delete / X)           asks first (danger)
//   Restore backup  a damaged slot with a valid .bak offers it
//   Import…         (footer) a .json file into the first empty slot
// Damaged / newer-version slots stay listed with the reason and the actions
// that still make sense (restore the backup, export the raw file, delete).
// Palette: Void Charcoal plates, Parchment ink, Warm Grey chrome, Hearth
// Amber focus (the thumbnails are pictures of the game, like the backdrop).
import { service, registerScreen } from '../../app/registry.js';
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { createHints } from './hints.js';
import { createRecordsScreen } from './records.js';

const SAVE_ERRORS = {
  quota: 'Not enough browser storage — delete a slot or export saves to files.',
  unavailable: "This browser isn't letting Echoes store saves (private mode?). Export to a file instead.",
  not_allowed: "You can't save right now.",
  busy: 'Another save is still being written — try again in a moment.',
  missing: 'That slot is empty.',
  corrupt: 'That save file is damaged.',
  version: 'That save was made by a newer version of Echoes — this build cannot read it.',
  hash: 'That save failed its integrity check — it was changed or damaged.',
  full: 'Every save slot is in use — delete one first, or pick a slot to replace.',
};

const ROOM_LABEL = { kill_all: 'Hunt', defend: 'Defend', shop: 'Shop', boss: 'The Hollow Stag' };
const PHASE_LABEL = {
  reward: 'at the reward',
  path: 'choosing a path',
  shop: 'at the shop',
  victory: 'victory card',
  defeat: 'defeat card',
  fade: 'between rooms',
};
const CLASS_NAME = { healer: 'Healer', tank: 'Tank', swordsman: 'Swordsman', archer: 'Archer' };

// --------------------------------------------------------------- format --
export function fmtPlaytime(sec) {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return `${m} min ${String(ss).padStart(2, '0')} s`;
  return `${ss} s`;
}
export function fmtAgo(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}
export function fmtDate(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function whereLine(m) {
  const meta = (m && m.meta) || {};
  if (meta.mode === 'run' && meta.room) {
    const act = meta.actName || `Act ${meta.act || 1}`;
    const kind = ROOM_LABEL[meta.roomMode] || '';
    const phase = PHASE_LABEL[meta.phase] ? ` — ${PHASE_LABEL[meta.phase]}` : '';
    return `${act} · Room ${meta.room} of 8${kind ? ` · ${kind}` : ''}${phase}`;
  }
  if (meta.phase === 'victory' || meta.phase === 'defeat') return `Camp — ${PHASE_LABEL[meta.phase]}`;
  if (meta.mode === 'run') return 'In the arena';
  return 'Camp — at the hearth';
}

// ---------------------------------------------------------------- style --
const CSS = `
.sv-screen .sv-panel {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(${px(1560)}, calc(100vw - 32px)); height: min(${px(900)}, calc(100vh - 32px));
  display: flex; flex-direction: column; padding: ${px(22)} ${px(30)} ${px(18)};
}
.sv-head { display: flex; align-items: center; gap: ${px(26)}; padding-bottom: ${px(12)}; border-bottom: 1px solid ${P.warmGrey}44; }
.sv-head .sv-sub { font-size: ${px(22)}; color: ${P.warmGrey}; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sv-body { flex: 1 1 auto; min-height: 0; display: flex; gap: ${px(24)}; padding-top: ${px(14)}; }
.sv-list {
  flex: 1 1 58%; min-width: 0; overflow-y: auto; overflow-x: hidden;
  display: flex; flex-direction: column; gap: ${px(10)}; padding: ${px(6)} ${px(14)} ${px(6)} ${px(6)};
  scrollbar-color: ${P.warmGrey}88 transparent;
}
.sv-sect { margin: ${px(8)} 0 ${px(2)}; font-size: ${px(22)}; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: ${P.warmGrey}; }
.sv-row {
  display: grid; grid-template-columns: ${px(160)} minmax(0, 1fr) auto; align-items: center; gap: ${px(18)};
  width: 100%; min-height: ${px(106)}; padding: ${px(8)} ${px(16)} ${px(8)} ${px(8)}; text-align: left;
  background: ${P.voidCharcoal}B3; border: max(2px, ${px(2)}) solid ${P.warmGrey}44; border-radius: ${px(14)};
  color: ${P.parchment}; font-family: inherit; cursor: pointer; position: relative;
  transition: transform 90ms ease, box-shadow 90ms ease, border-color 90ms ease, background 90ms ease;
}
.sv-row.sv-selected { border-color: ${P.warmGrey}AA; background: #2C2823; }
.sv-row.ap-focus {
  outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(2)};
  transform: translateY(${px(-1)}) scale(1.01); border-color: ${P.hearthAmber}AA;
  box-shadow: 0 ${px(8)} ${px(22)} #000000AA;
}
.sv-thumb {
  width: ${px(160)}; height: ${px(90)}; border-radius: ${px(8)}; overflow: hidden; flex: 0 0 auto;
  background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}55;
  display: flex; align-items: center; justify-content: center; color: ${P.warmGrey}; font-size: ${px(30)};
}
.sv-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sv-txt { min-width: 0; display: flex; flex-direction: column; gap: ${px(2)}; }
.sv-name { font-size: ${px(26)}; font-weight: 800; letter-spacing: 0.03em; color: ${P.parchment}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sv-line { font-size: ${px(22)}; color: ${P.bone}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sv-dim { color: ${P.warmGrey}; }
.sv-tag {
  display: inline-block; margin-left: ${px(10)}; padding: 0 ${px(10)}; border-radius: 999px;
  font-size: ${px(20)}; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; vertical-align: middle;
  border: 1px solid ${P.warmGrey}88; color: ${P.bone};
}
.sv-tag.sv-bad { border-color: ${P.parchment}; color: ${P.parchment}; background: ${P.bruiseUmber}; }
.sv-side { display: flex; flex-direction: column; align-items: flex-end; gap: ${px(6)}; }
.sv-pips { display: flex; gap: ${px(5)}; }
.sv-pip { width: ${px(34)}; height: ${px(10)}; border-radius: 999px; background: ${P.bruiseUmber}; border: 1px solid ${P.warmGrey}66; overflow: hidden; }
.sv-pip > i { display: block; height: 100%; background: ${P.bone}; }
.sv-pip.sv-down { background: transparent; border-style: dashed; }
.sv-glint { font-size: ${px(22)}; color: ${P.paleGold}; font-weight: 700; font-variant-numeric: tabular-nums; }
.sv-detail {
  flex: 0 0 38%; min-width: 0; display: flex; flex-direction: column; gap: ${px(10)};
  padding: ${px(18)} ${px(22)}; border-radius: ${px(14)}; background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}44; overflow: hidden;
}
.sv-big { width: 100%; aspect-ratio: 16 / 9; max-height: 34vh; border-radius: ${px(10)}; overflow: hidden; background: #161411;
  border: 1px solid ${P.warmGrey}55; display: flex; align-items: center; justify-content: center; color: ${P.warmGrey}; font-size: ${px(24)}; flex: 0 0 auto; }
.sv-big img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sv-dname { font-size: ${px(30)}; line-height: 1.3; padding-bottom: ${px(2)}; font-weight: 800; letter-spacing: 0.04em; color: ${P.parchment}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 0 auto; }
.sv-dl { display: grid; grid-template-columns: auto minmax(0, 1fr); align-content: start; gap: ${px(2)} ${px(14)}; margin: 0; font-size: ${px(22)}; line-height: 1.35; overflow-y: auto; overflow-x: hidden; min-height: 0; flex: 1 1 auto; scrollbar-color: ${P.warmGrey}88 transparent; }
.sv-dl dt { color: ${P.warmGrey}; margin: 0; white-space: nowrap; }
.sv-dl dd { color: ${P.bone}; margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-msg { font-size: ${px(22)}; color: ${P.parchment}; line-height: 1.4; white-space: pre-line; overflow-y: auto; min-height: 0; flex: 0 1 auto; }
.sv-acts { display: flex; flex-wrap: wrap; gap: ${px(8)}; margin-top: auto; flex: 0 0 auto; padding-top: ${px(4)}; }
.sv-acts .ap-btn { min-width: ${px(96)}; padding: 0 ${px(14)}; font-size: ${px(22)}; letter-spacing: 0.04em; }
.sv-empty { margin: auto; text-align: center; font-size: ${px(24)}; color: ${P.bone}; line-height: 1.5; max-width: ${px(620)}; }
.sv-foot { display: flex; align-items: center; gap: ${px(16)}; padding-top: ${px(12)}; border-top: 1px solid ${P.warmGrey}44; margin-top: ${px(10)}; }
.sv-foot .ap-hints { flex: 1 1 auto; min-width: 0; }
.sv-modes { display: flex; gap: ${px(8)}; }
.sv-usage { font-size: ${px(22)}; color: ${P.warmGrey}; white-space: nowrap; }
.sv-rename .ap-dlg input {
  width: 100%; min-height: ${px(56)}; padding: 0 ${px(16)}; font-family: inherit; font-size: ${px(26)};
  color: ${P.parchment}; background: #161411; border: max(2px, ${px(2)}) solid ${P.warmGrey}88; border-radius: ${px(10)};
}
.sv-rename .ap-dlg input.ap-focus { outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(2)}; border-color: ${P.hearthAmber}AA; }
.sv-rename .sv-count { font-size: ${px(20)}; color: ${P.warmGrey}; text-align: right; }
@media (max-width: 1180px) {
  .sv-detail { flex-basis: 40%; padding: ${px(14)} ${px(16)}; }
  .sv-row { grid-template-columns: ${px(128)} minmax(0, 1fr) auto; min-height: ${px(92)}; }
  .sv-thumb { width: ${px(128)}; height: ${px(72)}; }
  .sv-side .sv-pips { display: none; }
}
@media (max-height: 700px) {
  .sv-dl { font-size: ${px(22)}; line-height: 1.25; }
  .sv-big { max-height: 26vh; }
}
`;
let styled = false;
function installSaveStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'sv-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function mkBtn(label, id, cls, onPress) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `ap-btn ${cls || ''}`.trim();
  b.id = id;
  b.textContent = label;
  b.setAttribute('data-nav', '');
  b.addEventListener('click', () => {
    if (!b.disabled) onPress();
  });
  return b;
}

// ------------------------------------------------------------ the screen --
export function createSavesScreen(ctx) {
  installSaveStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'sv-screen';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="sv-panel ap-plate">
      <div class="sv-head">
        <h2 class="ap-h2 sv-title">Load Game</h2>
        <div class="sv-modes"></div>
        <div class="sv-sub"></div>
        <div class="sv-usage"></div>
      </div>
      <div class="sv-body">
        <div class="sv-list" role="listbox"></div>
        <aside class="sv-detail" aria-live="polite"></aside>
      </div>
      <div class="sv-foot"></div>
    </div>`;
  const titleEl = el.querySelector('.sv-title');
  const modesEl = el.querySelector('.sv-modes');
  const subEl = el.querySelector('.sv-sub');
  const usageEl = el.querySelector('.sv-usage');
  const listEl = el.querySelector('.sv-list');
  const detailEl = el.querySelector('.sv-detail');
  const footEl = el.querySelector('.sv-foot');
  const hints = createHints(app, [
    ['move', 'Select'],
    ['confirm', 'Choose'],
    ['secondary', 'Delete'],
    ['back', 'Back'],
  ]);
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.style.display = 'none';
  fileInput.id = 'sv-import-file';
  el.appendChild(fileInput);
  const importBtn = mkBtn('Import…', 'sv-import', '', () => fileInput.click());
  const backBtn = mkBtn('Back', 'sv-back', 'ap-primary', () => close());
  footEl.append(hints.el, importBtn, backBtn);

  let mode = 'load';
  let open = false;
  let selectedId = null;
  let busy = false;
  const rowEls = new Map(); // slot id -> row button

  const save = () => service('save');
  const inGame = () => app.state === 'playing';

  function close() {
    if (manager.top() === 'saves') manager.pop();
  }

  function entries() {
    const s = save();
    if (!s) return [];
    const all = s.list();
    const byId = new Map(all.map((m) => [m.id, m]));
    if (mode === 'save') return s.manualSlots().map((id) => byId.get(id) ?? { id, empty: true, name: defaultName(id) });
    return all;
  }
  function defaultName(id) {
    const n = Number(String(id).split('-')[1]);
    return Number.isFinite(n) ? `Slot ${n}` : id;
  }

  function thumbEl(id, big = false) {
    const box = document.createElement('div');
    box.className = big ? 'sv-big' : 'sv-thumb';
    const s = save();
    const url = s && id ? s.thumb(id) : null;
    if (url && url.startsWith('data:image/')) {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = url;
      box.appendChild(img);
    } else box.textContent = big ? 'No picture' : '◇';
    return box;
  }

  function pips(meta) {
    const wrap = document.createElement('div');
    wrap.className = 'sv-pips';
    for (const m of (meta && meta.party) || []) {
      const p = document.createElement('div');
      const frac = m.maxHp > 0 ? Math.max(0, Math.min(1, m.hp / m.maxHp)) : 0;
      p.className = frac <= 0 ? 'sv-pip sv-down' : 'sv-pip';
      p.title = `${CLASS_NAME[m.classId] || m.classId} ${Math.round(m.hp)} / ${m.maxHp}`;
      const i = document.createElement('i');
      i.style.width = `${Math.round(frac * 100)}%`;
      p.appendChild(i);
      wrap.appendChild(p);
    }
    return wrap;
  }

  function tag(text, bad = false) {
    const t = document.createElement('span');
    t.className = bad ? 'sv-tag sv-bad' : 'sv-tag';
    t.textContent = text;
    return t;
  }

  function rowFor(m) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sv-row';
    b.id = `sv-slot-${m.id}`;
    b.dataset.slot = m.id;
    b.setAttribute('data-nav', '');
    b.setAttribute('role', 'option');
    b.appendChild(thumbEl(m.empty ? null : m.id));
    const txt = document.createElement('div');
    txt.className = 'sv-txt';
    const name = document.createElement('div');
    name.className = 'sv-name';
    name.textContent = m.empty ? `${m.name} — empty` : m.name;
    if (m.kind === 'auto') name.appendChild(tag('Auto'));
    if (m.kind === 'quick') name.appendChild(tag('Quick'));
    if (m.status === 'damaged') name.appendChild(tag('Damaged', true));
    if (m.status === 'newer') name.appendChild(tag('Newer version', true));
    txt.appendChild(name);
    const l1 = document.createElement('div');
    l1.className = 'sv-line';
    const l2 = document.createElement('div');
    l2.className = 'sv-line sv-dim';
    if (m.empty) {
      l1.textContent = mode === 'save' ? 'Save your game here' : '';
      l2.textContent = '';
    } else if (m.status !== 'ok') {
      l1.textContent = m.status === 'newer' ? 'Made by a newer version of Echoes' : 'This file could not be read';
      l2.textContent = m.backup ? `Backup from ${fmtDate(m.backup.savedAt)} available` : m.savedAt ? fmtDate(m.savedAt) : '';
    } else {
      l1.textContent = whereLine(m);
      l2.textContent = `${fmtDate(m.savedAt)} · ${fmtAgo(m.savedAt)} · Playtime ${fmtPlaytime(m.meta.playtimeSec)}`;
    }
    txt.append(l1, l2);
    b.appendChild(txt);
    const side = document.createElement('div');
    side.className = 'sv-side';
    if (!m.empty && m.status === 'ok') {
      side.appendChild(pips(m.meta));
      const g = document.createElement('div');
      g.className = 'sv-glint';
      g.textContent = m.meta.mode === 'run' ? `◆ ${m.meta.wallet ?? 0}` : '';
      side.appendChild(g);
    }
    b.appendChild(side);
    b.setAttribute('aria-label', `${name.textContent}. ${l1.textContent}. ${l2.textContent}`);
    b.addEventListener('click', () => primary(m.id));
    return b;
  }

  function current() {
    return entries().find((m) => m.id === selectedId) ?? null;
  }

  function renderDetail() {
    detailEl.textContent = '';
    const m = current();
    if (!m) {
      const e = document.createElement('div');
      e.className = 'sv-msg sv-dim';
      e.textContent = mode === 'save' ? 'Pick a slot to save into.' : 'Pick a save to see it here.';
      detailEl.appendChild(e);
      return;
    }
    detailEl.appendChild(thumbEl(m.empty ? null : m.id, true));
    const nm = document.createElement('div');
    nm.className = 'sv-dname';
    nm.textContent = m.empty ? `${m.name} — empty` : m.name;
    detailEl.appendChild(nm);
    if (m.empty) {
      const t = document.createElement('div');
      t.className = 'sv-msg';
      t.textContent = 'An empty slot. Saving here keeps your current camp or run exactly as it is now.';
      detailEl.appendChild(t);
    } else if (m.status !== 'ok') {
      const t = document.createElement('div');
      t.className = 'sv-msg';
      const why = m.status === 'newer' ? SAVE_ERRORS.version : `${SAVE_ERRORS[m.error] || SAVE_ERRORS.corrupt}\n${m.detail || ''}`;
      t.textContent = m.backup
        ? `${why}\n\nA backup from ${fmtDate(m.backup.savedAt)} (${whereLine(m.backup)}) is intact.`
        : `${why}\n\nExport the raw file to keep it, or delete the slot.`;
      detailEl.appendChild(t);
    } else {
      const meta = m.meta || {};
      const dl = document.createElement('dl');
      dl.className = 'sv-dl';
      const add = (k, v) => {
        const dt = document.createElement('dt');
        dt.textContent = k;
        const dd = document.createElement('dd');
        dd.textContent = v;
        dl.append(dt, dd);
      };
      add('Where', whereLine(m));
      add('Saved', `${fmtDate(m.savedAt)} (${fmtAgo(m.savedAt)})`);
      add('Playtime', fmtPlaytime(meta.playtimeSec));
      add(
        'Party',
        (meta.party || []).map((p) => `${CLASS_NAME[p.classId] || p.classId} ${Math.round(p.hp)}/${p.maxHp}`).join(' · ') || '—'
      );
      if (meta.mode === 'run') add('Glint', String(meta.wallet ?? 0));
      const skills = (meta.skills || []).filter(Boolean);
      add('Skills', skills.length ? `${skills.length} — ${skills.map((s) => s.replace(/_/g, ' ')).join(', ')}` : '—');
      add('Challenge', meta.challenge ? meta.challenge[0].toUpperCase() + meta.challenge.slice(1) : 'Standard');
      add('File', `${Math.max(1, Math.round((m.bytes || 0) / 1024))} KB · v${m.game || '?'}${meta.network ? ' · online (host)' : ''}`);
      detailEl.appendChild(dl);
    }
    const acts = document.createElement('div');
    acts.className = 'sv-acts';
    const can = save() ? save().canSave() : { ok: false };
    if (mode === 'save') {
      const b = mkBtn(m.empty ? 'Save here' : 'Overwrite', 'sv-act-save', 'ap-primary', () => primary(m.id));
      if (!can.ok) {
        b.disabled = true;
        b.title = can.reason || '';
      }
      acts.appendChild(b);
    } else if (!m.empty && m.status === 'ok') {
      acts.appendChild(mkBtn('Load', 'sv-act-load', 'ap-primary', () => primary(m.id)));
    }
    if (!m.empty && m.status !== 'ok' && m.backup) acts.appendChild(mkBtn('Restore backup', 'sv-act-restore', 'ap-primary', () => restoreBackup(m.id)));
    if (!m.empty && m.status === 'ok') acts.appendChild(mkBtn('Rename', 'sv-act-rename', '', () => rename(m.id)));
    if (!m.empty) acts.appendChild(mkBtn('Export', 'sv-act-export', '', () => exportSlot(m.id)));
    if (!m.empty) acts.appendChild(mkBtn('Delete', 'sv-act-delete', 'ap-danger', () => remove(m.id)));
    detailEl.appendChild(acts);
    if (mode === 'save' && !can.ok && can.reason) {
      const n = document.createElement('div');
      n.className = 'sv-msg sv-dim';
      n.textContent = can.reason;
      detailEl.appendChild(n);
    }
  }

  function renderHead() {
    titleEl.textContent = mode === 'save' ? 'Save Game' : 'Load Game';
    el.setAttribute('aria-label', titleEl.textContent);
    modesEl.textContent = '';
    if (inGame()) {
      for (const [m, label] of [
        ['save', 'Save'],
        ['load', 'Load'],
      ]) {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = mode === m ? 'ap-tab ap-active' : 'ap-tab';
        t.id = `sv-mode-${m}`;
        t.textContent = label;
        t.setAttribute('data-nav', '');
        t.addEventListener('click', () => setMode(m));
        modesEl.appendChild(t);
      }
    }
    const s = save();
    const n = s ? s.list().length : 0;
    subEl.textContent =
      mode === 'save'
        ? 'Choose a slot — autosaves and the quicksave (F5) are kept separately'
        : n
          ? `${n} save${n === 1 ? '' : 's'} · newest first`
          : '';
    if (s) {
      try {
        const u = s.debug.usage();
        usageEl.textContent = u.backend === 'memory' ? "Saves last for this visit only (browser storage is off)" : `Browser storage ${Math.max(1, Math.round(u.total / 1024))} KB used`;
      } catch {
        usageEl.textContent = '';
      }
    }
  }

  function render({ keepFocus = true } = {}) {
    const focusedSlot = keepFocus && document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.slot : null;
    renderHead();
    listEl.textContent = '';
    rowEls.clear();
    const list = entries();
    if (list.length === 0) {
      const e = document.createElement('div');
      e.className = 'sv-empty';
      e.textContent =
        mode === 'save'
          ? 'Saving is not available right now.'
          : 'No saved games yet.\nYour game autosaves at every room and at the camp — or import a save file.';
      listEl.appendChild(e);
      selectedId = null;
    } else {
      let lastSect = null;
      for (const m of list) {
        const sect = mode === 'load' ? (m.kind === 'manual' ? 'Saves' : 'Autosaves & quicksave') : null;
        if (sect && sect !== lastSect && list.some((x) => x.kind !== 'manual') && list.some((x) => x.kind === 'manual')) {
          const h = document.createElement('div');
          h.className = 'sv-sect';
          h.textContent = sect;
          listEl.appendChild(h);
          lastSect = sect;
        }
        const r = rowFor(m);
        rowEls.set(m.id, r);
        listEl.appendChild(r);
      }
      if (!selectedId || !rowEls.has(selectedId)) selectedId = list[0].id;
      for (const [id, r] of rowEls) {
        r.classList.toggle('sv-selected', id === selectedId);
        if (id === selectedId) r.setAttribute('data-nav-default', '');
      }
    }
    renderDetail();
    if (open && manager.top() === 'saves') {
      const want = rowEls.get(focusedSlot || selectedId);
      if (want) manager.focusElement(want, 'api');
      else manager.refocus();
    }
  }

  function select(id) {
    if (id === selectedId || !rowEls.has(id)) return;
    selectedId = id;
    for (const [sid, r] of rowEls) {
      r.classList.toggle('sv-selected', sid === id);
      if (sid === id) r.setAttribute('data-nav-default', '');
      else r.removeAttribute('data-nav-default');
    }
    renderDetail();
  }

  function setMode(m) {
    if (m === mode || (m === 'save' && !inGame())) return;
    mode = m;
    selectedId = null;
    render({ keepFocus: false });
  }

  function toast(text, tone = 'info') {
    app.toast(text, { tone, ms: tone === 'error' ? 4600 : 2600 });
  }

  async function guarded(fn) {
    if (busy) return;
    busy = true;
    try {
      await fn();
    } finally {
      busy = false;
    }
  }

  function primary(id) {
    select(id);
    const m = current();
    if (!m) return;
    if (mode === 'save') return doSave(m);
    if (m.empty) return;
    if (m.status !== 'ok') {
      if (m.backup) return restoreBackup(m.id);
      toast(m.status === 'newer' ? SAVE_ERRORS.version : SAVE_ERRORS[m.error] || SAVE_ERRORS.corrupt, 'warn');
      return;
    }
    return doLoad(m);
  }

  function doSave(m) {
    return guarded(async () => {
      const s = save();
      if (!s) return;
      const can = s.canSave();
      if (!can.ok) {
        toast(can.reason || SAVE_ERRORS.not_allowed, 'warn');
        return;
      }
      if (!m.empty) {
        const ok = await app.confirm({
          title: `Overwrite “${m.name}”?`,
          body: m.status === 'ok' ? `The save from ${fmtDate(m.savedAt)} (${whereLine(m)}) will be replaced.` : 'The damaged file in this slot will be replaced.',
          confirmLabel: 'Overwrite',
          cancelLabel: 'Cancel',
          danger: true,
          defaultFocus: 'cancel',
        });
        if (!ok) return;
      }
      const r = await s.save(m.id, { name: m.empty ? undefined : m.name });
      if (r.ok) {
        toast(`Saved to “${r.meta.name}”`, 'good');
        selectedId = m.id;
        render();
      } else toast(r.reason || SAVE_ERRORS[r.error] || "Couldn't save", r.error === 'quota' ? 'error' : 'warn');
    });
  }

  function doLoad(m) {
    return guarded(async () => {
      if (inGame()) {
        const ok = await app.confirm({
          title: `Load “${m.name}”?`,
          body: 'Anything since your last save will be lost.',
          confirmLabel: 'Load',
          cancelLabel: 'Cancel',
          danger: false,
          defaultFocus: 'confirm',
        });
        if (!ok) return;
      }
      const r = typeof app.loadSlot === 'function' ? await app.loadSlot(m.id) : await save().load(m.id);
      if (r && r.ok) return; // app.loadSlot entered play (the stack is cleared)
      render();
      const why = SAVE_ERRORS[r && r.error] || SAVE_ERRORS.corrupt;
      if (r && r.backup) {
        const ok = await app.confirm({
          title: 'This save could not be loaded',
          body: `${why}\nRestore the backup from ${fmtDate(r.backup.savedAt)}?`,
          confirmLabel: 'Restore backup',
          cancelLabel: 'Not now',
          defaultFocus: 'confirm',
        });
        if (ok) await restoreBackupNow(m.id);
      } else toast(r && r.reason ? r.reason : why, 'error');
    });
  }

  async function restoreBackupNow(id) {
    const r = save().restoreBackup(id);
    if (r.ok) toast('Backup restored — the slot is loadable again', 'good');
    else toast(SAVE_ERRORS[r.error] || "Couldn't restore the backup", 'error');
    selectedId = id;
    render();
  }
  function restoreBackup(id) {
    return guarded(async () => {
      const m = entries().find((x) => x.id === id);
      const ok = await app.confirm({
        title: 'Restore the backup?',
        body: m && m.backup ? `The damaged file is replaced by the backup from ${fmtDate(m.backup.savedAt)} (${whereLine(m.backup)}).` : 'The damaged file is replaced by its backup.',
        confirmLabel: 'Restore',
        cancelLabel: 'Cancel',
        defaultFocus: 'confirm',
      });
      if (ok) await restoreBackupNow(id);
    });
  }

  function remove(id) {
    return guarded(async () => {
      const m = entries().find((x) => x.id === id);
      if (!m || m.empty) return;
      const ok = await app.confirm({
        title: `Delete “${m.name}”?`,
        body: m.status === 'ok' ? `${whereLine(m)} · saved ${fmtDate(m.savedAt)}.\nThis can't be undone.` : "This can't be undone.",
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
        defaultFocus: 'cancel',
      });
      if (!ok) return;
      const r = save().remove(id);
      if (r.ok) toast(`Deleted “${m.name}”`, 'info');
      render();
      if (mode === 'load' && entries().length === 0) manager.refocus();
    });
  }

  function rename(id) {
    return guarded(async () => {
      const m = entries().find((x) => x.id === id);
      if (!m || m.empty || m.status !== 'ok') return;
      const name = await new Promise((resolve) => {
        if (!manager.push('sv-rename', { value: m.name, resolve })) resolve(null);
      });
      if (name === null || name === undefined || name === m.name) return;
      const r = await save().rename(id, name);
      if (r.ok) toast(`Renamed to “${r.meta.name}”`, 'good');
      else toast(SAVE_ERRORS[r.error] || "Couldn't rename", 'warn');
      render();
    });
  }

  function exportSlot(id) {
    const r = save().exportSlot(id);
    if (r.ok) toast(`Exported ${r.filename}`, 'good');
    else toast(SAVE_ERRORS[r.error] || "Couldn't export", 'warn');
  }

  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    guarded(async () => {
      const s = save();
      let target = null;
      const firstEmpty = s.manualSlots().find((id) => !s.list().some((m) => m.id === id));
      if (!firstEmpty) {
        const sel = current();
        if (!sel || sel.kind !== 'manual') {
          toast(SAVE_ERRORS.full, 'warn');
          return;
        }
        const ok = await app.confirm({
          title: `Replace “${sel.name}” with the imported file?`,
          body: 'Every slot is in use.',
          confirmLabel: 'Replace',
          danger: true,
          defaultFocus: 'cancel',
        });
        if (!ok) return;
        target = sel.id;
      }
      const r = await s.importFile(f, target);
      if (r.ok) {
        toast(`Imported into “${r.meta ? r.meta.name : r.slotId}”`, 'good');
        mode = 'load';
        selectedId = r.slotId;
        render({ keepFocus: false });
      } else toast(`Couldn't import: ${SAVE_ERRORS[r.error] || r.error}${r.detail ? ` (${r.detail})` : ''}`, 'error');
    });
  });

  const screen = {
    el,
    blocking: true,
    layer: 'screen',
    onOpen(params = {}) {
      open = true;
      mode = params.mode === 'save' && inGame() ? 'save' : 'load';
      selectedId = null;
      busy = false;
      render({ keepFocus: false });
    },
    onFocus() {
      render();
    },
    onClose() {
      open = false;
    },
    onFocusChange(node) {
      if (node && node.dataset && node.dataset.slot) select(node.dataset.slot);
    },
    onNav(action) {
      const a = document.activeElement;
      const onRow = !!(a && a.dataset && a.dataset.slot);
      if (action === 'tabPrev' || action === 'tabNext') {
        if (inGame()) setMode(mode === 'save' ? 'load' : 'save');
        return true;
      }
      if (action === 'secondary') {
        if (selectedId) remove(selectedId);
        return true;
      }
      if (action === 'tertiary') {
        if (selectedId) rename(selectedId);
        return true;
      }
      if (action === 'right' && onRow) {
        const b = detailEl.querySelector('.sv-acts [data-nav]:not([disabled])');
        if (b) manager.focusElement(b, 'api');
        return true;
      }
      if (action === 'left' && a && detailEl.contains(a)) {
        const r = rowEls.get(selectedId);
        if (r) manager.focusElement(r, 'api');
        return true;
      }
      return false;
    },
  };
  return screen;
}

// ------------------------------------------------------- rename dialog --
function createRenameScreen(ctx) {
  installSaveStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-dialog sv-rename';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ap-dlg ap-plate">
      <div class="ap-dlg-title">Rename save</div>
      <input type="text" id="sv-rename-input" maxlength="32" autocomplete="off" spellcheck="false" data-nav data-nav-default />
      <div class="sv-count"></div>
      <div class="ap-dlg-btns"></div>
    </div>`;
  const input = el.querySelector('input');
  const count = el.querySelector('.sv-count');
  const btns = el.querySelector('.ap-dlg-btns');
  let p = null;
  let settled = false;
  function finish(v) {
    if (settled) return;
    settled = true;
    if (manager.top() === 'sv-rename') manager.pop();
    if (p && typeof p.resolve === 'function') p.resolve(v);
  }
  const ok = mkBtn('Rename', 'sv-rename-ok', 'ap-primary', () => finish(input.value.trim() || null));
  const cancel = mkBtn('Cancel', 'sv-rename-cancel', '', () => finish(null));
  btns.append(ok, cancel);
  const upd = () => {
    count.textContent = `${input.value.length} / 32`;
  };
  input.addEventListener('input', upd);
  const hints = createHints(app, [
    ['confirm', 'Rename'],
    ['back', 'Cancel'],
  ]);
  hints.el.style.justifyContent = 'flex-end';
  el.querySelector('.ap-dlg').appendChild(hints.el);
  return {
    el,
    blocking: true,
    layer: 'dialog',
    reusable: false,
    onOpen(params = {}) {
      p = params;
      settled = false;
      input.value = String(params.value || '').slice(0, 32);
      upd();
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
      if (!settled) {
        settled = true;
        if (p && typeof p.resolve === 'function') p.resolve(null);
      }
    },
    onNav(action) {
      if (action === 'confirm' && document.activeElement === input) {
        finish(input.value.trim() || null);
        return true;
      }
      return false;
    },
    back() {
      finish(null);
      return true;
    },
  };
}

let registered = false;
export function registerSaveScreens() {
  if (registered) return;
  registered = true;
  registerScreen('saves', createSavesScreen);
  registerScreen('sv-rename', createRenameScreen);
  registerScreen('records', createRecordsScreen);
}
