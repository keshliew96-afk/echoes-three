#!/usr/bin/env node
// THE HEARTH SONG in the real game (docs/STORY.md): against `npm run dev`
// (port 5199), on a fresh profile, checks and captures:
//   story-1-prologue      Wick's prologue opens by itself in camp (once)
//   story-2-wick          Wick's bubble on approach; E moves on a line
//   story-3-bramble       Bramble's bubble at the market stall
//   story-4-page          J (Quill's chip) opens the Story so far page
//   story-5-pilgrim       Sedge speaks on the Lost Pilgrim card (meeting 1)
//   story-6-rumour        the peddler's rumour on her shelf names the boss
//   story-7-voice         the Hollow Voice under the Stag's title (first meet)
//   story-8-verse         the level-clear card: "The bell catches a verse: Root."
//   story-9-camp          back in camp: Wick's next line, the hearth a step
//                         brighter, the freed Stag at the camp's edge
//   story-10-chorus       a defeat card's Chorus line
// It fails on a page error, a missing piece, or (with --lang) a missing
// translation on these screens.
//
//   node tools/story-browser.mjs [--url http://127.0.0.1:5199/] [--lang de] [--shots dir]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';
import { KEEPER_LINES, CHORUS, BOSS_VOICE, ENCOUNTER_LINES, RUMOURS } from '../src/data/story.js';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const LANG = opt('lang', null);
const SHOTS = opt('shots', 'captures');
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const sfx = LANG ? `-${LANG}` : '';
mkdirSync(SHOTS, { recursive: true });

const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', `--window-size=${W},${H}`, ...extra],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
  return ok;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}${sfx}.png` });

await page.goto(`${URL0}?seed=3&story=1${LANG ? `&lang=${LANG}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
// (The prologue may open before the first tick: it pauses the sim.)
await page.waitForFunction(() => !!window.__echoes && (window.__echoes.tick > 60 || !!document.querySelector('.st-prologue')), { timeout: 300000, polling: 500 });

const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
const runView = () => cmd('runState');
const camp = () => cmd('campState');
const story = () => page.evaluate(() => window.__echoes.story().debug());
const visible = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.5 && r.width > 0;
  }, sel);
const textOf = (sel) => page.evaluate((s) => (document.querySelector(s) ? document.querySelector(s).textContent.replace(/\s+/g, ' ').trim() : null), sel);
async function waitPhase(phases, timeout = 240000) {
  await page.waitForFunction((ps) => ps.includes(window.__echoes.cmd('runState').phase), { timeout, polling: 250 }, phases);
  return runView();
}
async function key(code) {
  await page.keyboard.down(code);
  await sleep(140);
  await page.keyboard.up(code);
}
async function closeSocket() {
  const open = await page.evaluate(() => {
    const el = document.getElementById('socket-screen');
    return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
  });
  if (open) await page.keyboard.press('Escape');
}
async function toPath() {
  for (let i = 0; i < 40; i++) {
    const v = await runView();
    if (v.phase === 'path') return v;
    if (v.phase === 'combat') await cmd('clearRoom');
    else if (v.phase === 'reward') {
      await cmd('draftDecline');
      await sleep(900);
      await closeSocket();
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    await sleep(600);
  }
  return runView();
}
const npc = async (id) => (await camp()).story.npcs.find((n) => n.id === id);
// Wait on the state, not the clock: under software GL a camp bubble shows
// anywhere from 0.3 s to 4 s after the hero arrives (cloud probe recipe).
async function until(read, ok, timeout = 12000) {
  const t0 = Date.now();
  let v = await read();
  while (!ok(v) && Date.now() - t0 < timeout) {
    await sleep(250);
    v = await read();
  }
  return v;
}
const bubbled = (n) => !!(n && n.near && n.bubble);
const npcBubble = (id, timeout) => until(() => npc(id), bubbled, timeout);
const english = !LANG || LANG === 'en';

// 1 — the prologue opens by itself once the camp settles.
{
  const ok = await page.waitForFunction(() => !!document.querySelector('.st-prologue'), { timeout: 30000, polling: 250 }).then(() => true).catch(() => false);
  check(ok, 'the prologue opens by itself in camp');
  await sleep(1200);
  const paras = await page.evaluate(() => document.querySelectorAll('.st-prologue .st-text p').length);
  check(paras === 4, `the prologue tells four paragraphs (${paras})`);
  await shot('story-1-prologue');
  await page.keyboard.press('Enter');
  await sleep(900);
  check(!(await visible('.st-prologue')), 'Enter closes the prologue');
  const s = await story();
  check(s.story.seen.includes('prologue'), 'the profile remembers the prologue');
  await sleep(2500);
  check(!(await visible('.st-prologue')) && (await story()).prologueShown === 1, 'the prologue does not come back');
}

// 2 — Wick.
{
  await cmd('teleport', -1.95, 3.05);
  let w = await npcBubble('keeper');
  check(w && w.near && w.bubble, `Wick's bubble shows on approach (${w && w.text})`);
  if (english) check(w && w.line === KEEPER_LINES.byVerses.text[0], 'Wick opens with the first chapter line');
  await shot('story-2-wick');
  await key('KeyE');
  let w2 = null;
  for (let i = 0; i < 25; i++) {
    await sleep(250);
    w2 = await npc('keeper');
    if (w2 && w2.talkIdx === 0) break;
  }
  check(w2 && w2.talkIdx === 0 && w2.line !== w.line, `E moves Wick on a line (${JSON.stringify(w2)})`);
}

// 3 — Bramble.
{
  await cmd('teleport', 4.3, 2.0);
  const b = await npcBubble('peddler');
  check(b && b.near && b.bubble, `Bramble's bubble shows at the stall (${b && b.text})`);
  await shot('story-3-bramble');
}

// 4 — Quill and the Story so far page.
{
  await cmd('teleport', -2.75, -4.95);
  const q = await npcBubble('chronicler');
  check(q && q.near && q.bubble, `Quill's bubble shows at the map table (${q && q.text})`);
  await key('KeyJ');
  const open = await page.waitForFunction(() => !!document.querySelector('.st-story'), { timeout: 10000, polling: 200 }).then(() => true).catch(() => false);
  check(open, 'J opens the Story so far page');
  await sleep(1000);
  const held = await page.evaluate(() => document.querySelectorAll('.st-story .st-chap.st-held').length);
  const pips = await page.evaluate(() => document.querySelectorAll('.st-story .st-pip').length);
  check(held === 0 && pips === 7, `a fresh profile holds no verse of seven (${held} held, ${pips} pips)`);
  await shot('story-4-page');
  await page.keyboard.press('Escape');
  await sleep(800);
  check(!(await visible('.st-story')), 'Esc closes the page');
}

// 5..8 — a Level I campaign against the Stag: the pilgrim, the rumour, the
// Voice, the verse.
{
  await cmd('startCampaign', { level: 1, boss: 'stag', depart: false });
  await waitPhase(['combat']);
  await cmd('eventDoor', 'lost_pilgrim', 1);
  await cmd('wallet', 60);
  let v = await toPath();
  for (let g = 0; g < 3 && v.phase === 'path' && !v.path.options.some((o) => o.event); g++) {
    await cmd('pathChoose', 0);
    await waitPhase(['combat'], 60000).catch(() => null);
    v = await toPath();
  }
  const side = v.phase === 'path' ? v.path.options.findIndex((o) => o.event) : -1;
  if (check(side >= 0, 'the doors carry the pilgrim\'s "?" door')) {
    await sleep(900);
    await cmd('pathChoose', side);
    await waitPhase(['event']);
    await cmd('teleport', 1.2, -2.6);
    await sleep(500);
    await key('KeyE');
    v = await waitPhase(['encounter'], 60000).catch(() => runView());
    await sleep(1200);
    const say = await page.evaluate(() => {
      const el = document.querySelector('.rn-encounter .ev-say');
      return el && el.style.display !== 'none' ? { npc: el.dataset.npc, meeting: el.dataset.meeting, text: el.textContent.trim() } : null;
    });
    check(say && say.npc === 'pilgrim' && say.meeting === '1', `Sedge speaks on the card (${say && say.text})`);
    if (english) check(say && say.text.includes(ENCOUNTER_LINES.pilgrim.text[0]), 'Sedge says her first line');
    await shot('story-5-pilgrim');
    await cmd('eventChoose', 'leave');
    await sleep(800);
  }
  await cmd('skipToRoom', 7);
  v = await waitPhase(['shop'], 120000).catch(() => runView());
  await sleep(1500);
  const rumour = await page.evaluate(() => {
    const el = document.querySelector('.rn-shop .rn-rumour');
    return el ? { boss: el.dataset.boss, text: el.textContent.replace(/\s+/g, ' ').trim() } : null;
  });
  check(v.phase === 'shop' && rumour && rumour.boss === 'stag', `the rumour names the Stag (${rumour && rumour.text})`);
  if (english) check(rumour && rumour.text.includes(RUMOURS.stag.text), 'the rumour line is the Stag\'s');
  await shot('story-6-rumour');
  await cmd('shopAdvance');
  const voiced = await page.waitForFunction(() => window.__echoes.story().debug().voiceOn, { timeout: 120000, polling: 250 }).then(() => true).catch(() => false);
  await sleep(1400);
  const sd = await story();
  check(voiced && sd.story.seen.includes('voice:stag'), `the Hollow Voice speaks under the Stag's title (${sd.voiceText})`);
  if (english) check(sd.voiceText && sd.voiceText.includes(BOSS_VOICE.stag.text), 'the Voice says the Stag\'s line');
  await shot('story-7-voice');
  await cmd('killBoss');
  for (let i = 0; i < 20; i++) {
    const x = await runView();
    if (x.phase === 'transit') break;
    if (x.phase === 'combat') await cmd('clearRoom');
    await sleep(700);
  }
  v = await waitPhase(['transit'], 120000).catch(() => runView());
  await sleep(1200);
  const verse = await textOf('.rn-transit .rn-verse');
  check(v.phase === 'transit' && !!verse, `the level-clear card names the verse (${verse})`);
  if (english) check(verse === 'The bell catches a verse: Root.', 'the verse is Root');
  await shot('story-8-verse');
  // End the run the way a player does (not abandon: an abandoned run awards
  // nothing), so the profile records the felled Stag.
  await cmd('endRun', 'defeat');
  await sleep(1500);
  await cmd('returnToCamp');
  await page.waitForFunction(() => window.__echoes.cmd('campState').mode === 'camp', { timeout: 60000, polling: 250 }).catch(() => null);
  await sleep(2500);
}

// 9 — back in camp: a verse held.
{
  const c = await camp();
  check(c.story.verses === 1, `the camp counts one verse (${c.story.verses})`);
  check(c.hearthBoost === 1.05, `the hearth burns a step brighter (${c.hearthBoost})`);
  const stag = c.story.wardens.find((w) => w.kind === 'stag');
  check(stag && stag.visible, 'the freed Stag stands at the camp\'s edge');
  await cmd('teleport', -1.95, 3.05);
  const w = await npcBubble('keeper');
  if (english) check(w && w.line === KEEPER_LINES.byVerses.text[1], `Wick speaks of Root now (${w && w.line})`);
  await cmd('teleport', -8.6, -3.2);
  const s2 = await until(async () => (await camp()).story.wardens.find((x) => x.kind === 'stag'), bubbled);
  check(s2 && s2.near && s2.bubble, 'the Stag\'s line shows nearby');
  await shot('story-9-camp');
}

// 10 — a defeat card's Chorus line.
{
  await cmd('startCampaign', { level: 1, depart: false });
  await waitPhase(['combat']);
  await sleep(600);
  await cmd('endRun', 'defeat');
  await waitPhase(['defeat'], 60000).catch(() => null);
  await sleep(1500);
  const line = await textOf('.rn-end .rn-flavour');
  const all = [CHORUS.early.text, CHORUS.cursed.text, ...CHORUS.general.text];
  check(!!line && (!english || all.includes(line) || line.startsWith('The gods applaud')), `the Chorus speaks on the defeat card (${line})`);
  await shot('story-10-chorus');
}

if (LANG) {
  const misses = await page.evaluate(() => (window.__echoes.i18n().misses || []).slice());
  check(misses.length === 0, `no missing ${LANG} lines (${misses.slice(0, 4).join(' | ')})`);
}
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
console.log(JSON.stringify({ probe: 'story-browser', ok: fails.length === 0, fails }, null, 1));
process.exit(fails.length ? 1 : 0);
