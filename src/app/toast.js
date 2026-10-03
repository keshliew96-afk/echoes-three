// Toasts (docs/gauntlet/PLAN.md §3.1 app.toast, z-band 1300). Owner: M1.
// Non-blocking, non-focusable notices: bottom-centre above the command bar,
// newest on top, at most 3 on screen, each fades after `ms`. Tones map to the
// menu palette only (Warm Grey / Hearth Amber / Bone / Parchment on Umber) —
// never Ember, violet or Heal green.
const MAX_VISIBLE = 3;
const TONES = new Set(['info', 'good', 'warn', 'error']);

export function createToaster(root) {
  const wrap = document.createElement('div');
  wrap.className = 'ap-toasts';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-live', 'polite');
  root.appendChild(wrap);
  const log = [];

  function dismiss(el) {
    if (!el.isConnected) return;
    el.classList.remove('ap-in');
    setTimeout(() => el.remove(), 180);
  }

  function toast(text, { tone = 'info', ms = 2600 } = {}) {
    const t = TONES.has(tone) ? tone : 'info';
    const el = document.createElement('div');
    el.className = `ap-toast ap-${t}`;
    el.textContent = String(text);
    wrap.appendChild(el);
    while (wrap.children.length > MAX_VISIBLE) wrap.firstChild.remove();
    void el.offsetWidth;
    el.classList.add('ap-in');
    setTimeout(() => dismiss(el), Math.max(800, ms));
    log.push({ t: Math.round(performance.now()), tone: t, text: String(text) });
    if (log.length > 30) log.shift();
    return el;
  }

  return {
    toast,
    log: () => log.map((e) => ({ ...e })),
    visible: () => [...wrap.children].map((c) => c.textContent),
  };
}
