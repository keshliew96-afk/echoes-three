// Network play session (docs/gauntlet/PLAN.md §3.7). Owner: M5b.
//
// The session turns M5a's lobby client into real network play. It watches
// the `net` service's room: when the room starts (in_game) this page becomes
//   HOST  — src/net/driver.js steps the authoritative sim with every human
//           seat's input (main.js's simStep seam is swapped for it), streams
//           snapshots / events / keyframes;
//   GUEST — this file's guest driver: the world goes REPLICA (never stepped,
//           cmd() refuses mutations, the bus replays host events to
//           presentation only), snapshots are decoded, hash-checked and
//           applied on the interpolation clock (net/replica.js), the own seat
//           is predicted and reconciled (net/reconcile.js), own actions are
//           presented on the press frame (net/predict.js + ui/net/cosmetics.js),
//           input frames go to the host at 60 Hz with 6-frame redundancy.
// It also owns everything around that: hidden tabs (guest: away frames on a
// Worker metronome; host: the sim keeps ticking on a 60 Hz metronome),
// reconnect / host-lost / migration (become_host: the keyframe is applied
// with save.apply() and this page becomes the host, seat 0 -> leader bot),
// session loss (every client returns to the title with a message, single-
// player intact), the in-game net HUD, the guest guards (read-only run pages
// and socket, host-only portal) and the per-frame net budget accounting.
//
// Single-player isolation (G5b.8): nothing here touches the tick path until
// a room goes in_game. main.js's simStep stays `(tick) => world.step(tick,
// sampleIntents())`, clock.advance is the clock's own, the bus is never in
// replica mode.
import { BIN, SNAPSHOT_EVERY_TICKS, SIM_HZ } from './protocol/constants.js';
import { createSnapshotClient } from './protocol/snapshot.js';
import { encodeInputPacket, decodeEvents, decodeEventsBundle, decodeCmd, encodeCmd, decodeKeyframe, fromBase64 } from './protocol/codec.js';
import { frameFromSnapshot, seatInputOf, quantAim } from '../sim/netseats.js';
import { moveIndex } from '../sim/remote.js';
import { scriptedInput } from '../sim/script.js';
import { isStunned } from '../sim/status.js';
import { restoreShapes } from '../sim/shapes.js';
import { restoreMovement } from '../sim/movement.js';
import { createHostDriver } from './driver.js';
import { createReplica } from './replica.js';
import { createInterpClock } from './interp.js';
import { createOwnSeat } from './reconcile.js';
import { createActionShadow } from './predict.js';
import { createMetronome } from './metronome.js';
import { seatLabel, seatControlText, chooserSeat } from './seats.js';
import { createCosmetics } from '../ui/net/cosmetics.js';
import { createNetHud } from '../ui/net/hud.js';
import { installUpdatePrompt } from '../ui/net/update.js';
import { validateServerUrl } from './lobbyClient.js';
import { LEGACY_DEFAULT_URL } from './address.js';
import { sanitizeName } from './protocol/messages.js';

const now = () => performance.now();
// A seat plays at most 4 skills (keys 1-4; the user's correction — the
// guest seats' class kits are 4 skills too). Keys 5-8 are unbound.
const GUEST_PRESSES = new Set(['dodge', 'skill_1', 'skill_2', 'skill_3', 'skill_4', 'interact']);
const KEY_OF = { dodge: 'Space', interact: 'KeyE', basic: 'Mouse2' };
for (let i = 1; i <= 4; i++) KEY_OF[`skill_${i}`] = `Digit${i}`;
// (+ CAMPAIGN, PLAN §12.9: a guest can neither start, advance nor abandon a
// campaign — the host drives every level transition.)
const RUN_MUTATORS = new Set(['takeReward', 'declineReward', 'focusPath', 'choosePath', 'buy', 'advanceFromShop', 'returnToCamp', 'startRun', 'endRun', 'startCampaign', 'campaignAdvance', 'abandonRun']);
// M4c: autoFill (the socket screen's F / pad Y) mutates the build too — a guest's
// press becomes the same refused CMD as a socket() (build decisions are the host's).
const BUILD_MUTATORS = new Set(['socket', 'unsocket', 'autoFill', 'grantNode', 'echoArm', 'setResonance', 'attachSkills']);
const INPUT_REDUNDANCY = 6;
const RECONNECT_GIVEUP_MS = 15000;

// First differing path between two plain trees (desync diagnostics).
function firstDiff(a, b, path = '') {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    if (typeof a === 'number' && typeof b === 'number' && Number.isNaN(a) && Number.isNaN(b)) return null;
    return path || '/';
  }
  if (Array.isArray(a) !== Array.isArray(b)) return path || '/';
  if (Array.isArray(a)) {
    if (a.length !== b.length) return `${path}.length`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const k of keys) {
    const d = firstDiff(a[k], b[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

export function createNetSession(ctx) {
  const { net, world, clock, bus, registry, scene, stage, app, sampleIntents, setSimStep, service } = ctx;
  const settings = app.settings;
  // ------------------------------------------------------------ settings --
  settings.register('net.playerName', {
    default: `Mouse${String(Math.floor(Math.random() * 900) + 100)}`,
    validate: (v) => {
      const n = typeof v === 'string' ? sanitizeName(v, '') : '';
      return n ? n : undefined;
    },
  });
  // DEPLOY (PLAN §14.1): '' = automatic — the session server of the site this
  // page came from (?net= and VITE_NET_URL still take precedence as the
  // net client resolves it); a valid ws(s):// address = the player's
  // explicit server. Validation is unchanged (wss:// only on an https page).
  settings.register('net.serverUrl', {
    default: '',
    validate: (v) => {
      if (v === '' || v === null) return '';
      if (typeof v !== 'string') return undefined;
      if (!v.trim()) return '';
      const r = validateServerUrl(v, { https: location.protocol === 'https:' });
      return r.ok ? r.url : undefined;
    },
  });
  // Builds up to v0.5.117 stored their default (ws://127.0.0.1:7800/echoes)
  // in every settings blob, chosen or not. Read once as "automatic" — the
  // site's /echoes reaches that same local server through the dev / preview
  // proxy or `npm run serve` — then marked, so a player who types that exact
  // address later keeps it. In memory only until something else persists.
  settings.register('net.serverUrlV', { default: 0, validate: (v) => (v === 0 || v === 1 ? v : undefined) });
  if (settings.get('net.serverUrlV') !== 1) {
    if (settings.get('net.serverUrl') === LEGACY_DEFAULT_URL) settings.set('net.serverUrl', '', { persist: false, source: 'migrate' });
    settings.set('net.serverUrlV', 1, { persist: false, source: 'migrate' });
  }
  settings.register('net.showStats', { default: false, validate: (v) => (typeof v === 'boolean' ? v : undefined) });
  // The name / server address follow the settings (URL params win for harnesses).
  if (!app.params.netName) net.setName(settings.get('net.playerName'));
  if (!app.params.net) net.serverUrl = settings.get('net.serverUrl');
  settings.subscribe('net.playerName', (v) => net.setName(v));
  settings.subscribe('net.serverUrl', (v) => {
    if (!app.params.net) net.serverUrl = v;
  });

  const logRing = [];
  function log(kind, data = {}) {
    logRing.push({ t: Math.round(now()), kind, ...data });
    if (logRing.length > 300) logRing.shift();
  }
  const listeners = new Set();
  function changed() {
    for (const fn of [...listeners]) {
      try {
        fn(api.status());
      } catch (err) {
        console.warn('[net] session listener threw', err);
      }
    }
  }

  let role = 'none'; // none | host | guest
  let host = null; // host driver
  let guest = null; // guest context
  let hud = null;
  let cosmetics = null;
  const metronome = createMetronome();
  const rawAdvance = clock.advance;
  let advanceWrapped = false;
  let guardsOn = false;
  let autopilotOurs = false;
  let hostLost = null; // { at, graceMs }
  let lastSeatNames = [];
  const pings = [];
  let frameNetGuest = 0;
  const frameStats = { guestNetMs: [], frameOver50Net: 0 };
  let sessionStartedAt = 0;
  let hostHiddenFedMs = 0;
  let hiddenMode = null; // null | 'host' | 'guest' — the hidden-tab loop running now (reconcileHidden)
  let sessionEnding = false;

  // ---------------------------------------------------------- frame clock --
  // Per rendered frame accounting (hostNetMs / frameOver50Net). Runs only
  // while a session is live.
  let rafId = 0;
  let lastRaf = 0;
  let lastRafAt = null; // now() of the last rAF callback: the browser is drawing (render-stall watchdog)
  function rafLoop(t) {
    rafId = requestAnimationFrame(rafLoop);
    lastRafAt = now();
    const dt = lastRaf ? t - lastRaf : 16.7;
    lastRaf = t;
    if (host) host.frameEnd(dt);
    if (guest) {
      frameStats.guestNetMs.push(frameNetGuest);
      if (frameStats.guestNetMs.length > 600) frameStats.guestNetMs.shift();
      if (dt > 50 && frameNetGuest > 10) frameStats.frameOver50Net += 1;
      frameNetGuest = 0;
    }
  }
  function startRaf() {
    if (!rafId && typeof requestAnimationFrame === 'function') {
      lastRaf = 0;
      lastRafAt = null;
      rafId = requestAnimationFrame(rafLoop);
    }
  }
  function stopRaf() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  const localSeat = () => (net.seat === null || net.seat === undefined ? 0 : net.seat);
  const seatEntity = (seat) => (seat === 0 ? world.player : registry.all().find((e) => e.kind === 'ally' && e.partyIndex === seat) || null);
  const nameOfSeat = (i) => {
    const r = net.room;
    const s = r && r.seats ? r.seats.find((x) => x.index === i) : null;
    return s && s.peerId ? s.name : null;
  };

  // ------------------------------------------------------------- guards --
  // A guest's run pages / socket are read-only: every mutating call on the
  // run / build system becomes a CMD to the host (answered command_rejected
  // and shown to everyone as a ping). Presentation reads pass through.
  const rawRunSystem = world.runSystem;
  const rawBuildSystem = world.buildSystem;
  let runProxy = null;
  let buildProxy = null;
  function guardProxy(target, mutators, area) {
    return new Proxy(target, {
      get(t, prop) {
        const v = t[prop];
        if (typeof v === 'function' && mutators.has(prop)) {
          return (...args) => {
            guestPick(area, String(prop), args);
            return false;
          };
        }
        return v;
      },
    });
  }
  function installGuards() {
    if (guardsOn) return;
    guardsOn = true;
    world.setReplica(true);
    bus.setReplica(true);
    runProxy = guardProxy(rawRunSystem(), RUN_MUTATORS, 'run');
    buildProxy = guardProxy(rawBuildSystem(), BUILD_MUTATORS, 'build');
    world.runSystem = () => runProxy;
    world.buildSystem = () => buildProxy;
  }
  function removeGuards() {
    if (!guardsOn) return;
    guardsOn = false;
    world.runSystem = rawRunSystem;
    world.buildSystem = rawBuildSystem;
    world.setReplica(false);
    bus.setReplica(false);
  }
  let cmdSeq = 0;
  function guestPick(area, what, args) {
    if (role !== 'guest') return;
    const run = rawRunSystem();
    const v = run && run.view ? run.view() : null;
    const index = Number.isInteger(args[0]) ? args[0] : null;
    cmdSeq += 1;
    net.transport.sendBinary(encodeCmd(localSeat(), cmdSeq, { kind: what === 'focusPath' ? 'ping' : 'pick', what, area, index, page: v ? v.phase : null }));
    log('guest_pick', { what, index });
  }

  // ------------------------------------------------------- follow + HUD --
  function installPresentation(seat) {
    world.netView = {
      seat,
      role,
      followTarget: () => {
        if (seat === 0) return null;
        const e = seatEntity(seat);
        return e ? e : null;
      },
      skillSlots: () => (guest && guest.shadow.enabled ? guest.shadow.slotsView(guest.seq) : host && seat !== 0 ? hostSeatSlots(seat) : null),
      dodge: () => (guest && guest.shadow.enabled ? guest.shadow.dodgeView(guest.seq) : host && seat !== 0 ? hostSeatDodge(seat) : null),
    };
    world.followSeat = seat === 0 ? null : (alpha) => {
      const e = seatEntity(seat);
      if (!e) return null;
      return { x: e.px + (e.x - e.px) * alpha, z: e.pz + (e.z - e.pz) * alpha, aim: e.aim || null };
    };
    try {
      if (scene && typeof scene.cmd === 'function') scene.cmd('followSeat', [world.followSeat]);
    } catch {
      /* scene without the follow command */
    }
  }
  function removePresentation() {
    world.netView = null;
    world.followSeat = null;
    try {
      if (scene && typeof scene.cmd === 'function') scene.cmd('followSeat', [null]);
    } catch {
      /* ignore */
    }
  }
  // A migrated host playing an ally seat: its tiles come from the live sim.
  function hostSeatSlots(seat) {
    const e = seatEntity(seat);
    const kit = world.allySystem().ALLY_KITS[e ? e.classId : 'tank'];
    if (!e || !kit) return null;
    return kit.map((def, i) => ({ id: def.id, abbrev: def.abbrev, passive: false, remainingTicks: Math.max(0, ((e.cds && e.cds[i]) || 0) - world.tick), totalTicks: Math.max(30, Math.round(def.cd * 60)) }));
  }
  function hostSeatDodge(seat) {
    const e = seatEntity(seat);
    return e ? { remaining: Math.max(0, (e.dodgeReadyTick || 0) - world.tick), total: 72 } : null;
  }

  // ---------------------------------------------------- audio cue hooks --
  // New sim events (a human seat's dodge / denial): spatial dodge whoosh;
  // the deny beep only for the seat that pressed (never the host's Healer).
  let cuesRegistered = false;
  function registerCues() {
    if (cuesRegistered) return;
    const audio = service('audio');
    if (!audio || typeof audio.registerEventCue !== 'function') return;
    cuesRegistered = true;
    audio.registerEventCue('ally_dodge', (ev, h) => {
      const p = ev.id != null && h && h.pos ? h.pos(ev.id) : null;
      return [{ cue: 'dodge', ...(p || {}) }];
    });
    audio.registerEventCue('seat_denied', (ev) => (role !== 'none' && ev.seat === localSeat() ? [{ cue: ev.reason === 'empty_slot' ? 'deny_empty' : 'deny_cd' }] : []));
    // A guest's predicted E press: a short lever-click at the asset on the
    // press frame (the outcome's own cue — drink, bell, sluice — follows
    // from the host). Never for an authoritative interact (single-player and
    // host interacts keep their built-in cues).
    audio.registerEventCue('interact', (ev) => (ev.predicted ? [{ cue: 'm4b_lever', x: ev.x, z: ev.z, pitch: 1.35, gainDb: -4 }] : null));
  }

  // ------------------------------------------------------ clock wrapper --
  let skipNextFrame = false;
  function wrapAdvance(fn) {
    clock.advance = fn;
    advanceWrapped = true;
  }
  function unwrapAdvance() {
    if (!advanceWrapped) return;
    clock.advance = rawAdvance;
    advanceWrapped = false;
  }

  // =============================================================== HOST ==
  // The seat-0 LEADER BOT (PLAN §3.7: M4a's autopilot plays the Healer while
  // no human does — a host that is not seat 0, i.e. after a migration). It
  // plays ONLY while nobody holds the seat: M4a's autopilot replaces the
  // tick's whole seat-0 intent snapshot while it is on (main.js), so a human
  // Healer — the old host accepting "Rejoin", a drop-in — would otherwise
  // send frames the sim never reads (NET3-F1). The host driver reports every
  // seat-0 controller change BEFORE that tick steps; the bot hands the seat
  // over on that very tick and takes it back on a drop / away / leave. While
  // a human plays the Healer the between-room choices are the host's pages
  // (PLAN §3.7 "build decisions belong to the host").
  const LEADER_BOT = Object.freeze({ seat: 0, drafts: 'take', doors: 0, shop: 'cheapest', socket: 'auto' });
  function setLeaderBot(on, tick = clock.tick) {
    const rs = rawRunSystem();
    const ap = rs && rs.autopilot;
    const active = ap && typeof ap.active === 'function' ? ap.active() : autopilotOurs;
    if (on && !active) world.cmd('autopilot', { ...LEADER_BOT });
    else if (!on && active) world.cmd('autopilot', false);
    if (on !== autopilotOurs || on !== active) log('leader_bot', { on, tick });
    autopilotOurs = on;
  }
  function startHost({ migrated = false } = {}) {
    if (role === 'host') return;
    const save = service('save');
    host = createHostDriver({
      net,
      world,
      clock,
      bus,
      registry,
      capture: () => save.capture(),
      sampleLocal: () => sampleIntents(),
      localSeat: localSeat(),
      snapEvery: net.snapshotEveryTicks || SNAPSHOT_EVERY_TICKS,
      log,
      onCmd: (ping) => showPing(ping),
      onPlayerController: (ctrl, tick) => setLeaderBot(ctrl !== 'human', tick),
    });
    role = 'host';
    setSimStep((tick) => host.step(tick));
    wrapAdvance((ms, fn) => {
      if (skipNextFrame) {
        skipNextFrame = false;
        ms = 0;
      }
      return rawAdvance(ms, fn);
    });
    net.setSessionDriver({ onBinary: (u8) => host && host.onBinary(u8), onControl: (m) => onControl(m) });
    host.start({ migrated });
    installPresentation(localSeat());
    if (localSeat() !== 0) setLeaderBot(true, clock.tick);
    startRaf();
    log('host_start', { seat: localSeat(), migrated });
    // A tab already in the background (hidden during the countdown, a
    // migration onto a hidden guest) ticks on the metronome from now on.
    reconcileHidden(migrated ? 'migrated' : 'host_start');
    changed();
  }
  function stopHost() {
    if (!host) return;
    host.stop();
    host = null;
    if (autopilotOurs) {
      world.cmd('autopilot', false);
      autopilotOurs = false;
    }
  }

  // ============================================================== GUEST ==
  function startGuest() {
    if (role === 'guest') return;
    const seat = localSeat();
    role = 'guest';
    if (!cosmetics && stage) cosmetics = createCosmetics({ stage });
    const g = {
      seat,
      entityId: null,
      dec: createSnapshotClient(),
      replica: createReplica({ world, registry, bus, scene, restoreShapes, restoreMovement, log }),
      interp: createInterpClock({ snapshotEveryTicks: net.snapshotEveryTicks || SNAPSHOT_EVERY_TICKS }),
      own: createOwnSeat({ seat }),
      shadow: null,
      seq: 0,
      frames: [],
      lastConsumed: null,
      needFull: true,
      rate: 1,
      held: { move: 0, aim: null, basic: false, revive: false },
      pendingPresses: [],
      keyAt: {},
      away: false,
      newestTick: -1,
      newestSeq: 0,
      desyncs: 0,
      hashChecks: 0,
      decodeErrors: 0,
      firstDesync: null,
      desyncPaths: [],
      badViews: new Map(),
      fullRequests: 0,
      snapshots: 0,
      lastSnapAt: 0,
      synced: false,
      renderState: null,
      shownTick: null,
      shownAlpha: 1,
      dodgeSeq: -1,
      frozen: false,
      bytes: 0,
      snapsIn: [],
      suppressed: new WeakSet(),
      rejected: 0,
      batches: { seen: new Set(), toTick: new Map(), contig: 0, throughTick: 0, dupCopies: 0, viaReliable: 0, viaUnreliable: 0 },
      bytesCh: {},
    };
    g.shadow = createActionShadow({ bus, seat, cosmetics });
    g.replica.setSuppress((ev) => g.suppressed.has(ev));
    guest = g;
    installGuards();
    setSimStep((tick) => guestTick(tick));
    wrapAdvance(guestAdvance);
    net.setSessionDriver({ onBinary: (u8) => guestBinary(u8), onControl: (m) => onControl(m) });
    installPresentation(seat);
    addKeyTimers();
    startRaf();
    startStallWatch();
    requestFull('join');
    // ?netbot=<seed> (multi-client harnesses, e.g. the netbench's --url):
    // this guest plays with scripted input.
    const nb = new URLSearchParams(location.search).get('netbot');
    if (nb !== null && !bot) api.setBotInput({ seed: Number(nb) || 3 });
    log('guest_start', { seat });
    // A guest whose tab is already hidden joins as away (the AI plays its
    // seat) and keeps acking on the metronome until it is shown.
    reconcileHidden('guest_start');
    changed();
  }
  function stopGuest() {
    if (!guest) return;
    removeKeyTimers();
    stopStallWatch();
    metronome.stop();
    if (cosmetics) cosmetics.clear();
    guest = null;
    removeGuards();
  }

  // Key timestamps for ownActionFeedbackMs (keydown -> predicted visual).
  const onKeyTime = (e) => {
    if (guest) guest.keyAt[e.code] = e.timeStamp;
  };
  const onMouseTime = (e) => {
    if (guest && e.button === 2) guest.keyAt.Mouse2 = e.timeStamp;
  };
  // Input-triggered prediction: a trusted keydown / right-button press is
  // sampled the moment it is dispatched (bubble phase — after core/input.js
  // queued it), not at the next rendered frame's start: the predicted swing /
  // cast / cue / cooldown tile start NOW (the cue sounds at once) and are
  // drawn by the very next frame. The press still rides the next 60 Hz input
  // frame (seq g.seq + 1); the frame-start sample then finds the queue empty.
  const onInputNow = (e) => {
    const g = guest;
    if (!g || g.frozen || g.away || !g.own.ready || e.repeat) return;
    if (e.type === 'mousedown' && e.button !== 2) return;
    try {
      sampleFrame();
    } catch (err) {
      log('input_now_error', { error: String(err && err.message) });
    }
  };
  function addKeyTimers() {
    window.addEventListener('keydown', onKeyTime, { capture: true, passive: true });
    window.addEventListener('mousedown', onMouseTime, { capture: true, passive: true });
    window.addEventListener('keydown', onInputNow, { passive: true });
    window.addEventListener('mousedown', onInputNow, { passive: true });
  }
  function removeKeyTimers() {
    window.removeEventListener('keydown', onKeyTime, { capture: true });
    window.removeEventListener('mousedown', onMouseTime, { capture: true });
    window.removeEventListener('keydown', onInputNow);
    window.removeEventListener('mousedown', onInputNow);
  }

  function requestFull(why) {
    if (!guest) return;
    guest.needFull = true;
    guest.fullRequests += 1;
    cmdSeq += 1;
    try {
      net.transport.sendBinary(encodeCmd(localSeat(), cmdSeq, { kind: 'full', why }));
    } catch {
      /* link down: the ack=0 in the next input packet asks again */
    }
  }

  // Own body pose + the host tick the guest's frame k corresponds to.
  function ownBody() {
    const g = guest;
    if (!g || !g.own.ready) return null;
    return g.own.body;
  }
  function hostTickNow() {
    const g = guest;
    const h = g ? g.interp.hostNow(now()) : null;
    return h === null ? world.tick : Math.round(h);
  }

  // Per rendered frame: sample input (presses predicted on THIS frame).
  // Scripted guest input for multi-client probes (the netbench's guest
  // pages via ?netbot=<seed>, or session.setBotInput()): the pure scripted
  // input generator (sim/script.js) keyed by this guest's input seq, aimed
  // at the nearest hostile half the time so fights actually happen. Presses
  // are taken once per new seq. Never on unless a probe asks for it.
  let bot = null;
  let botSeq = -1;
  function botSample() {
    const g = guest;
    const seq = g.seq + 1;
    const body = ownBody();
    const cx = body ? body.x : 0;
    const cz = body ? body.z : 0;
    const s = scriptedInput(bot.seed, seq, { skillSlots: 4, cx, cz, aimRadius: 2.4 });
    if (bot.aim !== false && body && (bot.aimAll || Math.floor(seq / 90) % 2 === 0)) {
      let best = null;
      let bd = Infinity;
      for (const e of registry.all()) {
        if (e.faction !== 'hostile' || !(e.hp > 0) || !e.hittable) continue;
        const d = (e.x - cx) * (e.x - cx) + (e.z - cz) * (e.z - cz);
        if (d < bd) {
          bd = d;
          best = e;
        }
      }
      if (best) {
        s.aim = { x: best.px + (best.x - best.px) * 0.5, z: best.pz + (best.z - best.pz) * 0.5 };
        // Close in on it: walk toward the target when farther than 1.2 u.
        if (bd > 1.44 && bot.chase !== false) {
          const l = Math.sqrt(bd);
          s.move = { x: (best.x - cx) / l, z: (best.z - cz) / l };
        }
      }
    }
    if (seq === botSeq) s.presses = [];
    else botSeq = seq;
    s.presses = s.presses.filter((p) => p.kind === 'dodge' || /^skill_[1-4]$/.test(p.kind));
    return s;
  }

  function sampleFrame() {
    const g = guest;
    const s = bot ? botSample() : sampleIntents();
    g.held.move = s.move ? moveIndex(s.move.x, s.move.z) : 0;
    if (s.aim) g.held.aim = { x: quantAim(s.aim.x), z: quantAim(s.aim.z) };
    const wasBasic = g.held.basic;
    g.held.basic = !!s.basicAttackHeld;
    g.held.revive = !!s.reviveHeld;
    const body = ownBody();
    const auth = g.replica.applied ? seatEntity(g.seat) : null;
    const seq = g.seq + 1;
    const ctxFor = (kind) => ({
      seq,
      body,
      aim: g.held.aim,
      entityId: g.entityId,
      tick: hostTickNow(),
      stunned: auth ? isStunned(auth, hostTickNow()) : false,
      // The host resolves a seat's frame in §4 order — dodge, then the kit
      // skills ascending, then the basic — so a dodge accepted for THIS frame
      // suppresses the frame's skills and basic exactly as it does there.
      dashing: body ? body.dashTicksLeft > 0 || g.dodgeSeq === seq : false,
      keyAt: g.keyAt[KEY_OF[kind]],
    });
    const order = (k) => (k === 'dodge' ? 0 : k === 'interact' ? 9 : Number(k.slice(6)) || 5);
    const presses = s.presses.filter((p) => GUEST_PRESSES.has(p.kind)).sort((a, b) => order(a.kind) - order(b.kind));
    for (const p of presses) {
      g.pendingPresses.push(p);
      if (!g.own.ready) continue;
      if (p.kind === 'interact') {
        const target = localInteractTarget(body);
        if (target) g.shadow.interact({ ...ctxFor('interact'), target });
      } else if (g.shadow.press(p.kind, ctxFor(p.kind)) && p.kind === 'dodge') {
        g.dodgeSeq = seq;
        g.own.previewDodge(g.held.move, g.held.aim);
      }
    }
    if (g.held.basic && g.own.ready) {
      const c = ctxFor('basic');
      if (!wasBasic) c.keyAt = g.keyAt.Mouse2;
      else c.keyAt = undefined;
      // §10: a seat channelling a revive swings only on a FRESH press (the
      // press breaks the channel); a held basic waits (host resolveHuman).
      c.fresh = !wasBasic;
      c.channelling = !!(auth && auth.reviveTargetId != null);
      g.shadow.basic(c);
    }
  }

  // The interactable an E press on the predicted body would use — the sim's
  // rule (sim/interactables.js resolvePresses): nothing while this seat
  // channels a revive or a Downed ally is within revive reach (E is the
  // revive), else the nearest asset whose surface is within its reach; a
  // spent / closed asset is predicted as nothing (its denial stays the
  // host's; a dormant one is denied there and retracted). Combat only (the
  // ix- prompt's rule).
  function localInteractTarget(body) {
    if (!body || !(body.hp > 0)) return null;
    const run = rawRunSystem();
    if (run && run.isActive && run.isActive() && run.view().phase !== 'combat') return null;
    const me = guest && guest.entityId !== null ? registry.byId(guest.entityId) : null;
    if (me && me.reviveTargetId != null) return null;
    let best = null;
    let bd = Infinity;
    for (const e of registry.all()) {
      if (e.partyIndex !== undefined && e.id !== (me ? me.id : null) && !(e.hp > 0) && Math.hypot(e.x - body.x, e.z - body.z) <= 0.6) return null;
      if (e.interactable !== true) continue;
      const d = Math.hypot(e.x - body.x, e.z - body.z) - (e.radius ?? 0);
      if (d <= (e.interactRadius ?? 1.1) && d < bd) {
        bd = d;
        best = e;
      }
    }
    if (!best) return null;
    const t = world.tick;
    if ((best.uses !== null && best.uses !== undefined && best.uses <= 0) || t < (best.cooldownUntilTick ?? 0)) return null;
    if (best.itype === 'sluice' && (!best.laneIds || best.laneIds.length === 0)) return null;
    return { id: best.id, itype: best.itype, x: best.x, z: best.z };
  }

  // One local 60 Hz tick: build + send this frame, predict own movement.
  function guestTick() {
    const g = guest;
    if (!g) return;
    g.seq += 1;
    // A frozen guest (host lost) sends neutral frames: nothing it does while
    // it cannot see the world may act when a host picks the frames up.
    const frozen = g.frozen;
    const snap = {
      move: frozen ? 0 : g.held.move,
      aim: g.held.aim,
      basicAttackHeld: frozen ? false : g.held.basic,
      reviveHeld: frozen ? false : g.held.revive,
      presses: frozen ? [] : g.pendingPresses.splice(0),
    };
    // viewTick = the host tick ON SCREEN when this frame's input was sampled:
    // the render tick of the last drawn frame (the presses and the held aim
    // were judged against that picture), else the clock's current estimate.
    const rt = g.shownTick !== null ? g.shownTick : g.interp.renderTick(now());
    const frame = frameFromSnapshot(
      { move: moveOfIndex(snap.move), aim: snap.aim, basicAttackHeld: snap.basicAttackHeld, reviveHeld: snap.reviveHeld, presses: snap.presses },
      { seq: g.seq, tick: g.seq, viewTick: rt === null ? 0 : Math.max(0, rt), away: g.away }
    );
    g.frames.push(frame);
    sendInputs();
    g.shadow.setSeq(g.seq);
    if (!g.away) {
      const wasDashing = g.own.ready && g.own.body.dashTicksLeft > 0;
      const dodged = g.own.onLocalFrame(seatInputOf([frame]));
      // The frame as SENT, after its movement step (the host's own order:
      // the moves and the §5 dash-end re-arm, then the discrete basic): the
      // action shadow logs it, evaluates the held basic on it when the
      // rendered-frame sample skipped this frame, and finalises a prediction
      // made on the pre-step sample (NET-F1: every input frame, never only
      // the rendered ones).
      if (g.own.ready) {
        const body = g.own.body;
        const auth = g.replica.applied ? seatEntity(g.seat) : null;
        const t = hostTickNow();
        g.shadow.frame({
          seq: g.seq,
          basic: frame.basic,
          body,
          aim: g.held.aim,
          entityId: g.entityId,
          tick: t,
          stunned: auth ? isStunned(auth, t) : false,
          channelling: !!(auth && auth.reviveTargetId != null),
          fresh: frame.basic && !g.sentBasic,
          dashing: body.dashTicksLeft > 0,
          dashEnd: wasDashing && body.dashTicksLeft === 0,
        });
      }
      g.sentBasic = frame.basic;
      if (dodged && cosmetics) {
        const b = g.own.body;
        cosmetics.ghost(b.x, b.z);
      }
      if (g.own.ready && g.own.body.dashTicksLeft > 0 && cosmetics && g.seq % 2 === 0) cosmetics.ghost(g.own.body.x, g.own.body.z);
    }
  }
  const moveOfIndex = (i) => {
    const D = Math.SQRT1_2;
    const T = [
      [0, 0],
      [1, 0],
      [D, -D],
      [0, -1],
      [-D, -D],
      [-1, 0],
      [-D, D],
      [0, 1],
      [D, D],
    ][i | 0] || [0, 0];
    return { x: T[0], z: T[1] };
  };

  function sendInputs() {
    const g = guest;
    if (!g || net.transport.state !== 'open') return;
    g.frames = g.frames.filter((f) => g.lastConsumed === null || f.seq > g.lastConsumed).slice(-INPUT_REDUNDANCY);
    if (!g.frames.length) return;
    try {
      net.transport.sendBinary(encodeInputPacket(localSeat(), g.needFull ? null : g.dec.ackSeq, g.frames));
    } catch (err) {
      log('input_send_error', { error: String(err && err.message) });
    }
  }

  // Render-stall watchdog (NET3-F2). A guest's input frames and its own-seat
  // prediction ride the rendered frame (clock.advance from the frame loop).
  // When the browser stops producing frames while the page stays visible and
  // its main thread stays free — a GPU / raster stall (200-470 ms measured
  // with four clients on one machine; snapshots kept arriving every 50 ms
  // through it) — the host starved on the seat mid-dash and the guest's dash
  // came back as a 1.1-1.8 u correction. While a guest is visible and in
  // play, a main-thread timer steps the SAME fixed-tick advance headlessly
  // (sample, 60 Hz frames sent, prediction stepped; nothing drawn) whenever
  // no frame has advanced the guest for STALL_STEP_MS; the next rendered
  // frame advances only the time the watchdog has not, and draws where the
  // sim is. It never fires at any frame-rate limit the game offers (>= 30
  // fps = 33 ms frames), never while hidden (away frames on the metronome),
  // paused, or before the frame loop has run. It steps only a RENDER stall
  // (the session's own rAF heartbeat, rafLoop, silent for STALL_STEP_MS while
  // the frame loop was advancing us up to the last drawn frame): a page that
  // keeps drawing without advancing the sim — the debug API's sim.freeze(),
  // the save round-trip freeze, a held loop — is never stepped behind its
  // back, and a renderer silent for over a second is stopped, not stalled.
  const STALL_STEP_MS = 50;
  const STALL_MAX_MS = 1000;
  let guestStepFn = null; // the frame loop's step function (main.js simStep)
  let guestLastStepAt = null; // now() of the last guest advance (frame or watchdog)
  let guestWatchMs = 0; // wall ms the watchdog advanced since the last rendered frame
  let stallTimer = 0;
  const stallStats = { steps: 0, ms: 0, maxGapMs: 0 };
  function stallWatch() {
    const g = guest;
    if (!g || !guestStepFn || guestLastStepAt === null || lastRafAt === null || g.away) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (app.simPaused()) return;
    const t = now();
    const sinceRaf = t - lastRafAt;
    // The browser is still drawing (a freeze or a pause draws without
    // advancing us), or has drawn nothing for over a second (stopped).
    if (sinceRaf < STALL_STEP_MS || sinceRaf > STALL_MAX_MS) return;
    // The frame loop was not advancing us when the drawing stopped (frozen).
    if (lastRafAt - guestLastStepAt >= STALL_STEP_MS) return;
    const gap = t - guestLastStepAt;
    if (gap < STALL_STEP_MS) return;
    guestLastStepAt = t;
    guestWatchMs += gap;
    stallStats.steps += 1;
    stallStats.ms += gap;
    if (gap > stallStats.maxGapMs) stallStats.maxGapMs = gap;
    try {
      if (!g.frozen) sampleFrame();
      rawAdvance(gap * g.rate, guestStepFn);
    } catch (err) {
      log('stall_step_error', { error: String(err && err.message) });
    }
  }
  function startStallWatch() {
    if (!stallTimer && typeof setInterval === 'function') stallTimer = setInterval(stallWatch, 16);
  }
  function stopStallWatch() {
    if (stallTimer) clearInterval(stallTimer);
    stallTimer = 0;
    guestStepFn = null;
    guestLastStepAt = null;
    guestWatchMs = 0;
  }

  // Guest per-frame driver (installed as clock.advance while a guest).
  function guestAdvance(frameMs, stepFn) {
    const g = guest;
    if (!g) return rawAdvance(frameMs, stepFn);
    const t0 = now();
    guestStepFn = stepFn;
    // Time the stall watchdog already stepped inside this frame's interval.
    const simMs = guestWatchMs > 0 ? Math.max(0, frameMs - guestWatchMs) : frameMs;
    guestWatchMs = 0;
    guestLastStepAt = t0;
    if (!g.frozen) sampleFrame();
    let tInside = now();
    // ±2% tick-rate nudge holds the host's reported input buffer depth at 2.
    const alpha = rawAdvance(simMs * g.rate, stepFn);
    tInside = now() - tInside;
    const rt = g.interp.renderTick(now());
    if (!g.frozen) {
      g.renderState = g.replica.frame(rt, alpha);
      g.shownTick = rt;
      g.shownAlpha = alpha;
    }
    if (!g.synced && g.replica.applied) onFirstSync();
    writeOwn(frameMs, alpha);
    if (cosmetics) {
      cosmetics.update(Math.min(0.1, frameMs / 1000), {
        ownMovers: () => ownMovers(alpha),
        setLead: (id, lead) => g.replica.leads.set(id, lead),
      });
    }
    frameNetGuest += now() - t0 - tInside * 0.5;
    return alpha;
  }

  function ownMovers(alpha) {
    const g = guest;
    const out = [];
    if (!g || g.entityId === null) return out;
    for (const e of registry.all()) {
      if (e.kind !== 'skillbolt' || e.sourceId !== g.entityId || g.replica.leads.has(e.id)) continue;
      out.push({ id: e.id, skill: e.skill, x: e.px + (e.x - e.px) * alpha, z: e.pz + (e.z - e.pz) * alpha, vx: e.vx, vz: e.vz });
    }
    return out;
  }

  let lastPose = null; // probes: the own-seat pose this frame drew (rendered = px + (x - px) * alpha)
  function writeOwn(frameMs, alpha = 1) {
    const g = guest;
    if (!g || g.entityId === null) return;
    const e = registry.byId(g.entityId);
    if (!e) return;
    const pose = g.own.render(frameMs, g.away || g.frozen ? 0 : g.held.move, alpha);
    if (!pose) return;
    lastPose = { rx: pose.px + (pose.x - pose.px) * alpha, rz: pose.pz + (pose.z - pose.pz) * alpha, dashing: pose.dashing, offset: pose.offset, at: now() };
    e.px = pose.px;
    e.pz = pose.pz;
    e.x = pose.x;
    e.z = pose.z;
    if (pose.faceX !== undefined) {
      e.faceX = pose.faceX;
      e.faceZ = pose.faceZ;
    }
    e.dashing = pose.dashing;
    if (g.held.aim) e.aim = { x: g.held.aim.x, z: g.held.aim.z };
  }

  function onFirstSync() {
    const g = guest;
    g.synced = true;
    const e = seatEntity(g.seat);
    g.entityId = e ? e.id : null;
    g.replica.setOwnId(g.entityId);
    log('guest_synced', { seat: g.seat, entityId: g.entityId, tick: g.replica.appliedTick });
    if (hud) hud.setSynced(true);
    changed();
  }

  // ------------------------------------------------------ guest binary --
  function guestBinary(u8) {
    const g = guest;
    if (!g) return;
    const t0 = now();
    try {
      const ch = u8[0];
      // Downstream bytes per channel (bandwidth budget diagnostics).
      g.bytesCh[ch] = (g.bytesCh[ch] || 0) + u8.length;
      if (ch === BIN.SNAP) guestSnap(u8);
      else if (ch === BIN.EVENTS) guestBatch(decodeEvents(u8), 'reliable');
      else if (ch === BIN.EVENTS_U) for (const b of decodeEventsBundle(u8)) guestBatch(b, 'unreliable');
      else if (ch === BIN.CMD) guestCmd(decodeCmd(u8));
    } catch (err) {
      g.decodeErrors += 1;
      log('guest_decode_error', { error: String(err && err.message) });
    }
    frameNetGuest += now() - t0;
  }

  function guestSnap(u8) {
    const g = guest;
    const r = g.dec.decode(u8);
    if (!r.ok) {
      if (r.error === 'no_baseline') g.needFull = true;
      else {
        g.decodeErrors += 1;
        g.needFull = true;
      }
      return;
    }
    if (r.duplicate) return;
    g.snapshots += 1;
    g.bytes += r.bytes;
    g.snapsIn.push(now());
    while (g.snapsIn.length && now() - g.snapsIn[0] > 5000) g.snapsIn.shift();
    if (r.full) {
      g.needFull = false;
      // Diagnostics: a full copy of a snapshot that failed its hash check.
      const bad = g.badViews.get(r.seq);
      if (bad) {
        const path = firstDiff(bad, r.view());
        g.desyncPaths.push({ seq: r.seq, tick: r.tick, path });
        if (g.desyncPaths.length > 20) g.desyncPaths.shift();
        g.badViews.delete(r.seq);
        log('desync_path', { seq: r.seq, path });
      }
    }
    if (r.hash) g.hashChecks += 1;
    if (r.hashOk === false) {
      g.desyncs += 1;
      if (!g.firstDesync) g.firstDesync = { seq: r.seq, tick: r.tick };
      g.badViews.set(r.seq, r.view());
      if (g.badViews.size > 4) g.badViews.delete(g.badViews.keys().next().value);
      g.dec.reset();
      g.needFull = true;
      cmdSeq += 1;
      net.transport.sendBinary(encodeCmd(localSeat(), cmdSeq, { kind: 'full', why: 'desync', seq: r.seq }));
      log('desync', { seq: r.seq, tick: r.tick });
      return;
    }
    if (g.frozen) return;
    // Host tick jumped back (migration) or far ahead: restart the timeline.
    if (g.newestTick >= 0 && (r.tick < g.newestTick - 30 || r.tick > g.newestTick + 600)) {
      g.replica.resync();
      g.interp.reset();
      g.shownTick = null;
      g.own.reset();
      g.shadow.reset();
      g.newestTick = -1;
      g.lastConsumed = null;
    }
    g.interp.onSnapshot(r.tick, now());
    if (r.lastInputSeqConsumed !== null && (g.lastConsumed === null || r.lastInputSeqConsumed > g.lastConsumed)) g.lastConsumed = r.lastInputSeqConsumed;
    // Input clock nudge (PLAN: hold the host's buffer depth at 2): below 2
    // -> run 2% fast, above 2 -> 2% slow. (A [1, 3] dead band let the depth
    // settle at 3 — one extra frame, 17 ms, on every input and every rewind.)
    const depth = r.inputBufferDepth;
    g.rate = depth < 2 ? 1.02 : depth > 2 ? 0.98 : 1;
    const view = r.view();
    g.replica.pushSnapshot(r.tick, r.seq, view);
    if (r.tick > g.newestTick) {
      g.newestTick = r.tick;
      g.newestSeq = r.seq;
      const ents = view.registry && view.registry.entities ? view.registry.entities : [];
      const me = g.seat === 0 ? ents.find((e) => e.kind === 'player') : ents.find((e) => e.kind === 'ally' && e.partyIndex === g.seat);
      if (me) {
        if (g.entityId === null) g.entityId = me.id;
        const k = r.lastInputSeqConsumed;
        const human = me.controller === 'human' || g.seat === 0;
        const al = view.systems && view.systems.allies && view.systems.allies.seats;
        const timers = al && Array.isArray(al.timers) ? al.timers[g.seat] : null;
        // Re-base (never a prediction error or a snap): the first snapshot
        // that shows the body under this guest's frames after the host's AI
        // played it (joining, back from away) — the AI's moves are an
        // ownership change — and the snapshot of a room / level change, where
        // the host re-seats the party at the entry arc (run.positionParty).
        const run = view.systems && view.systems.run ? view.systems.run : null;
        const roomKey = run ? `${run.act ?? ''}:${run.roomIndex ?? ''}` : null;
        const reseat = g.roomKey !== undefined && roomKey !== g.roomKey;
        g.roomKey = roomKey;
        const handoff = (human && g.ownHuman === false) || reseat;
        if (human || !g.own.ready) g.own.reconcile(me, r.tick, human ? k : g.seq, timers, { handoff });
        g.ownHuman = human;
        if (human) {
          g.shadow.reseed(timers, k, me.hp > 0);
          g.shadow.onConsumed(k, r.tick);
        }
      }
    }
  }

  // One EVENTS batch, from either copy (reliable EVENTS or the unreliable
  // EVENTS_U resend): the first copy to arrive is used, later copies are
  // dropped here (batch level), so the replica sees every batch exactly once.
  function guestBatch(b, via) {
    const g = guest;
    if (g.batches.seen.has(b.batchSeq)) {
      g.batches.dupCopies += 1;
      return;
    }
    g.batches.seen.add(b.batchSeq);
    if (g.batches.seen.size > 4000) g.batches.seen.delete(g.batches.seen.values().next().value);
    if (via === 'unreliable') g.batches.viaUnreliable += 1;
    else g.batches.viaReliable += 1;
    for (const ev of b.events) {
      if (g.shadow.isOwn(ev) && g.shadow.onAuthEvent(ev)) g.suppressed.add(ev);
    }
    // Contiguous delivery clock: every batch <= contig has been received.
    g.batches.toTick.set(b.batchSeq, b.toTick);
    if (g.batches.contig === 0) g.batches.contig = b.batchSeq - 1;
    while (g.batches.toTick.has(g.batches.contig + 1)) {
      g.batches.contig += 1;
      g.batches.throughTick = g.batches.toTick.get(g.batches.contig);
      g.batches.toTick.delete(g.batches.contig);
    }
    if (g.frozen) return;
    g.replica.pushEvents(b);
    g.shadow.onEventsThrough(g.batches.throughTick);
  }

  function guestCmd(c) {
    const cmd = c.cmd || {};
    if (cmd.kind === 'ping') showPing(cmd);
    else if (cmd.kind === 'command_rejected') {
      guest.rejected += 1;
      if (hud) hud.note('The Healer makes the build choices — your pick was shown to the party');
    }
  }

  function showPing(p) {
    pings.push({ ...p, t: now() });
    if (pings.length > 20) pings.shift();
    try {
      bus.replay({ tick: world.tick, type: 'net_ping', seat: p.seat, page: p.page, index: p.index, view: true });
    } catch {
      /* listener */
    }
    if (hud) hud.ping(p, nameOfSeat(p.seat) || seatLabel(p.seat));
  }

  // --------------------------------------------------- hidden tabs (§3.7) --
  // The hidden-tab loop follows the page's visibility AND the session role,
  // whichever changes: a host whose tab is already in the background when
  // the session starts — hidden during the 1.5 s countdown, a migration onto
  // a hidden guest — runs the shared sim on the Worker metronome from its
  // first tick, exactly like a host hidden mid-game (NET4-F1, fix-M5a-r4:
  // the loop was entered only from a visibilitychange seen WHILE hosting, so
  // a host hidden before the start never ticked and every guest waited on
  // "Joining…" until the host tab came back). reconcileHidden() is
  // idempotent; it runs on visibilitychange and after every role change.
  const pageHidden = () => typeof document !== 'undefined' && !!document.hidden;
  function reconcileHidden(cause = 'visibility') {
    const hidden = pageHidden();
    const want = hidden && role === 'host' && host ? 'host' : hidden && role === 'guest' && guest ? 'guest' : null;
    if (want === hiddenMode) return;
    // Leave the loop that runs now.
    if (hiddenMode === 'guest') {
      metronome.stop();
      if (guest && role === 'guest') {
        guest.away = false;
        // The stall watchdog waits for the first rendered frame after the return.
        guestLastStepAt = null;
        guestWatchMs = 0;
        guest.replica.resync();
        guest.interp.reset();
        guest.shownTick = null;
        guest.own.reset();
        guest.shadow.reset();
        guest.newestTick = -1;
        requestFull('return');
        log('guest_return', { cause });
      }
    } else if (hiddenMode === 'host') {
      metronome.stop();
      // The first rAF frame after the return spans the hidden time the
      // metronome already fed: it advances nothing.
      if (host && role === 'host') skipNextFrame = true;
      log('host_visible', { cause });
    }
    hiddenMode = null;
    // Enter the one the page needs now.
    if (want === 'guest') {
      guest.away = true;
      // Neutral + away at once, then 20 Hz away frames on the Worker.
      guestTickAway();
      metronome.start(20, () => guestTickAway());
      log('guest_away', { cause });
    } else if (want === 'host') {
      let last = now();
      metronome.start(SIM_HZ, (t) => {
        const ms = Math.max(0, Math.min(250, t - last));
        last = t;
        if (!host) return;
        hostHiddenFedMs += ms; // wall time handed to the clock (hitstop included)
        rawAdvance(ms, (tick) => host && host.step(tick));
        // No rendered frames while hidden: each metronome period is the
        // unit of the host's net-work accounting (hostNetMs).
        if (host) host.frameEnd(ms);
      });
      log('host_hidden_metronome', { cause });
    }
    hiddenMode = want;
  }
  function onVisibility() {
    reconcileHidden('visibility');
  }
  function guestTickAway() {
    const g = guest;
    if (!g) return;
    g.seq += 1;
    g.frames.push(frameFromSnapshot(null, { seq: g.seq, tick: g.seq, viewTick: 0, away: true }));
    sendInputs();
  }
  document.addEventListener('visibilitychange', onVisibility);

  // ------------------------------------------------------- control flow --
  function onControl(m) {
    if (host) host.onControl(m);
    switch (m.t) {
      case 'host_lost':
        if (role === 'guest' && guest) {
          guest.frozen = true;
          hostLost = { at: now(), graceMs: m.graceMs || 10000 };
          if (hud) hud.hostLost(hostLost.graceMs);
        }
        break;
      case 'host_changed':
        if (role === 'guest' && guest && m.hostPeerId !== net.peerId) {
          // A new authority: sequence spaces restart; re-baseline.
          guest.dec.reset();
          guest.replica.resync();
          guest.interp.reset();
          guest.shownTick = null;
          guest.own.reset();
          guest.shadow.reset();
          guest.newestTick = -1;
          guest.lastConsumed = null;
          guest.frozen = false;
          // The new host numbers its event batches from 1.
          guest.batches = { seen: new Set(), toTick: new Map(), contig: 0, throughTick: 0, dupCopies: 0, viaReliable: 0, viaUnreliable: 0 };
          hostLost = null;
          if (hud) hud.hostBack(nameOfSeat(m.seat) || 'a new host');
          requestFull('host_changed');
        }
        break;
      case 'peer_restored':
        if (role === 'guest' && guest && m.host) {
          guest.frozen = false;
          hostLost = null;
          if (hud) hud.hostBack(null);
          requestFull('host_back');
        }
        break;
      default:
        break;
    }
    changed();
  }

  function becomeHost(m) {
    log('become_host', { seat: m.hostSeat, keyframeTick: m.keyframe ? m.keyframe.tick : null, stateAgeMs: m.keyframe ? m.keyframe.stateAgeMs : null });
    const t0 = now();
    stopGuest();
    let applied = false;
    if (m.keyframe && m.keyframe.b64) {
      try {
        const { tree } = decodeKeyframe(fromBase64(m.keyframe.b64));
        const save = service('save');
        const r = save && typeof save.apply === 'function' ? save.apply(tree) : { ok: false };
        applied = !!(r && r.ok);
      } catch (err) {
        log('keyframe_apply_error', { error: String(err && err.message) });
      }
    }
    role = 'none';
    startHost({ migrated: true });
    migration.last = { ms: Math.round(now() - t0), keyframeTick: m.keyframe ? m.keyframe.tick : null, stateAgeMs: m.keyframe ? m.keyframe.stateAgeMs : null, applied, at: Date.now() };
    hostLost = null;
    if (hud) {
      hud.hostBack('you');
      hud.note(applied ? 'You are now hosting — the session continues' : 'You are now hosting (no keyframe: continuing from your last view)');
    }
  }
  const migration = { last: null };

  // Room transitions -> session roles.
  function sync() {
    const st = net.state;
    if (sessionEnding) return;
    if (st === 'host' && role !== 'host') {
      if (role === 'guest') stopGuest();
      enterPlaying();
      role = 'none';
      startHost();
      ensureHud();
    } else if (st === 'guest' && role !== 'guest') {
      if (role === 'host') stopHost();
      enterPlaying();
      role = 'none';
      startGuest();
      ensureHud();
    } else if (st === 'migrating' && role === 'guest' && guest && !guest.frozen) {
      guest.frozen = true;
      if (!hostLost) hostLost = { at: now(), graceMs: 10000 };
      if (hud) hud.hostLost(10000);
    } else if ((st === 'lobby' || st === 'offline') && role !== 'none' && !net.inSession()) {
      // Deferred one microtask: the lobby client changes state BEFORE it
      // emits the reason (session_lost / room_closed, same call stack), and
      // that handler ends the session WITH its message; a plain leave ends
      // here without one.
      queueMicrotask(() => {
        if (role !== 'none' && !net.inSession() && (net.state === 'lobby' || net.state === 'offline')) endSession('left', null);
      });
    }
    if (hud) hud.update(api.status());
  }
  function enterPlaying() {
    sessionStartedAt = now();
    if (app.state !== 'playing' && typeof app.newGame === 'function') app.newGame();
    registerCues();
  }
  function ensureHud() {
    if (!hud) hud = createNetHud({ app, settings, api, nameOfSeat });
    hud.show(true);
    hud.update(api.status());
  }

  function endSession(reason, text) {
    clearGiveUp();
    if (role === 'none' && !host && !guest) return;
    sessionEnding = true;
    log('session_end', { reason, text });
    stopHost();
    stopGuest();
    metronome.stop();
    hiddenMode = null;
    skipNextFrame = false;
    stopRaf();
    unwrapAdvance();
    setSimStep(null);
    net.setSessionDriver(null);
    removePresentation();
    role = 'none';
    hostLost = null;
    if (hud) hud.show(false);
    sessionEnding = false;
    changed();
    if (app.state === 'playing' && typeof app.quitToTitle === 'function') {
      app.quitToTitle({ save: false }).then(() => {
        if (text) app.toast(text, { tone: 'warn', ms: 5200 });
      });
    } else if (text) app.toast(text, { tone: 'warn', ms: 5200 });
  }

  net.on('state', () => sync());
  net.on('room', (r) => {
    if (r && r.seats) lastSeatNames = r.seats.map((s) => (s.peerId ? s.name : null));
    if (hud) hud.update(api.status());
    changed();
  });
  net.on('become_host', (m) => becomeHost(m));
  net.on('session_lost', (m) => endSession('session_lost', m && m.text ? m.text : 'Connection to the server was lost.'));
  net.on('room_closed', (m) => endSession('room_closed', m && m.detail === 'no_guests' ? 'The session ended — everyone else left.' : 'The session ended.'));
  // Reconnect give-up (PLAN §3.7 "Reconnect + host drop", best-in-class
  // choice where the PLAN is silent on how long the game waits in-session):
  // the client retries with backoff 0.25/0.5/1/2/2.5 s; after
  // RECONNECT_GIVEUP_MS in-session (past the host's 10 s grace, so a host
  // that could still resume always gets the chance) the session ends and the
  // page returns to the title with "Connection to the server was lost" — the
  // server still holds a guest's seat for 60 s, so the title offers
  // "Rejoin ABCDE?" (the stored session is kept). A dead server lands here
  // too (every client reaches the title; single-player intact).
  let giveUp = null;
  function clearGiveUp() {
    if (giveUp) clearTimeout(giveUp.timer);
    giveUp = null;
  }
  net.on('reconnecting', () => {
    if (role !== 'none' && !giveUp) {
      const at = now();
      giveUp = {
        at,
        timer: setTimeout(() => {
          giveUp = null;
          if (net.state !== 'reconnecting' || role === 'none') return;
          log('reconnect_give_up', { afterMs: Math.round(now() - at) });
          // The session ends FIRST (with its message), then the retry loop
          // stops (its 'offline' state change then finds no session).
          endSession('session_lost', 'Connection to the server was lost.');
          try {
            net.disconnect(); // the stored session stays for "Rejoin ABCDE?"
          } catch {
            /* already closed */
          }
        }, RECONNECT_GIVEUP_MS),
      };
    }
    if (hud) hud.update(api.status());
    changed();
  });
  net.on('reconnected', () => {
    clearGiveUp();
    if (role === 'guest') requestFull('reconnected');
    if (hud) hud.update(api.status());
    changed();
  });
  net.on('peer_dropped', (m) => {
    if (hud && m.seat !== localSeat()) hud.note(`${nameOfSeat(m.seat) || lastSeatNames[m.seat] || seatLabel(m.seat)} reconnecting…`);
  });
  net.on('peer_restored', (m) => {
    if (hud && m.seat !== localSeat() && !m.host) hud.note(`${nameOfSeat(m.seat) || seatLabel(m.seat)} is back`);
  });
  net.on('peer_left', (m) => {
    if (hud && m.seat !== localSeat()) hud.note(`${lastSeatNames[m.seat] || seatLabel(m.seat)} left — AI plays the ${seatLabel(m.seat)}`);
  });
  bus.on('seat_control', (ev) => {
    if (!hud || role === 'none') return;
    if (ev.partyIndex === localSeat() && ev.controller === 'human') return;
    hud.note(seatControlText(ev, (i) => nameOfSeat(i)));
  });

  // Offer "Rejoin ABCDE?" when the title comes up with a live stored session.
  let rejoinOffered = null;
  app.events.on('app_state', (p) => {
    if (p.state !== 'title' || role !== 'none') return;
    const info = net.rejoinInfo();
    if (!info || rejoinOffered === info.code) return;
    rejoinOffered = info.code;
    setTimeout(() => {
      if (app.state !== 'title' || app.screens.top() !== 'title') return;
      app
        .confirm({
          title: `Rejoin ${info.code}?`,
          body: `Your ${seatLabel(info.seat ?? 1)} seat is held for a minute after a disconnect. Rejoin the session now?`,
          confirmLabel: 'Rejoin',
          cancelLabel: 'Not now',
          defaultFocus: 'confirm',
        })
        .then(async (yes) => {
          if (!yes) return;
          const r = await net.rejoin();
          if (!r.ok) app.toast(`Couldn't rejoin ${info.code} — ${r.text || r.reason || 'the seat was released'}`, { tone: 'warn' });
        });
    }, 400);
  });

  // DEPLOY (PLAN §14.5): a redeploy never strands a player — when the net
  // client learns a newer build exists, "A new version of Echoes is
  // available — Reload" (in place in the Multiplayer menu, else a dialog
  // once the title is up; never over a single-player run).
  installUpdatePrompt({ app, net });

  // ---------------------------------------------------------------- API --
  function status() {
    const r = net.room;
    return {
      role,
      netState: net.state,
      code: r ? r.code : null,
      seat: net.seat,
      seats: r && r.seats ? r.seats.map((s) => ({ index: s.index, name: s.peerId ? s.name : null, connected: !!s.connected, ready: !!s.ready, me: s.peerId === net.peerId, host: r.hostPeerId === s.peerId, rttMs: s.rttMs ?? null })) : [],
      rttMs: net.stats ? net.stats().rttMs : null,
      synced: guest ? guest.synced : role === 'host',
      frozen: guest ? guest.frozen : false,
      hostLost: hostLost ? { remainingMs: Math.max(0, hostLost.graceMs - (now() - hostLost.at)) } : null,
      reconnecting: net.state === 'reconnecting',
      reconnectLeftMs: giveUp ? Math.max(0, RECONNECT_GIVEUP_MS - (now() - giveUp.at)) : null,
      inSession: role !== 'none',
      serverUrl: net.serverUrl,
    };
  }

  function guestStats() {
    const g = guest;
    if (!g) return {};
    const rs = g.replica.stats();
    const os = g.own.stats();
    const ss = g.shadow.stats();
    const ds = g.dec.stats();
    const fs = [...frameStats.guestNetMs].sort((a, b) => a - b);
    // Packet loss is not measured here: the net client counts snapshot-seq
    // gaps on every SNAP frame (downstream) and reads the host's upstream
    // echo from the header (NET-F2) — net.stats() lossPct / lossInPct /
    // lossOutPct / quality.
    return {
      synced: g.synced,
      seatEntity: g.entityId,
      snapshotBytesAvg: ds.fullCount + ds.deltaCount ? Math.round(((ds.fullBytes + ds.deltaBytes) / (ds.fullCount + ds.deltaCount)) * 10) / 10 : null,
      fullBytesAvg: ds.fullAvg ? Math.round(ds.fullAvg * 10) / 10 : null,
      deltaBytesAvg: ds.deltaAvg ? Math.round(ds.deltaAvg * 10) / 10 : null,
      deltaRatio: ds.fullAvg && ds.deltaAvg ? Math.round((ds.deltaAvg / ds.fullAvg) * 1000) / 1000 : null,
      fullSnapshots: ds.fullCount,
      snapshotsPerSec: Math.round((g.snapsIn.length / 5) * 10) / 10,
      desyncs: g.desyncs,
      hashChecks: ds.hashChecks,
      firstDesync: g.firstDesync,
      desyncPaths: g.desyncPaths.slice(-5),
      decodeErrors: g.decodeErrors + ds.corrupt,
      decodeMsP95: ds.decodeMsP95,
      eventBatches: rs.batchesIn,
      eventGaps: g.batches.toTick.size,
      eventBatchesViaUnreliable: g.batches.viaUnreliable,
      eventBatchesViaReliable: g.batches.viaReliable,
      eventBatchCopiesDropped: g.batches.dupCopies,
      bytesByChannel: { snap: g.bytesCh[BIN.SNAP] || 0, events: g.bytesCh[BIN.EVENTS] || 0, eventsU: g.bytesCh[BIN.EVENTS_U] || 0, cmd: g.bytesCh[BIN.CMD] || 0 },
      interpDelayMs: g.interp.stats().delayMs,
      interpJitterMs: g.interp.stats().jitterMs,
      renderState: g.renderState ? g.renderState.state : null,
      extrapolatedFrames: rs.extrapolatedFrames,
      heldFrames: rs.heldFrames,
      predErrP95: os.predErrP95,
      predErrP50: os.predErrP50,
      predErrMax: os.predErrMax,
      // Render-stall watchdog: headless advances while no frame was drawn.
      stallSteps: stallStats.steps,
      stallStepMs: Math.round(stallStats.ms),
      stallGapMaxMs: Math.round(stallStats.maxGapMs),
      predErrSamples: os.predErrSamples,
      corrections: os.corrections,
      correctionSnaps: os.snaps,
      maxCorrectionPerFrame: os.maxCorrectionPerFrame,
      remoteJumpMax: rs.remoteJumpMax,
      remoteStepMax: rs.remoteStepMax,
      remoteJumps03: rs.remoteJumps03,
      remoteJumps06: rs.remoteJumps06,
      remoteJumpRate06: rs.remoteJumpRate06,
      remoteFrames: rs.remoteFrames,
      hostileJumpMax: rs.hostileJumpMax,
      hostileJumps03: rs.hostileJumps03,
      hostileFrames: rs.hostileFrames,
      smoothed: rs.smoothed,
      smoothedMaxU: rs.smoothedMaxU,
      smoothSnaps: rs.smoothSnaps,
      teleportFrames: rs.teleportFrames,
      stallFrames: rs.stallFrames,
      clockFrames: rs.clockFrames,
      interpSnaps: g.interp.stats().snaps,
      ownActionFeedbackMs: ss.ownActionFeedbackMs,
      retractions: ss.retractions,
      mispredictRetractMs: ss.mispredictRetractMs,
      predictedActions: ss.predicted,
      confirmedActions: ss.confirmed,
      eventsReplayed: rs.eventsReplayed,
      eventsSuppressed: rs.eventsSuppressed,
      eventsLate: rs.eventsLate,
      eventDuplicates: rs.duplicates,
      replayedOnce: rs.duplicates === 0,
      applyMsP95: rs.applyMsP95,
      applyErrors: rs.applyErrors,
      inputRate: g.rate,
      guestNetMsP95: fs.length ? Math.round(fs[Math.min(fs.length - 1, Math.floor(fs.length * 0.95))] * 100) / 100 : null,
      frameOver50Net: frameStats.frameOver50Net,
      frozen: g.frozen,
      away: g.away,
      fullRequests: g.fullRequests,
      rejectedPicks: g.rejected,
      busCounters: { ...bus.counters },
      worldRefusals: world.replicaRefusals ? world.replicaRefusals() : null,
      cosmetics: cosmetics ? cosmetics.stats() : null,
    };
  }

  // Everything the session knows, merged into __echoes.net.stats().
  net.extendStats(() => {
    const base = { session: role, sessionMs: role !== 'none' ? Math.round(now() - sessionStartedAt) : null, migration: migration.last, metronome: metronome.stats(), hostHiddenFedMs: Math.round(hostHiddenFedMs) };
    if (host) return { ...base, ...host.stats(), stream: 'driver-host' };
    if (guest) return { ...base, ...guestStats(), stream: 'driver-guest' };
    return base;
  });

  const api = {
    status,
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get role() {
      return role;
    },
    isGuest: () => role === 'guest',
    isHost: () => role === 'host',
    localSeat,
    // Leave the running session (pause menu "Leave Session", INT): a quit,
    // not a drop — no seat hold; this page returns to the title.
    async leaveSession() {
      if (role === 'none') return { ok: false, reason: 'not_in_session' };
      await net.leave();
      endSession('left', null);
      return { ok: true };
    },
    pings: () => pings.slice(),
    log: (n = 60) => logRing.slice(-n),
    // One-line connection readout for the HUD detail row (net.showStats).
    statsLine() {
      const s = net.stats();
      const lossOf = (v) => (Number.isFinite(v) ? `${v}%` : '—');
      const loss = role === 'guest' ? `loss ↓${lossOf(s.lossInPct)} ↑${lossOf(s.lossOutPct)}` : `loss ${s.lossPct ?? 0}%`;
      const parts = [`rtt ${s.rttMs ?? '—'} ms`, `jitter ${s.jitterMs ?? 0} ms`, loss];
      if (role === 'guest') parts.push(`snap ${s.snapshotsPerSec ?? 0}/s`, `interp ${s.interpDelayMs ?? '—'} ms`, `in ${Math.round((s.bytesInPerSec || 0) / 102.4) / 10} KB/s`);
      if (role === 'host') parts.push(`net ${s.hostNetMsP95 ?? '—'} ms`, `out ${Math.round((s.bytesOutPerSec || 0) / 102.4) / 10} KB/s`);
      return parts.join(' · ');
    },
    // Probes (docs/TESTING.md M5b): lag compensation on/off (host), a
    // forced full snapshot (guest), the guest context's live objects.
    setLagCompensation(on) {
      return host ? host.setLagCompensation(on) : null;
    },
    requestFull: () => requestFull('api'),
    // Probe input: { seed, aim?: bool, aimAll?: bool, chase?: bool } | null (see botSample).
    setBotInput(cfg) {
      bot = cfg ? { seed: (cfg.seed ?? 3) >>> 0, aim: cfg.aim !== false, aimAll: !!cfg.aimAll, chase: cfg.chase !== false } : null;
      botSeq = -1;
      return bot;
    },
    // Who makes the between-room choices now (the guest pages' banner): the
    // host's seat, or the Healer while the leader bot plays it (seats.js).
    chooserLabel: () => seatLabel(chooserSeat(net.room)),
    debugGuest: () => guest,
    // The own-seat pose the last rendered frame drew (guest probes).
    ownPose: () => (guest ? lastPose : null),
    // Every live hostile where the last rendered frame drew it (lag-
    // compensation probes: "valid on the guest's screen") + that frame's
    // host render tick.
    renderedHostiles() {
      const g = guest;
      if (!g) return null;
      const a = g.shownAlpha;
      const out = [];
      for (const e of registry.all()) {
        if (e.faction !== 'hostile' || !(e.hp > 0) || !Number.isFinite(e.x)) continue;
        out.push({ id: e.id, x: e.px + (e.x - e.px) * a, z: e.pz + (e.z - e.pz) * a, hittable: e.hittable !== false });
      }
      return { tick: g.shownTick, hostiles: out };
    },
    debugHost: () => host,
    // CAMPAIGN (PLAN §12.9): guests tell the host when they can draw the next
    // level; the host's level manager waits for every connected guest (or its
    // 6 s cap) before advancing the level-transition card.
    reportLevelReady(level, ready) {
      if (role !== 'guest' || !net.transport) return false;
      cmdSeq += 1;
      net.transport.sendBinary(encodeCmd(localSeat(), cmdSeq, { kind: 'level_ready', level: Number(level) || 0, ready: !!ready }));
      return true;
    },
    levelReadyAll(level) {
      if (role !== 'host' || !host || typeof host.levelReady !== 'function') return true;
      const room = net.room;
      const seats = room && Array.isArray(room.seats) ? room.seats : [];
      for (const s of seats) {
        if (!s || s.index === localSeat() || !s.peerId || s.connected === false) continue;
        const r = host.levelReady(s.index);
        if (!r || r.level !== Number(level) || !r.ready) return false;
      }
      return true;
    },
    resetStats() {
      if (guest) {
        guest.own.resetStats();
        guest.shadow.resetStats();
        guest.replica.resetStats();
      }
      if (host && host.resetStats) host.resetStats();
      frameStats.guestNetMs.length = 0;
      frameStats.frameOver50Net = 0;
      stallStats.steps = 0;
      stallStats.ms = 0;
      stallStats.maxGapMs = 0;
    },
  };
  // The net service carries the session (PLAN: `net` = M5a client -> M5b session).
  net.session = api;
  net.isGuest = api.isGuest;
  net.isHost = api.isHost;
  net.leaveSession = api.leaveSession;
  net.reportLevelReady = api.reportLevelReady;
  net.levelReadyAll = api.levelReadyAll;
  return api;
}
