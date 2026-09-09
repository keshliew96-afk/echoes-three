// certA2-ref critic: action-file generator (all JSON via JSON.stringify, all evals IIFE-wrapped).
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('tools/actions', { recursive: true });

const arm = {
  type: 'eval',
  code: `(() => { const E = window.__echoes; window.__A2 = { ev: [] };
    ['shop_buy','shop_denied','shop_advance','reward_offer','room_cleared'].forEach(t => { try { E.on(t, e => window.__A2.ev.push({ t, tick: E.tick, e })); } catch (_) {} });
    return { armed: true, tick: E.tick, version: E.version, seed: E.seed, bootSeed: E.bootSeed }; })()`,
};
const startRun = { type: 'eval', code: `(() => { const E = window.__echoes; E.cmd('startRun'); return { started: true, tick: E.tick }; })()` };
const skip7 = { type: 'eval', code: `(() => { const E = window.__echoes; E.cmd('skipToRoom', 7); const s = E.state(); return { room: s.room, phase: s.phase, tick: E.tick }; })()` };
const waitShop = {
  type: 'eval',
  code: `(async () => { const E = window.__echoes; const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      const u = E.runUi();
      if (u && u.screen === 'shop') {
        return { ok: true, tick: E.tick, ms: Date.now() - t0, screen: u.screen, wallet: u.wallet,
                 cards: (u.cards || []).map(c => ({ name: c.name, rarity: c.rarity, price: c.price })) };
      }
      await new Promise(r => setTimeout(r, 8));
    }
    return { ok: false, screen: E.runUi() && E.runUi().screen }; })()`,
};
const report = (label) => ({
  type: 'eval',
  code: `(() => { const E = window.__echoes; const u = E.runUi();
    return { label: ${JSON.stringify(label)}, tick: E.tick, wallet: u.wallet, owned: u.owned,
      cards: (u.cards || []).map(c => ({ name: c.name, owned: c.owned, opacity: c.opacity })),
      plaques: (u.plaques || []).map(p => ({ price: p.price, shaking: p.shaking })),
      ev: window.__A2.ev.slice(-6) }; })()`,
});

const probe = [
  arm, startRun, skip7, waitShop, { type: 'wait', ms: 1500 },
  { type: 'shot', name: 'certA2-ref-shop-idle' },
  { type: 'mousemove', x: 500, y: 607 }, { type: 'wait', ms: 450 },
  { type: 'shot', name: 'certA2-ref-shop-hover' }, report('hover'),
  { type: 'click', x: 500, y: 607 }, { type: 'wait', ms: 220 },
  { type: 'shot', name: 'certA2-ref-shop-buy1a' }, { type: 'wait', ms: 450 },
  { type: 'shot', name: 'certA2-ref-shop-buy1b' }, report('after-buy1'),
  { type: 'click', x: 800, y: 607 }, { type: 'wait', ms: 500 },
  { type: 'shot', name: 'certA2-ref-shop-buy2' }, report('after-buy2'),
  { type: 'click', x: 1100, y: 607 }, { type: 'wait', ms: 120 },
  { type: 'shot', name: 'certA2-ref-shop-deny1' }, { type: 'wait', ms: 160 },
  { type: 'shot', name: 'certA2-ref-shop-deny2' }, report('after-deny'),
];
const seq = [arm, startRun, skip7, waitShop, { type: 'wait', ms: 1500 }];

writeFileSync('tools/actions/certA2-ref-shop.json', JSON.stringify(probe, null, 1));
writeFileSync('tools/actions/certA2-ref-shopseq.json', JSON.stringify(seq, null, 1));
console.log('wrote tools/actions/certA2-ref-shop.json and certA2-ref-shopseq.json');
