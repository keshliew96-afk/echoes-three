// Settings / menu widget kit (docs/gauntlet/PLAN.md §3.2). Owner: M1.
// Every control:
//   - returns { el, get(), set(v, {silent}), focus(), setDisabled(bool, reason), setNote?(text) }
//     (+ M1 extras: node — the focusable element, setHelp(text), setLabel(text))
//   - marks its ONE focusable node [data-nav] for the screen manager
//   - adjustable controls (slider, select, toggle) expose node.__navAdjust(dir)
//     so the manager routes 'left'/'right' (arrow keys, D-pad) to them
//   - calls onInput(v) continuously while dragging/adjusting and onChange(v)
//     once per committed change (mouse up, key press, gamepad step)
// Options every row widget accepts: `id` (element id of the focusable node,
// so probes and __echoes.app.focus() name it), `help` (the long explanation the
// settings info panel shows for the focused row), `note` (the one-line status
// printed under the row).
// Styling lives in src/app/style.js (ap- prefix). No colour literals here.

function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function disabler(node, noteEl, extra = []) {
  let savedNote = null;
  return (on, reason = '') => {
    node.disabled = !!on;
    node.setAttribute('aria-disabled', on ? 'true' : 'false');
    for (const n of extra) n.disabled = !!on;
    if (noteEl) {
      if (on) {
        if (savedNote === null) savedNote = noteEl.textContent;
        noteEl.textContent = reason;
      } else if (savedNote !== null) {
        noteEl.textContent = savedNote;
        savedNote = null;
      }
    }
  };
}

function rowShell(kind, { label, help = '', id = '' }) {
  const el = h('div', `ap-row ${kind}`);
  if (help) el.dataset.help = help;
  el.dataset.helpTitle = label;
  if (id) el.dataset.rowId = id;
  const lab = h(kind === 'ap-slider' ? 'label' : 'span', 'ap-label', label);
  const ctl = h('div', 'ap-ctl');
  const noteEl = h('div', 'ap-note');
  el.append(lab, ctl, noteEl);
  return { el, lab, ctl, noteEl };
}

// Mouse on the row chrome (label, note, padding) focuses the row's control and,
// for the small step buttons, never steals native focus from it.
function keepFocusOn(node, ...others) {
  for (const o of others) {
    o.tabIndex = -1;
    o.addEventListener('mousedown', (e) => {
      e.preventDefault();
      node.focus({ preventScroll: true });
    });
  }
}

// slider({ label, min=0, max=1, step=0.01, value, format(v)->string, onInput, onChange, note, help, id })
export function slider({
  label,
  min = 0,
  max = 1,
  step = 0.01,
  value = min,
  format = (v) => String(v),
  onInput,
  onChange,
  note = '',
  help = '',
  id = '',
}) {
  const { el, lab, ctl, noteEl } = rowShell('ap-slider', { label, help, id });
  const input = h('input', 'ap-range');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  if (id) input.id = id;
  input.setAttribute('data-nav', '');
  input.setAttribute('aria-label', label);
  const out = h('output', 'ap-value', format(value));
  noteEl.textContent = note;
  ctl.append(input, out);
  if (id) lab.htmlFor = id;
  const read = () => Number(input.value);
  const paint = () => {
    const v = read();
    out.textContent = format(v);
    const f = max > min ? ((v - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--ap-fill', `${Math.max(0, Math.min(100, f))}%`);
    input.setAttribute('aria-valuetext', out.textContent);
  };
  paint();
  input.addEventListener('input', () => {
    paint();
    if (onInput) onInput(read());
  });
  input.addEventListener('change', () => onChange && onChange(read()));
  input.__navAdjust = (dir) => {
    if (input.disabled) return;
    const prev = read();
    const n = Math.round((prev + dir * step - min) / step) * step + min;
    const v = Math.min(max, Math.max(min, Math.round(n * 1e6) / 1e6));
    if (v === prev) return;
    input.value = String(v);
    paint();
    if (onInput) onInput(read());
    if (onChange) onChange(read());
  };
  return {
    el,
    node: input,
    input,
    get: read,
    set(v, { silent = true } = {}) {
      input.value = String(v);
      paint();
      if (!silent && onChange) onChange(read());
    },
    focus: () => input.focus({ preventScroll: true }),
    setDisabled: disabler(input, noteEl),
    setNote: (t) => (noteEl.textContent = t),
    setHelp: (t) => (el.dataset.help = t),
    setLabel: (t) => {
      lab.textContent = t;
      el.dataset.helpTitle = t;
    },
  };
}

// toggle({ label, value=false, onChange, onLabel='On', offLabel='Off', note, help, id })
export function toggle({ label, value = false, onChange, onLabel = 'On', offLabel = 'Off', note = '', help = '', id = '' }) {
  const { el, lab, ctl, noteEl } = rowShell('ap-toggle', { label, help, id });
  const btn = h('button', 'ap-switch');
  btn.type = 'button';
  if (id) btn.id = id;
  btn.setAttribute('data-nav', '');
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-label', label);
  const knob = h('span', 'ap-knob');
  const txt = h('span', 'ap-sw-lab');
  btn.append(knob, txt);
  ctl.append(btn);
  noteEl.textContent = note;
  let v = !!value;
  const paint = () => {
    btn.setAttribute('aria-checked', v ? 'true' : 'false');
    txt.textContent = v ? onLabel : offLabel;
  };
  paint();
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    v = !v;
    paint();
    if (onChange) onChange(v);
  });
  // Either direction flips a two-state switch (a two-option cycle, the
  // console convention); Enter / A / click flip it too. A held direction's
  // auto-repeat never re-flips it (meta.repeat, from the screen manager).
  btn.__navAdjust = (dir, meta) => {
    if (btn.disabled || (meta && meta.repeat)) return;
    btn.click();
  };
  lab.addEventListener('click', () => btn.focus({ preventScroll: true }));
  return {
    el,
    node: btn,
    get: () => v,
    set(nv, { silent = true } = {}) {
      v = !!nv;
      paint();
      if (!silent && onChange) onChange(v);
    },
    focus: () => btn.focus({ preventScroll: true }),
    setDisabled: disabler(btn, noteEl),
    setNote: (t) => (noteEl.textContent = t),
    setHelp: (t) => (el.dataset.help = t),
    setLabel: (t) => {
      lab.textContent = t;
      el.dataset.helpTitle = t;
    },
  };
}

// select({ label, options: [{ value, label, disabled?, note? }], value, onChange, note, help, id })
// Cycles with left/right (console-style) and opens nothing: every option is
// reachable by keyboard, mouse (click cycles; the arrow buttons step) and pad.
export function select({ label, options, value, onChange, note = '', help = '', id = '' }) {
  const { el, lab, ctl, noteEl } = rowShell('ap-select', { label, help, id });
  const prev = h('button', 'ap-step ap-prev', '‹');
  const cur = h('button', 'ap-choice');
  const next = h('button', 'ap-step ap-next', '›');
  for (const b of [prev, cur, next]) b.type = 'button';
  prev.setAttribute('aria-label', `${label}: previous`);
  next.setAttribute('aria-label', `${label}: next`);
  if (id) cur.id = id;
  cur.setAttribute('data-nav', '');
  cur.setAttribute('aria-label', label);
  keepFocusOn(cur, prev, next);
  ctl.append(prev, cur, next);
  let opts = options.slice();
  let idx = Math.max(0, opts.findIndex((o) => o.value === value));
  let baseNote = note;
  const paint = () => {
    const o = opts[idx];
    cur.textContent = o ? o.label : '';
    noteEl.textContent = (o && o.note) || baseNote;
  };
  const step = (dir) => {
    if (cur.disabled || opts.length === 0) return;
    const from = idx;
    for (let k = 0; k < opts.length; k++) {
      idx = (idx + dir + opts.length) % opts.length;
      if (!opts[idx].disabled) break;
    }
    if (idx === from) return;
    paint();
    if (onChange) onChange(opts[idx].value);
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  cur.addEventListener('click', () => step(1));
  cur.__navAdjust = (dir) => step(dir);
  lab.addEventListener('click', () => cur.focus({ preventScroll: true }));
  paint();
  return {
    el,
    node: cur,
    get: () => opts[idx] && opts[idx].value,
    set(v, { silent = true } = {}) {
      const i = opts.findIndex((o) => o.value === v);
      if (i >= 0) idx = i;
      paint();
      if (!silent && onChange) onChange(opts[idx].value);
    },
    setOptions(list, v) {
      opts = list.slice();
      const i = opts.findIndex((o) => o.value === (v === undefined ? opts[idx] && opts[idx].value : v));
      idx = Math.max(0, i);
      paint();
    },
    focus: () => cur.focus({ preventScroll: true }),
    setDisabled: disabler(cur, noteEl, [prev, next]),
    setNote: (t) => {
      baseNote = t;
      const o = opts[idx];
      noteEl.textContent = (o && o.note) || baseNote;
    },
    setHelp: (t) => (el.dataset.help = t),
    setLabel: (t) => {
      lab.textContent = t;
      el.dataset.helpTitle = t;
    },
  };
}

// button({ label, onPress, variant='secondary'|'primary'|'danger', disabled=false, reason, id, help })
export function button({ label, onPress, variant = 'secondary', disabled = false, reason = '', id = '', help = '' }) {
  const btn = h('button', `ap-btn ap-${variant}`, label);
  btn.type = 'button';
  if (id) btn.id = id;
  if (help) btn.dataset.help = help;
  btn.dataset.helpTitle = label;
  btn.setAttribute('data-nav', '');
  btn.addEventListener('click', () => {
    if (!btn.disabled && onPress) onPress();
  });
  const set = disabler(btn, null);
  set(disabled, reason);
  if (disabled && reason) btn.title = reason;
  return {
    el: btn,
    node: btn,
    get: () => btn.textContent,
    set: (t) => (btn.textContent = t),
    focus: () => btn.focus({ preventScroll: true }),
    setDisabled: (on, why = '') => {
      set(on, why);
      btn.title = on ? why : '';
      if (on && why) btn.dataset.reason = why;
      else delete btn.dataset.reason;
    },
  };
}

// section(title) -> heading element; note(text, tone) -> muted paragraph
export function section(title) {
  return h('h3', 'ap-section', title);
}

// The tone is a NAMESPACED class (ap-note-<tone>): a bare `ap-${tone}` made
// tone 'info' collide with the Settings side panel's .ap-info, which narrow
// windows hide — the Controls tab's "Key rebinding isn't available" note
// vanished at 1024x576 and 1152x648 (fix-M1-r5, MENU-R5-F2).
export function note(text, tone = 'info') {
  return h('p', `ap-note ap-note-${tone}`, text);
}

export const widgets = Object.freeze({ slider, toggle, select, button, section, note });
