#!/usr/bin/env node
// fix-INT-r6 (journey r6 J6-F1, campaign r6 CR6-F1): what the victory and
// defeat cards sit over. Samples EVERY rAF frame from the run's end until the
// camp returns: app.mode, the run phase, the top-left location plate, the
// Glint plate, whether the end card is up, the party's downed count and HP,
// and the camp scene's mode; screenshots the card at +2.5 s and the camp after.
// Setup by debug (not evidence of play): vic = ?level=N (a campaign start)
// then skipToRoom 8 + Stag HP 0.001 + kills; def = level 1, the party at 1 HP
// beside six elite Boars.
//   node tools/gntfixINT6-endcard.mjs --url http://127.0.0.1:4390 --scen vic3,def1 --tag after
import { writeFileSync, mkdirSync } from 'node:fs';
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:4390');
const tag = arg('tag', 'a');
const scens = arg('scen', 'vic3,def1').split(',');
const [W, H] = arg('size', '1600x900').split('x').map(Number);
const gpu = arg('gpu', '0') === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('captures', { recursive: true });
const out = { schema: 'gntfixINT6-endcard/1', base, tag, rows: [] };
const browser = await launchEchoes({ gpu, width: W, height: H, extraArgs: (process.env.ECHOES_CHROME_ARGS || '').split(' ').filter(Boolean) });

// In page: one sample per rAF until `until()` or maxMs.
async function sampleFrames(page, maxMs, stopOn) {
  return page.evaluate(
    (maxMs, stopOn) =>
      new Promise((resolve) => {
        const E = window.__echoes;
        const t0 = performance.now();
        const rows = [];
        let returned = null;
        const off = E.on('return_to_camp', (ev) => {
          returned = { tick: ev.tick, at: Math.round(performance.now() - t0) };
        });
        const txt = (sel) => {
          const n = document.querySelector(sel);
          return n ? (n.textContent || '').replace(/\s+/g, ' ').trim() : null;
        };
        const frame = () => {
          const s = E.state();
          const rv = s.run || {};
          const ui = E.runUi ? E.runUi() || {} : {};
          const party = s.party || [];
          rows.push({
            ms: Math.round(performance.now() - t0),
            tick: E.tick,
            appMode: E.app ? E.app.mode : null,
            phase: rv.phase,
            active: rv.active,
            card: ui.screen === 'end',
            loc: txt('.hud-loc'),
            glint: txt('.hud-glint'),
            downed: party.filter((m) => m.hp <= 0).length,
            hp: party.map((m) => Math.round(m.hp)).join('/'),
            hostiles: (s.enemies || []).length,
          });
          const t = performance.now() - t0;
          if (t >= maxMs || (stopOn === 'return' && returned && t >= returned.at + 400)) {
            if (typeof off === 'function') off();
            resolve({ rows, returned });
            return;
          }
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    maxMs,
    stopOn
  );
}

function summarize(rows) {
  const onCard = rows.filter((r) => r.card);
  const count = (f) => onCard.filter(f).length;
  return {
    frames: rows.length,
    cardFrames: onCard.length,
    cardOverCampPlate: count((r) => /HEARTH CAMP/.test(r.loc || '')),
    cardAppModeCamp: count((r) => r.appMode === 'camp'),
    cardGlintZero: count((r) => /^0(\D|$)/.test((r.glint || '').replace(/\s/g, ''))),
    cardLocs: [...new Set(onCard.map((r) => r.loc))],
    cardGlints: [...new Set(onCard.map((r) => r.glint))].slice(0, 4),
    cardDowned: [...new Set(onCard.map((r) => r.downed))],
    cardHostiles: Math.max(0, ...onCard.map((r) => r.hostiles)),
    after: rows.length ? { appMode: rows[rows.length - 1].appMode, loc: rows[rows.length - 1].loc, card: rows[rows.length - 1].card, glint: rows[rows.length - 1].glint, downed: rows[rows.length - 1].downed } : null,
  };
}

try {
  for (const scen of scens) {
    const ctx = await browser.createBrowserContext();
    const lvl = Number(scen.slice(3)) || 1;
    const url = `${base}/?fresh=1&level=${lvl}&seed=31`;
    const { page, errors } = await openEchoes(ctx, url, { width: W, height: H });
    await page.waitForFunction(() => window.__echoes.state().run && window.__echoes.state().run.phase === 'combat', { timeout: 180000 });
    await sleep(1500);
    if (scen.startsWith('def')) {
      await page.evaluate(() => {
        const E = window.__echoes;
        const s = E.state();
        const p = s.party[0];
        for (let i = 0; i < 6; i++) {
          try { E.cmd('spawn', 'boar', p.x + Math.cos(i) * 1.5, p.z + Math.sin(i) * 1.5, { elite: true, hpMul: 6, dmgMul: 6 }); } catch { /* */ }
        }
        for (const m of s.party) E.cmd('setHp', m.id, 1);
      });
    } else {
      await page.evaluate(() => { try { window.__echoes.cmd('skipToRoom', 8); } catch { /* */ } });
      await page.waitForFunction(() => window.__echoes.state().run.room === 8 && window.__echoes.state().run.phase === 'combat', { timeout: 60000 });
      // The party is topped up first so a slow page cannot lose the fight
      // before the kill lands; the kill repeats until the card is up.
      await page.evaluate(async () => {
        const E = window.__echoes;
        for (let i = 0; i < 200; i++) {
          const s = E.state();
          if ((E.runUi() || {}).screen === 'end') break;
          if (s.run.phase === 'combat') {
            for (const m of s.party) { try { E.cmd('setHp', m.id, m.maxHp); } catch { /* */ } }
            try { E.cmd('bossHp', 0.001); } catch { /* */ }
            E.cmd('killAllEnemies');
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      });
    }
    await page.waitForFunction(() => (window.__echoes.runUi() || {}).screen === 'end', { timeout: 90000 });
    const shot = page.waitForFunction(() => true).then(async () => { await sleep(2500); await page.screenshot({ path: `captures/gntfixINT6-endcard-${tag}-${scen}-card.png` }); });
    let sampled;
    if (scen.startsWith('vic')) {
      sampled = await sampleFrames(page, 90000, 'return');
      await shot;
    } else {
      // Defeat has no countdown: sample the card 4 s, then Enter returns.
      const first = await sampleFrames(page, 4000, 'none');
      await shot;
      await page.keyboard.press('Enter');
      const second = await sampleFrames(page, 2500, 'none');
      sampled = { rows: [...first.rows, ...second.rows], returned: second.returned ?? first.returned };
    }
    await sleep(500);
    await page.screenshot({ path: `captures/gntfixINT6-endcard-${tag}-${scen}-after.png` });
    const sum = summarize(sampled.rows);
    const row = { scen, size: `${W}x${H}`, returned: sampled.returned, ...sum, pageErrors: errors.slice(0, 5) };
    out.rows.push({ ...row, rows: sampled.rows.filter((_, i) => i % 10 === 0) });
    console.log(JSON.stringify(row));
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`captures/gntfixINT6-endcard-${tag}.json`, JSON.stringify(out, null, 1));
console.log(`-> captures/gntfixINT6-endcard-${tag}.json`);
