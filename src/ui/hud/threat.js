// OFF-SCREEN THREAT INDICATORS — the camera-legibility fix.
//
// The 3/4 rig (52 deg elevation, 12 u out, 45 deg fov) frames roughly 17 u of
// the 24 x 16 u arena, and §11 spawns waves at arena-EDGE points, so a wave can
// arrive, telegraph and shoot from outside the frame. Measured on this build
// (tools/actions/hd-threat.json): with the player at the arena centre, 5 of the
// 8 §11 edge spawn points project outside the safe frame.
//
// Rather than pulling the camera back — which would shrink the chibi party the
// whole art bar is built around, and whose constants live outside this block —
// every threat outside the safe frame gets a pointer welded to the frame edge:
//
//   * living enemy off-frame      -> Bone arrowhead on an opaque charcoal disc
//   * that enemy is telegraphing  -> Ember Danger head + 2 Hz opacity pulse
//                                    (§11's ONLY sanctioned red-orange: an
//                                    enemy telegraph)
//   * incoming spawn telegraph    -> HOLLOW God-stuff Violet head + centre dot
//                                    (§11 spawn shimmer is violet, not Ember)
//   * the Tab-marked enemy        -> Signal Blue ring (glyph/ink, never a fill)
//
// The three classes differ in SHAPE as well as colour (§19.1 colour-blind
// fence): solid head / solid head + pulse / hollow head + dot.
//
// This layer lives OUTSIDE the 1080p scaler, in real window pixels, because it
// is world-anchored: a pointer must sit exactly on the window edge at any
// resolution, and its 42 px chip must stay 42 real px so it never shrinks below
// a readable size on a small window.
//
// COST. The render path allocates nothing per frame: threat records are reused
// slots, the per-threat audit objects are built only when a probe asks for
// them, and the sim's `pendingSpawns()` copies (a fresh array every call) are
// polled at 10 Hz — a §11 spawn shimmer lasts 0.8 s.
import { Vector3 } from 'three';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_MARKERS = 14;
const ENEMY_KINDS = new Set(['boar', 'mantis', 'wisp', 'dummy', 'stag']);
const EDGE_INSET = 24; // px from the window edge to the marker centre
const HYSTERESIS = 16; // px a marker must travel back inside before it clears
const SPAWN_POLL_MS = 100;

function makeMarker() {
  const wrap = document.createElement('div');
  wrap.className = 'tm';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42');
  const plate = document.createElementNS(SVG_NS, 'circle');
  plate.setAttribute('class', 'tm-plate');
  plate.setAttribute('cx', '20');
  plate.setAttribute('cy', '21');
  plate.setAttribute('r', '17');
  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('class', 'tm-ring');
  ring.setAttribute('cx', '20');
  ring.setAttribute('cy', '21');
  ring.setAttribute('r', '14.6');
  // A chunky arrowhead whose tip breaks the plate's edge, so the chip reads as
  // a POINTER at 42 px and not as a dot with a mark in it.
  const head = document.createElementNS(SVG_NS, 'path');
  head.setAttribute('class', 'tm-head');
  head.setAttribute('d', 'M40 21 L11 6.5 L17 21 L11 35.5 Z');
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', 'tm-dot');
  dot.setAttribute('cx', '15');
  dot.setAttribute('cy', '21');
  dot.setAttribute('r', '3.6');
  dot.style.display = 'none';
  svg.append(plate, ring, head, dot);
  wrap.appendChild(svg);
  return { wrap, head, ring, dot, cls: 'tm' };
}

export function createThreatLayer({ stage, world }) {
  const root = document.createElement('div');
  root.id = 'hud-threat';

  const pool = [];
  const live = []; // reused records — the render path allocates nothing
  let liveCount = 0;
  let shown = new Map(); // key -> "outside the safe frame", for hysteresis
  let shownNext = new Map();
  const v = new Vector3();

  let spawnCache = [];
  let spawnPollAt = 0;

  // Safe frame: the window minus a margin, minus the Zone-1 command bar strip
  // at the bottom, so a pointer never hides under the HUD it is warning about.
  let barBottomPx = 150;
  const setBarHeight = (px) => {
    barBottomPx = px;
  };

  function project(x, y, z, w, h) {
    v.set(x, y, z).project(stage.camera);
    const behind = v.z > 1;
    const nx = behind ? -v.x : v.x;
    const ny = behind ? -v.y : v.y;
    return { sx: (nx * 0.5 + 0.5) * w, sy: (-ny * 0.5 + 0.5) * h, behind };
  }

  function acquire(i) {
    if (!pool[i]) {
      pool[i] = makeMarker();
      root.appendChild(pool[i].wrap);
    }
    return pool[i];
  }

  function slotAt(i) {
    if (!live[i]) live[i] = {};
    return live[i];
  }

  // The single scan both the render path and the debug audit run. `audit` is
  // null on the render path; pass an array to collect the per-threat evidence.
  function scan(entities, audit) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    const rect = {
      l: EDGE_INSET,
      r: w - EDGE_INSET,
      t: EDGE_INSET,
      b: h - Math.max(EDGE_INSET, barBottomPx),
    };
    if (rect.b <= rect.t) rect.b = h - EDGE_INSET;

    const px = world.player.x;
    const pz = world.player.z;
    const markRaw = world.allySystem?.().getMark?.() ?? null;
    const markId = typeof markRaw === 'object' && markRaw ? markRaw.id : markRaw;

    liveCount = 0;
    shownNext.clear();

    const push = (key, x, z, kind, telegraph, spawn, marked) => {
      const p = project(x, 0.45, z, w, h);
      // Hysteresis: a marker appears once the threat leaves the safe frame and
      // only clears once it is HYSTERESIS px back inside, so a threat hovering
      // on the boundary does not strobe.
      const wasShown = shown.get(key) === true;
      const pad = wasShown ? HYSTERESIS : 0;
      const inside =
        !p.behind &&
        p.sx >= rect.l + pad &&
        p.sx <= rect.r - pad &&
        p.sy >= rect.t + pad &&
        p.sy <= rect.b - pad;
      shownNext.set(key, !inside);
      if (audit) {
        audit.push({
          key,
          kind,
          x: Math.round(x * 100) / 100,
          z: Math.round(z * 100) / 100,
          sx: Math.round(p.sx),
          sy: Math.round(p.sy),
          behind: p.behind,
          onScreen: !p.behind && p.sx >= 0 && p.sx <= w && p.sy >= 0 && p.sy <= h,
          inSafeFrame: inside,
          marker: !inside,
        });
      }
      if (inside) return;
      const dx = p.sx - cx;
      const dy = p.sy - cy;
      // Clamp the ray centre->threat onto the safe rectangle.
      let t = 1;
      if (dx > 0) t = Math.min(t, (rect.r - cx) / dx);
      else if (dx < 0) t = Math.min(t, (rect.l - cx) / dx);
      if (dy > 0) t = Math.min(t, (rect.b - cy) / dy);
      else if (dy < 0) t = Math.min(t, (rect.t - cy) / dy);
      t = Math.max(0, Math.min(1, t));
      const rec = slotAt(liveCount++);
      rec.key = key;
      rec.x = cx + dx * t;
      rec.y = cy + dy * t;
      rec.angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      rec.dist = Math.hypot(x - px, z - pz);
      rec.telegraph = telegraph;
      rec.spawn = spawn;
      rec.marked = marked;
    };

    for (const e of entities ?? world.entities()) {
      if (!ENEMY_KINDS.has(e.kind)) continue;
      if (!(e.hp > 0)) continue;
      if (e.state === 'retreat' || e.state === 'dead') continue;
      push('e' + e.id, e.x, e.z, e.kind, !!e.telegraph, false, markId === e.id);
    }
    for (const sp of spawnCache) {
      push('s' + sp.wave + ':' + sp.x + ',' + sp.z, sp.x, sp.z, sp.etype, false, true, false);
    }

    // Swap, so `shown` only ever holds the keys seen by this scan (dead
    // entities drop out instead of accumulating).
    const tmp = shown;
    shown = shownNext;
    shownNext = tmp;

    // Nearest-first, so the MAX_MARKERS cap drops the least urgent pointers.
    if (liveCount > 1) {
      const head = live.slice(0, liveCount).sort((a, b) => a.dist - b.dist);
      for (let i = 0; i < liveCount; i++) live[i] = head[i];
    }
  }

  function update(now, entities) {
    const nowMs = now * 1000;
    if (nowMs >= spawnPollAt) {
      spawnPollAt = nowMs + SPAWN_POLL_MS;
      spawnCache = world.pendingSpawns?.() ?? [];
    }
    scan(entities, null);

    const n = Math.min(liveCount, MAX_MARKERS);
    // Ember pulse for telegraphing threats: 2 Hz, matching the §11 ground decal.
    const pulse = 0.55 + 0.45 * (0.5 - 0.5 * Math.cos(2 * Math.PI * 2 * now));
    for (let i = 0; i < n; i++) {
      const m = acquire(i);
      const d = live[i];
      m.wrap.style.display = 'block';
      m.wrap.style.transform =
        'translate(' + d.x.toFixed(1) + 'px, ' + d.y.toFixed(1) + 'px) rotate(' + d.angle.toFixed(1) + 'deg)';
      const cls =
        'tm' + (d.telegraph ? ' telegraph' : '') + (d.spawn ? ' spawn' : '') + (d.marked ? ' marked' : '');
      if (m.cls !== cls) {
        m.cls = cls;
        m.wrap.className = cls;
        m.dot.style.display = d.spawn ? 'block' : 'none';
      }
      m.wrap.style.opacity = d.telegraph ? pulse.toFixed(3) : '1';
    }
    for (let i = n; i < pool.length; i++) pool[i].wrap.style.display = 'none';
  }

  return {
    el: root,
    update,
    setBarHeight,
    debug: {
      // Criterion 6 evidence: for EVERY live threat, is it in frame, and if not
      // does it have a frame-edge pointer? Re-runs the scan on demand, so the
      // render path never pays for the audit objects.
      audit: () => {
        const rows = [];
        spawnCache = world.pendingSpawns?.() ?? [];
        scan(null, rows);
        return {
          window: { w: window.innerWidth, h: window.innerHeight },
          threats: rows,
          offFrame: rows.filter((a) => !a.inSafeFrame).length,
          markersDrawn: liveCount,
          uncued: rows.filter((a) => !a.inSafeFrame && !a.marker).length,
        };
      },
      markers: () =>
        live.slice(0, Math.min(liveCount, MAX_MARKERS)).map((d) => ({
          key: d.key,
          x: Math.round(d.x),
          y: Math.round(d.y),
          angle: Math.round(d.angle),
          telegraph: d.telegraph,
          spawn: d.spawn,
          marked: d.marked,
        })),
    },
  };
}
