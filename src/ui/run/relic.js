// The RELIC PAGE (docs/CONTENT_PLAN.md §5) — phase 'relic', after the draft of
// room 1 of every level and of every cursed room the party cleared. Three
// relic cards, take one: no reroll, no decline, no reopen (the §16 grammar of
// the draft page). A / D or arrows focus, Enter takes (fresh-press rule, the
// run UI's settle window), a click takes that card, pad left / right / A.
import { esc } from './style.js';
import { RARITY_COLOR } from './cards.js';
import { relicIconHtml, curseIconHtml } from './relicicons.js';
import { PALETTE } from '../../data/palette.js';

export const RELIC_CSS = `
  .rn-relic .rl-row { display: flex; gap: 22px; margin: 4px 0 2px; }
  .rn-relic .rn-card { width: 250px; cursor: pointer; transition: transform 120ms ease, box-shadow 120ms ease; }
  /* Focus = lifted + a Parchment ring outside the rarity rim (the rim keeps
     the rarity colour, so a focused common never reads as a legendary). */
  .rn-relic .rn-card.rn-focus {
    transform: translateY(-6px);
    box-shadow: 0 0 0 2px ${PALETTE.voidCharcoal}, 0 0 0 5px ${PALETTE.parchment}, 0 0 28px ${PALETTE.parchment}44, 0 12px 30px #000000AA;
  }
  .rn-relic .rn-card.rn-focus .rn-cardname { color: ${PALETTE.parchment}; }
  .rn-relic .rl-sub { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .rn-relic .rn-cardicon { color: var(--rar, ${PALETTE.bone}); }
  .rn-relic .rl-caret { font-size: 20px; color: ${PALETTE.hearthAmber}; opacity: 0; text-align: center; margin-top: 6px; }
  .rn-relic .rl-slot.rn-on .rl-caret { opacity: 1; }
  .rn-relic .rl-lift { color: ${PALETTE.godstuffViolet}; display: inline-flex; align-items: center; gap: 6px; }
  .rn-relic .rl-lift .rl-icon { width: 20px; height: 20px; }
  .rn-relic .rl-owned { font-size: 16px; color: ${PALETTE.warmGrey}; margin-top: 10px; }

  /* Path doors: the cursed door wears a violet mark and rim (shape + word in
     the legend below, never colour alone). */
  .rn-door.rl-cursed { border-color: ${PALETTE.godstuffViolet}AA; }
  .rn-door.rl-cursed.rn-focus { border-color: ${PALETTE.godstuffViolet}; box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 -18px 34px #00000066, 0 0 26px ${PALETTE.godstuffViolet}66; }
  .rn-door .rl-gcurse { position: absolute; top: 14px; right: 14px; color: ${PALETTE.godstuffViolet}; line-height: 0; }
  .rn-path .rl-cursenote {
    margin-top: 12px; padding: 8px 14px; border-radius: 10px; max-width: 560px;
    border: 1px solid ${PALETTE.godstuffViolet}77; background: ${PALETTE.voidCharcoal};
    font-size: 17px; color: ${PALETTE.bone}; text-align: center;
    display: flex; align-items: center; gap: 10px; justify-content: center;
  }
  .rn-path .rl-cursenote b { color: ${PALETTE.godstuffViolet}; }
  .rn-path .rl-cursenote .rl-icon { color: ${PALETTE.godstuffViolet}; flex: none; }
`;

const RARITY_WORD = { common: 'common', rare: 'rare', legendary: 'legendary' };

export function createRelicScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-relic';
  el.innerHTML = `
    <div class="rn-title rl-title">A RELIC ON THE ROAD</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-sub rl-sub"></div>
    <div class="rl-row"></div>
    <div class="rl-owned"></div>
    <div class="rn-hint"><b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> take it</div>`;
  const titleEl = el.querySelector('.rl-title');
  const subEl = el.querySelector('.rl-sub');
  const row = el.querySelector('.rl-row');
  const ownedEl = el.querySelector('.rl-owned');
  let shownFocus = null;

  const offerOf = (view) => (view && view.relics ? view.relics.offer : null);

  // The cards are built once per offer; a focus move only toggles classes,
  // so a hover never replaces the card under the pointer mid-click.
  let builtKey = '';
  function render(view) {
    const o = offerOf(view);
    if (!o) return;
    const key = `${o.room}:${o.source}:${o.choices.map((c) => c.id).join(',')}`;
    if (key !== builtKey) {
      builtKey = key;
      build(view, o);
    }
    row.querySelectorAll('.rl-slot').forEach((slot, i) => {
      slot.classList.toggle('rn-on', o.focus === i);
      slot.querySelector('.rn-card').classList.toggle('rn-focus', o.focus === i);
    });
    shownFocus = o.focus;
  }
  function build(view, o) {
    if (o.source === 'curse' && o.curse) {
      titleEl.textContent = 'THE CURSE LIFTS';
      subEl.innerHTML = `<span class="rl-lift">${curseIconHtml(20)} ${esc(o.curse.name)} is broken.</span><span>Choose what it leaves behind.</span>`;
    } else {
      titleEl.textContent = 'A RELIC ON THE ROAD';
      subEl.textContent = 'Relics last the whole run. Choose one.';
    }
    row.innerHTML = o.choices
      .map(
        (c, i) => `
      <div class="rl-slot" data-i="${i}">
        <div class="rn-card rn-${c.rarity}" style="--rar:${RARITY_COLOR[c.rarity] ?? PALETTE.bone}">
          <div class="rn-cardkind">${esc((RARITY_WORD[c.rarity] ?? c.rarity).toUpperCase())}</div>
          <div class="rn-cardicon">${relicIconHtml(c.id, 44)}</div>
          <div class="rn-cardname">${esc(c.name)}</div>
          <div class="rn-body">${esc(c.text)}</div>
        </div>
        <div class="rl-caret">▲</div>
      </div>`
      )
      .join('');
    for (const slot of row.querySelectorAll('.rl-slot')) {
      const i = Number(slot.dataset.i);
      slot.addEventListener('mouseenter', () => {
        run().focusRelic(i);
      });
      slot.addEventListener('click', () => {
        run().focusRelic(i);
        run().chooseRelic(i);
      });
    }
    const n = view.relics.owned.length;
    ownedEl.textContent = n === 0 ? 'Your first relic of the run.' : `You carry ${n} relic${n === 1 ? '' : 's'}: ${view.relics.owned.map((r) => r.name).join(', ')}.`;
  }
  const sel = () => (shownFocus === null ? null : `0|${shownFocus}`);

  function move(d) {
    const sys = run();
    const o = offerOf(sys.view());
    if (!o) return;
    const n = o.choices.length;
    sys.focusRelic((o.focus + d + n) % n);
  }

  function key(code, fresh) {
    const sys = run();
    if (code === 'KeyA' || code === 'ArrowLeft') {
      move(-1);
      return true;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      move(1);
      return true;
    }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (!fresh) return true; // §16 fresh-press rule
      const o = offerOf(sys.view());
      sys.chooseRelic(o ? o.focus : 0);
      return true;
    }
    return false; // Esc passes through to the pause menu
  }

  function pad(action) {
    if (action === 'left' || action === 'right') {
      move(action === 'left' ? -1 : 1);
      return true;
    }
    if (action === 'confirm') {
      const o = offerOf(run().view());
      run().chooseRelic(o ? o.focus : 0);
      return true;
    }
    return false;
  }

  // Each offer opens on its first card (the sim's focus starts at 0).
  function open() {
    shownFocus = null;
    builtKey = '';
  }

  return { el, render, key, pad, sel, open, name: 'relic' };
}
