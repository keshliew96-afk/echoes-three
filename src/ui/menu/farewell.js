// Farewell card (docs/gauntlet/PLAN.md §5 Exit). Owner: M1.
// Shown when Exit was confirmed but the browser kept the tab open (scripts may
// only close windows they opened, or a tab with a single history entry) — the
// honest end state instead of a button that "does nothing". Return (Enter / A /
// click, and Esc / B) goes back to the title with every setting intact.
import { service } from '../../app/registry.js';
import { createHints } from './hints.js';
import { t } from '../../i18n/index.js';

export function createFarewellScreen(ctx) {
  const { app } = ctx;
  const el = document.createElement('div');
  el.className = 'ap-farewell';
  el.setAttribute('role', 'dialog');
  el.innerHTML = `
    <div class="ap-dlg ap-plate">
      <div class="ap-logo"><div class="ap-logo-word">ECHOES</div><div class="ap-logo-rule">◆</div></div>
      <div class="ap-dlg-title">${t('Thanks for playing Echoes.')}</div>
      <div class="ap-dlg-body"></div>
      <div class="ap-dlg-btns" style="justify-content:center"></div>
    </div>`;
  const body = el.querySelector('.ap-dlg-body');
  const btns = el.querySelector('.ap-dlg-btns');
  const ret = document.createElement('button');
  ret.type = 'button';
  ret.className = 'ap-btn ap-primary';
  ret.id = 'ap-farewell-return';
  ret.textContent = t('Return to Title');
  ret.setAttribute('data-nav', '');
  ret.setAttribute('data-nav-default', '');
  ret.addEventListener('click', () => app.returnToTitle());
  btns.appendChild(ret);
  const hints = createHints(app, [['confirm', t('Return to Title')]]);
  hints.el.style.justifyContent = 'center';
  el.querySelector('.ap-dlg').appendChild(hints.el);

  return {
    el,
    blocking: true,
    layer: 'farewell',
    onOpen() {
      body.textContent = service('save')
        ? t('Your browser keeps this tab open — close it whenever you like. Your progress is saved.')
        : t('Your browser keeps this tab open — close it whenever you like. Your settings are saved.');
    },
    back() {
      app.returnToTitle();
      return true;
    },
  };
}
