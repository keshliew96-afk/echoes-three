// gntM5a — Node network bots for tools/gnt-M5a-netbench.mjs (and any probe).
// READ-ONLY for other keys (import it, never edit it).
//
//   import { createGuestBot, createSimHostBot } from './gntM5a-botlib.mjs';
//   const g = createGuestBot({ server, name, cond });      // a Node WebSocket guest
//   await g.net.join(code); await g.net.setReady(true);
//   const h = createSimHostBot({ server, name, act, seed }); // runs the REAL sim headless
//   await h.net.host({ visibility: 'private' }); … await h.net.start();
//
// Both use src/net/lobbyClient.js — the exact client the browser runs — over
// Node's built-in WebSocket. A sim host bot builds the sim like main.js
// (reseedable RNG handle with getState/setState, registry, bus, clock, world,
// M4a's autopilot playing seat 0), steps it in real time at 60 Hz and hands
// the network client M2's complete state capture (src/save/capture.js) —
// the same tree a browser host streams.
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(resolve(here, p)).href;

const { createNetClient } = await import(u('src/net/lobbyClient.js'));
const { VERSION } = await import(u('src/version.js'));

export function createGuestBot({ server, name = 'bot', cond = null, version = VERSION } = {}) {
  const net = createNetClient({ params: { net: server, netName: name, netCond: cond }, version, autoStart: false, probeStream: true });
  return { kind: 'bot', role: 'guest', name, net, stop: () => net.disconnect() };
}

export async function createSimHostBot({ server, name = 'bot-host', cond = null, act = 1, room = 1, seed = 11, version = VERSION } = {}) {
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
  let createStateIO = null;
  if (existsSync(resolve(here, 'src/save/capture.js'))) ({ createStateIO } = await import(u('src/save/capture.js')));
  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() { return impl.seed; },
    get drawIndex() { return impl.drawIndex; },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => { impl = createGameplayRng(s >>> 0); return impl.seed; },
    getState: () => impl.getState(),
    setState: (st) => { impl = createGameplayRng(st.seed >>> 0); return impl.setState(st); },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const ap = world.runSystem().autopilot;
  const step = (t) => {
    const s = emptySnapshot();
    world.step(t, ap && ap.active() ? ap.intents(t, s) : s);
  };
  const io = createStateIO && typeof world.saveState === 'function' ? createStateIO({ clock, rng, registry, world }) : null;
  const capture = io
    ? () => io.capture()
    : () => structuredClone({ v: 0, clock: { tick: clock.tick }, rng: { seed: rng.seed, draws: rng.drawIndex }, registry: { nextOrdinal: registry.nextOrdinal, entities: registry.all() }, world: world.snapshotState() });
  const net = createNetClient({ params: { net: server, netName: name, netCond: cond }, version, autoStart: false, probeStream: true, clock, bus, capture, captureIsPrivate: true });
  let timer = null;
  let last = performance.now();
  function startRun() {
    world.cmd('startRun', { act });
    world.cmd('autopilot', true);
    if (room > 1) world.cmd('skipToRoom', room);
  }
  function run() {
    startRun();
    last = performance.now();
    timer = setInterval(() => {
      const t = performance.now();
      clock.advance(t - last, step);
      last = t;
      const v = world.runSystem().view();
      if (!v.active) startRun(); // run ended (victory / defeat): keep the corpus in combat
    }, 1000 / 60);
  }
  return {
    kind: 'bot',
    role: 'host',
    name,
    net,
    world,
    clock,
    run,
    treeKind: io ? 'save.capture' : 'composite',
    stop() {
      if (timer) clearInterval(timer);
      net.disconnect();
    },
  };
}

// openEchoesWindow(browser, url, { width, height, timeout }) — like
// tools/gnt-arch-browser.mjs openEchoes(), but the page gets ITS OWN browser
// window (CDP Target.createTarget { newWindow: true }). Measured here at
// v0.5.25: pages opened as TABS of one window are `document.visibilityState
// === 'hidden'` except the front one and requestAnimationFrame stops there
// (1 frame in 2.5 s) even with the multi-page background flags, so their sim
// (driven by rAF) freezes; separate windows are all visible (168 rAF/s each).
// Every multi-client harness must open its pages this way.
export async function openEchoesWindow(browser, url, { width = 1600, height = 900, timeout = 180000 } = {}) {
  const session = await browser.target().createCDPSession();
  const { targetId } = await session.send('Target.createTarget', { url: 'about:blank', newWindow: true });
  await session.detach().catch(() => {});
  const target = await browser.waitForTarget((t) => t._targetId === targetId, { timeout: 30000 });
  const page = await target.page();
  const errors = [];
  const consoleLines = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
  } catch {
    /* headful windows keep their own size */
  }
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForFunction(() => !!window.__echoes && window.__echoes.tick >= 0, { timeout });
  return { page, errors, consoleLines };
}
