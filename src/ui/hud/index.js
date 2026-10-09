// Combat HUD root (BUILD_BRIEF §17). Replaces src/ui/protohud.js.
//
//   #hud         1920x1080 virtual overlay, uniformly scaled and centred
//                (§17). Holds Zone 1 (command bar) and Zone 2 (room banner).
//   #hud-threat  real-pixel, world-anchored layer for the off-screen threat
//                pointers (see threat.js).
//
// TYPE FLOORS. Geometry AND type are both authored in the 1920x1080 virtual
// space and scaled by ONE number, so the layout is identical at every window
// size. That number is §17's min(w/1920, h/1080) clamped below at MIN_SCALE
// (= 0.6867, the point where a 24 px label lands at 16 px and a 30 px numeral
// at 20 px). Because the clamp can push the virtual canvas past the window
// edges, the two zones are offset from the canvas edges by --zb / --zt, which
// are solved here so each zone lands a fixed number of REAL px from its
// window edge. See the SIZING CONTRACT note in style.js.
import { bossNameOfRun } from '../../data/levels.js';
import { bossName as simBossName } from '../../sim/boss.js';
// Title-case boss name for an entity kind ('THE DROWNED HERON' -> 'The Drowned Heron').
const bossName = (kind) => simBossName(kind).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
import { hudCss, FS_KEY, FS_LAB, FS_NUM, MIN_SCALE } from './style.js';
import { renderClassPortraits } from './portraits.js';
import { createCommandBar } from './commandbar.js';
import { createBanner } from './banner.js';
import { createThreatLayer } from './threat.js';
import { iconEl } from './icons.js';
import { t } from '../../i18n/index.js';
import { viewerSeat } from '../../app/viewerseat.js';

const BAR_EDGE_PX = 16; // real px from the window bottom to the command bar
const BANNER_EDGE_PX = 14; // real px from the window top to the banner
const CORNER_EDGE_PX = 12; // real px from the window side to the corner plates
const ROOM_POLL_MS = 100;

// Location label copy (Reference D: "Gate Bridge" top-left). Derived from the
// scene + the run's room index; nothing here invents a room the sim does not
// have. Room 7 is the §16 shop, room 8 the §11 Hollow Stag.
// Getters: looked up (translated) when read, after the language has loaded.
const MODE_WORD = {
  get kill_all() {
    return t('CLEAR THE CLEARING');
  },
  get defend() {
    return t('HOLD THE WAYSTONE');
  },
  // ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md).
  get hunt() {
    return t('HUNT THE QUARRY');
  },
  get purge() {
    return t('PURGE THE NESTS');
  },
  // CHAMPION ROOMS (docs/CHAMPIONS.md).
  get champion() {
    return t('FELL THE CHAMPION');
  },
  get shop() {
    return t('THE PEDDLER');
  },
  get boss() {
    return t('THE HOLLOW STAG');
  },
};
// The room line: 'ROOM 3 OF 8 · …', or 'ROOM 3/8 · …' under the endless depth.
const roomLine = (short, room, total, what) =>
  short ? t('ROOM {room}/{total} · {what}', { room, total, what }) : t('ROOM {room} OF {total} · {what}', { room, total, what });
function locationCopy(scene, rv, short = false) {
  // CAMPAIGN (PLAN §12.6): between two levels the plate says so (the card
  // names both levels).
  if (rv && rv.active && rv.phase === 'transit') return { name: t('ON THE ROAD'), sub: rv.endless ? t('THE DESCENT GOES ON') : t('BETWEEN LEVELS') };
  // ENDLESS (docs/ENDLESS.md): the depth leads the plate's second line.
  if (rv && rv.active && rv.room >= 1 && rv.endless) {
    const c = locationCopy(scene, { ...rv, endless: undefined }, true);
    return { name: c.name, sub: t('DEPTH {depth} · {where}', { depth: rv.endless.depth, where: c.sub }), depth: rv.endless.depth };
  }
  // DAILY DESCENT (docs/DAILY.md): the plate says it is the day's run.
  if (rv && rv.active && rv.room >= 1 && rv.daily) {
    const c = locationCopy(scene, { ...rv, daily: undefined }, true);
    return { name: c.name, sub: t('DAILY · {where}', { where: c.sub }) };
  }
  if (rv && rv.active && rv.room >= 1) {
    const room = rv.room;
    const total = rv.rooms ?? 8;
    // Gauntlet M4b: Acts II / III name their own biome (the Act I copy stays).
    const place = rv.act > 1 && rv.actName ? t(String(rv.actName)).toUpperCase() : null;
    if (room >= total) return { name: place ?? t('THE HOLLOW'), sub: roomLine(short, room, total, t(bossNameOfRun(rv)).toUpperCase()) };
    if (rv.phase === 'shop' || rv.mode === 'shop') return { name: t("THE PEDDLER'S CLEARING"), sub: roomLine(short, room, total, MODE_WORD.shop) };
    // EVENT ROOMS: a "?" room (the chest's ambush keeps the name).
    if (rv.mode === 'event') return { name: place ?? t('UNEASY WOODLAND'), sub: roomLine(short, room, total, t('AN ENCOUNTER')) };
    const mode = rv.mode === 'kill_all' && place ? t('CLEAR THE ROOM') : MODE_WORD[rv.mode] ?? t('ON THE ROAD');
    return { name: place ?? t('UNEASY WOODLAND'), sub: roomLine(short, room, total, mode) };
  }
  // The victory / defeat card sits over the level it ended in (gauntlet r6
  // J6-F1) until the return to camp.
  if (rv && !rv.active && (rv.phase === 'victory' || rv.phase === 'defeat')) {
    const place = rv.act > 1 && rv.actName ? t(String(rv.actName)).toUpperCase() : t('THE HOLLOW');
    return { name: place, sub: rv.phase === 'victory' ? t('VICTORY · RETURNING TO CAMP') : t('THE PARTY HAS FALLEN') };
  }
  if (scene === 'camp') return { name: t('THE HEARTH CAMP'), sub: t('NIGHT · BEFORE THE ROAD') };
  return { name: t('THE PROVING CLEARING'), sub: t('ARENA · NO RUN') };
}

export function createHud({ bus, world, stage, cosmetic = null, scene = null }) {
  const style = document.createElement('style');
  style.id = 'hud-style';
  style.textContent = hudCss();
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'hud';

  // §17 portraits: real class models, rendered once at load.
  const portraits = renderClassPortraits({ cosmetic });

  const banner = createBanner();
  root.appendChild(banner.el);

  // Corner plates (Reference D): location label top-left, Glint counter
  // top-right. Same §17 grammar as every other plate — charcoal, warm-grey
  // chrome, parchment ink, Pale Gold reserved for the currency (§14).
  const loc = document.createElement('div');
  loc.className = 'hud-loc';
  loc.appendChild(iconEl('marker', { size: 30, cls: 'hud-loc-ico' }));
  const locText = document.createElement('div');
  locText.className = 'hud-loc-text';
  const locName = document.createElement('div');
  locName.className = 'hud-loc-name';
  const locSub = document.createElement('div');
  locSub.className = 'hud-loc-sub';
  locText.append(locName, locSub);
  loc.appendChild(locText);
  root.appendChild(loc);

  const glint = document.createElement('div');
  glint.className = 'hud-glint';
  const coin = document.createElement('span');
  coin.className = 'hud-glint-coin';
  coin.appendChild(iconEl('coin', { size: 26 }));
  const glintNum = document.createElement('span');
  glintNum.className = 'hud-glint-num';
  glintNum.textContent = '0';
  const glintLab = document.createElement('span');
  glintLab.className = 'hud-glint-lab';
  glintLab.textContent = t('GLINT');
  glint.append(coin, glintNum, glintLab);
  root.appendChild(glint);
  let locKey = '';
  let glintShown = -1;

  const bar = createCommandBar({
    bus,
    world,
    portraits,
    onSelect: (i) => world.cmd('healOverride', i),
  });
  root.appendChild(bar.el);

  const threat = createThreatLayer({ stage, world, bus });

  document.body.appendChild(root);
  document.body.appendChild(threat.el);

  // ------------------------------------------------------------- scale ---
  let scale = 1;
  let fitScale = 1;
  function layout() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    fitScale = Math.min(W / 1920, H / 1080);
    scale = Math.max(fitScale, MIN_SCALE);
    const s = scale > 0 ? scale : 1;
    root.style.setProperty('--s', String(s));
    // The virtual canvas is centred on the window, so its bottom edge sits at
    // real y = H/2 + 540*s and its top edge at H/2 - 540*s. Solve for the
    // virtual offsets that put each zone a fixed real distance from the
    // WINDOW edge (identical to a plain 20 px virtual inset whenever the
    // canvas is letterboxed by height, i.e. whenever s == H/1080).
    root.style.setProperty('--zb', `${((540 * s - H / 2 + BAR_EDGE_PX) / s).toFixed(2)}px`);
    root.style.setProperty('--zt', `${((540 * s - H / 2 + BANNER_EDGE_PX) / s).toFixed(2)}px`);
    // Same solve horizontally for the corner plates: when the scale is
    // clamped the canvas is wider than the window, so a plate at virtual x=0
    // would sit off-screen. --zx puts it CORNER_EDGE_PX real px in from the
    // window side instead.
    root.style.setProperty('--zx', `${((960 * s - W / 2 + CORNER_EDGE_PX) / s).toFixed(2)}px`);
    publishZones();
  }

  // The threat layer keeps its pointers off BOTH HUD zones (and docks a
  // pointer that would land on one onto that zone's rim), so a cue is never
  // hidden under the chrome it is warning about and never floats in open
  // grass. The rectangles are real window px — the threat layer lives outside
  // the 1080p scaler.
  // COST. getBoundingClientRect forces a synchronous layout of the whole
  // 1920x1080 virtual canvas, so this must NOT run per frame. The two zone
  // rectangles only move on resize or when the banner changes what it says,
  // and banner.update() reports exactly that, so the rects are read on those
  // two edges only.
  const zoneList = [];
  function publishZones() {
    const b1 = bar.el.getBoundingClientRect();
    const b2 = banner.el.getBoundingClientRect();
    zoneList.length = 0;
    zoneList.push({
      x: b1.x,
      y: b1.y,
      w: b1.width,
      h: window.innerHeight - b1.y,
      edge: 'bottom',
    });
    const bnLive = banner.isVisible() && b2.width > 1;
    if (bnLive) {
      zoneList.push({ x: b2.x, y: 0, w: b2.width, h: b2.y + b2.height, edge: 'top' });
    }
    // NARROW-WINDOW COLLISION (§1 "no layout breakage at any aspect"). Zone 2
    // is centred on the WINDOW while the corner plates are pinned to the
    // window's sides, so below ~1200 px of width the boss plate — the widest
    // banner — runs into the location plate (measured: 87 px of overlap at
    // 1024x576). The location plate then DROPS one row, under the banner:
    // nothing is clipped, nothing is truncated, and the two never overlap.
    // Dropping changes only `top`, so this test cannot oscillate.
    const lr0 = loc.getBoundingClientRect();
    const clash = bnLive && lr0.width > 1 && lr0.x + lr0.width + 8 > b2.x;
    if (clash) root.style.setProperty('--bnH', `${(b2.height / (scale || 1) + 10).toFixed(1)}px`);
    loc.classList.toggle('hud-loc-drop', clash);
    // The corner plates are chrome too: a pointer must never hide under them.
    for (const n of [loc, glint]) {
      const r = n.getBoundingClientRect();
      if (r.width > 1) zoneList.push({ x: r.x, y: 0, w: r.width, h: r.y + r.height, edge: 'top' });
    }
    threat.setZones(zoneList);
  }
  layout();
  window.addEventListener('resize', layout);

  // Zone 2 must fade in/out INSIDE 300 ms of the room event that caused it.
  // The room snapshot is otherwise polled at 10 Hz (it is the heavy call), so
  // every room-lifecycle event invalidates the poll and the banner re-reads on
  // the very next frame: reaction latency ~1 frame + a 240 ms CSS fade.
  const ROOM_EVENTS = [
    'room_start',
    'room_cleared',
    'room_soft_fail',
    'room_enter',
    'room_transition',
    'level_transit', // CAMPAIGN: the level-clear card hides the combat chrome at once
    'level_start',
  ];
  // Run-end edges (round D, camp critic F2 / run critic F6): the banner,
  // the threat pointers and the bar's own combat residue are cleared IN THE
  // SAME JS TURN as the event, before the end card can paint over a live
  // "WAVE 2/2" banner, and independently of whether the sim's wave director
  // has actually stopped (it leaked enemies after run_end in round D).
  const END_EVENTS = ['run_end', 'run_wiped', 'return_to_camp'];

  // ------------------------------------------------------------ update ---
  const members = [null, null, null, null];
  const channels = new Map();
  // §17: a slot carrying a GREY-verdict socketed node wears a persistent
  // hollow-icon + diagonal-strike marker. The verdicts are sim truth
  // (§15.5, sim/nodes.js), polled with the room state — they only change
  // between rooms, when `combat_active == false`.
  const greySkills = new Set();
  let room = null;
  let bossEntity = null;
  let runBoss = null;
  let roomPollAt = 0;
  // PHASE GATE. Zone 2 and the threat layer are combat chrome and exist only
  // while the run system says a room is in combat (kill_all / defend / boss).
  // Outside a run the sim reports no active run and the gate is closed — a
  // stray enemy, a stale wave schedule or a live `stag` entity cannot open
  // it. Inside a run, a wave room that a probe restarted while the run sits
  // on a meta page (waves.startRoom via cmd) still counts as combat.
  let combat = false;
  function readCombat() {
    const rs = world.runSystem?.();
    if (!rs) return !!(room && !room.cleared);
    // Mirror the sim's own spawn predicate (run.js combatAllowed): a live,
    // uncleared wave room counts as combat even before any run has started —
    // that is exactly the `?room=kill_all` harness boot docs/TESTING.md
    // sanctions. `everStarted` stays true after any run, so the reward /
    // end-card / camp gate cannot reopen through this branch.
    // The pre-run branch is scoped to the arena boot: in the CAMP scene the
    // only thing that can create an uncleared room before a run is a debug
    // `startRoom`, and the gate must stay shut over the campfire even then
    // (D3 HUD A1). A real run in the camp scene lights up through
    // combatActive(), so this never touches player-reachable combat.
    const allowed =
      scene !== 'camp' && typeof rs.combatAllowed === 'function' ? rs.combatAllowed() : false;
    return !!(rs.combatActive() || (allowed && room && !room.cleared));
  }

  function pollRoom(nowMs) {
    roomPollAt = nowMs + ROOM_POLL_MS;
    const snap = world.snapshotState();
    room = snap.room;
    // Room 8 (run block): the run system's own boss view carries the name
    // plate and the live/cleared flags, so it wins over the raw entity scan.
    const b = snap.run && snap.run.boss;
    runBoss =
      b && b.active && !b.cleared
        ? { name: b.name, kind: b.kind ?? 'stag', hp: b.hp, maxHp: b.maxHp, adds: b.adds, phasesFired: b.phasesFired ?? 0 }
        : null;
    // Corner plates read the same run view the meta pages draw from.
    const rv = snap.run ?? null;
    const copy = locationCopy(scene, rv);
    const k = `${copy.name}|${copy.sub}`;
    if (k !== locKey) {
      locKey = k;
      locName.textContent = copy.name;
      locSub.textContent = copy.sub;
      publishZones();
    }
    // The viewer's own Glint: a seat other than the Healer's reads its purse.
    const seat = viewerSeat();
    const own = rv && Array.isArray(rv.purses) && typeof rv.purses[seat] === 'number' ? rv.purses[seat] : rv && rv.wallet;
    const wallet = typeof own === 'number' ? Math.max(0, Math.round(own)) : 0;
    if (wallet !== glintShown) {
      glintShown = wallet;
      glintNum.textContent = String(wallet);
    }
    greySkills.clear();
    for (const sk of snap.build?.skills ?? []) {
      if (sk.sockets?.some((r) => r && r.verdict === 'grey')) greySkills.add(sk.id);
    }
  }

  // Re-read and repaint the banner IN THE SAME JS TURN as the room event, so
  // the 150 ms CSS fade is the whole of the <=300 ms budget.
  for (const ev of ROOM_EVENTS) {
    bus.on(ev, () => {
      pollRoom(performance.now());
      combat = readCombat();
      if (banner.update(room, combat ? runBoss ?? bossEntity : null, combat)) publishZones();
    });
  }
  function endCombatChrome() {
    combat = false;
    room = null;
    runBoss = null;
    bossEntity = null;
    banner.hide();
    threat.clear();
    bar.endRun();
    publishZones();
  }
  for (const ev of END_EVENTS) bus.on(ev, endCombatChrome);

  // A/B switch for frame-cost probes only (tools/actions/hd-fps-ab.json):
  // when off, the whole HUD update is skipped and the overlay is hidden, so a
  // capture can measure what the HUD actually costs per frame.
  let enabled = true;

  // --- boot warm-up (certification fix D-r3 S1, see commandbar.prewarmFrame,
  // the banner modes below, threat.prewarm and render/numbers.prewarm). The
  // compositor compiles a raster pipeline the first time a session draws a
  // new CSS effect; measured on the shop shelf at 300-600 ms of GPU time with
  // the main thread free, and the same signature landed 145-380 ms into the
  // first fight at the first off-screen telegraph pointer. For three frames
  // ~18 frames after boot, the whole HUD is switched to 2/1000 opacity and
  // every combat state is painted at once: boss / defend / kill_all banners,
  // critical + downed + shaken + rallied portraits, cooling + counting +
  // ready + denied slots, six threat pointers, five numerals.
  const WARM_WAIT = 18;
  const WARM_FRAMES = 6; // round 4: long enough for the partial-repaint (msaa-load) variants too
  let warmWait = WARM_WAIT;
  let warmLeft = 0;
  let warmStarted = false;
  let warmEndPending = false;
  let warmRestore = false;
  let warmOnEnd = null; // rewarm(): called on the frame the warm paint ends
  const WARM_ROOMS = [
    null, // frame 0: the boss plate (WARM_BOSS)
    { cleared: false, mode: 'defend', waystone: { hp: 96, maxHp: 150 }, defendTicksLeft: 9 * 60, softFailed: false },
    { cleared: false, mode: 'kill_all', wavesTotal: 3, waveIndex: 1, aliveEnemies: 4, pendingSpawns: 1 },
  ];
  const WARM_BOSS = { name: 'The Hollow Stag', hp: 913, maxHp: 1800, phasesFired: 2, adds: 2 };
  function warmTick() {
    if (warmEndPending) {
      // The frame after the last warm frame: the real update below repaints
      // truth, and the opacity comes back once that is done.
      warmEndPending = false;
      warmRestore = true;
      bar.prewarmEnd();
      banner.reset();
      try { performance.mark('hudwarm-end'); } catch (e) { /* trace marker only */ }
      if (warmOnEnd) {
        const fn = warmOnEnd;
        warmOnEnd = null;
        try { fn(); } catch (e) { /* the caller's own cleanup */ }
      }
      return false;
    }
    if (!warmStarted) {
      if (--warmWait > 0) return false;
      warmStarted = true;
      warmLeft = WARM_FRAMES;
      threat.prewarm(WARM_FRAMES);
      try { performance.mark('hudwarm-start'); } catch (e) { /* trace marker only */ }
    }
    return warmLeft > 0;
  }
  function warmPaint() {
    const k = WARM_FRAMES - warmLeft;
    root.style.opacity = '0.002';
    root.style.transition = 'none';
    bar.prewarmFrame(k);
    const r = WARM_ROOMS[k % WARM_ROOMS.length];
    banner.update(r, r ? null : WARM_BOSS, true);
    warmLeft -= 1;
    if (warmLeft === 0) warmEndPending = true;
  }

  function update(nowMs) {
    if (!enabled) return;
    const now = nowMs / 1000;
    const entities = world.entities();
    const warming = warmTick();

    members[0] = members[1] = members[2] = members[3] = null;
    bossEntity = null;
    for (const e of entities) {
      if (e.partyIndex !== undefined && (e.kind === 'player' || e.kind === 'ally')) {
        members[e.partyIndex] = e;
      } else if ((e.kind === 'stag' || e.boss === true) && e.hp > 0) {
        bossEntity = { name: bossName(e.kind), kind: e.kind, hp: e.hp, maxHp: e.maxHp };
      }
    }

    channels.clear();
    const src = world.allySystem?.().getChannels?.();
    if (src) for (const ch of src.values()) channels.set(ch.targetId, ch);

    bar.update(now, { members, channels, tick: world.tick, greySkills });

    if (nowMs >= roomPollAt) pollRoom(nowMs);
    combat = readCombat();
    // The banner reports when it actually repainted; only then can its zone
    // rectangle have moved.
    if (banner.update(room, combat ? runBoss ?? bossEntity : null, combat)) publishZones();

    threat.update(now, entities, combat);
    if (warming) warmPaint();
    else if (warmRestore) {
      warmRestore = false;
      root.style.opacity = '';
      root.style.transition = '';
    }
  }

  // ------------------------------------------------------------- debug ---
  // Real px a reader sees = the node's computed font-size x the HUD scale.
  function measuredPx(sel, fallbackVirtual) {
    const node = root.querySelector(sel);
    const virtual = node ? parseFloat(getComputedStyle(node).fontSize) : fallbackVirtual;
    return Math.round(virtual * scale * 100) / 100;
  }

  const debug = {
    ...bar.debug,
    // Round D phase gate: what the HUD believes about combat right now.
    combat: () => ({
      combat,
      runActive: !!world.runSystem?.()?.isActive(),
      combatActive: !!world.runSystem?.()?.combatActive(),
      roomLive: !!(room && !room.cleared),
      bannerMode: banner.debug.state().mode,
      threatNodes: threat.el.querySelectorAll('.tm').length,
    }),
    banner: banner.debug.state,
    boss: banner.debug.boss,
    bossPlate: banner.debug.plate,
    project: threat.debug.project,
    // Corner plates: what they say + real-px boxes.
    loc: () => {
      const r = loc.getBoundingClientRect();
      const g = glint.getBoundingClientRect();
      return {
        name: locName.textContent,
        sub: locSub.textContent,
        glint: glintNum.textContent,
        locBox: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        glintBox: { x: Math.round(g.x), y: Math.round(g.y), w: Math.round(g.width), h: Math.round(g.height) },
        realLocPx: measuredPx('.hud-loc-sub', FS_KEY),
        realGlintPx: measuredPx('.hud-glint-num', FS_NUM),
        coinRealPx: Math.round(coin.getBoundingClientRect().width * 10) / 10,
      };
    },
    threat: threat.debug.audit,
    markers: threat.debug.markers,
    threatHits: threat.debug.hits,
    zones: () => {
      publishZones();
      return threat.debug.audit().zones;
    },
    relayout: layout,
    setEnabled: (on) => {
      enabled = !!on;
      root.style.display = enabled ? '' : 'none';
      threat.el.style.display = enabled ? '' : 'none';
      return enabled;
    },
    // Zone budget + type floors in REAL pixels, the way criterion 4 measures.
    metrics: () => {
      const b1 = bar.el.getBoundingClientRect();
      const b2 = banner.el.getBoundingClientRect();
      const bannerVisible = Number(getComputedStyle(banner.el).opacity) > 0.01;
      const zone1 = b1.height;
      const zone2 = bannerVisible ? b2.height : 0;
      return {
        window: { w: window.innerWidth, h: window.innerHeight },
        scale: Math.round(scale * 10000) / 10000,
        fitScale: Math.round(fitScale * 10000) / 10000,
        clamped: scale > fitScale + 1e-6,
        zone1: Math.round(zone1 * 10) / 10,
        zone2: Math.round(zone2 * 10) / 10,
        zonePctOfHeight: Math.round(((zone1 + zone2) / window.innerHeight) * 10000) / 100,
        zone1Box: {
          x: Math.round(b1.x),
          y: Math.round(b1.y),
          w: Math.round(b1.width),
          h: Math.round(b1.height),
        },
        zone2Box: {
          x: Math.round(b2.x),
          y: Math.round(b2.y),
          w: Math.round(b2.width),
          h: Math.round(b2.height),
        },
        // Virtual px * scale = the real px a reader sees. Measured off the
        // live computed style of an actual node, not off the constants.
        realTextPx: measuredPx('.hud-bn-label', FS_LAB),
        realKeyPx: measuredPx('.hud-slot-key', FS_KEY),
        realNumeralPx: measuredPx('.hud-slot-num', FS_NUM),
        centreClear: {
          // vertical band left free between the two zones
          top: Math.round(b2.y + (bannerVisible ? b2.height : 0)),
          bottom: Math.round(b1.y),
        },
      };
    },
    // Plate/ink colours as rendered — proof the HUD never tints (criterion 4).
    chrome: () => {
      const cs = getComputedStyle(bar.el);
      const slot = bar.el.querySelector('.hud-slot');
      const slotCs = slot ? getComputedStyle(slot) : null;
      const port = bar.el.querySelector('.hud-port-tile');
      return {
        barBackground: cs.backgroundImage.slice(0, 120),
        barBorder: cs.borderTopColor,
        slotBackground: slotCs ? slotCs.backgroundColor : null,
        slotField: slotCs ? slotCs.backgroundImage.slice(0, 120) : null,
        slotColor: slot ? getComputedStyle(slot.querySelector('.hud-slot-abbrev')).color : null,
        portraitPlate: port ? getComputedStyle(port).backgroundImage.slice(0, 120) : null,
      };
    },
  };

  // @gnt:M2 RESTORE-RESYNC begin — a load is a room / run boundary the HUD
  // never saw: drop the combat chrome of the moment that left (banner,
  // threat pointers, the bar's combat residue, the revive-channel mirror),
  // then re-read the restored room in the same JS turn (as ROOM_EVENTS do).
  bus.on('state_restored', () => {
    endCombatChrome();
    channels.clear();
    pollRoom(performance.now());
    combat = readCombat();
    if (banner.update(room, combat ? runBoss ?? bossEntity : null, combat)) publishZones();
  });
  // @gnt:M2 RESTORE-RESYNC end
  // gauntlet r4 J4-F1 (INT): the boot warm-up above runs ~18 frames after
  // load. On a TITLE boot that is under the title's `ap-hide-game` rule
  // (visibility: hidden), so the compositor never rasterised a warm frame and
  // the first cooldown wipe / slot flash of the first fight paid the GPU
  // raster pipeline compile instead (242-267 ms frames, 0.6-0.9 s into Level 1
  // room 1, once per fresh browser). `rewarm` re-runs the same warm paint
  // when the caller has made the HUD paintable (main.js @gnt:INT-WIRING);
  // `onEnd` fires on the frame the warm paint ends, before the real repaint.
  function rewarm({ onEnd = null } = {}) {
    warmWait = 1;
    warmStarted = false;
    warmLeft = 0;
    warmEndPending = false;
    warmOnEnd = onEnd;
    return WARM_FRAMES;
  }

  return { update, debug, el: root, scale: () => scale, rewarm };
}
