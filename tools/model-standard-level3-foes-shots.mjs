#!/usr/bin/env node
// MODEL STANDARD, THE LEVEL III FOES: shots (docs/MODEL_STANDARD.md "The
// Level III foes"). Against `npm run dev` (port 5199): each of the nine foes
// in the model lab (showcase, its attack's coil and contact held Still for
// the first blow and the finisher, its own states, the classic twin beside,
// play zoom, a walk), then a Level III fight on the Ashen Barrow floor at
// play zoom with all nine spawned round the party on the autopilot, shot at
// the same sim ticks faceted.
//
//   node tools/model-standard-level3-foes-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--only ram] [--lab 0|1] [--game 0|1]
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
const SHOTS = opt('shots', 'captures/model-standard-level3-foes');
const ONLY = opt('only', null);
const LAB = opt('lab', '1') !== '0';
const GAME = opt('game', '1') !== '0';
mkdirSync(`${SHOTS}/lab`, { recursive: true });
mkdirSync(`${SHOTS}/fight`, { recursive: true });
const extra = (process.env.ECHOES_CHROME_ARGS || '').split(/\s+/).filter(Boolean);
const browser = await puppeteer.launch({
  headless: true,
  protocolTimeout: 900000,
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  args: ['--disable-dev-shm-usage', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--window-size=1280,800', ...extra],
});
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Each foe's lab shots: [name, patch]. A Still shot names the ability and a
// time on its timeline (s).
const strike = (ab, coil, contact) => [
  [`${ab}-coil`, { ability: ab, t: coil }],
  [`${ab}-contact`, { ability: ab, t: contact }],
];
const LAB_SHOTS = {
  ram: [...strike('slam', 0.88, 1.0), ['heave-coil', { ability: 'slams', t: 4.15 }], ['heave-contact', { ability: 'slams', t: 4.27 }]],
  mole: [['burrowed', { ability: 'emerge', t: 0.3 }], ...strike('emerge', 0.9, 1.0), ['leap-contact', { ability: 'emerges', t: 4.37 }], ['dig-rake', { ability: 'dig', t: 0.35 }]],
  crow: [...strike('caw', 0.62, 0.75), ['fan-coil', { ability: 'caws', t: 3.4 }], ['fan-contact', { ability: 'caws', t: 3.52 }]],
  brood: [['fang-contact', { ability: 'bites', t: 0.08 }], ['pounce-coil', { ability: 'bites', t: 1.85 }], ['pounce-contact', { ability: 'bites', t: 2.0 }]],
  broodling: [['fang-contact', { ability: 'bites', t: 0.08 }], ['pounce-contact', { ability: 'bites', t: 1.5 }]],
  gravewisp: [['gather', { ability: 'ward', t: 0.02 }], ['cast', { ability: 'ward', t: 0.1 }], ['warding', { ability: 'ward', t: 0.6 }], ['snap', { ability: 'snap', t: 0.1 }]],
  knight: [...strike('slam', 0.98, 1.1), ['cross-contact', { ability: 'slams', t: 3.42 }], ['drive-coil', { ability: 'slams', t: 5.6 }], ['drive-contact', { ability: 'slams', t: 5.73 }]],
  keener: [...strike('wail', 0.78, 0.9), ['lament-coil', { ability: 'wails', t: 2.2 }], ['dirge-coil', { ability: 'wails', t: 3.65 }], ['dirge-contact', { ability: 'wails', t: 3.77 }]],
  sexton: [['kneel', { ability: 'dig', t: 0.12 }], ['chop-right', { ability: 'dig', t: 0.24 }], ['stamp', { ability: 'dig', t: 0.56 }], ['bury', { ability: 'dig', t: 0.66 }]],
};
const COMMON = [
  ['idle', { mode: 'idle', azimuth: 0.7 }],
  ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 90 }],
  ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
  ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
];

async function labShots(model) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${model}: ${String(e && e.message ? e.message : e)}`));
  await page.goto(`${URL0}?modellab=1&model=${model}&turn=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && !!window.__echoes.cmd, { timeout: 300000, polling: 500 });
  const lab = (patch) => page.evaluate((p) => window.__echoes.cmd('lab', p), patch);
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
  for (const [name, p] of [...COMMON, ...(LAB_SHOTS[model] || [])]) {
    const base = { view: 'showcase', classic: false, turntable: false, azimuth: 0.7, rate: 1 };
    if (p.ability) {
      // run the ability up to the moment at 60 Hz, then hold it Still
      await lab({ ...base, model, ability: p.ability, mode: 'ability', t: 0, fixedDt: 1 / 60, classic: true });
      await page.waitForFunction((tt) => window.__echoes.cmd('lab', {}).t >= tt, { timeout: 600000, polling: 'raf' }, Math.max(0, p.t - 1 / 60));
      await lab({ mode: 'still', t: p.t, fixedDt: 0 });
    } else await lab({ ...base, ...p, model, frames: undefined, fixedDt: 1 / 60 });
    await frames(p.frames || 4);
    await page.screenshot({ path: `${SHOTS}/lab/${model}-${name}.png` });
    const st = await lab({});
    console.log(`shot ${model}-${name}  ${st.readout}`);
  }
  await page.close();
}

// --- The fight: Level III's first room, the nine spawned in a ring round the
// party (sturdy, so the fight lasts), the party on the autopilot; the sim
// frozen and stepped so the faceted and the classic runs shoot the same ticks.
const KINDS = ['ram', 'mole', 'crow', 'brood', 'broodling', 'gravewisp', 'knight', 'keener', 'sexton'];
const AT = [90, 180, 270, 360, 450, 540];
const LEADER = { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true };
async function fight(facet) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`fight${facet ? '' : ' classic'}: ${String(e && e.message ? e.message : e)}`));
  await page.goto(`${URL0}?seed=7&tips=0&story=0`, { waitUntil: 'domcontentloaded', timeout: 300000 });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick > 60, { timeout: 300000, polling: 500 });
  const cmd = (name, ...args) => page.evaluate((n, a) => window.__echoes.cmd(n, ...a), name, args);
  const run = () => cmd('runState');
  const v0 = await run();
  if (v0.active) await cmd('abandonRun', 'quit');
  await cmd('startCampaign', { level: 3 });
  for (let i = 0; i < 600; i++) {
    const v = await run();
    if (v.phase === 'combat') break;
    await sleep(200);
  }
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
  await page.evaluate((kinds) => {
    const E = window.__echoes;
    E.sim.freeze();
    const p = E.content.world().player;
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * Math.PI * 2;
      E.cmd('spawn', k, p.x + Math.sin(a) * 3.2, p.z + Math.cos(a) * 3.2, { hpMul: 30 });
    });
  }, KINDS);
  await cmd('autopilot', LEADER);
  let done = 0;
  for (const [i, at] of AT.entries()) {
    // step to the tick, a few a frame so the layers see the motion
    await page.evaluate(
      (n) =>
        new Promise((res) => {
          const E = window.__echoes;
          let left = n;
          const f = () => {
            const k = Math.min(3, left);
            E.sim.stepN(k);
            left -= k;
            // the party stays up so the fight goes on
            for (const e of E.content.world().entities()) if ((e.faction === 'player' || e.faction === 'ally') && e.hp < e.maxHp * 0.5) e.hp = e.maxHp;
            if (left <= 0) res();
            else requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        }),
      at - done
    );
    done = at;
    await frames(2);
    await page.screenshot({ path: `${SHOTS}/fight/${facet ? 'facet' : 'classic'}-${i}.png` });
    console.log(`shot fight ${facet ? 'facet' : 'classic'}-${i} (tick +${at})`);
  }
  await page.close();
}

if (LAB) for (const model of Object.keys(LAB_SHOTS)) if (!ONLY || ONLY === model) await labShots(model);
if (GAME) {
  await fight(true);
}
await browser.close();
if (errors.length) {
  console.log('page errors:', errors.slice(0, 8));
  process.exit(1);
}
