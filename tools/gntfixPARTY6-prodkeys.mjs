#!/usr/bin/env node
// fix-PARTY-r6 finish (PARTY6-F1) — the key fix on a PRODUCTION bundle by real
// keys. Level 1 from a ?level=1 boot; combat rooms are cleared by debug (setup,
// not evidence); on every party page that carries an ally SWAP card the probe,
// by keyboard only: F<seat+1> views that ally, S moves the Replaces mark to a
// target key (cycling 1-4 across pages), reads the mark the card shows, Enter
// takes the swap, then F1 + Enter commits the Healer's card. Pass when the new
// skill sits in the key the card marked and the other three keys are unmoved.
//   node tools/gntfixPARTY6-prodkeys.mjs --url http://127.0.0.1:4392 --seeds 1,2,3 [--size 1024x576]
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:4392');
const seeds = arg('seeds', '1,2,3').split(',').map(Number);
const [W, H] = arg('size', '1024x576').split('x').map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('captures', { recursive: true });
const browser = await launchEchoes({ gpu: arg('gpu', '0') === '1', width: W, height: H, extraArgs: (process.env.ECHOES_CHROME_ARGS || '').split(' ').filter(Boolean) });
const cases = [];
const errorsAll = [];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Held across several frames: the run UI reads fresh presses per frame, and a
// software-GL page can run at a few fps.
async function press(page, key, ms = 260) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  await sleep(320);
}

try {
  for (const seed of seeds) {
    const ctx = await browser.createBrowserContext();
    const { page, errors } = await openEchoes(ctx, `${base}/?fresh=1&level=1&seed=${seed}`, { width: W, height: H });
    await page.waitForFunction(() => window.__echoes.state().run && window.__echoes.state().run.phase === 'combat', { timeout: 180000 });
    let pageNo = 0;
    let lastRoom = -1;
    const t0 = Date.now();
    while (Date.now() - t0 < 420000) {
      const v = await page.evaluate(() => {
        const s = window.__echoes.state();
        return { phase: s.run.phase, room: s.run.room, party: s.run.party ? s.run.party.cards.map((c) => ({ seat: c.seat, type: c.type, swap: !!c.swap, id: c.id, decided: !!c.decided, choice: c.choice ?? null, replace: c.replace })) : null, ui: (window.__echoes.runUi() || {}).screen };
      });
      if (v.room > 6 || v.phase === 'idle' || v.phase === 'defeat') break;
      if (v.phase === 'combat') {
        await page.evaluate(() => window.__echoes.cmd('killAllEnemies'));
        await sleep(400);
        continue;
      }
      if (v.phase === 'path') {
        await page.evaluate(() => {
          const E = window.__echoes;
          const o = (E.state().run.path || {}).options || [];
          const k = o.findIndex((x) => x.reward === 'skill');
          E.cmd('pathChoose', k >= 0 ? (o[k].side ?? k) : 0);
        });
        await sleep(400);
        continue;
      }
      if (v.phase === 'shop') {
        await page.evaluate(() => window.__echoes.cmd('shopAdvance'));
        await sleep(400);
        continue;
      }
      if (v.phase === 'reward' && v.ui === 'draft' && v.room !== lastRoom) {
        lastRoom = v.room;
        if (process.env.PK_DEBUG) console.log('page', v.room, JSON.stringify(v.party));
        await sleep(700); // the page's settle window (carried keys never commit)
        const swaps = (v.party || []).filter((c) => c.seat > 0 && c.type === 'skill' && c.swap);
        for (const c of swaps) {
          const pre = await page.evaluate((s) => [...window.__echoes.cmd('partyView', s).slots], c.seat);
          const want = (pageNo + c.seat) % 4;
          for (let g = 0; g < 3; g++) {
            await press(page, `F${c.seat + 1}`);
            if ((await page.evaluate(() => (window.__echoes.runUi().draft || {}).viewSeat)) === c.seat) break;
          }
          let mark = await page.evaluate(() => (window.__echoes.runUi().draft || {}).replace);
          for (let g = 0; g < 6 && mark !== want; g++) {
            await press(page, 'KeyS');
            mark = await page.evaluate(() => (window.__echoes.runUi().draft || {}).replace);
          }
          const shown = await page.evaluate(() => {
            const d = window.__echoes.runUi().draft || {};
            return { viewSeat: d.viewSeat, replace: d.replace, ids: d.ids };
          });
          // A focuses Take (an AI-suggested Leave opens with Leave focused).
          await press(page, 'KeyA');
          await press(page, 'Enter');
          c.k = shown.replace;
          c.pre = pre;
          c.shown = shown;
        }
        await press(page, 'F1');
        await press(page, 'Enter');
        await page.waitForFunction(() => window.__echoes.state().run.phase !== 'reward', { timeout: 30000 }).catch(() => {});
        for (const c of swaps) {
          if (c.pre === undefined) continue;
          const post = await page.evaluate((s) => [...window.__echoes.cmd('partyView', s).slots], c.seat);
          const wantSlots = [...c.pre];
          wantSlots[c.k] = c.id;
          const took = post.includes(c.id);
          const ok = took && same(post, wantSlots) && c.shown.viewSeat === c.seat;
          cases.push({ seed, room: v.room, seat: c.seat, id: c.id, aiChoice: c.choice, markShown: c.k, pre: c.pre, post, ok, took });
          console.log(`${ok ? 'PASS' : 'FAIL'} seed ${seed} room ${v.room} seat ${c.seat} (AI ${c.choice}): ${c.id} -> card marked key ${c.k + 1}; ${JSON.stringify(c.pre)} -> ${JSON.stringify(post)}`);
        }
        if (swaps.length && pageNo % 2 === 0) await page.screenshot({ path: `captures/gntfixPARTY6-prodkeys-s${seed}-r${v.room}.png` }).catch(() => {});
        pageNo += 1;
        continue;
      }
      if (v.phase === 'reward') await sleep(300);
      else await sleep(300);
    }
    errorsAll.push(...errors.map((e) => `seed ${seed}: ${e}`));
    await ctx.close();
  }
} finally {
  await browser.close();
}
const ok = cases.length > 0 && cases.every((c) => c.ok) && errorsAll.length === 0;
writeFileSync('captures/gntfixPARTY6-prodkeys.json', JSON.stringify({ ok, cases, pageErrors: errorsAll }, null, 1));
console.log(JSON.stringify({ ok, cases: `${cases.filter((c) => c.ok).length}/${cases.length}`, pageErrors: errorsAll.length }));
process.exit(ok ? 0 : 1);
