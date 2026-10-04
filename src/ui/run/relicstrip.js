// The RELIC STRIP (docs/CONTENT_PLAN.md §5 "a relic strip on the HUD corner
// plate"): the run's relics as a row of drawn icons tucked under the Glint
// plate, plus the live curse (violet mark + its name) while a cursed room is
// being fought. A pure view over run.view().relics; it lives beside the run
// pages so the HUD module stays untouched. Hover a badge for its text.
import { esc } from './style.js';
import { RARITY_COLOR } from './cards.js';
import { relicIconHtml, curseIconHtml } from './relicicons.js';
import { PALETTE } from '../../data/palette.js';

export const RELIC_STRIP_CSS = `
  #relic-strip {
    position: fixed; z-index: 13; display: none;
    flex-direction: column; align-items: flex-end; gap: 6px;
    pointer-events: auto; user-select: none;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  #relic-strip.rl-on { display: flex; }
  #relic-strip .rl-badges {
    display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; max-width: 300px;
    padding: 5px 7px; border-radius: 10px;
    background: ${PALETTE.voidCharcoal}D9; border: 1px solid ${PALETTE.warmGrey}66;
  }
  #relic-strip .rl-badge {
    width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
    background: #2e2a25; border: 2px solid var(--rar, ${PALETTE.bone}); color: var(--rar, ${PALETTE.bone});
  }
  #relic-strip .rl-badge.rl-new { animation: rl-pop 900ms ease-out 1; }
  @keyframes rl-pop {
    0% { transform: scale(1.6); box-shadow: 0 0 18px var(--rar); }
    100% { transform: scale(1); box-shadow: none; }
  }
  #relic-strip .rl-badge .rl-icon { width: 22px; height: 22px; }
  #relic-strip .rl-curse {
    display: flex; align-items: center; gap: 7px; padding: 4px 10px 4px 7px; border-radius: 10px;
    background: ${PALETTE.voidCharcoal}E6; border: 1px solid ${PALETTE.godstuffViolet}99;
    font-size: 16px; font-weight: 800; letter-spacing: 0.06em; color: ${PALETTE.godstuffViolet};
  }
  #relic-strip .rl-curse .rl-icon { width: 22px; height: 22px; }
  #relic-strip .rl-curse span { color: ${PALETTE.bone}; font-weight: 600; letter-spacing: 0; }
`;

export function createRelicStrip() {
  const el = document.createElement('div');
  el.id = 'relic-strip';
  document.body.appendChild(el);
  let sig = '';
  let known = new Set();
  let placedAt = -1;

  // Under the Glint plate (re-measured now and then: the HUD scales with
  // the window and the plate's width follows the wallet).
  function place(force = false) {
    const now = performance.now();
    if (!force && now - placedAt < 500) return;
    placedAt = now;
    const g = document.querySelector('.hud-glint');
    const r = g ? g.getBoundingClientRect() : null;
    if (r && r.width > 1) {
      el.style.top = `${Math.round(r.bottom + 8)}px`;
      el.style.right = `${Math.max(8, Math.round(window.innerWidth - r.right))}px`;
    } else {
      el.style.top = '86px';
      el.style.right = '18px';
    }
  }

  function update(view) {
    const R = view && view.active && view.relics ? view.relics : null;
    const curseLive = R && R.curse && view.room === R.curse.room && view.phase === 'combat' ? R.curse : null;
    const show = !!R && (R.owned.length > 0 || !!curseLive);
    const s = show ? `${R.owned.map((o) => o.id).join(',')}|${curseLive ? curseLive.id : '-'}` : 'off';
    if (s !== sig) {
      sig = s;
      el.classList.toggle('rl-on', show);
      if (!show) {
        if (!R) known = new Set();
        el.innerHTML = '';
      } else {
        const badges = R.owned
          .map((o) => {
            const fresh = !known.has(o.id);
            return `<div class="rl-badge${fresh ? ' rl-new' : ''}" style="--rar:${RARITY_COLOR[o.rarity] ?? PALETTE.bone}" title="${esc(`${o.name} — ${o.text}`)}">${relicIconHtml(o.id, 22)}</div>`;
          })
          .join('');
        known = new Set(R.owned.map((o) => o.id));
        el.innerHTML =
          (badges ? `<div class="rl-badges">${badges}</div>` : '') +
          (curseLive ? `<div class="rl-curse" title="${esc(curseLive.text)}">${curseIconHtml(22)} CURSED <span>${esc(curseLive.name)}</span></div>` : '');
      }
      place(true);
    } else if (show) place();
  }

  window.addEventListener('resize', () => place(true));
  return { el, update };
}
