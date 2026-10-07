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
//
// WHERE: campaign runs only (Endless included), never the tutorial and never
// the legacy single-level run, so the nine goldens never meet one. Rooms 4
// to 6 only: a kill_all room there becomes a hunt or a purge. The first level
// of a campaign gets one, every later level two (one of each). Which rooms
// and which objective come from a hash of the level's frame seed and index,
// not from the run stream, so every other roll of a campaign is unchanged.
//
// Success pays a small bounty on top of the room's usual stipend, spoils and
// draft. Sim only: no DOM, no i18n (the UI translates the English names).
import { fnv1a64Hex } from '../core/hash.js';
import { innerBounds, walkStep, staticClearance } from './movement.js';
import { TICK_HZ } from '../core/constants.js';

const TICK_DT = 1 / TICK_HZ;

export const OBJECTIVE_MODES = Object.freeze(['hunt', 'purge']);
export const isObjectiveMode = (m) => m === 'hunt' || m === 'purge';

export const OBJECTIVE_RULES = Object.freeze({
  fromRoom: 4, // rooms 4-6 only
  firstLevel: 1, // objective rooms on a campaign's first level
  laterLevels: 2, // ...and on every later one (one hunt, one purge)
  bounty: 10, // Glint for a hunt or a purge won (not on a soft-fail)
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
});

// The quarry each act sends: a fast or sturdy body that reads well running.
export const QUARRY = Object.freeze({ 1: 'boar', 2: 'crab', 3: 'ram' });
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
  const first = (hash32(`${seed >>> 0}:${index | 0}:KIND`) & 1) === 0 ? 'hunt' : 'purge';
  const out = [];
  picks.forEach((room, i) => {
    const mode = i === 0 ? first : first === 'hunt' ? 'purge' : 'hunt';
    modes[room - 1] = mode;
    out.push({ room, mode });
  });
  return out;
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
