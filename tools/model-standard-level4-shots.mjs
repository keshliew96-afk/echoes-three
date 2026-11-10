#!/usr/bin/env node
// MODEL STANDARD, LEVEL IV BOSSES: shots (docs/MODEL_STANDARD.md).
// Against `npm run dev` (port 5199): every Level IV boss in the model lab
// (showcase, each ability's key phases held Still, the classic twin beside,
// play zoom, a walk), then each boss in its own room at play zoom in a busy
// fight, faceted and `?facet=0`.
//
//   node tools/model-standard-level4-shots.mjs [--url http://127.0.0.1:5199/] [--shots dir] [--only cantor] [--lab 0|1] [--game 0|1]
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
const SHOTS = opt('shots', 'captures/model-standard-level4');
const ONLY = opt('only', null);
const NAMES = opt('names', null); // a comma list of game shot names to take (the rest skipped)
const TRACE = opt('trace', '0') === '1'; // relay the page's console (a trace of the boss every 300 ticks)
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
  cantor: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['note-draw', { ability: 'note', phase: 'draw', at: 0.92 }],
    ['note-sing', { ability: 'note', phase: 'hold', at: 0.5 }],
    ['lance-gather', { ability: 'lance', phase: 'gather', at: 0.92 }],
    ['lance-thrust', { ability: 'lance', phase: 'hold', at: 0.5 }],
    ['pulse-swell', { ability: 'pulse', phase: 'swell', at: 0.92 }],
    ['pulse-burst', { ability: 'pulse', phase: 'hold', at: 0.5 }],
    ['step-fold', { ability: 'step', phase: 'fold', at: 0.7 }],
    ['step-rise', { ability: 'step', phase: 'rise', at: 0.55 }],
    ['verse', { ability: 'verse', phase: 'held', at: 0.5 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 90 }],
    ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
    ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
  ],
  colossus: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['fissure-raise', { ability: 'fissure', phase: 'raise', at: 0.92 }],
    ['fissure-slam', { ability: 'fissure', phase: 'hold', at: 0.5 }],
    ['rain-load', { ability: 'rain', phase: 'load', at: 0.95 }],
    ['rain-hurl', { ability: 'rain', phase: 'hold', at: 0.5 }],
    ['burst-swell', { ability: 'burst', phase: 'swell', at: 0.92 }],
    ['burst-burst', { ability: 'burst', phase: 'hold', at: 0.5 }],
    ['burst-spent', { ability: 'burst', phase: 'spent', at: 0.6 }],
    ['rage', { ability: 'rage', phase: 'enraged', at: 0.5 }],
    ['spawn', { ability: 'spawn', phase: 'grow', at: 0.35 }],
    ['walk', { mode: 'move', movePhase: 1.2, view: 'play', frames: 90 }],
    ['classic-beside', { mode: 'idle', classic: true, azimuth: 0.5 }],
    ['play-zoom', { mode: 'idle', view: 'play', classic: true }],
  ],
  veinweaver: [
    ['idle', { mode: 'idle', azimuth: 0.7 }],
    ['bind-spin', { ability: 'bind', phase: 'spin', at: 0.92 }],
    ['bind-cast', { ability: 'bind', phase: 'hold', at: 0.5 }],
    ['bind-draw', { ability: 'bind', phase: 'draw', at: 0.5 }],
    ['slam-rear', { ability: 'slam', phase: 'rear', at: 0.92 }],
    ['slam-flat', { ability: 'slam', phase: 'hold', at: 0.5 }],
    ['brood-load', { ability: 'brood', phase: 'load', at: 0.95 }],
    ['brood-lob', { ability: 'brood', phase: 'hold', at: 0.5 }],
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

// --- In the game: each boss in its own room (Level IV, room 8), the party on
// the autopilot so the fight is busy, shot as each ability fires; the same
// fight again with `?facet=0` for the classic twin.
const LEADER = { seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto', pages: false, leader: true };
// [name, predicate on the boss entity view `b` (and the tick before, `p`),
// rendered frames to wait once it holds]. The sim is frozen and stepped a tick
// at a time until the predicate holds, so a 12-tick lunge is never missed.
const GAME_SHOTS = {
  cantor: [
    ['note', "b.attack === 'note' && b.telK > 0.85", 1],
    ['note-sung', "p && p.attack === 'note' && !b.tel", 1],
    ['lance', "b.attack === 'lance' && b.telK > 0.85", 1],
    // the Echo Step wants the Second Verse (hp under 50 %) and the party crowding it
    ['echo-fold', "p && b.mode === 'fade' && p.mode !== 'fade'", 6, 'hp(0.48)', null, 0.3],
    ['echo-land', "p && b.mode === 'sing' && p.mode === 'fade'", 5, 'back(1.6)', null, 0.3],
    // the Heart Pulse wants the Third Verse (hp under 25 %) and a body inside 3 u
    ['pulse', "b.attack === 'pulse' && b.telK > 0.85", 1, 'hp(0.23)', null, 0.05],
  ],
  colossus: [
    ['fissure-raise', "b.attack === 'fissure' && b.telK > 0.85", 1],
    ['fissure-slam', "p && p.attack === 'fissure' && !b.tel", 1],
    ['rain', "p && b.nr !== null && p.nr !== null && b.nr > p.nr + 60", 5],
    ['burst-swell', "b.attack === 'burst' && b.telK > 0.85", 1, 'back(1.6)'],
    ['spent', "p && b.mode === 'spent' && p.mode !== 'spent'", 8],
  ],
  veinweaver: [
    ['bind-spin', "b.attack === 'bind' && b.telK > 0.85", 1],
    ['bind-cast', "p && p.attack === 'bind' && !b.tel", 1],
    ['slam', "b.attack === 'slam' && b.telK > 0.85", 1, 'back(1.6)'],
    ['brood', "p && b.nb !== null && p.nb !== null && b.nb > p.nb + 60", 5],
  ],
};
async function gameShots(kind, facet) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push(`${kind}${facet ? '' : ' classic'}: ${String(e && e.message ? e.message : e)}`));
  if (TRACE) page.on('console', (m) => console.log('  page:', m.text()));
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
  const stepUntil = (src, max, setup = null, liveSrc = null, floor = 0.55) =>
    page.evaluate(
      (src, max, k, setup, liveSrc, TRACE, floor) => {
        const E = window.__echoes;
        const view = () => {
          const e = E.content.world().entities().find((x) => x.kind === k);
          if (!e) return null;
          const t = e.telegraph;
          const span = t ? Math.max(1, t.resolveTick - t.startTick) : 1;
          return { x: e.x, z: e.z, hp: e.hp, mode: e.mode ?? null, tel: !!t, attack: t ? t.attack ?? null : null, telK: t ? (E.tick - t.startTick) / span : 0, lunge: e.lungeTicksLeft ?? 0, flight: e.flight ?? 0, verse: e.verse ?? 0, nr: e.nextRainTick ?? null, nb: e.nextBroodTick ?? null };
        };
        const pred = new Function('b', 'p', `return (${src});`);
        // a move is live: the boss layer must see each tick of it rendered,
        // or its rig starts the wind-up late (and the shot shows another moment)
        const live = liveSrc ? new Function('b', `return (${liveSrc});`) : (b) => b.tel || (b.mode && b.mode !== 'root' && b.mode !== 'stalk' && b.mode !== 'sing') || b.lunge > 0 || (b.nr !== null && E.tick >= b.nr - 6) || (b.nb !== null && E.tick >= b.nb - 6);
        E.sim.freeze();
        let prev = view();
        let n = 0;
        return new Promise((res) => {
          const frame = () => {
            // quiet ticks run in a batch; a live move steps one tick a frame
            for (let j = 0; j < 30; j++) {
              E.sim.stepN(1);
              n++;
              // the party cannot dodge at 1 fps: keep it alive, so the fight (and the boss) goes on
              for (const e of E.content.world().entities()) {
                if (e.faction === 'party' && e.hp > 0 && e.hp < e.maxHp) e.hp = e.maxHp;
                // and the boss outlives the wait for a late beat (above its second add phase)
                if (e.kind === k && e.hp > 0 && e.hp < e.maxHp * floor) e.hp = Math.round(e.maxHp * (floor + 0.05));
              }
              // a 'back' prep holds: the party is set back again every 20 ticks until the beat
              if (setup && /^back/.test(setup) && n % 20 === 0) window.__msPrep(setup, k);
              const b = view();
              if (TRACE && n % 300 === 0) console.log(`trace n=${n} tick=${E.tick} ${JSON.stringify(b)}`);
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
      kind,
      setup,
      liveSrc,
      TRACE,
      floor
    );
  // game shots carry their own prefix: lab stills share some of the names
  const tag = facet ? '-game' : '-game-classic';
  const v0 = await run();
  if (v0.active) await cmd('abandonRun', 'quit');
  await cmd('startRun', { act: 4, boss: kind });
  await untilPhase('combat');
  await cmd('skipToRoom', 8, { act: 4 });
  await untilPhase('combat', 8);
  await cmd('autopilot', LEADER);
  await sleep(2500);
  await page.screenshot({ path: `${SHOTS}/${kind}-room${tag}.png` });
  console.log(`shot ${kind}-room${tag}`);
  // a shot's prep sets the fight up for a beat the slow party would not reach:
  // hp(f) sets the boss to f of its hp, back(d) sets the party d u from it
  await page.evaluate(() => {
    window.__msPrep = (src, k) => {
        const E = window.__echoes;
        const ents = E.content.world().entities();
        const b = ents.find((x) => x.kind === k);
        if (!b) return;
        const m = /^(\w+)\(([\d.]+)\)$/.exec(src);
        if (!m) return;
        if (m[1] === 'hp') b.hp = Math.round(b.maxHp * Number(m[2]));
        else if (m[1] === 'back') {
          // toward the arena's centre, so nobody is set past a wall (or out
          // of the room: a hero past the edge ends the fight)
          const d = Number(m[2]);
          const l = Math.hypot(b.x, b.z) || 1;
          let i = 0;
          for (const e of ents) {
            if (e.faction !== 'party') continue;
            const a = (i++ - 1.5) * 0.25;
            e.x = b.x - (b.x / l) * d * Math.cos(a) + (b.z / l) * d * Math.sin(a);
            e.z = b.z - (b.z / l) * d * Math.cos(a) - (b.x / l) * d * Math.sin(a);
          }
        }
    };
  });
  const prep = (src) => page.evaluate((src, k) => window.__msPrep(src, k), src, kind);
  for (const [name, pred, wait, setup = null, liveSrc = null, floor = 0.55] of GAME_SHOTS[kind] || []) {
    if (NAMES && !NAMES.split(',').includes(name)) continue;
    if (setup) await prep(setup);
    const hit = await stepUntil(pred, 120 * 60, setup, liveSrc, floor);
    if (!hit) {
      console.log(`miss ${kind}-${name}${tag}  ${JSON.stringify(await page.evaluate((k) => { const e = window.__echoes.content.world().entities().find((x) => x.kind === k); return { boss: e ? { hp: e.hp, mode: e.mode, tel: e.telegraph ? e.telegraph.attack : null, verse: e.verse, nextRain: e.nextRainTick, nextBrood: e.nextBroodTick } : null, tick: window.__echoes.tick, run: window.__echoes.cmd('runState'), kinds: [...new Set(window.__echoes.content.world().entities().map((x) => x.kind))] }; }, kind))}`);
      continue;
    }
    await frames(wait + 1);
    await page.screenshot({ path: `${SHOTS}/${kind}-${name}${tag}.png` });
    console.log(`shot ${kind}-${name}${tag}  ${JSON.stringify(hit)}`);
    // the sim stays frozen between beats: a thaw would run the sim's clock
    // through the wall-clock the stepping took (thousands of ticks at 1 fps)
  }
  await page.evaluate(() => window.__echoes.sim.thaw());
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
