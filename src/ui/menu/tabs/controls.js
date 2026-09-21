// Settings ▸ Controls (docs/gauntlet/PLAN.md §3.2). Owner: M1.
// A complete READ-ONLY reference that reads the LIVE bindings from the input
// controller (core/input.js bindings(): skill keys follow SKILL_SLOTS, so it
// shows 1–4 today and 1–8 once the content extension lands) plus the menu
// controls for keyboard, mouse and gamepad. Key rebinding is out of scope this
// iteration and the tab says so. Nothing here is focusable except the tab bar
// and footer, so Reset is disabled ("Nothing to reset on this tab").
const KEY_NAMES = {
  Space: 'Space',
  Tab: 'Tab',
  KeyE: 'E',
  KeyR: 'R',
  KeyW: 'W',
  KeyA: 'A',
  KeyS: 'S',
  KeyD: 'D',
  MouseRight: 'Right mouse',
};
const keyName = (code) => KEY_NAMES[code] || code.replace(/^Key/, '').replace(/^Digit/, '');

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
  for (const t of keys) k.appendChild(chip(t, pad));
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

  const noteEl = widgets.note('Key rebinding isn’t available in this version — this is the full control reference.', 'info');
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
    left.appendChild(head('Play — keyboard & mouse'));
    const ORDER = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    const move = map ? [...map.move].sort((x, y) => (ORDER.indexOf(x) + 99) % 99 - (ORDER.indexOf(y) + 99) % 99) : ORDER;
    left.appendChild(row('Move', move.map(keyName)));
    left.appendChild(row('Aim', ['Mouse']));
    left.appendChild(row('Basic attack (hold)', ['Right mouse']));
    if (skills.length) {
      const first = keyName(skills[0].code);
      const last = keyName(skills[skills.length - 1].code);
      left.appendChild(row(`Skills (${skills.length} slots)`, [skills.length > 1 ? `${first}–${last}` : first]));
    }
    const dodge = byKind('dodge');
    if (dodge.length) left.appendChild(row('Dodge', dodge));
    left.appendChild(row('Revive a downed ally (hold)', ['E']));
    const interact = byKind('interact');
    left.appendChild(row('Interact · Begin a run at the portal', interact.length ? interact : ['E']));
    const rally = byKind('rally');
    if (rally.length) left.appendChild(row('Rally the party', rally));
    const cyc = byKind('target_cycle');
    if (cyc.length) left.appendChild(row('Mark the next enemy', cyc));
    if (targets.length) left.appendChild(row('Select an ally for a heal', [`${targets[0]}–${targets[targets.length - 1]}`]));
    left.appendChild(row('Build workbench (between rooms)', ['B']));
    left.appendChild(row('Fullscreen', ['Alt', 'Enter']));
    // M2: the quick-slot keys (single-player, in play) — shown with the save service.
    const svc = ctx.services && typeof ctx.services.service === 'function' ? ctx.services.service('save') : null;
    if (svc) left.appendChild(row('Quicksave · Quickload', ['F5', 'F9']));

    const right = document.createElement('div');
    right.className = 'ap-ref-col';
    right.appendChild(head('Menus — keyboard'));
    right.appendChild(row('Move', ['↑↓←→', 'WASD']));
    right.appendChild(row('Choose', ['Enter', 'Space']));
    right.appendChild(row('Back', ['Esc', 'Backspace']));
    right.appendChild(row('Tabs', ['Q', 'E']));
    right.appendChild(head('Menus — mouse'));
    right.appendChild(row('Choose · Back', ['Click', 'Right-click']));
    right.appendChild(head('Menus — gamepad'));
    right.appendChild(row('Move · Choose · Back', ['D-pad', 'A', 'B'], true));
    right.appendChild(row('Tabs · Pause', ['LB', 'RB', 'Start'], true));
    grid.append(left, right);
  }
  render();

  return {
    el,
    resettable: false,
    onShow: render,
  };
}
