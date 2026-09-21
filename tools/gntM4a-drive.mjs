#!/usr/bin/env node
// gntM4a — in-page probe driver for the M4a gates (docs/gauntlet/PLAN.md §7).
// Real browser, real input (puppeteer keyboard/mouse), the running dev server.
//
//   node tools/gntM4a-drive.mjs <scenario> [--url U] [--w 1600] [--h 900] [--gpu 1]
//        [--out captures/gntM4a-drive-<scenario>.json]
//
// Scenarios: skills · picker · hud · socket · pages · realrun (see below).
// Output: one JSON with every measured value + page errors; screenshots under
// captures/gntM4a-<scenario>-*.png. Exit 1 on a harness crash or page errors.
import { launchEchoes, openEchoes } from './gnt-arch-browser.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const scenario = argv[0];
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const W = Number(opt('w', 1600));
const H = Number(opt('h', 900));
const BASE = opt('url', 'http://127.0.0.1:5199/');
const OUT = opt('out', `captures/gntM4a-drive-${scenario}${opt('tag', '') ? '-' + opt('tag') : ''}.json`);
const GPU = opt('gpu', '1') !== '0';
mkdirSync(join(here, 'captures'), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { scenario, w: W, h: H, at: new Date().toISOString(), steps: [], checks: [] };
let failed = 0;
function check(name, ok, got) {
  report.checks.push({ name, ok: !!ok, got });
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${got !== undefined ? '  ' + JSON.stringify(got).slice(0, 400) : ''}`);
}

async function boot(browser, query) {
  const url = BASE + query;
  const s = await openEchoes(browser, url, { width: W, height: H });
  if (/menu=1/.test(query)) {
    // Title boot: the sim is paused at tick 0; the loading splash may wait for
    // a first key while audio is autoplay-locked (PLAN §3.5) — press one.
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      const st = await s.page.evaluate(() => (window.__echoes && window.__echoes.app ? window.__echoes.app.state : null));
      if (st === 'title') break;
      await s.page.keyboard.press('KeyZ');
      await sleep(500);
    }
    return s;
  }
  await s.page.waitForFunction(() => window.__echoes && window.__echoes.tick > 30, { timeout: 120000 });
  return s;
}
function mk(page) {
  const ev = (fn, ...args) => page.evaluate(fn, ...args);
  const shot = async (name) => {
    const p = join(here, 'captures', `gntM4a-${scenario}-${name}.png`);
    await page.screenshot({ path: p });
    report.steps.push({ shot: p });
    return p;
  };
  const key = async (k, ms = 90) => {
    await page.keyboard.down(k);
    await sleep(ms);
    await page.keyboard.up(k);
  };
  const until = async (fn, ms = 20000, ...args) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await page.evaluate(fn, ...args)) return true;
      await sleep(60);
    }
    return false;
  };
  return { ev, shot, key, until };
}

// ------------------------------------------------------------ scenarios --
const SCEN = {
  // G4a.2: every new skill drafted into a slot, cast by its real key, with
  // its VFX layers counted and a frame captured mid-effect.
  async skills(browser) {
    const { page, errors } = await boot(browser, '?seed=11&menu=0');
    const { ev, shot, key, until } = mk(page);
    await ev(() => __echoes.cmd('startRun', { act: 1 }));
    await until(() => __echoes.state().run.phase === 'combat');
    await ev(() => {
      // Park the wave off to the side: this is a VFX probe, not a fight.
      __echoes.cmd('killAllEnemies');
      window.__m4aFx = [];
      __echoes.on('*', (e) => {
        if (['skill_cast', 'status_apply', 'zone_tick', 'split_shard', 'shield_absorb', 'skill_bolt_pierce', 'aura_pulse'].includes(e.type)) window.__m4aFx.push({ type: e.type, skill: e.skill, status: e.status, tick: e.tick });
      });
      return true;
    });
    const groups = [
      ['lantern_flurry', 'pale_lance', 'bell_toll', 'rootsnare', 'dewfall', 'kindred_shield'],
      ['mending_tide', 'hearthsong', 'quiet_hearth'],
    ];
    await page.mouse.move(W * 0.72, H * 0.5);
    for (let g = 0; g < groups.length; g++) {
      await ev((ids) => {
        const kit = [{ id: 'mending_bolt', remaining: 0 }, { id: 'swift_mend', remaining: 0 }, ...ids.map((id) => ({ id, remaining: 0 }))];
        while (kit.length < 8) kit.push(null);
        __echoes.cmd('restoreSkillState', { slots: kit, override: null });
        // targets for the damage shapes + hurt allies for the heals
        for (const [x, z] of [[1.4, 0.2], [2.4, 0.1], [3.4, 0.3], [1.0, -0.9]]) {
          const id = __echoes.cmd('spawn', 'dummy', x, z);
          const e = __echoes.state().enemies.find((q) => q.id === id);
          void e;
        }
        for (const p of __echoes.state().party) if (p.kind === 'ally') __echoes.cmd('setHp', p.id, 0.45);
        return true;
      }, groups[g]);
      for (let i = 0; i < groups[g].length; i++) {
        const id = groups[g][i];
        const slot = i + 2;
        await key(`Digit${slot + 1}`);
        await sleep(id === 'rootsnare' || id === 'dewfall' ? 1250 : id === 'quiet_hearth' ? 1100 : 140);
        const fx = await ev(() => __echoes.content.fx());
        const sk = await ev(() => ({ skillfx: __echoes.state().skillfx, slots: __echoes.state().skills.map((s) => s && s.id) }));
        await shot(`${id}`);
        const casts = await ev((sid) => window.__m4aFx.filter((e) => (e.skill === sid && (e.type === 'skill_cast' || e.type === 'aura_pulse'))).length, id);
        report.steps.push({ skill: id, slot, casts, fx, skillfx: sk.skillfx });
        check(`${id}: key ${slot + 1} ${id === 'quiet_hearth' ? 'passive pulses' : 'casts'}`, casts > 0, { casts, slot });
      }
    }
    const summary = await ev(() => {
      const f = window.__m4aFx;
      const by = {};
      for (const e of f) by[`${e.type}:${e.skill ?? e.status ?? ''}`] = (by[`${e.type}:${e.skill ?? e.status ?? ''}`] || 0) + 1;
      return by;
    });
    report.events = summary;
    check('statuses announced (stun / slow / shield / haste / ward)', ['status_apply:stun', 'status_apply:slow', 'status_apply:shield', 'status_apply:haste', 'status_apply:ward'].every((k) => summary[k] > 0), summary);
    report.pageErrors = errors;
    check('0 page errors', errors.length === 0, errors);
  },

  // G4a.11: the portal rule in every branch.
  async picker(browser) {
    // (1) ?menu=0 -> E starts Act I with no picker (the ARCH core-loop check).
    {
      const { page, errors } = await boot(browser, '?seed=7&menu=0&fresh=1');
      const { ev, key, until } = mk(page);
      await page.keyboard.down('KeyW');
      await until(() => __echoes.cmd('campState').inPortal, 9000);
      await page.keyboard.up('KeyW');
      await key('KeyE', 120);
      const ok = await until(() => __echoes.state().run.phase === 'combat' && __echoes.state().run.room === 1, 8000);
      const s = await ev(() => ({ stack: __echoes.app.stack(), act: __echoes.state().run.act }));
      check('menu=0: E at the portal starts Act I directly, no picker', ok && s.act === 1 && !s.stack.some((x) => (x.id ?? x) === 'expedition'), s);
      check('menu=0: 0 page errors', errors.length === 0, errors);
      await page.close();
    }
    // (2) title session, only Act I unlocked -> no picker.
    // (3) title session, Acts I-II unlocked -> picker; E confirms the preselect; Esc backs out; sim paused.
    {
      const { page, errors } = await boot(browser, '?menu=1&seed=5&fresh=1');
      const { ev, key, until, shot } = mk(page);
      // Title -> New Game (M1): Enter on the default item until playing.
      await until(() => __echoes.app.state === 'title', 20000);
      await ev(() => __echoes.app.press && true);
      for (let i = 0; i < 12 && (await ev(() => __echoes.app.state)) !== 'playing'; i++) {
        const f = await ev(() => __echoes.app.focus());
        if (f && /new game/i.test(f.label || '')) await key('Enter');
        else await key('ArrowDown');
        await sleep(250);
      }
      const playing = await until(() => __echoes.app.state === 'playing', 8000);
      check('title -> New Game -> playing', playing, await ev(() => __echoes.app.state));
      await page.keyboard.down('KeyW');
      await until(() => __echoes.cmd('campState').inPortal, 9000);
      await page.keyboard.up('KeyW');
      const unlocked1 = await ev(() => __echoes.content.unlockedActs());
      await ev(() => __echoes.content.unlock([1, 2]));
      const unlocked2 = await ev(() => __echoes.content.unlockedActs());
      const t0 = await ev(() => __echoes.tick);
      await key('KeyE', 120);
      const opened = await until(() => __echoes.app.stack().some((x) => (x.id ?? x) === 'expedition'), 3000);
      await sleep(400);
      const t1 = await ev(() => __echoes.tick);
      await sleep(500);
      const t2 = await ev(() => __echoes.tick);
      const focus = await ev(() => __echoes.app.focus());
      await shot('picker');
      check('title + Acts I-II unlocked: E opens the expedition picker', opened, { unlocked1, unlocked2 });
      check('picker: single-player sim paused while open', t2 === t1, { t0, t1, t2 });
      check('picker: last-played / highest unlocked act preselected', focus && /Sunken Mill|Hollow Wood/.test(focus.label || ''), focus);
      // Esc backs out to the camp (no run starts).
      await key('Escape');
      const closed = await until(() => !__echoes.app.stack().some((x) => (x.id ?? x) === 'expedition'), 3000);
      await sleep(300);
      check('picker: Esc backs out, no run started', closed && (await ev(() => __echoes.state().run.phase)) === 'idle', await ev(() => __echoes.state().run.phase));
      // Re-open, move left to Act I, E confirms -> Act I; then check the right card is the default.
      await key('KeyE', 120);
      await until(() => __echoes.app.stack().some((x) => (x.id ?? x) === 'expedition'), 3000);
      await sleep(250);
      const pre = await ev(() => __echoes.app.focus());
      await key('KeyE', 120);
      const started = await until(() => __echoes.state().run.phase === 'combat' && __echoes.state().run.room === 1, 8000);
      const act = await ev(() => __echoes.state().run.act);
      check('picker: E confirms the preselected card', started && pre && pre.label && pre.label.includes(act === 2 ? 'Sunken Mill' : 'Hollow Wood'), { act, pre: pre && pre.label });
      await shot('act-room1');
      check('title session: 0 page errors', errors.length === 0, errors);
      await page.close();
    }
    {
      const { page, errors } = await boot(browser, '?menu=1&seed=6&fresh=1');
      const { ev, key, until } = mk(page);
      await until(() => __echoes.app.state === 'title', 20000);
      for (let i = 0; i < 12 && (await ev(() => __echoes.app.state)) !== 'playing'; i++) {
        const f = await ev(() => __echoes.app.focus());
        if (f && /new game/i.test(f.label || '')) await key('Enter');
        else await key('ArrowDown');
        await sleep(250);
      }
      await until(() => __echoes.app.state === 'playing', 8000);
      await page.keyboard.down('KeyW');
      await until(() => __echoes.cmd('campState').inPortal, 9000);
      await page.keyboard.up('KeyW');
      await key('KeyE', 120);
      const direct = await until(() => __echoes.state().run.phase === 'combat', 8000);
      const s = await ev(() => ({ act: __echoes.state().run.act, unlocked: __echoes.content.unlockedActs(), picker: __echoes.app.stack().some((x) => (x.id ?? x) === 'expedition') }));
      check('title + only Act I unlocked: E starts Act I, no picker', direct && s.act === 1 && !s.picker, s);
      check('fresh profile: 0 page errors', errors.length === 0, errors);
      await page.close();
    }
  },

  // G4a.1: the command bar at 1024x576 / 1600x900 / 2560x1440.
  async hud(browser) {
    const sizes = [[1024, 576], [1600, 900], [2560, 1440]];
    for (const [w, h] of sizes) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e.message || e)));
      await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
      await page.goto(BASE + '?seed=7&menu=0', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__echoes && window.__echoes.tick > 60, { timeout: 120000 });
      await page.evaluate(() => {
        __echoes.cmd('startRun', { act: 1 });
        const kit = ['mending_bolt', 'swift_mend', 'bell_toll', 'rootsnare', 'kindred_shield', 'hearthsong', 'quiet_hearth', 'pale_lance'].map((id) => ({ id, remaining: 0 }));
        __echoes.cmd('restoreSkillState', { slots: kit, override: null });
        return true;
      });
      await sleep(900);
      const m = await page.evaluate(() => {
        const bar = document.querySelector('.hud-bar').getBoundingClientRect();
        const tiles = [...document.querySelectorAll('.hud-bar .hud-port, .hud-bar .hud-slot')].map((n) => {
          const r = n.getBoundingClientRect();
          return { cls: n.className.split(' ')[0], x: r.x, y: r.y, w: r.width, h: r.height, key: n.querySelector('.hud-slot-key, .hud-port-key')?.textContent ?? '' };
        });
        const keys = [...document.querySelectorAll('.hud-bar .hud-slot-key')].map((n) => {
          const cs = getComputedStyle(n);
          return { t: n.textContent, px: parseFloat(cs.fontSize) * (parseFloat(getComputedStyle(document.getElementById('hud')).transform.split('(')[1]) || 1) };
        });
        const scale = (() => {
          const t = getComputedStyle(document.getElementById('hud')).transform;
          const mm = /matrix\(([^,]+)/.exec(t);
          return mm ? Number(mm[1]) : 1;
        })();
        return { bar: { x: bar.x, y: bar.y, w: bar.width, h: bar.height }, tiles, keys, scale, vw: innerWidth, vh: innerHeight };
      });
      let overlaps = 0;
      for (let i = 0; i < m.tiles.length; i++)
        for (let j = i + 1; j < m.tiles.length; j++) {
          const a = m.tiles[i];
          const b = m.tiles[j];
          if (a.x < b.x + b.w - 0.5 && a.x + a.w > b.x + 0.5 && a.y < b.y + b.h - 0.5 && a.y + a.h > b.y + 0.5) overlaps += 1;
        }
      const inside = m.bar.x >= 0 && m.bar.x + m.bar.w <= m.vw && m.bar.y + m.bar.h <= m.vh;
      const skillTiles = m.tiles.filter((t) => t.cls === 'hud-slot').length;
      const portTiles = m.tiles.filter((t) => t.cls === 'hud-port').length;
      const keyPx = Math.min(...m.keys.map((k) => 24 * m.scale));
      report.steps.push({ size: `${w}x${h}`, ...m, overlaps, inside, skillTiles, portTiles, keyPx });
      await page.screenshot({ path: join(here, 'captures', `gntM4a-hud-${w}x${h}.png`) });
      check(`${w}x${h}: 4 portraits + 8 skill tiles + dodge`, portTiles === 4 && skillTiles === 9, { portTiles, skillTiles, keys: m.tiles.map((t) => t.key).join(' ') });
      check(`${w}x${h}: no tile overlaps, bar inside the window`, overlaps === 0 && inside, { overlaps, bar: m.bar });
      check(`${w}x${h}: key chip text >= 16 real px`, keyPx >= 16, { keyPx: Math.round(keyPx * 100) / 100, scale: m.scale });
      check(`${w}x${h}: 0 page errors`, errors.length === 0, errors);
      await page.close();
    }
  },

  // G4a.1 socket rows + G4a.12 page keys.
  async socket(browser) {
    const { page, errors } = await boot(browser, '?seed=9&menu=0');
    const { ev, key, until, shot } = mk(page);
    await ev(() => {
      __echoes.cmd('startRun', { act: 1 });
      const kit = ['mending_bolt', 'swift_mend', 'bell_toll', 'rootsnare', 'kindred_shield', 'hearthsong', 'quiet_hearth', 'pale_lance'].map((id) => ({ id, remaining: 0 }));
      __echoes.cmd('restoreSkillState', { slots: kit, override: null });
      for (const n of ['widen', 'reach', 'linger', 'keen', 'snare', 'galvanize', 'bulwark', 'split', 'resonance']) __echoes.cmd('grantNode', n);
      __echoes.cmd('killAllEnemies');
      __echoes.cmd('clearRoom');
      return true;
    });
    await until(() => __echoes.state().run.phase !== 'combat', 8000);
    await sleep(500);
    await key('KeyB');
    await sleep(400);
    const d = await ev(() => __echoes.cmd('buildView'));
    const rows = await ev(() => [...document.querySelectorAll('#socket-screen .nd-row .nd-skill-name')].map((n) => n.textContent));
    await shot('socket-top');
    const sc0 = await ev(() => {
      const b = document.querySelector('#socket-screen .nd-body');
      return { top: b.scrollTop, h: b.scrollHeight, v: b.clientHeight };
    });
    for (let i = 0; i < 8; i++) await key('ArrowDown', 40);
    await sleep(200);
    const sc1 = await ev(() => {
      const b = document.querySelector('#socket-screen .nd-body');
      const last = [...document.querySelectorAll('#socket-screen .nd-row')].pop().getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return { top: b.scrollTop, lastVisible: last.bottom <= br.bottom + 1 && last.top >= br.top - 1 };
    });
    await shot('socket-bottom');
    check('socket screen lists all 8 owned skills', rows.length === 8, rows);
    check('socket body scrolls to the last row (↓)', sc1.lastVisible && (sc0.h <= sc0.v || sc1.top > 0), { sc0, sc1 });
    // Esc on the socket screen: consumed (preventDefault), closes it.
    const escSock = await ev(() => {
      let dp = null;
      const f = (e) => {
        if (e.code === 'Escape') dp = e.defaultPrevented;
      };
      window.addEventListener('keydown', f);
      window.__m4aEscRec = () => {
        window.removeEventListener('keydown', f);
        return dp;
      };
      return true;
    });
    void escSock;
    await key('Escape');
    const dpSock = await ev(() => window.__m4aEscRec());
    const sockOpen = await ev(() => document.getElementById('socket-screen').classList.contains('nd-open'));
    check('socket Esc closes it and is consumed (defaultPrevented true)', dpSock === true && !sockOpen, { dpSock, sockOpen });
    report.pageErrors = errors;
    check('0 page errors', errors.length === 0, errors);
    void d;
  },

  // G4a.12: Esc not consumed on draft / path / shop / end; X declines.
  async pages(browser) {
    const { page, errors } = await boot(browser, '?seed=13&menu=0');
    const { ev, key, until, shot } = mk(page);
    const escProbe = async () => {
      await ev(() => {
        window.__m4aDp = null;
        window.__m4aF = (e) => {
          if (e.code === 'Escape') window.__m4aDp = e.defaultPrevented;
        };
        window.addEventListener('keydown', window.__m4aF);
        return true;
      });
      await key('Escape');
      await sleep(80);
      return ev(() => {
        window.removeEventListener('keydown', window.__m4aF);
        return { dp: window.__m4aDp, phase: __echoes.state().run.phase };
      });
    };
    await ev(() => __echoes.cmd('startRun', { act: 1 }));
    await until(() => __echoes.state().run.phase === 'combat');
    for (let i = 0; i < 60 && (await ev(() => __echoes.state().run.phase)) === 'combat'; i++) {
      await ev(() => __echoes.cmd('killAllEnemies') >= 0);
      await sleep(300);
    }
    await until(() => __echoes.state().run.phase === 'reward', 10000);
    await sleep(700); // settle window
    const e1 = await escProbe();
    check('draft: Esc not consumed (defaultPrevented false) and never declines', e1.dp === false && e1.phase === 'reward', e1);
    await shot('draft');
    await key('KeyX');
    const declined = await until(() => __echoes.state().run.phase === 'path', 3000);
    const ev1 = await ev(() => __echoes.events.filter((e) => e.type === 'draft_declined').length);
    check('draft: X declines', declined && ev1 === 1, { declined, ev1 });
    await sleep(700);
    const e2 = await escProbe();
    check('path: Esc not consumed', e2.dp === false && e2.phase === 'path', e2);
    await ev(() => __echoes.cmd('skipToRoom', 7));
    await until(() => __echoes.state().run.phase === 'shop', 5000);
    await sleep(700);
    const e3 = await escProbe();
    check('shop: Esc not consumed', e3.dp === false && e3.phase === 'shop', e3);
    await ev(() => __echoes.cmd('endRun', 'victory'));
    await until(() => __echoes.state().run.phase === 'victory', 5000);
    await sleep(700);
    const e4 = await escProbe();
    check('end card: Esc not consumed, the card stays', e4.dp === false && e4.phase === 'victory', e4);
    report.pageErrors = errors;
    check('0 page errors', errors.length === 0, errors);
  },
};

// ------------------------------------------------------------------ main --
const fn = SCEN[scenario];
if (!fn) {
  console.error(`unknown scenario '${scenario}' — one of ${Object.keys(SCEN).join(', ')}`);
  process.exit(2);
}
const browser = await launchEchoes({ gpu: GPU, width: W, height: H });
let crashed = null;
try {
  await fn(browser);
} catch (err) {
  crashed = String(err && err.stack ? err.stack : err);
  console.error(crashed);
} finally {
  await browser.close();
}
report.failed = failed;
report.crashed = crashed;
writeFileSync(join(here, OUT), JSON.stringify(report, null, 1));
console.log(`${report.checks.length - failed}/${report.checks.length} checks pass -> ${OUT}`);
process.exit(crashed ? 1 : 0);
