#!/usr/bin/env node
// gntM4a — a whole expedition played by REAL INPUT (docs/gauntlet/PLAN.md
// G4a.8 / G4a.9 real-input legs). Puppeteer keyboard + mouse only: walk to the
// portal (W), E, then every combat decision comes from the autopilot's
// ADVICE (`__echoes.content.advise()` — the game never applies it) turned
// into held W/A/S/D, a mouse aim at the projected target, a held right
// button for the basic attack, Digit taps for skills, Space for dodges and a
// held E for revives. Pages: Enter takes the draft (after the settle
// window), a node draft is socketed with two mouse clicks on the socket
// screen, Enter walks the first door, the cheapest affordable card is clicked
// in the shop and Enter advances, Enter returns to camp at the end. No sim
// call and no __echoes.cmd is used while the run is played.
//
//   node tools/gntM4a-realrun.mjs --act 1|2|3 --seed S [--w 1600 --h 900] [--hz 15] [--out f]
//
// Output: outcome, rooms reached/cleared, the fps distribution (the game's
// own median-of-frame-time meter, sampled in combat), page errors, frames.
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const ACT = Number(opt('act', '1'));
const SEED = Number(opt('seed', '1'));
const W = Number(opt('w', '1600'));
const H = Number(opt('h', '900'));
const HZ = Number(opt('hz', '15'));
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', `captures/gntM4a-realrun-act${ACT}-s${SEED}.json`);
const MAX_MIN = Number(opt('maxMin', '14'));
mkdirSync(join(here, 'captures'), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// An HMR full reload from another agent's edit destroys the page context
// mid-run (not a defect of the game): the whole run is retried, up to 3 times.
async function attempt(attemptNo) {
  const browser = await launchEchoes({ gpu: true, width: W, height: H });
  const { page, errors } = await openEchoes(browser, `${URL0}?menu=0&seed=${SEED}&act=${ACT}`, { width: W, height: H });
  await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
  const stacks = [];
  page.on('pageerror', (e) => stacks.push(String(e && e.stack ? e.stack : e).split(String.fromCharCode(10)).slice(0, 6).join(' | ')));
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const report = { act: ACT, seed: SEED, w: W, h: H, hz: HZ, at: new Date().toISOString(), rooms: [], fps: [], shots: [], log: [] };
  const shot = async (name) => {
    const p = join(here, 'captures', `gntM4a-realrun-a${ACT}s${SEED}-${name}.png`);
    await page.screenshot({ path: p });
    report.shots.push(p);
  };
  const keysDown = new Set();
  async function setKey(code, on) {
    if (on && !keysDown.has(code)) {
      keysDown.add(code);
      await page.keyboard.down(code);
    } else if (!on && keysDown.has(code)) {
      keysDown.delete(code);
      await page.keyboard.up(code);
    }
  }
  async function tap(code, ms = 40) {
    await page.keyboard.down(code);
    await sleep(ms);
    await page.keyboard.up(code);
  }
  let rmb = false;
  async function setRmb(on) {
    if (on === rmb) return;
    rmb = on;
    if (on) await page.mouse.down({ button: 'right' });
    else await page.mouse.up({ button: 'right' });
  }
  async function releaseAll() {
    for (const k of [...keysDown]) await setKey(k, false);
    await setRmb(false);
  }

  // ---------------------------------------------------------- 1. the portal --
  await setKey('KeyW', true);
  const t0 = Date.now();
  while (Date.now() - t0 < 12000 && !(await ev(() => __echoes.cmd('campState').inPortal))) await sleep(80);
  await setKey('KeyW', false);
  await tap('KeyE', 120);
  const began = await (async () => {
    const t = Date.now();
    while (Date.now() - t < 10000) {
      const s = await ev(() => __echoes.state().run);
      if (s.phase === 'combat' && s.room === 1) return s;
      await sleep(100);
    }
    return null;
  })();
  report.log.push({ began: !!began, act: began && began.act });
  if (!began) {
    const why = await ev(() => ({ camp: __echoes.cmd('campState'), run: __echoes.state().run.phase, app: __echoes.app && __echoes.app.state, stack: __echoes.app && __echoes.app.stack() }));
    throw new Error('the portal press did not start the run: ' + JSON.stringify(why).slice(0, 600));
  }

  // -------------------------------------------------------- 2. play the run --
  const tStart = Date.now();
  let lastRoom = 0;
  let outcome = null;
  let lastPhase = '';
  let shopDone = -1;
  while (Date.now() - tStart < MAX_MIN * 60000) {
    const st = await ev(() => {
      const r = __echoes.state().run;
      const ui = __echoes.runUi ? __echoes.runUi() : null;
      return {
        phase: r.phase,
        room: r.room,
        act: r.act,
        fps: __echoes.fps,
        settled: ui ? ui.settled : true,
        screen: ui ? ui.screen : null,
        socketOpen: document.getElementById('socket-screen')?.classList.contains('nd-open') ?? false,
        tick: __echoes.tick,
      };
    });
    if (st.room !== lastRoom) {
      lastRoom = st.room;
      report.rooms.push({ room: st.room, enteredAtTick: st.tick, wall: Date.now() - tStart });
      if (st.room >= 1 && st.room <= 8) await shot(`room${st.room}`);
    }
    if (st.phase !== lastPhase) {
      report.log.push({ tick: st.tick, phase: st.phase, room: st.room });
      lastPhase = st.phase;
    }
    if (st.phase === 'victory' || st.phase === 'defeat') {
      outcome = st.phase;
      await releaseAll();
      await sleep(900);
      await shot('end');
      await tap('Enter');
      break;
    }
    if (st.socketOpen) {
      // A node draft chains into the socket screen: click the bench card, then
      // the first cell that advertises a fit (◆); Esc closes (it is consumed).
      await releaseAll();
      const clicks = await ev(() => {
        const card = document.querySelector('#socket-screen .nd-bench .nd-card');
        if (!card) return null;
        const r = card.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
      if (clicks) {
        await page.mouse.click(clicks.x, clicks.y);
        await sleep(150);
        const cell = await ev(() => {
          const c = document.querySelector('#socket-screen .nd-cell.nd-fits');
          if (!c) return null;
          c.scrollIntoView({ block: 'center' });
          const r = c.getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        });
        if (cell) {
          await sleep(100);
          await page.mouse.click(cell.x, cell.y);
          report.log.push({ tick: st.tick, socketed: true });
        }
        await sleep(150);
      }
      await tap('Escape');
      await sleep(200);
      continue;
    }
    if (st.phase === 'combat') {
      const a = await ev(() => {
        const s = __echoes.content.advise();
        if (!s) return null;
        const aim = s.aim ? __echoes.content.project(s.aim.x, s.aim.z) : null;
        return { move: s.move, aim, basic: s.basicAttackHeld, revive: s.reviveHeld, presses: s.presses.map((p) => p.kind) };
      });
      if (st.fps) report.fps.push(st.fps);
      if (report.fps.length % 75 === 1) {
        const dbg = await ev(() => {
          const s = __echoes.state();
          return { tick: __echoes.tick, p: s.party.map((m) => [m.kind, Math.round(m.x * 10) / 10, Math.round(m.z * 10) / 10, Math.round(m.hp)]), foes: s.enemies.length, room: s.room && { wave: s.room.waveIndex, alive: s.room.aliveEnemies, pending: s.room.pendingSpawns }, adv: __echoes.content.advise() };
        });
        report.log.push({ dbg: JSON.stringify(dbg).slice(0, 700) });
      }
      if (a) {
        if (a.aim && !a.aim.behind) await page.mouse.move(Math.max(2, Math.min(W - 2, a.aim.x)), Math.max(2, Math.min(H - 2, a.aim.y)));
        const T = 0.38;
        await setKey('KeyW', a.move.z < -T);
        await setKey('KeyS', a.move.z > T);
        await setKey('KeyA', a.move.x < -T);
        await setKey('KeyD', a.move.x > T);
        await setRmb(!!a.basic);
        await setKey('KeyE', !!a.revive);
        for (const k of a.presses) {
          if (k === 'dodge') await tap('Space', 30);
          else if (/^skill_\d$/.test(k)) await tap(`Digit${k.slice(6)}`, 30);
        }
      }
      await sleep(Math.max(0, 1000 / HZ - 20));
      continue;
    }
    // Pages: never on a moving hand (settle window) — release everything first.
    await releaseAll();
    if (!st.settled) {
      await sleep(120);
      continue;
    }
    if (st.phase === 'reward' || st.phase === 'path') {
      await sleep(120);
      await tap('Enter', 60);
      await sleep(400);
      continue;
    }
    if (st.phase === 'shop') {
      if (shopDone !== st.room) {
        shopDone = st.room;
        const pick = await ev(() => {
          const v = __echoes.state().run;
          const cards = [...document.querySelectorAll('.rn-page:not([style*="display: none"]) .rn-card')];
          let best = -1;
          let price = Infinity;
          (v.shop ? v.shop.stock : []).forEach((s, i) => {
            if (!s.sold && s.price <= v.wallet && s.price < price) {
              price = s.price;
              best = i;
            }
          });
          if (best < 0 || !cards[best]) return null;
          const r = cards[best].getBoundingClientRect();
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, price };
        });
        if (pick) {
          await page.mouse.click(pick.x, pick.y);
          report.log.push({ tick: st.tick, bought: pick.price });
          await sleep(2400); // the purchase choreography
        }
        await sleep(200);
        continue;
      }
      await tap('Enter', 60);
      await sleep(500);
      continue;
    }
    await sleep(100);
  }
  await releaseAll();
  const fin = await ev(() => ({ run: __echoes.state().run, summary: __echoes.state().run.summary, tick: __echoes.tick }));
  const fps = [...report.fps].sort((a, b) => a - b);
  report.outcome = outcome ?? 'timeout';
  report.summary = fin.summary;
  report.roomsCleared = fin.summary ? fin.summary.rooms : null;
  report.fpsStats = fps.length
    ? { n: fps.length, p5: fps[Math.floor(fps.length * 0.05)], median: fps[Math.floor(fps.length / 2)], min: fps[0] }
    : null;
  report.pageErrors = errors;
  report.pageErrorStacks = stacks;
  report.wallMin = Math.round(((Date.now() - tStart) / 60000) * 10) / 10;
  writeFileSync(join(here, OUT), JSON.stringify(report, null, 1));
  console.log(JSON.stringify({ act: ACT, seed: SEED, outcome: report.outcome, roomsCleared: report.roomsCleared, fps: report.fpsStats, pageErrors: errors.length, wallMin: report.wallMin }));

  await browser.close();
  return errors.length ? 1 : 0;
}
let code = 1;
for (let a = 1; a <= 3; a++) {
  try {
    code = await attempt(a);
    break;
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    console.error(`attempt ${a}: ${msg.split(String.fromCharCode(10))[0]}`);
    if (!/context was destroyed|Target closed|detached|navigation/i.test(msg) || a === 3) {
      code = 2;
      break;
    }
  }
}
process.exit(code);
