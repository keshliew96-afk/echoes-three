// "Keep these display settings?" (docs/gauntlet/PLAN.md §5 apply/revert).
// Owner: M1. Armed ONLY for changes a timeout can truthfully undo without a
// user gesture — the resolution scale and ENTERING fullscreen — and opened
// when the player leaves the Display tab or closes Settings. Default focus is
// Keep; Revert, Esc/B and the 10 s timeout all revert (the setting AND its
// observable effect — the caller restores the drawing buffer / exits
// fullscreen). params: { changes: [text], seconds = 10, resolve('keep'|'revert') }
import { createHints } from './hints.js';

export function createKeepDisplayScreen(ctx) {
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-dialog ap-keepdisplay';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="ap-veil" style="opacity:0.55"></div>
    <div class="ap-dlg ap-plate">
      <div class="ap-dlg-title">Keep these display settings?</div>
      <ul class="ap-dlg-list"></ul>
      <div class="ap-dlg-count" aria-live="polite"></div>
      <div class="ap-dlg-btns"></div>
    </div>`;
  const list = el.querySelector('.ap-dlg-list');
  const countEl = el.querySelector('.ap-dlg-count');
  const btns = el.querySelector('.ap-dlg-btns');
  const hints = createHints(app, [
    ['adjust', 'Select'],
    ['confirm', 'OK'],
    ['back', 'Revert'],
  ]);
  hints.el.style.justifyContent = 'flex-end';
  el.querySelector('.ap-dlg').appendChild(hints.el);

  let p = null;
  let settled = false;
  let timer = 0;
  let tickTimer = 0;
  let until = 0;

  function finish(result) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    clearInterval(tickTimer);
    if (manager.top() === 'keep-display') manager.pop();
    if (p && typeof p.resolve === 'function') p.resolve(result);
  }

  function mk(label, cls, id, onPress) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `ap-btn ${cls}`;
    b.id = id;
    b.textContent = label;
    b.setAttribute('data-nav', '');
    b.addEventListener('click', onPress);
    return b;
  }

  const screen = {
    el,
    blocking: true,
    layer: 'dialog',
    reusable: false,
    onOpen(params = {}) {
      p = params;
      settled = false;
      list.textContent = '';
      for (const c of params.changes && params.changes.length ? params.changes : ['Display settings changed']) {
        const li = document.createElement('li');
        li.textContent = c;
        list.appendChild(li);
      }
      btns.textContent = '';
      const keep = mk('Keep', 'ap-primary', 'ap-keep-keep', () => finish('keep'));
      const revert = mk('Revert', 'ap-secondary', 'ap-keep-revert', () => finish('revert'));
      keep.setAttribute('data-nav-default', '');
      btns.append(keep, revert);
      const secs = Math.max(1, Number(params.seconds) || 10);
      until = performance.now() + secs * 1000;
      const paint = () => {
        const left = Math.max(0, Math.ceil((until - performance.now()) / 1000));
        countEl.textContent = `Reverting in ${left} s`;
      };
      paint();
      tickTimer = setInterval(paint, 200);
      timer = setTimeout(() => finish('revert'), secs * 1000);
    },
    onClose() {
      clearTimeout(timer);
      clearInterval(tickTimer);
      if (!settled) {
        settled = true;
        if (p && typeof p.resolve === 'function') p.resolve('revert');
      }
    },
    back() {
      finish('revert');
      return true;
    },
    debug: () => ({ settled, leftMs: Math.max(0, Math.round(until - performance.now())) }),
  };
  return screen;
}
