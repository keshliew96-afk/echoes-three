#!/usr/bin/env node
// CLOUD SAVES (docs/CLOUD_SAVES.md, v0.5.230) — Save to cloud / Load from
// cloud on Settings ▸ Gameplay, driven the way two players on two devices
// meet them, against the one-process deploy (`node server/index.mjs --static
// dist`, which this probe starts on its own port with its own save dir):
//   0. the server: codes, a bad code, a forgotten code kept by its token, a
//      wrong token, another site's page refused, the Upstash backend (mocked);
//   1. device A (a profile with Embers, a run in room 1 and a manual save)
//      presses Save to cloud and is shown a code;
//   2. device B (a fresh browser profile) gets a clear line for a bad code and
//      for an unknown code, then loads A's code: a confirm, a reload, and B
//      holds A's Embers and saves; Continue resumes A's run;
//   3. device A, mid-run, loading a code is asked first (the run line), and
//      Cancel leaves everything as it was;
//   4. Save to cloud again keeps the code, also after the server forgot it;
//   5. no page error, no line missing in the language.
// Screenshots: --shots <dir> (cloud-<n>-<name>[-<lang>].png).
//
//   npm run build && node tools/cloudsave-browser.mjs [--lang en] [--shots captures]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer';
import { createEchoesServer } from '../server/server.mjs';
import { createCloudStore } from '../server/cloud.mjs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const LANG = opt('lang', 'en');
const SHOTS = opt('shots', 'captures');
const PORT = Number(opt('port', 7813));
const sfx = LANG === 'en' ? '' : `-${LANG}`;
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ 0. server --
const dir = mkdtempSync(join(tmpdir(), 'echoes-cloud-'));
const srv = createEchoesServer({ port: PORT, host: '127.0.0.1', static: 'dist', origins: ['self'], cloudDir: dir });
await srv.listen();
const BASE = `http://127.0.0.1:${PORT}`;
const post = (body, headers = {}) => fetch(`${BASE}/cloud/save`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
const get = (code, headers = {}) => fetch(`${BASE}/cloud/save/${code}`, { headers }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
const tiny = { kind: 'echoes-cloud', v: 1, profile: null, slots: {} };
{
  const a = await post({ bundle: tiny });
  check(a.ok && /^[2-9A-HJKMNP-Z]{8}$/.test(a.code) && a.token && a.durable === false && a.store === 'disk', `a save gets an 8-character code with no 0/O/1/I/L (${a.code}, durable ${a.durable})`);
  const g = await get(`${a.code.slice(0, 4).toLowerCase()}-${a.code.slice(4)}`);
  check(g.ok && g.bundle && g.bundle.kind === 'echoes-cloud', 'the code reads back, typed in lower case with a dash');
  check((await get('OOOO1111')).error === 'bad_code' && (await get('ABCDEFGH')).status === 404, 'a malformed code is bad_code, an unknown one is a 404');
  rmSync(join(dir, `${a.code}.json`));
  const again = await post({ bundle: tiny, code: a.code, token: a.token });
  check(again.ok && again.code === a.code, 'a code the server forgot comes back under the same code with its token');
  const other = await post({ bundle: tiny, code: a.code, token: 'x'.repeat(24) });
  check(other.ok && other.code !== a.code, 'a wrong token never takes over a code (a new code instead)');
  check((await post({ bundle: { kind: 'nope' } })).error === 'not_a_bundle', 'a body that is not a bundle is refused');
  const evil = await fetch(`${BASE}/cloud/info`, { headers: { origin: 'https://evil.example' } });
  check(evil.status === 403, 'a page from another site is refused (the WebSocket origin list)');
  // Upstash Redis REST backend, against a mock of its command API.
  const kv = new Map();
  const seen = [];
  const fetchImpl = async (url, init) => {
    const cmd = JSON.parse(init.body);
    seen.push({ url, auth: init.headers.authorization, cmd: cmd[0], ex: cmd[3] });
    const result = cmd[0] === 'SET' ? (kv.set(cmd[1], cmd[2]), 'OK') : cmd[0] === 'GET' ? (kv.get(cmd[1]) ?? null) : null;
    return { ok: true, json: async () => ({ result }) };
  };
  const rs = createCloudStore({ env: { ECHOES_CLOUD_REDIS_URL: 'https://mock.upstash.io/', ECHOES_CLOUD_REDIS_TOKEN: 'tok' }, fetchImpl });
  const rsave = await rs.save({ bundle: tiny }, '1.2.3.4');
  const rload = await rs.load(rsave.body.code, '1.2.3.4');
  check(rs.kind === 'redis' && rs.durable && rsave.body.ok && rload.body.ok && seen.some((s) => s.cmd === 'SET' && s.ex === 'EX' && s.auth === 'Bearer tok' && s.url === 'https://mock.upstash.io'), 'the Upstash backend stores and reads a save (durable, one-year expiry)');
}

// --------------------------------------------------------- the browser --
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', ...extra],
});
const errors = [];
async function device(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${String(e && e.message ? e.message : e)}`));
  page.on('dialog', (d) => d.dismiss());
  return page;
}
const URL0 = `${BASE}/?lang=${LANG}&seed=7`;
async function boot(page) {
  await page.goto(URL0, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await sleep(1500);
}
const svc = (page, fn, ...args) => page.evaluate(fn, ...args);
const meta = (page) => svc(page, () => window.__echoes.app.service('save').meta());
const slotIds = (page) => svc(page, () => window.__echoes.app.service('save').list().map((m) => m.id));
const runPhase = (page) => svc(page, () => window.__echoes.cmd('runState').phase);
async function openCloud(page) {
  await page.evaluate(() => window.__echoes.app.open('settings', { tab: 'gameplay' }));
  await page.waitForSelector('#ap-cloud-save', { timeout: 60000 });
  await page.evaluate(() => document.getElementById('ap-cloud-load').scrollIntoView({ block: 'center' }));
  await sleep(700);
}
async function typeCode(page, code) {
  await page.click('#ap-cloud-code', { clickCount: 3 });
  await page.evaluate(() => {
    document.getElementById('ap-cloud-code').value = '';
  });
  await page.keyboard.type(code, { delay: 20 });
  const v = await page.$eval('#ap-cloud-code', (n) => n.value);
  if (v !== code) {
    await page.evaluate((c) => {
      document.getElementById('ap-cloud-code').value = c;
    }, code);
  }
}
const codeNote = (page) => page.$eval('#ap-cloud-code', (n) => n.closest('.ap-row').querySelector('.ap-note').textContent);
const dialog = (page) => page.evaluate(() => {
  const d = document.querySelector('.ap-dialog .ap-dlg');
  return d && d.offsetParent !== null ? { title: d.querySelector('.ap-dlg-title').textContent, body: d.querySelector('.ap-dlg-body').textContent } : null;
});

// ----------------------------------------------------- 1. device A saves --
const A = await device('A');
await boot(A);
await A.evaluate(() => {
  const k = 'echoes.profile.v1';
  const p = JSON.parse(localStorage.getItem(k) || 'null') || { v: 1 };
  p.meta = { ...(p.meta || {}), embers: 137, earned: 137 };
  localStorage.setItem(k, JSON.stringify(p));
});
await boot(A);
check((await meta(A)).embers === 137, 'device A holds 137 Embers');
const start = await svc(A, () => window.__echoes.cmd('campChoose', 1));
check(start && start.ok, 'device A starts a run');
await A.waitForFunction(() => ['combat', 'transit'].includes(window.__echoes.cmd('runState').phase), { timeout: 300000, polling: 500 });
await sleep(2500);
const ms = await svc(A, () => window.__echoes.app.service('save').save('manual-1', { name: 'Probe save' }));
check(ms && ms.ok, 'device A has a manual save');
await openCloud(A);
check(/./.test(await A.$eval('#ap-cloud-status', (n) => n.textContent)), 'the Cloud save rows are on Settings ▸ Gameplay');
await A.click('#ap-cloud-save');
await A.waitForFunction(() => /[2-9A-Z]{4}-[2-9A-Z]{4}/.test(document.getElementById('ap-cloud-status').textContent), { timeout: 60000, polling: 250 });
const remA = await svc(A, () => window.__echoes.cloud().remembered);
const CODE = remA && remA.code;
check(!!CODE && existsSync(join(dir, `${CODE}.json`)), `Save to cloud shows a code and the server holds it (${CODE})`);
const statusA = await A.$eval('#ap-cloud-status', (n) => n.textContent);
check(statusA.includes(`${CODE.slice(0, 4)}-${CODE.slice(4)}`), `the status line shows the code (${statusA})`);
check((await A.$eval('#ap-cloud-code', (n) => n.value)) === `${CODE.slice(0, 4)}-${CODE.slice(4)}`, 'the code is also in the Cloud code field to copy');
await A.evaluate(() => document.getElementById('ap-cloud-save').focus());
await sleep(600);
await A.screenshot({ path: `${SHOTS}/cloud-1-saved${sfx}.png` });
const slotsA = await slotIds(A);

// ---------------------------------------------------- 2. device B loads --
const B = await device('B');
await boot(B);
check((await meta(B)).embers === 0, 'device B starts fresh (0 Embers)');
await openCloud(B);
await typeCode(B, 'OO0O-1111');
await B.click('#ap-cloud-load');
await sleep(500);
const bad = await codeNote(B);
check(/ABCD-EFGH/.test(bad), `a bad code gets the "isn't a cloud code" line (${bad})`);
await B.screenshot({ path: `${SHOTS}/cloud-2-bad-code${sfx}.png` });
await typeCode(B, 'ABCD-EFGH');
await B.click('#ap-cloud-load');
await B.waitForFunction(() => /ABCD-EFGH/.test(document.getElementById('ap-cloud-code').closest('.ap-row').querySelector('.ap-note').textContent) && !/…/.test(document.getElementById('ap-cloud-code').closest('.ap-row').querySelector('.ap-note').textContent), { timeout: 60000, polling: 250 });
const unknown = await codeNote(B);
check(unknown.length > 40, `an unknown code says it may have expired or been forgotten (${unknown})`);
await B.screenshot({ path: `${SHOTS}/cloud-3-unknown-code${sfx}.png` });
await typeCode(B, CODE.toLowerCase());
await B.click('#ap-cloud-load');
await B.waitForFunction(() => {
  const d = document.querySelector('.ap-dialog .ap-dlg');
  return d && d.offsetParent !== null;
}, { timeout: 60000, polling: 250 });
await sleep(600);
const dB = await dialog(B);
check(!!dB && dB.title.includes(`${CODE.slice(0, 4)}-${CODE.slice(4)}`) && /137/.test(dB.body), `Load asks first, naming the code and what it holds (${dB && dB.body.split('\n')[0]})`);
await B.screenshot({ path: `${SHOTS}/cloud-4-confirm${sfx}.png` });
await B.click('#ap-confirm-ok');
await B.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => null);
await B.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
await sleep(1500);
check((await meta(B)).embers === 137, `after the reload device B holds device A's 137 Embers (${(await meta(B)).embers})`);
const slotsB = await slotIds(B);
check(slotsA.length > 0 && slotsA.every((id) => slotsB.includes(id)) && slotsB.includes('manual-1'), `device B holds A's save slots (${slotsB.join(', ')})`);
const latest = await svc(B, () => window.__echoes.app.service('save').latest());
const cont = await svc(B, (id) => window.__echoes.app.service('save').load(id), latest && latest.id);
await sleep(1500);
check(cont && cont.ok && ['combat', 'transit'].includes(await runPhase(B)), `Continue on device B resumes A's run (${latest && latest.id}, phase ${await runPhase(B)})`);
await openCloud(B);
await B.screenshot({ path: `${SHOTS}/cloud-5-loaded${sfx}.png` });

// ------------------------------------------- 3. mid-run confirm on A --
await typeCode(A, CODE);
await A.click('#ap-cloud-load');
await A.waitForFunction(() => {
  const d = document.querySelector('.ap-dialog .ap-dlg');
  return d && d.offsetParent !== null;
}, { timeout: 60000, polling: 250 });
await sleep(600);
const dA = await dialog(A);
check(!!dA && dA.body.split('\n').filter(Boolean).length >= 3, `mid-run the confirm adds the run line (${dA && dA.body.split('\n').filter(Boolean).pop()})`);
await A.screenshot({ path: `${SHOTS}/cloud-6-midrun-confirm${sfx}.png` });
const before = await svc(A, () => localStorage.getItem('echoes.save.v1.manual-1'));
await A.click('#ap-confirm-cancel');
await sleep(800);
check((await svc(A, () => localStorage.getItem('echoes.save.v1.manual-1'))) === before && !(await svc(A, () => window.__echoes.app.service('save').storageFrozen())), 'Cancel leaves the local save as it was');
check(/./.test(await codeNote(A)), `and says so (${await codeNote(A)})`);

// -------------------------------------------- 4. the code is kept --
rmSync(join(dir, `${CODE}.json`));
await A.click('#ap-cloud-save');
await A.waitForFunction(() => /[2-9A-Z]{4}-[2-9A-Z]{4}/.test(document.getElementById('ap-cloud-status').textContent) && !/…/.test(document.getElementById('ap-cloud-status').textContent), { timeout: 60000, polling: 250 });
await sleep(500);
const rem2 = await svc(A, () => window.__echoes.cloud().remembered);
check(rem2 && rem2.code === CODE && existsSync(join(dir, `${CODE}.json`)), 'Save to cloud again (after the server forgot it) keeps the same code');

// ------------------------------------------------------ 5. clean page --
for (const [n, p] of [['A', A], ['B', B]]) {
  const misses = await p.evaluate(() => window.__echoes.i18n().misses);
  if (LANG !== 'en') check(misses.length === 0, `device ${n}: no line missing in ${LANG} (${misses.slice(0, 4).join(' | ')})`);
}
check(errors.length === 0, `no page error (${errors.slice(0, 3).join(' | ')})`);

await browser.close();
await srv.close();
rmSync(dir, { recursive: true, force: true });
console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL OK');
process.exit(fails.length ? 1 : 0);
