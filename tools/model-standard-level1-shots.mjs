#!/usr/bin/env node
// MODEL STANDARD, LEVEL I BOSSES AND CHAMPIONS: shots (docs/MODEL_STANDARD.md).
// Against `npm run dev` (port 5199): every Level I model in the model lab
// (showcase, each ability's key phases held Still, the classic twin beside,
// play zoom, a walk), then each boss in its own room at play zoom in a busy
// fight, faceted and `?facet=0`.
//
//   node tools/model-standard-level1-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--only stag] [--lab 0|1] [--game 0|1]
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
const SHOTS = opt('shots', 'captures/model-standard-level1');
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
  // the Barrow Wyrm's re-measure against the [M] checklist
  wyrm: [
    ['breath-hold', { ability: 'breath', phase: 'hold', at: 0.5 }],
    ['breath-recoil', { ability: 'breath', phase: 'pour', at: 0.12 }],
    ['burrow-held', { ability: 'burrow', phase: 'held', at: 0.5 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
  ],
  stag: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['quake-rear', { ability: 'quake', phase: 'rear', at: 0.95 }],
    ['quake-slam', { ability: 'quake', phase: 'hold', at: 0.5 }],
    ['quake-settle', { ability: 'quake', phase: 'settle', at: 0.55 }],
    ['trample-charge', { ability: 'trample', phase: 'charge', at: 0.7 }],
    ['trample-gore', { ability: 'trample', phase: 'gore', at: 0.5 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 40 }],
    ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
    ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
  ],
  thornmother: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['volley-heave', { ability: 'volley', phase: 'hold', at: 0.5 }],
    ['volley-settle', { ability: 'volley', phase: 'settle', at: 0.45 }],
    ['charge-paw', { ability: 'charge', phase: 'paw', at: 0.62 }],
    ['charge-run', { ability: 'charge', phase: 'run', at: 0.5 }],
    ['charge-stop', { ability: 'charge', phase: 'hold', at: 0.5 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 40 }],
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
      await lab({ mode: 'ability', t: 0, rate: 1, ability: p.ability });
      await page.waitForFunction((tt) => window.__echoes.cmd('lab', {}).t >= tt, { timeout: 120000, polling: 16 }, Math.max(0, target - 0.12));
      await lab({ mode: 'still', t: target });
    } else {
      await lab({ ...base, ...p, model, frames: undefined });
    }
    await frames(p.frames || 4);
    await page.screenshot({ path: `${SHOTS}/${model}-${name}.png` });
    const st = await lab({});
    console.log(`shot ${model}-${name}  ${st.readout}`);
  }
  await page.close();
}

// --- In the game: each boss in its own room (Level I, room 8), the party on
// the autopilot so the fight is busy, shot as each ability fires; the same
// fight again with `?facet=0` for the classic twin.
const LEADER = { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true };
// [name, predicate on the boss entity view `b` (and the tick before, `p`),
// rendered frames to wait once it holds]. The sim is frozen and stepped a tick
// at a time until the predicate holds, so a 12-tick lunge is never missed.
const GAME_SHOTS = {
  stag: [
    ['quake-rear', 'b.tel && b.telK > 0.85', 2],
    ['quake-slam', 'p && p.tel && !b.tel', 1],
    ['trample', 'b.lunge > 0 && b.lunge < 10', 1],
  ],
  thornmother: [
    ['volley', 'p && b.nv !== null && p.nv !== null && b.nv > p.nv', 1],
    ['charge-paw', "b.attack === 'charge' && b.telK > 0.75", 1],
    ['charge-run', "p && b.mode === 'charge' && p.mode === 'charge'", 0],
    ['charge-stop', "p && b.mode === 'skid' && p.mode === 'charge'", 1],
  ],
};
async function gameShots(kind, facet) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${kind}${facet ? '' : ' classic'}: ${String(e && e.message ? e.message : e)}`));
  await page.goto(`${URL0}?seed=5&tips=0&story=0${facet ? '' : '&facet=0'}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
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
          return { x: e.x, z: e.z, hp: e.hp, mode: e.mode ?? null, tel: !!t, attack: t ? t.attack ?? null : null, telK: t ? (E.tick - t.startTick) / span : 0, lunge: e.lungeTicksLeft ?? 0, flight: e.flight ?? 0, nv: e.nextVolleyTick ?? null };
        };
        const pred = new Function('b', 'p', `return (${src});`);
        E.sim.freeze();
        let prev = view();
        for (let i = 0; i < max; i++) {
          E.sim.stepN(1);
          const b = view();
          if (!b) return null;
          if (pred(b, prev)) return b;
          prev = b;
        }
        return null;
      },
      src,
      max,
      kind
    );
  const tag = facet ? '' : '-classic';
  const v0 = await run();
  if (v0.active) await cmd('abandonRun', 'quit');
  await cmd('startRun', { act: 1, boss: kind });
  await untilPhase('combat');
  await cmd('skipToRoom', 8, { act: 1 });
  await untilPhase('combat', 8);
  await cmd('autopilot', LEADER);
  await sleep(2500);
  await page.screenshot({ path: `${SHOTS}/${kind}-room${tag}.png` });
  console.log(`shot ${kind}-room${tag}`);
  for (const [name, pred, wait] of GAME_SHOTS[kind] || []) {
    const hit = await stepUntil(pred, 60 * 60);
    if (!hit) {
      console.log(`miss ${kind}-${name}${tag}`);
      await page.evaluate(() => window.__echoes.sim.thaw());
      continue;
    }
    await frames(wait + 1);
    await page.screenshot({ path: `${SHOTS}/${kind}-${name}${tag}.png` });
    console.log(`shot ${kind}-${name}${tag}  ${JSON.stringify(hit)}`);
    // heal the party between beats so the fight goes on
    await page.evaluate(() => {
      const E = window.__echoes;
      for (const e of E.content.world().entities()) if (e.faction === 'player' || e.faction === 'ally') e.hp = e.maxHp ?? e.hp;
      E.sim.thaw();
    });
    await sleep(300);
  }
  await page.close();
}

if (LAB) for (const model of Object.keys(LAB_SHOTS)) if (!ONLY || ONLY === model) await labShots(model);
if (GAME)
  for (const kind of Object.keys(GAME_SHOTS))
    if (!ONLY || ONLY === kind) {
      await gameShots(kind, true);
      await gameShots(kind, false);
    }
await browser.close();
if (errors.length) {
  console.log('page errors:', errors.slice(0, 8));
  process.exit(1);
}
