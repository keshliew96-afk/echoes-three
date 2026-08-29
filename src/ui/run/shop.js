// Shop (BUILD_BRIEF §16 "Shop (room 7, one visit)" + §14 economy):
//   - 3 node cards drawn at room activation, price plaques BELOW the card at
//     the §14 rarity prices 25 / 30 / 35
//   - Glint balance in the top context strip (Pale Gold + a >=24 px coin)
//   - "you own N" line when applicable
//   - purchase = whole-card click -> price-stamp flash -> the card departs to
//     the bench; no backfill, no sell-back, no reroll
//   - insufficient funds: plaque emphasis + ONE ~300 ms shake, the item stays
//     fully visible and is NEVER greyed or hidden for price (§14/§16)
//   - empty shelf: "nothing left to sell you"; Advance -> boss (one-way);
//     Esc inert
import { esc } from './style.js';
import { nodeCardHtml, RARITY_COLOR } from './cards.js';
import { NODES } from '../../sim/nodes.js';

export function createShopScreen({ run, build }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-shop';
  el.innerHTML = `
    <div class="rn-title">THE PEDDLER'S SHELF</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-strip">
      <span class="rn-glint"><span class="rn-coin">✦</span><span class="rn-amt">0</span></span>
      <span class="rn-lab">GLINT · ROOM</span><span class="rn-num">7</span>
      <span class="rn-lab">OF 8</span>
    </div>
    <div class="rn-shelf"></div>
    <div class="rn-note rn-empty" style="display:none"></div>
    <div class="rn-note rn-bought" style="display:none"></div>
    <div class="rn-buttons">
      <div class="rn-btn rn-advance rn-primary rn-focus">Advance to the Hollow Stag</div>
    </div>
    <div class="rn-hint">click a card to buy · <b>Enter</b> advance (one-way)</div>`;

  const shelf = el.querySelector('.rn-shelf');
  const amtEl = el.querySelector('.rn-amt');
  const emptyEl = el.querySelector('.rn-empty');
  // §16: a purchase "departs to bench" — the receipt line under the shelf says
  // where it went and how many the player now holds ("you own N").
  const boughtEl = el.querySelector('.rn-bought');
  el.querySelector('.rn-advance').addEventListener('click', () => run().advanceFromShop());

  const plaques = []; // index -> plaque element
  let signature = '';

  function build3(view) {
    const s = view.shop;
    shelf.innerHTML = '';
    plaques.length = 0;
    const sys = build();
    (s.stock ?? []).forEach((item, i) => {
      const n = NODES[item.node];
      const wrap = document.createElement('div');
      wrap.className = `rn-item${item.sold ? ' rn-sold' : ''}`;
      const verdict = sys ? sys.kitVerdict(item.node) : null;
      const extra = item.node === 'siphon' && sys ? sys.siphonCardLine() : null;
      wrap.innerHTML = `
        <div class="rn-card${n && n.rarity === 'legendary' ? ' rn-legendary' : ''}"
             style="--rar:${RARITY_COLOR[item.rarity] ?? RARITY_COLOR.common}">
          ${nodeCardHtml(item.node, { verdict, extra, owned: item.owned })}
          ${item.sold ? '<div class="rn-stamp">SOLD</div>' : ''}
        </div>
        <div class="rn-plaque">
          <span class="rn-price">${item.price}</span><span class="rn-cur">GLINT</span>
        </div>`;
      const card = wrap.querySelector('.rn-card');
      card.addEventListener('click', () => run().buy(i));
      plaques[i] = wrap.querySelector('.rn-plaque');
      shelf.appendChild(wrap);
    });
    // Only carry the copy while the shelf is actually empty — a hidden node
    // still contributes to textContent, and "nothing left to sell you" must
    // never be readable next to three live cards.
    const bare = (s.stock ?? []).length === 0;
    emptyEl.style.display = bare ? '' : 'none';
    emptyEl.textContent = bare ? 'nothing left to sell you' : '';
    const sold = (s.stock ?? []).filter((i) => i.sold);
    if (sold.length === 0) {
      boughtEl.style.display = 'none';
      boughtEl.textContent = '';
    } else {
      boughtEl.style.display = '';
      boughtEl.innerHTML = sold
        .map(
          (i) =>
            `<b>${esc(NODES[i.node] ? NODES[i.node].name : i.node)}</b> → bench · you own ${i.owned}`
        )
        .join('<br>');
    }
  }

  function render(view) {
    const s = view.shop;
    if (!s) return;
    amtEl.textContent = String(s.wallet);
    // Rebuild only when the shelf actually changes (a purchase, a fresh room)
    // so a shake animation is never restarted by an unrelated repaint.
    const sig = (s.stock ?? [])
      .map((i) => `${i.node}:${i.price}:${i.sold ? 1 : 0}:${i.owned}`)
      .join('|');
    if (sig !== signature) {
      signature = sig;
      build3(view);
    }
  }

  // §16 insufficient funds: ONE ~300 ms shake on the PLAQUE (the item itself is
  // untouched). Driven by the sim's `currency_denied` event.
  function denyShake(index) {
    const p = plaques[index];
    if (!p) return;
    p.classList.remove('rn-deny');
    void p.offsetWidth; // restart the animation
    p.classList.add('rn-deny');
    setTimeout(() => p.classList.remove('rn-deny'), 340);
  }

  function key(code, fresh) {
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
      run().buy(Number(code.slice(5)) - 1);
      return true;
    }
    if (code === 'Enter' || code === 'NumpadEnter') {
      if (!fresh) return true; // fresh-press rule: never advance on a held key
      run().advanceFromShop();
      return true;
    }
    if (code === 'Escape') return true; // §16: Esc inert in the shop
    return false;
  }

  return { el, render, key, denyShake, name: 'shop' };
}
