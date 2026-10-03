// Spatial model (docs/gauntlet/PLAN.md §3.5 "Spatial model"). Owner: M3.
//
// Every world-anchored one-shot gets its own PannerNode: panningModel
// 'equalpower', distanceModel 'inverse', refDistance 4 u, rolloffFactor 1,
// maxDistance 40 u. Sources sit on the ground plane at (x, 0, z). World +x
// is the right ear; screen-up (world -z) is "ahead".
//
// LISTENER (decision recorded in docs/gauntlet/build-M3.md): the listener is
// the camera's ground focus lifted LISTENER_HEIGHT (= refDistance, 4 u) above
// the ground, facing DOWN at the playfield (forward (0,-1,0)) with screen-up
// as its up vector ((0,0,-1)). The literal "listener on the ground plane,
// forward (0,0,-1), up (0,1,0)" wording pans by bearing alone: a mantis 0.5 u
// to the side of the focus would already be 100 % in one ear, and anything
// crossing the focus's x flips ears — the hard-pan artefact shipped top-down
// games avoid. Looking down from 4 u, the pan follows the lateral offset
// (azimuth = atan(dx / 4)), so it grows smoothly with distance while still
// giving G3.6's numbers with margin:
//   +6 u  -> azimuth 56.3 deg -> R - L = 10.3 dB      (gate >= 6 dB)
//    0 u  -> centred, |L - R| = 0 dB                    (gate <= 1 dB)
//   3 u vs 12 u -> distance 5 vs 12.65 -> 8.1 dB quieter (gate >= 6 dB)
// A source under the listener is exactly at refDistance, so the inverse law
// never boosts (gain = 4 / d <= 1). SPATIAL_TRIM (+3 dB) makes a centred
// spatial voice exactly as loud per channel as a non-spatial one (equal-power
// centre = -3 dB per ear), so cue levels calibrate once for both paths.
import { CAMERA } from '../core/constants.js';

export const SPATIAL = Object.freeze({
  panningModel: 'equalpower',
  distanceModel: 'inverse',
  refDistance: 4,
  rolloffFactor: 1,
  maxDistance: 40,
  listenerHeight: 4,
  trim: Math.SQRT2,
});

const ELEV = (CAMERA.elevationDeg * Math.PI) / 180;
const FOCUS_BACK = CAMERA.distance * Math.cos(ELEV);

// Ground focus of the gameplay camera (the follow rig looks at (x, 0, z) from
// (x, h, z + distance*cos(elevation))).
export function cameraFocus(camera) {
  if (!camera) return { x: 0, z: 0 };
  return { x: camera.position.x, z: camera.position.z - FOCUS_BACK };
}

function setParam(p, v, t) {
  if (!p) return;
  try {
    p.setValueAtTime(v, t);
  } catch {
    p.value = v;
  }
}

export function createSpatial(ctx) {
  const L = ctx.listener;
  const pos = { x: 0, z: 0 };
  let inited = false;

  function orient() {
    const t = ctx.currentTime;
    if (L.forwardX) {
      setParam(L.forwardX, 0, t);
      setParam(L.forwardY, -1, t);
      setParam(L.forwardZ, 0, t);
      setParam(L.upX, 0, t);
      setParam(L.upY, 0, t);
      setParam(L.upZ, -1, t);
    } else if (L.setOrientation) {
      L.setOrientation(0, -1, 0, 0, 0, -1);
    }
  }

  function setListener(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return pos;
    if (!inited) {
      orient();
      inited = true;
    }
    // 5 cm dead-band: the follow camera eases every frame; a 5 cm listener
    // offset moves a source 6 u away by < 0.5 deg of azimuth — no pan or level
    // change a player can hear (G3.10: 3 AudioParam writes saved per frame).
    if (inited && Math.abs(x - pos.x) < 0.05 && Math.abs(z - pos.z) < 0.05) return pos;
    pos.x = x;
    pos.z = z;
    const t = ctx.currentTime;
    if (L.positionX) {
      setParam(L.positionX, x, t);
      setParam(L.positionY, SPATIAL.listenerHeight, t);
      setParam(L.positionZ, z, t);
    } else if (L.setPosition) {
      L.setPosition(x, SPATIAL.listenerHeight, z);
    }
    return pos;
  }

  // A panner for one voice at world (x, z); connect voice -> panner -> dest.
  function panner(x, z, dest) {
    const p = ctx.createPanner();
    p.panningModel = SPATIAL.panningModel;
    p.distanceModel = SPATIAL.distanceModel;
    p.refDistance = SPATIAL.refDistance;
    p.rolloffFactor = SPATIAL.rolloffFactor;
    p.maxDistance = SPATIAL.maxDistance;
    const t = ctx.currentTime;
    if (p.positionX) {
      setParam(p.positionX, x, t);
      setParam(p.positionY, 0, t);
      setParam(p.positionZ, z, t);
    } else p.setPosition(x, 0, z);
    p.connect(dest);
    return p;
  }

  // Re-seat a pooled voice panner (engine voice slots, G3.10) at world (x, z)
  // from AudioContext time t (the voice's start).
  // The slot is silent until the voice starts, so the position is written
  // directly (no automation event): 2 param writes, y stays 0.
  function place(p, x, z) {
    if (p.positionX) {
      p.positionX.value = x;
      p.positionZ.value = z;
    } else p.setPosition(x, 0, z);
  }

  // Linear left / right gains of the panner for a mono source at world
  // (x, z) — the same equal-power + inverse-distance maths as predict()
  // (without SPATIAL.trim): the sampler worklet's spatial voices (G3.10).
  function gains(x, z) {
    const dx = x - pos.x;
    const dz = z - pos.z;
    const h = SPATIAL.listenerHeight;
    const d = Math.max(SPATIAL.refDistance, Math.min(SPATIAL.maxDistance, Math.sqrt(dx * dx + dz * dz + h * h)));
    const g = SPATIAL.refDistance / (SPATIAL.refDistance + SPATIAL.rolloffFactor * (d - SPATIAL.refDistance));
    const xNorm = (Math.atan2(dx, h) + Math.PI / 2) / Math.PI;
    return { l: Math.cos((xNorm * Math.PI) / 2) * g, r: Math.sin((xNorm * Math.PI) / 2) * g };
  }

  // Analytic prediction of the panner result (probe cross-check, cueLog pan):
  // returns { pan: -1..1, gainDb, lDb, rDb } for a source at world (x, z).
  function predict(x, z) {
    const dx = x - pos.x;
    const dz = z - pos.z;
    const h = SPATIAL.listenerHeight;
    const d = Math.max(SPATIAL.refDistance, Math.min(SPATIAL.maxDistance, Math.hypot(dx, dz, h)));
    const g = SPATIAL.refDistance / (SPATIAL.refDistance + SPATIAL.rolloffFactor * (d - SPATIAL.refDistance));
    const az = (Math.atan2(dx, h) * 180) / Math.PI; // -90..90
    const xNorm = (az + 90) / 180;
    const l = Math.cos((xNorm * Math.PI) / 2) * g * SPATIAL.trim;
    const r = Math.sin((xNorm * Math.PI) / 2) * g * SPATIAL.trim;
    const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
    return { pan: Math.round((az / 90) * 1000) / 1000, gainDb: Math.round(db(g) * 100) / 100, lDb: Math.round(db(l) * 100) / 100, rDb: Math.round(db(r) * 100) / 100 };
  }

  return { setListener, panner, place, gains, predict, get listener() {
    return { x: pos.x, z: pos.z, height: SPATIAL.listenerHeight };
  } };
}
