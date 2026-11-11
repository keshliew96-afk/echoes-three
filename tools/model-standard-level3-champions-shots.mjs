#!/usr/bin/env node
// MODEL STANDARD, LEVEL III CHAMPIONS: shots (docs/MODEL_STANDARD.md "Level
// III champions"). Against `npm run dev` (port 5199): the Bone Reeve and the
// Gravebell Ringer in the model lab (showcase, each ability's key phases held
// Still, the classic twin beside, play zoom, a walk), then each in its own
// crown room on the Ashen Barrow floor at play zoom in a busy fight, faceted
// The sim stays frozen between beats (a thaw on a 1 fps
// machine replays the wall-clock as ticks).
//
//   node tools/model-standard-level3-champions-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--only gravebell_ringer] [--lab 0|1] [--game 0|1]
// Linux cloud: PUPPETEER_EXECUTABLE_PATH=.../chrome and
// ECHOES_CHROME_ARGS="--no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader".
// Software GL runs at 1 to 25 fps: every shot waits on lab or sim state, not time.
import { mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer';

const argv = process.argv.slice(2);
const opt = (k, d = null) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const URL0 = opt('url', 'http://127.0.0.1:5199/');
const SHOTS = opt('shots', 'captures/model-standard-level3-champions');
const ONLY = opt('only', null);
const LAB = opt('lab', '1') !== '0';
const GAME = opt('game', '1') !== '0';
mkdirSync(SHOTS, { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 600000,
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1280,800', ...extra],
});
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Each model's lab shots: [name, patch]. A Still shot names the ability and a
// phase; the tool holds the phase's middle (or `at` of the way through it).
const LAB_SHOTS = {
  bone_reeve: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['sweep-draw', { ability: 'sweep', phase: 'draw', at: 0.95 }],
    ['sweep-swing', { ability: 'sweep', phase: 'hold', at: 0.5 }],
    ['sweep-settle', { ability: 'sweep', phase: 'settle', at: 0.55 }],
    ['lance-raise', { ability: 'lance', phase: 'raise', at: 0.95 }],
    ['lance-drive', { ability: 'lance', phase: 'hold', at: 0.5 }],
    ['lance-settle', { ability: 'lance', phase: 'settle', at: 0.55 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 90 }],
    ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
    ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
  ],
  gravebell_ringer: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['knell-heave', { ability: 'knell', phase: 'heave', at: 0.9 }],
    ['knell-toll', { ability: 'knell', phase: 'hold', at: 0.5 }],
    ['knell-settle', { ability: 'knell', phase: 'settle', at: 0.4 }],
    ['call-lift', { ability: 'call', phase: 'lift', at: 0.95 }],
    ['call-slam', { ability: 'call', phase: 'hold', at: 0.5 }],
    ['call-settle', { ability: 'call', phase: 'settle', at: 0.55 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 90 }],
    ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
    ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
  ],
};

async function labShots(model) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${model}: ${String(e && e.message ? e.message : e)}`));
  await page.goto(`${URL0}?modellab=1&model=${model}&turn=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.cmd, { timeout: 300000, polling: 500 });
  const lab = (patch) => page.evaluate((p) => window.__echoes.cmd('lab', p), patch);
  // n rendered frames (the lab draws one per animation frame)
  const frames = (n) =>
    page.evaluate(
      (n) =>
        new Promise((res) => {
          let k = 0;
          const f = () => (++k >= n ? res() : requestAnimationFrame(f));
          requestAnimationFrame(f);
        }),
      n
    );
  await frames(3);
  for (const [name, p] of LAB_SHOTS[model] || []) {
    const base = { view: 'showcase', classic: false, turntable: false, azimuth: 0.7, rate: 1 };
    if (p.ability) {
      // walk the ability up to the phase forward at ~60 Hz in small Still steps,
      // so the locked feet see the motion that leads into the pose
      const st = await lab({ ...base, model, ability: p.ability, mode: 'still', t: 0 });
      let target = st.duration * 0.5;
      let acc = 0;
      for (const [id, dur] of st.phases) {
        if (id === p.phase) {
          target = acc + dur * (p.at ?? 0.5);
          break;
        }
        acc += dur;
      }
      // the lab steps 1/60 s per drawn frame, so the run-up is 60 Hz motion
      await lab({ mode: 'ability', t: 0, rate: 1, ability: p.ability, fixedDt: 1 / 60 });
      await page.waitForFunction((tt) => window.__echoes.cmd('lab', {}).t >= tt, { timeout: 300000, polling: 'raf' }, Math.max(0, target - 1 / 60));
      await lab({ mode: 'still', t: target, fixedDt: 0 });
    } else {
      await lab({ ...base, ...p, model, frames: undefined, fixedDt: 1 / 60 });
    }
    await frames(p.frames || 4);
    await page.screenshot({ path: `${SHOTS}/${model}-${name}.png` });
    const st = await lab({});
    console.log(`shot ${model}-${name}  ${st.readout}`);
  }
  await page.close();
}

// --- In the game: each champion in its own crown room (Level III), the party
// on the autopilot so the fight is busy, shot as each move fires; the same
// (The classic twin and `?facet=0` were retired, AUDIT.md D1.)
const LEADER = { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true };
// [name, predicate on the champion view `b` (and the tick before, `p`),
// rendered frames to wait once it holds, the party's distance before it]. The
// sim is frozen and stepped a tick at a time until the predicate holds.
const GAME_SHOTS = {
  bone_reeve: [
    ['sweep-draw', "b.move === 'reaping_sweep' && b.telK > 0.85", 1, 2.0],
    ['sweep-swing', "p && p.move === 'reaping_sweep' && !b.tel", 1, null],
    ['lance-raise', "b.move === 'grave_lance' && b.telK > 0.85", 1, 5.0],
    ['lance-drive', "p && p.move === 'grave_lance' && !b.tel", 1, null],
  ],
  gravebell_ringer: [
    ['knell-heave', "b.move === 'death_knell' && b.telK > 0.85", 1, 2.6],
    ['knell-toll', "p && p.move === 'death_knell' && !b.tel", 1, null],
    ['call-lift', "b.move === 'grave_call' && b.telK > 0.85", 1, 5.0],
    ['call-slam', "p && p.move === 'grave_call' && !b.tel", 1, null],
  ],
};
async function gameShots(kind, facet) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${kind}${facet ? '' : ' classic'}: ${String(e && e.message ? e.message : e)}`));
  await page.goto(`${URL0}?seed=5&tips=0&story=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  const run = () => cmd('runState');
  const untilPhase = async (p, n = null) => {
    for (let i = 0; i < 600; i++) {
      const v = await run();
      if (v.phase === p && (n === null || v.room === n)) return v;
      await sleep(150);
    }
    return run();
  };
  const frames = (n) =>
    page.evaluate(
      (n) =>
        new Promise((res) => {
          let k = 0;
          const f = () => (++k >= n ? res() : requestAnimationFrame(f));
          requestAnimationFrame(f);
        }),
      n
    );
  // step the frozen sim until the predicate holds (or `max` ticks pass)
  const stepUntil = (src, max) =>
    page.evaluate(
      (src, max, k) => {
        const E = window.__echoes;
        const view = () => {
          const e = E.content.world().entities().find((x) => x.kind === k);
          if (!e) return null;
          const t = e.telegraph;
          const span = t ? Math.max(1, t.resolveTick - t.startTick) : 1;
          return { x: e.x, z: e.z, hp: e.hp, mode: e.mode ?? null, tel: !!t, move: t ? t.move ?? null : null, telK: t ? (E.tick - t.startTick) / span : 0, charge: !!e.charge, flight: !!e.flight };
        };
        const pred = new Function('b', 'p', `return (${src});`);
        // a move is live: the boss layer must see each tick of it rendered,
        // or its rig starts the wind-up late (and the shot shows another moment)
        const live = (b) => b.tel || b.charge || b.flight;
        E.sim.freeze();
        let prev = view();
        let n = 0;
        return new Promise((res) => {
          const frame = () => {
            // quiet ticks run in a batch; a live move steps one tick a frame
            for (let k = 0; k < 30; k++) {
              for (const e of E.content.world().entities()) if (e.faction === 'party' && e.hp > 0) e.hp = e.maxHp ?? e.hp;
              E.sim.stepN(1);
              n++;
              const b = view();
              if (!b) return res(null);
              if (pred(b, prev)) return res(b);
              prev = b;
              if (n >= max) return res(null);
              if (live(b)) break;
            }
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        });
      },
      src,
      max,
      kind
    );
  // game shots carry their own prefix: lab stills share some of the names
  const tag = facet ? '-game' : '-game-classic';
  const v0 = await run();
  if (v0.active) await cmd('abandonRun', 'quit');
  await cmd('startCampaign', { level: 3 });
  await untilPhase('combat');
  await cmd('championPick', kind);
  await cmd('crownDoor', 1);
  // through the rooms to the doors, the crown door among them
  let v = await run();
  for (let i = 0; i < 60 && v.phase !== 'path'; i++) {
    if (v.phase === 'combat') await cmd('clearRoom');
    else if (v.phase === 'reward') {
      await cmd('draftDecline');
      // the socket screen may follow a draft; Escape anywhere else pauses
      const socket = await page.evaluate(() => {
        const el = document.getElementById('socket-screen');
        return !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && Number(getComputedStyle(el).opacity) > 0;
      });
      if (socket) await page.keyboard.press('Escape');
    } else if (v.phase === 'relic') await cmd('relicChoose', 0);
    await sleep(500);
    v = await run();
  }
  const side = v.phase === 'path' ? v.path.options.findIndex((o) => o.champion) : -1;
  if (side < 0) {
    console.log(`miss ${kind}: no crown door (${v.phase})`);
    await page.close();
    return;
  }
  await cmd('pathChoose', side);
  // the fade into the crown room runs on sim ticks: minutes on software GL
  await page.waitForFunction(() => { const r = window.__echoes.state().room; return !!(r && r.champion && r.champion.spawned); }, { timeout: 900000, polling: 500 });
  const champ = () => page.evaluate(() => {
    const st = window.__echoes.state();
    const c = st.room && st.room.champion;
    const e = c && (st.enemies || []).find((x) => x.id === c.id);
    return e ? { x: e.x, z: e.z } : null;
  });
  const near = async (d) => {
    const c = await champ();
    if (c && d !== null) await cmd('teleport', c.x, c.z + d);
  };
  await cmd('autopilot', LEADER);
  await sleep(2500);
  await page.screenshot({ path: `${SHOTS}/${kind}-room${tag}.png` });
  console.log(`shot ${kind}-room${tag}`);
  for (const [name, pred, wait, dist] of GAME_SHOTS[kind] || []) {
    await near(dist);
    const hit = await stepUntil(pred, 60 * 60);
    if (!hit) {
      console.log(`miss ${kind}-${name}${tag}`);
      continue;
    }
    await frames(wait + 1);
    await page.screenshot({ path: `${SHOTS}/${kind}-${name}${tag}.png` });
    console.log(`shot ${kind}-${name}${tag}  ${JSON.stringify(hit)}`);
  }
  await page.evaluate(() => window.__echoes.sim.thaw());
  await page.close();
}

if (LAB) for (const model of Object.keys(LAB_SHOTS)) if (!ONLY || ONLY === model) await labShots(model);
if (GAME)
  for (const kind of Object.keys(GAME_SHOTS))
    if (!ONLY || ONLY === kind) {
      await gameShots(kind, true);
    }
await browser.close();
if (errors.length) {
  console.log('page errors:', errors.slice(0, 8));
  process.exit(1);
}
