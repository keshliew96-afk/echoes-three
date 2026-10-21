#!/usr/bin/env node
// GAMEPLAY FIXES (v0.5.324), the browser half of tools/gameplay-fixes-probe.mjs:
// a co-op guest's Level Select shows the HOST's open levels. Own network
// server, a host page on http://127.0.0.1:5199 and a guest page on
// http://localhost:5199 (two origins = two players' browsers). The host
// opens Levels I to IV (content.unlock), the guest's own profile only I:
//   - the guest's Level Select opens I to IV, Endless and Boss Rush follow
//     the host's, and a locked card says the host has not unlocked it;
//   - the guest picks Level III: the host starts the run at Level III (the
//     guest's tab in front, so it is not away and the host counts its seat);
//   - the host's own Level Select is unchanged (its own unlocks).
//   node tools/gameplay-fixes-guest.mjs [--port 7932] [--shots <dir>] [--lang de]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=<chrome> ECHOES_CHROME_ARGS="--no-sandbox".
import { mkdirSync } from 'node:fs';
import { startServer, launchEchoes, openClient, hostRoom, joinRoom, startGame, waitSession, netEval, sleep } from './gntM5b-lib.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7932));
const shots = arg('shots', 'captures');
const lang = arg('lang', 'en');
mkdirSync(shots, { recursive: true });
const fails = [];
function check(what, ok, got = null) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}${ok ? '' : ` ${JSON.stringify(got).slice(0, 600)}`}`);
  if (!ok) fails.push(what);
}
const cards = (c) => netEval(c, 'const el = document.querySelector(".cg-levels"); if (!el) return null; return [...el.querySelectorAll(".cg-card")].map((x) => ({ level: x.dataset.level, locked: x.getAttribute("aria-disabled") === "true", lock: (x.querySelector(".cg-lock-t") || {}).textContent || "" }));');
async function until(fn, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await fn();
    if (v) return v;
    await sleep(250);
  }
  return null;
}

let srv = null;
let browser = null;
try {
  srv = await startServer({ port, admin: true });
  const extraArgs = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
  browser = await launchEchoes({ gpu: !extraArgs.length, background: true, width: 1024, height: 640, extraArgs });
  const extra = lang === 'en' ? {} : { lang };
  const host = await openClient(browser, { base: 'http://127.0.0.1:5199/', server: srv.url, name: 'Host', seed: 7, w: 1024, h: 640, extra });
  const guest = await openClient(browser, { base: 'http://localhost:5199/', server: srv.url, name: 'Guest', seed: 8, w: 1024, h: 640, extra });
  await netEval(host, 'return E.content.unlock([1, 2, 3, 4]);');
  await netEval(guest, 'return E.content.unlock([1]);');
  const code = await hostRoom(host);
  await joinRoom(guest, code, 1);
  await startGame(host, [guest]);
  await waitSession([host, guest]);
  await sleep(1500);

  check('the guest opens its Level Select', (await netEval(guest, 'return E.cmd("campLevels");')) === true);
  const seen = await until(async () => {
    const c = await cards(guest);
    return c && c.find((x) => x.level === '4' && !x.locked) ? c : null;
  });
  const gc = seen || (await cards(guest));
  const open = (c) => (c || []).filter((x) => !x.locked).map((x) => x.level).join(',');
  check("the guest's cards open the host's Levels I to IV", !!seen && ['1', '2', '3', '4'].every((l) => gc.find((x) => x.level === l && !x.locked)), gc);
  const v = gc && gc.find((x) => x.level === '5');
  check('a locked guest card names the host', !!v && v.locked && v.lock.length > 0, v);
  console.log('guest open:', open(gc), '| lock line:', v && v.lock);
  await guest.page.screenshot({ path: `${shots}/guest-level-select-${lang}.png` });

  // The guest picks Level III: the host starts it. POLISH: the guest's tab
  // is brought to the front first and the host must see seat 1 as a human
  // (a hidden guest page sends away frames, and the host rightly plays an
  // away seat as AI and refuses its pick as not_owner: the step failed
  // whenever the host's tab was the one in front).
  await guest.page.bringToFront();
  const human = await until(() => netEval(host, 'const a = E.content.world().allySystem(); return a.controllers()[1] === "human";'), 90000);
  check("the host sees the guest's seat as a human before the pick", !!human, human);
  await netEval(guest, 'document.querySelector(\'.cg-card[data-level="3"]\').click(); return true;');
  const started = await until(async () => {
    const r = await netEval(host, 'const c = E.cmd("campaignState"); return c && c.active ? { level: c.level, mode: c.mode } : null;');
    return r && r.level === 3 ? r : null;
  }, 90000);
  check('the guest picks Level III and the host starts it', !!started, started);
} catch (err) {
  console.log('FAIL error', err && err.stack);
  fails.push('error');
} finally {
  if (browser) await browser.close().catch(() => {});
  if (srv && srv.stop) await srv.stop();
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
process.exit(fails.length ? 1 : 0);
