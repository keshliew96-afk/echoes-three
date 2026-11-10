// The harness debug API, window.__echoes (docs/TESTING.md): probes read the
// sim, the render layers and the services through it and drive the game with
// cmd(). src/main.js builds it in a harness build only (src/app/harness.js);
// a player build keeps just { version }. Nothing here changes the game unless
// a probe calls it.
//
// __echoes.sim (ARCH, PLAN §6.4): deterministic stepping for probes. The
// realtime loop is frozen while a probe steps; stepping uses the scripted
// input generator (src/sim/script.js) or idle input, never the keyboard.
import { VERSION } from '../version.js';
import { bindings } from '../core/bindings.js';
import { rebind, resetControls } from './controls.js';
import { numeralTally, numeralsLive } from '../render/numbers.js';
import { warmupPending, warmupRetained } from '../render/warmup.js';
import { i18nDebug } from '../i18n/index.js';
import { service } from './registry.js';
import { SKILL_SLOTS } from '../core/constants.js';
import { emptySnapshot } from '../core/intents.js';
import { scriptedInput } from '../sim/script.js';
import { hashState, fnv1a64Hex } from '../core/hash.js';
import { canonicalJSON } from '../core/canonical.js';

// ctx: the boot's live objects. sim.isFrozen / sim.setFrozen reach the frame
// loop's freeze flag; fps() the loop's frame rate; fx() the render layers
// (the boss and enemy layers load late, so they are read on each call).
export function createDebugApi(ctx) {
  const { world, bus, clock, registry, rng, seed, stage, toggles, app, input, activeScene } = ctx;
  const { hud, hpbars, runUi, socketScreen, cloudSaves, dailyClient, playClass, fps, fx } = ctx;
  const { isFrozen, setFrozen } = ctx.sim;
  const simInput = (scriptSeed, t) =>
    scriptSeed === null || scriptSeed === undefined ? emptySnapshot() : scriptedInput(scriptSeed, t, { skillSlots: SKILL_SLOTS });
  const safeHash = (v) => {
    try {
      return hashState(v);
    } catch {
      return fnv1a64Hex(JSON.stringify(v));
    }
  };
  function stepN(n, scriptSeed = null) {
    const was = isFrozen();
    setFrozen(true);
    let stepped = 0;
    let guard = 0;
    while (stepped < n && guard < n * 8 + 64) {
      guard += 1;
      if (clock.stepOnce((t) => world.step(t, simInput(scriptSeed, t)))) stepped += 1;
    }
    setFrozen(was);
    return { stepped, tick: clock.tick };
  }
  const simDebug = {
    get frozen() {
      return isFrozen();
    },
    freeze() {
      setFrozen(true);
      return clock.tick;
    },
    thaw() {
      setFrozen(false);
      return clock.tick;
    },
    script: (seed, t) => simInput(seed, t),
    stepN,
    // State hash over the observable snapshot. M2 swaps in the COMPLETE state
    // capture (save schema v1) via service('save').hash when it lands.
    hash: () => {
      const save = service('save');
      return save && typeof save.hash === 'function' ? save.hash() : safeHash(world.snapshotState());
    },
    // trace(n, scriptSeed): step n ticks with scripted input and digest every
    // sim event except `sound` (audio is not sim state). DESTRUCTIVE to the
    // session (the party moves) — a probe, not gameplay.
    trace(n = 600, scriptSeed = 1) {
      const fromTick = clock.tick;
      const evs = [];
      const byType = {};
      const off = bus.on('*', (ev) => {
        if (ev.type === 'sound') return;
        evs.push(ev);
        byType[ev.type] = (byType[ev.type] || 0) + 1;
      });
      let r;
      try {
        r = stepN(n, scriptSeed);
      } finally {
        off();
      }
      let eventsHash;
      try {
        eventsHash = fnv1a64Hex(canonicalJSON(evs));
      } catch {
        eventsHash = fnv1a64Hex(JSON.stringify(evs));
      }
      return {
        fromTick,
        toTick: r.tick,
        stepped: r.stepped,
        stateHash: simDebug.hash(),
        eventsHash,
        eventCount: evs.length,
        byType,
      };
    },
  };

  const api = {
    cloud: () => cloudSaves.debug(),
    daily: () => dailyClient, // docs/DAILY.md: { today, omen, board, last, debug() ... }
    version: VERSION,
    // CLASS SELECT (docs/CLASS_SELECT.md): the class the local player plays.
    playClass: () => playClass.debug(),
    // ATTACK FEEDBACK (docs/HIT_FEEDBACK.md): outgoing numerals per look.
    numerals: () => numeralTally(),
    // THE HIT AND THE KILL: the live numerals (look, held pop, side, tag).
    numeralsLive: () => numeralsLive(),
    i18n: () => i18nDebug(), // docs/I18N.md: { lang, misses, seen }
    tutorial: () => service('tutorial'), // docs/TUTORIAL.md: { startNow, skip, debug() ... }
    story: () => service('story'), // docs/STORY.md: { showPrologue, voice, debug() }
    // CONTROLS (docs/CONTROLS.md): key bindings, the device in use, live input.
    controls: {
      state: () => {
        const nv = world.netView;
        const b = (nv && typeof nv.followTarget === 'function' ? nv.followTarget() : null) || world.player;
        return {
          keys: bindings.all(),
          device: bindings.device,
          input: input.debug(),
          body: b ? { x: b.x, z: b.z } : null,
        };
      },
      rebind: (id, code) => rebind(id, code),
      reset: () => resetControls(),
    },
    // @gnt:DEBUG-API begin — Gauntlet namespaces (PLAN §6.4). Each resolves its
    // module's service lazily, so owners never edit this file for their probes:
    // provide('<name>', impl) with impl.debug = { ... }.
    app: app.debug,
    get content() {
      const c = service('content');
      return c ? (c.debug ?? c) : null;
    },
    // Bus counters (PLAN §3.7 replica bus): simCalls must not grow on a guest,
    // refusedEmits must stay 0.
    get busCounters() {
      return {
        ...bus.counters,
        replica: bus.replica,
        listeners: bus.listenerCount(),
      };
    },
    // CAMPAIGN (GC.6): live subscribers per event type (a leak names itself).
    get busListeners() {
      return bus.listenerCounts();
    },
    // CAMPAIGN (PLAN §12.11): the level manager's probe surface.
    get campaign() {
      const c = service('campaign');
      return c ? (c.debug ?? c) : null;
    },
    // PARTY (PLAN §16.11): the per-character build probe surface — read-only
    // views of the ally seats (1-3; the Healer's build stays content / cmd)
    // plus the party* commands by name (party r5 / r6 minor: was undefined).
    get party() {
      const P = typeof world.partySystem === 'function' ? world.partySystem() : null;
      if (!P) return null;
      return {
        state: () => P.state(),
        view: (seat) => P.view(Number(seat)),
        pools: (seat) => P.pools(Number(seat)),
        verdict: (seat, skill, node) => {
          const b = P.build(Number(seat));
          return b ? b.verdictFor(skill, node) : null;
        },
        arranged: (seat) => P.arranged(Number(seat)),
        aiOrder: (seat) => P.aiOrder(Number(seat)),
        aiLog: () => world.cmd('partyAiLog'),
        oracle: () => ({ pools: P.partyPools(), verdicts: P.partyVerdicts() }),
        cmd: (name, ...args) => {
          const n = String(name);
          return api.cmd(n.startsWith('party') ? n : `party${n.charAt(0).toUpperCase()}${n.slice(1)}`, ...args);
        },
      };
    },
    get settings() {
      const s = service('settings');
      return s
        ? {
            get: (k) => s.get(k),
            set: (k, v) => s.set(k, v, { source: 'api' }),
            reset: (prefix) => s.reset(prefix),
            dump: () => s.snapshot(),
            keys: () => s.keys(),
            persist: () => s.persist(),
            storageKey: s.storageKey,
            loadReport: s.loadReport,
          }
        : null;
    },
    get audio() {
      const a = service('audio');
      return a ? (a.debug ?? a) : null;
    },
    get save() {
      const v = service('save');
      return v ? (v.debug ?? v) : null;
    },
    get net() {
      const n = service('net');
      return n ? (n.debug ?? n) : null;
    },
    sim: simDebug,
    // @gnt:DEBUG-API end
    // HUD probe surface (§17 block): portrait states, cooldown boxes, zone
    // metrics, banner mode and the off-screen threat audit.
    hud: hud ? hud.debug : null,
    hpBars: hpbars ? hpbars.debug : null,
    // Run meta-screen probe surface (run block): active screen, door glyphs,
    // card/plaque boxes, fresh-press key sets.
    runUi: runUi ? runUi.debug : null,
    get tick() {
      return clock.tick;
    },
    get fps() {
      return Math.round(fps() * 10) / 10;
    },
    get entityCount() {
      return registry.count;
    },
    get seed() {
      return rng.seed;
    },
    bootSeed: seed,
    get rngDraws() {
      return rng.drawIndex;
    },
    get events() {
      return bus.buffer();
    },
    // Cumulative §9 pipeline counters (hits/crits/immune/heals/kills) — survive
    // the 200-event ring, for long scripted audits like the 200-hit crit test.
    get stats() {
      return { ...world.stats };
    },
    // Subscribe to live sim events from test scripts (e.g. await the exact hit
    // moment before capturing). Returns the unsubscribe function.
    on: (type, fn) => bus.on(type, fn),
    state: () => {
      const { skillfx, allyfx, techfx, bossfx, enemyfx } = fx();
      return {
        scene: activeScene.name,
        toggles,
        // GL residency (certification block D): three's program / geometry /
        // texture counters plus the warm-up bay, so a leak or a mid-wave compile
        // is a number a probe can read instead of a guess.
        gl: {
          programs: stage.renderer.info.programs ? stage.renderer.info.programs.length : null,
          geometries: stage.renderer.info.memory.geometries,
          textures: stage.renderer.info.memory.textures,
          calls: stage.renderer.info.render.calls,
          triangles: stage.renderer.info.render.triangles,
          warmupPending: warmupPending(),
          warmupRetained: warmupRetained(),
        },
        ...world.snapshotState(),
        ...(activeScene.debugState ? { vfx: activeScene.debugState() } : {}),
        ...(skillfx ? { skillfx: skillfx.debugCounts() } : {}),
        ...(allyfx ? { allyfx: allyfx.debugCounts() } : {}),
        ...(techfx ? { techfx: techfx.debugCounts() } : {}),
        ...(bossfx ? { bossfx: bossfx.debugCounts() } : {}),
        ...(enemyfx ? { enemyfx: enemyfx.debugState() } : {}),
      };
    },
    cmd: (name, ...args) => {
      // UI-level commands route to the socket screen (docs/TESTING.md).
      if (socketScreen && (name === 'openSocket' || name === 'closeSocket')) return socketScreen.cmd(name);
      // Camp-hub commands (camp block): the same entry points the portal press
      // and the run-end handler drive.
      if (activeScene.cmd) {
        const r = activeScene.cmd(name, args);
        if (r !== undefined) return r;
      }
      return world.cmd(name, ...args);
    },
  };
  return api;
}
