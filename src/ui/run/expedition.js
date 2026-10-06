// Expedition picker (docs/gauntlet/PLAN.md §1.3 / §4.1, BUILD_BRIEF §23.1,
// ruling A14). Owner: M4a. An app screen (registerScreen('expedition')) the
// camp portal pushes ONLY in a title-booted session with >= 2 acts unlocked;
// menu-skip boots and single-unlock profiles start the act directly.
//
// Three cards — name, blurb, "Danger I/II/III", lock state (locked cards are
// Bone with a lock glyph and "Win <previous act> to unlock"; never colour
// alone). The last-played act is preselected. E, Enter or Space confirms the
// focused card; A/D/←/→ move; Esc/B backs out to the camp (the portal press
// is cancelled). Blocking: the single-player sim pauses while it is open.
//
// params: { levels:[{act,name,blurb,tier}], unlocked:[act], preselect:act,
//           preselectReason:'last'|'newest', onChoose(act), onCancel() }
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { t } from '../../i18n/index.js';

const ROMAN = ['', 'I', 'II', 'III'];
const STYLE_ID = 'ex-style';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.ex-picker .ex-wrap {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(94vw, ${px(1420)}); padding: ${px(30)} ${px(36)} ${px(26)};
  display: flex; flex-direction: column; align-items: center; gap: ${px(16)};
}
.ex-picker .ex-head { display: flex; flex-direction: column; align-items: center; gap: ${px(4)}; }
.ex-picker .ex-sub { font-size: ${px(22)}; color: ${P.bone}; letter-spacing: 0.04em; }
.ex-picker .ex-cards { display: flex; gap: ${px(24)}; width: 100%; justify-content: center; }
.ex-picker .ex-card {
  position: relative; flex: 1 1 0; min-width: 0; max-width: ${px(420)};
  min-height: ${px(330)}; padding: ${px(20)} ${px(22)} ${px(18)};
  display: flex; flex-direction: column; gap: ${px(10)}; text-align: left;
  background: linear-gradient(172deg, #2C2823 0%, ${P.voidCharcoal} 70%);
  border: max(2px, ${px(2)}) solid ${P.warmGrey}88; border-radius: ${px(16)};
  color: ${P.parchment}; cursor: pointer; font-family: inherit;
  transition: transform 90ms ease, box-shadow 90ms ease, border-color 90ms ease;
}
.ex-picker .ex-card.ap-focus {
  outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(3)};
  transform: translateY(${px(-3)}) scale(1.03);
  border-color: ${P.hearthAmber}CC;
  box-shadow: 0 ${px(12)} ${px(28)} #000000AA, 0 0 ${px(20)} ${P.hearthAmber}33;
}
.ex-picker .ex-card.ex-pre::after {
  content: attr(data-badge); position: absolute; right: ${px(16)}; top: ${px(-13)};
  font-size: ${px(16)}; font-weight: 800; letter-spacing: 0.14em;
  padding: ${px(3)} ${px(10)}; border-radius: ${px(8)};
  background: ${P.voidCharcoal}; color: ${P.hearthAmber}; border: 1px solid ${P.hearthAmber}AA;
}
.ex-picker .ex-card[aria-disabled="true"] .ex-pip.ex-on { background: ${P.bone}66; border-color: ${P.bone}99; }
.ex-picker .ex-act { font-size: ${px(20)}; font-weight: 800; letter-spacing: 0.22em; color: ${P.warmGrey}; }
.ex-picker .ex-name { font-size: ${px(34)}; font-weight: 800; letter-spacing: 0.03em; line-height: 1.1; }
.ex-picker .ex-blurb { font-size: ${px(22)}; color: ${P.bone}; line-height: 1.35; flex: 1 1 auto; }
.ex-picker .ex-danger { display: flex; align-items: center; gap: ${px(10)}; font-size: ${px(22)}; font-weight: 700; letter-spacing: 0.08em; }
.ex-picker .ex-pips { display: inline-flex; gap: ${px(6)}; }
.ex-picker .ex-pip { width: ${px(16)}; height: ${px(16)}; transform: rotate(45deg); border: max(2px, ${px(2)}) solid ${P.bone}; }
.ex-picker .ex-pip.ex-on { background: ${P.hearthAmber}; border-color: ${P.hearthAmber}; }
.ex-picker .ex-biome { font-size: ${px(20)}; color: ${P.warmGrey}; letter-spacing: 0.05em; }
.ex-picker .ex-card[aria-disabled="true"] { cursor: default; border-style: dashed; border-color: ${P.bone}77; }
.ex-picker .ex-card[aria-disabled="true"] .ex-name,
.ex-picker .ex-card[aria-disabled="true"] .ex-blurb { color: ${P.warmGrey}; }
.ex-picker .ex-lock { display: none; align-items: center; gap: ${px(10)}; font-size: ${px(22)}; font-weight: 700; color: ${P.bone}; }
.ex-picker .ex-card[aria-disabled="true"] .ex-lock { display: flex; }
.ex-picker .ex-lock svg { width: ${px(26)}; height: ${px(26)}; flex: none; }
.ex-picker .ex-foot { display: flex; gap: ${px(26)}; align-items: center; flex-wrap: wrap; justify-content: center; font-size: ${px(22)}; color: ${P.warmGrey}; }
.ex-picker .ex-foot b { display: inline-flex; align-items: center; justify-content: center; min-width: ${px(34)}; height: ${px(32)}; padding: 0 ${px(8)}; margin-right: ${px(6)};
  border-radius: ${px(7)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA; background: ${P.voidCharcoal}; color: ${P.bone}; font-weight: 700; }
@media (max-height: 640px) {
  .ex-picker .ex-card { min-height: ${px(290)}; }
}
`;
  document.head.appendChild(st);
}

const LOCK_SVG =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="7" y="14" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M11 14 V10 A5 5 0 0 1 21 10 V14" fill="none" stroke="currentColor" stroke-width="2.6"/><circle cx="16" cy="20.5" r="2" fill="currentColor"/></svg>';

const BIOME_LABEL = { wood: () => t('Night woodland'), mill: () => t('Flooded mill'), barrow: () => t('Burial mounds') };

export function createExpeditionScreen(ctx) {
  installStyle();
  const { manager } = ctx;
  const el = document.createElement('div');
  el.className = 'ex-picker';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('Choose an expedition'));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="ex-wrap ap-plate">
      <div class="ex-head">
        <div class="ap-orn">◆ ◇ ◆</div>
        <h2 class="ap-h2">${t('Choose an expedition')}</h2>
        <div class="ex-sub">${t('The gate opens onto three roads. Each is a full run of eight rooms.')}</div>
      </div>
      <div class="ex-cards"></div>
      <div class="ex-foot">
        <span><b>←</b><b>→</b>${t('Choose')}</span>
        <span><b>E</b><b>Enter</b>${t('Set out')}</span>
        <span><b>Esc</b>${t('Back to camp')}</span>
      </div>
    </div>`;
  const cardsEl = el.querySelector('.ex-cards');
  let p = null;
  let settled = false;
  let chosen = null;

  function finish(act) {
    if (settled) return;
    settled = true;
    chosen = act;
    if (manager.top() === 'expedition') manager.pop();
    if (act !== null) p?.onChoose?.(act);
    else p?.onCancel?.();
  }

  function render() {
    cardsEl.textContent = '';
    const levels = p?.levels ?? [];
    const unlocked = new Set(p?.unlocked ?? [1]);
    for (const lv of levels) {
      const open = unlocked.has(lv.act);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'ex-card';
      card.dataset.act = String(lv.act);
      card.setAttribute('data-nav', '');
      if (!open) card.setAttribute('aria-disabled', 'true');
      if (open && lv.act === p.preselect) {
        card.setAttribute('data-nav-default', '');
        card.classList.add('ex-pre');
        if (p.preselectReason === 'last') card.classList.add('ex-last');
        card.dataset.badge = p.preselectReason === 'last' ? t('LAST PLAYED') : t('NEWEST');
      }
      const prev = levels.find((l) => l.act === lv.act - 1);
      const pips = [1, 2, 3].map((i) => `<i class="ex-pip${i <= lv.act ? ' ex-on' : ''}"></i>`).join('');
      card.innerHTML = `
        <div class="ex-act">${t('ACT {act}', { act: ROMAN[lv.act] ?? lv.act })}</div>
        <div class="ex-name"></div>
        <div class="ex-blurb"></div>
        <div class="ex-biome">${BIOME_LABEL[lv.biome] ? BIOME_LABEL[lv.biome]() : ''}</div>
        <div class="ex-danger"><span>${t('Danger {level}', { level: ROMAN[lv.act] ?? lv.act })}</span><span class="ex-pips">${pips}</span></div>
        <div class="ex-lock">${LOCK_SVG}<span class="ex-lock-t"></span></div>`;
      card.querySelector('.ex-name').textContent = t(lv.name);
      card.querySelector('.ex-blurb').textContent = t(lv.blurb);
      card.querySelector('.ex-lock-t').textContent = prev ? t('Win {name} to unlock', { name: t(prev.name) }) : t('Locked');
      card.setAttribute(
        'aria-label',
        open
          ? t('{name}. Danger {level}.', { name: t(lv.name), level: ROMAN[lv.act] })
          : prev
            ? t('{name}. Danger {level}. Locked: win {prev} to unlock.', { name: t(lv.name), level: ROMAN[lv.act], prev: t(prev.name) })
            : t('{name}. Danger {level}. Locked: win the previous act to unlock.', { name: t(lv.name), level: ROMAN[lv.act] }),
      );
      card.addEventListener('click', () => {
        if (!open) return;
        finish(lv.act);
      });
      cardsEl.appendChild(card);
    }
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    reusable: false,
    defaultFocus: '[data-nav-default]',
    onOpen(params = {}) {
      p = params;
      settled = false;
      chosen = null;
      render();
    },
    onClose() {
      // Popped by anything other than a choice (a quit to title, a clear):
      // the portal press is cancelled, never left hanging.
      if (!settled) {
        settled = true;
        p?.onCancel?.();
      }
    },
    onNav(action, source) {
      // E is the portal key: in the picker it confirms the focused card
      // (the menu map reads KeyE as tabNext; there are no tabs here).
      if (action === 'tabNext' && source === 'keyboard') {
        const f = el.querySelector('.ex-card.ap-focus') ?? el.querySelector('[data-nav-default]');
        if (f && f.getAttribute('aria-disabled') !== 'true') f.click();
        return true;
      }
      if (action === 'tabPrev') return true;
      return false;
    },
    back() {
      finish(null);
      return true;
    },
    debug: () => ({ chosen, preselect: p?.preselect ?? null, unlocked: p?.unlocked ?? [] }),
  };
}
