#!/usr/bin/env node
// fix-M2-r3 regression probe — the save engine paths the F1-F3 fixes touch.
//   node tools/gntfixM23-regress.mjs [--url U] [--tag t]
// ?menu=0&seed=7&fresh=1 boot, then in page:
//   roundTrip 300 ticks (G2.1 in-page leg): hash equal + continuation equal
//   save manual-1 -> thumbnail present, meta.campaign null in camp
//   export -> import into manual-2: hash kept (G2.6)
//   rename manual-1: hash kept, picture kept
//   autosave('quit') -> auto slot written WITH a picture
//   overwrite manual-1: the new save carries its own picture (never the old one)
//   remove manual-2: slot + picture gone
//   a campaign run (startCampaign harness) at room 1: meta.level/room, card null
//   thumbWarm(): the worker warmed at boot (blob worker, no fetch)
// Output: captures/gntfixM23-regress-<tag>.json
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = { url: 'http://127.0.0.1:5199/', tag: 'dev' };
for (let i = 0; i < argv.length; i += 2) opt[argv[i].replace(/^--/, '')] = argv[i + 1];
const browser = await launchEchoes({ gpu: true, extraArgs: ['--disable-features=NetworkServiceSandbox'] });
let out;
try {
  const { page, errors } = await openEchoes(browser, opt.url + '?menu=0&seed=7&fresh=1');
  await page.waitForFunction(() => window.__echoes.tick >= 240, { timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1500));
  out = await page.evaluate(async () => {
    const E = window.__echoes;
    const S = E.save;
    const r = { version: E.version, checks: {} };
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const isPic = (id) => { const t = S.thumb(id); return !!(t && t.startsWith('data:image')); };
    r.warm = S.thumbWarm();
    const rt = S.roundTrip({ ticks: 300 });
    r.checks.roundTrip = { equal: rt.equal, continuationEqual: rt.continuationEqual, pass: rt.equal && rt.continuationEqual };
    const s1 = await S.save('manual-1');
    await sleep(1200);
    const m1 = S.list().find((m) => m.id === 'manual-1');
    r.checks.save = { ok: s1.ok, ms: s1.ms, thumbLate: s1.thumbLate, picture: isPic('manual-1'), campaignMeta: m1 && m1.meta.campaign, pass: s1.ok && isPic('manual-1') && m1.meta.campaign === null };
    const text = S.exportText('manual-1');
    const imp = await S.importText(text, 'manual-2');
    r.checks.exportImport = { ok: imp.ok, hashKept: imp.hash === JSON.parse(text).hash, pass: imp.ok && imp.hash === JSON.parse(text).hash };
    const h0 = S.list().find((m) => m.id === 'manual-1').hash;
    const pic0 = S.thumb('manual-1');
    const rn = await S.rename('manual-1', 'Renamed one');
    r.checks.rename = { ok: rn.ok, hashKept: rn.meta && rn.meta.hash === h0, pictureKept: S.thumb('manual-1') === pic0, pass: rn.ok && rn.meta.hash === h0 && S.thumb('manual-1') === pic0 };
    const a = await S.autosave('quit');
    await sleep(1200);
    r.checks.autosaveQuit = { ok: a.ok, slot: a.meta && a.meta.id, picture: a.meta ? isPic(a.meta.id) : false, pass: !!(a.ok && a.meta && isPic(a.meta.id)) };
    // move, then overwrite manual-1: its picture must be this save's
    E.cmd('teleport', 3, 2);
    await sleep(300);
    const s2 = await S.save('manual-1', { name: 'Renamed one' });
    await sleep(1200);
    r.checks.overwrite = { ok: s2.ok, picture: isPic('manual-1'), pictureChanged: S.thumb('manual-1') !== pic0, pass: s2.ok && isPic('manual-1') && S.thumb('manual-1') !== pic0 };
    const rm = S.remove('manual-2');
    r.checks.remove = { ok: rm.ok, gone: !S.list().some((m) => m.id === 'manual-2') && S.thumb('manual-2') === null, pass: rm.ok && S.thumb('manual-2') === null };
    // a campaign run at room 1
    E.cmd('startCampaign', { level: 1, harness: true });
    const t0 = performance.now();
    while (performance.now() - t0 < 8000 && E.state().run.phase !== 'combat') await sleep(100);
    await sleep(500);
    const s3 = await S.save('manual-3');
    const m3 = S.list().find((m) => m.id === 'manual-3');
    r.checks.runMeta = { ok: s3.ok, level: m3 && m3.meta.level, room: m3 && m3.meta.room, phase: m3 && m3.meta.phase, campaign: m3 && m3.meta.campaign, pass: !!(s3.ok && m3.meta.level === 1 && m3.meta.room === 1 && m3.meta.campaign && m3.meta.campaign.card === null) };
    r.thumbLog = S.thumbLog();
    r.pass = Object.values(r.checks).every((c) => c.pass);
    return r;
  });
  out.pageErrors = errors;
} finally {
  await browser.close();
}
const file = join(root, 'captures', `gntfixM23-regress-${opt.tag}.json`);
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`[summary] ${JSON.stringify({ version: out.version, pass: out.pass, checks: Object.fromEntries(Object.entries(out.checks).map(([k, v]) => [k, v.pass])), warm: out.warm, pageErrors: out.pageErrors.length })}`);
console.log(`[DONE] -> ${file}`);
