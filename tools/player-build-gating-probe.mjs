#!/usr/bin/env node
// PLAYER-BUILD GATING (docs/TESTING.md "Player build", src/app/harness.js):
// the production build carries no debug command surface and ignores every
// harness URL param, while the dev server keeps both for the probes.
//
//   node tools/player-build-gating-probe.mjs                       Node checks only
//   npx vite build && node tools/player-build-gating-probe.mjs --dist dist
//                                                                  + a player build, served by
//                                                                    server/index.mjs --static
//   node tools/player-build-gating-probe.mjs --dev http://127.0.0.1:5199/
//                                                                  + the dev server (npm run dev)
//
// Node: gateQuery / parseBootParams keep only the player params when the
// harness is off and every param when it is on; no module under src/ reads the
// page query except through src/app/harness.js; window.__echoes is assigned
// once, behind HARNESS; nothing outside the harness-only VFX lab reads it.
// Player build (--dist): window.__echoes is { version } and frozen; a boot
// with every harness flag still boots to the menu, keeps a stored echoes.* key
// (?fresh=1 ignored), has no debug overlay, no VFX lab, no page error; the
// player params still work (?menu=0 skips the title, ?lang=de, ?fps=1).
// Dev (--dev): the full surface (cmd, campaign, sim), ?seed=, ?level=,
// ?fresh=1 and ?debug=1 still act.
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
// Exit 0 = every check passed.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { gateQuery, PLAYER_PARAMS, HARNESS } from '../src/app/harness.js';
import { parseBootParams } from '../src/app/params.js';

const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const DIST = arg('dist');
const DEV = arg('dev');
const PORT = Number(arg('port', '7861'));

const rows = [];
const check = (name, ok, detail = '') => {
  rows.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

const VERSION = /VERSION = '([^']+)'/.exec(readFileSync('src/version.js', 'utf8'))[1];
const HARNESS_URL =
  '?rill=1&tolly=1&sable=1&fresh=1&freeze=1&level=3&act=2&partygrant=max&party=auto&seed=5&scene=arena&room=kill_all' +
  '&run=1&layout=4&variant=4&slot=auto-1&endless=1&rush=1&debug=1&vfxlab=1&daily=2026-01-01&nethost=1&netjoin=ABCD' +
  '&netquick=1&netname=probe&netseat=2&netcond=lat75&netrate=20&netbot=3&p2p=0&p2pwait=9000&act5=1&act6=1';

// ------------------------------------------------------------- Node --
{
  check('Node runs as a harness (no import.meta.env)', HARNESS === true);
  const off = gateQuery(HARNESS_URL + '&lang=de&menu=0&fps=1&audio=0&net=ws://x/echoes&msaa=2&tips=0&story=0', false);
  const kept = [...off.keys()].sort();
  check('player build keeps only player params', kept.every((k) => PLAYER_PARAMS.includes(k)) && kept.length === 8, kept.join(','));
  const on = gateQuery(HARNESS_URL, true);
  check('harness build keeps every param', [...on.keys()].length === new URLSearchParams(HARNESS_URL).size);
  const pb = parseBootParams(HARNESS_URL + '&menu=0&fps=1&lang=de', false);
  const harnessFields = ['rill', 'tolly', 'sable', 'fresh', 'freeze', 'run', 'netHost', 'netQuick', 'debug'];
  const nulls = ['level', 'act', 'seed', 'scene', 'room', 'variant', 'layout', 'slot', 'netJoin', 'netName', 'netSeat', 'netCond', 'netRate', 'party', 'partyGrant', 'p2pWait'];
  check(
    'player boot params: every harness field absent',
    harnessFields.every((k) => pb[k] === false) && nulls.every((k) => pb[k] === null) && pb.p2p === true && pb.legacy.length === 0,
    harnessFields.filter((k) => pb[k] !== false).concat(nulls.filter((k) => pb[k] !== null)).join(',') || 'all absent'
  );
  check('player boot params: ?menu=0 and ?fps=1 still act', pb.menuSkip === true && pb.fps === true);
  const hb = parseBootParams(HARNESS_URL, true);
  check('harness boot params unchanged', hb.sable && hb.fresh && hb.level === 3 && hb.seed === 5 && hb.partyGrant === 'max' && hb.p2p === false && hb.legacy.length > 0);

  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(m?js)$/.test(f)) files.push(p);
    }
  };
  walk('src');
  const readers = [];
  const echoReaders = [];
  let assigns = 0;
  for (const f of files) {
    const code = readFileSync(f, 'utf8')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*)/.test(l))
      .join('\n');
    if (f !== join('src', 'app', 'harness.js') && /location\.search|URLSearchParams\(/.test(code)) readers.push(f);
    if (/window\.__echoes\s*=[^=]/.test(code)) assigns += f === join('src', 'main.js') ? 1 : 100;
    if (f !== join('src', 'main.js') && f !== join('src', 'ui', 'vfxlab.js') && /window\.__echoes\b(?![A-Za-z])/.test(code)) echoReaders.push(f);
  }
  // params.js only parses the string it is handed (gateQuery first).
  check('only harness.js reads the page query', readers.length === 1 && readers[0] === join('src', 'app', 'params.js'), readers.join(','));
  const main = readFileSync('src/main.js', 'utf8');
  check('window.__echoes assigned once, behind HARNESS', assigns === 1 && /window\.__echoes = !HARNESS\s*\?\s*Object\.freeze\(\{ version: VERSION \}\)/.test(main));
  check('no game module reads window.__echoes', echoReaders.length === 0, echoReaders.join(','));
}

// ---------------------------------------------------------- browser --
async function browserChecks() {
  const puppeteer = (await import('puppeteer')).default;
  const args = ['--disable-dev-shm-usage', '--no-first-run', '--window-size=1024,640'];
  for (const a of (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean)) if (!args.includes(a)) args.push(a);
  const browser = await puppeteer.launch({ headless: true, args, protocolTimeout: 300000 });
  const open = async (url, { sentinel = false } = {}) => {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: 1024, height: 640 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
    if (sentinel) {
      // Store a key on the origin first, so ?fresh=1 has something to wipe.
      const u = new URL(url);
      await page.goto(`${u.origin}/version.json`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.evaluate(() => localStorage.setItem('echoes.probe.sentinel', 'kept'));
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => !!window.__echoes, { timeout: 180000 });
    // Booted: the title screen or the camp's first ticks.
    await page
      .waitForFunction(() => document.querySelector('[data-screen="title"], [data-screen="loading"]') || (window.__echoes.tick ?? 0) > 30 || document.getElementById('version-label'), { timeout: 180000 })
      .catch(() => {});
    await new Promise((r) => setTimeout(r, 4000));
    return { page, errors, close: () => ctx.close() };
  };
  const look = (page) =>
    page.evaluate(() => {
      const E = window.__echoes;
      const shown = (id) => {
        const el = document.querySelector(`[data-screen="${id}"]`);
        return !!(el && document.body.contains(el) && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== 'none');
      };
      const fps = document.getElementById('fps-meter');
      return {
        keys: E ? Object.keys(E).sort() : null,
        frozen: E ? Object.isFrozen(E) : null,
        version: E ? E.version : null,
        cmd: E ? typeof E.cmd : null,
        // A menu boot: the loading screen (it waits for a key) or the title.
        title: shown('loading') || shown('title'),
        debugOverlay: !!document.getElementById('debug-overlay'),
        vfxlab: !!document.getElementById('vfxlab'),
        sentinel: localStorage.getItem('echoes.probe.sentinel'),
        lang: document.documentElement.lang,
        fps: !!(fps && getComputedStyle(fps).display !== 'none'),
        level: E && E.campaign && typeof E.campaign.state === 'function' ? E.campaign.state().level : null,
        seed: E && 'bootSeed' in E ? E.bootSeed : null,
      };
    });

  if (DIST) {
    const srv = spawn(process.execPath, ['server/index.mjs', '--static', DIST, '--port', String(PORT), '--host', '127.0.0.1', '--origins', 'self'], { stdio: 'ignore' });
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const base = `http://127.0.0.1:${PORT}/`;
      let o = await open(base);
      let s = await look(o.page);
      check('player build: window.__echoes is { version } only', JSON.stringify(s.keys) === '["version"]' && s.frozen && s.version === VERSION, `keys ${s.keys ? s.keys.length : 0}: ${(s.keys || []).slice(0, 6).join(',')}${s.keys && s.keys.length > 6 ? ',…' : ''}; cmd ${s.cmd}`);
      check('player build: plain boot opens the menu, no page error', s.title && o.errors.length === 0, o.errors.slice(0, 2).join(' | '));
      await o.close();

      o = await open(base + HARNESS_URL, { sentinel: true });
      s = await look(o.page);
      check('player build: every harness flag -> still the menu boot', s.title, `title ${s.title}, level ${s.level}`);
      check('player build: ?fresh=1 wipes nothing', s.sentinel === 'kept', `sentinel ${s.sentinel}`);
      check('player build: ?debug=1 and ?vfxlab=1 open nothing', !s.debugOverlay && !s.vfxlab, `overlay ${s.debugOverlay}, vfxlab ${s.vfxlab}`);
      check('player build: still no command surface', s.cmd === 'undefined' || s.cmd === null, `cmd ${s.cmd}`);
      check('player build: harness boot has no page error', o.errors.length === 0, o.errors.slice(0, 2).join(' | '));
      await o.close();

      o = await open(base + '?menu=0&lang=de&fps=1');
      s = await look(o.page);
      check('player build: ?menu=0 ?lang=de ?fps=1 still act', !s.title && s.lang === 'de' && s.fps, `title ${s.title}, lang ${s.lang}, fps ${s.fps}`);
      await o.close();
    } finally {
      srv.kill();
    }
  }

  if (DEV) {
    const base = DEV.replace(/\/?$/, '/');
    let o = await open(base + '?menu=0&level=3&seed=7&debug=1&fresh=1', { sentinel: true });
    await o.page.waitForFunction(() => window.__echoes.campaign && window.__echoes.campaign.state().level === 3, { timeout: 180000 }).catch(() => {});
    const s = await look(o.page);
    check('dev: full command surface', s.cmd === 'function' && s.keys.length > 30, `keys ${s.keys.length}`);
    check('dev: ?level=3 ?seed=7 act', s.level === 3 && s.seed === 7, `level ${s.level}, seed ${s.seed}`);
    check('dev: ?fresh=1 wipes, ?debug=1 shows the overlay', s.sentinel === null && s.debugOverlay, `sentinel ${s.sentinel}, overlay ${s.debugOverlay}`);
    check('dev: no page error', o.errors.length === 0, o.errors.slice(0, 2).join(' | '));
    await o.close();
  }
  await browser.close();
}

if (DIST || DEV) await browserChecks();
const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} passed`);
process.exit(failed.length ? 1 : 0);
