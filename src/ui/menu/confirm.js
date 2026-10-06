// Confirm dialog behind app.confirm() (docs/gauntlet/PLAN.md §3.1). Owner: M1.
// params: { title, body, confirmLabel='Confirm', cancelLabel='Cancel',
//           danger=false, defaultFocus='cancel'|'confirm', timeoutMs=0,
//           timeoutResult=false, resolve(bool) }
// resolve is called exactly once — confirm, cancel, Esc/B/right-click (=
// cancel) or the timeout — and always AFTER the dialog popped itself, so the
// caller may open the next screen from its continuation. Rebuilt per open
// (reusable: false), so two nested confirms never share state.
import { createHints } from './hints.js';
import { t } from '../../i18n/index.js';

export function createConfirmScreen(ctx) {
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-dialog';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ap-dlg ap-plate">
      <div class="ap-dlg-title"></div>
      <div class="ap-dlg-body"></div>
      <div class="ap-dlg-count"></div>
      <div class="ap-dlg-btns"></div>
    </div>`;
  const titleEl = el.querySelector('.ap-dlg-title');
  const bodyEl = el.querySelector('.ap-dlg-body');
  const countEl = el.querySelector('.ap-dlg-count');
  const btns = el.querySelector('.ap-dlg-btns');
  const hints = createHints(app, [
    ['adjust', t('Select')],
    ['confirm', t('OK')],
    ['back', t('Cancel')],
  ]);
  hints.el.style.justifyContent = 'flex-end';
  el.querySelector('.ap-dlg').appendChild(hints.el);

  let p = null;
  let settled = false;
  let timer = 0;
  let tickTimer = 0;

  function finish(v) {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    clearInterval(tickTimer);
    if (manager.top() === 'confirm') manager.pop();
    if (p && typeof p.resolve === 'function') p.resolve(!!v);
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
      titleEl.textContent = params.title || t('Are you sure?');
      bodyEl.textContent = params.body || '';
      bodyEl.style.display = params.body ? '' : 'none';
      btns.textContent = '';
      const ok = mk(params.confirmLabel || t('Confirm'), params.danger ? 'ap-danger' : 'ap-primary', 'ap-confirm-ok', () => finish(true));
      const cancel = mk(params.cancelLabel || t('Cancel'), 'ap-secondary', 'ap-confirm-cancel', () => finish(false));
      btns.append(ok, cancel);
      (params.defaultFocus === 'confirm' ? ok : cancel).setAttribute('data-nav-default', '');
      countEl.textContent = '';
      countEl.style.display = 'none';
      const ms = Number(params.timeoutMs) || 0;
      if (ms > 0) {
        const until = performance.now() + ms;
        const paint = () => {
          const left = Math.max(0, Math.ceil((until - performance.now()) / 1000));
          countEl.style.display = '';
          countEl.textContent = t('{action} in {n} s', { action: params.timeoutResult ? params.confirmLabel || t('Confirm') : params.cancelLabel || t('Cancel'), n: left });
        };
        paint();
        tickTimer = setInterval(paint, 250);
        timer = setTimeout(() => finish(!!params.timeoutResult), ms);
      }
    },
    onClose() {
      clearTimeout(timer);
      clearInterval(tickTimer);
      // Popped by someone else (e.g. a Quit clearing the stack): that is a Cancel.
      if (!settled) {
        settled = true;
        if (p && typeof p.resolve === 'function') p.resolve(false);
      }
    },
    back() {
      finish(false);
      return true;
    },
  };
  return screen;
}
