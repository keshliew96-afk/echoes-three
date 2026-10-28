#!/usr/bin/env node
// MODEL STANDARD, LEVEL II BOSSES: shots (docs/MODEL_STANDARD.md).
// Against `npm run dev` (port 5199): every Level II boss in the model lab
// (showcase, each ability's key phases held Still, the classic twin beside,
// play zoom, a walk), then each boss in its own room at play zoom in a busy
// fight, faceted and `?facet=0`.
//
//   node tools/model-standard-level2-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--only heron] [--lab 0|1] [--game 0|1]
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
const SHOTS = opt('shots', 'captures/model-standard-level2');
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
  heron: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['spear-coil', { ability: 'spear', phase: 'coil', at: 0.92 }],
    ['spear-thrust', { ability: 'spear', phase: 'dash', at: 0.08 }],
    ['spear-dash', { ability: 'spear', phase: 'dash', at: 0.6 }],
    ['spear-land', { ability: 'spear', phase: 'hold', at: 0.5 }],
    ['wingbeat-raise', { ability: 'wingbeat', phase: 'raise', at: 0.9 }],
    ['wingbeat-beat', { ability: 'wingbeat', phase: 'hold', at: 0.5 }],
    ['dive-plunge', { ability: 'dive', phase: 'hold', at: 0.5 }],
    ['dive-under', { ability: 'dive', phase: 'under', at: 0.6 }],
    ['surface-rise', { ability: 'surface', phase: 'rise', at: 0.75 }],
    ['surface-burst', { ability: 'surface', phase: 'hold', at: 0.5 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 90 }],
    ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
    ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
  ],
  millwheel: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['shards-wind', { ability: 'shards', phase: 'wind', at: 0.9 }],
    ['shards-loose', { ability: 'shards', phase: 'hold', at: 0.5 }],
    ['shards-settle', { ability: 'shards', phase: 'settle', at: 0.4 }],
    ['crosscut-rock', { ability: 'crosscut', phase: 'rock', at: 0.95 }],
    ['crosscut-cut', { ability: 'crosscut', phase: 'cut', at: 0.5 }],
    ['crosscut-slam', { ability: 'crosscut', phase: 'hold', at: 0.5 }],
    ['crosscut-dizzy', { ability: 'crosscut', phase: 'dizzy', at: 0.18 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 90 }],
    ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
    ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
  ],
  mireking: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['lash-draw', { ability: 'lash', phase: 'draw', at: 0.92 }],
    ['lash-out', { ability: 'lash', phase: 'hold', at: 0.5 }],
    ['lash-reel', { ability: 'lash', phase: 'reel', at: 0.5 }],
    ['flop-heave', { ability: 'flop', phase: 'heave', at: 0.9 }],
    ['flop-leap', { ability: 'flop', phase: 'leap', at: 0.5 }],
    ['flop-land', { ability: 'flop', phase: 'hold', at: 0.5 }],
    ['swallow-gape', { ability: 'swallow', phase: 'gape', at: 0.9 }],
    ['swallow-snap', { ability: 'swallow', phase: 'hold', at: 0.5 }],
    ['rage', { ability: 'rage', phase: 'enraged', at: 0.5 }],
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

// --- In the game: each boss in its own room (Level I, room 8), the party on
// the autopilot so the fight is busy, shot as each ability fires; the same
// fight again with `?facet=0` for the classic twin.
const LEADER = { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true };
// [name, predicate on the boss entity view `b` (and the tick before, `p`),
// rendered frames to wait once it holds]. The sim is frozen and stepped a tick
// at a time until the predicate holds, so a 12-tick lunge is never missed.
const GAME_SHOTS = {
  heron: [
    ['spear-coil', "b.attack === 'spear' && b.telK > 0.85", 1],
    ['spear-dash', "p && b.mode === 'dash' && p.mode === 'dash'", 0],
    ['wingbeat', "b.attack === 'wingbeat' && b.telK > 0.85", 1],
    // the add phase at 75 %: the party is slow at 1 fps, so the Heron is set just above it
    ['submerged', "p && b.mode === 'submerged' && p.mode !== 'submerged'", 12, 'hp(0.76)'],
    ['surface', "b.attack === 'surface' && b.telK > 0.75", 1],
  ],
  millwheel: [
    ['shards', "b.attack === 'shards' && b.telK > 0.85", 1],
    ['crosscut-rock', "b.attack === 'crosscut' && b.telK > 0.85", 1],
    ['crosscut-cut', "p && b.mode === 'cut' && p.mode === 'cut'", 0],
    ['dizzy', "p && b.mode === 'dizzy' && p.mode === 'cut'", 3],
  ],
  mireking: [
    ['lash-draw', "b.attack === 'lash' && b.telK > 0.85", 1],
    ['lash-out', "p && p.attack === 'lash' && !b.tel", 0],
    // the flop wants its target 3 to 8 u off: the party is set back from the toad
    ['flop-heave', "b.mode === 'heave' && b.telK > 0.6", 1, 'back(5)'],
    ['flop-leap', "p && b.mode === 'flop' && p.mode === 'flop' && b.telK > 0.85", 0],
    ['swallow', "b.attack === 'swallow' && b.telK > 0.85", 1],
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
        // a move is live: the boss layer must see each tick of it rendered,
        // or its rig starts the wind-up late (and the shot shows another moment)
        const live = (b) => b.tel || (b.mode && b.mode !== 'root' && b.mode !== 'stalk' && b.mode !== 'roll' && b.mode !== 'wade') || b.lunge > 0 || (b.nv !== null && E.tick >= b.nv - 6);
        E.sim.freeze();
        let prev = view();
        let n = 0;
        return new Promise((res) => {
          const frame = () => {
            // quiet ticks run in a batch; a live move steps one tick a frame
            for (let k = 0; k < 30; k++) {
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
  await cmd('startRun', { act: 2, boss: kind });
  await untilPhase('combat');
  await cmd('skipToRoom', 8, { act: 2 });
  await untilPhase('combat', 8);
  await cmd('autopilot', LEADER);
  await sleep(2500);
  await page.screenshot({ path: `${SHOTS}/${kind}-room${tag}.png` });
  console.log(`shot ${kind}-room${tag}`);
  // a shot's prep sets the fight up for a beat the slow party would not reach:
  // hp(f) sets the boss to f of its hp, back(d) sets the party d u from it
  const prep = (src) =>
    page.evaluate(
      (src, k) => {
        const E = window.__echoes;
        const ents = E.content.world().entities();
        const b = ents.find((x) => x.kind === k);
        if (!b) return;
        const m = /^(\w+)\(([\d.]+)\)$/.exec(src);
        if (!m) return;
        if (m[1] === 'hp') b.hp = Math.round(b.maxHp * Number(m[2]));
        else if (m[1] === 'back') {
          const d = Number(m[2]);
          for (const e of ents) {
            if (e.faction !== 'player' && e.faction !== 'ally') continue;
            const dx = e.x - b.x;
            const dz = e.z - b.z;
            const l = Math.hypot(dx, dz) || 1;
            e.x = b.x + (dx / l) * d;
            e.z = b.z + (dz / l) * d;
          }
        }
      },
      src,
      kind
    );
  for (const [name, pred, wait, setup = null] of GAME_SHOTS[kind] || []) {
    if (setup) await prep(setup);
    const hit = await stepUntil(pred, 120 * 60);
    if (!hit) {
      console.log(`miss ${kind}-${name}${tag}  ${JSON.stringify(await page.evaluate((k) => { const e = window.__echoes.content.world().entities().find((x) => x.kind === k); return e ? { hp: e.hp, mode: e.mode, tel: e.telegraph ? e.telegraph.attack : null, tick: window.__echoes.tick, nextFlop: e.nextFlopTick, nextSwallow: e.nextSwallowTick } : null; }, kind))}`);
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
