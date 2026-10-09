// The RELIC PAGE (docs/CONTENT_PLAN.md §5) — phase 'relic', after the draft of
// room 1 of every level and of every cursed room the party cleared. Three
// relic cards, take one: no reroll, no decline, no reopen (the §16 grammar of
// the draft page). A / D or arrows focus, Enter takes (fresh-press rule, the
// run UI's settle window), a click takes that card, pad left / right / A.
import { esc } from './style.js';
import { RARITY_COLOR } from './cards.js';
import { relicIconHtml, curseIconHtml } from './relicicons.js';
import { PALETTE } from '../../data/palette.js';
import { CLASS_NAME } from '../../data/classes.js';
import { t, tn } from '../../i18n/index.js';

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
  /* Slice 2: a MAJOR curse's door — a double violet rim that breathes, and a
     heavier note (shape + words, never colour alone). */
  .rn-door.rl-major { border-color: ${PALETTE.godstuffViolet}; box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 0 0 4px ${PALETTE.godstuffViolet}88, inset 0 -18px 34px #00000066; animation: rl-bind 1.8s ease-in-out infinite; }
  .rn-door.rl-major .rl-gcurse { top: 10px; right: 10px; }
  @keyframes rl-bind {
    0%, 100% { box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 0 0 4px ${PALETTE.godstuffViolet}66, inset 0 -18px 34px #00000066, 0 0 10px ${PALETTE.godstuffViolet}33; }
    50% { box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 0 0 4px ${PALETTE.godstuffViolet}CC, inset 0 -18px 34px #00000066, 0 0 30px ${PALETTE.godstuffViolet}77; }
  }
  /* Slice 2: the peddler's RELIC SHELF — a compact rack under the node
     shelf. Each tile: the drawn icon in its rarity rim, the name + effect,
     a brass plaque (dashed when the viewed purse is short; never greyed). */
  #run-screen .rn-shop .rl-rack { margin: 8px 0 2px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 5px; }
  #run-screen .rn-shop .rl-racklab { display: flex; align-items: baseline; gap: 10px; font-size: 14px; color: ${PALETTE.warmGrey}; letter-spacing: 0.04em; }
  #run-screen .rn-shop .rl-racklab > b { color: ${PALETTE.paleGold}; letter-spacing: 0.16em; font-size: 15px; }
  #run-screen .rn-shop .rl-racklab span b { color: ${PALETTE.bone}; }
  #run-screen .rn-shop .rl-rackrow { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
  #run-screen .rn-shop .rl-ritem {
    position: relative; display: flex; align-items: center; gap: 10px; width: 400px; max-width: 44vw;
    padding: 7px 10px 7px 8px; border-radius: 12px; cursor: pointer;
    background: linear-gradient(180deg, #2F2A23 0%, ${PALETTE.voidCharcoal} 100%);
    border: 2px solid var(--rar, ${PALETTE.bone}); box-shadow: 0 0 14px #00000088, inset 0 0 12px #00000066;
    transition: top 110ms ease, box-shadow 110ms ease; top: 0;
  }
  #run-screen .rn-shop .rl-ritem.rl-rhover { top: -4px; box-shadow: 0 0 0 2px ${PALETTE.voidCharcoal}, 0 0 0 4px ${PALETTE.parchment}, 0 0 22px var(--rar, ${PALETTE.bone}); }
  #run-screen .rn-shop .rl-ricon {
    flex: none; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
    color: var(--rar, ${PALETTE.bone}); border: 2px solid var(--rar, ${PALETTE.bone});
    background: radial-gradient(circle at 40% 32%, #47402F 0%, #1C2230 100%); box-shadow: 0 0 12px var(--rar, transparent);
  }
  #run-screen .rn-shop .rl-rtext { flex: 1; min-width: 0; }
  #run-screen .rn-shop .rl-rname { font-size: 17px; font-weight: 800; color: ${PALETTE.parchment}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #run-screen .rn-shop .rl-rrar { font-size: 11px; letter-spacing: 0.14em; color: var(--rar, ${PALETTE.bone}); margin-left: 4px; }
  #run-screen .rn-shop .rl-rbody { font-size: 14px; line-height: 1.25; color: ${PALETTE.bone}; }
  #run-screen .rn-shop .rl-rplaque { flex: none; padding: 5px 10px; gap: 5px; }
  #run-screen .rn-shop .rl-rplaque .rn-price { font-size: 20px; }
  #run-screen .rn-shop .rl-rplaque.rl-rdeny { animation: rl-deny 300ms linear 1; border-color: ${PALETTE.hearthAmber}; }
  @keyframes rl-deny { 0% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(2px); } 100% { transform: translateX(0); } }
  #run-screen .rn-shop .rl-ritem.rl-rsold { cursor: default; opacity: 0.82; }
  #run-screen .rn-shop .rl-ritem.rl-rsold .rl-ricon { box-shadow: 0 0 22px var(--rar); }
  #run-screen .rn-shop .rl-rstamp {
    flex: none; padding: 4px 10px; border-radius: 6px; transform: rotate(-6deg);
    border: 2px solid ${PALETTE.hearthAmber}; color: ${PALETTE.hearthAmber}; font-weight: 900; letter-spacing: 0.16em; font-size: 15px;
  }
  #run-screen .rn-shop .rl-ritem.rl-rflare { animation: rl-flare 900ms ease-out 1; }
  #run-screen .rn-shop .rl-ritem.rl-rflare .rl-rstamp { animation: rl-slam 380ms cubic-bezier(.3,1.6,.5,1) 1; }
  @keyframes rl-flare { 0% { box-shadow: 0 0 0 0 var(--rar), 0 0 46px var(--rar); } 100% { box-shadow: 0 0 14px #00000088, inset 0 0 12px #00000066; } }
  @keyframes rl-slam { 0% { transform: rotate(-6deg) scale(2.2); opacity: 0; } 100% { transform: rotate(-6deg) scale(1); opacity: 1; } }

  .rn-path .rl-cursenote.rl-majornote { border-width: 2px; border-color: ${PALETTE.godstuffViolet}; box-shadow: 0 0 22px ${PALETTE.godstuffViolet}44; }
`;

const RARITY_WORD = { common: 'common', rare: 'rare', legendary: 'legendary' };

export function createRelicScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-relic';
  el.innerHTML = `
    <div class="rn-title rl-title">${esc(t('A RELIC ON THE ROAD'))}</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-sub rl-sub"></div>
    <div class="rl-row"></div>
    <div class="rl-owned"></div>
    <div class="rn-hint">${t('<b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> take it')}</div>`;
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
    if (o.source === 'major' && o.curse) {
      titleEl.textContent = t('A GREATER RELIC');
      subEl.innerHTML = `<span class="rl-lift">${curseIconHtml(20, true)} ${esc(t('{name} binds you for the rest of the run.', { name: t(o.curse.name) }))}</span><span>${esc(t('Choose what it pays.'))}</span>`;
    } else if (o.source === 'curse' && o.curse) {
      titleEl.textContent = t('THE CURSE LIFTS');
      subEl.innerHTML = `<span class="rl-lift">${curseIconHtml(20)} ${esc(t('{name} is broken.', { name: t(o.curse.name) }))}</span><span>${esc(t('Choose what it leaves behind.'))}</span>`;
    } else if (o.source === 'vault') {
      // KEYS AND VAULTS (docs/VAULTS.md): the vault's chest.
      titleEl.textContent = t("THE VAULT'S CHEST");
      subEl.textContent = t('A relic from the hoard. Choose one.');
    } else if (o.source === 'champion') {
      // CHAMPION ROOMS (docs/CHAMPIONS.md): the felled champion's chest.
      titleEl.textContent = t("THE CHAMPION'S CHEST");
      subEl.textContent = t('A rare or legendary relic for the run. Choose one.');
    } else {
      titleEl.textContent = t('A RELIC ON THE ROAD');
      subEl.textContent = t('Relics last the whole run. Choose one.');
    }
    row.innerHTML = o.choices
      .map(
        (c, i) => `
      <div class="rl-slot" data-i="${i}">
        <div class="rn-card rn-${c.rarity}" style="--rar:${RARITY_COLOR[c.rarity] ?? PALETTE.bone}">
          <div class="rn-cardkind">${esc(t(RARITY_WORD[c.rarity] ?? c.rarity).toUpperCase())}${c.cls && CLASS_NAME[c.cls] ? ` · ${esc(t(CLASS_NAME[c.cls]).toUpperCase())}` : ''}</div>
          <div class="rn-cardicon">${relicIconHtml(c.id, 44)}</div>
          <div class="rn-cardname">${esc(t(c.name))}</div>
          <div class="rn-body">${esc(t(c.text))}</div>
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
    ownedEl.textContent = n === 0 ? t('Your first relic of the run.') : tn(n, 'You carry {n} relic: {names}.', 'You carry {n} relics: {names}.', { names: view.relics.owned.map((r) => t(r.name)).join(', ') });
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
