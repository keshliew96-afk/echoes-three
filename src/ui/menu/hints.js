// Control hints for menu footers (M1). The glyphs follow the LAST input device
// (keyboard/mouse vs gamepad), so a pad player reads "A Select · B Back" and a
// keyboard player "Enter Select · Esc Back" — the Hades / Celeste convention.
const GLYPHS = Object.freeze({
  keyboard: { move: ['↑', '↓'], adjust: ['←', '→'], confirm: ['Enter'], back: ['Esc'], tabs: ['Q', 'E'], secondary: ['Del'], start: ['Enter'] },
  gamepad: { move: ['D-pad'], adjust: ['◀', '▶'], confirm: ['A'], back: ['B'], tabs: ['LB', 'RB'], secondary: ['X'], start: ['A'] },
});

function chip(text, pad) {
  const k = document.createElement('span');
  k.className = pad ? 'ap-kbd ap-pad' : 'ap-kbd';
  k.textContent = text;
  return k;
}

// createHints(app, [['move', 'Select'], ['confirm', 'OK'], ...]) -> { el, render() }
export function createHints(app, items) {
  const el = document.createElement('div');
  el.className = 'ap-hints';
  let shown = null;
  function render(force = false) {
    const src = app.nav ? app.nav.lastSource : 'keyboard';
    const kind = src === 'gamepad' ? 'gamepad' : 'keyboard';
    if (!force && kind === shown) return;
    shown = kind;
    el.textContent = '';
    for (const [key, label] of items) {
      const g = GLYPHS[kind][key];
      if (!g) continue;
      const h = document.createElement('span');
      h.className = 'ap-hint';
      for (const t of g) h.appendChild(chip(t, kind === 'gamepad'));
      h.appendChild(document.createTextNode(label));
      el.appendChild(h);
    }
  }
  render(true);
  if (app.nav && typeof app.nav.onSource === 'function') app.nav.onSource(() => render());
  return { el, render };
}
