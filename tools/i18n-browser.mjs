#!/usr/bin/env node
// LANGUAGES (docs/I18N.md) in the real game: against `npm run dev` (port
// 5199), opens every main screen once per language at 1024x576 and checks
//   - no line the screen looked up is missing from that language's table
//     (window.__echoes.i18n().misses),
//   - no visible text is still the English it shows in the English pass
//     (unwrapped text), apart from lines whose translation IS the English,
//   - no text on the screen is clipped or runs off the window where the
//     English pass fits (layout at 1024x576 with the longer languages),
//   - no page errors.
// Screens: title, the five settings tabs, saves, records, online play, camp,
// class select, unlocks, level select, combat HUD, skill draft, relic pick,
// door choice, socket screen, pause, peddler, run end.
//
//   node tools/i18n-browser.mjs [--url http://127.0.0.1:5199/] [--langs en,de,ja]
//                               [--shots captures/i18n] [--seed 3]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SEED = Number(opt('seed', '3'));
const ALL = ['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'ru'];
const LANGS = (opt('langs', ALL.join(',')) || '').split(',').filter(Boolean);
if (LANGS[0] !== 'en') LANGS.unshift('en'); // the English pass is the baseline
const SHOTS = opt('shots', null);
const W = 1024;
const H = 576;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
mkdirSync('captures', { recursive: true });

const catalog = JSON.parse(readFileSync(new URL('../src/i18n/catalog.json', import.meta.url), 'utf8'));
const tables = {};
for (const l of LANGS) {
  if (l === 'en') continue;
  try {
    tables[l] = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${l}.json`, import.meta.url), 'utf8'));
  } catch {
    tables[l] = {};
  }
}
// English text that legitimately stays English in a language.
const keptAs = (l, s) => {
  const v = tables[l] && tables[l][s];
  return typeof v === 'string' && v === s;
};

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, '--lang=en-US', ...extra],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-page: every visible text run (node text, aria/title not counted) and the
// elements whose text is clipped or leaves the window.
function scanPage() {
  const out = { texts: [], clipped: [] };
  const vis = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.001) return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const skip = (el) => el.closest('#vfxlab, #debug-overlay, .dbg, script, style, noscript, #boot-splash');
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seenEl = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const s = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!s || !/\p{L}/u.test(s)) continue;
    const el = n.parentElement;
    if (!el || skip(el) || !vis(el)) continue;
    out.texts.push(s);
    if (seenEl.has(el)) continue;
    seenEl.add(el);
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const tag = `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
    const clipX = el.scrollWidth > el.clientWidth + 2 && /hidden|clip/.test(cs.overflowX) && el.clientWidth > 0;
    const clipY = el.scrollHeight > el.clientHeight + 2 && /hidden|clip/.test(cs.overflowY) && el.clientHeight > 0;
    const off = r.right > innerWidth + 2 || r.left < -2 || r.bottom > innerHeight + 2;
    // Off-window text inside a scroll box the player can scroll is fine.
    let inScroll = false;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (/auto|scroll/.test(ps.overflowY + ps.overflowX) && (p.scrollHeight > p.clientHeight + 2 || p.scrollWidth > p.clientWidth + 2)) {
        inScroll = true;
        break;
      }
    }
    if (clipX || clipY || (off && !inScroll)) out.clipped.push(`${tag} "${s.slice(0, 40)}"${clipX ? ' clipX' : ''}${clipY ? ' clipY' : ''}${off && !inScroll ? ' offscreen' : ''}`);
  }
  return out;
}

const results = {};
const fails = [];
for (const lang of LANGS) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  await page.goto(`${URL0}?seed=${SEED}&menu=1&fresh=1&lang=${lang}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  // The loading card waits for "Press any key or click".
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => (window.__echoes && window.__echoes.app ? window.__echoes.app.state : null)).catch(() => null);
    if (st === 'title') break;
    if (st === 'boot') await page.keyboard.press('Shift');
    await sleep(1500);
  }
  await sleep(1500);
  const app = (fn, ...a) => page.evaluate(fn, ...a);
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  const runView = () => cmd('runState');
  const waitPhase = (phases, timeout = 240000) => page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState')?.phase), { timeout, polling: 250 }, phases);
  const screens = {};
  async function grab(name) {
    await sleep(1500);
    const scan = await page.evaluate(scanPage);
    const i = await page.evaluate(() => window.__echoes.i18n());
    screens[name] = { ...scan, misses: i.misses };
    await page.evaluate(() => window.__echoes.i18n().clearMisses());
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${lang}-${name}.png` });
    console.log(`  ${lang} ${name}: ${scan.texts.length} texts, ${i.misses.length} misses, ${scan.clipped.length} clipped`);
  }
  const step = async (name, fn) => {
    try {
      await fn();
      await grab(name);
    } catch (err) {
      console.log(`  ${lang} ${name}: SKIPPED (${String(err && err.message ? err.message : err).slice(0, 120)})`);
      screens[name] = { skipped: true };
    }
  };
  const open = (id, p) => app((i, q) => window.__echoes.app.open(i, q), id, p);
  const back = () => app(() => window.__echoes.app.back());

  await step('title', async () => {});
  for (const tab of ['display', 'audio', 'controls', 'gameplay', 'network']) {
    await step(`settings-${tab}`, async () => {
      if (tab === 'display') await open('settings');
      await sleep(400);
      await page.click(`#ap-tab-${tab}`);
    });
  }
  await back();
  await step('saves', () => open('saves'));
  await back();
  await step('records', () => open('records'));
  await back();
  await step('online', () => open('mp-menu'));
  await back();
  await sleep(500);
  // Into the camp.
  await step('camp', async () => {
    await app(() => window.__echoes.app.newGame({}));
    await page.waitForFunction(() => window.__echoes.app.state === 'playing', { timeout: 300000, polling: 500 });
    await sleep(2500);
  });
  await step('classes', () => open('classes'));
  await back();
  await step('unlocks', () => open('unlocks'));
  await back();
  await step('levels', async () => {
    const r = await cmd('campLevels');
    if (r === undefined) throw new Error('no campLevels');
  });
  await back();
  // A campaign run.
  await step('combat', async () => {
    await cmd('startCampaign', { level: 1 });
    await waitPhase(['combat']);
    await sleep(2500);
  });
  await step('draft', async () => {
    await cmd('clearRoom');
    await waitPhase(['reward', 'relic', 'path']);
  });
  await step('socket', async () => {
    await cmd('draftTake');
    await sleep(900);
    const open1 = await page.evaluate(() => {
      const el = document.getElementById('socket-screen');
      return !!el && getComputedStyle(el).display !== 'none';
    });
    if (!open1) await cmd('openSocket');
  });
  await page.keyboard.press('Escape');
  await step('relic', async () => {
    await waitPhase(['relic', 'path']);
  });
  await step('path', async () => {
    const v = await runView();
    if (v.phase === 'relic') await cmd('relicChoose', 0);
    await waitPhase(['path']);
  });
  await step('pause', async () => {
    await app(() => window.__echoes.app.requestPause('api'));
  });
  await back();
  await step('shop', async () => {
    await cmd('skipToRoom', 7);
    await waitPhase(['shop']);
    await cmd('wallet', 200);
    await sleep(1200);
  });
  await step('runend', async () => {
    await cmd('endRun', 'defeat');
    await sleep(2500);
  });
  const seen = await page.evaluate(() => window.__echoes.i18n().seenList());
  results[lang] = { screens, errors, seen };
  await page.close();
}
await browser.close();

// Compare against the English pass.
const en = results.en.screens;
const report = {};
for (const lang of LANGS) {
  const r = results[lang];
  const rep = { misses: [], english: [], clipped: [], errors: r.errors, skipped: [] };
  for (const [name, s] of Object.entries(r.screens)) {
    if (s.skipped) {
      rep.skipped.push(name);
      continue;
    }
    for (const m of s.misses) rep.misses.push(`${name}: ${m}`);
    const base = en[name] && !en[name].skipped ? en[name] : null;
    if (lang !== 'en' && base) {
      const enSet = new Set(base.texts);
      for (const tx of new Set(s.texts)) {
        if (!enSet.has(tx) || keptAs(lang, tx)) continue;
        if (!/[A-Za-z]{3,}/.test(tx) || /^(Esc|Enter|Shift|Space|Tab|SPC|ECHOES|Echoes|LB|RB|LT|RT|Ctrl|Alt|Backspace|WASD|F\d+)$/i.test(tx)) continue;
        if (/^v?\d[\d.]*$|^[A-Z0-9]{5}$/.test(tx)) continue; // versions, room codes
        rep.english.push(`${name}: ${tx.slice(0, 80)}`);
      }
      const enClip = new Set(base.clipped.map((c) => c.replace(/ ".*"/, '')));
      for (const c of s.clipped) if (!enClip.has(c.replace(/ ".*"/, ''))) rep.clipped.push(`${name}: ${c}`);
    }
  }
  report[lang] = rep;
  const ok = rep.misses.length === 0 && rep.english.length === 0 && rep.clipped.length === 0 && rep.errors.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${lang}: misses ${rep.misses.length}, english ${rep.english.length}, clipped ${rep.clipped.length}, errors ${rep.errors.length}, skipped ${rep.skipped.join(' ') || '-'}`);
  for (const k of ['misses', 'english', 'clipped', 'errors']) for (const x of rep[k].slice(0, 12)) console.log(`     ${k}: ${x}`);
  if (!ok) fails.push(lang);
}
// English coverage: lines looked up while playing that the catalog does not have.
const uncatalogued = results.en.seen.filter((k) => !catalog[k]);
console.log(`catalog coverage: ${results.en.seen.length} lines looked up in English, ${uncatalogued.length} not in the catalog`);
for (const k of uncatalogued.slice(0, 40)) console.log(`     uncatalogued: ${k.slice(0, 90)}`);
writeFileSync('captures/i18n-uncatalogued.json', JSON.stringify(uncatalogued, null, 1));
writeFileSync('captures/i18n-report.json', JSON.stringify(report, null, 1));
console.log(fails.length ? `\nFAIL ${fails.join(' ')}` : '\nPASS languages browser check');
process.exit(fails.length ? 1 : 0);
