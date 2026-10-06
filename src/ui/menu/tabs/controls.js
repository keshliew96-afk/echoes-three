// Settings ▸ Controls (docs/gauntlet/PLAN.md §3.2). Owner: M1.
// A complete READ-ONLY reference that reads the LIVE bindings from the input
// controller (core/input.js bindings(): skill keys follow SKILL_SLOTS — 1–4,
// the user's 4-skill rule) plus the menu controls for keyboard, mouse and
// gamepad. Key rebinding is out of scope this iteration and the tab says so.
// Nothing here is focusable except the tab bar and footer, so Reset is
// disabled ("Nothing to reset on this tab").
//
// LAYOUT (fix-M1-r5, MENU-R5-F2 — G1.1 "nothing clipped" at 1024x576): two
// balanced columns — PLAY (11 rows) | GENERAL (3) + MENUS keyboard & mouse
// (4) + MENUS gamepad (2) — so each column is one heading + 11 rows high,
// and short windows (≤ 700 px) tighten the row pitch (style.js), which fits
// the whole reference AND the rebinding note inside the 1024x576 box. Should
// a window still be too small (browser zoom, < 1024x576), the Settings screen
// makes this read-only tab one focus stop that ↑/↓ (D-pad), the right stick
// and the wheel scroll, with a fade at the cut edge (settings.js).
// Key caps (Esc, Space, letters, pad buttons) are not translated; the words
// (actions, headings, Mouse / Click) are.
import { t, tn } from '../../../i18n/index.js';

const KEY_NAMES = {
  Space: 'Space',
  Tab: 'Tab',
  KeyE: 'E',
  KeyR: 'R',
  KeyW: 'W',
  KeyA: 'A',
  KeyS: 'S',
  KeyD: 'D',
};
const keyName = (code) => (code === 'MouseRight' ? t('Right mouse') : KEY_NAMES[code] || code.replace(/^Key/, '').replace(/^Digit/, ''));

function chip(text, pad = false) {
  const k = document.createElement('span');
  k.className = pad ? 'ap-kbd ap-pad' : 'ap-kbd';
  k.textContent = text;
  return k;
}

function row(action, keys, pad = false) {
  const r = document.createElement('div');
  r.className = 'ap-ref-row';
  const a = document.createElement('span');
  a.className = 'ap-ref-act';
  a.textContent = action;
  const k = document.createElement('span');
  k.className = 'ap-ref-keys';
  for (const key of keys) k.appendChild(chip(key, pad));
  r.append(a, k);
  return r;
}

function head(text) {
  const h = document.createElement('h3');
  h.className = 'ap-section';
  h.textContent = text;
  return h;
}

export function buildControlsTab(ctx) {
  const { app, widgets } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-tabcontent ap-controls';
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  el.style.gap = 'calc(8px * var(--ap-s, 1))';

  const noteEl = widgets.note(t('Key rebinding isn’t available in this version — this is the full control reference.'), 'ref');
  const grid = document.createElement('div');
  grid.className = 'ap-ref';
  el.append(noteEl, grid);

  function render() {
    grid.textContent = '';
    const input = app.input;
    const map = input && typeof input.bindings === 'function' ? input.bindings() : null;
    const presses = map ? map.presses : [];
    const skills = presses.filter((p) => /^skill_\d+$/.test(p.kind)).sort((a, b) => a.slot - b.slot);
    const byKind = (kind) => presses.filter((p) => p.kind === kind).map((p) => keyName(p.code));
    const targets = presses.filter((p) => p.kind === 'target_select').map((p) => keyName(p.code));

    const left = document.createElement('div');
    left.className = 'ap-ref-col';
    left.appendChild(head(t('Play — keyboard & mouse')));
    const ORDER = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    const move = map ? [...map.move].sort((x, y) => (ORDER.indexOf(x) + 99) % 99 - (ORDER.indexOf(y) + 99) % 99) : ORDER;
    left.appendChild(row(t('Move'), move.map(keyName)));
    left.appendChild(row(t('Aim'), [t('Mouse')]));
    left.appendChild(row(t('Basic attack (hold)'), [t('Right mouse')]));
    if (skills.length) {
      const first = keyName(skills[0].code);
      const last = keyName(skills[skills.length - 1].code);
      left.appendChild(row(tn(skills.length, 'Skills ({n} slot)', 'Skills ({n} slots)'), [skills.length > 1 ? `${first}–${last}` : first]));
    }
    const dodge = byKind('dodge');
    if (dodge.length) left.appendChild(row(t('Dodge'), dodge));
    left.appendChild(row(t('Revive a downed ally (hold)'), ['E']));
    const interact = byKind('interact');
    left.appendChild(row(t('Interact · Begin a run at the portal'), interact.length ? interact : ['E']));
    const rally = byKind('rally');
    if (rally.length) left.appendChild(row(t('Rally the party'), rally));
    const cyc = byKind('target_cycle');
    if (cyc.length) left.appendChild(row(t('Mark the next enemy'), cyc));
    if (targets.length) left.appendChild(row(t('Select an ally for a heal'), [`${targets[0]}–${targets[targets.length - 1]}`]));
    left.appendChild(row(t('Build workbench (between rooms)'), ['B']));

    const right = document.createElement('div');
    right.className = 'ap-ref-col';
    right.appendChild(head(t('General')));
    // main.js PAUSE_KEYS (Esc / P) while playing; Start on a gamepad.
    right.appendChild(row(t('Pause · Resume'), ['Esc', 'P']));
    right.appendChild(row(t('Fullscreen'), ['Alt', 'Enter']));
    // M2: the quick-slot keys (single-player, in play) — shown with the save service.
    const svc = ctx.services && typeof ctx.services.service === 'function' ? ctx.services.service('save') : null;
    if (svc) right.appendChild(row(t('Quicksave · Quickload'), ['F5', 'F9']));
    right.appendChild(head(t('Menus — keyboard & mouse')));
    right.appendChild(row(t('Move'), ['↑↓←→', 'WASD']));
    right.appendChild(row(t('Choose'), ['Enter', 'Space', t('Click')]));
    right.appendChild(row(t('Back'), ['Esc', 'Backspace', t('Right-click')]));
    right.appendChild(row(t('Tabs'), ['Q', 'E']));
    right.appendChild(head(t('Menus — gamepad')));
    right.appendChild(row(t('Move · Choose · Back'), ['D-pad', 'A', 'B'], true));
    right.appendChild(row(t('Tabs · Pause'), ['LB', 'RB', 'Start'], true));
    grid.append(left, right);
  }
  render();

  return {
    el,
    resettable: false,
    onShow: render,
  };
}
