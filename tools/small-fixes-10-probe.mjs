#!/usr/bin/env node
// Small fixes 10 probe (v0.5.305):
//
//   node tools/small-fixes-10-probe.mjs [--root <checkout>] [--url http://127.0.0.1:5199/] [--no-browser] [--lang de] [--shots captures]
//
//   wayfarer  the Wayfarer deed counts every event, the Ember Kiln's Molten
//             Bell included: the sixteen older events are no longer enough,
//             all seventeen are; its progress bar reads n/17; a profile that
//             already holds the deed keeps it (never paid twice); its text
//             is unchanged ("Enter every kind of event room.")
//   journal   an elite power the deeds' lifetime marks hold but the Journal
//             never counted (felled before v0.5.304) is met, shows no tile
//             number and its page reads "Felled before the Journal kept
//             count." instead of "Felled: 1"; a power the Journal counted
//             keeps "Felled: n"; the new line is translated in all ten
//             languages; the Elite powers heading still counts it as met
//   recount   (Kesh's "Fix recount first") the profile works out once which
//             powers were felled before the Journal counted them
//             (journal.early.affix, from the lifetime marks) and keeps that
//             list; once such a power is felled again its tile reads "n+"
//             and its page "Felled: n, and more before the Journal kept
//             count."; a power the Journal always counted stays plain
//   version   v0.5.305
// The journal leg runs in the real game (a Vite dev server at --url; the
// probe never imports src/render). --root runs the headless checks against
// another checkout (35c2f6c: the wayfarer and version checks fail there).
// Exit code 1 on any failure.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, mkdirSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const here = opt('root') ? resolve(opt('root')) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(join(here, p)).href;
globalThis.performance ??= { now: () => Date.now() };
const { ENCOUNTERS, ENCOUNTER_IDS, WAYFARER_IDS } = await import(u('src/sim/encounters.js'));
const { DEEDS, awardFor, freshMeta } = await import(u('src/data/unlocks.js'));
const { VERSION } = await import(u('src/version.js'));
const PROF = await import(u('src/save/profile.js'));

let failed = 0;
let passed = 0;
function check(leg, name, ok, detail = null) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${leg}] ${name}${detail !== null ? ` ${JSON.stringify(detail)}` : ''}`);
  return !!ok;
}
const LANGS = ['de', 'es', 'fr', 'ja', 'ko', 'pt-BR', 'ru', 'zh-Hans', 'zh-Hant'];
const tables = Object.fromEntries(LANGS.map((l) => [l, JSON.parse(readFileSync(join(here, `src/i18n/locales/${l}.json`), 'utf8'))]));
const untranslated = (key) => LANGS.filter((l) => typeof tables[l][key] !== 'string' || !tables[l][key].trim() || tables[l][key] === key);

// ------------------------------------------------------------ wayfarer --
{
  const W = DEEDS.wayfarer;
  const old = ENCOUNTER_IDS.filter((id) => ENCOUNTERS[id].land !== 'kiln');
  check('wayfarer', 'the Molten Bell is an event and Wayfarer counts it', 'molten_bell' in ENCOUNTERS && WAYFARER_IDS.includes('molten_bell'));
  check('wayfarer', 'Wayfarer counts every event (17)', WAYFARER_IDS.length === ENCOUNTER_IDS.length && ENCOUNTER_IDS.length === 17, WAYFARER_IDS.length);
  check('wayfarer', 'its text is unchanged', W.text === 'Enter every kind of event room.', W.text);
  const meta = (events, deeds = []) => ({ ...freshMeta(), deeds, marks: { ...(freshMeta().marks || {}), event: events } });
  const facts = (events) => ({ rooms: 0, cleared: [], deep: [], complete: false, challenge: 'standard', vows: [], relics: [], bosses: [], curses: 0, runs: 1, depth: 0, party: [], objectives: [], champions: [], events, arenas: [], affixes: [], vaults: 0 });
  const a1 = awardFor(facts([]), meta(old.slice()));
  check('wayfarer', 'the sixteen older events alone no longer earn it', !a1.deeds.includes('wayfarer'), a1.deeds);
  check('wayfarer', 'its bar reads 16/17 for such a profile', JSON.stringify(W.goal({ event: old.slice() })) === '[16,17]', W.goal({ event: old.slice() }));
  const a2 = awardFor(facts(['molten_bell']), meta(old.slice()));
  check('wayfarer', 'a run that rings the Molten Bell then earns it', a2.deeds.includes('wayfarer'), a2.deeds);
  const a3 = awardFor(facts(['molten_bell']), meta(old.slice(), ['wayfarer']));
  check('wayfarer', 'a profile that already holds it keeps it and is not paid twice', !a3.deeds.includes('wayfarer'), a3.deeds);
}

check('version', 'v0.5.305', VERSION === '0.5.305', VERSION);

// ------------------------------------------------------------- journal --
const LINE = 'Felled before the Journal kept count.';
check('journal', 'the new line is translated in all nine other languages', untranslated(LINE).length === 0, untranslated(LINE));
const src = readFileSync(join(here, 'src/ui/story/journal.js'), 'utf8');
check('journal', 'the Journal page uses the new line', src.includes(`t('${LINE}')`));

// ------------------------------------------------------------- recount --
const LINE2 = 'Felled: {n}, and more before the Journal kept count.';
check('recount', 'the recount line is translated in all nine other languages', untranslated(LINE2).length === 0, untranslated(LINE2));
{
  const meta = { ...PROF.freshProfile().meta, marks: { ...(PROF.freshProfile().meta.marks || {}), affix: ['gusting', 'molten'] } };
  const old = { seen: { affix: { molten: 2 } } }; // a v0.5.304 journal: no early list
  const j1 = PROF.saneJournal ? PROF.saneJournal(old, meta) : null;
  check('recount', 'a profile without the list works it out from the marks (Gusting, not the counted Molten)', !!j1 && JSON.stringify(j1.early && j1.early.affix) === '["gusting"]', j1 && j1.early);
  const j2 = PROF.saneJournal({ ...j1, seen: { affix: { molten: 2, gusting: 3 } } }, meta);
  check('recount', 'the stored list is kept after the power is felled again', !!j2.early && j2.early.affix.join() === 'gusting', j2.early);
  const fresh = PROF.saneJournal(PROF.freshJournal(), meta);
  check('recount', 'a new profile starts with an empty list (nothing is early later)', !!fresh.early && fresh.early.affix.length === 0, fresh.early);
  const text = JSON.stringify({ ...PROF.freshProfile(), meta, journal: old });
  const back = PROF.parseProfile(text);
  check('recount', 'loading a stored v0.5.304 profile fills the list', !!back && back.journal.early.affix.join() === 'gusting', back && back.journal.early);
  const again = PROF.parseProfile(JSON.stringify(back));
  check('recount', 'and a save round trip keeps it', !!again && again.journal.early.affix.join() === 'gusting');
}

if (!argv.includes('--no-browser')) {
  const URL0 = opt('url', 'http://127.0.0.1:5199/');
  const LANG = opt('lang', null);
  const SHOTS = opt('shots', 'captures');
  mkdirSync(SHOTS, { recursive: true });
  const { default: puppeteer } = await import('puppeteer');
  const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 600000,
    defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
    args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1600,900', ...extra],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = async (code) => {
    await page.keyboard.down(code);
    await sleep(140);
    await page.keyboard.up(code);
  };
  await page.goto(`${URL0}?seed=4&tips=0&story=0&audio=0&tutorial=0${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 120000, polling: 250 }).catch(() => null);
  await sleep(1500);
  // A profile from before v0.5.304: Gusting and Molten felled (the deeds'
  // marks), the Journal counting only Molten (twice, since the update).
  await page.evaluate(() => {
    const p = window.__echoes.save.profile();
    p.meta.marks = { ...(p.meta.marks || {}), affix: ['gusting', 'molten'] };
    p.journal.seen.affix = { molten: 2 };
  });
  let open = false;
  for (let i = 0; i < 6 && !open; i++) {
    await key('KeyJ');
    open = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
    if (!open) {
      await page.keyboard.press('Escape');
      await sleep(2500);
    }
  }
  check('journal', 'J opens the Journal', open);
  for (let i = 0; i < 6; i++) {
    const tab = await page.evaluate(() => document.querySelector('.st-story')?.__journal?.()?.tab);
    if (tab === 'bestiary') break;
    await key('KeyE');
    await sleep(600);
  }
  await sleep(1500);
  const pick = async (id) => {
    const tile = await page.evaluate((jid) => {
      const b = document.querySelector(`.jr-tile[data-jid="affix:${jid}"]`);
      if (!b) return null;
      b.scrollIntoView({ block: 'center' });
      b.click();
      return { unseen: b.classList.contains('jr-unseen'), n: b.querySelector('.jr-n')?.textContent ?? null };
    }, id);
    await sleep(900);
    const count = await page.evaluate(() => document.querySelector('.jr-detail .jr-count')?.textContent.trim() ?? '');
    return { ...tile, count };
  };
  const tr = LANG && LANG !== 'en' ? tables[LANG][LINE] : LINE;
  const m = await pick('molten');
  check('journal', `a power the Journal counted keeps its count (${m.count})`, !!m && !m.unseen && m.n === '2' && /2/.test(m.count) && m.count !== tr, m);
  const g = await pick('gusting');
  const head = await page.evaluate(() => [...document.querySelectorAll('.jr-sec')].map((s) => s.textContent).pop() ?? '');
  await page.screenshot({ path: `${SHOTS}/sf10-journal${LANG ? `-${LANG}` : ''}.png` });
  check('journal', `a power felled before v0.5.304 is met with no tile number (${JSON.stringify(g)})`, !!g && !g.unseen && g.n === null);
  check('journal', `its page reads the new line, not "Felled: 1" (${g && g.count})`, !!g && g.count === tr);
  check('journal', `the Elite powers heading counts both as met (${head.trim()})`, head.includes('2/12'));
  // Recount: Gusting felled three times since, after kills the Journal missed.
  await page.evaluate(() => {
    const p = window.__echoes.save.profile();
    p.journal.seen.affix = { molten: 2, gusting: 3 };
    p.journal.early = { affix: ['gusting'] };
  });
  await page.keyboard.press('Escape');
  await sleep(1500);
  let reopened = false;
  for (let i = 0; i < 6 && !reopened; i++) {
    await key('KeyJ');
    reopened = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 8000, polling: 200 }).then(() => true).catch(() => false);
    if (!reopened) {
      await page.keyboard.press('Escape');
      await sleep(2500);
    }
  }
  for (let i = 0; i < 6; i++) {
    const tab = await page.evaluate(() => document.querySelector('.st-story')?.__journal?.()?.tab);
    if (tab === 'bestiary') break;
    await key('KeyE');
    await sleep(600);
  }
  await sleep(1200);
  const m2 = await pick('molten');
  check('recount', `a power the Journal always counted stays plain (${m2.n} / ${m2.count})`, m2.n === '2' && m2.count === (LANG && LANG !== 'en' ? tables[LANG]['Felled: {n}'] : 'Felled: {n}').replace('{n}', '2'));
  const g2 = await pick('gusting');
  await page.screenshot({ path: `${SHOTS}/sf10-recount${LANG ? `-${LANG}` : ''}.png` });
  const want2 = (LANG && LANG !== 'en' ? tables[LANG][LINE2] : LINE2).replace('{n}', '3');
  check('recount', `an old power felled again: tile "3+" (${g2.n})`, g2.n === '3+');
  check('recount', `and its page says earlier kills are not counted (${g2.count})`, g2.count === want2);
  if (LANG && LANG !== 'en') {
    const miss = await page.evaluate(() => (window.__echoes.i18n ? window.__echoes.i18n().misses : []));
    check('journal', `no missing translations on this screen (${miss.slice(0, 4).join(' | ')})`, miss.length === 0);
  }
  check('journal', 'no page errors', errors.length === 0, errors.slice(0, 3));
  await browser.close();
}

console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
