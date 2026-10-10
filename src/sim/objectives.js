// ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md, content plan 2 slice 2): two
// combat objectives beside kill_all and defend.
//
//   hunt   A marked QUARRY (one of the act's own enemies, made elite) breaks
//          cover with the first wave and flees through the room. It never
//          attacks; it runs from the party between waypoints and stops to
//          catch its breath every few seconds (the window a melee hero
//          needs). Kill it before its escape timer runs out and the room is
//          won (the waves still standing retreat, as in a defend clear). If
//          it escapes, the room soft-fails like a lost Waystone: the reward
//          is forfeited and the rest of the waves must be cleared.
//   purge  Three corruption NESTS stand in the room and keep spawning the
//          act's enemies on a timer (faster once wounded). An opening wave
//          guards them. Destroy all three and the room is won. If the purge
//          timer runs out first the corruption takes root: the reward is
//          forfeited, and the nests (and everything they have spawned) must
//          still be destroyed to leave.
//   escort A lost PILGRIM (the event room's lantern-bearer, now walking)
//          crosses the room along a road picked around the layout's props,
//          from beside the party to the far side. It walks while a party
//          member stays near, and waits (calling out) when left alone. The
//          waves hunt it like any party body. It arrives: the room is won
//          (the waves still standing retreat). It falls: the room soft-fails
//          like a lost Waystone and the rest of the waves must be cleared.
//   hold   A SIGIL RING burns on the floor. While a party member stands in it
//          it stays lit; left empty it fades and goes out after a few
//          seconds. An opening wave comes, then three rifts on the room's edge
//          send the act's enemies on a timer (faster in the last stretch).
//          Keep it lit until the timer ends and the room is won. If it goes
//          out the room soft-fails: the rifts close and what is left must
//          still be cleared.
//
// WHERE: campaign runs only (Endless included), never the tutorial and never
// the legacy single-level run, so the nine goldens never meet one. Rooms 4
// to 6 only: a kill_all room there becomes an objective room. The first
// level of a campaign gets one, every later level two of different kinds.
// Which rooms and which kinds come from a hash of the level's frame seed and
// index, not from the run stream, so every other roll of a campaign is
// unchanged.
//
// Success pays a small bounty on top of the room's usual stipend, spoils and
// draft. Sim only: no DOM, no i18n (the UI translates the English names).
import { fnv1a64Hex } from '../core/hash.js';
import { innerBounds, walkStep, staticClearance, blockerClearance } from './movement.js';
import { TICK_HZ } from '../core/constants.js';

const TICK_DT = 1 / TICK_HZ;

export const OBJECTIVE_MODES = Object.freeze(['hunt', 'purge', 'escort', 'hold']);
export const isObjectiveMode = (m) => m === 'hunt' || m === 'purge' || m === 'escort' || m === 'hold';

export const OBJECTIVE_RULES = Object.freeze({
  fromRoom: 4, // rooms 4-6 only
  firstLevel: 1, // objective rooms on a campaign's first level
  laterLevels: 2, // ...and on every later one (two different kinds)
  bounty: 10, // Glint for an objective won (not on a soft-fail)
  hunt: Object.freeze({
    budgetMul: 0.7, // the hunt's waves are lighter than a kill_all's
    hp: 240, // the quarry's HP at hpMul 1 (scaled by the room's hpMul)
    escapeTicks: 40 * 60, // it escapes this long after it breaks cover
    warnTicks: 10 * 60, // the HUD timer warns for the last 10 s
    speed: 2.2, // u/s (the Healer walks 2.4)
    runTicks: 300, // it runs for 5 s...
    restTicks: 84, // ...then is winded for 1.4 s
    panicU: 2.2, // a party body this close pushes it straight away
    retargetTicks: 24, // its waypoint is re-scored this often
    stuckTicks: 40, // moving < 25% of a step this long -> new waypoint
  }),
  purge: Object.freeze({
    nests: 3,
    hp: 150, // each nest's HP at hpMul 1 (scaled by the room's hpMul)
    radius: 0.62,
    openingBudgetMul: 0.8, // one opening wave guards the nests
    timerTicks: 75 * 60, // the corruption takes root after 75 s
    warnTicks: 15 * 60,
    firstSpawnTicks: 150, // nests first spawn 2.5 s after the room starts...
    staggerTicks: 90, // ...1.5 s apart
    cadenceTicks: 390, // then one enemy each every 6.5 s
    woundedCadenceTicks: 270, // 4.5 s once a nest is below half HP
    childCap: 2, // a nest waits while 2 of its own spawns live
    spawnsPerNest: 16, // pre-rolled spawn list per nest (cycled)
  }),
  escort: Object.freeze({
    budgetMul: 0.65, // the escort's waves are lighter than a kill_all's
    hp: 170, // the pilgrim's HP at hpMul 1 (scaled by the room's hpMul)
    radius: 0.4,
    speed: 1.0, // u/s, a tired walker (the party walks 2.4)
    startTicks: 90, // it sets off 1.5 s into the room
    nearU: 4.5, // it walks while a party member is this close...
    waitTicks: 30, // ...and waits once nobody has been for 0.5 s
    flinchTicks: 14, // a blow stops it for a beat
    arriveU: 0.3, // at a road point when this close
    stuckTicks: 60, // pinned this long -> on to the next road point
  }),
  hold: Object.freeze({
    radius: 2.6, // the sigil ring
    openingBudgetMul: 0.8, // one opening wave
    timerTicks: 75 * 60, // keep it lit for 75 s (a purge's clock)
    warnTicks: 15 * 60,
    fadeTicks: 4 * 60, // empty this long and it goes out
    relight: 2, // standing in it wins the fade back twice as fast
    rifts: 3,
    firstSpawnTicks: 150, // the rifts first open 2.5 s in...
    staggerTicks: 90, // ...1.5 s apart (the purge's spawn timer)
    cadenceTicks: 540, // then one enemy each every 9 s
    surgeCadenceTicks: 360, // 6 s in the surge...
    surgeTicks: 20 * 60, // ...the last 20 s
    childCap: 2, // a rift waits while 2 of its own spawns live
    spawnsPerRift: 16, // pre-rolled spawn list per rift (cycled)
  }),
});

// The quarry each act sends: a fast or sturdy body that reads well running.
export const QUARRY = Object.freeze({ 1: 'boar', 2: 'crab', 3: 'ram', 4: 'husk' });
export const quarryFor = (act) => QUARRY[act] ?? 'boar';

// Waypoints the quarry runs between (inside every layout's walkable field).
export const QUARRY_WAYPOINTS = Object.freeze([
  [-9, -5],
  [-4.5, -5.6],
  [0, -5.8],
  [4.5, -5.6],
  [9, -5],
  [-9.6, 0],
  [9.6, 0],
  [-9, 5],
  [-4.5, 5.6],
  [0, 5.8],
  [4.5, 5.6],
  [9, 5],
]);

const hash32 = (s) => parseInt(fnv1a64Hex(s).slice(0, 8), 16) >>> 0;

// Turn kill_all rooms of a level's frame into objective rooms (in place).
// Returns the rooms changed: [{ room, mode }]. No run-stream draws.
export function assignObjectives(modes, seed, index) {
  const R = OBJECTIVE_RULES;
  const cands = [];
  for (let r = R.fromRoom; r <= 6; r++) if (modes[r - 1] === 'kill_all') cands.push(r);
  const want = Math.min(cands.length, index >= 2 ? R.laterLevels : R.firstLevel);
  if (want <= 0) return [];
  let h = hash32(`${seed >>> 0}:${index | 0}:OBJV`);
  const picks = [];
  const pool = [...cands];
  for (let i = 0; i < want; i++) {
    const k = h % pool.length;
    picks.push(pool.splice(k, 1)[0]);
    h = Math.floor(h / 7) + 0x9e37;
  }
  picks.sort((a, b) => a - b);
  // ESCORT AND HOLD: four kinds; the second room of a level never repeats
  // the first's kind.
  const K = OBJECTIVE_MODES;
  const k = hash32(`${seed >>> 0}:${index | 0}:KIND4`);
  const first = k % K.length;
  const second = (first + 1 + (Math.floor(k / K.length) % (K.length - 1))) % K.length;
  const out = [];
  picks.forEach((room, i) => {
    const mode = K[i === 0 ? first : second];
    modes[room - 1] = mode;
    out.push({ room, mode });
  });
  return out;
}

// ------------------------------------------------------------- ESCORT --
// The pilgrim's road: from beside the party to a far corner, along the far
// side and down to the opposite edge (`dir` mirrors it left/right, `side`
// near/far). Each leg is searched on a 0.5 u grid around the layout's props,
// then pulled straight where the way is clear, so the road never runs into a
// rock. Pure: the static colliders and the two bits decide it.
export const ESCORT_STOPS = Object.freeze([
  [-1.6, 0.9],
  [-8.4, -4.4],
  [0, -5.3],
  [8.4, -4.4],
  [10.3, 0.4],
]);
const GRID = 0.5;
export function escortRoute(dir = 1, side = 1, radius = OBJECTIVE_RULES.escort.radius) {
  const { mx, mz } = innerBounds(radius + 0.15);
  const nx = Math.floor((2 * mx) / GRID) + 1;
  const nz = Math.floor((2 * mz) / GRID) + 1;
  const gx = (i) => -mx + i * GRID;
  const gz = (j) => -mz + j * GRID;
  const want = radius + 0.12;
  const free = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) free[j * nx + i] = blockerClearance(gx(i), gz(j), want) >= 0 ? 1 : 0;
  const snap = (x, z) => {
    let best = -1;
    let bd = Infinity;
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        if (!free[j * nx + i]) continue;
        const d = (gx(i) - x) ** 2 + (gz(j) - z) ** 2;
        if (d < bd - 1e-9) {
          bd = d;
          best = j * nx + i;
        }
      }
    return best;
  };
  const stops = ESCORT_STOPS.map(([x, z]) => snap(x * dir, z * side)).filter((c) => c >= 0);
  const cells = [stops[0]];
  for (let s = 1; s < stops.length; s++) {
    const leg = gridPath(free, nx, nz, stops[s - 1], stops[s]);
    if (!leg) continue; // walled off: that stop is skipped
    for (const c of leg.slice(1)) cells.push(c);
  }
  const pts = cells.map((c) => [gx(c % nx), gz(Math.floor(c / nx))]);
  // String-pull: keep a point only where the straight way past it is blocked.
  const clear = (a, b) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(L / 0.2));
    for (let k = 1; k < n; k++) {
      const u = k / n;
      if (blockerClearance(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, radius + 0.05) < 0) return false;
    }
    return true;
  };
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    // Never pull across a stop (the road keeps its shape).
    const nextStop = stopIndexAfter(cells, stops, i);
    if (nextStop !== null) j = Math.min(j, nextStop);
    while (j > i + 1 && !clear(pts[i], pts[j])) j -= 1;
    out.push(pts[j]);
    i = j;
  }
  const r2 = (v) => Math.round(v * 100) / 100;
  return out.map(([x, z]) => [r2(x), r2(z)]);
}
function stopIndexAfter(cells, stops, i) {
  for (let k = i + 1; k < cells.length; k++) if (stops.includes(cells[k])) return k;
  return null;
}
// Breadth-first over the 8-neighbour grid (diagonals only past two free
// sides). Deterministic: fixed neighbour order. Returns cell indices.
function gridPath(free, nx, nz, a, b) {
  if (a === b) return [a];
  const prev = new Int32Array(nx * nz).fill(-1);
  const cost = new Float64Array(nx * nz).fill(Infinity);
  cost[a] = 0;
  const open = [a];
  const N = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];
  const bx = b % nx;
  const bz = Math.floor(b / nx);
  const h = (c) => Math.hypot((c % nx) - bx, Math.floor(c / nx) - bz);
  while (open.length > 0) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (cost[open[k]] + h(open[k]) < cost[open[bi]] + h(open[bi]) - 1e-9) bi = k;
    const c = open.splice(bi, 1)[0];
    if (c === b) break;
    const cx = c % nx;
    const cz = Math.floor(c / nx);
    for (const [dx, dz, w] of N) {
      const x = cx + dx;
      const z = cz + dz;
      if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
      const n = z * nx + x;
      if (!free[n]) continue;
      if (dx !== 0 && dz !== 0 && (!free[cz * nx + x] || !free[z * nx + cx])) continue;
      const nc = cost[c] + w;
      if (nc < cost[n] - 1e-9) {
        if (cost[n] === Infinity) open.push(n);
        cost[n] = nc;
        prev[n] = c;
      }
    }
  }
  if (prev[b] < 0) return null;
  const path = [b];
  while (path[path.length - 1] !== a) path.push(prev[path[path.length - 1]]);
  return path.reverse();
}
export const routeLength = (route) => {
  let L = 0;
  for (let i = 1; i < route.length; i++) L += Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]);
  return L;
};

// The pilgrim's walk, one tick. `bodies` = the living party bodies. Plain
// data on `e.escort`; returns 'arrived' | 'wait' | 'walk' | null (no change).
export function pilgrimWalk(e, bodies, tick, step) {
  const E = OBJECTIVE_RULES.escort;
  const st = e.escort;
  if (st.arrived) return null;
  const route = st.route;
  if (tick < st.setOff || tick < st.flinchUntil) return null;
  let near = false;
  for (const b of bodies) if (Math.hypot(b.x - e.x, b.z - e.z) <= E.nearU) near = true;
  st.alone = near ? 0 : st.alone + 1;
  let change = null;
  if (st.alone >= E.waitTicks && !st.waiting) {
    st.waiting = true;
    change = 'wait';
  } else if (near && st.waiting) {
    st.waiting = false;
    change = 'walk';
  }
  if (st.waiting) return change;
  // Close enough to a road point: on to the next (the last one is the end).
  while (st.leg < route.length && Math.hypot(route[st.leg][0] - e.x, route[st.leg][1] - e.z) <= E.arriveU) st.leg += 1;
  if (st.leg < route.length) {
    const [tx, tz] = route[st.leg];
    const dx = tx - e.x;
    const dz = tz - e.z;
    const d = Math.hypot(dx, dz);
    const s = Math.min(step, d);
    const x0 = e.x;
    const z0 = e.z;
    walkStep(e, (dx / d) * s, (dz / d) * s, e.radius);
    face(e, dx, dz);
    const moved = Math.hypot(e.x - x0, e.z - z0);
    st.walked += moved;
    // Pinned (a body or a prop in the way): after a second, the next point.
    st.stuck = moved < s * 0.25 ? (st.stuck ?? 0) + 1 : 0;
    if (st.stuck >= E.stuckTicks && st.leg < route.length - 1) {
      st.leg += 1;
      st.stuck = 0;
    }
    if (Math.hypot(tx - e.x, tz - e.z) <= E.arriveU && st.leg === route.length - 1) st.leg += 1;
  }
  if (st.leg >= route.length) {
    st.arrived = true;
    return 'arrived';
  }
  return change;
}

// --------------------------------------------------------------- HOLD --
// Where the sigil ring burns: the first spot (the room's middle first) with
// a party member's room to stand clear of the layout's props.
export const HOLD_SPOTS = Object.freeze([
  [0, 0],
  [0, -1.4],
  [0, 1.4],
  [-2.4, 0],
  [2.4, 0],
  [-2.4, -1.6],
  [2.4, 1.6],
  [-4.2, 0],
  [4.2, 0],
]);
export function holdSpot() {
  for (const [x, z] of HOLD_SPOTS) if (blockerClearance(x, z, 1.1) >= 0) return { x, z };
  return { x: 0, z: 0 };
}


// The nest spots: the chosen points of the room's spawn ring (every other
// point or so, picked by the purge's planned draw), pulled toward the middle
// so a nest stands clear of the walls and the props along them.
export function nestSpots(points, radius = OBJECTIVE_RULES.purge.radius) {
  const r2 = (v) => Math.round(v * 100) / 100;
  return points.map(([x, z]) => {
    // The first inset that stands clear of the layout's props.
    for (const k of [0.78, 0.86, 0.7, 0.94, 0.62, 0.55]) {
      const sx = r2(x * k);
      const sz = r2(z * (k - 0.06));
      if (staticClearance(sx, sz, radius) >= 0.25) return { x: sx, z: sz };
    }
    return { x: r2(x * 0.78), z: r2(z * 0.72) };
  });
}

// The quarry's flight, one tick. `bodies` = the living party bodies; `step`
// = this tick's step length (status-scaled). Plain data on `e.quarry`.
export function quarryFlee(e, bodies, tick, step) {
  const Q = OBJECTIVE_RULES.hunt;
  const q = e.quarry;
  // Winded: stand and pant (the window the party closes in).
  if (tick < q.restUntil) {
    q.winded = true;
    const near = nearestBody(e, bodies);
    if (near) face(e, near.x - e.x, near.z - e.z);
    return;
  }
  q.winded = false;
  if (tick >= q.runUntil) {
    q.restUntil = tick + Q.restTicks;
    q.runUntil = q.restUntil + Q.runTicks;
    q.winded = true;
    return;
  }
  if (tick >= q.retargetTick || q.goal === null) {
    q.goal = pickWaypoint(e, bodies, q.goal, q.stuck >= Q.stuckTicks);
    q.retargetTick = tick + Q.retargetTicks;
    if (q.stuck >= Q.stuckTicks) q.stuck = 0;
  }
  const [gx, gz] = QUARRY_WAYPOINTS[q.goal];
  let dx = gx - e.x;
  let dz = gz - e.z;
  let l = Math.hypot(dx, dz);
  if (l > 1e-6) {
    dx /= l;
    dz /= l;
  }
  // Panic: a body right on it pushes it straight away.
  for (const b of bodies) {
    const bx = e.x - b.x;
    const bz = e.z - b.z;
    const d = Math.hypot(bx, bz);
    if (d < Q.panicU && d > 1e-6) {
      const w = (Q.panicU - d) / Q.panicU;
      dx += (bx / d) * w * 1.6;
      dz += (bz / d) * w * 1.6;
    }
  }
  l = Math.hypot(dx, dz);
  if (l < 1e-6) return;
  dx /= l;
  dz /= l;
  const x0 = e.x;
  const z0 = e.z;
  walkStep(e, dx * step, dz * step, e.radius);
  face(e, dx, dz);
  const moved = Math.hypot(e.x - x0, e.z - z0);
  q.stuck = moved < step * 0.25 ? q.stuck + 1 : 0;
  if (Math.hypot(gx - e.x, gz - e.z) < 0.6) q.retargetTick = tick; // arrived: choose on
}

function nearestBody(e, bodies) {
  let best = null;
  let bd = Infinity;
  for (const b of bodies) {
    const d = (b.x - e.x) ** 2 + (b.z - e.z) ** 2;
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

function face(e, dx, dz) {
  const l = Math.hypot(dx, dz);
  if (l > 1e-6) {
    e.faceX = dx / l;
    e.faceZ = dz / l;
  }
}

// Score every waypoint: far from the party, not through the party, not too
// far to run. Ties break by index (deterministic). A stuck quarry skips its
// current goal.
function pickWaypoint(e, bodies, current, stuck) {
  const { mx, mz } = innerBounds(e.radius);
  let best = 0;
  let bestS = -Infinity;
  QUARRY_WAYPOINTS.forEach(([wx, wz], i) => {
    if (stuck && i === current) return;
    const x = Math.max(-mx, Math.min(mx, wx));
    const z = Math.max(-mz, Math.min(mz, wz));
    let minD = 99;
    let block = 0;
    for (const b of bodies) {
      minD = Math.min(minD, Math.hypot(b.x - x, b.z - z));
      // Distance from the body to the segment quarry -> waypoint.
      const sx = x - e.x;
      const sz = z - e.z;
      const sl = sx * sx + sz * sz || 1;
      const t = Math.max(0, Math.min(1, ((b.x - e.x) * sx + (b.z - e.z) * sz) / sl));
      const px = e.x + sx * t - b.x;
      const pz = e.z + sz * t - b.z;
      const seg = Math.hypot(px, pz);
      if (seg < 1.8) block += 1.8 - seg;
    }
    const run = Math.hypot(x - e.x, z - e.z);
    const s = minD - 0.3 * run - 2.2 * block + (i === current ? 0.6 : 0);
    if (s > bestS + 1e-9) {
      bestS = s;
      best = i;
    }
  });
  return best;
}

// Fresh quarry state for a body breaking cover at `tick`.
export function quarryState(tick) {
  const Q = OBJECTIVE_RULES.hunt;
  return {
    escapeTick: tick + Q.escapeTicks,
    runUntil: tick + Q.runTicks,
    restUntil: 0,
    retargetTick: tick,
    goal: null,
    stuck: 0,
    winded: false,
  };
}

export const QUARRY_STEP = (speedMul = 1) => OBJECTIVE_RULES.hunt.speed * TICK_DT * speedMul;
