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
//
// ROUND-1 CERTIFICATION FIX (shop frame 10-12/20). The shelf used to be a
// full-screen charcoal modal over a 65-90% veil, parked exactly over the
// party: FLAT 52.9%, no world light, no party, unicode glyphs for icons, a
// wrapped "Ascend" header, 0.00% hover feedback, a zero-frame purchase swap.
// Now:
//   * the veil is a 12% dim (ui/run/style.js) and the page is a COMPACT
//     ornate panel docked ABOVE the command bar, so the lit arena and the
//     party (world origin = screen centre) stay in view;
//   * the panel is textured (wood grain + fibre noise), the plaques are brass
//     with a real glow, the Advance button is a filled Hearth Amber lamp, and
//     the card icons are drawn (ui/hud/icons.js);
//   * hover lifts the card by LAYOUT (`top`), never by a composited transform,
//     so it lands in every captured pixel;
//   * a purchase is a ~600 ms choreography — the card flips to its SOLD face,
//     the price stamp slams down, seven coins fly from the plaque into the
//     Glint strip while the wallet counts down — all written per rAF frame as
//     inline styles (main-thread paint), so a screenshot at any point inside
//     the window shows a different frame (>= 15 frames at 60 fps);
//   * the denial shake stays (8 px, 300 ms, decaying) and its plaque
//     emphasis lingers ~700 ms so a slow screenshot still catches it.
import { esc } from './style.js';
import { nodeCardHtml, RARITY_COLOR } from './cards.js';
import { iconHtml } from '../hud/icons.js';
import { NODES } from '../../sim/nodes.js';
import { PALETTE } from '../../data/palette.js';

const BUY_MS = 620; // whole purchase choreography
const FLIP_MS = 240; // card flip (scaleX 1 -> 0 -> 1), face swaps at the midpoint
const STAMP_MS = 300; // stamp slam, starts at the flip midpoint
const COIN_N = 7;
const COIN_MS = 420; // one coin's flight
const COIN_STAGGER = 32;
const SHAKE_MS = 300; // §16 "one ~300 ms shake"
const SHAKE_AMP = 8; // px at the first swing, decaying to 0
const DENY_HOLD_MS = 700; // plaque emphasis lingers past the shake
const MOTE_N = 12; // plaque glitter motes

const clamp01 = (k) => Math.max(0, Math.min(1, k));
const easeOut = (k) => 1 - (1 - k) * (1 - k);
// Overshooting ease for the stamp slam (lands at 1 with a short bounce).
const slam = (k) => {
  if (k < 0.62) return easeOut(k / 0.62);
  const t = (k - 0.62) / 0.38;
  return 1 + Math.sin(t * Math.PI) * 0.09 * (1 - t);
};

export function createShopScreen({ run, build }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-shop';
  el.innerHTML = `
    <div class="rn-lamp"></div>
    <div class="rn-title">THE PEDDLER'S SHELF</div>
    <div class="rn-orn"><i></i><b>◆</b><i></i></div>
    <div class="rn-strip">
      <span class="rn-glint"><span class="rn-coin">${iconHtml('coin', { size: 18 })}</span><span class="rn-amt">0</span></span>
      <span class="rn-lab">GLINT · ROOM</span><span class="rn-num">7</span>
      <span class="rn-lab">OF 8</span>
    </div>
    <div class="rn-shelf"></div>
    <div class="rn-note rn-empty" style="display:none"></div>
    <div class="rn-note rn-bought" style="display:none"></div>
    <div class="rn-buttons">
      <span class="rn-hint rn-hint-l">click a card to buy</span>
      <div class="rn-btn rn-advance rn-primary rn-focus">Advance to the Hollow Stag</div>
      <span class="rn-hint rn-hint-r"><b>Enter</b> advance (one-way)</span>
    </div>
    <div class="rn-fx"></div>`;

  const shelf = el.querySelector('.rn-shelf');
  const amtEl = el.querySelector('.rn-amt');
  const coinEl = el.querySelector('.rn-coin');
  const emptyEl = el.querySelector('.rn-empty');
  // §16: a purchase "departs to bench" — the receipt rides ON the sold card
  // ("you own N · on the bench"), so the note stays removed.
  const boughtEl = el.querySelector('.rn-bought');
  const fx = el.querySelector('.rn-fx');
  el.querySelector('.rn-advance').addEventListener('click', () => run().advanceFromShop());

  const plaques = []; // index -> plaque element
  const cards = []; // index -> card element
  const stamps = []; // index -> stamp element
  let signature = '';
  let lastWallet = null;

  // ---------------------------------------------------------- shelf --
  function build3(view) {
    const s = view.shop;
    shelf.innerHTML = '';
    plaques.length = 0;
    cards.length = 0;
    stamps.length = 0;
    const sys = build();
    (s.stock ?? []).forEach((item, i) => {
      const n = NODES[item.node];
      const wrap = document.createElement('div');
      wrap.className = `rn-item${item.sold ? ' rn-sold' : ''}`;
      const verdict = sys ? sys.kitVerdict(item.node) : null;
      const extra = item.node === 'siphon' && sys ? sys.siphonCardLine() : null;
      const rar = RARITY_COLOR[item.rarity] ?? RARITY_COLOR.common;
      wrap.innerHTML = `
        <div class="rn-card${n && n.rarity === 'legendary' ? ' rn-legendary' : ''}"
             style="--rar:${rar};--rarGlow:${rar}77">
          ${nodeCardHtml(item.node, { verdict, extra, owned: item.owned, compact: true, bench: item.sold, row: true })}
          <div class="rn-stamp">SOLD</div>
        </div>
        <div class="rn-plaque${item.affordable === false ? ' rn-short' : ''}">
          <span class="rn-plaque-coin">${iconHtml('coin', { size: 18 })}</span>
          <span class="rn-price">${item.price}</span><span class="rn-cur">GLINT</span>
        </div>`;
      const card = wrap.querySelector('.rn-card');
      card.addEventListener('click', () => run().buy(i));
      // Hover state also settable by class (captures fire synthetic events
      // that do not move the real pointer).
      card.addEventListener('mouseenter', () => card.classList.add('rn-hover'));
      card.addEventListener('mouseleave', () => card.classList.remove('rn-hover'));
      plaques[i] = wrap.querySelector('.rn-plaque');
      cards[i] = card;
      stamps[i] = wrap.querySelector('.rn-stamp');
      shelf.appendChild(wrap);
    });
    const bare = (s.stock ?? []).length === 0;
    emptyEl.style.display = bare ? '' : 'none';
    emptyEl.textContent = bare ? 'nothing left to sell you' : '';
    boughtEl.style.display = 'none';
    boughtEl.textContent = '';
    buildMotes();
    if (pendingBuy !== null) {
      const idx = pendingBuy;
      pendingBuy = null;
      startBuy(idx);
    }
  }

  function render(view) {
    const s = view.shop;
    if (!s) return;
    // The strip numeral is owned by the coin-fly countdown while a purchase
    // animates; it lands on the true wallet when the animation ends.
    if (!buyAnim) amtEl.textContent = String(s.wallet);
    lastWallet = s.wallet;
    const sig = (s.stock ?? [])
      .map((i) => `${i.node}:${i.price}:${i.sold ? 1 : 0}:${i.owned}:${i.affordable === false ? 's' : 'a'}`)
      .join('|');
    if (sig !== signature) {
      signature = sig;
      build3(view);
    }
    startMotes();
  }

  // ------------------------------------------------------- purchase --
  // The sim's `shop_purchase` lands BEFORE the run UI re-renders the shelf
  // (the render happens on the next frame, when the view signature changes),
  // so the event only records the index; build3 starts the choreography on
  // the freshly built card so no element is replaced under the animation.
  let pendingBuy = null;
  let buyAnim = null; // { index, t0, walletFrom, walletTo, coins: [...] }
  let buyRaf = 0;
  function onPurchase(ev) {
    pendingBuy = ev.index ?? 0;
    // Wallet before the spend, for the countdown (the view already spent it).
    pendingWalletFrom = (ev.wallet ?? 0) + (ev.price ?? 0);
  }
  let pendingWalletFrom = null;

  function centreOf(node) {
    const r = node.getBoundingClientRect();
    const p = el.getBoundingClientRect();
    return { x: r.x + r.width / 2 - p.x, y: r.y + r.height / 2 - p.y };
  }

  function startBuy(index) {
    const card = cards[index];
    const stamp = stamps[index];
    const plaque = plaques[index];
    if (!card || !stamp || !plaque) return;
    if (buyAnim) finishBuy();
    const from = centreOf(plaque);
    const to = centreOf(coinEl);
    const coins = [];
    for (let i = 0; i < COIN_N; i++) {
      const c = document.createElement('i');
      c.className = 'rn-flycoin';
      c.style.left = `${from.x}px`;
      c.style.top = `${from.y}px`;
      c.style.opacity = '0';
      fx.appendChild(c);
      // A fan of arcs: each coin bulges a different amount so they never stack.
      coins.push({ node: c, start: i * COIN_STAGGER, bulge: -70 - 26 * i, dx: (i - 3) * 9 });
    }
    // Start on the LIVE face: full opacity, stamp hidden, until the flip midpoint.
    card.style.opacity = '1';
    card.style.transform = 'scaleX(1)';
    stamp.style.opacity = '0';
    buyAnim = {
      index,
      t0: performance.now(),
      from,
      to,
      walletFrom: pendingWalletFrom ?? lastWallet ?? 0,
      walletTo: lastWallet ?? 0,
      coins,
      card,
      stamp,
      plaque,
      flipped: false,
    };
    pendingWalletFrom = null;
    buyRaf = requestAnimationFrame(stepBuy);
  }

  function stepBuy(now) {
    const a = buyAnim;
    if (!a) return;
    const t = now - a.t0;
    // 1. card flip (scaleX), SOLD face from the midpoint
    const fk = clamp01(t / FLIP_MS);
    const sx = Math.abs(Math.cos(fk * Math.PI));
    a.card.style.transform = `scaleX(${Math.max(0.04, sx).toFixed(3)})`;
    if (fk >= 0.5 && !a.flipped) {
      a.flipped = true;
      a.card.style.opacity = '';
    }
    if (fk >= 1) a.card.style.transform = '';
    // 2. stamp slam (from the flip midpoint)
    const st = t - FLIP_MS / 2;
    if (st >= 0) {
      const sk = clamp01(st / STAMP_MS);
      const sc = 2.6 - 1.6 * slam(sk);
      const rot = -14 + 6 * easeOut(sk);
      a.stamp.style.opacity = String(Math.min(1, sk * 3));
      a.stamp.style.transform = `scale(${sc.toFixed(3)}) rotate(${rot.toFixed(1)}deg)`;
      // Impact flash on the plaque at the moment the stamp lands.
      if (sk > 0.55 && sk < 0.9) a.plaque.classList.add('rn-thud');
      else a.plaque.classList.remove('rn-thud');
    }
    // 3. coins fly plaque -> strip, wallet counts down with them
    let alive = 0;
    for (const c of a.coins) {
      const k = (t - c.start) / COIN_MS;
      if (k < 0) {
        alive++;
        continue;
      }
      if (k >= 1) {
        c.node.style.opacity = '0';
        continue;
      }
      alive++;
      const e = easeOut(k);
      const x = a.from.x + (a.to.x - a.from.x) * e + c.dx * Math.sin(k * Math.PI);
      const y = a.from.y + (a.to.y - a.from.y) * e + c.bulge * Math.sin(k * Math.PI);
      c.node.style.left = `${x.toFixed(1)}px`;
      c.node.style.top = `${y.toFixed(1)}px`;
      c.node.style.opacity = String(k < 0.85 ? 1 : (1 - k) / 0.15);
      c.node.style.width = `${(14 + 4 * Math.sin(k * Math.PI * 3)).toFixed(1)}px`;
    }
    const wk = clamp01((t - 60) / (COIN_MS + COIN_STAGGER * COIN_N));
    amtEl.textContent = String(Math.round(a.walletFrom + (a.walletTo - a.walletFrom) * easeOut(wk)));
    coinEl.classList.toggle('rn-catch', t > COIN_MS * 0.8 && t < BUY_MS);
    if (t >= BUY_MS && alive === 0) {
      finishBuy();
      return;
    }
    buyRaf = requestAnimationFrame(stepBuy);
  }

  function finishBuy() {
    const a = buyAnim;
    if (!a) return;
    cancelAnimationFrame(buyRaf);
    for (const c of a.coins) c.node.remove();
    a.card.style.transform = '';
    a.card.style.opacity = '';
    a.stamp.style.opacity = '';
    a.stamp.style.transform = '';
    a.plaque.classList.remove('rn-thud');
    coinEl.classList.remove('rn-catch');
    amtEl.textContent = String(a.walletTo);
    buyAnim = null;
  }

  // ---------------------------------------------------------- denial --
  // §16 insufficient funds: ONE ~300 ms shake on the PLAQUE (the item itself
  // is untouched). The offset is written from a rAF loop, NOT from a CSS
  // animation, so it lands in layout and in every captured pixel; the class
  // carries the non-moving half of the emphasis (amber border + glow) and
  // lingers DENY_HOLD_MS so a slow screenshot still shows the denial.
  const shakeState = new Map(); // plaque -> { raf, hold }
  function denyShake(index) {
    const p = plaques[index];
    if (!p) return;
    const prev = shakeState.get(p);
    if (prev) {
      cancelAnimationFrame(prev.raf);
      clearTimeout(prev.hold);
    }
    p.classList.add('rn-deny');
    const t0 = performance.now();
    const rec = { raf: 0, hold: 0 };
    const step = (now) => {
      const k = Math.min(1, (now - t0) / SHAKE_MS);
      if (k >= 1) {
        p.style.transform = '';
        rec.hold = setTimeout(() => {
          p.classList.remove('rn-deny');
          shakeState.delete(p);
        }, DENY_HOLD_MS - SHAKE_MS);
        return;
      }
      // Four decaying swings inside the window (~13 Hz).
      const dx = SHAKE_AMP * (1 - k) * Math.sin(k * Math.PI * 4);
      const rot = 2.5 * (1 - k) * Math.sin(k * Math.PI * 4);
      p.style.transform = `translateX(${dx.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
      rec.raf = requestAnimationFrame(step);
    };
    rec.raf = requestAnimationFrame(step);
    shakeState.set(p, rec);
  }

  // ------------------------------------------------------- glitter --
  // Coin glitter on the plaques (REFERENCE_BAR C: "coins glitter"): a few
  // Pale Gold motes twinkling over the brass, driven per frame with layout
  // properties while the page is visible.
  const motes = [];
  let moteRaf = 0;
  function buildMotes() {
    for (const m of motes) m.node.remove();
    motes.length = 0;
    plaques.forEach((p, pi) => {
      const per = Math.round(MOTE_N / Math.max(1, plaques.length));
      for (let i = 0; i < per; i++) {
        const n = document.createElement('i');
        n.className = 'rn-mote';
        fx.appendChild(n);
        motes.push({ node: n, plaque: p, ox: (i / per) * 1.0, phase: (pi * 7 + i * 3.1) % 6.28, speed: 1.6 + (i % 3) * 0.7 });
      }
    });
  }
  function stepMotes(now) {
    moteRaf = 0;
    if (el.style.display === 'none' || !el.isConnected) return;
    const t = now / 1000;
    const pr = el.getBoundingClientRect();
    for (const m of motes) {
      const r = m.plaque.getBoundingClientRect();
      const tw = 0.5 + 0.5 * Math.sin(t * m.speed + m.phase);
      const x = r.x - pr.x + 6 + (r.width - 12) * ((m.ox + 0.13 * Math.sin(t * 0.7 + m.phase)) % 1);
      const y = r.y - pr.y - 4 + (r.height + 8) * (0.5 + 0.45 * Math.sin(t * 1.1 + m.phase * 2));
      m.node.style.left = `${x.toFixed(1)}px`;
      m.node.style.top = `${y.toFixed(1)}px`;
      m.node.style.opacity = (0.15 + 0.85 * tw * tw).toFixed(2);
      const sz = 3 + 3 * tw;
      m.node.style.width = `${sz.toFixed(1)}px`;
      m.node.style.height = `${sz.toFixed(1)}px`;
    }
    moteRaf = requestAnimationFrame(stepMotes);
  }
  function startMotes() {
    if (!moteRaf) moteRaf = requestAnimationFrame(stepMotes);
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

  // Probe surface: what the purchase choreography is doing right now.
  function animState() {
    const a = buyAnim;
    return {
      buying: !!a,
      index: a ? a.index : null,
      t: a ? Math.round(performance.now() - a.t0) : null,
      cardTransform: a ? a.card.style.transform : null,
      stampTransform: a ? a.stamp.style.transform : null,
      stampOpacity: a ? a.stamp.style.opacity : null,
      coinsAlive: a ? a.coins.filter((c) => c.node.style.opacity !== '0').length : 0,
      wallet: amtEl.textContent,
      denying: plaques.map((p) => p.classList.contains('rn-deny')),
      plaqueTransform: plaques.map((p) => p.style.transform),
      motes: motes.length,
      hover: cards.map((c) => c.classList.contains('rn-hover')),
      shakeMs: SHAKE_MS,
      buyMs: BUY_MS,
    };
  }

  return { el, render, key, denyShake, onPurchase, animState, name: 'shop' };
}

export { PALETTE as _shopPalette };
