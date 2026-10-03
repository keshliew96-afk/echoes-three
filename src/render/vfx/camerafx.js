// Camera FX (docs/gauntlet/design-VFX.md "Camera & view") — render-only
// camera motion that rides ON TOP of the scene's own camera placement:
//
//   kick(dirX, dirZ, amp, dur)  a short push along a hit direction (the
//                               Tank's swing, the Swordsman's cut)
//   dolly(x, z, amp, dur)       a short move toward a world point along the
//                               view ray (big heals breathe in, the Stag's
//                               quake lands)
//
// The sim's §9 `screenshake` event is untouched; this adds weight without
// adding shake. Both scale with Settings ▸ Gameplay ▸ Screen shake (Off = no
// camera FX) and with Effects (Reduced = none). The summed offset is clamped
// to MAX_OFFSET, inside the brief's 0.06 u shake ceiling plus a dolly margin.
//
// apply() runs once per frame AFTER every layer has placed the camera and
// BEFORE the numerals project. The scenes set the camera position absolutely
// every frame, so the offset never accumulates; if a frame ever skips that
// (a paused scene), the previous offset is taken back out first.
import { Vector3 } from 'three';

const MAX_OFFSET = 0.09; // u
const ATTACK = 0.035; // s to full push

export function createCameraFx({ camera, gain = () => 1 }) {
  const kicks = []; // { x, z, amp, dur, t }
  const dollies = []; // { x, z, amp, dur, t }
  const applied = new Vector3();
  const written = new Vector3(Infinity, 0, 0);
  const tmp = new Vector3();
  const fwd = new Vector3();
  let last = 0;

  const env = (t, dur) => (t < ATTACK ? t / ATTACK : Math.pow(Math.max(0, 1 - (t - ATTACK) / Math.max(0.01, dur - ATTACK)), 2));

  function kick(dirX, dirZ, amp, dur = 0.12) {
    const g = gain();
    if (!(g > 0) || !(amp > 0)) return;
    const l = Math.hypot(dirX, dirZ);
    if (l < 1e-5) return;
    if (kicks.length >= 6) kicks.shift();
    kicks.push({ x: dirX / l, z: dirZ / l, amp: amp * g, dur, t: 0 });
  }
  function dolly(x, z, amp, dur = 0.22) {
    const g = gain();
    if (!(g > 0) || !(amp > 0)) return;
    if (dollies.length >= 4) dollies.shift();
    dollies.push({ x, z, amp: amp * g, dur, t: 0 });
  }

  function apply(nowSec) {
    const dt = last === 0 ? 1 / 60 : Math.min(0.1, Math.max(0, nowSec - last));
    last = nowSec;
    // Nobody re-placed the camera since our last write: take our offset out.
    if (camera.position.equals(written)) camera.position.sub(applied);
    applied.set(0, 0, 0);
    for (let i = kicks.length - 1; i >= 0; i--) {
      const k = kicks[i];
      k.t += dt;
      if (k.t >= k.dur) {
        kicks.splice(i, 1);
        continue;
      }
      const e = env(k.t, k.dur) * k.amp;
      applied.x += k.x * e;
      applied.z += k.z * e;
    }
    if (dollies.length) {
      camera.getWorldDirection(fwd);
      for (let i = dollies.length - 1; i >= 0; i--) {
        const d = dollies[i];
        d.t += dt;
        if (d.t >= d.dur) {
          dollies.splice(i, 1);
          continue;
        }
        // Toward the point, mostly along the view ray (a push-in), so the
        // framing holds and the target grows rather than slides.
        tmp.set(d.x, 0, d.z).sub(camera.position).normalize().lerp(fwd, 0.6).normalize();
        applied.addScaledVector(tmp, env(d.t, d.dur) * d.amp);
      }
    }
    const len = applied.length();
    if (len > MAX_OFFSET) applied.multiplyScalar(MAX_OFFSET / len);
    if (len > 0) camera.position.add(applied);
    written.copy(camera.position);
  }

  function clear() {
    kicks.length = 0;
    dollies.length = 0;
  }
  const offset = () => Math.round(applied.length() * 10000) / 10000;

  return { kick, dolly, apply, clear, offset, live: () => kicks.length + dollies.length };
}
