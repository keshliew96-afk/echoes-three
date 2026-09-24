// Fix builder M3 round 1 — boss kill -> victory stinger -> camp, and a defeat stinger, read from the
// running game (music state machine regression check for the G3.5 flow).
//   node tools/gntfixM31-victory.mjs
import { launchEchoes, waitReady } from './gnt-arch-browser.mjs';

const browser = await launchEchoes({ gpu: true, autoplay: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto('http://127.0.0.1:5199/?menu=0&seed=7&fresh=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__echoes && window.__echoes.audio && window.__echoes.audio.state === 'running', { timeout: 120000 });
  await waitReady(page, { minTick: 120 }).catch(() => {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const read = () =>
    page.evaluate(() => {
      const E = window.__echoes;
      const m = E.audio.music();
      return { t: Math.round(performance.now()), music: m.state, derived: m.derived, stinger: m.stinger, phase: E.state().run.phase, boss: E.state().run.boss, room: E.state().run.room };
    });
  const log = [];
  const cmds = await page.evaluate(() => (window.__echoes.cmd && window.__echoes.cmd.list ? window.__echoes.cmd.list() : null));
  log.push({ cmds: cmds && cmds.slice ? cmds.slice(0, 80) : cmds });
  await page.evaluate(() => window.__echoes.cmd('startRun'));
  await sleep(2500);
  log.push(await read());
  await page.evaluate(() => window.__echoes.cmd('skipToRoom', 8));
  await sleep(4000);
  log.push(await read());
  const kb = await page.evaluate(() => {
    try {
      return window.__echoes.cmd('killBoss');
    } catch (e) {
      return 'throw: ' + e.message;
    }
  });
  log.push({ killBoss: kb === undefined ? 'undefined' : kb });
  for (let i = 0; i < 12; i++) {
    await sleep(500);
    log.push(await read());
  }
  await page.evaluate(() => {
    try {
      window.__echoes.cmd('bossHp', 0.001);
      window.__echoes.cmd('killAllEnemies');
    } catch {}
  });
  for (let i = 0; i < 12; i++) {
    await sleep(500);
    log.push(await read());
  }
  console.log(JSON.stringify(log, null, 0));
  console.log('ERRORS', JSON.stringify(errors));
} finally {
  await browser.close();
}
