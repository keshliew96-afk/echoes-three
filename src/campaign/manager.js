// LEVEL MANAGER — the presentation half of the linear campaign
// (docs/gauntlet/PLAN.md §12.5; the user's CRITICAL REFACTOR: "trigger a
// brief victory transition screen, automatically load the assets for the
// NEXT sequential level ... and immediately start it"). Owner: CAMPAIGN.
//
// The SIM owns the campaign state machine (src/sim/run.js). This module owns
// everything a level leaves behind in the page and everything the next one
// needs before it may start:
//   - TEARDOWN at every level boundary: exactly one level's dressings stay
//     resident (the arena disposes the rest — geometries, materials, textures
//     no other scene object references; its paint canvases), pooled VFX are
//     returned (particles, kill splats, scorches, damage numerals), the audio
//     engine stops the level's live gameplay voices. Listeners are registered
//     ONCE here at boot — never per level.
//   - PRELOAD under the level-clear card: the arena builds the next level's
//     layouts at 12 ms a frame (paint worker, sliced steps, one texture upload
//     a frame, compileAsync + parked draw); ready(level) = all of them linked.
//   - ADVANCE (host / single player only): the card's own timing is sim
//     ticks; this module calls runSystem().campaignAdvance() once the card is
//     due (or Enter asked for it after its 0.5 s settle) AND the next level is
//     ready — every connected network guest included — or 6 s of wall time
//     have passed since the card appeared (TRANSIT.readyTimeoutMs). The sim's
//     own hardUntilTick (10 s) is the last fallback, so the card can never
//     hang.
//   - PROBES (`__echoes.campaign`): state, unlock truth, the player-facing
//     choose(n), memory snapshots, the transition log (killing blow -> card
//     -> ready -> advance -> first controllable frame, longest frame gap).
import { TRANSIT, CAMPAIGN_LEVELS, FIRST_LEVEL, isLevel, campaignRules } from '../data/campaign.js';
import { flushNumberPools, numberPoolCount, numberPoolCapacity } from '../render/numbers.js';
import { setPumpBudgetOverride } from '../env/biomes/builder.js';

export function createCampaignManager({ world, bus, scene, stage, app, registry, service, runUi = null, isFrozen = () => false, params = null }) {
  const run = () => world.runSystem();
  const sceneCmd = (name, ...args) => (scene && typeof scene.cmd === 'function' ? scene.cmd(name, args) : undefined);
  const net = () => {
    try {
      return service('net');
    } catch {
      return null;
    }
  };
  const isGuest = () => {
    const n = net();
    return !!(n && typeof n.isGuest === 'function' && n.isGuest());
  };
  const isHost = () => {
    const n = net();
    return !!(n && typeof n.isHost === 'function' && n.isHost());
  };

  // ------------------------------------------------------------ residency --
  let resident = null;
  function setResident(level, keepActive = true) {
    resident = level;
    return sceneCmd('levelResidency', level, { keepActive });
  }
  const bootRes = sceneCmd('levelBoot');
  resident = bootRes && Number.isFinite(bootRes.resident) ? bootRes.resident : null;

  function levelStatus(level) {
    const st = sceneCmd('levelStatus', level);
    return st && typeof st === 'object' ? st : { level, ready: true, built: 0, total: 0, pending: [] };
  }

  // Everything level-bound in the page goes (PLAN §12.3 resetPresentation).
  function clearPresentation() {
    const vfx = sceneCmd('levelVfxClear');
    const numerals = flushNumberPools();
    let voices = null;
    try {
      const a = service('audio');
      if (a && typeof a.stopLevelVoices === 'function') voices = a.stopLevelVoices();
    } catch {
      voices = null;
    }
    return { vfx, numerals, voices };
  }

  // ------------------------------------------------------ transition log --
  const transitions = []; // last 20
  let current = null; // the transition in flight (until its first controllable frame)
  let lastDeath = null; // { tick, at } — the killing blow of a clear
  let skipRequested = null; // { source, at }
  let waitedMs = 0; // unpaused wall time the card has been up
  let lastNow = null;
  let reportedReady = null; // guest: the last { level, ready } sent to the host

  bus.on('death', (ev) => {
    lastDeath = { tick: ev.tick, at: performance.now(), kind: ev.kind ?? ev.etype ?? null };
  });

  bus.on('level_clear', (ev) => {
    // Recorded here; the teardown waits for level_transit (same tick) so a
    // final clear (victory -> camp) is handled by run_end instead.
    const t = {
      level: ev.level,
      next: ev.next,
      final: !!ev.final,
      clearTick: ev.tick,
      clearAt: performance.now(),
      killTick: lastDeath ? lastDeath.tick : null,
      killAt: lastDeath ? lastDeath.at : null,
      cardAt: null,
      readyAt: null,
      advanceTick: null,
      advanceAt: null,
      advanceReason: null,
      controllableAt: null,
      killToControlMs: null,
      clearToControlMs: null,
      frames: 0,
      maxGapMs: 0,
      gapsOver250: 0,
      teardown: null,
      waitedMs: 0,
    };
    transitions.push(t);
    if (transitions.length > 20) transitions.shift();
    current = t;
  });

  bus.on('level_transit', (ev) => {
    let t = current;
    if (!t || t.advanceTick !== null || (ev.kind === 'depart' && t.clearTick !== ev.tick)) {
      // A setting-out card (Level-N start) has no clear before it.
      t = { level: null, next: ev.to, final: false, clearTick: ev.tick, clearAt: performance.now(), killTick: null, killAt: null, cardAt: null, readyAt: null, advanceTick: null, advanceAt: null, advanceReason: null, controllableAt: null, killToControlMs: null, clearToControlMs: null, frames: 0, maxGapMs: 0, gapsOver250: 0, teardown: null, waitedMs: 0, kind: ev.kind };
      transitions.push(t);
      if (transitions.length > 20) transitions.shift();
      current = t;
    }
    t.kind = ev.kind;
    t.to = ev.to;
    t.cardAt = performance.now();
    const t0 = performance.now();
    const res = setResident(ev.to, true);
    const cleared = clearPresentation();
    t.teardown = { ms: Math.round((performance.now() - t0) * 10) / 10, residency: res, ...cleared };
    setPumpBudgetOverride(24);
    skipRequested = null;
    waitedMs = 0;
    reportedReady = null;
  });

  bus.on('level_start', (ev) => {
    if (current && current.advanceTick === null) {
      current.advanceTick = ev.tick;
      current.advanceAt = performance.now();
      current.advanceReason = ev.reason ?? null;
      current.waitedMs = Math.round(waitedMs);
    }
    setPumpBudgetOverride(null);
    skipRequested = null;
  });

  // A campaign's Stag room: the next level's floors are painted in the worker
  // now (off the main thread), so its card only builds and uploads.
  bus.on('room_enter', (ev) => {
    if (ev.mode !== 'boss') return;
    const r = run();
    const c = r && r.campaign ? r.campaign() : null;
    if (c && c.active && c.next) sceneCmd('levelPrefetch', c.next);
  });
  // A run starting from camp: its level becomes the resident one (the camp's
  // Level 1, or a harness start elsewhere).
  bus.on('run_start', (ev) => {
    if (Number.isFinite(ev.act)) setResident(ev.act, true);
  });
  // Back to the lobby: Level 1 is the resident level (Begin Run), everything
  // else goes — the arena is hidden in camp, so the active dressing goes too.
  const toCamp = () => {
    setResident(FIRST_LEVEL, false);
    clearPresentation();
    setPumpBudgetOverride(null);
    skipRequested = null;
    waitedMs = 0;
  };
  bus.on('run_end', toCamp);
  bus.on('return_to_camp', toCamp);
  // A load (or a network re-baseline) lands anywhere: resident = the level it
  // is in (the card's next level while a card is up), Level 1 in camp.
  bus.on('state_restored', () => {
    const r = run();
    const v = r ? r.view() : null;
    let level = FIRST_LEVEL;
    current = null;
    skipRequested = null;
    if (v && v.active) {
      const c = r.campaign ? r.campaign() : null;
      level = v.phase === 'transit' && c && c.card ? c.card.to : v.act ?? FIRST_LEVEL;
      if (v.phase === 'transit') {
        setPumpBudgetOverride(24);
        // A load onto the card (GC.9): the card resumes with its remaining
        // time; the probe log gets its own record from here.
        const now = performance.now();
        current = { level: c && c.card ? c.card.from : null, next: level, final: false, clearTick: world.tick, clearAt: now, killTick: null, killAt: null, cardAt: now, readyAt: null, advanceTick: null, advanceAt: null, advanceReason: null, controllableAt: null, killToControlMs: null, clearToControlMs: null, frames: 0, maxGapMs: 0, gapsOver250: 0, teardown: null, waitedMs: 0, kind: c && c.card ? c.card.kind : 'clear', to: level, restored: true };
        transitions.push(current);
        if (transitions.length > 20) transitions.shift();
      } else setPumpBudgetOverride(null);
    } else setPumpBudgetOverride(null);
    setResident(level, true);
    waitedMs = 0;
  });

  // -------------------------------------------------------------- advance --
  function transitionState() {
    const r = run();
    const v = r ? r.view() : null;
    if (v && v.phase === 'transit') {
      const c = r.campaign();
      if (!c || !c.card) return 'card';
      const st = levelStatus(c.card.to);
      return c.card.due && !st.ready ? 'waiting' : 'card';
    }
    if (current && current.advanceTick !== null && current.controllableAt === null) return 'advancing';
    return 'none';
  }

  function guestsReady(level) {
    const n = net();
    if (!n || !isHost() || typeof n.levelReadyAll !== 'function') return true;
    try {
      return !!n.levelReadyAll(level);
    } catch {
      return true;
    }
  }

  function maybeAdvance(dt) {
    const r = run();
    if (!r) return;
    const v = r.view();
    if (v.phase !== 'transit') return;
    const c = r.campaign ? r.campaign() : null;
    if (!c || !c.card) return;
    const st = levelStatus(c.card.to);
    if (current && current.readyAt === null && st.ready) current.readyAt = performance.now();
    if (isGuest()) {
      // A guest follows; it tells the host when it can draw the next level.
      const n = net();
      const key = `${c.card.to}:${st.ready}`;
      if (n && typeof n.reportLevelReady === 'function' && reportedReady !== key) {
        reportedReady = key;
        try {
          n.reportLevelReady(c.card.to, st.ready);
        } catch {
          /* best effort */
        }
      }
      return;
    }
    if (isFrozen()) return; // a probe drives the sim (the autopilot advances it there)
    if (!app || app.state !== 'playing') return;
    if (typeof app.simPaused === 'function' && app.simPaused()) return;
    waitedMs += dt;
    const ready = st.ready && guestsReady(c.card.to);
    const timedOut = waitedMs >= TRANSIT.readyTimeoutMs;
    const wantAuto = c.card.due;
    const wantSkip = !!skipRequested && c.card.canSkip;
    if ((wantAuto || wantSkip) && (ready || timedOut)) {
      const reason = !ready ? 'ready_timeout' : wantSkip && !wantAuto ? `skip_${skipRequested.source}` : 'auto';
      r.campaignAdvance(reason);
    }
  }

  function requestSkip(source = 'enter') {
    if (isGuest()) return { ok: false, reason: 'guest' };
    const r = run();
    const v = r ? r.view() : null;
    if (!v || v.phase !== 'transit') return { ok: false, reason: 'no_card' };
    skipRequested = { source, at: performance.now() };
    return { ok: true };
  }

  // -------------------------------------------------------- per frame --
  function update(now) {
    const dt = lastNow === null ? 16.7 : Math.max(0, Math.min(1000, now - lastNow));
    lastNow = now;
    // Frame pacing across a transition, from the clear to the first
    // controllable frame of the next level (GC.7).
    if (current && current.controllableAt === null && (current.cardAt !== null || current.clearAt !== null)) {
      current.frames += 1;
      if (current.frames > 1) {
        if (dt > current.maxGapMs) current.maxGapMs = Math.round(dt * 10) / 10;
        if (dt > 250) current.gapsOver250 += 1;
        if (dt > 60) {
          const r = run();
          const v = r ? r.view() : null;
          (current.longFrames ||= []).push({ ms: Math.round(dt), phase: v ? v.phase : null, tick: world.tick, sinceClearMs: Math.round(performance.now() - current.clearAt) });
          if (current.longFrames.length > 12) current.longFrames.shift();
        }
      }
    }
    maybeAdvance(dt);
    // First controllable frame of the new level: combat, no run page, no
    // blocking menu.
    if (current && current.advanceAt !== null && current.controllableAt === null) {
      const v = run().view();
      const pageOpen = runUi && typeof runUi.isOpen === 'function' && runUi.isOpen();
      const blocking = app && app.screens && typeof app.screens.isBlocking === 'function' && app.screens.isBlocking();
      if (v.phase === 'combat' && !pageOpen && !blocking) {
        const at = performance.now(); // same clock as clearAt / killAt / advanceAt
        current.controllableAt = at;
        current.clearToControlMs = Math.round(at - current.clearAt);
        current.killToControlMs = current.killAt !== null ? Math.round(at - current.killAt) : null;
        current = null;
      }
    }
    // ?level=N harness boot: a campaign AT level N on the first ticked frame.
    if (autostart && world.tick >= 1 && app && app.state === 'playing') {
      const lv = autostart;
      autostart = null;
      const r = run();
      if (r && !r.isActive()) {
        const challenge = (() => {
          try {
            return service('settings')?.get?.('gameplay.challenge') ?? 'standard';
          } catch {
            return 'standard';
          }
        })();
        r.startCampaign({ level: lv, challenge, depart: lv !== FIRST_LEVEL || !levelStatus(lv).ready, harness: true });
      }
    }
  }
  let autostart = params && Number.isFinite(params.level) && isLevel(params.level) ? params.level : null;

  // -------------------------------------------------------------- probes --
  function unlocked() {
    try {
      const c = service('content');
      return c && typeof c.unlockedActs === 'function' ? c.unlockedActs() : [FIRST_LEVEL];
    } catch {
      return [FIRST_LEVEL];
    }
  }

  function memory() {
    const info = stage && stage.renderer ? stage.renderer.info : null;
    let audio = null;
    try {
      const a = service('audio');
      const d = a && a.debug && typeof a.debug.voices === 'function' ? a.debug.voices() : null;
      audio = d ? { voices: d.active, played: d.played } : null;
    } catch {
      audio = null;
    }
    const vfx = (() => {
      try {
        const c = sceneCmd('levelVfxCounts');
        return c ? { decals: c.decals ?? null, scorches: c.scorches ?? null, particles: c.particles ?? null } : null;
      } catch {
        return null;
      }
    })();
    const residency = sceneCmd('levelResidencyState');
    const pm = typeof performance !== 'undefined' && performance.memory ? performance.memory : null;
    return {
      tick: world.tick,
      level: (() => {
        const r = run();
        const v = r ? r.view() : null;
        return v && v.active ? v.act : null;
      })(),
      phase: run() ? run().view().phase : null,
      gl: info
        ? { geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs ? info.programs.length : null }
        : null,
      heapMB: pm ? Math.round((pm.usedJSHeapSize / 1048576) * 10) / 10 : null,
      entities: registry ? registry.count : null,
      busListeners: typeof bus.listenerCount === 'function' ? bus.listenerCount() : null,
      pools: { ...(vfx || {}), numerals: numberPoolCount(), numeralCapacity: numberPoolCapacity() },
      dom: typeof document !== 'undefined' ? document.getElementsByTagName('*').length : null,
      audio,
      dressings: residency ? residency.dressings : null,
      resident: residency ? residency.resident : resident,
      disposals: residency ? residency.disposals : null,
    };
  }

  // Scene census (GC.6 leak hunting): every unique geometry / material /
  // texture reachable from stage.scene, grouped by the top-level object that
  // owns it (the scene child's name, or its type), so a growth between two
  // equal moments names its owner. Probe only (walks the whole scene).
  function census() {
    const sc = stage && stage.scene ? stage.scene : null;
    if (!sc) return null;
    const geos = new Set();
    const mats = new Set();
    const groups = {};
    for (const top of sc.children) {
      const key = top.name || top.type || 'unnamed';
      const g = groups[key] || (groups[key] = { geometries: 0, objects: 0 });
      top.traverse((o) => {
        g.objects += 1;
        if (o.geometry && !geos.has(o.geometry)) {
          geos.add(o.geometry);
          g.geometries += 1;
        }
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) mats.add(m);
      });
    }
    const info = stage.renderer ? stage.renderer.info.memory : null;
    return { sceneGeometries: geos.size, sceneMaterials: mats.size, gl: info ? { geometries: info.geometries, textures: info.textures } : null, groups };
  }

  // GL geometry tracker (GC.6 leak hunting, probe only): from the moment it
  // is armed, every geometry the renderer starts tracking (three adds a
  // 'dispose' listener at its first upload) is remembered until disposed;
  // offScene() lists the live ones no scene object references — a leak (or a
  // detached pool) names itself by type, name and vertex count.
  let glTracked = null;
  function glTrack() {
    if (glTracked) return { armed: true, size: glTracked.size };
    let proto = null;
    stage.scene.traverse((o) => {
      if (!proto && o.geometry) proto = Object.getPrototypeOf(Object.getPrototypeOf(o.geometry));
    });
    // proto = BufferGeometry.prototype's parent (EventDispatcher.prototype)
    if (!proto || typeof proto.addEventListener !== 'function') return { armed: false };
    glTracked = new Set();
    const add = proto.addEventListener;
    const dispatch = proto.dispatchEvent;
    proto.addEventListener = function (type, fn) {
      if (type === 'dispose' && this && this.isBufferGeometry) glTracked.add(this);
      return add.call(this, type, fn);
    };
    proto.dispatchEvent = function (ev) {
      if (ev && ev.type === 'dispose' && this && this.isBufferGeometry) glTracked.delete(this);
      return dispatch.call(this, ev);
    };
    return { armed: true, size: 0 };
  }
  // Every live tracked geometry keyed by type + parameters (+ scene flag).
  function glAlive() {
    if (!glTracked) return null;
    const inScene = new Set();
    stage.scene.traverse((o) => {
      if (o.geometry) inScene.add(o.geometry);
    });
    const out = {};
    for (const g of glTracked) {
      const pos = g.attributes && g.attributes.position ? g.attributes.position.count : 0;
      const par = g.parameters ? JSON.stringify(g.parameters).replace(/(\.\d{3})\d+/g, '$1') : '';
      const key = `${inScene.has(g) ? 'S' : 'o'}|${g.type}|${g.name || '-'}|${pos}|${par}`;
      out[key] = (out[key] || 0) + 1;
    }
    return out;
  }
  function glOffScene() {
    if (!glTracked) return null;
    const inScene = new Set();
    stage.scene.traverse((o) => {
      if (o.geometry) inScene.add(o.geometry);
    });
    const groups = {};
    let n = 0;
    for (const g of glTracked) {
      if (inScene.has(g)) continue;
      n += 1;
      const pos = g.attributes && g.attributes.position ? g.attributes.position.count : 0;
      const key = `${g.type}:${g.name || '-'}:${pos}`;
      groups[key] = (groups[key] || 0) + 1;
    }
    return { tracked: glTracked.size, offScene: n, groups };
  }

  const snapshots = [];
  function status() {
    const r = run();
    const v = r ? r.view() : null;
    const c = r && r.campaign ? r.campaign() : null;
    const to = v && v.phase === 'transit' && c && c.card ? c.card.to : resident;
    const st = to !== null && to !== undefined ? levelStatus(to) : { ready: true, built: 0, total: 0, pending: [] };
    return { level: to, ready: st.ready, built: st.built, total: st.total, pending: st.pending, waitedMs: Math.round(waitedMs), state: transitionState(), guestsReady: to ? guestsReady(to) : true };
  }

  const debug = {
    state() {
      const r = run();
      const v = r ? r.view() : null;
      const c = r && r.campaign ? r.campaign() : null;
      return {
        active: !!(v && v.active),
        phase: v ? v.phase : null,
        mode: c ? c.mode : null,
        level: c && c.active ? c.level : null,
        startLevel: c ? c.startLevel ?? null : null,
        index: c ? c.index ?? null : null,
        levelsCleared: c ? c.levelsCleared ?? null : null,
        harness: c ? c.harness ?? null : null,
        card: c ? c.card ?? null : null,
        autoReturnInTicks: c ? c.autoReturnInTicks ?? null : null,
        unlocked: unlocked(),
        transitionState: transitionState(),
        ready: status(),
        resident,
      };
    },
    unlocked,
    // Player-facing start (same path as the Level Select's card): refuses a
    // locked level. Only from the camp with nothing else running.
    choose: (n) => sceneCmd('campChoose', n),
    open: () => sceneCmd('campLevels'),
    rules: () => campaignRules(),
    memory,
    snapshot(label = null) {
      const s = { label, at: Math.round(performance.now()), ...memory() };
      snapshots.push(s);
      if (snapshots.length > 60) snapshots.shift();
      return s;
    },
    snapshots: () => snapshots.slice(),
    clearSnapshots: () => {
      snapshots.length = 0;
      return true;
    },
    transitions: () => transitions.map((t) => ({ ...t })),
    census,
    glTrack,
    glOffScene,
    glAlive,
    ready: (level) => levelStatus(level),
    residency: () => sceneCmd('levelResidencyState'),
    // Probe override of the unlock chain (like content.unlock): null restores.
    unlock: (list) => {
      const c = service('content');
      return c && typeof c.unlock === 'function' ? c.unlock(list) : null;
    },
    requestSkip: (source = 'api') => requestSkip(source),
    levels: () => [...CAMPAIGN_LEVELS],
  };

  return { update, requestSkip, status, memory, debug, transitionState, levelStatus };
}
