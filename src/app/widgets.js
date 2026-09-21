// Settings / menu widget kit (docs/gauntlet/PLAN.md §3.2). Owner: M1.
// ARCH stub: functional, deliberately unstyled controls with the FINAL API so
// M3 (Audio tab), M2 (save slots), M5b (lobby) can build against it while M1
// styles and hardens it. Every control:
//   - returns { el, get(), set(v, {silent}), focus(), setDisabled(bool, reason) }
//   - marks its focusable node [data-nav] for the screen manager
//   - adjustable controls (slider, select) expose node.__navAdjust(dir) so the
//     manager routes 'left'/'right' (arrow keys, D-pad) to them while focused
//   - calls onInput(v) continuously while dragging/adjusting and onChange(v)
//     once per committed change (mouse up, key press, gamepad step)
// Class prefix: ap- (app). No colour literals here beyond the palette tokens
// M1's stylesheet assigns; keep the DOM semantic (label/button/input).

function h(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function disabler(node, noteEl) {
  return (on, reason = '') => {
    node.disabled = !!on;
    node.setAttribute('aria-disabled', on ? 'true' : 'false');
    if (noteEl) noteEl.textContent = on ? reason : '';
  };
}

// slider({ label, min=0, max=1, step=0.01, value, format(v)->string, onInput, onChange, note })
export function slider({ label, min = 0, max = 1, step = 0.01, value = min, format = (v) => String(v), onInput, onChange, note = '' }) {
  const el = h('div', 'ap-row ap-slider');
  const lab = h('label', 'ap-label', label);
  const input = h('input', 'ap-range');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute('data-nav', '');
  input.setAttribute('aria-label', label);
  const out = h('output', 'ap-value', format(value));
  const noteEl = h('div', 'ap-note', note);
  el.append(lab, input, out, noteEl);
  const read = () => Number(input.value);
  input.addEventListener('input', () => {
    out.textContent = format(read());
    if (onInput) onInput(read());
  });
  input.addEventListener('change', () => onChange && onChange(read()));
  input.__navAdjust = (dir) => {
    const v = Math.min(max, Math.max(min, read() + dir * step));
    input.value = String(v);
    out.textContent = format(read());
    if (onInput) onInput(read());
    if (onChange) onChange(read());
  };
  return {
    el,
    input,
    get: read,
    set(v, { silent = true } = {}) {
      input.value = String(v);
      out.textContent = format(read());
      if (!silent && onChange) onChange(read());
    },
    focus: () => input.focus(),
    setDisabled: disabler(input, noteEl),
    setNote: (t) => (noteEl.textContent = t),
  };
}

// toggle({ label, value=false, onChange, onLabel='On', offLabel='Off', note })
export function toggle({ label, value = false, onChange, onLabel = 'On', offLabel = 'Off', note = '' }) {
  const el = h('div', 'ap-row ap-toggle');
  const lab = h('span', 'ap-label', label);
  const btn = h('button', 'ap-switch');
  btn.type = 'button';
  btn.setAttribute('data-nav', '');
  btn.setAttribute('role', 'switch');
  const noteEl = h('div', 'ap-note', note);
  let v = !!value;
  const paint = () => {
    btn.setAttribute('aria-checked', v ? 'true' : 'false');
    btn.textContent = v ? onLabel : offLabel;
  };
  paint();
  btn.addEventListener('click', () => {
    v = !v;
    paint();
    if (onChange) onChange(v);
  });
  btn.__navAdjust = () => btn.click();
  el.append(lab, btn, noteEl);
  return {
    el,
    get: () => v,
    set(nv, { silent = true } = {}) {
      v = !!nv;
      paint();
      if (!silent && onChange) onChange(v);
    },
    focus: () => btn.focus(),
    setDisabled: disabler(btn, noteEl),
    setNote: (t) => (noteEl.textContent = t),
  };
}

// select({ label, options: [{ value, label, disabled?, note? }], value, onChange, note })
// Cycles with left/right (console-style) and opens nothing: every option is
// reachable by keyboard, mouse (click cycles; the arrows buttons step) and pad.
export function select({ label, options, value, onChange, note = '' }) {
  const el = h('div', 'ap-row ap-select');
  const lab = h('span', 'ap-label', label);
  const prev = h('button', 'ap-step ap-prev', '‹');
  const cur = h('button', 'ap-choice');
  const next = h('button', 'ap-step ap-next', '›');
  for (const b of [prev, cur, next]) b.type = 'button';
  cur.setAttribute('data-nav', '');
  const noteEl = h('div', 'ap-note', note);
  let idx = Math.max(0, options.findIndex((o) => o.value === value));
  const paint = () => {
    const o = options[idx];
    cur.textContent = o ? o.label : '';
    noteEl.textContent = (o && o.note) || note;
  };
  const step = (dir) => {
    for (let k = 0; k < options.length; k++) {
      idx = (idx + dir + options.length) % options.length;
      if (!options[idx].disabled) break;
    }
    paint();
    if (onChange) onChange(options[idx].value);
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  cur.addEventListener('click', () => step(1));
  cur.__navAdjust = (dir) => step(dir);
  paint();
  el.append(lab, prev, cur, next, noteEl);
  return {
    el,
    get: () => options[idx] && options[idx].value,
    set(v, { silent = true } = {}) {
      const i = options.findIndex((o) => o.value === v);
      if (i >= 0) idx = i;
      paint();
      if (!silent && onChange) onChange(options[idx].value);
    },
    focus: () => cur.focus(),
    setDisabled: disabler(cur, noteEl),
    setNote: (t) => (noteEl.textContent = t),
  };
}

// button({ label, onPress, variant='secondary'|'primary'|'danger', disabled=false, reason })
export function button({ label, onPress, variant = 'secondary', disabled = false, reason = '' }) {
  const btn = h('button', `ap-btn ap-${variant}`, label);
  btn.type = 'button';
  btn.setAttribute('data-nav', '');
  btn.addEventListener('click', () => {
    if (!btn.disabled && onPress) onPress();
  });
  const set = disabler(btn, null);
  set(disabled, reason);
  if (disabled && reason) btn.title = reason;
  return {
    el: btn,
    get: () => label,
    set: (t) => (btn.textContent = t),
    focus: () => btn.focus(),
    setDisabled: (on, why = '') => {
      set(on, why);
      btn.title = on ? why : '';
    },
  };
}

// section(title) -> heading element; note(text) -> muted paragraph
export function section(title) {
  return h('h3', 'ap-section', title);
}

export function note(text, tone = 'info') {
  return h('p', `ap-note ap-${tone}`, text);
}

export const widgets = Object.freeze({ slider, toggle, select, button, section, note });
