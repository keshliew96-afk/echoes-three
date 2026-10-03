// gntM5b — a NODE host: the real sim + the real M5b host driver, no browser.
// Owner: M5b.
//
// tools/gntM5a-botlib.mjs's createSimHostBot hosts M5a's PROBE stream; this
// one installs src/net/driver.js as the session driver, so a guest PAGE gets
// exactly what a browser host sends (snapshots, EVENTS batches + the
// unreliable resend, keyframes, CMD answers) and its input is consumed by the
// same jitter buffers, seat model and lag-compensated rewind. It exists so a
// guest's own loop can be measured with the guest as the ONLY rendering page
// on the machine (PLAN §7 G5b.10 "each guest page"), instead of sharing the
// GPU and the browser with a host page.
//
//   const h = await createHostBot({ server, seed: 7, act: 1 });
//   const code = await h.host();            // opens a private room
//   … guests join …
//   await h.start();                        // starts the game (all ready)
//   h.cmd('spawn', 'mantis', 2, 2, { hpMul: 20 });  // the sim, directly
//   h.on('seat_denied', (ev) => …);         // the host's own event bus
//   h.stop();
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const u = (p) => pathToFileURL(resolve(here, p)).href;

export async function createHostBot({ server, name = 'HostBot', seed = 7, act = 1, room = 1, version = null, hz = 60, autopilot = true } = {}) {
  const { createGameplayRng } = await import(u('src/core/rng.js'));
  const { createRegistry } = await import(u('src/core/registry.js'));
  const { createEventBus } = await import(u('src/core/events.js'));
  const { createClock } = await import(u('src/core/clock.js'));
  const { createWorld } = await import(u('src/sim/world.js'));
  const { emptySnapshot } = await import(u('src/core/intents.js'));
  const { createNetClient } = await import(u('src/net/lobbyClient.js'));
  const { createHostDriver } = await import(u('src/net/driver.js'));
  const { VERSION } = await import(u('src/version.js'));
  if (!existsSync(resolve(here, 'src/save/capture.js'))) throw new Error('src/save/capture.js missing (M2)');
  const { createStateIO } = await import(u('src/save/capture.js'));

  let impl = createGameplayRng(seed >>> 0);
  const rng = {
    stream: 'gameplay',
    get seed() {
      return impl.seed;
    },
    get drawIndex() {
      return impl.drawIndex;
    },
    float: () => impl.float(),
    range: (a, b) => impl.range(a, b),
    int: (n) => impl.int(n),
    chance: (p) => impl.chance(p),
    pick: (a) => impl.pick(a),
    reseed: (s) => {
      impl = createGameplayRng(s >>> 0);
      return impl.seed;
    },
    getState: () => impl.getState(),
    setState: (st) => {
      impl = createGameplayRng(st.seed >>> 0);
      return impl.setState(st);
    },
  };
  const registry = createRegistry();
  const bus = createEventBus();
  const clock = createClock();
  const world = createWorld({ rng, registry, events: bus, harness: false, requestHitstop: clock.requestHitstop, room: null });
  const io = createStateIO({ clock, rng, registry, world });
  const capture = () => io.capture();
  const ap = world.runSystem().autopilot;
  const sampleLocal = () => {
    const s = emptySnapshot();
    return ap && ap.active() ? ap.intents(clock.tick, s) : s;
  };
  const log = () => {};
  const net = createNetClient({ params: { net: server, netName: name }, version: version || VERSION, autoStart: false, probeStream: false, clock, bus, capture, captureIsPrivate: true });
  const host = createHostDriver({ net, world, clock, bus, registry, capture, sampleLocal, localSeat: 0, log });
  net.setSessionDriver({ onBinary: (u8) => host.onBinary(u8), onControl: (m) => host.onControl(m) });
  let timer = null;
  let last = performance.now();
  let running = false;
  function beginRun() {
    world.cmd('startRun', { act });
    if (autopilot) world.cmd('autopilot', true);
    if (room > 1) world.cmd('skipToRoom', room);
  }
  function tickLoop() {
    const t = performance.now();
    const dt = t - last;
    last = t;
    clock.advance(dt, (tick) => host.step(tick));
    host.frameEnd(dt);
  }
  net.on('state', () => {
    if (net.state === 'host' && !running) {
      running = true;
      host.start({ migrated: false });
      beginRun();
      last = performance.now();
      timer = setInterval(tickLoop, 1000 / hz);
    }
  });
  return {
    kind: 'host-bot',
    role: 'host',
    name,
    net,
    world,
    clock,
    bus,
    registry,
    driver: host,
    async host(visibility = 'private') {
      const r = await net.host({ visibility });
      if (!r || !r.ok) throw new Error(`host bot could not open a room: ${JSON.stringify(r)}`);
      return r.code;
    },
    async start(seedArg) {
      const r = await net.start(seedArg);
      if (!r || !r.ok) throw new Error(`host bot could not start: ${JSON.stringify(r)}`);
      return r;
    },
    cmd: (...args) => world.cmd(...args),
    state: () => world.snapshotState(),
    party: () => world.snapshotState().party,
    seatId(seat) {
      const m = world.snapshotState().party.find((x) => (x.partyIndex ?? 0) === seat);
      return m ? m.id : null;
    },
    on: (type, fn) => bus.on(type, fn),
    stats: () => host.stats(),
    setLagCompensation(on) {
      host.setLagCompensation(on);
      return on;
    },
    get tick() {
      return clock.tick;
    },
    get playing() {
      return running;
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      try {
        host.stop();
      } catch {
        /* not started */
      }
      net.disconnect();
    },
  };
}
